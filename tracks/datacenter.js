/* Billionaire Kart — AI Datacenter GP (Batch 1, issue #10)
   Self-contained track module: exports the track definition in the exact shape
   game.js consumes (TRACKS entry) plus a dressing builder.

   dress(ctx) is called by buildWorld() right after buildScenery(). ctx:
     { THREE, scene, samples, normals, tangents, N, HALF_W, rand, clamp,
       billboardTexture, scatterPos, headingOf, clouds }
   It returns { update(dt, t), onLap(lap) } — the integrator calls update()
   every frame from animate() and onLap() when the PLAYER crosses the line.
   Create every material/texture inside dress(): buildWorld disposes the old
   scene on rebuild, so nothing THREE-related may be cached at module level. */

export const def = {
  name: 'AI Datacenter GP', sky: 0xcfd8dc, fog: 0xd8cfc0, ground: 0xc2a878, roadSeed: 3,
  shoulder: 0x8f8a80,
  points: [[-170,-170],[-60,-178],[60,-178],[170,-170],[225,-105],[230,-30],[205,45],[232,105],[180,168],[80,160],[30,185],[-30,160],[-90,182],[-150,168],[-222,110],[-205,30],[-232,-40],[-225,-110]],
  // HAND-AUTHORED profiles (docs/track-design-datacenter.md) — keyframes [u, value]:
  // elev = road height in metres; bank = cross-slope in degrees (+ banks a RIGHT turn).
  // The +4 m plateau (u 0.065–0.165) is load-bearing design: the server hall is a
  // rigid structure straddling the north straight, so the road runs dead level
  // at plinth height from ramp-top to hall exit.
  elev: [[0, 0], [0.02, 0], [0.065, 4.0], [0.165, 4.0], [0.20, 4.5], [0.26, 3.2], [0.32, 2.0], [0.40, 0.5], [0.433, 1.5], [0.50, 2.6], [0.56, 3.4], [0.615, 6.0], [0.645, 8.0], [0.68, 6.4], [0.74, 4.2], [0.80, 2.6], [0.846, 3.2], [0.90, 1.6], [0.96, 0]],
  bank: [[0, 3], [0.035, 0], [0.10, 0], [0.19, 0], [0.227, 11], [0.26, 4], [0.293, 9], [0.32, 4], [0.344, 10], [0.368, 0], [0.393, -13], [0.415, 0], [0.433, 14], [0.465, 0], [0.497, 11], [0.53, 0], [0.562, -12], [0.58, 0], [0.598, 14], [0.62, 0], [0.642, -13], [0.66, 0], [0.681, 10], [0.72, 6], [0.793, 13], [0.82, 0], [0.846, -12], [0.865, 0], [0.891, 9], [0.915, 5], [0.939, 7], [0.955, 0]],
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
function sign(THREE, tex, w, h, postColor = 0x444a52) {
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
function atFrac(ctx, frac, lat, y = null) { // position + heading at a track fraction with lateral offset; default y = real terrain height (TRACK 3D profiles)
  const i = Math.floor(frac * ctx.N) % ctx.N, s = ctx.samples[i], n = ctx.normals[i];
  const x = s.x + n.x * lat, z = s.z + n.z * lat;
  return { pos: new ctx.THREE.Vector3(x, y === null ? (ctx.terrainHeightAt ? ctx.terrainHeightAt(x, z) : 0) : y, z), idx: i, sample: s };
}
function faceTrack(obj, sample) { obj.lookAt(sample.x, 0, sample.z); }

/* ============================== DRESSING ============================== */
export function dress(ctx) {
  const { THREE, scene, HALF_W, rand } = ctx;
  const anim = { puffs: [], blinkMats: [], tickers: [] };
  let lake = null, lakeRim = null, lakeLevel = 0, lakeTarget = 0, counter = null;

  /* ----- the drive-through server hall, straddling the north straight ----- */
  const hallIdx = nearestIdx(ctx, 0, -175);
  const hs = ctx.samples[hallIdx], ht = ctx.tangents[hallIdx];
  const hall = new THREE.Group();
  hall.position.copy(hs); hall.rotation.y = ctx.headingOf(ht);
  scene.add(hall);
  const HALL_LEN = 118, HALL_H = 13.5, RACK_X = HALF_W + 3.4;
  // floor pad + roof + end lintels (open ends, road passes through)
  hall.add(box(THREE, RACK_X * 2 + 9, 0.25, HALL_LEN + 14, 0x6d7278, 0, -0.06, 0));
  hall.add(box(THREE, RACK_X * 2 + 10, 0.7, HALL_LEN + 16, 0x3c4148, 0, HALL_H, 0, { shadow: true }));
  for (const ez of [-1, 1]) hall.add(box(THREE, RACK_X * 2 + 10, 2.2, 0.8, 0x2e3238, 0, HALL_H - 1.4, ez * (HALL_LEN / 2 + 4)));
  // cable trays under the roof
  for (const tx of [-5.5, 0, 5.5]) hall.add(box(THREE, 1.1, 0.35, HALL_LEN, 0x22242a, tx, HALL_H - 1.1, 0));
  // server racks: dark cabinets + LED-dot front planes (two blink phases)
  const ledTexA = textPanel(THREE, [], { w: 128, h: 256, bg: '#0a0d12', border: null });
  { // paint LED dots onto a dedicated canvas texture
    const c = document.createElement('canvas'); c.width = 128; c.height = 256; const g = c.getContext('2d');
    g.fillStyle = '#0a0d12'; g.fillRect(0, 0, 128, 256);
    const cols = ['#39ff6a', '#ffb02e', '#37c8ff', '#ff4747'];
    for (let y = 10; y < 246; y += 14) for (let x = 10; x < 118; x += 14) {
      if (Math.random() < 0.72) { g.fillStyle = cols[(Math.random() * cols.length) | 0]; g.fillRect(x, y, 6, 6); }
    }
    ledTexA.image = c; ledTexA.needsUpdate = true;
  }
  const ledMatA = new THREE.MeshBasicMaterial({ map: ledTexA });
  const ledMatB = new THREE.MeshBasicMaterial({ map: ledTexA });
  anim.blinkMats.push({ m: ledMatA, ph: 0 }, { m: ledMatB, ph: Math.PI });
  const rackBody = new THREE.MeshLambertMaterial({ color: 0x14161a });
  for (const side of [-1, 1]) {
    for (let z = -HALL_LEN / 2 + 4; z < HALL_LEN / 2 - 2; z += 4.4) {
      const rack = new THREE.Mesh(new THREE.BoxGeometry(1.4, 7.2, 3.6), rackBody);
      rack.position.set(side * RACK_X, 3.6, z); rack.castShadow = true; hall.add(rack);
      const face = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 6.8), (z / 4.4 | 0) % 2 ? ledMatA : ledMatB);
      face.position.set(side * (RACK_X - 0.75), 3.6, z); face.rotation.y = side < 0 ? Math.PI / 2 : -Math.PI / 2; hall.add(face);
    }
    // cold/hot aisle signs hanging inside
    const cold = sign(THREE, textPanel(THREE, ['COLD AISLE'], { w: 512, h: 128, bg: '#0b2d4d', border: '#37c8ff', font: 64 }), 10, 2.5);
    cold.position.set(side * RACK_X * 0.55, 7.6, -HALL_LEN / 4); cold.rotation.y = Math.PI / 2; hall.add(cold);
    const hot = sign(THREE, textPanel(THREE, ['HOT AISLE 🔥'], { w: 512, h: 128, bg: '#4d160b', border: '#ff7b2e', font: 64 }), 10, 2.5);
    hot.position.set(side * RACK_X * 0.55, 7.6, HALL_LEN / 4); hot.rotation.y = Math.PI / 2; hall.add(hot);
  }
  const noUnplug = sign(THREE, textPanel(THREE, ['⚠ DO NOT', 'UNPLUG ⚠'], { w: 512, h: 256, bg: '#5c0d0d', border: '#ffd94a', font: 72 }), 9, 4.5);
  noUnplug.position.set(0, 6.2, -HALL_LEN / 2 - 2); hall.add(noUnplug);
  const selfie = sign(THREE, textPanel(THREE, ['PLEASE STOP TAKING SELFIES', 'WITH THE RACKS'], { w: 768, h: 192, bg: '#101736', border: '#ffd94a', font: 46 }), 11, 2.8);
  selfie.position.set(0, 6.4, HALL_LEN / 2 + 2); selfie.rotation.y = Math.PI; hall.add(selfie);
  // security robot patrolling the east aisle
  const robot = new THREE.Group();
  robot.add(box(THREE, 1.1, 1.5, 0.8, 0xd8dde2, 0, 1.05, 0, { shadow: true }));
  const rHead = new THREE.Mesh(new THREE.SphereGeometry(0.42, 10, 8), new THREE.MeshLambertMaterial({ color: 0x22242a })); rHead.position.y = 2.1; robot.add(rHead);
  const rEye = new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 6), ledMatA); rEye.position.set(0, 2.1, 0.34); robot.add(rEye);
  robot.position.set(RACK_X - 1.9, 0, 0);
  hall.add(robot); anim.robot = robot;
  // two interior point lights so the hall reads cooler/darker than the desert
  for (const lz of [-30, 30]) { const pl = new THREE.PointLight(0xbfd9ff, 0.85, 95, 1.6); pl.position.set(0, 10.5, lz); hall.add(pl); }

  /* ----- LIVE water counter billboard, just past the hall exit ----- */
  const cCan = document.createElement('canvas'); cCan.width = 640; cCan.height = 320;
  const cTex = new THREE.CanvasTexture(cCan); cTex.colorSpace = THREE.SRGBColorSpace;
  const drawCounter = (gallons) => {
    const g = cCan.getContext('2d');
    g.fillStyle = '#060a14'; g.fillRect(0, 0, 640, 320);
    g.strokeStyle = '#37c8ff'; g.lineWidth = 10; g.strokeRect(8, 8, 624, 304);
    g.textAlign = 'center'; g.fillStyle = '#7fdcff'; g.font = '900 44px system-ui';
    g.fillText('💧 WATER GULPED', 320, 66);
    g.fillStyle = '#ffffff'; g.font = '900 84px system-ui';
    g.fillText(Math.floor(gallons).toLocaleString('en-US'), 320, 168);
    g.fillStyle = '#7fdcff'; g.font = '700 34px system-ui'; g.fillText('GALLONS — AND COUNTING', 320, 224);
    g.fillStyle = '#ffb02e'; g.font = '900 40px system-ui'; g.fillText('⚡ POWER DRAW: 1.21 GW', 320, 282);
    cTex.needsUpdate = true;
  };
  drawCounter(12483910);
  counter = { tex: cTex, draw: drawCounter, acc: 0 };
  const cSign = new THREE.Group();
  const cPanel = new THREE.Mesh(new THREE.PlaneGeometry(21, 10.5), new THREE.MeshBasicMaterial({ map: cTex, side: THREE.DoubleSide }));
  cPanel.position.y = 7.6; cSign.add(cPanel);
  const cPostM = new THREE.MeshLambertMaterial({ color: 0x33373d });
  for (const px of [-8, 8]) { const p = new THREE.Mesh(new THREE.BoxGeometry(0.6, 5.4, 0.6), cPostM); p.position.set(px, 2.7, 0); cSign.add(p); }
  { const { pos, sample } = atFrac(ctx, 0.235, -(HALF_W + 13)); cSign.position.copy(pos); faceTrack(cSign, sample); scene.add(cSign); }

  /* ----- the lake that drains, inside the south-west of the ring ----- */
  const lakeIdx = nearestIdx(ctx, -60, 105);
  const ls = ctx.samples[lakeIdx], ln = ctx.normals[lakeIdx];
  const inward = ((0 - ls.x) * ln.x + (0 - ls.z) * ln.z) > 0 ? 1 : -1;
  const lakePos = new THREE.Vector3(ls.x + ln.x * inward * 52, 0, ls.z + ln.z * inward * 52);
  lakeRim = new THREE.Mesh(new THREE.CylinderGeometry(37, 39, 1.1, 26), new THREE.MeshLambertMaterial({ color: 0x9a7d4f }));
  lakeRim.position.set(lakePos.x, 0.1, lakePos.z); scene.add(lakeRim);
  lake = new THREE.Mesh(new THREE.CircleGeometry(34, 26), new THREE.MeshLambertMaterial({ color: 0x3a7ca5, transparent: true, opacity: 0.92 }));
  lake.rotation.x = -Math.PI / 2; lake.position.set(lakePos.x, 0.72, lakePos.z); scene.add(lake);
  const crack = new THREE.Mesh(new THREE.CircleGeometry(33, 26), new THREE.MeshLambertMaterial({ color: 0xb59a67 }));
  crack.rotation.x = -Math.PI / 2; crack.position.set(lakePos.x, 0.68, lakePos.z); scene.add(crack); // cracked bed, revealed as water drops

  /* ----- main datacenter slab + cooling towers + gas plant (outside north) ----- */
  const slab = new THREE.Group();
  slab.add(box(THREE, 120, 17, 46, 0xb9bfc6, 0, 8.5, 0, { shadow: true }));
  slab.add(box(THREE, 126, 2, 50, 0x878d94, 0, 17.8, 0));
  slab.add(box(THREE, 30, 7, 20, 0x9aa1a9, -52, 3.5, 30));
  slab.add(box(THREE, 30, 7, 20, 0x9aa1a9, 52, 3.5, 30));
  { const { pos } = atFrac(ctx, 0.115, -(HALF_W + 62)); slab.position.copy(pos); slab.rotation.y = ctx.headingOf(ctx.tangents[Math.floor(0.115 * ctx.N) % ctx.N]); scene.add(slab); }
  const towerM = new THREE.MeshLambertMaterial({ color: 0xd4d8dc });
  for (const [fx, fz] of [[0.055, -(HALF_W + 40)], [0.175, -(HALF_W + 42)]]) {
    const { pos } = atFrac(ctx, fx, fz);
    const tower = new THREE.Mesh(new THREE.CylinderGeometry(6.5, 8.5, 21, 14), towerM);
    tower.position.set(pos.x, 10.5, pos.z); tower.castShadow = true; scene.add(tower);
    for (let p = 0; p < 5; p++) { // steam puffs
      const puff = new THREE.Mesh(new THREE.SphereGeometry(rand(2.6, 4.2), 8, 6), new THREE.MeshLambertMaterial({ color: 0xffffff, transparent: true, opacity: 0.5 }));
      puff.position.set(pos.x, 21, pos.z); scene.add(puff);
      anim.puffs.push({ m: puff, x: pos.x, z: pos.z, y0: 21, ph: Math.random(), rate: rand(0.05, 0.09), smoke: false });
    }
  }
  // dedicated gas plant with smokestacks + spinning turbine fans
  const plant = new THREE.Group();
  plant.add(box(THREE, 44, 11, 24, 0x707880, 0, 5.5, 0, { shadow: true }));
  const stackM = new THREE.MeshLambertMaterial({ color: 0x565d64 });
  for (const sx of [-14, 0, 14]) {
    const st = new THREE.Mesh(new THREE.CylinderGeometry(1.7, 2.3, 19, 10), stackM);
    st.position.set(sx, 14.5, -6); plant.add(st);
  }
  anim.fans = [];
  for (const fx of [-15, 15]) {
    const fan = new THREE.Group();
    const ring = new THREE.Mesh(new THREE.TorusGeometry(3.4, 0.5, 8, 18), stackM); fan.add(ring);
    for (let b = 0; b < 3; b++) { const blade = box(THREE, 0.8, 5.6, 0.25, 0xc8ced4); blade.rotation.z = b * Math.PI * 2 / 3; fan.add(blade); }
    fan.position.set(fx, 6, 12.4); plant.add(fan); anim.fans.push(fan);
  }
  { const { pos } = atFrac(ctx, 0.30, -(HALF_W + 52)); plant.position.copy(pos); plant.rotation.y = ctx.headingOf(ctx.tangents[Math.floor(0.30 * ctx.N) % ctx.N]); scene.add(plant); }
  for (let p = 0; p < 9; p++) { // smoke from the stacks (plant-local approx: dark puffs above plant)
    const puff = new THREE.Mesh(new THREE.SphereGeometry(rand(2.2, 3.6), 8, 6), new THREE.MeshLambertMaterial({ color: 0x4a4a4a, transparent: true, opacity: 0.45 }));
    const { pos } = atFrac(ctx, 0.30, -(HALF_W + 52));
    puff.position.set(pos.x + rand(-14, 14), 24, pos.z - 6); scene.add(puff);
    anim.puffs.push({ m: puff, x: puff.position.x, z: puff.position.z, y0: 24, ph: Math.random(), rate: rand(0.04, 0.07), smoke: true });
  }
  const plantSign = sign(THREE, textPanel(THREE, ['DEDICATED GAS PLANT', '— FOR AI —'], { w: 640, h: 220, bg: '#26221a', border: '#ffb02e', font: 52 }), 15, 5.2);
  { const { pos, sample } = atFrac(ctx, 0.30, -(HALF_W + 24)); plantSign.position.copy(pos); faceTrack(plantSign, sample); scene.add(plantSign); }

  /* ----- protest corner at the south chicane ----- */
  const protestTexts = ['WE WANT OUR LAKE BACK', 'YOUR PROMPTS, OUR RIVER', 'JOBS CREATED: 4 (SECURITY)', "NOW COOLING: 40,000 HOMES' AC", 'NOT IN MY WATERSHED', 'SHUT IT DOWN', '💧 > 🤖', 'MY WELL RAN DRY'];
  const crowdCols = [0xd23b2e, 0x1877f2, 0xffd94a, 0x2e7d32, 0xf2f2f2, 0x9e2a2b];
  protestTexts.forEach((txt, i) => {
    const f = 0.545 + i * 0.0085;
    const { pos, sample } = atFrac(ctx, f, HALF_W + rand(4.5, 7));
    const s = sign(THREE, textPanel(THREE, [txt], { w: 640, h: 128, bg: '#f5efe0', fg: '#8c1d18', border: '#8c1d18', font: 44 }), 6.4, 1.3, 0x7a4a21);
    s.position.copy(pos); faceTrack(s, sample); s.rotation.z = rand(-0.06, 0.06); scene.add(s);
    const person = new THREE.Group(); // little protester holding it: body + head
    person.add(box(THREE, 0.62, 1.05, 0.4, crowdCols[i % crowdCols.length], 0, 0.55, 0));
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.3, 8, 6), new THREE.MeshLambertMaterial({ color: 0xeec39a })); head.position.y = 1.32; person.add(head);
    person.position.set(pos.x + rand(-0.8, 0.8), pos.y, pos.z + rand(-0.8, 0.8)); scene.add(person);
    anim.tickers.push({ o: person, ph: Math.random() * 6, amp: 0.07, base: pos.y }); // gentle bobbing crowd (base = terrain height at the sign)
  });

  /* ----- power lines marching off the east side ----- */
  const poleM = new THREE.MeshLambertMaterial({ color: 0x4a4238 });
  const wirePts = [];
  for (let i = 0; i < 6; i++) {
    const { pos } = atFrac(ctx, 0.36 + i * 0.035, HALF_W + 17);
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.34, 13, 6), poleM);
    pole.position.set(pos.x, 6.5, pos.z); scene.add(pole);
    const cross = box(THREE, 5.4, 0.3, 0.3, 0x4a4238, pos.x, 12.2, pos.z); scene.add(cross);
    wirePts.push(new THREE.Vector3(pos.x, 12.2, pos.z));
  }
  const wireGeo = new THREE.BufferGeometry().setFromPoints(wirePts);
  scene.add(new THREE.Line(wireGeo, new THREE.LineBasicMaterial({ color: 0x22242a })));

  /* ----- extra trackside billboards ----- */
  const boards = [['EVERY QUERY COSTS 1 LITRE', 0.06, -1], ['THE CLOUD IS JUST', 'OUR LAKE', 0.44, 1], ['TRAINING RUN', 'PARKING ONLY', 0.72, -1], ['THERMAL THROTTLING AHEAD', 0.88, 1]];
  for (const b of boards) {
    const lines = b.length === 4 ? [b[0], b[1]] : [b[0]];
    const f = b[b.length - 2], side = b[b.length - 1];
    const { pos, sample } = atFrac(ctx, f, side * (HALF_W + 10));
    const s = sign(THREE, textPanel(THREE, lines, { w: 640, h: 220, font: 50 }), 15, 5.2);
    s.position.copy(pos); faceTrack(s, sample); scene.add(s);
  }

  /* ----- animation + lap hooks ----- */
  return {
    onLap(lap) { lakeTarget = Math.min(lap, 3) / 3; }, // lake drains a third per player lap
    update(dt, t) {
      for (const b of anim.blinkMats) { const v = 0.55 + 0.45 * Math.sin(t * 2.6 + b.ph); b.m.color.setScalar(v); }
      if (anim.robot) { anim.robot.position.z = Math.sin(t * 0.22) * (HALL_LEN / 2 - 9); anim.robot.rotation.y = Math.cos(t * 0.22) > 0 ? 0 : Math.PI; }
      for (const fan of anim.fans || []) fan.rotation.z += dt * 2.4;
      for (const p of anim.puffs) {
        const cyc = (t * p.rate + p.ph) % 1;
        p.m.position.set(p.x + cyc * 6, p.y0 + cyc * 15, p.z);
        const sc = 0.7 + cyc * 1.9; p.m.scale.set(sc, sc, sc);
        p.m.material.opacity = (p.smoke ? 0.45 : 0.5) * (1 - cyc);
      }
      for (const tk of anim.tickers) tk.o.position.y = tk.base + Math.abs(Math.sin(t * 2.2 + tk.ph)) * tk.amp;
      if (lake) { // drain: sink + shrink toward the per-lap target
        lakeLevel += (lakeTarget - lakeLevel) * Math.min(1, dt * 0.7);
        lake.position.y = 0.72 - lakeLevel * 1.5;
        const sc = 1 - lakeLevel * 0.45; lake.scale.set(sc, sc, 1);
      }
      if (counter) { counter.acc += dt; if (counter.acc > 0.25) { counter.acc = 0; counter.draw(12483910 + t * 137 + lakeTarget * 900000); } }
    },
  };
}
