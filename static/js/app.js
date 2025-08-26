// Days Watched - Main Application JavaScript

// Data Storage Service for localStorage management
const DataStorage = {
    WATCHED_SHOWS_KEY: 'days_watched_shows',
    SORT_PREFERENCE_KEY: 'days_watched_sort_preference',

    // Get watched shows from localStorage
    getWatchedShows() {
        try {
            const data = localStorage.getItem(this.WATCHED_SHOWS_KEY);
            return data ? JSON.parse(data) : [];
        } catch (error) {
            console.error('Error reading from localStorage:', error);
            return [];
        }
    },

    // Save watched shows to localStorage
    setWatchedShows(watchedShows) {
        try {
            localStorage.setItem(this.WATCHED_SHOWS_KEY, JSON.stringify(watchedShows));
            return true;
        } catch (error) {
            console.error('Error writing to localStorage:', error);
            return false;
        }
    },

    // Clear all data from localStorage
    clearAll() {
        try {
            localStorage.removeItem(this.WATCHED_SHOWS_KEY);
            localStorage.removeItem(this.SORT_PREFERENCE_KEY);
            return true;
        } catch (error) {
            console.error('Error clearing localStorage:', error);
            return false;
        }
    },

    // Get sort preference
    getSortPreference() {
        try {
            return localStorage.getItem(this.SORT_PREFERENCE_KEY) || 'alphabet-asc';
        } catch (error) {
            console.error('Error reading sort preference:', error);
            return 'alphabet-asc';
        }
    },

    // Save sort preference
    setSortPreference(sortValue) {
        try {
            localStorage.setItem(this.SORT_PREFERENCE_KEY, sortValue);
            return true;
        } catch (error) {
            console.error('Error saving sort preference:', error);
            return false;
        }
    },

    // Migrate data from cookies to localStorage (one-time migration)
    migrateFromCookies() {
        try {
            // Check if we already have data in localStorage
            const existingData = this.getWatchedShows();
            if (existingData.length > 0) {
                return; // Already have localStorage data, no migration needed
            }

            // Try to get data from cookie
            const cookies = document.cookie.split(';');
            const watchedCookie = cookies.find(cookie => cookie.trim().startsWith('watched_shows='));
            
            if (watchedCookie) {
                const cookieValue = decodeURIComponent(watchedCookie.split('=')[1]);
                const watchedShows = JSON.parse(cookieValue);
                
                if (watchedShows.length > 0) {
                    console.log('Migrating', watchedShows.length, 'shows from cookies to localStorage');
                    this.setWatchedShows(watchedShows);
                    
                    // Clear the cookie after successful migration
                    document.cookie = 'watched_shows=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/';
                }
            }

            // Migrate sort preference too
            const sortCookie = cookies.find(cookie => cookie.trim().startsWith('sort_preference='));
            if (sortCookie) {
                const sortValue = sortCookie.split('=')[1];
                this.setSortPreference(sortValue);
                
                // Clear the cookie after successful migration
                document.cookie = 'sort_preference=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/';
            }
        } catch (error) {
            console.error('Error during cookie migration:', error);
        }
    },

    // Check localStorage availability and capacity
    checkStorageAvailability() {
        try {
            const testKey = 'days_watched_test';
            localStorage.setItem(testKey, 'test');
            localStorage.removeItem(testKey);
            return true;
        } catch (error) {
            console.error('localStorage is not available:', error);
            return false;
        }
    }
};

// Application object
const App = {
    // Application state
    state: {
        currentSearch: null,
        watchedShows: [],
        totalTime: 0,
        previousTotalTime: 0,
        isLoading: false,
        selectedShow: null,
        searchRequestId: 0,
        pendingSearchController: null
    },

    // DOM elements
    elements: {
        searchInput: null,
        searchResults: null,
        watchedShows: null,
        emptyState: null,
        totalWatchTime: null,
        loadingSpinner: null,
        addShowModal: null,
        toastContainer: null,
        sortControls: null,
        sortSelect: null,
        removeAllBtn: null
    },

    // Initialize the application
    init() {
        // Check localStorage availability
        if (!DataStorage.checkStorageAvailability()) {
            this.showToast('Browser storage is not available. Some features may not work properly.', 'error');
        }

        // Migrate data from cookies if needed
        DataStorage.migrateFromCookies();

        this.initElements();
        this.bindEvents();
        this.loadWatchedShows();
        console.log('Days Watched app initialized with localStorage');
    },

    // Initialize DOM elements
    initElements() {
        this.elements.searchInput = document.getElementById('searchInput');
        this.elements.searchResults = document.getElementById('searchResults');
        this.elements.watchedShows = document.getElementById('watchedShows');
        this.elements.emptyState = document.getElementById('emptyState');
        this.elements.totalWatchTime = document.getElementById('totalWatchTime');
        this.elements.loadingSpinner = document.getElementById('loadingSpinner');
        this.elements.addShowModal = document.getElementById('addShowModal');
        this.elements.toastContainer = document.getElementById('toastContainer');
        this.elements.sortControls = document.getElementById('sortControls');
        this.elements.sortSelect = document.getElementById('sortSelect');
        this.elements.removeAllBtn = document.getElementById('removeAllBtn');
        
        // Debug: Check if search results element is found
        console.log('Search results element found:', this.elements.searchResults);
        if (this.elements.searchResults) {
            console.log('Search results element classes:', this.elements.searchResults.className);
            console.log('Search results element computed style:', {
                position: getComputedStyle(this.elements.searchResults).position,
                display: getComputedStyle(this.elements.searchResults).display,
                zIndex: getComputedStyle(this.elements.searchResults).zIndex
            });
        }
    },

    // Bind event listeners
    bindEvents() {
        // Search functionality
        this.setupSearchFunctionality();
        
        // Sort functionality
        if (this.elements.sortSelect) {
            // Load saved sort preference from localStorage
            this.loadSortPreference();
            
            this.elements.sortSelect.addEventListener('change', () => {
                this.saveSortPreference();
                this.sortWatchedShows();
            });
        }
        
        // Remove all data functionality
        if (this.elements.removeAllBtn) {
            this.elements.removeAllBtn.addEventListener('click', () => {
                this.confirmRemoveAllData();
            });
        }
        
        // Close search results when clicking outside
        document.addEventListener('click', (e) => {
            if (!this.elements.searchInput.contains(e.target) && 
                !this.elements.searchResults.contains(e.target)) {
                this.hideSearchResults();
            }
        });

        // Close season editing when clicking outside
        document.addEventListener('click', (e) => {
            // Find any open season editing elements
            const openEdits = document.querySelectorAll('.seasons-edit[style*="display: flex"]');
            openEdits.forEach(editElement => {
                const showCard = editElement.closest('.watched-show');
                const showId = editElement.id.replace('seasonsEdit-', '');
                
                // If click is outside the show card, close the editing
                if (showCard && !showCard.contains(e.target)) {
                    this.cancelEditSeasons(parseInt(showId));
                }
            });
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
            
            // Trigger instant search after 100ms delay for queries >= 2 characters
            if (query.length >= 2) {
                searchTimeout = setTimeout(() => {
                    this.performSearch(query, true);
                }, 100);
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

        // Cancel any pending search request
        if (this.state.pendingSearchController) {
            this.state.pendingSearchController.abort();
        }

        // Generate a unique request ID to track this search
        const requestId = ++this.state.searchRequestId;
        
        // Create a new AbortController for this request
        const controller = new AbortController();
        this.state.pendingSearchController = controller;

        try {
            // Show loading state
            this.showSearchLoading();

            const response = await fetch(`/api/search?query=${encodeURIComponent(query)}`, {
                signal: controller.signal
            });
            const data = await response.json();
            
            console.log('Search response:', data);
            
            if (!response.ok) {
                throw new Error(data.error || 'Search failed');
            }

            // Only process this response if it's the most recent request
            if (requestId === this.state.searchRequestId) {
                // For instant search, limit to 5 results. For manual search, show more
                const maxResults = isInstantSearch ? 5 : 10;
                const results = data.results.slice(0, maxResults);
                
                this.displaySearchResults(results, isInstantSearch);
                this.state.currentSearch = data;
                
                // Clear the pending controller since this request completed successfully
                this.state.pendingSearchController = null;
            } else {
                console.log('Ignoring outdated search response for:', query);
            }
            
        } catch (error) {
            // Only show error if the request wasn't aborted and it's the most recent request
            if (error.name !== 'AbortError' && requestId === this.state.searchRequestId) {
                console.error('Search error:', error);
                this.showToast('Search failed. Please try again.', 'error');
                this.hideSearchResults();
                this.state.pendingSearchController = null;
            }
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
        console.log('Search results element:', this.elements.searchResults);
        
        // Clear previous results
        this.elements.searchResults.innerHTML = '';
        this.elements.searchResults.classList.remove('hidden');

        // Debug: Log the visibility and positioning
        console.log('Search results visibility after show:', {
            display: getComputedStyle(this.elements.searchResults).display,
            position: getComputedStyle(this.elements.searchResults).position,
            zIndex: getComputedStyle(this.elements.searchResults).zIndex,
            top: getComputedStyle(this.elements.searchResults).top,
            left: getComputedStyle(this.elements.searchResults).left,
            width: getComputedStyle(this.elements.searchResults).width,
            height: getComputedStyle(this.elements.searchResults).height
        });

        if (!results || results.length === 0) {
            this.elements.searchResults.innerHTML = `
                <div class="search-no-results">
                    <i class="fas fa-search"></i>
                    <p>No shows found. Try a different search term.</p>
                </div>
            `;
            return;
        }

        // Create result elements
        const createResults = async () => {
            for (const show of results) {
                const resultElement = await this.createSearchResultElement(show, isInstantSearch);
                this.elements.searchResults.appendChild(resultElement);
            }
        };
        
        createResults().then(() => {
            console.log('Search results displayed successfully');
            
            // Force a reflow to ensure visibility
            this.elements.searchResults.offsetHeight;
        });
    },

    // Create search result element
    async createSearchResultElement(show, isInstantSearch = false) {
        const div = document.createElement('div');
        div.className = 'search-result';

        // Handle poster image
        let posterUrl = '/static/images/no-poster.png';
        if (show.poster_path && show.poster_path !== 'null' && show.poster_path !== null) {
            posterUrl = show.poster_path;
        }

        const year = show.first_air_date ? new Date(show.first_air_date).getFullYear() : 'Unknown';
        const overview = show.overview || 'No description available.';
        const truncatedOverview = overview.length > 150 ? overview.substring(0, 150) + '...' : overview;

        // Get total seasons from the show data returned by the API
        const totalSeasons = show.number_of_seasons || 1;

        // Create season selector bars
        const seasonBars = this.createSeasonSelectorBars(totalSeasons, show);

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
                    <div class="search-result-seasons">
                        <div class="season-selector-label">Add seasons:</div>
                        <div class="season-selector-bars" data-show-id="${show.id}">
                            ${seasonBars}
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Add hover effects for season bars
        setTimeout(() => {
            const seasonBarsContainer = div.querySelector('.season-selector-bars');
            if (seasonBarsContainer) {
                this.setupSeasonBarHoverEffects(seasonBarsContainer);
            }
        }, 0);

        // Add click handler for entire search result to add all seasons when clicking outside season buttons
        div.addEventListener('click', (e) => {
            // Don't trigger if clicking on season buttons
            if (!e.target.closest('.season-selector-bars')) {
                this.addShowWithSeasons(show.id, totalSeasons, show.name);
            }
        });

        return div;
    },

    // Create season selector bars
    createSeasonSelectorBars(totalSeasons, show) {
        let barsHtml = '';
        for (let i = 1; i <= totalSeasons; i++) {
            barsHtml += `
                <div class="season-bar" 
                     data-season="${i}" 
                     data-show-id="${show.id}"
                     onclick="App.addShowWithSeasons(${show.id}, ${i}, '${show.name.replace(/'/g, "\\'")}')">
                    ${i}
                </div>
            `;
        }
        return barsHtml;
    },

    // Create season selector bars for editing existing shows
    createEditSeasonSelectorBars(totalSeasons, show, currentSeasons) {
        let barsHtml = '';
        for (let i = 1; i <= totalSeasons; i++) {
            const isSelected = i <= currentSeasons;
            barsHtml += `
                <div class="season-bar edit-season-bar ${isSelected ? 'highlighted' : ''}" 
                     data-season="${i}" 
                     data-show-id="${show.id}"
                     onclick="App.selectEditSeasons(${show.id}, ${i})">
                    ${i}
                </div>
            `;
        }
        return barsHtml;
    },

    // Setup hover effects for season bars
    setupSeasonBarHoverEffects(container) {
        const bars = container.querySelectorAll('.season-bar');
        
        bars.forEach((bar, index) => {
            bar.addEventListener('mouseenter', () => {
                // Reset all bars
                bars.forEach(b => b.classList.remove('highlighted'));
                
                // Highlight all bars up to and including the hovered one
                for (let i = 0; i <= index; i++) {
                    bars[i].classList.add('highlighted');
                }
            });
            
            bar.addEventListener('click', (e) => {
                e.stopPropagation(); // Prevent triggering search result click
            });
        });
        
        container.addEventListener('mouseleave', () => {
            // Remove all highlights when leaving the container
            bars.forEach(b => b.classList.remove('highlighted'));
        });
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
            this.elements.searchInput.focus();
        } catch (error) {
            console.error('Error adding show:', error);
            this.showToast('Failed to add show. Please try again.', 'error');
        } finally {
            this.hideLoading();
        }
    },

    // Add show with specific number of seasons (for season selector bars)
    async addShowWithSeasons(showId, seasonsWatched, showName) {
        // Find the show in current search results
        const show = this.state.currentSearch?.results?.find(s => s.id === showId);
        if (!show) {
            this.showToast('Show not found. Please try again.', 'error');
            return;
        }

        this.state.selectedShow = show;
        this.showLoading();

        try {
            // Get current watched shows from localStorage
            const currentWatchedShows = DataStorage.getWatchedShows();

            const response = await fetch('/api/watched', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    id: show.id,
                    seasons_watched: seasonsWatched,
                    current_watched_shows: currentWatchedShows
                })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to add show');
            }

            // Update localStorage with the new data
            if (data.updated_watched_shows) {
                DataStorage.setWatchedShows(data.updated_watched_shows);
            }

            this.showToast(`Added "${showName}" with ${seasonsWatched} season${seasonsWatched !== 1 ? 's' : ''} to your watched list!`);
            this.loadWatchedShows();
            this.hideSearchResults();
            this.elements.searchInput.value = '';
            this.elements.searchInput.focus();
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
            // Get current watched shows from localStorage
            const currentWatchedShows = DataStorage.getWatchedShows();

            const response = await fetch('/api/watched', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    id: this.state.selectedShow.id,
                    seasons_watched: seasonsWatched,
                    current_watched_shows: currentWatchedShows
                })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to add show');
            }

            // Update localStorage with the new data
            if (data.updated_watched_shows) {
                DataStorage.setWatchedShows(data.updated_watched_shows);
            }

            this.showToast(`Added "${this.state.selectedShow.name}" to your watched list!`);
            this.hideAddModal();
            this.loadWatchedShows();
            this.hideSearchResults();
            this.elements.searchInput.value = '';
            this.elements.searchInput.focus();
        } catch (error) {
            console.error('Error adding show:', error);
            this.showToast('Failed to add show. Please try again.', 'error');
        } finally {
            this.hideLoading();
        }
    },

    // Load watched shows from localStorage and API
    async loadWatchedShows() {
        try {
            // Get watched shows from localStorage
            const watchedShows = DataStorage.getWatchedShows();

            // Send data to API for calculation using POST to /api/watched/calculate
            const response = await fetch('/api/watched/calculate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    watched_shows: watchedShows
                })
            });
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to load watched shows');
            }

            this.state.watchedShows = data.watched_shows;
            
            this.updateTotalTimeDisplay(data.total_time_formatted, data.total_time_minutes);
            
            // Apply current sort if any is selected, then display
            if (this.elements.sortSelect && this.elements.sortSelect.value) {
                this.applySortToCurrentShows();
            }
            
            this.displayWatchedShows();
        } catch (error) {
            console.error('Error loading watched shows:', error);
            // Fallback to localStorage data only
            this.state.watchedShows = DataStorage.getWatchedShows();
            this.displayWatchedShows();
            this.showToast('Loaded shows from local storage', 'warning');
        }
    },

    // Update total time display with animations
    updateTotalTimeDisplay(formattedTime, newTimeMinutes = null) {
        if (!this.elements.totalWatchTime) return;
        
        const timeValue = this.elements.totalWatchTime.querySelector('.time-value');
        if (!timeValue) return;

        const currentText = timeValue.textContent;
        const newText = formattedTime || '0 minutes';
        
        // If no change, just update without animation
        if (currentText === newText) {
            timeValue.textContent = newText;
            return;
        }

        // Store the new time value for comparison
        if (newTimeMinutes !== null) {
            this.state.previousTotalTime = this.state.totalTime;
            this.state.totalTime = newTimeMinutes;
        }

        // Determine if this is an increase or decrease
        const isIncrease = this.state.totalTime > this.state.previousTotalTime;
        const isDecrease = this.state.totalTime < this.state.previousTotalTime;

        // Clear any existing animation classes
        timeValue.classList.remove('animating', 'increase', 'decrease');

        // If we have both old and new minute values, animate the counting
        if (this.state.previousTotalTime !== 0 && this.state.totalTime !== this.state.previousTotalTime) {
            this.animateTimeValue(timeValue, this.state.previousTotalTime, this.state.totalTime, isIncrease, isDecrease);
        } else {
            // Simple update for first load
            timeValue.textContent = newText;
            if (isIncrease || isDecrease) {
                this.triggerCelebrationEffect(timeValue, isIncrease);
            }
        }
    },

    // Animate time value with counting effect
    animateTimeValue(element, fromMinutes, toMinutes, isIncrease, isDecrease) {
        const duration = 1200; // 1.2 seconds
        const startTime = performance.now();
        
        // Add appropriate animation class
        if (isIncrease) {
            element.classList.add('increase');
        } else if (isDecrease) {
            element.classList.add('decrease');
        }
        element.classList.add('animating');

        const animate = (currentTime) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            // Use easeOutQuart for smooth animation
            const easeProgress = 1 - Math.pow(1 - progress, 4);
            
            // Calculate current minute value
            const currentMinutes = Math.round(fromMinutes + (toMinutes - fromMinutes) * easeProgress);
            
            // Format and display current value
            element.textContent = this.formatTime(currentMinutes);
            
            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                // Animation complete - trigger celebration for significant increases
                if (isIncrease && (toMinutes - fromMinutes) > 60) { // More than 1 hour increase
                    this.triggerCelebrationEffect(element, true);
                }
                
                // Clean up animation classes after a delay
                setTimeout(() => {
                    element.classList.remove('animating', 'increase', 'decrease');
                }, 500);
            }
        };

        requestAnimationFrame(animate);
    },

    // Trigger celebration particle effect
    triggerCelebrationEffect(element, isIncrease) {
        if (!isIncrease) return;

        const container = element.closest('.watch-time-display');
        if (!container) return;

        // Create celebration container
        const celebration = document.createElement('div');
        celebration.className = 'time-celebration';
        container.style.position = 'relative';
        container.appendChild(celebration);

        // Generate particles
        const particleCount = 12;
        for (let i = 0; i < particleCount; i++) {
            const particle = document.createElement('div');
            particle.className = 'particle';
            
            // Random direction and distance
            const angle = (i / particleCount) * 2 * Math.PI;
            const distance = 40 + Math.random() * 30;
            const dx = Math.cos(angle) * distance;
            const dy = Math.sin(angle) * distance;
            
            particle.style.setProperty('--dx', `${dx}px`);
            particle.style.setProperty('--dy', `${dy}px`);
            
            // Random delay for staggered effect
            particle.style.animationDelay = `${Math.random() * 0.3}s`;
            
            celebration.appendChild(particle);
        }

        // Clean up after animation
        setTimeout(() => {
            if (celebration.parentNode) {
                celebration.parentNode.removeChild(celebration);
            }
        }, 2000);
    },

    // Sort watched shows based on selected criteria
    sortWatchedShows() {
        this.applySortToCurrentShows();
        this.displayWatchedShows();
    },
    
    // Apply sort to current shows without re-displaying
    applySortToCurrentShows() {
        if (!this.elements.sortSelect) return;
        
        const sortBy = this.elements.sortSelect.value;
        const shows = [...this.state.watchedShows]; // Create a copy to sort
        
        switch (sortBy) {
            case 'alphabet-asc':
                shows.sort((a, b) => a.name.localeCompare(b.name));
                break;
            case 'watchtime-desc':
                shows.sort((a, b) => {
                    const timeA = this.calculateShowTimeInMinutes(a);
                    const timeB = this.calculateShowTimeInMinutes(b);
                    return timeB - timeA; // Descending order
                });
                break;
            default:
                break;
        }
        
        // Update the state with sorted shows
        this.state.watchedShows = shows;
    },

    // Calculate show time in minutes for sorting
    calculateShowTimeInMinutes(show) {
        // Check if we have a pre-calculated precise runtime (new approach)
        if (show.calculated_runtime_minutes !== undefined) {
            return parseInt(show.calculated_runtime_minutes);
        }
        
        // Legacy calculation for existing shows without pre-calculated runtime
        // Use actual episode counts from TMDB when available
        const totalEpisodesInShow = show.total_episodes || 0;
        const totalSeasonsInShow = show.total_seasons || 1;
        
        let episodesPerSeason;
        if (totalEpisodesInShow > 0 && totalSeasonsInShow > 0) {
            // Calculate actual episodes per season from TMDB data
            episodesPerSeason = totalEpisodesInShow / totalSeasonsInShow;
        } else {
            // Fallback to assumption of 20 episodes per season for shows without episode count data
            episodesPerSeason = 20;
        }
        
        const totalEpisodes = show.seasons_watched * episodesPerSeason;
        const totalMinutes = totalEpisodes * (show.episode_run_time || 45);
        return Math.round(totalMinutes);
    },

    // Display watched shows
    displayWatchedShows() {
        this.elements.watchedShows.innerHTML = '';

        if (this.state.watchedShows.length === 0) {
            this.elements.emptyState.classList.remove('hidden');
            if (this.elements.sortControls) {
                this.elements.sortControls.style.display = 'none';
            }
            return;
        }

        this.elements.emptyState.classList.add('hidden');
        
        // Show sort controls when there are shows
        if (this.elements.sortControls) {
            this.elements.sortControls.style.display = 'flex';
        }

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
        const totalSeasons = show.total_seasons || 1;

        // Create edit season selector bars
        const editSeasonBars = this.createEditSeasonSelectorBars(totalSeasons, show, show.seasons_watched);

        div.innerHTML = `
            <div class="watched-show-remove" onclick="App.removeShow(${show.id})" title="Remove show">
                <i class="fas fa-times"></i>
            </div>
            <div class="watched-show-poster">
                <img src="${posterUrl}" alt="${show.name}" 
                     onerror="this.src='/static/images/no-poster.png'; this.onerror=null;"
                     loading="lazy">
            </div>
            <div class="watched-show-content">
                <div class="watched-show-info">
                    <h4>${show.name}</h4>
                    <div class="watched-show-seasons">
                        <div class="seasons-display" onclick="App.editSeasons(${show.id})">
                            <i class="fas fa-eye"></i> ${show.seasons_watched} of ${totalSeasons} season${totalSeasons !== 1 ? 's' : ''} watched 
                            <i class="fas fa-edit" style="font-size: 0.8em; opacity: 0.7;"></i>
                        </div>
                        <div class="seasons-edit" id="seasonsEdit-${show.id}" data-selected-seasons="${show.seasons_watched}">
                            <div class="season-selector-bars edit-season-bars">
                                ${editSeasonBars}
                            </div>
                        </div>
                    </div>
                </div>
                <div class="watched-show-time"><i class="fas fa-clock"></i> ${watchTime}</div>
            </div>
        `;

        return div;
    },

    // Calculate show time in formatted string
    calculateShowTime(show) {
        const totalMinutes = this.calculateShowTimeInMinutes(show);
        return this.formatTime(totalMinutes);
    },

    // Format time in minutes to human readable string
    formatTime(minutes) {
        if (minutes === 0) {
            return "0h";
        }
        
        const hours = Math.floor(minutes / 60);
        const remainingMinutes = minutes % 60;
        
        if (hours === 0) {
            return remainingMinutes === 1 ? "1 minute" : `${remainingMinutes} minutes`;
        }
        
        if (hours < 24) {
            return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
        }
        
        const days = Math.floor(hours / 24);
        const remainingHours = hours % 24;
        
        // Always display hours, even when 0h
        return `${days}d ${remainingHours}h`;
    },

    // Inline season editing methods
    editSeasons(showId) {
        const displayElement = document.querySelector(`#seasonsEdit-${showId}`).previousElementSibling;
        const editElement = document.getElementById(`seasonsEdit-${showId}`);
        
        displayElement.style.display = 'none';
        editElement.style.display = 'flex';
        
        // Initialize the selected seasons to current value
        const show = this.state.watchedShows.find(s => s.id === showId);
        if (show) {
            editElement.setAttribute('data-selected-seasons', show.seasons_watched);
            // Update bars to show current selection without saving
            this.updateEditSeasonBars(showId, show.seasons_watched);
            // Setup hover effects for edit season bars
            this.setupEditSeasonHoverEffects(showId);
        }
    },

    cancelEditSeasons(showId) {
        const show = this.state.watchedShows.find(s => s.id === showId);
        const displayElement = document.querySelector(`#seasonsEdit-${showId}`).previousElementSibling;
        const editElement = document.getElementById(`seasonsEdit-${showId}`);
        
        displayElement.style.display = 'block';
        editElement.style.display = 'none';
    },

    // Update season bars visual state without triggering save
    updateEditSeasonBars(showId, selectedSeasons) {
        // Update all season bars to show selection state
        const container = document.getElementById(`seasonsEdit-${showId}`);
        const bars = container.querySelectorAll('.edit-season-bar');
        
        bars.forEach((bar, index) => {
            const seasonNumber = index + 1;
            if (seasonNumber <= selectedSeasons) {
                bar.classList.add('highlighted');
            } else {
                bar.classList.remove('highlighted');
            }
        });

        // Store the selected value 
        container.setAttribute('data-selected-seasons', selectedSeasons);
    },

    // Handle selection of seasons during editing
    selectEditSeasons(showId, selectedSeasons) {
        // Update bars visual state
        this.updateEditSeasonBars(showId, selectedSeasons);
        
        // Close the editing interface and save the selection
        this.saveSeasons(showId);
    },

    // Setup hover effects for edit season bars
    setupEditSeasonHoverEffects(showId) {
        const container = document.getElementById(`seasonsEdit-${showId}`);
        const bars = container.querySelectorAll('.edit-season-bar');
        
        bars.forEach((bar, index) => {
            bar.addEventListener('mouseenter', () => {
                // Reset all bars to base state
                bars.forEach(b => {
                    b.classList.remove('highlighted', 'hover-highlighted');
                });
                
                // Highlight all bars up to and including the hovered one with hover class
                for (let i = 0; i <= index; i++) {
                    bars[i].classList.add('hover-highlighted');
                }
            });
            
            bar.addEventListener('mouseleave', () => {
                // Remove hover highlights and restore current selection state
                bars.forEach(b => b.classList.remove('hover-highlighted'));
                
                // Restore the current selection highlights
                const currentSeasons = parseInt(container.getAttribute('data-selected-seasons')) || 0;
                bars.forEach((b, i) => {
                    if (i + 1 <= currentSeasons) {
                        b.classList.add('highlighted');
                    } else {
                        b.classList.remove('highlighted');
                    }
                });
            });
        });
        
        // Also handle container mouse leave to ensure proper state restoration
        container.addEventListener('mouseleave', () => {
            bars.forEach(b => b.classList.remove('hover-highlighted'));
            
            // Restore the current selection highlights
            const currentSeasons = parseInt(container.getAttribute('data-selected-seasons')) || 0;
            bars.forEach((b, i) => {
                if (i + 1 <= currentSeasons) {
                    b.classList.add('highlighted');
                } else {
                    b.classList.remove('highlighted');
                }
            });
        });
    },

    async saveSeasons(showId) {
        const editElement = document.getElementById(`seasonsEdit-${showId}`);
        const selectedSeasons = parseInt(editElement.getAttribute('data-selected-seasons')) || 0;
        
        // Find the show to get total seasons
        const show = this.state.watchedShows.find(s => s.id === showId);
        const maxSeasons = show ? (show.total_seasons || 1) : 1;
        
        if (selectedSeasons < 0) {
            this.showToast('Please select at least 0 seasons', 'error');
            return;
        }
        
        if (selectedSeasons > maxSeasons) {
            this.showToast(`Cannot exceed ${maxSeasons} season${maxSeasons !== 1 ? 's' : ''} for this show`, 'error');
            return;
        }

        this.showLoading();

        try {
            // Get current watched shows from localStorage
            const currentWatchedShows = DataStorage.getWatchedShows();

            const response = await fetch(`/api/watched/${showId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    seasons_watched: selectedSeasons,
                    current_watched_shows: currentWatchedShows
                })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to update show');
            }

            // Update localStorage with the new data
            if (data.updated_watched_shows) {
                DataStorage.setWatchedShows(data.updated_watched_shows);
            }

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
            // Get current watched shows from localStorage
            const currentWatchedShows = DataStorage.getWatchedShows();

            const response = await fetch(`/api/watched/${showId}`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    current_watched_shows: currentWatchedShows
                })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to remove show');
            }

            // Update localStorage with the new data
            if (data.updated_watched_shows) {
                DataStorage.setWatchedShows(data.updated_watched_shows);
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
    },

    // Save sort preference to localStorage
    saveSortPreference() {
        if (this.elements.sortSelect) {
            const sortValue = this.elements.sortSelect.value;
            DataStorage.setSortPreference(sortValue);
        }
    },

    // Load sort preference from localStorage
    loadSortPreference() {
        if (this.elements.sortSelect) {
            const sortValue = DataStorage.getSortPreference();
            this.elements.sortSelect.value = sortValue;
        }
    },

    // Confirm and remove all data
    confirmRemoveAllData() {
        const confirmMessage = "⚠️ WARNING: This will permanently delete all your watched shows data.\n\nThis action cannot be undone. Are you sure you want to continue?";
        
        if (confirm(confirmMessage)) {
            this.removeAllData();
        }
    },

    // Remove all data from storage
    async removeAllData() {
        try {
            this.showLoading();
            
            // Call the API to clear all watched shows data (including any remaining cookies)
            const response = await fetch('/api/watched', {
                method: 'DELETE'
            });
            
            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.error || 'Failed to clear data');
            }
            
            // Clear localStorage data
            DataStorage.clearAll();
            
            // Reset application state
            this.state.watchedShows = [];
            this.state.totalTime = 0;
            
            // Update UI
            this.updateTotalTimeDisplay('0h', 0);
            this.displayWatchedShows();
            
            // Reset sort select to default
            if (this.elements.sortSelect) {
                this.elements.sortSelect.value = 'alphabet-asc';
            }
            
            this.showToast('All data has been removed successfully', 'success');
            
        } catch (error) {
            console.error('Error removing all data:', error);
            this.showToast('Failed to remove data. Please try again.', 'error');
        } finally {
            this.hideLoading();
        }
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

            // Get watched shows from localStorage
            const watchedShows = DataStorage.getWatchedShows();

            // Send data to API for calculation using POST to /api/stats/calculate
            const response = await fetch('/api/stats/calculate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    watched_shows: watchedShows
                })
            });
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

        // Legacy breakdowns (keep for fallback)
        this.displayGenreBreakdown(stats.genre_breakdown);
        this.displayYearlyBreakdown(stats.yearly_breakdown);
        
        // New interactive charts
        this.createYearlyChart(stats.yearly_breakdown);
        this.createTopGenresChart(stats.genre_breakdown);
        this.createTopNetworksChart(stats.network_breakdown);
        this.displayFunConversions(stats.fun_conversions);
    },

    // Create yearly line chart using Plotly
    createYearlyChart(yearlyData) {
        const chartDiv = document.getElementById('yearlyChart');
        
        if (typeof Plotly === 'undefined') {
            // Fallback to simple HTML chart
            this.createSimpleYearlyChart(yearlyData, chartDiv);
            return;
        }
        
        if (Object.keys(yearlyData).length === 0) {
            chartDiv.innerHTML = '<p style="text-align: center; color: #cbd5e0; padding: 2rem;">No yearly data available</p>';
            return;
        }

        // Sort years and convert to chart data
        const sortedYears = Object.entries(yearlyData)
            .filter(([year]) => year !== 'Unknown')
            .sort((a, b) => parseInt(a[0]) - parseInt(b[0]));

        const years = sortedYears.map(([year]) => year);
        const minutes = sortedYears.map(([, time]) => time);
        const hours = minutes.map(min => Math.round(min / 60 * 10) / 10);

        // Fill in missing years with zero data for continuous chart
        const allYears = [];
        if (years.length > 0) {
            const minYear = Math.min(...years.map(y => parseInt(y)));
            const maxYear = Math.max(...years.map(y => parseInt(y)));
            for (let year = minYear; year <= maxYear; year++) {
                allYears.push(year.toString());
            }
        }

        // Create data arrays with zeros for missing years
        const filledHours = allYears.map(year => {
            const index = years.indexOf(year);
            return index !== -1 ? hours[index] : 0;
        });

        const trace = {
            x: allYears,
            y: filledHours,
            type: 'bar',
            marker: {
                color: '#63b3ed',
                line: {
                    width: 0
                }
            },
            hovertemplate: '<b>%{x}</b><br>%{customdata}<extra></extra>',
            customdata: filledHours.map(h => this.formatTimeCompact(h))
        };

        const layout = {
            title: {
                text: '',
                font: { color: '#e2e8f0' }
            },
            xaxis: {
                title: '',
                color: '#e2e8f0',
                showgrid: false,
                showline: false,
                tickvals: allYears.length > 0 ? [allYears[0], allYears[allYears.length - 1]] : [],
                ticktext: allYears.length > 0 ? [allYears[0], allYears[allYears.length - 1]] : [],
                tickfont: { color: '#a0aec0' }
            },
            yaxis: {
                title: '',
                color: '#e2e8f0',
                showgrid: false,
                showline: false,
                showticklabels: false,
                tickfont: { color: '#9ca3af' }
            },
            plot_bgcolor: 'rgba(0, 0, 0, 0)',
            paper_bgcolor: 'rgba(0, 0, 0, 0)',
            font: { color: '#e2e8f0' },
            margin: { l: 60, r: 30, t: 30, b: 60 },
            bargap: allYears.length <= 3 ? 0.75 : 0.9 // Increased gap for better spacing
        };

        const config = {
            displayModeBar: false,
            staticPlot: false,
            displaylogo: false,
            responsive: true
        };

        Plotly.newPlot('yearlyChart', [trace], layout, config);
    },

    // Fallback simple yearly chart using CSS - Truly flexible version
    createSimpleYearlyChart(yearlyData, container) {
        if (Object.keys(yearlyData).length === 0) {
            container.innerHTML = '<p style="text-align: center; color: #cbd5e0; padding: 2rem;">No yearly data available</p>';
            return;
        }

        const sortedYears = Object.entries(yearlyData)
            .filter(([year]) => year !== 'Unknown')
            .sort((a, b) => parseInt(a[0]) - parseInt(b[0]));

        // Fill in missing years with zero data for continuous chart
        const allYearsData = [];
        if (sortedYears.length > 0) {
            const minYear = Math.min(...sortedYears.map(([year]) => parseInt(year)));
            const maxYear = Math.max(...sortedYears.map(([year]) => parseInt(year)));
            
            for (let year = minYear; year <= maxYear; year++) {
                const existingYear = sortedYears.find(([y]) => parseInt(y) === year);
                if (existingYear) {
                    allYearsData.push([year.toString(), existingYear[1]]);
                } else {
                    allYearsData.push([year.toString(), 0]);
                }
            }
        }

        const maxHours = Math.max(...allYearsData.map(([, minutes]) => minutes / 60));
        
        // Get first and last years for labels
        const firstYear = allYearsData.length > 0 ? allYearsData[0][0] : '';
        const lastYear = allYearsData.length > 0 ? allYearsData[allYearsData.length - 1][0] : '';
        
        // Create truly flexible chart that uses 100% width with no width constraints
        let chartHTML = `<div style="padding: 1rem; position: relative; width: 100%;">
            <div style="position: relative; display: flex; align-items: end; height: 200px; padding: 20px 0; width: 100%; gap: 2px;">`;
        
        // Add tooltip element
        chartHTML += '<div id="yearly-tooltip" style="position: absolute; background: rgba(26, 32, 44, 0.95); color: #e2e8f0; padding: 8px 12px; border-radius: 6px; font-size: 0.9rem; pointer-events: none; opacity: 0; transition: opacity 0.2s; z-index: 1000; border: 1px solid #63b3ed;"></div>';
        
        allYearsData.forEach(([year, minutes], index) => {
            const hours = Math.round(minutes / 60 * 10) / 10;
            const days = Math.round(hours / 24 * 10) / 10;
            const heightPixels = Math.max(4, (hours / maxHours) * 160); // 160px max height within 200px container
            
            chartHTML += `
                <div style="flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: flex-end; height: 100%;">
                    <div style="background: #63b3ed; width: 100%; height: ${heightPixels}px; border-radius: 4px 4px 0 0; transition: all 0.3s ease; cursor: pointer;" 
                         data-year="${year}" data-days="${days}" data-hours="${hours}"
                         onmouseover="this.style.backgroundColor='#4299e1'; StatsApp.showTooltip(event, 'yearly-tooltip', '${year}: ${StatsApp.formatTimeCompact(hours)}')"
                         onmouseout="this.style.backgroundColor='#63b3ed'; StatsApp.hideTooltip('yearly-tooltip')"
                         onmousemove="StatsApp.moveTooltip(event, 'yearly-tooltip')"></div>
                </div>
            `;
        });
        
        chartHTML += '</div>';
        
        // Add year labels positioned at chart edges (not tied to individual bars)
        if (firstYear && lastYear && firstYear !== lastYear) {
            chartHTML += `
                <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 8px; padding: 0 20px;">
                    <div style="color: #a0aec0; font-size: 0.8rem;">${firstYear}</div>
                    <div style="color: #a0aec0; font-size: 0.8rem;">${lastYear}</div>
                </div>
            `;
        } else if (firstYear) {
            chartHTML += `
                <div style="display: flex; justify-content: center; align-items: center; margin-top: 8px; padding: 0 20px;">
                    <div style="color: #a0aec0; font-size: 0.8rem;">${firstYear}</div>
                </div>
            `;
        }
        
        chartHTML += '</div>';
        
        container.innerHTML = chartHTML;
    },

    // Create top 3 genres bar chart
    createTopGenresChart(genreData) {
        const chartDiv = document.getElementById('topGenresChart');
        
        if (typeof Plotly === 'undefined') {
            // Fallback to simple HTML chart
            this.createSimpleGenresChart(genreData, chartDiv);
            return;
        }
        
        if (Object.keys(genreData).length === 0) {
            chartDiv.innerHTML = '<p style="text-align: center; color: #cbd5e0; padding: 2rem;">No genre data available</p>';
            return;
        }

        // Get top 10 genres
        const sortedGenres = Object.entries(genreData)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10);

        const genres = sortedGenres.map(([genre]) => genre);
        const minutes = sortedGenres.map(([, time]) => time);
        const hours = minutes.map(min => Math.round(min / 60 * 10) / 10);

        const trace = {
            x: hours,
            y: genres,
            type: 'bar',
            orientation: 'h',
            marker: {
                color: '#63b3ed',
                line: {
                    width: 0
                }
            },
            hovertemplate: '<b>%{y}</b><br>%{customdata}<extra></extra>',
            customdata: hours.map(h => this.formatTimeCompact(h))
        };

        const layout = {
            title: {
                text: '',
                font: { color: '#e2e8f0' }
            },
            xaxis: {
                title: '',
                color: '#e2e8f0',
                showgrid: false,
                showline: false,
                showticklabels: false,
                tickfont: { color: '#a0aec0' }
            },
            yaxis: {
                title: '',
                color: '#e2e8f0',
                showgrid: false,
                showline: false,
                tickfont: { color: '#9ca3af' },
                side: 'left'
            },
            plot_bgcolor: 'rgba(0, 0, 0, 0)',
            paper_bgcolor: 'rgba(0, 0, 0, 0)',
            font: { color: '#e2e8f0' },
            margin: { l: 100, r: 30, t: 30, b: 40 }
        };

        const config = {
            displayModeBar: false,
            staticPlot: false,
            displaylogo: false,
            responsive: true
        };

        Plotly.newPlot('topGenresChart', [trace], layout, config);
    },

    // Create top 10 networks horizontal bar chart
    createTopNetworksChart(networkData) {
        const chartDiv = document.getElementById('topNetworksChart');
        
        if (typeof Plotly === 'undefined') {
            // Fallback to simple HTML chart
            this.createSimpleNetworksChart(networkData, chartDiv);
            return;
        }
        
        if (Object.keys(networkData).length === 0) {
            chartDiv.innerHTML = '<p style="text-align: center; color: #cbd5e0; padding: 2rem;">No network data available</p>';
            return;
        }

        // Get top 10 networks
        const sortedNetworks = Object.entries(networkData)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10);

        const networks = sortedNetworks.map(([network]) => network);
        const minutes = sortedNetworks.map(([, time]) => time);
        const hours = minutes.map(min => Math.round(min / 60 * 10) / 10);

        const trace = {
            x: hours,
            y: networks,
            type: 'bar',
            orientation: 'h',
            marker: {
                color: '#63b3ed',
                line: {
                    width: 0
                }
            },
            hovertemplate: '<b>%{y}</b><br>%{customdata}<extra></extra>',
            customdata: hours.map(h => this.formatTimeCompact(h))
        };

        const layout = {
            title: {
                text: '',
                font: { color: '#e2e8f0' }
            },
            xaxis: {
                title: '',
                color: '#e2e8f0',
                showgrid: false,
                showline: false,
                showticklabels: false,
                tickfont: { color: '#a0aec0' }
            },
            yaxis: {
                title: '',
                color: '#e2e8f0',
                showgrid: false,
                showline: false,
                tickfont: { color: '#9ca3af' },
                side: 'left'
            },
            plot_bgcolor: 'rgba(0, 0, 0, 0)',
            paper_bgcolor: 'rgba(0, 0, 0, 0)',
            font: { color: '#e2e8f0' },
            margin: { l: 100, r: 30, t: 30, b: 40 }
        };

        const config = {
            displayModeBar: false,
            staticPlot: false,
            displaylogo: false,
            responsive: true
        };

        Plotly.newPlot('topNetworksChart', [trace], layout, config);
    },

    // Fallback simple networks chart using CSS
    createSimpleNetworksChart(networkData, container) {
        if (Object.keys(networkData).length === 0) {
            container.innerHTML = '<p style="text-align: center; color: #cbd5e0; padding: 2rem;">No network data available</p>';
            return;
        }

        // Get top 10 networks
        const sortedNetworks = Object.entries(networkData)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10);

        if (sortedNetworks.length === 0) {
            container.innerHTML = '<p style="text-align: center; color: #cbd5e0; padding: 2rem;">No network data available</p>';
            return;
        }

        const maxTime = Math.max(...sortedNetworks.map(([, time]) => time));
        
        let chartHTML = '<div style="padding: 1rem; position: relative;">';
        
        // Add tooltip element
        chartHTML += '<div id="network-tooltip" style="position: absolute; background: rgba(26, 32, 44, 0.95); color: #e2e8f0; padding: 8px 12px; border-radius: 6px; font-size: 0.9rem; pointer-events: none; opacity: 0; transition: opacity 0.2s; z-index: 1000; border: 1px solid #63b3ed;"></div>';
        
        chartHTML += '<div style="display: flex; flex-direction: column; gap: 8px;">';
        
        sortedNetworks.forEach(([network, minutes]) => {
            const hours = Math.round(minutes / 60 * 10) / 10;
            const percentage = (minutes / maxTime) * 100;
            
            chartHTML += `
                <div style="display: flex; align-items: center; gap: 12px;">
                    <div style="min-width: 80px; text-align: left; color: #a0aec0; font-size: 0.9rem;">${network}</div>
                    <div style="flex: 1; background: transparent; border-radius: 4px; height: 24px; position: relative;">
                        <div style="background: #63b3ed; height: 100%; width: ${percentage}%; border-radius: 4px; transition: width 0.8s ease; cursor: pointer;"
                             onmouseover="this.style.backgroundColor='#4299e1'; StatsApp.showTooltip(event, 'network-tooltip', '${network}: ${StatsApp.formatTimeCompact(hours)}')"
                             onmouseout="this.style.backgroundColor='#63b3ed'; StatsApp.hideTooltip('network-tooltip')"
                             onmousemove="StatsApp.moveTooltip(event, 'network-tooltip')"></div>
                    </div>
                </div>
            `;
        });
        
        chartHTML += '</div></div>';
        
        container.innerHTML = chartHTML;
    },

    // Fallback simple genres chart using CSS - Horizontal bars to match network chart
    createSimpleGenresChart(genreData, container) {
        if (Object.keys(genreData).length === 0) {
            container.innerHTML = '<p style="text-align: center; color: #cbd5e0; padding: 2rem;">No genre data available</p>';
            return;
        }

        // Get top 10 genres to match the Plotly version
        const sortedGenres = Object.entries(genreData)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10);

        if (sortedGenres.length === 0) {
            container.innerHTML = '<p style="text-align: center; color: #cbd5e0; padding: 2rem;">No genre data available</p>';
            return;
        }

        const maxTime = Math.max(...sortedGenres.map(([, time]) => time));
        
        let chartHTML = '<div style="padding: 1rem; position: relative;">';
        
        // Add tooltip element
        chartHTML += '<div id="genre-tooltip" style="position: absolute; background: rgba(26, 32, 44, 0.95); color: #e2e8f0; padding: 8px 12px; border-radius: 6px; font-size: 0.9rem; pointer-events: none; opacity: 0; transition: opacity 0.2s; z-index: 1000; border: 1px solid #63b3ed;"></div>';
        
        chartHTML += '<div style="display: flex; flex-direction: column; gap: 8px;">';
        
        sortedGenres.forEach(([genre, minutes]) => {
            const hours = Math.round(minutes / 60 * 10) / 10;
            const percentage = (minutes / maxTime) * 100;
            
            chartHTML += `
                <div style="display: flex; align-items: center; gap: 12px;">
                    <div style="min-width: 80px; text-align: left; color: #a0aec0; font-size: 0.9rem;">${genre}</div>
                    <div style="flex: 1; background: transparent; border-radius: 4px; height: 24px; position: relative;">
                        <div style="background: #63b3ed; height: 100%; width: ${percentage}%; border-radius: 4px; transition: width 0.8s ease; cursor: pointer;"
                             onmouseover="this.style.backgroundColor='#4299e1'; StatsApp.showTooltip(event, 'genre-tooltip', '${genre}: ${StatsApp.formatTimeCompact(hours)}')"
                             onmouseout="this.style.backgroundColor='#63b3ed'; StatsApp.hideTooltip('genre-tooltip')"
                             onmousemove="StatsApp.moveTooltip(event, 'genre-tooltip')"></div>
                    </div>
                </div>
            `;
        });
        
        chartHTML += '</div></div>';
        
        container.innerHTML = chartHTML;
    },

    // Display fun time conversions
    displayFunConversions(conversions) {
        const container = document.getElementById('timeConversions');
        container.innerHTML = '';

        if (!conversions || conversions.length === 0) {
            container.innerHTML = '<p style="text-align: center; color: #cbd5e0; padding: 2rem;">No conversion data available</p>';
            return;
        }

        conversions.forEach(conversion => {
            const card = document.createElement('div');
            card.className = 'conversion-card';
            card.innerHTML = `
                <div class="conversion-icon">
                    <i class="${conversion.icon}"></i>
                </div>
                <div class="conversion-activity">${conversion.description}</div>
                <div class="conversion-value">${conversion.value} <span class="times-text">${conversion.times_text}</span></div>
            `;
            container.appendChild(card);
        });
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
        const hours = Math.floor(minutes / 60);
        const remainingMinutes = minutes % 60;
        
        if (hours < 24) {
            return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
        }
        
        const days = Math.floor(hours / 24);
        const remainingHours = hours % 24;
        
        return remainingHours > 0 ? `${days}d ${remainingHours}h` : `${days}d`;
    },

    // Show custom tooltip
    showTooltip(event, tooltipId, content) {
        const tooltip = document.getElementById(tooltipId);
        if (tooltip) {
            tooltip.innerHTML = content;
            tooltip.style.opacity = '1';
            this.moveTooltip(event, tooltipId);
        }
    },

    // Hide custom tooltip
    hideTooltip(tooltipId) {
        const tooltip = document.getElementById(tooltipId);
        if (tooltip) {
            tooltip.style.opacity = '0';
        }
    },

    // Move tooltip with mouse (closer to pointer)
    moveTooltip(event, tooltipId) {
        const tooltip = document.getElementById(tooltipId);
        if (tooltip) {
            const rect = event.target.closest('.chart-container').getBoundingClientRect();
            const x = event.clientX - rect.left;
            const y = event.clientY - rect.top;
            tooltip.style.left = (x + 5) + 'px';  // Closer to mouse
            tooltip.style.top = (y - 5) + 'px';   // Closer to mouse
        }
    },

    // Format time for hover tooltips (compact format: 28d 8h)
    formatTimeCompact(totalHours) {
        if (totalHours < 24) {
            return `${Math.round(totalHours)}h`;
        }
        
        const days = Math.floor(totalHours / 24);
        const remainingHours = Math.round(totalHours % 24);
        
        if (remainingHours === 0) {
            return `${days}d`;
        }
        
        return `${days}d ${remainingHours}h`;
    }
};

// Make sure the apps are available globally
window.App = App;
window.StatsApp = StatsApp;