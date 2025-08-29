"""
Test module for unreleased seasons filtering functionality.
Tests that unreleased seasons are properly excluded from search, editing, and statistics.
"""
import pytest
import json
import os
from datetime import datetime, date
from unittest.mock import patch

# Set test environment
os.environ.pop('TMDB_API_KEY', None)

from app import create_app
from services.tmdb_service import TMDBService
from services.calculation_service import CalculationService


class TestUnreleasedSeasonsFiltering:
    """Test unreleased seasons filtering across search, editing, and statistics."""

    @pytest.fixture
    def app(self):
        """Create test app."""
        app = create_app()
        app.config['TESTING'] = True
        return app

    @pytest.fixture
    def client(self, app):
        """Create test client."""
        return app.test_client()

    @pytest.fixture
    def tmdb_service(self):
        """Create TMDB service for testing."""
        service = TMDBService()
        service.use_mock_data_for_testing()  # Enable mock data for testing
        return service

    @pytest.fixture
    def calc_service(self):
        """Create calculation service for testing."""
        return CalculationService()

    def test_season_release_date_detection(self, tmdb_service):
        """Test that seasons are correctly identified as released or unreleased."""
        # Test released season (past date)
        assert tmdb_service._is_season_released('2020-01-01') == True
        assert tmdb_service._is_season_released('2023-01-01') == True
        
        # Test unreleased season (future date)
        assert tmdb_service._is_season_released('2026-01-01') == False
        assert tmdb_service._is_season_released('2027-12-31') == False
        
        # Test invalid dates
        assert tmdb_service._is_season_released('') == False
        assert tmdb_service._is_season_released('invalid-date') == False
        assert tmdb_service._is_season_released(None) == False

    def test_released_seasons_count(self, tmdb_service):
        """Test that get_released_seasons_count returns correct count."""
        # Test Stranger Things (4 released out of 5 total)
        released_count = tmdb_service.get_released_seasons_count(4, 5)
        assert released_count == 4, f"Expected 4 released seasons for Stranger Things, got {released_count}"
        
        # Test The Mandalorian (3 released out of 4 total)
        released_count = tmdb_service.get_released_seasons_count(5, 4)
        assert released_count == 3, f"Expected 3 released seasons for The Mandalorian, got {released_count}"
        
        # Test Breaking Bad (all 5 seasons released)
        released_count = tmdb_service.get_released_seasons_count(1, 5)
        assert released_count == 5, f"Expected 5 released seasons for Breaking Bad, got {released_count}"

    def test_search_results_include_released_seasons(self, tmdb_service):
        """Test that search results include both total and released seasons count."""
        # Search for Stranger Things
        results = tmdb_service.search_shows("stranger")
        
        assert len(results['results']) > 0, "Should find at least one result"
        
        stranger_things = None
        for show in results['results']:
            if 'stranger' in show['name'].lower():
                stranger_things = show
                break
        
        assert stranger_things is not None, "Should find Stranger Things in results"
        assert 'number_of_seasons' in stranger_things, "Should include total seasons count"
        assert 'number_of_released_seasons' in stranger_things, "Should include released seasons count"
        
        # Verify the structure is correct (with optimized search)
        total_seasons = stranger_things['number_of_seasons']
        released_seasons = stranger_things['number_of_released_seasons']
        
        assert released_seasons <= total_seasons, "Released seasons should not exceed total seasons"
        # Note: Search results now use default values (1,1) for performance
        # Detailed season info is fetched when shows are added to the watched list
        assert total_seasons >= 1, f"Should have at least 1 total season, got {total_seasons}"
        assert released_seasons >= 1, f"Should have at least 1 released season, got {released_seasons}"

    def test_completion_stats_with_released_seasons(self, calc_service):
        """Test that completion statistics use released seasons for calculation."""
        # Test show with all released seasons watched (should be completed)
        test_show_completed = {
            'id': 5,
            'name': 'The Mandalorian',
            'seasons_watched': 3,
            'total_seasons': 4,
            'released_seasons': 3,  # All released seasons watched
            'calculated_runtime_minutes': 744
        }
        
        stats = calc_service.calculate_stats([test_show_completed])
        
        assert stats['completion_stats']['completed_shows'] == 1, "Should count as completed show"
        assert stats['completion_stats']['in_progress_shows'] == 0, "Should not count as in progress"
        assert stats['completion_stats']['completion_rate'] == 100.0, "Should have 100% completion rate"

    def test_completion_stats_without_released_seasons_fallback(self, calc_service):
        """Test that completion statistics fall back to total_seasons for old data."""
        # Test show without released_seasons field (old data format)
        test_show_old_format = {
            'id': 5,
            'name': 'The Mandalorian',
            'seasons_watched': 3,
            'total_seasons': 4,  # No released_seasons field
            'calculated_runtime_minutes': 744
        }
        
        stats = calc_service.calculate_stats([test_show_old_format])
        
        assert stats['completion_stats']['completed_shows'] == 0, "Should not count as completed (3/4 total)"
        assert stats['completion_stats']['in_progress_shows'] == 1, "Should count as in progress"
        assert stats['completion_stats']['completion_rate'] == 0.0, "Should have 0% completion rate"

    def test_completion_stats_partial_released_seasons(self, calc_service):
        """Test completion stats with partially watched released seasons."""
        # Test show with some but not all released seasons watched
        test_show_partial = {
            'id': 4,
            'name': 'Stranger Things',
            'seasons_watched': 2,  # Only 2 out of 4 released seasons watched
            'total_seasons': 5,
            'released_seasons': 4,
            'calculated_runtime_minutes': 400
        }
        
        stats = calc_service.calculate_stats([test_show_partial])
        
        assert stats['completion_stats']['completed_shows'] == 0, "Should not count as completed (2/4 released)"
        assert stats['completion_stats']['in_progress_shows'] == 1, "Should count as in progress"
        assert stats['completion_stats']['completion_rate'] == 0.0, "Should have 0% completion rate"

    def test_completion_stats_consistency_frontend_backend(self, calc_service):
        """Test that frontend and backend completion logic produce consistent results."""
        # Test data with shows that have both total_seasons and released_seasons
        test_shows = [
            {
                'id': 1,
                'name': 'Show with unreleased seasons',
                'seasons_watched': 3,
                'total_seasons': 5,      # Total including unreleased
                'released_seasons': 3,   # Only released seasons - should be completed
                'calculated_runtime_minutes': 600
            },
            {
                'id': 2,
                'name': 'Show without released_seasons field',
                'seasons_watched': 2,
                'total_seasons': 4,      # No released_seasons field (old data) - should be in progress
                'calculated_runtime_minutes': 400
            },
            {
                'id': 3,
                'name': 'Completed show',
                'seasons_watched': 2,
                'total_seasons': 2,
                'released_seasons': 2,   # Fully completed
                'calculated_runtime_minutes': 300
            }
        ]
        
        # Backend calculation using CalculationService
        backend_stats = calc_service.calculate_stats(test_shows)
        
        # Frontend logic simulation (matching the fixed JavaScript logic)
        frontend_completed = 0
        frontend_in_progress = 0
        
        for show in test_shows:
            seasons = show.get('seasons_watched', 0)
            total_seasons_in_show = show.get('total_seasons', 1)
            # Frontend now uses released_seasons with fallback to total_seasons (same as backend)
            released_seasons_in_show = show.get('released_seasons', total_seasons_in_show)
            
            if seasons >= released_seasons_in_show:
                frontend_completed += 1
            else:
                frontend_in_progress += 1
        
        total_shows = len(test_shows)
        frontend_completion_rate = (frontend_completed / total_shows * 100) if total_shows > 0 else 0
        
        # Assert frontend and backend produce the same results
        assert frontend_completed == backend_stats['completion_stats']['completed_shows'], \
            f"Frontend completed count ({frontend_completed}) should match backend ({backend_stats['completion_stats']['completed_shows']})"
        
        assert frontend_in_progress == backend_stats['completion_stats']['in_progress_shows'], \
            f"Frontend in-progress count ({frontend_in_progress}) should match backend ({backend_stats['completion_stats']['in_progress_shows']})"
        
        assert round(frontend_completion_rate, 1) == backend_stats['completion_stats']['completion_rate'], \
            f"Frontend completion rate ({round(frontend_completion_rate, 1)}%) should match backend ({backend_stats['completion_stats']['completion_rate']}%)"
        
        # Verify specific expected values for this test case
        assert backend_stats['completion_stats']['completed_shows'] == 2, "Should have 2 completed shows"
        assert backend_stats['completion_stats']['in_progress_shows'] == 1, "Should have 1 in-progress show"
        assert backend_stats['completion_stats']['completion_rate'] == 66.7, "Should have 66.7% completion rate"

    def test_api_search_endpoint(self, client):
        """Test that search API endpoint returns released seasons data."""
        response = client.get('/api/search?query=stranger')
        
        assert response.status_code == 200, "Search API should return success"
        
        data = json.loads(response.data)
        assert 'results' in data, "Response should contain results"
        assert len(data['results']) > 0, "Should find search results"
        
        # Check that results include released seasons count
        for show in data['results']:
            if 'stranger' in show['name'].lower():
                assert 'number_of_seasons' in show, "Should include total seasons"
                assert 'number_of_released_seasons' in show, "Should include released seasons"
                assert show['number_of_released_seasons'] <= show['number_of_seasons'], \
                    "Released seasons should not exceed total seasons"
                break
        else:
            pytest.fail("Should find Stranger Things in search results")

    def test_api_add_show_includes_released_seasons(self, client):
        """Test that adding a show via API includes released_seasons field."""
        # Simulate adding The Mandalorian
        show_data = {
            'id': 5,
            'seasons_watched': 2,
            'current_watched_shows': []  # Empty initial list
        }
        
        response = client.post('/api/watched', 
                             data=json.dumps(show_data),
                             content_type='application/json')
        
        assert response.status_code == 200, "Add show API should return success"
        
        data = json.loads(response.data)
        assert 'updated_watched_shows' in data, "Response should contain updated shows list"
        
        # Find the added show
        added_shows = data['updated_watched_shows']
        assert len(added_shows) > 0, "Should have added a show"
        
        mandalorian = added_shows[0]
        assert mandalorian['id'] == 5, "Should be The Mandalorian"
        assert 'released_seasons' in mandalorian, "Should include released_seasons field"
        assert mandalorian['released_seasons'] == 3, "Should have 3 released seasons"
        assert mandalorian['total_seasons'] == 4, "Should have 4 total seasons"


if __name__ == '__main__':
    pytest.main([__file__, '-v'])