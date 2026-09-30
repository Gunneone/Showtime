// Showtime - inline season editing and saving
// Extends the App object defined in app/core.js.

Object.assign(App, {
    // --- the shape of a season selection -------------------------------
    //
    // A record stores seasons_watched as a count, which means "seasons 1..N".
    // A selection with gaps in it - someone who watched only seasons 4 and 7
    // of a reality show - additionally carries watched_seasons, the explicit
    // list. These mirror resolve_watched_seasons() on the server; the count
    // stays authoritative, so the two must never disagree.

    // The season numbers a record covers, ascending
    resolveWatchedSeasons(show) {
        if (Array.isArray(show.watched_seasons) && show.watched_seasons.length) {
            return [...new Set(show.watched_seasons)].sort((a, b) => a - b);
        }
        const count = show.seasons_watched || 0;
        return Array.from({ length: count }, (_, index) => index + 1);
    },

    // Does this record skip a season? Such a show opens straight into pick
    // mode, so its owner is never shown a control that misrepresents it.
    hasSeasonGaps(show) {
        return Array.isArray(show.watched_seasons) && show.watched_seasons.length > 0;
    },

    // Parse / serialise the selection carried on a DOM element
    readSeasonList(element, attribute = 'data-watched-seasons') {
        const raw = element.getAttribute(attribute) || '';
        return raw.split(',')
            .map(part => parseInt(part, 10))
            .filter(season => !isNaN(season))
            .sort((a, b) => a - b);
    },

    writeSeasonList(element, seasons, attribute = 'data-watched-seasons') {
        element.setAttribute(attribute, seasons.join(','));
    },

    // Toggle one season in a list, returning a new sorted list
    toggleSeason(seasons, season) {
        return seasons.includes(season)
            ? seasons.filter(other => other !== season)
            : [...seasons, season].sort((a, b) => a - b);
    },

    // A selection of exactly 1..N is what the count already says, so it is
    // sent as a plain count and no list is stored.
    isSeasonPrefix(seasons) {
        return seasons.every((season, index) => season === index + 1);
    },

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
            this.writeSeasonList(editElement, this.resolveWatchedSeasons(show));
            // A show that already skips a season opens straight into pick
            // mode: the cumulative strip cannot represent it honestly.
            this.setEditPickMode(showId, this.hasSeasonGaps(show));
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
                                    // Keep whatever mode the user is in; only
                                    // the strip's length changed.
                                    const picking = editElement.getAttribute('data-pick-mode') === 'true';
                                    barsContainer.innerHTML = editSeasonBars;
                                    // Re-setup hover effects
                                    this.setupEditSeasonHoverEffects(showId);
                                    // Restore current selection
                                    this.setEditPickMode(showId, picking);
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
                const summary = this.seasonsSummary(updatedShow);
                seasonsDisplay.innerHTML = `
                    ${this.icon('eye')} ${summary}
                    ${this.seasonsStripHtml(updatedShow)}
                    ${this.icon('pencil', 'seasons-edit-icon')}
                `;
                const name = seasonsDisplay.closest('.watched-show')?.querySelector('h4')?.textContent || '';
                seasonsDisplay.setAttribute(
                    'aria-label',
                    `Edit seasons watched for ${name}. Currently ${this.seasonsSummary(updatedShow, true)}.`
                );
            }
        }
    },

    // "3 of 11 seasons watched", optionally naming which ones. The count is
    // the headline either way; a screen reader gets the seasons spelled out
    // because it cannot see the strip that carries them visually.
    seasonsSummary(show, detailed = false) {
        const releasedSeasons = show.released_seasons || show.total_seasons || 1;
        const summary = `${show.seasons_watched} of ${releasedSeasons} `
            + `season${releasedSeasons !== 1 ? 's' : ''} watched`;

        if (!detailed || !this.hasSeasonGaps(show)) return summary;

        const seasons = this.resolveWatchedSeasons(show);
        const listed = seasons.length > 1
            ? `${seasons.slice(0, -1).join(', ')} and ${seasons[seasons.length - 1]}`
            : seasons[0];
        return `${summary}: season${seasons.length !== 1 ? 's' : ''} ${listed}`;
    },

    // A read-only strip beside the summary, so a selection with gaps is
    // visible without opening the editor. Only rendered when there are gaps -
    // for the usual 1..N show the count already says everything.
    seasonsStripHtml(show) {
        if (!this.hasSeasonGaps(show)) return '';

        const releasedSeasons = show.released_seasons || show.total_seasons || 1;
        const seasons = this.resolveWatchedSeasons(show);
        const total = Math.max(releasedSeasons, seasons[seasons.length - 1] || 0);

        let segments = '';
        for (let season = 1; season <= total; season++) {
            const on = seasons.includes(season) ? ' watched' : '';
            segments += `<span class="season-strip-segment${on}"></span>`;
        }
        // aria-hidden: the seasons are already in the button's label.
        return `<span class="season-strip" aria-hidden="true">${segments}</span>`;
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

    // --- pick mode -----------------------------------------------------
    //
    // The strip's default meaning is cumulative: clicking bar N means
    // "seasons 1..N", which is how nearly everyone watches a show and is left
    // untouched. Pick mode turns the same strip into independent toggles for
    // the minority of shows watched out of order, and commits on Done rather
    // than on every click.

    isEditPicking(showId) {
        const container = document.getElementById(`seasonsEdit-${showId}`);
        return !!container && container.getAttribute('data-pick-mode') === 'true';
    },

    // Switch one card's editor between the two meanings of the strip
    setEditPickMode(showId, picking) {
        const container = document.getElementById(`seasonsEdit-${showId}`);
        if (!container) return;

        container.setAttribute('data-pick-mode', picking ? 'true' : 'false');
        const bars = container.querySelector('.edit-season-bars');
        if (bars) bars.classList.toggle('pick-mode', picking);

        const toggle = container.querySelector('.season-pick-toggle');
        if (toggle) {
            toggle.setAttribute('aria-pressed', picking ? 'true' : 'false');
        }
        const done = container.querySelector('.season-pick-done');
        if (done) done.hidden = !picking;

        this.paintEditSeasonBars(showId);
    },

    toggleEditPickMode(showId) {
        this.setEditPickMode(showId, !this.isEditPicking(showId));
        const container = document.getElementById(`seasonsEdit-${showId}`);
        const bar = container && container.querySelector('.edit-season-bar[tabindex="0"]');
        if (bar) bar.focus();
    },

    // Paint the bars from whichever selection the current mode owns
    paintEditSeasonBars(showId) {
        const container = document.getElementById(`seasonsEdit-${showId}`);
        if (!container) return;

        const bars = container.querySelectorAll('.edit-season-bar');
        const picking = container.getAttribute('data-pick-mode') === 'true';
        const seasons = picking
            ? this.readSeasonList(container)
            : [];
        const count = parseInt(container.getAttribute('data-selected-seasons'), 10) || 0;

        // In pick mode the tab stop sits on the first picked season so the
        // arrow keys start somewhere meaningful; otherwise on the count.
        const roving = picking
            ? (seasons[0] || 1)
            : Math.min(Math.max(count || 1, 1), bars.length);

        bars.forEach((bar, index) => {
            const seasonNumber = index + 1;
            const on = picking ? seasons.includes(seasonNumber) : seasonNumber <= count;
            bar.classList.toggle('highlighted', on);
            bar.setAttribute('aria-pressed', on ? 'true' : 'false');
            bar.setAttribute('tabindex', seasonNumber === roving ? '0' : '-1');
            bar.setAttribute('aria-label', this.editSeasonBarLabel(bar, seasonNumber, picking, on));
        });

        const done = container.querySelector('.season-pick-done');
        if (done) {
            const total = picking ? seasons.length : count;
            done.textContent = total
                ? `Done (${total} season${total !== 1 ? 's' : ''})`
                : 'Done (no seasons)';
        }
    },

    // A bar means something different in each mode, so say which
    editSeasonBarLabel(bar, seasonNumber, picking, on) {
        const name = bar.dataset.showName || 'this show';
        if (!picking) {
            return `Set ${name} to ${seasonNumber} season${seasonNumber !== 1 ? 's' : ''} watched`;
        }
        return `${on ? 'Unmark' : 'Mark'} season ${seasonNumber} of ${name} as watched`;
    },

    // Update season bars visual state without triggering save
    updateEditSeasonBars(showId, selectedSeasons) {
        const container = document.getElementById(`seasonsEdit-${showId}`);
        if (!container) return;
        container.setAttribute('data-selected-seasons', selectedSeasons);
        this.paintEditSeasonBars(showId);
    },

    // A bar was activated: what that means depends on the mode
    activateEditSeasonBar(showId, season) {
        if (this.isEditPicking(showId)) {
            this.toggleEditSeason(showId, season);
        } else {
            this.selectEditSeasons(showId, season);
        }
    },

    // Pick mode: flip one season, and wait for Done before saving
    toggleEditSeason(showId, season) {
        const container = document.getElementById(`seasonsEdit-${showId}`);
        if (!container) return;

        const seasons = this.toggleSeason(this.readSeasonList(container), season);
        this.writeSeasonList(container, seasons);
        container.setAttribute('data-selected-seasons', seasons.length);
        this.paintEditSeasonBars(showId);
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

        const picking = () => container.getAttribute('data-pick-mode') === 'true';
        const restore = () => {
            bars.forEach(b => b.classList.remove('hover-highlighted'));
            this.paintEditSeasonBars(showId);
        };

        bars.forEach((bar, index) => {
            bar.addEventListener('mouseenter', () => {
                // The preview has to mean what the click will do: a whole
                // prefix in the default mode, one season in pick mode. In
                // pick mode the other seasons stay lit - blanking them would
                // hide the very selection the user is editing.
                if (picking()) {
                    bars.forEach(b => b.classList.remove('hover-highlighted'));
                    bar.classList.add('hover-highlighted');
                    return;
                }

                // Reset all bars to base state
                bars.forEach(b => {
                    b.classList.remove('highlighted', 'hover-highlighted');
                });
                for (let i = 0; i <= index; i++) {
                    bars[i].classList.add('hover-highlighted');
                }
            });

            bar.addEventListener('mouseleave', restore);
        });

        // Also handle container mouse leave to ensure proper state restoration
        container.addEventListener('mouseleave', restore);
    },

    async saveSeasons(showId) {
        const editElement = document.getElementById(`seasonsEdit-${showId}`);
        const selectedSeasons = parseInt(editElement.getAttribute('data-selected-seasons')) || 0;

        // In pick mode the list is what the user chose; a selection that came
        // out contiguous is sent as a plain count, so nothing distinguishes it
        // from a show recorded the ordinary way. null clears any stored list.
        const picked = this.isEditPicking(showId) ? this.readSeasonList(editElement) : [];
        const watchedSeasons = (picked.length && !this.isSeasonPrefix(picked)) ? picked : null;

        // Find the show to get total seasons
        const show = this.state.watchedShows.find(s => s.id === showId);
        const maxSeasons = show ? (show.total_seasons || 1) : 1;
        
        if (selectedSeasons < 0) {
            this.showToast('Seasons can\'t be negative', 'error');
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
                    watched_seasons: watchedSeasons,
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

            this.showCelebrationToast(`Updated "${show ? show.name : 'show'}"`);
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
            this.showToast('Couldn\'t update the show. Check your connection and try again.', 'error');
            this.cancelEditSeasons(showId);
        } finally {
            this.hideLoading();
        }
    },
});
