# Showtime 📺⏱️

A Flask-based web application for tracking the time you spend watching TV shows throughout your life. 
Never wonder again how much time you've invested in your favorite series!

## 🚀 Features

* **📊 Total Watch Time Display**: See your accumulated watch time prominently displayed at the top of the page
* **🔍 Smart Search**: Quick search for TV shows and movies using The Movie Database (TMDB) API
* **📝 Easy Tracking**: Add shows by simply clicking search results and specifying seasons watched
* **📈 Progress Monitoring**: Keep track of which seasons you've completed for each show
* **💾 Persistent Storage**: Your viewing history is saved in your browser's local storage — never on the server
* **📊 Statistics Dashboard**: Detailed analytics on your viewing habits
* **🏷️ Genre Tracking**: See which genres you spend the most time watching
* **📱 Responsive Design**: Optimized for both desktop and mobile devices
* **📊 Export Data**: Export your viewing history in various formats

## 🛠️ Technology Stack

### Backend

* **Python 3.11+**: Core programming language
* **Flask**: Lightweight web framework
* **Requests**: HTTP library for TMDB API integration
* **Flask-CORS**: Cross-origin resource sharing support

### Frontend

* **HTML5**: Semantic markup and structure
* **CSS3**: Modern styling with flexbox/grid layouts
* **JavaScript (ES6+)**: Interactive functionality and API communication
* **Fetch API**: Asynchronous data retrieval
* **Browser LocalStorage**: Persistent local storage of your watch history

### External APIs

* **TMDB API**: The Movie Database for show/movie information and metadata

## 📋 Prerequisites

Before running this application, make sure you have:

### For Local Development
* Python 3.11 or higher installed
* pip (Python package installer)
* A TMDB API key (free registration at [themoviedb.org](https://www.themoviedb.org/settings/api))

### For Docker Deployment
* Docker Engine installed
* Docker Compose (or use `docker compose` with modern Docker)
* A TMDB API key (free registration at [themoviedb.org](https://www.themoviedb.org/settings/api))

## 🚀 Installation & Setup

You can run this application either locally with Python or using Docker for production deployment.

### Option 1: Local Development Setup

#### 1. Clone the Repository

```bash
git clone https://github.com/Gunneone/Showtime.git
cd Showtime
```

#### 2. Create Virtual Environment

```bash
# Create virtual environment
python -m venv venv

# Activate virtual environment
# On Windows:
venv\Scripts\activate
# On macOS/Linux:
source venv/bin/activate
```

#### 3. Install Dependencies

```bash
pip install -r requirements.txt
```

#### 4. Environment Configuration

Create a `.env` file in the root directory:

```env
FLASK_APP=app.py
FLASK_ENV=development
SECRET_KEY=your-secret-key-here
TMDB_API_KEY=your-tmdb-api-key-here
```

#### 5. Run the Application

```bash
flask run
```

The application will be available at `http://localhost:5000`

### Option 2: Docker Deployment (Recommended for Production)

Docker deployment provides automatic restarts and easier server management.

#### 1. Clone the Repository

```bash
git clone https://github.com/Gunneone/Showtime.git
cd Showtime
```

#### 2. Environment Configuration

**⚠️ Important:** You must set up a valid TMDB API key or the application will fall back to mock data with error messages in logs.

Create a `.env` file in the root directory with your production settings:

```env
SECRET_KEY=your-very-secure-secret-key-for-production
TMDB_API_KEY=your-tmdb-api-key-here
```

**Getting a TMDB API Key:**
1. Register at [The Movie Database](https://www.themoviedb.org/signup)
2. Go to [API Settings](https://www.themoviedb.org/settings/api)
3. Request an API key (free for personal use)
4. Copy the API key to your `.env` file

You can also copy the example file:
```bash
cp .env.docker .env
# Then edit .env with your actual values (replace placeholder values)
```

#### 3. Run with Docker Compose

```bash
# Build and start the application
docker compose up -d

# To view logs
docker compose logs -f

# To stop the application
docker compose down
```

The application will be available at `http://localhost:5001`

#### 4. Alternative: Run with Docker directly

```bash
# Build the image
docker build -t showtime .

# Run the container
docker run -d \
  --name showtime-app \
  -p 5001:5001 \
  -e SECRET_KEY=your-secret-key \
  -e TMDB_API_KEY=your-tmdb-api-key \
  --restart unless-stopped \
  showtime
```

#### Docker Features

* **Automatic Restart**: The container will automatically restart after server outages
* **Health Checks**: Built-in health monitoring
* **Production Server**: Uses Gunicorn WSGI server for optimal performance
* **Isolated Environment**: Runs in a secure, isolated container
* **Easy Updates**: Simple deployment and rollback process
* **Configurable**: Customizable Gunicorn settings via environment variables

**For detailed production configuration options, see [PRODUCTION.md](PRODUCTION.md).**

## 🎯 Usage

### Adding Your First Show

1. **Search**: Use the search bar at the top of the page to find a TV show
2. **Select**: Click on the show you want to add from the search results
3. **Specify Seasons**: Enter the number of seasons you've watched
4. **Add**: Click "Add to Watched" to save it to your list (stored in localStorage)

### Tracking Your Progress

* Your **total accumulated watch time** is displayed prominently at the top
* View your complete list of watched shows below the search bar
* Update season counts as you watch more episodes
* Remove shows from your list if needed
* Your progress is stored in your **browser's localStorage** and will persist across sessions

## 🏗️ Project Structure

```
Showtime/
├── app.py                 # Main Flask application
├── requirements.txt       # Python dependencies
├── src/                   # Source code
│   ├── config.py          # Configuration settings
│   ├── static/            # Static files (CSS, JS, images)
│   │   ├── css/
│   │   ├── js/
│   │   └── images/
│   ├── templates/         # HTML templates
│   │   ├── base.html
│   │   ├── index.html
│   │   └── stats.html
│   ├── routes/            # Route handlers
│   │   ├── __init__.py
│   │   ├── main.py
│   │   └── api.py
│   └── services/          # Business logic
│       ├── __init__.py
│       ├── tmdb_service.py
│       ├── calculation_service.py
│       ├── search_cache_service.py
│       ├── persistent_cache_service.py
│       └── scheduler_service.py
└── tests/                 # Test files
    ├── test_app.py
    └── test_services.py
```

## 🧪 API Endpoints

### Frontend Routes

* `GET /` - Main application page
* `GET /stats` - Statistics dashboard

### API Routes

* `GET /api/search?query=<show_name>` - Search for shows/movies
* `GET /api/show/<id>/seasons` - Get season data for a specific show
* `POST /api/watched` - Add watched content (localStorage-based)
* `GET /api/watched` - Get watched list from localStorage or cookies (migration)
* `PUT /api/watched/<id>` - Update watched content
* `DELETE /api/watched/<id>` - Remove watched content
* `DELETE /api/watched` - Clear all watched shows
* `POST /api/watched/calculate` - Calculate watched shows statistics
* `POST /api/stats/calculate` - Calculate viewing statistics
* `POST /api/refresh-seasons` - Refresh season counts for all shows
* `POST /api/refresh-show-seasons/<id>` - Refresh season count for specific show

## 🔧 Configuration

### Environment Variables

| Variable       | Description                   | Required | Default      |
| -------------- | ----------------------------- | -------- | ------------ |
| `FLASK_APP`    | Flask application entry point | Yes      | `app.py`     |
| `FLASK_ENV`    | Environment mode              | No       | `production` |
| `SECRET_KEY`   | Flask secret key              | Yes      | -            |
| `TMDB_API_KEY` | TMDB API key                  | Yes      | -            |
| `SHOWTIME_ADMIN_TOKEN` | Password for the `/admin/usage` dashboard. Unset = dashboard disabled (404) | No | - |
| `METRICS_DB_PATH` | Where aggregate usage counts are stored | No | `metrics.db` |

### TMDB API Setup

1. Create account at [themoviedb.org](https://www.themoviedb.org)
2. Go to Settings > API
3. Request an API key
4. Add the key to your `.env` file

## 📊 Usage Statistics & Privacy

Showtime keeps a small set of aggregate counters so the operator can tell
whether anyone is using it. It is built so that it *cannot* become a tracking
system:

* No third-party analytics, no tracking pixels, no ad networks.
* No cookies at all for ordinary visitors.
* Watch histories are aggregated on write and never retained — no per-visitor
  record of what anyone watches exists.
* A *visitor* means someone tracking at least one show — a bare page load is
  not counted. Crawlers run no JavaScript and have no localStorage, so they
  never report a library and never appear in the numbers. (The trade-off: a
  brand-new user is not counted until they log their first show.)
* Daily visitors are counted via `sha256(daily_salt + ip + user_agent)`, where
  the salt is random per day and **destroyed when the day rolls over**. The hash
  cannot be reversed, and the same person hashes differently tomorrow, so
  cross-day correlation is impossible by construction. IP addresses are never
  written to disk.
* Visitor hashes exist for at most ~48h; a nightly rollup collapses them into
  plain counts and deletes them.
* `DNT: 1` and `Sec-GPC: 1` opt out of visitor counting entirely.

A deliberate consequence: because the salt rotates daily, **there is no monthly
unique-visitor figure** — daily counts cannot be de-duplicated across days. The
dashboard reports daily uniques and an average per active day instead.

Full details are on the site's `/privacy` page.

### The usage dashboard

Set `SHOWTIME_ADMIN_TOKEN` and the dashboard becomes available at
`/admin/usage`. It is not linked from anywhere in the UI, and with no token
configured the route returns 404 rather than a login form.

Because the dashboard authenticates with a signed session cookie, enabling it
requires a real `SECRET_KEY` — the app refuses to start if a token is set while
`SECRET_KEY` is still one of the repo's default values. Generate one with:

```bash
python -c "import secrets; print(secrets.token_hex(32))"
```

Under Docker the counts live on the `showtime-data` volume, so they survive a
rebuild.

## 📈 Roadmap

### Version 1.0 (MVP) ✅ COMPLETED

* [x] Basic project setup
* [x] TMDB integration
* [x] Core tracking functionality
* [x] Basic web interface
* [x] LocalStorage-based persistent storage
* [x] Statistics dashboard
* [x] Data export features
* [x] Mobile-responsive design
* [x] Search functionality with caching
* [x] Precise episode runtime calculation
* [x] Season-by-season tracking

### Future Enhancements
* [ ] Improved Social sharing features
* [x] Improved analytics and insights (privacy-preserving aggregate usage stats)

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 📞 Contact & Support

* **Author**: Marius Gunnemann
* **GitHub**: [@Gunneone](https://github.com/Gunneone)
* **Project Link**: [https://github.com/Gunneone/Showtime](https://github.com/Gunneone/Showtime)

## 🙏 Acknowledgments

* [The Movie Database (TMDB)](https://www.themoviedb.org) for providing comprehensive movie and TV data
* [Flask](https://flask.palletsprojects.com/) for the excellent web framework
* The open-source community for inspiration and tools

---

**Happy tracking! 🎬📊**

*Remember: Time you enjoy wasting is not wasted time, but it's still fun to track!*

---
