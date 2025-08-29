# Showtime - TV Time Tracker

Showtime is a Flask-based web application for tracking TV show viewing time using The Movie Database (TMDB) API. The app provides search functionality, time tracking, and detailed statistics with a responsive web interface.

**ALWAYS reference these instructions first and fallback to search or bash commands only when you encounter unexpected information that does not match the info here.**

## Working Effectively

### Bootstrap and Setup (Required for ALL work)
```bash
# 1. Set up Python virtual environment (takes ~5 seconds)
python3 -m venv venv
source venv/bin/activate

# 2. Install dependencies (takes ~15 seconds - NEVER CANCEL)
pip install -r requirements.txt

# 3. Set up environment configuration 
cp .env.example .env
# Edit .env with your TMDB API key or use placeholder for testing
```

### Build and Run Commands
```bash
# Development server (Flask)
source venv/bin/activate
export PYTHONPATH=/home/runner/work/Showtime/Showtime
flask run --host=0.0.0.0 --port=5001
# Application available at http://localhost:5001

# Production server (Docker) - takes ~30 seconds to build - NEVER CANCEL
docker build -t showtime .
docker run -p 5001:5001 --env SECRET_KEY=your-secret --env TMDB_API_KEY=your-key showtime

# Docker Compose (recommended for production)
cp .env.docker .env  # Edit with real values
docker-compose up
```

### Testing
```bash
# Run test suite (takes ~10 seconds - NEVER CANCEL)
source venv/bin/activate
export PYTHONPATH=/home/runner/work/Showtime/Showtime
pytest
# Runs 16 tests covering app routes and services
```

## Validation Scenarios

**CRITICAL**: Always run these complete scenarios after making changes:

### 1. Basic Application Functionality
```bash
# Start the application
source venv/bin/activate && flask run --host=0.0.0.0 --port=5001

# Test endpoints (in separate terminal)
curl http://localhost:5001/                    # Should return HTML homepage
curl http://localhost:5001/stats               # Should return HTML stats page  
curl http://localhost:5001/api/search?query=test  # Should return JSON search results
```

### 2. Complete User Workflow Test
**ALWAYS test this complete scenario manually via browser**:
1. Navigate to http://localhost:5001
2. Search for a TV show (e.g., "breaking bad")
3. Add a season by clicking a season number
4. Verify time tracking updates (should show hours/minutes)
5. Navigate to Statistics page
6. Verify statistics display correctly (total time, shows, episodes, completion progress)

### 3. API Integration Test
```bash
# Test TMDB API integration (requires valid API key)
curl "http://localhost:5001/api/search?query=breaking+bad"
# Should return JSON with TMDB show data including poster URLs and episode counts
```

## Build Times and Timeout Requirements

**NEVER CANCEL any build or test commands. Set generous timeouts:**

- **Virtual environment creation**: 5 seconds
- **Dependency installation**: 15 seconds (timeout: 60 seconds)
- **Test suite execution**: 10 seconds (timeout: 30 seconds)  
- **Docker build**: 30 seconds (timeout: 120 seconds)
- **Flask startup**: 3 seconds (immediate)
- **Docker container startup**: 5 seconds (immediate)

## Project Structure

```
├── app.py                    # Flask application entry point
├── requirements.txt          # Python dependencies
├── Dockerfile               # Container configuration
├── docker-compose.yml       # Multi-container setup
├── start.sh                 # Production startup script
├── .env.example             # Environment template
├── src/                     # Source code
│   ├── config.py           # Application configuration
│   ├── routes/             # Flask route blueprints
│   │   ├── main.py         # Main pages (/, /stats)
│   │   └── api.py          # API endpoints (/api/*)
│   ├── services/           # Business logic
│   │   ├── tmdb_service.py         # TMDB API integration
│   │   ├── calculation_service.py   # Time calculations
│   │   ├── search_cache_service.py  # Search caching
│   │   ├── persistent_cache_service.py # Data persistence
│   │   └── scheduler_service.py     # Background tasks
│   ├── templates/          # Jinja2 HTML templates
│   └── static/             # CSS, JS, images
└── tests/                  # Test files
    ├── test_app.py         # Application route tests
    └── test_services.py    # Service layer tests
```

## Environment Variables

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `FLASK_APP` | Application entry point | Yes | `app.py` |
| `FLASK_ENV` | Environment mode | No | `production` |
| `SECRET_KEY` | Flask secret key | Yes | `dev-secret-key-change-in-production` |
| `TMDB_API_KEY` | TMDB API key | Yes | None |

**TMDB API Key Setup:**
1. Register at https://www.themoviedb.org/signup
2. Go to https://www.themoviedb.org/settings/api  
3. Request API key (free)
4. Add to `.env` file

## Common Issues and Solutions

### Tests Fail with Import Errors
```bash
# ALWAYS set PYTHONPATH before running tests
export PYTHONPATH=/home/runner/work/Showtime/Showtime
pytest
```

### Application Won't Start
```bash
# Check virtual environment is activated
source venv/bin/activate
# Check dependencies are installed
pip install -r requirements.txt
# Check .env file exists
cp .env.example .env
```

### Docker Build Fails
```bash
# Ensure Docker is running and you have internet access
docker build --no-cache -t showtime .
```

### Pip Install Timeout/Network Issues
```bash
# If pip install fails with timeout, try with longer timeout
pip install --timeout 300 -r requirements.txt
# Or install with retries
pip install --retries 10 -r requirements.txt
```

### TMDB API Errors
- App falls back to mock data if TMDB_API_KEY is missing/invalid
- Check logs for "TMDB API Error" messages
- Verify API key is not a placeholder value

## Development Workflow

### Making Changes
1. **ALWAYS run bootstrap steps first**
2. **ALWAYS activate virtual environment**: `source venv/bin/activate`
3. **ALWAYS set PYTHONPATH**: `export PYTHONPATH=/home/runner/work/Showtime/Showtime`
4. **ALWAYS run tests after changes**: `pytest`
5. **ALWAYS validate complete user scenarios**

### Key Files for Common Tasks
- **Route changes**: `src/routes/main.py` or `src/routes/api.py`
- **Business logic**: `src/services/` directory
- **Frontend**: `src/templates/` and `src/static/`
- **Configuration**: `src/config.py`
- **Dependencies**: `requirements.txt`

### Before Committing
```bash
# ALWAYS run full test suite
source venv/bin/activate
export PYTHONPATH=/home/runner/work/Showtime/Showtime
pytest

# ALWAYS test Flask development server
flask run --host=0.0.0.0 --port=5001
# Manually test complete user workflow in browser

# Consider testing Docker build for production changes
docker build -t showtime-test .
```

## Technology Stack

- **Backend**: Python 3.11+, Flask 3.0.0, Gunicorn (production)
- **Frontend**: HTML5, CSS3, JavaScript (ES6+), LocalStorage
- **External APIs**: The Movie Database (TMDB) API v3
- **Testing**: pytest, pytest-cov
- **Deployment**: Docker, Docker Compose
- **Dependencies**: requests, flask-cors, python-dotenv, schedule, gevent

## Notes

- Application uses **client-side localStorage** for data persistence
- **No database required** - all data stored in browser
- TMDB API provides show metadata and episode runtime data
- Background scheduler handles cache cleanup
- Production mode uses Gunicorn WSGI server with 2 workers
- Development mode uses Flask's built-in server
- CORS enabled for frontend-backend communication
- Health checks included in Docker setup