import os
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# Secret keys that ship in the repo and in docker-compose.yml. Fine while
# nothing depends on session integrity, but the admin dashboard does, so
# Config.validate_admin_config() refuses to run with either of them.
INSECURE_SECRET_KEYS = frozenset({
    'dev-secret-key-change-in-production',
    'your-default-secret-key-change-in-production',
    'your-secret-key-here',
})


class Config:
    """Configuration class for the Flask application."""

    # Flask configuration
    SECRET_KEY = os.environ.get('SECRET_KEY') or 'dev-secret-key-change-in-production'
    FLASK_ENV = os.environ.get('FLASK_ENV') or 'production'

    # TMDB API configuration
    TMDB_API_KEY = os.environ.get('TMDB_API_KEY')
    TMDB_BASE_URL = 'https://api.themoviedb.org/3'
    TMDB_IMAGE_BASE_URL = 'https://image.tmdb.org/t/p/w500'

    # Aggregate usage metrics. Kept out of cache.db so it can be mounted on a
    # persistent volume without dragging the disposable TMDB cache along.
    METRICS_DB_PATH = os.environ.get('METRICS_DB_PATH') or 'metrics.db'

    # Password for /admin/usage. When unset the dashboard routes 404, so a
    # deployment that forgets to set it does not expose an open dashboard.
    ADMIN_TOKEN = os.environ.get('SHOWTIME_ADMIN_TOKEN') or None

    @classmethod
    def validate_admin_config(cls) -> None:
        """Fail loudly if the admin dashboard is enabled but not secured.

        The dashboard authenticates with a signed session cookie, so a
        well-known SECRET_KEY would let anyone forge their way in. Better to
        refuse to start than to serve a dashboard that only looks protected.
        """
        if cls.ADMIN_TOKEN and cls.SECRET_KEY in INSECURE_SECRET_KEYS:
            raise RuntimeError(
                'SHOWTIME_ADMIN_TOKEN is set but SECRET_KEY is still a default '
                'value. The admin session cookie would be forgeable. Set a real '
                'SECRET_KEY (e.g. `python -c "import secrets; '
                'print(secrets.token_hex(32))"`) before enabling the dashboard.'
            )
