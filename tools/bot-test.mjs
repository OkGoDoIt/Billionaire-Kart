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

  // v1.1 items: horn + bailout get hard assertions; the rest get a smoke pass.
  // give+use+read happen in ONE evaluate so no frame can consume the state first.
  await waitRaceTime(8.5);
  const hornT = await page.evaluate(() => { BK.giveItem('horn'); BK.useItem(); return BK.state().player.hornT; });
  console.log('Spin Team horn window after use:', hornT);
  if (!(hornT > 0)) throw new Error('ASSERT FAILED: horn did not open its 0.6s window');
  await waitRaceTime(9.5);
  for (const id of ['bomb', 'boo', 'blooper']) {
    await page.evaluate(i => { BK.giveItem(i); BK.useItem(); }, id);
    console.log('Smoke-used item:', id);
    await waitRaceTime(9.5 + (['bomb', 'boo', 'blooper'].indexOf(id) + 1) * 0.8);
  }
  const goldenT = await page.evaluate(() => { BK.giveItem('golden'); BK.useItem(); BK.useItem(); return BK.state().player.goldenT; });
  console.log('Series F window after double-press:', goldenT);
  if (!(goldenT > 3)) throw new Error('ASSERT FAILED: golden window did not open');
  await waitRaceTime(14);
  const bailoutT = await page.evaluate(() => { BK.giveItem('bailout'); BK.useItem(); return BK.state().player.bailoutT; });
  console.log('Government Bailout timer after use:', bailoutT);
  if (!(bailoutT > 3)) throw new Error('ASSERT FAILED: bailout did not engage');

  // advance to at least 20s of race time
  await waitRaceTime(20);
  const s1 = await page.evaluate(() => BK.state());
  console.log('Final (t=%ss): player continuous = %s, lap %s, rank %s, finished %s', s1.raceTime.toFixed(1), s1.player.continuous.toFixed(1), s1.player.lap, s1.player.rank, s1.player.finished);

  // ---- Mobile viewport (932x430 iPhone landscape) + Control Lab smoke ----
  await page.close(); // page 1's race keeps burning SwiftShader CPU and starves page 2's load
  // Fresh browser context: page 1 registered the PWA service worker, which would
  // otherwise control this page's navigation too and break the CDN module import.
  const ctx2 = await browser.createBrowserContext();
  const page2 = await ctx2.newPage();
  await page2.setRequestInterception(true);
  page2.on('request', r => {
    if (r.url().includes('cdn.jsdelivr.net/npm/three@')) r.respond({ status: 200, contentType: 'text/javascript; charset=utf-8', headers: { 'Access-Control-Allow-Origin': '*' }, body: threeCode });
    else r.continue();
  });
  page2.on('console', m => { if (m.type() === 'error') errors.push(`[mobile console] ${m.text()}`); });
  page2.on('pageerror', e => errors.push(`[mobile pageerror] ${e.message}`));
  page2.on('requestfailed', r => { if (!r.url().includes('sw.js')) errors.push(`[mobile requestfailed] ${r.url()}`); });
  await page2.emulate({ viewport: { width: 932, height: 430, isMobile: true, hasTouch: true, isLandscape: true }, userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1' });
  // The SW's stale-while-revalidate spawns background CDN fetches that hang in the
  // sandbox and would keep networkidle2 from ever settling — disable SW in the bot.
  await page2.evaluateOnNewDocument(() => { if (navigator.serviceWorker) navigator.serviceWorker.register = () => Promise.reject(new Error('bot: SW disabled')); });
  await page2.goto(url, { waitUntil: 'load', timeout: 120000 });
  await page2.waitForFunction(() => window.BK && document.querySelectorAll('.racer-card').length === 17, { timeout: 90000 });
  const schemeOk = await page2.evaluate(() => {
    const out = {};
    for (const s of ['buttons', 'stick1', 'sticks2', 'autog']) {
      document.querySelector(`#screen-menu [data-scheme="${s}"]`).click();
      out[s] = document.body.dataset.scheme === s && localStorage.getItem('bk_touch_scheme') === s;
    }
    document.querySelector('.smart-btn').click(); // auto -> on
    out.smart = localStorage.getItem('bk_smart_steer') === 'on';
    document.querySelector('.smart-btn').click(); document.querySelector('.smart-btn').click(); // back to auto
    document.querySelector('.adrift-btn').click(); // auto -> on
    out.adrift = localStorage.getItem('bk_auto_drift') === 'on';
    document.querySelector('.adrift-btn').click(); document.querySelector('.adrift-btn').click(); // back to auto
    return out;
  });
  console.log('Control Lab scheme switching + persistence:', JSON.stringify(schemeOk));
  if (!Object.values(schemeOk).every(Boolean)) throw new Error('ASSERT FAILED: scheme switching/persistence');
  const stickFire = (type, x, y, id = 42) => page2.evaluate((t, cx, cy, pid) => {
    document.getElementById('stick-layer').dispatchEvent(new PointerEvent(t, { pointerId: pid, clientX: cx, clientY: cy, bubbles: true, pointerType: 'touch', isPrimary: true }));
  }, type, x, y, id);
  // Scheme 2 (One-Thumb Stick): press right side, drag up = throttle
  await page2.evaluate(() => { document.querySelector('#screen-menu [data-scheme="stick1"]').click(); BK.start(0, 0); BK.setTimescale(3); BK.skipCountdown(); });
  await page2.waitForFunction(() => BK.state().state === 'racing', { timeout: 30000, polling: 400 });
  await stickFire('pointerdown', 700, 215);
  await stickFire('pointermove', 700, 140);
  await page2.waitForFunction(() => BK.state().player.speed > 6, { timeout: 30000, polling: 300 });
  console.log('One-Thumb Stick: drag-up produced speed ✓');
  await page2.screenshot({ path: join(ROOT, 'screenshots/mobile.png') });
  console.log('Saved screenshots/mobile.png (932x430 landscape)');
  await stickFire('pointerup', 700, 140);
  // One-Thumb: a tap on the LEFT zone fires the item (down+up in one evaluate so the tap window is deterministic)
  const tapFire = (x, y, id) => page2.evaluate((cx, cy, pid) => {
    const el = document.getElementById('stick-layer');
    const o = { pointerId: pid, clientX: cx, clientY: cy, bubbles: true, pointerType: 'touch', isPrimary: true };
    el.dispatchEvent(new PointerEvent('pointerdown', o)); el.dispatchEvent(new PointerEvent('pointerup', o));
  }, x, y, id);
  await page2.evaluate(() => BK.giveItem('boost'));
  await tapFire(150, 215, 43);
  if (await page2.evaluate(() => BK.state().player.item) !== null) throw new Error('ASSERT FAILED: stick1 left-zone tap did not fire the item');
  console.log('One-Thumb Stick: left-zone tap fired item ✓');
  // Scheme 4 (Auto-Gas): tap gestures fire items; the kart also accelerates by itself
  await page2.evaluate(() => { document.querySelector('#screen-menu [data-scheme="autog"]').click(); BK.start(0, 0); BK.setTimescale(3); BK.skipCountdown(); });
  await page2.waitForFunction(() => BK.state().state === 'racing', { timeout: 30000, polling: 400 });
  await stickFire('pointerdown', 300, 215, 50);
  await stickFire('pointermove', 345, 215, 50); // steering finger holds a line
  await page2.evaluate(() => BK.giveItem('boost'));
  await tapFire(760, 150, 51); // second finger taps
  if (await page2.evaluate(() => BK.state().player.item) !== null) throw new Error('ASSERT FAILED: autog second-finger tap did not fire item');
  await stickFire('pointerup', 345, 215, 50);
  await page2.evaluate(() => BK.giveItem('boost'));
  await tapFire(500, 200, 52); // lone tap while not steering
  if (await page2.evaluate(() => BK.state().player.item) !== null) throw new Error('ASSERT FAILED: autog lone tap did not fire item');
  console.log('Auto-Gas: second-finger tap + lone tap both fired item ✓');
  await page2.waitForFunction(() => BK.state().player.speed > 6, { timeout: 30000, polling: 300 });
  console.log('Auto-Gas: kart accelerated with zero throttle input ✓');
  // Scheme 3 (Pedal & Stick): right-side hold = instant gas; flick up = item
  await page2.evaluate(() => { document.querySelector('#screen-menu [data-scheme="sticks2"]').click(); BK.start(0, 0); BK.setTimescale(3); BK.skipCountdown(); });
  await page2.waitForFunction(() => BK.state().state === 'racing', { timeout: 30000, polling: 400 });
  await stickFire('pointerdown', 700, 215, 77);
  await page2.waitForFunction(() => BK.state().player.speed > 6, { timeout: 30000, polling: 300 });
  console.log('Pedal & Stick: right-side hold = gas ✓');
  await page2.evaluate(() => BK.giveItem('boost'));
  await page2.evaluate(() => { // two quick moves = a 65px upward flick inside one frame batch
    const el = document.getElementById('stick-layer');
    const mk = y => el.dispatchEvent(new PointerEvent('pointermove', { pointerId: 77, clientX: 700, clientY: y, bubbles: true, pointerType: 'touch', isPrimary: true }));
    mk(210); mk(145);
  });
  if (await page2.evaluate(() => BK.state().player.item) !== null) throw new Error('ASSERT FAILED: pedal flick-up did not fire item');
  console.log('Pedal & Stick: flick-up fired item ✓');
  await stickFire('pointerup', 700, 215, 77);
  await page2.close();

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
