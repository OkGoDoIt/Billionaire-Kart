/* tools/polish-shots-p2.mjs — PR screenshot harness for polish PHASE 2 (POLISH.md #9).
   Captures into screenshots/pr-polish-p2/: title lockup hero, rev-meter countdown,
   portrait minimap, POW burst, results ceremony (trophy + confetti) at desktop
   1280x800 and mobile landscape 932x430. Same serving + CDN-interception pattern
   as tools/bot-test.mjs. Fails on console errors. */
import http from 'http';
import { readFile } from 'fs/promises';
import { extname, join, normalize } from 'path';
import { fileURLToPath } from 'url';
import puppeteer from 'puppeteer';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const OUT = join(ROOT, 'screenshots', 'pr-polish-p2');
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
const ready = async page => {
  await page.waitForFunction(() => window.BK && document.querySelectorAll('.racer-tile').length === 17, { timeout: 90000 });
  await page.evaluate(() => document.fonts.ready);
  await sleep(600);
};
/* Start a race and hold the throttle through the countdown so the rev meter
   sweeps into its sweet zone; shoot mid-countdown. */
async function revShot(page, name) {
  await page.evaluate(() => { BK.start(0, 0); BK.setInput({ throttle: 1 }); });
  await page.waitForFunction(() => window.BK && BK.state().state === 'countdown', { timeout: 30000, polling: 150 });
  const t0 = Date.now();
  while (Date.now() - t0 < 20000) { // rev fill 25–68% = inside the green band
    const pct = await page.evaluate(() => {
      const f = document.getElementById('rev-fill');
      return f ? parseFloat(f.style.width) || 0 : 0;
    });
    if (pct >= 25 && pct <= 68) break;
    await sleep(90);
  }
  await shot(page, name);
  await page.evaluate(() => { BK.clearInput(); BK.skipCountdown(); });
}
/* Race a 1-lap chill race on autopilot to the real results screen; returns the
   player's rank from the results title (0 if the screen never appeared).
   NOTE: under SwiftShader the harness's detection+screenshot latency exceeds
   the confetti's 2.5 s life, so the ceremony shot re-triggers BKFX.confetti()
   on the genuinely-won results screen (see caller). */
async function finishRace(page) {
  await page.evaluate(() => { BK.setDifficulty(0); BK.setLaps(1); BK.start(0, 0); BK.skipCountdown(); BK.autopilot(true); BK.setTimescale(10); });
  try {
    await page.waitForFunction(() => !document.getElementById('screen-results').classList.contains('hidden'), { timeout: 150000, polling: 100 });
  } catch { return 0; }
  const title = await page.evaluate(() => document.getElementById('results-title').textContent);
  const m = /finished (\d)/.exec(title);
  return /YOU WIN/.test(title) ? 1 : (m ? parseInt(m[1]) : 0);
}
/* Spread the field in GAME time (real time is meaningless under SwiftShader
   starvation): run fast until the karts' progress spans a good chunk of a
   lap, so the minimap heads separate, then settle back to real time. */
async function spreadField(page) {
  await page.evaluate(() => { BK.autopilot(true); BK.setTimescale(8); });
  try {
    await page.waitForFunction(() => {
      const s = BK.state();
      if (!s.karts || s.karts.length < 2) return false;
      const cs = s.karts.map(k => k.continuous);
      return (Math.max(...cs) - Math.min(...cs)) > BK.trackLen() / 3 * 0.22;
    }, { timeout: 240000, polling: 500 });
  } catch { /* starved environment: shoot whatever spread exists */ }
  await page.evaluate(() => { BK.setTimescale(1); });
  await sleep(500);
}

/* ---------- DESKTOP 1280x800 ---------- */
const page = await browser.newPage();
await page.setViewport({ width: 1280, height: 800 });
await wire(page, 'desktop');
await page.goto(url, { waitUntil: 'load', timeout: 120000 });
await ready(page);
await shot(page, 'title-desktop.png');                    // item 5: logo lockup hero
await revShot(page, 'countdown-rev-desktop.png');         // item 6: rev meter in the sweet zone
await page.waitForFunction(() => BK.state().state === 'racing', { timeout: 30000, polling: 300 });
await spreadField(page);
await shot(page, 'race-minimap-desktop.png');             // item 3: portrait minimap heads
await page.evaluate(() => { // item 4: fire the shipped fx, then swap in a frozen clone (the live node self-removes at 580 ms)
  window.BKFX.pow(470, 480, 'POW!');
  const el = document.querySelector('.bk-pow');
  if (el) { const c = el.cloneNode(true); c.style.animation = 'none'; el.replaceWith(c); }
});
await sleep(120);
await shot(page, 'pow-desktop.png');
await page.close();

/* results ceremony on its own page (fresh race state) */
const pageR = await browser.newPage();
await pageR.setViewport({ width: 1280, height: 800 });
await wire(pageR, 'results');
await pageR.goto(url, { waitUntil: 'load', timeout: 120000 });
await ready(pageR);
let rank = await finishRace(pageR);
console.log('autopilot finish rank:', rank);
if (rank >= 1 && rank <= 3) { // genuine podium: freeze a fresh rain for the camera (harness latency outlives the 2.5 s fall; trophy/label are the game's own)
  await pageR.evaluate(() => {
    window.BKFX.confetti();
    const layer = document.getElementById('bk-confetti');
    if (!layer) return;
    [...layer.children].forEach((c, i) => {
      c.style.animation = 'none';
      c.style.top = (4 + (i * 37) % 62) + 'vh';
      c.style.opacity = '0.95';
      c.style.transform = `rotate(${(i * 53) % 360}deg)`;
    });
    layer.replaceWith(layer.cloneNode(true));
  });
  await sleep(250);
} else if (rank >= 4) { // ceremony is podium-only: if the bot placed 4th+, stage the shipped pieces for the shot
  await pageR.evaluate(() => {
    document.getElementById('results-ceremony').classList.remove('hidden');
    document.getElementById('ceremony-label').textContent = 'CHAMPION';
    window.BKFX.confetti();
  });
  await sleep(700);
}
await shot(pageR, 'results-desktop.png');                 // item 2: trophy + confetti ceremony
await pageR.close();

/* ---------- MOBILE LANDSCAPE 932x430 ---------- */
const ctx2 = await browser.createBrowserContext();
const page2 = await ctx2.newPage();
await wire(page2, 'mobile');
await page2.emulate({ viewport: { width: 932, height: 430, isMobile: true, hasTouch: true, isLandscape: true }, userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1' });
await page2.goto(url, { waitUntil: 'load', timeout: 120000 });
await ready(page2);
await shot(page2, 'title-mobile.png');                    // item 5 on mobile
await revShot(page2, 'countdown-rev-mobile.png');         // item 6 on mobile
await page2.waitForFunction(() => BK.state().state === 'racing', { timeout: 30000, polling: 300 });
await spreadField(page2);
await shot(page2, 'race-minimap-mobile.png');             // item 3: 100px minimap, portrait heads
await page2.close();

await browser.close();
server.close();
if (errors.length) { console.error('ERRORS:\n' + errors.join('\n')); process.exit(1); }
console.log('p2 shots done, zero console/page errors');
