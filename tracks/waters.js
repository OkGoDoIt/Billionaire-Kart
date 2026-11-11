/* Billionaire Kart — International Waters GP (Batch 1, issue #10)
   Self-contained track module: exports the track definition in the exact shape
   game.js consumes (TRACKS entry) plus a dressing builder. See datacenter.js
   for the ctx contract — identical. Golden hour over open water: the ground
   disc IS the sea (def.ground is turquoise), the road rides a boardwalk oval.
   Everything floats, so almost everything bobs. */

export const def = {
  name: 'International Waters GP', sky: 0xffc37e, fog: 0xffd2a0, ground: 0x1fa8a0, roadSeed: 4,
  shoulder: 0xc9a06c, apron: 0xbfae8e, sandGround: true, groundTint: 0x7d9b84,
  points: [[0,-190],[150,-160],[245,-70],[255,40],[190,130],[90,180],[-30,190],[-150,160],[-240,80],[-255,-30],[-200,-120],[-110,-175]],
  // HAND-AUTHORED profiles (docs/track-design-waters.md) — keyframes [u, value]:
  // elev = road height in metres; bank = cross-slope in degrees (+ banks a RIGHT
  // turn — and this harbour oval turns right all the way around, so the bank
  // never changes sign; it breathes with the sweeper radii instead).
  elev: [[0, 0], [0.04, 0], [0.10, 1.0], [0.16, 2.0], [0.24, 3.0], [0.30, 5.0], [0.36, 8.0], [0.42, 6.2], [0.48, 5.2], [0.52, 6.0], [0.585, 3.5], [0.65, 4.0], [0.70, 5.0], [0.78, 3.6], [0.86, 2.0], [0.93, 0.8], [0.97, 0]],
  bank: [[0, 0], [0.05, 0], [0.10, 3], [0.15, 4], [0.20, 8], [0.245, 4], [0.283, 9], [0.32, 5], [0.40, 3], [0.50, 3], [0.60, 4], [0.66, 5], [0.692, 8], [0.73, 5], [0.778, 8], [0.83, 4], [0.90, 2], [0.96, 0]],
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
function sign(THREE, tex, w, h, postColor = 0x5a4632) {
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
function atFrac(ctx, frac, lat, y = null) { // default y = real terrain/sea-surface height (TRACK 3D profiles)
  const i = Math.floor(frac * ctx.N) % ctx.N, s = ctx.samples[i], n = ctx.normals[i];
  const x = s.x + n.x * lat, z = s.z + n.z * lat;
  return { pos: new ctx.THREE.Vector3(x, y === null ? (ctx.terrainHeightAt ? ctx.terrainHeightAt(x, z) : 0) : y, z), idx: i, sample: s };
}
function faceTrack(obj, sample) { obj.lookAt(sample.x, 0, sample.z); }

/* ---------- world-build terrain (issue #59) ----------
   The far field here is a SEABED: game.js blends the banked causeway plane
   down to it, and the animated water plane (in dress) sits at WATER_Y between
   the two. Islands are authored gaussian bumps that rise out of the sea. */
export const WATER_Y = -0.55;
function gauss(x, z, cx, cz, r, h) { const dx = x - cx, dz = z - cz; return h * Math.exp(-(dx * dx + dz * dz) / (r * r)); }
function vnoise(x, z, s) { return Math.sin(x * s + Math.sin(z * s * 1.7) * 2.1) * Math.cos(z * s * 0.83 + Math.sin(x * s * 1.3) * 1.7); }
function inwardPoint(tc, x, z, dist) {
  const i = nearestIdx(tc, x, z), s = tc.samples[i], n = tc.normals[i];
  const inw = ((tc.center.x - s.x) * n.x + (tc.center.z - s.z) * n.z) > 0 ? 1 : -1;
  return { x: s.x + n.x * inw * dist, z: s.z + n.z * inw * dist };
}
export function seasteadCentre(tc) { return inwardPoint(tc, -120, 60, 58); } // shared by terrainField + dress()
export function lighthouseIsle(tc) { return { x: tc.center.x + 350, z: tc.center.z - 210 }; }
export function terrainField(x, z, tc) {
  const c = tc.center;
  let h = -3.4 + vnoise(x, z, 0.02) * 0.5;                       // seabed swell
  const st = seasteadCentre(tc);
  h += gauss(x, z, st.x, st.z, 34, 4.6);                          // seastead island (shore ≈ +1.2 at centre)
  const li = lighthouseIsle(tc);
  h += gauss(x, z, li.x, li.z, 95, 6.8);                          // lighthouse island, peak ≈ +3.4
  h += gauss(x, z, c.x - 370, c.z + 250, 80, 5.6);                // south-west islet, peak ≈ +2.2
  h += gauss(x, z, c.x + 60, c.z + 330, 120, 5.2);                // southern sandbank, peak ≈ +1.8
  return h;
}

/* A procedural superyacht. length L along local +z, name board on both flanks. */
function yacht(THREE, L, nameLines, accent) {
  const g = new THREE.Group();
  const W = L * 0.21;
  const hullM = new THREE.MeshLambertMaterial({ color: 0xf4f6f8 });
  const hull = new THREE.Mesh(new THREE.BoxGeometry(W, L * 0.10, L * 0.78), hullM); hull.position.set(0, L * 0.05, -L * 0.08); hull.castShadow = true; g.add(hull);
  const bow = new THREE.Mesh(new THREE.ConeGeometry(W * 0.5, L * 0.24, 4), hullM);
  bow.rotation.x = Math.PI / 2; bow.rotation.y = Math.PI / 4; bow.scale.set(1, 1, 0.55); bow.position.set(0, L * 0.05, L * 0.43); g.add(bow);
  const stripe = box(THREE, W + 0.15, L * 0.025, L * 0.8, accent, 0, L * 0.028, -L * 0.07); g.add(stripe);
  const deckM = new THREE.MeshLambertMaterial({ color: 0xffffff });
  const d1 = new THREE.Mesh(new THREE.BoxGeometry(W * 0.86, L * 0.07, L * 0.52), deckM); d1.position.set(0, L * 0.135, -L * 0.1); d1.castShadow = true; g.add(d1);
  const d2 = new THREE.Mesh(new THREE.BoxGeometry(W * 0.68, L * 0.06, L * 0.36), deckM); d2.position.set(0, L * 0.20, -L * 0.13); g.add(d2);
  const d3 = new THREE.Mesh(new THREE.BoxGeometry(W * 0.48, L * 0.05, L * 0.22), deckM); d3.position.set(0, L * 0.255, -L * 0.15); g.add(d3);
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.24, L * 0.16, 6), new THREE.MeshLambertMaterial({ color: 0x33373d }));
  mast.position.set(0, L * 0.34, -L * 0.16); g.add(mast);
  const radar = box(THREE, W * 0.3, 0.3, 0.5, 0x33373d, 0, L * 0.40, -L * 0.16); g.add(radar);
  const boardTex = textPanel(THREE, nameLines, { w: 640, h: 128, bg: '#101736', border: '#ffd94a', font: 54 });
  for (const sx of [-1, 1]) {
    const board = new THREE.Mesh(new THREE.PlaneGeometry(L * 0.44, L * 0.088), new THREE.MeshLambertMaterial({ map: boardTex }));
    board.position.set(sx * (W / 2 + 0.06), L * 0.055, -L * 0.08); board.rotation.y = sx * Math.PI / 2; g.add(board);
  }
  g.userData.radar = radar;
  return g;
}

/* ============================== DRESSING ============================== */
export function dress(ctx) {
  const { THREE, scene, HALF_W, rand } = ctx;
  const bobs = [], flags = [];
  let radar = null;

  const centroid = new THREE.Vector3();
  ctx.samples.forEach(s => centroid.add(s)); centroid.divideScalar(ctx.N);

  /* ----- centrepiece: the biggest yacht, anchored mid-oval ----- */
  const mega = yacht(THREE, 98, ['S.S. EXTRADITION DENIED'], 0xd4af37);

  mega.position.set(centroid.x + 6, WATER_Y, centroid.z + 4); mega.rotation.y = 0.5;

  scene.add(mega); bobs.push({ o: mega, ph: 0.4, amp: 0.5, roll: 0.012 });

  /* ----- Ellison's yacht (bigger) vs Murdoch's (dishes) ----- */
  const ell = yacht(THREE, 64, ['S.S. HOSTILE TAKEOVER'], 0xb01e24);
  { const f = 0.30, { pos } = atFrac(ctx, f, HALF_W + 58); ell.position.copy(pos); ell.position.y = WATER_Y; ell.rotation.y = ctx.headingOf(ctx.tangents[Math.floor(f * ctx.N) % ctx.N]); scene.add(ell); }
  bobs.push({ o: ell, ph: 1.7, amp: 0.45, roll: 0.016 });
  radar = ell.userData.radar;
  const mur = yacht(THREE, 59, ['S.S. ALL NEWS, ALL MINE'], 0x6e1423); // 8% shorter. He has people for that.
  { const f = 0.68, { pos } = atFrac(ctx, f, HALF_W + 56); mur.position.copy(pos); mur.position.y = WATER_Y; mur.rotation.y = ctx.headingOf(ctx.tangents[Math.floor(f * ctx.N) % ctx.N]) + Math.PI; scene.add(mur); }
  bobs.push({ o: mur, ph: 3.1, amp: 0.45, roll: 0.016 });
  const dishM = new THREE.MeshLambertMaterial({ color: 0xe8ecf0 });
  for (let i = 0; i < 5; i++) { // satellite dishes — all news, all his
    const dish = new THREE.Mesh(new THREE.SphereGeometry(rand(1.1, 1.7), 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), dishM);
    dish.position.set(rand(-3.4, 3.4), 59 * 0.24 + rand(0, 1.4), -59 * 0.24 + i * 3.1);
    dish.rotation.x = -0.7; dish.rotation.z = rand(-0.4, 0.4); mur.add(dish);
    const stalk = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 1.1, 5), dishM);
    stalk.position.copy(dish.position); stalk.position.y -= 0.5; mur.add(stalk);
  }

  /* ----- start-line buoy sign: the whole premise, on two floats ----- */
  const buoySign = sign(THREE, textPanel(THREE, ['12 NAUTICAL MILES OUT', 'BEYOND THIS POINT, TAXES ARE', 'A SOCIAL CONSTRUCT'], { w: 768, h: 300, font: 46 }), 17, 6.6);

  { const { pos, sample } = atFrac(ctx, 0.015, HALF_W + 9); buoySign.position.copy(pos); buoySign.position.y = WATER_Y - 0.35; faceTrack(buoySign, sample); scene.add(buoySign); }

  bobs.push({ o: buoySign, ph: 2.2, amp: 0.22, roll: 0.02 });

  /* ----- seastead platform inside the west of the oval ----- */
  const plat = new THREE.Group();
  const deckM = new THREE.MeshLambertMaterial({ color: 0x8a6f4d });
  const deck = new THREE.Mesh(new THREE.CylinderGeometry(27, 27, 1.6, 6), deckM); deck.position.y = 1.6; deck.castShadow = true; plat.add(deck);
  const pyM = new THREE.MeshLambertMaterial({ color: 0x5d6a72 });
  for (let a = 0; a < 6; a++) { const py = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.8, 3.4, 6), pyM); py.position.set(Math.sin(a * Math.PI / 3) * 21, 0, Math.cos(a * Math.PI / 3) * 21); plat.add(py); }
  const hutCols = [0xf2f2f2, 0xffd94a, 0x87c9eb, 0xf2a65a, 0xd8dde2];
  for (let i = 0; i < 6; i++) {
    const a = i / 6 * Math.PI * 2, r = rand(11, 17);
    const hut = box(THREE, rand(5, 7.5), rand(3, 4.4), rand(5, 7), hutCols[i % hutCols.length], Math.sin(a) * r, 2.4 + 1.4, Math.cos(a) * r, { ry: a, shadow: true });
    plat.add(hut);
    plat.add(box(THREE, hut.geometry.parameters.width + 0.8, 0.3, hut.geometry.parameters.depth + 0.8, 0x33373d, hut.position.x, 2.4 + 1.4 + hut.geometry.parameters.height / 2 + 0.4, hut.position.z, { ry: a }));
  }
  const atm = box(THREE, 1.6, 2.6, 1.2, 0x1c2a4a, 4, 3.7, 6); plat.add(atm);
  const atmSign = new THREE.Mesh(new THREE.PlaneGeometry(3.6, 1.8), new THREE.MeshLambertMaterial({ map: textPanel(THREE, ['₿ CRYPTO ONLY', 'NO REFUNDS · NO COUNTRY'], { w: 512, h: 256, bg: '#101736', border: '#f7931a', font: 44 }), side: THREE.DoubleSide }));
  atmSign.position.set(4, 6.4, 6); plat.add(atmSign);
  const platSign = new THREE.Mesh(new THREE.PlaneGeometry(15, 3.4), new THREE.MeshLambertMaterial({ map: textPanel(THREE, ['NO LAWS, JUST VIBES'], { w: 640, h: 144, bg: '#0b3d4a', border: '#7fdcff', font: 58 }), side: THREE.DoubleSide }));
  platSign.position.set(0, 7.6, -24); platSign.rotation.y = Math.PI; plat.add(platSign);
  const poleM = new THREE.MeshLambertMaterial({ color: 0x33373d });
  const pPole = new THREE.Mesh(new THREE.BoxGeometry(0.35, 5.4, 0.35), poleM); pPole.position.set(0, 4.8, -24); plat.add(pPole);
  for (let i = 0; i < 4; i++) { // little flags around the platform rim
    const fp = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 4.6, 5), poleM);
    const a = i / 4 * Math.PI * 2 + 0.4; fp.position.set(Math.sin(a) * 25, 4.6, Math.cos(a) * 25); plat.add(fp);
    const flag = box(THREE, 1.9, 1.1, 0.06, [0xffd94a, 0x37c8ff, 0xff6b9d, 0x7dff6a][i], fp.position.x + 0.95, 6.4, fp.position.z);
    plat.add(flag); flags.push({ o: flag, ph: i * 1.3 });
  }

  { const stc = seasteadCentre({ samples: ctx.samples, normals: ctx.normals, N: ctx.N, center: centroid });
    plat.position.set(stc.x, 0, stc.z); scene.add(plat); }

  bobs.push({ o: plat, ph: 0.9, amp: 0.18, roll: 0.006 });

  /* ----- channel buoys ringing the course ----- */
  const buoyCols = [0xff4747, 0x2eff8a];
  for (let i = 0; i < 11; i++) {
    const f = 0.05 + i * 0.088, side = i % 2 ? 1 : -1;
    const { pos } = atFrac(ctx, f, side * (HALF_W + 4.5));
    const buoy = new THREE.Group();
    const cone = new THREE.Mesh(new THREE.ConeGeometry(1.15, 2.2, 8), new THREE.MeshLambertMaterial({ color: buoyCols[i % 2] }));
    cone.position.y = 0.6; buoy.add(cone);
    const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.34, 8, 6), new THREE.MeshBasicMaterial({ color: buoyCols[i % 2] }));
    lamp.position.y = 1.95; buoy.add(lamp);
    buoy.position.copy(pos); buoy.position.y = WATER_Y; scene.add(buoy);
    bobs.push({ o: buoy, ph: i * 1.13, amp: 0.3, roll: 0.05 });
  }

  /* ----- extra floating signage ----- */
  const exitSign = sign(THREE, textPanel(THREE, ['NEXT EXIT:', 'JURISDICTION SHOPPING →'], { w: 640, h: 220, bg: '#0b3d4a', border: '#7fdcff', font: 48 }), 13, 4.5);

  { const { pos, sample } = atFrac(ctx, 0.82, -(HALF_W + 9)); exitSign.position.copy(pos); exitSign.position.y = WATER_Y - 0.35; faceTrack(exitSign, sample); scene.add(exitSign); }
  bobs.push({ o: exitSign, ph: 4.0, amp: 0.2, roll: 0.018 });
  const flagSign = sign(THREE, textPanel(THREE, ['REGISTERED IN: 🚩', 'A DRAWING OF A FLAG'], { w: 640, h: 220, bg: '#101736', border: '#ffd94a', font: 48 }), 13, 4.5);
  { const { pos, sample } = atFrac(ctx, 0.52, HALF_W + 9); flagSign.position.copy(pos); flagSign.position.y = WATER_Y - 0.35; faceTrack(flagSign, sample); scene.add(flagSign); }

  bobs.push({ o: flagSign, ph: 5.2, amp: 0.2, roll: 0.018 });

  /* ----- sun glitter on the water ----- */
  const glitM = new THREE.MeshBasicMaterial({ color: 0xfff3c4, transparent: true, opacity: 0.25 });
  const glitGeo = new THREE.PlaneGeometry(7, 1.6);
  for (let i = 0; i < 42; i++) {
    const p = ctx.scatterPos(HALF_W + 6, HALF_W + 150);
    const gl = new THREE.Mesh(glitGeo, glitM);
    gl.rotation.x = -Math.PI / 2; gl.rotation.z = rand(0, Math.PI);
    gl.position.set(p.x, WATER_Y + 0.05, p.z); scene.add(gl);
  }

  /* ----- THE SEA ITSELF: an animated water plane over the sculpted seabed.
     (The old build textured the ground disc turquoise-green and called it
     water — this replaces that read entirely.) ----- */
  const wCan = document.createElement('canvas'); wCan.width = 256; wCan.height = 256;
  { const g = wCan.getContext('2d');
    g.fillStyle = '#1d7f96'; g.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 340; i++) { // wave streaks: light crests + deep troughs
      const y = Math.random() * 256, x = Math.random() * 256, len = 14 + Math.random() * 42;
      g.strokeStyle = Math.random() < 0.55 ? 'rgba(190,240,250,0.20)' : 'rgba(6,60,86,0.25)';
      g.lineWidth = 1 + Math.random() * 2.2;
      g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + len / 2, y + (Math.random() * 4 - 2), x + len, y); g.stroke();
    }
  }
  const wTex = new THREE.CanvasTexture(wCan); wTex.wrapS = wTex.wrapT = THREE.RepeatWrapping; wTex.repeat.set(26, 26); wTex.colorSpace = THREE.SRGBColorSpace;
  const water = new THREE.Mesh(new THREE.CircleGeometry(760, 48), new THREE.MeshStandardMaterial({ map: wTex, color: 0xa8dcea, transparent: true, opacity: 0.9, roughness: 0.32, metalness: 0.08 }));
  water.rotation.x = -Math.PI / 2; water.position.set(centroid.x, WATER_Y, centroid.z); scene.add(water);

  /* ----- riprap rocks at the causeway waterline (both edges, whole lap) ----- */
  const rocks = new THREE.InstancedMesh(new THREE.DodecahedronGeometry(1.15, 0), new THREE.MeshLambertMaterial({ color: 0x6e6257 }), 96);
  { const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), eu = new THREE.Euler(), v = new THREE.Vector3(), sc = new THREE.Vector3();
    for (let i = 0; i < 96; i++) {
      const f = i / 96 + rand(-0.004, 0.004), side = i % 2 ? 1 : -1, lat = side * (HALF_W + rand(12.5, 16.5));
      const { pos } = atFrac(ctx, f, lat);
      const s = rand(0.7, 1.5);
      eu.set(rand(0, 3), rand(0, 3), rand(0, 3)); q.setFromEuler(eu); sc.set(s, s * 0.72, s);
      m4.compose(v.set(pos.x, ctx.terrainHeightAt(pos.x, pos.z) - 0.25, pos.z), q, sc); rocks.setMatrixAt(i, m4);
    }
    scene.add(rocks);
  }

  /* ----- HERO: lighthouse on the north-east island, sweeping beam ----- */
  let beamPivot = null;
  { const isle = lighthouseIsle({ center: centroid });
    const gy = ctx.terrainHeightAt(isle.x, isle.z);
    const lh = new THREE.Group(); lh.position.set(isle.x, gy - 0.3, isle.z); scene.add(lh);
    const rockM = new THREE.MeshLambertMaterial({ color: 0x77685a });
    for (let i = 0; i < 6; i++) { const r = new THREE.Mesh(new THREE.DodecahedronGeometry(rand(2.4, 4.4), 0), rockM); const a = i / 6 * Math.PI * 2; r.position.set(Math.sin(a) * rand(6, 10), rand(-0.5, 0.6), Math.cos(a) * rand(6, 10)); r.rotation.set(rand(0, 3), rand(0, 3), 0); lh.add(r); }
    const whiteM = new THREE.MeshLambertMaterial({ color: 0xf4f1ea }), redM = new THREE.MeshLambertMaterial({ color: 0xc23b2e });
    const tower = new THREE.Mesh(new THREE.CylinderGeometry(2.3, 3.4, 23, 12), whiteM); tower.position.y = 11.5; tower.castShadow = true; lh.add(tower);
    for (const by of [6.5, 15.5]) { const band = new THREE.Mesh(new THREE.CylinderGeometry(2.95 - by * 0.045, 3.2 - by * 0.045, 3.4, 12), redM); band.position.y = by; lh.add(band); }
    const lampRoom = new THREE.Mesh(new THREE.CylinderGeometry(2.5, 2.5, 3.2, 10), new THREE.MeshLambertMaterial({ color: 0x22242a })); lampRoom.position.y = 24.4; lh.add(lampRoom);
    const lamp = new THREE.Mesh(new THREE.SphereGeometry(1.15, 10, 8), new THREE.MeshBasicMaterial({ color: 0xffe9a8 })); lamp.position.y = 24.4; lh.add(lamp);
    const roof = new THREE.Mesh(new THREE.ConeGeometry(3.1, 2.8, 10), redM); roof.position.y = 27.4; lh.add(roof);
    beamPivot = new THREE.Group(); beamPivot.position.y = 24.4; lh.add(beamPivot);
    const beam = new THREE.Mesh(new THREE.ConeGeometry(3.4, 30, 12, 1, true), new THREE.MeshBasicMaterial({ color: 0xffe9a8, transparent: true, opacity: 0.16, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
    beam.rotation.z = Math.PI / 2; beam.position.x = 15; beamPivot.add(beam);
    const lhSign = sign(THREE, textPanel(THREE, ['LIGHTHOUSE OF', 'NO JURISDICTION'], { w: 640, h: 220, bg: '#0b3d4a', border: '#7fdcff', font: 50 }), 11, 3.8);
    lhSign.position.set(isle.x + 9, gy + 0.4, isle.z + 7); lhSign.rotation.y = -0.7; scene.add(lhSign);
  }

  return {
    update(dt, t) {
      for (const b of bobs) { if (b.base === undefined) b.base = b.o.position.y; b.o.position.y = b.base + Math.sin(t * 0.85 + b.ph) * b.amp; b.o.rotation.z = Math.sin(t * 0.6 + b.ph * 1.7) * b.roll; }
      if (radar) radar.rotation.y += dt * 1.4;
      for (const f of flags) f.o.rotation.y = Math.sin(t * 3.1 + f.ph) * 0.38;
      glitM.opacity = 0.16 + 0.13 * Math.sin(t * 1.7);
      wTex.offset.set(t * 0.006, Math.sin(t * 0.11) * 0.01 + t * 0.0016); // the sea drifts
      if (beamPivot) beamPivot.rotation.y += dt * 0.55;
    },
  };
}
