'use strict';

const assert = require('node:assert/strict');
const { createHash } = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { test } = require('node:test');

const mocks = String.raw`
record() { printf '%s\n' "$*" >> "$TEST_LOG"; }
uname() { printf '%s\n' "$TEST_ARCH"; }
node() {
    if [[ $1 == --version ]]; then
        printf '%s\n' "$TEST_NODE_VERSION"
    else
        [[ "$TEST_NODE_VERSION" == v22.* || "$TEST_NODE_VERSION" == v24.* || "$TEST_NODE_VERSION" == v26.* ]]
    fi
}
npm() { record "npm $*"; }
apt-get() {
    record "apt-get $*"
    if [[ "$*" == "install -y nodejs" ]]; then TEST_NODE_VERSION=v26.13.0; fi
    return 0
}
curl() {
    record "curl $*"
    if [[ "$TEST_FAIL" == curl ]]; then return 1; fi
    local output
    while [[ $# -gt 0 ]]; do
        if [[ $1 == -o ]]; then shift; output=$1; fi
        shift
    done
    case "$output" in
        */SHASUMS256.txt)
            if [[ "$TEST_FAIL" == checksum ]]; then
                printf '%064d  node-v22.23.4-linux-armv6l.tar.xz\n' 0 > "$output"
            else
                printf '%s  node-v22.23.4-linux-armv6l.tar.xz\n' "$TEST_SHA" > "$output"
            fi ;;
        */nodesource.sh) printf 'exit 0\n' > "$output" ;;
        *) printf 'mock-archive' > "$output" ;;
    esac
}
tar() {
    record "tar $*"
    if [[ "$TEST_FAIL" == tar ]]; then return 1; fi
    TEST_NODE_VERSION=v22.23.4
}
unzip() {
    record "unzip $*"
    mkdir "$4/NodeJSAzureDynamicDNS-master"
    printf '{}\n' > "$4/NodeJSAzureDynamicDNS-master/config-template.json"
    printf '[Unit]\n' > "$4/NodeJSAzureDynamicDNS-master/UpdateAzureRMDDNS.service"
}
systemctl() { record "systemctl $*"; }
`;

function runInstaller(t, arch, version, failure = '') {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'azure-ddns-installer-'));
    t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
    const script = fs.readFileSync(path.join(__dirname, '../install.sh'), 'utf8')
        .replace('if [[ $EUID -ne 0 ]]; then', 'if false; then')
        .replaceAll('/opt/NodeJSAzureDynamicDNS', path.join(directory, 'app'))
        .replaceAll('/etc/NodeJSAzureDynamicDNS.env', path.join(directory, 'credentials.env'))
        .replaceAll('/etc/systemd/system/UpdateAzureRMDDNS.service', path.join(directory, 'app.service'))
        .replaceAll('/usr/local', path.join(directory, 'local'));
    const logfile = path.join(directory, 'commands.log');
    const result = spawnSync('bash', ['-c', `${mocks}\n${script}`], {
        encoding: 'utf8',
        timeout: 10_000,
        env: {
            ...process.env,
            TEST_LOG: logfile,
            TEST_ARCH: arch,
            TEST_NODE_VERSION: version,
            TEST_FAIL: failure,
            TEST_SHA: createHash('sha256').update('mock-archive').digest('hex'),
            TMPDIR: directory
        }
    });
    assert.ifError(result.error);
    return { ...result, commands: fs.readFileSync(logfile, 'utf8'), directory };
}

test('upgrades old ARMv6 Node to the exact pinned build with XZ extraction and clean installation', t => {
    const result = runInstaller(t, 'armv6l', 'v14.15.2');
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.commands, /https:\/\/unofficial-builds.nodejs.org\/download\/release\/v22.23.4\/node-v22.23.4-linux-armv6l.tar.xz/);
    assert.match(result.commands, /tar -xJf .*node-v22.23.4-linux-armv6l.tar.xz -C .* --strip-components=1/);
    assert.match(result.commands, /npm ci --omit=dev/);
    assert.ok(!result.commands.includes('nodesource'));
    assert.equal(fs.statSync(path.join(result.directory, 'credentials.env')).mode & 0o777, 0o600);
    assert.equal(fs.statSync(path.join(result.directory, 'app/config.json')).mode & 0o777, 0o600);
    assert.ok(!result.commands.includes('systemctl start'));
});

test('preserves the requested ARMv6 build if it is already installed', t => {
    const result = runInstaller(t, 'armv6l', 'v22.23.4');
    assert.equal(result.status, 0, result.stderr);
    assert.ok(!result.commands.includes('unofficial-builds'));
    assert.ok(!result.commands.includes('nodesource'));
});

test('upgrades obsolete non-ARMv6 runtimes to Node 26 and preserves supported runtimes', t => {
    const old = runInstaller(t, 'x86_64', 'v16.20.2');
    assert.equal(old.status, 0, old.stderr);
    assert.match(old.commands, /https:\/\/deb.nodesource.com\/setup_26.x/);
    assert.match(old.commands, /apt-get install -y nodejs/);
    const supported = runInstaller(t, 'aarch64', 'v24.22.2');
    assert.equal(supported.status, 0, supported.stderr);
    assert.ok(!supported.commands.includes('nodesource'));
    assert.ok(!supported.commands.includes('unofficial-builds'));
});

test('stops before app installation if an ARMv6 download, checksum or extraction fails', t => {
    for (const failure of ['curl', 'checksum', 'tar']) {
        const result = runInstaller(t, 'armv6l', 'v14.15.2', failure);
        assert.notEqual(result.status, 0, failure);
        assert.ok(!result.commands.includes('npm ci'), failure);
        assert.ok(!result.commands.includes('systemctl'), failure);
        if (failure !== 'tar') assert.ok(!result.commands.includes('tar -xJf'), failure);
    }
});
