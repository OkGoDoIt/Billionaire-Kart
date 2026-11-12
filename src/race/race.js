/* A race session: grid, countdown, stepping karts and AI, collisions, pickups,
   ranking, laps, and finishing. Pure simulation, so it also runs headless. */
import { Kart, CLASSES, TUNE } from './kart.js';
import { AIDriver, rubberBand, assignFieldForm, AI_LEVELS } from './ai.js';
import { ItemSystem } from './items.js';
import { makeRng, clamp, loopDelta } from '../core/util.js';
import { makeGroundHit } from '../track/track.js';

export const GP_POINTS = [15, 12, 10, 8, 6, 4, 2, 1];
const NO_INPUT = { steer: 0, throttle: 0, brake: 0, drift: false, item: false };

export class Race {
  /**
   * opts: { track, cc, entries: [{ racer, player: index|-1, level, personality }], laps, seed, items: bool, coins: bool, mode }
   */
  constructor(opts) {
    this.track = opts.track;
    this.cls = CLASSES[opts.cc || 150];
    this.laps = opts.laps ?? this.track.laps;
    this.mode = opts.mode || 'race';           // race | timetrial
    this.rng = makeRng(opts.seed ?? 12345);
    this.time = 0; this.countdown = opts.countdown ?? 3.6; this.countdownFrom = this.countdown; this.frozen = true; this.state = 'countdown';
    this.events = []; this.hazards = []; this.finishOrder = []; this.endT = 0;
    this.karts = [];
    // per-race AI form (issue #138): deal the field its pace spread before anyone is
    // built — best draw to a randomly chosen designated rival — see assignFieldForm.
    // A race is a single difficulty in practice; the first AI entry's level sets the range.
    const formOf = new Map();
    const aiSlots = opts.entries.map((e, i) => e.player < 0 ? i : -1).filter(i => i >= 0);
    if (aiSlots.length) {
      const lv0 = AI_LEVELS[opts.entries[aiSlots[0]].level || 'normal'] || AI_LEVELS.normal;
      const field = assignFieldForm(aiSlots.length, lv0.form ?? 0.04, this.rng);
      aiSlots.forEach((entryIdx, j) => formOf.set(entryIdx, { form: field.forms[j], rival: j === field.rival }));
    }
    opts.entries.forEach((e, slot) => {
      const kart = new Kart(this, { racer: e.racer, slot, isPlayer: e.player >= 0, playerIndex: e.player });
      if (e.player < 0) kart.ai = new AIDriver(kart, e.level || 'normal', this.rng, { ...(e.personality || e.racer.ai || {}), ...formOf.get(slot) });
      else { kart.autoTrick = !!e.autoTrick; kart.assist = e.assist || {}; }
      const g = this.track.gridSlot(slot);
      kart.place(g.x, g.y, g.z, g.yaw, this.track.N - 4);
      kart.lap = 0; kart.cpNext = 4;
      this.karts.push(kart);
    });
    this.players = this.karts.filter(k => k.isPlayer).sort((a, b) => a.playerIndex - b.playerIndex);
    this.items = new ItemSystem(this, { items: opts.items !== false && this.mode !== 'timetrial', coins: opts.coins !== false });
    const lake = this.track.def.lake;   // a body of water whose level the race drives (opt-in)
    if (lake) { this.lakeLap = 1; this.lakeY = lake.levelForLap(1, this.laps); }
    this.obstacles = this.track.obstacleDefs.map(d => ({ ...d, x: 0, y: 0, z: 0, yaw: 0, active: true, t: d.phase }));
    this._obstacles(0);
    if (this.mode === 'timetrial') for (const k of this.players) { k.item = 'boost'; k.itemUses = 3; }
    this._rank();
  }

  emit(type, data) { this.events.push({ type, data }); }

  /** inputs: array indexed by playerIndex. */
  step(dt, inputs = []) {
    // countdown
    if (this.frozen) {
      const before = this.countdown;
      this.countdown -= dt;
      for (const n of [3, 2, 1]) if (before > n && this.countdown <= n) this.emit('count', n);
      if (this.countdown <= 0) {
        this.frozen = false; this.state = 'racing'; this.emit('go');
        for (const k of this.karts) k.launch();
      }
    } else if (this.state !== 'done') this.time += dt;

    if (this.lakeY != null) {   // the lake eases toward the level for the leader's lap
      let lap = 1; for (const k of this.karts) lap = Math.max(lap, Math.min(k.lap, this.laps + 1));
      this.lakeLap = lap;
      const want = this.track.def.lake.levelForLap(lap, this.laps), d = want - this.lakeY, r = (this.track.def.lake.rate ?? 1.5) * dt;
      this.lakeY += clamp(d, -r, r);
    }
    rubberBand(this);
    for (const k of this.karts) {
      const inp = k.ai ? k.ai.think(dt) : (inputs[k.playerIndex] || NO_INPUT);
      k.step(dt, inp);
      if (inp.item && !k.prevItem && !this.frozen) this.items.use(k, inp);
      k.prevItem = !!inp.item;
    }
    this._collide();
    this._obstacles(dt);
    this.items.step(dt);
    this._rank();
    this._finish(dt);
  }

  _collide() {
    const ks = this.karts;
    for (let a = 0; a < ks.length; a++) for (let b = a + 1; b < ks.length; b++) {
      const A = ks[a], B = ks[b];
      if (A.rescueT > 0 || B.rescueT > 0) continue;
      const dx = B.x - A.x, dz = B.z - A.z, rr = (A.radius + B.radius) * (A.shrinkT > 0 || B.shrinkT > 0 ? 0.8 : 1);
      const d2 = dx * dx + dz * dz;
      if (d2 > rr * rr || d2 < 1e-6 || Math.abs(A.y - B.y) > 1.4) continue;
      if (A.ghostT > 0 || B.ghostT > 0) continue;
      // star or rocket beats everything
      if (A.invincible !== B.invincible) {
        const strong = A.invincible ? A : B, weak = A.invincible ? B : A;
        if (weak.hurt(strong.bulletT > 0 ? 'tumble' : 'spin', strong)) this.emit('kartHit', { by: strong, victim: weak, with: strong.bulletT > 0 ? 'bailout' : 'star' });
        continue;
      }
      // a full-size kart flattens a shrunken one
      if ((A.shrinkT > 0) !== (B.shrinkT > 0)) {
        const big = A.shrinkT > 0 ? B : A, small = A.shrinkT > 0 ? A : B;
        if (small.hurt('squash', big)) this.emit('kartHit', { by: big, victim: small, with: 'squash' });
      }
      const d = Math.sqrt(d2), nx = dx / d, nz = dz / d, overlap = rr - d;
      const mA = A.mass * (A.shrinkT > 0 ? 0.4 : 1), mB = B.mass * (B.shrinkT > 0 ? 0.4 : 1), sum = mA + mB;
      A.x -= nx * overlap * (mB / sum); A.z -= nz * overlap * (mB / sum);
      B.x += nx * overlap * (mA / sum); B.z += nz * overlap * (mA / sum);
      const rvx = B.vx - A.vx, rvz = B.vz - A.vz, vn = rvx * nx + rvz * nz;
      if (vn < 0) {
        const j = -(1 + 0.45) * vn / (1 / mA + 1 / mB);
        A.vx -= (j / mA) * nx; A.vz -= (j / mA) * nz; B.vx += (j / mB) * nx; B.vz += (j / mB) * nz;
        if (vn < -2.5) { A.emit('bump', { v: -vn, other: B }); B.emit('bump', { v: -vn, other: A }); }
      }
    }
  }

  /** Track obstacles: patrols, orbiters, and timed hazards, all on fixed schedules. */
  _obstacles(dt) {
    const tr = this.track, P = this._op || (this._op = { x: 0, y: 0, z: 0 });
    for (const o of this.obstacles) {
      o.t += dt;
      let s = o.a.s, lat = o.a.lat;
      if (o.kind === 'patrol') {
        const ds = loopDelta(o.a.s, o.b.s, tr.length), dist = Math.hypot(ds, o.b.lat - o.a.lat) || 1;
        const ph = (o.t * o.speed / dist) % 2, f = ph < 1 ? ph : 2 - ph, e = f * f * (3 - 2 * f);
        s = o.a.s + ds * e; lat = o.a.lat + (o.b.lat - o.a.lat) * e;
        o.yaw = tr.yawAt(s) + (Math.abs(ds) < 1 ? (ph < 1 ? 1 : -1) * Math.sign(o.b.lat - o.a.lat) * Math.PI / 2 : ph < 1 ? 0 : Math.PI);
      } else if (o.kind === 'orbit') {
        const a = o.t * o.speed / Math.max(1, o.orbit); s = o.a.s + Math.cos(a) * o.orbit; lat = o.a.lat + Math.sin(a) * o.orbit; o.yaw = tr.yawAt(s) - a;
      } else if (o.kind === 'timed') { o.active = ((o.t / o.period) % 1) < o.duty; o.warn = !o.active && ((o.t / o.period) % 1) > 1 - 0.18; }
      tr.pointAt(s, lat, P, o.lift); o.x = P.x; o.y = P.y; o.z = P.z;
      // off the road, stand on the real ground rather than the road plane extended sideways
      const i = Math.floor(((s % tr.length) + tr.length) % tr.length / tr.ds) % tr.N;
      if (lat > tr.hwL[i] + 1.2 || -lat > tr.hwR[i] + 1.2) o.y = tr.ground(o.x, o.z, i, this._oh || (this._oh = makeGroundHit())).y + o.lift;
      if (!o.active || this.frozen) continue;
      for (const k of this.karts) {
        if (k.rescueT > 0 || k.ghostT > 0) continue;
        const dx = k.x - o.x, dz = k.z - o.z, rr = o.radius + k.radius * 0.85;
        if (dx * dx + dz * dz > rr * rr || Math.abs(k.y - o.y) > 2.2) continue;
        if (k.invincible) { if (o.kind !== 'timed') { o.t += 0; } continue; }
        if (o.effect === 'bump') { const d = Math.hypot(dx, dz) || 1; k.x = o.x + (dx / d) * rr; k.z = o.z + (dz / d) * rr; const vn = (k.vx * dx + k.vz * dz) / d; if (vn < 0) { k.vx -= (dx / d) * vn * 1.6; k.vz -= (dz / d) * vn * 1.6; k.vx *= 0.7; k.vz *= 0.7; k.emit('bump', { v: -vn, other: null }); } }
        else if (k.hurt(o.effect)) this.emit('obstacleHit', { kart: k, obstacle: o });
      }
    }
  }

  _rank() {
    const L = this.track.length;
    for (const k of this.karts) k.progress = k.finished ? 1e9 - k.finishRank : k.lap * L + k.s + (k.lap === 0 ? -L : 0);
    const order = this._order || (this._order = this.karts.slice());
    order.sort((a, b) => b.progress - a.progress);
    for (let i = 0; i < order.length; i++) {
      const k = order[i], r = i + 1;
      if (!k.finished && k.rank !== r && !this.frozen) { if (r < k.rank) { k.stats.overtakes++; k.emit('rankUp', r); } else k.emit('rankDown', r); }
      if (!k.finished) k.rank = r;
    }
    this.order = order;
  }

  _finish(dt) {
    if (this.state === 'countdown') return;
    for (const k of this.karts) {
      if (!k.finished && k.lap > this.laps) {
        k.finished = true; k.finishTime = this.time; k.finishRank = this.finishOrder.length + 1; k.rank = k.finishRank;
        this.finishOrder.push(k); k.endDrift(false);
        k.emit('finish', k.finishRank); this.emit('finish', k);
      }
      if (!k.finished && k.lap === this.laps && !k.finalLapAnnounced) { k.finalLapAnnounced = true; k.emit('finalLap'); }
    }
    if (this.state === 'racing' && this.players.length && this.players.every(k => k.finished)) { this.state = 'finishing'; this.endT = 4.5; }
    if (this.state === 'racing' && !this.players.length && this.karts.every(k => k.finished)) { this.state = 'done'; this.emit('done'); }
    if (this.state === 'finishing') {
      this.endT -= dt;
      if (this.endT <= 0 || this.karts.every(k => k.finished)) {
        // anyone still out there is classified in running order
        for (const k of this.order) if (!k.finished) {
          const L = this.track.length, remaining = (this.laps + 1 - k.lap) * L - k.s;
          k.finished = true; k.finishRank = this.finishOrder.length + 1; k.rank = k.finishRank; k.dnfEstimate = true;
          k.finishTime = this.time + remaining / Math.max(12, k.top * 0.92);
          this.finishOrder.push(k);
        }
        this.state = 'done'; this.emit('done');
      }
    }
  }

  results() {
    return this.finishOrder.map((k, i) => ({ kart: k, racer: k.racer, rank: i + 1, time: k.finishTime, bestLap: k.bestLap, points: GP_POINTS[i] || 0, isPlayer: k.isPlayer, playerIndex: k.playerIndex, estimated: !!k.dnfEstimate, stats: k.stats }));
  }
}
export { CLASSES, TUNE };
