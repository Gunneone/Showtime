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
        if not self.api_key:
            raise ValueError("TMDB_API_KEY is required but not found in environment variables")
            
        if params is None:
            params = {}
        
        params['api_key'] = self.api_key
        
        try:
            response = requests.get(f"{self.base_url}/{endpoint}", params=params)
            response.raise_for_status()
            return response.json()
        except requests.RequestException as e:
            raise Exception(f"TMDB API request failed: {str(e)}")
    
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