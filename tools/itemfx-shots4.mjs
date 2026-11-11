/* tools/itemfx-shots4.mjs — last targeted captures.
   ANTITRUST: fire only when the player is verifiably NOT the leader (so the
   Suit detonates AHEAD of the camera), timescale 0.5 stretches the 0.55 s
   blast across ~8 wall-s; poll for a victim speed collapse, then burst.
   MARS LEAK: threshold lowered to the +6 m switchback shelf (observed road
   height there is ~5.3 with lateral/bank offsets — still 5 m of proof that
   the puddle rides roadYAt instead of sitting at y=0 inside the hill);
   boost-jolt if the autopilot wedges. Same serving/interception pattern. */
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
await page.evaluateOnNewDocument(() => { if (navigator.serviceWorker) navigator.serviceWorker.register = () => Promise.reject(new Error('shots4: SW disabled')); });
await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 180000 });
await page.waitForFunction(() => window.BK && document.querySelectorAll('.racer-tile').length === 17, { timeout: 240000 });
await page.evaluate(() => document.fonts.ready);
await sleep(500);

const bk = fn => page.evaluate(fn);
const state = () => bk(() => BK.state());
const shot = async name => { await page.screenshot({ path: join(OUT, name) }); console.log('saved', name); };

/* 1. ANTITRUST detonation, ahead of the camera */
await bk(() => { BK.start(0, 0); BK.skipCountdown(); BK.autopilot(true); BK.setTimescale(1); });
let ready = null;
for (let i = 0; i < 200; i++) { const st = await state(); if (st.raceTime > 8 && st.player && st.player.rank >= 2 && st.player.rank <= 6) { ready = st; break; } await sleep(400); }
console.log('antitrust ready:', ready ? `rank ${ready.player.rank} t=${ready.raceTime.toFixed(1)}` : 'NO (firing anyway)');
await bk(() => BK.setTimescale(0.5));
const firedAt = (await state()).raceTime;
await bk(() => { BK.giveItem('blue'); BK.useItem(); });
console.log('antitrust fired at raceTime', firedAt);
let boomed = false;
for (let i = 0; i < 300 && !boomed; i++) {
  const st = await state();
  const others = st.karts.filter(k => k.name !== 'Elon'); // racer 0 = the player (BK.state player has no name field)
  // victim of the blast: a kart that was circulating and is now spun/stopped
  if (st.raceTime > firedAt + 0.8 && others.some(k => k.speed < 3)) boomed = true;
  if (st.raceTime > firedAt + 20) break;
  await sleep(200);
}
console.log('antitrust victim collapse detected:', boomed);
for (let i = 0; i < 6; i++) { await shot(`antitrust-boom-${i}.png`); await sleep(450); }

/* 2. MARS elevated leak (switchback shelf) */
await bk(() => { BK.start(0, 1); BK.skipCountdown(); BK.autopilot(true); BK.setTimescale(2.5); });
let hit = null, slowPolls = 0;
for (let i = 0; i < 400; i++) {
  const st = await state();
  const p = st.player; if (!p) { await sleep(1000); continue; }
  if (p.pos[1] > 4.5 && st.raceTime > 5) { hit = p.pos[1]; break; }
  if (p.speed < 1) { if (++slowPolls >= 10) { slowPolls = 0; await bk(() => { BK.giveItem('boost'); BK.useItem(); }); console.log('mars: boost jolt at cont', p.continuous.toFixed(0), 'y', p.pos[1].toFixed(2)); } } else slowPolls = 0;
  await sleep(1000);
}
console.log('Mars leak: hit =', hit);
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
