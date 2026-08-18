"""
Recommendation service.

Suggests shows to log, in two lanes:

* the bulk of the list comes from TMDB's catalogue filtered to the genres the
  user actually watches, ranked by lifetime vote count and sampled at random;
* a few slots follow a single show the user has finished, using TMDB's own
  recommendations for it.

Both lanes rank on `vote_count`, never on TMDB's `popularity` field: popularity
is a rolling weekly trending score, so ranking on it quietly buries anything
that did not air recently.

Libraries too small to profile fall back to the most popular shows of all time.
"""

import math
import random
from collections import defaultdict

from .calculation_service import CalculationService
from .persistent_cache_service import get_persistent_cache
from .tmdb_service import TMDBService


class RecommendationService:
    """Builds show recommendations from a user's watched list."""

    # Below this many logged shows there is not enough signal to profile, so
    # the all-time popular list is used instead.
    MIN_SEEDS_FOR_PERSONALIZED = 10

    MAX_RESULTS = 20

    # Slots reserved for the "because you finished X" lane.
    LANE_B_SLOTS = 3

    # Genres to build the discover query from. Three keeps the pool wide
    # without drifting into genres the user barely watches.
    PROFILE_GENRES = 3

    # A show needs this many votes to be considered well known. This is the
    # main lever against the obscure long tail.
    MIN_VOTE_COUNT = 500

    # ~100 candidates: enough that repeated samples visibly differ.
    DISCOVER_PAGES = 5

    # Reserved keys in the per-show recommendation cache. Real TMDB show ids
    # start at 1, so negative values cannot collide with a seed. Values are
    # bumped when the meaning of a list changes, so caches holding an older
    # definition are not served for another week.
    POPULAR_CACHE_KEY = -1

    # Pages of popular shows to pool, so the list can still be filled after
    # excluding everything the user has already logged.
    POPULAR_PAGES = 2

    def __init__(self, tmdb_service=None, cache=None, calculation_service=None):
        self.tmdb_service = tmdb_service or TMDBService()
        self.cache = cache or get_persistent_cache()
        self.calculation_service = calculation_service or CalculationService()

    def build_recommendations(self, watched_shows, limit=MAX_RESULTS):
        """Build a list of shows the user has not logged yet."""
        watched_shows = watched_shows or []
        excluded_ids = {
            show['id'] for show in watched_shows
            if isinstance(show, dict) and show.get('id') is not None
        }

        if len(watched_shows) < self.MIN_SEEDS_FOR_PERSONALIZED:
            return {
                'results': self._popular_fallback(excluded_ids, limit),
                'mode': 'popular'
            }

        return self._personalized(watched_shows, excluded_ids, limit)

    def _personalized(self, watched_shows, excluded_ids, limit):
        """Fill the list from the finished-show lane, then the discover lane."""
        results = self._finished_show_picks(watched_shows, excluded_ids)

        already_picked = {show['id'] for show in results}
        pool = [
            show for show in self._discover_pool(watched_shows)
            if show['id'] not in excluded_ids and show['id'] not in already_picked
        ]
        results.extend(self._weighted_sample(pool, limit - len(results)))

        return {
            'results': self.tmdb_service.attach_season_data(results),
            'mode': 'personalized'
        }

    # --- Lane B: one finished show ------------------------------------------

    def _finished_show_picks(self, watched_shows, excluded_ids):
        """TMDB's top recommendations for one show the user has finished.

        Following a single finished show rather than pooling every seed is what
        makes this lane cycle: a different show is drawn each request, so the
        suggestions move even when the library does not.
        """
        finished = [
            show for show in watched_shows
            if isinstance(show, dict) and show.get('id') is not None
            and self.calculation_service.is_show_completed(show)
        ]

        if not finished:
            return []

        seed = random.choice(finished)

        recommendations = self.cache.get_recommendations(seed['id'])
        if recommendations is None:
            try:
                recommendations = self.tmdb_service.get_show_recommendations(seed['id'])
            except Exception as e:
                print(f"Failed to get recommendations for show {seed['id']}: {e}")
                return []
            self.cache.set_recommendations(seed['id'], recommendations)

        picks = []
        for show in recommendations:
            if show['id'] in excluded_ids:
                continue
            # TMDB's match order is kept, but its long tail is skipped over:
            # without this the closest match is often something almost nobody
            # has heard of, which is exactly what this lane should avoid.
            if (show.get('vote_count') or 0) < self.MIN_VOTE_COUNT:
                continue
            pick = dict(show)
            pick['because_of'] = seed.get('name', '')
            picks.append(pick)
            if len(picks) == self.LANE_B_SLOTS:
                break

        return picks

    # --- Lane A: taste-profile discover --------------------------------------

    def _genre_profile(self, watched_shows):
        """The genres the user has spent the most time on, as TMDB ids."""
        minutes_by_genre = defaultdict(int)
        for show in watched_shows:
            if not isinstance(show, dict):
                continue
            try:
                minutes = self.calculation_service.calculate_show_time(show)
            except Exception:
                minutes = 0
            for genre_name in show.get('genres') or []:
                minutes_by_genre[genre_name] += minutes

        if not minutes_by_genre:
            return []

        genre_ids = self.tmdb_service.get_tv_genres()
        ranked = sorted(minutes_by_genre.items(), key=lambda item: item[1], reverse=True)

        profile = []
        for genre_name, _ in ranked:
            genre_id = genre_ids.get(genre_name)
            if genre_id is not None and genre_id not in profile:
                profile.append(genre_id)
            if len(profile) == self.PROFILE_GENRES:
                break

        return profile

    def _discover_pool(self, watched_shows):
        """Well-known shows in the user's genres, pooled across several pages."""
        genre_ids = self._genre_profile(watched_shows)

        # Reuse the search cache rather than adding a table: it already carries
        # the 7-day retention and the nightly cleanup sweep.
        cache_key = '\x1fdiscover:' + '|'.join(str(genre_id) for genre_id in genre_ids)
        cached = self.cache.get_search_results(cache_key)
        if cached is not None:
            return cached.get('results', [])

        pool = []
        seen_ids = set()
        for page in range(1, self.DISCOVER_PAGES + 1):
            try:
                page_results = self.tmdb_service.discover_shows(
                    genre_ids, page=page, min_votes=self.MIN_VOTE_COUNT
                )
            except Exception as e:
                print(f"Failed to discover shows (page {page}): {e}")
                break

            for show in page_results:
                if show['id'] not in seen_ids:
                    seen_ids.add(show['id'])
                    pool.append(show)

        if pool:
            self.cache.set_search_results(cache_key, {'results': pool})

        return pool

    def _weighted_sample(self, pool, count):
        """Draw `count` distinct shows, favouring the better-known ones.

        Sampling rather than taking the top N is what stops the suggestions
        being identical on every visit. Weighting by log(votes) keeps famous
        shows likely without making them certain.
        """
        if count <= 0 or not pool:
            return []

        if len(pool) <= count:
            return list(pool)

        # Gumbel top-k: adding Gumbel noise to each log-weight and taking the
        # highest k is equivalent to sampling k without replacement, in one pass
        def key(show):
            weight = math.log10(max(show.get('vote_count') or 0, 1) + 1)
            gumbel = -math.log(-math.log(random.random()))
            return math.log(max(weight, 1e-9)) + gumbel

        return sorted(pool, key=key, reverse=True)[:count]

    # --- Fallback for thin libraries -----------------------------------------

    def _popular_fallback(self, excluded_ids, limit):
        """The most popular shows of all time, minus anything already logged."""
        popular = self.cache.get_recommendations(self.POPULAR_CACHE_KEY)

        if popular is None:
            popular = []
            seen_ids = set()
            for page in range(1, self.POPULAR_PAGES + 1):
                try:
                    page_results = self.tmdb_service.get_all_time_popular_shows(page)
                except Exception as e:
                    print(f"Failed to get popular shows (page {page}): {e}")
                    break

                for show in page_results:
                    if show['id'] not in seen_ids:
                        seen_ids.add(show['id'])
                        popular.append(show)

            if popular:
                self.cache.set_recommendations(self.POPULAR_CACHE_KEY, popular)

        results = [show for show in popular if show['id'] not in excluded_ids][:limit]

        return self.tmdb_service.attach_season_data(results)


# Global service instance, built lazily so that importing this module does not
# create the database or start the cleanup thread as a side effect.
_recommendation_service = None


def get_recommendation_service() -> RecommendationService:
    """Get the global recommendation service instance."""
    global _recommendation_service
    if _recommendation_service is None:
        _recommendation_service = RecommendationService()
    return _recommendation_service
