/* Exercise the actual foreground loop across slow frames, a backward timestamp,
   and a long interruption. The race runs on level ground without other karts. */
import assert from 'node:assert/strict';
import { takeSlot } from './slot.mjs';
import { Track } from '../src/track/track.js';
import { Race } from '../src/race/race.js';
import { RACERS } from '../src/content/racers.js';

globalThis.window = globalThis;
globalThis.addEventListener = () => {};
globalThis.matchMedia = () => ({ matches: false });
const { App } = await import('../src/game/app.js');
const { RaceSession, MAX_FRAME_TIME, STEP } = await import('../src/game/session.js');
await takeSlot('foreground race clock');
const track = new Track({ id: 'flat', width: 40, path: [[-500, 0, -500], [-500, 0, 500], [500, 0, 500], [500, 0, -500]].map(p => ({ p })) });
const noop = () => {};
function sample(fps) {
  let next;
  globalThis.requestAnimationFrame = f => { next = f; };
  const race = new Race({ track, cc: 150, countdown: 0, entries: [{ racer: RACERS[1], player: 0 }], items: false, coins: false });
  const app = { gfx: { render: noop }, input: { poll: () => [{ throttle: 1 }] } };
  const view = { cams: [], snapshot: noop, update: noop };
  app.session = Object.assign(Object.create(RaceSession.prototype), { race, phase: 'racing', view, app, hudOf: new Map(), acc: 0 });
  App.prototype.run.call(app);
  const from = performance.now();
  for (let frame = 0; frame <= 4 * fps; frame++) next(from + frame * 1000 / fps);
  const end = race.time;
  next(from + 3999);
  assert.equal(race.time, end);
  next(from + 34000);
  assert.ok(race.time - end <= MAX_FRAME_TIME + STEP);
  return end;
}
const reference = sample(60);
assert.ok(4 - reference <= 2 * STEP);
for (const fps of [120, 30, 15, 12, 10, 8, 6, 4]) assert.ok(Math.abs(sample(fps) - reference) <= STEP + 1e-6, fps + ' fps lost race time');
console.log('race-clock-check: ok');
