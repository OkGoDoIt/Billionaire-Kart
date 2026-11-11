/* tools/itemfx-shots3.mjs — final targeted captures: Antitrust detonation
   (spread-capture across the Suit's flight) and the elevated Mars Data Leak
   (moderate timescale so autopilot physics stays stable; progress tracked
   via continuous + max road height). Same serving/interception pattern. */
import http from 'http';
import { readFile, mkdir } from 'fs/promises';
import { extname, join, normalize } from 'path';
import { fileURLToPath } from 'url';
import puppeteer from 'puppeteer';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const OUT = join(ROOT, 'screenshots', 'pr-itemfx');
await mkdir(OUT, { recursive: true });
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.webmanifest': 'application/manifest+json', '.png': 'image/png', '.md': 'text/markdown', '.woff2': 'font/woff2' };
const server = http.createServer(async (req, res) => {
  try {
    let p = normalize(join(ROOT, decodeURIComponent(new URL(req.url, 'http://x').pathname)));
    if (!p.startsWith(ROOT)) { res.writeHead(403); return res.end(); }
    if (p.endsWith('/')) p += 'index.html';
    const data = await readFile(p);
    res.writeHead(200, { 'Content-Type': MIME[extname(p)] || 'application/octet-stream' });
    res.end(data);
  } catch { res.writeHead(404); res.end('nf'); }
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const url = `http://127.0.0.1:${server.address().port}/index.html`;
const threeCode = await readFile(join(ROOT, 'tools', 'vendor', 'three.module.js'), 'utf-8');
const sleep = ms => new Promise(r => setTimeout(r, ms));

const errors = [];
const browser = await puppeteer.launch({
  headless: 'new',
  args: ['--no-sandbox', '--disable-setuid-sandbox', '--enable-unsafe-swiftshader', '--use-angle=swiftshader', '--mute-audio', '--window-size=1280,800'],
});
const page = await browser.newPage();
await page.setViewport({ width: 1280, height: 800 });
await page.setRequestInterception(true);
const addonCache = new Map();
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
page.on('console', m => { if (m.type() === 'error') errors.push(`[console] ${m.text()}`); });
page.on('pageerror', e => errors.push(`[pageerror] ${e.message}`));
page.on('requestfailed', r => { if (!r.url().includes('sw.js')) errors.push(`[requestfailed] ${r.url()}`); });
await page.evaluateOnNewDocument(() => { if (navigator.serviceWorker) navigator.serviceWorker.register = () => Promise.reject(new Error('shots3: SW disabled')); });
await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 180000 });
await page.waitForFunction(() => window.BK && document.querySelectorAll('.racer-tile').length === 17, { timeout: 240000 });
await page.evaluate(() => document.fonts.ready);
await sleep(500);

const bk = fn => page.evaluate(fn);
const state = () => bk(() => BK.state());
const shot = async name => { await page.screenshot({ path: join(OUT, name) }); console.log('saved', name); };

/* 1. ANTITRUST spread-capture */
await bk(() => { BK.start(0, 0); BK.skipCountdown(); BK.autopilot(true); BK.setTimescale(1); });
for (let i = 0; i < 120; i++) { const st = await state(); if (st.raceTime > 5 && st.player && st.player.rank > 1) break; await sleep(500); }
await bk(() => { BK.giveItem('blue'); BK.useItem(); });
console.log('antitrust fired, spread-capturing');
for (let i = 0; i < 16; i++) { await shot(`antitrust-spread-${i}.png`); await sleep(2200); }

/* 2. MARS elevated leak at stable timescale */
await bk(() => { BK.start(0, 1); BK.skipCountdown(); BK.autopilot(true); BK.setTimescale(2.5); });
let maxY = 0, lastCont = 0, stuckPolls = 0, hit = null;
for (let i = 0; i < 460; i++) {
  const st = await state();
  const p = st.player; if (!p) { await sleep(1000); continue; }
  maxY = Math.max(maxY, p.pos[1]);
  if (p.pos[1] > 6.5 && st.raceTime > 5) { hit = p.pos[1]; break; }
  if (Math.abs(p.continuous - lastCont) < 0.5) { if (++stuckPolls === 45) console.log('mars: no continuous progress for ~45 polls at cont', p.continuous); } else stuckPolls = 0;
  lastCont = p.continuous;
  await sleep(1000);
}
console.log('Mars leak: hit =', hit, 'maxY seen =', maxY);
if (hit) {
  await bk(() => BK.setTimescale(1));
  await bk(() => { BK.giveItem('banana'); BK.useItem(); });
  await sleep(350);
  await shot('leak-puddle-elevated.png');
  await sleep(700);
  await shot('leak-puddle-elevated-2.png');
}

console.log('errors:', errors.length ? errors : 'none');
await browser.close();
server.close();
if (errors.length) { console.error(errors.join('\n')); process.exit(1); }
