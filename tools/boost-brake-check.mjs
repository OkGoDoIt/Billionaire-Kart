/* Drive the same 200cc straight twice. A brake tap must slow a boost without
   consuming the rest of it; releasing the brake lets the kart pull away again. */
import assert from 'node:assert/strict';
import { Track } from '../src/track/track.js';
import { Race } from '../src/race/race.js';
import { RACERS } from '../src/content/racers.js';
import siliconValley from '../src/tracks/silicon-valley.js';
import { takeSlot } from './slot.mjs';

await takeSlot('boost braking');
const track = new Track(siliconValley), dt = 1 / 60;
function drive(brake) {
  const race = new Race({ track, cc: 200, mode: 'timetrial', countdown: 0,
    entries: [{ racer: RACERS[0], player: 0 }] });
  const kart = race.players[0];
  for (let n = 0; n < 100; n++) race.step(dt, [{ throttle: 1 }]);
  assert.ok(race.items.use(kart));
  const start = kart.speed;
  for (let n = 0; n < 24; n++) race.step(dt, [{ throttle: 1, brake }]);
  const speed = kart.speed;
  assert.ok(kart.boostT > 0);
  for (let n = 0; n < 24; n++) race.step(dt, [{ throttle: 1 }]);
  return { start, speed, exit: kart.speed };
}
const free = drive(0), braking = drive(0.7);
assert.ok(free.speed > free.start + 4);
assert.ok(braking.speed < braking.start - 4);
assert.ok(braking.exit > braking.speed + 4);
console.log('boost-brake-check: ok');
