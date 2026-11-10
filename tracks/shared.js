/* Billionaire Kart — shared toolkit for self-contained track modules (Batch 3+).
 *
 * A track module exports:
 *   TRACK  — the plain definition object game.js pushes into TRACKS[]
 *            { name, sky, fog, ground, shoulder, roadSeed, points: [[x,z], ...] }
 *   CARD   — { emoji, desc } for the menu track-card (see WIRING.md)
 *   build(ctx) — builds ALL themed dressing into ctx.scene and registers any
 *            per-frame animation via ctx.animators.push((dt, elapsed) => { ... })
 *
 * ctx (built by game.js sceneryContext(), see WIRING.md):
 *   { THREE, scene, samples, normals, tangents, N, HALF_W, trackCenter,
 *     rand, scatterPos, canvasTexture, billboardTexture, animators }
 *
 * Rules inherited from the existing tracks:
 * - Everything is created fresh inside build(): game.js teardown disposes every
 *   geometry/material/map in the scene on rebuild, so NEVER cache meshes,
 *   materials or textures at module scope.
 * - Dressing stays off the road: |lateral| >= HALF_W + 4 unless a prop is
 *   explicitly an overhead/see-through gag. Geometry first, satire is paint.
 * - Lambert materials everywhere (matches the engine's look + phone budget).
 */

export function lam(ctx, color, opts = {}) {
  return new ctx.THREE.MeshLambertMaterial({ color, ...opts });
}

function place(mesh, x, y, z, o = {}) {
  mesh.position.set(x, y, z);
  if (o.ry) mesh.rotation.y = o.ry;
  if (o.rx) mesh.rotation.x = o.rx;
  if (o.rz) mesh.rotation.z = o.rz;
  mesh.castShadow = !o.noShadow;
  if (o.parent) o.parent.add(mesh);
  return mesh;
}

export function box(ctx, w, h, d, color, x, y, z, o = {}) {
  const m = new ctx.THREE.Mesh(new ctx.THREE.BoxGeometry(w, h, d), o.mat || lam(ctx, color));
  return place(m, x, y, z, { parent: ctx.scene, ...o });
}
export function cyl(ctx, rt, rb, h, color, x, y, z, o = {}) {
  const m = new ctx.THREE.Mesh(new ctx.THREE.CylinderGeometry(rt, rb, h, o.seg || 10), o.mat || lam(ctx, color));
  return place(m, x, y, z, { parent: ctx.scene, ...o });
}
export function cone(ctx, r, h, color, x, y, z, o = {}) {
  const m = new ctx.THREE.Mesh(new ctx.THREE.ConeGeometry(r, h, o.seg || 10), o.mat || lam(ctx, color));
  return place(m, x, y, z, { parent: ctx.scene, ...o });
}
export function sph(ctx, r, color, x, y, z, o = {}) {
  const m = new ctx.THREE.Mesh(new ctx.THREE.SphereGeometry(r, o.seg || 14, Math.max(8, (o.seg || 14) - 4)), o.mat || lam(ctx, color));
  return place(m, x, y, z, { parent: ctx.scene, ...o });
}

/** World position at a fraction of the lap, offset laterally (signed) from the centre line. */
export function atLap(ctx, frac, lat = 0, y = 0) {
  const i = ((Math.floor(frac * ctx.N) % ctx.N) + ctx.N) % ctx.N;
  const s = ctx.samples[i], n = ctx.normals[i];
  return new ctx.THREE.Vector3(s.x + n.x * lat, y, s.z + n.z * lat);
}
/** Heading (rotation.y) of the track tangent at a fraction of the lap. */
export function headingAt(ctx, frac) {
  const i = ((Math.floor(frac * ctx.N) % ctx.N) + ctx.N) % ctx.N;
  const t = ctx.tangents[i];
  return Math.atan2(t.x, t.z);
}
/** A group anchored beside the track at a lap fraction, facing the road. */
export function anchorGroup(ctx, frac, lat, y = 0) {
  const p = atLap(ctx, frac, lat, y), c = atLap(ctx, frac, 0, y);
  const g = new ctx.THREE.Group();
  g.position.copy(p);
  g.lookAt(c.x, y, c.z);
  (ctx.scene).add(g);
  return g;
}

/** Big roadside billboard, same construction as the built-in BILLBOARDS pack. */
export function sign(ctx, text, frac, side = 1, hue = 200, o = {}) {
  const lat = side * (ctx.HALF_W + (o.lat || 9));
  const g = anchorGroup(ctx, frac, lat);
  const board = new ctx.THREE.Mesh(
    new ctx.THREE.PlaneGeometry(o.w || 18, o.h || 6.9),
    new ctx.THREE.MeshLambertMaterial({ map: ctx.billboardTexture(text, hue), side: ctx.THREE.DoubleSide }));
  board.position.y = o.y || 6.4; board.castShadow = true; g.add(board);
  const postM = lam(ctx, 0x444a52);
  for (const px of [-(o.w || 18) / 2 + 3, (o.w || 18) / 2 - 3]) {
    const post = new ctx.THREE.Mesh(new ctx.THREE.BoxGeometry(0.5, (o.y || 6.4) - 2, 0.5), postM);
    post.position.set(px, ((o.y || 6.4) - 2) / 2 + 1, 0); g.add(post);
  }
  return g;
}

/** Flat text plaque (no posts) for sticking on props — parent it yourself. */
export function plaque(ctx, text, w, h, hue = 200) {
  const m = new ctx.THREE.Mesh(
    new ctx.THREE.PlaneGeometry(w, h),
    new ctx.THREE.MeshLambertMaterial({ map: ctx.billboardTexture(text, hue), side: ctx.THREE.DoubleSide }));
  return m;
}

/** Custom canvas-texture plane (neon, fallen letters, one-off art). */
export function canvasSign(ctx, w, h, draw) {
  const tex = ctx.canvasTexture(512, Math.round(512 * h / w), draw);
  const m = new ctx.THREE.Mesh(new ctx.THREE.PlaneGeometry(w, h),
    new ctx.THREE.MeshLambertMaterial({ map: tex, side: ctx.THREE.DoubleSide, transparent: true }));
  return m;
}

/** Scatter `count` props at random lap positions between two lateral distances. */
export function scatterEach(ctx, count, minLat, maxLat, fn) {
  for (let i = 0; i < count; i++) {
    const p = ctx.scatterPos(minLat, maxLat);
    fn(p, i);
  }
}

/** Simple low-poly tree: trunk + icosahedron blob canopy. Returns the group. */
export function blobTree(ctx, x, z, s = 1, canopy = 0x2e7d32, trunk = 0x7a4a21) {
  const g = new ctx.THREE.Group(); g.position.set(x, 0, z); ctx.scene.add(g);
  const t = new ctx.THREE.Mesh(new ctx.THREE.CylinderGeometry(0.3 * s, 0.45 * s, 2.4 * s, 6), lam(ctx, trunk));
  t.position.y = 1.2 * s; t.castShadow = true; g.add(t);
  const c = new ctx.THREE.Mesh(new ctx.THREE.IcosahedronGeometry(2.2 * s, 0), lam(ctx, canopy));
  c.position.y = 4.2 * s; c.castShadow = true; g.add(c);
  return g;
}

/** Cloud pack identical in spirit to the built-in one (white puffs, high up). */
export function clouds(ctx, count = 10, tint = 0xffffff) {
  const mat = lam(ctx, tint, { transparent: true, opacity: 0.85 });
  for (let i = 0; i < count; i++) {
    const cl = new ctx.THREE.Group();
    for (let j = 0; j < 3; j++) {
      const puff = new ctx.THREE.Mesh(new ctx.THREE.SphereGeometry(ctx.rand(5, 10), 10, 8), mat);
      puff.position.set(j * ctx.rand(5, 8) - 7, ctx.rand(-1, 1), ctx.rand(-3, 3));
      puff.scale.y = 0.45; cl.add(puff);
    }
    cl.position.set(ctx.rand(-520, 520), ctx.rand(80, 130), ctx.rand(-520, 520));
    ctx.scene.add(cl);
    const speed = 1 + (i % 3);
    ctx.animators.push(dt => { cl.position.x += dt * speed; if (cl.position.x > 580) cl.position.x = -580; });
  }
}
