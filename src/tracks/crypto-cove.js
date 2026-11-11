/* Crypto Cove: the third stop of the first cup. A golden-hour tax-haven bay:
   a seafront promenade, a sweep across the beach, a long wooden pier out over
   the water with a jump back to land, a climb over the rocky headland through
   a sea cave, and a fast run back down to the promenade. */
import { fbm, smoothstep } from '../core/util.js';

import { Scenery, partsOf } from '../render/scenery.js';
import * as P from '../models/props.js';
import * as C from '../models/props-crypto-cove.js';
import { bannerTexture, canvasTex } from '../render/textures.js';

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
const ADS = ['TO THE MOON', 'NUMBER GO UP', 'HODL', 'NOT FINANCIAL ADVICE', 'RUG PULL RUGS', 'WAGMI WATER', 'DIAMOND HANDS', 'GAS FEES APPLY', 'OFFSHORE AND ON TRACK', 'BUY THE DIP', 'STABLE-ISH COIN', 'PROOF OF STEAK', 'FEW UNDERSTAND', 'LAMBO SOON'];

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
  tagline: 'Not your keys, not your kart.',
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
  models: { crab: () => C.crab(), chest: () => C.chest(), buoy: () => C.buoy() },
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
  const keepOut = [{ x: CLUB.x, z: CLUB.z, r: 17 }, { x: LIGHT.x, z: LIGHT.z, r: 14 }];
  const clear = (x, z) => keepOut.every(o => (o.x - x) ** 2 + (o.z - z) ** 2 > o.r * o.r);

  // start/finish gantry and grandstands on the land side of the promenade
  const g0 = sc.beside(0, 1, -track.hwL[0]);
  const gantry = P.gantry(track.hwL[0] + track.hwR[0] + 1.5, 'CRYPTO COVE', { color: 0x1fc3c8, color2: 0xffb347 });
  sc.place(gantry, g0.x, g0.z, { yaw: g0.along, y: g0.roadY });
  view.startLights = gantry.userData.lights;
  const stand = P.grandstand({ w: 30, rows: 6, color: 0xff6a3d }), stand2 = P.grandstand({ w: 30, rows: 6, color: 0x1fc3c8 });
  const seats = [];
  const M = new THREE.Matrix4(), V = new THREE.Vector3();
  const putStand = (proto, p) => {
    const g = proto.group.clone(); sc.place(g, p.x, p.z, { yaw: p.yaw, y: track.py[p.i] - 0.3 });
    g.updateMatrixWorld(true); M.copy(g.matrixWorld);
    for (const s of proto.seats) if (rng() < 0.82) { V.set(s[0], s[1], s[2]).applyMatrix4(M); seats.push({ x: V.x, y: V.y, z: V.z, yaw: p.yaw + rng.range(-0.4, 0.4) }); }
  };
  sc.along({ from: 18.3, to: 0.95, side: 1, offset: 6.5, spacing: 36 }).forEach((p, i) => putStand(i % 2 ? stand2 : stand, p));
  sc.instances(partsOf(P.spectator()), seats, { scale: [0.95, 1.2], tints: P.CROWD_TINTS, cast: false });

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
    const club = C.beachClub('THE EXCHANGE');
    sc.place(club, CLUB.x, CLUB.z, { yaw: CLUB.yaw, y: 2.4 });
  }

  // superyachts moored in the bay, bobbing gently
  const yachts = [
    ['LIQUIDITY', 40, 125, 0.5, 0x14213d], ['NUMBER GO UP', -20, 205, -0.9, 0x1fc3c8], ['HODL ON', 20, 250, 1.4, 0xff6a3d],
    ['COLD WALLET', 70, 385, 0.25, 0x7b5cff], ['TAX EXEMPT', 255, 330, -1.1, 0xffb347],
  ].map(([name, x, z, yaw, accent], i) => {
    const L = 36 + (i % 3) * 4, y = C.superyacht(name, { accent, L });
    const ok = [-1, 0, 1].every(f => track.terrainHeight(x + Math.sin(yaw) * f * L * 0.5, z + Math.cos(yaw) * f * L * 0.5) < W - 2.5);
    if (!ok) return null;
    y.position.set(x, W - 0.7, z); y.rotation.y = yaw; ctx.group.add(y);
    y.traverse(o => { if (o.isMesh) o.castShadow = sc.shadows; });
    return { y, base: W - 0.7, ph: i * 1.3 };
  }).filter(Boolean);
  anim.push((dt, time) => yachts.forEach(({ y, base, ph }) => { y.position.y = base + Math.sin(time * 0.7 + ph) * 0.18; y.rotation.z = Math.sin(time * 0.55 + ph) * 0.02; y.rotation.x = Math.sin(time * 0.43 + ph * 2) * 0.012; }));
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

  // big billboards where you are looking anyway
  [[1.2, 1, 24], [3.0, 1, 30], [11.2, 1, 22], [12.6, -1, 22], [14.6, 1, 22], [16.2, -1, 24], [17.2, 1, 24]].forEach(([at, side, off], i) => {
    const p = sc.beside(at, side, off); if (p.y < W + 0.5) return;
    const tex = bannerTexture([ADS[(i * 5) % ADS.length]], i + 11); tex.repeat.set(0.25, 1);
    sc.place(P.billboard(tex, { w: 15, h: 5, legs: 6, frame: 0x2a1b10 }), p.x, p.z, { yaw: p.yaw + rng.range(-0.15, 0.15) });
  });

  // life in the sky
  const cols = [[0xff6a3d, 0xffd23c], [0x1fc3c8, 0xffffff], [0xff4d8d, 0xffd23c], [0x7b5cff, 0xffb347], [0x2ee6a6, 0xffffff]];
  const cx = track.bounds.cx, cz = track.bounds.cz;
  const balloons = cols.map((c, i) => { const b = P.balloon(c); const a = (i / cols.length) * Math.PI * 2 + 0.9, r = 260 + (i % 2) * 80; b.position.set(cx + Math.cos(a) * r, 60 + i * 8, cz + Math.sin(a) * r); b.scale.setScalar(1.4 + (i % 3) * 0.3); ctx.group.add(b); return b; });
  const ship = P.blimp('TO THE MOON', { accent: 0x1fc3c8 }); ship.scale.setScalar(1.25); ctx.group.add(ship);
  anim.push((dt, time) => {
    balloons.forEach((b, i) => { b.position.y += Math.sin(time * 0.4 + i * 1.7) * dt * 0.8; b.rotation.y += dt * 0.05; });
    const a = time * 0.03; ship.position.set(cx + Math.cos(a) * 170, 80 + Math.sin(time * 0.3) * 2, cz + Math.sin(a) * 150); ship.rotation.y = -a;
  });
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
