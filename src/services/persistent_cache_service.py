"""
Persistent cache service using SQLite with in-memory LRU cache layer.
Provides caching for search queries, show season data, and per-show
recommendations with 7-day retention.
"""

import sqlite3
import json
import time
import threading
import os
import schedule
from typing import Optional, Dict, Any, List
from collections import OrderedDict


class LRUCache:
    """Simple LRU cache implementation for memory layer.

    Entries are stored alongside the timestamp they were written at, so callers
    can apply the same expiry rules they apply to the SQLite layer.
    """

    def __init__(self, max_size: int = 1000):
        self.max_size = max_size
        self.cache: OrderedDict = OrderedDict()

    def get(self, key: str) -> Optional[tuple]:
        """Get a (value, timestamp) pair, moving it to end (most recently used)."""
        if key in self.cache:
            # Move to end (most recently used)
            self.cache.move_to_end(key)
            return self.cache[key]
        return None

    def set(self, key: str, value: Any, timestamp: Optional[float] = None) -> None:
        """Set item in cache, evicting oldest if necessary."""
        entry = (value, time.time() if timestamp is None else timestamp)
        if key in self.cache:
            # Update existing item and move to end
            self.cache[key] = entry
            self.cache.move_to_end(key)
        else:
            # Add new item
            self.cache[key] = entry
            if len(self.cache) > self.max_size:
                # Remove oldest item
                self.cache.popitem(last=False)

    def delete(self, key: str) -> None:
        """Remove a single item if present."""
        self.cache.pop(key, None)

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
        # Empty search results are usually a typo or a show TMDB has not indexed
        # yet, so they get a much shorter life than a real result set.
        self.empty_cache_duration = 60 * 60  # 1 hour in seconds
        self.memory_cache_size = memory_cache_size
        self.lock = threading.Lock()
        
        # In-memory LRU caches
        self.search_memory_cache = LRUCache(memory_cache_size)
        self.season_memory_cache = LRUCache(memory_cache_size)
        self.recommendation_memory_cache = LRUCache(memory_cache_size)
        
        # Initialize database
        self._init_database()
        
        # Start daily scheduler for cleanup at 4 AM
        self._start_scheduler()
    
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
            
            conn.execute('''
                CREATE TABLE IF NOT EXISTS recommendation_cache (
                    show_id INTEGER PRIMARY KEY,
                    recommendations TEXT NOT NULL,
                    timestamp REAL NOT NULL
                )
            ''')

            # Create indexes for better query performance
            conn.execute('CREATE INDEX IF NOT EXISTS idx_search_timestamp ON search_cache(timestamp)')
            conn.execute('CREATE INDEX IF NOT EXISTS idx_season_timestamp ON season_cache(timestamp)')
            conn.execute('CREATE INDEX IF NOT EXISTS idx_recommendation_timestamp ON recommendation_cache(timestamp)')

            conn.commit()
    
    def _normalize_query(self, query: str, page: int = 1) -> str:
        """Normalize a query into a cache key, scoped to its result page."""
        normalized = query.strip().lower()
        return normalized if page == 1 else f"{normalized}\x1fp{page}"

    def _ttl_for(self, results: Any) -> int:
        """Pick the retention window for a payload (empty results expire fast)."""
        if isinstance(results, dict) and not results.get('results'):
            return self.empty_cache_duration
        return self.cache_duration

    def _is_expired(self, results: Any, timestamp: float) -> bool:
        """Check whether a cached payload has outlived its retention window."""
        return (time.time() - timestamp) > self._ttl_for(results)

    def get_search_results(self, query: str, page: int = 1) -> Optional[Dict[str, Any]]:
        """
        Get cached search results for a query.
        Checks memory cache first, then SQLite. Expired entries are discarded.
        """
        normalized_query = self._normalize_query(query, page)

        # Check memory cache first
        cached_entry = self.search_memory_cache.get(normalized_query)
        if cached_entry is not None:
            cached_result, cached_at = cached_entry
            if not self._is_expired(cached_result, cached_at):
                return cached_result
            self.search_memory_cache.delete(normalized_query)

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
                        results = json.loads(results_json)

                        if self._is_expired(results, timestamp):
                            conn.execute('DELETE FROM search_cache WHERE query = ?', (normalized_query,))
                            conn.commit()
                            return None

                        # Parse and cache in memory
                        self.search_memory_cache.set(normalized_query, results, timestamp)
                        return results

            except (sqlite3.Error, json.JSONDecodeError) as e:
                print(f"Error reading search cache: {e}")
                return None

        return None

    def set_search_results(self, query: str, results: Dict[str, Any], page: int = 1) -> None:
        """
        Store search results in cache.
        Stores in both memory and SQLite.
        """
        normalized_query = self._normalize_query(query, page)
        current_time = time.time()

        # Store in memory cache
        self.search_memory_cache.set(normalized_query, results, current_time)

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
            except (sqlite3.Error, TypeError) as e:
                print(f"Error writing search cache: {e}")
    
    def get_season_data(self, show_id: int) -> Optional[Dict[str, Any]]:
        """
        Get cached season data for a show.
        Checks memory cache first, then SQLite.
        """
        # Check memory cache first
        cached_entry = self.season_memory_cache.get(str(show_id))
        if cached_entry is not None:
            cached_data, cached_at = cached_entry
            if (time.time() - cached_at) <= self.cache_duration:
                return cached_data
            self.season_memory_cache.delete(str(show_id))

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

                        if (time.time() - timestamp) > self.cache_duration:
                            conn.execute('DELETE FROM season_cache WHERE show_id = ?', (show_id,))
                            conn.commit()
                            return None

                        # Parse and cache in memory
                        season_data = json.loads(season_data_json)
                        self.season_memory_cache.set(str(show_id), season_data, timestamp)
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
        self.season_memory_cache.set(str(show_id), season_data, current_time)

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
            except (sqlite3.Error, TypeError) as e:
                print(f"Error writing season cache: {e}")
    
    def get_recommendations(self, show_id: int) -> Optional[List[Dict[str, Any]]]:
        """
        Get cached recommendations for a show.
        Checks memory cache first, then SQLite.
        """
        # Check memory cache first
        cached_entry = self.recommendation_memory_cache.get(str(show_id))
        if cached_entry is not None:
            cached_data, cached_at = cached_entry
            if (time.time() - cached_at) <= self.cache_duration:
                return cached_data
            self.recommendation_memory_cache.delete(str(show_id))

        # Check SQLite database
        with self.lock:
            try:
                with sqlite3.connect(self.db_path) as conn:
                    cursor = conn.execute(
                        'SELECT recommendations, timestamp FROM recommendation_cache WHERE show_id = ?',
                        (show_id,)
                    )
                    row = cursor.fetchone()

                    if row:
                        recommendations_json, timestamp = row

                        if (time.time() - timestamp) > self.cache_duration:
                            conn.execute('DELETE FROM recommendation_cache WHERE show_id = ?', (show_id,))
                            conn.commit()
                            return None

                        # Parse and cache in memory
                        recommendations = json.loads(recommendations_json)
                        self.recommendation_memory_cache.set(str(show_id), recommendations, timestamp)
                        return recommendations

            except (sqlite3.Error, json.JSONDecodeError) as e:
                print(f"Error reading recommendation cache: {e}")
                return None

        return None

    def set_recommendations(self, show_id: int, recommendations: List[Dict[str, Any]]) -> None:
        """
        Store recommendations for a show in cache.
        Stores in both memory and SQLite.
        """
        current_time = time.time()

        # Store in memory cache
        self.recommendation_memory_cache.set(str(show_id), recommendations, current_time)

        # Store in SQLite database
        with self.lock:
            try:
                recommendations_json = json.dumps(recommendations)
                with sqlite3.connect(self.db_path) as conn:
                    conn.execute(
                        'INSERT OR REPLACE INTO recommendation_cache (show_id, recommendations, timestamp) VALUES (?, ?, ?)',
                        (show_id, recommendations_json, current_time)
                    )
                    conn.commit()
            except (sqlite3.Error, TypeError) as e:
                print(f"Error writing recommendation cache: {e}")

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
                        'SELECT COUNT(*) FROM season_cache WHERE timestamp < ? UNION ALL '
                        'SELECT COUNT(*) FROM recommendation_cache WHERE timestamp < ?',
                        (cutoff_time, cutoff_time, cutoff_time)
                    )
                    results = cursor.fetchall()
                    total_expired = sum(row[0] for row in results)

                    # Remove expired entries
                    conn.execute('DELETE FROM search_cache WHERE timestamp < ?', (cutoff_time,))
                    conn.execute('DELETE FROM season_cache WHERE timestamp < ?', (cutoff_time,))
                    conn.execute('DELETE FROM recommendation_cache WHERE timestamp < ?', (cutoff_time,))
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
        self.recommendation_memory_cache.clear()

        # Clear SQLite database
        with self.lock:
            try:
                with sqlite3.connect(self.db_path) as conn:
                    conn.execute('DELETE FROM search_cache')
                    conn.execute('DELETE FROM season_cache')
                    conn.execute('DELETE FROM recommendation_cache')
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

                    cursor = conn.execute('SELECT COUNT(*) FROM recommendation_cache')
                    recommendation_count = cursor.fetchone()[0]

                    return {
                        'search_cache': {
                            'memory_entries': self.search_memory_cache.size(),
                            'db_entries': search_count
                        },
                        'season_cache': {
                            'memory_entries': self.season_memory_cache.size(),
                            'db_entries': season_count
                        },
                        'recommendation_cache': {
                            'memory_entries': self.recommendation_memory_cache.size(),
                            'db_entries': recommendation_count
                        }
                    }
            except sqlite3.Error as e:
                print(f"Error getting cache stats: {e}")
                return {}
    
    def _start_scheduler(self) -> None:
        """Start the daily cleanup scheduler to run at 4 AM."""
        schedule.every().day.at("04:00").do(self._run_cleanup)
        
        # Start scheduler in a daemon thread
        def run_scheduler():
            while True:
                schedule.run_pending()
                time.sleep(60)  # Check every minute
        
        scheduler_thread = threading.Thread(target=run_scheduler, daemon=True)
        scheduler_thread.start()
    
    def _run_cleanup(self) -> None:
        """Run the cleanup task and log results."""
        try:
            removed_count = self.cleanup_expired()
            print(f"Daily cache cleanup completed: {removed_count} expired entries removed")
        except Exception as e:
            print(f"Error during daily cache cleanup: {e}")


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