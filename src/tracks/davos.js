/* Davos Circuit: the third cup's alpine summit, at golden hour, and the
   biggest mountain in the game. A resort-level start among the private jets,
   a climb up the Promenade (where every shop is now somebody's "House"), two
   stacked switchbacks up the east ridge with the summit always in view, a
   high traverse to the top at 70 m, and THE GREAT RESET: a real ski jump.
   The in-run drops off the summit, the take-off throws you two seconds out
   over the landing hill with the World Elite Forum's town and stage spread
   out below, and the outrun stadium turns you west, down past the security
   perimeter to the valley floor. A narrow kicker on the left of the take-off
   is the big-air line: more height, the high coins, a harder landing.
   Lap by lap the sun goes down: the final lap is alpenglow.
   Original design: docs/track-design-davos.md; reworked in the quality pass
   (#86) on Roger's direction ("a ski jump, or at least some massive height
   change as you go up and down the mountain"). */
import { fbm, ridged, smoothstep } from '../core/util.js';
import { Scenery, partsOf } from '../render/scenery.js';
import { makeGroundHit, EDGE } from '../track/track.js';
import * as P from '../models/props.js';
import * as M from '../models/props-davos.js';
import * as S from '../models/props-silicon-valley.js';   // the sign kit: canvas atlas, baker, text fitting
import { bannerTexture } from '../render/textures.js';

const lerp = (a, b, t) => a + (b - a) * t;

/* The alpenglow the sky shifts toward, lap by lap (gfx.shiftSky): lap one is golden
   hour, lap two the sun is going, the final lap is pink light on the snow. */
const ALPENGLOW = { zenith: 0x23306e, horizon: 0xff9c7c, ground: 0xffb8a0, sun: 0xffa070, sunLight: 0xffa070, sunIntensity: 2.5, hemiSky: 0x9c9ee8, hemiGround: 0xd59c9c, hemiIntensity: 1.15, fog: 0xe8a3a0, cloud: 0xffc0ae, cloudShade: 0x8a6aa0, exposure: 1.08 };

/* The land as crest lines, [x, z, height], each falling away over `reach` metres: the massif round the
   south-east of the lap (the road climbs its east ridge and crosses its shoulder), the hill the jump is
   built on, and the west shoulder the descent runs along. */
const RIDGES = [
  { reach: 300, pts: [[345, -10, 34], [350, 175, 62], [275, 395, 112], [70, 445, 128], [-100, 420, 100], [-250, 340, 60]] },
  { reach: 62, pts: [[0, 312, 68], [0, 262, 57], [-1, 220, 35], [-2, 182, 16], [-4, 150, 4]] },
  { reach: 120, pts: [[20, 200, 30], [-120, 175, 24], [-215, 120, 16], [-225, 30, 6]] },
  { reach: 210, pts: [[90, 485, 240], [-50, 505, 205]] },                 // the horn behind the jump
  { reach: 160, pts: [[335, 335, 150], [385, 225, 118]] },               // and its east shoulder over the climb
];
function ridgeHeight(x, z) {
  let best = 0;
  for (const { reach, pts } of RIDGES) for (let k = 0; k + 1 < pts.length; k++) {
    const [ax, az, ah] = pts[k], [bx, bz, bh] = pts[k + 1];
    const dx = bx - ax, dz = bz - az, t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz)));
    const d = Math.hypot(x - (ax + dx * t), z - (az + dz * t)), f = 1 - smoothstep(0, reach, d);
    best = Math.max(best, (ah + (bh - ah) * t) * f * (0.6 + 0.4 * f));
  }
  return best;
}

export default {
  id: 'davos',
  name: 'Davos Circuit',
  tagline: 'Up the biggest mountain in the game, then off the top of it.',
  lapNotes: [`<b>The sun is going down.</b> The summit is not.`, `<b>Final lap.</b> Everything below you is now a stakeholder.`],   // shown as laps two and three begin
  laps: 3,
  width: 18,
  sky: 'golden',
  // golden hour: a low sun in the north-east, lighting the mountain's north face and the jump from the town,
  // warm haze, cool blue sky light in the snow's shadows
  skyOverrides: { zenith: 0x2d63c8, horizon: 0xffd0a0, ground: 0xffe4c6, sun: 0xffe0b0, sunDir: [0.45, 0.34, -0.83], sunLight: 0xffdcb0, sunIntensity: 3.5, hemiSky: 0xb2c8ff, hemiGround: 0xf0d4c4, hemiIntensity: 1.05, cloud: 0xfff2e4, cloudShade: 0xe2a796, cloudCover: 0.3, fog: 0xf1d0b4, fogNear: 340, fogFar: 1650, exposure: 1.02 },
  // the painted Alps (two generated strips, prompts and assembly in assets/backdrops/davos-prompts.md): the hero
  // peak stands behind the summit from the town, and dead ahead up the east ridge; a glacier massif fills the rest
  backdrop: { img: 'assets/backdrops/davos.webp', top: 25, bottom: -5, rot: 0.325 },
  // opening shots: the whole mountain from the valley, the switchbacks and the jump on its face;
  // then the top of the in-run, looking down the jump at the town
  intro: [
    { pos: [-190, 46, 30], pos1: [-170, 52, 52], look: [70, 52, 300], look1: [70, 54, 300], fov: 50, dur: 3.4 },
    { pos: [6, 80, 318], pos1: [2, 76, 300], look: [10, 20, 150], look1: [12, 10, 120], fov: 58, dur: 3.0 },
  ],
  offroad: 'snow',
  defaults: { edge: 'open', shoulder: 3.5, outer: 12 },
  path: [
    { p: [0, 0, 0], bank: 0 },                // 0 start/finish on the resort straight, heading +x
    { p: [95, 0, 2], bank: 0 },               // 1 the jets on the apron to the right
    { p: [138, 3, 12], bank: 4, w: 19 },      // 2 Jet Corner: the climb starts under the sign
    { p: [152, 10, 72], bank: 4 },            // 3 the Promenade: pop-up "houses" line the village pitch
    { p: [158, 16.5, 124], bank: 2 },         // 4 the top of the village
    { p: [162, 18, 146], bank: -4 },          // 5 Switchback One (left), round a 22 m arc
    { p: [168.4, 19.3, 161.6], bank: -9 },    // 6
    { p: [184, 20.6, 168], bank: -10 },       // 7
    { p: [199.6, 21.9, 161.6], bank: -9 },    // 8
    { p: [206, 23.2, 146], bank: -4 },        // 9 out of it, climbing back north
    { p: [207, 28, 96], bank: 3 },            // 10 Switchback Two (right)
    { p: [213.4, 29.6, 72.4], bank: 9 },      // 11
    { p: [229, 31, 66], bank: 10 },           // 12
    { p: [244.6, 32.4, 72.4], bank: 9 },      // 13
    { p: [251, 33.8, 88], bank: 4 },          // 14 out of it: the east ridge, the summit ahead
    { p: [254, 44, 170], bank: 2 },           // 15
    { p: [240, 52, 238], bank: 5 },           // 16 the ridge bends toward the top
    { p: [195, 59, 286], bank: 7 },           // 17
    { p: [120, 65, 320], bank: 5 },           // 18 the high traverse, the valley on your right
    { p: [50, 68.5, 332], bank: 6 },          // 19
    { p: [14, 70, 320], bank: 10 },           // 20 Summit Bend: the top of the world, 70 m
    { p: [1, 70, 296], bank: 2 },             // 21 the in-run starts
    { p: [0, 64, 262], bank: 0 },             // 22 THE GREAT RESET: the take-off
    { p: [-1, 41, 220], bank: 0 },            // 23 the landing hill
    { p: [-2, 22, 182], bank: 0 },            // 24 the outrun stadium
    { p: [-8, 17.5, 156], bank: -6 },         // 25 the outrun turns left
    { p: [-38, 16.5, 138], bank: -5 },        // 26
    { p: [-118, 12.5, 132], bank: 2 },        // 27 the west descent, the town on your right
    { p: [-168, 9, 100], bank: 8 },           // 28 Security Sweep, inside the perimeter fence
    { p: [-176, 6, 45], bank: 8 },            // 29 the checkpoint
    { p: [-108, 2, 8], bank: 4 },             // 30 Valley Kink: the lap exhales onto the straight
  ],
  sides: [
    { from: 30.5, to: 1.3, side: 'L', edge: 'wall' },                     // resort wall behind the grid
    { from: 30.3, to: 1.6, side: 'R', outer: 30, shoulder: 4 },           // the jet tarmac apron
    { from: 2.2, to: 4.6, side: 'L', outer: 18 },                         // the Promenade's front gardens
    { from: 5.0, to: 9.0, side: 'R', edge: 'wall' },                      // Switchback One's parapet
    { from: 10.4, to: 14.2, side: 'L', edge: 'wall' },                    // Switchback Two's parapet
    { from: 18.6, to: 21.1, side: 'L', edge: 'wall' },                    // the summit parapet
    { from: 21.1, to: 22.0, edge: 'wall' },                               // the in-run's side boards
    { from: 22.0, to: 24.1, edge: 'wall' },                               // the landing hill's side boards
    { from: 24.1, to: 25.5, edge: 'wall' },                               // the outrun stadium
    { from: 25.5, to: 26.5, side: 'R', edge: 'wall' },
    { from: 27.6, to: 29.4, side: 'L', edge: 'wall' },                    // Security Sweep's outside wall
  ],
  zones: [
    { from: 30.35, to: 1.35, skin: 'stone' },                             // resort slabs at the start
    { from: 2.5, to: 4.4, skin: 'cobble' },                               // the Promenade's cobbles
    { from: 21.05, to: 24.3, skin: 'snow' },                              // the in-run and the landing hill: a real jump's snow
  ],
  ramps: [
    { at: 21.65, len: 12, lift: 4.6, lat: -2.5, w: 13 },                   // THE GREAT RESET: the take-off table
    { at: 21.6, len: 13, lift: 6.4, lat: 6.6, w: 3.6 },                    // the big-air kicker on the left
  ],
  boosts: [
    { at: 0.55, lat: 0, w: 5 },
    { at: 9.3, lat: 0, w: 5 },                                            // out of Switchback One
    { at: 14.3, lat: 0, w: 5 },                                           // out of Switchback Two
    { at: 21.2, lat: 0, w: 9, len: 10 },                                  // the top of the in-run: feed the jump
    { at: 26.8, lat: 0, w: 5 },
  ],
  itemRows: [{ at: 1.4 }, { at: 3.6 }, { at: 15.2 }, { at: 18.4 }, { at: 26.1 }, { at: 29.0 }],
  coins: [
    { from: 0.15, to: 0.8, n: 3, lat: 4 },
    { from: 2.5, to: 3.2, n: 5, lat: [5, -3] },
    { from: 5.6, to: 8.4, n: 5, lat: 4 },                                 // Switchback One, inside line
    { from: 10.6, to: 13.4, n: 5, lat: -4 },                              // Switchback Two, inside line
    { from: 17.0, to: 18.0, n: 4, lat: -3 },
    ...[[22.3, 5.5], [22.65, 12], [22.95, 15], [23.3, 12], [23.65, 4.5]].map(([at, air]) => ({ from: at, to: at, n: 1, lat: -2, air })),   // the flight off the table
    ...[[22.4, 10], [22.75, 17], [23.1, 20], [23.45, 15]].map(([at, air]) => ({ from: at, to: at, n: 1, lat: 6.2, air })),             // the big-air line
    { from: 26.6, to: 27.4, n: 4, lat: -3 },
    { from: 28.2, to: 29.0, n: 4, lat: -5 },
    { from: 29.85, to: 30.5, n: 3, lat: 3 },
  ],
  obstacles: [
    { kind: 'patrol', model: 'plow', at: 3.5, lats: [6, 8.2], speed: 2.2, effect: 'bump', radius: 2.2 },
  ],
  terrain: {
    cell: 3, margin: 280, blend: 26, water: -5.5,
    fn(x, z) {
      const base = (fbm(x * 0.008, z * 0.008, 4, 31) - 0.5) * 6;
      let h = 2 + base + ridgeHeight(x, z) + (fbm(x * 0.03, z * 0.03, 2, 77) - 0.5) * 5 * smoothstep(20, 60, z);
      const bowl = 1 - smoothstep(0.7, 1.15, Math.hypot((x - 35) / 75, (z - 88) / 46));   // the town's valley floor
      h = lerp(h, 1 + (fbm(x * 0.02 + 5, z * 0.02, 2, 17) - 0.5) * 1.4, bowl);
      const resort = 1 - smoothstep(0.7, 1.1, Math.hypot((x - 15) / 150, (z - 8) / 50));  // the resort floor: flat for the grid, the jets, the stands
      h = lerp(h, 0.6, resort);
      const lake = 1 - smoothstep(14, 40, Math.hypot(x - 84, z - 68));                   // the frozen lake in town
      h = lerp(h, -6.4, lake);
      const ring = smoothstep(360, 600, Math.hypot(x - 30, z - 170));                    // the far Alps, in front of the painted ones
      h += ring * (22 + ridged(x * 0.009, z * 0.009, 4, 7) * 38);
      return h;
    },
    // snow light, per vertex: hollows fall blue, groomed pistes show their corduroy, exposed snow throws sparse glints
    color(x, z, h, slope, over, out) {
      if (h < -3) return;
      if (slope >= 0.5) {   // high faces stay snowy: the horn and the massif's crest should not read as bare grey rock
        const k = smoothstep(70, 130, h) * 0.7;
        out[0] += (0.93 - out[0]) * k; out[1] += (0.95 - out[1]) * k; out[2] += (0.99 - out[2]) * k;
        return;
      }
      const d = fbm(x * 0.02 + 40, z * 0.02, 2, 63), sh = (0.5 - d) * 0.24;
      out[0] -= sh * 0.6; out[1] -= sh * 0.3; out[2] += sh * 0.3;
      const piste = Math.max(1 - smoothstep(26, 50, Math.abs(x - 298)) * 1, 0) * smoothstep(60, 90, z) * (1 - smoothstep(220, 250, z))
        + (1 - smoothstep(18, 34, Math.abs(Math.abs(x) - 48))) * smoothstep(190, 220, z) * (1 - smoothstep(300, 330, z));   // the east ridge's slope and the runs beside the jump
      if (piste > 0.05 && Math.sin(x * 0.9 + z * 0.12) > 0.5) { const k = 1 - 0.07 * Math.min(1, piste); out[0] *= k; out[1] *= k; out[2] *= k * 1.01; }
      const g = Math.sin(x * 127.1 + z * 311.7) * 43758.5453;
      if (g - Math.floor(g) > 0.972) { out[0] = Math.min(1, out[0] * 1.2 + 0.05); out[1] = Math.min(1, out[1] * 1.2 + 0.05); out[2] = Math.min(1, out[2] * 1.16 + 0.04); }
    },
  },
  look: {
    road: { base: 0x4c525e, line: 0xffffff, center: 0xffd23c },
    kerb: [0xe23b3b, 0xf7f7f2],
    shoulder: 0xeef2f7,
    groundDetail: 0.06, groundScale: 2,
    terrain: { low: 0xf4f6fa, high: 0xf8fafd, dry: 0xeef2f7, rock: 0x666a7c, sand: 0xe8ecf2, dirt: 0x8a7a63, snow: 0xffffff, snowLine: -3 },
    wall: 0xf1f1ee, wallStripe: 0x1f2a44,
    water: 0xb9dff0, rail: 0xe23b3b,
    ads: ['GREAT RESET ENERGY', 'AGENDA COLA', 'STAKEHOLDER BANK', 'SUMMIT NOW, PAY LATER', 'NET ZERO* (*ISH)', 'BUILD BACK BUTTER', 'FOURTH INDUSTRIAL BREAKFAST', 'GLOBAL SHAPERS GYM', 'CONSCIOUS COCOA', 'ELITES ONLY BEYOND THIS POINT', 'PANEL 4: THE SNOW', 'PUBLIC-PRIVATE POPSICLES'],
  },
  models: { plow: M.plow },

  /** Dress the course. ctx: { THREE, track, group, gfx, anim, view } */
  decorate(ctx) { dress(ctx); },
};

const SUITS = [0xf2efe6, 0xe9e4d8, 0xdfe3ea, 0x1f2a44, 0x8a2f2a, 0x2a4a6b, 0xf6f1e4, 0x3a3f47];
const COATS = [0xe23b3b, 0x1f6bff, 0xffd23c, 0x2ee6a6, 0xff8a3c, 0x9b6bff, 0xffffff, 0x1f2a44];
const NAVY = '#1f2a44', GOLD = '#c9a227', CREAM = '#f6ead2', BROWN = '#5d3d22', RED = '#8a2f2a';

function dress(ctx) {
  const { THREE, track, anim, view, group } = ctx, sc = new Scenery(ctx), rng = sc.rng;
  const hit = makeGroundHit();
  const atlas = S.makeAtlas(group), bake = S.makeBaker(group, sc.shadows);
  const near = (x, z, p, r) => (x - p.x) ** 2 + (z - p.z) ** 2 < r * r;
  /** True when (x,z) is beyond where a kart can drive, by margin m. */
  const clear = (x, z, m = 1.5) => {
    const g = track.ground(x, z, -1, hit), i = g.i;
    if (g.onRoad) return false;
    const edge = g.side > 0 ? g.edgeL : g.edgeR;
    if (edge !== EDGE.OPEN) return g.outside > m + 0.8;
    return g.outside > (g.side > 0 ? track.outerL[i] : track.outerR[i]) + m;
  };
  const taken = [];
  const free = (x, z, r = 0) => !taken.some(t => near(x, z, t, t.r + r));
  const take = (x, z, r) => taken.push({ x, z, r });
  /** Local frame of a placement: u to its right, v forward (toward the road for beside()), y up. */
  const local = (p, u, v, y) => [p.x + Math.cos(p.yaw) * u + Math.sin(p.yaw) * v, y, p.z - Math.sin(p.yaw) * u + Math.cos(p.yaw) * v];
  const signs = new Map();
  const board = (text, opts = {}, w = 768, h = 256) => { const k = text + JSON.stringify(opts) + w + 'x' + h; if (!signs.has(k)) signs.set(k, atlas.add(w, h, S.signDraw(text, opts))); return signs.get(k); };
  /** Place and bake a static object. */
  const put = (obj, x, z, o = {}) => { sc.place(obj, x, z, o); bake.add(obj, o.cast !== false); return obj; };
  const frameMats = new Map();
  const frameMat = c => { if (!frameMats.has(c)) frameMats.set(c, new THREE.MeshStandardMaterial({ color: c, roughness: 0.5 })); return frameMats.get(c); };
  /** A free-standing sign beside the road, facing it: frame baked, face in the atlas. */
  const roadSign = (at, side, off, text, opts = {}, { w = 10, h = 2.8, legs = 3.4, frame = 0x1f2a44, tw = 768, th = 220 } = {}) => {
    const p = sc.beside(at, side, off);
    put(M.signFrame(w, h, legs, frameMat(frame)), p.x, p.z, { yaw: p.yaw, y: p.y - 0.15 });
    atlas.place(board(text, opts, tw, th), local(p, 0, 0.09, p.y - 0.15 + legs + h / 2), p.yaw, w, h);
    take(p.x, p.z, w * 0.5);
    return p;
  };

  /* ================= the start: resort straight ================= */
  const g0 = sc.beside(0, 1, -track.hwL[0]);
  const gantry = P.gantry(track.hwL[0] + track.hwR[0] + 1.5, 'DAVOS CIRCUIT', { color: 0x1f2a44, color2: 0xc9a227 });
  sc.place(gantry, g0.x, g0.z, { yaw: g0.along, y: g0.roadY });
  view.startLights = gantry.userData.lights;
  const stand = P.grandstand({ w: 30, rows: 6, color: 0x1f2a44 }), stand2 = P.grandstand({ w: 30, rows: 6, color: 0x8a2f2a });
  const seats = [], Mx = new THREE.Matrix4(), V = new THREE.Vector3();
  const putStand = (proto, p, keep = 0.8) => {
    const g = proto.group.clone(); sc.place(g, p.x, p.z, { yaw: p.yaw, y: p.y }); take(p.x, p.z, 18);
    g.updateMatrixWorld(true); Mx.copy(g.matrixWorld);
    for (const s of proto.seats) if (rng() < keep) { V.set(s[0], s[1], s[2]).applyMatrix4(Mx); seats.push({ x: V.x, y: V.y, z: V.z, yaw: p.yaw + rng.range(-0.4, 0.4) }); }
    bake.add(g);
  };
  sc.along({ from: 30.55, to: 1.25, side: 1, offset: 7, spacing: 34 }).forEach((p, i) => putStand(i % 2 ? stand2 : stand, p));
  // the hotel on the far side of the stands, its name on the roof where the grid can read it
  const hotel = sc.beside(0.42, 1, 41);
  if (clear(hotel.x, hotel.z, 16)) {
    put(M.grandHotel({ sign: false }), hotel.x, hotel.z, { yaw: hotel.yaw, y: hotel.y + 0.1 }); take(hotel.x, hotel.z, 19);
    atlas.place(board('HOTEL STAKEHOLDER', { bg: NAVY, fg: '#ffffff', kicker: 'SUITES FROM $90,000 A NIGHT', kfg: '#f2c94c', border: GOLD, size: 120 }, 1024, 300), local(hotel, 0, 4.2, hotel.y + 15.5), hotel.yaw, 20, 5.9);
  }
  const flagsN = [], flagsG = [];
  sc.along({ from: 0.14, to: 1.58, side: 1, offset: 4.2, spacing: 9 }).forEach((p, k) => (k % 2 ? flagsG : flagsN).push({ ...p, y: p.y - 0.1 }));
  sc.instances(partsOf(M.flagPole(7, { color: 0x1f2a44 })), flagsN, { cast: false });
  sc.instances(partsOf(M.flagPole(11, { color: 0xc9a227 })), flagsG, { cast: false });
  const bunt1 = sc.beside(0.82, 0, 0), bunt2 = sc.beside(1.22, 0, 0);
  put(M.bunting(track.hwL[bunt1.i] + track.hwR[bunt1.i] + 3), bunt1.x, bunt1.z, { yaw: bunt1.along, y: bunt1.y + 7.4, cast: false });
  put(M.bunting(track.hwL[bunt2.i] + track.hwR[bunt2.i] + 3, { sag: 1.4, flags: 11 }), bunt2.x, bunt2.z, { yaw: bunt2.along, y: bunt2.y + 7.2, cast: false });
  const lamps = [];
  sc.along({ from: 30.6, to: 1.5, side: 1, offset: 3.1, spacing: 12 }).forEach(p => lamps.push({ ...p, y: p.y - 0.05 }));
  sc.along({ from: 30.6, to: 1.5, side: -1, offset: 3.1, spacing: 12, phase: 6 }).forEach(p => lamps.push({ ...p, y: p.y - 0.05 }));

  // the jets on the apron, and the one coming in to land
  [[0.35, 25, 0.12], [0.95, 29, -0.06], [1.5, 24, 0.2]].forEach(([at, off, dyaw], i) => {
    const p = sc.beside(at, -1, off);
    put(M.privateJet(3 + i * 5, { accent: [0xc9a227, 0x8a2f2a, 0x1f2a44][i] }), p.x, p.z, { yaw: p.along + dyaw, y: p.y, solid: 7 });
    take(p.x, p.z, 13);
  });
  roadSign(1.85, -1, 13.5, 'PRIVATE JETS ONLY', { bg: NAVY, fg: '#ffffff', kicker: 'CLIMATE PANEL PARKING', kfg: '#f2c94c', size: 120 }, { w: 11, h: 3.2, tw: 768, th: 224 });
  {
    const jet = M.privateJet(41, { accent: 0xc9a227 }); jet.scale.setScalar(1.15); group.add(jet);
    const A = new THREE.Vector3(-520, 130, 120), B = new THREE.Vector3(80, 6, 22), D = B.clone().sub(A);
    jet.rotation.set(Math.atan2(-D.y, Math.hypot(D.x, D.z)) * 0.6, Math.atan2(D.x, D.z), 0, 'YXZ');
    const period = 24;
    anim.push((dt, time) => { const f = (time % period) / period; jet.visible = f < 0.82; jet.position.copy(A).addScaledVector(D, Math.min(1, f / 0.82)); });
  }

  /* ================= the Promenade: every shop is somebody's "House" ================= */
  const houses = [
    [2.6, 'AI HOUSE', 'FORMERLY CRYPTO HOUSE', '#1f2a44'],
    [3.02, 'CRYPTO HOUSE', 'FORMERLY A BAKERY', '#8a2f2a'],
    [3.45, 'IMPACT HOUSE', 'IMPACT TO BE CONFIRMED', '#2a4a6b'],
    [3.88, 'SUSTAINABILITY HOUSE', 'JET PARKING AT REAR', '#2e6b3c'],
    [4.3, 'FONDUE — $400', 'CHEESE OPTIONAL', BROWN],
  ];
  houses.forEach(([at, name, kicker, bg], k) => {
    const p = sc.beside(at, 1, 25.5);
    if (!clear(p.x, p.z, 4)) return;
    put(M.chalet(4 + k * 5, {}), p.x, p.z, { yaw: p.yaw + rng.range(-0.05, 0.05), y: p.y - 0.2 }); take(p.x, p.z, 10);
    // the shop sign stands out front, big enough to read at speed
    const s = sc.beside(at, 1, 19.6);
    put(M.signFrame(11.5, 3.4, 2.2, frameMat(0x3a2a1a)), s.x, s.z, { yaw: s.yaw, y: s.y - 0.15 });
    atlas.place(board(name, { bg, fg: '#ffffff', kicker, kfg: '#f2c94c', border: GOLD, size: 120 }, 1024, 300), local(s, 0, 0.09, s.y - 0.15 + 2.2 + 1.7), s.yaw, 11.5, 3.4);
  });
  const piles = [2.8, 3.7].map(at => sc.beside(at, 1, 21)).filter(p => clear(p.x, p.z, 1.5) && free(p.x, p.z, 2));
  sc.instances(partsOf(M.woodPile()), piles, {});
  // the delegates have built a panel out of snow
  const snowmen = sc.along({ from: 2.55, to: 3.5, side: -1, offset: 15, spacing: 5.5, jitter: 0.8 }).filter(p => clear(p.x, p.z, 1.5) && free(p.x, p.z, 2)).map(p => ({ ...p, yaw: p.yaw + rng.range(-0.3, 0.3) }));
  sc.instances(partsOf(M.snowman(3)), snowmen, { scale: [1.0, 1.25] });
  roadSign(3.05, -1, 15.5, 'PANEL: WHY IS IT MELTING?', { bg: '#ffffff', fg: '#1f2a44', kicker: 'SPEAKERS: SNOWMEN', kfg: '#8a2f2a', border: NAVY, size: 116 }, { w: 10, h: 3, legs: 2.6, tw: 768, th: 230 });
  roadSign(2.3, -1, 15, 'THE CLIMB IS PRIVATE TOO', { bg: BROWN, fg: CREAM, size: 118 }, { w: 11, h: 2.6, frame: 0x5d3d22 });

  /* ================= the switchbacks: huts on the parapets, a ski school ================= */
  {
    const p = sc.beside(7.0, -1, 9);   // Switchback One's outside, beyond the parapet
    if (clear(p.x, p.z, 2)) {
      put(M.chalet(21, {}), p.x, p.z, { yaw: p.yaw, y: p.y - 0.3 }); take(p.x, p.z, 9);
      atlas.place(board('GLÜHWEIN — $250', { bg: BROWN, fg: CREAM, kicker: 'PER SIP', kfg: '#f2c94c', border: GOLD, size: 120 }, 768, 230), local(p, 0, 5.4, p.y + 6.4), p.yaw, 9, 2.7);
    }
  }
  roadSign(12.0, 1, 4, 'SKI SCHOOL', { bg: '#e23b3b', fg: '#ffffff', kicker: 'LESSON ONE: BE BORN RICH', kfg: '#ffffff', size: 130 }, { w: 9, h: 3, legs: 2.4, frame: 0xe23b3b });
  const igloos = [[15.5, 18], [15.9, 23], [16.25, 18]].map(([at, off]) => sc.beside(at, 1, off)).filter(p => clear(p.x, p.z, 4));
  igloos.forEach(p => take(p.x, p.z, 7));
  sc.instances(partsOf(M.igloo()), igloos.map(p => ({ ...p, y: p.y - 0.2 })), {});
  roadSign(15.2, 1, 13.5, 'VIP IGLOO — $80,000', { bg: '#e8f3ff', fg: '#1f2a44', kicker: 'PER NIGHT · BRING A COAT', kfg: '#8a2f2a', border: NAVY, size: 118 }, { w: 9.5, h: 2.9, legs: 2.4 });

  /* ================= the high traverse and the summit ================= */
  roadSign(19.4, -1, 14, 'YOU ARE NOW ABOVE IT ALL', { bg: NAVY, fg: '#ffffff', kicker: 'ELEVATION 70 M · NET WORTH: YES', kfg: '#f2c94c', size: 118 }, { w: 11, h: 3, legs: 2.6 });
  // the gondola: from the town up to a station below the summit, cabins that actually move
  {
    const stops = [[66, 134], [76, 180], [86, 226], [94, 268], [99, 296]];
    const tops = stops.map(([x, z], k) => { const y = sc.y(x, z); return { x, z, y, top: y + (k === 0 || k === stops.length - 1 ? 9.3 : 13.85) }; });
    const yawL = Math.atan2(stops[4][0] - stops[0][0], stops[4][1] - stops[0][1]), lx = Math.cos(yawL), lz = -Math.sin(yawL);
    tops.forEach((t, k) => {
      if (k === 0 || k === tops.length - 1) {
        put(M.chalet(41 + k, {}), t.x, t.z, { yaw: k === 0 ? yawL : yawL + Math.PI, y: t.y - 0.3 }); take(t.x, t.z, 9);
      } else { put(M.gondolaPylon({ h: 14 }), t.x, t.z, { yaw: yawL + Math.PI / 2, y: t.y - 0.2 }); take(t.x, t.z, 5); }
    });
    const st = tops[tops.length - 1];
    atlas.place(board('SUMMIT LIFT — $450', { bg: NAVY, fg: '#ffffff', kicker: 'ONE WAY', kfg: '#f2c94c', border: GOLD, size: 120 }, 768, 230), [st.x - Math.sin(yawL) * 5.6, st.y + 6.3, st.z - Math.cos(yawL) * 5.6], yawL + Math.PI, 8, 2.4);
    const line = off => tops.map(t => new THREE.Vector3(t.x + lx * off, t.top, t.z + lz * off));
    const up = line(-1.6), down = line(1.6).reverse();
    for (const l of [up, down]) for (let k = 0; k + 1 < l.length; k++) { const c = M.tubeBetween(l[k].toArray(), l[k + 1].toArray(), 0.05); group.add(c); bake.add(c, false); }
    const lens = l => { const L = [0]; for (let k = 1; k < l.length; k++) L.push(L[k - 1] + l[k].distanceTo(l[k - 1])); return L; };
    const lines = [{ pts: up, L: lens(up) }, { pts: down, L: lens(down) }];
    const NC = 10, cabins = Array.from({ length: NC }, () => ({ x: 0, y: -100, z: 0, yaw: 0 }));
    const meshes = sc.instances(partsOf(M.gondolaCabin(5, { accent: 0x8a2f2a })), cabins, { cast: false });
    for (const im of meshes) im.frustumCulled = false;
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), one = new THREE.Vector3(1.25, 1.25, 1.25), pos = new THREE.Vector3();
    anim.push((dt, time) => {
      for (let i = 0; i < NC; i++) {
        const ln = lines[i % 2], tot = ln.L[ln.L.length - 1], s = (time * 3.4 + (i >> 1) * tot / (NC / 2)) % tot;
        let k = 0; while (k < ln.L.length - 2 && ln.L[k + 1] < s) k++;
        const A = ln.pts[k], B = ln.pts[k + 1], f = (s - ln.L[k]) / (ln.L[k + 1] - ln.L[k] || 1);
        pos.lerpVectors(A, B, f); pos.y -= 4.3 + Math.sin(f * Math.PI) * 1.2;
        e.set(0, Math.atan2(B.x - A.x, B.z - A.z), 0); q.setFromEuler(e); m4.compose(pos, q, one);
        for (const im of meshes) im.setMatrixAt(i, m4);
      }
      for (const im of meshes) im.instanceMatrix.needsUpdate = true;
    });
  }

  /* ================= THE GREAT RESET: the ski jump ================= */
  {
    // the tower: the landmark you see from the town, the grid, and the climb
    const tp = sc.beside(21.0, 1, 17);
    if (clear(tp.x, tp.z, 6)) {
      const tower = M.jumpTower(); put(tower, tp.x, tp.z, { yaw: 0, y: tp.y - 0.5 }); take(tp.x, tp.z, 10);
      const by = tp.y - 0.5 + tower.userData.boardY + 1, o = tower.userData.half + 0.35;
      atlas.place(board('THE GREAT RESET', { bg: NAVY, fg: '#ffffff', kicker: 'SKI JUMP · WORLD ELITE FORUM', kfg: '#f2c94c', border: GOLD, size: 130 }, 1024, 300), [tp.x, by, tp.z - o], Math.PI, 22, 6.5);
      atlas.place(board('THE GREAT RESET', { bg: NAVY, fg: '#ffffff', kicker: 'THE ONLY WAY DOWN', kfg: '#f2c94c', border: GOLD, size: 130 }, 1024, 300), [tp.x + o, by, tp.z], Math.PI / 2, 22, 6.5);
      atlas.place(board('ELITES ONLY BEYOND THIS POINT', { bg: GOLD, fg: NAVY, size: 120 }, 1024, 300), [tp.x, by, tp.z + o], 0, 22, 6.5);
    }
    // the start gantry at the top of the in-run
    const s0 = sc.beside(21.08, 0, 0);
    const startG = P.gantry(track.hwL[s0.i] + track.hwR[s0.i] + 1.5, 'TOP OF THE WORLD', { color: 0x1f2a44, color2: 0xc9a227 });
    put(startG, s0.x, s0.z, { yaw: s0.along, y: s0.roadY });
    // the take-off table dressed as a built jump: skirts, pillars, an arch at the lip
    const r = track.ramps[0], EV = new THREE.Vector3();
    const halfL = r.lat + r.half, halfR = -(r.lat - r.half);
    const liftAt = t => r.lift * (0.35 * t + 0.65 * t * t);
    const edgeAt = (t, side) => { track.pointAt(r.s0 + r.len * t, side > 0 ? halfL + 0.12 : -(halfR + 0.12), EV, liftAt(t)); return [EV.x, EV.y, EV.z]; };
    const surfAt = (t, side) => { track.pointAt(r.s0 + r.len * t, side > 0 ? halfL - 0.3 : -(halfR - 0.3), EV, 0); return EV.y; };
    const sidesE = { L: [0, 0.25, 0.5, 0.75, 1].map(t => edgeAt(t, 1)), R: [0, 0.25, 0.5, 0.75, 1].map(t => edgeAt(t, -1)) };
    const pillars = [];
    for (const side of [1, -1]) for (const t of [0.2, 0.55, 0.9]) { const e = edgeAt(t, side); pillars.push([e[0], e[2], e[1] - 0.25, surfAt(t, side) - 0.15]); }
    const iL = Math.min(track.N - 1, Math.floor((r.s0 + r.len + 0.5) / track.ds));
    const towers = [1, -1].map(side => { const hw = (side > 0 ? track.hwL[iL] : track.hwR[iL]) + 1.4; track.pointAt(r.s0 + r.len + 0.5, side * hw, EV, 0); return { x: EV.x, z: EV.z, y0: EV.y - 6, y1: EV.y + 9.5 }; });
    const yawT = track.yawAt(r.s0 + r.len);
    const jump = M.crestJump({ L: sidesE.L, R: sidesE.R, pillars, towers, travelYaw: yawT, sign: null });
    group.add(jump); bake.add(jump);
    const cx = (towers[0].x + towers[1].x) / 2, cz = (towers[0].z + towers[1].z) / 2, cy = (towers[0].y1 + towers[1].y1) / 2 - 1.4;
    const fx = Math.sin(yawT), fz = Math.cos(yawT), span = Math.hypot(towers[0].x - towers[1].x, towers[0].z - towers[1].z);
    atlas.place(board('THE GREAT RESET', { bg: NAVY, fg: '#ffffff', kicker: 'WORLD ELITE FORUM · SESSION 1', kfg: '#f2c94c', border: GOLD, size: 130 }, 1024, 260), [cx - fx * 0.45, cy, cz - fz * 0.45], yawT + Math.PI, span - 0.4, 3.8);
    atlas.place(board('ENJOY THE VIEW. WE OWN IT.', { bg: GOLD, fg: NAVY, size: 120 }, 1024, 200), [cx + fx * 0.45, cy, cz + fz * 0.45], yawT, span - 0.4, 3.0);
    // the big-air kicker's own sign
    const k0 = sc.beside(21.4, 1, 1.2);
    put(M.signFrame(5.5, 2, 2.6, frameMat(0xe23b3b)), k0.x, k0.z, { yaw: k0.along + Math.PI, y: k0.roadY });
    atlas.place(board('BIG AIR →', { bg: '#e23b3b', fg: '#ffffff', size: 140, lines: 1 }, 512, 186), local({ ...k0, yaw: k0.along + Math.PI }, 0, 0.09, k0.roadY + 2.6 + 1), k0.along + Math.PI, 5.5, 2);
    // the landing hill: the K-line, distance boards, flags down both sides, a judges' tower
    for (const [at, txt] of [[22.55, '90 M'], [22.9, '120 M'], [23.25, 'K 140']]) {
      for (const side of [1, -1]) { const p = sc.beside(at, side, 3); atlas.place(board(txt, { bg: '#ffffff', fg: '#e23b3b', border: '#e23b3b', size: 130, lines: 1 }, 384, 160), local(p, 0, 0.1, p.y + 1.1), p.yaw, 3.6, 1.5); }
    }
    const flagsL = sc.along({ from: 22.15, to: 24.0, side: 1, offset: 2.4, spacing: 7 }), flagsR = sc.along({ from: 22.15, to: 24.0, side: -1, offset: 2.4, spacing: 7, phase: 3.5 });
    sc.instances(partsOf(M.flagPole(13, { color: 0xe23b3b })), [...flagsL, ...flagsR].map(p => ({ ...p, y: p.y - 0.1 })), { cast: false });
    const jt = sc.beside(22.35, -1, 14);
    if (clear(jt.x, jt.z, 3)) {
      put(M.watchtower({ h: 12 }), jt.x, jt.z, { yaw: jt.yaw, y: jt.y - 0.2 }); take(jt.x, jt.z, 6);
      atlas.place(board('JUDGES', { bg: NAVY, fg: '#ffffff', kicker: 'SCORING ON NET WORTH', kfg: '#f2c94c', size: 120 }, 512, 200), local(jt, 0, 2.6, jt.y + 9.6), jt.yaw, 5, 1.95);
    }
    // the outrun stadium: stands both sides, the panel stage straight ahead
    for (const [at, side] of [[24.3, 1], [24.3, -1], [24.85, 1]]) { const p = sc.beside(at, side, 4); putStand(side > 0 ? stand2 : stand, p, 0.9); }
  }
  let screenSign = null;
  {
    const sx = 6, sz = 112, sy = sc.y(sx, sz);
    if (clear(sx, sz, 10)) {
      screenSign = dynSign(THREE, 1024, 400, (g, w, h, lap, last) => {
        g.fillStyle = '#101623'; g.fillRect(0, 0, w, h);
        g.fillStyle = '#c9a227'; g.fillRect(0, 0, w, 18); g.fillRect(0, h - 18, w, 18);
        S.fitText(g, 'THE GREAT RESET', w / 2, h * 0.36, w - 60, 120, S.FONT, '#ffffff', { lines: 1 });
        const sub = last ? 'FINAL PANEL: WHO MELTED THE SNOW?' : lap >= 2 ? 'PANEL 5: LUNCH (PRIVATE)' : 'PANEL 4: OWNING THE SNOW';
        S.fitText(g, sub, w / 2, h * 0.72, w - 80, 64, S.SANS, '#9fd4e8', { lines: 1 });
      });
      const sg = M.panelStage({ screenMat: screenSign.mat });
      sc.place(sg, sx, sz, { yaw: 0, y: sy - 0.15 }); take(sx, sz, 17);
      sg.updateMatrixWorld(true);
      const audM = new THREE.Matrix4().copy(sg.matrixWorld), audV = new THREE.Vector3(), aud = [];
      for (let rI = 0; rI < 3; rI++) for (let i = 0; i < 9; i++) if (rng() < 0.8) { audV.set((i - 4) * 2.6 + rng.range(-0.5, 0.5), 0.68, 8.5 + rI * 2.2 + rng.range(-0.3, 0.3)).applyMatrix4(audM); aud.push({ x: audV.x, y: audV.y, z: audV.z, yaw: Math.PI + rng.range(-0.3, 0.3) }); }
      sc.instances(partsOf(P.spectator()), aud, { scale: [0.95, 1.2], tints: SUITS, cast: false });
      const screen = sg.children.find(o => o.material === screenSign.mat);
      if (screen) sg.remove(screen);
      bake.add(sg);
      if (screen) { screen.applyMatrix4(audM); group.add(screen); }
    }
  }

  /* ================= the town: the World Elite Forum, in the valley ================= */
  {
    const hx = 30, hz = 82, hy = sc.y(hx, hz);
    put(M.congressHall(), hx, hz, { yaw: 0, y: hy - 0.2 }); take(hx, hz, 40);
    // the name on the roof, both ways: up the hill to the jump, and down to the grid
    const wef = board('WORLD ELITE FORUM', { bg: '#ffffff', fg: NAVY, kicker: 'ANNUAL MEETING OF THE ALREADY RICH', kfg: '#8a2f2a', border: GOLD, size: 130 }, 1024, 300);
    atlas.place(wef, [hx, hy + 17.5, hz + 0.4], 0, 42, 12.3);
    atlas.place(wef, [hx, hy + 17.5, hz - 0.4], Math.PI, 42, 12.3);
    for (const dx of [-15, 15]) { const post = S.post(7, 0.3, 0x3c424c); sc.place(post, hx + dx, hz, { y: hy + 10.5 }); bake.add(post); }
    atlas.place(board('IMPROVING THE STATE OF OUR PORTFOLIOS', { bg: NAVY, fg: '#ffffff', size: 110 }, 1024, 130), [hx, hy + 9.2, hz + 15.8], 0, 40, 5);
    // the town around it: chalets, the hotel's cousins, a church
    const homes = [], big = [];
    for (let k = 0; k < 140 && homes.length + big.length < 36; k++) {
      const a = rng() * Math.PI * 2, rr = 0.42 + rng() * 0.55, x = 35 + Math.cos(a) * rr * 78, z = 88 + Math.sin(a) * rr * 48;
      if (Math.hypot(x - 84, z - 68) < 30 || !clear(x, z, 10) || !free(x, z, 8)) continue;
      take(x, z, 7.5); (rng() < 0.16 ? big : homes).push({ x, y: sc.y(x, z) - 0.25, z, yaw: Math.atan2(hx - x, hz - z) + rng.range(-0.5, 0.5) });
    }
    sc.instances(partsOf(M.chalet(77, {})), homes, { scale: [0.85, 1.15] });
    sc.instances(partsOf(M.grandHotel({ sign: false })), big, { scale: [0.55, 0.7] });
    const ch = { x: -12, z: 70 }; if (clear(ch.x, ch.z, 6) && free(ch.x, ch.z, 6)) { put(M.chapel(), ch.x, ch.z, { yaw: 2.4, y: sc.y(ch.x, ch.z) - 0.1 }); take(ch.x, ch.z, 8); }
    // the frozen lake: skaters going round, and a sign for the grid
    const skaters = Array.from({ length: 9 }, () => ({ x: 0, y: -100, z: 0, yaw: 0 }));
    const sm = sc.instances(partsOf(M.skier({ skis: false })), skaters, { tints: COATS, cast: false });
    for (const im of sm) im.frustumCulled = false;
    const ice = -5.5 + 0.02, m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), one = new THREE.Vector3(1.2, 1.2, 1.2), pos = new THREE.Vector3();
    anim.push((dt, time) => {
      for (let i = 0; i < skaters.length; i++) {
        const a = time * (0.28 + (i % 3) * 0.05) + i * 0.7, rr = 7 + (i % 4) * 3;
        pos.set(84 + Math.cos(a) * rr * 1.2, ice, 68 + Math.sin(a) * rr); e.set(0, -a, 0.2); q.setFromEuler(e); m4.compose(pos, q, one);
        for (const im of sm) im.setMatrixAt(i, m4);
      }
      for (const im of sm) im.instanceMatrix.needsUpdate = true;
    });
    const cs = { x: 84, z: 40, yaw: Math.PI }; cs.y = sc.y(cs.x, cs.z);
    if (clear(cs.x, cs.z, 2)) {
      put(M.signFrame(14, 4, 2.4, frameMat(0x2a4a6b)), cs.x, cs.z, { yaw: cs.yaw, y: cs.y - 0.2 });
      atlas.place(board('CURLING — STONES SOLD SEPARATELY', { bg: '#e8f3ff', fg: '#1f2a44', kicker: 'DAVOS ICE CLUB · MEMBERS ONLY', kfg: '#8a2f2a', border: '#2a4a6b', size: 116 }, 1024, 290), local(cs, 0, 0.09, cs.y - 0.2 + 4.4), cs.yaw, 14, 4);
    }
  }

  /* ================= the west descent: carbon offsets, the heli-taxi ================= */
  {
    const p = roadSign(26.7, 1, 14, 'CARBON OFFSET FOREST', { bg: '#2e6b3c', fg: '#ffffff', kicker: 'OFFSETS ONE (1) JET, PARTLY', kfg: '#f2c94c', size: 118 }, { w: 10, h: 3, legs: 2.4, frame: 0x2e6b3c });
    const saplings = [-3.2, 0, 3.2].map(u => { const [x, , z] = local(p, u, -3.4, 0); return { x, y: sc.y(x, z), z, yaw: rng() * 6 }; });
    sc.instances(partsOf(M.snowPine(51, { h: 1.6 })), saplings, {});
  }
  const pad = { x: -86, z: 100 }; pad.y = sc.y(pad.x, pad.z);
  if (clear(pad.x, pad.z, 6)) {
    const disc = new THREE.Mesh(new THREE.CylinderGeometry(7, 7.4, 0.5, 28), frameMat(0x3c424c));
    disc.position.set(pad.x, pad.y + 0.05, pad.z); group.add(disc); bake.add(disc, false);
    atlas.place(board('H', { bg: '#3c424c', fg: '#ffffff', border: '#f2c94c', size: 200, lines: 1, shadow: false }, 256, 256), [pad.x, pad.y + 0.32, pad.z], 0, 8, 8, -Math.PI / 2);
    take(pad.x, pad.z, 9);
    const heli = M.helicopter(); heli.position.set(pad.x, pad.y + 0.3, pad.z); group.add(heli);
    const R = heli.userData.rotor, T = heli.userData.tail, C = { x: 40, z: 150 }, RR = 120;
    anim.push((dt, time) => {
      R.rotation.y += dt * 22; T.rotation.x += dt * 30;
      const f = (time % 32) / 32;   // sit, lift, a lap of the valley up past the jump, land
      const ox = C.x + Math.cos(Math.PI) * RR, oz = C.z + Math.sin(Math.PI) * RR * 0.9;
      if (f < 0.22) { heli.position.set(pad.x, pad.y + 0.3, pad.z); heli.rotation.set(0, 0.6, 0); }
      else if (f < 0.32) { const k = (f - 0.22) / 0.1; heli.position.set(lerp(pad.x, ox, k), pad.y + 0.3 + k * k * 46, lerp(pad.z, oz, k)); heli.rotation.set(0.1 * k, 0.6 - k * 0.6, 0); }
      else if (f < 0.9) { const a = Math.PI + (f - 0.32) / 0.58 * Math.PI * 2; heli.position.set(C.x + Math.cos(a) * RR, pad.y + 46 + Math.sin(a * 2) * 8, C.z + Math.sin(a) * RR * 0.9); heli.rotation.set(0.12, -a, 0); }
      else { const k = (f - 0.9) / 0.1; heli.position.set(lerp(ox, pad.x, k), pad.y + 0.3 + (1 - k) ** 2 * 46, lerp(oz, pad.z, k)); heli.rotation.set(0, 0.6, 0); }
    });
    roadSign(27.15, -1, 13, 'HELI-TAXI TO LUNCH', { bg: NAVY, fg: '#ffffff', kicker: '400 METRES · $9,000', kfg: '#f2c94c', size: 118 }, { w: 10, h: 2.9, legs: 2.4 });
  }

  /* ================= skiers on the pistes ================= */
  {
    const runs = [];
    for (let i = 0; i < 7; i++) runs.push({ cx: 288 + (i % 3) * 9, z0: 230 - i * 8, z1: 95 + i * 5, ph: i * 1.7, w: 7 + (i % 3) * 2, sp: 0.022 + (i % 4) * 0.004 });
    for (let i = 0; i < 6; i++) runs.push({ cx: (i % 2 ? 46 : -46) + (i % 3) * 3, z0: 318, z1: 200, ph: i * 2.3, w: 6, sp: 0.026 + (i % 3) * 0.004 });
    const sk = runs.map(() => ({ x: 0, y: -100, z: 0, yaw: 0 }));
    const meshes = sc.instances(partsOf(M.skier()), sk, { tints: COATS, cast: false });
    for (const im of meshes) im.frustumCulled = false;
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), sc3 = new THREE.Vector3(1.4, 1.4, 1.4), pos = new THREE.Vector3();
    anim.push((dt, time) => {
      runs.forEach((r, i) => {
        const f = (time * r.sp + r.ph) % 1, z = lerp(r.z0, r.z1, f), w = Math.sin(f * 18 + r.ph), x = r.cx + w * r.w;
        const dx = Math.cos(f * 18 + r.ph) * r.w * 18 * r.sp, dz = (r.z1 - r.z0) * r.sp;
        pos.set(x, sc.y(x, z) + 0.05, z);
        e.set(0, Math.atan2(dx, dz), w * 0.35); q.setFromEuler(e); m4.compose(pos, q, sc3);
        for (const im of meshes) im.setMatrixAt(i, m4);
      });
      for (const im of meshes) im.instanceMatrix.needsUpdate = true;
    });
  }

  /* ================= the security perimeter ================= */
  roadSign(27.45, 1, 13, 'SECURITY PERIMETER — SMILE', { bg: RED, fg: '#ffffff', kicker: 'YOUR FACE IS NOW ON THE AGENDA', kfg: '#f2c94c', size: 118 }, { w: 11, h: 3, frame: 0x8a2f2a });
  const tw = sc.beside(28.4, -1, 19);
  const tower = M.watchtower({ h: 16 });
  sc.place(tower, tw.x, tw.z, { yaw: tw.yaw, y: tw.y - 0.2 }); take(tw.x, tw.z, 6);
  const beam = tower.userData.beam;
  anim.push((dt, time) => { beam.rotation.y = Math.sin(time * 0.32) * 1.0; beam.rotation.x = -0.12 + Math.sin(time * 0.83) * 0.06; });
  const chk = sc.beside(29.25, 0, 0);
  put(M.checkpoint(track.hwL[chk.i] + track.hwR[chk.i] + 7), chk.x, chk.z, { yaw: chk.along, y: chk.roadY });
  for (const [at, side] of [[28.9, 1], [29.6, -1]]) { const f = sc.beside(at, side, 10.5); put(M.floodlight(), f.x, f.z, { yaw: f.yaw, y: f.y - 0.1 }); take(f.x, f.z, 3); }
  const van = sc.beside(29.5, -1, 14.5);
  if (clear(van.x, van.z, 4)) { put(M.securityVan(), van.x, van.z, { yaw: van.along + 0.12, y: van.y - 0.05 }); take(van.x, van.z, 4); }
  sc.along({ from: 29.25, to: 30.5, side: -1, offset: 3.3, spacing: 11 }).forEach(p => lamps.push({ ...p, y: p.y - 0.05 }));
  sc.along({ from: 29.6, to: 30.5, side: 1, offset: 3.3, spacing: 11, phase: 5 }).forEach(p => lamps.push({ ...p, y: p.y - 0.05 }));
  sc.instances(partsOf(M.lampPost()), lamps, { cast: false });
  const fence = [...sc.along({ from: 27.3, to: 29.5, side: 1, offset: 1.6, spacing: 4.4 }), ...sc.along({ from: 28.0, to: 29.5, side: -1, offset: 1.6, spacing: 4.4, phase: 2.2 })];
  sc.instances(partsOf(M.fencePanel()), fence, { cast: false });

  /* ================= the valley floor ================= */
  const ch5 = sc.beside(30.1, -1, 26);
  if (clear(ch5.x, ch5.z, 8) && free(ch5.x, ch5.z, 8)) {
    put(M.chalet(26, {}), ch5.x, ch5.z, { yaw: ch5.yaw, y: ch5.y - 0.2 }); take(ch5.x, ch5.z, 10);
    atlas.place(board('SKI VALET — $180', { bg: BROWN, fg: CREAM, kicker: 'WE CARRY YOUR SKIS. AND YOU.', kfg: '#f2c94c', border: GOLD, size: 120 }, 768, 230), local(ch5, 0, 5.4, ch5.y + 6.4), ch5.yaw, 9, 2.7);
  }

  /* ================= the road's edges: snow poles, plowed drifts ================= */
  const poles = [];
  for (const side of [1, -1]) sc.along({ from: 2.3, to: 21.0, side, offset: 1.6, spacing: 13, phase: side > 0 ? 0 : 6.5 }).forEach(p => {
    if ((side > 0 ? track.edgeL[p.i] : track.edgeR[p.i]) === EDGE.OPEN) poles.push({ ...p, y: p.y - 0.05 });
  });
  for (const side of [1, -1]) sc.along({ from: 25.6, to: 29.2, side, offset: 1.6, spacing: 13, phase: side > 0 ? 0 : 6.5 }).forEach(p => {
    if ((side > 0 ? track.edgeL[p.i] : track.edgeR[p.i]) === EDGE.OPEN) poles.push({ ...p, y: p.y - 0.05 });
  });
  sc.instances(partsOf(M.snowPole()), poles, { cast: false });
  const drifts = [];
  for (const side of [1, -1]) for (const [a, b] of [[1.7, 4.8], [9.3, 10.4], [14.3, 20.9], [25.6, 29.3]]) sc.along({ from: a, to: b, side, offset: 8, spacing: 10, jitter: 1.4 }).forEach(p => {
    if ((side > 0 ? track.edgeL[p.i] : track.edgeR[p.i]) !== EDGE.OPEN || !free(p.x, p.z, 2)) return;
    drifts.push({ ...p, y: p.y, yaw: p.yaw + Math.PI / 2 + rng.range(-0.25, 0.25) });
  });
  sc.instances(partsOf(M.snowBank(2)), drifts, { scale: [0.6, 0.95], sink: 0.15, cast: false });

  // ---- pines on the slopes (not on the pistes, not in town), rocks where the mountain shows through ----
  const pineA = partsOf(M.snowPine(3)), pineB = partsOf(M.snowPine(11, { h: 11 }));
  const pineC = partsOf(M.snowPine(23, { h: 13 })), pineD = partsOf(M.snowPine(31, { h: 6.5 }));
  const inTown = (x, z) => Math.hypot((x - 35) / 80, (z - 88) / 50) < 1.05;
  const onPiste = (x, z) => (Math.abs(x - 298) < 34 && z > 70 && z < 245) || (Math.abs(Math.abs(x) - 48) < 26 && z > 190 && z < 325) || Math.abs(x) < 22 && z > 160 && z < 300;
  const pines = sc.scatter({ count: 560, min: 13, max: 250, maxSlope: 1.25, minGap: 6, where: (x, z) => clear(x, z, 1.5) && free(x, z, 3) && !inTown(x, z) && !onPiste(x, z) });
  const pineSets = [pineA, pineB, pineC, pineD];
  pineSets.forEach((set, v) => sc.instances(set, pines.filter((_, i) => i % 4 === v), { scale: [0.8, 1.35], yaw: 'random', sink: 0.2 }));
  const rowSpots = [
    ...sc.along({ from: 2.4, to: 4.6, side: -1, offset: 10, spacing: 7.5, jitter: 2 }),
    ...sc.along({ from: 9.2, to: 10.4, side: 1, offset: 7, spacing: 6.4, jitter: 1.8 }),
    ...sc.along({ from: 14.4, to: 18.4, side: -1, offset: 7.5, spacing: 7, jitter: 1.8 }),
    ...sc.along({ from: 16.6, to: 20.6, side: 1, offset: 6, spacing: 7, jitter: 2.4 }),
    ...sc.along({ from: 16.6, to: 20.6, side: 1, offset: 16, spacing: 8, jitter: 3, phase: 4 }),
    ...sc.along({ from: 9.4, to: 10.3, side: -1, offset: 8, spacing: 7, jitter: 2 }),
    ...sc.along({ from: 26.0, to: 27.5, side: -1, offset: 7, spacing: 6.6, jitter: 1.8 }),
    ...sc.along({ from: 29.8, to: 30.5, side: 1, offset: 8, spacing: 7, jitter: 1.6 }),
  ].filter(p => free(p.x, p.z, 2) && clear(p.x, p.z, 0.5) && !onPiste(p.x, p.z));
  pineSets.forEach((set, v) => sc.instances(set, rowSpots.filter((_, i) => i % 4 === v), { scale: [0.8, 1.3], yaw: 'random', sink: 0.2 }));
  const rocks = sc.scatter({ count: 80, min: 14, max: 200, maxSlope: 1.4, minGap: 9, where: (x, z) => clear(x, z, 1.5) && free(x, z, 3) && !inTown(x, z) });
  sc.instances(partsOf(P.rock(5, { color: 0x666a7c })), rocks, { scale: [0.9, 2.4], yaw: 'random', sink: 0.35 });

  // ---- balloons over the valley: the other way to arrive ----
  const bal1 = P.balloon([0x1f2a44, 0xc9a227], 2), bal2 = P.balloon([0x8a2f2a, 0xf4f6f8], 6);
  sc.place(bal1, -70, 60, { y: 58 }); sc.place(bal2, 120, 140, { y: 84 });
  anim.push((dt, time) => { bal1.position.y = 58 + Math.sin(time * 0.24) * 2.2; bal2.position.y = 84 + Math.sin(time * 0.19 + 2) * 2.6; });

  // ---- arrow boards on the outside of every real corner (baked) ----
  for (const c of track.corners) {
    const side = c.dir > 0 ? -1 : 1, n = Math.max(2, Math.min(5, Math.round(c.len / 15)));
    for (let k = 0; k < n; k++) {
      const i = (c.i0 + Math.round(((k + 0.6) / n) * (c.len / track.ds))) % track.N;
      const edge = side > 0 ? track.edgeL[i] : track.edgeR[i];
      const p = sc.beside(track.cp[i], side, edge === EDGE.OPEN ? (side > 0 ? track.outerL[i] : track.outerR[i]) + 1.2 : 1.2);
      const b = P.chevronBoard(0xe23b3b); if (c.dir > 0) b.scale.x = -1;
      sc.place(b, p.x, p.z, { yaw: p.yaw, lift: edge === EDGE.OPEN ? 0.9 : 1.2 }); bake.add(b, false);
    }
  }

  // ---- billboards where you are looking anyway ----
  [[1.95, -1, 17, 'SUMMIT NOW, PAY LATER'], [10.0, 1, 16, 'CONSCIOUS COCOA'], [16.8, -1, 16, 'NO PUBLIC MONEY BEYOND THIS POINT'], [25.9, 1, 14, 'BUILD BACK BUTTER'], [28.2, -1, 30, 'AGENDA COLA']].forEach(([at, side, off, text], i) => {
    const p = sc.beside(at, side, off);
    if (!clear(p.x, p.z, 3)) return;
    const tex = bannerTexture([text], i + 21); tex.repeat.set(0.25, 1);
    put(P.billboard(tex, { w: 15, h: 5, legs: 6, frame: 0x1f2a44 }), p.x, p.z, { yaw: p.yaw + rng.range(-0.1, 0.1) });
  });

  atlas.flush();
  bake.flush();

  /* ================= lap by lap (#121): the sun goes down ================= */
  let lapDrawn = 0, glowT = 0, glowWant = 0;
  anim.push((dt) => {
    const lap = view.showLap || 1, last = !!view.finalLap;
    if (lap !== lapDrawn) { lapDrawn = lap; glowWant = last ? 1 : lap >= 2 ? 0.45 : 0; if (screenSign) screenSign.redraw(lap, last); }
    if (Math.abs(glowWant - glowT) > 1e-3) {
      glowT += Math.sign(glowWant - glowT) * Math.min(Math.abs(glowWant - glowT), dt * 0.18);
      ctx.gfx?.shiftSky?.(ALPENGLOW, glowT);
      M.WINDOW.emissiveIntensity = 1.1 + glowT * 1.6;
    }
  });
}

/** A sign with a canvas of its own, redrawn when the lap changes. draw(g, w, h, lap, last). */
function dynSign(THREE, cw, ch, draw) {
  const c = document.createElement('canvas'); c.width = cw; c.height = ch;
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
  const mat = new THREE.MeshStandardMaterial({ map: tex, emissiveMap: tex, emissive: 0xffffff, emissiveIntensity: 0.5, roughness: 0.4 });
  let lap = 1, last = false;
  const s = { mat, redraw(l = lap, f = last) { lap = l; last = f; draw(c.getContext('2d'), cw, ch, lap, last); tex.needsUpdate = true; } };
  s.redraw();
  if (document.fonts?.ready) document.fonts.ready.then(() => s.redraw());
  return s;
}
