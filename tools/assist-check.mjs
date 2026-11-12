#!/usr/bin/env node
/* Steering-assist measurement (issue #136). Feel cannot be unit-tested, so this
   measures a proxy: a scripted IMPERFECT driver — corrections only every ~0.2 s,
   a wandering thumb (two sines of noise, coarse 0.2 steps), a habitual line bias,
   and no drift button — laps two tracks solo with the assist off and on.
   Reports wall hits, off-road excursions, rescues, and lap times.
   Also the no-input sanity check: full throttle, hands off the steering, assist
   off vs on. The assist is capped far below cornering authority, so it must add
   no self-driving of its own (the game's wall nudge already wall-rides a
   hands-off kart slowly, with or without any assist — that is not the assist).
   Usage: node tools/assist-check.mjs [--track id] [--seeds 7,77,777] */
import { Track } from '../src/track/track.js';
import { Race } from '../src/race/race.js';
import { RACERS } from '../src/content/racers.js';
import { TUNE } from '../src/race/kart.js';
import { clamp, wrapAngle, mod, makeRng } from '../src/core/util.js';
import { takeSlot } from './slot.mjs';

await takeSlot('assist-check');

const args = process.argv.slice(2), opt = {};
for (let i = 0; i < args.length; i++) { const a = args[i]; if (a.startsWith('--')) { const k = a.slice(2); opt[k] = args[i + 1] && !args[i + 1].startsWith('--') ? args[++i] : true; } }
const trackIds = opt.track ? [opt.track] : ['mars-colony', 'singularity-speedway'];
const seeds = (opt.seeds || '7,77,777').split(',').map(Number);
const DT = 1 / 60;
const P = { x: 0, y: 0, z: 0 };
const NO_INPUT = { steer: 0, throttle: 1, brake: 0, drift: false, item: false };

/* A casual thumb on a touchscreen: aims at the racing line like the AI does, but
   late, coarsely, with a wander that fishtails on straights, the odd thumb slip
   (a bend misjudged for half a second), and corner entries taken far too fast —
   casual players do not brake like the AI, and they never drift. */
class SloppyDriver {
  constructor(kart, seed) {
    this.k = kart; this.rng = makeRng(seed);
    this.held = 0; this.holdT = 0; this.t = 0; this.stuckT = 0; this.revT = 0;
    this.bias = this.rng.range(-1.8, 1.8);                 // habitual offset from the line
    this.p1 = this.rng() * 9; this.p2 = this.rng() * 9;    // thumb-wander phases
    this.slipT = this.rng.range(3, 7); this.slip = 0; this.slipLeft = 0;
  }
  think(dt) {
    const k = this.k, tr = k.race.track;
    this.t += dt;
    if (k.race.frozen) return { steer: 0, throttle: k.race.countdown < 1.6 ? 1 : 0, brake: 0, drift: false, item: false };
    // stuck against a wall: reverse out, steering the nose back to the track heading (as the AI does)
    if (k.speed < 2 && k.hitT <= 0 && k.rescueT <= 0) this.stuckT += dt; else this.stuckT = Math.max(0, this.stuckT - dt * 2);
    if (this.stuckT > 1.2 && this.revT <= 0) this.revT = 0.8;
    if (this.revT > 0) {
      this.revT -= dt;
      return { steer: clamp(wrapAngle(tr.yaw[k.hit.i] - k.yaw) * 2, -1, 1), throttle: 0, brake: 1, drift: false, item: false };
    }
    this.holdT -= dt;
    if (this.holdT <= 0) {
      this.holdT = 0.22 + this.rng() * 0.2;                // fresh corrections only every ~0.3 s
      const sp = k.speed, look = 8 + sp * 0.55;
      const iA = mod(Math.round((k.s + look) / tr.ds), tr.N);
      const hw = Math.min(tr.hwL[iA], tr.hwR[iA]) - 2.0;
      tr.pointAt(k.s + look, clamp(tr.lineLat[iA] + this.bias, -hw, hw), P);
      this.held = clamp(-wrapAngle(Math.atan2(P.x - k.x, P.z - k.z) - k.yaw) * 1.9, -1, 1);
    }
    // thumb slips: now and then the steer is shoved hard the wrong way for a moment
    this.slipT -= dt;
    if (this.slipT <= 0) { this.slipT = this.rng.range(4, 9); this.slipLeft = this.rng.range(0.35, 0.6); this.slip = this.rng.range(0.5, 0.85) * (this.rng() < 0.5 ? -1 : 1); }
    let slip = 0;
    if (this.slipLeft > 0) { this.slipLeft -= dt; slip = this.slip; }
    const noise = 0.3 * Math.sin(this.t * 2.3 + this.p1) + 0.2 * Math.sin(this.t * 6.1 + this.p2);
    const steer = Math.round(clamp(this.held + noise + slip, -1, 1) / 0.25) * 0.25;
    // corner speed: a casual player brakes only when it is far too late, and lightly
    let throttle = 1, brake = 0;
    const sp = k.speed;
    let kMax = 0; const span = Math.round((10 + sp * 0.9) / tr.ds);
    for (let j = 2; j < span; j += 2) { const c = tr.curv[mod(k.hit.i + j, tr.N)]; if (Math.abs(c) > Math.abs(kMax)) kMax = c; }
    const omegaMax = TUNE.turnRate * TUNE.turnHighSpeed * k.handling;
    if (Math.abs(kMax) * sp > omegaMax * 1.9) { throttle = 0; brake = 0.5; }
    else if (Math.abs(kMax) * sp > omegaMax * 1.5) throttle = 0.5;
    return { steer, throttle, brake, drift: false, item: false };
  }
}

async function runOnce(trackId, { assistSteer = 0, seed = 7, laps = 2, mode = 'sloppy', maxT = 300 } = {}) {
  const def = (await import(`../src/tracks/${trackId}.js`)).default;
  const track = new Track(def);
  const entry = { racer: RACERS[0], player: 0 };
  if (assistSteer) entry.assist = { steer: assistSteer };
  const race = new Race({ track, cc: 150, seed: 4242, laps, entries: [entry], items: false, coins: false });
  const kart = race.karts[0];
  const drv = mode === 'sloppy' ? new SloppyDriver(kart, seed) : null;
  let wall = 0, rescues = 0, offT = 0, offRun = 0, excursions = 0, maxAssist = 0, steps = 0;
  const maxSteps = Math.round(maxT / DT);
  while (steps < maxSteps && !kart.finished) {
    race.step(DT, [mode === 'none' ? NO_INPUT : drv.think(DT)]); steps++;
    for (const e of kart.events) { if (e.type === 'wall') wall++; else if (e.type === 'rescue') rescues++; }
    kart.events.length = 0; race.events.length = 0;
    if (kart.assistOut) maxAssist = Math.max(maxAssist, Math.abs(kart.assistOut));
    if (kart.grounded && kart.surface && kart.surface.offroad) { offT += DT; offRun += DT; }
    else { if (offRun > 0.25) excursions++; offRun = 0; }
  }
  if (offRun > 0.25) excursions++;
  return {
    wall, rescues, excursions, offT,
    lapAvg: kart.lapTimes.length ? kart.lapTimes.reduce((a, b) => a + b, 0) / kart.lapTimes.length : null,
    finish: kart.finished ? kart.finishTime : null,
    lapsDone: kart.lap, progressFrac: (kart.lap * track.length + kart.s) / track.length,
    maxAssist, simT: steps * DT,
  };
}

const avg = (rows, k) => rows.reduce((a, r) => a + (r[k] ?? 0), 0) / rows.length;
const fmt = (r) => `wall ${r.wall.toFixed(1)} | excursions ${r.excursions.toFixed(1)} | off-road ${r.offT.toFixed(1)} s | rescues ${r.rescues.toFixed(1)} | lap avg ${r.lapAvg == null ? '—' : r.lapAvg.toFixed(1) + ' s'} | finish ${r.finish == null ? 'DNF' : r.finish.toFixed(1) + ' s'}`;
let failed = 0;
for (const id of trackIds) {
  const off = [], on = [];
  for (const seed of seeds) { off.push(await runOnce(id, { assistSteer: 0, seed })); on.push(await runOnce(id, { assistSteer: 1, seed })); }
  const agg = rows => ({ wall: avg(rows, 'wall'), excursions: avg(rows, 'excursions'), offT: avg(rows, 'offT'), rescues: avg(rows, 'rescues'), lapAvg: avg(rows, 'lapAvg'), finish: avg(rows, 'finish') });
  console.log(`\n${id} — sloppy driver, 2 laps, ${seeds.length} seeds averaged`);
  console.log(`  assist OFF: ${fmt(agg(off))}`);
  console.log(`  assist ON : ${fmt(agg(on))} | max |assist| seen ${Math.max(...on.map(r => r.maxAssist)).toFixed(3)} (cap ${TUNE.assistCap ?? 'n/a'})`);
  // No-input sanity, comparative on purpose: the game's wall collision already
  // nudges a hands-off kart's nose along the wall (kart._bounds), so even with no
  // assist at all a throttle-only kart can eventually wall-ride around a lap.
  // What must hold is that the ASSIST adds no self-driving of its own: same laps,
  // near-same progress, hands off, off vs on.
  const niOff = await runOnce(id, { assistSteer: 0, mode: 'none', maxT: 150 });
  const niOn = await runOnce(id, { assistSteer: 1, mode: 'none', maxT: 150 });
  const ok = niOn.lapsDone <= niOff.lapsDone && (niOn.progressFrac - niOff.progressFrac) < 0.15;
  if (!ok) failed++;
  console.log(`  no-input 150 s: OFF laps ${niOff.lapsDone}, progress ${(niOff.progressFrac * 100).toFixed(0)}% | ON laps ${niOn.lapsDone}, progress ${(niOn.progressFrac * 100).toFixed(0)}% -> ${ok ? 'PASS (assist adds no self-driving)' : 'FAIL (assist is driving!)'}`);
}
process.exit(failed ? 1 : 0);
