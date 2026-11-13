/* Props for Davos Circuit: private jets on the resort tarmac, fondue and
   chocolate chalets on the climb, the GREAT RESET panel stage above the
   plunge, a security watchtower with a sweeping searchlight, the perimeter
   fence, snow banks, red edge posts (the Mount Wario marker), snow-dusted
   pines, and a snowplow that patrols the climb. Each builder returns a
   THREE.Group on y = 0, facing +Z. Nothing here touches the DOM at import
   time. */
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { ModelBuilder, box, sphere, cyl, capsule, cone, plastic, glow, paint } from './build.js';
import { canvasTex, fitText } from '../render/textures.js';
import { makeRng } from '../core/util.js';

const WHITE = paint(0xf4f6f8, { rough: 0.35, clear: 0.7 });
const NAVY = paint(0x1f2a44, { rough: 0.4, clear: 0.5 });
const GOLD = paint(0xc9a227, { rough: 0.35, metal: 0.6, clear: 0.4 });
const GLASS = new THREE.MeshStandardMaterial({ color: 0x18222e, roughness: 0.12, metalness: 0.4, envMapIntensity: 1.6 });
const WOOD = plastic(0x7a5230, 0.8), WOOD_D = plastic(0x5d3d22, 0.85);
const STONE = plastic(0x9a938a, 0.95);
const SNOW = plastic(0xf6fafc, 0.9);
const RED = paint(0xe23b3b, { rough: 0.45, clear: 0.4 });
const ORANGE = paint(0xff8a3c, { rough: 0.5, clear: 0.3 });
const PINE = plastic(0x2e5d3a, 0.9), PINE_D = plastic(0x24492e, 0.9);
const STEEL = plastic(0x3c424c, 0.5, 0.6);

/** A box stretched between two points. */
function strut(b, mat, a, c, w = 0.3, d = w) {
  const dx = c[0] - a[0], dy = c[1] - a[1], dz = c[2] - a[2], len = Math.hypot(dx, dy, dz);
  const g = new THREE.BoxGeometry(w, len, d);
  g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(dx / len, dy / len, dz / len)));
  g.translate((a[0] + c[0]) / 2, (a[1] + c[1]) / 2, (a[2] + c[2]) / 2);
  b.add(mat, g);
}
/** A lumpy icosphere (same idea as props-mars-colony's blob). */
function blob(r, seed = 1, lump = 0.35, detail = 2) {
  const g = new THREE.IcosahedronGeometry(r, detail), p = g.attributes.position, rng = makeRng(seed);
  const ph = [rng() * 6, rng() * 6, rng() * 6, rng() * 6];
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const n = Math.sin(x * 2.3 / r + ph[0]) * Math.cos(y * 2.1 / r + ph[1]) + Math.sin(z * 2.7 / r + ph[2]) * 0.6 + Math.sin((x + z) * 5.1 / r + ph[3]) * 0.25;
    const k = 1 + n * lump * 0.5;
    p.setXYZ(i, x * k, y * k, z * k);
  }
  g.computeVertexNormals();
  return g;
}
/** A small framed sign panel with canvas text, facing +Z. */
function signPanel(text, { w = 8, h = 2.2, bg = '#1f2a44', fg = '#f4f6f8', font = 120 } = {}) {
  const tex = canvasTex(1024, Math.round(1024 * h / w), (g, cw, ch) => {
    g.fillStyle = bg; g.fillRect(0, 0, cw, ch);
    g.fillStyle = '#c9a227'; g.fillRect(0, 0, cw, 14); g.fillRect(0, ch - 14, cw, 14);
    fitText(g, text, cw / 2, ch / 2 + 6, cw - 40, ch - 28, font, '"Luckiest Guy", "Arial Black", sans-serif', { fill: fg });
  }, { repeat: false, aniso: 8 });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map: tex, emissiveMap: tex, emissive: 0xffffff, emissiveIntensity: 0.25, roughness: 0.55 }));
  return m;
}

/* ---------- the resort floor ---------- */
/** A chunky private jet, ~17 m long, nose toward +Z. */
export function privateJet(seed = 1, { accent = 0xc9a227 } = {}) {
  const b = new ModelBuilder(), rng = makeRng(seed);
  const ACC = paint(accent, { rough: 0.35, metal: 0.5, clear: 0.5 });
  b.add('body', capsule(1.55, 11, 6, 14), { p: [0, 2.6, 0], r: [Math.PI / 2, 0, 0] });            // fuselage
  b.add('body', cone(1.5, 3.4, 14), { p: [0, 2.6, 8.6], r: [Math.PI / 2, 0, 0] });                 // nose taper (cone tip +Z)
  b.add('glass', box(2.2, 0.8, 2.6, 0.3, 2), { p: [0, 3.4, 6.4], r: [0.35, 0, 0] });               // cockpit band
  b.add('acc', box(3.14, 0.5, 9.5, 0.1, 1), { p: [0, 2.2, -0.5] });                                // cheatline stripe
  for (let i = 0; i < 6; i++) b.add('glass', box(0.5, 0.5, 0.7, 0.2, 1), { p: [1.45, 3.0, 3.6 - i * 1.35] }); // windows R
  for (let i = 0; i < 6; i++) b.add('glass', box(0.5, 0.5, 0.7, 0.2, 1), { p: [-1.45, 3.0, 3.6 - i * 1.35] }); // windows L
  b.add('wing', box(13.5, 0.28, 2.6, 0.1, 1), { p: [0, 1.9, 0.6], r: [0, 0.12, 0] });               // main wing, slight sweep
  b.add('acc', box(6.4, 0.24, 1.6, 0.1, 1), { p: [0, 4.6, -6.6] });                                // tailplane
  b.add('acc', box(0.26, 2.6, 2.0, 0.1, 1), { p: [0, 5.2, -6.9], r: [-0.25, 0, 0] });               // fin
  for (const sx of [-1, 1]) {
    b.add('eng', cyl(0.75, 0.85, 2.6, 12), { p: [sx * 1.7, 3.3, -5.6], r: [Math.PI / 2, 0, 0] });   // engines
    b.add('dark', cyl(0.55, 0.55, 0.3, 12), { p: [sx * 1.7, 3.3, -7.0], r: [Math.PI / 2, 0, 0] });
    b.add('dark', cyl(0.28, 0.28, 1.6, 8), { p: [sx * 2.2, 0.8, 3.4] });                            // gear legs
    b.add('dark', cyl(0.55, 0.55, 0.4, 10), { p: [sx * 2.2, 0.45, 3.4], r: [0, 0, Math.PI / 2] });  // wheels
    b.add('dark', cyl(0.28, 0.28, 1.3, 8), { p: [sx * 0.9, 0.75, -3.4] });
    b.add('dark', cyl(0.5, 0.5, 0.4, 10), { p: [sx * 0.9, 0.4, -3.4], r: [0, 0, Math.PI / 2] });
  }
  b.add('dark', cyl(0.24, 0.24, 1.2, 8), { p: [0, 0.7, 6.6] });
  b.add('dark', cyl(0.42, 0.42, 0.35, 10), { p: [0, 0.35, 6.6], r: [0, 0, Math.PI / 2] });
  const g = b.build({ body: WHITE, glass: GLASS, acc: ACC, wing: WHITE, eng: NAVY, dark: STEEL });
  g.rotation.y = rng.range(-0.06, 0.06);
  return g;
}

/** A two-post roadside sign: 'PRIVATE JETS ONLY' and friends. */
export function roadSign(text, { w = 9, h = 2.4, legs = 3.4, bg = '#1f2a44', fg = '#f4f6f8' } = {}) {
  const grp = new THREE.Group(), b = new ModelBuilder();
  for (const sx of [-1, 1]) b.add('post', cyl(0.14, 0.17, legs + h, 8), { p: [sx * w * 0.38, (legs + h) / 2, -0.25] });
  b.add('frame', box(w + 0.5, h + 0.5, 0.3, 0.1, 2), { p: [0, legs + h / 2, -0.25] });
  grp.add(b.build({ post: STEEL, frame: NAVY }));
  const panel = signPanel(text, { w, h, bg, fg });
  panel.position.set(0, legs + h / 2, -0.05);
  grp.add(panel);
  return grp;
}

/* ---------- the climb ---------- */
/** An alpine chalet: stone ground floor, timber upper floor, steep snow roof, balcony. */
export function chalet(seed = 1, { sign = null } = {}) {
  const grp = new THREE.Group(), b = new ModelBuilder(), rng = makeRng(seed);
  const W = 11, D = 8;
  b.add('stone', box(W, 2.6, D, 0.15, 2), { p: [0, 1.3, 0] });
  b.add('wood', box(W - 0.8, 2.8, D - 0.8, 0.12, 2), { p: [0, 4.0, 0] });
  // steep pitched roof: two slabs + ridge, snow slabs riding on top
  // (polish round: the slabs' tilt sign was flipped, which built a valley roof — ridge up, eaves down is the chalet read)
  for (const sx of [-1, 1]) {
    b.add('roof', box(7.4, 0.35, D + 1.6, 0.08, 1), { p: [sx * 2.6, 7.55, 0], r: [0, 0, -sx * 0.72] });
    b.add('snow', box(7.4, 0.22, D + 1.7, 0.08, 1), { p: [sx * 2.62, 7.8, 0], r: [0, 0, -sx * 0.72] });
  }
  b.add('wood', box(0.4, 1.6, 2.2, 0.08, 1), { p: [0, 6.4, 0] });                                    // gable infill hint
  b.add('balc', box(W - 1.4, 0.25, 1.6, 0.06, 1), { p: [0, 3.6, D / 2 + 0.5] });                     // balcony slab
  for (let i = -3; i <= 3; i++) b.add('balc', box(0.16, 1.0, 0.16, 0.04, 1), { p: [i * 1.4, 4.2, D / 2 + 1.2] });
  b.add('balc', box(W - 1.4, 0.16, 0.16, 0.04, 1), { p: [0, 4.7, D / 2 + 1.2] });
  for (const sx of [-1, 1]) for (const f of [0, 1]) b.add('win', box(1.1, 1.1, 0.15, 0.05, 1), { p: [sx * 2.8, 2.2 + f * 2.4, D / 2 + 0.06] });
  b.add('win', box(1.3, 2.0, 0.15, 0.05, 1), { p: [0, 1.6, D / 2 + 0.06] });                          // door
  b.add('stone', box(0.9, 2.2, 0.9, 0.1, 1), { p: [3.4, 8.2, -1.5] });                               // chimney
  b.add('smoke', sphere(0.8, 10, 8), { p: [3.4, 9.8, -1.5], s: [1, 0.8, 1] });
  grp.add(b.build({ stone: STONE, wood: WOOD, roof: WOOD_D, snow: SNOW, balc: WOOD, win: glow(0xffc890, 1.1) }));
  if (sign) {
    const panel = signPanel(sign, { w: 7.6, h: 1.6, bg: '#5d3d22', fg: '#f6ead2' });
    panel.position.set(0, 5.6, D / 2 + 0.35);
    grp.add(panel);
  }
  grp.rotation.y = rng.range(-0.05, 0.05);
  return grp;
}

/* ---------- the summit and the plunge ---------- */
/** The GREAT RESET panel stage: a stage, a big screen, and rows of the owners of everything. */
export function panelStage() {
  const grp = new THREE.Group(), b = new ModelBuilder();
  b.add('deck', box(26, 1.2, 10, 0.15, 2), { p: [0, 0.6, 0] });
  b.add('back', box(26, 9, 0.6, 0.15, 2), { p: [0, 5.4, -4.6] });
  for (const sx of [-1, 1]) {
    b.add('post', cyl(0.3, 0.35, 10.5, 10), { p: [sx * 12, 5.2, 3.8] });
    b.add('stack', box(2.2, 5.5, 1.6, 0.12, 2), { p: [sx * 13.6, 3.4, 1.5] });                       // speaker stacks
    for (let k = 0; k < 3; k++) b.add('dark', cyl(0.55, 0.55, 0.3, 12), { p: [sx * 13.6, 2 + k * 1.5, 2.35], r: [Math.PI / 2, 0, 0] });
  }
  b.add('roof', box(28, 0.5, 11, 0.12, 2), { p: [0, 10.6, 0], r: [0.1, 0, 0] });
  for (let i = 0; i < 5; i++) b.add('chair', box(1.1, 1.6, 1.0, 0.15, 2), { p: [(i - 2) * 3.4, 2.0, -1.2] }); // the panel's chairs
  for (let rI = 0; rI < 3; rI++) for (let i = 0; i < 9; i++)                                       // audience benches below the deck
    b.add('chair', box(1.5, 0.5, 0.5, 0.08, 1), { p: [(i - 4) * 2.6, 0.4 - rI * 0.0, 8.5 + rI * 2.2] });
  grp.add(b.build({ deck: NAVY, back: NAVY, post: STEEL, roof: GOLD, chair: plastic(0xd9dce2, 0.6), stack: STEEL, dark: STEEL }));
  const screen = (() => {
    const tex = canvasTex(1024, 400, (g, cw, ch) => {
      g.fillStyle = '#101623'; g.fillRect(0, 0, cw, ch);
      g.fillStyle = '#c9a227'; g.fillRect(0, 0, cw, 18); g.fillRect(0, ch - 18, cw, 18);
      fitText(g, 'THE GREAT RESET', cw / 2, ch / 2 - 42, cw - 60, 140, 118, '"Luckiest Guy", "Arial Black", sans-serif', { fill: '#f4f6f8' });
      fitText(g, 'PANEL 4: THE SNOW — OWNING IT', cw / 2, ch / 2 + 62, cw - 80, 64, 52, '"Arial", sans-serif', { fill: '#9fd4e8' });
    }, { repeat: false, aniso: 8 });
    return new THREE.Mesh(new THREE.PlaneGeometry(21, 8.2), new THREE.MeshStandardMaterial({ map: tex, emissiveMap: tex, emissive: 0xffffff, emissiveIntensity: 0.5, roughness: 0.4 }));
  })();
  screen.position.set(0, 5.6, -4.25);
  grp.add(screen);
  return grp;
}

/** Security watchtower: lattice legs, a glass cab, and a searchlight whose beam pivot is in userData. */
export function watchtower({ h = 13 } = {}) {
  const grp = new THREE.Group(), b = new ModelBuilder();
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) strut(b, 'leg', [sx * 2.3, 0, sz * 2.3], [sx * 1.4, h - 2.4, sz * 1.4], 0.28);
  for (const k of [0.33, 0.66]) for (const sx of [-1, 1]) strut(b, 'leg', [sx * (2.3 - 0.9 * k), h * k - 0.8, -2.3 + 0.9 * k], [sx * (2.3 - 0.9 * k), h * k - 0.8, 2.3 - 0.9 * k], 0.14);
  b.add('cab', box(4.6, 2.6, 4.6, 0.15, 2), { p: [0, h - 1.1, 0] });
  b.add('glass', box(4.8, 1.2, 4.8, 0.1, 1), { p: [0, h - 0.7, 0] });
  b.add('roof', cone(3.9, 1.6, 4), { p: [0, h + 1.1, 0], r: [0, Math.PI / 4, 0] });
  grp.add(b.build({ leg: STEEL, cab: NAVY, glass: GLASS, roof: RED }));
  // searchlight: a pivot at the cab's front lip; decorate sweeps it
  const pivot = new THREE.Group(); pivot.position.set(0, h - 1.6, 2.2);
  const lamp = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.55, 0.7, 12), glow(0xfff3c0, 3));
  lamp.rotation.x = Math.PI / 2; pivot.add(lamp);
  const beamGeo = new THREE.ConeGeometry(3.4, 26, 18, 1, true); beamGeo.translate(0, -13, 0);
  const beam = new THREE.Mesh(beamGeo, new THREE.MeshBasicMaterial({ color: 0xfff3c0, transparent: true, opacity: 0.13, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending }));
  beam.rotation.x = -Math.PI / 2 - 0.42; beam.position.set(0, 0, 0.4);
  pivot.add(beam);
  grp.add(pivot);
  grp.userData.beam = pivot;
  return grp;
}

/** One 4.4 m run of security fencing: posts, rails, and a fine dark mesh. Instanced along the plunge. */
export function fencePanel() {
  const b = new ModelBuilder();
  for (const sx of [-1, 1]) b.add('post', cyl(0.07, 0.07, 2.3, 6), { p: [sx * 2.1, 1.15, 0] });
  b.add('rail', box(4.4, 0.09, 0.09, 0.02, 1), { p: [0, 2.2, 0] });
  b.add('rail', box(4.4, 0.09, 0.09, 0.02, 1), { p: [0, 0.5, 0] });
  const g = b.build({ post: STEEL, rail: STEEL });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(4.4, 2.1), new THREE.MeshStandardMaterial({ color: 0x2c313a, roughness: 0.6, metalness: 0.5, transparent: true, opacity: 0.4, side: THREE.DoubleSide }));
  mesh.position.y = 1.15;
  g.add(mesh);
  return g;
}

/* ---------- edges and hillsides ---------- */
/** A soft snow bank, ~3.4 m wide: merged lumps that hug the road edge. */
export function snowBank(seed = 1) {
  const b = new ModelBuilder(), rng = makeRng(seed);
  for (let i = 0; i < 3; i++) b.add('snow', blob(1.15 - Math.abs(i - 1) * 0.25, seed + i * 7), { p: [(i - 1) * 1.25, 0.1, rng.range(-0.2, 0.2)], s: [1.15, 0.62, 0.9] });
  return b.build({ snow: SNOW });
}

/** The Mount Wario marker: a thin red post with a white band, 1.15 m tall. */
export function redPost() {
  const b = new ModelBuilder();
  b.add('post', cyl(0.09, 0.11, 1.15, 8), { p: [0, 0.57, 0] });
  b.add('band', cyl(0.12, 0.12, 0.22, 8), { p: [0, 0.92, 0] });
  return b.build({ post: RED, band: SNOW });
}

/** A snow-dusted conifer, 7–10 m: trunk, three green tiers, three snow tiers. */
export function snowPine(seed = 1, { h = 8.5 } = {}) {
  const b = new ModelBuilder(), rng = makeRng(seed), s = h / 8.5;
  b.add('trunk', cyl(0.22 * s, 0.3 * s, 1.6 * s, 8), { p: [0, 0.8 * s, 0] });
  const tiers = [[3.3, 3.4, 2.6], [2.5, 3.0, 4.6], [1.6, 2.6, 6.5]];
  for (const [r, th, y] of tiers) {
    b.add('leaf', cone(r * s, th * s, 10), { p: [0, y * s, 0] });
    b.add('snow', cone(r * 0.82 * s, th * 0.5 * s, 10), { p: [0, (y + th * 0.28) * s, 0] });
  }
  const g = b.build({ trunk: WOOD_D, leaf: seed % 2 ? PINE : PINE_D, snow: SNOW });
  g.rotation.y = rng() * 6.28;
  return g;
}

/* ---------- polish round: resort, village and summit furniture ---------- */
/** A flat sponsor panel on a plain group, for cladding structures (crest jump beam, hotel front). */
export function facadePanel(text, opts = {}) {
  const g = new THREE.Group();
  g.add(signPanel(text, opts));
  return g;
}

/** A cylinder stretched between two world points (gondola cables, braces). */
export function tubeBetween(a, b, r = 0.05, mat = STEEL) {
  const A = new THREE.Vector3(a[0], a[1], a[2]), B = new THREE.Vector3(b[0], b[1], b[2]);
  const d = B.clone().sub(A), len = d.length() || 0.001;
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, len, 6), mat);
  m.position.copy(A).addScaledVector(d, 0.5);
  m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize());
  m.castShadow = true;
  return m;
}

/** A resort lamp post: dark pole, straight arm over the road, warm head. ~4.6 m. Instanced along the straights. */
export function lampPost() {
  const b = new ModelBuilder();
  b.add('post', cyl(0.07, 0.11, 4.4, 8), { p: [0, 2.2, 0] });
  b.add('post', box(0.09, 0.09, 1.15, 0.02, 1), { p: [0, 4.42, 0.5] });
  b.add('post', sphere(0.13, 8, 6), { p: [0, 4.5, 0] });
  b.add('lamp', box(0.36, 0.13, 0.55, 0.04, 1), { p: [0, 4.34, 1.02] });
  return b.build({ post: STEEL, lamp: glow(0xffd9a0, 1.1) });
}

/** A pennant flag pole, 7.6 m: the apron and the start straight fly these in resort colours. */
export function flagPole(seed = 1, { color = 0x1f2a44 } = {}) {
  const b = new ModelBuilder();
  b.add('pole', cyl(0.05, 0.09, 7.6, 8), { p: [0, 3.8, 0] });
  b.add('ball', sphere(0.17, 10, 8), { p: [0, 7.78, 0] });
  b.add('flag', box(1.75, 0.85, 0.05, 0.02, 1), { p: [0.92, 7.12, 0], r: [0, 0, -0.05] });
  b.add('flag', box(0.5, 0.85, 0.05, 0.02, 1), { p: [2.02, 7.12, 0], r: [0, 0, 0.1] });
  return b.build({ pole: STEEL, ball: GOLD, flag: paint(color, { rough: 0.55, clear: 0.25 }) });
}

/** A string of festival pennants sagging across the road: from (-span/2, 0, 0) to (span/2, 0, 0). */
export function bunting(span = 20, { sag = 1.7, flags = 13 } = {}) {
  const b = new ModelBuilder();
  const cols = ['cNavy', 'cGold', 'cRed', 'cWhite'];
  const pt = t => [(t - 0.5) * span, -Math.sin(t * Math.PI) * sag, 0];
  let prev = pt(0);
  for (let k = 1; k <= 16; k++) { const p = pt(k / 16); strut(b, 'string', prev, p, 0.035); prev = p; }
  for (let k = 0; k < flags; k++) {
    const t = (k + 0.5) / flags, [x, y] = pt(t);
    b.add(cols[k % 4], box(0.95, 1.2, 0.04, 0.02, 1), { p: [x, y - 0.64, 0], r: [0, 0, (k % 2 ? -1 : 1) * 0.05] });
  }
  return b.build({ string: STEEL, cNavy: NAVY, cGold: GOLD, cRed: RED, cWhite: WHITE });
}

/** Wooden pasture fence panel, 4.6 m: two posts, two rails. Instanced along the meadow and the valley. */
export function woodFence() {
  const b = new ModelBuilder();
  for (const sx of [-1, 1]) b.add('post', box(0.18, 1.25, 0.18, 0.03, 1), { p: [sx * 2.2, 0.62, 0], r: [0, 0, sx * 0.04] });
  b.add('rail', box(4.6, 0.14, 0.07, 0.02, 1), { p: [0, 1.02, 0.02], r: [0, 0, 0.015] });
  b.add('rail', box(4.6, 0.14, 0.07, 0.02, 1), { p: [0, 0.55, -0.02], r: [0, 0, -0.012] });
  return b.build({ post: WOOD_D, rail: WOOD });
}

/** A stack of firewood logs, for leaning against a chalet wall. */
export function woodPile() {
  const b = new ModelBuilder();
  for (let rI = 0; rI < 3; rI++) for (let i = 0; i < 4 - (rI > 1 ? 1 : 0); i++)
    b.add('log', cyl(0.21, 0.21, 2.2, 8), { p: [(i - 1.5) * 0.44 + (rI % 2) * 0.2, 0.22 + rI * 0.4, 0], r: [Math.PI / 2, 0, 0] });
  return b.build({ log: WOOD });
}

/** The grand hotel behind the start: three storeys of lit balconies under one long snow roof. */
export function grandHotel() {
  const grp = new THREE.Group(), b = new ModelBuilder();
  const W = 34, D = 11;
  b.add('stone', box(W, 3, D, 0.15, 2), { p: [0, 1.5, 0] });
  b.add('wood', box(W - 1, 3, D - 1, 0.12, 2), { p: [0, 4.5, 0] });
  b.add('wood', box(W - 2, 2.8, D - 2, 0.12, 2), { p: [0, 7.4, 0] });
  for (const sx of [-1, 1]) {
    b.add('roof', box(20.5, 0.4, D + 2.4, 0.08, 1), { p: [sx * 8.6, 10.35, 0], r: [0, 0, -sx * 0.62] });
    b.add('snow', box(20.5, 0.24, D + 2.5, 0.08, 1), { p: [sx * 8.62, 10.62, 0], r: [0, 0, -sx * 0.62] });
  }
  for (const f of [0, 1]) {   // balcony rows on the front (+Z)
    b.add('balc', box(W - 3, 0.22, 1.5, 0.05, 1), { p: [0, 3.4 + f * 2.95, D / 2 + 0.45] });
    b.add('balc', box(W - 3, 0.14, 0.14, 0.04, 1), { p: [0, 4.35 + f * 2.95, D / 2 + 1.12] });
    for (let i = -7; i <= 7; i++) b.add('balc', box(0.13, 0.95, 0.13, 0.03, 1), { p: [i * 2.1, 3.9 + f * 2.95, D / 2 + 1.12] });
  }
  for (let i = -7; i <= 7; i++) { if (i !== 0) b.add('win', box(1.15, 1.5, 0.14, 0.04, 1), { p: [i * 2.15, 1.7, D / 2 + 0.06] }); }
  for (let i = -7; i <= 7; i++) b.add('win', box(1.05, 1.05, 0.14, 0.04, 1), { p: [i * 2.15, 4.6, (D - 1) / 2 + 0.06] });
  for (let i = -7; i <= 7; i++) b.add('win', box(1.05, 1.05, 0.14, 0.04, 1), { p: [i * 2.15, 7.5, (D - 2) / 2 + 0.06] });
  b.add('wood', box(6.4, 0.3, 3.4, 0.06, 1), { p: [0, 3.1, D / 2 + 1.6], r: [0.16, 0, 0] });   // entrance canopy
  b.add('win', box(2.2, 2.6, 0.16, 0.05, 1), { p: [0, 1.45, D / 2 + 0.06] });
  b.add('stone', box(1.0, 2.6, 1.0, 0.1, 1), { p: [-11, 11.4, -2] });
  b.add('stone', box(1.0, 2.6, 1.0, 0.1, 1), { p: [12.5, 11.2, 1.5] });
  b.add('smoke', sphere(0.9, 10, 8), { p: [-11, 13.2, -2], s: [1, 0.75, 1] });
  grp.add(b.build({ stone: STONE, wood: WOOD, roof: WOOD_D, snow: SNOW, balc: WOOD_D, win: glow(0xffc890, 1.15), smoke: plastic(0xe8edf2, 0.95) }));
  const panel = signPanel('HOTEL STAKEHOLDER', { w: 13, h: 1.9, bg: '#1f2a44', fg: '#f4f6f8' });
  panel.position.set(0, 9.35, (D - 2) / 2 + 0.35);
  grp.add(panel);
  return grp;
}

/** The valley chapel: white nave, steep roof, and a spire with a clock and a gold ball. */
export function chapel() {
  const grp = new THREE.Group(), b = new ModelBuilder();
  b.add('nave', box(7, 4.6, 11, 0.12, 2), { p: [0, 2.3, 0] });
  for (const sx of [-1, 1]) {
    b.add('roof', box(5.4, 0.3, 12, 0.06, 1), { p: [sx * 1.8, 6.1, 0], r: [0, 0, -sx * 0.74] });
    b.add('snow', box(5.4, 0.2, 12.1, 0.06, 1), { p: [sx * 1.82, 6.34, 0], r: [0, 0, -sx * 0.74] });
  }
  for (const sx of [-1, 1]) for (const k of [-1, 0, 1]) b.add('win', box(0.14, 2.2, 0.95, 0.05, 1), { p: [sx * 3.56, 2.6, k * 3.1] });
  b.add('tower', box(2.6, 8.6, 2.6, 0.12, 2), { p: [0, 4.3, 5.4] });
  b.add('spire', cone(2.3, 4.8, 4), { p: [0, 11, 5.4], r: [0, Math.PI / 4, 0] });
  b.add('ball', sphere(0.34, 10, 8), { p: [0, 13.7, 5.4] });
  b.add('win', box(0.95, 1.6, 0.14, 0.05, 1), { p: [0, 6.2, 6.76] });
  grp.add(b.build({ nave: plastic(0xf2f0e9, 0.85), roof: WOOD_D, snow: SNOW, tower: plastic(0xf2f0e9, 0.85), spire: NAVY, ball: GOLD, win: glow(0xffc890, 1.2) }));
  const clock = new THREE.Mesh(new THREE.CylinderGeometry(0.78, 0.78, 0.12, 20), GOLD);
  clock.rotation.x = Math.PI / 2; clock.position.set(0, 7.9, 6.78);
  grp.add(clock);
  const hands = new ModelBuilder();
  hands.add('hand', box(0.09, 0.55, 0.05, 0.01, 1), { p: [0, 0.18, 0] });
  hands.add('hand', box(0.09, 0.4, 0.05, 0.01, 1), { p: [0.12, -0.05, 0], r: [0, 0, -1.1] });
  const hg = hands.build({ hand: NAVY }); hg.position.set(0, 7.9, 6.86);
  grp.add(hg);
  return grp;
}

/** A gondola cabin: hanger arm, coloured roof, glass band, white skirt. Origin at the floor; the wheel rides ~3.4 up. */
export function gondolaCabin(seed = 1, { accent = 0x8a2f2a } = {}) {
  const b = new ModelBuilder();
  b.add('arm', box(0.14, 1.5, 0.14, 0.03, 1), { p: [0, 2.65, 0] });
  b.add('arm', box(0.72, 0.15, 0.15, 0.03, 1), { p: [0, 3.38, 0] });
  b.add('roof', box(2.3, 0.22, 2.0, 0.06, 1), { p: [0, 1.95, 0] });
  b.add('glass', box(2.16, 0.78, 1.86, 0.08, 1), { p: [0, 1.3, 0] });
  b.add('body', box(2.1, 0.85, 1.8, 0.1, 2), { p: [0, 0.48, 0] });
  return b.build({ arm: STEEL, roof: paint(accent, { rough: 0.4, clear: 0.4 }), glass: GLASS, body: WHITE });
}

/** A gondola pylon: A-frame legs, crossarm, cable wheels. The cable line runs along local Z. */
export function gondolaPylon({ h = 13 } = {}) {
  const b = new ModelBuilder();
  for (const sx of [-1, 1]) strut(b, 'leg', [sx * 2.6, 0, 0], [sx * 0.7, h, 0], 0.3);
  strut(b, 'leg', [-2.0, h * 0.45, 0], [2.0, h * 0.45, 0], 0.14);
  strut(b, 'leg', [-1.35, h * 0.75, 0], [1.35, h * 0.75, 0], 0.12);
  b.add('arm', box(4.6, 0.35, 0.5, 0.06, 1), { p: [0, h + 0.2, 0] });
  for (const sx of [-1, 1]) b.add('wheel', cyl(0.42, 0.42, 0.18, 12), { p: [sx * 1.6, h - 0.12, 0], r: [Math.PI / 2, 0, 0] });
  return b.build({ leg: STEEL, arm: STEEL, wheel: NAVY });
}

/** The security checkpoint: two booths, a beam with the inspection sign, and a raised barrier arm. Spans the road. */
export function checkpoint(span = 26) {
  const grp = new THREE.Group(), b = new ModelBuilder();
  for (const sx of [-1, 1]) {
    b.add('booth', box(2.6, 3.1, 2.6, 0.12, 2), { p: [sx * (span / 2), 1.55, 0] });
    b.add('glass', box(2.7, 1.0, 2.7, 0.08, 1), { p: [sx * (span / 2), 2.2, 0] });
    b.add('roof', box(3.2, 0.3, 3.2, 0.08, 1), { p: [sx * (span / 2), 3.3, 0] });
    b.add('post', cyl(0.16, 0.2, 6.6, 10), { p: [sx * (span / 2), 3.3, -1.4] });
  }
  b.add('beam', box(span + 1.5, 1.5, 0.7, 0.12, 2), { p: [0, 6.15, -1.4] });
  b.add('trim', box(span + 1.7, 0.3, 0.8, 0.06, 1), { p: [0, 5.3, -1.4] });
  grp.add(b.build({ booth: NAVY, glass: GLASS, roof: GOLD, post: STEEL, beam: NAVY, trim: RED }));
  for (const s of [1, -1]) {
    const panel = signPanel('AGENDA INSPECTION', { w: 13, h: 1.35, bg: '#8a2f2a', fg: '#f4f6f8' });
    panel.position.set(0, 6.15, -1.4 + s * 0.38); panel.rotation.y = s > 0 ? 0 : Math.PI;
    grp.add(panel);
  }
  const arm = new THREE.Group();
  const ab = new ModelBuilder();
  for (let k = 0; k < 6; k++) ab.add(k % 2 ? 'wht' : 'red', box(1.05, 0.2, 0.2, 0.03, 1), { p: [-0.6 - k * 1.05, 0, 0] });
  arm.add(ab.build({ red: RED, wht: WHITE }));
  arm.position.set(span / 2 - 1.2, 3.35, 1.1); arm.rotation.z = -0.62;
  grp.add(arm);
  return grp;
}

/** A floodlight pole for the security zone: an 11 m mast with a four-lamp head. */
export function floodlight({ h = 11 } = {}) {
  const b = new ModelBuilder();
  b.add('pole', cyl(0.12, 0.19, h, 10), { p: [0, h / 2, 0] });
  b.add('bar', box(2.4, 0.3, 0.3, 0.05, 1), { p: [0, h + 0.1, 0] });
  for (let i = -1.5; i <= 1.5; i++) b.add('lamp', box(0.5, 0.34, 0.2, 0.04, 1), { p: [i * 0.62, h + 0.02, 0.2], r: [0.5, 0, 0] });
  return b.build({ pole: STEEL, bar: STEEL, lamp: glow(0xfff3c0, 1.5) });
}

/** The security van: navy box, gold stripe, light bar, SECURITY down both flanks. */
export function securityVan() {
  const grp = new THREE.Group(), b = new ModelBuilder();
  b.add('body', box(2.3, 1.9, 5.6, 0.14, 2), { p: [0, 1.45, 0] });
  b.add('glass', box(2.34, 0.62, 1.3, 0.08, 1), { p: [0, 1.95, 2.15] });
  b.add('stripe', box(2.36, 0.4, 5.64, 0.04, 1), { p: [0, 1.02, 0] });
  b.add('bar', box(1.7, 0.22, 0.5, 0.05, 1), { p: [0, 2.56, 0.4] });
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) b.add('wheel', cyl(0.52, 0.52, 0.35, 12), { p: [sx * 1.05, 0.52, sz > 0 ? 1.75 : -1.75], r: [0, 0, Math.PI / 2] });
  grp.add(b.build({ body: NAVY, glass: GLASS, stripe: GOLD, bar: RED, wheel: STEEL }));
  for (const s of [1, -1]) {
    const panel = signPanel('SECURITY', { w: 3.4, h: 0.8, bg: '#1f2a44', fg: '#f4f6f8', font: 90 });
    panel.position.set(s * 1.19, 1.66, -0.4); panel.rotation.y = s * Math.PI / 2;
    grp.add(panel);
  }
  return grp;
}

/**
 * The crest jump dressed as a built ski jump, in world coordinates: navy skirt panels hang from both
 * ramp edges (with a gold top trim), steel pillars carry the edges, and a tower arch at the lip carries
 * THE CREST over the takeoff. L/R: sampled top-edge points, lip last. towers: [{ x, z, y0, y1 }] x2.
 */
export function crestJump({ L, R, pillars = [], towers = [], travelYaw = 0 }) {
  const grp = new THREE.Group();
  const navy = [], gold = [], steel = [];
  const panel = (list, a, b, drop, lift = 0) => {
    const A = new THREE.Vector3(a[0], a[1] + lift, a[2]), B = new THREE.Vector3(b[0], b[1] + lift, b[2]);
    const dir = B.clone().sub(A), horiz = Math.hypot(dir.x, dir.z) || 1e-4;
    const g = new THREE.BoxGeometry(0.22, drop, dir.length() + 0.3);
    g.applyQuaternion(new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.atan2(dir.y, horiz), Math.atan2(dir.x, dir.z), 0, 'YXZ')));
    const mid = A.add(B).multiplyScalar(0.5);
    g.translate(mid.x, mid.y - drop / 2, mid.z);
    list.push(g);
  };
  for (const E of [L, R]) for (let k = 0; k < E.length - 1; k++) { panel(navy, E[k], E[k + 1], 1.9); panel(gold, E[k], E[k + 1], 0.3, 0.05); }
  for (const [x, z, topY, botY] of pillars) { const g = new THREE.BoxGeometry(0.42, Math.max(0.4, topY - botY), 0.42); g.translate(x, (topY + botY) / 2, z); steel.push(g); }
  if (towers.length === 2) {
    const [t0, t1] = towers;
    for (const t of towers) { const g = new THREE.BoxGeometry(0.85, t.y1 - t.y0, 0.85); g.translate(t.x, (t.y0 + t.y1) / 2, t.z); steel.push(g); }
    panel(navy, [t0.x, t0.y1, t0.z], [t1.x, t1.y1, t1.z], 1.25);
    panel(gold, [t0.x, t0.y1, t0.z], [t1.x, t1.y1, t1.z], 0.28, 0.3);
    const sign = signPanel('THE CREST', { w: 9, h: 1.1, bg: '#1f2a44', fg: '#f4f6f8' });
    sign.position.set((t0.x + t1.x) / 2 - Math.sin(travelYaw) * 0.18, (t0.y1 + t1.y1) / 2 - 0.62, (t0.z + t1.z) / 2 - Math.cos(travelYaw) * 0.18);
    sign.rotation.y = travelYaw + Math.PI;
    grp.add(sign);
  }
  const merged = (list, mat) => { if (!list.length) return; const m = new THREE.Mesh(mergeGeometries(list), mat); m.castShadow = true; grp.add(m); };
  merged(navy, NAVY); merged(gold, GOLD); merged(steel, STEEL);
  return grp;
}

/* ---------- obstacle ---------- */
/** A chunky snowplow, ~4.6 m long, blade toward +Z. Patrols the climb. */
export function plow() {
  const b = new ModelBuilder();
  b.add('body', box(2.2, 1.1, 3.4, 0.15, 2), { p: [0, 1.15, -0.3] });
  b.add('cab', box(2.0, 1.1, 1.5, 0.15, 2), { p: [0, 2.2, -0.9] });
  b.add('glass', box(2.05, 0.6, 1.55, 0.08, 1), { p: [0, 2.35, -0.9] });
  b.add('blade', box(3.6, 1.1, 0.3, 0.08, 1), { p: [0, 0.75, 2.0], r: [0.5, 0, 0] });
  b.add('arm', box(0.3, 0.3, 1.4, 0.05, 1), { p: [0.7, 0.8, 1.2], r: [0.4, 0, 0] });
  b.add('arm', box(0.3, 0.3, 1.4, 0.05, 1), { p: [-0.7, 0.8, 1.2], r: [0.4, 0, 0] });
  b.add('lamp', box(0.4, 0.25, 0.15, 0.05, 1), { p: [0.7, 2.9, -0.9] });
  b.add('lamp', box(0.4, 0.25, 0.15, 0.05, 1), { p: [-0.7, 2.9, -0.9] });
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) b.add('wheel', cyl(0.55, 0.55, 0.4, 12), { p: [sx * 1.05, 0.55, sz > 0 ? 1.1 : -1.5], r: [0, 0, Math.PI / 2] });
  return b.build({ body: ORANGE, cab: ORANGE, glass: GLASS, blade: STEEL, arm: STEEL, lamp: glow(0xffc23c, 2.2), wheel: STEEL });
}
