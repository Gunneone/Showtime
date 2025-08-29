"""
Search cache service for caching TMDB search results.
Keeps cached results for 7 days to reduce API calls.
Now uses persistent SQLite storage with in-memory LRU cache layer.
"""

from .persistent_cache_service import get_persistent_cache
from typing import Optional, Dict, Any


class SearchCacheService:
    """Search cache service using persistent storage."""
    
    def __init__(self):
        self.persistent_cache = get_persistent_cache()
    
    def get(self, query: str) -> Optional[Dict[str, Any]]:
        """
        Get cached search result for a query.
        
        Args:
            query: The search query
            
        Returns:
            Cached result if found and not expired, None otherwise
        """
        return self.persistent_cache.get_search_results(query)
    
    def set(self, query: str, data: Dict[str, Any]) -> None:
        """
        Store search result in cache.
        
        Args:
            query: The search query
            data: The search result data to cache
        """
        self.persistent_cache.set_search_results(query, data)
    
    def cleanup_expired(self) -> int:
        """
        Remove all expired cache entries.
        
        Returns:
            Number of entries removed
        """
        return self.persistent_cache.cleanup_expired()
    
    def clear(self) -> None:
        """Clear all cache entries."""
        self.persistent_cache.clear_all()
    
    def size(self) -> int:
        """Get cache size (total entries for backward compatibility)."""
        stats = self.persistent_cache.get_cache_stats()
        search_stats = stats.get('search_cache', {})
        return search_stats.get('db_entries', 0)
    
    def get_detailed_stats(self) -> Dict[str, int]:
        """Get detailed cache size statistics."""
        stats = self.persistent_cache.get_cache_stats()
        return {
            'memory_entries': stats.get('search_cache', {}).get('memory_entries', 0),
            'db_entries': stats.get('search_cache', {}).get('db_entries', 0)
        }


# Global cache instance
_search_cache = SearchCacheService()


def get_search_cache() -> SearchCacheService:
    """Get the global search cache instance."""
    return _search_cache