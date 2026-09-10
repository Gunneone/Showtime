// Showtime - toasts, loading, sort preference, remove-all, mobile
// Extends the App object defined in app/core.js.

Object.assign(App, {
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
            this.loadWatchedShows(true);
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
        // Errors interrupt the screen reader; everything else waits its turn.
        toast.setAttribute('role', type === 'error' ? 'alert' : 'status');
        toast.setAttribute('aria-live', type === 'error' ? 'assertive' : 'polite');
        toast.setAttribute('aria-atomic', 'true');

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
                this.elements.sortSelect.value = 'watchtime-desc';
            }
            
            this.showToast('All data has been removed successfully', 'success');
            
        } catch (error) {
            console.error('Error removing all data:', error);
            this.showToast('Failed to remove data. Please try again.', 'error');
        } finally {
            this.hideLoading();
        }
    },

    // Detect if device is mobile
    isMobile() {
        return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || 
               (navigator.maxTouchPoints && navigator.maxTouchPoints > 2 && /MacIntel/.test(navigator.platform)) ||
               window.innerWidth <= 768;
    },

    // Handle mobile-specific optimizations
    handleMobileOptimizations() {
        // Detect if device is mobile
        const isMobile = this.isMobile();
        
        if (this.elements.shareBtn) {
            const shareSpan = this.elements.shareBtn.querySelector('span');
            if (shareSpan) {
                if (isMobile) {
                    // Change "Share Result" to "Share" on mobile
                    if (shareSpan.textContent === 'Share Result') {
                        shareSpan.textContent = 'Share';
                    }
                } else {
                    // Change "Share" back to "Share Result" on desktop
                    if (shareSpan.textContent === 'Share') {
                        shareSpan.textContent = 'Share Result';
                    }
                }
            }
        }
        
        // Add mobile scroll functionality
        if (isMobile) {
            this.setupMobileScrollFunctionality();
        }
    },

    // Setup mobile scroll functionality
    setupMobileScrollFunctionality() {
        // Check if already setup to avoid multiple listeners
        if (this.mobileScrollSetup) return;
        this.mobileScrollSetup = true;

        // Scroll to search when search input is focused
        this.elements.searchInput.addEventListener('focus', () => {
            // Small delay to ensure virtual keyboard is shown
            setTimeout(() => {
                this.elements.searchInput.scrollIntoView({ 
                    behavior: 'smooth', 
                    block: 'start' 
                });
            }, 300);
        });
    },

    // Scroll to top card (used after adding show, so the total and the
    // celebration animation are actually visible)
    scrollToTopCard() {
        const topCard = document.querySelector('.watch-time-card');
        if (!topCard) return;

        const prefersReducedMotion = window.matchMedia &&
            window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        const behavior = prefersReducedMotion ? 'auto' : 'smooth';

        // Cancel any re-assert still pending from a previous add
        this.cancelTopCardScroll();

        // The header is fixed, so scrolling the card flush to the viewport top
        // would tuck its title underneath it
        const header = document.querySelector('.header');
        const headerOffset = header ? header.getBoundingClientRect().height + 12 : 0;

        const scroll = () => {
            const top = Math.max(
                0,
                window.scrollY + topCard.getBoundingClientRect().top - headerOffset
            );
            window.scrollTo({ top, behavior });
        };

        // Stop fighting the user the moment they scroll or tap something
        const abort = () => this.cancelTopCardScroll();
        this.topCardScrollAbort = abort;
        ['wheel', 'touchstart', 'keydown'].forEach(evt =>
            window.addEventListener(evt, abort, { passive: true, once: true })
        );

        scroll();

        // Hiding the search results and re-rendering the watched list both change
        // the page height while the smooth scroll is still running, which clamps
        // or interrupts it. Re-assert the position until the layout has settled.
        this.topCardScrollTimers = [60, 250, 600, 1000].map(delay =>
            setTimeout(scroll, delay)
        );
    },

    // Stop re-asserting the scroll position to the top card
    cancelTopCardScroll() {
        (this.topCardScrollTimers || []).forEach(clearTimeout);
        this.topCardScrollTimers = [];

        if (this.topCardScrollAbort) {
            ['wheel', 'touchstart', 'keydown'].forEach(evt =>
                window.removeEventListener(evt, this.topCardScrollAbort)
            );
            this.topCardScrollAbort = null;
        }
    },
});
