/* Billionaire Kart bot playtest — the Fable/Battle-Drones trick:
   a headless browser actually plays the game and we check the screenshots + state.
   Fails on ANY console error / page error. Asserts the player kart progresses. */
import http from 'http';
import { readFile, writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { extname, join, normalize } from 'path';
import { fileURLToPath } from 'url';
import puppeteer from 'puppeteer';

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
const port = server.address().port;
const url = `http://127.0.0.1:${port}/index.html`;
console.log('Serving', ROOT, 'at', url);

// Headless Chromium in sandboxes often can't reach CDNs (proxy tunnels). Download
// three.module.js once via Node fetch and fulfil the CDN request by interception.
const vendorDir = join(ROOT, 'tools', 'vendor');
const threePath = join(vendorDir, 'three.module.js');
if (!existsSync(threePath)) {
  await mkdir(vendorDir, { recursive: true });
  const res = await fetch('https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js');
  if (!res.ok) throw new Error('Could not download three.module.js: HTTP ' + res.status);
  await writeFile(threePath, Buffer.from(await res.arrayBuffer()));
  console.log('Downloaded three.module.js to tools/vendor/ for request interception');
}
const threeCode = await readFile(threePath, 'utf-8');

const errors = [];
let browser;
try {
  browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--enable-unsafe-swiftshader', '--use-angle=swiftshader', '--mute-audio', '--window-size=1280,800'],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });
  await page.setRequestInterception(true);
  page.on('request', r => {
    if (r.url().includes('cdn.jsdelivr.net/npm/three@')) r.respond({ status: 200, contentType: 'text/javascript; charset=utf-8', headers: { 'Access-Control-Allow-Origin': '*' }, body: threeCode });
    else r.continue();
  });
  page.on('console', m => { if (m.type() === 'error') errors.push(`[console] ${m.text()}`); });
  page.on('pageerror', e => errors.push(`[pageerror] ${e.message}`));
  page.on('requestfailed', r => { if (!r.url().includes('sw.js')) errors.push(`[requestfailed] ${r.url()} ${r.failure()?.errorText}`); });

  await page.goto(url, { waitUntil: 'networkidle2', timeout: 90000 });
  await page.waitForFunction(() => window.BK && document.querySelectorAll('.racer-card').length === 17, { timeout: 30000 });
  await new Promise(r => setTimeout(r, 2500)); // let the menu orbit render a few frames
  const menuState = await page.evaluate(() => BK.state());
  console.log('Menu state:', menuState.state, '| karts:', menuState.karts.length);
  await page.screenshot({ path: join(ROOT, 'screenshots/menu.png') });
  console.log('Saved screenshots/menu.png');

  // start a race, skip countdown, let the AI drive the player kart.
  // Headless SwiftShader renders at a few fps and the game clock is dt-clamped,
  // so speed the game clock up and key every wait to RACE time, not wall-clock.
  await page.evaluate(() => { BK.start(0, 0); BK.skipCountdown(); BK.autopilot(true); BK.setTimescale(3); });
  await page.waitForFunction(() => BK.state().state === 'racing', { timeout: 30000, polling: 400 });
  const s0 = await page.evaluate(() => BK.state());
  console.log('Race start: player continuous =', s0.player.continuous.toFixed(1), '| rank', s0.player.rank);
  const waitRaceTime = async t => page.waitForFunction(tt => BK.state().raceTime >= tt, { timeout: 300000, polling: 500 }, t);

  // exercise items mid-race (boost, data leak [internal id 'banana'], blue) — must not throw
  await waitRaceTime(4);
  await page.evaluate(() => { BK.giveItem('boost'); BK.useItem(); });
  await waitRaceTime(5.5);
  await page.evaluate(() => { BK.giveItem('banana'); BK.useItem(); });
  await waitRaceTime(7);
  await page.evaluate(() => { BK.giveItem('blue'); BK.useItem(); });
  const sMid = await page.evaluate(() => BK.state());
  console.log('Mid-race (t=%ss): player continuous = %s, speed = %s, rank %s', sMid.raceTime.toFixed(1), sMid.player.continuous.toFixed(1), sMid.player.speed.toFixed(1), sMid.player.rank);
  await page.screenshot({ path: join(ROOT, 'screenshots/race.png') });
  console.log('Saved screenshots/race.png');

  // advance to at least 20s of race time
  await waitRaceTime(20);
  const s1 = await page.evaluate(() => BK.state());
  console.log('Final (t=%ss): player continuous = %s, lap %s, rank %s, finished %s', s1.raceTime.toFixed(1), s1.player.continuous.toFixed(1), s1.player.lap, s1.player.rank, s1.player.finished);

  // ---- assertions ----
  const assert = (cond, msg) => { if (!cond) throw new Error('ASSERT FAILED: ' + msg); };
  assert(s1.karts.length === 8, `field should be 8 karts, got ${s1.karts.length}`);
  assert(s1.raceTime >= 20, `race time only advanced to ${s1.raceTime}`);
  assert(s1.player.continuous > s0.player.continuous + 200, `player progress too small: ${s0.player.continuous} -> ${s1.player.continuous}`);
  const allFinite = [s1.player, ...s1.karts].every(k => [k.continuous, k.speed ?? 1, ...(k.pos || [])].every(Number.isFinite));
  assert(allFinite, 'NaN/Infinity found in kart state');
  assert(s1.karts.every(k => k.continuous > -60), 'some AI kart never moved: ' + JSON.stringify(s1.karts.map(k => [k.name, k.continuous])));
  if (errors.length) throw new Error('Console/page errors:\n' + errors.join('\n'));
  console.log(`\n✅ BOT TEST PASSED — race progressed ${s0.player.continuous.toFixed(0)} → ${s1.player.continuous.toFixed(0)} samples (${((s1.player.continuous - s0.player.continuous) / 900).toFixed(2)} laps), no errors.`);
} catch (e) {
  console.error('\n❌ BOT TEST FAILED:', e.message);
  if (errors.length) console.error('Errors collected:\n' + errors.join('\n'));
  process.exitCode = 1;
} finally {
  if (browser) await browser.close();
  server.close();
}
