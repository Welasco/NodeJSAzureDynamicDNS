#!/bin/bash
set -euo pipefail

INSTALL_DIR=/opt/NodeJSAzureDynamicDNS
ENV_FILE=/etc/NodeJSAzureDynamicDNS.env

if [[ $EUID -ne 0 ]]; then
    echo "Please execute the installation script as root." >&2
    exit 1
fi
if [[ -e "$INSTALL_DIR" ]]; then
    echo "NodeJSAzureDynamicDNS already installed at $INSTALL_DIR." >&2
    exit 1
fi

TEMP_DIR=$(mktemp -d)
NODE_ARCHIVE=node-v22.23.4-linux-armv6l.tar.xz
cleanup() {
    rm -f "$TEMP_DIR/$NODE_ARCHIVE" "$TEMP_DIR/SHASUMS256.txt" \
        "$TEMP_DIR/app.zip" "$TEMP_DIR/nodesource.sh"
    rmdir "$TEMP_DIR"
}
trap cleanup EXIT

apt-get update
apt-get install -y ca-certificates curl unzip xz-utils

if [[ $(uname -m) == armv6l ]]; then
    if ! command -v node >/dev/null 2>&1 ||
        [[ $(node --version) != v22.23.4 ]] ||
        ! command -v npm >/dev/null 2>&1; then
        echo "Installing Node.js 22.23.4 unofficial ARMv6 build for Raspberry Pi Zero W"
        curl --fail --location --show-error \
            -o "$TEMP_DIR/$NODE_ARCHIVE" \
            https://unofficial-builds.nodejs.org/download/release/v22.23.4/node-v22.23.4-linux-armv6l.tar.xz
        curl --fail --location --show-error \
            -o "$TEMP_DIR/SHASUMS256.txt" \
            https://unofficial-builds.nodejs.org/download/release/v22.23.4/SHASUMS256.txt
        grep "  ${NODE_ARCHIVE}$" "$TEMP_DIR/SHASUMS256.txt" |
            (cd "$TEMP_DIR" && sha256sum --check --status)
        tar -xJf "$TEMP_DIR/$NODE_ARCHIVE" -C /usr/local --strip-components=1
        export PATH="/usr/local/bin:$PATH"
        hash -r
    fi
else
    if ! command -v node >/dev/null 2>&1 ||
        ! node -e 'process.exit([22, 24, 26].includes(Number(process.versions.node.split(".")[0])) ? 0 : 1)' ||
        ! command -v npm >/dev/null 2>&1; then
        echo "Installing Node.js 26 LTS"
        curl --fail --location --show-error \
            -o "$TEMP_DIR/nodesource.sh" https://deb.nodesource.com/setup_26.x
        bash "$TEMP_DIR/nodesource.sh"
        apt-get install -y nodejs
        hash -r
    fi
fi

node --version
npm --version
node -e 'if (![22, 24, 26].includes(Number(process.versions.node.split(".")[0]))) throw new Error("Node.js 22, 24 or 26 LTS is required")'

echo "Installing NodeJSAzureDynamicDNS"
curl --fail --location --show-error \
    -o "$TEMP_DIR/app.zip" \
    https://github.com/Welasco/NodeJSAzureDynamicDNS/archive/master.zip
unzip -q "$TEMP_DIR/app.zip" -d "$TEMP_DIR"
mv "$TEMP_DIR/NodeJSAzureDynamicDNS-master" "$INSTALL_DIR"
cd "$INSTALL_DIR"
cp config-template.json config.json
chmod 600 config.json
npm ci --omit=dev --no-fund
if [[ ! -e "$ENV_FILE" ]]; then
    install -m 600 /dev/null "$ENV_FILE"
fi
chmod 600 "$ENV_FILE"
install -m 644 UpdateAzureRMDDNS.service /etc/systemd/system/UpdateAzureRMDDNS.service
systemctl daemon-reload
systemctl enable UpdateAzureRMDDNS

echo "Installed at $INSTALL_DIR."
echo "Configure $INSTALL_DIR/config.json and $ENV_FILE before starting."
echo "Start with: sudo systemctl start UpdateAzureRMDDNS"
