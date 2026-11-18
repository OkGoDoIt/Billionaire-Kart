#!/usr/bin/python3
"""Root-owned installer for game releases uploaded by CI. Started by billionaire-kart-site.path whenever a
request appears. For each requested SHA it checks the upload (regular files and folders only, an index.html,
a version.txt naming that SHA, a sane size), copies it to /srv/billionaire-kart/releases/<sha> owned by root,
swaps /srv/billionaire-kart/current, keeps the six newest releases, and writes a result for receive.py.
It takes the same lock as ops/deploy.sh, so a hand deploy and a CI deploy never interleave.
Installed as /usr/local/libexec/billionaire-kart-site-install."""
import fcntl, json, os, pathlib, re, shutil, stat, sys, time

BASE = pathlib.Path('/var/lib/billionaire-kart-deploy')
SRV = pathlib.Path('/srv/billionaire-kart')
MAX_BYTES = 400 * 1024 * 1024
KEEP = 6

def check(upload, sha):
    if not upload.is_dir() or upload.is_symlink():
        return 'no upload for this commit'
    total = 0
    for root, dirs, files in os.walk(upload, followlinks=False):
        for name in dirs + files:
            mode = os.lstat(os.path.join(root, name)).st_mode
            if not (stat.S_ISDIR(mode) or stat.S_ISREG(mode)):
                return f'not a plain file or folder: {os.path.relpath(os.path.join(root, name), upload)}'
            if stat.S_ISREG(mode):
                total += os.lstat(os.path.join(root, name)).st_size
    if total > MAX_BYTES:
        return f'upload is {total // 1048576} MB, over the {MAX_BYTES // 1048576} MB limit'
    if not (upload / 'index.html').is_file():
        return 'upload has no index.html'
    version = (upload / 'version.txt').read_text().strip() if (upload / 'version.txt').is_file() else ''
    if version != sha:
        return 'version.txt does not name this commit'
    return None

def install(sha):
    upload = BASE / 'incoming' / sha
    problem = check(upload, sha)
    if problem:
        shutil.rmtree(upload, ignore_errors=True)      # a refused upload is not kept around
        return False, problem
    releases = SRV / 'releases'; releases.mkdir(parents=True, exist_ok=True)
    dest = releases / sha
    if not dest.exists():
        staging = releases / f'.{sha}.staging'
        shutil.rmtree(staging, ignore_errors=True)
        shutil.copytree(upload, staging, symlinks=True)
        for root, dirs, files in os.walk(staging):
            os.chown(root, 0, 0); os.chmod(root, 0o755)
            for f in files:
                p = os.path.join(root, f); os.chown(p, 0, 0); os.chmod(p, 0o644)
        staging.rename(dest)
    link = SRV / '.current.tmp'
    if link.is_symlink() or link.exists(): link.unlink()
    link.symlink_to(dest); link.replace(SRV / 'current')
    live = (SRV / 'current').resolve()
    old = sorted((d for d in releases.iterdir() if d.is_dir() and not d.name.startswith('.')), key=lambda d: d.stat().st_mtime, reverse=True)
    for d in old[KEEP:]:
        if d.resolve() != live: shutil.rmtree(d, ignore_errors=True)
    shutil.rmtree(upload, ignore_errors=True)
    return True, f'live: {sha}'

def main():
    with open('/run/lock/billionaire-kart.lock', 'w') as lock:
        fcntl.flock(lock, fcntl.LOCK_EX)
        for request in sorted((BASE / 'requests').glob('*.json')):
            sha = request.stem
            if not re.fullmatch(r'[a-f0-9]{40}', sha):
                request.unlink(); continue
            try:
                ok, message = install(sha)
            except Exception as e:                       # report, never leave the request hanging
                ok, message = False, f'install failed: {e}'
            result = BASE / 'results' / f'{sha}.json'
            tmp = result.with_suffix('.tmp')
            tmp.write_text(json.dumps({'success': ok, 'sha': sha, 'message': message, 'time': int(time.time())}))
            os.chmod(tmp, 0o644); tmp.replace(result)
            request.unlink(missing_ok=True)
            print(('installed ' if ok else 'refused ') + sha + ': ' + message, flush=True)

if __name__ == '__main__':
    main()
