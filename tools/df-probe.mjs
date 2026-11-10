/* Drive-feel evidence probe v2 — ALL waits keyed to RACE time, never wall-clock
   (under VM contention the game clock can run ~100x slower than wall time; v1's
   wall-clock loops elapsed during the countdown and produced garbage evidence).
   (A) shoulder/deep-offroad speed on Mars via closed-loop steering on the start
   straight; (B) item-box ghost respawn on Silicon Valley by holding the player
   at the line so the pack kills the first row ~2 game-s ahead of the player.
   Uses only window.BK. Screenshots are written ONLY when their telemetry gate
   passed — a shot without valid samples is never saved. */
import http from 'http';
import { readFile, mkdir } from 'fs/promises';
import { extname, join, normalize } from 'path';
import puppeteer from 'puppeteer';

const ROOT = '/home/hatch/workspace/bk-drivefeel';
const OUT = join(ROOT, 'screenshots/pr-drive-feel');
await mkdir(OUT, { recursive: true });
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
const threeCode = await readFile(join(ROOT, 'tools/vendor/three.module.js'), 'utf-8');
const addonCache = new Map();
const intercept = p => p.on('request', async r => {
  const u = r.url(), marker = '/examples/jsm/';
  if (u.includes(marker)) {
    const rel = u.split(marker)[1].split('?')[0];
    try {
      if (!addonCache.has(rel)) addonCache.set(rel, await readFile(join(ROOT, 'tools/vendor/addons', rel), 'utf-8'));
      r.respond({ status: 200, contentType: 'text/javascript; charset=utf-8', headers: { 'Access-Control-Allow-Origin': '*' }, body: addonCache.get(rel) });
    } catch { r.respond({ status: 404, body: 'addon not vendored: ' + rel }); }
  } else if (u.includes('cdn.jsdelivr.net/npm/three@')) {
    r.respond({ status: 200, contentType: 'text/javascript; charset=utf-8', headers: { 'Access-Control-Allow-Origin': '*' }, body: threeCode });
  } else r.continue();
});
const sleep = ms => new Promise(r => setTimeout(r, ms));
const angNorm = a => ((a + Math.PI) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI) - Math.PI;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox', '--disable-setuid-sandbox', '--enable-unsafe-swiftshader', '--use-angle=swiftshader', '--mute-audio', '--window-size=1280,800'] });
const errors = [];
async function newRacePage() {
  const page = await browser.newPage();
  await page.evaluateOnNewDocument(() => { try { localStorage.setItem('bk-quality', 'low'); } catch (e) { } });
  await page.setViewport({ width: 1280, height: 800 });
  await page.setRequestInterception(true);
  intercept(page);
  page.on('pageerror', e => errors.push('[pageerror] ' + e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push('[console] ' + m.text()); });
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 420000 });
  await page.waitForFunction(() => window.BK && document.querySelectorAll('.racer-tile').length === 17, { timeout: 420000, polling: 1000 });
  return page;
}
const S = page => page.evaluate(() => BK.state());
async function setIn(page, o) { await page.evaluate(o => BK.setInput(o), o); }
// poll state until pred(state) or the RACE-time budget (game seconds) runs out
async function until(page, pred, raceBudget, s0) {
  let s = s0 || await S(page);
  const t0 = s.raceTime;
  for (let i = 0; i < 4000; i++) {
    if (pred(s)) return s;
    if (s.raceTime - t0 > raceBudget) return s;
    await sleep(100);
    s = await S(page);
  }
  return s;
}

/* ---------- Phase A: Mars shoulder + deep offroad speed ---------- */
const SKIP_A = !!process.env.DF_SKIP_A;
const result = { A: {}, B: {}, errors };
if (!SKIP_A) {
try {
  const page = await newRacePage();
  await page.evaluate(() => { BK.start(0, 1); BK.skipCountdown(); BK.setTimescale(3); });
  await page.waitForFunction(() => BK.state().state === 'racing', { timeout: 240000, polling: 500 });
  let s = await S(page);
  const P0 = s.player.pos.slice(), h0 = s.player.heading;
  const latOf = p => (p.pos[0] - P0[0]) * Math.cos(h0) - (p.pos[2] - P0[2]) * Math.sin(h0);
  await setIn(page, { throttle: 1, steer: 0 });
  s = await until(page, x => x.player.speed > 30, 14, s);
  result.A.launchSpeed = +s.player.speed.toFixed(1);
  if (s.player.speed <= 30) throw new Error('never reached speed 30 (raceTime ' + s.raceTime.toFixed(1) + ')');
  // find which steer sign increases |lat|: steer 0.75 for 0.6 game-s
  await setIn(page, { throttle: 1, steer: 0.75 });
  const latBefore = latOf(s.player), tMark = s.raceTime;
  s = await until(page, x => x.raceTime - tMark > 0.6, 3, s);
  const sign = Math.sign(latOf(s.player) - latBefore) || 1;
  result.A.steerSign = sign;
  // exit to the OPPOSITE side: the tested side has Mars's start-straight slab dressing
  // right where the kart exits (both A shots framed against it, road out of frame).
  const exitSteer = -0.75; await setIn(page, { throttle: 1, steer: exitSteer });
  // drive out to the shoulder band (|lat| ~12.6), checking each poll
  for (let i = 0; i < 4000 && Math.abs(latOf(s.player)) < 12.6; i++) { await sleep(90); s = await S(page); const Le = Math.abs(latOf(s.player)); if (!result.A._shotA && Le > 10.5 && Le < 14.8 && s.player.speed > 25) { result.A._shotA = true; await page.screenshot({ path: join(OUT, 'shoulder-speed.png') }); } }
  result.A.latAfterExit = +latOf(s.player).toFixed(1);
  if (Math.abs(latOf(s.player)) < 11.5) throw new Error('never reached the shoulder band, lat=' + result.A.latAfterExit);
  // parallel hold in the shoulder band for 2.5 game-s, log speeds in-band
  await page.evaluate(() => BK.setTimescale(1.5));
  const shoulderSpeeds = [];
  const holdStart = s.raceTime;
  while (s.raceTime - holdStart < 2.5) {
    const e = angNorm(s.player.heading - h0);
    await setIn(page, { throttle: 1, steer: clamp(e * 2.2, -1, 1) });
    const L = Math.abs(latOf(s.player));
    if (L > 11.2 && L < 14.8 && s.player.speed > 5) { shoulderSpeeds.push(+s.player.speed.toFixed(1)); if (!result.A._shotA && s.player.speed > 28) { result.A._shotA = true; await page.screenshot({ path: join(OUT, 'shoulder-speed.png') }); } }
    await sleep(90);
    s = await S(page);
  }
  result.A.shoulder = { samples: shoulderSpeeds.length, avg: +(shoulderSpeeds.reduce((a, b) => a + b, 0) / Math.max(1, shoulderSpeeds.length)).toFixed(1), max: shoulderSpeeds.length ? +Math.max(...shoulderSpeeds).toFixed(1) : null, latNow: +latOf(s.player).toFixed(1) };
  if (shoulderSpeeds.length >= 5 && !result.A._shotA) await page.screenshot({ path: join(OUT, 'shoulder-speed.png') });
  else result.A.shoulderShotSkipped = 'fewer than 5 in-band samples';
  // drive deeper: |lat| ~20 (the old invisible wall sat at 16)
  await page.evaluate(() => BK.setTimescale(2));
  await setIn(page, { throttle: 1, steer: exitSteer });
  for (let i = 0; i < 4000 && Math.abs(latOf(s.player)) < 20; i++) { await sleep(90); s = await S(page); }
  result.A.latDeep = +latOf(s.player).toFixed(1);
  const deepSpeeds = [];
  const holdStart2 = s.raceTime;
  while (s.raceTime - holdStart2 < 2.2) {
    const e = angNorm(s.player.heading - h0);
    await setIn(page, { throttle: 1, steer: clamp(e * 2.2, -1, 1) });
    const L = Math.abs(latOf(s.player));
    if (L > 17 && s.player.speed > 3) { deepSpeeds.push(+s.player.speed.toFixed(1)); if (!result.A._shotD) { result.A._shotD = true; await page.screenshot({ path: join(OUT, 'deep-offroad.png') }); } }
    await sleep(90);
    s = await S(page);
  }
  result.A.deep = { samples: deepSpeeds.length, avg: +(deepSpeeds.reduce((a, b) => a + b, 0) / Math.max(1, deepSpeeds.length)).toFixed(1), min: deepSpeeds.length ? +Math.min(...deepSpeeds).toFixed(1) : null, latNow: +latOf(s.player).toFixed(1) };
  if (deepSpeeds.length >= 5 && !result.A._shotD) await page.screenshot({ path: join(OUT, 'deep-offroad.png') });
  else result.A.deepShotSkipped = 'fewer than 5 deep samples';
  await page.close();
} catch (e) { result.A.error = e.message; } }
if (SKIP_A) result.A = { skipped: true };

/* ---------- Phase B: ghost item box (Silicon Valley) ---------- */
if (process.env.DF_SKIP_B) { result.B = { skipped: true }; } else try {
  const page = await newRacePage();
  await page.evaluate(() => { BK.start(0, 0); BK.skipCountdown(); BK.setTimescale(3); });
  await page.waitForFunction(() => BK.state().state === 'racing', { timeout: 240000, polling: 500 });
  await page.evaluate(() => BK.setTimescale(1));
  // hold the player at the line ~2.2 game-s so the pack kills the first row ahead of us
  await page.evaluate(() => { BK.autopilot(false); });
  await setIn(page, { throttle: 0, brake: 1 });
  let s = await S(page);
  const t0 = s.raceTime;
  while (s.raceTime - t0 < 2.2) { await sleep(100); s = await S(page); }
  await page.evaluate(() => { BK.clearInput(); BK.autopilot(true); BK.setTimescale(2); });
  // wait for the pack's leader to cross the first box row (continuous >= 91)
  let T = null;
  for (let i = 0; i < 900; i++) {
    s = await S(page);
    const packMax = Math.max(...s.karts.map(k => k.continuous));
    if (packMax >= 91) { T = s.raceTime; break; }
    await sleep(100);
  }
  result.B.packCrossRaceTime = T;
  if (T === null) throw new Error('pack never crossed the first box row');
  await page.evaluate(() => BK.setTimescale(0.5));
  // burst screenshots across the ghost window (respawn 2.5 game-s, ghost from +1.9)
  let shot = 0;
  while (true) {
    s = await S(page);
    const dt = s.raceTime - T;
    if (dt >= 1.95 && shot < 4) {
      await page.screenshot({ path: join(OUT, `ghost-box-${shot}.png`), clip: { x: 290, y: 150, width: 700, height: 500 } });
      result.B['shot' + shot] = { raceDt: +dt.toFixed(2), playerCont: +s.player.continuous.toFixed(1), playerSpeed: +s.player.speed.toFixed(1) };
      shot++;
    }
    if (dt > 2.6 || shot >= 4) break;
    await sleep(80);
  }
  await page.screenshot({ path: join(OUT, 'ghost-box-full.png') });
  result.B.finalPlayerCont = +s.player.continuous.toFixed(1);
  result.B.shotsTaken = shot;
  await page.close();
} catch (e) { result.B.error = e.message; }

result.errors = errors.slice(0, 6);
console.log(JSON.stringify(result, null, 1));
await browser.close();
server.close();
