/* Mars Colony: the third stop of the second cup. A billionaire's half-built
   colony on a rust plateau: Main Street between the habitat domes, a glass
   airlock tube, a climb along the canyon rim, the long low-gravity jump across
   the canyon, a banked bowl inside a crater with a rim hop, and a fast S-bend
   through the solar field back home. */
import { clamp, fbm, ridged, smoothstep } from '../core/util.js';
import { Scenery, partsOf } from '../render/scenery.js';
import { makeGroundHit, EDGE } from '../track/track.js';
import * as P from '../models/props.js';
import * as M from '../models/props-mars-colony.js';
import * as K from '../models/props-burning-circuit.js';   // the sign kit (atlas, baker, boards) lives there
import { ModelBuilder, cyl, box, plastic } from '../models/build.js';

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
  tagline: 'The commute is murder. The oxygen is extra.',
  lapNotes: ['<b>Launch update:</b> departure moved to THE YEAR AFTER.', '<b>Final lap.</b> The rocket is launching. Stand well back.'],
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
    { kind: 'static', model: 'crate', at: 1.5, lat: 5.6, effect: 'bump' },
    { kind: 'static', model: 'crate', at: 1.62, lat: -5.6, effect: 'bump' },
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
    road: { base: 0x34363e, line: 0xf2efe6, center: 0xffb020 },   // cool dark asphalt, so the road reads against the rust
    kerb: [0xf2efe6, 0xc1440e],
    shoulder: 0x7d5a4a,
    terrain: { low: 0xb5532a, high: 0xd2713a, dry: 0xc9824a, rock: 0x7a3b22, sand: 0xe0965a, dirt: 0xa64a26 },
    rail: 0xffb347, tunnelLight: 0xbfe6ff, portal: 0xe8ecf2, deck: 0xb9bcc4, wall: 0xf2efe6, wallStripe: 0xc1440e,
    ads: ['MARS: NOW HIRING', 'OCCUPY THIS', 'PLAN B PLANET', 'OXYGEN SOLD SEPARATELY', 'TERRAFORM AND CONDITIONS', 'NO ATMOSPHERE NO PROBLEM', 'RED PLANET RED TAPE', 'ROCKET FUEL LATTE', 'DOME SWEET DOME', 'ONE WAY TICKETS', 'DUST STORM INSURANCE', 'LOW GRAVITY HIGH RENT'],
  },
  CRATER, COLONY,
  models: { rover: M.robotaxi, dustdevil: M.dustdevil, crate: M.oxyCrate },
  // the opening shot: the rocket on the pad tries to light, hops, and gives up — an aborted ignition, so the real launch (and the bang) is saved for the final lap
  intro: [{ pos: [262, 46, -196], pos1: [252, 52, -212], look: [158, 72, -300], look1: [158, 76, -300], fov: 48, dur: 3.6 }],

  /** Dress the course. ctx: { THREE, track, group, gfx, anim, view } */
  decorate(ctx) { dress(ctx); },
};


/* ---------- scenery ---------- */
const PALE_SUITS = [0xf2efe6, 0xe9e4d8, 0xdfe3ea, 0xf6f1e4, 0xe6dccb, 0xffffff, 0xd8dde6, 0xf2d9c4];
const ROCK_TINTS = [0xa64a26, 0x9a4424, 0xb5532a, 0x8e3d20, 0xc0602e];
const MAT_STICK = plastic(0x6b6f78, 0.6);

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

  // ---- the sign kit: lettering on a shared atlas, static props baked by material ----
  const bake = K.makeBaker(ctx.group, sc.shadows), atlas = K.makeAtlas(ctx.group, { glow: 0.5 });
  /** Yaw that faces the road at sample i from `side`, turned toward oncoming karts by k. */
  const faceIn = (i, side, k = 0.5) => Math.atan2(-side * track.lx[i] - track.tx[i] * k, -side * track.lz[i] - track.tz[i] * k);
  /** A lettered board on legs at (x, z), facing yaw; up is the panel centre above the ground. */
  const signAt = (x, z, yaw, draw, w, h, up, { px = 1024, frame = 0x2a2026, y = null, legs = 2 } = {}) => {
    const y0 = y ?? sc.y(x, z), f = K.signFrame(w, h, up, { color: frame, legs }); sc.place(f, x, z, { yaw, y: y0 }); bake.add(f);
    const r = atlas.add(px, Math.max(48, Math.round(px * h / w)), draw);
    atlas.both(r, [x + Math.sin(yaw) * 0.03, y0 + up, z + Math.cos(yaw) * 0.03], yaw, w, h, 0.42);
    take(x, z, w * 0.55);
    return r;
  };
  /** The same, beside the road at control point `at`, if the spot is clear for its full width. */
  const sign = (at, side, off, draw, w, h, up, opts = {}) => {
    const p = sc.beside(at, side, off), yaw = opts.yaw ?? faceIn(p.i, side, opts.turn ?? 0.5), rx = Math.cos(yaw) * w / 2, rz = -Math.sin(yaw) * w / 2;
    if (!clear(p.x, p.z, 0.5) || !clear(p.x + rx, p.z + rz, 0.5) || !clear(p.x - rx, p.z - rz, 0.5)) return null;
    signAt(p.x, p.z, yaw, draw, w, h, up, opts); return p;
  };
  const RUST_HEX = '#c1440e', INK = '#1f1418', CREAM = '#f2efe6';
  // spots the gags will stand on, kept clear of the domes, rocks, and solar panels
  for (const [at, side, off, r] of [[0.55, 1, 9, 13], [4.3, 1, 32, 10], [7.0, 1, 36, 20], [18.6, -1, 22, 16], [17.6, 1, 20, 12], [24.3, -1, 18, 14], [1.35, 1, 18, 11], [4.2, -1, 18, 11], [8.3, 1, 35, 11], [11.9, -1, 18, 11], [16.4, 1, 18, 11], [19.9, -1, 20, 11], [23.6, -1, 18, 11]]) { const p = sc.beside(at, side, off); take(p.x, p.z, r); }

  // ---- start/finish on Main Street: gantry, grandstands, a pale-suited crowd ----
  const g0 = sc.beside(0, 1, -track.hwL[0]);
  const gantry = P.gantry(track.hwL[0] + track.hwR[0] + 1.5, 'MARS COLONY', { color: 0xc1440e, color2: 0xf2efe6 });
  sc.place(gantry, g0.x, g0.z, { yaw: g0.along, y: g0.roadY });
  view.startLights = gantry.userData.lights;
  {
    const span = track.hwL[0] + track.hwR[0] + 1.5, cx = Math.cos(g0.along), cz = -Math.sin(g0.along), mb = new ModelBuilder();
    for (const sx of [-1, 1]) { const x = sx * (span / 2 + 1.4); mb.add('m', cyl(0.25, 0.25, 5.2, 8), { p: [g0.x + cx * x, g0.roadY + 12.4, g0.z + cz * x] }); }
    mb.add('m', box(span + 4.6, 4.6, 0.3, 0.05, 1), { p: [g0.x, g0.roadY + 12.7, g0.z], r: [0, g0.along, 0] });
    const g = mb.build({ m: plastic(0x2a2026, 0.5) }); ctx.group.add(g); bake.add(g);
    const r = atlas.add(1536, 300, K.board('OCCUPY MARS (LEAVE EARTH ON READ)', { bg: CREAM, fg: INK, stripe: RUST_HEX, size: 150, lines: 1, pad: 0.04 }));
    const yaw = g0.along + Math.PI;
    atlas.both(r, [g0.x + Math.sin(yaw) * 0.18, g0.roadY + 12.7, g0.z + Math.cos(yaw) * 0.18], yaw, span + 4.2, 4.2, 0.36);
  }
  const stand = P.grandstand({ w: 30, rows: 6, color: 0xc1440e }), stand2 = P.grandstand({ w: 30, rows: 6, color: 0xf2efe6 });
  const seats = [], placards = [];
  const putStand = (proto, p) => {
    const g = proto.group.clone(); sc.place(g, p.x, p.z, { yaw: p.yaw, y: p.y }); take(p.x, p.z, 20);
    g.updateMatrixWorld(true); Mx.copy(g.matrixWorld);
    proto.seats.forEach((s, k) => {
      if (rng() >= 0.82) return;
      V.set(s[0], s[1], s[2]).applyMatrix4(Mx); seats.push({ x: V.x, y: V.y, z: V.z, yaw: p.yaw + rng.range(-0.4, 0.4) });
      if (s[2] > -1 && k % 7 === 3) placards.push({ x: V.x, y: V.y, z: V.z, yaw: p.yaw });   // the front row holds up big signs
    });
    bake.add(g);
  };
  sc.along({ from: 25.75, to: 1.2, side: -1, offset: 6.5, spacing: 34 }).forEach((p, i) => putStand(i % 2 ? stand2 : stand, p));
  sc.instances(partsOf(P.spectator()), seats, { scale: [0.95, 1.2], tints: PALE_SUITS, cast: false });
  {
    const CROWD = ['I SOLD MY HOUSE FOR THIS', 'WHERE IS THE AIR?', 'IS THIS THE BETA?', 'I MISS TREES', 'WHEN DO WE GO HOME?', 'SEND OXYGEN'];
    const cols = [CREAM, '#ffd23c', '#7fd0ff', '#ff9ab0'];
    const regions = CROWD.map((t, k) => atlas.add(512, 318, K.board(t, { bg: cols[k % cols.length], fg: INK, size: 120, border: INK, pad: 0.05 })));
    const sticks = new ModelBuilder();
    placards.forEach((s, k) => {
      const y = s.y + 2.6 + (k % 2) * 0.3, fx = Math.sin(s.yaw), fz = Math.cos(s.yaw);
      for (const o of [-1.1, 1.1]) sticks.add('s', cyl(0.06, 0.06, 2.2, 5), { p: [s.x - fx * 0.05 + Math.cos(s.yaw) * o, s.y + 1.3, s.z - fz * 0.05 - Math.sin(s.yaw) * o] });
      atlas.place(regions[k % regions.length], [s.x + fx * 0.1, y, s.z + fz * 0.1], s.yaw, 4.2, 2.6);
    });
    const g = sticks.build({ s: MAT_STICK }); ctx.group.add(g); bake.add(g, false);
  }
  // the countdown board on Main Street, raised clear of the lamps and flags so the punch line reads from the grid.
  // The punch line is a live canvas of its own (like the days counter): NEXT YEAR on lap 1, THE YEAR AFTER from
  // lap 2 on — redrawn only when the lap changes. The back is a finished board, as usual.
  const setCountdown = (() => {
    const p = sc.beside(0.55, 1, 9), yaw = faceIn(p.i, 1, 0.55), w = 22, h = 10, up = 12.5;
    const rx = Math.cos(yaw) * w / 2, rz = -Math.sin(yaw) * w / 2;
    if (!clear(p.x, p.z, 0.5) || !clear(p.x + rx, p.z + rz, 0.5) || !clear(p.x - rx, p.z - rz, 0.5)) return () => {};
    const y0 = sc.y(p.x, p.z), f = K.signFrame(w, h, up, { color: 0x2a2026, legs: 2 }); sc.place(f, p.x, p.z, { yaw, y: y0 }); bake.add(f); take(p.x, p.z, w * 0.55);
    const cv = document.createElement('canvas'); cv.width = 1024; cv.height = 465;
    const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
    const q = new K.Quads(); q.panel([p.x + Math.sin(yaw) * 0.03, y0 + up, p.z + Math.cos(yaw) * 0.03], yaw, w, h, [0, 0, 1, 1]);
    const mesh = new THREE.Mesh(q.geometry(), new THREE.MeshStandardMaterial({ color: 0x000000, map: tex, emissiveMap: tex, emissive: 0xffffff, emissiveIntensity: 1.3, roughness: 0.5 }));
    mesh.matrixAutoUpdate = false; ctx.group.add(mesh);
    { const r = atlas.add(1024, 465, K.board('DEPARTURES: NONE', { bg: INK, fg: CREAM, size: 170, lines: 1 })); atlas.place(r, [p.x - Math.sin(yaw) * 0.39, y0 + up, p.z - Math.cos(yaw) * 0.39], yaw + Math.PI, w, h); }
    const g = cv.getContext('2d');
    return later => {
      g.fillStyle = '#101418'; g.fillRect(0, 0, 1024, 465); g.strokeStyle = RUST_HEX; g.lineWidth = 14; g.strokeRect(7, 7, 1010, 451);
      K.fitText(g, 'COLONISTS ARRIVING:', 512, 65, 922, 66, K.SANS, '#ffb020', { lines: 1 });
      const years = [2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025, 2026];
      years.forEach((y, k) => {
        const cx = 1024 * (0.1 + (k % 5) * 0.2), cy = 465 * (k < 5 ? 0.33 : 0.5);
        K.fitText(g, String(y), cx, cy, 174, 56, K.SANS, '#9aa3ad', { lines: 1 });
        g.strokeStyle = '#ff3b30'; g.lineWidth = 9; g.beginPath(); g.moveTo(cx - 82, cy + 18); g.lineTo(cx + 82, cy - 18); g.stroke();
      });
      if (!later) K.fitText(g, 'NEXT YEAR', 512, 363, 922, 190, K.FONT, '#38ff74', { lines: 1, maxH: 140 });
      else {
        K.fitText(g, 'THE YEAR AFTER', 512, 344, 942, 170, K.FONT, '#ffb020', { lines: 1, maxH: 121 });
        K.fitText(g, '(IT WAS NEXT YEAR LAST YEAR TOO)', 512, 433, 922, 52, K.SANS, '#ff6a2a', { lines: 1 });
      }
      tex.needsUpdate = true;
    };
  })();
  // the big dome sells the air
  {
    const d = { x: 12, z: -46 }, top = track.terrainHeight(d.x, d.z) + 12.6, yaw = -0.5, mb = new ModelBuilder();
    for (const sx of [-6, 6]) mb.add('m', box(0.6, 7, 0.6, 0.1, 1), { p: [d.x + Math.cos(yaw) * sx, top + 2.5, d.z - Math.sin(yaw) * sx] });
    mb.add('m', box(24.6, 10, 0.3, 0.05, 1), { p: [d.x + Math.sin(yaw) * 0.2, top + 9, d.z + Math.cos(yaw) * 0.2], r: [0, yaw, 0] });
    const g = mb.build({ m: plastic(0x2a2026, 0.5) }); ctx.group.add(g); bake.add(g);
    const r = atlas.add(1280, 500, (gg, w, h) => {
      gg.fillStyle = '#ffffff'; gg.fillRect(0, 0, w, h); gg.fillStyle = '#1f6bff'; gg.fillRect(0, 0, w, h * 0.12); gg.fillRect(0, h * 0.88, w, h * 0.12);
      K.fitText(gg, 'OXYGEN: $9.99/MO', w / 2, h * 0.35, w * 0.9, 190, K.FONT, '#1f6bff', { lines: 1 });
      K.fitText(gg, 'AD-FREE AIR: $19.99', w / 2, h * 0.68, w * 0.9, 130, K.FONT, INK, { lines: 1 });
    });
    atlas.both(r, [d.x + Math.sin(yaw) * 0.38, top + 9, d.z + Math.cos(yaw) * 0.38], yaw, 24, 9.4, 0.36);
  }
  // lamps and flags down Main Street
  const board = sc.beside(0.55, 1, 9), inFront = p => p.x > board.x - 45 && p.x < board.x + 14;   // nothing tall between the grid and the countdown board
  const lamps = sc.along({ from: 25.7, to: 1.6, side: 1, offset: 1.6, spacing: 16 }).filter(p => !inFront(p));
  sc.instances(partsOf(M.lampPost()), lamps, {});
  const flags = sc.along({ from: 25.7, to: 1.5, side: 1, offset: 4.5, spacing: 16, phase: 8 }).filter(p => !inFront(p));
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

  // ---- the centrepiece: a megarocket on the pad whose story is the race — lap 1 it cannot get off the ground,
  // lap 2 the engines stay lit and go nowhere, and on the final lap it launches and comes apart ----
  const padY = track.terrainHeight(ROCKET.x, ROCKET.z) - 0.1, MOUNT = 9;
  {
    const tw = M.launchTower({ h: 96 }); sc.place(tw, ROCKET.x - 13, ROCKET.z, { yaw: Math.PI / 2, y: padY }); bake.add(tw);
    const mb = new ModelBuilder();   // the launch mount: a ring table on six legs, with a blast deflector
    for (let k = 0; k < 6; k++) { const a = k * Math.PI / 3; mb.add('leg', box(1.6, MOUNT, 1.6, 0.2, 1), { p: [ROCKET.x + Math.cos(a) * 7, padY + MOUNT / 2, ROCKET.z + Math.sin(a) * 7] }); }
    mb.add('ring', cyl(8.4, 8.4, 1.6, 24), { p: [ROCKET.x, padY + MOUNT - 0.6, ROCKET.z] });
    mb.add('scorch', cyl(13, 15, 0.2, 24), { p: [ROCKET.x, padY + 0.12, ROCKET.z] });
    const g = mb.build({ leg: plastic(0xb8bcc6, 0.7), ring: plastic(0x6b6f78, 0.5, 0.5), scorch: plastic(0x2a1c18, 0.95) }); ctx.group.add(g); bake.add(g);
  }
  const rocket = M.megaRocket({ h: 74 }); sc.place(rocket, ROCKET.x, ROCKET.z, { y: padY + MOUNT, yaw: 0.6 });
  const rocketY = rocket.position.y;
  // debris: a few chunk shapes, three of each, hidden until the bang
  const debris = rocket.userData.chunks.map(([geo, mat]) => { const m = new THREE.InstancedMesh(geo, mat, 3); m.frustumCulled = false; m.visible = false; ctx.group.add(m); return m; });
  const bits = []; debris.forEach((m, k) => { for (let j = 0; j < 3; j++) bits.push({ m, j, p: new THREE.Vector3(), v: new THREE.Vector3(), r: new THREE.Euler(), w: new THREE.Vector3() }); });
  // the banner, and a counter that never gets far
  signAt(173, -276, 0.85, K.board('RAPID UNSCHEDULED DISASSEMBLY', { bg: CREAM, fg: INK, size: 150, stripe: RUST_HEX, sub: '(A SUCCESS)', subFg: '#16a34a', subScale: 0.75 }), 30, 11, 17, { frame: 0x2a2026, legs: 3 });
  const counter = (() => {
    const cv = document.createElement('canvas'); cv.width = 768; cv.height = 384;
    const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
    const x = 176, z = -314, yaw = 1.05, y0 = sc.y(x, z), w = 15, h = 7.5;
    const f = K.signFrame(w, h, 9, { color: 0x2a2026 }); sc.place(f, x, z, { yaw, y: y0 }); bake.add(f); take(x, z, 9);
    const q = new K.Quads(); q.panel([x + Math.sin(yaw) * 0.03, y0 + 9, z + Math.cos(yaw) * 0.03], yaw, w, h, [0, 0, 1, 1]);
    const mesh = new THREE.Mesh(q.geometry(), new THREE.MeshStandardMaterial({ color: 0x000000, map: tex, emissiveMap: tex, emissive: 0xffffff, emissiveIntensity: 1.3, roughness: 0.5 }));
    mesh.matrixAutoUpdate = false; ctx.group.add(mesh);
    { const r = atlas.add(768, 384, K.board('SAFETY THIRD', { bg: '#ffd23c', fg: INK, size: 170, border: INK, lines: 1 })); atlas.place(r, [x - Math.sin(yaw) * 0.39, y0 + 9, z - Math.cos(yaw) * 0.39], yaw + Math.PI, w, h); }
    const g = cv.getContext('2d');
    return n => {
      g.fillStyle = '#07090c'; g.fillRect(0, 0, 768, 384);
      g.fillStyle = '#ffb020'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = 'bold 54px "Arial Black", sans-serif'; g.fillText('DAYS WITHOUT', 384, 62, 720); g.fillText('AN EXPLOSION', 384, 122, 720);
      g.fillStyle = n < 1 ? '#ff3b30' : '#38ff74'; g.font = 'bold 220px "Courier New", monospace'; g.fillText(String(n), 384, 270, 720);
      tex.needsUpdate = true;
    };
  })();
  // the engine plume: one additive cone under the rocket, bright at the nozzle and fading down its length
  const plume = (() => {
    const cv = Object.assign(document.createElement('canvas'), { width: 8, height: 128 }), g2 = cv.getContext('2d');
    const gr = g2.createLinearGradient(0, 128, 0, 0); gr.addColorStop(0, 'rgba(255,244,190,1)'); gr.addColorStop(0.25, 'rgba(255,170,40,0.95)'); gr.addColorStop(0.7, 'rgba(240,70,10,0.6)'); gr.addColorStop(1, 'rgba(160,20,0,0)');
    g2.fillStyle = gr; g2.fillRect(0, 0, 8, 128);
    const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace;
    const geo = new THREE.ConeGeometry(1, 1, 10, 4, true); geo.translate(0, 0.5, 0);
    const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ map: tex, color: new THREE.Color(2.2, 1.7, 1.2), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false }));
    m.rotation.z = Math.PI; m.position.set(ROCKET.x, rocketY, ROCKET.z); m.visible = false; m.frustumCulled = false; m.renderOrder = 6; ctx.group.add(m);
    return m;
  })();
  // the dust column that hangs over the pad once it has blown
  const column = new THREE.Mesh(new THREE.CylinderGeometry(30, 6, 175, 14, 1, true), new THREE.MeshBasicMaterial({ color: 0x4a2c1c, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide, fog: false }));
  column.position.set(ROCKET.x, padY + 88, ROCKET.z); column.renderOrder = 5; ctx.group.add(column);
  // the storm the bang leaves behind: thicker, browner, closer
  const DUST = { zenith: 0x6e3a22, horizon: 0xd98a52, ground: 0xc98a5e, sun: 0xffc9a0, cloud: 0xd9905f, cloudShade: 0x8a4f2c, cloudCover: 0.92, fog: 0xcf8850, fogNear: 45, fogFar: 400, sunLight: 0xffbe8a, sunIntensity: 2.0, hemiSky: 0xe8a878, hemiGround: 0x8a4a30, panoTint: [0.82, 0.6, 0.42] };
  const rst = { mode: '', sputter: 0, lit: 0, tF: 0, tL: -1, boomed: false, tBoom: -1, storm: 0, cd: -1, days: -1 };
  const Mq = new THREE.Matrix4(), Qq = new THREE.Quaternion(), S1 = new THREE.Vector3(1, 1, 1), G = 9.8 * 0.55;
  const boom = () => {
    rst.boomed = true; rst.tBoom = rst.tF; rocket.visible = false; plume.visible = false;
    const cy = rocket.position.y + 32;
    bits.forEach(b => { b.p.set(ROCKET.x + rng.range(-4, 4), cy + rng.range(-25, 25), ROCKET.z + rng.range(-4, 4)); b.v.set(rng.range(-26, 26), rng.range(10, 34), rng.range(-26, 26)); b.r.set(rng() * 6, rng() * 6, rng() * 6); b.w.set(rng.range(-3, 3), rng.range(-3, 3), rng.range(-3, 3)); });
    debris.forEach(m => { m.visible = true; });
    for (let i = 0; i < 170; i++) { const a = rng() * 6.28, e = rng.range(-1, 1), sp = 8 + rng() * 30, yy = cy + rng.range(-30, 30); view.fx.flame(ROCKET.x, yy, ROCKET.z, Math.cos(a) * sp * Math.sqrt(1 - e * e), e * sp, Math.sin(a) * sp * Math.sqrt(1 - e * e), [1, 0.55 + rng() * 0.3, 0.2], 8 + rng() * 7, 0.9 + rng() * 0.6); }
    view.fx.burst(ROCKET.x, cy, ROCKET.z, 240, [1, 0.62, 0.18], 36, 1.4, 2.8, 12);
    view.fx.burst(ROCKET.x, cy, ROCKET.z, 120, [1, 0.95, 0.75], 20, 0.9, 1.8, 6);
    if (view.fx.smoke) for (let i = 0; i < 46; i++) view.fx.smoke.emit({ x: ROCKET.x + rng.range(-10, 10), y: cy + rng.range(-25, 25), z: ROCKET.z + rng.range(-10, 10), vx: rng.range(-6, 6), vy: rng.range(-1, 5), vz: rng.range(-6, 6), color: [0.12, 0.09, 0.08], color2: [0.45, 0.32, 0.26], size: 14 + rng() * 10, grow: 3, drag: 0.4, gravity: -0.2, life: 6 + rng() * 3, alpha: 0.85, fadeIn: 0.03, spin: rng.range(-0.4, 0.4), rot: rng() * 6.28 });
  };
  anim.push((dt, time) => {
    const fx = view.fx, lap = view.showLap || 1, laps = view.race?.laps ?? 3;
    const mode = view.finalLap || lap >= laps ? 'final' : lap >= 2 ? 'lit' : 'vent';
    if (mode !== rst.mode) { rst.mode = mode; if (mode === 'final') rst.tF = 0; }
    // the boards follow the lap; each canvas is redrawn only when what it says changes
    const cd = mode === 'vent' ? 0 : 1;
    if (cd !== rst.cd) { rst.cd = cd; setCountdown(cd); }
    const days = rst.boomed ? 0 : mode === 'vent' ? 2 : 3;
    if (days !== rst.days) { rst.days = days; counter(days); }

    if (mode === 'vent') {
      // lap 1: an aborted ignition, over and over — vent, cough, hop a little, settle back with a sigh.
      // This is also what the opening shot watches, so the real launch is never spent before the race.
      rst.sputter += dt; const c = rst.sputter % 7;
      rocket.visible = true;
      const hop = c > 1.1 && c < 2.6 ? Math.sin((c - 1.1) / 1.5 * Math.PI) * 2.3 : 0;
      rocket.position.y = rocketY + hop;
      rocket.rotation.z = c > 1 && c < 3 ? Math.sin(c * 30) * 0.006 * (3 - c) : 0;
      const cough = c > 0.9 && c < 2.2;
      plume.visible = cough;
      if (cough) { const s = Math.sin((c - 0.9) / 1.3 * Math.PI); plume.position.y = rocket.position.y; plume.scale.set(3.5 * s + 0.01, 11 * s + 0.01, 3.5 * s + 0.01); }
      for (let i = 0, n = fx.count(cough ? 110 : 26, dt); i < n; i++) {
        if (cough && i % 3) fx.flame(ROCKET.x + rng.range(-3, 3), rocketY - 1, ROCKET.z + rng.range(-3, 3), rng.range(-5, 5), -14 - rng() * 8, rng.range(-5, 5), [1, 0.72, 0.3], 4 + rng() * 3, 0.5);
        else fx.dust(ROCKET.x + rng.range(-7, 7), padY + 1.5, ROCKET.z + rng.range(-7, 7), rng.range(-7, 7), rng.range(1, 5), rng.range(-7, 7), [0.93, 0.62, 0.42], 6 + rng() * 5, 2.6, 0.5);
      }
    } else if (mode === 'lit') {
      // lap 2: the engines stay lit and the whole pad rumbles; it just never goes anywhere
      rst.lit = Math.min(1, rst.lit + dt * 0.5);
      rocket.visible = true; rocket.position.y = rocketY; rocket.rotation.z = Math.sin(time * 41) * 0.0035 * rst.lit;
      plume.visible = rst.lit > 0.03; plume.position.y = rocketY;
      const fl = 0.85 + 0.15 * Math.sin(time * 23) + 0.07 * Math.sin(time * 47);
      plume.scale.set(5 * rst.lit, 17 * rst.lit * fl, 5 * rst.lit);
      for (let i = 0, n = fx.count(95 * rst.lit, dt); i < n; i++) {
        if (i % 3) fx.flame(ROCKET.x + rng.range(-3, 3), rocketY - 1, ROCKET.z + rng.range(-3, 3), rng.range(-6, 6), -17 - rng() * 9, rng.range(-6, 6), [1, 0.72, 0.3], 5 + rng() * 4, 0.55);
        else fx.dust(ROCKET.x + rng.range(-9, 9), padY + 1.5, ROCKET.z + rng.range(-9, 9), rng.range(-13, 13), rng.range(0, 5), rng.range(-13, 13), [0.93, 0.62, 0.42], 9 + rng() * 6, 3.2, 0.55);
      }
    } else {
      // the final lap: it launches as the leader comes down the rim road toward the run-up, so the climb and
      // the bang happen where the road faces the pad; a slow field gets the fallback timer instead
      rst.tF += dt;
      const progF = clamp((view.showProgress || 0) * laps - (laps - 1), 0, 1);
      if (!rst.boomed && rst.tL < 0 && (progF >= 0.26 || rst.tF > 25)) rst.tL = 0;
      if (!rst.boomed && rst.tL >= 0) {
        rst.tL += dt; const tL = rst.tL;
        rocket.position.y = rocketY + Math.pow(tL, 2.05) * 4.0;
        rocket.rotation.z = Math.sin(tL * 2.1) * 0.02 * tL + tL * 0.035;
        plume.visible = true; plume.position.y = rocket.position.y;
        const fl = 0.88 + 0.12 * Math.sin(time * 27);
        plume.scale.set(6.5, 30 * fl, 6.5);
        for (let i = 0, n = fx.count(150, dt); i < n; i++) {
          if (i % 3) fx.flame(ROCKET.x + rng.range(-3, 3), rocket.position.y - 1, ROCKET.z + rng.range(-3, 3), rng.range(-6, 6), -19 - rng() * 10, rng.range(-6, 6), [1, 0.72, 0.3], 6 + rng() * 4, 0.6);
          else fx.dust(ROCKET.x + rng.range(-11, 11), padY + 2, ROCKET.z + rng.range(-11, 11), rng.range(-16, 16), rng.range(0, 6), rng.range(-16, 16), [0.93, 0.62, 0.42], 11 + rng() * 7, 3.6, 0.55);
        }
        if (tL >= 9.5) boom();
      }
      if (rst.boomed && rst.tF - rst.tBoom < 9) {                 // the bits come down, and stay down as wreckage
        for (const b of bits) {
          b.v.y -= G * dt; b.p.addScaledVector(b.v, dt);
          if (b.p.y < padY + 0.5) { b.p.y = padY + 0.5; b.v.set(b.v.x * 0.3, 0, b.v.z * 0.3); b.w.multiplyScalar(0.9); }
          b.r.x += b.w.x * dt; b.r.y += b.w.y * dt; b.r.z += b.w.z * dt;
          Mq.compose(b.p, Qq.setFromEuler(b.r), S1); b.m.setMatrixAt(b.j, Mq);
          if (rst.tF - rst.tBoom < 3.5 && fx.count(3, dt)) fx.flame(b.p.x, b.p.y, b.p.z, 0, 2, 0, [1, 0.6, 0.2], 2.5, 0.5);
        }
        debris.forEach(m => { m.instanceMatrix.needsUpdate = true; });
      }
      column.material.opacity += ((rst.boomed ? 0.38 : 0) - column.material.opacity) * Math.min(1, dt * 0.5);
      column.rotation.y = time * 0.05;
    }
    // after the bang the dust closes in for the rest of the race
    rst.storm += ((rst.boomed ? 1 : 0) - rst.storm) * Math.min(1, dt * 0.07);
    if (rst.storm > 0.004) ctx.gfx.shiftSky(DUST, rst.storm * (0.92 + 0.08 * Math.sin(time * 0.7)));
    if (rst.boomed) for (let i = 0, n = fx.count(11, dt); i < n; i++) { const a = rng() * 6.28, d = rng.range(15, 90); fx.dust(ROCKET.x + Math.cos(a) * d, padY + rng.range(2, 14), ROCKET.z + Math.sin(a) * d, rng.range(-9, -3), rng.range(0, 2), rng.range(-3, 3), [0.85, 0.55, 0.34], 10 + rng() * 8, 3.4, 0.5); }
  });

  // ---- Earth, small and blue, hanging ahead of the jump ----
  const planet = M.earth(24);
  planet.position.set(EARTH.x, EARTH.y, EARTH.z); ctx.group.add(planet);
  anim.push(dt => { planet.rotation.y += dt * 0.02; });

  // ---- the crater: a lander on the floor, the hiring sign on the rim ----
  // the founder in the middle of the crater, crowned, pointing at the planet he left
  {
    const yaw = Math.atan2(EARTH.x - CRATER.x, EARTH.z - CRATER.z), st = M.founderStatue({ h: 46, pitch: 0.8 });
    sc.place(st, CRATER.x, CRATER.z, { yaw, y: track.terrainHeight(CRATER.x, CRATER.z) - 0.3 }); st.updateMatrixWorld(true);
    const pl = st.userData.plinth, r = atlas.add(1024, 440, K.board('SELF-APPOINTED EMPEROR OF MARS', { bg: CREAM, fg: INK, size: 150, border: '#e8b923' }));
    for (let k = 0; k < 4; k++) { const a = k * Math.PI / 2, c = new THREE.Vector3(Math.sin(a) * pl.z, pl.y, Math.cos(a) * pl.z).applyMatrix4(st.matrixWorld); atlas.place(r, [c.x, c.y, c.z], yaw + a, pl.w, pl.h); }
    bake.add(st);
  }
  const signP = sc.beside(10.75, -1, 26);
  sc.place(M.hiringSign('NOW HIRING: EXTREMELY HARDCORE', { w: 30, h: 7, legs: 7 }), signP.x, signP.z, { yaw: signP.yaw + 0.35, y: signP.y - 0.3 });
  take(signP.x, signP.z, 18);
  const lander2 = sc.beside(19.6, 1, 46);
  if (clear(lander2.x, lander2.z, 8)) { sc.place(M.lander({ h: 8 }), lander2.x, lander2.z, { yaw: 0.6 }); take(lander2.x, lander2.z, 12); }

  // ---- the rim road: an angular truck nose-down in a crater, and the flag ----
  {
    // a truck four times life size, nose toward the oncoming karts, as close to the road as the runoff allows
    const TS = 4, at7 = (off) => { const q = sc.beside(7.0, 1, off), i = q.i, yw = Math.atan2(-track.tx[i] + 0.35 * track.lx[i], -track.tz[i] + 0.35 * track.lz[i]), f = [Math.sin(yw), Math.cos(yw)], r = [Math.cos(yw), -Math.sin(yw)];
      const pts = [[3, 1.1], [3, -1.1], [-3, 1.1], [-3, -1.1]].map(([u, v]) => [q.x + f[0] * u * TS + r[0] * v * TS, q.z + f[1] * u * TS + r[1] * v * TS]);
      return pts.every(([x, z]) => clear(x, z, 0.5)) ? { ...q, yaw: yw } : null; };
    const p = [32, 34, 36, 38, 40].map(at7).find(Boolean), yaw = p?.yaw;
    if (p) {
      const tr = M.wedgeTruck();
      tr.rotation.order = 'YXZ'; sc.place(tr, p.x, p.z, { yaw, y: p.y - 1.8, scale: TS }); tr.rotation.x = 0.3; tr.rotation.z = 0.08; tr.updateMatrixWorld(true);
      const wdw = tr.userData.window, cw = (x, y, z) => { const v = new THREE.Vector3(x, y, z).applyMatrix4(tr.matrixWorld); return [v.x, v.y, v.z]; };
      // the windscreen, cracked, lettered as a quad on the glass
      const glass = atlas.add(256, 128, (g, w, h) => { g.fillStyle = '#20262e'; g.fillRect(0, 0, w, h); g.strokeStyle = '#e8eef6'; g.lineWidth = 3; const cx = w * 0.42, cy = h * 0.55; for (let k = 0; k < 11; k++) { const a = k * 0.57 + 0.2, l = 40 + (k * 37) % 60; g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx + Math.cos(a) * l * 0.6, cy + Math.sin(a) * l * 0.35); g.lineTo(cx + Math.cos(a + 0.15) * l * 1.6, cy + Math.sin(a + 0.15) * l); g.stroke(); } g.beginPath(); g.arc(cx, cy, 12, 0, 7); g.stroke(); g.beginPath(); g.arc(cx, cy, 26, 0, 7); g.stroke(); });
      const A = [1.2, 2.95], C = [1.95, -0.1], hw2 = wdw.w / 2;
      atlas.quad(glass, cw(-hw2, A[0] + 0.02, A[1] + 0.01), cw(hw2, A[0] + 0.02, A[1] + 0.01), cw(hw2, C[0] + 0.02, C[1] + 0.01), cw(-hw2, C[0] + 0.02, C[1] + 0.01));
      bake.add(tr); take(p.x, p.z, 16);
      const ring = []; for (let k = 0; k < 14; k++) { const a = k / 14 * Math.PI * 2, rr = 13; ring.push({ x: p.x + Math.cos(a) * rr, y: sc.y(p.x + Math.cos(a) * rr, p.z + Math.sin(a) * rr), z: p.z + Math.sin(a) * rr, yaw: a }); }
      sc.instances(partsOf(M.boulder(4, { r: 1.3 })), ring.filter(q => clear(q.x, q.z, 1)), { scale: [1.2, 2.0], sink: 0.5, tints: ROCK_TINTS });
      for (const d of [20, -20, 26]) { const sx = p.x + Math.cos(yaw) * d, sz = p.z - Math.sin(yaw) * d; if (clear(sx, sz, 6)) { signAt(sx, sz, faceIn(p.i, 1, 0.5), K.board('FULL SELF-DRIVING', { bg: INK, fg: '#ffffff', size: 150, sub: '(INTO A CRATER)', subFg: '#ff6a2a', subScale: 0.75, lines: 1 }), 16, 6.5, 8.5); break; } }
    }
    const f = sc.beside(4.3, 1, 32);
    if (clear(f.x, f.z, 2)) {
      const yaw = faceIn(f.i, 1, 0.6), pole = M.bigFlagPole({ h: 22, fw: 15, fh: 7.5 }); sc.place(pole, f.x, f.z, { yaw }); bake.add(pole); take(f.x, f.z, 9);
      const fl = pole.userData.flag, rx = Math.cos(yaw), rz = -Math.sin(yaw);
      const r = atlas.add(1024, 512, (g, w, h) => { g.fillStyle = RUST_HEX; g.fillRect(0, 0, w, h); g.fillStyle = CREAM; g.fillRect(0, h * 0.78, w, h * 0.22); K.fitText(g, 'TERMS OF SERVICE APPLY', w / 2, h * 0.4, w * 0.9, 170, K.FONT, '#ffffff', { lines: 2, maxH: h * 0.66 }); K.fitText(g, 'BY BREATHING YOU AGREE', w / 2, h * 0.89, w * 0.86, 60, K.SANS, RUST_HEX, { lines: 1 }); });
      atlas.both(r, [f.x + rx * fl.x, sc.y(f.x, f.z) + fl.y, f.z + rz * fl.x], yaw, fl.w, fl.h, 0.06);
    }
  }

  // ---- the solar field: the company store, and a recruitment poster ----
  {
    const p = sc.beside(18.6, -1, 22);
    if (clear(p.x, p.z, 8)) {
      const yaw = faceIn(p.i, -1, 0.35), st = M.companyStore({ w: 18, d: 10 }); sc.place(st, p.x, p.z, { yaw, y: p.y - 0.2 }); bake.add(st); take(p.x, p.z, 15);
      const fx = Math.sin(yaw), fz = Math.cos(yaw), r = atlas.add(1024, 400, K.board('COMPANY STORE', { bg: '#e9e4d8', fg: RUST_HEX, size: 170, sub: 'PAID IN COMPANY SCRIP ONLY', subFg: INK, subScale: 0.5, lines: 1 }));
      atlas.place(r, [p.x + fx * 0.34, p.y + 6.7, p.z + fz * 0.34], yaw, 17.4, 6.8);
      const pr = atlas.add(512, 360, (g, w, h) => { g.fillStyle = '#101418'; g.fillRect(0, 0, w, h); const rows = [['AIR', '40 SCRIP'], ['WATER', '90 SCRIP'], ['RIDE HOME', 'N/A']]; rows.forEach(([a, b2], k) => { K.fitText(g, a, w * 0.3, h * (0.2 + k * 0.3), w * 0.5, 64, K.SANS, '#ffffff', { lines: 1 }); K.fitText(g, b2, w * 0.74, h * (0.2 + k * 0.3), w * 0.44, 64, K.SANS, k === 2 ? '#ff3b30' : '#38ff74', { lines: 1 }); }); });
      atlas.place(pr, [p.x + fx * 0.36 + Math.cos(yaw) * 5, p.y + 2.4, p.z + fz * 0.36 - Math.sin(yaw) * 5], yaw, 3.4, 2.4);
    }
    sign(17.6, 1, 20, K.board('NO UNIONS ON MARS', { bg: RUST_HEX, fg: '#ffffff', size: 150, sub: '(NO AIR EITHER)', subFg: '#ffd23c', subScale: 0.75, lines: 1 }), 20, 8, 10, { turn: 0.5 });
  }

  // ---- the way back into town: the population sign ----
  sign(24.3, -1, 18, (g, w, h) => {
    g.fillStyle = '#1d5a3a'; g.fillRect(0, 0, w, h); g.strokeStyle = '#ffffff'; g.lineWidth = 12; g.strokeRect(14, 14, w - 28, h - 28);
    K.fitText(g, 'WELCOME TO MARS COLONY', w / 2, h * 0.2, w * 0.86, 90, K.SANS, '#ffffff', { lines: 1 });
    K.fitText(g, 'POPULATION: 1 MILLION (PROJECTED)', w / 2, h * 0.47, w * 0.86, 76, K.SANS, '#ffffff', { lines: 1 });
    K.fitText(g, '0 (ACTUAL)', w / 2, h * 0.75, w * 0.8, 150, K.FONT, '#ffd23c', { lines: 1 });
  }, 22, 9.5, 9.5, { turn: 0.5 });

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
  const BOARDS = [
    [1.35, 1, 18, 'FUNDING SECURED', INK, '#38ff74'], [4.2, -1, 18, 'FULL SELF-LANDING: NEXT YEAR', CREAM, RUST_HEX],
    [8.3, 1, 35, 'TICKET TO MARS: $500K', '#1f6bff', '#ffffff', 'RETURN TRIP: SOLD OUT'], [11.9, -1, 18, 'EARTH: HAD ITS CHANCE', '#2f7fe0', '#ffffff'],
    [16.4, 1, 18, 'BREATHING IS NOW A SUBSCRIPTION', '#ffd23c', INK], [19.9, -1, 20, 'WORK FROM DOME: MANDATORY', '#ffffff', '#1f6bff'],
    [23.6, -1, 18, 'MARS: NO REGULATORS', RUST_HEX, '#ffffff', '(OR ATMOSPHERE)'],
  ];
  for (const [at, side, off, text, bg, fg, sub] of BOARDS) sign(at, side, off, K.board(text, { bg, fg, size: 130, sub, subFg: fg, subScale: 0.6 }), 20, 6.6, 10, { turn: 0.45 });

  bake.flush();
  atlas.flush();
}

