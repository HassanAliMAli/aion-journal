/**
 * AION Journal OS - Authentication Logic
 * Handles Password Hashing (PBKDF2) and JWT Session Management
 */

// Configuration
// JWT_SECRET must be set in environment variables
const SALT_LENGTH = 16;
const KEY_LENGTH = 64;
const ITERATIONS = 100000;
const SESSION_DURATION = 60 * 60 * 24 * 7; // 7 Days

export async function handleAuth(request, env) {
    const url = new URL(request.url);
    const path = url.pathname.replace('/api/auth', '');

    if (!env.JWT_SECRET) {
        return new Response(JSON.stringify({ error: 'Server misconfiguration: JWT_SECRET missing' }), { status: 500 });
    }

    if (path === '/login' && request.method === 'POST') {
        return login(request, env);
    } else if (path === '/logout' && request.method === 'POST') {
        return logout();
    } else if (path === '/me' && request.method === 'GET') {
        return getCurrentUser(request, env);
    }

    return new Response('Method Not Allowed', { status: 405 });
}

async function login(request, env) {
    try {
        const { username, password } = await request.json();

        if (!username || !password) {
            return new Response(JSON.stringify({ error: 'Username and password required' }), { status: 400 });
        }

        // Fetch user from D1
        const { results } = await env.DB.prepare('SELECT * FROM users WHERE username = ?').bind(username).all();
        const user = results[0];

        if (!user) {
            // Timing attack protection: simulate work
            await hashPassword('dummy', 'dummy');
            return new Response(JSON.stringify({ error: 'Invalid credentials' }), { status: 401 });
        }

        // Verify Password
        const isValid = await verifyPassword(password, user.password_hash, user.salt);
        if (!isValid) {
            return new Response(JSON.stringify({ error: 'Invalid credentials' }), { status: 401 });
        }

        // Generate JWT
        const token = await generateJWT({ id: user.id, username: user.username, role: user.role }, env.JWT_SECRET);

        // Update Last Login
        await env.DB.prepare('UPDATE users SET last_login = ? WHERE id = ?').bind(Date.now(), user.id).run();

        // Return Cookie
        const headers = new Headers();
        headers.set('Set-Cookie', `auth_token=${token}; HttpOnly; Secure; SameSite=None; Path=/; Max-Age=${SESSION_DURATION}`);
        headers.set('Content-Type', 'application/json');

        return new Response(JSON.stringify({
            success: true,
            user: { id: user.id, username: user.username, role: user.role }
        }), { headers });
    } catch (e) {
        return new Response(JSON.stringify({ error: 'Login failed' }), { status: 500 });
    }
}

async function logout() {
    const headers = new Headers();
    headers.set('Set-Cookie', 'auth_token=; HttpOnly; Secure; SameSite=None; Path=/; Max-Age=0');
    return new Response(JSON.stringify({ success: true }), { headers });
}

async function getCurrentUser(request, env) {
    const user = await getUserFromRequest(request, env);
    if (!user) return new Response(JSON.stringify({ error: 'Not authenticated' }), { status: 401 });

    return new Response(JSON.stringify({ user }), {
        headers: { 'Content-Type': 'application/json' }
    });
}

// Security Utilities ==========================================================

export async function getUserFromRequest(request, env) {
    const cookieHeader = request.headers.get('Cookie');
    if (!cookieHeader) return null;

    const cookies = {};
    cookieHeader.split('; ').forEach(c => {
        const [key, ...vals] = c.trim().split('=');
        if (key) cookies[key] = vals.join('=');
    });
    const token = cookies['auth_token'];
    if (!token) return null;

    if (!env.JWT_SECRET) return null;

    try {
        const payload = await verifyJWT(token, env.JWT_SECRET);
        return payload;
    } catch {
        return null;
    }
}

async function hashPassword(password, salt) {
    const enc = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
        'raw', enc.encode(password), { name: 'PBKDF2' }, false, ['deriveBits', 'deriveKey']
    );
    const key = await crypto.subtle.deriveKey(
        { name: 'PBKDF2', salt: enc.encode(salt), iterations: ITERATIONS, hash: 'SHA-256' },
        keyMaterial, { name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt']
    );

    // Export key to store it (simplified for demo, usually store raw bits)
    const exported = await crypto.subtle.exportKey('raw', key);
    return btoa(String.fromCharCode(...new Uint8Array(exported)));
}

export async function generateHash(password) {
    const salt = crypto.randomUUID().replace(/-/g, '').substring(0, 16);
    const hash = await hashPassword(password, salt);
    return { hash, salt };
}

async function verifyPassword(password, storedHash, salt) {
    const attemptHash = await hashPassword(password, salt);
    return attemptHash === storedHash;
}

// JWT Implementation (Native HMAC SHA-256)
async function generateJWT(payload, secret) {
    const header = { alg: 'HS256', typ: 'JWT' };
    const now = Math.floor(Date.now() / 1000);
    const body = { ...payload, iat: now, exp: now + SESSION_DURATION };

    const encodedHeader = btoa(JSON.stringify(header)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
    const encodedBody = btoa(JSON.stringify(body)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');

    const signature = await sign(`${encodedHeader}.${encodedBody}`, secret);
    return `${encodedHeader}.${encodedBody}.${signature}`;
}

async function verifyJWT(token, secret) {
    const [header, body, signature] = token.split('.');
    if (!header || !body || !signature) throw new Error('Invalid token');

    const expectedSignature = await sign(`${header}.${body}`, secret);
    if (signature !== expectedSignature) throw new Error('Invalid signature');

    const payload = JSON.parse(atob(body.replace(/-/g, '+').replace(/_/g, '/')));
    if (payload.exp < Math.floor(Date.now() / 1000)) throw new Error('Expired token');

    return payload;
}

async function sign(data, secret) {
    const enc = new TextEncoder();
    const key = await crypto.subtle.importKey(
        'raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
    );
    const signature = await crypto.subtle.sign('HMAC', key, enc.encode(data));
    return btoa(String.fromCharCode(...new Uint8Array(signature))).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}
