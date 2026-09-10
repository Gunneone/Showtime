// Showtime - Plotly charts and their no-Plotly fallbacks
// Extends the StatsApp object defined in stats/core.js.

Object.assign(StatsApp, {
    // Create yearly line chart using Plotly
    createYearlyChart(yearlyData) {
        const chartDiv = document.getElementById('yearlyChart');
        
        if (typeof Plotly === 'undefined') {
            // Fallback to simple HTML chart
            this.createSimpleYearlyChart(yearlyData, chartDiv);
            return;
        }
        
        if (Object.keys(yearlyData).length === 0) {
            chartDiv.innerHTML = '<p style="text-align: center; color: #cbd5e0; padding: 2rem;">No yearly data available</p>';
            return;
        }

        // Sort years and convert to chart data
        const sortedYears = Object.entries(yearlyData)
            .filter(([year]) => year !== 'Unknown')
            .sort((a, b) => parseInt(a[0]) - parseInt(b[0]));

        const years = sortedYears.map(([year]) => year);
        const minutes = sortedYears.map(([, time]) => time);
        const hours = minutes.map(min => Math.round(min / 60 * 10) / 10);

        // Fill in missing years with zero data for continuous chart
        const allYears = [];
        if (years.length > 0) {
            const minYear = Math.min(...years.map(y => parseInt(y)));
            const maxYear = Math.max(...years.map(y => parseInt(y)));
            for (let year = minYear; year <= maxYear; year++) {
                allYears.push(year.toString());
            }
        }

        // Create data arrays with zeros for missing years
        const filledHours = allYears.map(year => {
            const index = years.indexOf(year);
            return index !== -1 ? hours[index] : 0;
        });

        const trace = {
            x: allYears,
            y: filledHours,
            type: 'bar',
            marker: {
                color: '#63b3ed',
                line: {
                    width: 0
                }
            },
            hovertemplate: '<b>%{x}</b><br>%{customdata}<extra></extra>',
            customdata: filledHours.map(h => this.formatTimeCompact(h))
        };

        const layout = {
            title: {
                text: '',
                font: { color: '#e2e8f0' }
            },
            xaxis: {
                title: '',
                color: '#e2e8f0',
                showgrid: false,
                showline: false,
                tickvals: allYears.length > 0 ? [allYears[0], allYears[allYears.length - 1]] : [],
                ticktext: allYears.length > 0 ? [allYears[0], allYears[allYears.length - 1]] : [],
                tickfont: { color: '#a0aec0' }
            },
            yaxis: {
                title: '',
                color: '#e2e8f0',
                showgrid: false,
                showline: false,
                showticklabels: false,
                tickfont: { color: '#9ca3af' }
            },
            plot_bgcolor: 'rgba(0, 0, 0, 0)',
            paper_bgcolor: 'rgba(0, 0, 0, 0)',
            font: { color: '#e2e8f0' },
            margin: { l: 60, r: 30, t: 30, b: 60 },
            bargap: allYears.length <= 3 ? 0.75 : 0.9 // Increased gap for better spacing
        };

        const config = {
            displayModeBar: false,
            staticPlot: false,
            displaylogo: false,
            responsive: true
        };

        Plotly.newPlot('yearlyChart', [trace], layout, config);
    },

    // Fallback simple yearly chart using CSS - Truly flexible version
    createSimpleYearlyChart(yearlyData, container) {
        if (Object.keys(yearlyData).length === 0) {
            container.innerHTML = '<p style="text-align: center; color: #cbd5e0; padding: 2rem;">No yearly data available</p>';
            return;
        }

        const sortedYears = Object.entries(yearlyData)
            .filter(([year]) => year !== 'Unknown')
            .sort((a, b) => parseInt(a[0]) - parseInt(b[0]));

        // Fill in missing years with zero data for continuous chart
        const allYearsData = [];
        if (sortedYears.length > 0) {
            const minYear = Math.min(...sortedYears.map(([year]) => parseInt(year)));
            const maxYear = Math.max(...sortedYears.map(([year]) => parseInt(year)));
            
            for (let year = minYear; year <= maxYear; year++) {
                const existingYear = sortedYears.find(([y]) => parseInt(y) === year);
                if (existingYear) {
                    allYearsData.push([year.toString(), existingYear[1]]);
                } else {
                    allYearsData.push([year.toString(), 0]);
                }
            }
        }

        const maxHours = Math.max(...allYearsData.map(([, minutes]) => minutes / 60));
        
        // Get first and last years for labels
        const firstYear = allYearsData.length > 0 ? allYearsData[0][0] : '';
        const lastYear = allYearsData.length > 0 ? allYearsData[allYearsData.length - 1][0] : '';
        
        // Create truly flexible chart that uses 100% width with no width constraints
        let chartHTML = `<div style="padding: 1rem; position: relative; width: 100%;">
            <div style="position: relative; display: flex; align-items: end; height: 200px; padding: 20px 0; width: 100%; gap: 2px;">`;
        
        // Add tooltip element
        chartHTML += '<div id="yearly-tooltip" style="position: absolute; background: rgba(26, 32, 44, 0.95); color: #e2e8f0; padding: 8px 12px; border-radius: 6px; font-size: 0.9rem; pointer-events: none; opacity: 0; transition: opacity 0.2s; z-index: 1000; border: 1px solid #63b3ed;"></div>';
        
        allYearsData.forEach(([year, minutes], index) => {
            const hours = Math.round(minutes / 60 * 10) / 10;
            const days = Math.round(hours / 24 * 10) / 10;
            const heightPixels = Math.max(4, (hours / maxHours) * 160); // 160px max height within 200px container
            
            chartHTML += `
                <div style="flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: flex-end; height: 100%;">
                    <div style="background: #63b3ed; width: 100%; height: ${heightPixels}px; border-radius: 4px 4px 0 0; transition: all 0.3s ease; cursor: pointer;" 
                         data-year="${year}" data-days="${days}" data-hours="${hours}"
                         onmouseover="this.style.backgroundColor='#4299e1'; StatsApp.showTooltip(event, 'yearly-tooltip', '${year}: ${StatsApp.formatTimeCompact(hours)}')"
                         onmouseout="this.style.backgroundColor='#63b3ed'; StatsApp.hideTooltip('yearly-tooltip')"
                         onmousemove="StatsApp.moveTooltip(event, 'yearly-tooltip')"></div>
                </div>
            `;
        });
        
        chartHTML += '</div>';
        
        // Add year labels positioned at chart edges (not tied to individual bars)
        if (firstYear && lastYear && firstYear !== lastYear) {
            chartHTML += `
                <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 8px; padding: 0 20px;">
                    <div style="color: #a0aec0; font-size: 0.8rem;">${firstYear}</div>
                    <div style="color: #a0aec0; font-size: 0.8rem;">${lastYear}</div>
                </div>
            `;
        } else if (firstYear) {
            chartHTML += `
                <div style="display: flex; justify-content: center; align-items: center; margin-top: 8px; padding: 0 20px;">
                    <div style="color: #a0aec0; font-size: 0.8rem;">${firstYear}</div>
                </div>
            `;
        }
        
        chartHTML += '</div>';
        
        container.innerHTML = chartHTML;
    },

    // Helper function to calculate text width dynamically
    calculateTextWidth(text, fontSize = '14px', fontFamily = 'system-ui, -apple-system, sans-serif') {
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        context.font = `${fontSize} ${fontFamily}`;
        return context.measureText(text).width;
    },

    // Calculate dynamic left margin based on longest label
    calculateDynamicMargin(labels) {
        const maxWidth = Math.max(...labels.map(label => this.calculateTextWidth(label)));
        // Add 20px padding to the longest label width
        return Math.max(maxWidth + 20, 60); // Minimum 60px margin
    },

    // Create top 3 genres bar chart
    createTopGenresChart(genreData) {
        const chartDiv = document.getElementById('topGenresChart');
        
        if (typeof Plotly === 'undefined') {
            // Fallback to simple HTML chart
            this.createSimpleGenresChart(genreData, chartDiv);
            return;
        }
        
        if (Object.keys(genreData).length === 0) {
            chartDiv.innerHTML = '<p style="text-align: center; color: #cbd5e0; padding: 2rem;">No genre data available</p>';
            return;
        }

        // Get top 10 genres
        const sortedGenres = Object.entries(genreData)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10);

        const genres = sortedGenres.map(([genre]) => genre);
        const minutes = sortedGenres.map(([, time]) => time);
        const hours = minutes.map(min => Math.round(min / 60 * 10) / 10);

        // Calculate dynamic left margin based on longest genre name
        const dynamicMargin = this.calculateDynamicMargin(genres);

        const trace = {
            x: hours,
            y: genres,
            type: 'bar',
            orientation: 'h',
            marker: {
                color: '#63b3ed',
                line: {
                    width: 0
                }
            },
            hovertemplate: '<b>%{y}</b><br>%{customdata}<extra></extra>',
            customdata: hours.map(h => this.formatTimeCompact(h))
        };

        const layout = {
            title: {
                text: '',
                font: { color: '#e2e8f0' }
            },
            xaxis: {
                title: '',
                color: '#e2e8f0',
                showgrid: false,
                showline: false,
                showticklabels: false,
                tickfont: { color: '#a0aec0' }
            },
            yaxis: {
                title: '',
                color: '#e2e8f0',
                showgrid: false,
                showline: false,
                tickfont: { color: '#9ca3af' },
                side: 'left'
            },
            plot_bgcolor: 'rgba(0, 0, 0, 0)',
            paper_bgcolor: 'rgba(0, 0, 0, 0)',
            font: { color: '#e2e8f0' },
            margin: { l: dynamicMargin, r: 30, t: 30, b: 40 }
        };

        const config = {
            displayModeBar: false,
            staticPlot: false,
            displaylogo: false,
            responsive: true
        };

        Plotly.newPlot('topGenresChart', [trace], layout, config);
    },

    // Create top 10 networks horizontal bar chart
    createTopNetworksChart(networkData) {
        const chartDiv = document.getElementById('topNetworksChart');
        
        if (typeof Plotly === 'undefined') {
            // Fallback to simple HTML chart
            this.createSimpleNetworksChart(networkData, chartDiv);
            return;
        }
        
        if (Object.keys(networkData).length === 0) {
            chartDiv.innerHTML = '<p style="text-align: center; color: #cbd5e0; padding: 2rem;">No network data available</p>';
            return;
        }

        // Get top 10 networks
        const sortedNetworks = Object.entries(networkData)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10);

        const networks = sortedNetworks.map(([network]) => network);
        const minutes = sortedNetworks.map(([, time]) => time);
        const hours = minutes.map(min => Math.round(min / 60 * 10) / 10);

        // Calculate dynamic left margin based on longest network name
        const dynamicMargin = this.calculateDynamicMargin(networks);

        const trace = {
            x: hours,
            y: networks,
            type: 'bar',
            orientation: 'h',
            marker: {
                color: '#63b3ed',
                line: {
                    width: 0
                }
            },
            hovertemplate: '<b>%{y}</b><br>%{customdata}<extra></extra>',
            customdata: hours.map(h => this.formatTimeCompact(h))
        };

        const layout = {
            title: {
                text: '',
                font: { color: '#e2e8f0' }
            },
            xaxis: {
                title: '',
                color: '#e2e8f0',
                showgrid: false,
                showline: false,
                showticklabels: false,
                tickfont: { color: '#a0aec0' }
            },
            yaxis: {
                title: '',
                color: '#e2e8f0',
                showgrid: false,
                showline: false,
                tickfont: { color: '#9ca3af' },
                side: 'left'
            },
            plot_bgcolor: 'rgba(0, 0, 0, 0)',
            paper_bgcolor: 'rgba(0, 0, 0, 0)',
            font: { color: '#e2e8f0' },
            margin: { l: dynamicMargin, r: 30, t: 30, b: 40 }
        };

        const config = {
            displayModeBar: false,
            staticPlot: false,
            displaylogo: false,
            responsive: true
        };

        Plotly.newPlot('topNetworksChart', [trace], layout, config);
    },

    // Fallback simple networks chart using CSS
    createSimpleNetworksChart(networkData, container) {
        if (Object.keys(networkData).length === 0) {
            container.innerHTML = '<p style="text-align: center; color: #cbd5e0; padding: 2rem;">No network data available</p>';
            return;
        }

        // Get top 10 networks
        const sortedNetworks = Object.entries(networkData)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10);

        if (sortedNetworks.length === 0) {
            container.innerHTML = '<p style="text-align: center; color: #cbd5e0; padding: 2rem;">No network data available</p>';
            return;
        }

        const networks = sortedNetworks.map(([network]) => network);
        const maxTime = Math.max(...sortedNetworks.map(([, time]) => time));
        
        // Calculate dynamic width for labels based on longest network name
        const maxLabelWidth = Math.max(...networks.map(network => this.calculateTextWidth(network, '14.4px')));
        const labelWidth = Math.max(maxLabelWidth + 12, 80); // Minimum 80px, add 12px padding
        
        let chartHTML = '<div style="padding: 1rem; position: relative;">';
        
        // Add tooltip element
        chartHTML += '<div id="network-tooltip" style="position: absolute; background: rgba(26, 32, 44, 0.95); color: #e2e8f0; padding: 8px 12px; border-radius: 6px; font-size: 0.9rem; pointer-events: none; opacity: 0; transition: opacity 0.2s; z-index: 1000; border: 1px solid #63b3ed;"></div>';
        
        chartHTML += '<div style="display: flex; flex-direction: column; gap: 8px;">';
        
        sortedNetworks.forEach(([network, minutes]) => {
            const hours = Math.round(minutes / 60 * 10) / 10;
            const percentage = (minutes / maxTime) * 100;
            
            chartHTML += `
                <div style="display: flex; align-items: center; gap: 12px;">
                    <div style="min-width: ${labelWidth}px; text-align: left; color: #a0aec0; font-size: 0.9rem;">${network}</div>
                    <div style="flex: 1; background: transparent; border-radius: 4px; height: 24px; position: relative;">
                        <div style="background: #63b3ed; height: 100%; width: ${percentage}%; border-radius: 4px; transition: width 0.8s ease; cursor: pointer;"
                             onmouseover="this.style.backgroundColor='#4299e1'; StatsApp.showTooltip(event, 'network-tooltip', '${network}: ${StatsApp.formatTimeCompact(hours)}')"
                             onmouseout="this.style.backgroundColor='#63b3ed'; StatsApp.hideTooltip('network-tooltip')"
                             onmousemove="StatsApp.moveTooltip(event, 'network-tooltip')"></div>
                    </div>
                </div>
            `;
        });
        
        chartHTML += '</div></div>';
        
        container.innerHTML = chartHTML;
    },

    // Fallback simple genres chart using CSS - Horizontal bars to match network chart
    createSimpleGenresChart(genreData, container) {
        if (Object.keys(genreData).length === 0) {
            container.innerHTML = '<p style="text-align: center; color: #cbd5e0; padding: 2rem;">No genre data available</p>';
            return;
        }

        // Get top 10 genres to match the Plotly version
        const sortedGenres = Object.entries(genreData)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10);

        if (sortedGenres.length === 0) {
            container.innerHTML = '<p style="text-align: center; color: #cbd5e0; padding: 2rem;">No genre data available</p>';
            return;
        }

        const genres = sortedGenres.map(([genre]) => genre);
        const maxTime = Math.max(...sortedGenres.map(([, time]) => time));
        
        // Calculate dynamic width for labels based on longest genre name
        const maxLabelWidth = Math.max(...genres.map(genre => this.calculateTextWidth(genre, '14.4px')));
        const labelWidth = Math.max(maxLabelWidth + 12, 80); // Minimum 80px, add 12px padding
        
        let chartHTML = '<div style="padding: 1rem; position: relative;">';
        
        // Add tooltip element
        chartHTML += '<div id="genre-tooltip" style="position: absolute; background: rgba(26, 32, 44, 0.95); color: #e2e8f0; padding: 8px 12px; border-radius: 6px; font-size: 0.9rem; pointer-events: none; opacity: 0; transition: opacity 0.2s; z-index: 1000; border: 1px solid #63b3ed;"></div>';
        
        chartHTML += '<div style="display: flex; flex-direction: column; gap: 8px;">';
        
        sortedGenres.forEach(([genre, minutes]) => {
            const hours = Math.round(minutes / 60 * 10) / 10;
            const percentage = (minutes / maxTime) * 100;
            
            chartHTML += `
                <div style="display: flex; align-items: center; gap: 12px;">
                    <div style="min-width: ${labelWidth}px; text-align: left; color: #a0aec0; font-size: 0.9rem;">${genre}</div>
                    <div style="flex: 1; background: transparent; border-radius: 4px; height: 24px; position: relative;">
                        <div style="background: #63b3ed; height: 100%; width: ${percentage}%; border-radius: 4px; transition: width 0.8s ease; cursor: pointer;"
                             onmouseover="this.style.backgroundColor='#4299e1'; StatsApp.showTooltip(event, 'genre-tooltip', '${genre}: ${StatsApp.formatTimeCompact(hours)}')"
                             onmouseout="this.style.backgroundColor='#63b3ed'; StatsApp.hideTooltip('genre-tooltip')"
                             onmousemove="StatsApp.moveTooltip(event, 'genre-tooltip')"></div>
                    </div>
                </div>
            `;
        });
        
        chartHTML += '</div></div>';
        
        container.innerHTML = chartHTML;
    },
});
