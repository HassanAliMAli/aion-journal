/**
 * AION Journal OS - Control Panel Page
 */

const AionControlPanel = (function () {
    'use strict';

    let controlData = null;
    let currentSha = null;

    async function render() {
        const container = document.getElementById('page-control');
        container.innerHTML = '';

        // Skeleton Loading State
        const skeleton = document.createElement('div');
        skeleton.className = 'skeleton h-64';
        container.appendChild(skeleton);

        try {
            const [controlRes, prefsRes, auditRes] = await Promise.all([
                AionAPI.loadControlPanel(), AionAPI.loadUserPreferences(), AionAPI.loadAuditLog()
            ]);

            let adminUsers = [];
            if (AionState.isAdmin()) {
                try {
                    const data = await AionAPI.getAdminUsers();
                    adminUsers = Array.isArray(data) ? data : [];
                } catch (e) {
                    console.error('Failed to load users', e);
                    // Don't crash the whole page if admin listing fails
                }
            }

            // Fix for "Not Found" or empty content on first load
            controlData = (controlRes.exists && controlRes.content && Object.keys(controlRes.content).length > 0) ? controlRes.content : getDefaultControlPanel();
            currentSha = controlRes.sha;

            const prefs = (prefsRes.exists && prefsRes.content) ? prefsRes.content : { timezone: 'Asia/Karachi', naming_convention: 'PAIR_DIRECTION' };
            const auditLog = (auditRes.exists && auditRes.content && Array.isArray(auditRes.content.entries)) ? auditRes.content.entries : [];

            // Clear skeleton
            container.innerHTML = '';

            // Header
            const header = document.createElement('h2');
            header.className = 'text-2xl font-bold mb-6';
            header.textContent = 'Control Panel';
            container.appendChild(header);

            if (AionState.isAdmin()) {
                container.appendChild(renderUserManagement(adminUsers));
            }

            container.appendChild(renderModeControl());
            container.appendChild(renderLockedSheets());
            container.appendChild(renderUpgradeReadiness());
            container.appendChild(renderDataManagement());
            container.appendChild(renderPreferences(prefs));
            container.appendChild(renderAuditLog(auditLog));

        } catch (e) {
            container.innerHTML = '';
            const errorBanner = document.createElement('div');
            errorBanner.className = 'alert-banner danger';
            errorBanner.textContent = `Failed to load control panel: ${e.message}`;
            container.appendChild(errorBanner);
        }
    }

    function createElement(tag, className, text) {
        const el = document.createElement(tag);
        if (className) el.className = className;
        if (text) el.textContent = text;
        return el;
    }

    function renderUserManagement(users) {
        const card = createElement('div', 'aion-card mb-6 border-l-4 border-purple-500');
        const title = createElement('h3', 'section-title mb-4', 'User Management (Admin)');
        card.appendChild(title);

        // Create User Form
        const formDiv = createElement('div', 'mb-6 bg-aion-bg/50 p-4 rounded-lg');
        const formTitle = createElement('h4', 'text-sm font-medium mb-3', 'Create New User');
        formDiv.appendChild(formTitle);

        const formGrid = createElement('div', 'grid grid-cols-1 md:grid-cols-4 gap-3 items-end');

        // Username Input
        const userGroup = createElement('div');
        userGroup.appendChild(createElement('label', 'block text-xs text-aion-muted mb-1', 'Username'));
        const userInput = createElement('input', 'aion-input text-sm');
        userInput.type = 'text';
        userInput.placeholder = 'Username';
        userInput.id = 'new-user-name';
        userGroup.appendChild(userInput);
        formGrid.appendChild(userGroup);

        // Password Input
        const passGroup = createElement('div');
        passGroup.appendChild(createElement('label', 'block text-xs text-aion-muted mb-1', 'Password'));
        const passInput = createElement('input', 'aion-input text-sm');
        passInput.type = 'password';
        passInput.placeholder = 'Password';
        passInput.id = 'new-user-pass';
        passGroup.appendChild(passInput);
        formGrid.appendChild(passGroup);

        // Role Select
        const roleGroup = createElement('div');
        roleGroup.appendChild(createElement('label', 'block text-xs text-aion-muted mb-1', 'Role'));
        const roleSelect = createElement('select', 'aion-input aion-select text-sm');
        roleSelect.id = 'new-user-role';
        const optUser = createElement('option', '', 'Standard User');
        optUser.value = 'USER';
        const optAdmin = createElement('option', '', 'Administrator');
        optAdmin.value = 'ADMIN';
        roleSelect.appendChild(optUser);
        roleSelect.appendChild(optAdmin);
        roleGroup.appendChild(roleSelect);
        formGrid.appendChild(roleGroup);

        // Create Button
        const createBtn = createElement('button', 'aion-btn aion-btn-primary text-sm', 'Create User');
        createBtn.onclick = createUser;
        formGrid.appendChild(createBtn);

        formDiv.appendChild(formGrid);
        card.appendChild(formDiv);

        // User Table
        const tableWrapper = createElement('div', 'overflow-x-auto');
        const table = createElement('table', 'aion-table');
        const thead = createElement('thead');
        const trHead = createElement('tr');
        ['Username', 'Role', 'Last Login', 'Actions'].forEach(h => trHead.appendChild(createElement('th', '', h)));
        thead.appendChild(trHead);
        table.appendChild(thead);

        const tbody = createElement('tbody');
        if (users.length === 0) {
            const trBy = createElement('tr');
            const tdBy = createElement('td', 'text-center text-aion-muted py-4', 'No users found');
            tdBy.colSpan = 4;
            trBy.appendChild(tdBy);
            tbody.appendChild(trBy);
        } else {
            users.forEach(u => {
                const tr = createElement('tr');
                tr.appendChild(createElement('td', 'text-sm font-medium', u.username));

                const roleTd = createElement('td');
                const roleSpan = createElement('span', `text-xs px-2 py-1 rounded ${u.role === 'ADMIN' ? 'bg-purple-500/20 text-purple-400' : 'bg-blue-500/20 text-blue-400'}`, u.role);
                roleTd.appendChild(roleSpan);
                tr.appendChild(roleTd);

                tr.appendChild(createElement('td', 'text-xs text-aion-muted', AionApp.formatDate(u.last_login)));

                const actionTd = createElement('td', 'text-right');
                if (u.id !== AionState.getUserId()) {
                    const delBtn = createElement('button', 'text-aion-danger hover:text-red-400');
                    delBtn.onclick = () => deleteUser(u.id);
                    delBtn.innerHTML = '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>';
                    actionTd.appendChild(delBtn);
                }
                tr.appendChild(actionTd);
                tbody.appendChild(tr);
            });
        }
        table.appendChild(tbody);
        tableWrapper.appendChild(table);
        card.appendChild(tableWrapper);

        return card;
    }

    async function createUser() {
        const username = document.getElementById('new-user-name').value.trim();
        const password = document.getElementById('new-user-pass').value.trim();
        const role = document.getElementById('new-user-role').value;

        if (!username || !password) {
            AionApp.showToast('Username and password required', 'warning');
            return;
        }

        AionApp.showLoading('Creating user...');
        try {
            await AionAPI.createAdminUser(username, password, role);
            AionApp.hideLoading();
            AionApp.showToast('User created successfully', 'success');
            render(); // Refresh list
        } catch (e) {
            AionApp.hideLoading();
            AionApp.showToast(e.message, 'error');
        }
    }

    async function deleteUser(id) {
        AionApp.showConfirm('Delete User', 'Are you sure? This will delete all user data permanently.', async () => {
            AionApp.showLoading('Deleting user...');
            try {
                await AionAPI.deleteAdminUser(id);
                AionApp.hideLoading();
                AionApp.showToast('User deleted', 'success');
                render();
            } catch (e) {
                AionApp.hideLoading();
                AionApp.showToast(e.message, 'error');
            }
        });
    }

    function getDefaultControlPanel() {
        return {
            current_mode: 98,
            locked_sheets: ['equity_snapshots', 'management_events', 'partial_exits', 'strategy_changes', 'audit_log'],
            upgrade_ready_score: 0,
            upgrade_triggers: [],
            manual_override_warning: 'Switching to Mode 100 enables audit logging and locks critical tables.',
            last_mode_change_utc: null
        };
    }

    function renderModeControl() {
        const isMode100 = controlData.current_mode === 100;
        const card = createElement('div', 'aion-card mb-6');
        card.appendChild(createElement('h3', 'section-title mb-4', 'Operating Mode'));

        const wrapper = createElement('div', 'flex flex-col md:flex-row md:items-center gap-4');
        const infoDiv = createElement('div', 'flex-1');

        const badgeWrapper = createElement('div', 'flex items-center gap-4 mb-2');
        badgeWrapper.appendChild(createElement('span', `text-4xl font-bold ${isMode100 ? 'text-red-400' : 'text-yellow-400'}`, `MODE ${controlData.current_mode}`));
        badgeWrapper.appendChild(createElement('span', `state-badge ${isMode100 ? 'mode-100' : 'mode-98'}`, isMode100 ? 'LOCKED' : 'STANDARD'));
        infoDiv.appendChild(badgeWrapper);

        infoDiv.appendChild(createElement('p', 'text-sm text-aion-muted', controlData.manual_override_warning));
        if (controlData.last_mode_change_utc) {
            infoDiv.appendChild(createElement('p', 'text-xs text-aion-muted mt-1', `Last changed: ${AionApp.formatDate(controlData.last_mode_change_utc, 'full')}`));
        }
        wrapper.appendChild(infoDiv);

        const btn = createElement('button', `aion-btn ${isMode100 ? 'aion-btn-secondary' : 'aion-btn-danger'}`, isMode100 ? 'Downgrade to Mode 98' : 'Upgrade to Mode 100');
        btn.onclick = toggleMode;
        wrapper.appendChild(btn);

        card.appendChild(wrapper);
        return card;
    }

    function renderLockedSheets() {
        const sheets = controlData.locked_sheets || [];
        const card = createElement('div', 'aion-card mb-6');
        card.appendChild(createElement('h3', 'section-title mb-4', 'Locked Sheets (Mode 100)'));
        card.appendChild(createElement('p', 'text-sm text-aion-muted mb-4', 'These tables are locked in Mode 100 and all changes are audited.'));

        const container = createElement('div', 'flex flex-wrap gap-2');
        sheets.forEach(s => {
            const span = createElement('span', 'px-3 py-1 bg-red-500/20 text-red-400 rounded-full text-sm', s);
            container.appendChild(span);
        });
        card.appendChild(container);
        return card;
    }

    function renderUpgradeReadiness() {
        const score = controlData.upgrade_ready_score || 0;
        const triggers = controlData.upgrade_triggers || [];
        const progressClass = score >= 80 ? 'bg-green-500' : score >= 50 ? 'bg-yellow-500' : 'bg-red-500';

        const card = createElement('div', 'aion-card mb-6');
        card.appendChild(createElement('h3', 'section-title mb-4', 'Upgrade Readiness'));

        const barWrapper = createElement('div', 'flex items-center gap-4 mb-4');
        const barBg = createElement('div', 'flex-1 h-3 bg-aion-bg rounded-full overflow-hidden');
        const bar = createElement('div', `${progressClass} h-full transition-all`);
        bar.style.width = `${score}%`;
        barBg.appendChild(bar);
        barWrapper.appendChild(barBg);
        barWrapper.appendChild(createElement('span', 'text-lg font-bold', `${score}%`));
        card.appendChild(barWrapper);

        if (triggers.length > 0) {
            const list = createElement('div', 'space-y-2');
            list.appendChild(createElement('p', 'text-sm font-medium', 'Triggers for Mode 100:'));
            triggers.forEach(t => {
                const item = createElement('div', 'flex items-center gap-2 text-sm text-aion-muted');
                // Icon svg is static, innerHTML safe here for icon only
                item.innerHTML = `<svg class="w-4 h-4 text-green-400" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"></path></svg>`;
                const text = document.createTextNode(t);
                item.appendChild(text);
                list.appendChild(item);
            });
            card.appendChild(list);
        } else {
            card.appendChild(createElement('p', 'text-sm text-aion-muted', 'Complete more trades to improve readiness score'));
        }
        return card;
    }

    function renderDataManagement() {
        const card = createElement('div', 'aion-card mb-6');
        card.appendChild(createElement('h3', 'section-title mb-4', 'Data Management'));

        const wrapper = createElement('div', 'flex items-center justify-between');
        const textDiv = createElement('div');
        textDiv.appendChild(createElement('p', 'text-sm font-medium mb-1', 'Export Data'));
        textDiv.appendChild(createElement('p', 'text-xs text-aion-muted', 'Download a complete JSON backup of all your trading data.'));
        wrapper.appendChild(textDiv);

        const btn = createElement('button', 'aion-btn aion-btn-secondary');
        btn.onclick = handleExport;
        btn.innerHTML = '<svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>Export Backup';
        wrapper.appendChild(btn);

        card.appendChild(wrapper);
        return card;
    }

    function renderPreferences(prefs) {
        const fragment = document.createDocumentFragment();

        // Timezone Card
        const card1 = createElement('div', 'aion-card mb-6');
        card1.appendChild(createElement('h3', 'section-title mb-4', 'User Preferences'));
        const grid1 = createElement('div', 'grid grid-cols-1 md:grid-cols-2 gap-4');
        const tzDiv = createElement('div');
        tzDiv.appendChild(createElement('label', 'block text-sm font-medium mb-1', 'Display Timezone'));
        const tzSelect = createElement('select', 'aion-input aion-select');
        tzSelect.id = 'pref-timezone';
        tzSelect.onchange = updateTimezone;
        ['UTC', 'Asia/Karachi', 'Asia/Dubai', 'Europe/London', 'America/New_York', 'America/Chicago', 'America/Los_Angeles', 'Asia/Tokyo', 'Asia/Singapore', 'Australia/Sydney'].forEach(tz => {
            const opt = createElement('option', '', tz);
            opt.value = tz;
            if (prefs.timezone === tz) opt.selected = true;
            tzSelect.appendChild(opt);
        });
        tzDiv.appendChild(tzSelect);
        grid1.appendChild(tzDiv);
        card1.appendChild(grid1);
        fragment.appendChild(card1);

        // Backup Settings Card
        const card2 = createElement('div', 'aion-card mb-6 border-l-4 border-gray-600');
        const h3 = createElement('h3', 'section-title mb-4 max-w-full flex items-center gap-2');
        h3.innerHTML = `<svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg> GitHub Backup Settings`;
        card2.appendChild(h3);
        card2.appendChild(createElement('p', 'text-xs text-aion-muted mb-4', 'Automatically sync your trades and configs to the global backup repository.'));

        const grid2 = createElement('div', 'grid grid-cols-1 md:grid-cols-2 gap-4');
        const nameDiv = createElement('div');
        nameDiv.appendChild(createElement('label', 'block text-sm font-medium mb-1', 'Trade File Naming'));
        const nameSelect = createElement('select', 'aion-input aion-select');
        nameSelect.id = 'pref-naming';
        nameSelect.onchange = updateSyncPrefs;

        const namingOptions = [
            { id: 'PAIR_DIRECTION', label: '{Pair}_{Direction}_{ID}' },
            { id: 'DATE_PAIR', label: '{Date}_{Pair}_{ID}' },
            { id: 'STRATEGY_RESULT', label: '{Strategy}_{Result}_{ID}' }
        ];

        namingOptions.forEach(opt => {
            const o = createElement('option', '', opt.label);
            o.value = opt.id;
            if (prefs.naming_convention === opt.id) o.selected = true;
            nameSelect.appendChild(o);
        });
        nameDiv.appendChild(nameSelect);

        const exP = createElement('p', 'text-xs text-aion-muted mt-1', 'Example: ');
        const exSpan = createElement('span', 'font-mono');
        exSpan.id = 'naming-example';
        exP.appendChild(exSpan);
        nameDiv.appendChild(exP);

        grid2.appendChild(nameDiv);
        card2.appendChild(grid2);
        fragment.appendChild(card2);

        return fragment;
    }

    async function updateSyncPrefs() {
        const naming = document.getElementById('pref-naming').value;
        const examples = {
            'PAIR_DIRECTION': 'EURUSD_LONG_1709...json',
            'DATE_PAIR': '2024-03-20_EURUSD_1709...json',
            'STRATEGY_RESULT': 'Breakout_WIN_1709...json'
        };
        document.getElementById('naming-example').textContent = examples[naming] || '';

        AionApp.showLoading('Saving sync preferences...');
        try {
            const prefsRes = await AionAPI.loadUserPreferences();
            const prefs = prefsRes.exists ? prefsRes.content : { _meta: AionState.createMeta() };

            // Merge new prefs
            prefs.naming_convention = naming;

            prefs._meta = AionState.updateMeta(prefs._meta);
            await AionAPI.saveUserPreferences(prefs, prefsRes.sha);

            AionState.invalidateCache('userPreferences');
            AionApp.hideLoading();
            AionApp.showToast('Sync settings updated', 'success');
        } catch (e) {
            AionApp.hideLoading();
            AionApp.showToast('Failed to save: ' + e.message, 'error');
        }
    }

    function renderAuditLog(entries) {
        const card = createElement('div', 'aion-card');
        const titleText = entries.length === 0 ? 'Audit Log' : `Audit Log (${entries.length} entries)`;
        card.appendChild(createElement('h3', 'section-title mb-4', titleText));

        if (entries.length === 0) {
            card.appendChild(createElement('p', 'text-sm text-aion-muted', 'No audit entries yet. Enable Mode 100 to start logging.'));
            return card;
        }

        const recent = entries.slice(-20).reverse();
        const wrapper = createElement('div', 'overflow-x-auto');
        const table = createElement('table', 'aion-table');
        const thead = createElement('thead');
        const trHead = createElement('tr');
        ['Time', 'Action', 'Description'].forEach(h => trHead.appendChild(createElement('th', '', h)));
        thead.appendChild(trHead);
        table.appendChild(thead);

        const tbody = createElement('tbody');
        recent.forEach(e => {
            const tr = createElement('tr');
            tr.appendChild(createElement('td', 'text-xs font-mono text-aion-muted', AionApp.formatDate(e.timestamp_utc, 'full')));

            const actionTd = createElement('td');
            const actionSpan = createElement('span', `text-xs px-2 py-1 rounded ${e.action?.includes('MODE') ? 'bg-purple-500/20 text-purple-400' : 'bg-blue-500/20 text-blue-400'}`, e.action || 'UNKNOWN');
            actionTd.appendChild(actionSpan);
            tr.appendChild(actionTd);

            tr.appendChild(createElement('td', 'text-sm', e.description || '-'));
            tbody.appendChild(tr);
        });
        table.appendChild(tbody);
        wrapper.appendChild(table);
        card.appendChild(wrapper);

        return card;
    }

    async function toggleMode() {
        const newMode = controlData.current_mode === 98 ? 100 : 98;
        const action = newMode === 100 ? 'UPGRADE' : 'DOWNGRADE';
        const warning = newMode === 100
            ? 'Mode 100 enables strict audit logging and locks critical tables. All changes will be permanently recorded.'
            : 'Downgrading to Mode 98 will disable strict audit logging. This action will be recorded.';

        AionApp.showConfirm(`Confirm ${action} `, warning, async () => {
            AionApp.showLoading(`Switching to Mode ${newMode}...`);
            try {
                controlData.current_mode = newMode;
                controlData.last_mode_change_utc = new Date().toISOString();

                const content = { _meta: AionState.updateMeta(controlData._meta || AionState.createMeta()), ...controlData };
                await AionAPI.saveControlPanel(content, currentSha);

                if (AionState.isMode100() || newMode === 100) {
                    const auditRes = await AionAPI.loadAuditLog();
                    await AionAPI.appendAuditLog({
                        action: `MODE_CHANGE_${action} `,
                        description: `Switched from Mode ${controlData.current_mode === 100 ? 98 : 100} to Mode ${newMode} `,
                        user_id: AionState.getUserId()
                    }, auditRes.exists ? auditRes.content : null, auditRes.sha);
                }

                AionState.setCurrentMode(newMode);
                AionState.invalidateCache('controlPanel');
                AionState.invalidateCache('auditLog');
                AionApp.hideLoading();
                AionApp.showToast(`Switched to Mode ${newMode} `, 'success');
                render();
            } catch (e) {
                AionApp.hideLoading();
                AionApp.showToast('Mode switch failed: ' + e.message, 'error');
            }
        });
    }

    async function updateTimezone() {
        const tz = document.getElementById('pref-timezone').value;
        AionApp.showLoading('Saving preference...');
        try {
            const prefsRes = await AionAPI.loadUserPreferences();
            const prefs = prefsRes.exists ? prefsRes.content : { _meta: AionState.createMeta() };
            prefs.timezone = tz;
            prefs._meta = AionState.updateMeta(prefs._meta);
            await AionAPI.saveUserPreferences(prefs, prefsRes.sha);
            AionState.setTimezone(tz);
            AionState.invalidateCache('userPreferences');
            AionApp.hideLoading();
            AionApp.showToast('Timezone updated', 'success');
        } catch (e) {
            AionApp.hideLoading();
            AionApp.showToast('Failed to save: ' + e.message, 'error');
        }
    }

    async function handleExport() {
        AionApp.showLoading('Preparing backup...');
        try {
            const [trades, accounts, setups, rules, history, control, prefs, audit] = await Promise.all([
                AionAPI.loadTrades(), AionAPI.loadAccounts(), AionAPI.loadSetups(), AionAPI.loadRules(),
                AionAPI.loadTradeHistory(), AionAPI.loadControlPanel(), AionAPI.loadUserPreferences(), AionAPI.loadAuditLog()
            ]);

            const backup = {
                metadata: {
                    export_date: new Date().toISOString(),
                    user_id: AionState.getUserId(),
                    version: AionState.getSchemaVersion()
                },
                trades: trades.exists ? trades.content : null,
                accounts: accounts.exists ? accounts.content : null,
                setups: setups.exists ? setups.content : null,
                rules: rules.exists ? rules.content : null,
                history: history.exists ? history.content : null,
                control: control.exists ? control.content : null,
                preferences: prefs.exists ? prefs.content : null,
                audit_log: audit.exists ? audit.content : null
            };

            const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `aion_backup_${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            AionApp.hideLoading();
            AionApp.showToast('Backup downloaded successfully', 'success');
        } catch (e) {
            AionApp.hideLoading();
            AionApp.showToast('Export failed: ' + e.message, 'error');
        }
    }

    return { render, toggleMode, updateTimezone, handleExport, createUser, deleteUser, updateSyncPrefs };
})();

