/**
 * AION Journal OS - Trades List Page
 */

const AionTrades = (function () {
    'use strict';

    let currentFilters = { state: '', status: '', setup: '', session: '', market: '' };

    async function render() {
        const container = document.getElementById('page-trades');
        container.innerHTML = '';
        const skelHeader = document.createElement('div');
        skelHeader.className = 'skeleton h-16 mb-4';
        const skelTable = document.createElement('div');
        skelTable.className = 'skeleton h-96';
        container.appendChild(skelHeader);
        container.appendChild(skelTable);

        try {
            const [tradesRes, setupsRes] = await Promise.all([
                AionAPI.loadTrades(),
                AionAPI.loadSetups()
            ]);

            const trades = tradesRes.exists ? tradesRes.content.trades || [] : [];
            const setups = setupsRes.exists ? setupsRes.content.setups || [] : [];

            container.innerHTML = ''; // Clear skeleton

            // Header
            const header = createElement('div', 'section-header mb-6');
            header.appendChild(createElement('h2', 'text-2xl font-bold', 'Trades'));

            const newBtn = createElement('button', 'aion-btn aion-btn-primary', 'New Trade');
            const icon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
            icon.setAttribute('class', 'w-5 h-5');
            icon.setAttribute('fill', 'none');
            icon.setAttribute('stroke', 'currentColor');
            icon.setAttribute('viewBox', '0 0 24 24');
            const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            path.setAttribute('stroke-linecap', 'round');
            path.setAttribute('stroke-linejoin', 'round');
            path.setAttribute('stroke-width', '2');
            path.setAttribute('d', 'M12 4v16m8-8H4');
            icon.appendChild(path);
            newBtn.prepend(icon);

            newBtn.onclick = createNewTrade;
            header.appendChild(newBtn);
            container.appendChild(header);

            // Filters
            renderFilterBar(container, setups, trades);

            // Table Container
            const tableContainer = createElement('div');
            tableContainer.id = 'trades-table-container';
            container.appendChild(tableContainer);

            renderTradesTable(tableContainer, trades, setups);

        } catch (e) {
            container.innerHTML = '';
            const banner = document.createElement('div');
            banner.className = 'alert-banner danger';
            banner.textContent = `Failed to load trades: ${e.message}`;
            container.appendChild(banner);
        }
    }

    function createElement(tag, className, text) {
        const el = document.createElement(tag);
        if (className) el.className = className;
        if (text) el.textContent = text;
        return el;
    }

    function renderFilterBar(container, setups, trades) {
        const bar = createElement('div', 'filter-bar');

        const createSelect = (label, id, options) => {
            const group = createElement('div', 'filter-group');
            group.appendChild(createElement('label', 'filter-label', label));
            const select = createElement('select', 'aion-input aion-select filter-select');
            select.id = id;

            options.forEach(opt => {
                const o = createElement('option', '', opt.label);
                o.value = opt.value;
                select.appendChild(o);
            });

            select.onchange = () => {
                const key = id.replace('filter-', '');
                currentFilters[key] = select.value;
                applyFilters(trades, setups);
            };

            group.appendChild(select);
            return group;
        };

        bar.appendChild(createSelect('State', 'filter-state', [
            { value: '', label: 'All States' },
            ...AionValidators.TRADE_STATES.map(s => ({ value: s, label: s }))
        ]));

        bar.appendChild(createSelect('Status', 'filter-status', [
            { value: '', label: 'All Statuses' },
            ...AionValidators.TRADE_STATUSES.map(s => ({ value: s, label: s }))
        ]));

        bar.appendChild(createSelect('Setup', 'filter-setup', [
            { value: '', label: 'All Setups' },
            ...setups.map(s => ({ value: s.setup_id, label: s.setup_name }))
        ]));

        bar.appendChild(createSelect('Session', 'filter-session', [
            { value: '', label: 'All Sessions' },
            ...AionValidators.SESSIONS.map(s => ({ value: s, label: s.replace(/_/g, ' ') }))
        ]));

        bar.appendChild(createSelect('Market', 'filter-market', [
            { value: '', label: 'All Markets' },
            ...AionValidators.MARKET_TYPES.map(m => ({ value: m, label: m }))
        ]));

        container.appendChild(bar);
    }

    function applyFilters(trades, setups) {
        let filtered = trades;

        if (currentFilters.state) filtered = filtered.filter(t => t.trade_state === currentFilters.state);
        if (currentFilters.status) filtered = filtered.filter(t => t.trade_status === currentFilters.status);
        if (currentFilters.setup) filtered = filtered.filter(t => t.setup_id === currentFilters.setup);
        if (currentFilters.session) filtered = filtered.filter(t => t.session === currentFilters.session);
        if (currentFilters.market) filtered = filtered.filter(t => t.market_type === currentFilters.market);

        const container = document.getElementById('trades-table-container');
        renderTradesTable(container, filtered, setups);
    }

    function renderTradesTable(container, trades, setups) {
        container.innerHTML = '';
        const card = createElement('div', 'aion-card overflow-x-auto');

        if (trades.length === 0) {
            const empty = createElement('div', 'empty-state');

            const icon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
            icon.setAttribute('class', 'empty-state-icon');
            icon.setAttribute('fill', 'none');
            icon.setAttribute('stroke', 'currentColor');
            icon.setAttribute('viewBox', '0 0 24 24');
            const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            path.setAttribute('stroke-linecap', 'round');
            path.setAttribute('stroke-linejoin', 'round');
            path.setAttribute('stroke-width', '1.5');
            path.setAttribute('d', 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z');
            icon.appendChild(path);

            empty.appendChild(icon);
            empty.appendChild(createElement('h4', 'empty-state-title', 'No trades found'));
            empty.appendChild(createElement('p', 'empty-state-text', 'Create your first trade to get started'));

            card.appendChild(empty);
            container.appendChild(card);
            return;
        }

        const table = createElement('table', 'aion-table');
        const thead = createElement('thead');
        const tr = createElement('tr');
        ['ID', 'Instrument', 'Direction', 'State', 'Status', 'Setup', 'Session', 'RR', 'P&L', 'Date'].forEach(h => {
            tr.appendChild(createElement('th', '', h));
        });
        thead.appendChild(tr);
        table.appendChild(thead);

        const tbody = createElement('tbody');
        const sorted = [...trades].sort((a, b) => new Date(b.date_utc || 0) - new Date(a.date_utc || 0));

        sorted.forEach(trade => {
            const row = createElement('tr', 'clickable');
            row.onclick = () => AionApp.navigateTo('trade-detail', { tradeId: trade.trade_id });

            const setup = setups.find(s => s.setup_id === trade.setup_id);
            const stateClass = `state-${(trade.trade_state || 'draft').toLowerCase()}`;
            const statusClass = `status-${(trade.trade_status || 'pending').toLowerCase()}`;
            const pnlClass = trade.net_pl >= 0 ? 'text-green-400' : 'text-red-400';

            row.appendChild(createElement('td', 'font-mono text-sm text-aion-accent', trade.trade_id));
            row.appendChild(createElement('td', 'font-medium', trade.instrument || '-'));
            row.appendChild(createElement('td', '', trade.direction || '-'));

            const stateTd = createElement('td');
            stateTd.appendChild(createElement('span', `state-badge ${stateClass}`, trade.trade_state));
            row.appendChild(stateTd);

            const statusTd = createElement('td');
            statusTd.appendChild(createElement('span', `state-badge ${statusClass}`, trade.trade_status || 'PENDING'));
            row.appendChild(statusTd);

            row.appendChild(createElement('td', '', setup?.setup_name || '-'));
            row.appendChild(createElement('td', '', trade.session?.replace(/_/g, ' ') || '-'));
            row.appendChild(createElement('td', '', trade.actual_rr !== undefined ? trade.actual_rr + 'R' : '-'));
            row.appendChild(createElement('td', pnlClass, trade.net_pl !== undefined ? AionApp.formatCurrency(trade.net_pl) : '-'));
            row.appendChild(createElement('td', 'text-aion-muted', AionApp.formatDate(trade.date_utc)));

            tbody.appendChild(row);
        });

        table.appendChild(tbody);
        card.appendChild(table);

        container.appendChild(card);
        container.appendChild(createElement('div', 'mt-4 text-sm text-aion-muted text-center', `Showing ${trades.length} trade(s)`));
    }

    async function createNewTrade() {
        AionApp.showLoading('Creating trade...');
        try {
            const tradesRes = await AionAPI.loadTrades();
            const existingTrades = tradesRes.exists ? tradesRes.content.trades || [] : [];

            const newTradeId = AionValidators.generateTradeId(existingTrades);
            const now = new Date().toISOString();

            const newTrade = {
                trade_id: newTradeId,
                trade_name: '',
                account_id: null,
                setup_id: null,
                date_utc: now,
                day_of_week: new Date().toLocaleDateString('en-US', { weekday: 'long' }),
                session: null,
                market_type: null,
                instrument: null,
                direction: null,
                entry_type: null,
                planned_entry_price: null,
                actual_entry_price: null,
                stop_loss: null,
                take_profit: null,
                planned_rr: null,
                actual_rr: null,
                risk_pct: null,
                usd_risk: null,
                exit_type: null,
                exit_price: null,
                exit_time_utc: null,
                net_pl: null,
                trade_state: 'DRAFT',
                trade_status: 'PENDING'
            };

            existingTrades.push(newTrade);

            const tradesData = tradesRes.exists ? tradesRes.content : { _meta: AionState.createMeta(), trades: [] };
            tradesData.trades = existingTrades;
            tradesData._meta = AionState.updateMeta(tradesData._meta);

            await AionAPI.saveTrades(tradesData, tradesRes.sha);
            AionState.invalidateCache('trades');

            AionApp.hideLoading();
            AionApp.navigateTo('trade-detail', { tradeId: newTradeId });
            AionApp.showToast(`Trade ${newTradeId} created`, 'success');
        } catch (e) {
            AionApp.hideLoading();
            AionApp.showToast('Failed to create trade: ' + e.message, 'error');
        }
    }

    return { render, createNewTrade };
})();
