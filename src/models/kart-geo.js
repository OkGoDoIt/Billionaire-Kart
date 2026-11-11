/* Extra shape helpers for the signature kart bodies: shells with separate top and
   bottom heights (hulls, half eggs), extruded side profiles and plan outlines
   (angular panels with chamfered edges), and rounded polygons. */
import * as THREE from 'three';
import { toCreasedNormals } from 'three/addons/utils/BufferGeometryUtils.js';

const PI = Math.PI;
const KEYS = ['z', 'w', 'ht', 'hb', 'y', 'x'];
const cr = (a, b, c, d, t) => 0.5 * ((2 * b) + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t * t + (-a + 3 * b - 3 * c + d) * t * t * t);

/** Smoothly densify loft sections ({ z, w, h | ht+hb, y, x?, n? }) along z. */
export function densify(sections, steps = 4) {
  const S = sections.map(s => ({ x: 0, n: 2.6, ...s, ht: s.ht ?? s.h, hb: s.hb ?? s.h }));
  const out = [];
  for (let i = 0; i < S.length - 1; i++) {
    const s0 = S[Math.max(0, i - 1)], s1 = S[i], s2 = S[i + 1], s3 = S[Math.min(S.length - 1, i + 2)];
    for (let k = 0; k < steps; k++) {
      const t = k / steps, o = {};
      for (const key of KEYS) o[key] = cr(s0[key], s1[key], s2[key], s3[key], t);
      o.n = s1.n + (s2.n - s1.n) * t;
      o.w = Math.max(0.001, o.w); o.ht = Math.max(0.001, o.ht); o.hb = Math.max(0.001, o.hb);
      out.push(o);
    }
  }
  out.push({ ...S[S.length - 1] });
  return out;
}

/** Point on a densified section at ring angle a (0 = +x, π/2 = top). */
export function ringPoint(s, a) {
  const c = Math.cos(a), sn = Math.sin(a), e = 2 / s.n;
  return [s.x + s.w * Math.sign(c) * Math.pow(Math.abs(c), e), s.y + (sn >= 0 ? s.ht : s.hb) * Math.sign(sn) * Math.pow(Math.abs(sn), e), s.z];
}

/** Like loft, but each section may have its own top (ht) and bottom (hb) height, and
    the ring may cover only part of the turn (a0..a1) for split-colour shells. */
export function shell(sections, { ring = 24, steps = 4, a0 = 0, a1 = PI * 2 } = {}) {
  const dense = densify(sections, steps), rows = dense.length;
  const full = Math.abs(a1 - a0 - PI * 2) < 1e-6;
  const pos = [], idx = [];
  for (const s of dense) for (let j = 0; j <= ring; j++) pos.push(...ringPoint(s, a0 + (a1 - a0) * j / ring));
  for (let i = 0; i < rows - 1; i++) for (let j = 0; j < ring; j++) {
    const a = i * (ring + 1) + j, b = a + 1, c = a + ring + 1, d = c + 1;
    idx.push(a, b, c, b, d, c);
  }
  if (full) for (const [row, flip] of [[0, false], [rows - 1, true]]) {
    const s = dense[row], center = pos.length / 3;
    pos.push(s.x, s.y + (s.ht - s.hb) * 0.3, s.z);
    for (let j = 0; j < ring; j++) { const a = row * (ring + 1) + j, b = a + 1; if (flip) idx.push(center, a, b); else idx.push(center, b, a); }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx); g.computeVertexNormals();
  return g;
}

/** Round every corner of a 2D polygon (array of [u, v]); r may be a number or one per vertex. */
export function roundPoly(pts, r = 0.05, n = 4) {
  const out = [];
  for (let i = 0; i < pts.length; i++) {
    const p0 = pts[(i - 1 + pts.length) % pts.length], p1 = pts[i], p2 = pts[(i + 1) % pts.length];
    const l1 = Math.hypot(p1[0] - p0[0], p1[1] - p0[1]), l2 = Math.hypot(p2[0] - p1[0], p2[1] - p1[1]);
    const rr = Math.min(Array.isArray(r) ? r[i] : r, l1 * 0.49, l2 * 0.49);
    if (rr <= 1e-4) { out.push(p1); continue; }
    const A = [p1[0] - (p1[0] - p0[0]) / l1 * rr, p1[1] - (p1[1] - p0[1]) / l1 * rr];
    const B = [p1[0] + (p2[0] - p1[0]) / l2 * rr, p1[1] + (p2[1] - p1[1]) / l2 * rr];
    for (let k = 0; k <= n; k++) {
      const t = k / n, a = (1 - t) * (1 - t), b = 2 * (1 - t) * t, c = t * t;
      out.push([a * A[0] + b * p1[0] + c * B[0], a * A[1] + b * p1[1] + c * B[1]]);
    }
  }
  return out;
}

function extrude(pts, depth, bevel, offset, segs) {
  const shape = new THREE.Shape(pts.map(p => new THREE.Vector2(p[0], p[1])));
  return new THREE.ExtrudeGeometry(shape, { depth: Math.max(0.001, depth), bevelEnabled: bevel > 0, bevelThickness: bevel, bevelSize: bevel, bevelOffset: offset ?? -bevel, bevelSegments: segs, curveSegments: 4 });
}

/** A side profile ([z, y] points) extruded across x, centred, half-width hw. */
export function side(profile, hw, { bevel = 0.025, segs = 1, crease = 0 } = {}) {
  const bt = Math.min(bevel, hw * 0.45), depth = 2 * (hw - bt);
  const g = extrude(profile, depth, bt, -bt, segs);
  g.applyMatrix4(new THREE.Matrix4().set(0, 0, -1, depth / 2, 0, 1, 0, 0, 1, 0, 0, 0, 0, 0, 0, 1));
  return crease ? toCreasedNormals(g, crease) : g;
}

/** A plan outline ([x, z] points) extruded upward from y0 by h. */
export function plan(pts, y0, h, { bevel = 0, size, offset, segs = 1, crease = 0 } = {}) {
  const bt = Math.min(bevel, h * 0.45), depth = h - 2 * bt;
  const shape = new THREE.Shape(pts.map(p => new THREE.Vector2(p[0], -p[1])));
  const sz = size ?? bt;
  const g = new THREE.ExtrudeGeometry(shape, { depth: Math.max(0.001, depth), bevelEnabled: bt > 0, bevelThickness: bt, bevelSize: sz, bevelOffset: offset ?? -sz, bevelSegments: segs, curveSegments: 4 });
  g.applyMatrix4(new THREE.Matrix4().set(1, 0, 0, 0, 0, 0, 1, bt + y0, 0, -1, 0, 0, 0, 0, 0, 1));
  return crease ? toCreasedNormals(g, crease) : g;
}

/** Flat-shaded copy (for faceted, stealthy looks). */
export function faceted(g) { const n = g.index ? g.toNonIndexed() : g; n.computeVertexNormals(); return n; }

/** A mudguard: a flattened torus arc over a wheel at (x, axleY, z), from angle a0 (behind) round to a1 (in front). */
export function guard(R, r, width, a0 = 0, a1 = PI) {
  const g = new THREE.TorusGeometry(R, r, 8, 22, a1 - a0);
  g.rotateZ(a0); g.scale(1, 1, width / (2 * r));
  g.rotateY(PI / 2);
  return g;
}
/** End points of a guard (for caps), relative to the axle. */
export const guardEnd = (R, a) => [0, Math.sin(a) * R, -Math.cos(a) * R];
