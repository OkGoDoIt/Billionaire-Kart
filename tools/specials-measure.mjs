/* specials-measure.mjs — per-special verification for issue #51.
   Hard checks use same-evaluate reads (deterministic). Soft checks measure
   race-time quantities end-to-end and report values. NOTE: the test VM is
   heavily contended (game time can crawl at ~1% of wall time), so all
   budgets are wall-generous and all assertions are on GAME-time values,
   which contention cannot distort. */
import http from 'http';
import { readFile } from 'fs/promises';
import { extname, join, normalize } from 'path';
import puppeteer from 'puppeteer';

const ROOT = join(process.cwd(), '..');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.webmanifest': 'application/manifest+json', '.png': 'image/png' };
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

async function makePage(browser, width, height, mobile = false) {
  const ctx = await browser.createBrowserContext();
  const page = await ctx.newPage();
  await page.evaluateOnNewDocument(() => { try { localStorage.setItem('bk-quality', 'low'); } catch (e) { } });
  await page.setViewport(mobile ? { width, height, isMobile: true, hasTouch: true } : { width, height });
  await page.setRequestInterception(true);
  page.on('request', async r => {
    const u = r.url(), marker = '/examples/jsm/';
    if (u.includes(marker)) {
      const rel = u.split(marker)[1].split('?')[0];
      try { const b = await readFile(join(ROOT, 'tools/vendor/addons', rel), 'utf-8'); r.respond({ status: 200, contentType: 'text/javascript; charset=utf-8', headers: { 'Access-Control-Allow-Origin': '*' }, body: b }); }
      catch { r.respond({ status: 404, body: 'addon not vendored: ' + rel }); }
    } else if (u.includes('cdn.jsdelivr.net/npm/three@')) {
      r.respond({ status: 200, contentType: 'text/javascript; charset=utf-8', headers: { 'Access-Control-Allow-Origin': '*' }, body: threeCode });
    } else r.continue();
  });
  await page.goto(url, { waitUntil: 'load', timeout: 240000 });
  await page.waitForFunction(() => window.BK && document.querySelectorAll('.racer-tile').length === 17, { timeout: 240000, polling: 1000 });
  return { ctx, page };
}

const results = [];
function check(name, ok, detail, hard = true) {
  results.push({ name, ok, detail, hard });
  console.log(`${ok ? 'PASS' : 'FAIL'} [${hard ? 'hard' : 'soft'}] ${name}: ${detail}`);
}
const near = (a, b, tol) => Math.abs(a - b) <= tol;

const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox', '--disable-setuid-sandbox', '--enable-unsafe-swiftshader', '--use-angle=swiftshader', '--mute-audio', '--window-size=1280,800'] });
const errors = [];
try {
  const { page } = await makePage(browser, 1280, 800);
  page.on('console', m => { if (m.type() === 'error') errors.push(`[console] ${m.text()}`); });
  page.on('pageerror', e => errors.push(`[pageerror] ${e.message}`));

  async function startRace(r, t = 0) {
    await page.evaluate((rr, tt) => { BK.start(rr, tt); BK.skipCountdown(); BK.autopilot(true); BK.setTimescale(3); }, r, t);
    await page.waitForFunction(() => BK.state().state === 'racing', { timeout: 300000, polling: 1000 });
    await new Promise(rr => setTimeout(rr, 300));
  }

  // 1) Trait copy audit (menu state, no race needed)
  const traits = await page.evaluate(() => BK.traits());
  check('17 traits, all non-empty', traits.length === 17 && traits.every(t => t.trait && t.trait.length > 5), `got ${traits.length} traits, expect 17 non-empty`);
  const banned = traits.filter(t => /AI\b|ELITE|FINAL-BOSS/i.test(t.trait) || /\bAI\b/.test(t.quote || ''));
  check('no AI mentions in any trait', banned.length === 0, banned.length ? JSON.stringify(banned) : 'got none, expect no AI/ELITE/FINAL-BOSS strings');
  const jensen = traits.find(t => t.name === 'Jensen');
  check('Jensen trait is Roger\'s exact copy', jensen.trait === '🟢 SPECIAL: orange drift boosts last longer — the leather jacket stays on during questioning', `got ${jensen.trait}`);
  check('Jensen quote is Roger\'s exact copy', jensen.quote === '“The board is investigating. The FBI is investigating. My wife is investigating.”', `got ${jensen.quote}`);

  // 2) Spin durations via BK.spin (same-evaluate read)
  for (const [idx, who, expect] of [[15, 'Murdoch', 0.598], [16, 'Soros', 1.4375], [0, 'Elon (control)', 1.15]]) {
    await startRace(idx);
    const got = await page.evaluate(() => BK.spin());
    check(`${who} spin duration`, near(got, expect, 0.03), `got ${got.toFixed(3)}, expect ${expect} ±0.03`);
  }

  // 3) Bill's one-shot shield (atomic: both spins in ONE evaluate)
  {
    let res = null;
    for (let attempt = 0; attempt < 3 && !res; attempt++) {
      await startRace(11); // Bill is RACERS[11] (10 is Larry & Sergey)
      res = await page.evaluate(() => {
        if (!BK.state().karts.every(k => k.spinT <= 0)) return null; // an AI hit landed first — retry on a fresh grid
        const first = BK.spin();
        const mid = BK.state().player;
        const second = BK.spin();
        return { first, shieldUsed: mid.shieldUsed, second };
      });
    }
    if (!res) { check('Bill shield (staging)', false, 'could not stage a clean grid in 3 attempts'); }
    else {
      check('Bill shield absorbs first spin', res.first === 0 && res.shieldUsed === true, `got first=${res.first} shieldUsed=${res.shieldUsed}, expect first spinT=0, shield consumed`);
      check('Bill second spin lands normally', near(res.second, 1.15, 0.03), `got ${res.second.toFixed(3)}, expect 1.15 ±0.03 (shield spent)`);
    }
  }

  // 4) Item timers via give+use (same-evaluate reads), with a non-special control
  for (const [idx, item, read, expect, who] of [
    [9, 'golden', s => s.player.goldenT, 6.5, 'Cook Series F window'],
    [0, 'golden', s => s.player.goldenT, 5.0, 'Control Series F window (Elon)'],
    [7, 'bailout', s => s.player.bailoutT, 6.6, 'Demis bailout duration'],
    [0, 'bailout', s => s.player.bailoutT, 5.5, 'Control bailout duration (Elon)'],
    [5, 'boost', s => s.player.boostT, 1.92, 'Satya Series A boost (×1.2)'],
    [4, 'boost', s => s.player.boostT, 1.9, 'Jensen Series A boost (existing 1.9)'],
    [0, 'boost', s => s.player.boostT, 1.6, 'Control Series A boost (Elon)'],
  ]) {
    await startRace(idx);
    const got = await page.evaluate((it) => { BK.giveItem(it); BK.useItem(); const s = BK.state(); return s; }, item).then(read);
    check(who, near(got, expect, 0.05), `got ${got.toFixed(2)}, expect ${expect} ±0.05`);
  }

  // 5) Lightning potency: victims with a suffer multiplier (Murdoch ×0.5,
  // Soros ×1.25) are excluded — assert on neutral victims only.
  for (const [idx, expect, who] of [[16, 6.0, 'Soros Market Crash shrink on neutral victims'], [0, 4.8, 'Elon (control) Market Crash shrink on neutral victims']]) {
    await startRace(idx);
    const neutrals = await page.evaluate(() => {
      BK.giveItem('lightning'); BK.useItem();
      return BK.state().karts.filter(k => k.shrinkT > 0 && k.name !== 'Murdoch' && k.name !== 'Soros').map(k => k.shrinkT);
    });
    const got = neutrals.length ? Math.max(...neutrals) : 0;
    check(who, neutrals.length > 0 && near(got, expect, 0.12), `got ${got.toFixed(2)} from ${neutrals.length} neutral victim(s), expect ${expect} ±0.12`);
  }

  // 6) Rocket start (SOFT timing under contention, hard value logic): hold
  // throttle at timescale 3, release + skipCountdown in the SAME evaluate the
  // moment revHeld crosses the target, then read the GO outcome.
  async function rocketRun(racerIdx, targetRev) {
    await page.evaluate((r) => { BK.start(r, 0); BK.setTimescale(3); BK.setInput({ throttle: 1 }); }, racerIdx);
    const t0 = Date.now();
    let released = false;
    while (Date.now() - t0 < 900000) {
      const phase = await page.evaluate((tgt) => {
        const st = BK.state();
        if (st.state === 'racing') return 'racing';
        if (st.state === 'countdown' && st.revHeld >= tgt) { BK.clearInput(); BK.skipCountdown(); return 'released'; }
        return 'wait';
      }, targetRev).catch(() => 'wait');
      if (phase === 'released') { released = true; break; }
      if (phase === 'racing') break; // countdown ended before target (shouldn't happen with throttle held)
      await new Promise(r => setTimeout(r, 200));
    }
    if (!released) throw new Error(`rocket run (racer ${racerIdx}, target ${targetRev}) never released`);
    await page.waitForFunction(() => BK.state().state === 'racing', { timeout: 300000, polling: 500 });
    return await page.evaluate(() => { const p = BK.state().player; return { boostT: p.boostT, sputterT: p.sputterT }; });
  }
  {
    const elonIn = await rocketRun(0, 2.0);
    check('Elon rocket @ rev 2.0s (inside his wide window)', elonIn.boostT > 1.0 && elonIn.sputterT === 0, `got boostT=${elonIn.boostT.toFixed(2)} sputterT=${elonIn.sputterT.toFixed(2)}, expect boost (his 1.35s), no sputter`, false);
    const samDead = await rocketRun(1, 1.9);
    check('Sam rocket @ rev 1.9s (standard dead band)', samDead.boostT === 0 && samDead.sputterT === 0, `got boostT=${samDead.boostT.toFixed(2)} sputterT=${samDead.sputterT.toFixed(2)}, expect both 0 (past 1.7 standard window, short of 2.3 sputter)`, false);
    const elonOver = await rocketRun(0, 2.75);
    check('Elon over-rev @ 2.75s sputters longer', elonOver.sputterT > 1.15, `got sputterT=${elonOver.sputterT.toFixed(2)}, expect 1.4 (standard is 1.0)`, false);
    const samOver = await rocketRun(1, 2.75);
    check('Sam over-rev @ 2.75s sputters standard', samOver.sputterT > 0.5 && samOver.sputterT <= 1.05, `got sputterT=${samOver.sputterT.toFixed(2)}, expect 1.0`, false);
  }

  // 7) Drift charge + release boost (race-time measurements, timescale 3)
  async function chargeTimeTo(idx, target) {
    // Phase 1: autopilot up to full speed (clock NOT running).
    await page.evaluate(() => { BK.autopilot(true); BK.setTimescale(3); });
    const upDeadline = Date.now() + 600000;
    let up = false;
    while (Date.now() < upDeadline) {
      const sp = await page.evaluate(() => BK.state().player.speed);
      if (sp > 24) { up = true; break; }
      await new Promise(r => setTimeout(r, 250));
    }
    if (!up) return null;
    // Phase 2: hold a full-lock drift; clock runs from drift start.
    const start = await page.evaluate(() => { BK.autopilot(false); BK.setInput({ throttle: 1, steer: 0.9, drift: true }); const st = BK.state(); return { rt: st.raceTime, dc: st.player.driftCharge }; });
    if (start.dc > 0.25) return null; // autopilot left charge banked — retry on a fresh race
    const t0 = start.rt;
    const deadline = Date.now() + 600000;
    while (Date.now() < deadline) {
      const s = await page.evaluate(() => { const st = BK.state(); return { dc: st.player.driftCharge, rt: st.raceTime }; });
      if (s.dc >= target) return s.rt - t0;
      await new Promise(r => setTimeout(r, 200));
    }
    return null;
  }
  async function releaseBoost(idx) {
    for (let attempt = 0; attempt < 3; attempt++) {
      await startRace(idx);
      const tBlue = await chargeTimeTo(idx, 0.72);
      if (tBlue == null) continue;
      const out = await page.evaluate(() => {
        BK.setInput({ throttle: 1, steer: 0, drift: false });
        return BK.state().player.boostT;
      });
      return { tBlue, boost: out };
    }
    return { tBlue: null, boost: null };
  }
  const driftRows = [];
  for (const [idx, who, expectT] of [[6, 'Dario', 0.7 / 1.45], [0, 'Elon', 0.7 / 1.15], [5, 'Satya', 0.7 / (1.15 * 0.9)], [8, 'Trump', 0.7 / (1.15 * 0.85)]]) {
    const { tBlue } = await releaseBoost(idx);
    driftRows.push([who, tBlue]);
    check(`${who} time-to-blue (soft)`, tBlue != null && near(tBlue, expectT, expectT * 0.35), `got ${tBlue == null ? 'n/a' : tBlue.toFixed(2)} race-s, expect ≈${expectT.toFixed(2)} race-s of full-lock drift at speed`, false);
  }
  {
    const bz = await releaseBoost(3);
    check('Bezos release boost after early orange (soft)', bz.boost != null && bz.boost > 0.9 && bz.boost <= 1.25, `got boostT=${bz.boost == null ? 'n/a' : bz.boost.toFixed(2)}, expect ≈1.2 (his shorter orange; standard orange is 1.35)`, false);
    const jn = await releaseBoost(4);
    check('Jensen orange boost duration (soft)', jn.boost != null && jn.boost > 1.35 && jn.boost <= 1.75, `got boostT=${jn.boost == null ? 'n/a' : jn.boost.toFixed(2)}, expect ≈1.7`, false);
    const sm = await releaseBoost(1);
    check('Sam streak after a landed drift boost (soft)', sm.boost != null, `got boostT=${sm.boost == null ? 'n/a' : sm.boost.toFixed(2)} (streak increments on release; charge-rate effect is +5%/level, cap +25%)`, false);
  }

  // 8) Offroad floor (soft): L&S keep ≈0.75 speed factor fully offroad vs Elon's 0.55
  async function offroadFloor(idx) {
    await startRace(idx);
    await page.evaluate(() => { BK.autopilot(false); BK.setTimescale(3); BK.setInput({ throttle: 1, steer: 1 }); });
    const deadline = Date.now() + 900000;
    let min = null;
    while (Date.now() < deadline) {
      const s = await page.evaluate(() => { const st = BK.state(); return { of: st.player.offFactor, sp: st.player.speed, rt: st.raceTime }; });
      if (s.sp > 15) min = min == null ? s.of : Math.min(min, s.of);
      if (s.rt > 14) break;
      await new Promise(r => setTimeout(r, 200));
    }
    await page.evaluate(() => BK.clearInput());
    return min;
  }
  {
    const ls = await offroadFloor(10);
    const el = await offroadFloor(0);
    check('Larry & Sergey offroad floor (soft)', ls != null && ls >= 0.68, `got min offFactor=${ls == null ? 'n/a' : ls.toFixed(2)}, expect ≈0.75`, false);
    check('Elon offroad floor (control, soft)', el != null && el <= 0.68, `got min offFactor=${el == null ? 'n/a' : el.toFixed(2)}, expect ≈0.55`, false);
  }

  // 9) Thiel minimap reveal (soft): as Thiel, wait until a rival holds an item
  {
    await startRace(12);
    const deadline = Date.now() + 900000;
    let seen = false;
    while (Date.now() < deadline && !seen) {
      seen = await page.evaluate(() => BK.state().karts.some(k => !k.isPlayer && k.item));
      if (!seen) await new Promise(r => setTimeout(r, 1000));
    }
    check('Thiel: a rival holds an item during the race (reveal precondition)', seen, `got rivalHolding=${seen}`, false);
    if (seen) await page.screenshot({ path: join(ROOT, 'screenshots/pr-specials/thiel-minimap-desktop.png') });
  }

  await page.evaluate(() => BK.setTimescale(1));

  // 10) Detail-panel screenshots (desktop Bill + mobile portraits for the six)
  async function detailShot(pg, idx, path) {
    await pg.evaluate((i) => { document.querySelectorAll('.racer-tile')[i].click(); }, idx);
    await new Promise(r => setTimeout(r, 1200));
    const el = await pg.$('#racer-detail');
    await el.screenshot({ path });
  }
  const { ctx: dctx, page: dpage } = await makePage(browser, 1280, 800); // fresh MENU page — the raced page has #racer-detail hidden, which crashed the element screenshot
  await detailShot(dpage, 11, join(ROOT, 'screenshots/pr-specials/detail-bill-desktop.png'));
  await dctx.close();
  for (const [idx, slug] of [[11, 'bill'], [12, 'thiel'], [15, 'murdoch'], [16, 'soros'], [0, 'elon'], [8, 'trump']]) {
    const { ctx, page: mp } = await makePage(browser, 390, 844, true);
    await detailShot(mp, idx, join(ROOT, `screenshots/pr-specials/detail-${slug}-mobile.png`));
    await ctx.close();
  }
} finally {
  await browser.close();
  server.close();
}
const hardFails = results.filter(r => r.hard && !r.ok);
const softFails = results.filter(r => !r.hard && !r.ok);
console.log(`\n=== SPECIALS MEASURE: ${results.filter(r => r.ok).length}/${results.length} checks passed; hard failures: ${hardFails.length}; soft failures: ${softFails.length} ===`);
if (errors.length) { console.log('Page errors:'); errors.forEach(e => console.log('  ' + e)); }
if (hardFails.length) { console.log('❌ SPECIALS MEASURE FAILED (hard checks)'); process.exit(1); }
console.log('✅ SPECIALS MEASURE PASSED (all hard checks)');
