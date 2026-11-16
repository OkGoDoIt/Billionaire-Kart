/* Fire a real suit down a straight with a bystander beside its target. The
   target has to spend funding during the final warning to escape the blast. */
import assert from 'node:assert/strict';
import { Race } from '../src/race/race.js';
import { Track } from '../src/track/track.js';
import { RACERS } from '../src/content/racers.js';
import { takeSlot } from './slot.mjs';

await takeSlot('Antitrust counter');
const dt = 1 / 60;
const track = new Track({ width: 30, path: [[0, 0, 0], [0, 0, 120], [0, 0, 200],
  [140, 0, 200], [140, 0, -150], [0, 0, -140]].map(p => ({ p })) });

function serve(item, when) {
  const race = new Race({ track, cc: 150, countdown: 0, items: false, coins: false,
    entries: RACERS.slice(0, 3).map((racer, player) => ({ racer, player })) });
  const [leader, sender, bystander] = race.karts;
  for (const [kart, s, lat] of [[leader, 50, 0], [sender, 18, 0], [bystander, 48.5, -4]]) {
    const p = track.pointAt(s, lat, {});
    kart.place(p.x, p.y, p.z, track.yawAt(s), Math.floor(s / track.ds));
  }
  race.step(dt);
  race.items.give(leader, item);
  race.items.give(sender, 'antitrust');
  race.step(dt, [{}, { item: true }]);
  const suit = race.items.shots[0];
  assert.ok(suit && suit.target === leader);
  let pressed = false;
  for (let i = 0; i < 300 && race.items.shots.length; i++) {
    const item = !pressed && when(suit);
    race.step(dt, [{ item }]);
    pressed ||= item;
  }
  assert.equal(race.items.shots.length, 0);
  return {
    hit: leader.stats.hitsTaken, uses: leader.itemUses, splash: bystander.stats.hitsTaken,
    dodged: leader.events.filter(e => e.type === 'dodged' && e.data === 'antitrust').length,
    explosions: race.events.filter(e => e.type === 'explosion').length,
  };
}

const lateOrbit = s => s.phase === 'hover' && s.t < 0.10;
const dive = s => s.phase === 'dive';
for (const [item, remaining] of [['boost', 0], ['boost3', 2], ['golden', 1]]) {
  for (const timing of [lateOrbit, dive]) {
    assert.deepEqual(serve(item, timing), { hit: 0, uses: remaining, splash: 1, dodged: 1, explosions: 1 }, item);
  }
}
const early = serve('boost3', s => s.phase === 'hover' && s.t < 0.5);
assert.equal(early.hit, 1);
assert.equal(early.uses, 0, 'the strike destroys the unused funding rounds');
assert.equal(early.dodged, 0);
assert.equal(serve('boost3', () => false).hit, 1, 'holding the item cannot counter a suit');
const blitz = serve('pr', s => s.phase === 'hover' && s.t < 1);
assert.equal(blitz.explosions, 0, 'PR Blitz still destroys the suit before impact');
assert.equal(blitz.hit, 0);
console.log('antitrust-check: ok');
