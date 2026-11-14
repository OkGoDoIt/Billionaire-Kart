/* Items: boxes, coins, the position-weighted roll, and every item's behaviour.
   Simulation only; the renderer mirrors `boxes`, `coins`, `hazards`, and `shots`
   and listens to race events for effects. */
import { clamp, lerp, wrapAngle, mod, loopDelta } from '../core/util.js';
import { EDGE, makeGroundHit } from '../track/track.js';
import { TUNE } from './kart.js';

/* name: what it is called. desc: what it does, with attitude (shown beside the item slot and on the Items screen).
   use: shouted across your screen when you use it. hit: shouted across the screen of whoever it lands on. */
export const ITEMS = {
  boost:     { id: 'boost',     name: 'Series A',           img: 'boost',     use: 'FUNDED!', desc: 'Somebody else’s money. Burn it for a burst of speed.' },
  boost3:    { id: 'boost3',    name: 'Triple Round',       img: 'boost',     uses: 3, base: 'boost', use: 'FUNDED!', desc: 'Three rounds of somebody else’s money. Burn rate is a lifestyle.' },
  golden:    { id: 'golden',    name: 'Series F',           img: 'golden',    use: 'UNLIMITED RUNWAY!', desc: 'Unlimited boosts for a few seconds. Keep tapping. There is no plan.' },
  leak:      { id: 'leak',      name: 'Data Leak',          img: 'banana',    shield: true, hit: 'YOUR DATA LEAKED!', desc: 'Oops. Drop it behind you and whoever drives through it spins out. Blame an intern.' },
  subpoena:  { id: 'subpoena',  name: 'Subpoena',           img: 'green',     shield: true, hit: 'YOU’VE BEEN SERVED!', desc: 'Fires straight ahead and bounces off walls until it serves somebody.' },
  subpoena3: { id: 'subpoena3', name: 'Class Action',       img: 'green',     uses: 3, base: 'subpoena', shield: true, hit: 'YOU’VE BEEN SERVED!', desc: 'Three subpoenas circle your kart. Fire them one at a time. Settle for nothing.' },
  tweet:     { id: 'tweet',     name: 'Viral Tweet',        img: 'red',       shield: true, hit: 'RATIOED!', desc: 'Homes in on the racer ahead of you and ratios them.' },
  antitrust: { id: 'antitrust', name: 'Antitrust Suit',     img: 'blue',      hit: 'BROKEN UP!', use: 'SEE YOU IN COURT!', desc: 'Flies to first place, circles its victim twice, then breaks them up. Regulators hate a winner.' },
  star:      { id: 'star',      name: 'Hype Cycle',         img: 'star',      hit: 'RUN OVER BY THE HYPE!', use: 'PEAK HYPE!', desc: 'Invincible and faster for a few seconds. Bump rivals to spin them out. Do not ask about revenue.' },
  crash:     { id: 'crash',     name: 'Market Crash',       img: 'lightning', hit: 'MARKET CRASH! −40%', use: 'SOLD THE TOP!', desc: 'Shrinks and slows every rival and shakes loose their items. You sold yesterday.' },
  pr:        { id: 'pr',        name: 'PR Blitz',           img: 'horn',      hit: 'SPUN!', use: 'WE TAKE THIS VERY SERIOUSLY!', desc: 'A shockwave of spin. Nearby rivals spin out and incoming items vanish.' },
  pinkslip:  { id: 'pinkslip',  name: 'Pink Slip',          img: 'bomb',      shield: true, hit: 'LAID OFF!', desc: 'Lob it ahead. It blows up on contact or after a short fuse. We’re a family.' },
  smear:     { id: 'smear',     name: 'Smear Campaign',     img: 'blooper',   hit: 'SMEARED!', use: 'SOURCES SAY!', desc: 'Splatters ink on the screens of everyone ahead of you. Sources say.' },
  insider:   { id: 'insider',   name: 'Insider Trading',    img: 'boo',       hit: 'ROBBED! (LEGALLY)', use: 'NOTHING TO SEE HERE!', desc: 'Turn untouchable and steal a rival’s item. Perfectly legal if you are in Congress.' },
  bailout:   { id: 'bailout',   name: 'Government Bailout', img: 'bailout',   hit: 'FLATTENED BY A BAILOUT!', use: 'TOO BIG TO FAIL!', desc: 'Autopilot at ludicrous speed, flattening anyone in the way. Too big to fail.' },
  dividend:  { id: 'dividend',  name: 'Dividend',           img: 'coin',      use: 'PASSIVE INCOME!', desc: 'Two coins, for doing nothing. A little more top speed.' },
};
/* Shouts for hits that are not an item landing. */
export const HIT_LINES = { squash: 'SQUASHED!', star: ITEMS.star.hit, bailout: ITEMS.bailout.hit };

/* Weights by running position for an 8-kart field. Leaders get defence; the back gets the comeback kit. */
const TABLE = [
  /* 1 */ { leak: 30, subpoena: 20, dividend: 20, pr: 12, pinkslip: 8, boost: 10 },
  /* 2 */ { leak: 18, subpoena: 20, tweet: 20, boost: 14, dividend: 10, pr: 8, pinkslip: 6, subpoena3: 4 },
  /* 3 */ { tweet: 22, boost: 18, subpoena: 12, subpoena3: 8, leak: 8, boost3: 8, pinkslip: 6, pr: 5, smear: 5, star: 4, insider: 4 },
  /* 4 */ { tweet: 18, boost3: 14, boost: 12, subpoena3: 8, star: 9, insider: 8, smear: 7, pinkslip: 5, golden: 5, antitrust: 5, crash: 3, subpoena: 6 },
  /* 5 */ { boost3: 18, tweet: 14, star: 13, golden: 9, insider: 8, antitrust: 8, crash: 6, smear: 7, boost: 8, subpoena3: 5, pinkslip: 4 },
  /* 6 */ { boost3: 18, star: 17, golden: 13, antitrust: 10, crash: 9, insider: 8, tweet: 10, bailout: 8, smear: 5, pinkslip: 2 },
  /* 7 */ { star: 21, golden: 17, boost3: 16, bailout: 15, crash: 12, antitrust: 10, insider: 5, tweet: 4 },
  /* 8 */ { bailout: 24, star: 22, golden: 18, crash: 15, boost3: 11, antitrust: 10 },
];

const SHOT_R = 0.75;
/* The Antitrust Suit's strike telegraph (MK8's Spiny Shell): once it arrives it
   ORBITS its victim twice over BLUE_HOVER_T seconds before slamming down, so
   first place always gets a fair, unmissable warning. */
const BLUE_HOVER_T = 1.4;      // hover seconds; the orbit rate below is two full circles in this window
const BLUE_ORBIT_R = 3.1;      // metres from the victim's centre — close enough to loom in their chase view
const BLUE_HOVER_H = 4.8;      // metres above the victim while circling
let uid = 1;

export class ItemSystem {
  constructor(race, { items = true, coins = true } = {}) {
    this.race = race; this.enabled = items;
    const tr = race.track, P = { x: 0, y: 0, z: 0 };
    this.boxes = [];
    if (items) for (const row of tr.itemRows) for (const lat of row.lats) {
      tr.pointAt(row.s, lat, P, 1.15);
      this.boxes.push({ id: uid++, x: P.x, y: P.y, z: P.z, active: true, t: 0, s: row.s });
    }
    this.coins = [];
    if (coins) for (const c of tr.coinSpots) {
      tr.pointAt(c.s, c.lat, P, 0.9 + (c.air || 0));
      this.coins.push({ id: uid++, x: P.x, y: P.y, z: P.z, active: true, t: 0 });
    }
    this.hazards = race.hazards;   // static things on the track: leaks, armed pink slips
    this.shots = [];               // moving things: subpoenas, tweets, the antitrust suit, thrown pink slips
    this.blueCooldown = 22; this.crashCooldown = 28;
    this.hit = makeGroundHit();
  }

  /* ---------- rolling ---------- */
  roll(kart) {
    const race = this.race, n = race.karts.length;
    // map rank onto the 8-row table, then adjust by the gap to the leader
    let row = n <= 1 ? 3 : Math.round(((kart.rank - 1) / (n - 1)) * 7);
    const leader = race.order[0];
    const gap = leader && leader !== kart ? leader.raceDistance - kart.raceDistance : 0;
    if (kart.rank > 1 && gap < 28) row = Math.min(row, 2);          // tight pack: no nukes
    else if (gap > 260) row = Math.min(7, row + 1);
    if (race.time < 12) row = Math.min(row, 3);                      // calm opening
    const w = { ...TABLE[clamp(row, 0, 7)] };
    if (this.blueCooldown > 0 || this.shots.some(s => s.type === 'antitrust')) delete w.antitrust;
    if (this.crashCooldown > 0) delete w.crash;
    if (race.time < 20) { delete w.crash; delete w.antitrust; delete w.bailout; }
    if (kart.coins >= TUNE.coinMax) delete w.dividend;
    let sum = 0; for (const k in w) sum += w[k];
    let r = race.rng() * sum;
    for (const k in w) { r -= w[k]; if (r <= 0) return k; }
    return 'boost';
  }

  give(kart, id) {
    kart.item = id; kart.itemUses = ITEMS[id].uses || 1; kart.nextItem = null; kart.rouletteT = 0;
    if (id === 'antitrust') this.blueCooldown = 30;
    if (id === 'crash') this.crashCooldown = 34;
    kart.emit('itemReady', id);
  }

  /* ---------- per-step ---------- */
  step(dt) {
    const race = this.race, karts = race.karts;
    if (this.blueCooldown > 0) this.blueCooldown -= dt;
    if (this.crashCooldown > 0) this.crashCooldown -= dt;

    for (const b of this.boxes) {
      if (!b.active) { b.t -= dt; if (b.t <= 0) { b.active = true; race.emit('boxBack', b); } continue; }
      for (const k of karts) {
        if (k.rescueT > 0 || k.finished) continue;
        const dx = k.x - b.x, dz = k.z - b.z;
        if (dx * dx + dz * dz < 2.9 && Math.abs(k.y + 0.6 - b.y) < 2.2) {
          b.active = false; b.t = 1.6; race.emit('boxBreak', { box: b, kart: k });
          if (!k.item && k.rouletteT <= 0 && k.goldenT <= 0) { k.rouletteT = 1.25; k.emit('roulette'); }
          break;
        }
      }
    }
    for (const k of karts) {
      if (k.rouletteT > 0) {
        k.rouletteT -= dt;
        if (k.rouletteT <= 0) { k.rouletteT = 0; if (!k.item) this.give(k, this.roll(k)); }
      }
      if (k.item === 'golden' && k.goldenActive && k.goldenT <= 0) { k.item = null; k.goldenActive = false; k.emit('itemGone'); }
    }
    for (const c of this.coins) {
      if (!c.active) { c.t -= dt; if (c.t <= 0) c.active = true; continue; }
      for (const k of karts) {
        if (k.rescueT > 0) continue;
        const dx = k.x - c.x, dz = k.z - c.z, dy = k.y + 0.7 - c.y;
        if (dx * dx + dz * dz < 2.6 && Math.abs(dy) < 1.9) { c.active = false; c.t = 7; k.addCoins(1); race.emit('coinTaken', { coin: c, kart: k }); break; }
      }
    }
    this._hazards(dt);
    this._shots(dt);
  }

  /* ---------- using ---------- */
  use(kart, input = {}) {
    const race = this.race;
    if (kart.hitT > 0 || kart.rescueT > 0 || kart.bulletT > 0 || kart.finished) return false;
    // tapping during the roulette stops it early
    if (!kart.item && kart.rouletteT > 0.15) { kart.rouletteT = 0.15; return false; }
    const id = kart.item; if (!id) return false;
    const def = ITEMS[id], base = def.base || id;
    const back = !!input.itemBack || (input.brake > 0.5 && !(input.throttle > 0.5));
    let consume = true;
    switch (base) {
      case 'boost': kart.boost('mushroom'); break;
      case 'golden':
        if (!kart.goldenActive) { kart.goldenActive = true; kart.goldenT = 5.5 * (kart.sp.golden || 1); }
        kart.boost('mushroom', 1.0, TUNE.mushroom.mul); consume = false; break;
      case 'leak': this._drop(kart, 'leak', back ? -1 : -1); break;
      case 'subpoena': this._fire(kart, 'subpoena', back); break;
      case 'tweet': this._fire(kart, 'tweet', back); break;
      case 'antitrust': this._fire(kart, 'antitrust', false); break;
      case 'pinkslip': if (back) this._drop(kart, 'pinkslip'); else this._throwBomb(kart); break;
      case 'star': kart.starT = 7.5; kart.hitT = 0; kart.shrinkT = 0; kart.squashT = 0; kart.inkT = 0; break;
      case 'crash': this._crash(kart); break;
      case 'pr': this._shock(kart); break;
      case 'smear': this._smear(kart); break;
      case 'insider': this._insider(kart); break;
      case 'bailout': kart.bulletT = [3.2, 3.2, 3.4, 3.8, 4.4, 5, 5.6, 6.2][clamp(Math.round(((kart.rank - 1) / Math.max(1, race.karts.length - 1)) * 7), 0, 7)] * (kart.sp.bailout || 1); kart.endDrift(false); kart.hitT = 0; kart.shrinkT = 0; break;
      case 'dividend': kart.addCoins(2); break;
    }
    kart.stats.items++;
    kart.emit('itemUse', id);
    race.emit('itemUse', { kart, id: base });
    if (consume) { kart.itemUses--; if (kart.itemUses <= 0) { kart.item = null; kart.emit('itemGone'); } }
    return true;
  }

  _drop(kart, type) {
    const sy = Math.sin(kart.yaw), cy = Math.cos(kart.yaw), tr = this.race.track;
    const x = kart.x - sy * 2.3, z = kart.z - cy * 2.3;
    const g = tr.ground(x, z, kart.hint, this.hit, kart.y);
    const h = { id: uid++, type, x, y: g.y, z, radius: type === 'pinkslip' ? 1.3 : 1.15, owner: kart, age: 0, life: type === 'pinkslip' ? 2.6 : 75, hint: g.i };
    this.hazards.push(h); this.race.emit('hazardSpawn', h);
    return h;
  }

  _fire(kart, type, back) {
    const dir = back ? -1 : 1, sy = Math.sin(kart.yaw) * dir, cy = Math.cos(kart.yaw) * dir;
    const speed = type === 'antitrust' ? kart.race.cls.top * 2.3 : type === 'tweet' ? Math.max(kart.race.cls.top * 1.5, kart.speed + 10) : Math.max(kart.race.cls.top * 1.65, kart.speed + 14);
    const s = {
      id: uid++, type, owner: kart, age: 0, life: type === 'antitrust' ? 40 : type === 'tweet' ? 14 : 11,
      x: kart.x + sy * 2.2, y: kart.y + 0.6, z: kart.z + cy * 2.2, vx: sy * speed, vz: cy * speed, speed,
      yaw: Math.atan2(sy, cy), hint: kart.hint, bounces: 0, target: null, phase: 'fly', t: 0, s: kart.s, lat: kart.hit.lat,
    };
    if (type === 'tweet' && !back) { s.target = this._aheadOf(kart); if (s.target?.sp.dodgeTweet && this.race.rng.chance(s.target.sp.dodgeTweet)) s.target = null; }   // special: it loses the thread
    if (type === 'antitrust') { s.target = this.race.order[0] === kart ? null : this.race.order[0]; s.y = kart.y + 3; s.s = kart.s; s.lat = 0; }
    this.shots.push(s); this.race.emit('shotSpawn', s);
    return s;
  }

  _throwBomb(kart) {
    const sy = Math.sin(kart.yaw), cy = Math.cos(kart.yaw), sp = kart.speed + 17;
    const s = { id: uid++, type: 'pinkslip', owner: kart, age: 0, life: 6, x: kart.x + sy * 1.5, y: kart.y + 1.3, z: kart.z + cy * 1.5, vx: sy * sp, vz: cy * sp, vy: 10.5, yaw: kart.yaw, hint: kart.hint, phase: 'arc', t: 0 };
    this.shots.push(s); this.race.emit('shotSpawn', s);
  }

  _aheadOf(kart) { const o = this.race.order, i = o.indexOf(kart); return i > 0 ? o[i - 1] : null; }

  _crash(user) {
    const race = this.race, n = race.karts.length;
    race.emit('lightning', { by: user });
    for (const k of race.karts) {
      if (k === user || k.finished || k.rescueT > 0) continue;
      if (k.invincible || k.ghostT > 0) { k.emit('dodged', 'crash'); continue; }
      const front = 1 - (k.rank - 1) / Math.max(1, n - 1);
      k.shrinkT = lerp(3.4, 6.5, front) * (k.sp.shrinkTake || 1);
      k.hitKind = 'zap'; k.hitDur = k.hitT = 0.55; k.endDrift(false); k.boostT = 0; k.boostMul = 1;
      k.vx *= 0.6; k.vz *= 0.6;
      if (k.item) { k.item = null; k.itemUses = 0; k.goldenActive = false; k.goldenT = 0; k.emit('itemGone'); }
      k.rouletteT = 0; k.stats.hitsTaken++; user.stats.hitsGiven++;
      k.emit('hit', { kind: 'zap', from: user });
    }
  }

  _shock(user) {
    const race = this.race, R = 9.5;
    race.emit('shock', { x: user.x, y: user.y, z: user.z, r: R, by: user });
    user.shockT = 0.5;
    for (const k of race.karts) {
      if (k === user) continue;
      const d = Math.hypot(k.x - user.x, k.z - user.z);
      if (d < R * 0.85 && Math.abs(k.y - user.y) < 4 && k.hurt('spin', user)) race.emit('kartHit', { by: user, victim: k, with: 'pr' });
    }
    this._clearAround(user.x, user.z, R, user);
  }
  _clearAround(x, z, R, user) {
    for (const s of this.shots) if (Math.hypot(s.x - x, s.z - z) < R + (s.type === 'antitrust' ? 6 : 0)) { s.dead = true; this.race.emit('shotBlocked', { shot: s, by: user }); }
    for (const h of this.hazards) if (Math.hypot(h.x - x, h.z - z) < R) h.dead = true;
  }

  _smear(user) {
    const race = this.race;
    race.emit('ink', { by: user });
    for (const k of race.karts) {
      if (k === user || k.rank >= user.rank || k.finished) continue;
      if (k.invincible || k.ghostT > 0) continue;
      k.inkT = 4.8 * (user.sp.inkGive || 1) * (k.sp.inkTake || 1); k.emit('inked', user);
    }
  }

  _insider(user) {
    const race = this.race;
    user.ghostT = 4.2;
    // steal the best item from someone ahead; failing that, from anyone
    const pool = race.karts.filter(k => k !== user && k.item && !k.finished && k.bulletT <= 0 && !k.goldenActive);
    const ahead = pool.filter(k => k.rank < user.rank);
    const from = (ahead.length ? ahead : pool)[Math.floor(race.rng() * (ahead.length ? ahead.length : pool.length))];
    if (from) {
      const id = from.item, uses = from.itemUses;
      from.item = null; from.itemUses = 0; from.emit('robbed', user); from.emit('itemGone');
      user._steal = { id, uses, t: 0.9 };
      race.emit('steal', { by: user, from, id });
    } else user._steal = { id: 'boost', uses: 1, t: 0.9 };
  }

  /* ---------- hazards on the ground ---------- */
  _hazards(dt) {
    const race = this.race, list = this.hazards;
    for (const k of race.karts) {
      if (k._steal) { k._steal.t -= dt; if (k._steal.t <= 0) { if (!k.item) { k.item = k._steal.id; k.itemUses = k._steal.uses; k.emit('itemReady', k.item); } k._steal = null; } }
      if (k.shockT > 0) { k.shockT -= dt; this._clearAround(k.x, k.z, 9.5, k); }
    }
    for (let i = list.length - 1; i >= 0; i--) {
      const h = list[i];
      h.age += dt;
      if (h.type === 'pinkslip' && h.age >= h.life) { this._explode(h.x, h.y, h.z, h.owner); h.dead = true; }
      if (!h.dead && h.age > h.life) h.dead = true;
      if (!h.dead) for (const k of race.karts) {
        if (k.rescueT > 0 || k.ghostT > 0) continue;
        if (h.owner === k && h.age < 0.6) continue;
        const dx = k.x - h.x, dz = k.z - h.z, rr = h.radius + k.radius * 0.8;
        if (dx * dx + dz * dz > rr * rr || Math.abs(k.y - h.y) > 1.6) continue;
        if (h.type === 'pinkslip') { this._explode(h.x, h.y, h.z, h.owner); h.dead = true; break; }
        if (k.invincible) { h.dead = true; break; }
        if (k.hurt('spin', h.owner)) race.emit('kartHit', { by: h.owner, victim: k, with: h.type });
        h.dead = true; break;
      }
      if (h.dead) { list.splice(i, 1); race.emit('hazardGone', h); }
    }
  }

  _explode(x, y, z, owner, withItem = 'pinkslip') {
    const race = this.race, R = 7;
    race.emit('explosion', { x, y, z, r: R, by: owner });
    for (const k of race.karts) {
      if (k.rescueT > 0 || k.ghostT > 0 || k.invincible) continue;
      const d = Math.hypot(k.x - x, k.z - z);
      if (d < R && Math.abs(k.y - y) < 5 && k.hurt(d < R * 0.6 ? 'tumble' : 'spin', owner)) race.emit('kartHit', { by: owner, victim: k, with: withItem });
    }
    for (const h of this.hazards) if (Math.hypot(h.x - x, h.z - z) < R * 0.8) h.dead = true;
  }

  /** True if the kart's held item can block a hit coming from (fx,fz). Consumes one use. */
  _shield(k, fx, fz) {
    if (!k.item || !ITEMS[k.item].shield) return false;
    const sy = Math.sin(k.yaw), cy = Math.cos(k.yaw);
    const fromFront = (fx - k.x) * sy + (fz - k.z) * cy;
    if (fromFront > 0.4 && !ITEMS[k.item].uses) return false; // single items trail behind: they only cover the rear
    k.itemUses--; k.emit('shieldBlock', k.item);
    if (k.itemUses <= 0) { k.item = null; k.emit('itemGone'); }
    return true;
  }

  /* ---------- projectiles ---------- */
  _shots(dt) {
    const race = this.race, tr = race.track, list = this.shots, hit = this.hit;
    for (let i = list.length - 1; i >= 0; i--) {
      const s = list[i];
      s.age += dt;
      if (s.age > s.life) s.dead = true;
      if (!s.dead) {
        if (s.type === 'antitrust') this._blue(s, dt);
        else if (s.type === 'pinkslip') this._bombFlight(s, dt);
        else {
          // homing for tweets: follow the road toward the target, then go straight for it
          if (s.type === 'tweet' && s.target && !s.target.finished && s.target.rescueT <= 0) {
            const t = s.target, d = Math.hypot(t.x - s.x, t.z - s.z);
            let ax, az;
            if (d < 26) { ax = t.x - s.x; az = t.z - s.z; }
            else { const P = this._p || (this._p = { x: 0, y: 0, z: 0 }); const g0 = tr.ground(s.x, s.z, s.hint, hit, s.y); tr.pointAt(g0.s + 14, clamp(g0.lat * 0.6, -4, 4), P); ax = P.x - s.x; az = P.z - s.z; }
            const want = Math.atan2(ax, az), turn = clamp(wrapAngle(want - s.yaw), -5.5 * dt, 5.5 * dt);
            s.yaw += turn; s.vx = Math.sin(s.yaw) * s.speed; s.vz = Math.cos(s.yaw) * s.speed;
            if (d < 30 && !s.warned) { s.warned = true; t.emit('incoming', s); }
          }
          s.x += s.vx * dt; s.z += s.vz * dt;
          const g = tr.ground(s.x, s.z, s.hint, hit, s.y);
          s.hint = g.i; s.y = lerp(s.y, g.y + 0.55, 1 - Math.exp(-14 * dt));
          // walls and boundaries: bounce
          let limL = Infinity, limR = Infinity;
          if (g.edgeL === EDGE.WALL) limL = g.hwL - SHOT_R; else if (g.edgeL === EDGE.OPEN) limL = g.hwL + tr.outerL[g.i] - SHOT_R; else if (g.lat > g.hwL + 1) s.dead = true;
          if (g.edgeR === EDGE.WALL) limR = g.hwR - SHOT_R; else if (g.edgeR === EDGE.OPEN) limR = g.hwR + tr.outerR[g.i] - SHOT_R; else if (-g.lat > g.hwR + 1) s.dead = true;
          const side = g.lat > limL ? 1 : -g.lat > limR ? -1 : 0;
          if (side) {
            const nx = g.nx * side, nz = g.nz * side, over = side > 0 ? g.lat - limL : -g.lat - limR;
            s.x -= nx * over; s.z -= nz * over;
            const vo = s.vx * nx + s.vz * nz;
            if (vo > 0) { s.vx -= 2 * vo * nx; s.vz -= 2 * vo * nz; s.yaw = Math.atan2(s.vx, s.vz); s.bounces++; race.emit('shotBounce', s); }
            if (s.type === 'tweet' || s.bounces > 6) s.dead = true;
          }
        }
      }
      // kart hits
      if (!s.dead && s.type !== 'antitrust' && s.phase !== 'arc') for (const k of race.karts) {
        if (k.rescueT > 0 || k.ghostT > 0) continue;
        if (k === s.owner && s.age < 0.45) continue;
        const dx = k.x - s.x, dz = k.z - s.z, rr = k.radius * (k.sp.targetR || 1) + SHOT_R;
        if (dx * dx + dz * dz > rr * rr || Math.abs(k.y + 0.5 - s.y) > 1.7) continue;
        if (s.type === 'pinkslip') { this._explode(s.x, s.y, s.z, s.owner); s.dead = true; break; }
        if (k.invincible) { s.dead = true; race.emit('shotBlocked', { shot: s, by: k }); break; }
        if (this._shield(k, s.x - s.vx * 0.05, s.z - s.vz * 0.05)) { s.dead = true; race.emit('shotBlocked', { shot: s, by: k }); break; }
        if (k.hurt('spin', s.owner)) race.emit('kartHit', { by: s.owner, victim: k, with: s.type });
        s.dead = true; break;
      }
      // shots destroy ground hazards they touch
      if (!s.dead && s.type !== 'antitrust') for (const h of this.hazards) {
        if (Math.hypot(h.x - s.x, h.z - s.z) < h.radius + SHOT_R && Math.abs(h.y - s.y) < 1.6) {
          if (h.type === 'pinkslip' || s.type === 'pinkslip') this._explode(h.x, h.y, h.z, s.owner);
          h.dead = true; s.dead = true; break;
        }
      }
      if (s.dead) { list.splice(i, 1); race.emit('shotGone', s); }
    }
  }

  _bombFlight(s, dt) {
    const tr = this.race.track, g = TUNE.gravity;
    if (s.phase === 'arc') {
      s.vy -= g * dt; s.x += s.vx * dt; s.y += s.vy * dt; s.z += s.vz * dt;
      const gr = tr.ground(s.x, s.z, s.hint, this.hit, s.y); s.hint = gr.i;
      if (s.y <= gr.y + 0.5) { s.y = gr.y + 0.5; s.phase = 'sit'; s.t = 1.9; s.vx = s.vz = 0; this.race.emit('bombLand', s); }
      // direct hit in the air
      for (const k of this.race.karts) { if (k === s.owner && s.age < 0.5) continue; if (Math.hypot(k.x - s.x, k.z - s.z) < 1.6 && Math.abs(k.y + 0.6 - s.y) < 1.5) { this._explode(s.x, s.y, s.z, s.owner); s.dead = true; return; } }
    } else {
      s.t -= dt;
      if (s.t <= 0) { this._explode(s.x, s.y, s.z, s.owner); s.dead = true; }
    }
  }

  /* The Antitrust Suit, in phases (MK8's Spiny Shell):
     fly    — cruise above the centre line toward whoever leads RIGHT NOW
              (the target is re-read every step, so a lead change re-targets it);
     hover  — committed to one kart: it spirals onto a circle around them and
              orbits twice over BLUE_HOVER_T while tracking their movement;
     dive   — a short slam onto the point locked at the end of the hover. */
  _blue(s, dt) {
    const race = this.race, tr = race.track, P = this._p || (this._p = { x: 0, y: 0, z: 0 });
    if (s.phase !== 'fly') return this._blueStrike(s, dt);
    // the leader among karts still racing: a finished kart is out of the
    // standings for targeting, so a suit airborne when the leader crosses the
    // line re-targets the new leader instead of fizzling on a done kart
    const t = race.order.find(k => !k.finished);
    if (!t) { s.dead = true; return; }
    s.target = t;
    // cruise above the centre line toward the leader
    s.s = mod(s.s + s.speed * dt, tr.length);
    tr.pointAt(s.s, 0, P, 5.5);
    const k = 1 - Math.exp(-9 * dt);
    const px = s.x, pz = s.z;
    s.x += (P.x - s.x) * k; s.y += (P.y - s.y) * k; s.z += (P.z - s.z) * k;
    s.yaw = Math.atan2(s.x - px, s.z - pz);
    const d = loopDelta(s.s, t.s, tr.length);
    if (Math.abs(d) < 26 || (d < 0 && d > -60)) {
      // arrival: commit to this leader and open the telegraph — the orbit, the
      // target ring (raceview reads s.m*), the feed callout (session, on blueArrive)
      s.phase = 'hover'; s.t = BLUE_HOVER_T; s.hoverTarget = t; s.hoverFrac = 0; s.locked = false;
      s.hx = t.x; s.hz = t.z; s.hy = t.y; s.ang = Math.atan2(s.x - t.x, s.z - t.z);
      s.r0 = Math.max(BLUE_ORBIT_R, Math.hypot(s.x - t.x, s.z - t.z));   // spirals in from wherever it arrived, never inside the orbit radius
      s.ey = s.y; s.mx = t.x; s.mz = t.z; s.my = t.y;
      t.emit('incoming', s); race.emit('blueArrive', { shot: s, target: t });
    }
    else if (!s.warned && Math.abs(d) < 160) { s.warned = true; t.emit('incoming', s); }
  }

  _blueStrike(s, dt) {
    const race = this.race, t = s.hoverTarget;
    if (s.phase === 'hover') {
      // committed: only an invalid victim (finished, or being rescued) sends
      // the suit back to travel toward the new leader
      if (!t || t.finished || t.rescueT > 0) {
        s.phase = 'fly'; s.hoverTarget = null; s.warned = false; s.locked = false;
        const g = race.track.ground(s.x, s.z, s.hint, this.hit, s.y); s.hint = g.i; s.s = g.s;
        return;
      }
      s.t -= dt;
      const el = BLUE_HOVER_T - s.t;
      s.hoverFrac = clamp(el / BLUE_HOVER_T, 0, 1);
      // circle the victim twice; the circle's centre tracks their movement,
      // led a touch along their heading so it rides with them, not behind them
      s.ang += dt * (Math.PI * 4 / BLUE_HOVER_T);
      const k = 1 - Math.exp(-12 * dt);
      s.hx += (t.x + Math.sin(t.yaw) * t.speed * 0.07 - s.hx) * k;
      s.hz += (t.z + Math.cos(t.yaw) * t.speed * 0.07 - s.hz) * k;
      s.hy += (t.y - s.hy) * k;
      const b = Math.min(1, el / 0.3), e = b * b * (3 - 2 * b);   // spiral in over the first 0.3 s
      const r = BLUE_ORBIT_R + (s.r0 - BLUE_ORBIT_R) * (1 - e);
      s.x = s.hx + Math.sin(s.ang) * r; s.z = s.hz + Math.cos(s.ang) * r;
      s.y = s.ey + (s.hy + BLUE_HOVER_H - s.ey) * e;
      s.yaw = Math.atan2(t.x - s.x, t.z - s.z);                  // the briefcase faces its victim
      s.mx = s.hx; s.mz = s.hz; s.my = s.hy;                     // the target ring rides under the victim
      if (s.t <= 0) {
        s.locked = true; s.lx = t.x + t.vx * 0.2; s.lz = t.z + t.vz * 0.2; s.ly = t.y;
        s.mx = s.lx; s.mz = s.lz; s.my = s.ly;
        s.phase = 'dive'; s.t = 0.2;
        race.emit('blueStrike', { shot: s, target: t });
      }
    } else {
      s.t -= dt;
      const k = 1 - Math.exp(-22 * dt);
      s.x += (s.lx - s.x) * k; s.z += (s.lz - s.z) * k; s.y += (s.ly + 0.4 - s.y) * k;
      if (s.t <= 0) {
        const hitsBefore = t && !t.finished ? t.stats.hitsTaken : -1;
        this._explode(s.lx, s.ly, s.lz, s.owner, 'antitrust');
        race.emit('blueHit', { x: s.lx, y: s.ly, z: s.lz });
        // MK8: the victim's held item is destroyed by the strike. Nearby racers
        // only take the blast, exactly as before — their items survive it.
        if (t && hitsBefore >= 0 && t.stats.hitsTaken > hitsBefore && t.item) {
          t.item = null; t.itemUses = 0; t.goldenActive = false; t.goldenT = 0; t.rouletteT = 0; t.emit('itemGone');
        }
        s.dead = true;
      }
    }
  }

  /* ---------- AI item judgement ---------- */
  aiShouldUse(k, driver) {
    const race = this.race, tr = race.track, id = ITEMS[k.item].base || k.item, sp = k.speed;
    const straight = () => { for (let j = 0; j < 26; j += 3) if (Math.abs(tr.curv[mod(k.hit.i + j, tr.N)]) > 1 / 75) return false; return true; };
    const near = (ahead, maxD, maxL) => {
      const sy = Math.sin(k.yaw), cy = Math.cos(k.yaw);
      for (const o of race.karts) { if (o === k || o.rescueT > 0) continue; const dx = o.x - k.x, dz = o.z - k.z, f = dx * sy + dz * cy, l = dx * cy - dz * sy; if ((ahead ? f > 3 && f < maxD : f < -2 && f > -maxD) && Math.abs(l) < maxL) return o; }
      return null;
    };
    k._held = (k._held || 0) + 0.25;
    const heldLong = t => { if (k._held > t) { k._held = 0; return true; } return false; };
    let use = false;
    switch (id) {
      case 'boost': use = !k.boosting && k.grounded && (straight() || k.surface.offroad) && sp > 6; break;
      case 'golden': use = k.goldenActive ? !k.boosting || k.boostT < 0.35 : straight(); break;
      case 'star': case 'bailout': case 'insider': case 'dividend': use = true; break;
      case 'antitrust': use = k.rank > 1; if (k.rank === 1) use = heldLong(10); break;
      case 'crash': use = k.rank >= 3 || heldLong(12); break;
      case 'smear': use = k.rank > 1 || heldLong(8); break;
      case 'leak': use = !!near(false, 22, 3.5) && k.rank > 2 ? true : heldLong(k.rank <= 2 ? 16 : 6); break;
      case 'pinkslip': use = !!near(true, 30, 4.5) || heldLong(9); break;
      case 'subpoena': use = !!near(true, 34, 2.4) || heldLong(k.rank === 1 ? 18 : 8); break;
      case 'tweet': use = k.rank > 1 ? true : heldLong(18); break;
      case 'pr': use = !!near(true, 7, 6) || !!near(false, 7, 6) || this.shots.some(s => s.owner !== k && Math.hypot(s.x - k.x, s.z - k.z) < 15 + (s.type === 'antitrust' ? 12 : 0)) || heldLong(16); break;
    }
    if (use) k._held = 0;
    void driver;
    return use;
  }
}
