"""Aggregate usage metrics with no persistent visitor identity.

Showtime stores watch history in the browser, so the server has never had any
notion of "a user". This service adds the smallest thing that can answer "does
anyone use this?" without becoming a tracking system:

* A "visitor" is someone who actually tracks shows - the count only moves for
  a client that reports at least one logged show. Crawlers run no JavaScript
  and have no localStorage, so they never report a library and never appear.
* Visitors are counted through ``sha256(daily_salt + ip + user_agent)``. The
  salt is random per day and is destroyed the moment a new day starts, so a
  hash can neither be reversed nor matched against the same person tomorrow.
  Cross-day correlation is impossible by construction, not by policy.
* Raw IPs and user agents are hashed in memory and never written to disk.
* Watch histories arrive on several endpoints but are only ever turned into
  counters and size buckets. No per-visitor record of what anyone watches is
  kept.
* ``DNT``/``Sec-GPC`` opt out of the visitor hash entirely.

Everything here is fail-open: a metrics error must never break a request, so
the write helpers swallow their exceptions.
"""

import hashlib
import logging
import secrets
import sqlite3
import threading
from contextlib import closing
from datetime import date, timedelta
from functools import wraps
from typing import Any, Dict, List, Optional

logger = logging.getLogger(__name__)

# Counter columns on daily_metrics. Also the allow-list that keeps caller
# supplied event names out of the SQL string.
EVENT_COLUMNS = (
    'page_views',
    'searches',
    'shows_added',
    'shows_updated',
    'shows_removed',
    'libraries_cleared',
    'recommendations_requested',
)

# Substrings that identify automated traffic. Deliberately crude: the goal is
# to keep uptime checks and the Docker healthcheck out of the visitor count,
# not to build a bot detector.
BOT_UA_MARKERS = (
    'bot', 'crawl', 'spider', 'slurp', 'curl', 'wget', 'python-requests',
    'httpx', 'headless', 'monitor', 'pingdom', 'uptime', 'facebookexternalhit',
    'preview', 'scanner', 'checker',
)

# Library sizes are reported as ranges so a distinctive number (a 372 show
# library) cannot single anybody out.
BUCKET_ORDER = ('0', '1-5', '6-20', '21-50', '51-100', '100+')


def bucket_for_size(size: int) -> str:
    """Map a library size onto a coarse, non-identifying range."""
    if size <= 0:
        return '0'
    if size <= 5:
        return '1-5'
    if size <= 20:
        return '6-20'
    if size <= 50:
        return '21-50'
    if size <= 100:
        return '51-100'
    return '100+'


def _safe(func):
    """Swallow and log any failure so metrics can never break a request."""
    @wraps(func)
    def wrapper(*args, **kwargs):
        try:
            return func(*args, **kwargs)
        except Exception:
            logger.warning("Metrics call %s failed; continuing", func.__name__, exc_info=True)
            return None
    return wrapper


class MetricsService:
    """SQLite-backed aggregate counters.

    SQLite rather than in-process counters because Gunicorn runs several
    ``--preload`` workers that are recycled every ``--max-requests``; anything
    held in memory would be per-worker and lost on recycle. The daily salt
    lives in the database for the same reason - both workers must derive the
    same hash for the same visitor.
    """

    def __init__(self, db_path: str = 'metrics.db'):
        self.db_path = db_path
        self.lock = threading.Lock()
        self._initialized = False

    # ------------------------------------------------------------------
    # Storage plumbing
    # ------------------------------------------------------------------

    def _connect(self) -> sqlite3.Connection:
        """Open a connection, creating the schema on first use.

        Schema creation is lazy so that an unwritable database path degrades
        into "metrics do not record" rather than "the app will not start".
        """
        conn = sqlite3.connect(self.db_path, timeout=5)
        if not self._initialized:
            self._init_database(conn)
            self._initialized = True
        return conn

    def _init_database(self, conn: sqlite3.Connection) -> None:
        counter_columns = ',\n'.join(
            f'                    {name} INTEGER NOT NULL DEFAULT 0' for name in EVENT_COLUMNS
        )
        conn.execute(f'''
            CREATE TABLE IF NOT EXISTS daily_metrics (
                    day TEXT PRIMARY KEY,
                    unique_visitors INTEGER NOT NULL DEFAULT 0,
{counter_columns}
            )
        ''')

        # Retained aggregates: counts only, no identifiers.
        conn.execute('''
            CREATE TABLE IF NOT EXISTS library_size_dist (
                day TEXT NOT NULL,
                bucket TEXT NOT NULL,
                count INTEGER NOT NULL DEFAULT 0,
                PRIMARY KEY (day, bucket)
            )
        ''')
        conn.execute('''
            CREATE TABLE IF NOT EXISTS show_popularity (
                tmdb_id INTEGER PRIMARY KEY,
                name TEXT NOT NULL,
                add_count INTEGER NOT NULL DEFAULT 0,
                last_added_day TEXT
            )
        ''')
        conn.execute('''
            CREATE TABLE IF NOT EXISTS genre_popularity (
                genre TEXT PRIMARY KEY,
                add_count INTEGER NOT NULL DEFAULT 0
            )
        ''')

        # Ephemeral tables. These hold the only identifier that ever exists and
        # are emptied by rollup_previous_days(), so rows live at most ~48h.
        conn.execute('''
            CREATE TABLE IF NOT EXISTS visitor_days (
                day TEXT NOT NULL,
                visitor_hash TEXT NOT NULL,
                PRIMARY KEY (day, visitor_hash)
            )
        ''')
        conn.execute('''
            CREATE TABLE IF NOT EXISTS library_samples (
                day TEXT NOT NULL,
                visitor_hash TEXT NOT NULL,
                bucket TEXT NOT NULL,
                PRIMARY KEY (day, visitor_hash)
            )
        ''')
        conn.execute('''
            CREATE TABLE IF NOT EXISTS daily_salt (
                day TEXT PRIMARY KEY,
                salt TEXT NOT NULL
            )
        ''')
        conn.commit()

    # ------------------------------------------------------------------
    # Visitor hashing
    # ------------------------------------------------------------------

    @staticmethod
    def _today() -> str:
        return date.today().isoformat()

    def _get_salt(self, conn: sqlite3.Connection, day: str) -> str:
        """Return today's salt, creating it and destroying every older one.

        Deleting other days' salts here means the previous salt is gone at the
        first request after midnight - earlier than the nightly rollup, which
        only needs to count rows and never needs the salt again.
        """
        row = conn.execute('SELECT salt FROM daily_salt WHERE day = ?', (day,)).fetchone()
        if row:
            return row[0]

        conn.execute(
            'INSERT OR IGNORE INTO daily_salt (day, salt) VALUES (?, ?)',
            (day, secrets.token_hex(32)),
        )
        conn.execute('DELETE FROM daily_salt WHERE day != ?', (day,))
        conn.commit()
        # Re-read rather than trusting our own INSERT: a sibling worker may
        # have won the race, and both workers must end up with one salt.
        return conn.execute('SELECT salt FROM daily_salt WHERE day = ?', (day,)).fetchone()[0]

    @staticmethod
    def _client_ip(request) -> str:
        """Best-effort client address, never stored - only hashed.

        Behind a reverse proxy ``remote_addr`` is the proxy, which would
        collapse every visitor into one, so the forwarded header wins when
        present. It is spoofable, but the only consequence is a slightly wrong
        count.
        """
        forwarded = request.headers.get('X-Forwarded-For', '')
        if forwarded:
            return forwarded.split(',')[0].strip()
        return request.remote_addr or 'unknown'

    @staticmethod
    def opted_out(request) -> bool:
        """True when the client asked not to be counted as a unique visitor."""
        return (
            request.headers.get('DNT') == '1'
            or request.headers.get('Sec-GPC') == '1'
        )

    @staticmethod
    def is_bot(request) -> bool:
        user_agent = (request.headers.get('User-Agent') or '').lower()
        if not user_agent:
            return True
        return any(marker in user_agent for marker in BOT_UA_MARKERS)

    def _visitor_hash(self, conn: sqlite3.Connection, request, day: str) -> Optional[str]:
        """Hash of ip + user agent under today's salt, or None if not countable."""
        if self.opted_out(request) or self.is_bot(request):
            return None

        salt = self._get_salt(conn, day)
        material = '|'.join((
            salt,
            self._client_ip(request),
            request.headers.get('User-Agent') or '',
        ))
        return hashlib.sha256(material.encode('utf-8')).hexdigest()

    # ------------------------------------------------------------------
    # Recording
    # ------------------------------------------------------------------

    @_safe
    def record_event(self, name: str, count: int = 1) -> None:
        """Increment one of the EVENT_COLUMNS counters for today."""
        if name not in EVENT_COLUMNS:
            raise ValueError(f'Unknown metrics event: {name}')

        day = self._today()
        with self.lock, closing(self._connect()) as conn:
            conn.execute(
                f'''INSERT INTO daily_metrics (day, {name}) VALUES (?, ?)
                    ON CONFLICT(day) DO UPDATE SET {name} = {name} + ?''',
                (day, count, count),
            )
            conn.commit()

    @_safe
    def record_visitor(self, request) -> None:
        """Note that some visitor was active today, without learning who."""
        day = self._today()
        with self.lock, closing(self._connect()) as conn:
            visitor_hash = self._visitor_hash(conn, request, day)
            if visitor_hash is None:
                return
            conn.execute(
                'INSERT OR IGNORE INTO visitor_days (day, visitor_hash) VALUES (?, ?)',
                (day, visitor_hash),
            )
            conn.commit()

    @_safe
    def record_page_view(self, request) -> None:
        """Count a page view. Deliberately does not count a visitor.

        Loading a page proves nothing about whether a person is there, so
        visitors are counted only once a client shows it is tracking shows -
        see record_library_size() and record_engagement().

        Automated traffic is dropped outright rather than merely excluded from
        the visitor count: the Docker healthcheck alone hits / every 60s, which
        would bury the real page view numbers under ~1400 daily hits.
        """
        if self.is_bot(request):
            return
        self.record_event('page_views')

    @_safe
    def record_library_size(self, request, size: int) -> None:
        """Sample how big this client's library is, once per day.

        A client reporting one or more shows is counted as a visitor: only a
        real browser running the app's JavaScript can read localStorage and
        report a library, so this is a far stronger filter than matching user
        agent strings. A client reporting an empty library is still sampled -
        that is useful to know - but is not counted as a visitor.
        """
        day = self._today()
        with self.lock, closing(self._connect()) as conn:
            visitor_hash = self._visitor_hash(conn, request, day)
            if visitor_hash is None:
                return
            conn.execute(
                '''INSERT INTO library_samples (day, visitor_hash, bucket) VALUES (?, ?, ?)
                   ON CONFLICT(day, visitor_hash) DO UPDATE SET bucket = excluded.bucket''',
                (day, visitor_hash, bucket_for_size(size)),
            )
            if size >= 1:
                conn.execute(
                    'INSERT OR IGNORE INTO visitor_days (day, visitor_hash) VALUES (?, ?)',
                    (day, visitor_hash),
                )
            conn.commit()

    @_safe
    def record_engagement(self, request) -> None:
        """Count a visitor who is acting on their library right now.

        Adding, updating or removing a show is proof of a real person, and
        catches someone logging their very first show on a day their library
        started out empty.
        """
        self.record_visitor(request)

    @_safe
    def record_show_added(self, show_details: Dict[str, Any]) -> None:
        """Tally a newly logged show and its genres, with no link to anyone."""
        show_id = show_details.get('id')
        if not show_id:
            return

        name = show_details.get('name') or f'Show {show_id}'
        genres = [
            genre['name'] for genre in show_details.get('genres') or []
            if isinstance(genre, dict) and genre.get('name')
        ]
        day = self._today()

        with self.lock, closing(self._connect()) as conn:
            conn.execute(
                '''INSERT INTO show_popularity (tmdb_id, name, add_count, last_added_day)
                   VALUES (?, ?, 1, ?)
                   ON CONFLICT(tmdb_id) DO UPDATE SET
                       add_count = add_count + 1,
                       name = excluded.name,
                       last_added_day = excluded.last_added_day''',
                (show_id, name, day),
            )
            for genre in genres:
                conn.execute(
                    '''INSERT INTO genre_popularity (genre, add_count) VALUES (?, 1)
                       ON CONFLICT(genre) DO UPDATE SET add_count = add_count + 1''',
                    (genre,),
                )
            conn.commit()

    # ------------------------------------------------------------------
    # Nightly rollup
    # ------------------------------------------------------------------

    @_safe
    def rollup_previous_days(self) -> int:
        """Collapse finished days into counts and delete the hashes.

        After this runs, nothing that could identify a visitor remains for the
        rolled up days - only totals and bucket counts.
        """
        today = self._today()
        rolled = 0

        with self.lock, closing(self._connect()) as conn:
            visitor_days = [
                row[0] for row in conn.execute(
                    'SELECT DISTINCT day FROM visitor_days WHERE day < ?', (today,)
                ).fetchall()
            ]
            for day in visitor_days:
                count = conn.execute(
                    'SELECT COUNT(*) FROM visitor_days WHERE day = ?', (day,)
                ).fetchone()[0]
                conn.execute(
                    '''INSERT INTO daily_metrics (day, unique_visitors) VALUES (?, ?)
                       ON CONFLICT(day) DO UPDATE SET unique_visitors = excluded.unique_visitors''',
                    (day, count),
                )
                rolled += 1

            sample_days = [
                row[0] for row in conn.execute(
                    'SELECT DISTINCT day FROM library_samples WHERE day < ?', (today,)
                ).fetchall()
            ]
            for day in sample_days:
                rows = conn.execute(
                    'SELECT bucket, COUNT(*) FROM library_samples WHERE day = ? GROUP BY bucket',
                    (day,),
                ).fetchall()
                for bucket, count in rows:
                    conn.execute(
                        '''INSERT INTO library_size_dist (day, bucket, count) VALUES (?, ?, ?)
                           ON CONFLICT(day, bucket) DO UPDATE SET count = excluded.count''',
                        (day, bucket, count),
                    )

            # The identifiers go away here.
            conn.execute('DELETE FROM visitor_days WHERE day < ?', (today,))
            conn.execute('DELETE FROM library_samples WHERE day < ?', (today,))
            conn.execute('DELETE FROM daily_salt WHERE day != ?', (today,))
            conn.commit()

        return rolled

    # ------------------------------------------------------------------
    # Reporting
    # ------------------------------------------------------------------

    def get_overview(self, days: int = 30) -> Dict[str, Any]:
        """Everything the admin dashboard renders.

        Today's numbers are read live from the ephemeral tables so the page is
        useful before the nightly rollup has run.
        """
        today = date.today()
        start = (today - timedelta(days=days - 1)).isoformat()
        today_str = today.isoformat()
        columns = ('unique_visitors',) + EVENT_COLUMNS

        with self.lock, closing(self._connect()) as conn:
            rows = conn.execute(
                f'''SELECT day, {", ".join(columns)} FROM daily_metrics
                    WHERE day >= ? ORDER BY day''',
                (start,),
            ).fetchall()
            daily = [dict(zip(('day',) + columns, row)) for row in rows]

            # Days that have not been rolled up yet still have their hashes.
            pending = dict(conn.execute(
                'SELECT day, COUNT(*) FROM visitor_days WHERE day >= ? GROUP BY day',
                (start,),
            ).fetchall())
            by_day = {entry['day']: entry for entry in daily}
            for day, count in pending.items():
                if day in by_day:
                    by_day[day]['unique_visitors'] = count
                else:
                    entry = {'day': day, 'unique_visitors': count}
                    entry.update({name: 0 for name in EVENT_COLUMNS})
                    daily.append(entry)
            daily.sort(key=lambda entry: entry['day'])

            distribution: Dict[str, int] = {}
            for bucket, count in conn.execute(
                'SELECT bucket, SUM(count) FROM library_size_dist WHERE day >= ? GROUP BY bucket',
                (start,),
            ).fetchall():
                distribution[bucket] = distribution.get(bucket, 0) + (count or 0)
            for bucket, count in conn.execute(
                'SELECT bucket, COUNT(*) FROM library_samples GROUP BY bucket'
            ).fetchall():
                distribution[bucket] = distribution.get(bucket, 0) + count

            top_shows = [
                {'name': name, 'add_count': count, 'tmdb_id': tmdb_id}
                for tmdb_id, name, count in conn.execute(
                    '''SELECT tmdb_id, name, add_count FROM show_popularity
                       ORDER BY add_count DESC, name LIMIT 20'''
                ).fetchall()
            ]
            top_genres = [
                {'genre': genre, 'add_count': count}
                for genre, count in conn.execute(
                    '''SELECT genre, add_count FROM genre_popularity
                       ORDER BY add_count DESC, genre LIMIT 12'''
                ).fetchall()
            ]

        totals = {name: sum(entry.get(name, 0) for entry in daily) for name in EVENT_COLUMNS}
        visitor_counts = [entry.get('unique_visitors', 0) for entry in daily]
        active_days = [count for count in visitor_counts if count]

        return {
            'days': days,
            'range_start': start,
            'range_end': today_str,
            'daily': daily,
            'totals': totals,
            # Deliberately not "monthly unique visitors": the daily salt makes
            # the same person unlinkable across days, so these cannot be
            # de-duplicated into a monthly figure.
            'peak_daily_visitors': max(visitor_counts) if visitor_counts else 0,
            'avg_daily_visitors': round(sum(active_days) / len(active_days), 1) if active_days else 0,
            'visitors_today': next(
                (entry.get('unique_visitors', 0) for entry in daily if entry['day'] == today_str), 0
            ),
            'distribution': [
                {'bucket': bucket, 'count': distribution.get(bucket, 0)}
                for bucket in BUCKET_ORDER
            ],
            'distribution_total': sum(distribution.values()),
            'top_shows': top_shows,
            'top_genres': top_genres,
        }


_metrics_service: Optional[MetricsService] = None


def get_metrics_service() -> MetricsService:
    """Get the global metrics service instance."""
    global _metrics_service
    if _metrics_service is None:
        from ..config import Config
        _metrics_service = MetricsService(Config.METRICS_DB_PATH)
    return _metrics_service
