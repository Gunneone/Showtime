"""Tests for the aggregate usage metrics.

The privacy properties are the point of this feature, so they are asserted
here rather than left to code review: no raw IP or user agent may reach disk,
the salt must rotate daily, and the rollup must delete every identifier.
"""

import sqlite3
from contextlib import closing

import pytest

from app import create_app
from src.config import Config
from src.services import metrics_service as metrics_module
from src.services.metrics_service import MetricsService, bucket_for_size

TEST_IP = '203.0.113.42'
TEST_UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) TestBrowser/117.0'
OTHER_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) DifferentBrowser/9.1'


class FakeRequest:
    """Minimal stand-in for a Flask request, so tests need no app context."""

    def __init__(self, ip=TEST_IP, user_agent=TEST_UA, headers=None):
        self.remote_addr = ip
        self.headers = {'User-Agent': user_agent}
        if headers:
            self.headers.update(headers)


@pytest.fixture
def service(tmp_path):
    return MetricsService(str(tmp_path / 'metrics.db'))


def dump_all_rows(db_path):
    """Every value in every table, as one string, for privacy assertions."""
    with closing(sqlite3.connect(db_path)) as conn:
        tables = [
            row[0] for row in
            conn.execute("SELECT name FROM sqlite_master WHERE type='table'").fetchall()
        ]
        chunks = []
        for table in tables:
            for row in conn.execute(f'SELECT * FROM {table}').fetchall():
                chunks.append(' '.join(str(value) for value in row))
    return '\n'.join(chunks)


def query(db_path, sql, params=()):
    with closing(sqlite3.connect(db_path)) as conn:
        return conn.execute(sql, params).fetchall()


def count_rows(db_path, table):
    """Row count, treating a not-yet-created table as empty.

    The schema is built lazily on first write, so "nothing was recorded" shows
    up as a missing table rather than an empty one.
    """
    with closing(sqlite3.connect(db_path)) as conn:
        try:
            return conn.execute(f'SELECT COUNT(*) FROM {table}').fetchone()[0]
        except sqlite3.OperationalError:
            return 0


# ---------------------------------------------------------------------------
# Visitor counting
# ---------------------------------------------------------------------------

def test_same_visitor_counted_once_per_day(service):
    request = FakeRequest()
    service.record_visitor(request)
    service.record_visitor(request)
    service.record_visitor(request)

    assert query(service.db_path, 'SELECT COUNT(*) FROM visitor_days')[0][0] == 1


def test_different_user_agent_counts_separately(service):
    service.record_visitor(FakeRequest(user_agent=TEST_UA))
    service.record_visitor(FakeRequest(user_agent=OTHER_UA))

    assert query(service.db_path, 'SELECT COUNT(*) FROM visitor_days')[0][0] == 2


def test_different_ip_counts_separately(service):
    service.record_visitor(FakeRequest(ip='203.0.113.1'))
    service.record_visitor(FakeRequest(ip='203.0.113.2'))

    assert query(service.db_path, 'SELECT COUNT(*) FROM visitor_days')[0][0] == 2


def test_forwarded_header_distinguishes_visitors_behind_a_proxy(service):
    """Behind a proxy remote_addr is identical, so XFF must break the tie."""
    service.record_visitor(FakeRequest(headers={'X-Forwarded-For': '198.51.100.1'}))
    service.record_visitor(FakeRequest(headers={'X-Forwarded-For': '198.51.100.2, 10.0.0.1'}))

    assert query(service.db_path, 'SELECT COUNT(*) FROM visitor_days')[0][0] == 2


# ---------------------------------------------------------------------------
# Privacy properties
# ---------------------------------------------------------------------------

def test_no_ip_or_user_agent_ever_reaches_disk(service):
    """The whole design rests on this: nothing identifying is persisted."""
    request = FakeRequest()
    service.record_visitor(request)
    service.record_page_view(request)
    service.record_library_size(request, 37)
    service.record_show_added({'id': 1429, 'name': 'Attack on Titan',
                               'genres': [{'name': 'Animation'}]})

    contents = dump_all_rows(service.db_path)
    assert TEST_IP not in contents
    assert TEST_UA not in contents
    assert 'Mozilla' not in contents
    assert 'TestBrowser' not in contents


def test_dnt_is_counted_as_an_event_but_never_as_a_visitor(service):
    """A page view is not identifying; a visitor hash is."""
    service.record_page_view(FakeRequest(headers={'DNT': '1'}))
    service.record_library_size(FakeRequest(headers={'DNT': '1'}), 9)
    service.record_engagement(FakeRequest(headers={'DNT': '1'}))

    assert count_rows(service.db_path, 'visitor_days') == 0
    assert query(service.db_path, 'SELECT page_views FROM daily_metrics')[0][0] == 1


def test_a_page_view_alone_does_not_make_a_visitor(service):
    """Loading a page proves nothing; only tracking shows counts."""
    service.record_page_view(FakeRequest())

    assert count_rows(service.db_path, 'visitor_days') == 0
    assert query(service.db_path, 'SELECT page_views FROM daily_metrics')[0][0] == 1


def test_reporting_a_library_counts_as_a_visitor(service):
    service.record_library_size(FakeRequest(), 4)

    assert count_rows(service.db_path, 'visitor_days') == 1


def test_an_empty_library_is_sampled_but_not_counted_as_a_visitor(service):
    """Someone who tracks nothing yet is a real browser, but not a user."""
    service.record_library_size(FakeRequest(), 0)

    assert count_rows(service.db_path, 'visitor_days') == 0
    assert query(service.db_path, 'SELECT bucket FROM library_samples') == [('0',)]


def test_logging_a_first_show_counts_as_a_visitor(service):
    """Their library was empty on load, so engagement is what catches them."""
    request = FakeRequest()
    service.record_library_size(request, 0)
    assert count_rows(service.db_path, 'visitor_days') == 0

    service.record_engagement(request)
    assert count_rows(service.db_path, 'visitor_days') == 1


def test_bot_page_views_are_dropped_entirely(service):
    """The container healthcheck hits / every 60s; it must not count."""
    service.record_page_view(FakeRequest(user_agent='curl/8.4.0'))

    assert count_rows(service.db_path, 'daily_metrics') == 0
    assert count_rows(service.db_path, 'visitor_days') == 0


def test_real_page_views_are_still_counted(service):
    service.record_page_view(FakeRequest())

    assert query(service.db_path, 'SELECT page_views FROM daily_metrics')[0][0] == 1


def test_global_privacy_control_is_honoured(service):
    service.record_visitor(FakeRequest(headers={'Sec-GPC': '1'}))

    assert query(service.db_path, 'SELECT COUNT(*) FROM visitor_days')[0][0] == 0


def test_opted_out_visitors_are_left_out_of_library_samples(service):
    service.record_library_size(FakeRequest(headers={'DNT': '1'}), 12)

    assert query(service.db_path, 'SELECT COUNT(*) FROM library_samples')[0][0] == 0


@pytest.mark.parametrize('user_agent', [
    'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
    'curl/8.4.0',
    'python-requests/2.31.0',
    'Uptime-Kuma/1.23.0',
    '',
])
def test_bots_are_not_counted_as_visitors(service, user_agent):
    service.record_visitor(FakeRequest(user_agent=user_agent))

    assert query(service.db_path, 'SELECT COUNT(*) FROM visitor_days')[0][0] == 0


def test_salt_rotates_and_the_previous_one_is_destroyed(service, monkeypatch):
    monkeypatch.setattr(MetricsService, '_today', staticmethod(lambda: '2026-08-20'))
    service.record_visitor(FakeRequest())
    first_hash = query(service.db_path, 'SELECT visitor_hash FROM visitor_days')[0][0]

    monkeypatch.setattr(MetricsService, '_today', staticmethod(lambda: '2026-08-21'))
    service.record_visitor(FakeRequest())

    salts = query(service.db_path, 'SELECT day FROM daily_salt')
    assert salts == [('2026-08-21',)], 'yesterday\'s salt must be gone'

    second_hash = query(
        service.db_path, 'SELECT visitor_hash FROM visitor_days WHERE day = ?', ('2026-08-21',)
    )[0][0]
    assert first_hash != second_hash, 'same client must be unlinkable across days'


# ---------------------------------------------------------------------------
# Event counters
# ---------------------------------------------------------------------------

def test_event_counters_accumulate(service):
    service.record_event('searches')
    service.record_event('searches')
    service.record_event('shows_added')

    row = query(service.db_path, 'SELECT searches, shows_added FROM daily_metrics')[0]
    assert row == (2, 1)


def test_unknown_event_name_is_swallowed_not_raised(service):
    """Fail-open: a bad event name must not surface to the caller."""
    assert service.record_event('drop_table') is None
    assert count_rows(service.db_path, 'daily_metrics') == 0


def test_show_and_genre_tallies(service):
    show = {'id': 1429, 'name': 'Attack on Titan',
            'genres': [{'name': 'Animation'}, {'name': 'Sci-Fi & Fantasy'}]}
    service.record_show_added(show)
    service.record_show_added(show)

    assert query(service.db_path, 'SELECT name, add_count FROM show_popularity') == \
        [('Attack on Titan', 2)]
    genres = dict(query(service.db_path, 'SELECT genre, add_count FROM genre_popularity'))
    assert genres == {'Animation': 2, 'Sci-Fi & Fantasy': 2}


# ---------------------------------------------------------------------------
# Buckets
# ---------------------------------------------------------------------------

@pytest.mark.parametrize('size,expected', [
    (0, '0'), (1, '1-5'), (5, '1-5'), (6, '6-20'), (20, '6-20'),
    (21, '21-50'), (50, '21-50'), (51, '51-100'), (100, '51-100'),
    (101, '100+'), (5000, '100+'),
])
def test_bucket_boundaries(size, expected):
    assert bucket_for_size(size) == expected


def test_library_size_sampled_once_per_visitor_per_day(service):
    request = FakeRequest()
    service.record_library_size(request, 3)
    service.record_library_size(request, 42)

    rows = query(service.db_path, 'SELECT bucket FROM library_samples')
    assert rows == [('21-50',)], 'latest sample should replace, not add a row'


# ---------------------------------------------------------------------------
# Rollup
# ---------------------------------------------------------------------------

def test_rollup_collapses_to_counts_and_deletes_identifiers(service, monkeypatch):
    monkeypatch.setattr(MetricsService, '_today', staticmethod(lambda: '2026-08-20'))
    service.record_visitor(FakeRequest(ip='203.0.113.1'))
    service.record_visitor(FakeRequest(ip='203.0.113.2'))
    service.record_library_size(FakeRequest(ip='203.0.113.1'), 8)
    service.record_event('searches')

    monkeypatch.setattr(MetricsService, '_today', staticmethod(lambda: '2026-08-21'))
    assert service.rollup_previous_days() == 1

    assert query(service.db_path,
                 'SELECT unique_visitors, searches FROM daily_metrics WHERE day = ?',
                 ('2026-08-20',)) == [(2, 1)]
    assert query(service.db_path, 'SELECT bucket, count FROM library_size_dist') == [('6-20', 1)]

    # The identifiers are gone.
    assert query(service.db_path, 'SELECT COUNT(*) FROM visitor_days')[0][0] == 0
    assert query(service.db_path, 'SELECT COUNT(*) FROM library_samples')[0][0] == 0


def test_rollup_leaves_today_alone(service):
    service.record_visitor(FakeRequest())
    service.rollup_previous_days()

    assert query(service.db_path, 'SELECT COUNT(*) FROM visitor_days')[0][0] == 1


# ---------------------------------------------------------------------------
# Overview
# ---------------------------------------------------------------------------

def test_overview_reports_today_before_rollup(service):
    service.record_visitor(FakeRequest(ip='203.0.113.1'))
    service.record_visitor(FakeRequest(ip='203.0.113.2'))
    service.record_event('searches', 4)
    service.record_library_size(FakeRequest(ip='203.0.113.1'), 30)
    service.record_show_added({'id': 1, 'name': 'Show One', 'genres': [{'name': 'Drama'}]})

    overview = service.get_overview(days=30)

    assert overview['visitors_today'] == 2
    assert overview['peak_daily_visitors'] == 2
    assert overview['totals']['searches'] == 4
    assert overview['top_shows'] == [{'name': 'Show One', 'add_count': 1, 'tmdb_id': 1}]
    assert overview['top_genres'] == [{'genre': 'Drama', 'add_count': 1}]
    assert overview['distribution_total'] == 1
    assert [row['bucket'] for row in overview['distribution']] == \
        ['0', '1-5', '6-20', '21-50', '51-100', '100+']


def test_overview_is_empty_but_valid_with_no_data(service):
    overview = service.get_overview(days=7)

    assert overview['daily'] == []
    assert overview['visitors_today'] == 0
    assert overview['avg_daily_visitors'] == 0
    assert overview['distribution_total'] == 0
    assert overview['top_shows'] == []


def test_overview_never_claims_a_monthly_unique_total(service):
    """Daily salts make monthly de-duplication impossible; don't imply otherwise."""
    service.record_visitor(FakeRequest())
    overview = service.get_overview()

    assert 'monthly_unique_visitors' not in overview
    assert 'unique_visitors' not in overview['totals']


# ---------------------------------------------------------------------------
# Fail-open behaviour through the real app
# ---------------------------------------------------------------------------

@pytest.fixture
def client():
    Config.TMDB_API_KEY = 'test-api-key'
    Config.SECRET_KEY = 'test-secret-key'
    app = create_app()
    app.config['TESTING'] = True
    with app.test_client() as client:
        yield client


def test_pages_still_serve_when_metrics_are_broken(client, tmp_path):
    """An unwritable metrics database must not take the site down."""
    broken = MetricsService(str(tmp_path / 'nonexistent-dir' / 'metrics.db'))
    metrics_module._metrics_service = broken
    try:
        assert client.get('/').status_code == 200
        assert client.get('/stats').status_code == 200
        assert client.get('/privacy').status_code == 200
        assert client.get('/api/search').status_code == 400
    finally:
        metrics_module._metrics_service = None


def test_page_views_are_recorded_through_the_app(client, isolated_metrics):
    client.get('/')
    client.get('/stats')

    row = query(isolated_metrics.db_path, 'SELECT page_views FROM daily_metrics')
    assert row and row[0][0] == 2


def test_visitors_come_from_tracking_shows_not_from_page_loads(client, isolated_metrics):
    client.get('/')
    assert count_rows(isolated_metrics.db_path, 'visitor_days') == 0

    client.post('/api/stats/calculate', json={'watched_shows': []})
    assert count_rows(isolated_metrics.db_path, 'visitor_days') == 0, \
        'an empty library is not a visitor'

    client.post('/api/stats/calculate',
                json={'watched_shows': [{'id': 1, 'calculated_runtime_minutes': 20}]})
    assert count_rows(isolated_metrics.db_path, 'visitor_days') == 1


def test_static_and_api_requests_are_not_page_views(client, isolated_metrics):
    client.get('/api/watched')

    assert count_rows(isolated_metrics.db_path, 'daily_metrics') == 0
