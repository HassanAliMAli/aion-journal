/**
 * AION Journal OS - Trades List Page
 */

const AionTrades = (function () {
    'use strict';

    let currentFilters = { state: '', status: '', setup: '', session: '', market: '' };

    async function render() {
        const container = document.getElementById('page-trades');
        container.innerHTML = '<div class="skeleton h-16 mb-4"></div><div class="skeleton h-96"></div>';

        try {
            const [tradesRes, setupsRes] = await Promise.all([
                AionAPI.loadTrades(),
                AionAPI.loadSetups()
            ]);

            const trades = tradesRes.exists ? tradesRes.content.trades || [] : [];
            const setups = setupsRes.exists ? setupsRes.content.setups || [] : [];

            container.innerHTML = `
                <div class="section-header mb-6">
                    <h2 class="text-2xl font-bold">Trades</h2>
                    <button onclick="AionTrades.createNewTrade()" class="aion-btn aion-btn-primary">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path></svg>
                        New Trade
                    </button>
                </div>
                ${renderFilterBar(setups)}
                <div id="trades-table-container">${renderTradesTable(trades, setups)}</div>
            `;

            setupFilterListeners(trades, setups);
        } catch (e) {
            container.innerHTML = `<div class="alert-banner danger">Failed to load trades: ${e.message}</div>`;
        }
    }

    function renderFilterBar(setups) {
        const setupOptions = setups.map(s => `<option value="${s.setup_id}">${s.setup_name}</option>`).join('');

        return `
            <div class="filter-bar">
                <div class="filter-group">
                    <label class="filter-label">State</label>
                    <select id="filter-state" class="aion-input aion-select filter-select">
                        <option value="">All States</option>
                        ${AionValidators.TRADE_STATES.map(s => `<option value="${s}">${s}</option>`).join('')}
                    </select>
                </div>
                <div class="filter-group">
                    <label class="filter-label">Status</label>
                    <select id="filter-status" class="aion-input aion-select filter-select">
                        <option value="">All Statuses</option>
                        ${AionValidators.TRADE_STATUSES.map(s => `<option value="${s}">${s}</option>`).join('')}
                    </select>
                </div>
                <div class="filter-group">
                    <label class="filter-label">Setup</label>
                    <select id="filter-setup" class="aion-input aion-select filter-select">
                        <option value="">All Setups</option>
                        ${setupOptions}
                    </select>
                </div>
                <div class="filter-group">
                    <label class="filter-label">Session</label>
                    <select id="filter-session" class="aion-input aion-select filter-select">
                        <option value="">All Sessions</option>
                        ${AionValidators.SESSIONS.map(s => `<option value="${s}">${s.replace(/_/g, ' ')}</option>`).join('')}
                    </select>
                </div>
                <div class="filter-group">
                    <label class="filter-label">Market</label>
                    <select id="filter-market" class="aion-input aion-select filter-select">
                        <option value="">All Markets</option>
                        ${AionValidators.MARKET_TYPES.map(m => `<option value="${m}">${m}</option>`).join('')}
                    </select>
                </div>
            </div>
        `;
    }

    function setupFilterListeners(trades, setups) {
        ['state', 'status', 'setup', 'session', 'market'].forEach(filter => {
            const el = document.getElementById(`filter-${filter}`);
            if (el) {
                el.addEventListener('change', () => {
                    currentFilters[filter] = el.value;
                    applyFilters(trades, setups);
                });
            }
        });
    }

    function applyFilters(trades, setups) {
        let filtered = trades;

        if (currentFilters.state) filtered = filtered.filter(t => t.trade_state === currentFilters.state);
        if (currentFilters.status) filtered = filtered.filter(t => t.trade_status === currentFilters.status);
        if (currentFilters.setup) filtered = filtered.filter(t => t.setup_id === currentFilters.setup);
        if (currentFilters.session) filtered = filtered.filter(t => t.session === currentFilters.session);
        if (currentFilters.market) filtered = filtered.filter(t => t.market_type === currentFilters.market);

        document.getElementById('trades-table-container').innerHTML = renderTradesTable(filtered, setups);
    }

    function renderTradesTable(trades, setups) {
        if (trades.length === 0) {
            return `
                <div class="aion-card">
                    <div class="empty-state">
                        <svg class="empty-state-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path></svg>
                        <h4 class="empty-state-title">No trades found</h4>
                        <p class="empty-state-text">Create your first trade to get started</p>
                    </div>
                </div>
            `;
        }

        const sorted = [...trades].sort((a, b) => new Date(b.date_utc || 0) - new Date(a.date_utc || 0));

        const rows = sorted.map(trade => {
            const setup = setups.find(s => s.setup_id === trade.setup_id);
            const stateClass = `state-${trade.trade_state.toLowerCase()}`;
            const statusClass = `status-${(trade.trade_status || 'pending').toLowerCase()}`;
            const pnlClass = trade.net_pl >= 0 ? 'text-green-400' : 'text-red-400';

            return `
                <tr class="clickable" onclick="AionApp.navigateTo('trade-detail', {tradeId: '${trade.trade_id}'})">
                    <td class="font-mono text-sm text-aion-accent">${trade.trade_id}</td>
                    <td class="font-medium">${trade.instrument || '-'}</td>
                    <td>${trade.direction || '-'}</td>
                    <td><span class="state-badge ${stateClass}">${trade.trade_state}</span></td>
                    <td><span class="state-badge ${statusClass}">${trade.trade_status || 'PENDING'}</span></td>
                    <td>${setup?.setup_name || '-'}</td>
                    <td>${trade.session?.replace(/_/g, ' ') || '-'}</td>
                    <td>${trade.actual_rr !== undefined ? trade.actual_rr + 'R' : '-'}</td>
                    <td class="${pnlClass}">${trade.net_pl !== undefined ? AionApp.formatCurrency(trade.net_pl) : '-'}</td>
                    <td class="text-aion-muted">${AionApp.formatDate(trade.date_utc)}</td>
                </tr>
            `;
        }).join('');

        return `
            <div class="aion-card overflow-x-auto">
                <table class="aion-table">
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Instrument</th>
                            <th>Direction</th>
                            <th>State</th>
                            <th>Status</th>
                            <th>Setup</th>
                            <th>Session</th>
                            <th>RR</th>
                            <th>P&L</th>
                            <th>Date</th>
                        </tr>
                    </thead>
                    <tbody>${rows}</tbody>
                </table>
                <div class="mt-4 text-sm text-aion-muted text-center">Showing ${trades.length} trade(s)</div>
            </div>
        `;
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
