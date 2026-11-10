/* Wiring proof harness: races every wired module track (indices 2-11)
 * headlessly. Pattern follows tracks/proof-tracks.mjs: fresh page per track
 * (SW disabled, three.js intercepted from tools/vendor), BK.start(0, idx),
 * skip countdown, autopilot at 3x, sample the player kart at race t=4s and
 * t=11s, assert real progress + zero console/page errors, save one 1280x800
 * screenshot per track into screenshots/pr-wiring/. Also asserts the menu
 * exposes exactly 12 track cards (2 built-in + 10 wired). */
import http from 'http';
import { readFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { extname, join, normalize } from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';
const puppeteer = createRequire(new URL('./package.json', import.meta.url))('puppeteer');

const ROOT = fileURLToPath(new URL('..', import.meta.url));
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

const vendorDir = join(ROOT, 'tools', 'vendor');
const threePath = join(vendorDir, 'three.module.js');
if (!existsSync(threePath)) throw new Error('tools/vendor/three.module.js missing');
const threeCode = await readFile(threePath, 'utf-8');
// Same interception as tools/bot-test.mjs: three/addons modules are vendored
// per-path — serving three.module.js for an addons URL breaks the post chain.
const addonCache = new Map();
const intercept = p => p.on('request', async r => {
  const u = r.url(), marker = '/examples/jsm/';
  if (u.includes(marker)) {
    const rel = u.split(marker)[1].split('?')[0];
    try {
      if (!addonCache.has(rel)) addonCache.set(rel, await readFile(join(vendorDir, 'addons', rel), 'utf-8'));
      r.respond({ status: 200, contentType: 'text/javascript; charset=utf-8', headers: { 'Access-Control-Allow-Origin': '*' }, body: addonCache.get(rel) });
    } catch { r.respond({ status: 404, body: 'addon not vendored: ' + rel }); }
  } else if (u.includes('cdn.jsdelivr.net/npm/three@')) {
    r.respond({ status: 200, contentType: 'text/javascript; charset=utf-8', headers: { 'Access-Control-Allow-Origin': '*' }, body: threeCode });
  } else r.continue();
});

const TRACKS = [
  { idx: 2, id: 'datacenter', name: 'AI Datacenter GP' },
  { idx: 3, id: 'waters', name: 'International Waters GP' },
  { idx: 4, id: 'whitehouse', name: 'White House GP' },
  { idx: 5, id: 'metaverse', name: 'Metaverse Plaza GP' },
  { idx: 6, id: 'wework', name: 'WeWork Memorial GP' },
  { idx: 7, id: 'burningman', name: 'Burning Man GP' },
  { idx: 8, id: 'bahamas', name: 'Bahamas Crypto GP' },
  { idx: 9, id: 'bliss', name: 'Bliss GP' },
  { idx: 10, id: 'tunnel', name: 'Boring Tunnel GP' },
  { idx: 11, id: 'davos', name: 'Davos Circuit' },
];
const OUT = join(ROOT, 'screenshots', 'pr-wiring');
await mkdir(OUT, { recursive: true });

const launch = () => puppeteer.launch({
  headless: 'new',
  args: ['--no-sandbox', '--disable-setuid-sandbox', '--enable-unsafe-swiftshader', '--use-angle=swiftshader', '--mute-audio', '--window-size=1280,800'],
});
let browser = await launch();

// menu check: 12 track cards, data-track 0..11
{
  const ctx = await browser.createBrowserContext();
  const page = await ctx.newPage();
  await page.setRequestInterception(true);
  intercept(page);
  await page.evaluateOnNewDocument(() => { if (navigator.serviceWorker) navigator.serviceWorker.register = () => Promise.reject(new Error('proof: SW disabled')); });
  await page.goto(url, { waitUntil: 'load', timeout: 120000 });
  await page.waitForFunction(() => window.BK && document.querySelectorAll('.racer-tile').length === 17, { timeout: 90000 });
  const cards = await page.evaluate(() => [...document.querySelectorAll('.track-card')].map(b => ({ i: +b.dataset.track, name: b.querySelector('.track-name').textContent })));
  console.log('track cards:', cards.map(c => `${c.i}:${c.name}`).join(' | '));
  if (cards.length !== 12 || cards.some((c, j) => c.i !== j)) throw new Error(`expected 12 cards data-track 0..11, got ${JSON.stringify(cards)}`);
  await ctx.close();
}

const ONLY = process.env.ONLY ? process.env.ONLY.split(',').map(Number) : null;
let failures = 0;
for (const tr of TRACKS) {
  if (ONLY && !ONLY.includes(tr.idx)) continue;
  const errors = [];
  // Fresh browser per track: one long-lived SwiftShader browser process
  // accumulates GPU/renderer state across many WebGL pages and eventually
  // dies mid-run (observed: connection closed after ~7 tracks).
  try { await browser.close(); } catch { }
  browser = await launch();
  const ctx = await browser.createBrowserContext();
  const page = await ctx.newPage();
  await page.setViewport({ width: 1280, height: 800 });
  await page.setRequestInterception(true);
  intercept(page);
  page.on('console', m => { if (m.type() === 'error') errors.push(`[console] ${m.text()}`); });
  page.on('pageerror', e => errors.push(`[pageerror] ${e.message}`));
  page.on('requestfailed', r => { if (!r.url().includes('sw.js')) errors.push(`[requestfailed] ${r.url()}`); });
  await page.evaluateOnNewDocument(() => { if (navigator.serviceWorker) navigator.serviceWorker.register = () => Promise.reject(new Error('proof: SW disabled')); });
  try {
    await page.goto(url, { waitUntil: 'load', timeout: 120000 });
    await page.waitForFunction(() => window.BK && document.querySelectorAll('.racer-tile').length === 17, { timeout: 90000 });
    await page.evaluate(i => { BK.start(0, i); BK.skipCountdown(); BK.autopilot(true); BK.setTimescale(3); }, tr.idx);
    await page.waitForFunction(() => BK.state().state === 'racing', { timeout: 30000, polling: 400 });
    const waitT = t => page.waitForFunction(tt => BK.state().raceTime >= tt, { timeout: 300000, polling: 500 }, t);
    await waitT(4);
    const s3 = await page.evaluate(() => BK.state());
    await waitT(11);
    const s7 = await page.evaluate(() => BK.state());
    await page.screenshot({ path: join(OUT, `${tr.id}.png`) });
    const prog = s7.player.continuous - s3.player.continuous;
    const finite = [s7.player, ...s7.karts].every(k => Number.isFinite(k.continuous));
    console.log(`${tr.name} (idx ${tr.idx}): t4 cont=${s3.player.continuous.toFixed(0)} t11 cont=${s7.player.continuous.toFixed(0)} progress=${prog.toFixed(0)} rank=${s7.player.rank} speed=${s7.player.speed.toFixed(1)} errors=${errors.length}`);
    if (!(prog > 85)) throw new Error(`player barely progressed (${prog.toFixed(0)} samples in 7 race-seconds)`);
    if (!finite) throw new Error('non-finite kart state');
    if (errors.length) throw new Error('page errors: ' + errors.join(' | '));
    console.log(`  ✓ screenshot screenshots/pr-wiring/${tr.id}.png`);
  } catch (e) {
    failures++;
    console.error(`  ✗ ${tr.name}: ${e.message}`);
    if (errors.length) console.error('    errors:', errors.join(' | '));
  }
  await ctx.close();
}
await browser.close();
server.close();
if (failures) { console.error(`PROOF FAILED for ${failures} track(s)`); process.exit(1); }
console.log('PROOF PASSED: all 10 wired tracks race clean.');
