/* Kart physics and state. Arcade model: heading plus a ground-plane velocity
   with lateral grip, so drifts slide for real; hop-drift with three mini-turbo
   tiers; boosts; ramp tricks; coins; hit reactions. Runs in the browser and in
   Node (no rendering here). All randomness comes from the race RNG. */
import { clamp, lerp, damp, approach, smoothstep, wrapAngle, sign } from '../core/util.js';
import { EDGE, makeGroundHit, SURFACES } from '../track/track.js';

/** Engine classes. top = top speed in m/s on the road with no coins. */
export const CLASSES = {
  50:  { id: 50,  label: '50cc',  name: 'Bootstrapped',   top: 23.6, accel: 0.92, ai: 0.92 },   // 80% of 150cc, as in the reference games
  100: { id: 100, label: '100cc', name: 'Venture-Backed', top: 26.6, accel: 1.0,  ai: 0.96 },   // 90%
  150: { id: 150, label: '150cc', name: 'Blitzscaling',   top: 29.5, accel: 1.08, ai: 1.0 },
  200: { id: 200, label: '200cc', name: 'Hypergrowth',    top: 36,   accel: 1.2,  ai: 1.0 },
};

export const TUNE = {
  gravity: 30,
  radius: 1.0,                 // collision radius
  // steering
  turnRate: 1.62,              // rad/s at mid speed, before handling stat
  turnHighSpeed: 0.78,         // multiplier at top speed
  steerRise: 6.5, steerFall: 9,
  // grip (1/s decay of sideways velocity)
  grip: 9, gripDrift: 5.2, gripAir: 0.4, gripSpin: 1.3,
  // drift
  hopV: 4.4,
  driftMinSpeed: 0.5,          // fraction of top speed needed to start a drift (it drops out a little below)
  driftBase: 0.98, driftRange: 1.18,   // rad/s: neutral stick holds a wide arc; steering in tightens it a lot
  driftChargeBase: 0.5, driftChargeIn: 0.55, driftChargeOut: 0.12,   // steering into the drift charges about twice as fast
  tierAt: [0.85, 1.8, 2.75],   // seconds of full-rate charge for blue / orange / purple
  tierBoost: [0.55, 1.3, 2.1], // boost seconds: higher tiers buy duration, not speed
  tierMul: [1.2, 1.2, 1.22],
  // boosts
  boostAccel: 46, boostFade: 9,
  mushroom: { t: 1.35, mul: 1.36 }, pad: { t: 1.05, mul: 1.33 }, trick: { t: 0.85, mul: 1.24 },
  start: { t: 1.6, mul: 1.34 }, draft: { t: 1.7, mul: 1.17 },
  // misc
  coinMax: 10, coinSpeed: 0.0065,   // +0.65% top speed per coin
  brake: 34, coast: 5.5, reverse: 0.38,
  offroadDecel: 26,
  wallBounce: 0.3, wallLoss: 0.5,
  invuln: 1.6,
  spinT: 1.15, tumbleT: 1.65, squashT: 1.3,
  trickWindow: 0.4,
  draftTime: 1.15, draftDist: 16, draftWidth: 2.2,
};

/* What the 1-5 racer stats are worth. Every line is centred on 3, so a middle-stat racer drives
   the same whatever the spread. Per point away from 3: */
export const STATS = {
  top: 0.012,        // top speed, fraction of the class top (1.024 at 3)
  accel: 1.9,        // pull from standstill, m/s^2 before the class factor (13.9 at 3)
  accelHold: 0.045,      // how much of that pull survives near top speed (the falloff is 0.82 at 3)
  offroad: 0.03,        // off-road top speed, fraction of the surface's own factor
  recover: 0.07,        // shorter stun after a hit, fraction of the stun
  turn: 0.05,        // turn and drift rate (1.05 at 3)
  mtCharge: 0.05,    // mini-turbo charge rate (1.07 at 3; weight takes mtWeight per point)
  mtWeight: 0.03,
  mtBoost: 0.08,        // mini-turbo boost duration, fraction of the tier's duration
  mass: 0.2,        // bump mass (1.15 at 3)
};

let nextId = 1;

export class Kart {
  constructor(race, { racer, slot = 0, isPlayer = false, playerIndex = -1, ai = null } = {}) {
    this.race = race; this.id = nextId++;
    this.racer = racer; this.slot = slot; this.isPlayer = isPlayer; this.playerIndex = playerIndex; this.ai = ai;
    const st = racer.stats;
    const cls = race.cls;
    const S = STATS, d = k => st[k] - 3;
    this.baseTop = cls.top * (1.024 + S.top * d('speed'));
    this.accel = (13.9 + S.accel * d('accel')) * cls.accel;          // m/s^2 at standstill
    this.accelFall = 0.82 - S.accelHold * d('accel');                // share of the pull lost at top speed
    this.offroadMul = 1 + S.offroad * d('accel');                    // off-road top speed, times the surface's factor
    this.stunMul = 1 - S.recover * d('accel');                       // hit stun duration
    this.handling = 1.05 + S.turn * d('handling');                   // turn-rate multiplier
    this.mass = 1.15 + S.mass * d('weight');                         // for bumping
    this.mtRate = 1.07 + S.mtCharge * d('handling') - S.mtWeight * d('weight');   // mini-turbo charge multiplier
    this.mtDur = 1 + S.mtBoost * d('handling');                      // mini-turbo duration multiplier
    // the racer's special (src/content/racers.js): numbers this kart reads at the hooks marked "special" below
    const sp = this.sp = racer.special || {};
    this.mtRate *= sp.mtRate || 1; this.mass *= sp.mass || 1; this.stunMul *= sp.stun || 1;
    this.radius = TUNE.radius;
    this.hit = makeGroundHit(); this.probe = makeGroundHit();
    this.events = [];
    this.reset();
  }

  reset() {
    this.x = 0; this.y = 0; this.z = 0; this.yaw = 0;
    this.vx = 0; this.vz = 0; this.vy = 0;
    this.speed = 0; this.fwd = 0; this.lat = 0; this.steer = 0;
    this.grounded = true; this.airT = 0; this.landed = 0;
    this.pitch = 0; this.roll = 0; this.gy = 0;
    this.drifting = false; this.driftDir = 0; this.driftCharge = 0; this.driftTier = 0; this.hopping = false; this.driftArmed = false;
    this.boostT = 0; this.boostMul = 1; this.boostKind = '';
    this.coins = 0; this.item = null; this.itemUses = 0; this.rouletteT = 0; this.nextItem = null;
    this.hitT = 0; this.hitKind = ''; this.hitDur = 1; this.invulnT = 0; this.starT = 0; this.shrinkT = 0; this.ghostT = 0; this.inkT = 0; this.bulletT = 0; this.goldenT = 0;
    this.squashT = 0;
    this.trickArmT = 0; this.trick = false; this.trickSpin = 0; this.offRampT = 9; this.lastRamp = null;
    this.draftT = 0; this.drafting = false;
    this.hint = 0; this.s = 0; this.lap = 0; this.cpNext = 4; this.rank = 1; this.finished = false; this.finishTime = 0; this.finishRank = 0;
    this.lastSafeI = 0; this.safeT = 0; this.rescueT = 0; this.wrongWayT = 0; this.stuckT = 0;
    this.lapTimes = []; this.lapStart = 0; this.bestLap = Infinity;
    this.surface = SURFACES.road; this.wallT = 9; this.prevDrift = false; this.prevItem = false;
    this.startCharge = 0; this.startBurn = false; this.time = 0;
    this.streak = 0; this.absorbs = this.sp?.absorb || 0; this.sputterT = 0; this.sputterNext = this.sp?.sputter ? this.sp.sputter.every[1] : 0;
    this.stats = { hitsGiven: 0, hitsTaken: 0, drifts: 0, boosts: 0, coins: 0, items: 0, topSpeed: 0, overtakes: 0, airtime: 0 };
    this.events.length = 0;
  }

  place(x, y, z, yaw, hint = -1) {
    this.x = x; this.y = y; this.z = z; this.yaw = yaw; this.vx = this.vz = this.vy = 0; this.speed = 0;
    this.race.track.ground(x, z, hint, this.hit, y);
    this.hint = this.hit.i; this.s = this.hit.s; this.gy = this.hit.y; this.lastSafeI = this.hit.i; this.grounded = true;
  }

  emit(type, data) { this.events.push({ type, data }); }

  get top() {
    let t = this.baseTop * (1 + Math.min(this.coins, TUNE.coinMax) * TUNE.coinSpeed);
    if (this.shrinkT > 0) t *= 0.72;
    return t * (this.aiSpeedMul || 1);
  }
  get boosting() { return this.boostT > 0; }
  get invincible() { return this.starT > 0 || this.bulletT > 0; }
  get vulnerable() { return this.invulnT <= 0 && this.starT <= 0 && this.bulletT <= 0 && this.ghostT <= 0 && this.rescueT <= 0 && !this.finished; }

  boost(kind, t, mul) {
    const base = t == null ? TUNE[kind] : { t, mul };
    if (!base) return;
    const b = { t: base.t * (this.sp.boostDur || 1), mul: base.mul * (this.sp.boostMul || 1) };   // special: longer or faster boosts
    // a stronger boost replaces a weaker one; otherwise extend
    if (b.mul >= this.boostMul || this.boostT <= 0) this.boostMul = Math.max(b.mul, this.boostT > 0 ? this.boostMul : 0);
    this.boostT = Math.max(this.boostT, b.t);
    this.boostKind = kind; this.stats.boosts++;
    this.emit('boost', kind);
  }

  addCoins(n) {
    const before = this.coins;
    this.coins = clamp(this.coins + n, 0, TUNE.coinMax);
    if (n > 0) { this.stats.coins += n; this.emit('coin', this.coins - before); }
  }

  /** Apply a hit. kinds: spin | tumble | squash. Returns true if it landed. */
  hurt(kind, from = null) {
    if (!this.vulnerable || this.hitT > 0) return false;
    if (this.absorbs > 0) { this.absorbs--; this.invulnT = TUNE.invuln; this.emit('absorbed', { kind, from }); return false; }   // special: the first hit of the race is covered
    this.streak = 0;                                                                                                          // special: a hit resets a charging streak
    this.hitKind = kind;
    this.hitDur = this.hitT = (kind === 'tumble' ? TUNE.tumbleT : kind === 'squash' ? TUNE.squashT : TUNE.spinT) * this.stunMul;
    if (kind === 'tumble') { this.vy = 11; this.grounded = false; this.airT = 0.2; }
    if (kind === 'squash') this.squashT = 2.4;
    const keep = kind === 'tumble' ? 0.18 : kind === 'squash' ? 0.2 : 0.42;
    this.vx *= keep; this.vz *= keep;
    this.endDrift(false); this.boostT = 0; this.boostMul = 1; this.trick = false; this.draftT = 0;
    const lost = Math.min(this.coins, 3);
    if (lost) { this.coins -= lost; this.emit('dropCoins', lost); }
    this.stats.hitsTaken++; if (from && from !== this) from.stats.hitsGiven++;
    this.emit('hit', { kind, from });
    return true;
  }

  endDrift(release) {
    if (!this.drifting && !this.driftArmed) { this.driftCharge = 0; this.driftTier = 0; return; }
    const tier = this.driftTier;
    if (release && this.drifting && tier > 0) {
      this.boost('mini', TUNE.tierBoost[tier - 1] * this.mtDur * (tier === 2 ? this.sp.orangeDur || 1 : 1), TUNE.tierMul[tier - 1]);   // special: a longer or shorter orange boost
      this.emit('miniTurbo', tier); this.stats.drifts++;
      if (this.sp.streak) this.streak = Math.min(this.sp.streakMax, this.streak + 1);
    }
    this.drifting = false; this.driftArmed = false; this.driftCharge = 0; this.driftTier = 0; this.driftDir = 0;
  }

  /** Advance one fixed step. input: {steer,throttle,brake,drift,item,trick} */
  step(dt, input) {
    const race = this.race, tr = race.track, T = TUNE;
    this.time += dt;
    // timers
    if (this.invulnT > 0) this.invulnT -= dt;
    if (this.starT > 0) this.starT -= dt;
    if (this.shrinkT > 0) this.shrinkT -= dt;
    if (this.ghostT > 0) this.ghostT -= dt;
    if (this.inkT > 0) this.inkT -= dt;
    if (this.goldenT > 0) this.goldenT -= dt;
    if (this.squashT > 0) this.squashT -= dt;
    if (this.landed > 0) this.landed -= dt * 3.5;
    this.wallT += dt; this.offRampT += dt;

    if (this.rescueT > 0) { this._rescue(dt); return; }

    const stunned = this.hitT > 0;
    if (stunned) { this.hitT -= dt; if (this.hitT <= 0) { this.invulnT = T.invuln; this.hitKind = ''; } }
    const controllable = !stunned && !race.frozen;
    let steerIn = controllable ? clamp(input.steer || 0, -1, 1) : 0;
    let throttle = controllable ? clamp(input.throttle || 0, 0, 1) : 0;
    let brake = controllable ? clamp(input.brake || 0, 0, 1) : 0;
    const driftHeld = controllable && !!input.drift;
    const driftPressed = driftHeld && !this.prevDrift;
    this.prevDrift = !!input.drift;
    if (this.finished) { throttle = 0.5; brake = 0; }
    // special: a drivetrain that now and then loses power for a moment
    const spt = this.sp.sputter;
    if (spt && controllable && !this.finished) {
      this.sputterNext -= dt;
      if (this.sputterNext <= 0) { this.sputterNext = race.rng.range(spt.every[0], spt.every[1]); if (race.rng.chance(spt.chance)) { this.sputterT = spt.t; this.emit('sputter'); } }
    }
    if (this.sputterT > 0) { this.sputterT -= dt; throttle = 0; }
    if (this.bulletT > 0) { this._bullet(dt); return; }

    // countdown: karts are held on the grid, but revving charges a rocket start
    if (race.frozen) {
      this._startRev(dt, input);
      this._settle(dt);
      return;
    }

    // ----- steering smoothing
    const rate = Math.abs(steerIn) > Math.abs(this.steer) && sign(steerIn) === sign(this.steer || steerIn) ? T.steerRise : T.steerFall;
    this.steer = approach(this.steer, steerIn, rate * dt);

    // Order matters: turn the kart first, then resolve the (unchanged) world velocity
    // in the new kart frame. Sideways grip then decides how fast the velocity follows
    // the nose, which is what makes drifts slide.
    const airborne = this.airT > 0.07;
    const surf = this.surface;
    const boosting = this.boostT > 0;
    const offroad = surf.offroad && !boosting && this.starT <= 0;
    let top = this.top * (offroad ? Math.min(1, 1 - (1 - surf.speed * this.offroadMul) * (this.sp.offroad || 1)) : surf.offroad ? 1 : surf.speed);
    if (this.starT > 0) top *= 1.12;
    if (this.squashT > 0) top *= 0.6;
    const topBoost = top * (boosting ? this.boostMul : 1);
    const vfPrev = this.fwd, sp = Math.abs(vfPrev), spFrac = sp / Math.max(1, this.top);

    // ----- drift state machine
    if (driftPressed && !airborne && !stunned) {
      // hop; also arms a trick when leaving a ramp
      if (this.offRampT < 0.25 || (this.hit.ramp && this.hit.ramp.trick)) this.trickArmT = T.trickWindow;
      if (this.grounded) { this.vy = T.hopV; this.grounded = false; this.airT = 0; this.hopping = true; this.emit('hop'); }
      this.driftArmed = true;
    } else if (driftPressed && airborne && this.offRampT < T.trickWindow + 0.2 && !this.trick && !this.hopping) {
      this._doTrick(steerIn);
    }
    if (this.trickArmT > 0) this.trickArmT -= dt;
    if (!driftHeld) {
      if (this.drifting) this.endDrift(true); else if (this.driftArmed) this.driftArmed = false;
    }
    if (this.driftArmed && !this.drifting && !airborne && this.grounded) {
      // the drift catches once there is a direction to drift in
      if (Math.abs(steerIn) > 0.28 && spFrac > T.driftMinSpeed && vfPrev > 0) {
        this.drifting = true; this.driftDir = steerIn > 0 ? 1 : -1; this.driftCharge = 0; this.driftTier = 0;
        this.emit('driftStart', this.driftDir);
      }
    }
    if (this.drifting) {
      if (spFrac < T.driftMinSpeed * 0.88 || vfPrev <= 0 || (offroad && !boosting)) this.endDrift(false);
      else if (!airborne) {
        const rel = clamp(this.steer * this.driftDir, -1, 1);
        this.driftCharge += dt * this.mtRate * (1 + this.streak * (this.sp.streak || 0)) * (T.driftChargeBase + (rel > 0 ? Math.min(1, rel / 0.4) * T.driftChargeIn : rel * T.driftChargeOut));
        const tier = this.driftCharge >= T.tierAt[2] ? 3 : this.driftCharge >= T.tierAt[1] * (this.sp.orangeAt || 1) ? 2 : this.driftCharge >= T.tierAt[0] ? 1 : 0;
        if (tier !== this.driftTier) { this.driftTier = tier; this.emit('driftTier', tier); }
      }
    }

    // ----- turning
    let yawRate = 0;
    if (this.drifting) {
      const rel = clamp(this.steer * this.driftDir, -1, 1);
      yawRate = -this.driftDir * Math.max(0.1, T.driftBase + rel * T.driftRange) * this.handling * (airborne ? 0.35 : 1);
    } else {
      const sf = clamp(sp / 7, 0, 1);
      const hs = lerp(1, T.turnHighSpeed, smoothstep(0.45, 1.1, spFrac));
      yawRate = -this.steer * T.turnRate * this.handling * sf * hs * (vfPrev < -0.5 ? -1 : 1) * (airborne ? 0.3 : 1);
      if (offroad) yawRate *= 0.9;
    }
    if (stunned) yawRate = 0;
    this.yaw = wrapAngle(this.yaw + yawRate * dt);
    this.yawRate = yawRate;

    // ----- resolve velocity in the new kart frame
    const sy = Math.sin(this.yaw), cy = Math.cos(this.yaw);
    let vf = this.vx * sy + this.vz * cy;           // forward
    let vl = this.vx * cy - this.vz * sy;           // left

    // ----- throttle / brake
    if (!airborne) {
      if (boosting) {
        vf = approach(vf, topBoost, T.boostAccel * dt);
      } else if (throttle > 0 && !brake) {
        if (vf < top) {
          const r = clamp(vf / top, 0, 1);
          vf += this.accel * throttle * (1 - r * r * this.accelFall) * (vf < 0 ? 2.2 : 1) * dt;
          if (vf > top) vf = top;
        } else vf = approach(vf, top, (offroad ? T.offroadDecel : T.boostFade) * dt);
      } else if (brake > 0) {
        if (vf > 0.6) vf = Math.max(0, vf - T.brake * brake * dt);
        else vf = approach(vf, -top * T.reverse, this.accel * 0.8 * dt);
      } else {
        vf = approach(vf, 0, T.coast * dt);
        if (vf > top) vf = approach(vf, top, T.offroadDecel * dt);
      }
      // gentle gravity along slopes
      vf -= this.pitch * 5.2 * dt;
    }
    if (this.boostT > 0) { this.boostT -= dt; if (this.boostT <= 0) { this.boostMul = 1; this.boostKind = ''; } }

    // ----- sideways grip
    const grip = stunned ? T.gripSpin : airborne ? T.gripAir : (this.drifting ? T.gripDrift : T.grip) * surf.grip;
    vl *= Math.exp(-grip * dt);
    this.vx = sy * vf + cy * vl; this.vz = cy * vf - sy * vl;
    // never exceed the allowed speed through the vector sum
    const lim = Math.max(topBoost, 4) * 1.02, mag = Math.hypot(this.vx, this.vz);
    if (mag > lim && !airborne) { const k = approach(mag, lim, 60 * dt) / mag; this.vx *= k; this.vz *= k; }
    this.fwd = vf; this.lat = vl; this.speed = Math.hypot(this.vx, this.vz);
    if (this.speed > this.stats.topSpeed) this.stats.topSpeed = this.speed;

    // ----- move
    const px = this.x, pz = this.z;
    this.x += this.vx * dt; this.z += this.vz * dt;
    let hit = tr.ground(this.x, this.z, this.hint, this.hit, this.y);
    // Far off the road (a shortcut across open ground): another stretch of track may now be
    // the nearest one. Re-attach to it so surfaces, limits, and progress follow the kart.
    // (every step once near the outer limit, so a fast kart is not stopped by the limit of the stretch it is leaving)
    const outer = hit.side > 0 ? tr.outerL[hit.i] : tr.outerR[hit.i];
    if (hit.outside > 7 && ((this._reattachT = (this._reattachT || 0) + dt) > 0.12 || hit.outside > outer - 6)) {
      this._reattachT = 0;
      const j = tr.nearest(this.x, this.z, -1, this.y);
      const far = Math.min(Math.abs(j - hit.i), tr.N - Math.abs(j - hit.i));
      if (far > 16 && !tr.bridge[j]) {
        const dx = this.x - tr.px[j], dz = this.z - tr.pz[j], cx = this.x - tr.px[hit.i], cz = this.z - tr.pz[hit.i];
        if (dx * dx + dz * dz < cx * cx + cz * cz - 9) hit = tr.ground(this.x, this.z, j, this.hit, this.y);
      }
    }
    this._bounds(hit, dt);
    if (tr.colliderCount && this.ghostT <= 0) tr.eachCollider(this.x, this.z, c => {
      const dx = this.x - c.x, dz = this.z - c.z, rr = c.r + this.radius * 0.8, d2 = dx * dx + dz * dz;
      if (d2 >= rr * rr || d2 < 1e-6) return;
      const d = Math.sqrt(d2), nx = dx / d, nz = dz / d;
      this.x = c.x + nx * rr; this.z = c.z + nz * rr;
      const vn = this.vx * nx + this.vz * nz;
      if (vn < 0) { this.vx -= nx * vn * 1.35; this.vz -= nz * vn * 1.35; this.vx *= 0.72; this.vz *= 0.72; if (vn < -3 && this.wallT > 0.25) { this.emit('wall', { v: -vn, side: 0, hard: vn < -10 }); this.wallT = 0; this.endDrift(false); } }
    });
    this.hint = hit.i;

    // ----- vertical
    const g = T.gravity * tr.gravity;
    const gy = hit.y;
    if (this.grounded) {
      const vyGround = (gy - this.y) / dt;
      if (vyGround < this.vy - g * dt - 0.6) { // ground falls away: we are airborne
        this.grounded = false; this.airT = 0;
        this.y += this.vy * dt; this.vy -= g * dt;
        if (hit.ramp || this.lastRamp) { this.offRampT = 0; if (this.trickArmT > 0 || (this.autoTrick && (this.lastRamp || hit.ramp)?.trick)) this._doTrick(this.steer); }
      } else { this.y = gy; this.vy = clamp(lerp(this.vy, vyGround, 0.55), -40, 40); }
    } else {
      this.vy -= g * dt; this.y += this.vy * dt; this.airT += dt; this.stats.airtime += dt;
      if (this.y <= gy) {
        const impact = -this.vy;
        // carry on at the ground's own vertical speed, so a downhill landing does not bounce us straight back into the air
        this.y = gy; this.grounded = true; this.vy = clamp((gy - this.gy) / dt, -40, 8);
        if (this.airT > 0.12 || impact > 6) { this.landed = clamp(impact / 16, 0.2, 1); this.emit('land', impact); }
        if (this.trick) { this.trick = false; this.boost('trick'); this.emit('trickLand'); }
        this.hopping = false; this.airT = 0;
      }
    }
    this.lastRamp = hit.ramp;
    this.gy = gy;
    // a draining lake (opt-in, track.def.lake): deep water is a rescue, the track decides the surface of shallows and bed
    const lake = tr.def.lake;
    if (lake && this.race.lakeY != null && !hit.onRoad && lake.inside(this.x, this.z)) {
      const depth = this.race.lakeY - hit.y;
      if (depth > 0.5 && this.grounded && this.bulletT <= 0) this.startRescue();
      hit.surface = lake.surface(depth, this.race) || hit.surface;
    }
    this.surface = this.grounded || this.airT < 0.1 ? hit.surface : this.surface;
    if (this.grounded && hit.boost) { if (this.boostKind !== 'pad' || this.boostT < T.pad.t - 0.2) { this.boost('pad'); } }
    if (this.trick) this.trickSpin += dt;

    // ----- orientation from the ground under the wheels
    this._tilt(dt, tr);

    // ----- progress, laps, safety
    this._progress(hit, dt, px, pz);
    this._drafting(dt);
  }

  _doTrick(steer) {
    if (this.trick) return;
    this.trick = true; this.trickSpin = 0; this.trickDir = Math.abs(steer) > 0.3 ? sign(steer) : 0; this.trickArmT = 0;
    this.emit('trick');
  }

  /** Walls and outer boundaries. */
  _bounds(hit, dt) {
    const r = this.radius;
    let limL = Infinity, limR = Infinity; // max lateral to the left / right
    const tr = this.race.track, i = hit.i;
    if (hit.edgeL === EDGE.WALL) limL = hit.hwL - r; else if (hit.edgeL === EDGE.OPEN) limL = hit.hwL + tr.outerL[i] - r * 0.6;
    if (hit.edgeR === EDGE.WALL) limR = hit.hwR - r; else if (hit.edgeR === EDGE.OPEN) limR = hit.hwR + tr.outerR[i] - r * 0.6;
    let over = 0, side = 0;
    if (hit.lat > limL) { over = hit.lat - limL; side = 1; } else if (-hit.lat > limR) { over = -hit.lat - limR; side = -1; }
    if (!side) return;
    // only collide when at wall height (not when flying over it)
    const wall = side > 0 ? hit.edgeL : hit.edgeR;
    if (wall === EDGE.WALL && this.y > hit.planeY + 1.6) return;
    const nx = hit.nx * side, nz = hit.nz * side; // outward normal
    this.x -= nx * over; this.z -= nz * over;
    const vOut = this.vx * nx + this.vz * nz;
    if (vOut > 0) {
      const sp = Math.hypot(this.vx, this.vz) || 1, frac = clamp(vOut / sp, 0, 1);
      this.vx -= nx * vOut * (1 + TUNE.wallBounce); this.vz -= nz * vOut * (1 + TUNE.wallBounce);
      const keep = 1 - frac * TUNE.wallLoss;
      this.vx *= keep; this.vz *= keep;
      if (vOut > 3.5) {
        if (this.wallT > 0.25) this.emit('wall', { v: vOut, side, hard: frac > 0.45 });
        this.wallT = 0;
        if (frac > 0.5) this.endDrift(false);
        // nudge the nose back along the wall so players are not stuck facing it
        const tyaw = Math.atan2(hit.tx, hit.tz);
        this.yaw = wrapAngle(this.yaw + wrapAngle(tyaw - this.yaw) * clamp(frac, 0, 1) * 0.35);
      }
    }
    this.race.track.ground(this.x, this.z, hit.i, hit, this.y);
  }

  _tilt(dt, tr) {
    const p = this.probe, sy = Math.sin(this.yaw), cy = Math.cos(this.yaw);
    if (this.grounded) {
      const L = 1.1, W = 0.75;
      const f = tr.ground(this.x + sy * L, this.z + cy * L, this.hint, p, this.y).y;
      const b = tr.ground(this.x - sy * L, this.z - cy * L, this.hint, p, this.y).y;
      const l = tr.ground(this.x + cy * W, this.z - sy * W, this.hint, p, this.y).y;
      const r = tr.ground(this.x - cy * W, this.z + sy * W, this.hint, p, this.y).y;
      const pitch = clamp(Math.atan2(f - b, 2 * L), -0.6, 0.6), roll = clamp(Math.atan2(l - r, 2 * W), -0.5, 0.5);
      this.pitch = damp(this.pitch, pitch, 16, dt); this.roll = damp(this.roll, roll, 14, dt);
    } else {
      const want = clamp(Math.atan2(this.vy, Math.max(6, this.speed)) * 0.55, -0.5, 0.5);
      this.pitch = damp(this.pitch, want, 4, dt); this.roll = damp(this.roll, 0, 3, dt);
    }
  }

  _progress(hit, dt, px, pz) {
    const tr = this.race.track, L = tr.length;
    const prevS = this.s; this.s = hit.s;
    if (this.finished) return;
    const sector = Math.min(3, Math.floor((this.s / L) * 4));
    if (sector === this.cpNext && this.cpNext < 4) this.cpNext++;
    if (prevS > L * 0.85 && this.s < L * 0.15) {
      if (this.cpNext >= 4) {
        this.lap++; this.cpNext = 1;
        if (this.lap > 1) { const t = this.race.time - this.lapStart; this.lapTimes.push(t); if (t < this.bestLap) this.bestLap = t; }
        this.lapStart = this.race.time;
        this.emit('lap', this.lap);
      }
    }
    // wrong way / stuck detection
    const along = this.vx * hit.tx + this.vz * hit.tz;
    const facing = Math.sin(this.yaw) * hit.tx + Math.cos(this.yaw) * hit.tz;
    if (facing < -0.35 && along < -2) this.wrongWayT += dt; else this.wrongWayT = Math.max(0, this.wrongWayT - dt * 3);
    // remember a safe place to be rescued to
    if (this.grounded && hit.onRoad && hit.surface !== SURFACES.void && !tr.gap[hit.i]) { this.safeT += dt; if (this.safeT > 0.5) { this.lastSafeI = hit.i; } }
    else this.safeT = 0;
    // fell off the world, or into deep water
    if (this.bulletT > 0) return;                        // the bailout rocket flies over gaps
    const ref = tr.py[hit.i];
    const inLake = tr.def.lake && !hit.onRoad && tr.def.lake.inside(this.x, this.z);   // a drained lake bed may lie far below the road
    if ((this.y < ref - 9 && !inLake) || (tr.water != null && this.y < tr.water - 0.9 && this.grounded) || (this.grounded && hit.surface === SURFACES.void)) this.startRescue();
  }

  startRescue() {
    if (this.rescueT > 0) return;
    this.rescueT = 2.1; this.endDrift(false); this.boostT = 0; this.boostMul = 1; this.trick = false; this.hitT = 0;
    const lost = Math.min(this.coins, 2); if (lost) this.coins -= lost;
    this.emit('rescue');
  }
  _rescue(dt) {
    const tr = this.race.track;
    this.rescueT -= dt;
    // back up a little from the last safe sample so we do not respawn on a ramp lip
    const i = tr.respawn[(this.lastSafeI - 6 + tr.N) % tr.N];
    const t = clamp(1 - (this.rescueT - 0.5) / 1.6, 0, 1);
    const tx = tr.px[i], tz = tr.pz[i], ty = tr.py[i];
    if (this.rescueT > 1.5) { // lift out where we fell
      this.y += 9 * dt; this.vx *= 0.9; this.vz *= 0.9; this.x += this.vx * dt; this.z += this.vz * dt;
    } else {
      const k = 1 - Math.exp(-7 * dt);
      this.x += (tx - this.x) * k; this.z += (tz - this.z) * k;
      const hover = ty + 2.6 * clamp(this.rescueT / 0.9, 0, 1) + 0.02;
      this.y += (hover - this.y) * k * 1.4;
      this.yaw = wrapAngle(this.yaw + wrapAngle(tr.yaw[i] - this.yaw) * k);
      this.vx = this.vz = this.vy = 0; this.speed = 0; this.pitch = damp(this.pitch, 0, 6, dt); this.roll = damp(this.roll, 0, 6, dt);
    }
    void t;
    if (this.rescueT <= 0) {
      this.rescueT = 0; this.hint = i; this.race.track.ground(this.x, this.z, i, this.hit, this.y);
      this.s = this.hit.s; this.grounded = false; this.airT = 0; this.vy = 0; this.invulnT = 1.5; this.surface = SURFACES.road;
      this.emit('rescued');
    }
  }

  /** Slipstream: follow close behind another kart to charge a draft boost. */
  _drafting(dt) {
    const T = TUNE; let behind = false;
    if (this.grounded && this.speed > this.top * 0.75 && this.hitT <= 0) {
      const sy = Math.sin(this.yaw), cy = Math.cos(this.yaw);
      for (const o of this.race.karts) {
        if (o === this || o.rescueT > 0 || o.speed < 8) continue;
        const dx = o.x - this.x, dz = o.z - this.z;
        const f = dx * sy + dz * cy; if (f < 2.5 || f > T.draftDist) continue;
        const l = dx * cy - dz * sy; if (Math.abs(l) > T.draftWidth) continue;
        if (Math.abs(o.y - this.y) > 2) continue;
        behind = true; break;
      }
    }
    this.drafting = behind;
    if (behind) { this.draftT += dt; if (this.draftT >= T.draftTime) { this.draftT = 0; this.boost('draft'); this.emit('draft'); } }
    else this.draftT = Math.max(0, this.draftT - dt * 1.5);
  }

  /** During the countdown: hold accelerate at the right moment for a rocket start. */
  _startRev(dt, input) {
    const c = this.race.countdown; // seconds until GO (positive during the countdown)
    if (input.throttle > 0.5) {
      if (this.startCharge === 0) this.startPressAt = c;
      this.startCharge += dt;
    } else { this.startCharge = 0; this.startPressAt = null; }
    this.revving = input.throttle > 0.5;
  }
  /** Called by the race at GO. */
  launch() {
    const at = this.startPressAt;
    if (at != null && this.startCharge > 0) {
      // pressed after the "2" lights (about 2.0s to go) and held: rocket. Too early: stall.
      const sp = this.sp;   // special: a wider window and a longer launch, with a worse stall past it
      if (at <= (sp.startWindow || 2.05) && at >= 0.05) {
        const quality = at <= 1.25 ? 1 : 0.7;
        this.boost('start', TUNE.start.t * quality * (sp.startBoost || 1), TUNE.start.mul);
        this.vx = Math.sin(this.yaw) * 9; this.vz = Math.cos(this.yaw) * 9;
        this.emit('rocketStart', quality);
      } else if (at > (sp.burnoutAt || 2.6)) { this.hitKind = 'burnout'; this.hitDur = this.hitT = sp.burnoutT || 0.9; this.emit('burnout'); }
    }
    this.startCharge = 0; this.startPressAt = null; this.revving = false;
  }

  _settle(dt) {
    const tr = this.race.track;
    tr.ground(this.x, this.z, this.hint, this.hit, this.y);
    this.y = this.hit.y; this.gy = this.y; this.grounded = true; this.vy = 0;
    this._tilt(dt, tr);
  }

  /** Auto-pilot rocket (bailout item): follows the racing line at high speed. */
  _bullet(dt) {
    const tr = this.race.track;
    this.bulletT -= dt;
    const sp = this.top * 1.55;
    const s = this.s + sp * dt;
    const P = this._bp || (this._bp = { x: 0, y: 0, z: 0 });
    const i = Math.floor(((s % tr.length) + tr.length) % tr.length / tr.ds) % tr.N;
    tr.pointAt(s, tr.lineLat[i] * 0.5, P);
    const k = 1 - Math.exp(-10 * dt);
    this.x += (P.x - this.x) * k + Math.sin(tr.yaw[i]) * 0; this.z += (P.z - this.z) * k;
    this.y += (P.y + 0.5 - this.y) * k;
    this.yaw = wrapAngle(this.yaw + wrapAngle(tr.yaw[i] - this.yaw) * k);
    this.vx = Math.sin(this.yaw) * sp; this.vz = Math.cos(this.yaw) * sp; this.speed = sp; this.fwd = sp; this.vy = 0;
    const px = this.x, pz = this.z;
    const hit = tr.ground(this.x, this.z, i, this.hit, this.y);
    this.hint = hit.i; this.grounded = true; this.gy = hit.y; this.surface = SURFACES.road;
    this.pitch = damp(this.pitch, Math.atan2(tr.ty[i], 1), 8, dt); this.roll = damp(this.roll, 0, 8, dt);
    // advance s directly so progress is monotonic even off the centre line
    const prev = this.s; this.hit.s = ((s % tr.length) + tr.length) % tr.length;
    this.s = prev; this._progress(this.hit, dt, px, pz);
    if (this.bulletT <= 0) { this.bulletT = 0; this.invulnT = 0.8; this.boost('mushroom', 0.6, 1.25); this.emit('bulletEnd'); }
  }
}
