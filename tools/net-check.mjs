#!/usr/bin/env node
/* Online play, headless (docs/online-protocol.md). Several simulated devices in one process, each with
   its own Race + NetRace + Conn, joined by an in-memory relay that does what the server does during a race:
   relays snapshots (only from a slot's owner) and events, keeps the finishing order, hands a silent owner's
   karts to the CPU owner and back, and keeps the shared clock. Links have latency, jitter, and TCP-style
   stalls: a lost packet delays everything behind it by a retransmit time; nothing is ever dropped. Frames
   written in the same moment travel in one packet, so the stall rate is per packet, not per frame.

   Usage: node tools/net-check.mjs [--only conn,tracking,items,...] [--quick] [--verbose]
   Prints PASS/FAIL per check and exits 1 on any failure.

   Latency in the tracking table is one-way device to device (each device-to-server link carries half). */
import { mkdtempSync, rmSync, symlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { takeSlot } from './slot.mjs';
import { Race } from '../src/race/race.js';
import { AIDriver } from '../src/race/ai.js';
import { getTrack } from '../src/content/tracks.js';
import { RACERS, RACER_BY_ID } from '../src/content/racers.js';
import { makeRng, mod } from '../src/core/util.js';
import { Conn } from '../src/net/conn.js';
import { NetRace, STEP_MS } from '../src/net/netrace.js';
import { encodeSnap, decodeSnap, readHeader, SNAP_BYTES, TIMERS } from '../src/net/codec.js';

await takeSlot('net-check');

const args = process.argv.slice(2), opt = {};
for (let i = 0; i < args.length; i++) { const a = args[i]; if (a.startsWith('--')) { const k = a.slice(2); opt[k] = args[i + 1] && !args[i + 1].startsWith('--') ? args[++i] : true; } }
const only = opt.only ? new Set(String(opt.only).split(',')) : null;
const STEP = 1 / 60, DELAY = 6, COUNTDOWN_STEPS = 216;
let failures = 0;
const result = (ok, name, detail = '') => { if (!ok) failures++; console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + detail : ''}`); return ok; };
const dist = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
const pct = (arr, p) => { if (!arr.length) return NaN; const s = Float64Array.from(arr).sort(); return s[Math.min(s.length - 1, Math.floor(p * s.length))]; };
const mean = arr => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : NaN;

/* ---------- simulated time ---------- */
class Sched {
  constructor() { this.t = 0; this.q = []; }
  at(t, fn) { const q = this.q; let i = q.length; while (i > 0 && q[i - 1].t > t) i--; q.splice(i, 0, { t, fn }); }
  after(ms, fn) { let live = true; this.at(this.t + ms, () => { if (live) fn(); }); return () => { live = false; }; }
  until(t) { while (this.q.length && this.q[0].t <= t) { const e = this.q.shift(); this.t = Math.max(this.t, e.t); e.fn(); } this.t = t; }
}

/* A one-way link: ordered like TCP. Each frame may stall (lost and retransmitted), holding up everything behind it. */
class Link {
  constructor(sched, rng, { latency = 40, jitter = 0.15, stall = 0, rto = 200 } = {}) { Object.assign(this, { sched, rng, latency, jitter, stall, rto }); this.last = 0; this.cut = false; }
  send(data, deliver) {
    if (this.cut) return;
    // frames written in the same moment travel in one packet and share its fate
    if (this.sched.t !== this.sentAt) {
      this.sentAt = this.sched.t;
      let at = this.sched.t + this.latency * (1 + this.jitter * this.rng());
      if (this.rng() < this.stall) at += this.rto;
      this.packetAt = Math.max(at, this.last); this.last = this.packetAt;
    }
    this.sched.at(this.packetAt, () => deliver(data));
  }
}

/* ---------- the relay: the race phase of the server ---------- */
class Relay {
  constructor(world, room) {
    this.world = world; this.room = room; this.members = new Map(); this.rejected = 0; this.latest = new Map();
    this.firstHumanFinish = null; this.silenceMs = 2000;
  }
  attach(id, down) { this.members.set(id, { id, down, lastFrame: this.world.sched.t, silenced: false, taken: [] }); }
  get now() { return this.world.sched.t; }
  sendTo(m, obj) { m.down.send(typeof obj === 'string' || obj instanceof ArrayBuffer ? obj : JSON.stringify(obj)); }
  broadcastRoom() { const s = JSON.stringify({ t: 'room', room: this.room }); for (const m of this.members.values()) this.sendTo(m, s); }
  others(id, data) { for (const m of this.members.values()) if (m.id !== id) this.sendTo(m, data); }
  receive(id, data) {
    const m = this.members.get(id); if (!m) return;
    m.lastFrame = this.now;
    if (m.silenced) this._giveBack(m);
    if (typeof data !== 'string') {
      const h = readHeader(data), slot = this.room.race?.slots[h.slot];
      if (!slot || slot.owner !== id || this.room.phase !== 'race') { this.rejected++; return; }
      this.latest.set(h.slot, h);
      this.others(id, data);
      return;
    }
    const msg = JSON.parse(data);
    switch (msg.t) {
      case 'hello': this.sendTo(m, { t: 'welcome', you: id, now: this.now }); this.sendTo(m, { t: 'room', room: this.room }); break;
      case 'ping': this.sendTo(m, { t: 'pong', c: msg.c, now: this.now }); break;
      case 'ev': this.others(id, JSON.stringify({ t: 'ev', e: msg.e, from: id })); break;
      case 'finish': {
        const r = this.room.race, slot = r?.slots[msg.slot];
        if (!slot || slot.owner !== id || r.finished.some(f => f.slot === msg.slot)) break;
        r.finished.push({ slot: msg.slot, time: msg.time, rank: 0 });
        r.finished.sort((a, b) => a.time - b.time).forEach((f, i) => { f.rank = i + 1; });
        if (slot.member != null && this.firstHumanFinish == null) this.firstHumanFinish = this.now;
        this.broadcastRoom();
        break; }
    }
  }
  tick() {
    const r = this.room.race; if (!r || this.room.phase !== 'race') return;
    for (const m of this.members.values()) {
      if (m.silenced || !r.slots.some(s => s.owner === m.id)) continue;
      if (this.now - Math.max(m.lastFrame, r.startAt) > this.silenceMs) this._silence(m);
    }
    const all = r.finished.length === r.slots.length;
    if (all || (this.firstHumanFinish != null && this.now - this.firstHumanFinish > 30000) || this.now - r.startAt > 480000) this._end();
  }
  _cpuOwner(not) { for (const m of this.members.values()) if (m.id !== not && !m.silenced) return m.id; return null; }
  _silence(m) {
    const to = this._cpuOwner(m.id); if (!to) return;
    m.silenced = true;
    for (const s of this.room.race.slots) if (s.owner === m.id) { s.owner = to; m.taken.push(s.slot); }
    this.world.note(`relay: ${m.id} silent, its karts go to ${to}`);
    this.broadcastRoom();
  }
  _giveBack(m) {
    m.silenced = false;
    for (const s of this.room.race.slots) if (s.member === m.id || (s.member == null && this.room.host === m.id && m.taken.includes(s.slot))) s.owner = m.id;
    m.taken = [];
    this.world.note(`relay: ${m.id} is back`);
    this.broadcastRoom();
  }
  _end() {
    const r = this.room.race, L = this.world.track.length;
    const done = new Set(r.finished.map(f => f.slot));
    const rest = r.slots.filter(s => !done.has(s.slot)).sort((a, b) => (this.latest.get(b.slot)?.rd ?? -1e9) - (this.latest.get(a.slot)?.rd ?? -1e9));
    const results = [...r.finished.map(f => ({ slot: f.slot, time: f.time, estimated: false })), ...rest.map(s => ({ slot: s.slot, time: null, estimated: true }))]
      .map((x, i) => { const s = r.slots[x.slot]; return { ...x, racer: s.racer, member: s.member, rank: i + 1, points: [15, 12, 10, 8, 6, 4, 2, 1][i] || 0, before: null, after: null }; });
    void L;
    this.room.phase = 'results'; this.room.last = { trackId: r.trackId, results };
    this.broadcastRoom();
  }
}

/* ---------- a device: Conn + Race + NetRace, driven on simulated time ---------- */
class Device {
  constructor(world, id, idx) {
    this.world = world; this.id = id; this.idx = idx; this.frozen = false; this.held = [];
    this.offset = 1000 * (idx + 1) * 7.3 + 123.4;    // its own clock, unrelated to the server's
    const w = world, rng = makeRng(31 + idx * 17);
    this.up = new Link(w.sched, rng, w.link); this.down = new Link(w.sched, rng, w.link);
    const dev = this;
    this.transport = {
      open: true, onopen: null, onmessage: null, onclose: null,
      send(d) { if (!dev.frozen) dev.up.send(d, x => w.relay.receive(id, x)); },
      close() {},
    };
    w.relay.attach(id, { send: d => this.down.send(d, x => this._deliver(() => this.transport.onmessage?.(x))) });
    this.conn = new Conn({ transport: () => this.transport, clock: () => w.sched.t + this.offset, schedule: (fn, ms) => w.sched.after(ms, () => this._deliver(fn)), reconnect: false });
    const room = JSON.parse(JSON.stringify(w.relay.room));
    this.race = new Race(NetRace.raceOptions(room, id, RACER_BY_ID, getTrack));
    this.net = new NetRace({ race: this.race, conn: this.conn, room, me: id, delay: w.delay });
    this.pilots = new Map(this.race.karts.filter(k => k.isPlayer).map(k => [k.slot, new AIDriver(k, 'hard', makeRng(99 + k.slot))]));
    this.script = null;            // (kart, n) => input | undefined: overrides the autopilot
    this.rec = this.race.karts.map(() => ({ x: [], z: [], y: [], own: [], rescue: [], hitT: [], ff: [], shrink: [], play: [] }));
    this.hits = this.race.karts.map(() => []); this.seen = this.race.karts.map(() => []); this.explosions = []; this.dodged = []; this.ff = 0; this.nan = 0;
    this.events = [];
  }
  _deliver(fn) { if (this.frozen) this.held.push(fn); else fn(); }
  freeze() { this.frozen = true; }
  resume() { this.frozen = false; const h = this.held; this.held = []; for (const fn of h) fn(); }
  tick() {
    if (this.frozen) return;
    const net = this.net, race = this.race, target = net.targetStep();
    const ff = target - net.n > 120;
    if (ff) { this.ff++; net.wake(); }
    while (net.n < target) {
      const inputs = [];
      for (const k of race.players) {
        const s = this.script?.(k, net.n);
        inputs[k.playerIndex] = s || (k.puppet ? undefined : this.pilots.get(k.slot).think(STEP));
      }
      const n = net.n;
      race.step(STEP, inputs);
      this._record(n, ff);
    }
  }
  _record(n, ff) {
    const race = this.race;
    for (const k of race.karts) {
      const r = this.rec[k.slot];
      r.shrink[n] = k.shrinkT > 0 ? 1 : 0; r.x[n] = k.x; r.z[n] = k.z; r.y[n] = k.y; r.own[n] = k.puppet ? 0 : 1; r.rescue[n] = k.rescueT > 0 ? 1 : 0; r.hitT[n] = k.hitT; r.ff[n] = ff ? 1 : 0; r.play[n] = k.puppet ? this.net.pp[k.slot].t : null;
      if (!Number.isFinite(k.x + k.y + k.z + k.yaw + k.vx + k.vz)) this.nan++;
      for (const e of k.events) {
        if (e.type === 'hit') (k.puppet ? this.seen : this.hits)[k.slot].push({ n, kind: e.data.kind });
        if (e.type === 'dodged') this.dodged.push({ n, slot: k.slot, what: e.data });
      }
      k.events.length = 0;
    }
    for (const e of race.events) { if (e.type === 'explosion') this.explosions.push({ n, x: e.data.x, z: e.data.z }); this.events.push({ n, type: e.type, data: e.data }); }
    race.events.length = 0;
    if (this.events.length > 4000) this.events.splice(0, 2000);
  }
}

class World {
  constructor({ trackId = 'silicon-valley', slots, latency = 80, stall = 0, rto = 200, jitter = 0.15, seed = 4242, laps, delay = DELAY, verbose = !!opt.verbose }) {
    this.sched = new Sched(); this.track = getTrack(trackId); this.verbose = verbose; this.delay = delay;
    this.link = { latency: latency / 2, stall, rto, jitter };
    const startAt = 3000;
    const members = [...new Set(slots.map(s => s.owner))];
    this.room = {
      code: 'TEST', public: false, host: members[0], phase: 'race', until: null,
      rules: { mode: 'single', cup: null, cc: 150, level: 'normal', cpus: true, pick: 'host' },
      members: members.map(id => ({ id, handle: { title: 0, number: 1 }, racer: null, ready: true, connected: true, spectating: false, valuation: null, track: null })),
      race: { n: 1, trackId, seed, laps: laps ?? this.track.laps, startAt, slots, finished: [] }, offer: null, cupState: null, last: null,
    };
    this.relay = new Relay(this, this.room);
    this.devices = members.map((id, i) => new Device(this, id, i));
    this.dev = Object.fromEntries(this.devices.map(d => [d.id, d]));
  }
  note(s) { if (this.verbose) console.log(`  [${(this.sched.t / 1000).toFixed(2)} s] ${s}`); }
  /** Advance simulated time by ms, in 4 ms ticks; each device steps whenever its clock says so. */
  run(ms, stop = null) {
    const end = this.sched.t + ms;
    while (this.sched.t < end) {
      this.sched.until(this.sched.t + 4);
      this.relay.tick();
      for (const d of this.devices) d.tick();
      if (stop?.()) return true;
    }
    return false;
  }
  /** Run until every device has taken step n. */
  runTo(n) { return this.run(1e9, () => this.devices.every(d => d.frozen || d.net.n >= n)); }
}

/** A field: humans first in `humans` (owner ids), CPUs owned by the first id; humans at the back of the grid. */
function field({ humans = ['A', 'B'], cpus = 6, seed = 4242 } = {}) {
  const rng = makeRng(seed), racers = rng.shuffle(RACERS.slice());
  const slots = [];
  for (let i = 0; i < cpus; i++) slots.push({ slot: slots.length, racer: racers[slots.length].id, member: null, level: 'normal', owner: humans[0] });
  for (const h of humans) slots.push({ slot: slots.length, racer: racers[slots.length].id, member: h, level: null, owner: h });
  return slots;
}

/* =================================================================================== */

/* ---------- codec ---------- */
function checkCodec() {
  const race = new Race({ track: getTrack('silicon-valley'), cc: 150, seed: 1, entries: RACERS.slice(0, 2).map(racer => ({ racer, player: -1 })) });
  const k = race.karts[1];
  Object.assign(k, { x: 123.456, y: -7.25, z: 9876.5, yaw: 2.9, pitch: -0.3, roll: 0.21, vx: 31.27, vy: -4.5, vz: -12.03, steer: -0.6, grounded: false, drifting: true, driftDir: -1, hopping: true, trick: true, trickDir: 1,
    driftPaused: true, drafting: true, goldenActive: true, driftTier: 2, boostKind: 'mini', boostT: 1.3, boostMul: 1.22, hitKind: 'tumble', hitT: 0.71, hitDur: 1.65, item: 'subpoena3', itemUses: 2, rouletteT: 0.4,
    coins: 7, lap: 3, cpNext: 2, circuit: 2, starT: 7.5, shrinkT: 0.01, ghostT: 4.2, bulletT: 6.2, invulnT: 1.6, squashT: 2.4, rescueT: 2.1, goldenT: 5.5, inkT: 4.8 });
  const buf = encodeSnap(k, 123456), d = decodeSnap(buf), h = readHeader(buf);
  const errs = [];
  const near = (name, a, b, tol) => { if (!(Math.abs(a - b) <= tol)) errs.push(`${name} ${a} vs ${b}`); };
  if (buf.byteLength !== SNAP_BYTES) errs.push(`size ${buf.byteLength}`);
  if (h.type !== 1 || h.slot !== 1 || h.step !== 123456) errs.push('header');
  near('rd', h.rd, k.raceDistance, 0.01);
  for (const f of ['x', 'y', 'z']) near(f, d[f], k[f], 0.002);
  for (const f of ['yaw', 'pitch', 'roll']) near(f, d[f], k[f], 1e-4);
  for (const f of ['vx', 'vy', 'vz']) near(f, d[f], k[f], 0.006);
  near('steer', d.steer, k.steer, 0.005); near('boostMul', d.boostMul, k.boostMul, 0.003);
  for (const f of ['boostT', 'hitT', 'hitDur', 'rouletteT', ...TIMERS]) { if (!(d[f] >= k[f] - 1e-9 && d[f] - k[f] < 0.05 + 1e-9)) errs.push(`${f} ${d[f]} vs ${k[f]}`); }
  for (const f of ['grounded', 'drifting', 'driftDir', 'hopping', 'trick', 'trickDir', 'driftPaused', 'drafting', 'goldenActive', 'driftTier', 'boostKind', 'hitKind', 'item', 'itemUses', 'coins', 'lap', 'cpNext', 'circuit']) if (d[f] !== k[f]) errs.push(`${f} ${d[f]} vs ${k[f]}`);
  // yaw wraps; a fresh kart round-trips too
  const k0 = race.karts[0], d0 = decodeSnap(encodeSnap(k0, 0));
  if (d0.item !== null || d0.hitKind !== '' || d0.boostKind !== '' || d0.driftDir !== 0) errs.push('fresh kart');
  result(!errs.length, 'codec: snapshot round trip', `${SNAP_BYTES} bytes${errs.length ? '; ' + errs.join(', ') : ''}`);
}

/* ---------- tracking and smoothness ---------- */
function trackingRun(latency, stall, seconds) {
  const w = new World({ latency, stall, slots: field() });
  w.runTo(COUNTDOWN_STEPS + Math.round(seconds * 60));
  const [A, B] = w.devices, errs = [], jumps = [], delays = [];
  let maxJump = 0;
  const from = COUNTDOWN_STEPS + 60;
  // the error is against the owner's own kart at the moment the puppet is showing (its delay is adaptive, and fractional)
  const at = (arr, t) => { const i = Math.floor(t), f = t - i; return f ? arr[i] + (arr[i + 1] - arr[i]) * f : arr[i]; };
  for (const [O, R] of [[A, B], [B, A]]) for (const k of O.race.karts) {
    if (!O.rec[k.slot].own[from]) continue;
    const o = O.rec[k.slot], r = R.rec[k.slot], end = Math.min(o.x.length, r.x.length);
    for (let n = from; n < end; n++) {
      const t = r.play[n]; if (t == null) continue;
      let skip = false;
      for (let j = Math.floor(t) - 30; j <= n + 2 && !skip; j++) if (o.rescue[j] || r.rescue[j] || !o.own[j] || r.own[j]) skip = true;
      if (skip) continue;
      errs.push(Math.hypot(r.x[n] - at(o.x, t), r.z[n] - at(o.z, t)));
      delays.push(n - t);
      const jmp = Math.hypot(r.x[n] - r.x[n - 1], r.z[n] - r.z[n - 1]);
      jumps.push(jmp); if (jmp > maxJump) maxJump = jmp;
    }
  }
  return { latency, stall, mean: mean(errs), p95: pct(errs, 0.95), max: Math.max(...errs), samples: errs.length, maxJump, over: jumps.filter(j => j > 1.5).length, nan: A.nan + B.nan, clock: Math.max(...w.devices.map(d => Math.abs(d.conn.now() - w.sched.t))),
    delay: mean(delays), delay95: pct(delays, 0.95) };
}

function checkTracking() {
  const secs = opt.quick ? 30 : 75;
  const rows = [];
  for (const latency of [30, 80, 160, 200]) for (const stall of [0, 0.01, 0.03]) rows.push(trackingRun(latency, stall, secs));
  console.log(`\n  Puppet error vs. the owner's own kart at the moment the puppet shows (2 devices, 8 karts, ${secs} s of racing each)`);
  console.log(`  delay: how far in the past puppets are shown, mean and 95th percentile, in ms (the fixed delay was ${(DELAY * STEP_MS).toFixed(0)} ms)`);
  console.log('  ' + 'one-way'.padEnd(9) + 'stall'.padStart(6) + 'mean m'.padStart(9) + 'p95 m'.padStart(9) + 'max m'.padStart(9) + 'max step m'.padStart(12) + 'delay ms'.padStart(10) + 'p95 ms'.padStart(8) + 'samples'.padStart(9) + 'clock ms'.padStart(10));
  for (const r of rows) console.log('  ' + `${r.latency} ms`.padEnd(9) + `${(r.stall * 100).toFixed(0)}%`.padStart(6) + r.mean.toFixed(3).padStart(9) + r.p95.toFixed(3).padStart(9) + r.max.toFixed(2).padStart(9) + r.maxJump.toFixed(2).padStart(12) + (r.delay * STEP_MS).toFixed(0).padStart(10) + (r.delay95 * STEP_MS).toFixed(0).padStart(8) + String(r.samples).padStart(9) + r.clock.toFixed(1).padStart(10));
  console.log('');
  const row = (l, s) => rows.find(r => r.latency === l && r.stall === s);
  const gates = [[30, 0.01, 0.2], [80, 0.01, 0.6], [160, 0.01, 1.2], [200, 0.01, 1.5], [200, 0.03, 2.5]];
  for (const [l, s, lim] of gates) { const r = row(l, s); result(r.p95 <= lim, `tracking: ${l} ms, ${s * 100}% stall, 95th percentile within ${lim} m`, `p95 ${r.p95.toFixed(3)} m, mean ${r.mean.toFixed(3)} m, delay ${(r.delay * STEP_MS).toFixed(0)} ms`); }
  for (const [l, s] of [[30, 0.01], [80, 0.01]]) { const r = row(l, s); result(r.maxJump <= 1.5, `smoothness: no puppet step over 1.5 m at ${l} ms, ${s * 100}% stall`, `largest ${r.maxJump.toFixed(2)} m`); }
  result(rows.every(r => r.clock < 5), 'clock: every device within 5 ms of the server clock', `worst ${Math.max(...rows.map(r => r.clock)).toFixed(1)} ms`);
  result(rows.every(r => !r.nan), 'tracking: no NaN');
}

/* ---------- scripted item scenarios ---------- */
const CALM = { steer: 0, throttle: 0, brake: 0, drift: false, item: false };
/** A straight stretch for scripted scenes: the start of the longest low-curvature run of road. */
function straight(track, len = 160) {
  let best = 0, bestS = 0;
  for (let i = 0; i < track.N; i += 4) {
    let m = 0; for (let j = 0; j * track.ds < len; j++) m = Math.max(m, Math.abs(track.curv[mod(i + j, track.N)]));
    const score = -m; if (i === 0 || score > best) { best = score; bestS = i * track.ds; }
  }
  return bestS;
}

function scene(name, build) {
  const w = new World({ latency: 80, stall: 0.01, slots: [
    { slot: 0, racer: 'musk', member: 'A', level: null, owner: 'A' },
    { slot: 1, racer: 'bezos', member: 'B', level: null, owner: 'B' },
  ].map(s => ({ ...s, racer: RACER_BY_ID[s.racer] ? s.racer : RACERS[s.slot].id })) });
  const [A, B] = w.devices, tr = w.track, s0 = straight(tr);
  const P = { x: 0, y: 0, z: 0 };
  const scripts = { A: new Map(), B: new Map() };
  for (const d of w.devices) d.script = (k, n) => { const f = scripts[d.id].get(k.slot); return f ? f(n, k) : CALM; };
  w.runTo(COUNTDOWN_STEPS + 60);
  const place = (dev, slot, ahead, lat = 0) => { const k = dev.race.karts[slot]; tr.pointAt(s0 + ahead, lat, P); k.place(P.x, P.y, P.z, tr.yawAt(s0 + ahead), -1); k.lap = 1; k.cpNext = 1; return k; };
  const ctx = { w, A, B, tr, s0, place, scripts, press: (n0) => n => (n === n0 ? { ...CALM, item: true } : CALM) };
  const plan = build(ctx);
  w.run(300);                                   // let the placements reach the other screen
  const t0 = A.net.n;
  for (const d of w.devices) { d.hits.forEach(a => { a.length = 0; }); d.seen.forEach(a => { a.length = 0; }); d.explosions.length = 0; d.dodged.length = 0; d.events.length = 0; d.net.stats.rx = {}; d.net.stats.tx = {}; }
  plan.go?.(t0);
  w.run((plan.seconds || 4) * 1000);
  if (opt.verbose) console.log(`  ${name}: A tx ${JSON.stringify(A.net.stats.tx)} rx ${JSON.stringify(A.net.stats.rx)}; B tx ${JSON.stringify(B.net.stats.tx)} rx ${JSON.stringify(B.net.stats.rx)}; ready ${A.conn.ready} ${B.conn.ready}; n ${A.net.n} ${B.net.n}; snaps ${A.net.stats.snapsIn} ${B.net.stats.snapsIn}`);
  const out = plan.check({ ...ctx, t0 });
  for (const [ok, detail] of out) result(ok, `items: ${name}`, detail);
}

/** The victim is hurt once on its owner's device, the other device shows it within 0.5 s, and hears the hit. */
function hurtOnce(owner, other, slot, kind = null) {
  const h = owner.hits[slot], first = h[0];
  const hurt = h.length === 1 && (!kind || first.kind === kind);
  let shown = null;
  if (first) { const r = other.rec[slot]; for (let n = first.n; n < r.hitT.length; n++) if (r.hitT[n] > 0 && !r.own[n]) { shown = n - first.n; break; } }
  const heard = (other.net.stats.rx.hit || 0) >= 1;
  return [hurt && shown != null && shown <= 30 && heard, `hurt ${h.length}× on its owner${first ? ` (${first.kind})` : ''}, other screen ${shown == null ? 'never' : `+${shown} steps`}, hit event ${heard ? 'received' : 'missing'}`];
}
function noneLeft(devs) {
  const left = devs.map(d => d.race.items.shots.filter(s => s.nid).length + d.race.items.hazards.filter(h => h.nid).length);
  return [left.every(n => n === 0), `shots and hazards left: ${left.join(' / ')}`];
}

function checkItems() {
  scene('subpoena fired at a kart straight ahead', ({ A, B, place, scripts }) => {
    place(A, 0, 0); place(B, 1, 16);
    return { go: n0 => { A.race.items.give(A.race.karts[0], 'subpoena'); scripts.A.set(0, n => n === n0 + 2 ? { ...CALM, item: true } : CALM); },
      check: () => [hurtOnce(B, A, 1), noneLeft([A, B])] };
  });
  scene('data leak dropped and driven over by the other kart', ({ A, B, place, scripts }) => {
    place(A, 0, 30); place(B, 1, 0);
    return { seconds: 5, go: n0 => {
      A.race.items.give(A.race.karts[0], 'leak');
      scripts.A.set(0, n => ({ ...CALM, throttle: n < n0 + 40 ? 0 : 0.6, item: n === n0 + 2 }));
      scripts.B.set(1, n => ({ ...CALM, throttle: n > n0 + 20 ? 1 : 0 }));
    }, check: () => [hurtOnce(B, A, 1), noneLeft([A, B])] };
  });
  scene('pink slip thrown, exploding by the other kart', ({ A, B, place, scripts }) => {
    place(A, 0, 0); place(B, 1, 13);
    return { go: n0 => { A.race.items.give(A.race.karts[0], 'pinkslip'); scripts.A.set(0, n => n === n0 + 2 ? { ...CALM, item: true } : CALM); },
      check: () => [hurtOnce(B, A, 1), noneLeft([A, B]), [A.explosions.length === 1 && B.explosions.length === 1, `explosions seen: ${A.explosions.length} / ${B.explosions.length}`]] };
  });
  scene('viral tweet homing', ({ A, B, place, scripts }) => {
    place(A, 0, 0, 2.5); place(B, 1, 45, -2.5);
    return { seconds: 5, go: n0 => { A.race.items.give(A.race.karts[0], 'tweet'); scripts.A.set(0, n => n === n0 + 2 ? { ...CALM, item: true } : CALM); },
      check: () => [hurtOnce(B, A, 1), noneLeft([A, B])] };
  });
  for (const dodge of [false, true]) scene(dodge ? 'antitrust suit dodged with a funding boost in the window' : 'antitrust suit on the leader', ({ A, B, place, scripts }) => {
    place(A, 0, 0); place(B, 1, 70);
    return { seconds: 5, go: n0 => {
      A.race.items.give(A.race.karts[0], 'antitrust'); scripts.A.set(0, n => n === n0 + 2 ? { ...CALM, item: true } : CALM);
      if (dodge) {
        const kb = B.race.karts[1]; B.race.items.give(kb, 'boost');
        scripts.B.set(1, () => ({ ...CALM, item: B.race.items.shots.some(s => s.type === 'antitrust' && s.hoverTarget === kb && s.fundingWindow) }));
      }
    }, check: () => {
      const agree = [(A.net.stats.tx.commit || 0) === 1 && (B.net.stats.rx.commit || 0) === 1, `commit sent ${A.net.stats.tx.commit || 0}, received ${B.net.stats.rx.commit || 0} (target slot 1)`];
      if (!dodge) return [hurtOnce(B, A, 1), agree, noneLeft([A, B])];
      const used = B.dodged.some(d => d.slot === 1 && d.what === 'antitrust');
      const dodged = used && B.hits[1].length === 0 && A.seen[1].length === 0;
      return [[dodged, `dodge ${used ? 'made' : 'not made'} on the victim's device; victim hurt ${B.hits[1].length}× there, ${A.seen[1].length}× seen on the shooter's screen`], agree, noneLeft([A, B])];
    } };
  });
  scene('market crash', ({ A, B, place, scripts }) => {
    place(A, 0, 0); place(B, 1, 30);
    return { go: n0 => { A.race.items.give(A.race.karts[0], 'crash'); scripts.A.set(0, n => n === n0 + 2 ? { ...CALM, item: true } : CALM); },
      check: ({ t0 }) => {
        const own = B.rec[1].shrink.indexOf(1, t0), seen = A.rec[1].shrink.indexOf(1, t0);
        return [hurtOnce(B, A, 1, 'zap'), [own >= 0 && seen >= 0 && seen - own <= 30, `shrunk on its owner at +${own - t0}, on the other screen ${seen < 0 ? 'never' : (seen - own) + ' steps later'}`]];
      } };
  });
  scene('PR blitz', ({ A, B, place, scripts }) => {
    place(A, 0, 0); place(B, 1, 5);
    return { go: n0 => { A.race.items.give(A.race.karts[0], 'pr'); scripts.A.set(0, n => n === n0 + 2 ? { ...CALM, item: true } : CALM); },
      check: () => [hurtOnce(B, A, 1, 'spin')] };
  });
  scene('smear campaign', ({ A, B, place, scripts }) => {
    place(A, 0, 0); place(B, 1, 30);
    let inkedOwner = null, inkedOther = null, t0b = 0;
    return { go: n0 => { t0b = n0; A.race.items.give(A.race.karts[0], 'smear'); scripts.A.set(0, n => { if (inkedOwner == null && B.race.karts[1].inkT > 0) inkedOwner = n; if (inkedOther == null && A.race.karts[1].inkT > 0) inkedOther = n; return n === n0 + 2 ? { ...CALM, item: true } : CALM; }); },
      check: () => [[inkedOwner != null && inkedOther != null && inkedOther - inkedOwner <= 30, `inked on its owner ${inkedOwner == null ? 'never' : 'at +' + (inkedOwner - t0b)}, on the other screen ${inkedOther == null ? 'never' : (inkedOther - inkedOwner) + ' steps later'}`]] };
  });
  scene('insider trading steal', ({ A, B, place, scripts }) => {
    place(A, 0, 0); place(B, 1, 30);
    return { go: n0 => { B.race.items.give(B.race.karts[1], 'leak'); A.race.items.give(A.race.karts[0], 'insider'); scripts.A.set(0, n => n === n0 + 20 ? { ...CALM, item: true } : CALM); },
      check: () => {
        const ok = B.race.karts[1].item === null && A.race.karts[0].item === 'leak' && A.race.karts[1].item === null && B.race.karts[0].item === 'leak';
        return [[ok, `victim's item on its owner: ${B.race.karts[1].item}, thief's item: ${A.race.karts[0].item} (seen by the victim's device: ${B.race.karts[0].item})`]];
      } };
  });
  scene('star contact', ({ A, B, place, scripts }) => {
    place(A, 0, 0); place(B, 1, 14);
    return { go: n0 => { A.race.items.give(A.race.karts[0], 'star'); scripts.A.set(0, n => ({ ...CALM, item: n === n0 + 2, throttle: n > n0 + 4 ? 1 : 0 })); },
      check: () => [hurtOnce(B, A, 1, 'spin')] };
  });
  scene('item box broken and coin taken', ({ A, B, scripts }) => {
    const items = A.race.items, box = items.boxes[0], coin = items.coins[0];
    return { seconds: 1.5, go: n0 => {
      const k = A.race.karts[0];
      scripts.A.set(0, n => { if (n === n0 + 2) k.place(box.x, box.y - 1.15, box.z, 0, -1); if (n === n0 + 40 && coin) k.place(coin.x, coin.y - 0.9, coin.z, 0, -1); return CALM; });
    }, check: () => {
      const bi = 0, ci = 0;
      const boxOk = !B.race.items.boxes[bi].active || B.events.some(e => e.type === 'boxBreak' && e.data.box === B.race.items.boxes[bi]);
      const coinOk = !coin || B.events.some(e => e.type === 'coinTaken' && e.data.coin === B.race.items.coins[ci]);
      return [[boxOk && (A.net.stats.tx.box || 0) === 1, `box broken by A: ${(A.net.stats.tx.box || 0) === 1}, seen on B: ${boxOk}`], [coinOk, `coin taken by A seen on B: ${coinOk}`]];
    } };
  });
}

/* ---------- ownership ---------- */
function checkOwnership() {
  const w = new World({ latency: 80, stall: 0.01, slots: field() });
  const [A, B] = w.devices, slot = 7;
  w.runTo(COUNTDOWN_STEPS + 40 * 60);
  const frozeAt = B.net.n;
  B.freeze();
  let adoptedAt = null;
  w.run(4000, () => { if (adoptedAt == null && !A.race.karts[slot].puppet) adoptedAt = A.net.n; return false; });
  const rdAdopt = A.race.karts[slot].raceDistance;
  const lapAt = A.race.karts[slot].lap;
  B.resume();
  let backAt = null;
  w.run(6000, () => { if (backAt == null && !B.race.karts[slot].puppet && A.race.karts[slot].puppet) backAt = A.net.n; return false; });
  const rdBack = B.race.karts[slot].raceDistance;
  let jumpA = 0, jumpB = 0;
  if (backAt != null) for (let n = backAt - 30; n < backAt + 180; n++) {
    const a = A.rec[slot], b = B.rec[slot];
    if (!a.rescue[n] && a.x[n - 1] != null) jumpA = Math.max(jumpA, Math.hypot(a.x[n] - a.x[n - 1], a.z[n] - a.z[n - 1]));
    if (!b.rescue[n] && !b.ff[n] && !b.ff[n - 1] && b.x[n - 1] != null) { const j = Math.hypot(b.x[n] - b.x[n - 1], b.z[n] - b.z[n - 1]); if (opt.verbose && j > 3) console.log(`  B jump ${j.toFixed(1)} m at ${n - backAt} steps from hand-back, own ${b.own[n - 1]}→${b.own[n]}, B frozen at ${frozeAt}, B n ${B.net.n}`); jumpB = Math.max(jumpB, j); }
  }
  if (opt.verbose && backAt != null) for (let n = backAt - 20; n < backAt - 8; n++) console.log(`   ${n - backAt}: B ${B.rec[slot].x[n]?.toFixed(1)},${B.rec[slot].z[n]?.toFixed(1)} ff ${B.rec[slot].ff[n]} own ${B.rec[slot].own[n]} | A ${A.rec[slot].x[n]?.toFixed(1)},${A.rec[slot].z[n]?.toFixed(1)}`);
  result(adoptedAt != null, 'ownership: a silent device\'s kart is adopted by the CPU owner', adoptedAt == null ? 'never' : `${((adoptedAt - frozeAt) / 60).toFixed(2)} s after it went quiet`);
  result(rdBack - rdAdopt > 60 && A.race.karts[slot].lap >= lapAt, 'ownership: the adopted kart keeps lapping', `${(rdBack - rdAdopt).toFixed(0)} m in the hands of the other device`);
  result(backAt != null && jumpA < 3 && jumpB < 3, 'ownership: the returning device takes its kart back without a jump over 3 m', backAt == null ? 'never handed back' : `largest step ${jumpA.toFixed(2)} m on A, ${jumpB.toFixed(2)} m on B`);
  result(B.ff > 0, 'ownership: the returning device fast-forwards', `${B.ff} catch-up frames`);
}

/* ---------- full race ---------- */
function offlineReference(trackId, slots) {
  const room = { rules: { cc: 150, level: 'normal' }, race: { trackId, seed: 4242, laps: getTrack(trackId).laps, slots } };
  const race = new Race(NetRace.raceOptions(room, 'A', RACER_BY_ID, getTrack));
  const pilots = race.players.map(k => new AIDriver(k, 'hard', makeRng(99 + k.slot)));
  for (let n = 0; n < 60 * 400 && race.state !== 'done'; n++) {
    race.step(STEP, pilots.map(p => p.think(STEP)));
    for (const k of race.karts) k.events.length = 0; race.events.length = 0;
  }
  return race;
}

function checkFullRace() {
  for (const trackId of ['silicon-valley', 'mars-colony']) {
    const slots = field();
    const w = new World({ trackId, latency: 80, stall: 0.01, slots });
    w.run(60 * 400 * STEP_MS, () => w.devices.every(d => d.net.ended));
    const [A, B] = w.devices, r = w.room.race;
    const relayOrder = r.finished.map(f => f.slot).join(',');
    const orders = w.devices.map(d => d.race.finishOrder.filter(k => r.finished.some(f => f.slot === k.slot)).map(k => k.slot).join(','));
    const ended = w.devices.every(d => d.net.ended && d.net.phase === 'results');
    result(ended && r.finished.length === slots.length, `full race ${trackId}: finishes on both devices`, `${r.finished.length}/${slots.length} finished, phase ${w.room.phase}`);
    result(orders.every(o => o === relayOrder), `full race ${trackId}: both devices end with the relay's order`, `relay ${relayOrder}; devices ${orders.join(' | ')}`);
    result(A.nan + B.nan === 0, `full race ${trackId}: no NaN`);
    const ref = offlineReference(trackId, JSON.parse(JSON.stringify(slots)));
    const online = A.race.karts.filter(k => !k.human).flatMap(k => k.lapTimes), offline = ref.karts.filter((k, i) => slots[i].member == null).flatMap(k => k.lapTimes);
    const mo = mean(online), mf = mean(offline), diff = Math.abs(mo - mf) / mf;
    result(diff <= 0.05, `full race ${trackId}: CPU lap times within 5% of an offline run`, `online ${mo.toFixed(2)} s, offline ${mf.toFixed(2)} s (${(diff * 100).toFixed(1)}%), ${online.length} laps; snapshots rejected by the relay: ${w.relay.rejected}`);
  }
}

/* ---------- offline unchanged ----------
   The same seeded offline races, run with this checkout's simulation and with the simulation at a git ref
   (default origin/main, or --offline-ref <ref>), must match step for step: the online hooks do nothing
   when race.net is null. Once the hooks are on main this compares main with itself on main, and still
   guards any branch that touches them. */
async function offlineRuns(root) {
  const at = p => new URL(p, root).href;
  const [{ Race }, { AIDriver }, { getTrack }, { RACERS }, { makeRng }] = await Promise.all([import(at('src/race/race.js')), import(at('src/race/ai.js')), import(at('src/content/tracks.js')), import(at('src/content/racers.js')), import(at('src/core/util.js'))]);
  const f64 = new Float64Array(1), u32 = new Uint32Array(f64.buffer);
  const mix = (h, v) => { f64[0] = v; h = Math.imul(h ^ u32[0], 16777619); return Math.imul(h ^ u32[1], 16777619); };
  const out = {};
  for (const trackId of ['silicon-valley', 'mars-colony']) for (const humans of [0, 2]) {
    const track = getTrack(trackId), rng = makeRng(4242);
    const fieldR = rng.shuffle(RACERS.slice()).slice(0, 8);
    const entries = fieldR.map((racer, i) => i >= 8 - humans ? { racer, player: i - (8 - humans), assist: {} } : { racer, player: -1, level: 'normal' });
    const race = new Race({ track, cc: 150, seed: 777, entries });
    const pilots = race.players.map(k => new AIDriver(k, 'hard', makeRng(99)));
    const hashes = []; let steps = 0;
    while (race.state !== 'done' && steps < 60 * 400) {
      race.step(1 / 60, pilots.map(p => p.think(1 / 60))); steps++;
      let h = 2166136261;
      for (const k of race.karts) { h = mix(h, k.x); h = mix(h, k.y); h = mix(h, k.z); h = mix(h, k.yaw); }
      for (const k of race.karts) k.events.length = 0; race.events.length = 0;
      hashes.push(h >>> 0);
    }
    out[`${trackId}, ${humans} players`] = { steps, hashes, results: race.results().map(r => r.racer.id + ':' + r.time.toFixed(3)).join(' ') };
  }
  return out;
}
async function checkOffline() {
  const ref = typeof opt['offline-ref'] === 'string' ? opt['offline-ref'] : 'origin/main';
  const here = new URL('../', import.meta.url), dir = mkdtempSync(join(tmpdir(), 'bk-offline-'));
  try {
    try {
      execSync(`git archive ${ref} src | tar -x -C "${dir}"`, { cwd: fileURLToPath(here), stdio: ['ignore', 'ignore', 'pipe'] });
      symlinkSync(fileURLToPath(new URL('node_modules', here)), join(dir, 'node_modules'));
    } catch (e) { console.log(`SKIP  offline unchanged: could not read the simulation at ${ref} (${String(e.message).split('\n')[0]})`); return; }
    const theirs = await offlineRuns(pathToFileURL(dir + '/')), mine = await offlineRuns(here);
    for (const key of Object.keys(mine)) {
      const a = mine[key], b = theirs[key], diff = a.hashes.findIndex((h, i) => h !== b.hashes[i]);
      const same = diff < 0 && a.steps === b.steps && a.results === b.results;
      result(same, `offline unchanged: ${key}`, same ? `${a.steps} steps, identical to ${ref} at every step` : `first differs from ${ref} at step ${diff < 0 ? Math.min(a.steps, b.steps) : diff}`);
    }
  } finally { rmSync(dir, { recursive: true, force: true }); }
}

/* ---------- the connection itself: a socket that never opens (a proxy holding the upgrade, #371) ---------- */
function checkConn() {
  const sched = new Sched(), schedule = (fn, ms) => sched.after(ms, fn);
  let made = 0, closed = 0;
  const dead = () => { made++; return { open: false, onopen: null, onmessage: null, onclose: null, send() {}, close() { closed++; } }; };
  const conn = new Conn({ transport: dead, clock: () => sched.t, schedule });
  sched.until(9900);
  const early = made;
  sched.until(10700);
  result(early === 1 && made === 2 && closed === 1, 'conn: a socket that never opens is closed after 10 s and another is tried', `${made} sockets, ${closed} closed`);
  conn.close(); sched.until(120000);
  result(made === 2 && closed === 2, 'conn: close() stops the retrying, and no timer fires later', `${made} sockets, ${closed} closed`);
  let t = null, shut = 0;
  const live = () => (t = { open: true, onopen: null, onmessage: null, onclose: null, close() { shut++; },
    send(d) { if (JSON.parse(d).t === 'hello') sched.after(80, () => t.onmessage(JSON.stringify({ t: 'welcome', you: 'A', now: 0 }))); } });
  const ok = new Conn({ transport: live, clock: () => sched.t, schedule });
  sched.until(sched.t + 40000);
  result(ok.ready && shut === 0, 'conn: a welcomed socket is never timed out', `ready ${ok.ready}, closed ${shut} times`);
  ok.close();
}

const run = async (name, fn) => { if (!only || only.has(name)) await fn(); };
await run('conn', checkConn);
await run('codec', checkCodec);
await run('offline', checkOffline);
await run('items', checkItems);
await run('ownership', checkOwnership);
await run('tracking', checkTracking);
await run('race', checkFullRace);
console.log(failures ? `\nnet-check: ${failures} FAILED` : '\nnet-check: ok');
process.exit(failures ? 1 : 0);
