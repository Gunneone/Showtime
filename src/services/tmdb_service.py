import logging
import requests
from concurrent.futures import ThreadPoolExecutor
from requests.adapters import HTTPAdapter
from ..config import Config
from .persistent_cache_service import get_persistent_cache
from .tmdb_mock import get_mock_data
from . import tmdb_search

logger = logging.getLogger(__name__)

# (connect, read) timeout applied to every outbound TMDB call. Without it a
# slow or hung TMDB response pins a worker thread until Gunicorn's kill
# timeout, and a couple of those take the whole site down.
TMDB_TIMEOUT = (3.05, 15)

# One pooled session shared by every TMDBService instance and every thread in
# the season-data fan-out, so sockets are reused instead of reopened per call.
# Built at import, before Gunicorn forks its workers, while the pool is empty.
_session = requests.Session()
_session.mount(
    'https://',
    HTTPAdapter(pool_connections=10, pool_maxsize=50, max_retries=0),
)

class TMDBService:
    """Service for interacting with The Movie Database (TMDB) API."""
    
    def __init__(self):
        self.api_key = Config.TMDB_API_KEY
        self.base_url = Config.TMDB_BASE_URL
        self.image_base_url = Config.TMDB_IMAGE_BASE_URL
        self.persistent_cache = get_persistent_cache()
    
    def use_mock_data_for_testing(self):
        """Force the service to use mock data for testing purposes."""
        self._use_mock_data = True
    
    def _make_request(self, endpoint, params=None):
        """Make a request to the TMDB API."""
        # Check if we're in testing mode with mock data
        if hasattr(self, '_use_mock_data') and self._use_mock_data:
            return get_mock_data(endpoint, params)
            
        # Check for missing or placeholder API keys
        if not self.api_key or self.api_key == 'test' or self._is_placeholder_key():
            if self._is_placeholder_key():
                error_msg = "TMDB API key appears to be a placeholder value. Please set a valid TMDB API key in your environment variables."
            else:
                error_msg = "No TMDB API key configured. Set TMDB_API_KEY environment variable."
            print(f"TMDB API Error: {error_msg}")
            raise Exception(error_msg)
            
        if params is None:
            params = {}
        
        params['api_key'] = self.api_key
        
        try:
            response = _session.get(
                f"{self.base_url}/{endpoint}", params=params, timeout=TMDB_TIMEOUT
            )
            response.raise_for_status()
            return response.json()
        except requests.RequestException as e:
            # str(e) on a requests exception can embed the full request URL,
            # api_key included, so the detailed message is logged server-side
            # only and never handed back to the caller.
            if hasattr(e, 'response') and e.response is not None:
                status_code = e.response.status_code
                if status_code in [401, 404]:
                    error_msg = f"TMDB API authentication failed (HTTP {status_code}). Please verify your TMDB_API_KEY is valid."
                else:
                    error_msg = f"TMDB API request failed (HTTP {status_code})"
                logger.error("TMDB API error: %s", e)
                raise Exception(error_msg)
            else:
                logger.error("TMDB API request failed: %s", e)
                raise Exception("TMDB API request failed")
    
    def _is_placeholder_key(self):
        """Check if the API key appears to be a placeholder value."""
        if not self.api_key:
            return False
        
        placeholder_patterns = [
            'your-tmdb-api-key-here',
            'your_tmdb_api_key_here',
            'tmdb-api-key',
            'tmdb_api_key',
            'placeholder',
            'example'
        ]
        
        return any(pattern in self.api_key.lower() for pattern in placeholder_patterns)
    
    def _format_search_result(self, show):
        """Project a raw TMDB search hit onto the shape the frontend expects."""
        return {
            'id': show['id'],
            'name': show['name'],
            'overview': show.get('overview', ''),
            'first_air_date': show.get('first_air_date', ''),
            'poster_path': self._get_full_image_url(show.get('poster_path')),
            'vote_average': show.get('vote_average', 0),
            # Lifetime vote total. Unlike `popularity`, which is a rolling
            # weekly trending score, this accumulates over a show's whole life,
            # so ranking on it does not favour whatever aired recently.
            'vote_count': show.get('vote_count', 0),
            'popularity': show.get('popularity', 0),
            'number_of_seasons': None,
            'number_of_released_seasons': None
        }

    def attach_season_data(self, results):
        """Fill in season counts on any list of formatted results.

        Callers that assemble their own result list (recommendations, for
        instance) need the same season counts a search page gets, since the
        season-selector bars are built from them.
        """
        return self._attach_season_data(results)

    def _attach_season_data(self, results):
        """Fill in season counts for a page of results, in parallel.

        Each show needs one TMDB call at most, and cached shows need none, so a
        full page resolves in about the time of a single request.
        """
        def resolve(show_data):
            try:
                cached_data = self.persistent_cache.get_season_data(show_data['id'])
                if cached_data and 'total_seasons' in cached_data and 'released_seasons_count' in cached_data:
                    show_data['number_of_seasons'] = cached_data['total_seasons']
                    show_data['number_of_released_seasons'] = cached_data['released_seasons_count']
                    return

                show_details = self.get_show_details(show_data['id'])
                total_seasons = show_details.get('number_of_seasons', 1)
                released_seasons = self._count_released_seasons(
                    show_details.get('seasons'), show_details.get('status')
                )

                self.persistent_cache.set_season_data(show_data['id'], {
                    'total_seasons': total_seasons,
                    'released_seasons_count': released_seasons
                })

                show_data['number_of_seasons'] = total_seasons
                show_data['number_of_released_seasons'] = released_seasons
            except Exception as e:
                print(f"Failed to get season data for show {show_data['id']}: {e}")
                # Show at least one season bar so the result stays actionable
                show_data['number_of_seasons'] = 1
                show_data['number_of_released_seasons'] = 1

        if not results:
            return results

        with ThreadPoolExecutor(max_workers=min(10, len(results))) as executor:
            list(executor.map(resolve, results))

        return results

    def search_shows(self, query, page=1):
        """Search for TV shows, with season counts resolved for every result."""
        endpoint = "search/tv"
        params = {
            'query': query,
            'page': page,
            'language': 'en-US'
        }

        data = self._make_request(endpoint, params)

        results = self._attach_season_data(
            [self._format_search_result(show) for show in data.get('results', [])]
        )

        return {
            'results': results,
            'total_pages': data.get('total_pages', 1),
            'total_results': data.get('total_results', 0),
            'page': data.get('page', 1)
        }
    
    def _relaxed_queries(self, query, limit=5):
        return tmdb_search.relaxed_queries(query, limit)

    def _rank_by_similarity(self, query, shows):
        return tmdb_search.rank_by_similarity(query, shows)

    def search_shows_with_fallback(self, query, page=1, pool_size=60, max_results=20):
        """Search, and if nothing matched, retry with relaxed variants of the query.

        Only the first page falls back; later pages of an empty result set do
        not exist. Recovers most single-character typos, though not
        transpositions early in a word.
        """
        data = self.search_shows(query, page)

        if data['results'] or page != 1:
            return data

        pool = {}
        for relaxed in self._relaxed_queries(query):
            try:
                candidates = self._make_request(
                    "search/tv", {'query': relaxed, 'page': 1, 'language': 'en-US'}
                )
            except Exception as e:
                print(f"Fallback search failed for {relaxed!r}: {e}")
                continue

            for show in candidates.get('results', []):
                pool.setdefault(show['id'], show)

            if len(pool) >= pool_size:
                break

        if not pool:
            return data

        ranked = self._rank_by_similarity(query, list(pool.values()))[:max_results]
        results = self._attach_season_data(
            [self._format_search_result(show) for show in ranked]
        )

        return {
            'results': results,
            'total_pages': 1,
            'total_results': len(results),
            'page': 1,
            'did_you_mean': results[0]['name'] if results else None
        }

    def get_show_season_data(self, show_id):
        """Get season data for a specific show (for on-demand loading)."""
        try:
            # Check cache first
            cached_data = self.persistent_cache.get_season_data(show_id)
            if cached_data and 'total_seasons' in cached_data and 'released_seasons_count' in cached_data:
                return {
                    'number_of_seasons': cached_data['total_seasons'],
                    'number_of_released_seasons': cached_data['released_seasons_count']
                }
            
            # Fetch from API
            show_details = self.get_show_details(show_id)
            total_seasons = show_details.get('number_of_seasons', 1)
            released_seasons = self.get_released_seasons_count(show_id, total_seasons)
            
            return {
                'number_of_seasons': total_seasons,
                'number_of_released_seasons': released_seasons
            }
        except Exception as e:
            print(f"Failed to get season data for show {show_id}: {e}")
            return {
                'number_of_seasons': 1,
                'number_of_released_seasons': 1
            }
    
    def get_show_details(self, show_id):
        """Get detailed information about a specific TV show."""
        endpoint = f"tv/{show_id}"
        params = {
            'language': 'en-US'
        }
        
        show = self._make_request(endpoint, params)
        
        # Get episode runtime (use first value from list, or default to 45 minutes)
        episode_run_time = 45
        if show.get('episode_run_time') and len(show['episode_run_time']) > 0:
            episode_run_time = show['episode_run_time'][0]
        
        return {
            'id': show['id'],
            'name': show['name'],
            'overview': show.get('overview', ''),
            'first_air_date': show.get('first_air_date', ''),
            'last_air_date': show.get('last_air_date', ''),
            'poster_path': self._get_full_image_url(show.get('poster_path')),
            'backdrop_path': self._get_full_image_url(show.get('backdrop_path')),
            'vote_average': show.get('vote_average', 0),
            'popularity': show.get('popularity', 0),
            'number_of_episodes': show.get('number_of_episodes', 0),
            'number_of_seasons': show.get('number_of_seasons', 0),
            'episode_run_time': episode_run_time,
            'genres': show.get('genres', []),
            'status': show.get('status', ''),
            'networks': show.get('networks', []),
            # Carries per-season air dates, which lets callers work out how many
            # seasons have actually aired without a request per season.
            'seasons': show.get('seasons', [])
        }
    
    def get_show_recommendations(self, show_id, page=1):
        """Fetch TMDB's recommendations for one show, in search-result shape.

        Season counts are deliberately left unresolved here: callers pool
        recommendations from many shows and only need them on the handful that
        survive ranking, so `_attach_season_data` runs once on that final list.
        """
        endpoint = f"tv/{show_id}/recommendations"
        params = {
            'page': page,
            'language': 'en-US'
        }

        data = self._make_request(endpoint, params)

        return [self._format_search_result(show) for show in data.get('results', [])]

    def get_all_time_popular_shows(self, page=1):
        """Fetch the most popular TV shows of all time, in search-result shape.

        TMDB's `tv/popular` tracks what is popular *this week*, which churns.
        Ranking by total vote count instead surfaces the shows the largest
        audience has ever engaged with, which is stable and much closer to what
        someone means by "most popular".
        """
        endpoint = "discover/tv"
        params = {
            'page': page,
            'language': 'en-US',
            'sort_by': 'vote_count.desc'
        }

        data = self._make_request(endpoint, params)

        return [self._format_search_result(show) for show in data.get('results', [])]

    def discover_shows(self, genre_ids, page=1, min_votes=500):
        """Fetch well-known shows in the given genres, ranked all-time.

        Genres are joined with `|` (OR) rather than `,` (AND): requiring every
        genre at once collapses the pool to a few dozen titles, while OR keeps
        it in the hundreds, which is what makes sampling worth doing.
        """
        endpoint = "discover/tv"
        params = {
            'page': page,
            'language': 'en-US',
            'sort_by': 'vote_count.desc',
            'vote_count.gte': min_votes
        }
        if genre_ids:
            params['with_genres'] = '|'.join(str(genre_id) for genre_id in genre_ids)

        data = self._make_request(endpoint, params)

        return [self._format_search_result(show) for show in data.get('results', [])]

    # Fallback used when the genre list cannot be fetched. TMDB's TV genres
    # change very rarely, so a stale copy is far better than losing the lane.
    TV_GENRE_FALLBACK = {
        'Action & Adventure': 10759, 'Animation': 16, 'Comedy': 35, 'Crime': 80,
        'Documentary': 99, 'Drama': 18, 'Family': 10751, 'Kids': 10762,
        'Mystery': 9648, 'News': 10763, 'Reality': 10764,
        'Sci-Fi & Fantasy': 10765, 'Soap': 10766, 'Talk': 10767,
        'War & Politics': 10768, 'Western': 37
    }

    def get_tv_genres(self):
        """Map TV genre names to TMDB ids.

        Logged shows store genres as names only, so this is what lets a taste
        profile become a discover query.
        """
        try:
            data = self._make_request("genre/tv/list", {'language': 'en-US'})
            genres = {genre['name']: genre['id'] for genre in data.get('genres', [])}
            return genres or dict(self.TV_GENRE_FALLBACK)
        except Exception as e:
            print(f"Failed to fetch TV genre list: {e}")
            return dict(self.TV_GENRE_FALLBACK)

    def get_season_details(self, show_id, season_number):
        """Get detailed information about a specific season."""
        endpoint = f"tv/{show_id}/season/{season_number}"
        params = {
            'language': 'en-US'
        }
        
        season = self._make_request(endpoint, params)
        
        return {
            'id': season['id'],
            'season_number': season['season_number'],
            'name': season.get('name', f'Season {season_number}'),
            'overview': season.get('overview', ''),
            'air_date': season.get('air_date', ''),
            'episode_count': len(season.get('episodes', [])),
            'poster_path': self._get_full_image_url(season.get('poster_path')),
            'episodes': season.get('episodes', [])
        }
    
    def get_show_episode_runtimes(self, show_id, num_seasons):
        """Get runtime data for all episodes across all seasons of a show."""
        episode_runtimes = {}
        
        for season_num in range(1, num_seasons + 1):
            try:
                season_data = self.get_season_details(show_id, season_num)
                season_runtimes = []
                
                for episode in season_data.get('episodes', []):
                    runtime = episode.get('runtime')
                    if runtime and runtime > 0:
                        season_runtimes.append(runtime)
                    else:
                        # Fallback to show's default runtime if episode runtime is missing
                        season_runtimes.append(None)
                
                if season_runtimes:
                    episode_runtimes[season_num] = season_runtimes
                    
            except Exception as e:
                print(f"Failed to get episode runtimes for season {season_num} of show {show_id}: {e}")
                continue
        
        return episode_runtimes
    
    def _count_released_seasons(self, seasons, show_status=None):
        return tmdb_search.count_released_seasons(seasons, show_status)


    def get_released_seasons_count(self, show_id, total_seasons):
        """Get the number of released seasons for a show."""
        # Check cache first
        cached_data = self.persistent_cache.get_season_data(show_id)

        if cached_data and 'released_seasons_count' in cached_data:
            return cached_data['released_seasons_count']

        # Not cached, derive it from the show details, which already carry an
        # air date for every season.
        try:
            show_details = self.get_show_details(show_id)
            released_count = self._count_released_seasons(
                show_details.get('seasons'), show_details.get('status')
            )
            total_seasons = show_details.get('number_of_seasons') or total_seasons
        except Exception as e:
            print(f"Failed to get season data for show {show_id}: {e}")
            return 1

        # Cache the result
        season_data = cached_data or {}
        season_data['released_seasons_count'] = released_count
        season_data['total_seasons'] = total_seasons
        self.persistent_cache.set_season_data(show_id, season_data)

        return released_count
    
    def _get_full_image_url(self, image_path):
        """Convert a relative image path to a full URL."""
        if not image_path:
            return None
        return f"{self.image_base_url}{image_path}"