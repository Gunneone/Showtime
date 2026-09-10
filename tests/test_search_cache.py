import sqlite3

# --- Search cache retention ---------------------------------------------------

def _temp_cache(tmp_path):
    from src.services.persistent_cache_service import PersistentCacheService
    return PersistentCacheService(str(tmp_path / 'cache.db'))


def test_search_cache_returns_fresh_entry(tmp_path):
    """A recently stored search result is served from cache."""
    cache = _temp_cache(tmp_path)
    payload = {'results': [{'id': 1, 'name': 'Breaking Bad'}], 'total_results': 1}

    cache.set_search_results('breaking bad', payload)

    assert cache.get_search_results('breaking bad') == payload


def test_search_cache_expires_entry_past_ttl(tmp_path):
    """An entry older than the retention window is discarded, not served."""
    import time
    cache = _temp_cache(tmp_path)
    payload = {'results': [{'id': 1, 'name': 'Breaking Bad'}], 'total_results': 1}

    cache.set_search_results('breaking bad', payload)

    # Age both layers past the 7-day window
    stale = time.time() - cache.cache_duration - 60
    cache.search_memory_cache.set('breaking bad', payload, stale)
    with sqlite3.connect(cache.db_path) as conn:
        conn.execute('UPDATE search_cache SET timestamp = ?', (stale,))
        conn.commit()

    assert cache.get_search_results('breaking bad') is None


def test_search_cache_expires_memory_layer_independently(tmp_path):
    """A stale in-memory entry is not served even while the DB row is fresh."""
    import time
    cache = _temp_cache(tmp_path)
    payload = {'results': [{'id': 1, 'name': 'Lost'}], 'total_results': 1}

    cache.set_search_results('lost', payload)
    cache.search_memory_cache.set('lost', payload, time.time() - cache.cache_duration - 60)

    # Falls through to the still-fresh database row
    assert cache.get_search_results('lost') == payload


def test_empty_search_results_expire_quickly(tmp_path):
    """Zero-result responses use the short retention window."""
    import time
    cache = _temp_cache(tmp_path)
    empty = {'results': [], 'total_results': 0}

    cache.set_search_results('breking bad', empty)
    assert cache.get_search_results('breking bad') == empty

    stale = time.time() - cache.empty_cache_duration - 60
    cache.search_memory_cache.set('breking bad', empty, stale)
    with sqlite3.connect(cache.db_path) as conn:
        conn.execute('UPDATE search_cache SET timestamp = ?', (stale,))
        conn.commit()

    assert cache.get_search_results('breking bad') is None


def test_search_cache_is_scoped_per_page(tmp_path):
    """Different result pages of the same query do not overwrite each other."""
    cache = _temp_cache(tmp_path)
    page1 = {'results': [{'id': 1}], 'page': 1}
    page2 = {'results': [{'id': 2}], 'page': 2}

    cache.set_search_results('lost', page1, 1)
    cache.set_search_results('lost', page2, 2)

    assert cache.get_search_results('lost', 1) == page1
    assert cache.get_search_results('lost', 2) == page2


def test_season_cache_expires_past_ttl(tmp_path):
    """Season data is also subject to the retention window."""
    import time
    cache = _temp_cache(tmp_path)
    cache.set_season_data(1396, {'total_seasons': 5, 'released_seasons_count': 5})

    stale = time.time() - cache.cache_duration - 60
    cache.season_memory_cache.set('1396', {'total_seasons': 5}, stale)
    with sqlite3.connect(cache.db_path) as conn:
        conn.execute('UPDATE season_cache SET timestamp = ?', (stale,))
        conn.commit()

    assert cache.get_season_data(1396) is None

