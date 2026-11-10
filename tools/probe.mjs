/* throwaway probe: tile selection state + frozen full-cover wipe shot */
import http from 'http';
import { readFile } from 'fs/promises';
import { extname, join, normalize } from 'path';
import { fileURLToPath } from 'url';
import puppeteer from 'puppeteer';
const ROOT = fileURLToPath(new URL('..', import.meta.url));
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.woff2': 'font/woff2' };
const server = http.createServer(async (req, res) => {
  try {
    let p = normalize(join(ROOT, decodeURIComponent(new URL(req.url, 'http://x').pathname)));
    if (p.endsWith('/')) p += 'index.html';
    const data = await readFile(p);
    res.writeHead(200, { 'Content-Type': MIME[extname(p)] || 'application/octet-stream' });
    res.end(data);
  } catch { res.writeHead(404); res.end('nf'); }
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const url = `http://127.0.0.1:${server.address().port}/index.html`;
const threeCode = await readFile(join(ROOT, 'tools', 'vendor', 'three.module.js'), 'utf-8');
const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox', '--disable-setuid-sandbox', '--enable-unsafe-swiftshader', '--use-angle=swiftshader', '--mute-audio'] });
const page = await browser.newPage();
await page.setViewport({ width: 1280, height: 800 });
await page.setRequestInterception(true);
page.on('request', r => { if (r.url().includes('cdn.jsdelivr.net/npm/three@')) r.respond({ status: 200, contentType: 'text/javascript; charset=utf-8', headers: { 'Access-Control-Allow-Origin': '*' }, body: threeCode }); else r.continue(); });
await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'no-preference' }]);
await page.evaluateOnNewDocument(() => { if (navigator.serviceWorker) navigator.serviceWorker.register = () => Promise.reject(new Error('probe')); });
await page.goto(url, { waitUntil: 'load', timeout: 120000 });
await page.waitForFunction(() => window.BK && document.querySelectorAll('.racer-tile').length === 17, { timeout: 90000 });
const before = await page.evaluate(() => [...document.querySelectorAll('.racer-tile.selected')].map(t => t.dataset.racer));
await page.evaluate(() => document.querySelector('.racer-tile[data-racer="4"]').click());
const after = await page.evaluate(() => ({ sel: [...document.querySelectorAll('.racer-tile.selected')].map(t => t.dataset.racer), detail: document.querySelector('.detail-name')?.textContent }));
console.log('selected before click:', JSON.stringify(before), '| after clicking tile 4:', JSON.stringify(after));
// Stage the wipe's full-cover state deterministically: play one real transition
// so ui-fx builds #bk-wipe, then pin the cover classes with transitions disabled.
await page.evaluate(() => window.BKFX.transition('checker', () => { }));
await new Promise(r => setTimeout(r, 1600));
await page.evaluate(() => {
  const st = document.createElement('style');
  st.id = 'probe-freeze'; st.textContent = '#bk-wipe .bk-cell{transition:none !important}';
  document.head.appendChild(st);
  const w = document.getElementById('bk-wipe');
  w.classList.add('show', 'on');
});
await new Promise(r => setTimeout(r, 250));
await page.screenshot({ path: join(ROOT, 'screenshots', 'pr-polish-impl', 'wipe-desktop.png') });
console.log('wipe cover shot saved');
await browser.close();
server.close();
