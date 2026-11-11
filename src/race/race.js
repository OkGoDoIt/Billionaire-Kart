/* A race session: grid, countdown, stepping karts and AI, collisions, pickups,
   ranking, laps, and finishing. Pure simulation, so it also runs headless. */
import { Kart, CLASSES, TUNE } from './kart.js';
import { AIDriver, rubberBand } from './ai.js';
import { ItemSystem } from './items.js';
import { makeRng, clamp } from '../core/util.js';

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
    this.time = 0; this.countdown = opts.countdown ?? 3.6; this.frozen = true; this.state = 'countdown';
    this.events = []; this.hazards = []; this.finishOrder = []; this.endT = 0;
    this.karts = [];
    opts.entries.forEach((e, slot) => {
      const kart = new Kart(this, { racer: e.racer, slot, isPlayer: e.player >= 0, playerIndex: e.player });
      if (e.player < 0) kart.ai = new AIDriver(kart, e.level || 'normal', this.rng, e.personality || e.racer.ai || {});
      else { kart.autoTrick = !!e.autoTrick; kart.assist = e.assist || {}; }
      const g = this.track.gridSlot(slot);
      kart.place(g.x, g.y, g.z, g.yaw, this.track.N - 4);
      kart.lap = 0; kart.cpNext = 4;
      this.karts.push(kart);
    });
    this.players = this.karts.filter(k => k.isPlayer).sort((a, b) => a.playerIndex - b.playerIndex);
    this.items = new ItemSystem(this, { items: opts.items !== false && this.mode !== 'timetrial', coins: opts.coins !== false });
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

    rubberBand(this);
    for (const k of this.karts) {
      const inp = k.ai ? k.ai.think(dt) : (inputs[k.playerIndex] || NO_INPUT);
      k.step(dt, inp);
      if (inp.item && !k.prevItem && !this.frozen) this.items.use(k, inp);
      k.prevItem = !!inp.item;
    }
    this._collide();
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
