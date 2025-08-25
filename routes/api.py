from flask import Blueprint, request, jsonify, make_response
import json
from services.tmdb_service import TMDBService
from services.calculation_service import CalculationService
from services.search_cache_service import get_search_cache

api_bp = Blueprint('api', __name__)

def get_tmdb_service():
    """Get TMDB service instance."""
    return TMDBService()

def get_calc_service():
    """Get calculation service instance."""
    return CalculationService()

@api_bp.route('/search')
def search():
    """Search for shows/movies using TMDB API with caching."""
    query = request.args.get('query', '').strip()
    if not query:
        return jsonify({'error': 'Query parameter is required'}), 400
    
    try:
        # Check cache first
        cache = get_search_cache()
        cached_result = cache.get(query)
        
        if cached_result:
            # Return cached result
            print(f"Cache hit for query: {query}")
            return jsonify(cached_result)
        
        # Cache miss - call TMDB API
        print(f"Cache miss for query: {query}")
        tmdb_service = get_tmdb_service()
        results = tmdb_service.search_shows(query)
        
        # Cache the result
        cache.set(query, results)
        
        return jsonify(results)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@api_bp.route('/watched', methods=['GET'])
def get_watched():
    """Get watched list from localStorage (via request body) or fallback to cookies for migration."""
    try:
        watched_shows = []
        
        # Try to get data from request body (localStorage data sent by frontend)
        if request.is_json and request.get_json():
            data = request.get_json()
            watched_shows = data.get('watched_shows', [])
        else:
            # Fallback to cookies for backward compatibility / migration
            watched_cookie = request.cookies.get('watched_shows', '[]')
            
            # URL decode the cookie value if needed
            import urllib.parse
            if watched_cookie.startswith('%'):
                watched_cookie = urllib.parse.unquote(watched_cookie)
            
            watched_shows = json.loads(watched_cookie)
        
        # Calculate total watch time
        calc_service = get_calc_service()
        total_time = calc_service.calculate_total_time(watched_shows)
        
        return jsonify({
            'watched_shows': watched_shows,
            'total_time_minutes': total_time,
            'total_time_formatted': calc_service.format_time(total_time)
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@api_bp.route('/watched', methods=['POST'])
def add_watched():
    """Add watched content (stored in localStorage, with migration support from cookies)."""
    try:
        data = request.get_json()
        if not data or 'id' not in data:
            return jsonify({'error': 'Show ID is required'}), 400
        
        # Get current watched shows from request body (localStorage) or fallback to cookies
        watched_shows = []
        
        if 'current_watched_shows' in data:
            # Frontend sent current localStorage data
            watched_shows = data['current_watched_shows']
        else:
            # Fallback to cookies for migration
            watched_cookie = request.cookies.get('watched_shows', '[]')
            watched_shows = json.loads(watched_cookie)
        
        # Get show details from TMDB
        tmdb_service = get_tmdb_service()
        show_details = tmdb_service.get_show_details(data['id'])
        if not show_details:
            return jsonify({'error': 'Show not found'}), 404
        
        # Check if show already exists
        existing_show = next((show for show in watched_shows if show['id'] == data['id']), None)
        
        if existing_show:
            # Update existing show
            existing_show['seasons_watched'] = data.get('seasons_watched', existing_show['seasons_watched'])
        else:
            # Add new show
            episode_runtime = 45  # default
            if show_details.get('episode_run_time'):
                runtime_data = show_details['episode_run_time']
                if isinstance(runtime_data, list) and len(runtime_data) > 0:
                    episode_runtime = runtime_data[0]
                elif isinstance(runtime_data, int):
                    episode_runtime = runtime_data
            
            new_show = {
                'id': show_details['id'],
                'name': show_details['name'],
                'poster_path': show_details.get('poster_path'),
                'first_air_date': show_details.get('first_air_date'),
                'seasons_watched': data.get('seasons_watched', 1),
                'total_seasons': show_details.get('number_of_seasons', 1),
                'total_episodes': show_details.get('number_of_episodes', 0),
                'episode_run_time': episode_runtime,
                # Store only genre names as compact array to save space
                'genres': [genre['name'] for genre in show_details.get('genres', [])]
            }
            watched_shows.append(new_show)
        
        # Return updated data for localStorage storage (no cookies)
        response_data = {
            'success': True, 
            'show': show_details,
            'updated_watched_shows': watched_shows
        }
        
        # Clear legacy cookie if it exists (migration)
        response = make_response(jsonify(response_data))
        if request.cookies.get('watched_shows'):
            response.set_cookie('watched_shows', '', expires=0, httponly=True, samesite='Lax')
        
        return response
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@api_bp.route('/watched/<int:show_id>', methods=['PUT'])
def update_watched(show_id):
    """Update watched content."""
    try:
        data = request.get_json()
        if not data:
            return jsonify({'error': 'Request data is required'}), 400
        
        # Get current watched shows from request body (localStorage) or fallback to cookies
        watched_shows = []
        
        if 'current_watched_shows' in data:
            # Frontend sent current localStorage data
            watched_shows = data['current_watched_shows']
        else:
            # Fallback to cookies for migration
            watched_cookie = request.cookies.get('watched_shows', '[]')
            watched_shows = json.loads(watched_cookie)
        
        # Find and update the show
        show_to_update = next((show for show in watched_shows if show['id'] == show_id), None)
        if not show_to_update:
            return jsonify({'error': 'Show not found in watched list'}), 404
        
        # Update the show data
        if 'seasons_watched' in data:
            show_to_update['seasons_watched'] = data['seasons_watched']
        
        # Return updated data for localStorage storage (no cookies)
        response_data = {
            'success': True, 
            'show': show_to_update,
            'updated_watched_shows': watched_shows
        }
        
        # Clear legacy cookie if it exists (migration)
        response = make_response(jsonify(response_data))
        if request.cookies.get('watched_shows'):
            response.set_cookie('watched_shows', '', expires=0, httponly=True, samesite='Lax')
        
        return response
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@api_bp.route('/watched/<int:show_id>', methods=['DELETE'])
def remove_watched(show_id):
    """Remove watched content."""
    try:
        data = request.get_json() or {}
        
        # Get current watched shows from request body (localStorage) or fallback to cookies
        watched_shows = []
        
        if 'current_watched_shows' in data:
            # Frontend sent current localStorage data
            watched_shows = data['current_watched_shows']
        else:
            # Fallback to cookies for migration
            watched_cookie = request.cookies.get('watched_shows', '[]')
            watched_shows = json.loads(watched_cookie)
        
        # Remove the show
        watched_shows = [show for show in watched_shows if show['id'] != show_id]
        
        # Return updated data for localStorage storage (no cookies)
        response_data = {
            'success': True,
            'updated_watched_shows': watched_shows
        }
        
        # Clear legacy cookie if it exists (migration)
        response = make_response(jsonify(response_data))
        if request.cookies.get('watched_shows'):
            response.set_cookie('watched_shows', '', expires=0, httponly=True, samesite='Lax')
        
        return response
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@api_bp.route('/watched', methods=['DELETE'])
def clear_all_watched():
    """Clear all watched shows data."""
    try:
        # Create response that clears both watched shows and sort preference cookies
        response = make_response(jsonify({'success': True, 'message': 'All data cleared successfully'}))
        
        # Clear the watched shows cookie by setting it to empty and expiring it (migration cleanup)
        response.set_cookie(
            'watched_shows',
            '',
            expires=0,
            httponly=True,
            samesite='Lax'
        )
        
        # Also clear the sort preference cookie (not HTTP-only, but clear it from server for consistency)
        response.set_cookie(
            'sort_preference',
            '',
            expires=0,
            samesite='Lax'
        )
        
        return response
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@api_bp.route('/watched/calculate', methods=['POST'])
def calculate_watched():
    """Calculate watched shows statistics from localStorage data."""
    try:
        data = request.get_json()
        if not data:
            return jsonify({'error': 'Request data is required'}), 400
        
        watched_shows = data.get('watched_shows', [])
        
        # Calculate total watch time
        calc_service = get_calc_service()
        total_time = calc_service.calculate_total_time(watched_shows)
        
        return jsonify({
            'watched_shows': watched_shows,
            'total_time_minutes': total_time,
            'total_time_formatted': calc_service.format_time(total_time)
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@api_bp.route('/stats/calculate', methods=['POST'])
def calculate_stats():
    """Calculate viewing statistics from localStorage data."""
    try:
        data = request.get_json()
        if not data:
            return jsonify({'error': 'Request data is required'}), 400
        
        watched_shows = data.get('watched_shows', [])
        
        calc_service = get_calc_service()
        stats = calc_service.calculate_stats(watched_shows)
        
        return jsonify(stats)
    except Exception as e:
        return jsonify({'error': str(e)}), 500