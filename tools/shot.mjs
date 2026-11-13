#!/usr/bin/env node
/* Headless screenshots of the running game, for PRs, the README, and checking
   work without a visible browser. Uses the installed Chrome via Playwright.
   Usage: node tools/shot.mjs --url "?auto=1&intro=0" --out shot.png [--wait 6] [--size 1280x720]
          [--at 3,9,15 → one shot per time, saved as out-3.png …] [--eval "js"] [--mobile] [--port 8765]
   Starts its own static server if nothing is listening on the port. */
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { takeSlot } from './slot.mjs';

await takeSlot('shot');   // two heavy jobs at a time on this machine: see slot.mjs

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2), opt = {};
for (let i = 0; i < args.length; i++) if (args[i].startsWith('--')) { const k = args[i].slice(2); opt[k] = args[i + 1] && !args[i + 1].startsWith('--') ? args[++i] : true; }
let port = +(opt.port || 0);   // 0 = any free port, so several runs can overlap
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.woff2': 'font/woff2', '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg', '.svg': 'image/svg+xml' };
const server = http.createServer(async (req, res) => {
  try {
    let p = normalize(join(ROOT, decodeURIComponent(new URL(req.url, 'http://x').pathname)));
    if (!p.startsWith(ROOT)) { res.writeHead(403); return res.end(); }
    if (p.endsWith('/') || p === ROOT) p = join(p, 'index.html');
    const data = await readFile(p);
    res.writeHead(200, { 'Content-Type': MIME[extname(p)] || 'application/octet-stream', 'Cache-Control': 'no-store' }); res.end(data);
  } catch { res.writeHead(404); res.end('not found'); }
});
await new Promise(r => server.listen(port, '127.0.0.1', r));
port = server.address().port;

const [w, h] = (opt.size || (opt.mobile ? '844x390' : '1280x720')).split('x').map(Number);
let browser;
try { browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required'] }); }
catch { browser = await chromium.launch({ headless: true, args: ['--enable-unsafe-swiftshader'] }); }
const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: +(opt.dpr || 1), hasTouch: !!opt.mobile, isMobile: !!opt.mobile, serviceWorkers: 'block' });
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', e => errors.push('pageerror: ' + e.message + ' @ ' + String(e.stack || '').split('\n').slice(1, 4).map(l => l.trim()).join(' <- ')));
page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
const url = `http://127.0.0.1:${port}/${String(opt.url === true ? '' : opt.url || '').replace(/^\//, '')}`;
await page.goto(url, { waitUntil: 'load' });
const out = opt.out || 'shot.png';
const times = opt.at ? String(opt.at).split(',').map(Number) : [+(opt.wait || 5)];
let t0 = Date.now();
for (const t of times) {
  const ms = t * 1000 - (Date.now() - t0); if (ms > 0) await page.waitForTimeout(ms);
  if (opt.eval) await page.evaluate(opt.eval).catch(e => errors.push('eval: ' + e.message));
  const file = times.length > 1 ? out.replace(/(\.\w+)$/, `-${t}$1`) : out;
  await page.screenshot({ path: file, type: file.endsWith('.jpg') ? 'jpeg' : 'png', quality: file.endsWith('.jpg') ? 88 : undefined });
  console.log('saved', file);
}
if (opt.info) console.log(await page.evaluate(opt.info === true ? '(() => { const i = BK.gfx.renderer.info; return JSON.stringify({ calls: i.render.calls, tris: i.render.triangles, frameMs: +BK.gfx._ft.toFixed(1), scale: BK.gfx.scale }); })()' : opt.info).catch(e => 'info failed: ' + e.message));
if (errors.length) { console.log('ERRORS:\n' + [...new Set(errors)].slice(0, 12).join('\n')); }
await browser.close(); server.close();
process.exit(errors.length ? 1 : 0);
