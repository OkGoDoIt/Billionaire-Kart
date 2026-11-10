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
// three/addons modules (post chain, RoundedBoxGeometry) are vendored too — serve
// each by its path; a missing addon 404s loudly instead of silently serving the
// wrong file (the bug this replaces: every CDN URL used to get three.module.js).
const addonCache = new Map();
const intercept = p => p.on('request', async r => {
  const u = r.url(), marker = '/examples/jsm/';
  if (u.includes(marker)) {
    const rel = u.split(marker)[1].split('?')[0];
    try {
      if (!addonCache.has(rel)) addonCache.set(rel, await readFile(join(vendorDir, 'addons', rel), 'utf-8'));
      r.respond({ status: 200, contentType: 'text/javascript; charset=utf-8', headers: { 'Access-Control-Allow-Origin': '*' }, body: addonCache.get(rel) });
    } catch { r.respond({ status: 404, body: 'addon not vendored: ' + rel }); }
  } else if (u.includes('cdn.jsdelivr.net/npm/three@')) {
    r.respond({ status: 200, contentType: 'text/javascript; charset=utf-8', headers: { 'Access-Control-Allow-Origin': '*' }, body: threeCode });
  } else r.continue();
});

const errors = [];
let browser;
try {
  browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--enable-unsafe-swiftshader', '--use-angle=swiftshader', '--mute-audio', '--window-size=1280,800'],
  });
  const page = await browser.newPage();
  await page.evaluateOnNewDocument(() => { try { localStorage.setItem('bk-quality', 'low'); } catch (e) { } }); // CI: bloom off — SwiftShader + composer otherwise crawls; visuals are QA-harness territory
  await page.setViewport({ width: 1280, height: 800 });
  await page.setRequestInterception(true);
  intercept(page);
  page.on('console', m => { if (m.type() === 'error') errors.push(`[console] ${m.text()}`); });
  page.on('pageerror', e => errors.push(`[pageerror] ${e.message}`));
  page.on('requestfailed', r => { if (!r.url().includes('sw.js')) errors.push(`[requestfailed] ${r.url()} ${r.failure()?.errorText}`); });

  await page.goto(url, { waitUntil: 'load', timeout: 180000 }); // 'load', not networkidle2: SW revalidate fetches + shared-CPU contention make idle waits fragile
  await page.waitForFunction(() => window.BK && document.querySelectorAll('.racer-tile').length === 17, { timeout: 90000 });
  await new Promise(r => setTimeout(r, 2500)); // let the menu orbit render a few frames
  const menuState = await page.evaluate(() => BK.state());
  console.log('Menu state:', menuState.state, '| karts:', menuState.karts.length);
  // Character Select v2: 17 portrait tiles, every tile has a data-URI portrait + radar, tap updates the detail panel
  const csCheck = await page.evaluate(() => {
    const tiles = document.querySelectorAll('.racer-tile');
    const imgs = document.querySelectorAll('.racer-tile img.tile-portrait');
    const radars = document.querySelectorAll('.racer-tile svg.pie');
    tiles[5].click();
    return { tiles: tiles.length, imgs: imgs.length, dataSrc: [...imgs].every(im => im.src.startsWith('data:image/')), pies: radars.length, detail: document.getElementById('detail-name')?.textContent || '' };
  });
  console.log('Character Select v2:', JSON.stringify(csCheck));
  if (!(csCheck.tiles === 17 && csCheck.imgs === 17 && csCheck.dataSrc && csCheck.pies === 17 && csCheck.detail === 'Satya')) throw new Error('ASSERT FAILED: character select v2 checks ' + JSON.stringify(csCheck));
  await page.screenshot({ path: join(ROOT, 'screenshots/menu.png') });
  console.log('Saved screenshots/menu.png');

  // start a race, skip countdown, let the AI drive the player kart.
  // Headless SwiftShader renders at a few fps and the game clock is dt-clamped,
  // so speed the game clock up and key every wait to RACE time, not wall-clock.
  await page.evaluate(() => { BK.start(0, 0); BK.skipCountdown(); BK.autopilot(true); BK.setTimescale(3); });
  await page.waitForFunction(() => BK.state().state === 'racing', { timeout: 90000, polling: 400 });
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
  intercept(page2);
  page2.on('console', m => { if (m.type() === 'error') errors.push(`[mobile console] ${m.text()}`); });
  page2.on('pageerror', e => errors.push(`[mobile pageerror] ${e.message}`));
  page2.on('requestfailed', r => { if (!r.url().includes('sw.js')) errors.push(`[mobile requestfailed] ${r.url()}`); });
  await page2.emulate({ viewport: { width: 932, height: 430, isMobile: true, hasTouch: true, isLandscape: true }, userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1' });
  await page2.evaluateOnNewDocument(() => { try { localStorage.setItem('bk-quality', 'low'); } catch (e) { } });
  // The SW's stale-while-revalidate spawns background CDN fetches that hang in the
  // sandbox and would keep networkidle2 from ever settling — disable SW in the bot.
  await page2.evaluateOnNewDocument(() => { if (navigator.serviceWorker) navigator.serviceWorker.register = () => Promise.reject(new Error('bot: SW disabled')); });
  await page2.goto(url, { waitUntil: 'load', timeout: 120000 });
  await page2.waitForFunction(() => window.BK && document.querySelectorAll('.racer-tile').length === 17, { timeout: 90000 });
  const schemeOk = await page2.evaluate(() => {
    const out = {};
    for (const s of ['buttons', 'stick1', 'sticks2', 'autog', 'dualstick']) {
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
  // Scheme 2 (Thumbstick v3, #17): press-and-HOLD on the right side = full gas
  await mkdir(join(ROOT, 'screenshots', 'pr-stick-v3'), { recursive: true });
  await page2.evaluate(() => { document.querySelector('#screen-menu [data-scheme="stick1"]').click(); BK.start(0, 0); BK.setTimescale(3); BK.skipCountdown(); });
  await page2.waitForFunction(() => BK.state().state === 'racing', { timeout: 90000, polling: 400 });
  await stickFire('pointerdown', 700, 215);
  await stickFire('pointermove', 700, 140);
  await page2.waitForFunction(() => BK.state().player.speed > 6, { timeout: 30000, polling: 300 });
  console.log('Thumbstick: hold produced speed ✓');
  await page2.screenshot({ path: join(ROOT, 'screenshots/mobile.png') });
  console.log('Saved screenshots/mobile.png (932x430 landscape)');
  // #17 v3: pull DOWN past the threshold = FULL brake — the stick must show its red
  // BRAKE state and speed must fall off a cliff (binary, not proportional)
  const vBrake = await page2.evaluate(() => BK.state().player.speed);
  await stickFire('pointermove', 700, 300); // dy = +85 from the 215 origin
  await page2.waitForFunction(() => document.getElementById('stick-a').classList.contains('braking'), { timeout: 10000 });
  console.log('Thumbstick: BRAKE visual state engaged ✓');
  await page2.screenshot({ path: join(ROOT, 'screenshots', 'pr-stick-v3', 'thumbstick-brake-mobile.png') });
  await page2.waitForFunction(v => BK.state().player.speed < v - 3, { timeout: 30000, polling: 300 }, vBrake);
  console.log('Thumbstick: binary brake dropped speed ✓');
  await stickFire('pointermove', 700, 215); // back to centre: brake releases, gas resumes
  await page2.waitForFunction(() => !document.getElementById('stick-a').classList.contains('braking'), { timeout: 10000 });
  console.log('Thumbstick: brake state cleared on release ✓');
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
  console.log('Thumbstick: left-zone tap fired item ✓');
  // #17: flick up + release fires the item
  await page2.evaluate(() => BK.giveItem('boost'));
  await stickFire('pointerdown', 700, 215, 44);
  await page2.evaluate(() => { const el = document.getElementById('stick-layer'); const mk = y => el.dispatchEvent(new PointerEvent('pointermove', { pointerId: 44, clientX: 700, clientY: y, bubbles: true, pointerType: 'touch', isPrimary: true })); mk(205); mk(140); });
  await stickFire('pointerup', 700, 140, 44);
  if (await page2.evaluate(() => BK.state().player.item) !== null) throw new Error('ASSERT FAILED: stick1 flick-up + release did not fire item');
  console.log('Thumbstick: flick-up + release fired item ✓');
  // Scheme 4 (Auto-Gas): tap gestures fire items; the kart also accelerates by itself
  await page2.evaluate(() => { document.querySelector('#screen-menu [data-scheme="autog"]').click(); BK.start(0, 0); BK.setTimescale(3); BK.skipCountdown(); });
  await page2.waitForFunction(() => BK.state().state === 'racing', { timeout: 90000, polling: 400 });
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
  await page2.waitForFunction(() => BK.state().state === 'racing', { timeout: 90000, polling: 400 });
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
  // #17 v3 NEW scheme — Dual Stick (Roger's final assignment): right stick drives, left stick steers
  await page2.evaluate(() => { document.querySelector('#screen-menu [data-scheme="dualstick"]').click(); BK.start(0, 0); BK.setTimescale(3); BK.skipCountdown(); });
  await page2.waitForFunction(() => BK.state().state === 'racing', { timeout: 90000, polling: 400 });
  await stickFire('pointerdown', 700, 215, 88); // right stick: press-and-hold = full gas
  await page2.waitForFunction(() => BK.state().player.speed > 14, { timeout: 30000, polling: 300 });
  if (await page2.evaluate(() => BK.state().touch.throttle) !== 1) throw new Error('ASSERT FAILED: dualstick right hold did not give full throttle');
  console.log('Dual Stick: right-stick hold = full gas ✓');
  await page2.screenshot({ path: join(ROOT, 'screenshots', 'pr-stick-v3', 'dualstick-mobile.png') });
  // Right-tap = DRIFT HOP mid-drive: lift + tap + re-grab + left deflection in ONE
  // evaluate, so the ~250ms grace latch bridges the lift and speed never dips
  const vHop = await page2.evaluate(() => BK.state().player.speed);
  await page2.evaluate(() => {
    const el = document.getElementById('stick-layer');
    const ev = (t, pid, x, y) => el.dispatchEvent(new PointerEvent(t, { pointerId: pid, clientX: x, clientY: y, bubbles: true, pointerType: 'touch', isPrimary: true }));
    ev('pointerup', 88, 700, 215);               // right thumb lifts (gas latches)
    ev('pointerdown', 92, 700, 215); ev('pointerup', 92, 700, 215); // right quick tap = hop
    ev('pointerdown', 94, 700, 215);             // right thumb lands again — gas never cut
    ev('pointerdown', 91, 200, 215); ev('pointermove', 91, 295, 215); // left stick deflects
  });
  await page2.waitForFunction(() => BK.state().player.drifting === true, { timeout: 20000, polling: 300 });
  const vDrift = await page2.evaluate(() => BK.state().player.speed);
  if (!(vDrift >= vHop - 1.5)) throw new Error(`ASSERT FAILED: speed dipped through the hop: ${vHop.toFixed(1)} -> ${vDrift.toFixed(1)}`);
  console.log('Dual Stick: right-tap hop + left deflection = drift, speed held by grace latch ✓');
  await stickFire('pointerup', 295, 215, 91);
  await stickFire('pointerup', 700, 215, 94);
  // Left quick tap = ITEM
  await page2.evaluate(() => BK.giveItem('boost'));
  await tapFire(200, 215, 93);
  if (await page2.evaluate(() => BK.state().player.item) !== null) throw new Error('ASSERT FAILED: dualstick left tap did not fire item');
  console.log('Dual Stick: left tap fired item ✓');
  // Right flick up + release = ITEM
  await stickFire('pointerdown', 700, 215, 88);
  await page2.evaluate(() => BK.giveItem('boost'));
  await page2.evaluate(() => { const el = document.getElementById('stick-layer'); const mk = y => el.dispatchEvent(new PointerEvent('pointermove', { pointerId: 88, clientX: 700, clientY: y, bubbles: true, pointerType: 'touch', isPrimary: true })); mk(205); mk(140); });
  await stickFire('pointerup', 700, 140, 88);
  if (await page2.evaluate(() => BK.state().player.item) !== null) throw new Error('ASSERT FAILED: dualstick flick-up + release did not fire item');
  console.log('Dual Stick: right flick-up + release fired item ✓');
  // Grace latch: lift the right thumb — throttle must HOLD, then cut after ~250ms
  await stickFire('pointerdown', 700, 215, 88);
  await page2.waitForFunction(() => BK.state().touch.throttle === 1, { timeout: 10000, polling: 100 });
  await stickFire('pointerup', 700, 215, 88);
  if (await page2.evaluate(() => BK.state().touch.throttle) !== 1) throw new Error('ASSERT FAILED: grace latch did not hold throttle after lift');
  await new Promise(r => setTimeout(r, 500));
  if (await page2.evaluate(() => BK.state().touch.throttle) !== 0) throw new Error('ASSERT FAILED: grace latch did not expire after ~250ms');
  console.log('Dual Stick: grace latch holds throttle, then expires ✓');
  // #16 P0: HUD pause button must respond in EVERY scheme — real tap -> pause menu -> Quit -> menu
  for (const s of ['buttons', 'stick1', 'sticks2', 'autog', 'dualstick']) {
    await page2.evaluate(sc => { document.querySelector(`#screen-menu [data-scheme="${sc}"]`).click(); BK.start(0, 0); BK.setTimescale(3); BK.skipCountdown(); }, s);
    await page2.waitForFunction(() => BK.state().state === 'racing', { timeout: 90000, polling: 400 });
    const box = await page2.evaluate(() => { const b = document.getElementById('btn-pause').getBoundingClientRect(); return { x: b.x + b.width / 2, y: b.y + b.height / 2 }; });
    await page2.touchscreen.tap(box.x, box.y);
    await page2.waitForFunction(() => !document.getElementById('screen-pause').classList.contains('hidden'), { timeout: 15000 });
    await page2.evaluate(() => document.getElementById('btn-quit').click());
    await page2.waitForFunction(() => BK.state().state === 'menu', { timeout: 15000 });
    console.log(`#16 pause -> menu verified in scheme: ${s} ✓`);
  }
  // #20 iOS hardening: selection/callout off, context menu suppressed, and a stolen
  // pointer (pointercancel) must reset input cleanly — no stuck throttle
  const iosFix = await page2.evaluate(() => {
    const cs = getComputedStyle(document.body);
    const menuEv = new MouseEvent('contextmenu', { bubbles: true, cancelable: true });
    const menuNotPrevented = document.getElementById('game-canvas').dispatchEvent(menuEv);
    const selEv = new Event('selectstart', { bubbles: true, cancelable: true });
    const selNotPrevented = document.body.dispatchEvent(selEv);
    return {
      userSelect: cs.userSelect || cs.webkitUserSelect || '',
      stickTouchAction: getComputedStyle(document.getElementById('stick-layer')).touchAction,
      contextmenuPrevented: !menuNotPrevented,
      selectstartPrevented: !selNotPrevented,
    };
  });
  console.log('#20 iOS hardening:', JSON.stringify(iosFix));
  if (iosFix.userSelect !== 'none') throw new Error('ASSERT FAILED: user-select is not none on body');
  if (iosFix.stickTouchAction !== 'none') throw new Error('ASSERT FAILED: stick layer touch-action is not none');
  if (!iosFix.contextmenuPrevented) throw new Error('ASSERT FAILED: contextmenu not suppressed');
  if (!iosFix.selectstartPrevented) throw new Error('ASSERT FAILED: selectstart not suppressed');
  await page2.evaluate(() => { document.querySelector('#screen-menu [data-scheme="stick1"]').click(); BK.start(0, 0); BK.setTimescale(3); BK.skipCountdown(); });
  await page2.waitForFunction(() => BK.state().state === 'racing', { timeout: 90000, polling: 400 });
  await stickFire('pointerdown', 700, 215, 61);
  await page2.waitForFunction(() => BK.state().touch.throttle === 1, { timeout: 10000, polling: 100 });
  await stickFire('pointercancel', 700, 215, 61); // Safari steals the pointer mid-hold
  await page2.waitForFunction(() => BK.state().touch.throttle === 0, { timeout: 10000, polling: 100 });
  console.log('#20: pointercancel mid-hold resets input cleanly (no stuck gas) ✓');
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
