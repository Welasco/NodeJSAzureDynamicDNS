'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { test } = require('node:test');
const nconf = require('nconf');
const { createUpdater, startPolling, validateConfiguration } = require('../UpdateAzureRMDDNS');
const template = require('../config-template.json');

function fixture(t) {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'azure-ddns-test-'));
    t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
    const file = path.join(directory, 'config.json');
    fs.writeFileSync(file, JSON.stringify({ ...template, PublicIPAddress: '192.0.2.1' }));
    const config = new nconf.Provider();
    config.file({ file });
    const log = { info: t.mock.fn(), error: t.mock.fn() };
    const createOrUpdate = t.mock.fn(async () => ({}));
    const client = { recordSets: { createOrUpdate } };
    return { config, file, log, client, createOrUpdate };
}

test('only persists the new IPv4 address after Azure confirms the update', async t => {
    const { config, file, log, client, createOrUpdate } = fixture(t);
    let confirm;
    createOrUpdate.mock.mockImplementation(() => new Promise(resolve => { confirm = resolve; }));
    const getIP = t.mock.fn(async () => '203.0.113.10\n');
    const update = createUpdater(config, client, log, getIP);
    const pending = update();
    await Promise.resolve();
    assert.equal(config.get('PublicIPAddress'), '192.0.2.1');
    assert.equal(JSON.parse(fs.readFileSync(file)).PublicIPAddress, '192.0.2.1');
    confirm({});
    await pending;
    assert.equal(JSON.parse(fs.readFileSync(file)).PublicIPAddress, '203.0.113.10');
    const args = createOrUpdate.mock.calls[0].arguments;
    assert.deepEqual(args.slice(0, 5), [
        'ResourceGroup', 'company.com', 'www', 'A',
        { ttl: 3600, aRecords: [{ ipv4Address: '203.0.113.10' }] }
    ]);

    await update();
    assert.equal(createOrUpdate.mock.callCount(), 1);
});

test('retries the same IP after a DNS failure instead of marking it as saved', async t => {
    const { config, file, log, client, createOrUpdate } = fixture(t);
    createOrUpdate.mock.mockImplementationOnce(async () => { throw new Error('Azure unavailable'); });
    const update = createUpdater(config, client, log, async () => '203.0.113.10');
    await assert.rejects(update(), /Azure unavailable/);
    assert.equal(config.get('PublicIPAddress'), '192.0.2.1');
    assert.equal(JSON.parse(fs.readFileSync(file)).PublicIPAddress, '192.0.2.1');
    await update();
    assert.equal(createOrUpdate.mock.callCount(), 2);
    assert.equal(JSON.parse(fs.readFileSync(file)).PublicIPAddress, '203.0.113.10');
});

test('reports persistence failures and restores the cached address for retry', async t => {
    const { config, file, log, client, createOrUpdate } = fixture(t);
    const save = t.mock.method(config, 'save', callback => callback(new Error('disk full')));
    const update = createUpdater(config, client, log, async () => '203.0.113.10');
    await assert.rejects(update(), error => {
        assert.match(error.message, /saving PublicIPAddress failed/);
        assert.equal(error.cause.message, 'disk full');
        return true;
    });
    assert.equal(config.get('PublicIPAddress'), '192.0.2.1');
    assert.equal(JSON.parse(fs.readFileSync(file)).PublicIPAddress, '192.0.2.1');
    save.mock.restore();
    await update();
    assert.equal(createOrUpdate.mock.callCount(), 2);
});

test('falls back after network failures and IPv6 responses', async t => {
    const { config, log, client, createOrUpdate } = fixture(t);
    const getIP = t.mock.fn(async () => '192.0.2.1');
    getIP.mock.mockImplementationOnce(async () => { throw new Error('timeout'); });
    getIP.mock.mockImplementationOnce(async () => '2001:db8::1\n', 1);
    await createUpdater(config, client, log, getIP)();
    assert.equal(getIP.mock.callCount(), 3);
    assert.equal(log.error.mock.callCount(), 2);
    assert.equal(createOrUpdate.mock.callCount(), 0);
});

test('fails explicitly without changing DNS when all IPv4 providers fail', async t => {
    const { config, file, log, client, createOrUpdate } = fixture(t);
    await assert.rejects(
        createUpdater(config, client, log, async () => '<html>not an IP</html>')(),
        /All public IPv4 providers failed/
    );
    assert.equal(log.error.mock.callCount(), template.CheckPublicIPProviders.length);
    assert.equal(createOrUpdate.mock.callCount(), 0);
    assert.equal(JSON.parse(fs.readFileSync(file)).PublicIPAddress, '192.0.2.1');
});

test('rejects invalid intervals, insecure providers, missing settings and legacy credentials', () => {
    const cases = [
        ['updateinterval', 0, /updateinterval/],
        ['updateinterval', -1, /updateinterval/],
        ['updateinterval', '15', /updateinterval/],
        ['updateinterval', Infinity, /updateinterval/],
        ['updateinterval', 40_000, /timer range/],
        ['CheckPublicIPProviders', [], /at least one/],
        ['CheckPublicIPProviders', ['http://example.com'], /HTTPS/],
        ['CheckPublicIPProviders', ['https://user:password@example.com'], /embedded credentials/],
        ['AzureAccountDetails:AzureResourceGroup', '', /AzureResourceGroup/],
        ['Authentication:method', 'unknown', /Authentication.method/],
        ['ServicePrincipal', { clientSecret: 'do-not-log', token: {} }, /legacy ServicePrincipal/]
    ];
    for (const [key, value, message] of cases) {
        const config = new nconf.Provider();
        config.use('memory');
        for (const [name, setting] of Object.entries(structuredClone(template))) {
            config.set(name, setting);
        }
        config.set(key, value);
        assert.throws(() => validateConfiguration(config), message);
    }
});

test('waits for a polling cycle to finish and stops without scheduling another', async t => {
    t.mock.timers.enable({ apis: ['setTimeout'] });
    let finish;
    const update = t.mock.fn(() => new Promise(resolve => { finish = resolve; }));
    const log = { error: t.mock.fn() };
    const stop = startPolling(update, 1000, log);
    t.after(stop);
    assert.equal(update.mock.callCount(), 1);
    t.mock.timers.tick(10_000);
    assert.equal(update.mock.callCount(), 1);
    finish();
    await Promise.resolve();
    t.mock.timers.tick(999);
    assert.equal(update.mock.callCount(), 1);
    t.mock.timers.tick(1);
    assert.equal(update.mock.callCount(), 2);
    stop();
    finish();
    await Promise.resolve();
    t.mock.timers.tick(10_000);
    assert.equal(update.mock.callCount(), 2);
});

test('logs a failed cycle and continues polling', async t => {
    t.mock.timers.enable({ apis: ['setTimeout'] });
    const update = t.mock.fn(async () => { throw new Error('DNS unavailable'); });
    const log = { error: t.mock.fn() };
    const stop = startPolling(update, 1000, log);
    t.after(stop);
    await Promise.resolve();
    assert.match(log.error.mock.calls[0].arguments[0], /DNS unavailable/);
    t.mock.timers.tick(1000);
    await Promise.resolve();
    assert.equal(update.mock.callCount(), 2);
});

test('startup reports configuration and credential errors without leaking configuration contents', t => {
    const { file } = fixture(t);
    const directory = path.dirname(file);
    for (const name of ['UpdateAzureRMDDNS.js', 'AzureAuthentication.js', 'UpdateDNSRecordSet.js', 'http-request.js', 'logger.js']) {
        fs.copyFileSync(path.join(__dirname, '..', name), path.join(directory, name));
    }
    fs.symlinkSync(path.join(__dirname, '../node_modules'), path.join(directory, 'node_modules'), 'dir');
    const cases = [
        [JSON.stringify(template), {}, /Missing required environment variable: AZURE_TENANT_ID/],
        ['private-invalid-json-content', {}, /Unable to load config.json/],
        [JSON.stringify(template), { NODE_TLS_REJECT_UNAUTHORIZED: '0' }, /TLS certificate verification must remain enabled/]
    ];
    for (const [contents, environment, expected] of cases) {
        fs.writeFileSync(file, contents);
        const result = spawnSync(process.execPath, [path.join(directory, 'UpdateAzureRMDDNS.js')], {
            encoding: 'utf8',
            timeout: 10_000,
            env: {
                ...process.env,
                AZURE_TENANT_ID: '',
                AZURE_CLIENT_ID: '',
                AZURE_CLIENT_SECRET: '',
                NODE_TLS_REJECT_UNAUTHORIZED: '1',
                ...environment
            }
        });
        assert.ifError(result.error);
        assert.equal(result.status, 1, result.stderr);
        assert.match(result.stdout + result.stderr, expected);
        assert.ok(!(result.stdout + result.stderr).includes('private-invalid-json-content'));
        assert.equal(fs.readFileSync(file, 'utf8'), contents);
    }
});
