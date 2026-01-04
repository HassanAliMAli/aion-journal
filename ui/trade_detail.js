/**
 * AION Journal OS - Trade Detail Page
 */

const AionTradeDetail = (function () {
    'use strict';

    let currentTrade = null;
    let currentSha = null;
    let accounts = [];
    let setups = [];
    let history = [];

    async function render(tradeId) {
        const container = document.getElementById('page-trade-detail');
        if (!tradeId) tradeId = AionState.getSelectedTrade();
        if (!tradeId) { AionApp.navigateTo('trades'); return; }

        AionState.setSelectedTrade(tradeId);
        container.innerHTML = '<div class="skeleton h-32 mb-4"></div>'.repeat(5);

        try {
            const [tradesRes, accountsRes, setupsRes, historyRes] = await Promise.all([
                AionAPI.loadTrades(), AionAPI.loadAccounts(), AionAPI.loadSetups(), AionAPI.loadTradeHistory()
            ]);

            const trades = tradesRes.exists ? tradesRes.content.trades || [] : [];
            currentTrade = trades.find(t => t.trade_id === tradeId);
            currentSha = tradesRes.sha;
            accounts = accountsRes.exists ? accountsRes.content.accounts || [] : [];
            setups = setupsRes.exists ? setupsRes.content.setups || [] : [];
            history = historyRes.exists ? historyRes.content.entries?.filter(h => h.trade_id === tradeId) || [] : [];

            if (!currentTrade) { container.innerHTML = '<div class="alert-banner danger">Trade not found</div>'; return; }

            container.innerHTML = `
                <button onclick="AionApp.navigateTo('trades')" class="flex items-center gap-2 text-aion-muted hover:text-aion-text mb-4">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path></svg>
                    Back to Trades
                </button>
                ${renderHeader()}
                <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div class="lg:col-span-2 space-y-6">
                        ${renderCoreData()}
                        ${renderContext()}
                        ${renderExecution()}
                        ${renderPsychology()}
                        ${renderNarrative()}
                        ${renderManagement()}
                    </div>
                    <div class="space-y-6">
                        ${renderStateControl()}
                        ${renderHistory()}
                    </div>
                </div>
            `;
            setupFormListeners();
        } catch (e) {
            container.innerHTML = `<div class="alert-banner danger">Failed to load trade: ${e.message}</div>`;
        }
    }

    function renderHeader() {
        const nameOptions = typeof AionMarketEngine !== 'undefined'
            ? AionMarketEngine.generateTradeNameOptions(currentTrade, setups)
            : [];
        const optionsHtml = nameOptions.map(opt =>
            `<button onclick="document.getElementById('trade-name').value='${opt}'" class="text-left px-3 py-2 hover:bg-aion-border rounded text-sm">${opt}</button>`
        ).join('');

        return `
            <div class="aion-card mb-6">
                <div class="flex flex-wrap items-center justify-between gap-4">
                    <div class="flex items-center gap-4">
                        <span class="text-2xl font-mono font-bold text-aion-accent">${currentTrade.trade_id}</span>
                        <span class="state-badge state-${currentTrade.trade_state.toLowerCase()}">${currentTrade.trade_state}</span>
                        <span class="state-badge status-${(currentTrade.trade_status || 'pending').toLowerCase()}">${currentTrade.trade_status || 'PENDING'}</span>
                    </div>
                    <div class="flex gap-2">
                        <button onclick="AionTradeDetail.saveTrade()" class="aion-btn aion-btn-primary">Save Changes</button>
                    </div>
                </div>
                <div class="mt-4">
                    <label class="block text-sm font-medium mb-2">Trade Name</label>
                    <div class="flex gap-2">
                        <input type="text" id="trade-name" value="${currentTrade.trade_name || ''}" placeholder="e.g., EURUSD London Long BOS" class="aion-input flex-1">
                        <div class="relative">
                            <button onclick="document.getElementById('name-builder-dropdown').classList.toggle('hidden')" class="aion-btn aion-btn-secondary" title="Name Builder">
                                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>
                            </button>
                            <div id="name-builder-dropdown" class="hidden absolute right-0 top-full mt-1 w-64 bg-aion-card border border-aion-border rounded-lg shadow-xl z-10">
                                <div class="p-2 text-xs text-aion-muted border-b border-aion-border">Quick Name Builder</div>
                                <div class="p-2 flex flex-col gap-1">
                                    ${optionsHtml || '<p class="text-xs text-aion-muted p-2">Fill instrument, direction, session first</p>'}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }


    function renderCoreData() {
        const accountOpts = accounts.map(a => `<option value="${a.account_id}" ${currentTrade.account_id === a.account_id ? 'selected' : ''}>${a.trader_name} (${a.platform})</option>`).join('');
        const setupOpts = setups.filter(s => s.setup_status === 'ACTIVE').map(s => `<option value="${s.setup_id}" ${currentTrade.setup_id === s.setup_id ? 'selected' : ''}>${s.setup_name}</option>`).join('');

        return `
            <div class="aion-card">
                <h3 class="section-title mb-4">Core Trade Data</h3>
                <div class="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <div><label class="block text-sm font-medium mb-1">Account</label><select id="trade-account" class="aion-input aion-select"><option value="">Select...</option>${accountOpts}</select></div>
                    <div><label class="block text-sm font-medium mb-1">Setup</label><select id="trade-setup" class="aion-input aion-select"><option value="">Select...</option>${setupOpts}</select></div>
                    <div><label class="block text-sm font-medium mb-1">Market Type</label><select id="trade-market" class="aion-input aion-select"><option value="">Select...</option>${AionValidators.MARKET_TYPES.map(m => `<option value="${m}" ${currentTrade.market_type === m ? 'selected' : ''}>${m}</option>`).join('')}</select></div>
                    <div><label class="block text-sm font-medium mb-1">Instrument</label><input type="text" id="trade-instrument" value="${currentTrade.instrument || ''}" class="aion-input" placeholder="e.g., EURUSD"></div>
                    <div><label class="block text-sm font-medium mb-1">Direction</label><select id="trade-direction" class="aion-input aion-select"><option value="">Select...</option>${AionValidators.DIRECTIONS.map(d => `<option value="${d}" ${currentTrade.direction === d ? 'selected' : ''}>${d}</option>`).join('')}</select></div>
                    <div><label class="block text-sm font-medium mb-1">Session</label><select id="trade-session" class="aion-input aion-select"><option value="">Select...</option>${AionValidators.SESSIONS.map(s => `<option value="${s}" ${currentTrade.session === s ? 'selected' : ''}>${s.replace(/_/g, ' ')}</option>`).join('')}</select></div>
                    <div><label class="block text-sm font-medium mb-1">Entry Type</label><select id="trade-entry-type" class="aion-input aion-select"><option value="">Select...</option>${AionValidators.ENTRY_TYPES.map(e => `<option value="${e}" ${currentTrade.entry_type === e ? 'selected' : ''}>${e}</option>`).join('')}</select></div>
                    <div><label class="block text-sm font-medium mb-1">Planned Entry</label><input type="number" step="any" id="trade-planned-entry" value="${currentTrade.planned_entry_price || ''}" class="aion-input"></div>
                    <div><label class="block text-sm font-medium mb-1">Actual Entry</label><input type="number" step="any" id="trade-actual-entry" value="${currentTrade.actual_entry_price || ''}" class="aion-input"></div>
                    <div><label class="block text-sm font-medium mb-1">Stop Loss</label><input type="number" step="any" id="trade-sl" value="${currentTrade.stop_loss || ''}" class="aion-input"></div>
                    <div><label class="block text-sm font-medium mb-1">Take Profit</label><input type="number" step="any" id="trade-tp" value="${currentTrade.take_profit || ''}" class="aion-input"></div>
                    <div><label class="block text-sm font-medium mb-1">Risk %</label><input type="number" step="0.01" id="trade-risk-pct" value="${currentTrade.risk_pct || ''}" class="aion-input"></div>
                    <div><label class="block text-sm font-medium mb-1">USD Risk</label><input type="number" step="0.01" id="trade-usd-risk" value="${currentTrade.usd_risk || ''}" class="aion-input"></div>
                    <div><label class="block text-sm font-medium mb-1">Planned RR</label><input type="text" id="trade-planned-rr" value="${currentTrade.planned_rr || ''}" class="aion-input" readonly></div>
                    <div><label class="block text-sm font-medium mb-1">Exit Type</label><select id="trade-exit-type" class="aion-input aion-select"><option value="">Select...</option>${AionValidators.EXIT_TYPES.map(e => `<option value="${e}" ${currentTrade.exit_type === e ? 'selected' : ''}>${e}</option>`).join('')}</select></div>
                    <div><label class="block text-sm font-medium mb-1">Exit Price</label><input type="number" step="any" id="trade-exit-price" value="${currentTrade.exit_price || ''}" class="aion-input"></div>
                    <div><label class="block text-sm font-medium mb-1">Net P&L</label><input type="number" step="0.01" id="trade-net-pl" value="${currentTrade.net_pl || ''}" class="aion-input"></div>
                    <div><label class="block text-sm font-medium mb-1">Actual RR</label><input type="text" id="trade-actual-rr" value="${currentTrade.actual_rr || ''}" class="aion-input" readonly></div>
                </div>
            </div>
        `;
    }

    function renderContext() {
        return `
            <div class="aion-card">
                <h3 class="section-title mb-4">Trade Context</h3>
                <div class="space-y-4">
                    <div><label class="block text-sm font-medium mb-1">Higher TF Bias</label><input type="text" id="trade-htf-bias" value="" class="aion-input" placeholder="e.g., Bullish on H4"></div>
                    <div><label class="block text-sm font-medium mb-1">Market Structure</label><textarea id="trade-market-structure" class="aion-input aion-textarea" placeholder="Describe the market structure..."></textarea></div>
                    <div><label class="block text-sm font-medium mb-1">Liquidity Context</label><textarea id="trade-liquidity" class="aion-input aion-textarea" placeholder="Describe liquidity zones..."></textarea></div>
                    <div><label class="block text-sm font-medium mb-1">External Chart Links</label><input type="url" id="trade-chart-link" class="aion-input" placeholder="https://www.tradingview.com/..."></div>
                </div>
            </div>
        `;
    }

    function renderExecution() {
        return `
            <div class="aion-card">
                <h3 class="section-title mb-4">Execution Quality</h3>
                <div class="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <div><label class="block text-sm font-medium mb-1">Slippage (pips)</label><input type="number" step="0.1" id="trade-slippage" class="aion-input"></div>
                    <div><label class="block text-sm font-medium mb-1">Spread</label><input type="number" step="0.1" id="trade-spread" class="aion-input"></div>
                    <div><label class="block text-sm font-medium mb-1">News Nearby</label><select id="trade-news" class="aion-input aion-select"><option value="">Select...</option><option value="Yes">Yes</option><option value="No">No</option></select></div>
                </div>
                <div class="mt-4"><label class="block text-sm font-medium mb-1">Execution Notes</label><textarea id="trade-exec-notes" class="aion-input aion-textarea" placeholder="Notes about execution..."></textarea></div>
            </div>
        `;
    }

    function renderPsychology() {
        return `
            <div class="aion-card">
                <h3 class="section-title mb-4">Psychology</h3>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div><label class="block text-sm font-medium mb-1">Pre-Trade Emotion</label><select id="trade-pre-emotion" class="aion-input aion-select"><option value="">Select...</option>${AionValidators.EMOTIONS.map(e => `<option value="${e}">${e}</option>`).join('')}</select></div>
                    <div><label class="block text-sm font-medium mb-2">Pre-Trade Intensity</label><input type="range" min="1" max="10" value="5" id="trade-pre-intensity" class="emotion-slider w-full"></div>
                    <div><label class="block text-sm font-medium mb-1">During Trade Emotion</label><select id="trade-during-emotion" class="aion-input aion-select"><option value="">Select...</option>${AionValidators.EMOTIONS.map(e => `<option value="${e}">${e}</option>`).join('')}</select></div>
                    <div><label class="block text-sm font-medium mb-2">During Intensity</label><input type="range" min="1" max="10" value="5" id="trade-during-intensity" class="emotion-slider w-full"></div>
                    <div><label class="block text-sm font-medium mb-1">Post-Trade Emotion</label><select id="trade-post-emotion" class="aion-input aion-select"><option value="">Select...</option>${AionValidators.EMOTIONS.map(e => `<option value="${e}">${e}</option>`).join('')}</select></div>
                    <div><label class="block text-sm font-medium mb-1">Confidence Score (1-10)</label><input type="number" min="1" max="10" id="trade-confidence" class="aion-input"></div>
                </div>
            </div>
        `;
    }

    function renderNarrative() {
        return `
            <div class="aion-card">
                <h3 class="section-title mb-4">Raw Narrative</h3>
                <p class="text-xs text-aion-muted mb-2">This field is NEVER edited by AI. Write your raw thoughts here.</p>
                <textarea id="trade-narrative" class="aion-input min-h-[200px]" placeholder="Write your complete trade narrative here..."></textarea>
            </div>
        `;
    }

    function renderManagement() {
        return `
            <div class="aion-card">
                <h3 class="section-title mb-4">Management Notes</h3>
                <p class="text-xs text-aion-muted mb-2">Human notes about trade management. AI summaries allowed here.</p>
                <textarea id="trade-management" class="aion-input min-h-[120px]" placeholder="Notes about how you managed this trade..."></textarea>
            </div>
        `;
    }

    function renderStateControl() {
        const transitions = { DRAFT: ['PLANNED'], PLANNED: ['OPEN', 'MISSED'], OPEN: ['CLOSED'], INCOMPLETE: ['DRAFT'], INVALID: ['DRAFT'] };
        const available = transitions[currentTrade.trade_state] || [];

        const buttons = available.map(state =>
            `<button onclick="AionTradeDetail.transitionState('${state}')" class="aion-btn aion-btn-secondary flex-1">${state}</button>`
        ).join('');

        return `
            <div class="aion-card">
                <h3 class="section-title mb-4">State Control</h3>
                <div class="space-y-4">
                    <div class="flex items-center gap-2">
                        <span class="text-sm">Current:</span>
                        <span class="state-badge state-${currentTrade.trade_state.toLowerCase()}">${currentTrade.trade_state}</span>
                    </div>
                    ${buttons.length > 0 ? `<div class="flex gap-2">${buttons}</div>` : '<p class="text-sm text-aion-muted">No transitions available</p>'}
                </div>
            </div>
        `;
    }

    function renderHistory() {
        if (history.length === 0) {
            return `<div class="aion-card"><h3 class="section-title mb-4">History</h3><p class="text-sm text-aion-muted">No changes recorded yet</p></div>`;
        }

        const items = history.slice(-10).reverse().map(h => `
            <div class="history-item">
                <div class="history-item-time">${AionApp.formatDate(h.timestamp_utc, 'full')}</div>
                <div class="history-item-content"><span class="font-medium">${h.field_changed}</span>: ${h.old_value || 'empty'} → ${h.new_value}</div>
            </div>
        `).join('');

        return `<div class="aion-card"><h3 class="section-title mb-4">History</h3><div class="space-y-2">${items}</div></div>`;
    }

    function setupFormListeners() {
        const priceFields = ['trade-planned-entry', 'trade-actual-entry', 'trade-sl', 'trade-tp'];
        priceFields.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.addEventListener('change', recalculateRR);
        });
    }

    function recalculateRR() {
        const entry = parseFloat(document.getElementById('trade-actual-entry')?.value) || parseFloat(document.getElementById('trade-planned-entry')?.value);
        const sl = parseFloat(document.getElementById('trade-sl')?.value);
        const tp = parseFloat(document.getElementById('trade-tp')?.value);
        const exitPrice = parseFloat(document.getElementById('trade-exit-price')?.value);
        const direction = document.getElementById('trade-direction')?.value;

        if (entry && sl && tp) {
            const plannedRR = AionValidators.calculateRR(entry, sl, tp, direction);
            document.getElementById('trade-planned-rr').value = plannedRR ? plannedRR + 'R' : '';
        }

        if (entry && sl && exitPrice) {
            const actualRR = AionValidators.calculateActualRR(entry, sl, exitPrice, direction);
            document.getElementById('trade-actual-rr').value = actualRR ? actualRR + 'R' : '';
        }
    }

    async function saveTrade() {
        AionApp.showLoading('Saving...');
        try {
            const changes = collectFormData();
            const tradesRes = await AionAPI.loadTrades();
            const trades = tradesRes.exists ? tradesRes.content.trades || [] : [];
            const idx = trades.findIndex(t => t.trade_id === currentTrade.trade_id);
            if (idx === -1) throw new Error('Trade not found');

            const historyEntries = [];
            Object.keys(changes).forEach(key => {
                if (trades[idx][key] !== changes[key]) {
                    historyEntries.push({ trade_id: currentTrade.trade_id, field_changed: key, old_value: String(trades[idx][key] || ''), new_value: String(changes[key] || ''), timestamp_utc: new Date().toISOString(), changed_by: AionState.getUserId() });
                }
            });

            Object.assign(trades[idx], changes);

            const validation = AionValidators.validateTrade(trades[idx], setups, [], accounts.find(a => a.account_id === trades[idx].account_id));
            trades[idx].trade_state = validation.state !== trades[idx].trade_state && !['OPEN', 'CLOSED', 'PLANNED'].includes(trades[idx].trade_state) ? validation.state : trades[idx].trade_state;
            if (trades[idx].trade_state === 'CLOSED' && trades[idx].actual_rr !== undefined) {
                trades[idx].trade_status = AionValidators.determineTradeStatus(trades[idx].actual_rr);
            }

            const tradesData = tradesRes.content;
            tradesData.trades = trades;
            tradesData._meta = AionState.updateMeta(tradesData._meta);
            await AionAPI.saveTrades(tradesData, tradesRes.sha);

            if (historyEntries.length > 0) {
                const historyRes = await AionAPI.loadTradeHistory();
                await AionAPI.appendTradeHistory(historyEntries[0], historyRes.exists ? historyRes.content : null, historyRes.sha);
            }

            AionState.invalidateCache('trades');
            AionApp.hideLoading();
            AionApp.showToast('Trade saved', 'success');
            render(currentTrade.trade_id);
        } catch (e) {
            AionApp.hideLoading();
            AionApp.showToast('Save failed: ' + e.message, 'error');
        }
    }

    function collectFormData() {
        return {
            trade_name: document.getElementById('trade-name')?.value || '',
            account_id: document.getElementById('trade-account')?.value || null,
            setup_id: document.getElementById('trade-setup')?.value || null,
            market_type: document.getElementById('trade-market')?.value || null,
            instrument: document.getElementById('trade-instrument')?.value || null,
            direction: document.getElementById('trade-direction')?.value || null,
            session: document.getElementById('trade-session')?.value || null,
            entry_type: document.getElementById('trade-entry-type')?.value || null,
            planned_entry_price: parseFloat(document.getElementById('trade-planned-entry')?.value) || null,
            actual_entry_price: parseFloat(document.getElementById('trade-actual-entry')?.value) || null,
            stop_loss: parseFloat(document.getElementById('trade-sl')?.value) || null,
            take_profit: parseFloat(document.getElementById('trade-tp')?.value) || null,
            risk_pct: parseFloat(document.getElementById('trade-risk-pct')?.value) || null,
            usd_risk: parseFloat(document.getElementById('trade-usd-risk')?.value) || null,
            exit_type: document.getElementById('trade-exit-type')?.value || null,
            exit_price: parseFloat(document.getElementById('trade-exit-price')?.value) || null,
            net_pl: parseFloat(document.getElementById('trade-net-pl')?.value) || null,
            planned_rr: parseFloat(document.getElementById('trade-planned-rr')?.value) || null,
            actual_rr: parseFloat(document.getElementById('trade-actual-rr')?.value?.replace('R', '')) || null
        };
    }

    async function transitionState(newState) {
        const validation = AionValidators.validateStateTransition(currentTrade.trade_state, newState, currentTrade);
        if (!validation.valid) { AionApp.showToast(validation.error, 'error'); return; }

        AionApp.showConfirm('Confirm State Change', `Change state from ${currentTrade.trade_state} to ${newState}?`, async () => {
            currentTrade.trade_state = newState;
            if (newState === 'CLOSED') currentTrade.exit_time_utc = new Date().toISOString();
            await saveTrade();
        });
    }

    return { render, saveTrade, transitionState };
})();
