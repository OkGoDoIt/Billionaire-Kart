/* A manual drift press either side of the lip must give exactly one landing boost,
   and so must a flicked phone (the trick input, with no hop and its own spin).
   Drive the real Crypto Cove chart dive from a repeatable rolling approach. */
import assert from 'node:assert/strict';
import { Track } from '../src/track/track.js';
import { Race } from '../src/race/race.js';
import { RACERS } from '../src/content/racers.js';
import cryptoCove from '../src/tracks/crypto-cove.js';
import { takeSlot } from './slot.mjs';

await takeSlot('ramp trick');
const step = 1 / 60;
function drive(track, cc, trigger, autoTrick = false, flick = null) {
  const race = new Race({ track, cc, countdown: 0, mode: 'timetrial', entries: [{ racer: RACERS[0], player: 0, autoTrick }] });
  const kart = race.players[0], ramp = track.ramps[0];
  const s = ramp.s0 - 14, pos = track.pointAt(s, ramp.lat, {});
  kart.place(pos.x, pos.y, pos.z, track.yawAt(s), Math.floor(s / track.ds));
  kart.vx = Math.sin(kart.yaw) * kart.top; kart.vz = Math.cos(kart.yaw) * kart.top;
  kart.speed = kart.fwd = kart.top;
  let pressed = false, tricks = 0, boosts = 0, hops = 0;
  for (let frame = 0; frame < 300; frame++) {
    const drift = !pressed && trigger(kart, ramp);
    pressed ||= drift;
    race.step(step, [flick ? { throttle: 1, trick: drift, trickDir: flick.dir } : { throttle: 1, drift }]);
    if (flick && e0(kart)) flick.seen = kart.trickDir;
    for (const e of kart.events) {
      if (e.type === 'trick') tricks++;
      if (e.type === 'trickLand') boosts++;
      if (e.type === 'hop') hops++;
    }
    kart.events.length = 0;
    if (kart.s > ramp.s1 + 7 && kart.grounded) break;
  }
  return { tricks, boosts, hops };
}

const e0 = k => k.events.some(e => e.type === 'trick');
const track = new Track(cryptoCove);
const none = () => false;
const trick = { tricks: 1, boosts: 1, hops: 0 };
const plain = { tricks: 0, boosts: 0, hops: 0 };
for (const cc of [50, 100, 150, 200]) {
  for (const offset of [-2, -1, 0, 1, 2, 4]) {
    assert.deepEqual(drive(track, cc, (k, r) => k.s >= r.s1 + offset), trick, cc + 'cc, lip offset ' + offset);
  }
  assert.deepEqual(drive(track, cc, none), plain);
  assert.deepEqual(drive(track, cc, none, true), trick);
}
assert.deepEqual(drive(track, 150, k => k.airT > 0.7), plain, 'the late input window ends during the flight');
assert.deepEqual(drive(track, 150, () => true), { ...plain, hops: 1 }, 'ordinary road press still hops');
const noTrick = new Track({ ...cryptoCove, ramps: cryptoCove.ramps.map(r => ({ ...r, trick: false })) });
assert.deepEqual(drive(noTrick, 150, (k, r) => k.s >= r.s1, true), plain, 'non-trick ramps ignore both automatic and manual tricks');
// flick to trick: the same window either side of the lip, the flick's own spin, and nothing at all on the road
for (const cc of [100, 200]) for (const offset of [-2, 0, 2, 4]) for (const dir of [-1, 0, 1]) {
  const flick = { dir };
  assert.deepEqual(drive(track, cc, (k, r) => k.s >= r.s1 + offset, false, flick), trick, `flick ${dir} at ${cc}cc, lip offset ${offset}`);
  assert.equal(flick.seen, dir, `flick ${dir} spins its own way`);
}
assert.deepEqual(drive(track, 150, k => k.airT > 0.7, false, { dir: 0 }), plain, 'a late flick does nothing');
assert.deepEqual(drive(track, 150, () => true, false, { dir: 1 }), plain, 'a flick on the road neither hops nor tricks');
console.log('ramp-trick-check: ok');
