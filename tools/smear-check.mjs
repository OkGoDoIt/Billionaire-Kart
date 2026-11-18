/* A Smear Campaign has to cost a computer rival something. Race the same seeded field twice on real
   tracks; in the second run every rival is smeared for 4.8 s at the same moment. Smeared rivals must
   lose clear ground on average, and none may be sent off the course for it. */
import assert from 'node:assert/strict';
import { Track } from '../src/track/track.js';
import { Race } from '../src/race/race.js';
import { RACERS } from '../src/content/racers.js';
import { takeSlot } from './slot.mjs';

await takeSlot('Smear check');
const dt = 1 / 60;
let lost = 0, samples = 0;
for (const id of ['silicon-valley', 'burning-circuit', 'mars-colony']) {
  const track = new Track((await import(`../src/tracks/${id}.js`)).default);
  const run = smear => {
    const race = new Race({ track, cc: 150, seed: 77, items: false, coins: false,
      entries: RACERS.slice(0, 8).map(racer => ({ racer, player: -1, level: 'hard' })) });
    for (let i = 0; i < 60 * 14; i++) race.step(dt);           // countdown and the opening seconds
    if (smear) for (const k of race.karts) k.inkT = 4.8;
    const before = race.karts.map(k => k.raceDistance);
    let rescues = 0;
    for (let i = 0; i < 60 * 6; i++) { race.step(dt); for (const k of race.karts) if (k.rescueT > 0 && k._smearRescue !== true) { k._smearRescue = true; rescues++; } }
    return { gain: race.karts.map((k, i) => k.raceDistance - before[i]), rescues };
  };
  const clean = run(false), smeared = run(true);
  const diff = clean.gain.map((g, i) => g - smeared.gain[i]);
  const avg = diff.reduce((a, b) => a + b, 0) / diff.length;
  console.log(`${id.padEnd(16)} ground lost while smeared: avg ${avg.toFixed(1)} m (min ${Math.min(...diff).toFixed(1)}, max ${Math.max(...diff).toFixed(1)}), rescues ${clean.rescues} -> ${smeared.rescues}`);
  assert.ok(smeared.rescues <= clean.rescues + 1, `${id}: a smear should not send rivals off the course`);
  lost += avg; samples++;
}
const mean = lost / samples;
assert.ok(mean > 6, `smeared rivals lose only ${mean.toFixed(1)} m on average`);
assert.ok(mean < 40, `smeared rivals lose ${mean.toFixed(1)} m on average, which is harsher than a hit`);
console.log(`smear-check: ok (${mean.toFixed(1)} m lost on average)`);
