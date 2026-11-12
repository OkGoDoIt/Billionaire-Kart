#!/usr/bin/env node
/* Field-spread measurement: how strung out does the AI field get over a race?
   Roger's playtest complaint (Nov 2026) was that AI karts arrive in one clump —
   hard to pass, hard to reach item boxes. This harness runs AI-only races with
   exactly sim.mjs's field draws and race seeds, and reports, per race:
     finish IQR / P90-P10 / winner->last range   (seconds, of the 8 finish times)
     flag clump                                  (most karts finishing inside any 2 s window)
     mid-race progress P90-P10                   (metres, sampled every 2 s of race time,
                                                  windowed to 25%-80% of the winner's time)
     mid-race pack                               (most karts inside any 20 m window, mid-race)
     position churn                              (rank swaps between consecutive 2 s samples,
                                                  mid-race window, per sample step)
   plus the per-racer win table, so a spread change can be checked against the
   issue-85 lesson (top speed already dominates; no character may get a lock).
   Usage: node tools/spread.mjs [--races 120] [--cc 100] [--level normal]
                               [--tracks mars-colony,capitol-hill,silicon-valley] [--seed 0] */
import { Track } from '../src/track/track.js';
import { Race } from '../src/race/race.js';
import { RACERS } from '../src/content/racers.js';
import { makeRng } from '../src/core/util.js';
import { takeSlot } from './slot.mjs';

await takeSlot('spread');

const args = process.argv.slice(2), opt = {};
for (let i = 0; i < args.length; i++) { const a = args[i]; if (a.startsWith('--')) { const k = a.slice(2); opt[k] = args[i + 1] && !args[i + 1].startsWith('--') ? args[++i] : true; } }
const races = +(opt.races || 120), cc = +(opt.cc || 100), level = opt.level || 'normal', seed = +(opt.seed || 0) * 7919;
const trackIds = (opt.tracks || 'mars-colony,capitol-hill,silicon-valley').split(',');
const DT = 1 / 60;

const q = (sorted, p) => { const i = (sorted.length - 1) * p, lo = Math.floor(i), hi = Math.ceil(i); return sorted[lo] + (sorted[hi] - sorted[lo]) * (i - lo); };
const avg = a => a.reduce((x, y) => x + y, 0) / a.length;
function biggestWindow(values, width) {
  const v = [...values].sort((a, b) => a - b); let best = 0;
  for (let i = 0; i < v.length; i++) { let n = 0; for (let j = i; j < v.length && v[j] - v[i] <= width; j++) n++; best = Math.max(best, n); }
  return best;
}

const wins = Object.fromEntries(RACERS.map(r => [r.id, { n: 0, w: 0 }]));
const pooled = { iqr: [], p9010: [], range: [], clump: [], midGap: [], midPack: [], over: [], winT: [] };

for (const id of trackIds) {
  const def = (await import(`../src/tracks/${id}.js`)).default;
  const track = new Track(def);
  const M = { iqr: [], p9010: [], range: [], clump: [], midGap: [], midPack: [], over: [], winT: [] };
  let dnf = 0;
  for (let r = 0; r < races; r++) {
    const rng = makeRng(1000 + r * 77 + seed);
    const field = rng.shuffle(RACERS.slice()).slice(0, 8);
    const race = new Race({ track, cc, seed: 500 + r + seed, entries: field.map(racer => ({ racer, player: -1, level })) });
    const samples = []; // [raceTime, [[progress, kartIndex]...]]
    let steps = 0; const maxSteps = 60 * 60 * 6;
    while (race.state !== 'done' && steps < maxSteps) {
      race.step(DT); steps++;
      if (race.state === 'racing' && steps % 120 === 0) samples.push([race.time, race.karts.map((k, i) => [k.lap * track.length + k.s, i])]);
      for (const k of race.karts) k.events.length = 0;
      race.events.length = 0;
    }
    if (race.state !== 'done') { dnf++; continue; }
    const res = race.results();
    const times = res.map(x => x.time).sort((a, b) => a - b);
    M.iqr.push(q(times, 0.75) - q(times, 0.25));
    M.p9010.push(q(times, 0.9) - q(times, 0.1));
    M.range.push(times[times.length - 1] - times[0]);
    M.clump.push(biggestWindow(times, 2));
    M.winT.push(times[0]);
    const t1 = times[0];
    const mid = samples.filter(([t]) => t >= 0.25 * t1 && t <= 0.8 * t1);
    if (mid.length) {
      M.midGap.push(avg(mid.map(([, ps]) => { const s = ps.map(p => p[0]).sort((a, b) => a - b); return q(s, 0.9) - q(s, 0.1); })));
      M.midPack.push(avg(mid.map(([, ps]) => biggestWindow(ps.map(p => p[0]), 20))));
      // rank swaps between consecutive samples: rank every kart per sample, sum |delta rank| / 2
      const rankOf = ps => { const order = [...ps].sort((a, b) => b[0] - a[0]); const r = {}; order.forEach((p, i) => r[p[1]] = i); return r; };
      let swaps = 0;
      for (let i = 1; i < mid.length; i++) { const a = rankOf(mid[i - 1][1]), b = rankOf(mid[i][1]); for (const k in a) swaps += Math.abs(a[k] - b[k]); }
      M.over.push(mid.length > 1 ? swaps / 2 / (mid.length - 1) : 0);
    }
    const w = res[0].racer.id; wins[w].w++;
    for (const x of res) wins[x.racer.id].n++;
  }
  for (const k of Object.keys(M)) pooled[k].push(...M[k]);
  const f = (a, d = 1) => avg(a).toFixed(d);
  console.log(`\n${def.name} — ${races} races, ${cc}cc ${level}${dnf ? `, ${dnf} DNF` : ''}`);
  console.log(`  finish spread: IQR ${f(M.iqr)} s | P90-P10 ${f(M.p9010)} s | winner->last ${f(M.range)} s | winner avg ${f(M.winT)} s`);
  console.log(`  clumping: flag clump (2 s) ${f(M.clump, 2)} karts | mid-race pack (20 m) ${f(M.midPack, 2)} karts | mid-race P90-P10 gap ${f(M.midGap, 0)} m`);
  console.log(`  position churn: ${f(M.over, 2)} rank swaps per 2 s (mid-race)`);
}
const f = (a, d = 1) => avg(a).toFixed(d);
console.log(`\nPOOLED (${trackIds.length} tracks x ${races} races)`);
console.log(`  finish spread: IQR ${f(pooled.iqr)} s | P90-P10 ${f(pooled.p9010)} s | winner->last ${f(pooled.range)} s | winner avg ${f(pooled.winT)} s`);
console.log(`  clumping: flag clump (2 s) ${f(pooled.clump, 2)} karts | mid-race pack (20 m) ${f(pooled.midPack, 2)} karts | mid-race P90-P10 gap ${f(pooled.midGap, 0)} m`);
console.log(`  position churn: ${f(pooled.over, 2)} rank swaps per 2 s (mid-race)`);
console.log('\nwins (fair = 12.5% of starts):');
for (const [id, s] of Object.entries(wins).filter(([, s]) => s.n).sort((a, b) => b[1].w / b[1].n - a[1].w / a[1].n))
  console.log(`  ${id.padEnd(14)} starts ${String(s.n).padStart(4)}  wins ${String(s.w).padStart(3)}  ${(100 * s.w / s.n).toFixed(1)}%`);
