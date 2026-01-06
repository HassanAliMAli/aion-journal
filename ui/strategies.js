/**
 * AION Journal OS - Strategies Page
 */

const AionStrategies = (function () {
    'use strict';

    let setups = [];
    let currentSha = null;

    async function render() {
        const container = document.getElementById('page-strategies');
        container.innerHTML = '';
        const skel = document.createElement('div');
        skel.className = 'skeleton h-64';
        container.appendChild(skel);

        try {
            const setupsRes = await AionAPI.loadSetups();
            setups = setupsRes.exists ? setupsRes.content.setups || [] : [];
            currentSha = setupsRes.sha;

            container.innerHTML = ''; // Clear skeleton

            // Header
            const header = createElement('div', 'section-header mb-6');
            header.appendChild(createElement('h2', 'text-2xl font-bold', 'Playbook Setups'));

            const newBtn = createElement('button', 'aion-btn aion-btn-primary', 'New Setup');
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

            newBtn.onclick = showNewSetupForm;
            header.appendChild(newBtn);
            container.appendChild(header);

            // Form Container
            const formContainer = createElement('div');
            formContainer.id = 'setup-form-container';
            container.appendChild(formContainer);

            // Setups List
            const listContainer = createElement('div');
            listContainer.id = 'setups-list';
            renderSetupsList(listContainer);
            container.appendChild(listContainer);

        } catch (e) {
            container.innerHTML = '';
            const banner = document.createElement('div');
            banner.className = 'alert-banner danger';
            banner.textContent = `Failed to load setups: ${e.message}`;
            container.appendChild(banner);
        }
    }

    function createElement(tag, className, text) {
        const el = document.createElement(tag);
        if (className) el.className = className;
        if (text) el.textContent = text;
        return el;
    }

    function renderSetupsList(container) {
        container.innerHTML = '';
        if (setups.length === 0) {
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
            path.setAttribute('d', 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2');
            icon.appendChild(path);

            empty.appendChild(icon);
            empty.appendChild(createElement('h4', 'empty-state-title', 'No setups defined'));
            empty.appendChild(createElement('p', 'empty-state-text', 'Create your first playbook setup to start categorizing trades'));

            card.appendChild(empty);
            container.appendChild(card);
            return;
        }

        const grid = createElement('div', 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4');
        setups.forEach(s => grid.appendChild(renderSetupCard(s)));
        container.appendChild(grid);
    }

    function renderSetupCard(setup) {
        const card = createElement('div', 'aion-card');

        // Header
        const header = createElement('div', 'flex items-start justify-between mb-3');
        header.appendChild(createElement('h4', 'font-semibold', setup.setup_name));
        const statusClass = setup.setup_status === 'ACTIVE' ? 'text-green-400' : setup.setup_status === 'PAUSED' ? 'text-yellow-400' : 'text-red-400';
        header.appendChild(createElement('span', `text-xs font-medium ${statusClass}`, setup.setup_status));
        card.appendChild(header);

        // Details
        const details = createElement('div', 'space-y-2 text-sm text-aion-muted mb-4');

        const addDetail = (label, val) => {
            const row = createElement('div');
            row.appendChild(createElement('span', 'font-medium', `${label}: `));
            row.appendChild(document.createTextNode(val));
            details.appendChild(row);
        };

        addDetail('Expected RR', `${setup.expected_rr || '-'}R`);
        addDetail('Sessions', setup.allowed_sessions?.join(', ') || 'Any');
        addDetail('Max Trades/Day', setup.max_trades_per_day || '-');
        card.appendChild(details);

        // Conditions Snippet
        if (setup.conditions) {
            const snip = setup.conditions.substring(0, 100) + (setup.conditions.length > 100 ? '...' : '');
            card.appendChild(createElement('p', 'text-xs text-aion-muted mb-4', snip));
        }

        // Actions
        const actions = createElement('div', 'flex gap-2');

        const editBtn = createElement('button', 'aion-btn aion-btn-secondary flex-1 text-sm py-2', 'Edit');
        editBtn.onclick = () => editSetup(setup.setup_id);

        const toggleBtn = createElement('button', 'aion-btn aion-btn-secondary flex-1 text-sm py-2', setup.setup_status === 'ACTIVE' ? 'Pause' : 'Activate');
        toggleBtn.onclick = () => toggleStatus(setup.setup_id);

        actions.appendChild(editBtn);
        actions.appendChild(toggleBtn);
        card.appendChild(actions);

        return card;
    }

    function showNewSetupForm() {
        const container = document.getElementById('setup-form-container');
        container.innerHTML = '';
        container.appendChild(renderSetupForm());
    }

    function editSetup(setupId) {
        const setup = setups.find(s => s.setup_id === setupId);
        if (setup) {
            const container = document.getElementById('setup-form-container');
            container.innerHTML = '';
            container.appendChild(renderSetupForm(setup));
        }
    }

    function renderSetupForm(setup = null) {
        const isEdit = setup !== null;
        const card = createElement('div', 'aion-card mb-6');
        card.appendChild(createElement('h3', 'section-title mb-4', `${isEdit ? 'Edit' : 'New'} Setup`));

        const grid = createElement('div', 'grid grid-cols-1 md:grid-cols-2 gap-4');

        const createInput = (label, id, type, val, placeholder, colSpan) => {
            const div = createElement('div');
            if (colSpan) div.className = colSpan;
            div.appendChild(createElement('label', 'block text-sm font-medium mb-1', label));

            let input;
            if (type === 'textarea') {
                input = createElement('textarea', 'aion-input aion-textarea');
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

        grid.appendChild(createInput('Setup Name', 'setup-name', 'text', setup?.setup_name, 'e.g., BOS Pullback Entry').div);

        const rr = createInput('Expected RR', 'setup-rr', 'number', setup?.expected_rr);
        rr.input.step = '0.1';
        grid.appendChild(rr.div);

        grid.appendChild(createInput('Max Trades Per Day', 'setup-max-trades', 'number', setup?.max_trades_per_day).div);

        const statusGroup = createInput('Status', 'setup-status', 'select');
        AionValidators.SETUP_STATUSES.forEach(s => {
            const opt = createElement('option', '', s);
            opt.value = s;
            if (setup?.setup_status === s) opt.selected = true;
            statusGroup.input.appendChild(opt);
        });
        grid.appendChild(statusGroup.div);

        const textareas = [
            { l: 'Conditions', i: 'setup-conditions', v: setup?.conditions, p: 'Entry conditions...', c: 'md:col-span-2' },
            { l: 'Entry Model', i: 'setup-entry', v: setup?.entry_model, p: 'Entry model...', c: 'md:col-span-2' },
            { l: 'Stop Loss Logic', i: 'setup-sl', v: setup?.stop_loss_logic, p: 'SL logic...' },
            { l: 'Take Profit Logic', i: 'setup-tp', v: setup?.take_profit_logic, p: 'TP logic...' },
            { l: 'Notes', i: 'setup-notes', v: setup?.notes, p: 'Additional notes...', c: 'md:col-span-2' }
        ];

        textareas.forEach(t => {
            grid.appendChild(createInput(t.l, t.i, 'textarea', t.v, t.p, t.c).div);
        });

        card.appendChild(grid);

        // Buttons
        const btns = createElement('div', 'flex gap-3 mt-4');
        const saveBtn = createElement('button', 'aion-btn aion-btn-primary', `${isEdit ? 'Update' : 'Create'} Setup`);
        saveBtn.onclick = () => saveSetup(isEdit ? setup.setup_id : null);

        const cancelBtn = createElement('button', 'aion-btn aion-btn-secondary', 'Cancel');
        cancelBtn.onclick = hideForm;

        btns.appendChild(saveBtn);
        btns.appendChild(cancelBtn);
        card.appendChild(btns);

        return card;
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

    return { render };
})();
