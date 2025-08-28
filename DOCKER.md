# Docker Deployment Guide

This document provides step-by-step instructions for deploying Showtime using Docker.

## Quick Start

1. **Clone the repository:**
   ```bash
   git clone https://github.com/Gunneone/Showtime.git
   cd Showtime
   ```

2. **Set up environment variables:**
   ```bash
   cp .env.docker .env
   # Edit .env with your actual values:
   # - SECRET_KEY: Generate a secure secret key
   # - TMDB_API_KEY: Your TMDB API key
   ```

3. **Start the application:**
   ```bash
   docker compose up -d
   ```

4. **Access the application:**
   - Open http://localhost:5001 in your browser

## Production Deployment

### Environment Variables

Required environment variables:
- `SECRET_KEY`: Secure secret key for Flask sessions
- `TMDB_API_KEY`: API key from The Movie Database

### Docker Compose (Recommended)

```yaml
# docker-compose.yml is already configured with:
# - Automatic restarts (unless-stopped)
# - Health monitoring
# - Production WSGI server (Gunicorn)
# - Proper networking
```

**For advanced production configuration options, see [PRODUCTION.md](PRODUCTION.md).**

### Manual Docker Run

```bash
docker build -t showtime .
docker run -d \
  --name showtime-app \
  -p 5001:5001 \
  -e SECRET_KEY=your-secure-secret-key \
  -e TMDB_API_KEY=your-tmdb-api-key \
  -e FLASK_ENV=production \
  --restart unless-stopped \
  showtime
```

## Management Commands

### View logs:
```bash
docker compose logs -f
```

### Restart the application:
```bash
docker compose restart
```

### Update the application:
```bash
git pull
docker compose up -d --build
```

### Stop the application:
```bash
docker compose down
```

## Server Deployment Notes

- The application will automatically restart after server reboots
- Health checks are configured to monitor application status
- Logs are available via `docker compose logs`
- The application runs on port 5001 by default

## Troubleshooting

### Check container status:
```bash
docker ps
```

### View container logs:
```bash
docker compose logs showtime
```

### Check health status:
```bash
docker inspect showtime-app | grep Health -A 10
```