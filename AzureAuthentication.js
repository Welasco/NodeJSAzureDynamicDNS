'use strict';

const { ClientSecretCredential, ManagedIdentityCredential } = require('@azure/identity');

function createCredential(method, env = process.env) {
    if (method === 'managedIdentity') {
        return env.AZURE_CLIENT_ID
            ? new ManagedIdentityCredential({ clientId: env.AZURE_CLIENT_ID })
            : new ManagedIdentityCredential();
    }

    if (method !== 'clientSecret') {
        throw new Error('Authentication.method must be clientSecret or managedIdentity');
    }

    for (const name of ['AZURE_TENANT_ID', 'AZURE_CLIENT_ID', 'AZURE_CLIENT_SECRET']) {
        if (typeof env[name] !== 'string' || !env[name].trim()) {
            throw new Error(`Missing required environment variable: ${name}`);
        }
    }

    return new ClientSecretCredential(
        env.AZURE_TENANT_ID,
        env.AZURE_CLIENT_ID,
        env.AZURE_CLIENT_SECRET
    );
}

module.exports = { createCredential };
