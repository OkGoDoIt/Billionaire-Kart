/* Clock probe: does BK.state().raceTime advance, and how fast, under current
   VM load? Usage: node tools/clock-probe.mjs <rootDir> — boots the game from
   rootDir, starts a race exactly like bot-test does, samples raceTime. */
import http from 'http';
import { readFile } from 'fs/promises';
import { extname, join, normalize } from 'path';
import puppeteer from 'puppeteer';

const ROOT = process.argv[2];
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.webmanifest': 'application/manifest+json', '.png': 'image/png', '.webp': 'image/webp' };
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
const TOOLS = join(ROOT, 'tools');
const threeCode = await readFile(join(TOOLS, 'vendor', 'three.module.js'), 'utf-8');
const addonCache = new Map();
const browser = await puppeteer.launch({ headless: 'new', protocolTimeout: 600000, args: ['--no-sandbox', '--disable-setuid-sandbox', '--enable-unsafe-swiftshader', '--use-angle=swiftshader', '--mute-audio'] });
const page = await browser.newPage();
await page.setViewport({ width: 1280, height: 800 });
await page.evaluateOnNewDocument(() => { try { localStorage.setItem('bk-quality', 'low'); } catch (e) { } });
await page.setRequestInterception(true);
page.on('request', async r => {
  const u = r.url(), marker = '/examples/jsm/';
  if (u.includes(marker)) {
    const rel = u.split(marker)[1].split('?')[0];
    try {
      if (!addonCache.has(rel)) addonCache.set(rel, await readFile(join(TOOLS, 'vendor', 'addons', rel), 'utf-8'));
      r.respond({ status: 200, contentType: 'text/javascript; charset=utf-8', headers: { 'Access-Control-Allow-Origin': '*' }, body: addonCache.get(rel) });
    } catch { r.respond({ status: 404, body: 'addon not vendored: ' + rel }); }
  } else if (u.includes('cdn.jsdelivr.net/npm/three@')) {
    r.respond({ status: 200, contentType: 'text/javascript; charset=utf-8', headers: { 'Access-Control-Allow-Origin': '*' }, body: threeCode });
  } else r.continue();
});
const t0 = Date.now();
await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 180000 });
await page.waitForFunction(() => window.BK && document.querySelectorAll('.racer-tile').length === 17, { timeout: 420000, polling: 2000 });
console.log('booted in', Math.round((Date.now() - t0) / 1000), 's');
await page.evaluate(() => { BK.start(0, 0); BK.skipCountdown(); BK.autopilot(true); BK.setTimescale(3); });
for (let i = 0; i < 7; i++) {
  await new Promise(r => setTimeout(r, 10000));
  const s = await page.evaluate(() => { const st = BK.state(); return { state: st.state, raceTime: +st.raceTime.toFixed(2), cont: +st.player.continuous.toFixed(1) }; }).catch(e => ({ err: e.message }));
  console.log(`t+${(i + 1) * 10}s wall:`, JSON.stringify(s));
}
await browser.close();
server.close();
