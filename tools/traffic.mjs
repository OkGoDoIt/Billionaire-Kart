#!/usr/bin/env node
/* Measure the race a player enters: one scripted human slot at the back and seven
   CPU opponents. An all-AI grid disables the human-relative pace adjustment.
   node tools/traffic.mjs [--root /baseline/worktree] [--pilot-root /baseline/worktree]
     [--seeds 4] [--seed-offset 0] [--tracks davos,crypto-cove] [--cc 100] [--level normal] [--delay 4]
   Pass the same pilot-root to both revisions to keep the stand-in human's driving code fixed. */
import assert from 'node:assert/strict';
import { resolve, join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { takeSlot } from './slot.mjs';

await takeSlot('race-traffic');
const opts = Object.fromEntries(process.argv.slice(2).flatMap((k, i, a) => k.startsWith('--') ? [[k.slice(2), a[i + 1]]] : []));
const root = resolve(opts.root || join(dirname(fileURLToPath(import.meta.url)), '..'));
const load = (file, base = root) => import(pathToFileURL(join(base, file)).href);
const { TRACKS, getTrack } = await load('src/content/tracks.js'), { Race } = await load('src/race/race.js');
const { RACERS } = await load('src/content/racers.js'), { makeRng } = await load('src/core/util.js');
const { AIDriver } = await load('src/race/ai.js', opts['pilot-root'] || root);
const ids = opts.tracks?.split(',') || TRACKS.map(d => d.id);
const seeds = Number(opts.seeds || 4), firstSeed = Number(opts['seed-offset'] || 0), cc = Number(opts.cc || 100), level = opts.level || 'normal', delay = Number(opts.delay || 0), dt = 1 / 60;
const fresh = () => ({ races: 0, seconds: 0, opening: 0, openingPack4: 0, pack4: 0, rivalsNear: 0, draft: 0, rapidDraft: 0, eligible: 0, pickups: 0, boxes: 0, wasted: 0, wins: 0, ranks: 0, gained: 0, recovered: 0, rescues: 0 });
const total = fresh(), byCourse = {};
for (const id of ids) {
  const track = getTrack(id), m = byCourse[id] = fresh();
  for (let seed = firstSeed; seed < firstSeed + seeds; seed++) {
    const rng = makeRng(7001 + 79 * seed), field = rng.shuffle(RACERS.slice()).slice(0, 8);
    const race = new Race({ track, cc, seed: 841 + seed, entries: field.map((racer, i) => ({ racer, level, player: i === 7 ? 0 : -1 })) });
    const p = race.players[0], rivals = race.karts.filter(k => k !== p);
    const pilot = new AIDriver(p, level, makeRng(1129 + 23 * seed));
    const previousDraft = new Map(), contact = new Set(), received = new Set();
    // Count only lines the player actually drove through with an empty slot. An
    // untouched box on the far side of the road doesn't make a denied pickup a success.
    const processItems = race.items.step.bind(race.items);
    race.items.step = dt => {
      const rowKey = b => p.lap + ':' + b.s;
      const eligible = !p.finished && !p.item && p.rouletteT <= 0 && p.goldenT <= 0 && p.rescueT <= 0;
      if (eligible) for (const b of race.items.boxes) {
        if ((b.x - p.x) ** 2 + (b.z - p.z) ** 2 < 2.9 && Math.abs(p.y + .6 - b.y) < 2.2) contact.add(rowKey(b));
      }
      processItems(dt);
      for (const e of race.events) if (e.type === 'boxBreak') {
        const k = e.data.kart;
        m.boxes++;
        if (!k.events.some(a => a.type === 'roulette')) m.wasted++;
        else if (k === p && eligible) received.add(rowKey(e.data.box));
      }
    };
    let tick = 0, earlyRank = 8;
    for (; tick < 24000 && race.state !== 'done'; tick++) {
      const input = pilot.think(dt);
      race.step(dt, [delay && (race.frozen || race.time < delay) ? {} : input]);
      if (race.time < 10) earlyRank = p.rank;
      // Everyone is still racing. Sample whole seconds after the initial grid launch.
      if (!race.frozen && !race.finishOrder.length && race.time >= 4 && tick % 60 === 0) {
        const d = rivals.map(k => k.raceDistance).sort((a, b) => a - b);
        const pack = d.some((x, i) => i >= 3 && x - d[i - 3] <= 20);
        m.seconds++; m.pack4 += +pack; m.rivalsNear += d.filter(x => Math.abs(p.raceDistance - x) < 15).length;
        if (race.time <= 24) { m.opening++; m.openingPack4 += +pack; }
      }
      for (const k of race.karts) {
        for (const e of k.events) {
          if (e.type === 'rescue') m.rescues++;
          if (k !== p && e.type === 'draft' && !race.finishOrder.length && race.time >= 4) {
            m.draft++; if (race.time - (previousDraft.get(k) ?? -100) < 3) m.rapidDraft++;
            previousDraft.set(k, race.time);
          }
        }
        k.events.length = 0;
      }
      race.events.length = 0;
    }
    if (race.state !== 'done' || !p.finished || !Number.isFinite(p.finishTime)) throw Error(id + ': unfinished race');
    m.races++; m.wins += +(p.finishRank === 1); m.ranks += p.finishRank;
    m.gained += earlyRank - p.finishRank; m.recovered += +(p.finishRank < earlyRank);
    m.eligible += contact.size; m.pickups += received.size;
  }
  for (const key of Object.keys(total)) total[key] += m[key];
}
if (process.argv.includes('--check')) {
  // Broad guardrails for the standard 100cc sample in npm test. The goal is room
  // for a pass, not a time trial: keep some nearby rivals and some earned drafts.
  const m = total;
  assert.ok(m.pack4 / m.seconds < .35, 'four-rival packs occupy too much of the race');
  assert.ok(m.openingPack4 / m.opening < .70, 'the opening field stays clumped');
  assert.ok(m.rivalsNear / m.seconds > .15 && m.draft > 0, 'racing has lost its close contests');
  assert.ok(m.rapidDraft / m.draft < .2, 'slipstream boosts are chaining');
  assert.ok(m.pickups / m.eligible > .70 && m.wasted === 0, 'drivers are denied boxes on their own line');
  console.log(`traffic-check: ok (${m.races} races, ${(100 * m.pack4 / m.seconds).toFixed(1)}% dense samples, ${m.pickups}/${m.eligible} eligible pickups)`);
} else console.log(JSON.stringify({ cc, level, seeds, firstSeed, delay, byCourse, total }, null, 2));
