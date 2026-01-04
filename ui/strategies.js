/**
 * AION Journal OS - Strategies Page
 */

const AionStrategies = (function () {
    'use strict';

    let setups = [];
    let currentSha = null;

    async function render() {
        const container = document.getElementById('page-strategies');
        container.innerHTML = '<div class="skeleton h-64"></div>';

        try {
            const setupsRes = await AionAPI.loadSetups();
            setups = setupsRes.exists ? setupsRes.content.setups || [] : [];
            currentSha = setupsRes.sha;

            container.innerHTML = `
                <div class="section-header mb-6">
                    <h2 class="text-2xl font-bold">Playbook Setups</h2>
                    <button onclick="AionStrategies.showNewSetupForm()" class="aion-btn aion-btn-primary">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path></svg>
                        New Setup
                    </button>
                </div>
                <div id="setup-form-container"></div>
                <div id="setups-list">${renderSetupsList()}</div>
            `;
        } catch (e) {
            container.innerHTML = `<div class="alert-banner danger">Failed to load setups: ${e.message}</div>`;
        }
    }

    function renderSetupsList() {
        if (setups.length === 0) {
            return `
                <div class="aion-card">
                    <div class="empty-state">
                        <svg class="empty-state-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"></path></svg>
                        <h4 class="empty-state-title">No setups defined</h4>
                        <p class="empty-state-text">Create your first playbook setup to start categorizing trades</p>
                    </div>
                </div>
            `;
        }

        return `
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                ${setups.map(s => renderSetupCard(s)).join('')}
            </div>
        `;
    }

    function renderSetupCard(setup) {
        const statusClass = setup.setup_status === 'ACTIVE' ? 'text-green-400' : setup.setup_status === 'PAUSED' ? 'text-yellow-400' : 'text-red-400';
        return `
            <div class="aion-card">
                <div class="flex items-start justify-between mb-3">
                    <h4 class="font-semibold">${setup.setup_name}</h4>
                    <span class="text-xs font-medium ${statusClass}">${setup.setup_status}</span>
                </div>
                <div class="space-y-2 text-sm text-aion-muted mb-4">
                    <div><span class="font-medium">Expected RR:</span> ${setup.expected_rr || '-'}R</div>
                    <div><span class="font-medium">Sessions:</span> ${setup.allowed_sessions?.join(', ') || 'Any'}</div>
                    <div><span class="font-medium">Max Trades/Day:</span> ${setup.max_trades_per_day || '-'}</div>
                </div>
                ${setup.conditions ? `<p class="text-xs text-aion-muted mb-4">${setup.conditions.substring(0, 100)}${setup.conditions.length > 100 ? '...' : ''}</p>` : ''}
                <div class="flex gap-2">
                    <button onclick="AionStrategies.editSetup('${setup.setup_id}')" class="aion-btn aion-btn-secondary flex-1 text-sm py-2">Edit</button>
                    <button onclick="AionStrategies.toggleStatus('${setup.setup_id}')" class="aion-btn aion-btn-secondary flex-1 text-sm py-2">${setup.setup_status === 'ACTIVE' ? 'Pause' : 'Activate'}</button>
                </div>
            </div>
        `;
    }

    function showNewSetupForm() {
        document.getElementById('setup-form-container').innerHTML = renderSetupForm();
    }

    function editSetup(setupId) {
        const setup = setups.find(s => s.setup_id === setupId);
        if (setup) document.getElementById('setup-form-container').innerHTML = renderSetupForm(setup);
    }

    function renderSetupForm(setup = null) {
        const isEdit = setup !== null;
        return `
            <div class="aion-card mb-6">
                <h3 class="section-title mb-4">${isEdit ? 'Edit' : 'New'} Setup</h3>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div><label class="block text-sm font-medium mb-1">Setup Name</label><input type="text" id="setup-name" value="${setup?.setup_name || ''}" class="aion-input" placeholder="e.g., BOS Pullback Entry"></div>
                    <div><label class="block text-sm font-medium mb-1">Expected RR</label><input type="number" step="0.1" id="setup-rr" value="${setup?.expected_rr || ''}" class="aion-input"></div>
                    <div><label class="block text-sm font-medium mb-1">Max Trades Per Day</label><input type="number" id="setup-max-trades" value="${setup?.max_trades_per_day || ''}" class="aion-input"></div>
                    <div><label class="block text-sm font-medium mb-1">Status</label><select id="setup-status" class="aion-input aion-select">${AionValidators.SETUP_STATUSES.map(s => `<option value="${s}" ${setup?.setup_status === s ? 'selected' : ''}>${s}</option>`).join('')}</select></div>
                    <div class="md:col-span-2"><label class="block text-sm font-medium mb-1">Conditions</label><textarea id="setup-conditions" class="aion-input aion-textarea" placeholder="Entry conditions...">${setup?.conditions || ''}</textarea></div>
                    <div class="md:col-span-2"><label class="block text-sm font-medium mb-1">Entry Model</label><textarea id="setup-entry" class="aion-input aion-textarea" placeholder="Entry model...">${setup?.entry_model || ''}</textarea></div>
                    <div><label class="block text-sm font-medium mb-1">Stop Loss Logic</label><textarea id="setup-sl" class="aion-input" placeholder="SL logic...">${setup?.stop_loss_logic || ''}</textarea></div>
                    <div><label class="block text-sm font-medium mb-1">Take Profit Logic</label><textarea id="setup-tp" class="aion-input" placeholder="TP logic...">${setup?.take_profit_logic || ''}</textarea></div>
                    <div class="md:col-span-2"><label class="block text-sm font-medium mb-1">Notes</label><textarea id="setup-notes" class="aion-input aion-textarea" placeholder="Additional notes...">${setup?.notes || ''}</textarea></div>
                </div>
                <div class="flex gap-3 mt-4">
                    <button onclick="AionStrategies.saveSetup(${isEdit ? `'${setup.setup_id}'` : 'null'})" class="aion-btn aion-btn-primary">${isEdit ? 'Update' : 'Create'} Setup</button>
                    <button onclick="AionStrategies.hideForm()" class="aion-btn aion-btn-secondary">Cancel</button>
                </div>
            </div>
        `;
    }

    function hideForm() {
        document.getElementById('setup-form-container').innerHTML = '';
    }

    async function saveSetup(setupId) {
        AionApp.showLoading('Saving...');
        try {
            const data = {
                setup_name: document.getElementById('setup-name').value,
                setup_status: document.getElementById('setup-status').value,
                expected_rr: parseFloat(document.getElementById('setup-rr').value) || null,
                max_trades_per_day: parseInt(document.getElementById('setup-max-trades').value) || null,
                conditions: document.getElementById('setup-conditions').value,
                entry_model: document.getElementById('setup-entry').value,
                stop_loss_logic: document.getElementById('setup-sl').value,
                take_profit_logic: document.getElementById('setup-tp').value,
                notes: document.getElementById('setup-notes').value,
                allowed_sessions: []
            };

            if (!data.setup_name) { AionApp.showToast('Name required', 'error'); AionApp.hideLoading(); return; }

            const setupsRes = await AionAPI.loadSetups();
            const existingSetups = setupsRes.exists ? setupsRes.content.setups || [] : [];

            if (setupId) {
                const idx = existingSetups.findIndex(s => s.setup_id === setupId);
                if (idx !== -1) Object.assign(existingSetups[idx], data);
            } else {
                data.setup_id = AionValidators.generateId('S', existingSetups, 'setup_id');
                existingSetups.push(data);
            }

            const content = setupsRes.exists ? setupsRes.content : { _meta: AionState.createMeta(), setups: [] };
            content.setups = existingSetups;
            content._meta = AionState.updateMeta(content._meta);

            await AionAPI.saveSetups(content, setupsRes.sha);
            AionState.invalidateCache('setups');
            AionApp.hideLoading();
            AionApp.showToast(setupId ? 'Setup updated' : 'Setup created', 'success');
            render();
        } catch (e) {
            AionApp.hideLoading();
            AionApp.showToast('Save failed: ' + e.message, 'error');
        }
    }

    async function toggleStatus(setupId) {
        const setup = setups.find(s => s.setup_id === setupId);
        if (!setup) return;

        const newStatus = setup.setup_status === 'ACTIVE' ? 'PAUSED' : 'ACTIVE';
        setup.setup_status = newStatus;

        AionApp.showLoading('Updating...');
        try {
            const setupsRes = await AionAPI.loadSetups();
            const content = setupsRes.content;
            const idx = content.setups.findIndex(s => s.setup_id === setupId);
            if (idx !== -1) content.setups[idx].setup_status = newStatus;
            content._meta = AionState.updateMeta(content._meta);

            await AionAPI.saveSetups(content, setupsRes.sha);
            AionState.invalidateCache('setups');
            AionApp.hideLoading();
            AionApp.showToast(`Setup ${newStatus.toLowerCase()}`, 'success');
            render();
        } catch (e) {
            AionApp.hideLoading();
            AionApp.showToast('Update failed: ' + e.message, 'error');
        }
    }

    return { render, showNewSetupForm, editSetup, saveSetup, hideForm, toggleStatus };
})();
