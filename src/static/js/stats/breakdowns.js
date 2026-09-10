// Showtime - awards, conversions, breakdown lists, tooltips
// Extends the StatsApp object defined in stats/core.js.

Object.assign(StatsApp, {
    // Display awards
    displayAwards(awards) {
        const container = document.getElementById('awardsSection');
        container.innerHTML = '';

        if (!awards) {
            container.innerHTML = '<p style="text-align: center; color: #cbd5e0; padding: 2rem;">No awards data available</p>';
            return;
        }

        const awardCards = [
            {
                icon: 'fas fa-calendar-alt',
                title: 'Oldest Show',
                show: awards.oldest_show,
                getValue: (show) => show ? `${show.name} (${show.year})` : 'No data'
            },
            {
                icon: 'fas fa-list-ol',
                title: 'Most Episodes',
                show: awards.most_episodes_show,
                getValue: (show) => show ? `${show.name} (${show.episodes} episodes)` : 'No data'
            },
            {
                icon: 'fas fa-clock',
                title: 'Most Watch Time',
                show: awards.most_watch_time_show,
                getValue: (show) => show ? `${show.name} (${show.watch_time_formatted})` : 'No data'
            },
            {
                icon: 'fas fa-eye-slash',
                title: 'Most Obscure',
                show: awards.most_obscure_show,
                getValue: (show) => show ? `${show.name} (${show.popularity.toFixed(1)} popularity)` : 'No data'
            }
        ];

        awardCards.forEach(award => {
            const card = document.createElement('div');
            card.className = 'award-card';
            
            // Add backdrop image if available
            const backdropStyle = award.show && award.show.backdrop_path 
                ? `background-image: linear-gradient(rgba(26, 32, 44, 0.8), rgba(26, 32, 44, 0.8)), url(${award.show.backdrop_path}); background-size: cover; background-position: center;`
                : '';
            
            card.innerHTML = `
                <div class="award-icon">
                    <i class="${award.icon}" aria-hidden="true"></i>
                </div>
                <div class="award-content">
                    <h5 class="award-title">${award.title}</h5>
                    <p class="award-value">${App.escapeHtml(award.getValue(award.show))}</p>
                </div>
            `;
            
            if (backdropStyle) {
                card.style.cssText += backdropStyle;
            }
            
            container.appendChild(card);
        });
    },

    // Display fun time conversions
    displayFunConversions(conversions) {
        const container = document.getElementById('timeConversions');
        container.innerHTML = '';

        if (!conversions || conversions.length === 0) {
            container.innerHTML = '<p style="text-align: center; color: #cbd5e0; padding: 2rem;">No conversion data available</p>';
            return;
        }

        conversions.forEach(conversion => {
            const card = document.createElement('div');
            card.className = 'conversion-card';
            card.innerHTML = `
                <div class="conversion-icon">
                    <i class="${conversion.icon}" aria-hidden="true"></i>
                </div>
                <div class="conversion-activity">${conversion.description}</div>
                <div class="conversion-value">${conversion.value} <span class="times-text">${conversion.times_text}</span></div>
            `;
            container.appendChild(card);
        });
    },

    // Display genre breakdown
    displayGenreBreakdown(genres) {
        const container = document.getElementById('genreBreakdown');
        container.innerHTML = '';

        if (Object.keys(genres).length === 0) {
            container.innerHTML = '<p class="text-center">No genre data available</p>';
            return;
        }

        // Sort genres by time spent
        const sortedGenres = Object.entries(genres).sort((a, b) => b[1] - a[1]);

        sortedGenres.forEach(([genre, minutes]) => {
            const div = document.createElement('div');
            div.className = 'genre-item';
            div.innerHTML = `
                <span class="genre-name">${genre}</span>
                <span class="genre-time">${this.formatTime(minutes)}</span>
            `;
            container.appendChild(div);
        });
    },

    // Display yearly breakdown
    displayYearlyBreakdown(years) {
        const container = document.getElementById('yearlyBreakdown');
        container.innerHTML = '';

        if (Object.keys(years).length === 0) {
            container.innerHTML = '<p class="text-center">No yearly data available</p>';
            return;
        }

        // Sort years
        const sortedYears = Object.entries(years).sort((a, b) => {
            if (a[0] === 'Unknown') return 1;
            if (b[0] === 'Unknown') return -1;
            return parseInt(b[0]) - parseInt(a[0]);
        });

        sortedYears.forEach(([year, minutes]) => {
            const div = document.createElement('div');
            div.className = 'yearly-item';
            div.innerHTML = `
                <span class="year-name">${year}</span>
                <span class="year-time">${this.formatTime(minutes)}</span>
            `;
            container.appendChild(div);
        });
    },

    // Format time (same as main app)
    formatTime(minutes) {
        const hours = Math.floor(minutes / 60);
        const remainingMinutes = minutes % 60;
        
        if (hours < 24) {
            return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
        }
        
        const days = Math.floor(hours / 24);
        const remainingHours = hours % 24;
        
        return remainingHours > 0 ? `${days}d ${remainingHours}h` : `${days}d`;
    },

    // Show custom tooltip
    showTooltip(event, tooltipId, content) {
        const tooltip = document.getElementById(tooltipId);
        if (tooltip) {
            tooltip.innerHTML = content;
            tooltip.style.opacity = '1';
            this.moveTooltip(event, tooltipId);
        }
    },

    // Hide custom tooltip
    hideTooltip(tooltipId) {
        const tooltip = document.getElementById(tooltipId);
        if (tooltip) {
            tooltip.style.opacity = '0';
        }
    },

    // Move tooltip with mouse (closer to pointer)
    moveTooltip(event, tooltipId) {
        const tooltip = document.getElementById(tooltipId);
        if (tooltip) {
            // Find the positioned container (the chart's relative positioned parent)
            const positionedContainer = tooltip.offsetParent || tooltip.parentElement;
            if (positionedContainer) {
                const rect = positionedContainer.getBoundingClientRect();
                const x = event.clientX - rect.left;
                const y = event.clientY - rect.top;
                
                // Position tooltip close to the mouse pointer
                tooltip.style.left = (x + 10) + 'px';  // Small offset to avoid covering cursor
                tooltip.style.top = (y - 30) + 'px';   // Position above the cursor
            }
        }
    },

    // Format time for hover tooltips (compact format: 28d 8h)
    formatTimeCompact(totalHours) {
        if (totalHours < 24) {
            return `${Math.round(totalHours)}h`;
        }
        
        const days = Math.floor(totalHours / 24);
        const remainingHours = Math.round(totalHours % 24);
        
        if (remainingHours === 0) {
            return `${days}d`;
        }
        
        return `${days}d ${remainingHours}h`;
    }
});
