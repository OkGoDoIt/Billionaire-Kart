/* Chase camera for one player: trails the kart's direction of travel, widens the
   view under boost, shakes on impacts, and has intro and finish shots. */
import * as THREE from 'three';
import { clamp, lerp, damp, dampAngle, wrapAngle, smoothstep } from '../core/util.js';
import { TAG_LAYER } from './kartview.js';

const _look = new THREE.Vector3(), _want = new THREE.Vector3();

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
    this.snap();
  }
  snap() {
    const k = this.kart; this.yaw = k.yaw; this.y = k.y;
    this.pos.set(k.x - Math.sin(k.yaw) * this.dist, k.y + this.height, k.z - Math.cos(k.yaw) * this.dist);
    this.camera.position.copy(this.pos);
  }
  addShake(a) { this.shake = Math.min(1.2, this.shake + a); }

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
      this.focus.copy(_look); return;
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
    const boost = k.boostT > 0 || k.bulletT > 0 ? 1 : 0;
    this.kick = damp(this.kick, boost, boost ? 9 : 3, dt);
    // narrow split-screen views sit a bit further back
    const tall = aspect < 1.2 ? 1.18 : 1;
    const dist = (this.dist + speedN * 0.7 - this.kick * 0.5) * tall * (k.shrinkT > 0 ? 0.8 : 1);
    const height = (this.height + (k.grounded ? 0 : 0.25)) * tall;
    this.y = damp(this.y, p.y, k.grounded ? 12 : 6, dt);
    _want.set(p.x - Math.sin(yaw) * dist, this.y + height + k.pitch * -1.2, p.z - Math.cos(yaw) * dist);
    // keep the camera above the ground behind the kart
    const gy = this.track.hasTerrain ? Math.max(this.track.terrainHeight(_want.x, _want.z), -1e3) : -1e3;
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
    cam.rotation.z += clamp(-(k.yawRate || 0) * 0.018 * speedN, -0.05, 0.05);
    const wantFov = this.baseFov + speedN * 5 + this.kick * 11 + (aspect < 1.2 ? 8 : 0);
    this.fov = damp(this.fov, wantFov, 6, dt);
    if (Math.abs(cam.fov - this.fov) > 0.01) { cam.fov = this.fov; cam.updateProjectionMatrix(); }
    this.focus.set(p.x + Math.sin(yaw) * 10, p.y, p.z + Math.cos(yaw) * 10);
    void lerp; void smoothstep;
  }
}

/** Pre-race flyover: a few sweeping shots of the course, then settle behind the grid. */
export class IntroCam {
  constructor(track, camera) {
    this.track = track; this.camera = camera; this.t = 0; this.done = false;
    const L = track.length;
    this.shots = [
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
    const f = clamp(t / shot.dur, 0, 1), s = lerp(shot.s0, shot.s1, f);
    const P = this._p || (this._p = new THREE.Vector3()), Q = this._q || (this._q = new THREE.Vector3());
    this.track.pointAt(s, shot.lat, P, shot.h); this.track.pointAt(s + shot.look, 0, Q, 1);
    this.camera.position.copy(P); this.camera.lookAt(Q);
    if (this.camera.fov !== 52) { this.camera.fov = 52; this.camera.updateProjectionMatrix(); }
    return Q;
  }
}
