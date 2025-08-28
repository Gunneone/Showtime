from flask import Flask
from flask_cors import CORS
from config import Config
import logging

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
    from routes.main import main_bp
    from routes.api import api_bp
    
    app.register_blueprint(main_bp)
    app.register_blueprint(api_bp, url_prefix='/api')
    
    return app

# Create the application instance
app = create_app()

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5001)
