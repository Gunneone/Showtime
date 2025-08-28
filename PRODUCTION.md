# Production Configuration Guide

This document outlines the production configuration options for the Showtime application.

## Gunicorn Production Server

The application automatically uses Gunicorn when `FLASK_ENV=production` is set in the Docker environment. This provides a robust, production-ready WSGI server instead of the Flask development server.

### Default Configuration

- **Workers**: 4 (processes handling requests)
- **Worker Class**: sync (standard synchronous workers)
- **Timeout**: 120 seconds (request timeout)
- **Max Requests**: 1000 (requests per worker before restart)
- **Max Requests Jitter**: 100 (randomization for restart timing)

### Customization Options

You can customize the Gunicorn configuration using environment variables:

```bash
# Number of worker processes
GUNICORN_WORKERS=4

# Request timeout in seconds
GUNICORN_TIMEOUT=120

# Worker class (sync, gevent, eventlet)
GUNICORN_WORKER_CLASS=sync

# Maximum requests per worker before restart
GUNICORN_MAX_REQUESTS=1000

# Randomization for max requests
GUNICORN_MAX_REQUESTS_JITTER=100
```

### Docker Deployment

#### Using Docker Compose (Recommended)

```bash
# Start with default production settings
docker compose up -d

# View logs
docker compose logs -f

# Stop
docker compose down
```

#### Using Docker Run

```bash
# Default production setup
docker run -d \
  --name showtime-app \
  -p 5001:5001 \
  -e FLASK_ENV=production \
  -e SECRET_KEY=your-secure-secret-key \
  -e TMDB_API_KEY=your-tmdb-api-key \
  --restart unless-stopped \
  showtime

# Custom Gunicorn configuration
docker run -d \
  --name showtime-app \
  -p 5001:5001 \
  -e FLASK_ENV=production \
  -e SECRET_KEY=your-secure-secret-key \
  -e TMDB_API_KEY=your-tmdb-api-key \
  -e GUNICORN_WORKERS=2 \
  -e GUNICORN_TIMEOUT=60 \
  --restart unless-stopped \
  showtime
```

## Security Configuration

### Required Environment Variables

- `SECRET_KEY`: A secure secret key for Flask sessions (required)
- `TMDB_API_KEY`: Your TMDB API key (required)

### Security Features

- **Secure Cookies**: Automatically enabled in production mode
- **Non-root User**: Container runs as `appuser` for security
- **HTTP-only Cookies**: Prevents XSS attacks
- **SameSite Protection**: CSRF protection

## Monitoring and Logging

### Health Checks

The Docker container includes built-in health checks:

```bash
# Check container health status
docker inspect showtime-app | grep Health -A 10
```

### Logs

Gunicorn logs are sent to stdout/stderr for easy access:

```bash
# View application logs
docker logs showtime-app

# Follow logs in real-time
docker logs -f showtime-app
```

### Log Format

Production logs include:
- Timestamp
- Log level
- Component name
- Message

## Performance Tuning

### Worker Configuration

Adjust workers based on your server resources:

- **CPU-bound tasks**: Workers = CPU cores
- **I/O-bound tasks**: Workers = 2-4 × CPU cores
- **Memory considerations**: Each worker uses ~50-100MB

### Example Configurations

#### Small Server (1-2 CPU cores)
```bash
GUNICORN_WORKERS=2
GUNICORN_TIMEOUT=120
```

#### Medium Server (4-8 CPU cores)
```bash
GUNICORN_WORKERS=4
GUNICORN_TIMEOUT=90
```

#### Large Server (8+ CPU cores)
```bash
GUNICORN_WORKERS=8
GUNICORN_TIMEOUT=60
GUNICORN_WORKER_CLASS=gevent  # For high concurrency
```

## Troubleshooting

### Common Issues

1. **High Memory Usage**: Reduce `GUNICORN_WORKERS`
2. **Slow Response Times**: Increase `GUNICORN_TIMEOUT`
3. **High CPU Usage**: Consider using `gevent` worker class

### Debugging

To enable development mode for debugging:

```bash
docker run -d \
  --name showtime-debug \
  -p 5001:5001 \
  -e FLASK_ENV=development \
  -e SECRET_KEY=debug-key \
  -e TMDB_API_KEY=your-tmdb-api-key \
  showtime
```

This will use the Flask development server with debug mode enabled.