// Showtime - App core: state, DOM element handles, init and event wiring

const App = {
    // Application state
    state: {
        currentSearch: null,
        watchedShows: [],
        totalTime: 0,
        previousTotalTime: 0,
        isLoading: false,
        searchRequestId: 0,
        pendingSearchController: null,
        displayedSearchResults: 0,
        displayedShowIds: new Set(),
        maxSearchResults: 5,
        currentQuery: '',
        currentPage: 1,
        isInitialLoad: true,
        // Show that caused the next watch-time increase, so an easter egg can
        // replace the confetti with its own celebration. Cleared once used.
        celebrationShowId: null,
        // Suggestions shown in the dropdown when there is nothing to search for.
        // Redrawn on every focus: the server samples its candidate pool per
        // request, so refetching is what makes the suggestions cycle.
        recommendations: {
            results: [],
            mode: null,
            loading: false,
            shown: 0
        }
    },

    // DOM elements
    elements: {
        searchInput: null,
        searchResults: null,
        watchedShows: null,
        emptyState: null,
        totalWatchTime: null,
        loadingSpinner: null,
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

        this.initElements();
        this.bindEvents();
        this.loadWatchedShows();
        
        // Handle mobile optimizations on load and resize
        this.handleMobileOptimizations();
        window.addEventListener('resize', () => this.handleMobileOptimizations());
        
        console.log('Showtime app initialized with localStorage');
    },

    // Initialize DOM elements
    initElements() {
        this.elements.searchInput = document.getElementById('searchInput');
        this.elements.searchResults = document.getElementById('searchResults');
        this.elements.watchedShows = document.getElementById('watchedShows');
        this.elements.emptyState = document.getElementById('emptyState');
        this.elements.totalWatchTime = document.getElementById('totalWatchTime');
        this.elements.loadingSpinner = document.getElementById('loadingSpinner');
        this.elements.toastContainer = document.getElementById('toastContainer');
        this.elements.sortControls = document.getElementById('sortControls');
        this.elements.sortSelect = document.getElementById('sortSelect');
        this.elements.removeAllBtn = document.getElementById('removeAllBtn');
        this.elements.shareBtn = document.getElementById('shareBtn');
        this.elements.exportBtn = document.getElementById('exportBtn');
        this.elements.importBtn = document.getElementById('importBtn');
        this.elements.importFileInput = document.getElementById('importFileInput');
        this.elements.refreshSeasonsBtn = document.getElementById('refreshSeasonsBtn');
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
        
        // Share functionality
        if (this.elements.shareBtn) {
            this.elements.shareBtn.addEventListener('click', () => {
                this.shareWatchTime();
            });
        }
        
        // Export functionality
        if (this.elements.exportBtn) {
            this.elements.exportBtn.addEventListener('click', () => {
                this.exportData();
            });
        }
        
        // Import functionality
        if (this.elements.importBtn) {
            this.elements.importBtn.addEventListener('click', () => {
                this.elements.importFileInput.click();
            });
        }
        
        if (this.elements.importFileInput) {
            this.elements.importFileInput.addEventListener('change', (e) => {
                this.importData(e.target.files[0]);
            });
        }
        
        // Refresh Seasons functionality
        if (this.elements.refreshSeasonsBtn) {
            this.elements.refreshSeasonsBtn.addEventListener('click', () => {
                this.refreshAllSeasons();
            });
        }
        
        // Close search results when clicking outside
        document.addEventListener('click', (e) => {
            // Don't close if clicking inside search results or search input
            if (!this.elements.searchInput.contains(e.target) &&
                !this.elements.searchResults.contains(e.target)) {
                this.hideSearchResults();
            }
        });

        // Close the dropdown once keyboard focus leaves the combobox entirely
        const searchContainer = this.elements.searchInput.closest('.search-container')
            || this.elements.searchResults.parentElement;
        if (searchContainer) {
            searchContainer.addEventListener('focusout', () => {
                setTimeout(() => {
                    if (!searchContainer.contains(document.activeElement)) {
                        this.hideSearchResults();
                    }
                }, 0);
            });
        }

        // Close season editing when clicking outside
        document.addEventListener('click', (e) => {
            // Find any open season editing elements
            const openEdits = document.querySelectorAll('.seasons-edit[style*="display: flex"]');
            openEdits.forEach(editElement => {
                const showCard = editElement.closest('.watched-show');
                const showId = editElement.id.replace('seasonsEdit-', '');
                
                // If click is outside the show card, close the editing.
                // Pick mode only commits on Done, so clicking away has to save
                // rather than silently drop what the user just toggled.
                if (showCard && !showCard.contains(e.target)) {
                    const id = parseInt(showId);
                    if (this.isEditPicking(id)) {
                        this.saveSeasons(id);
                    } else {
                        this.cancelEditSeasons(id);
                    }
                }
            });
        });

        // Arrow-key navigation for the inline season editor on watched cards
        if (this.elements.watchedShows) {
            this.elements.watchedShows.addEventListener('keydown', (e) => {
                const bar = e.target.closest('.edit-season-bar');
                if (bar) this.handleEditSeasonBarsKeydown(e, bar);
            });
        }
    },

    // Roving arrow-key navigation within one card's season editor. One Tab
    // stop lands on the current count; Left/Right (or Up/Down) walk the bars
    // with a live preview highlight, Enter/Space commit, Esc cancels.
    handleEditSeasonBarsKeydown(e, bar) {
        const container = bar.closest('.edit-season-bars');
        if (!container) return;
        const bars = Array.from(container.querySelectorAll('.edit-season-bar'));
        const idx = bars.indexOf(bar);
        const showId = parseInt(bar.dataset.showId, 10);

        // In pick mode the bars are independent toggles, so walking the strip
        // only moves focus; in the default mode it previews the new count.
        const picking = this.isEditPicking(showId);

        const moveTo = (target) => {
            const clamped = Math.max(0, Math.min(bars.length - 1, target));
            if (picking) {
                bars.forEach((b, i) => b.setAttribute('tabindex', i === clamped ? '0' : '-1'));
                bars[clamped].focus();
                return;
            }
            bars.forEach((b, i) => {
                b.setAttribute('tabindex', i === clamped ? '0' : '-1');
                b.classList.toggle('highlighted', i <= clamped);
                b.setAttribute('aria-pressed', i <= clamped ? 'true' : 'false');
            });
            container.closest('.seasons-edit').setAttribute('data-selected-seasons', clamped + 1);
            bars[clamped].focus();
        };

        switch (e.key) {
            case 'ArrowRight':
            case 'ArrowDown':
                e.preventDefault();
                moveTo(idx + 1);
                break;
            case 'ArrowLeft':
            case 'ArrowUp':
                e.preventDefault();
                moveTo(idx - 1);
                break;
            case 'Home':
                e.preventDefault();
                moveTo(0);
                break;
            case 'End':
                e.preventDefault();
                moveTo(bars.length - 1);
                break;
            case 'Enter':
            case ' ':
                e.preventDefault();
                this.activateEditSeasonBar(showId, idx + 1);
                break;
            case 'Escape':
                e.preventDefault();
                this.cancelEditSeasons(showId);
                break;
            default:
                break;
        }
    },

    // Minimum query length before a search is worth running
    MIN_QUERY_LENGTH: 2,

    // Markup for a decorative Tabler icon from the app's sprite
    // (static/images/icons.svg); the counterpart of the icon() template macro.
    // The attributes are a fallback for when gunne.css is unavailable.
    icon(name, extraClass = '') {
        const cls = extraClass ? `g1-icon ${extraClass}` : 'g1-icon';
        return `<svg class="${cls}" width="1.25em" height="1.25em" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><use href="/static/images/icons.svg#${name}"></use></svg>`;
    },
};

window.App = App;
