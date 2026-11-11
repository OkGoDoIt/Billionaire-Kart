/* Props for Burning Circuit: the Figure, the ring of fire, the temple, domes,
   tents, trailers, neon art, string lights, art cars, and dust devils.
   Each builder returns a THREE.Group on y = 0, facing +Z, made of a few merged
   meshes. Nothing here touches the DOM at import time. */
import * as THREE from 'three';
import { ModelBuilder, box, sphere, cyl, cone, torus, tube, lathe, loft, plastic, glow, paint, MAT } from './build.js';

const tintable = (color, rough = 0.85) => { const m = new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: 0, envMapIntensity: 0.5 }); m.userData.tintable = true; return m; };
const WOOD = plastic(0xb98250, 0.85), WOOD_DARK = plastic(0x7c4f2e, 0.9), WOOD_PALE = plastic(0xd8a96c, 0.85);
const CANVAS = tintable(0xf3ead8, 0.9);

/** A box stretched between two points (for struts, braces, and neon strokes). */
function strut(b, mat, a, c, w = 0.3, d = w) {
  const dx = c[0] - a[0], dy = c[1] - a[1], dz = c[2] - a[2], len = Math.hypot(dx, dy, dz);
  const g = new THREE.BoxGeometry(w, len, d);
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(dx / len, dy / len, dz / len));
  g.applyQuaternion(q); g.translate((a[0] + c[0]) / 2, (a[1] + c[1]) / 2, (a[2] + c[2]) / 2);
  b.add(mat, g);
}
/** A tapered cylinder between two points. */
function limb(b, mat, a, c, r0, r1, seg = 8) {
  const dx = c[0] - a[0], dy = c[1] - a[1], dz = c[2] - a[2], len = Math.hypot(dx, dy, dz);
  const g = new THREE.CylinderGeometry(r1, r0, len, seg);
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(dx / len, dy / len, dz / len));
  g.applyQuaternion(q); g.translate((a[0] + c[0]) / 2, (a[1] + c[1]) / 2, (a[2] + c[2]) / 2);
  b.add(mat, g);
}

/* ---------- the Figure ---------- */
/** The giant wooden effigy on a stepped octagonal base. Base top is userData.baseTop;
    userData.feet lists [x,y,z] points for the ring of little flames. */
export function figure({ h = 30 } = {}) {
  const b = new ModelBuilder(), s = h / 30;
  // stepped base
  const tiers = [[12, 1.6], [9.2, 1.5], [6.6, 1.5]];
  let y = 0;
  tiers.forEach(([r, th], i) => {
    b.add(i % 2 ? 'woodB' : 'wood', cyl(r, r + 0.3, th, 8), { p: [0, y + th / 2, 0], r: [0, Math.PI / 8, 0] });
    b.add('dark', cyl(r + 0.35, r + 0.35, 0.22, 8), { p: [0, y + th - 0.05, 0], r: [0, Math.PI / 8, 0] });
    y += th;
  });
  const top = y;
  // stairs on four sides
  for (let k = 0; k < 4; k++) { const a = k * Math.PI / 2; for (let st = 0; st < 3; st++) b.add('woodB', box(4, 0.5, 1.4, 0.06, 1), { p: [Math.sin(a) * (12.4 - st * 0.9), 0.25 + st * 0.5, Math.cos(a) * (12.4 - st * 0.9)], r: [0, a, 0] }); }
  // lanterns around the base
  for (let k = 0; k < 8; k++) { const a = (k + 0.5) * Math.PI / 4; b.add('lamp', sphere(0.45, 10, 8), { p: [Math.sin(a) * 11.4, 2.2, Math.cos(a) * 11.4] }); b.add('dark', cyl(0.08, 0.08, 0.7, 5), { p: [Math.sin(a) * 11.4, 1.8, Math.cos(a) * 11.4] }); }
  // legs
  const Y = v => top + v * s;
  for (const sx of [-1, 1]) {
    limb(b, 'wood', [sx * 3.2 * s, Y(0), 0], [sx * 1.4 * s, Y(12), 0], 1.0 * s, 1.3 * s, 6);
    b.add('woodB', box(2.6 * s, 0.9 * s, 3.2 * s, 0.2, 2), { p: [sx * 3.3 * s, Y(0.45), 0.4 * s] });
    for (const v of [3.5, 7, 10]) b.add('dark', box(2.9 * s, 0.35 * s, 2.9 * s, 0.05, 1), { p: [sx * (3.2 - (v / 12) * 1.8) * s, Y(v), 0] });
    // neon along the outside of each leg
    b.add('neon', tube([[sx * 4.2 * s, Y(0.6), 0], [sx * 3.4 * s, Y(6), 0], [sx * 2.6 * s, Y(12), 0]], 0.13 * s, 12, 6));
  }
  // hips, torso, shoulders (tapered box from a lofted shell)
  b.add('woodB', box(4.6 * s, 1.4 * s, 2.6 * s, 0.3, 2), { p: [0, Y(12.4), 0] });
  b.add('wood', loft([{ z: 0, w: 1.9 * s, h: 1.1 * s, y: 0, n: 4 }, { z: 4.5 * s, w: 2.4 * s, h: 1.2 * s, y: 0, n: 4 }, { z: 9 * s, w: 3.4 * s, h: 1.3 * s, y: 0, n: 4 }], 16, 3), { p: [0, Y(12.8), 0], r: [-Math.PI / 2, 0, 0] });
  for (const v of [15, 18]) b.add('dark', box((4.2 + (v - 15) * 0.25) * s, 0.35 * s, 2.7 * s, 0.05, 1), { p: [0, Y(v), 0] });
  b.add('woodB', box(7.6 * s, 1.2 * s, 2.8 * s, 0.4, 2), { p: [0, Y(21.6), 0] });
  b.add('neon', tube([[-2.3 * s, Y(12.9), 1.35 * s], [-3.1 * s, Y(17), 1.35 * s], [-3.6 * s, Y(21.2), 1.35 * s]], 0.13 * s, 10, 6));
  b.add('neon', tube([[2.3 * s, Y(12.9), 1.35 * s], [3.1 * s, Y(17), 1.35 * s], [3.6 * s, Y(21.2), 1.35 * s]], 0.13 * s, 10, 6));
  // a lit heart in the chest
  b.add('heart', sphere(0.9 * s, 12, 10), { p: [0, Y(18.5), 1.25 * s], s: [1, 1, 0.5] });
  // arms raised in a V
  for (const sx of [-1, 1]) {
    limb(b, 'wood', [sx * 3.4 * s, Y(21.6), 0], [sx * 7.4 * s, Y(27.2), 0], 0.75 * s, 0.55 * s, 6);
    limb(b, 'wood', [sx * 7.4 * s, Y(27.2), 0], [sx * 9.2 * s, Y(30), 0], 0.55 * s, 0.42 * s, 6);
    b.add('woodB', sphere(0.75 * s, 8, 6), { p: [sx * 7.4 * s, Y(27.2), 0] });
    b.add('woodB', box(0.9 * s, 1.6 * s, 1.1 * s, 0.25, 2), { p: [sx * 9.4 * s, Y(30.4), 0], r: [0, 0, -sx * 0.6] });
    b.add('neon', tube([[sx * 3.8 * s, Y(22.4), 0.6 * s], [sx * 7.6 * s, Y(27.9), 0.6 * s], [sx * 9.3 * s, Y(30.6), 0.5 * s]], 0.12 * s, 12, 6));
  }
  // neck and the lantern head
  b.add('dark', cyl(0.6 * s, 0.8 * s, 1.4 * s, 8), { p: [0, Y(22.8), 0] });
  b.add('wood', cone(1.7 * s, 2.4 * s, 4), { p: [0, Y(24.9), 0], r: [Math.PI, Math.PI / 4, 0] });
  b.add('wood', cone(1.7 * s, 3.0 * s, 4), { p: [0, Y(27.2), 0], r: [0, Math.PI / 4, 0] });
  b.add('neon', torus(1.75 * s, 0.12 * s, 6, 4), { p: [0, Y(26.1), 0], r: [Math.PI / 2, 0, Math.PI / 4] });
  b.add('lamp', sphere(0.55 * s, 10, 8), { p: [0, Y(26.0), 0] });
  const g = b.build({ wood: WOOD, woodB: WOOD_PALE, dark: WOOD_DARK, neon: glow(0x46d6ff, 3.2), heart: glow(0xff5a3c, 3.5), lamp: glow(0xffc46a, 3) });
  const feet = []; for (let k = 0; k < 14; k++) { const a = (k / 14) * Math.PI * 2; feet.push([Math.sin(a) * 6.0, top + 0.2, Math.cos(a) * 6.0]); }
  g.userData.baseTop = top; g.userData.feet = feet; g.userData.h = top + 31 * s;
  return g;
}

/* ---------- the ring of fire ---------- */
/** A hoop of diameter d standing across a road of half-width hw; its bottom is
    `clear` metres above the road. userData.rim lists [x,y,z] points around it. */
export function fireHoop({ d = 14, hw = 8.5, clear = 1.6 } = {}) {
  const b = new ModelBuilder(), R = d / 2, cy = clear + R, foot = hw + 1.5;
  b.add('steel', torus(R, 0.42, 10, 56), { p: [0, cy, 0] });
  b.add('glow', torus(R - 0.5, 0.14, 6, 56), { p: [0, cy, 0.3] });
  b.add('glow', torus(R - 0.5, 0.14, 6, 56), { p: [0, cy, -0.3] });
  for (let k = 0; k < 16; k++) { const a = (k / 16) * Math.PI * 2; b.add('dark', box(0.9, 0.5, 1.2, 0.1, 1), { p: [Math.cos(a) * R, cy + Math.sin(a) * R, 0], r: [0, 0, a] }); }
  for (const sx of [-1, 1]) {
    strut(b, 'steel', [sx * R * 0.92, cy - 1.2, 0], [sx * foot, 0, 1.6], 0.45);
    strut(b, 'steel', [sx * R * 0.92, cy - 1.2, 0], [sx * foot, 0, -1.6], 0.45);
    strut(b, 'steel', [sx * R, cy, 0], [sx * foot, 4.5, 0], 0.4);
    b.add('dark', box(1.6, 0.7, 4.6, 0.15, 2), { p: [sx * foot, 0.35, 0] });
    b.add('warn', box(0.5, 2.2, 0.5, 0.1, 1), { p: [sx * foot, 1.4, 2.1] });
    b.add('warn', box(0.5, 2.2, 0.5, 0.1, 1), { p: [sx * foot, 1.4, -2.1] });
  }
  const g = b.build({ steel: plastic(0x3a3440, 0.45, 0.6), dark: MAT.dark, glow: glow(0xff7a1e, 3.5), warn: paint(0xff6a2a, { rough: 0.5 }) });
  const rim = []; for (let k = 0; k < 40; k++) { const a = (k / 40) * Math.PI * 2; rim.push([Math.cos(a) * R, cy + Math.sin(a) * R, 0]); }
  g.userData.rim = rim; g.userData.cy = cy; g.userData.R = R;
  return g;
}

/* ---------- the temple ---------- */
/** Tiered wooden lattice pagoda, about h metres tall, with lanterns under each eave. */
export function temple({ h = 16 } = {}) {
  const b = new ModelBuilder(), s = h / 16;
  b.add('dark', box(16 * s, 0.8 * s, 16 * s, 0.2, 2), { p: [0, 0.4 * s, 0] });
  b.add('wood', box(14 * s, 0.6 * s, 14 * s, 0.2, 2), { p: [0, 1.1 * s, 0] });
  const tiers = [[11, 3.6], [8.4, 3.0], [6, 2.5], [3.8, 2.1]];
  let y = 1.4 * s;
  tiers.forEach(([w, th], i) => {
    const W = w * s, T = th * s, hw = W / 2;
    for (const [x, z] of [[hw, hw], [-hw, hw], [hw, -hw], [-hw, -hw]]) b.add('wood', box(0.5 * s, T, 0.5 * s, 0.08, 1), { p: [x, y + T / 2, z] });
    // lattice walls: rails and diagonal braces on each face
    for (let f = 0; f < 4; f++) {
      const a = f * Math.PI / 2, ca = Math.cos(a), sa = Math.sin(a);
      const P = (u, v) => [u * ca + hw * sa, y + v, -u * sa + hw * ca];
      for (const v of [0.15, T * 0.55, T - 0.1]) strut(b, 'wood', P(-hw, v), P(hw, v), 0.22 * s);
      const n = Math.max(2, Math.round(W / (2.2 * s)));
      for (let k = 0; k < n; k++) { const u0 = -hw + (k / n) * W, u1 = -hw + ((k + 1) / n) * W; strut(b, 'pale', P(u0, 0.15), P(u1, T * 0.55), 0.14 * s); strut(b, 'pale', P(u1, 0.15), P(u0, T * 0.55), 0.14 * s); strut(b, 'pale', P(u0, T * 0.55), P(u1, T - 0.1), 0.14 * s); strut(b, 'pale', P(u1, T * 0.55), P(u0, T - 0.1), 0.14 * s); }
    }
    b.add('glowIn', box(W * 0.62, T * 0.7, W * 0.62, 0.2, 1), { p: [0, y + T * 0.45, 0] });
    y += T;
    // flared roof
    b.add('roof', cone(W * 0.82, 1.6 * s, 4), { p: [0, y + 0.8 * s, 0], r: [0, Math.PI / 4, 0] });
    b.add('dark', box(W * 1.18, 0.25 * s, W * 1.18, 0.08, 1), { p: [0, y + 0.1 * s, 0] });
    for (const [x, z] of [[1, 1], [-1, 1], [1, -1], [-1, -1]]) b.add('lamp', sphere(0.32 * s, 8, 6), { p: [x * W * 0.56, y - 0.35 * s, z * W * 0.56] });
    y += 0.9 * s;
    void i;
  });
  b.add('wood', cyl(0.12 * s, 0.3 * s, 2.6 * s, 6), { p: [0, y + 1.3 * s, 0] });
  b.add('lamp', sphere(0.45 * s, 10, 8), { p: [0, y + 2.8 * s, 0] });
  return b.build({ wood: WOOD, pale: WOOD_PALE, dark: WOOD_DARK, roof: plastic(0x6a4128, 0.8), glowIn: glow(0xff9a4a, 0.9), lamp: glow(0xffc46a, 3) });
}

/* ---------- domes, tents, trailers ---------- */
function hemiIco(r, detail = 1) {
  const g = new THREE.IcosahedronGeometry(r, detail).toNonIndexed(), p = g.attributes.position, keep = [];
  for (let i = 0; i < p.count; i += 3) { const cy = (p.getY(i) + p.getY(i + 1) + p.getY(i + 2)) / 3; if (cy > -0.12 * r) for (let k = 0; k < 3; k++) keep.push(p.getX(i + k), p.getY(i + k), p.getZ(i + k)); }
  const out = new THREE.BufferGeometry(); out.setAttribute('position', new THREE.Float32BufferAttribute(keep, 3)); out.computeVertexNormals();
  return out;
}
const DOME_SKIN = new THREE.MeshStandardMaterial({ color: 0xf6f1ea, roughness: 0.55, metalness: 0.05, flatShading: true, envMapIntensity: 0.8 });
const DOME_FRAME = new THREE.MeshBasicMaterial({ color: 0x5a4a5a, wireframe: true });
/** Faceted geodesic dome of radius r with a frame and a glowing door. */
export function dome(r = 6, { door = 0xffb45a } = {}) {
  const b = new ModelBuilder();
  b.add('skin', hemiIco(r, r > 7 ? 2 : 1));
  b.add('frame', hemiIco(r * 1.01, r > 7 ? 2 : 1));
  b.add('door', box(r * 0.34, r * 0.42, 0.5, 0.15, 2), { p: [0, r * 0.2, r * 0.93] });
  b.add('base', cyl(r * 1.02, r * 1.05, 0.4, 20), { p: [0, 0.05, 0] });
  return b.build({ skin: DOME_SKIN, frame: DOME_FRAME, door: glow(door, 1.6), base: WOOD_DARK });
}

/** Canvas bell tent (tintable canvas). */
export function bellTent() {
  const b = new ModelBuilder();
  b.add('canvas', lathe([[0, 0], [2.3, 0], [2.3, 0.55], [1.15, 2.3], [0.18, 3.1], [0, 3.2]], 14));
  b.add('door', box(1.0, 1.5, 0.3, 0.1, 1), { p: [0, 0.75, 2.05], r: [-0.25, 0, 0] });
  b.add('pole', cyl(0.05, 0.05, 0.6, 5), { p: [0, 3.4, 0] });
  return b.build({ canvas: CANVAS, door: plastic(0x3a2c2a, 0.9), pole: WOOD_DARK });
}

/** Yurt: lattice-wall drum with a low roof (tintable walls). */
export function yurt() {
  const b = new ModelBuilder();
  b.add('canvas', cyl(2.7, 2.7, 1.7, 16), { p: [0, 0.85, 0] });
  b.add('roof', lathe([[0, 2.75], [0.5, 2.7], [2.9, 1.7], [2.95, 1.55], [0, 1.55]], 16));
  b.add('trim', torus(2.72, 0.08, 4, 20), { p: [0, 1.62, 0], r: [Math.PI / 2, 0, 0] });
  b.add('door', box(1.0, 1.35, 0.3, 0.08, 1), { p: [0, 0.68, 2.65] });
  return b.build({ canvas: CANVAS, roof: plastic(0xc9b08a, 0.9), trim: plastic(0xd9452c, 0.6), door: plastic(0xc0392b, 0.7) });
}

/** Shiny silver camper trailer. */
export function trailer() {
  const b = new ModelBuilder();
  b.add('shell', loft([{ z: -3.6, w: 0.6, h: 0.75, y: 1.55, n: 2.4 }, { z: -3.2, w: 1.15, h: 1.25, y: 1.6, n: 2.6 }, { z: 0, w: 1.25, h: 1.32, y: 1.62, n: 2.8 }, { z: 3.2, w: 1.15, h: 1.25, y: 1.6, n: 2.6 }, { z: 3.6, w: 0.6, h: 0.75, y: 1.55, n: 2.4 }], 20, 3));
  for (const sx of [-1, 1]) b.add('glass', box(0.08, 0.5, 4.4, 0.04, 1), { p: [sx * 1.21, 2.05, 0] });
  b.add('glass', box(1.6, 0.5, 0.1, 0.04, 1), { p: [0, 1.95, 3.42], r: [-0.35, 0, 0] });
  b.add('lit', box(0.08, 1.3, 0.75, 0.04, 1), { p: [1.2, 1.4, -1.2] });
  for (const sx of [-1, 1]) b.add('tyre', cyl(0.42, 0.42, 0.3, 12), { p: [sx * 1.15, 0.42, 0.2], r: [0, 0, Math.PI / 2] });
  b.add('dark', box(0.2, 0.2, 1.8, 0.05, 1), { p: [0, 0.5, 4.4] });
  b.add('awn', box(0.9, 0.06, 3.6, 0.02, 1), { p: [1.75, 2.45, -0.6], r: [0, 0, -0.2] });
  return b.build({ shell: plastic(0xdfe4ec, 0.18, 0.95), glass: plastic(0x2a3440, 0.2, 0.3), lit: glow(0xffc070, 1.4), tyre: MAT.rubber, dark: MAT.dark, awn: tintable(0xff8a3c, 0.8) });
}

/** Portable toilet, as a joke, in a row. */
export function portaloo() {
  const b = new ModelBuilder();
  b.add('body', box(1.3, 2.25, 1.35, 0.12, 2), { p: [0, 1.15, 0] });
  b.add('roof', box(1.45, 0.22, 1.5, 0.08, 2), { p: [0, 2.35, 0] });
  b.add('dark', box(0.9, 1.9, 0.06, 0.03, 1), { p: [0, 1.1, 0.69] });
  b.add('dark', cyl(0.08, 0.08, 0.6, 6), { p: [0.4, 2.6, -0.4] });
  b.add('sign', box(0.4, 0.14, 0.04, 0.02, 1), { p: [0, 1.85, 0.73] });
  return b.build({ body: tintable(0x2f7be0, 0.55), roof: plastic(0xf4f4f0, 0.5), dark: plastic(0x1d4f9a, 0.6), sign: paint(0xff4d4d, { rough: 0.5 }) });
}

/** Palm in a square planter, for the luxury camps. */
export function planter() {
  const b = new ModelBuilder();
  b.add('box', box(2.2, 1.1, 2.2, 0.15, 2), { p: [0, 0.55, 0] });
  b.add('soil', box(1.9, 0.1, 1.9, 0.03, 1), { p: [0, 1.1, 0] });
  return b.build({ box: plastic(0xf2efe8, 0.6), soil: plastic(0x4a3426, 0.95) });
}

/* ---------- neon art and lights ---------- */
/** A big glowing heart on a stand. */
export function neonHeart({ size = 6, color = 0xff4fa8 } = {}) {
  const b = new ModelBuilder(), k = size / 32, pts = [], pts2 = [];
  for (let i = 0; i < 40; i++) { const t = (i / 40) * Math.PI * 2; const x = 16 * Math.sin(t) ** 3, y = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t); pts.push([x * k, y * k + size * 0.95, 0]); pts2.push([x * k * 0.78, y * k * 0.78 + size * 0.95 + size * 0.03, 0.25]); }
  b.add('neon', tube(pts, 0.26 * size / 6, 80, 6, true));
  b.add('neon2', tube(pts2, 0.16 * size / 6, 80, 6, true));
  for (const sx of [-1, 1]) strut(b, 'frame', [sx * size * 0.3, 0, -0.3], [sx * size * 0.18, size * 0.85, -0.3], 0.3);
  b.add('frame', box(size * 1.0, 0.4, 1.6, 0.1, 1), { p: [0, 0.2, -0.3] });
  return b.build({ neon: glow(color, 3.5), neon2: glow(0xffd23c, 3), frame: MAT.dark });
}

const LETTERS = {
  D: [[[0, 0], [0, 3], [1.1, 3], [1.9, 2.3], [2, 1.5], [1.9, 0.7], [1.1, 0], [0, 0]]],
  U: [[[0, 3], [0, 0.9], [0.5, 0.1], [1.0, 0], [1.5, 0.1], [2, 0.9], [2, 3]]],
  S: [[[1.95, 2.6], [1.4, 3], [0.6, 3], [0.05, 2.5], [0.3, 1.75], [1.7, 1.3], [1.95, 0.55], [1.4, 0], [0.6, 0], [0.05, 0.4]]],
  T: [[[0, 3], [2, 3]], [[1, 3], [1, 0]]],
  Y: [[[0, 3], [1, 1.5], [2, 3]], [[1, 1.5], [1, 0]]],
};
/** A giant lit-up word on a scaffold (letters from LETTERS). */
export function neonWord(word = 'DUSTY', { h = 4.5, colors = [0xff4fa8, 0x46d6ff, 0xffd23c, 0x7dff6a, 0xff7a1e] } = {}) {
  const b = new ModelBuilder(), s = h / 3, adv = 2.7 * s, W = word.length * adv - 0.7 * s, x0 = -W / 2, lift = 2.2;
  [...word].forEach((ch, i) => {
    for (const stroke of LETTERS[ch] || []) {
      const pts = stroke.map(([x, y]) => [x0 + i * adv + x * s, lift + y * s, 0]);
      if (pts.length === 2) strut(b, 'c' + (i % colors.length), pts[0], pts[1], 0.42 * s / 1.5, 0.42 * s / 1.5);
      else b.add('c' + (i % colors.length), tube(pts, 0.21 * s / 1.5, pts.length * 10, 6));
    }
  });
  // scaffold behind
  for (const x of [-W / 2 - 0.4, -W / 6, W / 6, W / 2 + 0.4]) b.add('frame', box(0.3, lift + h + 0.4, 0.3, 0.05, 1), { p: [x, (lift + h + 0.4) / 2, -0.8] });
  for (const y of [lift - 0.2, lift + h + 0.3]) b.add('frame', box(W + 1.4, 0.25, 0.25, 0.05, 1), { p: [0, y, -0.8] });
  b.add('frame', box(W + 2, 0.4, 2.4, 0.1, 1), { p: [0, 0.2, -0.6] });
  const mats = { frame: MAT.dark }; colors.forEach((c, i) => { mats['c' + i] = glow(c, 3.4); });
  return b.build(mats);
}

/** A glowing cube on a pole. */
export function glowCube(color = 0x46d6ff, { h = 5, size = 1.6 } = {}) {
  const b = new ModelBuilder();
  b.add('pole', cyl(0.12, 0.16, h, 6), { p: [0, h / 2, 0] });
  b.add('cube', box(size, size, size, 0.12, 2), { p: [0, h + size / 2, 0], r: [0.6, 0.7, 0.2] });
  b.add('pole', cyl(0.5, 0.6, 0.3, 8), { p: [0, 0.15, 0] });
  return b.build({ pole: MAT.dark, cube: glow(color, 2.6) });
}

/** Pole for string lights (strings are built between poles in the track). */
export function lightPole({ h = 6.5 } = {}) {
  const b = new ModelBuilder();
  b.add('pole', cyl(0.1, 0.14, h, 6), { p: [0, h / 2, 0] });
  b.add('pole', cyl(0.3, 0.36, 0.3, 8), { p: [0, 0.15, 0] });
  b.add('bulb', sphere(0.3, 8, 6), { p: [0, h + 0.15, 0] });
  return b.build({ pole: plastic(0x4a3a2a, 0.8), bulb: glow(0xffd28a, 3) });
}

/** Light tower: a tall mast with a cluster of lamps. */
export function lightTower({ h = 14 } = {}) {
  const b = new ModelBuilder();
  for (const [x, z] of [[0.5, 0.5], [-0.5, 0.5], [0.5, -0.5], [-0.5, -0.5]]) strut(b, 'mast', [x * 2.2, 0, z * 2.2], [x * 0.5, h, z * 0.5], 0.16);
  for (let k = 1; k < 5; k++) { const y = (k / 5) * h, w = 2.2 - (k / 5) * 1.7; b.add('mast', box(w, 0.12, w, 0.02, 1), { p: [0, y, 0] }); }
  b.add('mast', box(2.4, 0.3, 0.8, 0.05, 1), { p: [0, h + 0.2, 0] });
  for (let k = 0; k < 4; k++) b.add('lamp', box(0.5, 0.45, 0.3, 0.06, 1), { p: [(k - 1.5) * 0.58, h + 0.65, 0.15] });
  return b.build({ mast: plastic(0x6a6070, 0.6, 0.4), lamp: glow(0xfff0c8, 3.2) });
}

/** One merged mesh of drooping light strings between consecutive points [{x,y,z}] (y = pole top). */
export function stringLights(points, { sag = 1.1, every = 1.6, colors = [0xffd28a, 0xff7a4a, 0xffd23c, 0x46d6ff, 0xff4fa8] } = {}) {
  const b = new ModelBuilder();
  for (let i = 0; i < points.length - 1; i++) {
    const a = points[i], c = points[i + 1], len = Math.hypot(c.x - a.x, c.z - a.z);
    if (len > 40) continue;
    const n = Math.max(3, Math.round(len / every)), wire = [];
    for (let k = 0; k <= n; k++) {
      const t = k / n, x = a.x + (c.x - a.x) * t, z = a.z + (c.z - a.z) * t, y = a.y + (c.y - a.y) * t - sag * 4 * t * (1 - t);
      wire.push([x, y, z]);
      if (k > 0 && k < n) b.add('b' + (k % colors.length), sphere(0.17, 6, 5), { p: [x, y - 0.2, z] });
    }
    b.add('wire', tube(wire, 0.025, n * 2, 3));
  }
  const mats = { wire: MAT.dark }; colors.forEach((c, i) => { mats['b' + i] = glow(c, 3.2); });
  return b.build(mats, { cast: false });
}

/* ---------- obstacle models ---------- */
/** Art car: a glowing neon fish float (even ids) or a furry pink bus (odd ids). About 5 m long, facing +Z. */
export function artcar(o = {}) {
  const b = new ModelBuilder();
  b.add('dark', box(2.3, 0.55, 4.6, 0.15, 2), { p: [0, 0.75, 0] });
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) b.add('tyre', cyl(0.48, 0.48, 0.42, 14), { p: [sx * 1.15, 0.48, sz * 1.55], r: [0, 0, Math.PI / 2] });
  b.add('under', box(2.0, 0.12, 4.2, 0.04, 1), { p: [0, 0.42, 0] });
  if ((o.id ?? 0) % 2 === 0) {
    // neon fish
    b.add('body', loft([{ z: -2.2, w: 0.25, h: 0.45, y: 0 }, { z: -1.4, w: 0.8, h: 1.1, y: 0.05 }, { z: 0.2, w: 1.15, h: 1.45, y: 0.1 }, { z: 1.6, w: 0.95, h: 1.15, y: 0.05 }, { z: 2.5, w: 0.35, h: 0.45, y: -0.1 }], 20, 4), { p: [0, 2.35, 0] });
    b.add('fin', box(0.18, 2.0, 1.3, 0.08, 1), { p: [0, 2.35, -2.75], r: [0.15, 0, 0] });
    b.add('fin', box(0.14, 1.1, 1.6, 0.06, 1), { p: [0, 3.75, -0.1], r: [-0.35, 0, 0] });
    for (const sx of [-1, 1]) { b.add('eye', sphere(0.32, 10, 8), { p: [sx * 0.72, 2.6, 1.55] }); b.add('pupil', sphere(0.16, 8, 6), { p: [sx * 0.9, 2.62, 1.68] }); b.add('fin', box(0.1, 0.5, 0.9, 0.04, 1), { p: [sx * 1.1, 2.0, 0.4], r: [0, sx * 0.4, sx * 0.5] }); }
    for (const z of [-1.2, -0.2, 0.8]) b.add('trim', torus(1.0 + (z === -0.2 ? 0.22 : 0), 0.07, 5, 24), { p: [0, 2.4, z], s: [1.05, 1.32, 1] });
    for (const sx of [-1, 1]) b.add('trim2', box(0.08, 0.1, 4.3, 0.03, 1), { p: [sx * 1.17, 1.05, 0] });
    return b.build({ dark: MAT.dark, tyre: MAT.rubber, under: glow(0xff4fa8, 2.5), body: paint(0x2ec4d6, { rough: 0.3, clear: 0.6 }), fin: paint(0xff7a1e, { rough: 0.4 }), eye: MAT.white, pupil: MAT.black, trim: glow(0xff4fa8, 3.2), trim2: glow(0x46d6ff, 3) });
  }
  // furry pink bus with headlight eyes and a disco ball
  b.add('body', box(2.3, 1.9, 4.8, 0.55, 3), { p: [0, 2.05, 0] });
  for (const sx of [-1, 1]) b.add('win', box(0.08, 0.6, 3.4, 0.05, 1), { p: [sx * 1.16, 2.4, -0.2] });
  b.add('win', box(1.8, 0.65, 0.08, 0.05, 1), { p: [0, 2.4, 2.41] });
  for (const sx of [-1, 1]) { b.add('eye', sphere(0.3, 10, 8), { p: [sx * 0.7, 1.45, 2.35] }); }
  b.add('trim', box(2.36, 0.1, 4.86, 0.04, 1), { p: [0, 1.15, 0] });
  b.add('trim2', box(2.36, 0.1, 4.86, 0.04, 1), { p: [0, 3.0, 0] });
  b.add('dark', cyl(0.05, 0.05, 0.7, 5), { p: [0, 3.35, 0] });
  b.add('disco', sphere(0.55, 10, 8), { p: [0, 3.95, 0] });
  return b.build({ dark: MAT.dark, tyre: MAT.rubber, under: glow(0x46d6ff, 2.5), body: plastic(0xff6fb5, 1.0), win: glow(0xffd28a, 1.8), eye: glow(0xfff4d6, 3), trim: glow(0xffd23c, 3), trim2: glow(0x7dff6a, 3), disco: plastic(0xe8eef6, 0.08, 1) });
}

const DEVIL_MAT = new THREE.MeshStandardMaterial({ color: 0xe8c79a, roughness: 1, transparent: true, opacity: 0.32, depthWrite: false, side: THREE.DoubleSide });
const DEVIL_MAT2 = new THREE.MeshStandardMaterial({ color: 0xd2a774, roughness: 1, transparent: true, opacity: 0.5, depthWrite: false, side: THREE.DoubleSide });
/** Dust devil: a tall tapered translucent swirl that spins itself. */
export function dustdevil() {
  const grp = new THREE.Group(), b = new ModelBuilder(), H = 13;
  b.add('veil', lathe([[0.7, 0], [1.1, 1.5], [1.4, 4], [2.0, 7], [3.0, 10], [4.4, H]], 18));
  b.add('veil', lathe([[0.4, 0], [0.7, 2], [1.0, 5], [1.5, 8], [2.4, 11.5]], 14), { r: [0, 0.6, 0] });
  const spiral = (r0, r1, turns, ph) => { const pts = []; for (let i = 0; i <= 40; i++) { const t = i / 40, a = t * turns * Math.PI * 2 + ph, r = r0 + (r1 - r0) * t * t; pts.push([Math.cos(a) * r, t * H * 0.95, Math.sin(a) * r]); } return pts; };
  b.add('band', tube(spiral(0.9, 4.0, 3.2, 0), 0.22, 120, 5));
  b.add('band', tube(spiral(0.7, 3.4, 2.6, 2.4), 0.18, 100, 5));
  const swirl = b.build({ veil: DEVIL_MAT, band: DEVIL_MAT2 }, { cast: false });
  swirl.children.forEach(m => { m.renderOrder = 5; });
  const base = new ModelBuilder();
  base.add('d', cyl(2.2, 2.8, 0.5, 14, true), { p: [0, 0.25, 0] });
  const ring = base.build({ d: DEVIL_MAT2 }, { cast: false });
  grp.add(swirl, ring);
  swirl.children[0].onBeforeRender = () => { swirl.rotation.y = performance.now() * -0.006; };
  return grp;
}
void cone;
