/**
 * AION Journal OS - Control Panel Page
 */

const AionControlPanel = (function () {
    'use strict';

    let controlData = null;
    let currentSha = null;

    async function render() {
        const container = document.getElementById('page-control');
        container.innerHTML = '<div class="skeleton h-64"></div>';

        try {
            const [controlRes, prefsRes, auditRes] = await Promise.all([
                AionAPI.loadControlPanel(), AionAPI.loadUserPreferences(), AionAPI.loadAuditLog()
            ]);

            controlData = controlRes.exists ? controlRes.content : getDefaultControlPanel();
            currentSha = controlRes.sha;
            const prefs = prefsRes.exists ? prefsRes.content : { timezone: 'Asia/Karachi' };
            const auditLog = auditRes.exists ? auditRes.content.entries || [] : [];

            container.innerHTML = `
                <h2 class="text-2xl font-bold mb-6">Control Panel</h2>
                ${renderModeControl()}
                ${renderLockedSheets()}
                ${renderUpgradeReadiness()}
                ${renderPreferences(prefs)}
                ${renderAuditLog(auditLog)}
            `;
        } catch (e) {
            container.innerHTML = `<div class="alert-banner danger">Failed to load control panel: ${e.message}</div>`;
        }
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
        return `
            <div class="aion-card mb-6">
                <h3 class="section-title mb-4">Operating Mode</h3>
                <div class="flex flex-col md:flex-row md:items-center gap-4">
                    <div class="flex-1">
                        <div class="flex items-center gap-4 mb-2">
                            <span class="text-4xl font-bold ${isMode100 ? 'text-red-400' : 'text-yellow-400'}">MODE ${controlData.current_mode}</span>
                            <span class="state-badge ${isMode100 ? 'mode-100' : 'mode-98'}">${isMode100 ? 'LOCKED' : 'STANDARD'}</span>
                        </div>
                        <p class="text-sm text-aion-muted">${controlData.manual_override_warning}</p>
                        ${controlData.last_mode_change_utc ? `<p class="text-xs text-aion-muted mt-1">Last changed: ${AionApp.formatDate(controlData.last_mode_change_utc, 'full')}</p>` : ''}
                    </div>
                    <button onclick="AionControlPanel.toggleMode()" class="aion-btn ${isMode100 ? 'aion-btn-secondary' : 'aion-btn-danger'}">
                        ${isMode100 ? 'Downgrade to Mode 98' : 'Upgrade to Mode 100'}
                    </button>
                </div>
            </div>
        `;
    }

    function renderLockedSheets() {
        const sheets = controlData.locked_sheets || [];
        return `
            <div class="aion-card mb-6">
                <h3 class="section-title mb-4">Locked Sheets (Mode 100)</h3>
                <p class="text-sm text-aion-muted mb-4">These tables are locked in Mode 100 and all changes are audited.</p>
                <div class="flex flex-wrap gap-2">
                    ${sheets.map(s => `<span class="px-3 py-1 bg-red-500/20 text-red-400 rounded-full text-sm">${s}</span>`).join('')}
                </div>
            </div>
        `;
    }

    function renderUpgradeReadiness() {
        const score = controlData.upgrade_ready_score || 0;
        const triggers = controlData.upgrade_triggers || [];
        const progressClass = score >= 80 ? 'bg-green-500' : score >= 50 ? 'bg-yellow-500' : 'bg-red-500';

        return `
            <div class="aion-card mb-6">
                <h3 class="section-title mb-4">Upgrade Readiness</h3>
                <div class="flex items-center gap-4 mb-4">
                    <div class="flex-1 h-3 bg-aion-bg rounded-full overflow-hidden">
                        <div class="${progressClass} h-full transition-all" style="width: ${score}%"></div>
                    </div>
                    <span class="text-lg font-bold">${score}%</span>
                </div>
                ${triggers.length > 0 ? `
                    <div class="space-y-2">
                        <p class="text-sm font-medium">Triggers for Mode 100:</p>
                        ${triggers.map(t => `<div class="flex items-center gap-2 text-sm text-aion-muted"><svg class="w-4 h-4 text-green-400" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"></path></svg>${t}</div>`).join('')}
                    </div>
                ` : '<p class="text-sm text-aion-muted">Complete more trades to improve readiness score</p>'}
            </div>
        `;
    }

    function renderPreferences(prefs) {
        const timezones = ['UTC', 'Asia/Karachi', 'Asia/Dubai', 'Europe/London', 'America/New_York', 'America/Chicago', 'America/Los_Angeles', 'Asia/Tokyo', 'Asia/Singapore', 'Australia/Sydney'];

        return `
            <div class="aion-card mb-6">
                <h3 class="section-title mb-4">User Preferences</h3>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label class="block text-sm font-medium mb-1">Display Timezone</label>
                        <select id="pref-timezone" class="aion-input aion-select" onchange="AionControlPanel.updateTimezone()">
                            ${timezones.map(tz => `<option value="${tz}" ${prefs.timezone === tz ? 'selected' : ''}>${tz}</option>`).join('')}
                        </select>
                    </div>
                </div>
            </div>
        `;
    }

    function renderAuditLog(entries) {
        if (entries.length === 0) {
            return `
                <div class="aion-card">
                    <h3 class="section-title mb-4">Audit Log</h3>
                    <p class="text-sm text-aion-muted">No audit entries yet. Enable Mode 100 to start logging.</p>
                </div>
            `;
        }

        const recent = entries.slice(-20).reverse();
        const rows = recent.map(e => `
            <tr>
                <td class="text-xs font-mono text-aion-muted">${AionApp.formatDate(e.timestamp_utc, 'full')}</td>
                <td><span class="text-xs px-2 py-1 rounded ${e.action?.includes('MODE') ? 'bg-purple-500/20 text-purple-400' : 'bg-blue-500/20 text-blue-400'}">${e.action || 'UNKNOWN'}</span></td>
                <td class="text-sm">${e.description || '-'}</td>
            </tr>
        `).join('');

        return `
            <div class="aion-card">
                <h3 class="section-title mb-4">Audit Log (${entries.length} entries)</h3>
                <div class="overflow-x-auto">
                    <table class="aion-table">
                        <thead><tr><th>Time</th><th>Action</th><th>Description</th></tr></thead>
                        <tbody>${rows}</tbody>
                    </table>
                </div>
            </div>
        `;
    }

    async function toggleMode() {
        const newMode = controlData.current_mode === 98 ? 100 : 98;
        const action = newMode === 100 ? 'UPGRADE' : 'DOWNGRADE';
        const warning = newMode === 100
            ? 'Mode 100 enables strict audit logging and locks critical tables. All changes will be permanently recorded.'
            : 'Downgrading to Mode 98 will disable strict audit logging. This action will be recorded.';

        AionApp.showConfirm(`Confirm ${action}`, warning, async () => {
            AionApp.showLoading(`Switching to Mode ${newMode}...`);
            try {
                controlData.current_mode = newMode;
                controlData.last_mode_change_utc = new Date().toISOString();

                const content = { _meta: AionState.updateMeta(controlData._meta || AionState.createMeta()), ...controlData };
                await AionAPI.saveControlPanel(content, currentSha);

                if (AionState.isMode100() || newMode === 100) {
                    const auditRes = await AionAPI.loadAuditLog();
                    await AionAPI.appendAuditLog({
                        action: `MODE_CHANGE_${action}`,
                        description: `Switched from Mode ${controlData.current_mode === 100 ? 98 : 100} to Mode ${newMode}`,
                        user_id: AionState.getUserId()
                    }, auditRes.exists ? auditRes.content : null, auditRes.sha);
                }

                AionState.setCurrentMode(newMode);
                AionState.invalidateCache('controlPanel');
                AionState.invalidateCache('auditLog');
                AionApp.hideLoading();
                AionApp.showToast(`Switched to Mode ${newMode}`, 'success');
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

    return { render, toggleMode, updateTimezone };
})();
