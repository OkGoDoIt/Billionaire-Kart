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
import { ModelBuilder, box, sphere, cyl, cone, torus, tube, lathe, loft, plastic, glow, paint, MAT } from './build.js';
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

/* ---------- the dry dock on the north straight ---------- */
/** The giant name banner rigged on the dry-docked yacht's hull side.
    30 x 7 m in the yacht's local units; letters close to 4.5 m tall. */
export function hullName(text) {
  const grp = new THREE.Group();
  const tex = canvasTex(2048, 512, (g, W, H) => {
    g.fillStyle = '#7a5c14'; g.fillRect(0, 0, W, H);
    g.strokeStyle = '#ffe9a8'; g.lineWidth = 10; g.strokeRect(18, 18, W - 36, H - 36);
    fitText(g, text, W / 2, H / 2 + 8, W - 120, H * 0.7, 320, FONT, { fill: '#ffe9a8' });
  }, { repeat: false, aniso: 8 });
  const face = new THREE.Mesh(new THREE.PlaneGeometry(30, 7), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.55 }));
  grp.add(face);
  const back = new THREE.Mesh(new THREE.BoxGeometry(30.3, 7.3, 0.18), new THREE.MeshStandardMaterial({ color: 0x3a2f10, roughness: 0.7 }));
  back.position.z = -0.1; grp.add(back);
  return grp;
}

/** The dry dock itself: two pile cradle towers holding a yacht hull clear of
    the sea while the road runs between them. Local frame: +Z along the road,
    towers at x = +-30, cradle beams at y ~9.4, waterline at y = 0. */
export function dryDock() {
  const grp = new THREE.Group(), b = new ModelBuilder();
  for (const sx of [1, -1]) {
    for (const sz of [1, -1]) {
      b.add('pile', cyl(0.85, 0.95, 13.5, 10), { p: [sx * 30, 1.8, sz * 26] });
      b.add('pile', cyl(0.85, 0.95, 13.5, 10), { p: [sx * 30, 1.8, sz * 9] });
      b.add('brace', box(0.5, 12.5, 0.5, 0.2, 1), { p: [sx * 28.4, 3.4, sz * 17.5], r: [0, 0, sx * 0.62] });
    }
    b.add('beam', box(3.4, 1.6, 62, 0.3, 2), { p: [sx * 30, 9.4, 0] });
    for (const z of [-16, 0, 16]) b.add('saddle', box(4.6, 1.1, 7, 0.2, 2), { p: [sx * 17.5, 9.6, z], r: [0, 0, sx * 0.5] });
    b.add('scaffold', box(1.4, 10.6, 30, 0.2, 2), { p: [sx * 36.5, 5.6, 0] });
    b.add('plank', box(2.6, 0.3, 30, 0.1, 1), { p: [sx * 34.6, 8.2, 0] });
    b.add('plank', box(2.6, 0.3, 30, 0.1, 1), { p: [sx * 34.6, 4.6, 0] });
    b.add('lamp', sphere(0.3, 10, 8), { p: [sx * 28.2, 8.3, -12] });
    b.add('lamp', sphere(0.3, 10, 8), { p: [sx * 28.2, 8.3, 12] });
  }
  grp.add(b.build({
    pile: plastic(0x5a4632, 0.75, 0.2), beam: plastic(0x74552a, 0.6, 0.35), brace: plastic(0x4c3a24, 0.7, 0.2),
    saddle: paint(0x8a6a30, { rough: 0.6 }), scaffold: plastic(0x8f97a3, 0.55, 0.5), plank: paint(0xb08d4f, { rough: 0.8 }),
    lamp: glow(0xffd9a0, 1.8),
  }));
  for (const sx of [1, -1]) {
    const sign = boardMesh(['DRY DOCK 12', 'REPAIRS WELCOME'], 9, 2.6);
    sign.position.set(sx * 31.9, 3.6, 8); sign.rotation.y = sx > 0 ? -Math.PI / 2 : Math.PI / 2;
    grp.add(sign);
  }
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
