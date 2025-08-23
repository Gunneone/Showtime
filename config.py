import os
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

class Config:
    """Configuration class for the Flask application."""
    
    # Flask configuration
    SECRET_KEY = os.environ.get('SECRET_KEY') or 'dev-secret-key-change-in-production'
    FLASK_ENV = os.environ.get('FLASK_ENV') or 'production'
    
    # TMDB API configuration
    TMDB_API_KEY = os.environ.get('TMDB_API_KEY')
    TMDB_BASE_URL = 'https://api.themoviedb.org/3'
    TMDB_IMAGE_BASE_URL = 'https://image.tmdb.org/t/p/w500'
    
    # Application settings
    COOKIE_MAX_AGE = 365 * 24 * 60 * 60  # 1 year in seconds
    COOKIE_SECURE = False  # Set to True in production with HTTPS
    COOKIE_HTTPONLY = True
    COOKIE_SAMESITE = 'Lax'