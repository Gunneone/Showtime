from flask import Blueprint, request, jsonify, make_response
import json
import logging
from ..services.tmdb_service import TMDBService
from ..services.calculation_service import CalculationService
from ..services.search_cache_service import get_search_cache
from ..services.recommendation_service import RecommendationService

logger = logging.getLogger(__name__)

api_bp = Blueprint('api', __name__)

def get_tmdb_service():
    """Get TMDB service instance."""
    from flask import current_app
    service = TMDBService()
    # Enable mock data for testing
    if current_app and current_app.config.get('TESTING', False):
        service.use_mock_data_for_testing()
    return service

def get_calc_service():
    """Get calculation service instance."""
    return CalculationService()

def get_rec_service():
    """Get recommendation service instance, sharing the TMDB service so the
    testing mock applies to recommendations too."""
    return RecommendationService(tmdb_service=get_tmdb_service())

def calculate_precise_show_runtime(tmdb_service, show_id, seasons_watched, show_details):
    """Calculate precise runtime and collect per-season details (runtime + air date)."""
    total_runtime = 0
    season_details_array = []
    default_episode_runtime = show_details.get('episode_run_time', 45)
    
    for season_num in range(1, seasons_watched + 1):
        try:
            # Get precise episode data for this season
            season_details = tmdb_service.get_season_details(show_id, season_num)
            episodes = season_details.get('episodes', [])
            season_air_date = season_details.get('air_date', '')
            
            if episodes:
                # Sum up actual episode runtimes for this season
                season_runtime = 0
                for episode in episodes:
                    episode_runtime = episode.get('runtime')
                    if episode_runtime and episode_runtime > 0:
                        season_runtime += episode_runtime
                    else:
                        # Fallback to show's default runtime for missing episode data
                        season_runtime += default_episode_runtime
                total_runtime += season_runtime
            else:
                # Fallback: estimate based on total episodes/seasons ratio
                total_episodes = show_details.get('number_of_episodes', 0)
                total_seasons = show_details.get('number_of_seasons', 1)
                
                if total_episodes > 0 and total_seasons > 0:
                    episodes_per_season = total_episodes / total_seasons
                else:
                    episodes_per_season = 20  # Default assumption
                
                season_runtime = episodes_per_season * default_episode_runtime
                total_runtime += season_runtime
            
            # Store season details for client-side use
            season_details_array.append({
                'season_number': season_num,
                'runtime_minutes': int(season_runtime),
                'air_date': season_air_date if season_air_date else show_details.get('first_air_date', '')
            })
                
        except Exception as e:
            # If season data fails, use fallback calculation
            print(f"Failed to get season {season_num} data for show {show_id}: {e}")
            total_episodes = show_details.get('number_of_episodes', 0)
            total_seasons = show_details.get('number_of_seasons', 1)
            
            if total_episodes > 0 and total_seasons > 0:
                episodes_per_season = total_episodes / total_seasons
            else:
                episodes_per_season = 20
            
            season_runtime = episodes_per_season * default_episode_runtime
            total_runtime += season_runtime
            
            # Store fallback season details
            season_details_array.append({
                'season_number': season_num,
                'runtime_minutes': int(season_runtime),
                'air_date': show_details.get('first_air_date', '')
            })
    
    return int(total_runtime), season_details_array

@api_bp.route('/search')
def search():
    """Search for shows using the TMDB API, with caching and season data included."""
    query = request.args.get('query', '').strip()
    if not query:
        return jsonify({'error': 'Query parameter is required'}), 400

    try:
        page = int(request.args.get('page', 1))
    except (TypeError, ValueError):
        return jsonify({'error': 'Page parameter must be a number'}), 400

    if page < 1:
        return jsonify({'error': 'Page parameter must be 1 or greater'}), 400

    try:
        # Check cache first
        cache = get_search_cache()
        cached_result = cache.get(query, page)

        if cached_result:
            # Return cached result
            print(f"Cache hit for query: {query} (page {page})")
            return jsonify(cached_result)

        # Cache miss - call TMDB API
        print(f"Cache miss for query: {query} (page {page})")
        tmdb_service = get_tmdb_service()
        results = tmdb_service.search_shows_with_fallback(query, page)

        # Cache the result
        cache.set(query, results, page)

        return jsonify(results)
    except Exception as e:
        logger.exception("Unhandled error in %s", request.path)
        return jsonify({'error': str(e)}), 500

@api_bp.route('/recommendations', methods=['POST'])
def recommendations():
    """Suggest shows to log, based on the shows already logged.

    Watch data lives in the browser, so the client posts its list the same way
    the calculation endpoints take it.
    """
    try:
        data = request.get_json(silent=True) or {}
        watched_shows = data.get('watched_shows', [])

        if not isinstance(watched_shows, list):
            return jsonify({'error': 'watched_shows must be a list'}), 400

        return jsonify(get_rec_service().build_recommendations(watched_shows))
    except Exception as e:
        logger.exception("Unhandled error in %s", request.path)
        return jsonify({'error': str(e)}), 500

@api_bp.route('/show/<int:show_id>/seasons')
def get_show_seasons(show_id):
    """Get season data for a specific show."""
    try:
        tmdb_service = get_tmdb_service()
        season_data = tmdb_service.get_show_season_data(show_id)
        return jsonify(season_data)
    except Exception as e:
        logger.exception("Unhandled error in %s", request.path)
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
        logger.exception("Unhandled error in %s", request.path)
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
            # Update existing show - recalculate runtime for new seasons count
            seasons_watched = data.get('seasons_watched', existing_show['seasons_watched'])
            existing_show['seasons_watched'] = seasons_watched
            # Recalculate precise runtime and season details for the updated seasons count
            calculated_runtime, season_details_array = calculate_precise_show_runtime(
                tmdb_service, data['id'], seasons_watched, show_details
            )
            existing_show['calculated_runtime_minutes'] = calculated_runtime
            existing_show['season_details'] = season_details_array
            # Update released seasons count (in case it changed since the show was added)
            existing_show['released_seasons'] = tmdb_service.get_released_seasons_count(data['id'], show_details.get('number_of_seasons', 1))
            # Update TMDB data (popularity, backdrop_path) in case it's missing or changed
            existing_show['backdrop_path'] = show_details.get('backdrop_path')
            existing_show['popularity'] = show_details.get('popularity')
        else:
            # Add new show with precise runtime calculation
            seasons_watched = data.get('seasons_watched', 1)
            
            # Get default episode runtime
            episode_runtime = 45  # default
            if show_details.get('episode_run_time'):
                runtime_data = show_details['episode_run_time']
                if isinstance(runtime_data, list) and len(runtime_data) > 0:
                    episode_runtime = runtime_data[0]
                elif isinstance(runtime_data, int):
                    episode_runtime = runtime_data
            
            # Calculate precise runtime and season details for the seasons being watched
            calculated_runtime, season_details_array = calculate_precise_show_runtime(
                tmdb_service, data['id'], seasons_watched, show_details
            )
            
            new_show = {
                'id': show_details['id'],
                'name': show_details['name'],
                'poster_path': show_details.get('poster_path'),
                'backdrop_path': show_details.get('backdrop_path'),
                'first_air_date': show_details.get('first_air_date'),
                'popularity': show_details.get('popularity'),
                'seasons_watched': seasons_watched,
                'total_seasons': show_details.get('number_of_seasons', 1),
                'released_seasons': tmdb_service.get_released_seasons_count(data['id'], show_details.get('number_of_seasons', 1)),
                'total_episodes': show_details.get('number_of_episodes', 0),
                'episode_run_time': episode_runtime,
                'calculated_runtime_minutes': calculated_runtime,
                'season_details': season_details_array,
                # Store only genre names as compact array to save space
                'genres': [genre['name'] for genre in show_details.get('genres', [])],
                # Store only network names as compact array to save space
                'networks': [network['name'] for network in show_details.get('networks', [])]
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
        logger.exception("Unhandled error in %s", request.path)
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
            new_seasons_watched = data['seasons_watched']
            show_to_update['seasons_watched'] = new_seasons_watched
            
            # Recalculate precise runtime and season details for the new seasons count
            tmdb_service = get_tmdb_service()
            show_details = tmdb_service.get_show_details(show_id)
            if show_details:
                calculated_runtime, season_details_array = calculate_precise_show_runtime(
                    tmdb_service, show_id, new_seasons_watched, show_details
                )
                show_to_update['calculated_runtime_minutes'] = calculated_runtime
                show_to_update['season_details'] = season_details_array
                # Update released seasons count (in case it changed since the show was added)
                show_to_update['released_seasons'] = tmdb_service.get_released_seasons_count(show_id, show_details.get('number_of_seasons', 1))
                # Update TMDB data (popularity, backdrop_path) in case it's missing or changed
                show_to_update['backdrop_path'] = show_details.get('backdrop_path')
                show_to_update['popularity'] = show_details.get('popularity')
        
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
        logger.exception("Unhandled error in %s", request.path)
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
        logger.exception("Unhandled error in %s", request.path)
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
        logger.exception("Unhandled error in %s", request.path)
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
        logger.exception("Unhandled error in %s", request.path)
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
        logger.exception("Unhandled error in %s", request.path)
        return jsonify({'error': str(e)}), 500

@api_bp.route('/refresh-seasons', methods=['POST'])
def refresh_all_seasons():
    """Refresh season counts for all shows in the watched list."""
    try:
        data = request.get_json()
        if not data:
            return jsonify({'error': 'Request data is required'}), 400
        
        watched_shows = data.get('watched_shows', [])
        if not watched_shows:
            return jsonify({'error': 'No shows to refresh'}), 400
        
        tmdb_service = get_tmdb_service()
        updated_shows = []
        
        for show in watched_shows:
            try:
                # Get current show details from TMDB
                show_details = tmdb_service.get_show_details(show['id'])
                if show_details:
                    # Update total seasons and released seasons
                    total_seasons = show_details.get('number_of_seasons', show.get('total_seasons', 1))
                    released_seasons = tmdb_service.get_released_seasons_count(show['id'], total_seasons)
                    
                    # Update the show data
                    updated_show = show.copy()
                    updated_show['total_seasons'] = total_seasons
                    updated_show['released_seasons'] = released_seasons
                    
                    updated_shows.append(updated_show)
                else:
                    # Keep original show if can't fetch details
                    updated_shows.append(show)
            except Exception as e:
                print(f"Failed to refresh seasons for show {show['id']}: {e}")
                # Keep original show if refresh fails
                updated_shows.append(show)
        
        return jsonify({
            'success': True,
            'updated_watched_shows': updated_shows
        })
    except Exception as e:
        logger.exception("Unhandled error in %s", request.path)
        return jsonify({'error': str(e)}), 500

@api_bp.route('/refresh-show-seasons/<int:show_id>', methods=['POST'])
def refresh_show_seasons(show_id):
    """Refresh season count for a specific show."""
    try:
        data = request.get_json()
        if not data:
            return jsonify({'error': 'Request data is required'}), 400
        
        watched_shows = data.get('watched_shows', [])
        show_to_update = next((show for show in watched_shows if show['id'] == show_id), None)
        
        if not show_to_update:
            return jsonify({'error': 'Show not found in watched list'}), 404
        
        tmdb_service = get_tmdb_service()
        
        # Get current show details from TMDB
        show_details = tmdb_service.get_show_details(show_id)
        if not show_details:
            return jsonify({'error': 'Show not found in TMDB'}), 404
        
        # Update total seasons and released seasons
        total_seasons = show_details.get('number_of_seasons', show_to_update.get('total_seasons', 1))
        released_seasons = tmdb_service.get_released_seasons_count(show_id, total_seasons)
        
        # Update the show data
        show_to_update['total_seasons'] = total_seasons
        show_to_update['released_seasons'] = released_seasons
        
        return jsonify({
            'success': True,
            'updated_show': show_to_update,
            'updated_watched_shows': watched_shows
        })
    except Exception as e:
        logger.exception("Unhandled error in %s", request.path)
        return jsonify({'error': str(e)}), 500