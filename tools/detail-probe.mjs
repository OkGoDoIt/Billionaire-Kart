/* Detail-card cutoff probe: portrait phone, Character Select, measure the sheet. */
import http from 'http';
import { readFile, mkdir } from 'fs/promises';
import { extname, join, normalize } from 'path';
import puppeteer from 'puppeteer';

const ROOT = '/home/hatch/workspace/bk-detail';
const OUT = join(ROOT, 'screenshots', 'pr-detail-fit');
await mkdir(OUT, { recursive: true });
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.webmanifest': 'application/manifest+json', '.png': 'image/png', '.md': 'text/markdown', '.webp': 'image/webp', '.woff2': 'font/woff2' };
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

const mode = process.argv[2] || 'before';
const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox', '--disable-setuid-sandbox', '--enable-unsafe-swiftshader', '--use-angle=swiftshader', '--mute-audio'] });
const errors = [];
async function shoot(name, viewport, scrollMode) {
  const page = await browser.newPage();
  await page.evaluateOnNewDocument(() => { try { localStorage.setItem('bk-quality', 'low'); } catch (e) { } });
  await page.setViewport(viewport);
  await page.setRequestInterception(true);
  intercept(page);
  page.on('pageerror', e => errors.push(`[${name}] ${e.message}`));
  await page.goto(url, { waitUntil: 'load', timeout: 180000 });
  await page.waitForFunction(() => window.BK && document.querySelectorAll('.racer-tile').length === 17, { timeout: 90000 });
  await new Promise(r => setTimeout(r, 1500));
  // Tap the first racer (Elon — longest quote) via a real touch tap
  const tile = await page.$('.racer-tile');
  await tile.tap();
  await new Promise(r => setTimeout(r, 600));
  // Scroll the menu like a user browsing the grid: put the select section near the top
  await page.evaluate((sm) => {
    const sc = document.getElementById('screen-menu');
    const wrap = document.getElementById('select-wrap');
    if (sm === 'section-top') sc.scrollTop = wrap.getBoundingClientRect().top + sc.scrollTop - 70;
    else if (sm === 'mid-grid') sc.scrollTop = wrap.getBoundingClientRect().top + sc.scrollTop + 260;
  }, scrollMode);
  await new Promise(r => setTimeout(r, 700));
  const m = await page.evaluate(() => {
    const d = document.getElementById('racer-detail');
    const rows = d.querySelectorAll('.stat-row');
    const grip = rows[rows.length - 1];
    const r = d.getBoundingClientRect(), g = grip ? grip.getBoundingClientRect() : null;
    const cs = getComputedStyle(d);
    return {
      innerH: window.innerHeight, innerW: window.innerWidth,
      detail: { top: Math.round(r.top), bottom: Math.round(r.bottom), height: Math.round(r.height) },
      grip: g ? { top: Math.round(g.top), bottom: Math.round(g.bottom) } : null,
      position: cs.position, bottomCss: cs.bottom, maxHeight: cs.maxHeight, overflowY: cs.overflowY,
      detailScrollH: d.scrollHeight, detailClientH: d.clientHeight,
    };
  });
  console.log(name, JSON.stringify(m));
  await page.screenshot({ path: join(OUT, name + '.png') });
  await page.close();
  return m;
}

if (mode === 'before') {
  await shoot('portrait-before', { width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 2 }, 'section-top');
} else {
  const only = process.argv[3] || '';
  const shots = {
    'portrait-after': [{ width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 2 }, 'section-top'],
    'landscape-after': [{ width: 932, height: 430, isMobile: true, hasTouch: true, deviceScaleFactor: 2 }, 'section-top'],
    'desktop-after': [{ width: 1280, height: 800 }, 'section-top'],
    'short-window-after': [{ width: 900, height: 480 }, 'section-top'],
  };
  for (const [name, [vp, sm]] of Object.entries(shots)) {
    if (only && name !== only) continue;
    await shoot(name, vp, sm);
  }
}
console.log('pageerrors:', errors.length ? errors : 'none');
await browser.close();
server.close();
