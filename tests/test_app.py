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