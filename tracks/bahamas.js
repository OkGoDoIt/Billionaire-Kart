/* BAHAMAS CRYPTO GP — Billionaire Kart track module (Batch 3, issue #12).
 * A Nassau beachfront loop past the ruins of an empire. Signature set piece:
 * the collapsed exchange HQ, still settling. The courthouse is across the
 * street; the yacht is called EFFECTIVE ALTRUISM; the tax-haven banks are
 * brass plates on doors to nowhere. Animated: the yacht bobs, palms sway. */
import { lam, box, cyl, cone, sph, sign, plaque, canvasSign, scatterEach, clouds, anchorGroup } from './shared.js';

export const TRACK = {
  name: 'Bahamas Crypto GP', sky: 0x7fd4f7, fog: 0xcfeef5, ground: 0xe8d8a8, shoulder: 0x2ec4b6, roadSeed: 9,
  points: [[0, -250], [155, -220], [240, -120], [210, 0], [250, 110], [165, 205], [45, 240], [-85, 215], [-215, 190], [-250, 70], [-220, -60], [-250, -150], [-140, -220]],
  // HAND-AUTHORED profiles (docs/track-design-bahamas.md) — keyframes [u, value]:
  // elev = road height in metres; bank = cross-slope in degrees (+ banks a RIGHT turn).
  // Sea level at the beachfront, a causeway climb over the marina inlet, and
  // Courthouse Hill: the law sits at the top of the lap's second climb.
  elev: [[0, 0], [0.10, 0], [0.179, 0.5], [0.248, 1.0], [0.313, 1.5], [0.36, 2.5], [0.44, 6.0], [0.50, 8.0], [0.55, 6.5], [0.623, 3.5], [0.68, 3.0], [0.74, 5.0], [0.80, 7.5], [0.834, 7.0], [0.88, 3.5], [0.93, 0], [0.97, 0]],
  bank: [[0, 0], [0.088, 3], [0.135, 0], [0.179, 10], [0.214, 0], [0.248, -10], [0.281, 0], [0.313, 12], [0.395, 0], [0.476, 2], [0.55, 0], [0.623, 10], [0.666, 0], [0.708, 5], [0.745, 0], [0.782, -9], [0.808, 0], [0.834, 14], [0.90, 0], [0.97, 0]],
};
export const CARD = { emoji: '🏝️', desc: 'Beachfront past the FTX ruins. 0% tax, 100% vibes.' };

const SIGNS = [
  ['YOUR KEYS, OUR PROBLEM', 0.04, -1, 190],
  ['RESERVES: TRUST US', 0.20, 1, 45],
  ['BACK SOON (COURT-ORDERED)', 0.34, -1, 15],
  ['0% TAX, 100% VIBES', 0.55, 1, 160],
  ['CUSTOMER FUNDS: DO NOT TOUCH (AGAIN)', 0.68, -1, 0],
  ['EXTRADITION HEARINGS: DAILY, 9AM', 0.84, 1, 260],
  ['PENTHOUSE FOR SALE (SEIZED)', 0.95, -1, 320],
];

const palmCrowns = [];
function palm(ctx, x, z, s = 1, groundY = 0) {
  const g = new ctx.THREE.Group(); g.position.set(x, groundY, z); g.rotation.y = ctx.rand(0, 6.3); ctx.scene.add(g);
  let px = 0;
  for (let i = 0; i < 3; i++) { // curved trunk from stacked, drifting segments
    const seg = new ctx.THREE.Mesh(new ctx.THREE.CylinderGeometry(0.28 * s, 0.34 * s, 2.2 * s, 7), lam(ctx, 0x9a7b52));
    px += 0.32 * s * i; seg.position.set(px, (1.1 + i * 2.05) * s, 0); seg.rotation.z = -0.16; seg.castShadow = true; g.add(seg);
  }
  const crown = new ctx.THREE.Group(); crown.position.set(px + 0.6 * s, 6.6 * s, 0); g.add(crown);
  for (let i = 0; i < 6; i++) {
    const frond = new ctx.THREE.Mesh(new ctx.THREE.ConeGeometry(0.5 * s, 4.6 * s, 5), lam(ctx, 0x2e9e4f));
    const a = i / 6 * Math.PI * 2;
    frond.position.set(Math.cos(a) * 1.6 * s, 0.3 * s, Math.sin(a) * 1.6 * s);
    frond.rotation.set(Math.sin(a) * 1.15, 0, -Math.cos(a) * 1.15);
    crown.add(frond);
  }
  palmCrowns.push({ crown, ph: ctx.rand(0, 6) });
  return g;
}

export function build(ctx) {
  const { scene, trackCenter } = ctx;
  palmCrowns.length = 0;

  /* ---- the sea (east side) + the good ship EFFECTIVE ALTRUISM ---- */
  const seaMat = lam(ctx, 0x1fb6c9, { transparent: true, opacity: 0.94 });
  const sea = new ctx.THREE.Mesh(new ctx.THREE.PlaneGeometry(560, 760), seaMat);
  sea.rotation.x = -Math.PI / 2; sea.position.set(430, -0.04, 0); scene.add(sea);
  const yacht = new ctx.THREE.Group(); yacht.position.set(345, 0, -55); yacht.rotation.y = 0.5; scene.add(yacht);
  const hull = new ctx.THREE.Mesh(new ctx.THREE.BoxGeometry(7, 2.6, 24), lam(ctx, 0xf5f7f8));
  hull.position.y = 1.2; hull.castShadow = true; yacht.add(hull);
  const bow = new ctx.THREE.Mesh(new ctx.THREE.ConeGeometry(3.5, 7, 4), lam(ctx, 0xf5f7f8));
  bow.position.set(0, 1.2, 15); bow.rotation.set(Math.PI / 2, Math.PI / 4, 0); yacht.add(bow);
  const cabin = new ctx.THREE.Mesh(new ctx.THREE.BoxGeometry(5, 2.4, 10), lam(ctx, 0xdfe8ec));
  cabin.position.set(0, 3.6, -1); yacht.add(cabin);
  const mast = new ctx.THREE.Mesh(new ctx.THREE.CylinderGeometry(0.14, 0.14, 11, 6), lam(ctx, 0x8a8f96));
  mast.position.set(0, 8, 3); yacht.add(mast);
  const yachtPlaque = plaque(ctx, 'S.Y. EFFECTIVE ALTRUISM', 11, 2.8, 200);
  yachtPlaque.position.set(0, 5.6, -6.4); yachtPlaque.rotation.y = Math.PI; yacht.add(yachtPlaque);
  ctx.animators.push((dt, t) => {
    yacht.position.y = Math.sin(t * 0.8) * 0.35;
    yacht.rotation.z = Math.sin(t * 0.6) * 0.03;
    seaMat.opacity = 0.90 + (Math.sin(t * 0.7) + 1) * 0.03;
  });

  /* ---- signature set piece: the collapsed exchange HQ ---- */
  const hq = anchorGroup(ctx, 0.46, -(ctx.HALF_W + 42));
  const glassM = lam(ctx, 0x7fb2cc), concM = lam(ctx, 0xd8d2c2);
  let lean = 0, ox = 0;
  for (let i = 0; i < 5; i++) { // each floor leans a little further from the truth
    lean += 0.045;
    const floor = new ctx.THREE.Mesh(new ctx.THREE.BoxGeometry(17, 4.6, 13), i % 2 ? glassM : concM);
    ox += lean * 4.4;
    floor.position.set(ox, 2.3 + i * 4.6, 0); floor.rotation.z = lean; floor.castShadow = true; hq.add(floor);
  }
  const toppled = new ctx.THREE.Mesh(new ctx.THREE.BoxGeometry(17, 4.6, 13), glassM);
  toppled.position.set(17, 2.2, 9); toppled.rotation.set(0.15, 0.5, 1.25); toppled.castShadow = true; hq.add(toppled); // the top floor, on the lawn
  for (let i = 0; i < 6; i++) { // rubble
    const r = new ctx.THREE.Mesh(new ctx.THREE.DodecahedronGeometry(ctx.rand(0.8, 2.0)), lam(ctx, 0xbdb5a2));
    r.position.set(ctx.rand(-14, 22), 0.7, ctx.rand(-10, 14)); r.rotation.set(ctx.rand(0, 3), ctx.rand(0, 3), 0); hq.add(r);
  }
  const ftxSign = canvasSign(ctx, 12, 3.4, (g, w, h) => {
    g.fillStyle = '#101736'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#7fd4f7'; g.font = '900 120px system-ui'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText('FTX', w / 2, h / 2 + 6);
  });
  ftxSign.position.set(-4, 1.4, 12); ftxSign.rotation.set(-1.1, 0.3, 0.15); hq.add(ftxSign); // face-down in the sand
  const hqPlaque = plaque(ctx, 'EXCHANGE HQ — STRUCTURALLY UNSOUND (BOTH WAYS)', 16, 4, 190);
  hqPlaque.position.set(-2, 8.5, 8.2); hqPlaque.rotation.z = 0.1; hq.add(hqPlaque);

  /* ---- the courthouse (postcard stand included) ---- */
  const court = anchorGroup(ctx, 0.80, ctx.HALF_W + 28);
  for (let sIdx = 0; sIdx < 4; sIdx++) {
    const step = new ctx.THREE.Mesh(new ctx.THREE.BoxGeometry(26 - sIdx * 2.4, 0.6, 3.2), lam(ctx, 0xe3ded0));
    step.position.set(0, 0.3 + sIdx * 0.6, 11 - sIdx * 1.5); court.add(step);
  }
  const cBase = new ctx.THREE.Mesh(new ctx.THREE.BoxGeometry(22, 7, 11), lam(ctx, 0xefe9da));
  cBase.position.y = 5.9; cBase.castShadow = true; court.add(cBase);
  for (let i = 0; i < 5; i++) {
    const col = new ctx.THREE.Mesh(new ctx.THREE.CylinderGeometry(0.65, 0.65, 8.6, 10), lam(ctx, 0xf7f3e8));
    col.position.set(-8.4 + i * 4.2, 6.7, 6); court.add(col);
  }
  const ped = new ctx.THREE.Mesh(new ctx.THREE.CylinderGeometry(0.1, 12, 3.6, 3, 1), lam(ctx, 0xefe9da));
  ped.position.y = 11.2; ped.rotation.y = Math.PI; court.add(ped);
  const cPlaque = plaque(ctx, 'UNITED STATES v. BANKMAN-FRIED', 15, 3.8, 0);
  cPlaque.position.set(0, 7.6, 5.7); court.add(cPlaque);
  for (let i = 0; i < 4; i++) cone(ctx, 0.45, 1.1, 0xff7722, 0, 0, 0, { parent: court }).position.set(-8 + i * 5.4, 0.55, 14.5); // press-pool cones

  /* ---- brass-plate banks: doors to nowhere, rates to die for ---- */
  const bankNames = ['BANK OF NOWHERE', 'FIRST HAVEN TRUST', 'SHELL & CO.', 'BRASS PLATE BANK plc'];
  bankNames.forEach((name, i) => {
    const b = anchorGroup(ctx, 0.60 + i * 0.028, ctx.HALF_W + 15);
    const bodyB = new ctx.THREE.Mesh(new ctx.THREE.BoxGeometry(7.5, 5.5, 5), lam(ctx, 0xe8e2d2));
    bodyB.position.y = 2.75; bodyB.castShadow = true; b.add(bodyB);
    const door = new ctx.THREE.Mesh(new ctx.THREE.BoxGeometry(1.8, 3.4, 0.15), lam(ctx, 0x5a4632));
    door.position.set(0, 1.7, 2.6); b.add(door);
    const plate = plaque(ctx, name, 5.6, 1.4, 45);
    plate.position.set(0, 4.4, 2.62); b.add(plate);
  });

  /* ---- Effective Altruism Conference Centre: seating for 9,000 (approx.) ---- */
  const ea = anchorGroup(ctx, 0.955, -(ctx.HALF_W + 17));
  for (const [px, pz] of [[-4, -3], [4, -3], [-4, 3], [4, 3]]) {
    const post = new ctx.THREE.Mesh(new ctx.THREE.CylinderGeometry(0.09, 0.09, 1.1, 6), lam(ctx, 0xd4af37));
    post.position.set(px, 0.55, pz); ea.add(post);
  }
  const chairSeat = new ctx.THREE.Mesh(new ctx.THREE.BoxGeometry(1.1, 0.09, 1.0), lam(ctx, 0x8a8f96));
  chairSeat.position.y = 0.62; ea.add(chairSeat);
  const chairBack = new ctx.THREE.Mesh(new ctx.THREE.BoxGeometry(1.1, 1.1, 0.09), lam(ctx, 0x8a8f96));
  chairBack.position.set(0, 1.15, -0.5); ea.add(chairBack); // one folding chair. it is enough. it has to be.
  const eaPlaque = plaque(ctx, 'EFFECTIVE ALTRUISM CONFERENCE CENTRE', 13, 3.2, 120);
  eaPlaque.position.set(0, 4.4, 0); ea.add(eaPlaque);

  /* ---- beach dressing: palms, umbrellas, loungers, blank nameplates ---- */
  scatterEach(ctx, 14, ctx.HALF_W + 7, ctx.HALF_W + 40, p => palm(ctx, p.x, p.z, ctx.rand(0.85, 1.25), p.y));
  palm(ctx, trackCenter.x + 30, trackCenter.z - 20, 1.2);
  palm(ctx, trackCenter.x - 42, trackCenter.z + 26, 1.05);
  ctx.animators.push((dt, t) => palmCrowns.forEach(({ crown, ph }) => { crown.rotation.z = Math.sin(t * 1.1 + ph) * 0.055; }));
  scatterEach(ctx, 10, ctx.HALF_W + 8, ctx.HALF_W + 30, (p, i) => {
    cyl(ctx, 0.09, 0.09, 2.6, 0xf2f2f2, p.x, p.y + 1.3, p.z);
    cone(ctx, 2.3, 1.1, [0xff5da2, 0xffd94a, 0x2ec4b6][i % 3], p.x, p.y + 2.9, p.z, { seg: 8 });
    box(ctx, 2.2, 0.35, 0.8, 0xf2ead8, p.x + 1.8, p.y + 0.45, p.z, { ry: ctx.rand(0, 3) });
  });
  // exchange HQ row with half the nameplates blank — the plates are the joke
  for (let i = 0; i < 4; i++) {
    const h = anchorGroup(ctx, 0.115 + i * 0.03, -(ctx.HALF_W + 20));
    const hqB = new ctx.THREE.Mesh(new ctx.THREE.BoxGeometry(9, ctx.rand(6, 10), 7), lam(ctx, 0xdde6ea));
    hqB.position.y = 3.5; hqB.castShadow = true; h.add(hqB);
    if (i % 2 === 0) { const plate = plaque(ctx, i === 0 ? 'ALAMEDA BEACHFRONT OFFICES' : 'EXCHANGE HQ — TENANT #3', 7.6, 1.9, 200); plate.position.set(0, 5.4, 3.62); h.add(plate); }
  }

  for (const [text, frac, side, hue] of SIGNS) sign(ctx, text, frac, side, hue);

  clouds(ctx, 8);
}
