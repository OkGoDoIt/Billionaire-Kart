/* Props for Boring Tunnel GP: the Boring Machine chewing the wall at the
   bottom of the dive, the loop-the-loop ring straddling the climb, ceiling
   fans, tripod work lights, wall signs, portal pylons, and a spare cutter
   head for the dig site outside. Each builder returns a THREE.Group on
   y = 0, facing +Z. Textures are only created inside the functions that
   receive them, so this module imports cleanly in Node. */
import * as THREE from 'three';
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

/** A sandstone pylon for a portal mouth, with a red band near the top. */
export function portalPylon({ h = 13 } = {}) {
  const b = new ModelBuilder();
  b.add('post', box(2.6, h, 2.6, 0.2, 2), { p: [0, h / 2, 0] });
  b.add('cap', box(3.3, 0.9, 3.3, 0.15, 1), { p: [0, h + 0.45, 0] });
  b.add('band', box(2.75, 1.1, 2.75, 0.05, 1), { p: [0, h - 2.4, 0] });
  return b.build({ post: plastic(SANDSTONE, 0.7), cap: plastic(0xbfb49a, 0.7), band: paint(0xe23b3b, { rough: 0.5 }) });
}

/** The bore's own tube (#234 item 3, replacing the stock shell via
 *  tunnelShell: false): dark concrete rings every ~1.5 m with subtle 6 m
 *  banding, portal arch faces at the range ends, and — the track's signature
 *  look — an emissive strip ring every ~6 m whose colour runs
 *  hsl(fract(s/120 - time*0.25)) so a rainbow wave travels the bore.
 *  One merged concrete geometry + one merged strip geometry = 2 draw calls.
 *  `windows` lets later work open the arc on one side (station, shortcut
 *  junctions): entries { r0, r1, k0, k1 } in sample/arc-index space clamp the
 *  arc of every ring in [r0, r1] to [k0, k1] (k runs 0..ARC from the R wall
 *  over the crown to the L wall). Portals are skipped near window mouths,
 *  so a window gets no floating arch slice. */
export function boreTube(track, uTime, windows = []) {
  const { N, ds, px, py, pz, lx, ly, lz, ux, uy, uz, hwL, hwR } = track;
  const H = track.def.tunnelHeight ?? 7, ARC = 12, STEP = 2;
  const group = new THREE.Group();
  const winAt = r => windows.find(w => r >= w.r0 && r <= w.r1) || null;
  const kRange = r => { const w = winAt(r); return w ? [w.k0, w.k1] : [0, ARC]; };

  // ---- concrete (tube + portal faces share one geometry) ----
  const pos = [], nor = [], col = [], idx = [];
  function arcVerts(r, sh) {
    const i = r % N, a = hwL[i] + 0.7, b = hwR[i] + 0.7, mid = (a - b) / 2, half = (a + b) / 2;
    const [k0, k1] = kRange(r), first = pos.length / 3;
    for (let k = k0; k <= k1; k++) {
      const ang = Math.PI * (k / ARC), ca = Math.cos(ang), sa = Math.sin(ang), lat = mid + ca * half, up = sa * H;
      pos.push(px[i] + lx[i] * lat + ux[i] * up, py[i] + ly[i] * lat + uy[i] * up, pz[i] + lz[i] * lat + uz[i] * up);
      nor.push(-(lx[i] * ca + ux[i] * sa), -(ly[i] * ca + uy[i] * sa), -(lz[i] * ca + uz[i] * sa));
      col.push(sh, sh, sh);
    }
    return { first, k0, k1 };
  }
  let prev = null;
  for (let r = 0; r <= N; r++) {
    const i = r % N;
    if (!track.tunnel[i]) { prev = null; continue; }
    const ring = arcVerts(r, (Math.floor(r / STEP / 4) % 2) ? 0.93 : 1.0);
    if (prev) {
      const k0 = Math.max(prev.k0, ring.k0), k1 = Math.min(prev.k1, ring.k1);
      for (let k = k0; k < k1; k++) {
        const a0 = prev.first + (k - prev.k0), a1 = a0 + 1, b0 = ring.first + (k - ring.k0), b1 = b0 + 1;
        idx.push(a0, b0, a1, a1, b0, b1);
      }
    }
    prev = ring;
    // portal face where a tunnel run starts or ends (not near a window mouth)
    const isEnd = !track.tunnel[(i + 1) % N] || !track.tunnel[(i - 1 + N) % N];
    if (isEnd && !winAt(r) && !winAt(r - 1) && !winAt(r + 1)) {
      const a = hwL[i] + 0.7, b = hwR[i] + 0.7, mid = (a - b) / 2, half = (a + b) / 2, c0 = pos.length / 3;
      for (let k = 0; k <= ARC; k++) {
        const ang = Math.PI * (k / ARC), ca = Math.cos(ang), sa = Math.sin(ang);
        for (const e of [0, 2.2]) {
          const lat = mid + ca * (half + e), up = sa * (H + e);
          pos.push(px[i] + lx[i] * lat + ux[i] * up, py[i] + ly[i] * lat + uy[i] * up, pz[i] + lz[i] * lat + uz[i] * up);
          nor.push(track.tx[i], 0, track.tz[i]);
          col.push(0.66, 0.66, 0.66);
        }
        if (k) { const q = c0 + (k - 1) * 2; idx.push(q, q + 1, q + 2, q + 2, q + 1, q + 3); }
      }
    }
  }
  const cg = new THREE.BufferGeometry();
  cg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  cg.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  cg.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  cg.setIndex(idx);
  group.add(new THREE.Mesh(cg, new THREE.MeshStandardMaterial({ color: 0x848b93, roughness: 0.96, metalness: 0.02, vertexColors: true, emissive: 0x14120e, side: THREE.DoubleSide })));

  // ---- rainbow strips: a band between ring r and r+1 at every 4th ring ----
  const sp = [], sa = [], sidx = [];
  for (let r = 0; r < N; r += STEP) {
    const i = r % N;
    if (!track.tunnel[i] || !track.tunnel[(r + 1) % N] || (r / STEP) % 4 !== 0) continue;
    const rows = [];
    for (const rr of [r, r + 1]) {
      const j = rr % N, a = hwL[j] + 0.64, b = hwR[j] + 0.64, mid = (a - b) / 2, half = (a + b) / 2, h = H - 0.06;
      const [k0, k1] = kRange(rr), first = sp.length / 3;
      for (let k = k0; k <= k1; k++) {
        const ang = Math.PI * (k / ARC), lat = mid + Math.cos(ang) * half, up = Math.sin(ang) * h;
        sp.push(px[j] + lx[j] * lat + ux[j] * up, py[j] + ly[j] * lat + uy[j] * up, pz[j] + lz[j] * lat + uz[j] * up);
        sa.push(rr * ds);
      }
      rows.push({ first, k0, k1 });
    }
    const [A, B] = rows, k0 = Math.max(A.k0, B.k0), k1 = Math.min(A.k1, B.k1);
    for (let k = k0; k < k1; k++) {
      const a0 = A.first + (k - A.k0), a1 = a0 + 1, b0 = B.first + (k - B.k0), b1 = b0 + 1;
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
        gl_FragColor = vec4(c * 1.55, 1.0);
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
    panel.position.set(0, beamY - 2.15, 0);
    grp.add(panel);
    const back = new THREE.Mesh(new THREE.BoxGeometry(w + 0.3, h + 0.3, 0.1),
      new THREE.MeshStandardMaterial({ color: 0x2a2d33, roughness: 0.8 }));
    back.position.set(0, beamY - 2.15, -0.14);
    grp.add(back);
  }
  return grp;
}
