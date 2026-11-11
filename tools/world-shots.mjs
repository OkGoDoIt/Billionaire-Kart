/* World Build B screenshot harness (#59).
   Usage: node tools/world-shots.mjs <outSubdir> [shotName...]
   FIXED framings on the module tracks (2=Datacenter, 3=Waters, 4=White House —
   TRACKS order in game.js): autopilot advances the player a fixed number of
   spline samples from the start, then the shot is taken. Same framings
   before/after the world build so the pair is comparable.
   Quality: captured at the CI 'low' preset throughout (the bot-gate preset).
   Flipping to 'high' renders a white frame + WeakMap pageerror spam under
   SwiftShader here (probe, Nov 11) — do not flip.
   Census hook: appended to the served game.js; counts geometry triangles the
   same way tools/art-shots.mjs does (draw-range/index aware) plus instanced
   totals, so before/after numbers are comparable. */
import http from 'http';
import { readFile, mkdir, appendFile } from 'fs/promises';
import { extname, join, normalize } from 'path';
import { fileURLToPath } from 'url';
import puppeteer from 'puppeteer';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const OUTSUB = process.argv[2] || 'after';
const ONLY = process.argv.slice(3);
const OUT = join(ROOT, 'screenshots', 'pr-world-b', OUTSUB);
await mkdir(OUT, { recursive: true });

/* [trackIdx, advanceSamples, name, w, h, timescale] */
const SHOTS = [
  [2, 30, 'datacenter-start', 1280, 800, 3],
  [2, 130, 'datacenter-hall', 1280, 800, 3],
  [2, 470, 'datacenter-lake', 1280, 800, 12],
  [2, 30, 'datacenter-mobile', 932, 430, 3],
  [2, 165, 'datacenter-towers', 1280, 800, 3],
  [3, 60, 'waters-start', 1280, 800, 3],
  [3, 430, 'waters-causeway', 1280, 800, 12],
  [3, 60, 'waters-mobile', 932, 430, 3],
  [4, 30, 'whitehouse-start', 1280, 800, 3],
  [4, 480, 'whitehouse-monument', 1280, 800, 12],
  [4, 30, 'whitehouse-mobile', 932, 430, 3],
];

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.webmanifest': 'application/manifest+json', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp' };
const HOOK = `\n;(() => { let f = 0; const tick = () => { window.__frames = ++f; requestAnimationFrame(tick); }; requestAnimationFrame(tick);
window.__census = () => { const sc = (typeof scene !== 'undefined') ? scene : null; if (!sc) return null; let geo = 0, inst = 0, objs = 0;
  sc.traverse(o => { objs++; const g = o.geometry; if (!g) return; const dr = g.drawRange ? Math.min(g.drawRange.count, g.index ? g.index.count : (g.attributes.position ? g.attributes.position.count : 0)) : (g.index ? g.index.count : (g.attributes.position ? g.attributes.position.count : 0)); const tris = Math.floor((g.index ? dr : dr) / (g.index ? 3 : 3)); if (o.isInstancedMesh) inst += tris * o.count; else geo += tris; });
  return { geoTris: geo, instTris: inst, totalTris: geo + inst, objects: objs }; }; })();\n`;
let gameJs = null;
async function serveJs(p, res) {
  if (p.endsWith('game.js')) {
    if (!gameJs) { gameJs = await readFile(p, 'utf-8'); gameJs += HOOK; }
    res.writeHead(200, { 'Content-Type': 'text/javascript; charset=utf-8' });
    return res.end(gameJs);
  }
  const data = await readFile(p);
  res.writeHead(200, { 'Content-Type': MIME[extname(p)] || 'application/octet-stream' });
  res.end(data);
}
const server = http.createServer(async (req, res) => {
  try {
    let p = normalize(join(ROOT, decodeURIComponent(new URL(req.url, 'http://x').pathname)));
    if (!p.startsWith(ROOT)) { res.writeHead(403); return res.end(); }
    if (p.endsWith('/')) p += 'index.html';
    await serveJs(p, res);
  } catch { res.writeHead(404); res.end('nf'); }
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const url = `http://127.0.0.1:${server.address().port}/index.html`;

const threeCode = await readFile(join(ROOT, 'tools', 'vendor', 'three.module.js'), 'utf-8');
const addonCache = new Map();
const browser = await puppeteer.launch({ headless: 'new', protocolTimeout: 900000, args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--enable-unsafe-swiftshader', '--use-angle=swiftshader', '--mute-audio'] });
const errors = [];
async function newPage(vp) {
  const page = await browser.newPage();
  await page.setViewport(vp);
  await page.evaluateOnNewDocument(() => {
    try { localStorage.setItem('bk-quality', 'low'); } catch (e) { }
    if (navigator.serviceWorker) navigator.serviceWorker.register = () => Promise.reject(new Error('shots: sw disabled'));
  });
  page.on('pageerror', e => errors.push(e.message));
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
  return page;
}
const sleep = ms => new Promise(r => setTimeout(r, ms));

for (const [track, advance, name, w, h, ts] of SHOTS) {
  if (ONLY.length && !ONLY.includes(name)) continue;
  const t0 = Date.now();
  let page;
  try {
    page = await newPage({ width: w, height: h });
    await page.evaluate(tt => window.BK.start(0, tt), track);
    await page.waitForFunction(() => window.BK.state().state === 'countdown', { timeout: 300000, polling: 2000 });
    await page.evaluate(t => { window.BK.skipCountdown(); window.BK.autopilot(true); window.BK.setTimescale(t); }, ts);
    await page.waitForFunction(a => { const s = window.BK.state(); return s.state === 'racing' && s.player && s.player.continuous >= a; }, { timeout: 1500000, polling: 4000 }, advance);
    await page.evaluate(() => window.BK.setTimescale(1));
    const f0 = await page.evaluate(() => window.__frames || 0);
    await page.waitForFunction(f => (window.__frames || 0) > f + 4, { timeout: 240000, polling: 1000 }, f0).catch(() => {});
    await sleep(400);
    const census = await page.evaluate(() => window.__census());
    await page.screenshot({ path: join(OUT, name + '.png') });
    console.log('shot', name, 'track', track, 'in', Math.round((Date.now() - t0) / 1000) + 's; census:', JSON.stringify(census));
    await page.close();
  } catch (e) { console.log('FAILED', name, e.message.split('\n')[0]); if (page) await page.close().catch(() => {}); }
}
console.log('errors:', errors.length ? errors.slice(0, 8) : 'none');
await browser.close();
server.close();
