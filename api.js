/**
 * AION Journal OS - GitHub REST API Layer
 */

/**
 * AION Journal OS - Cloudflare Worker API Layer
 */

const AionAPI = (function () {
    'use strict';

    // CONFIGURATION: Update this to your deployed Worker URL
    const API_BASE = 'https://aion-journal-os.hassanali205031.workers.dev/api';

    async function request(endpoint, options = {}) {
        const url = `${API_BASE}${endpoint}`;
        const headers = {
            'Content-Type': 'application/json',
            ...options.headers
        };

        const response = await fetch(url, { ...options, headers, credentials: 'include' });

        if (response.status === 401) {
            AionState.clearAuthentication();
            throw new Error('Session expired');
        }

        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            throw new Error(error.error || `API Error: ${response.status}`);
        }

        return response.json();
    }

    // --- Authentication ---
    async function login(username, password) {
        return request('/auth/login', {
            method: 'POST',
            body: JSON.stringify({ username, password })
        });
    }

    async function logout() {
        return request('/auth/logout', { method: 'POST' });
    }

    async function getCurrentUser() {
        return request('/auth/me');
    }

    async function validateAuth() {
        try {
            const { user } = await getCurrentUser();
            return { valid: true, user };
        } catch {
            return { valid: false };
        }
    }

    // --- Data Management ---

    // Configs (Rules, Setups, etc)
    async function loadConfig(type) {
        const { content } = await request(`/data/${type}`);
        return { content: content || {}, exists: !!content };
    }

    async function saveConfig(type, content) {
        return request(`/data/${type}`, {
            method: 'POST',
            body: JSON.stringify(content)
        });
    }

    // Trades
    async function loadTrades() {
        const { trades } = await request('/data/trades');
        return { content: { trades }, exists: true };
    }

    async function saveTrades(trades) {
        // 'trades' is an object { trades: [...] } coming from saveFile calls usually
        // The API expects { trades: [...] }
        return request('/data/trades', {
            method: 'POST',
            body: JSON.stringify(trades)
        });
    }

    // Admin
    async function getAdminUsers() {
        const { users } = await request('/admin/users');
        return users;
    }

    async function createAdminUser(username, password, role) {
        return request('/admin/users', {
            method: 'POST',
            body: JSON.stringify({ username, password, role })
        });
    }

    async function deleteAdminUser(id) {
        return request(`/admin/users/${id}`, { method: 'DELETE' });
    }

    // --- Mappings to Old Interface (for compatibility) ---
    // These ensure minimal changes to UI files

    async function loadAccounts() { return loadConfig('accounts'); }
    async function saveAccounts(data) { return saveConfig('accounts', data); }

    async function loadRules() { return loadConfig('rules'); }
    async function saveRules(data) { return saveConfig('rules', data); }

    async function loadSetups() { return loadConfig('setups'); }
    async function saveSetups(data) { return saveConfig('setups', data); }

    async function loadControlPanel() { return loadConfig('control'); }
    async function saveControlPanel(data) { return saveConfig('control', data); }

    async function loadUserPreferences() { return loadConfig('preferences'); }
    async function saveUserPreferences(data) { return saveConfig('preferences', data); }

    // Trade History / Audit Log not fully implemented in phase 2 MVP datastore yet, mapped to generic config for now if needed, 
    // or keep in-memory if not critical. 
    // For now we map them to null/empty to prevent errors.
    async function loadTradeHistory() { return { content: { entries: [] }, exists: true }; }
    async function appendTradeHistory() { return { success: true }; }
    async function loadAuditLog() { return { content: { entries: [] }, exists: true }; }
    async function appendAuditLog() { return { success: true }; }
    async function loadRuleViolations() { return { content: { violations: [] }, exists: true }; }

    // Init Logic
    async function initUserFolder() {
        // No-op for DB
    }

    return {
        login, logout, validateAuth, getCurrentUser,
        loadAccounts, saveAccounts,
        loadRules, saveRules,
        loadSetups, saveSetups,
        loadTrades, saveTrades,
        loadControlPanel, saveControlPanel,
        loadUserPreferences, saveUserPreferences,
        loadTradeHistory, appendTradeHistory,
        loadAuditLog, appendAuditLog,
        loadRuleViolations,
        initUserFolder,
        getAdminUsers, createAdminUser, deleteAdminUser
    };
})();
