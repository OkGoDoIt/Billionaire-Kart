# Automatic deploys to billionaire-kart.okgodoit.com

After the checks pass on `main`, CI publishes the same tested commit to GitHub Pages and to the game's home on the shared host: the online server (when the commit has `server/`) and the game files, in one request. The `deploy-okgodoit` job in `.github/workflows/checks.yml` does this:

1. It skips the run if `main` has already moved on, so a slow run can never roll anything back.
2. It builds the game files into `_upload/site` (`tools/build-site.mjs`, plus `version.txt`) and, if there is a server project, `dotnet publish`es it into `_upload/server`.
3. It rsyncs `_upload/` to `billionaire-kart-deploy@178.128.11.103:<sha>/`, then sends `activate <sha>`.
4. It waits until `version.txt`, and `/healthz` when a server was included, report the new commit.

**The order is the point.** The server goes live first: a database dump, migrations as `billionaire-kart-migrate`, the swap, a restart, and a health check that must report the commit. If it isn't healthy, the previous server is put back and the game files are **not** swapped. So players never get a client that expects a server that isn't there, and nobody has to remember an order by hand.

## On the host

- **`billionaire-kart-deploy`:** a system account. Its only key has `restrict,command="/usr/local/libexec/billionaire-kart-site-ssh"` (`receive.py`). That key can upload into `/var/lib/billionaire-kart-deploy/incoming` (write-only, no deletes) and request an install by SHA, nothing else. It has no shell and no sudo, and it can't write to the public folder.
- **`billionaire-kart-site.path`:** starts the root-owned installer, `/usr/local/libexec/billionaire-kart-site-install` (`install.py`), when a request appears. The installer:
  - refuses symlinks, special files, uploads over 600 MB, a server without `BillionaireKart.Server.dll`, and game files without `index.html` or a matching `version.txt`;
  - installs the server under `/opt/billionaire-kart/releases/<sha>` and the game files under `/srv/billionaire-kart/releases/<sha>`, both as root;
  - swaps each `current` link and keeps six releases of each;
  - skips any part that's already live at that commit;
  - writes `/var/lib/billionaire-kart-deploy/results/<sha>.json`.

  It takes `/run/lock/billionaire-kart.lock`, the same lock as `ops/deploy.sh`.

## Setup and keys

- **Set up or refresh the host:** `ops/site-deploy/setup.sh ~/.ssh/billionaire-kart-ci.pub`. It needs root SSH and is safe to re-run.
- **The private key** is the repository secret `OKGODOIT_DEPLOY_KEY`. Without it, the job warns and skips.
- **To rotate the key:**
  1. Make a new ed25519 key.
  2. Re-run `setup.sh` with the new public key.
  3. Run `gh secret set OKGODOIT_DEPLOY_KEY < <new private key>`.
- **`known_hosts`** pins the host's ed25519 key. It was checked against the key Roger's Mac already trusted. If the host is rebuilt, replace it.
- **The game will check the server itself.** With the online work, the Online button appears only when `/healthz` answers with a protocol version the client supports, so a server that is down or out of date never shows players a broken button. (Requested from the online session for its PR.)
- **To roll back by hand,** point the `current` link at an older release as root:

  ```bash
  ln -sfn /srv/billionaire-kart/releases/<sha> /srv/billionaire-kart/current
  ```
