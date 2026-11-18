#!/usr/bin/env bash
# One-time (and safe to re-run) host setup for automatic game deploys from GitHub Actions.
# Run from a checkout on a machine with root SSH to the host:
#
#   ops/site-deploy/setup.sh <public-key-file>
#
# It creates the restricted billionaire-kart-deploy account (forced command, no shell, no sudo), installs the
# receiver and the root-owned installer, enables the path unit that runs the installer, and records the account
# in /etc/side-projects/inventory.json. The matching private key is the OKGODOIT_DEPLOY_KEY secret in GitHub.
set -euo pipefail
cd "$(dirname "$0")"
HOST=${BK_DEPLOY_HOST:-root@178.128.11.103}
KEY=${1:?usage: setup.sh <public-key-file>}
grep -qE '^ssh-ed25519 [A-Za-z0-9+/=]+( |$)' "$KEY" || { echo "$KEY is not an ed25519 public key" >&2; exit 2; }
SSH=(ssh -o BatchMode=yes -o ConnectTimeout=15 "$HOST")

scp -q -o BatchMode=yes receive.py "$HOST:/usr/local/libexec/billionaire-kart-site-ssh"
scp -q -o BatchMode=yes install.py "$HOST:/usr/local/libexec/billionaire-kart-site-install"
scp -q -o BatchMode=yes billionaire-kart-site.path billionaire-kart-site.service "$HOST:/etc/systemd/system/"
PUB=$(awk '{print $1" "$2}' "$KEY")
"${SSH[@]}" "PUB='$PUB' bash -s" <<'REMOTE'
set -euo pipefail
U=billionaire-kart-deploy; HOME_DIR=/var/lib/$U
id -u $U >/dev/null 2>&1 || useradd --system --home-dir $HOME_DIR --create-home --shell /bin/sh $U
chown root:root /usr/local/libexec/billionaire-kart-site-ssh /usr/local/libexec/billionaire-kart-site-install
chmod 755 /usr/local/libexec/billionaire-kart-site-ssh; chmod 700 /usr/local/libexec/billionaire-kart-site-install
install -d -o root -g root -m 755 $HOME_DIR $HOME_DIR/.ssh $HOME_DIR/results
install -d -o $U -g $U -m 750 $HOME_DIR/incoming $HOME_DIR/requests
printf 'restrict,command="/usr/local/libexec/billionaire-kart-site-ssh" %s billionaire-kart-actions\n' "$PUB" > $HOME_DIR/.ssh/authorized_keys
chown root:root $HOME_DIR/.ssh/authorized_keys; chmod 644 $HOME_DIR/.ssh/authorized_keys
systemctl daemon-reload
systemctl enable --now billionaire-kart-site.path >/dev/null 2>&1
python3 - <<'PY'
import json
p = '/etc/side-projects/inventory.json'; d = json.load(open(p))
for project in d['projects']:
    if project['id'] == 'billionaire-kart':
        project['deployUser'] = 'billionaire-kart-deploy'
        project['deployUnits'] = ['billionaire-kart-site.path']
open(p, 'w').write(json.dumps(d, indent=1) + '\n')
PY
echo "site deploy account ready: $U"
REMOTE
