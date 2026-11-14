#!/usr/bin/env node
/* Where do karts hit walls? Runs AI races like tools/sim.mjs and prints wall hits per race by control point
   (rounded to 0.5), with which side (L/R, or a solid prop) and the average impact speed, then item and
   obstacle hits by control point. Made for WeWork Memorial's 170 wall hits per race (#193).
   Usage: node tools/wall-map.mjs <track-id> [races] */
import { Track } from '../src/track/track.js';
import { Race } from '../src/race/race.js';
import { RACERS } from '../src/content/racers.js';
import { makeRng } from '../src/core/util.js';
import { takeSlot } from './slot.mjs';

const [id, nr = '3'] = process.argv.slice(2);
if (!id) { console.error('usage: wall-map.mjs <track-id> [races]'); process.exit(2); }
await takeSlot('wall-map');   // two heavy jobs at a time on this machine: see slot.mjs
const def = (await import(`../src/tracks/${id}.js`)).default;
const track = new Track(def);
const bins = new Map(), hitsAt = new Map();
let total = 0, hard = 0, objHits = 0;
const at = k => Math.round(track.cp[k.hint ?? 0] * 2) / 2;
for (let r = 0; r < +nr; r++) {
  const rng = makeRng(1000 + r * 77);
  const field = rng.shuffle(RACERS.slice()).slice(0, 8);
  const race = new Race({ track, cc: 150, seed: 500 + r, entries: field.map(racer => ({ racer, player: -1, level: 'normal' })) });
  let steps = 0;
  while (race.state !== 'done' && steps < 60 * 60 * 6) {
    race.step(1 / 60); steps++;
    for (const k of race.karts) {
      for (const e of k.events) {
        if (e.type === 'wall') {
          const cp = at(k), b = bins.get(cp) || { n: 0, v: 0, L: 0, R: 0, obj: 0 };
          b.n++; b.v += e.data.v; if (e.data.side > 0) b.L++; else if (e.data.side < 0) b.R++; else b.obj++;
          bins.set(cp, b); total++; if (e.data.hard) hard++;
        }
        if (e.type === 'hit') { const cp = at(k); hitsAt.set(cp, (hitsAt.get(cp) || 0) + 1); objHits++; }
      }
      k.events.length = 0;
    }
    race.events.length = 0;
  }
}
console.log(`${id}: ${(total / nr).toFixed(0)} wall hits/race (${(hard / nr).toFixed(0)} hard), ${(objHits / nr).toFixed(1)} item/obstacle hits/race`);
for (const [cp, b] of [...bins.entries()].sort((a, b) => b[1].n - a[1].n).slice(0, 25))
  console.log(`  cp ${cp.toFixed(1).padStart(6)}: ${(b.n / nr).toFixed(1).padStart(5)}/race  avg v ${(b.v / b.n).toFixed(1)}  L ${b.L} R ${b.R} solid ${b.obj}`);
console.log('hits by cp:', [...hitsAt.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10).map(([c, n]) => `${c}:${(n / nr).toFixed(1)}`).join(' '));
