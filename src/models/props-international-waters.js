/* Props for International Waters: channel buoys, floating signs, the seastead
   platform (now with a driving corridor across its deck), lantern strings over
   the causeway, a dry dock straddling the north straight, a customs checkpoint,
   a brass mailbox wall, a flag shop and pontoon sponsor hoardings.
   Each builder returns a THREE.Group sitting on y = 0 (the waterline for the
   floating pieces, the deck for the standing ones), facing +Z.
   Canvas textures are only made when a builder runs (browser only). All sign
   text goes through fitText: it shrinks to fit and never squashes, and
   boardMesh textures both faces, so every board has a finished back. */
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { ModelBuilder, box, sphere, cyl, cone, torus, tube, lathe, loft, capsule, plastic, glow, paint, MAT } from './build.js';
import { canvasTex, fitText } from '../render/textures.js';

const FONT = '"Luckiest Guy", "Arial Black", sans-serif';
const CREAM = 0xf3ead2, NAVY = 0x10222e;

/** A harbour notice board texture: cream letters on deep navy, thin gold rule. */
export function boardTex(lines, { w = 1024, h = 256, bg = '#10222e', fg = '#f3ead2', accent = '#e8b64c' } = {}) {
  return canvasTex(w, h, (g, W, H) => {
    g.fillStyle = bg; g.fillRect(0, 0, W, H);
    g.fillStyle = accent; g.fillRect(0, 10, W, 6); g.fillRect(0, H - 16, W, 6);
    const n = lines.length;
    lines.forEach((text, i) => {
      const size = n === 1 ? 150 : (i === 0 ? 124 : 86);
      const maxH = n === 1 ? H * 0.6 : H * 0.4;
      fitText(g, text, W / 2, H * (n === 1 ? 0.54 : (i === 0 ? 0.36 : 0.74)), W - 70, maxH, size, FONT, { fill: i === 0 ? fg : accent });
    });
  }, { repeat: false, aniso: 8 });
}

/** A board textured on both faces over a navy backing box: finished from behind. */
export function boardMesh(lines, w, h, opts) {
  const tex = boardTex(lines, opts);
  const mat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.55 });
  const grp = new THREE.Group();
  const back = new THREE.Mesh(new THREE.BoxGeometry(w + 0.3, h + 0.3, 0.22),
    new THREE.MeshStandardMaterial({ color: NAVY, roughness: 0.7 }));
  grp.add(back);
  for (const s of [1, -1]) {
    const face = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
    face.position.z = s * 0.13; if (s < 0) face.rotation.y = Math.PI;
    grp.add(face);
  }
  return grp;
}

/* ---------- the buoy ring ---------- */
/** Channel marker buoy, about 2.6 m tall, waterline at y = 0.35. */
export function channelBuoy(color = 0xd9403a) {
  const grp = new THREE.Group(), b = new ModelBuilder();
  b.add('base', cyl(1.05, 1.2, 0.5, 14), { p: [0, 0.1, 0] });
  b.add('body', lathe([[0.02, 0.3], [0.78, 0.35], [0.92, 0.8], [0.62, 1.45], [0.4, 1.95], [0.34, 2.1]], 16), {});
  b.add('dark', cyl(0.07, 0.07, 0.5, 8), { p: [0, 2.3, 0] });
  b.add('lamp', sphere(0.21, 12, 10), { p: [0, 2.62, 0] });
  const mats = { base: MAT.dark, body: paint(color, { rough: 0.42, clear: 0.5 }), dark: MAT.dark, lamp: glow(0xffd9a0, 2.2) };
  grp.add(b.build(mats));
  return grp;
}

/** The start-line buoy sign: a floating notice board on two drum floats. */
export function signBuoy(title = 'INTERNATIONAL WATERS', sub = 'NO JURISDICTION BEYOND THIS POINT') {
  const grp = new THREE.Group(), b = new ModelBuilder();
  for (const s of [1, -1]) {
    b.add('float', cyl(0.85, 0.85, 2.6, 12), { p: [s * 2.6, 0.1, 0], r: [0, 0, Math.PI / 2] });
    b.add('post', cyl(0.09, 0.11, 2.6, 8), { p: [s * 2.6, 1.5, 0] });
  }
  b.add('dark', cyl(0.06, 0.06, 0.7, 8), { p: [0, 3.6, 0] });
  b.add('lamp', sphere(0.17, 10, 8), { p: [0, 4.0, 0] });
  const mats = { float: paint(0xd9403a, { rough: 0.5 }), post: MAT.dark, dark: MAT.dark, lamp: glow(0xff5f4a, 2.4) };
  grp.add(b.build(mats));
  const board = boardMesh([title, sub], 7.6, 1.9);
  board.position.set(0, 2.6, 0); grp.add(board);
  return grp;
}

/* ---------- signs that stand on the deck ---------- */
/** A harbour sign on two posts, board centre about 3.4 m up. */
export function flagSign(lines, { w = 9 } = {}) {
  const grp = new THREE.Group(), b = new ModelBuilder();
  for (const s of [1, -1]) b.add('post', cyl(0.11, 0.14, 4.6, 8), { p: [s * (w / 2 - 0.5), 2.3, 0] });
  b.add('lamp', sphere(0.15, 10, 8), { p: [-(w / 2 - 0.5), 4.75, 0] });
  b.add('lamp', sphere(0.15, 10, 8), { p: [w / 2 - 0.5, 4.75, 0] });
  grp.add(b.build({ post: MAT.dark, lamp: glow(0xffd9a0, 2) }));
  const board = boardMesh(lines, w, w * 0.24);
  board.position.set(0, 3.35, 0); grp.add(board);
  return grp;
}

/* ---------- lantern strings (the water frame's big dressing move) ---------- */
/** Two poles and a sagging cable of paper lanterns, spanning the road. */
export function lanternString(span = 26) {
  const grp = new THREE.Group(), b = new ModelBuilder();
  const H = 7.6, sag = 2.1, half = span / 2;
  for (const s of [1, -1]) {
    b.add('pole', cyl(0.09, 0.14, H, 8), { p: [s * half, H / 2, 0] });
    b.add('lamp', sphere(0.2, 10, 8), { p: [s * half, H + 0.25, 0] });
  }
  const cable = [];
  for (let k = 0; k <= 8; k++) { const t = k / 8; cable.push([(t - 0.5) * span, H - sag * 4 * t * (1 - t), 0]); }
  b.add('dark', tube(cable, 0.035, 32, 5), {});
  const n = 9;
  for (let k = 0; k < n; k++) {
    const t = (k + 0.5) / n, x = (t - 0.5) * span, y = H - sag * 4 * t * (1 - t);
    b.add('dark', cyl(0.03, 0.03, 0.34, 6), { p: [x, y - 0.17, 0] });
    b.add(k % 2 ? 'paper' : 'red', cyl(0.30, 0.30, 0.44, 10), { p: [x, y - 0.56, 0] });
    b.add('glow', sphere(0.17, 8, 6), { p: [x, y - 0.56, 0] });
  }
  const mats = {
    pole: MAT.dark, dark: MAT.dark, lamp: glow(0xffd9a0, 2),
    paper: plastic(0xf3e2c2, 0.85), red: plastic(0xd94f3d, 0.85), glow: glow(0xffb45e, 1.5),
  };
  grp.add(b.build(mats));
  return grp;
}

/* ---------- the customs checkpoint ---------- */
/** One customs booth for the checkpoint on the west return: glass band, slab
    roof, CUSTOMS board on top. About 3.4 m wide, origin at the deck. */
export function customsBooth() {
  const grp = new THREE.Group(), b = new ModelBuilder();
  b.add('base', box(3.4, 1.1, 2.6, 0.15, 2), { p: [0, 0.55, 0] });
  b.add('glass', box(3.2, 1.3, 2.4, 0.05, 1), { p: [0, 1.75, 0] });
  b.add('roof', box(4.1, 0.35, 3.3, 0.12, 2), { p: [0, 2.6, 0] });
  b.add('stripe', box(3.45, 0.3, 2.65, 0.05, 1), { p: [0, 1.02, 0] });
  b.add('dark', box(0.3, 0.55, 0.3, 0.05, 1), { p: [0, 2.95, 0] });
  grp.add(b.build({
    base: paint(0xe8e4da, { rough: 0.6 }), glass: plastic(0x1d3346, 0.15, 0.6),
    roof: paint(0x1d5c46, { rough: 0.5 }), stripe: paint(0xe8b64c, { rough: 0.5 }), dark: MAT.dark,
  }));
  const sign = boardMesh(['CUSTOMS'], 3.6, 0.95);
  sign.position.set(0, 3.55, 0); grp.add(sign);
  return grp;
}

/* ---------- the brass mailbox wall ---------- */
/** One address, four thousand companies: a pontoon wall of little brass
    mailbox doors (drawn into the texture), header carrying the joke.
    34 m long along local X, face +Z, waterline at y = 0. */
export function mailboxWall() {
  const grp = new THREE.Group(), b = new ModelBuilder();
  b.add('pontoon', box(36, 1.1, 3.4, 0.25, 2), { p: [0, -0.4, 0] });
  for (const x of [-15, 0, 15]) b.add('post', box(0.4, 3.2, 0.4, 0.1, 1), { p: [x, 1.2, -0.2] });
  grp.add(b.build({ pontoon: plastic(0x37424e, 0.7, 0.3), post: MAT.steel }));
  const tex = canvasTex(2048, 288, (g, W, H) => {
    g.fillStyle = '#241a10'; g.fillRect(0, 0, W, H);
    g.fillStyle = '#10222e'; g.fillRect(0, 0, W, 74);
    fitText(g, 'ONE ADDRESS — 4,000 COMPANIES', W / 2, 40, W - 80, 56, 54, FONT, { fill: '#f3ead2' });
    const cols = 56, rows = 3, x0 = 26, y0 = 92, cw = (W - 52) / cols, chh = (H - y0 - 14) / rows;
    let n = 1000;
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      const x = x0 + c * cw, y = y0 + r * chh;
      const grad = g.createLinearGradient(x, y, x, y + chh);
      grad.addColorStop(0, '#d9a84e'); grad.addColorStop(0.5, '#b4832e'); grad.addColorStop(1, '#8a5f1c');
      g.fillStyle = grad; g.fillRect(x + 1.5, y + 1.5, cw - 3, chh - 3);
      g.fillStyle = 'rgba(40,26,8,0.85)'; g.fillRect(x + cw * 0.22, y + chh * 0.34, cw * 0.56, 3.2);
      g.fillStyle = 'rgba(30,20,6,0.9)'; g.font = `bold ${Math.round(chh * 0.3)}px Arial`; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillText(String(n += 7), x + cw / 2, y + chh * 0.72);
      g.fillStyle = '#5e3f10'; g.beginPath(); g.arc(x + cw / 2, y + chh * 0.2, 2.6, 0, 7); g.fill();
    }
  }, { repeat: false, aniso: 8 });
  const face = new THREE.Mesh(new THREE.PlaneGeometry(34, 4.8), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.5, metalness: 0.25 }));
  face.position.set(0, 3.55, 0.22); grp.add(face);
  const back = new THREE.Mesh(new THREE.BoxGeometry(34.3, 5.1, 0.2), new THREE.MeshStandardMaterial({ color: 0x2c2115, roughness: 0.7 }));
  back.position.set(0, 3.55, 0); grp.add(back);
  return grp;
}

/* ---------- the flag shop ---------- */
/** A pontoon hut selling flags of convenience, two for one, no questions.
    Face +Z, waterline at y = 0; six poles fly whatever was cheapest. */
export function flagShop() {
  const grp = new THREE.Group(), b = new ModelBuilder();
  b.add('pontoon', box(19, 1.1, 12, 0.25, 2), { p: [0, -0.4, 0] });
  b.add('hut', box(7.5, 3.1, 5, 0.15, 2), { p: [-4.2, 2.05, -1.5] });
  b.add('roof', box(8.6, 0.3, 6.1, 0.1, 2), { p: [-4.2, 3.8, -1.5], r: [0.06, 0, 0.03] });
  b.add('counter', box(6.4, 1.05, 1.1, 0.1, 2), { p: [1.8, 1.05, 2.2] });
  b.add('awning', box(7.2, 0.16, 2.6, 0.05, 1), { p: [1.8, 2.45, 2.6], r: [0.35, 0, 0] });
  for (const sx of [1, -1]) b.add('post', cyl(0.09, 0.11, 4.6, 8), { p: [sx * 5.5, 2.3, 3.1] });
  grp.add(b.build({
    pontoon: plastic(0x37424e, 0.7, 0.3), hut: paint(0xe6ddc8, { rough: 0.65 }), roof: paint(0xb03a2e, { rough: 0.55 }),
    counter: paint(0x8a6a42, { rough: 0.7 }), awning: paint(0xf0ead8, { rough: 0.6 }), post: MAT.dark,
  }));
  const cols = [0xd33a2c, 0x2456a6, 0xf2f2f2, 0x1d7a4f, 0xf2b234, 0x7030a0];
  const fb = new ModelBuilder();
  cols.forEach((c, i) => {
    const x = -8 + i * 3.3, z = i % 2 ? 4.6 : 3.4;
    fb.add('pole', cyl(0.07, 0.09, 6.4, 6), { p: [x, 3.4, z] });
    fb.add('f' + i, box(2.3, 1.35, 0.06, 0.05, 1), { p: [x + 1.2, 5.9, z], r: [0, (i % 3 - 1) * 0.16, 0] });
  });
  const mats = { pole: MAT.steel };
  cols.forEach((c, i) => mats['f' + i] = paint(c, { rough: 0.7 }));
  grp.add(fb.build(mats));
  const sign = boardMesh(['FLAGS OF CONVENIENCE', '2 FOR 1 — NO QUESTIONS'], 13, 3.2);
  sign.position.set(0, 6.1, 3.1); grp.add(sign);
  return grp;
}

/* ---------- pontoon sponsor hoardings ---------- */
/** A sponsor board standing on its own pontoon, showing the merged board art
    from assets/ads/international-waters/ with a painted placeholder until the
    image loads (the same late-load pattern as the engine's banner textures). */
export function adBoard(n) {
  const grp = new THREE.Group(), b = new ModelBuilder();
  b.add('pontoon', box(13, 1.1, 4.2, 0.25, 2), { p: [0, -0.4, 0] });
  for (const sx of [1, -1]) b.add('post', box(0.35, 4.6, 0.35, 0.1, 1), { p: [sx * 4.2, 1.8, -0.2] });
  grp.add(b.build({ pontoon: plastic(0x37424e, 0.7, 0.3), post: MAT.steel }));
  const tex = canvasTex(1024, 512, (g, W, H) => {
    g.fillStyle = '#12293a'; g.fillRect(0, 0, W, H);
    fitText(g, 'OFFSHORE MEDIA', W / 2, H / 2, W - 80, H * 0.4, 110, FONT, { fill: '#9fd4e8' });
  }, { repeat: false, aniso: 8 });
  if (typeof Image !== 'undefined') {
    const img = new Image();
    img.onload = () => { const c = tex.image, g = c.getContext('2d'); g.drawImage(img, 0, 0, c.width, c.height); tex.needsUpdate = true; };
    img.src = `assets/ads/international-waters/ad-${n}.webp`;
  }
  const face = new THREE.Mesh(new THREE.PlaneGeometry(10.5, 5.25), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.55 }));
  face.position.set(0, 6.7, 0.13); grp.add(face);
  const back = new THREE.Mesh(new THREE.BoxGeometry(10.8, 5.55, 0.2), new THREE.MeshStandardMaterial({ color: NAVY, roughness: 0.7 }));
  back.position.set(0, 6.7, 0); grp.add(back);
  return grp;
}

/* ---------- the seastead, crossed by the road ---------- */
/** A sovereign micro-nation on stilts, and the road now runs straight across
    its deck: deck 54 x 38 at local y 4.6, driving corridor along local Z with
    |x| <= 13 kept clear (rails at x = +-13.6), every building outboard.
    Waterline at y = 0. A mesh named 'beacon' pulses in the track anim. */
export function seastead() {
  const grp = new THREE.Group(), b = new ModelBuilder();
  // stilts and the waterline skirt
  for (const sx of [1, -1]) for (const sz of [1, -1]) {
    b.add('steel', cyl(0.55, 0.65, 8.6, 10), { p: [sx * 24, 0.4, sz * 16] });
    b.add('steel', cyl(0.45, 0.55, 8.6, 10), { p: [sx * 8, 0.4, sz * 16] });
  }
  b.add('hull', box(55, 1.7, 39, 0.1, 2), { p: [0, 0.4, 0] });
  b.add('deck', box(54, 0.5, 38, 0.06, 2), { p: [0, 4.35, 0] });
  // corridor rails flanking the road
  for (const sx of [1, -1]) {
    b.add('rail', box(0.09, 0.09, 37, 0.02, 1), { p: [sx * 13.6, 5.55, 0] });
    b.add('rail', box(0.09, 0.09, 37, 0.02, 1), { p: [sx * 13.6, 5.1, 0] });
    for (const z of [-16, -8, 0, 8, 16]) b.add('rail', box(0.12, 1.0, 0.12, 0.02, 1), { p: [sx * 13.6, 5.05, z] });
  }
  // deck-edge railing, with a gap where the road leaves the platform
  for (const sx of [1, -1]) {
    b.add('rail', box(0.09, 0.09, 38, 0.02, 1), { p: [sx * 26.8, 5.55, 0] });
    for (const sz of [1, -1]) b.add('rail', box(13.2, 0.09, 0.09, 0.02, 1), { p: [sx * 20.2, 5.55, sz * 18.8] });
  }
  // dome habitat and cylinder habitat, outboard of the corridor
  b.add('house', sphere(5.2, 20, 12), { p: [-20, 4.6, -4], s: [1, 0.62, 1] });
  b.add('house', cyl(4.1, 4.3, 3.6, 18), { p: [20, 6.4, 10] });
  b.add('house', sphere(4.15, 18, 10), { p: [20, 8.2, 10], s: [1, 0.5, 1] });
  b.add('glass', cyl(4.16, 4.16, 0.7, 18), { p: [20, 6.9, 10] });
  // the tower of sovereignty: offices, solar on the roof, a flag
  b.add('house', box(8.5, 7.5, 8.5, 0.3, 2), { p: [19.5, 8.3, -7] });
  b.add('glass', box(8.6, 1.1, 8.6, 0.05, 1), { p: [19.5, 9.6, -7] });
  b.add('glass', box(8.6, 1.1, 8.6, 0.05, 1), { p: [19.5, 6.9, -7] });
  b.add('solar', box(3.4, 0.12, 2.2, 0.03, 1), { p: [17.4, 12.35, -7], r: [-0.5, 0, 0] });
  b.add('solar', box(3.4, 0.12, 2.2, 0.03, 1), { p: [21.6, 12.35, -7], r: [-0.5, 0, 0] });
  b.add('dark', cyl(0.07, 0.09, 4.6, 8), { p: [19.5, 14.3, -7] });
  b.add('flag', box(0.06, 1.3, 2.2, 0.02, 1), { p: [19.5, 15.9, -5.9] });
  // container stacks and the helipad
  b.add('boxA', box(6, 2.6, 2.4, 0.05, 2), { p: [-20, 5.9, 10] });
  b.add('boxB', box(6, 2.6, 2.4, 0.05, 2), { p: [-20, 5.9, 12.6] });
  b.add('boxC', box(6, 2.6, 2.4, 0.05, 2), { p: [-20, 8.5, 11.3], r: [0, 0.12, 0] });
  b.add('boxD', box(6, 2.6, 2.4, 0.05, 2), { p: [20, 5.9, -15.5] });
  b.add('pad', cyl(4.4, 4.4, 0.18, 24), { p: [-20, 4.68, -14] });
  b.add('gold', torus(3.9, 0.1, 6, 28), { p: [-20, 4.8, -14], r: [Math.PI / 2, 0, 0] });
  const mats = {
    steel: MAT.steel, hull: plastic(0x3a4552, 0.6, 0.3), deck: plastic(0x8d9299, 0.8),
    rail: MAT.chrome, house: paint(0xf2f0e9, { rough: 0.4, clear: 0.5 }), glass: plastic(0x1d3346, 0.15, 0.6),
    dark: MAT.dark, flag: plastic(0x2fc3d8, 0.8), solar: plastic(0x1d3a5f, 0.25, 0.4),
    boxA: paint(0xe2603d, { rough: 0.55 }), boxB: paint(0x2e7fc2, { rough: 0.55 }), boxC: paint(0x3fae6a, { rough: 0.55 }),
    boxD: paint(0xe8b64c, { rough: 0.55 }), pad: plastic(0x2b3440, 0.7), gold: paint(0xffc23a, { rough: 0.3, metal: 0.6, clear: 0.4 }),
  };
  grp.add(b.build(mats));
  // harbour crane, kept separate so it reads against the sky
  const crane = new ModelBuilder();
  crane.add('post', cyl(0.35, 0.5, 11, 10), { p: [0, 5.5, 0] });
  crane.add('jib', box(0.55, 0.55, 15, 0.05, 2), { p: [0, 10.6, -4.5], r: [0.22, 0, 0] });
  crane.add('cab', box(1.7, 1.6, 1.7, 0.2, 2), { p: [0, 9.4, 1.2] });
  crane.add('line', cyl(0.03, 0.03, 5.2, 5), { p: [0, 7.6, -10.6] });
  crane.add('hook', box(1.4, 1.1, 1.4, 0.05, 2), { p: [0, 4.8, -10.6] });
  const craneGrp = crane.build({ post: paint(0xe8862e, { rough: 0.5 }), jib: paint(0xe8862e, { rough: 0.5 }), cab: plastic(0x1d3346, 0.2, 0.4), line: MAT.dark, hook: MAT.steel });
  craneGrp.position.set(24, 4.6, 13); craneGrp.rotation.y = 0.7; grp.add(craneGrp);
  // entry and exit arches over the corridor (boardMesh reads from both sides)
  for (const sz of [1, -1]) {
    const arch = new THREE.Group(), ab = new ModelBuilder();
    for (const sx of [1, -1]) ab.add('post', cyl(0.14, 0.18, 8.6, 8), { p: [sx * 13.9, 8.9, 0] });
    arch.add(ab.build({ post: MAT.steel }));
    const sign = boardMesh(sz < 0 ? ['NOW ENTERING THE SEASTEAD', 'EST. TUESDAY — POP. 9'] : ['THANK YOU FOR NOT EXISTING'], 21, 3.3);
    sign.position.set(0, 12.6, 0); arch.add(sign);
    arch.position.z = sz * 18.6;
    grp.add(arch);
  }
  // the beacon, findable for a pulse animation (own material: glow() is cached
  // and shared, and the pulse must not take the mine lamps with it)
  const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.34, 10, 8), glow(0xff4a3d, 2.6).clone());
  beacon.position.set(19.5, 13.2, -7); beacon.name = 'beacon'; grp.add(beacon);
  return grp;
}

/* ---------- satellite dishes (Murdoch's yacht watches everything) ---------- */
/** A cluster of three tracking dishes on a shared mast. userData.spin yaws it. */
export function dishArray() {
  const grp = new THREE.Group(), spin = new THREE.Group();
  const b = new ModelBuilder();
  b.add('dark', cyl(0.12, 0.18, 2.6, 8), { p: [0, 1.3, 0] });
  grp.add(b.build({ dark: MAT.dark }));
  const d = new ModelBuilder();
  for (const [x, z, tilt] of [[0, 0, 0.5], [-1.5, 0.7, 0.75], [1.5, 0.7, 0.3]]) {
    d.add('dish', sphere(1.05, 14, 8), { p: [x, 2.9, z], s: [1, 1, 0.38], r: [tilt, 0, 0] });
    d.add('dark', cyl(0.04, 0.04, 0.8, 6), { p: [x, 2.9, z + 0.35], r: [Math.PI / 2 - tilt, 0, 0] });
    d.add('lamp', sphere(0.09, 8, 6), { p: [x, 2.9 + Math.sin(tilt) * 0.4, z + 0.72] });
  }
  spin.add(d.build({ dish: paint(0xf2f0e9, { rough: 0.35, clear: 0.5 }), dark: MAT.dark, lamp: glow(0xff5f4a, 2) }));
  grp.add(spin); grp.userData.spin = spin;
  return grp;
}

/* ---------- ambient water traffic ---------- */
/** A small sailboat, hull about 7 m, sail up. */
export function sailboat(accent = 0x2e7fc2) {
  const grp = new THREE.Group(), b = new ModelBuilder();
  b.add('hull', loft([
    { z: -3.4, w: 0.5, h: 0.55, y: 0.75, n: 2.6 },
    { z: -1.2, w: 1.15, h: 0.8, y: 0.55, n: 2.6 },
    { z: 1.2, w: 1.05, h: 0.8, y: 0.6, n: 2.6 },
    { z: 3.4, w: 0.18, h: 0.6, y: 1.0, n: 2.4 },
  ], 14, 3));
  b.add('stripe', box(2.0, 0.22, 5.4, 0.05, 1), { p: [0, 0.95, 0] });
  b.add('dark', cyl(0.05, 0.07, 6.4, 8), { p: [0, 3.9, 0.3] });
  b.add('dark', tube([[-0.0, 1.15, -3.1], [0, 1.3, 0.2], [0, 1.15, 3.2]], 0.05, 10, 5), {});
  grp.add(b.build({ hull: paint(0xf6f4ef, { rough: 0.35, clear: 0.6 }), stripe: paint(accent, { rough: 0.4 }), dark: MAT.dark }));
  // two triangle sails as plain meshes (DoubleSide, they read from both banks)
  const sailMat = new THREE.MeshStandardMaterial({ color: 0xfbf7ec, roughness: 0.9, side: THREE.DoubleSide });
  const tri = (pts) => {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pts.flat(), 3));
    g.setIndex([0, 1, 2]); g.computeVertexNormals();
    return new THREE.Mesh(g, sailMat);
  };
  grp.add(tri([[0, 1.6, 0.55], [0, 6.6, 0.42], [0, 1.6, 3.0]]));       // jib
  grp.add(tri([[0, 1.7, 0.05], [0, 6.9, 0.18], [0, 1.7, -2.9]]));      // main
  return grp;
}

/** A harbour workboat, about 8 m: tubby hull, wheelhouse, little crane. */
export function workboat() {
  const grp = new THREE.Group(), b = new ModelBuilder();
  b.add('hull', loft([
    { z: -4, w: 1.1, h: 0.9, y: 0.9, n: 2.8 },
    { z: -2, w: 1.7, h: 1.05, y: 0.75, n: 2.8 },
    { z: 1.5, w: 1.6, h: 1.05, y: 0.8, n: 2.8 },
    { z: 3.6, w: 0.9, h: 0.95, y: 1.1, n: 2.6 },
    { z: 4.1, w: 0.15, h: 0.7, y: 1.45, n: 2.4 },
  ], 16, 3));
  b.add('deck', box(2.9, 0.25, 6.4, 0.05, 2), { p: [0, 1.62, -0.2] });
  b.add('house', box(2.2, 1.7, 2.2, 0.25, 2), { p: [0, 2.6, 0.9] });
  b.add('glass', box(2.3, 0.7, 2.3, 0.05, 1), { p: [0, 2.95, 0.9] });
  b.add('crane', cyl(0.11, 0.14, 2.6, 8), { p: [0.7, 2.9, -1.9] });
  b.add('crane', box(0.18, 0.18, 3.4, 0.03, 1), { p: [0.7, 4.1, -3.2], r: [0.5, 0, 0] });
  b.add('stack', cyl(0.22, 0.26, 1.1, 10), { p: [-0.7, 3.3, -0.6] });
  const mats = {
    hull: paint(0xe2603d, { rough: 0.5 }), deck: plastic(0xb98a5a, 0.8),
    house: paint(0xf2f0e9, { rough: 0.4, clear: 0.5 }), glass: plastic(0x1d3346, 0.15, 0.6),
    crane: MAT.dark, stack: MAT.dark,
  };
  grp.add(b.build(mats));
  return grp;
}

/** A flat harbour barge to moor grandstands (or a jump) on. Deck top at local y = 0.95. */
export function barge(w = 44, d = 15) {
  const grp = new THREE.Group(), b = new ModelBuilder();
  b.add('hull', box(w, 1.9, d, 0.12, 2), { p: [0, -0.05, 0] });
  b.add('deck', box(w - 1.2, 0.22, d - 1.2, 0.04, 1), { p: [0, 0.95, 0] });
  for (const s of [1, -1]) b.add('stripe', box(w + 0.06, 0.4, 0.3, 0.05, 1), { p: [0, 0.55, s * (d / 2 - 0.1)] });
  grp.add(b.build({ hull: plastic(0x2e343c, 0.65, 0.3), deck: plastic(0x8a6a4a, 0.85), stripe: paint(0xd9403a, { rough: 0.5 }) }));
  return grp;
}

/* ---------- obstacles ---------- */
/** A moored naval mine that slipped its chain. Sits on the deck, r ~1 m. */
export function navMine() {
  const grp = new THREE.Group(), b = new ModelBuilder();
  b.add('body', sphere(0.98, 18, 14), { p: [0, 1.0, 0] });
  b.add('ring', torus(1.02, 0.07, 6, 22), { p: [0, 0.55, 0], r: [Math.PI / 2, 0, 0] });
  for (let k = 0; k < 8; k++) {
    const a = (k / 8) * Math.PI * 2, tilt = 0.7;
    b.add('dark', cyl(0.07, 0.11, 0.55, 8), { p: [Math.cos(a) * 0.95, 1.0 + Math.sin(a) * 0.55, Math.sin(a) * 0.4], r: [Math.sin(a) * tilt, 0, -Math.cos(a) * tilt] });
  }
  b.add('lamp', sphere(0.13, 10, 8), { p: [0, 2.05, 0] });
  grp.add(b.build({ body: plastic(0x2b3440, 0.45, 0.6), ring: MAT.dark, dark: MAT.dark, lamp: glow(0xff4a3d, 2.6) }));
  return grp;
}

/* =====================================================================
   The yacht toolkit (quality pass): a hull generator with real sections,
   a raked stem and a flat teak deck, sleek lofted superstructure tiers,
   and two yachts built from it: the gigayacht the lap runs through and
   along, and the marina yachts whose bows reach over the start straight.
   Hull frame: bow +Z, port +X, waterline y = 0.
   ===================================================================== */
const WHITE = paint(0xf7f6f2, { rough: 0.22, clear: 0.9 });
const SMOKE = paint(0x14263a, { rough: 0.08, metal: 0.5, clear: 1 });
const GOLDP = paint(0xe9b443, { rough: 0.25, metal: 0.75, clear: 0.6 });
const CHROME = MAT.chrome;
let teakTex = null;
/** Teak deck planks with black caulking lines, tiling along the length. */
export function teakMat() {
  if (!teakTex) teakTex = canvasTex(256, 256, (g, W, H) => {
    const n = 8, w = W / n;
    for (let i = 0; i < n; i++) {
      const v = 0.88 + ((i * 53) % 13) / 70;
      g.fillStyle = `rgb(${Math.round(196 * v)},${Math.round(142 * v)},${Math.round(88 * v)})`; g.fillRect(i * w, 0, w, H);
      g.fillStyle = 'rgba(90,55,25,0.16)'; for (let k = 0; k < 6; k++) g.fillRect(i * w + 3 + k * 5, 0, 1.2, H);
      g.fillStyle = '#2a1d12'; g.fillRect(i * w, 0, 2.2, H);
      const cut = ((i * 97) % 200) + 30; g.fillRect(i * w, cut, w, 2);
    }
  }, { aniso: 8 });
  return new THREE.MeshStandardMaterial({ map: teakTex, roughness: 0.78 });
}

/** Hull section numbers at z: half-beam w, keel k, deck top. */
function station(z, o) {
  const { L, B, D, keel = -3.4, stern = 0.88, rakeFrom = 0.45, sheer = 0, rakeTo = 1.4, bowP = 2.4 } = o, h = L / 2, t = z / h;
  let w = t <= 0 ? B * (1 - (1 - stern) * t * t) : B * Math.pow(Math.max(0, 1 - Math.pow(t, bowP)), 0.62);
  w = Math.max(w, 0.06);
  const top = D + sheer * Math.max(0, t) ** 2;
  let k = keel;
  if (t > rakeFrom) { const u = (t - rakeFrom) / (1 - rakeFrom); k = keel + (top - rakeTo - keel) * Math.pow(u, 1.45); }
  if (t < -0.84) k = keel + (0.35 - keel) * Math.min(1, (-t - 0.84) / 0.16);
  return { z, w, k, top };
}
/** Point on the hull section: u runs 0 at the deck edge to 1 at the keel. */
function sectionPt(st, u, out = 0) {
  const y = st.top + (st.k - st.top) * u;
  const uv = Math.min(0.86, Math.max(0.3, (st.top - 1) / (st.top - st.k)));
  const g = u < uv ? 1 : Math.pow(Math.max(0, 1 - ((u - uv) / (1 - uv)) ** 2), 0.7);
  return [st.w * g * (1 + 0.035 * (1 - u)) + out, y];
}
const uAt = (st, y) => Math.min(1, Math.max(0, (st.top - y) / (st.top - st.k)));
/** A ruled surface through stations: pts(st) returns the same number of [x, y] for every station. */
function stripGeo(stations, pts, side = 1) {
  const pos = [], uv = [], idx = [];
  let n = 0;
  stations.forEach((st, r) => {
    const p = pts(st); n = p.length;
    p.forEach(([x, y], j) => { pos.push(x, y, st.z); uv.push(j / (n - 1), st.z / 8); });
    if (r) for (let j = 0; j < n - 1; j++) { const a = (r - 1) * n + j, b = a + 1, c = a + n, d = c + 1; if (side < 0) idx.push(a, b, c, b, d, c); else idx.push(a, c, b, b, c, d); }
  });
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx); g.computeVertexNormals();
  return g;
}
/** Flat polygon (a fan from the centroid) in the plane z = const. */
function fanGeo(pts, z) {
  let cx = 0, cy = 0; for (const [x, y] of pts) { cx += x; cy += y; } cx /= pts.length; cy /= pts.length;
  const pos = [cx, cy, z], idx = [];
  pts.forEach(([x, y]) => pos.push(x, y, z));
  for (let i = 0; i < pts.length; i++) idx.push(0, 1 + i, 1 + ((i + 1) % pts.length));
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
  return g;
}
const range = (a, b, n) => Array.from({ length: n + 1 }, (_, i) => a + (b - a) * (i / n));

/**
 * Hull parts into a ModelBuilder (materials: hull, bottom, deck, cut, gold, boot, glass, ceiling).
 * o: { L, B, D, keel, stern, rakeFrom, sheer, cut: [z0, z1, top] (a drive-through), windows: [z0, z1] }
 */
function hull(b, o) {
  const h = o.L / 2, N = Math.round(o.L / 2.2);
  const zs = range(-h, h - 0.02, N);
  const pieces = o.cut ? [[-h, o.cut[0]], [o.cut[1], h - 0.02]] : [[-h, h - 0.02]];
  const full = st => [...range(0, 1, 14).map(u => sectionPt(st, u)), ...range(1, 0, 14).slice(1).map(u => { const p = sectionPt(st, u); return [-p[0], p[1]]; })];
  const wl = 1.15;
  for (const [z0, z1] of pieces) {
    const sts = [z0, ...zs.filter(z => z > z0 + 0.5 && z < z1 - 0.5), z1].map(z => station(z, o));
    for (const s of [1, -1]) b.add('hull', stripGeo(sts, st => range(0, uAt(st, wl), 10).map(u => { const p = sectionPt(st, u); return [p[0] * s, p[1]]; }), s));
    b.add('bottom', stripGeo(sts, st => { const u0 = uAt(st, wl); return [...range(u0, 1, 7).map(u => sectionPt(st, u)), ...range(1, u0, 7).slice(1).map(u => { const p = sectionPt(st, u); return [-p[0], p[1]]; })]; }));
    for (const s of [1, -1]) {
      b.add('boot', stripGeo(sts, st => [wl + 0.55, wl].map(y => { const p = sectionPt(st, uAt(st, y), 0.05); return [p[0] * s, y]; }), s));
      b.add('gold', stripGeo(sts, st => [st.top - 0.75, st.top - 1.15].map(y => { const p = sectionPt(st, uAt(st, y), 0.05); return [p[0] * s, y]; }), s));
      if (o.windows) {
        const ws = sts.filter(st => st.z >= o.windows[0] && st.z <= o.windows[1]);
        if (ws.length > 1) b.add('glass', stripGeo(ws, st => [st.top - 1.6, st.top - 2.9].map(y => { const p = sectionPt(st, uAt(st, y), 0.06); return [p[0] * s, y]; }), s));
      }
    }
    if (z0 > -h + 0.1) b.add('cut', fanGeo(full(station(z0, o)), z0));
    if (z1 < h - 0.1) b.add('cut', fanGeo(full(station(z1, o)), z1));
    if (z0 <= -h + 0.1) b.add('hull', fanGeo(full(station(z0, o)), z0));
  }
  if (o.cut) {   // the lintel over the drive-through: topsides above the opening, and a lit ceiling
    const [z0, z1, top] = o.cut, sts = range(z0, z1, 10).map(z => station(z, o));
    for (const s of [1, -1]) {
      b.add('hull', stripGeo(sts, st => range(0, uAt(st, top), 5).map(u => { const p = sectionPt(st, u); return [p[0] * s, p[1]]; }), s));
      b.add('gold', stripGeo(sts, st => [st.top - 0.75, st.top - 1.15].map(y => { const p = sectionPt(st, uAt(st, y), 0.05); return [p[0] * s, y]; }), s));
    }
    const w = station((z0 + z1) / 2, o).w;
    b.add('ceiling', box(w * 2, 0.5, z1 - z0, 0.05, 1), { p: [0, top + 0.25, (z0 + z1) / 2] });
  }
  // the deck: one flat plate over the whole planform
  const shape = new THREE.Shape(), sts = zs.map(z => station(z, o));
  sts.forEach((st, i) => { const x = st.w * 1.035; if (i) shape.lineTo(x, -st.z); else shape.moveTo(x, -st.z); });
  for (let i = sts.length - 1; i >= 0; i--) shape.lineTo(-sts[i].w * 1.035, -sts[i].z);
  const dg = new THREE.ShapeGeometry(shape, 1); dg.rotateX(-Math.PI / 2);
  const p = dg.attributes.position, uvs = dg.attributes.uv;
  for (let i = 0; i < p.count; i++) { const z = p.getZ(i), st = station(z, o); p.setY(i, st.top - 0.04); uvs.setXY(i, p.getX(i) / 4, z / 4); }
  dg.computeVertexNormals();
  b.add('deck', dg);
}

/** One superstructure tier as a sleek lofted block with a wraparound glass band. */
function tier(b, { x = 0, z0, z1, y0, y1, w, nose = 0.3, tail = 0.9, glassH = 0.5, mat = 'house' }) {
  const hh = (y1 - y0) / 2, yc = (y0 + y1) / 2, len = z1 - z0;
  const secs = (ww, h, y) => [
    { z: z0, w: ww * tail, h: h * 0.96, y, x, n: 5 },
    { z: z0 + len * 0.08, w: ww, h, y, x, n: 5 },
    { z: z1 - len * 0.3, w: ww, h, y, x, n: 5 },
    { z: z1 - len * 0.08, w: ww * (0.55 + nose * 0.6), h: h * 0.96, y, x, n: 4 },
    { z: z1, w: ww * nose, h: h * 0.9, y: y - h * 0.04, x, n: 3 },
  ];
  // Use one surface for the window belt and its white surround. Overlapping
  // lofts previously put two end caps in the same plane at the nose.
  const ring = 48, skin = loft(secs(w, hh, yc), ring, 5), index = skin.index.array;
  const sideCount = index.length - ring * 6, glass = [], house = [];
  for (let i = 0; i < sideCount; i += 6) {
    const angle = ((i / 6 % ring) + 0.5) * Math.PI * 2 / ring;
    const y = Math.sign(Math.sin(angle)) * Math.abs(Math.sin(angle)) ** 0.41;
    const bucket = Math.abs(y - 0.12) <= glassH ? glass : house;
    for (let k = 0; k < 6; k++) bucket.push(index[i + k]);
  }
  for (let i = sideCount; i < index.length; i++) house.push(index[i]);
  const windows = skin.clone(); windows.setIndex(glass); skin.setIndex(house);
  b.add(mat, skin); b.add('glass', windows);
}

/**
 * A superyacht the lap races across: the road runs down her centreline from the
 * aft deck, through the main-deck salon (twin glass-walled saloons either side,
 * the upper decks carried overhead) and over the foredeck to a ramp at the bow.
 * Hull frame: bow +Z, port +X, waterline y = 0, the road at deck height D on X = 0.
 * o: { L, B, D, name, boot (color), salon: [z0, z1], uppers: [[z0, z1, h]...], helipad: z or null, dishes, accent }
 * Returns a Group; userData: { radar, station(z), spin: [] }.
 */
export function hopYacht({ L = 74, B = 12, D = 10.5, name = 'YACHT', boot = 0xc8323a, salon = [-20, 12], uppers = [[-16, 6, 3], [-10, 1, 2.4]], helipad = null, lane = 7.6, mast = true, header = null, emblem = null } = {}) {
  const grp = new THREE.Group(), b = new ModelBuilder();
  const o = { L, B, D, keel: -3.2, stern: 0.9, rakeFrom: 0.42, bowP: 4.5, rakeTo: 1.6, windows: [-L * 0.42, L * 0.36] };
  hull(b, o);
  // the salon: two saloons either side of the road, glass to the sea outside and glass to the road inside
  // (the inner windows show the generated salon interior), the ceiling slab carrying the upper decks over the road
  const [z0, z1] = salon, sh = 8, outW = station((z0 + z1) / 2, o).w * 0.96, len = z1 - z0, zc = (z0 + z1) / 2;
  const roomW = outW - lane, roomX = lane + roomW / 2;
  for (const s of [1, -1]) {
    b.add('house', box(roomW, sh, len, 0.7, 3), { p: [s * roomX, D + sh / 2, zc] });
    b.add('glass', box(roomW, sh * 0.62, len - 1.2, 0.5, 2), { p: [s * (roomX + 0.12), D + sh * 0.52, zc] });
  }
  b.add('house', box(outW * 2, 0.8, len + 0.6, 0.35, 2), { p: [0, D + sh + 0.3, zc] });
  b.add('ceiling', box(lane * 2 - 0.1, 0.1, len - 0.4, 0.04, 1), { p: [0, D + sh - 0.15, zc] });
  for (let z = z0 + 2.5; z < z1 - 1.5; z += 3.5) for (const x of [-3.5, 0, 3.5]) b.add('chand', cyl(0.32, 0.32, 0.08, 10), { p: [x, D + sh - 0.22, z] });
  // the upper decks, stepping back, full width over the salon
  let y = D + sh + 0.6;
  uppers.forEach(([a, c, h], k) => { tier(b, { x: 0, z0: a, z1: c, y0: y - 0.05, y1: y + h, w: outW - 1.1 - k * 1.3, nose: 0.3, glassH: 0.58 }); y += h; });
  if (emblem) yachtEmblem(b, emblem, y, uppers.at(-1)[0] + 2.2);
  // rails round the upper decks' aft ends
  { let yy = D + sh + 0.6; uppers.forEach(([a, , h], k) => { const ww = outW - 1.1 - k * 1.3; b.add('chrome', box(ww * 2 - 0.4, 0.08, 0.08, 0.03, 1), { p: [0, yy + 1.0, a - 2.5] }); for (const s of [1, -1]) b.add('chrome', box(0.08, 0.08, 3, 0.03, 1), { p: [s * (ww - 0.3), yy + 1.0, a - 1] }); yy += h; }); }
  // the mast: swept back, radar domes
  if (mast && emblem !== 'shark') {
    const zc = (uppers[uppers.length - 1][0] + uppers[uppers.length - 1][1]) / 2;
    b.add('house', loft([{ z: -2.0, w: 0.7, h: 0.3, y: y + 0.2 }, { z: -0.8, w: 0.55, h: 2.4, y: y + 2.4 }, { z: 0.5, w: 0.35, h: 3.8, y: y + 3.8 }], 12, 3), { p: [0, 0, zc] });
    b.add('house', sphere(0.95, 14, 10), { p: [1.9, y + 5.2, zc - 0.4] });
    b.add('house', sphere(0.8, 14, 10), { p: [-1.6, y + 5.0, zc - 0.4] });
  }
  // aft deck: a pool to port, sun loungers to starboard; foredeck: sunpads or a helipad
  const aft = (-L / 2 + z0) / 2, sideC = lane + (station(aft, o).w - lane) / 2;
  b.add('pool', box(station(aft, o).w - lane - 1.4, 0.3, Math.min(9, (z0 + L / 2) * 0.55), 0.1, 1), { p: [sideC, D + 0.02, aft] });
  b.add('chrome', box(station(aft, o).w - lane - 0.8, 0.35, Math.min(9, (z0 + L / 2) * 0.55) + 0.6, 0.12, 1), { p: [sideC, D - 0.05, aft] });
  for (let k = 0; k < 4; k++) {
    const z = aft - 4.5 + k * 3;
    b.add('cushion', box(1.0, 0.32, 2.0, 0.14, 2), { p: [-sideC, D + 0.16, z] });
    b.add('cushion', box(1.0, 0.32, 0.9, 0.14, 2), { p: [-sideC, D + 0.42, z - 0.9], r: [-0.55, 0, 0] });
  }
  const fore = (z1 + L * 0.38) / 2, fw = station(fore, o).w;
  if (helipad == null) for (const s of [1, -1]) b.add('cushion', box(fw - lane - 1.2, 0.4, 5, 0.18, 2), { p: [s * (lane + (fw - lane) / 2), D + 0.2, fore] });
  grp.add(b.build({
    hull: WHITE, bottom: paint(0x10233f, { rough: 0.35, clear: 0.5 }), boot: paint(boot, { rough: 0.3, clear: 0.6 }), gold: GOLDP,
    glass: SMOKE, deck: teakMat(), cut: WHITE, house: WHITE, chrome: CHROME,
    ceiling: new THREE.MeshStandardMaterial({ color: 0x7a5236, roughness: 0.55 }),
    tally: glow(0xe12922, 1.7), chand: glow(0xffe2a8, 2.2), pool: new THREE.MeshStandardMaterial({ color: 0x0aa7c6, emissive: 0x29d9f0, emissiveIntensity: 0.8, roughness: 0.1 }),
    cushion: plastic(0xf3ead2, 0.8),
  }));
  // the inner windows: the salon interior, seen from the road through floor-to-ceiling glass
  if (typeof Image !== 'undefined') {
    const tex = salonTex(), tile = 9.4, reps = Math.max(1, Math.round((len - 1.4) / tile));
    const mat = new THREE.MeshStandardMaterial({ map: tex, emissiveMap: tex, emissive: 0xffffff, emissiveIntensity: 0.55, roughness: 0.35 });
    for (const s of [1, -1]) {
      const g = new THREE.PlaneGeometry(len - 1.4, sh - 0.9); const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setX(i, uv.getX(i) * reps);
      const m = new THREE.Mesh(g, mat); m.position.set(s * (lane - 0.03), D + sh / 2 - 0.05, zc); m.rotation.y = -s * Math.PI / 2; grp.add(m);
    }
  }
  if (header) {
    const accent = '#' + boot.toString(16).padStart(6, '0');
    const plaque = boardMesh([header], B * 1.84, 3.2, { bg: '#10233f', accent });
    plaque.position.set(0, D + sh + 1.1, z0 - 0.5); grp.add(plaque);
    // Catch the driver's eye above both corners of the landing deck.
    for (const side of [-1, 1]) {
      const mx = side * (lane + 1.35);
      b.add('gold', cyl(0.11,0.14,5.5,8), {p:[mx,D+2.75,-L/2+1.25]});
      const flag = new THREE.Shape();
      flag.moveTo(0,0); flag.lineTo(side*2.45,-0.6); flag.lineTo(0,-1.45); flag.closePath();
      const g = new THREE.ShapeGeometry(flag);
      b.add('flag',g,{p:[mx,D+5.5,-L/2+1.25]});
      b.add('life',torus(1.04,0.29,8,20),{p:[mx,D+1.8,-L/2+1.1]});
    }
    if (emblem === 'shark') {
      // The hostile acquisition literally swallows the player.
      for (let k=0;k<11;k++) {
        b.add('tooth',cone(0.66,1.05+(k%2)*0.22,3),{p:[(k-5)*1.36,D+sh-0.2,z0-0.42],r:[Math.PI,0,0]});
      }
    }
    const flagMat = paint(boot,{rough:0.55}); flagMat.side = THREE.DoubleSide;
    grp.add(b.build({gold:GOLDP,flag:flagMat,life:paint(0xf06b32,{rough:0.65}),tooth:WHITE}));
  }
  // her name down both sides, under the gold sheer line
  const tex = canvasTex(2048, 256, (g, W, H) => { g.clearRect(0, 0, W, H); fitText(g, name, W / 2, H / 2 + 6, W - 40, H * 0.86, 230, FONT, { fill: '#10233f', stroke: '#f7f6f2', lw: 10 }); }, { repeat: false, aniso: 8 });
  const nameMat = new THREE.MeshStandardMaterial({ map: tex, transparent: true, roughness: 0.4, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 });
  const nz0 = -L * 0.3, nz1 = L * 0.24, nl = nz1 - nz0, nzc = (nz0 + nz1) / 2;
  const nh = Math.min(nl / 8, D - 3.0 - 2.4), ny = 1.95 + nh / 2;
  const nGeo = new THREE.PlaneGeometry(nl, nh, 40, 1);
  for (const s of [1, -1]) {
    // bend the name round the hull: each column sits on the hull side at its own z
    const g = nGeo.clone(), p = g.attributes.position;
    for (let i = 0; i < p.count; i++) { const zz = nzc - p.getX(i) * s, yy = ny + p.getY(i), st = station(zz, o); const sp = sectionPt(st, uAt(st, yy), 0.1); p.setXYZ(i, s * sp[0], yy, zz); }
    g.computeVertexNormals();
    const m = new THREE.Mesh(g, nameMat); m.renderOrder = 2; grp.add(m);
  }
  // Everything here is rigid with its yacht. Merge repeated material passes
  // (interior walls, both sides of a sign, and the white deckhouse/hull).
  const rigid = new THREE.Group(), baker = makeBaker(rigid, true);
  baker.add(grp); baker.flush(); grp.clear(); grp.add(rigid);
  grp.userData.station = z => station(z, o);
  grp.userData.o = o;
  return grp;
}

let salonTexCache = null;
/** The generated salon interior (assets/tracks/international-waters/salon.webp), tiling along the windows. */
function salonTex() {
  if (!salonTexCache) { salonTexCache = new THREE.TextureLoader().load('assets/tracks/international-waters/salon.webp'); salonTexCache.colorSpace = THREE.SRGBColorSpace; salonTexCache.wrapS = THREE.RepeatWrapping; salonTexCache.anisotropy = 8; }
  return salonTexCache;
}

/** White foam round a hull at the waterline: a ribbon a little outside the hull's waterline outline, in hull frame. */
export function foamRing(o, width = 1.6) {
  const pts = [], h = o.L / 2;
  for (let k = 0; k <= 60; k++) { const z = -h + (o.L * k) / 60, st = station(Math.min(z, h - 0.5), o); pts.push([sectionPt(st, uAt(st, 0))[0], z]); }
  const ring = [...pts.map(([x, z]) => [x, z]), ...pts.slice().reverse().map(([x, z]) => [-x, z])];
  const pos = [], uv = [], idx = [];
  ring.forEach(([x, z], i) => {
    const [px, pz] = ring[(i + 1) % ring.length], [qx, qz] = ring[(i - 1 + ring.length) % ring.length];
    let nx = pz - qz, nz = -(px - qx); const l = Math.hypot(nx, nz) || 1; nx /= l; nz /= l;
    if (nx * x + nz * z < 0) { nx = -nx; nz = -nz; }
    pos.push(x - nx * 0.3, 0, z - nz * 0.3, x + nx * width, 0, z + nz * width); uv.push(i / 8, 0, i / 8, 1);
    const a = i * 2, c = ((i + 1) % ring.length) * 2; idx.push(a, c, a + 1, a + 1, c, c + 1);
  });
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals();
  return g;
}
let foamTex = null;
/** Soft broken white foam, fading outward (v = 0 at the hull, 1 at the edge). */
export function foamMaterial() {
  if (!foamTex) foamTex = canvasTex(256, 64, (g, W, H) => {
    g.clearRect(0, 0, W, H);
    for (let i = 0; i < 260; i++) { const x = Math.random() * W, y = Math.pow(Math.random(), 1.6) * H, r = 2 + Math.random() * 6; g.fillStyle = `rgba(255,255,255,${0.55 * (1 - y / H)})`; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill(); }
    const gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, 'rgba(255,255,255,0.9)'); gr.addColorStop(0.35, 'rgba(255,255,255,0.35)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr; g.fillRect(0, 0, W, H);
  }, { aniso: 4 });
  return new THREE.MeshBasicMaterial({ map: foamTex, transparent: true, depthWrite: false, opacity: 0.85 });
}

/**
 * A marina superyacht moored bow-on to the quay, the raked stem reaching out
 * over the road, merged into the shared builder b (materials from YACHT_MATS).
 * Placed by x, z, yaw (bow toward yaw), waterline y = 0. Returns the hull numbers.
 */
export function marinaYacht(b, { L = 92, B = 9.5, D = 7.6, x = 0, z = 0, yaw = 0, boot = 'bootRed', tiers = 3 } = {}) {
  const s = new ModelBuilder();
  const o = { L, B, D, keel: -2.6, stern: 0.88, rakeFrom: 0.28, sheer: 2.2, rakeTo: 1.0, windows: [-L * 0.35, L * 0.32] };
  hull(s, o);
  const sw = B * 0.82;
  tier(s, { x: 0, z0: -L * 0.36, z1: L * 0.14, y0: D - 0.05, y1: D + 3.0, w: sw, nose: 0.3 });
  if (tiers > 1) tier(s, { x: 0, z0: -L * 0.3, z1: L * 0.07, y0: D + 3.0, y1: D + 5.8, w: sw - 0.8, nose: 0.28 });
  if (tiers > 2) tier(s, { x: 0, z0: -L * 0.2, z1: L * 0.01, y0: D + 5.8, y1: D + 8.1, w: sw - 1.7, nose: 0.3, glassH: 0.6 });
  const mastY = D + (tiers > 2 ? 8.1 : 5.8);
  s.add('house', sphere(1.0, 14, 10), { p: [1.4, mastY + 1.4, -L * 0.1] });
  s.add('house', sphere(0.8, 14, 10), { p: [-1.4, mastY + 1.3, -L * 0.1] });
  s.add('house', cyl(0.25, 0.4, 2.2, 8), { p: [0, mastY + 1.0, -L * 0.1] });
  for (const side of [-1, 1]) {
    const rail = range(L * 0.12, L * 0.46, 10).map(z => {
      const st = station(z, o), x = side * (st.w - 0.35);
      s.add('chrome', cyl(0.07, 0.09, 1.02, 6), { p: [x, st.top + 0.5, z] });
      return [x, st.top + 1, z];
    });
    s.add('chrome', tube(rail, 0.09, 22, 6));
  }
  s.add('pool', box(4.4, 0.5, 5, 0.25, 2), { p: [0, station(L * 0.25, o).top + 0.3, L * 0.25] });
  const grp = s.build({}), M = new THREE.Matrix4().makeRotationY(yaw).setPosition(x, 0, z);
  grp.traverse(m => { if (m.isMesh) b.add(m.name === 'boot' ? boot : m.name, m.geometry.applyMatrix4(M)); });
  return o;
}
/** The name follows the changing beam, sheer, and flare on each side of the bow. */
export function marinaLettering(atlas, tile, hull, x, z) {
  const { L } = hull;
  const height = L * 0.024, count = 14;
  for (const side of [-1, 1]) {
    const edge = u => {
      const st = station(L * (0.29 + side * (0.5 - u) * 0.25), hull);
      return [-height / 2, height / 2].map(dy => {
        const y = st.top - 4.35 + dy;
        const [width] = sectionPt(st, uAt(st, y), 0.035);
        return [x + side * width, y, z + st.z];
      });
    };
    let left = edge(0);
    for (let i = 1; i <= count; i++) {
      const right = edge(i / count);
      atlas.strip(tile, left, right, (i - 1) / count, i / count);
      left = right;
    }
  }
}

export const YACHT_MATS = () => ({
  hull: WHITE, bottom: paint(0x10233f, { rough: 0.35, clear: 0.5 }), gold: GOLDP, glass: SMOKE, deck: teakMat(),
  cut: WHITE, house: WHITE, chrome: CHROME, pool: new THREE.MeshStandardMaterial({ color: 0x0aa7c6, emissive: 0x29d9f0, emissiveIntensity: 0.7, roughness: 0.1 }),
  bootRed: paint(0xc8323a, { rough: 0.3, clear: 0.6 }), bootBlue: paint(0x2456a6, { rough: 0.3, clear: 0.6 }), bootGold: paint(0xd9a63a, { rough: 0.3, metal: 0.5, clear: 0.6 }), bootTeal: paint(0x1b9aa6, { rough: 0.3, clear: 0.6 }),
});

/* ---------- life on the water ---------- */
/** A jet ski, about 3.2 m, rider aboard. Facing +Z. */
export function jetSki(color = 0xe2603d) {
  const b = new ModelBuilder();
  b.add('body', loft([{ z: -1.6, w: 0.55, h: 0.3, y: 0.35, n: 3 }, { z: -0.4, w: 0.62, h: 0.42, y: 0.4, n: 3 }, { z: 0.9, w: 0.5, h: 0.36, y: 0.45, n: 2.6 }, { z: 1.6, w: 0.1, h: 0.2, y: 0.6, n: 2.2 }], 12, 3));
  b.add('seat', box(0.5, 0.25, 1.1, 0.12, 2), { p: [0, 0.85, -0.6] });
  b.add('dark', box(0.9, 0.12, 0.12, 0.05, 1), { p: [0, 1.15, 0.45] });
  b.add('rider', capsule(0.26, 0.55, 4, 8), { p: [0, 1.4, -0.35], r: [0.35, 0, 0] });
  b.add('skin', sphere(0.2, 10, 8), { p: [0, 1.92, -0.15] });
  b.add('vest', box(0.6, 0.45, 0.4, 0.15, 2), { p: [0, 1.35, -0.38], r: [0.35, 0, 0] });
  return b.build({ body: paint(color, { rough: 0.3, clear: 0.7 }), seat: MAT.black, dark: MAT.dark, rider: plastic(0x23252c, 0.6), skin: plastic(0xe0ac85, 0.7), vest: plastic(0xff7a1a, 0.6) });
}

/** A gull: two wing panels in a shallow V, body between. Facing +Z, about 1.6 m span. */
export function gull() {
  const b = new ModelBuilder();
  b.add('w', box(0.8, 0.04, 0.34, 0.02, 1), { p: [0.38, 0.1, 0], r: [0, 0, 0.25] });
  b.add('w', box(0.8, 0.04, 0.34, 0.02, 1), { p: [-0.38, 0.1, 0], r: [0, 0, -0.25] });
  b.add('w', sphere(0.14, 8, 6), { p: [0, 0, 0.05], s: [1, 0.9, 2.4] });
  b.add('tip', box(0.26, 0.05, 0.3, 0.02, 1), { p: [0.82, 0.21, -0.02], r: [0, 0, 0.25] });
  b.add('tip', box(0.26, 0.05, 0.3, 0.02, 1), { p: [-0.82, 0.21, -0.02], r: [0, 0, -0.25] });
  return b.build({ w: plastic(0xf4f4f0, 0.7), tip: plastic(0x2a2d33, 0.7) });
}

/** A beach bar on the sand spit: thatched hut, counter, stools. Facing +Z. */
export function beachBar() {
  const b = new ModelBuilder();
  b.add('wood', box(7.6, 1.15, 2.2, 0.15, 2), { p: [0, 0.58, 1.6] });
  b.add('top', box(8.2, 0.2, 2.6, 0.08, 1), { p: [0, 1.22, 1.6] });
  for (const sx of [-3.6, 3.6]) for (const sz of [-1.6, 2.6]) b.add('wood', cyl(0.14, 0.17, 3.6, 8), { p: [sx, 1.8, sz] });
  b.add('straw', cone(6.6, 2.6, 10), { p: [0, 4.6, 0.5], s: [1, 1, 0.7] });
  for (let k = 0; k < 5; k++) { b.add('stool', cyl(0.3, 0.3, 0.12, 10), { p: [-3 + k * 1.5, 0.82, 3.5] }); b.add('wood', cyl(0.05, 0.05, 0.8, 6), { p: [-3 + k * 1.5, 0.4, 3.5] }); }
  for (let k = 0; k < 6; k++) b.add('bottle' + (k % 3), cyl(0.09, 0.11, 0.45, 8), { p: [-2.4 + k * 0.9, 1.55, 1.2] });
  return b.build({
    wood: plastic(0x8a5a36, 0.85), top: plastic(0xb98a5a, 0.7), straw: plastic(0xd9b26a, 0.95), stool: paint(0xe2603d, { rough: 0.5 }),
    bottle0: glow(0x6ee7ff, 0.6), bottle1: glow(0xffd23c, 0.6), bottle2: glow(0xff6aa0, 0.6),
  });
}

/* ---------- draw-call savers: a baker that merges placed props by material,
   and a text atlas that packs every sign face into one canvas (after Crypto Cove) ---------- */
class Quads {
  constructor() { this.p = []; this.n = []; this.u = []; }
  quad(a, b, c, d, uv = [0, 0, 1, 1]) {
    const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2], vx = d[0] - a[0], vy = d[1] - a[1], vz = d[2] - a[2];
    let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx; const l = Math.hypot(nx, ny, nz) || 1; nx /= l; ny /= l; nz /= l;
    const t = [[uv[0], uv[1]], [uv[2], uv[1]], [uv[2], uv[3]], [uv[0], uv[3]]];
    for (const k of [0, 1, 2, 0, 2, 3]) { const q = [a, b, c, d][k]; this.p.push(q[0], q[1], q[2]); this.n.push(nx, ny, nz); this.u.push(t[k][0], t[k][1]); }
  }
  /** A flat panel facing yaw (0 = +Z), centred at c, w by h. */
  panel(c, yaw, w, h, uv) {
    const rx = Math.cos(yaw), rz = -Math.sin(yaw);
    const P = (sx, sy) => [c[0] + rx * w / 2 * sx, c[1] + h / 2 * sy, c[2] + rz * w / 2 * sx];
    this.quad(P(-1, -1), P(1, -1), P(1, 1), P(-1, 1), uv);
  }
  get empty() { return !this.p.length; }
  geometry() {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.p, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(this.n, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(this.u, 2));
    g.computeBoundingSphere();
    return g;
  }
}

/** Merge placed objects by material: one mesh per material for the whole course. */
export function makeBaker(group, shadows) {
  const buckets = new Map();
  // Paint colors do not need their own draw call. Preserve the actual
  // lighting model and finish, moving only its diffuse color to the vertices.
  const finishes = new Map();
  const push = (mat, g, cast) => {
    if (mat.isMeshStandardMaterial && !mat.map && !mat.transparent && !mat.vertexColors && !mat.emissive.getHex()) {
      const key = [mat.type, mat.side, mat.roughness, mat.metalness, mat.clearcoat, mat.clearcoatRoughness, mat.envMapIntensity].join('/');
      let finish = finishes.get(key);
      if (!finish) {
        finish = mat.clone(); finish.color.set(0xffffff); finish.vertexColors = true;
        finishes.set(key, finish);
      }
      const colors = new Float32Array(g.attributes.position.count * 3);
      for (let i = 0; i < colors.length; i += 3) mat.color.toArray(colors, i);
      g.setAttribute('color', new THREE.BufferAttribute(colors, 3));
      mat = finish;
    }
    let bucket = buckets.get(mat);
    if (!bucket) buckets.set(mat, bucket = [[], []]);
    bucket[cast && !mat.transparent ? 0 : 1].push(g);
  };
  const norm = (geo, matrix) => {
    const g = geo.index ? geo.toNonIndexed() : geo.clone();
    for (const n of Object.keys(g.attributes)) if (!['position', 'normal', 'uv', 'color'].includes(n)) g.deleteAttribute(n);
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
    /** Bake a placed object (and take it out of the scene). */
    add(obj, cast = true) {
      obj.updateMatrixWorld(true);
      obj.traverse(o => { if (o.isMesh && !o.isInstancedMesh && !Array.isArray(o.material)) push(o.material, norm(o.geometry, o.matrixWorld), cast); });
      obj.removeFromParent();
    },
    /** Bake a ModelBuilder's buckets (geometry already in world space). */
    builder(b, mats, cast = true) { const grp = b.build(mats); grp.traverse(o => { if (o.isMesh) push(o.material, norm(o.geometry, null), cast); }); },
    flush() {
      for (const [mat, lists] of buckets) lists.forEach((list, k) => {
        if (!list.length) return;
        const geo = mergeGeometries(list, false); list.forEach(g => g.dispose());
        geo.computeBoundingSphere();
        const m = new THREE.Mesh(geo, mat); m.castShadow = k === 0 && shadows; m.receiveShadow = false; m.matrixAutoUpdate = false; m.renderOrder = mat.transparent ? 2 : 0; group.add(m);
      });
      buckets.clear();
    },
  };
}

/** Text panels packed into big canvases, one mesh per canvas; redrawn once the web fonts arrive. */
export function makeAtlas(group, S = 2048, { emissive = 0.25 } = {}) {
  const pages = [], newPage = () => {
    const c = document.createElement('canvas'); c.width = c.height = S;
    const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
    const mat = new THREE.MeshStandardMaterial({ map: tex, emissiveMap: tex, emissive: 0xffffff, emissiveIntensity: emissive, roughness: 0.6 });
    const p = { c, g: c.getContext('2d'), tex, mat, q: new Quads(), x: 0, y: 0, row: 0, items: [] }; pages.push(p); return p;
  };
  newPage();
  const alloc = (w, h) => {
    let p = pages[pages.length - 1];
    if (p.x + w > S) { p.x = 0; p.y += p.row + 2; p.row = 0; }
    if (p.y + h > S) { p = newPage(); }
    const r = { p, x: p.x, y: p.y, w, h }; p.x += w + 2; p.row = Math.max(p.row, h); return r;
  };
  const api = {
    add(w, h, draw) { const r = alloc(w, h); r.draw = draw; r.p.items.push(r); return r; },
    place(r, c, yaw, w, h) { const { p } = r; p.q.panel(c, yaw, w, h, [r.x / S, 1 - (r.y + r.h) / S, (r.x + r.w) / S, 1 - r.y / S]); },
    strip(r, left, right, u0, u1) {
      r.p.q.quad(left[0], right[0], right[1], left[1], [(r.x + r.w * u0) / S, 1 - (r.y + r.h) / S, (r.x + r.w * u1) / S, 1 - r.y / S]);
    },
    /** Two faces back to back, so the sign reads the right way round from both sides. */
    place2(r, c, yaw, w, h, gap = 0.08) {
      const fx = Math.sin(yaw) * gap, fz = Math.cos(yaw) * gap;
      api.place(r, [c[0] + fx, c[1], c[2] + fz], yaw, w, h); api.place(r, [c[0] - fx, c[1], c[2] - fz], yaw + Math.PI, w, h);
    },
    paint() { for (const p of pages) { p.g.clearRect(0, 0, S, S); for (const r of p.items) { p.g.save(); p.g.translate(r.x, r.y); p.g.beginPath(); p.g.rect(0, 0, r.w, r.h); p.g.clip(); r.draw(p.g, r.w, r.h); p.g.restore(); } p.tex.needsUpdate = true; } },
    flush() {
      api.paint();
      for (const p of pages) if (!p.q.empty) { const m = new THREE.Mesh(p.q.geometry(), p.mat); m.matrixAutoUpdate = false; group.add(m); }
      if (typeof document !== 'undefined' && document.fonts?.ready) document.fonts.ready.then(() => api.paint());
    },
  };
  return api;
}

/** A pearl office in a scallop shell. The fan is corrugated on both faces
 * so it still reads as a shell from the water, or in silhouette from the quay. */
export function shellOffice() {
  const b = new ModelBuilder();
  const xAt = a => 10.6 * Math.sin(a), yAt = a => 3.2 + 12.2 * Math.cos(a);
  const fan = [], ix = [];
  for (let k = 0; k <= 32; k++) {
    const a = (k / 32 - 0.5) * 2.76, rib = k % 2 ? 0.72 : 1;
    fan.push(0.12 * xAt(a), 2.2, 0.1, xAt(a), yAt(a) * (0.98 + 0.02 * rib), -3 + 2.4 * rib);
    if (k) { const i = 2 * k - 2; ix.push(i, i + 2, i + 1, i + 1, i + 2, i + 3); }
    if (k % 4 === 0) b.add('lip', tube([[0.12*xAt(a),2.2,0.14], [0.6*xAt(a),2.2+(yAt(a)-2.2)*0.54,-0.13], [xAt(a),yAt(a),-0.5]], 0.12, 6, 6));
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(fan, 3)); geo.setIndex(ix); geo.computeVertexNormals();
  b.add('shell', geo);
  b.add('pearl', sphere(3.8, 26, 18), {p:[0,5.6,2.3]});
  b.add('lip', sphere(1, 24, 10), {p:[0,2.15,1.8],s:[8.7,1.1,5.2]});
  b.add('pontoon', cyl(9.6,8.4,1.7,32), {p:[0,0.85,1.5],s:[1,1,0.68]});
  const coral = paint(0xf97070,{rough:0.4,clear:0.6}); coral.side = THREE.DoubleSide;
  const group = b.build({shell:coral,lip:paint(0xffb078,{rough:0.4}),pearl:paint(0xfff3db,{rough:0.18,clear:1}),pontoon:SMOKE});
  const plaque = boardMesh(['SHELL COMPANY'], 18.6, 3.7, {bg:'#123548', accent:'#f99b75'});
  plaque.position.set(0,3.4,6.8); group.add(plaque);
  return group;
}

/** A semaphore marshal, with each arm and flag pivoting at the shoulder. */
export function deckMarshal() {
  const root = new THREE.Group(), body = new ModelBuilder();
  const white = WHITE, navy = SMOKE, skin = plastic(0xb87f58, 0.76);
  for (const side of [-1, 1]) {
    body.add('navy', capsule(0.14, 0.54, 3, 8), { p: [side * 0.19, 0.49, 0] });
    body.add('navy', box(0.29, 0.19, 0.44, 0.06, 1), { p: [side * 0.19, 0.1, -0.06] });
  }
  body.add('white', sphere(0.43, 12, 10), { p: [0, 1.22, 0], s: [1, 1.24, 0.7] });
  body.add('skin', sphere(0.26, 12, 10), { p: [0, 1.92, -0.02] });
  body.add('white', cyl(0.32, 0.29, 0.14, 12), { p: [0, 2.15, 0] });
  body.add('navy', box(0.51, 0.055, 0.29, 0.02, 1), { p: [0, 2.09, -0.17] });
  body.add('gold', box(0.67, 0.14, 0.24, 0.04, 1), { p: [0, 1.48, -0.22] });
  root.add(body.build({ white, navy, skin, gold: GOLDP }));
  // Both marshals share the same flag geometry. The diagonal division
  // separates the two halves of each semaphore flag even when backlit.
  const limb = new ModelBuilder();
  limb.add('white', capsule(0.13, 0.5, 3, 8), { p: [0, 0.28, 0] });
  limb.add('skin', sphere(0.14, 8, 6), { p: [0, 0.65, 0] });
  limb.add('gold', cyl(0.036, 0.036, 1.32, 6), { p: [0, 1.15, 0] });
  const tri = points => {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(points.flat(), 3));
    geo.computeVertexNormals(); return geo;
  };
  const a = [0, 1.82, 0], b = [0.86, 1.82, -0.09], c = [0.86, 1.12, -0.09], d = [0, 1.12, 0];
  limb.add('red', tri([a, b, c])); limb.add('yellow', tri([a, c, d]));
  const red = paint(0xf03834, { rough: 0.7 }), yellow = paint(0xffbd27, { rough: 0.7 });
  red.side = yellow.side = THREE.DoubleSide;
  const left = limb.build({ white, skin, gold: GOLDP, red, yellow }), right = left.clone();
  left.position.set(-0.36, 1.54, 0); right.position.set(0.36, 1.54, 0);
  left.rotation.z = 0.85; right.rotation.z = -0.85;
  root.add(left, right); return { root, left, right };
}

/** Each owner has a different roofline visible when arriving from the
 * previous jump. All geometry is in yacht coordinates, forward is +Z. */
function yachtEmblem(b, emblem, roofY, z) {
  if (emblem === 'crown') {
    b.add('gold', cyl(3.65,3.15,1.45,16), {p:[0,roofY+0.6,z]});
    for(let j=0;j<8;j++) {
      const a = j*Math.PI/4, x = 3.23*Math.cos(a), zz = z+3.23*Math.sin(a);
      b.add('gold', cone(1.42,2.85,6), {p:[x,roofY+2.2,zz]});
      b.add('boot', sphere(0.32,8,6), {p:[x,roofY+3.65,zz]});
    }
  } else if (emblem === 'shark') {
    const fin = new THREE.Shape();
    fin.moveTo(-4.9,0); fin.quadraticCurveTo(-2.8,1.2,1.5,7.6);
    fin.quadraticCurveTo(2.1,3.4,5.2,0); fin.closePath();
    const g = new THREE.ExtrudeGeometry(fin,{depth:1.1,bevelEnabled:true,bevelThickness:0.25,bevelSize:0.2,bevelSegments:2,steps:1});
    b.add('boot',g,{p:[0,roofY,z],r:[0,0.42,0]});
  } else {
    // Oversized red tally light and the network's live camera lens.
    b.add('glass', box(8,3.3,3.2,0.5,2), {p:[0,roofY+1.5,z]});
    b.add('chrome', cyl(1.5,1.75,2.2,18), {p:[2.25,roofY+1.55,z-2.2],r:[Math.PI/2,0,0]});
    b.add('glass', cyl(1.35,1.35,0.14,18), {p:[2.25,roofY+1.55,z-3.38],r:[Math.PI/2,0,0]});
    b.add('tally', sphere(0.65,12,8), {p:[-2.8,roofY+3.25,z-0.8]});
  }
}

/** A harbour sign face for the atlas: navy ground, gold rules, cream title, gold subtitle. */
export const signFace = (lines, { bg = '#10222e', fg = '#f3ead2', accent = '#e8b64c', rule = true } = {}) => (g, W, H) => {
  g.fillStyle = bg; g.fillRect(0, 0, W, H);
  if (rule) { g.fillStyle = accent; g.fillRect(0, H * 0.04, W, H * 0.025); g.fillRect(0, H * 0.935, W, H * 0.025); }
  const n = lines.length;
  lines.forEach((text, i) => {
    const one = n === 1, cy = one ? H * 0.53 : (i === 0 ? H * 0.37 : H * 0.73);
    fitText(g, text, W / 2, cy, W * 0.9, one ? H * 0.62 : (i === 0 ? H * 0.42 : H * 0.3), one ? H * 0.6 : H * (i === 0 ? 0.42 : 0.3), FONT, { fill: i === 0 ? fg : accent });
  });
};

/** A yacht's name for the atlas: navy letters on hull white. */
export const nameFace = text => (g, W, H) => {
  g.fillStyle = '#f7f6f2'; g.fillRect(0, 0, W, H);
  fitText(g, text, W / 2, H / 2 + 4, W * 0.94, H * 0.84, H * 0.8, FONT, { fill: '#10233f' });
};

/** A pile for the piers: unit height (scaled by the instance), foot at y = 0. */
export function pile() {
  const b = new ModelBuilder();
  b.add('pile', cyl(0.5, 0.58, 1, 10), { p: [0, 0.5, 0] });
  return b.build({ pile: plastic(0x6b5340, 0.85) });
}
/** The weed-and-barnacle band a pile shows when the tide goes out. Centre at y = 0.9. */
export function pileBand() {
  const b = new ModelBuilder();
  b.add('band', cyl(0.62, 0.66, 1.8, 10), { p: [0, 0.9, 0] });
  return b.build({ band: plastic(0x2f4a33, 0.95) });
}

/** A drink cart crossing the teak: a gold trolley, an umbrella, champagne on ice. ~1.2 m radius. */
export function drinkCart() {
  const grp = new THREE.Group(), b = new ModelBuilder();
  b.add('gold', box(1.8, 0.12, 1.1, 0.05, 1), { p: [0, 0.95, 0] });
  b.add('gold', box(1.8, 0.1, 1.1, 0.05, 1), { p: [0, 0.4, 0] });
  for (const sx of [-0.8, 0.8]) for (const sz of [-0.45, 0.45]) { b.add('gold', cyl(0.04, 0.04, 0.9, 6), { p: [sx, 0.67, sz] }); b.add('dark', sphere(0.12, 8, 6), { p: [sx, 0.12, sz] }); }
  b.add('ice', cyl(0.3, 0.24, 0.4, 12), { p: [-0.4, 1.2, 0] });
  for (const k of [-0.1, 0.1]) b.add('bottle', cyl(0.07, 0.09, 0.6, 8), { p: [-0.4 + k, 1.45, k] });
  b.add('pole', cyl(0.03, 0.03, 1.8, 6), { p: [0.5, 1.9, 0] });
  b.add('shade', cone(1.25, 0.5, 12), { p: [0.5, 2.85, 0] });
  grp.add(b.build({ gold: GOLDP, dark: MAT.dark, ice: plastic(0xdfe8ee, 0.2, 0.6), bottle: plastic(0x1f5a32, 0.3), pole: MAT.chrome, shade: paint(0xe2603d, { rough: 0.6 }) }));
  return grp;
}
