import difflib
import logging
import requests
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, date
from ..config import Config
from .persistent_cache_service import get_persistent_cache

logger = logging.getLogger(__name__)

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
            return self._get_mock_data(endpoint, params)
            
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
            response = requests.get(f"{self.base_url}/{endpoint}", params=params)
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
    
    def _get_mock_data(self, endpoint, params=None):
        """Return mock data for development/testing."""
        if params is None:
            params = {}
            
        if endpoint == "search/tv":
            query = params.get('query', '').lower()
            mock_shows = self._mock_shows()

            # Filter shows based on query
            if query:
                filtered_shows = [
                    show for show in mock_shows
                    if query in show['name'].lower() or query in show['overview'].lower()
                ]
            else:
                filtered_shows = mock_shows

            return {
                'results': filtered_shows,
                'total_pages': 1,
                'total_results': len(filtered_shows),
                'page': 1
            }

        elif endpoint == "genre/tv/list":
            return {'genres': [
                {'id': 18, 'name': 'Drama'},
                {'id': 80, 'name': 'Crime'},
                {'id': 35, 'name': 'Comedy'},
                {'id': 10765, 'name': 'Sci-Fi & Fantasy'}
            ]}

        elif endpoint == "discover/tv":
            mock_shows = sorted(self._mock_shows(), key=lambda s: s['vote_average'], reverse=True)
            return {
                'results': mock_shows,
                'total_pages': 1,
                'total_results': len(mock_shows),
                'page': params.get('page', 1)
            }

        elif endpoint.startswith("tv/") and endpoint.endswith("/recommendations"):
            # Every show is "recommended" every other show, so tests can rely on
            # overlap between seeds without pinning a hand-built graph.
            show_id = int(endpoint.split('/')[1])
            mock_shows = [show for show in self._mock_shows() if show['id'] != show_id]
            return {
                'results': mock_shows,
                'total_pages': 1,
                'total_results': len(mock_shows),
                'page': params.get('page', 1)
            }

        elif endpoint.startswith("tv/") and "/season/" in endpoint:
            # Handle season details requests
            parts = endpoint.split('/')
            show_id = int(parts[1])
            season_num = int(parts[3])

            # Mock episode data for different shows
            mock_episodes = {
                1: {  # Breaking Bad
                    1: [  # Season 1 - 7 episodes
                        {'episode_number': 1, 'name': 'Pilot', 'runtime': 58},
                        {'episode_number': 2, 'name': 'Cat\'s in the Bag...', 'runtime': 48},
                        {'episode_number': 3, 'name': '...And the Bag\'s in the River', 'runtime': 48},
                        {'episode_number': 4, 'name': 'Cancer Man', 'runtime': 48},
                        {'episode_number': 5, 'name': 'Gray Matter', 'runtime': 48},
                        {'episode_number': 6, 'name': 'Crazy Handful of Nothin\'', 'runtime': 48},
                        {'episode_number': 7, 'name': 'A No-Rough-Stuff-Type Deal', 'runtime': 48}
                    ],
                    2: [  # Season 2 - 13 episodes  
                        {'episode_number': 1, 'name': 'Seven Thirty-Seven', 'runtime': 47},
                        {'episode_number': 2, 'name': 'Grilled', 'runtime': 47},
                        {'episode_number': 3, 'name': 'Bit by a Dead Bee', 'runtime': 47},
                        {'episode_number': 4, 'name': 'Down', 'runtime': 47},
                        {'episode_number': 5, 'name': 'Breakage', 'runtime': 47},
                        {'episode_number': 6, 'name': 'Peekaboo', 'runtime': 47},
                        {'episode_number': 7, 'name': 'Negro y Azul', 'runtime': 47},
                        {'episode_number': 8, 'name': 'Better Call Saul', 'runtime': 47},
                        {'episode_number': 9, 'name': '4 Days Out', 'runtime': 47},
                        {'episode_number': 10, 'name': 'Over', 'runtime': 47},
                        {'episode_number': 11, 'name': 'Mandala', 'runtime': 47},
                        {'episode_number': 12, 'name': 'Phoenix', 'runtime': 47},
                        {'episode_number': 13, 'name': 'ABQ', 'runtime': 47}
                    ]
                },
                2: {  # The Office
                    1: [  # Season 1 - 6 episodes
                        {'episode_number': 1, 'name': 'Pilot', 'runtime': 22},
                        {'episode_number': 2, 'name': 'Diversity Day', 'runtime': 22},
                        {'episode_number': 3, 'name': 'Health Care', 'runtime': 22},
                        {'episode_number': 4, 'name': 'The Alliance', 'runtime': 22},
                        {'episode_number': 5, 'name': 'Basketball', 'runtime': 22},
                        {'episode_number': 6, 'name': 'Hot Girl', 'runtime': 22}
                    ]
                },
                5: {  # The Mandalorian
                    1: [  # Season 1 - 8 episodes with varying runtimes
                        {'episode_number': 1, 'name': 'Chapter 1: The Mandalorian', 'runtime': 39},
                        {'episode_number': 2, 'name': 'Chapter 2: The Child', 'runtime': 32},
                        {'episode_number': 3, 'name': 'Chapter 3: The Sin', 'runtime': 37},
                        {'episode_number': 4, 'name': 'Chapter 4: Sanctuary', 'runtime': 40},
                        {'episode_number': 5, 'name': 'Chapter 5: The Gunslinger', 'runtime': 33},
                        {'episode_number': 6, 'name': 'Chapter 6: The Prisoner', 'runtime': 43},
                        {'episode_number': 7, 'name': 'Chapter 7: The Reckoning', 'runtime': 40},
                        {'episode_number': 8, 'name': 'Chapter 8: Redemption', 'runtime': 48}
                    ]
                }
            }
        
            # Get episodes for this season
            episodes = mock_episodes.get(show_id, {}).get(season_num, [])
        
            # Mock season air dates by show and season
            season_air_dates = {
                1: {  # Breaking Bad - all seasons released
                    1: '2008-01-20',
                    2: '2009-03-08', 
                    3: '2010-03-21',
                    4: '2011-07-17',
                    5: '2012-07-15'
                },
                2: {  # The Office - all seasons released  
                    1: '2005-03-24',
                    2: '2005-09-20',
                    3: '2006-09-21',
                    4: '2007-09-27',
                    5: '2008-09-25',
                    6: '2009-09-17',
                    7: '2010-09-23',
                    8: '2011-09-22',
                    9: '2012-09-20'
                },
                3: {  # Game of Thrones - all seasons released
                    1: '2011-04-17',
                    2: '2012-04-01',
                    3: '2013-03-31',
                    4: '2014-04-06',
                    5: '2015-04-12',
                    6: '2016-04-24',
                    7: '2017-07-16',
                    8: '2019-04-14'
                },
                4: {  # Stranger Things - some future seasons
                    1: '2016-07-15',
                    2: '2017-10-27',
                    3: '2019-07-04',
                    4: '2022-05-27',
                    5: '2026-01-01'  # Future season
                },
                5: {  # The Mandalorian - mix of released and future
                    1: '2019-11-12',
                    2: '2020-10-30',
                    3: '2023-03-01',
                    4: '2026-06-01'  # Future season
                }
            }
        
            # Get air date for this specific season
            show_air_dates = season_air_dates.get(show_id, {})
            season_air_date = show_air_dates.get(season_num, '2020-01-01')
        
            return {
                'id': f'{show_id}_{season_num}',
                'season_number': season_num,
                'name': f'Season {season_num}',
                'overview': f'Season {season_num} overview',
                'air_date': season_air_date,
                'episodes': episodes
            }

        elif endpoint.startswith("tv/"):
            show_id = int(endpoint.split('/')[1])

            # Map of mock show details by ID
            mock_show_details = {
                1: {
                    'id': 1,
                    'name': 'Breaking Bad',
                    'overview': 'A high school chemistry teacher turned methamphetamine cook.',
                    'first_air_date': '2008-01-20',
                    'last_air_date': '2013-09-29',
                    'poster_path': None,
                    'backdrop_path': None,
                    'vote_average': 9.5,
                    'popularity': 100,
                    'number_of_episodes': 62,
                    'number_of_seasons': 5,
                    'episode_run_time': [47],
                    'genres': [
                        {'id': 18, 'name': 'Drama'},
                        {'id': 80, 'name': 'Crime'}
                    ],
                    'status': 'Ended',
                    'networks': [
                        {'id': 1, 'name': 'AMC'}
                    ]
                },
                2: {
                    'id': 2,
                    'name': 'The Office',
                    'overview': 'A mockumentary about office workers in Scranton, PA.',
                    'first_air_date': '2005-03-24',
                    'last_air_date': '2013-05-16',
                    'poster_path': None,
                    'backdrop_path': None,
                    'vote_average': 8.9,
                    'popularity': 95,
                    'number_of_episodes': 201,
                    'number_of_seasons': 9,
                    'episode_run_time': [22],
                    'genres': [
                        {'id': 35, 'name': 'Comedy'}
                    ],
                    'status': 'Ended',
                    'networks': [
                        {'id': 2, 'name': 'NBC'}
                    ]
                },
                3: {
                    'id': 3,
                    'name': 'Game of Thrones',
                    'overview': 'Nine noble families fight for control over the mythical lands of Westeros.',
                    'first_air_date': '2011-04-17',
                    'last_air_date': '2019-05-19',
                    'poster_path': None,
                    'backdrop_path': None,
                    'vote_average': 9.3,
                    'popularity': 98,
                    'number_of_episodes': 73,
                    'number_of_seasons': 8,
                    'episode_run_time': [60],
                    'genres': [
                        {'id': 18, 'name': 'Drama'},
                        {'id': 10759, 'name': 'Action & Adventure'},
                        {'id': 10765, 'name': 'Sci-Fi & Fantasy'}
                    ],
                    'status': 'Ended',
                    'networks': [
                        {'id': 3, 'name': 'HBO'}
                    ]
                },
                4: {
                    'id': 4,
                    'name': 'Stranger Things',
                    'overview': 'When a young boy disappears, his mother and friends must confront terrifying supernatural forces.',
                    'first_air_date': '2016-07-15',
                    'last_air_date': '2022-07-01',
                    'poster_path': None,
                    'backdrop_path': None,
                    'vote_average': 8.7,
                    'popularity': 92,
                    'number_of_episodes': 42,
                    'number_of_seasons': 5,
                    'episode_run_time': [51],
                    'genres': [
                        {'id': 18, 'name': 'Drama'},
                        {'id': 10765, 'name': 'Sci-Fi & Fantasy'},
                        {'id': 9648, 'name': 'Mystery'}
                    ],
                    'status': 'Ended',
                    'networks': [
                        {'id': 4, 'name': 'Netflix'}
                    ]
                },
                5: {
                    'id': 5,
                    'name': 'The Mandalorian',
                    'overview': 'The travels of a lone bounty hunter in the outer reaches of the galaxy.',
                    'first_air_date': '2019-11-12',
                    'last_air_date': '2023-04-19',
                    'poster_path': None,
                    'backdrop_path': None,
                    'vote_average': 8.5,
                    'popularity': 88,
                    'number_of_episodes': 24,
                    'number_of_seasons': 4,
                    'episode_run_time': [36],
                    'genres': [
                        {'id': 10759, 'name': 'Action & Adventure'},
                        {'id': 18, 'name': 'Drama'},
                        {'id': 10765, 'name': 'Sci-Fi & Fantasy'}
                    ],
                    'status': 'Ended',
                    'networks': [
                        {'id': 5, 'name': 'Disney+'}
                    ]
                },
                6: {
                    'id': 6,
                    'name': 'Wednesday',
                    'overview': 'Smart, sarcastic and a little dead inside, Wednesday Addams investigates twisted mysteries while making new friends — and foes — at Nevermore Academy.',
                    'first_air_date': '2022-11-23',
                    'last_air_date': '2022-11-23',
                    'poster_path': None,
                    'backdrop_path': None,
                    'vote_average': 8.4,
                    'popularity': 525,
                    'number_of_episodes': 8,
                    'number_of_seasons': 1,
                    'episode_run_time': [51],
                    'genres': [
                        {'id': 18, 'name': 'Drama'},
                        {'id': 9648, 'name': 'Mystery'},
                        {'id': 10765, 'name': 'Sci-Fi & Fantasy'}
                    ],
                    'status': 'Returning Series',
                    'networks': [
                        {'id': 6, 'name': 'Netflix'}
                    ]
                }
            }
        
            return mock_show_details.get(show_id, {
                'id': show_id,
                'name': f'Unknown Show {show_id}',
                'overview': 'This is a mock show for testing purposes.',
                'first_air_date': '2020-01-01',
                'last_air_date': '2023-12-31',
                'poster_path': None,
                'backdrop_path': None,
                'vote_average': 8.0,
                'popularity': 80,
                'number_of_episodes': 50,
                'number_of_seasons': 5,
                'episode_run_time': [45],
                'genres': [],
                'status': 'Ended',
                'networks': []
            })

    def _mock_shows(self):
        """The mock show catalogue shared by the search, popular, and
        recommendation endpoints."""
        return [
            {
                'id': 1,
                'name': 'Breaking Bad',
                'overview': 'A high school chemistry teacher turned methamphetamine cook.',
                'first_air_date': '2008-01-20',
                'poster_path': None,
                'vote_average': 9.5,
                'popularity': 100
            },
            {
                'id': 2,
                'name': 'The Office',
                'overview': 'A mockumentary about office workers in Scranton, PA.',
                'first_air_date': '2005-03-24',
                'poster_path': None,
                'vote_average': 8.9,
                'popularity': 95
            },
            {
                'id': 3,
                'name': 'Game of Thrones',
                'overview': 'Nine noble families fight for control over the mythical lands of Westeros.',
                'first_air_date': '2011-04-17',
                'poster_path': None,
                'vote_average': 9.3,
                'popularity': 98
            },
            {
                'id': 4,
                'name': 'Stranger Things',
                'overview': 'When a young boy disappears, his mother and friends must confront terrifying supernatural forces.',
                'first_air_date': '2016-07-15',
                'poster_path': None,
                'vote_average': 8.7,
                'popularity': 92
            },
            {
                'id': 5,
                'name': 'The Mandalorian',
                'overview': 'The travels of a lone bounty hunter in the outer reaches of the galaxy.',
                'first_air_date': '2019-11-12',
                'poster_path': None,
                'vote_average': 8.5,
                'popularity': 88
            },
            {
                'id': 6,
                'name': 'Wednesday',
                'overview': 'Smart, sarcastic and a little dead inside, Wednesday Addams investigates twisted mysteries while making new friends — and foes — at Nevermore Academy.',
                'first_air_date': '2022-11-23',
                'poster_path': None,
                'vote_average': 8.4,
                'popularity': 525
            }
        ]

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
                released_seasons = self._count_released_seasons(show_details.get('seasons'))

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
        """Build looser variants of a query that missed, to catch typos.

        TMDB matches titles literally, so a single wrong character returns
        nothing. Dropping a word, or trimming a word's tail, usually leaves
        enough of the title intact to match.
        """
        tokens = query.split()
        candidates = []

        for i, token in enumerate(tokens):
            candidates.append(token)
            # Trimming below four characters matches too much to be useful.
            for trim in (1, 2, 3):
                if len(token) - trim >= 4:
                    candidates.append(token[:-trim])
            if len(tokens) > 1:
                candidates.append(' '.join(tokens[:i] + tokens[i + 1:]))

        seen = set()
        relaxed = []
        for candidate in candidates:
            candidate = candidate.strip()
            key = candidate.lower()
            if len(candidate) >= 3 and key != query.strip().lower() and key not in seen:
                seen.add(key)
                relaxed.append(candidate)

        return relaxed[:limit]

    def _rank_by_similarity(self, query, shows):
        """Order shows by title similarity to the query, nudged by popularity."""
        def score(show):
            similarity = difflib.SequenceMatcher(
                None, query.lower(), show['name'].lower()
            ).ratio()
            popularity = min(show.get('popularity') or 0, 300) / 300
            return 0.75 * similarity + 0.25 * popularity

        return sorted(shows, key=score, reverse=True)

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
    
    def _is_season_released(self, air_date_str):
        """Check if a season is released based on its air date."""
        if not air_date_str:
            return False
            
        try:
            air_date = datetime.strptime(air_date_str, '%Y-%m-%d').date()
            return air_date <= date.today()
        except ValueError:
            # If air date is invalid, assume not released
            return False
    
    def _count_released_seasons(self, seasons):
        """Count consecutive aired seasons from a show's `seasons` array.

        Season 0 holds specials and is ignored. Counting stops at the first
        season that has not aired, since seasons air in order.
        """
        numbered = sorted(
            (s for s in seasons or [] if s.get('season_number', 0) > 0),
            key=lambda s: s['season_number']
        )

        released_count = 0
        for season in numbered:
            if self._is_season_released(season.get('air_date') or ''):
                released_count += 1
            else:
                break

        return released_count

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
            released_count = self._count_released_seasons(show_details.get('seasons'))
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