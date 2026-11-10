/* Batch 3 proof harness: races every module track headlessly.
 * For each track index: fresh page (SW disabled, three.js intercepted like
 * bot-test.mjs), BK.start(0, idx), skip countdown, autopilot at 3x, sample the
 * player kart at ~3s and ~7s of race time, assert real progress + zero
 * console/page errors, and save one 1280x800 screenshot per track. */
import http from 'http';
import { readFile, writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { extname, join, normalize } from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';
// puppeteer is installed under tools/ (same as bot-test.mjs) — resolve it from there
const puppeteer = createRequire(new URL('../tools/package.json', import.meta.url))('puppeteer');

const ROOT = fileURLToPath(new URL('..', import.meta.url));
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

const threePath = join(ROOT, 'tools', 'vendor', 'three.module.js');
if (!existsSync(threePath)) throw new Error('tools/vendor/three.module.js missing (run tools/bot-test.mjs once)');
const threeCode = await readFile(threePath, 'utf-8');

const TRACKS = [
  { idx: 2, id: 'metaverse', name: 'Metaverse Plaza GP' },
  { idx: 3, id: 'wework', name: 'WeWork Memorial GP' },
  { idx: 4, id: 'burningman', name: 'Burning Man GP' },
  { idx: 5, id: 'bahamas', name: 'Bahamas Crypto GP' },
];
await mkdir(join(ROOT, 'tracks', 'proof'), { recursive: true });

const browser = await puppeteer.launch({
  headless: 'new',
  args: ['--no-sandbox', '--disable-setuid-sandbox', '--enable-unsafe-swiftshader', '--use-angle=swiftshader', '--mute-audio', '--window-size=1280,800'],
});
let failures = 0;
for (const tr of TRACKS) {
  const errors = [];
  const ctx = await browser.createBrowserContext();
  const page = await ctx.newPage();
  await page.setViewport({ width: 1280, height: 800 });
  await page.setRequestInterception(true);
  page.on('request', r => {
    if (r.url().includes('cdn.jsdelivr.net/npm/three@')) r.respond({ status: 200, contentType: 'text/javascript; charset=utf-8', headers: { 'Access-Control-Allow-Origin': '*' }, body: threeCode });
    else r.continue();
  });
  page.on('console', m => { if (m.type() === 'error') errors.push(`[console] ${m.text()}`); });
  page.on('pageerror', e => errors.push(`[pageerror] ${e.message}`));
  page.on('requestfailed', r => { if (!r.url().includes('sw.js')) errors.push(`[requestfailed] ${r.url()}`); });
  await page.evaluateOnNewDocument(() => { if (navigator.serviceWorker) navigator.serviceWorker.register = () => Promise.reject(new Error('proof: SW disabled')); });
  try {
    await page.goto(url, { waitUntil: 'load', timeout: 120000 });
    await page.waitForFunction(() => window.BK && document.querySelectorAll('.racer-tile').length === 17, { timeout: 90000 });
    await page.evaluate(i => { BK.start(0, i); BK.skipCountdown(); BK.autopilot(true); BK.setTimescale(3); }, tr.idx);
    await page.waitForFunction(() => BK.state().state === 'racing', { timeout: 30000, polling: 400 });
    const waitT = t => page.waitForFunction(tt => BK.state().raceTime >= tt, { timeout: 300000, polling: 500 }, t);
    await waitT(4);
    const s3 = await page.evaluate(() => BK.state());
    await waitT(11);
    const s7 = await page.evaluate(() => BK.state());
    // swing the camera shot: screenshot mid-race with the field around the player
    await page.screenshot({ path: join(ROOT, 'tracks', 'proof', `${tr.id}.png`) });
    const prog = s7.player.continuous - s3.player.continuous;
    const finite = [s7.player, ...s7.karts].every(k => Number.isFinite(k.continuous));
    console.log(`${tr.name}: t4 cont=${s3.player.continuous.toFixed(0)} t11 cont=${s7.player.continuous.toFixed(0)} progress=${prog.toFixed(0)} rank=${s7.player.rank} speed=${s7.player.speed.toFixed(1)} errors=${errors.length}`);
    // Threshold calibrated against the known-good track 0: bot-test progresses
    // ~17 samples/race-second from a standing start under SwiftShader, so 7
    // race-seconds should yield ~120; 85 leaves margin for a loaded CI box.
    if (!(prog > 85)) throw new Error(`player barely progressed (${prog.toFixed(0)} samples in 7 race-seconds)`);
    if (!finite) throw new Error('non-finite kart state');
    if (errors.length) throw new Error('page errors: ' + errors.join(' | '));
    console.log(`  ✓ screenshot tracks/proof/${tr.id}.png`);
  } catch (e) {
    failures++;
    console.error(`  ✗ ${tr.name}: ${e.message}`);
    if (errors.length) console.error('    errors:', errors.join(' | '));
  }
  await ctx.close();
}
await browser.close();
server.close();
if (failures) { console.error(`PROOF FAILED for ${failures} track(s)`); process.exit(1); }
console.log('PROOF PASSED: all 4 Batch 3 tracks race clean.');
