/* Props for Boring Tunnel GP: the Boring Machine chewing the wall at the
   bottom of the dive, the loop-the-loop ring straddling the climb, ceiling
   fans, tripod work lights, wall signs, portal pylons, and a spare cutter
   head for the dig site outside. Each builder returns a THREE.Group on
   y = 0, facing +Z. Textures are only created inside the functions that
   receive them, so this module imports cleanly in Node. */
import * as THREE from 'three';
import { canvasTex } from '../render/textures.js';
import { ModelBuilder, box, sphere, cyl, torus, plastic, paint, glow, MAT } from './build.js';

const YELLOW = 0xf7b500;      // TBM safety yellow
const SANDSTONE = 0xcfc4ae;   // portal concrete

/** The spinning cutter face on its own, so it can spin (and be reused). */
function cutterFace(r = 3.3) {
  const c = new ModelBuilder();
  c.add('disc', cyl(r, r, 0.9, 28), { p: [0, 0, 0], r: [Math.PI / 2, 0, 0] });
  c.add('hub', cyl(0.55, 1.05, 1.25, 14), { p: [0, 0, 0.75], r: [Math.PI / 2, 0, 0] });
  for (let k = 0; k < 8; k++) {
    const a = (k / 8) * Math.PI * 2;
    c.add('tooth', box(0.8, 0.95, 0.7, 0.08, 1), { p: [Math.cos(a) * r * 0.88, Math.sin(a) * r * 0.88, 0.4] });
  }
  for (let k = 0; k < 4; k++) {
    const a = (k / 4) * Math.PI * 2 + 0.4;
    c.add('spoke', box(0.62, r * 0.68, 0.5, 0.08, 1), { p: [Math.cos(a) * r * 0.45, Math.sin(a) * r * 0.45, 0.42], r: [0, 0, a + Math.PI / 2] });
  }
  return c.build({
    disc: MAT.steel,
    hub: paint(YELLOW, { rough: 0.4, metal: 0.3 }),
    tooth: MAT.dark,
    spoke: MAT.dark,
  });
}

/**
 * The Boring Machine. Built facing +Z: the cutter face is at the front,
 * chewing into whatever wall it is pointed at; the hull sits behind it and
 * is meant to disappear into the tunnel wall. userData.spin is the cutter
 * group — rotate it around Z. Origin at road level under the disc centre
 * (disc centre is 3.1 m up).
 */
export function boringMachine() {
  const grp = new THREE.Group(), b = new ModelBuilder();
  b.add('hull', box(6.6, 4.6, 3.0, 0.25, 2), { p: [0, 3.0, -1.9] });
  b.add('collar', box(7.3, 5.6, 0.7, 0.2, 2), { p: [0, 3.05, -0.55] });
  b.add('stripe', box(6.7, 0.7, 3.1, 0.08, 1), { p: [0, 4.85, -1.9] });
  b.add('skid', box(1.1, 0.7, 4.6, 0.1, 1), { p: [-2.5, 0.35, -1.4] });
  b.add('skid', box(1.1, 0.7, 4.6, 0.1, 1), { p: [2.5, 0.35, -1.4] });
  b.add('stack', cyl(0.42, 0.5, 2.6, 10), { p: [-2.9, 6.2, -2.6], r: [0.25, 0, 0.15] });
  b.add('lamp', box(0.55, 0.32, 0.16, 0.04, 1), { p: [-2.6, 5.6, -0.35] });
  b.add('lamp', box(0.55, 0.32, 0.16, 0.04, 1), { p: [2.6, 5.6, -0.35] });
  grp.add(b.build({
    hull: paint(YELLOW, { rough: 0.42, metal: 0.25 }),
    collar: MAT.dark,
    stripe: paint(0xe23b3b, { rough: 0.5 }),
    skid: MAT.dark,
    stack: MAT.steel,
    lamp: glow(0xffe9b0, 3),
  }));
  const face = cutterFace(3.3);
  face.position.set(0, 3.1, 0.55);
  grp.add(face);
  grp.userData.spin = face;
  return grp;
}

/** Cutter blocks follow five swept arms. The outer rollers stay circular in silhouette
 * while alternating teeth and amber marker lights reveal the rotation from the kart. */
export function tbmChamber() {
  const group = new THREE.Group(), frame = new ModelBuilder(), cutter = new ModelBuilder();
  const gold = paint(0xe29125, { rough: 0.65, metal: 0.25 });
  frame.add('shell', cyl(7.15, 7.15, 8, 40), { p: [0, 0, -5.3], r: [Math.PI / 2, 0, 0] });
  frame.add('rim', torus(6.95, 0.35, 8, 40), { p: [0, 0, -0.55] });
  frame.add('lamp', torus(6.98, 0.09, 5, 48), { p: [0, 0, -0.23] });
  for (const side of [-1, 1]) {
    frame.add('shell', box(2.1, 1.3, 9, 0.14, 1), { p: [side * 5.25, -5.5, -3.8] });
    frame.add('lamp', box(0.8, 0.25, 0.15, 0.04, 1), { p: [side * 5.25, -4.76, 0.7] });
  }
  group.add(frame.build({ shell: MAT.dark, rim: gold, lamp: glow(0xffc05a, 1.6) }));
  cutter.add('plate', cyl(6.36, 6.36, 0.74, 40), { p: [0, 0, -0.38], r: [Math.PI / 2, 0, 0] });
  cutter.add('ring', torus(5.97, 0.19, 6, 48));
  cutter.add('ring', torus(1.18, 0.18, 6, 20), { p: [0, 0, 0.64] });
  cutter.add('arm', cyl(1.12, 1.65, 1.2, 12), { p: [0, 0, 0.45], r: [Math.PI / 2, 0, 0] });
  for (let k = 0; k < 5; k++) {
    for (let n = 0; n < 4; n++) {
      const a = k * Math.PI * 2 / 5 + n * 0.09, r = 1.8 + n * 1.07;
      cutter.add('arm', box(1.52, 1.10, 0.46, 0.09, 1), { p: [Math.cos(a) * r, Math.sin(a) * r, 0.25], r: [0, 0, a + 0.3] });
      cutter.add('tooth', cyl(0.4, 0.4, 0.55, 8), { p: [Math.cos(a) * r, Math.sin(a) * r, 0.62], r: [0, 0, a + 0.3] });
    }
    const a = k * Math.PI * 2 / 5 + 0.6;
    cutter.add('slot', box(2.1, 0.68, 0.10, 0.12, 1), { p: [4.1 * Math.cos(a), 4.1 * Math.sin(a), 0.06], r: [0, 0, a] });
    cutter.add('light', sphere(0.23, 8), { p: [6.04 * Math.cos(a), 6.04 * Math.sin(a), 0.22] });
  }
  const spin = cutter.build({ plate: paint(0x647786, { rough: 0.55, metal: 0.34 }), arm: gold, tooth: MAT.steel, slot: MAT.dark, ring: MAT.steel, light: glow(0xffdf86, 1.8) });
  group.add(spin); group.userData.spin = spin;
  return group;
}

/** A lone cutter head, for the dig site outside the portal. */
export function spareCutter(r = 2.3) { return cutterFace(r); }

/**
 * The loop-the-loop ring: a full torus straddling the road (visual only —
 * karts drive through the lower arc), with a sign hung under the top arc.
 * Sized for a 10 m shell: outer edge 9.15 m across, top at 9.45 m.
 */
export function loopRing(tex) {
  const grp = new THREE.Group(), b = new ModelBuilder();
  b.add('ring', torus(8.6, 0.55, 10, 44), { p: [0, 0.3, 0] });
  b.add('foot', box(1.7, 2.0, 1.7, 0.15, 1), { p: [-8.6, -0.7, 0] });
  b.add('foot', box(1.7, 2.0, 1.7, 0.15, 1), { p: [8.6, -0.7, 0] });
  b.add('rod', cyl(0.07, 0.07, 1.1, 6), { p: [-2.6, 8.15, 0] });
  b.add('rod', cyl(0.07, 0.07, 1.1, 6), { p: [2.6, 8.15, 0] });
  grp.add(b.build({
    ring: paint(YELLOW, { rough: 0.38, metal: 0.2 }),
    foot: MAT.dark,
    rod: MAT.dark,
  }));
  if (tex) {
    const sign = new THREE.Mesh(
      new THREE.BoxGeometry(6.8, 1.6, 0.22),
      new THREE.MeshStandardMaterial({ map: tex, emissiveMap: tex, emissive: 0xffffff, emissiveIntensity: 0.5, roughness: 0.6 }),
    );
    sign.position.set(0, 7.35, 0);
    grp.add(sign);
  }
  return grp;
}

/** A ceiling fan: origin at the mount point on the shell apex, blades 1.7 m below. Spin the whole group around Y. */
export function ceilingFan() {
  const b = new ModelBuilder();
  b.add('rod', cyl(0.09, 0.09, 1.6, 8), { p: [0, -0.8, 0] });
  b.add('hub', cyl(0.55, 0.72, 0.5, 14), { p: [0, -1.75, 0] });
  b.add('lamp', sphere(0.32, 12, 10), { p: [0, -2.2, 0] });
  for (let k = 0; k < 4; k++) {
    const a = (k / 4) * Math.PI * 2;
    b.add('blade', box(2.7, 0.07, 0.85, 0.03, 1), { p: [Math.cos(a) * 1.8, -1.68, Math.sin(a) * 1.8], r: [0, -a, 0.1] });
  }
  return b.build({ rod: MAT.dark, hub: MAT.steel, lamp: glow(0xffd9a0, 2.2), blade: plastic(0xd8d2c4, 0.5) });
}

/** A tripod work light, face toward +Z. */
export function workLight() {
  const b = new ModelBuilder();
  for (let k = 0; k < 3; k++) {
    const a = (k / 3) * Math.PI * 2 + 0.5;
    b.add('leg', cyl(0.05, 0.05, 2.3, 6), { p: [Math.cos(a) * 0.55, 1.0, Math.sin(a) * 0.55], r: [Math.sin(a) * 0.42, 0, -Math.cos(a) * 0.42] });
  }
  b.add('head', box(1.15, 0.8, 0.3, 0.06, 1), { p: [0, 2.25, 0], r: [0.35, 0, 0] });
  b.add('face', box(0.95, 0.6, 0.06, 0.03, 1), { p: [0, 2.18, 0.15], r: [0.35, 0, 0] });
  return b.build({ leg: MAT.dark, head: MAT.dark, face: glow(0xfff3cf, 3.2) });
}

/** An overhead banner for the bore: a wide sign panel hung from the crown
 *  on two cables, spanning the road so it reads dead-ahead. Origin at the
 *  panel's bottom-centre; place at road level + ~4.3. Faces +Z. */
export function hangBanner(tex, { w = 11, h = 1.9 } = {}) {
  const grp = new THREE.Group();
  const panel = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.16),
    [MAT.dark, MAT.dark, MAT.dark, MAT.dark, new THREE.MeshStandardMaterial({ map: tex, roughness: 0.55 }), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.55 })]);
  panel.position.y = h / 2;
  grp.add(panel);
  const b = new ModelBuilder();
  for (const s of [1, -1]) b.add('cable', cyl(0.045, 0.045, 1.1, 6), { p: [s * (w / 2 - 0.7), h + 0.55, 0] });
  b.add('bar', cyl(0.07, 0.07, w - 1.2, 6), { p: [0, h + 0.06, 0], r: [0, 0, Math.PI / 2] });
  grp.add(b.build({ cable: MAT.dark, bar: MAT.steel }));
  return grp;
}

/** The departures display is a single supported unit with the readable faces
 * mounted ahead of the fascia. Multiple back-to-back boxes occlude each other. */
export function departuresBoard(line, status) {
  const group = new THREE.Group(), b = new ModelBuilder();
  b.add('case', box(11.35, 3.4, 0.4, 0.16, 2), { p: [0, 1.55, 0] });
  for (const side of [-1, 1]) {
    b.add('post', box(0.22, 3.25, 0.22, 0.03, 1), { p: [side * 4.25, 4.8, 0] });
    b.add('lamp', box(0.17, 2.82, 0.12), { p: [side * 5.42, 1.55, 0.21] });
  }
  group.add(b.build({ case: MAT.dark, post: MAT.steel, lamp: glow(0x39d2c4, 1.25) }));
  for (const [tex, y, h] of [[line, 2.28, 1.24], [status, 0.86, 1.53]]) {
    const panel = new THREE.Mesh(new THREE.PlaneGeometry(10.45, h), new THREE.MeshBasicMaterial({ map: tex }));
    panel.position.set(0, y, 0.225); group.add(panel);
  }
  return group;
}

/** A lit wall sign: dark frame plus a textured panel, facing +Z. Origin at panel centre. */
export function wallSign(tex, { w = 6.2, h = 1.9 } = {}) {
  const grp = new THREE.Group(), b = new ModelBuilder();
  b.add('frame', box(w + 0.35, h + 0.35, 0.18, 0.05, 1), { p: [0, 0, -0.07] });
  grp.add(b.build({ frame: MAT.dark }));
  const panel = new THREE.Mesh(
    new THREE.BoxGeometry(w, h, 0.1),
    new THREE.MeshStandardMaterial({ map: tex, emissiveMap: tex, emissive: 0xffffff, emissiveIntensity: 0.45, roughness: 0.55 }),
  );
  panel.position.z = 0.05;
  grp.add(panel);
  return grp;
}

/** A boomtown tower for the city on top (#234 item 4): sandstone shaft with
 *  a lit-window grid (texture passed in, cloned per tower so the grid scale
 *  stays constant), a darker cap and a wide asphalt plinth for the block. */
export function cityTower(tex, { w = 16, d = 16, h = 20 } = {}) {
  const g = new THREE.Group();
  const t = tex.clone();
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(Math.max(1, Math.round(w / 5)), Math.max(1, Math.round(h / 5)));
  t.needsUpdate = true;
  const wall = new THREE.MeshStandardMaterial({ map: t, emissiveMap: t, emissive: 0xffbe78, emissiveIntensity: 0.75, roughness: 0.85 });
  const shaft = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), wall);
  shaft.position.y = h / 2;
  g.add(shaft);
  const cap = new THREE.Mesh(new THREE.BoxGeometry(w + 0.9, 0.8, d + 0.9), paint(0x8a6a4a, { rough: 0.8 }));
  cap.position.y = h + 0.4;
  g.add(cap);
  const plinth = new THREE.Mesh(new THREE.BoxGeometry(w + 11, 0.5, d + 11), paint(0x4c4a48, { rough: 0.95 }));
  plinth.position.y = 0.25;
  g.add(plinth);
  return g;
}

/** The pyramid hotel: a four-sided stepped pyramid in sandstone with the
 *  window grid on its slopes and a glowing apex. */
export function pyramidHotel(tex, { r = 19, h = 16 } = {}) {
  const g = new THREE.Group();
  const t = tex.clone();
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(6, 3);
  t.needsUpdate = true;
  const wall = new THREE.MeshStandardMaterial({ map: t, emissiveMap: t, emissive: 0xffbe78, emissiveIntensity: 0.6, roughness: 0.85 });
  const pyr = new THREE.Mesh(new THREE.ConeGeometry(r, h, 4), wall);
  pyr.position.y = h / 2;
  pyr.rotation.y = Math.PI / 4;
  g.add(pyr);
  const apex = new THREE.Mesh(new THREE.SphereGeometry(0.85, 10, 8), glow(0xff4fa0, 2.2));
  apex.position.y = h + 0.5;
  g.add(apex);
  const plinth = new THREE.Mesh(new THREE.BoxGeometry(r * 1.9, 0.5, r * 1.9), paint(0x4c4a48, { rough: 0.95 }));
  plinth.position.y = 0.25;
  g.add(plinth);
  return g;
}

/** A half-built tower frame with a tower crane on top: concrete columns and
 *  slabs, then the crane mast, jib, counter-jib, cable and hook block. */
export function constructionSite({ h = 15, craneH = 27 } = {}) {
  const g = new THREE.Group(), b = new ModelBuilder();
  for (const sx of [-6, 0, 6]) for (const sz of [-6, 6]) b.add('col', box(0.7, h, 0.7, 0.08, 1), { p: [sx, h / 2, sz] });
  for (let lvl = 1; lvl <= 3; lvl++) b.add('slab', box(15, 0.5, 15, 0.08, 1), { p: [0, lvl * (h / 3), 0] });
  b.add('mast', box(0.9, craneH - h, 0.9, 0.08, 1), { p: [0, h + (craneH - h) / 2, 0] });
  b.add('jib', box(17, 0.7, 0.7, 0.08, 1), { p: [5.5, craneH, 0] });
  b.add('cjib', box(6, 0.7, 0.7, 0.08, 1), { p: [-4.5, craneH, 0] });
  b.add('weight', box(1.4, 2.2, 1.2, 0.08, 1), { p: [-7.2, craneH - 1.4, 0] });
  b.add('cable', box(0.09, 7, 0.09, 0.08, 1), { p: [12.5, craneH - 3.5, 0] });
  b.add('hook', box(1.1, 0.8, 1.1, 0.08, 1), { p: [12.5, craneH - 7.2, 0] });
  b.add('cab', box(1.6, 1.6, 1.6, 0.08, 1), { p: [1.2, craneH - 0.6, 0] });
  const frame = b.build({ col: MAT.concrete, slab: MAT.concrete, mast: paint(YELLOW, { rough: 0.5, metal: 0.3 }), jib: paint(YELLOW, { rough: 0.5, metal: 0.3 }), cjib: paint(YELLOW, { rough: 0.5, metal: 0.3 }), weight: MAT.dark, cable: MAT.dark, hook: MAT.dark, cab: paint(0x2b6cb0, { rough: 0.4 }) });
  g.add(frame);
  return g;
}

/** The Loop Station's glass canopy (#234 item 4): a transparent arc shell
 *  over the road between two cps, with opaque rib bands every ~12 m. Built
 *  in world space from the track frames, like boreTube. */
export function stationCanopy(track, from, to, glassMat, ribMat) {
  const { ds, px, py, pz, lx, ly, lz, ux, uy, uz, hwL, hwR } = track;
  const g = new THREE.Group();
  const r0 = track.indexAtCp(from), r1 = track.indexAtCp(to), STEP = 2, ARC = 10;
  const arcRow = (r, lift) => {
    const i = r % track.N, a = hwL[i] + 5.4, b = hwR[i] + 5.4, mid = (a - b) / 2, half = (a + b) / 2, H = 9.4;
    const pts = [];
    for (let k = 1; k < ARC; k++) {
      const ang = Math.PI * (k / ARC), lat = mid + Math.cos(ang) * half, up = Math.sin(ang) * H + lift;
      pts.push([px[i] + lx[i] * lat + ux[i] * up, py[i] + ly[i] * lat + uy[i] * up, pz[i] + lz[i] * lat + uz[i] * up]);
    }
    return pts;
  };
  const quadStrip = (rows) => {
    const pos = [], idx = [];
    rows.forEach(pts => pts.forEach(p => pos.push(...p)));
    const w = rows[0].length;
    for (let r = 0; r < rows.length - 1; r++) for (let k = 0; k < w - 1; k++) {
      const a0 = r * w + k, a1 = a0 + 1, b0 = a0 + w, b1 = b0 + 1;
      idx.push(a0, b0, a1, a1, b0, b1);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setIndex(idx);
    geo.computeVertexNormals();
    return geo;
  };
  const glassRows = [];
  for (let r = r0; r <= r1; r += STEP) glassRows.push(arcRow(r, 0));
  const glass = new THREE.Mesh(quadStrip(glassRows), glassMat);
  g.add(glass);
  for (let r = r0; r <= r1; r += Math.round(12 / ds / STEP) * STEP) {
    const rib = new THREE.Mesh(quadStrip([arcRow(r, 0.06), arcRow(Math.min(r + 1, r1), 0.06)]), ribMat);
    g.add(rib);
  }
  return g;
}

/** An enamel clock above the station entrance. The train keeps being delayed:
 * its minute hand continuously winds backward. */
export function stationClock() {
  const group = new THREE.Group(), b = new ModelBuilder();
  b.add('frame', cyl(2.72, 2.72, 0.54, 40), { r: [Math.PI / 2, 0, 0] });
  b.add('rim', torus(2.55, 0.13, 8, 40), { p: [0, 0, 0.32] });
  b.add('face', cyl(2.43, 2.43, 0.12, 40), { p: [0, 0, 0.28], r: [Math.PI / 2, 0, 0] });
  for (let k = 0; k < 12; k++) {
    const a = k * Math.PI / 6;
    b.add('mark', box(0.13, k % 3 === 0 ? 0.48 : 0.28, 0.06), { p: [2.08 * Math.sin(a), 2.08 * Math.cos(a), 0.39], r: [0, 0, -a] });
  }
  b.add('mark', box(0.21, 1.45, 0.08), { p: [-0.45, -0.46, 0.43], r: [0, 0, -0.75] });
  b.add('frame', box(0.3, 7, 0.3), { p: [0, -5.9, 0] });
  group.add(b.build({ frame: MAT.dark, rim: glow(0x5fdacf, 1.1), face: plastic(0xffefc3), mark: MAT.dark }));
  const hand = new THREE.Group(), needle = new THREE.Mesh(box(0.16, 1.93, 0.09), plastic(0xba3429));
  needle.position.set(0, 0.78, 0.49); hand.add(needle); group.add(hand); group.userData.hand = hand;
  return group;
}

/** A plain steel column post of a given height (station canopy supports). */
export function columnPost(h = 4) {
  const b = new ModelBuilder();
  b.add('post', box(0.55, h, 0.55, 0.08, 1), { p: [0, h / 2, 0] });
  b.add('base', box(1.3, 0.25, 1.3, 0.08, 1), { p: [0, 0.12, 0] });
  return b.build({ post: MAT.steel, base: MAT.dark });
}

/** One station platform segment: a low slab with a lit edge line. */
export function stationPlatform(len = 26) {
  const g = new THREE.Group(), b = new ModelBuilder();
  b.add('slab', box(len, 0.9, 2.4, 0.08, 1), { p: [0, 0.45, 0] });
  b.add('edge', box(len, 0.14, 0.3, 0.08, 1), { p: [0, 0.93, -1.0] });
  const m = b.build({ slab: MAT.concrete, edge: glow(0xffd23c, 1.6) });
  g.add(m);
  return g;
}

/** The SHORTCUT COMING SOON barrier (#234 item 6): two posts, a sign panel
 *  and a striped skirt, built on a pivot at its base so the final-lap
 *  breakthrough can tip it flat (userData.pivot). Faces +Z. */
export function shortcutBarrier(tex) {
  const grp = new THREE.Group();
  const pivot = new THREE.Group();
  grp.add(pivot);
  const b = new ModelBuilder();
  for (const s of [1, -1]) b.add('post', box(0.28, 2.3, 0.28, 0.08, 1), { p: [s * 2.5, 1.15, 0] });
  b.add('skirt', box(5.6, 0.55, 0.18, 0.08, 1), { p: [0, 0.32, 0.05] });
  const frame = b.build({ post: MAT.steel, skirt: paint(0xe8641e, { rough: 0.6 }) });
  pivot.add(frame);
  const panel = new THREE.Mesh(new THREE.BoxGeometry(5.6, 1.5, 0.14),
    [MAT.dark, MAT.dark, MAT.dark, MAT.dark, new THREE.MeshStandardMaterial({ map: tex, roughness: 0.55 }), MAT.dark]);
  panel.position.set(0, 1.62, 0.06);
  pivot.add(panel);
  grp.userData.pivot = pivot;
  return grp;
}

/** A robotaxi pod (#234 item 7): driverless, cream pod body, dark glass
 *  canopy, a spinning sensor puck on the roof, a teal eye-stripe for a face
 *  and a little roof sign. Invented brand only — the sign texture is passed
 *  in. Faces +Z. Used parked (scenery) and as the 'taxi' patrol obstacle. */
export function robotaxi(tex) {
  const grp = new THREE.Group(), b = new ModelBuilder();
  b.add('body', box(1.9, 0.85, 4.3, 0.16, 2), { p: [0, 0.62, 0] });
  b.add('stripe', box(1.94, 0.16, 4.34, 0.05, 1), { p: [0, 0.52, 0] });
  b.add('glass', box(1.66, 0.6, 2.5, 0.14, 2), { p: [0, 1.28, -0.2] });
  b.add('puck', cyl(0.34, 0.38, 0.22, 12), { p: [0, 1.68, -0.2] });
  b.add('eye', box(1.3, 0.13, 0.1, 0.04, 1), { p: [0, 0.78, 2.16] });
  b.add('tail', box(1.3, 0.1, 0.1, 0.04, 1), { p: [0, 0.82, -2.16] });
  for (const sx of [1, -1]) for (const sz of [1, -1]) b.add('wheel', cyl(0.34, 0.34, 0.24, 12), { p: [sx * 0.86, 0.34, sz * 1.42], r: [0, 0, Math.PI / 2] });
  const car = b.build({
    body: paint(0xf2f0e9, { rough: 0.32, metal: 0.05 }),
    stripe: paint(0x14b8a6, { rough: 0.4 }),
    glass: plastic(0x1d2733, 0.15),
    puck: MAT.dark,
    eye: glow(0x39e6c3, 2.4),
    tail: glow(0xff4040, 1.8),
    wheel: MAT.dark,
  });
  grp.add(car);
  if (tex) {
    const sign = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.42, 0.3),
      [MAT.dark, MAT.dark, MAT.dark, MAT.dark, new THREE.MeshStandardMaterial({ map: tex, roughness: 0.5, emissiveMap: tex, emissive: 0xffffff, emissiveIntensity: 0.55 }), MAT.dark]);
    sign.position.set(0, 1.62, 0.9);
    grp.add(sign);
    const sign2 = sign.clone();
    sign2.rotation.y = Math.PI;
    sign2.position.z = 0.9;
    grp.add(sign2);
  }
  return grp;
}

/** A sandstone pylon for a portal mouth, with a red band near the top. */
export function portalPylon({ h = 13 } = {}) {
  const b = new ModelBuilder();
  b.add('post', box(2.6, h, 2.6, 0.2, 2), { p: [0, h / 2, 0] });
  b.add('cap', box(3.3, 0.9, 3.3, 0.15, 1), { p: [0, h + 0.45, 0] });
  b.add('band', box(2.75, 1.1, 2.75, 0.05, 1), { p: [0, h - 2.4, 0] });
  return b.build({ post: plastic(SANDSTONE, 0.7), cap: plastic(0xbfb49a, 0.7), band: paint(0xe23b3b, { rough: 0.5 }) });
}

/** Panelled lining and moving rainbow bands follow the road frame. Both widen
 * around the paired routes and cutter in the dig hall. Two draws for the lap. */
export function boreTube(track, uTime, junction) {
  const { N, ds, px, py, pz, lx, ly, lz, ux, uy, uz, hwL, hwR } = track;
  const H = track.def.tunnelHeight ?? 7, ARC = 20, STEP = 2;
  const group = new THREE.Group();
  const covered = r => r >= 0 && r < N && (track.tunnel[r] || track.cp[r] >= junction.from && track.cp[r] <= junction.to);
  const fade = v => { const t = Math.min(1, Math.max(0, v)); return t * t * (3 - 2 * t); };
  // The two routes share a vaulted dig hall. Widen the roof smoothly around the
  // express lane, then open the opposite cheek around the thirteen-metre cutter.
  function profile(i) {
    const c = track.cp[i], hall = fade((c - 2.84) / 0.5) * fade((5.66 - c) / 0.65);
    const pocket = fade((c - 3.28) / 0.47) * fade((4.61 - c) / 0.48);
    return { a: hwL[i] + 0.7 + hall * 24, b: hwR[i] + 0.7 + pocket * 21, h: H + hall * 5.6 };
  }
  // ---- concrete (tube + portal faces share one geometry) ----
  const pos = [], nor = [], col = [], uv = [], idx = [];
  function arcVerts(r, sh) {
    const i = r % N, { a, b, h } = profile(i), mid = (a - b) / 2, half = (a + b) / 2;
    const first = pos.length / 3;
    for (let k = 0; k <= ARC; k++) {
      const ang = Math.PI * (k / ARC), ca = Math.cos(ang), sa = Math.sin(ang), lat = mid + ca * half, up = sa * h;
      pos.push(px[i] + lx[i] * lat + ux[i] * up, py[i] + ly[i] * lat + uy[i] * up, pz[i] + lz[i] * lat + uz[i] * up);
      nor.push(-(lx[i] * ca + ux[i] * sa), -(ly[i] * ca + uy[i] * sa), -(lz[i] * ca + uz[i] * sa));
      col.push(sh, sh, sh); uv.push(k / ARC * 4, r * ds / 9);
    }
    return first;
  }
  let prev = null;
  for (let r = 0; r <= N; r++) {
    const i = r % N;
    if (!covered(r)) { prev = null; continue; }
    const ring = arcVerts(r, (Math.floor(r / STEP / 4) % 2) ? 0.93 : 1.0);
    if (prev !== null) {
      for (let k = 0; k < ARC; k++) {
        const a0 = prev + k, a1 = a0 + 1, b0 = ring + k, b1 = b0 + 1;
        idx.push(a0, b0, a1, a1, b0, b1);
      }
    }
    prev = ring;
    // portal face where a covered run starts or ends (not near a window mouth)
    const isEnd = !covered(r + 1) || !covered(r - 1);
    if (isEnd) {
      const a = hwL[i] + 0.7, b = hwR[i] + 0.7, mid = (a - b) / 2, half = (a + b) / 2, c0 = pos.length / 3;
      for (let k = 0; k <= ARC; k++) {
        const ang = Math.PI * (k / ARC), ca = Math.cos(ang), sa = Math.sin(ang);
        for (const e of [0, 2.2]) {
          const lat = mid + ca * (half + e), up = sa * (H + e);
          pos.push(px[i] + lx[i] * lat + ux[i] * up, py[i] + ly[i] * lat + uy[i] * up, pz[i] + lz[i] * lat + uz[i] * up);
          nor.push(track.tx[i], 0, track.tz[i]);
          col.push(0.66, 0.66, 0.66); uv.push(k / ARC * 4, e / 9);
        }
        if (k) { const q = c0 + (k - 1) * 2; idx.push(q, q + 1, q + 2, q + 2, q + 1, q + 3); }
      }
    }
  }
  const cg = new THREE.BufferGeometry();
  cg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  cg.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  cg.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  cg.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  cg.setIndex(idx);
  const lining = canvasTex(384, 384, g => {
    g.fillStyle = '#82919f'; g.fillRect(0, 0, 384, 384);
    for (let j = 0; j < 3; j++) {
      const x = j % 2 ? 186 : 16, y = j * 128;
      g.fillStyle = '#464e58'; g.fillRect(0, y, 384, 4); g.fillRect(x, y, 4, 128);
      g.fillStyle = '#aab2b6'; g.fillRect(0, y + 5, 384, 2); g.fillRect(x + 5, y + 5, 2, 121);
      for (const dx of [-11, 15]) for (const dy of [16, 111]) {
        g.fillStyle = '#495560'; g.beginPath(); g.arc(x + dx, y + dy, 3.5, 0, Math.PI * 2); g.fill();
      }
    }
  });
  group.add(new THREE.Mesh(cg, new THREE.MeshStandardMaterial({ color: 0x91a4b7, map: lining, roughness: 0.96, metalness: 0.02, vertexColors: true, emissive: 0x14120e, side: THREE.DoubleSide })));

  // Narrow light bands repeat every six metres along the inside of the lining.
  const sp = [], sa = [], sidx = [];
  for (let r = 0; r < N; r += STEP) {
    const i = r % N;
    if (!covered(r) || !covered(r + 1) || (r / STEP) % 2 !== 0) continue;
    const rows = [];
    for (const rr of [r, r + 1]) {
      const j = rr % N, dims = profile(j), a = dims.a - 0.06, b = dims.b - 0.06, mid = (a - b) / 2, half = (a + b) / 2, h = dims.h - 0.06;
      const along = rr === r ? 0 : ds * 0.58;
      const first = sp.length / 3;
      for (let k = 0; k <= ARC; k++) {
        const ang = Math.PI * (k / ARC), lat = mid + Math.cos(ang) * half, up = Math.sin(ang) * h;
        sp.push(px[j] + lx[j] * lat + ux[j] * up - track.tx[j] * along, py[j] + ly[j] * lat + uy[j] * up, pz[j] + lz[j] * lat + uz[j] * up - track.tz[j] * along);
        sa.push(rr * ds);
      }
      rows.push(first);
    }
    const [A, B] = rows;
    for (let k = 0; k < ARC; k++) {
      const a0 = A + k, a1 = a0 + 1, b0 = B + k, b1 = b0 + 1;
      sidx.push(a0, a1, b0, a1, b1, b0);
    }
  }
  const sg = new THREE.BufferGeometry();
  sg.setAttribute('position', new THREE.Float32BufferAttribute(sp, 3));
  sg.setAttribute('aS', new THREE.Float32BufferAttribute(sa, 1));
  sg.setIndex(sidx);
  group.add(new THREE.Mesh(sg, new THREE.ShaderMaterial({
    uniforms: { uTime },
    vertexShader: /* glsl */`
      attribute float aS; varying float vS;
      void main() { vS = aS; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: /* glsl */`
      uniform float uTime; varying float vS;
      vec3 hsl2rgb(vec3 c) {
        vec3 rgb = clamp(abs(mod(c.x * 6.0 + vec3(0.0, 4.0, 2.0), 6.0) - 3.0) - 1.0, 0.0, 1.0);
        return c.z + c.y * (rgb - 0.5) * (1.0 - abs(2.0 * c.z - 1.0));
      }
      void main() {
        vec3 c = hsl2rgb(vec3(fract(vS / 120.0 - uTime * 0.25), 0.9, 0.55));
        gl_FragColor = vec4(c * 0.95 + 0.04, 1.0);
      }`,
    side: THREE.DoubleSide,
  })));
  return group;
}

/**
 * The dig gantry: a conveyor bridge straddling the road at the Boring
 * Machine, two legs outside the road edges, a truss beam at 8 m, a muck
 * tub hanging from it, and a big sign panel facing the karts (-Z is the
 * driving direction it reads against: the panel faces +Z, so place it
 * with the road's yaw and drivers approaching from -Z see the sign).
 * span = distance between leg centres; the panel is span-3 wide.
 */
export function digGantry(tex, { span = 23, beamY = 8.0 } = {}) {
  const grp = new THREE.Group(), b = new ModelBuilder();
  for (const s of [-1, 1]) {
    b.add('leg', box(1.1, beamY, 1.1, 0.12, 2), { p: [s * span / 2, beamY / 2, 0] });
    b.add('foot', box(2.2, 0.7, 2.2, 0.1, 1), { p: [s * span / 2, 0.35, 0] });
    b.add('brace', box(0.28, beamY * 0.72, 0.28, 0.05, 1), { p: [s * span / 4, beamY * 0.42, 0], r: [0, 0, s * 0.62] });
  }
  b.add('beam', box(span + 1.6, 1.15, 1.3, 0.12, 2), { p: [0, beamY + 0.55, 0] });
  b.add('beam', box(span + 1.6, 0.5, 0.9, 0.08, 1), { p: [0, beamY - 0.35, 0] });
  b.add('tub', box(2.6, 1.5, 1.8, 0.1, 1), { p: [4.6, beamY - 1.55, 0] });
  b.add('cable', cyl(0.05, 0.05, 0.85, 6), { p: [4.6, beamY - 0.45, 0] });
  b.add('lamp', box(0.5, 0.3, 0.14, 0.04, 1), { p: [-span / 4, beamY - 0.85, 0.72] });
  b.add('lamp', box(0.5, 0.3, 0.14, 0.04, 1), { p: [span / 4, beamY - 0.85, 0.72] });
  grp.add(b.build({
    leg: paint(YELLOW, { rough: 0.45, metal: 0.25 }),
    foot: MAT.dark,
    brace: MAT.dark,
    beam: paint(YELLOW, { rough: 0.45, metal: 0.25 }),
    tub: MAT.steel,
    cable: MAT.dark,
    lamp: glow(0xffe9b0, 3),
  }));
  if (tex) {
    const w = span - 4, h = 2.5;
    const panel = new THREE.Mesh(
      new THREE.BoxGeometry(w, h, 0.22),
      new THREE.MeshStandardMaterial({ map: tex, emissiveMap: tex, emissive: 0xffffff, emissiveIntensity: 0.55, roughness: 0.55 }),
    );
    panel.position.set(0, beamY - 1.85, 0.95);
    grp.add(panel);
    const back = new THREE.Mesh(new THREE.BoxGeometry(w + 0.3, h + 0.3, 0.1),
      new THREE.MeshStandardMaterial({ color: 0x2a2d33, roughness: 0.8 }));
    back.position.set(0, beamY - 1.85, 0.79);
    grp.add(back);
  }
  return grp;
}
