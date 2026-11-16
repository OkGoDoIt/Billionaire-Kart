/* Drive the same 200cc straight twice. A brake tap must slow a boost without
   consuming the rest of it; releasing the brake lets the kart pull away again. */
import assert from 'node:assert/strict';
import { Track } from '../src/track/track.js';
import { Race } from '../src/race/race.js';
import { RACERS } from '../src/content/racers.js';
import siliconValley from '../src/tracks/silicon-valley.js';
import davos from '../src/tracks/davos.js';
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
// The launch strip before the Davos ski jump must carry the kart all the way
// off the pad, but sitting on it cannot repeat sound, rumble, or camera kicks.
const ski = new Track(davos), pad = ski.boosts[4];
function launch(stunned, split) {
  const race = new Race({ track: ski, cc: 100, countdown: 0, items: false, coins: false,
    entries: [{ racer: RACERS[0], player: 0 }] });
  const k = race.players[0], s = pad.s0 + 0.02, p = ski.pointAt(s, pad.lat, {});
  k.place(p.x, p.y, p.z, ski.yawAt(s), pad.i0);
  if (stunned) k.hurt('spin');
  const pulses = [];
  for (let i = 0; i < 180; i++) {
    const hit = k.hitT > 0;
    race.step(dt, [{ throttle: 1 }]);
    const cue = k.events.some(e => e.type === 'boost' && e.data === 'pad');
    if (cue) pulses.push(k.s);
    assert.ok(!hit || !cue, 'a stunned kart cannot launch off a pad');
    k.events.length = 0;
    if (k.s > pad.s1) break;
  }
  assert.ok(k.s > pad.s1 && k.speed > 27 && k.boostT > 0.8, 'the ski jump still has a running start');
  assert.equal(pulses.length, split ? 2 : 1);
}
launch(false, false);
launch(true, false);
// Butt two strips together. The next physical strip is a separate cue even
// when wheels cross the seam before the first boost has had time to decay.
const seam = pad.s0 + 5;
ski.boosts.push({ ...pad, s0: seam, len: 5 });
ski.boosts[ski.boosts.indexOf(pad)] = { ...pad, len: 5 };
launch(false, true);

console.log('boost-brake-check: ok');
