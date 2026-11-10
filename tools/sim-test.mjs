/* Billionaire Kart AI-vs-AI balance harness — the Battle Drones trick, scaled down:
   fully simulated races (player slot on autopilot = mid-skill AI), measuring whether
   the fun metrics hold: win spread, lead changes, comeback rate, pack tightness.
   Usage: node sim-test.mjs   (env: BK_SIMS=24 BK_LAPS=2 BK_TIMESCALE=8) */
import http from 'http';
import { readFile, writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { extname, join, normalize } from 'path';
import { fileURLToPath } from 'url';
import puppeteer from 'puppeteer';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const SIMS = parseInt(process.env.BK_SIMS || '24');
const SIM_LAPS = parseInt(process.env.BK_LAPS || '2');
const TIMESCALE = parseFloat(process.env.BK_TIMESCALE || '8');
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

const vendorDir = join(ROOT, 'tools', 'vendor');
const threePath = join(vendorDir, 'three.module.js');
if (!existsSync(threePath)) {
  await mkdir(vendorDir, { recursive: true });
  const res = await fetch('https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js');
  if (!res.ok) throw new Error('Could not download three.module.js: HTTP ' + res.status);
  await writeFile(threePath, Buffer.from(await res.arrayBuffer()));
}
const threeCode = await readFile(threePath, 'utf-8');

const errors = [];
const browser = await puppeteer.launch({
  headless: 'new',
  protocolTimeout: 1200000, // SwiftShader keeps the main thread busy for minutes at a time
  args: ['--no-sandbox', '--disable-setuid-sandbox', '--enable-unsafe-swiftshader', '--use-angle=swiftshader', '--mute-audio', '--window-size=900,560'],
});
async function evalRetry(fn, tries = 12) {
  let last;
  for (let i = 0; i < tries; i++) { try { return await page.evaluate(fn); } catch (e) { last = e; await new Promise(r => setTimeout(r, 3000)); } }
  throw last;
}
async function waitRaceEnd() {
  for (let attempt = 0; attempt < 30; attempt++) {
    try {
      await page.waitForFunction(() => { const s = BK.state(); return s.karts.some(k => k.finished) || s.raceTime > 320; }, { timeout: 120000, polling: 2000 });
      return;
    } catch (e) { /* page too busy to answer — the race is still running in-page; keep waiting */ }
  }
  throw new Error('race never ended after ~30 wait attempts');
}
const page = await browser.newPage();
await page.setViewport({ width: 900, height: 560 });
await page.setRequestInterception(true);
page.on('request', r => {
  if (r.url().includes('cdn.jsdelivr.net/npm/three@')) r.respond({ status: 200, contentType: 'text/javascript; charset=utf-8', headers: { 'Access-Control-Allow-Origin': '*' }, body: threeCode });
  else r.continue();
});
page.on('console', m => { if (m.type() === 'error') errors.push(`[console] ${m.text()}`); });
page.on('pageerror', e => errors.push(`[pageerror] ${e.message}`));
await page.goto(url, { waitUntil: 'networkidle2', timeout: 90000 });
await page.waitForFunction(() => window.BK && document.querySelectorAll('.racer-card').length === 17, { timeout: 30000 });

const races = [];
const t0 = Date.now();
for (let i = 0; i < SIMS; i++) {
  const playerIdx = i % 17, trackIdx = i % 2;
  await page.evaluate(({ p, t, laps, ts }) => {
    BK.setDifficulty(1); // Spicy
    BK.setFairPlayer(true); // remove the built-in human edge: this measures a true mid-skill slot
    BK.setLaps(laps);
    BK.start(p, t);
    BK.skipCountdown();
    BK.autopilot(true);
    BK.setTimescale(ts);
    window.__rec = { leaders: [], lap1: null };
    window.__recTimer = setInterval(() => {
      const s = BK.state(); if (s.state !== 'racing') return;
      const sorted = [...s.karts].sort((a, b) => b.continuous - a.continuous);
      const leader = sorted[0].name;
      if (window.__rec.leaders[window.__rec.leaders.length - 1] !== leader) window.__rec.leaders.push(leader);
      if (!window.__rec.lap1 && sorted[0].continuous >= 900) window.__rec.lap1 = sorted.map(k => k.name);
    }, 200);
  }, { p: playerIdx, t: trackIdx, laps: SIM_LAPS, ts: TIMESCALE });
  await waitRaceEnd();
  const out = await evalRetry(() => {
    clearInterval(window.__recTimer);
    const s = BK.state();
    const sorted = [...s.karts].sort((a, b) => b.continuous - a.continuous);
    return { rec: window.__rec, final: sorted.map(k => ({ name: k.name, continuous: k.continuous, finished: k.finished })), raceTime: s.raceTime, playerName: s.player ? null : null, playerRank: s.player.rank, trackLen: BK.trackLen() };
  });
  const playerName = out.final.length ? null : null;
  races.push({ i, trackIdx, ...out });
  console.log(`race ${i + 1}/${SIMS} (track ${trackIdx}, ${(Date.now() - t0) / 1000 | 0}s elapsed): winner ${out.final[0].name}, leadChanges ${Math.max(0, out.rec.leaders.length - 1)}, playerRank ${out.playerRank}, raceTime ${out.raceTime.toFixed(0)}s`);
}

// ---------- aggregate ----------
const wins = {}, apps = {}, podiums = {};
let leadChangesSum = 0, leadChangesCounted = 0, comebacks = 0, comebackPossible = 0, gapSum = 0, gapCount = 0, playerPodiums = 0, stuck = [], nanFound = false;
for (const r of races) {
  for (const k of r.final) { apps[k.name] = (apps[k.name] || 0) + 1; if (!Number.isFinite(k.continuous)) nanFound = true; }
  wins[r.final[0].name] = (wins[r.final[0].name] || 0) + 1;
  if (r.rec.leaders.length > 1) { leadChangesSum += r.rec.leaders.length - 1; leadChangesCounted++; }
  if (r.rec.lap1) {
    const eighth = r.rec.lap1[7];
    const finalRank = r.final.findIndex(k => k.name === eighth) + 1;
    if (finalRank >= 1) { comebackPossible++; if (finalRank <= 4) comebacks++; }
  }
  const gapSamples = r.final[0].continuous - r.final[7].continuous;
  gapSum += gapSamples * (r.trackLen / 900) / 40; gapCount++; // ≈ seconds at avg kart speed
  if (r.playerRank <= 3) playerPodiums++;
  for (const k of r.final) if (k.continuous < 150) stuck.push(`${k.name} (race ${r.i})`);
}
const winTable = Object.keys(apps).sort().map(name => ({ racer: name, appearances: apps[name], wins: wins[name] || 0, winPct: +(((wins[name] || 0) / SIMS) * 100).toFixed(1) }));
const metrics = {
  sims: SIMS, lapsPerRace: SIM_LAPS, difficulty: 'Spicy', timescale: TIMESCALE,
  winTable,
  maxWinPct: Math.max(...winTable.map(w => w.winPct)),
  racersWithWinUnder3Pct: winTable.filter(w => w.winPct < 3).map(w => w.racer),
  avgLeadChanges: leadChangesCounted ? +(leadChangesSum / leadChangesCounted).toFixed(2) : 0,
  comebackRatePct: comebackPossible ? +(100 * comebacks / comebackPossible).toFixed(1) : 0,
  comebackSample: comebackPossible,
  avgGapFirstToEighthSec: gapCount ? +(gapSum / gapCount).toFixed(1) : 0,
  playerSlotPodiumPct: +(100 * playerPodiums / SIMS).toFixed(1),
  stuckKarts: stuck, nanFound, consoleErrors: errors,
};
console.log('\n===== SIM METRICS =====');
console.table(winTable);
console.log(`avg lead changes/race: ${metrics.avgLeadChanges} (target ≥3)`);
console.log(`comeback rate (8th after lap 1 → top 4): ${metrics.comebackRatePct}% of ${comebackPossible} (target 15–35%)`);
console.log(`avg 1st→8th gap at finish: ${metrics.avgGapFirstToEighthSec}s`);
console.log(`max win share: ${metrics.maxWinPct}% (target ≤30%) · under 3%: ${metrics.racersWithWinUnder3Pct.join(', ') || 'none'}`);
console.log(`player-slot (autopilot) podiums: ${metrics.playerSlotPodiumPct}% (want: happening, not dominating)`);
console.log(`stuck: ${stuck.length ? stuck.join('; ') : 'none'} · NaN: ${nanFound} · console errors: ${errors.length}`);

await mkdir(join(ROOT, 'tools', 'sim-results'), { recursive: true });
await writeFile(join(ROOT, 'tools', 'sim-results', 'sim-results.json'), JSON.stringify({ metrics, races: races.map(r => ({ i: r.i, track: r.trackIdx, winner: r.final[0].name, leadChanges: Math.max(0, r.rec.leaders.length - 1), playerRank: r.playerRank })) }, null, 1));
await writeFile(join(ROOT, 'tools', 'sim-results', 'SUMMARY.md'),
  `# AI-vs-AI balance sims — ${SIMS} races, ${SIM_LAPS} laps, Spicy, all-AI field (player slot = autopilot)\n\n` +
  `| Metric | Result | Target |\n|---|---|---|\n` +
  `| Max win share | ${metrics.maxWinPct}% | ≤30% |\n` +
  `| Racers under 3% wins | ${metrics.racersWithWinUnder3Pct.join(', ') || 'none'} | none |\n` +
  `| Avg lead changes / race | ${metrics.avgLeadChanges} | ≥3 |\n` +
  `| Comeback rate (8th after L1 → top 4) | ${metrics.comebackRatePct}% (n=${comebackPossible}) | 15–35% |\n` +
  `| Avg 1st→8th gap at finish | ${metrics.avgGapFirstToEighthSec}s | — |\n` +
  `| Player-slot podiums | ${metrics.playerSlotPodiumPct}% | >0%, not dominant |\n` +
  `| Stuck karts / NaN / console errors | ${stuck.length} / ${nanFound} / ${errors.length} | 0 / false / 0 |\n\n` +
  `Win table:\n\n| Racer | Apps | Wins | Win% |\n|---|---|---|---|\n` +
  winTable.map(w => `| ${w.racer} | ${w.appearances} | ${w.wins} | ${w.winPct}% |`).join('\n') + '\n');
console.log('\nWrote tools/sim-results/sim-results.json + SUMMARY.md');
await browser.close();
server.close();
if (errors.length || nanFound || stuck.length) { console.error('HARD FAIL: errors/stuck/NaN present'); process.exitCode = 1; }
