'use strict';

const REQUEST_TIMEOUT_MS = 30_000;

async function Get(url) {
    const parsed = new URL(url);
    if (parsed.protocol !== 'https:' || parsed.username || parsed.password) {
        throw new Error('Public IP providers must use HTTPS without embedded credentials');
    }

    const response = await fetch(parsed, {
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
        redirect: 'error',
        headers: {
            Accept: 'text/plain',
            'User-Agent': 'NodeJSAzureDynamicDNS'
        }
    });
    if (!response.ok) {
        await response.body?.cancel();
        throw new Error(`Public IP provider returned HTTP ${response.status}`);
    }
    return response.text();
}

module.exports = { Get, REQUEST_TIMEOUT_MS };
