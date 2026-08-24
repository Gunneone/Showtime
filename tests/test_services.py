import pytest
import sqlite3
from src.services.calculation_service import CalculationService
from src.services.tmdb_service import TMDBService

def test_calculation_service_init():
    """Test that CalculationService initializes correctly."""
    service = CalculationService()
    assert service is not None

def test_calculate_show_time():
    """Test calculating watch time for a single show."""
    service = CalculationService()
    
    # Test with hardcoded fallback (no episode count data)
    show_no_data = {
        'seasons_watched': 2,
        'episode_run_time': 45
    }
    
    # 2 seasons * 20 episodes/season * 45 minutes = 1800 minutes
    expected_time = 2 * 20 * 45
    actual_time = service.calculate_show_time(show_no_data)
    
    assert actual_time == expected_time

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

def test_precise_episode_calculation():
    """Test precise episode-by-episode runtime calculation."""
    service = CalculationService()
    
    # Test show with precise episode runtime data (like Breaking Bad season 1)
    # Season 1: 7 episodes with actual runtimes: [58, 48, 48, 48, 48, 48, 48]
    # Total: 346 minutes (5h 46m) - much more accurate than 5h 15m from averages
    show_with_precise_data = {
        'seasons_watched': 1,
        'episode_run_time': 47,  # Average runtime (fallback)
        'total_episodes': 62,
        'total_seasons': 5,
        'episode_runtimes': {
            '1': [58, 48, 48, 48, 48, 48, 48]  # Actual episode runtimes for season 1
        }
    }
    
    actual_time = service.calculate_show_time(show_with_precise_data)
    expected_time = 58 + 48 + 48 + 48 + 48 + 48 + 48  # 346 minutes
    
    assert actual_time == expected_time
    
    # Test show with multiple seasons of precise data
    show_multi_season = {
        'seasons_watched': 2,
        'episode_run_time': 47,
        'total_episodes': 62,
        'total_seasons': 5,
        'episode_runtimes': {
            '1': [58, 48, 48, 48, 48, 48, 48],  # Season 1: 346 minutes
            '2': [47, 47, 47, 47, 47, 47, 47, 47, 47, 47, 47, 47, 47]  # Season 2: 611 minutes
        }
    }
    
    actual_multi = service.calculate_show_time(show_multi_season)
    expected_multi = 346 + 611  # 957 minutes
    
    assert actual_multi == expected_multi
    
    # Test show with partial precise data (some seasons have episode data, others don't)
    show_partial_data = {
        'seasons_watched': 2,
        'episode_run_time': 47,
        'total_episodes': 62,
        'total_seasons': 5,
        'episode_runtimes': {
            '1': [58, 48, 48, 48, 48, 48, 48]  # Only season 1 has precise data
            # Season 2 will fall back to average calculation: (62/5) * 47 = 583.6 ≈ 584 minutes
        }
    }
    
    actual_partial = service.calculate_show_time(show_partial_data)
    expected_partial = 346 + int((62/5) * 47)  # 346 + 584 = 930 minutes
    
    assert actual_partial == expected_partial

def test_precise_vs_average_calculation_accuracy():
    """Test that precise calculation is more accurate than average calculation."""
    service = CalculationService()
    
    # The Mandalorian Season 1: 8 episodes with varying runtimes
    # Actual: [39, 32, 37, 40, 33, 43, 40, 48] = 312 minutes (5h 12m)
    # Average would be: 8 episodes * 36 min = 288 minutes (4h 48m)
    mandalorian_precise = {
        'seasons_watched': 1,
        'episode_run_time': 36,
        'total_episodes': 24,
        'total_seasons': 3,
        'episode_runtimes': {
            '1': [39, 32, 37, 40, 33, 43, 40, 48]
        }
    }
    
    mandalorian_average = {
        'seasons_watched': 1,
        'episode_run_time': 36,
        'total_episodes': 24,
        'total_seasons': 3
        # No episode_runtimes - will use average calculation
    }
    
    precise_time = service.calculate_show_time(mandalorian_precise)
    average_time = service.calculate_show_time(mandalorian_average)
    
    expected_precise = 39 + 32 + 37 + 40 + 33 + 43 + 40 + 48  # 312 minutes
    expected_average = int(1 * (24/3) * 36)  # 288 minutes
    
    assert precise_time == expected_precise
    assert average_time == expected_average
    assert precise_time != average_time  # They should be different
    assert abs(precise_time - expected_precise) < abs(average_time - expected_precise)  # Precise is more accurate

def test_fallback_when_episode_runtime_missing():
    """Test fallback behavior when episode runtime data is missing or incomplete."""
    service = CalculationService()
    
    # Test with some episodes missing runtime data (None values)
    show_missing_data = {
        'seasons_watched': 1,
        'episode_run_time': 45,
        'total_episodes': 20,
        'total_seasons': 2,
        'episode_runtimes': {
            '1': [50, None, 48, None, 47]  # Some episodes missing runtime
        }
    }
    
    actual_time = service.calculate_show_time(show_missing_data)
    # Expected: 50 + 45 + 48 + 45 + 47 = 235 minutes (uses fallback 45 for None values)
    expected_time = 50 + 45 + 48 + 45 + 47
    
    assert actual_time == expected_time
    
    # Test with actual episode count data (like Breaking Bad: 62 episodes, 5 seasons)
    show_with_data = {
        'seasons_watched': 1,
        'episode_run_time': 47,
        'total_episodes': 62,
        'total_seasons': 5
    }
    
    # 1 season * (62/5) episodes/season * 47 minutes = 583.6 minutes ≈ 584 minutes
    expected_time_accurate = int(1 * (62/5) * 47)
    actual_time_accurate = service.calculate_show_time(show_with_data)
    
    assert actual_time_accurate == expected_time_accurate
    
    # Test with The Office data (201 episodes, 9 seasons)
    show_office = {
        'seasons_watched': 2,
        'episode_run_time': 22,
        'total_episodes': 201,
        'total_seasons': 9
    }
    
    # 2 seasons * (201/9) episodes/season * 22 minutes = 985.3 minutes ≈ 985 minutes
    expected_time_office = int(2 * (201/9) * 22)
    actual_time_office = service.calculate_show_time(show_office)
    
    assert actual_time_office == expected_time_office

def test_calculate_total_time():
    """Test calculating total time across multiple shows."""
    service = CalculationService()
    
    shows = [
        {'seasons_watched': 1, 'episode_run_time': 45},  # Fallback: 900 minutes
        {
            'seasons_watched': 2, 
            'episode_run_time': 30,
            'total_episodes': 40,
            'total_seasons': 2
        },  # Accurate: 2 * (40/2) * 30 = 1200 minutes
    ]
    
    expected_total = (1 * 20 * 45) + (2 * (40/2) * 30)  # 900 + 1200 = 2100
    actual_total = service.calculate_total_time(shows)
    
    assert actual_total == expected_total

def test_format_time_minutes():
    """Test formatting time in minutes."""
    service = CalculationService()
    
    assert service.format_time(0) == "0h"
    assert service.format_time(30) == "30 minutes"
    assert service.format_time(90) == "1h 30m"
    assert service.format_time(120) == "2h"
    assert service.format_time(1500) == "1d 1h"  # 25 hours
    assert service.format_time(1440) == "1d 0h"  # 24 hours - always show hours

def test_calculate_stats_empty():
    """Test calculating stats with no shows."""
    service = CalculationService()
    
    stats = service.calculate_stats([])
    
    assert stats['total_shows'] == 0
    assert stats['total_seasons'] == 0
    assert stats['total_time_minutes'] == 0
    assert stats['completion_stats']['completed_shows'] == 0

def test_calculate_stats_with_shows():
    """Test calculating stats with shows."""
    service = CalculationService()
    
    shows = [
        {
            'seasons_watched': 2,
            'total_seasons': 3,
            'episode_run_time': 45,
            'genres': [{'name': 'Drama'}],
            'first_air_date': '2020-01-01'
        },
        {
            'seasons_watched': 1,
            'total_seasons': 1,
            'episode_run_time': 30,
            'genres': [{'name': 'Comedy'}],
            'first_air_date': '2021-05-15'
        }
    ]
    
    stats = service.calculate_stats(shows)
    
    assert stats['total_shows'] == 2
    assert stats['total_seasons'] == 3  # 2 + 1 seasons watched
    assert stats['completion_stats']['completed_shows'] == 1  # Second show is complete
    assert stats['completion_stats']['in_progress_shows'] == 1  # First show is in progress

def test_accurate_calculation_with_real_show_data():
    """Test that calculations are more accurate with real TMDB data (fallback method)."""
    service = CalculationService()
    
    # Breaking Bad: 62 episodes, 5 seasons, ~47 min runtime
    breaking_bad_1_season = {
        'seasons_watched': 1,
        'episode_run_time': 47,
        'total_episodes': 62,
        'total_seasons': 5
    }
    
    # The Office: 201 episodes, 9 seasons, ~22 min runtime
    office_1_season = {
        'seasons_watched': 1,
        'episode_run_time': 22,
        'total_episodes': 201,
        'total_seasons': 9
    }
    
    # The Mandalorian: 24 episodes, 3 seasons, ~36 min runtime
    mandalorian_1_season = {
        'seasons_watched': 1,
        'episode_run_time': 36,
        'total_episodes': 24,
        'total_seasons': 3
    }
    
    # Calculate times using average method (no episode_runtimes provided)
    bb_time = service.calculate_show_time(breaking_bad_1_season)
    office_time = service.calculate_show_time(office_1_season)
    mando_time = service.calculate_show_time(mandalorian_1_season)
    
    # Expected: Breaking Bad = 1 * (62/5) * 47 = 583.6 ≈ 582 minutes
    # Expected: The Office = 1 * (201/9) * 22 = 492.7 ≈ 491 minutes  
    # Expected: The Mandalorian = 1 * (24/3) * 36 = 288 minutes
    
    # Old calculation would give all shows: 1 * 20 * runtime = 940, 440, 720 minutes
    # New calculation should be more accurate and different for each show
    
    assert bb_time == 582  # Breaking Bad: ~9.7h instead of 15.7h
    assert office_time == 491  # The Office: ~8.2h instead of 7.3h  
    assert mando_time == 288  # The Mandalorian: ~4.8h instead of 12h
    
    # Verify these are different from the old hardcoded calculation
    old_bb = 1 * 20 * 47  # 940 minutes
    old_office = 1 * 20 * 22  # 440 minutes
    old_mando = 1 * 20 * 36  # 720 minutes
    
    assert bb_time != old_bb
    assert office_time != old_office  
    assert mando_time != old_mando

def test_calculate_awards():
    """Test calculating awards for watched shows."""
    service = CalculationService()
    
    shows = [
        {
            'name': 'Breaking Bad',
            'seasons_watched': 5,
            'total_seasons': 5,
            'total_episodes': 62,
            'episode_run_time': 47,
            'first_air_date': '2008-01-20',
            'popularity': 95.5,
            'backdrop_path': '/breaking_bad_backdrop.jpg'
        },
        {
            'name': 'The Office',
            'seasons_watched': 9,
            'total_seasons': 9,
            'total_episodes': 201,
            'episode_run_time': 22,
            'first_air_date': '2005-03-24',
            'popularity': 78.2,
            'backdrop_path': '/office_backdrop.jpg'
        },
        {
            'name': 'Stranger Things',
            'seasons_watched': 4,
            'total_seasons': 4,
            'total_episodes': 42,
            'episode_run_time': 50,
            'first_air_date': '2016-07-15',
            'popularity': 125.8,
            'backdrop_path': '/stranger_things_backdrop.jpg'
        },
        {
            'name': 'Obscure Show',
            'seasons_watched': 1,
            'total_seasons': 1,
            'total_episodes': 6,
            'episode_run_time': 30,
            'first_air_date': '2022-01-01',
            'popularity': 5.2,
            'backdrop_path': '/obscure_backdrop.jpg'
        }
    ]
    
    awards = service.calculate_awards(shows)
    
    # Test oldest show
    assert awards['oldest_show']['name'] == 'The Office'
    assert awards['oldest_show']['year'] == 2005
    assert awards['oldest_show']['backdrop_path'] == '/office_backdrop.jpg'
    
    # Test most episodes show
    assert awards['most_episodes_show']['name'] == 'The Office'
    assert awards['most_episodes_show']['episodes'] == 201  # 9 seasons * (201/9) episodes per season
    assert awards['most_episodes_show']['backdrop_path'] == '/office_backdrop.jpg'
    
    # Test most watch time show
    assert awards['most_watch_time_show']['name'] == 'The Office'
    assert awards['most_watch_time_show']['backdrop_path'] == '/office_backdrop.jpg'
    
    # Test most obscure show (lowest popularity)
    assert awards['most_obscure_show']['name'] == 'Obscure Show'
    assert awards['most_obscure_show']['popularity'] == 5.2
    assert awards['most_obscure_show']['backdrop_path'] == '/obscure_backdrop.jpg'

def test_calculate_awards_empty():
    """Test calculating awards with no shows."""
    service = CalculationService()
    
    awards = service.calculate_awards([])
    
    assert awards['oldest_show'] is None
    assert awards['most_episodes_show'] is None
    assert awards['most_watch_time_show'] is None
    assert awards['most_obscure_show'] is None

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


# --- Recommendations ----------------------------------------------------------

def _rec_show(show_id, name=None, votes=1000, popularity=0):
    """A show in the shape `_format_search_result` produces."""
    return {
        'id': show_id,
        'name': name or f'Show {show_id}',
        'overview': '',
        'first_air_date': '2020-01-01',
        'poster_path': None,
        'vote_average': 0,
        'vote_count': votes,
        'popularity': popularity,
        'number_of_seasons': None,
        'number_of_released_seasons': None
    }


def _watched(show_id, minutes=100, genres=('Drama',), seasons_watched=2, released_seasons=2):
    """A show in the shape the browser stores it in."""
    return {
        'id': show_id,
        'name': f'Seed {show_id}',
        'seasons_watched': seasons_watched,
        'released_seasons': released_seasons,
        'calculated_runtime_minutes': minutes,
        'genres': list(genres)
    }


def _unfinished(show_id, **kwargs):
    """A show with seasons still left to watch."""
    return _watched(show_id, seasons_watched=1, released_seasons=5, **kwargs)


class _FakeTMDB:
    """Stand-in for TMDBService that records what it was asked for."""

    def __init__(self, recommendations=None, popular=None, discover=None, failing_ids=()):
        self.recommendations = recommendations or {}
        self.popular = popular or []
        self.discover = discover or []
        self.failing_ids = set(failing_ids)
        self.recommendation_calls = []
        self.popular_calls = []
        self.discover_calls = []

    def get_show_recommendations(self, show_id, page=1):
        self.recommendation_calls.append(show_id)
        if show_id in self.failing_ids:
            raise Exception('TMDB is having a day')
        return [dict(show) for show in self.recommendations.get(show_id, [])]

    def get_all_time_popular_shows(self, page=1):
        self.popular_calls.append(page)
        return [dict(show) for show in self.popular]

    def discover_shows(self, genre_ids, page=1, min_votes=500):
        self.discover_calls.append((tuple(genre_ids), page))
        # 20 per page, mirroring a real TMDB page
        start = (page - 1) * 20
        return [dict(show) for show in self.discover[start:start + 20]]

    def get_tv_genres(self):
        return {'Drama': 18, 'Crime': 80, 'Comedy': 35, 'Sci-Fi & Fantasy': 10765}

    def attach_season_data(self, results):
        for show in results:
            show['number_of_released_seasons'] = 1
        return results


class _FakeCache:
    """In-memory stand-in for the caches the service uses."""

    def __init__(self):
        self.recommendations = {}
        self.searches = {}

    def get_recommendations(self, show_id):
        return self.recommendations.get(show_id)

    def set_recommendations(self, show_id, recommendations):
        self.recommendations[show_id] = recommendations

    def get_search_results(self, query, page=1):
        return self.searches.get(query)

    def set_search_results(self, query, results, page=1):
        self.searches[query] = results


def _rec_service(tmdb, cache=None):
    from src.services.recommendation_service import RecommendationService
    return RecommendationService(tmdb_service=tmdb, cache=cache or _FakeCache())


def _big_library(count=10, **kwargs):
    return [_watched(i, **kwargs) for i in range(1, count + 1)]


def test_recommendations_use_popular_for_a_thin_library():
    """Below the seed threshold, suggestions come from the all-time popular list."""
    tmdb = _FakeTMDB(popular=[_rec_show(i) for i in range(1, 6)])
    result = _rec_service(tmdb).build_recommendations([_watched(900)])

    assert result['mode'] == 'popular'
    assert [show['id'] for show in result['results']] == [1, 2, 3, 4, 5]
    assert tmdb.recommendation_calls == []


def test_recommendations_for_an_empty_library():
    """A brand-new visitor still gets something to click."""
    tmdb = _FakeTMDB(popular=[_rec_show(i) for i in range(1, 6)])
    result = _rec_service(tmdb).build_recommendations([])

    assert result['mode'] == 'popular'
    assert len(result['results']) == 5


def test_popular_recommendations_exclude_watched_shows():
    """A show already logged is never suggested, even on the popular path."""
    tmdb = _FakeTMDB(popular=[_rec_show(i) for i in range(1, 6)])

    result = _rec_service(tmdb).build_recommendations([_watched(2), _watched(4)])

    assert [show['id'] for show in result['results']] == [1, 3, 5]


def test_personalized_recommendations_exclude_watched_shows():
    """The same exclusion holds on both personalized lanes."""
    watched = _big_library()
    # Both lanes offer the whole library back, plus one new show each
    tmdb = _FakeTMDB(
        recommendations={i: [_rec_show(j) for j in range(1, 11)] + [_rec_show(98)] for i in range(1, 11)},
        discover=[_rec_show(j) for j in range(1, 11)] + [_rec_show(99)]
    )

    result = _rec_service(tmdb).build_recommendations(watched)

    assert result['mode'] == 'personalized'
    assert sorted(show['id'] for show in result['results']) == [98, 99]


def test_recommendations_switch_to_personalized_at_the_threshold():
    """Ten logged shows is the point where the personalized lanes take over."""
    from src.services.recommendation_service import RecommendationService

    threshold = RecommendationService.MIN_SEEDS_FOR_PERSONALIZED
    tmdb = lambda: _FakeTMDB(
        recommendations={i: [_rec_show(100 + i)] for i in range(1, 11)},
        popular=[_rec_show(1)],
        discover=[_rec_show(200 + i) for i in range(1, 11)]
    )

    below = _rec_service(tmdb()).build_recommendations(_big_library(threshold - 1))
    assert below['mode'] == 'popular'

    at = _rec_service(tmdb()).build_recommendations(_big_library(threshold))
    assert at['mode'] == 'personalized'


# --- Lane B: the finished-show lane ------------------------------------------

def test_finished_lane_follows_only_a_fully_watched_show():
    """A half-watched show never seeds the 'because you finished' lane."""
    watched = [_unfinished(i) for i in range(1, 10)] + [_watched(10)]
    tmdb = _FakeTMDB(
        recommendations={i: [_rec_show(500 + i)] for i in range(1, 11)},
        discover=[_rec_show(900 + i) for i in range(1, 30)]
    )

    result = _rec_service(tmdb).build_recommendations(watched)

    # Only show 10 is finished, so it is the only seed that may be consulted
    assert tmdb.recommendation_calls == [10]
    assert [show['because_of'] for show in result['results'] if show.get('because_of')] == ['Seed 10']


def test_finished_lane_is_capped_and_keeps_tmdb_order():
    """At most three picks, in the order TMDB ranked them."""
    from src.services.recommendation_service import RecommendationService

    watched = _big_library()
    ordered = [_rec_show(500 + i) for i in range(1, 8)]
    tmdb = _FakeTMDB(
        recommendations={i: list(ordered) for i in range(1, 11)},
        discover=[_rec_show(900 + i) for i in range(1, 30)]
    )

    result = _rec_service(tmdb).build_recommendations(watched)
    tagged = [show for show in result['results'] if show.get('because_of')]

    assert len(tagged) == RecommendationService.LANE_B_SLOTS
    assert [show['id'] for show in tagged] == [501, 502, 503]


def test_no_finished_show_leaves_the_discover_lane_to_fill_up():
    """A library with nothing finished still returns a full list."""
    watched = [_unfinished(i) for i in range(1, 11)]
    tmdb = _FakeTMDB(discover=[_rec_show(900 + i) for i in range(1, 40)])

    result = _rec_service(tmdb).build_recommendations(watched)

    assert tmdb.recommendation_calls == []
    assert len(result['results']) == 20
    assert not any(show.get('because_of') for show in result['results'])


def test_finished_lane_survives_a_failing_seed():
    """If the seed's recommendations cannot be fetched, the list still fills."""
    watched = _big_library()
    tmdb = _FakeTMDB(
        recommendations={i: [_rec_show(500 + i)] for i in range(1, 11)},
        discover=[_rec_show(900 + i) for i in range(1, 40)],
        failing_ids=set(range(1, 11))
    )

    result = _rec_service(tmdb).build_recommendations(watched)

    assert len(result['results']) == 20
    assert not any(show.get('because_of') for show in result['results'])


# --- Lane A: the discover lane -----------------------------------------------

def test_genre_profile_ranks_genres_by_watch_time():
    """A genre watched for longer outranks one spread over more shows."""
    watched = [_watched(i, minutes=10, genres=('Comedy',)) for i in range(1, 9)]
    watched += [_watched(9, minutes=5000, genres=('Crime',)), _watched(10, minutes=4000, genres=('Drama',))]
    tmdb = _FakeTMDB(discover=[_rec_show(900 + i) for i in range(1, 30)])

    _rec_service(tmdb).build_recommendations(watched)

    genre_ids = tmdb.discover_calls[0][0]
    assert genre_ids[0] == 80    # Crime, the most-watched
    assert genre_ids[1] == 18    # Drama
    assert genre_ids[2] == 35    # Comedy, most shows but least time


def test_discover_pool_is_cached_across_requests():
    """The candidate pool is fetched once, then re-sampled from cache."""
    watched = _big_library()
    tmdb = _FakeTMDB(discover=[_rec_show(900 + i) for i in range(1, 60)])
    service = _rec_service(tmdb, _FakeCache())

    service.build_recommendations(watched)
    calls_after_first = len(tmdb.discover_calls)
    service.build_recommendations(watched)

    assert calls_after_first > 0
    assert len(tmdb.discover_calls) == calls_after_first


def test_sampling_favours_better_known_shows():
    """A heavily voted show is suggested far more often than an obscure one."""
    import random
    random.seed(1234)

    watched = _big_library()
    pool = [_rec_show(500, votes=50000)] + [_rec_show(600 + i, votes=500) for i in range(1, 40)]
    tmdb = _FakeTMDB(discover=pool)
    service = _rec_service(tmdb, _FakeCache())

    famous = sum(
        1 for _ in range(40)
        if 500 in {show['id'] for show in service.build_recommendations(watched)['results']}
    )
    obscure = sum(
        1 for _ in range(40)
        if 601 in {show['id'] for show in service.build_recommendations(watched)['results']}
    )

    assert famous > obscure


def test_sampling_never_repeats_a_show_within_one_draw():
    """A single set of suggestions contains no duplicates."""
    watched = _big_library()
    tmdb = _FakeTMDB(discover=[_rec_show(900 + i) for i in range(1, 60)])

    results = _rec_service(tmdb).build_recommendations(watched)['results']
    ids = [show['id'] for show in results]

    assert len(ids) == len(set(ids))


def test_suggestions_cycle_between_requests():
    """An unchanged library still yields a different set next time."""
    import random
    random.seed(7)

    watched = _big_library()
    tmdb = _FakeTMDB(discover=[_rec_show(900 + i) for i in range(1, 80)])
    service = _rec_service(tmdb, _FakeCache())

    first = [show['id'] for show in service.build_recommendations(watched)['results']]
    second = [show['id'] for show in service.build_recommendations(watched)['results']]

    assert first != second


def test_ranking_ignores_the_trending_popularity_field():
    """A recent trending show does not displace an all-time favourite."""
    import random
    random.seed(99)

    watched = _big_library()
    # The obscure show is trending hard; the classic has the votes
    pool = [_rec_show(500, votes=40000, popularity=1)] + [
        _rec_show(600 + i, votes=500, popularity=9999) for i in range(1, 40)
    ]
    tmdb = _FakeTMDB(discover=pool)
    service = _rec_service(tmdb, _FakeCache())

    classic = sum(
        1 for _ in range(40)
        if 500 in {show['id'] for show in service.build_recommendations(watched)['results']}
    )
    trending = sum(
        1 for _ in range(40)
        if 601 in {show['id'] for show in service.build_recommendations(watched)['results']}
    )

    assert classic > trending


# --- Completion rule ----------------------------------------------------------

def test_is_show_completed_uses_released_seasons():
    """Completion is measured against released seasons, not announced ones."""
    service = CalculationService()

    assert service.is_show_completed({'seasons_watched': 3, 'released_seasons': 3, 'total_seasons': 5})
    assert not service.is_show_completed({'seasons_watched': 2, 'released_seasons': 3})
    # Older records without released_seasons fall back to total_seasons
    assert service.is_show_completed({'seasons_watched': 5, 'total_seasons': 5})


def test_popular_recommendations_are_cached_and_pooled_across_pages():
    """The popular list is fetched once and covers more than one page."""
    from src.services.recommendation_service import RecommendationService

    tmdb = _FakeTMDB(popular=[_rec_show(i) for i in range(1, 31)])
    cache = _FakeCache()
    service = _rec_service(tmdb, cache)

    service.build_recommendations([])
    assert tmdb.popular_calls == [1, 2]
    assert cache.recommendations[RecommendationService.POPULAR_CACHE_KEY]

    service.build_recommendations([])
    assert tmdb.popular_calls == [1, 2]  # served from cache the second time


def test_popular_recommendations_still_fill_the_limit_after_exclusions():
    """Excluding logged shows does not leave the popular list short."""
    tmdb = _FakeTMDB(popular=[_rec_show(i) for i in range(1, 31)])
    watched = [_watched(i) for i in range(1, 10)]

    result = _rec_service(tmdb).build_recommendations(watched)

    assert len(result['results']) == 20
    assert not {show['id'] for show in result['results']} & {show['id'] for show in watched}


# --- Recommendation cache retention -------------------------------------------

def test_recommendation_cache_round_trips(tmp_path):
    """Stored recommendations come back unchanged."""
    cache = _temp_cache(tmp_path)
    payload = [{'id': 1, 'name': 'Breaking Bad'}]

    cache.set_recommendations(1396, payload)

    assert cache.get_recommendations(1396) == payload


def test_recommendation_cache_expires_past_ttl(tmp_path):
    """Recommendations are subject to the same retention window as seasons."""
    import time
    cache = _temp_cache(tmp_path)
    cache.set_recommendations(1396, [{'id': 1}])

    stale = time.time() - cache.cache_duration - 60
    cache.recommendation_memory_cache.set('1396', [{'id': 1}], stale)
    with sqlite3.connect(cache.db_path) as conn:
        conn.execute('UPDATE recommendation_cache SET timestamp = ?', (stale,))
        conn.commit()

    assert cache.get_recommendations(1396) is None


def test_cleanup_removes_expired_recommendations(tmp_path):
    """The daily sweep covers the recommendation table too."""
    import time
    cache = _temp_cache(tmp_path)
    cache.set_recommendations(1396, [{'id': 1}])

    stale = time.time() - cache.cache_duration - 60
    with sqlite3.connect(cache.db_path) as conn:
        conn.execute('UPDATE recommendation_cache SET timestamp = ?', (stale,))
        conn.commit()

    assert cache.cleanup_expired() == 1
    with sqlite3.connect(cache.db_path) as conn:
        assert conn.execute('SELECT COUNT(*) FROM recommendation_cache').fetchone()[0] == 0


def test_a_different_version_of_a_watched_title_stays_eligible():
    """The UK Office is its own show, so finishing the US one does not hide it.

    Exclusion is by TMDB id only: two versions of a title are different shows
    and someone who watched one may well want the other.
    """
    watched = _big_library()
    watched[0]['name'] = 'The Office'
    # Same title, different TMDB id — the UK Office against the US Office's id
    other_version = _rec_show(2996, name='The Office', votes=983)
    tmdb = _FakeTMDB(
        recommendations={i: [other_version] for i in range(1, 11)},
        discover=[other_version] + [_rec_show(900 + i) for i in range(1, 40)]
    )

    result = _rec_service(tmdb).build_recommendations(watched)

    assert 2996 in {show['id'] for show in result['results']}


def test_finished_lane_skips_obscure_matches():
    """The closest match is passed over when almost nobody has seen it."""
    from src.services.recommendation_service import RecommendationService

    watched = _big_library()
    floor = RecommendationService.MIN_VOTE_COUNT
    ordered = [
        _rec_show(500, votes=30),        # closest match, but obscure
        _rec_show(501, votes=floor),
        _rec_show(502, votes=5000),
        _rec_show(503, votes=4000)
    ]
    tmdb = _FakeTMDB(
        recommendations={i: list(ordered) for i in range(1, 11)},
        discover=[_rec_show(900 + i) for i in range(1, 40)]
    )

    result = _rec_service(tmdb).build_recommendations(watched)
    tagged = [show['id'] for show in result['results'] if show.get('because_of')]

    assert tagged == [501, 502, 503]
