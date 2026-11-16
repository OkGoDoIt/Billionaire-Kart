// Contention at a box: the occupied kart gets there first, but the empty slot earns the item.
import assert from 'node:assert/strict';
import { Race } from '../src/race/race.js';
import { getTrack } from '../src/content/tracks.js';
import { RACERS } from '../src/content/racers.js';

const race = new Race({ track: getTrack('silicon-valley'), cc: 100, seed: 17,
  entries: [0, 1].map(i => ({ racer: RACERS[i], player: i ? 0 : -1, level: 'normal' })) });
const items = race.items, [front, back] = race.karts, box = items.boxes[0];
const atBox = k => { k.x = box.x; k.y = box.y - .6; k.z = box.z; };
const step = () => { race.events.length = 0; items.step(1 / 60); };
for (const hold of ['item', 'roulette', 'golden']) {
  box.active = true; box.t = 0;
  Object.assign(front, { item: hold === 'item' ? 'pr' : null, goldenT: hold === 'golden' ? 2 : 0, rouletteT: hold === 'roulette' ? 1 : 0 });
  Object.assign(back, { item: null, goldenT: 0, rouletteT: 0 });
  atBox(front); atBox(back); step();
  const breaks = race.events.filter(e => e.type === 'boxBreak');
  assert.equal(breaks.length, 1); assert.equal(breaks[0].data.kart, back, hold);
  assert.ok(back.rouletteT > 0);
}
front.x = back.x = 100000;
for (let i = 0; i < 20; i++) step();
assert.equal(box.active, false, 'the kart directly on your bumper still contests the box');
for (let i = 0; i < 40; i++) step();
assert.equal(box.active, true, 'the next group has a live box');
console.log('box-access-check: ok');
