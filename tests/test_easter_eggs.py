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
        '246': 'avatar',         # Avatar: The Last Airbender (2005)
        '82452': 'avatar',       # Avatar: The Last Airbender (2024)
        '97546': 'tedLasso',     # Ted Lasso
        '1973': 'segmentDisplay',  # 24
        '2490': 'segmentDisplay',  # The IT Crowd
        '1396': 'breakingBad',     # Breaking Bad
        '66732': 'strangerThings',  # Stranger Things
        '2316': 'office',          # The Office (US)
        '60625': 'rickAndMorty',   # Rick and Morty
        '456': 'simpsons',         # The Simpsons
        '1668': 'friends',         # Friends
        '93405': 'squidGame',      # Squid Game
        '19885': 'sherlock',       # Sherlock
    }

    for show_id, egg in expected.items():
        assert re.search(rf"^\s*{show_id}:\s*'{egg}'", js, re.MULTILINE), \
            f"show {show_id} should map to the '{egg}' easter egg"


def test_ted_lasso_kicks_footballs_instead_of_confetti(client):
    js = read('src/static/js/easter-eggs.js')

    assert "celebration: 'footballs'" in js
    assert 'FootballAnimation.fire(options)' in js, \
        "the footballs celebration should run the football animation"

    # The ball is a vendored SVG served from this origin, not hotlinked.
    assert "ballUrl: '/static/images/soccerball.svg'" in js
    assert client.get('/static/images/soccerball.svg').status_code == 200

    # Where it came from and what may be done with it has to stay written
    # down next to it.
    images_readme = read('src/static/images/README.md')
    assert 'commons.wikimedia.org/wiki/File:Soccerball.svg' in images_readme
    assert 'public domain' in images_readme.lower()

    # Adding the show loads the ball, so the celebration does not wait on it.
    assert 'FootballAnimation.ready();' in js


def test_avatar_bends_the_four_elements_in_order():
    js = read('src/static/js/easter-eggs.js')

    assert "celebration: 'elementBending'" in js

    # The opening titles' order is the whole point of the easter egg.
    assert "order: ['water', 'earth', 'fire', 'air']" in js, \
        "the elements should be bent in the order water, earth, fire, air"

    # Each element is played as its own segment of the source animation.
    for element in ('water', 'earth', 'fire', 'air'):
        assert re.search(rf"^\s*{element}: \[\d+, \d+\]", js, re.MULTILINE), \
            f"'{element}' needs a frame range in the source animation"


def test_avatar_celebration_fits_in_three_seconds():
    js = read('src/static/js/easter-eggs.js')

    def number(name):
        match = re.search(rf"^\s*{name}: ([\d.]+),", js, re.MULTILINE)
        assert match, f"{name} should be a number the animation can be timed by"
        return float(match.group(1))

    element = number('elementSeconds')
    stagger = number('staggerSeconds')

    # Three gaps between four elements, plus the last one playing out.
    assert stagger * 3 + element <= 3.0, "the whole celebration should fit in three seconds"
    # Each element is still on screen when the next one starts to draw.
    assert stagger < element, "consecutive elements should overlap"


def test_avatar_animation_and_library_are_vendored(client):
    js = read('src/static/js/easter-eggs.js')

    # Both are fetched from this origin, and only when they are needed.
    assert "libraryUrl: '/static/js/vendor/lottie_light.min.js'" in js
    assert "animationUrl: '/static/animations/avatar-elements.json'" in js
    assert client.get('/static/js/vendor/lottie_light.min.js').status_code == 200
    assert client.get('/static/animations/avatar-elements.json').status_code == 200

    # Nobody who never watches Avatar should download a quarter of a megabyte,
    # so neither file may be pulled in by the page itself.
    base = read('src/templates/base.html')
    assert 'lottie' not in base

    # Adding the show is what starts the fetch.
    assert 'EasterEggs.preload(showId)' in read('src/static/js/app.js')


def test_segment_display_font_is_vendored_and_wired_up(client):
    css = read('src/static/css/style.css')

    # The face itself, served from this origin rather than a font CDN.
    assert "font-family: 'Seven Segment';" in css
    assert "url('../fonts/SevenSegment.ttf') format('truetype')" in css
    assert client.get('/static/fonts/SevenSegment.ttf').status_code == 200

    # The font is free for personal use only, so where it came from and what
    # that means has to stay written down next to it.
    fonts_readme = read('src/static/fonts/README.md')
    assert 'dafont.com/seven-segment.font' in fonts_readme
    assert 'free for personal use' in fonts_readme.lower()

    # Only the show's name is set in it, and there is a fallback for the
    # moment before the font arrives.
    assert '.watched-show.easter-egg-segment-display .watched-show-info h4 {' in css
    assert "font-family: 'Seven Segment', 'Courier New', monospace;" in css

    # A calculator display is all caps, so the name is set that way.
    assert 'text-transform: uppercase;' in css


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


def test_new_celebrations_are_wired_to_their_animations():
    js = read('src/static/js/easter-eggs.js')

    wiring = {
        'blueSky': 'BlueSkyAnimation.fire(options)',
        'alphabetWall': 'AlphabetWallAnimation.play(options)',
        'portal': 'PortalAnimation.fire(options)',
        'donuts': 'DonutAnimation.fire(options)',
        'umbrellas': 'UmbrellaAnimation.fire(options)',
        'redLightGreenLight': 'RedLightGreenLightAnimation.play(options)',
        'deduction': 'DeductionAnimation.play(options)',
    }
    for name, call in wiring.items():
        assert f"celebration: '{name}'" in js, f"{name} should be used by a show"
        assert call in js, f"the {name} celebration should run its animation"


def test_vendored_svgs_for_easter_eggs_are_served(client):
    js = read('src/static/js/easter-eggs.js')
    images_readme = read('src/static/images/README.md')

    # The Simpsons donut is a vendored SVG served from this origin, not
    # hotlinked, and preloaded when the show is added.
    assert "donutUrl: '/static/images/donut.svg'" in js
    assert client.get('/static/images/donut.svg').status_code == 200
    assert 'DonutAnimation.ready();' in js
    assert 'donut.svg' in images_readme


def test_breaking_bad_tiles_the_symbols_inside_the_title():
    js = read('src/static/js/easter-eggs.js')
    css = read('src/static/css/style.css')

    # A card decorator rebuilds the title so Br and Ba sit in tiles inside it.
    assert "decorator: 'breakingBadTitle'" in js
    assert "tile('Br')" in js
    assert "tile('Ba')" in js
    assert 'EasterEggs.decorateCard(show.id, div)' in read('src/static/js/app.js')

    # Dark green tiles, white letters, no atomic numbers.
    assert '.watched-show.easter-egg-breaking-bad .bb-element {' in css
    assert 'bb-element-number' not in js
    assert 'bb-element-number' not in css
    assert 'color: #ffffff;' in css


def test_stranger_things_card_slips_into_the_upside_down():
    js = read('src/static/js/easter-eggs.js')
    css = read('src/static/css/style.css')

    assert "cardClass: 'easter-egg-upside-down'" in js

    # Only the content side is affected, there is a hard divider across the
    # middle, and the watch time hangs upside down.
    assert '.watched-show.easter-egg-upside-down .watched-show-content {' in css
    assert '.watched-show.easter-egg-upside-down .watched-show-content::after {' in css
    assert '.watched-show.easter-egg-upside-down .watched-show-time {' in css
    assert 'transform: rotate(180deg);' in css
    # The drift is disabled for reduced motion.
    assert '@keyframes easterEggUpsideDownDrift {' in css


def test_sherlock_deductions_play_only_on_the_top_card():
    js = read('src/static/js/easter-eggs.js')
    dedu = js.split('const DeductionAnimation')[1].split('\n};')[0]

    # It anchors to the bounds handed over (the running-total card) and never
    # looks up or touches an individual show card.
    assert 'opts.bounds && opts.bounds.width' in dedu
    assert 'position:fixed' in dedu
    assert 'watched-show[data-show-id' not in dedu
    assert 'playInCard' not in dedu
    assert 'watched-show-content' not in dedu

    # Four spots flanking the centred total, no tilt.
    assert 'spots:' in dedu
    assert re.search(r"\{ left: \d+, top: \d+, maxw: \d+ \}", dedu)
    assert 'rotate(' not in dedu


def test_squid_game_red_light_freezes_the_pieces():
    js = read('src/static/js/easter-eggs.js')

    # The whole point: a red light stops every falling piece, a green one
    # lets them go again.
    assert 'if (RedLightGreenLightAnimation.frozen) return;' in js, \
        "frozen pieces must skip their motion update"
    assert re.search(r"this\.frozen = true;.*flash\('#c0143c'\)", js), "red light freezes"
    assert re.search(r"this\.frozen = false;.*flash\('#1f9e57'\)", js), "green light frees"


def test_office_jello_wobbles_on_hover_of_the_jello():
    css = read('src/static/css/style.css')

    assert "cardClass: 'easter-egg-office'" in read('src/static/js/easter-eggs.js')

    # The poster keeps its slot but is inset (a jello rim) and tilted.
    assert '.watched-show.easter-egg-office .watched-show-poster {' in css
    assert 'transform: rotate(-5deg);' in css
    assert '@keyframes easterEggJello {' in css

    # The wobble triggers on the jello block itself, not the whole card.
    assert '.watched-show.easter-egg-office .watched-show-poster:hover {' in css
    assert '.watched-show.easter-egg-office:hover .watched-show-poster {' not in css
    # ...and holds still for anyone who asked motion to stop.
    assert '@media (prefers-reduced-motion: reduce) {' in css


def test_removed_easter_eggs_are_gone():
    import os

    js = read('src/static/js/easter-eggs.js')
    css = read('src/static/css/style.css')

    # Better Call Saul.
    assert 'betterCallSaul' not in js
    assert 'easter-egg-cinnabon' not in js
    assert 'easter-egg-cinnabon' not in css

    # Wednesday.
    assert 'wednesday' not in js.lower()
    assert 'ThingAnimation' not in js
    assert 'thing-hand' not in js
    assert not os.path.exists('src/static/images/thing-hand.svg')


def test_default_confetti_still_runs_for_ordinary_shows():
    js = read('src/static/js/app.js')

    # The easter egg hand-off returns early; everything else must still reach
    # the canvas-confetti call underneath it.
    celebrate_index = js.find('EasterEggs.celebrate(celebrationShowId')
    confetti_index = js.find("if (typeof confetti !== 'function')")

    assert celebrate_index != -1 and confetti_index != -1
    assert celebrate_index < confetti_index
