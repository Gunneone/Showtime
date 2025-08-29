from flask import Flask
from flask_cors import CORS
from src.config import Config
import logging
import atexit

def create_app():
    """Create and configure the Flask application."""
    app = Flask(__name__)
    app.config.from_object(Config)
    
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
