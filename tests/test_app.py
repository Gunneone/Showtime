import pytest
import json
from app import create_app
from src.config import Config

@pytest.fixture
def client():
    """Create a test client for the app."""
    # Override config for testing
    Config.TMDB_API_KEY = 'test-api-key'
    Config.SECRET_KEY = 'test-secret-key'
    
    app = create_app()
    app.config['TESTING'] = True
    
    with app.test_client() as client:
        yield client

def test_index_page(client):
    """Test that the index page loads correctly."""
    response = client.get('/')
    assert response.status_code == 200
    assert b'Showtime' in response.data

def test_stats_page(client):
    """Test that the stats page loads correctly."""
    response = client.get('/stats')
    assert response.status_code == 200
    assert b'Statistics' in response.data

def test_api_search_without_query(client):
    """Test API search without query parameter."""
    response = client.get('/api/search')
    assert response.status_code == 400
    data = json.loads(response.data)
    assert 'error' in data

def test_api_watched_get_empty(client):
    """Test getting watched shows when list is empty."""
    response = client.get('/api/watched')
    assert response.status_code == 200
    data = json.loads(response.data)
    assert data['watched_shows'] == []
    assert data['total_time_minutes'] == 0

def test_api_stats_calculate_empty(client):
    """Test calculating stats when no shows are watched."""
    response = client.post('/api/stats/calculate', 
                          json={'watched_shows': []},
                          content_type='application/json')
    assert response.status_code == 200
    data = json.loads(response.data)
    assert data['total_shows'] == 0
    assert data['total_time_minutes'] == 0
def test_api_search_rejects_non_numeric_page(client):
    """Test API search rejects a page parameter that is not a number."""
    response = client.get('/api/search?query=lost&page=abc')
    assert response.status_code == 400
    data = json.loads(response.data)
    assert 'error' in data

def test_api_search_rejects_page_below_one(client):
    """Test API search rejects a page parameter below 1."""
    for page in (0, -3):
        response = client.get(f'/api/search?query=lost&page={page}')
        assert response.status_code == 400
        data = json.loads(response.data)
        assert 'error' in data

def test_api_search_reports_tmdb_failure(client, monkeypatch):
    """Test API search surfaces a TMDB failure instead of returning 200."""
    from src.routes import api

    class FailingService:
        def search_shows_with_fallback(self, query, page=1):
            raise Exception('TMDB API authentication failed (HTTP 401)')

    monkeypatch.setattr(api, 'get_tmdb_service', lambda: FailingService())

    response = client.get('/api/search?query=some-query-that-is-not-cached')
    assert response.status_code == 500
    data = json.loads(response.data)
    assert 'error' in data
    assert 'authentication failed' in data['error']

def test_api_search_caches_pages_separately(client, monkeypatch):
    """Test that each result page is cached under its own key."""
    from src.routes import api

    served = []

    class PagedService:
        def search_shows_with_fallback(self, query, page=1):
            served.append(page)
            return {'results': [{'id': page}], 'total_pages': 3,
                    'total_results': 3, 'page': page}

    monkeypatch.setattr(api, 'get_tmdb_service', lambda: PagedService())

    first = json.loads(client.get('/api/search?query=paging-probe&page=1').data)
    second = json.loads(client.get('/api/search?query=paging-probe&page=2').data)

    assert first['results'][0]['id'] == 1
    assert second['results'][0]['id'] == 2
    assert served == [1, 2]

    # Both pages are now cached, so no further calls reach the service
    json.loads(client.get('/api/search?query=paging-probe&page=1').data)
    assert served == [1, 2]


def test_api_recommendations_for_an_empty_library(client):
    """An empty library still gets suggestions, from the popular list."""
    response = client.post('/api/recommendations', json={'watched_shows': []})

    assert response.status_code == 200
    data = json.loads(response.data)
    assert data['mode'] == 'popular'
    assert len(data['results']) > 0


def test_api_recommendations_without_a_body(client):
    """A request with no JSON body is treated as an empty library, not an error."""
    response = client.post('/api/recommendations')

    assert response.status_code == 200
    assert json.loads(response.data)['mode'] == 'popular'


def test_api_recommendations_rejects_a_malformed_library(client):
    """watched_shows has to be a list."""
    response = client.post('/api/recommendations', json={'watched_shows': 'Breaking Bad'})

    assert response.status_code == 400
    assert 'error' in json.loads(response.data)


def test_api_recommendations_never_returns_a_watched_show(client):
    """Anything already logged is filtered out of the response."""
    watched = [{'id': 1, 'name': 'Breaking Bad', 'seasons_watched': 1},
               {'id': 3, 'name': 'Game of Thrones', 'seasons_watched': 1}]

    response = client.post('/api/recommendations', json={'watched_shows': watched})

    assert response.status_code == 200
    returned_ids = {show['id'] for show in json.loads(response.data)['results']}
    assert not returned_ids & {1, 3}


def test_api_recommendations_reports_service_failure(client, monkeypatch):
    """A failure inside the service surfaces as a 500 with a message."""
    from src.routes import api

    class BrokenService:
        def build_recommendations(self, watched_shows):
            raise Exception('TMDB unavailable')

    monkeypatch.setattr(api, 'get_rec_service', lambda: BrokenService())

    response = client.post('/api/recommendations', json={'watched_shows': []})

    assert response.status_code == 500
    assert 'error' in json.loads(response.data)


@pytest.fixture
def no_admin_client():
    """A client with the usage dashboard explicitly disabled.

    Set rather than assumed: a developer's .env may define
    SHOWTIME_ADMIN_TOKEN, which load_dotenv() would otherwise leak into the
    test run and turn the dashboard on.
    """
    Config.TMDB_API_KEY = 'test-api-key'
    Config.SECRET_KEY = 'test-secret-key'
    original_token = Config.ADMIN_TOKEN
    Config.ADMIN_TOKEN = None

    app = create_app()
    app.config['TESTING'] = True
    try:
        with app.test_client() as client:
            yield client
    finally:
        Config.ADMIN_TOKEN = original_token


@pytest.fixture
def admin_client():
    """A client with the usage dashboard enabled."""
    Config.TMDB_API_KEY = 'test-api-key'
    Config.SECRET_KEY = 'test-secret-key-not-a-default'
    original_token = Config.ADMIN_TOKEN
    Config.ADMIN_TOKEN = 'correct-horse-battery-staple'

    app = create_app()
    app.config['TESTING'] = True
    try:
        with app.test_client() as client:
            yield client
    finally:
        Config.ADMIN_TOKEN = original_token


def test_privacy_page(client):
    """The privacy page loads and says where watch data actually lives."""
    response = client.get('/privacy')
    assert response.status_code == 200
    assert b'Privacy' in response.data
    assert b'never stored on the server' in response.data


def test_privacy_is_linked_from_the_footer(client):
    """A privacy page nobody can find is not much use."""
    response = client.get('/')
    assert b'href="/privacy"' in response.data


def test_no_cookies_are_set_for_ordinary_visitors(client):
    """The privacy page claims this, so it had better stay true."""
    for path in ('/', '/stats', '/privacy'):
        response = client.get(path)
        assert 'Set-Cookie' not in response.headers, f'{path} set a cookie'


def test_admin_dashboard_hidden_when_no_token_configured(no_admin_client):
    """Without a token the dashboard should not even admit it exists."""
    assert no_admin_client.get('/admin/usage').status_code == 404
    assert no_admin_client.post('/admin/login', data={'token': 'anything'}).status_code == 404


def test_admin_dashboard_requires_the_token(admin_client):
    response = admin_client.get('/admin/usage')
    assert response.status_code == 401
    assert b'Access token' in response.data


def test_admin_login_rejects_a_wrong_token(admin_client):
    response = admin_client.post('/admin/login', data={'token': 'wrong'})
    assert response.status_code == 401
    assert 'Set-Cookie' not in response.headers


def test_admin_login_accepts_the_token_and_renders_the_dashboard(admin_client):
    response = admin_client.post(
        '/admin/login', data={'token': 'correct-horse-battery-staple'}
    )
    assert response.status_code == 302

    response = admin_client.get('/admin/usage')
    assert response.status_code == 200
    assert b'Visitors today' in response.data


def test_admin_dashboard_is_not_linked_from_the_site(admin_client):
    """It is an unlisted URL; nothing rendered should point at it."""
    for path in ('/', '/stats', '/privacy'):
        assert b'/admin/usage' not in admin_client.get(path).data


def test_enabling_the_dashboard_with_a_default_secret_key_is_refused():
    """A well-known SECRET_KEY would make the admin session cookie forgeable."""
    original_key, original_token = Config.SECRET_KEY, Config.ADMIN_TOKEN
    Config.SECRET_KEY = 'dev-secret-key-change-in-production'
    Config.ADMIN_TOKEN = 'some-token'
    try:
        with pytest.raises(RuntimeError, match='SECRET_KEY'):
            create_app()
    finally:
        Config.SECRET_KEY, Config.ADMIN_TOKEN = original_key, original_token
