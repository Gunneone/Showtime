from flask import Flask, request
from flask_cors import CORS
from src.config import Config
import logging
import atexit

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

    # Refuse to start with a forgeable admin session cookie.
    Config.validate_admin_config()
    
    # Configure logging for production
    if Config.FLASK_ENV == 'production' and not app.config.get('TESTING', False):
        logging.basicConfig(
            level=logging.INFO,
            format='%(asctime)s %(levelname)s %(name)s %(message)s'
        )
    
    # Enable CORS
    CORS(app)
    
    # Register blueprints
    from src.routes.main import main_bp
    from src.routes.api import api_bp
    
    app.register_blueprint(main_bp)
    app.register_blueprint(api_bp, url_prefix='/api')

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
    app.run(debug=True, host='0.0.0.0', port=5001)
