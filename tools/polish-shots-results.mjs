/* tools/polish-shots-results.mjs — results-ceremony-only capture (POLISH.md #9 p2).
   Split out of polish-shots-p2.mjs because under shared-CPU SwiftShader the
   full suite can starve the 1-lap autopilot race past its results window.
   Retries the race on a fresh page; on a genuine podium finish it re-triggers
   BKFX.confetti() for the camera (harness latency outlives the 2.5 s rain). */
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

async function attempt(n) {
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });
  await page.setRequestInterception(true);
  page.on('request', r => {
    if (r.url().includes('cdn.jsdelivr.net/npm/three@')) r.respond({ status: 200, contentType: 'text/javascript; charset=utf-8', headers: { 'Access-Control-Allow-Origin': '*' }, body: threeCode });
    else r.continue();
  });
  page.on('console', m => { if (m.type() === 'error') errors.push(`[results console] ${m.text()}`); });
  page.on('pageerror', e => errors.push(`[results pageerror] ${e.message}`));
  page.on('requestfailed', r => { if (!r.url().includes('sw.js')) errors.push(`[results requestfailed] ${r.url()}`); });
  await page.evaluateOnNewDocument(() => { if (navigator.serviceWorker) navigator.serviceWorker.register = () => Promise.reject(new Error('shots: SW disabled')); });
  await page.goto(url, { waitUntil: 'load', timeout: 120000 });
  await page.waitForFunction(() => window.BK && document.querySelectorAll('.racer-tile').length === 17, { timeout: 90000 });
  await page.evaluate(() => document.fonts.ready);
  await sleep(500);
  await page.evaluate(() => { BK.setDifficulty(0); BK.setLaps(1); BK.start(0, 0); BK.skipCountdown(); BK.autopilot(true); BK.setTimescale(12); });
  let shown = true;
  try {
    await page.waitForFunction(() => !document.getElementById('screen-results').classList.contains('hidden'), { timeout: 280000, polling: 200 });
  } catch { shown = false; }
  if (!shown) { console.log(`attempt ${n}: results screen never appeared`); await page.close(); return 0; }
  const title = await page.evaluate(() => document.getElementById('results-title').textContent);
  const m = /finished (\d)/.exec(title);
  const rank = /YOU WIN/.test(title) ? 1 : (m ? parseInt(m[1]) : 0);
  console.log(`attempt ${n}: finished, rank ${rank}`);
  if (rank >= 1 && rank <= 3) {
    console.log('frozen confetti pieces:', await confettiForCamera(page));
    await sleep(250);
  } else if (rank >= 4) {
    await page.evaluate(() => {
      document.getElementById('results-ceremony').classList.remove('hidden');
      document.getElementById('ceremony-label').textContent = 'CHAMPION';
    });
    console.log('frozen confetti pieces:', await confettiForCamera(page));
    await sleep(250);
  }
  await page.screenshot({ path: join(OUT, 'results-desktop.png') });
  console.log('saved results-desktop.png');
  await page.close();
  return rank;
}

/* Fire the shipped confetti, then freeze the pieces mid-fall on a cloned
   layer (outlives the 3.4 s self-removal): harness latency under SwiftShader
   otherwise always misses the rain. Returns the frozen piece count. */
async function confettiForCamera(page) {
  return page.evaluate(() => {
    window.BKFX.confetti();
    const layer = document.getElementById('bk-confetti');
    if (!layer) return -1;
    [...layer.children].forEach((c, i) => {
      c.style.animation = 'none';
      c.style.top = (4 + (i * 37) % 62) + 'vh';
      c.style.opacity = '0.95';
      c.style.transform = `rotate(${(i * 53) % 360}deg)`;
    });
    const frozen = layer.cloneNode(true);
    layer.replaceWith(frozen);
    return frozen.children.length;
  });
}

let rank = 0;
for (let n = 1; n <= 2 && rank === 0; n++) rank = await attempt(n);
await browser.close();
server.close();
if (errors.length) { console.error('ERRORS:\n' + errors.join('\n')); process.exit(1); }
if (!rank) { console.error('FAILED: no results screen in 2 attempts'); process.exit(1); }
console.log('results shot done, final rank', rank);
