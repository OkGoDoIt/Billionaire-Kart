/* race.net: the online side of one race (docs/online-protocol.md, "Race").
   Every device runs the whole Race. This device steps the karts it owns and
   broadcasts them; every other kart is a puppet placed from buffered snapshots,
   drawn some steps in the past, with a short capped extrapolation when data is
   late. How far in the past adapts per sending device: at least `delay` steps,
   more when that device's snapshots arrive late (a slow or stalling link), eased
   in and out by playing its karts slightly slower or faster, never by a jump.
   Events that happen TO a kart are decided by its owner only.

   The Race calls pre() at the start of each step and post() at the end; the
   items and karts call spawn/gone/boom/commit at the few places they need to.
   Nothing here runs offline (race.net is null there). */
import { encodeSnap, decodeSnap } from './codec.js';
import { AIDriver } from '../race/ai.js';
import { ITEMS } from '../race/items.js';
import { TUNE } from '../race/kart.js';
import { makeRng, wrapAngle, lerp, clamp } from '../core/util.js';
import { makeGroundHit } from '../track/track.js';

export const STEP_MS = 1000 / 60;
const STEP = 1 / 60;
const LIFE = { antitrust: 40, tweet: 14, subpoena: 11, pinkslip: 6 };
const BOX_RESPAWN = 0.85, COIN_RESPAWN = 7;
const SNAP_KEEP = 90;              // snapshots kept per kart (3 s at 30 Hz)
const SMOOTH_TAU = 0.12;           // seconds for a correction to fade
const SMOOTH_MIN = 0.01;           // metres: new data moved the shown pose by more than this, so it is a correction
const SMOOTH_SLACK = 0.3;          // metres per step a puppet may move beyond its own speed before the excess is eased in
const SMOOTH_SNAP = 20;            // metres: further than this is a teleport, not a correction
const SMOOTH_RATE = 0.6;           // metres per step at most that a correction fades by
// adaptive delay, per sending device (all its karts share one link, so they share one delay)
const LAG_WINDOW = 240;            // steps of lateness history kept (4 s)
const LAG_PCT = 0.8;               // the share of recent snapshots the delay should cover
const LAG_MAX = 24;                // steps: the delay never grows past this (400 ms)
const LAG_FALL = 1.5 / 60;         // steps per step the wanted delay falls by once the link is calm (1.5 steps a second)
const SLEW_UP = 0.2;               // steps per step the delay grows by at most (puppets play at 0.8x for a moment)
const SLEW_DOWN = 0.04;            // steps per step the delay shrinks by at most (puppets play at 1.04x)
const EXTRAP_TURN = 3;             // radians a second at most that a guessed path may turn
const TIMER_FIELDS = ['hitT', 'starT', 'shrinkT', 'ghostT', 'bulletT', 'invulnT', 'squashT', 'rescueT', 'goldenT', 'inkT', 'boostT', 'rouletteT'];

export class NetRace {
  /**
   * race: a Race built from room.race (slot order is grid order).
   * conn: a Conn (or anything with on/send/sendBinary/now).
   * room: the room message's room, phase "race". me: this device's player id.
   */
  constructor({ race, conn, room, me, delay = 6, sendEvery = 2, maxExtrap = 12 }) {
    this.race = race; this.conn = conn; this.me = me;
    this.delay = delay; this.sendEvery = sendEvery; this.maxExtrap = maxExtrap;
    this.room = room; this.raceN = room.race.n; this.startAt = room.race.startAt;
    this.slots = room.race.slots.slice().sort((a, b) => a.slot - b.slot);
    this.n = 0;                                   // simulation steps taken; step n happens at startAt + n * STEP_MS
    this.buf = race.karts.map(() => []);           // decoded snapshots per slot, oldest first
    this.fresh = race.karts.map(() => false);      // the next snapshot for this slot starts a new owner's stream
    this.pp = race.karts.map(() => ({ ox: 0, oz: 0, raw: null, last: null, t: null }));   // puppet presentation state; t: the step it was last shown at
    this.lag = new Map();                          // per sending device: lateness history and the delay its puppets use
    this.inbox = [];                               // room and ev messages in arrival order, applied in pre()
    this.exploded = new Set(); this.seq = 0; this.ids = -1;
    this.ended = false; this.phase = room.phase;
    this.stats = { rx: {}, tx: {}, snapsIn: 0, snapsOut: 0 };
    this.log = null;                               // tests: set to [] to record applied events
    this.hit = makeGroundHit();
    race.net = this;
    race.humans = [];
    for (const k of race.karts) {
      const s = this.slots[k.slot];
      k.human = s.member != null;
      if (k.human) race.humans.push(k);
      k.isPlayer = s.member === me;                 // local players only: the view and HUD are for them
      if (!k.isPlayer) k.playerIndex = -1;
      if (k.human && !k.isPlayer) k.ai = null;
      k.puppet = true;
    }
    race.players = race.karts.filter(k => k.isPlayer).sort((a, b) => a.playerIndex - b.playerIndex);
    this.heard = this.slots.map(s => s.owner);    // owners as of the latest room message to arrive (pre() applies it later)
    this.mine = new Set();
    for (const k of race.karts) if (this.slots[k.slot].owner === me) this._adopt(k, true);
    this.off = [
      conn.on('snap', b => this._snap(b)),
      conn.on('ev', m => this.inbox.push(m)),
      conn.on('room', m => this._roomArrived(m.room)),
    ];
  }

  /** Race entries for a room, in slot (grid) order. Every device builds the same field: humans are
      players everywhere (local ones first, so their indexes match local input), CPUs are AI. The race's
      RNG draws at setup then match on every device, so a CPU drives the same whoever owns it. */
  static entries(room, me, racerById) {
    const level = room.rules?.level || 'normal';
    const slots = room.race.slots.slice().sort((a, b) => a.slot - b.slot);
    let local = 0, remote = slots.filter(s => s.member != null && s.member === me).length;
    return slots.map(s => {
      const racer = racerById[s.racer];
      if (s.member == null) return { racer, player: -1, level: s.level || level };
      return { racer, player: s.member === me ? local++ : remote++, assist: {} };
    });
  }
  /** Options for new Race(...) from a room. getTrack: the track registry's getTrack. */
  static raceOptions(room, me, racerById, getTrack) {
    const rr = room.race;
    return { track: getTrack(rr.trackId), cc: room.rules?.cc || 150, laps: rr.laps, seed: rr.seed, entries: NetRace.entries(room, me, racerById) };
  }

  dispose() { for (const f of this.off) f(); this.off = []; if (this.race.net === this) this.race.net = null; }

  /** After a long stall (a hidden tab): let the server know this device is back. */
  wake() { this.conn.ping?.(); }

  owns(k) { return !k.puppet; }
  kart(slot) { return slot >= 0 ? this.race.karts[slot] || null : null; }

  /** Steps that should have been taken by now on the shared clock. */
  targetStep(now = this.conn.now()) {
    if (this.conn.synced === false) return this.n;   // no clock yet: wait for the first pong
    const t = now - this.startAt;
    return t < 0 ? 0 : Math.floor(t / STEP_MS) + 1;
  }
  /** Fractional step for rendering between the last two steps. */
  stepFraction(now = this.conn.now()) { return clamp((now - this.startAt) / STEP_MS - (this.n - 1), 0, 1); }

  /* ---------- the race's hooks ---------- */

  pre(dt) {
    const q = this.inbox; this.inbox = [];
    this.applying = true;
    for (const m of q) {
      try { if (m.t === 'room') this._applyRoom(m.room); else if (m.e) this._apply(m.e, m.from); }
      catch (err) { if (typeof console !== 'undefined') console.warn('net: bad message', m, err); }
    }
    this.applying = false;
    for (const L of this.lag.values()) this._slew(L);
    for (const k of this.race.karts) if (k.puppet) this._puppet(k, dt);
  }

  post() {
    this._scan();
    if (this.n % this.sendEvery === 0 && !this.ended) for (const slot of this.mine) {
      const k = this.race.karts[slot], buf = encodeSnap(k, this.n);
      this.conn.sendBinary(buf); this.stats.snapsOut++;
      this._keep(slot, decodeSnap(buf));            // our own history: if the kart is taken from us, its puppet carries on from here
    }
    this.n++;
  }

  /** A shot or hazard was made by an owned kart: name it and tell everyone. */
  spawn(o) {
    if (this.applying || !o.owner || o.owner.puppet) return;
    o.nid = `${o.owner.slot}:${this.n * 16 + (this.seq++ % 16)}`;
    if ('vx' in o) {
      this._ev({ k: 'shot', nid: o.nid, type: o.type, s: o.owner.slot, x: r3(o.x), y: r3(o.y), z: r3(o.z), vx: r3(o.vx), vy: r3(o.vy || 0), vz: r3(o.vz), yaw: r3(o.yaw), speed: r3(o.speed || 0), target: o.target ? o.target.slot : -1, phase: o.phase });
    } else {
      this._ev({ k: 'hazard', nid: o.nid, type: o.type, x: r3(o.x), y: r3(o.y), z: r3(o.z), s: o.owner.slot });
    }
  }

  /** An owned kart resolved a shot or hazard. */
  gone(o, why) { if (!this.applying && o.nid && !o.netGone) { o.netGone = true; this._ev({ k: 'gone', nid: o.nid, why }); } }

  /** Before an explosion: false when this shot or hazard has already gone off here. */
  boom(src, x, y, z, owner, w) {
    const nid = src?.nid;
    if (nid) { if (this.exploded.has(nid)) return false; this.exploded.add(nid); }
    // The Antitrust Suit is simulated everywhere and strikes on each device's own clock, so a victim keeps its dodge.
    if (!this.applying && w !== 'antitrust' && owner) this._ev({ k: 'boom', nid: nid || null, x: r3(x), y: r3(y), z: r3(z), s: owner.slot, w });
    return true;
  }

  /** The Antitrust Suit has reached the leader: only the shooter's owner decides who that is. */
  commit(s, t) {
    if (s.owner && !s.owner.puppet) { if (s.nid) this._ev({ k: 'commit', nid: s.nid, target: t.slot, phase: 'hover' }); return true; }
    return false;
  }

  /* ---------- outgoing ---------- */

  _ev(e) { this.stats.tx[e.k] = (this.stats.tx[e.k] || 0) + 1; this.conn.send({ t: 'ev', e }); }

  /** Turn this step's race events into game events for the karts we own. */
  _scan() {
    const race = this.race, items = race.items;
    for (const e of race.events) {
      if (e.net) continue; e.net = 1;
      const d = e.data;
      switch (e.type) {
        case 'boxBreak': if (!d.kart.puppet) this._ev({ k: 'box', i: items.boxes.indexOf(d.box), s: d.kart.slot }); break;
        case 'coinTaken': if (!d.kart.puppet) this._ev({ k: 'coin', i: items.coins.indexOf(d.coin), s: d.kart.slot }); break;
        case 'itemUse': if (!d.kart.puppet) this._ev({ k: 'use', s: d.kart.slot, id: d.id }); break;
        case 'lightning': if (!d.by.puppet) this._ev({ k: 'crash', s: d.by.slot }); break;
        case 'shock': if (!d.by.puppet) this._ev({ k: 'shock', s: d.by.slot, x: r3(d.x), y: r3(d.y), z: r3(d.z) }); break;
        case 'ink': if (!d.by.puppet) this._ev({ k: 'ink', s: d.by.slot, rank: d.by.rank }); break;
        case 'steal': if (!d.by.puppet) this._ev({ k: 'steal', s: d.by.slot, from: d.from.slot, id: d.id, uses: d.by._steal?.uses ?? 1 }); break;
        case 'finish': if (!d.puppet) this.conn.send({ t: 'finish', slot: d.slot, time: d.finishTime }); break;
      }
    }
    for (const k of race.karts) {
      if (k.puppet) continue;
      for (const e of k.events) if (!e.net) { e.net = 1; if (e.type === 'hit') this._sendHit(k, e.data); }
    }
  }

  _sendHit(k, data) {
    let w = data.kind === 'zap' ? 'crash' : 'hit', by = data.from ? data.from.slot : -1;
    for (const e of this.race.events) {
      if (e.hitSent) continue;
      if (e.type === 'kartHit' && e.data.victim === k) { e.hitSent = 1; w = e.data.with; by = e.data.by ? e.data.by.slot : -1; break; }
      if (e.type === 'obstacleHit' && e.data.kart === k) { e.hitSent = 1; w = 'obstacle'; by = -1; break; }
    }
    this._ev({ k: 'hit', v: k.slot, by, w, kind: data.kind });
  }

  /* ---------- incoming ---------- */

  _snap(data) {
    const d = decodeSnap(data);
    if (!d || d.slot >= this.buf.length || this.heard[d.slot] === this.me) return;   // ours, as of the latest room to arrive
    this.stats.snapsIn++;
    this._late(this.heard[d.slot], d.step);
    const b = this.buf[d.slot];
    if (this.fresh[d.slot]) {   // a new owner's stream replaces whatever the old one said about the same moments
      this.fresh[d.slot] = false;
      while (b.length && b[b.length - 1].step >= d.step) b.pop();
    }
    this._keep(d.slot, d);
  }

  _keep(slot, d) {
    const b = this.buf[slot];
    if (b.length && d.step <= b[b.length - 1].step) {
      let i = b.length - 1; while (i >= 0 && b[i].step > d.step) i--;
      if (i >= 0 && b[i].step === d.step) b[i] = d; else b.splice(i + 1, 0, d);
    } else b.push(d);
    if (b.length > SNAP_KEEP) b.splice(0, b.length - SNAP_KEEP);
  }

  /** Called on arrival (not in pre): snapshots that follow an ownership change belong to the new owner. */
  _roomArrived(room) {
    if (room?.race && room.race.n === this.raceN) {
      for (const s of room.race.slots) if (s.slot < this.heard.length && this.heard[s.slot] !== s.owner) { this.fresh[s.slot] = true; this.heard[s.slot] = s.owner; }
    }
    this.inbox.push({ t: 'room', room });
  }

  _applyRoom(room) {
    this.room = room; this.phase = room.phase;
    const rr = room.race;
    if (rr && rr.n === this.raceN) {
      const slots = rr.slots.slice().sort((a, b) => a.slot - b.slot);
      for (const s of slots) {
        const k = this.race.karts[s.slot]; if (!k) continue;
        const was = this.mine.has(s.slot), now = s.owner === this.me;
        this.slots[s.slot] = s;
        if (!was && now) this._adopt(k);
        else if (was && !now) this._release(k);
      }
      this._applyFinished(rr.finished || []);
    }
    if (room.phase !== 'race' || !rr || rr.n !== this.raceN) { this.ended = true; this.race.state = 'done'; }
  }

  _applyFinished(list) {
    const race = this.race, listed = [];
    for (const f of [...list].sort((a, b) => a.rank - b.rank)) {
      const k = race.karts[f.slot]; if (!k) continue;
      if (!k.finished) { k.finished = true; k.endDrift(false); k.emit('finish', f.rank); race.emit('finish', k); }
      k.finishRank = f.rank; k.finishTime = f.time; k.rank = f.rank;
      listed.push(k);
    }
    const rest = race.finishOrder.filter(k => !listed.includes(k));
    rest.forEach((k, i) => { k.finishRank = k.rank = listed.length + i + 1; });   // still provisional
    race.finishOrder = [...listed, ...rest];
  }

  _apply(e, from) {
    const race = this.race, items = race.items, kart = this.kart(e.s);
    this.stats.rx[e.k] = (this.stats.rx[e.k] || 0) + 1;
    this.log?.push({ n: this.n, e, from });
    switch (e.k) {
      case 'box': {
        const b = items.boxes[e.i]; if (!b || !kart) break;
        if (b.active) { b.active = false; b.t = BOX_RESPAWN; race.emit('boxBreak', { box: b, kart }); }
        kart.emit('roulette');
        break; }
      case 'coin': { const c = items.coins[e.i]; if (c && c.active && kart) { c.active = false; c.t = COIN_RESPAWN; race.emit('coinTaken', { coin: c, kart }); } break; }
      case 'use': if (kart) { kart.emit('itemUse', e.id); race.emit('itemUse', { kart, id: e.id }); kart.stats.items++; } break;
      case 'hazard': {
        if (!kart || this._find(e.nid)) break;
        const g = race.track.ground(e.x, e.z, kart.hint, this.hit, e.y);
        const h = { id: this.ids--, nid: e.nid, type: e.type, x: e.x, y: e.y, z: e.z, radius: e.type === 'pinkslip' ? 1.3 : 1.15, owner: kart, age: 0, life: e.type === 'pinkslip' ? 2.6 : 75, hint: g.i };
        items.hazards.push(h); race.emit('hazardSpawn', h);
        break; }
      case 'shot': {
        if (!kart || this._find(e.nid)) break;
        const g = race.track.ground(e.x, e.z, kart.hint, this.hit, e.y);
        const s = { id: this.ids--, nid: e.nid, type: e.type, owner: kart, age: 0, life: LIFE[e.type] || 11, x: e.x, y: e.y, z: e.z, vx: e.vx, vz: e.vz, speed: e.speed, yaw: e.yaw, hint: g.i, bounces: 0, target: this.kart(e.target), phase: e.phase || 'fly', t: 0, s: g.s, lat: e.type === 'antitrust' ? 0 : g.lat };
        if (e.type === 'pinkslip') s.vy = e.vy;
        items.shots.push(s); race.emit('shotSpawn', s);
        break; }
      case 'gone': { const o = this._find(e.nid); if (o) { o.dead = true; o.netGone = true; } break; }
      case 'boom': {
        if (e.nid && this.exploded.has(e.nid)) break;
        const o = e.nid ? this._find(e.nid) : null;
        if (o) { o.dead = true; o.netGone = true; }
        items._explode(e.x, e.y, e.z, kart, e.w || 'pinkslip', null, o || (e.nid ? { nid: e.nid } : null));
        break; }
      case 'hit': {
        const v = this.kart(e.v), by = this.kart(e.by);
        if (!v || !v.puppet) break;
        v.emit('hit', { kind: e.kind, from: by }); v.stats.hitsTaken++;
        if (by && !by.puppet && by !== v) by.stats.hitsGiven++;
        if (e.w !== 'obstacle' && e.w !== 'crash' && e.w !== 'hit') race.emit('kartHit', { by, victim: v, with: e.w });
        break; }
      case 'commit': {
        const s = this._find(e.nid), t = this.kart(e.target);
        if (s && t && s.type === 'antitrust' && !s.dead && e.phase === 'hover' && s.phase === 'fly') items._blueHover(s, t);
        break; }
      case 'crash': if (kart) items._crash(kart); break;
      case 'shock': if (kart) items._shock(kart, { x: e.x, y: e.y, z: e.z }); break;
      case 'ink': if (kart) items._smear(kart, e.rank); break;
      case 'steal': {
        const victim = this.kart(e.from); if (!kart || !victim) break;
        if (!victim.puppet && victim.item) { victim.item = null; victim.itemUses = 0; victim.goldenActive = false; victim.emit('robbed', kart); victim.emit('itemGone'); }
        race.emit('steal', { by: kart, from: victim, id: e.id });
        break; }
    }
  }

  _find(nid) {
    if (!nid) return null;
    const items = this.race.items;
    for (const s of items.shots) if (s.nid === nid) return s;
    for (const h of items.hazards) if (h.nid === nid) return h;
    return null;
  }

  /* ---------- ownership ---------- */

  _adopt(k, initial = false) {
    k.puppet = false; this.mine.add(k.slot);
    const s = this.slots[k.slot];
    if (s.member === this.me) k.ai = null;
    else if (s.member != null) k.ai = k.heldAi || (k.heldAi = new AIDriver(k, s.level || this.room.rules?.level || 'normal', makeRng(((this.room.race.seed | 0) ^ (k.slot * 7919)) >>> 0 || 1)));
    if (initial) return;
    // carry on from the puppet exactly where it is on this screen, with its last known velocity
    const tr = this.race.track;
    tr.ground(k.x, k.z, k.hint, k.hit, k.y);
    k.hint = k.hit.i; k.lastSafeI = k.hit.i; k.gy = k.hit.y; k.safeT = 0;
    if (k.grounded) k.y = Math.max(k.y, k.hit.y);
    k.drifting = false; k.driftArmed = false; k.driftCharge = 0; k.driftTier = 0; k.driftDir = 0; k.driftPaused = false; k.hopping = false;
    k.trick = false; k.trickArmT = 0; k.prevDrift = false; k.prevItem = false; k.landingSpeedKeep = 1; k._steal = null;
    k.airT = k.grounded ? 0 : 0.1; k.revving = false; k.draftT = 0; k.drafting = false;
    if (k.ai) { k.ai.bestProg = null; k.ai.progT = 0; k.ai.stuckT = 0; k.ai.reverseT = 0; k.ai.driftPlan = null; k.ai.cut = null; }
    this.pp[k.slot].raw = null;
  }

  _release(k) {
    k.puppet = true; this.mine.delete(k.slot);
    const pp = this.pp[k.slot];
    pp.raw = null; pp.cont = { x: k.x, z: k.z, vx: k.vx, vz: k.vz };   // the puppet picks up where the kart is now
  }

  /* ---------- adaptive delay ---------- */

  /** Fractional steps on the shared clock right now (falls back to steps taken before the clock syncs). */
  _nowStep() { return this.conn.synced === false || !this.conn.now ? this.n : (this.conn.now() - this.startAt) / STEP_MS; }

  /** The lateness record for one sending device. */
  _lagOf(owner) {
    let L = this.lag.get(owner);
    if (!L) {   // a device we start hearing from mid-race (a kart changed hands) starts from the delay already in use, so its puppets do not jump
      const d = Math.max(this.delay, ...[...this.lag.values()].map(o => o.d));
      this.lag.set(owner, L = { at: [], late: [], hi: -Infinity, want: d, d });
    }
    return L;
  }

  /** A snapshot of `step` from `owner` arrived now: note how late it is. One sample per packet is plenty. */
  _late(owner, step) {
    const L = this._lagOf(owner), now = this._nowStep(), late = now - step;
    if (step > L.hi) L.hi = step;
    const i = L.at.length - 1;
    if (i >= 0 && now - L.at[i] < 0.5) { if (late > L.late[i]) L.late[i] = late; return; }   // same packet
    L.at.push(now); L.late.push(late);
    while (L.at.length && now - L.at[0] > LAG_WINDOW) { L.at.shift(); L.late.shift(); }
  }

  /** Once per step: decide the delay this device's karts want, and move toward it gently. */
  _slew(L) {
    const now = this._nowStep(), cover = this.sendEvery;
    while (L.at.length && now - L.at[0] > LAG_WINDOW) { L.at.shift(); L.late.shift(); }
    let target = this.delay;
    if (L.late.length) {
      const s = L.late.slice().sort((a, b) => a - b);
      target = Math.max(target, s[Math.min(s.length - 1, Math.floor(LAG_PCT * s.length))] + cover);
    }
    target = Math.min(target, LAG_MAX);
    L.want = target >= L.want ? target : Math.max(target, L.want - LAG_FALL);
    // a stall in progress (data already later than the delay covers): slow these karts down rather than guess far ahead;
    // when the burst arrives the wanted delay is back in charge and they catch up a little faster than real time
    const overdue = L.hi > -Infinity ? Math.min(LAG_MAX, now - L.hi - this.maxExtrap / 2) : 0;
    const gap = Math.max(L.want, overdue) - L.d;
    L.d += gap > 0 ? Math.min(gap, SLEW_UP) : Math.max(gap, -SLEW_DOWN);
  }

  /** The delay, in steps, that a kart's puppet is shown at. */
  delayOf(k) { const L = this.lag.get(this.heard[k.slot]); return L ? L.d : this.delay; }

  /* ---------- puppets ---------- */

  /** The state of a slot at step t, interpolated, or extrapolated by at most `cap` steps. Reuses one object. */
  _sample(slot, t, cap) {
    const b = this.buf[slot]; if (!b.length) return null;
    const o = this._out || (this._out = {});
    let i = b.length - 1; while (i > 0 && b[i].step > t) i--;
    const a = b[i], next = a.step <= t && i + 1 < b.length ? b[i + 1] : null;
    Object.assign(o, a);
    let f = 0, ext = 0;
    if (next) {
      f = (t - a.step) / (next.step - a.step);
      o.x = lerp(a.x, next.x, f); o.y = lerp(a.y, next.y, f); o.z = lerp(a.z, next.z, f);
      o.yaw = a.yaw + wrapAngle(next.yaw - a.yaw) * f; o.pitch = lerp(a.pitch, next.pitch, f); o.roll = lerp(a.roll, next.roll, f);
      o.vx = lerp(a.vx, next.vx, f); o.vy = lerp(a.vy, next.vy, f); o.vz = lerp(a.vz, next.vz, f);
      o.steer = lerp(a.steer, next.steer, f); o.rd = lerp(a.rd, next.rd, f);
    } else if (t > a.step && a.rescueT <= 0) {
      ext = Math.min(t - a.step, cap) * STEP;   // at most `cap` steps ahead, then hold
      // follow the turn the kart was making (from its last two snapshots), so the guess bends with the road
      const p = i > 0 ? b[i - 1] : null;
      const w = p && a.step > p.step ? clamp(wrapAngle(a.yaw - p.yaw) / ((a.step - p.step) * STEP), -EXTRAP_TURN, EXTRAP_TURN) : 0;
      const th = w * ext;
      if (Math.abs(th) > 1e-4) {
        const sn = Math.sin(th) / w, cs = (1 - Math.cos(th)) / w;
        o.x = a.x + a.vx * sn + a.vz * cs; o.z = a.z + a.vz * sn - a.vx * cs;
        const c = Math.cos(th), si = Math.sin(th);
        o.vx = a.vx * c + a.vz * si; o.vz = a.vz * c - a.vx * si; o.yaw = a.yaw + th;
      } else { o.x = a.x + a.vx * ext; o.z = a.z + a.vz * ext; }
      o.y = a.grounded ? a.y : a.y + a.vy * ext - 0.5 * TUNE.gravity * ext * ext;
      if (!a.grounded) o.vy = a.vy - TUNE.gravity * ext;
      const h = this.race.karts[slot].hit;
      o.rd = a.rd + (a.vx * h.tx + a.vz * h.tz) * ext;
    }
    const el = Math.max(0, t - a.step) * STEP;
    if (el > 0) for (const name of TIMER_FIELDS) if (o[name] > 0) o[name] = Math.max(0, o[name] - el);
    o.extrapolated = ext; o.held = !next && t - a.step >= cap;
    return o;
  }

  _puppet(k, dt) {
    const pp = this.pp[k.slot], t = this.n - this.delayOf(k);
    // presentation: hold the display continuous through corrections, then let the correction fade.
    // A correction is only what new data changed: the buffer as it is now, asked about the moment shown last step,
    // against what was shown. A real sudden stop between two snapshots is not a correction and is shown as it is.
    let ex = 0, ez = 0, wx = 0, wz = 0, wv = 0, was = false;
    if (pp.raw && pp.t != null) {
      const w = this._sample(k.slot, pp.t, this.maxExtrap);
      if (w) { was = true; wx = w.x; wz = w.z; wv = Math.hypot(w.vx, w.vz); ex = wx - pp.raw.x; ez = wz - pp.raw.z; }
    }
    const smp = this._sample(k.slot, t, this.maxExtrap);
    if (!smp) return;
    const race = this.race, tr = race.track;
    this._events(k, smp, pp.last);
    const rescue = smp.rescueT > 0 || k.rescueT > 0;
    if (pp.raw) {
      if (ex * ex + ez * ez > SMOOTH_MIN * SMOOTH_MIN) { pp.ox -= ex; pp.oz -= ez; }
      // the owner's kart itself can be shoved metres in one step (a push-out): ease that rather than show a snap
      if (was) {
        const mx = smp.x - wx, mz = smp.z - wz, m = Math.hypot(mx, mz);
        const ok = Math.max(wv, Math.hypot(smp.vx, smp.vz)) * Math.max(0, t - pp.t) * STEP + SMOOTH_SLACK;
        if (m > ok) { const f = 1 - ok / m; pp.ox -= mx * f; pp.oz -= mz * f; }
      }
    } else if (pp.cont) {
      pp.ox = pp.cont.x + pp.cont.vx * dt - smp.x; pp.oz = pp.cont.z + pp.cont.vz * dt - smp.z; pp.cont = null;
    }
    // fade the correction, but never faster than SMOOTH_RATE per step, so a long catch-up still looks like driving
    const om = Math.hypot(pp.ox, pp.oz), cut = Math.min(om * (1 - Math.exp(-dt / SMOOTH_TAU)), SMOOTH_RATE);
    if (om > 0) { pp.ox -= pp.ox / om * cut; pp.oz -= pp.oz / om * cut; }
    if (rescue || om > SMOOTH_SNAP) { pp.ox = 0; pp.oz = 0; }
    pp.raw = pp.raw || {}; pp.raw.x = smp.x; pp.raw.z = smp.z; pp.t = t;

    const prevYaw = k.yaw;
    k.x = smp.x + pp.ox; k.z = smp.z + pp.oz;
    const hit = tr.ground(k.x, k.z, k.hint, k.hit, smp.y);
    k.hint = hit.i;
    k.y = smp.grounded && !rescue ? hit.y : smp.y;
    k.gy = hit.y;
    k.yaw = smp.yaw; k.pitch = smp.pitch; k.roll = smp.roll;
    k.vx = smp.vx; k.vy = smp.vy; k.vz = smp.vz; k.steer = smp.steer;
    k.speed = Math.hypot(k.vx, k.vz);
    const sy = Math.sin(k.yaw), cy = Math.cos(k.yaw);
    k.fwd = k.vx * sy + k.vz * cy; k.lat = k.vx * cy - k.vz * sy;
    k.yawRate = wrapAngle(k.yaw - prevYaw) / Math.max(dt, 1e-3);
    if (smp.grounded || k.airT < 0.1) k.surface = hit.surface;
    k.airT = smp.grounded ? 0 : k.airT + dt;
    k.grounded = smp.grounded; k.drifting = smp.drifting; k.driftDir = smp.driftDir; k.driftTier = smp.driftTier; k.driftPaused = smp.driftPaused;
    k.driftArmed = smp.driftArmed; k.hopping = smp.hopping; k.trickDir = smp.trickDir; k.revving = smp.revving; k.goldenActive = smp.goldenActive;
    if (smp.trick) k.trickSpin = k.trick ? k.trickSpin + dt : 0;
    k.trick = smp.trick;
    k.drafting = smp.drafting; k.draftT = smp.drafting ? 1 : 0;
    k.boostKind = smp.boostKind; k.boostMul = smp.boostT > 0 ? smp.boostMul : 1;
    k.hitKind = smp.hitKind; k.hitDur = smp.hitDur || 1;
    for (const name of TIMER_FIELDS) k[name] = smp[name];
    if (k.landed > 0) k.landed -= dt * 3.5;
    // items: keep the per-device cooldowns roughly in step with whoever holds the big ones
    if (smp.item !== k.item) {
      if (smp.item === 'antitrust') race.items.blueCooldown = Math.max(race.items.blueCooldown, 30);
      if (smp.item === 'crash') race.items.crashCooldown = Math.max(race.items.crashCooldown, 34);
    }
    k.item = smp.item && ITEMS[smp.item] ? smp.item : null; k.itemUses = smp.itemUses; k.coins = smp.coins;
    // progress: the owner's raceDistance is the truth
    if (smp.lap > k.lap) {   // a puppet's lap times, as seen from here (the owner's own are exact)
      const at = Math.max(0, race.time - this.delayOf(k) * STEP);
      if (k.lap >= 1) { const lt = at - k.lapStart; k.lapTimes.push(lt); if (lt < k.bestLap) k.bestLap = lt; }
      k.lapStart = at;
    }
    k.lap = smp.lap; k.cpNext = smp.cpNext;
    if (!k.finished) {
      const L = tr.length;
      k.circuit = Math.floor(smp.rd / L); k.s = smp.rd - k.circuit * L;
      if (smp.finished) {   // provisional until the server's list arrives in a room message
        k.finished = true; k.finishTime = k.lapStart; k.finishRank = race.finishOrder.length + 1; k.rank = k.finishRank;
        race.finishOrder.push(k); k.emit('finish', k.finishRank); race.emit('finish', k);
      }
    } else k.s = hit.s;
    const last = pp.last || (pp.last = {});
    Object.assign(last, smp);
  }

  /** Kart events the view and audio expect, read off the change between two samples. */
  _events(k, d, p) {
    if (!p) return;
    if (d.drifting && !p.drifting) k.emit('driftStart', d.driftDir);
    if (d.drifting && d.driftTier > p.driftTier) k.emit('driftTier', d.driftTier);
    if (p.drifting && !d.drifting && p.driftTier > 0 && d.boostKind === 'mini') k.emit('miniTurbo', p.driftTier);
    if (d.boostKind && d.boostKind !== 'mini' && (d.boostKind !== p.boostKind || d.boostT > p.boostT + 0.25)) k.emit('boost', d.boostKind);
    if (d.hopping && !p.hopping) k.emit('hop');
    if (d.grounded && !p.grounded && k.airT > 0.12) { const impact = Math.max(0, -p.vy); k.landed = clamp(impact / 16, 0.2, 1); k.emit('land', impact); }
    if (d.trick && !p.trick) k.emit('trick');
    if (p.trick && !d.trick && d.grounded) k.emit('trickLand');
    if (d.rescueT > 0 && p.rescueT <= 0) k.emit('rescue');
    if (p.rescueT > 0 && d.rescueT <= 0) k.emit('rescued');
    if (d.coins > p.coins) k.emit('coin', d.coins - p.coins);
    else if (d.coins < p.coins && d.hitT > 0) k.emit('dropCoins', p.coins - d.coins);
  }
}

const r3 = v => Math.round(v * 1000) / 1000;
