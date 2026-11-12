/* Props for Mars Colony: habitat domes, transit tubes, greenhouses, solar
   panels, rock spires and mesas, antenna masts, a cargo lander, habitat
   modules, flags, the hiring sign, the planet Earth, rovers, and rust dust
   devils. Each builder returns a THREE.Group on y = 0, facing +Z, made of a few
   merged meshes. Nothing here touches the DOM at import time. */
import * as THREE from 'three';
import { ModelBuilder, box, sphere, cyl, cone, torus, tube, lathe, loft, plastic, glow, paint, MAT } from './build.js';
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

/* ---------- the gags ---------- */
const STEEL = plastic(0xc9ced6, 0.22, 0.95), STEEL_DARK = plastic(0x8d96a6, 0.3, 0.9), BRONZE = plastic(0x8a6a44, 0.45, 0.7);

/** A roof placard, lettered both sides (canvas made when called). */
function placard(text, bg, fg, w, h, y) {
  const tex = canvasTex(512, 176, (g, cw, ch) => {
    g.fillStyle = bg; g.fillRect(0, 0, cw, ch); g.strokeStyle = fg; g.lineWidth = 10; g.strokeRect(8, 8, cw - 16, ch - 16);
    let s = 110; g.font = `${s}px "Luckiest Guy", "Arial Black", sans-serif`; while (g.measureText(text).width > cw - 50 && s > 30) { s -= 4; g.font = `${s}px "Luckiest Guy", "Arial Black", sans-serif`; }
    g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = fg; g.fillText(text, cw / 2, ch / 2 + 6);
  }, { repeat: false, aniso: 4 });
  const mat = new THREE.MeshStandardMaterial({ map: tex, emissiveMap: tex, emissive: 0xffffff, emissiveIntensity: 0.5, roughness: 0.6 });
  const grp = new THREE.Group();
  for (const r of [Math.PI / 2, -Math.PI / 2]) { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat); m.position.set(r > 0 ? 0.07 : -0.07, y, 0); m.rotation.y = r; grp.add(m); }
  return grp;
}

/** The rover, now a robotaxi: same body, a lit roof sign. */
export function robotaxi(o) {
  const g = rover(o);
  const b = new ModelBuilder(); b.add('p', cyl(0.06, 0.06, 1.0, 5), { p: [0, 2.7, -0.2] }); g.add(b.build({ p: MAT.steel }));
  g.add(placard('ROBOTAXI', '#1a1d29', '#46d6ff', 3.0, 1.0, 3.6));
  return g;
}

/** Cargo crate (same size as the stock crate), stencilled as premium oxygen. */
export function oxyCrate() {
  const b = new ModelBuilder();
  b.add('w', box(1.9, 1.9, 1.9, 0.12, 2), { p: [0, 0.95, 0] });
  for (const s of [1, -1]) b.add('t', box(2.0, 0.22, 2.0, 0.05, 1), { p: [0, 0.95 + s * 0.78, 0] });
  const g = b.build({ w: plastic(0xf2efe6, 0.6), t: RUST });
  const tex = canvasTex(256, 160, (c, w, h) => { c.fillStyle = '#f2efe6'; c.fillRect(0, 0, w, h); c.fillStyle = '#1f6bff'; c.font = '86px "Arial Black", sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('O2', w / 2, h * 0.38); c.fillStyle = '#c1440e'; c.font = '32px "Arial Black", sans-serif'; c.fillText('PREMIUM', w / 2, h * 0.8); }, { repeat: false, aniso: 4 });
  const mat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.6 });
  for (let k = 0; k < 4; k++) { const m = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 0.94), mat); const a = k * Math.PI / 2; m.position.set(Math.sin(a) * 0.96, 0.95, Math.cos(a) * 0.96); m.rotation.y = a; g.add(m); }
  return g;
}

/** A stainless steel megarocket, about h metres tall (booster and ship), on y = 0.
    userData.chunks: debris pieces as [geometry, material] for the explosion. */
export function megaRocket({ h = 72 } = {}) {
  const b = new ModelBuilder(), s = h / 72, R = 4.5 * s;
  // booster
  b.add('steel', cyl(R, R, 38 * s, 28), { p: [0, 19 * s, 0] });
  for (let k = 1; k < 8; k++) b.add('seam', cyl(R * 1.004, R * 1.004, 0.18 * s, 28, true), { p: [0, k * 4.8 * s, 0] });
  b.add('dark', cyl(R * 0.92, R * 0.8, 1.6 * s, 20), { p: [0, -0.8 * s, 0] });
  for (let k = 0; k < 4; k++) { const a = k * Math.PI / 2 + Math.PI / 4; b.add('dark', box(2.2 * s, 2.6 * s, 0.3 * s, 0.05, 1), { p: [Math.cos(a) * (R + 0.4 * s), 36 * s, Math.sin(a) * (R + 0.4 * s)], r: [0, -a + Math.PI / 2, 0] }); }
  // interstage and ship
  b.add('dark', cyl(R, R, 1.2 * s, 28), { p: [0, 38.6 * s, 0] });
  b.add('steel', lathe([[R, 0], [R, 22 * s], [R * 0.96, 25 * s], [R * 0.78, 28.5 * s], [R * 0.46, 31.5 * s], [R * 0.12, 33.2 * s], [0, 33.5 * s]], 28), { p: [0, 39.2 * s, 0] });
  for (const sx of [-1, 1]) { b.add('flap', box(0.3 * s, 5.5 * s, 3.2 * s, 0.1, 1), { p: [sx * (R + 0.2 * s), 42.5 * s, 0] }); b.add('flap', box(0.3 * s, 3.6 * s, 2.0 * s, 0.1, 1), { p: [sx * (R * 0.7 + 0.2 * s), 66 * s, 0], r: [0, 0, sx * 0.35] }); }
  b.add('tiles', lathe2([[R * 1.006, 0], [R * 1.006, 22 * s], [R * 0.97, 25 * s], [R * 0.8, 28.5 * s], [R * 0.48, 31.5 * s], [R * 0.14, 33.1 * s]], 28, 0, Math.PI), { p: [0, 39.2 * s, 0], r: [0, Math.PI / 2, 0] });
  const g = b.build({ steel: STEEL, seam: STEEL_DARK, dark: MAT.dark, flap: STEEL_DARK, tiles: plastic(0x1b1c20, 0.7) });
  const chunks = [
    [new THREE.CylinderGeometry(R, R, 6 * s, 14, 1, true, 0, 2.2), STEEL], [new THREE.CylinderGeometry(R, R, 4 * s, 14, 1, true, 0, 1.6), STEEL],
    [new THREE.BoxGeometry(0.3 * s, 5 * s, 3 * s), STEEL_DARK], [new THREE.ConeGeometry(R * 0.6, 5 * s, 14), STEEL], [new THREE.CylinderGeometry(R, R, 3 * s, 14, 1, true, 0, 2.8), STEEL],
  ];
  g.userData.chunks = chunks; g.userData.h = 72.7 * s; g.userData.R = R;
  return g;
}
/** The lathe helper in build.js turns a full circle; the heat-tile half-shell needs phi limits. */
function lathe2(profile, seg, phiStart, phiLen) { return new THREE.LatheGeometry(profile.map(p => new THREE.Vector2(p[0], p[1])), seg, phiStart, phiLen); }

/** The launch tower: a square lattice with two arms ("chopsticks") reaching toward +Z. About h tall. */
export function launchTower({ h = 92 } = {}) {
  const b = new ModelBuilder(), w = 9;
  for (const [x, z] of [[1, 1], [-1, 1], [1, -1], [-1, -1]]) b.add('steel', box(0.9, h, 0.9, 0.05, 1), { p: [x * w / 2, h / 2, z * w / 2] });
  for (let y = 4; y < h; y += 7) {
    for (const [x0, z0, x1, z1] of [[-1, 1, 1, 1], [1, 1, 1, -1], [1, -1, -1, -1], [-1, -1, -1, 1]]) {
      b.add('steel', box(Math.abs(x1 - x0) * w / 2 + 0.5 || 0.5, 0.4, Math.abs(z1 - z0) * w / 2 + 0.5 || 0.5, 0.05, 1), { p: [(x0 + x1) * w / 4, y, (z0 + z1) * w / 4] });
    }
    const d = new THREE.BoxGeometry(0.3, Math.hypot(w, 7), 0.3); d.rotateZ(Math.atan2(w, 7)); b.add('steel', d, { p: [0, y + 3.5, w / 2] }); b.add('steel', d, { p: [0, y + 3.5, -w / 2] });
  }
  for (const sx of [-1, 1]) b.add('arm', box(1.4, 2.6, 16, 0.2, 1), { p: [sx * 5.5, h * 0.72, 10], r: [0, sx * -0.18, 0] });
  b.add('arm', box(w + 2, 3, 3, 0.2, 1), { p: [0, h * 0.72, w / 2 + 1] });
  b.add('lamp', sphere(0.6, 10, 8), { p: [0, h + 1.2, 0] });
  b.add('base', box(w + 4, 2, w + 4, 0.2, 1), { p: [0, 1, 0] });
  return b.build({ steel: plastic(0x4a4f5a, 0.5, 0.6), arm: plastic(0x2a2d36, 0.5, 0.5), lamp: glow(0xff2a1a, 3.5), base: PANEL });
}

/** The founder in bronze on a plinth, crowned and caped, his right arm raised along +Z and up by `pitch`.
    About h tall including the plinth. userData.plinth = { y, z, w, h } for the lettering on its front. */
export function founderStatue({ h = 44, pitch = 0.75 } = {}) {
  const b = new ModelBuilder(), P = h * 0.16, s = (h - P) / 8.2, Y = v => P + v * s;
  b.add('stone', box(2.8 * s, P - 1.2, 2.8 * s, 0.2, 2), { p: [0, (P - 1.2) / 2, 0] });
  b.add('trim', box(3.1 * s, 1.2, 3.1 * s, 0.2, 2), { p: [0, P - 0.6, 0] });
  b.add('stone', box(3.5 * s, 1.0, 3.5 * s, 0.2, 2), { p: [0, 0.5, 0] });
  // legs, coat, torso
  for (const sx of [-1, 1]) { b.add('bronze', cyl(0.42 * s, 0.36 * s, 3.4 * s, 10), { p: [sx * 0.55 * s, Y(1.8), 0] }); b.add('bronze', box(0.8 * s, 0.4 * s, 1.4 * s, 0.15, 2), { p: [sx * 0.55 * s, Y(0.2), 0.25 * s] }); }
  b.add('bronze', loft([{ z: 0, w: 1.15 * s, h: 0.72 * s, y: 0, n: 2.6 }, { z: 2.0 * s, w: 1.25 * s, h: 0.8 * s, y: 0, n: 2.6 }, { z: 3.6 * s, w: 1.45 * s, h: 0.85 * s, y: 0, n: 2.8 }], 18, 3), { p: [0, Y(3.3), 0], r: [-Math.PI / 2, 0, 0] });
  b.add('bronze', sphere(0.62 * s, 16, 12), { p: [0, Y(7.55), 0.05 * s] });
  b.add('bronze', cyl(0.3 * s, 0.36 * s, 0.6 * s, 10), { p: [0, Y(7.0), 0] });
  // the crown
  b.add('gold', cyl(0.62 * s, 0.58 * s, 0.45 * s, 16, true), { p: [0, Y(8.2), 0] });
  for (let k = 0; k < 7; k++) { const a = (k / 7) * Math.PI * 2; b.add('gold', cone(0.14 * s, 0.5 * s, 6), { p: [Math.sin(a) * 0.6 * s, Y(8.6), Math.cos(a) * 0.6 * s] }); }
  // the cape: a curved sheet behind the shoulders
  b.add('cape', new THREE.CylinderGeometry(1.05 * s, 1.5 * s, 3.8 * s, 14, 1, true, Math.PI * 0.75, Math.PI * 0.5), { p: [0, Y(5.0), 0.1 * s] });
  // the left arm on the hip, the right arm pointing at the sky (at Earth)
  b.add('bronze', tube([[-1.35 * s, Y(6.6), 0], [-1.9 * s, Y(5.4), 0.2 * s], [-1.2 * s, Y(4.5), 0.5 * s]], 0.3 * s, 10, 8));
  const sh = [1.35 * s, Y(6.6), 0], L = 3.4 * s, ex = sh[0] + 0.15 * s, ey = sh[1] + Math.sin(pitch) * L, ez = Math.cos(pitch) * L;
  b.add('bronze', tube([sh, [sh[0] + 0.1 * s, sh[1] + Math.sin(pitch) * L * 0.5, Math.cos(pitch) * L * 0.5], [ex, ey, ez]], 0.32 * s, 10, 8));
  b.add('bronze', sphere(0.36 * s, 10, 8), { p: [ex, ey, ez] });
  const fl = 1.0 * s; b.add('bronze', cyl(0.11 * s, 0.13 * s, fl, 6), { p: [ex, ey + Math.sin(pitch) * fl * 0.5, ez + Math.cos(pitch) * fl * 0.5], r: [Math.PI / 2 - pitch, 0, 0] });
  const g = b.build({ stone: plastic(0xe8e2d6, 0.7), trim: RUST, bronze: BRONZE, gold: paint(0xe8b923, { rough: 0.25, metal: 0.9 }), cape: new THREE.MeshStandardMaterial({ color: 0xb01828, roughness: 0.7, side: THREE.DoubleSide }) });
  g.userData.plinth = { y: (P - 1.2) / 2, z: 1.4 * s + 0.06, w: 2.6 * s, h: P - 2.2 };
  return g;
}

/** An angular stainless pickup, about 5.9 m long, nose to +Z (window panel at userData.window, local). */
export function wedgeTruck() {
  const b = new ModelBuilder();
  // the body as a few flat-sided slabs: a wedge in profile
  const prof = [[-2.95, 0.55], [-2.95, 1.35], [-0.1, 1.95], [2.95, 1.2], [2.95, 0.55]];
  const shape = new THREE.Shape(); prof.forEach(([z, y], k) => k ? shape.lineTo(z, y) : shape.moveTo(z, y));
  const g0 = new THREE.ExtrudeGeometry(shape, { depth: 2.1, bevelEnabled: false }); g0.translate(0, 0, -1.05); g0.rotateY(Math.PI / 2);
  b.add('steel', g0);
  for (const sx of [-1, 1]) for (const z of [-1.9, 1.9]) { b.add('tyre', cyl(0.48, 0.48, 0.4, 14), { p: [sx * 0.95, 0.48, z], r: [0, 0, Math.PI / 2] }); b.add('dark', box(0.12, 0.3, 1.5, 0.04, 1), { p: [sx * 1.06, 1.0, z] }); }
  b.add('lamp', box(1.9, 0.08, 0.06, 0.02, 1), { p: [0, 1.22, 2.98] });
  b.add('red', box(1.9, 0.08, 0.06, 0.02, 1), { p: [0, 1.3, -2.98] });
  const g = b.build({ steel: plastic(0xb8bec8, 0.3, 0.9), tyre: MAT.rubber, dark: MAT.dark, lamp: glow(0xffffff, 3), red: glow(0xff2a2a, 2) });
  // the windscreen: from (z 2.95, y 1.2) up to (z -0.1, y 1.95), lettered by the track
  const a = [0, 1.2, 2.95], c = [0, 1.95, -0.1];
  g.userData.window = { c: [0, (a[1] + c[1]) / 2 + 0.03, (a[2] + c[2]) / 2 + 0.01], w: 1.7, h: Math.hypot(a[1] - c[1], a[2] - c[2]) * 0.62, tilt: Math.atan2(a[2] - c[2], a[1] - c[1]) };
  return g;
}

/** A company store: a pressurised shed with a tall false front facing +Z (lettered by the track). */
export function companyStore({ w = 16, d = 10 } = {}) {
  const b = new ModelBuilder();
  b.add('white', cyl(d / 2, d / 2, w, 20, false, 0, Math.PI), { p: [0, 0.4, -d / 2 - 0.4], r: [0, 0, Math.PI / 2] });
  b.add('front', box(w + 1, 9, 0.6, 0.1, 1), { p: [0, 4.5, 0] });
  b.add('rust', box(w + 1.6, 0.8, 1.0, 0.1, 1), { p: [0, 9.1, 0.1] });
  b.add('door', box(3.2, 3.6, 0.3, 0.1, 1), { p: [0, 1.8, 0.35] });
  for (const sx of [-1, 1]) b.add('win', box(3.6, 2.2, 0.2, 0.1, 1), { p: [sx * 5, 2.4, 0.35] });
  b.add('rust', box(w + 1, 0.4, 2.6, 0.08, 1), { p: [0, 4.0, 1.4] });
  return b.build({ white: WHITE, front: plastic(0xe9e4d8, 0.7), rust: RUST, door: glow(0x9fe0ff, 1.2), win: glow(0xffd9a0, 1.4) });
}

/** A tall flag pole with a rigid banner panel (the track letters it). Banner centre at userData.flag (local). */
export function bigFlagPole({ h = 20, fw = 13, fh = 6.5 } = {}) {
  const b = new ModelBuilder();
  b.add('pole', cyl(0.22, 0.32, h, 10), { p: [0, h / 2, 0] });
  b.add('pole', sphere(0.45, 10, 8), { p: [0, h + 0.2, 0] });
  b.add('pole', cyl(1.2, 1.4, 0.6, 12), { p: [0, 0.3, 0] });
  const g = b.build({ pole: MAT.steel });
  g.userData.flag = { x: fw / 2 + 0.3, y: h - fh / 2 - 0.4, w: fw, h: fh };
  return g;
}
