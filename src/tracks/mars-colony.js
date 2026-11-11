/* Mars Colony: the third stop of the second cup. A billionaire's half-built
   colony on a rust plateau: Main Street between the habitat domes, a glass
   airlock tube, a climb along the canyon rim, the long low-gravity jump across
   the canyon, a banked bowl inside a crater with a rim hop, and a fast S-bend
   through the solar field back home. */
import { fbm, ridged, smoothstep } from '../core/util.js';
import { Scenery, partsOf } from '../render/scenery.js';
import { makeGroundHit, EDGE } from '../track/track.js';
import * as P from '../models/props.js';
import * as M from '../models/props-mars-colony.js';
import { bannerTexture } from '../render/textures.js';

/* The canyon the jump crosses: a winding cut along the east side of the rim road. */
const CANYON = [[330, -10], [270, -100], [242, -165], [240, -215], [258, -262], [260, -320], [216, -371], [176, -392], [148, -386]];
const CRATER = { x: 176, z: -470, r: 62 };     // crater bowl; the road circles its inside
const COLONY = { x: 10, z: -40, r: 150 };      // plateau the colony stands on
const ROCKET = { x: 158, z: -300 };            // launch pad on the rim mesa, beside the run-up
const EARTH = { x: 300, y: 165, z: -1060 };    // hangs in the sky ahead of the jump

function canyonDist(x, z) {
  let d = Infinity, t = 0, acc = 0, total = 0;
  for (let i = 0; i < CANYON.length - 1; i++) total += Math.hypot(CANYON[i + 1][0] - CANYON[i][0], CANYON[i + 1][1] - CANYON[i][1]);
  for (let i = 0; i < CANYON.length - 1; i++) {
    const [ax, az] = CANYON[i], [bx, bz] = CANYON[i + 1], ex = bx - ax, ez = bz - az, len = Math.hypot(ex, ez);
    const u = Math.max(0, Math.min(1, ((x - ax) * ex + (z - az) * ez) / (len * len)));
    const dd = Math.hypot(x - ax - ex * u, z - az - ez * u);
    if (dd < d) { d = dd; t = (acc + u * len) / total; }
    acc += len;
  }
  return { d, t };
}

export default {
  id: 'mars-colony',
  name: 'Mars Colony',
  tagline: 'The commute is murder. The jumps are worth it.',
  laps: 3,
  width: 18,
  sky: 'mars',
  skyOverrides: { fogNear: 150, fogFar: 980 },
  backdrop: { img: 'assets/backdrops/mars-colony.webp', top: 26, bottom: -8, rot: 0.3 },
  gravity: 0.55,
  offroad: 'dust',
  defaults: { edge: 'open', shoulder: 3.5, outer: 11 },
  path: [
    { p: [0, 18, 0] },                 // 0 start/finish on Main Street, heading +x
    { p: [72, 18, 0] },                // 1
    { p: [128, 18, -16] },             // 2 into the airlock tube
    { p: [156, 18.5, -58] },           // 3 gentle drift inside the tube
    { p: [160, 19.5, -108] },          // 4 out of the tube onto the rim road
    { p: [194, 23, -142] },            // 5 rim: right
    { p: [185, 27, -198] },            // 6 left
    { p: [210, 30, -234] },            // 7 right
    { p: [216, 31, -278] },            // 8 run-up
    { p: [216, 31.5, -340], w: 19 },   // 9 ramp and the canyon gap
    { p: [216, 30, -415], w: 19 },     // 10 landing deck
    { p: [216, 28.5, -470], w: 19, bank: 4 }, // 11 into the crater bowl
    { p: [204, 27.5, -498], w: 19, bank: 8 }, // 12
    { p: [176, 26.5, -510], w: 19, bank: 9 }, // 13
    { p: [148, 26, -498], w: 19, bank: 8 }, // 14
    { p: [136, 26, -470], w: 19, bank: 4 }, // 15 bowl exit
    { p: [138, 27, -428] },            // 16 crater rim (hop)
    { p: [102, 24.5, -385] },            // 17 solar field S-bend
    { p: [60, 21.5, -350] },             // 18
    { p: [62, 18, -292] },             // 19
    { p: [20, 15.5, -250] },             // 20
    { p: [-40, 13.5, -215] },            // 21
    { p: [-100, 14.5, -178] },           // 22 left
    { p: [-115, 16.5, -118] },         // 23
    { p: [-110, 17.5, -55] },          // 24 final corner
    { p: [-96, 18, -12] },             // 25
    { p: [-55, 18, 0] },               // 26 Main Street
  ],
  sides: [
    { from: 25.6, to: 1.6, edge: 'wall' },                    // Main Street: walls both sides
    { from: 4.2, to: 8.6, side: 'L', outer: 28, shoulder: 5 }, // plateau side of the rim road
    { from: 4.4, to: 7.45, side: 'R', edge: 'wall' },          // canyon side: barrier
    { from: 7.45, to: 8.05, side: 'R', edge: 'void' },         // a short open drop where the canyon comes closest
    { from: 8.05, to: 8.6, side: 'R', edge: 'wall' },
    { from: 8.75, to: 10.6, edge: 'wall' },                    // launch deck and landing deck
    { from: 21.2, to: 23.1, side: 'L', outer: 34, shoulder: 5, hoarding: false }, // dust cut inside the west corner (needs a boost)
  ],
  zones: [{ from: 25.6, to: 1.6, skin: 'metal' }, { from: 1.6, to: 3.7, skin: 'metal' }, { from: 8.75, to: 10.6, skin: 'metal' }],
  tunnels: [{ from: 1.75, to: 3.6, through: false }],
  bridges: [{ from: 8.75, to: 10.6 }],
  gaps: [{ from: 9.14, to: 9.68 }],
  ramps: [
    { at: 9.0, len: 10, lift: 2.4 },
    { at: 15.75, len: 8, lift: 1.6, lat: -4.5, w: 7 },
  ],
  boosts: [
    { at: 0.5, lat: 0, w: 5 },
    { at: 8.2, lat: 0, w: 6 },
    { at: 8.65, lat: 0, w: 6 },
    { at: 10.2, lat: 0, w: 8, len: 12 },
    { at: 16.8, lat: -2.5, w: 6 },
  ],
  itemRows: [{ at: 2.4 }, { at: 6.1 }, { at: 11.5 }, { at: 17.5 }, { at: 23.0, n: 3 }],
  coins: [
    { from: 0.15, to: 0.45, n: 4, lat: 4 },
    { from: 5.3, to: 5.8, n: 5, lat: [5, -4] },
    ...[[9.2, 4.5], [9.3, 6.2], [9.4, 7.4], [9.5, 8.1], [9.6, 8]].map(([at, air]) => ({ from: at, to: at, n: 1, lat: 0, air })),   // on the arc over the canyon
    { from: 12.4, to: 13.8, n: 6, lat: 5 },
    { from: 16.25, to: 16.6, n: 3, lat: -3 },
    { from: 19.2, to: 19.8, n: 4, lat: [4, -4] },
    { from: 20.3, to: 20.9, n: 4, lat: 4 },
    { from: 21.8, to: 22.4, n: 4, lat: [18, 18] },   // the dust cut
  ],
  obstacles: [
    // rovers crawl across part of Main Street and the solar field road
    { kind: 'patrol', model: 'rover', at: 1.0, lats: [6.2, 8.2], speed: 3.5, effect: 'spin', radius: 1.8 },
    { kind: 'patrol', model: 'rover', at: 20.6, lats: [-8.5, -5], speed: 3, effect: 'spin', radius: 1.8 },
    // dust devils on the outside of the rim road and the crater bowl
    { kind: 'orbit', model: 'dustdevil', at: 5.6, lat: 11.5, orbit: 5, speed: 6, effect: 'spin', radius: 1.6 },
    { kind: 'orbit', model: 'dustdevil', at: 13.3, lat: -10.5, orbit: 5, speed: 6, effect: 'spin', radius: 1.6 },
    // cargo waiting at the airlock
    { kind: 'static', model: 'crate', at: 1.5, lat: 6.6, effect: 'bump' },
    { kind: 'static', model: 'crate', at: 1.62, lat: -6.6, effect: 'bump' },
  ],
  terrain: {
    cell: 3, margin: 220, blend: 22, water: -50,
    fn(x, z) {
      // open rust desert with low rocky relief
      let h = 12 + (fbm(x * 0.006, z * 0.006, 4, 21) - 0.5) * 14 + (ridged(x * 0.012, z * 0.012, 3, 5) - 0.3) * 6;
      // the colony plateau
      const cd = Math.hypot(x - COLONY.x, z - COLONY.z), plat = 1 - smoothstep(COLONY.r * 0.7, COLONY.r * 1.25, cd);
      h = h * (1 - plat) + (17.2 + (fbm(x * 0.03, z * 0.03, 2, 3) - 0.5) * 1.2) * plat;
      // the high rim mesa east of the colony that the rim road climbs
      const rim = smoothstep(110, 170, x) * smoothstep(-110, -170, z) * (1 - smoothstep(-430, -470, z));
      h += rim * (28.5 - h);
      // the crater: raised rim, deep bowl
      const kd = Math.hypot(x - CRATER.x, z - CRATER.z);
      h += (1 - smoothstep(CRATER.r * 0.9, CRATER.r * 1.6, kd)) * smoothstep(CRATER.r * 0.5, CRATER.r * 0.95, kd) * 6 * (1 - rim * 0.8);
      const bowl = 1 - smoothstep(CRATER.r * 0.35, CRATER.r * 0.92, kd);
      h = h * (1 - bowl) + 3 * bowl;
      // mesas and buttes all round the edges
      const ed = Math.hypot((x - 40) * 0.85, (z + 260) * 0.62);
      const mesa = smoothstep(205, 300, ed);
      const rr = ridged(x * 0.006, z * 0.006, 4, 9);
      h += mesa * (18 + rr * 34 + smoothstep(0.45, 0.6, fbm(x * 0.01, z * 0.01, 2, 4)) * 14);
      // the launch pad
      const pad = 1 - smoothstep(18, 34, Math.hypot(x - ROCKET.x, z - ROCKET.z));
      h = h * (1 - pad) + 30.5 * pad;
      // the canyon, cut last so it stays deep
      const c = canyonDist(x, z), fade = 1 - smoothstep(0.9, 1.0, c.t);
      const wall = 13 + (fbm(x * 0.05, z * 0.05, 2, 6) - 0.5) * 6, cut = (1 - smoothstep(wall, wall + 13, c.d)) * fade;
      h = h * (1 - cut) + (1 + (fbm(x * 0.04, z * 0.04, 2, 8) - 0.5) * 3) * cut;
      return h;
    },
  },
  look: {
    road: { base: 0x5a4a48, line: 0xf2efe6, center: false, skin: 'dirt' },
    kerb: [0xf2efe6, 0xc1440e],
    shoulder: 0xc77a4a,
    terrain: { low: 0xb5532a, high: 0xd2713a, dry: 0xc9824a, rock: 0x7a3b22, sand: 0xe0965a, dirt: 0xa64a26 },
    rail: 0xffb347, tunnelLight: 0xbfe6ff, portal: 0xe8ecf2, deck: 0xb9bcc4, wall: 0xf2efe6, wallStripe: 0xc1440e,
    ads: ['MARS: NOW HIRING', 'OCCUPY THIS', 'PLAN B PLANET', 'OXYGEN SOLD SEPARATELY', 'TERRAFORM AND CONDITIONS', 'NO ATMOSPHERE NO PROBLEM', 'RED PLANET RED TAPE', 'ROCKET FUEL LATTE', 'DOME SWEET DOME', 'ONE WAY TICKETS', 'DUST STORM INSURANCE', 'LOW GRAVITY HIGH RENT'],
  },
  CRATER, COLONY,
  models: { rover: M.rover, dustdevil: M.dustdevil },

  /** Dress the course. ctx: { THREE, track, group, gfx, anim, view } */
  decorate(ctx) { dress(ctx); },
};


/* ---------- scenery ---------- */
const PALE_SUITS = [0xf2efe6, 0xe9e4d8, 0xdfe3ea, 0xf6f1e4, 0xe6dccb, 0xffffff, 0xd8dde6, 0xf2d9c4];
const ROCK_TINTS = [0xa64a26, 0x9a4424, 0xb5532a, 0x8e3d20, 0xc0602e];
const BILLBOARDS = ['PLAN B PLANET', 'OXYGEN SOLD SEPARATELY', 'TERRAFORM AND CONDITIONS', 'ONE WAY TICKETS', 'LOW GRAVITY HIGH RENT', 'DOME SWEET DOME', 'RED PLANET RED TAPE'];

function dress(ctx) {
  const { THREE, track, anim, view } = ctx, sc = new Scenery(ctx), rng = sc.rng;
  const hit = makeGroundHit(), V = new THREE.Vector3(), Mx = new THREE.Matrix4();
  const near = (x, z, p, r) => (x - p.x) ** 2 + (z - p.z) ** 2 < r * r;
  /** True when (x,z) is beyond where a kart can drive, by margin m. */
  const clear = (x, z, m = 1.5) => {
    const g = track.ground(x, z, -1, hit), i = g.i;
    if (g.onRoad) return false;
    if (track.bridge[i] && Math.abs(g.lat) < Math.max(track.hwL[i], track.hwR[i]) + 6) return false;
    const edge = g.side > 0 ? g.edgeL : g.edgeR;
    if (edge !== EDGE.OPEN) return g.outside > m + 0.8;
    return g.outside > (g.side > 0 ? track.outerL[i] : track.outerR[i]) + m;
  };
  const taken = [];                       // footprints of the big things, so scattered props keep off them
  const free = (x, z, r = 0) => !taken.some(t => near(x, z, t, t.r + r));
  const take = (x, z, r) => taken.push({ x, z, r });
  take(ROCKET.x, ROCKET.z, 26); take(CRATER.x, CRATER.z, 16);

  // ---- start/finish on Main Street: gantry, grandstands, a pale-suited crowd ----
  const g0 = sc.beside(0, 1, -track.hwL[0]);
  const gantry = P.gantry(track.hwL[0] + track.hwR[0] + 1.5, 'MARS COLONY', { color: 0xc1440e, color2: 0xf2efe6 });
  sc.place(gantry, g0.x, g0.z, { yaw: g0.along, y: g0.roadY });
  view.startLights = gantry.userData.lights;
  const stand = P.grandstand({ w: 30, rows: 6, color: 0xc1440e }), stand2 = P.grandstand({ w: 30, rows: 6, color: 0xf2efe6 });
  const seats = [];
  const putStand = (proto, p) => {
    const g = proto.group.clone(); sc.place(g, p.x, p.z, { yaw: p.yaw, y: p.y }); take(p.x, p.z, 20);
    g.updateMatrixWorld(true); Mx.copy(g.matrixWorld);
    for (const s of proto.seats) if (rng() < 0.82) { V.set(s[0], s[1], s[2]).applyMatrix4(Mx); seats.push({ x: V.x, y: V.y, z: V.z, yaw: p.yaw + rng.range(-0.4, 0.4) }); }
  };
  sc.along({ from: 25.75, to: 1.2, side: -1, offset: 6.5, spacing: 34 }).forEach((p, i) => putStand(i % 2 ? stand2 : stand, p));
  sc.instances(partsOf(P.spectator()), seats, { scale: [0.95, 1.2], tints: PALE_SUITS, cast: false });
  // lamps and flags down Main Street
  const lamps = sc.along({ from: 25.7, to: 1.6, side: 1, offset: 1.6, spacing: 16 });
  sc.instances(partsOf(M.lampPost()), lamps, {});
  const flags = sc.along({ from: 25.7, to: 1.5, side: 1, offset: 4.5, spacing: 16, phase: 8 });
  sc.instances(partsOf(M.colonyFlag()), flags.map(p => ({ ...p, yaw: p.along + Math.PI / 2 })), {});

  // ---- habitat domes around the colony, linked by glass tubes ----
  const domeSpots = [
    [-30, -40, 11], [12, -46, 13], [58, -40, 9], [92, -72, 10], [-78, -66, 9], [40, -96, 12], [-24, -104, 8],
    [-34, 50, 10], [30, 56, 12], [92, 46, 9], [-96, 30, 8], [118, -118, 8],
  ];
  const domes = domeSpots.filter(([x, z, r]) => clear(x, z, r + 1)).map(([x, z, r]) => { take(x, z, r + 3); return { x, z, r, y: track.terrainHeight(x, z) - 0.2 }; });
  const facing = d => { const i = track.ground(d.x, d.z, -1, hit).i; return Math.atan2(track.px[i] - d.x, track.pz[i] - d.z); };
  const domeS = domes.filter(d => d.r < 10.5), domeL = domes.filter(d => d.r >= 10.5);
  sc.instances(partsOf(M.habitatDome(9, { seed: 3 })), domeS.map(d => ({ x: d.x, y: d.y, z: d.z, yaw: facing(d), sy: 1 })), { scale: [0.9, 1.1] });
  sc.instances(partsOf(M.habitatDome(12, { seed: 5, lit: 0xffc890 })), domeL.map(d => ({ x: d.x, y: d.y, z: d.z, yaw: facing(d) })), { scale: [0.95, 1.1] });
  const link = (a, b) => {
    const dx = b.x - a.x, dz = b.z - a.z, d = Math.hypot(dx, dz), len = d - a.r - b.r + 1.5;
    if (len < 4 || len > 60) return;
    const ux = dx / d, uz = dz / d, sx = a.x + ux * (a.r - 0.8), sz = a.z + uz * (a.r - 0.8);
    for (let k = 0; k <= 6; k++) { const t = k / 6; if (!clear(sx + ux * len * t, sz + uz * len * t, 1)) return; }
    sc.place(M.transitTube(len), sx, sz, { yaw: Math.atan2(ux, uz), y: Math.min(track.terrainHeight(sx, sz), track.terrainHeight(sx + ux * len, sz + uz * len)) - 0.3 });
  };
  const byPos = (x, z) => domes.find(d => d.x === x && d.z === z);
  for (const [a, b] of [[[-30, -40], [12, -46]], [[12, -46], [58, -40]], [[12, -46], [40, -96]], [[-30, -40], [-24, -104]], [[-30, -40], [-78, -66]], [[-34, 50], [30, 56]], [[30, 56], [92, 46]], [[58, -40], [92, -72]]]) {
    const A = byPos(...a), Bd = byPos(...b); if (A && Bd) link(A, Bd);
  }
  // greenhouses and habitat modules between the domes
  const ghSpots = [[-60, -100, 0.3], [80, -110, 1.2], [-6, 86, 0.1], [62, 92, 0.1], [-120, -40, 1.4]].filter(([x, z]) => clear(x, z, 6) && free(x, z, 10));
  ghSpots.forEach(([x, z, yaw]) => { take(x, z, 12); sc.place(M.greenhouse({ len: 22 }), x, z, { yaw, y: track.terrainHeight(x, z) - 0.2 }); });
  const modSpots = sc.scatter({ count: 10, min: 20, max: 90, maxSlope: 0.25, minGap: 22, where: (x, z) => near(x, z, COLONY, COLONY.r * 0.95) && clear(x, z, 4) && free(x, z, 8) });
  modSpots.forEach(p => take(p.x, p.z, 7));
  sc.instances(partsOf(M.habModule()), modSpots, { scale: [0.9, 1.15], yaw: 'random' });

  // ---- the airlock tube: white ribs and a glow strip on the outside of the tunnel shell ----
  {
    const ribs = [], H = track.def.tunnelHeight ?? 7.5;
    let last = -1e9;
    for (let i = 0; i < track.N; i++) {
      if (!track.tunnel[i]) continue;
      const s = i * track.ds; if (s - last < 7) continue; last = s;
      ribs.push({ x: track.px[i], y: track.py[i], z: track.pz[i], yaw: track.yaw[i], half: (track.hwL[i] + track.hwR[i]) / 2 + 1.1 });
    }
    const half = ribs.length ? ribs[0].half : 10;
    const ribGeo = new THREE.TorusGeometry(half, 0.45, 6, 24, Math.PI); ribGeo.scale(1, (H + 0.6) / half, 1);
    const rib = new THREE.Mesh(ribGeo, new THREE.MeshStandardMaterial({ color: 0xf2efe6, roughness: 0.45 }));
    const g = new THREE.Group(); g.add(rib);
    sc.instances(partsOf(g), ribs, {});
  }

  // ---- rim road and canyon: spires on the canyon floor, the launch pad on the mesa ----
  const spireA = partsOf(M.rockSpire(3, { h: 24, r: 5 })), spireB = partsOf(M.rockSpire(8, { h: 34, r: 6 }));
  const spires = [];
  for (let k = 0; k < CANYON.length - 1; k++) {
    const [ax, az] = CANYON[k], [bx, bz] = CANYON[k + 1], len = Math.hypot(bx - ax, bz - az);
    for (let d = 10; d < len; d += 26) {
      const t = d / len, nx = -(bz - az) / len, nz = (bx - ax) / len, side = rng() < 0.5 ? -1 : 1, off = rng.range(3, 9) * side;
      const x = ax + (bx - ax) * t + nx * off, z = az + (bz - az) * t + nz * off;
      if (clear(x, z, 8) && track.terrainHeight(x, z) < 8) spires.push({ x, y: track.terrainHeight(x, z) - 1, z, yaw: rng() * 6.28 });
    }
  }
  sc.instances(spireA, spires.filter((_, i) => i % 2 === 0), { scale: [0.8, 1.2], tints: ROCK_TINTS, sink: 0.5 });
  sc.instances(spireB, spires.filter((_, i) => i % 2 === 1), { scale: [0.8, 1.2], tints: ROCK_TINTS, sink: 0.5 });

  const pad = P.rocketPad({ h: 40 });
  sc.place(pad, ROCKET.x, ROCKET.z, { yaw: 0.9, y: track.terrainHeight(ROCKET.x, ROCKET.z) - 0.1 });
  const rk = pad.userData.rocket; let rt = 18;
  const wp = new THREE.Vector3();
  anim.push((dt) => {
    rt += dt; const cycle = 52, t = rt % cycle;
    if (t < 5) {                                                   // ignition and lift-off
      const up = t < 1.2 ? 0 : Math.pow(t - 1.2, 2.2) * 9;
      rk.position.y = pad.userData.rocketBase + up; rk.visible = true;
      rk.getWorldPosition(wp);
      for (let i = 0; i < view.fx.count(t < 1.2 ? 40 : 90, dt); i++) {
        view.fx.flame(wp.x + rng.range(-1.5, 1.5), wp.y - 1, wp.z + rng.range(-1.5, 1.5), rng.range(-4, 4), -14 - rng() * 10, rng.range(-4, 4), [1, 0.7, 0.25], 4 + rng() * 3, 0.5);
        if (i % 2 === 0) view.fx.dust(wp.x + rng.range(-3, 3), Math.max(31, wp.y - 6), wp.z + rng.range(-3, 3), rng.range(-9, 9), rng.range(-2, 5), rng.range(-9, 9), [0.93, 0.62, 0.42], 7 + rng() * 6, 3.5, 0.55);
      }
    } else if (t < 22) { rk.visible = false; }                    // away
    else { rk.visible = true; rk.position.y = pad.userData.rocketBase; } // rolled back out
  });

  // ---- Earth, small and blue, hanging ahead of the jump ----
  const planet = M.earth(24);
  planet.position.set(EARTH.x, EARTH.y, EARTH.z); ctx.group.add(planet);
  anim.push(dt => { planet.rotation.y += dt * 0.02; });

  // ---- the crater: a lander on the floor, the hiring sign on the rim ----
  sc.place(M.lander({ h: 10 }), CRATER.x + 4, CRATER.z + 2, { yaw: 2.2, y: track.terrainHeight(CRATER.x + 4, CRATER.z + 2) - 0.2 });
  const signP = sc.beside(10.75, -1, 26);
  sc.place(M.hiringSign('MARS: NOW HIRING', { w: 30, h: 7, legs: 7 }), signP.x, signP.z, { yaw: signP.yaw + 0.35, y: signP.y - 0.3 });
  take(signP.x, signP.z, 18);
  const lander2 = sc.beside(19.6, 1, 46);
  if (clear(lander2.x, lander2.z, 8)) { sc.place(M.lander({ h: 8 }), lander2.x, lander2.z, { yaw: 0.6 }); take(lander2.x, lander2.z, 12); }

  // ---- antenna masts with blinking red lights ----
  const mastSpots = [sc.beside(25.0, -1, 28), sc.beside(6.6, 1, 40), sc.beside(14.0, -1, 30), sc.beside(18.2, -1, 36), sc.beside(3.0, 1, 30)].filter(p => clear(p.x, p.z, 3) && free(p.x, p.z, 4));
  const masts = mastSpots.map((p, k) => { const m = M.antennaMast({ h: 16 + (k % 3) * 4 }); sc.place(m, p.x, p.z, { yaw: rng() * 6.28 }); take(p.x, p.z, 5); return m.userData.light; });
  anim.push((dt, time) => masts.forEach((l, k) => { l.emissiveIntensity = Math.sin(time * 3 + k * 1.7) > 0.55 ? 4 : 0.15; }));

  // ---- the solar field: neat rows of panels tilted toward the sun ----
  {
    const yaw = 0.9, ca = Math.cos(yaw), sa = Math.sin(yaw), cx = 40, cz = -330, panels = [];
    for (let u = -170; u <= 170; u += 8) for (let v = -150; v <= 150; v += 7) {
      const x = cx + u * ca + v * sa, z = cz - u * sa + v * ca;
      if (!clear(x, z, 2.5) || !free(x, z, 4)) continue;
      if (track.roadDistance(x, z) > 62 || near(x, z, CRATER, CRATER.r * 1.3) || near(x, z, COLONY, 110)) continue;
      const h = track.terrainHeight(x, z), slope = Math.hypot(track.terrainHeight(x + 3, z) - h, track.terrainHeight(x, z + 3) - h) / 3;
      if (slope > 0.22 || canyonDist(x, z).d < 34) continue;
      panels.push({ x, y: h, z, yaw });
    }
    sc.instances(partsOf(M.solarPanel()), panels, {});
    panels.forEach(p => take(p.x, p.z, 3.5));
  }

  // ---- rocks: boulders everywhere, solid ones around the dust cut, mesas and buttes on the skyline ----
  const bA = partsOf(M.boulder(2, { r: 1.5 })), bB = partsOf(M.boulder(7, { r: 2.2 }));
  const rocks = sc.scatter({ count: 240, min: 13, max: 160, maxSlope: 0.9, minGap: 5, where: (x, z) => clear(x, z, 1.5) && free(x, z, 2) });
  sc.instances(bA, rocks.filter((_, i) => i % 2 === 0), { scale: [0.6, 1.8], yaw: 'random', sink: 0.3, tints: ROCK_TINTS });
  sc.instances(bB, rocks.filter((_, i) => i % 2 === 1), { scale: [0.6, 1.6], yaw: 'random', sink: 0.4, tints: ROCK_TINTS });
  // the dust cut inside the west corner: clusters to thread between
  const cut = [[21.55, 24], [21.75, 31], [21.95, 10.5], [22.2, 27], [22.35, 33], [22.55, 13], [22.75, 22], [22.9, 30]].map(([at, off]) => { const p = sc.beside(at, 1, off); return { x: p.x, y: track.terrainHeight(p.x, p.z), z: p.z, yaw: rng() * 6.28 }; });
  sc.instances(bB, cut, { scale: 1.25, sink: 0.4, tints: ROCK_TINTS, solid: 2.4 });
  // rocks beside the open edges that a kart can reach: solid so they read as real
  const edgeRocks = sc.scatter({ count: 50, min: 12, max: 40, maxSlope: 0.7, minGap: 9, where: (x, z) => { const g = track.ground(x, z, -1, hit); return (g.side > 0 ? g.edgeL : g.edgeR) === EDGE.OPEN && clear(x, z, -0.5) && !clear(x, z, 6) && free(x, z, 3); } });
  sc.instances(bA, edgeRocks, { scale: [1.0, 1.4], yaw: 'random', sink: 0.3, tints: ROCK_TINTS, solid: 1.8 });
  const far = sc.scatter({ count: 34, min: 110, max: 420, maxSlope: 2, minGap: 55, where: (x, z) => free(x, z, 30) && !near(x, z, COLONY, 190) && canyonDist(x, z).d > 40 });
  sc.instances(partsOf(M.mesa(4, { r: 20, h: 20 })), far.filter((_, i) => i % 3 === 0), { scale: [0.8, 1.6], yaw: 'random', tints: ROCK_TINTS, sink: 2 });
  sc.instances(partsOf(M.mesa(9, { r: 13, h: 26 })), far.filter((_, i) => i % 3 === 1), { scale: [0.8, 1.4], yaw: 'random', tints: ROCK_TINTS, sink: 2 });
  sc.instances(spireB, far.filter((_, i) => i % 3 === 2), { scale: [1.0, 1.6], yaw: 'random', tints: ROCK_TINTS, sink: 1 });

  // ---- arrow boards on the outside of every real corner ----
  for (const c of track.corners) {
    const side = c.dir > 0 ? -1 : 1, n = Math.max(2, Math.min(5, Math.round(c.len / 15)));
    for (let k = 0; k < n; k++) {
      const i = (c.i0 + Math.round(((k + 0.6) / n) * (c.len / track.ds))) % track.N;
      if (track.tunnel[i] || track.bridge[i]) continue;
      const p = sc.beside(track.cp[i], side, (side > 0 ? track.outerL[i] : track.outerR[i]) + 1.2);
      const b = P.chevronBoard(0xc1440e); if (c.dir > 0) b.scale.x = -1;
      sc.place(b, p.x, p.z, { yaw: p.yaw, lift: 0.9 }); if (c.dir > 0) b.scale.x = -1;
    }
  }

  // ---- billboards where you are looking anyway ----
  [[1.35, 1, 18], [4.2, -1, 18], [8.3, 1, 30], [11.9, -1, 18], [16.4, 1, 16], [19.9, -1, 18], [23.6, -1, 18]].forEach(([at, side, off], i) => {
    const p = sc.beside(at, side, off), tex = bannerTexture([BILLBOARDS[i]], i + 9);
    tex.repeat.set(0.25, 1);
    sc.place(P.billboard(tex, { w: 15, h: 5, legs: 6, frame: 0x2a2026 }), p.x, p.z, { yaw: p.yaw + rng.range(-0.12, 0.12) });
  });
}

