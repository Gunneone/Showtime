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
   # Copy the example environment file
   cp .env.docker .env
   
   # Edit .env with your actual values (REQUIRED):
   nano .env  # or use your preferred editor
   
   # You MUST update these values:
   # - SECRET_KEY: Generate a secure secret key (use a random string generator)
   # - TMDB_API_KEY: Get your free API key from https://www.themoviedb.org/settings/api
   ```
   
   **⚠️ Important:** You must replace the placeholder values in `.env` with real values. The application will use mock data if you don't set a valid TMDB API key, but you'll see error messages in the logs.

3. **Start the application:**
   ```bash
   docker compose up -d
   ```

4. **Access the application:**
   - Open http://localhost:5001 in your browser

## Production Deployment

## Environment Variables

**Required environment variables:**
- `SECRET_KEY`: Secure secret key for Flask sessions
- `TMDB_API_KEY`: API key from The Movie Database (get yours free at https://www.themoviedb.org/settings/api)

**⚠️ Important Setup Notes:**
- You **must** create a `.env` file with real values (copy from `.env.docker` and edit)
- Using placeholder values will cause the app to fall back to mock data with error messages
- Mock data is fine for testing, but you'll get API error messages in the logs

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

### TMDB API Errors in Docker

If you see errors like:
```
TMDB API request failed, using mock data: 404 Client Error: Not Found for url: https://api.themoviedb.org/3/tv/...
```

**This indicates one of the following:**

1. **Placeholder API Key (Most Common)**: You're using the default placeholder value from `.env.docker`
   - **Solution**: Create a `.env` file with a real TMDB API key from https://www.themoviedb.org/settings/api
   
2. **Invalid API Key**: Your TMDB API key is incorrect or expired
   - **Solution**: Verify your API key is correct and active
   
3. **No API Key Set**: Missing TMDB_API_KEY environment variable
   - **Solution**: Set the environment variable with a valid API key

**Note:** The application will continue to work using mock data, but you'll see these error messages until you configure a valid API key.

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