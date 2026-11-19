/* Props for Boring Tunnel GP: the Boring Machine chewing the wall at the
   bottom of the dive, the loop-the-loop ring straddling the climb, ceiling
   fans, tripod work lights, wall signs, portal pylons, and a spare cutter
   head for the dig site outside. Each builder returns a THREE.Group on
   y = 0, facing +Z. Textures are only created inside the functions that
   receive them, so this module imports cleanly in Node. */
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { canvasTex } from '../render/textures.js';
import { ModelBuilder, box, sphere, cyl, torus, tube, plastic, paint, glow, MAT } from './build.js';

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
export function boreTube(track, uTime, junction, bays = []) {
  const { N, ds, px, py, pz, lx, ly, lz, ux, uy, uz, hwL, hwR } = track;
  const H = track.def.tunnelHeight ?? 7, ARC = 20, STEP = 2;
  const group = new THREE.Group();
  const covered = r => r >= 0 && r < N && (track.tunnel[r] || track.cp[r] >= junction.from && track.cp[r] <= junction.to);
  const fade = v => { const t = Math.min(1, Math.max(0, v)); return t * t * (3 - 2 * t); };
  // Exhibit bays: the lining bulges out (and up) on one side behind the wall,
  // over `len` metres. The mouth the karts approach opens over a long `rampIn`
  // (so the near wall never cuts across the exhibit), the far one over `ramp`.
  // Their floor stays level with the road edge, so a bay never tilts with the bank.
  const bayAt = bays.map(bay => ({ ramp: 7, rampIn: 20, rise: 3, ...bay, s: track.sAtCp(bay.at) }));
  const bayWeights = i => {
    let l = 0, r = 0, up = 0;
    for (const bay of bayAt) {
      let d = i * ds - bay.s; d -= Math.round(d / track.length) * track.length;
      const ramp = d < 0 ? bay.rampIn : bay.ramp, w = fade((bay.len / 2 + ramp - Math.abs(d)) / ramp);
      if (!w) continue;
      if (bay.side > 0) l = Math.max(l, w * bay.depth); else r = Math.max(r, w * bay.depth);
      up = Math.max(up, w * bay.rise);
    }
    return { l, r, up };
  };
  // The two routes share a vaulted dig hall. Widen the roof smoothly around the
  // express lane, then open the opposite cheek around the thirteen-metre cutter.
  function profile(i) {
    const c = track.cp[i], hall = fade((c - 2.84) / 0.5) * fade((5.66 - c) / 0.65);
    const pocket = fade((c - 3.28) / 0.47) * fade((4.61 - c) / 0.48);
    const bay = bayWeights(i);
    return { a: hwL[i] + 0.7 + hall * 24 + bay.l, b: hwR[i] + 0.7 + pocket * 21 + bay.r, h: H + hall * 5.6 + bay.up, bay };
  }
  // ---- concrete (tube + portal faces share one geometry) ----
  const pos = [], nor = [], col = [], uv = [], idx = [];
  function arcVerts(r, sh) {
    const i = r % N, { a, b, h, bay } = profile(i), mid = (a - b) / 2, half = (a + b) / 2;
    const first = pos.length / 3;
    for (let k = 0; k <= ARC; k++) {
      const ang = Math.PI * (k / ARC), ca = Math.cos(ang), sa = Math.sin(ang), lat = mid + ca * half, up = sa * h;
      // inside a bay the bank stops at the road edge: the bay's walls stand on its level floor
      const latY = bay.l && lat > hwL[i] ? hwL[i] : bay.r && lat < -hwR[i] ? -hwR[i] : lat;
      pos.push(px[i] + lx[i] * lat + ux[i] * up, py[i] + ly[i] * latY + uy[i] * up, pz[i] + lz[i] * lat + uz[i] * up);
      nor.push(-(lx[i] * ca + ux[i] * sa), -(ly[i] * ca + uy[i] * sa), -(lz[i] * ca + uz[i] * sa));
      col.push(sh, sh, sh); uv.push(k / ARC * 4, r * ds / 9);
    }
    return first;
  }
  // a bay's floor: level with the road edge, from under the wall to the lining
  let floorPrev = null;
  function floorVerts(r) {
    const i = r % N, { a, b, bay } = profile(i);
    if (!bay.l && !bay.r) { floorPrev = null; return; }
    const side = bay.l ? 1 : -1, edge = side > 0 ? hwL[i] : hwR[i], far = side > 0 ? a : b;
    const y = py[i] + ly[i] * side * edge - 0.02, first = pos.length / 3;
    for (const lat of [side * (edge - 0.2), side * (far + 0.3)]) {
      pos.push(px[i] + lx[i] * lat, y, pz[i] + lz[i] * lat);
      nor.push(0, 1, 0); col.push(0.6, 0.6, 0.6); uv.push(lat / 9, r * ds / 9);
    }
    if (floorPrev !== null) idx.push(floorPrev, first, floorPrev + 1, floorPrev + 1, first, first + 1);
    floorPrev = first;
  }
  let prev = null;
  for (let r = 0; r <= N; r++) {
    const i = r % N;
    if (!covered(r)) { prev = null; floorPrev = null; continue; }
    if (bayAt.length) floorVerts(r);
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

/** A safety inspector with a very literal stopwatch job. The shell spiral
 * faces the racing line and the neck and eyes lean toward the broken prototype. */
export function paceSnail() {
  const group = new THREE.Group(),
    b = new ModelBuilder(),
    eyes = new ModelBuilder();
  const mint = paint(0x69e8aa),
    shell = paint(0xf1763e),
    cream = plastic(0xffefa2),
    brim = paint(0xffbe16);
  b.add('foot', sphere(1), { p: [0, 0.48, -0.12], s: [2.85, 0.45, 0.98] });
  b.add('skin', sphere(1), { p: [0.45, 0.82, 0], s: [2.5, 0.6, 0.85] });
  b.add('skin', sphere(1), { p: [1.9, 1.52, 0.08], s: [0.77, 1.02, 0.73], r: [0, 0, -0.35] });
  b.add('skin', sphere(1), { p: [2.19, 2.02, 0.27], s: [0.88, 0.7, 0.81] });
  b.add('shell', sphere(1, 30, 18), { p: [-0.57, 2, 0.03], s: [1.87, 1.85, 1.12] });
  const spiral = [];
  for (let i = 0; i <= 72; i++) {
    const t = i / 72,
      angle = 0.9 + t * Math.PI * 3.8,
      r = 0.13 + t * 1.6;
    spiral.push([-0.57 + r * Math.cos(angle), 2 + r * Math.sin(angle), 0.04 + 1.12 * Math.sqrt(1 - (r / 1.89) ** 2)]);
  }
  b.add('stripe', tube(spiral, 0.115, 72, 8));
  // The shell doubles as a bolted motor housing; a pair of tiny bogies run under the foot.
  for (const x of [-1.75, 0.23]) {
    b.add('smile', cyl(0.36, 0.36, 0.17, 14), { p: [x, 0.33, 0.71], r: [Math.PI / 2, 0, 0] });
    b.add('stripe', cyl(0.12, 0.12, 0.19, 8), { p: [x, 0.33, 0.74], r: [Math.PI / 2, 0, 0] });
  }
  b.add('helmet', sphere(1, 22, 12), { p: [2.07, 2.62, 0.17], s: [0.87, 0.53, 0.78] });
  b.add('brim', cyl(1, 1, 0.14, 24), { p: [2.12, 2.56, 0.18], s: [1.1, 1, 0.89] });
  b.add('lamp', box(0.33, 0.28, 0.15, 0.05, 1), { p: [2.02, 2.83, 0.92] });
  b.add(
    'smile',
    tube(
      [
        [2.35, 1.9, 0.97],
        [2.53, 1.85, 0.93],
        [2.67, 1.93, 0.88]
      ],
      0.05,
      8,
      5
    )
  );
  for (const [x, z, h] of [
    [2.37, 0.64, 3.52],
    [2.84, -0.05, 3.24]
  ]) {
    eyes.add(
      'skin',
      tube(
        [
          [x - 0.13, 2.1, z],
          [x - 0.02, 2.73, z + 0.03],
          [x + 0.16, h - 0.16, z + 0.11]
        ],
        0.116,
        11,
        8
      )
    );
    eyes.add('white', sphere(0.34, 16, 10), { p: [x + 0.16, h, z + 0.11] });
    eyes.add('pupil', sphere(0.17, 12, 8), { p: [x + 0.24, h - 0.015, z + 0.39] });
    eyes.add('white', sphere(0.051, 8, 6), { p: [x + 0.27, h + 0.064, z + 0.52] });
  }
  group.add(
    b.build({ foot: plastic(0x289676), skin: mint, shell, stripe: cream, helmet: brim, brim, smile: MAT.dark, lamp: glow(0xffefb8, 1.2) })
  );
  const stalks = eyes.build({ skin: mint, white: plastic(0xffffee), pupil: MAT.dark });
  group.add(stalks);
  group.userData.stalks = stalks;
  return group;
}

/** A cream prototype on axle stands, with its bonnet propped up. */
export function stalledPrototype() {
  const b = new ModelBuilder();
  b.add('body', box(4.65, 1.02, 1.95, 0.3, 2), { p: [0, 0.96, 0] });
  b.add('glass', box(2.3, 0.9, 1.75, 0.24, 2), { p: [-0.4, 1.74, 0] });
  b.add('body', box(1.65, 0.12, 1.9, 0.08, 1), { p: [1.65, 1.98, 0], r: [0, 0, -0.89] });
  for (const x of [-1.5, 1.5])
    for (const z of [-0.91, 0.91]) {
      b.add('tire', cyl(0.44, 0.44, 0.22, 14), { p: [x, 0.57, z], r: [Math.PI / 2, 0, 0] });
      b.add('jack', cyl(0.1, 0.33, 0.44, 4), { p: [x, 0.22, z * 0.72], r: [0, Math.PI / 4, 0] });
    }
  b.add('lamp', box(0.12, 0.2, 1.6, 0.04, 1), { p: [2.34, 1.04, 0] });
  return b.build({ body: paint(0xeae7d2), glass: plastic(0x234754), tire: MAT.dark, jack: paint(0xfa5727), lamp: glow(0xffc155, 1.5) });
}

/** Single open-sided carriage with exactly four seats, facing local +X. */
export function fourSeatShuttle() {
  const b = new ModelBuilder();
  b.add('body', box(6.0, 0.74, 2.65, 0.28, 2), { p: [0, 0.87, 0] });
  b.add('roof', box(5.6, 0.24, 2.67, 0.1, 2), { p: [-0.1, 3, 0] });
  for (const x of [-2.1, 2.0])
    for (const z of [-1.06, 1.06]) {
      b.add('frame', cyl(0.07, 0.07, 1.9, 8), { p: [x, 2.03, z] });
      b.add('tire', cyl(0.47, 0.47, 0.23, 14), { p: [x, 0.5, z * 1.18], r: [Math.PI / 2, 0, 0] });
    }
  for (const x of [-1.22, 1.02])
    for (const z of [-0.59, 0.59]) {
      b.add('seat', box(0.84, 0.22, 0.83, 0.1, 2), { p: [x, 1.38, z] });
      b.add('seat', box(0.21, 0.89, 0.85, 0.1, 2), { p: [x - 0.37, 1.82, z], r: [0, 0, 0.1] });
    }
  b.add('nose', box(0.95, 0.43, 2.48, 0.17, 2), { p: [2.59, 1.34, 0] });
  b.add('lamp', box(0.12, 0.19, 1.9, 0.04, 1), { p: [3.0, 1.04, 0] });
  return b.build({
    body: paint(0xf1e5b7),
    roof: paint(0x1e998e),
    nose: paint(0x1f8f8d),
    frame: MAT.steel,
    tire: MAT.dark,
    seat: paint(0xdc7146),
    lamp: glow(0x91fff2, 1.4)
  });
}

/** A thick, illuminated left arrow fixed above the boarding bay. */
export function boardingArrow() {
  const b = new ModelBuilder();
  b.add('shaft', box(3.9, 0.59, 0.27, 0.09, 1), { p: [0.45, 0, 0] });
  for (const tilt of [-1, 1]) {
    b.add('shaft', box(2.4, 0.62, 0.27, 0.08, 1), { p: [-1.13, tilt * 0.62, 0], r: [0, 0, tilt * 0.64] });
  }
  b.add('bracket', box(0.16, 2.4, 0.18), { p: [0.95, 1.15, -0.18] });
  return b.build({ shaft: glow(0xffc024, 1.35), bracket: MAT.steel });
}

/** A queue the size of the train the passengers expected. All three runs and
 * their turns share meshes; turned shoulders and luggage distinguish the line. */
export function boardingQueue() {
  const b = new ModelBuilder();
  b.add('deck', box(14, 0.69, 4.45, 0.08, 1), { p: [0, 0.0, 0] });
  for (let run = 0; run < 3; run++) {
    const z = (run - 1) * 1.36;
    for (let i = 0; i < 8; i++) {
      const x = -5.95 + i * 1.68,
        yaw = (run % 2 ? -0.9 : 0.94) + (i % 3) * 0.23;
      const height = 0.89 + (i % 4) * 0.055,
        coat = ['coral', 'blue', 'green', 'sand'][(i + run) % 4],
        skin = i % 3 ? 'skin' : 'umber';
      b.add(coat, box(0.56, 0.67 * height, 0.39, 0.14, 2), { p: [x, 1.33 * height, z], r: [0, yaw, 0] });
      b.add(skin, sphere(0.235, 10, 8), { p: [x, 1.89 * height, z] });
      for (const hand of [-1, 1]) {
        b.add(coat, box(0.17, 0.42, 0.18, 0.07, 1), { p: [x + hand * 0.30, 1.27 * height, z + 0.01], r: [0.18, 0, hand * 0.13] });
        b.add(skin, sphere(0.095, 8, 6), { p: [x + hand * 0.31, 1.05 * height, z + 0.04] });
      }
      b.add('hair', sphere(0.242, 10, 8), { p: [x, 2.01 * height, z - 0.015], s: [1, 0.55, 0.99] });
      for (const offset of [-0.12, 0.12]) b.add('trousers', box(0.18, 0.64, 0.19, 0.04, 1), { p: [x + offset, 0.7, z] });
      if (i % 3 === 0) b.add('case', box(0.46, 0.58, 0.32, 0.055, 1), { p: [x + 0.43, 0.65, z] });
    }
    for (const end of [-6.4, 0, 6.4]) b.add('rail', cyl(0.045, 0.062, 0.94, 7), { p: [end, 0.82, z + 0.55] });
    b.add('belt', box(12.8, 0.12, 0.08), { p: [0, 1.22, z + 0.55] });
    if (run < 2) b.add('belt', box(0.08, 0.12, 1.36), { p: [run ? -6.4 : 6.4, 1.22, z + 1.23] });
  }
  return b.build({
    deck: MAT.concrete,
    rail: MAT.steel,
    belt: paint(0xf2af45),
    skin: plastic(0xe6ad7c),
    umber: plastic(0x8f624d),
    hair: MAT.dark,
    trousers: plastic(0x354859),
    case: paint(0xa45d3b),
    coral: paint(0xe07463),
    blue: paint(0x65bfd7),
    green: paint(0x75b995),
    sand: paint(0xf3c577)
  });
}

/** A literal flat-pack house: individual courses of bricks, plus a mould,
 * and a finished sample on the display tray. */
export function brickShowroom() {
  const b = new ModelBuilder();
  b.add('base', box(8.5, 1.5, 4.5, 0.12, 1), { p: [0, 0.75, 0] });
  b.add('trim', box(8.65, 0.13, 4.62, 0.06, 1), { p: [0, 1.52, 0] });
  for (let layer = 0; layer < 6; layer++) {
    const count = 6 - layer;
    for (let x = 0; x < count; x++)
      for (let z = 0; z < Math.min(count, 4); z++) {
        b.add(['clay', 'rust', 'salmon'][(x + 2 * z + layer) % 3], box(0.9, 0.53, 0.72, 0.035, 1), {
          p: [-0.7 + (x - (count - 1) / 2) * 0.96, 1.88 + layer * 0.57, (z - (Math.min(count, 4) - 1) / 2) * 0.78]
        });
      }
  }
  b.add('trim', box(1.8, 0.11, 1.3), { p: [2.9, 1.68, 0.5] });
  for (const z of [-0.04, 0.99]) b.add('steel', box(1.6, 0.27, 0.09), { p: [2.9, 1.88, z] });
  for (const x of [2.14, 3.66]) b.add('steel', box(0.1, 0.27, 0.98), { p: [x, 1.88, 0.48] });
  b.add('clay', box(0.81, 0.49, 0.66, 0.04, 1), { p: [2.89, 1.84, -0.81], r: [0, 0.22, 0] });
  return b.build({
    base: plastic(0x29353b),
    trim: paint(0xf6ae44),
    steel: MAT.steel,
    clay: paint(0xc77f51),
    rust: paint(0xad5838),
    salmon: paint(0xdb9662)
  });
}

/** Flag judge on the inside platform, facing the timing lane across the road. */
export function trialOfficial() {
  const b = new ModelBuilder();
  b.add('base', box(1.9, 0.6, 1.6, 0.1, 1), { p: [0, 0.3, 0] });
  for (const side of [-1, 1]) b.add('uniform', box(0.26, 0.81, 0.32, 0.07, 1), { p: [side * 0.2, 1.01, 0] });
  b.add('vest', box(0.82, 0.89, 0.54, 0.14, 2), { p: [0, 1.80, 0] });
  for (const y of [1.58, 1.82]) b.add('light', box(0.82, 0.09, 0.55, 0.04, 1), { p: [0, y, 0] });
  b.add('skin', sphere(0.33, 15, 10), { p: [0, 2.50, 0.03] });
  b.add('vest', sphere(0.35, 15, 10), { p: [0, 2.67, 0.01], s: [1.1, 0.64, 1.08] });
  b.add('skin', tube([[0.32, 1.99, 0], [0.62, 2.12, 0.08], [0.65, 2.46, 0.17]], 0.13, 10, 6));
  b.add('uniform', cyl(0.047, 0.047, 2.38, 7), { p: [0.61, 3.36, 0.18], r: [0, 0, 0.16] });
  for (let row = 0; row < 3; row++) for (let col = 0; col < 5; col++) {
    b.add((row + col) % 2 ? 'uniform' : 'light', box(0.30, 0.28, 0.05, 0, 1),
      { p: [0.35 - col * 0.296, 4.43 - row * 0.275 + 0.07 * Math.sin(col), 0.18 + 0.055 * Math.sin(col)] });
  }
  return b.build({ base: MAT.concrete, uniform: MAT.dark, vest: paint(0xff812b), light: plastic(0xfff4ca), skin: plastic(0xcb946e) });
}

export function timingLane() {
  const b = new ModelBuilder();
  b.add('lane', box(16.5, 0.25, 3.3, 0.1, 1), { p: [0, 0.12, 0] });
  for (const side of [-1, 1]) b.add('stripe', box(16.4, 0.04, 0.09), { p: [0, 0.26, side * 1.51] });
  for (let i = 0; i < 8; i++)
    for (let j = 0; j < 2; j++) {
      b.add((i + j) % 2 ? 'dark' : 'stripe', box(0.44, 0.04, 0.39), { p: [0.94 + j * 0.44, 0.27, (i - 3.5) * 0.39] });
    }
  return b.build({ lane: plastic(0x386172), stripe: plastic(0xffefcd), dark: MAT.dark });
}

/* ---- #401: the five exhibit gags in the bays off the bore ----
   Each one is built with a ToyBuilder: every part carries its own colour as a
   vertex colour, so a whole exhibit bakes into one painted mesh, one metal
   mesh, and one lit mesh (plus its sign, and any part that moves). */
const _gm = new THREE.Matrix4(), _gq = new THREE.Quaternion(), _ge = new THREE.Euler(), _gs = new THREE.Vector3(), _gp = new THREE.Vector3(), _gc = new THREE.Color();
let toyMats = null;
const toyMaterials = () => toyMats ||= {
  body: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.55, metalness: 0.05 }),
  shiny: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.24, metalness: 0.6 }),
  lit: new THREE.MeshBasicMaterial({ vertexColors: true, toneMapped: false }),
};
class ToyBuilder {
  constructor() { this.parts = { body: [], shiny: [], lit: [] }; this.base = null; }
  /** Later parts are placed in this frame (a sub-assembly's position, turn, and scale); call with no args to clear. */
  frame(p, ry = 0, s = 1) {
    this.base = p ? new THREE.Matrix4().compose(new THREE.Vector3(...p), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, ry, 0)), new THREE.Vector3(s, s, s)) : null;
    return this;
  }
  add(color, geo, { p = [0, 0, 0], r = [0, 0, 0], s = 1 } = {}, kind = 'body') {
    const g = geo.index ? geo.toNonIndexed() : geo.clone();
    geo.dispose();
    _ge.set(r[0], r[1], r[2]); _gq.setFromEuler(_ge);
    if (typeof s === 'number') _gs.set(s, s, s); else _gs.set(s[0], s[1], s[2]);
    g.applyMatrix4(_gm.compose(_gp.set(p[0], p[1], p[2]), _gq, _gs));
    if (this.base) g.applyMatrix4(this.base);
    for (const name of Object.keys(g.attributes)) if (name !== 'position' && name !== 'normal') g.deleteAttribute(name);
    if (!g.attributes.normal) g.computeVertexNormals();
    const rgb = new Float32Array(g.attributes.position.count * 3);
    _gc.setHex(color);
    for (let i = 0; i < rgb.length; i += 3) _gc.toArray(rgb, i);
    g.setAttribute('color', new THREE.BufferAttribute(rgb, 3));
    this.parts[kind].push(g);
    return this;
  }
  shiny(color, geo, opts) { return this.add(color, geo, opts, 'shiny'); }
  lit(color, geo, opts) { return this.add(color, geo, opts, 'lit'); }
  build() {
    const group = new THREE.Group(), mats = toyMaterials();
    for (const [kind, list] of Object.entries(this.parts)) {
      if (!list.length) continue;
      const geo = mergeGeometries(list, false);
      for (const g of list) g.dispose();
      geo.computeBoundingSphere();
      const mesh = new THREE.Mesh(geo, mats[kind]); mesh.name = kind;
      group.add(mesh);
    }
    this.parts = { body: [], shiny: [], lit: [] };
    return group;
  }
}

/** A lit sign face (the gag's copy) in a dark frame, centred at p, facing +Z. */
function gagSign(tb, tex, w, h, p, frame = 0x1b1e27) {
  tb.add(frame, box(w + 0.5, h + 0.5, 0.3, 0.12, 2), { p: [p[0], p[1], p[2] - 0.17] });
  const face = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: tex }));
  face.position.set(p[0], p[1], p[2]);
  return face;
}

/** A thin straight bar from a to b (a crack line, a rope), as a box. */
function bar(a, b, t) {
  const dx = b[0] - a[0], dy = b[1] - a[1], dz = b[2] - a[2], len = Math.hypot(dx, dy, dz);
  const g = new THREE.BoxGeometry(t, len, t);
  g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(dx / len, dy / len, dz / len)));
  g.translate((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2);
  return g;
}

/** A cartoon monkey on a stool, sipping a smoothie, both hands on the cup.
 *  Origin at the stool's foot, facing +Z. About 4.8 m tall at s = 1. */
function monkey(tb) {
  const fur = 0x8a5634, skin = 0xf3caa0, dark = 0x1d1b22;
  for (const [x, z] of [[-0.5, -0.5], [0.5, -0.5], [-0.5, 0.5], [0.5, 0.5]]) tb.add(dark, cyl(0.07, 0.09, 1.6, 8), { p: [x * 0.9, 0.8, z * 0.9], r: [z * 0.12, 0, -x * 0.12] });
  tb.add(0xe2453c, cyl(0.78, 0.78, 0.22, 20), { p: [0, 1.65, 0] });
  tb.add(fur, sphere(1, 18, 14), { p: [0, 2.45, -0.05], s: [0.86, 0.95, 0.74] });
  tb.add(skin, sphere(1, 16, 12), { p: [0, 2.35, 0.36], s: [0.58, 0.68, 0.42] });
  for (const sx of [-1, 1]) {
    tb.add(fur, tube([[sx * 0.38, 1.9, 0.25], [sx * 0.44, 1.82, 0.95], [sx * 0.46, 1.05, 1.02]], 0.22, 10, 8));
    tb.add(skin, sphere(1, 12, 8), { p: [sx * 0.46, 0.92, 1.14], s: [0.24, 0.16, 0.34] });
    tb.add(fur, tube([[sx * 0.72, 2.95, 0.05], [sx * 0.86, 2.42, 0.62], [sx * 0.3, 2.62, 1.12]], 0.19, 10, 8));
    tb.add(skin, sphere(0.2, 12, 8), { p: [sx * 0.24, 2.66, 1.18] });
    tb.add(fur, sphere(0.36, 14, 10), { p: [sx * 1.0, 3.95, -0.05] });
    tb.add(skin, sphere(0.23, 12, 8), { p: [sx * 1.04, 3.95, 0.12] });
    tb.add(0xffffff, sphere(0.22, 14, 10), { p: [sx * 0.29, 4.05, 0.74] });
    tb.add(dark, sphere(0.11, 10, 8), { p: [sx * 0.25, 4.06, 0.94] });
  }
  tb.add(fur, sphere(0.98, 22, 16), { p: [0, 3.85, 0] });
  tb.add(skin, sphere(1, 18, 12), { p: [0, 3.68, 0.6], s: [0.78, 0.62, 0.46] });
  tb.add(dark, sphere(1, 10, 8), { p: [0, 3.5, 1.02], s: [0.15, 0.08, 0.06] });
  tb.add(fur, tube([[0, 1.95, -0.62], [0.2, 1.75, -1.25], [0.62, 2.35, -1.45], [0.5, 2.9, -1.15], [0.2, 2.75, -1.0]], 0.11, 18, 6));
  // the smoothie: a pink cup with a white dome lid and a striped straw into the mouth
  tb.add(0xff6fae, cyl(0.36, 0.27, 0.85, 16), { p: [0, 2.68, 1.2] });
  tb.add(0xfff6fb, sphere(0.36, 14, 8), { p: [0, 3.1, 1.2], s: [1, 0.4, 1] });
  tb.add(0x3fd8ff, tube([[0.06, 3.0, 1.22], [0.05, 3.32, 1.16], [0.02, 3.5, 1.05]], 0.05, 8, 6));
  // the implant: a lit node on the crown, sending wireless arcs toward the screen (+X)
  tb.lit(0x5ff7ff, cyl(0.2, 0.2, 0.1, 14), { p: [0.32, 4.78, 0.1], r: [0, 0, -0.32] });
  for (const [k, R] of [[0, 0.55], [1, 0.95], [2, 1.35]]) tb.lit(0x5ff7ff, torus(R, 0.06 + k * 0.01, 4, 18, 1.2), { p: [0.42, 4.85, 0.1], r: [0, 0, -0.6] });
}

/** MINDPONG: a giant arcade screen playing Pong by itself, a monkey on a stool
 *  beside it with a smoothie, and no controller anywhere. Origin on the floor,
 *  facing +Z, the monkey on the right; the screen is about 8 m wide.
 *  userData.tick(dt) runs the game. */
export function mindPong(signTex) {
  const group = new THREE.Group(), tb = new ToyBuilder();
  const navy = 0x232a63, ink = 0x0b0d16, pink = 0xff3fa4, cyan = 0x37e6ff;
  // a low black stage with a lit edge
  tb.add(0x2a2d36, box(16, 0.3, 7.2, 0.1, 1), { p: [-1.2, 0.15, 0.4] });
  tb.lit(cyan, box(16.05, 0.08, 0.08), { p: [-1.2, 0.26, 4.02] });
  // the cabinet: plinth, screen housing, bezel, marquee box, neon edges
  tb.add(navy, box(9.4, 0.5, 2.4, 0.15, 2), { p: [1.4, 0.45, -0.6] });
  tb.add(navy, box(9.4, 5.0, 1.6, 0.2, 2), { p: [1.4, 2.75, -1.0] });
  tb.add(ink, box(8.5, 4.3, 0.3, 0.12, 2), { p: [1.4, 2.75, -0.15] });
  for (const sx of [-1, 1]) {
    tb.lit(pink, box(0.14, 5.0, 0.14), { p: [1.4 + sx * 4.72, 2.75, -0.18] });
    tb.add(navy, box(0.5, 7.4, 1.8, 0.12, 2), { p: [1.4 + sx * 4.85, 3.1, -1.0] });
  }
  tb.lit(pink, box(9.6, 0.14, 0.14), { p: [1.4, 0.32, -0.18] });
  tb.lit(0xffd23c, box(0.9, 0.18, 0.06), { p: [1.4, 0.45, 0.62] });   // the coin slot, glowing; there is no joystick
  const sign = gagSign(tb, signTex, 9.8, 2.9, [1.4, 6.4, 0.05], ink);
  tb.frame([-5.0, 0.3, 1.0], 0.42, 1.12);
  monkey(tb);
  tb.frame();
  // built screen-right, shown mirrored: the screen goes on the side away from
  // the road (the lettering is flipped back), the monkey on the near side
  const inner = new THREE.Group(); inner.scale.x = -1; sign.scale.x = -1;
  inner.add(tb.build(), sign); group.add(inner);
  // the game itself: a canvas screen redrawn every frame
  const W = 192, H = 108, canvas = document.createElement('canvas'); canvas.width = W; canvas.height = H;
  const g = canvas.getContext('2d'), tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace; tex.minFilter = THREE.LinearFilter; tex.generateMipmaps = false;
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(7.9, 3.95), new THREE.MeshBasicMaterial({ map: tex, toneMapped: false }));
  screen.position.set(1.4, 2.75, 0.02);
  inner.add(screen);
  const st = { x: W / 2, y: H / 2, vx: 118, vy: 64, l: H / 2, r: H / 2, k: 0 };
  group.userData.tick = (dt) => {
    st.x += st.vx * dt; st.y += st.vy * dt;
    if (st.y < 6 || st.y > H - 6) { st.vy = -st.vy; st.y = Math.max(6, Math.min(H - 6, st.y)); }
    if (st.x < 19 || st.x > W - 19) { st.vx = -st.vx; st.x = Math.max(19, Math.min(W - 19, st.x)); st.vy = 40 + (st.k++ * 23) % 50; if (st.k % 2) st.vy = -st.vy; }
    // both paddles play perfectly, the receiving one a touch late
    st.l += (st.y - st.l) * Math.min(1, dt * (st.vx < 0 ? 9 : 2));
    st.r += (st.y - st.r) * Math.min(1, dt * (st.vx > 0 ? 9 : 2));
    g.fillStyle = '#05070d'; g.fillRect(0, 0, W, H);
    g.fillStyle = '#7f8db0'; for (let y = 4; y < H; y += 12) g.fillRect(W / 2 - 1.5, y, 3, 6);
    g.fillStyle = '#f4fbff';
    g.fillRect(8, st.l - 13, 7, 26); g.fillRect(W - 15, st.r - 13, 7, 26);
    g.fillRect(st.x - 4, st.y - 4, 8, 8);
    tex.needsUpdate = true;
  };
  group.userData.tick(0);
  return group;
}

/** BRAIN CHIP INSTALL: a quick-lube service bay with a dentist's chair, a
 *  robot arm holding a glowing chip over the headrest, and a pink brain on the
 *  roof. Origin on the floor, facing +Z. userData.arm swings. */
export function brainChipBay(signTex) {
  const group = new THREE.Group(), tb = new ToyBuilder(), arm = new ToyBuilder();
  const red = 0xd8262f, white = 0xf2efe6, teal = 0x2ec4b6, grey = 0x8d96a6, dark = 0x23252c, orange = 0xff8a1f;
  // the service lane: dark floor, yellow guide lines, a checkered kerb
  tb.add(0x34373f, box(12.4, 0.16, 8.5, 0.05, 1), { p: [0, 0.08, 0.2] });
  for (const sx of [-1, 1]) tb.add(0xffc928, box(0.28, 0.04, 7.6), { p: [sx * 2.6, 0.18, 0.5] });
  for (let k = 0; k < 12; k++) tb.add(k % 2 ? white : red, box(1.03, 0.22, 0.4, 0.04, 1), { p: [-5.67 + k * 1.03, 0.2, 4.25] });
  // the bay frame: two pillars, the header (the sign), a half-raised roll-up door
  for (const sx of [-1, 1]) {
    tb.add(red, box(1.0, 5.4, 1.0, 0.12, 2), { p: [sx * 5.7, 2.7, 1.6] });
    for (let k = 0; k < 4; k++) tb.add(k % 2 ? red : white, box(1.06, 0.36, 1.06, 0.04, 1), { p: [sx * 5.7, 0.5 + k * 0.36, 1.6] });
  }
  tb.add(red, box(12.8, 2.9, 1.1, 0.14, 2), { p: [0, 6.55, 1.6] });
  tb.add(white, box(13.0, 0.22, 1.2, 0.05, 1), { p: [0, 5.05, 1.6] });
  for (let k = 0; k < 4; k++) tb.add(k % 2 ? 0xcfd3da : 0xe5e8ec, box(10.3, 0.3, 0.14, 0.04, 1), { p: [0, 4.75 - k * 0.3, 1.45] });
  const sign = gagSign(tb, signTex, 11.9, 2.45, [0, 6.55, 2.22], 0x8c1218);
  // the giant brain on the roof, with its chip
  tb.frame([0, 8.0, 1.4], 0, 1.05);
  for (const sx of [-1, 1]) {
    tb.add(0xff9cc0, sphere(1, 18, 12), { p: [sx * 0.62, 0.85, 0], s: [0.78, 0.82, 1.15] });
    for (let k = 0; k < 4; k++) {
      const z = -0.8 + k * 0.55;
      tb.add(0xe0678f, tube([[sx * 0.15, 1.45, z], [sx * 0.6, 1.62, z + 0.15], [sx * 1.0, 1.25, z - 0.1], [sx * 1.32, 0.75, z + 0.1]], 0.07, 10, 5));
    }
  }
  tb.lit(0x5ff7ff, box(0.5, 0.12, 0.5, 0.03, 1), { p: [0.45, 1.66, 0.35], r: [0, 0.3, -0.25] });
  tb.frame();
  // the dentist's chair, reclined, turned a little toward the road
  tb.frame([0.9, 0.16, -0.6], -0.5, 1.5);
  tb.add(grey, cyl(0.8, 0.9, 0.14, 18), { p: [0, 0.07, 0] });
  tb.add(grey, cyl(0.32, 0.4, 0.95, 14), { p: [0, 0.6, 0] });
  tb.add(teal, box(1.1, 0.3, 1.2, 0.13, 2), { p: [0, 1.15, 0.1] });
  tb.add(teal, box(1.05, 0.28, 1.35, 0.13, 2), { p: [0, 1.62, -0.85], r: [-1.05, 0, 0] });
  tb.add(teal, box(0.6, 0.24, 0.5, 0.1, 2), { p: [0, 2.32, -1.3], r: [-0.8, 0, 0] });
  tb.add(teal, box(1.0, 0.24, 1.0, 0.11, 2), { p: [0, 0.98, 0.98], r: [0.55, 0, 0] });
  for (const sx of [-1, 1]) tb.add(white, box(0.18, 0.16, 0.9, 0.06, 1), { p: [sx * 0.62, 1.45, 0.05] });
  // the dental lamp on its arm
  tb.add(grey, cyl(0.06, 0.06, 2.8, 8), { p: [-1.05, 1.5, -0.55] });
  tb.add(grey, bar([-1.05, 2.9, -0.55], [-0.1, 3.1, -0.95], 0.1));
  tb.add(white, box(0.6, 0.22, 0.38, 0.09, 2), { p: [0, 3.1, -1.0], r: [0.4, 0, 0] });
  tb.lit(0xfff3c4, box(0.48, 0.05, 0.28), { p: [0, 2.98, -0.97], r: [0.4, 0, 0] });
  tb.frame();
  // the robot arm: base fixed, the rest swings over the headrest
  tb.add(dark, cyl(0.85, 1.0, 0.5, 18), { p: [-3.4, 0.4, -1.3] });
  arm.add(orange, cyl(0.62, 0.7, 0.55, 18), { p: [0, 0.27, 0] });
  arm.add(orange, sphere(0.5, 14, 10), { p: [0, 0.75, 0] });
  arm.add(orange, box(0.6, 3.0, 0.6, 0.14, 2), { p: [0.45, 2.1, 0], r: [0, 0, -0.32] });
  arm.add(dark, sphere(0.42, 14, 10), { p: [0.95, 3.5, 0] });
  arm.add(orange, box(0.5, 2.6, 0.5, 0.12, 2), { p: [2.0, 3.42, 0], r: [0, 0, -1.65] });
  arm.add(dark, cyl(0.24, 0.24, 0.6, 12), { p: [3.3, 3.2, 0], r: [0, 0, 0.2] });
  arm.add(grey, cyl(0.04, 0.09, 0.7, 8), { p: [3.4, 2.65, 0] });
  arm.lit(0x5ff7ff, box(0.42, 0.1, 0.42, 0.03, 1), { p: [3.4, 2.25, 0] });
  const swing = arm.build(); swing.position.set(-3.4, 0.65, -1.3); swing.rotation.y = -0.35;
  group.add(tb.build(), swing, sign);
  group.userData.arm = swing;
  return group;
}

/** ARMOR GLASS (MOSTLY): a giant stainless wedge pickup on a reveal stage, both
 *  side windows smashed into spiderwebs, the steel ball on the floor beside it.
 *  Origin on the floor, facing +Z; the truck's side faces +Z. */
export function armorGlassTruck(signTex, { s = 2.0 } = {}) {
  const group = new THREE.Group(), tb = new ToyBuilder();
  const steel = 0xc3cad2, glass = 0x141c26, dark = 0x1d2026;
  tb.add(0x24272f, cyl(7.4, 7.6, 0.45, 40), { p: [0, 0.22, 0] });
  tb.lit(0x45e8ff, torus(7.42, 0.07, 5, 64), { p: [0, 0.45, 0], r: [Math.PI / 2, 0, 0] });
  // side profile, front at x = 0, extruded across the width
  const L = 5.9, prof = [[0, 0.55], [0.65, 0.55], [0.9, 1.05], [1.7, 1.05], [1.95, 0.55], [3.95, 0.55], [4.2, 1.05], [5.0, 1.05], [5.25, 0.55], [L, 0.55], [L, 1.35], [3.0, 1.95], [0.25, 1.12], [0, 1.05]];
  const body = new THREE.ExtrudeGeometry(new THREE.Shape(prof.map(([x, y]) => new THREE.Vector2(x, y))), { depth: 2.0, bevelEnabled: false });
  body.translate(-L / 2, 0, -1.0);
  tb.frame([0.2, 0.45, -0.4], 0, s);
  tb.shiny(steel, body);
  for (const x of [1.3, 4.6]) for (const z of [-0.82, 0.82]) {
    tb.add(dark, cyl(0.45, 0.45, 0.34, 18), { p: [x - L / 2, 0.45, z], r: [Math.PI / 2, 0, 0] });
    tb.add(0x5b6270, cyl(0.3, 0.3, 0.36, 6), { p: [x - L / 2, 0.45, z], r: [Math.PI / 2, 0, 0] });
  }
  tb.lit(0xf4fbff, box(0.04, 0.06, 1.9), { p: [-L / 2 - 0.01, 1.06, 0] });
  tb.lit(0xff3030, box(0.04, 0.06, 1.9), { p: [L / 2 + 0.01, 1.32, 0] });
  // the two side windows (the near side), each smashed from one impact point
  const roof = x => x < 3 ? 1.12 + (x - 0.25) * 0.83 / 2.75 : 1.95 - (x - 3) * 0.6 / 2.9;
  const windows = [
    { poly: [[1.42, 1.3], [2.95, 1.3], [2.95, roof(2.95) - 0.1], [1.42, roof(1.42) - 0.1]], hit: [2.35, 1.53] },
    { poly: [[3.06, 1.3], [4.6, 1.3], [4.6, roof(4.6) - 0.1], [3.06, roof(3.06) - 0.1]], hit: [3.7, 1.55] },
  ];
  const inside = (poly, x, y) => { let c = false; for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) { const [xi, yi] = poly[i], [xj, yj] = poly[j]; if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) c = !c; } return c; };
  for (const { poly, hit } of windows) {
    const wg = new THREE.ShapeGeometry(new THREE.Shape(poly.map(([x, y]) => new THREE.Vector2(x - L / 2, y)))); wg.translate(0, 0, 1.012);
    tb.shiny(glass, wg);
    // spiderweb: rays out to the frame, rings joining them
    const rays = [];
    for (let k = 0; k < 11; k++) {
      const a = k / 11 * Math.PI * 2 + 0.2 + (k % 3) * 0.13, pts = [];
      for (let r = 0.05; r < 1.6; r += 0.03) { const x = hit[0] + Math.cos(a) * r, y = hit[1] + Math.sin(a) * r * 0.9; if (!inside(poly, x, y)) break; pts.push([x, y]); }
      rays.push(pts);
    }
    const z = 1.03;
    for (const pts of rays) if (pts.length > 1) tb.lit(0xe9f6ff, bar([hit[0] - L / 2, hit[1], z], [pts.at(-1)[0] - L / 2, pts.at(-1)[1], z], 0.07));
    for (const ring of [4, 9, 15]) for (let k = 0; k < rays.length; k++) {
      const a = rays[k][ring], b = rays[(k + 1) % rays.length][ring];
      if (a && b) tb.lit(0xe9f6ff, bar([a[0] - L / 2, a[1], z], [b[0] - L / 2, b[1], z], 0.055));
    }
    tb.lit(0xffffff, sphere(0.09, 8, 6), { p: [hit[0] - L / 2, hit[1], z] });
  }
  // door seams
  for (const x of [1.4, 2.98, 4.62]) tb.add(dark, box(0.03, 0.72, 0.02), { p: [x - L / 2, 0.98, 1.01] });
  tb.frame();
  // the steel ball, where it landed
  tb.shiny(0xe6ebf2, sphere(0.62, 22, 16), { p: [-1.6, 1.07, 3.9] });
  // two reveal spotlights on stands
  for (const sx of [-1, 1]) {
    tb.add(dark, cyl(0.07, 0.07, 1.6, 8), { p: [sx * 6.1, 1.25, 3.4] });
    tb.add(dark, box(0.7, 0.5, 0.6, 0.08, 1), { p: [sx * 6.1, 2.1, 3.4], r: [0.3, -sx * 0.6, 0] });
    tb.lit(0xfff1c8, box(0.5, 0.35, 0.04), { p: [sx * 6.1 - sx * 0.16, 2.0, 3.12], r: [0.3, -sx * 0.6, 0] });
  }
  // the backdrop screen with the copy
  for (const sx of [-1, 1]) tb.add(dark, box(0.3, 7.6, 0.3, 0.06, 1), { p: [sx * 5.6, 3.8, -3.3] });
  const sign = gagSign(tb, signTex, 10.2, 3.0, [0, 6.0, -3.05]);
  group.add(tb.build(), sign);
  return group;
}

/** FULLY AUTONOMOUS: three humanoid robots shaking cocktails behind a bar, in
 *  perfect unison with the joystick of the operator half-hidden behind the
 *  curtain at the end of it. Origin on the floor, facing +Z.
 *  userData.puppet (the robots' shaking hands) and userData.stick move together. */
export function autonomousBar(signTex) {
  const group = new THREE.Group(), tb = new ToyBuilder(), hands = new ToyBuilder(), stick = new ToyBuilder();
  const white = 0xf1f2f4, black = 0x15171c, wood = 0x8f4d2c, velvet = 0xb3122e, gold = 0xe0b347, skin = 0xd99f78;
  tb.add(0x2a2d36, box(17, 0.2, 7.5, 0.06, 1), { p: [0.8, 0.1, 0] });
  // the bar and the back bar with its bottles
  tb.add(wood, box(10.4, 1.3, 1.3, 0.12, 2), { p: [0, 0.85, 1.3] });
  tb.add(0x4a2316, box(10.8, 0.14, 1.6, 0.05, 1), { p: [0, 1.56, 1.3] });
  tb.lit(0x37e6ff, box(10.2, 0.08, 0.06), { p: [0, 0.38, 1.98] });
  for (const y of [2.5, 3.4]) tb.add(0x4a2316, box(10.0, 0.12, 0.6, 0.04, 1), { p: [0, y, -1.7] });
  tb.add(0x3a2a24, box(10.4, 3.6, 0.3, 0.06, 1), { p: [0, 2.0, -2.1] });
  const glassCols = [0xffb347, 0x55e07a, 0x4fb8ff, 0xff5f8f];
  for (let k = 0; k < 18; k++) {
    const y = k < 9 ? 2.56 : 3.46, x = -4.4 + (k % 9) * 1.1 + (k < 9 ? 0 : 0.5);
    tb.lit(glassCols[k % 4], cyl(0.14, 0.16, 0.5, 8), { p: [x, y + 0.25, -1.7] });
    tb.lit(glassCols[k % 4], cyl(0.05, 0.08, 0.22, 6), { p: [x, y + 0.6, -1.7] });
  }
  // three robots: white shells, black visors with a lit line, black hands
  for (const x of [-3.3, 0, 3.3]) {
    tb.add(white, box(1.0, 1.25, 0.6, 0.22, 3), { p: [x, 2.2, 0] });
    tb.add(black, box(0.62, 0.5, 0.06, 0.05, 1), { p: [x, 2.3, 0.31] });
    tb.add(white, box(0.7, 0.4, 0.5, 0.14, 2), { p: [x, 1.45, 0] });
    tb.add(0x9aa0aa, cyl(0.14, 0.16, 0.3, 10), { p: [x, 2.95, 0] });
    tb.add(white, box(0.56, 0.62, 0.56, 0.2, 3), { p: [x, 3.35, 0] });
    tb.shiny(black, box(0.5, 0.44, 0.1, 0.08, 2), { p: [x, 3.37, 0.25] });
    tb.lit(0x5ff7ff, box(0.36, 0.05, 0.02), { p: [x, 3.37, 0.31] });
    for (const sx of [-1, 1]) {
      tb.add(white, sphere(0.24, 12, 10), { p: [x + sx * 0.62, 2.68, 0] });
      tb.add(white, tube([[x + sx * 0.64, 2.6, 0.02], [x + sx * 0.68, 2.15, 0.25], [x + sx * 0.5, 2.05, 0.55]], 0.13, 8, 8));
      tb.add(black, sphere(0.16, 10, 8), { p: [x + sx * 0.5, 2.05, 0.55] });
      hands.add(white, tube([[x + sx * 0.5, 2.05, 0.55], [x + sx * 0.3, 2.4, 0.7], [x + sx * 0.17, 2.62, 0.72]], 0.11, 8, 8));
      hands.add(black, sphere(0.14, 10, 8), { p: [x + sx * 0.16, 2.64, 0.74] });
    }
    hands.shiny(0xdfe5ee, cyl(0.17, 0.15, 0.62, 14), { p: [x, 2.72, 0.75] });
    hands.shiny(0xdfe5ee, cyl(0.1, 0.15, 0.22, 12), { p: [x, 3.14, 0.75] });
  }
  // the curtain at the right end, on a gold rod
  tb.add(gold, cyl(0.07, 0.07, 3.6, 8), { p: [7.1, 4.75, 0.3], r: [0, 0, Math.PI / 2] });
  for (let k = 0; k < 9; k++) tb.add(velvet, cyl(0.24, 0.3, 4.55, 10), { p: [5.55 + k * 0.38, 2.4, 0.3 + (k % 2) * 0.16] });
  tb.add(gold, torus(0.3, 0.06, 6, 14), { p: [7.4, 2.0, 0.6], r: [Math.PI / 2, 0, 0] });
  // the operator, behind it: head and headset peek out, one arm holds the joystick box
  tb.add(0x19b39b, box(1.0, 1.5, 0.6, 0.2, 2), { p: [6.2, 1.8, -0.15] });
  tb.add(skin, sphere(0.42, 14, 10), { p: [5.3, 2.85, 0.55] });
  tb.add(0x3b2a20, sphere(0.44, 14, 10), { p: [5.36, 3.0, 0.47], s: [1, 0.75, 1] });
  tb.add(black, torus(0.39, 0.05, 5, 14, Math.PI), { p: [5.32, 2.88, 0.52], r: [0, Math.PI / 2, 0] });
  tb.add(black, sphere(0.12, 8, 6), { p: [5.32, 2.82, 0.92] });
  tb.add(black, bar([5.32, 2.78, 0.95], [5.1, 2.6, 0.9], 0.04));
  tb.add(skin, sphere(0.06, 6, 4), { p: [5.17, 2.88, 0.85] });
  tb.add(0x19b39b, tube([[5.6, 2.2, 0.55], [5.25, 1.95, 0.9], [4.95, 1.72, 1.0]], 0.13, 8, 8));
  tb.add(black, box(0.62, 0.22, 0.5, 0.06, 1), { p: [4.85, 1.62, 1.05] });
  tb.add(skin, sphere(0.13, 8, 6), { p: [4.95, 1.75, 1.0] });
  tb.lit(0x5ff7ff, box(0.4, 0.03, 0.22), { p: [4.85, 1.74, 1.18] });
  // its cable, orange, along the floor and into the bar
  tb.add(0xff8a00, tube([[4.6, 1.55, 1.1], [4.3, 0.6, 1.8], [4.0, 0.22, 2.3], [2.5, 0.22, 2.55], [0.5, 0.22, 2.4], [-1.5, 0.22, 2.25]], 0.07, 30, 6));
  stick.add(0x30323a, cyl(0.05, 0.05, 0.55, 8), { p: [0, 0.27, 0] });
  stick.add(0xe0262f, sphere(0.13, 12, 8), { p: [0, 0.58, 0] });
  // the sign over the bar
  for (const sx of [-1, 1]) tb.add(black, cyl(0.04, 0.04, 1.4, 6), { p: [sx * 5.2, 7.0, 0.1] });
  const sign = gagSign(tb, signTex, 12.6, 3.0, [0, 5.25, 0.1], 0x12131a);
  const puppet = hands.build(), joy = stick.build();
  joy.position.set(4.85, 1.72, 1.05);
  group.add(tb.build(), puppet, joy, sign);
  group.userData.puppet = puppet; group.userData.stick = joy;
  return group;
}

/** ROADSTER 2 PICKUP: a velvet-rope delivery display, its spotlight on an
 *  empty, slowly turning turntable, and a cobweb across the ropes. Origin on the
 *  floor, facing +Z. userData.turntable spins. */
export function roadsterPickup(signTex) {
  const group = new THREE.Group(), tb = new ToyBuilder(), tt = new ToyBuilder();
  const brass = 0xd8ab48, rope = 0xa3122a, dark = 0x22252d;
  tb.add(0x14161c, cyl(4.8, 5.2, 2.0, 40), { p: [0, 1.0, 0] });
  for (const y of [0.5, 1.75]) tb.lit(0xffd23c, torus(4.85 + (2 - y) * 0.1, 0.06, 5, 64), { p: [0, y, 0], r: [Math.PI / 2, 0, 0] });
  tb.add(0xb5172f, box(3.0, 0.05, 4.4), { p: [0, 0.03, 6.5] });
  // the turntable: a grey disc with radial stripes so the turn shows, and a lit rim
  tt.add(0x3a3f4b, cyl(4.3, 4.4, 0.36, 40), { p: [0, 0.18, 0] });
  // the pool of light where a car should be is drawn on it below
  for (let k = 0; k < 6; k++) tt.add(0x5a6070, box(8.2, 0.03, 0.18), { p: [0, 0.37, 0], r: [0, k * Math.PI / 6, 0] });
  tt.lit(0x45e8ff, torus(4.35, 0.08, 5, 56), { p: [0, 0.36, 0], r: [Math.PI / 2, 0, 0] });
  tt.lit(0xfff1c8, cyl(2.9, 2.9, 0.02, 32), { p: [0, 0.39, 0] });
  // brass stanchions and sagging red ropes, all the way round
  const posts = [];
  for (let k = 0; k < 10; k++) { const a = k / 10 * Math.PI * 2 + Math.PI / 10; posts.push([Math.sin(a) * 5.9, Math.cos(a) * 5.9]); }
  for (const [x, z] of posts) {
    tb.shiny(brass, cyl(0.32, 0.36, 0.1, 14), { p: [x, 0.05, z] });
    tb.shiny(brass, cyl(0.075, 0.075, 1.5, 10), { p: [x, 0.8, z] });
    tb.shiny(brass, sphere(0.15, 12, 8), { p: [x, 1.6, z] });
  }
  for (let k = 0; k < posts.length; k++) {
    const [ax, az] = posts[k], [bx, bz] = posts[(k + 1) % posts.length];
    tb.add(rope, tube([[ax, 1.45, az], [(ax * 3 + bx) / 4, 1.12, (az * 3 + bz) / 4], [(ax + bx) / 2, 1.02, (az + bz) / 2], [(ax + 3 * bx) / 4, 1.12, (az + 3 * bz) / 4], [bx, 1.45, bz]], 0.09, 14, 6));
  }
  // the cobweb in the front gap: rays and rings from the top of one post
  const [p0x, p0z] = posts[0], [p1x, p1z] = posts[9], cx = p0x, cz = (p0z + p1z) / 2 + 0.05, dirX = Math.sign(p1x - p0x);
  const web = [];
  for (let k = 0; k < 7; k++) { const a = Math.PI * (0.03 + k * 0.075); web.push([cx + Math.cos(a) * 1.3 * dirX, 1.5 - Math.sin(a) * 1.1]); }
  for (const [x, y] of web) tb.lit(0xd9dde4, bar([cx, 1.5, cz], [x, y, cz], 0.03));
  for (const f of [0.35, 0.7]) for (let k = 0; k < web.length - 1; k++) {
    const [ax, ay] = web[k], [bx, by] = web[k + 1];
    tb.lit(0xd9dde4, bar([cx + (ax - cx) * f, 1.5 + (ay - 1.5) * f, cz], [cx + (bx - cx) * f, 1.5 + (by - 1.5) * f, cz], 0.025));
  }
  // the spotlight on its stand, aimed at the empty disc
  // the spotlight: a floor can at the front corner, aimed at the empty disc
  tb.add(dark, cyl(0.45, 0.55, 0.3, 16), { p: [4.6, 0.15, 5.4] });
  tb.add(dark, cyl(0.07, 0.07, 3.2, 8), { p: [4.6, 1.75, 5.4] });
  tb.add(dark, cyl(0.55, 0.45, 1.1, 16), { p: [4.6, 3.5, 5.4], r: [-0.85, 0, 0.6] });
  tb.lit(0xfff6dc, cyl(0.47, 0.47, 0.04, 16), { p: [4.3, 3.2, 5.05], r: [-0.85, 0, 0.6] });
  // the delivery-centre sign behind the display
  for (const sx of [-1, 1]) tb.add(dark, box(0.3, 6.6, 0.3, 0.06, 1), { p: [sx * 5.3, 3.3, -4.4] });
  const sign = gagSign(tb, signTex, 10.4, 3.2, [0, 5.0, -4.15]);
  // tipped toward the road like a show stand, so the empty top shows from a kart
  const turntable = tt.build(), stand = new THREE.Group();
  stand.position.set(0, 2.0, 0.4); stand.rotation.x = 0.2; stand.add(turntable);
  group.add(tb.build(), stand, sign);
  group.userData.turntable = turntable;
  return group;
}
