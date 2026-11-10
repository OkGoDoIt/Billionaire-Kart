/* TRACK 3D proof: authored-profile assertions + full autopilot laps on both
   live tracks + showcase screenshots. Mirrors bot-test.mjs interception. */
import http from 'http';
import { readFile } from 'fs/promises';
import { extname, join, normalize } from 'path';
import puppeteer from 'puppeteer';

const ROOT = '/home/hatch/workspace/bk-track3d-refresh';
const SHOTS = join(ROOT, 'screenshots', 'pr-track-3d');
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

const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox', '--disable-setuid-sandbox', '--enable-unsafe-swiftshader', '--use-angle=swiftshader', '--mute-audio', '--window-size=1280,800'] });
const errors = [];
const page = await browser.newPage();
await page.evaluateOnNewDocument(() => { try { localStorage.setItem('bk-quality', 'low'); } catch (e) { } });
await page.setViewport({ width: 1280, height: 800 });
await page.setRequestInterception(true);
intercept(page);
page.on('console', m => { if (m.type() === 'error') errors.push(`[console] ${m.text()}`); });
page.on('pageerror', e => errors.push(`[pageerror] ${e.message}`));
await page.goto(url, { waitUntil: 'load', timeout: 240000 });
await page.waitForFunction(() => window.BK && BK.state().karts.length === 8, { timeout: 120000 });

const ev = (fn, ...a) => page.evaluate(fn, ...a);
const approx = (name, got, want, tol) => {
  const ok = Math.abs(got - want) <= tol;
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}: got ${got.toFixed(2)}, want ${want} ±${tol}`);
  if (!ok) errors.push(`assert ${name}: ${got} vs ${want}`);
};
const uOf = cont => (((cont % 900) + 900) % 900) / 900;

async function profileChecks(track, checks) {
  await ev((t) => { BK.start(0, t); }, track);
  await new Promise(r => setTimeout(r, 800));
  for (const [kind, uu, want, tol] of checks) {
    if (kind === 'edge') {
      const got = await ev((x) => BK.track3d().roadYAt(x, 11) - BK.track3d().roadYAt(x, -11), uu);
      approx(`edgeDiff(${uu}) t${track}`, got, want, tol);
    } else {
      const got = await ev((k, x) => BK.track3d()[k](x), kind, uu);
      approx(`${kind}(${uu}) t${track}`, got, want, tol);
    }
  }
}

async function driveLap(pg, track, shots) {
  await pg.setViewport({ width: 800, height: 500 }); // drive small: SwiftShader fill-rate is the bottleneck; shots upscale briefly
  await pg.evaluate((t) => { BK.start(0, t); BK.skipCountdown(); BK.autopilot(true); BK.setTimescale(3); }, track);
  const s0 = await pg.evaluate(() => BK.state());
  const start = s0.player.continuous;
  let maxY = -99, minY = 99, last = start, stalled = 0;
  const fired = new Set();
  const t0 = Date.now();
  while (true) {
    const s = await pg.evaluate(() => BK.state());
    const c = s.player.continuous;
    maxY = Math.max(maxY, s.player.pos[1]); minY = Math.min(minY, s.player.pos[1]);
    if (Math.abs(c - last) < 0.01) { if (++stalled > 1200) throw new Error(`STALL on track ${track} at cont ${c}`); } else stalled = 0;
    last = c;
    const uu = uOf(c);
    for (const sh of shots) {
      if (!fired.has(sh.name) && uu >= sh.from && uu <= sh.to) {
        fired.add(sh.name);
        await pg.evaluate(() => BK.setTimescale(0.3));
        await pg.setViewport({ width: 1280, height: 800 });
        await new Promise(r => setTimeout(r, 900));
        await pg.screenshot({ path: join(SHOTS, sh.name) });
        await pg.setViewport({ width: 800, height: 500 });
        console.log('shot', sh.name, 'at u', uu.toFixed(3), 'y', s.player.pos[1].toFixed(1));
        await pg.evaluate(() => BK.setTimescale(3));
      }
    }
    if (c - start >= 900) { console.log(`track ${track}: FULL LAP done, delta ${(c - start).toFixed(0)} samples, playerY range [${minY.toFixed(1)}, ${maxY.toFixed(1)}], wall ${((Date.now() - t0) / 1000).toFixed(0)}s`); break; }
    if (Date.now() - t0 > 1200000) throw new Error(`LAP TIMEOUT track ${track} at cont ${c}`);
    await new Promise(r => setTimeout(r, 200));
  }
  return { maxY, minY };
}

await profileChecks(0, [
  ['elevAt', 0.0, 0, 0.3], ['elevAt', 0.50, 13.0, 0.7], ['elevAt', 0.615, 4.0, 0.7], ['elevAt', 0.96, 0, 0.3],
  ['bankDegAt', 0.303, 14, 1.8], ['bankDegAt', 0.240, -11, 1.8], ['bankDegAt', 0.99, 0, 1.2],
  ['edge', 0.303, 5.32, 1.0], ['edge', 0.240, -4.20, 1.0],
]);
const sv = await driveLap(page, 0, [
  { name: 'sv-banked-hairpin.png', from: 0.288, to: 0.315 },
  { name: 'sv-crest.png', from: 0.478, to: 0.512 },
  { name: 'sv-dive.png', from: 0.560, to: 0.592 },
]);
console.log('SV player Y range:', sv.minY.toFixed(1), '..', sv.maxY.toFixed(1));

await profileChecks(1, [
  ['elevAt', 0.0, 0, 0.3], ['elevAt', 0.343, 11.0, 0.7], ['elevAt', 0.40, 12.0, 0.7], ['elevAt', 0.55, -3.0, 0.7],
  ['bankDegAt', 0.343, 14, 1.8], ['bankDegAt', 0.272, -13, 1.8],
  ['edge', 0.343, 5.32, 1.0],
]);
const mars = await driveLap(page, 1, [
  { name: 'mars-switchback.png', from: 0.295, to: 0.335 },
  { name: 'mars-crater.png', from: 0.520, to: 0.558 },
]);
console.log('Mars player Y range:', mars.minY.toFixed(1), '..', mars.maxY.toFixed(1));

// mobile landscape crest shot (SV)
const page2 = await browser.newPage();
await page2.evaluateOnNewDocument(() => { try { localStorage.setItem('bk-quality', 'low'); } catch (e) { } });
await page2.setViewport({ width: 932, height: 430, isMobile: true, hasTouch: true });
await page2.setRequestInterception(true);
intercept(page2);
page2.on('console', m => { if (m.type() === 'error') errors.push(`[mobile console] ${m.text()}`); });
page2.on('pageerror', e => errors.push(`[mobile pageerror] ${e.message}`));
await page2.goto(url, { waitUntil: 'load', timeout: 240000 });
await page2.waitForFunction(() => window.BK && BK.state().karts.length === 8, { timeout: 120000 });
{
  await page2.evaluate(() => { BK.start(0, 0); BK.skipCountdown(); BK.autopilot(true); BK.setTimescale(3); });
  const s0 = await page2.evaluate(() => BK.state()); const start = s0.player.continuous;
  const t0 = Date.now();
  while (Date.now() - t0 < 900000) {
    const s = await page2.evaluate(() => BK.state());
    const uu = uOf(s.player.continuous);
    if (uu >= 0.478 && uu <= 0.52) {
      await page2.evaluate(() => BK.setTimescale(0.3));
      await new Promise(r => setTimeout(r, 500));
      await page2.screenshot({ path: join(SHOTS, 'sv-crest-mobile.png') });
      console.log('shot sv-crest-mobile.png at u', uu.toFixed(3));
      break;
    }
    if (s.player.continuous - start >= 900) break;
    await new Promise(r => setTimeout(r, 200));
  }
}

await browser.close();
server.close();
console.log('ERRORS:', errors.length ? errors : 'none');
console.log(errors.length ? 'PROOF FAILED' : 'PROOF PASSED');
process.exit(errors.length ? 1 : 0);
