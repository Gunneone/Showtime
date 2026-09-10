from src.services.tmdb_service import TMDBService

def test_tmdb_service_episode_runtimes():
    """Test TMDB service can fetch episode runtime data."""
    service = TMDBService()
    service.use_mock_data_for_testing()  # Enable mock data for testing
    
    # Test with mock data (show ID 1 = Breaking Bad, should have 2 seasons of mock data)
    episode_runtimes = service.get_show_episode_runtimes(1, 2)
    
    # Should return episode runtimes for seasons 1 and 2
    assert 1 in episode_runtimes
    assert 2 in episode_runtimes
    
    # Season 1 should have 7 episodes with specific runtimes
    season_1_runtimes = episode_runtimes[1]
    assert len(season_1_runtimes) == 7
    assert season_1_runtimes[0] == 58  # Pilot episode
    assert all(runtime == 48 for runtime in season_1_runtimes[1:])  # Other episodes
    
    # Season 2 should have 13 episodes
    season_2_runtimes = episode_runtimes[2]
    assert len(season_2_runtimes) == 13
    assert all(runtime == 47 for runtime in season_2_runtimes)  # All episodes 47 min

# --- Released season counting -------------------------------------------------

def test_count_released_seasons_ignores_specials_and_stops_at_unaired():
    """Season 0 is skipped and counting stops at the first unaired season."""
    service = TMDBService()
    seasons = [
        {'season_number': 0, 'air_date': '2005-04-27'},   # specials, ignored
        {'season_number': 1, 'air_date': '2004-09-22'},
        {'season_number': 2, 'air_date': '2005-09-21'},
        {'season_number': 3, 'air_date': '2999-01-01'},   # not yet aired
        {'season_number': 4, 'air_date': '2010-02-02'},   # never reached
    ]

    assert service._count_released_seasons(seasons) == 2


def test_count_released_seasons_handles_missing_air_dates():
    """A season with no air date counts as unaired."""
    service = TMDBService()

    assert service._count_released_seasons([{'season_number': 1, 'air_date': None}]) == 0
    assert service._count_released_seasons([]) == 0
    assert service._count_released_seasons(None) == 0


def test_count_released_seasons_ended_show_with_missing_air_dates():
    """An 'Ended' show counts all its seasons even if TMDB left later air dates blank.

    Regression test: TMDB's Naruto entry (id 46260) has 4 seasons, but only
    season 1 carries an air_date - seasons 2-4 are null upstream. The old
    logic stopped counting at season 2 and reported 1 released season.
    """
    service = TMDBService()
    seasons = [
        {'season_number': 1, 'air_date': '2002-10-03'},
        {'season_number': 2, 'air_date': None},
        {'season_number': 3, 'air_date': None},
        {'season_number': 4, 'air_date': None},
    ]

    assert service._count_released_seasons(seasons, show_status='Ended') == 4
    # Without a status (e.g. a still-airing show), a missing date with no
    # later aired season to infer from still stops the count.
    assert service._count_released_seasons(seasons) == 1


def test_count_released_seasons_infers_from_later_aired_season():
    """A missing air_date is treated as released if a later season has aired."""
    service = TMDBService()
    seasons = [
        {'season_number': 1, 'air_date': '2020-01-01'},
        {'season_number': 2, 'air_date': None},
        {'season_number': 3, 'air_date': '2021-01-01'},
    ]

    assert service._count_released_seasons(seasons) == 3


def test_released_seasons_count_uses_a_single_request(monkeypatch, tmp_path):
    """The season count comes from one show-details call, not one call per season."""
    from src.services.persistent_cache_service import PersistentCacheService
    service = TMDBService()
    service.persistent_cache = PersistentCacheService(str(tmp_path / 'cache.db'))

    calls = []

    def fake_request(endpoint, params=None):
        calls.append(endpoint)
        return {
            'id': 4607,
            'name': 'Lost',
            'number_of_seasons': 6,
            'seasons': [
                {'season_number': 0, 'air_date': '2005-04-27'},
                {'season_number': 1, 'air_date': '2004-09-22'},
                {'season_number': 2, 'air_date': '2005-09-21'},
                {'season_number': 3, 'air_date': '2006-10-04'},
            ],
        }

    monkeypatch.setattr(service, '_make_request', fake_request)

    assert service.get_released_seasons_count(4607, 6) == 3
    assert calls == ['tv/4607']


# --- Typo fallback ------------------------------------------------------------

def test_relaxed_queries_trim_and_drop_tokens():
    """Relaxed variants trim word tails and drop whole words."""
    service = TMDBService()
    variants = service._relaxed_queries('breking bad')

    assert 'bad' in variants          # dropping the misspelled word
    assert 'brekin' in variants       # trimming the misspelled word
    assert 'breking bad' not in variants
    assert all(len(v) >= 3 for v in variants)


def test_relaxed_queries_for_single_token():
    """A one-word query is relaxed by trimming its tail."""
    service = TMDBService()
    variants = service._relaxed_queries('seinfled')

    assert 'seinfl' in variants
    assert all(len(v) >= 4 for v in variants)


def test_rank_by_similarity_prefers_the_closest_title():
    """Ranking puts the nearest title first even when it is less popular."""
    service = TMDBService()
    shows = [
        {'name': 'Big Bad BeetleBorgs', 'popularity': 200},
        {'name': 'Breaking Bad', 'popularity': 150},
    ]

    assert service._rank_by_similarity('breking bad', shows)[0]['name'] == 'Breaking Bad'

