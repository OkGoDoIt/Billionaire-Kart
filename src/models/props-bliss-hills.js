/* Props for Bliss Hills: wind turbines, the paperclip arch, oversized beige
   1990s computers, a farm, sheep, picket fences, hay bales, and the error-dialog
   obstacle. Each builder returns a THREE.Group on y = 0, facing +Z. Textures are
   only created inside the functions, so this module imports cleanly in Node. */
import * as THREE from 'three';
import { ModelBuilder, box, sphere, cyl, torus, tube, plastic, paint, glow, MAT } from './build.js';
import { canvasTex } from '../render/textures.js';
import { makeRng } from '../core/util.js';

const BEIGE = 0xe6dcc0, BEIGE_D = 0xcfc3a3;

/** A triangular prism (for roofs) with flat shading, apex up, length along Z. */
function prism(width, height, len) {
  const r = width / Math.sqrt(3);
  const g = new THREE.CylinderGeometry(r, r, len, 3, 1).toNonIndexed();
  g.rotateX(-Math.PI / 2);                       // axis along Z, first vertex (apex) up
  const base = -r / 2, k = height / (1.5 * r);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) p.setY(i, (p.getY(i) - base) * k);   // base at y = 0, apex at y = height
  g.computeVertexNormals();
  return g;
}

/** Wind turbine. userData.rotor spins about its local Z axis. */
export function windTurbine({ h = 34, blade = 14 } = {}) {
  const grp = new THREE.Group(), b = new ModelBuilder();
  b.add('w', cyl(0.75, 1.5, h, 16), { p: [0, h / 2, 0] });
  b.add('w', cyl(2.2, 2.6, 0.8, 16), { p: [0, 0.4, 0] });
  b.add('w', box(2.4, 2.4, 6.2, 1.0, 3), { p: [0, h + 0.8, -0.8] });
  b.add('stripe', cyl(0.82, 0.86, 1.2, 16, true), { p: [0, h * 0.12, 0] });
  grp.add(b.build({ w: plastic(0xf6f7f4, 0.45), stripe: paint(0xe23b3b, { rough: 0.4 }) }));
  const r = new ModelBuilder();
  r.add('w', sphere(1.25, 14, 10), { p: [0, 0, 0.4], s: [1, 1, 1.5] });
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2;
    r.add('w', sphere(1, 12, 10), { p: [Math.sin(a) * blade * 0.52, Math.cos(a) * blade * 0.52, 0], r: [0, 0, -a], s: [0.9, blade * 0.5, 0.28] });
  }
  const rotor = r.build({ w: plastic(0xffffff, 0.4) });
  rotor.position.set(0, h + 0.8, 2.7);
  grp.add(rotor);
  grp.userData.rotor = rotor;
  return grp;
}

/** Giant paperclip arch spanning `span` metres, `h` tall, with googly eyes. The road passes under it along Z. */
export function paperclipArch({ span = 30, h = 12 } = {}) {
  const grp = new THREE.Group(), b = new ModelBuilder();
  const pts = [], R = 0.45;
  const line = (x0, y0, x1, y1, n = 6) => { for (let i = 0; i < n; i++) { const t = i / n; pts.push([x0 + (x1 - x0) * t, y0 + (y1 - y0) * t, 0]); } };
  const arc = (cx, cy, rx, ry, a0, a1, n = 18) => { for (let i = 0; i < n; i++) { const a = a0 + (a1 - a0) * (i / n); pts.push([cx + Math.cos(a) * rx, cy + Math.sin(a) * ry, 0]); } };
  const o = span / 2, legTop = h - 5;
  // outer loop: up the right leg, over the top, down the left leg
  line(o, -0.6, o, legTop);
  arc(0, legTop, o, 5, 0, Math.PI);
  line(-o, legTop, -o, 1.3);
  // tight turn at the foot of the left leg, then the middle loop
  const m = o - 3;
  arc(-o + 1.5, 1.3, 1.5, 1.4, Math.PI, Math.PI * 2, 10);
  line(-m, 1.3, -m, legTop);
  arc(0, legTop, m, 3.6, Math.PI, 0);
  line(m, legTop, m, 5.6);
  // turn at the bottom of the right side, up into the short inner end
  const n = m - 3;
  arc(m - 1.5, 5.6, 1.5, 1.4, 0, -Math.PI, 10);
  line(n, 5.6, n, legTop + 1.2, 4);
  pts.push([n, legTop + 1.2, 0]);
  b.add('wire', tube(pts, R, pts.length * 3, 10));
  for (const x of [o, -o]) b.add('wire', sphere(R, 10, 8), { p: [x, -0.6, 0] });
  b.add('wire', sphere(R, 10, 8), { p: [n, legTop + 1.2, 0] });
  // feet so it sits on the ground
  for (const x of [o, -o + 1.5]) b.add('foot', cyl(1.4, 1.7, 0.6, 16), { p: [x, 0.1, 0] });
  // googly eyes on the top of the arch, looking at oncoming karts (-Z)
  for (const s of [1, -1]) {
    const ex = s * 2.4, ey = h - 0.2;
    b.add('eye', sphere(1.5, 20, 14), { p: [ex, ey, -0.9], s: [1, 1, 0.55] });
    b.add('pupil', sphere(0.72, 14, 10), { p: [ex + s * 0.25, ey - 0.45, -1.62], s: [1, 1, 0.4] });
  }
  grp.add(b.build({ wire: plastic(0xdfe5ee, 0.18, 1), foot: MAT.dark, eye: plastic(0xffffff, 0.3), pupil: MAT.black }));
  return grp;
}

/** Oversized beige desktop tower, `h` metres tall, front on +Z. */
export function desktopTower({ h = 4 } = {}) {
  const b = new ModelBuilder(), w = h * 0.45, d = h * 1.0;
  b.add('beige', box(w, h, d, 0.22, 3), { p: [0, h / 2, 0] });
  b.add('beigeD', box(w * 0.92, h * 0.06, d * 0.04, 0.03, 1), { p: [0, h * 0.04, d / 2] });
  // drive bays, floppy slot, power button, vents
  for (let i = 0; i < 2; i++) b.add('beigeD', box(w * 0.8, h * 0.09, 0.12, 0.03, 1), { p: [0, h * (0.86 - i * 0.12), d / 2] });
  b.add('dark', box(w * 0.5, h * 0.015, 0.14, 0.005, 1), { p: [0, h * 0.86, d / 2 + 0.02] });
  b.add('dark', box(w * 0.55, h * 0.035, 0.14, 0.01, 1), { p: [0, h * 0.62, d / 2 + 0.02] });
  b.add('dark', box(w * 0.18, h * 0.02, 0.14, 0.005, 1), { p: [w * 0.18, h * 0.6, d / 2 + 0.03] });
  b.add('power', cyl(h * 0.045, h * 0.045, 0.1, 14), { p: [0, h * 0.42, d / 2 + 0.03], r: [Math.PI / 2, 0, 0] });
  b.add('led', sphere(h * 0.015, 8, 6), { p: [w * 0.28, h * 0.42, d / 2 + 0.03] });
  for (let i = 0; i < 5; i++) b.add('beigeD', box(w * 0.6, h * 0.012, 0.08, 0.004, 1), { p: [0, h * (0.12 + i * 0.035), d / 2 + 0.01] });
  return b.build({ beige: plastic(BEIGE, 0.6), beigeD: plastic(BEIGE_D, 0.65), dark: MAT.dark, power: plastic(0x8f8a7c, 0.5), led: glow(0x37ff6a, 2.5) });
}

let screenTex = null;
/** Oversized beige CRT monitor, `h` metres tall, screen on +Z showing a little rolling-hills wallpaper. */
export function crtMonitor({ h = 4 } = {}) {
  const grp = new THREE.Group(), b = new ModelBuilder();
  const W = h * 0.95, H = h * 0.78, D = h * 0.3, y0 = h * 0.2;
  b.add('beige', box(W * 0.55, h * 0.06, W * 0.5, 0.06, 2), { p: [0, h * 0.03, 0] });
  b.add('beige', cyl(W * 0.12, W * 0.18, y0 - h * 0.05, 14), { p: [0, y0 / 2 + h * 0.03, 0] });
  b.add('beige', box(W, H, D, 0.22, 3), { p: [0, y0 + H / 2, D * 0.1] });
  b.add('beigeD', box(W * 0.74, H * 0.74, D * 1.5, 0.4, 3), { p: [0, y0 + H * 0.5, -D * 0.75] });
  b.add('beigeD', box(W * 0.5, H * 0.5, D * 0.8, 0.3, 2), { p: [0, y0 + H * 0.5, -D * 1.6] });
  b.add('dark', box(W * 0.84, H * 0.8, 0.1, 0.06, 2), { p: [0, y0 + H * 0.53, D * 0.6] });
  b.add('led', sphere(h * 0.014, 8, 6), { p: [W * 0.36, y0 + H * 0.06, D * 0.62] });
  grp.add(b.build({ beige: plastic(BEIGE, 0.6), beigeD: plastic(BEIGE_D, 0.65), dark: MAT.dark, led: glow(0x37ff6a, 2.5) }));
  screenTex = screenTex || canvasTex(256, 192, (g, w, hh) => {
    const sky = g.createLinearGradient(0, 0, 0, hh * 0.7); sky.addColorStop(0, '#1f63d8'); sky.addColorStop(1, '#8fc4ff');
    g.fillStyle = sky; g.fillRect(0, 0, w, hh);
    g.fillStyle = 'rgba(255,255,255,0.9)';
    for (const [x, y, r] of [[60, 40, 18], [84, 34, 22], [108, 42, 16], [190, 60, 14], [210, 54, 18]]) { g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill(); }
    g.fillStyle = '#5cc93f'; g.beginPath(); g.moveTo(0, hh * 0.72); g.bezierCurveTo(w * 0.3, hh * 0.45, w * 0.6, hh * 0.62, w, hh * 0.58); g.lineTo(w, hh); g.lineTo(0, hh); g.fill();
    g.fillStyle = '#3f9e2e'; g.beginPath(); g.moveTo(0, hh * 0.9); g.bezierCurveTo(w * 0.4, hh * 0.72, w * 0.7, hh * 0.86, w, hh * 0.8); g.lineTo(w, hh); g.lineTo(0, hh); g.fill();
    g.fillStyle = '#c0c0c0'; g.fillRect(0, hh - 16, w, 16);
    g.fillStyle = '#2f9a3a'; g.fillRect(3, hh - 14, 40, 12);
  }, { repeat: false, aniso: 4 });
  const scr = new THREE.Mesh(new THREE.PlaneGeometry(W * 0.76, H * 0.7), new THREE.MeshStandardMaterial({ map: screenTex, emissiveMap: screenTex, emissive: 0xffffff, emissiveIntensity: 0.45, roughness: 0.25 }));
  scr.position.set(0, y0 + H * 0.53, D * 0.66); grp.add(scr);
  return grp;
}

/** Red-roofed farmhouse, long axis along Z. */
export function farmhouse() {
  const b = new ModelBuilder(), W = 10, D = 14, H = 6;
  b.add('wall', box(W, H, D, 0.2, 2), { p: [0, H / 2, 0] });
  b.add('roof', prism(W + 1.6, 4.6, D + 1.4), { p: [0, H - 0.1, 0] });
  b.add('trim', box(W + 0.4, 0.4, D + 0.4, 0.1, 1), { p: [0, 0.2, 0] });
  b.add('brick', box(1.4, 3.4, 1.4, 0.15, 2), { p: [2.4, H + 3.2, -3.5] });
  for (const z of [-4, 0, 4]) for (const s of [1, -1]) {
    b.add('glass', box(0.12, 1.5, 1.5, 0.04, 1), { p: [s * (W / 2 + 0.02), H * 0.62, z] });
    b.add('trim', box(0.16, 1.8, 1.8, 0.05, 1), { p: [s * (W / 2 - 0.02), H * 0.62, z] });
  }
  b.add('door', box(1.6, 2.8, 0.2, 0.05, 1), { p: [0, 1.4, D / 2 + 0.05] });
  b.add('glass', box(1.4, 1.2, 0.12, 0.04, 1), { p: [-3, H * 0.62, D / 2 + 0.03] });
  b.add('glass', box(1.4, 1.2, 0.12, 0.04, 1), { p: [3, H * 0.62, D / 2 + 0.03] });
  b.add('trim', box(4.2, 0.3, 2.4, 0.1, 1), { p: [0, 3.2, D / 2 + 1.1] });
  return b.build({ wall: plastic(0xfaf6ea, 0.7), roof: paint(0xd23a2e, { rough: 0.55, clear: 0.2 }), trim: plastic(0xffffff, 0.5), brick: plastic(0xa2563f, 0.85), glass: plastic(0x5f8fc0, 0.2, 0.3), door: plastic(0x3d6a3f, 0.6) });
}

/** Red barn with white trim, doors on +Z. */
export function barn() {
  const b = new ModelBuilder(), W = 13, D = 18, H = 7;
  b.add('red', box(W, H, D, 0.2, 2), { p: [0, H / 2, 0] });
  b.add('roof', prism(W + 1.6, 6.2, D + 1.2), { p: [0, H - 0.1, 0] });
  b.add('white', box(W + 0.3, 0.45, D + 0.3, 0.1, 1), { p: [0, H - 0.1, 0] });
  b.add('white', box(W + 0.3, 0.45, D + 0.3, 0.1, 1), { p: [0, 0.22, 0] });
  // big doors with a white cross
  b.add('red', box(6, 5, 0.3, 0.08, 1), { p: [0, 2.5, D / 2 + 0.1] });
  for (const s of [1, -1]) b.add('white', box(0.35, 7.6, 0.2, 0.05, 1), { p: [0, 2.5, D / 2 + 0.28], r: [0, 0, s * Math.atan2(6, 5)] });
  b.add('white', box(6.4, 0.35, 0.2, 0.05, 1), { p: [0, 5.0, D / 2 + 0.3] });
  b.add('white', box(6.4, 0.35, 0.2, 0.05, 1), { p: [0, 0.1, D / 2 + 0.3] });
  for (const s of [1, -1]) b.add('white', box(0.35, 5.2, 0.2, 0.05, 1), { p: [s * 3.1, 2.55, D / 2 + 0.3] });
  b.add('white', box(2.0, 2.0, 0.2, 0.1, 1), { p: [0, H + 1.6, D / 2 + 0.02] });
  b.add('dark', box(1.5, 1.5, 0.22, 0.08, 1), { p: [0, H + 1.6, D / 2 + 0.04] });
  return b.build({ red: paint(0xc7362b, { rough: 0.6, clear: 0.1 }), roof: plastic(0x6e3b33, 0.75), white: plastic(0xffffff, 0.55), dark: MAT.dark });
}

/** A cartoon sheep: a cloud of wool with a black face. Instance it. */
export function sheep(seed = 1) {
  const rng = makeRng(seed), b = new ModelBuilder();
  for (let i = 0; i < 6; i++) b.add('wool', sphere(0.42 + rng() * 0.12, 8, 6), { p: [(rng() - 0.5) * 0.5, 0.95 + rng() * 0.18, -0.55 + i * 0.2] });
  b.add('wool', sphere(0.55, 10, 7), { p: [0, 0.98, 0], s: [1, 0.9, 1.4] });
  b.add('face', sphere(0.26, 8, 6), { p: [0, 1.15, 0.85], s: [0.85, 1, 1.2] });
  for (const s of [1, -1]) b.add('face', sphere(0.1, 6, 5), { p: [s * 0.24, 1.3, 0.75], s: [1.4, 0.6, 0.8] });
  b.add('wool', sphere(0.17, 8, 6), { p: [0, 1.4, 0.75] });
  for (const [x, z] of [[0.25, 0.4], [-0.25, 0.4], [0.25, -0.4], [-0.25, -0.4]]) b.add('face', cyl(0.07, 0.06, 0.65, 6), { p: [x, 0.33, z] });
  return b.build({ wool: plastic(0xfbfbf6, 0.95), face: plastic(0x2a2726, 0.7) });
}

/** White picket fence segment, `len` metres along X. Instance it. */
export function picketFence(len = 6) {
  const b = new ModelBuilder(), bx = (w, h, d) => new THREE.BoxGeometry(w, h, d);
  for (const y of [0.35, 0.85]) b.add('w', bx(len, 0.12, 0.07), { p: [0, y, -0.06] });
  const n = Math.round(len / 0.5);
  for (let i = 0; i < n; i++) {
    const x = -len / 2 + (i + 0.5) * (len / n);
    b.add('w', bx(0.16, 1.0, 0.06), { p: [x, 0.5, 0] });
    b.add('w', bx(0.113, 0.113, 0.06), { p: [x, 1.0, 0], r: [0, 0, Math.PI / 4] });
  }
  for (const x of [-len / 2, len / 2]) b.add('w', box(0.2, 1.25, 0.2, 0.04, 1), { p: [x, 0.62, -0.05] });
  return b.build({ w: plastic(0xffffff, 0.55) });
}

/** Hay bale obstacle: a fat golden cylinder on its side. */
export function hayBale() {
  const b = new ModelBuilder(), R = 1.05, L = 1.9;
  b.add('hay', cyl(R, R, L, 22), { p: [0, R, 0], r: [0, 0, Math.PI / 2] });
  for (const s of [1, -1]) b.add('end', cyl(R * 0.82, R * 0.82, 0.06, 22), { p: [s * (L / 2 + 0.01), R, 0], r: [0, 0, Math.PI / 2] });
  for (const x of [-0.45, 0.45]) b.add('twine', torus(R + 0.02, 0.04, 6, 26), { p: [x, R, 0], r: [0, Math.PI / 2, 0] });
  return b.build({ hay: plastic(0xe8b84a, 0.95), end: plastic(0xd09a32, 0.95), twine: plastic(0xa8782a, 0.9) });
}

let dialogTex = null;
/** Error dialog obstacle: a chunky floating grey window, 3 m wide, hovering 0.4 m up.
    Thin along X so it reads face-on from the road whichever way it patrols. */
export function errorDialog() {
  const grp = new THREE.Group(), b = new ModelBuilder();
  const W = 3.0, H = 2.0, T = 0.34, y0 = 0.4, bar = 0.5;
  b.add('grey', box(T, H, W, 0.1, 2), { p: [0, y0 + H / 2, 0] });
  b.add('blue', box(T + 0.06, bar, W + 0.02, 0.12, 2), { p: [0, y0 + H + bar / 2 - 0.05, 0] });
  // per face (s = +1 is the +X face; its viewer's right is -Z): close button top right,
  // warning triangle on the left, OK button bottom right
  for (const s of [1, -1]) {
    const fx = s * (T / 2 + 0.06), zr = -s;
    b.add('red', box(0.16, 0.36, 0.42, 0.06, 2), { p: [s * (T / 2 + 0.08), y0 + H + bar / 2 - 0.05, zr * (W / 2 - 0.34)] });
    for (const r of [Math.PI / 4, -Math.PI / 4]) b.add('white', box(0.05, 0.26, 0.06, 0.02, 1), { p: [s * (T / 2 + 0.17), y0 + H + bar / 2 - 0.05, zr * (W / 2 - 0.34)], r: [r, 0, 0] });
    b.add('yellow', prism(1.1, 0.95, 0.14), { p: [fx, y0 + 0.55, -zr * 0.82], r: [0, Math.PI / 2, 0] });
    b.add('black', box(0.05, 0.4, 0.12, 0.02, 1), { p: [s * (T / 2 + 0.14), y0 + 0.93, -zr * 0.82] });
    b.add('black', sphere(0.07, 8, 6), { p: [s * (T / 2 + 0.14), y0 + 0.68, -zr * 0.82] });
    b.add('btn', box(0.08, 0.34, 0.8, 0.05, 1), { p: [s * (T / 2 + 0.03), y0 + 0.3, zr * 0.85] });
  }
  grp.add(b.build({ grey: plastic(0xc3c3c3, 0.55), blue: paint(0x1f4fd0, { rough: 0.35, clear: 0.4 }), red: paint(0xe5352b, { rough: 0.35, clear: 0.4 }), white: MAT.white, yellow: paint(0xffd23c, { rough: 0.4 }), black: MAT.black, btn: plastic(0xdedede, 0.5) }));
  dialogTex = dialogTex || canvasTex(256, 128, (g, w, h) => {
    g.fillStyle = '#c3c3c3'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#12142b'; g.font = 'bold 30px "Arial Black", Arial, sans-serif'; g.textAlign = 'left'; g.textBaseline = 'middle';
    g.fillText('NOT', 120, 34); g.fillText('RESPONDING', 92, 70, 160);
  }, { repeat: false, aniso: 4 });
  const mat = new THREE.MeshStandardMaterial({ map: dialogTex, roughness: 0.6 });
  for (const s of [1, -1]) {
    const face = new THREE.Mesh(new THREE.PlaneGeometry(W - 0.2, H - 0.16), mat);
    face.position.set(s * (T / 2 + 0.005), y0 + H / 2, 0); face.rotation.y = s * Math.PI / 2;
    grp.add(face);
  }
  return grp;
}
