import pytest
import json
from app import create_app
from config import Config

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

def test_index_page_has_sort_controls(client):
    """Test that the index page includes sort controls in the HTML."""
    response = client.get('/')
    assert response.status_code == 200
    assert b'Sort by:' in response.data
    assert b'sortSelect' in response.data
    assert b'Alphabet (A-Z)' in response.data
    assert b'Watch Time (Most to Least)' in response.data

def test_watched_shows_api_structure(client):
    """Test that the API returns the expected structure for watched shows."""
    # Test empty watched list first
    response = client.get('/api/watched')
    assert response.status_code == 200
    data = json.loads(response.data)
    assert isinstance(data, dict)
    assert 'watched_shows' in data
    assert isinstance(data['watched_shows'], list)
    assert 'total_time_minutes' in data
    assert 'total_time_formatted' in data

def test_add_show_api_accepts_seasons(client):
    """Test that the add show API accepts seasons_watched parameter."""
    # Test adding a show with specific seasons
    response = client.post('/api/watched', 
                          data=json.dumps({
                              'id': 1,
                              'seasons_watched': 3
                          }),
                          content_type='application/json')
    assert response.status_code == 200

def test_update_show_api_accepts_seasons(client):
    """Test that the update show API accepts seasons_watched parameter."""
    # First add a show
    client.post('/api/watched', 
                data=json.dumps({
                    'id': 1,
                    'seasons_watched': 3
                }),
                content_type='application/json')
    
    # Then update it
    response = client.put('/api/watched/1', 
                         data=json.dumps({
                             'seasons_watched': 5
                         }),
                         content_type='application/json')
    assert response.status_code == 200

def test_search_functionality_intact(client):
    """Test that search functionality still works with our changes."""
    response = client.get('/api/search?query=test')
    assert response.status_code == 200
    data = json.loads(response.data)
    assert 'results' in data