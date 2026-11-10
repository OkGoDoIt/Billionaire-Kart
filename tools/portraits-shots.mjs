/* PR screenshots for wip/portraits-final: Character Select desktop + mobile landscape.
   Same serving + CDN-interception pattern as tools/bot-test.mjs. Fails on console errors. */
import http from 'http';
import { readFile, mkdir } from 'fs/promises';
import { extname, join, normalize } from 'path';
import { fileURLToPath } from 'url';
import puppeteer from 'puppeteer';

const ROOT = '/home/hatch/workspace/bk-portraits';
const OUT = join(ROOT, 'screenshots', 'pr-portraits-final');
await mkdir(OUT, { recursive: true });
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.webmanifest': 'application/manifest+json', '.png': 'image/png', '.md': 'text/markdown', '.woff2': 'font/woff2', '.webp': 'image/webp' };
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
const sleep = ms => new Promise(r => setTimeout(r, ms));

const errors = [];
const browser = await puppeteer.launch({
  headless: 'new',
  args: ['--no-sandbox', '--disable-setuid-sandbox', '--enable-unsafe-swiftshader', '--use-angle=swiftshader', '--mute-audio', '--window-size=1280,800'],
});
async function wire(page, tag) {
  await page.setRequestInterception(true);
  page.on('request', async r => {
    const u = r.url(), marker = '/examples/jsm/';
    if (u.includes(marker)) {
      const rel = u.split(marker)[1].split('?')[0];
      try {
        if (!addonCache.has(rel)) addonCache.set(rel, await readFile(join(ROOT, 'tools', 'vendor', 'addons', rel), 'utf-8'));
        r.respond({ status: 200, contentType: 'text/javascript; charset=utf-8', headers: { 'Access-Control-Allow-Origin': '*' }, body: addonCache.get(rel) });
      } catch { r.respond({ status: 404, body: 'addon not vendored: ' + rel }); }
    }
    else if (u.includes('cdn.jsdelivr.net/npm/three@')) r.respond({ status: 200, contentType: 'text/javascript; charset=utf-8', headers: { 'Access-Control-Allow-Origin': '*' }, body: threeCode });
    else r.continue();
  });
  page.on('console', m => { if (m.type() === 'error') errors.push(`[${tag} console] ${m.text()}`); });
  page.on('pageerror', e => errors.push(`[${tag} pageerror] ${e.message}`));
  page.on('requestfailed', r => { if (!r.url().includes('sw.js')) errors.push(`[${tag} requestfailed] ${r.url()}`); });
  await page.evaluateOnNewDocument(() => { if (navigator.serviceWorker) navigator.serviceWorker.register = () => Promise.reject(new Error('shots: SW disabled')); });
}
async function tileCheck(page, tag) {
  const res = await page.evaluate(() => {
    const imgs = [...document.querySelectorAll('.racer-tile img')];
    return { tiles: document.querySelectorAll('.racer-tile').length, imgs: imgs.length, loaded: imgs.filter(i => i.complete && i.naturalWidth > 0).length, portraitKeys: Object.keys(window.BK_PORTRAITS || {}).length };
  });
  console.log(tag, JSON.stringify(res));
  if (res.tiles !== 17 || res.imgs !== 17 || res.loaded !== 17 || res.portraitKeys !== 17) throw new Error(tag + ': portrait tiles not fully loaded');
}

/* ---------- DESKTOP 1280x800 — Dario selected (Claude spark detail) ---------- */
const page = await browser.newPage();
await page.evaluateOnNewDocument(() => { try { localStorage.setItem('bk-quality', 'low'); } catch (e) { } });
await page.setViewport({ width: 1280, height: 800 });
await wire(page, 'desktop');
await page.goto(url, { waitUntil: 'load', timeout: 180000 });
await page.waitForFunction(() => window.BK && document.querySelectorAll('.racer-tile').length === 17, { timeout: 90000 });
await page.evaluate(() => document.fonts.ready);
await tileCheck(page, 'desktop');
await page.evaluate(() => {
  document.querySelector('.racer-tile[data-racer="6"]').click();
  document.getElementById('select-wrap').scrollIntoView({ block: 'start' });
});
await sleep(700);
await page.screenshot({ path: join(OUT, 'charselect-desktop.png') });
console.log('saved charselect-desktop.png');
await page.close();

/* ---------- MOBILE LANDSCAPE 932x430 — Zuck selected (new pendant) ---------- */
const ctx2 = await browser.createBrowserContext();
const page2 = await ctx2.newPage();
await page2.evaluateOnNewDocument(() => { try { localStorage.setItem('bk-quality', 'low'); } catch (e) { } });
await wire(page2, 'mobile');
await page2.emulate({ viewport: { width: 932, height: 430, isMobile: true, hasTouch: true, isLandscape: true }, userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1' });
await page2.goto(url, { waitUntil: 'load', timeout: 180000 });
await page2.waitForFunction(() => window.BK && document.querySelectorAll('.racer-tile').length === 17, { timeout: 90000 });
await page2.evaluate(() => document.fonts.ready);
// Tile portraits are loading="lazy" (game.js) — mobile Chrome only fetches
// near-viewport tiles (9/17 at 932x430) until scrolled. Flip them eager to
// force the fetches a scrolling user would trigger, then verify all decode.
await page2.evaluate(() => { document.querySelectorAll('.racer-tile img').forEach(i => { i.loading = 'eager'; }); });
await page2.waitForFunction(() => [...document.querySelectorAll('.racer-tile img')].every(i => i.complete && i.naturalWidth > 0), { timeout: 90000 });
await tileCheck(page2, 'mobile');
await page2.evaluate(() => {
  document.querySelector('.racer-tile[data-racer="2"]').click();
  document.getElementById('select-wrap').scrollIntoView({ block: 'start' });
});
await sleep(700);
await page2.screenshot({ path: join(OUT, 'charselect-mobile.png') });
console.log('saved charselect-mobile.png');
await page2.close();

await browser.close();
server.close();
if (errors.length) { console.error('ERRORS:\n' + errors.join('\n')); process.exit(1); }
console.log('shots done, zero console/page errors');
