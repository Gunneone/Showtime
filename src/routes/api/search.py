"""Search, typo-fallback search, recommendations, and on-demand season data."""

import logging

from flask import request, jsonify

from src.routes import api
from . import helpers
from ...services.search_cache_service import get_search_cache
from ...services.metrics_service import get_metrics_service

logger = logging.getLogger(__name__)
api_bp = api.api_bp


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
        get_metrics_service().record_event('searches')

        # Check cache first
        cache = get_search_cache()
        cached_result = cache.get(query, page)

        if cached_result:
            # Return cached result
            print(f"Cache hit for query: {query} (page {page})")
            return jsonify(cached_result)

        # Cache miss - call TMDB API
        print(f"Cache miss for query: {query} (page {page})")
        tmdb_service = api.get_tmdb_service()
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
        watched_shows, error = helpers._watched_list(data)
        if error:
            return error

        get_metrics_service().record_event('recommendations_requested')

        return jsonify(api.get_rec_service().build_recommendations(watched_shows))
    except Exception as e:
        logger.exception("Unhandled error in %s", request.path)
        return jsonify({'error': str(e)}), 500


@api_bp.route('/show/<int:show_id>/seasons')
def get_show_seasons(show_id):
    """Get season data for a specific show."""
    try:
        tmdb_service = api.get_tmdb_service()
        season_data = tmdb_service.get_show_season_data(show_id)
        return jsonify(season_data)
    except Exception as e:
        logger.exception("Unhandled error in %s", request.path)
        return jsonify({'error': str(e)}), 500
