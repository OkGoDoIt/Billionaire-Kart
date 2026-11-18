#!/usr/bin/python3
"""Forced SSH command for the billionaire-kart-deploy account (GitHub Actions' key).

The key can do exactly two things: upload one release with rsync into its own incoming folder, and ask
for a 40-character commit SHA to be installed. It cannot open a shell, delete anything, or touch the
public folder. The root-owned installer (install.py, run by billionaire-kart-site.path) does the rest
and writes a result this command waits for. Installed as /usr/local/libexec/billionaire-kart-site-ssh."""
import json, os, pathlib, re, sys, time

BASE = pathlib.Path('/var/lib/billionaire-kart-deploy')
command = os.environ.get('SSH_ORIGINAL_COMMAND', '')
if command.startswith('rsync --server '):
    os.execv('/usr/bin/rrsync', ['rrsync', '-wo', '-no-del', str(BASE / 'incoming')])
match = re.fullmatch(r'activate ([a-f0-9]{40})', command)
if not match:
    sys.exit('Only a release upload and "activate <sha>" are allowed.')
sha = match.group(1)
result = BASE / 'results' / f'{sha}.json'
previous = None
if result.exists():
    value = json.loads(result.read_text())
    if value.get('success'):
        print(json.dumps(value)); sys.exit(0)          # each commit installs once; a repeat is a no-op
    info = result.stat(); previous = (info.st_ino, info.st_mtime_ns)
request = BASE / 'requests' / f'{sha}.json'
temporary = request.with_suffix('.tmp'); temporary.write_text('{}'); temporary.replace(request)
for _ in range(180):
    if result.exists():
        info = result.stat()
        if (info.st_ino, info.st_mtime_ns) != previous:
            value = json.loads(result.read_text()); print(json.dumps(value))
            sys.exit(0 if value.get('success') else 1)
    time.sleep(1)
sys.exit('The install is still running; check /var/lib/billionaire-kart-deploy/results before retrying.')
