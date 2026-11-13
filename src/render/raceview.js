/* Everything visible in a race: track, scenery, karts, pickups, projectiles,
   and the effects fired by sim events. One RaceView per Race. */
import * as THREE from 'three';
import { buildTrackMesh, trackUniforms } from '../track/trackmesh.js';
import { KartView } from './kartview.js';
import { ChaseCam, IntroCam, TvCam } from './chasecam.js';
import { Particles, rgbOf } from './particles.js';
import { releaseCanvases } from './canvasmem.js';
import { buildItemBox, buildItemModel, coinGeometry, coinMaterial } from '../models/items.js';
import { OBSTACLE_MODELS } from '../models/props.js';
import { buildKart } from '../models/kart.js';
import { RACER_BY_ID } from '../content/racers.js';
import { clamp } from '../core/util.js';

const CONFETTI = [[1, 0.82, 0.24], [1, 0.3, 0.43], [0.22, 0.71, 1], [0.18, 0.9, 0.65], [0.62, 0.42, 1], [1, 1, 1]];
/** Per-item feedback colour: the ring/burst an item use and a hit land in the item's own colour, so a
    player can read WHAT fired and WHAT hit them at a glance, at phone size. Projectiles also get a
    muzzle flash at the barrel. */
const ITEM_FX = {};
for (const [id, hex] of Object.entries({ boost: 0xff8c3a, boost3: 0xff8c3a, golden: 0xffd23e, leak: 0x37e0e0, subpoena: 0xffe9a8, subpoena3: 0xffe9a8, tweet: 0x4da3ff, antitrust: 0x3a6bff, pinkslip: 0xff5d7a, star: 0xffe14d, crash: 0xc9a7ff, pr: 0xffc44d, smear: 0xb46bff, insider: 0x9fe8ff, bailout: 0xffa03c, dividend: 0xffd23e })) ITEM_FX[id] = { rgb: rgbOf(hex) };
for (const id of ['subpoena', 'subpoena3', 'tweet', 'antitrust', 'pinkslip']) if (ITEM_FX[id]) ITEM_FX[id].muzzle = true;
/** Drift tier colours (blue, orange, purple), shared with the sparks in kartview. */
const TIER_FX = [[0.25, 0.65, 1], [1, 0.55, 0.1], [0.95, 0.3, 1]];
/** How hard each kind of hit lands, 0..1: shake, horizon knock, burst size, and the red rim all scale with it. */
const HIT_SEV = { zap: 0.45, spin: 0.6, squash: 0.7, tumble: 1 };
/** Camera punch per boost kind (mini-turbos punch by tier on release instead). */
const BOOST_PUNCH = { mushroom: 0.85, pad: 0.7, start: 0.9, trick: 0.5, draft: 0.45 };
const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _s = new THREE.Vector3(1, 1, 1), _p = new THREE.Vector3(), _e = new THREE.Euler();

export class RaceView {
  constructor(gfx, race, def, { onEvent = null, tv = false } = {}) {
    this.gfx = gfx; this.race = race; this.def = def; this.onEvent = onEvent; this.tv = tv;
    const scene = gfx.scene, track = race.track;
    this.root = new THREE.Group(); this.root.name = 'race'; scene.add(this.root);
    this.sky = gfx.setSky(def.sky || 'day', def.skyOverrides || {});
    if (def.backdrop) new THREE.TextureLoader().load(def.backdrop.img, tex => { if (gfx.sky === this.sky) this.sky.setPanorama(tex, def.backdrop); });
    this.trackMesh = buildTrackMesh(track, def.look); this.root.add(this.trackMesh);
    if (track.water != null) this._water(track, def);
    this.fx = new Particles(this.root, gfx.q.particles);
    this.anim = [];                          // per-frame callbacks from scenery
    track.clearColliders();
    if (def.decorate) def.decorate({ THREE, track, group: this.root, gfx, anim: this.anim, look: def.look, view: this, densityScale: race.players.length > 2 ? 0.5 : race.players.length === 2 ? 0.75 : 1 });

    // pickups
    this.boxes = race.items.boxes.map(b => { const m = buildItemBox(); m.position.set(b.x, b.y, b.z); m.rotation.set(0.5, Math.random() * 6, 0.3); this.root.add(m); return { b, m, pop: 1 }; });
    const coins = race.items.coins;
    if (coins.length) {
      this.coinMesh = new THREE.InstancedMesh(coinGeometry(), coinMaterial(), coins.length);
      this.coinMesh.castShadow = true; this.coinMesh.frustumCulled = false; this.root.add(this.coinMesh);
      this.coinScale = new Float32Array(coins.length).fill(1);
    }
    this.things = new Map();                 // hazards and shots -> meshes
    // scripted track obstacles (patrols, orbiters, timed jets)
    this.obstacles = race.obstacles.map(o => {
      const make = def.models?.[o.model] || OBSTACLE_MODELS[o.model] || OBSTACLE_MODELS.barrel;
      const m = make(o); m.traverse(n => { if (n.isMesh && !n.material.transparent) n.castShadow = gfx.q.shadow > 0; });
      this.root.add(m); return { o, m };
    });

    // karts and cameras
    this.karts = race.karts.map(k => new KartView(k, this.root, this.fx, { shadow: gfx.q.shadow > 0 }));
    // real shadows cost one extra pass per view: with three or four views, use contact shadows instead
    const many = race.players.length > 2;
    gfx.sun.castShadow = gfx.q.shadow > 0 && !many; gfx.renderer.shadowMap.enabled = gfx.sun.castShadow;
    for (const v of this.karts) v.blob.visible = !gfx.sun.castShadow;
    this.viewOf = new Map(this.karts.map(v => [v.kart, v]));
    this.cams = race.players.map((k, i) => new ChaseCam(k, track, i));
    this.intro = null; this.time = 0; this.flash = 0;
    this.layout();
  }

  _water(track, def) {
    const mat = new THREE.MeshStandardMaterial({ color: def.look?.water ?? 0x2fa3e6, roughness: 0.12, metalness: 0.15, transparent: true, opacity: 0.88, envMapIntensity: 1.3 });
    const w = new THREE.Mesh(new THREE.PlaneGeometry(5000, 5000), mat);
    w.rotation.x = -Math.PI / 2; w.position.set(track.bounds.cx, track.water, track.bounds.cz); w.receiveShadow = true; this.root.add(w);
    this.water = w;
  }

  /** Split the screen between local players. */
  layout() {
    const n = this.cams.length;
    const rects = n <= 1 ? [[0, 0, 1, 1]] : n === 2 ? [[0, 0.5, 1, 0.5], [0, 0, 1, 0.5]] : [[0, 0.5, 0.5, 0.5], [0.5, 0.5, 0.5, 0.5], [0, 0, 0.5, 0.5], [0.5, 0, 0.5, 0.5]];
    this.views = this.cams.map((c, i) => ({ camera: c.camera, rect: rects[i], focus: c.focus, cam: c, onBeforeRender: v => this._beforeView(v) }));
    if (!n) { // spectator: follow the leader
      const c = this.tv ? new TvCam(this.race.karts[0], this.race.track) : new ChaseCam(this.race.karts[0], this.race.track, 9); this.cams = [c]; this.spectate = true;
      this.views = [{ camera: c.camera, rect: [0, 0, 1, 1], focus: c.focus, cam: c, onBeforeRender: v => this._beforeView(v) }];
    }
    this.gfx.setViews(this.views);
  }
  _beforeView(v) {
    const h = this.gfx.renderer.domElement.height * v.rect[3];
    this.fx.setViewport(h, v.camera.fov);
    // a rival close enough to fill the screen (its hat or hair in the lens) is left out of this view
    const cp = v.camera.position, own = v.cam?.kart;
    for (const kv of this.karts) kv.rig.root.visible = kv.kart === own || (kv.pos.x - cp.x) ** 2 + (kv.pos.y + 0.9 - cp.y) ** 2 + (kv.pos.z - cp.z) ** 2 > 7.3;
  }
  /** The five lights on the start gantry: red in step with the count, green on go. */
  _startLights(n) {
    const L = this.startLights; if (!L || !L.length) return;
    const lit = n === 0 ? L.length : n >= 3 ? 2 : n === 2 ? 4 : 5;
    L.forEach((m, i) => { m.material.emissive.setHex(n === 0 ? 0x2aff6a : 0xff2a2a); m.material.emissiveIntensity = i < lit ? 3 : 0; });
    this._lightsOff = n === 0 ? this.time + 2.5 : Infinity;
  }

  startIntro() { this.intro = new IntroCam(this.race.track, this.views[0].camera); }

  /** Time trial: show a translucent replay of the best run. ghost: { racer, step, time, d: [x,y,z,yaw,...] } */
  setGhost(ghost) {
    if (!ghost?.d?.length) return;
    const rig = buildKart(RACER_BY_ID[ghost.racer] || this.race.players[0].racer, { shadow: false });
    const mat = new THREE.MeshBasicMaterial({ color: 0xbfe6ff, transparent: true, opacity: 0.3, depthWrite: false });
    rig.root.traverse(o => { if (o.isMesh) { o.material = mat; o.castShadow = false; } });
    this.root.add(rig.root); this.ghost = { rig, data: ghost };
  }
  _ghost() {
    const g = this.ghost; if (!g) return;
    const d = g.data.d, n = d.length / 4, f = this.race.time / g.data.step, i = Math.min(n - 1, Math.floor(f)), j = Math.min(n - 1, i + 1), t = f - Math.floor(f);
    g.rig.root.visible = !this.race.frozen && f < n - 1;
    const yaw = d[i * 4 + 3] + Math.atan2(Math.sin(d[j * 4 + 3] - d[i * 4 + 3]), Math.cos(d[j * 4 + 3] - d[i * 4 + 3])) * t;
    g.rig.root.position.set(d[i * 4] + (d[j * 4] - d[i * 4]) * t, d[i * 4 + 1] + (d[j * 4 + 1] - d[i * 4 + 1]) * t, d[i * 4 + 2] + (d[j * 4 + 2] - d[i * 4 + 2]) * t);
    g.rig.root.rotation.y = yaw;
  }

  /** Call before each sim step so rendering can interpolate. */
  snapshot() { for (const v of this.karts) v.snapshot(); }

  /** Drain sim events into effects. Returns nothing; forwards each to onEvent for audio and HUD. */
  events() {
    const race = this.race, fx = this.fx;
    for (const k of race.karts) {
      if (!k.events.length) continue;
      const v = this.viewOf.get(k), cam = this.spectate ? null : this.cams.find(c => c.kart === k);   // the attract mode's TV cameras take no kicks
      for (const e of k.events) {
        v.onEvent(e);
        const p = v.pos;
        switch (e.type) {
          case 'hit': { // weight scales with what landed: a tumble is the big one, a zap the smallest
            const sev = HIT_SEV[e.data.kind] ?? 0.6;
            fx.burst(p.x, p.y + 1, p.z, 18 + sev * 22, [1, 0.9, 0.3], 7 + sev * 6, 0.4, 0.7); fx.puff(p.x, p.y + 0.3, p.z, 6 + sev * 8, [0.9, 0.9, 0.9], 4, 1.4, 0.7, 0.5);
            fx.ring(p.x, p.y + 0.25, p.z, 18, [1, 1, 1], 7 + sev * 5, 0.45, 0.3);
            if (cam) { cam.impact(sev, e.data.from && e.data.from !== k ? Math.sign((e.data.from.x - k.x) * Math.cos(k.yaw) - (e.data.from.z - k.z) * Math.sin(k.yaw)) : 0); this._edge(cam, [1, 0.22, 0.28], 0.45 + sev * 0.35); }
            break; }
          case 'land': { // a big landing slams down: a ring of dust along the ground and the camera sinks with the kart
            const dust = k.surface.dust ? rgbOf(k.surface.dust) : [0.85, 0.85, 0.88];
            if (e.data > 7) { fx.puff(p.x, p.y + 0.1, p.z, 6, dust, 4, 1.1, 0.5, 0.35); this._dustRing(p, dust, clamp((e.data - 7) / 10, 0.3, 1)); }
            if (cam) { cam.addShake(clamp((e.data - 6) / 30, 0, 0.5)); if (e.data > 7) cam.dip(clamp((e.data - 6) * 0.22, 0, 2.6)); }
            break; }
          case 'wall': fx.burst(p.x, p.y + 0.5, p.z, 14, [1, 0.8, 0.4], 7, 0.22, 0.35, 2); cam?.addShake(clamp(e.data.v / 25, 0.1, 0.7)); break;
          case 'bump': fx.burst(p.x, p.y + 0.6, p.z, 6, [1, 1, 0.8], 5, 0.2, 0.25, 2); cam?.addShake(0.2); break;
          case 'miniTurbo': { // the release pops: a ring and a spray off the back in the tier's colour, bigger for each tier
            const col = TIER_FX[e.data - 1], n = e.data;
            fx.ring(p.x, p.y + 0.3, p.z, 14 + n * 6, col, 8 + n * 2, 0.45 + n * 0.08, 0.35);
            fx.ring(p.x, p.y + 0.35, p.z, 10 + n * 4, [1, 1, 1], 5 + n * 2, 0.3, 0.25);
            const sy = Math.sin(k.yaw), cy = Math.cos(k.yaw);
            for (let i = 0; i < (8 + n * 8) * fx.density; i++) fx.glint.emit({ x: p.x - sy * 1.1, y: p.y + 0.35, z: p.z - cy * 1.1, vx: -sy * (8 + Math.random() * 10) + (Math.random() - 0.5) * 6, vy: 1 + Math.random() * 4, vz: -cy * (8 + Math.random() * 10) + (Math.random() - 0.5) * 6, color: [1, 1, 1], color2: col, size: 0.22 + n * 0.05, life: 0.3 + Math.random() * 0.2, gravity: 8, drag: 2, alpha: 1.2 });
            cam?.punch([0.4, 0.65, 0.95][n - 1]);
            break; }
          case 'driftTier': if (e.data > 0) { const col = TIER_FX[e.data - 1]; fx.burst(p.x, p.y + 0.3, p.z, 10 + e.data * 6, col, 6 + e.data, 0.3, 0.3, 3); fx.ring(p.x, p.y + 0.3, p.z, 12, col, 4 + e.data, 0.35, 0.22); } break;
          case 'trick': fx.ring(p.x, p.y + 0.5, p.z, 14, [1, 1, 0.6], 7, 0.4, 0.4); break;
          case 'trickLand': fx.burst(p.x, p.y + 0.3, p.z, 18, [0.4, 0.9, 1], 8, 0.3, 0.45); break;
          case 'rocketStart': fx.puff(p.x, p.y + 0.2, p.z, 14, [1, 1, 1], 7, 1.6, 0.8, 0.6); cam?.addShake(0.4); break;
          case 'burnout': fx.puff(p.x, p.y + 0.2, p.z, 18, [0.25, 0.25, 0.28], 3, 1.8, 1.2, 0.7); break;
          case 'coin': fx.burst(p.x, p.y + 1.2, p.z, 8, [1, 0.85, 0.2], 4, 0.25, 0.4, 3); break;
          case 'dropCoins': fx.confetti(p.x, p.y + 1, p.z, 10, [[1, 0.8, 0.15]], 6, p.y); break;
          case 'itemUse': { if (e.data === 'bailout') cam?.punch(1); const f = ITEM_FX[e.data]; fx.ring(p.x, p.y + 0.6, p.z, 14, f ? f.rgb : [1, 1, 1], 8, 0.4, 0.35); if (f?.muzzle) fx.burst(p.x + Math.sin(k.yaw) * 1.7, p.y + 0.7, p.z + Math.cos(k.yaw) * 1.7, 10, f.rgb, 3, 0.3, 0.25, 1); break; }
          case 'shieldBlock': fx.burst(p.x, p.y + 0.6, p.z, 16, [0.6, 1, 0.8], 8, 0.3, 0.4); break;
          case 'finish': {
            const top = e.data <= 3;
            fx.confetti(p.x, p.y + 2, p.z, top ? 160 : 90, CONFETTI, top ? 13 : 10, p.y);
            if (cam) { // the line: a white pop, a gold rim on a podium finish, fireworks over the kart
              cam.punch(0.8);
              if (this.views.length === 1) { this.flash = Math.max(this.flash, 0.5); this.gfx.post.flashColor.setRGB(1, 1, 1); }
              if (top) { this._edge(cam, [1, 0.82, 0.25], 0.8, 0.7); this._fireworks(p, k.yaw, e.data === 1 ? 5 : 3); }
            }
            break; }
          case 'finalLap': if (cam) this._edge(cam, [1, 0.3, 0.45], 0.55, 1.1); break;
          case 'rescue': fx.puff(p.x, p.y, p.z, 10, [1, 1, 1], 3, 1.5, 0.8, 0.5); break;
          case 'boost': // every boost but a mini-turbo (that one pops on release, above) kicks the camera, harder for stronger boosts
            if (e.data === 'mushroom' || e.data === 'start' || e.data === 'pad') { fx.ring(p.x, p.y + 0.4, p.z, 14, [1, 0.7, 0.2], 10, 0.5, 0.3); cam?.addShake(0.15); }
            if (cam && BOOST_PUNCH[e.data]) cam.punch(BOOST_PUNCH[e.data]);
            break;
        }
        this.onEvent?.('kart', e, k);
      }
      k.events.length = 0;
    }
    for (const e of race.events) {
      const d = e.data;
      switch (e.type) {
        case 'boxBreak': { const b = d.box; fx.confetti(b.x, b.y, b.z, 18, CONFETTI, 7, b.y - 1.2); fx.burst(b.x, b.y, b.z, 10, [1, 1, 1], 6, 0.3, 0.35); const o = this.boxes.find(x => x.b === b); if (o) o.pop = 0; break; }
        case 'coinTaken': break;
        case 'explosion': this._explosion(d.x, d.y, d.z, d.r); break;
        case 'shock': fx.ring(d.x, d.y + 0.6, d.z, 40, [1, 0.85, 0.3], 30, 0.9, 0.4); fx.ring(d.x, d.y + 1.2, d.z, 30, [1, 1, 1], 22, 0.6, 0.35); this._shakeNear(d.x, d.z, 0.6, 40); break;
        case 'count': this._startLights(e.data); break;
        case 'go': this._startLights(0); break;
        case 'lightning': this.flash = 1; this.gfx.post.flashColor.setRGB(0.85, 0.9, 1); for (const v of this.karts) if (v.kart !== d.by) fx.burst(v.pos.x, v.pos.y + 1.5, v.pos.z, 14, [0.7, 0.85, 1], 10, 0.4, 0.5); for (const c of this.cams) c.addShake(0.5); break;
        case 'shotGone': case 'hazardGone': { const t = this.things.get(d.id); if (t) { fx.burst(d.x, d.y + 0.4, d.z, 10, [1, 1, 1], 6, 0.25, 0.3); this.root.remove(t); this.things.delete(d.id); } break; }
        case 'shotBounce': fx.burst(d.x, d.y, d.z, 6, [1, 0.9, 0.6], 5, 0.2, 0.25, 1); break;
        case 'kartHit': { // a hit lands visibly on the victim, in the item's colour — before this, hits had no effect at all here
          const v = this.viewOf.get(d.victim); if (!v) break; const f = ITEM_FX[d.with];
          fx.ring(v.pos.x, v.pos.y + 0.8, v.pos.z, 18, f ? f.rgb : [1, 1, 1], 9, 0.45, 0.4);
          fx.burst(v.pos.x, v.pos.y + 0.9, v.pos.z, 14, f ? f.rgb : [1, 1, 1], 7, 0.35, 0.4, 3);
          if (d.victim.isPlayer) this.cams.find(c => c.kart === d.victim)?.addShake(0.35);
          if (d.by?.isPlayer && d.by !== d.victim) this.cams.find(c => c.kart === d.by)?.addShake(0.12);   // the one who threw it feels it connect
          break; }
        case 'robbed': { const v = this.viewOf.get(d.kart); if (v) { fx.burst(v.pos.x, v.pos.y + 1.1, v.pos.z, 12, [1, 0.85, 0.2], 5, 0.3, 0.45, 3); if (d.kart.isPlayer) this.cams.find(c => c.kart === d.kart)?.addShake(0.3); } break; }
        case 'obstacleHit': fx.burst(d.obstacle.x, d.obstacle.y + 1, d.obstacle.z, 14, [1, 0.8, 0.3], 7, 0.3, 0.4); break;
        case 'blueHit': this.flash = 0.6; this.gfx.post.flashColor.setRGB(0.6, 0.75, 1); break;
      }
      this.onEvent?.('race', e);
    }
    race.events.length = 0;
  }

  _explosion(x, y, z, r) {
    const fx = this.fx;
    fx.burst(x, y + 0.8, z, 60, [1, 0.7, 0.2], 16, 0.7, 0.7, 6);
    fx.burst(x, y + 0.8, z, 30, [1, 0.95, 0.7], 9, 1.0, 0.4, 3);
    fx.puff(x, y + 0.5, z, 22, [0.25, 0.24, 0.26], 7, 2.6, 1.4, 0.7);
    fx.ring(x, y + 0.3, z, 36, [1, 0.6, 0.2], r * 2.6, 0.8, 0.45);
    this._shakeNear(x, z, 1.0, 60);
  }
  /** Tint the rim of the frame for a moment (single view only: split-screen shares one picture). */
  _edge(cam, rgb, amount, decay = 2.4) {
    if (this.views.length !== 1 || this.views[0].cam !== cam) return;
    this.edge = Math.max(this.edge || 0, amount); this.edgeDecay = decay; this.gfx.post.edgeColor.setRGB(rgb[0], rgb[1], rgb[2]);
  }
  /** Dust thrown out along the ground in a ring, for a heavy landing. s: 0..1. */
  _dustRing(p, rgb, s) {
    const n = Math.round(10 + s * 14);
    for (let i = 0; i < n * this.fx.density; i++) { const a = (i / n) * 6.283 + Math.random() * 0.3, v = 4 + s * 5 + Math.random() * 2; this.fx.smoke.emit({ x: p.x + Math.cos(a) * 0.8, y: p.y + 0.15, z: p.z + Math.sin(a) * 0.8, vx: Math.cos(a) * v, vy: 0.6 + Math.random() * 0.8, vz: Math.sin(a) * v, color: rgb, size: 0.9 + s * 0.6, life: 0.6 + s * 0.3, grow: 2, drag: 3.2, gravity: -0.6, alpha: 0.55, spin: (Math.random() - 0.5) * 2 }); }
  }
  /** Fireworks over a podium finish: a few bursts high ahead of the kart, one after another. */
  _fireworks(p, yaw, n) {
    for (let i = 0; i < n; i++) {
      // low and close enough to sit in the chase view's upper third, ahead of the kart as the camera swings round
      const at = this.time + 0.15 + i * 0.26, a = yaw + (i - (n - 1) / 2) * 0.45, d = 8 + Math.random() * 5;
      (this._pending || (this._pending = [])).push({ at, x: p.x + Math.sin(a) * d, y: p.y + 4.5 + Math.random() * 2.5, z: p.z + Math.cos(a) * d, col: CONFETTI[i % 5] });
    }
  }
  _shakeNear(x, z, amount, range) { for (const c of this.cams) { const d = Math.hypot(c.kart.x - x, c.kart.z - z); if (d < range) c.addShake(amount * (1 - d / range)); } }

  /**
   * What the scenery plays to: showLap is the lap the leading player is on (the leading kart when nobody is
   * playing), 1..laps; showProgress is how far through the whole race they are, 0..1, and never goes back.
   * Tracks use these to change over a race (a lake that drains, a sky that fills with smoke, a fire that spreads).
   */
  _show() {
    const r = this.race, ks = r.players.length ? r.players : r.karts, len = r.track.length || 1;
    let lap = 1, prog = 0;
    for (const k of ks) {
      const l = Math.min(Math.max(k.lap || 0, 0), r.laps + 1);
      lap = Math.max(lap, Math.min(Math.max(l, 1), r.laps));
      prog = Math.max(prog, k.finished || l > r.laps ? 1 : l < 1 ? 0 : (l - 1 + Math.min(Math.max(k.s / len, 0), 1)) / r.laps);
    }
    this.showLap = lap; this.showProgress = Math.max(this.showProgress || 0, Math.min(1, prog)); this.finalLap = lap >= r.laps;
  }

  /** Per rendered frame. alpha: interpolation between the last two sim steps. */
  update(dt, alpha) {
    const race = this.race, gfx = this.gfx;
    this.time += dt;
    trackUniforms.uTime.value = this.time;
    this._show();
    this.events();
    const cam0 = this.views[0].camera.position;
    for (const v of this.karts) v.update(dt, alpha, this.time, cam0);

    // item boxes spin, bob, and pop back in
    for (const o of this.boxes) {
      o.m.visible = o.b.active;
      if (!o.b.active) continue;
      o.pop = Math.min(1, o.pop + dt * 3.5);
      const s = 1.15 * (o.pop < 1 ? 0.2 + 0.8 * (1 - Math.pow(1 - o.pop, 3)) * (1 + Math.sin(o.pop * 9) * 0.12 * (1 - o.pop)) : 1);
      o.m.scale.setScalar(s); o.m.rotation.y += dt * 1.6; o.m.rotation.x += dt * 0.9;
      o.m.position.y = o.b.y + Math.sin(this.time * 2.4 + o.b.id) * 0.14;
      o.m.userData.core.scale.setScalar(1 + Math.sin(this.time * 6 + o.b.id) * 0.2);
    }
    // coins
    if (this.coinMesh) {
      const coins = race.items.coins;
      for (let i = 0; i < coins.length; i++) {
        const c = coins[i];
        this.coinScale[i] += ((c.active ? 1 : 0) - this.coinScale[i]) * Math.min(1, dt * 12);
        const sc = this.coinScale[i] * 0.95;
        _e.set(0, this.time * 3.2 + i * 0.6, 0); _q.setFromEuler(_e); _s.set(sc, sc, sc);
        _m.compose(_p.set(c.x, c.y + Math.sin(this.time * 3 + i) * 0.08, c.z), _q, _s);
        this.coinMesh.setMatrixAt(i, _m);
      }
      this.coinMesh.instanceMatrix.needsUpdate = true;
    }
    this._things(dt);
    this._ghost();
    for (const { o, m } of this.obstacles) {
      m.position.set(o.x, o.y + (o.model === 'drone' ? Math.sin(this.time * 3 + o.id) * 0.15 : 0), o.z); m.rotation.y = o.yaw || 0;
      if (m.userData.setActive) m.userData.setActive(o.active, o.warn, this.time);
      if (o.kind === 'timed' && o.active && o.model === 'flame' && this.fx.count(30, dt)) this.fx.flame(o.x + (Math.random() - 0.5), o.y + 0.5, o.z + (Math.random() - 0.5), 0, 9 + Math.random() * 5, 0, [1, 0.6, 0.2], 1.2, 0.4);
    }
    for (const fn of this.anim) fn(dt, this.time);
    this.fx.update(dt);
    if (this._lightsOff && this.time > this._lightsOff) { this._lightsOff = 0; for (const m of this.startLights || []) m.material.emissiveIntensity = 0; }

    // cameras
    if (this._grade && (!this.intro || this.intro.done)) { Object.assign(gfx.post, this._grade); this._grade = null; }   // intro skipped mid-shot
    if (this.intro && !this.intro.done) {
      const q = this.intro.update(dt); this.views[0].focus.copy(q);
      // a shot may ask for its own color grade (the Bliss Hills opening is shown ungraded); everything after it gets the usual one back
      const want = this.intro.done ? null : this.intro.shot?.grade;
      if (want && !this._grade) { this._grade = { sat: gfx.post.sat, contrast: gfx.post.contrast, vignette: gfx.post.vignette }; Object.assign(gfx.post, want); }
      else if (!want && this._grade) { Object.assign(gfx.post, this._grade); this._grade = null; }
    }
    else {
      if (this.spectate) { this._specT = (this._specT || 0) + dt; if (this._specT > 7) { this._specT = 0; const pick = race.order[Math.floor(Math.random() * Math.min(4, race.order.length))]; if (pick && !pick.finished) { this.cams[0].kart = pick; this.cams[0].snap(); } } }
      const w = gfx.renderer.domElement.width, h = gfx.renderer.domElement.height;
      this.cams.forEach((c, i) => { const r = this.views[i].rect; c.update(dt, this.viewOf.get(c.kart), (r[2] * w) / (r[3] * h)); });
    }
    // post effects for the single-player view
    const k = this.cams[0]?.kart;
    if (k) gfx.post.blur += ((this.spectate ? 0 : ((k.boostT > 0 || k.bulletT > 0) ? 0.055 : 0) + (k.starT > 0 ? 0.02 : 0)) - gfx.post.blur) * Math.min(1, dt * 6);
    this.flash = Math.max(0, this.flash - dt * 2.6); gfx.post.flash = this.flash * 0.75;
    this.edge = Math.max(0, (this.edge || 0) - dt * (this.edgeDecay || 2.4)); gfx.post.edge = this.edge;
    gfx.post.lines += ((this.spectate || !this.cams[0] ? 0 : this.cams[0].lines) - gfx.post.lines) * Math.min(1, dt * 8);
    if (this._pending?.length) for (let i = this._pending.length - 1; i >= 0; i--) { const f = this._pending[i]; if (this.time < f.at) continue; this._pending.splice(i, 1); this.fx.burst(f.x, f.y, f.z, 46, f.col, 10, 0.45, 0.9, 1); for (let j = 0; j < 22 * this.fx.density; j++) { const u = Math.random() * 6.283, w = Math.random() * 2 - 1, r = Math.sqrt(1 - w * w), v = 6 + Math.random() * 3; this.fx.glint.emit({ x: f.x, y: f.y, z: f.z, vx: Math.cos(u) * r * v, vy: w * v + 1, vz: Math.sin(u) * r * v, color: [1, 1, 1], color2: f.col, size: 0.4, life: 0.7 + Math.random() * 0.4, gravity: 4, drag: 1.6, alpha: 1.3, spin: 6 }); } }
  }

  /** Mirror hazards and projectiles with models. */
  _things(dt) {
    const items = this.race.items, seen = this._seen || (this._seen = new Set());
    seen.clear();
    const sync = (o, kind) => {
      let m = this.things.get(o.id);
      if (!m) { m = buildItemModel(o.type); m.userData.kind = kind; this.root.add(m); this.things.set(o.id, m); if (kind === 'shot' && o.type === 'antitrust') m.scale.setScalar(1.3); }
      seen.add(o.id);
      m.position.set(o.x, o.y - (kind === 'shot' && o.type !== 'pinkslip' && o.type !== 'antitrust' ? 0.5 : 0), o.z);
      if (kind === 'shot') {
        m.rotation.y = o.yaw || 0;
        if (m.userData.spin) m.userData.spin.rotation.x += dt * 22;
        if (m.userData.wings) for (const w of m.userData.wings) w.rotation.z = Math.sin(this.time * (o.type === 'antitrust' ? 14 : 26)) * 0.7 * Math.sign(w.scale.x);
        if (o.type === 'pinkslip') { m.position.y = o.y - 0.5; m.rotation.x += dt * (o.phase === 'arc' ? 9 : 0); if (o.phase === 'sit') { const f = 1 + Math.sin(this.time * 26) * 0.08; m.scale.setScalar(f); } if (o.phase === 'arc' && this.fx.count(45, dt)) this.fx.dust(o.x, o.y - 0.3, o.z, 0, 0.8, 0, [0.45, 0.44, 0.48], 0.8, 0.55, 0.5); }
        if (o.type === 'antitrust' && this.fx.count(50, dt)) this.fx.add.emit({ x: o.x, y: o.y, z: o.z, vx: 0, vy: 0, vz: 0, color: [0.3, 0.55, 1], size: 1.1, life: 0.4, alpha: 0.9 });
        if (o.type === 'antitrust') {
          // the strike telegraph: a target ring on the road under the victim that
          // closes from the full blast footprint to the strike point as the hover runs out
          const hovering = o.phase === 'hover' || o.phase === 'dive';
          let ring = m.userData.ring;
          if (hovering && !ring) {
            ring = m.userData.ring = new THREE.Mesh(
              new THREE.RingGeometry(0.86, 1, 40),
              new THREE.MeshBasicMaterial({ color: 0x4d8dff, transparent: true, opacity: 0.85, depthWrite: false, side: THREE.DoubleSide }));
            ring.rotation.x = -Math.PI / 2; ring.renderOrder = 5; this.root.add(ring);
          }
          if (ring) {
            ring.visible = hovering;
            if (hovering) {
              const f = o.phase === 'dive' ? 1 : (o.hoverFrac || 0);
              ring.scale.setScalar((7.5 - 4.9 * f) * (1 + Math.sin(this.time * 10) * 0.05));
              ring.position.set(o.mx ?? o.x, (o.my ?? o.y) + 0.15, o.mz ?? o.z);
            }
          }
        }
        if (o.type === 'tweet' && this.fx.count(40, dt)) this.fx.add.emit({ x: o.x, y: o.y, z: o.z, vx: 0, vy: 0.5, vz: 0, color: [0.3, 0.7, 1], size: 0.4, life: 0.3, alpha: 0.9 });
        if (o.type === 'subpoena' && this.fx.count(30, dt)) this.fx.add.emit({ x: o.x, y: o.y, z: o.z, vx: 0, vy: 0.5, vz: 0, color: [1, 0.9, 0.6], size: 0.35, life: 0.25, alpha: 0.8 });
      } else {
        m.rotation.y += dt * (o.type === 'leak' ? 0.8 : 0);
        if (o.type === 'leak') { const f = 1 + Math.sin(this.time * 5 + o.x * 0.7 + o.z) * 0.1; m.scale.set(f, 1, f); }   // the puddle breathes — a hazard you can see coming
        if (o.type === 'pinkslip') { const f = 1 + Math.sin(this.time * (8 + o.age * 8)) * 0.07; m.scale.setScalar(f); }
        if (o.type === 'leak' && this.fx.count(5, dt)) this.fx.add.emit({ x: o.x + (Math.random() - 0.5), y: o.y + 0.2, z: o.z + (Math.random() - 0.5), vx: 0, vy: 1.4, vz: 0, color: [0.2, 0.9, 1], size: 0.2, life: 0.8, alpha: 0.9 });
      }
    };
    for (const h of items.hazards) sync(h, 'hazard');
    for (const s of items.shots) sync(s, 'shot');
    for (const [id, m] of this.things) if (!seen.has(id)) { this.root.remove(m); if (m.userData.ring) this.root.remove(m.userData.ring); this.things.delete(id); }
  }

  dispose() {
    const scene = this.gfx.scene;
    scene.remove(this.root);
    this.root.traverse(o => { if (o.userData?.dispose) o.userData.dispose(); else if (o.isMesh || o.isPoints || o.isSprite) { o.geometry?.dispose?.(); } });
    releaseCanvases(this.root);   // Safari caps total canvas memory; see canvasmem.js
    this.gfx.setViews([]);
    this.gfx.post.blur = 0; this.gfx.post.flash = 0; this.gfx.post.lines = 0; this.gfx.post.edge = 0; if (this._grade) { Object.assign(this.gfx.post, this._grade); this._grade = null; }
    this.gfx.sun.castShadow = this.gfx.q.shadow > 0; this.gfx.renderer.shadowMap.enabled = this.gfx.sun.castShadow;
  }
}
