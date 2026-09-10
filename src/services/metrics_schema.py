"""SQLite schema for :mod:`metrics_service`.

Kept in its own module so the DDL - which changes rarely - does not pad out the
service that reads and writes it.
"""

import sqlite3

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


def create_schema(conn: sqlite3.Connection) -> None:
    """Create every table metrics use, if it does not already exist.

    Split into retained aggregates (counts only, no identifiers) and ephemeral
    tables that hold the only identifier that ever exists and are emptied by
    ``MetricsService.rollup_previous_days()``, so their rows live at most ~48h.
    """
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
