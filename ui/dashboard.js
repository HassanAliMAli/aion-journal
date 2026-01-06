/**
 * AION Journal OS - Dashboard Page
 */

const AionDashboard = (function () {
    'use strict';

    async function render() {
        const container = document.getElementById('page-dashboard');
        container.innerHTML = '';
        const skel = document.createElement('div');
        skel.className = 'skeleton h-64 mb-4';

        // Append multiple skeletons manually
        container.appendChild(skel.cloneNode(true));
        container.appendChild(skel.cloneNode(true));
        container.appendChild(skel.cloneNode(true));

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

            container.innerHTML = ''; // Clear skeleton

            // Render Alert Section
            const alertContainer = renderAlerts(summary, violations);
            if (alertContainer) container.appendChild(alertContainer);

            container.appendChild(renderEquitySummary(summary, primaryAccount));
            container.appendChild(renderQuickStats(summary));
            container.appendChild(renderRecentTrades(trades));
            container.appendChild(renderUpcomingTasks(trades));

        } catch (e) {
            container.innerHTML = '';
            const banner = document.createElement('div');
            banner.className = 'alert-banner danger';
            banner.textContent = `Failed to load dashboard: ${e.message}`;
            container.appendChild(banner);
        }
    }

    function createElement(tag, className, text) {
        const el = document.createElement(tag);
        if (className) el.className = className;
        if (text) el.textContent = text;
        return el;
    }

    function createSvgIcon(d) {
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('class', 'w-5 h-5');
        svg.setAttribute('fill', 'currentColor');
        svg.setAttribute('viewBox', '0 0 20 20');
        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.setAttribute('fill-rule', 'evenodd');
        path.setAttribute('d', d);
        path.setAttribute('clip-rule', 'evenodd');
        svg.appendChild(path);
        return svg;
    }

    function renderAlerts(summary, violations) {
        const wrapper = document.createElement('div');
        let hasAlerts = false;

        if (summary.incompleteCount > 0) {
            hasAlerts = true;
            const alert = createElement('div', 'alert-banner warning');
            alert.appendChild(createSvgIcon('M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z'));
            alert.appendChild(createElement('span', '', `${summary.incompleteCount} incomplete trade(s) need attention`));
            wrapper.appendChild(alert);
        }

        if (summary.invalidCount > 0) {
            hasAlerts = true;
            const alert = createElement('div', 'alert-banner danger');
            alert.appendChild(createSvgIcon('M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z'));
            alert.appendChild(createElement('span', '', `${summary.invalidCount} invalid trade(s) require correction`));
            wrapper.appendChild(alert);
        }

        if (violations.length > 0) {
            const recent = violations.filter(v => {
                const date = new Date(v.timestamp_utc || v.created_at);
                return Date.now() - date.getTime() < 7 * 24 * 60 * 60 * 1000;
            });
            if (recent.length > 0) {
                hasAlerts = true;
                const alert = createElement('div', 'alert-banner danger');
                alert.appendChild(createSvgIcon('M13.477 14.89A6 6 0 015.11 6.524l8.367 8.368zm1.414-1.414L6.524 5.11a6 6 0 018.367 8.367zM18 10a8 8 0 11-16 0 8 8 0 0116 0z'));
                alert.appendChild(createElement('span', '', `${recent.length} rule violation(s) this week`));
                wrapper.appendChild(alert);
            }
        }

        return hasAlerts ? wrapper : null;
    }

    function renderEquitySummary(summary, account) {
        const pnlClass = summary.totalPnL >= 0 ? 'positive' : 'negative';

        const grid = createElement('div', 'grid grid-cols-2 md:grid-cols-4 gap-4 mb-6');

        const addMetric = (label, value, valueClass) => {
            const card = createElement('div', 'aion-card');
            const inner = createElement('div', 'metric-card');
            inner.appendChild(createElement('span', 'metric-label', label));
            inner.appendChild(createElement('span', `metric-value ${valueClass || ''}`, value));
            card.appendChild(inner);
            grid.appendChild(card);
        };

        addMetric('Current Balance', AionApp.formatCurrency(summary.currentBalance));
        addMetric('Total P&L', AionApp.formatCurrency(summary.totalPnL), pnlClass);
        addMetric('Max Drawdown', `${summary.maxDrawdownPct}%`, 'negative');
        addMetric('Win Rate', `${summary.winRate}%`);

        return grid;
    }

    function renderQuickStats(summary) {
        const grid = createElement('div', 'grid grid-cols-2 md:grid-cols-6 gap-4 mb-6');

        // Streak Card special styling
        const streakBorder = summary.streak.type === 'WIN' ? 'border-l-aion-success' : summary.streak.type === 'LOSS' ? 'border-l-aion-danger' : 'border-l-aion-border';
        const streakText = summary.streak.type === 'WIN' ? 'text-green-400' : summary.streak.type === 'LOSS' ? 'text-red-400' : '';

        const streakCard = createElement('div', `aion-card aion-card-sm border-l-4 ${streakBorder}`);
        const streakInner = createElement('div', 'metric-card');
        streakInner.appendChild(createElement('span', 'metric-label', 'Streak'));
        streakInner.appendChild(createElement('span', `metric-value text-lg ${streakText}`, `${summary.streak.count} ${summary.streak.type}`));
        streakCard.appendChild(streakInner);
        grid.appendChild(streakCard);

        const addStat = (label, val, valClass) => {
            const card = createElement('div', 'aion-card aion-card-sm');
            const inner = createElement('div', 'metric-card');
            inner.appendChild(createElement('span', 'metric-label', label));
            inner.appendChild(createElement('span', `metric-value text-lg ${valClass || ''}`, val));
            card.appendChild(inner);
            grid.appendChild(card);
        };

        addStat('Total Trades', summary.total);
        addStat('Wins', summary.wins, 'positive');
        addStat('Losses', summary.losses, 'negative');
        addStat('Avg RR', `${summary.avgRR}R`);
        addStat('Profit Factor', summary.profitFactor);
        addStat('Expectancy', `${summary.expectancy}R`);

        return grid;
    }

    function renderRecentTrades(trades) {
        const card = createElement('div', 'aion-card mb-6');

        const recent = trades
            .filter(t => t.trade_state === 'CLOSED')
            .sort((a, b) => new Date(b.exit_time_utc || b.date_utc) - new Date(a.exit_time_utc || a.date_utc))
            .slice(0, 5);

        if (recent.length === 0) {
            card.appendChild(createElement('h3', 'section-title mb-4', 'Recent Trades'));
            const empty = createElement('div', 'empty-state');
            empty.appendChild(createElement('p', 'empty-state-text', 'No closed trades yet'));
            card.appendChild(empty);
            return card;
        }

        const header = createElement('div', 'section-header');
        header.appendChild(createElement('h3', 'section-title', 'Recent Trades'));
        const viewAllBtn = createElement('button', 'text-aion-accent text-sm hover:underline', 'View All →');
        viewAllBtn.onclick = () => AionApp.navigateTo('trades');
        header.appendChild(viewAllBtn);
        card.appendChild(header);

        const scrollDiv = createElement('div', 'overflow-x-auto');
        const table = createElement('table', 'aion-table');
        const thead = createElement('thead');
        const tr = createElement('tr');
        ['ID', 'Instrument', 'State', 'Status', 'P&L', 'Date'].forEach(h => tr.appendChild(createElement('th', '', h)));
        thead.appendChild(tr);
        table.appendChild(thead);

        const tbody = createElement('tbody');
        recent.forEach(t => {
            const row = createElement('tr', 'clickable');
            row.onclick = () => AionApp.navigateTo('trade-detail', { tradeId: t.trade_id });

            row.appendChild(createElement('td', 'font-mono text-sm', t.trade_id));
            row.appendChild(createElement('td', '', t.instrument || '-'));

            const stateTd = createElement('td');
            stateTd.appendChild(createElement('span', `state-badge state-${t.trade_state.toLowerCase()}`, t.trade_state));
            row.appendChild(stateTd);

            const statusTd = createElement('td');
            statusTd.appendChild(createElement('span', `state-badge status-${(t.trade_status || 'pending').toLowerCase()}`, t.trade_status || 'PENDING'));
            row.appendChild(statusTd);

            const pnlColor = t.net_pl >= 0 ? 'text-green-400' : 'text-red-400';
            row.appendChild(createElement('td', pnlColor, AionApp.formatCurrency(t.net_pl)));
            row.appendChild(createElement('td', 'text-aion-muted', AionApp.formatDate(t.exit_time_utc || t.date_utc)));

            tbody.appendChild(row);
        });
        table.appendChild(tbody);
        scrollDiv.appendChild(table);
        card.appendChild(scrollDiv);

        return card;
    }

    function renderUpcomingTasks(trades) {
        const tasks = [];

        trades.filter(t => t.trade_state === 'INCOMPLETE').forEach(t => tasks.push({ type: 'incomplete', trade: t, text: `Complete trade ${t.trade_id}` }));
        trades.filter(t => t.trade_state === 'INVALID').forEach(t => tasks.push({ type: 'invalid', trade: t, text: `Fix invalid trade ${t.trade_id}` }));
        trades.filter(t => t.trade_state === 'PLANNED').forEach(t => tasks.push({ type: 'planned', trade: t, text: `Monitor planned trade ${t.trade_id}` }));

        const card = createElement('div', 'aion-card');

        if (tasks.length === 0) {
            card.appendChild(createElement('h3', 'section-title mb-4', 'Tasks'));
            const empty = createElement('div', 'empty-state');
            empty.appendChild(createElement('p', 'empty-state-text', 'No pending tasks'));
            card.appendChild(empty);
            return card;
        }

        card.appendChild(createElement('h3', 'section-title mb-4', `Tasks (${tasks.length})`));
        const stack = createElement('div', 'space-y-1');

        tasks.slice(0, 5).forEach(t => {
            const item = createElement('div', 'flex items-center gap-3 p-3 rounded-lg hover:bg-aion-border cursor-pointer');
            item.onclick = () => AionApp.navigateTo('trade-detail', { tradeId: t.trade.trade_id });

            const dotClass = t.type === 'invalid' ? 'bg-red-500' : t.type === 'incomplete' ? 'bg-yellow-500' : 'bg-blue-500';
            item.appendChild(createElement('span', `w-2 h-2 rounded-full ${dotClass}`));
            item.appendChild(createElement('span', 'flex-1', t.text));

            const arrow = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
            arrow.setAttribute('class', 'w-4 h-4 text-aion-muted');
            arrow.setAttribute('fill', 'none');
            arrow.setAttribute('stroke', 'currentColor');
            arrow.setAttribute('viewBox', '0 0 24 24');
            const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            path.setAttribute('stroke-linecap', 'round');
            path.setAttribute('stroke-linejoin', 'round');
            path.setAttribute('stroke-width', '2');
            path.setAttribute('d', 'M9 5l7 7-7 7');
            arrow.appendChild(path);
            item.appendChild(arrow);

            stack.appendChild(item);
        });

        card.appendChild(stack);
        return card;
    }

    return { render };
})();
