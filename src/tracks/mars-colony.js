/* Mars Colony: the third stop of the second cup. A billionaire's half-built
   colony on a rust plateau: Main Street between the habitat domes, a glass
   airlock tube, a climb along the canyon rim, a dive across the launchpad
   apron and straight through the rocket's launch mount, the long low-gravity
   jump across the canyon, a banked bowl inside a crater with a rim hop, and a
   fast S-bend through the solar field back home. */
import { clamp, fbm, ridged, smoothstep } from '../core/util.js';
import { Scenery, partsOf } from '../render/scenery.js';
import { makeGroundHit, EDGE } from '../track/track.js';
import * as P from '../models/props.js';
import * as M from '../models/props-mars-colony.js';
import * as K from '../models/props-burning-circuit.js';   // the sign kit (atlas, baker, boards) lives there
import { ModelBuilder, cyl, box, sphere, plastic, glow } from '../models/build.js';

/* The canyon the jump crosses: a winding cut along the east side of the rim road. */
const CANYON = [[330, -10], [270, -100], [242, -165], [240, -215], [258, -262], [260, -320], [216, -371], [176, -392], [148, -386]];
const CRATER = { x: 176, z: -470, r: 62 };     // crater bowl; the road circles its inside
const COLONY = { x: 10, z: -40, r: 150 };      // plateau the colony stands on
const ROCKET = { x: 165, z: -300 };            // launch pad on the rim mesa; the road now threads its mount
const EARTH = { x: 300, y: 165, z: -1060 };    // hangs in the sky ahead of the jump
const BOWL = { x: -110, z: -192, r: 44 };          // the Dust Bowl: the hairpin's infield, a shallow dusty dip the boost cut crosses
const DOME = { x: 9, z: -242, r: 40, h: 25, y: 14.6 };   // the terraforming biodome the solar-field road drives through

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
  lapNotes: ['<b>Launch update:</b> departure moved to THE YEAR AFTER. Dust storm inbound.', '<b>Final lap.</b> The rocket is launching. Stand well back.'],
  laps: 3,
  width: 18,
  sky: 'mars',
  skyOverrides: { zenith: 0x703f45, horizon: 0xe4aa90, fogNear: 170, fogFar: 1100, sunIntensity: 3.1, sunLight: 0xffe8d4, hemiSky: 0xc5ceec, hemiGround: 0x784b46 },
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
    { p: [200, 30, -231] },            // 7 right, starting the swing toward the pad
    { p: [196, 30.5, -250] },          // 8 swing west off the rim road, onto the pad approach
    { p: [164, 30.5, -280] },          // 9 across the apron, lining up on the rocket
    { p: [169, 30.5, -306], w: 21 },   // 10 through the launch mount, then the drift out
    { p: [216, 31.5, -340], w: 20 },   // 11 ramp and the canyon gap
    { p: [216, 26, -415], wl: 9.5, wr: 16 },     // 12 landing deck
    { p: [216, 25.5, -470], wl: 9.5, wr: 11, bank: 4 }, // 13 into the crater bowl
    { p: [204, 25.5, -498], w: 19, bank: 8 }, // 14
    { p: [176, 26.5, -510], w: 19, bank: 9 }, // 15
    { p: [148, 26, -498], w: 19, bank: 8 }, // 16
    { p: [136, 26, -470], w: 19, bank: 4 }, // 17 bowl exit
    { p: [138, 27, -428] },            // 18 crater rim (hop)
    { p: [102, 24.5, -385] },            // 19 solar field S-bend
    { p: [60, 21.5, -350] },             // 20
    { p: [62, 18, -292] },             // 21
    { p: [20, 15.5, -250] },             // 22
    { p: [-50, 13.5, -222] },            // 23 out of the dome
    { p: [-120, 13.5, -238] },           // 24 into the Dust Bowl hairpin (left); the dust cut skips it with a boost
    { p: [-158, 14.5, -203] },           // 25 hairpin apex
    { p: [-128, 16.5, -142] },           // 26 back out, then the final corner
    { p: [-96, 18, -12] },             // 27
    { p: [-55, 18, 0] },               // 28 Main Street
  ],
  shortcuts: [
    { name: 'dust bowl', from: 23.25, to: 26.05, boost: true, path: [[-80, -224], [-92, -215], [-103, -202], [-113, -187], [-121, -170], [-126, -152]] },
  ],
  sides: [
    { from: 27.6, to: 1.6, edge: 'wall' },                    // Main Street: walls both sides
    { from: 4.2, to: 7.9, side: 'L', outer: 28, shoulder: 5 }, // plateau side of the rim road
    { from: 4.4, to: 7.45, side: 'R', edge: 'wall' },          // canyon side: barrier
    { from: 7.9, to: 10.55, edge: 'wall' },                    // the launch complex: apron, mount corridor, drift out
    { from: 10.55, to: 10.85, side: 'R', edge: 'void' },       // a short open drop where the rejoin runs along the canyon shoulder
    { from: 10.75, to: 12.6, edge: 'wall' },                   // launch deck and landing deck
    { from: 21.52, to: 22.63, hoarding: false },             // an unobstructed view into the growing beds
    { from: 23.1, to: 26.15, side: 'L', outer: 36, shoulder: 5, hoarding: false }, // the dust cut across the hairpin's infield (needs a boost)
  ],
  zones: [{ from: 27.6, to: 1.6, skin: 'metal' }, { from: 1.6, to: 3.7, skin: 'metal' }, { from: 7.9, to: 12.6, skin: 'metal' }],
  tunnels: [{ from: 1.75, to: 3.6, through: false }],
  bridges: [{ from: 10.75, to: 12.6 }],
  gaps: [{ from: 11.14, to: 11.60 }],
  ramps: [
    { at: 11.0, len: 10, lift: 3.15, lat: 6.2, w: 8.4 },  // precision launch through the upper survey ring
    { at: 11.0, len: 10, lift: 2.1, lat: -4.1, w: 12.2 }, // wider freight ramp onto the lower landing deck
    { at: 17.75, len: 8, lift: 1.6, lat: -4.5, w: 7 },
    { at: 21.8, len: 8, lift: 0.8, lat: 4, w: 9 },   // the low-gravity hop over the biodome lawn (the right lane has a boost pad instead)
  ],
  boosts: [
    { at: 0.5, lat: 0, w: 5 },
    { at: 8.55, lat: 0, w: 6 },
    { at: 10.2, lat: 0, w: 6 },
    { at: 10.76, lat: -4, w: 10, len: 9 },
    { at: 12.04, lat: -4, w: 7, len: 10 },
    { at: 18.8, lat: -2.5, w: 6 },
    { at: 21.85, lat: -4.5, w: 6 },
  ],
  itemRows: [{ at: 2.4 }, { at: 6.1 }, { at: 13.5 }, { at: 19.5 }, { at: 26.35, n: 3 }],
  coins: [
    { from: 0.15, to: 0.45, n: 4, lat: 4 },
    { from: 5.3, to: 5.8, n: 5, lat: [5, -4] },
    { from: 8.7, to: 9.9, n: 5, lat: 0 },   // across the apron and through the mount, on the centreline
    ...[[11.2, 3.9, 4.1], [11.3, 3, 6.4], [11.4, 2.3, 7.6], [11.5, 1.2, 7.7], [11.6, -0.4, 6.4]].map(([at, lat, air]) => ({ from: at, to: at, n: 1, lat, air })),   // on the arc over the canyon
    { from: 14.4, to: 15.8, n: 6, lat: 5 },
    { from: 18.25, to: 18.6, n: 3, lat: -3 },
    ...[[22.0, 1.6], [22.1, 2.6], [22.2, 3.0], [22.3, 2.8], [22.4, 2.0]].map(([at, air]) => ({ from: at, to: at, n: 1, lat: 4, air })),   // on the hop's arc
    { from: 22.0, to: 22.5, n: 4, lat: -4.5 },   // the boost lane under the hop
    ...[[23.48, 17], [23.53, 27], [25.64, 30], [25.73, 19]].map(([at, lat]) => ({ from: at, to: at, n: 1, lat })),   // across the Dust Bowl
  ],
  obstacles: [
    // rovers crawl across part of Main Street and the solar field road
    { kind: 'patrol', model: 'rover', at: 1.0, lats: [6.2, 8.2], speed: 3.5, effect: 'spin', radius: 1.8 },
    { kind: 'patrol', model: 'rover', at: 22.6, lats: [-8.5, -5], speed: 3, effect: 'spin', radius: 1.8 },
    // dust devils on the outside of the rim road and the crater bowl
    { kind: 'orbit', model: 'dustdevil', at: 5.6, lat: 11.5, orbit: 5, speed: 6, effect: 'spin', radius: 1.6 },
    { kind: 'orbit', model: 'dustdevil', at: 15.3, lat: -10.5, orbit: 5, speed: 6, effect: 'spin', radius: 1.6 },
    // and one that lives in the Dust Bowl, so the boost cut has a price
    { kind: 'orbit', model: 'dustdevil', at: 23.55, lat: 31, orbit: 7, speed: 5, effect: 'spin', radius: 1.6 },
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
      // the launch pad: a wide flat apron now that the road crosses it
      const pad = 1 - smoothstep(26, 48, Math.hypot(x - ROCKET.x, z - ROCKET.z));
      h = h * (1 - pad) + 30.5 * pad;
      // the canyon, cut last so it stays deep
      const c = canyonDist(x, z), fade = 1 - smoothstep(0.9, 1.0, c.t);
      const wall = 13 + (fbm(x * 0.05, z * 0.05, 2, 6) - 0.5) * 6, cut = (1 - smoothstep(wall, wall + 13, c.d)) * fade;
      h = h * (1 - cut) + (1 + (fbm(x * 0.04, z * 0.04, 2, 8) - 0.5) * 3) * cut;
      // Grade the far bank below the catch deck and its piers; the natural mesa is higher than the runway.
      const runway = (1 - smoothstep(18, 32, Math.abs(x - 216))) * smoothstep(-376, -393, z) * (1 - smoothstep(-449, -464, z));
      h -= runway * Math.max(0, h - 13);
      // the Dust Bowl inside the west hairpin: a smooth shallow dip, so the cut across it is a drive, not a climb
      const bk = 1 - smoothstep(BOWL.r * 0.55, BOWL.r, Math.hypot(x - BOWL.x, z - BOWL.z));
      h = h * (1 - bk) + (12.2 + (fbm(x * 0.05, z * 0.05, 2, 12) - 0.5) * 1.2) * bk;
      // the biodome stands on a level lawn
      const dk = 1 - smoothstep(DOME.r - 2, DOME.r + 10, Math.hypot(x - DOME.x, z - DOME.z));
      h = h * (1 - dk) + (DOME.y + 0.3) * dk;
      return h;
    },
    // the one green thing on Mars: a lawn under the biodome
    color(x, z, h, slope, over, out) {
      const d = Math.hypot(x - DOME.x, z - DOME.z), k = 1 - smoothstep(DOME.r - 3, DOME.r - 0.5, d);
      if (k <= 0) {
        // Exposed beds in the ravine: pale mineral seams against plum basalt below the landing.
        if (z < -335 && z > -406 && x > 166 && x < 275 && h < 26) {
          const seam = smoothstep(0.82, 0.99, Math.cos(h * 1.05 + Math.sin(x * 0.09) + z * 0.045));
          const depth = 1 - smoothstep(17, 26, h);
          out[0] += (0.28 + seam * 0.42 - out[0]) * depth;
          out[1] += (0.12 + seam * 0.29 - out[1]) * depth;
          out[2] += (0.20 + seam * 0.20 - out[2]) * depth;
        }
        return;
      }
      const n = fbm(x * 0.15, z * 0.15, 2, 17) * 0.12;
      out[0] += (0.3 + n - out[0]) * k; out[1] += (0.58 + n - out[1]) * k; out[2] += (0.2 - out[2]) * k;
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
  intro: [{ pos: [262, 46, -196], pos1: [252, 52, -212], look: [165, 72, -300], look1: [165, 76, -300], fov: 48, dur: 3.6 }],

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
  take(ROCKET.x, ROCKET.z, 26); take(CRATER.x, CRATER.z, 16); take(DOME.x, DOME.z, DOME.r + 4);

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
  // painted posters (generated art, tools/gen-posters.mjs): one 2x2 atlas image, one mesh for all of them
  const posters = (() => {
    const tex = new THREE.TextureLoader().load('assets/posters/mars-colony.webp'); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
    const q = new K.Quads();
    return {
      place(k, c, yaw, w, h) { const u0 = (k % 2) / 2, v1 = 1 - Math.floor(k / 2) / 2; q.panel(c, yaw, w, h, [u0 + 0.002, v1 - 0.498, u0 + 0.498, v1 - 0.002]); },
      flush() { if (q.empty) return; const m = new THREE.Mesh(q.geometry(), new THREE.MeshStandardMaterial({ map: tex, emissiveMap: tex, emissive: 0xffffff, emissiveIntensity: 0.4, roughness: 0.6 })); m.matrixAutoUpdate = false; ctx.group.add(m); },
    };
  })();
  /** A painted poster on a board beside the road (poster k of the atlas), with a lettered back. */
  const poster = (at, side, off, k, back, { w = 15, h = 10, up = 9, turn = 1.8, roadLevel = false } = {}) => {
    const p = sc.beside(at, side, off), yaw = faceIn(p.i, side, turn), rx = Math.cos(yaw) * w / 2, rz = -Math.sin(yaw) * w / 2;
    if (!clear(p.x, p.z, 0.5) || !clear(p.x + rx, p.z + rz, 0.5) || !clear(p.x - rx, p.z - rz, 0.5)) return null;
    const ground = sc.y(p.x, p.z), y0 = roadLevel ? Math.max(p.roadY - 1, ground) : ground;
    const f = K.signFrame(w, h, up + y0 - ground, { color: 0x2a2026, legs: 2 });
    bake.add(sc.place(f, p.x, p.z, { yaw, y: ground })); take(p.x, p.z, w * 0.55);
    posters.place(k, [p.x + Math.sin(yaw) * 0.03, y0 + up, p.z + Math.cos(yaw) * 0.03], yaw, w, h);
    // Marquee below the illustration: a one-way race should see both halves of the joke.
    const strap = atlas.add(1024, 150, K.board(back, { bg: INK, fg: CREAM, size: 96, lines: 1, pad: 0.04 }));
    atlas.place(strap, [p.x + Math.sin(yaw) * 0.05, y0 + up - h / 2 - w * 0.068, p.z + Math.cos(yaw) * 0.05], yaw, w, w * 0.14);
    const r = atlas.add(768, 512, K.board(back, { bg: INK, fg: CREAM, size: 120, stripe: RUST_HEX }));
    atlas.place(r, [p.x - Math.sin(yaw) * 0.39, y0 + up, p.z - Math.cos(yaw) * 0.39], yaw + Math.PI, w, h);
    return p;
  };
  // spots the gags will stand on, kept clear of the domes, rocks, and solar panels
  for (const [at, side, off, r] of [[0.55, 1, 9, 13], [4.3, 1, 32, 10], [7.0, 1, 36, 20], [20.48, -1, 17, 18], [19.6, 1, 20, 12], [26.3, -1, 18, 14], [1.35, 1, 18, 11], [4.2, -1, 18, 11], [8.32, -1, 10, 13], [5.58, -1, 10.5, 13], [13.9, -1, 18, 11], [18.4, 1, 18, 11], [22.28, -1, 20.5, 11], [25.6, -1, 18, 11]]) { const p = sc.beside(at, side, off); take(p.x, p.z, r); }

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
  sc.along({ from: 27.75, to: 1.2, side: -1, offset: 6.5, spacing: 34 }).forEach((p, i) => putStand(i % 2 ? stand2 : stand, p));
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
  const lamps = sc.along({ from: 27.7, to: 1.6, side: 1, offset: 1.6, spacing: 16 }).filter(p => !inFront(p));
  { const lp = M.lampPost(); for (const p of lamps) bake.add(sc.place(lp.clone(), p.x, p.z, { yaw: p.yaw, y: p.y })); }   // baked into the shared buckets: fewer draw calls on the grid
  const flags = sc.along({ from: 27.7, to: 1.5, side: 1, offset: 4.5, spacing: 16, phase: 8 }).filter(p => !inFront(p));
  { const fl = M.colonyFlag(); for (const p of flags) bake.add(sc.place(fl.clone(), p.x, p.z, { yaw: p.along + Math.PI / 2, y: p.y })); }

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
    bake.add(sc.place(M.transitTube(len), sx, sz, { yaw: Math.atan2(ux, uz), y: Math.min(track.terrainHeight(sx, sz), track.terrainHeight(sx + ux * len, sz + uz * len)) - 0.3 }), false);
  };
  const byPos = (x, z) => domes.find(d => d.x === x && d.z === z);
  for (const [a, b] of [[[-30, -40], [12, -46]], [[12, -46], [58, -40]], [[12, -46], [40, -96]], [[-30, -40], [-24, -104]], [[-30, -40], [-78, -66]], [[-34, 50], [30, 56]], [[30, 56], [92, 46]], [[58, -40], [92, -72]]]) {
    const A = byPos(...a), Bd = byPos(...b); if (A && Bd) link(A, Bd);
  }
  // greenhouses and habitat modules between the domes
  const ghSpots = [[-60, -100, 0.3], [80, -110, 1.2], [-6, 86, 0.1], [62, 92, 0.1], [-120, -40, 1.4]].filter(([x, z]) => clear(x, z, 6) && free(x, z, 10));
  ghSpots.forEach(([x, z, yaw]) => { take(x, z, 12); bake.add(sc.place(M.greenhouse({ len: 22 }), x, z, { yaw, y: track.terrainHeight(x, z) - 0.2 })); });
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

  // The colony's launch equipment shares a subdued graphite finish. The amber/light pairs,
  // the split lip height, and the suspended survey target identify the two flight paths.
  const rampInk = view.trackMesh.userData.mats.ramp.uniforms;
  rampInk.uA.value.set(0x203643); rampInk.uB.value.set(0x639d9c);
  rampInk.uGlow.value = 0.06; rampInk.uSpeed.value = 0.7;
  {
    const hardware = new ModelBuilder();
    const place = (mat, geometry, s, lat, h, rotation = [0, 0, 0]) => {
      const p = track.pointAt(s, lat, {}, h);
      hardware.add(mat, geometry, { p: [p.x, p.y, p.z], r: [rotation[0], track.yawAt(s) + rotation[1], rotation[2]] });
    };
    const ringS = track.sAtCp(11.47), ringR = 5.2, ringY = 8.9, ringLat = 1.7;
    for (let k = 0; k < 4; k++) {
      const angle = k * Math.PI / 2 + 0.09;
      const shell = new THREE.TorusGeometry(ringR, 0.52, 7, 12, Math.PI / 2 - 0.18);
      const lamp = new THREE.TorusGeometry(ringR, 0.18, 6, 12, Math.PI / 2 - 0.34);
      place('graphite', shell, ringS, ringLat, ringY, [0, 0, angle]);
      place('amber', lamp, ringS - 0.47, ringLat, ringY, [0, 0, angle + 0.08]);
    }
    for (const side of [-1, 1]) {
      // Thruster pods keep the survey drone hovering over the ravine.
      place('graphite', cyl(0.7, 1.05, 1.6, 10), ringS, ringLat + side * ringR, ringY - 0.4);
      place('signal', cyl(0.7, 0.32, 0.78, 10), ringS, ringLat + side * ringR, ringY - 1.55);
    }
    // Vertical piers run down into the chasm. Rows of decreasing height lead the eye inland.
    for (const [at, mast] of [[11.64, 7], [11.82, 4.8], [12.02, 3.4], [12.28, 2.2]]) {
      const s = track.sAtCp(at);
      for (const side of [-1, 1]) {
        const i = track.indexAtCp(at), lat = side * ((side > 0 ? track.hwL[i] : track.hwR[i]) + 1.2);
        place('graphite', new THREE.BoxGeometry(1.15, mast + 14, 1.65), s, lat, (mast - 14) / 2);
        place('cream', new THREE.BoxGeometry(1.3, 1.2, 1.8), s, lat, mast - 1.05);
        place('signal', new THREE.BoxGeometry(1.45, 0.72, 1.85), s, lat, mast - 0.25);
      }
    }
    for (let m = 0; m < 6; m++) {
      const s = track.sAtCp(11.64) + m * 2.1;
      for (const side of [-1, 1]) place('cream', new THREE.BoxGeometry(3.6, 0.06, 0.88), s, side * 6.7, 0.07);
    }
    for (const r of track.ramps.slice(0, 2)) {
      for (const side of [-1, 1]) for (let k = 1; k <= 4; k++) {
        const t = k / 4, height = r.lift * (0.35 * t + 0.65 * t * t);
        place(r.lat > 0 ? 'amber' : 'signal', new THREE.BoxGeometry(0.33, 0.16, 1.4),
          r.s0 + r.len * t - 0.55, r.lat + side * (r.half - 0.45), height + 0.06);
      }
    }
    const equipment = hardware.build({ graphite: plastic(0x23313b, 0.65), cream: plastic(0xffe9ca, 0.65),
      amber: glow(0xffb84c, 1.4), signal: glow(0x79ffff, 1.6) });
    ctx.group.add(equipment);
  }

  // ---- the centrepiece: a megarocket on the pad whose story is the race — lap 1 it cannot get off the ground,
  // lap 2 the engines stay lit and go nowhere, and on the final lap it launches and comes apart ----
  const padY = track.terrainHeight(ROCKET.x, ROCKET.z) - 0.1, MOUNT = 9;
  // The road threads the launch mount, so the whole complex is built in the road's own frame at the
  // spline sample nearest the rocket (local +z = direction of travel, local x = lateral).
  let ci = 0, cd0 = Infinity;
  for (let i = 0; i < track.N; i++) { const d = (track.px[i] - ROCKET.x) ** 2 + (track.pz[i] - ROCKET.z) ** 2; if (d < cd0) { cd0 = d; ci = i; } }
  const padYaw = Math.atan2(track.tx[ci], track.tz[ci]);
  const sideW = track.lx[ci] < 0 ? 1 : -1;                 // the side of the road facing west, the colony side
  {
    // the launch tower on the west apron, arms reaching toward the rocket over the road's edge
    const tp = sc.beside(track.cp[ci], sideW, 13);
    const tw = M.launchTower({ h: 96 });
    sc.place(tw, tp.x, tp.z, { yaw: Math.atan2(ROCKET.x - tp.x, ROCKET.z - tp.z), y: padY }); bake.add(tw); take(tp.x, tp.z, 11);
    // the mount: two rows of legs either side of the road, a frame and ring table over the corridor,
    // blast wedges flanking the trench line, lightning masts, and the scorch disc centred under the
    // rocket — the road runs through the flame trench now
    const mb = new ModelBuilder(), LEG = plastic(0xb8bcc6, 0.7), BEAM = plastic(0x8a8f9a, 0.55, 0.4);
    for (const sx of [-1, 1]) for (const zz of [-10, 0, 10]) mb.add('leg', box(1.8, MOUNT, 1.8, 0.2, 1), { p: [sx * 13.5, MOUNT / 2, zz] });
    for (const zz of [-10, 10]) mb.add('beam', box(29.5, 1.4, 2.6, 0.1, 1), { p: [0, MOUNT - 1.5, zz] });
    for (const sx of [-1, 1]) mb.add('beam', box(2.6, 1.4, 17.4, 0.1, 1), { p: [sx * 13.5, MOUNT - 1.5, 0] });
    for (const [sx, sz] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) mb.add('beam', box(6, 1.0, 1.8, 0.1, 1), { p: [sx * 8.3, MOUNT - 1.1, sz * 8.3], r: [0, sx * sz * Math.PI / 4, 0] });
    mb.add('ring', cyl(9.8, 9.8, 1.6, 24), { p: [0, MOUNT - 0.8, 0] });
    for (const sx of [-1, 1]) for (const zz of [-5.5, 5.5]) mb.add('wedge', box(3.6, 1.3, 6, 0.1, 1), { p: [sx * 12.6, 0.65, zz], r: [0, 0, sx * 0.45] });
    for (const [mx, mz] of [[19, -16], [-19, 16]]) { mb.add('leg', cyl(0.16, 0.3, 26, 6), { p: [mx, 13, mz] }); mb.add('tip', sphere(0.35, 8, 6), { p: [mx, 26.2, mz] }); }
    mb.add('scorch', cyl(13, 15, 0.2, 24), { p: [0, 0.12, 0] });
    const g = mb.build({ leg: LEG, beam: BEAM, ring: plastic(0x6b6f78, 0.5, 0.5), wedge: plastic(0x6b6f78, 0.6, 0.3), tip: plastic(0xff2a1a, 0.4), scorch: plastic(0x2a1c18, 0.95) });
    g.position.set(ROCKET.x, padY, ROCKET.z); g.rotation.y = padYaw; bake.add(g);
    // the service arm: plugged into the rocket from the tower across the apron edge on laps 1-2,
    // and swung clear the moment the rocket actually goes (a proxy: it has lifted, or it is gone)
    const armPivot = new THREE.Group(); armPivot.position.set(tp.x, padY + 24, tp.z); ctx.group.add(armPivot);
    const armYaw0 = Math.atan2(ROCKET.x - tp.x, ROCKET.z - tp.z), armLen = Math.hypot(ROCKET.x - tp.x, ROCKET.z - tp.z) - 5.5;
    const ab = new ModelBuilder();
    ab.add('arm', box(1.2, 1.7, armLen, 0.15, 1), { p: [0, 0, armLen / 2] });
    ab.add('cab', box(2.6, 2.4, 3.2, 0.15, 1), { p: [0, -0.4, armLen - 1] });
    armPivot.add(ab.build({ arm: plastic(0xe8e2d6, 0.55), cab: plastic(0xc1440e, 0.55) }));
    armPivot.traverse(o => { if (o.isMesh) o.castShadow = true; });
    let swing = 0;
    anim.push(dt => {
      const clear = rocket.position.y > padY + MOUNT + 4 || !rocket.visible;
      swing += ((clear ? 1 : 0) - swing) * Math.min(1, dt * 1.4);
      armPivot.rotation.y = armYaw0 + swing * 0.95;
    });
    // the countdown gantry over the road at the pad entry
    const gi = track.indexAtCp(8.45), gp = sc.beside(8.45, 1, -track.hwL[gi]);
    const gg = P.gantry(track.hwL[gi] + track.hwR[gi] + 1.5, 'LAUNCH COMPLEX', { color: 0xc1440e, color2: 0xf2efe6 });
    sc.place(gg, gp.x, gp.z, { yaw: gp.along, y: gp.roadY }); bake.add(gg);
  }
  const rocket = M.megaRocket({ h: 74 }); sc.place(rocket, ROCKET.x, ROCKET.z, { y: padY + MOUNT, yaw: 0.6 });
  const rocketY = rocket.position.y;
  // debris: a few chunk shapes, three of each, hidden until the bang
  const debris = rocket.userData.chunks.map(([geo, mat]) => { const m = new THREE.InstancedMesh(geo, mat, 3); m.frustumCulled = false; m.visible = false; ctx.group.add(m); return m; });
  const bits = []; debris.forEach((m, k) => { for (let j = 0; j < 3; j++) bits.push({ m, j, p: new THREE.Vector3(), v: new THREE.Vector3(), r: new THREE.Euler(), w: new THREE.Vector3() }); });
  // the banner greets you on the canyon side of the pad entry; the counter watches the mount exit
  sign(8.3, -sideW, 15, K.board('RAPID UNSCHEDULED DISASSEMBLY', { bg: CREAM, fg: INK, size: 150, stripe: RUST_HEX, sub: '(A SUCCESS)', subFg: '#16a34a', subScale: 0.75 }), 30, 11, 17, { legs: 3, frame: 0x2a2026 });
  const counter = (() => {
    const cv = document.createElement('canvas'); cv.width = 768; cv.height = 384;
    const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
    const iN = track.indexAtCp(10.6), sideN = track.lz[iN] < 0 ? 1 : -1, cpN = sc.beside(10.6, sideN, 14);
    const x = cpN.x, z = cpN.z, yaw = faceIn(cpN.i, sideN, 0.5), y0 = sc.y(x, z), w = 15, h = 7.5;
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
      // the final lap: it launches as the leader swings onto the pad approach (the mount crossing is at
      // lap fraction ~0.31, so the trigger sits ~80 m of road before it), and the climb carries the
      // rocket up through the pass as the field threads the mount behind the leader; a slow field
      // gets the fallback timer instead
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
    // lap 2 brings a dust storm in off the plains (half strength, blowing grit across the road); the bang finishes the job
    rst.storm += ((rst.boomed ? 1 : mode === 'vent' ? 0 : 0.45) - rst.storm) * Math.min(1, dt * (rst.boomed ? 0.07 : 0.12));
    const ck = view.cams?.[0]?.kart;
    if (ck && rst.storm > 0.1) for (let i = 0, n = fx.count(70 * rst.storm, dt); i < n; i++) { const a = rng() * 6.28, d = rng.range(6, 45); fx.dust(ck.x + Math.cos(a) * d, ck.y + rng.range(0.3, 5), ck.z + Math.sin(a) * d, -14 - rng() * 8, rng.range(-0.5, 1.5), rng.range(-5, 5), [0.86, 0.56, 0.36], 3 + rng() * 4, 1.6, 0.35); }
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
  const signP = sc.beside(12.75, -1, 26);
  sc.place(M.hiringSign('NOW HIRING: EXTREMELY HARDCORE', { w: 30, h: 7, legs: 7 }), signP.x, signP.z, { yaw: signP.yaw + 0.35, y: signP.y - 0.3 });
  take(signP.x, signP.z, 18);
  const lander2 = sc.beside(21.6, 1, 46);
  if (clear(lander2.x, lander2.z, 8)) { bake.add(sc.place(M.lander({ h: 8 }), lander2.x, lander2.z, { yaw: 0.6 })); take(lander2.x, lander2.z, 12); }

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
    const p = sc.beside(20.48, -1, 17);
    if (clear(p.x, p.z, 3)) {
      const approach = track.indexAtCp(19.9), yaw = Math.atan2(track.px[approach] - p.x, track.pz[approach] - p.z);
      const st = M.companyStore({ w: 18, d: 10 });
      bake.add(sc.place(st, p.x, p.z, { yaw, y: p.y - 0.2 })); take(p.x, p.z, 15);
      const fx = Math.sin(yaw), fz = Math.cos(yaw), r = atlas.add(1024, 400, K.board('COMPANY STORE', { bg: '#e9e4d8', fg: RUST_HEX, size: 170, sub: 'PAID IN COMPANY SCRIP ONLY', subFg: INK, subScale: 0.5, lines: 1 }));
      atlas.place(r, [p.x + fx * 0.34, p.y + 7.2, p.z + fz * 0.34], yaw, 17.4, 4.2);
      const menuX = p.x + Math.cos(yaw) * 14.5, menuZ = p.z - Math.sin(yaw) * 14.5;
      const menuFrame = K.signFrame(9.9, 7.2, 5, { color: 0x27313a });
      bake.add(sc.place(menuFrame, menuX, menuZ, { yaw, y: p.y }));
      const pr = atlas.add(768, 540, (g, w, h) => { g.fillStyle = '#101418'; g.fillRect(0, 0, w, h); const rows = [['AIR', '40 SCRIP'], ['WATER', '90 SCRIP'], ['RIDE HOME', 'N/A']]; rows.forEach(([a, b2], k) => { K.fitText(g, a, w * 0.3, h * (0.2 + k * 0.3), w * 0.5, 104, K.SANS, '#ffffff', { lines: 1 }); K.fitText(g, b2, w * 0.74, h * (0.2 + k * 0.3), w * 0.44, 104, K.SANS, k === 2 ? '#ff3b30' : '#38ff74', { lines: 1 }); }); });
      atlas.place(pr, [menuX + fx * 0.05, p.y + 5, menuZ + fz * 0.05], yaw, 9.9, 7.2);
    }
    sign(19.6, 1, 20, K.board('NO UNIONS ON MARS', { bg: RUST_HEX, fg: '#ffffff', size: 150, sub: '(NO AIR EITHER)', subFg: '#ffd23c', subScale: 0.75, lines: 1 }), 20, 8, 10, { turn: 0.5 });
  }

  // ---- the way back into town: the population sign ----
  sign(26.3, -1, 18, (g, w, h) => {
    g.fillStyle = '#1d5a3a'; g.fillRect(0, 0, w, h); g.strokeStyle = '#ffffff'; g.lineWidth = 12; g.strokeRect(14, 14, w - 28, h - 28);
    K.fitText(g, 'WELCOME TO MARS COLONY', w / 2, h * 0.2, w * 0.86, 90, K.SANS, '#ffffff', { lines: 1 });
    K.fitText(g, 'POPULATION: 1 MILLION (PROJECTED)', w / 2, h * 0.47, w * 0.86, 76, K.SANS, '#ffffff', { lines: 1 });
    K.fitText(g, '0 (ACTUAL)', w / 2, h * 0.75, w * 0.8, 150, K.FONT, '#ffd23c', { lines: 1 });
  }, 22, 9.5, 9.5, { turn: 0.5 });

  // ---- the terraforming biodome: the solar-field road drives straight through a geodesic glass dome full of
  // the only trees on Mars, hops a low-gravity ramp over the lawn, and leaves by the far airlock. On the final
  // lap, once the rocket has blown, the dust gets in and the trees give up ----
  {
    const dy = DOME.y;
    const portal = (x, y, z) => {
      const g = track.ground(x, z, -1, hit), off = g.onRoad ? 0 : g.outside;
      return off < 5.5 && y - track.py[g.i] < 11.5;
    };
    const dome = M.geoDome(DOME.r, { h: DOME.h, keep: (x, y, z) => !portal(DOME.x + x, dy + y, DOME.z + z) });
    sc.place(dome, DOME.x, DOME.z, { y: dy }); bake.add(dome);
    // a concrete plinth ring under the glass, broken where the road runs through
    {
      const mb = new ModelBuilder(), n = 72;
      for (let k = 0; k < n; k++) {
        const a = (k + 0.5) / n * Math.PI * 2, x = DOME.x + Math.cos(a) * DOME.r, z = DOME.z + Math.sin(a) * DOME.r;
        if (portal(x, dy + 1, z)) continue;
        mb.add('base', box(DOME.r * Math.PI * 2 / n + 0.2, 2.4, 1.6, 0.2, 1), { p: [x, dy + 0.2, z], r: [0, -a + Math.PI / 2, 0] });
      }
      const g = mb.build({ base: plastic(0xd9d2c4, 0.85) }); ctx.group.add(g); bake.add(g);
    }
    // the two airlock portals where the road meets the glass: chunky white arches with a rust band
    const ports = [];
    for (let i = 0, was = Math.hypot(track.px[track.N - 1] - DOME.x, track.pz[track.N - 1] - DOME.z) < DOME.r; i < track.N; i++) {
      const inside = Math.hypot(track.px[i] - DOME.x, track.pz[i] - DOME.z) < DOME.r;
      if (inside !== was) ports.push({ i, entry: inside });
      was = inside;
    }
    for (const { i, entry } of ports) {
      const half = (track.hwL[i] + track.hwR[i]) / 2 + 4.2, H = 11.5, yaw = track.yaw[i];
      const mb = new ModelBuilder();
      const arch = new THREE.TorusGeometry(half, 0.9, 8, 28, Math.PI); arch.scale(1, H / half, 1);
      mb.add('white', arch);
      const arch2 = new THREE.TorusGeometry(half + 1.1, 0.35, 6, 28, Math.PI); arch2.scale(1, (H + 1.1) / (half + 1.1), 1);
      mb.add('rust', arch2, { p: [0, 0, entry ? -0.9 : 0.9] });
      for (const sx of [-1, 1]) mb.add('white', box(2.4, 2.2, 3.2, 0.3, 2), { p: [sx * half, 1.1, 0] });
      const g = mb.build({ white: plastic(0xf2efe6, 0.45), rust: plastic(0xc1440e, 0.5) }); g.position.set(track.px[i], track.py[i] - 0.2, track.pz[i]); g.rotation.y = yaw; ctx.group.add(g); bake.add(g);
      // the lettering over the entry arch faces the oncoming karts; the exit arch says goodbye from the inside
      const r = atlas.add(1024, 220, entry
        ? K.board('TERRAFORMING PILOT', { bg: CREAM, fg: '#1d7a3a', size: 150, stripe: '#1d7a3a', lines: 1, pad: 0.05 })
        : K.board('BACK TO MARS (SORRY)', { bg: INK, fg: CREAM, size: 150, stripe: RUST_HEX, lines: 1, pad: 0.05 }));
      const face = yaw + Math.PI, fx = Math.sin(face), fz = Math.cos(face), bw = half * 1.5;
      atlas.place(r, [track.px[i] + fx * 1.25, track.py[i] + H + 0.6, track.pz[i] + fz * 1.25], face, bw, bw * 220 / 1024);
    }
    // the garden: trees in clumps, bushes, two ponds with fountains
    const inDome = (x, z, m) => Math.hypot(x - DOME.x, z - DOME.z) < DOME.r - m;
    const ponds = [];
    for (const side of [1, -1]) { const p = sc.beside(22.05, side, 19); if (inDome(p.x, p.z, 9)) ponds.push(p); }
    const boardsIn = [[22.28, -1, 20.5], [21.72, 1, 12.5], [22.5, -1, 12.5]].map(([a, sd, o]) => sc.beside(a, sd, o));   // the boards inside keep a clearing
    const spots = [];
    for (let gx = -DOME.r; gx <= DOME.r; gx += 6) for (let gz = -DOME.r; gz <= DOME.r; gz += 6) {
      const x = DOME.x + gx + rng.range(-2, 2), z = DOME.z + gz + rng.range(-2, 2);
      if (!inDome(x, z, 4) || !clear(x, z, 1.5) || ponds.some(p => near(x, z, p, 9)) || boardsIn.some(p => near(x, z, p, 9))) continue;
      const room = DOME.h * Math.sqrt(Math.max(0, 1 - (Math.hypot(x - DOME.x, z - DOME.z) / DOME.r) ** 2));
      spots.push({ x, y: track.terrainHeight(x, z), z, yaw: rng() * 6.28, room });
    }
    const tall = spots.filter(s => s.room > 14), low = spots.filter(s => s.room <= 14 && s.room > 5);
    const leafy = [];
    const grow = (proto, list, opts) => {
      const parts = partsOf(proto);
      for (const pt of parts) if (pt.material.color && pt.material.color.g > pt.material.color.r * 1.15) { pt.material = pt.material.clone(); leafy.push(pt.material); }
      sc.instances(parts, list, opts);
    };
    grow(P.roundTree(5, { h: 10, leafA: 0x3f9d3a, leafB: 0x6cc24a }), tall.filter((_, k) => k % 3 === 0), { scale: [0.9, 1.3] });
    grow(P.roundTree(9, { h: 8, leafA: 0x58b548, leafB: 0x8fd65a }), tall.filter((_, k) => k % 3 === 1), { scale: [0.9, 1.25] });
    grow(P.cypress(2, { h: 12, color: 0x2f7d3a }), tall.filter((_, k) => k % 3 === 2), { scale: [0.8, 1.1] });
    grow(P.palm(4, { h: 8 }), low.filter((_, k) => k % 2 === 0), { scale: [0.7, 0.95] });
    grow(P.bush(3, { color: 0x58b548, flower: 0xff7ab0 }), low.filter((_, k) => k % 2 === 1), { scale: [1.3, 1.9], yaw: 'random' });
    // Stacked nutrient beds grow fruit beside the road. Their hose couplings, white trays,
    // and alternating banks of plants stay legible in the brief run between the airlocks.
    const crop = M.nutrientTower();
    const planted = [];
    for (const [at, side] of [[21.94, 1], [22.04, 1], [22.15, 1], [22.23, 1], [22.37, -1], [22.45, -1]]) {
      const p = sc.beside(at, side, 5.6);
      if (!inDome(p.x, p.z, 5)) continue;
      planted.push({ x: p.x, y: sc.y(p.x, p.z), z: p.z, yaw: p.along });
    }
    grow(crop, planted, { solid: 1.9 });
    if (ponds.length) {
      const pb = new ModelBuilder(), water = new THREE.MeshStandardMaterial({ color: 0x2fa3e6, roughness: 0.08, metalness: 0.3, envMapIntensity: 1.6 });
      for (const p of ponds) { const y = track.terrainHeight(p.x, p.z); pb.add('rim', cyl(7.6, 7.9, 0.6, 28), { p: [p.x, y + 0.2, p.z] }); pb.add('water', cyl(6.9, 6.9, 0.1, 28), { p: [p.x, y + 0.52, p.z] }); pb.add('rim', cyl(0.5, 0.7, 1.2, 10), { p: [p.x, y + 0.9, p.z] }); }
      const g = pb.build({ rim: plastic(0xd9d2c4, 0.8), water }); ctx.group.add(g); bake.add(g);
    }
    // Irrigation booms mist one bank at a time. The pumps and fountains stop when the storm breaks the seal.
    anim.push((dt, time) => {
      if (rst.boomed) return;
      if (planted.length) {
        const active = planted[Math.floor(time * 0.7) % planted.length];
        for (let k = 0, n = view.fx.count(15, dt); k < n; k++) {
          const a = time * 4.2 + k * 2.4;
          view.fx.dust(active.x, active.y + 5.95, active.z, 3.9 * Math.cos(a), 1.1, 3.9 * Math.sin(a),
            [0.62, 0.91, 1], 0.34, 0.7, 0.68);
        }
      }
      for (const p of ponds) { const y = track.terrainHeight(p.x, p.z) + 1.5; for (let k = 0, n = view.fx.count(30, dt); k < n; k++) view.fx.dust(p.x + rng.range(-0.3, 0.3), y, p.z + rng.range(-0.3, 0.3), rng.range(-1.4, 1.4), 6.5 + rng() * 2.5, rng.range(-1.4, 1.4), [0.78, 0.92, 1], 0.6 + rng() * 0.5, 1.3, 0.65); }
    });
    // what the pilot has achieved so far
    // the tree counter is a live board: 31 trees, until the dust gets in
    const treeBoard = (() => {
      const p = sc.beside(21.72, 1, 12.5), yaw = faceIn(p.i, 1, 0.45), w = 13, h = 6, up = 6.5;
      if (!clear(p.x, p.z, 0.5)) return () => {};
      const y0 = sc.y(p.x, p.z), f = K.signFrame(w, h, up, { color: 0x2a2026, legs: 2 }); sc.place(f, p.x, p.z, { yaw, y: y0 }); bake.add(f);
      const cv = document.createElement('canvas'); cv.width = 1024; cv.height = 472;
      const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
      const q = new K.Quads(); q.panel([p.x + Math.sin(yaw) * 0.03, y0 + up, p.z + Math.cos(yaw) * 0.03], yaw, w, h, [0, 0, 1, 1]);
      const mesh = new THREE.Mesh(q.geometry(), new THREE.MeshStandardMaterial({ map: tex, emissiveMap: tex, emissive: 0xffffff, emissiveIntensity: 0.45, roughness: 0.6 }));
      mesh.matrixAutoUpdate = false; ctx.group.add(mesh);
      { const r = atlas.add(1024, 472, K.board('PLEASE KEEP OFF THE PLANET', { bg: CREAM, fg: '#1d7a3a', size: 130, border: '#1d7a3a' })); atlas.place(r, [p.x - Math.sin(yaw) * 0.39, y0 + up, p.z - Math.cos(yaw) * 0.39], yaw + Math.PI, w, h); }
      const g = cv.getContext('2d');
      return dead => { K.board(dead ? 'TREES: 0' : 'TREES: 31', dead ? { bg: '#6b4a2a', fg: '#ffffff', size: 160, sub: 'TERRAFORMING: PAUSED', subFg: '#ffd23c', subScale: 0.6, lines: 1 } : { bg: '#1d7a3a', fg: '#ffffff', size: 160, sub: 'TARGET: ONE PLANET', subFg: '#c8f5b0', subScale: 0.6, lines: 1 })(g, 1024, 472); tex.needsUpdate = true; };
    })();
    treeBoard(false);
    if (typeof document !== 'undefined' && document.fonts?.ready) document.fonts.ready.then(() => treeBoard(rst.boomed));
    sign(22.5, -1, 12.5, K.board('PLEASE DO NOT BREATHE THE TREES', { bg: CREAM, fg: '#1d7a3a', size: 130, border: '#1d7a3a' }), 14, 6, 6.5, { turn: 0.45 });
    // once the rocket has gone up, the dust gets in and the leaves brown off over a few seconds
    const brown = new THREE.Color(0x8a5a2a), greens = leafy.map(m => m.color.clone());
    let wilt = 0, treeDead = false;
    anim.push(dt => {
      const want = rst.boomed ? 1 : 0;
      if (rst.boomed !== treeDead) { treeDead = rst.boomed; treeBoard(treeDead); }
      if (Math.abs(want - wilt) < 0.002) return;
      wilt += (want - wilt) * Math.min(1, dt * 0.25);
      leafy.forEach((m, k) => m.color.copy(greens[k]).lerp(brown, wilt));
    });
    // the low-gravity hop over the lawn: posts and lamps along the ramp so it reads as built, not a slab
    const rmp = track.ramps.find(r => Math.abs(r.i0 - track.indexAtCp(21.8)) < 25);
    if (rmp) {
      const mb = new ModelBuilder(), Q = { x: 0, y: 0, z: 0 };
      for (const sd of [-1, 1]) for (let k = 0; k <= 4; k++) {
        const t = k / 4, s = rmp.s0 + rmp.len * t, lift = rmp.lift * (0.35 * t + 0.65 * t * t);
        track.pointAt(s, rmp.lat + sd * (rmp.half + 0.35), Q, 0);
        mb.add('post', box(0.35, lift + 1.1, 0.35, 0.05, 1), { p: [Q.x, Q.y + (lift + 1.1) / 2, Q.z] });
        mb.add('lamp', sphere(0.28, 8, 6), { p: [Q.x, Q.y + lift + 1.25, Q.z] });
      }
      const g = mb.build({ post: plastic(0xf2efe6, 0.5), lamp: glow(0x7fe0ff, 3) }); ctx.group.add(g); bake.add(g);
    }
  }

  // ---- the Dust Bowl hairpin: an earlier prototype, standing where it came down — leaning hard, legs folded, still
  // smoking — the landmark at the west end of the lap, seen from the dome exit all the way round the hairpin ----
  {
    const ia = track.indexAtCp(25.0), side = -1, hx = Math.hypot(track.lx[ia], track.lz[ia]) || 1, off = track.hwR[ia] + 24;
    const x = track.px[ia] - track.lx[ia] / hx * off, z = track.pz[ia] - track.lz[ia] / hx * off;
    if (clear(x, z, 4)) {
      const L = 62, ship = M.megaRocket({ h: L }), yaw = Math.atan2(track.px[ia] - x, track.pz[ia] - z);   // faces the apex
      ship.rotation.order = 'YXZ';
      sc.place(ship, x, z, { yaw, y: track.terrainHeight(x, z) - 4 }); ship.rotation.x = -0.4; ship.rotation.z = 0.12; ship.updateMatrixWorld(true);
      bake.add(ship); take(x, z, 16);
      // its legs, folded under it, and a scorch ring
      const lb = new ModelBuilder(), R = ship.userData.R ?? 3.8;
      for (let k = 0; k < 4; k++) { const a = k * Math.PI / 2 + 0.4, lx = x + Math.cos(a) * (R + 2.5), lz = z + Math.sin(a) * (R + 2.5); lb.add('leg', box(1.0, 0.8, 7, 0.1, 1), { p: [lx, track.terrainHeight(lx, lz) + 0.3, lz], r: [0.25, -a + Math.PI / 2, 0.2] }); }
      lb.add('scorch', cyl(14, 16, 0.15, 24), { p: [x, track.terrainHeight(x, z) + 0.08, z] });
      const lg = lb.build({ leg: plastic(0x8a8f9a, 0.55, 0.4), scorch: plastic(0x2a1c18, 0.95) }, { cast: false }); ctx.group.add(lg); bake.add(lg, false);
      const smokeAt = new THREE.Vector3(0, 6, 0).applyMatrix4(ship.matrixWorld);
      anim.push(dt => {
        if (view.fx.smoke) for (let k = 0, n = view.fx.count(2.5, dt); k < n; k++) view.fx.smoke.emit({ x: smokeAt.x + rng.range(-3, 3), y: smokeAt.y, z: smokeAt.z + rng.range(-3, 3), vx: rng.range(-1, 1), vy: 3 + rng(), vz: rng.range(-1, 1), color: [0.2, 0.15, 0.13], color2: [0.55, 0.42, 0.36], size: 6 + rng() * 4, grow: 2.2, drag: 0.2, gravity: -0.15, life: 7 + rng() * 2, alpha: 0.55, fadeIn: 0.1, spin: rng.range(-0.3, 0.3), rot: rng() * 6.28 });
        for (let k = 0, n = view.fx.count(10, dt); k < n; k++) view.fx.flame(smokeAt.x + rng.range(-2, 2), smokeAt.y - 4, smokeAt.z + rng.range(-2, 2), 0, 2 + rng() * 2, 0, [1, 0.6, 0.2], 1.2 + rng(), 0.4);
      });
      const sp = sc.beside(24.65, side, 14);
      if (clear(sp.x, sp.z, 0.5)) signAt(sp.x, sp.z, faceIn(sp.i, side, 0.45), K.board('PROTOTYPE 46: LANDED', { bg: CREAM, fg: INK, size: 140, stripe: RUST_HEX, sub: '(MOSTLY)', subFg: '#16a34a', subScale: 0.75, lines: 1 }), 18, 7, 8.5, { legs: 2 });
    }
  }

  // ---- antenna masts with blinking red lights ----
  const mastSpots = [sc.beside(27.0, -1, 28), sc.beside(6.6, 1, 40), sc.beside(16.0, -1, 30), sc.beside(20.2, -1, 36), sc.beside(3.0, 1, 30)].filter(p => clear(p.x, p.z, 3) && free(p.x, p.z, 4));
  const masts = mastSpots.map((p, k) => { const m = M.antennaMast({ h: 16 + (k % 3) * 4 }); sc.place(m, p.x, p.z, { yaw: rng() * 6.28 }); bake.add(m); take(p.x, p.z, 5); return m.userData.light; });
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
  // the Dust Bowl cut across the hairpin's infield: boulder clusters either side of the line, marker cones, and the sign
  const CUT = track.def.shortcuts[0].path, cut = [], cones = [];
  for (let k = 0; k < CUT.length - 1; k++) {
    const [ax, az] = CUT[k], [bx, bz] = CUT[k + 1], len = Math.hypot(bx - ax, bz - az), nx = -(bz - az) / len, nz = (bx - ax) / len;
    for (let d = 0; d < len; d += 6) {
      const t = d / len, x = ax + (bx - ax) * t, z = az + (bz - az) * t;
      for (const sd of [-1, 1]) {
        const cx = x + nx * sd * 7.5, cz = z + nz * sd * 7.5;
        if (!track.ground(cx, cz, -1, hit).onRoad) cones.push({ x: cx, y: track.terrainHeight(cx, cz), z: cz, yaw: rng() * 6.28 });
      }
      if (k % 2 === 1 && d === 0) for (const sd of [-1, 1]) { const rx = x + nx * sd * 13, rz = z + nz * sd * 13; if (clear(rx, rz, -20) && !track.ground(rx, rz, -1, hit).onRoad) cut.push({ x: rx, y: track.terrainHeight(rx, rz), z: rz, yaw: rng() * 6.28 }); }
    }
  }
  sc.instances(bB, cut, { scale: 1.3, sink: 0.4, tints: ROCK_TINTS, solid: 2.5 });
  // rover ruts worn along the line, so the cut reads as a route
  {
    const pos = [], pts = [];
    const path = [[track.px[track.indexAtCp(track.def.shortcuts[0].from)], track.pz[track.indexAtCp(track.def.shortcuts[0].from)]], ...CUT, [track.px[track.indexAtCp(track.def.shortcuts[0].to)], track.pz[track.indexAtCp(track.def.shortcuts[0].to)]]];
    for (let k = 0; k < path.length - 1; k++) { const [ax, az] = path[k], [bx, bz] = path[k + 1], len = Math.hypot(bx - ax, bz - az); for (let d = 0; d < len; d += 2) pts.push([ax + (bx - ax) * d / len, az + (bz - az) * d / len]); }
    for (const off of [-1.6, 1.6]) for (let k = 0; k < pts.length - 1; k++) {
      const [ax, az] = pts[k], [bx, bz] = pts[k + 1], len = Math.hypot(bx - ax, bz - az) || 1, nx = -(bz - az) / len, nz = (bx - ax) / len, w = 0.45;
      const A = [ax + nx * (off - w), az + nz * (off - w)], Bq = [ax + nx * (off + w), az + nz * (off + w)], C = [bx + nx * (off + w), bz + nz * (off + w)], D = [bx + nx * (off - w), bz + nz * (off - w)];
      if ([A, Bq, C, D].some(([x, z]) => track.ground(x, z, -1, hit).onRoad)) continue;
      const Y = ([x, z]) => [x, sc.y(x, z) + 0.06, z];
      pos.push(...Y(A), ...Y(C), ...Y(Bq), ...Y(A), ...Y(D), ...Y(C));
    }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.computeVertexNormals();
    const m = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ color: 0x6a2c16, roughness: 1, transparent: true, opacity: 0.55, depthWrite: false, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -2 }));
    m.renderOrder = 1; ctx.group.add(m);
  }
  sc.instances(partsOf(P.cone3d()), cones, { scale: 1.4 });
  {
    const [ax, az] = CUT[1], yaw = Math.atan2(CUT[0][0] - ax, CUT[0][1] - az) + 0.5, x = ax + Math.cos(yaw) * 9, z = az - Math.sin(yaw) * 9;
    signAt(x, z, yaw, K.board('SHORTCUT', { bg: '#ffd23c', fg: INK, size: 160, sub: 'PAVING: NEXT YEAR', subFg: '#c1440e', subScale: 0.7, lines: 1, border: INK }), 11, 5.5, 5.5);
  }
  // rocks beside the open edges that a kart can reach: solid so they read as real
  const edgeRocks = sc.scatter({ count: 50, min: 12, max: 40, maxSlope: 0.7, minGap: 9, where: (x, z) => { const g = track.ground(x, z, -1, hit); return (g.side > 0 ? g.edgeL : g.edgeR) === EDGE.OPEN && clear(x, z, -0.5) && !clear(x, z, 6) && free(x, z, 3); } });
  sc.instances(bA, edgeRocks, { scale: [1.0, 1.4], yaw: 'random', sink: 0.3, tints: ROCK_TINTS, solid: 1.8 });
  const far = sc.scatter({ count: 34, min: 110, max: 420, maxSlope: 2, minGap: 55, where: (x, z) => free(x, z, 30) && !near(x, z, COLONY, 190) && canyonDist(x, z).d > 40 });
  sc.instances(partsOf(M.mesa(4, { r: 20, h: 20 })), far.filter((_, i) => i % 3 === 0), { scale: [0.8, 1.6], yaw: 'random', tints: ROCK_TINTS, sink: 2 });
  sc.instances(partsOf(M.mesa(9, { r: 13, h: 26 })), far.filter((_, i) => i % 3 === 1), { scale: [0.8, 1.4], yaw: 'random', tints: ROCK_TINTS, sink: 2 });
  sc.instances(spireB, far.filter((_, i) => i % 3 === 2), { scale: [1.0, 1.6], yaw: 'random', tints: ROCK_TINTS, sink: 1 });

  // ---- arrow boards on the outside of every real corner ----
  const arrowRight = P.chevronBoard(0xc1440e), arrowLeft = arrowRight.clone();
  const leftFace = arrowLeft.children[0];
  leftFace.geometry = leftFace.geometry.clone();
  const uv = leftFace.geometry.attributes.uv;
  for (let k = 0; k < uv.count; k++) uv.setX(k, 1 - uv.getX(k));
  for (const c of track.corners) {
    const side = c.dir > 0 ? -1 : 1, n = Math.max(2, Math.min(5, Math.round(c.len / 15)));
    for (let k = 0; k < n; k++) {
      const i = (c.i0 + Math.round(((k + 0.6) / n) * (c.len / track.ds))) % track.N;
      if (track.tunnel[i] || track.bridge[i]) continue;
      const p = sc.beside(track.cp[i], side, (side > 0 ? track.outerL[i] : track.outerR[i]) + 1.2);
      const b = (c.dir > 0 ? arrowLeft : arrowRight).clone();
      bake.add(sc.place(b, p.x, p.z, { yaw: p.yaw, lift: 0.9 }));
    }
  }

  // ---- billboards where you are looking anyway ----
  const BOARDS = [
    [1.35, 1, 18, 'FUNDING SECURED', INK, '#38ff74'], [4.2, -1, 18, 'FULL SELF-LANDING: NEXT YEAR', CREAM, RUST_HEX],
    [18.4, 1, 18, 'BREATHING IS NOW A SUBSCRIPTION', '#ffd23c', INK],
    [25.6, -1, 18, 'MARS: NO REGULATORS', RUST_HEX, '#ffffff', '(OR ATMOSPHERE)'],
  ];
  for (const [at, side, off, text, bg, fg, sub] of BOARDS) sign(at, side, off, K.board(text, { bg, fg, size: 130, sub, subFg: fg, subScale: 0.6 }), 20, 6.6, 10, { turn: 0.45 });
  // the painted posters: the travel poster at the pad, Earth as a holiday spot before the crater, the recruiting
  // poster on the rim road, and the terraforming promise inside the dome
  poster(8.32, -1, 10, 0, 'NO REFUNDS', { w: 17, h: 11.3, up: 10, turn: 2.4, roadLevel: true });
  poster(13.9, -1, 18, 1, 'EARTH: HAD ITS CHANCE');
  poster(5.58, -1, 10.5, 2, 'MUST BRING OWN OXYGEN', { w: 18, h: 12, up: 9.5, turn: 2, roadLevel: true });
  poster(22.28, -1, 20.5, 3, 'WORK FROM DOME: MANDATORY', { w: 14, h: 9.3, up: 8.2, turn: 2.7 });
  posters.flush();

  bake.flush();
  atlas.flush();
}

