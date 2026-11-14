/* Props for Bliss Hills: wind turbines, the paperclip arch, oversized beige
   1990s computers, a farm, sheep, picket fences, hay bales, and the error-dialog
   obstacle. Each builder returns a THREE.Group on y = 0, facing +Z. Textures are
   only created inside the functions, so this module imports cleanly in Node. */
import * as THREE from 'three';
import { ModelBuilder, box, sphere, cyl, torus, tube, lathe, plastic, paint, glow, MAT } from './build.js';
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

/* What the dialogs say, one per dialog in turn. */
const DIALOGS = [
  { title: 'KART.EXE', lines: ['KART.EXE HAS', 'STOPPED RESPONDING'], buttons: ['CLOSE'] },
  { title: 'CONFIRM', lines: ['ARE YOU SURE?'], buttons: ['YES', 'YES'] },
  { title: 'WARNING', lines: ['YOU ARE ABOUT', 'TO LOSE. OK?'], buttons: ['OK'] },
];
const dialogTexs = []; let dialogN = 0;
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
    const zr = -s;
    b.add('red', box(0.16, 0.36, 0.42, 0.06, 2), { p: [s * (T / 2 + 0.08), y0 + H + bar / 2 - 0.05, zr * (W / 2 - 0.34)] });
    for (const r of [Math.PI / 4, -Math.PI / 4]) b.add('white', box(0.05, 0.26, 0.06, 0.02, 1), { p: [s * (T / 2 + 0.17), y0 + H + bar / 2 - 0.05, zr * (W / 2 - 0.34)], r: [r, 0, 0] });
  }
  grp.add(b.build({ grey: plastic(0xc3c3c3, 0.55), blue: paint(0x1f4fd0, { rough: 0.35, clear: 0.4 }), red: paint(0xe5352b, { rough: 0.35, clear: 0.4 }), white: MAT.white, yellow: paint(0xffd23c, { rough: 0.4 }), black: MAT.black, btn: plastic(0xdedede, 0.5) }));
  const which = dialogN++ % DIALOGS.length, D = DIALOGS[which];
  const dialogTex = dialogTexs[which] || (dialogTexs[which] = canvasTex(512, 320, (g, w, h) => {
    g.fillStyle = '#ece9d8'; g.fillRect(0, 0, w, h);
    const bar = g.createLinearGradient(0, 0, 0, 56); bar.addColorStop(0, '#3a8cff'); bar.addColorStop(1, '#0a4fd6'); g.fillStyle = bar; g.fillRect(0, 0, w, 56);
    g.fillStyle = '#ffffff'; g.font = 'bold 34px "Arial Black", Arial, sans-serif'; g.textAlign = 'left'; g.textBaseline = 'middle'; g.fillText(D.title, 18, 30);
    g.fillStyle = '#e5352b'; g.fillRect(w - 52, 8, 42, 40); g.strokeStyle = '#ffffff'; g.lineWidth = 6; g.beginPath(); g.moveTo(w - 42, 18); g.lineTo(w - 20, 38); g.moveTo(w - 20, 18); g.lineTo(w - 42, 38); g.stroke();
    g.fillStyle = '#12142b'; g.textAlign = 'center';
    const n = D.lines.length; D.lines.forEach((l, k) => { let s = 50; g.font = `${s}px "Arial Black", Arial, sans-serif`; while (g.measureText(l).width > w - 40 && s > 16) { s -= 2; g.font = `${s}px "Arial Black", Arial, sans-serif`; } g.fillText(l, w / 2, 140 + (k - (n - 1) / 2) * 56); });
    const bw = 170, gap = 30, x0 = w / 2 - (D.buttons.length * bw + (D.buttons.length - 1) * gap) / 2;
    D.buttons.forEach((t, k) => { const x = x0 + k * (bw + gap); g.fillStyle = '#ffffff'; g.fillRect(x, 230, bw, 64); g.strokeStyle = '#12142b'; g.lineWidth = 4; g.strokeRect(x, 230, bw, 64); g.fillStyle = '#12142b'; g.font = 'bold 36px "Arial Black", Arial, sans-serif'; g.fillText(t, x + bw / 2, 263); });
  }, { repeat: false, aniso: 4 }));
  const mat = new THREE.MeshStandardMaterial({ map: dialogTex, emissiveMap: dialogTex, emissive: 0xffffff, emissiveIntensity: 0.15, roughness: 0.6 });
  for (const s of [1, -1]) {
    const face = new THREE.Mesh(new THREE.PlaneGeometry(W - 0.2, H - 0.16), mat);
    face.position.set(s * (T / 2 + 0.005), y0 + H / 2, 0); face.rotation.y = s * Math.PI / 2;
    grp.add(face);
  }
  return grp;
}

/* ---------- the joke pass: Clippy, the recycle bin, the modem, mines, cards ---------- */
/** The paperclip assistant, H metres tall, facing +Z. userData.brows bob; userData.body sways. */
export function clippy({ H = 34 } = {}) {
  const grp = new THREE.Group(), body = new THREE.Group(), b = new ModelBuilder(), k = H / 34, pts = [];
  const line = (x0, y0, x1, y1, n = 8) => { for (let i = 0; i < n; i++) { const t = i / n; pts.push([(x0 + (x1 - x0) * t) * k, (y0 + (y1 - y0) * t) * k, 0]); } };
  const arc = (cx, cy, r, a0, a1, n = 16) => { for (let i = 0; i < n; i++) { const a = a0 + (a1 - a0) * (i / n); pts.push([(cx + Math.cos(a) * r) * k, (cy + Math.sin(a) * r) * k, 0]); } };
  // inner end, inner U, up the right, big top bend, down the left, outer U, up to the outer end
  line(-2.2, 21, -2.2, 7.5); arc(0, 7.5, 2.2, Math.PI, Math.PI * 2); line(2.2, 7.5, 2.2, 28.5); arc(-1.9, 28.5, 4.1, 0, Math.PI, 20);
  line(-6, 28.5, -6, 6); arc(-1, 6, 5, Math.PI, Math.PI * 2, 20); line(4, 6, 4, 25, 6); pts.push([4 * k, 25 * k, 0]);
  b.add('wire', tube(pts, 0.75 * k, pts.length * 3, 12));
  for (const p of [pts[0], pts[pts.length - 1]]) b.add('wire', sphere(0.75 * k, 12, 8), { p });
  // eyes on the upper part, looking out
  for (const x of [-2.6, 1.6]) { b.add('eye', sphere(2.0 * k, 20, 14), { p: [x * k, 24 * k, 1.2 * k], s: [1, 1.15, 0.6] }); b.add('pupil', sphere(0.9 * k, 14, 10), { p: [(x + 0.35) * k, 23.6 * k, 2.3 * k], s: [1, 1, 0.5] }); }
  body.add(b.build({ wire: plastic(0xdfe5ee, 0.16, 1), eye: plastic(0xffffff, 0.3), pupil: MAT.black }));
  const brows = new THREE.Group(), bb = new ModelBuilder();
  for (const [x, r] of [[-2.6, 0.25], [1.6, -0.25]]) bb.add('brow', box(3.4 * k, 0.6 * k, 0.6 * k, 0.25 * k, 2), { p: [x * k, 27 * k, 1.6 * k], r: [0, 0, r] });
  brows.add(bb.build({ brow: MAT.black })); body.add(brows);
  grp.add(body);
  // the sheet of lined paper he lives on
  const paper = new ModelBuilder();
  paper.add('paper', box(20 * k, 0.4, 26 * k, 0.1, 1), { p: [0, 0.2, 0] });
  for (let i = 0; i < 9; i++) paper.add('rule', new THREE.BoxGeometry(18 * k, 0.05, 0.25), { p: [0, 0.42, (-10 + i * 2.5) * k] });
  paper.add('margin', new THREE.BoxGeometry(0.3, 0.06, 25 * k), { p: [-6.5 * k, 0.43, 0] });
  grp.add(paper.build({ paper: plastic(0xfffbe0, 0.8), rule: plastic(0x7fb2ff, 0.7), margin: plastic(0xff6b6b, 0.7) }));
  body.position.y = 0.4;
  grp.userData.brows = brows; grp.userData.body = body;
  return grp;
}

/** The recycle bin: a ribbed bin R wide, H tall, stuffed with dead products (their labels are atlas signs). */
export function recycleBin({ R = 7, H = 14 } = {}) {
  const b = new ModelBuilder();
  b.add('bin', lathe([[R * 0.82, 0], [R, H], [R * 1.06, H], [R * 1.06, H + 0.6], [R * 0.95, H + 0.6], [R * 0.78, 0.5], [0, 0.5]], 32));
  for (let i = 0; i < 16; i++) { const a = (i / 16) * Math.PI * 2, rr = R * 0.92; b.add('rib', new THREE.BoxGeometry(0.5, H * 0.92, 0.5), { p: [Math.cos(a) * rr, H * 0.5, Math.sin(a) * rr], r: [0, -a, Math.atan2(R * 0.18, H) * 0], s: 1 }); }
  // the junk heaped inside
  const rng = makeRng(7), junk = ['j0', 'j1', 'j2', 'j3'];
  for (let i = 0; i < 14; i++) { const a = rng() * 6.28, d = rng() * R * 0.7; b.add(junk[i % 4], box(2 + rng() * 2.5, 1.5 + rng() * 2, 2 + rng() * 2, 0.2, 1), { p: [Math.cos(a) * d, H - 1 + rng() * 2.5, Math.sin(a) * d], r: [rng() - 0.5, rng() * 3, rng() - 0.5] }); }
  return b.build({ bin: plastic(0xbfd3e6, 0.35, 0.2), rib: plastic(0x8fa9c4, 0.4, 0.2), j0: plastic(0x2a2d36, 0.5), j1: plastic(0x7a8a3a, 0.6), j2: plastic(0x2f6bff, 0.5), j3: plastic(0xe6dcc0, 0.6) });
}

/** A beige external modem the size of a house, front (with its LEDs) on +Z. userData.leds: lit LED meshes. */
export function modem({ W = 24, D = 14, Hh = 5 } = {}) {
  const grp = new THREE.Group(), b = new ModelBuilder();
  b.add('beige', box(W, Hh, D, 1.2, 3), { p: [0, Hh / 2 + 0.8, 0] });
  b.add('beigeD', box(W * 0.94, 0.5, D * 0.94, 0.2, 1), { p: [0, 0.5, 0] });
  for (let i = 0; i < 7; i++) b.add('beigeD', new THREE.BoxGeometry(W * 0.7, 0.25, 0.3), { p: [0, Hh + 0.85, -D * 0.3 + i * 0.9] });
  b.add('dark', box(W * 0.8, 1.2, 0.3, 0.2, 1), { p: [0, Hh * 0.55 + 0.8, D / 2 + 0.05] });
  grp.add(b.build({ beige: plastic(BEIGE, 0.6), beigeD: plastic(BEIGE_D, 0.65), dark: MAT.dark }));
  const leds = [];
  for (let i = 0; i < 8; i++) { const m = new THREE.Mesh(new THREE.SphereGeometry(0.42, 10, 8), glow(i % 3 ? 0x37ff6a : 0xff3b30, 2.2)); m.position.set((i - 3.5) * W * 0.095, Hh * 0.55 + 0.8, D / 2 + 0.3); grp.add(m); leds.push(m); }
  grp.userData.leds = leds;
  return grp;
}

/** A Minesweeper mine (stands in for the hay bales on the meadow; same footprint). */
export function mine() {
  const b = new ModelBuilder(), R = 0.95, y = 1.05;
  b.add('mine', sphere(R, 18, 14), { p: [0, y, 0] });
  for (const [x, yy, z] of [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1], [0.7, 0.7, 0], [-0.7, 0.7, 0], [0, 0.7, 0.7], [0, 0.7, -0.7]]) {
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(x, yy, z).normalize()), e = new THREE.Euler().setFromQuaternion(q);
    b.add('mine', cyl(0.07, 0.16, 0.7, 8), { p: [x / Math.hypot(x, yy, z) * (R + 0.2), y + yy / Math.hypot(x, yy, z) * (R + 0.2), z / Math.hypot(x, yy, z) * (R + 0.2)], r: [e.x, e.y, e.z] });
  }
  b.add('shine', box(0.36, 0.36, 0.1, 0.04, 1), { p: [-0.32, y + 0.36, R * 0.82], r: [-0.4, -0.3, 0] });
  b.add('flagpole', cyl(0.05, 0.05, 2.4, 6), { p: [0.2, y + 1.6, -0.2] });
  b.add('flag', prism(0.9, 0.7, 0.06), { p: [0.55, y + 2.4, -0.2], r: [0, 0, -Math.PI / 2] });
  return b.build({ mine: plastic(0x16171c, 0.45, 0.3), shine: plastic(0xffffff, 0.4), flagpole: MAT.dark, flag: paint(0xe5352b, { rough: 0.4 }) });
}

/** An amber desktop wait cursor over the paperclip. Open glass leaves the falling sand visible. */
export function waitCursor() {
  const b = new ModelBuilder();
  for (const s of [-1, 1]) {
    b.add('case', box(10.8, 1.35, 6.2, 0.55, 2), { p: [0, s * 7.3, 0] });
    b.add('edge', box(9.8, 0.4, 5.5, 0.15, 1), { p: [0, s * 6.6, 0] });
    for (const z of [-1.9, 1.9]) {
      b.add('edge', tube([[s * 4.1, 6.4, z], [s * 3.4, 3.6, z], [s * 0.45, 0, z * 0.3], [s * 3.4, -3.6, z], [s * 4.1, -6.4, z]], 0.28, 24, 8));
    }
  }
  b.add('sand', cyl(3.6, 0.16, 5.2, 20), { p: [0, 3.2, 0], s: [1, 1, 0.65] });
  b.add('sand', cyl(0.18, 3.9, 3.4, 20), { p: [0, -4.9, 0], s: [1, 1, 0.65] });
  b.add('sand', cyl(0.14, 0.14, 4, 8), { p: [0, -1.4, 0] });
  return b.build({ case: plastic(0x142952), edge: plastic(0x91e4ff), sand: glow(0xffb526, 0.32) });
}

/** The suspended, right-angled paths of a pipes screensaver. Elbows and flanges match the tube diameter. */
export function screensaverPipe(points, color) {
  const b = new ModelBuilder();
  const up = new THREE.Vector3(0, 1, 0), delta = new THREE.Vector3();
  const q = new THREE.Quaternion(), e = new THREE.Euler();
  for (const [i, a] of points.entries()) {
    b.add('pipe', sphere(0.96, 12, 8), { p: a });
    if (!i) continue;
    const prev = points[i - 1];
    delta.set(a[0] - prev[0], a[1] - prev[1], a[2] - prev[2]);
    const len = delta.length();
    e.setFromQuaternion(q.setFromUnitVectors(up, delta.normalize()));
    const rotation = [e.x, e.y, e.z];
    b.add('pipe', cyl(0.9, 0.9, len, 12), { p: a.map((v, k) => (v + prev[k]) / 2), r: rotation });
    for (const end of [-1, 1]) {
      const u = 0.5 + end * (0.5 - Math.min(0.17, 1.2 / len));
      b.add('cuff', cyl(1.08, 1.08, 0.4, 12), { p: a.map((v, k) => prev[k] + (v - prev[k]) * u), r: rotation });
    }
  }
  return b.build({ pipe: plastic(color, 0.24, 0.44), cuff: plastic(0xc6d9ea, 0.3, 0.6) });
}
