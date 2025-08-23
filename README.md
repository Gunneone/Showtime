# Days Watched 📺⏱️

A Flask-based web application for tracking the time you spend watching movies and TV shows throughout your life. Never wonder again how much time you've invested in your favorite series or movies!

## 🚀 Features

### Core Functionality
- **📊 Total Watch Time Display**: See your accumulated watch time prominently displayed at the top of the page
- **🔍 Smart Search**: Quick search for TV shows and movies using The Movie Database (TMDB) API
- **📝 Easy Tracking**: Add shows by simply clicking search results and specifying seasons watched
- **📈 Progress Monitoring**: Keep track of which seasons you've completed for each show
- **💾 Persistent Storage**: Your viewing history is safely stored and maintained across sessions

### Planned Features
- **🎬 Movie Support**: Track individual movies alongside TV series
- **⭐ Ratings & Reviews**: Rate and review your watched content
- **📊 Statistics Dashboard**: Detailed analytics on your viewing habits
- **🏷️ Genre Tracking**: See which genres you spend the most time watching
- **📅 Viewing Calendar**: Track when you watched specific content
- **🎯 Watchlist**: Maintain a list of shows and movies you want to watch
- **📱 Responsive Design**: Optimized for both desktop and mobile devices
- **🔐 User Accounts**: Personal profiles and data privacy
- **📊 Export Data**: Export your viewing history in various formats

## 🛠️ Technology Stack

### Backend
- **Python 3.8+**: Core programming language
- **Flask**: Lightweight web framework
- **SQLAlchemy**: Database ORM for data management
- **Requests**: HTTP library for TMDB API integration
- **Flask-CORS**: Cross-origin resource sharing support

### Frontend
- **HTML5**: Semantic markup and structure
- **CSS3**: Modern styling with flexbox/grid layouts
- **JavaScript (ES6+)**: Interactive functionality and API communication
- **Fetch API**: Asynchronous data retrieval
- **Responsive Design**: Mobile-first approach

### External APIs
- **TMDB API**: The Movie Database for show/movie information and metadata

### Database
- **SQLite**: Development database (easily upgradeable to PostgreSQL for production)

## 📋 Prerequisites

Before running this application, make sure you have:

- Python 3.8 or higher installed
- pip (Python package installer)
- A TMDB API key (free registration at [themoviedb.org](https://www.themoviedb.org/settings/api))

## 🚀 Installation & Setup

### 1. Clone the Repository
```bash
git clone https://github.com/Gunneone/Days-Watched.git
cd Days-Watched
```

### 2. Create Virtual Environment
```bash
# Create virtual environment
python -m venv venv

# Activate virtual environment
# On Windows:
venv\Scripts\activate
# On macOS/Linux:
source venv/bin/activate
```

### 3. Install Dependencies
```bash
pip install -r requirements.txt
```

### 4. Environment Configuration
Create a `.env` file in the root directory:
```env
FLASK_APP=app.py
FLASK_ENV=development
SECRET_KEY=your-secret-key-here
TMDB_API_KEY=your-tmdb-api-key-here
DATABASE_URL=sqlite:///days_watched.db
```

### 5. Initialize Database
```bash
flask db init
flask db migrate -m "Initial migration"
flask db upgrade
```

### 6. Run the Application
```bash
flask run
```

The application will be available at `http://localhost:5000`

## 🎯 Usage

### Adding Your First Show

1. **Search**: Use the search bar at the top of the page to find a TV show
2. **Select**: Click on the show you want to add from the search results
3. **Specify Seasons**: Enter the number of seasons you've watched
4. **Add**: Click "Add to Watched" to save it to your list

### Tracking Your Progress

- Your **total accumulated watch time** is displayed prominently at the top
- View your complete list of watched shows below the search bar
- Update season counts as you watch more episodes
- Remove shows from your list if needed

### Understanding Watch Time Calculation

The app automatically calculates watch time based on:
- Average episode runtime from TMDB data
- Number of episodes per season
- Seasons you've marked as watched

## 🏗️ Project Structure

```
Days-Watched/
├── app.py                 # Main Flask application
├── config.py             # Configuration settings
├── requirements.txt      # Python dependencies
├── migrations/           # Database migrations
├── static/              # Static files (CSS, JS, images)
│   ├── css/
│   ├── js/
│   └── images/
├── templates/           # HTML templates
│   ├── base.html
│   ├── index.html
│   └── components/
├── models/             # Database models
│   ├── __init__.py
│   ├── user.py
│   └── watched_content.py
├── routes/             # Route handlers
│   ├── __init__.py
│   ├── main.py
│   └── api.py
├── services/           # Business logic
│   ├── __init__.py
│   ├── tmdb_service.py
│   └── calculation_service.py
└── tests/              # Test files
    ├── test_app.py
    ├── test_models.py
    └── test_services.py
```

## 🧪 API Endpoints

### Frontend Routes
- `GET /` - Main application page
- `GET /stats` - Statistics dashboard

### API Routes
- `GET /api/search?query=<show_name>` - Search for shows/movies
- `POST /api/watched` - Add watched content
- `GET /api/watched` - Get user's watched list
- `PUT /api/watched/<id>` - Update watched content
- `DELETE /api/watched/<id>` - Remove watched content
- `GET /api/stats` - Get viewing statistics

## 🧪 Testing

Run the test suite:
```bash
# Run all tests
python -m pytest

# Run with coverage
python -m pytest --cov=.

# Run specific test file
python -m pytest tests/test_app.py
```

## 🤝 Contributing

We welcome contributions! Please follow these steps:

1. **Fork** the repository
2. **Create** a feature branch (`git checkout -b feature/amazing-feature`)
3. **Commit** your changes (`git commit -m 'Add amazing feature'`)
4. **Push** to the branch (`git push origin feature/amazing-feature`)
5. **Open** a Pull Request

### Development Guidelines

- Follow PEP 8 style guidelines for Python code
- Write tests for new features
- Update documentation as needed
- Ensure all tests pass before submitting PR
- Use meaningful commit messages

### Code Style

```bash
# Format code with black
black .

# Check linting with flake8
flake8 .

# Sort imports with isort
isort .
```

## 📊 Database Schema

### Core Tables

**watched_content**
- `id` - Primary key
- `user_id` - Foreign key to users table
- `tmdb_id` - TMDB identifier
- `title` - Show/movie title
- `content_type` - 'tv' or 'movie'
- `seasons_watched` - Number of seasons completed
- `episodes_watched` - Total episodes watched
- `total_runtime` - Calculated watch time in minutes
- `date_added` - When added to watchlist
- `last_updated` - Last modification date

**users** (Future implementation)
- `id` - Primary key
- `username` - Unique username
- `email` - User email
- `created_at` - Account creation date

## 🔧 Configuration

### Environment Variables

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `FLASK_APP` | Flask application entry point | Yes | `app.py` |
| `FLASK_ENV` | Environment mode | No | `production` |
| `SECRET_KEY` | Flask secret key | Yes | - |
| `TMDB_API_KEY` | TMDB API key | Yes | - |
| `DATABASE_URL` | Database connection string | No | `sqlite:///days_watched.db` |

### TMDB API Setup

1. Create account at [themoviedb.org](https://www.themoviedb.org)
2. Go to Settings > API
3. Request an API key
4. Add the key to your `.env` file

## 📈 Roadmap

### Version 1.0 (MVP)
- [x] Basic project setup
- [ ] TMDB integration
- [ ] Core tracking functionality
- [ ] Basic web interface
- [ ] SQLite database

### Version 1.1
- [ ] User authentication
- [ ] Data export features
- [ ] Mobile-responsive design
- [ ] Statistics dashboard

### Version 2.0
- [ ] Movie tracking
- [ ] Rating system
- [ ] Social features
- [ ] Advanced analytics
- [ ] API for third-party apps

## 🐛 Known Issues

Currently in development - no known issues yet!

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 📞 Contact & Support

- **Author**: Marius Gunnemann
- **GitHub**: [@Gunneone](https://github.com/Gunneone)
- **Project Link**: [https://github.com/Gunneone/Days-Watched](https://github.com/Gunneone/Days-Watched)

## 🙏 Acknowledgments

- [The Movie Database (TMDB)](https://www.themoviedb.org) for providing comprehensive movie and TV data
- [Flask](https://flask.palletsprojects.com/) for the excellent web framework
- The open-source community for inspiration and tools

---

**Happy tracking! 🎬📊**

*Remember: Time you enjoy wasting is not wasted time, but it's still fun to track!*