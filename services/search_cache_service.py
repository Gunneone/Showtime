"""
Search cache service for caching TMDB search results.
Keeps cached results for 7 days to reduce API calls.
"""

import json
import time
from typing import Optional, Dict, Any


class SearchCacheService:
    """Simple in-memory cache for search results."""
    
    def __init__(self):
        self._cache: Dict[str, Dict[str, Any]] = {}
        self._cache_duration = 7 * 24 * 60 * 60  # 7 days in seconds
    
    def _normalize_query(self, query: str) -> str:
        """Normalize query to lowercase for case-insensitive matching."""
        return query.strip().lower()
    
    def get(self, query: str) -> Optional[Dict[str, Any]]:
        """
        Get cached search result for a query.
        
        Args:
            query: The search query
            
        Returns:
            Cached result if found and not expired, None otherwise
        """
        normalized_query = self._normalize_query(query)
        
        if normalized_query not in self._cache:
            return None
        
        cache_entry = self._cache[normalized_query]
        
        # Check if cache entry is expired
        if time.time() - cache_entry['timestamp'] > self._cache_duration:
            # Remove expired entry
            del self._cache[normalized_query]
            return None
        
        return cache_entry['data']
    
    def set(self, query: str, data: Dict[str, Any]) -> None:
        """
        Store search result in cache.
        
        Args:
            query: The search query
            data: The search result data to cache
        """
        normalized_query = self._normalize_query(query)
        
        self._cache[normalized_query] = {
            'data': data,
            'timestamp': time.time()
        }
    
    def cleanup_expired(self) -> int:
        """
        Remove all expired cache entries.
        
        Returns:
            Number of entries removed
        """
        current_time = time.time()
        expired_keys = []
        
        for key, entry in self._cache.items():
            if current_time - entry['timestamp'] > self._cache_duration:
                expired_keys.append(key)
        
        for key in expired_keys:
            del self._cache[key]
        
        return len(expired_keys)
    
    def clear(self) -> None:
        """Clear all cache entries."""
        self._cache.clear()
    
    def size(self) -> int:
        """Get the number of cached entries."""
        return len(self._cache)


# Global cache instance
_search_cache = SearchCacheService()


def get_search_cache() -> SearchCacheService:
    """Get the global search cache instance."""
    return _search_cache