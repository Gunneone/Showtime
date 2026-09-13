"""Offline stand-in for the TMDB API.

``TMDBService`` routes every outbound call through here when it is put in
testing mode (``use_mock_data_for_testing``) or when no real API key is
configured for a test run. Kept out of ``tmdb_service`` because it is almost
all fixture data.
"""

from datetime import date, timedelta

# A season that has not aired yet. Computed rather than written as a literal:
# a hard-coded "future" date quietly rots into the past, and the fixture then
# stops exercising the partially-released path it exists for.
_UNAIRED = (date.today() + timedelta(days=365)).isoformat()


def mock_shows():
    """The mock show catalogue shared by the search, popular, and
    recommendation endpoints."""
    return [
        {
            'id': 1,
            'name': 'Breaking Bad',
            'overview': 'A high school chemistry teacher turned methamphetamine cook.',
            'first_air_date': '2008-01-20',
            'poster_path': None,
            'vote_average': 9.5,
            'popularity': 100
        },
        {
            'id': 2,
            'name': 'The Office',
            'overview': 'A mockumentary about office workers in Scranton, PA.',
            'first_air_date': '2005-03-24',
            'poster_path': None,
            'vote_average': 8.9,
            'popularity': 95
        },
        {
            'id': 3,
            'name': 'Game of Thrones',
            'overview': 'Nine noble families fight for control over the mythical lands of Westeros.',
            'first_air_date': '2011-04-17',
            'poster_path': None,
            'vote_average': 9.3,
            'popularity': 98
        },
        {
            'id': 4,
            'name': 'Stranger Things',
            'overview': 'When a young boy disappears, his mother and friends must confront terrifying supernatural forces.',
            'first_air_date': '2016-07-15',
            'poster_path': None,
            'vote_average': 8.7,
            'popularity': 92
        },
        {
            'id': 5,
            'name': 'The Mandalorian',
            'overview': 'The travels of a lone bounty hunter in the outer reaches of the galaxy.',
            'first_air_date': '2019-11-12',
            'poster_path': None,
            'vote_average': 8.5,
            'popularity': 88
        },
        {
            'id': 6,
            'name': 'Wednesday',
            'overview': 'Smart, sarcastic and a little dead inside, Wednesday Addams investigates twisted mysteries while making new friends — and foes — at Nevermore Academy.',
            'first_air_date': '2022-11-23',
            'poster_path': None,
            'vote_average': 8.4,
            'popularity': 525
        }
    ]


_MOCK_EPISODES = {
    1: {  # Breaking Bad
        1: [  # Season 1 - 7 episodes
            {'episode_number': 1, 'name': 'Pilot', 'runtime': 58},
            {'episode_number': 2, 'name': 'Cat\'s in the Bag...', 'runtime': 48},
            {'episode_number': 3, 'name': '...And the Bag\'s in the River', 'runtime': 48},
            {'episode_number': 4, 'name': 'Cancer Man', 'runtime': 48},
            {'episode_number': 5, 'name': 'Gray Matter', 'runtime': 48},
            {'episode_number': 6, 'name': 'Crazy Handful of Nothin\'', 'runtime': 48},
            {'episode_number': 7, 'name': 'A No-Rough-Stuff-Type Deal', 'runtime': 48}
        ],
        2: [  # Season 2 - 13 episodes
            {'episode_number': 1, 'name': 'Seven Thirty-Seven', 'runtime': 47},
            {'episode_number': 2, 'name': 'Grilled', 'runtime': 47},
            {'episode_number': 3, 'name': 'Bit by a Dead Bee', 'runtime': 47},
            {'episode_number': 4, 'name': 'Down', 'runtime': 47},
            {'episode_number': 5, 'name': 'Breakage', 'runtime': 47},
            {'episode_number': 6, 'name': 'Peekaboo', 'runtime': 47},
            {'episode_number': 7, 'name': 'Negro y Azul', 'runtime': 47},
            {'episode_number': 8, 'name': 'Better Call Saul', 'runtime': 47},
            {'episode_number': 9, 'name': '4 Days Out', 'runtime': 47},
            {'episode_number': 10, 'name': 'Over', 'runtime': 47},
            {'episode_number': 11, 'name': 'Mandala', 'runtime': 47},
            {'episode_number': 12, 'name': 'Phoenix', 'runtime': 47},
            {'episode_number': 13, 'name': 'ABQ', 'runtime': 47}
        ]
    },
    2: {  # The Office
        1: [  # Season 1 - 6 episodes
            {'episode_number': 1, 'name': 'Pilot', 'runtime': 22},
            {'episode_number': 2, 'name': 'Diversity Day', 'runtime': 22},
            {'episode_number': 3, 'name': 'Health Care', 'runtime': 22},
            {'episode_number': 4, 'name': 'The Alliance', 'runtime': 22},
            {'episode_number': 5, 'name': 'Basketball', 'runtime': 22},
            {'episode_number': 6, 'name': 'Hot Girl', 'runtime': 22}
        ]
    },
    5: {  # The Mandalorian
        1: [  # Season 1 - 8 episodes with varying runtimes
            {'episode_number': 1, 'name': 'Chapter 1: The Mandalorian', 'runtime': 39},
            {'episode_number': 2, 'name': 'Chapter 2: The Child', 'runtime': 32},
            {'episode_number': 3, 'name': 'Chapter 3: The Sin', 'runtime': 37},
            {'episode_number': 4, 'name': 'Chapter 4: Sanctuary', 'runtime': 40},
            {'episode_number': 5, 'name': 'Chapter 5: The Gunslinger', 'runtime': 33},
            {'episode_number': 6, 'name': 'Chapter 6: The Prisoner', 'runtime': 43},
            {'episode_number': 7, 'name': 'Chapter 7: The Reckoning', 'runtime': 40},
            {'episode_number': 8, 'name': 'Chapter 8: Redemption', 'runtime': 48}
        ]
    }
}

_MOCK_SEASON_AIR_DATES = {
    1: {  # Breaking Bad - all seasons released
        1: '2008-01-20', 2: '2009-03-08', 3: '2010-03-21',
        4: '2011-07-17', 5: '2012-07-15'
    },
    2: {  # The Office - all seasons released
        1: '2005-03-24', 2: '2005-09-20', 3: '2006-09-21', 4: '2007-09-27',
        5: '2008-09-25', 6: '2009-09-17', 7: '2010-09-23', 8: '2011-09-22',
        9: '2012-09-20'
    },
    3: {  # Game of Thrones - all seasons released
        1: '2011-04-17', 2: '2012-04-01', 3: '2013-03-31', 4: '2014-04-06',
        5: '2015-04-12', 6: '2016-04-24', 7: '2017-07-16', 8: '2019-04-14'
    },
    4: {  # Stranger Things - some future seasons
        1: '2016-07-15', 2: '2017-10-27', 3: '2019-07-04', 4: '2022-05-27',
        5: _UNAIRED  # Future season
    },
    5: {  # The Mandalorian - mix of released and future
        1: '2019-11-12', 2: '2020-10-30', 3: '2023-03-01',
        4: _UNAIRED  # Future season
    }
}

_MOCK_SHOW_DETAILS = {
    1: {
        'id': 1,
        'name': 'Breaking Bad',
        'overview': 'A high school chemistry teacher turned methamphetamine cook.',
        'first_air_date': '2008-01-20',
        'last_air_date': '2013-09-29',
        'poster_path': None,
        'backdrop_path': None,
        'vote_average': 9.5,
        'popularity': 100,
        'number_of_episodes': 62,
        'number_of_seasons': 5,
        'episode_run_time': [47],
        'genres': [
            {'id': 18, 'name': 'Drama'},
            {'id': 80, 'name': 'Crime'}
        ],
        'status': 'Ended',
        'networks': [
            {'id': 1, 'name': 'AMC'}
        ]
    },
    2: {
        'id': 2,
        'name': 'The Office',
        'overview': 'A mockumentary about office workers in Scranton, PA.',
        'first_air_date': '2005-03-24',
        'last_air_date': '2013-05-16',
        'poster_path': None,
        'backdrop_path': None,
        'vote_average': 8.9,
        'popularity': 95,
        'number_of_episodes': 201,
        'number_of_seasons': 9,
        'episode_run_time': [22],
        'genres': [
            {'id': 35, 'name': 'Comedy'}
        ],
        'status': 'Ended',
        'networks': [
            {'id': 2, 'name': 'NBC'}
        ]
    },
    3: {
        'id': 3,
        'name': 'Game of Thrones',
        'overview': 'Nine noble families fight for control over the mythical lands of Westeros.',
        'first_air_date': '2011-04-17',
        'last_air_date': '2019-05-19',
        'poster_path': None,
        'backdrop_path': None,
        'vote_average': 9.3,
        'popularity': 98,
        'number_of_episodes': 73,
        'number_of_seasons': 8,
        'episode_run_time': [60],
        'genres': [
            {'id': 18, 'name': 'Drama'},
            {'id': 10759, 'name': 'Action & Adventure'},
            {'id': 10765, 'name': 'Sci-Fi & Fantasy'}
        ],
        'status': 'Ended',
        'networks': [
            {'id': 3, 'name': 'HBO'}
        ]
    },
    4: {
        'id': 4,
        'name': 'Stranger Things',
        'overview': 'When a young boy disappears, his mother and friends must confront terrifying supernatural forces.',
        'first_air_date': '2016-07-15',
        'last_air_date': '2022-07-01',
        'poster_path': None,
        'backdrop_path': None,
        'vote_average': 8.7,
        'popularity': 92,
        'number_of_episodes': 42,
        'number_of_seasons': 5,
        'episode_run_time': [51],
        'genres': [
            {'id': 18, 'name': 'Drama'},
            {'id': 10765, 'name': 'Sci-Fi & Fantasy'},
            {'id': 9648, 'name': 'Mystery'}
        ],
        # Not 'Ended': the season-5 air date below is still in the future, and
        # count_released_seasons short-circuits a finished show to "every
        # season released", which would defeat the point of the fixture.
        'status': 'Returning Series',
        'networks': [
            {'id': 4, 'name': 'Netflix'}
        ]
    },
    5: {
        'id': 5,
        'name': 'The Mandalorian',
        'overview': 'The travels of a lone bounty hunter in the outer reaches of the galaxy.',
        'first_air_date': '2019-11-12',
        'last_air_date': '2023-04-19',
        'poster_path': None,
        'backdrop_path': None,
        'vote_average': 8.5,
        'popularity': 88,
        'number_of_episodes': 24,
        'number_of_seasons': 4,
        'episode_run_time': [36],
        'genres': [
            {'id': 10759, 'name': 'Action & Adventure'},
            {'id': 18, 'name': 'Drama'},
            {'id': 10765, 'name': 'Sci-Fi & Fantasy'}
        ],
        # Not 'Ended', for the same reason as Stranger Things above.
        'status': 'Returning Series',
        'networks': [
            {'id': 5, 'name': 'Disney+'}
        ]
    },
    6: {
        'id': 6,
        'name': 'Wednesday',
        'overview': 'Smart, sarcastic and a little dead inside, Wednesday Addams investigates twisted mysteries while making new friends — and foes — at Nevermore Academy.',
        'first_air_date': '2022-11-23',
        'last_air_date': '2022-11-23',
        'poster_path': None,
        'backdrop_path': None,
        'vote_average': 8.4,
        'popularity': 525,
        'number_of_episodes': 8,
        'number_of_seasons': 1,
        'episode_run_time': [51],
        'genres': [
            {'id': 18, 'name': 'Drama'},
            {'id': 9648, 'name': 'Mystery'},
            {'id': 10765, 'name': 'Sci-Fi & Fantasy'}
        ],
        'status': 'Returning Series',
        'networks': [
            {'id': 6, 'name': 'Netflix'}
        ]
    }
}


def _search_tv(params):
    query = params.get('query', '').lower()
    shows = mock_shows()
    if query:
        shows = [
            show for show in shows
            if query in show['name'].lower() or query in show['overview'].lower()
        ]
    return {
        'results': shows,
        'total_pages': 1,
        'total_results': len(shows),
        'page': 1
    }


def _discover_tv(params):
    shows = sorted(mock_shows(), key=lambda s: s['vote_average'], reverse=True)
    return {
        'results': shows,
        'total_pages': 1,
        'total_results': len(shows),
        'page': params.get('page', 1)
    }


def _recommendations(endpoint, params):
    # Every show is "recommended" every other show, so tests can rely on
    # overlap between seeds without pinning a hand-built graph.
    show_id = int(endpoint.split('/')[1])
    shows = [show for show in mock_shows() if show['id'] != show_id]
    return {
        'results': shows,
        'total_pages': 1,
        'total_results': len(shows),
        'page': params.get('page', 1)
    }


def _season_details(endpoint):
    parts = endpoint.split('/')
    show_id = int(parts[1])
    season_num = int(parts[3])

    episodes = _MOCK_EPISODES.get(show_id, {}).get(season_num, [])
    show_air_dates = _MOCK_SEASON_AIR_DATES.get(show_id, {})
    season_air_date = show_air_dates.get(season_num, '2020-01-01')

    return {
        'id': f'{show_id}_{season_num}',
        'season_number': season_num,
        'name': f'Season {season_num}',
        'overview': f'Season {season_num} overview',
        'air_date': season_air_date,
        'episodes': episodes
    }


def _seasons_for(show_id, number_of_seasons, number_of_episodes):
    """The per-season summary array TMDB returns on a show-details call.

    Only ``air_date`` is load-bearing - it is what count_released_seasons()
    reads to work out how much of a show has actually aired - but the rest is
    filled in the way the real API does so nothing downstream has to special
    case the mock.
    """
    air_dates = _MOCK_SEASON_AIR_DATES.get(show_id, {})
    episodes = _MOCK_EPISODES.get(show_id, {})
    if number_of_seasons > 0 and number_of_episodes > 0:
        average_episodes = round(number_of_episodes / number_of_seasons)
    else:
        average_episodes = 10

    return [
        {
            'season_number': season,
            'name': f'Season {season}',
            # Same default as _season_details() for a show the air-date table
            # does not cover.
            'air_date': air_dates.get(season, '2020-01-01'),
            'episode_count': len(episodes.get(season, [])) or average_episodes,
            'poster_path': None,
        }
        for season in range(1, number_of_seasons + 1)
    ]


def _show_details(endpoint):
    show_id = int(endpoint.split('/')[1])
    details = _MOCK_SHOW_DETAILS.get(show_id, {
        'id': show_id,
        'name': f'Unknown Show {show_id}',
        'overview': 'This is a mock show for testing purposes.',
        'first_air_date': '2020-01-01',
        'last_air_date': '2023-12-31',
        'poster_path': None,
        'backdrop_path': None,
        'vote_average': 8.0,
        'popularity': 80,
        'number_of_episodes': 50,
        'number_of_seasons': 5,
        'episode_run_time': [45],
        'genres': [],
        'status': 'Ended',
        'networks': []
    })

    # Attached here rather than written into every fixture entry, and onto a
    # copy so the module-level fixture is never mutated across tests.
    return {
        **details,
        'seasons': _seasons_for(
            show_id,
            details.get('number_of_seasons', 1),
            details.get('number_of_episodes', 0),
        ),
    }


def get_mock_data(endpoint, params=None):
    """Return mock data for development/testing, matching the real endpoints."""
    params = params or {}

    if endpoint == "search/tv":
        return _search_tv(params)

    if endpoint == "genre/tv/list":
        return {'genres': [
            {'id': 18, 'name': 'Drama'},
            {'id': 80, 'name': 'Crime'},
            {'id': 35, 'name': 'Comedy'},
            {'id': 10765, 'name': 'Sci-Fi & Fantasy'}
        ]}

    if endpoint == "discover/tv":
        return _discover_tv(params)

    if endpoint.startswith("tv/") and endpoint.endswith("/recommendations"):
        return _recommendations(endpoint, params)

    if endpoint.startswith("tv/") and "/season/" in endpoint:
        return _season_details(endpoint)

    if endpoint.startswith("tv/"):
        return _show_details(endpoint)

    return None
