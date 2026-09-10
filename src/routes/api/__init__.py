"""The ``/api`` blueprint, split across one module per resource group.

The route handlers reach shared helpers as ``api.get_tmdb_service()`` etc. -
attribute access on this package - so tests can ``monkeypatch.setattr`` them
here and have every handler pick up the replacement.
"""

from flask import Blueprint

api_bp = Blueprint('api', __name__)

# Re-exported so `from src.routes.api import ...` and `monkeypatch.setattr(api,
# ...)` keep working now that the implementation lives in submodules.
from .helpers import (  # noqa: E402,F401
    MAX_SEASONS,
    MAX_WATCHED_SHOWS,
    _coerce_int,
    _watched_list,
    get_tmdb_service,
    get_calc_service,
    get_rec_service,
    calculate_precise_show_runtime,
)

# Import for side effects: each module registers its routes on api_bp.
from . import search, watched, calculate, refresh  # noqa: E402,F401
