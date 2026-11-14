/* Props for Silicon Valley Circuit: the PIVOT TO AI tower, robotaxis, rental
   scooters, a container "micro-loft" block, the deflating unicorn, and the sign
   kit (a canvas atlas, a static-geometry baker, and text fitting) the joke signs
   are made with. Builders return a THREE.Group on y = 0, facing +Z. Canvas work
   happens only when a function is called, so the module imports cleanly in Node. */
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { ModelBuilder, box, sphere, cyl, cone, capsule, torus, tube, lathe, plastic, paint, glow, MAT } from './build.js';

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

/** An empty group: the model for collision-only obstacles (the fountain island is drawn by decorate). */
export const nothing = () => new THREE.Group();

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

/* ---------- the landmarks (playtest dressing): the tower, the garage ---------- */
/* (The Golden Gate is no longer a prop: since #168 the lap drives over its deck, and the towers,
   cables and girders are built from the track's own samples in silicon-valley.js decorate().) */

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

/* ---------- The Farm: the campus kit (sandstone, red tile, gold) ---------- */
/* Shared materials, so the baker merges every campus building into a handful of draw calls.
   Extruded faces get world-scale UVs (1 unit = 1 m), so the ashlar texture keeps its block size on every wall. */
let _farm = null;
export function farmMats() {
  if (_farm) return _farm;
  // generated sandstone ashlar (assets/tracks/silicon-valley/prompts.md): 512 px covers 2 m x 2 m of wall
  const ashlar = new THREE.TextureLoader().load('assets/tracks/silicon-valley/ashlar.webp');
  ashlar.wrapS = ashlar.wrapT = THREE.RepeatWrapping; ashlar.colorSpace = THREE.SRGBColorSpace; ashlar.anisotropy = 8;
  ashlar.repeat.set(0.5, 0.5);
  _farm = {
    stone: new THREE.MeshStandardMaterial({ map: ashlar, roughness: 0.85, metalness: 0 }),
    sand: plastic(0xe2cfa3, 0.8, 0), trim: plastic(0xcdb483, 0.85, 0), shade: plastic(0x6b5640, 0.95, 0),
    terra: plastic(0xa04a34, 0.7, 0), terra2: plastic(0x8a3b29, 0.75, 0),
    gold: paint(0xe0a92a, { rough: 0.3, metal: 0.75, clear: 0.6 }), bronze: paint(0x6f5233, { rough: 0.38, metal: 0.8, clear: 0.4 }),
    lawn: plastic(0x5cb547, 0.95, 0), hedge: plastic(0x2f7f35, 0.9, 0),
    water: new THREE.MeshStandardMaterial({ color: 0x55c6f0, roughness: 0.08, metalness: 0.2, transparent: true, opacity: 0.82, envMapIntensity: 1.4 }),
    dark: plastic(0x2a2622, 0.9, 0), iron: plastic(0x2b2f36, 0.5, 0.6), glass: plastic(0x1d2633, 0.15, 0.4), white: plastic(0xf6f2e8, 0.6, 0),
  };
  return _farm;
}

/** A wall w wide and h tall with one round-topped opening ow wide whose arch springs at sy, d deep, centred on x = 0, z = 0. */
export function archWall(w, h, ow, sy, d) {
  const s = new THREE.Shape();
  s.moveTo(-w / 2, 0); s.lineTo(-ow / 2, 0); s.lineTo(-ow / 2, sy);
  s.absarc(0, sy, ow / 2, Math.PI, 0, true);
  s.lineTo(ow / 2, 0); s.lineTo(w / 2, 0); s.lineTo(w / 2, h); s.lineTo(-w / 2, h); s.closePath();
  const g = new THREE.ExtrudeGeometry(s, { depth: d, bevelEnabled: false, curveSegments: 14 });
  g.translate(0, 0, -d / 2);
  return g;
}

/** Barrel tiles over a sloping roof plane falling toward +Z: half-pipes running down the slope, a red-tile roof that reads at a glance. */
function tileRoof(b, w, run, rise, y0, z0) {
  const L = Math.hypot(run, rise), a = Math.atan2(rise, run);
  b.add('terra2', bx(w, 0.18, L), { p: [0, y0 + rise / 2, z0 - run / 2], r: [a, 0, 0] });
  const n = Math.max(2, Math.round(w / 0.55));
  for (let i = 0; i < n; i++) b.add(i % 3 ? 'terra' : 'terra2', cyl(0.19, 0.19, L, 6, true), { p: [-w / 2 + (i + 0.5) * w / n, y0 + rise / 2 + 0.12, z0 - run / 2], r: [Math.PI / 2 + a, 0, 0] });
}

/** One 4 m bay of the Quad's arcade, facing +Z: arched front wall, shaded gallery, back wall, red tile roof. ~8 m tall, ~5 m deep. */
export function arcadeBay() {
  const b = new ModelBuilder(), W = 4;
  b.add('stone', archWall(W, 6.2, 2.7, 2.9, 0.7), {});
  b.add('trim', bx(W + 0.02, 0.32, 0.95), { p: [0, 6.36, 0.05] });                       // cornice
  b.add('trim', bx(W + 0.02, 0.22, 0.86), { p: [0, 4.75, 0.04] });                       // string course
  b.add('trim', bx(0.5, 0.5, 0.9), { p: [-W / 2 + 0.25, 0.25, 0.05] });                  // pier plinths
  b.add('trim', bx(0.5, 0.5, 0.9), { p: [W / 2 - 0.25, 0.25, 0.05] });
  b.add('shade', bx(W, 0.2, 4.0), { p: [0, 0.1, -2.2] });                                // gallery floor
  b.add('shade', bx(W, 6.0, 0.4), { p: [0, 3.0, -4.2] });                                // back wall, in shadow
  b.add('dark', bx(1.5, 2.6, 0.1), { p: [0, 1.3, -3.95] });                              // a door at the back of the gallery
  b.add('shade', bx(W, 0.3, 4.4), { p: [0, 6.05, -2.1] });                               // gallery ceiling
  tileRoof(b, W + 0.02, 4.9, 1.7, 6.55, 0.55);
  const m = farmMats();
  return b.build({ stone: m.stone, trim: m.trim, shade: m.shade, dark: m.dark, terra: m.terra, terra2: m.terra2 });
}

/** A great arch over the road: span metres clear, ~17 m tall, 3 m deep, centred on x = 0; the road runs along Z through it.
    userData.signY: the height of the inscription panel's centre on either face. */
export function quadArch(span = 14) {
  const b = new ModelBuilder(), W = span + 7, H = 18.2, sy = 6.2;
  b.add('stone', archWall(W, H, span, sy, 3.0), {});
  for (const s of [-1, 1]) {
    b.add('trim', bx(1.0, H - 0.6, 3.5), { p: [s * (span / 2 + 0.6), (H - 0.6) / 2, 0] });     // pilasters either side of the opening
    b.add('trim', bx(1.2, 1.0, 3.7), { p: [s * (span / 2 + 0.6), 0.5, 0] });
    b.add('trim', bx(1.0, H - 0.6, 3.4), { p: [s * (W / 2 - 0.5), (H - 0.6) / 2, 0] });        // corner pilasters
  }
  b.add('trim', bx(W + 0.8, 0.7, 3.8), { p: [0, H + 0.3, 0] });                               // cornice
  b.add('trim', bx(W - 2, 1.4, 3.2), { p: [0, H + 1.35, 0] });                                // attic
  b.add('gold', bx(1.6, 1.1, 3.25), { p: [0, sy + span / 2 + 0.25, 0] });                      // keystone
  const m = farmMats();
  const g = b.build({ stone: m.stone, trim: m.trim, gold: m.gold });
  g.userData.signY = sy + span / 2 + 2.5; g.userData.depth = 3.0; g.userData.width = W;
  return g;
}

/** The chapel at the end of Palm Drive, facing +Z: gabled sandstone front ~34 m wide, three arched portals, a gold
    mosaic band over them (userData.mosaic = { y, w, h } for an atlas panel), a nave and red roof behind. */
export function chapel() {
  const b = new ModelBuilder(), W = 34, H = 15, G = 27;
  const s = new THREE.Shape();
  s.moveTo(-W / 2, 0); s.lineTo(W / 2, 0); s.lineTo(W / 2, H); s.lineTo(W * 0.32, H); s.lineTo(0, G); s.lineTo(-W * 0.32, H); s.lineTo(-W / 2, H); s.closePath();
  const front = new THREE.ExtrudeGeometry(s, { depth: 2.2, bevelEnabled: false }); front.translate(0, 0, -2.2);
  b.add('stone', front, {});
  b.add('stone', bx(W * 0.64, 12, 40), { p: [0, 6, -22] });                                      // the nave
  for (const sx of [-1, 1]) {
    b.add('terra', bx(W * 0.4, 0.5, 41), { p: [sx * W * 0.15, 15.6, -22], r: [0, 0, sx * -0.62] });   // nave roof, two slopes
    b.add('trim', bx(1.4, G - 4, 2.6), { p: [sx * W * 0.32, (G - 4) / 2, -0.9] });              // buttresses framing the gable
    b.add('trim', bx(2.2, H + 2, 2.8), { p: [sx * (W / 2 - 1.1), (H + 2) / 2, -0.9] });
  }
  for (const sx of [-1, 1]) b.add('trim', bx(6.6, 0.6, 2.8), { p: [sx * (W / 2 - 3.0), H + 0.1, -0.9] });   // cornice, either side of the mosaic
  b.add('gold', bx(16.0, 0.5, 0.5), { p: [0, 8.35, 0.2] }); b.add('gold', bx(16.0, 0.5, 0.5), { p: [0, 18.85, 0.2] });   // the mosaic's gold frame
  b.add('gold', bx(0.5, 11.0, 0.5), { p: [-7.75, 13.6, 0.2] }); b.add('gold', bx(0.5, 11.0, 0.5), { p: [7.75, 13.6, 0.2] });
  for (const [x, w, hh] of [[-11.4, 3.6, 7.0], [0, 5.6, 7.9], [11.4, 3.6, 7.0]]) {               // three portals: dark recess, gold frame
    const ps = new THREE.Shape(); ps.moveTo(-w / 2, 0); ps.lineTo(w / 2, 0); ps.lineTo(w / 2, hh - w / 2); ps.absarc(0, hh - w / 2, w / 2, 0, Math.PI, false); ps.closePath();
    b.add('dark', new THREE.ExtrudeGeometry(ps, { depth: 0.3, bevelEnabled: false }), { p: [x, 0, 0.0] });
    b.add('gold', torus(w / 2 + 0.25, 0.22, 6, 18, Math.PI), { p: [x, hh - w / 2, 0.35] });
    for (const sx of [-1, 1]) b.add('trim', cyl(0.4, 0.45, hh - w / 2, 10), { p: [x + sx * (w / 2 + 0.55), (hh - w / 2) / 2, 0.4] });
  }
  b.add('gold', torus(1.3, 0.25, 6, 20), { p: [0, 22.3, 0.15] });                                // a small rose window in the peak
  b.add('glass', cyl(1.25, 1.25, 0.2, 20), { p: [0, 22.3, 0.05], r: [Math.PI / 2, 0, 0] });
  b.add('gold', cone(0.5, 2.4, 8), { p: [0, G + 1.2, -1.1] });                                    // finial
  const m = farmMats();
  const g = b.build({ stone: m.stone, trim: m.trim, terra: m.terra, dark: m.dark, gold: m.gold, glass: plastic(0x2d6fd6, 0.2, 0.3) });
  g.userData.mosaic = { y: 13.6, w: 15, h: 10 };      // the gable mosaic, in its gold frame
  return g;
}

/** The Founder: a hero-scale bronze in a hoodie, one finger raised ("we're number one"), a laptop under the other arm. ~6.4 m, facing +Z. */
export function founder() {
  const b = new ModelBuilder();
  for (const s of [-1, 1]) {
    b.add('br', capsule(0.42, 1.8, 6, 12), { p: [s * 0.5, 1.25, 0] });                          // legs
    b.add('br', box(0.7, 0.4, 1.1, 0.15, 2), { p: [s * 0.52, 0.2, 0.18] });                     // sneakers
  }
  b.add('br', capsule(1.05, 1.5, 8, 16), { p: [0, 3.55, 0], s: [1, 1, 0.75] });                 // hoodie
  b.add('br', box(1.3, 0.55, 0.3, 0.12, 2), { p: [0, 3.2, 0.72] });                             // the front pocket
  b.add('br', sphere(0.62, 16, 12), { p: [0, 5.15, 0.08] });                                    // head
  b.add('br', sphere(0.8, 16, 12), { p: [0, 5.2, -0.22], s: [1, 1.05, 1] });                     // hood
  b.add('br', capsule(0.3, 1.5, 6, 10), { p: [1.15, 4.75, 0.15], r: [0, 0, -0.25] });           // raised arm
  b.add('br', capsule(0.13, 0.55, 4, 8), { p: [1.35, 5.95, 0.15] });                            // the finger
  b.add('br', capsule(0.3, 1.3, 6, 10), { p: [-1.1, 3.4, 0.25], r: [0.5, 0, 0.18] });           // laptop arm
  b.add('br', box(1.4, 0.12, 1.0, 0.04, 1), { p: [-1.05, 2.95, 0.7], r: [0, 0, 0.12] });         // the laptop
  return b.build({ br: farmMats().bronze });
}

/** The Founder's Fountain island, L long and W wide, along +Z (centred): a sandstone kerb, lawn, hedges, a tiered
    fountain, and the statue's plinth at the middle. userData: { statueY, basins: [[z, y, r]] } for water and jets. */
export function fountainIsland(L = 40, W = 4.8) {
  const b = new ModelBuilder(), r = W / 2;
  const s = new THREE.Shape();
  s.absarc(0, L / 2 - r, r, 0, Math.PI, false); s.absarc(0, -L / 2 + r, r, Math.PI, Math.PI * 2, false); s.closePath();
  const kerb = new THREE.ExtrudeGeometry(s, { depth: 0.55, bevelEnabled: true, bevelThickness: 0.1, bevelSize: 0.12, bevelSegments: 2, curveSegments: 10 });
  kerb.rotateX(-Math.PI / 2);
  b.add('trim', kerb, {});
  const top = new THREE.ShapeGeometry(s, 10); top.rotateX(-Math.PI / 2);
  b.add('lawn', top, { p: [0, 0.68, 0], s: [0.86, 1, 0.97] });
  for (const z0 of [-L / 2 + 3, L / 2 - 3]) for (let k = 0; k < 4; k++) {            // hedges along both sides, broken by the fountain
    const z = z0 + Math.sign(-z0) * k * 2.4;
    for (const sx of [-1, 1]) b.add('hedge', box(0.9, 0.9, 2.0, 0.35, 2), { p: [sx * (r - 0.75), 1.1, z] });
  }
  b.add('trim', lathe([[0, 0], [2.35, 0], [2.4, 0.9], [2.1, 0.95], [2.05, 0.4], [0, 0.4]], 28), { p: [0, 0.55, 0] });   // the tiered fountain
  b.add('trim', lathe([[0, 0], [0.7, 0], [0.55, 1.6], [1.6, 2.0], [1.65, 2.35], [0.6, 2.4], [0, 2.4]], 24), { p: [0, 0.95, 0] });
  b.add('trim', box(1.5, 2.4, 1.5, 0.15, 2), { p: [0, 4.4, 0] });                                // the plinth
  b.add('gold', box(1.65, 0.3, 1.65, 0.08, 1), { p: [0, 5.7, 0] });
  for (const z of [-L / 2 + 7.5, L / 2 - 7.5]) {                                                  // two smaller basins along the island
    b.add('trim', lathe([[0, 0], [1.8, 0], [1.85, 0.75], [1.55, 0.8], [1.5, 0.35], [0, 0.35]], 24), { p: [0, 0.55, z] });
    b.add('trim', cyl(0.28, 0.4, 1.6, 10), { p: [0, 1.3, z] });
    b.add('trim', lathe([[0, 0], [0.9, 0.05], [1.0, 0.35], [0.2, 0.3], [0, 0.3]], 18), { p: [0, 2.05, z] });
  }
  const m = farmMats();
  const g = b.build({ trim: m.trim, lawn: m.lawn, hedge: m.hedge, gold: m.gold });
  const wb = new ModelBuilder();
  wb.add('w', cyl(2.1, 2.1, 0.08, 28), { p: [0, 1.3, 0] });
  wb.add('w', cyl(1.5, 1.5, 0.06, 24), { p: [0, 3.25, 0] });
  for (const z of [-L / 2 + 7.5, L / 2 - 7.5]) wb.add('w', cyl(1.5, 1.5, 0.06, 20), { p: [0, 1.25, z] });
  g.add(wb.build({ w: m.water }, { cast: false }));
  g.userData.statueY = 5.85; g.userData.basins = [[0, 3.3, 1.5], [-L / 2 + 7.5, 2.4, 0.9], [L / 2 - 7.5, 2.4, 0.9]];
  return g;
}

/** A topiary "$" for the Oval lawn: clipped hedge balls, ~10 m tall, facing +Z, on a sandstone base. */
export function topiaryDollar() {
  const b = new ModelBuilder();
  for (let k = 0; k <= 26; k++) {                       // the S, as two stacked arcs: top bowl opens right, bottom bowl opens left
    const t = k / 26;
    let x, y;
    if (t < 0.5) { const a = Math.PI * (0.2 + t * 2 * 1.3); x = Math.cos(a) * 1.9; y = 6.4 + Math.sin(a) * 1.55; }
    else { const a = Math.PI * (0.5 + (t - 0.5) * 2 * 1.3); x = -Math.cos(a) * 1.9; y = 3.3 - Math.sin(a) * 1.55; void 0; x = -x; }
    b.add('hedge', sphere(0.62, 10, 8), { p: [x, y + 0.8, 0] });
  }
  for (let y = 0.9; y <= 9.7; y += 0.8) b.add('hedge2', sphere(0.48, 10, 8), { p: [0, y + 0.4, 0.2] });
  b.add('trim', box(5.4, 0.8, 2.4, 0.2, 2), { p: [0, 0.4, 0] });
  const m = farmMats();
  return b.build({ hedge: m.hedge, hedge2: plastic(0x3d9a3e, 0.9, 0), trim: m.trim });
}

/** A Palm Drive lamp post with a banner arm; the banner is an atlas panel (userData.banner = { x, y, w, h } in the post's frame). */
export function lampBanner() {
  const b = new ModelBuilder();
  b.add('iron', cyl(0.13, 0.2, 7.4, 8), { p: [0, 3.7, 0] });
  b.add('iron', cyl(0.3, 0.36, 0.6, 8), { p: [0, 0.3, 0] });
  b.add('iron', bx(1.7, 0.1, 0.1), { p: [0.85, 6.6, 0] });
  b.add('iron', bx(1.7, 0.1, 0.1), { p: [0.85, 3.0, 0] });
  b.add('glow', sphere(0.32, 10, 8), { p: [0, 7.6, 0] });
  const g = b.build({ iron: farmMats().iron, glow: glow(0xfff0c8, 0.9) });
  g.userData.banner = { x: 0.9, y: 4.8, w: 1.5, h: 3.4 };
  return g;
}

/** Bunting: a sagging line from a to b ([x,y,z]) with n triangular flags in alternating colors. */
export function bunting(a, b2, n = 14, colors = [0xc8102e, 0xffffff, 0xffc928]) {
  const mb = new ModelBuilder(), sag = t => Math.sin(Math.PI * t) * 1.5;
  const at = t => [a[0] + (b2[0] - a[0]) * t, a[1] + (b2[1] - a[1]) * t - sag(t), a[2] + (b2[2] - a[2]) * t];
  mb.add('line', tube(Array.from({ length: 13 }, (_, k) => at(k / 12)), 0.035, 16, 4), {});
  const tri = new THREE.BufferGeometry();
  tri.setAttribute('position', new THREE.Float32BufferAttribute([-0.45, 0, 0, 0.45, 0, 0, 0, -1.0, 0], 3)); tri.computeVertexNormals();
  const yaw = Math.atan2(b2[0] - a[0], b2[2] - a[2]) - Math.PI / 2;
  for (let k = 1; k < n; k++) mb.add('c' + (k % colors.length), tri, { p: at(k / n), r: [0, yaw, 0] });
  const mats = { line: plastic(0x2b2f36, 0.6, 0) };
  colors.forEach((c, k) => { const key = 'flag' + c; mats['c' + k] = _flag[key] || (_flag[key] = Object.assign(plastic(c, 0.7, 0).clone(), { side: THREE.DoubleSide })); });
  return mb.build(mats, { cast: false });
}
const _flag = {};

/** A low monument sign for a venture firm's drive: a granite slab with a gold cap; the name is an atlas panel (userData.panel). */
export function monument(w = 7) {
  const b = new ModelBuilder();
  b.add('slab', box(w, 2.2, 1.0, 0.15, 2), { p: [0, 1.1, 0] });
  b.add('gold', box(w + 0.3, 0.25, 1.2, 0.08, 1), { p: [0, 2.3, 0] });
  const g = b.build({ slab: plastic(0x4a4f5a, 0.5, 0.2), gold: farmMats().gold });
  g.userData.panel = { y: 1.15, w: w - 0.5, h: 1.6, z: 0.52 };
  return g;
}

/** The summit's glass conference pod, facing +Z: a rounded glass box on legs with a long table; ~11 m wide. userData.board: the whiteboard. */
export function confPod() {
  const b = new ModelBuilder();
  b.add('frame', box(11.4, 0.5, 6.4, 0.2, 2), { p: [0, 1.25, 0] });
  b.add('frame', box(11.4, 0.4, 6.4, 0.2, 2), { p: [0, 5.2, 0] });
  for (const [x, z] of [[-5, -2.6], [5, -2.6], [-5, 2.6], [5, 2.6]]) { b.add('frame', cyl(0.18, 0.2, 1.2, 8), { p: [x, 0.5, z] }); b.add('frame', bx(0.16, 3.6, 0.16), { p: [x * 1.1, 3.2, z * 1.12] }); }
  b.add('wood', box(7, 0.2, 1.8, 0.08, 1), { p: [0, 2.35, 0] });
  b.add('frame', bx(0.2, 0.9, 0.2), { p: [-2.5, 1.9, 0] }); b.add('frame', bx(0.2, 0.9, 0.2), { p: [2.5, 1.9, 0] });
  b.add('white', bx(5.2, 2.6, 0.12), { p: [0, 3.25, -2.8] });
  const g = b.build({ frame: plastic(0xdfe3ea, 0.35, 0.6), wood: plastic(0x9a6a3e, 0.6, 0), white: plastic(0xffffff, 0.5, 0) });
  const glassM = new THREE.MeshStandardMaterial({ color: 0x9fdcff, roughness: 0.05, metalness: 0.3, transparent: true, opacity: 0.3, depthWrite: false });
  const gl = new ModelBuilder(); gl.add('g', box(11, 3.6, 6, 0.4, 3), { p: [0, 3.2, 0] });
  g.add(gl.build({ g: glassM }, { cast: false }));
  g.userData.board = { y: 3.25, z: -2.72, w: 5, h: 2.4 };
  return g;
}

/** A Palm Drive gate pillar: sandstone, ~9.5 m, gold ball on top. userData.panel: a sign face on +Z. */
export function gatePillar() {
  const b = new ModelBuilder();
  b.add('trim', box(2.9, 1.0, 2.9, 0.12, 2), { p: [0, 0.5, 0] });
  b.add('stone', bx(2.3, 7.0, 2.3), { p: [0, 4.5, 0] });
  b.add('trim', box(2.8, 0.6, 2.8, 0.12, 2), { p: [0, 8.3, 0] });
  b.add('gold', sphere(0.75, 14, 10), { p: [0, 9.35, 0] });
  const m = farmMats();
  const g = b.build({ trim: m.trim, stone: m.stone, gold: m.gold });
  g.userData.panel = { y: 5.6, w: 2.05, h: 3.6, z: 1.17 };
  return g;
}

/** Sand Hill Road's landscaped median, L long and W wide along +Z: a granite kerb, a lawn, and clipped hedges. */
export function medianIsland(L = 42, W = 4.8) {
  const b = new ModelBuilder(), r = W / 2;
  const s = new THREE.Shape();
  s.absarc(0, L / 2 - r, r, 0, Math.PI, false); s.absarc(0, -L / 2 + r, r, Math.PI, Math.PI * 2, false); s.closePath();
  const kerb = new THREE.ExtrudeGeometry(s, { depth: 0.45, bevelEnabled: true, bevelThickness: 0.08, bevelSize: 0.1, bevelSegments: 2, curveSegments: 10 });
  kerb.rotateX(-Math.PI / 2);
  b.add('kerb', kerb, {});
  const top = new THREE.ShapeGeometry(s, 10); top.rotateX(-Math.PI / 2);
  b.add('lawn', top, { p: [0, 0.56, 0], s: [0.86, 1, 0.97] });
  for (let z = -L / 2 + 4; z <= L / 2 - 4; z += 3.2) b.add('hedge', box(1.4, 1.0, 2.4, 0.4, 2), { p: [0, 1.05, z] });
  const m = farmMats();
  return b.build({ kerb: plastic(0xb9bcc4, 0.7, 0.05), lawn: m.lawn, hedge: m.hedge });
}

/** The LP lane's gate: two wrought-iron leaves, each w wide, hinged on their outer ends (x = -w and x = +w), shut across
    the lane along X. userData.leaves: [left, right] groups to swing open (rotation.y). Gold finials. */
export function lpGate(w = 3.6) {
  const grp = new THREE.Group(), leaves = [];
  const m = farmMats();
  for (const s of [-1, 1]) {
    const b = new ModelBuilder();
    for (let x = 0.15; x < w; x += 0.32) { b.add('iron', bx(0.07, 2.3, 0.07), { p: [-s * x, 1.35, 0] }); b.add('gold', cone(0.07, 0.22, 6), { p: [-s * x, 2.6, 0] }); }
    for (const y of [0.35, 1.3, 2.3]) b.add('iron', bx(w, 0.09, 0.09), { p: [-s * w / 2, y, 0] });
    const leaf = b.build({ iron: m.iron, gold: m.gold }); leaf.position.x = s * w; grp.add(leaf); leaves.push(leaf);
    const pb = new ModelBuilder();
    pb.add('trim', bx(0.9, 3.4, 0.9), { p: [s * (w + 0.45), 1.7, 0] }); pb.add('gold', sphere(0.35, 10, 8), { p: [s * (w + 0.45), 3.7, 0] });
    grp.add(pb.build({ trim: m.trim, gold: m.gold }));
  }
  grp.userData.leaves = leaves;
  return grp;
}
