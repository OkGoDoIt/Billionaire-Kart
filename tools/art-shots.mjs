// Art-pass verification: fixed-spot before/after captures + scene tri census.
// Usage: node art-shots.mjs <root> <outdir> <tag>   (tag = "before" | "after")
import puppeteer from 'puppeteer';
import { readFileSync, existsSync, mkdirSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { createServer } from 'node:http';
const ROOT = process.argv[2], OUT = process.argv[3], TAG = process.argv[4] || 'after';
mkdirSync(OUT, { recursive: true });
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.woff2': 'font/woff2', '.md': 'text/markdown', '.webp': 'image/webp' };
const HOOK = `
window.__census = () => {
  const tris = g => { let t = 0; g.traverse(o => { if (o.geometry) { const geo = o.geometry; t += ((geo.index ? geo.index.count : geo.attributes.position.count) / 3); } }); return Math.round(t); };
  return { scene: tris(scene), objects: (() => { let n = 0; scene.traverse(() => n++); return n; })() };
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
  await page.evaluateOnNewDocument(() => { try { localStorage.setItem('bk-quality', 'low'); } catch (e) { } window.__frames = 0; const loop = () => { window.__frames++; requestAnimationFrame(loop); }; requestAnimationFrame(loop); if (navigator.serviceWorker) navigator.serviceWorker.register = () => Promise.reject(new Error('shots')); }); // advance at LOW + small viewport (bloom off — SwiftShader crawl); flip to HIGH at capture size and wait for REAL frames before shooting
  await page.setViewport({ width: 800, height: 500 });
  await page.goto(`http://127.0.0.1:${server.address().port}/index.html`, { waitUntil: 'load', timeout: 300000 });
  await page.waitForFunction(() => window.BK && window.__census && document.querySelectorAll('.racer-tile').length === 17, { timeout: 600000 });
  await new Promise(r => setTimeout(r, 3000));
  const shot = async (racer, track, file, advance, capW, capH) => {
    await page.setViewport({ width: Math.round(capW * 0.625), height: Math.round(capH * 0.625) }); // advance small (same aspect)
    await page.evaluate((rr, tt) => window.BK.start(rr, tt), racer, track);
    await page.waitForFunction(() => window.BK.state().state === 'countdown', { timeout: 300000 });
    await page.evaluate(() => { window.BK.skipCountdown(); window.BK.autopilot(true); window.BK.setTimescale(3); });
    const t0 = Date.now();
    await page.waitForFunction(a => { const s = window.BK.state(); return s.player && s.player.continuous > a; }, { timeout: 1500000, polling: 5000 }, advance);
    await page.setViewport({ width: capW, height: capH });
    const f0 = await page.evaluate(() => window.__frames);
    await page.evaluate(() => { const b = document.querySelector('.qual-btn[data-q="high"]'); if (b) b.click(); });
    const okF = await page.waitForFunction(f => window.__frames >= f + 2, { timeout: 900000, polling: 5000 }, f0).then(() => true).catch(() => false);
    if (!okF) console.log('warn: high-quality frames did not complete for', file);
    await page.screenshot({ path: join(OUT, file) });
    await page.evaluate(() => { const b = document.querySelector('.qual-btn[data-q="low"]'); if (b) b.click(); }).catch(() => { });
    console.log('shot', file, 'in', Math.round((Date.now() - t0) / 1000), 's; census:', JSON.stringify(await page.evaluate(() => window.__census())));
  };
  // Fixed spots (identical for before/after). ONLY=<substr> runs one spot (reboot recovery).
  const ONLY = process.env.ONLY || '';
  const spots = [
    [0, 0, `${TAG}-sv-start.png`, 110, 1280, 800],   // Silicon Valley start straight — Roger's screenshot sector
    [0, 1, `${TAG}-mars-crest.png`, 350, 1280, 800], // Mars, approaching the Tharsis crest (u~0.40)
    [0, 2, `${TAG}-datacenter.png`, 170, 1280, 800], // AI Datacenter, north-straight hall sector
    [0, 0, `${TAG}-sv-mobile.png`, 110, 932, 430],   // mobile landscape at the SV start spot
  ];
  for (const sp of spots) { if (ONLY && !sp[2].includes(ONLY)) continue; await shot(...sp); }
  console.log('errors:', errs.length ? errs.slice(0, 6).join(' | ') : 'none');
} finally { if (browser) await browser.close(); server.close(); }
