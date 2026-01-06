/**
 * AION Journal OS - Admin Logic
 * User Management and System Administration
 */

import { getUserFromRequest, generateHash } from './auth.js';

export async function handleAdmin(request, env) {
    const user = await getUserFromRequest(request, env);
    const url = new URL(request.url);
    const path = url.pathname.replace('/api/admin', '');

    // Bootstrap Logic: Allow creating the first user if DB is empty
    if (!user && path === '/users' && request.method === 'POST') {
        const countStr = await env.DB.prepare('SELECT count(*) as count FROM users').first();
        if (countStr.count === 0) {
            return createUser(request, env, true); // true = force admin
        }
    }

    if (!user || user.role !== 'ADMIN') {
        return new Response('Unauthorized', { status: 403 });
    }

    if (path === '/users' && request.method === 'GET') {
        return listUsers(env);
    } else if (path === '/users' && request.method === 'POST') {
        return createUser(request, env);
    } else if (path.startsWith('/users/') && request.method === 'DELETE') {
        const id = path.split('/')[2];
        // Validate UUID format to prevent injection
        if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
            return new Response(JSON.stringify({ error: 'Invalid user ID format' }), { status: 400 });
        }
        return deleteUser(id, env, user);
    }

    return new Response('Method Not Allowed', { status: 405 });
}

async function listUsers(env) {
    const { results } = await env.DB.prepare('SELECT id, username, role, created_at, last_login FROM users').all();
    return new Response(JSON.stringify({ users: results }), { headers: { 'Content-Type': 'application/json' } });
}

async function createUser(request, env, forceAdmin = false) {
    const { username, password, role } = await request.json();

    if (!username || !password) {
        return new Response(JSON.stringify({ error: 'Username and password required' }), { status: 400 });
    }

    // Check if user exists
    const existing = await env.DB.prepare('SELECT id FROM users WHERE username = ?').bind(username).first();
    if (existing) {
        return new Response(JSON.stringify({ error: 'Username already taken' }), { status: 409 });
    }

    const { hash, salt } = await generateHash(password);
    const id = crypto.randomUUID();
    const createdAt = Date.now();

    // If bootstrapping, force ADMIN role. Otherwise use requested role (sanitized).
    const safeRole = forceAdmin ? 'ADMIN' : (role === 'ADMIN' ? 'ADMIN' : 'USER');

    await env.DB.prepare(
        'INSERT INTO users (id, username, password_hash, salt, role, created_at) VALUES (?, ?, ?, ?, ?, ?)'
    ).bind(id, username, hash, salt, safeRole, createdAt).run();

    // Initialize user data slots
    const tables = ['ACCOUNTS', 'RULES', 'SETUPS', 'PREFS', 'CONTROL'];
    for (const type of tables) {
        await env.DB.prepare(
            'INSERT INTO user_data (user_id, type, data, updated_at) VALUES (?, ?, ?, ?)'
        ).bind(id, type, '{}', createdAt).run();
    }

    return new Response(JSON.stringify({ success: true, user: { id, username, role: safeRole } }), { status: 201 });
}

async function deleteUser(id, env, currentUser) {
    // Prevent deleting self
    if (id === currentUser.id) {
        return new Response(JSON.stringify({ error: 'Cannot delete your own account' }), { status: 400 });
    }

    // Cascade delete: remove user's trades and config data first
    await env.DB.batch([
        env.DB.prepare('DELETE FROM trades WHERE user_id = ?').bind(id),
        env.DB.prepare('DELETE FROM user_data WHERE user_id = ?').bind(id),
        env.DB.prepare('DELETE FROM users WHERE id = ?').bind(id)
    ]);
    return new Response(JSON.stringify({ success: true }));
}
