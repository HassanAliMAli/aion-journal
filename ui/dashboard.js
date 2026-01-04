/**
 * AION Journal OS - Dashboard Page
 */

const AionDashboard = (function () {
    'use strict';

    async function render() {
        const container = document.getElementById('page-dashboard');
        container.innerHTML = '<div class="skeleton h-64 mb-4"></div>'.repeat(3);

        try {
            const [tradesRes, accountsRes, violationsRes] = await Promise.all([
                AionAPI.loadTrades(),
                AionAPI.loadAccounts(),
                AionAPI.loadRuleViolations()
            ]);

            const trades = tradesRes.exists ? tradesRes.content.trades || [] : [];
            const accounts = accountsRes.exists ? accountsRes.content.accounts || [] : [];
            const violations = violationsRes.exists ? violationsRes.content.violations || [] : [];

            const primaryAccount = accounts[0] || { starting_balance: 0, current_balance: 0 };
            const summary = AionAnalytics.getPerformanceSummary(trades, primaryAccount.starting_balance);

            container.innerHTML = `
                ${renderAlerts(summary, violations)}
                ${renderEquitySummary(summary, primaryAccount)}
                ${renderQuickStats(summary)}
                ${renderRecentTrades(trades)}
                ${renderUpcomingTasks(trades)}
            `;
        } catch (e) {
            container.innerHTML = `<div class="alert-banner danger"><span>Failed to load dashboard: ${e.message}</span></div>`;
        }
    }

    function renderAlerts(summary, violations) {
        const alerts = [];

        if (summary.incompleteCount > 0) {
            alerts.push(`<div class="alert-banner warning"><svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"></path></svg><span>${summary.incompleteCount} incomplete trade(s) need attention</span></div>`);
        }

        if (summary.invalidCount > 0) {
            alerts.push(`<div class="alert-banner danger"><svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd"></path></svg><span>${summary.invalidCount} invalid trade(s) require correction</span></div>`);
        }

        if (violations.length > 0) {
            const recent = violations.filter(v => {
                const date = new Date(v.timestamp_utc || v.created_at);
                return Date.now() - date.getTime() < 7 * 24 * 60 * 60 * 1000;
            });
            if (recent.length > 0) {
                alerts.push(`<div class="alert-banner danger"><svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M13.477 14.89A6 6 0 015.11 6.524l8.367 8.368zm1.414-1.414L6.524 5.11a6 6 0 018.367 8.367zM18 10a8 8 0 11-16 0 8 8 0 0116 0z" clip-rule="evenodd"></path></svg><span>${recent.length} rule violation(s) this week</span></div>`);
            }
        }

        return alerts.length > 0 ? alerts.join('') : '';
    }

    function renderEquitySummary(summary, account) {
        const pnlClass = summary.totalPnL >= 0 ? 'positive' : 'negative';
        return `
            <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div class="aion-card">
                    <div class="metric-card">
                        <span class="metric-label">Current Balance</span>
                        <span class="metric-value">${AionApp.formatCurrency(summary.currentBalance)}</span>
                    </div>
                </div>
                <div class="aion-card">
                    <div class="metric-card">
                        <span class="metric-label">Total P&L</span>
                        <span class="metric-value ${pnlClass}">${AionApp.formatCurrency(summary.totalPnL)}</span>
                    </div>
                </div>
                <div class="aion-card">
                    <div class="metric-card">
                        <span class="metric-label">Max Drawdown</span>
                        <span class="metric-value negative">${summary.maxDrawdownPct}%</span>
                    </div>
                </div>
                <div class="aion-card">
                    <div class="metric-card">
                        <span class="metric-label">Win Rate</span>
                        <span class="metric-value">${summary.winRate}%</span>
                    </div>
                </div>
            </div>
        `;
    }

    function renderQuickStats(summary) {
        return `
            <div class="grid grid-cols-2 md:grid-cols-6 gap-4 mb-6">
                <div class="aion-card aion-card-sm">
                    <div class="metric-card">
                        <span class="metric-label">Total Trades</span>
                        <span class="metric-value text-lg">${summary.total}</span>
                    </div>
                </div>
                <div class="aion-card aion-card-sm">
                    <div class="metric-card">
                        <span class="metric-label">Wins</span>
                        <span class="metric-value text-lg positive">${summary.wins}</span>
                    </div>
                </div>
                <div class="aion-card aion-card-sm">
                    <div class="metric-card">
                        <span class="metric-label">Losses</span>
                        <span class="metric-value text-lg negative">${summary.losses}</span>
                    </div>
                </div>
                <div class="aion-card aion-card-sm">
                    <div class="metric-card">
                        <span class="metric-label">Avg RR</span>
                        <span class="metric-value text-lg">${summary.avgRR}R</span>
                    </div>
                </div>
                <div class="aion-card aion-card-sm">
                    <div class="metric-card">
                        <span class="metric-label">Profit Factor</span>
                        <span class="metric-value text-lg">${summary.profitFactor}</span>
                    </div>
                </div>
                <div class="aion-card aion-card-sm">
                    <div class="metric-card">
                        <span class="metric-label">Expectancy</span>
                        <span class="metric-value text-lg">${summary.expectancy}R</span>
                    </div>
                </div>
            </div>
        `;
    }

    function renderRecentTrades(trades) {
        const recent = trades
            .filter(t => t.trade_state === 'CLOSED')
            .sort((a, b) => new Date(b.exit_time_utc || b.date_utc) - new Date(a.exit_time_utc || a.date_utc))
            .slice(0, 5);

        if (recent.length === 0) {
            return `
                <div class="aion-card mb-6">
                    <h3 class="section-title mb-4">Recent Trades</h3>
                    <div class="empty-state">
                        <p class="empty-state-text">No closed trades yet</p>
                    </div>
                </div>
            `;
        }

        const rows = recent.map(t => `
            <tr class="clickable" onclick="AionApp.navigateTo('trade-detail', {tradeId: '${t.trade_id}'})">
                <td class="font-mono text-sm">${t.trade_id}</td>
                <td>${t.instrument || '-'}</td>
                <td><span class="state-badge state-${t.trade_state.toLowerCase()}">${t.trade_state}</span></td>
                <td><span class="state-badge status-${(t.trade_status || 'pending').toLowerCase()}">${t.trade_status || 'PENDING'}</span></td>
                <td class="${t.net_pl >= 0 ? 'text-green-400' : 'text-red-400'}">${AionApp.formatCurrency(t.net_pl)}</td>
                <td class="text-aion-muted">${AionApp.formatDate(t.exit_time_utc || t.date_utc)}</td>
            </tr>
        `).join('');

        return `
            <div class="aion-card mb-6">
                <div class="section-header">
                    <h3 class="section-title">Recent Trades</h3>
                    <button onclick="AionApp.navigateTo('trades')" class="text-aion-accent text-sm hover:underline">View All →</button>
                </div>
                <div class="overflow-x-auto">
                    <table class="aion-table">
                        <thead><tr><th>ID</th><th>Instrument</th><th>State</th><th>Status</th><th>P&L</th><th>Date</th></tr></thead>
                        <tbody>${rows}</tbody>
                    </table>
                </div>
            </div>
        `;
    }

    function renderUpcomingTasks(trades) {
        const tasks = [];

        const incomplete = trades.filter(t => t.trade_state === 'INCOMPLETE');
        incomplete.forEach(t => tasks.push({ type: 'incomplete', trade: t, text: `Complete trade ${t.trade_id}` }));

        const invalid = trades.filter(t => t.trade_state === 'INVALID');
        invalid.forEach(t => tasks.push({ type: 'invalid', trade: t, text: `Fix invalid trade ${t.trade_id}` }));

        const planned = trades.filter(t => t.trade_state === 'PLANNED');
        planned.forEach(t => tasks.push({ type: 'planned', trade: t, text: `Monitor planned trade ${t.trade_id}` }));

        if (tasks.length === 0) {
            return `
                <div class="aion-card">
                    <h3 class="section-title mb-4">Tasks</h3>
                    <div class="empty-state">
                        <p class="empty-state-text">No pending tasks</p>
                    </div>
                </div>
            `;
        }

        const items = tasks.slice(0, 5).map(t => `
            <div class="flex items-center gap-3 p-3 rounded-lg hover:bg-aion-border cursor-pointer" onclick="AionApp.navigateTo('trade-detail', {tradeId: '${t.trade.trade_id}'})">
                <span class="w-2 h-2 rounded-full ${t.type === 'invalid' ? 'bg-red-500' : t.type === 'incomplete' ? 'bg-yellow-500' : 'bg-blue-500'}"></span>
                <span class="flex-1">${t.text}</span>
                <svg class="w-4 h-4 text-aion-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path></svg>
            </div>
        `).join('');

        return `
            <div class="aion-card">
                <h3 class="section-title mb-4">Tasks (${tasks.length})</h3>
                <div class="space-y-1">${items}</div>
            </div>
        `;
    }

    return { render };
})();
