/**
 * AION Journal OS - Analytics Page
 */

const AionAnalyticsUI = (function () {
    'use strict';

    let equityChart = null;
    let rrChart = null;

    async function render() {
        const container = document.getElementById('page-analytics');
        container.innerHTML = '<div class="skeleton h-64 mb-4"></div>'.repeat(3);

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
            const violationCounts = AionAnalytics.countViolationsByRule(violations);

            container.innerHTML = `
                <h2 class="text-2xl font-bold mb-6">Analytics</h2>
                ${renderSummaryCards(summary)}
                <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                    ${renderEquityChart()}
                    ${renderRRDistribution()}
                </div>
                <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                    ${renderWinRateTable('By Setup', bySetup)}
                    ${renderWinRateTable('By Session', bySession)}
                    ${renderWinRateTable('By Market', byMarket)}
                </div>
                ${violations.length > 0 ? renderViolationHeatmap(violationCounts) : ''}
                ${renderInvalidRatio(summary)}
            `;

            setTimeout(() => {
                initEquityChart(equityCurve);
                initRRChart(rrDist);
            }, 100);
        } catch (e) {
            container.innerHTML = `<div class="alert-banner danger">Failed to load analytics: ${e.message}</div>`;
        }
    }

    function renderSummaryCards(summary) {
        return `
            <div class="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-6">
                <div class="aion-card aion-card-sm"><div class="metric-card"><span class="metric-label">Total Trades</span><span class="metric-value text-lg">${summary.total}</span></div></div>
                <div class="aion-card aion-card-sm"><div class="metric-card"><span class="metric-label">Win Rate</span><span class="metric-value text-lg">${summary.winRate}%</span></div></div>
                <div class="aion-card aion-card-sm"><div class="metric-card"><span class="metric-label">Profit Factor</span><span class="metric-value text-lg">${summary.profitFactor}</span></div></div>
                <div class="aion-card aion-card-sm"><div class="metric-card"><span class="metric-label">Expectancy</span><span class="metric-value text-lg">${summary.expectancy}R</span></div></div>
                <div class="aion-card aion-card-sm"><div class="metric-card"><span class="metric-label">Avg Win</span><span class="metric-value text-lg positive">${summary.avgWinRR}R</span></div></div>
                <div class="aion-card aion-card-sm"><div class="metric-card"><span class="metric-label">Avg Loss</span><span class="metric-value text-lg negative">${summary.avgLossRR}R</span></div></div>
            </div>
        `;
    }

    function renderEquityChart() {
        return `
            <div class="aion-card">
                <h3 class="section-title mb-4">Equity Curve</h3>
                <div class="chart-container"><canvas id="equity-chart"></canvas></div>
            </div>
        `;
    }

    function renderRRDistribution() {
        return `
            <div class="aion-card">
                <h3 class="section-title mb-4">RR Distribution</h3>
                <div class="chart-container"><canvas id="rr-chart"></canvas></div>
            </div>
        `;
    }

    function renderWinRateTable(title, data) {
        const entries = Object.entries(data);
        if (entries.length === 0) {
            return `<div class="aion-card"><h3 class="section-title mb-4">${title}</h3><p class="text-sm text-aion-muted">No data</p></div>`;
        }

        const rows = entries.map(([key, stats]) => `
            <tr>
                <td class="text-sm">${key.replace(/_/g, ' ')}</td>
                <td class="text-center">${stats.total}</td>
                <td class="text-center ${stats.winRate >= 50 ? 'text-green-400' : 'text-red-400'}">${stats.winRate}%</td>
            </tr>
        `).join('');

        return `
            <div class="aion-card">
                <h3 class="section-title mb-4">${title}</h3>
                <table class="aion-table">
                    <thead><tr><th>Name</th><th class="text-center">Trades</th><th class="text-center">Win %</th></tr></thead>
                    <tbody>${rows}</tbody>
                </table>
            </div>
        `;
    }

    function renderViolationHeatmap(counts) {
        const entries = Object.entries(counts).sort((a, b) => b[1] - a[1]);
        const max = Math.max(...entries.map(e => e[1]));

        const items = entries.map(([rule, count]) => {
            const intensity = Math.round((count / max) * 100);
            return `
                <div class="p-3 rounded-lg" style="background: rgba(239, 68, 68, ${intensity / 100 * 0.5})">
                    <div class="font-medium">${rule}</div>
                    <div class="text-2xl font-bold">${count}</div>
                </div>
            `;
        }).join('');

        return `
            <div class="aion-card mb-6">
                <h3 class="section-title mb-4">Rule Violation Heatmap</h3>
                <div class="grid grid-cols-2 md:grid-cols-4 gap-4">${items}</div>
            </div>
        `;
    }

    function renderInvalidRatio(summary) {
        const total = summary.total + summary.invalidCount + summary.incompleteCount;
        const validPct = total > 0 ? Math.round((summary.total / total) * 100) : 100;
        const invalidPct = total > 0 ? Math.round((summary.invalidCount / total) * 100) : 0;
        const incompletePct = total > 0 ? Math.round((summary.incompleteCount / total) * 100) : 0;

        return `
            <div class="aion-card">
                <h3 class="section-title mb-4">Trade Quality</h3>
                <div class="flex gap-2 h-4 rounded-full overflow-hidden mb-4">
                    <div class="bg-green-500" style="width: ${validPct}%"></div>
                    <div class="bg-red-500" style="width: ${invalidPct}%"></div>
                    <div class="bg-yellow-500" style="width: ${incompletePct}%"></div>
                </div>
                <div class="flex justify-between text-sm">
                    <span class="text-green-400">Valid: ${summary.total}</span>
                    <span class="text-red-400">Invalid: ${summary.invalidCount}</span>
                    <span class="text-yellow-400">Incomplete: ${summary.incompleteCount}</span>
                </div>
            </div>
        `;
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

    return { render };
})();
