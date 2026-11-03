#!/usr/bin/env node
'use strict';

const path = require('node:path');
const { isIPv4 } = require('node:net');
const nconf = require('nconf');
const { DnsManagementClient } = require('@azure/arm-dns');
const { createCredential } = require('./AzureAuthentication');
const { updateDNSRecord } = require('./UpdateDNSRecordSet');
const { Get } = require('./http-request');

function validateConfiguration(config) {
    const minutes = config.get('updateinterval');
    if (typeof minutes !== 'number' || !Number.isFinite(minutes) ||
        minutes * 60_000 < 1 || minutes * 60_000 > 2_147_483_647) {
        throw new Error('updateinterval must be a positive number of minutes within the Node.js timer range');
    }

    const providers = config.get('CheckPublicIPProviders');
    if (!Array.isArray(providers) || providers.length === 0) {
        throw new Error('CheckPublicIPProviders must contain at least one HTTPS URL');
    }
    for (const provider of providers) {
        const url = typeof provider === 'string' ? new URL(provider) : null;
        if (!url || url.protocol !== 'https:' || url.username || url.password) {
            throw new Error('CheckPublicIPProviders must contain HTTPS URLs without embedded credentials');
        }
    }

    for (const name of ['AzureSubscriptionID', 'AzureResourceGroup', 'AzureDNSZone', 'AzureDNSRecord']) {
        const value = config.get(`AzureAccountDetails:${name}`);
        if (typeof value !== 'string' || !value.trim()) {
            throw new Error(`Missing required configuration: AzureAccountDetails.${name}`);
        }
    }

    if (!['clientSecret', 'managedIdentity'].includes(config.get('Authentication:method'))) {
        throw new Error('Authentication.method must be clientSecret or managedIdentity');
    }
    if (config.get('ServicePrincipal') !== undefined) {
        throw new Error('Remove the legacy ServicePrincipal section from config.json; use Azure environment variables instead (see README)');
    }
}

function createUpdater(config, dnsClient, log, getPublicIP = Get) {
    validateConfiguration(config);

    return async function UpdatePublicIP() {
        let address;
        for (const provider of config.get('CheckPublicIPProviders')) {
            log.info(`Checking public IP provider: ${provider}`);
            try {
                const result = (await getPublicIP(provider)).trim();
                if (!isIPv4(result)) {
                    throw new Error('Provider did not return a valid IPv4 address');
                }
                address = result;
                break;
            } catch (error) {
                log.error(`Public IP provider failed: ${provider}: ${error.message}`);
            }
        }
        if (!address) {
            throw new Error('All public IPv4 providers failed');
        }

        const previousAddress = config.get('PublicIPAddress');
        if (address === previousAddress) {
            log.info(`Public IP has not changed: ${address}`);
            return;
        }

        await updateDNSRecord(dnsClient, config.get('AzureAccountDetails'), address);
        config.set('PublicIPAddress', address);
        try {
            await new Promise((resolve, reject) => {
                config.save(error => error ? reject(error) : resolve());
            });
        } catch (error) {
            config.set('PublicIPAddress', previousAddress);
            throw new Error(`DNS updated, but saving PublicIPAddress failed: ${error.message}; the update will be retried`, { cause: error });
        }
        log.info(`Azure DNS updated successfully: ${address}`);
    };
}

function startPolling(update, interval, log) {
    let timer;
    let stopped = false;

    async function tick() {
        try {
            await update();
        } catch (error) {
            log.error(`DNS polling cycle failed: ${error.message}`);
        } finally {
            if (!stopped) {
                timer = setTimeout(tick, interval);
            }
        }
    }

    void tick();
    return function stop() {
        stopped = true;
        clearTimeout(timer);
    };
}

function main() {
    const log = require('./logger');
    try {
        if (process.env.NODE_TLS_REJECT_UNAUTHORIZED === '0') {
            throw new Error('Remove NODE_TLS_REJECT_UNAUTHORIZED=0; TLS certificate verification must remain enabled');
        }
        const config = new nconf.Provider();
        try {
            config.file({ file: path.join(__dirname, 'config.json') });
        } catch (error) {
            throw new Error('Unable to load config.json; check file permissions and JSON syntax', { cause: error });
        }
        validateConfiguration(config);
        const credential = createCredential(config.get('Authentication:method'));
        const client = new DnsManagementClient(
            credential,
            config.get('AzureAccountDetails:AzureSubscriptionID')
        );
        const interval = config.get('updateinterval') * 60_000;
        const update = createUpdater(config, client, log);
        log.info(`Starting Azure DNS polling every ${config.get('updateinterval')} minutes`);
        const stop = startPolling(update, interval, log);
        process.once('SIGINT', stop);
        process.once('SIGTERM', stop);
    } catch (error) {
        log.error(`Unable to start Azure DNS updater: ${error.message}`);
        process.exitCode = 1;
    }
}

if (require.main === module) {
    main();
}

module.exports = { createUpdater, startPolling, validateConfiguration };
