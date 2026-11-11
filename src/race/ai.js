/* AI drivers. They use the same kart physics and inputs as players: steer toward a
   point on the racing line, drift through real corners, avoid traffic and hazards,
   and use items with a little judgement. Rubber-banding only nudges top speed. */
import { clamp, lerp, wrapAngle, mod, loopDelta } from '../core/util.js';
import { TUNE } from './kart.js';

export const AI_LEVELS = {
  easy:   { skill: 0.45, speed: 0.93, band: 0.05, driftChance: 0.35, startChance: 0.15, itemDelay: [1.5, 5], line: 0.5 },
  normal: { skill: 0.7,  speed: 0.975, band: 0.045, driftChance: 0.7,  startChance: 0.45, itemDelay: [0.8, 3.5], line: 0.75 },
  hard:   { skill: 0.92, speed: 1.0,  band: 0.04, driftChance: 0.95, startChance: 0.8,  itemDelay: [0.4, 2.2], line: 0.95 },
};

const P = { x: 0, y: 0, z: 0 };

export class AIDriver {
  constructor(kart, level, rng, personality = {}) {
    this.kart = kart; this.rng = rng;
    this.lv = { ...AI_LEVELS[level] || AI_LEVELS.normal };
    this.skill = clamp(this.lv.skill + (personality.skill || 0) + rng.range(-0.08, 0.08), 0.2, 1);
    this.aggr = clamp(0.5 + (personality.aggression || 0) + rng.range(-0.2, 0.2), 0, 1);
    this.bias = rng.range(-1, 1) * 1.6 * (1 - this.skill * 0.6);       // habitual lateral offset
    this.wanderPhase = rng() * 10; this.wanderRate = rng.range(0.25, 0.6);
    this.input = { steer: 0, throttle: 1, brake: 0, drift: false, item: false };
    this.driftPlan = null; this.stuckT = 0; this.reverseT = 0; this.itemT = rng.range(...this.lv.itemDelay);
    this.willRocket = rng() < this.lv.startChance; this.avoid = 0; this.mistakeT = rng.range(6, 20); this.wobble = 0;
    kart.autoTrick = rng() < 0.55 + this.skill * 0.45;
  }

  think(dt) {
    const k = this.kart, race = k.race, tr = race.track, inp = this.input;
    inp.item = false;
    // countdown: skilled drivers time a rocket start
    if (race.frozen) {
      inp.steer = 0; inp.brake = 0; inp.drift = false;
      inp.throttle = this.willRocket && race.countdown < 1.9 - (1 - this.skill) * 0.6 ? 1 : 0;
      return inp;
    }
    if (k.finished) { return this._follow(dt, 0.6); }

    // stuck recovery
    if (k.speed < 2.5 && k.hitT <= 0 && k.rescueT <= 0) this.stuckT += dt; else this.stuckT = Math.max(0, this.stuckT - dt * 2);
    if (this.stuckT > 1.6 && this.reverseT <= 0) { this.reverseT = 1.0; }
    if (this.stuckT > 5) { k.startRescue(); this.stuckT = 0; }
    if (this.reverseT > 0) {
      this.reverseT -= dt; inp.throttle = 0; inp.brake = 1; inp.drift = false;
      const ang = wrapAngle(tr.yaw[k.hit.i] - k.yaw); inp.steer = clamp(ang * 2, -1, 1); // reversed steering points the nose back
      return inp;
    }

    this._follow(dt, 1);
    this._items(dt);
    return inp;
  }

  _follow(dt, throttleMul) {
    const k = this.kart, race = k.race, tr = race.track, inp = this.input, N = tr.N;
    const sp = k.speed, hit = k.hit;
    const look = 8 + sp * (0.5 + 0.12 * this.skill);
    const iAhead = mod(Math.round((k.s + look) / tr.ds), N);

    // desired lateral position: racing line blended with habit, wander, and avoidance
    this.wanderPhase += dt * this.wanderRate;
    const hwA = Math.min(tr.hwL[iAhead], tr.hwR[iAhead]) - 1.6;
    let lat = tr.lineLat[iAhead] * this.lv.line + this.bias + Math.sin(this.wanderPhase) * 1.2 * (1 - this.skill * 0.5);
    // occasional small mistakes keep them human
    this.mistakeT -= dt;
    if (this.mistakeT <= 0) { this.wobble = this.rng.range(-1, 1) * (1.15 - this.skill) * 5; this.mistakeT = this.rng.range(7, 22); this.wobbleT = 1.2; }
    if (this.wobbleT > 0) { this.wobbleT -= dt; lat += this.wobble; }
    // traffic and hazard avoidance
    let want = 0;
    const sy = Math.sin(k.yaw), cy = Math.cos(k.yaw);
    for (const o of race.karts) {
      if (o === k || o.rescueT > 0) continue;
      const dx = o.x - k.x, dz = o.z - k.z, f = dx * sy + dz * cy;
      if (f < 1 || f > 14 + sp * 0.3) continue;
      const l = dx * cy - dz * sy; if (Math.abs(l) > 2.6) continue;
      if (o.speed > sp + 1 && o.hitT <= 0) continue; // not catching it
      if (k.starT > 0 && o.vulnerable) { want += l > 0 ? 0.6 : -0.6; continue; } // hunt with a star
      want += (l >= 0 ? -1 : 1) * (1 - f / 30);
    }
    for (const o of race.obstacles || []) {
      if (!o.active && !o.warn) continue;
      const dx = o.x - k.x, dz = o.z - k.z, f = dx * sy + dz * cy;
      if (f < 0.5 || f > 14 + sp * 0.5) continue;
      const l = dx * cy - dz * sy; if (Math.abs(l) > o.radius + 1.6) continue;
      if (this.skill < 0.5 && (o.id + k.id) % 3 === 0) continue;       // weaker drivers miss some
      want += (l >= 0 ? -1.5 : 1.5);
    }
    for (const h of race.hazards || []) {
      if (h.owner === k && h.age < 1) continue;
      const dx = h.x - k.x, dz = h.z - k.z, f = dx * sy + dz * cy;
      if (f < 0.5 || f > 12 + sp * 0.45) continue;
      const l = dx * cy - dz * sy; if (Math.abs(l) > (h.radius || 1.2) + 1.4) continue;
      if (this.rng() > this.skill * 0.9 + 0.08 && !h._seen?.has(k.id)) { (h._seen || (h._seen = new Set())).add(k.id); h._blind = (h._blind || new Set()).add(k.id); }
      if (h._blind?.has(k.id)) continue;
      (h._seen || (h._seen = new Set())).add(k.id);
      want += (l >= 0 ? -1.4 : 1.4);
    }
    this.avoid = lerp(this.avoid, clamp(want, -1, 1) * 3.4, 1 - Math.exp(-5 * dt));
    lat = clamp(lat + this.avoid, -hwA, hwA);

    tr.pointAt(k.s + look, lat, P);
    let ang = wrapAngle(Math.atan2(P.x - k.x, P.z - k.z) - k.yaw); // + = target is to the left
    let steer = clamp(-ang * 2.4, -1, 1);

    // corner speed and drifting
    let kMax = 0, kSign = 0;
    const span = Math.round((10 + sp * 0.9) / tr.ds);
    for (let j = 2; j < span; j += 2) { const c = tr.curv[mod(hit.i + j, N)]; if (Math.abs(c) > Math.abs(kMax)) kMax = c; }
    kSign = Math.sign(kMax);
    const omegaMax = TUNE.turnRate * TUNE.turnHighSpeed * k.handling;      // no-drift turn rate at speed
    const need = Math.abs(kMax) * sp;                                        // yaw rate needed for the corner ahead
    let throttle = 1, brake = 0, drift = false;

    if (k.drifting) {
      // steer the drift to hold the line: into the corner tightens, out widens
      drift = true;
      const plan = this.driftPlan;
      const remaining = plan ? loopDelta(k.s, plan.endS, tr.length) : -99;
      const offLine = Math.abs(hit.lat) > Math.min(hit.hwL, hit.hwR) - 0.6 && Math.sign(hit.lat) === Math.sign(-k.driftDir) * -1;
      if (remaining < 3 && k.driftTier >= 1) drift = false;                    // corner done, cash in the turbo
      else if (remaining < -10) drift = false;                                // overshot the corner
      else if (k.driftTier >= (plan?.wantTier || 1) + 1) drift = false;       // plenty charged
      else if (offLine) drift = false;
      if (!drift) this.driftPlan = null;
    } else if (this.driftPlan) {
      // button is down and we are mid-hop: keep holding until the drift catches
      const plan = this.driftPlan; plan.wait = (plan.wait || 0) + dt;
      drift = true; steer = plan.steer;
      if (plan.wait > 0.7 || k.hitT > 0) { this.driftPlan = null; drift = false; }
    } else if (k.grounded && sp > k.top * 0.62 && k.hitT <= 0 && !k.surface.offroad) {
      // find a corner we are about to enter
      for (const c of tr.corners) {
        const d = loopDelta(k.s, c.i0 * tr.ds, tr.length);
        if (d > -6 && d < 5 + sp * 0.28 && c.len > 26) {
          if (this._lastCorner !== c) { this._lastCorner = c; this._driftRoll = this.rng() < this.lv.driftChance * (0.6 + this.skill * 0.5); }
          if (this._driftRoll) {
            // a left turn (dir +1) means steering left (-1)
            this.driftPlan = { endS: c.i1 * tr.ds, steer: -c.dir, wantTier: c.len > 70 ? 2 : 1, wait: 0 };
            drift = true; steer = -c.dir; this._driftRoll = false;
          }
          break;
        }
      }
    }
    if (!drift && !k.drifting && need > omegaMax * 1.02) {
      // cannot make the corner at this speed without drifting: lift, and brake if it is bad
      const vSafe = omegaMax / Math.max(1e-4, Math.abs(kMax));
      if (sp > vSafe * 1.05) throttle = 0.35;
      if (sp > vSafe * 1.3) { throttle = 0; brake = 0.7; }
    }
    void kSign;
    if (Math.abs(ang) > 1.25 && sp > 9) { throttle = 0.2; }
    if (k.wrongWayT > 0.8) { steer = clamp(-wrapAngle(tr.yaw[hit.i] - k.yaw) * 2, -1, 1); }

    inp.steer = steer; inp.throttle = throttle * throttleMul; inp.brake = brake; inp.drift = drift;
    return inp;
  }

  _items(dt) {
    const k = this.kart, race = k.race, inp = this.input;
    if (!k.item) { this.itemT = Math.max(this.itemT, 0.3); return; }
    this.itemT -= dt;
    if (this.itemT > 0) return;
    const use = race.items ? race.items.aiShouldUse(k, this) : true;
    if (use) { inp.item = true; this.itemT = this.rng.range(...this.lv.itemDelay) * (k.itemUses > 1 ? 0.35 : 1); }
    else this.itemT = 0.25;
  }
}

/** Rubber band: nudge AI top speed by how far they are from the lead human. */
export function rubberBand(race) {
  const humans = race.karts.filter(k => k.isPlayer);
  if (!humans.length) { for (const k of race.karts) k.aiSpeedMul = k.ai ? k.ai.lv.speed : 1; return; }
  const L = race.track.length;
  let lead = humans[0];
  for (const h of humans) if (h.lap * L + h.s > lead.lap * L + lead.s) lead = h;
  const leadP = lead.lap * L + lead.s;
  for (const k of race.karts) {
    if (!k.ai) continue;
    const d = (k.lap * L + k.s) - leadP;        // + = ahead of the human
    const band = k.ai.lv.band;
    const adj = d > 0 ? -band * clamp(d / 110, 0, 1) : band * 1.25 * clamp(-d / 150, 0, 1);
    k.aiSpeedMul = k.ai.lv.speed * (1 + adj) * (race.cls.ai || 1);
  }
}
