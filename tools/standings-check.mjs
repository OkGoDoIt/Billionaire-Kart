/* Grand Prix standings, split-screen records, and time-trial ghosts, without a browser.
   - cupOrder (src/content/cups.js): points, then countback (wins, then 2nds, …), then the last race; neutral
     between humans and rivals and between insertion orders (#350).
   - App._finishRace and gpNext on a whole cup: the places are kept and the champion is decided on countback.
   - Split screen: every local player's time and lap count toward the bests, the race counts once (#359 item 5).
   - GhostRecorder (src/core/ghost.js): a 900 s run is kept whole at a coarser interval, within the old storage
     bound, and plays back on the right path; old ghosts play as before (#359 item 7). */
import assert from 'node:assert/strict';
import { cupOrder, CUP_BY_ID, cupTracks, GP_POINTS } from '../src/content/cups.js';
import { GhostRecorder, ghostAt, GHOST_SAMPLES } from '../src/core/ghost.js';
import { RACERS } from '../src/content/racers.js';

const store = new Map();
globalThis.localStorage = { getItem: k => (store.has(k) ? store.get(k) : null), setItem: (k, v) => store.set(k, String(v)), removeItem: k => store.delete(k) };
globalThis.window = globalThis;
globalThis.addEventListener = () => {};
globalThis.matchMedia = () => ({ matches: false });
const { App } = await import('../src/game/app.js');
const { Save, trialKey } = await import('../src/core/save.js');
globalThis.document = { body: { classList: { remove() {}, toggle() {} } } };

/* ---------- cupOrder ---------- */
const tie = { h: [1, 2, 2, 8], a: [2, 3, 3, 4] };   // both 40 points: h has a win, a has the better last race
const pts = p => p.reduce((s, r) => s + GP_POINTS[r - 1], 0);
assert.equal(pts(tie.h), pts(tie.a));
for (const [first, second] of [['h', 'a'], ['a', 'h']]) {
  // whoever is listed first in the totals (rivals are, in a real cup), the win decides
  const totals = { [first]: 40, [second]: 40 }, places = { h: tie.h, a: tie.a };
  assert.deepEqual(cupOrder(totals, places), ['h', 'a'], `countback with ${first} listed first`);
  // and the same rule the other way round: the rival holding the win goes ahead
  const flipped = { h: tie.a, a: tie.h };
  assert.deepEqual(cupOrder({ ...totals }, flipped), ['a', 'h'], `countback for the rival with ${first} listed first`);
}
// more 2nds when the wins are level
assert.deepEqual(cupOrder({ x: 36, y: 36 }, { x: [1, 3, 3, 8], y: [2, 1, 8, 4] }), ['y', 'x']);
assert.equal(pts([1, 3, 3, 8]), pts([2, 1, 8, 4]));
// points come first: countback never lifts a lower total
assert.deepEqual(cupOrder({ x: 32, y: 40 }, { x: [1, 1, 8, 8], y: [2, 3, 3, 4] }), ['y', 'x']);
// three-way tie on points and on every count: the last race decides, then the one before
const three = { p: [1, 2, 3], q: [2, 3, 1], r: [3, 1, 2] };
for (const ins of [['p', 'q', 'r'], ['r', 'q', 'p'], ['q', 'p', 'r']]) assert.deepEqual(cupOrder(Object.fromEntries(ins.map(id => [id, 37])), three), ['q', 'r', 'p'], 'three-way tie from ' + ins);
// three-way tie split by countback at different depths (a win; two 2nds; one 2nd), whatever the last race says
const deep = { a: [1, 2, 3, 8], b: [2, 3, 2, 6], c: [3, 4, 4, 2] };
for (const id in deep) assert.equal(pts(deep[id]), 38);
for (const ins of [['c', 'b', 'a'], ['b', 'a', 'c']]) assert.deepEqual(cupOrder(Object.fromEntries(ins.map(id => [id, 38])), deep).join(), 'a,b,c');
// online, 0 = did not race: a level tie goes back race by race, and a missed race loses it
assert.deepEqual(cupOrder({ x: 22, y: 22 }, { x: [2, 3, 0], y: [3, 2, 0] }).join(), 'y,x');
assert.deepEqual(cupOrder({ x: 12, y: 12 }, { x: [0, 2], y: [2, 0] }).join(), 'x,y');
// nobody has raced: a neutral, stable order (ids), not insertion order
assert.deepEqual(cupOrder({ zuck: 0, bezos: 0, elon: 0 }), ['bezos', 'elon', 'zuck']);
assert.deepEqual(cupOrder({ elon: 0, zuck: 0, bezos: 0 }, {}), ['bezos', 'elon', 'zuck']);

/* ---------- a whole cup through the app ---------- */
const fakeApp = () => {
  const a = Object.create(App.prototype);
  Object.assign(a, { save: new Save(), menus: { reset() {}, close() {} }, audio: null, transition() {}, _lockLandscape() {}, _raceFinish() {}, flow: {} });
  return a;
};
const result = (racer, rank, extra = {}) => ({ kart: { lapTimes: [] }, racer, rank, time: 60 + rank, bestLap: 20 + rank, points: GP_POINTS[rank - 1] || 0, isPlayer: false, playerIndex: -1, estimated: false, stats: { coins: 1, hitsGiven: 0, hitsTaken: 0 }, ...extra });
{
  store.clear();
  const app = fakeApp(), cup = CUP_BY_ID.seed, tracks = cupTracks(cup);
  const [H, A, ...O] = RACERS.slice(0, 8);
  const P2 = O[5];
  app.flow = { racers: [H.id, P2.id] };
  const field = [A, ...O.filter(r => r !== P2)].map(r => r.id).concat(app.flow.racers);   // rivals first, as startCup builds it
  app.gp = { cup, tracks, index: 0, grid: [], totals: Object.fromEntries(field.map(id => [id, 0])), places: Object.fromEntries(field.map(id => [id, []])), order: null, cc: 150, level: 'normal' };
  for (let r = 0; r < tracks.length; r++) {
    const free = [1, 2, 3, 4, 5, 6, 7, 8].filter(p => p !== tie.h[r] && p !== tie.a[r]);
    const rows = [result(H, tie.h[r], { isPlayer: true, playerIndex: 0 }), result(A, tie.a[r]), ...free.map((p, j) => { const o = O[(j + 2 * r) % 6]; return result(o, p, o === P2 ? { isPlayer: true, playerIndex: 1 } : {}); })].sort((x, y) => x.rank - y.rank);
    app.gp.index = r;
    App.prototype._finishRace.call(app, { config: { trackId: tracks[r], cc: 150, mode: 'race' }, huds: [], touch: null, race: { players: [] } }, rows);
  }
  assert.equal(app.gp.totals[H.id], 40); assert.equal(app.gp.totals[A.id], 40);
  assert.deepEqual(app.gp.places[H.id], tie.h);
  const standings = app.cupStandings();
  assert.equal(standings[0].racer, H, 'the player wins the tie on countback, though the rival was inserted first');
  assert.equal(standings[1].racer, A);
  assert.ok(standings.every((s, i) => i === 0 || s.points <= standings[i - 1].points));
  App.prototype.gpNext.call(app);
  assert.equal(app.save.trophy(cup.id, 150).rank, 1, 'the trophy records the countback champion');
  assert.equal(app.save.data.stats.races, tracks.length, 'each race counts once with two players');
  assert.equal(app.save.data.stats.wins, 1, 'a race any local player won counts once as a win');
  assert.equal(app.save.data.stats.coins, 2 * tracks.length, 'both players bank their coins');
}

/* ---------- split-screen records ---------- */
{
  store.clear();
  const app = fakeApp(), [a, b, c] = RACERS;
  let shown = null; app._raceFinish = o => { shown = o.records; };
  // P2 sets the race time and wins; P1 sets the best lap
  const rows = [result(b, 1, { isPlayer: true, playerIndex: 1, time: 70, bestLap: 23 }), result(a, 2, { isPlayer: true, playerIndex: 0, time: 71, bestLap: 22 }), result(c, 3)];
  App.prototype._finishRace.call(app, { config: { trackId: 'silicon-valley', cc: 100, mode: 'race' }, huds: [], touch: null, race: { players: [] } }, rows);
  const best = app.save.bestFor('silicon-valley', 100);
  assert.deepEqual([best.race, best.racer, best.lap], [70, b.id, 22]);
  assert.deepEqual([shown.newBestRace, shown.raceBy, shown.newBestLap, shown.lapBy, shown.players], [true, 1, true, 0, 2]);
  assert.deepEqual([app.save.data.stats.races, app.save.data.stats.wins], [1, 1]);
  // next race: P1 beats the lap only; the callout names P1 and nothing else
  const rows2 = [result(c, 1), result(a, 2, { isPlayer: true, playerIndex: 0, time: 72, bestLap: 21.5 }), result(b, 3, { isPlayer: true, playerIndex: 1, time: 73, bestLap: 23 })];
  App.prototype._finishRace.call(app, { config: { trackId: 'silicon-valley', cc: 100, mode: 'race' }, huds: [], touch: null, race: { players: [] } }, rows2);
  assert.deepEqual([shown.newBestRace, shown.raceBy, shown.newBestLap, shown.lapBy], [false, null, true, 0]);
  assert.deepEqual([app.save.bestFor('silicon-valley', 100).race, app.save.bestFor('silicon-valley', 100).lap], [70, 21.5]);
  assert.deepEqual([app.save.data.stats.races, app.save.data.stats.wins], [2, 1], 'a race no player won is not a win');
}

/* ---------- ghosts ---------- */
const STEP = 1 / 60, R = 220, W = 0.13;   // a kart lapping a circle at about 29 m/s
const path = t => ({ x: R * Math.cos(W * t), y: 2 + Math.sin(t * 0.2), z: R * Math.sin(W * t), yaw: -W * t });
function record(seconds, rec = new GhostRecorder('elon')) {
  for (let i = 0; i * STEP <= seconds; i++) rec.sample(i * STEP, path(i * STEP));
  return rec;
}
/* The recorder this replaced: 0.1 s samples, cut off at 4000. */
function oldGhost(seconds) {
  const d = []; let next = 0;
  for (let i = 0; i * STEP <= seconds; i++) { const t = i * STEP, k = path(t); if (t >= next && d.length < 4 * 4000) { next += 0.1; d.push(+k.x.toFixed(2), +k.y.toFixed(2), +k.z.toFixed(2), +k.yaw.toFixed(3)); } }
  return { racer: 'elon', step: 0.1, time: seconds, d };
}
const near = (p, t, tol) => { const q = path(t), dy = Math.atan2(Math.sin(p.yaw - q.yaw), Math.cos(p.yaw - q.yaw)); return Math.hypot(p.x - q.x, p.y - q.y, p.z - q.z) <= tol && Math.abs(dy) <= 0.05; };
function roundTrip(ghost) { const s = new Save(); s.setGhost('silicon-valley', 150, ghost); return s.ghost('silicon-valley', 150); }
{
  store.clear();
  // a typical run is stored exactly as before
  const typical = record(95).ghost(95), old = oldGhost(95);
  assert.equal(typical.step, 0.1);
  // same samples in the same format; the bytes differ only by where in a frame each sample lands
  assert.equal(typical.d.length, old.d.length, 'a 95 s ghost has as many samples as before');
  assert.ok(Math.abs(JSON.stringify(typical).length / JSON.stringify(old).length - 1) < 0.005, 'and is the same size');
  // a 900 s run: whole, at most as big as the old cap, and on the path all the way round
  const long = roundTrip(record(900).ghost(900)), cut = oldGhost(900);
  const n = long.d.length / 4;
  assert.ok(n <= GHOST_SAMPLES, `${n} samples`);
  assert.ok((n - 1) * long.step >= 899, `the ghost reaches the finish (${((n - 1) * long.step).toFixed(1)} s)`);
  assert.ok((cut.d.length / 4 - 1) * cut.step < 400, 'the old recorder stopped at 400 s');
  assert.ok(JSON.stringify(long).length <= JSON.stringify(cut).length, 'no bigger than the old capped ghost');
  if (process.argv.includes('--sizes')) console.log(`ghost bytes: 95 s ${JSON.stringify(typical).length} (was ${JSON.stringify(old).length}); 900 s ${JSON.stringify(long).length}, ${n} samples at ${long.step} s (was ${JSON.stringify(cut).length}, cut at 400 s)`);
  for (let t = 0; t < 899; t += 7.3) assert.ok(near(ghostAt(long, t), t, 0.6), `on the path at ${t.toFixed(1)} s`);
  assert.equal(ghostAt(long, 901), null, 'gone after the finish');
  // a run that just crosses the cap halves once and still lines up
  const mid = record(450).ghost(450);
  assert.equal(mid.step, 0.2);
  for (let t = 0; t < 449; t += 3.1) assert.ok(near(ghostAt(mid, t), t, 0.3), `450 s run at ${t.toFixed(1)} s`);
  // an old saved ghost (no interval stored, or the 0.1 s it always had) plays the same
  const legacy = roundTrip(oldGhost(95)); delete legacy.step;
  for (let t = 0; t < 94; t += 2.9) { assert.ok(near(ghostAt(legacy, t), t, 0.6)); assert.deepEqual(ghostAt(legacy, t), ghostAt(old, t)); }
  // damaged data is ignored, not thrown on
  for (const bad of [null, {}, { d: [] }, { d: [1, 2, 3, 4] }, { step: 0, d: old.d }]) { const p = ghostAt(bad, 3); assert.ok(p === null || isFinite(p.x)); }
  // a time trial's finish saves the recorder's ghost through the app
  const app = fakeApp(), rec = record(95), k = { };
  const rows = [result(RACERS[0], 1, { isPlayer: true, playerIndex: 0, time: 95, bestLap: 30, kart: Object.assign(k, { lapTimes: [30, 32, 33] }) })];
  App.prototype._finishRace.call(app, { config: { trackId: 'silicon-valley', cc: 150, mode: 'timetrial' }, huds: [], touch: null, rec, race: { players: [k] }, trialBest: null }, rows);
  const saved = app.save.ghost('silicon-valley', 150);
  assert.equal(saved.time, 95); assert.equal(saved.step, 0.1); assert.equal(saved.d.length, rec.d.length);
  assert.equal(app.save.bestFor('silicon-valley', trialKey(150)).race, 95);
}
console.log('standings-check: ok');
