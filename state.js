/**
 * AION Journal OS - Global State Management
 */

const AionState = (function() {
    'use strict';

    const SCHEMA_VERSION = '1.0.0';
    const STORAGE_KEY = 'aion_state';

    const state = {
        isAuthenticated: false,
        userId: null,
        pat: null,
        repo: null,
        currentMode: 98,
        currentPage: 'dashboard',
        selectedTradeId: null,
        timezone: 'Asia/Karachi',
        cache: {},
        cacheTimestamps: {},
        pendingChanges: [],
        isOnline: navigator.onLine
    };

    const listeners = new Map();

    function emit(event, data) {
        if (listeners.has(event)) {
            listeners.get(event).forEach(cb => { try { cb(data); } catch(e) {} });
        }
    }

    function on(event, callback) {
        if (!listeners.has(event)) listeners.set(event, new Set());
        listeners.get(event).add(callback);
        return () => listeners.get(event).delete(callback);
    }

    function off(event, callback) {
        if (listeners.has(event)) listeners.get(event).delete(callback);
    }

    function getSchemaVersion() { return SCHEMA_VERSION; }

    function isSchemaCompatible(version) {
        if (!version) return false;
        return version.split('.')[0] === SCHEMA_VERSION.split('.')[0];
    }

    function setAuthenticated(userId, pat, repo) {
        state.isAuthenticated = true;
        state.userId = userId;
        state.pat = pat;
        state.repo = repo;
        saveToLocalStorage();
        emit('auth:change', { isAuthenticated: true, userId });
    }

    function clearAuthentication() {
        state.isAuthenticated = false;
        state.userId = null;
        state.pat = null;
        state.repo = null;
        state.cache = {};
        saveToLocalStorage();
        emit('auth:change', { isAuthenticated: false });
    }

    function isAuthenticated() { return state.isAuthenticated && state.pat && state.userId; }
    function getUserId() { return state.userId; }
    function getPat() { return state.pat; }
    function getRepo() { return state.repo; }
    function getUserDataPath() { return state.userId ? `users/${state.userId}` : null; }

    function setCurrentMode(mode) {
        if (mode !== 98 && mode !== 100) throw new Error('Invalid mode');
        state.currentMode = mode;
        saveToLocalStorage();
        emit('mode:change', { currentMode: mode });
    }

    function getCurrentMode() { return state.currentMode; }
    function isMode100() { return state.currentMode === 100; }

    function setCurrentPage(page) {
        state.currentPage = page;
        emit('page:change', { currentPage: page });
    }

    function getCurrentPage() { return state.currentPage; }

    function setSelectedTrade(tradeId) {
        state.selectedTradeId = tradeId;
        emit('trade:selected', { tradeId });
    }

    function getSelectedTrade() { return state.selectedTradeId; }

    function setTimezone(tz) {
        state.timezone = tz;
        saveToLocalStorage();
        emit('timezone:change', { timezone: tz });
    }

    function getTimezone() { return state.timezone; }

    function setCache(key, data) {
        state.cache[key] = data;
        state.cacheTimestamps[key] = Date.now();
    }

    function getCache(key) { return state.cache[key]; }
    function invalidateCache(key) { if (key) { delete state.cache[key]; delete state.cacheTimestamps[key]; } }
    function clearCache() { state.cache = {}; state.cacheTimestamps = {}; }

    function addPendingChange(change) {
        state.pendingChanges.push({ ...change, timestamp: new Date().toISOString(), id: crypto.randomUUID() });
        saveToLocalStorage();
    }

    function getPendingChanges() { return [...state.pendingChanges]; }

    function removePendingChange(id) {
        state.pendingChanges = state.pendingChanges.filter(c => c.id !== id);
        saveToLocalStorage();
    }

    function clearPendingChanges() { state.pendingChanges = []; saveToLocalStorage(); }

    function setOnlineStatus(isOnline) { state.isOnline = isOnline; emit('online:change', { isOnline }); }
    function isOnline() { return state.isOnline; }

    function saveToLocalStorage() {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify({
                isAuthenticated: state.isAuthenticated,
                userId: state.userId,
                pat: state.pat,
                repo: state.repo,
                currentMode: state.currentMode,
                timezone: state.timezone,
                pendingChanges: state.pendingChanges
            }));
        } catch(e) {}
    }

    function loadFromLocalStorage() {
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            if (stored) {
                const data = JSON.parse(stored);
                Object.assign(state, {
                    isAuthenticated: data.isAuthenticated || false,
                    userId: data.userId || null,
                    pat: data.pat || null,
                    repo: data.repo || null,
                    currentMode: data.currentMode || 98,
                    timezone: data.timezone || 'Asia/Karachi',
                    pendingChanges: data.pendingChanges || []
                });
                return true;
            }
        } catch(e) {}
        return false;
    }

    function createMeta() {
        const now = new Date().toISOString();
        return { schema_version: SCHEMA_VERSION, created_at_utc: now, last_modified_at_utc: now, owner_user_id: state.userId };
    }

    function updateMeta(meta) {
        return { ...meta, last_modified_at_utc: new Date().toISOString() };
    }

    window.addEventListener('online', () => setOnlineStatus(true));
    window.addEventListener('offline', () => setOnlineStatus(false));

    return {
        on, off, emit, getSchemaVersion, isSchemaCompatible,
        setAuthenticated, clearAuthentication, isAuthenticated, getUserId, getPat, getRepo, getUserDataPath,
        setCurrentMode, getCurrentMode, isMode100,
        setCurrentPage, getCurrentPage, setSelectedTrade, getSelectedTrade,
        setTimezone, getTimezone,
        setCache, getCache, invalidateCache, clearCache,
        addPendingChange, getPendingChanges, removePendingChange, clearPendingChanges,
        setOnlineStatus, isOnline, loadFromLocalStorage, createMeta, updateMeta
    };
})();
