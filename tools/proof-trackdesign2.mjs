/* TRACK 3D batch-2 proof (issue #45): authored-profile assertions + full
   autopilot laps + showcase screenshots for Bliss (9), Boring Tunnel (10),
   Davos (11). Mirrors proof-track3d.mjs / bot-test.mjs interception. */
import http from 'http';
import { readFile, mkdir } from 'fs/promises';
import { extname, join, normalize } from 'path';
import puppeteer from 'puppeteer';

const ROOT = '/home/hatch/workspace/bk-trackdesign-2';
const SHOTS = join(ROOT, 'screenshots', 'pr-trackdesign-2');
await mkdir(SHOTS, { recursive: true });
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
let passCount = 0, failCount = 0;
const approx = (name, got, want, tol) => {
  const ok = Math.abs(got - want) <= tol;
  if (ok) passCount++; else { failCount++; errors.push(`assert ${name}: ${got} vs ${want}`); }
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}: got ${got.toFixed(2)}, want ${want} ±${tol}`);
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

async function countdownShot(track, name) {
  await page.setViewport({ width: 1280, height: 800 });
  await ev((t) => { BK.start(0, t); }, track); // enters countdown with the track's countdownView
  await new Promise(r => setTimeout(r, 2500));
  await page.screenshot({ path: join(SHOTS, name) });
  console.log('countdown shot', name, 'track', track);
}

async function driveLap(track, shots) {
  await page.setViewport({ width: 800, height: 500 }); // drive small: SwiftShader fill-rate is the bottleneck
  await ev((t) => { BK.start(0, t); BK.skipCountdown(); BK.autopilot(true); BK.setTimescale(3); }, track);
  const s0 = await ev(() => BK.state());
  const start = s0.player.continuous;
  let maxY = -99, minY = 99, last = start, stalled = 0;
  const fired = new Set();
  const t0 = Date.now();
  while (true) {
    const s = await ev(() => BK.state());
    const c = s.player.continuous;
    maxY = Math.max(maxY, s.player.pos[1]); minY = Math.min(minY, s.player.pos[1]);
    if (Math.abs(c - last) < 0.01) { if (++stalled > 1200) throw new Error(`STALL on track ${track} at cont ${c}`); } else stalled = 0;
    last = c;
    const uu = uOf(c);
    for (const sh of shots) {
      if (!fired.has(sh.name) && uu >= sh.from && uu <= sh.to) {
        fired.add(sh.name);
        await ev(() => BK.setTimescale(0.3));
        await page.setViewport({ width: 1280, height: 800 });
        await new Promise(r => setTimeout(r, 900));
        await page.screenshot({ path: join(SHOTS, sh.name) });
        await page.setViewport({ width: 800, height: 500 });
        console.log('shot', sh.name, 'at u', uu.toFixed(3), 'y', s.player.pos[1].toFixed(1));
        await ev(() => BK.setTimescale(3));
      }
    }
    if (c - start >= 900) { console.log(`track ${track}: FULL LAP done, playerY range [${minY.toFixed(1)}, ${maxY.toFixed(1)}], wall ${((Date.now() - t0) / 1000).toFixed(0)}s`); break; }
    if (Date.now() - t0 > 1200000) throw new Error(`LAP TIMEOUT track ${track} at cont ${c}`);
    await new Promise(r => setTimeout(r, 200));
  }
  return { maxY, minY };
}

/* ---- BLISS (9) ---- */
await countdownShot(9, 'bliss-start.png'); // countdown composition BEFORE any racing on this track build
await profileChecks(9, [
  ['elevAt', 0.0, 0, 0.3], ['elevAt', 0.206, 2.5, 0.4], ['elevAt', 0.525, 0.2, 0.35], ['elevAt', 0.68, 5.0, 0.4], ['elevAt', 0.96, 0, 0.3],
  ['bankDegAt', 0.791, -13, 1.8], ['bankDegAt', 0.206, -10, 1.8], ['bankDegAt', 0.5, 0, 1.2], ['bankDegAt', 0.0, 5, 1.8],
  ['edge', 0.791, -4.95, 1.0],
]);
const bliss = await driveLap(9, [
  { name: 'bliss-crest.png', from: 0.645, to: 0.685 },
]);
console.log('Bliss player Y range:', bliss.minY.toFixed(1), '..', bliss.maxY.toFixed(1));

/* ---- BORING TUNNEL (10) ---- */
await profileChecks(10, [
  ['elevAt', 0.0, 0, 0.3], ['elevAt', 0.164, -6, 0.4], ['elevAt', 0.40, -5.2, 0.4], ['elevAt', 0.72, 2.2, 0.4],
  ['bankDegAt', 0.273, 11, 1.8], ['bankDegAt', 0.932, 5, 1.8], ['bankDegAt', 0.65, 0, 1.2],
  ['edge', 0.273, 4.20, 1.0],
]);
const tun = await driveLap(10, [
  { name: 'tunnel-dive.png', from: 0.105, to: 0.135 },
  { name: 'tunnel-ring.png', from: 0.505, to: 0.54 },
]);
console.log('Tunnel player Y range:', tun.minY.toFixed(1), '..', tun.maxY.toFixed(1));

/* ---- DAVOS (11) ---- */
await profileChecks(11, [
  ['elevAt', 0.0, 0, 0.3], ['elevAt', 0.213, 6.0, 0.4], ['elevAt', 0.45, 11.5, 0.4], ['elevAt', 0.907, 0.6, 0.35],
  ['bankDegAt', 0.411, 11, 1.8], ['bankDegAt', 0.213, 7, 1.8], ['bankDegAt', 0.60, 0, 1.2],
  ['edge', 0.411, 4.20, 1.0],
]);
const dav = await driveLap(11, [
  { name: 'davos-climb.png', from: 0.375, to: 0.41 },
]);
console.log('Davos player Y range:', dav.minY.toFixed(1), '..', dav.maxY.toFixed(1));

await browser.close();
server.close();
console.log(`ASSERTIONS: ${passCount} passed, ${failCount} failed`);
console.log('ERRORS:', errors.length ? errors : 'none');
console.log(errors.length ? 'PROOF FAILED' : 'PROOF PASSED');
process.exit(errors.length ? 1 : 0);
