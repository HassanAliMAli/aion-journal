/**
 * AION Journal OS - Data Persistence Logic
 * Handles Trades, Accounts, and Config storage via D1
 */

import { getUserFromRequest } from './auth.js';
import { GitHubSync } from './github_sync.js';

export async function handleData(request, env, executionCtx) {
    const user = await getUserFromRequest(request, env);
    if (!user) return new Response('Unauthorized', { status: 401 });

    const url = new URL(request.url);
    const path = url.pathname.replace('/api/data', '');
    const segments = path.split('/').filter(Boolean); // e.g. ['trades'] or ['accounts']

    if (segments.length === 0 && request.method === 'GET') {
        return syncAllData(user.id, env);
    }

    const resource = segments[0];

    // Handle Trades (High volume, separate table)
    if (resource === 'trades') {
        if (request.method === 'GET') return getTrades(user.id, env);
        if (request.method === 'POST') return saveTrades(user.id, request, env, executionCtx); // Pass executionCtx
    }

    // Handle Config/Meta (Accounts, Rules, etc - Stored in user_data)
    if (['accounts', 'rules', 'setups', 'control', 'preferences'].includes(resource)) {
        if (request.method === 'GET') return getConfig(user.id, resource, env);
        if (request.method === 'POST') return saveConfig(user.id, resource, request, env, executionCtx); // Pass executionCtx
    }

    return new Response('Not Found', { status: 404 });
}

// --- Trades Logic ---

async function getTrades(userId, env) {
    const { results } = await env.DB.prepare('SELECT id, data, updated_at FROM trades WHERE user_id = ?').bind(userId).all();
    const trades = results.map(r => JSON.parse(r.data));
    return new Response(JSON.stringify({ trades }), { headers: { 'Content-Type': 'application/json' } });
}

async function saveTrades(userId, request, env, executionCtx) {
    let body;
    try {
        body = await request.json();
    } catch {
        return new Response(JSON.stringify({ error: 'Invalid JSON payload' }), { status: 400 });
    }
    const trades = body.trades;

    if (!Array.isArray(trades)) {
        return new Response(JSON.stringify({ error: 'Invalid trades payload: expected array' }), { status: 400 });
    }

    // Validate and normalize trade_id for each trade
    const now = Date.now();
    const normalizedTrades = trades.map((trade, idx) => ({
        ...trade,
        trade_id: trade.trade_id || `T-${now}-${idx}`
    }));

    // Batch upsert
    const stmt = env.DB.prepare(`
        INSERT INTO trades (id, user_id, data, instrument, entry_date, status, updated_at) 
        VALUES (?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET 
        data=excluded.data, instrument=excluded.instrument, status=excluded.status, updated_at=excluded.updated_at
    `);

    const batch = normalizedTrades.map(trade => {
        return stmt.bind(
            trade.trade_id,
            userId,
            JSON.stringify(trade),
            trade.instrument || null,
            trade.entry_date || null,
            trade.trade_status || null,
            Date.now()
        );
    });

    await env.DB.batch(batch);

    // GitHub Sync (Fire and Forget)
    if (executionCtx && env.GITHUB_PAT) {
        executionCtx.waitUntil((async () => {
            const userRes = await env.DB.prepare('SELECT username FROM users WHERE id = ?').bind(userId).first();
            const prefRes = await env.DB.prepare("SELECT data FROM user_data WHERE user_id = ? AND type = 'PREFS'").bind(userId).first();

            const username = userRes?.username || 'unknown_user';
            const prefs = prefRes ? JSON.parse(prefRes.data) : {};
            const naming = prefs.naming_convention || 'PAIR_DIRECTION';

            // Sync each trade individually
            const syncPromises = normalizedTrades.map(t => GitHubSync.syncTrade({ username }, t, naming, env));
            await Promise.all(syncPromises);
        })());
    }

    return new Response(JSON.stringify({ success: true, count: normalizedTrades.length }));
}

// --- Config Logic ---

async function getConfig(userId, type, env) {
    // Explicit key mapping
    const keyMap = { preferences: 'PREFS', accounts: 'ACCOUNTS', rules: 'RULES', setups: 'SETUPS', control: 'CONTROL' };
    const key = keyMap[type.toLowerCase()] || type.toUpperCase();
    const result = await env.DB.prepare('SELECT data FROM user_data WHERE user_id = ? AND type = ?').bind(userId, key).first();

    const content = result ? JSON.parse(result.data) : {};
    return new Response(JSON.stringify({ content }), { headers: { 'Content-Type': 'application/json' } });
}

async function saveConfig(userId, type, request, env, executionCtx) {
    // Explicit key mapping (same as getConfig)
    const keyMap = { preferences: 'PREFS', accounts: 'ACCOUNTS', rules: 'RULES', setups: 'SETUPS', control: 'CONTROL' };
    const key = keyMap[type.toLowerCase()] || type.toUpperCase();
    let content;
    try {
        content = await request.json();
    } catch {
        return new Response(JSON.stringify({ error: 'Invalid JSON payload' }), { status: 400 });
    }

    await env.DB.prepare(`
        INSERT INTO user_data (user_id, type, data, updated_at)
        VALUES (?, ?, ?, ?)
        ON CONFLICT(user_id, type) DO UPDATE SET data=excluded.data, updated_at=excluded.updated_at
    `).bind(userId, key, JSON.stringify(content), Date.now()).run();

    // GitHub Sync (Fire and Forget)
    if (executionCtx && env.GITHUB_PAT) {
        executionCtx.waitUntil((async () => {
            const userRes = await env.DB.prepare('SELECT username FROM users WHERE id = ?').bind(userId).first();
            const username = userRes?.username || 'unknown_user';
            await GitHubSync.syncConfig({ username }, key, content, env);
        })());
    }

    return new Response(JSON.stringify({ success: true }));
}

// --- Sync Logic (Bootstrap) ---
async function syncAllData(userId, env) {
    const [trades, userData] = await Promise.all([
        env.DB.prepare('SELECT data FROM trades WHERE user_id = ?').bind(userId).all(),
        env.DB.prepare('SELECT type, data FROM user_data WHERE user_id = ?').bind(userId).all()
    ]);

    const data = {
        trades: trades.results.map(r => JSON.parse(r.data)),
        configs: {}
    };

    userData.results.forEach(r => {
        data.configs[r.type.toLowerCase()] = JSON.parse(r.data);
    });

    return new Response(JSON.stringify(data), { headers: { 'Content-Type': 'application/json' } });
}
