/* Chase camera for one player: trails the kart's direction of travel, widens the
   view under boost, shakes on impacts, and has intro and finish shots. */
import * as THREE from 'three';
import { clamp, lerp, damp, dampAngle, wrapAngle, smoothstep } from '../core/util.js';
import { TAG_LAYER } from './kartview.js';

const _look = new THREE.Vector3(), _want = new THREE.Vector3();
/* Reduced motion (the system setting): no shake, no roll or dip kicks, and only a hint of the boost punch. */
const REDUCED = typeof matchMedia === 'function' ? matchMedia('(prefers-reduced-motion: reduce)') : { matches: false };
/* A damped spring driven by impulses: kicks rise and settle instead of popping. */
const spring = (s, k, c, dt) => { s.v += (-s.x * k - s.v * c) * dt; s.x += s.v * dt; if (Math.abs(s.x) < 1e-4 && Math.abs(s.v) < 1e-3) s.x = s.v = 0; return s.x; };

export class ChaseCam {
  constructor(kart, track, playerIndex = 0) {
    this.kart = kart; this.track = track;
    const cam = this.camera = new THREE.PerspectiveCamera(60, 16 / 9, 0.25, 2600);
    // show every name tag except this player's own
    for (let l = TAG_LAYER; l < TAG_LAYER + 6; l++) cam.layers.enable(l);
    cam.layers.disable(TAG_LAYER + 1 + playerIndex);
    this.yaw = kart.yaw; this.pos = new THREE.Vector3(); this.focus = new THREE.Vector3();
    this.dist = 5.5; this.height = 2.35; this.fov = 54; this.baseFov = 54;
    this.shake = 0; this.kick = 0; this.y = kart.y; this.mode = 'chase'; this.t = 0; this.rear = false;
    // impulse springs: surge (the kart pulls away on a boost), fov punch, roll (a hit knocks the frame), dip (a landing)
    this.surge = { x: 0, v: 0 }; this.punchS = { x: 0, v: 0 }; this.roll = { x: 0, v: 0 }; this.dipS = { x: 0, v: 0 };
    this.lines = 0;   // speed-line strength this view wants, 0..1 (read by the race view)
    this.snap();
  }
  snap() {
    const k = this.kart; this.yaw = k.yaw; this.y = k.y;
    this.pos.set(k.x - Math.sin(k.yaw) * this.dist, k.y + this.height, k.z - Math.cos(k.yaw) * this.dist);
    this.camera.position.copy(this.pos);
    for (const s of [this.surge, this.punchS, this.roll, this.dipS]) s.x = s.v = 0;
  }
  get motion() { return REDUCED.matches ? 0.25 : 1; }
  get shakeK() { return REDUCED.matches ? 0 : (this.shakeScale ?? 1); }
  addShake(a) { this.shake = Math.min(1.2, this.shake + a * this.shakeK); }
  /** A boost lands: the kart surges away from the lens and the view widens for a beat. s: 0..1 strength. */
  punch(s) { const m = this.motion; this.surge.v += s * 19 * m; this.punchS.v += s * 150 * m; }
  /** A hit lands on this kart: shake and a knock of the horizon, scaled by severity (0..1). side: -1..1. */
  impact(sev, side = 0) { this.addShake(0.35 + sev * 0.75); this.roll.v += (side || (Math.random() < 0.5 ? -1 : 1)) * (0.6 + sev * 1.4) * this.shakeK; }
  /** A heavy landing: the camera sinks with the kart and springs back. */
  dip(a) { this.dipS.v -= a * 3 * this.shakeK; }

  /** view: a KartView (for the interpolated position). aspect: viewport aspect ratio. */
  update(dt, view, aspect = 16 / 9) {
    const k = this.kart, cam = this.camera;
    this.t += dt;
    const p = view.pos;
    if (this.mode === 'orbit') {
      // victory lap: slow orbit around the kart
      const a = this.t * 0.55 + k.yaw;
      _want.set(p.x + Math.sin(a) * 6.5, p.y + 2.3, p.z + Math.cos(a) * 6.5);
      this.pos.lerp(_want, 1 - Math.exp(-3 * dt));
      cam.position.copy(this.pos); _look.set(p.x, p.y + 1.1, p.z); cam.lookAt(_look);
      this.fov = damp(this.fov, 48, 3, dt); cam.fov = this.fov; cam.updateProjectionMatrix();
      this.focus.copy(_look); this.lines = 0; return;
    }
    // follow the direction of travel, which swings less than the nose does in a drift
    const moving = k.speed > 4 && k.hitT <= 0;
    const velYaw = moving ? Math.atan2(k.vx, k.vz) : k.yaw;
    let target = moving ? velYaw + wrapAngle(view.yaw - velYaw) * 0.42 : view.yaw;
    if (k.fwd < -1) target = view.yaw;
    const rate = k.hitT > 0 ? 1.5 : k.rescueT > 0 ? 3 : 5.2 + clamp(k.speed / 30, 0, 1) * 2.5;
    this.yaw = dampAngle(this.yaw, target, rate, dt);
    const yaw = this.yaw + (this.rear ? Math.PI : 0);

    const speedN = clamp(k.speed / Math.max(1, k.baseTop), 0, 1.5);
    // how hard the current boost pushes, 0..1: a blue mini-turbo is about half a mushroom, the bullet is all of it
    const boost = k.bulletT > 0 ? 1 : k.boostT > 0 ? clamp((k.boostMul - 1) / 0.34, 0.35, 1) : 0;
    this.kick = damp(this.kick, boost, boost > this.kick ? 9 : 3, dt);
    const surge = spring(this.surge, 60, 14, dt), punch = spring(this.punchS, 90, 19, dt), roll = spring(this.roll, 120, 9, dt), dip = spring(this.dipS, 140, 15, dt);
    // speed lines (#222): only while boosting or at ~95%+ of top speed — at ordinary race speeds they
    // showed in nearly every frame and looked busy. A near-top-speed cruise draws a few on its own, a
    // building slipstream adds a few while gated in, and the strength fades in over ~0.2 s (fast out).
    const boosting = k.boostT > 0 || k.bulletT > 0, fast = speedN >= 0.95;
    const wantLines = (boosting || fast) ? Math.min(1, Math.max(boosting ? this.kick * clamp(speedN * 1.25, 0, 1) : 0, clamp((speedN - 0.95) * 3, 0, 0.45)) + (k.drafting && k.draftT > 0.3 ? 0.25 : 0)) : 0;
    this.lines = damp(this.lines, Math.min(1, wantLines), wantLines > this.lines ? 12 : 7, dt);
    // narrow split-screen views sit a bit further back
    const tall = (aspect < 1.2 ? 1.18 : 1) * (this.pullBack || 1);
    const dist = (this.dist + speedN * 0.7 - this.kick * 0.5 + surge) * tall * (k.shrinkT > 0 ? 0.8 : 1);
    const height = (this.height + (k.grounded ? 0 : 0.25)) * tall;
    this.y = damp(this.y, p.y, k.grounded ? 12 : 6, dt);
    _want.set(p.x - Math.sin(yaw) * dist, this.y + height + k.pitch * -1.2 + dip, p.z - Math.cos(yaw) * dist);
    // keep the camera above the ground behind the kart
    const gy = this.track.hasTerrain && !this.track.tunnel[k.hint] && !this.track.bridge[k.hint] ? Math.max(this.track.terrainHeight(_want.x, _want.z), -1e3) : -1e3;
    const road = this._g || (this._g = { y: 0 }); void road;
    if (_want.y < gy + 0.9) _want.y = gy + 0.9;
    this.pos.copy(_want);
    if (this.shake > 0.001) {
      const s = this.shake * 0.35;
      this.pos.x += (Math.random() - 0.5) * s; this.pos.y += (Math.random() - 0.5) * s; this.pos.z += (Math.random() - 0.5) * s;
      this.shake = damp(this.shake, 0, 7, dt);
    }
    cam.position.copy(this.pos);
    _look.set(p.x + Math.sin(yaw) * 4.2, this.y + 1.25 + k.pitch * 2.2, p.z + Math.cos(yaw) * 4.2);
    cam.lookAt(_look);
    // drift roll and boost field of view
    cam.rotation.z += clamp(-(k.yawRate || 0) * 0.018 * speedN, -0.05, 0.05) + clamp(roll * 0.33, -0.12, 0.12);
    const wantFov = this.baseFov + speedN * 5 + this.kick * 11 + (aspect < 1.2 ? 8 : 0);
    this.fov = damp(this.fov, wantFov, 6, dt);
    const fov = this.fov + clamp(punch, -4, 9);
    if (Math.abs(cam.fov - fov) > 0.01) { cam.fov = fov; cam.updateProjectionMatrix(); }
    this.focus.set(p.x + Math.sin(yaw) * 10, p.y, p.z + Math.cos(yaw) * 10);
    void lerp; void smoothstep;
  }
}

/** Pre-race flyover: a few sweeping shots of the course, then settle behind the grid. */
export class IntroCam {
  constructor(track, camera) {
    this.track = track; this.camera = camera; this.t = 0; this.done = false;
    const L = track.length;
    // a track may open with shots of its own: fixed cameras given as { pos, look, pos1?, look1?, fov?, dur }
    this.shots = [
      ...(track.def?.intro || []),
      { s0: L * 0.42, s1: L * 0.5, lat: 14, h: 16, look: 30, dur: 2.6 },
      { s0: L * 0.72, s1: L * 0.8, lat: -12, h: 9, look: 26, dur: 2.6 },
      { s0: L - 70, s1: L - 22, lat: 0, h: 5, look: 18, dur: 2.4 },
    ];
    this.total = this.shots.reduce((a, s) => a + s.dur, 0);
  }
  update(dt) {
    this.t += dt;
    let t = this.t, shot = this.shots[this.shots.length - 1];
    for (const s of this.shots) { if (t < s.dur) { shot = s; break; } t -= s.dur; }
    if (this.t >= this.total) { this.done = true; t = shot.dur; }
    this.shot = shot;
    const f = clamp(t / shot.dur, 0, 1), s = lerp(shot.s0, shot.s1, f);
    const P = this._p || (this._p = new THREE.Vector3()), Q = this._q || (this._q = new THREE.Vector3());
    if (shot.pos) { const a = shot.pos, b = shot.pos1 || a, c = shot.look, d = shot.look1 || c; P.set(lerp(a[0], b[0], f), lerp(a[1], b[1], f), lerp(a[2], b[2], f)); Q.set(lerp(c[0], d[0], f), lerp(c[1], d[1], f), lerp(c[2], d[2], f)); }
    else { this.track.pointAt(s, shot.lat, P, shot.h); this.track.pointAt(s + shot.look, 0, Q, 1); }
    this.camera.position.copy(P); this.camera.lookAt(Q);
    const fov = shot.fov || 52;
    if (this.camera.fov !== fov) { this.camera.fov = fov; this.camera.updateProjectionMatrix(); }
    return Q;
  }
}

/** Trackside television cameras for the attract mode: fixed positions that pan and zoom with the leaders. */
export class TvCam {
  constructor(kart, track) {
    this.kart = kart; this.track = track; this.mode = 'tv';
    this.camera = new THREE.PerspectiveCamera(40, 16 / 9, 0.3, 2600);
    for (let l = TAG_LAYER; l < TAG_LAYER + 6; l++) this.camera.layers.enable(l);
    this.focus = new THREE.Vector3(); this.look = new THREE.Vector3(); this.station = -1; this.fov = 40; this.t = 0; this.rear = false;
    this.spacing = 120;
  }
  snap() { this.station = -1; }
  addShake() {} punch() {} impact() {} dip() {}
  get lines() { return 0; }
  _place(k) {
    const tr = this.track, nat = Math.floor((k.s + 55) / this.spacing);
    if (nat !== this.nat) { this.nat = nat; this.ahead = 0; }
    const st = nat + (this.ahead || 0);   // `ahead` hands over early to the next camera when the kart is about to fill this one
    if (st === this.station) return;
    this.station = st;
    const s = st * this.spacing + this.spacing * 0.45, i = Math.floor(((s % tr.length) + tr.length) % tr.length / tr.ds) % tr.N;
    const side = st % 2 ? 1 : -1, hw = side > 0 ? tr.hwL[i] : tr.hwR[i], sh = side > 0 ? tr.shL[i] : tr.shR[i], open = (side > 0 ? tr.edgeL[i] : tr.edgeR[i]) === 0;
    // stand on the shoulder, or just inside a wall or rail: scenery never sits there, so the view is never inside a tree or a building
    const lat = side * (open ? hw + Math.min(3, sh * 0.8) : hw - 1.2), hx = Math.hypot(tr.lx[i], tr.lz[i]) || 1;
    const x = tr.px[i] + (tr.lx[i] / hx) * lat, z = tr.pz[i] + (tr.lz[i] / hx) * lat;
    const high = tr.tunnel[i] ? 3.4 : open ? 6.5 : 6;
    this.camera.position.set(x, tr.py[i] + (st % 3 === 0 && open && sh > 4 ? 3 : high), z);
    this.look.set(k.x, k.y + 1, k.z);
  }
  update(dt, view) {
    const k = this.kart, cam = this.camera, p = view.pos;
    this.t += dt; this._place(k);
    this.look.lerp(_look.set(p.x, p.y + 1.1, p.z), 1 - Math.exp(-9 * dt));
    cam.lookAt(this.look);
    const d = cam.position.distanceTo(this.look), want = clamp(900 / Math.max(8, d), 16, 58);
    if (d < 8.5 && !this.ahead) this.ahead = 1;   // never let a kart drive into the lens: a head filling the screen behind a menu
    this.fov = damp(this.fov, want, 3, dt);
    if (Math.abs(cam.fov - this.fov) > 0.05) { cam.fov = this.fov; cam.updateProjectionMatrix(); }
    this.focus.copy(this.look);
  }
}
