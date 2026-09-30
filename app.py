from flask import Flask, request
from src.config import Config
from datetime import timedelta
import logging
import atexit
import os

logger = logging.getLogger(__name__)

# Endpoints that count as a page view. Kept as an allow-list so static files,
# API calls and the admin dashboard never inflate the visitor numbers.
TRACKED_ENDPOINTS = frozenset({'main.index', 'main.stats', 'main.privacy'})


def create_app():
    """Create and configure the Flask application."""
    app = Flask(__name__, 
                template_folder='src/templates',
                static_folder='src/static')
    app.config.from_object(Config)

    # Admin session cookie hardening. Secure is production-only so the test
    # client and plain-http local dev keep working; the browser always reaches
    # production over HTTPS (nginx / Cloudflare terminate TLS).
    app.config.update(
        SESSION_COOKIE_HTTPONLY=True,
        SESSION_COOKIE_SAMESITE='Lax',
        SESSION_COOKIE_SECURE=(Config.FLASK_ENV == 'production'),
        PERMANENT_SESSION_LIFETIME=timedelta(days=7),
    )

    # Refuse to start with a forgeable admin session cookie.
    Config.validate_admin_config()

    # Configure logging for production
    if Config.FLASK_ENV == 'production' and not app.config.get('TESTING', False):
        logging.basicConfig(
            level=logging.INFO,
            format='%(asctime)s %(levelname)s %(name)s %(message)s'
        )

    # Register blueprints
    from src.routes.main import main_bp
    from src.routes.api import api_bp
    
    app.register_blueprint(main_bp)
    app.register_blueprint(api_bp, url_prefix='/api')

    @app.context_processor
    def design_system():
        """Base URL of the shared design system, as `g1` in every template."""
        return {'g1': app.config['G1_DS_URL']}

    @app.after_request
    def record_page_view(response):
        """Count page views and daily visitors.

        Runs after the response is built and swallows everything: usage
        metrics must never be able to break a page render.
        """
        try:
            if request.endpoint in TRACKED_ENDPOINTS and response.status_code == 200:
                from src.services.metrics_service import get_metrics_service
                get_metrics_service().record_page_view(request)
        except Exception:
            logger.warning("Failed to record page view", exc_info=True)
        return response
    
    # Start background tasks
    from src.services.scheduler_service import start_background_tasks, stop_background_tasks
    start_background_tasks()
    
    # Register cleanup on app shutdown
    atexit.register(stop_background_tasks)
    
    return app

# Create the application instance
app = create_app()

if __name__ == '__main__':
    # Never default the Werkzeug debugger on. Opt in with FLASK_DEBUG=1 for
    # local development; bind to all interfaces only when explicitly asked.
    debug = os.environ.get('FLASK_DEBUG', '').lower() in ('1', 'true', 'yes')
    host = os.environ.get('FLASK_RUN_HOST', '127.0.0.1')
    port = int(os.environ.get('FLASK_RUN_PORT', '5001'))
    app.run(debug=debug, host=host, port=port)
