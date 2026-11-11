// Model-pass verification: tri census + turntable captures + race chase shots.
// Usage: node model-shots.mjs <root> <outdir>
import puppeteer from 'puppeteer';
import { readFileSync, existsSync, mkdirSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { createServer } from 'node:http';
const ROOT = process.argv[2], OUT = process.argv[3];
mkdirSync(OUT, { recursive: true });
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.woff2': 'font/woff2', '.md': 'text/markdown', '.webp': 'image/webp' };
const HOOK = `
window.__census = () => {
  const tris = g => { let t = 0; g.traverse(o => { if (o.geometry) { const geo = o.geometry; t += ((geo.index ? geo.index.count : geo.attributes.position.count) / 3); } }); return Math.round(t); };
  return { kart0: karts.length ? tris(karts[0].mesh) : 0, scene: tris(scene), itemBox: itemBoxes.length ? tris(itemBoxes[0].mesh) : 0 };
};`;
const server = createServer((req, res) => {
  let p = decodeURIComponent(new URL(req.url, 'http://x').pathname); if (p === '/') p = '/index.html';
  const f = join(ROOT, p);
  if (!existsSync(f)) { res.writeHead(404); res.end(); return; }
  let body = readFileSync(f);
  if (p === '/game.js') body = Buffer.from(body.toString('utf8') + HOOK);
  res.writeHead(200, { 'Content-Type': MIME[p.slice(p.lastIndexOf('.'))] || 'application/octet-stream' });
  res.end(body);
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const threeCode = readFileSync(join(ROOT, 'tools', 'vendor', 'three.module.js'));
let browser;
try {
  browser = await puppeteer.launch({ headless: true, protocolTimeout: 900000, args: ['--no-sandbox', '--disable-dev-shm-usage', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--mute-audio', '--window-size=1280,800'] });
  const page = await browser.newPage();
  await page.setRequestInterception(true);
  const addonCache = new Map();
  page.on('request', async r => {
    const u = r.url(), marker = '/examples/jsm/';
    if (u.includes(marker)) {
      const rel = u.split(marker)[1].split('?')[0];
      try { if (!addonCache.has(rel)) addonCache.set(rel, await readFile(join(ROOT, 'tools', 'vendor', 'addons', rel), 'utf-8')); r.respond({ status: 200, contentType: 'text/javascript; charset=utf-8', headers: { 'Access-Control-Allow-Origin': '*' }, body: addonCache.get(rel) }); }
      catch { r.respond({ status: 404, body: 'addon not vendored: ' + rel }); }
    } else if (u.includes('cdn.jsdelivr.net/npm/three@')) r.respond({ status: 200, contentType: 'text/javascript; charset=utf-8', headers: { 'Access-Control-Allow-Origin': '*' }, body: threeCode });
    else r.continue();
  });
  const errs = [];
  page.on('pageerror', e => errs.push('page: ' + e.message));
  page.on('console', m => { if (m.type() === 'error') errs.push('console: ' + m.text()); });
  await page.evaluateOnNewDocument(() => { if (navigator.serviceWorker) navigator.serviceWorker.register = () => Promise.reject(new Error('shots')); });
  await page.setViewport({ width: 1280, height: 800 });
  await page.goto(`http://127.0.0.1:${server.address().port}/index.html`, { waitUntil: 'load', timeout: 300000 });
  await page.waitForFunction(() => window.BK && window.__census && document.querySelectorAll('.racer-tile').length === 17, { timeout: 300000 });
  await new Promise(r => setTimeout(r, 3000));
  console.log('census (valley menu world):', JSON.stringify(await page.evaluate(() => window.__census())));
  // turntable captures
  const racers = [[8, 'trump'], [13, 'holmes'], [4, 'jensen'], [10, 'larrysergey']];
  for (const [idx, name] of racers) {
    await page.evaluate(i => { const t = document.querySelector(`.racer-tile[data-racer="${i}"]`); t.scrollIntoView({ block: 'center' }); t.click(); }, idx);
    await new Promise(r => setTimeout(r, 2800));
    // Full-viewport capture: element screenshots blank the WebGL stage canvas
    // under SwiftShader; the compositor path (as in pr-polish-impl) keeps it.
    await page.evaluate(() => document.getElementById('racer-detail').scrollIntoView({ block: 'center' }));
    await new Promise(r => setTimeout(r, 600));
    await page.screenshot({ path: join(OUT, `turntable-${name}.png`) });
    console.log('shot turntable', name, 'tt-on:', await page.evaluate(() => document.getElementById('racer-detail').classList.contains('tt-on')));
  }
  // race chase shots
  const chase = async (racer, track, file, advance) => {
    await page.evaluate((rr, tt) => window.BK.start(rr, tt), racer, track);
    await page.waitForFunction(() => window.BK.state().state === 'countdown', { timeout: 180000 });
    await page.evaluate(() => { window.BK.skipCountdown(); window.BK.autopilot(true); window.BK.setTimescale(3); });
    const t0 = Date.now();
    await page.waitForFunction(a => { const s = window.BK.state(); return s.player && s.player.continuous > a; }, { timeout: 300000, polling: 2000 }, advance);
    console.log('chase', file, 'advanced in', Date.now() - t0, 'ms');
    await page.screenshot({ path: join(OUT, file) });
  };
  await chase(4, 0, 'chase-valley.png', 260);
  console.log('census (valley race):', JSON.stringify(await page.evaluate(() => window.__census())));
  await chase(0, 1, 'chase-mars.png', 200);
  console.log('census (mars race):', JSON.stringify(await page.evaluate(() => window.__census())));
  console.log('errors:', errs.length ? errs.slice(0, 6).join(' | ') : 'none');
} finally { if (browser) await browser.close(); server.close(); }
