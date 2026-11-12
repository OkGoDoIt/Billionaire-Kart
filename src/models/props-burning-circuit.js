/* Props for Burning Circuit: the Figure, the ring of fire, the temple, domes,
   tents, trailers, neon art, string lights, art cars, and dust devils.
   Each builder returns a THREE.Group on y = 0, facing +Z, made of a few merged
   meshes. Nothing here touches the DOM at import time. */
import * as THREE from 'three';
import { ModelBuilder, box, sphere, cyl, cone, torus, tube, lathe, loft, plastic, glow, paint, MAT } from './build.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { canvasTex } from '../render/textures.js';
import { makeRng } from '../core/util.js';

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
  b.add('woodB', box(7.6 * s, 1.2 * s, 2.8 * s, 0.4, 2), { p: [0, Y(21.6), 0] });
  // the fleece vest: a puffy shell over the torso, a zip, a collar, a fund patch on the chest
  b.add('vest', loft([{ z: 0, w: 2.2 * s, h: 1.42 * s, y: 0, n: 3.2 }, { z: 4.4 * s, w: 2.75 * s, h: 1.52 * s, y: 0, n: 3.2 }, { z: 8.6 * s, w: 3.8 * s, h: 1.6 * s, y: 0, n: 3.2 }], 20, 3), { p: [0, Y(12.5), 0], r: [-Math.PI / 2, 0, 0] });
  b.add('vestDark', box(4.5 * s, 0.5 * s, 3.0 * s, 0.2, 2), { p: [0, Y(12.6), 0] });
  b.add('vestDark', torus(1.25 * s, 0.38 * s, 6, 16), { p: [0, Y(21.9), 0], r: [Math.PI / 2, 0, 0] });
  strut(b, 'zip', [0, Y(12.8), 1.5 * s], [0, Y(21.4), 1.66 * s], 0.16 * s, 0.1 * s);
  for (const v of [15.2, 18.2]) b.add('vestDark', box(4.9 * s * (0.94 + (v - 15) * 0.05), 0.12 * s, 3.25 * s, 0.05, 1), { p: [0, Y(v), 0] });   // quilting seams
  b.add('patch', box(1.5 * s, 0.75 * s, 0.1 * s, 0.05, 1), { p: [1.6 * s, Y(19.6), 1.62 * s] });
  // the lanyard and its badge
  b.add('lanyard', tube([[-1.1 * s, Y(22.2), 0.9 * s], [-0.8 * s, Y(20), 1.68 * s], [-0.2 * s, Y(17.6), 1.75 * s]], 0.11 * s, 10, 5));
  b.add('lanyard', tube([[1.1 * s, Y(22.2), 0.9 * s], [0.8 * s, Y(20), 1.68 * s], [0.2 * s, Y(17.6), 1.75 * s]], 0.11 * s, 10, 5));
  b.add('badge', box(2.3 * s, 2.9 * s, 0.12 * s, 0.1, 1), { p: [0, Y(16.1), 1.72 * s] });
  // arms raised in a V
  for (const sx of [-1, 1]) {
    limb(b, 'wood', [sx * 3.4 * s, Y(21.6), 0], [sx * 7.4 * s, Y(27.2), 0], 0.75 * s, 0.55 * s, 6);
    limb(b, 'wood', [sx * 7.4 * s, Y(27.2), 0], [sx * 9.2 * s, Y(30), 0], 0.55 * s, 0.42 * s, 6);
    b.add('woodB', sphere(0.75 * s, 8, 6), { p: [sx * 7.4 * s, Y(27.2), 0] });
    b.add('woodB', box(0.9 * s, 1.6 * s, 1.1 * s, 0.25, 2), { p: [sx * 9.4 * s, Y(30.4), 0], r: [0, 0, -sx * 0.6] });
    b.add('neon', tube([[sx * 3.8 * s, Y(22.4), 0.6 * s], [sx * 7.6 * s, Y(27.9), 0.6 * s], [sx * 9.3 * s, Y(30.6), 0.5 * s]], 0.12 * s, 12, 6));
    // a pole in each hand, carrying the banner
    b.add('dark', cyl(0.22 * s, 0.22 * s, 7.2 * s, 6), { p: [sx * 9.4 * s, Y(31.4), 0] });
  }
  // the banner held overhead (lettered by the track): a cloth backing between the poles
  const BW = 17.6 * s, BH = 4.2 * s, BY = Y(32.2);
  b.add('cloth', box(BW, BH, 0.12 * s, 0.03, 1), { p: [0, BY, 0] });
  // neck and the lantern head
  b.add('dark', cyl(0.6 * s, 0.8 * s, 1.4 * s, 8), { p: [0, Y(22.8), 0] });
  b.add('wood', cone(1.7 * s, 2.4 * s, 4), { p: [0, Y(24.9), 0], r: [Math.PI, Math.PI / 4, 0] });
  b.add('wood', cone(1.7 * s, 3.0 * s, 4), { p: [0, Y(27.2), 0], r: [0, Math.PI / 4, 0] });
  b.add('neon', torus(1.75 * s, 0.12 * s, 6, 4), { p: [0, Y(26.1), 0], r: [Math.PI / 2, 0, Math.PI / 4] });
  b.add('lamp', sphere(0.55 * s, 10, 8), { p: [0, Y(26.0), 0] });
  const g = b.build({ wood: WOOD, woodB: WOOD_PALE, dark: WOOD_DARK, neon: glow(0x46d6ff, 3.2), lamp: glow(0xffc46a, 3),
    vest: plastic(0x2c3d5e, 0.95), vestDark: plastic(0x1c2740, 0.9), zip: plastic(0xc9ccd2, 0.3, 0.8), patch: plastic(0xf4f4f0, 0.7), lanyard: plastic(0xe23b3b, 0.6), badge: plastic(0xf8f8f4, 0.5), cloth: plastic(0xf2e6cc, 0.9) });
  const feet = []; for (let k = 0; k < 14; k++) { const a = (k / 14) * Math.PI * 2; feet.push([Math.sin(a) * 6.0, top + 0.2, Math.cos(a) * 6.0]); }
  // flame points climbing the body: legs first, then the torso and arms (the track lights more of them each lap)
  const body = [];
  for (let k = 0; k <= 12; k++) { const v = k; for (const sx of [-1, 1]) body.push([sx * (3.2 - (v / 12) * 1.8) * s, Y(v), 0.9 * s, v]); }
  for (let v = 13; v <= 21; v++) for (const sx of [-1, 1]) body.push([sx * (2.2 + (v - 13) * 0.18) * s, Y(v), 1.5 * s, v]);
  for (let k = 0; k <= 8; k++) for (const sx of [-1, 1]) body.push([sx * (3.6 + k * 0.6) * s, Y(21.8 + k * 0.7), 0.4 * s, 22 + k]);
  g.userData.baseTop = top; g.userData.feet = feet; g.userData.body = body; g.userData.h = top + 31 * s;
  g.userData.banner = { y: BY, w: BW - 0.4 * s, h: BH - 0.4 * s, z: 0.07 * s };
  g.userData.badge = { y: Y(16.1), z: 1.79 * s, w: 2.1 * s, h: 2.7 * s };
  g.userData.patch = { x: 1.6 * s, y: Y(19.6), z: 1.68 * s, w: 1.4 * s, h: 0.68 * s };
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
/** A roof placard for an art car: one word or two on a lit board, both faces. */
function roofSign(text, bg, fg, w = 2.6, h = 0.9, y = 3.9) {
  const tex = canvasTex(512, 176, (g, cw, ch) => {
    g.fillStyle = bg; g.fillRect(0, 0, cw, ch); g.strokeStyle = fg; g.lineWidth = 10; g.strokeRect(8, 8, cw - 16, ch - 16);
    g.font = '108px "Luckiest Guy", "Arial Black", sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = fg;
    let s = 108; while (g.measureText(text).width > cw - 50 && s > 30) { s -= 4; g.font = `${s}px "Luckiest Guy", "Arial Black", sans-serif`; }
    g.fillText(text, cw / 2, ch / 2 + 6);
  }, { repeat: false, aniso: 4 });
  const mat = new THREE.MeshStandardMaterial({ map: tex, emissiveMap: tex, emissive: 0xffffff, emissiveIntensity: 0.6, roughness: 0.6 });
  const grp = new THREE.Group();
  for (const r of [Math.PI / 2, -Math.PI / 2]) { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat); m.position.set(r > 0 ? 0.06 : -0.06, y, 0); m.rotation.y = r; grp.add(m); }
  return grp;
}

/** Fur: a shell pushed in and out by noise, so it reads as shaggy. */
function fuzz(geo, amt = 0.12, seed = 1) {
  const g = geo.index ? geo.toNonIndexed() : geo, p = g.attributes.position, r = makeRng(seed);
  g.computeVertexNormals(); const n = g.attributes.normal;
  for (let i = 0; i < p.count; i += 3) { const k = (r() - 0.3) * amt; for (let j = 0; j < 3; j++) p.setXYZ(i + j, p.getX(i + j) + n.getX(i + j) * k, p.getY(i + j) + n.getY(i + j) * k, p.getZ(i + j) + n.getZ(i + j) * k); }
  g.computeVertexNormals(); return g;
}

/** The furry stretch limo: lofted body, shag all over, a chrome grille. len is bumper to bumper. */
function limoBody(b, len = 5.2) {
  const L = len / 2;
  b.add('fur', fuzz(loft([{ z: -L, w: 1.0, h: 0.42, y: 1.0, n: 4 }, { z: -L + 0.5, w: 1.12, h: 0.55, y: 1.05, n: 4 }, { z: L - 0.6, w: 1.12, h: 0.55, y: 1.0, n: 4 }, { z: L, w: 1.0, h: 0.38, y: 0.95, n: 4 }], 20, 3), 0.14, 3));
  b.add('fur', fuzz(loft([{ z: -L + 0.7, w: 0.95, h: 0.1, y: 1.55, n: 4 }, { z: -L + 1.1, w: 1.0, h: 0.45, y: 1.75, n: 4 }, { z: L - 1.6, w: 1.0, h: 0.45, y: 1.75, n: 4 }, { z: L - 1.0, w: 0.95, h: 0.1, y: 1.55, n: 4 }], 20, 3), 0.12, 5));
  for (const sx of [-1, 1]) b.add('glass', box(0.06, 0.38, len - 2.6, 0.03, 1), { p: [sx * 1.0, 1.85, -0.3] });
  b.add('glass', box(1.7, 0.4, 0.06, 0.03, 1), { p: [0, 1.85, L - 1.1], r: [-0.6, 0, 0] });
  b.add('chrome', box(1.6, 0.42, 0.1, 0.05, 1), { p: [0, 0.95, L + 0.02] });
  b.add('chrome', box(2.1, 0.14, 0.18, 0.05, 1), { p: [0, 0.62, L + 0.05] });
  b.add('chrome', box(2.1, 0.14, 0.18, 0.05, 1), { p: [0, 0.62, -L - 0.05] });
  for (const sx of [-1, 1]) b.add('lamp', sphere(0.16, 8, 6), { p: [sx * 0.72, 1.0, L + 0.03] });
  for (const sx of [-1, 1]) for (const z of [-L + 0.85, L - 0.85]) b.add('tyre', cyl(0.4, 0.4, 0.34, 14), { p: [sx * 1.02, 0.4, z], r: [0, 0, Math.PI / 2] });
}

/** Art car: a fur-covered stretch limo (even ids) or a furry pink VC shuttle bus (odd ids). About 5 m long, facing +Z. */
export function artcar(o = {}) {
  const b = new ModelBuilder();
  if ((o.id ?? 0) % 2 === 0) {
    limoBody(b, 5.2);
    b.add('under', box(1.8, 0.1, 4.6, 0.04, 1), { p: [0, 0.3, 0] });
    b.add('dark', cyl(0.05, 0.05, 1.3, 5), { p: [0, 2.6, 0] });
    const g = b.build({ fur: plastic(0xff8ad0, 1.0), glass: plastic(0x14161c, 0.15, 0.3), chrome: MAT.chrome, lamp: glow(0xfff4d6, 3), tyre: MAT.rubber, under: glow(0xff4fa8, 2.5), dark: MAT.dark });
    g.add(roofSign('ART CAR', '#ffd23c', '#1a1d29', 2.8, 0.95, 3.5));
    return g;
  }
  b.add('dark', box(2.3, 0.55, 4.6, 0.15, 2), { p: [0, 0.75, 0] });
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) b.add('tyre', cyl(0.48, 0.48, 0.42, 14), { p: [sx * 1.15, 0.48, sz * 1.55], r: [0, 0, Math.PI / 2] });
  b.add('under', box(2.0, 0.12, 4.2, 0.04, 1), { p: [0, 0.42, 0] });
  // furry pink bus with headlight eyes and a disco ball
  b.add('body', box(2.3, 1.9, 4.8, 0.55, 3), { p: [0, 2.05, 0] });
  for (const sx of [-1, 1]) b.add('win', box(0.08, 0.6, 3.4, 0.05, 1), { p: [sx * 1.16, 2.4, -0.2] });
  b.add('win', box(1.8, 0.65, 0.08, 0.05, 1), { p: [0, 2.4, 2.41] });
  for (const sx of [-1, 1]) { b.add('eye', sphere(0.3, 10, 8), { p: [sx * 0.7, 1.45, 2.35] }); }
  b.add('trim', box(2.36, 0.1, 4.86, 0.04, 1), { p: [0, 1.15, 0] });
  b.add('trim2', box(2.36, 0.1, 4.86, 0.04, 1), { p: [0, 3.0, 0] });
  b.add('dark', cyl(0.05, 0.05, 1.5, 5), { p: [0, 3.75, 0] });
  b.add('disco', sphere(0.55, 10, 8), { p: [0, 4.55, 0] });
  const g = b.build({ dark: MAT.dark, tyre: MAT.rubber, under: glow(0x46d6ff, 2.5), body: plastic(0xff6fb5, 1.0), win: glow(0xffd28a, 1.8), eye: glow(0xfff4d6, 3), trim: glow(0xffd23c, 3), trim2: glow(0x7dff6a, 3), disco: plastic(0xe8eef6, 0.08, 1) });
  g.add(roofSign('VC SHUTTLE', '#1a1d29', '#46d6ff', 3.4, 0.9, 3.6));
  return g;
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

/* ---------- sign kit: big lettering on a few canvas atlases, and a baker for static props ---------- */
export const FONT = '"Luckiest Guy", "Arial Black", sans-serif', SANS = '"Arial Black", "Helvetica Neue", Arial, sans-serif';

/** Fit text to a width in up to `lines` lines; draws centred at (cx, cy). */
export function fitText(g, text, cx, cy, maxW, size, font, fill, { lines = 2, stroke = null, lw = 0, maxH = 1e9 } = {}) {
  const words = text.split(' '); let ls = [text];
  g.font = `${size}px ${font}`;
  if (lines > 1 && g.measureText(text).width > maxW && words.length > 1) {
    let best = 1, bd = 1e9; for (let k = 1; k < words.length; k++) { const d = Math.abs(words.slice(0, k).join(' ').length - words.slice(k).join(' ').length); if (d < bd) { bd = d; best = k; } }
    ls = [words.slice(0, best).join(' '), words.slice(best).join(' ')];
  }
  let s = size; const widest = () => Math.max(...ls.map(l => g.measureText(l).width));
  while ((widest() > maxW || s * 1.05 * ls.length > maxH) && s > 10) { s -= 2; g.font = `${s}px ${font}`; }
  g.textAlign = 'center'; g.textBaseline = 'middle';
  ls.forEach((l, k) => { const y = cy + (k - (ls.length - 1) / 2) * s * 1.05 + s * 0.06; if (stroke) { g.lineWidth = lw; g.strokeStyle = stroke; g.lineJoin = 'round'; g.strokeText(l, cx, y); } g.fillStyle = fill; g.fillText(l, cx, y); });
}

/** A painted board: background, border, a soft drop shadow under the lettering. */
export const board = (text, { bg = '#ffffff', fg = '#1a1d29', font = FONT, size = 140, border = null, lines = 2, pad = 0.07, stripe = null, sub = null, subFg = null, subScale = 0.42 } = {}) => (g, w, h) => {
  g.fillStyle = bg; g.fillRect(0, 0, w, h);
  const sh = g.createLinearGradient(0, 0, w, h); sh.addColorStop(0, 'rgba(255,255,255,0.14)'); sh.addColorStop(0.5, 'rgba(255,255,255,0)'); sh.addColorStop(1, 'rgba(0,0,0,0.12)'); g.fillStyle = sh; g.fillRect(0, 0, w, h);
  if (stripe) { g.fillStyle = stripe; g.fillRect(0, 0, w, h * 0.08); g.fillRect(0, h * 0.92, w, h * 0.08); }
  if (border) { g.strokeStyle = border; g.lineWidth = Math.max(6, h * 0.045); g.strokeRect(g.lineWidth / 2 + 4, g.lineWidth / 2 + 4, w - g.lineWidth - 8, h - g.lineWidth - 8); }
  const big = subScale > 0.5, ty = sub ? h * (big ? 0.33 : 0.42) : h * 0.5, th = sub ? h * (big ? 0.46 : 0.62) : h * 0.84;
  fitText(g, text, w / 2 + 4, ty + 5, w * (1 - pad * 2), size, font, 'rgba(0,0,0,0.25)', { lines, maxH: th });
  fitText(g, text, w / 2, ty, w * (1 - pad * 2), size, font, fg, { lines, maxH: th });
  if (sub) fitText(g, sub, w / 2, h * (big ? 0.76 : 0.82), w * (1 - pad * 2), size * subScale, font, subFg || fg, { lines: 1, maxH: h * (big ? 0.34 : 0.2) });
};

/** Quads in world space with explicit UVs. */
export class Quads {
  constructor() { this.p = []; this.n = []; this.u = []; }
  quad(a, b, c, d, uv = [0, 0, 1, 1]) {
    const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2], vx = d[0] - a[0], vy = d[1] - a[1], vz = d[2] - a[2];
    let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx; const l = Math.hypot(nx, ny, nz) || 1; nx /= l; ny /= l; nz /= l;
    const t = [[uv[0], uv[1]], [uv[2], uv[1]], [uv[2], uv[3]], [uv[0], uv[3]]];
    for (const k of [0, 1, 2, 0, 2, 3]) { const q = [a, b, c, d][k]; this.p.push(q[0], q[1], q[2]); this.n.push(nx, ny, nz); this.u.push(t[k][0], t[k][1]); }
  }
  /** A flat panel facing yaw (0 = +Z), centred at c, w by h, tilted back by `tilt`. */
  panel(c, yaw, w, h, uv, tilt = 0) {
    const rx = Math.cos(yaw), rz = -Math.sin(yaw), fx = Math.sin(yaw), fz = Math.cos(yaw);
    const ux = -fx * Math.sin(tilt), uy = Math.cos(tilt), uz = -fz * Math.sin(tilt);
    const P = (sx, sy) => [c[0] + rx * w / 2 * sx + ux * h / 2 * sy, c[1] + uy * h / 2 * sy, c[2] + rz * w / 2 * sx + uz * h / 2 * sy];
    this.quad(P(-1, -1), P(1, -1), P(1, 1), P(-1, 1), uv);
  }
  get empty() { return !this.p.length; }
  geometry() {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.p, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(this.n, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(this.u, 2));
    g.computeBoundingSphere(); return g;
  }
}

/** Text panels packed into a few big canvases, one mesh per canvas. Repaints once the web fonts arrive. */
export function makeAtlas(group, { S = 2048, glow: gi = 0.32 } = {}) {
  const pages = [], newPage = () => {
    const c = document.createElement('canvas'); c.width = c.height = S;
    const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
    const mat = new THREE.MeshStandardMaterial({ map: tex, emissiveMap: tex, emissive: 0xffffff, emissiveIntensity: gi, roughness: 0.6 });   // front faces only: anything seen from behind gets its own back panel
    const p = { c, g: c.getContext('2d'), tex, mat, q: new Quads(), x: 0, y: 0, row: 0, items: [] }; pages.push(p); return p;
  };
  newPage();
  const alloc = (w, h) => {
    let p = pages[pages.length - 1];
    if (p.x + w > S) { p.x = 0; p.y += p.row + 2; p.row = 0; }
    if (p.y + h > S) p = newPage();
    const r = { p, x: p.x, y: p.y, w, h }; p.x += w + 2; p.row = Math.max(p.row, h); return r;
  };
  const api = {
    add(w, h, draw) { const r = alloc(w, h); r.draw = draw; r.p.items.push(r); return r; },
    place(r, c, yaw, w, h, tilt = 0) { r.p.q.panel(c, yaw, w, h, [r.x / S, 1 - (r.y + r.h) / S, (r.x + r.w) / S, 1 - r.y / S], tilt); },
    /** Lettering on both faces of a board `depth` thick whose front face is at c: the back reads correctly from behind. */
    both(r, c, yaw, w, h, depth) { api.place(r, c, yaw, w, h); api.place(r, [c[0] - Math.sin(yaw) * depth, c[1], c[2] - Math.cos(yaw) * depth], yaw + Math.PI, w, h); },
    /** Place a region on an arbitrary quad: a, b, c, d are bottom-left, bottom-right, top-right, top-left as seen from the front. */
    quad(r, a, b, c, d) { r.p.q.quad(a, b, c, d, [r.x / S, 1 - (r.y + r.h) / S, (r.x + r.w) / S, 1 - r.y / S]); },
    paint() { for (const p of pages) { p.g.clearRect(0, 0, S, S); for (const r of p.items) { p.g.save(); p.g.translate(r.x, r.y); p.g.beginPath(); p.g.rect(0, 0, r.w, r.h); p.g.clip(); r.draw(p.g, r.w, r.h); p.g.restore(); } p.tex.needsUpdate = true; } },
    flush() {
      api.paint();
      for (const p of pages) if (!p.q.empty) { const m = new THREE.Mesh(p.q.geometry(), p.mat); m.matrixAutoUpdate = false; group.add(m); }
      if (typeof document !== 'undefined' && document.fonts?.ready) document.fonts.ready.then(() => api.paint());
    },
  };
  return api;
}

/** Merges static props into one mesh per material, so a dozen landmarks cost a dozen draw calls. */
export function makeBaker(group, shadows) {
  const buckets = new Map();
  const push = (mat, g, cast) => { let b = buckets.get(mat); if (!b) buckets.set(mat, b = [[], []]); b[cast && !mat.transparent ? 0 : 1].push(g); };
  const norm = (geo, matrix) => {
    const g = geo.index ? geo.toNonIndexed() : geo.clone();
    for (const n of Object.keys(g.attributes)) if (!['position', 'normal', 'uv'].includes(n)) g.deleteAttribute(n);
    if (!g.attributes.uv) g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
    if (!g.attributes.normal) g.computeVertexNormals();
    g.clearGroups();
    if (matrix) g.applyMatrix4(matrix);
    return g;
  };
  return {
    /** Bake a placed object (and take it out of the scene). */
    add(obj, cast = true) { obj.updateMatrixWorld(true); obj.traverse(o => { if (o.isMesh && !o.isInstancedMesh) push(o.material, norm(o.geometry, o.matrixWorld), cast); }); obj.removeFromParent(); },
    flush() {
      for (const [mat, lists] of buckets) lists.forEach((list, k) => {
        if (!list.length) return;
        const geo = mergeGeometries(list, false); list.forEach(g => g.dispose()); geo.computeBoundingSphere();
        const m = new THREE.Mesh(geo, mat); m.castShadow = k === 0 && shadows; m.matrixAutoUpdate = false; group.add(m);
      });
      buckets.clear();
    },
  };
}

/* ---------- landmark props ---------- */
const JET_WHITE = paint(0xf6f6f2, { rough: 0.28, clear: 0.8 }), CHROME_DARK = plastic(0x2a2d36, 0.3, 0.6);

/** A private jet, about 22 m long, nose to +Z, on its gear. */
export function privateJet({ accent = 0x1f2a44 } = {}) {
  const b = new ModelBuilder();
  b.add('white', loft([{ z: -11, w: 0.25, h: 0.45, y: 3.0 }, { z: -9, w: 0.85, h: 1.0, y: 2.7 }, { z: -5, w: 1.25, h: 1.35, y: 2.45 }, { z: 4, w: 1.25, h: 1.35, y: 2.4 }, { z: 8, w: 1.0, h: 1.05, y: 2.25 }, { z: 10.4, w: 0.42, h: 0.48, y: 2.05 }, { z: 11.1, w: 0.08, h: 0.08, y: 2.0 }], 20, 4));
  b.add('stripe', loft([{ z: -9.2, w: 0.9, h: 0.16, y: 2.25 }, { z: 9.8, w: 0.82, h: 0.14, y: 2.0 }], 20, 1), { s: [1.03, 1, 1] });
  for (const sx of [-1, 1]) {
    b.add('white', box(8.6, 0.28, 2.6, 0.1, 1), { p: [sx * 5.2, 1.75, -0.6], r: [0, sx * 0.42, sx * -0.06] });
    b.add('accent', box(0.2, 1.4, 1.0, 0.08, 1), { p: [sx * 9.1, 2.3, -2.6], r: [0, sx * 0.42, sx * 0.25] });
    b.add('white', cyl(0.62, 0.55, 3.4, 14), { p: [sx * 1.85, 3.2, -6.6], r: [Math.PI / 2, 0, 0] });
    b.add('dark', cyl(0.5, 0.5, 0.1, 14), { p: [sx * 1.85, 3.2, -4.86], r: [Math.PI / 2, 0, 0] });
    b.add('white', box(0.7, 0.25, 0.9, 0.05, 1), { p: [sx * 1.25, 3.1, -6.6] });
    for (let k = 0; k < 6; k++) b.add('glass', box(0.06, 0.42, 0.55, 0.04, 1), { p: [sx * 1.22, 2.75, -3 + k * 1.15] });
    b.add('tyre', cyl(0.42, 0.42, 0.32, 12), { p: [sx * 1.4, 0.42, -0.8], r: [0, 0, Math.PI / 2] });
    b.add('dark', cyl(0.08, 0.08, 1.4, 5), { p: [sx * 1.4, 1.1, -0.8] });
  }
  b.add('glass', box(1.7, 0.45, 0.9, 0.12, 1), { p: [0, 2.85, 9.0], r: [-0.55, 0, 0] });
  b.add('accent', box(0.3, 4.2, 2.9, 0.08, 1), { p: [0, 4.9, -9.3], r: [-0.45, 0, 0] });
  b.add('accent', box(6.8, 0.24, 1.6, 0.06, 1), { p: [0, 6.75, -10.6] });
  b.add('tyre', cyl(0.3, 0.3, 0.26, 12), { p: [0, 0.3, 8.0], r: [0, 0, Math.PI / 2] });
  b.add('dark', cyl(0.07, 0.07, 1.5, 5), { p: [0, 1.0, 8.0] });
  b.add('step', box(0.9, 0.12, 2.2, 0.03, 1), { p: [1.7, 0.95, 6.6], r: [0, 0, 0.0], s: 1 });
  return b.build({ white: JET_WHITE, stripe: paint(accent, { rough: 0.35 }), accent: paint(accent, { rough: 0.35 }), dark: MAT.dark, glass: CHROME_DARK, tyre: MAT.rubber, step: plastic(0xb21e3a, 0.8) });
}

/** A satellite dish on a post, aimed at the sky. About 5 m tall. */
export function satDish() {
  const b = new ModelBuilder();
  b.add('post', cyl(0.18, 0.24, 3.2, 8), { p: [0, 1.6, 0] });
  b.add('post', box(1.6, 0.3, 1.6, 0.06, 1), { p: [0, 0.15, 0] });
  b.add('dish', lathe([[0, 0], [0.8, 0.08], [1.6, 0.32], [2.2, 0.62], [2.25, 0.68], [0, 0.2]], 18), { p: [0, 3.5, 0.2], r: [-0.85, 0, 0] });
  b.add('post', cyl(0.05, 0.05, 1.8, 5), { p: [0, 4.0, 1.1], r: [-0.85, 0, 0] });
  b.add('lamp', sphere(0.14, 8, 6), { p: [0, 4.6, 1.75] });
  return b.build({ post: plastic(0x8d96a6, 0.4, 0.6), dish: plastic(0xf4f4f0, 0.45), lamp: glow(0xff3030, 3) });
}

/** A window air conditioner, for the yurts that have one. */
export function acUnit() {
  const b = new ModelBuilder();
  b.add('body', box(1.3, 0.9, 1.0, 0.08, 1), { p: [0, 0.45, 0] });
  b.add('grille', cyl(0.36, 0.36, 0.06, 14), { p: [0, 0.48, 0.5], r: [Math.PI / 2, 0, 0] });
  return b.build({ body: plastic(0xe9ebee, 0.5), grille: MAT.dark });
}

/** A bicycle standing upright, wheels along Z. About 1.8 m long. */
export function bicycle() {
  const b = new ModelBuilder();
  for (const z of [-0.55, 0.55]) { b.add('tyre', torus(0.36, 0.045, 5, 18), { p: [0, 0.38, z], r: [0, Math.PI / 2, 0] }); b.add('frame', cyl(0.05, 0.05, 0.12, 6), { p: [0, 0.38, z], r: [0, 0, Math.PI / 2] }); }
  strut(b, 'frame', [0, 0.38, -0.55], [0, 0.85, -0.1], 0.05); strut(b, 'frame', [0, 0.85, -0.1], [0, 0.85, 0.42], 0.05);
  strut(b, 'frame', [0, 0.38, -0.55], [0, 0.4, 0.05], 0.05); strut(b, 'frame', [0, 0.4, 0.05], [0, 0.85, -0.1], 0.05);
  strut(b, 'frame', [0, 0.4, 0.05], [0, 0.85, 0.42], 0.05); strut(b, 'frame', [0, 0.85, 0.42], [0, 0.38, 0.55], 0.05);
  strut(b, 'frame', [0, 0.85, 0.42], [0, 1.05, 0.48], 0.05); b.add('bar', box(0.62, 0.05, 0.05, 0.02, 1), { p: [0, 1.06, 0.48] });
  b.add('bar', box(0.16, 0.06, 0.3, 0.03, 1), { p: [0, 0.98, -0.12] });
  b.add('basket', box(0.36, 0.22, 0.3, 0.03, 1), { p: [0, 0.95, 0.66] });
  return b.build({ tyre: MAT.rubber, frame: tintable(0xff6a2a, 0.4), bar: MAT.dark, basket: plastic(0xc9a46a, 0.9) });
}

/** A giant handheld card terminal, about h metres tall, screen facing +Z (lettered by the track).
    userData.screen = { y, z, w, h } in local coordinates. */
export function cardTerminal({ h = 7 } = {}) {
  const b = new ModelBuilder(), s = h / 7;
  b.add('body', box(3.6 * s, 7 * s, 1.0 * s, 0.4 * s, 3), { p: [0, 3.5 * s, 0] });
  b.add('bezel', box(3.0 * s, 2.5 * s, 0.1 * s, 0.1, 1), { p: [0, 5.2 * s, 0.5 * s] });
  for (let r = 0; r < 4; r++) for (let c = 0; c < 3; c++) b.add(r === 3 ? (c === 0 ? 'red' : c === 1 ? 'yellow' : 'green') : 'key', box(0.75 * s, 0.5 * s, 0.16 * s, 0.08, 1), { p: [(c - 1) * 0.95 * s, (3.1 - r * 0.72) * s, 0.52 * s] });
  b.add('card', box(2.4 * s, 0.08 * s, 1.6 * s, 0.05, 1), { p: [0, 7.2 * s, 0.1 * s], r: [0.2, 0, 0] });
  b.add('stand', box(4.4 * s, 0.4 * s, 2.4 * s, 0.1, 1), { p: [0, 0.2 * s, 0] });
  const g = b.build({ body: plastic(0x23252c, 0.4, 0.2), bezel: MAT.black, key: plastic(0x4a4f5a, 0.5), red: plastic(0xe23b3b, 0.5), yellow: plastic(0xffd23c, 0.5), green: plastic(0x2fb36b, 0.5), card: paint(0xd8b04a, { rough: 0.25, metal: 0.6 }), stand: plastic(0x8a5a36, 0.8) });
  g.userData.screen = { y: 5.2 * s, z: 0.57 * s, w: 2.8 * s, h: 2.3 * s };
  return g;
}

/** An open-sided canopy tent with a table, w by d, for meetings of the spirit. */
export function canopyTent({ w = 11, d = 8, h = 3.6, color = 0xf2e6cc } = {}) {
  const b = new ModelBuilder();
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) b.add('pole', cyl(0.1, 0.12, h, 6), { p: [sx * w / 2, h / 2, sz * d / 2] });
  const roof = new THREE.ConeGeometry(Math.hypot(w, d) / 2 * 1.02, 2.2, 4, 1, true); roof.rotateY(Math.PI / 4); roof.scale(w / Math.hypot(w, d) * 1.414, 1, d / Math.hypot(w, d) * 1.414);
  b.add('roof', roof, { p: [0, h + 1.1, 0] });
  b.add('table', box(5.2, 0.12, 1.6, 0.04, 1), { p: [0, 0.95, 0] });
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) b.add('pole', cyl(0.05, 0.05, 0.9, 5), { p: [sx * 2.4, 0.45, sz * 0.65] });
  b.add('rug', box(w - 1, 0.04, d - 1, 0.02, 1), { p: [0, 0.02, 0] });
  for (const sx of [-1.6, 0, 1.6]) b.add('lamp', sphere(0.22, 8, 6), { p: [sx, h - 0.3, 0] });
  const rm = new THREE.MeshStandardMaterial({ color, roughness: 0.9, side: THREE.DoubleSide });
  return b.build({ pole: WOOD_DARK, roof: rm, table: WOOD_PALE, rug: plastic(0xb5452c, 0.95), lamp: glow(0xffc46a, 2.4) });
}

/** A seated or standing person, simple and chunky (tintable clothes). */
export function person({ seated = false, h = 1.75 } = {}) {
  const b = new ModelBuilder(), s = h / 1.75, y0 = seated ? -0.45 * s : 0;
  if (!seated) for (const sx of [-1, 1]) b.add('legs', cyl(0.11 * s, 0.1 * s, 0.85 * s, 6), { p: [sx * 0.13 * s, 0.43 * s, 0] });
  else { b.add('legs', box(0.4 * s, 0.2 * s, 0.6 * s, 0.05, 1), { p: [0, 0.5 * s, 0.25 * s] }); b.add('legs', box(0.5 * s, 0.45 * s, 0.5 * s, 0.05, 1), { p: [0, 0.22 * s, -0.05 * s] }); }
  b.add('body', cyl(0.24 * s, 0.2 * s, 0.7 * s, 8), { p: [0, y0 + 1.2 * s, 0] });
  b.add('head', sphere(0.15 * s, 10, 8), { p: [0, y0 + 1.68 * s, 0] });
  return b.build({ legs: plastic(0x2a2d36, 0.8), body: tintable(0xffffff, 0.8), head: plastic(0xd9a07a, 0.7) });
}

/** Brass stanchion posts with red velvet rope sagging between them, through points [[x,y,z]...]. */
export function velvetRope(pts) {
  const b = new ModelBuilder();
  pts.forEach(p => { b.add('brass', cyl(0.06, 0.06, 1.0, 8), { p: [p[0], p[1] + 0.5, p[2]] }); b.add('brass', cyl(0.22, 0.26, 0.08, 10), { p: [p[0], p[1] + 0.04, p[2]] }); b.add('brass', sphere(0.09, 8, 6), { p: [p[0], p[1] + 1.04, p[2]] }); });
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i], c = pts[i + 1], mid = [(a[0] + c[0]) / 2, (a[1] + c[1]) / 2 + 0.55, (a[2] + c[2]) / 2];
    b.add('rope', tube([[a[0], a[1] + 0.95, a[2]], mid, [c[0], c[1] + 0.95, c[2]]], 0.06, 8, 5));
  }
  return b.build({ brass: paint(0xd8b04a, { rough: 0.25, metal: 0.8 }), rope: plastic(0xb0102c, 0.9) });
}

/** An ice stand: a little shack with a counter and a stack of coolers. */
export function iceShack() {
  const b = new ModelBuilder();
  b.add('wall', box(5, 2.8, 3.2, 0.1, 1), { p: [0, 1.4, -0.4] });
  b.add('roof', box(5.8, 0.25, 4.6, 0.06, 1), { p: [0, 3.0, 0.1], r: [0.12, 0, 0] });
  b.add('counter', box(5, 1.1, 0.6, 0.06, 1), { p: [0, 0.55, 1.5] });
  for (const sx of [-2.6, 2.6]) b.add('wall', cyl(0.1, 0.1, 3.0, 6), { p: [sx, 1.5, 1.9] });
  for (const [x, y] of [[-3.6, 0], [-3.6, 0.7], [3.6, 0], [3.8, 0.7], [3.4, 1.4]]) b.add('cooler', box(1.1, 0.68, 0.7, 0.1, 1), { p: [x, y + 0.34, 1.2] });
  b.add('ice', box(0.9, 0.6, 0.5, 0.15, 2), { p: [-1, 1.4, 1.5] });
  b.add('ice', box(0.7, 0.5, 0.5, 0.15, 2), { p: [0.6, 1.35, 1.5] });
  return b.build({ wall: plastic(0x7fc8ff, 0.7), roof: plastic(0xf4f4f0, 0.6), counter: plastic(0x2a6fd0, 0.6), cooler: plastic(0xffffff, 0.5), ice: new THREE.MeshStandardMaterial({ color: 0xd8f0ff, roughness: 0.1, metalness: 0.1, transparent: true, opacity: 0.85, depthWrite: false }) });
}

/** The furry stretch limo, parked as art: len metres long. */
export function limoArtCar({ len = 10 } = {}) {
  const b = new ModelBuilder();
  limoBody(b, len);
  b.add('under', box(1.8, 0.1, len - 0.6, 0.04, 1), { p: [0, 0.3, 0] });
  return b.build({ fur: plastic(0xff8ad0, 1.0), glass: plastic(0x14161c, 0.15, 0.3), chrome: MAT.chrome, lamp: glow(0xfff4d6, 3), tyre: MAT.rubber, under: glow(0xff4fa8, 2.5) });
}

/** A plain sign frame: two legs and a back board, for a w by h panel whose centre is `up` metres high. Face +Z. */
export function signFrame(w, h, up, { color = 0x3a2c34, legs = 2 } = {}) {
  const b = new ModelBuilder();
  const xs = legs === 2 ? [-w * 0.32, w * 0.32] : [-w * 0.4, 0, w * 0.4];
  for (const x of xs) b.add('f', cyl(0.18 + w * 0.006, 0.24 + w * 0.006, up + h * 0.4, 8), { p: [x, (up + h * 0.4) / 2, -0.32] });
  b.add('f', box(w + 0.5, h + 0.5, 0.3, 0.08, 1), { p: [0, up, -0.2] });
  return b.build({ f: plastic(color, 0.6, 0.3) });
}

/** A superyacht, about L metres long, bow to +Z, keel at y = 0 (for beaching in a dune).
    userData.name = { x, y, z, w, h }: where the name goes on each side (local, +x side; mirror x for the other). */
export function superyacht({ L = 56 } = {}) {
  const b = new ModelBuilder(), H = L / 2, W = L * 0.1;
  const hull = (y, h, w) => loft([{ z: -H, w: w * 0.86, h, y, n: 3 }, { z: -H * 0.6, w, h, y, n: 3 }, { z: H * 0.35, w, h, y, n: 3 }, { z: H * 0.8, w: w * 0.55, h: h * 0.95, y: y + 0.2, n: 2.6 }, { z: H, w: 0.3, h: h * 0.7, y: y + 0.6, n: 2 }], 22, 4);
  b.add('navy', hull(1.6, 1.7, W * 0.92));
  b.add('white', hull(4.1, 1.4, W));
  b.add('trim', hull(5.55, 0.12, W * 1.01));
  // decks, each with a dark window band
  [[0.66, 7.2, 0.86], [0.48, 10.0, 0.74], [0.3, 12.6, 0.6]].forEach(([f, y, wf], k) => {
    const len = L * f, z0 = -H * 0.25 + k * L * 0.04;
    b.add('white', box(W * 2 * wf, 2.6, len, 0.4, 2), { p: [0, y, z0] });
    b.add('glass', box(W * 2 * wf + 0.1, 1.0, len * 0.94, 0.2, 1), { p: [0, y + 0.2, z0] });
    b.add('white', box(W * 2 * wf + 0.6, 0.25, len + 0.8, 0.08, 1), { p: [0, y + 1.4, z0] });
  });
  b.add('white', cyl(0.25, 0.35, 6, 8), { p: [0, 16.5, -H * 0.05] });
  b.add('white', sphere(1.3, 14, 10), { p: [0, 18.6, -H * 0.05] });
  b.add('white', box(4, 0.3, 0.4, 0.05, 1), { p: [0, 17.2, -H * 0.05] });
  b.add('pad', cyl(W * 0.8, W * 0.8, 0.3, 24), { p: [0, 6.0, -H * 0.82] });
  b.add('padMark', torus(W * 0.55, 0.18, 4, 24), { p: [0, 6.2, -H * 0.82], r: [Math.PI / 2, 0, 0] });
  const g = b.build({ navy: paint(0x1f2a44, { rough: 0.35 }), white: JET_WHITE, trim: paint(0xd8b04a, { rough: 0.25, metal: 0.8 }), glass: CHROME_DARK, pad: MAT.dark, padMark: plastic(0xffd23c, 0.5) });   // shares the jets' materials, so it bakes into the same meshes
  g.userData.name = { x: W * 0.74 + 0.1, y: 10.1, z: -H * 0.25 + L * 0.04, w: L * 0.46, h: 2.6 };   // on the middle deck, where it shows over a dune
  return g;
}
