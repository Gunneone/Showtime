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
- The Docker setup now uses sync workers for better stability and search functionality

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

## Performance Optimization

The Docker setup has been optimized for performance and reliability:

- **Gevent Workers**: Uses async gevent workers instead of sync workers for better handling of network I/O
- **Resource Limits**: Container is limited to 512MB RAM and 1 CPU core to prevent resource exhaustion  
- **DNS Configuration**: Uses Google DNS (8.8.8.8) for reliable name resolution
- **Reduced Workers**: Uses 2 workers instead of 4 to reduce memory usage while maintaining performance
- **Optimized Healthcheck**: Less frequent health checks to reduce system load

## Troubleshooting

### Performance Issues in Docker

If you experience slow performance or crashes:

1. **Check Resource Usage**:
   ```bash
   docker stats showtime-app
   ```

2. **Review Container Logs**:
   ```bash
   docker compose logs showtime
   ```

3. **Test Network Connectivity**:
   ```bash
   docker exec showtime-app python -c "import socket; print(socket.gethostbyname('api.themoviedb.org'))"
   ```

### Network/DNS Issues

If you see DNS resolution errors like:
```
Failed to resolve 'api.themoviedb.org' ([Errno -3] Temporary failure in name resolution)
```

**Solutions:**
1. **Restart Docker daemon** (if running locally):
   ```bash
   sudo systemctl restart docker
   ```

2. **Use alternative DNS servers** (edit docker-compose.yml):
   ```yaml
   dns:
     - 1.1.1.1  # Cloudflare DNS
     - 1.0.0.1
   ```

3. **Check host DNS resolution**:
   ```bash
   nslookup api.themoviedb.org
   ```

### Search Functionality Issues

If search returns HTTP 500 errors or shows "maximum recursion depth exceeded":

**This was fixed in the latest version by switching from gevent to sync workers.**

**Symptoms:**
- Search requests fail with 500 Internal Server Error
- Logs show "maximum recursion depth exceeded while calling a Python object"
- MonkeyPatch warnings about SSL imports

**Solution (already implemented):**
- The Docker setup now uses `sync` workers instead of `gevent` workers
- This prevents SSL monkey-patching recursion issues
- Search functionality should work reliably with both real and mock TMDB data

**To verify the fix:**
```bash
# Test search functionality
curl "http://localhost:5001/api/search?query=wednesday"
# Should return HTTP 200 with search results
```

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

### General Docker Commands

Check container status:
```bash
docker ps
```

View container logs:
```bash
docker compose logs showtime
```

Check health status:
```bash
docker inspect showtime-app | grep Health -A 10
```

Restart the application:
```bash
docker compose restart
```

View real-time logs:
```bash
docker compose logs -f showtime
```