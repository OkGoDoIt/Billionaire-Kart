/* Crypto Cove: the third stop of the first cup. A golden-hour tax-haven bay:
   a seafront promenade, a sweep across the beach, a long wooden pier out over
   the water with a jump back to land, a climb over the rocky headland through
   a sea cave, and a fast run back down to the promenade. Over the bay towers
   a price chart the size of a rollercoaster: a rocket rides it up to the
   all-time high and off the cliff into the sea, lap after lap. */
import { fbm, smoothstep } from '../core/util.js';

import { Scenery, partsOf } from '../render/scenery.js';
import * as P from '../models/props.js';
import * as C from '../models/props-crypto-cove.js';
import { canvasTex } from '../render/textures.js';
import { makeGroundHit, EDGE } from '../track/track.js';
import { ModelBuilder, box, cyl, plastic, paint } from '../models/build.js';

/* The coastline: the land is inside this polygon, the sea outside it. */
const COAST = [
  [-600, -600], [600, -600], [600, 252], [262, 250], [205, 244], [176, 238], [152, 230], [136, 214],
  [150, 182], [162, 140], [134, 100], [118, 62], [104, 40], [60, 35], [-20, 35], [-78, 42],
  [-88, 100], [-84, 168], [-74, 236], [-48, 282], [-26, 300], [-30, 320], [-72, 334], [-160, 336],
  [-260, 326], [-600, 326],
];
const HEAD = { x: -150, z: 150 };      // rocky headland
const CAVE = { x: -114, z: 112 };      // the hill the cave runs through
const CLUB = { x: 197, z: 67, yaw: -0.78 };        // beach club plateau
const LIGHT = { x: -186, z: 298 };     // lighthouse knoll at the tip of the headland
const lin = c => { c /= 255; return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
const SAND = [lin(0xf2), lin(0xdf), lin(0xae)];   // look.terrain.sand in linear light
const ADS = ['HAVE FUN STAYING POOR', 'NUMBER GO UP', 'HODL', 'NOT FINANCIAL ADVICE', 'TRUST ME BRO CAPITAL', 'WITHDRAWALS PAUSED', 'FULLY BACKED (BY VIBES)', 'GAS FEES APPLY', 'FUNDS ARE SAFU', 'BUY THE DIP', 'AUDITED BY MY COUSIN', 'FEW UNDERSTAND', 'WEN LAMBO', 'THIS IS GOOD FOR BITCOIN'];

function coastDistance(x, z) {         // signed distance to the coast, positive on land
  let d = Infinity, inside = false;
  for (let i = 0, j = COAST.length - 1; i < COAST.length; j = i++) {
    const [ax, az] = COAST[j], [bx, bz] = COAST[i];
    const ex = bx - ax, ez = bz - az, wx = x - ax, wz = z - az;
    const t = Math.max(0, Math.min(1, (wx * ex + wz * ez) / (ex * ex + ez * ez)));
    d = Math.min(d, Math.hypot(wx - ex * t, wz - ez * t));
    if ((az > z) !== (bz > z) && x < ax + ((z - az) / (bz - az)) * ex) inside = !inside;
  }
  return inside ? d : -d;
}

export default {
  id: 'crypto-cove',
  name: 'Crypto Cove',
  tagline: 'Number go up. Number go splash.',
  lapNotes: ['<b>$COVE is down 60%.</b> Still early.', '<b>$COVE is down 99%.</b> Withdrawals paused.'],   // shown as laps two and three begin
  // the opening shot: the price chart over the bay, the rocket on its way up
  intro: [{ pos: [168, 13, 268], pos1: [136, 19, 282], look: [80, 24, 380], look1: [50, 30, 382], fov: 54, dur: 3.2 }],
  laps: 3,
  width: 17,
  sky: 'golden',
  backdrop: { img: 'assets/backdrops/crypto-cove.webp', top: 24, bottom: -10, rot: 0.6 },
  offroad: 'sand',
  defaults: { edge: 'open', shoulder: 3.5, outer: 11 },
  path: [
    { p: [0, 3.5, 0] },              // 0 start/finish on the promenade, heading +x
    { p: [80, 3.5, 0] },             // 1
    { p: [138, 2.6, 16] },           // 2 turn one, down onto the beach
    { p: [156, 0.6, 76] },           // 3 beach sweep
    { p: [204, 0.4, 128] },          // 4 left kink
    { p: [180, 0.8, 196] },          // 5 right-hander onto the pier (shortcut on the inside)
    { p: [182, 3.0, 272], w: 17 }, // 6 pier, heading out to sea
    { p: [175, 3.3, 303], wl: 7.8, wr: 9.2 }, // 7 the bend on the pier
    { p: [150, 3.5, 311], wl: 7.8, wr: 9.2 }, // 8
    { p: [60, 3.6, 311], w: 16.5 },  // 9 ramp and gap
    { p: [-38, 2.6, 300] },          // 10 landing on the sandbar
    { p: [-108, 5, 272] },           // 11 headland climb
    { p: [-154, 9.5, 210] },         // 12 drift right
    { p: [-98, 13.5, 150] },        // 13 drift left, into the cave
    { p: [-124, 16.5, 92] },         // 14 out of the cave, high above the bay
    { p: [-162, 13, 46] },           // 15 descent
    { p: [-164, 8.5, -12] },         // 16 S-bend
    { p: [-110, 5, -30], bank: 6 },  // 17 banked final corner
    { p: [-56, 3.5, -2] },           // 18 onto the promenade
  ],
  sides: [
    { from: 17.6, to: 1.7, side: 'L', edge: 'wall' },                 // promenade: walled on the land side
    { from: 1.8, to: 5.5, side: 'R', outer: 25, shoulder: 4 },         // beach: run wide onto the sand and into the shallows
    { from: 3.4, to: 4.6, side: 'R', outer: 34, shoulder: 5 },         // cut the beach corner across the sand (needs a boost)
    { from: 5.6, to: 9.75, edge: 'void' },                           // pier: nothing at the edge but the sea
  ],
  zones: [{ from: 1.9, to: 5.6, surface: 'dirt' }],
  bridges: [{ from: 5.6, to: 9.75 }],
  gaps: [{ from: 9.2, to: 9.37 }],
  tunnels: [{ from: 13.3, to: 14.15, through: true }],
  ramps: [{ at: 9.06, len: 10, lift: 2.6 }],
  boosts: [
    { at: 0.5, lat: 0, w: 5 },
    { at: 9.5, lat: 0, w: 6 },
    { at: 14.2, lat: 0, w: 5 },
    { at: 16.6, lat: -3, w: 4.5 },
  ],
  itemRows: [{ at: 1.6 }, { at: 3.4 }, { at: 10.9 }, { at: 14.4, n: 3 }],
  coins: [
    { from: 0.2, to: 0.5, n: 4, lat: -4.5 },
    { from: 2.4, to: 2.9, n: 5, lat: [-5, 4] },
    { from: 3.75, to: 4.25, n: 4, lat: [-11, -15] },   // the sand cut
    { from: 7.2, to: 7.8, n: 5, lat: [-4, 4] },
    { from: 9.22, to: 9.35, n: 3, lat: 0, air: 2.8 },
    { from: 12.2, to: 12.8, n: 5, lat: [-4, 5] },
    { from: 15.4, to: 16.0, n: 4, lat: [4, -3] },
  ],
  obstacles: [
    // crabs scuttle across the beach, each covering only part of the road
    { kind: 'patrol', model: 'crab', at: 2.2, lats: [-1, 7.5], speed: 3.5, effect: 'spin', radius: 1.2 },
    { kind: 'patrol', model: 'crab', at: 2.85, lats: [-7.5, 0], speed: 4, effect: 'spin', radius: 1.2 },
    { kind: 'patrol', model: 'crab', at: 4.55, lats: [-7.5, -3.5], speed: 3, effect: 'spin', radius: 1.2 },
    { kind: 'patrol', model: 'crab', at: 5.1, lats: [-7.5, -1], speed: 4.5, effect: 'spin', radius: 1.2 },
    // tiki torches flare in turn at the pier gate
    { kind: 'timed', model: 'flame', at: 5.45, lat: 6, period: 3, duty: 0.45, phase: 0, effect: 'spin', radius: 1.3 },
    { kind: 'timed', model: 'flame', at: 5.5, lat: -6, period: 3, duty: 0.45, phase: 1.5, effect: 'spin', radius: 1.3 },
    // washed up on the sandbar, either side of the landing
    { kind: 'static', model: 'chest', at: 9.86, lat: 6.2, effect: 'bump', radius: 1.3 },
    { kind: 'static', model: 'buoy', at: 9.92, lat: -6.2, effect: 'bump', radius: 1.2 },
  ],
  models: { crab: () => C.crab(), chest: () => C.chest(), buoy: () => C.buoy(0xff6a3d, 'STABLECOIN') },
  terrain: {
    cell: 3, margin: 230, blend: 18, water: -1.2,
    color(x, z, h, slope, over, out) {                       // sandy beaches and seabed around the whole cove
      const d = coastDistance(x, z);
      const t = (1 - smoothstep(30, 56, d)) * (1 - smoothstep(2.5, 6, h)) * (1 - smoothstep(0.6, 1.0, slope)) * (0.85 + fbm(x * 0.05, z * 0.05, 2, 8) * 0.3);
      for (let k = 0; k < 3; k++) out[k] += (SAND[k] - out[k]) * Math.min(1, t);
    },
    fn(x, z) {
      const d = coastDistance(x, z);
      let h;
      if (d < 0) h = -1.5 - smoothstep(6, 60, -d) * 6;                               // shallows, then deep water
      else {
        h = -1.3 + smoothstep(0, 24, d) * 2.6;                                          // the beach
        const hill = smoothstep(26, 140, d);
        h += hill * (10 + (fbm(x * 0.007, z * 0.007, 4, 11) - 0.35) * 34);              // green hills inland
        h += (fbm(x * 0.03, z * 0.03, 3, 5) - 0.5) * 2.5 * smoothstep(10, 40, d);
        h += smoothstep(120, 320, d) * (26 + fbm(x * 0.004, z * 0.004, 3, 2) * 30);        // a ring of high green hills far inland
      }
      const hd = Math.hypot(x - HEAD.x, z - HEAD.z);
      h += (1 - smoothstep(30, 120, hd)) * 16 * smoothstep(-20, 10, d);                // the headland rises
      const cd = Math.hypot(x - CAVE.x, z - CAVE.z);
      const cave = 1 - smoothstep(24, 62, cd);
      h += Math.max(0, 34 + (fbm(x * 0.05, z * 0.05, 2, 9) - 0.5) * 6 - h) * cave;  // rock over the cave
      const club = 1 - smoothstep(16, 30, Math.hypot(x - CLUB.x, z - CLUB.z));
      h = h * (1 - club) + 2.4 * club;                                                  // flat ground for the beach club
      const knoll = 1 - smoothstep(10, 40, Math.hypot(x - LIGHT.x, z - LIGHT.z));
      h += Math.max(0, 12 + (fbm(x * 0.06, z * 0.06, 2, 4) - 0.5) * 3 - h) * knoll;   // rocky knoll under the lighthouse
      return h;
    },
  },
  look: {
    road: { base: 0x6a6670, line: 0xffffff, center: 0xffd23c },
    kerb: [0xff6a3d, 0xfff4e0],
    shoulder: 0xe8d3a0,
    terrain: { low: 0x5cb85a, high: 0x86d16a, dry: 0xcfd27a, rock: 0x9a8f86, sand: 0xf2dfae, dirt: 0xd9c08a },
    water: 0x1fc3c8, deck: 0x9a6a42, rail: 0xffb347,
    tunnelLight: 0xffd08a, portal: 0x9a8f86,
    ads: ADS,
  },
  COAST,

  /** Dress the course. ctx: { THREE, track, group, gfx, anim, view } */
  decorate(ctx) { decorate(ctx); },
};

function decorate(ctx) {
  const { THREE, track, anim, view } = ctx, sc = new Scenery(ctx), rng = sc.rng;
  const W = track.water;
  const far = (x, z, list, r) => list.every(o => (o.x - x) ** 2 + (o.z - z) ** 2 > r * r);
  const keepOut = [{ x: CLUB.x, z: CLUB.z, r: 17 }, { x: LIGHT.x, z: LIGHT.z, r: 14 }, { x: RUG.x, z: RUG.z, r: 28 }, { x: BULL.x, z: BULL.z, r: 34 }, { x: -170, z: -62, r: 14 }, { x: TOWER.x, z: TOWER.z, r: 8 }];
  const clear = (x, z) => keepOut.every(o => (o.x - x) ** 2 + (o.z - z) ** 2 > o.r * o.r);

  // start/finish gantry and grandstands on the land side of the promenade
  const g0 = sc.beside(0, 1, -track.hwL[0]);
  const gantry = P.gantry(track.hwL[0] + track.hwR[0] + 1.5, 'CRYPTO COVE', { color: 0x1fc3c8, color2: 0xffb347 });
  sc.place(gantry, g0.x, g0.z, { yaw: g0.along, y: g0.roadY });
  view.startLights = gantry.userData.lights;
  const stand = P.grandstand({ w: 30, rows: 6, color: 0xff6a3d }), stand2 = P.grandstand({ w: 30, rows: 6, color: 0x1fc3c8 });
  const seats = [];
  const M = new THREE.Matrix4(), V = new THREE.Vector3();
  const standSpots = [];
  const putStand = (proto, p) => {
    const g = proto.group.clone(); sc.place(g, p.x, p.z, { yaw: p.yaw, y: track.py[p.i] - 0.3 }); standSpots.push({ x: p.x, z: p.z, yaw: p.yaw, y: track.py[p.i] - 0.3 });
    g.updateMatrixWorld(true); M.copy(g.matrixWorld);
    for (const s of proto.seats) if (rng() < 0.82) { V.set(s[0], s[1], s[2]).applyMatrix4(M); seats.push({ x: V.x, y: V.y, z: V.z, yaw: p.yaw + rng.range(-0.4, 0.4) }); }
  };
  sc.along({ from: 18.3, to: 0.95, side: 1, offset: 6.5, spacing: 36 }).forEach((p, i) => putStand(i % 2 ? stand2 : stand, p));
  sc.instances(partsOf(P.spectator()), seats, { scale: [0.95, 1.2], tints: P.CROWD_TINTS, cast: false });
  const jk = jokes(ctx, sc, { standSpots, seats, gantryAt: g0 });

  // road skins: planks on the pier, packed sand on the beach (drawn just above the road)
  skin(ctx, 5.6, 9.06, plankTexture(), 5.5);
  skin(ctx, 9.37, 9.75, plankTexture(), 5.5);
  skin(ctx, 1.9, 5.6, sandTexture(), 14, true);

  // the lighthouse on its knoll, sweeping the bay
  const lh = C.lighthouse({ H: 30 });
  sc.place(lh, LIGHT.x, LIGHT.z, { y: sc.y(LIGHT.x, LIGHT.z) - 0.6 });
  anim.push(dt => { lh.userData.beam.rotation.y += dt * 0.9; });

  // the beach club, side-on to the beach road
  {
    const club = C.beachClub('WITHDRAWALS PAUSED');
    sc.place(club, CLUB.x, CLUB.z, { yaw: CLUB.yaw, y: 2.4 });
  }

  // superyachts moored in the bay, bobbing gently
  const yachts = [
    ['RUG RUNNER', -20, 215, -0.9, 0x1fc3c8], ['HODL ON', -46, 168, 1.45, 0xff6a3d],
    ['COLD WALLET', 250, 420, 0.25, 0x7b5cff], ['TAX EXEMPT', 255, 330, -1.1, 0xffb347],
  ].map(([name, x, z, yaw, accent], i) => {
    const L = 36 + (i % 3) * 4, y = C.superyacht(name, { accent, L });
    const ok = [-1, 0, 1].every(f => track.terrainHeight(x + Math.sin(yaw) * f * L * 0.5, z + Math.cos(yaw) * f * L * 0.5) < W - 2.5);
    if (!ok) return null;
    y.position.set(x, W - 0.7, z); y.rotation.y = yaw; ctx.group.add(y);
    y.traverse(o => { if (o.isMesh) o.castShadow = sc.shadows; });
    return { y, base: W - 0.7, ph: i * 1.3 };
  }).filter(Boolean);
  let sinkMix = 0;
  anim.push((dt, time) => {
    // #121: lap 2 the fleet sits lower in the water; on the final lap the yachts go down with the market, to the mast
    const target = view.finalLap ? 1 : (view.showLap || 1) >= 2 ? 0.13 : 0;
    sinkMix += (target - sinkMix) * Math.min(1, dt * 0.4);
    yachts.forEach(({ y, base, ph }, i) => {
      const sink = 9.6 * Math.max(0, Math.min(1, sinkMix * 1.25 - i * 0.08));
      y.position.y = base - sink + Math.sin(time * 0.7 + ph) * 0.18 * (1 - sinkMix * 0.7);
      y.rotation.z = Math.sin(time * 0.55 + ph) * 0.02 + sink * 0.011;
      y.rotation.x = Math.sin(time * 0.43 + ph * 2) * 0.012 + sink * 0.006;
    });
  });
  // marker buoys and a few dinghies of colour on the water
  const buoySpots = [[20, 70], [-50, 120], [120, 160], [-30, 260], [110, 270], [200, 360], [-90, 360], [10, 420]].filter(([x, z]) => track.terrainHeight(x, z) < W - 1);
  sc.instances(partsOf(C.buoy(0xff6a3d)), buoySpots.map(([x, z]) => ({ x, z, y: W - 0.5 })), { scale: [1, 1.4], yaw: 'random' });

  // palms along the promenade and the beach, and dotted over the sand
  const palmA = partsOf(P.palm(1, { h: 10 })), palmB = partsOf(P.palm(5, { h: 8.5 })), palmC = partsOf(P.palm(9, { h: 12 }));
  const rows = [
    ...sc.along({ from: 17.4, to: 1.9, side: -1, offset: 13.5, spacing: 13 }),
    ...sc.along({ from: 1.0, to: 5.4, side: 1, offset: 13.5, spacing: 12 }),
    ...sc.along({ from: 9.9, to: 11.6, side: 1, offset: 13, spacing: 12 }),
    ...sc.along({ from: 9.9, to: 11.2, side: -1, offset: 13, spacing: 12 }),
    ...sc.along({ from: 16.6, to: 17.6, side: 1, offset: 13, spacing: 11 }),
  ].filter(p => clear(p.x, p.z) && p.y > W + 0.6);
  const sand = sc.scatter({ count: 120, min: 14, max: 90, maxSlope: 0.35, minGap: 7, where: (x, z, h) => h > W + 0.8 && h < 4.5 && coastDistance(x, z) < 45 && clear(x, z) });
  const palms = [...rows, ...sand];
  sc.instances(palmA, palms.filter((_, i) => i % 3 === 0), { scale: [0.9, 1.3], yaw: 'random' });
  sc.instances(palmB, palms.filter((_, i) => i % 3 === 1), { scale: [0.9, 1.3], yaw: 'random' });
  sc.instances(palmC, palms.filter((_, i) => i % 3 === 2), { scale: [0.85, 1.2], yaw: 'random' });

  // jungle over the hills
  const jungle = sc.scatter({ count: 360, min: 15, max: 200, maxSlope: 0.75, minGap: 5, where: (x, z, h) => h > 4 && clear(x, z) && Math.hypot(x - CAVE.x, z - CAVE.z) > 30 });
  const jA = partsOf(P.roundTree(21, { h: 8, leafA: 0x3f9e3a, leafB: 0x5dbb45 })), jB = partsOf(P.roundTree(22, { h: 6.5, leafA: 0x57b548, leafB: 0x86d16a })), jP = partsOf(P.palm(13, { h: 11 }));
  sc.instances(jA, jungle.filter((_, i) => i % 3 === 0), { scale: [0.9, 1.6], yaw: 'random', tilt: 0.05 });
  sc.instances(jB, jungle.filter((_, i) => i % 3 === 1), { scale: [0.9, 1.5], yaw: 'random', tilt: 0.05 });
  sc.instances(jP, jungle.filter((_, i) => i % 3 === 2), { scale: [0.8, 1.3], yaw: 'random' });
  const low = sc.scatter({ count: 220, min: 12.5, max: 60, maxSlope: 0.7, minGap: 2.5, where: (x, z, h) => h > 2 && clear(x, z) });
  sc.instances(partsOf(P.bush(31, { color: 0x4fae3f, flower: 0xff5fa2 })), low.filter((_, i) => i % 3 === 0), { scale: [0.9, 1.8], yaw: 'random' });
  sc.instances(partsOf(P.bush(32, { color: 0x6cc24f, flower: 0xffd23c })), low.filter((_, i) => i % 3 === 1), { scale: [0.9, 1.7], yaw: 'random' });
  sc.instances(partsOf(P.bush(33, { color: 0x3f9e3a })), low.filter((_, i) => i % 3 === 2), { scale: [1, 2], yaw: 'random' });

  // the headland: big rocks over the hill and around the cave mouth, boulders at the waterline
  const crags = sc.scatter({ count: 70, min: 13, max: 150, maxSlope: 1.2, minGap: 9, where: (x, z, h) => Math.hypot(x - HEAD.x, z - HEAD.z) < 150 && h > 5 && Math.hypot(x - LIGHT.x, z - LIGHT.z) > 12 });
  sc.instances(partsOf(P.rock(41, { r: 2.4 })), crags, { scale: [1.2, 3.4], yaw: 'random', sink: 0.8, tints: [0x9a8f86, 0x8a8078, 0xb0a497] });
  const shore = sc.scatter({ count: 50, min: 13, max: 120, maxSlope: 2, minGap: 6, where: (x, z, h) => h > W - 1.2 && h < W + 1.2 && x < -40 });
  sc.instances(partsOf(P.rock(42, { r: 1.6 })), shore, { scale: [0.8, 2.2], yaw: 'random', sink: 0.4, tints: [0x9a8f86, 0x7f766f] });

  // umbrellas and loungers on the beaches
  const beach = sc.scatter({ count: 110, min: 12.5, max: 70, maxSlope: 0.25, minGap: 4.5, where: (x, z, h) => h > W + 0.5 && h < 2.6 && coastDistance(x, z) > 2 && coastDistance(x, z) < 30 && clear(x, z) });
  sc.instances(partsOf(C.umbrella()), beach, { scale: [0.95, 1.15], yaw: 'random', tints: C.UMBRELLA_TINTS });
  const loungers = [];
  for (const b of beach) for (const s of [-1, 1]) { const a = b.yaw; loungers.push({ x: b.x + Math.cos(a) * s * 0.9, z: b.z - Math.sin(a) * s * 0.9, y: b.y, yaw: a }); }
  sc.instances(partsOf(C.lounger()), loungers, { tints: C.UMBRELLA_TINTS });

  // tiki torches along the promenade and at the pier gate
  const torches = [...sc.along({ from: 17.4, to: 1.9, side: -1, offset: 13.5, spacing: 13, phase: 6.5 }), ...sc.along({ from: 4.9, to: 5.5, side: 1, offset: 13, spacing: 9 }), ...sc.along({ from: 9.9, to: 10.6, side: -1, offset: 13, spacing: 9 })].filter(p => p.y > W + 0.6);
  sc.instances(partsOf(C.tikiTorch()), torches, { scale: [0.95, 1.15], cast: false });

  // arrow boards on the outside of every real corner (not over the sea)
  for (const c of track.corners) {
    const side = c.dir > 0 ? -1 : 1, n = Math.max(2, Math.min(5, Math.round(c.len / 15)));
    for (let k = 0; k < n; k++) {
      const i = (c.i0 + Math.round(((k + 0.6) / n) * (c.len / track.ds))) % track.N;
      const edge = side > 0 ? track.edgeL[i] : track.edgeR[i];
      if (track.bridge[i] || edge !== 0) continue;
      const p = sc.beside(track.cp[i], side, (side > 0 ? track.outerL[i] : track.outerR[i]) + 1.2);
      if (p.y < W + 0.3) continue;
      const b = P.chevronBoard(0xff6a3d); if (c.dir > 0) b.scale.x = -1;
      sc.place(b, p.x, p.z, { yaw: p.yaw, lift: 0.9 }); if (c.dir > 0) b.scale.x = -1;
    }
  }

  // life in the sky
  const cols = [[0xff6a3d, 0xffd23c], [0x1fc3c8, 0xffffff], [0xff4d8d, 0xffd23c], [0x7b5cff, 0xffb347], [0x2ee6a6, 0xffffff]];
  const cx = track.bounds.cx, cz = track.bounds.cz;
  const balloons = cols.map((c, i) => { const b = P.balloon(c); const a = (i / cols.length) * Math.PI * 2 + 0.9, r = 260 + (i % 2) * 80; b.position.set(cx + Math.cos(a) * r, 60 + i * 8, cz + Math.sin(a) * r); b.scale.setScalar(1.4 + (i % 3) * 0.3); ctx.group.add(b); return b; });
  const ship = P.blimp('WITHDRAWALS PAUSED', { accent: 0xef4444 }); ship.scale.setScalar(1.25); ctx.group.add(ship);
  anim.push((dt, time) => {
    balloons.forEach((b, i) => { b.position.y += Math.sin(time * 0.4 + i * 1.7) * dt * 0.8; b.rotation.y += dt * 0.05; });
    const a = time * 0.03; ship.position.set(cx + Math.cos(a) * 170, 80 + Math.sin(time * 0.3) * 2, cz + Math.sin(a) * 150); ship.rotation.y = -a;
  });
  jk.flush();
  void far;
}

/** A textured strip laid over the road between two control params. fade: soften both ends into the road. */
function skin(ctx, from, to, map, tile, fade = false) {
  const { THREE, track: tr } = ctx, i0 = tr.indexAtCp(from), n = ((tr.indexAtCp(to) - i0) + tr.N) % tr.N;
  const pos = [], uv = [], col = [], idx = [], K = 6, up = 0.014;
  for (let r = 0; r <= n; r++) {
    const i = (i0 + r) % tr.N, a = fade ? Math.min(1, r / 14, (n - r) / 14) : 1;
    for (let j = 0; j <= K; j++) {
      const lat = -tr.hwR[i] + (tr.hwL[i] + tr.hwR[i]) * (j / K);
      pos.push(tr.px[i] + tr.lx[i] * lat + tr.ux[i] * up, tr.py[i] + tr.ly[i] * lat + tr.uy[i] * up, tr.pz[i] + tr.lz[i] * lat + tr.uz[i] * up);
      uv.push(j / K, (r * tr.ds) / tile); col.push(1, 1, 1, a);
    }
    if (r < n && !tr.gap[i]) for (let j = 0; j < K; j++) { const q = r * (K + 1) + j; idx.push(q, q + K + 1, q + 1, q + 1, q + K + 1, q + K + 2); }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 4)); g.setIndex(idx); g.computeVertexNormals();
  const m = new THREE.MeshStandardMaterial({ map, roughness: 0.85, metalness: 0, envMapIntensity: 0.5, vertexColors: true, transparent: fade, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 });
  const mesh = new THREE.Mesh(g, m); mesh.receiveShadow = true; mesh.renderOrder = 1; ctx.group.add(mesh);
  return mesh;
}

/** Weathered deck planks running across the pier, with a warm edge stripe either side. */
function plankTexture() {
  return canvasTex(512, 512, (g, w, h) => {
    const n = 16, ph = h / n;
    for (let i = 0; i < n; i++) {
      const v = 0.86 + ((i * 37) % 11) / 55;
      g.fillStyle = `rgb(${Math.round(176 * v)},${Math.round(122 * v)},${Math.round(76 * v)})`; g.fillRect(0, i * ph, w, ph);
      g.fillStyle = 'rgba(70,40,20,0.18)'; for (let k = 0; k < 5; k++) g.fillRect(0, i * ph + 4 + k * 5 + ((i * 7 + k) % 3), w, 1.2);
      g.fillStyle = 'rgba(40,22,10,0.9)'; g.fillRect(0, i * ph, w, 3);
      const cut = ((i * 173) % 300) + 100; g.fillRect(cut, i * ph, 3, ph);
      g.fillStyle = 'rgba(30,20,12,0.7)'; for (const x of [18, w - 22, cut - 10, cut + 12]) { g.beginPath(); g.arc(x, i * ph + ph / 2, 2.4, 0, 7); g.fill(); }
    }
    g.fillStyle = 'rgba(255,179,71,0.85)'; g.fillRect(10, 0, 10, h); g.fillRect(w - 20, 0, 10, h);
  }, { aniso: 8 });
}

/** Hard-packed sand with faint tyre tracks. */
function sandTexture() {
  return canvasTex(256, 512, (g, w, h) => {
    g.fillStyle = '#d9c08a'; g.fillRect(0, 0, w, h);
    let seed = 7; const r = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    for (let i = 0; i < 1400; i++) { const v = r(); g.fillStyle = v > 0.5 ? 'rgba(255,240,205,0.35)' : 'rgba(150,115,70,0.25)'; g.fillRect(r() * w, r() * h, 2 + r() * 3, 2 + r() * 3); }
    g.fillStyle = 'rgba(140,105,60,0.22)'; for (const x of [0.3, 0.38, 0.62, 0.7]) g.fillRect(x * w, 0, 7, h);
  }, { aniso: 8 });
}

/* ---------- the joke pass: the chart, the bull, the rug, and the rest ---------- */
/* The price chart stands in the open sea beyond the pier, rising westward toward the jump and
   crashing into the sea past it. It faces the beach and the pier (south).
   u runs along it (westward), v toward the side it faces, y is height. */
const CHART = { x: 132, z: 380, dx: -0.9988, dz: 0.05 };
const CLOSES = [3, 5, 4.5, 7, 6, 9, 8, 11, 14, 12, 16, 20, 18, 23, 28, 26, 32, 38, 35, 43, 49, 55, 32, 10, -4].map(c => c > 0 ? 5 + c * 0.86 : c);
const STEP = 5.6, RAIL_V = 4.5;
const cw = (u, v, y) => [CHART.x + CHART.dx * u - CHART.dz * v, y, CHART.z + CHART.dz * u + CHART.dx * v];
const CHART_YAW = Math.atan2(-CHART.dz, CHART.dx);
const BULL = { x: 228, z: -24 };
const RUG = { x: 226, z: 188, ax: 0.37, az: 0.93, L: 32, W: 18 };   // centre, the way it is being pulled, size
const BOAT = { x: 266, z: 293 };
const TOWER = { x: 92, z: 48 };
const LIQ = { x: 84, z: 258 };
const LAMBO = { x: 124, z: 286 };
const BOARDS = [
  [0.3, -1, 15, 'FULLY BACKED (BY VIBES)', '#ffd23c', '#1a1d29'], [1.2, 1, 24, 'IN IT FOR THE TECHNOLOGY', '#14213d', '#ffffff'],
  [2.3, 1, 22, 'FUNDS ARE SAFU (PROBABLY)', '#16a34a', '#ffffff'], [3.0, 1, 30, 'YOUR KEYS, OUR COINS', '#ef4444', '#ffffff'],
  [4.4, 1, 24, 'AUDITED BY MY COUSIN', '#ffffff', '#7b5cff'], [10.4, 1, 15, 'DOWN 99%: STILL EARLY', '#1a1d29', '#38ff74'],
  [11.2, 1, 22, 'BUY HIGH, SELL LOW', '#ff6a3d', '#ffffff'], [12.6, -1, 22, 'ONE TWEET FROM ZERO', '#0ea5e9', '#ffffff'],
  [14.6, 1, 22, 'COMMUNITY OWNED, FOUNDER SOLD', '#ffffff', '#ef4444'], [15.4, -1, 18, 'PRESIDENTIAL MEMECOIN: DOWN BIGLY', '#ffd23c', '#1a1d29'],
  [16.2, -1, 24, 'FDIC INSURED (IT IS NOT)', '#7b5cff', '#ffffff'], [17.2, 1, 24, 'ROADMAP: MOON, THEN ???', '#1fc3c8', '#14213d'],
  [18.2, -1, 15, 'LOST MY SEED PHRASE AGAIN', '#ffffff', '#1a1d29'],
];
const CROWD = ['WAGMI', 'HODL', 'WEN LAMBO', 'GM', 'FEW UNDERSTAND', 'TO THE MOON', 'LFG', 'BUY MY BAGS', 'NGMI', 'SELL? NEVER'];

function jokes(ctx, sc, { standSpots, seats, gantryAt }) {
  const { THREE, track, anim, view } = ctx, rng = sc.rng, W = track.water, group = ctx.group;
  const bake = C.makeBaker(group, sc.shadows), atlas = C.makeAtlas(group), F = C.SIGN_FONT, SANS = C.SANS, signDraw = C.signDraw, fitText = C.fitText;
  const hit = makeGroundHit();
  /** True when (x,z) is beyond where a kart can drive, by margin m. */
  const clear = (x, z, m = 1.5) => {
    const g = track.ground(x, z, -1, hit), i = g.i;
    if (g.onRoad) return false;
    if (track.bridge[i] || track.tunnel[i]) return g.outside > m + 4;
    const edge = g.side > 0 ? g.edgeL : g.edgeR;
    if (edge !== EDGE.OPEN) return g.outside > m + 0.8;
    return g.outside > (g.side > 0 ? track.outerL[i] : track.outerR[i]) + m;
  };
  const yawTo = (from, to) => Math.atan2(to.x - from.x, to.z - from.z);
  const roadPt = cp => { const i = track.indexAtCp(cp); return { x: track.px[i], y: track.py[i], z: track.pz[i], i }; };
  const posts = new ModelBuilder();
  const pole = (x, z, y0, y1, r = 0.22) => posts.add('pole', cyl(r, r, Math.max(0.1, y1 - y0), 8), { p: [x, (y0 + y1) / 2, z] });
  const toWorld = (o, l) => { const c = Math.cos(o.yaw), s = Math.sin(o.yaw), k = o.scale ?? 1; return [o.x + (l[0] * c + l[2] * s) * k, o.y + l[1] * k, o.z + (-l[0] * s + l[2] * c) * k]; };

  /* ---- 1. the centerpiece: a price chart the size of a rollercoaster ---- */
  // #121: the candles stand in their own group, pivoted at the foot of the run, so the crash
  // director (bottom of this function) can keel the whole run over into the sea on the final lap
  // and turn every green candle red. Same two meshes the bake used to merge: no new draw calls.
  const PIV = cw(STEP * 0.5, 0, W - 1);
  const cb = new ModelBuilder(), hash = i => ((Math.sin(i * 127.1 + 3.7) * 43758.5453) % 1 + 1) % 1;
  let prev = CLOSES[0] - 2;
  CLOSES.forEach((c, i) => {
    const u = STEP + i * STEP, o = prev, lo = Math.min(o, c), hi = Math.max(o, c), up = c >= o;
    const h = Math.max(1.4, hi - lo);
    const bp = cw(u, 0, lo + h / 2);
    cb.add(up ? 'green' : 'red', new THREE.BoxGeometry(4.2, h, 4.2), { p: [bp[0] - PIV[0], bp[1] - PIV[1], bp[2] - PIV[2]], r: [0, CHART_YAW, 0] });
    const wt = hi + 1.2 + hash(i) * 3, wb = Math.max(W - 1, lo - 1 - hash(i + 9) * 2.5);
    const wq = cw(u, 0, (wt + wb) / 2);
    cb.add(up ? 'green' : 'red', new THREE.BoxGeometry(0.55, wt - wb, 0.55), { p: [wq[0] - PIV[0], wq[1] - PIV[1], wq[2] - PIV[2]], r: [0, CHART_YAW, 0] });
    prev = c;
  });
  const candleMat = col => new THREE.MeshStandardMaterial({ color: col, emissive: col, emissiveIntensity: 0.28, roughness: 0.45 });
  const greenMat = candleMat(0x22c55e), redMat = candleMat(0xef4444);
  const candleGrp = cb.build({ green: greenMat, red: redMat });
  candleGrp.position.set(PIV[0], PIV[1], PIV[2]);
  candleGrp.traverse(o => { if (o.isMesh) o.frustumCulled = false; });
  group.add(candleGrp);
  // the rail: a coaster track through the closes, then straight off the cliff into the sea
  const railPts = [[0, 2.4], ...CLOSES.map((c, i) => [STEP + i * STEP, c + 1.4]), [STEP * 25 + 2.5, -9]];
  const curveAt = v => new THREE.CatmullRomCurve3(railPts.map(([u, y]) => new THREE.Vector3(...cw(u, v, y))), false, 'centripetal');
  const spine = curveAt(RAIL_V), rb = new ModelBuilder();
  for (const dv of [-1, 1]) rb.add('rail', new THREE.TubeGeometry(curveAt(RAIL_V + dv), 420, 0.3, 8, false));
  const railLen = spine.getLength(), samples = spine.getSpacedPoints(600);
  for (let s = 1; s < railLen; s += 1.8) {
    const t = s / railLen, p = spine.getPointAt(t), tg = spine.getTangentAt(t), tu = tg.x * CHART.dx + tg.z * CHART.dz;
    rb.add('tie', new THREE.BoxGeometry(0.3, 0.2, 2.6), { p: [p.x, p.y - 0.25, p.z], r: [0, CHART_YAW, Math.atan2(tg.y, tu)] });
  }
  const railY = u => { let best = samples[0], bd = 1e9; for (const q of samples) { const qu = (q.x - CHART.x) * CHART.dx + (q.z - CHART.z) * CHART.dz, d = Math.abs(qu - u); if (d < bd) { bd = d; best = q; } } return best.y; };
  for (let u = 3; u < STEP * 25; u += STEP) {
    const y = railY(u); if (y < W + 1) continue;
    const p = cw(u, RAIL_V, 0);
    rb.add('leg', cyl(0.32, 0.4, y - 0.4 - (W - 2), 8), { p: [p[0], (y - 0.4 + W - 2) / 2, p[2]] });
    rb.add('leg', new THREE.BoxGeometry(0.3, 0.3, 2.6), { p: [p[0], y - 0.5, p[2]], r: [0, CHART_YAW, 0] });
  }
  bake.builder(rb, { rail: paint(0xffd23c, { rough: 0.35, metal: 0.3 }), tie: plastic(0x3a3f4b, 0.6), leg: plastic(0xf4f4f0, 0.5) }, true);
  let peakT = 0, peakY = -1e9; for (let k = 0; k <= 400; k++) { const y = spine.getPointAt(k / 400).y; if (y > peakY) { peakY = y; peakT = k / 400; } }
  const rocket = C.chartRocket(); group.add(rocket);
  // signs on the chart (two-faced, so they read from the promenade and the pier alike)
  // #121: the sign believes in the pump until the crash director flips numDown on the final lap
  // and repaints the atlas: NUMBER GO UP becomes NUMBER GO DOWN, green becomes red
  let numDown = false;
  const sNum = atlas.add(1024, 228, (g, w, h) => {
    g.fillStyle = numDown ? '#b91c1c' : '#16a34a'; g.fillRect(0, 0, w, h); g.strokeStyle = '#ffffff'; g.lineWidth = 10; g.strokeRect(10, 10, w - 20, h - 20);
    fitText(g, numDown ? 'NUMBER GO DOWN' : 'NUMBER GO UP', w * 0.44, h * 0.55, w * 0.74, 170, F, '#ffffff', { lines: 1 });
    g.fillStyle = '#ffffff'; g.beginPath();
    if (numDown) { g.moveTo(w * 0.86, h * 0.82); g.lineTo(w * 0.96, h * 0.5); g.lineTo(w * 0.9, h * 0.5); g.lineTo(w * 0.9, h * 0.16); g.lineTo(w * 0.82, h * 0.16); g.lineTo(w * 0.82, h * 0.5); g.lineTo(w * 0.76, h * 0.5); }
    else { g.moveTo(w * 0.86, h * 0.18); g.lineTo(w * 0.96, h * 0.5); g.lineTo(w * 0.9, h * 0.5); g.lineTo(w * 0.9, h * 0.84); g.lineTo(w * 0.82, h * 0.84); g.lineTo(w * 0.82, h * 0.5); g.lineTo(w * 0.76, h * 0.5); }
    g.closePath(); g.fill();
  });
  atlas.place2(sNum, cw(80, -0.5, 52), CHART_YAW, 36, 8);
  for (const u of [66, 94]) { const p = cw(u, -1.2, 0); pole(p[0], p[2], W - 2, 48, 0.4); }
  const sAth = atlas.add(512, 140, signDraw('ALL-TIME HIGH', { bg: '#ffd23c', fg: '#1a1d29', size: 96, lines: 1 }));
  { const p = cw(STEP + 21 * STEP, RAIL_V, 0); pole(p[0], p[2], peakY - 0.4, peakY + 11, 0.2); atlas.place2(sAth, cw(STEP + 21 * STEP + 6.4, RAIL_V, peakY + 8.6), CHART_YAW, 12.4, 3.4); }
  const sCrash = atlas.add(512, 300, (g, w, h) => { g.fillStyle = '#ffffff'; g.fillRect(0, 0, w, h); g.strokeStyle = '#ef4444'; g.lineWidth = 16; g.strokeRect(8, 8, w - 16, h - 16); fitText(g, '-99%', w / 2, h * 0.56, w * 0.84, 240, F, '#ef4444', { lines: 1 }); });
  { atlas.place2(sCrash, cw(STEP * 25 + 14, 0, 28), CHART_YAW, 20, 11.7); const p = cw(STEP * 25 + 14, -0.4, 0); pole(p[0], p[2], W - 2, 22.2, 0.4); }
  const sDip = atlas.add(768, 220, (g, w, h) => {
    g.fillStyle = '#1a1d29'; g.fillRect(0, 0, w, h); fitText(g, 'BUY THE DIP', w * 0.42, h * 0.54, w * 0.72, 140, F, '#ffd23c', { lines: 1 });
    g.fillStyle = '#ffd23c'; g.beginPath(); g.moveTo(w * 0.86, h * 0.86); g.lineTo(w * 0.97, h * 0.48); g.lineTo(w * 0.9, h * 0.48); g.lineTo(w * 0.9, h * 0.14); g.lineTo(w * 0.82, h * 0.14); g.lineTo(w * 0.82, h * 0.48); g.lineTo(w * 0.75, h * 0.48); g.closePath(); g.fill();
  });
  { atlas.place2(sDip, cw(STEP * 25 + 15, RAIL_V + 3, W + 6), CHART_YAW, 22, 6.3); const p = cw(STEP * 25 + 15, RAIL_V + 2.7, 0); pole(p[0], p[2], W - 2, W + 2.9, 0.35); }
  // the price ticker, the chart's own title board, on two poles
  const tick = C.ledPanel(group, 1024, 352, [{ c: cw(26, 0.45, 30), yaw: CHART_YAW }, { c: cw(26, -0.45, 30), yaw: CHART_YAW + Math.PI }], 26, 8.9);
  for (const u of [15, 37]) { const p = cw(u, 0, 0); pole(p[0], p[2], W - 2, 25.6, 0.45); }

  /* ---- 2. straight ahead of the start: a golden bull with laser eyes ---- */
  const bull = C.laserBull(), BS = 2.4, byaw = yawTo(BULL, { x: 0, z: 0 });
  const by = Math.min(...[[-12, -26], [12, -26], [-12, 26], [12, 26], [0, 0]].map(([a, b]) => sc.y(BULL.x + a * Math.cos(byaw) + b * Math.sin(byaw), BULL.z - a * Math.sin(byaw) + b * Math.cos(byaw)))) - 0.5;
  sc.place(bull, BULL.x, BULL.z, { yaw: byaw, y: by, scale: BS });
  const bo = { x: BULL.x, y: by, z: BULL.z, yaw: byaw, scale: BS };
  // the laser materials, so the lap director can dim them (the beams share two materials)
  const beamMats = [];
  bull.userData.beams.forEach(pv => pv.traverse(o => { if (o.isMesh && !beamMats.some(bm => bm.m === o.material)) beamMats.push({ m: o.material, o: o.material.opacity }); }));
  const sBull = atlas.add(1024, 300, (g, w, h) => { g.fillStyle = '#14161c'; g.fillRect(0, 0, w, h); g.strokeStyle = '#ffbf2e'; g.lineWidth = 10; g.strokeRect(14, 14, w - 28, h - 28); fitText(g, 'THIS IS GOOD FOR BITCOIN', w / 2, h * 0.54, w * 0.88, 150, F, '#ffbf2e'); });
  atlas.place(sBull, toWorld(bo, [0, 3.0, 12.04]), byaw, 16.4, 4.8);
  const sBull2 = atlas.add(1024, 160, signDraw('BULL MARKET (EST. TUESDAY)', { bg: '#14161c', fg: '#ffbf2e', size: 100, lines: 1 }));
  for (const s of [1, -1]) atlas.place(sBull2, toWorld(bo, [s * 5.54, 3.0, 0]), byaw + s * Math.PI / 2, 34, 5.3);

  /* ---- 3. a lifeguard tower in the shallows by turn one, marked HODL, nobody in it ---- */
  {
    const tw = C.lifeguardTower(), yaw = yawTo(TOWER, { x: 25, z: 0 }), y = W - 0.8;
    sc.place(tw, TOWER.x, TOWER.z, { yaw, y }); bake.add(tw);
    const o = { x: TOWER.x, y, z: TOWER.z, yaw };
    const s = atlas.add(768, 360, (g, w, h) => { g.fillStyle = '#ef4444'; g.fillRect(0, 0, w, h); g.fillStyle = '#ffffff'; g.fillRect(14, 14, w - 28, h - 28); fitText(g, 'HODL', w / 2, h * 0.4, w * 0.8, 230, F, '#ef4444', { lines: 1 }); fitText(g, 'LIFEGUARD SOLD THE BOTTOM', w / 2, h * 0.8, w * 0.86, 52, SANS, '#1a1d29', { lines: 1 }); });
    atlas.place2(s, toWorld(o, [0, 10.2, 0.6]), yaw, 9, 4.2);
    const sp = new ModelBuilder(); for (const x of [-2.6, 2.6]) sp.add('p', cyl(0.12, 0.12, 2.0, 6), { p: toWorld(o, [x, 8.6, 0.4]) }); bake.builder(sp, { p: plastic(0xf4f4f0, 0.6) }, false);
  }

  /* ---- 4. the beach club is now the collapsed exchange ---- */
  {
    const o = { x: CLUB.x, y: 2.4, z: CLUB.z, yaw: CLUB.yaw }, face = roadPt(2.5), yaw = yawTo(CLUB, face);
    const s = atlas.add(1024, 300, (g, w, h) => { g.fillStyle = '#ffd23c'; g.fillRect(0, 0, w, h); for (let x = -h; x < w; x += 70) { g.fillStyle = '#1a1d29'; g.beginPath(); g.moveTo(x, h); g.lineTo(x + 35, h); g.lineTo(x + 35 + h * 0.18, h * 0.82); g.lineTo(x + h * 0.18, h * 0.82); g.fill(); g.beginPath(); g.moveTo(x, h * 0.18); g.lineTo(x + 35, h * 0.18); g.lineTo(x + 35 + h * 0.18, 0); g.lineTo(x + h * 0.18, 0); g.fill(); } fitText(g, 'CUSTOMER FUNDS WERE HERE', w / 2, h * 0.5, w * 0.92, 120, F, '#1a1d29'); });
    const c = toWorld(o, [0, 16.5, 0]);
    atlas.place2(s, c, yaw, 20, 5.9);
    for (const d of [-7, 7]) { const p = [c[0] + Math.cos(yaw) * d, c[2] - Math.sin(yaw) * d]; pole(p[0], p[1], 10.5, 13.6, 0.25); }
    // police tape round the whole place
    const tape = new ModelBuilder(), ring = [[-14, -11], [14, -11], [14, 14], [-14, 14], [-14, -11]];
    for (let k = 0; k < 4; k++) {
      const a = toWorld(o, [ring[k][0], 0, ring[k][1]]), b = toWorld(o, [ring[k + 1][0], 0, ring[k + 1][1]]);
      const len = Math.hypot(b[0] - a[0], b[2] - a[2]), ya = Math.atan2(b[0] - a[0], b[2] - a[2]);
      for (let j = 0; j < Math.ceil(len / 5); j++) { const f = j / Math.ceil(len / 5), x = a[0] + (b[0] - a[0]) * f, z = a[2] + (b[2] - a[2]) * f; tape.add('post', cyl(0.07, 0.07, 1.3, 5), { p: [x, sc.y(x, z) + 0.6, z] }); }
      const mid = [(a[0] + b[0]) / 2, (a[2] + b[2]) / 2];
      if (clear(mid[0], mid[1], 0)) tape.add('tape', new THREE.BoxGeometry(0.04, 0.22, len), { p: [mid[0], sc.y(mid[0], mid[1]) + 1.1, mid[1]], r: [0, ya, 0] });
    }
    bake.builder(tape, { post: plastic(0x1a1d29, 0.6), tape: plastic(0xffd23c, 0.6) }, false);
  }

  /* ---- 5. the rug pull: a tent city of investors on a rug, and a speedboat towing it out to sea ---- */
  const rugFx = (() => {
    const NU = 30, NV = 10, bx = RUG.az, bz = -RUG.ax;          // a: along the pull, b: across
    const pos = new Float32Array((NU + 1) * (NV + 1) * 3), uv = [], idx = [], base = [];
    for (let i = 0; i <= NU; i++) for (let j = 0; j <= NV; j++) {
      const s = (i / NU - 0.5) * RUG.L, t = (j / NV - 0.5) * RUG.W, x = RUG.x + RUG.ax * s + bx * t, z = RUG.z + RUG.az * s + bz * t;
      base.push([x, Math.max(W + 0.1, sc.y(x, z)) + 0.12, z, i / NU]); uv.push(j / NV, i / NU);
      if (i < NU && j < NV) { const q = i * (NV + 1) + j; idx.push(q, q + 1, q + NV + 1, q + 1, q + NV + 2, q + NV + 1); }
    }
    base.forEach((b, k) => { pos[k * 3] = b[0]; pos[k * 3 + 1] = b[1]; pos[k * 3 + 2] = b[2]; });
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); geo.setIndex(idx); geo.computeVertexNormals();
    const tex = canvasTex(256, 512, (g, w, h) => {
      g.fillStyle = '#8f1d22'; g.fillRect(0, 0, w, h);
      g.strokeStyle = '#e9b949'; g.lineWidth = 14; g.strokeRect(16, 16, w - 32, h - 32); g.strokeStyle = '#14213d'; g.lineWidth = 10; g.strokeRect(36, 36, w - 72, h - 72);
      g.fillStyle = '#14213d'; g.beginPath(); g.moveTo(w / 2, h * 0.2); g.lineTo(w * 0.8, h / 2); g.lineTo(w / 2, h * 0.8); g.lineTo(w * 0.2, h / 2); g.closePath(); g.fill();
      g.fillStyle = '#e9b949'; g.beginPath(); g.moveTo(w / 2, h * 0.3); g.lineTo(w * 0.68, h / 2); g.lineTo(w / 2, h * 0.7); g.lineTo(w * 0.32, h / 2); g.closePath(); g.fill();
      g.fillStyle = '#8f1d22'; g.beginPath(); g.arc(w / 2, h / 2, 22, 0, 7); g.fill();
      for (let k = 0; k < 8; k++) { g.fillStyle = k % 2 ? '#e9b949' : '#2a6f97'; g.beginPath(); g.arc(w * (k % 2 ? 0.25 : 0.75), h * (0.12 + k * 0.105), 9, 0, 7); g.fill(); }
      g.fillStyle = '#f2e6c8'; for (let x = 0; x < w; x += 8) { g.fillRect(x, 0, 3, 12); g.fillRect(x, h - 12, 3, 12); }
    }, { repeat: false, aniso: 8 });
    const mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ map: tex, roughness: 0.95, side: THREE.DoubleSide }));
    mesh.frustumCulled = false; mesh.receiveShadow = true; group.add(mesh);
    const wave = (k, time) => { const f = base[k][3]; return Math.max(0, Math.sin(f * 11 - time * 3.2)) * (0.25 + f * 1.6); };
    // the tents, riding the waves; the last one is airborne
    const spots = []; for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) spots.push([0.18 + i * 0.27 + (j % 2) * 0.06, 0.2 + j * 0.3]);
    spots.push([1, 0.5]);
    const tents = sc.instances(partsOf(C.tent()), spots.map(() => ({ x: RUG.x, y: 0, z: RUG.z, yaw: 0 })), { tints: C.TENT_TINTS, cast: false });
    for (const m of tents) m.frustumCulled = false;
    const M = new THREE.Matrix4(), Q = new THREE.Quaternion(), E = new THREE.Euler(), S = new THREE.Vector3(2.4, 2.4, 2.4), Pp = new THREE.Vector3();
    const tyaw = Math.atan2(RUG.ax, RUG.az);
    // the speedboat, with its name down the side and on a flag, and the tow rope back to the rug
    const name = canvasTex(1024, 180, (g, w, h) => { g.fillStyle = '#14213d'; g.fillRect(0, 0, w, h); fitText(g, 'TRUST ME BRO CAPITAL', w / 2, h * 0.55, w - 50, 130, F, '#ffd23c', { lines: 1 }); }, { repeat: false });
    const boat = C.speedboat(name, 0xffd23c), byaw2 = tyaw;
    for (const s of [1, -1]) { const f = new THREE.Mesh(new THREE.PlaneGeometry(13, 2.3), new THREE.MeshStandardMaterial({ map: name, roughness: 0.6 })); f.position.set(0, 7.4, -2.5 + s * 0.03); f.rotation.y = s > 0 ? Math.PI / 2 : -Math.PI / 2; f.position.x = s * 0.03; boat.add(f); }
    { const mb = new ModelBuilder(); mb.add('m', cyl(0.12, 0.12, 7.6, 6), { p: [0, 4.6, -2.5] }); boat.add(mb.build({ m: MAT_DARK() })); }
    boat.position.set(BOAT.x, W - 0.4, BOAT.z); boat.rotation.y = byaw2; group.add(boat);
    const end = base[NU * (NV + 1) + NV / 2], stern = [BOAT.x - RUG.ax * 6, W + 0.6, BOAT.z - RUG.az * 6];
    const ropePts = []; for (let k = 0; k <= 12; k++) { const f = k / 12; ropePts.push(new THREE.Vector3(end[0] + (stern[0] - end[0]) * f, end[1] + 0.8 + (stern[1] - end[1] - 0.8) * f + Math.sin(f * Math.PI) * 0.6, end[2] + (stern[2] - end[2]) * f)); }
    bake.geo(plastic(0x3a2a1a, 0.8), new THREE.TubeGeometry(new THREE.CatmullRomCurve3(ropePts), 24, 0.14, 5), false);
    // the sign facing the beach road
    const signAt = { x: RUG.x - RUG.ax * 18 + bx * 4, z: RUG.z - RUG.az * 18 + bz * 4 }, sy = yawTo(signAt, roadPt(3.9));
    const s = atlas.add(1024, 340, (g, w, h) => { g.fillStyle = '#ffffff'; g.fillRect(0, 0, w, h); g.fillStyle = '#ef4444'; g.fillRect(0, 0, w, h * 0.16); g.fillRect(0, h * 0.84, w, h * 0.16); fitText(g, 'RUG PULL', w / 2, h * 0.42, w * 0.9, 170, F, '#1a1d29', { lines: 1 }); fitText(g, 'IN PROGRESS', w / 2, h * 0.7, w * 0.6, 70, SANS, '#ef4444', { lines: 1 }); });
    const syG = sc.y(signAt.x, signAt.z);
    atlas.place2(s, [signAt.x, syG + 8.6, signAt.z], sy, 21, 7);
    for (const d of [-7, 7]) pole(signAt.x + Math.cos(sy) * d, signAt.z - Math.sin(sy) * d, syG - 0.5, syG + 5.4, 0.3);
    return (dt, time) => {
      for (let k = 0; k < base.length; k++) { const b = base[k]; pos[k * 3] = b[0]; pos[k * 3 + 1] = b[1] + wave(k, time); pos[k * 3 + 2] = b[2]; }
      geo.attributes.position.needsUpdate = true; geo.computeVertexNormals();
      spots.forEach(([fs, ft], n) => {
        let x, y, z, rx = 0, rz = 0;
        if (n < spots.length - 1) {
          const i = Math.min(NU, Math.round(fs * NU)), j = Math.round(ft * NV), k = i * (NV + 1) + j, b = base[k], wv = wave(k, time);
          x = b[0]; z = b[2]; y = b[1] + wv; rx = Math.sin(fs * 11 - time * 3.2) * 0.35 * fs; rz = Math.sin(time * 2 + n) * 0.08;
        } else {                                                      // one tent, flung toward the sea
          const ph = (time * 0.42) % 1, d = 6 + ph * 34;
          x = RUG.x + RUG.ax * (RUG.L / 2 + d - 6); z = RUG.z + RUG.az * (RUG.L / 2 + d - 6); y = (W + 0.6) + Math.sin(ph * Math.PI) * 14; rx = ph * 9; rz = ph * 4;
        }
        E.set(rx, tyaw + n * 0.7, rz); Q.setFromEuler(E); M.compose(Pp.set(x, y, z), Q, S);
        for (const m of tents) m.setMatrixAt(n, M);
      });
      for (const m of tents) m.instanceMatrix.needsUpdate = true;
      boat.position.y = W - 0.4 + Math.sin(time * 1.7) * 0.15; boat.rotation.z = Math.sin(time * 1.3) * 0.04; boat.rotation.x = -0.05 + Math.sin(time * 2.1) * 0.02;
    };
  })();

  /* ---- 6. off the pier: the yacht LIQUIDITY, half sunk, and a supercar that finally arrived ---- */
  {
    const y = C.superyacht('LIQUIDITY', { accent: 0x14213d, L: 40, bigName: true });
    y.rotation.set(-0.3, -Math.PI / 2 + 0.25, 0.12, 'YXZ'); y.position.set(LIQ.x, W - 3.4, LIQ.z); group.add(y);
    y.traverse(o => { if (o.isMesh) o.castShadow = false; });
    const car = C.supercar(0xa3e635); car.rotation.set(0.85, Math.atan2(-0.45, -0.9), 0.1, 'YXZ'); car.scale.setScalar(1.5); car.position.set(LAMBO.x, W - 2.6, LAMBO.z); group.add(car); bake.add(car, false);
    const at = { x: LAMBO.x + 6, z: LAMBO.z + 4 }, yaw = yawTo(at, roadPt(7.3));
    const s = atlas.add(768, 240, (g, w, h) => { g.fillStyle = '#a3e635'; g.fillRect(0, 0, w, h); g.strokeStyle = '#1a1d29'; g.lineWidth = 10; g.strokeRect(8, 8, w - 16, h - 16); fitText(g, 'FINALLY GOT THE LAMBO', w / 2, h * 0.53, w * 0.86, 110, F, '#1a1d29'); });
    atlas.place2(s, [at.x, W + 4.2, at.z], yaw, 10, 3.1);
    pole(at.x, at.z, W - 2, W + 2.7, 0.2);
  }

  /* ---- 7. the gas-fee gate at the pier ---- */
  {
    const i = track.indexAtCp(5.63), yaw = Math.atan2(track.tx[i], track.tz[i]), hl = track.hwL[i] + 1.6, hr = track.hwR[i] + 1.6;
    const L = [track.px[i] + track.lx[i] * hl, track.pz[i] + track.lz[i] * hl], R = [track.px[i] - track.lx[i] * hr, track.pz[i] - track.lz[i] * hr], y0 = track.py[i];
    const gb = new ModelBuilder();
    for (const p of [L, R]) gb.add('post', box(1.2, 10.5, 1.2, 0.2, 2), { p: [p[0], y0 + 5.25 - 4, p[1]] });
    const span = Math.hypot(L[0] - R[0], L[1] - R[1]);
    gb.add('beam', box(span + 1.6, 1.0, 1.0, 0.2, 2), { p: [(L[0] + R[0]) / 2, y0 + 6.4, (L[1] + R[1]) / 2], r: [0, yaw, 0] });
    bake.builder(gb, { post: paint(0xffb347, { rough: 0.5 }), beam: paint(0x1fc3c8, { rough: 0.5 }) }, true);
    const s = atlas.add(1024, 220, (g, w, h) => { g.fillStyle = '#1a1d29'; g.fillRect(0, 0, w, h); fitText(g, 'GAS FEES APPLY', w / 2, h * 0.4, w * 0.9, 120, F, '#ffb347', { lines: 1 }); fitText(g, 'CURRENT FEE: ONE KIDNEY', w / 2, h * 0.8, w * 0.8, 56, SANS, '#ffffff', { lines: 1 }); });
    atlas.place2(s, [(L[0] + R[0]) / 2, y0 + 8.5, (L[1] + R[1]) / 2], yaw + Math.PI, Math.min(span, 18), Math.min(span, 18) * 220 / 1024);
  }

  /* ---- 8. outside the final corner: a giant vending machine selling pictures of monkeys ---- */
  {
    const spot = { x: -170, z: -62 }, face = roadPt(15.6), yaw = yawTo(spot, face), vm = C.vendingMachine(), VS = 1.5;   // dead ahead as you come down off the headland
    const y = Math.min(...[[-7, -4], [7, -4], [-7, 4], [7, 4]].map(([a, b]) => sc.y(spot.x + a * Math.cos(yaw) + b * Math.sin(yaw), spot.z - a * Math.sin(yaw) + b * Math.cos(yaw)))) - 0.4;
    sc.place(vm, spot.x, spot.z, { yaw, y, scale: VS }); bake.add(vm);
    const o = { x: spot.x, y, z: spot.z, yaw, scale: VS }, f = vm.userData.face;
    const s = atlas.add(560, 1000, (g, w, h) => {
      g.fillStyle = '#0f172a'; g.fillRect(0, 0, w, h);
      fitText(g, 'NFTs', w / 2, h * 0.08, w * 0.8, 110, F, '#ffd23c', { lines: 1 });
      const cols = ['#7dd3fc', '#fca5a5', '#fde68a', '#a7f3d0', '#c4b5fd', '#fdba74'];
      for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) {
        const x0 = 22 + c * 174, y0 = 170 + r * 196, cw2 = 164, ch = 150;
        g.fillStyle = cols[(r * 3 + c) % cols.length]; g.fillRect(x0, y0, cw2, ch);
        const mx = x0 + cw2 / 2, my = y0 + ch * 0.48;
        g.fillStyle = '#7a4a26'; for (const s2 of [-1, 1]) { g.beginPath(); g.arc(mx + s2 * 44, my - 6, 16, 0, 7); g.fill(); }
        g.beginPath(); g.arc(mx, my - 8, 42, 0, 7); g.fill();
        g.fillStyle = '#e8c49a'; g.beginPath(); g.ellipse(mx, my + 12, 32, 24, 0, 0, 7); g.fill();
        g.fillStyle = '#ffffff'; for (const s2 of [-1, 1]) { g.beginPath(); g.arc(mx + s2 * 15, my - 14, 9, 0, 7); g.fill(); }
        g.fillStyle = '#7a4a26'; for (const s2 of [-1, 1]) g.fillRect(mx + s2 * 15 - 10, my - 24, 20, 10);     // bored, heavy lids
        g.fillStyle = '#1a1d29'; for (const s2 of [-1, 1]) { g.beginPath(); g.arc(mx + s2 * 15, my - 11, 3.5, 0, 7); g.fill(); }
        g.fillRect(mx - 12, my + 22, 24, 3);
        g.fillStyle = '#ffffff'; g.fillRect(x0 + cw2 - 56, y0 + ch - 34, 50, 28); fitText(g, '$4', x0 + cw2 - 31, y0 + ch - 19, 44, 26, SANS, '#16a34a', { lines: 1 });
      }
      fitText(g, 'WAS $400,000', w / 2, h * 0.82, w * 0.86, 72, SANS, '#ffffff', { lines: 1 });
      g.strokeStyle = '#ef4444'; g.lineWidth = 9; g.beginPath(); g.moveTo(w * 0.08, h * 0.83); g.lineTo(w * 0.92, h * 0.81); g.stroke();
      fitText(g, 'NOW $4', w / 2, h * 0.93, w * 0.8, 100, F, '#38ff74', { lines: 1 });
    });
    atlas.place(s, toWorld(o, f.c), yaw, f.w * VS, f.h * VS);
  }

  /* ---- 9. on the headland over the sea cave, a hillside sign everyone can see ---- */
  {
    // two rows on the crown of the rock, facing the climb up the headland; letters stand on scaffold legs
    const yaw = -0.39, fx = Math.sin(yaw), fz = Math.cos(yaw), rx = Math.cos(yaw), rz = -Math.sin(yaw);
    const at2 = (f, r) => ({ x: CAVE.x + fx * f + rx * r, z: CAVE.z + fz * f + rz * r });
    const rows = [['HAVE FUN', at2(-9, -5), 21], ['STAYING POOR', at2(-1, -5), 4.5]];
    const chars = [...new Set('HAVEFUNSTAYINGPOOR')], CW = 128, CH = 256;
    const tex = canvasTex(CW * chars.length, CH, (g, w, h) => {
      g.clearRect(0, 0, w, h); g.textAlign = 'center'; g.textBaseline = 'middle';
      chars.forEach((ch, k) => { g.font = `230px ${SANS}`; g.lineWidth = 14; g.strokeStyle = '#3b3f47'; g.strokeText(ch, k * CW + CW / 2, h / 2 + 10, CW - 6); g.fillStyle = '#ffffff'; g.fillText(ch, k * CW + CW / 2, h / 2 + 10, CW - 14); });
    }, { repeat: false, mip: true });
    const q = new C.Quads(), LW = 5.2, LH = 9, PITCH = 5.7;
    for (const [word, c, lift] of rows) {
      const n = word.length, spots = [...word].map((ch, k) => { const d = (k - (n - 1) / 2) * PITCH, x = c.x + rx * d, z = c.z + rz * d; return { ch, x, z, g: track.terrainHeight(x, z) }; });   // the terrain, not the tunnel road under it
      const base = Math.max(...spots.map(s2 => s2.g)) + 1.5 + lift;
      // front faces spell the words; the backs spell them too, read from behind (mirrored slots, so nothing reads backwards)
      spots.forEach((sp, k) => {
        const back = spots[n - 1 - k].ch, y = Math.max(base, sp.g + 0.5), uv = ch => { const u = chars.indexOf(ch); return [u / chars.length, 0, (u + 1) / chars.length, 1]; };
        if (sp.ch === ' ' && back === ' ') return;
        if (sp.ch !== ' ') q.panel([sp.x, y + LH / 2, sp.z], yaw, LW, LH, uv(sp.ch));
        if (back !== ' ') q.panel([sp.x - fx * 0.06, y + LH / 2, sp.z - fz * 0.06], yaw + Math.PI, LW, LH, uv(back));
        for (const o of [-1.5, 1.5]) pole(sp.x + rx * o - fx * 0.5, sp.z + rz * o - fz * 0.5, sp.g - 1, y + LH * 0.8, 0.14);
      });
    }
    const m = new THREE.Mesh(q.geometry(), new THREE.MeshStandardMaterial({ map: tex, alphaTest: 0.5, roughness: 0.6, emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: 0.25 }));
    m.matrixAutoUpdate = false; m.castShadow = sc.shadows; group.add(m);
  }

  /* ---- 10. banner planes over the bay ---- */
  const planes = [['NOT FINANCIAL ADVICE', 0xef4444, 46, 1, 0], ['DM ME FOR SIGNALS', 0x1fc3c8, 58, -1, 2.6]].map(([text, col, alt, dir, ph]) => {
    const p = C.bannerPlane(col), tex = canvasTex(1024, 168, (g, w, h) => { g.fillStyle = '#ffffff'; g.fillRect(0, 0, w, h); g.fillStyle = '#ef4444'; g.fillRect(0, 0, 18, h); fitText(g, text, w / 2 + 9, h * 0.55, w - 70, 130, F, '#1a1d29', { lines: 1 }); }, { repeat: false });
    const mat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.7 });
    for (const s of [1, -1]) { const b = new THREE.Mesh(new THREE.PlaneGeometry(30, 4.9), mat); b.rotation.y = s * Math.PI / 2; b.position.set(s * 0.04, -1.2, -18 - 15); p.add(b); }
    group.add(p);
    return { p, alt, dir, ph };
  });

  /* ---- 11. the boards ---- */
  const frame = P.billboard(null, { w: 15, h: 5, legs: 6, frame: 0x2a1b10 }); frame.remove(frame.children[frame.children.length - 1]);
  BOARDS.forEach(([cp, side, off, text, bg, fg]) => {
    const p = sc.beside(cp, side, off); if (p.y < W + 0.5 || !clear(p.x, p.z, 1)) return;
    const i = p.i, fx = Math.sin(p.yaw) - 0.75 * track.tx[i], fz = Math.cos(p.yaw) - 0.75 * track.tz[i], yaw = Math.atan2(fx, fz);   // turned a little toward oncoming karts
    const f = frame.clone(); sc.place(f, p.x, p.z, { yaw }); bake.add(f);
    const r = atlas.add(768, 256, (g, w, h) => {
      g.fillStyle = bg; g.fillRect(0, 0, w, h);
      fitText(g, text, w / 2 + 3, h / 2 + 7, w - 56, 110, F, 'rgba(0,0,0,0.25)', { maxH: h * 0.9 }); fitText(g, text, w / 2, h / 2 + 4, w - 56, 110, F, fg, { maxH: h * 0.9 });
      g.strokeStyle = 'rgba(255,255,255,0.5)'; g.lineWidth = 6; g.strokeRect(8, 8, w - 16, h - 16);
    });
    atlas.place(r, [p.x + Math.sin(yaw) * 0.02, p.y + 8.5, p.z + Math.cos(yaw) * 0.02], yaw, 15, 5);
  });

  /* ---- 12. the start: a sponsor over the gantry, banners on the stands, signs in the crowd ---- */
  {
    const s = atlas.add(1024, 150, signDraw('SPONSORED BY TRUST ME BRO CAPITAL', { bg: '#14213d', fg: '#ffd23c', size: 90, lines: 1 }));
    atlas.place2(s, [gantryAt.x, gantryAt.roadY + 11.4, gantryAt.z], gantryAt.along, 18, 2.64);
    const lines = ['EXIT LIQUIDITY SECTION', 'BAGHOLDERS ONLY'].map((t, k) => atlas.add(1024, 80, signDraw(t, { bg: k ? '#1fc3c8' : '#ffd23c', fg: '#14213d', font: SANS, size: 60, lines: 1 })));
    standSpots.forEach((o, k) => atlas.place(lines[k % 2], toWorld(o, [0, 6.75, -8.28]), o.yaw, 28, 2.2));
    const crowd = CROWD.map((t, k) => atlas.add(256, 150, signDraw(t, { bg: ['#ffffff', '#ffd23c', '#38ff74', '#ff9ab0', '#7fd0ff'][k % 5], fg: '#1a1d29', size: 64, border: '#1a1d29' })));
    const sticks = new ModelBuilder();
    seats.forEach((st, k) => {
      if (rng() > 0.2) return;
      const yaw = st.yaw + rng.range(-0.15, 0.15);
      atlas.place(crowd[k % crowd.length], [st.x, st.y + 1.95, st.z], yaw, 1.4, 0.82, rng.range(-0.1, 0.1));
      sticks.add('s', cyl(0.025, 0.025, 0.8, 4), { p: [st.x, st.y + 1.3, st.z] });
    });
    bake.builder(sticks, { s: plastic(0x8a5a36, 0.8) }, false);
  }

  bake.builder(posts, { pole: plastic(0x2a2d36, 0.5, 0.3) }, false);

  /* ---- motion: the rocket rides the chart, the ticker follows it, lasers sweep, planes circle ---- */
  const T = { s: 0, v: 9, wait: 0, splashed: false, shown: '', t: 0, peak: false };
  const Zf = new THREE.Vector3(0, 0, 1), Qr = new THREE.Quaternion();
  const priceOf = y => 69420 * Math.pow(Math.min(1, Math.max(1e-4, (y + 4) / (peakY + 4))), 2.2);
  const p0 = priceOf(spine.getPointAt(0).y);
  const fmt = n => n >= 100 ? Math.round(n).toLocaleString('en-US') : n.toFixed(2);
  const drawTicker = (state, price) => tick.draw((g, w, h) => {
    g.fillStyle = '#07090c'; g.fillRect(0, 0, w, h);
    const green = state === 'up' || state === 'ath', col = green ? '#38ff74' : '#ff3b30';
    g.textBaseline = 'middle'; g.textAlign = 'left'; g.font = `bold 58px ${'"Courier New", Courier, monospace'}`; g.fillStyle = '#ffb020'; g.fillText('$COVE / USD', 34, 52);
    g.textAlign = 'right'; g.fillStyle = col; g.fillText(state === 'gone' ? '' : green ? '▲' : '▼', w - 34, 52);
    g.textAlign = 'center';
    if (state === 'gone') {
      g.fillStyle = (Math.floor(performance.now() / 400) % 2) ? '#ff3b30' : '#ffd23c'; fitText(g, 'WITHDRAWALS PAUSED', w / 2, 200, w - 60, 120, SANS, g.fillStyle, { lines: 1 });
    } else {
      g.fillStyle = col; g.font = `bold 150px ${'"Courier New", Courier, monospace'}`; g.fillText('$' + fmt(price), w / 2, 178, w - 50);
      const pct = state === 'down' ? -(1 - price / 69420) * 100 : (price / p0 - 1) * 100;
      g.font = `bold 62px ${SANS}`; g.fillStyle = state === 'ath' ? '#ffd23c' : col;
      g.fillText(state === 'ath' ? 'ALL-TIME HIGH!' : (pct >= 0 ? '+' : '') + (Math.abs(pct) >= 100 ? Math.round(pct).toLocaleString('en-US') : pct.toFixed(1)) + '%', w / 2, 296);
    }
  });
  const fx = view.fx;
  anim.push((dt, time) => {
    rugFx(dt, time);
    // the rocket: a slow climb, a moment of glory, then the cliff
    if (T.wait > 0) { T.wait -= dt; if (T.wait <= 0) { T.s = 0; T.v = 9; T.splashed = false; rocket.visible = true; } }
    else {
      const sPeak = peakT * railLen;
      if (T.s < sPeak) T.v = 9; else T.v = Math.min(60, T.v + dt * 28);
      T.s = Math.min(railLen, T.s + T.v * dt);
      const t = Math.min(0.9995, Math.max(0, T.s / railLen || 0)), p = spine.getPointAt(t), tg = spine.getTangentAt(t);
      rocket.position.set(p.x, p.y + 1.5, p.z); rocket.quaternion.copy(Qr.setFromUnitVectors(Zf, tg));
      if (!T.splashed && p.y < W + 0.5) {
        T.splashed = true;
        for (let k = 0; k < 60; k++) { const a = Math.random() * 6.283, sp = 3 + Math.random() * 7; fx.smoke.emit({ x: p.x, y: W + 0.3, z: p.z, vx: Math.cos(a) * sp, vy: 8 + Math.random() * 12, vz: Math.sin(a) * sp, color: [0.95, 0.97, 1], size: 2 + Math.random() * 2.5, grow: 2, drag: 0.5, gravity: 14, life: 1.6, alpha: 0.9 }); }
      }
      if (T.s >= railLen) { rocket.visible = false; T.wait = 2.6; }
    }
    // the ticker follows the rocket's height — until the laps get to it (#121)
    T.t += dt;
    if (T.t > 0.12) {
      T.t = 0;
      if (view.finalLap) {
        // the crash: the ticker freezes at -99% and never ticks again
        if (T.shown !== 'crash99') { T.shown = 'crash99'; drawTicker('down', 694.2); }
      } else if ((view.showLap || 1) >= 2 && Math.floor(time * 8.3) % 4 === 0) {
        // lap 2, the wobble: every fourth tick the ticker stutters red with a number nobody believes
        const key = 'wob' + Math.floor(time * 8.3);
        if (key !== T.shown) { T.shown = key; drawTicker('down', 69420 * (0.2 + 0.05 * (Math.floor(time * 8.3) * 37 % 10))); }
      } else {
        const y = rocket.position.y - 1.5, sPeak = peakT * railLen, price = priceOf(y);
        const state = T.wait > 0 ? 'gone' : T.s >= sPeak - 3 && T.s < sPeak + 6 ? 'ath' : T.s > sPeak ? 'down' : 'up';
        const key = state + (state === 'gone' ? Math.floor(time / 0.4) : fmt(price));
        if (key !== T.shown) { T.shown = key; drawTicker(state, price); }
      }
    }
    // the bull sweeps its lasers across the sky over the start
    bull.userData.beams.forEach((b, k) => { b.rotation.y = Math.sin(time * 0.55 + k * 0.3) * 0.32 + (k ? -0.04 : 0.04); b.rotation.x = -0.24 + Math.sin(time * 0.8) * 0.06; });
    // #121: the lasers stutter and dim on lap 2, and go out with the bull market on the last
    const laserLv = view.finalLap ? 0 : (view.showLap || 1) >= 2 ? 0.3 + 0.25 * Math.abs(Math.sin(time * 11)) + 0.15 * Math.abs(Math.sin(time * 23.7)) : 1;
    for (const bm of beamMats) bm.m.opacity = bm.o * laserLv;
    // banner planes circling the bay
    for (const pl of planes) {
      const a = time * 0.05 * pl.dir + pl.ph, R = 175;
      pl.p.position.set(60 + Math.cos(a) * R, pl.alt + Math.sin(time * 0.4 + pl.ph) * 1.5, 170 + Math.sin(a) * R);
      pl.p.rotation.set(0, Math.atan2(-Math.sin(a) * pl.dir, Math.cos(a) * pl.dir), -0.12 * pl.dir);
    }
  });

  /* ---- #121: the crash director — on the final lap the whole candle run keels over into the
         sea, every green candle turns red, the sign admits defeat, and the golden sky goes stormy.
         Lap 2 only wobbles (ticker, yachts, lasers, above); this is the part nobody can miss. ---- */
  const STORM = { zenith: 0x2c333e, horizon: 0x6e7880, ground: 0x565e63, sun: 0x9aa4ae, cloud: 0x878f99, cloudShade: 0x363d46, cloudCover: 0.96, fog: 0x68727c, fogNear: 55, fogFar: 500,
    sunLight: 0xaebac6, sunIntensity: 1.5, hemiSky: 0x6d7a89, hemiGround: 0x41454a, hemiIntensity: 0.9, exposure: 0.9, panoTint: [0.52, 0.56, 0.62] };
  const crashAxis = new THREE.Vector3(-CHART.dz, 0, CHART.dx).normalize();   // the chart's facing axis: the run tips over sideways into the bay
  const cGreen = new THREE.Color(0x22c55e), cRed = new THREE.Color(0xef4444);
  const D = { t: 0, splashed: false, flipped: false };
  anim.push(dt => {
    D.t += ((view.finalLap ? 1 : 0) - D.t) * Math.min(1, dt * 0.5);
    if (D.t <= 0.001) return;
    const e = D.t * D.t * (3 - 2 * D.t);   // smoothstep: the keel starts slow, commits, settles
    candleGrp.quaternion.setFromAxisAngle(crashAxis, -0.52 * e);
    candleGrp.position.y = PIV[1] - 1.6 * e;
    greenMat.color.copy(cGreen).lerp(cRed, e); greenMat.emissive.copy(cGreen).lerp(cRed, e);
    ctx.gfx.shiftSky(STORM, Math.min(1, D.t * 1.15));
    if (!D.flipped && D.t > 0.25) { D.flipped = true; numDown = true; atlas.paint(); }   // one canvas repaint, on the lap change only
    if (!D.splashed && D.t > 0.55) {
      D.splashed = true;
      for (const u of [STEP + 18 * STEP, STEP + 21 * STEP, STEP + 24 * STEP]) {
        const p = cw(u, 0, 0);
        for (let k = 0; k < 40; k++) { const a = Math.random() * 6.283, sp = 3 + Math.random() * 8; fx.smoke.emit({ x: p[0], y: W + 0.4, z: p[2], vx: Math.cos(a) * sp, vy: 9 + Math.random() * 13, vz: Math.sin(a) * sp, color: [0.95, 0.97, 1], size: 2.4 + Math.random() * 3, grow: 2, drag: 0.5, gravity: 14, life: 1.8, alpha: 0.9 }); }
        fx.burst(p[0], W + 1.5, p[2], 26, [0.85, 0.93, 1], 13, 0.6, 0.5, 4);
      }
    }
  });

  return { flush() { bake.flush(); atlas.flush(); } };
}
const MAT_DARK = () => plastic(0x23252c, 0.55, 0.3);
