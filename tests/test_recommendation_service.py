import sqlite3

import pytest

from src.services.calculation_service import CalculationService


def _temp_cache(tmp_path):
    from src.services.persistent_cache_service import PersistentCacheService
    return PersistentCacheService(str(tmp_path / 'cache.db'))


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
