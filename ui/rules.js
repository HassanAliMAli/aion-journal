/**
 * AION Journal OS - Rules Page
 */

const AionRules = (function () {
    'use strict';

    let rules = [];
    let accounts = [];
    let currentSha = null;

    async function render() {
        const container = document.getElementById('page-rules');
        container.innerHTML = '<div class="skeleton h-64"></div>';

        try {
            const [rulesRes, accountsRes, violationsRes] = await Promise.all([
                AionAPI.loadRules(), AionAPI.loadAccounts(), AionAPI.loadRuleViolations()
            ]);

            rules = rulesRes.exists ? rulesRes.content.rules || [] : [];
            accounts = accountsRes.exists ? accountsRes.content.accounts || [] : [];
            currentSha = rulesRes.sha;
            const violations = violationsRes.exists ? violationsRes.content.violations || [] : [];

            container.innerHTML = `
                <div class="section-header mb-6">
                    <h2 class="text-2xl font-bold">Trading Rules</h2>
                    <button onclick="AionRules.showNewRuleForm()" class="aion-btn aion-btn-primary">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path></svg>
                        New Rule Set
                    </button>
                </div>
                ${violations.length > 0 ? renderViolationsSummary(violations) : ''}
                <div id="rule-form-container"></div>
                <div id="rules-list">${renderRulesList()}</div>
            `;
        } catch (e) {
            container.innerHTML = `<div class="alert-banner danger">Failed to load rules: ${e.message}</div>`;
        }
    }

    function renderViolationsSummary(violations) {
        const recent = violations.slice(-10).reverse();
        return `
            <div class="aion-card mb-6">
                <h3 class="section-title mb-4">Recent Violations (${violations.length} total)</h3>
                <div class="space-y-2">
                    ${recent.map(v => `
                        <div class="flex items-center gap-3 p-2 rounded bg-red-500/10 border border-red-500/20">
                            <span class="text-xs font-mono text-aion-muted">${v.trade_id}</span>
                            <span class="flex-1 text-sm">${v.rule_breached}: ${v.description}</span>
                            <span class="text-xs text-red-400">${v.severity}</span>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }

    function renderRulesList() {
        if (rules.length === 0) {
            return `
                <div class="aion-card">
                    <div class="empty-state">
                        <svg class="empty-state-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path></svg>
                        <h4 class="empty-state-title">No rules defined</h4>
                        <p class="empty-state-text">Create risk management rules for your accounts</p>
                    </div>
                </div>
            `;
        }

        return `<div class="space-y-4">${rules.map(r => renderRuleCard(r)).join('')}</div>`;
    }

    function renderRuleCard(rule) {
        const account = accounts.find(a => a.account_id === rule.account_id);
        const enfClass = rule.enforcement_level === 'STRICT' ? 'text-red-400' : rule.enforcement_level === 'WARNING' ? 'text-yellow-400' : 'text-blue-400';

        return `
            <div class="aion-card">
                <div class="flex items-start justify-between mb-4">
                    <div>
                        <h4 class="font-semibold">${account?.trader_name || 'Unknown Account'}</h4>
                        <p class="text-sm text-aion-muted">${account?.platform || ''} - ${account?.account_type || ''}</p>
                    </div>
                    <span class="text-xs font-medium ${enfClass}">${rule.enforcement_level}</span>
                </div>
                <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                    <div class="text-center p-3 bg-aion-bg rounded-lg">
                        <div class="text-lg font-bold">${rule.max_risk_per_trade_pct || '-'}%</div>
                        <div class="text-xs text-aion-muted">Max Risk/Trade</div>
                    </div>
                    <div class="text-center p-3 bg-aion-bg rounded-lg">
                        <div class="text-lg font-bold">${rule.max_daily_loss_pct || '-'}%</div>
                        <div class="text-xs text-aion-muted">Max Daily Loss</div>
                    </div>
                    <div class="text-center p-3 bg-aion-bg rounded-lg">
                        <div class="text-lg font-bold">${rule.max_open_risk_pct || '-'}%</div>
                        <div class="text-xs text-aion-muted">Max Open Risk</div>
                    </div>
                    <div class="text-center p-3 bg-aion-bg rounded-lg">
                        <div class="text-lg font-bold">${rule.minimum_rr || '-'}R</div>
                        <div class="text-xs text-aion-muted">Min RR</div>
                    </div>
                </div>
                ${rule.stop_loss_rule || rule.take_profit_rule || rule.session_rule ? `
                    <div class="text-sm text-aion-muted space-y-1 mb-4">
                        ${rule.stop_loss_rule ? `<div><span class="font-medium">SL Rule:</span> ${rule.stop_loss_rule}</div>` : ''}
                        ${rule.take_profit_rule ? `<div><span class="font-medium">TP Rule:</span> ${rule.take_profit_rule}</div>` : ''}
                        ${rule.session_rule ? `<div><span class="font-medium">Session:</span> ${rule.session_rule}</div>` : ''}
                    </div>
                ` : ''}
                <button onclick="AionRules.editRule('${rule.rule_id}')" class="aion-btn aion-btn-secondary text-sm">Edit Rules</button>
            </div>
        `;
    }

    function showNewRuleForm() {
        document.getElementById('rule-form-container').innerHTML = renderRuleForm();
    }

    function editRule(ruleId) {
        const rule = rules.find(r => r.rule_id === ruleId);
        if (rule) document.getElementById('rule-form-container').innerHTML = renderRuleForm(rule);
    }

    function renderRuleForm(rule = null) {
        const isEdit = rule !== null;
        const accountOpts = accounts.map(a => `<option value="${a.account_id}" ${rule?.account_id === a.account_id ? 'selected' : ''}>${a.trader_name} (${a.platform})</option>`).join('');

        return `
            <div class="aion-card mb-6">
                <h3 class="section-title mb-4">${isEdit ? 'Edit' : 'New'} Rule Set</h3>
                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div><label class="block text-sm font-medium mb-1">Account</label><select id="rule-account" class="aion-input aion-select" ${isEdit ? 'disabled' : ''}><option value="">Select...</option>${accountOpts}</select></div>
                    <div><label class="block text-sm font-medium mb-1">Enforcement</label><select id="rule-enforcement" class="aion-input aion-select">${AionValidators.ENFORCEMENT_LEVELS.map(e => `<option value="${e}" ${rule?.enforcement_level === e ? 'selected' : ''}>${e}</option>`).join('')}</select></div>
                    <div><label class="block text-sm font-medium mb-1">Max Risk/Trade %</label><input type="number" step="0.1" id="rule-max-risk" value="${rule?.max_risk_per_trade_pct || ''}" class="aion-input"></div>
                    <div><label class="block text-sm font-medium mb-1">Max Daily Loss %</label><input type="number" step="0.1" id="rule-max-daily" value="${rule?.max_daily_loss_pct || ''}" class="aion-input"></div>
                    <div><label class="block text-sm font-medium mb-1">Max Open Risk %</label><input type="number" step="0.1" id="rule-max-open" value="${rule?.max_open_risk_pct || ''}" class="aion-input"></div>
                    <div><label class="block text-sm font-medium mb-1">Minimum RR</label><input type="number" step="0.1" id="rule-min-rr" value="${rule?.minimum_rr || ''}" class="aion-input"></div>
                    <div><label class="block text-sm font-medium mb-1">Stop Loss Rule</label><input type="text" id="rule-sl" value="${rule?.stop_loss_rule || ''}" class="aion-input" placeholder="e.g., Always use SL"></div>
                    <div><label class="block text-sm font-medium mb-1">Take Profit Rule</label><input type="text" id="rule-tp" value="${rule?.take_profit_rule || ''}" class="aion-input" placeholder="e.g., Min 2R TP"></div>
                    <div><label class="block text-sm font-medium mb-1">Session Rule</label><input type="text" id="rule-session" value="${rule?.session_rule || ''}" class="aion-input" placeholder="e.g., London/NY only"></div>
                    <div class="md:col-span-2 lg:col-span-3"><label class="block text-sm font-medium mb-1">No Trade Conditions</label><textarea id="rule-no-trade" class="aion-input" placeholder="Conditions when NOT to trade...">${rule?.no_trade_conditions || ''}</textarea></div>
                    <div class="md:col-span-2 lg:col-span-3"><label class="block text-sm font-medium mb-1">Notes</label><textarea id="rule-notes" class="aion-input" placeholder="Additional notes...">${rule?.notes || ''}</textarea></div>
                </div>
                <div class="flex gap-3 mt-4">
                    <button onclick="AionRules.saveRule(${isEdit ? `'${rule.rule_id}'` : 'null'})" class="aion-btn aion-btn-primary">${isEdit ? 'Update' : 'Create'} Rules</button>
                    <button onclick="AionRules.hideForm()" class="aion-btn aion-btn-secondary">Cancel</button>
                </div>
            </div>
        `;
    }

    function hideForm() {
        document.getElementById('rule-form-container').innerHTML = '';
    }

    async function saveRule(ruleId) {
        AionApp.showLoading('Saving...');
        try {
            const accountId = document.getElementById('rule-account').value;
            if (!accountId && !ruleId) { AionApp.showToast('Account required', 'error'); AionApp.hideLoading(); return; }

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

    return { render, showNewRuleForm, editRule, saveRule, hideForm };
})();
