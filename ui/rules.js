/**
 * AION Journal OS - Rules Page
 */

const AionRules = (function () {
    'use strict';

    let rules = [];
    let accounts = [];
    let currentSha = null;
    let currentViolations = [];

    async function render() {
        const container = document.getElementById('page-rules');
        container.innerHTML = '';
        const skel = document.createElement('div');
        skel.className = 'skeleton h-64';
        container.appendChild(skel);

        try {
            const [rulesRes, accountsRes, violationsRes] = await Promise.all([
                AionAPI.loadRules(), AionAPI.loadAccounts(), AionAPI.loadRuleViolations()
            ]);

            rules = rulesRes.exists ? rulesRes.content.rules || [] : [];
            accounts = accountsRes.exists ? accountsRes.content.accounts || [] : [];
            currentSha = rulesRes.sha;
            currentViolations = violationsRes.exists ? violationsRes.content.violations || [] : [];

            container.innerHTML = ''; // Clear skeleton

            // Header
            const header = createElement('div', 'section-header mb-6');
            header.appendChild(createElement('h2', 'text-2xl font-bold', 'Trading Rules'));

            const newBtn = createElement('button', 'aion-btn aion-btn-primary', 'New Rule Set');
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

            newBtn.onclick = showNewRuleForm;
            header.appendChild(newBtn);
            container.appendChild(header);

            // Violations Summary
            if (currentViolations.length > 0) {
                container.appendChild(renderViolationsSummary(currentViolations));
            }

            // Form Container
            const formContainer = createElement('div');
            formContainer.id = 'rule-form-container';
            container.appendChild(formContainer);

            // Rules List
            const listContainer = createElement('div');
            listContainer.id = 'rules-list';
            renderRulesList(listContainer);
            container.appendChild(listContainer);

        } catch (e) {
            container.innerHTML = '';
            const banner = document.createElement('div');
            banner.className = 'alert-banner danger';
            banner.textContent = `Failed to load rules: ${e.message}`;
            container.appendChild(banner);
        }
    }

    function createElement(tag, className, text) {
        const el = document.createElement(tag);
        if (className) el.className = className;
        if (text) el.textContent = text;
        return el;
    }

    function renderViolationsSummary(violations) {
        const card = createElement('div', 'aion-card mb-6');
        card.appendChild(createElement('h3', 'section-title mb-4', `Recent Violations (${violations.length} total)`));

        const list = createElement('div', 'space-y-2');
        const recent = violations.slice(-10).reverse();

        recent.forEach(v => {
            const item = createElement('div', 'flex items-center gap-3 p-2 rounded bg-red-500/10 border border-red-500/20');
            item.appendChild(createElement('span', 'text-xs font-mono text-aion-muted', v.trade_id));
            item.appendChild(createElement('span', 'flex-1 text-sm', `${v.rule_breached}: ${v.description}`));
            item.appendChild(createElement('span', 'text-xs text-red-400', v.severity));
            list.appendChild(item);
        });

        card.appendChild(list);
        return card;
    }

    function renderRulesList(container) {
        container.innerHTML = '';
        if (rules.length === 0) {
            const card = createElement('div', 'aion-card');
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
            path.setAttribute('d', 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z');
            icon.appendChild(path);

            empty.appendChild(icon);
            empty.appendChild(createElement('h4', 'empty-state-title', 'No rules defined'));
            empty.appendChild(createElement('p', 'empty-state-text', 'Create risk management rules for your accounts'));

            card.appendChild(empty);
            container.appendChild(card);
            return;
        }

        const space = createElement('div', 'space-y-4');
        rules.forEach(r => space.appendChild(renderRuleCard(r)));
        container.appendChild(space);
    }

    function renderRuleCard(rule) {
        const account = accounts.find(a => a.account_id === rule.account_id);
        const card = createElement('div', 'aion-card');

        // Header
        const header = createElement('div', 'flex items-start justify-between mb-4');
        const titleDiv = createElement('div');
        titleDiv.appendChild(createElement('h4', 'font-semibold', account?.trader_name || 'Unknown Account'));
        titleDiv.appendChild(createElement('p', 'text-sm text-aion-muted', `${account?.platform || ''} - ${account?.account_type || ''}`));
        header.appendChild(titleDiv);

        const enfClass = rule.enforcement_level === 'STRICT' ? 'text-red-400' : rule.enforcement_level === 'WARNING' ? 'text-yellow-400' : 'text-blue-400';
        header.appendChild(createElement('span', `text-xs font-medium ${enfClass}`, rule.enforcement_level));
        card.appendChild(header);

        // Grid
        const grid = createElement('div', 'grid grid-cols-2 md:grid-cols-4 gap-4 mb-4');

        const createMetric = (val, label) => {
            const div = createElement('div', 'text-center p-3 bg-aion-bg rounded-lg');
            div.appendChild(createElement('div', 'text-lg font-bold', val));
            div.appendChild(createElement('div', 'text-xs text-aion-muted', label));
            return div;
        };

        grid.appendChild(createMetric(`${rule.max_risk_per_trade_pct || '-'}%`, 'Max Risk/Trade'));
        grid.appendChild(createMetric(`${rule.max_daily_loss_pct || '-'}%`, 'Max Daily Loss'));
        grid.appendChild(createMetric(`${rule.max_open_risk_pct || '-'}%`, 'Max Open Risk'));
        grid.appendChild(createMetric(`${rule.minimum_rr || '-'}R`, 'Min RR'));
        card.appendChild(grid);

        // Custom Rules
        if (rule.stop_loss_rule || rule.take_profit_rule || rule.session_rule) {
            const customDiv = createElement('div', 'text-sm text-aion-muted space-y-1 mb-4');

            const addRule = (label, val) => {
                if (!val) return;
                const r = createElement('div');
                const s = createElement('span', 'font-medium', `${label}: `);
                r.appendChild(s);
                r.appendChild(document.createTextNode(val));
                customDiv.appendChild(r);
            };

            addRule('SL Rule', rule.stop_loss_rule);
            addRule('TP Rule', rule.take_profit_rule);
            addRule('Session', rule.session_rule);
            card.appendChild(customDiv);
        }

        const editBtn = createElement('button', 'aion-btn aion-btn-secondary text-sm', 'Edit Rules');
        editBtn.onclick = () => editRule(rule.rule_id);
        card.appendChild(editBtn);

        return card;
    }

    function showNewRuleForm() {
        const container = document.getElementById('rule-form-container');
        container.innerHTML = '';
        container.appendChild(renderRuleForm());
    }

    function editRule(ruleId) {
        const rule = rules.find(r => r.rule_id === ruleId);
        if (rule) {
            const container = document.getElementById('rule-form-container');
            container.innerHTML = '';
            container.appendChild(renderRuleForm(rule));
        }
    }

    function renderRuleForm(rule = null) {
        const isEdit = rule !== null;
        const card = createElement('div', 'aion-card mb-6');
        card.appendChild(createElement('h3', 'section-title mb-4', `${isEdit ? 'Edit' : 'New'} Rule Set`));

        const grid = createElement('div', 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4');

        // Inputs helper
        const createInput = (label, id, type, val, placeholder, colSpan) => {
            const div = createElement('div');
            if (colSpan) div.className = colSpan;
            div.appendChild(createElement('label', 'block text-sm font-medium mb-1', label));

            let input;
            if (type === 'textarea') {
                input = createElement('textarea', 'aion-input');
            } else if (type === 'select') {
                input = createElement('select', 'aion-input aion-select');
            } else {
                input = createElement('input', 'aion-input');
                input.type = type;
            }

            input.id = id;
            if (val !== undefined && val !== null) input.value = val;
            if (placeholder) input.placeholder = placeholder;

            div.appendChild(input);
            return { div, input };
        };

        // Account Select
        const accGroup = createInput('Account', 'rule-account', 'select');
        accGroup.input.appendChild(createElement('option', '', 'Select...'));
        accounts.forEach(a => {
            const opt = createElement('option', '', `${a.trader_name} (${a.platform})`);
            opt.value = a.account_id;
            if (rule?.account_id === a.account_id) opt.selected = true;
            accGroup.input.appendChild(opt);
        });
        if (isEdit) accGroup.input.disabled = true;
        grid.appendChild(accGroup.div);

        // Enforcement Select
        const enfGroup = createInput('Enforcement', 'rule-enforcement', 'select');
        AionValidators.ENFORCEMENT_LEVELS.forEach(e => {
            const opt = createElement('option', '', e);
            opt.value = e;
            if (rule?.enforcement_level === e) opt.selected = true;
            enfGroup.input.appendChild(opt);
        });
        grid.appendChild(enfGroup.div);

        grid.appendChild(createInput('Max Risk/Trade %', 'rule-max-risk', 'number', rule?.max_risk_per_trade_pct, '', '').div);
        document.getElementById('rule-max-risk')?.setAttribute('step', '0.1'); // Helper function doesn't set attr directly on return, fixed by accessing element after append? No, element not in DOM yet. 
        // Better way: helper returns input element, we set attribute on it.
        // Let's refine the loop below or manually set attributes.

        const inputs = [
            { l: 'Max Daily Loss %', i: 'rule-max-daily', t: 'number', v: rule?.max_daily_loss_pct, step: '0.1' },
            { l: 'Max Open Risk %', i: 'rule-max-open', t: 'number', v: rule?.max_open_risk_pct, step: '0.1' },
            { l: 'Minimum RR', i: 'rule-min-rr', t: 'number', v: rule?.minimum_rr, step: '0.1' },
            { l: 'Stop Loss Rule', i: 'rule-sl', t: 'text', v: rule?.stop_loss_rule, p: 'e.g., Always use SL' },
            { l: 'Take Profit Rule', i: 'rule-tp', t: 'text', v: rule?.take_profit_rule, p: 'e.g., Min 2R TP' },
            { l: 'Session Rule', i: 'rule-session', t: 'text', v: rule?.session_rule, p: 'e.g., London/NY only' },
            { l: 'No Trade Conditions', i: 'rule-no-trade', t: 'textarea', v: rule?.no_trade_conditions, p: 'Conditions when NOT to trade...', c: 'md:col-span-2 lg:col-span-3' },
            { l: 'Notes', i: 'rule-notes', t: 'textarea', v: rule?.notes, p: 'Additional notes...', c: 'md:col-span-2 lg:col-span-3' }
        ];

        // Fix the Max Risk step attribute manually for the first item
        const maxRiskInput = grid.lastElementChild.querySelector('input'); // This is risky. 
        // Let's just rebuild the grid properly without trying to be too clever with mixed logic.

        // Clearing grid to rebuild cleanly
        grid.innerHTML = '';
        grid.appendChild(accGroup.div);
        grid.appendChild(enfGroup.div);

        // Re-add max risk separately to set step
        const maxRisk = createInput('Max Risk/Trade %', 'rule-max-risk', 'number', rule?.max_risk_per_trade_pct);
        maxRisk.input.step = '0.1';
        grid.appendChild(maxRisk.div);

        inputs.forEach(item => {
            const obj = createInput(item.l, item.i, item.t, item.v, item.p, item.c);
            if (item.step) obj.input.step = item.step;
            grid.appendChild(obj.div);
        });

        card.appendChild(grid);

        // Buttons
        const btns = createElement('div', 'flex gap-3 mt-4');
        const saveBtn = createElement('button', 'aion-btn aion-btn-primary', isEdit ? 'Update' : 'Create Rules');
        saveBtn.onclick = () => saveRule(isEdit ? rule.rule_id : null);

        const cancelBtn = createElement('button', 'aion-btn aion-btn-secondary', 'Cancel');
        cancelBtn.onclick = hideForm;

        btns.appendChild(saveBtn);
        btns.appendChild(cancelBtn);
        card.appendChild(btns);

        return card;
    }

    function hideForm() {
        document.getElementById('rule-form-container').innerHTML = '';
    }

    async function saveRule(ruleId) {
        AionApp.showLoading('Saving...');
        try {
            const accountId = document.getElementById('rule-account').value;
            if (!accountId && !ruleId) {
                AionApp.showToast('Account required', 'error');
                AionApp.hideLoading();
                return;
            }

            const data = {
                account_id: accountId || rules.find(r => r.rule_id === ruleId)?.account_id,
                enforcement_level: document.getElementById('rule-enforcement').value,
                max_risk_per_trade_pct: parseFloat(document.getElementById('rule-max-risk').value) || null,
                max_daily_loss_pct: parseFloat(document.getElementById('rule-max-daily').value) || null,
                max_open_risk_pct: parseFloat(document.getElementById('rule-max-open').value) || null,
                minimum_rr: parseFloat(document.getElementById('rule-min-rr').value) || null,
                stop_loss_rule: document.getElementById('rule-sl').value,
                take_profit_rule: document.getElementById('rule-tp').value,
                session_rule: document.getElementById('rule-session').value,
                no_trade_conditions: document.getElementById('rule-no-trade').value,
                notes: document.getElementById('rule-notes').value
            };

            const rulesRes = await AionAPI.loadRules();
            const existingRules = rulesRes.exists ? rulesRes.content.rules || [] : [];

            if (ruleId) {
                const idx = existingRules.findIndex(r => r.rule_id === ruleId);
                if (idx !== -1) Object.assign(existingRules[idx], data);
            } else {
                data.rule_id = AionValidators.generateId('R', existingRules, 'rule_id');
                existingRules.push(data);
            }

            const content = rulesRes.exists ? rulesRes.content : { _meta: AionState.createMeta(), rules: [] };
            content.rules = existingRules;
            content._meta = AionState.updateMeta(content._meta);

            await AionAPI.saveRules(content, rulesRes.sha);
            AionState.invalidateCache('rules');
            AionApp.hideLoading();
            AionApp.showToast(ruleId ? 'Rules updated' : 'Rules created', 'success');
            render();
        } catch (e) {
            AionApp.hideLoading();
            AionApp.showToast('Save failed: ' + e.message, 'error');
        }
    }

    return { render };
})();
