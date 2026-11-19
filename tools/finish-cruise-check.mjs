/* Past the line, a player's kart drives itself. On every track, a player who finishes and then lets go of
   the controls keeps lapping for the next 40 seconds (the longest an online race waits for the others),
   instead of rolling straight on into a wall, or onto an island's tip, and sitting there.
   The kart can cross the line anywhere, so every track is run on several arrival lines: the racing line
   (a hard AI all the way), held lines across the road's width, two lines cutting across it diagonally,
   flat out and slowed; and parked after the line nose-in on a wall, and on the first island post or crate,
   to be backed off and steered out. After the line nothing may stop the kart for long, and nothing may rescue it.
   Usage: node tools/finish-cruise-check.mjs [--track id] [--verbose] */
import { readdirSync } from 'node:fs';
import { Track, EDGE } from '../src/track/track.js';
import { Race } from '../src/race/race.js';
import { AIDriver } from '../src/race/ai.js';
import { RACERS } from '../src/content/racers.js';
import { makeRng, clamp, wrapAngle, mod } from '../src/core/util.js';
import { takeSlot } from './slot.mjs';

await takeSlot('finish cruise');
const args = process.argv.slice(2), only = args.includes('--track') ? args[args.indexOf('--track') + 1] : null, verbose = args.includes('--verbose');
const ids = only ? [only] : readdirSync(new URL('../src/tracks/', import.meta.url)).filter(f => f.endsWith('.js') && !f.startsWith('_')).map(f => f.replace('.js', ''));
const DT = 1 / 60, AFTER = 40, APPROACH = 90, IDLE = { steer: 0, throttle: 0, brake: 0, drift: false, item: false };
/* Arrival lines. f: where across the road the kart runs (-1 the right edge, +1 the left), f1: where it crosses
   the line (it moves over in the last 40 m), v: the speed it holds, as a share of its top speed. */
const LINES = [{ name: 'racing line' }];
for (const v of [1, 0.55]) for (const f of [-0.8, -0.4, 0, 0.4, 0.8]) LINES.push({ name: `lat ${f} at ${v === 1 ? 'full' : 'part'} speed`, f, f1: f, v });
LINES.push({ name: 'across, right to left', f: -0.7, f1: 0.8, v: 1 }, { name: 'across, left to right', f: 0.7, f1: -0.8, v: 1 });
LINES.push({ name: 'parked nose-in on a wall', park: 'wall' }, { name: 'parked nose-in on an obstacle', park: 'obstacle' });

/** Put the finished kart at rest against something solid: nose 50 degrees into the first wall past the line,
    or square onto the first static obstacle that bumps (an island's tip, a crate). False if the track has none. */
function park(k, kind) {
  const race = k.race, tr = race.track, P = { x: 0, y: 0, z: 0 };
  let s = null, lat = 0, turn = 0;
  if (kind === 'wall') {
    for (let d = 15; d < tr.length - 15 && s == null; d += 2) {
      const i = mod(Math.round((k.s + d) / tr.ds), tr.N);
      for (const side of [1, -1]) if (s == null && !tr.bridge[i] && (side > 0 ? tr.edgeL : tr.edgeR)[i] === EDGE.WALL) { s = k.s + d; lat = side * ((side > 0 ? tr.hwL : tr.hwR)[i] - 1.3); turn = side * 0.9; }
    }
  } else {
    let best = Infinity;
    for (const o of race.obstacles) {
      if (o.kind !== 'static' || o.effect !== 'bump' || o.lift > 2) continue;
      const d = mod(o.a.s - k.s, tr.length);
      if (d > 15 && d < best) { best = d; s = o.a.s - o.radius - k.radius - 0.4; lat = o.a.lat; }
    }
  }
  if (s == null) return false;
  const i = mod(Math.round(s / tr.ds), tr.N);
  tr.pointAt(s, lat, P);
  k.place(P.x, P.y, P.z, tr.yaw[i] + turn, i);
  return true;
}

/** The stand-in for the player on the run to the line: holds a share of the road's width at a set speed. */
function linePilot(k, line) {
  const tr = k.race.track, inp = { steer: 0, throttle: 1, brake: 0, drift: false, item: false }, P = { x: 0, y: 0, z: 0 };
  const latAt = (s, toGo) => {
    const i = mod(Math.round(s / tr.ds), tr.N), f = line.f + (line.f1 - line.f) * clamp(1 - toGo / 40, 0, 1);
    return f >= 0 ? f * (tr.hwL[i] - 1.5) : f * (tr.hwR[i] - 1.5);
  };
  return () => {
    const toGo = k.race.laps * tr.length - k.raceDistance, look = 6 + k.speed * 0.4;
    tr.pointAt(k.s + look, latAt(k.s + look, toGo - look), P);
    const ang = wrapAngle(Math.atan2(P.x - k.x, P.z - k.z) - k.yaw);
    inp.steer = clamp(-ang * 2.4, -1, 1);
    const want = k.top * line.v;
    inp.throttle = k.speed < want ? 1 : 0; inp.brake = k.speed > want + 3 ? 0.4 : 0;
    return inp;
  };
}

function run(track, line) {
  const field = makeRng(41).shuffle(RACERS.slice()).slice(0, 4);
  // a held line runs a one-lap race: the approach is what differs, and it keeps the check quick
  const race = new Race({ track, cc: 150, seed: 7, countdown: 0, laps: line.f == null ? undefined : 1, entries: field.map((racer, i) => i === 3 ? { racer, player: 0 } : { racer, player: -1, level: 'normal' }) });
  const me = race.players[0], ai = new AIDriver(me, 'hard', makeRng(3)), held = line.f == null ? null : linePilot(me, line);
  let n = 0, best = -1, bestT = 0, pilot = 'ai';
  while (!me.finished && n < 60 * 60 * 8) {
    const toGo = race.laps * track.length - me.raceDistance;
    if (held && pilot === 'ai' && toGo < APPROACH) { pilot = 'held'; best = me.raceDistance; bestT = 0; }
    if (pilot === 'held') {   // a held line that cannot get to the line (a wall in the way) hands back to the AI
      if (me.raceDistance > best + 2) { best = me.raceDistance; bestT = 0; } else if ((bestT += DT) > 3) pilot = 'ai (held line blocked)';
    }
    race.step(DT, [pilot === 'held' ? held() : ai.think(DT)]); n++;
  }
  if (!me.finished) return { ok: false, msg: 'the stand-in pilot never finished' };
  if (line.park && !park(me, line.park)) return { ok: true, msg: `${line.name}: none on this track` };
  const arrive = line.park ? `at cp ${track.cp[me.hit.i].toFixed(2)}, lat ${me.hit.lat.toFixed(1)}` : `crossed at lat ${me.hit.lat.toFixed(1)}, ${me.speed.toFixed(0)} m/s${pilot.startsWith('ai (') ? ', ' + pilot.slice(4, -1) : ''}`;
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
  // a cool-down lap at the finished kart's pace covers well over half a lap in 40 s on every track
  const ok = laps > 0.5 && slowRun < 4 && !rescues;
  return { ok, msg: `${line.name} (${arrive}): ${laps.toFixed(2)} laps in ${AFTER} s after the line, longest stop ${slowRun.toFixed(1)} s, ${walls} wall hits, ${rescues} rescues` };
}

let failed = 0;
for (const id of ids) {
  const track = new Track((await import(`../src/tracks/${id}.js`)).default);
  let bad = 0;
  for (const line of LINES) {
    const r = run(track, line);
    if (!r.ok) bad++;
    if (!r.ok || verbose) console.log(`${r.ok ? 'ok  ' : 'FAIL'} ${id}: ${r.msg}`);
  }
  if (bad) failed++;
  else if (!verbose) console.log(`ok   ${id}: ${LINES.length - 2} arrival lines, 2 parked starts`);
}
if (failed) { console.log(`finish-cruise: ${failed} track(s) failed`); process.exit(1); }
console.log('finish-cruise: ok');
