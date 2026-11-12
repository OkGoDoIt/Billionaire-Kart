/* Signature kart bodies, one per `look.kart` style. Each builder adds its static
   parts to the shared ModelBuilder (one draw call per material) and returns the
   layout the rig needs: seat, name plate, exhaust anchors, wheel style. Every body
   keeps the KART wheel positions, stays inside 1.8 m wide and 3.0 m long, and
   paints its main colour with the `main` material so the hype-cycle flash works. */
import * as THREE from 'three';
import { box, sphere, cyl, capsule, torus, cone, tube, loft, lathe, paint, plastic, glow, MAT } from './build.js';
import { densify, ringPoint, shell, roundPoly, side, plan, faceted, guard, guardEnd } from './kart-geo.js';

const PI = Math.PI;
const sbox = (w, h, d) => new THREE.BoxGeometry(w, h, d);
const gold = () => plastic(0xffcf4a, 0.22, 1);
let glassMat = null;
const glass = () => glassMat ??= new THREE.MeshPhysicalMaterial({ color: 0xd8f2ff, roughness: 0.05, metalness: 0, transparent: true, opacity: 0.32, depthWrite: false, envMapIntensity: 1.4 });

/* ---------- shared bits ---------- */

/** Seat cushion and backrest for a driver whose hips sit at S. */
function seat(b, S, mat = 'seat', back = true) {
  if (back) b.add(mat, loft([
    { z: S.z - 0.44, w: 0.26, h: 0.3, y: S.y + 0.36, x: S.x, n: 3 }, { z: S.z - 0.36, w: 0.3, h: 0.34, y: S.y + 0.38, x: S.x, n: 3 }, { z: S.z - 0.26, w: 0.28, h: 0.31, y: S.y + 0.36, x: S.x, n: 3 },
  ], 18, 2));
  b.add(mat, box(0.5, 0.1, 0.42, 0.04, 2), { p: [S.x, S.y + 0.1, S.z - 0.06] });
}
/** Steering column from the wheel down to the dash. */
function column(b, S, mat = 'dark', len = 0.5) {
  b.add(mat, cyl(0.035, 0.035, len, 8), { p: [S.x, S.y + 0.2, S.z + 0.74], r: [0.95, 0, 0] });
}
function axles(b, K, mat = 'dark') {
  b.add(mat, cyl(0.04, 0.04, K.frontX * 2, 8), { p: [0, K.frontR, K.frontZ], r: [0, 0, PI / 2] });
  b.add(mat, cyl(0.05, 0.05, K.rearX * 2, 8), { p: [0, K.rearR, K.rearZ], r: [0, 0, PI / 2] });
}
/** Dark oval cockpit opening sunk into a deck at height y. */
function cockpit(b, y, z = -0.26, sx = 0.74, sz = 0.95, mat = 'black', x = 0) { b.add(mat, sphere(0.5, 20, 10), { p: [x, y, z], s: [sx, 0.1, sz] }); }
/** Closed line hugging a shell's waist (for glow rings and trim). */
function waistLine(sections, { y = null, out = 0.012, steps = 4, dy = 0 } = {}) {
  const d = densify(sections, steps), right = [], left = [];
  for (const s of d) { right.push([s.x + s.w + out, (y ?? s.y) + dy, s.z]); left.push([s.x - s.w - out, (y ?? s.y) + dy, s.z]); }
  return [...right, ...left.reverse()];
}
const ring = (pts, r, seg = 120) => tube(pts, r, seg, 5, true);
/** Tyre-hugging angular arch, extruded across the wheel (for the angular karts). */
function arch(r, foot = 0.12, th = 0.055) {
  const fy = r + foot, ty = 2 * r + 0.05;
  return [[r + 0.06 + th, fy], [r * 0.55 + 0.03 + th * 0.8, ty + th], [-(r * 0.55 + 0.03 + th * 0.8), ty + th], [-(r + 0.06 + th), fy],
    [-(r + 0.06), fy], [-(r * 0.55 + 0.03), ty], [r * 0.55 + 0.03, ty], [r + 0.06, fy]];
}
const shiftZ = (pts, dz) => pts.map(([z, y]) => [z + dz, y]);

/* ---------- standard: the original sculpted go-kart ---------- */
function standard({ b, K }) {
  b.add('main', loft([
    { z: -1.06, w: 0.26, h: 0.11, y: 0.5, n: 3.2 }, { z: -0.9, w: 0.44, h: 0.2, y: 0.47, n: 3.2 }, { z: -0.45, w: 0.5, h: 0.23, y: 0.44, n: 3.4 },
    { z: 0.1, w: 0.46, h: 0.21, y: 0.41, n: 3.2 }, { z: 0.6, w: 0.36, h: 0.17, y: 0.38, n: 2.8 }, { z: 1.02, w: 0.27, h: 0.13, y: 0.35, n: 2.6 }, { z: 1.3, w: 0.13, h: 0.075, y: 0.33, n: 2.4 },
  ], 28, 4));
  b.add('second', loft([
    { z: 0.2, w: 0.13, h: 0.02, y: 0.625, n: 2 }, { z: 0.6, w: 0.11, h: 0.02, y: 0.548, n: 2 }, { z: 1.0, w: 0.085, h: 0.02, y: 0.478, n: 2 }, { z: 1.26, w: 0.05, h: 0.02, y: 0.4, n: 2 },
  ], 12, 3));
  for (const sx of [1, -1]) {
    b.add('main', loft([
      { z: -0.42, w: 0.1, h: 0.1, y: 0.35, x: sx * 0.6, n: 3 }, { z: -0.3, w: 0.17, h: 0.15, y: 0.37, x: sx * 0.62, n: 3.4 },
      { z: 0.15, w: 0.17, h: 0.14, y: 0.36, x: sx * 0.62, n: 3.4 }, { z: 0.42, w: 0.1, h: 0.09, y: 0.33, x: sx * 0.6, n: 3 },
    ], 16, 3));
    b.add('second', box(0.16, 0.025, 0.56, 0.01, 1), { p: [sx * 0.62, 0.515, -0.07] });
    b.add('black', box(0.2, 0.12, 0.03, 0.012, 1), { p: [sx * 0.62, 0.37, 0.41] });
  }
  b.add('black', sphere(0.5, 20, 10), { p: [0, 0.63, -0.26], s: [0.74, 0.1, 0.95] });
  seat(b, { x: 0, y: K.seatY, z: K.seatZ });
  b.add('dark', cyl(0.035, 0.035, 0.5, 8), { p: [0, 0.7, 0.44], r: [0.95, 0, 0] });
  b.add('second', loft([{ z: 0.36, w: 0.2, h: 0.1, y: 0.62, n: 2.6 }, { z: 0.52, w: 0.16, h: 0.14, y: 0.66, n: 2.6 }, { z: 0.66, w: 0.1, h: 0.08, y: 0.6, n: 2.6 }], 14, 2));
  b.add('chrome', tube([[-0.5, 0.27, 1.08], [-0.34, 0.25, 1.36], [0, 0.24, 1.46], [0.34, 0.25, 1.36], [0.5, 0.27, 1.08]], 0.045, 26, 8));
  b.add('chrome', tube([[-0.56, 0.3, -1.0], [-0.4, 0.3, -1.22], [0.4, 0.3, -1.22], [0.56, 0.3, -1.0]], 0.045, 20, 8));
  for (const sx of [1, -1]) b.add('chrome', tube([[sx * 0.5, 0.27, 1.08], [sx * 0.34, 0.3, 0.86]], 0.035, 4, 6));
  b.add('dark', box(0.5, 0.26, 0.34, 0.05, 2), { p: [0, 0.66, -0.98] });
  b.add('steel', box(0.36, 0.06, 0.26, 0.02, 1), { p: [0, 0.82, -0.98] });
  for (const sx of [1, -1]) {
    b.add('chrome', tube([[sx * 0.18, 0.7, -1.0], [sx * 0.26, 0.74, -1.18], [sx * 0.3, 0.86, -1.34]], 0.062, 12, 10));
    b.add('black', cyl(0.045, 0.045, 0.02, 10), { p: [sx * 0.305, 0.875, -1.36], r: [0.9, 0, 0] });
  }
  axles(b, K);
  for (const sx of [1, -1]) b.add('dark', box(0.04, 0.34, 0.1, 0.012, 1), { p: [sx * 0.3, 0.98, -1.06], r: [0.2, 0, 0] });
  b.add('main', box(1.2, 0.05, 0.32, 0.022, 2), { p: [0, 1.16, -1.1], r: [-0.12, 0, 0] });
  for (const sx of [1, -1]) b.add('second', box(0.04, 0.2, 0.36, 0.014, 1), { p: [sx * 0.61, 1.15, -1.1] });
  for (const sx of [1, -1]) b.add('lamp', sphere(0.05, 10, 8), { p: [sx * 0.2, 0.37, 1.2], s: [1, 0.8, 0.6] });
  return { plate: { p: [0, 0.98, -1.15], rx: 0.06 }, exhausts: [[0.31, 0.89, -1.4], [-0.31, 0.89, -1.4]] };
}

/* ---------- wedge: an angular brushed-steel truck ---------- */
function wedge({ b, K, M }) {
  // The stainless pickup, from photographs: one crease from nose to a single roof peak, one long slope back to a
  // sheer tail, slab sides, black trapezoid arches, a light bar across each end. Open-topped so the driver shows.
  M.body = paint(0xd3d7dc, { rough: 0.36, metal: 0.55, clear: 0.2 });   // brushed, not mirror: a mirror goes black under a sunset sky
  M.glassd = plastic(0x0a0c11, 0.06, 0.7);
  M.tail = glow(0xff2a2a, 2.4);
  const bev = { bevel: 0.018 };
  const PZ = 0.34, PY = 0.98, NZ = 1.5, NY = 0.6, TZ = -1.42, TY = 0.72, CZ = -0.76;       // peak, nose top, tail top, back of the cockpit
  const hood = z => NY + (NZ - z) * (PY - NY) / (NZ - PZ), roof = z => PY - (PZ - z) * (PY - TY) / (PZ - TZ);
  // nose to peak: bonnet and windshield are one plane
  b.add('body', side([[NZ, 0.26], [NZ, NY], [PZ, PY], [PZ, 0.26]], 0.56, bev));
  // cab sides carry the roofline back; the bed is one block under the sloping cover
  for (const sx of [1, -1]) b.add('body', side([[PZ + 0.02, 0.26], [PZ + 0.02, PY], [CZ, roof(CZ)], [CZ, 0.26]], 0.05, { bevel: 0.012 }), { p: [sx * 0.51, 0, 0] });
  b.add('body', side([[PZ + 0.02, 0.26], [PZ + 0.02, 0.42], [CZ, 0.42], [CZ, 0.26]], 0.5, bev));
  b.add('body', side([[CZ + 0.02, 0.26], [CZ + 0.02, roof(CZ)], [TZ, TY], [TZ, 0.26]], 0.56, bev));
  // dark glass: the huge flat windshield, and the wedge of side window under the roofline
  b.add('glassd', side([[1.02, hood(1.02) + 0.004], [PZ + 0.05, hood(PZ + 0.05) + 0.004], [PZ + 0.05, hood(PZ + 0.05) + 0.02], [1.02, hood(1.02) + 0.02]], 0.5, { bevel: 0.004 }));
  for (const sx of [1, -1]) b.add('glassd', side([[PZ - 0.06, 0.7], [PZ - 0.06, PY - 0.045], [CZ + 0.12, roof(CZ + 0.12) - 0.04], [CZ + 0.3, 0.7]], 0.006, { bevel: 0 }), { p: [sx * 0.563, 0, 0] });
  // the bed cover, in slats
  for (let k = 0; k < 5; k++) { const z0 = CZ - 0.06 - k * 0.118, z1 = z0 - 0.1; b.add('black', side([[z0, roof(z0) + 0.004], [z1, roof(z1) + 0.004], [z1, roof(z1) + 0.016], [z0, roof(z0) + 0.016]], 0.47, { bevel: 0.003 })); }
  // black lower cladding: bumpers, sills, and the trapezoid arches
  b.add('black', side([[NZ + 0.03, 0.22], [NZ + 0.03, 0.37], [1.14, 0.37], [1.14, 0.22]], 0.575, { bevel: 0.012 }));
  b.add('black', side([[TZ - 0.03, 0.22], [TZ - 0.03, 0.33], [-1.12, 0.33], [-1.12, 0.22]], 0.575, { bevel: 0.012 }));
  b.add('black', side([[0.42, 0.22], [0.42, 0.33], [-0.3, 0.33], [-0.3, 0.22]], 0.585, { bevel: 0.01 }));
  for (const sx of [1, -1]) {
    b.add('black', side(shiftZ(arch(K.frontR, -0.07, 0.075), K.frontZ), 0.1, { bevel: 0.012 }), { p: [sx * 0.585, 0, 0] });
    b.add('black', side(shiftZ(arch(K.rearR, -0.13, 0.08), K.rearZ), 0.11, { bevel: 0.012 }), { p: [sx * 0.6, 0, 0] });
    // door seams, so the slab sides read as panels
    for (const z of [PZ - 0.02, -0.2]) b.add('black', sbox(0.004, 0.36, 0.008), { p: [sx * 0.562, 0.5, z] });
  }
  // the unbreakable window, as demonstrated
  for (const [cx, cz] of [[-0.566, 0.02]]) {
    const cy = 0.8;
    for (let i = 0; i < 7; i++) { const a = i / 7 * PI * 2 + 0.3, l = 0.07 + (i % 3) * 0.03; b.add('white', sbox(0.006, 0.006, l), { p: [cx, cy + Math.sin(a) * l / 2, cz + Math.cos(a) * l / 2], r: [-a, 0, 0] }); }
    b.add('white', torus(0.045, 0.004, 3, 12), { p: [cx, cy, cz], r: [0, PI / 2, 0] });
  }
  // light bars: one white line across the nose, one red across the tail
  b.add('lamp', box(1.06, 0.03, 0.03, 0.008, 1), { p: [0, NY - 0.03, NZ + 0.006] });
  b.add('tail', box(1.06, 0.035, 0.03, 0.008, 1), { p: [0, TY - 0.04, TZ - 0.006] });
  // seat against the bed wall
  b.add('seat', box(0.5, 0.1, 0.42, 0.04, 2), { p: [0, 0.47, -0.36] });
  b.add('seat', box(0.5, 0.4, 0.06, 0.03, 2), { p: [0, 0.7, -0.62] });
  column(b, { x: 0, y: 0.5, z: -0.3 });
  axles(b, K);
  return { plate: { p: [0, 0.535, TZ - 0.012], rx: 0, s: 0.66 }, exhausts: [[0.44, 0.28, TZ - 0.02], [-0.44, 0.28, TZ - 0.02]], wheel: { style: 'knobby', rim: MAT.dark, hub: MAT.dark } };
}

/* ---------- pod: a smooth two-tone egg with a glowing waist ---------- */
function pod({ b, K, M, main, second }) {
  M.main = paint(main, { rough: 0.25, clear: 0.9 });
  M.shell = paint(second, { rough: 0.2, clear: 1 });
  M.ring = glow(0x5cffc8, 1.5);
  M.orb = glow(0xdcf6ff, 2.2);
  const y = 0.54, egg = [
    { z: -1.24, w: 0.03, h: 0.03, y }, { z: -1.17, w: 0.24, h: 0.22, y }, { z: -0.95, w: 0.43, h: 0.34, y }, { z: -0.45, w: 0.56, h: 0.38, y },
    { z: 0.1, w: 0.54, h: 0.35, y }, { z: 0.55, w: 0.38, h: 0.29, y }, { z: 0.95, w: 0.24, h: 0.21, y }, { z: 1.18, w: 0.1, h: 0.1, y }, { z: 1.24, w: 0.02, h: 0.02, y },
  ].map(s => ({ ...s, n: 2.15 }));
  b.add('shell', shell(egg, { ring: 16, a0: 0, a1: PI, steps: 5 }));
  b.add('main', shell(egg, { ring: 16, a0: PI, a1: PI * 2, steps: 5 }));
  b.add('ring', ring(waistLine(egg, { out: 0.006, steps: 5 }), 0.026, 140));
  // the orb on the nose, in a polished collar
  b.add('orb', sphere(0.11, 20, 14), { p: [0, y, 1.2] });
  b.add('chrome', torus(0.105, 0.018, 8, 24), { p: [0, y, 1.16] });
  // raised cockpit collar with the driver sunk inside
  b.add('shell', torus(0.3, 0.045, 10, 36), { p: [0, 0.93, -0.12], r: [PI / 2, 0, 0], s: [1, 1.7, 1] });
  b.add('black', cyl(0.3, 0.3, 0.02, 28), { p: [0, 0.93, -0.12], s: [1, 1, 1.7] });
  seat(b, { x: 0, y: 0.62, z: -0.3 }, 'seat');
  column(b, { x: 0, y: 0.62, z: -0.3 });
  // tail vents and a plate bracket
  for (const sx of [1, -1]) b.add('ring', sphere(0.05, 10, 8), { p: [sx * 0.3, 0.5, -0.98], s: [0.5, 0.5, 1] });
  b.add('black', box(0.62, 0.22, 0.04, 0.02, 2), { p: [0, 0.6, -1.27] });
  axles(b, K, 'steel');
  return { seat: { x: 0, y: 0.62, z: -0.3 }, plate: { p: [0, 0.6, -1.295], rx: 0, s: 0.68 }, exhausts: [[0.33, 0.44, -0.92], [-0.33, 0.44, -0.92]], wheel: { style: 'disc', rim: plastic(0xf4f2ec, 0.3), hub: M.main } };
}

/* ---------- rocket: a rocket on its side with a parcel strapped on ---------- */
function rocket({ b, K, M, main, second }) {
  M.main = paint(main, { rough: 0.3, clear: 0.8 });
  M.card = plastic(0xc69a62, 0.85);
  M.tape = plastic(0xe6cd98, 0.6);
  M.nozzle = new THREE.MeshStandardMaterial({ color: 0x3b3f47, roughness: 0.35, metalness: 0.85, side: THREE.DoubleSide });
  M.fire = glow(0xff6a10, 1.6); M.fire.transparent = true; M.fire.opacity = 0.82; M.fire.depthWrite = false;
  M.core = glow(0xfff2c0, 2.6);
  M.port = glow(0x9fd8ff, 0.9);
  const ay = 0.5;
  b.add('main', lathe([[0, -1.1], [0.27, -1.1], [0.34, -1.04], [0.37, -0.9], [0.38, -0.5], [0.38, 0.3], [0.355, 0.6]], 28), { p: [0, ay, 0], r: [PI / 2, 0, 0] });
  b.add('second', lathe([[0.355, 0.6], [0.31, 0.82], [0.23, 1.02], [0.13, 1.18], [0.05, 1.28], [0, 1.31]], 28), { p: [0, ay, 0], r: [PI / 2, 0, 0] });
  b.add('second', torus(0.382, 0.022, 8, 32), { p: [0, ay, -0.62] });
  b.add('second', torus(0.382, 0.022, 8, 32), { p: [0, ay, 0.12] });
  // portholes
  for (const sx of [1, -1]) {
    b.add('chrome', torus(0.08, 0.018, 8, 20), { p: [sx * 0.365, ay + 0.04, 0.38], r: [0, PI / 2, 0] });
    b.add('port', sphere(0.07, 14, 10), { p: [sx * 0.36, ay + 0.04, 0.38], s: [0.35, 1, 1] });
  }
  // four fins in an X
  const fin = side([[-0.46, 0.3], [-0.96, 0.6], [-1.2, 0.62], [-1.13, 0.3]], 0.028, { bevel: 0.012 });
  for (const a of [-PI / 4, PI / 4, -3 * PI / 4, 3 * PI / 4]) b.add('second', fin, { p: [0, ay, 0], r: [0, 0, a] });
  // engine bell with fire inside
  b.add('nozzle', lathe([[0.2, 0], [0.235, -0.07], [0.29, -0.2], [0.32, -0.3]], 24), { p: [0, ay, -1.08], r: [PI / 2, 0, 0] });   // opens to the rear
  // a plume with a hot core, not a flat disc: it tapers out of the bell
  b.add('fire', lathe([[0.19, 0.02], [0.2, -0.1], [0.15, -0.3], [0.07, -0.5], [0, -0.62]], 20), { p: [0, ay, -1.08], r: [PI / 2, 0, 0] });
  b.add('core', lathe([[0.1, 0.02], [0.1, -0.08], [0.06, -0.24], [0, -0.38]], 14), { p: [0, ay, -1.08], r: [PI / 2, 0, 0] });
  // cockpit sunk into the top
  cockpit(b, 0.86, -0.14, 0.62, 1.0);
  seat(b, { x: 0, y: 0.58, z: -0.3 }, 'second');
  column(b, { x: 0, y: 0.58, z: -0.3 });
  // the parcel, strapped down behind the seat
  b.add('card', box(0.66, 0.42, 0.44, 0.03, 2), { p: [0, 1.08, -0.92] });
  b.add('tape', sbox(0.09, 0.006, 0.445), { p: [0, 1.293, -0.92] });
  for (const sx of [1, -1]) b.add('dark', box(0.05, 0.436, 0.452, 0.01, 1), { p: [sx * 0.2, 1.08, -0.92] });
  b.add('dark', torus(0.384, 0.016, 6, 32), { p: [0, ay, -0.92] });
  axles(b, K);
  return { seat: { x: 0, y: 0.58, z: -0.3 }, plate: { p: [0, 1.06, -1.145], rx: 0, s: 0.7 }, exhausts: [[0.08, 0.42, -1.12], [-0.08, 0.42, -1.12]], wheel: { rim: plastic(0xf2f2f0, 0.3) } };
}

/* ---------- gpu: a graphics card with two fans ---------- */
function gpu({ b, K, M, main, spinner }) {
  M.main = paint(main, { rough: 0.3, clear: 0.7 });
  M.edge = glow(0xa8ff4a, 2.4);
  M.gold = gold();
  M.fan = plastic(0x2a2d34, 0.45);
  M.copper = plastic(0xd8834e, 0.28, 1);
  const outline = (i = 0) => roundPoly([[-0.44 + i, -1.24 + i], [0.44 - i, -1.24 + i], [0.44 - i, 0.3], [0.34 - i, 0.42], [0.34 - i, 1.32 - i], [-0.34 + i, 1.32 - i], [-0.34 + i, 0.42], [-0.44 + i, 0.3]], 0.07, 3);
  b.add('second', plan(outline(0), 0.3, 0.05));
  b.add('main', plan(outline(0.015), 0.35, 0.26, { bevel: 0.035, crease: 0.6 }));
  // glowing edge strips along both sides
  for (const sx of [1, -1]) {
    b.add('edge', sbox(0.012, 0.022, 1.42), { p: [sx * 0.432, 0.47, -0.5] });
    b.add('edge', sbox(0.012, 0.022, 0.86), { p: [sx * 0.332, 0.47, 0.86] });
  }
  // fans: shrouded rings on the deck, rotors spin on their own
  for (const [z, r] of [[0.86, 0.25], [-0.97, 0.26]]) {
    b.add('second', torus(r, 0.035, 8, 32), { p: [0, 0.61, z], r: [PI / 2, 0, 0] });
    b.add('black', cyl(r, r, 0.02, 28), { p: [0, 0.6, z] });
    spinner([0, 0.615, z], [-PI / 2, 0, 0], mb => {
      mb.add('fan', cyl(0.07, 0.07, 0.05, 16), { r: [PI / 2, 0, 0] });
      for (let i = 0; i < 7; i++) { const a = (i / 7) * PI * 2, g = box(r - 0.08, 0.1, 0.012, 0.005, 1); g.rotateX(0.45); mb.add('fan', g, { p: [Math.cos(a) * (r * 0.55), Math.sin(a) * (r * 0.55), 0], r: [0, 0, a] }); }
    }, { fan: M.fan });
  }
  // gold connector fingers on a tab at the back
  b.add('second', plan([[-0.3, -1.38], [0.3, -1.38], [0.3, -1.22], [-0.3, -1.22]], 0.3, 0.04));
  for (let i = 0; i < 11; i++) b.add('gold', new THREE.BoxGeometry(0.03, 0.01, 0.12), { p: [-0.25 + i * 0.05, 0.345, -1.31] });
  // the I/O bracket at the nose
  b.add('steel', box(0.6, 0.34, 0.025, 0.008, 1), { p: [0, 0.47, 1.335] });
  for (const [x, y, w] of [[-0.16, 0.52, 0.14], [0.04, 0.52, 0.14], [0.2, 0.52, 0.1], [-0.08, 0.41, 0.24]]) b.add('black', new THREE.BoxGeometry(w, 0.05, 0.01), { p: [x, y, 1.35] });
  // heat pipes looping out of the sides
  for (const sx of [1, -1]) for (const dz of [0, 0.16]) b.add('copper', tube([[sx * 0.42, 0.42, -0.75 + dz], [sx * 0.5, 0.48, -0.6 + dz], [sx * 0.5, 0.5, -0.32 + dz], [sx * 0.42, 0.44, -0.18 + dz]], 0.022, 14, 6));
  // power connector and cable
  b.add('black', box(0.12, 0.06, 0.1, 0.01, 1), { p: [0.28, 0.635, -0.45] });
  seat(b, { x: 0, y: 0.6, z: -0.25 });
  column(b, { x: 0, y: 0.6, z: -0.25 }, 'dark', 0.42);
  axles(b, K);
  return { seat: { x: 0, y: 0.6, z: -0.25 }, plate: { p: [0, 0.48, -1.247], rx: 0, s: 0.86 }, exhausts: [[0.4, 0.3, -1.26], [-0.4, 0.3, -1.26]], wheel: { rim: plastic(0x2a2d34, 0.4, 0.4), hub: M.main } };
}

/* ---------- safety: roll hoop, foam pads, hazard stripes, beacon ---------- */
function safety({ b, K, M, main, second }) {
  M.main = paint(main, { rough: 0.32, clear: 0.6 });
  M.foam = plastic(second, 0.92);
  M.haz = plastic(0xffc21a, 0.5);
  M.amber = glow(0xffa21a, 2.6);
  b.add('main', loft([
    { z: -1.14, w: 0.32, h: 0.16, y: 0.5 }, { z: -0.98, w: 0.46, h: 0.25, y: 0.48 }, { z: -0.4, w: 0.48, h: 0.27, y: 0.46 },
    { z: 0.2, w: 0.46, h: 0.25, y: 0.44 }, { z: 0.62, w: 0.35, h: 0.2, y: 0.42 }, { z: 1.0, w: 0.29, h: 0.16, y: 0.4 }, { z: 1.2, w: 0.18, h: 0.09, y: 0.38 },
  ].map(s => ({ ...s, n: 3 })), 26, 4));
  cockpit(b, 0.71, -0.24);
  seat(b, { x: 0, y: 0.5, z: -0.3 });
  column(b, { x: 0, y: 0.5, z: -0.3 });
  // foam all round
  b.add('foam', capsule(0.12, 0.6, 6, 14), { p: [0, 0.32, 1.33], r: [0, 0, PI / 2] });
  for (const sx of [1, -1]) {
    b.add('foam', capsule(0.1, 0.48, 6, 12), { p: [sx * 0.6, 0.33, 0.05], r: [PI / 2, 0, 0] });
    b.add('dark', cyl(0.03, 0.03, 0.16, 6), { p: [sx * 0.5, 0.36, 0.05], r: [0, 0, PI / 2] });
    b.add('foam', capsule(0.07, 0.36, 6, 12), { p: [sx * 0.75, 1.42, -0.62] });
  }
  for (const sx of [1, -1]) b.add('dark', cyl(0.03, 0.03, 0.2, 6), { p: [sx * 0.3, 0.32, 1.2], r: [PI / 2, 0, 0] });
  // rear bumper in hazard stripes
  b.add('haz', capsule(0.13, 0.76, 6, 16), { p: [0, 0.34, -1.25], r: [0, 0, PI / 2] });
  for (let i = -3; i <= 3; i++) b.add('black', cyl(0.134, 0.134, 0.055, 16), { p: [i * 0.12, 0.34, -1.25], r: [0, 0, PI / 2] });
  b.add('main', box(0.82, 0.32, 0.06, 0.03, 2), { p: [0, 0.6, -1.17] });
  // the roll hoop over the driver
  b.add('chrome', tube([[-0.46, 0.6, -0.62], [-0.74, 1.25, -0.61], [-0.72, 2.0, -0.6], [-0.44, 2.5, -0.6], [0, 2.63, -0.6], [0.44, 2.5, -0.6], [0.72, 2.0, -0.6], [0.74, 1.25, -0.61], [0.46, 0.6, -0.62]], 0.045, 40, 8));
  // amber beacon on a pole
  b.add('dark', tube([[-0.36, 0.7, -1.02], [-0.5, 1.0, -1.06], [-0.64, 1.3, -1.1]], 0.02, 8, 6));
  b.add('dark', cyl(0.07, 0.08, 0.06, 12), { p: [-0.64, 1.33, -1.1] });
  b.add('amber', sphere(0.085, 14, 10), { p: [-0.64, 1.38, -1.1], s: [1, 1.2, 1] });
  // little mirrors on stalks
  for (const sx of [1, -1]) {
    b.add('dark', tube([[sx * 0.3, 0.6, 0.55], [sx * 0.4, 0.74, 0.5]], 0.012, 3, 5));
    b.add('chrome', cyl(0.06, 0.06, 0.025, 14), { p: [sx * 0.41, 0.78, 0.5], r: [PI / 2, 0, 0] });
  }
  for (const sx of [1, -1]) b.add('lamp', sphere(0.05, 10, 8), { p: [sx * 0.2, 0.42, 1.18], s: [1, 0.8, 0.6] });
  for (const sx of [1, -1]) b.add('chrome', tube([[sx * 0.3, 0.52, -0.98], [sx * 0.44, 0.52, -1.1], [sx * 0.47, 0.56, -1.22]], 0.035, 8, 8));
  axles(b, K);
  return { plate: { p: [0, 0.6, -1.204], rx: 0, s: 0.9 }, exhausts: [[0.47, 0.5, -1.24], [-0.47, 0.5, -1.24]], wheel: { hub: M.haz } };
}

/* ---------- limo: long, low, glossy, gold trim and flags ---------- */
function limo({ b, K, M, main, second }) {
  M.main = paint(main, { rough: 0.18, metal: 0.3, clear: 1 });
  M.gold = gold();
  M.seat = plastic(0x7a1020, 0.65);
  const body = [
    { z: -1.47, w: 0.42, h: 0.16, y: 0.45 }, { z: -1.36, w: 0.45, h: 0.2, y: 0.45 }, { z: -0.6, w: 0.46, h: 0.2, y: 0.45 },
    { z: 0.2, w: 0.44, h: 0.19, y: 0.44 }, { z: 0.7, w: 0.355, h: 0.17, y: 0.43 }, { z: 1.3, w: 0.34, h: 0.16, y: 0.42 }, { z: 1.44, w: 0.3, h: 0.12, y: 0.41 },
  ].map(s => ({ ...s, n: 4.2 }));
  b.add('main', loft(body, 28, 4));
  // sweeping mudguards over every wheel
  for (const sx of [1, -1]) {
    for (const [z, R, r, w, ay] of [[K.frontZ, 0.4, 0.05, 0.34, K.frontR], [K.rearZ, 0.45, 0.055, 0.44, K.rearR]]) {
      b.add('main', guard(R, r, w, 0.12, PI - 0.12), { p: [sx * (z > 0 ? K.frontX : K.rearX), ay, z] });
      for (const a of [0.12, PI - 0.12]) { const e = guardEnd(R, a); b.add('main', sphere(r, 10, 8), { p: [sx * (z > 0 ? K.frontX : K.rearX), ay + e[1], z + e[2]], s: [w / (2 * r), 1, 1] }); }
    }
  }
  // gold trim, sills, grille, ornament, bumpers
  for (const sx of [1, -1]) {
    b.add('gold', sbox(0.014, 0.022, 2.6), { p: [sx * 0.462, 0.56, -0.08] });
    b.add('gold', box(0.05, 0.04, 0.72, 0.015, 1), { p: [sx * 0.48, 0.3, 0.05] });
  }
  b.add('black', box(0.46, 0.18, 0.04, 0.02, 1), { p: [0, 0.44, 1.448] });
  for (let i = -3; i <= 3; i++) b.add('gold', sbox(0.02, 0.18, 0.03), { p: [i * 0.06, 0.44, 1.462] });
  b.add('gold', box(0.5, 0.025, 0.04, 0.01, 1), { p: [0, 0.54, 1.462] });
  b.add('gold', sphere(0.035, 12, 8), { p: [0, 0.62, 1.3] });
  b.add('gold', cone(0.03, 0.08, 10), { p: [0, 0.67, 1.3] });
  b.add('gold', tube([[-0.4, 0.3, 1.38], [-0.2, 0.28, 1.48], [0.2, 0.28, 1.48], [0.4, 0.3, 1.38]], 0.03, 16, 6));
  b.add('gold', tube([[-0.4, 0.3, -1.42], [-0.2, 0.28, -1.5], [0.2, 0.28, -1.5], [0.4, 0.3, -1.42]], 0.03, 16, 6));
  for (const sx of [1, -1]) b.add('lamp', sphere(0.055, 12, 8), { p: [sx * 0.26, 0.5, 1.43], s: [1, 0.8, 0.5] });
  // the stretch cabin behind the chauffeur, with tinted windows
  b.add('main', box(0.76, 0.42, 0.84, 0.1, 3), { p: [0, 0.8, -1.02] });
  b.add('second', box(0.772, 0.15, 0.74, 0.04, 2), { p: [0, 0.86, -1.02] });
  for (const z of [-0.78, -1.02, -1.26]) b.add('main', sbox(0.78, 0.15, 0.035), { p: [0, 0.86, z] });
  b.add('second', box(0.6, 0.15, 0.02, 0.01, 1), { p: [0, 0.86, -1.44] });
  b.add('gold', sbox(0.782, 0.016, 0.8), { p: [0, 0.772, -1.02] });
  cockpit(b, 0.64, -0.24, 0.74, 0.9);
  seat(b, { x: 0, y: 0.5, z: -0.3 });
  column(b, { x: 0, y: 0.5, z: -0.3 });
  // two plain flags on the front wings
  for (const sx of [1, -1]) {
    const x = sx * K.frontX, y0 = 0.78;
    b.add('chrome', cyl(0.012, 0.012, 0.42, 6), { p: [x, y0 + 0.2, 1.02] });
    b.add('gold', sphere(0.022, 8, 6), { p: [x, y0 + 0.42, 1.02] });
    b.add('second', box(0.008, 0.07, 0.22, 0.003, 1), { p: [x, y0 + 0.34, 0.9] });
    b.add('white', box(0.008, 0.07, 0.22, 0.003, 1), { p: [x, y0 + 0.27, 0.9] });
  }
  for (const sx of [1, -1]) b.add('chrome', cyl(0.035, 0.035, 0.14, 10), { p: [sx * 0.42, 0.27, -1.44], r: [PI / 2, 0, 0] });
  axles(b, K);
  return { plate: { p: [0, 0.43, -1.473], rx: 0, s: 0.86 }, exhausts: [[0.42, 0.2, -1.5], [-0.42, 0.2, -1.5]], wheel: { rim: plastic(0xdfe5ee, 0.16, 1), hub: M.gold } };
}

/* ---------- unibody: one brushed-aluminium slab, one perfect chamfer ---------- */
function unibody({ b, K, M, main }) {
  M.main = paint(main, { rough: 0.3, metal: 0.85, clear: 0.35 });
  M.chamfer = plastic(0xf6f8fb, 0.06, 1);
  M.light = glow(0xffffff, 2.6);
  const outline = (i = 0) => roundPoly([[-0.44 + i, -1.24 + i], [0.44 - i, -1.24 + i], [0.44 - i, 0.22], [0.345 - i, 0.52], [0.345 - i, 1.32 - i], [-0.345 + i, 1.32 - i], [-0.345 + i, 0.52], [-0.44 + i, 0.22]],
    [0.22 - i, 0.22 - i, 0.5, 0.5, 0.24 - i, 0.24 - i, 0.5, 0.5], 6);
  b.add('main', plan(outline(0), 0.24, 0.26, { crease: 0.5 }));
  // the chamfer: a polished bevel from the outer edge up to the inset deck
  b.add('chamfer', plan(outline(0.05), 0.45, 0.101, { bevel: 0.05, size: 0.05, offset: 0, crease: 0.5 }));
  b.add('main', plan(outline(0.05), 0.548, 0.006, { crease: 0.5 }));
  // a thin white light line all the way round
  const line = outline(0).map(([x, z]) => [x * 1.006, 0.37, z * 1.004]);
  b.add('light', ring(line, 0.006, 160));
  // the camera bump
  b.add('second', box(0.36, 0.05, 0.36, 0.09, 3), { p: [0, 0.575, -0.92] });
  for (const [x, z] of [[-0.07, -0.85], [-0.07, -0.99], [0.075, -0.92]]) {
    b.add('black', cyl(0.05, 0.05, 0.03, 18), { p: [x, 0.6, z] });
    b.add('chamfer', torus(0.055, 0.01, 6, 20), { p: [x, 0.612, z], r: [PI / 2, 0, 0] });
  }
  b.add('light', sphere(0.018, 8, 6), { p: [0.09, 0.605, -1.02] });
  cockpit(b, 0.55, -0.24, 0.72, 0.95);
  seat(b, { x: 0, y: 0.52, z: -0.3 }, 'second');
  column(b, { x: 0, y: 0.52, z: -0.3 }, 'second', 0.4);
  axles(b, K);
  return { seat: { x: 0, y: 0.52, z: -0.3 }, plate: { p: [0, 0.38, -1.246], rx: 0, s: 0.86 }, exhausts: [[0.42, 0.3, -1.2], [-0.42, 0.3, -1.2]], wheel: { style: 'disc', rim: plastic(0xd5d9de, 0.25, 0.9), hub: M.second } };
}

/* ---------- tandem: a long two-seater in primary colours, with a propeller ---------- */
function tandem({ b, K, M, main, second, spinner }) {
  M.main = paint(main, { rough: 0.3, clear: 0.7 });
  M.yellow = paint(0xfbbc05, { rough: 0.35, clear: 0.5 });
  M.green = paint(0x34a853, { rough: 0.35, clear: 0.5 });
  const tub = [
    { z: -1.46, w: 0.26, h: 0.13, y: 0.5 }, { z: -1.32, w: 0.42, h: 0.22, y: 0.48 }, { z: -0.7, w: 0.47, h: 0.24, y: 0.46 }, { z: 0.0, w: 0.47, h: 0.23, y: 0.44 },
    { z: 0.45, w: 0.37, h: 0.2, y: 0.42 }, { z: 0.95, w: 0.31, h: 0.16, y: 0.4 }, { z: 1.3, w: 0.21, h: 0.1, y: 0.38 }, { z: 1.45, w: 0.08, h: 0.05, y: 0.37 },
  ].map(s => ({ ...s, n: 3 }));
  b.add('main', loft(tub, 26, 4));
  b.add('second', loft([{ z: 0.5, w: 0.12, h: 0.02, y: 0.62, n: 2 }, { z: 0.95, w: 0.1, h: 0.02, y: 0.56, n: 2 }, { z: 1.3, w: 0.07, h: 0.02, y: 0.48, n: 2 }, { z: 1.45, w: 0.03, h: 0.02, y: 0.41, n: 2 }], 12, 3));
  for (const sx of [1, -1]) b.add('second', loft([
    { z: -0.36, w: 0.08, h: 0.08, y: 0.36, x: sx * 0.58, n: 3 }, { z: -0.26, w: 0.14, h: 0.13, y: 0.37, x: sx * 0.6, n: 3.2 },
    { z: 0.3, w: 0.14, h: 0.12, y: 0.36, x: sx * 0.6, n: 3.2 }, { z: 0.44, w: 0.08, h: 0.08, y: 0.34, x: sx * 0.58, n: 3 },
  ], 14, 3));
  const S1 = { x: 0.16, y: 0.5, z: 0.06 }, S2 = { x: -0.17, y: 0.58, z: -0.7 };
  cockpit(b, 0.68, S1.z + 0.02, 0.62, 0.62, 'dark', S1.x);
  cockpit(b, 0.71, S2.z + 0.02, 0.62, 0.6, 'dark', S2.x);
  seat(b, S1, 'yellow'); seat(b, S2, 'green');
  column(b, S1);
  // a grab bar for the rider behind
  b.add('green', tube([[S1.x - 0.24, 0.98, S1.z - 0.47], [S1.x, 1.0, S1.z - 0.5], [S1.x + 0.24, 0.98, S1.z - 0.47]], 0.025, 8, 6));
  // little pusher propeller on a mast
  b.add('dark', box(0.05, 0.42, 0.06, 0.015, 1), { p: [0, 0.82, -1.36], r: [0.25, 0, 0] });
  b.add('yellow', sphere(0.06, 12, 8), { p: [0, 1.04, -1.42], s: [1, 1, 1.3] });
  spinner([0, 1.04, -1.49], [0, 0, 0], mb => {
    mb.add('green', cone(0.045, 0.1, 12), { r: [-PI / 2, 0, 0], p: [0, 0, -0.04] });
    for (const a of [0, PI]) { const g = box(0.07, 0.25, 0.02, 0.01, 1); g.rotateY(0.35); mb.add('yellow', g, { p: [-Math.sin(a) * 0.14, Math.cos(a) * 0.14, 0], r: [0, 0, a] }); }
  }, { green: M.green, yellow: M.yellow });
  b.add('chrome', tube([[-0.5, 0.27, 1.08], [-0.3, 0.25, 1.4], [0, 0.24, 1.5], [0.3, 0.25, 1.4], [0.5, 0.27, 1.08]], 0.04, 20, 6));
  for (const sx of [1, -1]) b.add('lamp', sphere(0.05, 10, 8), { p: [sx * 0.18, 0.41, 1.25], s: [1, 0.8, 0.6] });
  axles(b, K);
  return { seat: S1, seat2: { ...S2, scale: 0.86 }, plate: { p: [0, 0.58, -1.39], rx: 0.25, s: 0.66 }, exhausts: [[0.36, 0.42, -1.3], [-0.36, 0.42, -1.3]], wheel: { rim: plastic(0xf4f4f0, 0.35), hub: M.yellow } };
}

/* ---------- beige: a 1990s desktop computer ---------- */
function beige({ b, K, M, main }) {
  M.main = paint(main, { rough: 0.15, clear: 1 });     // the screen (and the seat), blue as ever
  M.beige = plastic(0xddd3b5, 0.62);
  M.beige2 = plastic(0xc3b893, 0.6);
  M.text = glow(0xffffff, 1.3);
  M.led = glow(0x4dff6a, 2.4);
  // the case lies flat as the chassis
  b.add('beige', box(0.88, 0.38, 1.7, 0.05, 2), { p: [0, 0.43, -0.4] });
  // drive bays face sideways
  for (const sx of [1, -1]) {
    const x = sx * 0.442;
    b.add('beige2', new THREE.BoxGeometry(0.008, 0.24, 0.62), { p: [x, 0.48, -0.06] });
    for (const yy of [0.56, 0.48]) b.add('dark', new THREE.BoxGeometry(0.012, 0.018, 0.5), { p: [x, yy, -0.06] });
    b.add('dark', new THREE.BoxGeometry(0.012, 0.012, 0.26), { p: [x, 0.4, -0.18] });
    b.add('beige2', box(0.03, 0.07, 0.08, 0.012, 1), { p: [x, 0.33, -0.98] });
    b.add('led', new THREE.BoxGeometry(0.014, 0.018, 0.03), { p: [x, 0.33, -0.86] });
  }
  // vent slots on the deck
  for (let i = 0; i < 5; i++) b.add('dark', new THREE.BoxGeometry(0.5, 0.006, 0.025), { p: [0, 0.621, -0.86 - i * 0.07] });
  // the CRT monitor as the nose
  b.add('beige2', box(0.5, 0.1, 0.7, 0.03, 1), { p: [0, 0.37, 0.92] });
  b.add('beige2', cyl(0.15, 0.19, 0.08, 18), { p: [0, 0.46, 0.92] });
  b.add('beige', loft([{ z: 0.56, w: 0.15, h: 0.11, y: 0.78, n: 6 }, { z: 0.7, w: 0.22, h: 0.17, y: 0.78, n: 6 }, { z: 0.93, w: 0.3, h: 0.22, y: 0.78, n: 6 }], 20, 3));
  b.add('beige', box(0.66, 0.52, 0.14, 0.05, 2), { p: [0, 0.78, 0.98] });
  b.add('main', sphere(1, 24, 16), { p: [0, 0.79, 1.05], s: [0.27, 0.2, 0.035] });
  for (const [yy, w] of [[0.88, 0.32], [0.83, 0.26], [0.78, 0.34], [0.73, 0.2]]) b.add('text', new THREE.BoxGeometry(w, 0.016, 0.004), { p: [-0.02 + (w - 0.34) / 2, yy, 1.083] });
  b.add('led', sphere(0.012, 6, 4), { p: [0.27, 0.56, 1.052] });
  // keyboard bumper
  b.add('beige', box(0.86, 0.06, 0.26, 0.02, 2), { p: [0, 0.26, 1.32], r: [0.08, 0, 0] });
  for (let row = 0; row < 4; row++) for (let i = 0; i < 12; i++) b.add('beige2', new THREE.BoxGeometry(0.052, 0.026, 0.042), { p: [-0.33 + i * 0.06 + (row % 2) * 0.015, 0.3 + row * 0.004, 1.42 - row * 0.05], r: [0.08, 0, 0] });
  b.add('beige2', new THREE.BoxGeometry(0.3, 0.026, 0.042), { p: [0, 0.296, 1.45], r: [0.08, 0, 0] });
  for (const sx of [1, -1]) b.add('dark', cyl(0.025, 0.025, 0.18, 6), { p: [sx * 0.2, 0.3, 1.2], r: [PI / 2, 0, 0] });
  // round vents on the back
  for (const sx of [1, -1]) b.add('dark', cyl(0.045, 0.045, 0.02, 14), { p: [sx * 0.38, 0.29, -1.252], r: [PI / 2, 0, 0] });
  // the wait cursor, life size, bolted to the back: it is still installing
  M.glass = glass();
  M.sand = plastic(0xe6c372, 0.8);
  {
    const hx = 0.22, hz = -1.03, y0 = 0.6, q = 1.3;
    for (const yy of [y0 + 0.02 * q, y0 + 0.56 * q]) b.add('beige2', cyl(0.2 * q, 0.2 * q, 0.04 * q, 18), { p: [hx, yy, hz] });
    for (let i = 0; i < 3; i++) { const a = i / 3 * PI * 2 + 0.5; b.add('beige', cyl(0.016 * q, 0.016 * q, 0.54 * q, 6), { p: [hx + Math.cos(a) * 0.17 * q, y0 + 0.29 * q, hz + Math.sin(a) * 0.17 * q] }); }
    b.add('glass', lathe([[0.001, 0.04], [0.15, 0.05], [0.14, 0.17], [0.03, 0.29], [0.14, 0.41], [0.15, 0.53], [0.001, 0.54]], 18), { p: [hx, y0, hz], s: q });
    b.add('sand', cone(0.13 * q, 0.11 * q, 16), { p: [hx, y0 + 0.4 * q, hz], r: [PI, 0, 0] });
    b.add('sand', cone(0.13 * q, 0.08 * q, 16), { p: [hx, y0 + 0.08 * q, hz] });
    b.add('sand', cyl(0.008 * q, 0.008 * q, 0.2 * q, 4), { p: [hx, y0 + 0.2 * q, hz] });
  }
  const S = { x: 0, y: 0.64, z: -0.35 };
  seat(b, S, 'main');
  column(b, S, 'dark', 0.42);
  axles(b, K);
  return { seat: S, plate: { p: [0, 0.48, -1.256], rx: 0, s: 0.95 }, exhausts: [[0.38, 0.22, -1.27], [-0.38, 0.22, -1.27]], wheel: { rim: M.beige, hub: M.beige2 } };
}

/* ---------- stealth: matte, faceted, very low, one glowing orb ---------- */
function stealth({ b, K, M, main, second }) {
  M.main = paint(main, { rough: 0.8, clear: 0 });
  M.second = paint(second, { rough: 0.7, clear: 0 });
  M.orb = glow(0x7b6cff, 3.2);
  M.slit = glow(0x6a7cff, 2.4);
  const hull = [[0, 1.46], [0.3, 1.0], [0.34, 0.46], [0.46, 0.2], [0.46, -1.0], [0.4, -1.3], [-0.4, -1.3], [-0.46, -1.0], [-0.46, 0.2], [-0.34, 0.46], [-0.3, 1.0]];
  b.add('main', faceted(plan(hull, 0.18, 0.32, { bevel: 0.12, size: 0.16 })));
  // the flying wing over the rear wheels, zigzag trailing edge
  const wing = [[0, -0.58], [0.9, -1.06], [0.74, -1.3], [0.5, -1.1], [0.26, -1.32], [0, -1.12], [-0.26, -1.32], [-0.5, -1.1], [-0.74, -1.3], [-0.9, -1.06]];
  b.add('main', faceted(plan(wing, 0.78, 0.13, { bevel: 0.05, size: 0.08 })));
  for (const sx of [1, -1]) b.add('second', faceted(side([[-0.72, 0.4], [-0.84, 0.8], [-1.04, 0.8], [-1.0, 0.4]], 0.035, { bevel: 0.01 })), { p: [sx * 0.3, 0, 0] });
  // faceted canards over the front wheels
  for (const sx of [1, -1]) {
    const pts = [[0.42, 0.98], [0.52, 1.18], [0.84, 1.1], [0.86, 0.6], [0.62, 0.44], [0.44, 0.56]].map(([x, z]) => [sx * x, z]);
    b.add('main', faceted(plan(sx > 0 ? pts : pts.reverse(), 0.66, 0.08, { bevel: 0.03, size: 0.05 })));
    b.add('second', box(0.12, 0.2, 0.08, 0.01, 1), { p: [sx * 0.38, 0.58, 0.78] });
  }
  b.add('slit', sbox(0.3, 0.012, 0.02), { p: [0, 0.31, 1.3] });
  cockpit(b, 0.5, -0.22, 0.66, 0.9, 'black');
  seat(b, { x: 0, y: 0.5, z: -0.3 }, 'second');
  column(b, { x: 0, y: 0.5, z: -0.3 }, 'second');
  // the orb on its pedestal, held by three claws
  b.add('second', cone(0.13, 0.16, 6), { p: [0, 0.98, -0.84] });
  b.add('orb', sphere(0.15, 22, 16), { p: [0, 1.15, -0.84] });
  for (let i = 0; i < 3; i++) { const a = (i / 3) * PI * 2 + 0.5; b.add('chrome', tube([[Math.cos(a) * 0.05, 1.0, -0.84 + Math.sin(a) * 0.05], [Math.cos(a) * 0.15, 1.1, -0.84 + Math.sin(a) * 0.15], [Math.cos(a) * 0.1, 1.24, -0.84 + Math.sin(a) * 0.1]], 0.012, 6, 5)); }
  // exhaust slits in the tail
  for (const sx of [1, -1]) b.add('slit', sbox(0.03, 0.025, 0.2), { p: [sx * 0.43, 0.3, -1.06] });
  axles(b, K, 'second');
  return { plate: { p: [0, 0.4, -1.31], rx: 0, s: 0.8 }, exhausts: [[0.43, 0.22, -1.18], [-0.43, 0.22, -1.18]], wheel: { style: 'disc', rim: plastic(0x1a1b20, 0.6), hub: MAT.dark } };
}

/* ---------- lab: a white medical device with a tank of something glowing ---------- */
function lab({ b, K, M, main, second }) {
  M.main = paint(main, { rough: 0.16, clear: 1 });
  M.second = paint(second, { rough: 0.1, clear: 1 });
  M.cyan = glow(0x9ff0ff, 2.4);
  M.glass = glass();
  M.blood = glow(0xff2438, 1.9);
  const body = [
    { z: -1.28, w: 0.3, h: 0.15, y: 0.5 }, { z: -1.14, w: 0.44, h: 0.23, y: 0.5 }, { z: -0.5, w: 0.465, h: 0.26, y: 0.48 }, { z: 0.2, w: 0.43, h: 0.23, y: 0.45 },
    { z: 0.68, w: 0.34, h: 0.19, y: 0.42 }, { z: 1.15, w: 0.27, h: 0.14, y: 0.39 }, { z: 1.4, w: 0.13, h: 0.07, y: 0.37 },
  ].map(s => ({ ...s, n: 3.6 }));
  b.add('main', loft(body, 26, 4));
  // glowing line along the flanks
  const d = densify(body, 4).filter(s => s.z > -1.0 && s.z < 1.12);
  for (const sx of [1, -1]) b.add('cyan', tube(d.map(s => [sx * (s.w * 0.995 + 0.004), s.y - 0.02, s.z]), 0.009, 40, 5));
  // black glass display on the nose with a status ring
  b.add('second', sphere(1, 24, 12), { p: [0, 0.585, 0.82], s: [0.22, 0.05, 0.34] });
  b.add('cyan', torus(0.05, 0.01, 6, 20), { p: [0, 0.636, 0.82], r: [PI / 2, 0, 0] });
  // instrument module behind the seat, holding the tank
  b.add('main', box(0.74, 0.3, 0.5, 0.1, 3), { p: [0, 0.78, -0.98] });
  b.add('chrome', cyl(0.19, 0.19, 0.04, 20), { p: [0, 0.95, -0.98] });
  b.add('chrome', cyl(0.19, 0.19, 0.04, 20), { p: [0, 1.31, -0.98] });
  b.add('blood', cyl(0.13, 0.13, 0.22, 18), { p: [0, 1.08, -0.98] });
  b.add('glass', cyl(0.165, 0.165, 0.32, 22, true), { p: [0, 1.13, -0.98] });
  b.add('cyan', sphere(0.02, 6, 4), { p: [0.05, 1.22, -0.95] });
  // thin chrome pipes from the tank to the nose
  for (const sx of [1, -1]) b.add('chrome', tube([[sx * 0.12, 0.95, -0.86], [sx * 0.3, 0.88, -0.7], [sx * 0.43, 0.66, -0.4], [sx * 0.44, 0.63, 0.15], [sx * 0.34, 0.57, 0.75], [sx * 0.16, 0.53, 1.18]], 0.016, 40, 6));
  cockpit(b, 0.71, -0.24);
  seat(b, { x: 0, y: 0.5, z: -0.3 }, 'second');
  column(b, { x: 0, y: 0.5, z: -0.3 }, 'chrome');
  for (const sx of [1, -1]) b.add('cyan', box(0.12, 0.018, 0.02, 0.008, 1), { p: [sx * 0.17, 0.42, 1.31] });
  for (const sx of [1, -1]) b.add('chrome', cyl(0.04, 0.03, 0.1, 10), { p: [sx * 0.3, 0.44, -1.25], r: [PI / 2, 0, 0] });
  axles(b, K);
  return { plate: { p: [0, 0.78, -1.233], rx: 0, s: 0.8 }, exhausts: [[0.3, 0.36, -1.28], [-0.3, 0.36, -1.28]], wheel: { style: 'disc', rim: plastic(0xf4f4f2, 0.25), hub: M.second } };
}

/* ---------- yacht: a boat on wheels ---------- */
function yacht({ b, K, M, main, second }) {
  M.main = paint(main, { rough: 0.22, clear: 1 });
  M.second = paint(second, { rough: 0.3, clear: 0.6 });
  M.wood = plastic(0xb57a42, 0.55);
  M.wood2 = plastic(0x6e4424, 0.6);
  const hull = [
    { z: -1.32, w: 0.42, ht: 0.03, hb: 0.3, y: 0.6 }, { z: -1.2, w: 0.46, ht: 0.03, hb: 0.34, y: 0.6 }, { z: -0.6, w: 0.48, ht: 0.03, hb: 0.38, y: 0.61 },
    { z: 0.1, w: 0.45, ht: 0.03, hb: 0.37, y: 0.63 }, { z: 0.6, w: 0.35, ht: 0.03, hb: 0.33, y: 0.66 }, { z: 1.0, w: 0.23, ht: 0.03, hb: 0.28, y: 0.69 },
    { z: 1.32, w: 0.09, ht: 0.03, hb: 0.2, y: 0.73 }, { z: 1.46, w: 0.015, ht: 0.02, hb: 0.1, y: 0.77 },
  ].map(s => ({ ...s, n: 2.4 }));
  b.add('main', shell(hull, { ring: 28 }));
  // white topsides band, then the teak deck inset
  b.add('second', shell(hull.map(s => ({ ...s, w: s.w + 0.006, ht: s.ht + 0.004, hb: Math.min(0.1, s.hb) })), { ring: 28 }));
  const deck = hull.map(s => ({ ...s, w: Math.max(0.01, s.w - 0.03), ht: s.ht + 0.02, hb: 0.01 })).slice(0, -1);
  b.add('wood', shell(deck, { ring: 24 }));
  // plank seams
  const dd = densify(deck, 4).filter(s => s.z < 1.2);
  for (const f of [-0.6, -0.2, 0.2, 0.6]) b.add('wood2', tube(dd.filter(s => s.w > 0.12).map(s => [s.w * f, s.y + s.ht * Math.pow(1 - Math.pow(Math.abs(f), s.n), 1 / s.n) + 0.002, s.z]), 0.005, 30, 3));
  // bow rail
  const rail = [[-0.3, 0.92, 0.5], [-0.2, 0.95, 1.0], [0, 0.98, 1.36], [0.2, 0.95, 1.0], [0.3, 0.92, 0.5]];
  b.add('chrome', tube(rail, 0.012, 24, 5));
  for (const [x, y, z] of rail) b.add('chrome', cyl(0.01, 0.01, 0.26, 5), { p: [x, y - 0.13, z] });
  // life ring on the flank
  b.add('second', torus(0.14, 0.042, 8, 24), { p: [-0.5, 0.5, -0.12], r: [0, PI / 2, 0] });
  for (let i = 0; i < 4; i++) b.add('main', torus(0.14, 0.045, 8, 6, PI / 7), { p: [-0.5, 0.5, -0.12], r: [0, PI / 2, i * PI / 2 + PI / 4 - PI / 14] });
  // mast, boom, and sail, set off to one side so the driver stays in view
  const mx = 0.42, mz = -0.85;
  b.add('wood2', cyl(0.026, 0.03, 1.4, 10), { p: [mx, 1.36, mz] });
  b.add('main', box(0.004, 0.08, 0.14, 0.002, 1), { p: [mx, 2.0, mz - 0.08] });
  const sail = side([[-0.04, 0.82], [-0.04, 1.98], [-0.58, 0.86]], 0.008, { bevel: 0.004 });
  b.add('second', sail, { p: [mx, 0, mz], r: [0, -0.45, 0] });
  b.add('wood2', tube([[mx, 0.82, mz - 0.03], [mx + Math.sin(0.45) * 0.58, 0.84, mz - Math.cos(0.45) * 0.58]], 0.018, 2, 6));
  cockpit(b, 0.69, -0.22, 0.7, 0.9);
  seat(b, { x: 0, y: 0.56, z: -0.3 }, 'seat');
  column(b, { x: 0, y: 0.56, z: -0.3 }, 'wood2');
  axles(b, K);
  return { seat: { x: 0, y: 0.56, z: -0.3 }, steering: 'helm', plate: { p: [0, 0.49, -1.322], rx: 0, s: 0.8 }, exhausts: [[0.36, 0.3, -1.3], [-0.36, 0.3, -1.3]], wheel: { rim: plastic(0xf4f1ea, 0.35), hub: M.main } };
}

/* ---------- press: a vintage motor car with the morning papers ---------- */
function press({ b, K, M, main }) {
  M.main = paint(main, { rough: 0.2, clear: 1 });
  M.fender = paint(0x141418, { rough: 0.22, clear: 1 });
  M.paper = plastic(0xebe6d8, 0.85);
  M.ink = plastic(0x5a5d63, 0.8);
  M.twine = plastic(0x9a7a4a, 0.9);
  M.seat = plastic(0x5a3a22, 0.7);
  M.glass = glass();
  // bonnet, cockpit tub with a high back, and rounded tail
  b.add('main', loft([{ z: 0.26, w: 0.31, h: 0.21, y: 0.55 }, { z: 0.7, w: 0.3, h: 0.205, y: 0.55 }, { z: 1.12, w: 0.29, h: 0.2, y: 0.55 }, { z: 1.18, w: 0.28, h: 0.19, y: 0.55 }].map(s => ({ ...s, n: 5 })), 24, 3));
  b.add('main', loft([{ z: -0.84, w: 0.4, h: 0.3, y: 0.54 }, { z: -0.5, w: 0.44, h: 0.28, y: 0.52 }, { z: 0.0, w: 0.42, h: 0.24, y: 0.5 }, { z: 0.34, w: 0.32, h: 0.22, y: 0.54 }].map(s => ({ ...s, n: 3.4 })), 24, 3));
  b.add('main', loft([{ z: -1.34, w: 0.3, h: 0.14, y: 0.48 }, { z: -1.22, w: 0.42, h: 0.22, y: 0.5 }, { z: -0.8, w: 0.44, h: 0.3, y: 0.52 }].map(s => ({ ...s, n: 3 })), 24, 3));
  for (const sx of [1, -1]) for (let i = 0; i < 4; i++) b.add('dark', new THREE.BoxGeometry(0.01, 0.12, 0.025), { p: [sx * 0.305, 0.6, 0.62 + i * 0.1] });
  // radiator, cap, headlamps on a bar, bulb horn
  b.add('chrome', box(0.56, 0.42, 0.06, 0.03, 2), { p: [0, 0.55, 1.2] });
  b.add('dark', sbox(0.46, 0.32, 0.02), { p: [0, 0.55, 1.232] });
  for (let i = -4; i <= 4; i++) b.add('chrome', new THREE.BoxGeometry(0.012, 0.32, 0.012), { p: [i * 0.05, 0.55, 1.24] });
  b.add('chrome', cyl(0.025, 0.03, 0.06, 10), { p: [0, 0.79, 1.18] });
  b.add('chrome', sphere(0.025, 8, 6), { p: [0, 0.83, 1.18] });
  b.add('chrome', tube([[-0.42, 0.7, 1.06], [0, 0.66, 1.16], [0.42, 0.7, 1.06]], 0.018, 12, 6));
  for (const sx of [1, -1]) {
    b.add('chrome', cyl(0.115, 0.085, 0.14, 18), { p: [sx * 0.42, 0.82, 1.05], r: [PI / 2, 0, 0] });
    b.add('lamp', cyl(0.1, 0.1, 0.01, 18), { p: [sx * 0.42, 0.82, 1.123], r: [PI / 2, 0, 0] });
    b.add('chrome', cyl(0.012, 0.012, 0.14, 5), { p: [sx * 0.42, 0.7, 1.05] });
  }
  b.add('chrome', tube([[0.3, 0.74, 0.5], [0.35, 0.78, 0.75], [0.36, 0.84, 0.95]], 0.016, 8, 6));
  b.add('chrome', cone(0.05, 0.1, 12), { p: [0.36, 0.86, 1.0], r: [PI / 2 - 0.2, 0, 0] });
  b.add('black', sphere(0.05, 10, 8), { p: [0.3, 0.74, 0.47] });
  // windscreen
  b.add('chrome', tube([[-0.3, 0.78, 0.4], [-0.3, 1.1, 0.36], [0.3, 1.1, 0.36], [0.3, 0.78, 0.4]], 0.014, 16, 5));
  b.add('glass', new THREE.BoxGeometry(0.58, 0.3, 0.008), { p: [0, 0.94, 0.38], r: [-0.12, 0, 0] });
  // black mudguards sweeping into running boards
  for (const sx of [1, -1]) {
    const fx = sx * K.frontX, rx = sx * K.rearX;
    b.add('fender', guard(0.4, 0.06, 0.36, -0.3, PI - 0.08), { p: [fx, K.frontR, K.frontZ] });
    b.add('fender', guard(0.45, 0.065, 0.44, 0.08, PI + 0.3), { p: [rx, K.rearR, K.rearZ] });
    for (const [x, ay, z, R, r, w, a] of [[fx, K.frontR, K.frontZ, 0.4, 0.06, 0.36, PI - 0.08], [rx, K.rearR, K.rearZ, 0.45, 0.065, 0.44, 0.08]]) {
      const e = guardEnd(R, a); b.add('fender', sphere(r, 10, 8), { p: [x, ay + e[1], z + e[2]], s: [w / (2 * r), 1, 1] });
    }
    b.add('fender', box(0.24, 0.04, 0.84, 0.015, 1), { p: [sx * 0.62, 0.21, 0.02] });
    b.add('chrome', sbox(0.012, 0.03, 0.84), { p: [sx * 0.745, 0.21, 0.02] });
  }
  // the morning papers, tied in bundles on a rack
  b.add('chrome', box(0.6, 0.02, 0.44, 0.008, 1), { p: [0, 0.79, -1.06] });
  for (const [i, yy, rot, dx] of [[0, 0.84, 0.05, 0], [1, 0.92, -0.08, 0.02], [2, 1.0, 0.1, -0.02]]) {
    b.add('paper', box(0.54, 0.075, 0.36, 0.01, 1), { p: [dx, yy, -1.06], r: [0, rot, 0] });
    b.add('twine', sbox(0.545, 0.082, 0.014), { p: [dx, yy, -1.06], r: [0, rot, 0] });
    b.add('twine', sbox(0.014, 0.082, 0.365), { p: [dx, yy, -1.06], r: [0, rot, 0] });
    if (i === 2) for (const [lz, lw, lx] of [[-0.11, 0.42, 0], [-0.04, 0.2, -0.11], [0.03, 0.2, -0.11], [0.1, 0.2, -0.11], [-0.04, 0.2, 0.12], [0.03, 0.2, 0.12], [0.1, 0.2, 0.12]]) {
      const c = Math.cos(rot), s = Math.sin(rot);
      b.add('ink', new THREE.BoxGeometry(lw, 0.003, lz === -0.11 ? 0.05 : 0.025), { p: [dx + lx * c + lz * s, yy + 0.039, -1.06 - lx * s + lz * c], r: [0, rot, 0] });
    }
  }
  cockpit(b, 0.77, -0.22, 0.7, 0.9);
  seat(b, { x: 0, y: 0.52, z: -0.3 }, 'seat');
  column(b, { x: 0, y: 0.52, z: -0.3 });
  for (const sx of [1, -1]) b.add('chrome', tube([[sx * 0.26, 0.26, -0.9], [sx * 0.38, 0.25, -1.2], [sx * 0.38, 0.27, -1.38]], 0.03, 8, 8));
  axles(b, K);
  return { seat: { x: 0, y: 0.52, z: -0.3 }, plate: { p: [0, 0.48, -1.342], rx: 0, s: 0.78 }, exhausts: [[0.38, 0.2, -1.4], [-0.38, 0.2, -1.4]], wheel: { style: 'wire', rim: plastic(0xece6d6, 0.4), hub: MAT.chrome } };
}

/* ---------- headset: a VR headset, strap and all, with a surfboard riding along ---------- */
function headset({ b, K, M, main, second }) {
  M.main = paint(main, { rough: 0.3, clear: 0.7 });
  M.shell = paint(0xf1f3f6, { rough: 0.35, clear: 0.5 });
  M.visor = plastic(0x0b0c10, 0.08, 0.3);
  M.foam = plastic(0x3a3e47, 0.95);
  M.strap = plastic(0x2a2d34, 0.7);
  M.led = glow(0x5cb8ff, 2.2);
  M.board = paint(0xf6f4ee, { rough: 0.3, clear: 0.6 });
  M.stripe = paint(0xd8322a, { rough: 0.3, clear: 0.6 });
  // the low tub the driver sits in
  b.add('main', loft([
    { z: -1.0, w: 0.3, h: 0.12, y: 0.42 }, { z: -0.85, w: 0.44, h: 0.17, y: 0.42 }, { z: -0.2, w: 0.46, h: 0.18, y: 0.41 }, { z: 0.4, w: 0.42, h: 0.17, y: 0.4 }, { z: 0.7, w: 0.38, h: 0.14, y: 0.4 },
  ].map(s => ({ ...s, n: 3 })), 24, 3));
  // the visor block is the nose: white shell, black glass front, foam gasket facing the driver
  b.add('shell', box(0.88, 0.44, 0.66, 0.17, 4), { p: [0, 0.56, 0.98] });
  b.add('visor', box(0.8, 0.36, 0.06, 0.14, 3), { p: [0, 0.57, 1.3] });
  b.add('led', box(0.5, 0.02, 0.02, 0.008, 1), { p: [0, 0.4, 1.315] });
  for (const sx of [1, -1]) {
    b.add('black', cyl(0.045, 0.045, 0.02, 14), { p: [sx * 0.26, 0.62, 1.335], r: [PI / 2, 0, 0] });
    b.add('chrome', torus(0.048, 0.008, 5, 16), { p: [sx * 0.26, 0.62, 1.343] });
  }
  b.add('foam', torus(0.25, 0.07, 8, 26), { p: [0, 0.58, 0.64], s: [1.45, 0.75, 1] });
  // the head strap wraps all the way round the cockpit as a rear bumper
  const band = [];
  for (let i = 0; i <= 16; i++) { const t = i / 16 * PI; band.push([Math.cos(t) * 0.52, -0.22 - Math.sin(t) * 0.9]); }
  const inner = band.map(([x, z]) => [x * 0.93, -0.22 + (z + 0.22) * 0.96]).reverse();
  b.add('strap', plan([[0.52, 0.7], ...band, [-0.52, 0.7], [-0.484, 0.7], ...inner, [0.484, 0.7]], 0.48, 0.15, { bevel: 0.012 }));
  b.add('shell', box(0.74, 0.28, 0.16, 0.06, 2), { p: [0, 0.58, -1.13] });
  b.add('led', sphere(0.02, 8, 6), { p: [0.3, 0.68, -1.215] });
  // the surfboard, stood up beside the driver
  b.add('board', sphere(1, 18, 12), { p: [-0.62, 1.22, -0.88], r: [-0.12, 0, 0.1], s: [0.17, 0.72, 0.035] });
  b.add('stripe', box(0.3, 0.07, 0.074, 0.03, 1), { p: [-0.6, 1.36, -0.9], r: [-0.12, 0, 0.1] });
  b.add('main', sphere(1, 12, 8), { p: [-0.555, 1.83, -0.96], r: [-0.12, 0, 0.1], s: [0.09, 0.14, 0.039] });
  b.add('strap', box(0.06, 0.4, 0.06, 0.02, 1), { p: [-0.6, 0.58, -0.84] });
  seat(b, { x: 0, y: 0.5, z: -0.3 });
  column(b, { x: 0, y: 0.5, z: -0.3 });
  for (const sx of [1, -1]) b.add('dark', box(0.06, 0.06, 0.4, 0.02, 1), { p: [sx * 0.5, 0.38, 0.8] });
  axles(b, K);
  return { plate: { p: [0, 0.58, -1.215], rx: 0, s: 0.74 }, exhausts: [[0.4, 0.4, -1.12], [-0.4, 0.4, -1.12]], wheel: { style: 'disc', rim: plastic(0xf1f3f6, 0.3), hub: M.main } };
}

/* ---------- cloud: a kart made of cloud ---------- */
function cloud({ b, K, M, main }) {
  M.main = paint(main, { rough: 0.3, clear: 0.7 });
  M.puff = plastic(0xf7f9fc, 0.92);
  M.puff2 = plastic(0xd6e4f3, 0.92);
  b.add('main', loft([
    { z: -1.1, w: 0.3, h: 0.12, y: 0.4 }, { z: -0.9, w: 0.42, h: 0.16, y: 0.4 }, { z: 0.2, w: 0.44, h: 0.17, y: 0.39 }, { z: 0.9, w: 0.3, h: 0.13, y: 0.37 }, { z: 1.2, w: 0.14, h: 0.08, y: 0.36 },
  ].map(s => ({ ...s, n: 3 })), 24, 3));
  const puffs = [
    // nose
    [0, 0.5, 1.12, 0.22], [0.2, 0.46, 1.0, 0.18], [-0.2, 0.46, 1.0, 0.18], [0, 0.62, 0.86, 0.17],
    // flanks
    [0.44, 0.48, 0.42, 0.2], [0.48, 0.5, 0.05, 0.22], [0.45, 0.47, -0.3, 0.19], [-0.44, 0.48, 0.42, 0.2], [-0.48, 0.5, 0.05, 0.22], [-0.45, 0.47, -0.3, 0.19],
    // the big tail
    [0, 0.62, -1.02, 0.3], [0.34, 0.58, -0.92, 0.24], [-0.34, 0.58, -0.92, 0.24], [0.18, 0.86, -0.98, 0.2], [-0.2, 0.84, -0.95, 0.19],
  ];
  for (const [x, y, z, r] of puffs) {
    b.add('puff', sphere(r, 14, 10), { p: [x, y, z], s: [1, 0.85, 1] });
    b.add('puff2', sphere(r * 0.92, 12, 6), { p: [x, y - r * 0.22, z], s: [1, 0.6, 1] });
  }
  cockpit(b, 0.58, -0.24, 0.72, 0.9);
  seat(b, { x: 0, y: 0.5, z: -0.3 });
  column(b, { x: 0, y: 0.5, z: -0.3 });
  b.add('main', box(0.7, 0.24, 0.06, 0.03, 2), { p: [0, 0.46, -1.27] });
  for (const sx of [1, -1]) b.add('lamp', sphere(0.045, 10, 8), { p: [sx * 0.14, 0.4, 1.3], s: [1, 0.8, 0.6] });
  axles(b, K);
  return { plate: { p: [0, 0.46, -1.305], rx: 0, s: 0.74 }, exhausts: [[0.3, 0.32, -1.25], [-0.3, 0.32, -1.25]], wheel: { rim: plastic(0xf4f6fa, 0.4), hub: M.main } };
}

/* ---------- goban: a Go board on wheels, game in progress, with a chess knight for company ---------- */
function goban({ b, K, M, main }) {
  M.main = paint(main, { rough: 0.3, clear: 0.7 });
  M.wood = plastic(0xd9ae62, 0.55);
  M.wood2 = plastic(0xb68745, 0.6);
  M.line = plastic(0x2a1c10, 0.8);
  M.stoneB = plastic(0x15161a, 0.2);
  M.stoneW = plastic(0xf4f2ec, 0.25);
  M.knight = paint(0x17181c, { rough: 0.25, clear: 0.8 });
  // the board: one thick slab, end grain darker
  b.add('wood', box(0.9, 0.24, 2.5, 0.03, 2), { p: [0, 0.5, 0.05] });
  for (const z of [1.3, -1.2]) b.add('wood2', box(0.91, 0.245, 0.02, 0.008, 1), { p: [0, 0.5, z] });
  b.add('main', box(0.8, 0.12, 2.3, 0.04, 2), { p: [0, 0.34, 0.05] });
  // the grid and a game in progress on the front half
  const g0 = 0.2, g1 = 1.2, n = 9, dx = 0.8 / (n - 1), dz = (g1 - g0) / (n - 1);
  for (let i = 0; i < n; i++) {
    b.add('line', sbox(0.8, 0.004, 0.008), { p: [0, 0.621, g0 + i * dz] });
    b.add('line', sbox(0.008, 0.004, g1 - g0), { p: [-0.4 + i * dx, 0.621, (g0 + g1) / 2] });
  }
  const stones = [[2, 2, 'B'], [6, 2, 'W'], [2, 6, 'W'], [6, 6, 'B'], [4, 4, 'B'], [3, 4, 'W'], [5, 3, 'W'], [3, 5, 'B'], [5, 5, 'W'], [4, 6, 'B'], [1, 3, 'B'], [7, 5, 'W']];
  for (const [i, j, c] of stones) b.add(c === 'B' ? 'stoneB' : 'stoneW', sphere(0.045, 12, 6), { p: [-0.4 + i * dx, 0.632, g0 + j * dz], s: [1, 0.42, 1] });
  cockpit(b, 0.625, -0.24, 0.72, 0.9);
  seat(b, { x: 0, y: 0.5, z: -0.3 });
  column(b, { x: 0, y: 0.5, z: -0.3 });
  // a giant knight on the back corner
  const kx = -0.32, kz = -0.98;
  b.add('knight', lathe([[0.001, 0], [0.17, 0], [0.17, 0.04], [0.13, 0.07], [0.14, 0.1], [0.1, 0.14], [0.09, 0.2], [0.001, 0.2]], 18), { p: [kx, 0.62, kz] });
  b.add('knight', side([[0.1, 0], [0.12, 0.16], [0.08, 0.28], [0.2, 0.38], [0.24, 0.46], [0.18, 0.52], [0.06, 0.6], [-0.02, 0.66], [-0.06, 0.58], [-0.12, 0.44], [-0.12, 0]], 0.07, { bevel: 0.03, segs: 2 }), { p: [kx, 0.8, kz] });
  b.add('wood2', sphere(0.014, 6, 4), { p: [kx + 0.07, 1.23, kz + 0.12] });
  b.add('wood2', sphere(0.014, 6, 4), { p: [kx - 0.07, 1.23, kz + 0.12] });
  for (const sx of [1, -1]) b.add('lamp', sphere(0.045, 10, 8), { p: [sx * 0.3, 0.45, 1.3], s: [1, 0.8, 0.5] });
  axles(b, K);
  return { plate: { p: [0, 0.49, -1.215], rx: 0, s: 0.8 }, exhausts: [[0.36, 0.34, -1.2], [-0.36, 0.34, -1.2]], wheel: { rim: plastic(0xd9ae62, 0.5), hub: M.main } };
}

export const BODIES = { standard, wedge, pod, rocket, gpu, safety, limo, unibody, tandem, beige, stealth, lab, yacht, press, headset, cloud, goban };
