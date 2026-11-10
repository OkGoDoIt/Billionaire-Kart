// Focused turntable verification: stage state + detail-panel shots.
import puppeteer from 'puppeteer';
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'node:http';
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.woff2': 'font/woff2', '.md': 'text/markdown' };
const server = createServer((req, res) => {
  let p = decodeURIComponent(new URL(req.url, 'http://x').pathname); if (p === '/') p = '/index.html';
  const f = join(ROOT, p);
  if (!existsSync(f)) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { 'Content-Type': MIME[p.slice(p.lastIndexOf('.'))] || 'application/octet-stream' });
  res.end(readFileSync(f));
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const threeCode = readFileSync(join(ROOT, 'tools', 'vendor', 'three.module.js'));
let browser;
try {
  browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--mute-audio', '--window-size=1280,800'] });
  const page = await browser.newPage();
  await page.setRequestInterception(true);
  page.on('request', r => { if (r.url().includes('cdn.jsdelivr.net/npm/three@')) r.respond({ status: 200, contentType: 'text/javascript; charset=utf-8', headers: { 'Access-Control-Allow-Origin': '*' }, body: threeCode }); else r.continue(); });
  await page.evaluateOnNewDocument(() => { if (navigator.serviceWorker) navigator.serviceWorker.register = () => Promise.reject(new Error('tt')); });
  await page.setViewport({ width: 1280, height: 800 });
  const errs = [];
  page.on('pageerror', e => errs.push('page: ' + e.message));
  page.on('console', m => { if (m.type() === 'error') errs.push('console: ' + m.text()); });
  await page.goto(`http://127.0.0.1:${server.address().port}/index.html`, { waitUntil: 'load', timeout: 120000 });
  await page.waitForFunction(() => window.BK && document.querySelectorAll('.racer-tile').length === 17, { timeout: 90000 });
  await new Promise(r => setTimeout(r, 3000));
  const diag1 = await page.evaluate(() => { const cv = document.getElementById('stage-canvas'); return { tt: !!cv, ttOn: document.getElementById('racer-detail').classList.contains('tt-on'), cw: cv ? cv.clientWidth : 0, ch: cv ? cv.clientHeight : 0, bw: cv ? cv.width : 0, bh: cv ? cv.height : 0 }; });
  console.log('stage diag (boot):', JSON.stringify(diag1));
  await page.evaluate(() => document.querySelector('.racer-tile[data-racer="4"]').scrollIntoView({ block: 'center' }));
  await new Promise(r => setTimeout(r, 400));
  await page.screenshot({ path: join(ROOT, 'screenshots', 'pr-polish-impl', 'turntable-desktop.png') });
  await page.evaluate(() => document.querySelector('#racer-detail').scrollIntoView({ block: 'center' }));
  await new Promise(r => setTimeout(r, 600));
  await page.screenshot({ path: join(ROOT, 'screenshots', 'pr-polish-impl', 'turntable-panel.png') });
  console.log('errors:', errs.length ? errs.join(' | ') : 'none');
} finally { if (browser) await browser.close(); server.close(); }
