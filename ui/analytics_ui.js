/**
 * AION Journal OS - Analytics Page
 */

const AionAnalyticsUI = (function () {
    'use strict';

    let equityChart = null;
    let rrChart = null;
    let psychChart = null;
    let timeChart = null;

    async function render() {
        const container = document.getElementById('page-analytics');
        container.innerHTML = '';
        const skel = document.createElement('div');
        skel.className = 'skeleton h-64 mb-4';

        container.appendChild(skel.cloneNode(true));
        container.appendChild(skel.cloneNode(true));
        container.appendChild(skel.cloneNode(true));

        try {
            const [tradesRes, accountsRes, violationsRes] = await Promise.all([
                AionAPI.loadTrades(), AionAPI.loadAccounts(), AionAPI.loadRuleViolations()
            ]);

            const trades = tradesRes.exists ? tradesRes.content.trades || [] : [];
            const accounts = accountsRes.exists ? accountsRes.content.accounts || [] : [];
            const violations = violationsRes.exists ? violationsRes.content.violations || [] : [];

            const primaryAccount = accounts[0] || { starting_balance: 10000 };
            const summary = AionAnalytics.getPerformanceSummary(trades, primaryAccount.starting_balance);
            const equityCurve = AionAnalytics.calculateEquityCurve(trades, primaryAccount.starting_balance);
            const rrDist = AionAnalytics.calculateRRDistribution(trades);
            const bySetup = AionAnalytics.calculateWinRateByGroup(trades, 'setup_id');
            const bySession = AionAnalytics.calculateWinRateByGroup(trades, 'session');
            const byMarket = AionAnalytics.calculateWinRateByGroup(trades, 'market_type');
            const psychometrics = AionAnalytics.calculatePsychometrics(trades);
            const violationCounts = AionAnalytics.countViolationsByRule(violations);
            const timeStats = AionAnalytics.calculateTimeStats(trades);

            container.innerHTML = ''; // Clear skeleton

            container.appendChild(createElement('h2', 'text-2xl font-bold mb-6', 'Analytics'));
            container.appendChild(renderSummaryCards(summary));

            const chartsGrid = createElement('div', 'grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6');
            chartsGrid.appendChild(renderChartCard('Equity Curve', 'equity-chart'));
            chartsGrid.appendChild(renderChartCard('RR Distribution', 'rr-chart'));
            container.appendChild(chartsGrid);

            container.appendChild(renderRiskAnalysis(summary));

            const timeContainer = renderTimeAnalysis(timeStats);
            if (timeContainer) container.appendChild(timeContainer);

            container.appendChild(renderPsychometrics());

            const tablesGrid = createElement('div', 'grid grid-cols-1 md:grid-cols-3 gap-6 mb-6');
            tablesGrid.appendChild(renderWinRateTable('By Setup', bySetup));
            tablesGrid.appendChild(renderWinRateTable('By Session', bySession));
            tablesGrid.appendChild(renderWinRateTable('By Market', byMarket));
            container.appendChild(tablesGrid);

            if (violations.length > 0) {
                container.appendChild(renderViolationHeatmap(violationCounts));
            }

            container.appendChild(renderInvalidRatio(summary));

            setTimeout(() => {
                initEquityChart(equityCurve);
                initRRChart(rrDist);
                initPsychChart(psychometrics);
                if (timeStats) initTimeChart(timeStats.buckets);
            }, 100);

        } catch (e) {
            container.innerHTML = '';
            const banner = document.createElement('div');
            banner.className = 'alert-banner danger';
            banner.textContent = `Failed to load analytics: ${e.message}`;
            container.appendChild(banner);
        }
    }

    function createElement(tag, className, text) {
        const el = document.createElement(tag);
        if (className) el.className = className;
        if (text) el.textContent = text;
        return el;
    }

    function renderSummaryCards(summary) {
        const grid = createElement('div', 'grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-6');

        const addCard = (label, val, valClass) => {
            const card = createElement('div', 'aion-card aion-card-sm');
            const inner = createElement('div', 'metric-card');
            inner.appendChild(createElement('span', 'metric-label', label));
            inner.appendChild(createElement('span', `metric-value text-lg ${valClass || ''}`, val));
            card.appendChild(inner);
            grid.appendChild(card);
        };

        addCard('Total Trades', summary.total);
        addCard('Win Rate', `${summary.winRate}%`);
        addCard('Profit Factor', summary.profitFactor);
        addCard('Expectancy', `${summary.expectancy}R`);
        addCard('Avg Win', `${summary.avgWinRR}R`, 'positive');
        addCard('Avg Loss', `${summary.avgLossRR}R`, 'negative');

        return grid;
    }

    function renderChartCard(title, id) {
        const card = createElement('div', 'aion-card');
        card.appendChild(createElement('h3', 'section-title mb-4', title));
        const chartDiv = createElement('div', 'chart-container');
        const canvas = document.createElement('canvas');
        canvas.id = id;
        chartDiv.appendChild(canvas);
        card.appendChild(chartDiv);
        return card;
    }

    function renderWinRateTable(title, data) {
        const card = createElement('div', 'aion-card');
        card.appendChild(createElement('h3', 'section-title mb-4', title));

        const entries = Object.entries(data);
        if (entries.length === 0) {
            card.appendChild(createElement('p', 'text-sm text-aion-muted', 'No data'));
            return card;
        }

        const table = createElement('table', 'aion-table');
        const thead = createElement('thead');
        const tr = createElement('tr');
        tr.appendChild(createElement('th', '', 'Name'));
        tr.appendChild(createElement('th', 'text-center', 'Trades'));
        tr.appendChild(createElement('th', 'text-center', 'Win %'));
        thead.appendChild(tr);
        table.appendChild(thead);

        const tbody = createElement('tbody');
        entries.forEach(([key, stats]) => {
            const row = createElement('tr');
            row.appendChild(createElement('td', 'text-sm', key.replace(/_/g, ' ')));
            row.appendChild(createElement('td', 'text-center', stats.total));
            const winClass = stats.winRate >= 50 ? 'text-green-400' : 'text-red-400';
            row.appendChild(createElement('td', `text-center ${winClass}`, `${stats.winRate}%`));
            tbody.appendChild(row);
        });

        table.appendChild(tbody);
        card.appendChild(table);
        return card;
    }

    function renderPsychometrics() {
        const grid = createElement('div', 'grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6');

        // Radar Chart Card
        grid.appendChild(renderChartCard('Emotional Performance (Win Rate %)', 'psych-chart'));

        // Insights Card
        const insights = createElement('div', 'aion-card');
        insights.appendChild(createElement('h3', 'section-title mb-4', 'Psychology Insights'));
        const ul = createElement('ul', 'list-disc list-inside text-sm text-aion-muted space-y-2');



        // Re-implementing safely without InnerHTML for the list items
        const li1 = document.createElement('li');
        li1.appendChild(document.createTextNode('High win rates in '));
        li1.appendChild(createElement('strong', '', 'CALM'));
        li1.appendChild(document.createTextNode(' state suggest discipline.'));
        ul.appendChild(li1);

        const li2 = document.createElement('li');
        li2.appendChild(document.createTextNode('Low win rates in '));
        li2.appendChild(createElement('strong', '', 'FRUSTRATED'));
        li2.appendChild(document.createTextNode(' / '));
        li2.appendChild(createElement('strong', '', 'ANXIOUS'));
        li2.appendChild(document.createTextNode(' states indicate tilt.'));
        ul.appendChild(li2);

        const li3 = document.createElement('li');
        li3.appendChild(document.createTextNode('Monitor '));
        li3.appendChild(createElement('strong', '', 'CONFIDENT'));
        li3.appendChild(document.createTextNode(' vs '));
        li3.appendChild(createElement('strong', '', 'EUPHORIC'));
        li3.appendChild(document.createTextNode(' - overconfidence kills.'));
        ul.appendChild(li3);

        insights.appendChild(ul);
        grid.appendChild(insights);

        return grid;
    }

    function initPsychChart(data) {
        const ctx = document.getElementById('psych-chart')?.getContext('2d');
        if (!ctx) return;
        if (psychChart) psychChart.destroy();

        const labels = Object.keys(data);
        const winRates = labels.map(l => data[l].winRate);

        psychChart = new Chart(ctx, {
            type: 'radar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Win Rate %',
                    data: winRates,
                    fill: true,
                    backgroundColor: 'rgba(99, 102, 241, 0.2)',
                    borderColor: '#6366f1',
                    pointBackgroundColor: '#6366f1',
                    pointBorderColor: '#fff',
                    pointHoverBackgroundColor: '#fff',
                    pointHoverBorderColor: '#6366f1'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    r: {
                        angleLines: { color: '#1e1e2e' },
                        grid: { color: '#1e1e2e' },
                        pointLabels: { color: '#94a3b8', font: { size: 12 } },
                        ticks: { backdropColor: 'transparent', color: '#64748b', z: 1 },
                        suggestedMin: 0,
                        suggestedMax: 100
                    }
                },
                plugins: { legend: { display: false } }
            }
        });
    }

    function renderViolationHeatmap(counts) {
        const card = createElement('div', 'aion-card mb-6');
        card.appendChild(createElement('h3', 'section-title mb-4', 'Rule Violation Heatmap'));

        const entries = Object.entries(counts).sort((a, b) => b[1] - a[1]);
        const max = Math.max(...entries.map(e => e[1]));

        const grid = createElement('div', 'grid grid-cols-2 md:grid-cols-4 gap-4');
        entries.forEach(([rule, count]) => {
            const intensity = Math.round((count / max) * 100);
            const item = createElement('div', 'p-3 rounded-lg');
            item.style.background = `rgba(239, 68, 68, ${intensity / 100 * 0.5})`;

            item.appendChild(createElement('div', 'font-medium', rule));
            item.appendChild(createElement('div', 'text-2xl font-bold', count));
            grid.appendChild(item);
        });

        card.appendChild(grid);
        return card;
    }

    function renderInvalidRatio(summary) {
        const total = summary.total + summary.invalidCount + summary.incompleteCount;
        const validPct = total > 0 ? Math.round((summary.total / total) * 100) : 100;
        const invalidPct = total > 0 ? Math.round((summary.invalidCount / total) * 100) : 0;
        const incompletePct = total > 0 ? Math.round((summary.incompleteCount / total) * 100) : 0;

        const card = createElement('div', 'aion-card');
        card.appendChild(createElement('h3', 'section-title mb-4', 'Trade Quality'));

        const bar = createElement('div', 'flex gap-2 h-4 rounded-full overflow-hidden mb-4');

        const createSegment = (colorClass, width) => {
            const seg = document.createElement('div');
            seg.className = colorClass;
            seg.style.width = width + '%';
            return seg;
        };

        bar.appendChild(createSegment('bg-green-500', validPct));
        bar.appendChild(createSegment('bg-red-500', invalidPct));
        bar.appendChild(createSegment('bg-yellow-500', incompletePct));
        card.appendChild(bar);

        const legend = createElement('div', 'flex justify-between text-sm');
        legend.appendChild(createElement('span', 'text-green-400', `Valid: ${summary.total}`));
        legend.appendChild(createElement('span', 'text-red-400', `Invalid: ${summary.invalidCount}`));
        legend.appendChild(createElement('span', 'text-yellow-400', `Incomplete: ${summary.incompleteCount}`));
        card.appendChild(legend);

        return card;
    }

    function initEquityChart(data) {
        const ctx = document.getElementById('equity-chart')?.getContext('2d');
        if (!ctx) return;
        if (equityChart) equityChart.destroy();

        equityChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: data.map((d, i) => i === 0 ? 'Start' : d.trade || `Trade ${i}`),
                datasets: [{
                    label: 'Equity',
                    data: data.map(d => d.balance),
                    borderColor: '#6366f1',
                    backgroundColor: 'rgba(99, 102, 241, 0.1)',
                    fill: true,
                    tension: 0.3
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                    x: { grid: { color: '#1e1e2e' }, ticks: { color: '#64748b' } },
                    y: { grid: { color: '#1e1e2e' }, ticks: { color: '#64748b' } }
                }
            }
        });
    }

    function initRRChart(data) {
        const ctx = document.getElementById('rr-chart')?.getContext('2d');
        if (!ctx) return;
        if (rrChart) rrChart.destroy();

        const labels = Object.keys(data);
        const values = Object.values(data);
        const colors = labels.map(l => l.includes('-') || l.startsWith('<-') ? '#ef4444' : '#22c55e');

        rrChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels,
                datasets: [{ label: 'Trades', data: values, backgroundColor: colors }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                    x: { grid: { color: '#1e1e2e' }, ticks: { color: '#64748b' } },
                    y: { grid: { color: '#1e1e2e' }, ticks: { color: '#64748b' } }
                }
            }
        });
    }

    function renderRiskAnalysis(summary) {
        const card = createElement('div', 'aion-card mb-6');
        card.appendChild(createElement('h3', 'section-title mb-4', 'Institutional Risk Analysis'));

        const grid = createElement('div', 'grid grid-cols-1 md:grid-cols-4 gap-4');

        const createMetric = (label, value, subtext, valueClass) => {
            const div = createElement('div', 'metric-card bg-aion-bg p-4 rounded-lg');
            div.appendChild(createElement('span', 'text-xs text-aion-muted uppercase tracking-wider', label));
            div.appendChild(createElement('div', `text-2xl font-bold mt-1 ${valueClass || ''}`, value));
            div.appendChild(createElement('span', 'text-xs text-aion-muted', subtext));
            return div;
        };

        const sqnClass = summary.sqn > 2.5 ? 'text-green-400' : summary.sqn > 1.5 ? 'text-yellow-400' : 'text-aion-muted';

        grid.appendChild(createMetric('Sharpe Ratio', summary.sharpe, 'Risk-Adjusted Return'));
        grid.appendChild(createMetric('Sortino Ratio', summary.sortino, 'Downside Protection'));
        grid.appendChild(createMetric('SQN Score', summary.sqn, 'System Quality', sqnClass));
        grid.appendChild(createMetric('CAGR (Proj.)', `${summary.cagr}%`, 'Annual Growth'));

        card.appendChild(grid);
        return card;
    }

    function renderTimeAnalysis(stats) {
        if (!stats) return null;

        const formatTime = (hrs) => hrs < 1 ? `${Math.round(hrs * 60)}m` : `${Math.round(hrs * 10) / 10}h`;

        const grid = createElement('div', 'grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6');

        // Metrics Card
        const metricsCard = createElement('div', 'aion-card col-span-1');
        metricsCard.appendChild(createElement('h3', 'section-title mb-4', 'Time Efficiency'));
        const space = createElement('div', 'space-y-4');

        const createRow = (label, val, valClass, last = false) => {
            const row = createElement('div', `metric-row flex justify-between items-center ${!last ? 'border-b border-aion-border pb-2' : 'pt-2'}`);
            row.appendChild(createElement('span', 'text-aion-muted', label));
            row.appendChild(createElement('span', `font-bold ${valClass || ''}`, val));
            return row;
        };

        space.appendChild(createRow('Avg Hold Time', formatTime(stats.avgHoldTime)));
        space.appendChild(createRow('Winners Hold', formatTime(stats.avgWinHold), 'text-green-400'));
        space.appendChild(createRow('Losers Hold', formatTime(stats.avgLossHold), 'text-red-400'));
        space.appendChild(createRow('PnL per Hour', `$${Math.round(stats.pnlPerHour * 100) / 100}`, 'text-aion-accent', true));

        metricsCard.appendChild(space);
        grid.appendChild(metricsCard);

        // Chart Card
        grid.appendChild(renderChartCard('Duration Distribution', 'time-chart'));

        return grid;
    }

    function initTimeChart(buckets) {
        const ctx = document.getElementById('time-chart')?.getContext('2d');
        if (!ctx) return;

        if (timeChart) timeChart.destroy();

        timeChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: Object.keys(buckets),
                datasets: [{
                    label: 'Frequency',
                    data: Object.values(buckets),
                    backgroundColor: 'rgba(56, 189, 248, 0.6)',
                    borderColor: '#38bdf8',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                    x: { grid: { color: '#1e1e2e' }, ticks: { color: '#64748b' } },
                    y: { grid: { color: '#1e1e2e' }, ticks: { color: '#64748b' } }
                }
            }
        });
    }

    return { render };
})();
