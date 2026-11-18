# Hosting and deploys

The game is served at **https://billionaire-kart.okgodoit.com** from Roger's shared side-projects host (DigitalOcean `side-projects-2026`, `178.128.11.103`), beside his other sites. That host's own rules are in the `rogerpincombe.com` repository (`docs/OPERATIONS.md`): one nginx and one PostgreSQL shared by every project, and each project gets its own Unix accounts, database, port, directories, and service. No containers.

The old address, okgodoit.github.io/Billionaire-Kart, is still published from `main` by CI, but `src/moved.js` forwards everyone who opens it to the new address and carries their saved progress along. Both addresses serve the folder `tools/build-site.mjs` assembles. Online play only works on the okgodoit.com address, because that is where the server is.

| This project's | Is |
|---|---|
| Service | `billionaire-kart.service`, listening on `127.0.0.1:5105` |
| Accounts | `billionaire-kart` (runs the app), `billionaire-kart-migrate` (owns the database, runs migrations) |
| Database | `billionaire_kart` (local peer authentication, no password) |
| Game files | `/srv/billionaire-kart/releases/<commit>`, live one at `/srv/billionaire-kart/current` |
| Server app | `/opt/billionaire-kart/releases/<commit>`, live one at `/opt/billionaire-kart/current` |
| Settings | `/etc/billionaire-kart/app.env`; the admin sign-in secret is in `/etc/billionaire-kart/secrets.env` |
| Cookie keys | `/var/lib/billionaire-kart/keys` |
| Database dumps | `/var/backups/billionaire-kart` (nightly, and before every migration; 14 days kept) |
| Certificate | `/etc/letsencrypt/live/billionaire-kart`, renewed by the host's certbot timer |
| Logs | `journalctl -u billionaire-kart`, `/var/log/nginx/billionaire-kart.*.log` |

nginx serves the game's files itself and passes `/api`, `/ws`, `/admin`, and `/healthz` to the app. If the app is down the game still loads and plays offline modes.

## Deploying

The game files deploy by themselves: after the checks pass on `main`, CI publishes them here and to GitHub Pages ([site-deploy/README.md](site-deploy/README.md)). The server app is deployed with the script below.

```bash
ops/deploy.sh
```

That deploys `origin/main`: it exports the game files and builds the server app from that exact commit, copies both to the host, takes a database dump, runs migrations, swaps the symlinks, restarts the service, and checks `/healthz` and `/version.txt` report the new commit. If the new server does not come up healthy the previous one is put back. Options: a git ref to deploy something other than `origin/main`, `--site-only` for just the game files, `--setup` to (re)apply host setup after changing `provision.sh`, the nginx file, or the service unit.

Needs: root SSH to the host, `rsync` 3 (`brew install rsync`), the .NET 10 SDK, and Node (for the two-heavy-jobs slot).

Rooms live in the server's memory, so a restart ends races in progress. Deploy the server app when nobody is racing (`/healthz` shows `rooms` and `players`); `--site-only` never interrupts anyone.

## Admin

`https://billionaire-kart.okgodoit.com/admin`. Sign in with the secret from the host:

```bash
ssh root@178.128.11.103 cat /etc/billionaire-kart/secrets.env
```

Every tunable number (lobby timers, CPU fill, rating constants) is edited there and takes effect at once.

## What is not here

Backups are the host's weekly snapshots plus the local dumps above. There is no off-site copy and no point-in-time recovery; the data is ratings and race results, which can be lost without harming anyone. Deploys are run by hand, not by CI.
