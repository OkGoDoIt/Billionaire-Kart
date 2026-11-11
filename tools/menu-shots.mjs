/* Menu & guide overhaul screenshots (#50 PR evidence): item guide with the
   new artwork, "How Spicy?" explainer, Control Lab scheme diagram, and the
   sticky start bar visible mid-scroll. Same pattern as hud-shots.mjs:
   static server + vendored three.js interception. */
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
  await page.evaluateOnNewDocument(() => { try { localStorage.setItem('bk-quality', 'low'); } catch (e) { } });
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
  await page.setRequestInterception(true);
  intercept(page);
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 120000 });
  await page.waitForFunction(() => window.BK && document.querySelectorAll('.racer-tile').length === 17, { timeout: 240000, polling: 2000 });
  await sleep(1200); // fonts + portrait thumbs settle
  return page;
}
const shot = async (page, name) => { await page.screenshot({ path: join(OUT, name) }); console.log('shot', name); };
const scrollToText = async (page, text) => {
  await page.evaluate(t => {
    const el = [...document.querySelectorAll('#screen-menu .section-title')].find(e => e.textContent.includes(t));
    if (el) el.scrollIntoView({ block: 'start' });
  }, text);
  await sleep(900);
};

/* ---- Mobile portrait (390x844) ---- */
{
  const page = await newPage({ width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
  // 1. Character grid mid-scroll — sticky bar + docked detail sheet visible
  await page.evaluate(() => { document.getElementById('screen-menu').scrollTop = 1050; });
  await sleep(900);
  await shot(page, 'mobile-grid-sticky.png');
  // 2. How Spicy? with the factual explainer (select Unhinged to prove it updates)
  await page.click('.diff-btn[data-diff="2"]');
  await scrollToText(page, 'How spicy');
  await shot(page, 'mobile-spicy.png');
  // 3. Control Lab — Dual Stick diagram (axis-constrained tracks per #49)
  await page.click('.scheme-btn[data-scheme="dualstick"]');
  await scrollToText(page, 'Touch controls');
  await shot(page, 'mobile-control-lab.png');
  // 4. Item guide with the new artwork
  await scrollToText(page, 'Item guide');
  await shot(page, 'mobile-guide.png');
  await page.close();
}

/* ---- Desktop 1280x800 ---- */
{
  const page = await newPage({ width: 1280, height: 800 });
  await page.click('.scheme-btn[data-scheme="stick1"]');
  await scrollToText(page, 'Touch controls');
  await shot(page, 'desktop-control-lab.png');
  await scrollToText(page, 'Item guide');
  await shot(page, 'desktop-guide-sticky.png');
  await page.close();
}

await browser.close();
server.close();
if (errors.length) { console.log('PAGE ERRORS:\n' + errors.join('\n')); process.exit(1); }
console.log('MENU SHOTS DONE');
