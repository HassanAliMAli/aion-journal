/**
 * AION Journal OS - Cloudflare Worker API
 * Handles Authentication, Data Management, and Admin Functions
 */

import { handleAuth } from './auth.js';
import { handleData } from './data.js';
import { handleAdmin } from './admin.js';

export default {
    async fetch(request, env, executionCtx) {
        const url = new URL(request.url);
        const path = url.pathname;
        const method = request.method;

        // Security: Strict CORS
        const allowedOrigins = (env.ALLOWED_ORIGINS || '').split(',').map(o => o.trim()).filter(Boolean);
        const origin = request.headers.get('Origin');
        const isAllowed = allowedOrigins.includes(origin) || !origin; // Allow non-browser requests (no origin) if needed, or strictly enforce. 
        // For development convenience, we might want to allow localhost if not strictly defined, or just rely on env.

        // If ALLOWED_ORIGINS is not set, we default to permissive for dev (or maybe reject? "Hardening" implies secure defaults).
        // Let's allow the specific Origin if it matches, otherwise null.
        // If env.ALLOWED_ORIGINS is empty, we must be careful. Let's assume user will set it.
        // Fallback: If no env var, allow all (legacy behavior) but without credentials? No, app needs credentials.
        // Better: Reflect origin if in whitelist.

        const corsHeaders = {
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
            'Access-Control-Allow-Credentials': 'true',
        };

        // Strict CORS: Only allow whitelisted origins
        if (isAllowed && origin) {
            corsHeaders['Access-Control-Allow-Origin'] = origin;
        } else if (!origin) {
            // Non-browser requests (e.g., curl, Workers) - allow without CORS header
            // No Access-Control-Allow-Origin set intentionally
        } else {
            // Origin not in whitelist - reject with null origin
            corsHeaders['Access-Control-Allow-Origin'] = 'null';
        }

        // Handle Preflight
        if (method === 'OPTIONS') {
            return new Response(null, { headers: corsHeaders });
        }

        try {
            // Global Security Headers
            const securityHeaders = {
                'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
                'X-Content-Type-Options': 'nosniff',
                'X-Frame-Options': 'DENY',
                'Referrer-Policy': 'strict-origin-when-cross-origin'
            };

            // Route Dispatcher
            let response;

            if (path.startsWith('/api/auth')) {
                response = await handleAuth(request, env);
            } else if (path.startsWith('/api/admin')) {
                response = await handleAdmin(request, env);
            } else if (path.startsWith('/api/data')) {
                response = await handleData(request, env, executionCtx);
            } else if (path === '/api/health') {
                response = new Response(JSON.stringify({ status: 'ok', time: new Date().toISOString() }), { status: 200, headers: { 'Content-Type': 'application/json' } });
            } else {
                response = new Response('Not Found', { status: 404 });
            }

            // Merge Headers
            const newHeaders = new Headers(response.headers);
            Object.keys(corsHeaders).forEach(key => newHeaders.set(key, corsHeaders[key]));
            Object.keys(securityHeaders).forEach(key => newHeaders.set(key, securityHeaders[key]));

            return new Response(response.body, {
                status: response.status,
                statusText: response.statusText,
                headers: newHeaders
            });

        } catch (e) {
            // Minimal error log - do not expose error details
            return new Response(JSON.stringify({ error: 'Internal Server Error' }), {
                status: 500,
                headers: {
                    ...corsHeaders,
                    'Content-Type': 'application/json'
                }
            });
        }
    }
};
