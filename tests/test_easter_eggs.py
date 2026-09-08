"""Tests for the per-show easter eggs.

The easter eggs live in the frontend, so these guard the wiring that is easy
to break from the Python side: the module being served, being loaded before
app.js, and still knowing about the shows it is supposed to know about.
"""

import re

import pytest

from app import create_app
from src.config import Config


@pytest.fixture
def client():
    """Create a test client for the app."""
    Config.TMDB_API_KEY = 'test-api-key'
    Config.SECRET_KEY = 'test-secret-key'

    app = create_app()
    app.config['TESTING'] = True

    with app.test_client() as client:
        yield client


def read(path):
    with open(path, 'r') as f:
        return f.read()


def test_easter_eggs_script_is_loaded_before_app():
    base = read('src/templates/base.html')

    egg_pos = base.find("js/easter-eggs.js")
    app_pos = base.find("js/app.js")

    assert egg_pos != -1, "base.html should load the easter egg module"
    assert egg_pos < app_pos, "easter-eggs.js must be loaded before app.js uses it"


def test_easter_eggs_script_is_served(client):
    response = client.get('/static/js/easter-eggs.js')
    assert response.status_code == 200


def test_registered_shows():
    js = read('src/static/js/easter-eggs.js')

    expected = {
        '1695': 'monk',          # Monk
        '12609': 'dragonball',   # Dragon Ball
        '12971': 'dragonball',   # Dragon Ball Z
        '61709': 'dragonball',   # Dragon Ball Z Kai
        '62715': 'dragonball',   # Dragon Ball Super
    }

    for show_id, egg in expected.items():
        assert re.search(rf"^\s*{show_id}:\s*'{egg}'", js, re.MULTILINE), \
            f"show {show_id} should map to the '{egg}' easter egg"


def test_monk_restyles_the_card_and_dragonball_replaces_the_confetti():
    js = read('src/static/js/easter-eggs.js')
    css = read('src/static/css/style.css')

    assert "cardClass: 'easter-egg-monk'" in js
    assert "celebration: 'dragonballs'" in js

    # Monk's poster moves to the other side of the card.
    assert '.watched-show.easter-egg-monk {' in css
    assert 'flex-direction: row-reverse;' in css


def test_app_uses_the_easter_eggs():
    js = read('src/static/js/app.js')

    assert 'EasterEggs.cardClass(show.id)' in js, \
        "watched show cards should pick up the easter egg class"
    assert 'EasterEggs.celebrate(celebrationShowId' in js, \
        "the celebration should offer the easter egg a chance to take over"
    assert 'markCelebrationShow' in js, \
        "adding or updating a show should record which show is celebrating"


def test_default_confetti_still_runs_for_ordinary_shows():
    js = read('src/static/js/app.js')

    # The easter egg hand-off returns early; everything else must still reach
    # the canvas-confetti call underneath it.
    celebrate_index = js.find('EasterEggs.celebrate(celebrationShowId')
    confetti_index = js.find("if (typeof confetti !== 'function')")

    assert celebrate_index != -1 and confetti_index != -1
    assert celebrate_index < confetti_index
