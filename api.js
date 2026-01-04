/**
 * AION Journal OS - GitHub REST API Layer
 */

const AionAPI = (function () {
    'use strict';

    const BASE_URL = 'https://api.github.com';
    let rateLimitRemaining = 5000;
    let rateLimitReset = null;

    async function request(endpoint, options = {}) {
        const pat = AionState.getPat();
        if (!pat) throw new Error('Not authenticated');

        const url = endpoint.startsWith('http') ? endpoint : `${BASE_URL}${endpoint}`;
        const headers = {
            'Authorization': `Bearer ${pat}`,
            'Accept': 'application/vnd.github.v3+json',
            'X-GitHub-Api-Version': '2022-11-28',
            ...options.headers
        };

        const response = await fetch(url, { ...options, headers });

        rateLimitRemaining = parseInt(response.headers.get('X-RateLimit-Remaining') || '5000');
        rateLimitReset = parseInt(response.headers.get('X-RateLimit-Reset') || '0');

        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            throw new Error(error.message || `API Error: ${response.status}`);
        }

        return response;
    }

    async function getCurrentUser() {
        const response = await request('/user');
        return response.json();
    }

    async function validateAuth() {
        try {
            const user = await getCurrentUser();
            return { valid: true, userId: user.id, login: user.login };
        } catch (e) {
            return { valid: false, error: e.message };
        }
    }

    async function getFile(path) {
        const repo = AionState.getRepo();

        try {
            const response = await request(`/repos/${repo}/contents/${path}`);
            const data = await response.json();
            const content = JSON.parse(atob(data.content));
            return { content, sha: data.sha, exists: true };
        } catch (e) {
            if (e.message.includes('404') || e.message.includes('Not Found')) {
                return { content: null, sha: null, exists: false };
            }
            throw e;
        }
    }



    async function saveFile(path, content, message, existingSha = null) {
        const repo = AionState.getRepo();

        const body = {
            message: message || `Update ${path}`,
            content: btoa(JSON.stringify(content, null, 2)),
            branch: 'main'
        };

        if (existingSha) body.sha = existingSha;

        const response = await request(`/repos/${repo}/contents/${path}`, {
            method: 'PUT',
            body: JSON.stringify(body)
        });

        const data = await response.json();
        AionState.invalidateCache(path);
        return { sha: data.content.sha, success: true };
    }


    async function getFileWithCache(path, cacheKey, maxAge = 60000) {
        const cached = AionState.getCache(cacheKey);
        if (cached && (Date.now() - (AionState.getCacheTimestamp?.(cacheKey) || 0)) < maxAge) {
            return cached;
        }

        const result = await getFile(path);
        if (result.exists) {
            AionState.setCache(cacheKey, result);
        }
        return result;
    }

    async function initUserFolder() {
        const userPath = AionState.getUserDataPath();
        const folders = ['data', 'locked_100', 'control', 'ai_docs', 'readme'];

        for (const folder of folders) {
            const path = `${folder}/.gitkeep`;
            try {
                await getFile(path);
            } catch {
                await saveFile(path, '', `Initialize ${folder} folder`);
            }
        }
    }

    async function loadAccounts() {
        return getFileWithCache('data/accounts.json', 'accounts');
    }

    async function saveAccounts(accounts, sha) {
        return saveFile('data/accounts.json', accounts, 'Update accounts', sha);
    }

    async function loadRules() {
        return getFileWithCache('data/rules.json', 'rules');
    }

    async function saveRules(rules, sha) {
        return saveFile('data/rules.json', rules, 'Update rules', sha);
    }

    async function loadSetups() {
        return getFileWithCache('data/playbook_setups.json', 'setups');
    }

    async function saveSetups(setups, sha) {
        return saveFile('data/playbook_setups.json', setups, 'Update playbook setups', sha);
    }

    async function loadTrades() {
        return getFileWithCache('data/trades.json', 'trades');
    }

    async function saveTrades(trades, sha) {
        return saveFile('data/trades.json', trades, 'Update trades', sha);
    }

    async function loadTradeHistory() {
        return getFileWithCache('data/trade_history.json', 'tradeHistory');
    }

    async function appendTradeHistory(entry, existingHistory, sha) {
        const history = existingHistory || { _meta: AionState.createMeta(), entries: [] };
        history.entries.push(entry);
        history._meta = AionState.updateMeta(history._meta);
        return saveFile('data/trade_history.json', history, 'Append trade history', sha);
    }

    async function loadControlPanel() {
        return getFileWithCache('control/CONTROL_PANEL.json', 'controlPanel');
    }

    async function saveControlPanel(panel, sha) {
        return saveFile('control/CONTROL_PANEL.json', panel, 'Update control panel', sha);
    }

    async function loadUserPreferences() {
        return getFileWithCache('control/user_preferences.json', 'userPreferences');
    }

    async function saveUserPreferences(prefs, sha) {
        return saveFile('control/user_preferences.json', prefs, 'Update user preferences', sha);
    }

    async function loadAuditLog() {
        return getFileWithCache('locked_100/audit_log.json', 'auditLog');
    }

    async function appendAuditLog(entry, existingLog, sha) {
        const log = existingLog || { _meta: AionState.createMeta(), entries: [], status: 'LOCKED' };
        log.entries.push({ ...entry, timestamp_utc: new Date().toISOString() });
        log._meta = AionState.updateMeta(log._meta);
        return saveFile('locked_100/audit_log.json', log, 'Append audit log', sha);
    }

    async function loadTradeContext() { return getFileWithCache('data/trade_context.json', 'tradeContext'); }
    async function loadTradeExecution() { return getFileWithCache('data/trade_execution.json', 'tradeExecution'); }
    async function loadTradePsychology() { return getFileWithCache('data/trade_psychology.json', 'tradePsychology'); }
    async function loadTradeNarrative() { return getFileWithCache('data/trade_narrative.json', 'tradeNarrative'); }
    async function loadManagementNotes() { return getFileWithCache('data/management_notes.json', 'managementNotes'); }
    async function loadRuleViolations() { return getFileWithCache('data/rule_violations.json', 'ruleViolations'); }

    function getRateLimitInfo() {
        return { remaining: rateLimitRemaining, reset: rateLimitReset };
    }

    return {
        validateAuth, getCurrentUser, getFile, saveFile,
        initUserFolder, loadAccounts, saveAccounts, loadRules, saveRules,
        loadSetups, saveSetups, loadTrades, saveTrades,
        loadTradeHistory, appendTradeHistory, loadControlPanel, saveControlPanel,
        loadUserPreferences, saveUserPreferences, loadAuditLog, appendAuditLog,
        loadTradeContext, loadTradeExecution, loadTradePsychology,
        loadTradeNarrative, loadManagementNotes, loadRuleViolations,
        getRateLimitInfo
    };
})();
