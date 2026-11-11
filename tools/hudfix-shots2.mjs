/* HUD centre-clear (#48) + axis sticks (#49) screenshots & probes — LEAN version:
   ONE mobile page boot serves every scheme (scheme switches via the pause menu,
   viewport resizes in place), plus one desktop boot. Fewer page loads = far less
   exposure to shared-VM contention than booting per section. */
import http from 'http';
import { readFile, mkdir } from 'fs/promises';
import { extname, join, normalize } from 'path';
import { fileURLToPath } from 'url';
import puppeteer from 'puppeteer';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const OUT = join(ROOT, 'screenshots', 'pr-hudfix');
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
const intercept = p => p.on('request', async r => {
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
const errors = [];
const fails = [];
const check = (name, ok, extra = '') => { console.log((ok ? '  ✓ ' : '  ✗ FAIL ') + name + (extra ? ' — ' + extra : '')); if (!ok) fails.push(name); };
const browser = await puppeteer.launch({ headless: 'new', protocolTimeout: 900000, args: ['--no-sandbox', '--disable-setuid-sandbox', '--enable-unsafe-swiftshader', '--use-angle=swiftshader', '--mute-audio'] });

async function newPage(vp) {
  const page = await browser.newPage();
  await page.setViewport(vp);
  await page.evaluateOnNewDocument(() => { try { localStorage.setItem('bk-quality', 'low'); } catch (e) { } });
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
  await page.setRequestInterception(true);
  intercept(page);
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 180000 });
  await page.waitForFunction(() => window.BK && document.querySelectorAll('.racer-tile').length === 17, { timeout: 420000, polling: 2000 });
  return page;
}

const fire = (page, type, x, y, id) => page.evaluate((t, cx, cy, pid) => {
  document.getElementById('stick-layer').dispatchEvent(new PointerEvent(t, { pointerId: pid, clientX: cx, clientY: cy, bubbles: true, pointerType: 'touch', isPrimary: true }));
}, type, x, y, id);

const nubOffsets = page => page.evaluate(() => {
  const parse = el => {
    if (!el || el.style.display === 'none') return null;
    const nub = el.firstElementChild;
    const cs = getComputedStyle(nub).transform;
    const m = cs && cs.match(/matrix\(([^)]+)\)/);
    const r = el.getBoundingClientRect();
    let off = null;
    if (m) { const p = m[1].split(',').map(Number); off = { x: Math.round(p[4] + nub.offsetWidth / 2), y: Math.round(p[5] + nub.offsetHeight / 2) }; }
    return { cls: el.className, w: Math.round(r.width), h: Math.round(r.height), nub: off };
  };
  return { a: parse(document.getElementById('stick-a')), b: parse(document.getElementById('stick-b')) };
});

const hudProbe = page => page.evaluate(() => {
  const R = s => { const el = document.querySelector(s); if (!el) return null; const r = el.getBoundingClientRect(); return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height), bottom: Math.round(r.bottom), ow: el.offsetWidth, oh: el.offsetHeight }; };
  const items = [...document.querySelectorAll('#race-feed .feed-item')].map(e => { const r = e.getBoundingClientRect(); return { cls: e.className, y: Math.round(r.y), bottom: Math.round(r.bottom), text: e.textContent.slice(0, 44) }; });
  return { vw: innerWidth, vh: innerHeight, slot: R('#item-slot'), left: R('#hud-left'), items, icon: document.querySelector('#item-icon').textContent };
});

async function switchScheme(page, scheme) {
  await page.tap('#btn-pause');
  await page.waitForFunction(() => window.BK && BK.state().paused, { timeout: 60000 }).catch(() => {});
  await page.evaluate(s => { document.querySelector(`#screen-pause .scheme-btn[data-scheme="${s}"]`).click(); }, scheme);
  await sleep(300);
  await page.tap('#btn-resume');
  await sleep(500);
}

/* ================= MOBILE: one boot, all schemes ================= */
try {
  const page = await newPage({ width: 932, height: 430, isMobile: true, hasTouch: true, deviceScaleFactor: 1 });
  await page.evaluate(() => { document.querySelector('#screen-menu [data-scheme="dualstick"]').click(); BK.start(0, 0); BK.setTimescale(3); BK.skipCountdown(); });
  await sleep(500);
  await page.evaluate(() => { BK.autopilot(true); BK.grant(); });
  await page.waitForFunction(() => document.querySelector('#race-feed .feed-item.desc'), { timeout: 240000, polling: 1000 }).catch(() => {});
  await page.evaluate(() => { BK.bark(); });
  await sleep(800); // let the slot's landing pulse settle before measuring its rect

  const p = await hudProbe(page);
  console.log('dualstick landscape probe:', JSON.stringify(p));
  check('feed has entries', p.items.length >= 1, `${p.items.length} entries`);
  check('feed capped at 2', p.items.length <= 2);
  check('all feed entries in top zone (bottom < 35% vh)', p.items.every(i => i.bottom < p.vh * 0.35), JSON.stringify(p.items.map(i => i.bottom)));
  check('desc entry present with gold styling', p.items.some(i => i.cls.includes('desc')));
  check('slot in top-left corner (below pos block)', p.slot.x <= 24 && p.slot.y >= p.left.bottom - 6 && p.slot.y < p.vh * 0.45, JSON.stringify(p.slot));
  check('slot layout size >= 56px', p.slot.ow >= 56 && p.slot.oh >= 56, `${p.slot.ow}x${p.slot.oh}`);
  check('item held in slot', p.icon !== '·', p.icon);

  // Dual Stick landscape drags
  await fire(page, 'pointerdown', 200, 280, 61);
  await fire(page, 'pointermove', 262, 322, 61);
  await fire(page, 'pointerdown', 730, 280, 62);
  await fire(page, 'pointermove', 688, 188, 62);
  let st = await nubOffsets(page);
  console.log('dualstick sticks mid-drag:', JSON.stringify(st));
  check('DS landscape: left horizontal track, nub locked (y=0, x>0)', !!st.a && st.a.cls.includes('axis-x') && st.a.w > st.a.h * 2 && !!st.a.nub && st.a.nub.y === 0 && st.a.nub.x > 0, JSON.stringify(st.a));
  check('DS landscape: right vertical track, nub locked (x=0, y<0)', !!st.b && st.b.cls.includes('axis-y') && st.b.h > st.b.w * 2 && !!st.b.nub && st.b.nub.x === 0 && st.b.nub.y < 0, JSON.stringify(st.b));
  await page.screenshot({ path: join(OUT, 'dualstick-axis-mobile-landscape.png') });
  await fire(page, 'pointerup', 262, 322, 61);
  await fire(page, 'pointerup', 688, 188, 62);
  await sleep(500);
  const gone = await page.evaluate(() => ['stick-a', 'stick-b'].every(id => document.getElementById(id).style.display === 'none'));
  check('stick bases hidden after release (no parked base)', gone);

  // Portrait: same page, resized — scheme + shapes persist
  await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 1 });
  await sleep(600);
  await fire(page, 'pointerdown', 100, 600, 71);
  await fire(page, 'pointermove', 152, 642, 71);
  await fire(page, 'pointerdown', 290, 600, 72);
  await fire(page, 'pointermove', 248, 508, 72);
  st = await nubOffsets(page);
  console.log('dualstick portrait sticks:', JSON.stringify(st));
  check('DS portrait: left horizontal track + locked nub', !!st.a && st.a.cls.includes('axis-x') && !!st.a.nub && st.a.nub.y === 0, JSON.stringify(st.a));
  check('DS portrait: right vertical track + locked nub', !!st.b && st.b.cls.includes('axis-y') && !!st.b.nub && st.b.nub.x === 0, JSON.stringify(st.b));
  await page.screenshot({ path: join(OUT, 'dualstick-axis-mobile-portrait.png') });
  await fire(page, 'pointerup', 152, 642, 71);
  await fire(page, 'pointerup', 248, 508, 72);

  // Pedal & Stick via pause-menu switch (also proves mid-race re-shaping)
  await page.setViewport({ width: 932, height: 430, isMobile: true, hasTouch: true, deviceScaleFactor: 1 });
  await sleep(400);
  await switchScheme(page, 'sticks2');
  await fire(page, 'pointerdown', 200, 280, 81);
  await fire(page, 'pointermove', 258, 318, 81);
  await fire(page, 'pointerdown', 730, 280, 82);
  await fire(page, 'pointermove', 700, 196, 82);
  st = await nubOffsets(page);
  console.log('sticks2 sticks mid-drag:', JSON.stringify(st));
  check('P&S: steer is horizontal track, nub locked', !!st.a && st.a.cls.includes('axis-x') && !!st.a.nub && st.a.nub.y === 0, JSON.stringify(st.a));
  check('P&S: pedal is vertical track, nub locked', !!st.b && st.b.cls.includes('axis-y') && !!st.b.nub && st.b.nub.x === 0, JSON.stringify(st.b));
  await page.screenshot({ path: join(OUT, 'pedalstick-axis-mobile-landscape.png') });
  await fire(page, 'pointerup', 258, 318, 81);
  await fire(page, 'pointerup', 700, 196, 82);

  // Thumbstick: main stick stays a free 2D circle
  await switchScheme(page, 'stick1');
  await fire(page, 'pointerdown', 700, 215, 91);
  await fire(page, 'pointermove', 745, 175, 91);
  st = await nubOffsets(page);
  console.log('thumbstick stick mid-drag:', JSON.stringify(st));
  check('Thumbstick: main keeps the circle (no axis class)', !!st.a && !st.a.cls.includes('axis-x') && !st.a.cls.includes('axis-y'), st.a && st.a.cls);
  check('Thumbstick: nub moves diagonally (both axes)', !!st.a && !!st.a.nub && st.a.nub.x !== 0 && st.a.nub.y !== 0, JSON.stringify(st.a && st.a.nub));
  await page.screenshot({ path: join(OUT, 'thumbstick-circle-mobile-landscape.png') });
  await fire(page, 'pointerup', 745, 175, 91);
  await page.close();
} catch (e) { console.log('MOBILE SECTION ERROR:', e.message); fails.push('mobile section error'); }

/* ================= DESKTOP: classic layout, same anchoring ================= */
try {
  const page = await newPage({ width: 1280, height: 800, deviceScaleFactor: 1 });
  await page.evaluate(() => { BK.start(0, 0); BK.setTimescale(3); BK.skipCountdown(); });
  await sleep(500);
  await page.evaluate(() => { BK.autopilot(true); BK.grant(); });
  await page.waitForFunction(() => document.querySelector('#race-feed .feed-item.desc'), { timeout: 240000, polling: 1000 }).catch(() => {});
  await page.evaluate(() => { BK.bark(); });
  await sleep(800);
  const p = await hudProbe(page);
  console.log('desktop probe:', JSON.stringify(p));
  check('desktop: feed in top zone', p.items.length >= 1 && p.items.every(i => i.bottom < p.vh * 0.3), JSON.stringify(p.items.map(i => i.bottom)));
  check('desktop: slot top-left corner below pos block', p.slot.x <= 24 && p.slot.y >= p.left.bottom - 6 && p.slot.y < 200, JSON.stringify(p.slot));
  await page.screenshot({ path: join(OUT, 'race-hud-desktop.png') });
  await page.close();
} catch (e) { console.log('DESKTOP SECTION ERROR:', e.message); fails.push('desktop section error'); }

await browser.close();
server.close();
console.log(errors.length ? 'PAGE ERRORS:\n' + errors.join('\n') : 'no page errors');
if (errors.length) fails.push('page errors');
console.log(fails.length ? 'PROBE FAILURES: ' + fails.join(' | ') : 'ALL PROBES PASSED');
console.log('done ->', OUT);
