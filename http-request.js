'use strict';

const http = require('node:http');
const https = require('node:https');

const REQUEST_TIMEOUT_MS = 30_000;

async function Get(url) {
    const parsed = new URL(url);
    if (!['http:', 'https:'].includes(parsed.protocol) || parsed.username || parsed.password) {
        throw new Error('Public IP providers must use HTTP or HTTPS without embedded credentials');
    }

    const transport = parsed.protocol === 'https:' ? https : http;
    return new Promise((resolve, reject) => {
        const request = transport.get(parsed, {
            family: 4,
            signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
            headers: {
                Accept: 'text/plain',
                'User-Agent': 'curl/8.5.0'
            }
        }, response => {
            response.on('error', reject);
            if (response.statusCode < 200 || response.statusCode >= 300) {
                response.destroy();
                reject(new Error(`Public IP provider returned HTTP ${response.statusCode}`));
                return;
            }
            response.setEncoding('utf8');
            let body = '';
            response.on('data', chunk => { body += chunk; });
            response.on('end', () => resolve(body));
        });
        request.on('error', reject);
    });
}

module.exports = { Get, REQUEST_TIMEOUT_MS };
