/**
 * AION Journal OS - GitHub Background Sync
 * Handles syncing D1 data to a Global GitHub Backup Repository
 */

export const GitHubSync = {
    async syncTrade(user, trade, namingConvention, env) {
        try {
            if (!env.GITHUB_PAT || !env.GITHUB_REPO) return;

            const rawDate = trade.entry_date || trade.date_utc || trade.entry_time_utc || new Date().toISOString();
            const date = new Date(rawDate).toISOString().split('T')[0];
            const pair = (trade.instrument || 'UNKNOWN').replace(/[^a-zA-Z0-9]/g, '');
            const direction = (trade.direction || 'FLAT').toUpperCase();
            const status = (trade.trade_status || 'OPEN').toUpperCase();
            const tradeId = trade.trade_id || Date.now().toString();

            let filename = '';
            switch (namingConvention) {
                case 'DATE_PAIR':
                    filename = `${date}_${pair}_${tradeId}.json`;
                    break;
                case 'STRATEGY_RESULT':
                    filename = `${trade.setup_id || 'NO_SETUP'}_${status}_${tradeId}.json`;
                    break;
                case 'PAIR_DIRECTION':
                default:
                    filename = `${pair}_${direction}_${tradeId}.json`;
                    break;
            }

            const path = `users/${user.username}/trades/${filename}`;
            const content = JSON.stringify(trade, null, 2);

            await uploadToGitHub(path, content, `Sync Trade: ${filename}`, env);
        } catch {
            // Silent failure for background sync
        }
    },

    async syncConfig(user, type, content, env) {
        try {
            if (!env.GITHUB_PAT || !env.GITHUB_REPO) return;

            const filename = `${type.toLowerCase()}.json`;
            const path = `users/${user.username}/configs/${filename}`;
            const body = JSON.stringify(content, null, 2);

            await uploadToGitHub(path, body, `Sync Config: ${filename}`, env);
        } catch {
            // Silent failure for background sync
        }
    }
};

async function uploadToGitHub(path, content, message, env) {
    const baseUrl = `https://api.github.com/repos/${env.GITHUB_REPO}/contents/${path}`;
    const headers = {
        'Authorization': `Bearer ${env.GITHUB_PAT}`,
        'User-Agent': 'AION-Journal-OS-Worker',
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json'
    };

    try {
        let sha = null;
        try {
            const getRes = await fetch(baseUrl, { headers });
            if (getRes.ok) {
                const data = await getRes.json();
                sha = data.sha;
            }
        } catch {
            // File does not exist, will create new
        }

        const contentBase64 = btoa(unescape(encodeURIComponent(content)));

        const payload = {
            message,
            content: contentBase64,
            branch: 'main'
        };

        if (sha) payload.sha = sha;

        await fetch(baseUrl, {
            method: 'PUT',
            headers,
            body: JSON.stringify(payload)
        });
    } catch {
        // Silent network failure
    }
}

