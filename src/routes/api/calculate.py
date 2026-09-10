"""Recompute watch time and viewing stats from a posted localStorage payload."""

import logging

from flask import request, jsonify

from src.routes import api
from . import helpers
from ...services.metrics_service import get_metrics_service

logger = logging.getLogger(__name__)
api_bp = api.api_bp


@api_bp.route('/watched/calculate', methods=['POST'])
def calculate_watched():
    """Calculate watched shows statistics from localStorage data."""
    try:
        data = request.get_json()
        if not data:
            return jsonify({'error': 'Request data is required'}), 400

        watched_shows, error = helpers._watched_list(data)
        if error:
            return error

        get_metrics_service().record_library_size(request, len(watched_shows))

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


@api_bp.route('/stats/calculate', methods=['POST'])
def calculate_stats():
    """Calculate viewing statistics from localStorage data."""
    try:
        data = request.get_json()
        if not data:
            return jsonify({'error': 'Request data is required'}), 400

        watched_shows, error = helpers._watched_list(data)
        if error:
            return error

        get_metrics_service().record_library_size(request, len(watched_shows))

        calc_service = api.get_calc_service()
        stats = calc_service.calculate_stats(watched_shows)

        return jsonify(stats)
    except Exception as e:
        logger.exception("Unhandled error in %s", request.path)
        return jsonify({'error': str(e)}), 500
