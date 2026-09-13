"""Non-contiguous watched seasons across the write and refresh endpoints.

Show 1 in the TMDB mock (Breaking Bad) has 5 seasons, with real per-episode
fixtures for seasons 1 and 2 only, so a selection that skips season 2 has a
runtime that is visibly different from "the first two seasons".
"""

import pytest

from app import create_app
from src.config import Config
from src.routes.api import helpers
from src.routes.api.refresh import _prune_watched_seasons


@pytest.fixture
def client():
    Config.TMDB_API_KEY = 'test-api-key'
    Config.SECRET_KEY = 'test-secret-key'

    app = create_app()
    app.config['TESTING'] = True

    with app.test_client() as client:
        yield client


@pytest.fixture
def app_context():
    """The parser's error paths build a response, which needs an app."""
    Config.TMDB_API_KEY = 'test-api-key'
    app = create_app()
    with app.app_context():
        yield


def _show(payload, show_id=1):
    return next(s for s in payload['updated_watched_shows'] if s['id'] == show_id)


def _add(client, **body):
    body.setdefault('id', 1)
    body.setdefault('current_watched_shows', [])
    return client.post('/api/watched', json=body)


# --- the request parser -------------------------------------------------

def test_parser_reports_an_absent_key_as_missing():
    seasons, error = helpers._watched_seasons({})
    assert error is None
    assert seasons is helpers.MISSING


def test_parser_reads_null_and_empty_as_an_explicit_clear():
    assert helpers._watched_seasons({'watched_seasons': None}) == (None, None)
    assert helpers._watched_seasons({'watched_seasons': []}) == (None, None)


def test_parser_sorts_and_dedupes():
    seasons, error = helpers._watched_seasons({'watched_seasons': [3, 1, 3]})
    assert error is None
    assert seasons == [1, 3]


def test_parser_drops_out_of_range_numbers_without_failing():
    seasons, error = helpers._watched_seasons(
        {'watched_seasons': [0, 2, 400]}, max_season=5
    )
    assert error is None
    assert seasons == [2]


def test_parser_rejects_a_non_list(app_context):
    seasons, error = helpers._watched_seasons({'watched_seasons': 3})
    assert seasons is None
    assert error[1] == 400


def test_parser_rejects_non_integer_entries(app_context):
    seasons, error = helpers._watched_seasons({'watched_seasons': [1, 'two']})
    assert seasons is None
    assert error[1] == 400


def test_parser_bounds_the_list_length(app_context):
    seasons, error = helpers._watched_seasons({'watched_seasons': list(range(200))})
    assert seasons is None
    assert error[1] == 413


# --- canonical storage --------------------------------------------------

def test_a_plain_prefix_is_not_stored_as_a_list():
    show = {}
    helpers._store_watched_seasons(show, [1, 2, 3])
    assert 'watched_seasons' not in show


def test_a_selection_with_gaps_is_stored():
    show = {}
    helpers._store_watched_seasons(show, [1, 3])
    assert show['watched_seasons'] == [1, 3]


def test_storing_none_clears_a_stale_list():
    show = {'watched_seasons': [1, 3]}
    helpers._store_watched_seasons(show, None)
    assert 'watched_seasons' not in show


# --- POST /api/watched --------------------------------------------------

def test_adding_a_gapped_selection_records_exactly_those_seasons(client):
    response = _add(client, watched_seasons=[1, 3])
    assert response.status_code == 200

    show = _show(response.get_json())
    assert show['seasons_watched'] == 2
    assert show['watched_seasons'] == [1, 3]
    assert [d['season_number'] for d in show['season_details']] == [1, 3]


def test_a_gapped_selection_does_not_bill_the_skipped_season(client):
    gapped = _show(_add(client, watched_seasons=[1, 3]).get_json())
    prefix = _show(_add(client, seasons_watched=2).get_json())

    assert gapped['calculated_runtime_minutes'] != prefix['calculated_runtime_minutes']
    # Season 1 is shared, so the difference is season 3's estimate against
    # season 2's precise runtime.
    assert gapped['season_details'][0] == prefix['season_details'][0]


def test_a_contiguous_selection_is_stored_the_classic_way(client):
    listed = _show(_add(client, watched_seasons=[1, 2]).get_json())
    counted = _show(_add(client, seasons_watched=2).get_json())

    assert 'watched_seasons' not in listed
    assert listed['seasons_watched'] == 2
    assert listed['calculated_runtime_minutes'] == counted['calculated_runtime_minutes']


def test_seasons_beyond_the_show_are_dropped(client):
    # Show 1 has 5 seasons, so 99 cannot be watched.
    show = _show(_add(client, watched_seasons=[1, 99]).get_json())
    assert show['seasons_watched'] == 1
    assert 'watched_seasons' not in show


def test_an_explicit_list_wins_over_a_disagreeing_count(client):
    show = _show(_add(client, seasons_watched=9, watched_seasons=[1, 4]).get_json())
    assert show['seasons_watched'] == 2
    assert show['watched_seasons'] == [1, 4]


def test_a_count_only_add_clears_a_stale_list(client):
    existing = _show(_add(client, watched_seasons=[1, 3]).get_json())

    response = _add(client, seasons_watched=2, current_watched_shows=[existing])
    show = _show(response.get_json())

    assert 'watched_seasons' not in show
    assert [d['season_number'] for d in show['season_details']] == [1, 2]


def test_a_malformed_list_is_rejected(client):
    assert _add(client, watched_seasons='1,2').status_code == 400


# --- PUT /api/watched/<id> ---------------------------------------------

def test_updating_to_a_gapped_selection_recalculates(client):
    existing = _show(_add(client, seasons_watched=2).get_json())

    response = client.put('/api/watched/1', json={
        'watched_seasons': [1, 4],
        'current_watched_shows': [existing],
    })
    assert response.status_code == 200

    show = _show(response.get_json())
    assert show['seasons_watched'] == 2
    assert show['watched_seasons'] == [1, 4]
    assert [d['season_number'] for d in show['season_details']] == [1, 4]
    assert show['calculated_runtime_minutes'] != existing['calculated_runtime_minutes']


def test_a_count_only_update_clears_a_stale_list(client):
    existing = _show(_add(client, watched_seasons=[1, 3]).get_json())

    response = client.put('/api/watched/1', json={
        'seasons_watched': 2,
        'current_watched_shows': [existing],
    })
    show = _show(response.get_json())

    assert 'watched_seasons' not in show
    assert [d['season_number'] for d in show['season_details']] == [1, 2]


def test_an_update_back_to_a_prefix_drops_the_list(client):
    existing = _show(_add(client, watched_seasons=[1, 3]).get_json())

    response = client.put('/api/watched/1', json={
        'watched_seasons': [1, 2],
        'current_watched_shows': [existing],
    })
    show = _show(response.get_json())

    assert 'watched_seasons' not in show
    assert show['seasons_watched'] == 2


# --- runtime calculation -----------------------------------------------

def test_a_season_without_episode_data_still_yields_one_detail_entry(client):
    # Season 5 of show 1 has no episode fixtures, so the per-season average
    # fallback runs - and must still be attributed to season 5.
    show = _show(_add(client, watched_seasons=[5]).get_json())

    assert show['seasons_watched'] == 1
    assert [d['season_number'] for d in show['season_details']] == [5]
    assert show['calculated_runtime_minutes'] > 0
    # A single season 5 is not a prefix, so the list is kept.
    assert show['watched_seasons'] == [5]


# --- stats --------------------------------------------------------------

def test_stats_count_the_seasons_and_date_them_correctly(client):
    show = _show(_add(client, watched_seasons=[1, 4]).get_json())

    response = client.post('/api/stats/calculate', json={'watched_shows': [show]})
    stats = response.get_json()

    assert stats['total_seasons'] == 2
    years = {year for year, minutes in stats['yearly_breakdown'].items() if minutes > 0}
    # Breaking Bad seasons 1 and 4 aired in 2008 and 2011.
    assert years == {'2008', '2011'}


# --- refresh pruning ----------------------------------------------------

def test_pruning_drops_seasons_that_no_longer_exist():
    show = {
        'seasons_watched': 2,
        'watched_seasons': [1, 6],
        'season_details': [
            {'season_number': 1, 'runtime_minutes': 300, 'air_date': '2008-01-20'},
            {'season_number': 6, 'runtime_minutes': 200, 'air_date': '2013-01-01'},
        ],
        'calculated_runtime_minutes': 500,
    }

    _prune_watched_seasons(show, total_seasons=5)

    assert show['seasons_watched'] == 1
    assert 'watched_seasons' not in show  # [1] is a plain prefix again
    assert [d['season_number'] for d in show['season_details']] == [1]
    assert show['calculated_runtime_minutes'] == 300


def test_pruning_leaves_a_valid_selection_alone():
    show = {'seasons_watched': 2, 'watched_seasons': [1, 3]}
    _prune_watched_seasons(show, total_seasons=5)
    assert show['watched_seasons'] == [1, 3]


def test_pruning_ignores_records_without_a_list():
    show = {'seasons_watched': 9}
    _prune_watched_seasons(show, total_seasons=5)
    assert show == {'seasons_watched': 9}


def test_refreshing_a_show_keeps_a_valid_selection(client):
    existing = _show(_add(client, watched_seasons=[1, 3]).get_json())

    response = client.post('/api/refresh-show-seasons/1',
                           json={'watched_shows': [existing]})
    assert response.status_code == 200

    show = _show(response.get_json())
    assert show['watched_seasons'] == [1, 3]
    assert show['seasons_watched'] == 2
