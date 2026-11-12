#!/usr/bin/env node
/* Headless races for testing and balance. Runs full AI-only races at many times
   real speed and reports lap times, incidents, and item statistics.
   Usage: node tools/sim.mjs [--track id] [--races n] [--cc 150] [--level normal] [--quick] [--verbose] */
import { readdirSync } from 'node:fs';
import { Track } from '../src/track/track.js';
import { Race } from '../src/race/race.js';
import { RACERS } from '../src/content/racers.js';
import { makeRng } from '../src/core/util.js';
import { takeSlot } from './slot.mjs';

await takeSlot('sim');   // two heavy jobs at a time on this machine: see slot.mjs

const args = process.argv.slice(2), opt = {};
for (let i = 0; i < args.length; i++) { const a = args[i]; if (a.startsWith('--')) { const k = a.slice(2); opt[k] = args[i + 1] && !args[i + 1].startsWith('--') ? args[++i] : true; } }
const trackIds = opt.track ? [opt.track] : readdirSync(new URL('../src/tracks/', import.meta.url)).filter(f => f.endsWith('.js')).map(f => f.replace('.js', ''));
const races = +(opt.races || (opt.quick ? 2 : 6)), cc = +(opt.cc || 150), level = opt.level || 'normal';
const DT = 1 / 60;
let failed = 0;

for (const id of trackIds) {
  const def = (await import(`../src/tracks/${id}.js`)).default;
  const track = new Track(def);
  const agg = { laps: [], finish: [], rescues: 0, hits: 0, items: {}, draws: Array.from({ length: 8 }, () => ({})), stuck: 0, drifts: 0, boosts: 0, wall: 0, winByStat: {}, nan: 0, dnf: 0, spread: [], lead: 0 };
  const t0 = performance.now(); let simT = 0;
  for (let r = 0; r < races; r++) {
    const rng = makeRng(1000 + r * 77);
    const field = rng.shuffle(RACERS.slice()).slice(0, 8);
    const race = new Race({ track, cc, seed: 500 + r, entries: field.map(racer => ({ racer, player: -1, level })) });
    let steps = 0; const maxSteps = 60 * 60 * 6;
    while (race.state !== 'done' && steps < maxSteps) {
      race.step(DT); steps++;
      for (const k of race.karts) {
        if (!Number.isFinite(k.x + k.y + k.z + k.yaw + k.vx + k.vz)) { agg.nan++; k.x = 0; k.y = 0; k.z = 0; k.vx = 0; k.vz = 0; k.yaw = 0; }
        for (const e of k.events) {
          if (e.type === 'rescue') agg.rescues++;
          else if (e.type === 'hit') agg.hits++;
          else if (e.type === 'itemReady') { agg.items[e.data] = (agg.items[e.data] || 0) + 1; const row = agg.draws[Math.min(7, k.rank - 1)]; row[e.data] = (row[e.data] || 0) + 1; }
          else if (e.type === 'miniTurbo') agg.drifts++;
          else if (e.type === 'wall') agg.wall++;
        }
        k.events.length = 0;
      }
      race.events.length = 0;
    }
    simT += steps * DT;
    if (race.state !== 'done') { agg.dnf++; if (opt.verbose) console.log(`  race ${r}: did not finish; laps ${race.karts.map(k => k.lap).join(',')}`); }
    const res = race.results();
    if (res.length) {
      agg.finish.push(res[0].time); agg.spread.push(res[res.length - 1].time - res[0].time);
      for (const k of race.karts) for (const t of k.lapTimes) agg.laps.push(t);
      const w = res[0].racer; agg.winByStat[w.id] = (agg.winByStat[w.id] || 0) + 1;
    }
    if (opt.verbose) console.log(`  race ${r}: ` + res.map(x => `${x.racer.id}:${x.time.toFixed(1)}`).join(' '));
  }
  const ms = performance.now() - t0;
  const avg = a => a.length ? a.reduce((x, y) => x + y, 0) / a.length : NaN, min = a => a.length ? Math.min(...a) : NaN;
  console.log(`\n${def.name} — ${races} races, ${cc}cc ${level}, ${track.length.toFixed(0)} m, sim ${(simT / (ms / 1000)).toFixed(0)}x real time`);
  console.log(`  winner time avg ${avg(agg.finish).toFixed(1)} s | lap avg ${avg(agg.laps).toFixed(1)} best ${min(agg.laps).toFixed(1)} s | field spread avg ${avg(agg.spread).toFixed(1)} s`);
  console.log(`  per race: hits ${(agg.hits / races).toFixed(1)}, rescues ${(agg.rescues / races).toFixed(1)}, mini-turbos ${(agg.drifts / races).toFixed(0)}, wall hits ${(agg.wall / races).toFixed(0)}`);
  console.log(`  items drawn: ${Object.entries(agg.items).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${v}`).join(', ')}`);
  if (opt.verbose) agg.draws.forEach((row, i) => console.log(`    P${i + 1}: ${Object.entries(row).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${v}`).join(', ')}`));
  console.log(`  winners: ${Object.entries(agg.winByStat).map(([k, v]) => `${k} ${v}`).join(', ')}`);
  const bad = agg.nan || agg.dnf;
  if (bad) { failed++; console.log(`  FAIL: ${agg.nan} NaN states, ${agg.dnf} unfinished races`); }
}
process.exit(failed ? 1 : 0);
