"""Re-fetch total / released season counts for one or all watched shows."""

import logging

from flask import request, jsonify

from src.routes import api
from . import helpers

logger = logging.getLogger(__name__)
api_bp = api.api_bp


def _prune_watched_seasons(show, total_seasons):
    """Drop watched seasons that no longer exist upstream.

    TMDB occasionally renumbers or merges a run, which can leave an explicit
    selection pointing at a season that is gone. Keep the record self-
    consistent (seasons_watched, watched_seasons, season_details and
    calculated_runtime_minutes all agreeing) without spending a TMDB call per
    season: this runs over the whole library.
    """
    if not isinstance(show.get('watched_seasons'), list) or not show['watched_seasons']:
        return

    seasons = helpers.resolve_watched_seasons(show)
    kept = [season for season in seasons if season <= total_seasons]
    if len(kept) == len(seasons):
        return

    dropped = set(seasons) - set(kept)
    details = show.get('season_details') or []
    removed_runtime = sum(
        detail.get('runtime_minutes', 0) for detail in details
        if detail.get('season_number') in dropped
    )
    show['season_details'] = [
        detail for detail in details if detail.get('season_number') not in dropped
    ]
    if 'calculated_runtime_minutes' in show:
        show['calculated_runtime_minutes'] = max(
            0, int(show['calculated_runtime_minutes']) - removed_runtime
        )
    show['seasons_watched'] = len(kept)
    # Pruning [1, 3] down to [1] leaves a plain prefix again, so the key goes.
    helpers._store_watched_seasons(show, kept)


@api_bp.route('/refresh-seasons', methods=['POST'])
def refresh_all_seasons():
    """Refresh season counts for all shows in the watched list."""
    try:
        data = request.get_json()
        if not data:
            return jsonify({'error': 'Request data is required'}), 400

        watched_shows, error = helpers._watched_list(data)
        if error:
            return error
        if not watched_shows:
            return jsonify({'error': 'No shows to refresh'}), 400

        tmdb_service = api.get_tmdb_service()
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
                    _prune_watched_seasons(updated_show, total_seasons)

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

        watched_shows, error = helpers._watched_list(data)
        if error:
            return error
        show_to_update = next((show for show in watched_shows if show['id'] == show_id), None)

        if not show_to_update:
            return jsonify({'error': 'Show not found in watched list'}), 404

        tmdb_service = api.get_tmdb_service()

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
        _prune_watched_seasons(show_to_update, total_seasons)

        return jsonify({
            'success': True,
            'updated_show': show_to_update,
            'updated_watched_shows': watched_shows
        })
    except Exception as e:
        logger.exception("Unhandled error in %s", request.path)
        return jsonify({'error': str(e)}), 500
