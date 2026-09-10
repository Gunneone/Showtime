"""Shared limits, request parsing, and service factories for the API routes."""

from flask import jsonify
from ...services.tmdb_service import TMDBService
from ...services.calculation_service import CalculationService
from ...services.recommendation_service import RecommendationService

# Upper bound on how many seasons a single show may contribute. The longest
# real TV runs sit well under this; the cap exists so a request body cannot
# drive calculate_precise_show_runtime() into a multi-million iteration loop
# with one uncached TMDB call per iteration.
MAX_SEASONS = 100

# Upper bound on the watched-shows list a single request body may carry. The
# list is the browser's localStorage, so it is entirely client-supplied.
MAX_WATCHED_SHOWS = 1000


def _coerce_int(value, *, minimum=None, maximum=None):
    """Coerce a JSON value to a whole number, clamped to [minimum, maximum].

    Returns None when the value is not a whole number so the caller can reject
    the request rather than guess. Booleans are rejected (``True`` is not a
    season count).
    """
    if isinstance(value, bool):
        return None
    if isinstance(value, int):
        result = value
    elif isinstance(value, float) and value.is_integer():
        result = int(value)
    elif isinstance(value, str):
        try:
            result = int(value.strip())
        except (TypeError, ValueError):
            return None
    else:
        return None
    if minimum is not None:
        result = max(minimum, result)
    if maximum is not None:
        result = min(maximum, result)
    return result


def _watched_list(data, key='watched_shows'):
    """Pull a bounded watched-shows list out of a request body.

    Returns ``(list, None)`` on success, or ``(None, response)`` where
    ``response`` is a ready-to-return error tuple. The length cap keeps one
    request from fanning out into thousands of TMDB calls or a giant
    allocation.
    """
    shows = data.get(key, [])
    if not isinstance(shows, list):
        return None, (jsonify({'error': f'{key} must be a list'}), 400)
    if len(shows) > MAX_WATCHED_SHOWS:
        return None, (
            jsonify({'error': f'{key} is limited to {MAX_WATCHED_SHOWS} entries'}),
            413,
        )
    return shows, None


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
    # Defensive clamp: the route handlers validate this, but this is the loop
    # that would otherwise run unbounded on a hostile value.
    seasons_watched = max(0, min(int(seasons_watched), MAX_SEASONS))
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
