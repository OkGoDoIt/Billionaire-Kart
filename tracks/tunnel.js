/* Billionaire Kart — Boring Tunnel GP (track module; loaded before game.js, see tracks/WIRING.md)
   An underground cut-and-cover loop: an arched shell follows the spline, chasing
   emergency-light strips run along both walls, ceiling fans spin, a boring machine
   chews the wall beside the back straight, and a loop-the-loop ring stands over the
   east straight ( strictly visual — you drive through it, not around it ). */
(function () {
  'use strict';
  window.BK_TRACKS = window.BK_TRACKS || [];
  let anim = null; // rebuilt by buildDressing on every world build

  const L = (THREE, color, opts) => new THREE.MeshLambertMaterial(Object.assign({ color }, opts || {}));
  function at(ctx, idx, lat, y) {
    const i = ((Math.round(idx) % ctx.N) + ctx.N) % ctx.N, s = ctx.samples[i], n = ctx.normals[i];
    return { pos: new ctx.THREE.Vector3(s.x + n.x * lat, y || 0, s.z + n.z * lat), sample: s, tangent: ctx.tangents[i], idx: i };
  }
  // arched shell strip following the spline between two angles (radians, 0..PI over the road)
  function archStrip(ctx, a0, a1, kSegs, mat, iStep, rOff) {
    const { THREE, samples, normals, N } = ctx;
    const R = ctx.HALF_W + 4.2 + (rOff || 0), pos = [], idx = [];
    const rings = [];
    for (let i = 0; i <= N; i += iStep) rings.push(i % N);
    rings.forEach((ri, r) => {
      const s = samples[ri], n = normals[ri];
      for (let k = 0; k <= kSegs; k++) {
        const a = a0 + (a1 - a0) * (k / kSegs);
        pos.push(s.x + n.x * Math.cos(a) * R, Math.sin(a) * R * 0.82, s.z + n.z * Math.cos(a) * R);
      }
      if (r > 0) { const b = r * (kSegs + 1), p = (r - 1) * (kSegs + 1); for (let k = 0; k < kSegs; k++) idx.push(p + k, b + k, p + k + 1, b + k, b + k + 1, p + k + 1); }
    });
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setIndex(idx); geo.computeVertexNormals();
    return new THREE.Mesh(geo, mat);
  }

  function buildDressing(ctx) {
    const { THREE, scene, rand } = ctx;
    anim = { phases: [], tbmDisc: null, fans: [], ringMat: null };

    /* ---- the tunnel shell + ribs + ceiling guide strips ----
       (Basic materials on purpose: the arch interior faces away from both game
       lights, so Lambert leaves it pitch black; unlit reads as stylised tunnel) */
    scene.add(archStrip(ctx, 0, Math.PI, 14, new THREE.MeshBasicMaterial({ color: 0x252b33, side: THREE.DoubleSide }), 2, 0));
    scene.add(archStrip(ctx, 0, Math.PI, 14, new THREE.MeshBasicMaterial({ color: 0x1a1f26, side: THREE.DoubleSide }), 30, 0.07)); // ribs every ~30 samples
    const guideMat = new THREE.MeshBasicMaterial({ color: 0x86c9e8, side: THREE.DoubleSide });
    scene.add(archStrip(ctx, 0.62, 0.72, 1, guideMat, 2, -0.05));
    scene.add(archStrip(ctx, Math.PI - 0.72, Math.PI - 0.62, 1, guideMat, 2, -0.05));

    /* ---- emergency light strips: instanced wall panels in 4 chase phases ---- */
    const panelGeo = new THREE.BoxGeometry(0.35, 1.1, 3.4);
    const per = [[], [], [], []];
    for (let i = 0; i < ctx.N; i += 6) for (const side of [-1, 1]) per[(i / 6) % 4].push([i, side]);
    per.forEach((list, ph) => {
      const mat = new THREE.MeshBasicMaterial({ color: 0x59300a });
      const im = new THREE.InstancedMesh(panelGeo, mat, list.length);
      const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), one = new THREE.Vector3(1, 1, 1);
      list.forEach(([idx, side], j) => {
        const a = at(ctx, idx, side * (ctx.HALF_W + 3.4), 3.6);
        q.setFromEuler(e.set(0, ctx.headingOf(a.tangent), 0));
        m4.compose(a.pos, q, one); im.setMatrixAt(j, m4);
      });
      scene.add(im); anim.phases.push(mat);
    });

    /* ---- ceiling ventilation fans ---- */
    const fanMat = L(THREE, 0x3a4048), bladeMat = L(THREE, 0x596270);
    for (const idx of [110, 405, 700]) {
      const a = at(ctx, idx, 0, 0);
      const fan = new THREE.Group(); fan.position.set(a.pos.x, 11.4, a.pos.z);
      const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.7, 0.8, 10), fanMat); fan.add(hub);
      for (let b = 0; b < 4; b++) {
        const blade = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.12, 0.9), bladeMat);
        blade.position.x = 1.8; const holder = new THREE.Group(); holder.rotation.y = b * Math.PI / 2; holder.add(blade); fan.add(holder);
      }
      scene.add(fan); anim.fans.push(fan);
    }

    /* ---- THE BORING MACHINE — chewing the wall by the back straight ---- */
    const ta = at(ctx, 148, -(ctx.HALF_W + 24), 0);
    const tbm = new THREE.Group(); tbm.position.copy(ta.pos); tbm.lookAt(ta.sample.x, 0, ta.sample.z);
    const tbmBody = L(THREE, 0xd8d3c3), tbmDark = L(THREE, 0x4a4d52);
    const shield = new THREE.Mesh(new THREE.CylinderGeometry(6.4, 6.4, 2.4, 24), tbmDark); shield.rotation.x = Math.PI / 2; shield.position.z = 4; tbm.add(shield);
    const discGeo = new THREE.CylinderGeometry(6.1, 6.1, 1.2, 24); discGeo.rotateX(Math.PI / 2);
    const disc = new THREE.Mesh(discGeo, L(THREE, 0x8f959d));
    for (let tI = 0; tI < 12; tI++) {
      const tooth = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.9, 0.7), tbmDark);
      const ang = tI / 12 * Math.PI * 2; tooth.position.set(Math.cos(ang) * 5.4, Math.sin(ang) * 5.4, 0.7); disc.add(tooth);
    }
    disc.position.z = 5.6; tbm.add(disc); anim.tbmDisc = disc;
    const body = new THREE.Mesh(new THREE.CylinderGeometry(4.6, 4.6, 13, 18), tbmBody); body.rotation.x = Math.PI / 2; body.position.z = -4.5; tbm.add(body);
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(9.4, 1.1, 10), L(THREE, 0xe8641b)); stripe.position.set(0, 1.2, -4.5); tbm.add(stripe);
    scene.add(tbm);
    const tbmSignTex = ctx.canvasTexture(1024, 256, (g, w, h) => {
      g.fillStyle = '#101216'; g.fillRect(0, 0, w, h);
      g.fillStyle = '#f5f2e8'; g.font = '900 92px system-ui'; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillText('THE BORING CO.', w / 2, h * 0.36);
      g.fillStyle = '#e8641b'; g.font = '700 54px system-ui'; g.fillText('TUNNEL DIVISION — EST. TRAFFIC JAM', w / 2, h * 0.74);
    });
    const tbmSign = new THREE.Mesh(new THREE.PlaneGeometry(17, 4.2), new THREE.MeshLambertMaterial({ map: tbmSignTex, side: THREE.DoubleSide }));
    const ts = at(ctx, 148, -(ctx.HALF_W + 15.5), 0); tbmSign.position.set(ts.pos.x, 8.6, ts.pos.z); tbmSign.lookAt(ts.sample.x, 8.6, ts.sample.z); scene.add(tbmSign);

    /* ---- loop-the-loop ring over the east straight (visual only) ---- */
    const ra = at(ctx, 470, 0, 0);
    const ringMat = new THREE.MeshStandardMaterial({ color: 0x394048, emissive: 0xff7b1c, emissiveIntensity: 1.1, roughness: 0.5 });
    const ring = new THREE.Mesh(new THREE.TorusGeometry(12.6, 0.85, 10, 44), ringMat);
    ring.position.set(ra.pos.x, 13.2, ra.pos.z); ring.rotation.y = ctx.headingOf(ra.tangent);
    scene.add(ring); anim.ringMat = ringMat;
    const loopSignTex = ctx.billboardTexture('LOOP-DE-LOOP (VISUAL ONLY)', 24);
    const loopSign = new THREE.Mesh(new THREE.PlaneGeometry(15, 5.7), new THREE.MeshLambertMaterial({ map: loopSignTex, side: THREE.DoubleSide }));
    const ls = at(ctx, 452, ctx.HALF_W + 8.5, 0); loopSign.position.set(ls.pos.x, 5, ls.pos.z); loopSign.lookAt(ls.sample.x, 5, ls.sample.z); scene.add(loopSign);

    /* ---- NOT A FLAMETHROWER ---- */
    const nftTex = ctx.canvasTexture(1024, 300, (g, w, h) => {
      g.fillStyle = '#f2efe6'; g.fillRect(0, 0, w, h);
      g.strokeStyle = '#c22f1f'; g.lineWidth = 16; g.strokeRect(10, 10, w - 20, h - 20);
      g.fillStyle = '#c22f1f'; g.font = '900 104px system-ui'; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillText('NOT A FLAMETHROWER', w / 2, h * 0.38);
      g.fillStyle = '#333'; g.font = '600 46px system-ui'; g.fillText('(IT IS TOTALLY A FLAMETHROWER)', w / 2, h * 0.76);
    });
    const nft = new THREE.Mesh(new THREE.PlaneGeometry(16, 4.7), new THREE.MeshLambertMaterial({ map: nftTex, side: THREE.DoubleSide }));
    const na = at(ctx, 250, ctx.HALF_W + 4.6, 0); nft.position.set(na.pos.x, 6.8, na.pos.z); nft.lookAt(na.sample.x, 6.8, na.sample.z); scene.add(nft);

    /* ---- emergency exit signs ---- */
    const exitTex = ctx.canvasTexture(512, 192, (g, w, h) => {
      g.fillStyle = '#0d7a35'; g.fillRect(0, 0, w, h);
      g.fillStyle = '#fff'; g.font = '900 96px system-ui'; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillText('EXIT →', w / 2, h / 2);
    });
    for (let k = 0; k < 8; k++) {
      const a = at(ctx, 60 + k * 112, (k % 2 ? 1 : -1) * (ctx.HALF_W + 4.4), 0);
      const s = new THREE.Mesh(new THREE.PlaneGeometry(5.4, 2), new THREE.MeshBasicMaterial({ map: exitTex, side: THREE.DoubleSide }));
      s.position.set(a.pos.x, 5.2, a.pos.z); s.lookAt(a.sample.x, 5.2, a.sample.z); scene.add(s);
    }
    void rand;
  }

  function tick(dt, t) {
    if (!anim) return;
    const active = Math.floor(t * 2.6) % 4;
    anim.phases.forEach((m, i) => m.color.setHex(i === active ? 0xff9500 : 0x59300a));
    if (anim.tbmDisc) anim.tbmDisc.rotation.z += dt * 0.8;
    anim.fans.forEach((f, i) => { f.rotation.y += dt * (5 + i); });
    if (anim.ringMat) anim.ringMat.emissiveIntensity = 1.1 + Math.sin(t * 2.4) * 0.45;
  }

  window.BK_TRACKS.push({
    name: 'Boring Tunnel GP', sky: 0x0a0d12, fog: 0x0a0d12, fogNear: 40, fogFar: 330,
    ground: 0x111419, roadSeed: 4, shoulder: 0x23272e, noClouds: true,
    points: [[-60, 170], [-150, 120], [-190, 20], [-185, -100], [-110, -165], [10, -185], [120, -160], [185, -80], [195, 40], [140, 135], [30, 180]],
    billboards: ['NOT A FLAMETHROWER', 'MIND THE GAP IN FUNDING', 'THIS TUNNEL COST $1B', 'NO SIGNAL NO PROBLEM', 'VENTILATION BY SUBSCRIPTION', 'DIGGING OUR WAY OUT'],
    standColors: [0x2b2f36, 0x23262c, 0x2b2f36, 0x1d2025],
    banner: '🏁 BORING TUNNEL GP 🏁',
    // grid framing: from behind the grid, down the bore — arch, light strips, gantry
    countdownView: { pos: [-33.8, 6.5, 184.6], look: [-99, 2.5, 148] },
    buildDressing, tick,
  });
})();
