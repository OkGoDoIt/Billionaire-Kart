/* World Build B census (#59): loads each module track's world and reports
   geometry/instanced triangle totals via the same hook method as
   tools/world-shots.mjs, so before/after numbers are comparable.
   Usage: node tools/world-census.mjs [trackIdx...]  (default 2 3 4) */
import http from 'http';
import { readFile } from 'fs/promises';
import { extname, join, normalize } from 'path';
import { fileURLToPath } from 'url';
import puppeteer from 'puppeteer';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const TRACKS = process.argv.slice(2).map(Number).filter(n => Number.isFinite(n));
if (!TRACKS.length) TRACKS.push(2, 3, 4);
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.webmanifest': 'application/manifest+json', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp' };
const HOOK = `\n;(() => { window.__census = () => { const sc = (typeof scene !== 'undefined') ? scene : null; if (!sc) return null; let geo = 0, inst = 0, objs = 0;
  sc.traverse(o => { objs++; const g = o.geometry; if (!g) return; const cnt = g.index ? g.index.count : (g.attributes.position ? g.attributes.position.count : 0); const dr = g.drawRange ? Math.min(g.drawRange.count, cnt) : cnt; const tris = Math.floor(dr / 3); if (o.isInstancedMesh) inst += tris * o.count; else geo += tris; });
  return { geoTris: geo, instTris: inst, totalTris: geo + inst, objects: objs }; }; })();\n`;
let gameJs = null;
const server = http.createServer(async (req, res) => {
  try {
    let p = normalize(join(ROOT, decodeURIComponent(new URL(req.url, 'http://x').pathname)));
    if (!p.startsWith(ROOT)) { res.writeHead(403); return res.end(); }
    if (p.endsWith('/')) p += 'index.html';
    if (p.endsWith('game.js')) {
      if (!gameJs) { gameJs = await readFile(p, 'utf-8'); gameJs += HOOK; }
      res.writeHead(200, { 'Content-Type': 'text/javascript; charset=utf-8' });
      return res.end(gameJs);
    }
    const data = await readFile(p);
    res.writeHead(200, { 'Content-Type': MIME[extname(p)] || 'application/octet-stream' });
    res.end(data);
  } catch { res.writeHead(404); res.end('nf'); }
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const url = `http://127.0.0.1:${server.address().port}/index.html`;
const threeCode = await readFile(join(ROOT, 'tools', 'vendor', 'three.module.js'), 'utf-8');
const addonCache = new Map();
const browser = await puppeteer.launch({ headless: 'new', protocolTimeout: 900000, args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--enable-unsafe-swiftshader', '--use-angle=swiftshader', '--mute-audio'] });
const page = await browser.newPage();
await page.setViewport({ width: 1024, height: 640 });
await page.evaluateOnNewDocument(() => {
  try { localStorage.setItem('bk-quality', 'low'); } catch (e) { }
  if (navigator.serviceWorker) navigator.serviceWorker.register = () => Promise.reject(new Error('census: sw disabled'));
});
await page.setRequestInterception(true);
page.on('request', async r => {
  const u = r.url(), marker = '/examples/jsm/';
  if (u.includes(marker)) {
    const rel = u.split(marker)[1].split('?')[0];
    try {
      if (!addonCache.has(rel)) addonCache.set(rel, await readFile(join(ROOT, 'tools', 'vendor', 'addons', rel), 'utf-8'));
      r.respond({ status: 200, contentType: 'text/javascript; charset=utf-8', headers: { 'Access-Control-Allow-Origin': '*' }, body: addonCache.get(rel) });
    } catch { r.respond({ status: 404, body: 'addon not vendored: ' + rel }); }
  } else if (u.includes('cdn.jsdelivr.net/npm/three@')) {
    r.respond({ status: 200, contentType: 'text/javascript; charset=utf-8', headers: { 'Access-Control-Allow-Origin': '*' }, body: threeCode });
  } else r.continue();
});
await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 120000 });
await page.waitForFunction(() => window.BK && document.querySelectorAll('.racer-tile').length === 17, { timeout: 240000, polling: 2000 });
const sleep = ms => new Promise(r => setTimeout(r, ms));
for (const t of TRACKS) {
  await page.evaluate(tt => window.BK.start(0, tt), t);
  await page.waitForFunction(() => window.BK.state().state === 'countdown', { timeout: 300000, polling: 2000 });
  await sleep(3000);
  const c = await page.evaluate(() => window.__census());
  console.log('track', t, JSON.stringify(c));
  // back to menu for the next world build
  await page.evaluate(() => { location.reload(); }).catch(() => {});
  await page.waitForFunction(() => window.BK && document.querySelectorAll('.racer-tile').length === 17, { timeout: 240000, polling: 2000 }).catch(() => {});
}
await browser.close();
server.close();
