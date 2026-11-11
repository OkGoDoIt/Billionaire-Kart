/* Desktop-only HUD probe + screenshot (#48 classic layout) and the item slot's
   LAYOUT coordinates (transform-immune: the slot's has-item pop/pulse animation
   scales its rendered rect, so corner placement is asserted on offsetLeft/Top). */
import http from 'http';
import { readFile, mkdir } from 'fs/promises';
import { extname, join, normalize } from 'path';
import { fileURLToPath } from 'url';
import puppeteer from 'puppeteer';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const OUT = join(ROOT, 'screenshots', 'pr-hudfix');
await mkdir(OUT, { recursive: true });
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.webmanifest': 'application/manifest+json', '.png': 'image/png', '.webp': 'image/webp' };
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
await page.setViewport({ width: 1280, height: 800, deviceScaleFactor: 1 });
await page.evaluateOnNewDocument(() => { try { localStorage.setItem('bk-quality', 'low'); } catch (e) { } });
const errors = [];
page.on('pageerror', e => errors.push('pageerror: ' + e.message));
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
await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 180000 });
await page.waitForFunction(() => window.BK && document.querySelectorAll('.racer-tile').length === 17, { timeout: 600000, polling: 2000 });
await page.evaluate(() => { BK.start(0, 0); BK.setTimescale(3); BK.skipCountdown(); });
await sleep(500);
await page.evaluate(() => { BK.autopilot(true); BK.grant(); });
await page.waitForFunction(() => document.querySelector('#race-feed .feed-item.desc'), { timeout: 300000, polling: 1000 }).catch(() => {});
await page.evaluate(() => { BK.bark(); });
await sleep(800);
const p = await page.evaluate(() => {
  const slot = document.querySelector('#item-slot'), left = document.querySelector('#hud-left');
  const items = [...document.querySelectorAll('#race-feed .feed-item')].map(e => { const r = e.getBoundingClientRect(); return { cls: e.className, y: Math.round(r.y), bottom: Math.round(r.bottom) }; });
  return {
    vw: innerWidth, vh: innerHeight, items,
    slotLayout: { left: slot.offsetLeft, top: slot.offsetTop, w: slot.offsetWidth, h: slot.offsetHeight },
    posBlockBottom: left.offsetTop + left.offsetHeight,
    icon: document.querySelector('#item-icon').textContent,
  };
});
console.log('desktop probe:', JSON.stringify(p));
const fails = [];
const check = (n, ok, x = '') => { console.log((ok ? '  ✓ ' : '  ✗ FAIL ') + n + (x ? ' — ' + x : '')); if (!ok) fails.push(n); };
check('desktop: feed entries present, capped at 2', p.items.length >= 1 && p.items.length <= 2, `${p.items.length}`);
check('desktop: feed in top zone (bottom < 30% vh)', p.items.every(i => i.bottom < p.vh * 0.3), JSON.stringify(p.items.map(i => i.bottom)));
check('desktop: desc entry present (gold)', p.items.some(i => i.cls.includes('desc')));
check('desktop: slot layout corner (left<=24, below pos block, top<200)', p.slotLayout.left <= 24 && p.slotLayout.top >= p.posBlockBottom - 6 && p.slotLayout.top < 200, JSON.stringify(p.slotLayout));
check('desktop: slot layout size >= 56px', p.slotLayout.w >= 56 && p.slotLayout.h >= 56, `${p.slotLayout.w}x${p.slotLayout.h}`);
check('desktop: item held', p.icon !== '·', p.icon);
await page.screenshot({ path: join(OUT, 'race-hud-desktop.png') });
await browser.close();
server.close();
console.log(errors.length ? 'PAGE ERRORS: ' + errors.join(' | ') : 'no page errors');
console.log(fails.length ? 'PROBE FAILURES: ' + fails.join(' | ') : 'ALL DESKTOP PROBES PASSED');
