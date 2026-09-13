// Showtime - sorting and rendering the watched-shows list
// Extends the App object defined in app/core.js.

Object.assign(App, {
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
            case 'releasedate-asc':
                shows.sort((a, b) => {
                    // Always compare against season 1's release date
                    const dateA = this.getShowReleaseDate(a);
                    const dateB = this.getShowReleaseDate(b);
                    if (!dateA && !dateB) return 0;
                    if (!dateA) return 1;  // undated shows sink to the bottom
                    if (!dateB) return -1;
                    return dateA.localeCompare(dateB); // ISO dates sort lexically
                });
                break;
            case 'added-desc': {
                // localStorage keeps shows in insertion order; use it as the
                // fallback for shows added before date_added was recorded.
                const insertionOrder = DataStorage.getWatchedShows().map(s => s.id);
                shows.sort((a, b) => {
                    const tA = a.date_added ? Date.parse(a.date_added) : NaN;
                    const tB = b.date_added ? Date.parse(b.date_added) : NaN;
                    const hasA = !Number.isNaN(tA);
                    const hasB = !Number.isNaN(tB);
                    if (hasA && hasB) return tB - tA;      // most recent first
                    if (hasA) return -1;                   // timestamped => newer
                    if (hasB) return 1;
                    return insertionOrder.indexOf(b.id) - insertionOrder.indexOf(a.id);
                });
                break;
            }
            default:
                break;
        }

        // Update the state with sorted shows
        this.state.watchedShows = shows;
    },

    // Resolve a show's release date, always anchored to season 1
    getShowReleaseDate(show) {
        if (show.first_air_date) return show.first_air_date;
        if (Array.isArray(show.season_details) && show.season_details.length) {
            const season1 = show.season_details.find(s => s.season_number === 1)
                || show.season_details[0];
            if (season1 && season1.air_date) return season1.air_date;
        }
        return '';
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

    // Update button visibility based on whether data is present
    updateButtonVisibility(hasData) {
        // Buttons that should be hidden when no data is present
        const dataDependendButtons = [
            this.elements.shareBtn,
            this.elements.exportBtn,
            this.elements.refreshSeasonsBtn,
            this.elements.removeAllBtn
        ];

        dataDependendButtons.forEach(button => {
            if (button) {
                if (hasData) {
                    button.classList.remove('hidden');
                } else {
                    button.classList.add('hidden');
                }
            }
        });

        // Import button should always be visible (it doesn't depend on existing data)
        if (this.elements.importBtn) {
            this.elements.importBtn.classList.remove('hidden');
        }
    },

    // Display watched shows
    displayWatchedShows() {
        this.elements.watchedShows.innerHTML = '';

        if (this.state.watchedShows.length === 0) {
            this.elements.emptyState.classList.remove('hidden');
            if (this.elements.sortControls) {
                this.elements.sortControls.style.display = 'none';
            }
            // Hide buttons that depend on data when no data is present
            this.updateButtonVisibility(false);
            return;
        }

        this.elements.emptyState.classList.add('hidden');
        
        // Show sort controls when there are shows
        if (this.elements.sortControls) {
            this.elements.sortControls.style.display = 'flex';
        }

        // Show buttons that depend on data when data is present
        this.updateButtonVisibility(true);

        this.state.watchedShows.forEach(show => {
            const showElement = this.createWatchedShowElement(show);
            this.elements.watchedShows.appendChild(showElement);
        });
    },

    // Create watched show element
    createWatchedShowElement(show) {
        const div = document.createElement('div');
        // Some shows carry an easter egg that gives their card its own look.
        const eggClass = (typeof EasterEggs !== 'undefined') ? EasterEggs.cardClass(show.id) : '';
        div.className = eggClass ? `watched-show ${eggClass}` : 'watched-show';
        div.setAttribute('data-show-id', show.id); // Add data attribute for easy identification

        const posterUrl = show.poster_path || '/static/images/no-poster.png';
        const watchTime = this.calculateShowTime(show);
        const releasedSeasons = show.released_seasons || show.total_seasons || 1;

        // Create edit season selector bars
        const editSeasonBars = this.createEditSeasonSelectorBars(releasedSeasons, show, show.seasons_watched);

        const safeName = this.escapeHtml(show.name);
        const seasonsSummary = this.seasonsSummary(show);
        const seasonsStrip = this.seasonsStripHtml(show);
        const selection = this.resolveWatchedSeasons(show);
        // A show with gaps can only be shown honestly in pick mode, so its
        // editor is built that way rather than flipped after it opens.
        const picking = this.hasSeasonGaps(show);

        div.innerHTML = `
            <button type="button" class="watched-show-remove" onclick="App.removeShow(${show.id})" aria-label="Remove ${safeName} from your watched list">
                <i class="fas fa-times" aria-hidden="true"></i>
            </button>
            <div class="watched-show-poster">
                <img src="${this.escapeHtml(posterUrl)}" alt="${safeName}"
                     onerror="this.src='/static/images/no-poster.png'; this.onerror=null;"
                     loading="lazy">
            </div>
            <div class="watched-show-content">
                <div class="watched-show-info">
                    <h4>${safeName}</h4>
                    <div class="watched-show-seasons">
                        <button type="button" class="seasons-display" onclick="App.editSeasons(${show.id})" aria-label="Edit seasons watched for ${safeName}. Currently ${this.seasonsSummary(show, true)}.">
                            <i class="fas fa-eye" aria-hidden="true"></i> ${seasonsSummary}
                            ${seasonsStrip}
                            <i class="fas fa-edit" style="font-size: 0.8em; opacity: 0.7;" aria-hidden="true"></i>
                        </button>
                        <div class="seasons-edit" id="seasonsEdit-${show.id}" data-selected-seasons="${show.seasons_watched}" data-watched-seasons="${selection.join(',')}" data-pick-mode="${picking}">
                            <div class="season-row">
                            <div class="season-selector-bars edit-season-bars${picking ? ' pick-mode' : ''}" role="group" aria-label="Seasons watched for ${safeName}">
                                ${editSeasonBars}
                            </div>
                            <div class="season-pick-controls">
                                <button type="button" class="season-pick-toggle" aria-pressed="${picking}"
                                        onclick="App.toggleEditPickMode(${show.id})"
                                        title="Pick individual seasons"
                                        aria-label="Pick individual seasons of ${safeName}">
                                    <i class="fas fa-list-check" aria-hidden="true"></i>
                                </button>
                                <button type="button" class="season-pick-done" ${picking ? '' : 'hidden'}
                                        onclick="App.saveSeasons(${show.id})">Done</button>
                            </div>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="watched-show-time"><i class="fas fa-clock" aria-hidden="true"></i> ${watchTime}</div>
            </div>
        `;

        // Some easter eggs reach into the finished card (e.g. to restyle the
        // title). Runs once; a no-op for shows without a decorator.
        if (typeof EasterEggs !== 'undefined' && EasterEggs.decorateCard) {
            EasterEggs.decorateCard(show.id, div);
        }

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
});
