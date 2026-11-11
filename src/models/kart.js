/* Kart model: each racer drives a signature body (see kart-bodies.js) in their
   colours, on shared wheels and running gear, with a name plate, exhausts, and a
   bobblehead driver. Returns a rig with named parts for animation. */
import * as THREE from 'three';
import { ModelBuilder, box, sphere, cyl, torus, lathe, paint, plastic, glow, MAT } from './build.js';
import { buildDriver } from './driver.js';
import { BODIES } from './kart-bodies.js';
import { canvasTex } from '../render/textures.js';

export const KART = {
  frontZ: 0.8, rearZ: -0.72, frontX: 0.64, rearX: 0.7,
  frontR: 0.31, rearR: 0.37, frontW: 0.3, rearW: 0.4,
  seatY: 0.5, seatZ: -0.3,
};

/* ---------- wheels: normalised to radius 1 and width 1, scaled per axle ---------- */
const wheelCache = new Map();
const tyreProfile = () => { const g = lathe([[0.56, -0.5], [0.8, -0.5], [0.95, -0.42], [1.0, -0.25], [1.0, 0.25], [0.95, 0.42], [0.8, 0.5], [0.56, 0.5]], 26); g.rotateZ(Math.PI / 2); return g; };
const facingX = (g, sx = 1) => { g.rotateY(sx * Math.PI / 2); return g; };
function wheelGeos(style) {
  if (wheelCache.has(style)) return wheelCache.get(style);
  const t = new ModelBuilder(), r = new ModelBuilder(), ax = [0, 0, Math.PI / 2];
  if (style === 'knobby') {
    t.add('t', tyreProfile(), { s: [1, 0.93, 0.93] });
    for (let i = 0; i < 18; i++) { const a = (i / 18) * Math.PI * 2; for (const sx of [1, -1]) t.add('t', new THREE.BoxGeometry(0.4, 0.1, 0.2), { p: [sx * (i % 2 ? 0.22 : 0.2), Math.cos(a + (sx > 0 ? 0 : 0.17)) * 0.95, Math.sin(a + (sx > 0 ? 0 : 0.17)) * 0.95], r: [a + (sx > 0 ? 0 : 0.17), 0, 0] }); }
  } else t.add('t', tyreProfile());
  if (style === 'wire') {
    t.add('t', cyl(0.56, 0.56, 0.04, 20), { r: ax });
    for (const sx of [1, -1]) {
      r.add('rim', facingX(new THREE.RingGeometry(0.6, 0.8, 26), sx), { p: [sx * 0.505, 0, 0] });
      r.add('rim', torus(0.56, 0.05, 6, 24), { p: [sx * 0.28, 0, 0], r: [0, Math.PI / 2, 0] });
    }
    for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2; for (const sx of [1, -1]) r.add('rim', cyl(0.018, 0.018, 0.58, 4), { p: [sx * 0.18, Math.cos(a) * 0.3, Math.sin(a) * 0.3], r: [a, 0, sx * 0.5] }); }
    r.add('hub', cyl(0.14, 0.18, 0.86, 14), { r: ax });
  } else if (style === 'disc') {
    r.add('rim', cyl(0.6, 0.6, 0.84, 24), { r: ax });
    r.add('hub', cyl(0.24, 0.24, 0.9, 16), { r: ax });
    for (const sx of [1, -1]) r.add('hub', torus(0.44, 0.035, 6, 26), { p: [sx * 0.42, 0, 0], r: [0, Math.PI / 2, 0] });
  } else {
    r.add('rim', cyl(0.58, 0.58, 0.82, 22), { r: ax });
    r.add('hub', cyl(0.2, 0.26, 0.9, 12), { r: ax });
    for (let i = 0; i < 5; i++) { const a = (i / 5) * Math.PI * 2; r.add('hub', box(0.86, 0.1, 0.14, 0.03, 1), { p: [0, Math.cos(a) * 0.3, Math.sin(a) * 0.3], r: [a, 0, 0], s: [1.04, 1, 1] }); }
  }
  const tm = MAT.rubber, rm = MAT.white;
  const out = { tyre: t.build({ t: tm }).children[0].geometry, parts: r.build({ rim: rm, hub: rm }).children.map(m => ({ name: m.name, geo: m.geometry })) };
  wheelCache.set(style, out);
  return out;
}

/** Name plate texture for the back of the kart. */
function plateTexture(text, bg, fg) {
  return canvasTex(256, 80, (g, w, h) => {
    g.fillStyle = '#' + new THREE.Color(bg).getHexString(); g.fillRect(0, 0, w, h);
    g.strokeStyle = 'rgba(0,0,0,0.35)'; g.lineWidth = 8; g.strokeRect(4, 4, w - 8, h - 8);
    g.fillStyle = '#' + new THREE.Color(fg).getHexString(); g.textAlign = 'center'; g.textBaseline = 'middle';
    let size = 58; g.font = `${size}px "Luckiest Guy", "Arial Black", sans-serif`;
    while (g.measureText(text).width > w - 30 && size > 18) { size -= 3; g.font = `${size}px "Luckiest Guy", "Arial Black", sans-serif`; }
    g.fillText(text, w / 2, h / 2 + 4);
  }, { repeat: false, aniso: 4 });
}

const luminance = hex => { const c = new THREE.Color(hex); return 0.2126 * c.r + 0.7152 * c.g + 0.0722 * c.b; };

/**
 * Build a kart for a racer.
 * Returns { root, tilt, body, bodyMesh, wheels:[fl,fr,rl,rr], steerPivots:[fl,fr], driver, driver2, head, head2, torso,
 *           steering, exhausts:[Object3D], rearWheelsFx, trailAnchor, plate, mainMat, spinners:[Group] }
 * Spinners (fan rotors, propellers) turn about their local Z axis.
 */
export function buildKart(racer, { shadow = true } = {}) {
  const main = racer.color, second = racer.color2 ?? 0xffffff;
  const root = new THREE.Group(); root.name = 'kart:' + racer.id;
  const tilt = new THREE.Group(); tilt.name = 'tilt'; root.add(tilt);
  const body = new THREE.Group(); body.name = 'body'; tilt.add(body);
  const K = KART;
  const style = BODIES[racer.look.kart] ? racer.look.kart : 'standard';

  /* --- body: built by the signature style into one mesh per material --- */
  const b = new ModelBuilder();
  const M = {
    main: paint(main), second: paint(second, { rough: 0.4, clear: 0.4 }), seat: plastic(0x2a2c33, 0.8),
    dark: MAT.dark, chrome: MAT.chrome, steel: MAT.steel, black: MAT.black, white: MAT.white, lamp: glow(0xfff2c0, 1.6), default: MAT.dark,
  };
  const spinners = [];
  const spinner = (p, r, build, mats) => {
    const mount = new THREE.Group(); mount.position.set(p[0], p[1], p[2]); mount.rotation.set(r[0], r[1], r[2]); body.add(mount);
    const mb = new ModelBuilder(); build(mb);
    const rotor = mb.build(mats); rotor.name = 'spinner'; mount.add(rotor); spinners.push(rotor);
    return rotor;
  };
  const L = BODIES[style]({ b, K, M, main, second, racer, spinner });
  const mainMat = M.main;
  const bodyMesh = b.build(M);
  body.add(bodyMesh);
  const S = L.seat ?? { x: 0, y: K.seatY, z: K.seatZ };

  // name plate, facing backward
  const fg = luminance(second) > 0.5 ? 0x15161c : 0xffffff;
  const plate = new THREE.Mesh(new THREE.PlaneGeometry(0.86, 0.27), new THREE.MeshStandardMaterial({ map: plateTexture(racer.name.toUpperCase(), second, fg), roughness: 0.5, metalness: 0 }));
  const pl = L.plate ?? { p: [0, 0.98, -1.15], rx: 0.06 };
  plate.position.set(pl.p[0], pl.p[1], pl.p[2]); plate.rotation.y = Math.PI; plate.rotation.x = pl.rx ?? 0; plate.scale.setScalar(pl.s ?? 1); body.add(plate);

  // steering wheel (rotates with input), just ahead of the driver's hands
  const steering = new THREE.Group(); steering.position.set(S.x, S.y + 0.36, S.z + 0.56); steering.rotation.x = -0.62; body.add(steering);
  if (L.steering === 'helm') {
    // a little ship's wheel: rim, spokes, and handles
    const hb = new ModelBuilder(), wood = plastic(0x8a5a30, 0.55);
    hb.add('w', torus(0.15, 0.022, 6, 20));
    for (let i = 0; i < 4; i++) { const a = (i / 4) * Math.PI; hb.add('w', cyl(0.012, 0.012, 0.42, 5), { r: [0, 0, a] }); }
    for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; hb.add('w', sphere(0.024, 6, 5), { p: [Math.cos(a) * 0.21, Math.sin(a) * 0.21, 0] }); }
    hb.add('w', cyl(0.04, 0.04, 0.05, 10), { r: [Math.PI / 2, 0, 0] });
    steering.add(hb.build({ w: wood }));
  } else {
    const sw = new THREE.Mesh(torus(0.16, 0.03, 8, 20), MAT.black); steering.add(sw);
    const swBar = new THREE.Mesh(box(0.3, 0.035, 0.03, 0.01, 1), MAT.dark); steering.add(swBar);
  }

  /* --- wheels --- */
  const ws = L.wheel ?? {};
  const { tyre, parts } = wheelGeos(ws.style ?? 'std');
  const rimMats = { rim: ws.rim ?? plastic(0xe9edf2, 0.3, 0.7), hub: ws.hub ?? paint(second === 0xffffff ? main : second, { rough: 0.35, clear: 0.3 }) };
  const wheels = [], steerPivots = [];
  const mk = (x, z, r, w, steer) => {
    const pivot = new THREE.Group(); pivot.position.set(x, r, z); tilt.add(pivot);
    const spin = new THREE.Group(); pivot.add(spin);
    const t = new THREE.Mesh(tyre, MAT.rubber); t.scale.set(w, r, r); spin.add(t);
    for (const part of parts) { const m = new THREE.Mesh(part.geo, rimMats[part.name]); m.scale.set(w, r, r); spin.add(m); }
    wheels.push(spin); if (steer) steerPivots.push(pivot);
    spin.userData.radius = r; pivot.userData.baseY = r;
    return pivot;
  };
  mk(K.frontX, K.frontZ, K.frontR, K.frontW, true); mk(-K.frontX, K.frontZ, K.frontR, K.frontW, true);
  mk(K.rearX, K.rearZ, K.rearR, K.rearW, false); mk(-K.rearX, K.rearZ, K.rearR, K.rearW, false);

  /* --- driver --- */
  const driver = buildDriver(racer);
  driver.position.set(S.x, S.y, S.z);
  body.add(driver);
  let driver2 = null;
  if (racer.look.duo) {
    driver2 = buildDriver(racer, { faceId: racer.id + '2', look: { ...racer.look, ...racer.look.duo, glasses: null }, scale: L.seat2?.scale ?? 0.86 });
    if (L.seat2) driver2.position.set(L.seat2.x, L.seat2.y, L.seat2.z);
    else {
      // the co-founder rides pillion, a little higher so both heads read from behind
      driver2.position.set(0, K.seatY + 0.34, K.seatZ - 0.62);
      driver.position.z += 0.16;
    }
    body.add(driver2);
  }

  /* --- effect anchors --- */
  const ex = L.exhausts ?? [[0.31, 0.89, -1.4], [-0.31, 0.89, -1.4]];
  const exhausts = ex.map(p => { const o = new THREE.Object3D(); o.position.set(p[0], p[1], p[2]); body.add(o); return o; });
  const rearWheelsFx = [1, -1].map(sx => { const o = new THREE.Object3D(); o.position.set(sx * K.rearX, 0.05, K.rearZ - 0.1); tilt.add(o); return o; });
  const trailAnchor = new THREE.Object3D(); trailAnchor.position.set(0, 0.5, -1.9); tilt.add(trailAnchor);

  root.traverse(o => { if (o.isMesh) { o.castShadow = shadow && !o.material.transparent; o.receiveShadow = false; } });
  return { root, tilt, body, bodyMesh, wheels, steerPivots, driver, driver2, head: driver.userData.head, head2: driver2?.userData.head, torso: driver.userData.torso, steering, exhausts, rearWheelsFx, trailAnchor, plate, mainMat, spinners, style };
}
