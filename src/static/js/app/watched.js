// Showtime - adding shows, running-total animation, celebration trigger
// Extends the App object defined in app/core.js.

Object.assign(App, {
    // Add show with specific number of seasons (for season selector bars)
    async addShowWithSeasons(showId, seasonsWatched, showName) {
        // Find the show among whatever the dropdown is currently offering
        const show = this.findResultShow(showId);
        if (!show) {
            this.showToast('Show not found. Please try again.', 'error');
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
            this.markCelebrationShow(show.id);
            this.loadWatchedShows(true);
            this.hideSearchResults();
            this.elements.searchInput.value = '';
            
            // Only focus search input on desktop, not mobile.
            // preventScroll keeps the browser from yanking the viewport back
            // down to the search bar.
            if (!this.isMobile()) {
                this.elements.searchInput.focus({ preventScroll: true });
            }

            // Scroll to the total/celebration card after adding a show
            this.scrollToTopCard();
        } catch (error) {
            console.error('Error adding show:', error);
            this.showToast('Failed to add show. Please try again.', 'error');
        } finally {
            this.hideLoading();
        }
    },

    // Load watched shows from localStorage and API
    async loadWatchedShows(isUserTriggered = false) {
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
            
            this.updateTotalTimeDisplay(data.total_time_formatted, data.total_time_minutes, isUserTriggered);
            
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
    updateTotalTimeDisplay(formattedTime, newTimeMinutes = null, isUserTriggered = false) {
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

        // Skip animations only on initial page load, not on user-triggered first show addition
        if (this.state.isInitialLoad && !isUserTriggered) {
            timeValue.textContent = newText;
            this.state.isInitialLoad = false;
            return;
        }

        // Mark initial load as complete after first user interaction
        if (this.state.isInitialLoad) {
            this.state.isInitialLoad = false;
        }

        // Animate the counting for any change (including first show addition)
        if (this.state.totalTime !== this.state.previousTotalTime) {
            this.animateTimeValue(timeValue, this.state.previousTotalTime, this.state.totalTime, isIncrease, isDecrease);
        } else {
            // Simple update for subsequent loads without previous state
            timeValue.textContent = newText;
        }
    },

    // Animate time value with counting effect
    animateTimeValue(element, fromMinutes, toMinutes, isIncrease, isDecrease) {
        const timeDifference = Math.abs(toMinutes - fromMinutes);
        
        // Calculate animation intensity based on time difference
        // 1 day = 1440 minutes (minimum intensity)
        // 5 days = 7200 minutes (maximum intensity)
        const minThreshold = 1440; // 1 day
        const maxThreshold = 7200; // 5 days
        
        let intensityFactor = Math.min(Math.max((timeDifference - minThreshold) / (maxThreshold - minThreshold), 0), 1);
        
        // Even small increases should have some animation, so ensure minimum intensity
        if (timeDifference > 0) {
            intensityFactor = Math.max(intensityFactor, 0.2); // Minimum 20% intensity
        }
        
        // Scale duration based on intensity (0.8s to 1.6s)
        const baseDuration = 800;
        const maxDuration = 1600;
        const duration = baseDuration + (maxDuration - baseDuration) * intensityFactor;
        
        const startTime = performance.now();
        
        // Add appropriate animation class with intensity
        if (isIncrease) {
            element.classList.add('increase');
            // Set CSS custom property for intensity
            element.style.setProperty('--animation-intensity', intensityFactor);
        } else if (isDecrease) {
            element.classList.add('decrease');
            element.style.setProperty('--animation-intensity', intensityFactor);
        }
        element.classList.add('animating');

        // Start celebration effect immediately for increases
        let celebrationStarted = false;
        if (isIncrease) {
            this.triggerCelebrationEffect(element, timeDifference, intensityFactor);
            celebrationStarted = true;
        }

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
                // Animation complete - trigger celebration for increases only if not already started
                if (isIncrease && !celebrationStarted) {
                    this.triggerCelebrationEffect(element, timeDifference, intensityFactor);
                }
                
                // Clean up animation classes and custom properties after a delay
                setTimeout(() => {
                    element.classList.remove('animating', 'increase', 'decrease');
                    element.style.removeProperty('--animation-intensity');
                }, 500);
            }
        };

        requestAnimationFrame(animate);
    },

    // Remember which show is about to change the total, so its easter egg (if
    // any) can take over the celebration. Told this early, an easter egg that
    // has something to fetch can start fetching now rather than when the
    // animation is already due.
    markCelebrationShow(showId) {
        this.state.celebrationShowId = showId;
        if (typeof EasterEggs !== 'undefined') {
            EasterEggs.preload(showId);
        }
    },

    // Trigger celebration particle effect using canvas-confetti
    triggerCelebrationEffect(element, timeDifference, intensityFactor) {
        const container = element.closest('.watch-time-card');
        if (!container) return;

        // The show that triggered this increase only gets one celebration.
        const celebrationShowId = this.state.celebrationShowId;
        this.state.celebrationShowId = null;

        // Get container bounds to determine the origin position
        const containerRect = container.getBoundingClientRect();
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        
        // Calculate center position of the card relative to viewport
        const originX = (containerRect.left + containerRect.width / 2) / viewportWidth;
        const originY = (containerRect.top + containerRect.height / 2) / viewportHeight;

        // Scale particle count based on intensity (15 to 60 particles for better visual impact)
        const minParticles = 15;
        const maxParticles = 60;
        const particleCount = Math.round(minParticles + (maxParticles - minParticles) * intensityFactor);

        // Hand over to the show's easter egg animation when it has one. The
        // card's bounds go with the origin, for effects that want to place
        // themselves inside it rather than burst out of the middle.
        if (typeof EasterEggs !== 'undefined' && EasterEggs.celebrate(celebrationShowId, {
            originX: originX,
            originY: originY,
            particleCount: particleCount,
            intensityFactor: intensityFactor,
            bounds: {
                left: containerRect.left,
                top: containerRect.top,
                width: containerRect.width,
                height: containerRect.height
            }
        })) {
            return;
        }

        // Check if canvas-confetti is available
        if (typeof confetti !== 'function') {
            console.warn('canvas-confetti library not loaded');
            return;
        }

        // Configure confetti colors (vibrant selection)
        const colors = ['#ff6b6b', '#4ecdc4', '#45b7d1', '#f9ca24', '#f0932b', '#eb4d4b', '#6c5ce7', '#a29bfe', '#fd79a8', '#fdcb6e'];

        // Calculate spread and decay based on intensity
        const spread = Math.round(60 + intensityFactor * 40); // 60-100 degrees spread
        const startVelocity = Math.round(15 + intensityFactor * 19); // Reduced from 20-45 to 15-34 (25% reduction)
        const decay = 0.91 - (intensityFactor * 0.05); // 0.91-0.86 decay (faster for higher intensity)

        // Create multiple bursts for a more dynamic effect
        const burstCount = Math.round(1 + intensityFactor * 2); // 1-3 bursts
        
        // Primary upward bursts
        for (let burst = 0; burst < burstCount; burst++) {
            setTimeout(() => {
                // Fire upward confetti burst
                confetti({
                    particleCount: Math.round(particleCount / burstCount * 0.7), // 70% of particles go up
                    spread: spread,
                    startVelocity: startVelocity,
                    origin: { 
                        x: originX, 
                        y: originY 
                    },
                    colors: colors,
                    shapes: ['square', 'circle'], // Mix of shapes
                    scalar: 0.8 + (intensityFactor * 0.4), // 0.8-1.2 size scaling
                    drift: (Math.random() - 0.5) * 2, // Random horizontal drift
                    gravity: 0.6 + (intensityFactor * 0.2), // 0.6-0.8 gravity
                    decay: decay,
                    ticks: Math.round(120 + intensityFactor * 80), // 120-200 ticks duration
                    angle: 90 // Upward direction
                });
            }, burst * 100); // Stagger bursts by 100ms
        }

        // Multi-directional bursts for all intensities (not just high intensity)
        for (let burst = 0; burst < burstCount; burst++) {
            setTimeout(() => {
                // Create downward and sideways confetti for visual variety
                const remainingParticles = Math.round(particleCount / burstCount * 0.3); // 30% of particles
                const directions = [
                    { angle: 210, velocity: startVelocity * 0.6 }, // Down-left
                    { angle: 330, velocity: startVelocity * 0.6 }, // Down-right
                    { angle: 270, velocity: startVelocity * 0.8 }  // Straight down
                ];
                
                directions.forEach((direction, index) => {
                    confetti({
                        particleCount: Math.round(remainingParticles / directions.length),
                        spread: 45, // Narrower spread for directional bursts
                        startVelocity: direction.velocity,
                        origin: { 
                            x: originX, 
                            y: originY 
                        },
                        colors: colors,
                        shapes: ['square', 'circle'],
                        scalar: 0.7 + (intensityFactor * 0.3), // Slightly smaller for secondary bursts
                        drift: (Math.random() - 0.5) * 1.5,
                        gravity: 0.5 + (intensityFactor * 0.15),
                        decay: decay,
                        ticks: Math.round(100 + intensityFactor * 60),
                        angle: direction.angle
                    });
                });
            }, burst * 100 + 50); // Slight delay after upward bursts
        }

        // Additional radial burst for higher intensity (enhanced to be more balanced)
        if (intensityFactor > 0.6) {
            setTimeout(() => {
                // Create a balanced radial explosion effect
                const radialCount = Math.round(particleCount * 0.3);
                confetti({
                    particleCount: radialCount,
                    spread: 360, // Full circle
                    startVelocity: Math.round(11 + intensityFactor * 15), // Reduced velocity for radial burst too
                    origin: { 
                        x: originX, 
                        y: originY 
                    },
                    colors: colors,
                    shapes: ['circle'],
                    scalar: 0.6 + (intensityFactor * 0.3),
                    gravity: 0.4,
                    decay: 0.89,
                    ticks: Math.round(100 + intensityFactor * 60)
                });
            }, 150);
        }
    },
});
