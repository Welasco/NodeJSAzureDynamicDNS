'use strict';

const assert = require('node:assert/strict');
const http = require('node:http');
const https = require('node:https');
const { EventEmitter } = require('node:events');
const { PassThrough } = require('node:stream');
const { test } = require('node:test');
const { Get } = require('../http-request');

async function providerServer(t, handler) {
    const server = http.createServer(handler);
    t.after(() => new Promise(resolve => {
        server.close(resolve);
        server.closeAllConnections();
    }));
    await new Promise((resolve, reject) => {
        server.once('error', reject);
        server.listen(0, '127.0.0.1', resolve);
    });
    return `http://localhost:${server.address().port}`;
}

test('retrieves provider text over an IPv4-only HTTP connection', async t => {
    const url = await providerServer(t, (request, response) => {
        assert.equal(request.headers.accept, 'text/plain');
        assert.equal(request.headers['user-agent'], 'curl/8.5.0');
        response.write('203.0.');
        response.end('113.1\n');
    });
    assert.equal(await Get(url), '203.0.113.1\n');
});

test('uses IPv4 and a timeout for both HTTP and HTTPS without disabling TLS verification', async t => {
    for (const [protocol, transport] of [['http:', http], ['https:', https]]) {
        const get = t.mock.method(transport, 'get', (url, options, callback) => {
            assert.equal(url.href, `${protocol}//example.com/ip`);
            assert.equal(options.family, 4);
            assert.ok(options.signal instanceof AbortSignal);
            assert.equal(options.rejectUnauthorized, undefined);
            const request = new EventEmitter();
            queueMicrotask(() => {
                const response = new PassThrough();
                response.statusCode = 200;
                callback(response);
                response.end('203.0.113.1\n');
            });
            return request;
        });
        assert.equal(await Get(`${protocol}//example.com/ip`), '203.0.113.1\n');
        assert.equal(get.mock.callCount(), 1);
    }
});

test('rejects HTTP errors and redirects instead of accepting their bodies or following them', async t => {
    let redirectedRequests = 0;
    const url = await providerServer(t, (request, response) => {
        if (request.url === '/target') redirectedRequests++;
        const status = Number(request.url.slice(1)) || 200;
        response.writeHead(status, { Location: '/target' });
        response.end('203.0.113.1');
    });
    for (const status of [301, 302, 307, 308, 503]) {
        await assert.rejects(Get(`${url}/${status}`), new RegExp(`HTTP ${status}`));
    }
    assert.equal(redirectedRequests, 0);
});

test('rejects unsupported or credential-bearing URLs before making a request', async t => {
    const httpGet = t.mock.method(http, 'get', () => assert.fail('Unexpected HTTP request'));
    const httpsGet = t.mock.method(https, 'get', () => assert.fail('Unexpected HTTPS request'));
    await assert.rejects(Get('ftp://example.com'), /HTTP or HTTPS/);
    for (const protocol of ['http:', 'https:']) {
        const url = new URL(`${protocol}//example.com`);
        url.username = 'user';
        url.password = 'password';
        await assert.rejects(Get(url.href), /embedded credentials/);
    }
    assert.equal(httpGet.mock.callCount(), 0);
    assert.equal(httpsGet.mock.callCount(), 0);
});

test('aborts pending requests and incomplete response bodies when the timeout fires', async t => {
    for (const sendHeaders of [false, true]) {
        await t.test(sendHeaders ? 'during body' : 'before headers', async t => {
            const controller = new AbortController();
            t.mock.method(AbortSignal, 'timeout', () => controller.signal);
            const url = await providerServer(t, (request, response) => {
                if (sendHeaders) {
                    response.write('203.0.113.');
                }
                setImmediate(() => controller.abort(new DOMException('Provider timed out', 'TimeoutError')));
            });
            await assert.rejects(Get(url), { name: 'AbortError' });
        });
    }
});

test('rejects connection failures and truncated responses', async t => {
    const url = await providerServer(t, (request, response) => {
        response.writeHead(200, { 'Content-Length': '100' });
        response.write('203.0.113.1');
        setImmediate(() => response.destroy());
    });
    await assert.rejects(Get(url), /aborted|socket hang up/);

    const error = new Error('DNS unavailable');
    t.mock.method(http, 'get', () => {
        const request = new EventEmitter();
        queueMicrotask(() => request.emit('error', error));
        return request;
    });
    await assert.rejects(Get('http://example.com'), error);
});
