/* tools/polish-shots.mjs — PR screenshot harness for the polish phase (POLISH.md #9).
   Captures menu / character select / wipe / countdown / race HUD / roulette at
   desktop 1280x800 and mobile landscape 932x430 into polish-proof/.
   Same serving + CDN-interception pattern as tools/bot-test.mjs. Fails on console errors. */
import http from 'http';
import { readFile } from 'fs/promises';
import { extname, join, normalize } from 'path';
import { fileURLToPath } from 'url';
import puppeteer from 'puppeteer';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const OUT = join(ROOT, 'screenshots', 'pr-polish-impl');
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
async function wire(page, tag) {
  await page.setRequestInterception(true);
  page.on('request', r => {
    if (r.url().includes('cdn.jsdelivr.net/npm/three@')) r.respond({ status: 200, contentType: 'text/javascript; charset=utf-8', headers: { 'Access-Control-Allow-Origin': '*' }, body: threeCode });
    else r.continue();
  });
  page.on('console', m => { if (m.type() === 'error') errors.push(`[${tag} console] ${m.text()}`); });
  page.on('pageerror', e => errors.push(`[${tag} pageerror] ${e.message}`));
  page.on('requestfailed', r => { if (!r.url().includes('sw.js')) errors.push(`[${tag} requestfailed] ${r.url()}`); });
  await page.evaluateOnNewDocument(() => { if (navigator.serviceWorker) navigator.serviceWorker.register = () => Promise.reject(new Error('shots: SW disabled')); });
}
const shot = async (page, name) => { await page.screenshot({ path: join(OUT, name) }); console.log('saved', name); };

/* ---------- DESKTOP 1280x800 ---------- */
const page = await browser.newPage();
await page.setViewport({ width: 1280, height: 800 });
await wire(page, 'desktop');
await page.goto(url, { waitUntil: 'load', timeout: 120000 });
await page.waitForFunction(() => window.BK && document.querySelectorAll('.racer-tile').length === 17, { timeout: 90000 });
await page.evaluate(() => document.fonts.ready);
await sleep(600);
await shot(page, 'menu-desktop.png');
// character select: pick Jensen (tile 4), scroll the select zone into view
await page.evaluate(() => {
  document.querySelector('.racer-tile[data-racer="4"]').click();
  document.getElementById('select-wrap').scrollIntoView({ block: 'start' });
});
await sleep(500);
await shot(page, 'charselect-desktop.png');
// real START click -> checker wipe (shot mid-wave) -> countdown numeral
await page.evaluate(() => document.getElementById('screen-menu').scrollTo(0, 0));
await page.click('#btn-start');
await sleep(240);
await shot(page, 'wipe-desktop.png');
await page.waitForFunction(() => window.BK && BK.state().state === 'countdown', { timeout: 30000, polling: 200 });
await sleep(500);
await shot(page, 'countdown-desktop.png');
await page.evaluate(() => { BK.skipCountdown(); BK.autopilot(true); });
await page.waitForFunction(() => BK.state().state === 'racing', { timeout: 30000, polling: 300 });
await page.evaluate(() => BK.giveItem('boost'));
await sleep(1200);
await shot(page, 'race-hud-desktop.png');
// roulette mid-spin (same BKFX.roulette grantItem calls; demo pool literal)
await page.evaluate(() => {
  const pool = { boost: { icon: '💰', name: 'Series A Boost' }, star: { icon: '⭐', name: 'Viral Moment' }, blue: { icon: '⚖️', name: 'Antitrust Suit' }, red: { icon: '🐦', name: 'Viral Tweet' }, banana: { icon: '💧', name: 'Data Leak' } };
  window.BKFX.roulette({ icon: '⚖️', name: 'Antitrust Suit' }, pool, {});
});
await sleep(330);
await shot(page, 'roulette-desktop.png');
await sleep(900);
await page.close();

/* ---------- MOBILE LANDSCAPE 932x430 ---------- */
const ctx2 = await browser.createBrowserContext();
const page2 = await ctx2.newPage();
await wire(page2, 'mobile');
await page2.emulate({ viewport: { width: 932, height: 430, isMobile: true, hasTouch: true, isLandscape: true }, userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1' });
await page2.goto(url, { waitUntil: 'load', timeout: 120000 });
await page2.waitForFunction(() => window.BK && document.querySelectorAll('.racer-tile').length === 17, { timeout: 90000 });
await page2.evaluate(() => document.fonts.ready);
await sleep(600);
await shot(page2, 'menu-mobile.png');
await page2.evaluate(() => {
  document.querySelector('.racer-tile[data-racer="1"]').click();
  document.getElementById('select-wrap').scrollIntoView({ block: 'start' });
});
await sleep(500);
await shot(page2, 'charselect-mobile.png');
await page2.evaluate(() => { BK.start(0, 0); BK.skipCountdown(); BK.autopilot(true); });
await page2.waitForFunction(() => BK.state().state === 'racing', { timeout: 30000, polling: 300 });
await sleep(1500);
await shot(page2, 'race-hud-mobile.png');
await page2.close();

await browser.close();
server.close();
if (errors.length) { console.error('ERRORS:\n' + errors.join('\n')); process.exit(1); }
console.log('shots done, zero console/page errors');
