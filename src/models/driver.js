/* Bobblehead driver: body, arms, and an oversized head with a generated face
   texture wrapped on the front, plus hair, hats, and accessories by style. */
import * as THREE from 'three';
import { ModelBuilder, box, sphere, cyl, capsule, torus, cone, tube, lathe, plastic, MAT } from './build.js';
import { FACES } from '../content/faces.js';
import { addHair } from './hair.js';

const texLoader = new THREE.TextureLoader();
const faceCache = new Map();
function faceTexture(url) {
  if (!faceCache.has(url)) {
    const t = texLoader.load(url);
    t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
    faceCache.set(url, t);
  }
  return faceCache.get(url);
}

export const HEAD_R = 0.43;

/** Build one head (group pivoted at the neck). */
function buildHead(look, faceId) {
  const head = new THREE.Group(); head.name = 'head';
  const face = FACES[faceId];
  const skin = new THREE.Color(face ? face.skin : look.skin);
  const skinMat = new THREE.MeshStandardMaterial({ color: skin, roughness: 0.62, metalness: 0, envMapIntensity: 0.6 });
  const hairMat = new THREE.MeshStandardMaterial({ color: look.hairColor ?? 0x2a2420, roughness: 0.72, metalness: 0, envMapIntensity: 0.55 });
  const R = HEAD_R, cy = R * 1.02;        // head centre above the neck pivot
  const b = new ModelBuilder();

  // skull
  b.add('skin', sphere(R, 32, 24), { p: [0, cy, 0], s: [1, 1.07, 1.02] });
  // ears
  for (const sx of [1, -1]) b.add('skin', sphere(0.1, 12, 10), { p: [sx * R * 0.98, cy - 0.03, -0.02], s: [0.5, 1, 0.8] });
  // neck
  b.add('skin', cyl(0.13, 0.15, 0.2, 14), { p: [0, -0.02, 0] });

  const top = cy + R * 1.07;
  addHair(b, look, faceId, R, cy);
  if (look.hat === 'cowboy') {
    b.add('hat', lathe([[0, 0.34], [0.2, 0.33], [0.26, 0.24], [0.3, 0.06], [0.33, 0.0]], 24), { p: [0, top - 0.14, 0], s: [1.08, 1, 1.08] });
    const brim = torus(0.5, 0.045, 8, 32); b.add('hat', brim, { p: [0, top - 0.13, 0], r: [Math.PI / 2, 0, 0], s: [1.1, 1.1, 1.6] });
    b.add('hat', cyl(0.5, 0.5, 0.03, 28), { p: [0, top - 0.135, 0], s: [1.1, 1, 1.1] });
    b.add('hatband', cyl(0.34, 0.34, 0.06, 24, true), { p: [0, top - 0.08, 0], s: [1.06, 1, 1.06] });
  } else if (look.hat === 'cap') {
    const g = new THREE.SphereGeometry(R * 1.07, 24, 10, 0, Math.PI * 2, 0, Math.PI * 0.44);
    b.add('hat', g, { p: [0, cy + 0.02, 0], r: [-0.12, 0, 0], s: [1, 1.05, 1.02] });
    b.add('hat', box(0.44, 0.03, 0.3, 0.014, 2), { p: [0, cy + R * 0.42, R * 0.98], r: [0.14, 0, 0] });
    b.add('hatband', sphere(0.035, 8, 6), { p: [0, cy + R * 1.13, -0.02] });
  }
  if (look.chain) b.add('gold', torus(0.17, 0.016, 6, 22), { p: [0, -0.06, 0.03], r: [Math.PI / 2 - 0.35, 0, 0] });

  const hatColor = look.hat === 'cowboy' ? 0x8a5a34 : (look.accent ?? 0x222222);
  const g = b.build({ skin: skinMat, hair: hairMat, hat: plastic(hatColor, 0.75), hatband: plastic(look.hat === 'cowboy' ? 0x3a2414 : 0xffffff, 0.6), gold: plastic(0xffcf4a, 0.25, 1), default: skinMat });
  head.add(g);

  // the face: a patch of sphere just proud of the skull, carrying the generated texture
  if (face) {
    const span = Math.PI * 0.86, tStart = Math.PI * 0.2, tLen = Math.PI * 0.62;
    const fg = new THREE.SphereGeometry(R * 1.006, 28, 22, Math.PI / 2 - span / 2, span, tStart, tLen);
    const fm = new THREE.MeshStandardMaterial({ map: faceTexture(face.img), transparent: true, roughness: 0.62, metalness: 0, envMapIntensity: 0.6, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 });
    const fmesh = new THREE.Mesh(fg, fm);
    fmesh.position.set(0, cy, 0); fmesh.scale.set(1, 1.07, 1.02); fmesh.name = 'face'; fmesh.renderOrder = 1;
    head.add(fmesh);
    head.userData.face = fmesh;
  }
  head.userData.center = cy;
  return head;
}

/**
 * Build a driver. Returns a Group with userData: { head, torso, steer } for animation.
 * Origin is the seat (hips); +Z is forward.
 */
export function buildDriver(racer, { scale = 1, faceId = racer.id, look = racer.look } = {}) {
  const g = new THREE.Group(); g.name = 'driver';
  const torso = new THREE.Group(); torso.name = 'torso'; g.add(torso);
  const top = look.top ?? 0x333333;
  const b = new ModelBuilder();
  const face = FACES[faceId];
  const skinMat = plastic(new THREE.Color(face ? face.skin : look.skin).getHex(), 0.62);

  // torso: a soft barrel leaning back a touch, with shoulders
  b.add('top', capsule(0.25, 0.3, 6, 18), { p: [0, 0.4, 0], r: [-0.08, 0, 0], s: [1.08, 1, 0.9] });
  b.add('top', sphere(0.15, 14, 10), { p: [0.3, 0.62, 0.0] });
  b.add('top', sphere(0.15, 14, 10), { p: [-0.3, 0.62, 0.0] });
  // arms reach for the wheel
  for (const sx of [1, -1]) {
    b.add('top', tube([[sx * 0.33, 0.6, 0.0], [sx * 0.42, 0.42, 0.22], [sx * 0.3, 0.36, 0.46]], 0.085, 10, 8), {});
    b.add('skin', sphere(0.095, 12, 10), { p: [sx * 0.19, 0.36, 0.54] });
    b.add('top', tube([[sx * 0.3, 0.36, 0.46], [sx * 0.2, 0.36, 0.54]], 0.08, 4, 8), {});
  }
  // outfit details
  const outfit = look.outfit || 'tee';
  if (outfit === 'suit') {
    b.add('shirt', box(0.2, 0.3, 0.06, 0.02, 2), { p: [0, 0.5, 0.215], r: [-0.08, 0, 0] });
    b.add('tie', box(0.07, 0.26, 0.03, 0.012, 2), { p: [0, 0.47, 0.25], r: [-0.08, 0, 0] });
    b.add('top', torus(0.17, 0.04, 6, 18), { p: [0, 0.71, 0.0], r: [Math.PI / 2, 0, 0], s: [1, 1, 0.8] });
  } else if (outfit === 'jacket') {
    b.add('accent', box(0.025, 0.34, 0.03, 0.01, 1), { p: [0, 0.46, 0.232], r: [-0.08, 0, 0] });
    b.add('top', torus(0.18, 0.05, 6, 18), { p: [0, 0.72, 0.0], r: [Math.PI / 2, 0, 0] });
  } else if (outfit === 'turtleneck') {
    b.add('top', cyl(0.15, 0.17, 0.16, 16), { p: [0, 0.76, 0.0] });
  } else if (outfit === 'racing') {
    b.add('accent', box(0.52, 0.07, 0.4, 0.03, 2), { p: [0, 0.5, 0.0] });
    b.add('accent', torus(0.17, 0.04, 6, 18), { p: [0, 0.72, 0.0], r: [Math.PI / 2, 0, 0] });
  } else {
    b.add('accent', torus(0.16, 0.03, 6, 18), { p: [0, 0.71, 0.0], r: [Math.PI / 2, 0, 0] });
  }
  torso.add(b.build({ top: plastic(top, 0.72), skin: skinMat, shirt: MAT.white, tie: plastic(look.tie ?? look.accent ?? 0xcc2222, 0.5), accent: plastic(look.accent ?? 0xffffff, 0.5), default: MAT.dark }));

  const head = buildHead(look, faceId);
  head.position.set(0, 0.8, -0.01);
  torso.add(head);

  g.scale.setScalar(scale);
  g.userData = { head, torso };
  return g;
}

/** Preload every face texture (resolves when they are decoded). */
export function preloadFaces() {
  return Promise.all(Object.values(FACES).map(f => new Promise(res => { const t = texLoader.load(f.img, () => res(), undefined, () => res()); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; faceCache.set(f.img, t); })));
}
