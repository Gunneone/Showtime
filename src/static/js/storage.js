// Showtime - localStorage service (watched shows, sort pref, stats cache)

const DataStorage = {
    WATCHED_SHOWS_KEY: 'showtime_shows',
    SORT_PREFERENCE_KEY: 'showtime_sort_preference',
    STATS_CACHE_KEY: 'showtime_stats_cache',
    STATS_VERSION: '2.0', // Version for cache invalidation (2.0: Tabler icon names)

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
            // Clear stats cache when shows are modified
            this.clearStatsCache();
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
            return localStorage.getItem(this.SORT_PREFERENCE_KEY) || 'watchtime-desc';
        } catch (error) {
            console.error('Error reading sort preference:', error);
            return 'watchtime-desc';
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



    // Check localStorage availability and capacity
    checkStorageAvailability() {
        try {
            const testKey = 'showtime_test';
            localStorage.setItem(testKey, 'test');
            localStorage.removeItem(testKey);
            return true;
        } catch (error) {
            console.error('localStorage is not available:', error);
            return false;
        }
    },

    // Get cached statistics
    getStatsCache() {
        try {
            const data = localStorage.getItem(this.STATS_CACHE_KEY);
            if (!data) return null;
            
            const cache = JSON.parse(data);
            
            // Check cache version and validity
            if (cache.version !== this.STATS_VERSION) {
                this.clearStatsCache();
                return null;
            }
            
            return cache;
        } catch (error) {
            console.error('Error reading stats cache:', error);
            return null;
        }
    },

    // Save statistics cache
    setStatsCache(stats, watchedShowsHash) {
        try {
            const cache = {
                version: this.STATS_VERSION,
                timestamp: Date.now(),
                hash: watchedShowsHash,
                stats: stats
            };
            localStorage.setItem(this.STATS_CACHE_KEY, JSON.stringify(cache));
            return true;
        } catch (error) {
            console.error('Error saving stats cache:', error);
            return false;
        }
    },

    // Clear statistics cache
    clearStatsCache() {
        try {
            localStorage.removeItem(this.STATS_CACHE_KEY);
            return true;
        } catch (error) {
            console.error('Error clearing stats cache:', error);
            return false;
        }
    },

    // Generate hash for watched shows to detect changes
    generateWatchedShowsHash(watchedShows) {
        if (!watchedShows || watchedShows.length === 0) return 'empty';
        
        // Create a simple hash based on show IDs and seasons watched. The
        // explicit season list is appended only when a show has one: without
        // it seasons {4, 7} and {1, 2} would hash the same (both count 2) and
        // a re-pick would serve stale cached stats, and with it unconditional
        // every existing library's hash would change on deploy.
        const hashData = watchedShows.map(show => {
            const picked = Array.isArray(show.watched_seasons) && show.watched_seasons.length
                ? `:${show.watched_seasons.join('.')}`
                : '';
            return `${show.id}-${show.seasons_watched}${picked}`;
        }).join(',');
        return this.simpleHash(hashData);
    },

    // Simple hash function for change detection
    simpleHash(str) {
        let hash = 0;
        if (str.length === 0) return hash;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
        return hash.toString();
    }
};
