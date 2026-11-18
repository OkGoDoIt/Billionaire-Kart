# Automatic game deploys to billionaire-kart.okgodoit.com

After the checks pass on `main`, CI publishes the same tested `_site` folder to GitHub Pages and to the game's home on the shared host. The `deploy-okgodoit` job in `.github/workflows/checks.yml` does this:

1. It skips the run if `main` has already moved on, so a slow run can never roll the site back.
2. It builds `_site` with `tools/build-site.mjs` and writes `version.txt` with the commit SHA.
3. It rsyncs that folder to `billionaire-kart-deploy@178.128.11.103:<sha>/`, then sends `activate <sha>`.
4. It waits until https://billionaire-kart.okgodoit.com/version.txt reports the new commit.

## On the host

- **`billionaire-kart-deploy`:** a system account. Its only key has `restrict,command="/usr/local/libexec/billionaire-kart-site-ssh"` (`receive.py`). That key can upload into `/var/lib/billionaire-kart-deploy/incoming` (write-only, no deletes) and request an install by SHA, nothing else. It has no shell and no sudo, and it can't write to the public folder.
- **`billionaire-kart-site.path`:** starts the root-owned installer, `/usr/local/libexec/billionaire-kart-site-install` (`install.py`), when a request appears. The installer:
  - refuses anything but plain files and folders, an upload over 400 MB, and an upload without `index.html` or a matching `version.txt`;
  - copies the release to `/srv/billionaire-kart/releases/<sha>` as root;
  - swaps `/srv/billionaire-kart/current` and keeps six releases;
  - writes `/var/lib/billionaire-kart-deploy/results/<sha>.json`.

  It takes `/run/lock/billionaire-kart.lock`, the same lock as `ops/deploy.sh`.
- **Each commit installs once.** Asking again for a commit that already succeeded does nothing.

## Setup and keys

- **Set up or refresh the host:** `ops/site-deploy/setup.sh ~/.ssh/billionaire-kart-ci.pub`. It needs root SSH and is safe to re-run.
- **The private key** is the repository secret `OKGODOIT_DEPLOY_KEY`. Without it, the job warns and skips.
- **To rotate the key:**
  1. Make a new ed25519 key.
  2. Re-run `setup.sh` with the new public key.
  3. Run `gh secret set OKGODOIT_DEPLOY_KEY < <new private key>`.
- **`known_hosts`** pins the host's ed25519 key. It was checked against the key Roger's Mac already trusted. If the host is rebuilt, replace it.
- **The server app** (`server/`, the online backend) is still deployed by hand with `ops/deploy.sh`. This covers the game files only.
- **To roll back by hand,** point the `current` link at an older release as root:

  ```bash
  ln -sfn /srv/billionaire-kart/releases/<sha> /srv/billionaire-kart/current
  ```
