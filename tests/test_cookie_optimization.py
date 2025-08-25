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

def test_cookie_size_optimization_allows_many_shows(client):
    """Test that cookie size optimization allows adding many shows without hitting the 4KB limit."""
    
    # Test adding 15 shows (more than double the original limit of ~6-7 shows)
    for i in range(1, 16):
        response = client.post('/api/watched', 
                             json={'id': i, 'seasons_watched': 2},
                             content_type='application/json')
        
        assert response.status_code == 200, f"Failed to add show {i}"
        
        # Verify show was actually added
        get_response = client.get('/api/watched')
        assert get_response.status_code == 200
        get_data = json.loads(get_response.data)
        
        assert len(get_data['watched_shows']) == i, f"Expected {i} shows, got {len(get_data['watched_shows'])}"

def test_watch_time_calculation_works_without_episode_runtimes(client):
    """Test that watch time calculations work correctly with optimized cookie data (no episode_runtimes)."""
    
    # Add a show
    response = client.post('/api/watched', 
                         json={'id': 1, 'seasons_watched': 2},
                         content_type='application/json')
    assert response.status_code == 200
    
    # Get the watch time
    get_response = client.get('/api/watched')
    get_data = json.loads(get_response.data)
    
    # Verify calculations work (Breaking Bad mock: 5 seasons, 62 episodes, 47min average)
    # 2 seasons watched = ~25 episodes = ~1175 minutes
    total_time = get_data['total_time_minutes']
    assert total_time > 1000, f"Expected time > 1000 minutes, got {total_time}"
    assert total_time < 1500, f"Expected time < 1500 minutes, got {total_time}"
    
    # Verify formatted time is reasonable
    assert get_data['total_time_formatted'] != "0h", "Formatted time should not be 0h"

def test_genre_data_remains_functional(client):
    """Test that genre data is still accessible after optimization."""
    
    # Add a show
    response = client.post('/api/watched', 
                         json={'id': 1, 'seasons_watched': 1},
                         content_type='application/json')
    assert response.status_code == 200
    
    # Check stats endpoint which processes genre data
    stats_response = client.get('/api/stats')
    assert stats_response.status_code == 200
    stats_data = json.loads(stats_response.data)
    
    # Verify genre breakdown exists and contains data
    assert 'genre_breakdown' in stats_data
    genre_breakdown = stats_data['genre_breakdown']
    assert len(genre_breakdown) > 0, "Genre breakdown should contain data"
    
    # Verify genre names are accessible (Breaking Bad has Drama, Crime genres)
    genre_names = list(genre_breakdown.keys())
    assert 'Drama' in genre_names or 'Crime' in genre_names, f"Expected Drama or Crime in genres, got {genre_names}"

def test_cookie_stores_optimized_data_structure(client):
    """Test that the cookie stores the optimized data structure."""
    
    # Add a show
    response = client.post('/api/watched', 
                         json={'id': 1, 'seasons_watched': 1},
                         content_type='application/json')
    assert response.status_code == 200
    
    # Get the data back
    get_response = client.get('/api/watched')
    get_data = json.loads(get_response.data)
    
    show = get_data['watched_shows'][0]
    
    # Verify optimized structure - no episode_runtimes field
    assert 'episode_runtimes' not in show, "episode_runtimes should not be in optimized data"
    
    # Verify essential fields are still present
    required_fields = ['id', 'name', 'seasons_watched', 'total_seasons', 'total_episodes', 'episode_run_time']
    for field in required_fields:
        assert field in show, f"Required field '{field}' missing from show data"
    
    # Verify genres are stored as simple array (not objects with id/name)
    assert 'genres' in show
    genres = show['genres']
    if genres:  # Only check if genres exist
        # Should be strings, not objects
        assert isinstance(genres[0], str), f"Genres should be strings, got {type(genres[0])}"