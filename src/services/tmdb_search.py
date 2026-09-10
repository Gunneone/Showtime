"""Pure helpers for TMDB search fallback and released-season counting.

These have no dependency on ``TMDBService`` state, so they live here and are
called (directly, or through thin wrappers) from it.
"""

import difflib
from datetime import datetime, date


def relaxed_queries(query, limit=5):
    """Build looser variants of a query that missed, to catch typos.

    TMDB matches titles literally, so a single wrong character returns
    nothing. Dropping a word, or trimming a word's tail, usually leaves
    enough of the title intact to match.
    """
    tokens = query.split()
    candidates = []

    for i, token in enumerate(tokens):
        candidates.append(token)
        # Trimming below four characters matches too much to be useful.
        for trim in (1, 2, 3):
            if len(token) - trim >= 4:
                candidates.append(token[:-trim])
        if len(tokens) > 1:
            candidates.append(' '.join(tokens[:i] + tokens[i + 1:]))

    seen = set()
    relaxed = []
    for candidate in candidates:
        candidate = candidate.strip()
        key = candidate.lower()
        if len(candidate) >= 3 and key != query.strip().lower() and key not in seen:
            seen.add(key)
            relaxed.append(candidate)

    return relaxed[:limit]


def rank_by_similarity(query, shows):
    """Order shows by title similarity to the query, nudged by popularity."""
    def score(show):
        similarity = difflib.SequenceMatcher(
            None, query.lower(), show['name'].lower()
        ).ratio()
        popularity = min(show.get('popularity') or 0, 300) / 300
        return 0.75 * similarity + 0.25 * popularity

    return sorted(shows, key=score, reverse=True)


def is_season_released(air_date_str):
    """Check if a season is released based on its air date."""
    if not air_date_str:
        return False

    try:
        air_date = datetime.strptime(air_date_str, '%Y-%m-%d').date()
        return air_date <= date.today()
    except ValueError:
        # If air date is invalid, assume not released
        return False


def count_released_seasons(seasons, show_status=None):
    """Count aired seasons from a show's `seasons` array.

    Season 0 holds specials and is ignored. TMDB frequently leaves
    `air_date` blank on older seasons of finished shows, so a season
    with no date is still treated as released when a later season has
    a past air_date (seasons air in order, so that later date implies
    this one already happened) or when the show itself has finished
    airing (`status` is 'Ended' or 'Canceled').
    """
    numbered = sorted(
        (s for s in seasons or [] if s.get('season_number', 0) > 0),
        key=lambda s: s['season_number']
    )

    if show_status in ('Ended', 'Canceled'):
        return len(numbered)

    released_count = 0
    for i, season in enumerate(numbered):
        air_date = season.get('air_date') or ''
        if is_season_released(air_date):
            released_count = i + 1
            continue
        if air_date:
            # Explicit date in the future: genuinely not aired yet.
            break
        # No date on record. Since seasons air in order, a later season
        # with a real air date means this one already happened too.
        if any(is_season_released(s.get('air_date') or '') for s in numbered[i + 1:]):
            released_count = i + 1
        else:
            break

    return released_count
