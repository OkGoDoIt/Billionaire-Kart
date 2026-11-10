/* Billionaire Kart — Davos Circuit (track module; loaded before game.js, see tracks/WIRING.md)
   Alpine luxury at altitude: private jets parked by the grid, a panel stage promising
   a GREAT RESET, fondue and chocolate chalets, snow banks as soft barriers, a security
   perimeter with a sweeping searchlight, distant Alps — and actual falling snow. */
(function () {
  'use strict';
  window.BK_TRACKS = window.BK_TRACKS || [];
  let anim = null; // rebuilt by buildDressing on every world build

  const L = (THREE, color, opts) => new THREE.MeshLambertMaterial(Object.assign({ color }, opts || {}));
  function at(ctx, idx, lat, y) {
    const i = ((Math.round(idx) % ctx.N) + ctx.N) % ctx.N, s = ctx.samples[i], n = ctx.normals[i];
    return { pos: new ctx.THREE.Vector3(s.x + n.x * lat, y || 0, s.z + n.z * lat), sample: s, tangent: ctx.tangents[i], idx: i };
  }
  function clearOfRoad(ctx, x, z, r) {
    for (let i = 0; i < ctx.N; i += 4) { const s = ctx.samples[i], dx = s.x - x, dz = s.z - z; if (dx * dx + dz * dz < (r + 24) * (r + 24)) return false; }
    return true;
  }

  function makeJet(ctx, livery, gold) {
    const { THREE } = ctx;
    const jet = new THREE.Group();
    const paint = new THREE.MeshStandardMaterial({ color: livery, roughness: 0.3, metalness: 0.35 });
    const dark = L(THREE, 0x14161c);
    const fusGeo = new THREE.CylinderGeometry(1.7, 1.95, 15, 14); fusGeo.rotateX(Math.PI / 2);
    const fus = new THREE.Mesh(fusGeo, paint); fus.position.y = 2.6; jet.add(fus);
    const noseGeo = new THREE.SphereGeometry(1.7, 14, 10); const nose = new THREE.Mesh(noseGeo, paint);
    nose.scale.set(1, 1, 1.9); nose.position.set(0, 2.6, 8.2); jet.add(nose);
    const tailGeo = new THREE.CylinderGeometry(0.5, 1.8, 5, 12); tailGeo.rotateX(Math.PI / 2);
    const tail = new THREE.Mesh(tailGeo, paint); tail.position.set(0, 2.9, -9.4); jet.add(tail);
    const wing = new THREE.Mesh(new THREE.BoxGeometry(11.5, 0.22, 2.7), paint); wing.position.set(0, 2, 0.6); jet.add(wing);
    const hstab = new THREE.Mesh(new THREE.BoxGeometry(5.4, 0.2, 1.6), paint); hstab.position.set(0, 4.6, -10.6); jet.add(hstab);
    const fin = new THREE.Mesh(new THREE.BoxGeometry(0.24, 3.4, 2.4), L(THREE, gold)); fin.position.set(0, 4.6, -10.4); jet.add(fin);
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(3.55, 0.5, 13.5), L(THREE, gold)); stripe.position.y = 3.1; jet.add(stripe);
    const cockpit = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.7, 2.6), dark); cockpit.position.set(0, 3.9, 6.4); jet.add(cockpit);
    const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.3, 8, 8), new THREE.MeshBasicMaterial({ color: 0xff2a1a }));
    beacon.position.set(0, 4.6, 0.5); jet.add(beacon);
    jet.traverse(o => { if (o.isMesh) o.castShadow = true; });
    return { jet, beacon };
  }

  function buildDressing(ctx) {
    const { THREE, scene, rand } = ctx;
    anim = { beacons: [], snow: null, snowPos: null, searchlight: null };
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), one = new THREE.Vector3(1, 1, 1);

    /* ---- snow-dusted pines ---- */
    const COUNT = 130;
    const trunkM = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.3, 0.48, 2.6, 6), L(THREE, 0x5d4128), COUNT);
    const pineM = new THREE.InstancedMesh(new THREE.ConeGeometry(2.4, 6.2, 8), L(THREE, 0x2e5d43), COUNT);
    const capM = new THREE.InstancedMesh(new THREE.ConeGeometry(1.5, 3.4, 8), L(THREE, 0xf4f8fa), COUNT);
    for (let i = 0; i < COUNT; i++) {
      const p = ctx.scatterPos(ctx.HALF_W + 8, ctx.HALF_W + 72), s = rand(0.85, 1.8);
      const sc = new THREE.Vector3(s, s, s);
      m4.compose(new THREE.Vector3(p.x, 1.3 * s, p.z), q, sc); trunkM.setMatrixAt(i, m4);
      m4.compose(new THREE.Vector3(p.x, (2.6 + 2.9) * s, p.z), q, sc); pineM.setMatrixAt(i, m4);
      m4.compose(new THREE.Vector3(p.x, (2.6 + 4.6) * s, p.z), q, sc); capM.setMatrixAt(i, m4);
    }
    trunkM.castShadow = pineM.castShadow = true; scene.add(trunkM, pineM, capM);

    /* ---- snow banks hugging both edges (soft barriers, purely visual) ---- */
    const bankSpots = [];
    for (let i = 0; i < ctx.N; i += 6) for (const side of [-1, 1]) bankSpots.push([i, side]);
    const bankM = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 10, 8), L(THREE, 0xf7fafc), bankSpots.length);
    bankSpots.forEach(([idx, side], j) => {
      const a = at(ctx, idx, side * (ctx.HALF_W + 2.3 + rand(0, 1.6)), 0);
      q.setFromEuler(e.set(0, rand(0, 3), 0));
      m4.compose(new THREE.Vector3(a.pos.x, 0.1, a.pos.z), q, new THREE.Vector3(rand(2.4, 3.8), rand(0.85, 1.35), rand(1.7, 2.7)));
      bankM.setMatrixAt(j, m4);
    });
    bankM.receiveShadow = true; scene.add(bankM);

    /* ---- distant Alps ---- */
    const alpMat = L(THREE, 0x9db8cc), alpCap = L(THREE, 0xffffff);
    for (const [x, z, r, h] of [[-430, -330, 150, 120], [-60, -480, 170, 140], [330, -400, 140, 105], [480, -60, 130, 95], [420, 320, 150, 110], [-450, 240, 140, 100], [-180, 460, 160, 90]]) {
      if (!clearOfRoad(ctx, x, z, r)) continue;
      const alp = new THREE.Mesh(new THREE.ConeGeometry(r, h, 7), alpMat); alp.position.set(x, h / 2 - 4, z); scene.add(alp);
      const cap = new THREE.Mesh(new THREE.ConeGeometry(r * 0.42, h * 0.42, 7), alpCap); cap.position.set(x, h - 4 - h * 0.21, z); scene.add(cap);
    }

    /* ---- private-jet parking by the grid ---- */
    const ta = at(ctx, 4, ctx.HALF_W + 52, 0);
    const tarmac = new THREE.Mesh(new THREE.BoxGeometry(120, 0.14, 52), L(THREE, 0x2c2f34));
    tarmac.position.copy(ta.pos); tarmac.position.y = 0.02; tarmac.rotation.y = ctx.headingOf(ta.tangent); scene.add(tarmac);
    [[0xf2f2f2, 0xc9a227, -34, 0.5], [0x22242c, 0xc9a227, 0, 0.42], [0xd8dde2, 0xb02020, 34, 0.58]].forEach(([livery, gold, off, rot]) => {
      const { jet, beacon } = makeJet(ctx, livery, gold);
      const p = at(ctx, 4, ctx.HALF_W + 52 + off * 0.3, 0);
      jet.position.set(p.pos.x + off * 0.72, 0.55, p.pos.z + off * 0.28);
      jet.rotation.y = ctx.headingOf(p.tangent) + Math.PI / 2 + rot;
      scene.add(jet); anim.beacons.push(beacon.material);
    });
    const jetSignTex = ctx.billboardTexture('PRIVATE JETS ONLY BEYOND THIS POINT', 45);
    const jetSign = new THREE.Mesh(new THREE.PlaneGeometry(16, 6.1), new THREE.MeshLambertMaterial({ map: jetSignTex, side: THREE.DoubleSide }));
    const js = at(ctx, 880, ctx.HALF_W + 22, 0); jetSign.position.set(js.pos.x, 5.4, js.pos.z); jetSign.lookAt(js.sample.x, 5.4, js.sample.z); scene.add(jetSign);

    /* ---- the panel stage: GREAT RESET AHEAD ---- */
    const pa = at(ctx, 428, ctx.HALF_W + 30, 0);
    const stage = new THREE.Group(); stage.position.copy(pa.pos); stage.lookAt(pa.sample.x, 0, pa.sample.z);
    const platform = new THREE.Mesh(new THREE.BoxGeometry(28, 1.3, 13), L(THREE, 0x1d2126)); platform.position.y = 0.65; stage.add(platform);
    const screenTex = ctx.canvasTexture(1024, 440, (g, w, h) => {
      g.fillStyle = '#0d1322'; g.fillRect(0, 0, w, h);
      g.strokeStyle = '#c9a227'; g.lineWidth = 10; g.strokeRect(14, 14, w - 28, h - 28);
      g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillStyle = '#c9a227'; g.font = '900 96px system-ui'; g.fillText('GREAT RESET AHEAD', w / 2, h * 0.3);
      g.fillStyle = '#e8ecf2'; g.font = '700 46px system-ui';
      g.fillText('ANNUAL MEETING OF THE OWNERS OF EVERYTHING', w / 2, h * 0.55);
      g.fillStyle = '#8fa3bd'; g.font = '600 40px system-ui'; g.fillText('NO QUESTIONS FROM THE PUBLIC', w / 2, h * 0.76);
    });
    const screen = new THREE.Mesh(new THREE.PlaneGeometry(23, 9.9), new THREE.MeshLambertMaterial({ map: screenTex }));
    screen.position.set(0, 7.2, -5.4); stage.add(screen);
    const chairMat = L(THREE, 0x39404a);
    for (let rI = 0; rI < 4; rI++) for (let cI = 0; cI < 8; cI++) {
      const chair = new THREE.Mesh(new THREE.BoxGeometry(1.1, 1.1, 1.1), chairMat);
      chair.position.set(-8.75 + cI * 2.5, 0.55, 3.4 + rI * 2.6); stage.add(chair);
    }
    for (const sx of [-15.5, 15.5]) {
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 10, 6), L(THREE, 0x22242a)); pole.position.set(sx, 5, -4); stage.add(pole);
      const head = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.8, 0.5), new THREE.MeshStandardMaterial({ color: 0x333333, emissive: 0xfff2c0, emissiveIntensity: 1.6 })); head.position.set(sx, 10.2, -4); stage.add(head);
    }
    scene.add(stage);

    /* ---- security perimeter + watchtower with sweeping searchlight ---- */
    const fenceM = new THREE.InstancedMesh(new THREE.BoxGeometry(0.16, 2.4, 4.6), L(THREE, 0x30363e), 48);
    let fCount = 0;
    for (let idx = 556; idx <= 700 && fCount < 48; idx += 3) {
      const a = at(ctx, idx, ctx.HALF_W + 7.5, 0);
      q.setFromEuler(e.set(0, ctx.headingOf(a.tangent), 0));
      m4.compose(new THREE.Vector3(a.pos.x, 1.2, a.pos.z), q, one); fenceM.setMatrixAt(fCount++, m4);
    }
    fenceM.count = fCount; scene.add(fenceM);
    const wa = at(ctx, 628, ctx.HALF_W + 15, 0);
    const tower = new THREE.Group(); tower.position.copy(wa.pos); tower.lookAt(wa.sample.x, 0, wa.sample.z);
    const legMat = L(THREE, 0x3a3f46), cabinMat = L(THREE, 0x272b31);
    for (const [lx, lz] of [[-1.5, -1.5], [1.5, -1.5], [-1.5, 1.5], [1.5, 1.5]]) {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 9, 6), legMat); leg.position.set(lx, 4.5, lz); tower.add(leg);
    }
    const cabin = new THREE.Mesh(new THREE.BoxGeometry(3.8, 2.4, 3.8), cabinMat); cabin.position.y = 10.2; tower.add(cabin);
    const glass = new THREE.Mesh(new THREE.BoxGeometry(3.9, 0.9, 3.9), new THREE.MeshStandardMaterial({ color: 0x9fd4e8, roughness: 0.1, metalness: 0.6 })); glass.position.y = 10.7; tower.add(glass);
    const roof = new THREE.Mesh(new THREE.ConeGeometry(3.2, 1.6, 4), L(THREE, 0x7a1f2b)); roof.position.y = 12.2; roof.rotation.y = Math.PI / 4; tower.add(roof);
    const tBeacon = new THREE.Mesh(new THREE.SphereGeometry(0.3, 8, 8), new THREE.MeshBasicMaterial({ color: 0xff2a1a })); tBeacon.position.y = 13.3; tower.add(tBeacon);
    anim.beacons.push(tBeacon.material);
    const beamGeo = new THREE.ConeGeometry(4.2, 26, 14, 1, true); beamGeo.rotateX(-Math.PI / 2); beamGeo.translate(0, 0, 13);
    const beam = new THREE.Mesh(beamGeo, new THREE.MeshBasicMaterial({ color: 0xfff3b0, transparent: true, opacity: 0.16, depthWrite: false, side: THREE.DoubleSide }));
    beam.position.y = 10.6; tower.add(beam); anim.searchlight = beam;
    scene.add(tower);

    /* ---- fondue + chocolate chalets ---- */
    const chalet = (idx, lat, signText, hue) => {
      const a = at(ctx, idx, lat, 0);
      const g = new THREE.Group(); g.position.copy(a.pos); g.lookAt(a.sample.x, 0, a.sample.z);
      const walls = new THREE.Mesh(new THREE.BoxGeometry(8, 4.2, 6.5), L(THREE, 0x7a5230)); walls.position.y = 2.1; walls.castShadow = true; g.add(walls);
      const roofM = new THREE.Mesh(new THREE.ConeGeometry(6.6, 3, 4), L(THREE, 0xf4f8fa)); roofM.position.y = 5.7; roofM.rotation.y = Math.PI / 4; roofM.scale.z = 0.78; g.add(roofM);
      const tex = ctx.billboardTexture(signText, hue);
      const s = new THREE.Mesh(new THREE.PlaneGeometry(8.6, 3.3), new THREE.MeshLambertMaterial({ map: tex, side: THREE.DoubleSide }));
      s.position.set(0, 3.1, 3.4); g.add(s);
      scene.add(g);
    };
    chalet(196, -(ctx.HALF_W + 14), 'FONDUE — $400', 40);
    chalet(238, -(ctx.HALF_W + 14), 'CHOCOLATE NEUTRALITY', 20);

    /* ---- falling snow ---- */
    const SNOW = 650, posArr = new Float32Array(SNOW * 3);
    for (let i = 0; i < SNOW; i++) {
      posArr[i * 3] = ctx.trackCenter.x + rand(-480, 480);
      posArr[i * 3 + 1] = rand(2, 115);
      posArr[i * 3 + 2] = ctx.trackCenter.z + rand(-480, 480);
    }
    const snowGeo = new THREE.BufferGeometry();
    snowGeo.setAttribute('position', new THREE.BufferAttribute(posArr, 3));
    const snow = new THREE.Points(snowGeo, new THREE.PointsMaterial({ color: 0xffffff, size: 1.5, transparent: true, opacity: 0.85, depthWrite: false }));
    snow.frustumCulled = false; scene.add(snow);
    anim.snow = snow; anim.snowPos = posArr;
  }

  function tick(dt, t) {
    if (!anim) return;
    anim.beacons.forEach((m, i) => { m.color.setHex(Math.sin(t * 2.6 + i * 1.7) > 0.2 ? 0xff2a1a : 0x57120c); });
    if (anim.searchlight) anim.searchlight.rotation.y = Math.sin(t * 0.55) * 0.85;
    if (anim.snow) {
      const p = anim.snowPos;
      for (let i = 0; i < p.length; i += 3) {
        p[i + 1] -= dt * (5 + (i % 5));
        p[i] += Math.sin(t * 0.8 + i) * dt * 1.3;
        if (p[i + 1] < 0) p[i + 1] = 115;
      }
      anim.snow.geometry.attributes.position.needsUpdate = true;
    }
  }

  window.BK_TRACKS.push({
    name: 'Davos Circuit', sky: 0xbfd9ee, fog: 0xdfe9f2, ground: 0xe9eff3, roadSeed: 5, shoulder: 0xb9c4cc,
    points: [[-140, 150], [-160, 30], [-120, -80], [-30, -150], [80, -165], [170, -100], [205, 10], [160, 110], [60, 170], [-50, 185]],
    billboards: ['GREAT RESET AHEAD', 'YOU WILL OWN NOTHING', 'FONDUE IS A FOOD GROUP', 'CHOCOLATE NEUTRALITY SINCE 1815', 'NO APRÈS-SKI FOR STAFF', 'PANEL STARTS IN 5 MIN'],
    standColors: [0x7a1f2b, 0xf2f2f2, 0x7a1f2b, 0x22242a],
    banner: '🏁 DAVOS CIRCUIT 🏁',
    buildDressing, tick,
  });
})();
