/**
 * AION Journal OS - Playbook Viewer
 */

const AionPlaybook = (function () {
    'use strict';

    async function render() {
        const container = document.getElementById('page-playbook');
        container.innerHTML = '';

        const skel1 = document.createElement('div');
        skel1.className = 'skeleton h-64 mb-4';
        const skel2 = document.createElement('div');
        skel2.className = 'skeleton h-64 mb-4';
        container.appendChild(skel1);
        container.appendChild(skel2);

        try {
            const setupsRes = await AionAPI.loadSetups();
            const setups = setupsRes.exists ? setupsRes.content.setups || [] : [];

            if (setups.length === 0) {
                container.innerHTML = '';
                const card = createElement('div', 'aion-card');
                const empty = createElement('div', 'empty-state');
                empty.appendChild(createElement('h3', 'text-xl font-bold mb-2', 'No Playbook Setups Found'));
                empty.appendChild(createElement('p', 'text-aion-muted mb-4', 'Define your setups in the Strategies tab or upload a playbook_setups.json file.'));

                const btn = createElement('button', 'aion-btn aion-btn-primary', 'Go to Strategies');
                btn.onclick = () => AionApp.navigateTo('strategies');

                empty.appendChild(btn);
                card.appendChild(empty);
                container.appendChild(card);
                return;
            }

            const activeSetups = setups.filter(s => s.setup_status === 'ACTIVE');
            const pausedSetups = setups.filter(s => s.setup_status !== 'ACTIVE');

            // Sort by active first
            const allSetups = [...activeSetups, ...pausedSetups];

            container.innerHTML = '';

            // Header
            const header = createElement('div', 'flex items-center justify-between mb-6');
            header.appendChild(createElement('h2', 'text-2xl font-bold', 'Trading Playbook'));
            header.appendChild(createElement('span', 'text-sm text-aion-muted', `${activeSetups.length} Active, ${pausedSetups.length} Paused`));
            container.appendChild(header);

            // Cards
            const list = createElement('div', 'space-y-6');
            allSetups.forEach(s => list.appendChild(renderSetupCard(s)));
            container.appendChild(list);

        } catch (e) {
            container.innerHTML = '';
            const banner = document.createElement('div');
            banner.className = 'alert-banner danger';
            banner.textContent = `Failed to load playbook: ${e.message}`;
            container.appendChild(banner);
        }
    }

    function createElement(tag, className, text) {
        const el = document.createElement(tag);
        if (className) el.className = className;
        if (text) el.textContent = text;
        return el;
    }

    function renderSetupCard(setup) {
        const isActive = setup.setup_status === 'ACTIVE';
        const statusClass = isActive ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400';

        const card = createElement('div', `aion-card border-l-4 ${isActive ? 'border-l-aion-success' : 'border-l-aion-warning'} relative overflow-hidden group`);

        // Background Icon
        const bgIconDiv = createElement('div', 'absolute top-0 right-0 p-4 opacity-5 pointer-events-none group-hover:opacity-10 transition');
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('class', 'w-32 h-32');
        svg.setAttribute('fill', 'currentColor');
        svg.setAttribute('viewBox', '0 0 24 24');
        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.setAttribute('d', 'M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253');
        svg.appendChild(path);
        bgIconDiv.appendChild(svg);
        card.appendChild(bgIconDiv);

        // Content
        const content = createElement('div', 'relative z-10');

        // Header Row
        const headerRow = createElement('div', 'flex justify-between items-start mb-6');
        const titleCol = createElement('div');

        const titleRow = createElement('div', 'flex items-center gap-3 mb-2');
        titleRow.appendChild(createElement('h3', 'text-2xl font-bold text-aion-accent', setup.setup_name));
        titleRow.appendChild(createElement('span', `text-xs font-bold px-2 py-1 rounded ${statusClass}`, setup.setup_status));
        titleRow.appendChild(createElement('span', 'bg-gray-800 text-gray-400 text-xs px-2 py-1 rounded font-mono', setup.setup_id));
        titleCol.appendChild(titleRow);

        titleCol.appendChild(createElement('p', 'text-aion-muted italic', setup.notes || ''));
        headerRow.appendChild(titleCol);

        const rrCol = createElement('div', 'text-right');
        rrCol.appendChild(createElement('div', 'text-sm font-medium mb-1', 'Expected RR'));
        rrCol.appendChild(createElement('div', 'text-xl font-bold text-green-400', `${setup.expected_rr}R`));
        headerRow.appendChild(rrCol);

        content.appendChild(headerRow);

        // Grid
        const grid = createElement('div', 'grid grid-cols-1 md:grid-cols-2 gap-8');

        // Column 1
        const col1 = createElement('div', 'space-y-4');

        const createSection = (title, contentLines, isList = false, contentClass = '') => {
            const div = createElement('div');
            div.appendChild(createElement('h4', 'text-sm font-bold text-aion-muted uppercase tracking-wider mb-2', title));

            if (isList) {
                const ul = createElement('ul', 'text-sm space-y-1 text-aion-text');
                if (contentLines) {
                    contentLines.split('\n').forEach(line => {
                        const li = createElement('li', 'ml-4 list-disc', line);
                        ul.appendChild(li);
                    });
                } else {
                    ul.appendChild(createElement('li', 'ml-4 list-disc', '-'));
                }
                div.appendChild(ul);
            } else {
                const p = createElement('p', `text-sm ${contentClass}`);
                if (contentLines) {
                    // Handle newlines as breaks by appending text nodes and br
                    const lines = contentLines.split('\n');
                    lines.forEach((line, i) => {
                        p.appendChild(document.createTextNode(line));
                        if (i < lines.length - 1) p.appendChild(document.createElement('br'));
                    });
                } else {
                    p.textContent = '-';
                }
                div.appendChild(p);
            }
            return div;
        };

        col1.appendChild(createSection('Entry Criteria', setup.conditions, true));
        col1.appendChild(createSection('Execution Model', setup.entry_model, false, 'text-aion-text bg-aion-bg p-3 rounded border border-aion-border'));
        grid.appendChild(col1);

        // Column 2
        const col2 = createElement('div', 'space-y-4');

        const slTpGrid = createElement('div', 'grid grid-cols-2 gap-4');
        slTpGrid.appendChild(createSection('Stop Loss', setup.stop_loss_logic, false, 'text-red-300'));
        slTpGrid.appendChild(createSection('Take Profit', setup.take_profit_logic, false, 'text-green-300'));
        col2.appendChild(slTpGrid);

        const paramsDiv = createElement('div');
        paramsDiv.appendChild(createElement('h4', 'text-sm font-bold text-aion-muted uppercase tracking-wider mb-2', 'Parameters'));
        const tags = createElement('div', 'flex flex-wrap gap-2');

        if (setup.allowed_sessions) {
            setup.allowed_sessions.forEach(s => {
                tags.appendChild(createElement('span', 'bg-blue-900/50 text-blue-200 text-xs px-2 py-1 rounded', s.replace(/_/g, ' ')));
            });
        }
        tags.appendChild(createElement('span', 'bg-purple-900/50 text-purple-200 text-xs px-2 py-1 rounded', `Max ${setup.max_trades_per_day}/day`));
        paramsDiv.appendChild(tags);
        col2.appendChild(paramsDiv);

        grid.appendChild(col2);
        content.appendChild(grid);
        card.appendChild(content);

        return card;
    }

    return { render };
})();
