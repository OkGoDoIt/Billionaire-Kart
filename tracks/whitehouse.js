/* Billionaire Kart — White House GP (Batch 1, issue #10)
   Self-contained track module: exports the track definition in the exact shape
   game.js consumes (TRACKS entry) plus a dressing builder. See datacenter.js
   for the ctx contract — identical. A National Mall loop: Reflecting Pool
   straights, a hairpin around the Monument, and the Ballroom construction
   zone where the East Wing used to be. Gold. So much gold. */

export const def = {
  name: 'White House GP', sky: 0x9fd3ee, fog: 0xcfe5ef, ground: 0x4e8f3f, roadSeed: 5,
  points: [[269,-60],[134,-95],[-45,-100],[-213,-95],[-282,-40],[-289,10],[-267,58],[-190,80],[-67,88],[45,84],[123,60],[168,95],[241,88],[282,40],[278,-20]],
};

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
function atFrac(ctx, frac, lat, y = 0) {
  const i = Math.floor(frac * ctx.N) % ctx.N, s = ctx.samples[i], n = ctx.normals[i];
  return { pos: new ctx.THREE.Vector3(s.x + n.x * lat, y, s.z + n.z * lat), idx: i, sample: s };
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
  wh.rotation.y = ctx.headingOf(ctx.tangents[whIdx]) + (inw > 0 ? Math.PI : 0);
  scene.add(wh);
  // black iron fence between the lawn and the road
  const fenceM = new THREE.MeshLambertMaterial({ color: 0x14151a });
  for (let i = -16; i <= 16; i++) {
    const idx = (whIdx + i * 2 + ctx.N) % ctx.N, s = ctx.samples[idx], n = ctx.normals[idx];
    const bar = new THREE.Mesh(new THREE.BoxGeometry(0.14, 2.6, 0.14), fenceM);
    bar.position.set(s.x + n.x * inw * (HALF_W + 2.5), 1.3, s.z + n.z * inw * (HALF_W + 2.5)); scene.add(bar);
    if (i % 8 === 0) { const rail = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.18, 9.5), fenceM); rail.position.copy(bar.position); rail.position.y = 2.4; rail.rotation.y = ctx.headingOf(ctx.tangents[idx]); scene.add(rail); }
  }
  const noTouch = sign(THREE, textPanel(THREE, ['ABSOLUTELY NO TOUCHING', 'THE DEMOCRACY'], { w: 640, h: 220, bg: '#14213d', border: '#ffd94a', font: 48 }), 12, 4.2);
  { const { pos, sample } = atFrac(ctx, ((whIdx / ctx.N) + 0.035) % 1, inw * (HALF_W + 4.5)); noTouch.position.copy(pos); faceTrack(noTouch, sample); scene.add(noTouch); }

  /* ----- press pool: cameras on tripods at the fence ----- */
  const camM = new THREE.MeshLambertMaterial({ color: 0x22242a });
  for (let i = 0; i < 4; i++) {
    const idx = (whIdx - 22 + i * 4 + ctx.N) % ctx.N, s = ctx.samples[idx], n = ctx.normals[idx];
    const cam = new THREE.Group();
    cam.add(box(THREE, 0.9, 0.6, 1.5, 0x22242a, 0, 1.7, 0, { mat: camM }));
    for (const [lx, lz] of [[-0.4, -0.4], [0.4, -0.4], [0, 0.55]]) cam.add(box(THREE, 0.09, 1.5, 0.09, 0x22242a, lx, 0.75, lz, { mat: camM }));
    cam.position.set(s.x + n.x * inw * (HALF_W + 6.5), 0, s.z + n.z * inw * (HALF_W + 6.5));
    cam.lookAt(wh.position.x, 1.5, wh.position.z); scene.add(cam);
  }
  const pressSign = sign(THREE, textPanel(THREE, ['PRESS POOL', 'NO QUESTIONS'], { w: 512, h: 220, bg: '#14213d', border: '#f2f2f2', font: 54 }), 9, 3.8);
  { const { pos, sample } = atFrac(ctx, ((whIdx / ctx.N) - 0.035 + 1) % 1, inw * (HALF_W + 5)); pressSign.position.copy(pos); faceTrack(pressSign, sample); scene.add(pressSign); }

  /* ----- Reflecting Pool along the south straight: algae-green, ducks coping ----- */
  const poolIdx = nearestIdx(ctx, 0, 86), pin = inwardSign(ctx, poolIdx);
  const pS = ctx.samples[poolIdx], pN = ctx.normals[poolIdx];
  const poolC = new THREE.Vector3(pS.x + pN.x * pin * 47, 0, pS.z + pN.z * pin * 47);
  const poolYaw = ctx.headingOf(ctx.tangents[poolIdx]);
  const pool = new THREE.Group(); pool.position.copy(poolC); pool.rotation.y = poolYaw; scene.add(pool);
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
  { const { pos, sample } = atFrac(ctx, ((poolIdx / ctx.N) + 0.045) % 1, pin * (HALF_W + 5)); poolSign.position.copy(pos); faceTrack(poolSign, sample); scene.add(poolSign); }
  const poolSign2 = sign(THREE, textPanel(THREE, ['POOL CLOSED (FOREVER?)'], { w: 640, h: 160, bg: '#274018', border: '#a8e063', font: 54 }), 11, 2.8);
  { const { pos, sample } = atFrac(ctx, ((poolIdx / ctx.N) - 0.045 + 1) % 1, pin * (HALF_W + 5)); poolSign2.position.copy(pos); faceTrack(poolSign2, sample); scene.add(poolSign2); }

  /* ----- Washington Monument inside the west hairpin + flag ring ----- */
  const mon = new THREE.Group();
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 3.4, 34, 4), new THREE.MeshLambertMaterial({ color: 0xe8e2d4 }));
  shaft.position.y = 17; shaft.rotation.y = Math.PI / 4; shaft.castShadow = true; mon.add(shaft);
  const cap = new THREE.Mesh(new THREE.ConeGeometry(2.2, 3.6, 4), new THREE.MeshLambertMaterial({ color: 0xd9d5cc }));
  cap.position.y = 35.8; cap.rotation.y = Math.PI / 4; mon.add(cap);
  mon.add(box(THREE, 11, 1.4, 11, 0xb9b2a4, 0, 0.7, 0));
  { const idx = nearestIdx(ctx, -215, 8), s = ctx.samples[idx], n = ctx.normals[idx];
    const inwM = inwardSign(ctx, idx);
    mon.position.set(s.x + n.x * inwM * 52, 0, s.z + n.z * inwM * 52); scene.add(mon); }
  const flagCols = [0xb22234, 0xffffff, 0x3c3b6e];
  for (let i = 0; i < 10; i++) {
    const a = i / 10 * Math.PI * 2;
    const fp = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 5.4, 5), new THREE.MeshLambertMaterial({ color: 0x8a8f96 }));
    fp.position.set(mon.position.x + Math.sin(a) * 10.5, 2.7, mon.position.z + Math.cos(a) * 10.5); scene.add(fp);
    const fl = box(THREE, 1.8, 1.05, 0.06, flagCols[i % 3], fp.position.x + 0.9, 4.6, fp.position.z);
    scene.add(fl); tickers.push({ o: fl, ph: i * 0.9, kind: 'flag' });
  }
  const hairSign = sign(THREE, textPanel(THREE, ['HAIRPIN OF DEMOCRACY', 'BRAKE FOR FREEDOM'], { w: 640, h: 220, bg: '#14213d', border: '#ffd94a', font: 48 }), 12, 4.2);
  { const idx = nearestIdx(ctx, -282, -40), s = ctx.samples[idx], n = ctx.normals[idx];
    hairSign.position.set(s.x - n.x * (HALF_W + 6), 0, s.z - n.z * (HALF_W + 6)); faceTrack(hairSign, s); scene.add(hairSign); }

  /* ----- THE BALLROOM construction zone, outside the north-east curve ----- */
  const zone = new THREE.Group();
  const zIdx = nearestIdx(ctx, 278, -20), zS = ctx.samples[zIdx], zN = ctx.normals[zIdx];
  const zOut = -inwardSign(ctx, zIdx);
  zone.position.set(zS.x + zN.x * zOut * 52, 0, zS.z + zN.z * zOut * 52);
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
  { const { pos, sample } = atFrac(ctx, ((zIdx / ctx.N) + 0.03) % 1, zOut * (HALF_W + 5)); eastSign.position.copy(pos); faceTrack(eastSign, sample); scene.add(eastSign); }

  /* ----- tour-group crowd blobs near the monument + gold-rope VIP stand at start ----- */
  const crowdCols = [0xd23b2e, 0x1877f2, 0xffd94a, 0x2e7d32, 0xf2f2f2, 0xff8c1a, 0x9b59d0];
  for (let i = 0; i < 12; i++) {
    const person = new THREE.Group();
    person.add(box(THREE, 0.62, 1.05, 0.4, crowdCols[i % crowdCols.length], 0, 0.55, 0));
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.3, 8, 6), new THREE.MeshLambertMaterial({ color: 0xeec39a })); head.position.y = 1.32; person.add(head);
    const a = rand(0, Math.PI * 2), r = rand(13, 19);
    person.position.set(mon.position.x + Math.sin(a) * r, 0, mon.position.z + Math.cos(a) * r);
    scene.add(person); tickers.push({ o: person, ph: Math.random() * 6, kind: 'bob' });
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
  { const { pos, sample } = atFrac(ctx, 0.03, HALF_W + 7); vip.position.copy(pos); faceTrack(vip, sample); scene.add(vip); }

  return {
    update(dt, t) {
      for (const b of bobs) { if (b.base === undefined) b.base = b.o.position.y; b.o.position.y = b.base + Math.sin(t * 1.6 + b.ph) * b.amp; }
      for (const tk of tickers) {
        if (tk.kind === 'flag') tk.o.rotation.y = Math.sin(t * 3 + tk.ph) * 0.4;
        else tk.o.position.y = Math.abs(Math.sin(t * 2 + tk.ph)) * 0.07;
      }
      if (craneJib) craneJib.rotation.y = Math.sin(t * 0.11) * 0.8;
      if (excavArm) excavArm.rotation.z = Math.sin(t * 0.7) * 0.16 - 0.05;
    },
  };
}
