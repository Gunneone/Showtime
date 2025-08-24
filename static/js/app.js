// Days Watched - Main Application JavaScript

// Application object
const App = {
    // Application state
    state: {
        currentSearch: null,
        watchedShows: [],
        totalTime: 0,
        isLoading: false,
        selectedShow: null
    },

    // DOM elements
    elements: {
        searchInput: null,
        searchButton: null,
        searchResults: null,
        watchedShows: null,
        emptyState: null,
        totalWatchTime: null,
        loadingSpinner: null,
        addShowModal: null,
        toastContainer: null
    },

    // Initialize the application
    init() {
        this.initElements();
        this.bindEvents();
        this.loadWatchedShows();
        console.log('Days Watched app initialized');
    },

    // Initialize DOM elements
    initElements() {
        this.elements.searchInput = document.getElementById('searchInput');
        this.elements.searchButton = document.getElementById('searchButton');
        this.elements.searchResults = document.getElementById('searchResults');
        this.elements.watchedShows = document.getElementById('watchedShows');
        this.elements.emptyState = document.getElementById('emptyState');
        this.elements.totalWatchTime = document.getElementById('totalWatchTime');
        this.elements.loadingSpinner = document.getElementById('loadingSpinner');
        this.elements.addShowModal = document.getElementById('addShowModal');
        this.elements.toastContainer = document.getElementById('toastContainer');
    },

    // Bind event listeners
    bindEvents() {
        // Search functionality
        this.setupSearchFunctionality();
        
        // Close search results when clicking outside
        document.addEventListener('click', (e) => {
            if (!this.elements.searchInput.contains(e.target) && 
                !this.elements.searchResults.contains(e.target) &&
                !this.elements.searchButton.contains(e.target)) {
                this.hideSearchResults();
            }
        });

        // Modal events
        this.bindModalEvents();
    },

    // Setup comprehensive search functionality
    setupSearchFunctionality() {
        let searchTimeout;

        // Instant search with debouncing (for quick suggestions)
        this.elements.searchInput.addEventListener('input', () => {
            clearTimeout(searchTimeout);
            const query = this.elements.searchInput.value.trim();
            
            // Hide results if empty
            if (query.length === 0) {
                this.hideSearchResults();
                return;
            }
            
            // Trigger instant search after 300ms delay for queries >= 2 characters
            if (query.length >= 2) {
                searchTimeout = setTimeout(() => {
                    this.performSearch(query, true);
                }, 300);
            }
        });

        // Manual search with Enter key
        this.elements.searchInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                const query = this.elements.searchInput.value.trim();
                if (query.length >= 1) {
                    clearTimeout(searchTimeout);
                    this.performSearch(query, false);
                }
            }
        });

        // Manual search with button click
        if (this.elements.searchButton) {
            this.elements.searchButton.addEventListener('click', () => {
                const query = this.elements.searchInput.value.trim();
                if (query.length >= 1) {
                    clearTimeout(searchTimeout);
                    this.performSearch(query, false);
                } else {
                    this.showToast('Please enter a search term', 'error');
                    this.elements.searchInput.focus();
                }
            });
        }
    },

    // Bind modal event listeners
    bindModalEvents() {
        // Add show modal
        const modalClose = document.getElementById('modalClose');
        const modalCancel = document.getElementById('modalCancel');
        const modalAdd = document.getElementById('modalAdd');

        if (modalClose) modalClose.addEventListener('click', () => this.hideAddModal());
        if (modalCancel) modalCancel.addEventListener('click', () => this.hideAddModal());
        if (modalAdd) modalAdd.addEventListener('click', () => this.addShowToWatched());

        // Close modal when clicking outside
        if (this.elements.addShowModal) {
            this.elements.addShowModal.addEventListener('click', (e) => {
                if (e.target === this.elements.addShowModal) {
                    this.hideAddModal();
                }
            });
        }
    },

    // Perform search for TV shows
    async performSearch(query, isInstantSearch = false) {
        if (!query || query.length === 0) {
            this.hideSearchResults();
            return;
        }

        console.log('Performing search for:', query, 'isInstantSearch:', isInstantSearch);

        try {
            // Show loading state
            this.showSearchLoading();

            const response = await fetch(`/api/search?query=${encodeURIComponent(query)}`);
            const data = await response.json();
            
            console.log('Search response:', data);
            
            if (!response.ok) {
                throw new Error(data.error || 'Search failed');
            }

            // For instant search, limit to 5 results. For manual search, show more
            const maxResults = isInstantSearch ? 5 : 10;
            const results = data.results.slice(0, maxResults);
            
            this.displaySearchResults(results, isInstantSearch);
            this.state.currentSearch = data;
            
        } catch (error) {
            console.error('Search error:', error);
            this.showToast('Search failed. Please try again.', 'error');
            this.hideSearchResults();
        }
    },

    // Show loading state in search results
    showSearchLoading() {
        this.elements.searchResults.innerHTML = '<div class="search-loading"><i class="fas fa-spinner fa-spin"></i> Searching...</div>';
        this.elements.searchResults.classList.remove('hidden');
    },

    // Hide search results
    hideSearchResults() {
        this.elements.searchResults.classList.add('hidden');
        this.elements.searchResults.innerHTML = '';
    },

    // Display search results
    displaySearchResults(results, isInstantSearch = false) {
        console.log('Displaying search results:', results, 'isInstantSearch:', isInstantSearch);
        
        // Clear previous results
        this.elements.searchResults.innerHTML = '';
        this.elements.searchResults.classList.remove('hidden');

        if (!results || results.length === 0) {
            this.elements.searchResults.innerHTML = `
                <div class="search-no-results">
                    <i class="fas fa-search"></i>
                    <p>No shows found. Try a different search term.</p>
                </div>
            `;
            return;
        }

        // Add header for instant search
        if (isInstantSearch && results.length >= 3) {
            const header = document.createElement('div');
            header.className = 'search-results-header';
            header.innerHTML = '<i class="fas fa-search"></i> Quick search results - click to add:';
            this.elements.searchResults.appendChild(header);
        } else if (!isInstantSearch) {
            const header = document.createElement('div');
            header.className = 'search-results-header';
            header.innerHTML = `<i class="fas fa-search"></i> Found ${results.length} results:`;
            this.elements.searchResults.appendChild(header);
        }

        // Create result elements
        results.forEach(show => {
            const resultElement = this.createSearchResultElement(show, isInstantSearch);
            this.elements.searchResults.appendChild(resultElement);
        });

        console.log('Search results displayed successfully');
    },

    // Create search result element
    createSearchResultElement(show, isInstantSearch = false) {
        const div = document.createElement('div');
        div.className = 'search-result';
        
        // Event handler for adding shows
        div.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            if (isInstantSearch) {
                this.addShowDirectly(show);
            } else {
                this.showAddModal(show);
            }
        });

        // Handle poster image
        let posterUrl = '/static/images/no-poster.png';
        if (show.poster_path && show.poster_path !== 'null' && show.poster_path !== null) {
            posterUrl = show.poster_path;
        }

        const year = show.first_air_date ? new Date(show.first_air_date).getFullYear() : 'Unknown';
        const overview = show.overview || 'No description available.';
        const truncatedOverview = overview.length > 150 ? overview.substring(0, 150) + '...' : overview;

        div.innerHTML = `
            <div class="search-result-content">
                <div class="search-result-poster">
                    <img src="${posterUrl}" alt="${show.name}" 
                         onerror="this.src='/static/images/no-poster.png'; this.onerror=null;"
                         loading="lazy">
                </div>
                <div class="search-result-info">
                    <h4>${show.name}</h4>
                    <div class="search-result-date">${year}</div>
                    <div class="search-result-overview">${truncatedOverview}</div>
                    ${isInstantSearch ? 
                        '<div class="search-result-hint"><i class="fas fa-plus"></i> Click to add with 1 season</div>' : 
                        '<div class="search-result-hint"><i class="fas fa-cog"></i> Click to configure</div>'
                    }
                </div>
            </div>
        `;

        return div;
    },

    // Show add show modal
    async showAddModal(show) {
        this.state.selectedShow = show;
        
        try {
            // Get detailed show information
            const response = await fetch(`/api/search?query=${encodeURIComponent(show.name)}`);
            const data = await response.json();
            
            // Find the exact show from search results
            const detailedShow = data.results.find(s => s.id === show.id) || show;
            
            this.populateAddModal(detailedShow);
            this.elements.addShowModal.classList.remove('hidden');
        } catch (error) {
            console.error('Error loading show details:', error);
            this.populateAddModal(show);
            this.elements.addShowModal.classList.remove('hidden');
        }
    },

    // Add show directly (for instant search) with default 1 season
    async addShowDirectly(show) {
        this.state.selectedShow = show;
        this.showLoading();

        try {
            const response = await fetch('/api/watched', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    id: show.id,
                    seasons_watched: 1  // Default to 1 season
                })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to add show');
            }

            this.showToast(`Added "${show.name}" to your watched list!`);
            this.loadWatchedShows();
            this.hideSearchResults();
            this.elements.searchInput.value = '';
        } catch (error) {
            console.error('Error adding show:', error);
            this.showToast('Failed to add show. Please try again.', 'error');
        } finally {
            this.hideLoading();
        }
    },

    // Populate add show modal
    populateAddModal(show) {
        const modalTitle = document.getElementById('modalShowTitle');
        const modalInfo = document.getElementById('modalShowInfo');
        const seasonsInput = document.getElementById('seasonsWatched');

        modalTitle.textContent = `Add "${show.name}"`;
        
        // Better poster URL handling
        let posterUrl = '/static/images/no-poster.png';
        if (show.poster_path && show.poster_path !== 'null' && show.poster_path !== null) {
            posterUrl = show.poster_path;
        }
        
        const year = show.first_air_date ? new Date(show.first_air_date).getFullYear() : 'Unknown';
        const overview = show.overview || 'No description available.';

        modalInfo.innerHTML = `
            <div class="show-poster">
                <img src="${posterUrl}" alt="${show.name}" 
                     onerror="this.src='/static/images/no-poster.png'; this.onerror=null;"
                     loading="lazy">
            </div>
            <div class="show-details">
                <h5>${show.name}</h5>
                <p><strong>First aired:</strong> ${year}</p>
                <p>${overview}</p>
            </div>
        `;

        seasonsInput.value = 1;
        seasonsInput.focus();
    },

    // Hide add show modal
    hideAddModal() {
        this.elements.addShowModal.classList.add('hidden');
        this.state.selectedShow = null;
    },

    // Add show to watched list
    async addShowToWatched() {
        if (!this.state.selectedShow) return;

        const seasonsWatched = parseInt(document.getElementById('seasonsWatched').value);
        if (isNaN(seasonsWatched) || seasonsWatched < 1) {
            this.showToast('Please enter a valid number of seasons', 'error');
            return;
        }

        this.showLoading();

        try {
            const response = await fetch('/api/watched', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    id: this.state.selectedShow.id,
                    seasons_watched: seasonsWatched
                })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to add show');
            }

            this.showToast(`Added "${this.state.selectedShow.name}" to your watched list!`);
            this.hideAddModal();
            this.loadWatchedShows();
            this.hideSearchResults();
            this.elements.searchInput.value = '';
        } catch (error) {
            console.error('Error adding show:', error);
            this.showToast('Failed to add show. Please try again.', 'error');
        } finally {
            this.hideLoading();
        }
    },

    // Load watched shows from API
    async loadWatchedShows() {
        try {
            const response = await fetch('/api/watched');
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to load watched shows');
            }

            this.state.watchedShows = data.watched_shows;
            this.state.totalTime = data.total_time_minutes;
            
            this.updateTotalTimeDisplay(data.total_time_formatted);
            this.displayWatchedShows();
        } catch (error) {
            console.error('Error loading watched shows:', error);
            this.showToast('Failed to load watched shows', 'error');
        }
    },

    // Update total time display
    updateTotalTimeDisplay(formattedTime) {
        if (this.elements.totalWatchTime) {
            const timeValue = this.elements.totalWatchTime.querySelector('.time-value');
            if (timeValue) {
                timeValue.textContent = formattedTime || '0 minutes';
            }
        }
    },

    // Display watched shows
    displayWatchedShows() {
        this.elements.watchedShows.innerHTML = '';

        if (this.state.watchedShows.length === 0) {
            this.elements.emptyState.classList.remove('hidden');
            return;
        }

        this.elements.emptyState.classList.add('hidden');

        this.state.watchedShows.forEach(show => {
            const showElement = this.createWatchedShowElement(show);
            this.elements.watchedShows.appendChild(showElement);
        });
    },

    // Create watched show element
    createWatchedShowElement(show) {
        const div = document.createElement('div');
        div.className = 'watched-show';

        const posterUrl = show.poster_path || '/static/images/no-poster.png';
        const watchTime = this.calculateShowTime(show);

        div.innerHTML = `
            <div class="watched-show-header">
                <div class="watched-show-info">
                    <h4>${show.name}</h4>
                    <div class="watched-show-seasons">
                        <div class="seasons-display" onclick="App.editSeasons(${show.id})">
                            <i class="fas fa-eye"></i> ${show.seasons_watched} season${show.seasons_watched !== 1 ? 's' : ''} watched 
                            <i class="fas fa-edit" style="font-size: 0.8em; opacity: 0.7;"></i>
                        </div>
                        <div class="seasons-edit" id="seasonsEdit-${show.id}">
                            <input type="number" min="0" value="${show.seasons_watched}" id="seasonsInput-${show.id}">
                            <button class="seasons-edit-btn seasons-edit-save" onclick="App.saveSeasons(${show.id})">
                                <i class="fas fa-check"></i>
                            </button>
                            <button class="seasons-edit-btn seasons-edit-cancel" onclick="App.cancelEditSeasons(${show.id})">
                                <i class="fas fa-times"></i>
                            </button>
                        </div>
                    </div>
                </div>
                <div class="watched-show-time"><i class="fas fa-clock"></i> ${watchTime}</div>
            </div>
            <div class="watched-show-actions">
                <button type="button" class="btn btn-danger" onclick="App.removeShow(${show.id})">
                    <i class="fas fa-trash"></i> Remove
                </button>
            </div>
        `;

        return div;
    },

    // Calculate show time in formatted string
    calculateShowTime(show) {
        const episodesPerSeason = 20; // Default assumption
        const totalEpisodes = show.seasons_watched * episodesPerSeason;
        const totalMinutes = totalEpisodes * (show.episode_run_time || 45);
        
        return this.formatTime(totalMinutes);
    },

    // Format time in minutes to human readable string
    formatTime(minutes) {
        if (minutes < 60) return `${minutes}m`;
        
        const hours = Math.floor(minutes / 60);
        const remainingMinutes = minutes % 60;
        
        if (hours < 24) {
            return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
        }
        
        const days = Math.floor(hours / 24);
        const remainingHours = hours % 24;
        
        return remainingHours > 0 ? `${days}d ${remainingHours}h` : `${days}d`;
    },

    // Inline season editing methods
    editSeasons(showId) {
        const displayElement = document.querySelector(`#seasonsEdit-${showId}`).previousElementSibling;
        const editElement = document.getElementById(`seasonsEdit-${showId}`);
        const inputElement = document.getElementById(`seasonsInput-${showId}`);
        
        displayElement.style.display = 'none';
        editElement.style.display = 'flex';
        inputElement.focus();
        inputElement.select();
    },

    cancelEditSeasons(showId) {
        const show = this.state.watchedShows.find(s => s.id === showId);
        const displayElement = document.querySelector(`#seasonsEdit-${showId}`).previousElementSibling;
        const editElement = document.getElementById(`seasonsEdit-${showId}`);
        const inputElement = document.getElementById(`seasonsInput-${showId}`);
        
        // Reset input to original value
        inputElement.value = show ? show.seasons_watched : 1;
        
        displayElement.style.display = 'block';
        editElement.style.display = 'none';
    },

    async saveSeasons(showId) {
        const inputElement = document.getElementById(`seasonsInput-${showId}`);
        const seasonsWatched = parseInt(inputElement.value);
        
        if (isNaN(seasonsWatched) || seasonsWatched < 0) {
            this.showToast('Please enter a valid number of seasons', 'error');
            return;
        }

        this.showLoading();

        try {
            const response = await fetch(`/api/watched/${showId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    seasons_watched: seasonsWatched
                })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to update show');
            }

            const show = this.state.watchedShows.find(s => s.id === showId);
            this.showToast(`Updated "${show ? show.name : 'show'}"!`);
            this.loadWatchedShows();
        } catch (error) {
            console.error('Error updating show:', error);
            this.showToast('Failed to update show. Please try again.', 'error');
            this.cancelEditSeasons(showId);
        } finally {
            this.hideLoading();
        }
    },

    // Remove show from watched list
    async removeShow(showId) {
        const show = this.state.watchedShows.find(s => s.id === showId);
        if (!show) return;

        if (!confirm(`Are you sure you want to remove "${show.name}" from your watched list?`)) {
            return;
        }

        this.showLoading();

        try {
            const response = await fetch(`/api/watched/${showId}`, {
                method: 'DELETE'
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to remove show');
            }

            this.showToast(`Removed "${show.name}" from your watched list`);
            this.loadWatchedShows();
        } catch (error) {
            console.error('Error removing show:', error);
            this.showToast('Failed to remove show. Please try again.', 'error');
        } finally {
            this.hideLoading();
        }
    },

    // Show loading spinner
    showLoading() {
        this.state.isLoading = true;
        this.elements.loadingSpinner.classList.remove('hidden');
    },

    // Hide loading spinner
    hideLoading() {
        this.state.isLoading = false;
        this.elements.loadingSpinner.classList.add('hidden');
    },

    // Show toast notification
    showToast(message, type = 'success') {
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = message;

        this.elements.toastContainer.appendChild(toast);

        // Auto-remove after 5 seconds
        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 5000);
    }
};

// Statistics App for stats page
const StatsApp = {
    // Initialize stats page
    init() {
        this.loadStats();
        console.log('Stats app initialized');
    },

    // Load and display statistics
    async loadStats() {
        const loadingElement = document.getElementById('statsLoading');
        const emptyElement = document.getElementById('statsEmpty');

        try {
            loadingElement.classList.remove('hidden');

            const response = await fetch('/api/stats');
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to load statistics');
            }

            loadingElement.classList.add('hidden');

            if (data.total_shows === 0) {
                emptyElement.classList.remove('hidden');
                return;
            }

            this.displayStats(data);
        } catch (error) {
            console.error('Error loading statistics:', error);
            loadingElement.classList.add('hidden');
            emptyElement.classList.remove('hidden');
        }
    },

    // Display statistics data
    displayStats(stats) {
        // Overview stats
        document.getElementById('totalShows').textContent = stats.total_shows;
        document.getElementById('totalSeasons').textContent = stats.total_seasons;
        document.getElementById('totalTime').textContent = stats.total_time_formatted;
        document.getElementById('averageTime').textContent = stats.average_time_per_show_formatted;

        // Completion stats
        document.getElementById('completedShows').textContent = stats.completion_stats.completed_shows;
        document.getElementById('inProgressShows').textContent = stats.completion_stats.in_progress_shows;
        document.getElementById('completionRate').textContent = `${stats.completion_stats.completion_rate}%`;

        // Genre breakdown
        this.displayGenreBreakdown(stats.genre_breakdown);

        // Yearly breakdown
        this.displayYearlyBreakdown(stats.yearly_breakdown);
    },

    // Display genre breakdown
    displayGenreBreakdown(genres) {
        const container = document.getElementById('genreBreakdown');
        container.innerHTML = '';

        if (Object.keys(genres).length === 0) {
            container.innerHTML = '<p class="text-center">No genre data available</p>';
            return;
        }

        // Sort genres by time spent
        const sortedGenres = Object.entries(genres).sort((a, b) => b[1] - a[1]);

        sortedGenres.forEach(([genre, minutes]) => {
            const div = document.createElement('div');
            div.className = 'genre-item';
            div.innerHTML = `
                <span class="genre-name">${genre}</span>
                <span class="genre-time">${this.formatTime(minutes)}</span>
            `;
            container.appendChild(div);
        });
    },

    // Display yearly breakdown
    displayYearlyBreakdown(years) {
        const container = document.getElementById('yearlyBreakdown');
        container.innerHTML = '';

        if (Object.keys(years).length === 0) {
            container.innerHTML = '<p class="text-center">No yearly data available</p>';
            return;
        }

        // Sort years
        const sortedYears = Object.entries(years).sort((a, b) => {
            if (a[0] === 'Unknown') return 1;
            if (b[0] === 'Unknown') return -1;
            return parseInt(b[0]) - parseInt(a[0]);
        });

        sortedYears.forEach(([year, minutes]) => {
            const div = document.createElement('div');
            div.className = 'yearly-item';
            div.innerHTML = `
                <span class="year-name">${year}</span>
                <span class="year-time">${this.formatTime(minutes)}</span>
            `;
            container.appendChild(div);
        });
    },

    // Format time (same as main app)
    formatTime(minutes) {
        if (minutes < 60) return `${minutes}m`;
        
        const hours = Math.floor(minutes / 60);
        const remainingMinutes = minutes % 60;
        
        if (hours < 24) {
            return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
        }
        
        const days = Math.floor(hours / 24);
        const remainingHours = hours % 24;
        
        return remainingHours > 0 ? `${days}d ${remainingHours}h` : `${days}d`;
    }
};

// Make sure the apps are available globally
window.App = App;
window.StatsApp = StatsApp;