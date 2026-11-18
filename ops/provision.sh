#!/usr/bin/env bash
# One-time (and safe to re-run) setup of Billionaire Kart on the shared side-projects host.
# Run as root ON THE SERVER:   ssh root@HOST 'bash -s' < ops/provision.sh
# The nginx and systemd files are sent by ops/deploy.sh --setup, which calls this first.
#
# What this owns: the app's Unix accounts, directories, database and roles, environment files,
# its line in /etc/side-projects/inventory.json, its certificate, and a daily local database dump.
# What it never touches: other sites, the global nginx.conf, PostgreSQL itself, the firewall.
set -euo pipefail
[[ $(id -u) == 0 ]] || { echo "run as root" >&2; exit 1; }

APP=billionaire-kart
DB=billionaire_kart
HOST_NAME=billionaire-kart.okgodoit.com
PORT=5105

# --- accounts: one to run the app, one that owns the database and runs migrations -------------
for account in "$APP" "$APP-migrate"; do
  id "$account" >/dev/null 2>&1 || useradd --system --create-home --home-dir "/var/lib/$account" --shell /usr/sbin/nologin "$account"
done

# --- directories ---------------------------------------------------------------------------
install -d -m 755 "/opt/$APP/releases" "/srv/$APP/releases"
install -d -m 750 -o "$APP" -g "$APP" "/var/lib/$APP" "/var/lib/$APP/keys"
install -d -m 750 -o root -g "$APP" "/etc/$APP"
install -d -m 700 "/var/backups/$APP"
install -d -m 755 /var/lib/letsencrypt/.well-known/acme-challenge

# --- database: the migrate role owns it; the runtime role only reads and writes rows --------
sudo -u postgres psql -v ON_ERROR_STOP=1 <<SQL
SELECT 'CREATE ROLE "$APP-migrate" LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE' WHERE NOT EXISTS (SELECT FROM pg_roles WHERE rolname='$APP-migrate') \gexec
SELECT 'CREATE ROLE "$APP" LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE' WHERE NOT EXISTS (SELECT FROM pg_roles WHERE rolname='$APP') \gexec
SELECT 'CREATE DATABASE $DB OWNER "$APP-migrate"' WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname='$DB') \gexec
REVOKE ALL ON DATABASE $DB FROM PUBLIC;
GRANT CONNECT ON DATABASE $DB TO "$APP";
SQL
sudo -u postgres psql -d "$DB" -v ON_ERROR_STOP=1 <<SQL
REVOKE CREATE ON SCHEMA public FROM PUBLIC;
GRANT USAGE, CREATE ON SCHEMA public TO "$APP-migrate";
GRANT USAGE ON SCHEMA public TO "$APP";
ALTER DEFAULT PRIVILEGES FOR ROLE "$APP-migrate" IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO "$APP";
ALTER DEFAULT PRIVILEGES FOR ROLE "$APP-migrate" IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO "$APP";
SQL

# --- environment (kept if it already exists; local peer authentication, so no database password) ---
if [[ ! -f "/etc/$APP/app.env" ]]; then
cat > "/etc/$APP/app.env" <<ENV
ASPNETCORE_ENVIRONMENT=Production
ConnectionStrings__Kart="Host=/var/run/postgresql;Database=$DB;Username=$APP;Maximum Pool Size=10"
Kart__KeyDirectory=/var/lib/$APP/keys
Kart__AllowedOrigins=https://$HOST_NAME
ENV
fi
if [[ ! -f "/etc/$APP/secrets.env" ]]; then
  ( umask 077; printf 'Kart__AdminToken=%s\n' "$(openssl rand -base64 30 | tr -d '/+=' | cut -c1-32)" > "/etc/$APP/secrets.env" )
fi
chmod 640 "/etc/$APP/app.env" "/etc/$APP/secrets.env"
chown root:"$APP" "/etc/$APP/app.env" "/etc/$APP/secrets.env"

# --- the host's list of who uses which port ---------------------------------------------------
python3 - <<PY
import json
from pathlib import Path
p = Path('/etc/side-projects/inventory.json'); v = json.loads(p.read_text())
taken = [x for x in v['projects'] if x.get('id') != '$APP' and x.get('port') == $PORT]
if taken: raise SystemExit(f"port $PORT is already used by {taken[0]['id']}")
v['projects'] = [x for x in v['projects'] if x.get('id') != '$APP'] + [{
  'id': '$APP', 'user': '$APP', 'port': $PORT, 'database': '$DB',
  'hostnames': ['$HOST_NAME'], 'unit': '$APP.service'}]
p.write_text(json.dumps(v, indent=2) + '\n')
PY

# --- certificate: answer the HTTP challenge from a plain port-80 block until the real site is in ---
if [[ ! -e "/etc/letsencrypt/live/$APP/fullchain.pem" ]]; then
  if [[ ! -e "/etc/nginx/sites-enabled/$APP" ]]; then
    cat > "/etc/nginx/sites-available/$APP-bootstrap" <<NGINX
server {
  listen 80; listen [::]:80;
  server_name $HOST_NAME;
  location ^~ /.well-known/acme-challenge/ { root /var/lib/letsencrypt; }
  location / { return 404; }
}
NGINX
    ln -sf "/etc/nginx/sites-available/$APP-bootstrap" "/etc/nginx/sites-enabled/$APP-bootstrap"
    flock /run/lock/side-projects-nginx.lock sh -c 'nginx -t && systemctl reload nginx'
  fi
  certbot certonly --non-interactive --agree-tos --webroot -w /var/lib/letsencrypt \
    --cert-name "$APP" --key-type ecdsa -d "$HOST_NAME"
fi

# --- a local database dump every night, fourteen kept (the host's weekly snapshots are the other copy) ---
cat > "/etc/cron.d/$APP-backup" <<CRON
# Billionaire Kart: nightly local dump of ratings and results. Installed by ops/provision.sh.
17 9 * * * root sudo -u postgres pg_dump -Fc $DB > /var/backups/$APP/$DB-\$(date +\%F).dump && find /var/backups/$APP -name '*.dump' -mtime +14 -delete
CRON
chmod 644 "/etc/cron.d/$APP-backup"

echo "provisioned $APP: port $PORT, database $DB, certificate $(test -e /etc/letsencrypt/live/$APP/fullchain.pem && echo ready || echo MISSING)"
