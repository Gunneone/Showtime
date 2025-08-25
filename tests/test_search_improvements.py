"""
Test search functionality improvements.
Tests the quick search debounce, request ordering, and caching.
"""

import pytest
import time
from services.search_cache_service import SearchCacheService


class TestSearchCacheService:
    """Test the search cache service."""
    
    def test_cache_basic_operations(self):
        """Test basic cache get/set operations."""
        cache = SearchCacheService()
        cache.clear()  # Start with empty cache
        
        # Test empty cache
        result = cache.get("test")
        assert result is None
        
        # Test setting and getting data
        test_data = {"results": [{"id": 1, "name": "Test Show"}]}
        cache.set("test", test_data)
        
        result = cache.get("test")
        assert result == test_data
    
    def test_cache_case_insensitive(self):
        """Test case insensitive cache matching."""
        cache = SearchCacheService()
        cache.clear()
        
        test_data = {"results": [{"id": 1, "name": "Test Show"}]}
        
        # Set with lowercase
        cache.set("test show", test_data)
        
        # Get with different cases
        assert cache.get("test show") == test_data
        assert cache.get("Test Show") == test_data
        assert cache.get("TEST SHOW") == test_data
        assert cache.get("TeSt ShOw") == test_data
    
    def test_cache_different_queries(self):
        """Test caching different queries."""
        cache = SearchCacheService()
        cache.clear()
        
        data1 = {"results": [{"id": 1, "name": "Show 1"}]}
        data2 = {"results": [{"id": 2, "name": "Show 2"}]}
        
        cache.set("query1", data1)
        cache.set("query2", data2)
        
        assert cache.get("query1") == data1
        assert cache.get("query2") == data2
        assert cache.size() == 2
    
    def test_cache_cleanup(self):
        """Test cache cleanup functionality."""
        cache = SearchCacheService()
        cache.clear()
        
        # Add some data
        cache.set("test1", {"data": "1"})
        cache.set("test2", {"data": "2"})
        
        assert cache.size() == 2
        
        # Clear cache
        cache.clear()
        
        assert cache.size() == 0
        assert cache.get("test1") is None
        assert cache.get("test2") is None


class TestSearchAPI:
    """Test the search API with caching."""
    
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
    
    def test_search_endpoint_exists(self, client):
        """Test that the search endpoint exists and returns data."""
        response = client.get('/api/search?query=test')
        assert response.status_code == 200
        
        data = response.get_json()
        assert 'results' in data
        assert 'page' in data
    
    def test_search_endpoint_cache_behavior(self, client):
        """Test that repeated searches use cache."""
        # First request - should be cache miss
        response1 = client.get('/api/search?query=testcache')
        assert response1.status_code == 200
        data1 = response1.get_json()
        
        # Second request - should be cache hit (same data)
        response2 = client.get('/api/search?query=testcache')
        assert response2.status_code == 200
        data2 = response2.get_json()
        
        # Data should be identical
        assert data1 == data2
    
    def test_search_endpoint_case_insensitive_cache(self, client):
        """Test that cache works case-insensitively."""
        # First request with lowercase
        response1 = client.get('/api/search?query=cachetest')
        assert response1.status_code == 200
        data1 = response1.get_json()
        
        # Second request with uppercase
        response2 = client.get('/api/search?query=CACHETEST')
        assert response2.status_code == 200
        data2 = response2.get_json()
        
        # Data should be identical (cache hit)
        assert data1 == data2
    
    def test_search_endpoint_requires_query(self, client):
        """Test that search endpoint requires query parameter."""
        response = client.get('/api/search')
        assert response.status_code == 400
        
        data = response.get_json()
        assert 'error' in data


def test_frontend_request_sequencing():
    """Test the frontend request sequencing logic."""
    # Simulate the request ID tracking from frontend
    search_request_id = 0
    
    def simulate_search_request(query):
        nonlocal search_request_id
        request_id = search_request_id + 1
        search_request_id = request_id
        return request_id
    
    # Simulate rapid typing scenario
    req1 = simulate_search_request("s")
    req2 = simulate_search_request("sc") 
    req3 = simulate_search_request("scr")
    req4 = simulate_search_request("scrub")
    req5 = simulate_search_request("scrubs")
    
    # Verify request IDs are increasing
    assert req1 < req2 < req3 < req4 < req5
    
    # Verify latest request has highest ID
    assert req5 == search_request_id
    
    # Test that we would only show results for the latest request
    latest_request_id = search_request_id
    
    # Simulate old response coming back
    old_request_id = req2
    should_show_old = old_request_id == latest_request_id
    assert not should_show_old  # Should ignore old response
    
    # Simulate latest response coming back 
    should_show_latest = req5 == latest_request_id
    assert should_show_latest  # Should show latest response


if __name__ == "__main__":
    pytest.main([__file__, "-v"])