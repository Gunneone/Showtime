"""Shared test fixtures.

Every test runs against a throwaway cache database. Without this the module
level singletons in ``persistent_cache_service`` and ``search_cache_service``
point at the real ``src/cache.db``, so rows written by one run are still there
on the next one and tests that expect a cold cache only pass once.
"""

import pytest

from src.services import persistent_cache_service, search_cache_service
from src.services.persistent_cache_service import PersistentCacheService


@pytest.fixture(autouse=True)
def isolated_cache(tmp_path, monkeypatch):
    """Point every cache consumer at a per-test SQLite database."""
    # The daily cleanup job is not under test and would otherwise register a
    # schedule entry and a thread for every cache instance the suite builds.
    monkeypatch.setattr(PersistentCacheService, '_start_scheduler', lambda self: None)

    cache = PersistentCacheService(str(tmp_path / 'cache.db'))

    persistent_cache_service._cache_service = cache
    search_cache_service._search_cache = None
    try:
        yield cache
    finally:
        persistent_cache_service._cache_service = None
        search_cache_service._search_cache = None
