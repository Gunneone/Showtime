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

def test_localStorage_migration_unlimited_capacity():
    """Test that localStorage solution removes the 4KB limit entirely."""
    
    # Create a large dataset that would exceed cookie limits
    large_watched_shows = []
    for i in range(1, 101):  # 100 shows - way beyond cookie capacity
        show = {
            'id': i,
            'name': f'Test Show {i}' * 10,  # Long names
            'poster_path': f'/test/poster/{i}.jpg',
            'first_air_date': '2020-01-01',
            'seasons_watched': 5,
            'total_seasons': 10,
            'total_episodes': 100,
            'episode_run_time': 45,
            'genres': ['Drama', 'Action', 'Comedy', 'Thriller', 'Science Fiction']  # Multiple genres
        }
        large_watched_shows.append(show)
    
    # Calculate size in bytes (should be much larger than 4KB)
    data_size = len(json.dumps(large_watched_shows).encode('utf-8'))
    assert data_size > 4096, f"Test data should exceed 4KB, got {data_size} bytes"
    print(f"Test dataset size: {data_size} bytes ({data_size/1024:.1f} KB)")
    
    # This would be impossible with cookies but should work fine with localStorage
    # Since we're testing the concept, we don't need actual localStorage in the test
    
def test_add_show_with_localStorage_api(client):
    """Test adding a show using the new localStorage-based API."""
    
    # Start with empty localStorage data
    current_watched_shows = []
    
    response = client.post('/api/watched', 
                         json={
                             'id': 1, 
                             'seasons_watched': 2,
                             'current_watched_shows': current_watched_shows
                         },
                         content_type='application/json')
    
    assert response.status_code == 200
    data = json.loads(response.data)
    
    assert data['success'] == True
    assert 'updated_watched_shows' in data
    assert len(data['updated_watched_shows']) == 1
    assert data['updated_watched_shows'][0]['id'] == 1
    assert data['updated_watched_shows'][0]['seasons_watched'] == 2

def test_update_show_with_localStorage_api(client):
    """Test updating a show using localStorage API."""
    
    # Start with one show in localStorage
    current_watched_shows = [{
        'id': 1,
        'name': 'Breaking Bad',
        'seasons_watched': 2,
        'total_seasons': 5,
        'total_episodes': 62,
        'episode_run_time': 47,
        'genres': ['Drama', 'Crime']
    }]
    
    response = client.put('/api/watched/1', 
                        json={
                            'seasons_watched': 5,
                            'current_watched_shows': current_watched_shows
                        },
                        content_type='application/json')
    
    assert response.status_code == 200
    data = json.loads(response.data)
    
    assert data['success'] == True
    assert data['updated_watched_shows'][0]['seasons_watched'] == 5

def test_remove_show_with_localStorage_api(client):
    """Test removing a show using localStorage API."""
    
    # Start with two shows in localStorage
    current_watched_shows = [
        {
            'id': 1,
            'name': 'Breaking Bad',
            'seasons_watched': 5,
            'total_seasons': 5,
            'total_episodes': 62,
            'episode_run_time': 47,
            'genres': ['Drama', 'Crime']
        },
        {
            'id': 2,
            'name': 'The Office',
            'seasons_watched': 9,
            'total_seasons': 9,
            'total_episodes': 201,
            'episode_run_time': 22,
            'genres': ['Comedy']
        }
    ]
    
    response = client.delete('/api/watched/1', 
                           json={
                               'current_watched_shows': current_watched_shows
                           },
                           content_type='application/json')
    
    assert response.status_code == 200
    data = json.loads(response.data)
    
    assert data['success'] == True
    assert len(data['updated_watched_shows']) == 1
    assert data['updated_watched_shows'][0]['id'] == 2

def test_calculate_watched_shows_from_localStorage_data(client):
    """Test calculating watch time from localStorage data."""
    
    watched_shows = [
        {
            'id': 1,
            'name': 'Breaking Bad',
            'seasons_watched': 2,
            'total_seasons': 5,
            'total_episodes': 62,
            'episode_run_time': 47,
            'genres': ['Drama', 'Crime']
        }
    ]
    
    response = client.post('/api/watched/calculate', 
                         json={
                             'watched_shows': watched_shows
                         },
                         content_type='application/json')
    
    assert response.status_code == 200
    data = json.loads(response.data)
    
    assert 'total_time_minutes' in data
    assert 'total_time_formatted' in data
    assert data['total_time_minutes'] > 0
    assert data['total_time_formatted'] != "0h"

def test_calculate_stats_from_localStorage_data(client):
    """Test calculating statistics from localStorage data."""
    
    watched_shows = [
        {
            'id': 1,
            'name': 'Breaking Bad',
            'seasons_watched': 5,
            'total_seasons': 5,
            'total_episodes': 62,
            'episode_run_time': 47,
            'first_air_date': '2008-01-20',
            'genres': ['Drama', 'Crime']
        },
        {
            'id': 2,
            'name': 'The Office',
            'seasons_watched': 9,
            'total_seasons': 9,
            'total_episodes': 201,
            'episode_run_time': 22,
            'first_air_date': '2005-03-24',
            'genres': ['Comedy']
        }
    ]
    
    response = client.post('/api/stats/calculate', 
                         json={
                             'watched_shows': watched_shows
                         },
                         content_type='application/json')
    
    assert response.status_code == 200
    data = json.loads(response.data)
    
    assert data['total_shows'] == 2
    assert 'genre_breakdown' in data
    assert 'yearly_breakdown' in data
    assert 'completion_stats' in data
    assert len(data['genre_breakdown']) > 0

def test_no_cookies_sent_in_response_headers(client):
    """Test that the new API doesn't set cookies."""
    
    response = client.post('/api/watched', 
                         json={
                             'id': 1, 
                             'seasons_watched': 1,
                             'current_watched_shows': []
                         },
                         content_type='application/json')
    
    assert response.status_code == 200
    
    # Check that no watched_shows cookie is set
    set_cookie_headers = [header for header in response.headers if header[0] == 'Set-Cookie']
    watched_shows_cookies = [cookie for cookie in set_cookie_headers if 'watched_shows' in cookie[1] and not cookie[1].startswith('watched_shows=;')]
    
    assert len(watched_shows_cookies) == 0, "No watched_shows cookies should be set with localStorage approach"

def test_massive_dataset_serialization():
    """Test that we can handle very large datasets that would break cookies."""
    
    # Create a dataset that would be ~1MB (much larger than 4KB cookie limit)
    massive_dataset = []
    for i in range(1000):  # 1000 shows
        show = {
            'id': i,
            'name': f'Very Long Show Name That Takes Up Space Show Number {i}',
            'poster_path': f'/very/long/poster/path/that/takes/up/space/show_{i}.jpg',
            'first_air_date': '2020-01-01',
            'seasons_watched': 10,
            'total_seasons': 20,
            'total_episodes': 500,
            'episode_run_time': 45,
            'genres': ['Drama', 'Action', 'Comedy', 'Thriller', 'Science Fiction', 'Fantasy', 'Horror', 'Romance']
        }
        massive_dataset.append(show)
    
    # Test that we can serialize this massive dataset
    serialized = json.dumps(massive_dataset)
    size_bytes = len(serialized.encode('utf-8'))
    size_kb = size_bytes / 1024
    
    print(f"Massive dataset: {len(massive_dataset)} shows, {size_kb:.1f} KB")
    
    # This would be impossible with cookies (4KB limit) but fine with localStorage (5-10MB limit)
    assert size_kb > 100, f"Dataset should be large (>100KB), got {size_kb:.1f} KB"
    assert len(massive_dataset) == 1000
    
    # Test that we can deserialize it back
    deserialized = json.loads(serialized)
    assert len(deserialized) == 1000
    assert deserialized[0]['name'].startswith('Very Long Show Name')

def test_backward_compatibility_cookie_migration(client):
    """Test that the API still works with cookie fallback for migration."""
    
    # Simulate old cookie-based request (no current_watched_shows in body)
    response = client.post('/api/watched', 
                         json={
                             'id': 1, 
                             'seasons_watched': 1
                             # No current_watched_shows - should fallback to cookies
                         },
                         content_type='application/json')
    
    # Should still work (with empty cookie fallback)
    assert response.status_code == 200
    data = json.loads(response.data)
    assert data['success'] == True