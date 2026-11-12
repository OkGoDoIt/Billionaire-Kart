/* WeWork Memorial: props for the dead coworking tower. Desks nobody hot-desks
   at any more, phone booths with no calls to take, a kombucha bar that outlived
   the company, and the one lit sign in the building, face-down in the rubble.
   Built with ModelBuilder; materials are named buckets, baked per material. */
import * as THREE from 'three';
import { ModelBuilder, box, cyl, sphere, torus, tube, paint, plastic, glow, MAT } from './build.js';
import { canvasTex } from '../render/textures.js';

/* A hand-painted sign texture: lines of chunky text on a board. */
function signTex(lines, { bg = '#23252c', fg = '#f4f1e6', w = 1024, h = 256, font = '"Luckiest Guy", "Arial Black", sans-serif' } = {}) {
  return canvasTex(w, h, (g) => {
    g.fillStyle = bg; g.fillRect(0, 0, w, h);
    g.textAlign = 'center'; g.textBaseline = 'middle';
    let size = Math.min(150, (h / lines.length) * 0.92);
    const set = () => { g.font = `${size}px ${font}`; };
    set();
    const widest = Math.max(...lines.map(l => g.measureText(l).width));
    if (widest > w - 40) { size = Math.floor(size * (w - 40) / widest); set(); }
    lines.forEach((l, i) => { g.fillStyle = fg; g.fillText(l, w / 2, (i + 0.5) * (h / lines.length)); });
  }, { repeat: false });
}

/* Neon tubing text: bright core, coloured halo, transparent elsewhere. */
function neonTex(text, color = '#ff5f9e') {
  return canvasTex(1024, 256, (g, w, h) => {
    g.clearRect(0, 0, w, h);
    g.textAlign = 'center'; g.textBaseline = 'middle';
    let size = 190; g.font = `${size}px "Luckiest Guy", "Arial Black", sans-serif`;
    const tw = g.measureText(text).width;
    if (tw > w - 60) { size = Math.floor(size * (w - 60) / tw); g.font = `${size}px "Luckiest Guy", "Arial Black", sans-serif`; }
    g.shadowColor = color; g.shadowBlur = 42; g.strokeStyle = color; g.lineWidth = 7;
    for (let i = 0; i < 3; i++) g.strokeText(text, w / 2, h / 2 + 4);
    g.shadowBlur = 10; g.strokeStyle = '#fff0f6'; g.lineWidth = 2.6;
    g.strokeText(text, w / 2, h / 2 + 4);
    void 0;
  }, { repeat: false });
}

const concrete = () => plastic(0xb9b2a2, 0.85);
const concreteDark = () => plastic(0x8d8676, 0.9);
const laminate = () => plastic(0xe9e6dd, 0.55);
const brandPink = () => paint(0xb03a5b, { rough: 0.5 });
const mustard = () => paint(0xd9a441, { rough: 0.55 });

/** One office chair. Tipped ones have already given up. */
export function officeChair({ color = 0x3d6e8f, tipped = false } = {}) {
  const b = new ModelBuilder();
  b.add('seat', box(0.52, 0.07, 0.5, 0.03, 1), { p: [0, 0.46, 0] });
  b.add('seat', box(0.5, 0.55, 0.07, 0.03, 1), { p: [0, 0.78, -0.24], r: [0.1, 0, 0] });
  b.add('post', cyl(0.035, 0.035, 0.34, 8), { p: [0, 0.26, 0] });
  b.add('base', cyl(0.3, 0.34, 0.05, 12), { p: [0, 0.03, 0] });
  const g = b.build({ seat: paint(color, { rough: 0.6 }), post: MAT.steel, base: MAT.dark });
  if (tipped) { g.rotation.z = 1.92; g.rotation.y = 0.7; g.position.y = 0.3; }
  return g;
}

/** A bench desk row: slab, dead monitors, task lamps. Chairs placed separately. */
export function deskRow({ len = 13, accent = 0x3d6e8f } = {}) {
  const b = new ModelBuilder();
  b.add('top', box(len, 0.09, 1.15, 0.03, 1), { p: [0, 0.74, 0] });
  for (const s of [-1, 1]) {
    b.add('leg', box(0.09, 0.72, 1.0, 0.02, 1), { p: [s * (len / 2 - 0.5), 0.37, 0] });
    b.add('modesty', box(len * 0.7, 0.4, 0.05, 0.02, 1), { p: [0, 0.5, s * 0.42] });
  }
  const n = Math.max(3, Math.round(len / 2.6));
  for (let i = 0; i < n; i++) {
    const x = -len / 2 + 1.3 + (i * (len - 2.6)) / Math.max(1, n - 1), side = i % 2 ? 1 : -1;
    b.add('stand', cyl(0.03, 0.05, 0.3, 6), { p: [x, 0.93, side * 0.18] });
    // one screen in five still glows, waiting for a standup that never comes
    b.add(i % 5 === 2 ? 'lit' : 'screen', box(0.98, 0.58, 0.045, 0.02, 1), { p: [x, 1.24, side * 0.18], r: [0, side > 0 ? 0 : Math.PI, -0.05] });
    b.add('kb', box(0.44, 0.03, 0.16, 0.01, 1), { p: [x, 0.8, side * 0.42] });
    if (i % 3 === 0) b.add('mug', cyl(0.05, 0.04, 0.11, 8), { p: [x + 0.55, 0.84, -side * 0.3] });
    if (i % 4 === 1) b.add('paper', box(0.3, 0.015, 0.42, 0.005, 1), { p: [x - 0.5, 0.8, side * 0.1], r: [0, i * 1.3, 0] });
  }
  b.add('cable', tube([[-len / 2 + 0.4, 0.7, 0], [-len / 4, 0.25, 0.3], [0, 0.62, -0.2], [len / 4, 0.18, 0.25], [len / 2 - 0.4, 0.66, 0]], 0.022, 32, 6), {});
  return b.build({
    top: laminate(), leg: MAT.dark, modesty: plastic(0xcfd4da, 0.6),
    stand: MAT.dark, screen: plastic(0x14161c, 0.35), lit: glow(0x7fb2ff, 0.55),
    kb: plastic(0x2a2d33, 0.6), mug: paint(accent, { rough: 0.5 }), paper: plastic(0xf2efe4, 0.8), cable: MAT.rubber,
  });
}

/** The iconic booth: soundproof, spotless, and permanently unbooked. */
export function phoneBooth({ accent = 0xb03a5b } = {}) {
  const b = new ModelBuilder();
  b.add('floor', box(1.35, 0.08, 1.35, 0.02, 1), { p: [0, 0.04, 0] });
  b.add('wall', box(1.35, 2.5, 0.09, 0.03, 1), { p: [0, 1.29, -0.63] });
  b.add('wall', box(0.09, 2.5, 1.35, 0.03, 1), { p: [-0.63, 1.29, 0] });
  b.add('wall', box(0.09, 2.5, 0.6, 0.03, 1), { p: [0.63, 1.29, -0.37] });
  b.add('door', box(0.07, 2.3, 0.62, 0.02, 1), { p: [0.86, 1.19, 0.3], r: [0, -0.65, 0] });   // left ajar
  b.add('roof', box(1.5, 0.1, 1.5, 0.03, 1), { p: [0, 2.58, 0] });
  b.add('trim', box(1.52, 0.14, 1.52, 0.02, 1), { p: [0, 2.42, 0] });
  b.add('light', box(0.7, 0.04, 0.18, 0.01, 1), { p: [0, 2.5, 0] });
  b.add('shelf', box(0.5, 0.05, 0.3, 0.01, 1), { p: [-0.38, 0.95, -0.45] });
  b.add('stool', cyl(0.19, 0.19, 0.06, 12), { p: [0.1, 0.55, -0.3] });
  b.add('stool', cyl(0.03, 0.03, 0.52, 6), { p: [0.1, 0.28, -0.3] });
  return b.build({ floor: MAT.dark, wall: plastic(0xdcd8cc, 0.6), door: plastic(0xcac4b2, 0.55), roof: MAT.dark, trim: paint(accent, { rough: 0.5 }), light: glow(0xffe2b0, 0.8), shelf: laminate(), stool: paint(accent, { rough: 0.55 }) });
}

/** Kombucha on tap: the bar outlived the business model. */
export function kombuchaBar() {
  const b = new ModelBuilder();
  b.add('body', box(3.6, 1.02, 0.95, 0.05, 2), { p: [0, 0.51, 0] });
  b.add('top', box(3.85, 0.08, 1.1, 0.03, 1), { p: [0, 1.06, 0] });
  b.add('foot', box(3.7, 0.1, 1.0, 0.02, 1), { p: [0, 0.05, 0] });
  b.add('tower', cyl(0.09, 0.11, 0.62, 10), { p: [0, 1.4, -0.18] });
  b.add('tower', box(0.85, 0.09, 0.09, 0.02, 1), { p: [0, 1.68, -0.18] });
  for (const dx of [-0.32, 0, 0.32]) {
    b.add('tap', cyl(0.025, 0.025, 0.22, 6), { p: [dx, 1.56, -0.08], r: [0.7, 0, 0] });
    b.add('tap', box(0.05, 0.17, 0.05, 0.01, 1), { p: [dx, 1.76, -0.18] });
  }
  b.add('drip', box(0.9, 0.03, 0.24, 0.01, 1), { p: [0, 1.11, -0.02] });
  for (const dx of [-1.35, 1.35]) b.add('glass', cyl(0.05, 0.04, 0.15, 8), { p: [dx, 0.87, 0.28] });
  const g = b.build({ body: plastic(0x7a4a2e, 0.7), top: laminate(), foot: MAT.dark, tower: MAT.chrome, tap: MAT.dark, drip: MAT.steel, glass: plastic(0xcfe8dd, 0.25) });
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(2.9, 0.72),
    new THREE.MeshStandardMaterial({ map: signTex(['KOMBUCHA', 'ON TAP'], { bg: '#2e2118', fg: '#ffd9a0' }), roughness: 0.8 }));
  sign.position.set(0, 2.25, 0.1); sign.castShadow = false;
  const posts = new ModelBuilder();
  posts.add('post', cyl(0.035, 0.035, 1.1, 6), { p: [-1.3, 1.65, 0.1] });
  posts.add('post', cyl(0.035, 0.035, 1.1, 6), { p: [1.3, 1.65, 0.1] });
  g.add(posts.build({ post: MAT.dark }), sign);
  return g;
}

/** A kombucha keg, for the obstacle list: it rolled here from the bar. */
export function kombuchaKeg() {
  const b = new ModelBuilder();
  b.add('body', cyl(0.44, 0.44, 1.05, 16), { p: [0, 0.53, 0] });
  b.add('band', torus(0.45, 0.045, 6, 20), { p: [0, 0.55, 0], r: [Math.PI / 2, 0, 0] });
  b.add('band', torus(0.45, 0.045, 6, 20), { p: [0, 0.95, 0], r: [Math.PI / 2, 0, 0] });
  b.add('top', cyl(0.2, 0.3, 0.12, 12), { p: [0, 1.1, 0] });
  return b.build({ body: MAT.steel, band: brandPink(), top: MAT.dark });
}

/**
 * The fallen HUSTLE neon. Built already toppled: leaning back into a rubble
 * base, one end sunk. userData.mat is the neon material (for the flicker),
 * userData.face is the sign's facing direction in local space (+z).
 */
export function hustleNeon() {
  const b = new ModelBuilder();
  // rubble base it fell into
  b.add('chunk', box(2.2, 0.8, 1.4, 0.08, 1), { p: [-1.9, 0.3, -0.5], r: [0.2, 0.4, 0.15] });
  b.add('chunk', box(1.6, 0.6, 1.1, 0.08, 1), { p: [2.1, 0.2, -0.7], r: [-0.15, -0.3, 0.3] });
  b.add('chunk', box(1.1, 0.5, 0.9, 0.08, 1), { p: [0.3, 0.18, -1.0], r: [0.4, 0.1, -0.2] });
  // the sign itself, pitched back about 62 degrees
  const tilt = -1.08, cy = Math.cos(tilt), sy = Math.sin(tilt);
  const onSign = (x, y, z) => [x, 1.15 + y * cy - z * sy, -0.1 + y * sy + z * cy];
  b.add('back', box(6.4, 1.7, 0.14, 0.05, 1), { p: onSign(0, 0, -0.1), r: [tilt, 0, 0] });
  b.add('cable', tube([[2.8, 1.0, 0.6], [3.6, 0.25, 1.4], [4.6, 0.06, 0.9], [5.6, 0.05, 1.7]], 0.035, 20, 6), {});
  const g = b.build({ chunk: concreteDark(), back: plastic(0x1d1f26, 0.6), cable: MAT.rubber });
  const mat = new THREE.MeshStandardMaterial({
    map: neonTex('HUSTLE', '#ff5f9e'), transparent: true, emissive: 0xffffff, emissiveMap: null,
    emissiveIntensity: 1.6, roughness: 0.4, depthWrite: false,
  });
  mat.emissiveMap = mat.map;
  const face = new THREE.Mesh(new THREE.PlaneGeometry(6.1, 1.52), mat);
  const fp = onSign(0, 0, 0.02); face.position.set(fp[0], fp[1], fp[2]); face.rotation.x = tilt;
  g.add(face);
  g.userData.mat = mat;
  return g;
}

/** The Spiral Staircase to Nowhere: the building's own vertical joke. */
export function spiralStaircase({ h = 13.5 } = {}) {
  const b = new ModelBuilder();
  b.add('core', cyl(0.55, 0.7, h, 14), { p: [0, h / 2, 0] });
  b.add('foot', cyl(2.9, 3.3, 0.35, 20), { p: [0, 0.17, 0] });
  const steps = Math.floor(h / 0.46), railPts = [];
  for (let i = 0; i <= steps; i++) {
    const a = i * 0.42, y = 0.55 + i * 0.46;
    const x = Math.cos(a) * 1.62, z = Math.sin(a) * 1.62;
    b.add('step', box(2.1, 0.16, 0.95, 0.04, 1), { p: [x, y, z], r: [0, -a, 0] });
    if (i % 2 === 0) railPts.push([Math.cos(a) * 2.62, y + 1.0, Math.sin(a) * 2.62]);
  }
  const topA = steps * 0.42;
  b.add('landing', box(3.6, 0.22, 2.3, 0.05, 1), { p: [Math.cos(topA) * 3.4, 0.55 + steps * 0.46 + 0.08, Math.sin(topA) * 3.4], r: [0, -topA, 0] });
  b.add('rail', tube(railPts, 0.045, 120, 6), {});
  // a ribbon across the landing: OPENING SOON, eternally
  b.add('ribbon', box(1.9, 0.3, 0.03, 0.01, 1), { p: [Math.cos(topA) * 4.9, 0.55 + steps * 0.46 + 0.75, Math.sin(topA) * 4.9], r: [0, -topA + Math.PI / 2, 0] });
  return b.build({ core: MAT.steel, foot: concrete(), step: laminate(), landing: concrete(), rail: brandPink(), ribbon: mustard() });
}

/** The bankruptcy-court annex: small, marble, and very final. */
export function annexBlock() {
  const b = new ModelBuilder();
  b.add('step', box(13, 0.35, 9.5, 0.04, 1), { p: [0, 0.17, 0] });
  b.add('step', box(11.6, 0.35, 8.4, 0.04, 1), { p: [0, 0.5, 0] });
  b.add('hall', box(10.5, 4.6, 7.2, 0.06, 2), { p: [0, 3.0, -0.7] });
  for (let i = 0; i < 4; i++) b.add('col', cyl(0.34, 0.4, 4.4, 12), { p: [-3.9 + i * 2.6, 2.85, 3.1] });
  b.add('entab', box(11.6, 0.8, 1.6, 0.04, 1), { p: [0, 5.25, 3.1] });
  b.add('attic', box(7.5, 1.1, 1.2, 0.04, 1), { p: [0, 5.9, 3.1] });
  b.add('roof', box(11.2, 0.3, 8.2, 0.04, 1), { p: [0, 5.45, -0.7] });
  b.add('door', box(1.7, 3.1, 0.12, 0.02, 1), { p: [0, 2.2, 2.95] });
  b.add('notice', box(0.8, 1.1, 0.04, 0.01, 1), { p: [1.6, 2.3, 3.02] });   // the notice on the door
  const g = b.build({ step: concrete(), hall: plastic(0xcfc9ba, 0.8), col: concrete(), entab: concrete(), attic: concrete(), roof: concreteDark(), door: MAT.dark, notice: plastic(0xf5efdc, 0.7) });
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(6.8, 0.95),
    new THREE.MeshStandardMaterial({ map: signTex(['CHAPTER 11'], { bg: '#b9b2a2', fg: '#3a372e' }), roughness: 0.85 }));
  sign.position.set(0, 5.9, 3.72); g.add(sign);
  return g;
}

/** The ruined HQ hall: four columns, two beams, one surrender. Stands open. */
export function hallFrame({ sign = 'HEADQUARTERS' } = {}) {
  const b = new ModelBuilder();
  const H = 12;
  for (const [x, z] of [[-7, -4.5], [7, -4.5], [-7, 4.5]]) b.add('col', cyl(0.5, 0.62, H, 12), { p: [x, H / 2, z] });
  b.add('col', cyl(0.52, 0.64, 6.5, 12), { p: [7, 3.25, 4.5], r: [0, 0, 0.05] });       // the fourth corner is a broken stub
  b.add('chunk', box(1.3, 0.9, 1.1, 0.08, 1), { p: [7.4, 6.9, 4.3], r: [0.4, 0.3, 0.2] }); // its top, lying where it fell
  b.add('beam', box(16.5, 0.9, 1.1, 0.05, 1), { p: [0, H + 0.4, -4.5] });
  b.add('beam', box(16.5, 0.9, 1.1, 0.05, 1), { p: [0.4, H - 0.6, 4.5], r: [0, 0, 0.16] }); // sagging
  b.add('beam', box(1.1, 0.9, 10.5, 0.05, 1), { p: [-7, H + 0.4, 0] });
  b.add('fallen', cyl(0.5, 0.62, 10.5, 12), { p: [11.5, 0.55, 7.5], r: [Math.PI / 2, 0, 0.5] }); // toppled column
  b.add('chunk', box(2.4, 1.1, 1.6, 0.08, 1), { p: [-3, 0.5, 1], r: [0.3, 0.7, 0.1] });
  b.add('chunk', box(1.7, 0.8, 1.2, 0.08, 1), { p: [4, 0.35, -1.5], r: [-0.2, 0.2, 0.4] });
  const g = b.build({ col: concrete(), beam: concrete(), fallen: concreteDark(), chunk: concreteDark() });
  // the name of the place, hung under both beams in letters over a metre tall,
  // finished on both faces so it reads from the ramp and from the infield
  const tex = signTex([sign], { w: 1024, h: 164, bg: '#2f2b33', fg: '#f3ead2' });
  const mat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.85, metalness: 0 });
  for (const [y, z] of [[10.4, 4.7], [11.3, -4.7]]) for (const flip of [0, Math.PI]) {
    const p = new THREE.Mesh(new THREE.PlaneGeometry(15, 2.4), mat);
    p.position.set(0.2, y, z + (flip ? -0.06 : 0.06) * Math.sign(z));
    p.rotation.y = (z > 0 ? 0 : Math.PI) + flip;
    p.castShadow = false; p.receiveShadow = true; g.add(p);
  }
  return g;
}

/** A pile of the building, in pieces. */
export function rubblePile(seed = 1) {
  const b = new ModelBuilder();
  const rnd = (i, m) => { const v = Math.sin(seed * 127.1 + i * 311.7) * 43758.5453; return (v - Math.floor(v)) * m; };
  for (let i = 0; i < 7; i++) {
    const s = 0.7 + rnd(i, 1.1);
    b.add('chunk', box(1.3 * s, 0.55 * s, 0.95 * s, 0.07, 1),
      { p: [(rnd(i + 9, 2.4) - 1.2), 0.22 * s, (rnd(i + 20, 2.0) - 1.0)], r: [rnd(i + 30, 0.7) - 0.35, rnd(i + 40, 3), rnd(i + 50, 0.7) - 0.35] });
  }
  b.add('slab', box(2.6, 0.22, 1.7, 0.04, 1), { p: [0.3, 0.62, 0.2], r: [0.12, 0.5, 0.08] });
  return b.build({ chunk: concreteDark(), slab: concrete() });
}

/** A water cooler, still half full. Priorities. */
export function waterCooler() {
  const b = new ModelBuilder();
  b.add('body', box(0.42, 0.95, 0.42, 0.05, 2), { p: [0, 0.48, 0] });
  b.add('bottle', cyl(0.16, 0.19, 0.52, 12), { p: [0, 1.22, 0] });
  b.add('neck', cyl(0.05, 0.09, 0.14, 8), { p: [0, 1.55, 0] });
  b.add('tap', box(0.07, 0.09, 0.07, 0.01, 1), { p: [-0.1, 0.78, 0.22] });
  b.add('tap2', box(0.07, 0.09, 0.07, 0.01, 1), { p: [0.1, 0.78, 0.22] });
  return b.build({ body: plastic(0xe8e8e4, 0.5), bottle: plastic(0x9fd4e8, 0.2), neck: plastic(0x9fd4e8, 0.2), tap: paint(0x2f6bff, { rough: 0.4 }), tap2: paint(0xe23b3b, { rough: 0.4 }) });
}

/** A lobby plant in its final form: sticks. */
export function deadPlant() {
  const b = new ModelBuilder();
  b.add('pot', cyl(0.3, 0.22, 0.55, 12), { p: [0, 0.28, 0] });
  b.add('soil', cyl(0.27, 0.27, 0.05, 12), { p: [0, 0.55, 0] });
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    b.add('stick', cyl(0.016, 0.026, 0.9 + (i % 3) * 0.22, 5), { p: [Math.cos(a) * 0.09, 0.95, Math.sin(a) * 0.09], r: [Math.sin(a) * 0.28, 0, Math.cos(a) * 0.28] });
    b.add('leaf', box(0.2, 0.02, 0.11, 0.01, 1), { p: [Math.cos(a) * 0.24, 1.28 + (i % 3) * 0.2, Math.sin(a) * 0.24], r: [0.7, a, 0] });
  }
  return b.build({ pot: paint(0x9a5a3a, { rough: 0.7 }), soil: plastic(0x3a2c1e, 0.95), stick: plastic(0x6e5636, 0.9), leaf: plastic(0x5c6633, 0.9) });
}

/** A standing sign board for short brutal messages. Text drawn by canvasTex. */
export function noticeBoard(lines, { w = 4.6, h = 1.6, bg = '#f0ead6', fg = '#33302a' } = {}) {
  const b = new ModelBuilder();
  b.add('leg', box(0.09, 1.1, 0.09, 0.02, 1), { p: [-w / 2 + 0.3, 0.55, 0] });
  b.add('leg', box(0.09, 1.1, 0.09, 0.02, 1), { p: [w / 2 - 0.3, 0.55, 0] });
  b.add('back', box(w, h, 0.07, 0.03, 1), { p: [0, 1.1 + h / 2, 0] });
  const g = b.build({ leg: MAT.dark, back: plastic(0xd8d2c0, 0.7) });
  const face = new THREE.Mesh(new THREE.PlaneGeometry(w - 0.25, h - 0.25),
    new THREE.MeshStandardMaterial({ map: signTex(lines, { bg, fg, w: 1024, h: Math.round(1024 * (h - 0.25) / (w - 0.25)) }), roughness: 0.85 }));
  face.position.set(0, 1.1 + h / 2, 0.045); g.add(face);
  return g;
}
