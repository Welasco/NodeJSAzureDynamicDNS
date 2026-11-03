'use strict';

const assert = require('node:assert/strict');
const { test } = require('node:test');
const { DnsManagementClient } = require('@azure/arm-dns');
const { createCredential } = require('../AzureAuthentication');
const { updateDNSRecord } = require('../UpdateDNSRecordSet');

test('requires complete environment credentials without exposing secret values', () => {
    const env = {
        AZURE_TENANT_ID: '00000000-0000-0000-0000-000000000001',
        AZURE_CLIENT_ID: '00000000-0000-0000-0000-000000000002',
        AZURE_CLIENT_SECRET: 'test-secret-do-not-log'
    };
    for (const name of Object.keys(env)) {
        const missing = { ...env, [name]: '' };
        assert.throws(() => createCredential('clientSecret', missing), error => {
            assert.equal(error.message, `Missing required environment variable: ${name}`);
            assert.ok(!error.message.includes(env.AZURE_CLIENT_SECRET));
            return true;
        });
    }
    assert.doesNotThrow(() => createCredential('clientSecret', env));
    assert.doesNotThrow(() => createCredential('managedIdentity', {}));
    assert.doesNotThrow(() => createCredential('managedIdentity', { AZURE_CLIENT_ID: env.AZURE_CLIENT_ID }));
    assert.throws(() => createCredential('unsupported', env), /Authentication.method/);
});

function sdkClient(t, status = 200) {
    const requests = [];
    const getToken = t.mock.fn(async () => ({
        token: 'test-token',
        expiresOnTimestamp: Date.now() + 3_600_000
    }));
    const client = new DnsManagementClient(
        { getToken },
        '00000000-0000-0000-0000-000000000001',
        {
            retryOptions: { maxRetries: 0 },
            httpClient: {
                async sendRequest(request) {
                    requests.push(request);
                    return {
                        request,
                        status,
                        headers: request.headers,
                        bodyAsText: JSON.stringify(status === 200
                            ? { properties: { TTL: 3600, ARecords: [{ ipv4Address: '203.0.113.1' }] } }
                            : { error: { code: 'AuthorizationFailed', message: 'Access denied' } })
                    };
                }
            }
        }
    );
    return { client, requests, getToken };
}

const account = {
    AzureResourceGroup: 'dns-rg',
    AzureDNSZone: 'example.com',
    AzureDNSRecord: '@'
};

test('uses the real DNS SDK to authenticate and serialize a stable-API A-record update', async t => {
    const { client, requests, getToken } = sdkClient(t);
    const result = await updateDNSRecord(client, account, '203.0.113.1');
    const request = requests[0];
    assert.equal(request.method, 'PUT');
    const url = new URL(request.url);
    assert.equal(url.origin, 'https://management.azure.com');
    assert.match(decodeURIComponent(url.pathname), /\/dnsZones\/example.com\/A\/@$/);
    assert.ok(!url.searchParams.get('api-version').includes('preview'));
    assert.deepEqual(JSON.parse(request.body), {
        properties: { TTL: 3600, ARecords: [{ ipv4Address: '203.0.113.1' }] }
    });
    assert.equal(request.headers.get('authorization'), 'Bearer test-token');
    assert.ok(request.abortSignal);
    assert.ok(request.timeout > 0);
    assert.equal(getToken.mock.callCount(), 1);
    assert.deepEqual(result.aRecords, [{ ipv4Address: '203.0.113.1' }]);
});

test('propagates Azure authorization failures to the polling loop', async t => {
    const { client } = sdkClient(t, 403);
    await assert.rejects(updateDNSRecord(client, account, '203.0.113.1'), error => {
        assert.equal(error.statusCode, 403);
        assert.equal(error.code, 'AuthorizationFailed');
        return true;
    });
});
