'use strict';

const assert = require('node:assert/strict');
const { test } = require('node:test');
const { Get } = require('../http-request');

test('retrieves provider text using HTTPS with a cancellable request and no redirects', async t => {
    t.mock.method(globalThis, 'fetch', async (url, options) => {
        assert.equal(url.href, 'https://api4.ipify.org/');
        assert.equal(options.redirect, 'error');
        assert.ok(options.signal instanceof AbortSignal);
        return new Response('203.0.113.1\n');
    });
    assert.equal(await Get('https://api4.ipify.org'), '203.0.113.1\n');
});

test('rejects HTTP errors instead of treating their bodies as public IPs', async t => {
    t.mock.method(globalThis, 'fetch', async () => new Response('203.0.113.1', { status: 503 }));
    await assert.rejects(Get('https://api4.ipify.org'), /HTTP 503/);
});

test('rejects insecure or credential-bearing URLs before making a request', async t => {
    const fetch = t.mock.method(globalThis, 'fetch', async () => new Response('203.0.113.1'));
    await assert.rejects(Get('http://example.com'), /HTTPS/);
    await assert.rejects(Get('https://user:password@example.com'), /embedded credentials/);
    assert.equal(fetch.mock.callCount(), 0);
});

test('aborts a pending provider request when its timeout signal fires', async t => {
    const controller = new AbortController();
    t.mock.method(AbortSignal, 'timeout', () => controller.signal);
    t.mock.method(globalThis, 'fetch', (url, { signal }) => new Promise((resolve, reject) => {
        signal.addEventListener('abort', () => reject(signal.reason), { once: true });
    }));
    const pending = Get('https://api4.ipify.org');
    controller.abort(new DOMException('Provider timed out', 'TimeoutError'));
    await assert.rejects(pending, { name: 'TimeoutError' });
});
