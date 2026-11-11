/* Billionaire Kart — White House GP (Batch 1, issue #10)
   Self-contained track module: exports the track definition in the exact shape
   game.js consumes (TRACKS entry) plus a dressing builder. See datacenter.js
   for the ctx contract — identical. A National Mall loop: Reflecting Pool
   straights, a hairpin around the Monument, and the Ballroom construction
   zone where the East Wing used to be. Gold. So much gold. */

export const def = {
  name: 'White House GP', sky: 0x9fd3ee, fog: 0xcfe5ef, ground: 0x4e8f3f, roadSeed: 5, apron: 0xa8a894,
  points: [[269,-60],[134,-95],[-45,-100],[-213,-95],[-282,-40],[-289,10],[-267,58],[-190,80],[-67,88],[45,84],[123,60],[168,95],[241,88],[282,40],[278,-20]],
  // HAND-AUTHORED profiles (docs/track-design-white-house.md) — keyframes [u, value]:
  // elev = road height in metres; bank = cross-slope in degrees (+ banks a RIGHT
  // turn). This is the ceremonial-flat track BY DESIGN: the Mall straights stay
  // at 0.00 so the White House lawn, fence, Reflecting Pool and Monument plaza
  // sit exactly as built. The only authored exceptions are the sunken Monument
  // hairpin bowl (west) and the Ballroom construction ramp (east).
  elev: [[0, 0], [0.30, 0], [0.36, -1.2], [0.42, -2.4], [0.494, -3.5], [0.54, -2.2], [0.60, 0], [0.84, 0], [0.885, 1.8], [0.93, 4.5], [0.96, 2.0], [0.995, 0]],
  bank: [[0, 0], [0.30, 0], [0.35, -6], [0.385, -8], [0.42, -9], [0.46, -10], [0.494, -11], [0.53, -6], [0.57, 0], [0.75, 0], [0.784, 13], [0.802, 0], [0.820, -12], [0.845, -4], [0.88, -8], [0.90, -6], [0.929, -10], [0.95, 0], [0.96, 0], [0.998, -5]],
};

/* ---------- world-build terrain (issue #59) ----------
   Sculpted National-Mall grounds for the conforming-terrain contract: lawns
   swell gently, the Monument sits in an authored bowl, twin terraces flank
   the Reflecting Pool. game.js blends the road plane out to this field. */
function gauss(x, z, cx, cz, r, h) { const dx = x - cx, dz = z - cz; return h * Math.exp(-(dx * dx + dz * dz) / (r * r)); }
function vnoise(x, z, s) { return Math.sin(x * s + Math.sin(z * s * 1.7) * 2.1) * Math.cos(z * s * 0.83 + Math.sin(x * s * 1.3) * 1.7); }
function clamp01(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }
function inwardPoint(tc, x, z, dist) {
  const i = nearestIdx(tc, x, z), s = tc.samples[i], n = tc.normals[i];
  const inw = ((tc.center.x - s.x) * n.x + (tc.center.z - s.z) * n.z) > 0 ? 1 : -1;
  return { x: s.x + n.x * inw * dist, z: s.z + n.z * inw * dist };
}
export function monumentCentre(tc) { return inwardPoint(tc, -215, 8, 52); } // shared by terrainField + dress()
export function terrainField(x, z, tc) {
  const c = tc.center;
  const mon = monumentCentre(tc);
  const bowl = gauss(x, z, mon.x, mon.z, 36, -3.6); // the Monument Bowl
  const calm = 1 - Math.min(1, -bowl / 3.0);
  let h = bowl + (vnoise(x, z, 0.014) * 0.9 + vnoise(x, z, 0.045) * 0.3) * calm; // sculpted lawns
  h += gauss(x, z, c.x - 102, c.z + 44, 48, 1.5); // lawn terraces flanking the Reflecting Pool
  h += gauss(x, z, c.x + 102, c.z + 44, 48, 1.5);
  h += gauss(x, z, c.x + 330, c.z - 60, 110, 2.6); // gentle rise behind the Ballroom zone
  const d = Math.hypot(x - c.x, z - c.z);
  h += clamp01((d - 350) / 240) * 6;              // far lift under the silhouette ring
  return h;
}

/* ---------- small local helpers (duplicated per module by design) ---------- */
function textPanel(THREE, lines, { w = 512, h = 256, bg = '#101736', fg = '#ffffff', border = '#ffd94a', font = 52 } = {}) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const g = c.getContext('2d');
  g.fillStyle = bg; g.fillRect(0, 0, w, h);
  if (border) { g.strokeStyle = border; g.lineWidth = 10; g.strokeRect(6, 6, w - 12, h - 12); }
  g.fillStyle = fg; g.textAlign = 'center'; g.textBaseline = 'middle';
  const wrapped = [];
  for (const raw of lines) {
    const words = raw.split(' '); let line = '';
    for (const word of words) {
      const test = line ? line + ' ' + word : word;
      g.font = `900 ${font}px system-ui`;
      if (g.measureText(test).width > w - 40 && line) { wrapped.push(line); line = word; } else line = test;
    }
    wrapped.push(line);
  }
  const lh = font * 1.18;
  wrapped.forEach((l, i) => { g.font = `900 ${font}px system-ui`; g.fillText(l, w / 2, h / 2 + (i - (wrapped.length - 1) / 2) * lh); });
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  return t;
}
function box(THREE, w, h, d, color, x = 0, y = 0, z = 0, opts = {}) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), opts.mat || new THREE.MeshLambertMaterial({ color }));
  m.position.set(x, y, z); if (opts.ry) m.rotation.y = opts.ry; if (opts.rx) m.rotation.x = opts.rx; if (opts.rz) m.rotation.z = opts.rz;
  m.castShadow = !!opts.shadow; return m;
}
function sign(THREE, tex, w, h, postColor = 0x2a2d34) {
  const g = new THREE.Group();
  const panel = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshLambertMaterial({ map: tex, side: THREE.DoubleSide }));
  panel.position.y = h / 2 + 1.6; g.add(panel);
  const postM = new THREE.MeshLambertMaterial({ color: postColor });
  for (const px of [-w / 2 + 0.7, w / 2 - 0.7]) { const p = new THREE.Mesh(new THREE.BoxGeometry(0.35, h / 2 + 1.6, 0.35), postM); p.position.set(px, (h / 2 + 1.6) / 2, 0); g.add(p); }
  return g;
}
function nearestIdx(ctx, x, z) {
  let best = 0, bd = Infinity;
  for (let i = 0; i < ctx.N; i++) { const s = ctx.samples[i], dx = s.x - x, dz = s.z - z, d = dx * dx + dz * dz; if (d < bd) { bd = d; best = i; } }
  return best;
}
function atFrac(ctx, frac, lat, y = null) { // default y = real terrain height (TRACK 3D profiles)
  const i = Math.floor(frac * ctx.N) % ctx.N, s = ctx.samples[i], n = ctx.normals[i];
  const x = s.x + n.x * lat, z = s.z + n.z * lat;
  return { pos: new ctx.THREE.Vector3(x, y === null ? (ctx.terrainHeightAt ? ctx.terrainHeightAt(x, z) : 0) : y, z), idx: i, sample: s };
}
function faceTrack(obj, sample) { obj.lookAt(sample.x, 0, sample.z); }
function inwardSign(ctx, idx) { // +1/-1: which normal side faces the loop centroid
  const c = new ctx.THREE.Vector3(); ctx.samples.forEach(s => c.add(s)); c.divideScalar(ctx.N);
  const s = ctx.samples[idx], n = ctx.normals[idx];
  return ((c.x - s.x) * n.x + (c.z - s.z) * n.z) > 0 ? 1 : -1;
}

/* ============================== DRESSING ============================== */
export function dress(ctx) {
  const { THREE, scene, HALF_W, rand } = ctx;
  const bobs = [], tickers = [];
  let craneJib = null, excavArm = null;
  const GOLD = 0xd4af37, GOLDMAT = new THREE.MeshLambertMaterial({ color: GOLD });
  const centroid = new THREE.Vector3();
  ctx.samples.forEach(s => centroid.add(s)); centroid.divideScalar(ctx.N);
  const tcLike = { samples: ctx.samples, normals: ctx.normals, N: ctx.N, center: centroid };

  /* ----- the White House, inside the north straight ----- */
  const whIdx = nearestIdx(ctx, 60, -95), inw = inwardSign(ctx, whIdx);
  const whS = ctx.samples[whIdx], whN = ctx.normals[whIdx];
  const wh = new THREE.Group();
  const whM = new THREE.MeshLambertMaterial({ color: 0xf7f5ef });
  const main = new THREE.Mesh(new THREE.BoxGeometry(36, 11, 15), whM); main.position.y = 5.5; main.castShadow = true; wh.add(main);
  wh.add(box(THREE, 39, 1.2, 17.5, 0xd9d5cc, 0, 11.4, 0));
  wh.add(box(THREE, 10, 5.5, 8, 0xefece5, -22, 2.75, 0)); wh.add(box(THREE, 10, 5.5, 8, 0xefece5, 22, 2.75, 0));
  const colM = new THREE.MeshLambertMaterial({ color: 0xffffff });
  for (let i = 0; i < 5; i++) { const col = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 8.6, 8), colM); col.position.set(-7.2 + i * 3.6, 4.3, 9.2); wh.add(col); }
  wh.add(box(THREE, 20, 1, 3.4, 0xefece5, 0, 9.1, 9.2)); // portico beam
  wh.add(box(THREE, 2.2, 4.4, 0.3, GOLD, 0, 2.2, 7.7, { mat: GOLDMAT })); // gold door, obviously
  wh.position.set(whS.x + whN.x * inw * 54, 0, whS.z + whN.z * inw * 54);
  wh.position.y = ctx.terrainHeightAt(wh.position.x, wh.position.z) - 0.2;
  wh.rotation.y = ctx.headingOf(ctx.tangents[whIdx]) + (inw > 0 ? Math.PI : 0);
  scene.add(wh);
  // black iron fence between the lawn and the road
  const fenceM = new THREE.MeshLambertMaterial({ color: 0x14151a });
  for (let i = -16; i <= 16; i++) {
    const idx = (whIdx + i * 2 + ctx.N) % ctx.N, s = ctx.samples[idx], n = ctx.normals[idx];
    const bar = new THREE.Mesh(new THREE.BoxGeometry(0.14, 2.6, 0.14), fenceM);
    const bx = s.x + n.x * inw * (HALF_W + 2.5), bz = s.z + n.z * inw * (HALF_W + 2.5);
    bar.position.set(bx, ctx.terrainHeightAt(bx, bz) + 1.3, bz); scene.add(bar);
    if (i % 8 === 0) { const rail = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.18, 9.5), fenceM); rail.position.copy(bar.position); rail.position.y = bar.position.y + 1.1; rail.rotation.y = ctx.headingOf(ctx.tangents[idx]); scene.add(rail); }
  }
  const noTouch = sign(THREE, textPanel(THREE, ['ABSOLUTELY NO TOUCHING', 'THE DEMOCRACY'], { w: 640, h: 220, bg: '#14213d', border: '#ffd94a', font: 48 }), 12, 4.2);
  { const { pos, sample } = atFrac(ctx, ((whIdx / ctx.N) + 0.035) % 1, inw * (HALF_W + 4.5)); noTouch.position.copy(pos); noTouch.position.y = ctx.terrainHeightAt(pos.x, pos.z) - 0.1; faceTrack(noTouch, sample); scene.add(noTouch); }

  /* ----- press pool: cameras on tripods at the fence ----- */
  const camM = new THREE.MeshLambertMaterial({ color: 0x22242a });
  for (let i = 0; i < 4; i++) {
    const idx = (whIdx - 22 + i * 4 + ctx.N) % ctx.N, s = ctx.samples[idx], n = ctx.normals[idx];
    const cam = new THREE.Group();
    cam.add(box(THREE, 0.9, 0.6, 1.5, 0x22242a, 0, 1.7, 0, { mat: camM }));
    for (const [lx, lz] of [[-0.4, -0.4], [0.4, -0.4], [0, 0.55]]) cam.add(box(THREE, 0.09, 1.5, 0.09, 0x22242a, lx, 0.75, lz, { mat: camM }));
    cam.position.set(s.x + n.x * inw * (HALF_W + 6.5), 0, s.z + n.z * inw * (HALF_W + 6.5));
    cam.position.y = ctx.terrainHeightAt(cam.position.x, cam.position.z);
    cam.lookAt(wh.position.x, 1.5, wh.position.z); scene.add(cam);
  }
  const pressSign = sign(THREE, textPanel(THREE, ['PRESS POOL', 'NO QUESTIONS'], { w: 512, h: 220, bg: '#14213d', border: '#f2f2f2', font: 54 }), 9, 3.8);
  { const { pos, sample } = atFrac(ctx, ((whIdx / ctx.N) - 0.035 + 1) % 1, inw * (HALF_W + 5)); pressSign.position.copy(pos); pressSign.position.y = ctx.terrainHeightAt(pos.x, pos.z) - 0.1; faceTrack(pressSign, sample); scene.add(pressSign); }

  /* ----- Reflecting Pool along the south straight: algae-green, ducks coping ----- */
  const poolIdx = nearestIdx(ctx, 0, 86), pin = inwardSign(ctx, poolIdx);
  const pS = ctx.samples[poolIdx], pN = ctx.normals[poolIdx];
  const poolC = new THREE.Vector3(pS.x + pN.x * pin * 47, 0, pS.z + pN.z * pin * 47);
  const poolYaw = ctx.headingOf(ctx.tangents[poolIdx]);
  const pool = new THREE.Group(); pool.position.copy(poolC); pool.position.y = ctx.terrainHeightAt(poolC.x, poolC.z) - 0.3; pool.rotation.y = poolYaw; scene.add(pool);
  pool.add(box(THREE, 176, 1.1, 21, 0xb9b2a4, 0, 0.55, 0)); // stone rim block
  const algae = new THREE.Mesh(new THREE.PlaneGeometry(168, 15.5), new THREE.MeshLambertMaterial({ color: 0x5f7d33 }));
  algae.rotation.x = -Math.PI / 2; algae.position.y = 1.13; pool.add(algae);
  const duckCols = [0xffd94a, 0xffd94a, 0xf2f2f2]; // two normal ducks, one in a hazmat suit
  for (let i = 0; i < 3; i++) {
    const duck = new THREE.Group();
    const body = new THREE.Mesh(new THREE.SphereGeometry(0.85, 10, 8), new THREE.MeshLambertMaterial({ color: duckCols[i] })); body.scale.set(1.25, 0.8, 0.9); body.position.y = 0.35; duck.add(body);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.42, 8, 6), new THREE.MeshLambertMaterial({ color: duckCols[i] })); head.position.set(0.75, 0.95, 0); duck.add(head);
    duck.add(box(THREE, 0.5, 0.16, 0.34, i === 2 ? 0x37c8ff : 0xff8c1a, 1.2, 0.9, 0)); // bill / hazmat visor
    duck.position.set(-52 + i * 47, 1.15, rand(-3.5, 3.5)); duck.rotation.y = rand(0, 6.28);
    pool.add(duck); bobs.push({ o: duck, ph: i * 2.1, amp: 0.1 });
  }
  const poolSign = sign(THREE, textPanel(THREE, ['NO SWIMMING — ALGAE'], { w: 640, h: 160, bg: '#274018', border: '#a8e063', font: 54 }), 11, 2.8);
  { const { pos, sample } = atFrac(ctx, ((poolIdx / ctx.N) + 0.045) % 1, pin * (HALF_W + 5)); poolSign.position.copy(pos); poolSign.position.y = ctx.terrainHeightAt(pos.x, pos.z) - 0.1; faceTrack(poolSign, sample); scene.add(poolSign); }
  const poolSign2 = sign(THREE, textPanel(THREE, ['POOL CLOSED (FOREVER?)'], { w: 640, h: 160, bg: '#274018', border: '#a8e063', font: 54 }), 11, 2.8);
  { const { pos, sample } = atFrac(ctx, ((poolIdx / ctx.N) - 0.045 + 1) % 1, pin * (HALF_W + 5)); poolSign2.position.copy(pos); poolSign2.position.y = ctx.terrainHeightAt(pos.x, pos.z) - 0.1; faceTrack(poolSign2, sample); scene.add(poolSign2); }

  /* ----- Washington Monument inside the west hairpin + flag ring ----- */
  const mon = new THREE.Group();
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 3.4, 34, 4), new THREE.MeshLambertMaterial({ color: 0xe8e2d4 }));
  shaft.position.y = 17; shaft.rotation.y = Math.PI / 4; shaft.castShadow = true; mon.add(shaft);
  const cap = new THREE.Mesh(new THREE.ConeGeometry(2.2, 3.6, 4), new THREE.MeshLambertMaterial({ color: 0xd9d5cc }));
  cap.position.y = 35.8; cap.rotation.y = Math.PI / 4; mon.add(cap);
  mon.add(box(THREE, 11, 1.4, 11, 0xb9b2a4, 0, 0.7, 0));
  { const mc = monumentCentre(tcLike);
    mon.position.set(mc.x, ctx.terrainHeightAt(mc.x, mc.z) + 0.1, mc.z); scene.add(mon); }
  const flagCols = [0xb22234, 0xffffff, 0x3c3b6e];
  for (let i = 0; i < 10; i++) {
    const a = i / 10 * Math.PI * 2;
    const fp = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 5.4, 5), new THREE.MeshLambertMaterial({ color: 0x8a8f96 }));
    const fx2 = mon.position.x + Math.sin(a) * 10.5, fz2 = mon.position.z + Math.cos(a) * 10.5;
    fp.position.set(fx2, ctx.terrainHeightAt(fx2, fz2) + 2.7, fz2); scene.add(fp);
    const fl = box(THREE, 1.8, 1.05, 0.06, flagCols[i % 3], fp.position.x + 0.9, 4.6, fp.position.z);
    fl.position.y = ctx.terrainHeightAt(fl.position.x, fl.position.z) + 4.6;
    scene.add(fl); tickers.push({ o: fl, ph: i * 0.9, kind: 'flag' });
  }
  const hairSign = sign(THREE, textPanel(THREE, ['HAIRPIN OF DEMOCRACY', 'BRAKE FOR FREEDOM'], { w: 640, h: 220, bg: '#14213d', border: '#ffd94a', font: 48 }), 12, 4.2);
  { const idx = nearestIdx(ctx, -282, -40), s = ctx.samples[idx], n = ctx.normals[idx];
    const hx = s.x - n.x * (HALF_W + 6), hz = s.z - n.z * (HALF_W + 6); // the hairpin bowl is sunken — the sign stands on the bowl's slope (terrainHeightAt is guaranteed by the #59 terrain contract), tucked 0.1 under the surface
    hairSign.position.set(hx, ctx.terrainHeightAt(hx, hz) - 0.1, hz); faceTrack(hairSign, s); scene.add(hairSign); }


  /* ----- THE BALLROOM construction zone, outside the north-east curve ----- */
  const zone = new THREE.Group();
  const zIdx = nearestIdx(ctx, 278, -20), zS = ctx.samples[zIdx], zN = ctx.normals[zIdx];
  const zOut = -inwardSign(ctx, zIdx);
  zone.position.set(zS.x + zN.x * zOut * 52, 0, zS.z + zN.z * zOut * 52);
  zone.position.y = ctx.terrainHeightAt(zone.position.x, zone.position.z) - 0.1;
  zone.rotation.y = ctx.headingOf(ctx.tangents[zIdx]) + (zOut > 0 ? 0 : Math.PI);
  scene.add(zone);
  zone.add(box(THREE, 74, 0.3, 46, 0xa89c86, 0, 0.15, 0)); // gravel pad
  // half-built ballroom skeleton: white columns, partial roof, GOLD scaffolding
  const colWM = new THREE.MeshLambertMaterial({ color: 0xf7f5ef });
  for (let i = 0; i < 6; i++) { const c = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.7, 12, 8), colWM); c.position.set(-20 + i * 8, 6, -8); zone.add(c); }
  for (let i = 0; i < 4; i++) { const c = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.7, 12, 8), colWM); c.position.set(-20 + i * 8, 6, 8); zone.add(c); }
  zone.add(box(THREE, 46, 1.1, 20, 0xefece5, -4, 12.4, 0)); // roof slab, only partly on
  const scafM = GOLDMAT;
  for (let lvl = 0; lvl < 3; lvl++) for (const sx of [-24, -12, 0, 12, 24]) zone.add(box(THREE, 0.28, 0.28, 24, GOLD, sx, 3 + lvl * 3.4, 13.5, { mat: scafM }));
  for (const sx of [-24, -12, 0, 12, 24]) zone.add(box(THREE, 0.28, 10.5, 0.28, GOLD, sx, 5.25, 13.5, { mat: scafM }));
  zone.add(box(THREE, 50, 0.5, 3, 0xc8b28a, 0, 1.8, 13.5)); // scaffold deck
  // rubble where the East Wing was + excavator nodding over it
  const rubM = new THREE.MeshLambertMaterial({ color: 0x8d8578 });
  for (let i = 0; i < 9; i++) { const r = new THREE.Mesh(new THREE.DodecahedronGeometry(rand(0.9, 2.1)), rubM); r.position.set(18 + rand(-6, 8), 0.8, rand(-12, 12)); r.rotation.set(rand(0, 3), rand(0, 3), 0); zone.add(r); }
  const exc = new THREE.Group();
  exc.add(box(THREE, 4.6, 1.1, 3.2, 0x33373d, 0, 0.55, 0));
  exc.add(box(THREE, 3.4, 1.9, 2.8, 0xf2b01e, 0, 2, 0, { shadow: true }));
  excavArm = new THREE.Group(); excavArm.position.set(1.6, 2.9, 0);
  const boom = box(THREE, 5.6, 0.7, 0.6, 0xf2b01e, 2.6, 0.7, 0); boom.rotation.z = 0.5; excavArm.add(boom);
  const bucket = box(THREE, 1.3, 0.9, 1.1, 0x33373d, 5.6, -0.6, 0); excavArm.add(bucket);
  exc.add(excavArm); exc.position.set(13, 0.3, -13); exc.rotation.y = -0.7; zone.add(exc);
  // cranes — one slewing slowly
  function crane(x, z, slew) {
    const g = new THREE.Group();
    g.add(box(THREE, 3.4, 26, 3.4, 0xd8b13a, 0, 13, 0));
    const jib = new THREE.Group(); jib.position.y = 25.4;
    jib.add(box(THREE, 30, 1, 1, 0xd8b13a, 9, 0, 0)); jib.add(box(THREE, 9, 1, 1, 0xd8b13a, -8.5, 0, 0));
    jib.add(box(THREE, 2.6, 2.2, 2.2, 0x8d8578, -12, -0.6, 0));
    const cable = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 13, 4), new THREE.MeshLambertMaterial({ color: 0x22242a }));
    cable.position.set(19, -6.5, 0); jib.add(cable);
    jib.add(box(THREE, 3.2, 1.8, 2.4, GOLD, 19, -13.6, 0, { mat: GOLDMAT })); // lifting a gold panel, naturally
    g.add(jib); g.position.set(x, 0, z); zone.add(g);
    if (slew) craneJib = jib;
  }
  crane(-16, -14, true); crane(24, 10, false);
  // gold porta-cabin + site signs
  zone.add(box(THREE, 7, 3.1, 3, GOLD, -26, 1.55, 14, { mat: GOLDMAT, shadow: true }));
  const zoneSign = sign(THREE, textPanel(THREE, ['COMING SOON: BALLROOM', '$300M (PRIVATELY FUNDED, ALLEGEDLY)'], { w: 896, h: 256, bg: '#14213d', border: '#d4af37', font: 50 }), 19, 5.4);
  zoneSign.position.set(0, 0, -25); zoneSign.rotation.y = Math.PI; zone.add(zoneSign);
  const dustSign = sign(THREE, textPanel(THREE, ['PARDON OUR GOLD DUST'], { w: 640, h: 144, bg: '#14213d', border: '#d4af37', font: 52 }), 11, 2.6);
  dustSign.position.set(-20, 0, -24); dustSign.rotation.y = Math.PI; zone.add(dustSign);
  // chain-link fence around the zone (transparent grid texture)
  const fc = document.createElement('canvas'); fc.width = 128; fc.height = 128;
  { const g2 = fc.getContext('2d'); g2.clearRect(0, 0, 128, 128); g2.strokeStyle = 'rgba(200,205,212,0.9)'; g2.lineWidth = 3;
    for (let i = -128; i < 256; i += 16) { g2.beginPath(); g2.moveTo(i, 0); g2.lineTo(i + 128, 128); g2.stroke(); g2.beginPath(); g2.moveTo(i + 128, 0); g2.lineTo(i, 128); g2.stroke(); } }
  const fenceTex = new THREE.CanvasTexture(fc); fenceTex.wrapS = fenceTex.wrapT = THREE.RepeatWrapping; fenceTex.repeat.set(10, 1);
  const fenceMat = new THREE.MeshLambertMaterial({ map: fenceTex, transparent: true, side: THREE.DoubleSide, alphaTest: 0.1 });
  for (const [w, d, x, z, ry] of [[76, 0, 0, -23.5, 0], [76, 0, 0, 23.5, 0], [0, 47, -38, 0, Math.PI / 2], [0, 47, 38, 0, Math.PI / 2]]) {
    const f = new THREE.Mesh(new THREE.PlaneGeometry(Math.max(w, d), 3.1), fenceMat);
    f.position.set(x, 1.55, z); f.rotation.y = ry; zone.add(f);
  }
  const eastSign = sign(THREE, textPanel(THREE, ['EAST WING (DEMOLISHED) →'], { w: 768, h: 160, bg: '#14213d', border: '#ffd94a', font: 52 }), 13, 2.8);
  { const { pos, sample } = atFrac(ctx, ((zIdx / ctx.N) + 0.03) % 1, zOut * (HALF_W + 5)); eastSign.position.copy(pos); eastSign.position.y = ctx.terrainHeightAt(pos.x, pos.z) - 0.1; faceTrack(eastSign, sample); scene.add(eastSign); }

  /* ----- tour-group crowd blobs near the monument + gold-rope VIP stand at start ----- */
  const crowdCols = [0xd23b2e, 0x1877f2, 0xffd94a, 0x2e7d32, 0xf2f2f2, 0xff8c1a, 0x9b59d0];
  for (let i = 0; i < 12; i++) {
    const person = new THREE.Group();
    person.add(box(THREE, 0.62, 1.05, 0.4, crowdCols[i % crowdCols.length], 0, 0.55, 0));
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.3, 8, 6), new THREE.MeshLambertMaterial({ color: 0xeec39a })); head.position.y = 1.32; person.add(head);
    const a = rand(0, Math.PI * 2), r = rand(13, 19);
    const px3 = mon.position.x + Math.sin(a) * r, pz3 = mon.position.z + Math.cos(a) * r;
    person.position.set(px3, ctx.terrainHeightAt(px3, pz3), pz3);
    scene.add(person); tickers.push({ o: person, ph: Math.random() * 6, kind: 'bob', base: person.position.y });
  }
  const vip = new THREE.Group();
  for (let i = 0; i < 5; i++) {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.2, 1.15, 8), GOLDMAT);
    post.position.set(i * 2.6 - 5.2, 0.58, 0); vip.add(post);
    const knob = new THREE.Mesh(new THREE.SphereGeometry(0.2, 8, 6), GOLDMAT); knob.position.set(i * 2.6 - 5.2, 1.2, 0); vip.add(knob);
    if (i < 4) { const rope = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 2.6, 5), new THREE.MeshLambertMaterial({ color: 0x8c1d18 })); rope.rotation.z = Math.PI / 2; rope.position.set(i * 2.6 - 3.9, 0.98, 0); vip.add(rope); }
  }
  const vipSign = new THREE.Mesh(new THREE.PlaneGeometry(8.5, 1.9), new THREE.MeshLambertMaterial({ map: textPanel(THREE, ['VIP — DONORS ONLY'], { w: 512, h: 128, bg: '#14213d', border: '#d4af37', font: 52 }), side: THREE.DoubleSide }));
  vipSign.position.set(0, 2.6, 0); vip.add(vipSign);
  { const { pos, sample } = atFrac(ctx, 0.03, HALF_W + 7); vip.position.copy(pos); vip.position.y = ctx.terrainHeightAt(pos.x, pos.z) - 0.05; faceTrack(vip, sample); scene.add(vip); }

  /* ----- sculpted tree rows lining the Mall (the Moo Moo move): instanced
     round canopies, green with a cherry-blossom minority, seated on the lawns ----- */
  { const spots = [];
    const zFrac = (zIdx / ctx.N + 1) % 1;
    for (let i = 0; i < ctx.N; i += 20) {
      const f = i / ctx.N;
      if (f < 0.045 || Math.abs(f - zFrac) < 0.055) continue; // keep the start + Ballroom zone clear
      for (const side of [-1, 1]) {
        const s = ctx.samples[i], n = ctx.normals[i];
        const lat = side * (HALF_W + rand(15, 24));
        spots.push({ x: s.x + n.x * lat, z: s.z + n.z * lat, s: rand(0.95, 1.65) });
      }
    }
    const trunks = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.3, 0.52, 2.9, 7), new THREE.MeshLambertMaterial({ color: 0x7a4a21 }), spots.length);
    const canopies = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(2.7, 0), new THREE.MeshLambertMaterial({ color: 0xffffff }), spots.length);
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), eu = new THREE.Euler(), v = new THREE.Vector3(), sc = new THREE.Vector3(), col = new THREE.Color();
    spots.forEach((sp, i) => {
      const gy = ctx.terrainHeightAt(sp.x, sp.z) - 0.15;
      eu.set(rand(-0.04, 0.04), rand(0, 6.28), rand(-0.04, 0.04)); q.setFromEuler(eu);
      sc.set(sp.s, sp.s, sp.s); m4.compose(v.set(sp.x, gy + 1.45 * sp.s, sp.z), q, sc); trunks.setMatrixAt(i, m4);
      sc.set(sp.s, sp.s * 0.82, sp.s); m4.compose(v.set(sp.x, gy + (2.9 + 2.0) * sp.s, sp.z), q, sc); canopies.setMatrixAt(i, m4);
      if (i % 5 === 4) col.set(0xf0aec6); // cherry blossom
      else col.setHSL(0.29 + rand(-0.02, 0.02), 0.5, rand(0.24, 0.36));
      canopies.setColorAt(i, col);
    });
    trunks.castShadow = canopies.castShadow = true;
    scene.add(trunks, canopies);
  }

  return {
    update(dt, t) {
      for (const b of bobs) { if (b.base === undefined) b.base = b.o.position.y; b.o.position.y = b.base + Math.sin(t * 1.6 + b.ph) * b.amp; }
      for (const tk of tickers) {
        if (tk.kind === 'flag') tk.o.rotation.y = Math.sin(t * 3 + tk.ph) * 0.4;
        else tk.o.position.y = (tk.base || 0) + Math.abs(Math.sin(t * 2 + tk.ph)) * 0.07;
      }
      if (craneJib) craneJib.rotation.y = Math.sin(t * 0.11) * 0.8;
      if (excavArm) excavArm.rotation.z = Math.sin(t * 0.7) * 0.16 - 0.05;
    },
  };
}
