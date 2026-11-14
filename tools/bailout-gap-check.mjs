/* Expiring the Bailout over water must bring the player to the landing. */
import assert from 'node:assert/strict';
import { Track } from '../src/track/track.js';
import { Race } from '../src/race/race.js';
import { RACERS } from '../src/content/racers.js';
import waters from '../src/tracks/international-waters.js';
import { takeSlot } from './slot.mjs';

await takeSlot('bailout landing');
const track = new Track(waters), dt = 1 / 60;
for (const cp of [17, 20, 27.5, 33.5, 39.3]) {
  const race = new Race({ track, cc: 150, countdown: 0, mode: 'timetrial', entries: [{ racer: RACERS[0], player: 0 }] });
  race.step(dt);
  const k = race.players[0], i = track.indexAtCp(cp);
  k.place(track.px[i], track.py[i] + 0.5, track.pz[i], track.yaw[i], i);
  k.bulletT = dt;
  race.step(dt);
  assert.equal(k.bulletT > 0, !!track.gap[i], 'wait for a landing only above a gap');
  for (let frame = 0; frame < 90 && k.bulletT > 0; frame++) race.step(dt);
  assert.equal(k.bulletT, 0, 'release the driver promptly');
  race.step(dt, [{ throttle: 1 }]);
  assert.equal(k.rescueT, 0);
  assert.equal(track.gap[k.hint], 0);
  assert.equal(k.events.filter(e => e.type === 'bulletEnd').length, 1);
}
console.log('bailout-gap-check: ok');
