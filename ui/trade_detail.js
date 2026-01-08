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

        container.innerHTML = '';
        for (let i = 0; i < 5; i++) {
            const skel = document.createElement('div');
            skel.className = 'skeleton h-32 mb-4';
            container.appendChild(skel);
        }

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

            container.innerHTML = ''; // Clear skeleton

            if (!currentTrade) {
                const banner = document.createElement('div');
                banner.className = 'alert-banner danger';
                banner.textContent = 'Trade not found';
                container.appendChild(banner);
                return;
            }

            // Back Button
            const backBtn = createElement('button', 'flex items-center gap-2 text-aion-muted hover:text-aion-text mb-4', 'Back to Trades');
            // Icon
            const iconSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
            iconSvg.setAttribute('class', 'w-5 h-5');
            iconSvg.setAttribute('fill', 'none');
            iconSvg.setAttribute('stroke', 'currentColor');
            iconSvg.setAttribute('viewBox', '0 0 24 24');
            const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            path.setAttribute('stroke-linecap', 'round');
            path.setAttribute('stroke-linejoin', 'round');
            path.setAttribute('stroke-width', '2');
            path.setAttribute('d', 'M10 19l-7-7m0 0l7-7m-7 7h18');
            iconSvg.appendChild(path);
            backBtn.prepend(iconSvg);
            backBtn.onclick = () => AionApp.navigateTo('trades');
            container.appendChild(backBtn);

            if (AionState.isReadOnly()) {
                const banner = document.createElement('div');
                banner.className = 'alert-banner warning mb-6';
                banner.textContent = 'Trade editing disabled in Audit Mode';
                container.appendChild(banner);
            }

            container.appendChild(renderHeader());

            const grid = createElement('div', 'grid grid-cols-1 lg:grid-cols-3 gap-6');

            const leftCol = createElement('div', 'lg:col-span-2 space-y-6');
            leftCol.appendChild(renderCoreData());
            leftCol.appendChild(renderContext());
            leftCol.appendChild(renderExecution());
            leftCol.appendChild(renderPsychology());
            leftCol.appendChild(renderNarrative());
            leftCol.appendChild(renderManagement());
            grid.appendChild(leftCol);

            const rightCol = createElement('div', 'space-y-6');
            rightCol.appendChild(renderStateControl());
            rightCol.appendChild(renderHistory());
            grid.appendChild(rightCol);

            container.appendChild(grid);

            if (AionState.isReadOnly()) {
                container.querySelectorAll('input, select, textarea, button.aion-btn-primary, button.aion-btn-secondary').forEach(el => {
                    if (!el.textContent.includes('Back')) el.disabled = true;
                });
            } else {
                setupFormListeners();
            }
        } catch (e) {
            container.innerHTML = '';
            const banner = document.createElement('div');
            banner.className = 'alert-banner danger';
            banner.textContent = `Failed to load trade: ${e.message}`;
            container.appendChild(banner);
        }
    }

    function createElement(tag, className, text) {
        const el = document.createElement(tag);
        if (className) el.className = className;
        if (text) el.textContent = text;
        return el;
    }

    function renderHeader() {
        const card = createElement('div', 'aion-card mb-6');
        const topRow = createElement('div', 'flex flex-wrap items-center justify-between gap-4');

        const infoDiv = createElement('div', 'flex items-center gap-4');
        infoDiv.appendChild(createElement('span', 'text-2xl font-mono font-bold text-aion-accent', currentTrade.trade_id));
        infoDiv.appendChild(createElement('span', `state-badge state-${currentTrade.trade_state.toLowerCase()}`, currentTrade.trade_state));
        infoDiv.appendChild(createElement('span', `state-badge status-${(currentTrade.trade_status || 'pending').toLowerCase()}`, currentTrade.trade_status || 'PENDING'));
        topRow.appendChild(infoDiv);

        const actionDiv = createElement('div', 'flex gap-2');
        const saveBtn = createElement('button', 'aion-btn aion-btn-primary', 'Save Changes');
        saveBtn.onclick = saveTrade;
        actionDiv.appendChild(saveBtn);
        topRow.appendChild(actionDiv);
        card.appendChild(topRow);

        const nameSection = createElement('div', 'mt-4');
        nameSection.appendChild(createElement('label', 'block text-sm font-medium mb-2', 'Trade Name'));
        const inputGroup = createElement('div', 'flex gap-2');

        const nameInput = createElement('input', 'aion-input flex-1');
        nameInput.type = 'text';
        nameInput.id = 'trade-name';
        nameInput.value = currentTrade.trade_name || '';
        nameInput.placeholder = 'e.g., EURUSD London Long BOS';
        inputGroup.appendChild(nameInput);

        const dropdownWrapper = createElement('div', 'relative');
        const builderBtn = createElement('button', 'aion-btn aion-btn-secondary');
        builderBtn.title = 'Name Builder';
        builderBtn.innerHTML = '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>'; // Icon innerHTML safe (static)

        const dropdown = createElement('div', 'hidden absolute right-0 top-full mt-1 w-64 bg-aion-card border border-aion-border rounded-lg shadow-xl z-10');
        dropdown.id = 'name-builder-dropdown';
        builderBtn.onclick = () => dropdown.classList.toggle('hidden');

        dropdown.appendChild(createElement('div', 'p-2 text-xs text-aion-muted border-b border-aion-border', 'Quick Name Builder'));
        const optionsContainer = createElement('div', 'p-2 flex flex-col gap-1');

        const nameOptions = typeof AionMarketEngine !== 'undefined'
            ? AionMarketEngine.generateTradeNameOptions(currentTrade, setups)
            : [];

        if (nameOptions.length > 0) {
            nameOptions.forEach(opt => {
                const b = createElement('button', 'text-left px-3 py-2 hover:bg-aion-border rounded text-sm', opt);
                b.onclick = () => { document.getElementById('trade-name').value = opt; dropdown.classList.add('hidden'); };
                optionsContainer.appendChild(b);
            });
        } else {
            optionsContainer.appendChild(createElement('p', 'text-xs text-aion-muted p-2', 'Fill instrument, direction, session first'));
        }
        dropdown.appendChild(optionsContainer);

        dropdownWrapper.appendChild(builderBtn);
        dropdownWrapper.appendChild(dropdown);
        inputGroup.appendChild(dropdownWrapper);
        nameSection.appendChild(inputGroup);
        card.appendChild(nameSection);

        return card;
    }

    function createFormGroup(label, element) {
        const div = createElement('div');
        div.appendChild(createElement('label', 'block text-sm font-medium mb-1', label));
        div.appendChild(element);
        return div;
    }

    function renderCoreData() {
        const card = createElement('div', 'aion-card');
        card.appendChild(createElement('h3', 'section-title mb-4', 'Core Trade Data'));
        const grid = createElement('div', 'grid grid-cols-2 md:grid-cols-3 gap-4');

        // Factory for selects
        const createSelect = (id, options, selectedVal) => {
            const s = createElement('select', 'aion-input aion-select');
            s.id = id;
            s.appendChild(createElement('option', '', 'Select...'));
            options.forEach(o => {
                const opt = createElement('option', '', o.label);
                opt.value = o.value;
                if (o.value === selectedVal) opt.selected = true;
                s.appendChild(opt);
            });
            return s;
        };

        // Factory for inputs
        const createInput = (id, type, val, placeholder, step, readonly, className) => {
            const i = createElement('input', className || 'aion-input');
            i.id = id;
            i.type = type;
            if (val !== undefined && val !== null) i.value = val;
            if (placeholder) i.placeholder = placeholder;
            if (step) i.step = step;
            if (readonly) { i.readOnly = true; i.classList.add('bg-aion-bg/50'); }
            return i;
        };

        // Get market config
        const marketType = currentTrade.market_type || 'FOREX';
        const marketConfig = AionValidators.MARKET_FIELD_CONFIG[marketType] || AionValidators.MARKET_FIELD_CONFIG.FOREX;

        // Basic fields
        grid.appendChild(createFormGroup('Account', createSelect('trade-account', accounts.map(a => ({ value: a.account_id, label: `${a.trader_name} (${a.platform})` })), currentTrade.account_id)));
        grid.appendChild(createFormGroup('Setup', createSelect('trade-setup', setups.filter(s => s.setup_status === 'ACTIVE').map(s => ({ value: s.setup_id, label: s.setup_name })), currentTrade.setup_id)));

        // Market Type with change listener
        const marketSelect = createSelect('trade-market', AionValidators.MARKET_TYPES.map(m => ({ value: m, label: m })), currentTrade.market_type);
        marketSelect.addEventListener('change', () => {
            // Re-render the entire page to update dynamic fields
            currentTrade.market_type = marketSelect.value;
            render(currentTrade.trade_id);
        });
        grid.appendChild(createFormGroup('Market Type', marketSelect));

        grid.appendChild(createFormGroup('Instrument', createInput('trade-instrument', 'text', currentTrade.instrument, 'e.g., EURUSD')));
        grid.appendChild(createFormGroup('Direction', createSelect('trade-direction', AionValidators.DIRECTIONS.map(d => ({ value: d, label: d })), currentTrade.direction)));
        grid.appendChild(createFormGroup('Session', createSelect('trade-session', AionValidators.SESSIONS.map(s => ({ value: s, label: s.replace(/_/g, ' ') })), currentTrade.session)));
        grid.appendChild(createFormGroup('Entry Type', createSelect('trade-entry-type', AionValidators.ENTRY_TYPES.map(e => ({ value: e, label: e })), currentTrade.entry_type)));

        card.appendChild(grid);

        // Position Sizing Section
        const posSection = createElement('div', 'mt-6 p-4 bg-aion-bg/30 rounded-lg');
        posSection.appendChild(createElement('h4', 'text-sm font-bold mb-3 text-aion-muted uppercase', 'Position Sizing'));
        const posGrid = createElement('div', 'grid grid-cols-2 md:grid-cols-4 gap-4');

        // Position size field (label changes per market)
        const positionSizeVal = currentTrade[marketConfig.positionSizeField] || '';
        posGrid.appendChild(createFormGroup(marketConfig.positionSizeLabel, createInput('trade-position-size', 'number', positionSizeVal, '0.01', '0.01')));

        // Pip/Point Value (only for Forex, Futures, Indices)
        if (marketConfig.pipPointField) {
            const pipVal = currentTrade[marketConfig.pipPointField] || marketConfig.defaultPipValue || '';
            posGrid.appendChild(createFormGroup(marketConfig.pipPointLabel, createInput('trade-pip-value', 'number', pipVal, '10', '0.01')));
        }

        // Risk fields
        posGrid.appendChild(createFormGroup('Risk %', createInput('trade-risk-pct', 'number', currentTrade.risk_pct, '', '0.01')));
        posGrid.appendChild(createFormGroup('USD Risk', createInput('trade-usd-risk', 'number', currentTrade.usd_risk, '', '0.01')));

        posSection.appendChild(posGrid);

        // Calculate button
        const calcBtnDiv = createElement('div', 'mt-3');
        const calcBtn = createElement('button', 'aion-btn aion-btn-secondary aion-btn-sm', 'Calculate Position Size from Risk');
        calcBtn.onclick = calculatePositionFromRisk;
        calcBtnDiv.appendChild(calcBtn);
        posSection.appendChild(calcBtnDiv);

        card.appendChild(posSection);

        // Entry/Exit Section
        const entrySection = createElement('div', 'mt-6');
        entrySection.appendChild(createElement('h4', 'text-sm font-bold mb-3 text-aion-muted uppercase', 'Entry & Exit'));
        const entryGrid = createElement('div', 'grid grid-cols-2 md:grid-cols-4 gap-4');

        entryGrid.appendChild(createFormGroup('Planned Entry', createInput('trade-planned-entry', 'number', currentTrade.planned_entry_price, '', 'any')));
        entryGrid.appendChild(createFormGroup('Actual Entry', createInput('trade-actual-entry', 'number', currentTrade.actual_entry_price, '', 'any')));
        entryGrid.appendChild(createFormGroup('Stop Loss', createInput('trade-sl', 'number', currentTrade.stop_loss, '', 'any')));
        entryGrid.appendChild(createFormGroup('Take Profit', createInput('trade-tp', 'number', currentTrade.take_profit, '', 'any')));
        entryGrid.appendChild(createFormGroup('Exit Type', createSelect('trade-exit-type', AionValidators.EXIT_TYPES.map(e => ({ value: e, label: e })), currentTrade.exit_type)));
        entryGrid.appendChild(createFormGroup('Exit Price', createInput('trade-exit-price', 'number', currentTrade.exit_price, '', 'any')));

        entrySection.appendChild(entryGrid);
        card.appendChild(entrySection);

        // Calculated Fields Section
        const calcSection = createElement('div', 'mt-6 p-4 bg-aion-accent/10 rounded-lg border border-aion-accent/30');
        calcSection.appendChild(createElement('h4', 'text-sm font-bold mb-3 text-aion-accent uppercase', 'Calculated Values (Auto-updated)'));
        const calcGrid = createElement('div', 'grid grid-cols-2 md:grid-cols-4 gap-4');

        calcGrid.appendChild(createFormGroup('Planned RR', createInput('trade-planned-rr', 'text', currentTrade.planned_rr ? currentTrade.planned_rr + 'R' : '', '', '', true)));
        calcGrid.appendChild(createFormGroup('Actual RR', createInput('trade-actual-rr', 'text', currentTrade.actual_rr ? currentTrade.actual_rr + 'R' : '', '', '', true)));
        calcGrid.appendChild(createFormGroup('Net P&L', createInput('trade-net-pl', 'number', currentTrade.net_pl, '', '0.01', true)));

        calcSection.appendChild(calcGrid);
        card.appendChild(calcSection);

        return card;
    }

    function calculatePositionFromRisk() {
        const selectedAccountId = document.getElementById('trade-account')?.value;
        const account = accounts.find(a => a.account_id === selectedAccountId);
        if (!account) { AionApp.showToast('Select an account first', 'error'); return; }

        const riskPct = parseFloat(document.getElementById('trade-risk-pct')?.value);
        const entry = parseFloat(document.getElementById('trade-actual-entry')?.value) || parseFloat(document.getElementById('trade-planned-entry')?.value);
        const sl = parseFloat(document.getElementById('trade-sl')?.value);
        const pipValue = parseFloat(document.getElementById('trade-pip-value')?.value) || 10;
        const marketType = document.getElementById('trade-market')?.value || 'FOREX';

        const accountBalance = account.current_balance || account.initial_balance || 0;

        const positionSize = AionValidators.calculatePositionSizeFromRisk(accountBalance, riskPct, entry, sl, pipValue, marketType);

        if (positionSize !== null) {
            document.getElementById('trade-position-size').value = positionSize;
            const usdRisk = accountBalance * (riskPct / 100);
            document.getElementById('trade-usd-risk').value = Math.round(usdRisk * 100) / 100;
            AionApp.showToast(`Position size calculated: ${positionSize}`, 'success');
        } else {
            AionApp.showToast('Cannot calculate - check Entry, SL, and Risk %', 'error');
        }
    }


    function renderContext() {
        const card = createElement('div', 'aion-card');
        card.appendChild(createElement('h3', 'section-title mb-4', 'Trade Context'));
        const stack = createElement('div', 'space-y-4');

        const mkInput = (id, val, ph) => { const i = createElement('input', 'aion-input'); i.id = id; i.type = 'text'; i.value = val || ''; i.placeholder = ph; return i; };
        const mkText = (id, val, ph) => { const t = createElement('textarea', 'aion-input aion-textarea'); t.id = id; t.value = val || ''; t.placeholder = ph; return t; };

        stack.appendChild(createFormGroup('Higher TF Bias', mkInput('trade-htf-bias', currentTrade.htf_bias, 'e.g., Bullish on H4')));
        stack.appendChild(createFormGroup('Market Structure', mkText('trade-market-structure', currentTrade.market_structure, 'Describe the market structure...')));
        stack.appendChild(createFormGroup('Liquidity Context', mkText('trade-liquidity', currentTrade.liquidity_context, 'Describe liquidity zones...')));

        const linkInp = mkInput('trade-chart-link', currentTrade.chart_link, 'https://www.tradingview.com/...');
        linkInp.type = 'url';
        stack.appendChild(createFormGroup('External Chart Links', linkInp));

        card.appendChild(stack);
        return card;
    }

    function renderExecution() {
        const card = createElement('div', 'aion-card');
        card.appendChild(createElement('h3', 'section-title mb-4', 'Execution Quality'));
        const grid = createElement('div', 'grid grid-cols-2 md:grid-cols-3 gap-4');

        const mkNum = (id, val) => { const i = createElement('input', 'aion-input'); i.id = id; i.type = 'number'; i.step = '0.1'; if (val) i.value = val; return i; };

        grid.appendChild(createFormGroup('Slippage (pips)', mkNum('trade-slippage', currentTrade.slippage)));
        grid.appendChild(createFormGroup('Spread', mkNum('trade-spread', currentTrade.spread)));

        const newsSel = createElement('select', 'aion-input aion-select');
        newsSel.id = 'trade-news';
        ['', 'Yes', 'No'].forEach(v => { const o = createElement('option', '', v || 'Select...'); o.value = v; if (currentTrade.news_event === v) o.selected = true; newsSel.appendChild(o); });
        grid.appendChild(createFormGroup('News Nearby', newsSel));

        card.appendChild(grid);

        const noteDiv = createElement('div', 'mt-4');
        const notes = createElement('textarea', 'aion-input aion-textarea');
        notes.id = 'trade-exec-notes';
        notes.placeholder = 'Notes about execution...';
        notes.value = currentTrade.execution_notes || '';
        noteDiv.appendChild(createFormGroup('Execution Notes', notes));
        card.appendChild(noteDiv);

        return card;
    }

    function renderPsychology() {
        const card = createElement('div', 'aion-card');
        card.appendChild(createElement('h3', 'section-title mb-4', 'Psychology'));
        const grid = createElement('div', 'grid grid-cols-1 md:grid-cols-2 gap-4');

        const mkSel = (id, val) => {
            const s = createElement('select', 'aion-input aion-select');
            s.id = id;
            s.appendChild(createElement('option', '', 'Select...'));
            AionValidators.EMOTIONS.forEach(e => { const o = createElement('option', '', e); o.value = e; if (val === e) o.selected = true; s.appendChild(o); });
            return s;
        };

        const mkRange = (id, val) => {
            const i = createElement('input', 'emotion-slider w-full');
            i.id = id; i.type = 'range'; i.min = 1; i.max = 10; i.value = val || 5;
            return i;
        };

        grid.appendChild(createFormGroup('Pre-Trade Emotion', mkSel('trade-pre-emotion', currentTrade.pre_trade_emotion)));
        grid.appendChild(createFormGroup('Pre-Trade Intensity', mkRange('trade-pre-intensity', currentTrade.pre_trade_intensity)));
        grid.appendChild(createFormGroup('During Trade Emotion', mkSel('trade-during-emotion', currentTrade.during_trade_emotion)));
        grid.appendChild(createFormGroup('During Intensity', mkRange('trade-during-intensity', currentTrade.during_trade_intensity)));
        grid.appendChild(createFormGroup('Post-Trade Emotion', mkSel('trade-post-emotion', currentTrade.post_trade_emotion)));

        const conf = createElement('input', 'aion-input');
        conf.type = 'number'; conf.min = 1; conf.max = 10; conf.id = 'trade-confidence'; conf.value = currentTrade.confidence_score || '';
        grid.appendChild(createFormGroup('Confidence Score (1-10)', conf));

        card.appendChild(grid);
        return card;
    }

    function renderNarrative() {
        const card = createElement('div', 'aion-card');
        card.appendChild(createElement('h3', 'section-title mb-4', 'Raw Narrative'));
        card.appendChild(createElement('p', 'text-xs text-aion-muted mb-2', 'This field is NEVER edited by AI. Write your raw thoughts here.'));
        const t = createElement('textarea', 'aion-input min-h-[200px]');
        t.id = 'trade-narrative';
        t.placeholder = 'Write your complete trade narrative here...';
        t.value = currentTrade.raw_narrative_text || '';
        card.appendChild(t);
        return card;
    }

    function renderManagement() {
        const card = createElement('div', 'aion-card');
        card.appendChild(createElement('h3', 'section-title mb-4', 'Management Notes'));
        card.appendChild(createElement('p', 'text-xs text-aion-muted mb-2', 'Human notes about trade management. AI summaries allowed here.'));
        const t = createElement('textarea', 'aion-input min-h-[120px]');
        t.id = 'trade-management';
        t.placeholder = 'Notes about how you managed this trade...';
        t.value = currentTrade.management_notes || '';
        card.appendChild(t);
        return card;
    }

    function renderStateControl() {
        const card = createElement('div', 'aion-card');
        card.appendChild(createElement('h3', 'section-title mb-4', 'State Control'));
        const stack = createElement('div', 'space-y-4');

        const currentDiv = createElement('div', 'flex items-center gap-2');
        currentDiv.appendChild(createElement('span', 'text-sm', 'Current:'));
        currentDiv.appendChild(createElement('span', `state-badge state-${currentTrade.trade_state.toLowerCase()}`, currentTrade.trade_state));
        stack.appendChild(currentDiv);

        const transitions = { DRAFT: ['PLANNED'], PLANNED: ['OPEN', 'MISSED'], OPEN: ['CLOSED'], INCOMPLETE: ['DRAFT'], INVALID: ['DRAFT'] };
        const available = transitions[currentTrade.trade_state] || [];

        if (available.length > 0) {
            const btnGroup = createElement('div', 'flex gap-2');
            available.forEach(state => {
                const b = createElement('button', 'aion-btn aion-btn-secondary flex-1', state);
                b.onclick = () => transitionState(state);
                btnGroup.appendChild(b);
            });
            stack.appendChild(btnGroup);
        } else {
            stack.appendChild(createElement('p', 'text-sm text-aion-muted', 'No transitions available'));
        }
        card.appendChild(stack);
        return card;
    }

    function renderHistory() {
        const card = createElement('div', 'aion-card');
        card.appendChild(createElement('h3', 'section-title mb-4', 'History'));

        if (history.length === 0) {
            card.appendChild(createElement('p', 'text-sm text-aion-muted', 'No changes recorded yet'));
        } else {
            const stack = createElement('div', 'space-y-2');
            history.slice(-10).reverse().forEach(h => {
                const item = createElement('div', 'history-item');
                item.appendChild(createElement('div', 'history-item-time', AionApp.formatDate(h.timestamp_utc, 'full')));
                const content = createElement('div', 'history-item-content');

                const fieldSpan = createElement('span', 'font-medium', h.field_changed);
                content.appendChild(fieldSpan);
                content.appendChild(document.createTextNode(`: ${h.old_value || 'empty'} → ${h.new_value}`));

                item.appendChild(content);
                stack.appendChild(item);
            });
            card.appendChild(stack);
        }
        return card;
    }

    function setupFormListeners() {
        const priceFields = ['trade-planned-entry', 'trade-actual-entry', 'trade-sl', 'trade-tp', 'trade-exit-price', 'trade-direction', 'trade-position-size', 'trade-pip-value'];
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
        const marketType = document.getElementById('trade-market')?.value || 'FOREX';
        const positionSize = parseFloat(document.getElementById('trade-position-size')?.value);
        const pipValue = parseFloat(document.getElementById('trade-pip-value')?.value) || 10;

        // Calculate Planned RR
        if (entry && sl && tp) {
            const plannedRR = AionValidators.calculateRR(entry, sl, tp, direction);
            document.getElementById('trade-planned-rr').value = plannedRR ? plannedRR + 'R' : '';
        }

        // Calculate Actual RR
        if (entry && sl && exitPrice) {
            const actualRR = AionValidators.calculateActualRR(entry, sl, exitPrice, direction);
            document.getElementById('trade-actual-rr').value = actualRR ? actualRR + 'R' : '';

            // Calculate Net P&L if we have position size
            if (positionSize) {
                const netPL = AionValidators.calculatePnL(entry, exitPrice, positionSize, pipValue, direction, marketType);
                if (netPL !== null) {
                    document.getElementById('trade-net-pl').value = netPL;
                }
            }
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
                // loose comparison for numbers/strings overlap often found in forms
                if (String(trades[idx][key]) !== String(changes[key])) {
                    // Only record if actual change
                    if (trades[idx][key] !== changes[key] && (trades[idx][key] || changes[key])) {
                        historyEntries.push({ trade_id: currentTrade.trade_id, field_changed: key, old_value: String(trades[idx][key] || ''), new_value: String(changes[key] || ''), timestamp_utc: new Date().toISOString(), changed_by: AionState.getUserId() });
                    }
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
        // Read raw values first
        const entry = parseFloat(document.getElementById('trade-actual-entry')?.value) || parseFloat(document.getElementById('trade-planned-entry')?.value);
        const sl = parseFloat(document.getElementById('trade-sl')?.value);
        const tp = parseFloat(document.getElementById('trade-tp')?.value);
        const exit = parseFloat(document.getElementById('trade-exit-price')?.value);
        const direction = document.getElementById('trade-direction')?.value;
        const marketType = document.getElementById('trade-market')?.value || 'FOREX';
        const positionSize = parseFloat(document.getElementById('trade-position-size')?.value) || null;
        const pipValue = parseFloat(document.getElementById('trade-pip-value')?.value) || null;

        // Calculate derived values directly to avoid UI staleness
        const plannedRR = AionValidators.calculateRR(entry, sl, tp, direction);
        const actualRR = AionValidators.calculateActualRR(entry, sl, exit, direction);

        // Calculate P&L if we have all required data
        let netPL = parseFloat(document.getElementById('trade-net-pl')?.value) || null;
        if (exit && positionSize && !netPL) {
            netPL = AionValidators.calculatePnL(entry, exit, positionSize, pipValue, direction, marketType);
        }

        // Get market config for field mapping
        const marketConfig = AionValidators.MARKET_FIELD_CONFIG[marketType] || AionValidators.MARKET_FIELD_CONFIG.FOREX;

        // Build base data
        const data = {
            trade_name: document.getElementById('trade-name')?.value || '',
            account_id: document.getElementById('trade-account')?.value || null,
            setup_id: document.getElementById('trade-setup')?.value || null,
            market_type: marketType,
            instrument: document.getElementById('trade-instrument')?.value || null,
            direction: direction || null,
            session: document.getElementById('trade-session')?.value || null,
            entry_type: document.getElementById('trade-entry-type')?.value || null,
            planned_entry_price: parseFloat(document.getElementById('trade-planned-entry')?.value) || null,
            actual_entry_price: parseFloat(document.getElementById('trade-actual-entry')?.value) || null,
            stop_loss: sl || null,
            take_profit: tp || null,
            risk_pct: parseFloat(document.getElementById('trade-risk-pct')?.value) || null,
            usd_risk: parseFloat(document.getElementById('trade-usd-risk')?.value) || null,
            exit_type: document.getElementById('trade-exit-type')?.value || null,
            exit_price: exit || null,
            net_pl: netPL,
            planned_rr: plannedRR,
            actual_rr: actualRR,
            pre_trade_emotion: document.getElementById('trade-pre-emotion')?.value || null,
            pre_trade_intensity: parseInt(document.getElementById('trade-pre-intensity')?.value) || null,
            during_trade_emotion: document.getElementById('trade-during-emotion')?.value || null,
            during_trade_intensity: parseInt(document.getElementById('trade-during-intensity')?.value) || null,
            post_trade_emotion: document.getElementById('trade-post-emotion')?.value || null,
            confidence_score: parseInt(document.getElementById('trade-confidence')?.value) || null,
            htf_bias: document.getElementById('trade-htf-bias')?.value || '',
            market_structure: document.getElementById('trade-market-structure')?.value || '',
            liquidity_context: document.getElementById('trade-liquidity')?.value || '',
            chart_link: document.getElementById('trade-chart-link')?.value || '',
            slippage: parseFloat(document.getElementById('trade-slippage')?.value) || null,
            spread: parseFloat(document.getElementById('trade-spread')?.value) || null,
            news_event: document.getElementById('trade-news')?.value || null,
            execution_notes: document.getElementById('trade-exec-notes')?.value || '',
            raw_narrative_text: document.getElementById('trade-narrative')?.value || '',
            management_notes: document.getElementById('trade-management')?.value || ''
        };

        // Add position size field based on market type
        if (marketConfig.positionSizeField) {
            data[marketConfig.positionSizeField] = positionSize;
        }

        // Add pip/point value if applicable
        if (marketConfig.pipPointField && pipValue) {
            data[marketConfig.pipPointField] = pipValue;
        }

        return data;
    }

    async function transitionState(newState) {
        const validation = AionValidators.validateStateTransition(currentTrade.trade_state, newState, currentTrade);
        if (!validation.valid) { AionApp.showToast(validation.error, 'error'); return; }

        AionApp.showConfirm('Confirm State Change', `Change state from ${currentTrade.trade_state} to ${newState}?`, async () => {
            currentTrade.trade_state = newState;
            if (newState === 'OPEN' && !currentTrade.entry_time_utc) currentTrade.entry_time_utc = new Date().toISOString();
            if (newState === 'CLOSED') currentTrade.exit_time_utc = new Date().toISOString();
            await saveTrade();
        });
    }

    return { render, saveTrade, transitionState };
})();
