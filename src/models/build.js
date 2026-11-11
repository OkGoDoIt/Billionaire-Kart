/* Geometry toolkit for procedural models: lofted shells, tubes, and a builder that
   merges every part by material so a whole kart is a handful of draw calls. */
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _s = new THREE.Vector3(), _p = new THREE.Vector3();

/** Collects geometry per material name, then bakes one mesh per material. */
export class ModelBuilder {
  constructor() { this.buckets = new Map(); }
  /** Add a geometry. opts: { p:[x,y,z], r:[rx,ry,rz], s:[sx,sy,sz]|number } */
  add(mat, geo, { p = [0, 0, 0], r = [0, 0, 0], s = 1 } = {}) {
    const g = geo.index ? geo.toNonIndexed() : geo.clone();
    _e.set(r[0], r[1], r[2]); _q.setFromEuler(_e);
    if (typeof s === 'number') _s.set(s, s, s); else _s.set(s[0], s[1], s[2]);
    _m.compose(_p.set(p[0], p[1], p[2]), _q, _s);
    g.applyMatrix4(_m);
    for (const name of Object.keys(g.attributes)) if (!['position', 'normal', 'uv'].includes(name)) g.deleteAttribute(name);
    if (!g.attributes.uv) g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
    if (!g.attributes.normal) g.computeVertexNormals();
    if (!this.buckets.has(mat)) this.buckets.set(mat, []);
    this.buckets.get(mat).push(g);
    if (geo !== g) geo.dispose?.();
    return this;
  }
  /** Bake into a Group. materials: { name: THREE.Material }. */
  build(materials, { cast = true, receive = false } = {}) {
    const group = new THREE.Group();
    for (const [name, list] of this.buckets) {
      const geo = mergeGeometries(list, false);
      for (const g of list) g.dispose();
      geo.computeBoundingSphere();
      const mesh = new THREE.Mesh(geo, materials[name] || materials.default);
      mesh.name = name; mesh.castShadow = cast; mesh.receiveShadow = receive;
      group.add(mesh);
    }
    this.buckets.clear();
    return group;
  }
}

/* ---------- primitives ---------- */
export const box = (w, h, d, r = 0.05, seg = 3) => new RoundedBoxGeometry(w, h, d, seg, Math.min(r, w / 2 - 1e-3, h / 2 - 1e-3, d / 2 - 1e-3));
export const sphere = (r = 1, ws = 20, hs = 14) => new THREE.SphereGeometry(r, ws, hs);
export const cyl = (rt, rb, h, seg = 18, open = false) => new THREE.CylinderGeometry(rt, rb, h, seg, 1, open);
export const capsule = (r, len, seg = 8, rad = 16) => new THREE.CapsuleGeometry(r, len, seg, rad);
export const torus = (R, r, rs = 10, ts = 28, arc = Math.PI * 2) => new THREE.TorusGeometry(R, r, rs, ts, arc);
export const cone = (r, h, seg = 18) => new THREE.ConeGeometry(r, h, seg);

/** Tube through points (arrays of [x,y,z]). */
export function tube(points, radius = 0.04, seg = 24, rad = 8, closed = false) {
  const curve = new THREE.CatmullRomCurve3(points.map(p => new THREE.Vector3(p[0], p[1], p[2])), closed, 'catmullrom', 0.5);
  return new THREE.TubeGeometry(curve, seg, radius, rad, closed);
}

/**
 * Lofted shell along Z. sections: [{ z, w, h, y, n?, x? }] where w/h are half extents,
 * n is the superellipse exponent (2 = ellipse, 4+ = boxy). Ends are capped.
 */
export function loft(sections, ring = 24, smoothSteps = 4) {
  // densify along z with smooth interpolation so the silhouette has no kinks
  const dense = [];
  const cr = (a, b, c, d, t) => 0.5 * ((2 * b) + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t * t + (-a + 3 * b - 3 * c + d) * t * t * t);
  for (let i = 0; i < sections.length - 1; i++) {
    const s0 = sections[Math.max(0, i - 1)], s1 = sections[i], s2 = sections[i + 1], s3 = sections[Math.min(sections.length - 1, i + 2)];
    for (let k = 0; k < smoothSteps; k++) {
      const t = k / smoothSteps, o = {};
      for (const key of ['z', 'w', 'h', 'y', 'x']) o[key] = cr(s0[key] ?? 0, s1[key] ?? 0, s2[key] ?? 0, s3[key] ?? 0, t);
      o.n = (s1.n ?? 2.6) + ((s2.n ?? 2.6) - (s1.n ?? 2.6)) * t;
      o.w = Math.max(0.001, o.w); o.h = Math.max(0.001, o.h);
      dense.push(o);
    }
  }
  dense.push({ x: 0, n: 2.6, ...sections[sections.length - 1] });
  const pos = [], uv = [], idx = [];
  const rows = dense.length;
  for (let i = 0; i < rows; i++) {
    const s = dense[i], e = 2 / (s.n ?? 2.6);
    for (let j = 0; j <= ring; j++) {
      const a = (j / ring) * Math.PI * 2, c = Math.cos(a), sn = Math.sin(a);
      pos.push((s.x ?? 0) + s.w * Math.sign(c) * Math.pow(Math.abs(c), e), s.y + s.h * Math.sign(sn) * Math.pow(Math.abs(sn), e), s.z);
      uv.push(j / ring, i / (rows - 1));
    }
  }
  for (let i = 0; i < rows - 1; i++) for (let j = 0; j < ring; j++) {
    const a = i * (ring + 1) + j, b = a + 1, c = a + ring + 1, d = c + 1;
    idx.push(a, b, c, b, d, c);
  }
  // caps
  for (const [row, flip] of [[0, false], [rows - 1, true]]) {
    const s = dense[row], center = pos.length / 3;
    pos.push(s.x ?? 0, s.y, s.z); uv.push(0.5, row ? 1 : 0);
    for (let j = 0; j < ring; j++) { const a = row * (ring + 1) + j, b = a + 1; if (flip) idx.push(center, a, b); else idx.push(center, b, a); }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

/** Lathe from a profile of [radius, y] pairs. */
export function lathe(profile, seg = 28) {
  return new THREE.LatheGeometry(profile.map(p => new THREE.Vector2(p[0], p[1])), seg);
}

/* ---------- materials ---------- */
const matCache = new Map();
export function paint(color, { rough = 0.32, metal = 0.0, clear = 0.6, key = '' } = {}) {
  const k = `paint:${color}:${rough}:${metal}:${clear}:${key}`;
  if (!matCache.has(k)) matCache.set(k, new THREE.MeshPhysicalMaterial({ color, roughness: rough, metalness: metal, clearcoat: clear, clearcoatRoughness: 0.12, envMapIntensity: 1.1 }));
  return matCache.get(k);
}
export function plastic(color, rough = 0.5, metal = 0) {
  const k = `plastic:${color}:${rough}:${metal}`;
  if (!matCache.has(k)) matCache.set(k, new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: metal, envMapIntensity: 0.9 }));
  return matCache.get(k);
}
export function glow(color, intensity = 2.5) {
  const k = `glow:${color}:${intensity}`;
  if (!matCache.has(k)) matCache.set(k, new THREE.MeshStandardMaterial({ color: 0x111111, emissive: color, emissiveIntensity: intensity, roughness: 0.4 }));
  return matCache.get(k);
}
export const MAT = {
  rubber: plastic(0x1b1c20, 0.92),
  dark: plastic(0x23252c, 0.55, 0.3),
  chrome: plastic(0xdfe5ee, 0.16, 1),
  steel: plastic(0x8d96a6, 0.35, 0.85),
  white: plastic(0xf4f4f0, 0.5),
  black: plastic(0x0e0f12, 0.5),
};
