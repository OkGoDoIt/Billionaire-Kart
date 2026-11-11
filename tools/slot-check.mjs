/* Targeted check (#50): held-item slot + roulette render the new artwork.
   giveItem -> updateItemSlot img; BKFX.roulette with item-shaped objects ->
   spin + land img. Fails on any page error or wrong src. */
import http from 'http';
import { readFile, mkdir } from 'fs/promises';
import { extname, join, normalize } from 'path';
import { fileURLToPath } from 'url';
import puppeteer from 'puppeteer';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const OUT = join(ROOT, 'screenshots', 'pr-menu');
await mkdir(OUT, { recursive: true });
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.webmanifest': 'application/manifest+json', '.png': 'image/png', '.webp': 'image/webp', '.md': 'text/markdown' };
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
const addonCache = new Map();
const browser = await puppeteer.launch({ headless: 'new', protocolTimeout: 900000, args: ['--no-sandbox', '--disable-setuid-sandbox', '--enable-unsafe-swiftshader', '--use-angle=swiftshader', '--mute-audio'] });
const page = await browser.newPage();
await page.setViewport({ width: 1280, height: 800 });
await page.evaluateOnNewDocument(() => { try { localStorage.setItem('bk-quality', 'low'); } catch (e) { } });
const errors = [];
page.on('pageerror', e => errors.push('pageerror: ' + e.message));
page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
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
const sleep = ms => new Promise(r => setTimeout(r, ms));
await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 120000 });
await page.waitForFunction(() => window.BK && document.querySelectorAll('.racer-tile').length === 17, { timeout: 240000, polling: 2000 });

await page.evaluate(() => { BK.start(0, 0); BK.skipCountdown(); });
await page.waitForFunction(() => BK.state().state === 'racing', { timeout: 120000, polling: 500 }).catch(() => console.log('warn: racing state wait timed out (contention), continuing'));

// 1. giveItem -> updateItemSlot must render the artwork img
await page.evaluate(() => BK.giveItem('star'));
await sleep(600);
const slot1 = await page.evaluate(() => { const img = document.querySelector('#item-icon img.slot-ic'); return img ? img.getAttribute('src') : null; });
console.log('slot after giveItem(star):', slot1);

// 2. roulette spin + land must render the landed item's artwork
const spun = await page.evaluate(() => window.BKFX.roulette(
  { img: 'assets/items/blue.webp', name: 'Antitrust Suit' },
  { blue: { img: 'assets/items/blue.webp', name: 'Antitrust Suit' }, star: { img: 'assets/items/star.webp', name: 'Viral Moment' } },
  {}));
console.log('roulette started:', spun);
await sleep(1600);
const slot2 = await page.evaluate(() => { const img = document.querySelector('#item-icon img.slot-ic'); return { src: img ? img.getAttribute('src') : null, name: document.getElementById('item-name').textContent }; });
console.log('slot after roulette land:', JSON.stringify(slot2));
await page.screenshot({ path: join(OUT, 'race-slot.png') });
console.log('shot race-slot.png');

await browser.close();
server.close();
const ok = slot1 === 'assets/items/star.webp' && slot2.src === 'assets/items/blue.webp' && slot2.name === 'Antitrust Suit' && !errors.length;
if (errors.length) console.log('PAGE ERRORS:\n' + errors.join('\n'));
console.log(ok ? 'SLOT CHECK PASS' : 'SLOT CHECK FAIL');
process.exit(ok ? 0 : 1);
