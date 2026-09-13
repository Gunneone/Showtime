// Showtime - share, export, import, and bulk season refresh
// Extends the App object defined in app/core.js.

Object.assign(App, {
    // Share watch time functionality
    async shareWatchTime() {
        try {
            const watchedShows = this.state.watchedShows || DataStorage.getWatchedShows();
            const totalTimeMinutes = this.state.totalTime || 0;
            const showCount = watchedShows.length;
            
            // Format time into days and hours
            const totalHours = Math.floor(totalTimeMinutes / 60);
            const days = Math.floor(totalHours / 24);
            const hours = totalHours % 24;
            
            let timeText;
            if (days > 0 && hours > 0) {
                timeText = `${days} days ${hours} hours`;
            } else if (days > 0) {
                timeText = `${days} days`;
            } else if (hours > 0) {
                timeText = `${hours} hours`;
            } else {
                timeText = '0 hours';
            }
            
            // Create the new share message format
            const shareText = `I spend <b>${timeText}</b> of my life watching <b>${showCount}</b> TV Shows.\nTime well spent!\n\nWhat is <b>your result</b>?\n\n${window.location.origin}`;
            
            // Detect if device is mobile
            const isMobile = this.isMobile();
            
            if (isMobile) {
                // On mobile: Use Web Share API if available
                const shareData = {
                    title: 'My TV Show Watching Stats',
                    text: shareText.replace(/<b>/g, '').replace(/<\/b>/g, ''),
                    url: window.location.origin
                };

                if (navigator.share && navigator.canShare && navigator.canShare(shareData)) {
                    await navigator.share(shareData);
                    this.showToast('Shared successfully!');
                    return;
                }
            }
            
            // On desktop or if Web Share API is not available: Copy to clipboard
            const clipboardText = shareText.replace(/<b>/g, '').replace(/<\/b>/g, '');
            
            if (navigator.clipboard && navigator.clipboard.writeText) {
                await navigator.clipboard.writeText(clipboardText);
                this.showToast('Copied to clipboard!');
            } else {
                // Fallback for older browsers
                const textArea = document.createElement('textarea');
                textArea.value = clipboardText;
                textArea.style.position = 'fixed';
                textArea.style.left = '-999999px';
                textArea.style.top = '-999999px';
                document.body.appendChild(textArea);
                textArea.focus();
                textArea.select();
                
                try {
                    document.execCommand('copy');
                    this.showToast('Copied to clipboard!');
                } catch (err) {
                    this.showToast('Unable to copy. Please copy manually.', 'error');
                }
                
                document.body.removeChild(textArea);
            }
        } catch (error) {
            console.error('Error sharing:', error);
            this.showToast('Failed to share. Please try again.', 'error');
        }
    },

    // Export all data as JSON file
    exportData() {
        try {
            // Gather all data to export (include released_seasons but will be refreshed on import)
            const watchedShows = DataStorage.getWatchedShows();
            
            const exportData = {
                version: '1.0',
                exportDate: new Date().toISOString(),
                watchedShows: watchedShows
            };

            // Convert to JSON string
            const jsonString = JSON.stringify(exportData, null, 2);
            
            // Create blob and download
            const blob = new Blob([jsonString], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            
            // Create download link
            const link = document.createElement('a');
            link.href = url;
            link.download = `showtime-backup-${new Date().toISOString().split('T')[0]}.json`;
            
            // Trigger download
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            // Clean up
            URL.revokeObjectURL(url);
            
            this.showToast('Data exported successfully!', 'success');
            
        } catch (error) {
            console.error('Error exporting data:', error);
            this.showToast('Failed to export data. Please try again.', 'error');
        }
    },

    // Import data from JSON file
    async importData(file) {
        if (!file) {
            this.showToast('No file selected', 'error');
            return;
        }

        if (!file.name.endsWith('.json')) {
            this.showToast('Please select a valid JSON file', 'error');
            return;
        }

        try {
            this.showLoading();
            
            // Read file content
            const fileContent = await this.readFileAsText(file);
            
            // Parse JSON
            let importData;
            try {
                importData = JSON.parse(fileContent);
            } catch (parseError) {
                throw new Error('Invalid JSON format');
            }
            
            // Validate data structure
            if (!this.validateImportData(importData)) {
                throw new Error('Invalid data format. Please ensure you\'re importing a valid Showtime backup file.');
            }
            
            // Confirm import with user
            const showsCount = importData.watchedShows ? importData.watchedShows.length : 0;
            const confirmMessage = `This will replace all your current data with the imported data.\n\nImport contains ${showsCount} shows.\n\nDo you want to continue?`;
            
            if (!confirm(confirmMessage)) {
                this.hideLoading();
                return;
            }
            
            // Import the data immediately and display it
            if (importData.watchedShows) {
                // Store the imported data immediately
                const importedShows = importData.watchedShows
                    .map(show => this.normalizeImportedShow(show));
                DataStorage.setWatchedShows(importedShows);
                this.state.watchedShows = importedShows;
            }
            
            // Load and display the imported shows immediately. An import is
            // not one show's doing, so no easter egg gets the celebration.
            this.markCelebrationShow(null);
            this.loadWatchedShows(true);
            
            // Clear file input
            this.elements.importFileInput.value = '';
            
            this.showToast(`Successfully imported ${showsCount} shows!`, 'success');
            
            // Hide loading overlay immediately after import is complete
            this.hideLoading();
            
            // Now refresh season counts silently in the background
            setTimeout(() => {
                this.refreshAllSeasons();
            }, 500); // Small delay to let the UI update first
            
        } catch (error) {
            console.error('Error importing data:', error);
            this.showToast(error.message || 'Failed to import data. Please try again.', 'error');
            this.hideLoading();
        }
    },

    // Helper function to read file as text
    readFileAsText(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = () => reject(new Error('Failed to read file'));
            reader.readAsText(file);
        });
    },

    // A single show record from an import file
    isValidImportedShow(show) {
        if (!show || !show.id || !show.name || typeof show.seasons_watched !== 'number') {
            return false;
        }
        // watched_seasons is optional: a file written before individual season
        // picking existed simply means "seasons 1..seasons_watched".
        if (show.watched_seasons === undefined || show.watched_seasons === null) {
            return true;
        }
        return Array.isArray(show.watched_seasons)
            && show.watched_seasons.every(season => Number.isInteger(season) && season >= 1);
    },

    // Bring an imported record back onto the invariant the app relies on:
    // seasons_watched is the count, and a list is only stored when it has gaps.
    // A hand-edited or truncated file can break that; the server re-derives
    // everything on the next write, but the list renders before then.
    normalizeImportedShow(show) {
        if (!Array.isArray(show.watched_seasons)) return show;

        const seasons = [...new Set(show.watched_seasons)].sort((a, b) => a - b);
        const isPrefix = seasons.every((season, index) => season === index + 1);

        if (!seasons.length || isPrefix) {
            delete show.watched_seasons;
            if (seasons.length) show.seasons_watched = seasons.length;
        } else {
            show.watched_seasons = seasons;
            show.seasons_watched = seasons.length;
        }
        return show;
    },

    // Validate imported data structure
    validateImportData(data) {
        if (!data || typeof data !== 'object') {
            return false;
        }
        
        // Check if it has the expected structure
        if (data.watchedShows && Array.isArray(data.watchedShows)) {
            return data.watchedShows.every(show => this.isValidImportedShow(show));
        }
        
        // Also accept simple array of shows (backward compatibility)
        if (Array.isArray(data)) {
            return data.every(show => this.isValidImportedShow(show));
        }
        
        return false;
    },

    // Refresh season counts for all shows
    async refreshAllSeasons() {
        const watchedShows = this.state.watchedShows;
        
        if (!watchedShows || watchedShows.length === 0) {
            this.showToast('No shows to refresh', 'info');
            return;
        }

        // Show start message only
        this.showToast('Checking for new seasons...', 'info');

        try {
            const response = await fetch('/api/refresh-seasons', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    watched_shows: watchedShows
                })
            });

            if (!response.ok) {
                throw new Error('Failed to refresh season counts');
            }

            const data = await response.json();
            
            if (data.success) {
                // Check if any shows actually got more seasons
                let hasUpdates = false;
                const originalShows = this.state.watchedShows;
                const updatedShows = data.updated_watched_shows;
                
                for (let i = 0; i < originalShows.length; i++) {
                    const original = originalShows[i];
                    const updated = updatedShows.find(s => s.id === original.id);
                    
                    if (updated) {
                        const originalReleased = original.released_seasons || original.total_seasons || 1;
                        const updatedReleased = updated.released_seasons || updated.total_seasons || 1;
                        
                        if (updatedReleased > originalReleased) {
                            hasUpdates = true;
                            break;
                        }
                    }
                }
                
                if (hasUpdates) {
                    // Update the stored data and application state
                    DataStorage.setWatchedShows(data.updated_watched_shows);
                    this.state.watchedShows = data.updated_watched_shows;
                    
                    // Reload the watched shows display
                    this.loadWatchedShows();
                    
                    this.showToast('New seasons found and updated!', 'success');
                } else {
                    this.showToast('All shows are up to date', 'info');
                }
            } else {
                throw new Error(data.error || 'Failed to refresh season counts');
            }

        } catch (error) {
            console.error('Error refreshing seasons:', error);
            this.showToast('Failed to refresh season counts. Please try again.', 'error');
        }
        // Note: No loading overlay, no hideLoading() call - keeps UI usable
    }
});
