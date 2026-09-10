// Showtime - search box, keyboard nav, and query execution
// Extends the App object defined in app/core.js.

Object.assign(App, {
    // Setup comprehensive search functionality
    setupSearchFunctionality() {
        let searchTimeout;

        // Instant search with debouncing (wait 300ms, restart timer if query changes)
        this.elements.searchInput.addEventListener('input', () => {
            clearTimeout(searchTimeout);
            const query = this.elements.searchInput.value.trim();

            // Anything too short to search for should not leave older results
            // on screen contradicting the input; fall back to suggestions
            if (query.length < this.MIN_QUERY_LENGTH) {
                this.hideSearchResults();
                this.showRecommendations();
                return;
            }

            searchTimeout = setTimeout(() => {
                this.performSearch(query, true);
            }, 300);
        });

        // An empty search box is an invitation to suggest something
        this.elements.searchInput.addEventListener('focus', () => {
            if (this.elements.searchInput.value.trim().length < this.MIN_QUERY_LENGTH) {
                this.showRecommendations();
            }
        });

        // Keyboard handling for the combobox: Enter runs a manual search,
        // the arrow keys walk the results dropdown (see handleComboboxKeydown).
        this.elements.searchInput.addEventListener('keydown', (e) => {
            if (this.handleComboboxKeydown(e)) return;

            if (e.key === 'Enter') {
                e.preventDefault();
                const query = this.elements.searchInput.value.trim();
                if (query.length >= this.MIN_QUERY_LENGTH) {
                    clearTimeout(searchTimeout);
                    this.performSearch(query, false);
                }
            }
        });

        // Season bars are rendered from untrusted TMDB titles, so they carry
        // data attributes instead of inline handlers; resolve clicks here.
        this.elements.searchResults.addEventListener('click', (e) => {
            const bar = e.target.closest('.season-bar');
            if (!bar || !this.elements.searchResults.contains(bar)) return;

            e.stopPropagation();
            this.activateSeasonBar(bar);
        });

        // Keyboard activation for options / season bars once focus has moved
        // into the dropdown.
        this.elements.searchResults.addEventListener('keydown', (e) => {
            this.handleResultsKeydown(e);
        });
    },

    // --- Search dropdown keyboard navigation (WAI-ARIA listbox pattern) ---
    //
    // The text field is a combobox that owns #searchResults (role="listbox").
    // Each ".search-result" and the "load more" row are options with a roving
    // tabindex. Up/Down move between options; on a result option Left/Right
    // change how many seasons Enter will add.

    // Options in visual order
    resultNavItems() {
        return Array.from(this.elements.searchResults.querySelectorAll('[role="option"]'));
    },

    // Move keyboard focus to an option and mark it the active descendant
    focusResultItem(item) {
        if (!item) return;
        this.resultNavItems().forEach(el => {
            el.setAttribute('tabindex', el === item ? '0' : '-1');
            el.classList.toggle('active', el === item);
            el.setAttribute('aria-selected', el === item ? 'true' : 'false');
        });
        this.elements.searchInput.setAttribute('aria-activedescendant', item.id || '');
        // Show the current season selection on the (decorative) bars so it is
        // obvious the count starts at "all" and the arrows move from there.
        if (item.classList.contains('search-result')) {
            this.paintResultSeasonBars(item);
        }
        item.focus();
        item.scrollIntoView({ block: 'nearest' });
    },

    // Reset roving tabindex after the dropdown is (re)rendered
    resetResultRoving() {
        const items = this.resultNavItems();
        items.forEach((el, i) => {
            el.setAttribute('tabindex', i === 0 ? '0' : '-1');
            el.classList.remove('active');
            el.setAttribute('aria-selected', 'false');
        });
        this.elements.searchInput.removeAttribute('aria-activedescendant');
    },

    // Arrow keys while focus is still in the text field. Returns true when
    // the key was consumed.
    handleComboboxKeydown(e) {
        const open = !this.elements.searchResults.classList.contains('hidden');

        if (e.key === 'ArrowDown' && open) {
            e.preventDefault();
            const items = this.resultNavItems();
            if (items.length) this.focusResultItem(items[0]);
            return true;
        }

        if (e.key === 'Escape' && open) {
            e.preventDefault();
            this.hideSearchResults();
            return true;
        }

        return false;
    },

    // Keys once focus has moved onto an option inside the dropdown
    handleResultsKeydown(e) {
        const items = this.resultNavItems();
        if (!items.length) return;

        const current = e.target.closest('[role="option"]');
        if (!current) return;
        const index = items.indexOf(current);
        const isResult = current.classList.contains('search-result');

        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                this.focusResultItem(items[Math.min(index + 1, items.length - 1)]);
                break;
            case 'ArrowUp':
                e.preventDefault();
                if (index <= 0) {
                    this.resetResultRoving();
                    this.elements.searchInput.focus();
                } else {
                    this.focusResultItem(items[index - 1]);
                }
                break;
            case 'ArrowRight':
                if (!isResult) break;
                e.preventDefault();
                this.adjustResultSeasons(current, 1);
                break;
            case 'ArrowLeft':
                if (!isResult) break;
                e.preventDefault();
                this.adjustResultSeasons(current, -1);
                break;
            case 'Home':
                e.preventDefault();
                this.focusResultItem(items[0]);
                break;
            case 'End':
                e.preventDefault();
                this.focusResultItem(items[items.length - 1]);
                break;
            case 'Enter':
            case ' ':
                e.preventDefault();
                if (isResult) {
                    this.addFocusedResult(current);
                } else {
                    current.click();
                }
                break;
            case 'Escape':
                e.preventDefault();
                this.hideSearchResults();
                this.elements.searchInput.focus();
                break;
            default:
                break;
        }
    },

    // Cycle a result option's season selection (wraps at both ends so every
    // key press gives feedback) and re-announce it
    adjustResultSeasons(option, delta) {
        const total = parseInt(option.dataset.totalSeasons, 10) || 1;
        const current = parseInt(option.dataset.selectedSeasons, 10) || total;
        let next = current + delta;
        if (next > total) next = 1;
        if (next < 1) next = total;
        if (next === current) return;
        option.dataset.selectedSeasons = next;
        this.updateResultOptionLabel(option);
        this.paintResultSeasonBars(option);
        this.elements.searchInput.setAttribute('aria-activedescendant', option.id || '');
    },

    // Add the show a focused result option represents, honouring its season pick
    addFocusedResult(option) {
        const showId = parseInt(option.id.replace('search-result-', ''), 10);
        const seasons = parseInt(option.dataset.selectedSeasons, 10)
            || parseInt(option.dataset.totalSeasons, 10) || 1;
        const show = this.findResultShow(showId);
        if (show) {
            this.addShowWithSeasons(showId, seasons, show.name);
        }
    },

    // Add a show for the season count a given season bar represents (mouse)
    activateSeasonBar(bar) {
        const showId = parseInt(bar.dataset.showId, 10);
        const seasons = parseInt(bar.dataset.season, 10);
        const show = this.findResultShow(showId);
        if (show) {
            this.addShowWithSeasons(showId, seasons, show.name);
        }
    },

    // Perform search for TV shows
    async performSearch(query, isInstantSearch = false) {
        if (!query || query.length < this.MIN_QUERY_LENGTH) {
            this.hideSearchResults();
            return;
        }

        // Cancel any pending search request
        if (this.state.pendingSearchController) {
            this.state.pendingSearchController.abort();
        }

        // Generate a unique request ID to track this search
        const requestId = ++this.state.searchRequestId;

        // Create a new AbortController for this request
        const controller = new AbortController();
        this.state.pendingSearchController = controller;

        // Declared out here so the catch block can read the server's message
        let data = null;

        try {
            // Show loading state
            this.showSearchLoading();

            const response = await fetch(`/api/search?query=${encodeURIComponent(query)}`, {
                signal: controller.signal
            });
            data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Search failed');
            }

            // Only process this response if it's the most recent request
            if (requestId === this.state.searchRequestId) {
                this.state.currentSearch = data;
                this.state.currentQuery = query;
                this.state.currentPage = data.page || 1;
                this.state.displayedSearchResults = 0;

                this.displaySearchResults(data.results, isInstantSearch, true);
                this.state.pendingSearchController = null;
            }

        } catch (error) {
            // Only show error if the request wasn't aborted and it's the most recent request
            if (error.name !== 'AbortError' && requestId === this.state.searchRequestId) {
                console.error('Search error:', error);

                const serverError = data && data.error;
                let errorMessage = 'Search failed. Please try again.';
                if (serverError) {
                    errorMessage = serverError.includes('API key')
                        ? 'TMDB API key is not configured properly. Please contact the administrator.'
                        : `Search failed: ${serverError}`;
                }

                this.showToast(errorMessage, 'error');
                this.showSearchError(errorMessage);
                this.state.pendingSearchController = null;
            }
        }
    },

    // Reflect the dropdown's open/closed state on the combobox for assistive tech
    setResultsExpanded(expanded) {
        this.elements.searchInput.setAttribute('aria-expanded', expanded ? 'true' : 'false');
    },

    // A listbox must contain options, so only carry the role while results
    // (not a loading/error/empty message) are on screen.
    setListboxActive(active) {
        if (active) {
            this.elements.searchResults.setAttribute('role', 'listbox');
        } else {
            this.elements.searchResults.setAttribute('role', 'presentation');
        }
    },

    // Show loading state in search results
    showSearchLoading(message = 'Searching...') {
        this.elements.searchResults.innerHTML = `<div class="search-loading"><i class="fas fa-spinner fa-spin" aria-hidden="true"></i> ${this.escapeHtml(message)}</div>`;
        this.elements.searchResults.classList.remove('hidden');
        this.setResultsExpanded(true);
        this.setListboxActive(false);
    },

    // Replace the dropdown contents with an error, so a failure never looks
    // like a search that is still running
    showSearchError(message) {
        this.elements.searchResults.innerHTML = `
            <div class="search-no-results">
                <i class="fas fa-triangle-exclamation" aria-hidden="true"></i>
                <p>${this.escapeHtml(message)}</p>
            </div>
        `;
        this.elements.searchResults.classList.remove('hidden');
        this.setResultsExpanded(true);
        this.setListboxActive(false);
        this.state.displayedSearchResults = 0;
        this.state.displayedShowIds = new Set();
    },

    // Hide search results
    hideSearchResults() {
        this.elements.searchResults.classList.add('hidden');
        this.elements.searchResults.innerHTML = '';
        this.setResultsExpanded(false);
        this.setListboxActive(false);
        this.elements.searchInput.removeAttribute('aria-activedescendant');
        this.state.displayedSearchResults = 0;
        this.state.displayedShowIds = new Set();
    },

    // Look up a show the dropdown is offering, whether it came from a search
    // or from the recommendations
    findResultShow(showId) {
        return this.state.currentSearch?.results?.find(s => s.id === showId)
            || this.state.recommendations.results.find(s => s.id === showId);
    },

    // Fetch a fresh set of suggestions. The server draws a random sample from
    // its candidate pool each time, so this is called on every focus rather
    // than cached client-side; with the server caches warm it costs no TMDB
    // calls, only a re-sample.
    async loadRecommendations() {
        const watchedShows = DataStorage.getWatchedShows();

        if (this.state.recommendations.loading) {
            return;
        }

        this.state.recommendations.loading = true;

        try {
            const response = await fetch('/api/recommendations', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ watched_shows: watchedShows })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to load recommendations');
            }

            this.state.recommendations.results = data.results || [];
            this.state.recommendations.mode = data.mode;
            this.state.recommendations.shown = 0;
        } catch (error) {
            console.error('Error loading recommendations:', error);
            this.state.recommendations.results = [];
            this.state.recommendations.mode = null;
        } finally {
            this.state.recommendations.loading = false;
        }
    },

    // Load (if needed) and show suggestions in the dropdown
    async showRecommendations() {
        if (!this.elements.searchInput) return;

        const wasEmpty = this.state.recommendations.results.length === 0;
        if (wasEmpty && !this.state.recommendations.loading) {
            this.showSearchLoading('Finding shows for you...');
        }

        await this.loadRecommendations();

        // The user may have started typing while the request was in flight
        if (this.elements.searchInput.value.trim().length >= this.MIN_QUERY_LENGTH) {
            return;
        }

        this.displayRecommendations();
    },

    // Render the suggestions into the search dropdown
    displayRecommendations() {
        const { results, mode } = this.state.recommendations;

        if (!results.length) {
            this.hideSearchResults();
            return;
        }

        this.elements.searchResults.innerHTML = '';
        this.elements.searchResults.classList.remove('hidden');
        this.setResultsExpanded(true);
        this.setListboxActive(true);
        this.state.displayedShowIds = new Set();

        const header = document.createElement('div');
        header.className = 'search-results-header';
        header.setAttribute('role', 'presentation');
        header.textContent = mode === 'personalized'
            ? "The algorithm thinks, you might've watched these..."
            : 'The most popular shows of all time';
        this.elements.searchResults.appendChild(header);

        // On mobile the dropdown pushes the page down instead of floating over
        // it, so only a few suggestions are rendered until asked for more
        const initialCount = this.isMobile() ? this.state.maxSearchResults : results.length;
        this.state.recommendations.shown = 0;
        this.appendRecommendations(initialCount);
        this.resetResultRoving();
    },

    // Append the next batch of suggestions, adding a "show more" control if any
    // are still held back
    appendRecommendations(count) {
        const { results } = this.state.recommendations;
        const existingMore = this.elements.searchResults.querySelector('.search-load-more');
        if (existingMore) existingMore.remove();

        const endIndex = Math.min(this.state.recommendations.shown + count, results.length);

        for (const show of results.slice(this.state.recommendations.shown, endIndex)) {
            if (this.state.displayedShowIds.has(show.id)) continue;
            this.elements.searchResults.appendChild(this.createSearchResultElement(show));
            this.state.displayedShowIds.add(show.id);
        }

        this.state.recommendations.shown = endIndex;

        if (endIndex < results.length) {
            const moreDiv = document.createElement('div');
            moreDiv.className = 'search-load-more';
            moreDiv.setAttribute('role', 'option');
            moreDiv.setAttribute('tabindex', '-1');
            moreDiv.setAttribute('aria-label', 'Load more suggestions');
            moreDiv.innerHTML = '<span class="load-more-btn"><i class="fas fa-plus" aria-hidden="true"></i> load more</span>';
            moreDiv.addEventListener('click', (e) => {
                e.stopPropagation();
                const fromKeyboard = e.detail === 0;
                const firstNewIndex = this.resultNavItems().length - 1; // replaces the load-more row
                this.appendRecommendations(this.state.maxSearchResults);
                if (fromKeyboard) {
                    const options = this.resultNavItems();
                    this.focusResultItem(options[firstNewIndex] || options[0]);
                } else {
                    this.resetResultRoving();
                }
            });

            this.elements.searchResults.appendChild(moreDiv);
        }
    },

    // Escape text taken from TMDB before it goes into markup
    escapeHtml(value) {
        return String(value ?? '').replace(/[&<>"']/g, ch => ({
            '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
        }[ch]));
    },
});
