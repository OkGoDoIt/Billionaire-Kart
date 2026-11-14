/* Props for Crypto Cove: superyachts, the lighthouse, the beach club, beach
   furniture, tiki torches, and the crab and treasure obstacles. Each builder
   returns a THREE.Group sitting on y = 0, facing +Z, built from a few merged
   meshes. Canvas textures are only made when a builder runs (browser only). */
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { ModelBuilder, box, sphere, cyl, cone, torus, tube, lathe, loft, plastic, glow, paint, MAT } from './build.js';
import { canvasTex } from '../render/textures.js';

const tintable = (color, rough = 0.7) => { const m = new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: 0, envMapIntensity: 0.6 }); m.userData.tintable = true; return m; };
const WOOD = plastic(0x8a5a36, 0.9), WOOD_DARK = plastic(0x5e3b22, 0.9), STRAW = plastic(0xd9b26a, 0.95), BAMBOO = plastic(0xc9a46a, 0.8);
const GOLD = paint(0xffc23a, { rough: 0.3, metal: 0.6, clear: 0.4 });
const SHELL = paint(0xf6f4ef, { rough: 0.28, clear: 0.8 }), GLASS = plastic(0x1d3346, 0.15, 0.6);
const FONT = '"Luckiest Guy", "Arial Black", sans-serif';

/** A twisted foil dog in profile. Each swollen segment pinches into the next. */
export function listingBalloon() {
  const b = new ModelBuilder();
  const lobe = (x, y, z, w, h, d, lean = 0) =>
    b.add('foil', sphere(1, 20, 14), { p: [x, y, z], s: [w, h, d], r: [0, 0, lean] });
  lobe(0, 1.85, 0, 1.76, 0.74, 0.7);
  for (const side of [-1, 1]) {
    lobe(-1.05, 0.99, side * 0.32, 0.43, 1.01, 0.42, -0.18);
    lobe(1.12, 0.99, side * 0.32, 0.43, 1.01, 0.42, 0.16);
  }
  lobe(-1.44, 2.67, 0, 0.47, 1, 0.48, 0.43);
  lobe(-2.28, 3.28, 0, 0.9, 0.53, 0.52, 0.08);
  lobe(-1.98, 4.08, -0.32, 0.34, 1.02, 0.3, 0.24);
  lobe(-1.43, 4.12, 0.22, 0.34, 1.05, 0.32, -0.38);
  lobe(1.83, 2.56, 0, 0.36, 1.09, 0.35, -0.55);
  b.add('knot', cone(0.19, 0.3, 8), { p: [-3.16, 3.29, 0], r: [0, 0, Math.PI / 2] });
  return b.build({ foil: GOLD, knot: WOOD_DARK });
}

/** A painted name board as a texture: text centred on a coloured ground. */
function nameTex(text, { w = 512, h = 128, bg = '#f6f4ef', fg = '#14213d', stroke = null, size = 84 } = {}) {
  return canvasTex(w, h, (g, W, H) => {
    g.fillStyle = bg; g.fillRect(0, 0, W, H);
    let s = size; g.font = `${s}px ${FONT}`;
    while (g.measureText(text).width > W - 40 && s > 18) { s -= 4; g.font = `${s}px ${FONT}`; }
    g.textAlign = 'center'; g.textBaseline = 'middle';
    if (stroke) { g.lineWidth = 8; g.strokeStyle = stroke; g.strokeText(text, W / 2, H / 2 + 4); }
    g.fillStyle = fg; g.fillText(text, W / 2, H / 2 + 4);
  }, { repeat: false, aniso: 8 });
}

/* ---------- the bay ---------- */
/** Superyacht about 40 m long: lofted white hull, two decks, a helipad, and its name on the stern. */
export function superyacht(name = 'LIQUIDITY', { accent = 0x14213d, L = 40, bigName = false } = {}) {
  const grp = new THREE.Group(), b = new ModelBuilder(), h = L / 2;
  // hull along Z, bow at +Z; y is the centre of each section
  b.add('hull', loft([
    { z: -h, w: 3.9, h: 1.7, y: 1.6, n: 3.2 },
    { z: -h * 0.7, w: 4.4, h: 2.1, y: 1.3, n: 3.2 },
    { z: 0, w: 4.6, h: 2.3, y: 1.2, n: 3.0 },
    { z: h * 0.55, w: 3.9, h: 2.4, y: 1.4, n: 2.8 },
    { z: h * 0.85, w: 2.2, h: 2.4, y: 1.9, n: 2.4 },
    { z: h, w: 0.25, h: 1.4, y: 2.9, n: 2.2 },
  ], 28, 5));
  b.add('stripe', loft([
    { z: -h * 0.98, w: 3.97, h: 0.32, y: 0.55, n: 4 },
    { z: 0, w: 4.66, h: 0.32, y: 0.15, n: 4 },
    { z: h * 0.8, w: 2.6, h: 0.32, y: 0.5, n: 4 },
    { z: h * 0.97, w: 0.5, h: 0.3, y: 1.6, n: 4 },
  ], 20, 4));
  // main deck, two superstructure decks, a flybridge
  b.add('deck', box(7.6, 0.35, L * 0.82, 0.15, 2), { p: [0, 3.55, -L * 0.04] });
  b.add('house', box(7.0, 2.3, L * 0.5, 0.9, 3), { p: [0, 4.9, -L * 0.08] });
  b.add('glass', box(7.1, 0.9, L * 0.46, 0.4, 2), { p: [0, 5.0, -L * 0.07] });
  b.add('house', box(5.8, 2.0, L * 0.34, 0.8, 3), { p: [0, 7.0, -L * 0.1] });
  b.add('glass', box(5.9, 0.8, L * 0.3, 0.35, 2), { p: [0, 7.1, -L * 0.08] });
  b.add('house', box(4.6, 0.3, L * 0.22, 0.12, 2), { p: [0, 8.2, -L * 0.13] });
  b.add('house', box(4.4, 1.4, 4.2, 0.6, 3), { p: [0, 8.9, -L * 0.06] });
  b.add('glass', box(4.5, 0.6, 3.6, 0.25, 2), { p: [0, 9.0, -L * 0.03] });
  // radar mast and domes
  b.add('dark', cyl(0.18, 0.28, 3.4, 8), { p: [0, 11, -L * 0.1], r: [-0.25, 0, 0] });
  b.add('house', sphere(0.75, 14, 10), { p: [1.3, 10.1, -L * 0.13] });
  b.add('house', sphere(0.6, 14, 10), { p: [-1.3, 10.0, -L * 0.13] });
  b.add('dark', box(3.2, 0.18, 0.4, 0.08, 1), { p: [0, 12.3, -L * 0.13] });
  // helipad on the foredeck
  b.add('pad', cyl(3.3, 3.3, 0.2, 28), { p: [0, 3.82, L * 0.27] });
  b.add('gold', torus(3.0, 0.12, 6, 32), { p: [0, 3.95, L * 0.27], r: [Math.PI / 2, 0, 0] });
  b.add('gold', box(0.35, 0.06, 2.2, 0.03, 1), { p: [-0.6, 3.95, L * 0.27] });
  b.add('gold', box(0.35, 0.06, 2.2, 0.03, 1), { p: [0.6, 3.95, L * 0.27] });
  b.add('gold', box(0.9, 0.06, 0.35, 0.03, 1), { p: [0, 3.95, L * 0.27] });
  // swim platform and rails
  b.add('wood', box(7.0, 0.3, 2.2, 0.12, 2), { p: [0, 1.0, -h - 0.6] });
  for (const s of [1, -1]) b.add('rail', tube([[s * 3.7, 4.4, -h * 0.82], [s * 3.8, 4.4, 0], [s * 3.2, 4.4, h * 0.55], [s * 1.4, 4.4, h * 0.82]], 0.07, 24, 6));
  const mats = { hull: SHELL, stripe: paint(accent, { rough: 0.3, clear: 0.6 }), deck: plastic(0xb98a5a, 0.8), house: SHELL, glass: GLASS, dark: MAT.dark, pad: plastic(0x2b3440, 0.7), gold: GOLD, wood: plastic(0xb98a5a, 0.8), rail: MAT.chrome };
  grp.add(b.build(mats));
  // the name on the stern transom
  const tex = nameTex(name, { bg: '#f6f4ef', fg: '#' + new THREE.Color(accent).getHexString(), size: 92 });
  const plate = new THREE.Mesh(new THREE.PlaneGeometry(6.4, 1.6), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.4 }));
  plate.position.set(0, 2.15, -h - 0.02); plate.rotation.y = Math.PI; grp.add(plate);
  const big = bigName ? nameTex(name, { w: 1024, h: 180, bg: '#f6f4ef', fg: '#' + new THREE.Color(accent).getHexString(), size: 160 }) : null;
  for (const s of [1, -1]) {   // and along the bow, readable from the shore (or right down the hull, huge)
    const side = new THREE.Mesh(new THREE.PlaneGeometry(big ? 16 : 6, big ? 2.8 : 1.5), new THREE.MeshStandardMaterial({ map: big || tex, roughness: 0.4, transparent: false }));
    if (big) side.position.set(s * 4.7, 1.9, -h * 0.05); else side.position.set(s * 4.02, 2.4, h * 0.42);
    side.rotation.y = s * Math.PI / 2; grp.add(side);
  }
  return grp;
}

/** Striped lighthouse about 30 m tall. userData.beam is the pivot that sweeps the light. */
export function lighthouse({ H = 30 } = {}) {
  const grp = new THREE.Group(), b = new ModelBuilder();
  b.add('stone', cyl(5.4, 6.2, 2.2, 14), { p: [0, 1.1, 0] });
  const bands = 6, top = H * 0.78, r0 = 3.4, r1 = 2.3;
  for (let i = 0; i < bands; i++) {
    const y0 = 2.2 + (i / bands) * (top - 2.2), y1 = 2.2 + ((i + 1) / bands) * (top - 2.2);
    const ra = r0 + (r1 - r0) * (i / bands), rb = r0 + (r1 - r0) * ((i + 1) / bands);
    b.add(i % 2 ? 'white' : 'red', lathe([[ra, 0], [rb, y1 - y0]], 28), { p: [0, y0, 0] });
  }
  for (let i = 0; i < 3; i++) b.add('dark', box(0.8, 1.3, 0.3, 0.12, 1), { p: [0, 7 + i * 6.5, r0 - 0.35 - i * 0.35] });
  // gallery, lantern room, dome
  b.add('dark', cyl(3.4, 3.0, 0.5, 24), { p: [0, top + 0.25, 0] });
  b.add('dark', torus(3.25, 0.08, 4, 32), { p: [0, top + 1.3, 0], r: [Math.PI / 2, 0, 0] });
  for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2; b.add('dark', cyl(0.06, 0.06, 1.1, 4), { p: [Math.cos(a) * 3.25, top + 0.8, Math.sin(a) * 3.25] }); }
  b.add('glass', cyl(1.9, 1.9, 3.2, 16, true), { p: [0, top + 2.1, 0] });
  b.add('red', lathe([[2.3, 0], [2.0, 0.6], [1.2, 1.6], [0.3, 2.2], [0, 2.4]], 20), { p: [0, top + 3.7, 0] });
  b.add('dark', sphere(0.35, 10, 8), { p: [0, top + 6.2, 0] });
  b.add('lamp', sphere(1.0, 16, 12), { p: [0, top + 2.1, 0] });
  grp.add(b.build({ stone: plastic(0x8f857c, 0.95), red: paint(0xe23b3b, { rough: 0.45, clear: 0.3 }), white: paint(0xf7f3ea, { rough: 0.45, clear: 0.3 }), dark: MAT.dark, glass: new THREE.MeshStandardMaterial({ color: 0xfff1c4, emissive: 0xffd27a, emissiveIntensity: 0.5, transparent: true, opacity: 0.45, roughness: 0.1 }), lamp: glow(0xfff0b0, 4) }));
  // two opposed light cones on a pivot
  const pivot = new THREE.Group(); pivot.position.y = top + 2.1;
  const beamMat = new THREE.MeshBasicMaterial({ color: 0xffe2a0, transparent: true, opacity: 0.22, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
  for (const s of [1, -1]) {
    const g = new THREE.ConeGeometry(5, 46, 20, 1, true); g.translate(0, -23, 0); g.rotateZ(s * Math.PI / 2);
    pivot.add(new THREE.Mesh(g, beamMat));
  }
  grp.add(pivot); grp.userData.beam = pivot;
  return grp;
}

/** Beach club pavilion: a deck on stilts, a thatched roof, a bar, and a crooked sign. */
export function beachClub(title = 'THE EXCHANGE') {
  const grp = new THREE.Group(), b = new ModelBuilder();
  b.add('wood', box(22, 0.6, 14, 0.15, 2), { p: [0, 1.2, 0] });
  for (const x of [-10, -3.4, 3.4, 10]) for (const z of [-6, 6]) { b.add('dark', cyl(0.3, 0.34, 1.2, 8), { p: [x, 0.5, z] }); b.add('bamboo', cyl(0.28, 0.32, 5.4, 8), { p: [x, 4.2, z] }); }
  b.add('wood', box(3, 0.3, 4, 0.1, 1), { p: [0, 0.6, 8.2] });                     // steps down to the sand
  // the thatch: a wide, low pyramid with a second tier
  const thatch = cone(1, 1, 4); thatch.rotateY(Math.PI / 4);
  b.add('straw', thatch, { p: [0, 8.6, 0], s: [17, 3.6, 12] });
  b.add('straw', thatch, { p: [0, 10.9, 0], s: [7, 2.4, 5] });
  b.add('strawD', torus(1, 0.05, 4, 4), { p: [0, 6.9, 0], r: [Math.PI / 2, 0, Math.PI / 4], s: [16.8, 11.9, 6] });
  // bar counter and stools
  b.add('wood', box(10, 1.3, 1.6, 0.25, 2), { p: [0, 2.15, -3.5] });
  b.add('gold', box(10.4, 0.18, 1.9, 0.08, 1), { p: [0, 2.9, -3.5] });
  for (let i = 0; i < 6; i++) { b.add('dark', cyl(0.06, 0.06, 1.0, 5), { p: [-4 + i * 1.6, 2.0, -1.9] }); b.add('stool', cyl(0.36, 0.36, 0.16, 12), { p: [-4 + i * 1.6, 2.55, -1.9] }); }
  b.add('dark', box(9, 2.2, 0.3, 0.1, 1), { p: [0, 3.0, -5.6] });                    // back shelf
  for (let i = 0; i < 10; i++) b.add(i % 2 ? 'bottleA' : 'bottleB', cyl(0.12, 0.14, 0.6, 8), { p: [-3.8 + i * 0.85, 3.6, -5.35] });
  grp.add(b.build({ wood: WOOD, dark: WOOD_DARK, bamboo: BAMBOO, straw: STRAW, strawD: plastic(0xb08a4a, 0.95), gold: GOLD, stool: paint(0xff6a3d, { rough: 0.5 }), bottleA: glow(0x35e0ff, 1.2), bottleB: glow(0xff9f43, 1.2) }));
  // crooked sign on two posts at the front
  const sb = new ModelBuilder();
  for (const x of [-4.2, 4.2]) sb.add('post', cyl(0.18, 0.2, 4.6, 8), { p: [x, 2.3, 0] });
  const posts = sb.build({ post: WOOD_DARK }); posts.position.z = 10.5; grp.add(posts);
  const tex = nameTex(title, { w: 768, h: 160, bg: '#2a1b10', fg: '#ffc23a', stroke: '#120a04', size: 110 });
  const sign = new THREE.Mesh(new THREE.BoxGeometry(9.6, 2.0, 0.3), [WOOD_DARK, WOOD_DARK, WOOD_DARK, WOOD_DARK, new THREE.MeshStandardMaterial({ map: tex, roughness: 0.7, emissiveMap: tex, emissive: 0xffffff, emissiveIntensity: 0.15 }), WOOD_DARK]);
  sign.position.set(0, 4.0, 10.7); sign.rotation.z = -0.09; grp.add(sign);
  return grp;
}

/** Beach umbrella; the canopy takes instance tints. */
export function umbrella() {
  const b = new ModelBuilder();
  b.add('pole', cyl(0.05, 0.05, 2.6, 6), { p: [0, 1.3, 0] });
  b.add('top', cone(1.55, 0.6, 10), { p: [0, 2.55, 0] });
  b.add('pole', sphere(0.09, 6, 5), { p: [0, 2.88, 0] });
  return b.build({ pole: plastic(0xf4f4f0, 0.5), top: tintable(0xff6a3d, 0.75) });
}
export const UMBRELLA_TINTS = [0xff6a3d, 0x1fc3c8, 0xffd23c, 0xff4d8d, 0xf7f3ea, 0x7b5cff];

/** Sun lounger with a tintable cushion. */
export function lounger() {
  const b = new ModelBuilder();
  b.add('frame', box(0.75, 0.12, 1.5, 0.04, 1), { p: [0, 0.35, -0.2] });
  b.add('frame', box(0.75, 0.12, 0.8, 0.04, 1), { p: [0, 0.6, 0.8], r: [-0.6, 0, 0] });
  for (const [x, z] of [[0.3, -0.85], [-0.3, -0.85], [0.3, 0.45], [-0.3, 0.45]]) b.add('frame', cyl(0.035, 0.035, 0.35, 5), { p: [x, 0.17, z] });
  b.add('pad', box(0.68, 0.1, 1.45, 0.04, 1), { p: [0, 0.45, -0.2] });
  b.add('pad', box(0.68, 0.1, 0.75, 0.04, 1), { p: [0, 0.68, 0.78], r: [-0.6, 0, 0] });
  return b.build({ frame: plastic(0xf4f4f0, 0.5), pad: tintable(0x1fc3c8, 0.8) });
}

/** Decorative tiki torch: bamboo pole with a small glowing flame. */
export function tikiTorch({ h = 3.2 } = {}) {
  const b = new ModelBuilder();
  b.add('bamboo', cyl(0.09, 0.12, h, 7), { p: [0, h / 2, 0] });
  for (let i = 1; i < 4; i++) b.add('knot', torus(0.11, 0.025, 4, 10), { p: [0, (h / 4) * i, 0], r: [Math.PI / 2, 0, 0] });
  b.add('cup', lathe([[0.12, 0], [0.26, 0.2], [0.28, 0.45], [0.2, 0.5]], 10), { p: [0, h, 0] });
  b.add('flame', cone(0.2, 0.7, 8), { p: [0, h + 0.75, 0] });
  b.add('flame2', sphere(0.2, 8, 6), { p: [0, h + 0.5, 0] });
  return b.build({ bamboo: BAMBOO, knot: WOOD_DARK, cup: WOOD_DARK, flame: glow(0xffa21f, 3), flame2: glow(0xffd04a, 3) }, { cast: false });
}

/** Marker buoy for the bay. label: a little board on the mast (the obstacle buoy is a "stablecoin"). */
export function buoy(color = 0xff6a3d, label = null) {
  const b = new ModelBuilder();
  b.add('body', lathe([[0, -0.6], [0.9, -0.4], [1.0, 0.2], [0.7, 0.6], [0, 0.65]], 16), { p: [0, 0.6, 0] });
  b.add('band', cyl(1.02, 1.02, 0.3, 16, true), { p: [0, 0.75, 0] });
  b.add('dark', cyl(0.08, 0.08, label ? 2.4 : 1.4, 6), { p: [0, label ? 2.4 : 1.9, 0] });
  b.add('lamp', sphere(0.2, 8, 6), { p: [0, label ? 3.65 : 2.65, 0] });
  const grp = b.build({ body: paint(color, { rough: 0.4 }), band: paint(0xf7f3ea, { rough: 0.4 }), dark: MAT.dark, lamp: glow(0xffd04a, 3) });
  if (label) { const l = labelBoard(label, 2.2, 0.7, [0, 2.75, 0], { bg: '#ffffff', fg: '#16a34a' }); l.rotation.y = Math.PI / 2; grp.add(l); }
  return grp;
}

/** A double-sided label board (two panels back to back so neither reads mirrored). Textures are cached by text. */
const labelCache = new Map();
function labelBoard(text, w, h, p, { bg = '#ffd23c', fg = '#1a1d29' } = {}) {
  const key = text + bg + fg;
  if (!labelCache.has(key)) labelCache.set(key, new THREE.MeshStandardMaterial({ map: nameTex(text, { w: 512, h: Math.round(512 * h / w), bg, fg, size: 96 }), roughness: 0.6 }));
  const m = labelCache.get(key), g = new THREE.Group();
  for (const s of [1, -1]) { const q = new THREE.Mesh(new THREE.PlaneGeometry(w, h), m); q.position.z = s * 0.03; q.rotation.y = s > 0 ? 0 : Math.PI; g.add(q); }
  g.position.set(p[0], p[1], p[2]);
  return g;
}

/* ---------- obstacles ---------- */
/** Chunky red-orange crab, about 2.2 m wide. It faces +X so its sideways patrol reads as a crab walk. */
export function crab() {
  const b = new ModelBuilder();
  b.add('shell', sphere(1, 20, 14), { p: [0, 0.75, 0], s: [0.85, 0.5, 1.1] });
  b.add('belly', sphere(1, 16, 10), { p: [0, 0.55, 0], s: [0.78, 0.25, 1.0] });
  for (const s of [1, -1]) {
    // legs: three a side, bent outward along ±Z
    for (let i = 0; i < 3; i++) {
      const x = -0.45 + i * 0.4;
      b.add('shell', tube([[x, 0.6, s * 0.8], [x - 0.05, 0.85, s * 1.3], [x - 0.1, 0.05, s * 1.55]], 0.09, 10, 6));
    }
    // claw arms, raised
    b.add('shell', tube([[0.6, 0.85, s * 0.6], [0.9, 1.25, s * 0.95], [1.05, 1.75, s * 1.0]], 0.13, 12, 6));
    b.add('shell', sphere(0.42, 14, 10), { p: [1.15, 2.05, s * 1.0], s: [1, 0.8, 0.7] });
    b.add('claw', box(0.5, 0.18, 0.28, 0.08, 2), { p: [1.4, 2.4, s * 1.0], r: [0, 0, 0.6] });
    b.add('claw', box(0.45, 0.16, 0.26, 0.07, 2), { p: [1.45, 1.95, s * 1.0], r: [0, 0, -0.3] });
    // eye stalks
    b.add('shell', cyl(0.06, 0.07, 0.55, 6), { p: [0.7, 1.25, s * 0.25], r: [0, 0, -0.3] });
    b.add('eye', sphere(0.14, 10, 8), { p: [0.8, 1.55, s * 0.25] });
    b.add('pupil', sphere(0.07, 8, 6), { p: [0.92, 1.58, s * 0.25] });
  }
  b.add('stick', cyl(0.04, 0.04, 1.6, 5), { p: [-0.3, 1.9, 0] });
  const grp = b.build({ shell: paint(0xff5a2a, { rough: 0.35, clear: 0.7 }), belly: plastic(0xffc49a, 0.6), claw: paint(0xe2401b, { rough: 0.35 }), eye: plastic(0xffffff, 0.3), pupil: MAT.black, stick: MAT.dark });
  // a flag on its back: it only ever moves sideways
  const flag = labelBoard('CRAB MARKET', 2.0, 0.62, [-0.3, 2.45, 0], { bg: '#ffffff', fg: '#e2401b' }); flag.rotation.y = Math.PI / 2; grp.add(flag);
  return grp;
}

/** Treasure chest spilling coins: a static bump obstacle. */
export function chest() {
  const b = new ModelBuilder();
  b.add('wood', box(2.0, 1.1, 1.3, 0.12, 2), { p: [0, 0.55, 0] });
  b.add('wood', box(2.0, 0.5, 1.3, 0.24, 3), { p: [0, 1.3, -0.25], r: [-0.45, 0, 0] });
  for (const x of [-0.75, 0.75]) b.add('gold', box(0.16, 1.16, 1.36, 0.04, 1), { p: [x, 0.55, 0] });
  b.add('gold', box(0.3, 0.4, 0.12, 0.05, 1), { p: [0, 0.9, 0.67] });
  for (let i = 0; i < 9; i++) b.add('coin', cyl(0.2, 0.2, 0.06, 12), { p: [-0.6 + (i % 5) * 0.3, 1.15 + Math.floor(i / 5) * 0.1, 0.25 - (i % 3) * 0.2], r: [0.3 * (i % 3), 0, 0.2] });
  b.add('stick', cyl(0.05, 0.05, 1.8, 5), { p: [0.6, 1.6, -0.3] });
  const grp = b.build({ wood: plastic(0x7a4a26, 0.85), gold: GOLD, coin: glow(0xffc23a, 0.6), stick: WOOD_DARK });
  // the road runs along X here, so the board faces along X
  const sign = labelBoard('KEYS LOST', 1.9, 0.62, [0.6, 2.3, -0.3], { bg: '#ffd23c', fg: '#1a1d29' }); sign.rotation.y = Math.PI / 2; grp.add(sign);
  return grp;
}

/* ---------- the joke pass: big set pieces ---------- */
const GOLD_STATUE = paint(0xffbf2e, { rough: 0.28, metal: 0.85, clear: 0.5 });

/** A charging golden bull on a plinth, about 20 m tall, facing +Z. userData.eyes: eye positions; userData.beams: pivots to sweep the lasers. */
export function laserBull() {
  const grp = new THREE.Group(), b = new ModelBuilder(), P = 6;
  b.add('stone', box(11, P, 24, 0.3, 2), { p: [0, P / 2, 0] });
  b.add('trim', box(11.6, 0.6, 24.6, 0.15, 1), { p: [0, P - 0.2, 0] });
  b.add('trim', box(12, 0.8, 25, 0.15, 1), { p: [0, 0.4, 0] });
  for (const [x, z, k] of [[2.6, 5.4, 0], [-2.6, 5.4, 1], [2.4, -5.6, 2], [-2.4, -5.6, 3]]) {
    const lift = k === 0 ? 0.9 : 0;                                   // one front hoof raised, pawing
    b.add('gold', cyl(0.75, 1.0, 4.8, 12), { p: [x, P + 2.6 + lift, z], r: [k < 2 ? -0.18 : 0.15, 0, 0] });
    b.add('dark', cyl(0.85, 0.9, 0.7, 12), { p: [x, P + 0.35 + lift, z + (k < 2 ? 0.4 : -0.3)] });
  }
  b.add('gold', sphere(1, 24, 16), { p: [0, P + 7.2, -0.6], s: [3.4, 3.4, 7.4] });     // body
  b.add('gold', sphere(1, 24, 16), { p: [0, P + 8.6, 3.6], s: [3.8, 4.0, 4.2] });      // shoulder hump
  b.add('gold', sphere(1, 20, 14), { p: [0, P + 7.4, 8.6], s: [2.5, 2.7, 3.0] });      // head, lowered
  b.add('gold', sphere(1, 18, 12), { p: [0, P + 6.0, 10.9], s: [2.0, 1.6, 1.5] });     // snout
  for (const s of [1, -1]) {
    b.add('dark', sphere(0.35, 10, 8), { p: [s * 0.8, P + 5.9, 12.25] });              // nostrils
    b.add('horn', tube([[s * 1.8, P + 9.0, 8.4], [s * 4.0, P + 9.6, 8.8], [s * 5.3, P + 11.4, 10.0], [s * 5.0, P + 13.2, 11.6]], 0.5, 18, 8));
    b.add('gold', sphere(1, 12, 10), { p: [s * 2.6, P + 8.6, 7.6], s: [0.5, 1.0, 0.7] });   // ears
    b.add('eye', sphere(0.55, 12, 10), { p: [s * 1.55, P + 8.2, 10.4] });
  }
  b.add('gold', tube([[0, P + 8.4, -7.6], [0, P + 10.6, -9.0], [0.4, P + 12.4, -8.6], [0.8, P + 12.9, -7.4]], 0.32, 16, 6));   // tail up
  b.add('dark', sphere(0.6, 10, 8), { p: [0.8, P + 13.0, -7.2] });
  grp.add(b.build({ stone: plastic(0x2a2d36, 0.5, 0.2), trim: GOLD, gold: GOLD_STATUE, dark: plastic(0x6b4a12, 0.5, 0.5), horn: paint(0xfff3d6, { rough: 0.35 }), eye: glow(0xff2a2a, 3) }));
  // two red laser beams from the eyes
  const beamMat = new THREE.MeshBasicMaterial({ color: 0xff3030, transparent: true, opacity: 0.75, blending: THREE.AdditiveBlending, depthWrite: false });
  const coreMat = new THREE.MeshBasicMaterial({ color: 0xffd0d0, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false });
  const beams = [];
  for (const s of [1, -1]) {
    const pv = new THREE.Group(); pv.position.set(s * 1.55, P + 8.2, 10.5);
    const g = new THREE.CylinderGeometry(0.5, 0.5, 200, 8, 1, true); g.rotateX(Math.PI / 2); g.translate(0, 0, 100);
    const c = new THREE.CylinderGeometry(0.18, 0.18, 200, 6, 1, true); c.rotateX(Math.PI / 2); c.translate(0, 0, 100);
    pv.add(new THREE.Mesh(g, beamMat)); pv.add(new THREE.Mesh(c, coreMat));
    grp.add(pv); beams.push(pv);
  }
  grp.userData.beams = beams;
  return grp;
}

/** A little rocket for the price chart to carry: about 7 m long, nose along +Z. */
export function chartRocket() {
  const b = new ModelBuilder(), L = 7, R = 1.1;
  const body = lathe([[0, 0], [R, 0.2], [R, L * 0.6], [R * 0.8, L * 0.78], [R * 0.4, L * 0.93], [0, L]], 20); body.rotateX(Math.PI / 2); body.translate(0, 0, -L * 0.45);
  b.add('white', body);
  for (let i = 0; i < 4; i++) { const a = (i / 4) * Math.PI * 2 + Math.PI / 4; b.add('red', box(0.2, 1.8, 1.8, 0.06, 1), { p: [Math.cos(a) * R * 1.2, Math.sin(a) * R * 1.2, -L * 0.36], r: [0, 0, a] }); }
  b.add('red', cyl(R * 1.02, R * 1.02, 0.5, 20, true), { p: [0, 0, L * 0.12], r: [Math.PI / 2, 0, 0] });
  b.add('glass', sphere(0.5, 12, 10), { p: [0, R * 0.75, L * 0.18] });
  b.add('flame', cone(0.8, 2.6, 12), { p: [0, 0, -L * 0.45 - 1.3], r: [-Math.PI / 2, 0, 0] });
  return b.build({ white: paint(0xf6f7f9, { rough: 0.3 }), red: paint(0xef4444, { rough: 0.4 }), glass: plastic(0x6fd3ff, 0.1, 0.4), flame: glow(0xffa21f, 2.5) }, { cast: false });
}

/** Dome tent: a four-sided pyramid with a tintable fly. */
export function tent() {
  const b = new ModelBuilder();
  const c = cone(1.9, 2.1, 4); c.rotateY(Math.PI / 4);
  b.add('fly', c, { p: [0, 1.05, 0] });
  b.add('door', box(0.9, 1.1, 0.06, 0.02, 1), { p: [0, 0.55, 1.1], r: [-0.48, 0, 0] });
  return b.build({ fly: tintable(0xff6a3d, 0.8), door: MAT.dark }, { cast: false });
}
export const TENT_TINTS = [0xff6a3d, 0x1fc3c8, 0xffd23c, 0x7b5cff, 0x2ee6a6, 0xff4d8d];

/** A wedge-shaped supercar about 7 m long (scaled up to read from the shore), nose along +Z. */
export function supercar(color = 0xa3e635) {
  const b = new ModelBuilder();
  b.add('body', loft([
    { z: -3.5, w: 1.45, h: 0.55, y: 0.95, n: 4 }, { z: -2.2, w: 1.5, h: 0.72, y: 1.0, n: 4 }, { z: 0, w: 1.45, h: 0.65, y: 0.95, n: 4 },
    { z: 2.2, w: 1.35, h: 0.45, y: 0.8, n: 4 }, { z: 3.5, w: 1.1, h: 0.2, y: 0.62, n: 4 },
  ], 20, 4));
  b.add('glass', loft([{ z: -1.6, w: 1.0, h: 0.1, y: 1.6, n: 3 }, { z: -0.6, w: 1.05, h: 0.5, y: 1.7, n: 3 }, { z: 0.8, w: 0.9, h: 0.3, y: 1.55, n: 3 }, { z: 1.6, w: 0.8, h: 0.05, y: 1.4, n: 3 }], 16, 3));
  b.add('dark', box(3.0, 0.15, 0.8, 0.05, 1), { p: [0, 2.15, -3.2] });           // the wing
  for (const s of [1, -1]) b.add('dark', box(0.15, 0.7, 0.4, 0.04, 1), { p: [s * 1.1, 1.8, -3.2] });
  for (const [x, z] of [[1.45, 2.1], [-1.45, 2.1], [1.5, -2.2], [-1.5, -2.2]]) b.add('tyre', cyl(0.62, 0.62, 0.45, 16), { p: [x, 0.62, z], r: [0, 0, Math.PI / 2] });
  b.add('lamp', box(2.2, 0.12, 0.08, 0.03, 1), { p: [0, 1.1, -3.52] });
  return b.build({ body: paint(color, { rough: 0.25, clear: 0.9 }), glass: plastic(0x14202c, 0.1, 0.5), dark: MAT.dark, tyre: MAT.rubber, lamp: glow(0xff3b30, 1.5) });
}

/** Lifeguard tower on stilts with an empty chair. The sign board is left to the caller (userData.sign: centre, w, h). */
export function lifeguardTower() {
  const grp = new THREE.Group(), b = new ModelBuilder(), D = 5.6;
  for (const [x, z] of [[-1.8, -1.6], [1.8, -1.6], [-1.8, 1.6], [1.8, 1.6]]) b.add('leg', cyl(0.16, 0.2, D + 2, 8), { p: [x * (1 - 0.02), (D + 2) / 2 - 2, z], r: [z * -0.04, 0, x * 0.04] });
  b.add('deck', box(5.2, 0.3, 4.6, 0.08, 1), { p: [0, D, 0] });
  b.add('hut', box(3.8, 2.6, 3.2, 0.1, 2), { p: [0, D + 1.45, -0.4] });
  b.add('roof', box(4.6, 0.25, 4.0, 0.08, 1), { p: [0, D + 2.95, -0.3], r: [0.12, 0, 0] });
  b.add('dark', box(2.0, 1.6, 0.06, 0.03, 1), { p: [0, D + 1.4, 1.22] });           // open door, nobody home
  for (const x of [-2.5, 2.5]) b.add('rail', cyl(0.06, 0.06, 4.4, 6), { p: [x, D + 0.9, 0], r: [Math.PI / 2, 0, 0] });
  b.add('rail', cyl(0.06, 0.06, 5.0, 6), { p: [0, D + 0.9, 2.2], r: [0, 0, Math.PI / 2] });
  // ramp down to the beach, and the empty chair on the deck
  b.add('deck', box(1.2, 0.15, 7.5, 0.04, 1), { p: [0, D * 0.48, 5.4], r: [0.75, 0, 0] });
  b.add('chair', box(0.8, 0.1, 0.8, 0.03, 1), { p: [1.5, D + 0.85, 1.4] });
  b.add('chair', box(0.8, 0.9, 0.1, 0.03, 1), { p: [1.5, D + 1.3, 1.0], r: [-0.2, 0, 0] });
  for (const [x, z] of [[1.15, 1.75], [1.85, 1.75], [1.15, 1.05], [1.85, 1.05]]) b.add('rail', cyl(0.04, 0.04, 0.7, 5), { p: [x, D + 0.5, z] });
  b.add('float', torus(0.5, 0.14, 8, 16), { p: [-2.62, D + 0.6, 0.4], r: [0, Math.PI / 2, 0] });
  grp.add(b.build({ leg: plastic(0xf4f4f0, 0.6), deck: WOOD, hut: paint(0xef4444, { rough: 0.5 }), roof: plastic(0xf4f4f0, 0.5), dark: MAT.dark, rail: plastic(0xf4f4f0, 0.5), chair: paint(0xffd23c, { rough: 0.5 }), float: paint(0xff6a3d, { rough: 0.5 }) }));
  grp.userData.sign = { c: [0, D + 4.6, 0.2], w: 5.6, h: 2.6 };
  return grp;
}

/** A giant vending machine body, about 13 m tall, facing +Z. userData.face: the front panel's centre, w, h, for the caller's atlas. */
export function vendingMachine() {
  const grp = new THREE.Group(), b = new ModelBuilder(), W = 8, H = 13, D = 4.2;
  b.add('body', box(W, H, D, 0.5, 3), { p: [0, H / 2, 0] });
  b.add('trim', box(W + 0.3, 0.6, D + 0.3, 0.2, 2), { p: [0, 0.3, 0] });
  b.add('trim', box(W * 0.24, H * 0.62, 0.3, 0.1, 1), { p: [W * 0.36, H * 0.56, D / 2] });     // the button panel
  for (let i = 0; i < 6; i++) b.add('btn', box(0.9, 0.5, 0.2, 0.08, 1), { p: [W * 0.36, H * 0.75 - i * 0.9, D / 2 + 0.2] });
  b.add('dark', box(W * 0.55, 1.3, 0.4, 0.1, 1), { p: [-W * 0.13, 1.6, D / 2] });              // the pickup flap
  b.add('slot', box(0.9, 0.2, 0.3, 0.05, 1), { p: [W * 0.36, H * 0.32, D / 2 + 0.15] });
  grp.add(b.build({ body: paint(0x7b5cff, { rough: 0.35, clear: 0.6 }), trim: plastic(0x1a1d29, 0.5), btn: glow(0x38ff74, 0.8), dark: MAT.black, slot: GOLD }));
  grp.userData.face = { c: [-W * 0.13, H * 0.58, D / 2 + 0.02], w: W * 0.66, h: H * 0.72 };
  return grp;
}

/** Light plane with a tow rope; the banner is added by the caller. Flies along +Z. userData.tail: where the rope ends. */
export function bannerPlane(color = 0xef4444) {
  const b = new ModelBuilder();
  b.add('body', loft([{ z: -4.2, w: 0.2, h: 0.3, y: 0.3 }, { z: -1, w: 0.55, h: 0.6, y: 0 }, { z: 1.4, w: 0.65, h: 0.7, y: 0 }, { z: 2.4, w: 0.45, h: 0.45, y: 0 }], 16, 3));
  b.add('wing', box(10, 0.16, 1.5, 0.06, 1), { p: [0, 0.55, 0.6] });
  b.add('wing', box(3.4, 0.12, 0.9, 0.04, 1), { p: [0, 0.35, -3.9] });
  b.add('wing', box(0.12, 1.4, 1.0, 0.04, 1), { p: [0, 1.0, -3.9] });
  b.add('dark', cyl(0.12, 0.12, 0.3, 8), { p: [0, 0, 2.6], r: [Math.PI / 2, 0, 0] });
  b.add('prop', box(2.4, 0.18, 0.05, 0.03, 1), { p: [0, 0, 2.78] });
  b.add('rope', cyl(0.04, 0.04, 14, 4), { p: [0, -0.4, -11], r: [Math.PI / 2, 0, 0] });
  const grp = b.build({ body: paint(color, { rough: 0.4 }), wing: paint(0xf6f7f9, { rough: 0.4 }), dark: MAT.dark, prop: MAT.dark, rope: MAT.dark }, { cast: false });
  grp.userData.tail = [0, -0.4, -18];
  return grp;
}

/** Speedboat about 11 m long, bow along +Z, with a name panel down each side (map: a texture, or null). */
export function speedboat(map = null, color = 0x14213d) {
  const grp = new THREE.Group(), b = new ModelBuilder();
  b.add('hull', loft([{ z: -5.4, w: 1.9, h: 0.9, y: 0.7, n: 3 }, { z: -2, w: 2.1, h: 1.0, y: 0.7, n: 3 }, { z: 2.5, w: 1.7, h: 0.95, y: 0.8, n: 2.6 }, { z: 5.4, w: 0.15, h: 0.6, y: 1.3, n: 2.2 }], 20, 4));
  b.add('deck', box(3.4, 0.2, 6, 0.05, 1), { p: [0, 1.55, -1.6] });
  b.add('glass', box(3.2, 0.9, 0.1, 0.05, 1), { p: [0, 2.0, 1.4], r: [-0.5, 0, 0] });
  b.add('dark', box(1.0, 1.2, 0.8, 0.1, 1), { p: [0, 1.6, -5.6] });
  grp.add(b.build({ hull: paint(0xf6f4ef, { rough: 0.3 }), deck: plastic(0xb98a5a, 0.8), glass: GLASS, dark: MAT.dark }));
  const stripe = new ModelBuilder(); stripe.add('s', loft([{ z: -5.42, w: 1.93, h: 0.18, y: 0.95, n: 4 }, { z: 2.5, w: 1.73, h: 0.18, y: 1.0, n: 4 }, { z: 5.2, w: 0.3, h: 0.16, y: 1.3, n: 4 }], 16, 3));
  grp.add(stripe.build({ s: paint(color, { rough: 0.3 }) }));
  if (map) for (const s of [1, -1]) {
    const q = new THREE.Mesh(new THREE.PlaneGeometry(7.5, 1.3), new THREE.MeshStandardMaterial({ map, roughness: 0.5 }));
    q.position.set(s * 2.08, 1.15, -0.8); q.rotation.y = s * Math.PI / 2; grp.add(q);
  }
  return grp;
}

/* ---------- sign helpers: quads in world space, a text atlas, a static-geometry baker ---------- */
/** Collects quads in world space (non-indexed), with explicit UVs. */
export class Quads {
  constructor() { this.p = []; this.n = []; this.u = []; }
  /** a,b,c,d: bottom-left, bottom-right, top-right, top-left as seen from the front. uv: [u0,v0,u1,v1]. */
  quad(a, b, c, d, uv = [0, 0, 1, 1]) {
    const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2], vx = d[0] - a[0], vy = d[1] - a[1], vz = d[2] - a[2];
    let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx; const l = Math.hypot(nx, ny, nz) || 1; nx /= l; ny /= l; nz /= l;
    const t = [[uv[0], uv[1]], [uv[2], uv[1]], [uv[2], uv[3]], [uv[0], uv[3]]];
    for (const k of [0, 1, 2, 0, 2, 3]) { const q = [a, b, c, d][k]; this.p.push(q[0], q[1], q[2]); this.n.push(nx, ny, nz); this.u.push(t[k][0], t[k][1]); }
  }
  /** A flat panel facing yaw (0 = +Z), centred at c, w by h, leaning back by `tilt` radians. */
  panel(c, yaw, w, h, uv, tilt = 0) {
    const rx = Math.cos(yaw), rz = -Math.sin(yaw), fx = Math.sin(yaw), fz = Math.cos(yaw);
    const ux = -fx * Math.sin(tilt), uy = Math.cos(tilt), uz = -fz * Math.sin(tilt);
    const P = (sx, sy) => [c[0] + rx * w / 2 * sx + ux * h / 2 * sy, c[1] + uy * h / 2 * sy, c[2] + rz * w / 2 * sx + uz * h / 2 * sy];
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

/** Merges placed static props into one mesh per material, so a whole set costs a few draw calls. */
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
    /** Bake a placed object (and take it out of the scene). Multi-material meshes are skipped (left in place). */
    add(obj, cast = true) {
      obj.updateMatrixWorld(true);
      const keep = [];
      obj.traverse(o => { if (o.isMesh && !o.isInstancedMesh) { if (Array.isArray(o.material)) keep.push(o); else push(o.material, norm(o.geometry, o.matrixWorld), cast); } });
      for (const o of keep) { const m = o.matrixWorld.clone(); o.removeFromParent(); m.decompose(o.position, o.quaternion, o.scale); group.add(o); }
      obj.removeFromParent();
    },
    /** Bake a ModelBuilder's buckets (its geometry already in world space). */
    builder(b, mats, cast = true) { const grp = b.build(mats); grp.traverse(o => { if (o.isMesh) push(o.material, norm(o.geometry, null), cast); }); },
    geo(mat, g, cast = false) { push(mat, norm(g, null), cast); },
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

/** Text panels packed into big canvases, drawn as one mesh per canvas. Redraws once the web fonts arrive. */
export function makeAtlas(group, S = 2048, { emissive = 0.3 } = {}) {
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
    /** Allocate w x h pixels drawn by draw(g, w, h); returns a handle to place it with. */
    add(w, h, draw) { const r = alloc(w, h); r.draw = draw; r.p.items.push(r); return r; },
    /** One face, facing yaw. */
    place(r, c, yaw, w, h, tilt = 0) { const { p } = r; p.q.panel(c, yaw, w, h, [r.x / S, 1 - (r.y + r.h) / S, (r.x + r.w) / S, 1 - r.y / S], tilt); },
    /** Two faces back to back, so the sign reads the right way round from both sides. */
    place2(r, c, yaw, w, h, gap = 0.06) {
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

export const SIGN_FONT = FONT, SANS = '"Arial Black", "Helvetica Neue", Arial, sans-serif';
/** Fit text to a width, in up to `lines` lines; draws centred at (cx, cy). */
export function fitText(g, text, cx, cy, maxW, size, font, fill, { lines = 2, stroke = null, lw = 0, maxH = Infinity } = {}) {
  const words = text.split(' '); let ls = [text];
  g.font = `${size}px ${font}`;
  if (lines > 1 && g.measureText(text).width > maxW && words.length > 1) {
    let best = 1, bd = 1e9; for (let k = 1; k < words.length; k++) { const d = Math.abs(words.slice(0, k).join(' ').length - words.slice(k).join(' ').length); if (d < bd) { bd = d; best = k; } }
    ls = [words.slice(0, best).join(' '), words.slice(best).join(' ')];
  }
  let s = size; const widest = () => Math.max(...ls.map(l => g.measureText(l).width));
  while ((widest() > maxW || s * 1.05 * ls.length > maxH) && s > 10) { s -= 2; g.font = `${s}px ${font}`; }
  g.textAlign = 'center'; g.textBaseline = 'middle';
  ls.forEach((l, k) => { const y = cy + (k - (ls.length - 1) / 2) * s * 1.05; if (stroke) { g.lineWidth = lw; g.strokeStyle = stroke; g.lineJoin = 'round'; g.strokeText(l, cx, y); } g.fillStyle = fill; g.fillText(l, cx, y); });
}

/** A painted sign: background, optional border and stripe, big centred text. */
export const signDraw = (text, { bg = '#ffffff', fg = '#1a1d29', font = FONT, size = 130, border = null, stripe = null, lines = 2, pad = 0.07 } = {}) => (g, w, h) => {
  g.fillStyle = bg; g.fillRect(0, 0, w, h);
  if (stripe) { g.fillStyle = stripe; g.fillRect(0, h * 0.86, w, h * 0.14); }
  if (border) { g.strokeStyle = border; g.lineWidth = Math.max(4, h * 0.05); g.strokeRect(g.lineWidth / 2, g.lineWidth / 2, w - g.lineWidth, h - g.lineWidth); }
  fitText(g, text, w / 2, h * (stripe ? 0.45 : 0.53), w * (1 - pad * 2), size, font, fg, { lines, maxH: h * (stripe ? 0.75 : 0.86) });
};

/** An LED panel on its own canvas, shown on one or more faces ([{ c, yaw }]), redrawn on demand. */
export function ledPanel(group, w, h, faces, mw, mh, { intensity = 1.3, back = true } = {}) {
  const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
  const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
  const q = new Quads(), backQ = new Quads();
  for (const f of faces) {
    q.panel(f.c, f.yaw, mw, mh, [0, 0, 1, 1]);
    backQ.panel([f.c[0] - Math.sin(f.yaw) * 0.15, f.c[1], f.c[2] - Math.cos(f.yaw) * 0.15], f.yaw + Math.PI, mw + 0.6, mh + 0.6, [0, 0, 1, 1]);
  }
  const mesh = new THREE.Mesh(q.geometry(), new THREE.MeshStandardMaterial({ color: 0x000000, map: tex, emissiveMap: tex, emissive: 0xffffff, emissiveIntensity: intensity, roughness: 0.5 }));
  mesh.matrixAutoUpdate = false; group.add(mesh);
  if (back) { const bm = new THREE.Mesh(backQ.geometry(), plastic(0x23252c, 0.6)); bm.matrixAutoUpdate = false; group.add(bm); }
  const g = cv.getContext('2d');
  return { draw(fn) { fn(g, w, h); tex.needsUpdate = true; }, mesh };
}
