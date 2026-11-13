#!/usr/bin/env node
/* Draw-call and triangle budget: loads every track in a real (headless) browser at Medium quality (what a phone
   gets), parks the player's kart at the start line and four points round the lap (20, 40, 60, 80 percent), waits for
   the race camera to settle, and reads the renderer's totals for one whole frame (shadow pass included).
   Flags any point over the budget in CONTRIBUTING.md ("Draw-call budget"). Exits 1 if any track is over.
   Usage: node tools/budget.mjs [--track id[,id]] [--q medium] [--calls N] [--tris N] */
import http from 'node:http';
import { readFile, readdir } from 'node:fs/promises';
import { extname, join, normalize, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { takeSlot } from './slot.mjs';

await takeSlot('budget');   // two heavy jobs at a time on this machine: see slot.mjs

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2), opt = {};
for (let i = 0; i < args.length; i++) if (args[i].startsWith('--')) { const k = args[i].slice(2); opt[k] = args[i + 1] && !args[i + 1].startsWith('--') ? args[++i] : true; }
const CALLS = +(opt.calls || 800), TRIS = +(opt.tris || 1.8e6), Q = opt.q || 'medium', POINTS = [0, 0.2, 0.4, 0.6, 0.8];
const ids = opt.track ? String(opt.track).split(',') : (await readdir(join(ROOT, 'src/tracks'))).filter(f => f.endsWith('.js') && !f.startsWith('_')).map(f => f.slice(0, -3)).sort();
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.woff2': 'font/woff2', '.mp3': 'audio/mpeg' };
const server = http.createServer(async (req, res) => { try { let p = normalize(join(ROOT, decodeURIComponent(new URL(req.url, 'http://x').pathname))); if (p.endsWith('/')) p = join(p, 'index.html'); const d = await readFile(p); res.writeHead(200, { 'Content-Type': MIME[extname(p)] || 'application/octet-stream', 'Cache-Control': 'no-store' }); res.end(d); } catch { res.writeHead(404); res.end('nf'); } });
await new Promise(r => server.listen(0, '127.0.0.1', r));
const base = `http://127.0.0.1:${server.address().port}/`;
let browser;
try { browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'] }); }
catch { browser = await chromium.launch({ headless: true, args: ['--enable-unsafe-swiftshader'] }); }
const rows = []; let over = 0;
try {
  const ctx = await browser.newContext({ viewport: { width: 844, height: 390 }, deviceScaleFactor: 2, serviceWorkers: 'block' });
  for (const id of ids) {
    const page = await ctx.newPage(), errs = []; page.on('pageerror', e => errs.push(e.message));
    try {
      await page.goto(base + `?track=${id}&r=larrysergey&intro=0&seed=3&q=${Q}`, { waitUntil: 'load' });
      await page.waitForFunction('window.BK && BK.race', null, { timeout: 60000 });
      await page.evaluate('BK.gfx.fixedScale = true');
      const row = { id, pts: [] };
      for (const f of POINTS) {
        await page.evaluate(f => {
          const r = BK.race, tr = r.track, k = r.players[0], P = new BK.THREE.Vector3(), Q = new BK.THREE.Vector3();
          const s = f * tr.length; tr.pointAt(s, 0, P, 0.5); tr.pointAt(s + 4, 0, Q, 0.5);
          k.place(P.x, P.y, P.z, Math.atan2(Q.x - P.x, Q.z - P.z));
        }, f);
        await page.waitForTimeout(1500);
        row.pts.push(await page.evaluate('(() => { const i = BK.gfx.renderer.info.render; return { calls: i.calls, tris: i.triangles }; })()'));
      }
      row.err = errs[0]; rows.push(row);
    } catch (e) { rows.push({ id, pts: [], err: e.message }); }
    await page.close();
  }
} finally { await browser.close(); server.close(); }
const k = n => (n / 1000).toFixed(0) + 'k';
console.log(`draw-call budget at ${Q}: ${CALLS} calls and ${(TRIS / 1e6).toFixed(1)}M triangles per frame (shadow pass included)\n`);
console.log('track                   start    20%    40%    60%    80%   worst calls   worst tris');
for (const r of rows) {
  if (!r.pts.length) { console.log(`${r.id.padEnd(22)} FAILED to measure: ${r.err}`); over++; continue; }
  const wc = Math.max(...r.pts.map(p => p.calls)), wt = Math.max(...r.pts.map(p => p.tris)), bad = wc > CALLS || wt > TRIS;
  if (bad) over++;
  console.log(`${r.id.padEnd(22)} ${r.pts.map(p => String(p.calls).padStart(6)).join(' ')}   ${String(wc).padStart(10)}   ${k(wt).padStart(10)}${bad ? '   OVER' : ''}${r.err ? '  ERR ' + r.err : ''}`);
}
console.log('\n(each cell is draw calls; triangles only in the worst column)');
console.log(over ? `budget: ${over} over` : 'budget: ok');
process.exit(over ? 1 : 0);
