import requests
from config import Config

class TMDBService:
    """Service for interacting with The Movie Database (TMDB) API."""
    
    def __init__(self):
        self.api_key = Config.TMDB_API_KEY
        self.base_url = Config.TMDB_BASE_URL
        self.image_base_url = Config.TMDB_IMAGE_BASE_URL
    
    def _make_request(self, endpoint, params=None):
        """Make a request to the TMDB API."""
        if not self.api_key or self.api_key == 'test':
            # Mock mode for development/testing
            return self._get_mock_data(endpoint, params)
            
        if params is None:
            params = {}
        
        params['api_key'] = self.api_key
        
        try:
            response = requests.get(f"{self.base_url}/{endpoint}", params=params)
            response.raise_for_status()
            return response.json()
        except requests.RequestException as e:
            # Fallback to mock data on network errors
            print(f"TMDB API request failed, using mock data: {str(e)}")
            return self._get_mock_data(endpoint, params)
    
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
                    'genres': [],
                    'status': 'Ended',
                    'networks': []
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
                    'genres': [],
                    'status': 'Ended',
                    'networks': []
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
                    'genres': [],
                    'status': 'Ended',
                    'networks': []
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
                    'number_of_seasons': 4,
                    'episode_run_time': [51],
                    'genres': [],
                    'status': 'Ended',
                    'networks': []
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
                    'number_of_seasons': 3,
                    'episode_run_time': [36],
                    'genres': [],
                    'status': 'Ended',
                    'networks': []
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
            results.append({
                'id': show['id'],
                'name': show['name'],
                'overview': show.get('overview', ''),
                'first_air_date': show.get('first_air_date', ''),
                'poster_path': self._get_full_image_url(show.get('poster_path')),
                'vote_average': show.get('vote_average', 0),
                'popularity': show.get('popularity', 0)
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
    
    def _get_full_image_url(self, image_path):
        """Convert a relative image path to a full URL."""
        if not image_path:
            return None
        return f"{self.image_base_url}{image_path}"