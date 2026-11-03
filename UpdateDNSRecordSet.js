'use strict';

const { REQUEST_TIMEOUT_MS } = require('./http-request');

async function updateDNSRecord(client, account, address) {
    return client.recordSets.createOrUpdate(
        account.AzureResourceGroup,
        account.AzureDNSZone,
        account.AzureDNSRecord,
        'A',
        {
            ttl: 3600,
            aRecords: [{ ipv4Address: address }]
        },
        {
            abortSignal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
            requestOptions: { timeout: REQUEST_TIMEOUT_MS }
        }
    );
}

module.exports = { updateDNSRecord };
