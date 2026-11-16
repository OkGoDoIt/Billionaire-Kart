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
// A hit after committing to the quay jump still costs control and speed.
// Carry its horizontal momentum over the channel and take the loss on deck.
for (const impact of ['pad', 'air']) {
  const race = new Race({ track, cc: 150, countdown: 0, items: false, coins: false,
    entries: [{ racer: RACERS[0], player: 0 }] });
  const k = race.players[0], ramp = track.ramps[0], s = ramp.s0 - 15;
  const p = track.pointAt(s, 0, {});
  k.place(p.x, p.y, p.z, track.yawAt(s), Math.floor(s / track.ds));
  k.coins = 5; k.fwd = k.speed = 34;
  k.vx = Math.sin(k.yaw) * k.speed; k.vz = Math.cos(k.yaw) * k.speed;
  let hit = false, landed = false;
  for (let i = 0; i < 210 && !landed; i++) {
    if (!hit && (impact === 'air' ? track.gap[k.hint] && !k.grounded : k.hit.boost && track.gapLaunch[k.hint])) {
      const speed = Math.hypot(k.vx, k.vz);
      assert.ok(k.hurt('tumble'));
      assert.equal(k.coins, 2);
      assert.ok(k.hitT > 0);
      assert.equal(Math.hypot(k.vx, k.vz), speed, 'incoming item keeps the jump trajectory');
      hit = true;
    }
    race.step(dt, [{ throttle: 1 }]);
    assert.equal(k.rescueT, 0);
    if (hit && k.grounded && k.landingSpeedKeep === 1 && k.s > ramp.s1) {
      assert.ok(k.speed < 14, 'the hit was paid for on landing');
      landed = true;
    }
  }
  assert.ok(hit && landed, impact + ': reach the real landing and pay the slowdown');
}
console.log('bailout-gap-check: ok');
