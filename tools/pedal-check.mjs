/* Drive overlapping pedals, reverse, and countdown transitions on a flat straight. */
import assert from 'node:assert/strict';
import { Race } from '../src/race/race.js';
import { Track } from '../src/track/track.js';
import { RACERS } from '../src/content/racers.js';
import { takeSlot } from './slot.mjs';

await takeSlot('pedal check');
const dt = 1 / 60;
const track = new Track({ id: 'test-straight', terrain: false, width: 60, path:
  [[0, 0, -500], [0, 0, 0], [0, 0, 500], [500, 0, 1000], [1000, 0, 500], [1000, 0, -500], [500, 0, -1000]].map(p => ({ p })) });

function drive(cc, input, racer = RACERS[0]) {
  const race = new Race({ track, cc, seed: 12, entries: [{ racer, player: 0 }], items: false, coins: false });
  const kart = race.players[0], s = track.sAtCp(1), p = track.pointAt(s, 0, {});
  kart.place(p.x, p.y, p.z, track.yawAt(s), Math.floor(s / track.ds));
  const events = new Set(), speed = [];
  while (race.time < 4) {
    race.step(dt, [input(race)]);
    for (const e of kart.events) events.add(e.type);
    kart.events.length = 0;
    if (!race.frozen) speed.push(kart.fwd);
  }
  return { speed, events };
}

for (const cc of [50, 100, 150, 200]) {
  const pedals = (throttle, brake) => drive(cc, r => r.frozen ? {} : { throttle, brake }).speed[120];
  const full = pedals(1, 0);
  assert.ok(pedals(1, 0.01) > full * 0.9, 'small pedal overlap still accelerates');
  assert.ok(pedals(1, 0.22) < pedals(1, 0.10));
  assert.ok(Math.abs(pedals(1, 1)) < 0.1, 'both pedals fully held stop the kart');
  assert.ok(pedals(0, 1) < pedals(0, 0.25) * 2, 'reverse follows trigger travel');
  const mid = drive(cc, r => ({ throttle: +!r.frozen, brake: r.time >= 1.5 ? 0.01 : 0 })).speed;
  assert.ok(mid[150] > mid[90], 'a tiny brake overlap while moving still permits acceleration');
  const held = drive(cc, () => ({ throttle: 1 }));
  assert.ok(!held.events.has('burnout') && !held.events.has('rocketStart') && held.speed[60] > 8);
}

const timed = (press, racer) => drive(150, r => ({ throttle: +(!r.frozen || r.countdown < press) }), racer).events;
assert.ok(!timed(3.2).has('burnout'), 'holding gas before the first light starts normally');
assert.ok(timed(2.95).has('burnout'), 'revving deliberately on the first light still stalls');
assert.ok(timed(1).has('rocketStart'));
const elon = RACERS.find(r => r.id === 'elon'), zuck = RACERS.find(r => r.id === 'zuck');
assert.ok(timed(2.4, elon).has('rocketStart'));
assert.ok(!timed(2.4, zuck).has('rocketStart'));
assert.ok(drive(150, r => ({ throttle: +(r.countdown > 3.2 || r.countdown < 1) })).events.has('rocketStart'), 'release and repress after holding confirm');
console.log('pedal-check: ok');
