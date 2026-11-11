#!/usr/bin/env node
/* Contact sheet of a whole track for review: eight views around the lap plus an
   aerial view, in one image. Also reports page errors.
   Usage: node tools/track-shots.mjs <track-id> [out.jpg] [--quality high] */
import http from 'node:http';
import { readFile, mkdtemp } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { extname, join, normalize, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const id = process.argv[2]; if (!id) { console.error('usage: track-shots.mjs <track-id> [out.jpg]'); process.exit(2); }
const out = process.argv[3] && !process.argv[3].startsWith('--') ? process.argv[3] : `/tmp/track-${id}-sheet.jpg`;
const quality = process.argv.includes('--quality') ? process.argv[process.argv.indexOf('--quality') + 1] : 'high';
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.woff2': 'font/woff2', '.mp3': 'audio/mpeg' };
const server = http.createServer(async (req, res) => {
  try { let p = normalize(join(ROOT, decodeURIComponent(new URL(req.url, 'http://x').pathname))); if (p.endsWith('/') || p === ROOT) p = join(p, 'index.html'); const d = await readFile(p); res.writeHead(200, { 'Content-Type': MIME[extname(p)] || 'application/octet-stream', 'Cache-Control': 'no-store' }); res.end(d); }
  catch { res.writeHead(404); res.end('nf'); }
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const port = server.address().port;
let browser;
try { browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'] }); }
catch { browser = await chromium.launch({ headless: true, args: ['--enable-unsafe-swiftshader'] }); }
const page = await (await browser.newContext({ viewport: { width: 960, height: 540 }, serviceWorkers: 'block' })).newPage();
const errors = [];
page.on('pageerror', e => errors.push('pageerror: ' + e.message));
page.on('console', m => { if (m.type() === 'error' && !/favicon/.test(m.text())) errors.push('console: ' + m.text()); });
await page.goto(`http://127.0.0.1:${port}/?track=${id}&auto=1&intro=0&fly=1&q=${quality}&seed=4`, { waitUntil: 'load' });
await page.waitForFunction('window.BK && BK.fly && BK.race', null, { timeout: 30000 }).catch(() => errors.push('game did not start'));
await page.waitForTimeout(1500);
const dir = await mkdtemp(join(tmpdir(), 'bk-shots-'));
const L = await page.evaluate('BK.race.track.length').catch(() => 1000);
const files = [];
for (let k = 0; k < 8; k++) {
  await page.evaluate(`BK.gfx.fixedScale = true; BK.fly.top = false; BK.fly.s = ${(L * k) / 8 + 6}`);
  await page.waitForTimeout(450);
  const f = join(dir, `v${k}.png`); await page.screenshot({ path: f }); files.push(f);
}
await page.evaluate('BK.fly.top = true'); await page.waitForTimeout(500);
const top = join(dir, 'top.png'); await page.screenshot({ path: top });
const info = await page.evaluate('(() => { const i = BK.gfx.renderer.info; return { calls: i.render.calls, tris: i.render.triangles }; })()').catch(() => ({}));
await browser.close(); server.close();
const row = (list, name) => { const f = join(dir, name); execFileSync('magick', [...list, '+append', f]); return f; };
const r1 = row(files.slice(0, 4), 'r1.png'), r2 = row(files.slice(4), 'r2.png');
const grid = join(dir, 'grid.png'); execFileSync('magick', [r1, r2, '-append', grid]);
execFileSync('magick', [grid, '(', top, '-resize', '3840x', ')', '-append', '-resize', '1920x', '-quality', '86', out]);
console.log(`sheet: ${out}  (top two rows: views at 0/8..7/8 of the lap, left to right; bottom: aerial)`);
console.log(`draw calls ${info.calls}, triangles ${info.tris}`);
if (errors.length) { console.log('ERRORS:\n' + [...new Set(errors)].slice(0, 10).join('\n')); process.exit(1); }
