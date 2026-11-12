/* Props for Datacenter Dash, in daylight: pale hyperscale halls with rooftop
   chillers, gas power plants with striped stacks, the pipes and pumps that
   drink the lake, boats and a dock for when it is gone, cooling towers, pines,
   lamps, pylons, dishes, transformers, and the steam-vent obstacle. Each
   builder returns a THREE.Group sitting on y = 0, facing +Z, made of a few
   merged meshes (materials are shared, so the track can bake many props into
   one mesh per material). Canvas textures are only made when a builder runs. */
import * as THREE from 'three';
import { ModelBuilder, box, sphere, cyl, cone, torus, lathe, loft, plastic, glow, MAT } from './build.js';
import { makeRng } from '../core/util.js';

const DARK = plastic(0x2c323c, 0.55, 0.3), STEEL = plastic(0x8d96a6, 0.4, 0.7), CONCRETE = plastic(0xb4b8bc, 0.9);
const _q = new THREE.Quaternion(), _e = new THREE.Euler(), _a = new THREE.Vector3(), _up = new THREE.Vector3(0, 1, 0);

/** A round beam from point a to point c (for lattices, legs, and struts). */
function strut(b, mat, a, c, r = 0.1, seg = 5) {
  _a.set(c[0] - a[0], c[1] - a[1], c[2] - a[2]);
  const len = _a.length(); _a.normalize();
  _q.setFromUnitVectors(_up, _a); _e.setFromQuaternion(_q);
  b.add(mat, cyl(r, r, len, seg, true), { p: [(a[0] + c[0]) / 2, (a[1] + c[1]) / 2, (a[2] + c[2]) / 2], r: [_e.x, _e.y, _e.z] });
}
const cube = (w, h, d) => new THREE.BoxGeometry(w, h, d);

/* ---------- the campus ---------- */
/** Hyperscale data hall: a huge pale windowless box with panel seams, a louvred
    screen round the roofline, rows of chillers on the roof, and loading docks on
    the back (-Z). Long axis along X, front face at +Z. */
export function dataHall({ L = 60, W = 24, H = 14, accent = 0x1f6bff, docks = true } = {}) {
  const b = new ModelBuilder();
  b.add('body', box(L, H, W, 0.3, 1), { p: [0, H / 2, 0] });
  b.add('plinth', cube(L + 0.6, 0.6, W + 0.6), { p: [0, 0.3, 0] });
  b.add('cap', cube(L + 0.5, 0.5, W + 0.5), { p: [0, H + 0.2, 0] });
  for (const s of [1, -1]) {
    for (let x = -L / 2 + 6; x < L / 2 - 2; x += 6) b.add('seam', cube(0.3, H - 0.8, 0.2), { p: [x, H / 2, s * (W / 2 + 0.05)] });
    b.add('band', cube(L + 0.1, 1.5, 0.3), { p: [0, H - 1.3, s * (W / 2 + 0.1)] });
    b.add('accent', cube(L + 0.1, 0.45, 0.32), { p: [0, H - 2.5, s * (W / 2 + 0.1)] });
  }
  for (const s of [1, -1]) {
    for (let z = -W / 2 + 6; z < W / 2 - 2; z += 6) b.add('seam', cube(0.2, H - 0.8, 0.3), { p: [s * (L / 2 + 0.05), H / 2, z] });
    b.add('band', cube(0.3, 1.5, W + 0.1), { p: [s * (L / 2 + 0.1), H - 1.3, 0] });
  }
  // chillers on the roof, in two rows
  const nc = Math.max(2, Math.floor(L / 7));
  for (let i = 0; i < nc; i++) for (const z of [-W * 0.22, W * 0.22]) {
    const x = -L / 2 + (L / nc) * (i + 0.5);
    b.add('unit', box(5.2, 1.8, 3.8, 0.2, 1), { p: [x, H + 1.3, z] });
    b.add('fan', cyl(1.3, 1.3, 0.2, 12), { p: [x - 1.25, H + 2.25, z] });
    b.add('fan', cyl(1.3, 1.3, 0.2, 12), { p: [x + 1.25, H + 2.25, z] });
  }
  if (docks) for (let i = 0; i < 4; i++) {
    const x = -L * 0.3 + i * 5;
    b.add('door', cube(3.4, 3.4, 0.3), { p: [x, 2.3, -W / 2 - 0.05] });
    b.add('bumper', cube(3.8, 0.6, 0.6), { p: [x, 0.9, -W / 2 - 0.3] });
    b.add('canopy', cube(22, 0.3, 3), { p: [-L * 0.3 + 7.5, 4.8, -W / 2 - 1.5] });
  }
  return b.build({
    body: plastic(0xe4e7eb, 0.75), plinth: CONCRETE, cap: plastic(0xc9ced5, 0.7), seam: plastic(0xcdd2d9, 0.7),
    band: plastic(0x6b7380, 0.6, 0.3), accent: plastic(accent, 0.5), unit: plastic(0xc4c9cf, 0.6, 0.3), fan: DARK,
    door: plastic(0x59616d, 0.6), bumper: MAT.black, canopy: plastic(0x9aa3ad, 0.6),
  });
}

/** Rooftop / yard chiller block (for scattering on aprons). */
export function chiller() {
  const b = new ModelBuilder();
  b.add('unit', box(5.2, 2.2, 2.6, 0.15, 1), { p: [0, 1.1, 0] });
  for (const x of [-1.3, 1.3]) b.add('fan', cyl(1.0, 1.0, 0.2, 12), { p: [x, 2.25, 0] });
  return b.build({ unit: plastic(0xc4c9cf, 0.6, 0.3), fan: DARK });
}

/* ---------- the data hall interior ---------- */
/** Computer-room air handler against a wall: a tall grey cabinet with a grille, facing +Z. */
export function crah() {
  const b = new ModelBuilder();
  b.add('body', box(2.6, 2.5, 1.0, 0.06, 1), { p: [0, 1.25, 0] });
  for (let i = 0; i < 7; i++) b.add('slat', cube(2.2, 0.08, 0.06), { p: [0, 0.5 + i * 0.22, 0.52] });
  b.add('panel', cube(0.5, 0.3, 0.04), { p: [0.8, 2.15, 0.52] });
  return b.build({ body: plastic(0xd4d8dd, 0.6), slat: plastic(0x6a7280, 0.5), panel: glow(0x3dd8ff, 1.4) }, { cast: false });
}

/** A bank of red fire-suppression cylinders on a steel frame, along X. */
export function fireBank(n = 8) {
  const b = new ModelBuilder();
  for (let i = 0; i < n; i++) {
    const x = (i - (n - 1) / 2) * 0.72;
    b.add('red', cyl(0.3, 0.3, 1.6, 12), { p: [x, 0.9, 0] });
    b.add('red', sphere(0.3, 12, 6), { p: [x, 1.7, 0], s: [1, 0.5, 1] });
    b.add('valve', cyl(0.1, 0.12, 0.3, 8), { p: [x, 1.95, 0] });
  }
  b.add('frame', cube(n * 0.72 + 0.3, 0.1, 0.8), { p: [0, 0.05, 0] });
  b.add('frame', cube(n * 0.72 + 0.3, 0.08, 0.08), { p: [0, 1.35, -0.38] });
  b.add('pipe', cyl(0.07, 0.07, n * 0.72, 6), { p: [0, 2.2, 0], r: [0, 0, Math.PI / 2] });
  return b.build({ red: plastic(0xd8262c, 0.4), valve: STEEL, frame: DARK, pipe: plastic(0xd8262c, 0.4) }, { cast: false });
}

/** A yellow mop bucket with a mop, and a wet-floor sign next to it. */
export function mopBucket() {
  const b = new ModelBuilder();
  b.add('yel', cyl(0.32, 0.26, 0.5, 14), { p: [0, 0.33, 0] });
  b.add('yel', cube(0.5, 0.12, 0.7), { p: [0, 0.08, 0] });
  for (const x of [-0.2, 0.2]) for (const z of [-0.28, 0.28]) b.add('dark', sphere(0.06, 6, 4), { p: [x, 0.04, z] });
  b.add('water', cyl(0.29, 0.29, 0.02, 14), { p: [0, 0.5, 0] });
  b.add('stick', cyl(0.025, 0.025, 1.5, 6), { p: [0.1, 0.95, 0.05], r: [0.12, 0, -0.12] });
  b.add('mop', cyl(0.12, 0.2, 0.3, 8), { p: [0.02, 0.3, 0.02] });
  // A-frame wet floor sign
  b.add('yel', cube(0.45, 0.65, 0.03), { p: [0.75, 0.33, 0.12], r: [-0.25, 0, 0] });
  b.add('yel', cube(0.45, 0.65, 0.03), { p: [0.75, 0.33, -0.12], r: [0.25, 0, 0] });
  b.add('dark', cube(0.3, 0.1, 0.035), { p: [0.75, 0.42, 0.127], r: [-0.25, 0, 0] });
  return b.build({ yel: plastic(0xffc928, 0.5), dark: MAT.black, water: plastic(0x6a7a5a, 0.2), stick: plastic(0xb0b6bf, 0.4, 0.6), mop: plastic(0xe9e2cf, 0.95) }, { cast: false });
}

/* ---------- power ---------- */
/** Combined-cycle gas plant, big enough to own the skyline: a turbine hall, a
    heat-recovery boiler and a red-and-white striped stack per unit, gas tanks,
    an air-cooled condenser, and pipe racks. userData.stacks: stack tops (local). */
export function gasPlant({ units = 3, stackH = 92, color = 0xd8442c, seed = 5 } = {}) {
  const rng = makeRng(seed), grp = new THREE.Group(), b = new ModelBuilder(), stacks = [];
  const Lh = units * 22 + 12;
  // turbine hall along X at the front
  b.add('wall', box(Lh, 24, 24, 0.4, 1), { p: [0, 12, 10] });
  b.add('roof', cube(Lh + 0.8, 1.2, 25), { p: [0, 24.4, 10] });
  b.add('stripe', cube(Lh + 0.2, 2.2, 24.2), { p: [0, 19, 10] });
  for (let x = -Lh / 2 + 5; x < Lh / 2; x += 5) b.add('rib', cube(0.5, 23, 0.4), { p: [x, 11.6, 22.1] });
  b.add('door', cube(9, 10, 0.4), { p: [-Lh / 2 + 10, 5, 22.2] });
  for (let i = 0; i < units; i++) {
    const x = -Lh / 2 + 17 + i * 22;
    // heat-recovery boiler: a tall box behind the hall, a duct from the hall, the stack behind it
    b.add('hrsg', box(13, 30, 26, 0.3, 1), { p: [x, 15, -16] });
    b.add('band', cube(13.2, 1.2, 26.2), { p: [x, 27, -16] });
    b.add('duct', box(8, 9, 10, 0.3, 1), { p: [x, 14, -1.5] });
    for (let k = 0; k < 4; k++) b.add('stair', cube(0.4, 30, 1.6), { p: [x + 6.8, 15, -26 + k * 6] });
    const sx = x, sz = -34, h = stackH + rng.range(-6, 6), r0 = 4.4, r1 = 3.3, bands = 9;
    for (let k = 0; k < bands; k++) {
      const y0 = (h * k) / bands, y1 = (h * (k + 1)) / bands, ra = r0 + (r1 - r0) * (y0 / h), rb = r0 + (r1 - r0) * (y1 / h);
      b.add(k >= bands - 4 ? (k % 2 ? 'red' : 'white') : 'white', cyl(rb, ra, y1 - y0, 22, true), { p: [sx, (y0 + y1) / 2, sz] });
    }
    b.add('soot', cyl(r1 + 0.05, r1 + 0.05, 2.6, 22, true), { p: [sx, h - 1.3, sz] });
    b.add('dark', cyl(r1 - 0.1, r1 - 0.1, 0.4, 22), { p: [sx, h - 0.8, sz] });
    for (const f of [0.45, 0.78]) b.add('rail', torus(r0 + (r1 - r0) * f + 0.9, 0.18, 4, 24), { p: [sx, h * f, sz], r: [Math.PI / 2, 0, 0] });
    for (const f of [0.45, 0.78]) b.add('rail', cyl(r0 + (r1 - r0) * f + 1.0, r0 + (r1 - r0) * f + 1.0, 0.3, 22), { p: [sx, h * f - 0.3, sz] });
    b.add('duct', box(7, 7, 9, 0.3, 1), { p: [sx, 20, -27] });
    for (let k = 0; k < 4; k++) { const a = k * Math.PI / 2 + 0.4; b.add('lamp', sphere(0.45, 8, 6), { p: [sx + Math.cos(a) * (r1 + 0.3), h + 0.2, sz + Math.sin(a) * (r1 + 0.3)] }); }
    stacks.push([sx, h + 0.5, sz]);
  }
  // air-cooled condenser: a big slab on legs with fan rings on top, off to one side
  const cx = Lh / 2 + 24, cz = -6;
  b.add('acc', box(30, 6, 34, 0.3, 1), { p: [cx, 17, cz] });
  for (let i = -1; i <= 1; i++) for (let k = -1; k <= 1; k++) strut(b, 'leg', [cx + i * 13, 0, cz + k * 15], [cx + i * 13, 14.5, cz + k * 15], 0.7, 8);
  for (let i = 0; i < 3; i++) for (let k = 0; k < 4; k++) b.add('fan', cyl(3.2, 3.2, 0.5, 16), { p: [cx - 10 + i * 10, 20.2, cz - 12.5 + k * 8.4] });
  // gas tanks on legs, and a long horizontal tank
  for (const [tx, tz, r] of [[-Lh / 2 - 22, 4, 9], [-Lh / 2 - 22, -22, 8]]) {
    b.add('tank', sphere(r, 22, 14), { p: [tx, r + 5, tz] });
    b.add('band', torus(r + 0.05, 0.35, 4, 26), { p: [tx, r + 5, tz], r: [Math.PI / 2, 0, 0] });
    for (let k = 0; k < 6; k++) { const a = (k / 6) * Math.PI * 2; strut(b, 'leg', [tx + Math.cos(a) * r * 0.85, 0, tz + Math.sin(a) * r * 0.85], [tx + Math.cos(a) * r * 0.8, r + 4, tz + Math.sin(a) * r * 0.8], 0.4, 6); }
  }
  b.add('tank', cyl(4, 4, 30, 18), { p: [-Lh / 2 - 6, 5.2, 30], r: [0, 0, Math.PI / 2] });
  for (const x of [-Lh / 2 - 16, -Lh / 2 + 4]) b.add('leg', cube(1, 1.4, 6), { p: [x, 0.7, 30] });
  // pipe racks: yellow gas lines from the tanks into the hall, and grey steam lines to the condenser
  for (let k = 0; k < 3; k++) {
    const y = 6 + k * 1.3;
    b.add('gas', cyl(0.55, 0.55, 26, 10), { p: [-Lh / 2 - 9, y, -6 + k * 1.4], r: [0, 0, Math.PI / 2] });
    b.add('steam', cyl(0.8, 0.8, 22, 10), { p: [Lh / 2 + 11, 12 + k * 2, -2 - k * 2], r: [0, 0, Math.PI / 2] });
  }
  for (let x = -Lh / 2 - 20; x < -Lh / 2 + 2; x += 6) b.add('leg', cube(0.5, 9, 5), { p: [x, 4.5, -4.6] });
  b.add('pad', cube(Lh + 110, 0.5, 110), { p: [10, 0.25, -6] });
  grp.add(b.build({
    wall: plastic(0xc6cbd2, 0.7), roof: plastic(0x7d8590, 0.6), stripe: plastic(color, 0.5), rib: plastic(0xaeb4bd, 0.6), door: plastic(0x5b636f, 0.6),
    hrsg: plastic(0x9aa2ad, 0.6, 0.3), band: plastic(color, 0.5), duct: plastic(0x868e99, 0.5, 0.4), stair: plastic(0xe0b024, 0.5),
    white: plastic(0xeceeee, 0.6), red: plastic(0xd2322a, 0.55), soot: plastic(0x1c1c1e, 0.9), dark: MAT.black, rail: plastic(0xe0b024, 0.5),
    lamp: glow(0xff2a2a, 4), acc: plastic(0xa9b0ba, 0.6, 0.3), leg: plastic(0x7d8590, 0.5, 0.4), fan: DARK,
    tank: plastic(0xf1f2f2, 0.5), gas: plastic(0xf0c020, 0.45), steam: plastic(0xb8bec7, 0.5, 0.4), pad: CONCRETE,
  }, { cast: false }));
  grp.userData.stacks = stacks;
  grp.userData.sign = { y: 16, z: 22.5, w: Lh - 14 };   // where a name fits on the hall front
  return grp;
}

/* ---------- the lake ---------- */
/** A pump on a fat pipe running along Z: a squat housing with a motor and a flywheel. userData.parts to pulse. */
export function pumpUnit() {
  const b = new ModelBuilder();
  b.add('body', box(6.6, 5.6, 6.0, 0.6, 2), { p: [0, 2.8 + 0.4, 0] });
  b.add('motor', cyl(1.6, 1.6, 3.4, 16), { p: [0, 7.6, 0] });
  b.add('band', cyl(1.66, 1.66, 0.4, 16), { p: [0, 6.6, 0] });
  b.add('band', cube(6.7, 0.5, 6.1), { p: [0, 5.2, 0] });
  b.add('dark', cube(7.2, 0.4, 6.6), { p: [0, 0.2, 0] });
  b.add('lamp', sphere(0.4, 10, 8), { p: [0, 9.6, 0] });
  return b.build({ body: plastic(0x2f6fc0, 0.45, 0.2), motor: plastic(0x8d96a6, 0.4, 0.6), band: plastic(0xffc928, 0.5), dark: DARK, lamp: glow(0xff7a1a, 3) });
}

/** Intake bell mouth: a flared cone at the end of a pipe, with a grate. Axis along +Z (mouth at +Z). */
export function intake(r = 2.0) {
  const b = new ModelBuilder();
  const prof = []; for (let k = 0; k <= 8; k++) { const t = k / 8; prof.push([r + (t * t) * r * 1.3, t * r * 1.6]); }
  const g = lathe(prof, 20); g.rotateX(Math.PI / 2);
  b.add('pipe', g, {});
  b.add('grate', cyl(r * 2.2, r * 2.2, 0.15, 20), { p: [0, 0, r * 1.6], r: [Math.PI / 2, 0, 0] });
  return b.build({ pipe: plastic(0x2f6fc0, 0.45, 0.2), grate: plastic(0x2c323c, 0.6, 0.4) });
}

/** A motor cruiser, about 9 m long along Z (bow at +Z), sitting on y = 0 (its waterline): a lofted hull with a
    raked bow, a teak deck, a cabin with windows, a boot stripe, and its name on both sides of the hull.
    nameMat/nameUV: a shared material holding the names, and this boat's [u0, v0, u1, v1] in it. */
export function boat({ hull = 0xffffff, stripe = 0x1f6bff, nameMat = null, nameUV = null } = {}) {
  const b = new ModelBuilder();
  b.add('hull', loft([
    { z: -4.2, w: 1.3, h: 0.8, y: 0.45, n: 5 }, { z: -3, w: 1.55, h: 0.9, y: 0.45, n: 4 }, { z: 0, w: 1.6, h: 0.95, y: 0.5, n: 3.5 },
    { z: 2.4, w: 1.25, h: 1.0, y: 0.62, n: 3 }, { z: 3.8, w: 0.6, h: 0.95, y: 0.8, n: 2.5 }, { z: 4.7, w: 0.1, h: 0.6, y: 1.1, n: 2 },
  ], 22, 4));
  b.add('deck', box(2.5, 0.14, 6.6, 0.05, 1), { p: [0, 1.38, -0.6] });
  for (const sx of [1, -1]) b.add('stripe', cube(0.08, 0.2, 5.6), { p: [sx * 1.6, 0.66, -1.2] });
  b.add('cabin', box(2.0, 1.25, 2.6, 0.25, 2), { p: [0, 2.05, -0.8] });
  b.add('roof', box(2.3, 0.14, 3.0, 0.05, 1), { p: [0, 2.74, -0.8] });
  b.add('glass', cube(1.84, 0.5, 0.06), { p: [0, 2.25, 0.52], r: [-0.3, 0, 0] });
  for (const sx of [1, -1]) b.add('glass', cube(0.05, 0.45, 2.0), { p: [sx * 1.01, 2.22, -0.8] });
  b.add('dark', cyl(0.05, 0.05, 1.3, 5), { p: [0, 3.4, -1.4] });
  b.add('dark', box(0.5, 0.7, 0.5, 0.08, 1), { p: [0, 1.0, -4.35] });
  for (const z of [0.6, 1.8, 3.0]) for (const sx of [1, -1]) b.add('rail', cyl(0.03, 0.03, 0.55, 4), { p: [sx * (z > 2 ? 0.9 : 1.15), 1.7, z] });
  b.add('ring', torus(0.32, 0.09, 6, 12), { p: [1.32, 2.1, -2.2], r: [0, Math.PI / 2, 0] });
  if (nameMat && nameUV) {
    const [u0, v0, u1, v1] = nameUV;
    for (const sx of [1, -1]) {
      const g = new THREE.PlaneGeometry(3.0, 0.58), uv = g.attributes.uv;
      uv.setXY(0, u0, v1); uv.setXY(1, u1, v1); uv.setXY(2, u0, v0); uv.setXY(3, u1, v0);
      b.add('name', g, { p: [sx * 1.62, 1.1, -1.5], r: [0, sx * Math.PI / 2, 0] });
    }
  }
  return b.build({ hull: plastic(hull, 0.35), deck: plastic(0xb98a55, 0.8), stripe: plastic(stripe, 0.4), cabin: plastic(0xf6f6f2, 0.45), roof: plastic(stripe, 0.45), glass: plastic(0x1d2c3c, 0.15, 0.4), dark: DARK, rail: STEEL, ring: plastic(0xff5a2a, 0.5), name: nameMat || DARK });
}

/** A wooden jetty `len` metres long along +Z, deck at y = 0, on long piles reaching `depth` metres down. */
export function dock(len = 30, depth = 16) {
  const b = new ModelBuilder();
  for (let z = 0; z < len; z += 1.2) b.add('plank', cube(3.2, 0.18, 1.05), { p: [0, -0.09, z + 0.6] });
  for (let z = 2; z <= len; z += 6) for (const x of [-1.5, 1.5]) b.add('pile', cyl(0.18, 0.2, depth + 1, 6), { p: [x, -depth / 2 + 0.3, z] });
  for (const x of [-1.6, 1.6]) b.add('rail', cube(0.12, 0.12, len), { p: [x, 0.9, len / 2] });
  for (let z = 0; z <= len; z += 3) for (const x of [-1.6, 1.6]) b.add('rail', cube(0.12, 0.9, 0.12), { p: [x, 0.45, z] });
  b.add('ring', torus(0.45, 0.13, 6, 14), { p: [1.75, 0.6, len - 4], r: [0, Math.PI / 2, 0] });
  return b.build({ plank: plastic(0xa47a4c, 0.9), pile: plastic(0x6a4e34, 0.9), rail: plastic(0xd9c9a8, 0.8), ring: plastic(0xff5a2a, 0.5) });
}

/** Lifeguard chair: a tall white wooden seat on splayed legs, with a red float. */
export function lifeguardChair() {
  const b = new ModelBuilder();
  for (const [x, z] of [[-0.9, -0.9], [0.9, -0.9], [-0.9, 0.9], [0.9, 0.9]]) strut(b, 'wood', [x * 1.3, 0, z * 1.3], [x * 0.7, 3.2, z * 0.7], 0.08, 6);
  b.add('wood', cube(1.6, 0.12, 1.4), { p: [0, 3.25, 0] });
  b.add('wood', cube(1.6, 1.1, 0.1), { p: [0, 3.85, -0.65] });
  for (let k = 0; k < 4; k++) b.add('wood', cube(1.4, 0.07, 0.24), { p: [0, 0.6 + k * 0.7, 1.0 - k * 0.05] });
  b.add('float', torus(0.35, 0.12, 6, 14), { p: [0.82, 2.6, 0.4], r: [0, Math.PI / 2, 0] });
  b.add('umb', cone(1.6, 0.6, 8), { p: [0, 5.3, 0] });
  b.add('wood', cyl(0.04, 0.04, 1.6, 5), { p: [0, 4.4, -0.3] });
  return b.build({ wood: plastic(0xf2efe8, 0.8), float: plastic(0xe0302a, 0.5), umb: plastic(0xffc928, 0.6) });
}

/** A protester: a body, a head, arms up, holding a picket stick (the sign is drawn by the track). */
export function protester() {
  const b = new ModelBuilder();
  b.add('body', cyl(0.26, 0.3, 1.0, 8), { p: [0, 0.75, 0] });
  b.add('body', sphere(0.27, 8, 6), { p: [0, 1.25, 0] });
  b.add('legs', cyl(0.2, 0.18, 0.5, 6), { p: [0, 0.25, 0] });
  b.add('head', sphere(0.22, 9, 7), { p: [0, 1.62, 0] });
  b.add('head', cyl(0.06, 0.06, 0.55, 5), { p: [0.18, 1.6, 0.18], r: [-0.5, 0, -0.3] });
  b.add('stick', cyl(0.03, 0.03, 2.0, 5), { p: [0.3, 1.9, 0.3] });
  return b.build({ body: tintBody(), legs: plastic(0x2c3444, 0.8), head: plastic(0xe0b38c, 0.7), stick: plastic(0xb08a5a, 0.8) });
}
function tintBody() { const m = plastic(0xffffff, 0.8).clone(); m.userData.tintable = true; return m; }

/* ---------- cooling ---------- */
/** Hyperboloid cooling tower, about 30 m tall: pale concrete with darker bands. userData.top is the rim height. */
export function coolingTower({ H = 30 } = {}) {
  const grp = new THREE.Group(), b = new ModelBuilder();
  const R0 = 12.5, Rw = 7.6, yw = H * 0.72, c = yw / Math.sqrt((R0 / Rw) ** 2 - 1), base = 3;
  const r = y => Rw * Math.sqrt(1 + ((y - yw) / c) ** 2);
  const prof = []; for (let k = 0; k <= 14; k++) { const y = base + (H - base) * (k / 14); prof.push([r(y - base * (1 - k / 14)), y]); }
  b.add('shell', lathe(prof, 36));
  for (let i = 0; i < 24; i++) {               // slanted support columns at the foot
    const a = (i / 24) * Math.PI * 2, a2 = a + 0.12;
    strut(b, 'col', [Math.cos(a) * (R0 + 0.6), 0, Math.sin(a) * (R0 + 0.6)], [Math.cos(a2) * prof[0][0], base + 0.2, Math.sin(a2) * prof[0][0]], 0.28, 6);
  }
  b.add('basin', cyl(R0 + 2.6, R0 + 2.8, 1.0, 36), { p: [0, 0.5, 0] });
  b.add('rim', torus(prof[14][0], 0.35, 6, 36), { p: [0, H, 0], r: [Math.PI / 2, 0, 0] });
  b.add('ring', torus(r(H * 0.86) + 0.1, 0.4, 6, 40), { p: [0, H * 0.86, 0], r: [Math.PI / 2, 0, 0] });
  b.add('ring', torus(r(H * 0.8) + 0.1, 0.4, 6, 40), { p: [0, H * 0.8, 0], r: [Math.PI / 2, 0, 0] });
  for (let i = 0; i < 4; i++) { const a = (i / 4) * Math.PI * 2 + 0.4; b.add('red', sphere(0.35, 8, 6), { p: [Math.cos(a) * (prof[14][0] + 0.3), H + 0.3, Math.sin(a) * (prof[14][0] + 0.3)] }); }
  grp.add(b.build({
    shell: new THREE.MeshStandardMaterial({ color: 0xd3d2cc, roughness: 0.92, side: THREE.DoubleSide }),
    col: CONCRETE, basin: CONCRETE, rim: plastic(0xa9aaa4, 0.9), ring: plastic(0xd2322a, 0.6), red: glow(0xff2a2a, 4),
  }));
  grp.userData.top = H;
  grp.userData.rimR = prof[14][0];
  return grp;
}

/* ---------- the valley ---------- */
/** Pine: a trunk and stacked cones in two shades. */
export function pine(seed = 1, { h = 11, colorA = 0x2f6b3a, colorB = 0x3d7d45 } = {}) {
  const rng = makeRng(seed), b = new ModelBuilder();
  b.add('bark', cyl(0.18, 0.3, h * 0.3, 6), { p: [0, h * 0.15, 0] });
  const tiers = 4;
  for (let i = 0; i < tiers; i++) {
    const t = i / tiers, rr = h * (0.3 - t * 0.055) * (0.92 + rng() * 0.16), hh = h * 0.36;
    b.add(i % 2 ? 'b' : 'a', cone(rr, hh, 8), { p: [0, h * (0.22 + t * 0.2) + hh / 2, 0], r: [0, rng() * 3, 0] });
  }
  return b.build({ bark: plastic(0x5a3f2c, 0.95), a: plastic(colorA, 0.9), b: plastic(colorB, 0.9) });
}

/** Street lamp: a pole with an arm reaching toward the road (+Z). Unlit by day. */
export function streetLamp({ h = 8 } = {}) {
  const b = new ModelBuilder();
  b.add('base', cyl(0.32, 0.4, 0.6, 8), { p: [0, 0.3, 0] });
  b.add('pole', cyl(0.09, 0.14, h, 8), { p: [0, h / 2, 0] });
  b.add('pole', box(0.16, 0.16, 2.4, 0.05, 1), { p: [0, h - 0.1, 1.1] });
  b.add('pole', box(0.7, 0.24, 1.2, 0.08, 2), { p: [0, h - 0.18, 2.2] });
  b.add('head', cube(0.5, 0.06, 0.95), { p: [0, h - 0.32, 2.2] });
  return b.build({ base: DARK, pole: plastic(0x8a929e, 0.5, 0.5), head: plastic(0xf2f4f6, 0.3) }, { cast: false });
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
  grp.add(b.build({ s: plastic(0x9aa3b2, 0.45, 0.7), ins: plastic(0xb8c2d0, 0.3), red: glow(0xff2a2a, 5) }));
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
    const ax = new THREE.Vector3(0, 1, 0).applyEuler(new THREE.Euler(-tilt, 0, 0)).applyAxisAngle(_up, yaw);
    const fp = [cx + ax.x * f * s, cy + ax.y * f * s, cz + ax.z * f * s];
    for (let k = 0; k < 3; k++) {
      const a = (k / 3) * Math.PI * 2, v = new THREE.Vector3(Math.cos(a) * R * 0.9 * s, (R * 0.9) ** 2 / (4 * f) * s, Math.sin(a) * R * 0.9 * s).applyEuler(new THREE.Euler(-tilt, 0, 0)).applyAxisAngle(_up, yaw);
      strut(b, 'ped', [cx + v.x, cy + v.y, cz + v.z], fp, 0.05 * s, 4);
    }
    b.add('feed', sphere(0.3 * s, 10, 8), { p: fp });
  });
  return b.build({ pad: CONCRETE, ped: plastic(0xc8ced8, 0.5), dish: new THREE.MeshStandardMaterial({ color: 0xeef0f4, roughness: 0.5, side: THREE.DoubleSide }), feed: plastic(0x2c323c, 0.5) });
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
  return b.build({ plinth: CONCRETE, tank: plastic(0x8a94a6, 0.5, 0.4), fin: plastic(0x6a7486, 0.5, 0.4), band: plastic(0xffc928, 0.5), ins: plastic(0xa86a4a, 0.35), tip: STEEL, lamp: glow(0x3dff7a, 3) });
}

/** Floodlight mast: a tall pole with a bank of lamps tilted down toward +Z (off by day). */
export function floodMast({ h = 18 } = {}) {
  const b = new ModelBuilder();
  b.add('pole', cyl(0.22, 0.38, h, 8), { p: [0, h / 2, 0] });
  b.add('pole', box(3.6, 0.25, 0.3, 0.05, 1), { p: [0, h, 0.2] });
  for (let i = 0; i < 4; i++) {
    b.add('frame', box(0.8, 0.6, 0.35, 0.08, 1), { p: [-1.35 + i * 0.9, h + 0.5, 0.35], r: [0.6, 0, 0] });
    b.add('lamp', cube(0.66, 0.46, 0.05), { p: [-1.35 + i * 0.9, h + 0.42, 0.55], r: [0.6, 0, 0] });
  }
  return b.build({ pole: plastic(0x8a929e, 0.5, 0.5), frame: DARK, lamp: plastic(0xf2f4f6, 0.3) }, { cast: false });
}

/** Backup generator: a container-sized box with a status band and two exhaust stacks. Long axis along X. */
export function generator() {
  const b = new ModelBuilder();
  b.add('body', box(6.4, 2.8, 2.6, 0.2, 2), { p: [0, 1.6, 0] });
  b.add('skid', box(6.8, 0.25, 2.9, 0.05, 1), { p: [0, 0.12, 0] });
  for (let i = 0; i < 5; i++) b.add('rib', cube(0.12, 2.4, 2.7), { p: [-2.6 + i * 1.3, 1.6, 0] });
  b.add('band', cube(6.45, 0.14, 2.65), { p: [0, 2.6, 0] });
  for (const x of [-1.8, 1.8]) { b.add('stack', cyl(0.22, 0.26, 1.6, 8), { p: [x, 3.6, 0.6] }); b.add('soot', cyl(0.27, 0.27, 0.1, 8), { p: [x, 4.4, 0.6] }); }
  return b.build({ body: plastic(0xdfe2e6, 0.6, 0.2), skid: DARK, rib: plastic(0xc4c9cf, 0.5, 0.3), band: plastic(0x1f6bff, 0.5), stack: STEEL, soot: MAT.black });
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
  const mat = new THREE.MeshBasicMaterial({ color: 0xf2f6fa, transparent: true, opacity: 0.32, depthWrite: false, side: THREE.DoubleSide });
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
