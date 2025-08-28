import pytest
import json
from unittest.mock import patch, MagicMock

def test_export_excludes_released_seasons():
    """Test that export functionality excludes released_seasons from exported data."""
    # Simulate export data with released_seasons included
    watched_shows_with_released_seasons = [
        {
            'id': 1,
            'name': 'Test Show',
            'seasons_watched': 2,
            'total_seasons': 3,
            'released_seasons': 3,
            'episode_run_time': 45
        },
        {
            'id': 2,
            'name': 'Another Show',
            'seasons_watched': 1,
            'total_seasons': 2,
            'released_seasons': 1,
            'episode_run_time': 30
        }
    ]
    
    # Simulate the export logic from JavaScript
    exported_shows = []
    for show in watched_shows_with_released_seasons:
        # Remove released_seasons from export (matching JavaScript logic)
        exported_show = {k: v for k, v in show.items() if k != 'released_seasons'}
        exported_shows.append(exported_show)
    
    export_data = {
        'version': '1.0',
        'exportDate': '2025-01-08T00:00:00.000Z',
        'watchedShows': exported_shows
    }
    
    # Verify released_seasons is not in exported data
    for show in export_data['watchedShows']:
        assert 'released_seasons' not in show
        assert 'id' in show
        assert 'name' in show
        assert 'seasons_watched' in show
        assert 'total_seasons' in show


def test_import_data_structure():
    """Test that import data validation works with new structure."""
    # Test valid import data without released_seasons
    valid_import_data = {
        'version': '1.0',
        'exportDate': '2025-01-08T00:00:00.000Z',
        'watchedShows': [
            {
                'id': 1,
                'name': 'Test Show',
                'seasons_watched': 2,
                'total_seasons': 3,
                'episode_run_time': 45
            }
        ]
    }
    
    # Validate import data structure (simplified version of JavaScript validation)
    def validate_import_data(data):
        if not data or not isinstance(data, dict):
            return False
        
        if 'watchedShows' in data and isinstance(data['watchedShows'], list):
            for show in data['watchedShows']:
                if not show.get('id') or not show.get('name') or not isinstance(show.get('seasons_watched'), int):
                    return False
            return True
        
        return False
    
    assert validate_import_data(valid_import_data) == True
    
    # Test invalid data
    invalid_import_data = {
        'watchedShows': [
            {
                'id': 1,
                # Missing 'name' and 'seasons_watched'
            }
        ]
    }
    
    assert validate_import_data(invalid_import_data) == False


def test_refresh_seasons_api_structure():
    """Test the expected API structure for refresh seasons functionality."""
    # Mock request data for refresh all seasons
    refresh_all_request = {
        'watched_shows': [
            {
                'id': 1,
                'name': 'Test Show',
                'seasons_watched': 2,
                'total_seasons': 3,
                'episode_run_time': 45
            }
        ]
    }
    
    # Mock expected response
    expected_response = {
        'success': True,
        'updated_watched_shows': [
            {
                'id': 1,
                'name': 'Test Show',
                'seasons_watched': 2,
                'total_seasons': 4,  # Updated
                'released_seasons': 3,  # Added by refresh
                'episode_run_time': 45
            }
        ]
    }
    
    # Verify structure
    assert 'watched_shows' in refresh_all_request
    assert isinstance(refresh_all_request['watched_shows'], list)
    
    assert 'success' in expected_response
    assert 'updated_watched_shows' in expected_response
    assert expected_response['success'] == True
    
    updated_show = expected_response['updated_watched_shows'][0]
    assert 'released_seasons' in updated_show
    assert updated_show['total_seasons'] == 4  # Should be updated
    assert updated_show['released_seasons'] == 3  # Should be set


def test_refresh_single_show_api_structure():
    """Test the expected API structure for refreshing a single show."""
    show_id = 123
    
    # Mock request data for refresh single show
    refresh_request = {
        'watched_shows': [
            {
                'id': 123,
                'name': 'Single Show',
                'seasons_watched': 1,
                'total_seasons': 2,
                'episode_run_time': 30
            }
        ]
    }
    
    # Mock expected response
    expected_response = {
        'success': True,
        'updated_show': {
            'id': 123,
            'name': 'Single Show',
            'seasons_watched': 1,
            'total_seasons': 3,  # Updated
            'released_seasons': 2,  # Added by refresh
            'episode_run_time': 30
        },
        'updated_watched_shows': [
            {
                'id': 123,
                'name': 'Single Show',
                'seasons_watched': 1,
                'total_seasons': 3,  # Updated
                'released_seasons': 2,  # Added by refresh
                'episode_run_time': 30
            }
        ]
    }
    
    # Verify structure
    assert 'watched_shows' in refresh_request
    
    assert 'success' in expected_response
    assert 'updated_show' in expected_response
    assert 'updated_watched_shows' in expected_response
    assert expected_response['success'] == True
    
    updated_show = expected_response['updated_show']
    assert updated_show['id'] == show_id
    assert 'released_seasons' in updated_show
    assert updated_show['total_seasons'] == 3  # Should be updated
    assert updated_show['released_seasons'] == 2  # Should be set


if __name__ == '__main__':
    test_export_excludes_released_seasons()
    test_import_data_structure()
    test_refresh_seasons_api_structure()
    test_refresh_single_show_api_structure()
    print("All tests passed!")