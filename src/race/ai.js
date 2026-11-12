/* AI drivers. They use the same kart physics and inputs as players: steer toward a
   point on the racing line, drift through real corners, avoid traffic and hazards,
   and use items with a little judgement. Rubber-banding only nudges top speed.
   Tracks may list shortcuts (def.shortcuts); skilled rivals take them now and then. */
import { clamp, lerp, wrapAngle, mod, loopDelta } from '../core/util.js';
import { TUNE } from './kart.js';

// cuts: chance per lap of taking a shortcut the driver qualifies for (the easiest level never does)
export const AI_LEVELS = {
  easy:   { skill: 0.45, speed: 0.93, band: 0.05, driftChance: 0.35, startChance: 0.15, itemDelay: [1.5, 5], line: 0.5, cuts: 0 },
  normal: { skill: 0.7,  speed: 0.975, band: 0.045, driftChance: 0.7,  startChance: 0.45, itemDelay: [0.8, 3.5], line: 0.75, cuts: 0.45 },
  hard:   { skill: 0.92, speed: 1.0,  band: 0.04, driftChance: 0.95, startChance: 0.8,  itemDelay: [0.4, 2.2], line: 0.95, cuts: 0.8 },
};
const BOOST_ITEMS = new Set(['boost', 'boost3', 'golden']);

/* Shortcuts from the track definition, resolved once per track: entry and rejoin distances,
   and the waypoints with the rejoin point on the racing line appended. */
export function trackShortcuts(tr) {
  if (tr._aiCuts) return tr._aiCuts;
  const P = { x: 0, y: 0, z: 0 };
  return (tr._aiCuts = (tr.def.shortcuts || []).map((c, n) => {
    const s0 = tr.sAtCp(c.from), s1 = tr.sAtCp(c.to), i1 = tr.indexAtCp(c.to);
    tr.pointAt(s1, tr.lineLat[i1] * 0.6, P);
    const pts = [...c.path.map(([x, z]) => ({ x, z })), { x: P.x, z: P.z }];
    let len = 0; tr.pointAt(s0, 0, P); for (let k = 0, x = P.x, z = P.z; k < pts.length; x = pts[k].x, z = pts[k].z, k++) len += Math.hypot(pts[k].x - x, pts[k].z - z);
    return { ...c, name: c.name || `shortcut ${n + 1}`, s0, s1, pts, len, skill: c.skill ?? 0.6, chance: c.chance ?? 1 };
  }));
}
/** No water along the path (a draining lake, def.lake): never wade in, and never risk the deep-water rescue. */
function dryPath(c, race) {
  const tr = race.track, lake = tr.def.lake;
  if (!lake || race.lakeY == null) return true;
  for (let k = 1; k < c.pts.length; k++) {
    const a = c.pts[k - 1], b = c.pts[k], n = Math.ceil(Math.hypot(b.x - a.x, b.z - a.z) / 3);
    for (let j = 0; j <= n; j++) { const x = lerp(a.x, b.x, j / n), z = lerp(a.z, b.z, j / n); if (lake.inside(x, z) && race.lakeY - tr.terrainHeight(x, z) > -0.35) return false; }
  }
  return true;
}

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
    this.cut = null; this.cutPlan = null; this._cutLap = {};
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

    this._shortcuts();
    if (this.cut) this._cutFollow(dt); else this._follow(dt, 1);
    this._items(dt);
    return inp;
  }

  /* Shortcuts: decide once per shortcut per lap, a little before the entry, so a boost item can be
     saved for it; at the entry, take it if still able (and fire the boost there), then follow the
     waypoints until back on the road. */
  _shortcuts() {
    const k = this.kart, race = k.race, tr = race.track;
    if (this.cut || !tr.def.shortcuts || !this.lv.cuts || k.lap < 1) return;
    const cuts = trackShortcuts(tr);
    this.cutPlan = null;
    for (const c of cuts) {
      const ahead = loopDelta(k.s, c.s0, tr.length);
      if (ahead < -3 || ahead > 160) continue;
      const key = c.name + ':' + k.lap;
      if (this._cutLap[key] == null) this._cutLap[key] = this.skill >= c.skill && this.rng() < this.lv.cuts * c.chance;
      if (!this._cutLap[key]) continue;
      this.cutPlan = c;
      if (ahead > 2) return;
      // at the entry: still able?
      const boostItem = BOOST_ITEMS.has(k.item);
      const ok = k.hitT <= 0 && k.airT < 0.4 && k.speed > k.top * 0.55 && (!c.boost || boostItem || k.boostT > 0.6 || k.starT > 0)
        && (!c.when || c.when(race, k)) && dryPath(c, race);
      this._cutLap[key] = false;
      if (!ok) { this.cutPlan = null; return; }
      // a boost item in hand goes on the way in, as soon as the kart points down the path
      const fire = boostItem && k.boostT < 0.6 && k.starT <= 0;
      this.cut = { c, n: 0, t: 0, poly: [{ x: k.x, z: k.z }, ...c.pts], fire, ang: 0 }; this.cutPlan = null;
      k.stats.shortcuts = (k.stats.shortcuts || 0) + 1;
      k.emit('shortcut', { name: c.name, boost: fire });
      return;
    }
  }

  /* On a shortcut: chase a point a little way along the path (pure pursuit), so corners are taken
     early and smoothly; sidestep traffic, obstacles, and solid scenery. */
  _cutFollow(dt) {
    const k = this.kart, inp = this.input, cut = this.cut, c = cut.c, tr = k.race.track, poly = cut.poly;
    cut.t += dt;
    // which leg are we on: move on once past the end of this one, or nearer the next
    const proj = (n, out) => {
      const a = poly[n], b = poly[n + 1], ex = b.x - a.x, ez = b.z - a.z, l2 = ex * ex + ez * ez || 1;
      const t = ((k.x - a.x) * ex + (k.z - a.z) * ez) / l2, tc = clamp(t, 0, 1);
      out.t = t; out.x = a.x + ex * tc; out.z = a.z + ez * tc; out.d = Math.hypot(k.x - out.x, k.z - out.z); return out;
    };
    const A = this._pa || (this._pa = {}), B = this._pb || (this._pb = {});
    while (cut.n < poly.length - 1) {
      proj(cut.n, A);
      if (A.t >= 1 || (cut.n < poly.length - 2 && proj(cut.n + 1, B).d < A.d && B.t > 0)) { cut.n++; continue; }
      break;
    }
    const back = loopDelta(c.s1, k.s, tr.length);
    // done: at the end of the path, or back on the road beyond the rejoin; give up if it is going badly
    if (cut.n >= poly.length - 1 || (k.hit.onRoad && back > 0 && back < 40) || A.d > 25 || cut.t > 3 + c.len / 9) { this.cut = null; return this._follow(dt, 1); }
    // walk the look-ahead distance along the path from where we are
    let look = 7 + k.speed * 0.45, n = cut.n, px = A.x, pz = A.z;
    while (n < poly.length - 1) {
      const b = poly[n + 1], l = Math.hypot(b.x - px, b.z - pz);
      if (l >= look) { px += (b.x - px) / l * look; pz += (b.z - pz) / l * look; break; }
      look -= l; px = b.x; pz = b.z; n++;
    }
    const sy = Math.sin(k.yaw), cy = Math.cos(k.yaw);
    this.avoid = lerp(this.avoid, clamp(this._wantAvoid(k.speed), -1, 1) * 3.4, 1 - Math.exp(-5 * dt));
    const side = this.avoid * Math.max(1, Math.hypot(px - k.x, pz - k.z) / 12);   // sidestep along the kart's left (+), as sharply at speed as at 12 m
    const tx = px + cy * side, tz = pz - sy * side;
    const ang = this._dodgeSolids(wrapAngle(Math.atan2(tx - k.x, tz - k.z) - k.yaw)), Ld = Math.hypot(tx - k.x, tz - k.z);
    inp.steer = clamp(-ang * 2.4, -1, 1); inp.drift = false;
    // the arc to the chase point needs yaw rate 2 v sin(a) / Ld: lift or brake if that is more than the kart can turn
    const vMax = TUNE.turnRate * TUNE.turnHighSpeed * k.handling * Ld / Math.max(0.05, 2 * Math.sin(Math.min(Math.abs(ang), 1.5)));
    inp.throttle = k.speed > vMax * 1.05 || (Math.abs(ang) > 1.25 && k.speed > 9) ? 0.2 : 1;
    inp.brake = k.speed > vMax * 1.3 ? 0.6 : 0;
    cut.ang = Math.abs(ang);
    if (cut.fire && cut.ang < 0.2 && k.boostT < 0.3) { cut.fire = false; inp.item = true; this.itemT = this.rng.range(...this.lv.itemDelay) * 0.3; }
    return inp;
  }

  /** Off the road: trees, tents, transformers. Given the wanted heading (radians from the nose, + = left), return one that
      clears the nearest trunk in the way, passing it on whichever side the wanted heading already favours. */
  _dodgeSolids(ang) {
    const k = this.kart, tr = k.race.track;
    if (!tr.colliderCount) return ang;
    const sy = Math.sin(k.yaw), cy = Math.cos(k.yaw), reach = 6 + k.speed * 0.6;
    let best = null, bd = Infinity;
    tr.eachCollider(k.x + sy * reach * 0.5, k.z + cy * reach * 0.5, o => {
      const dx = o.x - k.x, dz = o.z - k.z, f = dx * sy + dz * cy, d = Math.hypot(dx, dz);
      if (f < 0.3 || d > reach || d >= bd) return;
      const bear = Math.atan2(dx * cy - dz * sy, f), half = Math.asin(Math.min(1, (o.r + k.radius * 0.8 + 1.2) / d));
      if (Math.abs(wrapAngle(ang - bear)) < half) { bd = d; best = { bear, half }; }
    });
    if (!best) return ang;
    return ang >= best.bear ? best.bear + best.half : best.bear - best.half;
  }

  /** Sideways push away from karts, obstacles, and dropped hazards ahead. + = go left. */
  _wantAvoid(sp) {
    const k = this.kart, race = k.race;
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
    return want;
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
    const want = this._wantAvoid(sp);
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
    } else if (k.grounded && sp > k.top * 0.62 && k.hitT <= 0 && !k.surface.offroad && !(this.cutPlan && loopDelta(k.s, this.cutPlan.s0, tr.length) < 70)) {   // no mini-turbo into a shortcut
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
    if (this.cutPlan && BOOST_ITEMS.has(k.item) && !k.goldenActive) return;   // saving it for the shortcut
    if (this.cut && BOOST_ITEMS.has(k.item) && (this.cut.fire || this.cut.ang > 0.2)) return;   // on it: only boost when lined up
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
