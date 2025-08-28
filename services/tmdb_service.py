import requests
from datetime import datetime, date
from config import Config

class TMDBService:
    """Service for interacting with The Movie Database (TMDB) API."""
    
    def __init__(self):
        self.api_key = Config.TMDB_API_KEY
        self.base_url = Config.TMDB_BASE_URL
        self.image_base_url = Config.TMDB_IMAGE_BASE_URL
    
    def _make_request(self, endpoint, params=None):
        """Make a request to the TMDB API."""
        # Check for missing or placeholder API keys
        if not self.api_key or self.api_key == 'test' or self._is_placeholder_key():
            if self._is_placeholder_key():
                print("Using mock data: TMDB API key appears to be a placeholder value. Please set a valid TMDB API key in your environment variables.")
            else:
                print("Using mock data: No TMDB API key configured. Set TMDB_API_KEY environment variable or use mock data for testing.")
            return self._get_mock_data(endpoint, params)
            
        if params is None:
            params = {}
        
        params['api_key'] = self.api_key
        
        try:
            response = requests.get(f"{self.base_url}/{endpoint}", params=params)
            response.raise_for_status()
            return response.json()
        except requests.RequestException as e:
            # Check if it's an authentication/invalid key error (401/404 often indicate invalid API key)
            if hasattr(e, 'response') and e.response is not None:
                status_code = e.response.status_code
                if status_code in [401, 404]:
                    print(f"TMDB API authentication failed (HTTP {status_code}). Please verify your TMDB_API_KEY is valid. Using mock data as fallback.")
                else:
                    print(f"TMDB API request failed (HTTP {status_code}), using mock data: {str(e)}")
            else:
                print(f"TMDB API request failed, using mock data: {str(e)}")
            return self._get_mock_data(endpoint, params)
    
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
            mock_shows = [
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
                }
            ]
            
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
    
    def search_shows(self, query, page=1):
        """Search for TV shows."""
        endpoint = "search/tv"
        params = {
            'query': query,
            'page': page,
            'language': 'en-US'
        }
        
        data = self._make_request(endpoint, params)
        
        # Format the results
        results = []
        for show in data.get('results', []):
            # Get detailed show info to include number of seasons
            show_details = self.get_show_details(show['id'])
            total_seasons = show_details.get('number_of_seasons', 1)
            released_seasons = self.get_released_seasons_count(show['id'], total_seasons)
            
            results.append({
                'id': show['id'],
                'name': show['name'],
                'overview': show.get('overview', ''),
                'first_air_date': show.get('first_air_date', ''),
                'poster_path': self._get_full_image_url(show.get('poster_path')),
                'vote_average': show.get('vote_average', 0),
                'popularity': show.get('popularity', 0),
                'number_of_seasons': total_seasons,
                'number_of_released_seasons': released_seasons
            })
        
        return {
            'results': results,
            'total_pages': data.get('total_pages', 1),
            'total_results': data.get('total_results', 0),
            'page': data.get('page', 1)
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
            'networks': show.get('networks', [])
        }
    
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
    
    def get_released_seasons_count(self, show_id, total_seasons):
        """Get the number of released seasons for a show."""
        released_count = 0
        
        for season_num in range(1, total_seasons + 1):
            try:
                season_details = self.get_season_details(show_id, season_num)
                air_date = season_details.get('air_date', '')
                
                if self._is_season_released(air_date):
                    released_count += 1
                else:
                    # Stop counting once we hit an unreleased season
                    # (assuming seasons are released in order)
                    break
            except Exception:
                # If we can't get season details, stop counting
                break
                
        return released_count
    
    def _get_full_image_url(self, image_path):
        """Convert a relative image path to a full URL."""
        if not image_path:
            return None
        return f"{self.image_base_url}{image_path}"