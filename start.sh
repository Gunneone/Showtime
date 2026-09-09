#!/bin/bash
# Production startup script

echo "Starting application with FLASK_ENV=$FLASK_ENV"

# Check if we're in production mode
if [ "$FLASK_ENV" = "production" ]; then
    echo "Starting production server with Gunicorn..."
    
    # Set default values for production configuration
    WORKERS=${GUNICORN_WORKERS:-4}
    WORKER_CLASS=${GUNICORN_WORKER_CLASS:-gthread}
    THREADS=${GUNICORN_THREADS:-8}
    TIMEOUT=${GUNICORN_TIMEOUT:-30}
    GRACEFUL_TIMEOUT=${GUNICORN_GRACEFUL_TIMEOUT:-30}
    MAX_REQUESTS=${GUNICORN_MAX_REQUESTS:-500}
    MAX_REQUESTS_JITTER=${GUNICORN_MAX_REQUESTS_JITTER:-50}

    exec gunicorn \
        --bind 0.0.0.0:5001 \
        --workers "$WORKERS" \
        --worker-class "$WORKER_CLASS" \
        --threads "$THREADS" \
        --timeout "$TIMEOUT" \
        --graceful-timeout "$GRACEFUL_TIMEOUT" \
        --max-requests "$MAX_REQUESTS" \
        --max-requests-jitter "$MAX_REQUESTS_JITTER" \
        --worker-tmp-dir /dev/shm \
        --access-logfile - \
        --error-logfile - \
        --log-level info \
        --preload \
        app:app
else
    echo "Starting development server..."
    exec python app.py
fi