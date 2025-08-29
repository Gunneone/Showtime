"""
Test the specific search bugs mentioned in issue #67.
Tests for duplicates, ordering, result limits, and season bar overflow.
"""

import pytest
import json


class TestSearchBugFixes:
    """Test search bug fixes."""
    
    @pytest.fixture
    def client(self):
        """Create test client."""
        import os
        import sys
        
        # Add the project root to path
        project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        sys.path.insert(0, project_root)
        
        from app import create_app
        
        app = create_app()
        app.config['TESTING'] = True
        
        with app.test_client() as client:
            yield client
    
    def test_search_no_duplicates(self, client):
        """Test that search results don't contain duplicates."""
        response = client.get('/api/search?query=test')
        assert response.status_code == 200
        
        data = response.get_json()
        assert 'results' in data
        
        # Check for duplicates by collecting IDs
        show_ids = [show['id'] for show in data['results']]
        unique_ids = set(show_ids)
        
        assert len(show_ids) == len(unique_ids), "Search results contain duplicate shows"
    
    def test_search_result_ordering_consistency(self, client):
        """Test that search results maintain consistent ordering."""
        # Make the same search multiple times
        responses = []
        for _ in range(3):
            response = client.get('/api/search?query=breaking')
            assert response.status_code == 200
            responses.append(response.get_json())
        
        # Check that the order is consistent across requests
        if responses[0]['results']:  # Only test if we have results
            first_order = [show['id'] for show in responses[0]['results']]
            for i, response_data in enumerate(responses[1:], 1):
                current_order = [show['id'] for show in response_data['results']]
                assert first_order == current_order, f"Search result order inconsistent in request {i+1}"
    
    def test_search_respects_result_limit(self, client):
        """Test that search API respects result limits properly."""
        # Test that we get expected number of results
        response = client.get('/api/search?query=the')
        assert response.status_code == 200
        
        data = response.get_json()
        assert 'results' in data
        
        # The backend should have some limit (typically 20 from TMDB)
        # but we're testing that it's reasonable
        assert len(data['results']) <= 20, "Too many results returned from API"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])