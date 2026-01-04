/**
 * AION Journal OS - Main Application Orchestrator
 */

const AionApp = (function () {
    'use strict';

    let isInitialized = false;

    async function init() {
        if (isInitialized) return;

        AionState.loadFromLocalStorage();
        setupEventListeners();
        setupNavigationHandlers();

        if (AionState.isAuthenticated()) {
            await attemptAutoLogin();
        } else {
            showAuthModal();
        }

        isInitialized = true;
    }

    function setupEventListeners() {
        document.getElementById('auth-btn').addEventListener('click', handleLogin);
        document.getElementById('logout-btn').addEventListener('click', handleLogout);
        document.getElementById('pat-input').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') handleLogin();
        });
        document.getElementById('confirm-cancel').addEventListener('click', hideConfirmModal);

        AionState.on('mode:change', updateModeDisplay);
        AionState.on('page:change', handlePageChange);
    }

    function setupNavigationHandlers() {
        document.querySelectorAll('[data-page]').forEach(btn => {
            btn.addEventListener('click', () => {
                const page = btn.dataset.page;
                navigateTo(page);
            });
        });
    }

    async function handleLogin() {
        const pat = document.getElementById('pat-input').value.trim();
        const repo = document.getElementById('repo-input').value.trim();
        const errorEl = document.getElementById('auth-error');
        const btn = document.getElementById('auth-btn');

        if (!pat || !repo) {
            showError(errorEl, 'Please enter both PAT and repository');
            return;
        }

        btn.disabled = true;
        btn.textContent = 'Connecting...';
        errorEl.classList.add('hidden');

        try {
            AionState.setAuthenticated(null, pat, repo);
            const result = await AionAPI.validateAuth();

            if (!result.valid) {
                throw new Error(result.error || 'Invalid token');
            }

            AionState.setAuthenticated(result.userId, pat, repo);
            hideAuthModal();
            await loadInitialData();
            navigateTo('dashboard');
            showToast('Connected successfully', 'success');
        } catch (e) {
            AionState.clearAuthentication();
            showError(errorEl, e.message);
        } finally {
            btn.disabled = false;
            btn.textContent = 'Connect to GitHub';
        }
    }

    async function attemptAutoLogin() {
        showLoading('Reconnecting...');
        try {
            const result = await AionAPI.validateAuth();
            if (result.valid) {
                hideAuthModal();
                await loadInitialData();
                navigateTo(AionState.getCurrentPage() || 'dashboard');
            } else {
                throw new Error('Session expired');
            }
        } catch (e) {
            AionState.clearAuthentication();
            showAuthModal();
        } finally {
            hideLoading();
        }
    }

    function handleLogout() {
        showConfirm('Logout', 'Are you sure you want to disconnect?', () => {
            AionState.clearAuthentication();
            showAuthModal();
            document.getElementById('pat-input').value = '';
            document.getElementById('repo-input').value = '';
        });
    }

    async function loadInitialData() {
        showLoading('Loading data...');
        try {
            const controlPanel = await AionAPI.loadControlPanel();
            if (controlPanel.exists && controlPanel.content) {
                AionState.setCurrentMode(controlPanel.content.current_mode || 98);
            }

            const prefs = await AionAPI.loadUserPreferences();
            if (prefs.exists && prefs.content?.timezone) {
                AionState.setTimezone(prefs.content.timezone);
            }

            document.getElementById('user-info').textContent = `ID: ${AionState.getUserId()}`;
            updateModeDisplay();
        } catch (e) {
            showToast('Some data failed to load', 'warning');
        } finally {
            hideLoading();
        }
    }

    function navigateTo(page, params = {}) {
        AionState.setCurrentPage(page);
        updateNavigation(page);

        document.querySelectorAll('.page').forEach(p => p.classList.add('hidden'));
        const pageEl = document.getElementById(`page-${page}`);
        if (pageEl) pageEl.classList.remove('hidden');

        switch (page) {
            case 'dashboard': AionDashboard.render(); break;
            case 'trades': AionTrades.render(); break;
            case 'trade-detail': AionTradeDetail.render(params.tradeId); break;
            case 'strategies': AionStrategies.render(); break;
            case 'rules': AionRules.render(); break;
            case 'analytics': AionAnalyticsUI.render(); break;
            case 'control': AionControlPanel.render(); break;
        }
    }

    function updateNavigation(activePage) {
        document.querySelectorAll('.nav-btn, .nav-btn-mobile').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.page === activePage);
        });
    }

    function handlePageChange({ currentPage }) {
        updateNavigation(currentPage);
    }

    function updateModeDisplay() {
        const badge = document.getElementById('mode-badge');
        const mode = AionState.getCurrentMode();
        badge.textContent = `MODE ${mode}`;
        badge.className = `px-3 py-1 rounded-full text-xs font-bold ${mode === 100 ? 'mode-100' : 'mode-98'}`;
    }

    function showAuthModal() {
        document.getElementById('auth-modal').classList.remove('hidden');
        document.getElementById('app-container').classList.add('hidden');
    }

    function hideAuthModal() {
        document.getElementById('auth-modal').classList.add('hidden');
        document.getElementById('app-container').classList.remove('hidden');
    }

    function showLoading(text = 'Loading...') {
        document.getElementById('loading-text').textContent = text;
        document.getElementById('loading-overlay').classList.remove('hidden');
    }

    function hideLoading() {
        document.getElementById('loading-overlay').classList.add('hidden');
    }

    function showToast(message, type = 'info') {
        const container = document.getElementById('toast-container');
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.innerHTML = `<span>${message}</span>`;
        container.appendChild(toast);
        setTimeout(() => toast.remove(), 4000);
    }

    function showError(element, message) {
        element.textContent = message;
        element.classList.remove('hidden');
    }

    function showConfirm(title, message, onConfirm) {
        document.getElementById('confirm-title').textContent = title;
        document.getElementById('confirm-message').textContent = message;
        document.getElementById('confirm-modal').classList.remove('hidden');

        const okBtn = document.getElementById('confirm-ok');
        const handler = () => {
            hideConfirmModal();
            onConfirm();
            okBtn.removeEventListener('click', handler);
        };
        okBtn.addEventListener('click', handler);
    }

    function hideConfirmModal() {
        document.getElementById('confirm-modal').classList.add('hidden');
    }

    function formatDate(utcDate, format = 'short') {
        if (!utcDate) return '-';
        const date = new Date(utcDate);
        const tz = AionState.getTimezone();

        if (format === 'short') {
            return date.toLocaleDateString('en-US', { timeZone: tz, month: 'short', day: 'numeric' });
        } else if (format === 'full') {
            return date.toLocaleString('en-US', { timeZone: tz });
        } else if (format === 'time') {
            return date.toLocaleTimeString('en-US', { timeZone: tz, hour: '2-digit', minute: '2-digit' });
        }
        return date.toLocaleDateString('en-US', { timeZone: tz });
    }

    function formatCurrency(value) {
        if (value === null || value === undefined) return '-';
        return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
    }

    function formatPercent(value) {
        if (value === null || value === undefined) return '-';
        return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
    }

    document.addEventListener('DOMContentLoaded', init);

    return {
        navigateTo, showLoading, hideLoading, showToast, showConfirm,
        formatDate, formatCurrency, formatPercent
    };
})();
