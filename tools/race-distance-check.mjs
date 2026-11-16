/* Drive forward, reverse over the stripe, and rejoin. Taking the start backward
   must not give the player first place or another lap when they drive away. */
import assert from 'node:assert/strict';
import { Track } from '../src/track/track.js';
import { Race } from '../src/race/race.js';
import { AIDriver, rubberBand } from '../src/race/ai.js';
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
assert.ok(rival.raceDistance > player.raceDistance);
// Compare the same driver's pace at known intervals either side of the human.
// Put their actual race state back before the rest of the driven lap.
const progress = { s: rival.s, circuit: rival.circuit };
const base = rival.ai.lv.speed * rival.ai.paceMul * race.cls.ai;
function paceAt(gap) {
  const position = player.raceDistance + gap;
  rival.circuit = Math.floor(position / track.length);
  rival.s = position - rival.circuit * track.length;
  rubberBand(race);
  return rival.aiSpeedMul;
}
assert.equal(paceAt(20), base, 'a nearby rival keeps its own pace');
assert.equal(paceAt(-20), base, 'a nearby chaser keeps its own pace');
assert.ok(paceAt(120) < base, 'a distant leader eases off');
assert.ok(paceAt(-120) > base, 'a distant chaser can recover');
Object.assign(rival, progress);
rubberBand(race);

const pilot = new AIDriver(player, 'normal', makeRng(71));
for (let frame = 0; frame < 60 * 150 && !player.finished; frame++) drive(pilot.think(dt));
assert.ok(player.finished);
assert.deepEqual(lapEvents, [1, 2]);
assert.equal(player.lapTimes.length, 1);
assert.ok(Math.abs(player.raceDistance - track.length) < 2);
// Two noses cross this tick. The faster kart started farther from the line,
// and ends the tick farther beyond it, but it crossed second.
const stripe = new Track({ width: 32, path: [[0, 0, 0], [0, 0, 120], [0, 0, 200],
  [140, 0, 200], [140, 0, -150], [0, 0, -140]].map(p => ({ p })) });
for (const front of [0, 1]) {
  const photo = new Race({ track: stripe, cc: 100, laps: 1, countdown: 0, items: false, coins: false,
    entries: RACERS.slice(0, 2).map((racer, player) => ({ racer, player })) });
  photo.step(dt);
  photo.time = 60;
  for (const k of photo.karts) {
    const first = k.slot === front, s = stripe.length - (first ? 0.04 : 0.17), speed = first ? 11 : 21;
    const p = stripe.pointAt(s, k.slot ? -3 : 3, {});
    k.place(p.x, p.y, p.z, stripe.yawAt(s), Math.floor(s / stripe.ds));
    k.speed = k.fwd = speed;
    k.vx = Math.sin(k.yaw) * speed; k.vz = Math.cos(k.yaw) * speed;
    k.circuit = 0; k.lap = 1; k.cpNext = 4; k.lapStart = 1;
  }
  photo.step(dt);
  const [winner, runnerUp] = photo.results();
  assert.equal(winner.kart.slot, front, 'grid slot does not settle a photo finish');
  assert.ok(winner.kart.s < runnerUp.kart.s, 'the runner-up passes after the stripe');
  assert.ok(60 < winner.time && winner.time < runnerUp.time && runnerUp.time < photo.time);
  assert.equal(winner.bestLap, winner.time - 1, 'the lap clock and the race clock use the same crossing');
  assert.equal(runnerUp.kart.rank, 2);
}
console.log('race-distance-check: ok');
