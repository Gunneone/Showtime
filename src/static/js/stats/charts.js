// Showtime - stats page bar charts
// Extends the StatsApp object defined in stats/core.js. Plain HTML bars styled
// in css/12-charts.css with design-system tokens, so they follow light and
// dark mode on their own - no redraw on g1:themechange needed.

Object.assign(StatsApp, {
    // Placeholder text inside a chart slot
    chartMessage(container, text) {
        container.innerHTML = `<p class="chart-message">${App.escapeHtml(text)}</p>`;
    },

    // Watch time per release year, one bar per year (gaps included)
    createYearlyChart(yearlyData) {
        const container = document.getElementById('yearlyChart');
        const years = Object.entries(yearlyData || {})
            .map(([year, minutes]) => [parseInt(year, 10), minutes])
            .filter(([year]) => !Number.isNaN(year));

        if (years.length === 0) {
            this.chartMessage(container, 'No release years to chart yet.');
            return;
        }

        const byYear = new Map(years);
        const first = Math.min(...years.map(([year]) => year));
        const last = Math.max(...years.map(([year]) => year));
        const allYears = [];
        for (let year = first; year <= last; year++) {
            allYears.push([year, byYear.get(year) || 0]);
        }
        const peak = Math.max(...allYears.map(([, minutes]) => minutes)) || 1;

        const bars = allYears.map(([year, minutes]) => {
            const label = `${year}: ${this.formatTimeCompact(minutes / 60)}`;
            // Keep a sliver visible for tiny values; empty years stay empty
            const height = minutes > 0 ? Math.max(2, (minutes / peak) * 100) : 0;
            return `<span class="year-bar" style="--h: ${height.toFixed(1)}%" data-tooltip="${label}"></span>`;
        }).join('');

        container.innerHTML = `
            <div class="year-chart" role="img" aria-label="Watch time by release year, ${first} to ${last}">
                <div class="chart-tooltip" aria-hidden="true"></div>
                <div class="year-bars">${bars}</div>
                <div class="year-axis"><span>${first}</span>${last !== first ? `<span>${last}</span>` : ''}</div>
            </div>
        `;
        this.bindChartTooltip(container);
    },

    createTopGenresChart(genreData) {
        this.createRankChart(document.getElementById('topGenresChart'), genreData, 'No genres to chart yet.');
    },

    createTopNetworksChart(networkData) {
        this.createRankChart(document.getElementById('topNetworksChart'), networkData, 'No networks to chart yet.');
    },

    // Top ten entries as labelled horizontal bars with their time alongside
    createRankChart(container, data, emptyText) {
        const rows = Object.entries(data || {})
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10);

        if (rows.length === 0) {
            this.chartMessage(container, emptyText);
            return;
        }

        const peak = rows[0][1] || 1;
        container.innerHTML = `
            <div class="rank-chart">
                ${rows.map(([name, minutes]) => {
                    const safeName = App.escapeHtml(name);
                    return `
                        <span class="rank-label" title="${safeName}">${safeName}</span>
                        <span class="rank-track"><span class="rank-fill" style="--w: ${((minutes / peak) * 100).toFixed(1)}%"></span></span>
                        <span class="rank-value">${this.formatTimeCompact(minutes / 60)}</span>
                    `;
                }).join('')}
            </div>
        `;
    },

    // One delegated tooltip per chart for bars carrying data-tooltip
    bindChartTooltip(container) {
        const tooltip = container.querySelector('.chart-tooltip');
        const chart = tooltip && tooltip.parentElement;
        if (!chart) return;

        const place = (event) => {
            const rect = chart.getBoundingClientRect();
            tooltip.style.left = `${event.clientX - rect.left + 10}px`;
            tooltip.style.top = `${event.clientY - rect.top - 36}px`;
        };

        chart.addEventListener('mouseover', (event) => {
            const bar = event.target.closest('[data-tooltip]');
            if (!bar) return;
            tooltip.textContent = bar.dataset.tooltip;
            tooltip.classList.add('visible');
            place(event);
        });
        chart.addEventListener('mousemove', (event) => {
            if (event.target.closest('[data-tooltip]')) place(event);
        });
        chart.addEventListener('mouseout', (event) => {
            if (event.target.closest('[data-tooltip]')) tooltip.classList.remove('visible');
        });
    },
});
