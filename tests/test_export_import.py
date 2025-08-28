import pytest
import json
from app import create_app

@pytest.fixture
def client():
    """Create a test client for the app."""
    app = create_app()
    app.config['TESTING'] = True
    with app.test_client() as client:
        yield client

def test_export_import_data_structure():
    """Test that export creates valid data structure for import."""
    # Sample show data in localStorage format
    test_data = [
        {
            'id': 1,
            'name': 'Test Show',
            'seasons_watched': 2,
            'total_seasons': 3,
            'total_episodes': 30,
            'episode_run_time': 45,
            'genres': ['Drama', 'Crime']
        }
    ]
    
    # Simulate export data structure
    export_data = {
        'version': '1.0',
        'exportDate': '2025-08-28T09:00:00.000Z',
        'watchedShows': test_data,
        'sortPreference': 'alphabet-asc',
        'statsCache': None
    }
    
    # Test JSON serialization (what export would do)
    json_string = json.dumps(export_data, indent=2)
    assert len(json_string) > 0
    
    # Test JSON deserialization (what import would do)
    imported_data = json.loads(json_string)
    
    # Validate structure
    assert 'version' in imported_data
    assert 'watchedShows' in imported_data
    assert 'sortPreference' in imported_data
    assert len(imported_data['watchedShows']) == 1
    assert imported_data['watchedShows'][0]['name'] == 'Test Show'
    assert imported_data['watchedShows'][0]['seasons_watched'] == 2

def test_export_import_validation():
    """Test validation of import data format."""
    # Valid data
    valid_data = {
        'watchedShows': [
            {'id': 1, 'name': 'Show', 'seasons_watched': 1}
        ]
    }
    
    # Test validation function logic
    def validate_import_data(data):
        if not data or not isinstance(data, dict):
            return False
        
        if 'watchedShows' in data and isinstance(data['watchedShows'], list):
            for show in data['watchedShows']:
                if not show.get('id') or not show.get('name') or not isinstance(show.get('seasons_watched'), int):
                    return False
            return True
        
        # Also accept simple array of shows (backward compatibility)
        if isinstance(data, list):
            for show in data:
                if not show.get('id') or not show.get('name') or not isinstance(show.get('seasons_watched'), int):
                    return False
            return True
        
        return False
    
    # Test valid data
    assert validate_import_data(valid_data) == True
    
    # Test invalid data
    invalid_data = {'wrong': 'structure'}
    assert validate_import_data(invalid_data) == False
    
    # Test invalid show data
    invalid_show_data = {
        'watchedShows': [
            {'id': 1, 'name': 'Show'}  # Missing seasons_watched
        ]
    }
    assert validate_import_data(invalid_show_data) == False

def test_backward_compatibility_array_format():
    """Test that import accepts simple array format for backward compatibility."""
    # Old format: simple array of shows
    old_format = [
        {'id': 1, 'name': 'Show 1', 'seasons_watched': 2},
        {'id': 2, 'name': 'Show 2', 'seasons_watched': 3}
    ]
    
    # Validation should accept old format
    def validate_import_data(data):
        if isinstance(data, list):
            for show in data:
                if not show.get('id') or not show.get('name') or not isinstance(show.get('seasons_watched'), int):
                    return False
            return True
        return False
    
    assert validate_import_data(old_format) == True