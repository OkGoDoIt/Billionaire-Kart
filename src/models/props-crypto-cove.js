/* Props for Crypto Cove: superyachts, the lighthouse, the beach club, beach
   furniture, tiki torches, and the crab and treasure obstacles. Each builder
   returns a THREE.Group sitting on y = 0, facing +Z, built from a few merged
   meshes. Canvas textures are only made when a builder runs (browser only). */
import * as THREE from 'three';
import { ModelBuilder, box, sphere, cyl, cone, torus, tube, lathe, loft, plastic, glow, paint, MAT } from './build.js';
import { canvasTex } from '../render/textures.js';

const tintable = (color, rough = 0.7) => { const m = new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: 0, envMapIntensity: 0.6 }); m.userData.tintable = true; return m; };
const WOOD = plastic(0x8a5a36, 0.9), WOOD_DARK = plastic(0x5e3b22, 0.9), STRAW = plastic(0xd9b26a, 0.95), BAMBOO = plastic(0xc9a46a, 0.8);
const GOLD = paint(0xffc23a, { rough: 0.3, metal: 0.6, clear: 0.4 });
const SHELL = paint(0xf6f4ef, { rough: 0.28, clear: 0.8 }), GLASS = plastic(0x1d3346, 0.15, 0.6);
const FONT = '"Luckiest Guy", "Arial Black", sans-serif';

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
export function superyacht(name = 'LIQUIDITY', { accent = 0x14213d, L = 40 } = {}) {
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
  for (const s of [1, -1]) {   // and along the bow, readable from the shore
    const side = new THREE.Mesh(new THREE.PlaneGeometry(6, 1.5), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.4, transparent: false }));
    side.position.set(s * 4.02, 2.4, h * 0.42); side.rotation.y = s * Math.PI / 2; grp.add(side);
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

/** Marker buoy for the bay. */
export function buoy(color = 0xff6a3d) {
  const b = new ModelBuilder();
  b.add('body', lathe([[0, -0.6], [0.9, -0.4], [1.0, 0.2], [0.7, 0.6], [0, 0.65]], 16), { p: [0, 0.6, 0] });
  b.add('band', cyl(1.02, 1.02, 0.3, 16, true), { p: [0, 0.75, 0] });
  b.add('dark', cyl(0.08, 0.08, 1.4, 6), { p: [0, 1.9, 0] });
  b.add('lamp', sphere(0.2, 8, 6), { p: [0, 2.65, 0] });
  return b.build({ body: paint(color, { rough: 0.4 }), band: paint(0xf7f3ea, { rough: 0.4 }), dark: MAT.dark, lamp: glow(0xffd04a, 3) });
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
  return b.build({ shell: paint(0xff5a2a, { rough: 0.35, clear: 0.7 }), belly: plastic(0xffc49a, 0.6), claw: paint(0xe2401b, { rough: 0.35 }), eye: plastic(0xffffff, 0.3), pupil: MAT.black });
}

/** Treasure chest spilling coins: a static bump obstacle. */
export function chest() {
  const b = new ModelBuilder();
  b.add('wood', box(2.0, 1.1, 1.3, 0.12, 2), { p: [0, 0.55, 0] });
  b.add('wood', box(2.0, 0.5, 1.3, 0.24, 3), { p: [0, 1.3, -0.25], r: [-0.45, 0, 0] });
  for (const x of [-0.75, 0.75]) b.add('gold', box(0.16, 1.16, 1.36, 0.04, 1), { p: [x, 0.55, 0] });
  b.add('gold', box(0.3, 0.4, 0.12, 0.05, 1), { p: [0, 0.9, 0.67] });
  for (let i = 0; i < 9; i++) b.add('coin', cyl(0.2, 0.2, 0.06, 12), { p: [-0.6 + (i % 5) * 0.3, 1.15 + Math.floor(i / 5) * 0.1, 0.25 - (i % 3) * 0.2], r: [0.3 * (i % 3), 0, 0.2] });
  return b.build({ wood: plastic(0x7a4a26, 0.85), gold: GOLD, coin: glow(0xffc23a, 0.6) });
}
