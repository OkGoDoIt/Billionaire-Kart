#!/usr/bin/env node
/* Service-worker check (#88): the bots run with the service worker blocked, so this is the one check that
   runs with it ON. It proves the stale-while-revalidate deal in sw.js: replace an image at the same path
   and a returning visitor sees the new image by their second page load, with nobody bumping a version.

   How: serve this tree to a real Chromium, load the game so its own registration installs sw.js, then
   drive a small harness page on the same origin that fetches one backdrop and shows exactly the bytes it
   was served (hashed, so the screenshots are evidence, not decoration).
     visit 1 (first ever load)  -> served the original bytes; the SW caches them.
     [the file at that path is replaced on disk with different art]
     visit 2 (returning load 1) -> still served the original bytes (cache answers at once),
                                   but the cache itself must hold the new bytes afterwards:
                                   the background refresh landed.
     visit 3 (returning load 2) -> served the new bytes. Done.
   The game leaves the SW off on localhost (index.html unregisters it there, so development never sees a
   stale file), so the browser is pointed at a stand-in hostname, swtest.localhost, that resolves to this
   machine. A localhost subdomain is a secure context in Chromium by default — service workers and
   crypto.subtle both work — and it is not one of the three hostnames index.html unregisters on
   ('localhost', '127.0.0.1', '[::1]'), so registration happens exactly as it does on the live https site.
   (An earlier version used swtest.local plus --unsafely-treat-insecure-origin-as-secure; that flag did
   not take effect in the headless build here — the page loaded but navigator.serviceWorker and
   crypto.subtle were both undefined — so the check now relies on the localhost rule instead.)
   The replaced file is restored before exit, pass or fail.
   Usage: node tools/sw-check.mjs [--out dir] */
import http from 'node:http';
import { readFile, writeFile, copyFile, rm } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { extname, join, normalize, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { takeSlot } from './slot.mjs';

await takeSlot('sw-check');   // two heavy jobs at a time on this machine: see slot.mjs

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2), opt = {};
for (let i = 0; i < args.length; i++) if (args[i].startsWith('--')) { const k = args[i].slice(2); opt[k] = args[i + 1] && !args[i + 1].startsWith('--') ? args[++i] : true; }
const out = opt.out || '/tmp/bk-sw-check';
const { mkdirSync } = await import('node:fs'); mkdirSync(out, { recursive: true });

const ASSET = 'assets/backdrops/datacenter-dash.webp';          // the backdrop #88 was filed about
const DONOR = 'assets/backdrops/mars-colony.webp';              // different art, swapped in at the same path
const assetPath = join(ROOT, ASSET), backupPath = assetPath + '.sw-check-backup';
const sha = buf => createHash('sha256').update(buf).digest('hex');
const origBytes = await readFile(assetPath), donorBytes = await readFile(join(ROOT, DONOR));
const H_ORIG = sha(origBytes), H_NEW = sha(donorBytes);
if (H_ORIG === H_NEW) { console.error('sw-check: donor art is identical to the asset; pick another donor'); process.exit(1); }

const HOST = 'swtest.localhost', PORT = 8931, ORIGIN = `http://${HOST}:${PORT}`;
const HARNESS = `<!doctype html><meta charset="utf-8"><title>sw-check</title>
<style>html,body{margin:0;height:100%;background:#111}img{width:100%;height:100%;object-fit:cover;display:block}
#cap{position:fixed;top:14px;left:14px;background:rgba(0,0,0,.78);color:#fff;font:16px/1.5 monospace;
padding:10px 14px;border-radius:8px;white-space:pre}</style>
<img id="art"><div id="cap">loading</div>
<script>
const label = new URLSearchParams(location.search).get('v') || '?';
async function digest(buf){ if (!crypto.subtle) return 'no-crypto-subtle-not-a-secure-context'; const h = await crypto.subtle.digest('SHA-256', buf); return [...new Uint8Array(h)].map(b=>b.toString(16).padStart(2,'0')).join(''); }
window.__probe = (async () => {
  const res = await fetch('/${ASSET}');
  const buf = await res.arrayBuffer();
  const hash = await digest(buf);
  document.getElementById('art').src = URL.createObjectURL(new Blob([buf], { type: 'image/webp' }));
  const controlled = !!(navigator.serviceWorker && navigator.serviceWorker.controller);
  document.getElementById('cap').textContent =
    'SW CHECK #88\\nvisit: ' + label + '\\nserved bytes sha256: ' + hash.slice(0, 16) + '\\nSW controlling this page: ' + controlled;
  return { hash, controlled };
})();
window.__cacheHash = async () => {
  for (const name of await caches.keys()) {
    const hit = await (await caches.open(name)).match('/${ASSET}');
    if (hit) return await digest(await hit.arrayBuffer());
  }
  return null;
};
</script>`;

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.woff2': 'font/woff2', '.mp3': 'audio/mpeg' };
const server = http.createServer(async (req, res) => {
  const path = new URL(req.url, 'http://x').pathname;
  if (path === '/__swcheck.html') { res.writeHead(200, { 'Content-Type': 'text/html', 'Cache-Control': 'no-store' }); res.end(HARNESS); return; }
  try {
    let p = normalize(join(ROOT, decodeURIComponent(path))); if (p === ROOT || p === ROOT + '/') p = join(ROOT, 'index.html');
    const d = await readFile(p);
    res.writeHead(200, { 'Content-Type': MIME[extname(p)] || 'application/octet-stream', 'Cache-Control': 'max-age=0, must-revalidate' });
    res.end(d);
  } catch { res.writeHead(404); res.end('nf'); }
});

const fails = [];
const check = (what, ok) => { console.log(`${ok ? 'ok  ' : 'FAIL'}  ${what}`); if (!ok) fails.push(what); };
let browser;
await copyFile(assetPath, backupPath);                            // restored in finally, pass or fail
try {
  await new Promise(r => server.listen(PORT, '127.0.0.1', r));
  // This machine sets proxy env vars, and the headless Chromium takes its proxy from them: the stand-in
  // hostname is not in no_proxy, so with the env inherited the browser sends the local test origin to
  // the egress proxy and gets an empty response (the local server never sees the request). Stripping
  // the proxy vars from the browser's own environment is what fixes it — --no-proxy-server alone does
  // not override them in this build. (Found by probe: same launch with the env stripped loads fine.)
  const browserEnv = { ...process.env };
  for (const k of ['http_proxy', 'https_proxy', 'HTTP_PROXY', 'HTTPS_PROXY', 'all_proxy', 'ALL_PROXY']) delete browserEnv[k];
  const flags = [`--host-resolver-rules=MAP ${HOST} 127.0.0.1`, '--no-proxy-server'];
  try { browser = await chromium.launch({ channel: 'chrome', headless: true, env: browserEnv, args: [...flags, '--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'] }); }
  catch { browser = await chromium.launch({ headless: true, env: browserEnv, args: [...flags, '--enable-unsafe-swiftshader'] }); }
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 } });   // service workers left ON (the bots block them; this check must not)
  const page = await ctx.newPage();
  page.on('pageerror', e => console.log('warn  pageerror (game boot, not under test): ' + e.message));

  await page.goto(ORIGIN + '/', { waitUntil: 'load', timeout: 90000 });
  const swOn = await page.waitForFunction(() => !!(navigator.serviceWorker && navigator.serviceWorker.controller), null, { timeout: 30000 }).then(() => true).catch(() => false);
  check('the game page registered sw.js and the SW controls the page', swOn);

  const visit = async (label, name) => {
    // A harness failure must be reported as failed checks below, not crash the run and lose the
    // other visits' evidence, so probe errors come back as a null hash.
    try {
      await page.goto(`${ORIGIN}/__swcheck.html?v=${encodeURIComponent(label)}`, { waitUntil: 'load' });
      const probe = await page.evaluate(() => window.__probe);
      await page.waitForTimeout(400);
      await page.screenshot({ path: join(out, name + '.jpg'), type: 'jpeg', quality: 85 });
      return probe;
    } catch (e) {
      console.log('warn  visit "' + label + '" probe failed: ' + e.message.split('\n')[0]);
      await page.screenshot({ path: join(out, name + '.jpg'), type: 'jpeg', quality: 85 }).catch(() => {});
      return { hash: null, controlled: false };
    }
  };

  const v1 = await visit('1 — first ever load', '01-first-visit');
  check('visit 1: served the original art', v1.hash === H_ORIG);
  check('visit 1: harness page is SW-controlled', v1.controlled);

  await writeFile(assetPath, donorBytes);                          // the asset is replaced at the same path
  const v2 = await visit('2 — returning load 1 (art replaced)', '02-return-stale');
  check('visit 2: still served the original art at once (cache-first)', v2.hash === H_ORIG);
  let cacheHash = null;
  for (let i = 0; i < 20 && cacheHash !== H_NEW; i++) { cacheHash = await page.evaluate(() => window.__cacheHash()).catch(() => null); if (cacheHash !== H_NEW) await page.waitForTimeout(500); }
  check('visit 2: the background refresh put the new art in the cache', cacheHash === H_NEW);

  const v3 = await visit('3 — returning load 2', '03-return-new');
  check('visit 3: served the new art — a replaced file shows up by the second returning load', v3.hash === H_NEW);
} finally {
  await copyFile(backupPath, assetPath).catch(() => {});
  await rm(backupPath, { force: true }).catch(() => {});
  if (browser) await browser.close().catch(() => {});
  server.close();
}
console.log(fails.length ? `sw-check: FAIL (${fails.length})` : 'sw-check: ok');
process.exit(fails.length ? 1 : 0);
