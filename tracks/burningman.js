/* BURNING MAN GP — Billionaire Kart track module (Batch 3, issue #12).
 * A dusk loop on the playa. Signature set piece: the Man, 34 units tall,
 * heart of fire (animated pulsing glow + flickering light). Dust devils
 * wander, a whiteout section drifts across one straight, and the art cars
 * have better production values than the race. */
import { lam, box, cyl, cone, sph, sign, plaque, scatterEach, clouds, anchorGroup, atLap, headingAt } from './shared.js';

export const TRACK = {
  name: 'Burning Man GP', sky: 0x3b2f52, fog: 0x6b5570, ground: 0xd8c49c, shoulder: 0x8a6f4d, roadSeed: 8,
  points: [[0, -260], [170, -215], [255, -90], [225, 40], [260, 150], [150, 235], [10, 255], [-130, 230], [-250, 145], [-225, 10], [-255, -120], [-160, -215], [-60, -245]],
  // HAND-AUTHORED profiles (docs/track-design-burning-man.md) — keyframes [u, value]:
  // elev = road height in metres; bank = cross-slope in degrees (+ banks a RIGHT turn).
  // The playa is dust-flat and stays honest: three designed earth berms only — one
  // feeding the hairpin, the long Overlook Berm facing the Man, and home rollers.
  elev: [[0, 0], [0.10, 0], [0.16, 1.0], [0.198, 2.0], [0.269, 3.5], [0.332, 1.0], [0.40, 1.5], [0.47, 4.0], [0.55, 8.0], [0.61, 6.5], [0.671, 5.0], [0.748, 3.5], [0.78, 2.0], [0.821, 3.0], [0.87, 1.5], [0.93, 0], [0.97, 0]],
  bank: [[0, 0], [0.098, 3], [0.15, 0], [0.198, 8], [0.234, 0], [0.269, -9], [0.30, 0], [0.332, 13], [0.50, 0], [0.671, 11], [0.71, 0], [0.748, -7], [0.785, 0], [0.821, 10], [0.866, 0], [0.911, 3], [0.95, 0]],
};
export const CARD = { emoji: '🔥', desc: 'Dusk on the playa. Radical self-reliance, valet available.' };

const SIGNS = [
  ['RADICAL SELF-RELIANCE (VALET PARKING $40K)', 0.03, 1, 30],
  ['WELCOME HOME (TICKETS FROM $1,500)', 0.18, -1, 45],
  ['LEAVE NO TRACE (EXCEPT THE PRIVATE JET)', 0.33, 1, 20],
  ['GIFT ECONOMY — VIP WRISTBANDS $25K', 0.50, -1, 285],
  ['DUST IS A FEATURE', 0.63, 1, 50],
  ['THE MAN BURNS (EVENTUALLY)', 0.77, -1, 15],
  ['10 PRINCIPLES, 0 SHOWERS', 0.90, 1, 200],
];

function artCar(ctx, x, z, ry, kind, groundY = 0) {
  const g = new ctx.THREE.Group(); g.position.set(x, groundY, z); g.rotation.y = ry; ctx.scene.add(g);
  const base = new ctx.THREE.Mesh(new ctx.THREE.BoxGeometry(3.2, 1.1, 6.4), lam(ctx, [0xc75146, 0x3f6d8e, 0xe0a526][kind % 3]));
  base.position.y = 1.0; base.castShadow = true; g.add(base);
  for (const [wx, wz] of [[-1.7, 2.2], [1.7, 2.2], [-1.7, -2.2], [1.7, -2.2]]) {
    const wheel = new ctx.THREE.Mesh(new ctx.THREE.CylinderGeometry(0.65, 0.65, 0.4, 10), lam(ctx, 0x1c1c22));
    wheel.rotation.z = Math.PI / 2; wheel.position.set(wx, 0.65, wz); g.add(wheel);
  }
  if (kind === 0) { // shark car
    const fin = new ctx.THREE.Mesh(new ctx.THREE.ConeGeometry(1.1, 2.6, 4), lam(ctx, 0x8fa8b8));
    fin.position.set(0, 3.1, -0.6); fin.rotation.x = -0.4; g.add(fin);
    const snout = new ctx.THREE.Mesh(new ctx.THREE.ConeGeometry(1.2, 2.6, 8), lam(ctx, 0xaebfca));
    snout.position.set(0, 1.4, 4.2); snout.rotation.x = Math.PI / 2; g.add(snout);
  } else if (kind === 1) { // cupcake car
    const dome = new ctx.THREE.Mesh(new ctx.THREE.SphereGeometry(2.0, 14, 10, 0, Math.PI * 2, 0, Math.PI / 2), lam(ctx, 0xff9ec6));
    dome.position.y = 1.6; g.add(dome);
    const cherry = new ctx.THREE.Mesh(new ctx.THREE.SphereGeometry(0.55, 10, 8),
      new ctx.THREE.MeshLambertMaterial({ color: 0xd21f3c, emissive: 0x7a0f22, emissiveIntensity: 0.7 }));
    cherry.position.y = 3.9; g.add(cherry);
  } else { // pirate ship car
    const mast = new ctx.THREE.Mesh(new ctx.THREE.CylinderGeometry(0.16, 0.16, 6.4, 6), lam(ctx, 0x7a4a21));
    mast.position.y = 4.4; g.add(mast);
    const sail = new ctx.THREE.Mesh(new ctx.THREE.PlaneGeometry(3.4, 3.6),
      new ctx.THREE.MeshLambertMaterial({ color: 0xf2ead8, side: ctx.THREE.DoubleSide }));
    sail.position.set(0, 4.8, 0.4); g.add(sail);
    const bow = new ctx.THREE.Mesh(new ctx.THREE.ConeGeometry(1.3, 2.4, 6), lam(ctx, 0x7a4a21));
    bow.position.set(0, 1.5, 4.1); bow.rotation.x = Math.PI / 2; g.add(bow);
  }
  return g;
}

function dustDevil(ctx, cx, cz, radius, speed, phase) {
  const g = new ctx.THREE.Group(); ctx.scene.add(g);
  const mat = lam(ctx, 0xe6d3ac, { transparent: true, opacity: 0.32, depthWrite: false });
  for (let i = 0; i < 6; i++) {
    const ring = new ctx.THREE.Mesh(new ctx.THREE.TorusGeometry(1.2 + i * 0.85, 0.5, 6, 14), mat);
    ring.rotation.x = Math.PI / 2; ring.position.y = 1.2 + i * 1.7; g.add(ring);
  }
  ctx.animators.push((dt, t) => {
    const a = t * speed + phase;
    g.position.set(cx + Math.cos(a) * radius, Math.sin(t * 0.9 + phase) * 0.5, cz + Math.sin(a) * radius);
    g.rotation.y += dt * 5.5;
  });
  return g;
}

export function build(ctx) {
  const { scene, trackCenter } = ctx;

  /* ---- signature set piece: THE MAN ---- */
  const man = new ctx.THREE.Group();
  man.position.set(trackCenter.x, 0, trackCenter.z); scene.add(man);
  const wood = lam(ctx, 0x9a7b52);
  const plinth = new ctx.THREE.Mesh(new ctx.THREE.CylinderGeometry(9, 11, 3, 8), lam(ctx, 0x8a6f4d));
  plinth.position.y = 1.5; plinth.castShadow = true; man.add(plinth);
  for (const sx of [-1, 1]) {
    const leg = new ctx.THREE.Mesh(new ctx.THREE.BoxGeometry(1.5, 13, 1.5), wood);
    leg.position.set(sx * 2.4, 9.5, 0); leg.rotation.z = sx * -0.1; leg.castShadow = true; man.add(leg);
    const arm = new ctx.THREE.Mesh(new ctx.THREE.BoxGeometry(1.3, 12, 1.3), wood);
    arm.position.set(sx * 6.4, 19.5, 0); arm.rotation.z = sx * 0.85; arm.castShadow = true; man.add(arm); // arms raised: he knows
  }
  const torso = new ctx.THREE.Mesh(new ctx.THREE.BoxGeometry(6.4, 10, 2.6), wood);
  torso.position.y = 20.5; torso.castShadow = true; man.add(torso);
  const head = new ctx.THREE.Mesh(new ctx.THREE.BoxGeometry(3.6, 4.2, 3.2), wood);
  head.position.y = 27.8; head.castShadow = true; man.add(head);
  // heart of fire — emissive core + a real point light, both breathing
  const heartMat = new ctx.THREE.MeshLambertMaterial({ color: 0xff7722, emissive: 0xff5500, emissiveIntensity: 1.6 });
  const heart = new ctx.THREE.Mesh(new ctx.THREE.SphereGeometry(1.5, 12, 10), heartMat);
  heart.position.set(0, 21.5, 1.6); man.add(heart);
  const fireLight = new ctx.THREE.PointLight(0xff8033, 900, 95, 1.8);
  fireLight.position.set(trackCenter.x, 22, trackCenter.z + 4); scene.add(fireLight);
  ctx.animators.push((dt, t) => {
    const pulse = 0.75 + Math.sin(t * 2.3) * 0.18 + Math.sin(t * 9.7) * 0.09 + Math.random() * 0.05;
    heartMat.emissiveIntensity = 1.7 * pulse;
    fireLight.intensity = 950 * pulse;
    heart.scale.setScalar(0.92 + pulse * 0.16);
  });
  const manPlaque = plaque(ctx, 'THE MAN — PLEASE DO NOT CLIMB (EVERYONE CLIMBS)', 15, 3.8, 30);
  manPlaque.position.set(trackCenter.x, 6, trackCenter.z + 11.5); scene.add(manPlaque);

  /* ---- art cars: parked on the playa + a mutant-vehicle parade on the infield ---- */
  scatterEach(ctx, 9, ctx.HALF_W + 14, ctx.HALF_W + 46, (p, i) => artCar(ctx, p.x, p.z, ctx.rand(0, 6.3), i % 3, p.y));
  for (let i = 0; i < 3; i++) {
    const a = i / 3 * Math.PI * 2 + 0.7;
    artCar(ctx, trackCenter.x + Math.cos(a) * 52, trackCenter.z + Math.sin(a) * 52, a + Math.PI / 2, (i + 1) % 3);
  }

  /* ---- dust devils, wandering their little territories ---- */
  dustDevil(ctx, trackCenter.x - 70, trackCenter.z - 40, 17, 0.24, 0);
  dustDevil(ctx, trackCenter.x + 85, trackCenter.z + 55, 14, 0.31, 2.2);
  const ddSpot = atLap(ctx, 0.55, -(ctx.HALF_W + 34));
  dustDevil(ctx, ddSpot.x, ddSpot.z, 11, 0.4, 4.1);

  /* ---- the whiteout section: dust banks swallow one straight ---- */
  const wFrac = 0.30, wHead = headingAt(ctx, wFrac);
  const dustMat = lam(ctx, 0xe8d5ae, { transparent: true, opacity: 0.30, depthWrite: false });
  const banks = [];
  for (const side of [-1, 1]) {
    const p = atLap(ctx, wFrac, side * (ctx.HALF_W + 3.5));
    const bank = new ctx.THREE.Mesh(new ctx.THREE.PlaneGeometry(64, 8.5), dustMat);
    bank.position.set(p.x, p.y + 4, p.z); bank.rotation.y = wHead + (side > 0 ? Math.PI : 0);
    scene.add(bank); banks.push(bank);
  }
  const wSign = sign(ctx, 'WHITEOUT — RADICAL VISIBILITY: NONE', wFrac - 0.035, 1, 45);
  ctx.animators.push((dt, t) => { dustMat.opacity = 0.24 + (Math.sin(t * 0.45) + 1) * 0.075; }); // it breathes in and out

  /* ---- temple-ish shade structures + MOOP piles (matter out of place) ---- */
  scatterEach(ctx, 7, ctx.HALF_W + 18, ctx.HALF_W + 55, p => {
    for (const sx of [-1, 1]) cyl(ctx, 0.18, 0.18, 5.4, 0x8a6f4d, p.x + sx * 3.4, p.y + 2.7, p.z);
    cone(ctx, 5.2, 2.2, 0xe8dcc2, p.x, p.y + 6.2, p.z, { seg: 4 });
  });
  scatterEach(ctx, 12, ctx.HALF_W + 5, ctx.HALF_W + 30, p => {
    sph(ctx, ctx.rand(0.4, 0.9), 0xb8a888, p.x, p.y + 0.35, p.z); // glitter, probably
  });

  for (const [text, frac, side, hue] of SIGNS) sign(ctx, text, frac, side, hue);

  clouds(ctx, 5, 0xcbb8d8); // dusk clouds, faintly purple
}
