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

# --- the game: the same folder GitHub Pages publishes (tools/build-site.mjs), from that commit ----
mkdir -p "$WORK/tree"
git archive "$SHA" index.html manifest.webmanifest offline-shell.js sw.js src styles assets vendor tools/build-site.mjs | tar -x -C "$WORK/tree"
node "$WORK/tree/tools/build-site.mjs" "$WORK/site" >/dev/null
printf '%s\n' "$SHA" > "$WORK/site/version.txt"
"${SSH[@]}" "mkdir -p /srv/$APP/releases/$SHA"
rsync -a --delete -e 'ssh -o BatchMode=yes' "$WORK/site/" "$HOST:/srv/$APP/releases/$SHA/"

# --- the server app: built here from the same commit ------------------------------------------
if [[ $MODE == full ]]; then
  mkdir -p "$WORK/src"
  git archive "$SHA" server src/content/handles.js tools/slot.mjs tools/with-slot.mjs | tar -x -C "$WORK/src"
  ( cd "$WORK/src" && node tools/with-slot.mjs dotnet publish server/src/BillionaireKart.Server -c Release -o "$WORK/app" --nologo -v quiet )
  printf 'Kart__Sha=%s\n' "$SHA" > "$WORK/app/release.env"
  "${SSH[@]}" "mkdir -p /opt/$APP/releases/$SHA"
  rsync -a --delete -e 'ssh -o BatchMode=yes' "$WORK/app/" "$HOST:/opt/$APP/releases/$SHA/"
fi

# --- go live on the host --------------------------------------------------------------------
"${SSH[@]}" "APP=$APP SHA=$SHA MODE=$MODE bash -s" <<'REMOTE'
set -euo pipefail
exec 9>/run/lock/$APP.lock; flock 9
prune() { ls -1dt "$1"/*/ 2>/dev/null | tail -n +7 | while read -r d; do [[ "$(readlink -f "$2")" == "$(readlink -f "$d")" ]] || rm -rf "$d"; done; }

chmod -R a+rX "/srv/$APP/releases/$SHA"
if [[ $MODE == full ]]; then
  chmod -R a+rX "/opt/$APP/releases/$SHA"
  previous=$(readlink -f "/opt/$APP/current" 2>/dev/null || true)
  # a dump before every migration; fourteen days kept by the nightly job's cleanup
  sudo -u postgres pg_dump -Fc billionaire_kart > "/var/backups/$APP/billionaire_kart-pre-$SHA.dump"
  runuser -u "$APP-migrate" -- env ASPNETCORE_ENVIRONMENT=Production \
    "ConnectionStrings__Kart=Host=/var/run/postgresql;Database=billionaire_kart;Username=$APP-migrate" \
    "Kart__KeyDirectory=/var/lib/$APP-migrate" \
    dotnet "/opt/$APP/releases/$SHA/BillionaireKart.Server.dll" migrate
  ln -sfn "/opt/$APP/releases/$SHA" "/opt/$APP/current"
  systemctl restart "$APP.service"
  ok=""
  for i in $(seq 1 30); do
    if curl -fsS http://127.0.0.1:5105/healthz 2>/dev/null | grep -q "$SHA"; then ok=1; break; fi
    sleep 1
  done
  if [[ -z $ok ]]; then
    echo "the new server did not come up healthy; putting the previous one back" >&2
    journalctl -u "$APP.service" -n 30 --no-pager >&2 || true
    if [[ -n $previous && -d $previous ]]; then ln -sfn "$previous" "/opt/$APP/current"; systemctl restart "$APP.service"; fi
    exit 1
  fi
  prune "/opt/$APP/releases" "/opt/$APP/current"
fi
# the game files go live last, so a page never loads code that expects a server that is not there yet
ln -sfn "/srv/$APP/releases/$SHA" "/srv/$APP/current.new" && mv -T "/srv/$APP/current.new" "/srv/$APP/current"
prune "/srv/$APP/releases" "/srv/$APP/current"
echo "live: $SHA"
REMOTE

# --- check from outside -----------------------------------------------------------------------
live=$(curl -fsS "$SITE_URL/version.txt" || true)
[[ $live == "$SHA" ]] || { echo "the site is not serving $SHA (got '${live}')" >&2; exit 1; }
if [[ $MODE == full ]]; then curl -fsS "$SITE_URL/healthz" | grep -q "$SHA" || { echo "healthz does not report $SHA" >&2; exit 1; }; fi
echo "deployed $SHA: $SITE_URL"
