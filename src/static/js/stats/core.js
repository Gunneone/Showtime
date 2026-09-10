// Showtime - Stats page core: loading, section toggling, top-level render

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
            
            if (watchedShows.length === 0) {
                loadingElement.classList.add('hidden');
                emptyElement.classList.remove('hidden');
                this.hideStatsSections();
                return;
            }

            // Check for cached statistics first
            const watchedShowsHash = DataStorage.generateWatchedShowsHash(watchedShows);
            const statsCache = DataStorage.getStatsCache();
            
            if (statsCache && statsCache.hash === watchedShowsHash) {
                // Use cached statistics for instant loading
                console.log('Using cached statistics');
                loadingElement.classList.add('hidden');
                this.displayStatsProgressive(statsCache.stats);
                return;
            }

            // Cache miss - calculate fresh statistics
            console.log('Calculating fresh statistics');
            this.displayBasicStatsFromShows(watchedShows);
            
            // Load remaining statistics asynchronously
            this.loadComplexStats(watchedShows, watchedShowsHash);

        } catch (error) {
            console.error('Error loading statistics:', error);
            loadingElement.classList.add('hidden');
            // Show error message or fallback to basic stats from localStorage
            this.displayBasicStatsFromShows(DataStorage.getWatchedShows());
        }
    },

    // Display basic statistics immediately from cached show data
    displayBasicStatsFromShows(watchedShows) {
        const loadingElement = document.getElementById('statsLoading');
        loadingElement.classList.add('hidden');
        
        if (watchedShows.length === 0) {
            document.getElementById('statsEmpty').classList.remove('hidden');
            this.hideStatsSections();
            return;
        }

        // Show stats sections since we have data
        this.showStatsSections();
        document.getElementById('statsEmpty').classList.add('hidden');

        // Calculate basic stats quickly (no API calls)
        const totalShows = watchedShows.length;
        const totalSeasons = watchedShows.reduce((sum, show) => sum + (show.seasons_watched || 0), 0);
        
        // Simple time calculation without expensive operations
        let totalMinutes = 0;
        let completedShows = 0;
        let inProgressShows = 0;
        let totalEpisodes = 0;
        
        for (const show of watchedShows) {
            const seasons = show.seasons_watched || 0;
            const episodeRuntime = show.episode_run_time || 45;
            const totalEpisodesInShow = show.total_episodes || 0;
            const totalSeasonsInShow = show.total_seasons || 1;
            
            // Calculate episodes watched for this show
            let episodesPerSeason;
            if (totalEpisodesInShow > 0 && totalSeasonsInShow > 0) {
                episodesPerSeason = totalEpisodesInShow / totalSeasonsInShow;
            } else {
                episodesPerSeason = 20; // Default assumption
            }
            
            const episodesWatched = seasons * episodesPerSeason;
            totalEpisodes += Math.round(episodesWatched);
            
            // Use pre-calculated runtime if available, otherwise estimate
            if (show.calculated_runtime_minutes) {
                totalMinutes += show.calculated_runtime_minutes;
            } else {
                totalMinutes += episodesWatched * episodeRuntime;
            }
            
            // Completion stats
            // Use released seasons count for completion calculation to match backend logic
            // Fall back to total_seasons for older shows that don't have released_seasons data
            const releasedSeasonsInShow = show.released_seasons || totalSeasonsInShow;
            
            if (seasons >= releasedSeasonsInShow) {
                completedShows++;
            } else {
                inProgressShows++;
            }
        }
        
        const completionRate = Math.round((completedShows / totalShows) * 100 * 10) / 10;
        
        // Display basic stats immediately
        document.getElementById('totalTime').textContent = this.formatTime(totalMinutes);
        document.getElementById('totalShows').textContent = totalShows;
        document.getElementById('totalSeasons').textContent = totalSeasons;
        document.getElementById('totalEpisodes').textContent = totalEpisodes;
        document.getElementById('completedShows').textContent = completedShows;
        document.getElementById('inProgressShows').textContent = inProgressShows;
        document.getElementById('completionRate').textContent = `${completionRate}%`;
        
        // Show loading states for complex sections
        this.showComplexSectionsLoading();
    },

    // Load complex statistics asynchronously
    async loadComplexStats(watchedShows, watchedShowsHash) {
        try {
            // Calculate complex stats via API
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
                throw new Error(data.error || 'Failed to load complex statistics');
            }

            // Cache the calculated statistics
            DataStorage.setStatsCache(data, watchedShowsHash);
            
            // Display complex sections progressively
            this.displayComplexStats(data);
            
        } catch (error) {
            console.error('Error loading complex statistics:', error);
            this.hideComplexSectionsLoading();
        }
    },

    // Show loading states for complex sections
    showComplexSectionsLoading() {
        // Add loading states to complex chart sections
        const sections = [
            'yearlyChart', 'topGenresChart', 'topNetworksChart', 
            'awardsSection', 'timeConversions', 'genreBreakdown', 'yearlyBreakdown'
        ];
        
        sections.forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.innerHTML = '<div class="loading-spinner"><i class="fas fa-spinner fa-spin" aria-hidden="true"></i> Loading...</div>';
            }
        });
    },

    // Hide loading states for complex sections
    hideComplexSectionsLoading() {
        const sections = [
            'yearlyChart', 'topGenresChart', 'topNetworksChart', 
            'awardsSection', 'timeConversions', 'genreBreakdown', 'yearlyBreakdown'
        ];
        
        sections.forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.innerHTML = '<p style="text-align: center; color: #cbd5e0;">Unable to load data</p>';
            }
        });
    },

    // Hide main statistics sections when no data
    hideStatsSections() {
        const sections = [
            document.querySelector('.stats-overview'),
            document.querySelector('.completion-stats'),
            document.querySelector('.charts-section')
        ];
        
        sections.forEach(section => {
            if (section) {
                section.classList.add('hidden');
            }
        });
    },

    // Show main statistics sections when data is available
    showStatsSections() {
        const sections = [
            document.querySelector('.stats-overview'),
            document.querySelector('.completion-stats'),
            document.querySelector('.charts-section')
        ];
        
        sections.forEach(section => {
            if (section) {
                section.classList.remove('hidden');
            }
        });
    },

    // Display statistics progressively (from cache)
    displayStatsProgressive(stats) {
        this.showStatsSections();
        document.getElementById('statsEmpty').classList.add('hidden');
        this.displayStats(stats);
    },

    // Display complex statistics sections
    displayComplexStats(stats) {
        // Charts and breakdowns
        this.createYearlyChart(stats.yearly_breakdown);
        this.createTopGenresChart(stats.genre_breakdown);
        this.createTopNetworksChart(stats.network_breakdown);
        this.displayAwards(stats.awards);
        this.displayFunConversions(stats.fun_conversions);
        
        // Legacy breakdowns for fallback
        this.displayGenreBreakdown(stats.genre_breakdown);
        this.displayYearlyBreakdown(stats.yearly_breakdown);
    },

    // Display statistics data
    displayStats(stats) {
        // Overview stats
        document.getElementById('totalTime').textContent = stats.total_time_formatted;
        document.getElementById('totalShows').textContent = stats.total_shows;
        document.getElementById('totalSeasons').textContent = stats.total_seasons;
        document.getElementById('totalEpisodes').textContent = stats.total_episodes;

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
        this.displayAwards(stats.awards);
        this.displayFunConversions(stats.fun_conversions);
    },
};

window.StatsApp = StatsApp;
