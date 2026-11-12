/* Props for Capitol Hill Climb: the domed capitol the road runs through, the
   obelisk, columned memorial halls, cherry trees, flagpoles with waving
   striped flags, street lamps, a fountain, stone balustrades, hedges, flower
   beds, protest signs, and two obstacles: the motorcade SUV and a roll of red
   tape. Each builder returns a THREE.Group on y = 0, facing +Z. Textures and
   canvases are only created inside the functions, so this module imports
   cleanly in Node. */
import * as THREE from 'three';
import { ModelBuilder, box, sphere, cyl, cone, torus, lathe, plastic, paint, glow, MAT } from './build.js';
import { canvasTex } from '../render/textures.js';
import { makeRng } from '../core/util.js';
// the sign toolkit (world-space quads, a text atlas, a static baker, LED panels) is shared with Crypto Cove
export { Quads, makeBaker, makeAtlas, fitText, signDraw, ledPanel, SIGN_FONT, SANS } from './props-crypto-cove.js';

const MARBLE = 0xf2efe6, MARBLE_D = 0xe0d9c8, STONE = 0xe8e1d0, GOLD = 0xd4af37;
const marble = () => plastic(MARBLE, 0.55);
const marbleD = () => plastic(MARBLE_D, 0.62);
const gold = () => paint(GOLD, { rough: 0.3, metal: 0.65, clear: 0.4 });
const flatMat = {};
const flat = color => flatMat[color] || (flatMat[color] = new THREE.MeshStandardMaterial({ color, roughness: 0.6, metalness: 0, flatShading: true, envMapIntensity: 0.6 }));

/** A triangular prism (pediments), apex up, base on y = 0, length along Z. */
function prism(width, height, len) {
  const r = width / Math.sqrt(3);
  const g = new THREE.CylinderGeometry(r, r, len, 3, 1).toNonIndexed();
  g.rotateX(-Math.PI / 2);
  const base = -r / 2, k = height / (1.5 * r);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) p.setY(i, (p.getY(i) - base) * k);
  g.computeVertexNormals();
  return g;
}

/** One classical column: base block, slightly tapered shaft, capital block. */
function column(b, x, y0, h, z, r = 0.6, mat = 'col', capMat = 'colD') {
  b.add(capMat, box(r * 2.5, r * 0.5, r * 2.5, 0.08, 1), { p: [x, y0 + r * 0.25, z] });
  b.add(mat, cyl(r * 0.86, r, h - r * 1.1, 12), { p: [x, y0 + r * 0.5 + (h - r * 1.1) / 2, z] });
  b.add(capMat, box(r * 2.4, r * 0.6, r * 2.4, 0.08, 1), { p: [x, y0 + h - r * 0.3, z] });
}

/**
 * The capitol. The road runs along Z straight through its central hall: the
 * passage (|x| < 12.4, y < 10.8) is left empty for the tunnel shell, and the
 * building ends at z = ±len/2, where the tunnel portals are. Long facades face ±X.
 * The dome's lantern tops out about 45 m above the road.
 */
export function capitol({ len = 80, half = 20 } = {}) {
  const grp = new THREE.Group(), b = new ModelBuilder();
  const L = len / 2, W = half, PX = 12.4, PY = 10.8, top = 15, mid = 18.5;
  // plinth and the two halves either side of the passage
  for (const s of [1, -1]) {
    b.add('base', box(W + 2.5 - PX, 5.2, len + 1.2, 0.3, 2), { p: [s * (PX + (W + 2.5 - PX) / 2), -0.6 - 0.8, 0] });
    b.add('wall', box(W - PX, top - 2, len, 0.2, 2), { p: [s * (PX + (W - PX) / 2), 2 + (top - 2) / 2, 0] });
    // steps up to the long facades
    for (let k = 0; k < 3; k++) b.add(k % 2 ? 'base' : 'baseD', box(1.4, 0.6, len * 0.62 - k * 3, 0.1, 1), { p: [s * (W + 3.2 + k * 1.3), 1.5 - k * 0.6, 0] });
  }
  b.add('wall', box(PX * 2 + 0.2, top - PY, len, 0.2, 2), { p: [0, PY + (top - PY) / 2, 0] });       // over the passage
  // roofs: low wings, a taller centre block under the dome
  b.add('roof', box(W * 2 + 1.6, 0.8, len + 1.6, 0.2, 2), { p: [0, top + 0.4, 0] });
  b.add('wall', box(W * 2 - 2, mid - top - 0.8, 36, 0.2, 2), { p: [0, top + 0.8 + (mid - top - 0.8) / 2, 0] });
  b.add('roof', box(W * 2 - 0.6, 0.7, 37.4, 0.2, 2), { p: [0, mid + 0.35, 0] });
  b.add('gold', box(W * 2 + 1.7, 0.22, len + 1.7, 0.05, 1), { p: [0, top - 0.5, 0] });
  // long facades: a colonnade along each wing, a deep portico with a pediment in the middle
  for (const s of [1, -1]) {
    for (let z = -L + 3; z <= L - 3 + 0.01; z += 4.2) {
      if (Math.abs(z) < 16) continue;
      column(b, s * (W + 1.3), 2, top - 2.6, z, 0.55);
      b.add('win', box(0.2, 4.2, 2.0, 0.05, 1), { p: [s * (W + 0.05), 6.4, z + 2.1] });
    }
    b.add('ent', box(2.6, 1.6, len - 2, 0.15, 1), { p: [s * (W + 1.0), top - 1.4, 0] });
    for (let k = 0; k < 8; k++) column(b, s * (W + 6.2), 2, mid - 2.4, -12.6 + k * 3.6, 0.72);
    b.add('ent', box(8.4, 1.8, 30, 0.2, 2), { p: [s * (W + 3.6), mid - 0.5, 0] });
    b.add('gold', box(8.5, 0.25, 30.1, 0.05, 1), { p: [s * (W + 3.6), mid - 1.25, 0] });
    b.add('roof', prism(31, 5.2, 8.6), { p: [s * (W + 3.6), mid + 0.4, 0], r: [0, Math.PI / 2, 0] });
    b.add('wall', prism(26, 4.0, 8.8), { p: [s * (W + 3.7), mid + 0.75, 0], r: [0, Math.PI / 2, 0] });
    b.add('baseD', box(8.6, 0.9, 32, 0.15, 1), { p: [s * (W + 3.7), 1.5, 0] });
    for (let k = 0; k < 4; k++) b.add('base', box(1.5, 0.5, 28 - k * 2, 0.1, 1), { p: [s * (W + 8.6 + k * 1.4), 0.95 - k * 0.45, 0] });
    for (let k = 0; k < 6; k++) b.add('win', box(0.2, 5.0, 2.2, 0.05, 1), { p: [s * (W + 0.05), 7.5, -10 + k * 4] });
  }
  // end facades round the tunnel portals: engaged columns, entablature, pediment
  for (const e of [1, -1]) {
    for (const x of [-18.2, -14.6, 14.6, 18.2]) column(b, x, 2, top - 2.6, e * (L + 0.5), 0.6);
    b.add('ent', box(W * 2 + 1.4, 1.7, 1.6, 0.15, 1), { p: [0, top - 1.5, e * (L + 0.3)] });
    b.add('ent', box(PX * 2 + 0.6, 1.4, 1.4, 0.15, 1), { p: [0, PY + 0.8, e * (L + 0.25)] });
    b.add('roof', prism(W * 2 + 2, 5.0, 1.8), { p: [0, top + 0.6, e * (L + 0.1)] });
    b.add('gold', box(5, 1.2, 0.3, 0.1, 1), { p: [0, top + 2.1, e * (L + 1.05)] });
  }
  // the dome: a drum ringed with columns, an attic, the dome itself, a lantern and a gold finial
  const dy = mid + 0.7;
  b.add('base', cyl(16.2, 16.6, 1.4, 40), { p: [0, dy + 0.7, 0] });
  b.add('wall', cyl(13.4, 13.4, 9.4, 40), { p: [0, dy + 1.4 + 4.7, 0] });
  for (let k = 0; k < 24; k++) { const a = (k / 24) * Math.PI * 2; column(b, Math.cos(a) * 15.2, dy + 1.4, 8.4, Math.sin(a) * 15.2, 0.48); }
  for (let k = 0; k < 12; k++) { const a = (k / 12) * Math.PI * 2 + 0.13; b.add('win', box(1.6, 4.6, 0.3, 0.05, 1), { p: [Math.cos(a) * 13.45, dy + 6, Math.sin(a) * 13.45], r: [0, -a + Math.PI / 2, 0] }); }
  b.add('ent', cyl(16.3, 16.3, 1.5, 40), { p: [0, dy + 10.55, 0] });
  b.add('gold', cyl(16.35, 16.35, 0.25, 40, true), { p: [0, dy + 10.0, 0] });
  b.add('wall', cyl(12.6, 13.2, 2.6, 40), { p: [0, dy + 12.6, 0] });
  const D = dy + 13.9, R = 12.4, prof = [];
  for (let k = 0; k <= 14; k++) { const t = k / 14, a = t * Math.PI / 2; prof.push([R * Math.cos(a) * (1 - 0.06 * t), D + Math.sin(a) * 11.2]); }
  prof[prof.length - 1][0] = 2.0;
  b.add('dome', lathe(prof, 40));
  for (let k = 0; k < 16; k++) { const a = (k / 16) * Math.PI * 2; const pts = []; for (let j = 0; j <= 10; j++) { const t = j / 10 * 0.93, an = t * Math.PI / 2; pts.push([Math.cos(a) * (R + 0.12) * Math.cos(an) * (1 - 0.06 * t), D + Math.sin(an) * 11.32, Math.sin(a) * (R + 0.12) * Math.cos(an) * (1 - 0.06 * t)]); } b.add('domeD', new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map(p => new THREE.Vector3(...p))), 12, 0.22, 5)); }
  const LY = D + 11.0;
  b.add('wall', cyl(2.7, 2.9, 0.6, 18), { p: [0, LY + 0.3, 0] });
  for (let k = 0; k < 8; k++) { const a = (k / 8) * Math.PI * 2; b.add('col', cyl(0.18, 0.2, 2.6, 8), { p: [Math.cos(a) * 2.3, LY + 1.9, Math.sin(a) * 2.3] }); }
  b.add('dark', cyl(1.8, 1.8, 2.6, 14), { p: [0, LY + 1.9, 0] });
  b.add('ent', cyl(2.8, 2.8, 0.5, 18), { p: [0, LY + 3.45, 0] });
  b.add('dome', sphere(2.4, 18, 10), { p: [0, LY + 3.7, 0], s: [1, 0.8, 1] });
  b.add('gold', cyl(0.12, 0.3, 2.2, 8), { p: [0, LY + 6.5, 0] });
  b.add('gold', sphere(0.5, 12, 8), { p: [0, LY + 7.8, 0] });
  const mD = marbleD(), mW = marble();
  grp.add(b.build({ base: mD, baseD: plastic(0xd2cab6, 0.7), wall: mW, roof: plastic(0xe8e2d4, 0.6), col: plastic(0xfaf8f2, 0.45), colD: mD, ent: mW, win: plastic(0x3a3f4a, 0.4, 0.2), gold: gold(), dome: plastic(0xf7f5ee, 0.4), domeD: mD, dark: MAT.dark }));
  grp.userData.height = LY + 8.3;
  return grp;
}

/** The obelisk: about 31 m of pale stone, gently tapered, with a pyramid top. */
export function obelisk({ h = 26 } = {}) {
  const b = new ModelBuilder();
  b.add('stone', box(12, 1.0, 12, 0.15, 1), { p: [0, 0.5, 0] });
  b.add('stoneD', box(9.6, 1.2, 9.6, 0.15, 1), { p: [0, 1.6, 0] });
  b.add('stone', box(7.6, 0.9, 7.6, 0.12, 1), { p: [0, 2.65, 0] });
  b.add('shaft', cyl(2.35, 3.55, h, 4), { p: [0, 3.1 + h / 2, 0], r: [0, Math.PI / 4, 0] });
  b.add('shaft', cone(2.35, 2.9, 4), { p: [0, 3.1 + h + 1.45, 0], r: [0, Math.PI / 4, 0] });
  return b.build({ stone: plastic(STONE, 0.7), stoneD: plastic(0xd6cdb9, 0.75), shaft: flat(0xece6d6) });
}

/** A columned memorial hall: a rectangular colonnade round a cella, flat attic roof. Front on +Z. */
export function memorialHall({ w = 34, d = 22, h = 9 } = {}) {
  const b = new ModelBuilder();
  for (let k = 0; k < 4; k++) b.add(k % 2 ? 'base' : 'baseD', box(w + 6 - k * 1.6, 0.55, d + 6 - k * 1.6, 0.1, 1), { p: [0, 0.27 + k * 0.55, 0] });
  const y0 = 2.2;
  b.add('wall', box(w - 6, h, d - 6, 0.2, 2), { p: [0, y0 + h / 2, 0] });
  const nx = Math.round(w / 3.2), nz = Math.round(d / 3.2);
  for (let i = 0; i <= nx; i++) for (let j = 0; j <= nz; j++) {
    if (i > 0 && i < nx && j > 0 && j < nz) continue;
    column(b, -w / 2 + (i / nx) * w, y0, h, -d / 2 + (j / nz) * d, 0.5);
  }
  b.add('ent', box(w + 1.6, 1.4, d + 1.6, 0.15, 1), { p: [0, y0 + h + 0.7, 0] });
  b.add('gold', box(w + 1.7, 0.2, d + 1.7, 0.04, 1), { p: [0, y0 + h + 0.3, 0] });
  b.add('wall', box(w - 1, 2.0, d - 1, 0.2, 2), { p: [0, y0 + h + 2.4, 0] });
  b.add('ent', box(w - 0.4, 0.4, d - 0.4, 0.1, 1), { p: [0, y0 + h + 3.5, 0] });
  b.add('dark', box(4, 5.5, 0.3, 0.05, 1), { p: [0, y0 + 2.75, (d - 6) / 2 + 0.1] });
  const mD = marbleD(), mW = marble();
  return b.build({ base: mD, baseD: plastic(0xd2cab6, 0.7), wall: mW, col: plastic(0xfaf8f2, 0.45), colD: mD, ent: mW, gold: gold(), dark: plastic(0x5a4a3a, 0.6) });
}

/** A small round temple: a ring of columns under a shallow dome, on a stepped drum. */
export function roundTemple({ r = 8, h = 8 } = {}) {
  const b = new ModelBuilder();
  for (let k = 0; k < 3; k++) b.add(k % 2 ? 'base' : 'baseD', cyl(r + 2.6 - k * 0.9, r + 2.6 - k * 0.9, 0.55, 32), { p: [0, 0.27 + k * 0.55, 0] });
  const y0 = 1.65, n = 12;
  for (let k = 0; k < n; k++) { const a = (k / n) * Math.PI * 2; column(b, Math.cos(a) * r, y0, h, Math.sin(a) * r, 0.5); }
  b.add('wall', cyl(r * 0.55, r * 0.55, h, 24), { p: [0, y0 + h / 2, 0] });
  b.add('ent', cyl(r + 0.9, r + 0.9, 1.3, 32), { p: [0, y0 + h + 0.65, 0] });
  b.add('gold', cyl(r + 0.95, r + 0.95, 0.2, 32, true), { p: [0, y0 + h + 0.25, 0] });
  const prof = []; for (let k = 0; k <= 10; k++) { const a = (k / 10) * Math.PI / 2; prof.push([(r + 0.5) * Math.cos(a), y0 + h + 1.3 + Math.sin(a) * r * 0.55]); }
  b.add('dome', lathe(prof, 32));
  b.add('gold', sphere(0.45, 10, 8), { p: [0, y0 + h + 1.5 + r * 0.55, 0] });
  const mD = marbleD(), mW = marble();
  return b.build({ base: mD, baseD: plastic(0xd2cab6, 0.7), wall: mW, col: plastic(0xfaf8f2, 0.45), colD: mD, ent: mW, gold: gold(), dome: plastic(0xf7f5ee, 0.4) });
}

/* ---------- plants and garden furniture ---------- */
function blob(r, seed = 1, lump = 0.22, detail = 2) {
  const g = new THREE.IcosahedronGeometry(r, detail), p = g.attributes.position, rng = makeRng(seed);
  const ph = [rng() * 6, rng() * 6, rng() * 6];
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const n = Math.sin(x * 2.3 / r + ph[0]) * Math.cos(y * 2.1 / r + ph[1]) + Math.sin(z * 2.7 / r + ph[2]) * 0.6;
    const k = 1 + n * lump * 0.5; p.setXYZ(i, x * k, y * k, z * k);
  }
  g.computeVertexNormals();
  return g;
}
const leafMat = {};
const leaf = color => leafMat[color] || (leafMat[color] = new THREE.MeshStandardMaterial({ color, roughness: 0.9, metalness: 0, envMapIntensity: 0.45 }));

/** Cherry tree in full blossom: a short dark trunk with spreading branches and a wide, flat pink crown. */
export function cherryTree(seed = 1, { h = 6.5, pinkA = 0xf7b8d0, pinkB = 0xee8fb4 } = {}) {
  const rng = makeRng(seed), b = new ModelBuilder();
  b.add('bark', cyl(0.24, 0.38, h * 0.42, 8), { p: [0, h * 0.21, 0] });
  for (let i = 0; i < 3; i++) { const a = rng() * 6.28; b.add('bark', cyl(0.1, 0.18, h * 0.38, 6), { p: [Math.cos(a) * 0.5, h * 0.5, Math.sin(a) * 0.5], r: [Math.sin(a) * 0.7, 0, -Math.cos(a) * 0.7] }); }
  const n = 4;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + rng() * 0.6, d = i === 0 ? 0 : h * (0.3 + rng() * 0.08), r = h * (0.24 + rng() * 0.07) * (i === 0 ? 1.2 : 1);
    b.add(i % 2 ? 'pinkB' : 'pinkA', blob(r, seed * 11 + i, 0.3, 2), { p: [Math.cos(a) * d, h * (0.66 + rng() * 0.12), Math.sin(a) * d], s: [1, 0.72, 1] });
  }
  return b.build({ bark: plastic(0x54382d, 0.9), pinkA: leaf(pinkA), pinkB: leaf(pinkB) });
}

/** Clipped hedge block, `len` metres along X. */
export function hedge(len = 6, { h = 1.4, color = 0x3f8a3a } = {}) {
  const b = new ModelBuilder();
  b.add('h', box(len, h, 1.6, 0.45, 3), { p: [0, h / 2, 0] });
  return b.build({ h: leaf(color) });
}

/** Round flower bed in a stone kerb. */
export function flowerBed(seed = 1, { r = 2.6, colors = [0xff5c8a, 0xffffff, 0xd61f45] } = {}) {
  const rng = makeRng(seed), b = new ModelBuilder();
  b.add('kerb', torus(r, 0.22, 6, 28), { p: [0, 0.18, 0], r: [Math.PI / 2, 0, 0] });
  b.add('soil', cyl(r, r, 0.3, 24), { p: [0, 0.15, 0] });
  b.add('leaf', cyl(r * 0.92, r * 0.92, 0.32, 20), { p: [0, 0.36, 0] });
  for (let i = 0; i < 26; i++) { const a = rng() * 6.28, d = Math.sqrt(rng()) * r * 0.85; b.add('f' + (i % Math.min(2, colors.length)), sphere(0.2, 5, 4), { p: [Math.cos(a) * d, 0.58 + rng() * 0.1, Math.sin(a) * d] }); }
  const mats = { kerb: plastic(STONE, 0.7), soil: plastic(0x6b4a33, 0.95), leaf: leaf(0x3f8f3a) };
  colors.slice(0, 2).forEach((c, i) => { mats['f' + i] = plastic(c, 0.6); });
  return b.build(mats);
}

/** Stone balustrade segment, `len` metres along X. */
export function balustrade(len = 4) {
  const b = new ModelBuilder();
  b.add('s', box(len, 0.3, 0.7, 0.06, 1), { p: [0, 0.15, 0] });
  b.add('s', box(len + 0.1, 0.22, 0.62, 0.06, 1), { p: [0, 1.06, 0] });
  const n = Math.round(len / 0.55);
  const bal = lathe([[0, 0], [0.13, 0], [0.13, 0.08], [0.08, 0.16], [0.15, 0.36], [0.07, 0.56], [0.1, 0.62], [0.12, 0.66], [0, 0.66]], 6);
  for (let i = 0; i < n; i++) b.add('b', bal, { p: [-len / 2 + (i + 0.5) * (len / n), 0.29, 0] });
  b.add('s', box(0.55, 1.3, 0.75, 0.06, 1), { p: [len / 2 - 0.27, 0.65, 0] });
  return b.build({ s: plastic(STONE, 0.65), b: plastic(0xf0ebdf, 0.6) });
}

/** Classic street lamp with two warm globes. */
export function streetLamp({ h = 5.2 } = {}) {
  const b = new ModelBuilder();
  b.add('iron', cyl(0.36, 0.46, 0.7, 10), { p: [0, 0.35, 0] });
  b.add('iron', cyl(0.09, 0.14, h, 8), { p: [0, h / 2, 0] });
  b.add('iron', box(1.9, 0.12, 0.12, 0.04, 1), { p: [0, h - 0.4, 0] });
  for (const s of [1, -1]) { b.add('iron', cyl(0.12, 0.08, 0.3, 8), { p: [s * 0.9, h - 0.25, 0] }); b.add('globe', sphere(0.34, 9, 6), { p: [s * 0.9, h + 0.15, 0] }); }
  b.add('globe', sphere(0.3, 9, 6), { p: [0, h + 0.35, 0] });
  b.add('gold', sphere(0.12, 6, 4), { p: [0, h + 0.75, 0] });
  return b.build({ iron: plastic(0x23302a, 0.5, 0.4), globe: glow(0xffd28a, 2.2), gold: gold() });
}

/** Shared clock for the waving flags; decorate() advances it. */
export const FLAG_TIME = { value: 0 };
const flagMats = {};
function flagMaterial(a, b) {
  const key = a + ':' + b;
  if (flagMats[key]) return flagMats[key];
  const ca = '#' + new THREE.Color(a).getHexString(), cb = '#' + new THREE.Color(b).getHexString();
  const tex = canvasTex(128, 80, (g, w, h) => { g.fillStyle = ca; g.fillRect(0, 0, w, h); g.fillStyle = cb; g.fillRect(w * 0.36, 0, w * 0.28, h); }, { repeat: false, aniso: 2 });   // a plain bicolour: never a real flag
  const m = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.75, side: THREE.DoubleSide });
  m.onBeforeCompile = sh => {
    sh.uniforms.uTime = FLAG_TIME;
    sh.vertexShader = 'uniform float uTime;\n' + sh.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
      float ph = 0.0;
      #ifdef USE_INSTANCING
        ph = instanceMatrix[3].x * 0.37 + instanceMatrix[3].z * 0.23;
      #endif
      float fk = clamp(position.x / 3.0, 0.0, 1.0);
      transformed.z += sin(position.x * 2.1 - uTime * 3.4 + ph) * 0.26 * fk;
      transformed.y += sin(position.x * 1.3 - uTime * 2.2 + ph) * 0.06 * fk;`);
  };
  m.customProgramCacheKey = () => 'capitol-flag';
  return (flagMats[key] = m);
}
/** Flagpole with a plain two-colour flag (a broad centre stripe; no real flags). */
export function flagpole({ h = 9, a = 0xb3122a, b = 0xd4af37 } = {}) {
  const grp = new THREE.Group(), mb = new ModelBuilder();
  mb.add('base', cyl(0.4, 0.5, 0.5, 10), { p: [0, 0.25, 0] });
  mb.add('pole', cyl(0.07, 0.11, h, 8), { p: [0, h / 2, 0] });
  mb.add('gold', sphere(0.17, 10, 8), { p: [0, h + 0.12, 0] });
  grp.add(mb.build({ base: plastic(STONE, 0.7), pole: plastic(0xe9ebee, 0.3, 0.7), gold: gold() }));
  const g = new THREE.PlaneGeometry(3, 1.8, 12, 2); g.translate(1.6, h - 1.2, 0);
  grp.add(new THREE.Mesh(g, flagMaterial(a, b)));
  return grp;
}

/** Fountain: a round basin, two tiers, and a jet. userData.jet is the jet's top in local space. */
export function fountain({ r = 7 } = {}) {
  const grp = new THREE.Group(), b = new ModelBuilder();
  b.add('stone', lathe([[0, 0], [r + 0.6, 0], [r + 0.6, 0.9], [r + 0.1, 1.0], [r, 0.5], [0, 0.5]], 40));
  b.add('stone', cyl(0.9, 1.2, 2.6, 16), { p: [0, 1.6, 0] });
  b.add('stone', lathe([[0, 0], [3.0, 0.5], [3.2, 0.8], [2.8, 0.8], [0, 0.45]], 28), { p: [0, 2.8, 0] });
  b.add('stone', cyl(0.4, 0.55, 1.6, 12), { p: [0, 4.2, 0] });
  b.add('stone', lathe([[0, 0], [1.5, 0.35], [1.6, 0.55], [1.3, 0.55], [0, 0.3]], 20), { p: [0, 4.9, 0] });
  b.add('gold', sphere(0.35, 10, 8), { p: [0, 5.6, 0] });
  grp.add(b.build({ stone: plastic(STONE, 0.6), gold: gold() }));
  const water = new THREE.MeshStandardMaterial({ color: 0x7fcbe6, roughness: 0.1, metalness: 0.1, transparent: true, opacity: 0.85 });
  const pool = new THREE.Mesh(new THREE.CircleGeometry(r, 36), water); pool.rotation.x = -Math.PI / 2; pool.position.y = 0.75; grp.add(pool);
  const bowl = new THREE.Mesh(new THREE.CircleGeometry(2.85, 24), water); bowl.rotation.x = -Math.PI / 2; bowl.position.y = 3.5; grp.add(bowl);
  const jet = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.42, 6, 10, 1, true), new THREE.MeshBasicMaterial({ color: 0xdff4ff, transparent: true, opacity: 0.5, depthWrite: false }));
  jet.position.y = 8.6; grp.add(jet);
  grp.userData.jet = new THREE.Vector3(0, 11.4, 0);
  return grp;
}

/** A light crowd member for the grandstands (instance it with tints). */
export function crowdPerson() {
  const b = new ModelBuilder();
  b.add('body', cyl(0.26, 0.3, 0.62, 7), { p: [0, 0.31, 0] });
  b.add('body', sphere(0.27, 7, 4), { p: [0, 0.62, 0] });
  b.add('head', sphere(0.21, 7, 5), { p: [0, 0.98, 0] });
  const body = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.8, metalness: 0, envMapIntensity: 0.5 }); body.userData.tintable = true;
  return b.build({ body, head: plastic(0xe6b98f, 0.7) });
}

/* ---------- protest signs ---------- */
const SIGNS = ['MORE HEARINGS', 'FEWER HEARINGS', 'I AM A SIGN', 'CITATION NEEDED', 'SEE ATTACHED MEMO', 'NOTED.'];
let signTex = null;
function signAtlas() {
  if (signTex) return signTex;
  const bg = ['#fff6d8', '#ffffff', '#ffd23c', '#e9f4ff', '#ffe0ea', '#f2efe6'], ink = ['#b3122a', '#1f3f8a', '#12142b', '#b3122a', '#1f3f8a', '#12142b'];
  signTex = canvasTex(1024, 768, (g) => {
    for (let k = 0; k < 6; k++) {
      const x = (k % 2) * 512, y = Math.floor(k / 2) * 256;
      g.fillStyle = bg[k]; g.fillRect(x, y, 512, 256);
      g.strokeStyle = ink[k]; g.lineWidth = 10; g.strokeRect(x + 14, y + 14, 484, 228);
      g.fillStyle = ink[k]; g.textAlign = 'center'; g.textBaseline = 'middle';
      const words = SIGNS[k].split(' '), lines = words.length > 2 ? [words.slice(0, Math.ceil(words.length / 2)).join(' '), words.slice(Math.ceil(words.length / 2)).join(' ')] : words.length === 2 && SIGNS[k].length > 11 ? words : [SIGNS[k]];
      g.font = `${lines.length > 1 ? 84 : 92}px "Luckiest Guy", "Arial Black", sans-serif`;
      lines.forEach((ln, i) => g.fillText(ln, x + 256, y + 128 + (i - (lines.length - 1) / 2) * 92 + 6, 460));
    }
  }, { repeat: false, aniso: 4 });
  return signTex;
}
/** A cluster of hand-painted protest signs on sticks, about 4 m across. */
export function signCluster(seed = 1) {
  const rng = makeRng(seed), grp = new THREE.Group(), b = new ModelBuilder();
  const tex = signAtlas(), mat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.7, side: THREE.DoubleSide });
  const n = 4 + Math.floor(rng() * 2), geo = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + rng() * 0.8, d = 0.6 + rng() * 1.2, x = Math.cos(a) * d, z = Math.sin(a) * d;
    const hgt = 2.0 + rng() * 0.9, yaw = rng() * 0.9 - 0.45 + (rng() < 0.5 ? 0 : Math.PI), tilt = (rng() - 0.5) * 0.25;
    b.add('stick', box(0.1, hgt, 0.1, 0.02, 1), { p: [x, hgt / 2, z], r: [0, yaw, tilt] });
    b.add('board', box(1.9, 0.98, 0.06, 0.03, 1), { p: [x, hgt + 0.2, z - 0.02], r: [0, yaw, tilt] });
    const k = Math.floor(rng() * SIGNS.length), u0 = (k % 2) * 0.5, v0 = 1 - (Math.floor(k / 2) + 1) / 3;
    for (const side of [1, -1]) {
      const pg = new THREE.PlaneGeometry(1.8, 0.9), uv = pg.attributes.uv;
      for (let j = 0; j < uv.count; j++) uv.setXY(j, u0 + uv.getX(j) * 0.5, v0 + uv.getY(j) / 3);
      if (side < 0) pg.rotateY(Math.PI);
      pg.translate(0, 0, side * 0.035);
      const m = new THREE.Matrix4().compose(new THREE.Vector3(x, hgt + 0.2, z - 0.02), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, yaw, tilt)), new THREE.Vector3(1, 1, 1));
      pg.applyMatrix4(m); geo.push(pg);
    }
  }
  grp.add(b.build({ stick: plastic(0x9a6a3a, 0.9), board: plastic(0xf4f1ea, 0.8) }));
  const merged = new THREE.BufferGeometry();
  { // merge the faces by hand (all share one material)
    let count = 0; for (const g of geo) count += g.index.count;
    const pos = new Float32Array(count * 3), nor = new Float32Array(count * 3), uvs = new Float32Array(count * 2); let o = 0;
    for (const g of geo) { const idx = g.index.array, P = g.attributes.position, N = g.attributes.normal, U = g.attributes.uv; for (let j = 0; j < idx.length; j++, o++) { const v = idx[j]; pos.set([P.getX(v), P.getY(v), P.getZ(v)], o * 3); nor.set([N.getX(v), N.getY(v), N.getZ(v)], o * 3); uvs.set([U.getX(v), U.getY(v)], o * 2); } }
    merged.setAttribute('position', new THREE.BufferAttribute(pos, 3)); merged.setAttribute('normal', new THREE.BufferAttribute(nor, 3)); merged.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
  }
  grp.add(new THREE.Mesh(merged, mat));
  return grp;
}

/* ---------- obstacles ---------- */
/** Motorcade SUV: chunky, black, long, with tiny fender flags and a flashing light bar. Front on +Z. */
export function motorcade() {
  const grp = new THREE.Group(), b = new ModelBuilder();
  const L = 6.0, W = 2.3;
  b.add('body', box(W, 1.15, L, 0.4, 3), { p: [0, 0.95, 0] });
  b.add('body', box(W - 0.12, 0.95, L * 0.62, 0.35, 3), { p: [0, 1.9, -0.35] });
  b.add('glass', box(W - 0.06, 0.62, L * 0.6, 0.25, 2), { p: [0, 1.95, -0.35] });
  b.add('body', box(W - 0.1, 0.22, L * 0.6, 0.1, 1), { p: [0, 2.32, -0.35] });
  b.add('chrome', box(W * 0.7, 0.42, 0.12, 0.06, 1), { p: [0, 0.95, L / 2 + 0.01] });
  b.add('chrome', box(W + 0.04, 0.12, L * 0.9, 0.05, 1), { p: [0, 0.55, 0] });
  for (const s of [1, -1]) {
    b.add('head', box(0.45, 0.18, 0.08, 0.04, 1), { p: [s * 0.78, 1.18, L / 2 + 0.01] });
    b.add('tail', box(0.4, 0.2, 0.08, 0.04, 1), { p: [s * 0.82, 1.18, -L / 2 - 0.01] });
    for (const z of [L * 0.32, -L * 0.32]) { b.add('tyre', cyl(0.46, 0.46, 0.38, 16), { p: [s * (W / 2 - 0.08), 0.46, z], r: [0, 0, Math.PI / 2] }); b.add('chrome', cyl(0.24, 0.24, 0.4, 12), { p: [s * (W / 2 - 0.06), 0.46, z], r: [0, 0, Math.PI / 2] }); }
    b.add('chrome', cyl(0.025, 0.025, 0.7, 5), { p: [s * 0.95, 1.85, L / 2 - 0.35] });
  }
  grp.add(b.build({ body: paint(0x0d0e12, { rough: 0.22, clear: 1 }), glass: plastic(0x1b2533, 0.1, 0.5), chrome: MAT.chrome, head: glow(0xfff4d0, 2), tail: glow(0xff2a2a, 1.6), tyre: MAT.rubber }));
  // tiny fender flags (plain stripes)
  for (const s of [1, -1]) {
    const f = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.32), new THREE.MeshStandardMaterial({ color: s > 0 ? 0xb3122a : 0x1f3f8a, roughness: 0.7, side: THREE.DoubleSide }));
    f.position.set(s * 0.95 + s * 0.26, 2.05, L / 2 - 0.35); f.rotation.y = Math.PI / 2; grp.add(f);
  }
  // light bar: red and blue halves that alternate
  const red = new THREE.MeshStandardMaterial({ color: 0x330000, emissive: 0xff2030, emissiveIntensity: 3, roughness: 0.3 });
  const blue = new THREE.MeshStandardMaterial({ color: 0x000833, emissive: 0x2a5cff, emissiveIntensity: 0.3, roughness: 0.3 });
  const lb = new ModelBuilder();
  lb.add('dark', box(1.7, 0.16, 0.34, 0.06, 1), { p: [0, 2.48, 0.4] });
  const bar = lb.build({ dark: MAT.dark }); grp.add(bar);
  const r = new THREE.Mesh(box(0.72, 0.2, 0.3, 0.07, 1), red), bl = new THREE.Mesh(box(0.72, 0.2, 0.3, 0.07, 1), blue);
  r.position.set(-0.42, 2.62, 0.4); bl.position.set(0.42, 2.62, 0.4); grp.add(r, bl);
  r.onBeforeRender = () => { const on = Math.floor(performance.now() / 260) % 2 === 0; red.emissiveIntensity = on ? 3.2 : 0.3; blue.emissiveIntensity = on ? 0.3 : 3.2; };
  return grp;
}

/** Red tape: a giant desk tape dispenser loaded with red tape, a length of it trailing over the road. */
export function redTape() {
  const b = new ModelBuilder();
  b.add('body', box(1.3, 0.55, 3.0, 0.24, 3), { p: [0, 0.3, 0] });
  b.add('body', sphere(1, 20, 14), { p: [0, 0.75, -0.55], s: [0.62, 0.75, 1.05] });
  b.add('body', box(1.1, 0.5, 0.6, 0.18, 2), { p: [0, 0.75, 1.15] });
  b.add('teeth', box(1.2, 0.12, 0.18, 0.03, 1), { p: [0, 1.05, 1.45] });
  b.add('core', cyl(0.52, 0.52, 0.86, 20), { p: [0, 1.45, 0.05], r: [0, 0, Math.PI / 2] });
  b.add('tape', cyl(0.92, 0.92, 0.8, 26), { p: [0, 1.45, 0.05], r: [0, 0, Math.PI / 2] });
  b.add('core', cyl(0.18, 0.18, 1.0, 10), { p: [0, 1.45, 0.05], r: [0, 0, Math.PI / 2] });
  // the strip from the roll over the cutter and down onto the ground, then a loose loop
  const pts = [[0, 2.3, 0.3], [0, 1.95, 1.2], [0, 1.1, 1.62], [0, 0.35, 1.95], [0, 0.04, 2.6], [0.6, 0.04, 3.3], [1.4, 0.04, 3.2], [1.6, 0.04, 2.4], [1.1, 0.04, 1.9]];
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i], c = pts[i + 1], dx = c[0] - a[0], dy = c[1] - a[1], dz = c[2] - a[2], len = Math.hypot(dx, dy, dz);
    b.add('tape', box(0.78, 0.05, len + 0.08, 0.02, 1), { p: [(a[0] + c[0]) / 2, (a[1] + c[1]) / 2, (a[2] + c[2]) / 2], r: [-Math.atan2(dy, Math.hypot(dx, dz)), Math.atan2(dx, dz), 0] });
  }
  const grp = b.build({ body: paint(0x2a2d36, { rough: 0.35, clear: 0.6 }), teeth: MAT.steel, core: plastic(0xf2efe6, 0.6), tape: paint(0xd0142f, { rough: 0.35, clear: 0.5 }) });
  const s = new ModelBuilder(); s.add('p', cyl(0.05, 0.05, 0.9, 5), { p: [-0.5, 1.85, -0.9] }); grp.add(s.build({ p: MAT.dark }));
  grp.add(labelBoard('RED TAPE', 1.6, 0.5, [-0.5, 2.45, -0.9], { bg: '#ffffff', fg: '#d0142f' }));
  return grp;
}

/** A double-sided label (two panels back to back so neither reads mirrored), facing ±Z. Materials cached by text. */
const labelCache = new Map();
function labelBoard(text, w, h, p, { bg = '#ffd23c', fg = '#12142b' } = {}) {
  const key = text + bg + fg;
  if (!labelCache.has(key)) labelCache.set(key, new THREE.MeshStandardMaterial({ roughness: 0.6, map: canvasTex(512, Math.round(512 * h / w), (g, W, H) => {
    g.fillStyle = bg; g.fillRect(0, 0, W, H); let s = 96; g.font = `${s}px "Luckiest Guy", "Arial Black", sans-serif`;
    while (g.measureText(text).width > W - 30 && s > 16) { s -= 4; g.font = `${s}px "Luckiest Guy", "Arial Black", sans-serif`; }
    g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = fg; g.fillText(text, W / 2, H / 2 + 4);
  }, { repeat: false }) }));
  const m = labelCache.get(key), grp = new THREE.Group();
  for (const s of [1, -1]) { const q = new THREE.Mesh(new THREE.PlaneGeometry(w, h), m); q.position.z = s * 0.03; q.rotation.y = s > 0 ? 0 : Math.PI; grp.add(q); }
  grp.position.set(p[0], p[1], p[2]);
  return grp;
}

/** Lobbyist drone: the stock drone's size, with a briefcase of cash slung underneath and a name tag. */
export function lobbyistDrone() {
  const b = new ModelBuilder();
  b.add('body', sphere(0.6, 14, 10), { p: [0, 1.5, 0], s: [1, 0.5, 1.2] });
  b.add('eye', sphere(0.2, 10, 8), { p: [0, 1.45, 0.62] });
  for (const [x, z] of [[1, 1], [-1, 1], [1, -1], [-1, -1]]) { b.add('arm', cyl(0.06, 0.06, 1.2, 6), { p: [x * 0.55, 1.55, z * 0.55], r: [Math.PI / 2, 0, x * z > 0 ? -Math.PI / 4 : Math.PI / 4] }); b.add('rotor', cyl(0.5, 0.5, 0.04, 14), { p: [x * 0.95, 1.7, z * 0.95] }); }
  b.add('arm', cyl(0.03, 0.03, 0.5, 4), { p: [0, 1.05, 0] });
  b.add('case', box(0.9, 0.6, 0.25, 0.06, 2), { p: [0, 0.55, 0] });
  b.add('cash', box(0.6, 0.12, 0.27, 0.02, 1), { p: [0, 0.62, 0] });
  const grp = b.build({ body: paint(0x12142b, { rough: 0.35 }), eye: glow(0x38ff74, 3), arm: MAT.dark, rotor: new THREE.MeshStandardMaterial({ color: 0x9aa4b8, transparent: true, opacity: 0.45, roughness: 0.4 }), case: paint(0x6b4a2a, { rough: 0.5 }), cash: plastic(0x58b368, 0.7) });
  grp.add(labelBoard('LOBBYIST', 1.5, 0.45, [0, 2.15, 0], { bg: '#12142b', fg: '#38ff74' }));
  return grp;
}

/* ---------- the joke pass: big set pieces ---------- */
/** A man in a suit, about 1.9 m tall before scaling, facing +Z. Instance it with tints for the suit. */
export function suit() {
  const b = new ModelBuilder();
  for (const s of [1, -1]) { b.add('suit', cyl(0.13, 0.12, 0.9, 7), { p: [s * 0.15, 0.45, 0] }); b.add('suit', box(0.2, 0.12, 0.34, 0.04, 1), { p: [s * 0.15, 0.06, 0.06] }); }
  b.add('suit', box(0.62, 0.72, 0.34, 0.12, 2), { p: [0, 1.25, 0] });
  b.add('shirt', box(0.2, 0.5, 0.05, 0.02, 1), { p: [0, 1.36, 0.17] });
  b.add('tie', box(0.08, 0.42, 0.06, 0.02, 1), { p: [0, 1.32, 0.19] });
  for (const s of [1, -1]) b.add('suit', cyl(0.08, 0.08, 0.7, 6), { p: [s * 0.37, 1.18, 0.02], r: [0, 0, s * 0.12] });
  b.add('tie', box(0.42, 0.3, 0.1, 0.03, 1), { p: [0.44, 0.75, 0.04] });                    // a briefcase (in tie red: fewer materials)
  b.add('head', sphere(0.17, 10, 8), { p: [0, 1.78, 0] });
  b.add('shirt', new THREE.SphereGeometry(0.175, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2.2), { p: [0, 1.8, -0.01] });   // white hair
  const suitMat = new THREE.MeshStandardMaterial({ color: 0x23262e, roughness: 0.7 }); suitMat.userData.tintable = true;
  return b.build({ suit: suitMat, shirt: plastic(0xf2f2f0, 0.6), tie: plastic(0xb3122a, 0.5), head: plastic(0xe6b98f, 0.7) }, { cast: false });
}
export const SUIT_TINTS = [0x23262e, 0x1f2a44, 0x2e2e2e, 0x3a3f4b, 0x14161c];

/**
 * The revolving door between two towers: REGULATOR (classical, on -X) and INDUSTRY (glass, on +X).
 * The towers are TW wide and TH tall, their centres ±off from the door. Faces ±Z. userData.door is the
 * part that spins (about Y); userData.signs: the board centres on each roof and over the door, in local space.
 */
export function revolvingDoorComplex({ TW = 15, TH = 36, off = 20, R = 9.5, DH = 24 } = {}) {
  const grp = new THREE.Group(), b = new ModelBuilder();
  // REGULATOR: marble with pilasters, a cornice and a pediment
  const rx = -off;
  b.add('marble', box(TW + 3, 2.4, TW + 3, 0.2, 2), { p: [rx, 1.2, 0] });
  b.add('marble', box(TW, TH, TW, 0.2, 2), { p: [rx, 2.4 + TH / 2, 0] });
  for (const s of [1, -1]) for (let k = 0; k < 5; k++) { const u = -TW / 2 + 1.2 + k * (TW - 2.4) / 4; b.add('col', box(0.9, TH - 3, 0.6, 0.1, 1), { p: [rx + u, 2.4 + (TH - 3) / 2 + 0.5, s * (TW / 2 + 0.2)] }); }
  for (const s of [1, -1]) for (let f = 0; f < 8; f++) for (let k = 0; k < 4; k++) b.add('win', box(1.6, 2.4, 0.2, 0.05, 1), { p: [rx - TW / 2 + 2.6 + k * (TW - 5.2) / 3, 6 + f * 4, s * (TW / 2 + 0.05)] });
  b.add('gold', box(TW + 1.2, 1.2, TW + 1.2, 0.1, 1), { p: [rx, 2.4 + TH + 0.6, 0] });
  b.add('marbleD', box(TW + 0.4, 2.2, TW + 0.4, 0.2, 2), { p: [rx, 2.4 + TH + 2.3, 0] });
  // INDUSTRY: a blue glass tower with a dark crown
  const ix = off;
  b.add('dark', box(TW + 3, 2.4, TW + 3, 0.2, 2), { p: [ix, 1.2, 0] });
  b.add('glass', box(TW, TH + 4, TW, 0.2, 2), { p: [ix, 2.4 + (TH + 4) / 2, 0] });
  for (let f = 1; f < 11; f++) b.add('mull', box(TW + 0.15, 0.25, TW + 0.15, 0.05, 1), { p: [ix, 2.4 + f * (TH + 4) / 11, 0] });
  for (const u of [-TW / 4, 0, TW / 4]) for (const s of [1, -1]) { b.add('mull', box(0.25, TH + 4, 0.2, 0.05, 1), { p: [ix + u, 2.4 + (TH + 4) / 2, s * (TW / 2 + 0.05)] }); b.add('mull', box(0.2, TH + 4, 0.25, 0.05, 1), { p: [ix + s * (TW / 2 + 0.05), 2.4 + (TH + 4) / 2, u] }); }
  b.add('dark', box(TW + 0.6, 2.4, TW + 0.6, 0.2, 2), { p: [ix, 2.4 + TH + 4 + 1.2, 0] });
  // the drum: a floor, a crown with a gold band, two curved glass walls left open toward ±Z
  b.add('dark', cyl(R + 0.6, R + 0.8, 0.8, 40), { p: [0, 0.4, 0] });
  b.add('dark', cyl(R + 0.8, R + 0.8, 2.6, 40), { p: [0, DH + 1.3, 0] });
  b.add('gold', cyl(R + 0.85, R + 0.85, 0.5, 40, true), { p: [0, DH + 0.4, 0] });
  for (const s of [1, -1]) for (let k = 0; k <= 4; k++) { const a = s * Math.PI / 2 + (k - 2) * 0.42; b.add('dark', cyl(0.28, 0.28, DH, 8), { p: [Math.sin(a) * R, DH / 2 + 0.8, Math.cos(a) * R] }); }
  grp.add(b.build({ marble: plastic(0xf2efe6, 0.55), marbleD: plastic(0xe0d9c8, 0.62), col: plastic(0xfaf8f2, 0.45), win: plastic(0x3a3f4a, 0.4, 0.2), gold: paint(0xd4af37, { rough: 0.3, metal: 0.65, clear: 0.4 }), dark: plastic(0x23262e, 0.45, 0.4), glass: new THREE.MeshStandardMaterial({ color: 0x5aa2d8, roughness: 0.12, metalness: 0.55, envMapIntensity: 1.4 }), mull: plastic(0x1b2533, 0.4, 0.5) }));
  const wallMat = new THREE.MeshStandardMaterial({ color: 0xbfe2ff, transparent: true, opacity: 0.28, roughness: 0.05, metalness: 0.3, depthWrite: false, side: THREE.DoubleSide });
  { const wb = new ModelBuilder(); for (const s of [1, -1]) wb.add('w', new THREE.CylinderGeometry(R, R, DH, 24, 1, true, s * Math.PI / 2 - 0.95, 1.9), { p: [0, DH / 2 + 0.8, 0] }); grp.add(wb.build({ w: wallMat }, { cast: false })); }
  // the door: four glass wings on a post, spinning
  const door = new THREE.Group(), d = new ModelBuilder();
  d.add('frame', cyl(0.5, 0.5, DH, 12), { p: [0, DH / 2 + 0.8, 0] });
  for (let k = 0; k < 4; k++) { const a = k * Math.PI / 2; d.add('frame', box(R - 0.6, 0.5, 0.4, 0.1, 1), { p: [Math.cos(a) * (R / 2), DH + 0.4, -Math.sin(a) * (R / 2)], r: [0, a, 0] }); d.add('frame', box(R - 0.6, 0.5, 0.4, 0.1, 1), { p: [Math.cos(a) * (R / 2), 1.2, -Math.sin(a) * (R / 2)], r: [0, a, 0] }); d.add('frame', box(0.4, DH, 0.4, 0.1, 1), { p: [Math.cos(a) * (R - 0.5), DH / 2 + 0.8, -Math.sin(a) * (R - 0.5)] }); d.add('pane', box(R - 1, DH - 1.4, 0.15, 0.05, 1), { p: [Math.cos(a) * (R / 2), DH / 2 + 0.8, -Math.sin(a) * (R / 2)], r: [0, a, 0] }); }
  door.add(d.build({ frame: paint(0xd4af37, { rough: 0.3, metal: 0.65 }), pane: new THREE.MeshStandardMaterial({ color: 0xd8f0ff, transparent: true, opacity: 0.35, roughness: 0.05, depthWrite: false }) }, { cast: false }));
  grp.add(door);
  grp.userData.door = door;
  grp.userData.signs = { reg: [rx, 2.4 + TH + 7.6, 0], ind: [ix, 2.4 + TH + 4 + 7.4, 0], door: [0, TH + 21, 0], tw: TW };
  return grp;
}

/** A bronze statue of a senator on the phone (a flip phone, naturally), about 19 m tall with its plinth. Faces +Z. */
export function phoneStatue() {
  const b = new ModelBuilder(), P = 5.5;
  b.add('stone', box(10, P, 8, 0.25, 2), { p: [0, P / 2, 0] });
  b.add('stoneD', box(11, 0.8, 9, 0.2, 1), { p: [0, P - 0.1, 0] });
  b.add('stoneD', box(11.4, 1, 9.4, 0.2, 1), { p: [0, 0.5, 0] });
  const S = 6.6;                                                    // the figure is a 2 m man scaled up
  const at = (x, y, z) => [x * S, P + y * S, z * S];
  for (const s of [1, -1]) { b.add('bronze', cyl(0.14 * S, 0.13 * S, 0.95 * S, 10), { p: at(s * 0.16, 0.48, 0) }); b.add('bronze', box(0.22 * S, 0.12 * S, 0.36 * S, 0.04 * S, 1), { p: at(s * 0.16, 0.06, 0.06) }); }
  b.add('bronze', box(0.66 * S, 0.78 * S, 0.38 * S, 0.12 * S, 2), { p: at(0, 1.3, 0) });
  b.add('bronze', box(0.7 * S, 0.12 * S, 0.4 * S, 0.05 * S, 1), { p: at(0, 1.66, 0) });
  b.add('bronze', cyl(0.085 * S, 0.085 * S, 0.72 * S, 8), { p: at(-0.4, 1.22, 0.02), r: [0, 0, -0.1] });   // one arm down
  b.add('bronze', cyl(0.085 * S, 0.085 * S, 0.42 * S, 8), { p: at(0.38, 1.45, 0.04), r: [0, 0, 0.5] });     // the other up to the ear
  b.add('bronze', cyl(0.08 * S, 0.08 * S, 0.4 * S, 8), { p: at(0.36, 1.72, 0.06), r: [0, 0, -0.65] });
  b.add('bronze', sphere(0.19 * S, 14, 10), { p: at(0, 1.92, 0) });
  b.add('bronze', sphere(0.08 * S, 8, 6), { p: at(0, 1.84, 0.17) });            // nose
  // the flip phone, open, at his ear, with its little antenna
  b.add('phone', box(0.09 * S, 0.2 * S, 0.035 * S, 0.01 * S, 1), { p: at(0.21, 1.86, 0.06), r: [0.2, 0, -0.2] });
  b.add('phone', box(0.09 * S, 0.18 * S, 0.035 * S, 0.01 * S, 1), { p: at(0.2, 2.03, 0.12), r: [-0.7, 0, -0.2] });
  b.add('phone', cyl(0.008 * S, 0.008 * S, 0.12 * S, 5), { p: at(0.25, 2.12, 0.17), r: [-0.6, 0, -0.2] });
  b.add('gold', box(0.1 * S, 0.06 * S, 0.02 * S, 0.01 * S, 1), { p: at(0.2, 2.0, 0.145), r: [-0.7, 0, -0.2] });
  return b.build({ stone: plastic(0xe8e1d0, 0.7), stoneD: plastic(0xd6cdb9, 0.75), bronze: paint(0x4f8a74, { rough: 0.55, metal: 0.35, clear: 0.2 }), phone: plastic(0x2a2d36, 0.4, 0.4), gold: glow(0x9fe6ff, 1.2) });
}

/** The K Street cash cannon: a gold cannon on a carriage, barrel along +Z raised by `elev`. userData.muzzle: local muzzle point. */
export function cashCannon({ elev = 0.62 } = {}) {
  const grp = new THREE.Group(), b = new ModelBuilder();
  b.add('wood', box(4.2, 1.4, 7, 0.2, 2), { p: [0, 1.6, -0.6] });
  for (const s of [1, -1]) { b.add('wheel', cyl(1.6, 1.6, 0.5, 20), { p: [s * 2.4, 1.6, 0.6], r: [0, 0, Math.PI / 2] }); b.add('gold', cyl(0.4, 0.4, 0.62, 10), { p: [s * 2.4, 1.6, 0.6], r: [0, 0, Math.PI / 2] }); }
  b.add('wood', box(2.6, 0.8, 4, 0.2, 2), { p: [0, 0.4, -4.4] });
  const barrel = new ModelBuilder(), L = 9;
  barrel.add('gold', lathe([[0, -1.4], [1.25, -1.4], [1.35, -0.6], [1.1, 0], [0.95, L * 0.7], [1.1, L * 0.72], [1.0, L], [0.7, L], [0.7, L - 0.3], [0, L - 0.3]], 20));
  barrel.add('dark', cyl(0.68, 0.68, 0.1, 16), { p: [0, L - 0.25, 0] });
  barrel.add('gold', sphere(0.8, 12, 8), { p: [0, -1.8, 0] });
  const bar = barrel.build({ gold: paint(0xd4af37, { rough: 0.28, metal: 0.8, clear: 0.4 }), dark: MAT.black });
  const pivot = new THREE.Group(); pivot.position.set(0, 3.1, 0.4); pivot.rotation.x = Math.PI / 2 - elev; pivot.add(bar); grp.add(pivot);
  grp.add(b.build({ wood: plastic(0x5a3a22, 0.8), wheel: plastic(0x3a2616, 0.8), gold: paint(0xd4af37, { rough: 0.3, metal: 0.7 }) }));
  grp.userData.muzzle = [0, 3.1 + Math.sin(elev) * (L - 0.3), 0.4 + Math.cos(elev) * (L - 0.3)];
  grp.userData.elev = elev;
  return grp;
}

/** A giant lectern with a senator behind it and a huge open book. Faces +Z (the lectern front). userData.face: the front panel (centre, w, h). userData.page: the turning page. */
export function filibusterLectern() {
  const grp = new THREE.Group(), b = new ModelBuilder();
  b.add('stone', box(16, 1.2, 12, 0.2, 2), { p: [0, 0.6, -1] });
  b.add('wood', box(9, 9, 4, 0.3, 2), { p: [0, 1.2 + 4.5, 1.5] });
  b.add('wood', box(10, 0.8, 5.4, 0.2, 2), { p: [0, 10.6, 1.4], r: [0.25, 0, 0] });
  b.add('gold', box(9.2, 0.4, 0.3, 0.05, 1), { p: [0, 9.6, 3.55] });
  for (const s of [1, -1]) b.add('dark', cyl(0.12, 0.12, 2.6, 6), { p: [s * 1.2, 12, 2.8], r: [0.5, 0, s * 0.2] });     // microphones
  // the senator: shoulders, a head, a jacket, behind the lectern
  b.add('suit', box(6.2, 5, 3, 0.8, 3), { p: [0, 11.5, -2.2] });
  b.add('shirt', box(1.6, 3.2, 0.2, 0.1, 1), { p: [0, 12.2, -0.65] });
  b.add('tie', box(0.6, 2.8, 0.25, 0.1, 1), { p: [0, 12.0, -0.55] });
  b.add('head', sphere(1.9, 16, 12), { p: [0, 15.6, -2.0] });
  b.add('hair', new THREE.SphereGeometry(1.95, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2.4), { p: [0, 15.9, -2.1] });
  for (const s of [1, -1]) b.add('dark', box(0.5, 0.18, 0.1, 0.03, 1), { p: [s * 0.7, 15.9, -0.2] });               // reading glasses
  // the book: two thick halves open on the lectern
  for (const s of [1, -1]) b.add('paper', box(3.6, 0.6, 3.8, 0.1, 1), { p: [s * 1.85, 11.4, 1.3], r: [0.25, 0, -s * 0.06] });
  grp.add(b.build({ stone: plastic(0xe8e1d0, 0.7), wood: plastic(0x6b4325, 0.6), gold: paint(0xd4af37, { rough: 0.3, metal: 0.65 }), dark: MAT.dark, suit: plastic(0x1f2a44, 0.7), shirt: plastic(0xffffff, 0.6), tie: plastic(0x1f3f8a, 0.5), head: plastic(0xe6b98f, 0.7), hair: plastic(0xd9dbe0, 0.8), paper: plastic(0xf7f2e2, 0.7) }));
  const page = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 3.6).translate(1.7, 0, 0), new THREE.MeshStandardMaterial({ color: 0xfffbef, roughness: 0.7, side: THREE.DoubleSide }));
  const hinge = new THREE.Group(); hinge.position.set(0, 11.75, 1.3); hinge.rotation.x = -Math.PI / 2 + 0.25; hinge.add(page); grp.add(hinge);
  grp.userData.page = hinge;
  grp.userData.face = { c: [0, 5.6, 3.52], w: 8.2, h: 6.4 };
  return grp;
}

/** One dollar bill as a small flat quad (instance it). */
export function billGeometry() {
  const g = new THREE.PlaneGeometry(2.6, 1.12);
  return g;
}
export const billMaterial = () => new THREE.MeshStandardMaterial({ roughness: 0.7, side: THREE.DoubleSide, map: canvasTex(128, 56, (g, w, h) => {
  g.fillStyle = '#9fd6a0'; g.fillRect(0, 0, w, h); g.strokeStyle = '#2f6b3a'; g.lineWidth = 4; g.strokeRect(3, 3, w - 6, h - 6);
  g.fillStyle = '#2f6b3a'; g.beginPath(); g.ellipse(w / 2, h / 2, 13, 17, 0, 0, 7); g.fill(); g.fillStyle = '#9fd6a0'; g.font = 'bold 24px Arial'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('$', w / 2, h / 2 + 1);
}, { repeat: false }) });
