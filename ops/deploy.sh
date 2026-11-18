#!/usr/bin/env bash
# Deploy Billionaire Kart to the shared host. Run from a checkout on a Mac or Linux machine that has
# root SSH to the host, git, rsync 3, and (for the server app) the .NET 10 SDK.
#
#   ops/deploy.sh                 deploy origin/main: the game files and the server app
#   ops/deploy.sh <git-ref>       deploy that commit instead
#   ops/deploy.sh --site-only     only the game files (no build, no restart)
#   ops/deploy.sh --setup         first-time or changed host setup (accounts, database, certificate,
#                                 nginx site, service unit), then stop. Safe to re-run.
#
# Everything is built from the named commit, never from uncommitted files. Each release lands in its own
# directory named by commit; going live is a symlink swap. Five old releases are kept.
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"

HOST=${BK_DEPLOY_HOST:-root@178.128.11.103}
APP=billionaire-kart
SITE_URL=https://billionaire-kart.okgodoit.com
SSH=(ssh -o BatchMode=yes -o ConnectTimeout=15 "$HOST")

MODE=full; REF=origin/main
for arg in "$@"; do
  case "$arg" in
    --setup) MODE=setup ;;
    --site-only) MODE=site ;;
    -*) echo "unknown option $arg" >&2; exit 2 ;;
    *) REF=$arg ;;
  esac
done

if [[ $MODE == setup ]]; then
  "${SSH[@]}" 'bash -s' < ops/provision.sh
  scp -q -o BatchMode=yes ops/nginx/billionaire-kart.conf "$HOST:/etc/nginx/sites-available/$APP"
  scp -q -o BatchMode=yes ops/systemd/billionaire-kart.service "$HOST:/etc/systemd/system/$APP.service"
  "${SSH[@]}" "set -e
    test -e /srv/$APP/current || { mkdir -p /srv/$APP/releases/empty && ln -sfn /srv/$APP/releases/empty /srv/$APP/current; }
    ln -sf /etc/nginx/sites-available/$APP /etc/nginx/sites-enabled/$APP
    rm -f /etc/nginx/sites-enabled/$APP-bootstrap /etc/nginx/sites-available/$APP-bootstrap
    flock /run/lock/side-projects-nginx.lock sh -c 'nginx -t && systemctl reload nginx'
    systemctl daemon-reload
    systemctl enable $APP.service >/dev/null 2>&1 || true
    echo 'setup done'"
  exit 0
fi

git fetch -q origin || true
SHA=$(git rev-parse --verify "$REF^{commit}")
WORK=$(mktemp -d); trap 'rm -rf "$WORK"' EXIT
echo "deploying $SHA ($REF) to $HOST"

# Built here from that exact commit, then handed to the same root-owned installer CI uses (ops/site-deploy/):
# it dumps the database, migrates, swaps the server and waits for /healthz, puts the old server back if the
# new one is not healthy, and only then swaps the game files. One go-live path, by hand or from CI.
mkdir -p "$WORK/tree" "$WORK/up"
git archive "$SHA" | tar -x -C "$WORK/tree" --exclude screenshots --exclude docs
node "$WORK/tree/tools/build-site.mjs" "$WORK/up/site" >/dev/null
printf '%s\n' "$SHA" > "$WORK/up/site/version.txt"
if [[ $MODE == full ]]; then
  ( cd "$WORK/tree" && node tools/with-slot.mjs dotnet publish server/src/BillionaireKart.Server -c Release -o "$WORK/up/server" --nologo -v quiet )
fi

INCOMING=/var/lib/billionaire-kart-deploy/incoming/$SHA
"${SSH[@]}" "mkdir -p $INCOMING"
rsync -rt --delete -e 'ssh -o BatchMode=yes' "$WORK/up/" "$HOST:$INCOMING/"
"${SSH[@]}" "SSH_ORIGINAL_COMMAND='activate $SHA' /usr/local/libexec/billionaire-kart-site-ssh"

# --- check from outside -----------------------------------------------------------------------
live=$(curl -fsS "$SITE_URL/version.txt" || true)
[[ $live == "$SHA" ]] || { echo "the site is not serving $SHA (got '${live}')" >&2; exit 1; }
if [[ $MODE == full ]]; then curl -fsS "$SITE_URL/healthz" | grep -q "$SHA" || { echo "healthz does not report $SHA" >&2; exit 1; }; fi
echo "deployed $SHA: $SITE_URL"
