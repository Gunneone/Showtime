"""CRUD for the watched-shows list (which really lives in the browser)."""

import json
import logging
from datetime import datetime, timezone

from flask import request, jsonify, make_response

from src.routes import api
from . import helpers
from ...services.metrics_service import get_metrics_service

logger = logging.getLogger(__name__)
api_bp = api.api_bp
MAX_SEASONS = helpers.MAX_SEASONS


def _season_selection(data, show_details, default_count):
    """Work out what a write means for a show's seasons.

    Returns ``(seasons_watched, seasons, None)`` where ``seasons`` is an
    explicit ascending list or ``None`` for the plain "seasons 1..N" shape,
    or ``(None, None, response)`` with an error tuple.

    An explicit list wins over any count sent alongside it, so
    ``seasons_watched == len(watched_seasons)`` holds by construction rather
    than by the client getting it right. A body that does not mention
    ``watched_seasons`` at all means 1..N, which is what an older client sends
    and why the caller must clear any list already on the record.
    """
    total_seasons = show_details.get('number_of_seasons') or MAX_SEASONS
    seasons, error = helpers._watched_seasons(
        data, max_season=min(MAX_SEASONS, total_seasons)
    )
    if error:
        return None, None, error

    if seasons is helpers.MISSING or seasons is None:
        count = helpers._coerce_int(
            data.get('seasons_watched', default_count),
            minimum=0, maximum=MAX_SEASONS,
        )
        if count is None:
            return None, None, (
                jsonify({'error': 'seasons_watched must be a whole number'}),
                400,
            )
        return count, None, None

    return len(seasons), seasons, None


@api_bp.route('/watched', methods=['GET'])
def get_watched():
    """Get watched list from localStorage (via request body) or fallback to cookies for migration."""
    try:
        watched_shows = []

        # Try to get data from request body (localStorage data sent by frontend)
        if request.is_json and request.get_json():
            data = request.get_json()
            watched_shows, error = helpers._watched_list(data)
            if error:
                return error
        else:
            # Fallback to cookies for backward compatibility / migration
            watched_cookie = request.cookies.get('watched_shows', '[]')

            # URL decode the cookie value if needed
            import urllib.parse
            if watched_cookie.startswith('%'):
                watched_cookie = urllib.parse.unquote(watched_cookie)

            watched_shows = json.loads(watched_cookie)

        # Calculate total watch time
        calc_service = api.get_calc_service()
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

        show_id = helpers._coerce_int(data.get('id'), minimum=1)
        if show_id is None:
            return jsonify({'error': 'A numeric show ID is required'}), 400

        # Get current watched shows from request body (localStorage) or fallback to cookies
        watched_shows = []

        if 'current_watched_shows' in data:
            # Frontend sent current localStorage data
            watched_shows, error = helpers._watched_list(data, 'current_watched_shows')
            if error:
                return error
        else:
            # Fallback to cookies for migration
            watched_cookie = request.cookies.get('watched_shows', '[]')
            watched_shows = json.loads(watched_cookie)

        # Get show details from TMDB
        tmdb_service = api.get_tmdb_service()
        show_details = tmdb_service.get_show_details(show_id)
        if not show_details:
            return jsonify({'error': 'Show not found'}), 404

        # Check if show already exists
        existing_show = next((show for show in watched_shows if show['id'] == show_id), None)

        if existing_show:
            metrics = get_metrics_service()
            metrics.record_event('shows_updated')
            metrics.record_engagement(request)
            # Update existing show - recalculate runtime for the new selection
            seasons_watched, seasons, error = _season_selection(
                data, show_details, existing_show['seasons_watched']
            )
            if error:
                return error
            existing_show['seasons_watched'] = seasons_watched
            helpers._store_watched_seasons(existing_show, seasons)
            # Recalculate precise runtime and season details for the updated selection
            calculated_runtime, season_details_array = helpers.calculate_precise_show_runtime(
                tmdb_service, show_id, seasons_watched, show_details,
                season_numbers=seasons
            )
            existing_show['calculated_runtime_minutes'] = calculated_runtime
            existing_show['season_details'] = season_details_array
            # Update released seasons count (in case it changed since the show was added)
            existing_show['released_seasons'] = tmdb_service.get_released_seasons_count(show_id, show_details.get('number_of_seasons', 1))
            # Update TMDB data (popularity, backdrop_path) in case it's missing or changed
            existing_show['backdrop_path'] = show_details.get('backdrop_path')
            existing_show['popularity'] = show_details.get('popularity')
        else:
            metrics = get_metrics_service()
            metrics.record_event('shows_added')
            metrics.record_show_added(show_details)
            metrics.record_engagement(request)

            # Add new show with precise runtime calculation
            seasons_watched, seasons, error = _season_selection(data, show_details, 1)
            if error:
                return error

            # Get default episode runtime
            episode_runtime = 45  # default
            if show_details.get('episode_run_time'):
                runtime_data = show_details['episode_run_time']
                if isinstance(runtime_data, list) and len(runtime_data) > 0:
                    episode_runtime = runtime_data[0]
                elif isinstance(runtime_data, int):
                    episode_runtime = runtime_data

            # Calculate precise runtime and season details for the seasons being watched
            calculated_runtime, season_details_array = helpers.calculate_precise_show_runtime(
                tmdb_service, show_id, seasons_watched, show_details,
                season_numbers=seasons
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
                'released_seasons': tmdb_service.get_released_seasons_count(show_id, show_details.get('number_of_seasons', 1)),
                'total_episodes': show_details.get('number_of_episodes', 0),
                'episode_run_time': episode_runtime,
                'calculated_runtime_minutes': calculated_runtime,
                'season_details': season_details_array,
                # When the show was added to the watched list (for "When Added" sort)
                'date_added': datetime.now(timezone.utc).isoformat(),
                # Store only genre names as compact array to save space
                'genres': [genre['name'] for genre in show_details.get('genres', [])],
                # Store only network names as compact array to save space
                'networks': [network['name'] for network in show_details.get('networks', [])]
            }
            # Set after the literal so the key is simply absent for the common
            # contiguous case, rather than a null in every record.
            helpers._store_watched_seasons(new_show, seasons)
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

        metrics = get_metrics_service()
        metrics.record_event('shows_updated')
        metrics.record_engagement(request)

        # Get current watched shows from request body (localStorage) or fallback to cookies
        watched_shows = []

        if 'current_watched_shows' in data:
            # Frontend sent current localStorage data
            watched_shows, error = helpers._watched_list(data, 'current_watched_shows')
            if error:
                return error
        else:
            # Fallback to cookies for migration
            watched_cookie = request.cookies.get('watched_shows', '[]')
            watched_shows = json.loads(watched_cookie)

        # Find and update the show
        show_to_update = next((show for show in watched_shows if show['id'] == show_id), None)
        if not show_to_update:
            return jsonify({'error': 'Show not found in watched list'}), 404

        # Update the show data. A body carrying only watched_seasons still
        # counts as a season change, so gate on either field.
        if 'seasons_watched' in data or 'watched_seasons' in data:
            # Fetched first: the season list is bounded against this show's
            # real season count, so the bound has to be known before parsing.
            tmdb_service = api.get_tmdb_service()
            show_details = tmdb_service.get_show_details(show_id)

            new_seasons_watched, seasons, error = _season_selection(
                data, show_details or {}, show_to_update['seasons_watched']
            )
            if error:
                return error
            show_to_update['seasons_watched'] = new_seasons_watched
            helpers._store_watched_seasons(show_to_update, seasons)

            # Recalculate precise runtime and season details for the new selection
            if show_details:
                calculated_runtime, season_details_array = helpers.calculate_precise_show_runtime(
                    tmdb_service, show_id, new_seasons_watched, show_details,
                    season_numbers=seasons
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
            watched_shows, error = helpers._watched_list(data, 'current_watched_shows')
            if error:
                return error
        else:
            # Fallback to cookies for migration
            watched_cookie = request.cookies.get('watched_shows', '[]')
            watched_shows = json.loads(watched_cookie)

        metrics = get_metrics_service()
        metrics.record_event('shows_removed')
        metrics.record_engagement(request)

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
        get_metrics_service().record_event('libraries_cleared')

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
