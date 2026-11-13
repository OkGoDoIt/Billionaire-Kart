/* The visual side of one kart: interpolates the sim state, animates the rig
   (lean, squash, bobblehead, wheels, spin-outs), and emits its particles. */
import * as THREE from 'three';
import { buildKart, KART } from '../models/kart.js';
import { buildItemModel, TRAIL_MODEL } from '../models/items.js';
import { canvasTex } from './textures.js';
import { clamp, lerp, damp, wrapAngle, easeOutCubic, smoothstep } from '../core/util.js';
import { rgbOf } from './particles.js';

const TIER_RGB = [[0.75, 0.8, 0.9], [0.25, 0.65, 1.0], [1.0, 0.55, 0.1], [0.95, 0.3, 1.0]];
const TIER_HEX = [0xffffff, 0x40a8ff, 0xff8a1a, 0xf04dff];
const ghostMat = new THREE.MeshBasicMaterial({ color: 0xbfe6ff, transparent: true, opacity: 0.32, depthWrite: false });
const _v = new THREE.Vector3(), _c = new THREE.Color();
const BLOB_GEO = new THREE.CircleGeometry(1, 20);
/* Star halo: a rainbow ring that spins on the ground under a starred kart. Vertex colours carry the
   rainbow so the spin reads; additive so it glows over any surface, road or grass. */
const HALO_GEO = (() => {
  const g = new THREE.RingGeometry(1.15, 1.8, 48), p = g.attributes.position, c = new Float32Array(p.count * 3), col = new THREE.Color();
  for (let i = 0; i < p.count; i++) { col.setHSL(((Math.atan2(p.getY(i), p.getX(i)) / (Math.PI * 2)) + 1) % 1, 1, 0.6); c[i * 3] = col.r; c[i * 3 + 1] = col.g; c[i * 3 + 2] = col.b; }
  g.setAttribute('color', new THREE.BufferAttribute(c, 3));
  return g;
})();
/* Boost flame: a cone with its mouth at the origin and its tip along +y, so scaling y stretches it away from the exhaust. */
const FLAME_GEO = (() => {
  const g = new THREE.ConeGeometry(0.15, 0.8, 12, 4, true).translate(0, 0.4, 0), p = g.attributes.position, c = new Float32Array(p.count * 3);
  // additive, so fading the colour to black toward the tip fades the flame out. The base is clamped at zero:
  // a negative one makes NaN, and a single NaN pixel turns the whole frame black in the bloom pass.
  for (let i = 0; i < p.count; i++) { const f = Math.pow(Math.max(0, 1 - p.getY(i) / 0.8), 1.4); c[i * 3] = c[i * 3 + 1] = c[i * 3 + 2] = f; }
  g.setAttribute('color', new THREE.BufferAttribute(c, 3));
  return g;
})();
const BLOB_MAT = new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.42, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3 });
export const TAG_LAYER = 4;

/* Name tags. Every tag in the running race is in TAGS; just before a camera draws them, the tags are sorted nearest
   first and a tag that would land on a nearer one, or on that camera's own kart, fades out. Each camera keeps its own
   fade per tag, so split-screen views declutter independently, and a fade (not a pop) keeps a bunched pack calm. */
const TAGS = new Set(), _tp = new THREE.Vector3(), _ts = new THREE.Vector3(), _plans = new WeakMap();
const TAG_FADE = 8;   // per second
function tagRect(cam, x, y, z, hw, hh, out) {
  _tp.set(x, y, z).applyMatrix4(cam.matrixWorldInverse);
  if (_tp.z > -0.5) return null;   // behind the camera, or in the lens
  const P = cam.projectionMatrix.elements, d = -_tp.z, cx = (P[0] * _tp.x + P[8] * _tp.z) / d, cy = (P[5] * _tp.y + P[9] * _tp.z) / d;
  const w = hw * P[0] / d, h = hh * P[5] / d;
  out.l = cx - w; out.r = cx + w; out.b = cy - h; out.t = cy + h; out.d = d; return out;
}
const hits = (a, b, m) => a.l - m * (a.r - a.l) < b.r && b.l < a.r + m * (a.r - a.l) && a.b - m * (a.t - a.b) < b.t && b.b < a.t + m * (a.t - a.b);
function tagPlan(cam, scene, frame) {
  let plan = _plans.get(cam);
  if (plan && plan.frame === frame) return plan;
  if (!plan) _plans.set(cam, plan = { frame, want: new Map() });
  plan.frame = frame; plan.want.clear();
  let own = null; const list = [];
  for (const kv of TAGS) {
    let top = kv.rig.root; while (top.parent) top = top.parent;
    if (top !== scene) { if (!top.isScene) TAGS.delete(kv); continue; }   // a finished race's karts
    const tag = kv.tag;
    if (!cam.layers.test(tag.layers)) { if (kv.kart.isPlayer) own = kv; continue; }
    if (!tag.visible || !kv.rig.root.visible || tag.userData.base <= 0.02) continue;
    _ts.setFromMatrixPosition(tag.matrixWorld);
    const r = tagRect(cam, _ts.x, _ts.y, _ts.z, tag.scale.x * 0.5 * tag.userData.wFrac, tag.scale.y * 0.5 * tag.userData.hFrac, { kv });
    if (r) list.push(r);
  }
  // the camera's own kart, driver and all: no tag is drawn over it
  const mine = own && tagRect(cam, own.pos.x, own.pos.y + 1.1, own.pos.z, 1.3 * own.scale, 1.25 * own.scale, {});
  list.sort((a, b) => a.d - b.d);
  const shown = [];
  for (const r of list) {
    const was = (r.kv.tag.userData.fade.get(cam) ?? 1) > 0.5, m = was ? 0.04 : 0.15;   // a little hysteresis, so two tags at the edge do not flicker
    const ok = !(mine && hits(r, mine, 0)) && !shown.some(s => hits(r, s, m));
    if (ok) shown.push(r);
    plan.want.set(r.kv, ok ? 1 : 0);
  }
  return plan;
}
function declutter(renderer, scene, cam) {
  const kv = this.userData.view; if (!kv) return;
  const plan = tagPlan(cam, scene, renderer.info.render.frame), fade = this.userData.fade, now = performance.now();
  const last = this.userData.last.get(cam) ?? now, dt = Math.min(0.1, (now - last) / 1000); this.userData.last.set(cam, now);
  const v = fade.get(cam) ?? 1, want = plan.want.get(kv) ?? 0;
  const next = want > v ? Math.min(want, v + dt * TAG_FADE) : Math.max(want, v - dt * TAG_FADE);
  fade.set(cam, next);
  this.material.opacity = this.userData.base * next;
}

function nameTag(racer, isPlayer, pIndex) {
  const text = isPlayer ? `P${pIndex + 1}` : racer.name;
  let pill = 1;
  const tex = canvasTex(256, 72, (g, w, h) => {
    g.font = '40px "Luckiest Guy", "Arial Black", sans-serif';
    const tw = Math.min(w - 36, g.measureText(text).width), bw = tw + 44, x = (w - bw) / 2; pill = bw / w;
    g.fillStyle = 'rgba(14,16,34,0.78)'; g.beginPath(); g.roundRect(x, 8, bw, 50, 25); g.fill();
    g.fillStyle = '#' + new THREE.Color(racer.color).getHexString(); g.beginPath(); g.roundRect(x, 8, 12, 50, [25, 0, 0, 25]); g.fill();
    g.fillStyle = '#fff'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(text, w / 2 + 4, 35, w - 40);
  }, { repeat: false, mip: true });
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, fog: false, sizeAttenuation: true }));
  s.scale.set(2.3, 0.65, 1); s.renderOrder = 30;
  s.userData = { wFrac: pill, hFrac: 50 / 72, base: 0, fade: new WeakMap(), last: new WeakMap() };
  s.onBeforeRender = declutter;
  return s;
}

export class KartView {
  constructor(kart, scene, fx, { shadow = true } = {}) {
    this.kart = kart; this.fx = fx;
    const rig = this.rig = buildKart(kart.racer, { shadow });
    scene.add(rig.root);
    this.prev = { x: kart.x, y: kart.y, z: kart.z, yaw: kart.yaw, pitch: 0, roll: 0 };
    this.pos = new THREE.Vector3(kart.x, kart.y, kart.z); this.yaw = kart.yaw;
    this.driftVis = 0; this.leanVis = 0; this.wheelAngle = 0; this.steerVis = 0;
    this.bob = { x: 0, vx: 0, z: 0, vz: 0, y: 0, vy: 0 };       // head spring (pitch, roll, yaw)
    this.susp = { y: 0, v: 0 }; this.squash = 0; this.stretch = 0; this.scale = 1; this.flat = 1;
    this.lastFwd = 0; this.t = Math.random() * 10; this.trailMesh = null; this.trailType = null; this.orbit = [];
    this.ghost = false; this.origMats = null;
    // per-kart paint so the hype-cycle star can flash it
    this.paint = rig.mainMat.clone(); this.baseColor = this.paint.color.clone();
    rig.bodyMesh.traverse(o => { if (o.isMesh && o.material === rig.mainMat) o.material = this.paint; });
    // name tag
    this.tag = nameTag(kart.racer, kart.isPlayer, kart.playerIndex);
    this.tag.position.set(0, 2.75, 0); this.tag.layers.set(kart.isPlayer ? TAG_LAYER + 1 + kart.playerIndex : TAG_LAYER);
    rig.root.add(this.tag); this.tag.userData.view = this; TAGS.add(this);
    // soft contact shadow, used when real shadows are off (low quality, or three or more split-screen views)
    this.blob = new THREE.Mesh(BLOB_GEO, BLOB_MAT); this.blob.rotation.x = -Math.PI / 2; this.blob.renderOrder = 3; this.blob.visible = false; scene.add(this.blob);
    // spinning rainbow halo on the ground while the hype-cycle star is active — readable from any camera, at any size
    this.halo = new THREE.Mesh(HALO_GEO, new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
    this.halo.rotation.x = -Math.PI / 2; this.halo.renderOrder = 4; this.halo.visible = false; scene.add(this.halo);
    // boost glow at the exhausts
    this.flames = rig.exhausts.map(a => {
      const m = new THREE.Mesh(FLAME_GEO, new THREE.MeshBasicMaterial({ color: 0xffa040, vertexColors: true, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
      m.rotation.x = -Math.PI / 2 + 0.1; m.visible = false; a.add(m); return m;   // straight back from the exhaust, tipped up a touch
    });
  }

  /** Call right before each sim step. */
  snapshot() { const k = this.kart, p = this.prev; p.x = k.x; p.y = k.y; p.z = k.z; p.yaw = k.yaw; p.pitch = k.pitch; p.roll = k.roll; }

  /** React to a sim event with a one-shot animation impulse. */
  onEvent(e) {
    const b = this.bob;
    switch (e.type) {
      case 'hit': b.vx += 9; b.vz += (Math.random() - 0.5) * 16; break;
      case 'land': b.vx += clamp(e.data * 0.5, 1, 7); this.susp.v -= clamp(e.data * 0.35, 1, 6); break;
      case 'boost': b.vx -= 7; this.stretch = 1; break;
      case 'bump': b.vz += (Math.random() < 0.5 ? -1 : 1) * clamp(e.data.v, 2, 8); break;
      case 'wall': b.vz += e.data.side * 8; this.susp.v += 2; break;
      case 'hop': this.susp.v += 2.5; break;
      case 'itemReady': b.vx -= 3; break;
    }
  }

  update(dt, alpha, time, camPos) {
    const k = this.kart, rig = this.rig, p = this.prev, fx = this.fx;
    this.t += dt;
    // interpolated transform
    const x = lerp(p.x, k.x, alpha), y = lerp(p.y, k.y, alpha), z = lerp(p.z, k.z, alpha);
    const yaw = p.yaw + wrapAngle(k.yaw - p.yaw) * alpha;
    this.pos.set(x, y, z); this.yaw = yaw;
    rig.root.position.set(x, y, z);

    // drift attitude: nose swings further into the corner, body leans
    const dv = k.drifting ? -k.driftDir * 0.26 : 0;
    this.driftVis = damp(this.driftVis, dv, 9, dt);
    const leanTarget = k.drifting ? k.driftDir * 0.1 : clamp(-k.steer * 0.05 * clamp(k.speed / 20, 0, 1), -0.07, 0.07) * -1;
    this.leanVis = damp(this.leanVis, leanTarget, 8, dt);

    // spin-outs and tumbles
    let extraYaw = 0, flip = 0, hitLift = 0;
    if (k.hitT > 0 && k.hitDur > 0) {
      const t = 1 - k.hitT / k.hitDur;
      if (k.hitKind === 'spin') extraYaw = easeOutCubic(t) * Math.PI * 4;
      else if (k.hitKind === 'tumble') { flip = easeOutCubic(t) * Math.PI * 4; extraYaw = t * Math.PI * 2; hitLift = Math.sin(t * Math.PI) * 0.5; }
      else if (k.hitKind === 'burnout') extraYaw = Math.sin(this.t * 40) * 0.05;
      else if (k.hitKind === 'zap') extraYaw = Math.sin(this.t * 60) * 0.12;
    }
    const trickRot = k.trick ? Math.min(1, k.trickSpin / 0.55) : 0;
    rig.root.rotation.set(0, yaw + this.driftVis + extraYaw + (k.trick && k.trickDir !== 0 ? -k.trickDir * easeOutCubic(trickRot) * Math.PI * 2 : 0), 0);
    const pitch = lerp(p.pitch, k.pitch, alpha), roll = lerp(p.roll, k.roll, alpha);
    rig.tilt.rotation.set(-pitch + flip + (k.trick && k.trickDir === 0 ? -easeOutCubic(trickRot) * Math.PI * 2 : 0), 0, roll + this.leanVis);
    rig.tilt.position.y = hitLift + (k.rescueT > 0 ? Math.sin(this.t * 3) * 0.08 : 0);

    // squash and stretch
    this.squash = damp(this.squash, k.landed > 0 ? k.landed : 0, 14, dt);
    this.stretch = damp(this.stretch, 0, 5, dt);
    const targetScale = k.shrinkT > 0 ? 0.55 : 1;
    this.scale = damp(this.scale, targetScale, 9, dt);
    this.flat = damp(this.flat, k.squashT > 0 ? 0.32 : 1, 12, dt);
    const sq = this.squash * 0.22, st = this.stretch * 0.1;
    const starPulse = k.starT > 0 ? 1 + Math.sin(this.t * 17) * 0.03 : 1;   // a starred kart visibly throbs with the music's beat
    rig.tilt.scale.set(this.scale * starPulse * (1 + sq * 0.6 - st * 0.4), this.scale * starPulse * (1 - sq) * this.flat, this.scale * starPulse * (1 + sq * 0.4 + st));

    // suspension bounce and surface rumble
    const s = this.susp;
    s.v += (-s.y * 220 - s.v * 16) * dt; s.y += s.v * dt;
    const rumble = k.grounded ? (k.surface.rumble || 0) * clamp(k.speed / 25, 0, 1) : 0;
    rig.body.position.y = clamp(s.y, -0.12, 0.2) + (rumble ? Math.sin(this.t * 55) * 0.018 * rumble : 0) + Math.sin(this.t * 31) * 0.004 * clamp(k.speed / 30, 0.2, 1);
    rig.body.rotation.z = rumble ? Math.sin(this.t * 47) * 0.012 * rumble : 0;

    // wheels
    this.wheelAngle += (k.fwd / 0.34) * dt;
    for (const w of rig.wheels) w.rotation.x = this.wheelAngle;
    if (rig.spinners) for (const r of rig.spinners) r.rotation.z += dt * (6 + Math.abs(k.speed) * 1.4);   // cooling fans and propellers
    this.steerVis = damp(this.steerVis, k.drifting ? -k.driftDir * (0.25 - k.steer * k.driftDir * 0.3) : k.steer, 14, dt);
    for (const pv of rig.steerPivots) { pv.rotation.y = -this.steerVis * 0.5; pv.position.y = pv.userData.baseY - clamp(s.y, -0.05, 0.08) * 0.3; }
    rig.steering.rotation.z = -this.steerVis * 1.3;

    // driver: lean into turns, bobblehead on a spring
    const accel = (k.fwd - this.lastFwd) / Math.max(dt, 1e-3); this.lastFwd = k.fwd;
    const b = this.bob, K = 150, D = 9;
    const tx = clamp(-accel * 0.006, -0.22, 0.3) + (k.boosting ? -0.16 : 0), tz = clamp((k.yawRate || 0) * k.speed * 0.0045, -0.3, 0.3);
    b.vx += ((tx - b.x) * K - b.vx * D) * dt; b.x += b.vx * dt;
    b.vz += ((tz - b.z) * K - b.vz * D) * dt; b.z += b.vz * dt;
    const hy = clamp(-this.steerVis * 0.4, -0.5, 0.5);
    b.y = damp(b.y, hy, 7, dt);
    const dizzy = k.hitT > 0 ? Math.sin(this.t * 22) * 0.25 : 0;
    for (const head of [rig.head, rig.head2]) { if (!head) continue; head.rotation.set(clamp(b.x, -0.6, 0.6), b.y + dizzy, clamp(b.z, -0.6, 0.6)); }
    rig.torso.rotation.z = clamp(this.steerVis * -0.1 + b.z * 0.25, -0.25, 0.25);
    rig.torso.rotation.x = clamp(b.x * 0.3, -0.15, 0.2);
    if (k.finished && k.finishRank <= 3) { rig.torso.rotation.x = -0.12 + Math.sin(this.t * 9) * 0.05; }

    // visibility states
    const blink = k.invulnT > 0 && k.hitT <= 0 && k.rescueT <= 0 && Math.floor(this.t * 16) % 2 === 0;
    rig.tilt.visible = !blink;
    this._ghost(k.ghostT > 0);
    // hype-cycle rainbow: fast cycle, and a blink in the last 1.6 s so the expiry never surprises (Mario Kart warns the same way)
    if (k.starT > 0) { _c.setHSL((this.t * 2.2) % 1, 1, 0.55); this.paint.color.copy(_c); this.paint.emissive.copy(_c); this.paint.emissiveIntensity = k.starT < 1.6 ? (Math.floor(this.t * 10) % 2 ? 0.95 : 0.2) : 0.95; }
    else if (this.paint.emissiveIntensity > 0) { this.paint.color.copy(this.baseColor); this.paint.emissive.setRGB(0, 0, 0); this.paint.emissiveIntensity = 0; }
    // the halo rides the ground under the kart, pulsing; it blinks with the paint as the star runs out
    if (k.starT > 0) {
      this.halo.visible = true;
      this.halo.position.set(x, k.gy + 0.09, z);
      this.halo.rotation.z = -this.t * 2.6;
      const hs = this.scale * (1.12 + Math.sin(this.t * 10) * 0.07);
      this.halo.scale.set(hs, hs, 1);
      this.halo.material.opacity = (k.starT < 1.6 && Math.floor(this.t * 10) % 2 === 0 ? 0.25 : 0.62);
    } else this.halo.visible = false;

    if (this.blob.visible) { const h = clamp(k.y - k.gy, 0, 6), sc = this.scale * (1 + h * 0.12); this.blob.position.set(x, k.gy + 0.06, z); this.blob.scale.set(sc * 1.25, sc * 1.6, 1); this.blob.rotation.z = -yaw; this.blob.material.opacity = 0.42; }
    this._trail(dt);
    this._particles(dt);
    // name tags fade with distance and hide for karts right next to the camera
    // (declutter() then fades out any that would land on a nearer tag or on the viewer's own kart)
    if (camPos) { const d = camPos.distanceTo(this.pos), o = this.tag.userData.base = clamp((60 - d) / 20, 0, 1) * clamp((d - 9) / 5, 0, 1) * 0.92 * (k.rescueT > 0 ? 0.3 : 1); this.tag.material.opacity = o; this.tag.visible = o > 0.02; }
    this.tag.position.y = 2.75 * this.scale;
    void time;
  }

  _ghost(on) {
    if (on === this.ghost) return;
    this.ghost = on;
    if (on) { this.origMats = new Map(); this.rig.tilt.traverse(o => { if (o.isMesh && o.material !== ghostMat) { this.origMats.set(o, o.material); o.material = ghostMat; o.castShadow = false; } }); }
    else if (this.origMats) { for (const [o, m] of this.origMats) { o.material = m; o.castShadow = true; } this.origMats = null; }
  }

  /** Show the held item trailing behind (or circling, for triples). */
  _trail(dt) {
    const k = this.kart, type = k.item ? TRAIL_MODEL[k.item] : null, n = type ? (k.item === 'subpoena3' ? k.itemUses : 1) : 0;
    const key = type ? type + ':' + n : null;
    if (key !== this.trailType) {
      for (const m of this.orbit) this.rig.tilt.remove(m);
      this.orbit = [];
      for (let i = 0; i < n; i++) { const m = buildItemModel(type); m.scale.setScalar(type === 'leak' ? 0.8 : 0.7); this.rig.tilt.add(m); this.orbit.push(m); }
      this.trailType = key; this.orbitT = 0;
    }
    if (!this.orbit.length) return;
    this.orbitT += dt;
    if (k.item === 'subpoena3') {
      this.orbit.forEach((m, i) => { const a = this.orbitT * 4 + (i / 3) * Math.PI * 2; m.position.set(Math.sin(a) * 1.7, 0.25, Math.cos(a) * 1.7); m.rotation.y = a + Math.PI / 2; if (m.userData.spin) m.userData.spin.rotation.x = this.orbitT * 12; });
    } else {
      const m = this.orbit[0];
      m.position.set(Math.sin(this.orbitT * 6) * 0.06 - this.steerVis * 0.25, 0.05 + Math.abs(Math.sin(this.orbitT * 9)) * 0.06, -2.0);
      if (m.userData.wings) for (const w of m.userData.wings) w.rotation.z = Math.sin(this.orbitT * 18) * 0.7 * Math.sign(w.scale.x);
    }
  }

  _particles(dt) {
    const k = this.kart, fx = this.fx, rig = this.rig;
    if (k.rescueT > 0) return;
    const sy = Math.sin(this.yaw), cy = Math.cos(this.yaw);
    const sp = k.speed;
    // rear wheel positions in the world
    const rear = side => { rig.rearWheelsFx[side].getWorldPosition(_v); return _v; };
    // drifting: sparks in the colour of the charge tier, plus tyre smoke
    if (k.drifting && k.grounded) {
      const tier = k.driftTier, col = TIER_RGB[tier];
      // charge paused on the dirt (#147: the drift survives offroad, the charge does not
      // grow) — flicker the sparks between the tier colour and a dull grey so the pause
      // reads at a glance instead of looking like the drift died
      const sparkCol = k.driftPaused && Math.sin(this.t * 26) > -0.25 ? [0.42, 0.42, 0.46] : col;
      for (let sd = 0; sd < 2; sd++) {
        const w = rear(sd);
        const n = fx.count(tier ? 70 + tier * 30 : 18, dt);
        for (let i = 0; i < n; i++) fx.spark(w.x, w.y + 0.05, w.z, -sy * sp * 0.25 + (Math.random() - 0.5) * 5 + cy * k.driftDir * 3, 2.5 + Math.random() * (3 + tier * 1.5), -cy * sp * 0.25 + (Math.random() - 0.5) * 5 - sy * k.driftDir * 3, sparkCol, tier ? 0.2 + tier * 0.06 : 0.12, 0.25 + tier * 0.06);
        if (fx.count(26, dt)) fx.dust(w.x, w.y + 0.1, w.z, -sy * 2, 0.8, -cy * 2, [0.85, 0.85, 0.88], 0.7, 0.55, 0.28);
      }
    }
    // dust off the road
    const dustHex = k.surface.dust;
    if (dustHex && k.grounded && sp > 5) {
      const c = rgbOf(dustHex), rate = (k.surface.offroad ? 60 : 16) * clamp(sp / 20, 0.2, 1.2);
      for (let sd = 0; sd < 2; sd++) { const n = fx.count(rate, dt); if (!n) continue; const w = rear(sd); for (let i = 0; i < n; i++) fx.dust(w.x, w.y + 0.1, w.z, -sy * sp * 0.2 + (Math.random() - 0.5) * 2, 1 + Math.random() * 1.5, -cy * sp * 0.2 + (Math.random() - 0.5) * 2, c, 0.8 + Math.random() * 0.6, 0.7, k.surface.offroad ? 0.5 : 0.3); }
    }
    // boost flames
    const boosting = k.boostT > 0 || k.bulletT > 0;
    const tierCol = k.boostKind === 'mini' ? null : null;
    void tierCol;
    for (let i = 0; i < 2; i++) {
      const f = this.flames[i]; f.visible = boosting;
      if (boosting) {
        const len = 0.7 + Math.random() * 0.35 + (k.boostMul - 1) * 1.2; f.scale.set(1 + Math.random() * 0.2, len, 1 + Math.random() * 0.2);
        f.material.color.setHex(k.starT > 0 ? 0xffffff : k.boostKind === 'mini' ? 0x66c2ff : k.boostKind === 'draft' ? 0xbfe8ff : 0xffa040);
        rig.exhausts[i].getWorldPosition(_v);
        const n = fx.count(45, dt);
        const col = k.boostKind === 'mini' ? [0.25, 0.6, 1] : [1, 0.62, 0.18];
        for (let j = 0; j < n; j++) fx.flame(_v.x, _v.y, _v.z, -sy * 6 + (Math.random() - 0.5) * 2, 0.5 + Math.random(), -cy * 6 + (Math.random() - 0.5) * 2, col, 0.3 + Math.random() * 0.2, 0.16 + Math.random() * 0.1);
      }
    }
    // idle and accelerating exhaust puffs
    if (!boosting && k.grounded && sp < 8 && fx.count(7, dt)) { rig.exhausts[Math.random() < 0.5 ? 0 : 1].getWorldPosition(_v); fx.dust(_v.x, _v.y, _v.z, -sy * 1.5, 0.8, -cy * 1.5, [0.6, 0.62, 0.66], 0.28, 0.4, 0.16); }
    // slipstream streaks
    if (k.drafting && k.draftT > 0.2) { const n = fx.count(40, dt); for (let i = 0; i < n; i++) { const ox = (Math.random() - 0.5) * 2.2, oy = 0.3 + Math.random() * 1.4; fx.add.emit({ x: this.pos.x + cy * ox + sy * 2.5, y: this.pos.y + oy, z: this.pos.z - sy * ox + cy * 2.5, vx: -sy * sp * 0.7, vy: 0, vz: -cy * sp * 0.7, color: [0.8, 0.95, 1], size: 0.14, life: 0.22, alpha: 0.8 }); } }
    // hype-cycle sparkles: a dense rainbow wake streaming behind the kart, not a faint halo of dust
    if (k.starT > 0) { const n = fx.count(110, dt); for (let i = 0; i < n; i++) { _c.setHSL(Math.random(), 1, 0.62); fx.add.emit({ x: this.pos.x + (Math.random() - 0.5) * 1.8, y: this.pos.y + 0.2 + Math.random() * 1.8, z: this.pos.z + (Math.random() - 0.5) * 1.8, vx: -sy * sp * 0.35 + (Math.random() - 0.5) * 1.5, vy: 0.9, vz: -cy * sp * 0.35 + (Math.random() - 0.5) * 1.5, color: [_c.r, _c.g, _c.b], size: 0.21, life: 0.5, alpha: 1.1 }); } }
    // revving on the grid
    if (k.revving && fx.count(22, dt)) { rig.exhausts[Math.random() < 0.5 ? 0 : 1].getWorldPosition(_v); fx.dust(_v.x, _v.y, _v.z, -sy * 3 + (Math.random() - 0.5) * 2, 1.2, -cy * 3 + (Math.random() - 0.5) * 2, [0.62, 0.63, 0.66], 0.45, 0.5, 0.3); }
    void TIER_HEX; void KART; void smoothstep;
  }

  dispose(scene) { TAGS.delete(this); scene.remove(this.rig.root); scene.remove(this.blob); scene.remove(this.halo); this.halo.material.dispose(); this.paint.dispose(); this.tag.material.map.dispose(); this.tag.material.dispose(); }
}
