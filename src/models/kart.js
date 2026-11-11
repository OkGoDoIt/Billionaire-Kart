/* Kart model: a sculpted go-kart built from lofted shells and tubes, in each
   racer's colours, with spinning and steering wheels, a name plate, exhausts,
   and a bobblehead driver. Returns a rig with named parts for animation. */
import * as THREE from 'three';
import { ModelBuilder, box, sphere, cyl, torus, tube, loft, lathe, paint, plastic, glow, MAT } from './build.js';
import { buildDriver } from './driver.js';
import { canvasTex } from '../render/textures.js';

export const KART = {
  frontZ: 0.8, rearZ: -0.72, frontX: 0.64, rearX: 0.7,
  frontR: 0.31, rearR: 0.37, frontW: 0.3, rearW: 0.4,
  seatY: 0.5, seatZ: -0.3,
};

let wheelGeoCache = null;
function wheelGeos() {
  if (wheelGeoCache) return wheelGeoCache;
  // tyre profile (radius, x across the tread), normalised to radius 1 and width 1
  const tyre = lathe([[0.56, -0.5], [0.8, -0.5], [0.95, -0.42], [1.0, -0.25], [1.0, 0.25], [0.95, 0.42], [0.8, 0.5], [0.56, 0.5]], 26);
  tyre.rotateZ(Math.PI / 2);
  const rim = new ModelBuilder();
  rim.add('rim', cyl(0.58, 0.58, 0.82, 22), { r: [0, 0, Math.PI / 2] });
  rim.add('hub', cyl(0.2, 0.26, 0.9, 12), { r: [0, 0, Math.PI / 2] });
  for (let i = 0; i < 5; i++) { const a = (i / 5) * Math.PI * 2; rim.add('hub', box(0.86, 0.1, 0.14, 0.03, 1), { p: [0, Math.cos(a) * 0.3, Math.sin(a) * 0.3], r: [a, 0, 0], s: [1.04, 1, 1] }); }
  wheelGeoCache = { tyre, rim };
  return wheelGeoCache;
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
 * Returns { root, body, wheels:[fl,fr,rl,rr], steerPivots:[fl,fr], driver, head, steering, exhausts:[Object3D], plate }
 */
export function buildKart(racer, { shadow = true } = {}) {
  const main = racer.color, second = racer.color2 ?? 0xffffff;
  const root = new THREE.Group(); root.name = 'kart:' + racer.id;
  const tilt = new THREE.Group(); tilt.name = 'tilt'; root.add(tilt);
  const body = new THREE.Group(); body.name = 'body'; tilt.add(body);
  const b = new ModelBuilder();
  const K = KART;

  /* --- chassis shell: low nose, bulging flanks, kicked-up tail --- */
  b.add('main', loft([
    { z: -1.06, w: 0.26, h: 0.11, y: 0.5, n: 3.2 },
    { z: -0.9, w: 0.44, h: 0.2, y: 0.47, n: 3.2 },
    { z: -0.45, w: 0.5, h: 0.23, y: 0.44, n: 3.4 },
    { z: 0.1, w: 0.46, h: 0.21, y: 0.41, n: 3.2 },
    { z: 0.6, w: 0.36, h: 0.17, y: 0.38, n: 2.8 },
    { z: 1.02, w: 0.27, h: 0.13, y: 0.35, n: 2.6 },
    { z: 1.3, w: 0.13, h: 0.075, y: 0.33, n: 2.4 },
  ], 28, 4));
  // nose stripe and front number shield
  b.add('second', loft([
    { z: 0.2, w: 0.13, h: 0.02, y: 0.625, n: 2 }, { z: 0.6, w: 0.11, h: 0.02, y: 0.548, n: 2 }, { z: 1.0, w: 0.085, h: 0.02, y: 0.478, n: 2 }, { z: 1.26, w: 0.05, h: 0.02, y: 0.4, n: 2 },
  ], 12, 3));
  // side pods
  for (const sx of [1, -1]) {
    b.add('main', loft([
      { z: -0.42, w: 0.1, h: 0.1, y: 0.35, x: sx * 0.6, n: 3 }, { z: -0.3, w: 0.17, h: 0.15, y: 0.37, x: sx * 0.62, n: 3.4 },
      { z: 0.15, w: 0.17, h: 0.14, y: 0.36, x: sx * 0.62, n: 3.4 }, { z: 0.42, w: 0.1, h: 0.09, y: 0.33, x: sx * 0.6, n: 3 },
    ], 16, 3));
    b.add('second', box(0.16, 0.025, 0.56, 0.01, 1), { p: [sx * 0.62, 0.515, -0.07] });
    // intake
    b.add('black', box(0.2, 0.12, 0.03, 0.012, 1), { p: [sx * 0.62, 0.37, 0.41] });
  }
  // cockpit recess and seat
  b.add('black', sphere(0.5, 20, 10), { p: [0, 0.63, -0.26], s: [0.74, 0.1, 0.95] });
  b.add('seat', loft([
    { z: -0.74, w: 0.26, h: 0.3, y: 0.86, n: 3 }, { z: -0.66, w: 0.3, h: 0.34, y: 0.88, n: 3 }, { z: -0.56, w: 0.28, h: 0.31, y: 0.86, n: 3 },
  ], 18, 2));
  b.add('seat', box(0.5, 0.1, 0.42, 0.04, 2), { p: [0, 0.6, -0.36] });
  // steering column and wheel hub
  b.add('dark', cyl(0.035, 0.035, 0.5, 8), { p: [0, 0.7, 0.44], r: [0.95, 0, 0] });
  b.add('second', loft([{ z: 0.36, w: 0.2, h: 0.1, y: 0.62, n: 2.6 }, { z: 0.52, w: 0.16, h: 0.14, y: 0.66, n: 2.6 }, { z: 0.66, w: 0.1, h: 0.08, y: 0.6, n: 2.6 }], 14, 2));
  // bumpers: tubular, front and rear
  b.add('chrome', tube([[-0.5, 0.27, 1.08], [-0.34, 0.25, 1.36], [0, 0.24, 1.46], [0.34, 0.25, 1.36], [0.5, 0.27, 1.08]], 0.045, 26, 8));
  b.add('chrome', tube([[-0.56, 0.3, -1.0], [-0.4, 0.3, -1.22], [0.4, 0.3, -1.22], [0.56, 0.3, -1.0]], 0.045, 20, 8));
  for (const sx of [1, -1]) b.add('chrome', tube([[sx * 0.5, 0.27, 1.08], [sx * 0.34, 0.3, 0.86]], 0.035, 4, 6));
  // engine block and exhausts
  b.add('dark', box(0.5, 0.26, 0.34, 0.05, 2), { p: [0, 0.66, -0.98] });
  b.add('steel', box(0.36, 0.06, 0.26, 0.02, 1), { p: [0, 0.82, -0.98] });
  for (const sx of [1, -1]) {
    b.add('chrome', tube([[sx * 0.18, 0.7, -1.0], [sx * 0.26, 0.74, -1.18], [sx * 0.3, 0.86, -1.34]], 0.062, 12, 10));
    b.add('black', cyl(0.045, 0.045, 0.02, 10), { p: [sx * 0.305, 0.875, -1.36], r: [0.9, 0, 0] });
  }
  // axles
  b.add('dark', cyl(0.04, 0.04, K.frontX * 2, 8), { p: [0, K.frontR, K.frontZ], r: [0, 0, Math.PI / 2] });
  b.add('dark', cyl(0.05, 0.05, K.rearX * 2, 8), { p: [0, K.rearR, K.rearZ], r: [0, 0, Math.PI / 2] });
  // rear wing on struts
  for (const sx of [1, -1]) b.add('dark', box(0.04, 0.34, 0.1, 0.012, 1), { p: [sx * 0.3, 0.98, -1.06], r: [0.2, 0, 0] });
  b.add('main', box(1.2, 0.05, 0.32, 0.022, 2), { p: [0, 1.16, -1.1], r: [-0.12, 0, 0] });
  for (const sx of [1, -1]) b.add('second', box(0.04, 0.2, 0.36, 0.014, 1), { p: [sx * 0.61, 1.15, -1.1] });
  // headlights
  for (const sx of [1, -1]) b.add('lamp', sphere(0.05, 10, 8), { p: [sx * 0.2, 0.37, 1.2], s: [1, 0.8, 0.6] });

  const mainMat = paint(main), secondMat = paint(second, { rough: 0.4, clear: 0.4 });
  const bodyMesh = b.build({ main: mainMat, second: secondMat, seat: plastic(0x2a2c33, 0.8), dark: MAT.dark, chrome: MAT.chrome, steel: MAT.steel, black: MAT.black, lamp: glow(0xfff2c0, 1.6), default: MAT.dark });
  body.add(bodyMesh);

  // name plate under the wing, facing backward
  const fg = luminance(second) > 0.5 ? 0x15161c : 0xffffff;
  const plate = new THREE.Mesh(new THREE.PlaneGeometry(0.86, 0.27), new THREE.MeshStandardMaterial({ map: plateTexture(racer.name.toUpperCase(), second, fg), roughness: 0.5, metalness: 0 }));
  plate.position.set(0, 0.98, -1.15); plate.rotation.y = Math.PI; plate.rotation.x = 0.06; body.add(plate);

  // steering wheel (rotates with input)
  const steering = new THREE.Group(); steering.position.set(0, 0.86, 0.26); steering.rotation.x = -0.62; body.add(steering);
  const sw = new THREE.Mesh(torus(0.16, 0.03, 8, 20), MAT.black); sw.castShadow = true; steering.add(sw);
  const swBar = new THREE.Mesh(box(0.3, 0.035, 0.03, 0.01, 1), MAT.dark); steering.add(swBar);

  /* --- wheels --- */
  const { tyre, rim } = wheelGeos();
  const rimMats = { rim: plastic(0xe9edf2, 0.3, 0.7), hub: paint(second === 0xffffff ? main : second, { rough: 0.35, clear: 0.3 }), default: MAT.steel };
  if (!wheelGeoCache.rimMeshGeo) {
    // bake rim buckets once into reusable geometries
    const g = rim.build({ rim: rimMats.rim, hub: rimMats.hub });
    wheelGeoCache.rimMeshGeo = g.children.map(m => ({ name: m.name, geo: m.geometry }));
  }
  const wheels = [], steerPivots = [];
  const mk = (x, z, r, w, steer) => {
    const pivot = new THREE.Group(); pivot.position.set(x, r, z); tilt.add(pivot);
    const spin = new THREE.Group(); pivot.add(spin);
    const t = new THREE.Mesh(tyre, MAT.rubber); t.scale.set(w, r, r); t.castShadow = shadow; spin.add(t);
    for (const part of wheelGeoCache.rimMeshGeo) { const m = new THREE.Mesh(part.geo, rimMats[part.name]); m.scale.set(w, r, r); spin.add(m); }
    wheels.push(spin); if (steer) steerPivots.push(pivot);
    spin.userData.radius = r; pivot.userData.baseY = r;
    return pivot;
  };
  mk(K.frontX, K.frontZ, K.frontR, K.frontW, true); mk(-K.frontX, K.frontZ, K.frontR, K.frontW, true);
  mk(K.rearX, K.rearZ, K.rearR, K.rearW, false); mk(-K.rearX, K.rearZ, K.rearR, K.rearW, false);

  /* --- driver --- */
  const driver = buildDriver(racer);
  driver.position.set(0, K.seatY, K.seatZ);
  body.add(driver);
  let driver2 = null;
  if (racer.look.duo) {
    // the co-founder rides pillion, a little higher so both heads read from behind
    driver2 = buildDriver(racer, { faceId: racer.id + '2', look: { ...racer.look, ...racer.look.duo, glasses: null }, scale: 0.86 });
    driver2.position.set(0, K.seatY + 0.34, K.seatZ - 0.62);
    body.add(driver2);
    driver.position.z += 0.16;
  }

  /* --- effect anchors --- */
  const exhausts = [1, -1].map(sx => { const o = new THREE.Object3D(); o.position.set(sx * 0.31, 0.89, -1.4); body.add(o); return o; });
  const rearWheelsFx = [1, -1].map(sx => { const o = new THREE.Object3D(); o.position.set(sx * K.rearX, 0.05, K.rearZ - 0.1); tilt.add(o); return o; });
  const trailAnchor = new THREE.Object3D(); trailAnchor.position.set(0, 0.5, -1.9); tilt.add(trailAnchor);

  root.traverse(o => { if (o.isMesh) { o.castShadow = shadow; o.receiveShadow = false; } });
  return { root, tilt, body, bodyMesh, wheels, steerPivots, driver, driver2, head: driver.userData.head, head2: driver2?.userData.head, torso: driver.userData.torso, steering, exhausts, rearWheelsFx, trailAnchor, plate, mainMat };
}
