// Showtime - awards, conversions, breakdown lists, time formatting
// Extends the StatsApp object defined in stats/core.js.

Object.assign(StatsApp, {
    // Display awards
    displayAwards(awards) {
        const container = document.getElementById('awardsSection');
        container.innerHTML = '';

        if (!awards) {
            this.chartMessage(container, 'No awards yet.');
            return;
        }

        const awardCards = [
            {
                icon: 'calendar',
                title: 'Oldest show',
                show: awards.oldest_show,
                getValue: (show) => show ? `${show.name} (${show.year})` : 'No data'
            },
            {
                icon: 'list-numbers',
                title: 'Most episodes',
                show: awards.most_episodes_show,
                getValue: (show) => show ? `${show.name} (${show.episodes} episodes)` : 'No data'
            },
            {
                icon: 'clock',
                title: 'Most watch time',
                show: awards.most_watch_time_show,
                getValue: (show) => show ? `${show.name} (${show.watch_time_formatted})` : 'No data'
            },
            {
                icon: 'eye-off',
                title: 'Most obscure',
                show: awards.most_obscure_show,
                getValue: (show) => show ? `${show.name} (${show.popularity.toFixed(1)} popularity)` : 'No data'
            }
        ];

        awardCards.forEach(award => {
            const card = document.createElement('div');
            card.className = 'award-card';

            card.innerHTML = `
                <div class="award-icon">
                    ${App.icon(award.icon)}
                </div>
                <div class="award-content">
                    <span class="g1-badge g1-badge--primary award-title">${award.title}</span>
                    <p class="award-value">${App.escapeHtml(award.getValue(award.show))}</p>
                </div>
            `;

            // The show's backdrop behind a veil of the card colour, so the
            // text stays readable in light and dark mode
            if (award.show && award.show.backdrop_path) {
                card.classList.add('has-backdrop');
                card.style.setProperty('--backdrop', `url("${encodeURI(award.show.backdrop_path)}")`);
            }

            container.appendChild(card);
        });
    },

    // Display fun time conversions
    displayFunConversions(conversions) {
        const container = document.getElementById('timeConversions');
        container.innerHTML = '';

        if (!conversions || conversions.length === 0) {
            this.chartMessage(container, 'Nothing to compare yet.');
            return;
        }

        conversions.forEach(conversion => {
            const card = document.createElement('div');
            card.className = 'conversion-card';
            card.innerHTML = `
                <div class="conversion-icon">
                    ${App.icon(conversion.icon)}
                </div>
                <div class="conversion-activity">${App.escapeHtml(conversion.description)}</div>
                <div class="conversion-value">${App.escapeHtml(conversion.value)} <span class="times-text">${App.escapeHtml(conversion.times_text)}</span></div>
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
