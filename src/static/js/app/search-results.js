// Showtime - search result rendering and season-selector bars
// Extends the App object defined in app/core.js.

Object.assign(App, {
    // Display search results
    displaySearchResults(allResults, isInstantSearch = false, isInitialLoad = false) {
        // Clear previous results only on initial load
        if (isInitialLoad) {
            this.elements.searchResults.innerHTML = '';
            this.state.displayedSearchResults = 0;
            this.state.displayedShowIds = new Set(); // Track displayed show IDs to prevent duplicates
        }

        this.elements.searchResults.classList.remove('hidden');
        this.setResultsExpanded(true);

        if (!allResults || allResults.length === 0) {
            this.elements.searchResults.innerHTML = `
                <div class="search-no-results">
                    <i class="fas fa-search" aria-hidden="true"></i>
                    <p>No shows found. Try a different search term.</p>
                </div>
            `;
            this.setListboxActive(false);
            return;
        }

        this.setListboxActive(true);

        // Determine how many results to show
        const startIndex = this.state.displayedSearchResults;
        const endIndex = Math.min(startIndex + this.state.maxSearchResults, allResults.length);

        for (const show of allResults.slice(startIndex, endIndex)) {
            // Skip if already displayed to prevent duplicates
            if (this.state.displayedShowIds.has(show.id)) {
                continue;
            }

            this.elements.searchResults.appendChild(
                this.createSearchResultElement(show, isInstantSearch)
            );
            this.state.displayedShowIds.add(show.id);
        }

        this.state.displayedSearchResults = endIndex;

        // Offer more if this page has results left, or another page exists
        const hasMoreLocally = endIndex < allResults.length;
        const hasMorePages = (this.state.currentPage || 1) < (this.state.currentSearch?.total_pages || 1);
        if (hasMoreLocally || hasMorePages) {
            this.addLoadMoreButton(allResults, isInstantSearch);
        }

        if (isInitialLoad) {
            this.resetResultRoving();
        }
    },

    // Create search result element
    createSearchResultElement(show, isInstantSearch = false) {
        const div = document.createElement('div');
        div.className = 'search-result';
        div.id = `search-result-${show.id}`;
        div.setAttribute('role', 'option');
        div.setAttribute('aria-selected', 'false');
        div.setAttribute('tabindex', '-1');

        // Handle poster image
        let posterUrl = '/static/images/no-poster.png';
        if (show.poster_path && show.poster_path !== 'null' && show.poster_path !== null) {
            posterUrl = show.poster_path;
        }

        const year = show.first_air_date ? new Date(show.first_air_date).getFullYear() : 'Unknown';

        // Season counts now always arrive with the search response
        const releasedSeasons = show.number_of_released_seasons || 1;
        const seasonBars = this.createSeasonSelectorBars(releasedSeasons, show);
        const safeName = this.escapeHtml(show.name);

        // Keyboard users adjust this with Left/Right; it starts at "all".
        div.dataset.totalSeasons = releasedSeasons;
        div.dataset.selectedSeasons = releasedSeasons;
        div.dataset.showName = show.name;
        div.dataset.pickMode = 'false';
        div.dataset.watchedSeasons = '';
        this.updateResultOptionLabel(div);

        // Picking single seasons while adding is a desktop affordance: the
        // dropdown row on a phone is already tight, and the same control is
        // always available in the card's editor afterwards.
        const pickControls = (releasedSeasons > 1 && !this.isMobile()) ? `
                        <div class="season-pick-controls">
                            <button type="button" class="season-pick-toggle" aria-pressed="false"
                                    title="Pick individual seasons"
                                    aria-label="Pick individual seasons of ${safeName}"
                                    data-show-id="${show.id}">
                                <i class="fas fa-list-check" aria-hidden="true"></i>
                            </button>
                            <button type="button" class="season-pick-add" hidden
                                    data-show-id="${show.id}">Add</button>
                        </div>
        ` : '';

        div.innerHTML = `
            <div class="search-result-content">
                <div class="search-result-poster">
                    <img src="${this.escapeHtml(posterUrl)}" alt="${safeName}"
                         onerror="this.src='/static/images/no-poster.png'; this.onerror=null;"
                         loading="lazy">
                </div>
                <div class="search-result-info">
                    <p class="search-result-title">${safeName}<span class="search-result-date">${year}</span></p>
                    <div class="search-result-seasons">
                        <span class="season-selector-label" aria-hidden="true">Seasons:</span>
                        <div class="season-row">
                            <div class="season-selector-bars" data-show-id="${show.id}" aria-hidden="true">
                                ${seasonBars}
                            </div>
                            ${pickControls}
                        </div>
                    </div>
                </div>
            </div>
        `;

        const seasonBarsContainer = div.querySelector('.season-selector-bars');
        if (seasonBarsContainer) {
            this.setupSeasonBarHoverEffects(seasonBarsContainer);
        }

        // Mouse: clicking the body of the result adds every released season;
        // clicking a specific bar or a pick control is handled by the
        // delegated listeners. While picking, the body click would contradict
        // the selection on screen, so it stops adding anything.
        div.addEventListener('click', (e) => {
            if (e.target.closest('.season-selector-bars')
                || e.target.closest('.season-pick-controls')) {
                return;
            }
            if (div.dataset.pickMode === 'true') return;
            this.addShowWithSeasons(show.id, releasedSeasons, show.name);
        });

        return div;
    },

    // Keep a result option's accessible name in step with its season selection
    updateResultOptionLabel(option) {
        const total = parseInt(option.dataset.totalSeasons, 10) || 1;
        const name = option.dataset.showName || '';

        if (option.dataset.pickMode === 'true') {
            const picked = this.readSeasonList(option, 'data-watched-seasons');
            const listed = picked.length ? picked.join(', ') : 'none';
            option.setAttribute('aria-label',
                `${name}. Picking individual seasons; currently ${listed}.`);
            return;
        }

        const selected = parseInt(option.dataset.selectedSeasons, 10) || total;
        const seasons = `${selected} season${selected !== 1 ? 's' : ''}`;
        const hint = total > 1 ? ' Use left and right arrow keys to change how many.' : '';
        option.setAttribute('aria-label',
            `${name}. Press Enter to add with ${seasons} watched.${hint}`);
    },

    // Reflect a result option's season selection on its (decorative) bars
    paintResultSeasonBars(option) {
        const picking = option.dataset.pickMode === 'true';
        const picked = picking ? this.readSeasonList(option, 'data-watched-seasons') : [];
        const selected = parseInt(option.dataset.selectedSeasons, 10) || 0;

        option.querySelectorAll('.season-bar').forEach((bar, idx) => {
            const on = picking ? picked.includes(idx + 1) : idx < selected;
            bar.classList.toggle('highlighted', on);
        });

        const add = option.querySelector('.season-pick-add');
        if (add) {
            add.hidden = !picking;
            add.disabled = picking && picked.length === 0;
            add.textContent = picked.length
                ? `Add ${picked.length} season${picked.length !== 1 ? 's' : ''}`
                : 'Add';
        }
    },

    // Flip one search result between a season count and a season set
    toggleResultPickMode(option) {
        const picking = option.dataset.pickMode !== 'true';
        option.dataset.pickMode = picking ? 'true' : 'false';
        // Starts empty: the point of picking is a handful of seasons out of a
        // long run, so deselecting all of them first would be the clunky part.
        if (picking) option.dataset.watchedSeasons = '';

        const bars = option.querySelector('.season-selector-bars');
        if (bars) bars.classList.toggle('pick-mode', picking);
        const toggle = option.querySelector('.season-pick-toggle');
        if (toggle) toggle.setAttribute('aria-pressed', picking ? 'true' : 'false');

        this.paintResultSeasonBars(option);
        this.updateResultOptionLabel(option);
    },

    // Resolve a click in the results dropdown onto a season bar or one of the
    // pick controls. They are rendered from untrusted TMDB titles, so they
    // carry data attributes instead of inline handlers.
    handleSeasonControlClick(e) {
        const within = el => el && this.elements.searchResults.contains(el);

        const toggle = e.target.closest('.season-pick-toggle');
        if (within(toggle)) {
            e.stopPropagation();
            const option = toggle.closest('.search-result');
            if (option) this.toggleResultPickMode(option);
            return;
        }

        const add = e.target.closest('.season-pick-add');
        if (within(add)) {
            e.stopPropagation();
            this.addPickedResult(add.closest('.search-result'));
            return;
        }

        const bar = e.target.closest('.season-bar');
        if (!within(bar)) return;

        e.stopPropagation();
        this.activateSeasonBar(bar);
    },

    // Add a show with exactly the seasons picked on its result card
    addPickedResult(option) {
        if (!option) return;
        const showId = parseInt(option.id.replace('search-result-', ''), 10);
        const seasons = this.readSeasonList(option, 'data-watched-seasons');
        if (!seasons.length) return;

        const show = this.findResultShow(showId);
        if (!show) return;

        // A selection that came out contiguous is just a season count, and is
        // stored as one so it is indistinguishable from an ordinary add.
        const explicit = this.isSeasonPrefix(seasons) ? null : seasons;
        this.addShowWithSeasons(showId, seasons.length, show.name, explicit);
    },

    // Pick mode: flip one season on a search result
    toggleResultSeason(option, season) {
        const seasons = this.toggleSeason(
            this.readSeasonList(option, 'data-watched-seasons'), season
        );
        option.dataset.watchedSeasons = seasons.join(',');
        option.dataset.selectedSeasons = seasons.length;
        this.paintResultSeasonBars(option);
        this.updateResultOptionLabel(option);
    },

    // Add load more button to search results
    addLoadMoreButton(allResults, isInstantSearch) {
        // Remove any existing load more button first
        const existingLoadMoreBtn = this.elements.searchResults.querySelector('.search-load-more');
        if (existingLoadMoreBtn) {
            existingLoadMoreBtn.remove();
        }
        
        const loadMoreDiv = document.createElement('div');
        loadMoreDiv.className = 'search-load-more';
        loadMoreDiv.setAttribute('role', 'option');
        loadMoreDiv.setAttribute('tabindex', '-1');
        loadMoreDiv.setAttribute('aria-label', 'Load more results');
        loadMoreDiv.innerHTML = `
            <span class="load-more-btn">
                <i class="fas fa-plus" aria-hidden="true"></i> load more
            </span>
        `;
        loadMoreDiv.addEventListener('click', (e) => this.loadMoreSearchResults(e));
        this.elements.searchResults.appendChild(loadMoreDiv);
    },

    // Load more search results
    async loadMoreSearchResults(event) {
        // Prevent event from bubbling up and potentially closing the search results
        if (event) {
            event.stopPropagation();
            event.preventDefault();
        }

        if (!this.state.currentSearch || !this.state.currentSearch.results) return;

        // Remove the load more button
        const loadMoreBtn = this.elements.searchResults.querySelector('.search-load-more');
        if (loadMoreBtn) {
            loadMoreBtn.remove();
        }

        // Pull the next page from TMDB once the current one is exhausted
        const results = this.state.currentSearch.results;
        if (this.state.displayedSearchResults >= results.length) {
            const nextPage = (this.state.currentPage || 1) + 1;
            if (nextPage > (this.state.currentSearch.total_pages || 1)) return;

            try {
                const response = await fetch(
                    `/api/search?query=${encodeURIComponent(this.state.currentQuery)}&page=${nextPage}`
                );
                const data = await response.json();
                if (!response.ok) throw new Error(data.error || 'Search failed');

                this.state.currentPage = data.page || nextPage;
                this.state.currentSearch.results = results.concat(data.results || []);
            } catch (error) {
                console.error('Load more error:', error);
                this.showToast('Could not load more results. Please try again.', 'error');
                this.addLoadMoreButton(results, false);
                return;
            }
        }

        // Remember where the keyboard user was so focus survives the re-render
        const cameFromKeyboard = event && event.detail === 0;
        const firstNewIndex = this.state.displayedSearchResults;

        // Display next batch of results (without clearing existing ones)
        this.displaySearchResults(this.state.currentSearch.results, false, false);

        if (cameFromKeyboard) {
            const options = this.resultNavItems();
            this.focusResultItem(options[firstNewIndex] || options[options.length - 1]);
        }
    },

    // Create season selector bars
    // Clicks are handled by a delegated listener on the results container, so
    // no show data has to survive a trip through an inline attribute.
    createSeasonSelectorBars(totalSeasons, show) {
        // Mouse affordance only. Keyboard/screen-reader users pick a season
        // count with the arrow keys on the focused result (see
        // handleResultsKeydown), so the whole strip is hidden from the a11y
        // tree to keep the surrounding listbox option free of nested widgets.
        let barsHtml = '';
        for (let i = 1; i <= totalSeasons; i++) {
            barsHtml += `
                <div class="season-bar"
                     data-season="${i}"
                     data-show-id="${show.id}">
                    ${i}
                </div>
            `;
        }
        return barsHtml;
    },

    // Create season selector bars for editing existing shows.
    // What a bar does depends on the strip's mode, so the click goes through
    // App.activateEditSeasonBar rather than straight to a season count.
    createEditSeasonSelectorBars(totalSeasons, show, currentSeasons) {
        let barsHtml = '';
        const safeName = this.escapeHtml(show.name);
        const picked = this.resolveWatchedSeasons(show);
        const picking = this.hasSeasonGaps(show);
        // Only one bar sits in the tab order; the arrow keys reach the rest.
        const rovingSeason = picking
            ? (picked[0] || 1)
            : Math.min(Math.max(currentSeasons || 1, 1), totalSeasons);
        for (let i = 1; i <= totalSeasons; i++) {
            const isSelected = picking ? picked.includes(i) : i <= currentSeasons;
            const label = picking
                ? `${isSelected ? 'Unmark' : 'Mark'} season ${i} of ${safeName} as watched`
                : `Set ${safeName} to ${i} season${i !== 1 ? 's' : ''} watched`;
            barsHtml += `
                <div class="season-bar edit-season-bar ${isSelected ? 'highlighted' : ''}"
                     role="button"
                     tabindex="${i === rovingSeason ? '0' : '-1'}"
                     aria-pressed="${isSelected ? 'true' : 'false'}"
                     aria-label="${label}"
                     data-season="${i}"
                     data-show-id="${show.id}"
                     data-show-name="${safeName}"
                     onclick="App.activateEditSeasonBar(${show.id}, ${i})">
                    ${i}
                </div>
            `;
        }
        return barsHtml;
    },

    // Setup hover effects for season bars
    setupSeasonBarHoverEffects(container) {
        const bars = container.querySelectorAll('.season-bar');
        const option = container.closest('.search-result');
        const picking = () => option && option.dataset.pickMode === 'true';

        bars.forEach((bar, index) => {
            bar.addEventListener('mouseenter', () => {
                // The preview has to mean what the click will do: a whole
                // prefix by default, one season while picking. While picking,
                // the seasons already chosen stay lit underneath it.
                if (picking()) {
                    bars.forEach(b => b.classList.remove('hover-highlighted'));
                    bar.classList.add('hover-highlighted');
                    return;
                }

                // Reset all bars
                bars.forEach(b => b.classList.remove('highlighted'));
                for (let i = 0; i <= index; i++) {
                    bars[i].classList.add('highlighted');
                }
            });
        });

        container.addEventListener('mouseleave', () => {
            // Remove all highlights when leaving the container. A picked
            // selection is real state rather than a hover preview, so only
            // that gets painted back.
            bars.forEach(b => b.classList.remove('hover-highlighted'));
            if (picking()) {
                this.paintResultSeasonBars(option);
                return;
            }
            bars.forEach(b => b.classList.remove('highlighted'));
        });
    },
});
