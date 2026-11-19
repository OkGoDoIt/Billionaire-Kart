/* Item and race rules that every hit, boost, press, and finish must follow (#349, #357, #359):
   Market Crash goes through the shared hit path (mercy invulnerability and Bill's absorb stop it);
   a weaker boost never stretches a stronger one; an item press held through GO fires at GO, and a
   key tap shorter than a frame is still read; a finished kart is out of reach of shots, hazards,
   and coins; an Insider Trading steal always lands; and in split screen a player who stops does
   not hold the race forever. Usage: node tools/item-rules-check.mjs */
import assert from 'node:assert/strict';
import { Race, HUMAN_FINISH_CAP } from '../src/race/race.js';
import { TUNE } from '../src/race/kart.js';
import { AIDriver } from '../src/race/ai.js';
import { Track } from '../src/track/track.js';
import { RACERS } from '../src/content/racers.js';
import { makeRng } from '../src/core/util.js';
import { takeSlot } from './slot.mjs';

await takeSlot('item rules');
const dt = 1 / 60;
const by = id => RACERS.find(r => r.id === id);
const PLAIN = ['sam', 'dario', 'demis', 'thiel', 'jensen'].map(by);   // no special that touches these rules
const track = new Track({ width: 30, path: [[0, 0, 0], [0, 0, 120], [0, 0, 200], [140, 0, 200], [140, 0, -150], [0, 0, -140]].map(p => ({ p })) });
const GAS = { steer: 0, throttle: 1, brake: 0, drift: false, item: false };

function race(racers, opts = {}) {
  return new Race({ track, cc: 150, countdown: 0, items: false, coins: false, laps: 3, ...opts, entries: racers.map((racer, player) => ({ racer, player })) });
}
const put = (k, s, lat = 0) => { const p = track.pointAt(s, lat, {}); k.place(p.x, p.y, p.z, track.yawAt(s), Math.floor(s / track.ds)); };
const events = (k, type) => k.events.filter(e => e.type === type);

/* ---------- #349: Market Crash respects mercy invulnerability and Bill's absorb ---------- */
{
  const r = race([PLAIN[0], PLAIN[1], by('bill'), PLAIN[2]]);
  const [user, mercy, bill, open] = r.karts;
  [[user, 20], [mercy, 60], [bill, 80], [open, 100]].forEach(([k, s]) => put(k, s));
  r.step(dt);
  for (const k of [mercy, bill, open]) r.items.give(k, 'leak');
  mercy.invulnT = 1.2;   // just recovered from another hit
  r.items.give(user, 'crash');
  r.step(dt, [{ item: true }]);
  assert.equal(mercy.shrinkT, 0, 'mercy invulnerability stops the crash');
  assert.equal(mercy.item, 'leak', 'and the crash does not shake its item loose');
  assert.equal(mercy.stats.hitsTaken, 0);
  assert.equal(bill.shrinkT, 0, 'Bill’s cover takes the crash');
  assert.equal(bill.item, 'leak');
  assert.equal(events(bill, 'absorbed').length, 1, 'the COVERED! moment fires');
  assert.equal(bill.absorbs, 0, 'and uses up the cover');
  assert.ok(bill.invulnT > 0);
  assert.ok(open.shrinkT > 0 && open.hitT > 0 && open.hitKind === 'zap', 'an open kart is shrunk and jolted');
  assert.equal(open.item, null, 'and loses its item');
  assert.equal(open.stats.hitsTaken, 1);
  assert.equal(user.stats.hitsGiven, 1);
}

/* ---------- #359.1: a weaker boost never stretches a stronger one ---------- */
{
  const r = race([PLAIN[0]]);
  const k = r.karts[0];
  put(k, 20); r.step(dt);
  const mini = [TUNE.tierBoost[2], TUNE.tierMul[2]];
  const trace = (first, second) => {
    put(k, 20); k.boostT = 0; k.boostMul = 1; k.boostKind = ''; k.boostNext = null;
    first(); second();
    const out = [];
    for (let t = 0; t < 3; t += dt) { r.step(dt, [GAS]); out.push({ t: t + dt, mul: k.boostMul, kind: k.boostKind, on: k.boostT > 0 }); }
    return out;
  };
  const at = (tr, t) => tr.find(s => s.t >= t - 1e-9);
  const end = tr => tr.find(s => !s.on).t;
  // a mushroom, then a longer, weaker purple mini-turbo
  let tr = trace(() => k.boost('mushroom'), () => k.boost('mini', ...mini));
  assert.equal(at(tr, 1.0).mul, TUNE.mushroom.mul); assert.equal(at(tr, 1.0).kind, 'mushroom');
  assert.equal(at(tr, 1.6).mul, mini[1], 'the mushroom ends on time; the mini-turbo carries on at its own strength');
  assert.equal(at(tr, 1.6).kind, 'mini', 'boostKind is the boost in effect');
  assert.ok(Math.abs(end(tr) - mini[0]) < 0.05, 'the mini-turbo still ends when it would have');
  // the same pair the other way round: the stronger one takes over, the weaker one resumes after it
  tr = trace(() => k.boost('mini', ...mini), () => k.boost('mushroom'));
  assert.equal(at(tr, 1.0).mul, TUNE.mushroom.mul);
  assert.equal(at(tr, 1.6).kind, 'mini');
  assert.ok(Math.abs(end(tr) - mini[0]) < 0.05);
  // a shorter, weaker boost inside a stronger one changes nothing
  tr = trace(() => k.boost('mushroom'), () => k.boost('trick'));
  assert.ok(tr.filter(s => s.on).every(s => s.mul === TUNE.mushroom.mul && s.kind === 'mushroom'));
  assert.ok(Math.abs(end(tr) - TUNE.mushroom.t) < 0.05, 'the mushroom is not stretched');
  // a hit ends everything, waiting boosts included
  k.boost('mushroom'); k.boost('mini', ...mini); k.invulnT = 0; k.hurt('spin');
  assert.equal(k.boostT, 0); assert.equal(k.boostNext, null);
}

/* ---------- #359.2: an item press held through GO fires at GO ---------- */
{
  const countdownRace = script => {
    const r = race([PLAIN[0]], { countdown: 0.5 });
    const k = r.karts[0]; put(k, 20);
    r.items.give(k, 'boost');
    let n = 0, firedAt = -1;
    while (n < 90) { r.step(dt, [{ ...GAS, item: script(n, r) }]); n++; if (k.item == null && firedAt < 0) firedAt = r.frozen ? -2 : n; }
    return { firedAt, goAt: 30 };
  };
  // pressed in the countdown and held: fires on the step that says GO
  let res = countdownRace(n => n >= 10);
  assert.ok(res.firedAt > 0 && res.firedAt <= res.goAt + 1, `held through GO fires at GO (step ${res.firedAt})`);
  // held since the menu (Enter and Space also confirm): no surprise item at GO
  res = countdownRace(() => true);
  assert.equal(res.firedAt, -1, 'a button held since before the countdown does not fire');
  // tapped and let go during the countdown: nothing at GO
  res = countdownRace(n => n >= 5 && n < 10);
  assert.equal(res.firedAt, -1, 'a tap during the countdown is not saved up');
  // never during the countdown itself
  assert.ok(countdownRace(n => n >= 3).firedAt !== -2);

  // a key tap shorter than a frame is still read once (keydown and keyup both land between two polls)
  const handlers = {};
  globalThis.addEventListener = (type, fn) => { (handlers[type] ||= []).push(fn); };
  globalThis.HTMLInputElement ??= class {};
  const { Input } = await import('../src/core/input.js');
  const input = new Input();
  const key = (type, code) => handlers[type].forEach(fn => fn({ type, code, repeat: false, preventDefault() {}, target: null }));
  key('keydown', 'Space'); key('keyup', 'Space');
  assert.equal(input.poll(dt)[0].item, true, 'a sub-frame tap reaches the next poll');
  assert.equal(input.poll(dt)[0].item, false, 'once');
  key('keydown', 'ShiftLeft'); key('keyup', 'ShiftLeft');
  assert.equal(input.poll(dt)[0].drift, true, 'a sub-frame hop tap too');
  delete globalThis.addEventListener;
}

/* ---------- #359.3: a finished kart is out of reach of shots, hazards, and coins ---------- */
{
  const r = race([PLAIN[0], PLAIN[1], PLAIN[2]]);
  const [shooter, done, target] = r.karts;
  put(shooter, 20); put(done, 45); put(target, 75);
  r.step(dt);
  done.finished = true; done.finishRank = 1; r.finishOrder.push(done);
  // a subpoena straight down the road flies through the finished kart and serves the racer behind it
  r.items.give(shooter, 'subpoena');
  r.step(dt, [{ item: true }, {}, {}]);
  const shot = r.items.shots[0];
  for (let i = 0; i < 120 && !shot.dead; i++) { put(done, 45); r.step(dt, [{}, {}, {}]); }
  assert.equal(done.stats.hitsTaken, 0);
  assert.equal(target.stats.hitsTaken, 1, 'the shot passes through and lands on the racer');
  // a leak under the finished kart stays on the road
  const leak = { id: 9001, type: 'leak', x: done.x, y: done.y, z: done.z, radius: 1.15, owner: shooter, age: 5, life: 75, hint: done.hint };
  r.items.hazards.push(leak);
  r.step(dt, [{}, {}, {}]);
  assert.ok(r.items.hazards.includes(leak), 'a finished kart drives over a hazard without setting it off');
  // and it leaves coins for the racers
  r.items.coins.push({ id: 9002, x: done.x, y: done.y + 0.9, z: done.z, active: true, t: 0 });
  const coins = done.coins;
  r.step(dt, [{}, {}, {}]);
  assert.equal(done.coins, coins, 'a finished kart collects no coins');
  assert.equal(r.items.coins.at(-1).active, true);
}

/* ---------- #359.4: an Insider Trading steal always lands ---------- */
{
  const r = race([PLAIN[0], PLAIN[1]]);
  const [thief, victim] = r.karts;
  put(thief, 20); put(victim, 60);
  r.step(dt);
  r.items.give(victim, 'tweet');
  r.items.give(thief, 'insider');
  r.step(dt, [{ item: true }, {}]);
  assert.equal(victim.item, null); assert.equal(thief.item, null);
  assert.equal(r.events.filter(e => e.type === 'steal').length, 1);
  // drive through an item box while the stolen item is on its way: the slot is spoken for
  const box = { id: 9003, x: thief.x, y: thief.y + 1.15, z: thief.z, active: true, t: 0 };
  r.items.boxes.push(box);
  for (let i = 0; i < 20; i++) { box.x = thief.x; box.z = thief.z; r.step(dt, [{}, {}]); }
  assert.equal(box.active, true, 'no box can fill the slot during the delivery');
  assert.equal(thief.rouletteT, 0);
  for (let i = 0; i < 60; i++) r.step(dt, [{}, {}]);
  assert.equal(thief.item, 'tweet', 'the stolen item arrives');
  r.items.boxes.pop();
  // if the thief's hand is somehow full at arrival, the item goes home instead of vanishing
  r.items.give(victim, 'leak'); r.items.give(thief, 'insider');
  for (let i = 0; i < 30; i++) r.step(dt, [{}, {}]);   // past the use cooldown of the last press
  r.step(dt, [{ item: true }, {}]);
  assert.equal(victim.item, null);
  thief.item = 'boost'; thief.itemUses = 1;
  for (let i = 0; i < 70; i++) r.step(dt, [{}, {}]);
  assert.equal(victim.item, 'leak', 'returned to its owner');
  assert.equal(thief.item, 'boost');
}

/* ---------- #357: in split screen a player who stops cannot hold the race ---------- */
{
  const r = new Race({ track, cc: 150, countdown: 0, items: false, coins: false, laps: 1,
    entries: [{ racer: PLAIN[0], player: 0 }, { racer: PLAIN[1], player: 1 }, { racer: PLAIN[2], player: -1, level: 'easy' }] });
  const [me, afk] = r.players;
  const pilot = new AIDriver(me, 'hard', makeRng(3));
  let n = 0;
  while (!me.finished && n < 60 * 120) { r.step(dt, [pilot.think(dt), {}]); n++; }
  assert.ok(me.finished, 'the stand-in pilot finished');
  assert.equal(r.capT, HUMAN_FINISH_CAP);
  let t = 0, running = [];
  while (r.state === 'racing' && t < HUMAN_FINISH_CAP + 5) {
    running = r.karts.filter(k => !k.finished).sort((a, b) => b.raceDistance - a.raceDistance);
    r.step(dt, [{}, {}]); t += dt;
  }
  assert.ok(Math.abs(t - HUMAN_FINISH_CAP) < 0.1, `the cap runs ${HUMAN_FINISH_CAP} s (${t.toFixed(2)})`);
  for (let i = 0; i < 5 && r.state !== 'done'; i++) r.step(dt, [{}, {}]);
  assert.equal(r.state, 'done');
  const res = r.results();
  assert.equal(res.length, 3);
  assert.equal(res[0].kart, me);
  const a = res.find(x => x.kart === afk);
  assert.ok(a.estimated && a.time > r.time, 'the stopped player is placed with an estimated time');
  // placed by running position, as rivals are
  const est = res.filter(x => x.estimated).map(x => x.kart);
  assert.deepEqual(est, running.filter(k => est.includes(k)));
  // solo is unchanged: the race ends when its one player finishes
  const solo = race([PLAIN[0]], { laps: 1 });
  const p2 = new AIDriver(solo.karts[0], 'hard', makeRng(3));
  for (let i = 0; i < 60 * 120 && !solo.karts[0].finished; i++) solo.step(dt, [p2.think(dt)]);
  assert.equal(solo.capT, null, 'no cap in solo');
  assert.notEqual(solo.state, 'racing', 'a solo race ends when its player finishes');
}
console.log('item-rules-check: ok');
