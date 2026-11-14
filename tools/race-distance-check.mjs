/* Drive forward, reverse over the stripe, and rejoin. Taking the start backward
   must not give the player first place or another lap when they drive away. */
import assert from 'node:assert/strict';
import { Track } from '../src/track/track.js';
import { Race } from '../src/race/race.js';
import { AIDriver } from '../src/race/ai.js';
import { makeRng } from '../src/core/util.js';
import { RACERS } from '../src/content/racers.js';
import siliconValley from '../src/tracks/silicon-valley.js';
import { takeSlot } from './slot.mjs';

await takeSlot('race distance');
const track = new Track(siliconValley), dt = 1 / 60;
const race = new Race({ track, cc: 100, countdown: 0, laps: 1, items: false, coins: false,
  entries: [{ racer: RACERS[0], player: 0 }, { racer: RACERS[1], player: -1, level: 'normal' }] });
const [player, rival] = race.karts;
let brake = false, crossedBack = false;
const lapEvents = [];
function drive(input) {
  race.step(dt, [input]);
  for (const e of player.events) if (e.type === 'lap') lapEvents.push(e.data);
  player.events.length = 0;
}
for (let n = 0; n < 360 && !crossedBack; n++) {
  drive({ throttle: brake ? 0 : 1, brake: brake ? 1 : 0 });
  if (player.lap === 1) brake = true;
  crossedBack = brake && player.s > track.length - 10;
}
assert.ok(crossedBack);
assert.equal(player.rank, 2);
assert.ok(player.raceDistance < 0 && player.raceDistance > -1);
const gap = rival.raceDistance - player.raceDistance;
assert.ok(gap > 10 && gap < 40);
const base = rival.ai.lv.speed * rival.ai.paceMul * race.cls.ai;
drive({ throttle: 1 });
assert.ok(rival.aiSpeedMul < base, 'the rival ahead eases off under the rubber band');

const pilot = new AIDriver(player, 'normal', makeRng(71));
for (let frame = 0; frame < 60 * 150 && !player.finished; frame++) drive(pilot.think(dt));
assert.ok(player.finished);
assert.deepEqual(lapEvents, [1, 2]);
assert.equal(player.lapTimes.length, 1);
assert.ok(Math.abs(player.raceDistance - track.length) < 2);
console.log('race-distance-check: ok');
