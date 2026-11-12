/* Props for Mars Colony: habitat domes, transit tubes, greenhouses, solar
   panels, rock spires and mesas, antenna masts, a cargo lander, habitat
   modules, flags, the hiring sign, the planet Earth, rovers, and rust dust
   devils. Each builder returns a THREE.Group on y = 0, facing +Z, made of a few
   merged meshes. Nothing here touches the DOM at import time. */
import * as THREE from 'three';
import { ModelBuilder, box, sphere, cyl, torus, tube, lathe, plastic, glow, paint, MAT } from './build.js';
import { canvasTex, fitText } from '../render/textures.js';
import { makeRng } from '../core/util.js';

const tintable = (color, rough = 0.9) => { const m = new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: 0, envMapIntensity: 0.5 }); m.userData.tintable = true; return m; };
const WHITE = plastic(0xf2efe6, 0.45), PANEL = plastic(0xd9dce2, 0.5, 0.2), RUST = paint(0xc1440e, { rough: 0.5, clear: 0.3 });
const GLASS = new THREE.MeshStandardMaterial({ color: 0xbfe6ff, roughness: 0.08, metalness: 0.2, transparent: true, opacity: 0.32, depthWrite: false, side: THREE.DoubleSide, envMapIntensity: 1.6 });
const SOLAR = new THREE.MeshStandardMaterial({ color: 0x1d2f63, roughness: 0.18, metalness: 0.75, envMapIntensity: 1.5 });
const LEAF = plastic(0x5cbf4a, 0.8), LEAF2 = plastic(0x8fd65a, 0.8), SOIL = plastic(0x5a3424, 0.95);

/** A box stretched between two points. */
function strut(b, mat, a, c, w = 0.3, d = w) {
  const dx = c[0] - a[0], dy = c[1] - a[1], dz = c[2] - a[2], len = Math.hypot(dx, dy, dz);
  const g = new THREE.BoxGeometry(w, len, d);
  g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(dx / len, dy / len, dz / len)));
  g.translate((a[0] + c[0]) / 2, (a[1] + c[1]) / 2, (a[2] + c[2]) / 2);
  b.add(mat, g);
}
/** A lumpy icosphere for rocks (same idea as props.js rock). */
function blob(r, seed = 1, lump = 0.4, detail = 2) {
  const g = new THREE.IcosahedronGeometry(r, detail), p = g.attributes.position, rng = makeRng(seed);
  const ph = [rng() * 6, rng() * 6, rng() * 6, rng() * 6];
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const n = Math.sin(x * 2.3 / r + ph[0]) * Math.cos(y * 2.1 / r + ph[1]) + Math.sin(z * 2.7 / r + ph[2]) * 0.6 + Math.sin((x + z) * 5.1 / r + ph[3]) * 0.25;
    const k = 1 + n * lump * 0.5;
    p.setXYZ(i, x * k, y * k, z * k);
  }
  g.computeVertexNormals();
  return g;
}

/* ---------- habitats ---------- */
/** Glass habitat dome of radius r: white ribs, a lit interior, an airlock porch facing +Z. */
export function habitatDome(r = 9, { lit = 0xffd9a0, seed = 1 } = {}) {
  const b = new ModelBuilder(), rng = makeRng(seed);
  b.add('glass', new THREE.SphereGeometry(r, 28, 12, 0, Math.PI * 2, 0, Math.PI / 2));
  // ribs: meridians and two rings
  const ribs = Math.max(6, Math.round(r * 0.9));
  for (let k = 0; k < ribs; k++) b.add('frame', torus(r, 0.16 + r * 0.01, 5, 20, Math.PI / 2), { r: [0, (k / ribs) * Math.PI * 2, Math.PI / 2] });
  for (const f of [0.38, 0.72]) b.add('frame', torus(r * Math.cos(Math.asin(f)), 0.16 + r * 0.01, 5, 36), { p: [0, r * f, 0], r: [Math.PI / 2, 0, 0] });
  b.add('frame', sphere(r * 0.12, 12, 8), { p: [0, r, 0], s: [1, 0.5, 1] });
  // base ring and floor
  b.add('base', cyl(r * 1.04, r * 1.08, 0.9, 32), { p: [0, 0.45, 0] });
  b.add('floor', cyl(r * 0.98, r * 0.98, 0.1, 28), { p: [0, 0.92, 0] });
  // lit interior: a tower of floors and some garden
  b.add('lit', cyl(r * 0.28, r * 0.32, r * 0.75, 12), { p: [0, 0.9 + r * 0.375, 0] });
  b.add('frame', cyl(r * 0.34, r * 0.34, 0.18, 12), { p: [0, 0.9 + r * 0.42, 0] });
  for (let k = 0; k < 6; k++) { const a = rng() * Math.PI * 2, d = r * (0.45 + rng() * 0.35); b.add(k % 2 ? 'leaf' : 'leaf2', sphere(0.6 + rng() * r * 0.06, 8, 6), { p: [Math.cos(a) * d, 1.4, Math.sin(a) * d], s: [1, 0.8, 1] }); }
  for (let k = 0; k < 4; k++) { const a = (k / 4) * Math.PI * 2 + 0.4, d = r * 0.6; b.add('lamp', sphere(0.35, 8, 6), { p: [Math.cos(a) * d, 2.2, Math.sin(a) * d] }); }
  // airlock porch
  b.add('white', cyl(1.8, 1.8, 3.6, 16), { p: [0, 2.0, r + 0.6], r: [Math.PI / 2, 0, 0] });
  b.add('rust', torus(1.85, 0.2, 6, 18), { p: [0, 2.0, r + 2.4] });
  b.add('door', box(1.6, 2.2, 0.2, 0.1, 1), { p: [0, 1.9, r + 2.5] });
  return b.build({ glass: GLASS, frame: WHITE, base: PANEL, floor: plastic(0xcfc6b8, 0.8), lit: glow(lit, 1.3), leaf: LEAF, leaf2: LEAF2, lamp: glow(0xfff2d0, 2.6), white: WHITE, rust: RUST, door: glow(0x9fe0ff, 1.6) });
}

/** A glass transit tube of length len along +Z (from z=0 to z=len), on short legs. */
export function transitTube(len = 20, { r = 1.9, h = 2.6 } = {}) {
  const b = new ModelBuilder();
  b.add('glass', cyl(r, r, len, 18, true), { p: [0, h, len / 2], r: [Math.PI / 2, 0, 0] });
  const n = Math.max(2, Math.round(len / 4));
  for (let k = 0; k <= n; k++) {
    const z = (k / n) * len;
    b.add('frame', torus(r + 0.05, 0.14, 5, 20), { p: [0, h, z] });
    if (k % 2 === 0) b.add('frame', box(0.5, h - 0.2, 0.5, 0.1, 1), { p: [0, (h - 0.2) / 2, z] });
  }
  b.add('lit', box(0.5, 0.12, len, 0.05, 1), { p: [0, h - r + 0.25, len / 2] });
  return b.build({ glass: GLASS, frame: WHITE, lit: glow(0xbfe6ff, 1.8) }, { cast: false });
}

/** Greenhouse: a half-cylinder of glass over rows of green crops, along +Z. */
export function greenhouse({ len = 22, r = 4.2 } = {}) {
  const b = new ModelBuilder();
  b.add('glass', new THREE.CylinderGeometry(r, r, len, 20, 1, true, -Math.PI / 2, Math.PI), { p: [0, 0.5, 0], r: [Math.PI / 2, 0, 0] });
  for (let k = 0; k <= Math.round(len / 3); k++) b.add('frame', torus(r + 0.04, 0.12, 5, 14, Math.PI), { p: [0, 0.5, -len / 2 + k * (len / Math.round(len / 3))] });
  b.add('base', box(r * 2 + 0.6, 0.6, len + 0.6, 0.15, 2), { p: [0, 0.3, 0] });
  for (const x of [-2.2, 0, 2.2]) {
    b.add('soil', box(1.2, 0.35, len - 1.6, 0.1, 1), { p: [x, 0.75, 0] });
    for (let z = -len / 2 + 1.4; z < len / 2 - 1; z += 1.3) b.add(x === 0 ? 'leaf2' : 'leaf', sphere(0.45, 7, 5), { p: [x, 1.15, z], s: [1, 0.8, 1] });
  }
  for (const s of [-1, 1]) b.add('frame', new THREE.CircleGeometry(r, 16, 0, Math.PI), { p: [0, 0.5, s * len / 2] });
  b.add('lamp', box(0.3, 0.12, len - 1, 0.04, 1), { p: [0, 0.5 + r - 0.35, 0] });
  return b.build({ glass: GLASS, frame: WHITE, base: PANEL, soil: SOIL, leaf: LEAF, leaf2: LEAF2, lamp: glow(0xff9adf, 2.2) });
}

/** Habitat module: a white pressure cylinder lying on four legs, with a rust band and windows. */
export function habModule({ len = 9, r = 2.2 } = {}) {
  const b = new ModelBuilder(), y = r + 1.4;
  b.add('white', cyl(r, r, len, 20), { p: [0, y, 0], r: [Math.PI / 2, 0, 0] });
  for (const s of [-1, 1]) b.add('white', sphere(r, 20, 10, 0), { p: [0, y, s * len / 2], s: [1, 1, 0.45] });
  b.add('rust', cyl(r * 1.02, r * 1.02, 0.9, 20, true), { p: [0, y, len * 0.18], r: [Math.PI / 2, 0, 0] });
  for (let k = 0; k < 4; k++) b.add('win', box(0.1, 0.7, 1.1, 0.05, 1), { p: [r * 0.98, y + 0.4, -len * 0.3 + k * 1.6] });
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) { strut(b, 'leg', [sx * r * 0.6, y - r * 0.6, sz * len * 0.32], [sx * (r + 0.6), 0, sz * len * 0.38], 0.28); b.add('leg', cyl(0.5, 0.6, 0.2, 10), { p: [sx * (r + 0.6), 0.1, sz * len * 0.38] }); }
  b.add('solar', box(r * 3.2, 0.12, len * 0.6, 0.04, 1), { p: [0, y + r + 0.5, 0] });
  b.add('leg', box(0.3, 0.6, 0.3, 0.05, 1), { p: [0, y + r + 0.15, 0] });
  return b.build({ white: WHITE, rust: RUST, win: glow(0xffd9a0, 1.6), leg: MAT.steel, solar: SOLAR });
}

/** Landed cargo lander: a squat capsule on four splayed legs. */
export function lander({ h = 9 } = {}) {
  const b = new ModelBuilder(), s = h / 9;
  b.add('white', lathe([[0, 0], [3.2 * s, 0], [3.4 * s, 0.6 * s], [2.6 * s, 4.8 * s], [1.4 * s, 6.2 * s], [0.5 * s, 6.6 * s], [0, 6.7 * s]], 18), { p: [0, 2.4 * s, 0] });
  b.add('rust', cyl(3.25 * s, 3.25 * s, 0.6 * s, 18, true), { p: [0, 2.9 * s, 0] });
  b.add('dark', lathe([[1.2 * s, 0], [1.8 * s, -1.2 * s], [0.9 * s, -1.2 * s]], 14), { p: [0, 2.4 * s, 0] });
  for (let k = 0; k < 4; k++) {
    const a = k * Math.PI / 2 + Math.PI / 4, ca = Math.cos(a), sa = Math.sin(a);
    strut(b, 'steel', [ca * 2.6 * s, 3.2 * s, sa * 2.6 * s], [ca * 5 * s, 0.3, sa * 5 * s], 0.32 * s);
    strut(b, 'steel', [ca * 3 * s, 2.4 * s, sa * 3 * s], [ca * 4.4 * s, 0.9 * s, sa * 4.4 * s], 0.24 * s);
    b.add('dark', cyl(0.9 * s, 1.0 * s, 0.3, 12), { p: [ca * 5 * s, 0.15, sa * 5 * s] });
  }
  b.add('win', box(1.4 * s, 0.9 * s, 0.3, 0.1, 1), { p: [0, 6.3 * s, 2.2 * s], r: [-0.45, 0, 0] });
  b.add('lamp', sphere(0.3 * s, 8, 6), { p: [0, 9.2 * s, 0] });
  // cargo crates stacked by the lander
  for (const [x, z, y] of [[6.5, 1, 0], [7.8, -1.2, 0], [7, 0, 1.6]]) b.add('crate', box(1.6 * s, 1.6 * s, 1.6 * s, 0.12, 2), { p: [x * s, y * s + 0.8 * s, z * s] });
  return b.build({ white: WHITE, rust: RUST, dark: MAT.dark, steel: MAT.steel, win: glow(0x9fe0ff, 1.4), lamp: glow(0xff3030, 3), crate: plastic(0xd9a066, 0.8) });
}

/** Antenna mast with a dish and a red light. userData.light is the light's own material (blink it). */
export function antennaMast({ h = 18 } = {}) {
  const b = new ModelBuilder();
  for (const [x, z] of [[1, 1], [-1, 1], [1, -1], [-1, -1]]) strut(b, 'mast', [x * 1.4, 0, z * 1.4], [x * 0.35, h, z * 0.35], 0.18);
  for (let k = 1; k < 6; k++) { const y = (k / 6) * h, w = 2.8 - (k / 6) * 2.1; b.add('mast', box(w, 0.14, w, 0.03, 1), { p: [0, y, 0] }); }
  b.add('dish', lathe([[0, 0], [1.2, 0.15], [2.4, 0.55], [3.2, 1.1], [3.3, 1.2], [0, 0.3]], 20), { p: [0, h * 0.72, 1.4], r: [-1.1, 0, 0] });
  b.add('mast', cyl(0.08, 0.08, 2.4, 6), { p: [0, h * 0.72 + 0.5, 2.6], r: [-1.1, 0, 0] });
  b.add('mast', cyl(0.12, 0.2, 4, 6), { p: [0, h + 2, 0] });
  b.add('base', box(4, 0.6, 4, 0.15, 2), { p: [0, 0.3, 0] });
  const light = new THREE.MeshStandardMaterial({ color: 0x220808, emissive: 0xff2a1a, emissiveIntensity: 3, roughness: 0.4 });
  b.add('light', sphere(0.42, 10, 8), { p: [0, h + 4.2, 0] });
  const g = b.build({ mast: plastic(0xe8e4dc, 0.5, 0.3), dish: WHITE, base: PANEL, light });
  g.userData.light = light;
  return g;
}

/** Solar panel array on legs, tilted toward the sun (faces +Z, tilted back). */
export function solarPanel({ w = 6, d = 3.2, tilt = 0.5 } = {}) {
  const b = new ModelBuilder(), y = 1.9, B = (x, yy, z) => new THREE.BoxGeometry(x, yy, z);
  b.add('cell', B(w, 0.12, d), { p: [0, y, 0], r: [tilt, 0, 0] });
  for (let k = 1; k < 4; k++) b.add('frame', B(0.06, 0.15, d + 0.05), { p: [-w / 2 + (k / 4) * w, y + 0.02, 0], r: [tilt, 0, 0] });
  b.add('frame', B(w + 0.1, 0.16, 0.12), { p: [0, y + Math.sin(tilt) * d / 2, -Math.cos(tilt) * d / 2], r: [tilt, 0, 0] });
  for (const sx of [-1, 1]) { b.add('leg', cyl(0.09, 0.1, y + 0.6, 5), { p: [sx * w * 0.36, (y + 0.6) / 2 - 0.3, -0.6] }); b.add('leg', cyl(0.09, 0.1, y - 0.5, 5), { p: [sx * w * 0.36, (y - 0.5) / 2, 0.7] }); }
  return b.build({ cell: SOLAR, frame: plastic(0xe8e4dc, 0.4, 0.4), leg: MAT.steel }, { cast: false });
}

/** Colony flag on a pole: a plain two-colour banner. */
export function colonyFlag({ h = 8, a = 0xc1440e, c = 0xf2efe6 } = {}) {
  const b = new ModelBuilder();
  b.add('pole', cyl(0.1, 0.14, h, 8), { p: [0, h / 2, 0] });
  b.add('pole', sphere(0.2, 8, 6), { p: [0, h + 0.1, 0] });
  b.add('pole', cyl(0.4, 0.5, 0.3, 10), { p: [0, 0.15, 0] });
  // gently waved banner from two strips
  const wave = (y0, y1) => { const pos = [], idx = []; const n = 10; for (let i = 0; i <= n; i++) { const t = i / n, x = 0.15 + t * 3.4, z = Math.sin(t * 5) * 0.22 * t; pos.push(x, y0, z, x, y1, z); if (i) { const q = (i - 1) * 2; idx.push(q, q + 2, q + 1, q + 1, q + 2, q + 3); } } const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals(); return g; };
  b.add('a', wave(h - 1.1, h - 0.15)); b.add('c', wave(h - 2.05, h - 1.1));
  const side = m => { const k = m.clone(); k.side = THREE.DoubleSide; return k; };
  return b.build({ pole: MAT.steel, a: side(paint(a, { rough: 0.6, clear: 0 })), c: side(paint(c, { rough: 0.6, clear: 0 })) }, { cast: false });
}

/** The big sign on a frame: text drawn into a canvas texture (made when called). */
export function hiringSign(text = 'MARS: NOW HIRING', { w = 30, h = 7, legs = 8 } = {}) {
  const grp = new THREE.Group(), b = new ModelBuilder();
  for (const sx of [-1, -0.33, 0.33, 1]) strut(b, 'frame', [sx * w * 0.45, 0, -0.4], [sx * w * 0.45, legs + h, -0.4], 0.5);
  for (const sx of [-1, 1]) for (const k of [0, 1, 2]) strut(b, 'frame', [sx * w * 0.45, k * legs / 3, -0.4], [sx * w * 0.15, (k + 1) * legs / 3, -0.4], 0.22);
  b.add('frame', box(w + 1, h + 1, 0.5, 0.15, 2), { p: [0, legs + h / 2, -0.3] });
  for (let i = 0; i < 6; i++) b.add('lamp', box(0.7, 0.2, 0.6, 0.05, 1), { p: [(i - 2.5) * w * 0.17, legs + h + 0.6, 0.8] });
  grp.add(b.build({ frame: plastic(0x2a2026, 0.55, 0.3), lamp: glow(0xfff0c8, 1.8) }));
  const tex = canvasTex(1024, 240, (g, cw, ch) => {
    g.fillStyle = '#f2efe6'; g.fillRect(0, 0, cw, ch);
    g.fillStyle = '#c1440e'; g.fillRect(0, 0, cw, 22); g.fillRect(0, ch - 22, cw, 22);
    fitText(g, text, cw / 2, ch / 2 + 8, cw - 60, ch - 60, 150, '"Luckiest Guy", "Arial Black", sans-serif', { fill: '#1f1418' });
  }, { repeat: false, aniso: 8 });
  const panel = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map: tex, emissiveMap: tex, emissive: 0xffffff, emissiveIntensity: 0.2, roughness: 0.55 }));
  panel.position.set(0, legs + h / 2, 0.0); grp.add(panel);
  return grp;
}

/** Street lamp: a white post with a glowing head, for Main Street and the colony. */
export function lampPost({ h = 7 } = {}) {
  const b = new ModelBuilder();
  b.add('post', cyl(0.12, 0.18, h, 8), { p: [0, h / 2, 0] });
  b.add('post', cyl(0.45, 0.55, 0.4, 10), { p: [0, 0.2, 0] });
  b.add('post', box(0.3, 0.2, 1.8, 0.08, 1), { p: [0, h, 0.7] });
  b.add('lamp', box(0.6, 0.22, 0.9, 0.1, 2), { p: [0, h - 0.15, 1.4] });
  b.add('rust', cyl(0.2, 0.2, 0.5, 8), { p: [0, h * 0.4, 0] });
  return b.build({ post: WHITE, lamp: glow(0xfff0d8, 3), rust: RUST });
}

/* ---------- rocks ---------- */
/** A tall rock spire: a tapered, layered column with a cap rock (tintable). */
export function rockSpire(seed = 1, { h = 26, r = 5 } = {}) {
  const b = new ModelBuilder(), rng = makeRng(seed);
  const g = new THREE.CylinderGeometry(r * 0.38, r, h, 11, 10), p = g.attributes.position;
  const ph = [rng() * 6, rng() * 6, rng() * 6];
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i), a = Math.atan2(z, x), t = (y + h / 2) / h;
    const k = 1 + Math.sin(a * 3 + ph[0] + t * 4) * 0.12 + Math.sin(t * 19 + ph[1]) * 0.07 + Math.sin(a * 5 + ph[2]) * 0.06;
    p.setXYZ(i, x * k + Math.sin(t * 3 + ph[2]) * r * 0.15, y, z * k);
  }
  g.computeVertexNormals();
  b.add('rock', g, { p: [0, h / 2, 0] });
  b.add('cap', blob(r * 0.55, seed * 3, 0.4, 1), { p: [Math.sin(3 + ph[2]) * r * 0.15, h + r * 0.15, 0], s: [1.3, 0.55, 1.2] });
  b.add('rock', blob(r * 1.3, seed * 5, 0.5, 1), { p: [0, r * 0.15, 0], s: [1, 0.4, 1.1] });
  return b.build({ rock: tintable(0xa64a26, 0.95), cap: tintable(0x7a3b22, 0.95) });
}

/** A flat-topped mesa or butte with layered sides (tintable). */
export function mesa(seed = 1, { r = 20, h = 22 } = {}) {
  const b = new ModelBuilder(), rng = makeRng(seed);
  const layers = 4;
  for (let k = 0; k < layers; k++) {
    const t = k / layers, rad = r * (1 - t * 0.22) * (0.95 + rng() * 0.1), th = h / layers;
    const g = blob(1, seed * 7 + k, 0.35, 2); g.scale(rad, th * 0.62, rad * (0.85 + rng() * 0.3));
    b.add(k % 2 ? 'b' : 'a', g, { p: [(rng() - 0.5) * r * 0.08, th * (k + 0.5), (rng() - 0.5) * r * 0.08], r: [0, rng() * 6, 0] });
  }
  b.add('top', cyl(r * 0.7, r * 0.76, 0.6, 16), { p: [0, h * 0.96, 0] });
  return b.build({ a: tintable(0xa64a26, 0.95), b: tintable(0x8e3d20, 0.95), top: tintable(0xd2713a, 0.95) });
}

/** A rust boulder (tintable). */
export function boulder(seed = 1, { r = 1.5 } = {}) {
  const b = new ModelBuilder();
  const g = blob(r, seed, 0.55, 1); g.scale(1, 0.7, 1.15);
  b.add('rock', g, { p: [0, r * 0.35, 0] });
  return b.build({ rock: tintable(0x9a4424, 0.95) });
}

/* ---------- sky ---------- */
/** The planet Earth, small and blue, drawn without fog (place it far away). */
export function earth(r = 22) {
  const tex = canvasTex(512, 256, (g, w, h) => {
    const rng = makeRng(7);
    g.fillStyle = '#2f7fe0'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#4fae5a';
    for (let k = 0; k < 9; k++) { const x = rng() * w, y = h * (0.2 + rng() * 0.6); g.beginPath(); g.ellipse(x, y, 20 + rng() * 50, 14 + rng() * 30, rng() * 3, 0, Math.PI * 2); g.fill(); }
    g.fillStyle = 'rgba(255,255,255,0.85)';
    for (let k = 0; k < 18; k++) { const x = rng() * w, y = rng() * h; g.beginPath(); g.ellipse(x, y, 30 + rng() * 60, 4 + rng() * 6, rng() * 0.6 - 0.3, 0, Math.PI * 2); g.fill(); }
    g.fillRect(0, 0, w, 14); g.fillRect(0, h - 14, w, 14);
  }, { aniso: 4 });
  const grp = new THREE.Group();
  const ball = new THREE.Mesh(sphere(r, 32, 20), new THREE.MeshBasicMaterial({ map: tex, fog: false }));
  const halo = new THREE.Mesh(sphere(r * 1.12, 24, 16), new THREE.MeshBasicMaterial({ color: 0x9fd0ff, transparent: true, opacity: 0.22, fog: false, depthWrite: false, side: THREE.BackSide }));
  grp.add(ball, halo);
  return grp;
}

/* ---------- obstacle models ---------- */
/** Six-wheeled rover with a camera mast and a solar deck. About 4.4 m long, facing +Z. */
export function rover() {
  const b = new ModelBuilder();
  b.add('body', box(2.4, 1.1, 3.6, 0.35, 3), { p: [0, 1.45, 0] });
  b.add('solar', box(3.0, 0.14, 3.8, 0.05, 1), { p: [0, 2.15, -0.15] });
  b.add('white', box(3.1, 0.12, 3.9, 0.05, 1), { p: [0, 2.06, -0.15] });
  for (const sx of [-1, 1]) for (const z of [-1.5, 0, 1.5]) {
    b.add('tyre', cyl(0.62, 0.62, 0.55, 16), { p: [sx * 1.55, 0.62, z], r: [0, 0, Math.PI / 2] });
    b.add('hub', cyl(0.28, 0.28, 0.6, 10), { p: [sx * 1.6, 0.62, z], r: [0, 0, Math.PI / 2] });
    strut(b, 'steel', [sx * 1.0, 1.2, z * 0.7], [sx * 1.5, 0.75, z], 0.18);
  }
  strut(b, 'steel', [0.6, 2.1, 1.2], [0.6, 3.8, 1.3], 0.18);
  b.add('white', box(0.9, 0.6, 0.7, 0.15, 2), { p: [0.6, 4.05, 1.35] });
  for (const sx of [-1, 1]) b.add('eye', sphere(0.15, 8, 6), { p: [0.6 + sx * 0.22, 4.08, 1.72] });
  b.add('rust', box(2.45, 0.22, 3.65, 0.06, 1), { p: [0, 1.0, 0] });
  b.add('steel', cyl(0.05, 0.05, 1.6, 5), { p: [-0.8, 3.0, -1.4] });
  b.add('lamp', sphere(0.14, 8, 6), { p: [-0.8, 3.85, -1.4] });
  return b.build({ body: WHITE, white: WHITE, solar: SOLAR, tyre: MAT.rubber, hub: plastic(0xc8ccd4, 0.4, 0.6), steel: MAT.steel, eye: glow(0x46d6ff, 3), rust: RUST, lamp: glow(0xffb020, 4) });
}

const DEVIL_MAT = new THREE.MeshStandardMaterial({ color: 0xd9824a, roughness: 1, transparent: true, opacity: 0.3, depthWrite: false, side: THREE.DoubleSide });
const DEVIL_MAT2 = new THREE.MeshStandardMaterial({ color: 0xb5532a, roughness: 1, transparent: true, opacity: 0.48, depthWrite: false, side: THREE.DoubleSide });
/** Rust dust devil: a tall tapered translucent swirl that spins itself. */
export function dustdevil() {
  const grp = new THREE.Group(), b = new ModelBuilder(), H = 16;
  b.add('veil', lathe([[0.7, 0], [1.0, 1.5], [1.3, 4], [1.9, 8], [3.0, 12], [4.8, H]], 18));
  b.add('veil', lathe([[0.4, 0], [0.7, 2], [1.0, 6], [1.6, 10], [2.6, 14]], 14), { r: [0, 0.6, 0] });
  const spiral = (r0, r1, turns, ph) => { const pts = []; for (let i = 0; i <= 40; i++) { const t = i / 40, a = t * turns * Math.PI * 2 + ph, r = r0 + (r1 - r0) * t * t; pts.push([Math.cos(a) * r, t * H * 0.95, Math.sin(a) * r]); } return pts; };
  b.add('band', tube(spiral(0.9, 4.4, 3.4, 0), 0.24, 120, 5));
  b.add('band', tube(spiral(0.7, 3.6, 2.8, 2.4), 0.2, 100, 5));
  const swirl = b.build({ veil: DEVIL_MAT, band: DEVIL_MAT2 }, { cast: false });
  swirl.children.forEach(m => { m.renderOrder = 5; });
  const base = new ModelBuilder();
  base.add('d', cyl(2.4, 3.0, 0.6, 14, true), { p: [0, 0.3, 0] });
  const ring = base.build({ d: DEVIL_MAT2 }, { cast: false });
  grp.add(swirl, ring);
  swirl.children[0].onBeforeRender = () => { swirl.rotation.y = performance.now() * -0.006; };
  return grp;
}
