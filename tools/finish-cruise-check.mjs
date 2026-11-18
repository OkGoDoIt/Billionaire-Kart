/* Past the line, a player's kart drives itself. On every track, a player who finishes and then lets go of
   the controls keeps lapping on the racing line for the next 40 seconds (the longest an online race waits
   for the others), instead of rolling straight on into a wall and sitting there.
   Usage: node tools/finish-cruise-check.mjs [--track id] [--verbose] */
import { readdirSync } from 'node:fs';
import { Track } from '../src/track/track.js';
import { Race } from '../src/race/race.js';
import { AIDriver } from '../src/race/ai.js';
import { RACERS } from '../src/content/racers.js';
import { makeRng } from '../src/core/util.js';
import { takeSlot } from './slot.mjs';

await takeSlot('finish cruise');
const args = process.argv.slice(2), only = args.includes('--track') ? args[args.indexOf('--track') + 1] : null, verbose = args.includes('--verbose');
const ids = only ? [only] : readdirSync(new URL('../src/tracks/', import.meta.url)).filter(f => f.endsWith('.js') && !f.startsWith('_')).map(f => f.replace('.js', ''));
const DT = 1 / 60, AFTER = 40, IDLE = { steer: 0, throttle: 0, brake: 0, drift: false, item: false };
let failed = 0;

for (const id of ids) {
  const track = new Track((await import(`../src/tracks/${id}.js`)).default);
  const field = makeRng(41).shuffle(RACERS.slice()).slice(0, 4);
  const race = new Race({ track, cc: 150, seed: 7, countdown: 0, entries: field.map((racer, i) => i === 3 ? { racer, player: 0 } : { racer, player: -1, level: 'normal' }) });
  const me = race.players[0], pilot = new AIDriver(me, 'hard', makeRng(3));
  let n = 0;
  while (!me.finished && n < 60 * 60 * 8) { race.step(DT, [pilot.think(DT)]); n++; }
  if (!me.finished) { console.log(`FAIL ${id}: the stand-in pilot never finished`); failed++; continue; }
  // hands off: from here the race drives the kart
  let dist = 0, lastS = me.s, slow = 0, slowRun = 0, rescues = 0, walls = 0;
  me.events.length = 0;
  for (let t = 0; t < AFTER; t += DT) {
    race.step(DT, [IDLE]);
    let d = me.s - lastS; if (d < -track.length / 2) d += track.length; if (d > track.length / 2) d -= track.length;
    if (me.rescueT <= 0) dist += d;
    lastS = me.s;
    if (me.speed < 3 && me.rescueT <= 0) { slow += DT; slowRun = Math.max(slowRun, slow); } else slow = 0;
    for (const e of me.events) { if (e.type === 'rescue') rescues++; else if (e.type === 'wall') walls++; }
    me.events.length = 0;
  }
  const laps = dist / track.length;
  // a cool-down lap at the finished kart's half throttle covers well over half a lap in 40 s on every track
  const ok = laps > 0.5 && slowRun < 4;
  if (!ok) failed++;
  if (!ok || verbose) console.log(`${ok ? 'ok  ' : 'FAIL'} ${id}: ${laps.toFixed(2)} laps in ${AFTER} s after the line, longest stop ${slowRun.toFixed(1)} s, ${walls} wall hits, ${rescues} rescues`);
}
if (failed) { console.log(`finish-cruise: ${failed} track(s) failed`); process.exit(1); }
console.log('finish-cruise: ok');
