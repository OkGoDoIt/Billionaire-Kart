/* Scenery helpers for track modules: where to put things (along the road,
   scattered over the land) and how to draw many of them cheaply (instancing). */
import * as THREE from 'three';
import { makeRng, hashString, mod, clamp, lerp } from '../core/util.js';
import { makeGroundHit } from '../track/track.js';

const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _s = new THREE.Vector3(), _p = new THREE.Vector3(), _c = new THREE.Color();

/** Flatten a built prop (Group of meshes) into instancing parts. */
export function partsOf(group) {
  const parts = [];
  group.updateMatrixWorld(true);
  group.traverse(o => { if (o.isMesh) { const g = o.geometry.clone(); g.applyMatrix4(o.matrixWorld); parts.push({ geometry: g, material: o.material }); } });
  return parts;
}

export class Scenery {
  constructor(ctx, seed = 1) {
    this.track = ctx.track; this.group = ctx.group; this.gfx = ctx.gfx; this.anim = ctx.anim;
    this.rng = makeRng(hashString(ctx.track.id) + seed);
    this.hit = makeGroundHit();
    this.shadows = ctx.gfx.q.shadow > 0;
    this.density = ctx.gfx.q.scenery ?? 1;   // lower quality tiers thin out scattered scenery
  }

  /** Ground height at a point (road, shoulder, or terrain). */
  y(x, z) { return this.track.ground(x, z, -1, this.hit).y; }

  /**
   * Evenly spaced placements beside the road.
   * from/to: control-point params. side: 1 left, -1 right. offset: metres beyond the road edge.
   * Returns [{ x, y, z, yaw, i }] where yaw faces the road.
   */
  along({ from = 0, to = null, side = 1, offset = 14, spacing = 12, jitter = 0, skip = null, phase = 0 }) {
    const tr = this.track, out = [];
    const i0 = tr.indexAtCp(from), i1 = to == null ? i0 + tr.N - 1 : tr.indexAtCp(to);
    const span = mod(i1 - i0, tr.N) || tr.N - 1, step = Math.max(1, Math.round(spacing / tr.ds));
    for (let k = Math.round(phase / tr.ds); k <= span; k += step) {
      const i = mod(i0 + k, tr.N);
      if (tr.bridge[i] || tr.tunnel[i]) continue;
      if (skip && skip(i)) continue;
      const hw = side > 0 ? tr.hwL[i] : tr.hwR[i];
      const lat = side * (hw + offset + (jitter ? this.rng.range(-jitter, jitter) : 0));
      const hx = Math.hypot(tr.lx[i], tr.lz[i]) || 1;
      const x = tr.px[i] + (tr.lx[i] / hx) * lat + (jitter ? tr.tx[i] * this.rng.range(-jitter, jitter) : 0);
      const z = tr.pz[i] + (tr.lz[i] / hx) * lat + (jitter ? tr.tz[i] * this.rng.range(-jitter, jitter) : 0);
      // face the road: look from the object toward the centre line
      const yaw = Math.atan2(-side * tr.lx[i], -side * tr.lz[i]);
      out.push({ x, y: this.y(x, z), z, yaw, i, along: tr.yaw[i] });
    }
    return out;
  }

  /**
   * Random placements over the land, by distance from the road.
   * opts: { count, min, max, maxSlope, minGap, water: allow underwater, where(x,z,h) }
   */
  scatter({ count = 50, min = 16, max = 90, maxSlope = 0.7, minGap = 0, where = null, tries = 30 }) {
    const tr = this.track, g = tr.grid, out = [];
    if (!g) return out;
    count = Math.max(1, Math.round(count * this.density));
    const w = (g.nx - 1) * g.cell, d = (g.nz - 1) * g.cell;
    let attempts = count * tries;
    while (out.length < count && attempts-- > 0) {
      const x = g.x0 + this.rng() * w, z = g.z0 + this.rng() * d;
      const dist = tr.roadDistance(x, z);
      if (dist < min || dist > max) continue;
      const h = tr.terrainHeight(x, z);
      if (tr.water != null && h < tr.water + 0.4) continue;
      const slope = Math.hypot(tr.terrainHeight(x + 2, z) - h, tr.terrainHeight(x, z + 2) - h) / 2;
      if (slope > maxSlope) continue;
      if (where && !where(x, z, h, dist)) continue;
      if (minGap > 0 && out.some(o => (o.x - x) ** 2 + (o.z - z) ** 2 < minGap * minGap)) continue;
      out.push({ x, y: h, z, yaw: this.rng() * Math.PI * 2, dist });
    }
    return out;
  }

  /**
   * Draw one prop many times. parts: from partsOf(). placements: [{x,y,z,yaw}].
   * opts: { scale: [min,max] | number, yaw: 'random' | 'keep', sink, tint: [colors], tilt }
   */
  instances(parts, placements, { scale = 1, yaw = 'keep', sink = 0, tints = null, tilt = 0, cast = true, solid = 0 } = {}) {
    if (!placements.length) return [];
    if (solid) for (const p of placements) this.track.addCollider(p.x, p.z, solid);   // karts bounce off these
    const n = placements.length, meshes = [];
    const xf = placements.map(p => {
      const s = Array.isArray(scale) ? this.rng.range(scale[0], scale[1]) : scale;
      return { s, yaw: yaw === 'random' ? this.rng() * Math.PI * 2 : p.yaw || 0, tx: tilt ? this.rng.range(-tilt, tilt) : 0, tz: tilt ? this.rng.range(-tilt, tilt) : 0, tint: tints ? tints[Math.floor(this.rng() * tints.length)] : null };
    });
    for (const part of parts) {
      const im = new THREE.InstancedMesh(part.geometry, part.material, n);
      for (let i = 0; i < n; i++) {
        const p = placements[i], t = xf[i];
        _e.set(t.tx, t.yaw, t.tz); _q.setFromEuler(_e); _s.set(t.s, t.s * (p.sy || 1), t.s);
        _m.compose(_p.set(p.x, p.y - sink * t.s, p.z), _q, _s); im.setMatrixAt(i, _m);
        if (t.tint != null && part.material.userData.tintable) im.setColorAt(i, _c.set(t.tint));
      }
      im.instanceMatrix.needsUpdate = true; if (im.instanceColor) im.instanceColor.needsUpdate = true;
      im.castShadow = cast && this.shadows; im.receiveShadow = false;
      im.computeBoundingSphere();
      this.group.add(im); meshes.push(im);
    }
    return meshes;
  }

  /** Place a unique object on the ground. */
  place(obj, x, z, { yaw = 0, y = null, lift = 0, scale = 1, cast = true, solid = 0 } = {}) {
    if (solid) this.track.addCollider(x, z, solid);
    obj.position.set(x, (y ?? this.y(x, z)) + lift, z); obj.rotation.y = yaw; obj.scale.setScalar(scale);
    obj.traverse(o => { if (o.isMesh) { o.castShadow = cast && this.shadows && !o.material.transparent; } });
    this.group.add(obj);
    return obj;
  }

  /** World position and facing for a point beside the road. at: control-point param. */
  beside(at, side, offset) {
    const tr = this.track, i = tr.indexAtCp(at), hw = side > 0 ? tr.hwL[i] : tr.hwR[i];
    const hx = Math.hypot(tr.lx[i], tr.lz[i]) || 1, lat = side * (hw + offset);
    const x = tr.px[i] + (tr.lx[i] / hx) * lat, z = tr.pz[i] + (tr.lz[i] / hx) * lat;
    return { x, z, y: this.y(x, z), yaw: Math.atan2(-side * tr.lx[i], -side * tr.lz[i]), along: tr.yaw[i], i, roadY: tr.py[i] };
  }
}
void clamp; void lerp;
