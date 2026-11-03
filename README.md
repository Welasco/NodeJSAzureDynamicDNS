# NodeJSAzureDynamicDNS

Updates an Azure DNS **A record** when your public IPv4 address changes.
Uses Azure Identity and the Azure DNS management SDK; no ADAL or manual token cache.

## Requirements

- Node.js **22, 24 or 26 LTS** and npm.
- An Azure DNS zone and an identity with **DNS Zone Contributor** assigned at the zone scope.
- Outbound HTTPS access to Microsoft Entra ID, Azure Resource Manager and the configured public-IP providers.

**Raspberry Pi Zero W (ARMv6):** the installer uses exactly
[Node.js 22.23.4 for linux-armv6l](https://unofficial-builds.nodejs.org/download/release/v22.23.4/node-v22.23.4-linux-armv6l.tar.xz)
and checks its SHA-256 against the published manifest. This is an **unofficial** build,
not an officially supported Node.js hardware target. Use an OS compatible with that build.
Node 22 LTS support ends April 30, 2027; keeping ARMv6 supported after that requires
an available compatible build of a supported Node version.

## Azure authentication

### Service principal (Raspberry Pi or other non-Azure host)

In the Azure portal, open **Microsoft Entra ID > App registrations > New registration**.
Create a single-tenant app; this background service does not need a redirect URI.
Record its **Application (client) ID** and **Directory (tenant) ID**.
Under **Certificates & secrets**, create a client secret and copy its **value**.
Choose an expiration date and rotate it before it expires.

In your DNS zone's **Access control (IAM)**, assign **DNS Zone Contributor**
to the application's service principal. Existing app registrations and zone-scoped
role assignments can normally be reused.

Keep `"Authentication": { "method": "clientSecret" }` in `config.json` and supply:

```sh
export AZURE_TENANT_ID="your-tenant-id"
export AZURE_CLIENT_ID="your-application-id"
export AZURE_CLIENT_SECRET="your-secret-value"
npm start
```

For systemd, put these assignments in `/etc/NodeJSAzureDynamicDNS.env` (no `export`):

```ini
AZURE_TENANT_ID=your-tenant-id
AZURE_CLIENT_ID=your-application-id
AZURE_CLIENT_SECRET='your-secret-value'
```

Protect that file with `sudo chmod 600 /etc/NodeJSAzureDynamicDNS.env`.
The app does not load `.env` files itself; systemd loads the environment file.
Never put credentials or access tokens in `config.json`.

### Managed identity (Azure-hosted deployment)

Enable a managed identity on the Azure host, grant it the same zone-scoped role,
and set `"Authentication": { "method": "managedIdentity" }`.
For a system-assigned identity, no Azure credential environment variables are needed.
For a user-assigned identity, set `AZURE_CLIENT_ID` to its client ID.
Managed identity is not available on a standalone Raspberry Pi.

## Linux installation

The installer requires a Debian-based distribution with apt and systemd.
It preserves a supported Node 22/24/26 installation on other architectures, otherwise
installs Node 26 LTS. On ARMv6 it installs the pinned build above if necessary,
including replacing an older Node installation.

Download and inspect the installer before running it:

```sh
curl -fL -o install.sh https://raw.githubusercontent.com/Welasco/NodeJSAzureDynamicDNS/master/install.sh
sudo bash install.sh
```

The app is installed at `/opt/NodeJSAzureDynamicDNS`, with dependencies from
`package-lock.json`. The service is enabled but **not started** until configured.
The installer refuses to overwrite an existing installation.

For a manual installation from a checkout:

```sh
npm ci
cp config-template.json config.json
chmod 600 config.json
```

## Configuration and startup

Edit `config.json`, using `config-template.json` as the starting point:

```json
{
  "updateinterval": 15,
  "CheckPublicIPProviders": [
    "https://api4.ipify.org",
    "https://ipv4.icanhazip.com/",
    "https://checkip.amazonaws.com/"
  ],
  "PublicIPAddress": "",
  "AzureAccountDetails": {
    "AzureSubscriptionID": "your-subscription-id",
    "AzureResourceGroup": "your-resource-group",
    "AzureDNSZone": "example.com",
    "AzureDNSRecord": "www"
  },
  "Authentication": {
    "method": "clientSecret"
  }
}
```

`AzureDNSRecord` is relative to the zone (`www` for `www.example.com`, or `@` for
the zone apex). The app manages a single IPv4 address with a TTL of 3600 seconds;
it replaces the selected A record set's contents.

Providers must return plain-text IPv4 addresses over HTTPS without redirects.
Each provider and DNS operation has a 30-second timeout. Providers are tried in
order; IPv6 or invalid responses trigger the next provider. A failed DNS update
is retried on the next polling cycle without marking the IP as successfully saved.

The first check runs immediately. Subsequent checks run `updateinterval` minutes
after the previous cycle finishes, so cycles never overlap.
Configuration changes require a restart.

```sh
sudo systemctl start UpdateAzureRMDDNS
sudo systemctl status UpdateAzureRMDDNS
```

Or, after exporting credentials, run `npm start` in the checkout.

## Migrating an existing ADAL installation

1. Stop the service and install Node 22/24/26 (use the pinned unofficial ARMv6 build on Pi Zero W).
2. Update the application files and run `npm ci --omit=dev`.
3. Keep your existing `AzureAccountDetails` and interval. Replace public-IP providers with the HTTPS examples above.
4. Move tenant ID, application ID and client secret to the environment variables above. Remove the entire legacy `ServicePrincipal` section, including cached tokens, from `config.json`; add `Authentication.method`.
5. Clear `PublicIPAddress` to `""` to force a confirmed DNS update after migration.
6. Install the updated service unit as `/etc/systemd/system/UpdateAzureRMDDNS.service`, create the environment file with mode 600, run `sudo systemctl daemon-reload`, then restart the service.

The app deliberately refuses legacy `ServicePrincipal` configuration rather than
silently retaining secrets or tokens. Existing `config.json` files are not
automatically rewritten during an upgrade. Do not commit local configuration;
if a previous checkout already tracks your file, `.gitignore` does not untrack it.
Old versions logged tokens, so protect or remove those old logs and rotate any
credentials that were exposed.

## Troubleshooting and development

Logs are written to the console/systemd journal and `UpdateAzureRMDDNS.log` beside
the app. File logs are retained across restarts and rotated at 5 MiB (up to three files).
Use `sudo journalctl -u UpdateAzureRMDDNS` for startup failures.

For authentication failures, check credential expiry and the tenant/client IDs.
For HTTP 403, check the zone-scoped role assignment. Never disable TLS verification;
install the appropriate trusted CA certificates if needed.

Only a successful Azure update advances `PublicIPAddress`. To force another update,
stop the service, clear that field, then restart.

Run the focused automated tests with `npm test` on a supported Node version.
Tests do not require Azure credentials or modify real DNS records.
`FilesNotInUse/` contains historical experiments, not supported app entry points.
