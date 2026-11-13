#!/usr/bin/env node
/* Capture the menu thumbnail for every registered track (or the ids given) from
   the running game: assets/tracks/<id>.webp, 640x360.
   The picture is the track's opening shot. A track can choose another with
   `thumb: { at, lat, h, back, look }` in its definition (at = control-point param). */
import http from 'node:http';
import { readFile, mkdir } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { extname, join, normalize, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { TRACKS } from '../src/content/tracks.js';
import { takeSlot } from './slot.mjs';

await takeSlot('track-thumbs');   // two heavy jobs at a time on this machine: see slot.mjs

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const ids = process.argv.slice(2).length ? process.argv.slice(2) : TRACKS.map(t => t.id);
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.woff2': 'font/woff2', '.mp3': 'audio/mpeg' };
const server = http.createServer(async (req, res) => {
  try { let p = normalize(join(ROOT, decodeURIComponent(new URL(req.url, 'http://x').pathname))); if (p.endsWith('/') || p === ROOT) p = join(p, 'index.html'); const d = await readFile(p); res.writeHead(200, { 'Content-Type': MIME[extname(p)] || 'application/octet-stream', 'Cache-Control': 'no-store' }); res.end(d); }
  catch { res.writeHead(404); res.end('nf'); }
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const port = server.address().port;
let browser;   // installed Chrome when there is one, else Playwright's own browser (same as shot.mjs)
try { browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'] }); }
catch { browser = await chromium.launch({ headless: true, args: ['--enable-unsafe-swiftshader'] }); }
await mkdir(resolve(ROOT, 'assets/tracks'), { recursive: true });
for (const id of ids) {
  const page = await (await browser.newContext({ viewport: { width: 1280, height: 720 }, serviceWorkers: 'block' })).newPage();
  // the thumbnail is the track's own opening shot (its composed hero view), with the HUD hidden;
  // a track with no opening shot, or with `thumb`, gets the fly-camera angle instead
  const def = TRACKS.find(t => t.id === id), hero = def?.intro?.length && typeof def.thumb !== 'object';
  await page.goto(`http://127.0.0.1:${port}/?track=${id}&auto=1&q=ultra&seed=4${hero ? '' : '&intro=0&fly=1'}`, { waitUntil: 'load' });
  await page.waitForFunction(hero ? 'window.BK && BK.race' : 'window.BK && BK.fly && BK.race', null, { timeout: 30000 });
  if (hero) {
    await page.addStyleTag({ content: '#ui { visibility: hidden !important; }' });
    await page.evaluate('BK.gfx.fixedScale = true');
    await page.waitForTimeout(Math.min(1500, (def.intro[0].dur ?? 3) * 450));
  } else {
    await page.evaluate(`(() => { const tr = BK.race.track, d = tr.def.thumb && typeof tr.def.thumb === 'object' ? tr.def.thumb : null; BK.gfx.fixedScale = true;
      Object.assign(BK.fly, d ? { s: tr.sAtCp(d.at ?? 0), lat: d.lat ?? 10, h: d.h ?? 12, back: d.back ?? 0, look: d.look ?? 34 } : { s: tr.length * 0.44, lat: 13, h: 15, back: 0, look: 34 }); })()`);
    await page.waitForTimeout(2600);
  }
  const png = `/tmp/bk-thumb-${id}.png`; await page.screenshot({ path: png });
  execFileSync('magick', [png, '-resize', '640x360', '-quality', '82', resolve(ROOT, `assets/tracks/${id}.webp`)]);
  console.log('thumb:', id); await page.close();
}
await browser.close(); server.close();
