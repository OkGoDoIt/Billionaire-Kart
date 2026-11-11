/* specials-drift-probe.mjs — corrected drift-release measurement for #51.
   The specials-measure.mjs release checks charged only to 0.72 (below Bezos's
   1.15 and the standard 1.4 orange thresholds) and read boostT synchronously
   in the same evaluate as the input release — before any frame had processed
   the release — so they read 0.00 regardless of the (code-audited correct)
   boost values. This probe charges past each racer's real orange threshold,
   releases, then polls boostT across subsequent frames and records the peak,
   paired with the drift charge observed at release. */
import http from 'http';
import { readFile } from 'fs/promises';
import { extname, join, normalize } from 'path';
import puppeteer from 'puppeteer';

const ROOT = join(process.cwd(), '..');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.webmanifest': 'application/webmanifest', '.png': 'image/png' };
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

const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox', '--disable-setuid-sandbox', '--enable-unsafe-swiftshader', '--use-angle=swiftshader', '--mute-audio', '--window-size=1280,800'] });
const results = [];
function check(name, ok, detail) { results.push({ name, ok }); console.log(`${ok ? 'PASS' : 'FAIL'} ${name}: ${detail}`); }
try {
  const ctx = await browser.createBrowserContext();
  const page = await ctx.newPage();
  await page.evaluateOnNewDocument(() => { try { localStorage.setItem('bk-quality', 'low'); } catch (e) { } });
  await page.setViewport({ width: 1280, height: 800 });
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
  page.on('pageerror', e => console.log('[pageerror]', e.message));
  await page.goto(url, { waitUntil: 'load', timeout: 240000 });
  await page.waitForFunction(() => window.BK && document.querySelectorAll('.racer-tile').length === 17, { timeout: 240000, polling: 1000 });

  async function startRace(r) {
    await page.evaluate((rr) => { BK.start(rr, 0); BK.skipCountdown(); BK.autopilot(true); BK.setTimescale(3); }, r);
    await page.waitForFunction(() => BK.state().state === 'racing', { timeout: 300000, polling: 1000 });
    await new Promise(rr => setTimeout(rr, 300));
  }

  // Charge a drift to >= target, release, and return {peakBoost, chargeAtRelease, streakAfter}
  async function driftRelease(idx, target) {
    for (let attempt = 0; attempt < 4; attempt++) {
      await startRace(idx);
      // Phase 1: autopilot to speed
      await page.evaluate(() => { BK.autopilot(true); BK.setTimescale(3); });
      const upDeadline = Date.now() + 600000;
      let up = false;
      while (Date.now() < upDeadline) {
        const sp = await page.evaluate(() => BK.state().player.speed);
        if (sp > 24) { up = true; break; }
        await new Promise(r => setTimeout(r, 250));
      }
      if (!up) continue;
      const banked = await page.evaluate(() => BK.state().player.driftCharge);
      if (banked > 0.25) continue; // autopilot left charge banked — fresh grid
      // Phase 2: hold full-lock drift, watch charge
      await page.evaluate(() => { BK.autopilot(false); BK.setInput({ throttle: 1, steer: 0.9, drift: true }); });
      const deadline = Date.now() + 600000;
      let released = false, peak = 0, atRelease = 0;
      while (Date.now() < deadline) {
        const s = await page.evaluate(() => { const st = BK.state(); return { dc: st.player.driftCharge, bt: st.player.boostT, dr: st.player.drifting }; });
        if (!released) {
          if (s.dc >= target) {
            atRelease = s.dc;
            await page.evaluate(() => BK.setInput({ throttle: 1, steer: 0, drift: false }));
            released = true;
          } else if (!s.dr && s.bt > 0) { // drift broke early (speed/wall) and a boost fired — record and retry for a clean full charge
            peak = Math.max(peak, s.bt);
            break;
          }
        } else {
          peak = Math.max(peak, s.bt);
          if (s.bt > 0 && peak > 0) { // captured the release boost across a processed frame
            const streak = await page.evaluate(() => BK.state().player.driftStreak);
            await page.evaluate(() => BK.clearInput());
            return { peak, atRelease, streak };
          }
        }
        await new Promise(r => setTimeout(r, 120));
      }
      await page.evaluate(() => BK.clearInput()).catch(() => {});
      if (released && peak > 0) return { peak, atRelease, streak: null };
    }
    return { peak: 0, atRelease: 0, streak: null };
  }

  const bz = await driftRelease(3, 1.17);
  check('Bezos orange release (charged past his 1.15 threshold)', bz.peak > 0.9 && bz.peak <= 1.26, `peak boostT=${bz.peak.toFixed(2)} at charge ${bz.atRelease.toFixed(2)}, expect ≈1.2 (his shorter orange)`);
  const jn = await driftRelease(4, 1.42);
  check('Jensen orange release (charged past the 1.4 threshold)', jn.peak > 1.35 && jn.peak <= 1.78, `peak boostT=${jn.peak.toFixed(2)} at charge ${jn.atRelease.toFixed(2)}, expect ≈1.7 (Roger-kept special)`);
  const sm = await driftRelease(1, 0.72);
  check('Sam blue release + streak increment', sm.peak > 0.5 && sm.peak <= 0.85 && sm.streak >= 1, `peak boostT=${sm.peak.toFixed(2)} (blue 0.75), driftStreak after=${sm.streak}, expect streak ≥1`);
} finally {
  await browser.close();
  server.close();
}
const fails = results.filter(r => !r.ok);
console.log(`\n=== DRIFT PROBE: ${results.length - fails.length}/${results.length} passed ===`);
process.exit(fails.length ? 1 : 0);
