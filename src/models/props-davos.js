/* Props for Davos Circuit: private jets on the resort tarmac, fondue and
   chocolate chalets on the climb, the GREAT RESET panel stage above the
   plunge, a security watchtower with a sweeping searchlight, the perimeter
   fence, snow banks, red edge posts (the Mount Wario marker), snow-dusted
   pines, and a snowplow that patrols the climb. Each builder returns a
   THREE.Group on y = 0, facing +Z. Nothing here touches the DOM at import
   time. */
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { ModelBuilder, box, sphere, cyl, capsule, cone, lathe, torus, plastic, glow, paint } from './build.js';
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
const SMOKE = plastic(0xe8edf2, 0.95);
const SNOW_SOFT = plastic(0xfdfdff, 1.0);
const ICE_BLOCK = plastic(0xe8f3ff, 0.75);
const BLACK = plastic(0x1b1d22, 0.6);
const SKIN = plastic(0xe6b98f, 0.7);
/** Lit windows, the track's own material (not the shared glow cache) so the
    final-lap alpenglow can turn every window in the valley up at once. */
export const WINDOW = new THREE.MeshStandardMaterial({ color: 0x2a1c10, emissive: 0xffc27a, emissiveIntensity: 1.1, roughness: 0.4 });

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

/** A giant die-cut delegate credential. The road passes through the lower cutout. */
export function delegatePass(clearWidth) {
  const b = new ModelBuilder(), edge = clearWidth / 2 + 1.7;
  b.add('card', box(clearWidth + 6.8, 6.5, 1.1, 0.55, 3), { p: [0, 11.45, 0] });
  for (const side of [-1, 1]) {
    b.add('card', box(3.4, 9.5, 1.1, 0.5, 3), { p: [side * edge, 4.4, 0] });
    b.add('foil', box(2.6, 0.7, 1.3, 0.18, 2), { p: [side * edge, 1.1, 0] });
    for (let i = 0; i < 7; i++)
      b.add('ink', box(0.12 + 0.08 * (i % 3), 3.2, 0.14), { p: [side * edge + (i - 3) * 0.33, 4, 0.57] });
    strut(b, 'fabric', [side * 0.4, 16.5, 0], [side * 8.6, 26, -1], 1.65, 0.3);
    strut(b, 'hem', [side * 0.4, 16.5, 0.24], [side * 8.6, 26, -0.76], 0.31, 0.11);
  }
  b.add('fabric', box(17.7, 1.1, 0.45, 0.2, 2), { p: [0, 26, -1] });
  b.add('ink', box(4.6, 1.2, 0.14, 0.45, 2), { p: [0, 13.8, 0.59] });
  b.add('foil', torus(1.3, 0.3, 8, 24), { p: [0, 15.2, 0.7], s: [0.83, 1.25, 1] });
  return b.build({ card: WHITE, ink: NAVY, foil: GOLD, fabric: RED, hem: WHITE });
}

/** A jet-sized airport baggage sizer, with handles and a four-point lift harness. */
export function luggageCarrier() {
  const b = new ModelBuilder();
  // An open luggage cradle keeps the fuselage readable even when viewed from beneath.
  for (const z of [-2.2, 2.2]) b.add('tray', box(16.7, 0.38, 0.8, 0.15, 2), { p: [0, 0.1, z] });
  for (const side of [-1, 1]) {
    b.add('rim', box(17, 0.6, 0.4, 0.14, 1), { p: [0, 0.55, side * 5.35] });
    b.add('rim', box(0.4, 0.6, 11, 0.14, 1), { p: [side * 8.3, 0.55, 0] });
    for (const z of [-4.7, 4.7]) strut(b, 'rim', [side * 7.8, 0.65, z], [0, 8, 0], 0.19);
  }
    b.add('tag', box(3.2, 1.6, 0.2, 0.2, 2), { p: [-5.4, 0.05, 5.45], r: [0, 0, 0.17] });
  for (let i = 0; i < 5; i++) b.add('bar', box(0.11 + 0.05 * (i % 2), 0.93, 0.08), { p: [-5.9 + i * 0.26, 0.03, 5.59], r: [0, 0, 0.17] });
  const tray = b.build({ tray: NAVY, rim: GOLD, tag: RED, bar: WHITE }), jet = privateJet(24, { accent: 0xbf1736 });
  jet.rotation.y = Math.PI / 2 - 0.19; jet.scale.setScalar(1.04); jet.position.y = 0.38; tray.add(jet);
  return tray;
}

/** Brass stanchions and red velvet ropes for the premium luggage queue. */
export function velvetQueue() {
  const b = new ModelBuilder();
  for (let i = 0; i < 5; i++) {
    const x = i * 2.6 - 5.2;
    b.add('brass', cyl(0.14, 0.19, 1.55, 8), { p: [x, 0.78, 0] });
    b.add('brass', sphere(0.27, 8, 6), { p: [x, 1.62, 0] });
    if (i < 4) {
      strut(b, 'velvet', [x, 1.4, 0], [x + 1.3, 0.95, 0], 0.16);
      strut(b, 'velvet', [x + 1.3, 0.95, 0], [x + 2.6, 1.4, 0], 0.16);
    }
  }
  return b.build({ brass: GOLD, velvet: RED });
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
  grp.add(b.build({ stone: STONE, wood: WOOD, roof: WOOD_D, snow: SNOW, balc: WOOD, win: WINDOW, smoke: SMOKE }));
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
export function panelStage({ screenMat = null } = {}) {
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
  if (screenMat) screen.material = screenMat;
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
/** A plowed snow drift, ~5 m long: smooth overlapping mounds (smooth-shaded spheres, not
    lumpy icosahedra, which read as faceted ice at kart height). */
export function snowBank(seed = 1) {
  const b = new ModelBuilder(), rng = makeRng(seed);
  for (let i = 0; i < 3; i++) b.add('snow', sphere(1, 16, 9), { p: [(i - 1) * 1.6, 0, rng.range(-0.2, 0.2)], s: [1.7 - Math.abs(i - 1) * 0.35, 0.62 - Math.abs(i - 1) * 0.12, 1.15] });
  return b.build({ snow: SNOW_SOFT });
}

/** The Mount Wario marker: a thin red post with a white band, 1.15 m tall. */
export function redPost() {
  const b = new ModelBuilder();
  b.add('post', cyl(0.09, 0.11, 1.15, 8), { p: [0, 0.57, 0] });
  b.add('band', cyl(0.12, 0.12, 0.22, 8), { p: [0, 0.92, 0] });
  return b.build({ post: RED, band: SNOW });
}

/** Wind-bent firs. Matching irregular branch tips and snow mantles keep
    the silhouette twiggy at distance without modelling individual needles. */
export function snowPine(seed = 1, { h = 8.5 } = {}) {
  const b = new ModelBuilder(), rng = makeRng(seed);
  const girth = rng.range(0.26, 0.39), lean = rng.range(-0.08, 0.08) * h;
  b.add('trunk', cyl(h * 0.019, h * 0.041, h * 0.64, 6), { p: [0, h * 0.32, 0] });
  for (let layer = 0; layer < 4; layer++) {
    const base = 0.13 + 0.17 * layer, r = girth * h * (1 - layer * 0.20);
    const angle = rng() * Math.PI, branch = Array.from({ length: 12 }, (_, i) => {
      const a = angle + i * Math.PI / 6, tip = (i % 2 === 0 ? 1 : 0.73) * rng.range(0.88, 1.08);
      return [Math.cos(a) * r * tip, base * h + (i % 2 ? 0.05 : -0.025) * h, Math.sin(a) * r * tip];
    });
    const top = [lean * (base + 0.35), (base + 0.37) * h, 0];
    for (const [key, inset] of [['leaf', 1], ['snow', 0.81]]) {
      const verts = [];
      const edge = ([x, y, z]) => [lean * base + x * inset, y + (1 - inset) * h * 0.53, z * inset];
      for (let i = 0; i < branch.length; i++) verts.push(...top, ...edge(branch[(i + 1) % 12]), ...edge(branch[i]));
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
      geo.computeVertexNormals(); b.add(key, geo);
    }
  }
  return b.build({ trunk: WOOD_D, leaf: seed % 3 ? PINE : PINE_D, snow: SNOW });
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
export function grandHotel({ sign = true } = {}) {
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
  grp.add(b.build({ stone: STONE, wood: WOOD, roof: WOOD_D, snow: SNOW, balc: WOOD_D, win: WINDOW, smoke: SMOKE }));
  if (sign) {
    const panel = signPanel('HOTEL STAKEHOLDER', { w: 13, h: 1.9, bg: '#1f2a44', fg: '#f4f6f8' });
    panel.position.set(0, 9.35, (D - 2) / 2 + 0.35);
    grp.add(panel);
  }
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
  grp.add(b.build({ nave: plastic(0xf2f0e9, 0.85), roof: WOOD_D, snow: SNOW, tower: plastic(0xf2f0e9, 0.85), spire: NAVY, ball: GOLD, win: WINDOW }));
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
export function crestJump({ L, R, pillars = [], towers = [], travelYaw = 0, sign: signText = 'THE CREST' }) {
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
    const sign = signText ? signPanel(signText, { w: 9, h: 1.1, bg: '#1f2a44', fg: '#f4f6f8' }) : null;
    if (sign) { sign.position.set((t0.x + t1.x) / 2 - Math.sin(travelYaw) * 0.18, (t0.y1 + t1.y1) / 2 - 0.62, (t0.z + t1.z) / 2 - Math.cos(travelYaw) * 0.18);
    sign.rotation.y = travelYaw + Math.PI;
    grp.add(sign); }
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

/* ---------- quality pass (Nov 2026): the town in the bowl, the slopes, the jokes ---------- */
/** A tall alpine snow pole: orange with a dark reflector band. Lines the mountain road both sides. */
export function snowPole() {
  const b = new ModelBuilder();
  b.add('pole', cyl(0.055, 0.07, 2.5, 6), { p: [0, 1.25, 0] });
  b.add('band', cyl(0.075, 0.075, 0.45, 6), { p: [0, 2.15, 0] });
  return b.build({ pole: ORANGE, band: BLACK });
}

/** A delegate snowman: three snowballs in a navy suit, red tie, conference lanyard, and a top hat. ~3.3 m. */
export function snowman(seed = 1) {
  const b = new ModelBuilder(), rng = makeRng(seed);
  b.add('snow', sphere(0.8, 16, 10), { p: [0, 0.72, 0] });
  b.add('snow', sphere(0.58, 16, 10), { p: [0, 1.82, 0] });
  b.add('snow', sphere(0.4, 14, 10), { p: [0, 2.62, 0] });
  b.add('suit', cyl(0.52, 0.66, 0.95, 14, true), { p: [0, 1.78, 0] });                         // the jacket, wrapped on
  b.add('shirt', box(0.34, 0.62, 0.12, 0.04, 1), { p: [0, 1.88, 0.53], r: [-0.12, 0, 0] });
  b.add('tie', box(0.13, 0.5, 0.06, 0.02, 1), { p: [0, 1.86, 0.6], r: [-0.12, 0, 0] });
  b.add('shirt', box(0.24, 0.3, 0.04, 0.02, 1), { p: [0.3, 1.62, 0.6], r: [-0.2, 0.25, 0] });   // the lanyard badge
  b.add('tie', box(0.03, 0.4, 0.03, 0.01, 1), { p: [0.22, 1.86, 0.62], r: [-0.2, 0, 0.35] });
  b.add('hat', cyl(0.3, 0.3, 0.55, 14), { p: [0, 3.22, 0] });
  b.add('hat', cyl(0.48, 0.48, 0.06, 16), { p: [0, 2.96, 0] });
  b.add('nose', cone(0.07, 0.42, 8), { p: [0, 2.62, 0.55], r: [Math.PI / 2, 0, 0] });
  for (const sx of [-1, 1]) b.add('hat', sphere(0.05, 6, 5), { p: [sx * 0.14, 2.74, 0.36] });
  for (const sx of [-1, 1]) b.add('arm', cyl(0.035, 0.05, 1.3, 5), { p: [sx * 0.95, 2.0, 0], r: [0, 0, sx * (1.0 + rng.range(-0.2, 0.2))] });
  return b.build({ snow: SNOW_SOFT, suit: NAVY, shirt: WHITE, tie: RED, hat: BLACK, nose: ORANGE, arm: WOOD_D });
}

/** A VIP igloo: an ice-block dome, an entrance tunnel, a red carpet, and gold rope posts. Faces +Z. */
export function igloo() {
  const b = new ModelBuilder();
  b.add('ice', new THREE.SphereGeometry(3.4, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2), {});
  b.add('ice', new THREE.CylinderGeometry(1.25, 1.25, 2.6, 14, 1, false, -Math.PI / 2, Math.PI), { p: [0, 0, 3.4], r: [Math.PI / 2, 0, 0], s: [1, 1, 1.15] });
  b.add('dark', box(1.5, 1.4, 0.2, 0.05, 1), { p: [0, 0.7, 4.66] });
  b.add('carpet', box(1.6, 0.06, 4.2, 0.02, 1), { p: [0, 0.03, 6.8] });
  for (const sx of [-1, 1]) for (const k of [0, 1, 2]) b.add('gold', cyl(0.07, 0.09, 1.0, 8), { p: [sx * 1.25, 0.5, 5.4 + k * 1.4] });
  return b.build({ ice: ICE_BLOCK, dark: BLACK, carpet: RED, gold: GOLD });
}

/** A heli-shuttle: navy body, glass bubble, tail boom, skids. userData.rotor / userData.tail spin. Nose +Z. */
export function helicopter() {
  const grp = new THREE.Group(), b = new ModelBuilder();
  b.add('body', sphere(1.6, 18, 12), { p: [0, 1.9, 0.4], s: [1, 0.95, 1.5] });
  b.add('glass', sphere(1.25, 16, 10), { p: [0, 2.15, 1.55], s: [1, 0.85, 1.05] });
  b.add('body', cyl(0.28, 0.5, 6, 10), { p: [0, 2.3, -4.0], r: [Math.PI / 2 - 0.06, 0, 0] });
  b.add('gold', box(0.18, 1.6, 1.1, 0.05, 1), { p: [0, 3.0, -6.9], r: [-0.3, 0, 0] });
  b.add('gold', box(3.3, 0.22, 0.6, 0.05, 1), { p: [0, 1.3, 0.4] });
  for (const sx of [-1, 1]) {
    b.add('skid', cyl(0.07, 0.07, 4.2, 6), { p: [sx * 1.25, 0.12, 0.3], r: [Math.PI / 2, 0, 0] });
    for (const sz of [-0.9, 1.4]) b.add('skid', cyl(0.06, 0.06, 0.9, 6), { p: [sx * 1.1, 0.55, sz], r: [0, 0, sx * 0.35] });
  }
  b.add('skid', cyl(0.12, 0.12, 0.6, 8), { p: [0, 3.55, 0.3] });
  grp.add(b.build({ body: NAVY, glass: GLASS, gold: GOLD, skid: STEEL }));
  const rb = new ModelBuilder();
  for (let k = 0; k < 4; k++) rb.add('blade', box(5.2, 0.06, 0.36, 0.02, 1), { p: [Math.cos(k * Math.PI / 2) * 2.6, 0, Math.sin(k * Math.PI / 2) * 2.6], r: [0, -k * Math.PI / 2, 0] });
  const rotor = rb.build({ blade: BLACK }, { cast: false }); rotor.position.set(0, 3.9, 0.3); grp.add(rotor);
  const tb = new ModelBuilder();
  tb.add('blade', box(0.1, 1.5, 0.18, 0.02, 1), {}); tb.add('blade', box(0.1, 0.18, 1.5, 0.02, 1), {});
  const tail = tb.build({ blade: BLACK }, { cast: false }); tail.position.set(0.25, 3.0, -6.9); grp.add(tail);
  grp.userData.rotor = rotor; grp.userData.tail = tail;
  return grp;
}

const HALL_GLASS = new THREE.MeshStandardMaterial({ color: 0x2b3f5c, emissive: 0xffb36b, emissiveIntensity: 0.32, roughness: 0.15, metalness: 0.5, envMapIntensity: 1.5 });
/** The World Elite Forum's congress hall: a long glass hall under a gently curved snow roof,
    white piers, an entrance canopy, and a row of flagpoles. ~66 x 15 x 30 m, entrance toward +Z. */
export function congressHall() {
  const b = new ModelBuilder();
  const W = 66, D = 30, H = 11;
  b.add('base', box(W + 2, 1.2, D + 2, 0.1, 1), { p: [0, 0.6, 0] });
  b.add('glass', box(W - 1, H - 1.2, D - 1, 0.1, 1), { p: [0, 1.2 + (H - 1.2) / 2, 0] });
  for (let i = 0; i <= 12; i++) for (const sz of [-1, 1]) b.add('pier', box(0.7, H - 1.2, 0.7, 0.08, 1), { p: [-W / 2 + i * (W / 12), 1.2 + (H - 1.2) / 2, sz * (D / 2 - 0.1)] });
  for (const sx of [-1, 1]) for (let i = 0; i <= 5; i++) b.add('pier', box(0.7, H - 1.2, 0.7, 0.08, 1), { p: [sx * (W / 2 - 0.1), 1.2 + (H - 1.2) / 2, -D / 2 + i * (D / 5)] });
  for (const y of [4.6, 8.0]) for (const sz of [-1, 1]) b.add('pier', box(W, 0.35, 0.5, 0.05, 1), { p: [0, y, sz * (D / 2 + 0.05)] });
  // the curved roof: five slabs stepping round a shallow arc, snow on top
  for (let k = -2; k <= 2; k++) {
    const a = k * 0.13, z = Math.sin(a) * 34, y = H + Math.cos(a) * 34 - 34 + 0.4;
    b.add('roof', box(W + 4, 0.6, D / 5 + 0.9, 0.1, 1), { p: [0, y, z], r: [-a, 0, 0] });
    b.add('snow', box(W + 3.6, 0.3, D / 5 + 0.8, 0.1, 1), { p: [0, y + 0.42, z], r: [-a, 0, 0] });
  }
  b.add('roof', box(22, 0.5, 7, 0.08, 1), { p: [0, 5.2, D / 2 + 3.4] });                        // entrance canopy
  for (const sx of [-1, 1]) b.add('pier', cyl(0.3, 0.3, 4.6, 10), { p: [sx * 10, 2.9, D / 2 + 6.4] });
  b.add('carpet', box(8, 0.08, 9, 0.02, 1), { p: [0, 0.65, D / 2 + 4.4] });
  for (let i = 0; i < 9; i++) {                                                                    // the flag row out front
    const x = (i - 4) * 7.2;
    b.add('pole', cyl(0.07, 0.1, 9, 8), { p: [x, 4.5, D / 2 + 11] });
    b.add(['fA', 'fB', 'fC'][i % 3], box(2.2, 1.3, 0.05, 0.02, 1), { p: [x + 1.15, 8.1, D / 2 + 11] });
  }
  return b.build({ base: STONE, glass: HALL_GLASS, pier: WHITE, roof: plastic(0xd9dde3, 0.5), snow: SNOW, carpet: RED, pole: STEEL, fA: NAVY, fB: GOLD, fC: RED });
}

/** A skier (or, without skis, a skater): a small chunky figure, tintable coat, dark trousers. Faces +Z. */
export function skier({ skis = true } = {}) {
  const b = new ModelBuilder();
  b.add('legs', box(0.42, 0.75, 0.3, 0.08, 1), { p: [0, 0.48, 0], r: [0.25, 0, 0] });
  b.add('coat', box(0.6, 0.72, 0.42, 0.14, 2), { p: [0, 1.15, 0.12], r: [0.35, 0, 0] });
  b.add('skin', sphere(0.21, 10, 8), { p: [0, 1.66, 0.3] });
  b.add('coat', sphere(0.23, 10, 6), { p: [0, 1.76, 0.27], s: [1, 0.6, 1] });                       // the beanie
  if (skis) {
    for (const sx of [-1, 1]) b.add('legs', box(0.12, 0.05, 1.9, 0.02, 1), { p: [sx * 0.15, 0.05, 0.2] });
    for (const sx of [-1, 1]) b.add('legs', cyl(0.02, 0.02, 1.2, 4), { p: [sx * 0.42, 0.75, -0.15], r: [0.5, 0, sx * 0.15] });
  }
  return b.build({ legs: BLACK, coat: COAT, skin: SKIN });
}
const COAT = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.6 });
COAT.userData.tintable = true;

/** The village's fondue chalet advertises with an enamel caquelon on
    the roof. A long fork spears a bread cube above the melted cheese. */
export function fonduePot() {
  const b = new ModelBuilder();
  b.add('base', cyl(2.1, 2.6, 0.75, 20), { p: [0, 0.38, 0] });
  b.add('pot', lathe([[0, 0.48], [2.1, 0.5], [3.1, 1.0], [3.9, 2.15], [4.15, 3.4], [3.91, 3.5]], 24));
  b.add('trim', torus(4.02, 0.16, 8, 24), { p: [0, 3.46, 0], r: [Math.PI / 2, 0, 0] });
  b.add('cheese', cyl(3.9, 3.83, 0.25, 24), { p: [0, 3.33, 0] });
  strut(b, 'handle', [3.4, 2.3, 0], [7.0, 3.6, 0], 0.95, 1.05);
  strut(b, 'steel', [-1.2, 3.3, 0.7], [2.8, 9.85, -0.7], 0.24);
  strut(b, 'handle', [1.95, 8.46, -0.4], [3.6, 11.18, -0.97], 0.52);
  b.add('crust', box(2.55, 2.22, 2.21, 0.36, 2), { p: [0.73, 6.49, 0.05], r: [0.2, 0.3, -0.45] });
  b.add('bread', box(2.23, 1.99, 0.15, 0.21, 1), { p: [0.98, 6.30, 1.06], r: [0.2, 0.3, -0.45] });
  return b.build({ base: STEEL, pot: RED, trim: WHITE, cheese: plastic(0xffc44f), handle: WOOD_D,
    steel: STEEL, crust: plastic(0xbf7137), bread: plastic(0xffe7aa) });
}

/** Alpine race bell. A flared brass mouth, dark interior, and swinging
    clapper sit in a timber frame, like the bells the crowds ring for skiers. */
export function raceBell() {
  const b = new ModelBuilder();
  for (const x of [-6.1, 6.1]) {
    for (const z of [-2.7, 2.7]) {
      strut(b, 'timber', [x, -3, z], [x, 13.4, z * 0.13], 0.65, 0.7);
    }
    strut(b, 'trim', [x, 9.6, 0.7], [x * 0.52, 13.1, 0.7], 0.48);
  }
  b.add('timber', box(14.1, 1.1, 1.4, 0.18, 1), { p: [0, 13.2, 0] });
  b.add('snow', box(14.3, 0.35, 1.5, 0.15, 1), { p: [0, 13.85, 0] });
  const group = b.build({ timber: WOOD_D, trim: RED, snow: SNOW });
  const bell = new ModelBuilder();
  bell.add('strap', torus(1.12, 0.31, 8, 20), { p: [0, -0.76, 0] });
  bell.add('brass', lathe([[4.0, -7.5], [4.05, -7.0], [3.45, -6.5], [2.86, -4.8],
    [2.55, -2.7], [1.9, -1.97], [0.7, -1.8], [0, -1.8]], 28), { s: [1, 1, 0.83] });
  bell.add('inside', cyl(4.0, 4.0, 0.12, 28), { p: [0, -7.44, 0], s: [1, 1, 0.83] });
  bell.add('band', cyl(2.98, 3.17, 0.55, 28, true), { p: [0, -5.45, 0], s: [1, 1, 0.84] });
  bell.add('brass', sphere(0.78, 12, 8), { p: [0, -7.73, 0] });
  const swing = bell.build({ strap: RED, brass: paint(0xf6ac31, { metal: 0.32, rough: 0.28 }), band: RED, inside: WOOD_D });
  swing.position.y = 12.8;
  group.add(swing); group.userData.swing = swing;
  return group;
}

/** Padded, flexible ski race gates stand beyond the kerb. The fabric bows
    between its two poles and a white stitched chevron points down the run. */
export function slalomFlag(color, side) {
  const b = new ModelBuilder(), cloth = plastic(color, 0.72);
  for (const x of [-1.6, 1.6]) {
    b.add('pole', cyl(0.095, 0.14, 4.8, 7), { p: [x, 2.35, 0] });
    b.add('sleeve', cyl(0.2, 0.25, 1.1, 8), { p: [x, 0.55, 0] });
  }
  const shape = new THREE.PlaneGeometry(3.18, 1.85, 5, 1), pos = shape.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const sag = Math.cos(pos.getX(i) * Math.PI / 3.2);
    pos.setY(i, pos.getY(i) - 0.17 * sag); pos.setZ(i, 0.22 * sag);
  }
  shape.computeVertexNormals();
  b.add('cloth', shape, { p: [0, 3.4, 0] });
  for (const y of [-1, 1]) strut(b, 'snow', [-side * 0.52, 3.35 + y * 0.56, 0.265], [side * 0.46, 3.35, 0.265], 0.19, 0.08);
  return b.build({ pole: cloth, sleeve: NAVY, cloth, snow: SNOW });
}

/** A two-leg sign frame (no face): the face is an atlas panel the track places at y = legs + h / 2, z = 0.08. */
export function signFrame(w = 9, h = 2.4, legs = 3.2, color = NAVY) {
  const b = new ModelBuilder();
  for (const sx of [-1, 1]) b.add('post', cyl(0.14, 0.17, legs + h, 8), { p: [sx * w * 0.38, (legs + h) / 2, -0.2] });
  b.add('frame', box(w + 0.45, h + 0.45, 0.22, 0.08, 2), { p: [0, legs + h / 2, -0.05] });
  return b.build({ post: STEEL, frame: color });
}

/** The ski jump's tower at the summit: four raked legs, braces, a glass judges' cabin on top, a gold roof,
    a flag and a beacon. ~46 m. The big boards on it are atlas panels the track places at userData.boardY. */
export function jumpTower({ h = 34 } = {}) {
  const b = new ModelBuilder(), B = 5.5, T = 3.6;
  b.add('stone', box(B * 2 + 3, 2, B * 2 + 3, 0.2, 2), { p: [0, 1, 0] });
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) strut(b, 'leg', [sx * B, 1.5, sz * B], [sx * T, h, sz * T], 0.9);
  for (const k of [0.25, 0.5, 0.75]) {
    const w = B + (T - B) * k, y = 1.5 + (h - 1.5) * k;
    for (const s of [-1, 1]) { strut(b, 'brace', [-w, y, s * w], [w, y, s * w], 0.45); strut(b, 'brace', [s * w, y, -w], [s * w, y, w], 0.45); }
  }
  b.add('cab', box(T * 2 + 3, 1.6, T * 2 + 3, 0.15, 2), { p: [0, h + 0.8, 0] });
  b.add('glass', box(T * 2 + 2.6, 3, T * 2 + 2.6, 0.12, 2), { p: [0, h + 3.1, 0] });
  b.add('roof', box(T * 2 + 4, 0.6, T * 2 + 4, 0.15, 2), { p: [0, h + 4.9, 0] });
  b.add('leg', cyl(0.12, 0.16, 7, 8), { p: [0, h + 8.6, 0] });
  b.add('flag', box(3.2, 1.8, 0.06, 0.02, 1), { p: [1.7, h + 11.2, 0] });
  b.add('beacon', sphere(0.5, 12, 8), { p: [0, h + 12.3, 0] });
  const g = b.build({ stone: STONE, leg: NAVY, brace: STEEL, cab: NAVY, glass: GLASS, roof: GOLD, flag: RED, beacon: glow(0xff4a3c, 3) });
  g.userData.boardY = h + 3.1;
  g.userData.half = T + 1.3;
  return g;
}
