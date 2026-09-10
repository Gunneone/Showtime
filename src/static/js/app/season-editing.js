// Showtime - inline season editing and saving
// Extends the App object defined in app/core.js.

Object.assign(App, {
    // Inline season editing methods
    async editSeasons(showId) {
        const displayElement = document.querySelector(`#seasonsEdit-${showId}`).previousElementSibling;
        const editElement = document.getElementById(`seasonsEdit-${showId}`);
        
        // Immediately show edit interface with current data (seamless experience)
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

        // Move keyboard focus onto the bar for the current count; the arrow
        // keys take it from there.
        const activeBar = editElement.querySelector('.edit-season-bar[tabindex="0"]')
            || editElement.querySelector('.edit-season-bar');
        if (activeBar) activeBar.focus();
        
        // In the background, check for new seasons without any user-visible loading
        this.backgroundRefreshShowSeasons(showId);
    },

    // Background refresh for individual show seasons (seamless, no messages)
    async backgroundRefreshShowSeasons(showId) {
        try {
            // Refresh season count for this specific show in the background
            const response = await fetch(`/api/refresh-show-seasons/${showId}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    watched_shows: this.state.watchedShows
                })
            });

            if (response.ok) {
                const data = await response.json();
                if (data.success) {
                    // Check if there are more seasons available now
                    const originalShow = this.state.watchedShows.find(s => s.id === showId);
                    const updatedShow = data.updated_watched_shows.find(s => s.id === showId);
                    
                    if (originalShow && updatedShow) {
                        const originalReleased = originalShow.released_seasons || originalShow.total_seasons || 1;
                        const updatedReleased = updatedShow.released_seasons || updatedShow.total_seasons || 1;
                        
                        // Only update if more seasons are now available
                        if (updatedReleased > originalReleased) {
                            // Update the stored data and application state
                            DataStorage.setWatchedShows(data.updated_watched_shows);
                            this.state.watchedShows = data.updated_watched_shows;
                            
                            // Update the edit interface seamlessly if it's still open
                            const editElement = document.getElementById(`seasonsEdit-${showId}`);
                            if (editElement && editElement.style.display === 'flex') {
                                // Regenerate the season bars with new count
                                const editSeasonBars = this.createEditSeasonSelectorBars(
                                    updatedReleased, 
                                    updatedShow, 
                                    updatedShow.seasons_watched
                                );
                                const barsContainer = editElement.querySelector('.season-selector-bars');
                                if (barsContainer) {
                                    barsContainer.innerHTML = editSeasonBars;
                                    // Re-setup hover effects
                                    this.setupEditSeasonHoverEffects(showId);
                                    // Restore current selection
                                    this.updateEditSeasonBars(showId, updatedShow.seasons_watched);
                                }
                            }
                            
                            // Update the display view as well (seamlessly)
                            this.updateShowDisplayInList(showId, updatedShow);
                            
                            // Update statistics if completion status changed
                            this.updateStatisticsIfNeeded();
                        }
                    }
                }
            }
        } catch (error) {
            // Silently fail - no user messages for background operations
            console.error('Background season refresh failed for show', showId, ':', error);
        }
    },

    // Update a single show's display in the watched shows list
    updateShowDisplayInList(showId, updatedShow) {
        const showElement = document.querySelector(`[data-show-id="${showId}"]`);
        if (showElement) {
            const seasonsDisplay = showElement.querySelector('.seasons-display');
            if (seasonsDisplay) {
                const releasedSeasons = updatedShow.released_seasons || updatedShow.total_seasons || 1;
                const summary = `${updatedShow.seasons_watched} of ${releasedSeasons} season${releasedSeasons !== 1 ? 's' : ''} watched`;
                seasonsDisplay.innerHTML = `
                    <i class="fas fa-eye" aria-hidden="true"></i> ${summary}
                    <i class="fas fa-edit" style="font-size: 0.8em; opacity: 0.7;" aria-hidden="true"></i>
                `;
                const name = seasonsDisplay.closest('.watched-show')?.querySelector('h4')?.textContent || '';
                seasonsDisplay.setAttribute('aria-label', `Edit seasons watched for ${name}. Currently ${summary}.`);
            }
        }
    },

    // Update statistics if completion status might have changed
    updateStatisticsIfNeeded() {
        // Trigger a recalculation of the total watch time display which includes completion stats
        this.loadWatchedShows();
    },

    cancelEditSeasons(showId) {
        const show = this.state.watchedShows.find(s => s.id === showId);
        const displayElement = document.querySelector(`#seasonsEdit-${showId}`).previousElementSibling;
        const editElement = document.getElementById(`seasonsEdit-${showId}`);
        
        displayElement.style.display = 'block';
        editElement.style.display = 'none';
        if (typeof displayElement.focus === 'function') displayElement.focus();
    },

    // Update season bars visual state without triggering save
    updateEditSeasonBars(showId, selectedSeasons) {
        // Update all season bars to show selection state
        const container = document.getElementById(`seasonsEdit-${showId}`);
        const bars = container.querySelectorAll('.edit-season-bar');
        
        const roving = Math.min(Math.max(selectedSeasons || 1, 1), bars.length);
        bars.forEach((bar, index) => {
            const seasonNumber = index + 1;
            const on = seasonNumber <= selectedSeasons;
            bar.classList.toggle('highlighted', on);
            bar.setAttribute('aria-pressed', on ? 'true' : 'false');
            bar.setAttribute('tabindex', seasonNumber === roving ? '0' : '-1');
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
            this.markCelebrationShow(showId);
            this.loadWatchedShows(true);

            // loadWatchedShows rebuilds the cards, so send focus back to the
            // seasons control the keyboard user was just on.
            setTimeout(() => {
                const restored = document.querySelector(
                    `#watchedShows [data-show-id="${showId}"] .seasons-display`
                );
                if (restored) restored.focus();
            }, 0);

            // Bring the running-total card into view, the same as the add-show
            // paths do. Without this a season edit made further down the page
            // fires the celebration against a card that is still scrolled off
            // the top of the viewport, so anything bound to its box (the
            // X-Files saucer and caption, the Lost counter, ...) lands in the
            // wrong place or off-screen entirely.
            this.scrollToTopCard();
        } catch (error) {
            console.error('Error updating show:', error);
            this.showToast('Failed to update show. Please try again.', 'error');
            this.cancelEditSeasons(showId);
        } finally {
            this.hideLoading();
        }
    },
});
