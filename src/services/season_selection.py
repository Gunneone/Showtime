"""Resolve which season numbers a watched-show record actually covers.

A record stores ``seasons_watched`` as a count, which has always meant
"seasons 1..N". Records whose selection has gaps (someone who only watched
seasons 4 and 7 of a reality show) additionally carry ``watched_seasons``,
an explicit ascending list. The count stays authoritative for every consumer
that only needs "how many", so the two must never disagree:
``seasons_watched == len(watched_seasons)`` whenever the list is present.

This module is deliberately dependency-free so both the route helpers and the
calculation service can import it without a cycle.
"""

# Kept in step with MAX_SEASONS in routes/api/helpers.py. Duplicated rather
# than imported because that module pulls in Flask and the services layer.
DEFAULT_MAX_SEASONS = 100


def resolve_watched_seasons(show, *, max_seasons=DEFAULT_MAX_SEASONS):
    """Season numbers this record covers, ascending.

    ``watched_seasons`` wins when present and usable; otherwise the record
    means the historical "seasons 1..seasons_watched" and is expanded as such.

    This runs against client-supplied localStorage blobs, so it sanitises
    rather than raises: unusable entries are dropped, and a list that survives
    as empty falls back to the count.
    """
    explicit = show.get('watched_seasons')
    if isinstance(explicit, list) and explicit:
        seasons = sorted({
            int(season) for season in explicit
            if isinstance(season, (int, float))
            and not isinstance(season, bool)
            and float(season).is_integer()
            and 1 <= int(season) <= max_seasons
        })
        if seasons:
            return seasons

    count = show.get('seasons_watched', 0) or 0
    try:
        count = int(count)
    except (TypeError, ValueError):
        return []
    count = max(0, min(count, max_seasons))
    return list(range(1, count + 1))
