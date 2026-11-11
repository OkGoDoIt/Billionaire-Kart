/* Scenery prop library. Each builder returns a THREE.Group sitting on y = 0,
   facing +Z, made of a few merged meshes. Use scenery.partsOf() to instance
   the small ones. Keep everything chunky, rounded, and readable at speed. */
import * as THREE from 'three';
import { ModelBuilder, box, sphere, cyl, cone, torus, tube, lathe, loft, plastic, glow, paint, MAT } from './build.js';
import { canvasTex } from '../render/textures.js';
import { makeRng } from '../core/util.js';

const tintable = (color, rough = 0.85) => { const m = new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: 0, envMapIntensity: 0.5 }); m.userData.tintable = true; return m; };
const leafMat = {};
const leaf = color => leafMat[color] || (leafMat[color] = new THREE.MeshStandardMaterial({ color, roughness: 0.9, metalness: 0, envMapIntensity: 0.45, flatShading: false }));
const BARK = plastic(0x8a5a3a, 0.95), BARK_PALM = plastic(0x9a7a55, 0.95);

/** A lumpy blob: an icosphere pushed around by smooth noise, for foliage and rocks. */
function blob(r, seed = 1, lump = 0.22, detail = 2) {
  const g = new THREE.IcosahedronGeometry(r, detail), p = g.attributes.position, rng = makeRng(seed);
  const ph = [rng() * 6, rng() * 6, rng() * 6];
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const n = Math.sin(x * 2.3 / r + ph[0]) * Math.cos(y * 2.1 / r + ph[1]) + Math.sin(z * 2.7 / r + ph[2]) * 0.6;
    const k = 1 + n * lump * 0.5;
    p.setXYZ(i, x * k, y * k, z * k);
  }
  const merged = g.index ? g : g; merged.computeVertexNormals();
  return g;
}

/* ---------- plants ---------- */
export function roundTree(seed = 1, { h = 7, leafA = 0x4fae3f, leafB = 0x6fc94a } = {}) {
  const rng = makeRng(seed), b = new ModelBuilder();
  b.add('bark', cyl(0.28, 0.42, h * 0.5, 9), { p: [0, h * 0.25, 0] });
  const crowns = 3 + Math.floor(rng() * 2);
  for (let i = 0; i < crowns; i++) {
    const a = rng() * Math.PI * 2, d = i === 0 ? 0 : h * 0.16, r = h * (0.26 + rng() * 0.08) * (i === 0 ? 1.15 : 0.9);
    b.add(i % 2 ? 'leafB' : 'leafA', blob(r, seed * 7 + i, 0.25, 2), { p: [Math.cos(a) * d, h * (0.62 + rng() * 0.16), Math.sin(a) * d], s: [1, 0.86, 1] });
  }
  return b.build({ bark: BARK, leafA: leaf(leafA), leafB: leaf(leafB) });
}

export function cypress(seed = 1, { h = 11, color = 0x2f7d3a } = {}) {
  const b = new ModelBuilder();
  b.add('bark', cyl(0.18, 0.24, h * 0.14, 7), { p: [0, h * 0.07, 0] });
  const g = lathe([[0, 0], [0.75, 0.06], [0.95, 0.22], [0.85, 0.5], [0.55, 0.8], [0.2, 0.96], [0, 1]], 12);
  b.add('leaf', g, { p: [0, h * 0.1, 0], s: [h * 0.14, h * 0.9, h * 0.14] });
  void seed;
  return b.build({ bark: BARK, leaf: leaf(color) });
}

function frond(len = 3.2, width = 0.9, droop = 1.5, segs = 7) {
  const pos = [], uv = [], idx = [];
  for (let i = 0; i <= segs; i++) {
    const t = i / segs, x = len * t, y = Math.sin(t * 1.25) * len * 0.22 - droop * t * t, w = width * Math.sin(Math.PI * Math.min(1, t * 0.92 + 0.08)) * 0.5 + 0.03;
    pos.push(x, y - 0.12 * Math.abs(1) * (w), -w, x, y + 0.1, 0, x, y - 0.12 * w, w); uv.push(t, 0, t, 0.5, t, 1);
    if (i < segs) { const a = i * 3; idx.push(a, a + 3, a + 1, a + 1, a + 3, a + 4, a + 1, a + 4, a + 2, a + 2, a + 4, a + 5); }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals();
  return g;
}
const palmLeaf = new THREE.MeshStandardMaterial({ color: 0x3f9a3a, roughness: 0.85, side: THREE.DoubleSide, envMapIntensity: 0.4 });
export function palm(seed = 1, { h = 9 } = {}) {
  const rng = makeRng(seed), b = new ModelBuilder();
  const lean = (rng() - 0.5) * 1.6, lz = (rng() - 0.5) * 1.6;
  b.add('bark', tube([[0, 0, 0], [lean * 0.25, h * 0.35, lz * 0.25], [lean * 0.7, h * 0.7, lz * 0.7], [lean, h, lz]], 0.24, 12, 8));
  b.add('bark', sphere(0.42, 10, 8), { p: [lean, h, lz], s: [1, 0.8, 1] });
  const n = 8;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + rng() * 0.4;
    b.add('leaf', frond(3.0 + rng() * 0.8, 0.95, 1.2 + rng() * 0.9), { p: [lean, h + 0.15, lz], r: [0, a, 0.15 + rng() * 0.25] });
  }
  return b.build({ bark: BARK_PALM, leaf: palmLeaf });
}

export function bush(seed = 1, { color = 0x58b548, flower = null } = {}) {
  const rng = makeRng(seed), b = new ModelBuilder();
  for (let i = 0; i < 3; i++) b.add('leaf', blob(0.7 + rng() * 0.35, seed * 3 + i, 0.3, 1), { p: [(rng() - 0.5) * 1.2, 0.45 + rng() * 0.2, (rng() - 0.5) * 1.2], s: [1, 0.75, 1] });
  if (flower != null) for (let i = 0; i < 7; i++) { const a = rng() * 6.28, d = rng() * 0.9; b.add('flower', sphere(0.11, 6, 5), { p: [Math.cos(a) * d, 0.85 + rng() * 0.35, Math.sin(a) * d] }); }
  return b.build({ leaf: leaf(color), flower: plastic(flower ?? 0xffffff, 0.6) });
}

export function rock(seed = 1, { r = 1.2, color = 0x9a938a } = {}) {
  const g = blob(r, seed, 0.5, 1); g.scale(1, 0.7, 1.15);
  const m = new THREE.Mesh(g, tintable(color, 0.95)); m.position.y = r * 0.3;
  const grp = new THREE.Group(); grp.add(m); return grp;
}

/* ---------- trackside furniture ---------- */
/** Corner arrow board: red and white chevrons pointing along +X (flip with scale.x = -1). */
export function chevronBoard(color = 0xe23b3b) {
  const tex = canvasTex(256, 96, (g, w, h) => {
    g.fillStyle = '#f7f7f2'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#' + new THREE.Color(color).getHexString();
    for (let i = 0; i < 4; i++) { const x = i * 64 + 8; g.beginPath(); g.moveTo(x, 8); g.lineTo(x + 26, 8); g.lineTo(x + 52, h / 2); g.lineTo(x + 26, h - 8); g.lineTo(x, h - 8); g.lineTo(x + 26, h / 2); g.closePath(); g.fill(); }
  }, { repeat: false, aniso: 8 });
  const grp = new THREE.Group();
  const panel = new THREE.Mesh(new THREE.PlaneGeometry(4.2, 1.5), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.6, side: THREE.DoubleSide }));
  panel.position.y = 1.55; grp.add(panel);
  const b = new ModelBuilder();
  for (const sx of [1, -1]) b.add('post', cyl(0.07, 0.07, 1.7, 6), { p: [sx * 1.9, 0.75, -0.06] });
  b.add('post', box(4.3, 1.6, 0.06, 0.02, 1), { p: [0, 1.55, -0.04] });
  grp.add(b.build({ post: MAT.dark }));
  return grp;
}

export function tyreStack(n = 3, color = 0x1b1c20) {
  const b = new ModelBuilder();
  for (let i = 0; i < n; i++) b.add(i % 2 ? 'b' : 'a', torus(0.42, 0.2, 8, 14), { p: [0, 0.2 + i * 0.36, 0], r: [Math.PI / 2, 0, 0] });
  return b.build({ a: plastic(color, 0.9), b: plastic(0xf2f2ee, 0.7) });
}

export function cone3d() {
  const b = new ModelBuilder();
  b.add('o', cone(0.28, 0.75, 12), { p: [0, 0.42, 0] }); b.add('w', cyl(0.17, 0.21, 0.14, 12), { p: [0, 0.42, 0] }); b.add('o', box(0.66, 0.06, 0.66, 0.02, 1), { p: [0, 0.03, 0] });
  return b.build({ o: plastic(0xff7a1a, 0.6), w: MAT.white });
}

/** Big billboard on legs. `map` is any texture (2:1). */
export function billboard(map, { w = 14, h = 7, legs = 7, frame = 0x23252c } = {}) {
  const grp = new THREE.Group(), b = new ModelBuilder();
  for (const sx of [1, -1]) { b.add('f', cyl(0.28, 0.34, legs + h * 0.5, 8), { p: [sx * w * 0.32, (legs + h * 0.5) / 2, -0.3] }); }
  b.add('f', box(w + 0.6, h + 0.6, 0.4, 0.1, 2), { p: [0, legs + h / 2, -0.22] });
  b.add('f', box(w * 0.8, 0.2, 1.0, 0.05, 1), { p: [0, legs - 0.3, 0.2] });
  for (let i = 0; i < 4; i++) b.add('lamp', box(0.5, 0.16, 0.5, 0.04, 1), { p: [(i - 1.5) * w * 0.24, legs + h + 0.5, 0.75] });
  grp.add(b.build({ f: plastic(frame, 0.6, 0.3), lamp: glow(0xfff0c8, 1.2) }));
  const panel = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map, roughness: 0.55, metalness: 0, emissiveMap: map, emissive: 0xffffff, emissiveIntensity: 0.12 }));
  panel.position.set(0, legs + h / 2, 0.0); grp.add(panel);
  return grp;
}

/** Start/finish gantry spanning `span` metres, with a sign and start lights. */
export function gantry(span = 20, title = 'BILLIONAIRE KART', { color = 0xe23b3b, color2 = 0xffd23c } = {}) {
  const grp = new THREE.Group(), b = new ModelBuilder(), H = 9.2;
  for (const sx of [1, -1]) {
    b.add('tower', box(1.8, H, 1.8, 0.25, 3), { p: [sx * (span / 2 + 1.4), H / 2, 0] });
    b.add('trim', box(2.3, 0.7, 2.3, 0.2, 2), { p: [sx * (span / 2 + 1.4), 0.35, 0] });
    b.add('trim', box(2.2, 0.5, 2.2, 0.2, 2), { p: [sx * (span / 2 + 1.4), H + 0.2, 0] });
    b.add('cap', sphere(0.9, 14, 10), { p: [sx * (span / 2 + 1.4), H + 0.9, 0] });
  }
  b.add('beam', box(span + 5.6, 2.6, 1.3, 0.3, 3), { p: [0, H - 0.6, 0] });
  b.add('trim', box(span + 6, 0.35, 1.6, 0.1, 2), { p: [0, H - 2.0, 0] });
  b.add('trim', box(span + 6, 0.35, 1.6, 0.1, 2), { p: [0, H + 0.8, 0] });
  // start light pod
  b.add('dark', box(5.2, 1.0, 0.7, 0.2, 2), { p: [0, H - 2.9, 0.1] });
  grp.add(b.build({ tower: paint(color, { rough: 0.45, clear: 0.3 }), trim: plastic(0xf4f4f0, 0.5), cap: paint(color2, { rough: 0.3, clear: 0.5 }), beam: plastic(0x1d2030, 0.5), dark: MAT.dark }));
  const tex = canvasTex(1024, 128, (g, w, h) => {
    g.fillStyle = '#1d2030'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 16; i++) for (let j = 0; j < 2; j++) { g.fillStyle = (i + j) % 2 ? '#ffffff' : '#12142b'; g.fillRect(i * 16, j * 16, 16, 16); g.fillRect(w - 256 + i * 16, j * 16 + 96, 16, 16); }
    g.font = '92px "Luckiest Guy", "Arial Black", sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.lineWidth = 10; g.strokeStyle = '#12142b'; g.strokeText(title, w / 2, h / 2 + 6, w - 60);
    g.fillStyle = '#' + new THREE.Color(color2).getHexString(); g.fillText(title, w / 2, h / 2 + 6, w - 60);
  }, { repeat: false, aniso: 8 });
  for (const s of [1, -1]) {
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(span + 4.6, 2.2), new THREE.MeshStandardMaterial({ map: tex, emissiveMap: tex, emissive: 0xffffff, emissiveIntensity: 0.25, roughness: 0.5 }));
    sign.position.set(0, H - 0.6, s * 0.67); sign.rotation.y = s > 0 ? 0 : Math.PI; grp.add(sign);
  }
  // five start lights facing the grid (-Z side is where karts line up, looking +Z)
  const lights = [];
  for (let i = 0; i < 5; i++) { const m = new THREE.Mesh(sphere(0.34, 12, 10), new THREE.MeshStandardMaterial({ color: 0x220808, emissive: 0xff2a2a, emissiveIntensity: 0, roughness: 0.3 })); m.position.set((i - 2) * 0.95, H - 2.9, -0.32); grp.add(m); lights.push(m); }
  grp.userData.lights = lights;
  return grp;
}

/** Grandstand with a canopy. Returns { group, seats: [[x,y,z]...] } so a crowd can be instanced on it. */
export function grandstand({ w = 30, rows = 6, color = 0x2f6bff } = {}) {
  const grp = new THREE.Group(), b = new ModelBuilder(), seats = [];
  for (let r = 0; r < rows; r++) {
    b.add(r % 2 ? 'stepB' : 'stepA', box(w, 0.7, 1.5, 0.08, 1), { p: [0, 0.9 + r * 0.7, -r * 1.4] });
    for (let x = -w / 2 + 0.7; x < w / 2 - 0.4; x += 0.95) seats.push([x, 1.25 + r * 0.7, -r * 1.4]);
  }
  b.add('base', box(w + 0.8, 1.1, rows * 1.4 + 1.2, 0.1, 1), { p: [0, 0.55, -(rows - 1) * 0.7] });
  b.add('wall', box(w + 0.8, rows * 0.7 + 3.4, 0.5, 0.1, 1), { p: [0, (rows * 0.7 + 3.4) / 2, -rows * 1.4 - 0.2] });
  for (const sx of [1, -1]) for (const z of [0.4, -rows * 1.4]) b.add('post', cyl(0.16, 0.16, rows * 0.7 + 5, 8), { p: [sx * (w / 2 + 0.1), (rows * 0.7 + 5) / 2, z] });
  b.add('roof', box(w + 2.4, 0.3, rows * 1.4 + 4, 0.1, 2), { p: [0, rows * 0.7 + 5.1, -rows * 0.7 + 0.6], r: [0.1, 0, 0] });
  b.add('trimr', box(w + 2.6, 0.5, 0.4, 0.1, 1), { p: [0, rows * 0.7 + 4.75, 2.1] });
  grp.add(b.build({ stepA: plastic(0xd9dde6, 0.8), stepB: plastic(0xc6ccd8, 0.8), base: plastic(0x8b93a6, 0.8), wall: paint(color, { rough: 0.5, clear: 0.2 }), post: MAT.steel, roof: plastic(0xf4f4f0, 0.5), trimr: paint(0xffd23c, { rough: 0.4 }) }));
  return { group: grp, seats };
}

/** One spectator (instance it over grandstand seats with random tints). */
export function spectator() {
  const b = new ModelBuilder();
  b.add('body', cyl(0.26, 0.3, 0.62, 8), { p: [0, 0.31, 0] });
  b.add('body', sphere(0.27, 8, 6), { p: [0, 0.62, 0] });
  b.add('head', sphere(0.21, 9, 7), { p: [0, 0.98, 0] });
  const body = tintable(0xffffff, 0.8);
  return b.build({ body, head: plastic(0xe6b98f, 0.7) });
}
export const CROWD_TINTS = [0xff4d6d, 0x38b6ff, 0xffd23c, 0x2ee6a6, 0xffffff, 0x9b6bff, 0xff8a3c, 0x1f2a44, 0xf06292, 0x4dd0e1];

/* ---------- buildings ---------- */
function windowTex(cols = 8, rows = 4, glass = '#7fd0ff', frame = '#f2f4f8', seed = 1) {
  return canvasTex(512, 256, (g, w, h) => {
    const rng = makeRng(seed);
    g.fillStyle = frame; g.fillRect(0, 0, w, h);
    const cw = w / cols, ch = h / rows;
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      const gr = g.createLinearGradient(0, r * ch, 0, (r + 1) * ch);
      gr.addColorStop(0, glass); gr.addColorStop(1, '#2f6fb0');
      g.fillStyle = gr; g.fillRect(c * cw + 5, r * ch + 7, cw - 10, ch - 14);
      g.fillStyle = `rgba(255,255,255,${0.12 + rng() * 0.3})`; g.beginPath(); g.moveTo(c * cw + 5, r * ch + 7); g.lineTo(c * cw + cw * 0.55, r * ch + 7); g.lineTo(c * cw + cw * 0.25, (r + 1) * ch - 7); g.lineTo(c * cw + 5, (r + 1) * ch - 7); g.fill();
    }
  }, { aniso: 4 });
}
const texCache = {};
/** Low campus block with ribbon windows and a green roof. */
export function campusBlock(seed = 1, { w = 22, d = 14, floors = 3, color = 0xf2f4f8, accent = 0x38b6ff } = {}) {
  const key = 'win' + (seed % 4);
  const tex = texCache[key] || (texCache[key] = windowTex(8, 2, ['#8fd8ff', '#9ff0e0', '#a8c8ff', '#ffe6a8'][seed % 4], '#f2f4f8', seed));
  const grp = new THREE.Group(), H = floors * 3.4;
  const wall = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.35, metalness: 0.1, envMapIntensity: 1 });
  for (const [sx, sz, len, ry] of [[0, d / 2, w, 0], [0, -d / 2, w, Math.PI], [w / 2, 0, d, Math.PI / 2], [-w / 2, 0, d, -Math.PI / 2]]) {
    const g = new THREE.PlaneGeometry(len, H); const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * (len / 11), uv.getY(i) * (floors / 2));
    const m = new THREE.Mesh(g, wall); m.position.set(sx, H / 2, sz); m.rotation.y = ry; grp.add(m);
  }
  const b = new ModelBuilder();
  b.add('roof', box(w + 1.2, 0.5, d + 1.2, 0.15, 2), { p: [0, H + 0.25, 0] });
  b.add('green', box(w - 1.5, 0.3, d - 1.5, 0.1, 1), { p: [0, H + 0.55, 0] });
  b.add('accent', box(w + 1.3, 0.45, d + 1.3, 0.15, 2), { p: [0, 0.22, 0] });
  b.add('accent', box(4.5, 3.2, 0.6, 0.2, 2), { p: [0, 1.6, d / 2 + 0.2] });
  b.add('roof', box(3, 1.6, 3, 0.2, 2), { p: [w * 0.25, H + 1.2, -d * 0.2] });
  grp.add(b.build({ roof: plastic(color, 0.6), green: leaf(0x67c04f), accent: paint(accent, { rough: 0.4, clear: 0.3 }) }));
  return grp;
}

/** The Ring: a glass doughnut headquarters around a central garden. */
export function ringHQ({ R = 70, band = 15, H = 13 } = {}) {
  const grp = new THREE.Group();
  const tex = texCache.ring || (texCache.ring = windowTex(8, 3, '#9fe6ff', '#fafcff', 9));
  const glass = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.18, metalness: 0.35, envMapIntensity: 1.5, side: THREE.DoubleSide });
  for (const [r, inside] of [[R, false], [R - band, true]]) {
    const g = new THREE.CylinderGeometry(r, r, H, 96, 1, true);
    const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * Math.round((2 * Math.PI * r) / 16), uv.getY(i));
    const m = new THREE.Mesh(g, glass); m.position.y = H / 2; if (inside) m.scale.x = 1; grp.add(m);
  }
  const roofG = new THREE.RingGeometry(R - band - 0.8, R + 0.8, 96, 1); roofG.rotateX(-Math.PI / 2);
  const roof = new THREE.Mesh(roofG, plastic(0xf6f8fb, 0.45)); roof.position.y = H; grp.add(roof);
  const sol = new THREE.RingGeometry(R - band + 2.5, R - 2.5, 96, 1); sol.rotateX(-Math.PI / 2);
  const solar = new THREE.Mesh(sol, new THREE.MeshStandardMaterial({ color: 0x1b2f5a, roughness: 0.2, metalness: 0.8, envMapIntensity: 1.4 })); solar.position.y = H + 0.12; grp.add(solar);
  const rimG = new THREE.TorusGeometry(R + 0.4, 0.5, 6, 96); rimG.rotateX(Math.PI / 2);
  for (const y of [0.4, H]) { const rim = new THREE.Mesh(rimG, plastic(0xf6f8fb, 0.4)); rim.position.y = y; grp.add(rim); }
  return grp;
}

/** Rocket on its pad with a service tower. userData.rocket is the part that launches. */
export function rocketPad({ h = 34 } = {}) {
  const grp = new THREE.Group(), b = new ModelBuilder();
  b.add('pad', cyl(11, 12.5, 1.6, 10), { p: [0, 0.8, 0] });
  b.add('dark', cyl(5, 5.4, 0.8, 16), { p: [0, 2.0, 0] });
  // lattice tower
  for (const [x, z] of [[-6.5, -1.4], [-6.5, 1.4], [-9.3, -1.4], [-9.3, 1.4]]) b.add('steel', cyl(0.22, 0.22, h * 0.92, 6), { p: [x, h * 0.46 + 1.6, z] });
  for (let i = 0; i < 9; i++) { const y = 3 + i * (h * 0.1); b.add('steel', box(3.2, 0.25, 3.2, 0.05, 1), { p: [-7.9, y, 0] }); if (i % 3 === 1) b.add('red', box(5, 0.4, 0.8, 0.1, 1), { p: [-4.6, y, 0] }); }
  b.add('red', box(3.6, 1.2, 3.6, 0.2, 1), { p: [-7.9, h * 0.92 + 2.1, 0] });
  grp.add(b.build({ pad: plastic(0xb8bcc6, 0.8), dark: MAT.dark, steel: MAT.steel, red: paint(0xe23b3b, { rough: 0.5 }) }));
  const r = new ModelBuilder(), R = 2.3;
  r.add('white', lathe([[0, 0], [R, 0], [R, h * 0.62], [R * 0.86, h * 0.76], [R * 0.5, h * 0.9], [R * 0.12, h * 0.985], [0, h]], 20));
  r.add('black', cyl(R * 1.015, R * 1.015, h * 0.045, 20, true), { p: [0, h * 0.2, 0] });
  r.add('black', cyl(R * 1.015, R * 1.015, h * 0.03, 20, true), { p: [0, h * 0.6, 0] });
  r.add('black', lathe([[R * 0.75, 0], [R * 1.05, -h * 0.06], [R * 0.55, -h * 0.06]], 16));
  for (let i = 0; i < 4; i++) { const a = (i / 4) * Math.PI * 2 + Math.PI / 4; r.add('fin', box(0.24, h * 0.18, R * 1.3, 0.08, 1), { p: [Math.cos(a) * R * 1.35, h * 0.08, Math.sin(a) * R * 1.35], r: [0, -a + Math.PI / 2, 0] }); }
  r.add('accent', cyl(R * 1.02, R * 1.02, h * 0.02, 20, true), { p: [0, h * 0.42, 0] });
  const rocket = r.build({ white: paint(0xf6f7f9, { rough: 0.3, clear: 0.6 }), black: plastic(0x16171c, 0.4), fin: paint(0xe23b3b, { rough: 0.4 }), accent: paint(0xe23b3b, { rough: 0.4 }) });
  rocket.position.y = 2.6 + h * 0.06; grp.add(rocket);
  grp.userData.rocket = rocket; grp.userData.rocketBase = rocket.position.y; grp.userData.h = h;
  return grp;
}

/** Hot-air balloon for the sky. */
export function balloon(colors = [0xff4d6d, 0xffd23c], seed = 1) {
  const grp = new THREE.Group(), R = 6;
  const tex = canvasTex(256, 64, (g, w, h) => { for (let i = 0; i < 8; i++) { g.fillStyle = '#' + new THREE.Color(colors[i % colors.length]).getHexString(); g.fillRect(i * 32, 0, 32, h); } }, { aniso: 2 });
  const env = new THREE.Mesh(lathe([[0, -1.25], [0.34, -1.1], [0.72, -0.6], [0.98, -0.05], [1, 0.3], [0.82, 0.72], [0.45, 0.95], [0, 1]], 20), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.6 }));
  env.scale.setScalar(R); env.position.y = R * 1.9; grp.add(env);
  const b = new ModelBuilder();
  b.add('basket', box(1.6, 1.3, 1.6, 0.2, 2), { p: [0, 0, 0] });
  for (const [x, z] of [[0.7, 0.7], [-0.7, 0.7], [0.7, -0.7], [-0.7, -0.7]]) b.add('rope', cyl(0.03, 0.03, R * 0.75, 4), { p: [x, R * 0.37, z] });
  grp.add(b.build({ basket: plastic(0x9a6a3a, 0.9), rope: MAT.dark }));
  void seed; return grp;
}

/** Blimp with a banner message on its side. */
export function blimp(text = 'BILLIONAIRE KART', { color = 0xf4f4f0, accent = 0xff4d6d } = {}) {
  const grp = new THREE.Group();
  const tex = canvasTex(1024, 256, (g, w, h) => {
    g.fillStyle = '#' + new THREE.Color(color).getHexString(); g.fillRect(0, 0, w, h);
    g.fillStyle = '#' + new THREE.Color(accent).getHexString(); g.fillRect(0, h * 0.78, w, h * 0.22); g.fillRect(0, 0, w, h * 0.1);
    g.font = '120px "Luckiest Guy", "Arial Black", sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = '#12142b';
    g.fillText(text, w * 0.25, h * 0.46, w * 0.44); g.fillText(text, w * 0.75, h * 0.46, w * 0.44);
  }, { aniso: 8 });
  const body = new THREE.Mesh(sphere(1, 28, 18), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.45 }));
  body.scale.set(22, 7, 7); body.rotation.y = Math.PI / 2; grp.add(body);
  const b = new ModelBuilder();
  b.add('a', box(0.4, 6, 5, 0.1, 1), { p: [0, 0, -18] }); b.add('a', box(6, 0.4, 5, 0.1, 1), { p: [0, 0, -18] });
  b.add('g', box(2.2, 1.6, 6, 0.5, 2), { p: [0, -7.4, 2] });
  grp.add(b.build({ a: paint(accent, { rough: 0.5 }), g: plastic(0x2a2d36, 0.5) }));
  grp.rotation.y = 0; return grp;
}

void loft; void tube;
