/* tools/itemfx-shots2.mjs — supplementary PR captures for the item world-FX
   pass. The first harness fired on wall-clock sleeps; under SwiftShader the
   game clock crawls (~0.05 game-s per rendered frame), so brief effects were
   missed. This pass POLLS BK.state() and shoots when the effect is actually
   live: leader speed collapse for the Antitrust detonation, raceTime vs the
   1.6 s fuse for the Pink Slip, bailoutT for the Bailout, player pos.y for
   the elevated Mars leak. Same serving + CDN-interception pattern. */
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
await page.evaluateOnNewDocument(() => { if (navigator.serviceWorker) navigator.serviceWorker.register = () => Promise.reject(new Error('shots2: SW disabled')); });
await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 180000 });
await page.waitForFunction(() => window.BK && document.querySelectorAll('.racer-tile').length === 17, { timeout: 240000 });
await page.evaluate(() => document.fonts.ready);
await sleep(500);

const bk = fn => page.evaluate(fn);
const state = () => bk(() => BK.state());
const shot = async name => { await page.screenshot({ path: join(OUT, name) }); console.log('saved', name); };
const startRace = async (track, ts) => {
  await bk((t, s) => { BK.start(0, t); BK.skipCountdown(); BK.autopilot(true); BK.setTimescale(s); }, track, ts);
  for (let i = 0; i < 90; i++) { const st = await state(); if (st.raceTime > 3) break; await sleep(500); }
};
const waitFor = async (fn, tries, gap = 300) => { for (let i = 0; i < tries; i++) { const st = await state(); if (fn(st)) return st; await sleep(gap); } return null; };

/* 1. ANTITRUST detonation: fire the Suit at the leader, watch for the
   leader's speed collapsing (spin-out), then burst-capture the blast. */
await startRace(0, 1);
await waitFor(st => st.player && st.player.rank > 1 && st.player.rank < 8, 40);
await bk(() => { BK.giveItem('blue'); BK.useItem(); });
console.log('antitrust fired');
let boom = null;
for (let i = 0; i < 110 && !boom; i++) {
  const st = await state();
  const others = st.karts.filter(k => k.name !== st.player?.name);
  // a kart that was racing and is now crawling = it got spun (blast caught it)
  if (st.raceTime > 6 && others.some(k => k.speed < 2.5)) boom = st;
  await sleep(280);
}
console.log('antitrust detonation detected:', !!boom);
for (let i = 0; i < 3; i++) { await shot(`antitrust-detonation-${i}.png`); await sleep(300); }

/* 2. PINK SLIP burst: fuse is 1.6 game-s — poll raceTime, shoot across it. */
await startRace(0, 0.5);
const t0 = (await state()).raceTime;
await bk(() => { BK.giveItem('bomb'); BK.useItem(); });
console.log('bomb dropped at raceTime', t0);
await waitFor(st => st.raceTime >= t0 + 1.35, 160, 250);
for (let i = 0; i < 5; i++) { await shot(`pinkslip-burst-${i}.png`); await sleep(220); }

/* 3. MARKET CRASH: slow time first, fire, then rapid-fire frames — the sky
   flash (flashA) lives ~0.4 game-s, the follow arcs ~0.6 game-s. */
await startRace(0, 1);
await waitFor(st => st.raceTime > 6, 60);
await bk(() => BK.setTimescale(0.25));
await bk(() => { BK.giveItem('lightning'); BK.useItem(); });
console.log('market crash fired');
for (let i = 0; i < 8; i++) { await shot(`market-crash-${i}.png`); await sleep(160); }

/* 4. BAILOUT clean: shoot while bailoutT is verifiably active. */
await startRace(0, 1);
await bk(() => { BK.giveItem('bailout'); BK.useItem(); });
const bst = await waitFor(st => st.player && st.player.bailoutT > 3, 80, 250);
console.log('bailout active:', bst ? bst.player.bailoutT : 'NO');
await shot('bailout-beacon-clean.png');
await sleep(500);
await shot('bailout-trail.png');

/* 5. DATA LEAK on Mars elevation: high timescale, poll the player's road
   height until the kart is verifiably on the crest/highland, then drop. */
await startRace(1, 8);
let py = 0, hit = null;
for (let i = 0; i < 380; i++) {
  const st = await state();
  py = st.player?.pos[1] ?? 0;
  if (py > 6.5 && st.raceTime > 5) { hit = st; break; }
  await sleep(1000);
}
console.log('Mars leak: elevation hit =', hit ? hit.player.pos[1] : 'NONE', 'last y =', py);
if (hit) {
  await bk(() => BK.setTimescale(1));
  await bk(() => { BK.giveItem('banana'); BK.useItem(); });
  await sleep(350);
  await shot('leak-puddle-elevated.png');
  await sleep(600);
  await shot('leak-puddle-elevated-2.png');
}

console.log('errors:', errors.length ? errors : 'none');
await browser.close();
server.close();
if (errors.length) { console.error(errors.join('\n')); process.exit(1); }
