#!/usr/bin/python3
"""Root-owned installer for releases uploaded by CI. Started by billionaire-kart-site.path whenever a request
appears; ops/deploy.sh can use it too. One commit, one go-live path:

  incoming/<sha>/server/   the online server (dotnet publish output), optional
  incoming/<sha>/site/     the game files (tools/build-site.mjs output), optional
  incoming/<sha>/index.html ...   (older uploads: the game files at the top level)

The server goes first: database dump, migrations as the migrate identity, symlink swap, restart, and a health
check that must report this commit. If any of that fails, the previous server is put back and the game files are
NOT swapped, so players never get a client ahead of its server. Then the game files go live. Each part that is
already live at this commit is skipped, so a repeat request is harmless. Six releases of each are kept.
It takes /run/lock/billionaire-kart.lock, the same lock as ops/deploy.sh.
Installed as /usr/local/libexec/billionaire-kart-site-install."""
import fcntl, json, os, pathlib, re, shutil, stat, subprocess, time, urllib.request

APP = 'billionaire-kart'
BASE = pathlib.Path(f'/var/lib/{APP}-deploy')
SRV = pathlib.Path(f'/srv/{APP}')
OPT = pathlib.Path(f'/opt/{APP}')
DLL = 'BillionaireKart.Server.dll'
HEALTH = 'http://127.0.0.1:5105/healthz'
MAX_BYTES = 600 * 1024 * 1024
KEEP = 6


def plain_tree(folder):
    """Refuse anything but plain files and folders (a symlink could expose a root-only file), and huge uploads."""
    total = 0
    for root, dirs, files in os.walk(folder, followlinks=False):
        for name in dirs + files:
            info = os.lstat(os.path.join(root, name))
            if not (stat.S_ISDIR(info.st_mode) or stat.S_ISREG(info.st_mode)):
                return f'not a plain file or folder: {os.path.relpath(os.path.join(root, name), folder)}'
            total += info.st_size if stat.S_ISREG(info.st_mode) else 0
    return f'upload is {total // 1048576} MB, over the limit' if total > MAX_BYTES else None


def copy_release(src, releases, sha):
    """Copy an upload into releases/<sha>, owned by root and world-readable, unless it is already there."""
    releases.mkdir(parents=True, exist_ok=True)
    dest = releases / sha
    if dest.exists():
        return dest
    staging = releases / f'.{sha}.staging'
    shutil.rmtree(staging, ignore_errors=True)
    shutil.copytree(src, staging, symlinks=True)
    for root, dirs, files in os.walk(staging):
        os.chown(root, 0, 0); os.chmod(root, 0o755)
        for f in files:
            p = os.path.join(root, f); os.chown(p, 0, 0); os.chmod(p, 0o644)
    staging.rename(dest)
    return dest


def point(link, target):
    tmp = link.with_name(link.name + '.new')
    if tmp.is_symlink() or tmp.exists(): tmp.unlink()
    tmp.symlink_to(target); tmp.replace(link)


def prune(releases, live):
    live = live.resolve() if live.exists() else None
    old = sorted((d for d in releases.iterdir() if d.is_dir() and not d.name.startswith('.')), key=lambda d: d.stat().st_mtime, reverse=True)
    for d in old[KEEP:]:
        if d.resolve() != live: shutil.rmtree(d, ignore_errors=True)


def healthy(sha, seconds=30):
    for _ in range(seconds):
        try:
            with urllib.request.urlopen(HEALTH, timeout=2) as r:
                if sha in r.read().decode(): return True
        except Exception:
            pass
        time.sleep(1)
    return False


def install_server(src, sha, log):
    if (OPT / 'current').resolve().name == sha and healthy(sha, 3):
        log.append('server already live'); return True
    problem = plain_tree(src) or (None if (src / DLL).is_file() else f'server upload has no {DLL}')
    if problem:
        log.append(problem); return False
    dest = copy_release(src, OPT / 'releases', sha)
    (dest / 'release.env').write_text(f'Kart__Sha={sha}\n'); os.chmod(dest / 'release.env', 0o644)
    previous = (OPT / 'current').resolve() if (OPT / 'current').exists() else None
    backups = pathlib.Path(f'/var/backups/{APP}'); backups.mkdir(mode=0o700, exist_ok=True)
    with open(backups / f'billionaire_kart-pre-{sha}.dump', 'wb') as dump:
        subprocess.run(['runuser', '-u', 'postgres', '--', 'pg_dump', '-Fc', 'billionaire_kart'], stdout=dump, check=True)
    migrate = subprocess.run(['runuser', '-u', f'{APP}-migrate', '--', 'env', 'ASPNETCORE_ENVIRONMENT=Production',
                              f'ConnectionStrings__Kart=Host=/var/run/postgresql;Database=billionaire_kart;Username={APP}-migrate',
                              f'Kart__KeyDirectory=/var/lib/{APP}-migrate', 'dotnet', str(dest / DLL), 'migrate'],
                             capture_output=True, text=True, timeout=300)
    if migrate.returncode:
        log.append('migration failed: ' + (migrate.stderr or migrate.stdout)[-400:]); return False
    point(OPT / 'current', dest)
    subprocess.run(['systemctl', 'restart', f'{APP}.service'], check=False)
    if healthy(sha):
        prune(OPT / 'releases', OPT / 'current'); log.append('server live'); return True
    tail = subprocess.run(['journalctl', '-u', f'{APP}.service', '-n', '15', '--no-pager'], capture_output=True, text=True).stdout
    if previous and previous.is_dir():
        point(OPT / 'current', previous); subprocess.run(['systemctl', 'restart', f'{APP}.service'], check=False)
        log.append(f'new server was not healthy; put {previous.name[:7]} back')
    else:
        log.append('new server was not healthy and there was no previous one')
    log.append(tail[-600:])
    return False


def install_site(src, sha, log):
    if (SRV / 'current').resolve().name == sha:
        log.append('game files already live'); return True
    problem = plain_tree(src)
    if not problem and not (src / 'index.html').is_file(): problem = 'game upload has no index.html'
    if not problem and not ((src / 'version.txt').is_file() and (src / 'version.txt').read_text().strip() == sha):
        problem = 'version.txt does not name this commit'
    if problem:
        log.append(problem); return False
    point(SRV / 'current', copy_release(src, SRV / 'releases', sha))
    prune(SRV / 'releases', SRV / 'current'); log.append('game files live'); return True


def install(sha):
    upload = BASE / 'incoming' / sha
    if not upload.is_dir() or upload.is_symlink():
        return False, ['no upload for this commit']
    log, ok = [], True
    try:
        server = upload / 'server'
        site = upload / 'site' if (upload / 'site').is_dir() else (upload if (upload / 'index.html').is_file() else None)
        if not server.is_dir() and site is None:
            return False, ['upload has neither server/ nor site/']
        if server.is_dir():
            ok = install_server(server, sha, log)
        if ok and site is not None:
            ok = install_site(site, sha, log)
        elif site is not None:
            log.append('game files NOT swapped, so the live client stays matched to the live server')
        return ok, log
    finally:
        shutil.rmtree(upload, ignore_errors=True)


def main():
    with open(f'/run/lock/{APP}.lock', 'w') as lock:
        fcntl.flock(lock, fcntl.LOCK_EX)
        for request in sorted((BASE / 'requests').glob('*.json')):
            sha = request.stem
            if not re.fullmatch(r'[a-f0-9]{40}', sha):
                request.unlink(); continue
            try:
                ok, log = install(sha)
            except Exception as e:                       # report, never leave the request hanging
                ok, log = False, [f'install failed: {e}']
            result = BASE / 'results' / f'{sha}.json'
            tmp = result.with_suffix('.tmp')
            tmp.write_text(json.dumps({'success': ok, 'sha': sha, 'message': '; '.join(log), 'time': int(time.time())}))
            os.chmod(tmp, 0o644); tmp.replace(result)
            request.unlink(missing_ok=True)
            print(('installed ' if ok else 'refused ') + sha + ': ' + '; '.join(log), flush=True)


if __name__ == '__main__':
    main()
