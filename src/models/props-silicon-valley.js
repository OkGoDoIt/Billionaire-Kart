/* Props for Silicon Valley Circuit: the PIVOT TO AI tower, robotaxis, rental
   scooters, a container "micro-loft" block, the deflating unicorn, and the sign
   kit (a canvas atlas, a static-geometry baker, and text fitting) the joke signs
   are made with. Builders return a THREE.Group on y = 0, facing +Z. Canvas work
   happens only when a function is called, so the module imports cleanly in Node. */
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { ModelBuilder, box, sphere, cyl, cone, capsule, torus, plastic, paint, glow, MAT } from './build.js';

export const FONT = '"Luckiest Guy", "Arial Black", sans-serif';
const bx = (w, h, d) => new THREE.BoxGeometry(w, h, d);   // plain box, for parts too small to need rounding
export const SANS = '"Arial Black", "Helvetica Neue", Arial, sans-serif';

/* ---------- sign kit ---------- */
/** Fit text to a width, in up to `lines` lines; draws centred at (cx, cy). Returns the size used. */
export function fitText(g, text, cx, cy, maxW, size, font, fill, { lines = 2, stroke = null, lw = 0, maxH = 0 } = {}) {
  const words = text.split(' '); let ls = [text];
  g.font = `${size}px ${font}`;
  if (lines > 1 && g.measureText(text).width > maxW && words.length > 1) {
    let best = 1, bd = 1e9; for (let k = 1; k < words.length; k++) { const d = Math.abs(words.slice(0, k).join(' ').length - words.slice(k).join(' ').length); if (d < bd) { bd = d; best = k; } }
    ls = [words.slice(0, best).join(' '), words.slice(best).join(' ')];
  }
  let s = size; const widest = () => Math.max(...ls.map(l => g.measureText(l).width));
  while ((widest() > maxW || (maxH && s * 1.05 * ls.length > maxH)) && s > 10) { s -= 2; g.font = `${s}px ${font}`; }
  g.textAlign = 'center'; g.textBaseline = 'middle';
  ls.forEach((l, k) => { const y = cy + (k - (ls.length - 1) / 2) * s * 1.05; if (stroke) { g.lineWidth = lw; g.strokeStyle = stroke; g.lineJoin = 'round'; g.strokeText(l, cx, y); } g.fillStyle = fill; g.fillText(l, cx, y); });
  return s;
}

/** A painted board: background, optional border, big text (optionally a small kicker line above it). */
export const signDraw = (text, { bg = '#ffffff', fg = '#1a1d29', font = FONT, size = 130, border = null, kicker = null, kfg = null, lines = 2, pad = 0.07, shadow = true } = {}) => (g, w, h) => {
  g.fillStyle = bg; g.fillRect(0, 0, w, h);
  const sh = g.createLinearGradient(0, 0, w, h); sh.addColorStop(0, 'rgba(255,255,255,0.14)'); sh.addColorStop(0.5, 'rgba(255,255,255,0)'); sh.addColorStop(1, 'rgba(0,0,0,0.12)'); g.fillStyle = sh; g.fillRect(0, 0, w, h);
  if (border) { g.strokeStyle = border; g.lineWidth = Math.max(6, h * 0.045); g.strokeRect(g.lineWidth / 2, g.lineWidth / 2, w - g.lineWidth, h - g.lineWidth); }
  let top = 0;
  if (kicker) { top = h * 0.26; fitText(g, kicker, w / 2, h * 0.16, w * (1 - pad * 2), h * 0.16, SANS, kfg || fg, { lines: 1 }); }
  const cy = top + (h - top) * 0.53, maxH = (h - top) * 0.86;
  if (shadow) fitText(g, text, w / 2 + 4, cy + 5, w * (1 - pad * 2), size, font, 'rgba(0,0,0,0.25)', { lines, maxH });
  fitText(g, text, w / 2, cy, w * (1 - pad * 2), size, font, fg, { lines, maxH });
};

/** A red marker line through a word, as if someone crossed it out in a hurry. */
export function strike(g, x0, x1, y, h, color = '#e0202a') {
  g.save(); g.strokeStyle = color; g.lineCap = 'round'; g.lineWidth = h * 0.11;
  g.beginPath(); g.moveTo(x0, y + h * 0.08); g.lineTo(x1, y - h * 0.1); g.stroke();
  g.lineWidth = h * 0.06; g.beginPath(); g.moveTo(x0 + h * 0.2, y - h * 0.06); g.lineTo(x1 - h * 0.1, y + h * 0.12); g.stroke();
  g.restore();
}

/** Text panels packed into big canvases, one mesh per canvas. Redraws once the web fonts arrive.
    place() bakes a panel into the page's static mesh; mesh() returns a standalone panel for things that move. */
export function makeAtlas(group, { S = 2048, emissive = 0.3 } = {}) {
  const pages = [];
  const newPage = () => {
    const c = document.createElement('canvas'); c.width = c.height = S;
    const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
    const mat = new THREE.MeshStandardMaterial({ map: tex, emissiveMap: tex, emissive: 0xffffff, emissiveIntensity: emissive, roughness: 0.6, side: THREE.DoubleSide });
    const p = { c, g: c.getContext('2d'), tex, mat, pos: [], nrm: [], uv: [], x: 0, y: 0, row: 0, items: [] }; pages.push(p); return p;
  };
  newPage();
  const alloc = (w, h) => {
    let p = pages[pages.length - 1];
    if (p.x + w > S) { p.x = 0; p.y += p.row + 4; p.row = 0; }
    if (p.y + h > S) { p = newPage(); }
    const r = { p, x: p.x, y: p.y, w, h }; p.x += w + 4; p.row = Math.max(p.row, h); return r;
  };
  const uvOf = r => [(r.x + 1) / S, 1 - (r.y + r.h - 1) / S, (r.x + r.w - 1) / S, 1 - (r.y + 1) / S];
  const api = {
    add(w, h, draw) { const r = alloc(w, h); r.draw = draw; r.p.items.push(r); return r; },
    /** A flat panel centred at c=[x,y,z], facing yaw (0 = +Z), w by h metres, tilted back by `tilt`. */
    place(r, c, yaw, w, h, tilt = 0) {
      const p = r.p, [u0, v0, u1, v1] = uvOf(r);
      const rx = Math.cos(yaw), rz = -Math.sin(yaw), fx = Math.sin(yaw), fz = Math.cos(yaw);
      const ux = -fx * Math.sin(tilt), uy = Math.cos(tilt), uz = -fz * Math.sin(tilt);
      const nx = fx * Math.cos(tilt), ny = Math.sin(tilt), nz = fz * Math.cos(tilt);
      const P = (sx, sy) => [c[0] + rx * w / 2 * sx + ux * h / 2 * sy, c[1] + uy * h / 2 * sy, c[2] + rz * w / 2 * sx + uz * h / 2 * sy];
      const q = [P(-1, -1), P(1, -1), P(1, 1), P(-1, 1)], t = [[u0, v0], [u1, v0], [u1, v1], [u0, v1]];
      for (const k of [0, 1, 2, 0, 2, 3]) { p.pos.push(...q[k]); p.nrm.push(nx, ny, nz); p.uv.push(...t[k]); }
    },
    /** A standalone panel (w by h, facing +Z, centred) sharing the page material. */
    mesh(r, w, h, mat = null) {
      const g = new THREE.PlaneGeometry(w, h), [u0, v0, u1, v1] = uvOf(r), uv = g.attributes.uv;
      for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) ? u1 : u0, uv.getY(i) ? v1 : v0);
      return new THREE.Mesh(g, mat || r.p.mat);
    },
    paint() { for (const p of pages) { p.g.clearRect(0, 0, S, S); for (const r of p.items) { p.g.save(); p.g.translate(r.x, r.y); p.g.beginPath(); p.g.rect(0, 0, r.w, r.h); p.g.clip(); r.draw(p.g, r.w, r.h); p.g.restore(); } p.tex.needsUpdate = true; } },
    flush() {
      api.paint();
      for (const p of pages) if (p.pos.length) {
        const g = new THREE.BufferGeometry();
        g.setAttribute('position', new THREE.Float32BufferAttribute(p.pos, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(p.nrm, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(p.uv, 2));
        g.computeBoundingSphere();
        const m = new THREE.Mesh(g, p.mat); m.matrixAutoUpdate = false; group.add(m);
      }
      if (typeof document !== 'undefined' && document.fonts?.ready) document.fonts.ready.then(() => api.paint());
    },
  };
  return api;
}

/** Merges static props into one mesh per material (and per shadow casting). */
export function makeBaker(group, shadows) {
  const buckets = new Map();
  const push = (mat, g, cast) => { let b = buckets.get(mat); if (!b) buckets.set(mat, b = [[], []]); b[cast && !mat.transparent ? 0 : 1].push(g); };
  const norm = (geo, matrix) => {
    const g = geo.index ? geo.toNonIndexed() : geo.clone();
    for (const n of Object.keys(g.attributes)) if (!['position', 'normal', 'uv'].includes(n)) g.deleteAttribute(n);
    if (!g.attributes.uv) g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
    if (!g.attributes.normal) g.computeVertexNormals();
    g.clearGroups();
    if (matrix) {
      g.applyMatrix4(matrix);
      if (matrix.determinant() < 0) for (const a of Object.values(g.attributes)) { const s = a.itemSize, arr = a.array; for (let i = 0; i < a.count; i += 3) for (let k = 0; k < s; k++) { const t = arr[(i + 1) * s + k]; arr[(i + 1) * s + k] = arr[(i + 2) * s + k]; arr[(i + 2) * s + k] = t; } }
    }
    return g;
  };
  return {
    /** Bake a placed object (and remove it from the scene). */
    add(obj, cast = true) { obj.updateMatrixWorld(true); obj.traverse(o => { if (o.isMesh && !o.isInstancedMesh) push(o.material, norm(o.geometry, o.matrixWorld), cast); }); obj.removeFromParent(); },
    /** Bake a prop many times: parts from partsOf(), one Matrix4 per copy. */
    copies(parts, matrices, cast = true) { for (const m of matrices) for (const pt of parts) push(pt.material, norm(pt.geometry, m), cast); },
    flush() {
      for (const [mat, lists] of buckets) lists.forEach((list, k) => {
        if (!list.length) return;
        const geo = mergeGeometries(list, false); list.forEach(g => g.dispose());
        geo.computeBoundingSphere();
        const m = new THREE.Mesh(geo, mat); m.castShadow = k === 0 && shadows; m.receiveShadow = false; m.matrixAutoUpdate = false; group.add(m);
      });
      buckets.clear();
    },
  };
}

/* ---------- models ---------- */
/** The pivot tower: two lattice legs and a framed board w by h, its centre at userData.boardY. The board itself is an atlas panel. */
export function pivotTower({ w = 36, h = 36, legs = 16 } = {}) {
  const grp = new THREE.Group(), b = new ModelBuilder(), top = legs + h;
  for (const sx of [-1, 1]) {
    const x = sx * w * 0.3;
    for (const [dx, dz] of [[-1.2, -1.2], [1.2, -1.2], [-1.2, 1.2], [1.2, 1.2]]) b.add('steel', bx(0.5, top - 1, 0.5), { p: [x + dx, (top - 1) / 2, -2 + dz] });
    for (let y = 3; y < top - 2; y += 4.5) { b.add('steel', bx(2.9, 0.3, 0.3), { p: [x, y, -0.8] }); b.add('steel', bx(2.9, 0.3, 0.3), { p: [x, y, -3.2] }); b.add('steel', bx(0.3, 0.3, 2.9), { p: [x - 1.2, y, -2] }); b.add('steel', bx(0.3, 0.3, 2.9), { p: [x + 1.2, y, -2] }); }
    b.add('base', box(5, 1.2, 5, 0.2, 1), { p: [x, 0.6, -2] });
  }
  b.add('frame', box(w + 1.6, h + 1.6, 1.2, 0.3, 2), { p: [0, legs + h / 2, -0.75] });
  b.add('steel', box(w + 2, 0.5, 2.6, 0.1, 1), { p: [0, legs - 0.6, 0.6] });            // catwalk
  for (let i = 0; i < 6; i++) b.add('lamp', box(1.4, 0.5, 1.4, 0.1, 1), { p: [(i - 2.5) * w * 0.18, legs - 0.2, 1.5] });
  grp.add(b.build({ steel: plastic(0xb9bfca, 0.4, 0.7), base: plastic(0x8b93a6, 0.8), frame: plastic(0x1a1d29, 0.5, 0.2), lamp: glow(0xfff0c8, 1.0) }));
  grp.userData.boardY = legs + h / 2;
  return grp;
}

/** A white robotaxi with a spinning-sensor hat. Instance it. Nose on +Z. */
export function robotaxi() {
  const b = new ModelBuilder();
  b.add('body', box(2.0, 0.9, 4.6, 0.35, 2), { p: [0, 0.8, 0] });
  b.add('glass', box(1.8, 0.75, 2.5, 0.3, 2), { p: [0, 1.55, -0.2] });
  b.add('body', box(1.82, 0.12, 2.3, 0.05, 1), { p: [0, 1.95, -0.2] });
  b.add('dark', cyl(0.42, 0.48, 0.42, 14), { p: [0, 2.2, -0.2] });
  b.add('sensor', cyl(0.36, 0.36, 0.2, 14), { p: [0, 2.48, -0.2] });
  for (const [x, z] of [[0.95, 1.45], [-0.95, 1.45], [0.95, -1.45], [-0.95, -1.45]]) b.add('tyre', cyl(0.38, 0.38, 0.3, 14), { p: [x, 0.38, z], r: [0, 0, Math.PI / 2] });
  for (const x of [0.62, -0.62]) { b.add('hazard', box(0.4, 0.14, 0.08, 0.03, 1), { p: [x, 0.95, 2.3] }); b.add('hazard', box(0.4, 0.14, 0.08, 0.03, 1), { p: [x, 0.95, -2.3] }); }
  for (const s of [1, -1]) b.add('dark', sphere(0.16, 8, 6), { p: [s * 1.05, 1.3, 0.75] });
  return b.build({ body: paint(0xf4f5f7, { rough: 0.3, clear: 0.7 }), glass: plastic(0x1d2633, 0.15, 0.4), dark: MAT.dark, sensor: plastic(0x3a414c, 0.3, 0.5), tyre: MAT.rubber, hazard: glow(0xffa21a, 1.4) });
}

/** A rental scooter lying around. Instance or bake it. */
export function scooter(color = 0x22c55e) {
  const b = new ModelBuilder();
  b.add('deck', bx(0.32, 0.1, 1.2), { p: [0, 0.18, 0] });
  b.add('frame', cyl(0.035, 0.035, 1.05, 6), { p: [0, 0.68, 0.6], r: [-0.18, 0, 0] });
  b.add('frame', cyl(0.03, 0.03, 0.55, 6), { p: [0, 1.18, 0.7], r: [0, 0, Math.PI / 2] });
  for (const z of [0.6, -0.55]) b.add('tyre', cyl(0.15, 0.15, 0.07, 10), { p: [0, 0.15, z], r: [0, 0, Math.PI / 2] });
  b.add('deck', bx(0.2, 0.12, 0.2), { p: [0, 1.0, 0.68] });
  return b.build({ deck: paint(color, { rough: 0.4, clear: 0.4 }), frame: MAT.dark, tyre: MAT.rubber });
}

/** Shipping containers stacked into "luxury micro-lofts": windows, AC units, potted plants. Front on +Z. */
export function containerStack() {
  const b = new ModelBuilder(), L = 12, H = 2.6, D = 2.45;
  const cols = ['c0', 'c1', 'c2', 'c3', 'c4'];
  let k = 0;
  for (const [x, row] of [[-12.4, 0], [0, 0], [12.4, 0], [-6.2, 1], [6.2, 1], [0, 2]]) {
    const y = row * H, c = cols[k++ % cols.length];
    b.add(c, box(L, H - 0.05, D, 0.06, 1), { p: [x, y + H / 2, 0] });
    for (let r = -5.4; r <= 5.4; r += 0.45) b.add(c, bx(0.12, H - 0.3, 0.06), { p: [x + r, y + H / 2, D / 2 + 0.02] });   // corrugation
    for (const wx of [-3, 2]) { b.add('trim', bx(1.9, 1.3, 0.1), { p: [x + wx, y + 1.4, D / 2 + 0.06] }); b.add('glass', bx(1.7, 1.1, 0.1), { p: [x + wx, y + 1.4, D / 2 + 0.1] }); }
    b.add('ac', bx(0.9, 0.6, 0.5), { p: [x + 4.6, y + 0.6, D / 2 + 0.3] });
    b.add('leaf', sphere(0.35, 8, 6), { p: [x - 5, y + 0.55, D / 2 + 0.35] });
  }
  return b.build({ c0: paint(0xd9442c, { rough: 0.6 }), c1: paint(0x1f6bff, { rough: 0.6 }), c2: paint(0x2a9d55, { rough: 0.6 }), c3: paint(0xe8a92a, { rough: 0.6 }), c4: paint(0x7b5cff, { rough: 0.6 }), trim: plastic(0xf4f4f0, 0.5), glass: plastic(0x5f8fc0, 0.2, 0.3), ac: plastic(0xc8ccd2, 0.5, 0.3), leaf: plastic(0x3f9a3a, 0.8) });
}

/** A unicorn party balloon, ~L metres nose to tail, facing +Z. userData.head droops as it deflates. */
export function unicorn({ L = 26 } = {}) {
  const grp = new THREE.Group(), s = L / 26;
  const body = new ModelBuilder();
  body.add('pink', sphere(1, 24, 16), { p: [0, 0, 0], s: [5.2 * s, 4.6 * s, 9 * s] });
  for (const [x, z] of [[2.8, 5], [-2.8, 5], [2.8, -5], [-2.8, -5]]) { body.add('pink', capsule(1.3 * s, 6 * s, 6, 12), { p: [x * s, -6.4 * s, z * s] }); body.add('gold', cyl(1.4 * s, 1.5 * s, 1.0 * s, 12), { p: [x * s, -10.6 * s, z * s] }); }
  const rainbow = ['r0', 'r1', 'r2', 'r3', 'r4'];
  for (let i = 0; i < 5; i++) body.add(rainbow[i], sphere(1.5 * s, 12, 8), { p: [0, (1.6 - i * 0.6) * s, (-9 - i * 1.6) * s], s: [1, 1, 1.3] });   // tail
  const mats = { pink: paint(0xffb3d9, { rough: 0.25, clear: 0.9 }), white: paint(0xffffff, { rough: 0.25, clear: 0.9 }), gold: paint(0xffc928, { rough: 0.25, metal: 0.6, clear: 0.8 }), eye: MAT.black, r0: paint(0xff4d6d, { rough: 0.3, clear: 0.8 }), r1: paint(0xff9a1a, { rough: 0.3, clear: 0.8 }), r2: paint(0xffe04a, { rough: 0.3, clear: 0.8 }), r3: paint(0x2ee6a6, { rough: 0.3, clear: 0.8 }), r4: paint(0x5aa0ff, { rough: 0.3, clear: 0.8 }) };
  grp.add(body.build(mats));
  const head = new THREE.Group(), hb = new ModelBuilder();
  hb.add('pink', capsule(2.4 * s, 4 * s, 6, 14), { p: [0, 2.8 * s, 1.2 * s], r: [0.6, 0, 0] });                 // neck
  hb.add('white', sphere(1, 20, 14), { p: [0, 6.6 * s, 4.2 * s], s: [3.1 * s, 3.2 * s, 4.4 * s] });           // head
  hb.add('pink', sphere(1, 16, 10), { p: [0, 5.6 * s, 7.6 * s], s: [2.3 * s, 2.0 * s, 1.8 * s] });            // snout
  hb.add('gold', cone(0.9 * s, 6.5 * s, 14), { p: [0, 11.2 * s, 5.2 * s], r: [0.35, 0, 0] });                  // horn
  for (const x of [1.4, -1.4]) { hb.add('pink', cone(0.7 * s, 2.4 * s, 10), { p: [x * s, 10 * s, 2.6 * s], r: [-0.2, 0, x > 0 ? -0.3 : 0.3] }); hb.add('eye', sphere(0.55 * s, 10, 8), { p: [x * 1.6 * s, 7.4 * s, 6.6 * s] }); }
  for (let i = 0; i < 5; i++) hb.add(rainbow[i], sphere(1.4 * s, 12, 8), { p: [0, (9.4 - i * 1.5) * s, (2.2 - i * 0.9) * s] });   // mane
  head.add(hb.build(mats)); head.position.set(0, 1.5 * s, 6 * s); grp.add(head);
  grp.userData.head = head;
  return grp;
}

/** A plain post for signs: a cylinder of height h. */
export function post(h = 8, r = 0.25, color = 0x3a414c) {
  const b = new ModelBuilder(); b.add('p', cyl(r, r * 1.15, h, 8), { p: [0, h / 2, 0] });
  return b.build({ p: plastic(color, 0.5, 0.4) });
}

/** A wall clock face ring and hub (the face is an atlas panel, the hands are separate). */
export function clockRim(r = 3) {
  const b = new ModelBuilder(); b.add('rim', torus(r, r * 0.08, 8, 40), {}); b.add('rim', cyl(r * 0.08, r * 0.08, 0.5, 8), { r: [Math.PI / 2, 0, 0] });
  return b.build({ rim: plastic(0x1a1d29, 0.4, 0.3) });
}

/* ---------- the landmarks (playtest dressing): the bridge, the tower, the garage ---------- */
/**
 * A Golden Gate-style suspension bridge, local frame: the bridge runs along X, the kart road passes
 * under it along Z, and y = 0 is the ROAD surface under the crossing. International orange throughout.
 * Towers at x = ±27 (54 m main span), deck top at deckY, tower tops at towerTop; legs bury 4 m so the
 * footings sit happily on sloping ground.
 */
export function ggBridge({ deckY = 11.5, towerTop = 35 } = {}) {
  const b = new ModelBuilder(), OR = 'orange', DK = 'deck', CC = 'conc';
  for (const sx of [-1, 1]) {
    const x = sx * 27;
    for (const sz of [-1, 1]) b.add(OR, bx(1.7, towerTop + 4, 1.7), { p: [x, (towerTop + 4) / 2 - 4, sz * 4.6] });
    for (const y of [3, deckY - 2.5, deckY + 5.5, deckY + 13.5, deckY + 21.5, towerTop - 1.2]) b.add(OR, bx(1.0, 1.15, 11), { p: [x, y, 0] });
    b.add(CC, bx(7, 3.4, 13.5), { p: [x, -1.2, 0] });                                   // footing block
    b.add(CC, bx(11, deckY + 3.5, 14.5), { p: [sx * 47, (deckY + 3.5) / 2 - 3.5, 0] });   // abutment the deck lands on
  }
  b.add(DK, bx(100, 1.3, 12.6), { p: [0, deckY - 0.65, 0] });                            // the deck slab
  b.add(DK, bx(100, 0.16, 9.2), { p: [0, deckY + 0.08, 0] });                            // its roadway
  for (const sz of [-1, 1]) b.add(OR, bx(100, 1.8, 0.32), { p: [0, deckY - 0.72, sz * 6.3] });   // orange edge girders (the fascia)
  // the main cables: side spans sagging slightly, the main span a clean parabola down to the deck
  const topY = towerTop - 0.4, midY = deckY + 2.2;
  const cableY = x => {
    const ax = Math.abs(x);
    if (ax <= 27) return midY + (topY - midY) * (x / 27) ** 2;
    const t = (ax - 27) / 21; return (deckY + 1.2) * (1 - t) + topY * t - Math.sin(t * Math.PI) * 1.1;
  };
  for (const sz of [-1, 1]) {
    const pts = [];
    for (let x = -48; x <= 48; x += 3.5) pts.push(new THREE.Vector3(x, cableY(x), sz * 5.6));
    b.add(OR, new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 72, 0.34, 6), {});
    for (let x = -24; x <= 24; x += 6) { const ty = cableY(x) - 0.3; b.add(OR, bx(0.16, ty - deckY, 0.16), { p: [x, (ty + deckY) / 2, sz * 5.6] }); }
  }
  return b.build({ orange: plastic(0xc0362c, 0.42, 0.3), deck: plastic(0x1a1d29, 0.5, 0.2), conc: plastic(0x8b93a6, 0.8, 0) });
}

/** A Hoover Tower: tapered sandstone shaft, glass observation band, terracotta pyramid cap. y = 0 at the base. */
export function hooverTower({ H = 27 } = {}) {
  const b = new ModelBuilder(), SD = 'sand', TC = 'terra', GL = 'glass', CC = 'conc';
  b.add(CC, bx(13, 1.2, 13), { p: [0, 0.6, 0] });
  b.add(SD, cyl(2.7, 3.4, H, 4), { p: [0, H / 2 + 1.2, 0], r: [0, Math.PI / 4, 0] });
  b.add(SD, bx(8.2, 1.0, 8.2), { p: [0, H + 1.7, 0] });
  b.add(SD, bx(9.0, 2.6, 9.0), { p: [0, H + 3.5, 0] });
  b.add(GL, bx(9.25, 1.3, 9.25), { p: [0, H + 3.5, 0] });
  b.add(TC, cone(6.3, 6.5, 4), { p: [0, H + 8.05, 0], r: [0, Math.PI / 4, 0] });
  b.add(TC, cyl(0.1, 0.28, 3.6, 6), { p: [0, H + 12.9, 0] });
  return b.build({ sand: plastic(0xe2cfa3, 0.8, 0), terra: plastic(0xa04a34, 0.7, 0), glass: plastic(0x1a1d29, 0.5, 0.2), conc: plastic(0x8b93a6, 0.8, 0) });
}

/** A suburban garage with a pitched pyramid roof and a paneled door, facing +Z. y = 0 at the slab. */
export function garage() {
  const b = new ModelBuilder(), WL = 'wall', RF = 'roof', DR = 'door', CC = 'conc';
  b.add(WL, bx(9.5, 4.4, 7), { p: [0, 2.2, 0] });
  b.add(RF, cone(5.9, 2.6, 4), { p: [0, 5.7, 0], r: [0, Math.PI / 4, 0], s: [1.22, 1, 0.9] });
  b.add(DR, bx(6.6, 3.1, 0.18), { p: [0, 1.65, 3.55] });
  for (const y of [1.0, 1.9, 2.8]) b.add(CC, bx(6.6, 0.09, 0.06), { p: [0, y, 3.66] });
  b.add(CC, bx(7.2, 0.12, 8.5), { p: [0, 0.06, 7.6] });                                  // the driveway
  b.add(DR, bx(1.5, 1.1, 0.12), { p: [-3.4, 2.9, 3.53] });                               // a side window
  return b.build({ wall: plastic(0xe2cfa3, 0.8, 0), roof: plastic(0xa04a34, 0.7, 0), door: plastic(0xb9bfca, 0.4, 0.7), conc: plastic(0x8b93a6, 0.8, 0) });
}
