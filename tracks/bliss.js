/* Billionaire Kart — Bliss GP (track module; loaded before game.js, see tracks/WIRING.md)
   The Windows XP breather track: rolling green hills, one hero hill dead ahead of the
   start grid (the countdown camera frames the "Bliss" wallpaper composition), Clippy,
   a BSOD grandstand + crash screen, Minesweeper flowers and drifting cloud sprites.
   Satire stays gentle. Geometry is a plain wide loop — hills are sculpted meshes only. */
(function () {
  'use strict';
  window.BK_TRACKS = window.BK_TRACKS || [];
  let anim = null; // rebuilt by buildDressing on every world build

  const L = (THREE, color, opts) => new THREE.MeshLambertMaterial(Object.assign({ color }, opts || {}));
  function at(ctx, idx, lat, y) {
    const i = ((Math.round(idx) % ctx.N) + ctx.N) % ctx.N, s = ctx.samples[i], n = ctx.normals[i];
    const x = s.x + n.x * lat, z = s.z + n.z * lat;
    // TRACK 3D (batch-2 design pass): anchor to the real terrain so trackside
    // dressing rides the authored elevation profile instead of flat y=0.
    return { pos: new ctx.THREE.Vector3(x, ctx.terrainHeightAt(x, z) + (y || 0), z), sample: s, normal: n, tangent: ctx.tangents[i], idx: i };
  }
  function faceRoad(mesh, a) { mesh.lookAt(a.sample.x, mesh.position.y, a.sample.z); }
  // true when a circle at (x,z) radius r keeps off the road (checks every 4th sample)
  function clearOfRoad(ctx, x, z, r) {
    for (let i = 0; i < ctx.N; i += 4) { const s = ctx.samples[i], dx = s.x - x, dz = s.z - z; if (dx * dx + dz * dz < (r + 20) * (r + 20)) return false; }
    return true;
  }
  function signPlane(ctx, w, h, draw) {
    const tex = ctx.canvasTexture(1024, Math.round(1024 * h / w), draw);
    return new ctx.THREE.Mesh(new ctx.THREE.PlaneGeometry(w, h), new ctx.THREE.MeshLambertMaterial({ map: tex, side: ctx.THREE.DoubleSide }));
  }
  // an XP window: blue title bar, red X, cream body, one OK button
  function xpDialog(ctx, title, bodyLines, w, h) {
    return signPlane(ctx, w, h, (g, cw, ch) => {
      g.fillStyle = '#ece9d8'; g.fillRect(0, 0, cw, ch);
      const grad = g.createLinearGradient(0, 0, 0, ch * 0.16); grad.addColorStop(0, '#3a7bd5'); grad.addColorStop(1, '#245edb');
      g.fillStyle = grad; g.fillRect(0, 0, cw, ch * 0.16);
      g.fillStyle = '#fff'; g.font = `700 ${ch * 0.085}px system-ui`; g.textAlign = 'left'; g.textBaseline = 'middle';
      g.fillText(title, cw * 0.03, ch * 0.085);
      g.fillStyle = '#e81123'; g.fillRect(cw * 0.925, ch * 0.02, cw * 0.055, ch * 0.12);
      g.fillStyle = '#fff'; g.font = `900 ${ch * 0.1}px system-ui`; g.textAlign = 'center'; g.fillText('×', cw * 0.9525, ch * 0.085);
      g.fillStyle = '#111'; g.font = `600 ${ch * 0.105}px system-ui`;
      bodyLines.forEach((line, i) => g.fillText(line, cw / 2, ch * (0.36 + i * 0.17)));
      g.fillStyle = '#f4f2e8'; g.strokeStyle = '#7a7663'; g.lineWidth = 3;
      const bw = cw * 0.2, bh = ch * 0.15; g.fillRect(cw / 2 - bw / 2, ch * 0.78, bw, bh); g.strokeRect(cw / 2 - bw / 2, ch * 0.78, bw, bh);
      g.fillStyle = '#111'; g.font = `600 ${ch * 0.1}px system-ui`; g.fillText('OK', cw / 2, ch * 0.78 + bh / 2);
    });
  }

  function buildDressing(ctx) {
    const { THREE, scene, rand } = ctx;
    anim = { clouds: [], clippy: null };
    const greens = [0x5db84a, 0x4cab3e, 0x6cc457];

    /* ---- hills: hero hill dead ahead of the grid + rolling hills outside the loop ---- */
    const hillGeo = new THREE.SphereGeometry(1, 28, 18);
    const hill = (x, z, r, squash, ci) => {
      if (!clearOfRoad(ctx, x, z, r)) return;
      const m = new THREE.Mesh(hillGeo, L(THREE, greens[ci % 3]));
      m.scale.set(r, r * squash, r * 0.86); m.position.set(x, -r * 0.12, z);
      m.receiveShadow = true; scene.add(m);
    };
    // HERO: centred on the start-straight sight line (grid looks -z from (0,~215))
    const hero = new THREE.Mesh(hillGeo, L(THREE, 0x57b544));
    hero.scale.set(96, 42, 82); hero.position.set(60, -10, -198); hero.receiveShadow = true; scene.add(hero);
    hill(-265, -165, 62, 0.4, 1); hill(248, -195, 72, 0.38, 2); hill(-285, 55, 56, 0.42, 0);
    hill(292, 125, 66, 0.4, 1); hill(155, 272, 58, 0.36, 2); hill(-195, 272, 68, 0.4, 0);
    hill(-75, 58, 40, 0.3, 2);   // gentle infield mound
    hill(320, -40, 52, 0.44, 0);

    /* ---- Clippy, just past the start on the right ---- */
    const ca = at(ctx, 34, ctx.HALF_W + 10.5, 0);
    const clippy = new THREE.Group(); clippy.position.copy(ca.pos); clippy.lookAt(ca.sample.x, 0, ca.sample.z);
    const steel = new THREE.MeshStandardMaterial({ color: 0xb9c0c7, metalness: 0.85, roughness: 0.3 });
    const uShape = (r, hgt, tube, z) => {
      const pts = [];
      for (let a = Math.PI; a <= Math.PI * 2; a += Math.PI / 10) pts.push(new THREE.Vector3(Math.cos(a) * r, hgt + Math.sin(a) * r, z));
      const curve = new THREE.CatmullRomCurve3([new THREE.Vector3(-r, 0.4, z), ...pts, new THREE.Vector3(r, 0.4, z)]);
      return new THREE.Mesh(new THREE.TubeGeometry(curve, 32, tube, 8), steel);
    };
    clippy.add(uShape(1.15, 3.1, 0.17, 0));            // outer loop of the paperclip
    clippy.add(uShape(0.62, 2.5, 0.15, 0.34));        // inner loop
    const eyeW = L(THREE, 0xffffff), eyeB = L(THREE, 0x11131a);
    for (const sx of [-0.52, 0.52]) {
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.34, 12, 10), eyeW); eye.position.set(sx, 4.6, 0.22); clippy.add(eye);
      const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.15, 8, 8), eyeB); pupil.position.set(sx, 4.62, 0.52); clippy.add(pupil);
      const brow = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.1, 0.1), eyeB); brow.position.set(sx, 5.12, 0.3); brow.rotation.z = sx > 0 ? -0.25 : 0.25; clippy.add(brow);
    }
    const podium = new THREE.Mesh(new THREE.CylinderGeometry(2.4, 2.8, 0.7, 18), L(THREE, 0x2f80ed));
    podium.position.y = 0.35; clippy.add(podium);
    anim.clippyBaseY = ca.pos.y + 0.7; clippy.position.y = anim.clippyBaseY;
    scene.add(clippy); anim.clippy = clippy;
    // speech bubble
    const bubble = signPlane(ctx, 15, 7, (g, w, h) => {
      g.fillStyle = '#ffffff'; g.beginPath(); g.roundRect(6, 6, w - 12, h - 12, 42); g.fill();
      g.strokeStyle = '#245edb'; g.lineWidth = 7; g.beginPath(); g.roundRect(6, 6, w - 12, h - 12, 42); g.stroke();
      g.fillStyle = '#12325e'; g.font = '700 52px system-ui'; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillText("It looks like you're trying", w / 2, h * 0.32);
      g.fillText('to win a race.', w / 2, h * 0.52);
      g.font = '600 44px system-ui'; g.fillStyle = '#245edb'; g.fillText('Can I help?  [ Yes ]  [ Just drive ]', w / 2, h * 0.76);
    });
    const ba = at(ctx, 34, ctx.HALF_W + 19, 0); bubble.position.set(ba.pos.x, ba.pos.y + 9.6, ba.pos.z); faceRoad(bubble, ba); scene.add(bubble);

    /* ---- BSOD crash screen before the start, left side ---- */
    const bsod = signPlane(ctx, 21, 11.5, (g, w, h) => {
      g.fillStyle = '#0a5bd7'; g.fillRect(0, 0, w, h);
      g.fillStyle = '#fff'; g.textAlign = 'left'; g.textBaseline = 'top';
      g.font = '700 40px ui-monospace, monospace';
      const lines = ['A problem has been detected and Windows has been', 'shut down to prevent damage to your kart.', '', 'KART_EXCEPTION_NOT_FUNNY', '', 'If this is the first time you have seen this stop', 'error screen, simply win the race.', '', 'Press any key to continue _'];
      lines.forEach((l, i) => g.fillText(l, 36, 30 + i * 52));
    });
    const sa = at(ctx, 872, -(ctx.HALF_W + 13.5), 0); bsod.position.set(sa.pos.x, sa.pos.y + 6.4, sa.pos.z); faceRoad(bsod, sa); scene.add(bsod);
    const bsodPost = new THREE.Mesh(new THREE.BoxGeometry(0.6, 2.4, 0.6), L(THREE, 0x333a42));
    bsodPost.position.set(sa.pos.x, sa.pos.y + 1.2, sa.pos.z); scene.add(bsodPost);

    /* ---- XP error dialogs trackside ---- */
    const d1 = xpDialog(ctx, 'Kart.exe — Illegal Operation', ['Your kart has performed an', 'illegal operation and will', 'be shut down.'], 13, 8.5);
    const d1a = at(ctx, 300, -(ctx.HALF_W + 10), 0); d1.position.set(d1a.pos.x, d1a.pos.y + 5.6, d1a.pos.z); faceRoad(d1, d1a); scene.add(d1);
    const d2 = xpDialog(ctx, 'Automatic Updates', ['Updates are ready for your kart.', 'Restart now?', '(Recommended)'], 13, 8.5);
    const d2a = at(ctx, 618, ctx.HALF_W + 10.5, 0); d2.position.set(d2a.pos.x, d2a.pos.y + 5.6, d2a.pos.z); faceRoad(d2, d2a); scene.add(d2);

    /* ---- Minesweeper flowers: colour-palette patches + the odd mine ---- */
    const palette = [0x2b5cff, 0x1faa3c, 0xff3b30, 0x7d3cff, 0xff9500, 0xffd60a, 0xff6ad5];
    const heads = [], stems = [];
    for (let p = 0; p < 26; p++) {
      const c = ctx.scatterPos(ctx.HALF_W + 6, ctx.HALF_W + 46);
      const n = 6 + Math.floor(rand(0, 5));
      for (let i = 0; i < n; i++) {
        const x = c.x + rand(-4.5, 4.5), z = c.z + rand(-4.5, 4.5);
        heads.push([x, z, palette[Math.floor(rand(0, palette.length))]]); stems.push([x, z]);
      }
    }
    const headM = new THREE.InstancedMesh(new THREE.SphereGeometry(0.34, 8, 6), L(THREE, 0xffffff), heads.length);
    const stemM = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.05, 0.05, 1.0, 5), L(THREE, 0x2e7d32), stems.length);
    const m4 = new THREE.Matrix4(), q0 = new THREE.Quaternion(), one = new THREE.Vector3(1, 1, 1), col = new THREE.Color();
    heads.forEach(([x, z, c], i) => { m4.compose(new THREE.Vector3(x, 1.05, z), q0, one); headM.setMatrixAt(i, m4); headM.setColorAt(i, col.setHex(c)); });
    stems.forEach(([x, z], i) => { m4.compose(new THREE.Vector3(x, 0.5, z), q0, one); stemM.setMatrixAt(i, m4); });
    scene.add(headM, stemM);
    const mineM = new THREE.InstancedMesh(new THREE.SphereGeometry(0.55, 10, 8), L(THREE, 0x191b20), 12);
    for (let i = 0; i < 12; i++) { const p = ctx.scatterPos(ctx.HALF_W + 7, ctx.HALF_W + 44); m4.compose(new THREE.Vector3(p.x, 0.55, p.z), q0, one); mineM.setMatrixAt(i, m4); }
    scene.add(mineM);

    /* ---- fluffy cloud sprites (the wallpaper's puffy clouds, drifting) ---- */
    const cloudTex = ctx.canvasTexture(256, 128, (g, w, h) => {
      g.clearRect(0, 0, w, h);
      for (const [cx, cy, r] of [[70, 84, 40], [128, 66, 52], [186, 84, 40], [104, 90, 42], [156, 92, 40]]) {
        const gr = g.createRadialGradient(cx, cy, 4, cx, cy, r);
        gr.addColorStop(0, 'rgba(255,255,255,0.95)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
        g.fillStyle = gr; g.beginPath(); g.arc(cx, cy, r, 0, 7); g.fill();
      }
    });
    for (let i = 0; i < 16; i++) {
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: cloudTex, transparent: true, opacity: 0.95, depthWrite: false }));
      const s = rand(44, 82); sp.scale.set(s, s * 0.36, 1);
      sp.position.set(rand(-540, 540), rand(68, 118), rand(-540, 540));
      scene.add(sp); anim.clouds.push(sp);
    }
  }

  function tick(dt, t) {
    if (!anim) return;
    anim.clouds.forEach((c, i) => { c.position.x += dt * (1.1 + (i % 3) * 0.55); if (c.position.x > 580) c.position.x = -580; });
    if (anim.clippy) { anim.clippy.position.y = (anim.clippyBaseY || 0.7) + Math.sin(t * 1.5) * 0.3; anim.clippy.rotation.z = Math.sin(t * 0.9) * 0.045; }
  }

  window.BK_TRACKS.push({
    name: 'Bliss GP', sky: 0x2f80ed, fog: 0xa8d8ff, ground: 0x58b13c, roadSeed: 3, shoulder: 0x8fce62,
    points: [[0, 195], [0, 70], [-15, -45], [-80, -110], [-175, -85], [-215, 25], [-160, 130], [-55, 185], [70, 180], [165, 110], [205, 0], [150, -105]],
    // HAND-AUTHORED profiles (docs/track-design-bliss.md) — keyframes [u, value]:
    // elev = road height in metres; bank = cross-slope in degrees (+ banks a RIGHT
    // turn). The calm track: gentle swells only, start complex + crossing arm at 0.
    elev: [[0, 0], [0.06, 0], [0.10, 0.8], [0.143, 1.5], [0.206, 2.5], [0.26, 1.7], [0.31, 1.3], [0.36, 1.9], [0.423, 3.0], [0.475, 1.7], [0.525, 0.2], [0.575, 1.3], [0.637, 4.2], [0.68, 5.0], [0.75, 3.4], [0.791, 3.8], [0.85, 2.3], [0.90, 1.2], [0.96, 0]],
    bank: [[0, 5], [0.04, 0], [0.105, 0], [0.143, -5], [0.175, 0], [0.206, -10], [0.238, 0], [0.269, -9], [0.305, 0], [0.346, -7], [0.385, 0], [0.423, -5], [0.475, 0], [0.60, 0], [0.637, -5], [0.678, 0], [0.713, -7], [0.748, 0], [0.791, -13], [0.84, 0], [0.955, 0]],
    billboards: ['ERROR: FUN DETECTED', 'AN ILLEGAL OPERATION', 'CLIPPY SEES YOU', '100% GENUINE BLISS', 'NO UPDATES FOUND', 'PRESS ANY KEY TO WIN'],
    standColors: [0x0b5bd7, 0x0a4fb0, 0x0b5bd7, 0x084a9e],
    banner: '🏁 BLISS GP 🏁', chime: 'xp',
    // start-grid hero framing: grid sits at z≈215 looking -z; hero hill at (60,-198)
    countdownView: { pos: [0, 6, 248], look: [46, 16, -198] },
    buildDressing, tick,
  });
})();
