"""The pure resolver behind non-contiguous watched seasons.

It runs against client-supplied localStorage blobs, so the contract is that it
sanitises and never raises.
"""

from src.services.season_selection import resolve_watched_seasons


def test_absent_list_expands_the_count():
    assert resolve_watched_seasons({'seasons_watched': 3}) == [1, 2, 3]


def test_zero_seasons_is_empty():
    assert resolve_watched_seasons({'seasons_watched': 0}) == []


def test_explicit_list_wins_and_is_sorted_and_deduped():
    show = {'seasons_watched': 2, 'watched_seasons': [7, 4, 4]}
    assert resolve_watched_seasons(show) == [4, 7]


def test_empty_list_falls_back_to_the_count():
    show = {'seasons_watched': 2, 'watched_seasons': []}
    assert resolve_watched_seasons(show) == [1, 2]


def test_unusable_entries_are_dropped_not_raised():
    show = {'seasons_watched': 1, 'watched_seasons': [None, 'x', True, 0, -3, 10 ** 9, 4]}
    assert resolve_watched_seasons(show) == [4]


def test_a_list_of_only_junk_falls_back_to_the_count():
    show = {'seasons_watched': 2, 'watched_seasons': ['x', None]}
    assert resolve_watched_seasons(show) == [1, 2]


def test_count_is_clamped_to_the_cap():
    assert resolve_watched_seasons({'seasons_watched': 10 ** 6}) == list(range(1, 101))


def test_non_numeric_count_is_empty():
    assert resolve_watched_seasons({'seasons_watched': 'lots'}) == []


def test_a_record_with_neither_field_is_empty():
    assert resolve_watched_seasons({}) == []
