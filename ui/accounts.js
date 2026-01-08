/**
 * AION Journal OS - Accounts Management
 */

const AionAccounts = (function () {
    'use strict';

    let accounts = [];
    let currentSha = null;

    async function render() {
        const container = document.getElementById('page-accounts');
        container.innerHTML = '';
        const skel = document.createElement('div');
        skel.className = 'skeleton h-64';
        container.appendChild(skel);

        try {
            const result = await AionAPI.loadAccounts();
            accounts = result.exists ? result.content.accounts || [] : [];
            currentSha = result.sha;

            container.innerHTML = ''; // Clear skeleton

            // Header
            const header = createElement('div', 'section-header mb-6');
            header.appendChild(createElement('h2', 'text-2xl font-bold', 'Trading Accounts'));

            const newBtn = createElement('button', 'aion-btn aion-btn-primary', 'New Account');
            const iconSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
            iconSvg.setAttribute('class', 'w-5 h-5');
            iconSvg.setAttribute('fill', 'none');
            iconSvg.setAttribute('stroke', 'currentColor');
            iconSvg.setAttribute('viewBox', '0 0 24 24');
            const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            path.setAttribute('stroke-linecap', 'round');
            path.setAttribute('stroke-linejoin', 'round');
            path.setAttribute('stroke-width', '2');
            path.setAttribute('d', 'M12 4v16m8-8H4');
            iconSvg.appendChild(path);
            newBtn.prepend(iconSvg);

            newBtn.onclick = showNewAccountForm;
            header.appendChild(newBtn);
            container.appendChild(header);

            const formContainer = createElement('div');
            formContainer.id = 'account-form-container';
            container.appendChild(formContainer);

            const listContainer = createElement('div');
            listContainer.id = 'accounts-list';
            renderAccountsList(listContainer);
            container.appendChild(listContainer);

        } catch (e) {
            container.innerHTML = '';
            const banner = document.createElement('div');
            banner.className = 'alert-banner danger';
            banner.textContent = `Failed to load accounts: ${e.message}`;
            container.appendChild(banner);
        }
    }

    function createElement(tag, className, text) {
        const el = document.createElement(tag);
        if (className) el.className = className;
        if (text) el.textContent = text;
        return el;
    }

    function renderAccountsList(container) {
        container.innerHTML = '';
        if (accounts.length === 0) {
            const card = createElement('div', 'aion-card');
            const emptyState = createElement('div', 'empty-state');

            const icon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
            icon.setAttribute('class', 'empty-state-icon');
            icon.setAttribute('fill', 'none');
            icon.setAttribute('stroke', 'currentColor');
            icon.setAttribute('viewBox', '0 0 24 24');
            const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            path.setAttribute('stroke-linecap', 'round');
            path.setAttribute('stroke-linejoin', 'round');
            path.setAttribute('stroke-width', '1.5');
            path.setAttribute('d', 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4');
            icon.appendChild(path);

            emptyState.appendChild(icon);
            emptyState.appendChild(createElement('h4', 'empty-state-title', 'No accounts added'));
            emptyState.appendChild(createElement('p', 'empty-state-text', 'Add your trading accounts to track performance separately'));

            card.appendChild(emptyState);
            container.appendChild(card);
            return;
        }

        const grid = createElement('div', 'grid grid-cols-1 md:grid-cols-2 gap-6');
        accounts.forEach(a => grid.appendChild(renderAccountCard(a)));
        container.appendChild(grid);
    }

    function renderAccountCard(account) {
        const typeClass = account.account_type === 'LIVE' ? 'text-aion-success' : 'text-blue-400';
        const statusClass = account.status === 'ACTIVE' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400';

        const card = createElement('div', 'aion-card hover:border-aion-accent transition-colors');

        const header = createElement('div', 'flex items-start justify-between mb-4');
        const titleDiv = createElement('div');
        titleDiv.appendChild(createElement('h4', 'font-bold text-lg', account.account_name));
        titleDiv.appendChild(createElement('p', 'text-sm text-aion-muted', `${account.broker || 'Unknown Broker'} • ${account.platform || 'Unknown Platform'}`));
        header.appendChild(titleDiv);
        header.appendChild(createElement('span', `px-2 py-1 rounded text-xs font-bold ${statusClass}`, account.status));
        card.appendChild(header);

        const detailsGrid = createElement('div', 'grid grid-cols-2 gap-4 mb-4 bg-aion-bg/50 p-4 rounded-lg');

        const addDetail = (label, value, valueClass) => {
            const div = createElement('div');
            div.appendChild(createElement('div', 'text-xs text-aion-muted', label));
            div.appendChild(createElement('div', `font-medium ${valueClass || ''}`, value));
            detailsGrid.appendChild(div);
        };

        addDetail('Account Type', account.account_type, typeClass);
        addDetail('Currency', account.currency);
        addDetail('Initial Balance', AionApp.formatCurrency(account.initial_balance));
        addDetail('Current Balance', AionApp.formatCurrency(account.current_balance || account.initial_balance));

        card.appendChild(detailsGrid);

        if (account.limits) {
            card.appendChild(renderAccountLimits(account.limits));
        }

        const btnGroup = createElement('div', 'flex gap-2 mt-4');
        const editBtn = createElement('button', 'flex-1 aion-btn aion-btn-sm aion-btn-secondary', 'Edit');
        editBtn.onclick = () => editAccount(account.account_id);
        btnGroup.appendChild(editBtn);

        const statusBtn = createElement('button', `aion-btn aion-btn-sm ${account.status === 'ACTIVE' ? 'aion-btn-danger' : 'aion-btn-primary'}`, account.status === 'ACTIVE' ? 'Retire' : 'Re-activate');
        statusBtn.onclick = () => updateStatus(account.account_id, account.status === 'ACTIVE' ? 'RETIRED' : 'ACTIVE');
        btnGroup.appendChild(statusBtn);

        card.appendChild(btnGroup);

        return card;
    }

    function renderAccountLimits(l) {
        const container = createElement('div', 'border-t border-aion-border pt-4 mt-2');
        container.appendChild(createElement('h5', 'text-xs font-bold text-aion-muted uppercase mb-2', 'Account Limits'));
        const space = createElement('div', 'space-y-1 text-sm');

        const addLimit = (label, val, colorClass) => {
            if (!val) return;
            const row = createElement('div', 'flex justify-between');
            row.appendChild(createElement('span', '', label));
            row.appendChild(createElement('span', colorClass, val));
            space.appendChild(row);
        };

        addLimit('Daily Loss Limit:', l.daily_loss_limit, 'text-red-400');
        addLimit('Max Drawdown:', l.max_drawdown, 'text-red-400');
        addLimit('Profit Target:', l.profit_target, 'text-green-400');

        container.appendChild(space);
        return container;
    }

    function showNewAccountForm() {
        const container = document.getElementById('account-form-container');
        container.innerHTML = '';
        container.appendChild(renderAccountForm());
    }

    function editAccount(id) {
        const account = accounts.find(a => a.account_id === id);
        if (account) {
            const container = document.getElementById('account-form-container');
            container.innerHTML = '';
            container.appendChild(renderAccountForm(account));
        }
    }

    function renderAccountForm(account = null) {
        const isEdit = account !== null;

        const card = createElement('div', 'aion-card mb-6 border-l-4 border-aion-accent');
        card.appendChild(createElement('h3', 'section-title mb-4', `${isEdit ? 'Edit' : 'New'} Account`));

        const grid = createElement('div', 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4');

        const createInputGroup = (label, id, val, ph, type = 'text', options = null) => {
            const div = createElement('div');
            div.appendChild(createElement('label', 'block text-sm font-medium mb-1', label));
            if (options) {
                const select = createElement('select', 'aion-input aion-select');
                select.id = id;

                // Helper to add option
                const addOption = (parent, label, value) => {
                    const o = createElement('option', '', label);
                    o.value = value || label; // Use label as value if value not provided
                    if (val === o.value) o.selected = true;
                    parent.appendChild(o);
                };

                options.forEach(opt => {
                    if (opt.options) {
                        // It's a group
                        const group = createElement('optgroup');
                        group.label = opt.label;
                        opt.options.forEach(subOpt => {
                            // SubOpt can be string or object {label, value}
                            const label = typeof subOpt === 'string' ? subOpt : subOpt.label;
                            const value = typeof subOpt === 'string' ? subOpt : subOpt.value;
                            addOption(group, label, value);
                        });
                        select.appendChild(group);
                    } else {
                        // Regular option
                        addOption(select, opt.label, opt.value);
                    }
                });
                div.appendChild(select);
            } else {
                const input = createElement('input', 'aion-input');
                input.id = id;
                input.type = type;
                if (val) input.value = val;
                if (ph) input.placeholder = ph;
                div.appendChild(input);
            }
            return div;
        };

        grid.appendChild(createInputGroup('Account Name', 'acc-name', account?.account_name || '', 'e.g. FTMO Challenge 100k'));
        grid.appendChild(createInputGroup('Broker / Prop Firm', 'acc-broker', account?.broker || '', 'e.g. FTMO, IC Markets'));

        grid.appendChild(createInputGroup('Platform', 'acc-platform', account?.platform, '', 'text', [
            // UNIVERSAL / MULTI-ASSET TERMINALS
            {
                label: "UNIVERSAL / MULTI-ASSET TERMINALS",
                options: [
                    "MetaTrader 4 (MT4)", "MetaTrader 5 (MT5)", "cTrader", "TradingView", "NinjaTrader",
                    "ProRealTime", "MultiCharts", "Sierra Chart", "Thinkorswim", "xStation", "eSignal", "IQFeed"
                ]
            },
            // BROKER / RETAIL PROPRIETARY PLATFORMS
            {
                label: "BROKER / RETAIL PROPRIETARY PLATFORMS",
                options: [
                    "OANDA fxTrade", "OANDA Platform", "FOREX.com Advanced Trader", "FXCM Trading Station",
                    "IG Trading Platform", "CMC Markets Next Generation", "SaxoTraderGO", "SaxoTraderPRO",
                    "Pepperstone Platform", "ThinkTrader", "Capital.com Platform", "Plus500 Platform",
                    "eToro Platform", "City Index Platform", "AvaTrade Platform", "ActivTrader",
                    "Markets.com Platform", "RoboForex R Trader", "FxPro Platform", "Alpari Platform Suite",
                    "Swissquote Platform", "Dukascopy JForex"
                ]
            },
            // INSTITUTIONAL FX / ECN / MARKET ACCESS
            {
                label: "INSTITUTIONAL FX / ECN / MARKET ACCESS",
                options: [
                    "LMAX Exchange", "Currenex", "Fortex", "FastMatch", "360T", "Hotspot FX", "EBS",
                    "Reuters Matching", "Cboe FX", "Integral FX Inside", "Integral Fixo"
                ]
            },
            // FUTURES / OPTIONS / COMMODITIES PLATFORMS
            {
                label: "FUTURES / OPTIONS / COMMODITIES PLATFORMS",
                options: [
                    "CQG", "Rithmic", "Trading Technologies (TT)", "CME Globex", "ICE Trading Platform",
                    "Eurex", "Cboe Options Platform"
                ]
            },
            // EQUITIES / PROFESSIONAL EMS / OMS
            {
                label: "EQUITIES / PROFESSIONAL EMS / OMS",
                options: [
                    "Bloomberg Terminal", "Bloomberg FXGO", "Bloomberg EMSX", "Bloomberg AIM",
                    "Refinitiv Eikon", "Refinitiv Workspace", "FlexTrade", "Portware", "Eze OMS",
                    "Sterling Trader", "Liquidnet"
                ]
            },
            // FIXED INCOME / BONDS
            {
                label: "FIXED INCOME / BONDS",
                options: [
                    "Tradeweb", "MarketAxess", "MTS"
                ]
            },
            // CRYPTO EXCHANGES (CENTRALIZED)
            {
                label: "CRYPTO EXCHANGES (CENTRALIZED)",
                options: [
                    "Binance", "Coinbase", "Coinbase Pro", "Kraken", "Bitfinex", "Bybit", "OKX",
                    "Huobi", "Gate.io", "Bitstamp", "KuCoin", "Gemini"
                ]
            },
            // CRYPTO DERIVATIVES / DEXs
            {
                label: "CRYPTO DERIVATIVES / DEXs",
                options: [
                    "dYdX", "GMX", "Uniswap", "SushiSwap", "PancakeSwap", "Curve", "Balancer"
                ]
            },
            // CRYPTO TRADING TERMINALS / AGGREGATORS
            {
                label: "CRYPTO TRADING TERMINALS / AGGREGATORS",
                options: [
                    "Coinigy", "Altrady", "3Commas", "TabTrader", "Zapper", "Zerion", "1inch", "Paraswap"
                ]
            },
            // WHITE-LABEL / BROKER ENGINES
            {
                label: "WHITE-LABEL / BROKER ENGINES",
                options: [
                    "B2Trader", "B2Core", "B2BX", "Match-Trader", "XOH Trader", "WOW Trader"
                ]
            },
            // DATA / CHARTING / AUTOMATION TOOLS
            {
                label: "DATA / CHARTING / AUTOMATION TOOLS",
                options: [
                    "TrendSpider", "Sirix"
                ]
            },
            // MULTI-MARKET / BROKER WORKSTATIONS
            {
                label: "MULTI-MARKET / BROKER WORKSTATIONS",
                options: [
                    "Trader Workstation (TWS)"
                ]
            },
            // APIs / ALGO / EXECUTION FRAMEWORKS
            {
                label: "APIs / ALGO / EXECUTION FRAMEWORKS",
                options: [
                    "Interactive Brokers API", "Saxo OpenAPI", "OANDA API", "FXCM API", "FIX Protocol",
                    "QuantConnect", "Backtrader"
                ]
            },
            // ADDITIONAL NAMES MENTIONED
            {
                label: "ADDITIONAL",
                options: [
                    "ThinkMarkets Platform", "IG Platform", "FOREX.com Platform"
                ]
            },
            // OTHER
            {
                label: "OTHER",
                options: [
                    { value: 'Other', label: 'Other/Custom' }
                ]
            }
        ]));

        grid.appendChild(createInputGroup('Account Type', 'acc-type', account?.account_type, '', 'text', [
            { value: 'DEMO', label: 'Demo / Paper' },
            { value: 'LIVE', label: 'Live' },
            { value: 'CHALLENGE', label: 'Challenge (Prop)' },
            { value: 'FUNDED', label: 'Funded (Prop)' }
        ]));

        grid.appendChild(createInputGroup('Currency', 'acc-currency', account?.currency || 'USD', 'USD, EUR, GBP'));
        grid.appendChild(createInputGroup('Initial Balance', 'acc-balance', account?.initial_balance || '', '0.00', 'number'));

        card.appendChild(grid);

        const limitsContainer = createElement('div', 'bg-aion-bg/30 p-4 rounded-lg mb-4');
        limitsContainer.appendChild(createElement('h4', 'text-sm font-bold mb-3 text-aion-muted uppercase', 'Broker Limits / Rules'));
        const limitsGrid = createElement('div', 'grid grid-cols-1 md:grid-cols-3 gap-4');

        limitsGrid.appendChild(createInputGroup('Daily Loss Limit (Amount/%)', 'acc-limit-daily', account?.limits?.daily_loss_limit || '', 'e.g. 5000 or 5%'));
        limitsGrid.appendChild(createInputGroup('Max Total Drawdown', 'acc-limit-dd', account?.limits?.max_drawdown || '', 'e.g. 10000 or 10%'));
        limitsGrid.appendChild(createInputGroup('Profit Target', 'acc-limit-target', account?.limits?.profit_target || '', 'e.g. 10%'));

        limitsContainer.appendChild(limitsGrid);
        card.appendChild(limitsContainer);

        const btnGroup = createElement('div', 'flex gap-3');
        const saveBtn = createElement('button', 'aion-btn aion-btn-primary', isEdit ? 'Update Account' : 'Create Account');
        saveBtn.onclick = () => saveAccount(isEdit ? account.account_id : null);
        btnGroup.appendChild(saveBtn);

        const cancelBtn = createElement('button', 'aion-btn aion-btn-secondary', 'Cancel');
        cancelBtn.onclick = hideForm;
        btnGroup.appendChild(cancelBtn);

        card.appendChild(btnGroup);
        return card;
    }

    function hideForm() {
        document.getElementById('account-form-container').innerHTML = '';
    }

    async function saveAccount(id) {
        AionApp.showLoading('Saving account...');
        try {
            const name = document.getElementById('acc-name').value;
            if (!name) throw new Error('Account Name is required');

            const data = {
                account_name: name,
                broker: document.getElementById('acc-broker').value,
                platform: document.getElementById('acc-platform').value,
                account_type: document.getElementById('acc-type').value,
                currency: document.getElementById('acc-currency').value,
                initial_balance: parseFloat(document.getElementById('acc-balance').value) || 0,
                status: 'ACTIVE', // Default to active on creation/edit unless changed elsewhere
                limits: {
                    daily_loss_limit: document.getElementById('acc-limit-daily').value,
                    max_drawdown: document.getElementById('acc-limit-dd').value,
                    profit_target: document.getElementById('acc-limit-target').value
                },
                // Preserve existing fields if editing
                current_balance: id ? accounts.find(a => a.account_id === id).current_balance : parseFloat(document.getElementById('acc-balance').value) || 0,
                created_at: id ? accounts.find(a => a.account_id === id).created_at : new Date().toISOString()
            };

            // For trader_name compatibility with rules.js
            data.trader_name = data.account_name;

            const result = await AionAPI.loadAccounts();
            const existingAccounts = result.exists ? result.content.accounts || [] : [];
            let newAccounts = [...existingAccounts];

            if (id) {
                const index = newAccounts.findIndex(a => a.account_id === id);
                if (index !== -1) {
                    newAccounts[index] = { ...newAccounts[index], ...data };
                }
            } else {
                data.account_id = AionValidators.generateId('ACC-', newAccounts, 'account_id');
                newAccounts.push(data);
            }

            const content = result.exists ? result.content : { _meta: AionState.createMeta(), accounts: [] };
            content.accounts = newAccounts;
            content._meta = AionState.updateMeta(content._meta);

            await AionAPI.saveAccounts(content, result.sha);
            AionState.invalidateCache('accounts');
            AionApp.hideLoading();
            AionApp.showToast('Account saved successfully', 'success');
            render();
        } catch (e) {
            AionApp.hideLoading();
            AionApp.showToast(e.message, 'error');
        }
    }

    async function updateStatus(id, status) {
        AionApp.showLoading('Updating status...');
        try {
            const result = await AionAPI.loadAccounts();
            const list = result.exists ? result.content.accounts || [] : [];
            const idx = list.findIndex(a => a.account_id === id);

            if (idx !== -1) {
                list[idx].status = status;
                const content = { ...result.content, accounts: list, _meta: AionState.updateMeta(result.content?._meta) };
                await AionAPI.saveAccounts(content, result.sha);
                AionState.invalidateCache('accounts');
                render();
            }
            AionApp.hideLoading();
        } catch (e) {
            AionApp.showLoading();
            AionApp.showToast(e.message, 'error');
        }
    }

    return { render, showNewAccountForm, hideForm, saveAccount, editAccount, updateStatus };
})();
