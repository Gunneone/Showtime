#!/bin/bash
# Production startup script

echo "Starting application with FLASK_ENV=$FLASK_ENV"

# Check if we're in production mode
if [ "$FLASK_ENV" = "production" ]; then
    echo "Starting production server with Gunicorn..."
    exec gunicorn --bind 0.0.0.0:5001 --workers 4 --timeout 120 app:app
else
    echo "Starting development server..."
    exec python app.py
fi