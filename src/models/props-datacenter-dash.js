/* Props for Datacenter Dash: server racks and halls, cooling towers, pines,
   street lamps, power pylons, dish clusters, transformers, holographic boards,
   and the steam-vent obstacle. Each builder returns a THREE.Group sitting on
   y = 0, facing +Z, made of a few merged meshes. Canvas textures are only made
   when a builder runs (browser only). */
import * as THREE from 'three';
import { ModelBuilder, box, sphere, cyl, cone, torus, lathe, plastic, glow, MAT } from './build.js';
import { canvasTex } from '../render/textures.js';
import { makeRng } from '../core/util.js';

const FONT = '"Luckiest Guy", "Arial Black", sans-serif';
const hex = c => '#' + new THREE.Color(c).getHexString();
const DARK = plastic(0x141a28, 0.55, 0.3), STEEL = plastic(0x5d6678, 0.4, 0.7), CONCRETE = plastic(0x6f7888, 0.9);
const _q = new THREE.Quaternion(), _e = new THREE.Euler(), _a = new THREE.Vector3(), _up = new THREE.Vector3(0, 1, 0);

/** A round beam from point a to point c (for lattices and struts). */
function strut(b, mat, a, c, r = 0.1, seg = 5) {
  _a.set(c[0] - a[0], c[1] - a[1], c[2] - a[2]);
  const len = _a.length(); _a.normalize();
  _q.setFromUnitVectors(_up, _a); _e.setFromQuaternion(_q);
  b.add(mat, cyl(r, r, len, seg, true), { p: [(a[0] + c[0]) / 2, (a[1] + c[1]) / 2, (a[2] + c[2]) / 2], r: [_e.x, _e.y, _e.z] });
}
const cube = (w, h, d) => new THREE.BoxGeometry(w, h, d);

/* ---------- the server hall ---------- */
/** A run of three rack cabinets, 2.9 m wide, with rows of blinking-looking LEDs on the front (+Z). */
export function serverRack({ w = 2.9, h = 2.9, d = 1.0, seed = 3 } = {}) {
  const rng = makeRng(seed), b = new ModelBuilder(), n = 3, cw = w / n;
  const leds = ['g', 'c', 'a'];
  for (let c = 0; c < n; c++) {
    const x = -w / 2 + cw * (c + 0.5);
    b.add('cab', box(cw - 0.05, h, d, 0.04, 1), { p: [x, h / 2, 0] });
    b.add('trim', cube(cw - 0.01, 0.12, d + 0.05), { p: [x, h - 0.06, 0] });
    b.add('trim', cube(cw - 0.01, 0.16, d + 0.05), { p: [x, 0.08, 0] });
    for (let r = 0; r < 12; r++) {
      const y = 0.42 + r * ((h - 0.8) / 11);
      b.add('unit', cube(cw - 0.2, 0.13, 0.03), { p: [x, y, d / 2 + 0.02] });
      const k = Math.floor(rng() * 3), m = 1 + Math.floor(rng() * 3);
      for (let j = 0; j < m; j++) b.add(leds[(k + (rng() < 0.3 ? 1 : 0)) % 3], cube(0.06, 0.04, 0.02), { p: [x - cw / 2 + 0.2 + j * 0.1, y, d / 2 + 0.045] });
      if (rng() < 0.35) b.add('c', cube(0.22, 0.025, 0.02), { p: [x + cw / 2 - 0.26, y, d / 2 + 0.045] });
    }
    b.add('strip', cube(0.04, h - 0.5, 0.02), { p: [x + cw / 2 - 0.08, h / 2, d / 2 + 0.045] });
  }
  return b.build({
    cab: plastic(0x0e121c, 0.45, 0.4), trim: plastic(0x2a3348, 0.4, 0.6), unit: plastic(0x262e40, 0.35, 0.5),
    g: glow(0x3dff7a, 3.2), c: glow(0x35e0ff, 3.2), a: glow(0xffb020, 3.2), strip: glow(0x35e0ff, 1.4),
  }, { cast: false });
}

/** Rack label texture for hall signs. */
function hallSign(label, color) {
  return canvasTex(512, 128, (g, w, h) => {
    g.fillStyle = '#070b16'; g.fillRect(0, 0, w, h);
    g.font = `78px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.shadowColor = hex(color); g.shadowBlur = 18; g.fillStyle = hex(color); g.fillText(label, w / 2, h / 2 + 5, w - 40);
  }, { repeat: false, aniso: 8 });
}

/** Long, dark server hall: louvred walls between pilasters, a glowing roofline, chillers on the roof.
    Long axis along X, front face at +Z. label: optional sign on the front. */
export function serverHall({ L = 60, W = 24, H = 14, accent = 0x35e0ff, label = null } = {}) {
  const grp = new THREE.Group(), b = new ModelBuilder();
  b.add('body', box(L, H, W, 0.5, 2), { p: [0, H / 2, 0] });
  b.add('plinth', box(L + 0.8, 0.9, W + 0.8, 0.2, 1), { p: [0, 0.45, 0] });
  b.add('cap', box(L + 0.6, 0.6, W + 0.6, 0.2, 1), { p: [0, H + 0.1, 0] });
  const bays = Math.max(2, Math.round(L / 7)), bw = L / bays;
  for (const s of [1, -1]) {
    for (let i = 0; i <= bays; i++) b.add('pil', box(0.7, H - 0.4, 0.7, 0.15, 1), { p: [-L / 2 + i * bw, H / 2, s * (W / 2 + 0.2)] });
    for (let i = 0; i < bays; i++) {
      const x = -L / 2 + bw * (i + 0.5);
      for (let k = 0; k < 7; k++) b.add('louvre', cube(bw - 1.2, 0.22, 0.5), { p: [x, 2.6 + k * 1.05, s * (W / 2 + 0.12)], r: [s * 0.55, 0, 0] });
      b.add('dim', cube(bw - 1.2, 0.12, 0.08), { p: [x, 1.5, s * (W / 2 + 0.3)] });
    }
    b.add('glow', cube(L + 0.4, 0.3, 0.3), { p: [0, H - 0.55, s * (W / 2 + 0.35)] });
  }
  for (const s of [1, -1]) {
    b.add('glow', cube(0.3, 0.3, W + 0.4), { p: [s * (L / 2 + 0.35), H - 0.55, 0] });
    b.add('louvre', cube(0.4, H * 0.5, W * 0.6), { p: [s * (L / 2 + 0.1), H * 0.45, 0] });
  }
  // chillers on the roof
  const nc = Math.max(2, Math.floor(L / 9));
  for (let i = 0; i < nc; i++) for (const z of [-W * 0.22, W * 0.22]) {
    const x = -L / 2 + (L / nc) * (i + 0.5);
    b.add('unit', box(5.2, 1.6, 4.2, 0.3, 2), { p: [x, H + 1.2, z] });
    b.add('fan', cyl(1.5, 1.5, 0.2, 14), { p: [x - 1.2, H + 2.05, z] });
    b.add('fan', cyl(1.5, 1.5, 0.2, 14), { p: [x + 1.3, H + 2.05, z] });
  }
  grp.add(b.build({
    body: plastic(0x182030, 0.6, 0.2), plinth: plastic(0x2a3242, 0.8), cap: plastic(0x232b3c, 0.6),
    pil: plastic(0x232c3f, 0.55, 0.3), louvre: plastic(0x3a465c, 0.45, 0.5), dim: glow(accent, 0.9),
    glow: glow(accent, 2.4), unit: plastic(0x3a4256, 0.6, 0.3), fan: plastic(0x0e1018, 0.5),
  }));
  if (label) {
    const tex = hallSign(label, accent);
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(9, 2.25), new THREE.MeshStandardMaterial({ map: tex, emissiveMap: tex, emissive: 0xffffff, emissiveIntensity: 1.2, roughness: 0.5 }));
    sign.position.set(-L / 2 + 8, H - 2.6, W / 2 + 0.62); grp.add(sign);
  }
  return grp;
}

/* ---------- cooling ---------- */
/** Hyperboloid cooling tower, about 30 m tall: pale concrete, a glowing ring, a lit interior. userData.top is the rim height. */
export function coolingTower({ H = 30, accent = 0x35e0ff } = {}) {
  const grp = new THREE.Group(), b = new ModelBuilder();
  const R0 = 12.5, Rw = 7.6, yw = H * 0.72, c = yw / Math.sqrt((R0 / Rw) ** 2 - 1), base = 3;
  const r = y => Rw * Math.sqrt(1 + ((y - yw) / c) ** 2);
  const prof = []; for (let k = 0; k <= 14; k++) { const y = base + (H - base) * (k / 14); prof.push([r(y - base * (1 - k / 14)), y]); }
  const shell = lathe(prof, 40);
  b.add('shell', shell);
  for (let i = 0; i < 28; i++) {               // slanted support columns at the foot
    const a = (i / 28) * Math.PI * 2, a2 = a + 0.12;
    strut(b, 'col', [Math.cos(a) * (R0 + 0.6), 0, Math.sin(a) * (R0 + 0.6)], [Math.cos(a2) * prof[0][0], base + 0.2, Math.sin(a2) * prof[0][0]], 0.28, 6);
  }
  b.add('basin', cyl(R0 + 2.6, R0 + 2.8, 1.0, 40), { p: [0, 0.5, 0] });
  b.add('rim', torus(prof[14][0], 0.35, 6, 40), { p: [0, H, 0], r: [Math.PI / 2, 0, 0] });
  b.add('ring', torus(r(H * 0.86) + 0.12, 0.28, 6, 48), { p: [0, H * 0.86, 0], r: [Math.PI / 2, 0, 0] });
  b.add('ring', torus(r(H * 0.82) + 0.12, 0.16, 6, 48), { p: [0, H * 0.82, 0], r: [Math.PI / 2, 0, 0] });
  b.add('inner', cyl(r(H * 0.6) - 0.3, r(H * 0.6) - 0.3, 0.2, 32), { p: [0, H * 0.6, 0] });
  for (let i = 0; i < 4; i++) { const a = (i / 4) * Math.PI * 2 + 0.4; b.add('red', sphere(0.35, 8, 6), { p: [Math.cos(a) * (prof[14][0] + 0.3), H + 0.3, Math.sin(a) * (prof[14][0] + 0.3)] }); }
  grp.add(b.build({
    shell: new THREE.MeshStandardMaterial({ color: 0xb4bcc8, roughness: 0.92, emissive: 0x1c2a3c, emissiveIntensity: 0.6, side: THREE.DoubleSide }),
    col: CONCRETE, basin: CONCRETE, rim: plastic(0x9aa3b0, 0.9),
    ring: glow(accent, 2.6), inner: glow(0x2a8aa0, 0.6), red: glow(0xff2a2a, 4),
  }));
  grp.userData.top = H;
  grp.userData.rimR = prof[14][0];
  return grp;
}

/* ---------- the valley ---------- */
/** Dark pine: a trunk and stacked cones in two shades. */
export function pine(seed = 1, { h = 11, colorA = 0x173d2c, colorB = 0x1f4d37 } = {}) {
  const rng = makeRng(seed), b = new ModelBuilder();
  b.add('bark', cyl(0.18, 0.3, h * 0.3, 6), { p: [0, h * 0.15, 0] });
  const tiers = 4;
  for (let i = 0; i < tiers; i++) {
    const t = i / tiers, rr = h * (0.3 - t * 0.055) * (0.92 + rng() * 0.16), hh = h * 0.36;
    b.add(i % 2 ? 'b' : 'a', cone(rr, hh, 8), { p: [0, h * (0.22 + t * 0.2) + hh / 2, 0], r: [0, rng() * 3, 0] });
  }
  return b.build({ bark: plastic(0x3a2a22, 0.95), a: plastic(colorA, 0.9), b: plastic(colorB, 0.9) });
}

/** Street lamp: a pole with an arm reaching toward the road (+Z) and a glowing head. */
export function streetLamp({ h = 8, color = 0xc8f6ff } = {}) {
  const b = new ModelBuilder();
  b.add('base', cyl(0.32, 0.4, 0.6, 8), { p: [0, 0.3, 0] });
  b.add('pole', cyl(0.09, 0.14, h, 8), { p: [0, h / 2, 0] });
  b.add('pole', box(0.16, 0.16, 2.4, 0.05, 1), { p: [0, h - 0.1, 1.1] });
  b.add('pole', box(0.7, 0.24, 1.2, 0.08, 2), { p: [0, h - 0.18, 2.2] });
  b.add('head', cube(0.5, 0.06, 0.95), { p: [0, h - 0.32, 2.2] });
  b.add('ring', cube(0.1, 0.5, 0.1), { p: [0, 1.6, 0.12] });
  return b.build({ base: DARK, pole: plastic(0x2a3242, 0.5, 0.5), head: glow(color, 3.2), ring: glow(0x35e0ff, 1.5) }, { cast: false });
}

/** Steel lattice power pylon with cross-arms and a red warning light. userData.arms: wire attachment points (local). */
export function pylon({ h = 32 } = {}) {
  const grp = new THREE.Group(), b = new ModelBuilder();
  const w0 = 3.6, w1 = 1.0, top = h * 0.82;
  const half = y => w0 + (w1 - w0) * Math.min(1, y / top);
  const levels = [0, h * 0.18, h * 0.36, h * 0.52, h * 0.66, top];
  const corners = [[1, 1], [1, -1], [-1, -1], [-1, 1]];
  for (const [sx, sz] of corners) strut(b, 's', [sx * w0, 0, sz * w0], [sx * w1, top, sz * w1], 0.16, 5);
  for (let l = 0; l < levels.length - 1; l++) {
    const y0 = levels[l], y1 = levels[l + 1], a = half(y0), c = half(y1);
    for (let k = 0; k < 4; k++) {
      const [ax, az] = corners[k], [bx, bz] = corners[(k + 1) % 4];
      strut(b, 's', [ax * a, y0, az * a], [bx * c, y1, bz * c], 0.07, 4);
      strut(b, 's', [bx * a, y0, bz * a], [ax * c, y1, az * c], 0.07, 4);
      strut(b, 's', [ax * c, y1, az * c], [bx * c, y1, bz * c], 0.07, 4);
    }
  }
  strut(b, 's', [-w1, top, 0], [0, h, 0], 0.1, 4); strut(b, 's', [w1, top, 0], [0, h, 0], 0.1, 4);
  const arms = [];
  for (const [y, span] of [[h * 0.66, 8], [top, 6.2]]) {
    b.add('s', box(span * 2, 0.5, 0.9, 0.1, 1), { p: [0, y, 0] });
    for (const sx of [1, -1]) {
      const x = sx * (span - 0.4);
      b.add('ins', cyl(0.18, 0.18, 1.8, 8), { p: [x, y - 1.2, 0] });
      for (let k = 0; k < 4; k++) b.add('ins', cyl(0.32, 0.32, 0.08, 10), { p: [x, y - 0.5 - k * 0.42, 0] });
      arms.push([x, y - 2.1, 0]);
    }
  }
  b.add('red', sphere(0.4, 10, 8), { p: [0, h + 0.4, 0] });
  grp.add(b.build({ s: plastic(0x8a94a6, 0.45, 0.7), ins: plastic(0xb8c2d0, 0.3), red: glow(0xff2a2a, 5) }));
  grp.userData.arms = arms;
  return grp;
}

/** Three satellite dishes on pedestals, pointing at the sky, on a shared pad. */
export function dishCluster({ seed = 2 } = {}) {
  const rng = makeRng(seed), b = new ModelBuilder();
  b.add('pad', box(22, 0.6, 12, 0.2, 1), { p: [0, 0.3, 0] });
  const prof = []; const R = 3.4, f = 2.6; for (let k = 0; k <= 8; k++) { const rr = (k / 8) * R; prof.push([rr, (rr * rr) / (4 * f)]); }
  const dish = lathe(prof, 24);
  [[-7, 0, 1.0], [0, 1, 1.25], [7, -0.5, 0.85]].forEach(([x, z, s]) => {
    const yaw = rng() * Math.PI * 2, tilt = 0.5 + rng() * 0.45, ph = 4.2 * s;
    b.add('ped', cyl(0.5 * s, 0.8 * s, ph, 10), { p: [x, ph / 2 + 0.6, z] });
    b.add('ped', box(1.6 * s, 0.9 * s, 1.2 * s, 0.15, 1), { p: [x, ph + 0.8, z] });
    const cx = x, cy = ph + 1.4 * s, cz = z;
    const g = dish.clone(); g.scale(s, s, s); g.rotateX(-tilt); g.rotateY(yaw);
    b.add('dish', g, { p: [cx, cy, cz] });
    // the feed horn on three struts
    const ax = new THREE.Vector3(0, 1, 0).applyEuler(new THREE.Euler(-tilt, 0, 0)).applyAxisAngle(_up, yaw);
    const fp = [cx + ax.x * f * s, cy + ax.y * f * s, cz + ax.z * f * s];
    for (let k = 0; k < 3; k++) {
      const a = (k / 3) * Math.PI * 2, v = new THREE.Vector3(Math.cos(a) * R * 0.9 * s, (R * 0.9) ** 2 / (4 * f) * s, Math.sin(a) * R * 0.9 * s).applyEuler(new THREE.Euler(-tilt, 0, 0)).applyAxisAngle(_up, yaw);
      strut(b, 'ped', [cx + v.x, cy + v.y, cz + v.z], fp, 0.05 * s, 4);
    }
    b.add('feed', sphere(0.3 * s, 10, 8), { p: fp });
  });
  return b.build({ pad: CONCRETE, ped: plastic(0xc8ced8, 0.5), dish: new THREE.MeshStandardMaterial({ color: 0xe8ecf2, roughness: 0.5, side: THREE.DoubleSide, emissive: 0x1c2a3c, emissiveIntensity: 0.5 }), feed: glow(0xff3df0, 3) });
}

/** Chunky substation transformer: a ribbed tank, three insulator bushings, a status light. About 3.6 m across. */
export function transformer() {
  const b = new ModelBuilder();
  b.add('plinth', box(4.6, 0.5, 3.6, 0.1, 1), { p: [0, 0.25, 0] });
  b.add('tank', box(3.4, 2.6, 2.4, 0.25, 2), { p: [0, 1.8, 0] });
  for (const s of [1, -1]) for (let i = 0; i < 7; i++) b.add('fin', box(0.12, 2.0, 0.55, 0.04, 1), { p: [-1.35 + i * 0.45, 1.75, s * 1.45] });
  b.add('band', box(3.46, 0.22, 2.46, 0.05, 1), { p: [0, 2.7, 0] });
  for (let i = 0; i < 3; i++) {
    const x = -1 + i;
    b.add('ins', cyl(0.14, 0.18, 1.3, 8), { p: [x, 3.7, 0] });
    for (let k = 0; k < 4; k++) b.add('ins', cyl(0.3, 0.3, 0.08, 10), { p: [x, 3.25 + k * 0.28, 0] });
    b.add('tip', sphere(0.16, 8, 6), { p: [x, 4.4, 0] });
  }
  b.add('lamp', box(0.3, 0.3, 0.1, 0.05, 1), { p: [1.2, 2.2, 1.22] });
  return b.build({ plinth: CONCRETE, tank: plastic(0x8a94a6, 0.5, 0.4), fin: plastic(0x6a7486, 0.5, 0.4), band: plastic(0xffc928, 0.5), ins: plastic(0xa86a4a, 0.35), tip: glow(0x35e0ff, 2.4), lamp: glow(0x3dff7a, 3) });
}

/** Holographic billboard: glowing text on a dark panel, with neon edge strips. */
export function holoBoard(text, { w = 14, h = 5, legs = 6, color = 0x35e0ff, color2 = 0xff3df0 } = {}) {
  const grp = new THREE.Group(), b = new ModelBuilder();
  for (const sx of [1, -1]) b.add('f', cyl(0.25, 0.3, legs + h * 0.5, 8), { p: [sx * w * 0.32, (legs + h * 0.5) / 2, -0.4] });
  b.add('f', box(w + 0.8, h + 0.8, 0.5, 0.15, 2), { p: [0, legs + h / 2, -0.32] });
  b.add('edge', cube(w + 0.9, 0.18, 0.2), { p: [0, legs + h + 0.42, 0.0] });
  b.add('edge', cube(w + 0.9, 0.18, 0.2), { p: [0, legs - 0.42, 0.0] });
  for (const sx of [1, -1]) b.add('edge2', cube(0.18, h + 0.9, 0.2), { p: [sx * (w / 2 + 0.42), legs + h / 2, 0.0] });
  grp.add(b.build({ f: plastic(0x10141e, 0.5, 0.4), edge: glow(color2, 2.4), edge2: glow(color, 2.4) }));
  const tex = canvasTex(1024, Math.round(1024 * h / w), (g, W, Hh) => {
    const gr = g.createLinearGradient(0, 0, 0, Hh); gr.addColorStop(0, '#0a1230'); gr.addColorStop(1, '#050816'); g.fillStyle = gr; g.fillRect(0, 0, W, Hh);
    g.strokeStyle = 'rgba(53,224,255,0.10)'; g.lineWidth = 1; for (let y = 0; y < Hh; y += 6) { g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke(); }
    let s = Math.round(Hh * 0.5); g.font = `${s}px ${FONT}`;
    while (g.measureText(text).width > W - 70 && s > 20) { s -= 4; g.font = `${s}px ${FONT}`; }
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.shadowColor = hex(color); g.shadowBlur = 24; g.fillStyle = hex(color); g.fillText(text, W / 2, Hh / 2 + 6);
    g.shadowBlur = 0; g.fillStyle = 'rgba(255,255,255,0.75)'; g.fillText(text, W / 2, Hh / 2 + 6);
    g.fillStyle = hex(color2); g.fillRect(30, Hh - 26, 120, 8); g.fillRect(W - 150, 18, 120, 8);
  }, { repeat: false, aniso: 8 });
  const panel = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map: tex, emissiveMap: tex, emissive: 0xffffff, emissiveIntensity: 1.0, roughness: 0.4 }));
  panel.position.set(0, legs + h / 2, 0.0); grp.add(panel);
  return grp;
}

/** Floodlight mast: a tall pole with a bank of lamps tilted down toward +Z. */
export function floodMast({ h = 18, color = 0xdff6ff } = {}) {
  const b = new ModelBuilder();
  b.add('pole', cyl(0.22, 0.38, h, 8), { p: [0, h / 2, 0] });
  b.add('pole', box(3.6, 0.25, 0.3, 0.05, 1), { p: [0, h, 0.2] });
  for (let i = 0; i < 4; i++) {
    b.add('frame', box(0.8, 0.6, 0.35, 0.08, 1), { p: [-1.35 + i * 0.9, h + 0.5, 0.35], r: [0.6, 0, 0] });
    b.add('lamp', cube(0.66, 0.46, 0.05), { p: [-1.35 + i * 0.9, h + 0.42, 0.55], r: [0.6, 0, 0] });
  }
  return b.build({ pole: plastic(0x2a3242, 0.5, 0.5), frame: DARK, lamp: glow(color, 3.5) }, { cast: false });
}

/** Backup generator: a container-sized box with a glowing status band and two exhaust stacks. Long axis along X. */
export function generator() {
  const b = new ModelBuilder();
  b.add('body', box(6.4, 2.8, 2.6, 0.2, 2), { p: [0, 1.6, 0] });
  b.add('skid', box(6.8, 0.25, 2.9, 0.05, 1), { p: [0, 0.12, 0] });
  for (let i = 0; i < 5; i++) b.add('rib', cube(0.12, 2.4, 2.7), { p: [-2.6 + i * 1.3, 1.6, 0] });
  b.add('band', cube(6.45, 0.14, 2.65), { p: [0, 2.6, 0] });
  for (const x of [-1.8, 1.8]) { b.add('stack', cyl(0.22, 0.26, 1.6, 8), { p: [x, 3.6, 0.6] }); b.add('band2', cyl(0.27, 0.27, 0.1, 8), { p: [x, 4.0, 0.6] }); }
  return b.build({ body: plastic(0x4a5466, 0.5, 0.3), skid: DARK, rib: plastic(0x3a4354, 0.5, 0.3), band: glow(0x35e0ff, 1.6), stack: STEEL, band2: glow(0xff3df0, 1.6) });
}

/* ---------- obstacle ---------- */
/** Steam vent: a floor grate that blasts a white column of steam when active. userData.setActive toggles it. */
export function vent() {
  const grp = new THREE.Group(), b = new ModelBuilder();
  b.add('frame', box(2.6, 0.14, 2.6, 0.05, 1), { p: [0, 0.07, 0] });
  for (let i = 0; i < 6; i++) b.add('bar', cube(2.1, 0.06, 0.12), { p: [0, 0.16, -0.95 + i * 0.38] });
  b.add('glow', cube(2.3, 0.04, 2.3), { p: [0, 0.1, 0] });
  for (const [x, z] of [[1.2, 1.2], [-1.2, 1.2], [1.2, -1.2], [-1.2, -1.2]]) b.add('stripe', cube(0.28, 0.18, 0.28), { p: [x, 0.12, z] });
  grp.add(b.build({ frame: MAT.dark, bar: plastic(0x5a6474, 0.4, 0.6), glow: glow(0xff8a3c, 1.4), stripe: plastic(0xffc928, 0.5) }));
  const mat = new THREE.MeshBasicMaterial({ color: 0xb8d0e6, transparent: true, opacity: 0.26, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
  const col = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 0.75, 5.5, 14, 1, true), mat);
  const core = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.5, 4.2, 12, 1, true), mat);
  col.position.y = 2.9; core.position.y = 2.2; grp.add(col, core);
  grp.userData.setActive = (on, warn, t) => {
    col.visible = core.visible = on || warn;
    const s = on ? 1 + Math.sin(t * 30) * 0.08 : 0.3;
    col.scale.set(s, on ? 1 + Math.sin(t * 23) * 0.1 : 0.15, s); core.scale.set(s, on ? 1 : 0.2, s);
    col.position.y = on ? 2.9 : 0.5; core.position.y = on ? 2.2 : 0.4;
  };
  return grp;
}
