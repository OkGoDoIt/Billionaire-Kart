/* Tracks batch 2 proof shots — one countdown frame + one race frame per new track.
   Modelled on tools/bot-test.mjs: local server, three.js CDN intercepted from
   tools/vendor, sw.js stubbed, fresh browser context per track. Fails on any
   console/page error. Usage: node tracks/proof/shoot.mjs */
import http from 'http';
import { readFile } from 'fs/promises';
import { extname, join, normalize } from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';
const puppeteer = createRequire(new URL('../../tools/bot-test.mjs', import.meta.url))('puppeteer');

const ROOT = fileURLToPath(new URL('../..', import.meta.url));
const OUT = fileURLToPath(new URL('.', import.meta.url));
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.webmanifest': 'application/manifest+json', '.png': 'image/png', '.md': 'text/markdown' };
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

const TRACKS = [[2, 'bliss'], [3, 'tunnel'], [4, 'davos']];
const errors = [];
const browser = await puppeteer.launch({
  headless: 'new',
  args: ['--no-sandbox', '--disable-setuid-sandbox', '--enable-unsafe-swiftshader', '--use-angle=swiftshader', '--mute-audio', '--window-size=1280,800'],
});
for (const [idx, slug] of TRACKS) {
  const ctx = await browser.createBrowserContext();
  const page = await ctx.newPage();
  await page.setViewport({ width: 1280, height: 800 });
  await page.setRequestInterception(true);
  page.on('request', r => {
    const u = r.url();
    if (u.includes('cdn.jsdelivr.net/npm/three@')) r.respond({ status: 200, contentType: 'text/javascript; charset=utf-8', headers: { 'Access-Control-Allow-Origin': '*' }, body: threeCode });
    else if (u.endsWith('sw.js')) r.respond({ status: 200, contentType: 'text/javascript', body: '// stubbed for proof run' });
    else r.continue();
  });
  page.on('console', m => { if (m.type() === 'error') errors.push(`[${slug} console] ${m.text()}`); });
  page.on('pageerror', e => errors.push(`[${slug} pageerror] ${e.message}`));
  await page.goto(url, { waitUntil: 'networkidle2', timeout: 90000 });
  await page.waitForFunction(() => window.BK && document.querySelectorAll('.racer-tile').length === 17, { timeout: 30000 });
  const cardCount = await page.evaluate(() => document.querySelectorAll('.track-card').length);
  // countdown frame (Bliss: this is the wallpaper hero framing)
  await page.evaluate(i => { BK.start(0, i); }, idx);
  await page.waitForFunction(() => BK.state().state === 'countdown', { timeout: 30000 });
  await new Promise(r => setTimeout(r, 1500));
  await page.screenshot({ path: join(OUT, `${slug}-countdown.png`) });
  // race frame under autopilot (SwiftShader on this VM renders a few fps and the
  // game clock is dt-clamped, so crank the timescale and key waits to race time)
  await page.evaluate(() => { BK.skipCountdown(); BK.autopilot(true); BK.setTimescale(12); });
  await page.waitForFunction(() => BK.state().raceTime > 5, { timeout: 300000 });
  await page.screenshot({ path: join(OUT, `${slug}-race.png`) });
  const st = await page.evaluate(() => BK.state());
  console.log(`${slug}: cards=${cardCount} state=${st.state} lap=${st.player.lap} speed=${Math.round(st.player.speed)} cont=${Math.round(st.player.continuous)}`);
  await ctx.close();
}
await browser.close();
server.close();
if (errors.length) { console.error('ERRORS:\n' + errors.join('\n')); process.exit(1); }
console.log('PROOF OK — zero console/page errors');
