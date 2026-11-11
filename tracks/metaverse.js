/* METAVERSE PLAZA GP — Billionaire Kart track module (Batch 3, issue #12).
 * An empty, glossy virtual plaza: everything is rendered, nobody is here.
 * Signature set piece: a giant floating avatar head over the plaza centre.
 * Animated: the head bobs/turns, loading-orbs orbit it, sky shards drift. */
import { lam, box, cyl, cone, sph, sign, plaque, scatterEach, clouds, anchorGroup, atLap } from './shared.js';

export const TRACK = {
  name: 'Metaverse Plaza GP', sky: 0x8fd8ff, fog: 0xbfeaff, ground: 0xdfe6ee, shoulder: 0x6c5ce7, roadSeed: 6,
  points: [[0, -250], [140, -230], [235, -140], [215, -20], [250, 90], [170, 200], [60, 245], [-80, 225], [-205, 190], [-245, 60], [-215, -80], [-150, -195], [-60, -240]],
  // HAND-AUTHORED profiles (docs/track-design-metaverse.md) — keyframes [u, value]:
  // elev = road height in metres; bank = cross-slope in degrees (+ banks a RIGHT turn).
  // The plaza is flat; the verticality is unfinished geometry: a loading ramp up to
  // the un-rendered second floor (the Sky Deck), then a buffering ramp back down.
  elev: [[0, 0], [0.10, 0], [0.176, 1.5], [0.246, 2.5], [0.312, 2.0], [0.36, 2.0], [0.44, 5.5], [0.52, 10.0], [0.58, 10.5], [0.642, 10.5], [0.70, 7.0], [0.78, 3.5], [0.86, 1.0], [0.93, 0]],
  bank: [[0, 0], [0.081, 3], [0.125, 0], [0.176, 11], [0.211, 0], [0.246, -8], [0.279, 0], [0.312, 11], [0.40, 0], [0.483, 3], [0.56, 0], [0.642, 9], [0.77, 0], [0.903, 5], [0.945, 0]],
};
export const CARD = { emoji: '🥽', desc: 'A glossy empty plaza. Population: you + bots.' };

const SIGNS = [
  ['HORIZON WORLDS: 38 USERS ONLINE', 0.03, 1, 265],
  ['LEGS COMING SOON™', 0.16, -1, 280],
  ['POPULATION: YOU + BOTS', 0.30, 1, 190],
  ['RENDER DISTANCE: 12 FT', 0.44, -1, 320],
  ['YOUR AVATAR IS BUFFERING…', 0.58, 1, 45],
  ['MEETING MOVED TO VR (NOBODY CAME)', 0.72, -1, 210],
  ['EST. 2021 — STILL IN BETA', 0.86, 1, 130],
  ['$47B WELL SPENT', 0.95, -1, 300],
];

function leglessStatue(ctx, x, z, s, suitColor, skinColor, groundY = 0) {
  // The defining Metaverse avatar: torso, arms, big head — and NO legs.
  // It floats above its plinth, exactly like the real thing.
  const g = new ctx.THREE.Group(); g.position.set(x, groundY, z); g.rotation.y = ctx.rand(0, Math.PI * 2); ctx.scene.add(g);
  const plinth = new ctx.THREE.Mesh(new ctx.THREE.CylinderGeometry(2.6 * s, 3.1 * s, 1.6 * s, 8), lam(ctx, 0xb9c2cc));
  plinth.position.y = 0.8 * s; plinth.castShadow = true; g.add(plinth);
  const body = new ctx.THREE.Group(); body.position.y = 1.6 * s; g.add(body);
  const torso = new ctx.THREE.Mesh(new ctx.THREE.BoxGeometry(2.2 * s, 2.6 * s, 1.2 * s), lam(ctx, suitColor));
  torso.position.y = 1.7 * s; torso.castShadow = true; body.add(torso);
  for (const sx of [-1, 1]) {
    const arm = new ctx.THREE.Mesh(new ctx.THREE.BoxGeometry(0.5 * s, 2.0 * s, 0.5 * s), lam(ctx, suitColor));
    arm.position.set(sx * 1.4 * s, 1.6 * s, 0); arm.rotation.z = sx * 0.18; arm.castShadow = true; body.add(arm);
  }
  const head = new ctx.THREE.Mesh(new ctx.THREE.SphereGeometry(1.05 * s, 16, 12), lam(ctx, skinColor));
  head.position.y = 3.6 * s; head.castShadow = true; body.add(head);
  const band = new ctx.THREE.Mesh(new ctx.THREE.BoxGeometry(1.9 * s, 0.55 * s, 1.5 * s), lam(ctx, 0x14151c));
  band.position.set(0, 3.75 * s, 0.25 * s); body.add(band); // the headset, worn forever
  // gentle hover — they float because there are no legs to stand on
  const phase = ctx.rand(0, 6);
  ctx.animators.push((dt, t) => { body.position.y = 1.6 * s + Math.sin(t * 0.9 + phase) * 0.22 * s; });
  return g;
}

export function build(ctx) {
  const { scene, trackCenter } = ctx;

  /* ---- signature set piece: the Giant Avatar Head of the Plaza ---- */
  const headG = new ctx.THREE.Group();
  headG.position.set(trackCenter.x, 30, trackCenter.z); scene.add(headG);
  const skull = new ctx.THREE.Mesh(new ctx.THREE.SphereGeometry(13, 24, 18), lam(ctx, 0xf2c79b));
  skull.castShadow = true; headG.add(skull);
  const headset = new ctx.THREE.Mesh(new ctx.THREE.BoxGeometry(24, 7, 20), lam(ctx, 0x14151c));
  headset.position.set(0, 2.5, 3.5); headG.add(headset);
  const lens = new ctx.THREE.Mesh(new ctx.THREE.BoxGeometry(20, 4.4, 1.2),
    new ctx.THREE.MeshLambertMaterial({ color: 0x39c2ff, emissive: 0x1a7fbf, emissiveIntensity: 0.9 }));
  lens.position.set(0, 2.5, 13.6); headG.add(lens);
  const plinthTop = cyl(ctx, 10, 13, 5, 0x9aa7b4, trackCenter.x, 2.5, trackCenter.z, { seg: 8 });
  plinthTop.castShadow = true;
  const headPlaque = plaque(ctx, 'THE FOUNDER (RENDERED)', 16, 4.2, 265);
  headPlaque.position.set(trackCenter.x, 6.5, trackCenter.z + 12.4); scene.add(headPlaque);
  // loading orbs orbit the great head, buffering for eternity
  const orbs = [];
  const orbMat = new ctx.THREE.MeshLambertMaterial({ color: 0xffffff, emissive: 0x66d9ff, emissiveIntensity: 0.8 });
  for (let i = 0; i < 5; i++) {
    const orb = new ctx.THREE.Mesh(new ctx.THREE.SphereGeometry(1.1, 10, 8), orbMat);
    scene.add(orb); orbs.push(orb);
  }
  ctx.animators.push((dt, t) => {
    headG.position.y = 30 + Math.sin(t * 0.5) * 1.6;
    headG.rotation.y = Math.sin(t * 0.22) * 0.5;
    orbs.forEach((orb, i) => {
      const a = t * 0.7 + i / orbs.length * Math.PI * 2;
      orb.position.set(trackCenter.x + Math.cos(a) * 19, 30 + Math.sin(t * 1.3 + i) * 2.2, trackCenter.z + Math.sin(a) * 19);
    });
  });

  /* ---- legless avatar statues ringing the plaza ---- */
  const suits = [0x1877f2, 0x10a37f, 0xd23b2e, 0xff9900, 0x7b4fd0, 0x22242a];
  scatterEach(ctx, 10, ctx.HALF_W + 26, ctx.HALF_W + 60, (p, i) =>
    leglessStatue(ctx, p.x, p.z, ctx.rand(0.9, 1.5), suits[i % suits.length], 0xf2c79b, p.y));
  // two greeters flank the start straight
  for (const side of [-1, 1]) {
    const p = atLap(ctx, 0.985, side * (ctx.HALF_W + 14));
    leglessStatue(ctx, p.x, p.z, 1.6, 0x1877f2, 0xf2c79b, p.y);
  }

  /* ---- low-poly plaza trees in planters (rendered nature) ---- */
  scatterEach(ctx, 26, ctx.HALF_W + 8, ctx.HALF_W + 48, p => {
    box(ctx, 3.4, 1.1, 3.4, 0xc3ccd6, p.x, p.y + 0.55, p.z, { ry: ctx.rand(0, 3) });
    cyl(ctx, 0.22, 0.3, 2.0, 0x8a8f96, p.x, p.y + 2.0, p.z);
    const blob = new ctx.THREE.Mesh(new ctx.THREE.IcosahedronGeometry(ctx.rand(1.8, 2.6), 0), lam(ctx, 0x37d67a));
    blob.position.set(p.x, p.y + 4.4, p.z); blob.castShadow = true; scene.add(blob);
  });

  /* ---- reality-vs-render gag: one real tree, one "rendered" tree ---- */
  const gag = anchorGroup(ctx, 0.36, -(ctx.HALF_W + 16));
  const realTrunk = new ctx.THREE.Mesh(new ctx.THREE.CylinderGeometry(0.4, 0.6, 3.4, 8), lam(ctx, 0x7a4a21));
  realTrunk.position.set(-4, 1.7, 0); gag.add(realTrunk);
  const realTop = new ctx.THREE.Mesh(new ctx.THREE.SphereGeometry(3.1, 18, 14), lam(ctx, 0x2e7d32));
  realTop.position.set(-4, 5.6, 0); realTop.castShadow = true; gag.add(realTop);
  const rPlaque = plaque(ctx, 'REALITY (UNOPTIMISED)', 9, 2.4, 120); rPlaque.position.set(-4, 10, 0); gag.add(rPlaque);
  const vrTrunk = new ctx.THREE.Mesh(new ctx.THREE.BoxGeometry(0.9, 3.2, 0.9), lam(ctx, 0x9aa0a3));
  vrTrunk.position.set(4.5, 1.6, 0); gag.add(vrTrunk);
  const vrTop = new ctx.THREE.Mesh(new ctx.THREE.BoxGeometry(4.6, 3.4, 4.6), lam(ctx, 0x37d67a));
  vrTop.position.set(4.5, 4.9, 0); vrTop.castShadow = true; gag.add(vrTop);
  const vPlaque = plaque(ctx, 'RENDERED (4 POLYGONS)', 9, 2.4, 265); vPlaque.position.set(4.5, 8.4, 0); gag.add(vPlaque);

  /* ---- floating sky shards (the world just stops loading up there) ---- */
  const shards = [];
  for (let i = 0; i < 7; i++) {
    const shard = box(ctx, ctx.rand(10, 22), 1.2, ctx.rand(8, 16), i % 2 ? 0xa8e063 : 0x8fd8ff,
      ctx.rand(-380, 380), ctx.rand(48, 85), ctx.rand(-380, 380), { ry: ctx.rand(0, 3) });
    shards.push({ m: shard, base: shard.position.y, ph: ctx.rand(0, 6) });
  }
  ctx.animators.push((dt, t) => shards.forEach(s => { s.m.position.y = s.base + Math.sin(t * 0.4 + s.ph) * 2.4; }));

  /* ---- signage pack ---- */
  for (const [text, frac, side, hue] of SIGNS) sign(ctx, text, frac, side, hue);

  /* ---- glossy plaza floor inlay rings around the centre ---- */
  for (const r of [26, 40]) {
    const ring = new ctx.THREE.Mesh(new ctx.THREE.RingGeometry(r, r + 2.2, 40),
      lam(ctx, 0xb48cff, { transparent: true, opacity: 0.5 }));
    ring.rotation.x = -Math.PI / 2; ring.position.set(trackCenter.x, 0.02, trackCenter.z); scene.add(ring);
  }

  clouds(ctx, 9);
}
