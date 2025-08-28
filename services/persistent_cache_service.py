"""
Persistent cache service using SQLite with in-memory LRU cache layer.
Provides caching for search queries and show season data with 7-day retention.
"""

import sqlite3
import json
import time
import threading
import os
from typing import Optional, Dict, Any, List
from collections import OrderedDict


class LRUCache:
    """Simple LRU cache implementation for memory layer."""
    
    def __init__(self, max_size: int = 1000):
        self.max_size = max_size
        self.cache: OrderedDict = OrderedDict()
    
    def get(self, key: str) -> Optional[Any]:
        """Get item from cache, moving it to end (most recently used)."""
        if key in self.cache:
            # Move to end (most recently used)
            self.cache.move_to_end(key)
            return self.cache[key]
        return None
    
    def set(self, key: str, value: Any) -> None:
        """Set item in cache, evicting oldest if necessary."""
        if key in self.cache:
            # Update existing item and move to end
            self.cache[key] = value
            self.cache.move_to_end(key)
        else:
            # Add new item
            self.cache[key] = value
            if len(self.cache) > self.max_size:
                # Remove oldest item
                self.cache.popitem(last=False)
    
    def clear(self) -> None:
        """Clear all items from cache."""
        self.cache.clear()
    
    def size(self) -> int:
        """Get current cache size."""
        return len(self.cache)


class PersistentCacheService:
    """Persistent cache service with SQLite backend and memory LRU layer."""
    
    def __init__(self, db_path: str = "cache.db", memory_cache_size: int = 1000):
        self.db_path = db_path
        self.cache_duration = 7 * 24 * 60 * 60  # 7 days in seconds
        self.memory_cache_size = memory_cache_size
        self.lock = threading.Lock()
        
        # In-memory LRU caches
        self.search_memory_cache = LRUCache(memory_cache_size)
        self.season_memory_cache = LRUCache(memory_cache_size)
        
        # Initialize database
        self._init_database()
        
        # Schedule daily cleanup (in a real app, this would be handled by a scheduler)
        self._schedule_cleanup()
    
    def _init_database(self) -> None:
        """Initialize SQLite database with required tables."""
        with sqlite3.connect(self.db_path) as conn:
            conn.execute('''
                CREATE TABLE IF NOT EXISTS search_cache (
                    query TEXT PRIMARY KEY,
                    results TEXT NOT NULL,
                    timestamp REAL NOT NULL
                )
            ''')
            
            conn.execute('''
                CREATE TABLE IF NOT EXISTS season_cache (
                    show_id INTEGER PRIMARY KEY,
                    season_data TEXT NOT NULL,
                    timestamp REAL NOT NULL
                )
            ''')
            
            # Create indexes for better query performance
            conn.execute('CREATE INDEX IF NOT EXISTS idx_search_timestamp ON search_cache(timestamp)')
            conn.execute('CREATE INDEX IF NOT EXISTS idx_season_timestamp ON season_cache(timestamp)')
            
            conn.commit()
    
    def _normalize_query(self, query: str) -> str:
        """Normalize query to lowercase for case-insensitive matching."""
        return query.strip().lower()
    
    def get_search_results(self, query: str) -> Optional[Dict[str, Any]]:
        """
        Get cached search results for a query.
        Checks memory cache first, then SQLite.
        """
        normalized_query = self._normalize_query(query)
        
        # Check memory cache first
        cached_result = self.search_memory_cache.get(normalized_query)
        if cached_result is not None:
            return cached_result
        
        # Check SQLite database
        with self.lock:
            try:
                with sqlite3.connect(self.db_path) as conn:
                    cursor = conn.execute(
                        'SELECT results, timestamp FROM search_cache WHERE query = ?',
                        (normalized_query,)
                    )
                    row = cursor.fetchone()
                    
                    if row:
                        results_json, timestamp = row
                        
                        # Check if cache entry is expired
                        if time.time() - timestamp > self.cache_duration:
                            # Remove expired entry
                            conn.execute('DELETE FROM search_cache WHERE query = ?', (normalized_query,))
                            conn.commit()
                            return None
                        
                        # Parse and cache in memory
                        results = json.loads(results_json)
                        self.search_memory_cache.set(normalized_query, results)
                        return results
                        
            except (sqlite3.Error, json.JSONDecodeError) as e:
                print(f"Error reading search cache: {e}")
                return None
        
        return None
    
    def set_search_results(self, query: str, results: Dict[str, Any]) -> None:
        """
        Store search results in cache.
        Stores in both memory and SQLite.
        """
        normalized_query = self._normalize_query(query)
        current_time = time.time()
        
        # Store in memory cache
        self.search_memory_cache.set(normalized_query, results)
        
        # Store in SQLite database
        with self.lock:
            try:
                results_json = json.dumps(results)
                with sqlite3.connect(self.db_path) as conn:
                    conn.execute(
                        'INSERT OR REPLACE INTO search_cache (query, results, timestamp) VALUES (?, ?, ?)',
                        (normalized_query, results_json, current_time)
                    )
                    conn.commit()
            except (sqlite3.Error, json.JSONEncodeError) as e:
                print(f"Error writing search cache: {e}")
    
    def get_season_data(self, show_id: int) -> Optional[Dict[str, Any]]:
        """
        Get cached season data for a show.
        Checks memory cache first, then SQLite.
        """
        # Check memory cache first
        cached_data = self.season_memory_cache.get(str(show_id))
        if cached_data is not None:
            return cached_data
        
        # Check SQLite database
        with self.lock:
            try:
                with sqlite3.connect(self.db_path) as conn:
                    cursor = conn.execute(
                        'SELECT season_data, timestamp FROM season_cache WHERE show_id = ?',
                        (show_id,)
                    )
                    row = cursor.fetchone()
                    
                    if row:
                        season_data_json, timestamp = row
                        
                        # Check if cache entry is expired
                        if time.time() - timestamp > self.cache_duration:
                            # Remove expired entry
                            conn.execute('DELETE FROM season_cache WHERE show_id = ?', (show_id,))
                            conn.commit()
                            return None
                        
                        # Parse and cache in memory
                        season_data = json.loads(season_data_json)
                        self.season_memory_cache.set(str(show_id), season_data)
                        return season_data
                        
            except (sqlite3.Error, json.JSONDecodeError) as e:
                print(f"Error reading season cache: {e}")
                return None
        
        return None
    
    def set_season_data(self, show_id: int, season_data: Dict[str, Any]) -> None:
        """
        Store season data in cache.
        Stores in both memory and SQLite.
        """
        current_time = time.time()
        
        # Store in memory cache
        self.season_memory_cache.set(str(show_id), season_data)
        
        # Store in SQLite database
        with self.lock:
            try:
                season_data_json = json.dumps(season_data)
                with sqlite3.connect(self.db_path) as conn:
                    conn.execute(
                        'INSERT OR REPLACE INTO season_cache (show_id, season_data, timestamp) VALUES (?, ?, ?)',
                        (show_id, season_data_json, current_time)
                    )
                    conn.commit()
            except (sqlite3.Error, json.JSONEncodeError) as e:
                print(f"Error writing season cache: {e}")
    
    def cleanup_expired(self) -> int:
        """
        Remove all expired cache entries from SQLite.
        Returns the number of entries removed.
        """
        current_time = time.time()
        cutoff_time = current_time - self.cache_duration
        
        with self.lock:
            try:
                with sqlite3.connect(self.db_path) as conn:
                    # Count expired entries
                    cursor = conn.execute(
                        'SELECT COUNT(*) FROM search_cache WHERE timestamp < ? UNION ALL '
                        'SELECT COUNT(*) FROM season_cache WHERE timestamp < ?',
                        (cutoff_time, cutoff_time)
                    )
                    results = cursor.fetchall()
                    total_expired = sum(row[0] for row in results)
                    
                    # Remove expired entries
                    conn.execute('DELETE FROM search_cache WHERE timestamp < ?', (cutoff_time,))
                    conn.execute('DELETE FROM season_cache WHERE timestamp < ?', (cutoff_time,))
                    conn.commit()
                    
                    return total_expired
                    
            except sqlite3.Error as e:
                print(f"Error during cache cleanup: {e}")
                return 0
    
    def clear_all(self) -> None:
        """Clear all cache entries from both memory and SQLite."""
        # Clear memory caches
        self.search_memory_cache.clear()
        self.season_memory_cache.clear()
        
        # Clear SQLite database
        with self.lock:
            try:
                with sqlite3.connect(self.db_path) as conn:
                    conn.execute('DELETE FROM search_cache')
                    conn.execute('DELETE FROM season_cache')
                    conn.commit()
            except sqlite3.Error as e:
                print(f"Error clearing cache: {e}")
    
    def get_cache_stats(self) -> Dict[str, Any]:
        """Get cache statistics."""
        with self.lock:
            try:
                with sqlite3.connect(self.db_path) as conn:
                    cursor = conn.execute('SELECT COUNT(*) FROM search_cache')
                    search_count = cursor.fetchone()[0]
                    
                    cursor = conn.execute('SELECT COUNT(*) FROM season_cache')
                    season_count = cursor.fetchone()[0]
                    
                    return {
                        'search_cache': {
                            'memory_entries': self.search_memory_cache.size(),
                            'db_entries': search_count
                        },
                        'season_cache': {
                            'memory_entries': self.season_memory_cache.size(),
                            'db_entries': season_count
                        }
                    }
            except sqlite3.Error as e:
                print(f"Error getting cache stats: {e}")
                return {}
    
    def _schedule_cleanup(self) -> None:
        """
        Schedule daily cleanup of expired entries.
        In a production environment, this would be handled by a proper scheduler.
        """
        # For now, we'll just run cleanup on initialization
        # In a real application, you'd use APScheduler or similar
        self.cleanup_expired()


# Global cache service instance
_cache_service = None


def get_persistent_cache() -> PersistentCacheService:
    """Get the global persistent cache service instance."""
    global _cache_service
    if _cache_service is None:
        # Create cache in the app directory
        cache_db_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'cache.db')
        _cache_service = PersistentCacheService(cache_db_path)
    return _cache_service