/* Pooled point-sprite particles, simulated on the CPU and drawn in two batches:
   additive (sparks, flames, glows) and soft alpha (dust, smoke, confetti). */
import * as THREE from 'three';
import { glowTexture, puffTexture, canvasTex } from './textures.js';

const VERT = /* glsl */`
  attribute float aSize; attribute vec4 aColor; attribute float aRot;
  uniform float uScale; varying vec4 vColor; varying float vRot;
  void main() {
    vColor = aColor; vRot = aRot;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * mv;
    gl_PointSize = aSize * uScale / max(0.1, -mv.z);
  }`;
const FRAG = /* glsl */`
  uniform sampler2D uMap; varying vec4 vColor; varying float vRot;
  void main() {
    vec2 p = gl_PointCoord - 0.5; float c = cos(vRot), s = sin(vRot);
    vec2 uv = vec2(c * p.x - s * p.y, s * p.x + c * p.y) + 0.5;
    vec4 t = texture2D(uMap, uv);
    gl_FragColor = vec4(vColor.rgb * t.rgb, vColor.a * t.a);
    if (gl_FragColor.a < 0.004) discard;
  }`;

class Batch {
  constructor(max, map, blending) {
    this.max = max; this.n = 0;
    this.pos = new Float32Array(max * 3); this.col = new Float32Array(max * 4); this.size = new Float32Array(max); this.rot = new Float32Array(max);
    this.vel = new Float32Array(max * 3); this.life = new Float32Array(max); this.maxLife = new Float32Array(max);
    this.grav = new Float32Array(max); this.drag = new Float32Array(max); this.grow = new Float32Array(max); this.size0 = new Float32Array(max);
    this.rgb = new Float32Array(max * 3); this.rgb2 = new Float32Array(max * 3); this.alpha = new Float32Array(max); this.spin = new Float32Array(max); this.fadeIn = new Float32Array(max);
    this.floorY = new Float32Array(max);
    const g = this.geo = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(this.pos, 3).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('aColor', new THREE.BufferAttribute(this.col, 4).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('aSize', new THREE.BufferAttribute(this.size, 1).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('aRot', new THREE.BufferAttribute(this.rot, 1).setUsage(THREE.DynamicDrawUsage));
    g.setDrawRange(0, 0);
    this.mat = new THREE.ShaderMaterial({ uniforms: { uMap: { value: map }, uScale: { value: 600 } }, vertexShader: VERT, fragmentShader: FRAG, transparent: true, depthWrite: false, blending });
    this.points = new THREE.Points(g, this.mat); this.points.frustumCulled = false; this.points.renderOrder = 20;
  }
  emit(o) {
    if (this.n >= this.max) return;
    const i = this.n++, p = i * 3;
    this.pos[p] = o.x; this.pos[p + 1] = o.y; this.pos[p + 2] = o.z;
    this.vel[p] = o.vx || 0; this.vel[p + 1] = o.vy || 0; this.vel[p + 2] = o.vz || 0;
    this.life[i] = this.maxLife[i] = o.life || 0.5;
    this.grav[i] = o.gravity || 0; this.drag[i] = o.drag || 0; this.grow[i] = o.grow || 0; this.size0[i] = o.size || 0.3;
    const c = o.color || WHITE, c2 = o.color2 || c;
    this.rgb[p] = c[0]; this.rgb[p + 1] = c[1]; this.rgb[p + 2] = c[2];
    this.rgb2[p] = c2[0]; this.rgb2[p + 1] = c2[1]; this.rgb2[p + 2] = c2[2];
    this.alpha[i] = o.alpha ?? 1; this.rot[i] = o.rot ?? Math.random() * 6.28; this.spin[i] = o.spin || 0; this.fadeIn[i] = o.fadeIn || 0;
    this.floorY[i] = o.floor ?? -1e9;
  }
  update(dt) {
    let n = this.n;
    for (let i = 0; i < n; i++) {
      this.life[i] -= dt;
      if (this.life[i] <= 0) { // swap-remove
        n--; if (i < n) this._move(n, i); i--; continue;
      }
      const p = i * 3, d = Math.exp(-this.drag[i] * dt);
      this.vel[p] *= d; this.vel[p + 1] = this.vel[p + 1] * d - this.grav[i] * dt; this.vel[p + 2] *= d;
      this.pos[p] += this.vel[p] * dt; this.pos[p + 1] += this.vel[p + 1] * dt; this.pos[p + 2] += this.vel[p + 2] * dt;
      if (this.pos[p + 1] < this.floorY[i]) { this.pos[p + 1] = this.floorY[i]; this.vel[p + 1] *= -0.45; this.vel[p] *= 0.7; this.vel[p + 2] *= 0.7; }
      const t = 1 - this.life[i] / this.maxLife[i];
      this.size[i] = this.size0[i] * (1 + this.grow[i] * t);
      this.rot[i] += this.spin[i] * dt;
      const c = i * 4;
      this.col[c] = this.rgb[p] + (this.rgb2[p] - this.rgb[p]) * t; this.col[c + 1] = this.rgb[p + 1] + (this.rgb2[p + 1] - this.rgb[p + 1]) * t; this.col[c + 2] = this.rgb[p + 2] + (this.rgb2[p + 2] - this.rgb[p + 2]) * t;
      const fin = this.fadeIn[i] > 0 ? Math.min(1, t / this.fadeIn[i]) : 1;
      this.col[c + 3] = this.alpha[i] * fin * (1 - t) * (1 - t * 0.3);
    }
    this.n = n;
    const g = this.geo;
    g.attributes.position.needsUpdate = true; g.attributes.aColor.needsUpdate = true; g.attributes.aSize.needsUpdate = true; g.attributes.aRot.needsUpdate = true;
    g.setDrawRange(0, n);
  }
  _move(from, to) {
    const a = from * 3, b = to * 3;
    for (let k = 0; k < 3; k++) { this.pos[b + k] = this.pos[a + k]; this.vel[b + k] = this.vel[a + k]; this.rgb[b + k] = this.rgb[a + k]; this.rgb2[b + k] = this.rgb2[a + k]; }
    this.life[to] = this.life[from]; this.maxLife[to] = this.maxLife[from]; this.grav[to] = this.grav[from]; this.drag[to] = this.drag[from]; this.grow[to] = this.grow[from];
    this.size0[to] = this.size0[from]; this.alpha[to] = this.alpha[from]; this.rot[to] = this.rot[from]; this.spin[to] = this.spin[from]; this.fadeIn[to] = this.fadeIn[from]; this.floorY[to] = this.floorY[from];
  }
}
const WHITE = [1, 1, 1];

export class Particles {
  constructor(scene, density = 1) {
    this.density = density;
    this.add = new Batch(3000, glowTexture(64), THREE.AdditiveBlending);
    this.smoke = new Batch(2200, puffTexture(128), THREE.NormalBlending);
    this.bits = new Batch(1400, canvasTex(32, 32, (g, w) => { g.fillStyle = '#fff'; g.fillRect(4, 8, w - 8, w - 16); }, { repeat: false, mip: false }), THREE.NormalBlending);
    scene.add(this.smoke.points, this.bits.points, this.add.points);
    this.acc = 0;
  }
  /** Call before rendering each view so point sizes match that viewport. */
  setViewport(heightPx, fovDeg) {
    const s = heightPx / (2 * Math.tan((fovDeg * Math.PI) / 360));
    this.add.mat.uniforms.uScale.value = s; this.smoke.mat.uniforms.uScale.value = s; this.bits.mat.uniforms.uScale.value = s;
  }
  update(dt) { this.add.update(dt); this.smoke.update(dt); this.bits.update(dt); }
  /** How many to emit this frame for a rate per second (handles fractional rates). */
  count(rate, dt) { const f = rate * dt * this.density; const n = Math.floor(f); return n + (Math.random() < f - n ? 1 : 0); }

  spark(x, y, z, vx, vy, vz, color, size = 0.22, life = 0.4) {
    this.add.emit({ x, y, z, vx, vy, vz, color, color2: [color[0] * 0.6, color[1] * 0.4, color[2] * 0.3], size, life, gravity: 14, drag: 1.2, alpha: 1.0 });
  }
  dust(x, y, z, vx, vy, vz, color, size = 0.9, life = 0.7, alpha = 0.5) {
    this.smoke.emit({ x, y, z, vx, vy, vz, color, size, life, grow: 2.2, drag: 2.5, gravity: -1.2, alpha, spin: (Math.random() - 0.5) * 2 });
  }
  flame(x, y, z, vx, vy, vz, color, size = 0.6, life = 0.22) {
    this.add.emit({ x, y, z, vx, vy, vz, color, color2: [1, 0.25, 0.05], size, life, grow: -0.6, drag: 3, alpha: 0.75 });
  }
  burst(x, y, z, n, color, speed = 8, size = 0.3, life = 0.6, up = 4) {
    for (let i = 0; i < n * this.density; i++) {
      const a = Math.random() * 6.283, e = Math.random() * 1.2 - 0.2, s = speed * (0.4 + Math.random() * 0.8);
      this.spark(x, y, z, Math.cos(a) * Math.cos(e) * s, Math.sin(e) * s + up, Math.sin(a) * Math.cos(e) * s, color, size * (0.6 + Math.random() * 0.8), life * (0.6 + Math.random() * 0.8));
    }
  }
  puff(x, y, z, n, color, speed = 4, size = 1.4, life = 0.9, alpha = 0.6) {
    for (let i = 0; i < n * this.density; i++) {
      const a = Math.random() * 6.283, s = speed * (0.3 + Math.random() * 0.9);
      this.dust(x + Math.cos(a) * 0.3, y + Math.random() * 0.5, z + Math.sin(a) * 0.3, Math.cos(a) * s, 1 + Math.random() * 2.5, Math.sin(a) * s, color, size * (0.7 + Math.random() * 0.7), life * (0.7 + Math.random() * 0.6), alpha);
    }
  }
  confetti(x, y, z, n, colors, speed = 9, floor = -1e9) {
    for (let i = 0; i < n * this.density; i++) {
      const a = Math.random() * 6.283, s = speed * (0.3 + Math.random() * 0.9), c = colors[Math.floor(Math.random() * colors.length)];
      this.bits.emit({ x, y, z, vx: Math.cos(a) * s, vy: 5 + Math.random() * 9, vz: Math.sin(a) * s, color: c, size: 0.22 + Math.random() * 0.2, life: 1.6 + Math.random() * 1.6, gravity: 11, drag: 1.4, alpha: 1.5, spin: (Math.random() - 0.5) * 16, floor });
    }
  }
  ring(x, y, z, n, color, speed, size = 0.5, life = 0.5) {
    for (let i = 0; i < n * this.density; i++) { const a = (i / n) * 6.283; this.add.emit({ x, y, z, vx: Math.cos(a) * speed, vy: 0.5, vz: Math.sin(a) * speed, color, size, life, drag: 1.5, alpha: 1.5 }); }
  }
}

export const rgbOf = hex => { const c = new THREE.Color(hex); return [c.r, c.g, c.b]; };
