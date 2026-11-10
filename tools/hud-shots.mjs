/* HUD clarity screenshots (PR evidence): item slot + race feed in the
   top-centre stack, fixed top-left cluster, safe-area behaviour (simulated
   Dynamic Island inset), title pill contrast, menu item guide.
   Reuses the bot-test pattern: static server + vendored three.js interception. */
import http from 'http';
import { readFile, mkdir } from 'fs/promises';
import { extname, join, normalize } from 'path';
import { fileURLToPath } from 'url';
import puppeteer from 'puppeteer';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const OUT = join(ROOT, 'screenshots', 'pr-hud-clarity');
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
const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox', '--disable-setuid-sandbox', '--enable-unsafe-swiftshader', '--use-angle=swiftshader', '--mute-audio'] });

async function newPage(vp) {
  const page = await browser.newPage();
  await page.setViewport(vp);
  await page.evaluateOnNewDocument(() => { try { localStorage.setItem('bk-quality', 'low'); } catch (e) { } }); // same CI preset as bot-test: bloom off under SwiftShader
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
  await page.setRequestInterception(true);
  intercept(page);
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 120000 });
  await page.waitForFunction(() => window.BK && document.querySelectorAll('.racer-tile').length === 17, { timeout: 240000, polling: 2000 });
  return page;
}

/* Feed choreography: real grant (roulette -> feed entry w/ desc), a bark, then
   the player fires an Antitrust Suit -> three feed entries live at once, item
   back in the slot via a fresh grant right before the shot. */
async function raceShot(page, name, { safeAreaSim = false } = {}) {
  if (safeAreaSim) await page.evaluate(() => document.documentElement.style.setProperty('--sa-l', '54px'));
  await page.evaluate(() => { BK.start(5, 0); BK.skipCountdown(); });
  await sleep(600);
  await page.evaluate(() => { BK.autopilot(true); BK.grant(); });
  // wait for the roulette to land in the feed (game time runs slow under load)
  await page.waitForFunction(() => document.querySelectorAll('#race-feed .feed-item').length >= 1, { timeout: 90000 }).catch(() => {});
  await page.evaluate(() => { BK.bark(); BK.giveItem('blue'); BK.useItem(); });
  await page.waitForFunction(() => document.querySelectorAll('#race-feed .feed-item').length >= 2, { timeout: 30000 }).catch(() => {});
  await sleep(300);
  await page.evaluate(() => { if (!document.querySelector('#item-icon').textContent.match(/⚖️|💰/)) BK.giveItem('boost'); });
  const probe = await page.evaluate(() => {
    const R = s => { const r = document.querySelector(s).getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height, cx: r.x + r.width / 2, bottom: r.y + r.height }; };
    const slot = R('#item-slot'), feed = R('#race-feed'), left = R('#hud-left');
    const vw = innerWidth, vh = innerHeight;
    const blq = (r) => r.x < vw * 0.25 && r.y + r.h > vh * 0.5; // intersects bottom-left quadrant
    const touchUi = document.body.classList.contains('touch-ui');
    return {
      touchUi,
      feed: [...document.querySelectorAll('#race-feed .feed-item')].map(e => e.textContent),
      itemIcon: document.querySelector('#item-icon').textContent,
      slot, feedBox: feed, left,
      posText: document.querySelector('#pos-big').textContent,
      lapText: document.querySelector('#lap-label').textContent,
      // touch-mode expectations
      slotCentred: Math.abs(slot.cx - vw / 2) < 30, slotTopHalf: slot.y + slot.h < vh * 0.5,
      nothingInfoBottomLeft: !blq(slot) && !blq(feed) && !blq(left),
      // classic-mode expectations
      slotCorner: slot.x <= 24 && vh - slot.bottom <= 24,
      feedAboveSlot: feed.bottom <= slot.y + 2 && Math.abs(feed.x - slot.x) <= 4,
    };
  });
  console.log(name, JSON.stringify(probe, null, 1));
  await page.screenshot({ path: join(OUT, name) });
  return page;
}

/* Pause-menu scheme switch mid-race: layout must follow immediately
   (body.touch-ui persists, item slot stays top-centre, Auto-Gas note joins
   the stack), then resume cleanly. */
async function pauseToggleShot(page, name) {
  await page.tap('#btn-pause');
  await page.waitForFunction(() => BK.state().paused && !document.querySelector('#screen-pause').classList.contains('hidden'), { timeout: 30000 }).catch(() => {});
  const paused = await page.evaluate(() => BK.state().paused && !document.querySelector('#screen-pause').classList.contains('hidden'));
  await page.click('#screen-pause .scheme-btn[data-scheme="autog"]');
  await sleep(300);
  await page.tap('#btn-resume');
  await sleep(700);
  const probe = await page.evaluate(() => {
    const r = document.querySelector('#item-slot').getBoundingClientRect();
    return {
      pausedWas: true, touchUi: document.body.classList.contains('touch-ui'),
      autogNoteVisible: !document.querySelector('#autog-note').classList.contains('hidden'),
      slotCx: r.x + r.width / 2, slotY: r.y, vw: innerWidth,
      slotCentred: Math.abs(r.x + r.width / 2 - innerWidth / 2) < 30,
    };
  });
  console.log(name, 'paused-shown:', paused, JSON.stringify(probe));
  await page.screenshot({ path: join(OUT, name) });
}

async function menuShot(page, name) {
  await page.evaluate(() => document.querySelector('#items-legend').scrollIntoView({ block: 'start' }));
  await sleep(500);
  const rows = await page.evaluate(() => document.querySelectorAll('#items-legend .item-row').length);
  console.log(name, 'legend rows:', rows);
  await page.screenshot({ path: join(OUT, name) });
}

async function titleShot(page, name) {
  await sleep(700);
  const pill = await page.evaluate(() => { const el = document.querySelector('.logo-ribbon'); const cs = getComputedStyle(el); return { color: cs.color, stroke: cs.webkitTextStrokeWidth, text: el.textContent }; });
  console.log(name, 'ribbon:', JSON.stringify(pill));
  await page.screenshot({ path: join(OUT, name) });
}

const SHOTS = {
  // 1. Mobile landscape race — TOUCH layout (slot + feed top-centre, full pos text)
  async mobrace() {
    const pg = await newPage({ width: 932, height: 430, isMobile: true, hasTouch: true, deviceScaleFactor: 1 });
    await raceShot(pg, 'race-feed-mobile-landscape.png');
    await pauseToggleShot(pg, 'pause-scheme-toggle-mobile.png');
    await pg.close();
  },
  // 2. Same, with a simulated Dynamic Island landscape inset (--sa-l: 54px)
  async safearea() {
    const pg = await newPage({ width: 932, height: 430, isMobile: true, hasTouch: true, deviceScaleFactor: 1 });
    await raceShot(pg, 'race-hud-mobile-landscape-safearea.png', { safeAreaSim: true });
    await pg.close();
  },
  // 3. Mobile portrait race HUD
  async portrait() {
    const pg = await newPage({ width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 1 });
    await raceShot(pg, 'race-hud-mobile-portrait.png');
    await pg.close();
  },
  // 4. Desktop race — CLASSIC layout (no touch controls: slot lower-left, feed above it)
  async deskrace() {
    const pg = await newPage({ width: 1280, height: 800, deviceScaleFactor: 1 });
    await raceShot(pg, 'race-feed-desktop.png');
    await pg.close();
  },
  // 5. Title screens (pill contrast)
  async titledesk() {
    const pg = await newPage({ width: 1280, height: 800, deviceScaleFactor: 1 });
    await titleShot(pg, 'title-desktop.png');
    await pg.close();
  },
  async titlemob() {
    const pg = await newPage({ width: 932, height: 430, isMobile: true, hasTouch: true, deviceScaleFactor: 1 });
    await titleShot(pg, 'title-mobile-landscape.png');
    await pg.close();
  },
  // 6. Item guide
  async legenddesk() {
    const pg = await newPage({ width: 1280, height: 800, deviceScaleFactor: 1 });
    await menuShot(pg, 'items-legend-desktop.png');
    await pg.close();
  },
  async legendmob() {
    const pg = await newPage({ width: 932, height: 430, isMobile: true, hasTouch: true, deviceScaleFactor: 1 });
    await menuShot(pg, 'items-legend-mobile-landscape.png');
    await pg.close();
  },
};
const only = process.argv[2];
if (only) { await SHOTS[only](); }
else { for (const k of Object.keys(SHOTS)) await SHOTS[k](); }

await browser.close();
server.close();
console.log(errors.length ? 'ERRORS:\n' + errors.join('\n') : 'no page errors');
console.log('done ->', OUT);
