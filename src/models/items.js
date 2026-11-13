/* 3D models for pickups and items, matching the HUD icon set: ? boxes, coins,
   the data-leak droplet, subpoena scroll, tweet bird, antitrust briefcase,
   pink-slip bomb. Small and cheap; each factory returns a Group. */
import * as THREE from 'three';
import { ModelBuilder, box, sphere, cyl, cone, torus, lathe, plastic, glow, MAT } from './build.js';
import { canvasTex } from '../render/textures.js';

let cache = {};
const once = (key, fn) => cache[key] || (cache[key] = fn());

/* ---------- item box ---------- */
export function buildItemBox() {
  const g = new THREE.Group();
  const draw = (c, w) => {
    const gr = c.createLinearGradient(0, 0, w, w);
    gr.addColorStop(0, '#ff5fa2'); gr.addColorStop(0.35, '#ffd23c'); gr.addColorStop(0.65, '#3cf0c5'); gr.addColorStop(1, '#5a8bff');
    c.fillStyle = gr; c.fillRect(0, 0, w, w);
    c.fillStyle = 'rgba(255,255,255,0.22)'; c.fillRect(0, 0, w, w * 0.45);
    c.font = '100px "Luckiest Guy", "Arial Black", sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.lineWidth = 12; c.lineJoin = 'round'; c.strokeStyle = '#1a1440'; c.strokeText('?', w / 2, w / 2 + 8);
    c.fillStyle = '#ffffff'; c.fillText('?', w / 2, w / 2 + 8);
  };
  const tex = once('qtex', () => {
    const t = canvasTex(128, 128, draw, { repeat: false, aniso: 4 });
    // Safari can paint a just-loaded web font late, or lose a canvas under memory pressure: repaint once fonts settle
    const again = () => { draw(t.image.getContext('2d'), 128); t.needsUpdate = true; };
    if (document.fonts?.ready) document.fonts.ready.then(again);
    return t;
  });
  // Opaque on purpose: a see-through cube has to be depth-sorted against every other see-through thing on the
  // track, and the glow inside it was always hidden behind the front faces. Same look, no sorting to get wrong.
  const mat = once('qmat', () => new THREE.MeshStandardMaterial({ map: tex, emissiveMap: tex, emissive: 0xffffff, emissiveIntensity: 0.55, roughness: 0.15, metalness: 0.1 }));
  const cube = new THREE.Mesh(once('qgeo', () => box(1.3, 1.3, 1.3, 0.2, 4)), mat);
  cube.castShadow = true; g.add(cube);
  const core = new THREE.Object3D();   // kept so the renderer's pulse has something to scale
  g.add(core);
  g.userData = { cube, core };
  return g;
}

/* ---------- coin ---------- */
export function coinGeometry() {
  return once('coingeo', () => {
    const b = new ModelBuilder();
    b.add('m', cyl(0.5, 0.5, 0.1, 28), { r: [Math.PI / 2, 0, 0] });
    b.add('m', torus(0.46, 0.06, 8, 28), {});
    // raised $ on both faces
    for (const s of [1, -1]) {
      b.add('m', torus(0.13, 0.04, 6, 14, Math.PI * 1.4), { p: [0, 0.1, s * 0.055], r: [0, 0, 0.6] });
      b.add('m', torus(0.13, 0.04, 6, 14, Math.PI * 1.4), { p: [0, -0.1, s * 0.055], r: [0, 0, 0.6 + Math.PI] });
      b.add('m', box(0.05, 0.56, 0.05, 0.02, 1), { p: [0, 0, s * 0.055] });
    }
    return b.build({ m: MAT.steel }).children[0].geometry;
  });
}
export const coinMaterial = () => once('coinmat', () => new THREE.MeshStandardMaterial({ color: 0xffc928, roughness: 0.22, metalness: 1, emissive: 0xff9a00, emissiveIntensity: 0.35, envMapIntensity: 1.4 }));

/* ---------- held / thrown items ---------- */
export function buildItemModel(type) {
  const g = new THREE.Group(); g.name = 'item:' + type;
  const b = new ModelBuilder();
  switch (type) {
    case 'leak': {
      // a circuit-dark droplet on a glowing puddle
      b.add('drop', lathe([[0, 1.05], [0.1, 0.9], [0.26, 0.62], [0.36, 0.36], [0.34, 0.16], [0.22, 0.03], [0, 0]], 18), { p: [0, 0.08, 0] });
      b.add('glow', torus(0.3, 0.03, 6, 20), { p: [0, 0.34, 0], r: [Math.PI / 2, 0, 0] });
      b.add('glow', torus(0.2, 0.025, 6, 16), { p: [0, 0.62, 0], r: [Math.PI / 2, 0, 0] });
      b.add('puddle', cyl(0.75, 0.82, 0.05, 20), { p: [0, 0.03, 0] });
      b.add('glow', torus(0.74, 0.03, 6, 24), { p: [0, 0.055, 0], r: [Math.PI / 2, 0, 0] });
      g.add(b.build({ drop: plastic(0x0c1830, 0.2, 0.6), glow: glow(0x35e0ff, 3.2), puddle: plastic(0x091226, 0.1, 0.7) }));
      break;
    }
    case 'subpoena': {
      b.add('paper', cyl(0.26, 0.26, 1.1, 16), { r: [0, 0, Math.PI / 2] });
      for (const sx of [1, -1]) b.add('edge', torus(0.26, 0.05, 6, 16), { p: [sx * 0.55, 0, 0], r: [0, Math.PI / 2, 0] });
      b.add('ribbon', cyl(0.285, 0.285, 0.2, 16), { r: [0, 0, Math.PI / 2] });
      b.add('seal', cyl(0.17, 0.17, 0.07, 14), { p: [0, 0, 0.29], r: [Math.PI / 2, 0, 0] });
      const m = b.build({ paper: plastic(0xf1e1b8, 0.8), edge: plastic(0xd9c48f, 0.8), ribbon: plastic(0xd8232a, 0.5), seal: plastic(0xffc23c, 0.3, 0.8) });
      m.position.y = 0.3; g.add(m); g.userData.spin = m;
      break;
    }
    case 'tweet': {
      b.add('body', sphere(0.4, 16, 12), { s: [1, 0.95, 1.15] });
      b.add('body', sphere(0.2, 10, 8), { p: [0, 0.3, -0.05], s: [1, 0.8, 1.3] });
      b.add('belly', sphere(0.3, 12, 10), { p: [0, -0.12, 0.12], s: [1, 0.8, 1] });
      b.add('beak', cone(0.1, 0.22, 8), { p: [0, 0.02, 0.5], r: [Math.PI / 2, 0, 0] });
      for (const sx of [1, -1]) { b.add('eye', sphere(0.075, 8, 6), { p: [sx * 0.17, 0.14, 0.34] }); b.add('pupil', sphere(0.04, 6, 6), { p: [sx * 0.18, 0.14, 0.4] }); }
      b.add('body', cone(0.14, 0.4, 6), { p: [0, 0.05, -0.55], r: [-Math.PI / 2 - 0.3, 0, 0], s: [1.6, 1, 0.5] });
      const mats = { body: plastic(0x2f9bff, 0.45), belly: plastic(0xd9efff, 0.6), beak: plastic(0xffa41c, 0.5), eye: MAT.white, pupil: MAT.black };
      const m = b.build(mats); m.position.y = 0.45; g.add(m);
      const wings = [1, -1].map(sx => { const w = new THREE.Mesh(once('wing', () => { const s = sphere(0.3, 10, 8); s.scale(1.5, 0.16, 0.8); s.translate(0.4, 0, 0); return s; }), mats.body); w.position.set(sx * 0.2, 0.5, 0); w.scale.x = sx; g.add(w); return w; });
      g.userData.wings = wings;
      break;
    }
    case 'antitrust': {
      b.add('case', box(1.5, 1.0, 0.5, 0.1, 3), {});
      b.add('trim', box(1.54, 0.12, 0.54, 0.04, 1), { p: [0, 0.12, 0] });
      b.add('gold', torus(0.24, 0.045, 6, 14, Math.PI), { p: [0, 0.5, 0] });
      for (const sx of [1, -1]) b.add('gold', box(0.16, 0.2, 0.06, 0.02, 1), { p: [sx * 0.42, 0.12, 0.26] });
      // scales of justice emblem
      b.add('gold', box(0.04, 0.34, 0.03, 0.01, 1), { p: [0, -0.16, 0.265] }); b.add('gold', box(0.44, 0.04, 0.03, 0.01, 1), { p: [0, -0.02, 0.265] });
      for (const sx of [1, -1]) b.add('gold', cyl(0.09, 0.05, 0.05, 10), { p: [sx * 0.2, -0.16, 0.265], r: [Math.PI / 2, 0, 0] });
      const mats = { case: plastic(0x8a4a22, 0.5), trim: plastic(0x5e3014, 0.5), gold: plastic(0xffc93c, 0.25, 1) };
      const m = b.build(mats); g.add(m);
      const wings = [1, -1].map(sx => { const w = new THREE.Mesh(once('bwing', () => { const s = sphere(0.5, 10, 8); s.scale(1.6, 0.12, 0.7); s.translate(0.8, 0, 0); return s; }), MAT.white); w.position.set(sx * 0.6, 0.3, 0); w.scale.x = sx; g.add(w); return w; });
      const halo = new THREE.Mesh(sphere(1.5, 12, 8), new THREE.MeshBasicMaterial({ color: 0x4f8bff, transparent: true, opacity: 0.22, blending: THREE.AdditiveBlending, depthWrite: false })); g.add(halo);
      g.userData.wings = wings;
      break;
    }
    case 'pinkslip': {
      b.add('bomb', sphere(0.5, 18, 14), { p: [0, 0.5, 0] });
      b.add('cap', cyl(0.14, 0.16, 0.14, 12), { p: [0, 1.02, 0] });
      b.add('fuse', cyl(0.025, 0.025, 0.24, 6), { p: [0.05, 1.18, 0], r: [0, 0, -0.4] });
      b.add('tag', box(0.34, 0.5, 0.02, 0.01, 1), { p: [0.52, 0.42, 0.1], r: [0, 0.3, -0.35] });
      b.add('spark', sphere(0.08, 8, 6), { p: [0.1, 1.3, 0] });
      g.add(b.build({ bomb: plastic(0x14151a, 0.3, 0.4), cap: MAT.steel, fuse: plastic(0xc9a66b, 0.8), tag: plastic(0xff8ab8, 0.6), spark: glow(0xffb040, 5) }));
      break;
    }
    case 'star': {
      const shape = new THREE.Shape();
      for (let i = 0; i < 10; i++) { const a = (i / 10) * Math.PI * 2 - Math.PI / 2, r = i % 2 ? 0.26 : 0.6; const x = Math.cos(a) * r, y = Math.sin(a) * r; if (i) shape.lineTo(x, y); else shape.moveTo(x, y); }
      shape.closePath();
      const geo = new THREE.ExtrudeGeometry(shape, { depth: 0.2, bevelEnabled: true, bevelSize: 0.08, bevelThickness: 0.08, bevelSegments: 3, curveSegments: 4 });
      geo.center();
      const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: 0xffd23c, emissive: 0xffa800, emissiveIntensity: 0.8, roughness: 0.25, metalness: 0.6 }));
      m.position.y = 0.6; g.add(m);
      break;
    }
    default: {
      const m = new THREE.Mesh(sphere(0.4, 12, 10), plastic(0xff4d6d, 0.4)); m.position.y = 0.4; g.add(m);
    }
  }
  g.traverse(o => { if (o.isMesh && !o.material.transparent) o.castShadow = true; });
  return g;
}

/** Which model, if any, trails behind a kart holding this item. */
export const TRAIL_MODEL = { leak: 'leak', subpoena: 'subpoena', subpoena3: 'subpoena', tweet: 'tweet', pinkslip: 'pinkslip' };
