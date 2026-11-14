/* Datacenter Dash: the finale of the first cup. A hyperscale AI campus in a pine
   valley on a hazy afternoon. The main drag runs into Training Hall 9 and you
   drive through the data hall itself, between rows of blinking racks. Out the
   back, a jump over the coolant pond, then the shore road: a U round the
   reservoir with the water right beside you, while fat blue pipes drink it
   (half of it per lap). On the last lap the bed is dry and you can cut straight
   across it. Then a switchback run back down past the transformer yard. Two gas plants belch
   smoke over the skyline so the whole thing can stay online. */
import { fbm, smoothstep, clamp, lerp, makeRng } from '../core/util.js';
import { Scenery, partsOf } from '../render/scenery.js';
import { makeGroundHit, EDGE } from '../track/track.js';
import { ModelBuilder, box, cyl, plastic, glow } from '../models/build.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import * as P from '../models/props.js';
import * as D from '../models/props-datacenter-dash.js';

const POND = { x: 182, z: -208, rx: 62, rz: 78 };
/* The reservoir: a basin north of the dam, ringed by the shore road (a U open toward the dam).
   Straight sides of half-width RX, a round north end of radius RN beyond zN. The bed is a bowl with a
   flat floor (the final-lap shortcut) and a crater round the intakes where the last puddle sits.
   Water levels: full on lap 1, about half on lap 2, a puddle on the last. */
const LAKE = { cx: -15, zDam: -342, zN: -415, RX: 74, RN: 72, bed: 0.2, rim: 10.9, full: 10.0, low: 0.8, floor: 2.6, crater: { x: 8, z: -420, rx: 34, rz: 26 } };
const VALLEY = { x: 20, z: -140, rx: 255, rz: 215 };      // flat campus floor
const YARD = { x0: -112, x1: -22, z0: -224, z1: -180 };      // transformer yard between the switchback legs
/* Training Hall 9: the box the road drives through (axis aligned), its two doorways, and its floor level. */
const HB = { x0: 100.5, x1: 196, z0: -141.3, z1: 20, H: 13, ceil: 10.8, door: 8.6, fy: -0.15 };
const ENTRY = { z0: -11.5, z1: 11 }, EXIT = { x0: 160.5, x1: 183.5 };
/* Campus halls (centre, yaw, length, width, height, accent, company sign). The ground around each is paved. */
const HALLS = [
  { x: 30, z: -88, yaw: 0, L: 92, W: 26, H: 15, c: 0x1f6bff, name: 'OMNIMIND' },
  { x: 60, z: -175, yaw: 0, L: 64, W: 24, H: 14, c: 0x16a34a, name: 'THIRSTCOMPUTE', mural: 'WATER: 100% RECYCLED (INTO STEAM)' },
  { x: 55, z: -245, yaw: 0, L: 56, W: 24, H: 13, c: 0xff6a00, name: 'NEURAL ACRES', mural: 'YOUR JOB, NOW AS A SERVICE' },
  { x: 255, z: -55, yaw: Math.PI / 2, L: 84, W: 26, H: 15, c: 0x7b5cff, name: 'HYPERSCALE HOLDINGS', mural: 'OUR CHATBOT SAYS THE LAKE IS FINE' },
  { x: 232, z: 70, yaw: 0, L: 64, W: 24, H: 13, c: 0x0ea5e9, name: 'CLOUDSINK', mural: 'PRIVACY POLICY: LOL' },
  { x: -225, z: 55, yaw: -0.5, L: 64, W: 24, H: 13, c: 0xdb2777, name: 'INFINITE TOKENS', mural: 'HALLUCINATIONS INCLUDED FREE' },
];
/* Gas plants: centre, yaw (front faces the track), pad height, company name. */
const PLANTS = [
  { x: 338, z: 34, yaw: -Math.PI / 2, y: 5, name: 'GASLIGHT ENERGY', line: "IT'S NOT SMOKE, IT'S CLOUD COMPUTING", color: 0xd8442c, seed: 5 },
  { x: -318, z: -262, yaw: Math.PI / 2, y: 14, name: 'PEAKER PLANT 2', line: 'ALWAYS PEAKING', color: 0xf0a020, seed: 9 },
];
const WIND = [-1.2, 0, -3.4], PLANT_SCALE = 1.45;
/** Local (u along the hall, v across it) coordinates of a point relative to a hall. */
const hallUV = (h, x, z) => { const dx = x - h.x, dz = z - h.z, c = Math.cos(h.yaw), s = Math.sin(h.yaw); return [dx * c - dz * s, dx * s + dz * c]; };
/** Basin coordinate: 0 down the middle, 1 at the rim. */
const lakeE = (x, z) => Math.hypot((x - LAKE.cx) / LAKE.RX, Math.max(0, (LAKE.zN - z) / LAKE.RN));
/** Bed height: a bowl, with a flat floor in the middle that dips into a crater round the intakes. */
function lakeBed(x, z, e) {
  const bowl = LAKE.bed + (LAKE.rim - LAKE.bed) * Math.pow(clamp((e - 0.1) / 0.9, 0, 1), 1.5);
  const C = LAKE.crater, d = Math.hypot((x - C.x) / C.rx, (z - C.z) / C.rz);
  return Math.max(bowl, lerp(LAKE.bed, LAKE.floor, smoothstep(0.25, 1.0, d)));
}
const lakeLevel = (lap, laps) => lap > laps ? LAKE.low - 0.4 : lerp(LAKE.full, LAKE.low, clamp((lap - 1) / Math.max(1, laps - 1), 0, 1));
const lakePct = y => Math.round(clamp((y - 0.6) / (LAKE.full - 0.6), 0, 1) * 100);
/* The hillside round the reservoir is cut into benches, and every bench is lined with shipping-container data
   centres looking down at the water. Bench k is flat from BENCH.e0 + k * de to about 70% of the way to the next. */
const BENCH = { e0: 1.42, de: 0.16, rise: 6, n: 4 };
const benchLevel = e => { if (e < BENCH.e0) return Infinity; const u = (e - BENCH.e0) / BENCH.de, k = Math.floor(u); return LAKE.rim + 1.5 + BENCH.rise * (k + smoothstep(0.7, 1, u - k)); };

/* ---------- the indoor campus ----------
   More than half the lap is indoors (Roger, 13 Nov: "at least half of the race ... inside data centers, physically
   driving through racks of servers"). Training Hall 9 is the axis-aligned box built by trainingHall(); the other
   four are road-following buildings from roadHall() below, each with its own light: the keynote arena round the
   start (magenta), the chiller plant up the climb (teal), the GPU hall down the west shore (red), and Hall 2, the
   inference floor, round the back (blue). The road does not move; each stretch is a tunnel zone, so its edges
   are walls. Every rack wears the one shared rack material (rackKit), so all halls blink in sync for one draw. */
const HALL_DEFS = [
  { id: 'arena', from: 26.45, to: 1.1, wide: 'all', wideL: 12, wideR: 23.5, up: 15, upWide: 15, skin: 'carpet',
    panel: ['#221a33', '#2c2242', '#140f1f', '#ff3dbb'], glow: 0xff7ad6, band: 0x3dc8ff, accent: 0xff3dbb, gantries: false,
    signIn: null, signOut: null, gables: [true, true] },
  { id: 'chiller', from: 6.0, to: 9.15, narrow: 7.8, up: 10.5, rackRows: 1, skin: 'metal',
    panel: ['#15302e', '#1c3d3a', '#0d1f1d', '#3dffd0'], glow: 0x8dffe4, band: 0x3dffd0, accent: 0x16a39a,
    portal: ['NOW HIRING', '0 HUMANS', '#28d6ca'], signIn: ['CHILLER PLANT 3', '#7dffe0'], signOut: ['NEXT: THE LAKE (FOR NOW)', '#ffd23c'], jokes: ['PRESSURE: YES', 'COOLANT: 112% OF A LAKE', 'DO NOT LICK THE PIPES'] },
  { id: 'gpu', from: 15.0, to: 17.55, narrow: 7.4, up: 10.8, skin: 'metal', rowGlow: 0xff3a1a,   // dark metal floor under the red light (#238: the white hallfloor tile killed the look)
    panel: ['#2a1416', '#38191c', '#1a0c0e', '#ff5a2a'], glow: 0xffb08a, band: 0xff4a2a, accent: 0xe23b3b,
    portal: ['NOW TRAINING', 'ON YOU', '#ff7847'], signIn: ['GPU HALL · 41°C AND RISING', '#ff8a5c'], signOut: ['COOL DOWN AHEAD (NOT REALLY)', '#ffd23c'], jokes: ['WE BOUGHT ALL OF THEM', 'FAN SPEED: YES', 'SPICY TENSORS INSIDE'] },
  { id: 'inference', from: 21.85, to: 26.45, wide: [23.5, 26.1], wideIn: 9.5, wideOut: 16, inAt: 24.0, narrow: 4.6, up: 9.8, upWide: 11.8, skin: 'neon',
    panel: ['#1d2333', '#262e42', '#121620', '#3dc8ff'], glow: 0x9fe6ff, band: 0x9fe6ff, accent: 0x1f6bff, tanks: [24.42, 25.2],
    signIn: ['HALL 2 · INFERENCE', '#7fd0ff'], signOut: ['NOW LEAVING THE CLOUD', '#ffd23c'], signOutSub: 'NEXT: THE KEYNOTE (ATTENDANCE MANDATORY)',
    jokes: ['PLEASE HOLD. YOUR LAP IS IMPORTANT TO US', 'TRAINING RUN 7 OF ∞', 'NO GPUs WERE HARMED (MOST)', 'THIS HALL RUNS ON YOUR LAKE'] },
];
/** Lap ranges that are indoors, Hall 9 included: for the tunnel zones, and for the sim/report. */
const HALL_RANGES = [...HALL_DEFS.map(h => ({ id: h.id, from: h.from, to: h.id === 'arena' ? 1.15 : h.to, skin: h.skin })), { id: 'hall9', from: 1.15, to: 4.0, skin: 'hallfloor' }];
const inCpRange = (c, a, b) => a <= b ? c >= a && c <= b : c >= a || c <= b;

/* What the bed is like to drive on: wading in the shallows, wet mud while the lake is still draining, hardpan once it is gone. */
const WADE = { id: 'wade', speed: 0.42, grip: 0.7, dust: 0xbfe8ff, rumble: 0.3, offroad: true, splash: true };
const MUD = { id: 'mud', speed: 0.5, grip: 0.7, dust: 0x6b5638, rumble: 0.35, offroad: true };
const HARDPAN = { id: 'hardpan', speed: 0.92, grip: 0.92, dust: 0xc9b48c, rumble: 0.18 };
const plantLocal = (p, x, z) => { const dx = x - p.x, dz = z - p.z, c = Math.cos(p.yaw), s = Math.sin(p.yaw); return [dx * c - dz * s, dx * s + dz * c]; };

function height(x, z) {
  // the valley floor, then pine slopes rising all round it
  const e = Math.hypot((x - VALLEY.x) / VALLEY.rx, (z - VALLEY.z) / VALLEY.rz);
  let h = 0.35 + (fbm(x * 0.03, z * 0.03, 2, 3) - 0.5) * 0.5;
  h += smoothstep(0.92, 1.55, e) * (34 + (fbm(x * 0.006, z * 0.006, 4, 17) - 0.4) * 40);
  h += smoothstep(1.4, 2.4, e) * (30 + fbm(x * 0.004, z * 0.004, 3, 5) * 30);
  h += (fbm(x * 0.02, z * 0.02, 3, 9) - 0.5) * 6 * smoothstep(0.95, 1.3, e);
  // the reservoir basin behind the dam, with high banks all round so the water stays in
  const kS = smoothstep(LAKE.zDam + 35, LAKE.zDam, z);
  if (kS > 0) {
    const le = lakeE(x, z);
    const hl = le < 1 ? lakeBed(x, z, le) + (fbm(x * 0.06, z * 0.06, 2, 31) - 0.5) * 0.9 * (1 - smoothstep(0.75, 1, le)) : Math.min(lerp(LAKE.rim, Math.max(h, LAKE.rim), smoothstep(1, 1.6, le)), benchLevel(le));
    h = lerp(h, hl, kS);
  }
  // pads for the gas plants
  for (const p of PLANTS) { const [u, v] = plantLocal(p, x, z), d = Math.max(Math.abs(u - 6) - 116, Math.abs(v + 6) - 67, 0); if (d < 34) h = lerp(h, p.y, 1 - smoothstep(0, 34, d)); }
  // Training Hall 9 sits on a flat slab just below the road
  const dx = Math.max(HB.x0 - x, x - HB.x1, 0), dz = Math.max(HB.z0 - z, z - HB.z1, 0);
  if (dx < 6 && dz < 6) h = lerp(h, -0.9, (1 - smoothstep(0, 6, dx)) * (1 - smoothstep(0, 6, dz)));
  // the coolant pond
  const p = Math.hypot((x - POND.x) / POND.rx, (z - POND.z) / POND.rz);
  const pond = 1 - smoothstep(0.55, 1.0, p);
  h = h * (1 - pond) + -5 * pond;
  return h;
}

export default {
  id: 'datacenter-dash',
  name: 'Datacenter Dash',
  tagline: 'Now training on your lap times.',
  lapNotes: [`<b>Reservoir at ${lakePct(lakeLevel(2, 3))}%.</b> Thank you for your water.`, `<b>Reservoir at ${lakePct(lakeLevel(3, 3))}%.</b> The lake bed is open.`],   // shown as laps two and three begin
  laps: 3,
  width: 17,
  sky: 'day',
  skyOverrides: { zenith: 0x1f66e0, horizon: 0x9fd4ff, ground: 0xc4e6ff, cloudCover: 0.5, cloud: 0xffffff, cloudShade: 0xb4cbe8, fog: 0xb3dbf7, fogNear: 320, fogFar: 1500, sunIntensity: 3.4, hemiGround: 0x7d9a5c },
  backdrop: { img: 'assets/backdrops/datacenter-dash.webp', top: 18, bottom: -6, rot: 0.2 },
  offroad: 'grass',
  defaults: { edge: 'open', shoulder: 3.5, outer: 11 },
  tunnelHeight: 12,
  tunnelShell: false,                // the data hall is built by decorate(), not the arched shell
  path: [
    { p: [0, 0, 0] },                 // 0 start/finish on the main drag, heading +x
    { p: [92, 0, 0] },                // 1 into the server hall
    { p: [140, 0, -6] },              // 2 the long left drift inside the hall
    { p: [163, 0, -38] },             // 3
    { p: [172, 0, -140] },            // 4 out of the hall, onto the pond bridge
    { p: [174, 1.5, -200] },          // 5 ramp and jump over the coolant
    { p: [170, 3, -252] },            // 6
    { p: [152, 7, -294] },            // 7 climbing left toward the lake
    { p: [112, 9.5, -322] },          // 8 past the east end of the dam
    { p: [71, 11.0, -360] },          // 9 the shore road: north up the east shore, the water on the left
    { p: [67, 11.2, -415] },          // 10
    { p: [43, 11.3, -473] },          // 11 left round the bay
    { p: [-15, 11.4, -497] },         // 12
    { p: [-73, 11.3, -473] },         // 13
    { p: [-97, 11.2, -415] },         // 14 south down the west shore
    { p: [-104, 12.0, -342] },        // 15 past the west end of the dam
    { p: [-132, 14.5, -275] },        // 16 heading south
    { p: [-112, 12, -239] },          // 17 leg A, heading east
    { p: [-68, 10.8, -238] },         // 18
    { p: [-26, 10.2, -233], w: 18 },  // 19 hairpin right
    { p: [-8, 9.5, -202], w: 18 },    // 20
    { p: [-26, 8.8, -171], w: 18 },   // 21
    { p: [-68, 8, -166] },            // 22 leg B, heading west
    { p: [-112, 6.5, -166] },         // 23
    { p: [-152, 5, -128] },           // 24 left, heading south
    { p: [-156, 2.5, -62] },          // 25
    { p: [-136, 0.5, -12] },          // 26 last corner onto the main drag
    { p: [-80, 0, 0] },               // 27
  ],
  sides: [
    { from: 26.7, to: 1.1, edge: 'wall' },                                     // the main drag between the halls
    { from: 6.0, to: 8.6, edge: 'wall' },                                      // the climb is fenced
    { from: 8.6, to: 9.25, side: 'L', edge: 'wall' },                          // ...and so is the dam end
    { from: 14.75, to: 15.6, side: 'L', edge: 'wall' },
    { from: 4.0, to: 6.0, edge: 'void' },                                      // the pond bridge: nothing but coolant below
    // the lake: no barrier on the water side, the bank drops straight to it, and the whole bed between the arms is open
    { from: 9.25, to: 14.75, side: 'L', outer: 104, shoulder: 2, hoarding: false, blend: 6 },
    // the transformer yard between the two switchback legs: cut it with a boost
    { from: 18.5, to: 21.5, side: 'R', outer: 30, shoulder: 4, hoarding: false },
  ],
  /* The reservoir, as the race sees it: the level follows the leader's lap, the bed is drivable once exposed. */
  lake: {
    inside: (x, z) => z < LAKE.zDam - 1 && lakeE(x, z) < 0.97,
    levelForLap: lakeLevel,
    rate: 1.6,
    surface: (depth, race) => depth > 0 ? WADE : race.lakeLap >= race.laps && depth < -0.35 ? HARDPAN : MUD,
  },
  // rivals cut the dry lake bed on the final lap, between the intake pipe piers (the transformer yard is not worth it for them:
  // the hairpin is fast, so a boost item buys as much on the road; see docs/track-authoring.md)
  shortcuts: [
    { name: 'lake bed', from: 9.35, to: 14.55, path: [[52, -400], [30, -393], [-12, -393], [-40, -398], [-70, -385], [-86, -378]], when: race => race.lakeLap >= race.laps },
  ],
  // the opening shot: the whole lake, the pipes drinking it, and a gas plant smoking behind
  intro: [{ pos: [214, 74, -318], pos1: [196, 64, -340], look: [-60, 14, -405], look1: [-80, 12, -395], fov: 50, dur: 3 }],
  tunnels: HALL_RANGES.map(({ from, to }) => ({ from, to })),
  bridges: [{ from: 4.0, to: 6.0 }],
  zones: [
    ...HALL_RANGES.map(({ from, to, skin }) => ({ from, to, skin })),
    { from: 4.0, to: 6.0, skin: 'metal' },
  ],
  ramps: [{ at: 4.62, len: 9, lift: 2.1 }],
  boosts: [
    { at: 0.5, lat: 0, w: 5 },
    { at: 3.48, lat: 4.5, w: 3.4, len: 9 },
    { at: 5.12, lat: 0, w: 6 },
    { at: 9.3, lat: 4.5, w: 4.5 },     // on the lake side: the way into the shortcut on the last lap
    { at: 15.2, lat: 3, w: 4.5 },
    { at: 24.6, lat: -3, w: 4.5 },
  ],
  itemRows: [{ at: 3.48, lats: [-6.3, -3.0] }, { at: 6.4 }, { at: 12.0 }, { at: 16.4 }, { at: 25.4, n: 3 }],
  coins: [
    { from: 0.2, to: 0.45, n: 4, lat: -4 },
    { from: 2.25, to: 3.28, n: 5, lat: [2, 4.5] },
    { from: 4.75, to: 4.95, n: 3, lat: 0, air: 2.6 },
    { from: 10.5, to: 11.5, n: 5, lat: [3, 6] },
    { from: 12.5, to: 13.5, n: 5, lat: [6, 3] },
    { from: 18.66, to: 18.66, n: 4, lat: [-13, -30] },
    { from: 22.6, to: 23.2, n: 4, lat: [4, -3] },
    { from: 25.6, to: 26.2, n: 4, lat: [-3, 4] },
  ],
  obstacles: [
    // security robots on the straights, each sweeping only part of the road (#238: sweeps narrowed to the
    // wall lane — the old bands crossed the racing line at the hall exit and cost ~2 hits a race in the sim)
    { kind: 'patrol', model: 'bot', at: 3.45, lats: [-7.8, -5.6], speed: 3, effect: 'spin', radius: 1.2 },
    { kind: 'patrol', model: 'bot', at: 17.75, lats: [-8.2, -6.4], speed: 3.2, effect: 'spin', radius: 1.2 },
    // steam vents round the bay, blowing in turn (#238: the second vent sat on the bay apex line, 2 hits a
    // race in the sim; moved to the outside of the bend, where it now only threatens a wide line)
    { kind: 'timed', model: 'vent', at: 11.7, lat: -4, period: 3, duty: 0.3, phase: 0, effect: 'spin', radius: 1.4 },
    { kind: 'timed', model: 'vent', at: 12.4, lat: -6, period: 3, duty: 0.3, phase: 1.5, effect: 'spin', radius: 1.4 },
  ],
  models: { vent: () => D.vent() },
  terrain: {
    cell: 3, margin: 230, blend: 30, water: -1.5, fn: height,
    color(x, z, h, slope, over, out) {
      const mix = (r, g, b, a) => { out[0] += (r - out[0]) * a; out[1] += (g - out[1]) * a; out[2] += (b - out[2]) * a; };
      // cut slopes and cliffs: clean layered rock in two warm tones, not a stretched photo
      if (slope > 0.3) { const t = smoothstep(0.3, 0.55, slope), k = smoothstep(4, 45, h), b = 1 + 0.07 * Math.sin(h * 0.7); mix(lerp(0.34, 0.5, k) * b, lerp(0.3, 0.44, k) * b, lerp(0.25, 0.35, k) * b, t); }
      // gravel in the transformer yard
      const k = (1 - smoothstep(0, 8, Math.max(YARD.x0 - x, x - YARD.x1, 0))) * (1 - smoothstep(0, 8, Math.max(YARD.z0 - z, z - YARD.z1, 0)));
      if (k > 0) mix(0.2, 0.2, 0.19, k);
      for (const hl of HALLS) {                              // paved aprons around the halls
        const [u, v] = hallUV(hl, x, z), d = Math.max(Math.abs(u) - hl.L / 2 - 12, Math.abs(v) - hl.W / 2 - 12);
        if (d < 3) mix(0.36, 0.37, 0.38, 1 - smoothstep(0, 3, d));
      }
      for (const p of PLANTS) { const [u, v] = plantLocal(p, x, z), d = Math.max(Math.abs(u - 6) - 118, Math.abs(v + 6) - 69, 0); if (d < 4) mix(0.3, 0.3, 0.3, 1 - smoothstep(0, 4, d)); }
      // the lake bed: dark wet mud at the bottom, dried and cracking higher up, white rings where the water used to stand
      if (z < LAKE.zDam + 6 && h < LAKE.full + 1.6) {
        const e = lakeE(x, z);
        if (e < 1.02) {
          const t = clamp((h - LAKE.bed) / (LAKE.full - LAKE.bed), 0, 1), n = fbm(x * 0.05, z * 0.05, 2, 77);
          const a = 1 - smoothstep(LAKE.full + 1.1, LAKE.full + 1.6, h);
          mix(lerp(0.07, 0.3, smoothstep(0.02, 0.35, t)) * (0.85 + n * 0.3), lerp(0.05, 0.22, smoothstep(0.02, 0.35, t)) * (0.85 + n * 0.3), lerp(0.03, 0.13, smoothstep(0.02, 0.35, t)) * (0.85 + n * 0.3), a);
          const ring = (y0, y1, s) => { const r = smoothstep(y0 - 0.25, y0, h) * (1 - smoothstep(y1, y1 + 0.3, h)); if (r > 0) mix(0.78 * s, 0.75 * s, 0.66 * s, r); };
          ring(LAKE.full - 0.3, LAKE.full + 1.0, 1);
          ring(lerp(LAKE.full, LAKE.low, 0.5) - 0.1, lerp(LAKE.full, LAKE.low, 0.5) + 0.5, 0.75);
          ring(LAKE.low + 0.1, LAKE.low + 0.6, 0.7);
        }
      }
    },
  },
  look: {
    road: { base: 0x575c66, line: 0xffffff, center: 0xffd23c, glow: 0x3dc8ff },
    kerb: [0x1f6bff, 0xf4f6f8],
    shoulder: 0xa7aaa6,
    terrain: { low: 0x4f8a3a, high: 0x6a9f45, dry: 0x9aa65c, rock: 0x8c8a84, sand: 0xb7a984, dirt: 0x8f7a5a },
    wall: 0xe9ecf0, wallStripe: 0x1f6bff, water: 0x23c2b4, deck: 0x9aa3ad, rail: 0xffb020,
    tunnelLight: 0xffffff, portal: 0xdfe3e8,
    ads: ['NOW TRAINING ON YOU', 'GPU GO BRRR', 'COMPUTE IS THE NEW OIL', 'TOKENS PER SECOND', 'WE ARE OUT OF GPUS', 'HALLUCINATION FREE*', 'STOCHASTIC PARROT FEED', 'ATTENTION IS ALL YOU NEED', 'OVERFIT AND PROUD', 'LIQUID COOLED EGO', 'ROBOTS.TXT IGNORED', 'INFERENCE AT THE EDGE', 'SCALING LAWS APPLY', 'PROMPT RESPONSIBLY'],
  },
  POND, LAKE, HALL_RANGES,

  /** Dress the course. ctx: { THREE, track, group, gfx, anim, view } */
  decorate(ctx) { decorate(ctx); },
};

const TOWERS = [{ x: 252, z: -168 }, { x: 106, z: -262 }];
const PIPE_X = [2, 8, 14];
const RACK_TILE = 4.8;   // metres of rack front per repeat of the rack texture (four 1.2 m cabinets)
const FONT = '"Luckiest Guy", "Arial Black", sans-serif', SANS = '"Arial Black", "Helvetica Neue", Arial, sans-serif', MONO = '"Courier New", Courier, monospace';
const BOARDS = [
  [6.6, -1, 16, 'YOUR LAKE, NOW IN THE CLOUD', '#1f6bff', '#ffffff'], [16.3, -1, 16, 'CARBON NEUTRAL BY 2099', '#16a34a', '#ffffff'],
  [20.0, 1, 16, 'POWERED BY GAS AND VIBES', '#ffd23c', '#1a1d29'], [23.6, 1, 15, 'ASK US ABOUT OUR LAKE', '#ffffff', '#1f6bff'],
  [25.2, 1, 15, 'NOW TRAINING ON YOU', '#db2777', '#ffffff'], [7.6, 1, 16, 'THIRSTY? SO ARE WE', '#0ea5e9', '#ffffff'],
  [17.2, 1, 16, 'CLEAN ENERGY (COMING SOON)', '#ff6a00', '#ffffff'],
  [22.9, -1, 16, 'WE ARE OUT OF GPUS', '#ffffff', '#e23b3b'], [26.2, -1, 16, 'SKY STILL MOSTLY BLUE', '#7b5cff', '#ffffff'],
  [10.55, -1, 13, 'BEFORE', '#0ea5e9', '#ffffff'], [12.0, -1, 14, 'DRINK RESPONSIBLY. WE WILL.', '#ffffff', '#1f6bff'], [13.4, -1, 14, 'SHORTCUT OPENS AT 1%', '#ffd23c', '#1a1d29'],
];
const PROTEST = ['WATER IS NOT A FEATURE', 'MY LAKE ≠ YOUR CACHE', 'BRING BACK THE FISH', "HONK IF YOU'RE THIRSTY", 'THE FISH WERE HERE FIRST', 'LEAVE SOME FOR US', 'UNPLUG IT', 'NOT MY RESERVOIR', 'TOUCH GRASS (WHILE IT LASTS)'];

/* ---------- geometry helpers ---------- */
/** Collects quads in world space (non-indexed), with explicit UVs and optional vertex colours. */
class Quads {
  constructor(colors = false) { this.p = []; this.n = []; this.u = []; this.c = colors ? [] : null; }
  /** a,b,c,d: bottom-left, bottom-right, top-right, top-left as seen from the front. uv: [u0,v0,u1,v1] or four [u,v] pairs. */
  quad(a, b, c, d, uv = [0, 0, 1, 1], col = null) {
    const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2], vx = d[0] - a[0], vy = d[1] - a[1], vz = d[2] - a[2];
    let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx; const l = Math.hypot(nx, ny, nz) || 1; nx /= l; ny /= l; nz /= l;
    const t = uv.length === 4 && typeof uv[0] === 'number' ? [[uv[0], uv[1]], [uv[2], uv[1]], [uv[2], uv[3]], [uv[0], uv[3]]] : uv;
    for (const k of [0, 1, 2, 0, 2, 3]) {
      const q = [a, b, c, d][k]; this.p.push(q[0], q[1], q[2]); this.n.push(nx, ny, nz); this.u.push(t[k][0], t[k][1]);
      if (this.c) { const cc = col ? (Array.isArray(col[0]) ? col[k] : col) : [1, 1, 1, 1]; this.c.push(cc[0], cc[1], cc[2], cc[3] ?? 1); }
    }
  }
  /** Axis-aligned box. uvf(face, a, b, c, d) returns the face's UVs; faces: px nx py pz nz (no bottom). */
  box(x0, x1, y0, y1, z0, z1, uvf = () => [0, 0, 1, 1], faces = 'px nx py pz nz') {
    const F = {
      pz: [[x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1]], nz: [[x1, y0, z0], [x0, y0, z0], [x0, y1, z0], [x1, y1, z0]],
      px: [[x1, y0, z1], [x1, y0, z0], [x1, y1, z0], [x1, y1, z1]], nx: [[x0, y0, z0], [x0, y0, z1], [x0, y1, z1], [x0, y1, z0]],
      py: [[x0, y1, z1], [x1, y1, z1], [x1, y1, z0], [x0, y1, z0]],
    };
    for (const f of faces.split(' ')) { const q = F[f]; this.quad(q[0], q[1], q[2], q[3], uvf(f, ...q)); }
  }
  /** A flat panel facing yaw (0 = +Z), centred at c, w by h, tilted back by `tilt` radians. */
  panel(c, yaw, w, h, uv, tilt = 0) {
    const rx = Math.cos(yaw), rz = -Math.sin(yaw), fx = Math.sin(yaw), fz = Math.cos(yaw);
    const ux = -fx * Math.sin(tilt), uy = Math.cos(tilt), uz = -fz * Math.sin(tilt);
    const P = (sx, sy) => [c[0] + rx * w / 2 * sx + ux * h / 2 * sy, c[1] + uy * h / 2 * sy, c[2] + rz * w / 2 * sx + uz * h / 2 * sy];
    this.quad(P(-1, -1), P(1, -1), P(1, 1), P(-1, 1), uv);
  }
  get empty() { return !this.p.length; }
  geometry(THREE) {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.p, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(this.n, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(this.u, 2));
    if (this.c) g.setAttribute('color', new THREE.Float32BufferAttribute(this.c, 4));
    g.computeBoundingSphere();
    return g;
  }
}

/** Untextured metal, paint, and lamps share a draw. A palette texel stores the
 * original linear color, roughness, metalness, and emitted light; the standard
 * material still lights every surface. Mapped art and transparent glass keep
 * their own materials and UVs. One palette is shared by the campus and boats. */
function hardwarePalette(THREE) {
  const entries = new Map(), batches = new Map();
  const width = 256;
  const makeTable = () => {
    const map = new THREE.DataTexture(new Float32Array(width * 4), width, 1, THREE.RGBAFormat, THREE.FloatType);
    map.needsUpdate = true;
    return map;
  };
  const diffuse = makeTable(), finish = makeTable(), light = makeTable();
  return (material, geometry) => {
    if (material.type !== 'MeshStandardMaterial' || material.map || material.emissiveMap ||
        material.transparent || material.vertexColors || material.alphaTest || material.polygonOffset) return material;
    let slot = entries.get(material);
    if (slot === undefined) {
      slot = entries.size;
      if (slot >= width) return material;
      entries.set(material, slot);
      const c = material.color, e = material.emissive, power = material.emissiveIntensity;
      diffuse.image.data.set([c.r, c.g, c.b, 1], slot * 4);
      finish.image.data.set([1, material.roughness, material.metalness, 1], slot * 4);
      light.image.data.set([e.r * power, e.g * power, e.b * power, 1], slot * 4);
    }
    const uv = geometry.attributes.uv;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, (slot + 0.5) / width, 0.5);
    const key = material.envMapIntensity + '/' + material.side;
    if (!batches.has(key)) batches.set(key, new THREE.MeshStandardMaterial({
      map: diffuse, roughnessMap: finish, metalnessMap: finish, roughness: 1, metalness: 1,
      emissive: 0xffffff, emissiveMap: light, side: material.side, envMapIntensity: material.envMapIntensity,
    }));
    return batches.get(key);
  };
}

/** Merges static props into one mesh per material (and per shadow casting), so the whole course costs a few draw calls. */
function makeBaker(THREE, group, shadows, palette) {
  const buckets = new Map();
  const push = (mat, g, cast) => {
    const shared = palette(mat, g);
    if (!buckets.has(shared)) buckets.set(shared, [[], []]);
    buckets.get(shared)[cast && !mat.transparent ? 0 : 1].push(g);
  };
  const norm = (geo, matrix) => {
    const g = geo.index ? geo.toNonIndexed() : geo.clone();
    for (const n of Object.keys(g.attributes)) if (!['position', 'normal', 'uv'].includes(n)) g.deleteAttribute(n);
    if (!g.attributes.uv) g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
    if (!g.attributes.normal) g.computeVertexNormals();
    g.clearGroups();
    if (matrix) {
      g.applyMatrix4(matrix);
      if (matrix.determinant() < 0) for (const a of Object.values(g.attributes)) { const s = a.itemSize, arr = a.array; for (let i = 0; i < a.count; i += 3) for (let k = 0; k < s; k++) { const t = arr[(i + 1) * s + k]; arr[(i + 1) * s + k] = arr[(i + 2) * s + k]; arr[(i + 2) * s + k] = t; } }
    }
    return g;
  };
  return {
    /** Bake a placed object (and remove it from the scene). */
    add(obj, cast = true) {
      obj.updateMatrixWorld(true);
      obj.traverse(o => { if (o.isMesh && !o.isInstancedMesh) push(o.material, norm(o.geometry, o.matrixWorld), cast); });
      obj.removeFromParent();
    },
    /** Bake a ModelBuilder's buckets (geometry already in world space). */
    builder(b, mats, cast = true) { const grp = b.build(mats); grp.traverse(o => { if (o.isMesh) push(o.material, norm(o.geometry, null), cast); }); },
    geo(mat, g, cast = false) { push(mat, norm(g, null), cast); },
    flush() {
      for (const [mat, lists] of buckets) lists.forEach((list, k) => {
        if (!list.length) return;
        const geo = mergeGeometries(list, false); list.forEach(g => g.dispose());
        geo.computeBoundingSphere();
        const m = new THREE.Mesh(geo, mat); m.castShadow = k === 0 && shadows; m.receiveShadow = false; m.matrixAutoUpdate = false; group.add(m);
      });
      buckets.clear();
    },
  };
}

/** Text panels packed into a few big canvases, drawn as one mesh per canvas. Redraws once the web fonts arrive. */
function makeAtlas(THREE, group, S = 2048) {
  const pages = [], newPage = () => {
    const c = document.createElement('canvas'); c.width = c.height = S;
    const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
    const mat = new THREE.MeshStandardMaterial({ map: tex, emissiveMap: tex, emissive: 0xffffff, emissiveIntensity: 0.3, roughness: 0.6 });
    const p = { c, g: c.getContext('2d'), tex, mat, q: new Quads(), x: 0, y: 0, row: 0, items: [] }; pages.push(p); return p;
  };
  newPage();
  const alloc = (w, h) => {
    let p = pages[pages.length - 1];
    if (p.x + w > S) { p.x = 0; p.y += p.row + 2; p.row = 0; }
    if (p.y + h > S) { p = newPage(); }
    const r = { p, x: p.x, y: p.y, w, h }; p.x += w + 2; p.row = Math.max(p.row, h); return r;
  };
  const api = {
    /** Allocate w x h pixels drawn by draw(g, w, h) (translated); returns a handle to place it with. */
    add(w, h, draw) { const r = alloc(w, h); r.draw = draw; r.p.items.push(r); api._last = r; return r; },
    last() { return api._last; },
    /** back: also give the panel a plain painted back, so nothing ever shows mirrored lettering. */
    place(r, c, yaw, w, h, tilt = 0, back = false) {
      const { p } = r; p.q.panel(c, yaw, w, h, [r.x / S, 1 - (r.y + r.h) / S, (r.x + r.w) / S, 1 - r.y / S], tilt);
      if (back) { const b = api._back, bp = b.p, o = 0.04; bp.q.panel([c[0] - Math.sin(yaw) * o, c[1], c[2] - Math.cos(yaw) * o], yaw + Math.PI, w, h, [(b.x + 2) / S, 1 - (b.y + 6) / S, (b.x + 6) / S, 1 - (b.y + 2) / S], -tilt); }
    },
    paint() { for (const p of pages) { p.g.clearRect(0, 0, S, S); for (const r of p.items) { p.g.save(); p.g.translate(r.x, r.y); p.g.beginPath(); p.g.rect(0, 0, r.w, r.h); p.g.clip(); r.draw(p.g, r.w, r.h); p.g.restore(); } p.tex.needsUpdate = true; } },
    flush() {
      api.paint();
      for (const p of pages) if (!p.q.empty) { const m = new THREE.Mesh(p.q.geometry(THREE), p.mat); m.matrixAutoUpdate = false; group.add(m); }
      if (typeof document !== 'undefined' && document.fonts?.ready) document.fonts.ready.then(() => api.paint());
    },
  };
  api._back = api.add(8, 8, (g, w, h) => { g.fillStyle = '#5b636f'; g.fillRect(0, 0, w, h); });
  return api;
}

/** Fit text to a width, in up to two lines; draws centred at (cx, cy). */
function fitText(g, text, cx, cy, maxW, size, font, fill, { lines = 2, stroke = null, lw = 0 } = {}) {
  const words = text.split(' '); let ls = [text];
  g.font = `${size}px ${font}`;
  if (lines > 1 && g.measureText(text).width > maxW && words.length > 1) {
    let best = 1, bd = 1e9; for (let k = 1; k < words.length; k++) { const d = Math.abs(words.slice(0, k).join(' ').length - words.slice(k).join(' ').length); if (d < bd) { bd = d; best = k; } }
    ls = [words.slice(0, best).join(' '), words.slice(best).join(' ')];
  }
  let s = size; const widest = () => Math.max(...ls.map(l => g.measureText(l).width));
  while (widest() > maxW && s > 10) { s -= 2; g.font = `${s}px ${font}`; }
  g.textAlign = 'center'; g.textBaseline = 'middle';
  ls.forEach((l, k) => { const y = cy + (k - (ls.length - 1) / 2) * s * 1.05; if (stroke) { g.lineWidth = lw; g.strokeStyle = stroke; g.strokeText(l, cx, y); } g.fillStyle = fill; g.fillText(l, cx, y); });
}

/** A painted sign: background, border, text. */
const signDraw = (text, { bg = '#ffffff', fg = '#1a1d29', font = FONT, size = 120, border = null, stripe = null, lines = 2, pad = 0.08 } = {}) => (g, w, h) => {
  g.fillStyle = bg; g.fillRect(0, 0, w, h);
  if (stripe) { g.fillStyle = stripe; g.fillRect(0, h * 0.86, w, h * 0.14); }
  if (border) { g.strokeStyle = border; g.lineWidth = Math.max(4, h * 0.05); g.strokeRect(g.lineWidth / 2, g.lineWidth / 2, w - g.lineWidth, h - g.lineWidth); }
  fitText(g, text, w / 2, h * (stripe ? 0.45 : 0.52), w * (1 - pad * 2), size, font, fg, { lines });
};

/** A giant painted wall joke: huge type, a painted frame, a stripe in the company colour. */
const muralDraw = (text, col) => (g, w, h) => {
  g.fillStyle = '#fbfbf7'; g.fillRect(0, 0, w, h);
  g.fillStyle = col; g.fillRect(0, h - h * 0.1, w, h * 0.1); g.fillRect(0, 0, w, h * 0.05);
  const two = text.length > 16 && h / w > 0.12;
  fitText(g, text, w / 2 + 6, h * 0.49 + 8, w * 0.94, Math.round(h * (two ? 0.42 : 0.78)), FONT, 'rgba(0,0,0,0.18)', { lines: two ? 2 : 1 });
  fitText(g, text, w / 2, h * 0.49, w * 0.94, Math.round(h * (two ? 0.42 : 0.78)), FONT, '#1a1d29', { lines: two ? 2 : 1 });
};
/** The happy lake mural, labelled BEFORE. */
function lakeMural(g, w, h) {
  const sky = g.createLinearGradient(0, 0, 0, h * 0.6); sky.addColorStop(0, '#5fb8ff'); sky.addColorStop(1, '#bfe6ff'); g.fillStyle = sky; g.fillRect(0, 0, w, h);
  g.fillStyle = '#ffd23c'; g.beginPath(); g.arc(w * 0.12, h * 0.3, h * 0.18, 0, 7); g.fill();
  g.fillStyle = '#3f9a4a'; g.beginPath(); g.moveTo(0, h * 0.62); for (let x = 0; x <= w; x += w / 12) g.lineTo(x, h * (0.42 + 0.12 * Math.sin(x / w * 9))); g.lineTo(w, h * 0.62); g.fill();
  g.fillStyle = '#2f86e0'; g.fillRect(0, h * 0.6, w, h * 0.4);
  g.strokeStyle = 'rgba(255,255,255,0.7)'; g.lineWidth = 5; for (let k = 0; k < 14; k++) { const x = (k * 0.137 % 1) * w, y = h * (0.66 + (k % 4) * 0.08); g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + 30, y - 10, x + 60, y); g.stroke(); }
  for (let k = 0; k < 5; k++) { const x = w * (0.25 + k * 0.14), y = h * (0.75 + (k % 2) * 0.1); g.fillStyle = '#ff8a3c'; g.beginPath(); g.ellipse(x, y, h * 0.07, h * 0.04, 0, 0, 7); g.fill(); g.beginPath(); g.moveTo(x - h * 0.06, y); g.lineTo(x - h * 0.11, y - h * 0.04); g.lineTo(x - h * 0.11, y + h * 0.04); g.fill(); g.fillStyle = '#1a1d29'; g.beginPath(); g.arc(x + h * 0.035, y - h * 0.01, h * 0.008, 0, 7); g.fill(); }
  g.fillStyle = 'rgba(255,255,255,0.93)'; g.fillRect(w * 0.24, h * 0.05, w * 0.55, h * 0.46);
  fitText(g, 'BEFORE', w * 0.515, h * 0.29, w * 0.51, Math.round(h * 0.43), FONT, '#b92a2c', { lines: 1 });
}

function canvasTexture(THREE, w, h, draw, { repeat = false } = {}) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

/** The rack fronts: one shared texture, four LED blink frames and one material, so every rack on the
    course (Training Hall 9 and the Cooling Annex alike) bakes into a single mesh and blinks in sync. */
function rackKit(THREE) {
  const RW = 1024, RH = 512, FR = Math.round(RH * 0.8), LEDS = [];
  const rackTex = canvasTexture(THREE, RW, RH, (g) => {
    const r = makeRng(77);
    g.fillStyle = '#24282f'; g.fillRect(0, 0, RW, RH);
    for (let c = 0; c < 4; c++) {
      const x0 = c * 256;
      g.fillStyle = '#0c0e12'; g.fillRect(x0, 0, 256, FR);
      g.fillStyle = '#171b22'; g.fillRect(x0 + 8, 6, 240, FR - 12);
      const rows = 16;
      for (let k = 0; k < rows; k++) {
        const y = 16 + k * ((FR - 32) / rows), hh = (FR - 32) / rows - 4;
        g.fillStyle = k % 5 === 4 ? '#2c323c' : '#21262e'; g.fillRect(x0 + 16, y, 224, hh);
        g.fillStyle = '#3a414c'; g.fillRect(x0 + 18, y + 2, 10, hh - 4); g.fillRect(x0 + 228, y + 2, 10, hh - 4);
        const n = 3 + Math.floor(r() * 5);
        for (let j = 0; j < n; j++) LEDS.push([x0 + 36 + j * 13 + Math.floor(r() * 3), y + hh / 2 - 3, r()]);
        if (r() < 0.6) LEDS.push([x0 + 150 + Math.floor(r() * 60), y + hh / 2 - 2, -r()]);
      }
      g.fillStyle = '#5a626e'; g.fillRect(x0 + 2, 0, 3, FR); g.fillRect(x0 + 251, 0, 3, FR);
    }
  }, { repeat: true });
  rackTex.wrapT = THREE.ClampToEdgeWrapping;
  const frames = [0, 1, 2, 3].map(f => canvasTexture(THREE, RW, RH, (g) => {
    const r = makeRng(101 + f * 13); g.fillStyle = '#000'; g.fillRect(0, 0, RW, RH);
    for (const [x, y, k] of LEDS) {
      if (k < 0) { if (r() < 0.8) { g.fillStyle = '#2f8bff'; g.fillRect(x, y, 26, 4); } continue; }
      if (r() < 0.32) continue;
      g.fillStyle = k < 0.55 ? '#38ff74' : k < 0.85 ? '#3dc8ff' : '#ffb020'; g.fillRect(x, y, 7, 6);
    }
  }, { repeat: true }));
  for (const t of frames) t.wrapT = THREE.ClampToEdgeWrapping;
  const mat = new THREE.MeshStandardMaterial({ map: rackTex, emissiveMap: frames[0], emissive: 0xffffff, emissiveIntensity: 2.6, roughness: 0.5, metalness: 0.3 });
  /* The painted rack front (assets/tracks/datacenter-dash/rack-front.webp, prompt in tools/prompts/datacenter-dash.md):
     drawn over the cabinet band (4.8 m of rack per repeat, so the units keep their painted proportions), and the blink frames
     rebuilt from its own status lights, so the LEDs that flash are the ones painted on the servers. */
  const img = new Image();
  img.onload = () => {
    const g = rackTex.image.getContext('2d');
    g.drawImage(img, 0, 0, RW, FR);   // one cabinet height per rack: chunky 1.2 m cabinets at their painted proportions
    rackTex.needsUpdate = true;
    const src = g.getImageData(0, 0, RW, FR).data;
    const led = (r, gg, b) => (gg > 170 && r < 140 && gg - r > 70) || (r > 215 && gg > 110 && gg < 195 && b < 90);   // green, cyan, amber
    frames.forEach((t, f) => {
      const fg = t.image.getContext('2d'), out = fg.createImageData(RW, FR), d = out.data, rr = makeRng(301 + f * 17);
      const on = new Uint8Array(Math.ceil(RW / 10) * Math.ceil(FR / 10)); for (let k = 0; k < on.length; k++) on[k] = rr() < 0.72 ? 1 : 0;
      for (let y = 0; y < FR; y++) for (let x = 0; x < RW; x++) {
        const k = (y * RW + x) * 4; d[k + 3] = 255;
        if (led(src[k], src[k + 1], src[k + 2]) && on[Math.floor(y / 10) * Math.ceil(RW / 10) + Math.floor(x / 10)]) { d[k] = src[k]; d[k + 1] = src[k + 1]; d[k + 2] = src[k + 2]; }
      }
      fg.fillStyle = '#000'; fg.fillRect(0, 0, RW, RH); fg.putImageData(out, 0, 0); t.needsUpdate = true;
    });
  };
  img.src = 'assets/tracks/datacenter-dash/rack-front.webp';
  return { mat, frames };
}

/* ---------- decorate ---------- */
function decorate(ctx) {
  const { THREE, track, anim, view } = ctx, sc = new Scenery(ctx), rng = sc.rng;
  const hit = makeGroundHit(), W = track.water;
  const palette = hardwarePalette(THREE);
  const bake = makeBaker(THREE, ctx.group, sc.shadows, palette), atlas = makeAtlas(THREE, ctx.group);
  const near = (x, z, p, r) => (x - p.x) ** 2 + (z - p.z) ** 2 < r * r;
  /** True when (x,z) is beyond where a kart can drive, by margin m. */
  const clear = (x, z, m = 1.5) => {
    const g = track.ground(x, z, -1, hit), i = g.i;
    if (g.onRoad) return false;
    if (track.bridge[i] || track.tunnel[i]) return g.outside > m + 4;
    const edge = g.side > 0 ? g.edgeL : g.edgeR;
    if (edge !== EDGE.OPEN) return g.outside > m + 0.8;
    return g.outside > (g.side > 0 ? track.outerL[i] : track.outerR[i]) + m;
  };
  /** Road-frame point: sample i, lateral offset lat (left +), height above the road surface. */
  const at = (i, lat, up = 0) => ({ x: track.px[i] + track.lx[i] * lat + track.ux[i] * up, y: track.py[i] + track.ly[i] * lat + track.uy[i] * up, z: track.pz[i] + track.lz[i] * lat + track.uz[i] * up });
  /** Samples from cp a to cp b every `step` metres, including tunnels and bridges (sc.along skips those). */
  const samples = (a, b, step) => { const i0 = track.indexAtCp(a), n = ((track.indexAtCp(b) - i0) + track.N) % track.N, k = Math.max(1, Math.round(step / track.ds)), out = []; for (let r = 0; r <= n; r += k) out.push((i0 + r) % track.N); return out; };
  const inHallBox = (x, z, m = 0) => x > HB.x0 - m && x < HB.x1 + m && z > HB.z0 - m && z < HB.z1 + m;
  const ctxs = { THREE, track, ctx, sc, rng, bake, atlas, palette, clear, at, samples, view, anim, rackSys: rackKit(THREE) };
  const campus = campusHalls(ctxs);   // first, so the dressing below can keep out of it

  // ---- start/finish: gantry, a hall either side of the main drag, grandstands on the south side ----
  const g0 = sc.beside(0, 1, -track.hwL[0]);
  const gantry = P.gantry(track.hwL[0] + track.hwR[0] + 1.5, 'DATACENTER DASH', { color: 0x1f6bff, color2: 0xffd23c });
  sc.place(gantry, g0.x, g0.z, { yaw: g0.along, y: g0.roadY });
  view.startLights = gantry.userData.lights;
  const stand = P.grandstand({ w: 30, rows: 6, color: 0x1f6bff }), stand2 = P.grandstand({ w: 30, rows: 6, color: 0x5b6573 });
  const seats = [], M = new THREE.Matrix4(), V = new THREE.Vector3();
  const putStand = (proto, p) => {
    const g = proto.group.clone(); sc.place(g, p.x, p.z, { yaw: p.yaw, y: track.py[p.i] - 0.2 });
    g.updateMatrixWorld(true); M.copy(g.matrixWorld);
    for (const s of proto.seats) if (rng() < 0.82) { V.set(s[0], s[1], s[2]).applyMatrix4(M); seats.push({ x: V.x, y: V.y, z: V.z, yaw: p.yaw + rng.range(-0.4, 0.4) }); }
    bake.add(g);
  };
  samples(26.95, 0.85, 33).map(i => { const q = at(i, -(track.hwR[i] + 6.5)); return { x: q.x, z: q.z, i, yaw: Math.atan2(track.lx[i], track.lz[i]) }; }).forEach((p, i) => putStand(i % 2 ? stand2 : stand, p));   // inside the keynote arena
  sc.instances(partsOf(P.spectator()), seats, { scale: [0.95, 1.2], tints: P.CROWD_TINTS, cast: false });
  const hallAt = (h, opts = {}) => {
    const g = D.dataHall({ L: h.L, W: h.W, H: h.H, accent: h.c, ...opts }); sc.place(g, h.x, h.z, { yaw: h.yaw, y: h.y ?? sc.y(h.x, h.z) - 0.4 }); bake.add(g);
    const base = h.y ?? sc.y(h.x, h.z) - 0.4, c = Math.cos(h.yaw), s = Math.sin(h.yaw), W3 = (u, v, y) => [h.x + u * c + v * s, y, h.z - u * s + v * c];
    const col = '#' + new THREE.Color(h.c).getHexString();
    if (h.name) {   // the company name stands on the roof at the front edge, so nothing in front of the hall hides it
      const w = Math.min(h.L * 0.6, 46), hh = w / 5.2, u = -h.L / 2 + w / 2 + 4, v = h.W / 2 - 1.2, y = base + h.H + 1.4 + hh / 2;
      const r = atlas.add(780, 150, (g, W2, H2) => { g.fillStyle = '#ffffff'; g.fillRect(0, 0, W2, H2); g.fillStyle = col; g.beginPath(); g.arc(H2 * 0.5, H2 * 0.5, H2 * 0.34, 0, 7); g.fill(); g.fillStyle = '#ffffff'; g.beginPath(); g.arc(H2 * 0.5 + H2 * 0.1, H2 * 0.5 - H2 * 0.08, H2 * 0.16, 0, 7); g.fill(); fitText(g, h.name, W2 * 0.55, H2 * 0.54, W2 * 0.8, 96, SANS, col, { lines: 1 }); });
      atlas.place(r, W3(u, v, y), h.yaw, w, hh, 0, true);
      const fr = new ModelBuilder(); for (const du of [-w * 0.35, 0, w * 0.35]) { const p = W3(u + du, v - 0.4, base + h.H + 0.8 + hh / 2); fr.add('f', box(0.5, 1.6 + hh, 0.5, 0.1, 1), { p: [p[0], p[1], p[2]] }); }
      bake.builder(fr, { f: plastic(0x6b7380, 0.5, 0.4) }, false);
    }
    if (h.mural) {  // the long front wall is the biggest canvas on the track: a joke you can read at speed
      const y0 = base + (h.muralLow ?? 1.4), y1 = base + h.H - 3.2, mh = y1 - y0, mw = h.L * 0.9, px = 1600, py = Math.round(clamp(px * mh / mw, 160, 900));
      const r = atlas.add(px, py, muralDraw(h.mural, col));
      atlas.place(r, W3(0, h.W / 2 + 0.32, (y0 + y1) / 2), h.yaw, mw, mh);
    }
  };
  // light masts behind the stands and lamps along the walls of the main drag
  sc.instances(partsOf(D.floodMast({ h: 20 })), sc.along({ from: 26.8, to: 0.9, side: -1, offset: 21, spacing: 33, phase: 16 }), {});
  const lampParts = partsOf(D.streetLamp());
  const lamps = [
    ...sc.along({ from: 26.8, to: 1.0, side: 1, offset: 1.0, spacing: 18 }), ...sc.along({ from: 26.8, to: 1.0, side: -1, offset: 1.0, spacing: 18, phase: 9 }),
    ...sc.along({ from: 6.1, to: 9.2, side: 1, offset: 1.0, spacing: 20 }), ...sc.along({ from: 6.1, to: 8.6, side: -1, offset: 1.0, spacing: 20, phase: 10 }),
    ...sc.along({ from: 9.3, to: 14.7, side: -1, offset: 3.5, spacing: 24, phase: 6 }),
    ...sc.along({ from: 15.6, to: 26.6, side: 1, offset: 12.8, spacing: 22 }).filter(p => clear(p.x, p.z, 0.8)),
    ...sc.along({ from: 15.6, to: 26.6, side: -1, offset: 12.8, spacing: 22, phase: 11 }).filter(p => clear(p.x, p.z, 0.8)),
  ];
  sc.instances(lampParts, lamps.filter(p => !inHallBox(p.x, p.z, 2) && !campus.inside(p.x, p.z)), { cast: false });

  // ---- Training Hall 9: the road runs through a real data hall ----
  const hallFx = trainingHall(ctxs);

  // ---- the coolant pond and the cooling towers, both steaming ----
  const towers = TOWERS.map(t => { const tw = D.coolingTower({ H: 31 }); sc.place(tw, t.x, t.z, { y: Math.max(W - 0.4, sc.y(t.x, t.z)) - 0.3, yaw: rng() * 6 }); const o = { x: t.x, z: t.z, y: tw.position.y + tw.userData.top, r: tw.userData.rimR }; bake.add(tw, false); return o; });
  {
    const p = sc.beside(4.3, 1, 3.5), r = atlas.add(512, 200, signDraw('COOLANT POND · DO NOT DRINK', { bg: '#ffd23c', fg: '#1a1d29', border: '#1a1d29', size: 84 }));
    const post = new ModelBuilder(); post.add('p', cyl(0.12, 0.12, 4.2, 6), { p: [p.x, track.py[p.i] - 1.6, p.z] }); bake.builder(post, { p: plastic(0x8a929e, 0.5, 0.5) });
    atlas.place(r, [p.x, track.py[p.i] + 1.9, p.z], p.yaw + 0.5, 6, 2.34, 0, true);
  }

  // ---- the dam, the draining lake, the pipes, and the people who object ----
  const lakeFx = reservoir(ctxs);
  edgePods(ctxs);

  // ---- campus: more halls, a security fence, generators, dishes ----
  HALLS.forEach(h => hallAt(h));
  const inHall = (x, z, m = 6) => HALLS.some(h => { const [u, v] = hallUV(h, x, z); return Math.abs(u) < h.L / 2 + m && Math.abs(v) < h.W / 2 + m; }) || inHallBox(x, z, m) || campus.inside(x, z, m);
  const gens = [], aprons = [];
  const toWorld = (h, u, v) => { const c = Math.cos(h.yaw), s = Math.sin(h.yaw); return { x: h.x + u * c + v * s, z: h.z - u * s + v * c }; };
  const fence = new Quads(), fposts = new ModelBuilder();
  for (const h of HALLS) {
    for (let u = -h.L / 2 + 6; u <= h.L / 2 - 6; u += 8.5) { const p = toWorld(h, u, -(h.W / 2 + 5.5)); if (clear(p.x, p.z, 2)) gens.push({ ...p, y: sc.y(p.x, p.z), yaw: h.yaw }); }
    for (const [fu, fv] of [[-1, -1], [1, -1], [-1, 1], [1, 1], [0, 1], [0, -1]]) { const p = toWorld(h, fu * (h.L / 2 + 10), fv * (h.W / 2 + 10)); if (clear(p.x, p.z, 1.5)) aprons.push({ ...p, y: sc.y(p.x, p.z), yaw: h.yaw + (fv > 0 ? Math.PI : 0) }); }
    // chain-link fence round the hall, open where the pipes come in
    const fu = h.L / 2 + 8.5, fv = h.W / 2 + 8.5, ring = [[-fu, -fv], [fu, -fv], [fu, fv], [-fu, fv], [-fu, -fv]];
    for (let k = 0; k < 4; k++) {
      const [ua, va] = ring[k], [ub, vb] = ring[k + 1], len = Math.hypot(ub - ua, vb - va), n = Math.ceil(len / 3);
      for (let j = 0; j < n; j++) {
        const A = toWorld(h, ua + (ub - ua) * j / n, va + (vb - va) * j / n), B = toWorld(h, ua + (ub - ua) * (j + 1) / n, va + (vb - va) * (j + 1) / n);
        if (!clear(A.x, A.z, 1) || !clear(B.x, B.z, 1) || lakeFx.nearPipe(A.x, A.z, 4) || lakeFx.nearPipe(B.x, B.z, 4)) continue;
        const ya = sc.y(A.x, A.z), yb = sc.y(B.x, B.z);
        fence.quad([A.x, ya, A.z], [B.x, yb, B.z], [B.x, yb + 2.6, B.z], [A.x, ya + 2.6, A.z], [0, 0, len / n / 1.2, 2.6 / 1.2]);
        fposts.add('post', cyl(0.06, 0.06, 2.8, 5), { p: [A.x, ya + 1.4, A.z] });
      }
    }
  }
  bake.builder(fposts, { post: plastic(0x9aa3ad, 0.4, 0.6) }, false);
  {
    const linkTex = canvasTexture(THREE, 64, 64, (g, w, h) => { g.clearRect(0, 0, w, h); g.strokeStyle = 'rgba(190,198,208,1)'; g.lineWidth = 3; g.beginPath(); g.moveTo(0, 0); g.lineTo(w, h); g.moveTo(w, 0); g.lineTo(0, h); g.stroke(); g.fillStyle = 'rgba(160,168,178,1)'; g.fillRect(0, 0, w, 4); }, { repeat: true });
    const m = new THREE.Mesh(fence.geometry(THREE), new THREE.MeshStandardMaterial({ map: linkTex, alphaTest: 0.4, side: THREE.DoubleSide, roughness: 0.5, metalness: 0.5 }));
    m.matrixAutoUpdate = false; ctx.group.add(m);
  }
  sc.instances(partsOf(D.generator()), gens, {});
  sc.instances(lampParts, aprons, { cast: false });
  const dishes = [{ x: -62, z: -104, yaw: 0.3 }, { x: 128, z: -232, yaw: 1.2 }];
  dishes.forEach(d => { const g = D.dishCluster({ seed: Math.round(d.x) }); sc.place(g, d.x, d.z, { yaw: d.yaw, y: sc.y(d.x, d.z) - 0.2 }); bake.add(g); });

  // ---- the transformer yard between the switchback legs ----
  const yard = [];
  for (const [x, z] of [[-45, -216], [-45, -188], [-30, -207.5], [-30, -196.5], [-53, -202], [-60, -213], [-60, -191]]) yard.push({ x, z, y: sc.y(x, z), yaw: 0 });
  for (let gx = -104; gx <= -70; gx += 11) for (const z of [-214, -202, -190]) yard.push({ x: gx, z, y: sc.y(gx, z), yaw: 0 });
  sc.instances(partsOf(D.transformer()), yard, { solid: 2.3 });
  sc.instances(partsOf(D.floodMast({ h: 14 })), [{ x: -87.5, z: -196, yaw: 0.4 }, { x: -98.5, z: -208, yaw: 2.6 }, { x: -76.5, z: -208, yaw: -1.2 }].map(p => ({ ...p, y: sc.y(p.x, p.z) })), { solid: 0.6 });
  // pylons carrying power from the gas plants to the yard and on to the campus
  const pyl = D.pylon({ h: 30 }), pylParts = partsOf(pyl), arms = pyl.userData.arms;
  const chains = [
    [[-246, -212], [-212, -196], [-88, -202], [-12, -292]],
    [[-238, -84], [-232, 40], [-176, 128]],
    [[-120, 96], [-2, 104], [120, 100], [236, 132], [292, 112]],
  ];
  const wireMat = plastic(0x2a2e36, 0.6);
  for (const chain of chains) {
    const spots = chain.map(([x, z], k) => { const nx = chain[Math.min(k + 1, chain.length - 1)], pv = chain[Math.max(k - 1, 0)]; return { x, z, y: sc.y(x, z), yaw: Math.atan2(nx[0] - pv[0], nx[1] - pv[1]) + Math.PI / 2 }; });
    sc.instances(pylParts, spots, {});
    const wb = new ModelBuilder();
    for (let k = 0; k < spots.length - 1; k++) for (const a of arms) {
      const pa = spots[k], pb = spots[k + 1];
      const A = new THREE.Vector3(a[0], a[1], a[2]).applyAxisAngle(new THREE.Vector3(0, 1, 0), pa.yaw).add(new THREE.Vector3(pa.x, pa.y, pa.z));
      const B = new THREE.Vector3(a[0], a[1], a[2]).applyAxisAngle(new THREE.Vector3(0, 1, 0), pb.yaw).add(new THREE.Vector3(pb.x, pb.y, pb.z));
      const pts = []; for (let t = 0; t <= 8; t++) { const f = t / 8; pts.push(new THREE.Vector3().lerpVectors(A, B, f).add(new THREE.Vector3(0, -Math.sin(f * Math.PI) * 4, 0))); }
      wb.add('w', new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 10, 0.07, 4));
    }
    bake.builder(wb, { w: wireMat }, false);
  }

  // ---- the gas plants, belching ----
  const stacks = [];
  for (const pd of PLANTS) {
    const g = D.gasPlant({ color: pd.color, seed: pd.seed });
    sc.place(g, pd.x, pd.z, { yaw: pd.yaw, y: pd.y - 0.3, scale: PLANT_SCALE });
    g.updateMatrixWorld(true);
    for (const s of g.userData.stacks) { V.set(s[0], s[1], s[2]).applyMatrix4(g.matrixWorld); stacks.push({ x: V.x, y: V.y, z: V.z, ph: rng() * 6 }); }
    const sg = g.userData.sign, c = Math.cos(pd.yaw), s = Math.sin(pd.yaw), col = '#' + new THREE.Color(pd.color).getHexString();
    const r = atlas.add(1024, 200, (gg, w, h) => { gg.fillStyle = '#ffffff'; gg.fillRect(0, 0, w, h); gg.fillStyle = col; gg.fillRect(0, 0, 24, h); fitText(gg, pd.name, w / 2 + 12, h * 0.36, w - 80, 92, SANS, '#2c323c', { lines: 1 }); fitText(gg, pd.line, w / 2 + 12, h * 0.76, w - 80, 46, SANS, col, { lines: 1 }); });
    atlas.place(r, [pd.x + (sg.z + 0.1) * PLANT_SCALE * s, pd.y + sg.y * PLANT_SCALE, pd.z + (sg.z + 0.1) * PLANT_SCALE * c], pd.yaw, sg.w * PLANT_SCALE, sg.w * PLANT_SCALE / 5.12);
    bake.add(g, false);
  }

  // ---- the smog: a brown pall hanging over each plant and drifting off across the valley ----
  const smogTex = canvasTexture(THREE, 256, 256, (g, w, h) => {
    const r = makeRng(17); g.clearRect(0, 0, w, h);
    for (let k = 0; k < 70; k++) { const a = r() * 6.28, d = Math.sqrt(r()) * w * 0.36, x = w / 2 + Math.cos(a) * d, y = h / 2 + Math.sin(a) * d, rr = w * (0.08 + r() * 0.12); const gr = g.createRadialGradient(x, y, 0, x, y, rr); gr.addColorStop(0, 'rgba(255,255,255,0.32)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(x - rr, y - rr, rr * 2, rr * 2); }
  });
  const smogDisc = new THREE.CircleGeometry(1, 40); smogDisc.rotateX(-Math.PI / 2);
  const palls = [];
  const wl = Math.hypot(WIND[0], WIND[2]), wx = WIND[0] / wl, wz = WIND[2] / wl;
  PLANTS.forEach((pd, k) => {
    for (const [y, r, op, off, col] of [[118, 240, 0.78, 40, 0x5e4f3e], [150, 200, 0.66, 120, 0x6e5e4a], [96, 160, 0.6, -20, 0x52473a]]) {
      const m = new THREE.Mesh(smogDisc, new THREE.MeshBasicMaterial({ map: smogTex, color: col, transparent: true, opacity: op, depthWrite: false, side: THREE.DoubleSide, fog: false }));
      m.position.set(pd.x + wx * off, pd.y + y, pd.z + wz * off); m.scale.set(r, 1, r * 0.75); m.renderOrder = 4; ctx.group.add(m);
      palls.push({ m, x: m.position.x, z: m.position.z, ph: k * 2 + y, drift: off > 100 });
    }
  });
  anim.push((dt, time) => { const sg = view.dcLake?.smog ?? 0; for (const p of palls) { p.op0 ??= p.m.material.opacity; p.m.material.opacity = Math.min(1, p.op0 * (0.55 + 1.5 * sg)); p.m.rotation.y = time * 0.01 + p.ph; const f = p.drift ? (time * 4) % 260 : 0; p.m.position.x = p.x + wx * f + Math.sin(time * 0.05 + p.ph) * 8; p.m.position.z = p.z + wz * f; p.m.material.opacity = p.m.material.opacity; } });

  // ---- pines over every slope, and a few on the campus edges ----
  const keep = (x, z) => !inHall(x, z) && !TOWERS.some(t => near(x, z, t, 22)) && !dishes.some(d => near(x, z, d, 16)) && !chains.flat().some(([px, pz]) => near(x, z, { x: px, z: pz }, 7))
    && !PLANTS.some(p => { const [u, v] = plantLocal(p, x, z); return Math.abs(u - 6) < 132 && Math.abs(v + 6) < 84; }) && !(z < LAKE.zDam + 30 && lakeE(x, z) < BENCH.e0 + BENCH.n * BENCH.de + 0.05) && !lakeFx.nearPipe(x, z, 6);
  const pines = sc.scatter({ count: 520, min: 15, max: 230, maxSlope: 1.0, minGap: 4.5, where: (x, z, h) => h > 2.2 && keep(x, z) && clear(x, z, 1) });
  const pA = partsOf(D.pine(1, { h: 12 })), pB = partsOf(D.pine(2, { h: 15, colorA: 0x2a5e34, colorB: 0x37703f })), pC = partsOf(D.pine(3, { h: 9.5, colorA: 0x3a7a40, colorB: 0x4a8a4a }));
  sc.instances(pA, pines.filter((_, i) => i % 3 === 0), { scale: [0.8, 1.4], yaw: 'random', tilt: 0.03 });
  sc.instances(pB, pines.filter((_, i) => i % 3 === 1), { scale: [0.8, 1.5], yaw: 'random', tilt: 0.03 });
  sc.instances(pC, pines.filter((_, i) => i % 3 === 2), { scale: [0.8, 1.3], yaw: 'random', tilt: 0.03 });
  const edgePines = sc.scatter({ count: 90, min: 13, max: 60, maxSlope: 0.6, minGap: 6, where: (x, z, h) => h > 0.2 && keep(x, z) && clear(x, z, 1.5) && !(x > -70 && x < 130 && z > -300 && z < -40) });
  sc.instances(pC, edgePines, { scale: [0.7, 1.1], yaw: 'random' });

  // ---- corner boards and billboards ----
  const chev = P.chevronBoard(0x1f6bff);
  for (const c of track.corners) {
    const side = c.dir > 0 ? -1 : 1, n = Math.max(2, Math.min(5, Math.round(c.len / 15)));
    for (let k = 0; k < n; k++) {
      const i = (c.i0 + Math.round(((k + 0.6) / n) * (c.len / track.ds))) % track.N;
      if (track.tunnel[i] || track.bridge[i]) continue;
      const edge = side > 0 ? track.edgeL[i] : track.edgeR[i];
      const p = sc.beside(track.cp[i], side, edge === EDGE.OPEN ? (side > 0 ? track.outerL[i] : track.outerR[i]) + 1.2 : 1.2);
      const b = chev.clone(); sc.place(b, p.x, p.z, { yaw: p.yaw, lift: edge === EDGE.OPEN ? 0.9 : 0.4 }); if (c.dir > 0) b.scale.x = -1;
      bake.add(b, false);
    }
  }
  const frame = P.billboard(null, { w: 15, h: 5, legs: 6, frame: 0x3a414c }); frame.remove(frame.children[frame.children.length - 1]);   // keep the frame, drop the blank panel
  const BS = 1.5;   // billboards half again as big as the stock ones
  BOARDS.forEach(([cp, side, off, text, bg, fg], i) => {
    const p = sc.beside(cp, side, off + 4); if (!clear(p.x, p.z, 0.5) || inHallBox(p.x, p.z, 3) || campus.inside(p.x, p.z, 3)) return;
    const approach = track.indexAtCp(cp - 0.65);
    const yaw = Math.atan2(track.px[approach] - p.x, track.pz[approach] - p.z), f = frame.clone(); sc.place(f, p.x, p.z, { yaw, scale: BS }); bake.add(f);
    const r = atlas.add(768, 256, text === 'BEFORE' ? lakeMural : (g, w, h) => {
      g.fillStyle = bg; g.fillRect(0, 0, w, h);
      const sh = g.createLinearGradient(0, 0, w, h); sh.addColorStop(0, 'rgba(255,255,255,0.16)'); sh.addColorStop(0.5, 'rgba(255,255,255,0)'); sh.addColorStop(1, 'rgba(0,0,0,0.14)'); g.fillStyle = sh; g.fillRect(0, 0, w, h);
      fitText(g, text, w / 2 + 3, h / 2 + 7, w - 60, 104, FONT, 'rgba(0,0,0,0.25)'); fitText(g, text, w / 2, h / 2 + 4, w - 60, 104, FONT, fg);
      g.strokeStyle = 'rgba(255,255,255,0.5)'; g.lineWidth = 6; g.strokeRect(8, 8, w - 16, h - 16);
    });
    const y = sc.y(p.x, p.z);
    atlas.place(r, [p.x + Math.sin(yaw) * 0.03, y + (6 + 2.5) * BS, p.z + Math.cos(yaw) * 0.03], yaw, 15 * BS, 5 * BS);
    void i;
  });

  // ---- the sky: a blimp over the campus ----
  const ship = P.blimp('NOW TRAINING ON YOU', { color: 0xf4f4f0, accent: 0x1f6bff }); ship.scale.setScalar(1.2); ctx.group.add(ship);
  const cx = track.bounds.cx, cz = track.bounds.cz;
  anim.push((dt, time) => { const a = time * 0.03; ship.position.set(cx + Math.cos(a) * 170, 92 + Math.sin(time * 0.3) * 2, cz + Math.sin(a) * 150); ship.rotation.y = -a; });

  bake.flush();
  atlas.flush();

  // ---- smoke and steam ----
  const fx = view.fx, smoke = fx.smoke;
  const belch = (s, big) => {
    const a = rng() * 6.28, rr = rng() * 3;
    smoke.emit({ x: s.x + Math.cos(a) * rr, y: s.y + rng() * 2, z: s.z + Math.sin(a) * rr, vx: WIND[0] + rng.range(-1.5, 1.5), vy: 7 + rng() * 5, vz: WIND[2] + rng.range(-1.5, 1.5),
      color: big ? [0.06, 0.055, 0.055] : [0.1, 0.095, 0.095], color2: [0.38, 0.36, 0.34], size: (big ? 26 : 18) + rng() * 6, grow: 4, drag: 0.08, gravity: -0.45, life: 17 + rng() * 5, alpha: big ? 1 : 0.9, fadeIn: 0.04, spin: rng.range(-0.3, 0.3), rot: rng() * 6.28 });
  };
  const steam = (t, n) => { for (let k = 0; k < n; k++) { const a = rng() * 6.28, rr = rng() * t.r * 0.7; smoke.emit({ x: t.x + Math.cos(a) * rr, y: t.y + 0.5, z: t.z + Math.sin(a) * rr, vx: WIND[0] * 0.6 + rng.range(-1, 1), vy: 5 + rng() * 3, vz: WIND[2] * 0.6 + rng.range(-1, 1), color: [0.9, 0.91, 0.93], color2: [0.8, 0.82, 0.86], size: 9 + rng() * 5, grow: 2.6, drag: 0.4, gravity: -0.6, life: 6 + rng() * 2, alpha: 0.55, fadeIn: 0.08, spin: rng.range(-0.3, 0.3) }); } };
  const tick = (dt, time) => {
    for (const s of stacks) {
      for (let k = 0, n = fx.count(4.4, dt); k < n; k++) belch(s, false);
      for (let k = 0, n = fx.count(2.5, dt); k < n; k++) smoke.emit({ x: s.x + rng.range(-1.5, 1.5), y: s.y + 1, z: s.z + rng.range(-1.5, 1.5), vx: WIND[0] * 0.5, vy: 6 + rng() * 2, vz: WIND[2] * 0.5, color: [0.04, 0.04, 0.04], color2: [0.16, 0.15, 0.15], size: 16 + rng() * 6, grow: 2.2, drag: 0.3, gravity: -0.4, life: 4 + rng() * 2, alpha: 1, fadeIn: 0.05, spin: rng.range(-0.4, 0.4) });
      const beat = Math.sin(time * 1.7 + s.ph);                         // every few seconds a fat black burp
      if (beat > 0.97) for (let k = 0, n = fx.count(26, dt); k < n; k++) belch(s, true);
    }
    for (const t of towers) steam(t, fx.count(4, dt));
    // the transformer yard arcs now and then: a crackle of blue sparks off a bushing
    if (fx.count(1.6, dt)) { const t = yard[Math.floor(rng() * yard.length)], x0 = t.x - 1 + Math.floor(rng() * 3); for (let k = 0; k < 18; k++) fx.add.emit({ x: x0, y: t.y + 4.45, z: t.z, vx: rng.range(-4, 4), vy: rng.range(0, 5), vz: rng.range(-4, 4), color: [0.55, 0.85, 1], size: 0.35 + rng() * 0.3, life: 0.25 + rng() * 0.3, gravity: 9, alpha: 1 }); }
  };
  for (let k = 0; k < 80; k++) { tick(0.25, k * 0.25); smoke.update(0.25); }   // the plumes are already up when the race starts
  anim.push(tick);
  anim.push((dt, time) => { hallFx(dt, time); campus.update(dt, time); lakeFx.update(dt, time); });
}

/* ---------- Training Hall 9 ---------- */
function trainingHall({ THREE, track, ctx, sc, rng, bake, atlas, view, rackSys, counterAt }) {
  const FY = HB.fy, group = ctx.group;
  // distance from the road edge, over the samples inside and around the hall
  const iA = track.indexAtCp(0.9), iB = track.indexAtCp(4.2), idx = []; for (let i = iA; i <= iB; i++) idx.push(i);
  const edgeDist = (x, z) => { let best = 1e9; for (const i of idx) { const d = (x - track.px[i]) ** 2 + (z - track.pz[i]) ** 2; if (d < best) best = d; } return Math.sqrt(best) - track.hwL[iA]; };

  /* textures: raised floor tiles, the road version of them, wall panels, rack fronts and their blinking LEDs */
  const floorTex = canvasTexture(THREE, 512, 512, (g, w, h) => {
    const n = 8, t = w / n; g.fillStyle = '#172433'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
      g.fillStyle = (i * 3 + j * 5) % 11 === 0 ? '#2c4052' : '#354958'; g.fillRect(i * t + 2, j * t + 2, t - 4, t - 4);
      if ((i + j * 3) % 7 === 0) { g.fillStyle = '#141d24'; for (let a = 6; a < t - 4; a += 6) for (let b = 6; b < t - 4; b += 6) g.fillRect(i * t + a, j * t + b, 2.5, 2.5); }
    }
  }, { repeat: true });
  floorTex.repeat.set(1, 1);
  const roadTex = canvasTexture(THREE, 1024, 1024, (g, w, h) => {
    g.fillStyle = '#17202d'; g.fillRect(0, 0, w, h);
    const tu = w / (17 / 0.6), tv = h / (18 / 0.6);
    for (let i = 0; i * tu < w; i++) for (let j = 0; j * tv < h; j++) {
      g.fillStyle = (i * 3 + j * 5) % 11 === 0 ? '#293644' : '#303d4d'; g.fillRect(i * tu + 2, j * tv + 2, tu - 4, tv - 4);
      if ((i * 7 + j * 3) % 9 === 0) { g.fillStyle = '#111b24'; for (let a = 5; a < tu - 4; a += 5) for (let b = 5; b < tv - 4; b += 5) g.fillRect(i * tu + a, j * tv + b, 2, 2); }
    }
    for (let i = 0; i < 16; i++) { g.fillStyle = i % 2 ? '#ffc928' : '#1a1d26'; g.fillRect(0, i * h / 16, w * 0.035, h / 16); g.fillRect(w * 0.965, i * h / 16, w * 0.035, h / 16); }
    g.fillStyle = '#83939e'; for (let j = 0; j < 4; j++) g.fillRect(w * 0.494, j * h / 4 + h * 0.05, w * 0.012, h * 0.14);
  }, { repeat: true });
  const roadMat = view.trackMesh?.userData?.mats?.road_hallfloor;
  if (roadMat) { roadMat.map = roadTex; roadMat.emissiveMap = roadTex; roadMat.emissive.set(0xffffff); roadMat.emissiveIntensity = 0.22; roadMat.roughness = 0.5; roadMat.needsUpdate = true; }
  const wallTex = canvasTexture(THREE, 256, 256, (g, w, h) => { g.fillStyle = '#eceef1'; g.fillRect(0, 0, w, h); g.fillStyle = '#cfd4da'; g.fillRect(0, 0, 3, h); g.fillRect(w / 2, 0, 3, h); g.fillStyle = '#dde1e6'; g.fillRect(0, h - 3, w, 3); }, { repeat: true });
  const rackMat = rackSys.mat, ledFrames = rackSys.frames;   // shared with the Cooling Annex: one mesh, one blink

  /* the shell: walls with two doorways, a ceiling inside, a roof with a parapet outside */
  const walls = new Quads(), T = 0.6, H = HB.H;
  const wuv = (f, a, b, c, d) => { const horiz = f === 'px' || f === 'nx' ? (p => p[2]) : (p => p[0]); return [[horiz(a) / 4, a[1] / 4], [horiz(b) / 4, b[1] / 4], [horiz(c) / 4, c[1] / 4], [horiz(d) / 4, d[1] / 4]]; };
  const wbox = (x0, x1, y0, y1, z0, z1) => walls.box(x0, x1, y0, y1, z0, z1, wuv);
  wbox(HB.x0, HB.x0 + T, -1, H, HB.z0, ENTRY.z0); wbox(HB.x0, HB.x0 + T, -1, H, ENTRY.z1, HB.z1); wbox(HB.x0, HB.x0 + T, HB.door, H, ENTRY.z0, ENTRY.z1);
  wbox(HB.x1 - T, HB.x1, -1, H, HB.z0, HB.z1);
  wbox(HB.x0, HB.x1, -1, H, HB.z1 - T, HB.z1);
  wbox(HB.x0, EXIT.x0, -1, H, HB.z0, HB.z0 + T); wbox(EXIT.x1, HB.x1, -1, H, HB.z0, HB.z0 + T); wbox(EXIT.x0, EXIT.x1, HB.door, H, HB.z0, HB.z0 + T);
  // doorway reveals: dark steel frames
  const trim = new ModelBuilder();
  for (const z of [ENTRY.z0, ENTRY.z1]) trim.add('frame', box(1.4, HB.door + 0.6, 0.6, 0.1, 1), { p: [HB.x0 - 0.1, HB.door / 2 - 0.2, z] });
  trim.add('frame', box(1.4, 0.8, ENTRY.z1 - ENTRY.z0 + 0.6, 0.1, 1), { p: [HB.x0 - 0.1, HB.door + 0.1, (ENTRY.z0 + ENTRY.z1) / 2] });
  for (const x of [EXIT.x0, EXIT.x1]) trim.add('frame', box(0.6, HB.door + 0.6, 1.4, 0.1, 1), { p: [x, HB.door / 2 - 0.2, HB.z0 - 0.1] });
  trim.add('frame', box(EXIT.x1 - EXIT.x0 + 0.6, 0.8, 1.4, 0.1, 1), { p: [(EXIT.x0 + EXIT.x1) / 2, HB.door + 0.1, HB.z0 - 0.1] });
  // the roof and parapet
  trim.add('roof', box(HB.x1 - HB.x0 + 0.4, 0.5, HB.z1 - HB.z0 + 0.4, 0.1, 1), { p: [(HB.x0 + HB.x1) / 2, H - 0.2, (HB.z0 + HB.z1) / 2] });
  for (const z of [HB.z0, HB.z1]) trim.add('cap', box(HB.x1 - HB.x0 + 0.8, 1.2, 0.8, 0.1, 1), { p: [(HB.x0 + HB.x1) / 2, H + 0.5, z] });
  for (const x of [HB.x0, HB.x1]) trim.add('cap', box(0.8, 1.2, HB.z1 - HB.z0 + 0.8, 0.1, 1), { p: [x, H + 0.5, (HB.z0 + HB.z1) / 2] });
  for (const z of [HB.z0, HB.z1]) trim.add('band', box(HB.x1 - HB.x0 + 0.3, 1.4, 0.3, 0.05, 1), { p: [(HB.x0 + HB.x1) / 2, H - 1.6, z + (z > 0 ? 0.15 : -0.15)] });
  for (const x of [HB.x0, HB.x1]) trim.add('band', box(0.3, 1.4, HB.z1 - HB.z0 + 0.3, 0.05, 1), { p: [x + (x > 150 ? 0.15 : -0.15), H - 1.6, (HB.z0 + HB.z1) / 2] });
  trim.add('accent', box(0.32, 0.5, HB.z1 - HB.z0 + 0.32, 0.05, 1), { p: [HB.x0 - 0.16, H - 2.8, (HB.z0 + HB.z1) / 2] });
  // loading docks on the east face
  for (let k = 0; k < 6; k++) { const z = -110 + k * 9; trim.add('door', box(0.3, 3.6, 3.4, 0.05, 1), { p: [HB.x1 + 0.1, 2.0, z] }); trim.add('bumper', box(0.6, 0.6, 3.8, 0.05, 1), { p: [HB.x1 + 0.35, 0.8, z] }); }
  trim.add('canopy', box(3.2, 0.3, 58, 0.05, 1), { p: [HB.x1 + 1.6, 4.9, -87.5] });
  bake.builder(trim, { frame: plastic(0x3a414c, 0.5, 0.4), roof: plastic(0x9aa1aa, 0.8), cap: plastic(0xc9ced5, 0.7), band: plastic(0x6b7380, 0.6, 0.3), accent: plastic(0x1f6bff, 0.5), door: plastic(0x59616d, 0.6), bumper: plastic(0x16181c, 0.6), canopy: plastic(0x9aa3ad, 0.6) }, false);
  { const ch = []; for (let x = HB.x0 + 12; x < HB.x1 - 6; x += 9) for (let z = HB.z0 + 8; z < HB.z1 - 6; z += 7.5) if ((Math.round(x / 9) + Math.round(z / 7.5)) % 3 !== 0) ch.push({ x, y: H, z, yaw: 0 }); sc.instances(partsOf(D.chiller()), ch, { cast: false }); }
  const wallMat = new THREE.MeshStandardMaterial({ map: wallTex, roughness: 0.75, emissive: 0xffffff, emissiveMap: wallTex, emissiveIntensity: 0.28 });
  bake.geo(wallMat, walls.geometry(THREE), false);
  // floor and ceiling
  const fc = new Quads();
  fc.quad([HB.x0, FY, HB.z1], [HB.x1, FY, HB.z1], [HB.x1, FY, HB.z0], [HB.x0, FY, HB.z0], [HB.x0 / 4.8, -HB.z1 / 4.8, HB.x1 / 4.8, -HB.z0 / 4.8]);
  const floorMat = new THREE.MeshStandardMaterial({ map: floorTex, emissiveMap: floorTex, emissive: 0xffffff, emissiveIntensity: 0.32, roughness: 0.45, polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1 });
  bake.geo(floorMat, fc.geometry(THREE), false);
  const ceil = new Quads();
  ceil.quad([HB.x0, HB.ceil, HB.z0], [HB.x1, HB.ceil, HB.z0], [HB.x1, HB.ceil, HB.z1], [HB.x0, HB.ceil, HB.z1]);
  bake.geo(plastic(0x2e333b, 0.9), ceil.geometry(THREE), false);

  /* rack rows: pairs of rows along X with a contained cold aisle between them, clipped clear of the road */
  const racks = new Quads(), cont = new Quads(), contHot = new Quads(), ov = new ModelBuilder();
  const RD = 1.1, COLD = 1.4, PITCH = 5.6, HR = 3.5, CAB = 0.6, CLR = 2.4;
  // delivery bay on the south side of the entry leg: a rack being dropped off (see below) — keep its floor clear of cabinets
  const DV = { x: 128, z: -13.5 };
  const inDV = (x, zm) => Math.abs(x - DV.x) < 5.4 && Math.abs(zm - DV.z) < 4.4;
  const ruv = (f, a, b, c, d) => {
    if (f === 'pz' || f === 'nz') { const s = f === 'pz' ? 1 : -1; return [[s * a[0] / RACK_TILE, 0.2 + 0.8 * (a[1] - FY) / HR], [s * b[0] / RACK_TILE, 0.2 + 0.8 * (b[1] - FY) / HR], [s * c[0] / RACK_TILE, 0.2 + 0.8 * (c[1] - FY) / HR], [s * d[0] / RACK_TILE, 0.2 + 0.8 * (d[1] - FY) / HR]]; }
    return [[0, 0.04], [0.2, 0.04], [0.2, 0.16], [0, 0.16]];
  };
  const labels = [];
  let pair = 0;
  for (let z = HB.z1 - 4.5 - (2 * RD + COLD); z > HB.z0 + 4.5; z -= PITCH, pair++) {
    const zA = z, zB = z + RD + COLD, zC = z + 2 * RD + COLD;   // row A [zA, zA+RD], cold aisle, row B [zB, zC]
    const xs = [];
    let k = 0;
    for (let x = HB.x0 + 4.5; x + CAB < HB.x1 - 4.5; x += CAB, k++) {
      if (k % 23 >= 20) { xs.push(null); continue; }                 // a cross aisle every 20 cabinets
      const ok = [zA, zC, (zA + zC) / 2].every(zz => edgeDist(x, zz) > CLR && edgeDist(x + CAB, zz) > CLR) && !inDV(x + CAB / 2, (zA + zC) / 2);
      xs.push(ok ? x : null);
    }
    // runs of consecutive cabinets
    for (let a = 0; a < xs.length; a++) {
      if (xs[a] == null) continue;
      let b = a; while (b + 1 < xs.length && xs[b + 1] != null) b++;
      const x0 = xs[a], x1 = xs[b] + CAB; a = b;
      if (x1 - x0 < CAB * 3) continue;
      racks.box(x0, x1, FY, FY + HR, zA, zA + RD, ruv); racks.box(x0, x1, FY, FY + HR, zB, zC, ruv);
      // containment: a roof over the aisle and doors at both ends. The four pairs flanking the northbound leg run HOT —
      // same glass, red tint, plus a heat-glow strip under the roof (the "HOT AISLE: SPICY" sign was not joking).
      const hot = (zA + zC) / 2 <= -76 && (zA + zC) / 2 >= -100, cq = hot ? contHot : cont;
      cq.quad([x0, FY + HR + 0.02, zB], [x1, FY + HR + 0.02, zB], [x1, FY + HR + 0.02, zA + RD], [x0, FY + HR + 0.02, zA + RD], [0, 0, (x1 - x0) / 1.2, 1]);
      if (hot) ov.add('hotglow', new THREE.BoxGeometry(x1 - x0, 0.1, 0.34), { p: [(x0 + x1) / 2, FY + HR - 0.12, (zA + zC) / 2] });
      for (const [xe, s] of [[x0, -1], [x1, 1]]) {
        const q = s > 0 ? [[xe, FY, zC - RD], [xe, FY, zA + RD], [xe, FY + HR, zA + RD], [xe, FY + HR, zC - RD]] : [[xe, FY, zA + RD], [xe, FY, zC - RD], [xe, FY + HR, zC - RD], [xe, FY + HR, zA + RD]];
        cq.quad(q[0], q[1], q[2], q[3], [0, 0, 1, 1]);
        if (edgeDist(xe + s * 2, (zA + zC) / 2) < CLR + 6) labels.push({ x: xe + s * 0.05, z: (zA + zC) / 2, yaw: s > 0 ? Math.PI / 2 : -Math.PI / 2, pair });
      }
      // yellow fiber trays over the rows, grey cable ladders over the hot aisles
      for (const zc of [zA + RD / 2, zB + RD / 2]) ov.add('tray', new THREE.BoxGeometry(x1 - x0, 0.14, 0.42), { p: [(x0 + x1) / 2, FY + HR + 0.62, zc] });
      ov.add('ladder', new THREE.BoxGeometry(x1 - x0, 0.08, 0.5), { p: [(x0 + x1) / 2, FY + HR + 1.18, zA - (PITCH - 2 * RD - COLD) / 2] });
    }
  }
  bake.geo(rackMat, racks.geometry(THREE), false);
  const contMat = new THREE.MeshStandardMaterial({ color: 0xbfe2ff, transparent: true, opacity: 0.32, roughness: 0.1, metalness: 0.2, depthWrite: false, side: THREE.DoubleSide });
  bake.geo(contMat, cont.geometry(THREE), false);
  const contHotMat = new THREE.MeshStandardMaterial({ color: 0xff7a52, transparent: true, opacity: 0.38, roughness: 0.15, metalness: 0.1, depthWrite: false, side: THREE.DoubleSide });
  bake.geo(contHotMat, contHot.geometry(THREE), false);
  const rowName = k => (k >= 26 ? String.fromCharCode(65 + Math.floor(k / 26) - 1) : '') + String.fromCharCode(65 + (k % 26));
  const labelIds = new Map();
  const rowJokes = ['RACK 4,096: DO NOT SHAKE', 'THIS ONE HUMS IN B FLAT', 'EMOTIONAL SUPPORT RACK', 'CONTENTS: ONE (1) INTERNET'];
  const jokeIds = rowJokes.map(t => atlas.add(512, 80, signDraw(t, { bg: '#20242c', fg: '#ffd34d', font: SANS, size: 40, lines: 1 })));
  let jokeK = 0;
  for (const l of labels) {
    if (!labelIds.has(l.pair)) labelIds.set(l.pair, atlas.add(256, 80, signDraw('ROW ' + rowName(l.pair), { bg: '#1f6bff', fg: '#ffffff', font: SANS, size: 54, lines: 1 })));
    atlas.place(labelIds.get(l.pair), [l.x, FY + HR + 0.42, l.z], l.yaw, 2.2, 0.68);
    // a taped-on joke label at driver height on the containment door itself
    atlas.place(jokeIds[jokeK++ % jokeIds.length], [l.x + Math.sign(l.yaw) * 0.1, FY + 1.5, l.z], l.yaw, 2.4, 0.38);
  }
  // overhead: ducts along Z, light strips along X, a pair of yellow fiber bridges over the road
  for (let x = HB.x0 + 10; x < HB.x1 - 4; x += 18) ov.add('duct', cyl(0.55, 0.55, HB.z1 - HB.z0 - 2, 14, true), { p: [x, 10.0, (HB.z0 + HB.z1) / 2], r: [Math.PI / 2, 0, 0] });
  for (let z = HB.z0 + 3; z < HB.z1 - 2; z += 4.2) ov.add('light', new THREE.BoxGeometry(HB.x1 - HB.x0 - 3, 0.07, 0.34), { p: [(HB.x0 + HB.x1) / 2, HB.ceil - 0.08, z] });
  for (let z = HB.z0 + 18; z < HB.z1 - 10; z += 24) ov.add('tray', new THREE.BoxGeometry(HB.x1 - HB.x0 - 4, 0.16, 0.5), { p: [(HB.x0 + HB.x1) / 2, 8.6, z] });
  bake.builder(ov, { tray: plastic(0xffc928, 0.5), ladder: plastic(0x8d96a6, 0.4, 0.6), duct: plastic(0xc9cfd6, 0.3, 0.7), light: glow(0xa2d9ef, 0.95), hotglow: glow(0xff2d16, 2.6) }, false);

  // cooling units round the walls, inside
  const units = [], free = (x, z) => edgeDist(x, z) > 2.5;
  for (let z = HB.z0 + 4; z < HB.z1 - 3; z += 3.4) { if (free(HB.x0 + 1.4, z)) units.push({ x: HB.x0 + 1.2, y: FY, z, yaw: Math.PI / 2 }); if (free(HB.x1 - 1.4, z)) units.push({ x: HB.x1 - 1.2, y: FY, z, yaw: -Math.PI / 2 }); }
  for (let x = HB.x0 + 4; x < HB.x1 - 3; x += 3.4) { if (free(x, HB.z1 - 1.4)) units.push({ x, y: FY, z: HB.z1 - 1.2, yaw: Math.PI }); if (free(x, HB.z0 + 1.4) && (x < 133 || x > 156)) units.push({ x, y: FY, z: HB.z0 + 1.2, yaw: 0 }); }
  sc.instances(partsOf(D.crah()), units, { cast: false });
  // fire suppression by both doors
  for (const [x, z, yaw] of [[HB.x0 + 1.4, 15.5, Math.PI / 2], [HB.x0 + 1.4, -17, Math.PI / 2], [EXIT.x1 + 7, HB.z0 + 1.4, 0]]) { const fb = D.fireBank(8); sc.place(fb, x, z, { yaw, y: FY }); bake.add(fb, false); }

  /* the silly bits */
  const roadAt = cp => track.indexAtCp(cp);
  // a big door for GPUs and a tiny one for humans, on the far wall as you head for the exit
  {
    const zf = HB.z0 + T + 0.05;
    const big = atlas.add(512, 448, (g, w, h) => { g.fillStyle = '#8d96a6'; g.fillRect(0, 0, w, h); g.fillStyle = '#7a8392'; for (let y = 0; y < h; y += 16) g.fillRect(0, y, w, 4); g.fillStyle = '#ffc928'; g.fillRect(0, h - 26, w, 26); fitText(g, 'GPUs', w / 2, h * 0.36, w * 0.8, 150, SANS, '#1a1d29', { lines: 1 }); fitText(g, 'AUTHORIZED SILICON ONLY', w / 2, h * 0.62, w * 0.85, 40, SANS, '#1a1d29', { lines: 1 }); });
    atlas.place(big, [140, FY + 3.5, zf], 0, 8, 7);
    const tiny = atlas.add(96, 192, (g, w, h) => { g.fillStyle = '#5b636f'; g.fillRect(0, 0, w, h); g.fillStyle = '#7d8590'; g.fillRect(6, 6, w - 12, h - 12); g.fillStyle = '#ffd23c'; g.beginPath(); g.arc(w * 0.78, h * 0.55, 5, 0, 7); g.fill(); });
    atlas.place(tiny, [150, FY + 0.7, zf], 0, 0.7, 1.4);
    const hs = atlas.add(256, 72, signDraw('HUMANS', { bg: '#ffffff', fg: '#1a1d29', font: SANS, size: 50, lines: 1, border: '#1a1d29' }));
    atlas.place(hs, [150, FY + 2.25, zf], 0, 3.4, 0.96);
  }
  // a rack all of its own, labelled YOUR DATA, on the walkway beside the road
  {
    const i = roadAt(3.3), p = { x: track.px[i] - track.lx[i] * (track.hwR[i] + 2.4), z: track.pz[i] - track.lz[i] * (track.hwR[i] + 2.4) };
    const one = new Quads(); one.box(p.x - 0.55, p.x + 0.55, FY, FY + HR, p.z - 0.9, p.z + 0.9, (f, a, b, c, d) => f === 'nx' ? [[0, 0.2], [0.5, 0.2], [0.5, 1], [0, 1]] : [[0, 0.04], [0.2, 0.04], [0.2, 0.16], [0, 0.16]]);
    bake.geo(rackMat, one.geometry(THREE), false);
    const s = atlas.add(512, 160, signDraw('YOUR DATA', { bg: '#e23b3b', fg: '#ffffff', font: SANS, size: 92, lines: 1 }));
    atlas.place(s, [p.x - 0.6, FY + HR + 0.95, p.z], -Math.PI / 2, 4.2, 1.31, 0, true);
    const s2 = atlas.add(320, 80, signDraw('(TRAINING IN PROGRESS)', { bg: '#ffffff', fg: '#e23b3b', font: SANS, size: 34, lines: 1 }));
    atlas.place(s2, [p.x - 0.57, FY + 1.6, p.z], -Math.PI / 2, 1.6, 0.4);
  }
  // the cage round the most important rack
  {
    const cx0 = 112, cx1 = 134, cz0 = 11.8, cz1 = 19.2, q = new Quads(), hh = 3.0;
    const runs = [[[cx0, cz0], [cx1, cz0]], [[cx1, cz0], [cx1, cz1]], [[cx0, cz1], [cx0, cz0]]];
    const pb = new ModelBuilder();
    for (const [[ax, az], [bx, bz]] of runs) { q.quad([ax, FY, az], [bx, FY, bz], [bx, FY + hh, bz], [ax, FY + hh, az], [0, 0, Math.hypot(bx - ax, bz - az) / 0.6, hh / 0.6]); for (let t = 0; t <= 1.001; t += 0.25) pb.add('post', cyl(0.05, 0.05, hh, 5), { p: [ax + (bx - ax) * t, FY + hh / 2, az + (bz - az) * t] }); }
    bake.builder(pb, { post: plastic(0x5b636f, 0.4, 0.6) }, false);
    const link = canvasTexture(THREE, 32, 32, (g, w, h) => { g.clearRect(0, 0, w, h); g.strokeStyle = '#4a525e'; g.lineWidth = 2; g.beginPath(); g.moveTo(0, 0); g.lineTo(w, h); g.moveTo(w, 0); g.lineTo(0, h); g.stroke(); }, { repeat: true });
    const m = new THREE.Mesh(q.geometry(THREE), new THREE.MeshStandardMaterial({ map: link, alphaTest: 0.4, side: THREE.DoubleSide, roughness: 0.5, metalness: 0.5 })); m.matrixAutoUpdate = false; group.add(m);
    const s = atlas.add(512, 150, signDraw('AGI · DO NOT FEED', { bg: '#ffd23c', fg: '#1a1d29', font: SANS, size: 70, lines: 1, border: '#1a1d29' }));
    atlas.place(s, [(cx0 + cx1) / 2, FY + 2.3, cz0 - 0.05], Math.PI, 5.4, 1.58);
  }
  // hanging signs over the road
  {
    const hang = new ModelBuilder();
    const s1 = atlas.add(1024, 160, signDraw('QUIET PLEASE · MODEL IS THINKING', { bg: '#1a1d29', fg: '#ffffff', font: SANS, size: 76, lines: 1, stripe: '#1f6bff' }));
    atlas.place(s1, [112, 7.4, -0.3], -Math.PI / 2, 15, 2.34, 0, true);
    const s2 = atlas.add(1024, 160, signDraw('EXIT → LAKE (WHILE IT LASTS)', { bg: '#16a34a', fg: '#ffffff', font: SANS, size: 76, lines: 1 }));
    atlas.place(s2, [172, 7.4, -128], 0, 15, 2.34, 0, true);
    for (const [x, z] of [[112, -5], [112, 4.4], [167, -128], [177, -128]]) hang.add('c', cyl(0.03, 0.03, HB.ceil - 8.4, 4), { p: [x, (HB.ceil + 8.4) / 2, z] });
    const s3 = atlas.add(640, 160, signDraw('HOT AISLE: SPICY', { bg: '#ff6a00', fg: '#ffffff', font: SANS, size: 80, lines: 1 }));
    atlas.place(s3, [HB.x1 - T - 0.05, 6.2, -40], -Math.PI / 2, 9, 2.25);
    bake.builder(hang, { c: plastic(0x2c323c, 0.5) }, false);
  }
  /* ---------- round 2: the hall gets involved — status wall, doorway glass, cable gantries, a delivery ---------- */
  let statusWall = null;
  {
    const rp = (i, lat, up) => [track.px[i] + track.lx[i] * lat + track.ux[i] * up, track.py[i] + track.ly[i] * lat + track.uy[i] * up, track.pz[i] + track.lz[i] * lat + track.uz[i] * up];
    const gb = new ModelBuilder(), cables = new Quads(), glass2 = new Quads(), dvRack = new Quads(), wrap = new Quads();

    // the WHO RUNS THIS? status wall: a 30 m LED board on the south wall, animated by hallFx below
    statusWall = ledSign(THREE, sc.group, 1024, 256, [152, FY + 5.5, HB.z1 - 0.68], Math.PI, 30, 5.6);

    // cold-aisle containment glass flanking both doorways — one panel of each pair slid open over its neighbour
    for (const [z0, z1] of [[-11.5, -9.0], [9.0, 11.5]]) glass2.quad([HB.x0 + 0.32, FY, z0], [HB.x0 + 0.32, FY, z1], [HB.x0 + 0.32, FY + 7.6, z1], [HB.x0 + 0.32, FY + 7.6, z0], [0, 0, 1, 1]);
    glass2.quad([HB.x0 + 0.58, FY, -11.5], [HB.x0 + 0.58, FY, -9.0], [HB.x0 + 0.58, FY + 7.6, -9.0], [HB.x0 + 0.58, FY + 7.6, -11.5], [0, 0, 1, 1]);
    for (const [x0, x1] of [[160.5, 163.2], [180.8, 183.5]]) glass2.quad([x0, FY, HB.z0 + 0.32], [x1, FY, HB.z0 + 0.32], [x1, FY + 7.6, HB.z0 + 0.32], [x0, FY + 7.6, HB.z0 + 0.32], [0, 0, 1, 1]);
    glass2.quad([160.5, FY, HB.z0 + 0.58], [163.2, FY, HB.z0 + 0.58], [163.2, FY + 7.6, HB.z0 + 0.58], [160.5, FY + 7.6, HB.z0 + 0.58], [0, 0, 1, 1]);
    bake.geo(contMat, glass2.geometry(THREE), false);
    atlas.place(atlas.add(1024, 96, signDraw('AIRLOCK 9B — NOTHING LEAVES (EXCEPT STEAM)', { bg: '#20242c', fg: '#7fd0ff', font: SANS, size: 52, lines: 1 })), [172, FY + 8.1, HB.z0 + 0.7], 0, 13, 1.0, 0, true);

    // cable-run gantries crossing OVER the road: a yellow tray on ceiling rods, two sagging cable runs, a warning sign
    {
      const cp = 2.48, label = 'CABLE MANAGEMENT IS A LIE';
      const i = track.indexAtCp(cp), S = Math.max(track.hwL[i], track.hwR[i]) + 3.4, yaw = Math.atan2(-track.tx[i], -track.tz[i]);
      gb.add('tray', new THREE.BoxGeometry(2 * S, 0.12, 0.55), { p: rp(i, 0, 7.5), r: [0, yaw, 0] });
      for (const s of [-1, 1]) {
        gb.add('dark', new THREE.BoxGeometry(0.07, HB.ceil - 7.56, 0.07), { p: rp(i, s * (S - 0.7), (7.56 + HB.ceil) / 2) });
        gb.add('dark', new THREE.BoxGeometry(0.05, 0.8, 0.05), { p: rp(i, s * 2.2, 7.05) });
      }
      const sh = (p, o) => [p[0] + track.tx[i] * o, p[1], p[2] + track.tz[i] * o];
      const seg = (P, Q) => cables.quad(P, Q, [Q[0], Q[1] - 0.075, Q[2]], [P[0], P[1] - 0.075, P[2]], [0, 0, 1, 1]);
      for (const off of [-0.16, 0.16]) {
        const A = rp(i, -S + 0.3, 7.38), B = rp(i, -S / 3, 6.8), C = rp(i, S / 3, 6.8), D = rp(i, S - 0.3, 7.38);
        seg(sh(A, off), sh(B, off)); seg(sh(B, off), sh(C, off)); seg(sh(C, off), sh(D, off));
      }
      const r = atlas.add(1024, 150, signDraw(label, { bg: '#20242c', fg: '#ffd34d', font: SANS, size: 84, lines: 1, border: '#ffd34d' }));
      atlas.place(r, rp(i, 0, 6.15), yaw, 7.2, 1.05, 0, true);
    }
    // A real choice on the straight. Drivers have the bend and two lengths of ceiling
    // rail to line up. Keep the middle clear for packs and for recovery after a hit.
    const split = track.indexAtCp(3.05), end = track.indexAtCp(3.65);
    const trays = new ModelBuilder();
    for (const [side, label, color, paint, ink] of [
      [1, 'OVERCLOCK', 0xff873b, '#fc843e', '#221525'],
      [-1, 'ITEM CACHE', 0x4ee8f2, '#67eaf1', '#10243a'],
    ]) {
      const lane = side * 4.5;
      const panel = atlas.add(640, 170, (g, w, h) => {
        g.fillStyle = paint; g.fillRect(0, 0, w, h);
        g.fillStyle = ink;
        if (side > 0) {
          for (const x of [17, 55]) {
            g.beginPath(); g.moveTo(x, h * 0.25); g.lineTo(x + 22, h * 0.25);
            g.lineTo(x + 56, h / 2); g.lineTo(x + 22, h * 0.75); g.lineTo(x, h * 0.75); g.lineTo(x + 32, h / 2); g.fill();
          }
        } else {
          g.save(); g.translate(66, h / 2); g.rotate(Math.PI / 4); g.fillRect(-37, -37, 74, 74); g.restore();
          fitText(g, '?', 66, h * 0.52, 52, 69, FONT, paint, { lines: 1 });
        }
        fitText(g, label, w * 0.59, h * 0.52, w * 0.76, 111, FONT, ink, { lines: 1 });
      });
      for (const i of [split, track.indexAtCp(3.62)]) {
        const yaw = Math.atan2(-track.tx[i], -track.tz[i]);
        atlas.place(panel, rp(i, lane, 6.25), yaw, 8.6, 2.25, 0, true);
        for (const off of [-3.5, 3.5]) trays.add('dark', new THREE.BoxGeometry(0.1, 3.3, 0.1), { p: rp(i, lane + off, 9.0) });
      }
      const trim = new Quads();
      for (let i = split; i < end; i++) {
        for (const off of [-1.9, 1.9]) {
          const a = lane + off;
          trim.quad(rp(i, a - 0.09, 0.042), rp(i + 1, a - 0.09, 0.042), rp(i + 1, a + 0.09, 0.042), rp(i, a + 0.09, 0.042));
        }
        if ((i - split) % 9 === 0) {
          trays.add('dark', new THREE.BoxGeometry(7.6, 0.35, 0.8), { p: rp(i, lane, 8.6), r: [0, Math.atan2(track.tx[i], track.tz[i]), 0] });
          const led = rp(i, lane, 8.58);
          led[0] -= track.tx[i] * 0.42; led[2] -= track.tz[i] * 0.42;
          trim.panel(led, Math.atan2(-track.tx[i], -track.tz[i]), 7.45, 0.23, [0, 0, 1, 1]);
        }
      }
      bake.geo(glow(color, 1.2), trim.geometry(THREE), false);
    }
    bake.builder(trays, { dark: plastic(0x2c323c, 0.5) }, false);
    bake.geo(new THREE.MeshStandardMaterial({ color: 0x14171c, roughness: 0.6, side: THREE.DoubleSide }), cables.geometry(THREE), false);

    // the delivery bay: rack 4,096 has just arrived on a pallet, still wrapped, jack still under it
    for (const [w, d, px, pz] of [[10.8, 0.25, DV.x, -17.78], [10.8, 0.25, DV.x, -9.22], [0.25, 8.8, 122.72, DV.z], [0.25, 8.8, 133.28, DV.z]])
      gb.add('tray', new THREE.BoxGeometry(w, 0.03, d), { p: [px, FY + 0.02, pz] });
    for (let s = 0; s < 5; s++) gb.add('pallet', new THREE.BoxGeometry(2.6, 0.03, 0.22), { p: [DV.x, FY + 0.13, -15.6 + s * 0.55] });
    for (const sx of [-1.1, 0, 1.1]) gb.add('pallet', new THREE.BoxGeometry(0.16, 0.1, 2.0), { p: [DV.x + sx, FY + 0.06, -14.5] });
    gb.add('cab', new THREE.BoxGeometry(2.2, 2.9, 1.1), { p: [DV.x, FY + 0.145 + 1.45, -14.5] });
    dvRack.quad([DV.x - 1.1, FY + 0.145, -13.93], [DV.x + 1.1, FY + 0.145, -13.93], [DV.x + 1.1, FY + 3.045, -13.93], [DV.x - 1.1, FY + 3.045, -13.93], [[0.02, 0.2], [0.23, 0.2], [0.23, 1.0], [0.02, 1.0]]);
    bake.geo(rackMat, dvRack.geometry(THREE), false);
    const wx0 = DV.x - 1.17, wx1 = DV.x + 1.17, wz0 = -15.12, wz1 = -13.88, wy0 = FY + 0.1, wy1 = FY + 3.1;
    wrap.quad([wx0, wy0, wz1], [wx1, wy0, wz1], [wx1, wy1, wz1], [wx0, wy1, wz1], [0, 0, 1, 1]);
    wrap.quad([wx1, wy0, wz0], [wx0, wy0, wz0], [wx0, wy1, wz0], [wx1, wy1, wz0], [0, 0, 1, 1]);
    wrap.quad([wx1, wy0, wz1], [wx1, wy0, wz0], [wx1, wy1, wz0], [wx1, wy1, wz1], [0, 0, 1, 1]);
    wrap.quad([wx0, wy0, wz0], [wx0, wy0, wz1], [wx0, wy1, wz1], [wx0, wy1, wz0], [0, 0, 1, 1]);
    wrap.quad([wx0, wy1, wz1], [wx1, wy1, wz1], [wx1, wy1, wz0], [wx0, wy1, wz0], [0, 0, 1, 1]);
    bake.geo(new THREE.MeshStandardMaterial({ color: 0xdfe8ee, transparent: true, opacity: 0.16, roughness: 0.05, metalness: 0, depthWrite: false, side: THREE.DoubleSide }), wrap.geometry(THREE), false);
    for (const fx of [131.3, 131.9]) {
      gb.add('jack', new THREE.BoxGeometry(0.16, 0.05, 1.2), { p: [fx, FY + 0.06, -11.2] });
      gb.add('dark', cyl(0.09, 0.09, 0.06, 8), { p: [fx, FY + 0.09, -11.72], r: [0, 0, Math.PI / 2] });
    }
    gb.add('jack', new THREE.BoxGeometry(0.76, 0.34, 0.42), { p: [131.6, FY + 0.24, -10.42] });
    gb.add('jack', cyl(0.035, 0.035, 1.15, 6), { p: [131.6, FY + 0.78, -10.12], r: [0.7, 0, 0] });
    gb.add('dark', cyl(0.11, 0.11, 0.07, 8), { p: [131.6, FY + 0.11, -10.42], r: [0, 0, Math.PI / 2] });
    for (const [cx, cz] of [[124.2, -9.6], [132.6, -17.3], [133.1, -10.1]]) gb.add('cone', new THREE.ConeGeometry(0.17, 0.52, 10), { p: [cx, FY + 0.26, cz] });
    for (const px of [125.6, 130.4]) gb.add('dark', new THREE.BoxGeometry(0.06, 1.3, 0.06), { p: [px, FY + 0.65, -8.8] });
    atlas.place(atlas.add(1024, 160, signDraw('RACK 4,096 — SOME ASSEMBLY REQUIRED', { bg: '#ffd23c', fg: '#1a1d29', font: SANS, size: 62, lines: 1 })), [DV.x, FY + 1.75, -8.8], 0, 5.6, 0.88, 0, true);
    bake.builder(gb, { tray: plastic(0xffc928, 0.5), dark: plastic(0x2c323c, 0.5), jack: plastic(0xd8a022, 0.45, 0.4), cone: plastic(0xd8542e, 0.6), pallet: plastic(0x9a7a4a, 0.85), cab: plastic(0x14171c, 0.55, 0.3) }, false);
  }
  // signs outside: the company name on the roof over the entrance, the counter over the door
  {
    const fr = new ModelBuilder(), y0 = HB.H + 1;
    for (const z of [-14, 0, 14]) fr.add('f', box(0.6, 7.4, 0.6, 0.1, 1), { p: [HB.x0 + 1.5, y0 + 3.7, z] });
    fr.add('f', box(0.5, 7.6, 34, 0.1, 1), { p: [HB.x0 + 1.9, y0 + 3.9, 0] });
    bake.builder(fr, { f: plastic(0x6b7380, 0.5, 0.4) }, false);
    const s = atlas.add(1024, 220, (g, w, h) => { g.fillStyle = '#ffffff'; g.fillRect(0, 0, w, h); g.fillStyle = '#1f6bff'; g.beginPath(); g.arc(h * 0.5, h * 0.5, h * 0.36, 0, 7); g.fill(); g.fillStyle = '#7fd0ff'; g.beginPath(); g.moveTo(h * 0.5, h * 0.22); g.quadraticCurveTo(h * 0.75, h * 0.55, h * 0.5, h * 0.75); g.quadraticCurveTo(h * 0.25, h * 0.55, h * 0.5, h * 0.22); g.fill(); fitText(g, 'DEEPTHIRST', w * 0.58, h * 0.4, w * 0.74, 150, SANS, '#1a1d29', { lines: 1 }); fitText(g, 'TRAINING HALL 9', w * 0.58, h * 0.8, w * 0.7, 52, SANS, '#1f6bff', { lines: 1 }); });
    atlas.place(s, [HB.x0 + 1.55, y0 + 3.9, 0], -Math.PI / 2, 33, 7.1, 0, true);
  }
  const drip = { x: 161.6, y: 5.6, z: -118 };
  const southMural = atlas.add(1600, 272, muralDraw('THIS BUILDING USES MORE WATER THAN YOUR TOWN', '#1f6bff'));
  atlas.place(southMural, [130, 5.8, HB.z0 - 0.36], Math.PI, 54, 9.2);
  // jokes at eye level along the road, and big banners hung over it, all facing the drivers
  {
    const hang = new ModelBuilder(), eye = ['THIS RACK IS SMARTER THAN YOU', 'YOUR PROMPT IS IMPORTANT TO US', 'COOLING: ONE LAKE PER HOUR', 'EMPLOYEE OF THE MONTH: RACK 42', 'MODEL WEIGHTS: LIFT WITH YOUR LEGS', 'CAUTION: OVERFITTING', 'NO HUMANS BEYOND THIS POINT', 'BACKUPS OF YOUR SELFIES →', 'WE ARE NOT A BUBBLE', 'PLEASE DO NOT TAP THE GLASS', 'DO NOT UNPLUG', 'PROD — YES, THAT PROD'];
    const cols = [['#ffd23c', '#1a1d29'], ['#1f6bff', '#ffffff'], ['#e23b3b', '#ffffff'], ['#16a34a', '#ffffff'], ['#ffffff', '#1a1d29']];
    let k = 0;
    for (let cp = 1.3; cp < 3.95; cp += 0.24, k++) {
      const i = track.indexAtCp(cp), side = k % 2 ? -1 : 1, lat = side * (track.hwL[i] + 1.75);
      if (side < 0 && Math.abs(cp - 3.3) < 0.15) continue;                         // the YOUR DATA rack lives here
      const x = track.px[i] + track.lx[i] * lat, z = track.pz[i] + track.lz[i] * lat;
      if (Math.hypot(x - drip.x, z - drip.z) < 6) continue;
      if (Math.abs(x - DV.x) < 6.5 && Math.abs(z - DV.z) < 5.5) continue;         // the delivery bay floor stays clear
      const yaw = Math.atan2(-side * track.lx[i], -side * track.lz[i]), [bg, fg] = cols[k % cols.length];
      const r = atlas.add(900, 300, signDraw(eye[k % eye.length], { bg, fg, font: FONT, size: 110, border: fg }));
      atlas.place(r, [x, FY + 2.2, z], yaw, 6.6, 2.2, 0, true);
      for (const o of [-2.8, 2.8]) hang.add('c', cyl(0.06, 0.06, 1.2, 5), { p: [x + Math.cos(yaw) * o, FY + 0.55, z - Math.sin(yaw) * o] });
    }
    const over = ['GPU GO BRRR', 'NOW ENTERING THE CLOUD'];
    [1.75, 2.28].forEach((cp, j) => {
      const i = track.indexAtCp(cp), yaw = Math.atan2(-track.tx[i], -track.tz[i]), x = track.px[i], z = track.pz[i];
      const r = atlas.add(1024, 170, signDraw(over[j], { bg: '#1a1d29', fg: ['#ffd23c', '#7fd0ff', '#ffffff', '#ff9ab0'][j], font: FONT, size: 110, lines: 1, stripe: '#1f6bff' }));
      atlas.place(r, [x, 7.0, z], yaw, 15, 2.5, 0, true);
      for (const o of [-6.5, 6.5]) hang.add('c', cyl(0.03, 0.03, HB.ceil - 8.2, 4), { p: [x + Math.cos(yaw) * o, (HB.ceil + 8.2) / 2, z - Math.sin(yaw) * o] });
    });
    bake.builder(hang, { c: plastic(0x2c323c, 0.5) }, false);
  }
  const counter = ledSign(THREE, group, 1024, 200, counterAt?.c ?? [HB.x0 - 0.45, HB.door + 2.4, -0.3], counterAt?.yaw ?? -Math.PI / 2, 20, 3.9);   // on the arena's end wall, over the door into the hall

  /* the leaking pipe inside, with a mop and bucket under the drip */
  { const mb = D.mopBucket(); sc.place(mb, drip.x, drip.z, { y: FY, yaw: Math.PI / 2 }); bake.add(mb, false); }
  {
    const pud = new Quads(); pud.quad([drip.x - 1.2, FY + 0.02, drip.z + 1.0], [drip.x + 0.8, FY + 0.02, drip.z + 1.0], [drip.x + 0.8, FY + 0.02, drip.z - 1.4], [drip.x - 1.2, FY + 0.02, drip.z - 1.4]);
    bake.geo(new THREE.MeshStandardMaterial({ color: 0x9fb4c8, roughness: 0.05, metalness: 0.4, transparent: true, opacity: 0.55, depthWrite: false }), pud.geometry(THREE), false);
    const s = atlas.add(256, 80, signDraw('WET FLOOR', { bg: '#ffc928', fg: '#1a1d29', font: SANS, size: 50, lines: 1 }));
    atlas.place(s, [drip.x + 0.8, FY + 1.1, drip.z + 0.4], Math.PI / 2, 1.6, 0.5, 0, true);
  }

  // the gallons counter ticks, the LEDs blink, the leak drips
  let gal = 1284553120, blink = 0, frame = 0, shownGal = -1, tick = 0, statT = 1, wispK = 0;
  const hotSpots = [[170, -92.7], [150, -87.1], [175, -81.5]];
  return (dt, time) => {
    blink += dt; if (blink > 0.16) { blink = 0; frame = (frame + 1) % ledFrames.length; rackMat.emissiveMap = ledFrames[frame]; }
    const lake = view.dcLake || { pct: 100, lap: 1 };
    gal += dt * 3.1e6 * (1 + (lake.lap - 1) * 1.6);
    tick += dt;
    if (tick > 0.12 && Math.floor(gal / 1000) !== shownGal) {
      tick = 0; shownGal = Math.floor(gal / 1000);
      counter.draw((g, w, h) => {
        g.fillStyle = '#07090c'; g.fillRect(0, 0, w, h);
        g.fillStyle = '#ffb020'; g.font = `bold 40px ${MONO}`; g.textAlign = 'left'; g.textBaseline = 'middle'; g.fillText('WATER GULPED', 28, 40);
        g.textAlign = 'right'; g.fillStyle = lake.pct < 30 ? '#ff3b30' : '#38ff74'; g.fillText(`LAKE ${lake.pct}%`, w - 28, 40);
        g.textAlign = 'center'; g.fillStyle = '#ffd23c'; g.font = `bold 104px ${MONO}`; g.fillText(Math.floor(gal).toLocaleString('en-US') + ' GAL', w / 2, 128, w - 40);
      });
    }
    if (view.fx.count(5, dt)) view.fx.add.emit({ x: drip.x + (Math.random() - 0.5) * 0.1, y: drip.y, z: drip.z + (Math.random() - 0.5) * 0.1, vx: 0, vy: -1, vz: 0, color: [0.45, 0.65, 0.95], size: 0.14, life: 0.55, gravity: 16, alpha: 0.9 });
    // heat shimmer rising off the hot aisles
    if (view.fx.count(4, dt)) { const [hx, hz] = hotSpots[wispK++ % hotSpots.length]; view.fx.add.emit({ x: hx + (Math.random() - 0.5) * 2.4, y: FY + HR + 0.25, z: hz + (Math.random() - 0.5) * 0.8, vx: 0, vy: 0.85, vz: 0, color: [1, 0.45, 0.15], size: 0.55, life: 1.15, gravity: -0.4, alpha: 0.32 }); }
    // the status wall: mostly OK, one system always degraded, the human always missing
    statT += dt;
    if (statusWall && statT > 0.9) {
      statT = 0;
      const deg = Math.floor(time / 6) % 4, rows = [['GPU CLUSTER A', 'OK'], ['GPU CLUSTER B', 'OK'], ['COOLING', 'OK'], ['NETWORK', 'OK'], ['POWER', 'OK'], ['THE LAKE', lake.pct + '% FULL'], ['ON-CALL HUMAN', 'MISSING']];
      rows[deg][1] = 'DEGRADED';
      statusWall.draw((g, w, h) => {
        g.fillStyle = '#05080a'; g.fillRect(0, 0, w, h);
        g.textBaseline = 'middle';
        g.fillStyle = '#ffb020'; g.font = `bold 37px ${MONO}`; g.textAlign = 'left'; g.fillText('WHO RUNS THIS?', 30, 34);
        if (Math.floor(time * 1.4) % 2) { g.fillStyle = '#ff3b30'; g.beginPath(); g.arc(w - 42, 34, 11, 0, 7); g.fill(); }
        g.font = `bold 30px ${MONO}`;
        rows.forEach(([name, st], r) => {
          const y = 74 + r * 24;
          g.textAlign = 'left'; g.fillStyle = '#9fb4c8'; g.fillText(name, 30, y);
          g.textAlign = 'right'; g.fillStyle = st === 'OK' ? '#38ff74' : st === 'DEGRADED' ? '#ffb020' : name === 'THE LAKE' ? (lake.pct > 50 ? '#38ff74' : lake.pct > 25 ? '#ffb020' : '#ff3b30') : '#ff3b30';
          g.fillText(st, w - 30, y);
        });
        g.textAlign = 'left'; g.fillStyle = '#5a6a78'; g.font = `24px ${MONO}`; g.fillText('ON-CALL: THE MODEL (IT IS ASLEEP)', 30, h - 14);
      });
    }
  };
}

/** Shared bits for every road hall: one material per kind across the campus. */
function hallKit(THREE) {
  const tex = (draw) => canvasTexture(THREE, 256, 256, draw, { repeat: true });
  const clad = tex((g, w, h) => { g.fillStyle = '#e4e8ee'; g.fillRect(0, 0, w, h); g.fillStyle = '#c9cfd8'; g.fillRect(0, 0, 3, h); g.fillRect(w / 2, 0, 3, h); g.fillStyle = '#d6dbe2'; g.fillRect(0, h - 4, w, 4); });
  const floor = tex((g, w, h) => { g.fillStyle = '#161b27'; g.fillRect(0, 0, w, h); g.strokeStyle = '#252d3f'; g.lineWidth = 3; for (let k = 0; k <= 4; k++) { g.beginPath(); g.moveTo(k * w / 4, 0); g.lineTo(k * w / 4, h); g.stroke(); g.beginPath(); g.moveTo(0, k * h / 4); g.lineTo(w, k * h / 4); g.stroke(); } });
  return {
    clad: new THREE.MeshStandardMaterial({ map: clad, roughness: 0.75 }),
    floor: new THREE.MeshStandardMaterial({ map: floor, roughness: 0.4, metalness: 0.3, emissive: 0xffffff, emissiveMap: floor, emissiveIntensity: 0.22, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 }),
    ceil: plastic(0x0d1017, 0.95), roof: plastic(0x9aa1aa, 0.8), dark: plastic(0x14171c, 0.6, 0.3),
    tray: plastic(0xffc928, 0.5), rod: plastic(0x2c323c, 0.5),
    fans: [],   // spinning wall fans from every hall, drawn as one instanced mesh at the end
  };
}

/**
 * One road-following building: walls, roof, ceiling and floor in the road frame, stepped rack rows on both sides,
 * light strips over the aisles, cable gantries, portals with signs. cfg: an entry of HALL_DEFS.
 * Returns { update(dt, time), inside(x, z, m), api } and calls the hall's own extras.
 */
function roadHall(ctxs, cfg, kit) {
  const { THREE, track, sc, bake, atlas, samples, at: atObj, rackSys } = ctxs;
  const at = (i, lat, up = 0) => { const p = atObj(i, lat, up); return [p.x, p.y, p.z]; };
  const idx = samples(cfg.from, cfg.to, 3), n = idx.length;
  const cpOf = i => track.cp[i];
  const hw = i => Math.max(track.hwL[i], track.hwR[i]);
  let inSide = 1;
  if (cfg.inAt != null) { const iC = track.indexAtCp(cfg.inAt), iD = track.indexAtCp(cfg.inAt + 0.3); inSide = Math.sign((track.tx[iD] - track.tx[iC]) * track.lx[iC] + (track.tz[iD] - track.tz[iC]) * track.lz[iC]) || 1; }
  const wideK = cfg.wide === 'all' ? () => 1 : cfg.wide ? i => { const c = cpOf(i); return smoothstep(cfg.wide[0], cfg.wide[0] + 0.4, c) * (1 - smoothstep(cfg.wide[1] - 0.3, cfg.wide[1], c)); } : () => 0;
  const wideFor = sd => cfg.wideL != null ? (sd > 0 ? cfg.wideL : cfg.wideR) : (sd === inSide ? cfg.wideIn : cfg.wideOut);
  const Wd = (i, sd) => hw(i) + lerp(cfg.narrow ?? 4.6, wideFor(sd) ?? cfg.narrow ?? 4.6, wideK(i));
  const UPf = i => lerp(cfg.up, cfg.upWide ?? cfg.up, wideK(i));
  const DN = -10, DOOR = 8.4, sAt = k => k * 3;
  const [pBase, pInset, pSeam, pLed] = cfg.panel;
  const panelTex = canvasTexture(THREE, 256, 256, (g, w, h) => {
    g.fillStyle = pBase; g.fillRect(0, 0, w, h); g.fillStyle = pInset; g.fillRect(6, 6, w / 2 - 9, h - 12); g.fillRect(w / 2 + 3, 6, w / 2 - 9, h - 12);
    g.fillStyle = pSeam; g.fillRect(0, h - 10, w, 10); g.fillStyle = pLed; for (const x of [20, w / 2 + 17]) g.fillRect(x, h - 26, 22, 4);
  }, { repeat: true });
  const panelMat = new THREE.MeshStandardMaterial({ map: panelTex, roughness: 0.7, emissive: 0xffffff, emissiveMap: panelTex, emissiveIntensity: 0.35 });
  const glowMat = glow(cfg.glow, 1.6), bandMat = cfg.band === cfg.glow ? glowMat : glow(cfg.band, 1.8);

  const inner = new Quads(), outer = new Quads(), accentQ = new Quads(), ceil = new Quads(), roof = new Quads(), floor = new Quads(), racks = new Quads(), strips = new Quads(), bands = new Quads(), dark = new Quads(), rowGlowQ = new Quads();
  const ov = new ModelBuilder(), chills = [];
  const segLen = k => Math.hypot(track.px[idx[k + 1]] - track.px[idx[k]], track.pz[idx[k + 1]] - track.pz[idx[k]]);
  const DK = [[0, 0.04], [0.2, 0.04], [0.2, 0.16], [0, 0.16]];
  const gapAt = (k, r, sd) => ((sAt(k) + r * 10 + (sd > 0 ? 0 : 5)) % 30) < 3.1;   // a cross aisle now and then
  const rows = cfg.rackRows ?? 5;
  const skipRack = (a, b, sd, r) => cfg.tanks && sd !== inSide && r < 3 && cpOf(a) > cfg.tanks[0] - 0.05 && cpOf(b) < cfg.tanks[1] + 0.05;
  const lift = p => { p[1] = Math.max(p[1], track.terrainHeight(p[0], p[2]) + 0.06); return p; };
  /** Side-aware quad: given the four corners as seen for the left (+) side, flip the winding for the right side. */
  const sq = (Q, sd, A, B, C, D, uv) => sd > 0 ? Q.quad(A, B, C, D, uv) : Q.quad(B, A, D, C, uv && uv.length === 4 && Array.isArray(uv[0]) ? [uv[1], uv[0], uv[3], uv[2]] : uv);

  for (let k = 0; k + 1 < n; k++) {
    const a = idx[k], b = idx[k + 1], L = segLen(k), u0 = sAt(k) / 4, u1 = sAt(k + 1) / 4;
    const Ua = UPf(a), Ub = UPf(b);
    for (const sd of [-1, 1]) {
      const wa = sd * Wd(a, sd), wb = sd * Wd(b, sd), ea = sd * (Wd(a, sd) + 0.35), eb = sd * (Wd(b, sd) + 0.35);
      // interior face (facing the road) and exterior cladding (facing out), with a band of the hall's colour along the top
      sq(inner, sd, at(a, wa, DN), at(b, wb, DN), at(b, wb, Ub), at(a, wa, Ua), [[u0, DN / 4], [u1, DN / 4], [u1, Ub / 4], [u0, Ua / 4]]);
      sq(outer, -sd, at(b, eb, DN), at(a, ea, DN), at(a, ea, Ua + 1.2), at(b, eb, Ub + 1.2), [[u1, DN / 6], [u0, DN / 6], [u0, (Ua + 1.2) / 6], [u1, (Ub + 1.2) / 6]]);
      const xa = sd * (Wd(a, sd) + 0.37), xb = sd * (Wd(b, sd) + 0.37);
      sq(accentQ, -sd, at(b, xb, Ub - 1.6), at(a, xa, Ua - 1.6), at(a, xa, Ua - 0.4), at(b, xb, Ub - 0.4));
      // the floor beside the road, just proud of the land so nothing grows through it
      const F0 = lift(at(a, sd * (hw(a) + 0.25), 0.03)), F1 = lift(at(b, sd * (hw(b) + 0.25), 0.03)), F2 = lift(at(b, wb, 0.03)), F3 = lift(at(a, wa, 0.03));
      const fuv = p => [p[0] / 4, -p[2] / 4];
      if (sd > 0) floor.quad(F0, F1, F2, F3, [fuv(F0), fuv(F1), fuv(F2), fuv(F3)]); else floor.quad(F3, F2, F1, F0, [fuv(F3), fuv(F2), fuv(F1), fuv(F0)]);
      // parapet cap
      const P0 = at(a, ea, Ua + 1.2), P1 = at(b, eb, Ub + 1.2), P2 = at(b, wb, Ub + 1.2), P3 = at(a, wa, Ua + 1.2);
      if (sd > 0) roof.quad(P3, P2, P1, P0); else roof.quad(P0, P1, P2, P3);
      // a band of light along the wall at mid height, so the dark panels read as a wall and not a void
      { const ba = sd * (Wd(a, sd) - 0.04), bb = sd * (Wd(b, sd) - 0.04); sq(bands, sd, at(a, ba, 6.6), at(b, bb, 6.6), at(b, bb, 6.9), at(a, ba, 6.9)); }

      // rack rows parallel to the road, each one taller than the one in front of it
      for (let r = 0; r < rows; r++) {
        // One low bank in front of the stage keeps its crowd and screen in view.
        const stageSide = cfg.id === 'arena' && sd < 0;
        if (stageSide && r > 0) break;
        const l0a = hw(a) + 2.3 + r * 3.1, l0b = hw(b) + 2.3 + r * 3.1, l1a = l0a + 1.1, l1b = l0b + 1.1;
        if (l1a > Wd(a, sd) - 0.9 || l1b > Wd(b, sd) - 0.9) continue;
        if (skipRack(a, b, sd, r) || gapAt(k, r, sd)) continue;
        const hgt = stageSide ? 1.9 : (2.9 + r * 0.95) * (0.92 + 0.08 * wideK(a)), y0 = -0.05;
        const R0 = at(a, sd * l0a, y0), R1 = at(b, sd * l0b, y0), R2 = at(b, sd * l0b, y0 + hgt), R3 = at(a, sd * l0a, y0 + hgt);
        const fu0 = sAt(k) / RACK_TILE, fu1 = fu0 + L / RACK_TILE;
        if (sd > 0) racks.quad(R0, R1, R2, R3, [[fu0, 0.2], [fu1, 0.2], [fu1, 1], [fu0, 1]]); else racks.quad(R1, R0, R3, R2, [[fu1, 0.2], [fu0, 0.2], [fu0, 1], [fu1, 1]]);
        const T0 = at(a, sd * l1a, y0 + hgt), T1 = at(b, sd * l1b, y0 + hgt);
        if (sd > 0) dark.quad(R3, R2, T1, T0, DK); else dark.quad(R2, R3, T0, T1, DK);
        if (cfg.rowGlow) sq(rowGlowQ, sd, at(a, sd * (l0a - 0.02), y0 + hgt - 0.22), at(b, sd * (l0b - 0.02), y0 + hgt - 0.22), at(b, sd * (l0b - 0.02), y0 + hgt - 0.08), at(a, sd * (l0a - 0.02), y0 + hgt - 0.08));
        // the aisle behind each row gets a light strip on the ceiling
        const la = sd * (l1a + 1.0), lb = sd * (l1b + 1.0), S0 = at(a, la - 0.18 * sd, Ua - 0.25), S1 = at(b, lb - 0.18 * sd, Ub - 0.25), S2 = at(b, lb + 0.18 * sd, Ub - 0.25), S3 = at(a, la + 0.18 * sd, Ua - 0.25);
        if (sd > 0) strips.quad(S1, S0, S3, S2); else strips.quad(S0, S1, S2, S3);
        // end caps where a cross aisle starts or stops
        if (k + 1 < n - 1 && gapAt(k + 1, r, sd)) { const B1 = at(b, sd * l1b, y0); dark.quad(R1, B1, T1, R2, DK); dark.quad(B1, R1, R2, T1, DK); }
        if (k > 0 && gapAt(k - 1, r, sd)) { const A1 = at(a, sd * l1a, y0); dark.quad(R0, A1, T0, R3, DK); dark.quad(A1, R0, R3, T0, DK); }
      }
    }
    ceil.quad(at(a, Wd(a, 1), Ua - 0.05), at(b, Wd(b, 1), Ub - 0.05), at(b, -Wd(b, -1), Ub - 0.05), at(a, -Wd(a, -1), Ua - 0.05));
    roof.quad(at(a, -Wd(a, -1) - 0.35, Ua + 0.9), at(b, -Wd(b, -1) - 0.35, Ub + 0.9), at(b, Wd(b, 1) + 0.35, Ub + 0.9), at(a, Wd(a, 1) + 0.35, Ua + 0.9));
    { const S0 = at(a, -0.3, Ua - 0.2), S1 = at(b, -0.3, Ub - 0.2), S2 = at(b, 0.3, Ub - 0.2), S3 = at(a, 0.3, Ua - 0.2); strips.quad(S1, S0, S3, S2); }   // over the racing line
    if (k % 4 === 2) for (const sd of [-1, 1]) { const p = at(a, sd * Wd(a, sd) * 0.5, Ua + 0.9); chills.push({ x: p[0], y: p[1], z: p[2], yaw: Math.atan2(track.tx[a], track.tz[a]) }); }
  }

  // portals: the gable at each end (outside and inside faces) with a doorway for the road
  (cfg.gables || [true, true]).forEach((on, j) => {
    if (!on) return;
    const e = j === 0 ? 0 : n - 1, dir = j === 0 ? 1 : -1, i = idx[e], wl = Wd(i, 1), wr = Wd(i, -1), o = hw(i) + 0.4, U = UPf(i);
    for (const [off, face] of [[0, dir], [0.35 * dir, -dir]]) {
      const sh = p => [p[0] + track.tx[i] * off, p[1] + track.ty[i] * off, p[2] + track.tz[i] * off];
      const Qt = off === 0 ? outer : inner, wu = p => [(p[0] + p[2]) / 4, p[1] / 4];   // the outside in cladding, the inside in the hall's own panels
      const q = (a, b, c, d) => { const [A, B, C, D] = face > 0 ? [sh(b), sh(a), sh(d), sh(c)] : [sh(a), sh(b), sh(c), sh(d)]; Qt.quad(A, B, C, D, [wu(A), wu(B), wu(C), wu(D)]); };
      q(at(i, -wr, DN), at(i, -o, DN), at(i, -o, U + 1.2), at(i, -wr, U + 1.2));
      q(at(i, o, DN), at(i, wl, DN), at(i, wl, U + 1.2), at(i, o, U + 1.2));
      q(at(i, -o, DOOR), at(i, o, DOOR), at(i, o, U + 1.2), at(i, -o, U + 1.2));
    }
    // a sign over the doorway, facing the drivers: the name outside the entrance, the way on inside the exit
    const sign = j === 0 ? cfg.signIn : cfg.signOut;
    if (!sign) return;
    const yawBack = Math.atan2(-track.tx[i], -track.tz[i]), so = j === 0 ? -0.1 : -0.45, sp = at(i, 0, DOOR + 1.7), w = 2 * o - 2;
    const P = dy => [sp[0] + track.tx[i] * so, sp[1] + dy, sp[2] + track.tz[i] * so];
    atlas.place(atlas.add(1024, 160, signDraw(sign[0], { bg: '#1a1d29', fg: sign[1], font: SANS, size: 92, lines: 1, stripe: '#' + new THREE.Color(cfg.band).getHexString() })), P(0.5), yawBack, w, w / 6.4);
    if (j > 0 && cfg.signOutSub) atlas.place(atlas.add(1024, 128, signDraw(cfg.signOutSub, { bg: '#20242c', fg: '#7dff9a', font: SANS, size: 64, lines: 1 })), P(-1.15), yawBack, w * 0.85, w * 0.85 / 8);
  });

  if (cfg.portal) {
    const i = idx[0], [top, bottom, color] = cfg.portal;
    const yaw = Math.atan2(-track.tx[i], -track.tz[i]);
    // The wings and parapet are in one rigid frame. Facing the previous straight
    // gives the lake and pond approaches a long read through the centre of the glass.
    const front = (lat, y, depth) => {
      const p = at(i, lat);
      return [p[0] - track.tx[i] * depth, p[1] + y, p[2] - track.tz[i] * depth];
    };
    ov.add('sunk', box(38, 9, 1.1, 0.35, 1), { p: front(0, 15.9, 0.3), r: [0, yaw, 0] });
    const face = atlas.add(1024, 256, (g, w, h) => {
      g.fillStyle = '#111e2b'; g.fillRect(0, 0, w, h);
      g.fillStyle = color; g.fillRect(0, h * 0.9, w, h * 0.1);
      fitText(g, top, w / 2, h * 0.23, w * 0.96, 70, FONT, '#ffffff', { lines: 1 });
      fitText(g, bottom, w / 2, h * 0.64, w * 0.96, 126, FONT, color, { lines: 1 });
    });
    atlas.place(face, front(0, 15.9, 0.97), yaw, 35, 8.75);
    for (const side of [-1, 1]) {
      ov.add('sunk', box(9.4, 14, 3.6, 0.7, 1), { p: front(side * 14.2, 5.4, 0.5), r: [0, yaw, 0] });
      const c = front(side * 14.2, 6.25, 2.35);
      ov.add('steel', new THREE.TorusGeometry(3.85, 0.38, 6, 32), { p: c, r: [0, yaw, 0] });
      kit.fans.push({ x: c[0], y: c[1], z: c[2], yaw, r: 3.5 });
      ov.add('tray', cyl(0.7, 0.7, 0.4, 12), { p: front(side * 14.2, 6.25, 2.61), r: [Math.PI / 2, 0, -yaw] });
      for (const lamp of [1.4, 2.05, 10.8]) ov.add('tray', new THREE.BoxGeometry(7.2, 0.16, 0.2), { p: front(side * 14.2, lamp, 2.33), r: [0, yaw, 0] });
    }
  }

  // cable gantries across the road, jokes hung from some of them
  if (cfg.gantries !== false) {
    let gj = 0;
    for (let k = 3; k < n - 3; k += 7) {
      const i = idx[k], U = UPf(i), yaw = Math.atan2(track.tx[i], track.tz[i]);
      ov.add('tray', new THREE.BoxGeometry(0.6, 0.14, Wd(i, 1) + Wd(i, -1)), { p: at(i, (Wd(i, 1) - Wd(i, -1)) / 2, U - 2.6), r: [0, yaw + Math.PI / 2, 0] });
      for (const sd of [-1, 1]) for (const l of [0.6, 0.3]) ov.add('rod', new THREE.BoxGeometry(0.06, 2.5, 0.06), { p: at(i, sd * Wd(i, sd) * l, U - 1.3) });
      if (cfg.jokes && (k - 3) % 14 === 0) {
        const r = atlas.add(1024, 150, signDraw(cfg.jokes[gj++ % cfg.jokes.length], { bg: '#0f131c', fg: '#' + new THREE.Color(cfg.glow).getHexString(), font: SANS, size: 70, lines: 1, border: '#' + new THREE.Color(cfg.band).getHexString() }));
        atlas.place(r, at(i, 0, U - 3.6), Math.atan2(-track.tx[i], -track.tz[i]), 12.5, 1.83, 0, true);
        for (const sd of [-1, 1]) ov.add('rod', new THREE.BoxGeometry(0.04, 1.0, 0.04), { p: at(i, sd * 5, U - 3.0) });
      }
    }
  }

  const api = { THREE, track, sc, bake, atlas, at, idx, n, hw, Wd, UPf, wideK, inSide, ov, cpOf, kit, cfg, ctxs };
  const extra = HALL_EXTRAS[cfg.id]?.(api);

  bake.geo(panelMat, inner.geometry(THREE), false);
  bake.geo(kit.clad, outer.geometry(THREE), false);
  bake.geo(plastic(cfg.accent, 0.5), accentQ.geometry(THREE), false);
  bake.geo(kit.floor, floor.geometry(THREE), false);
  bake.geo(kit.ceil, ceil.geometry(THREE), false);
  bake.geo(kit.roof, roof.geometry(THREE), false);
  if (!racks.empty) bake.geo(rackSys.mat, racks.geometry(THREE), false);
  if (!dark.empty) bake.geo(kit.dark, dark.geometry(THREE), false);
  if (!rowGlowQ.empty) bake.geo(glow(cfg.rowGlow, 2.6), rowGlowQ.geometry(THREE), false);
  bake.geo(glowMat, strips.geometry(THREE), false);
  bake.geo(bandMat, bands.geometry(THREE), false);
  bake.builder(ov, { tray: kit.tray, rod: kit.rod, tankrim: plastic(0x3a414c, 0.4, 0.6), tankbase: plastic(0x232832, 0.5, 0.4), sunk: plastic(0x0d0f14, 0.4, 0.3), pipeA: plastic(0x2f6fc0, 0.42, 0.25), pipeB: plastic(0x16a39a, 0.42, 0.25), flange: plastic(0x24569a, 0.45, 0.3), steel: plastic(0x8a929e, 0.4, 0.6), stage: plastic(0x1a1426, 0.6), lip: glow(0xff3dbb, 2.2) }, false);
  if (chills.length) sc.instances(partsOf(D.chiller()), chills, { cast: false });

  const ground = makeGroundHit();
  /** True when (x, z) is inside this hall's footprint (for keeping other dressing out). */
  const inside = (x, z, m = 2) => { const g = track.ground(x, z, -1, ground); if (!inCpRange(track.cp[g.i], cfg.from - 0.1, cfg.to + 0.1)) return false; return (g.onRoad ? 0 : g.outside) < Wd(g.i, g.side > 0 ? 1 : -1) - hw(g.i) + m; };
  return { update: extra?.update || (() => {}), inside, api };
}

/** Spinning wall fans: a steel ring on the wall, its blades collected across halls and spun in one instanced mesh. */
function wallFan(api, i, sd, up, r = 2.2) {
  const { at, Wd, kit, ov, track, THREE } = api;
  const c = at(i, sd * (Wd(i, sd) - 0.25), up), yaw = Math.atan2(-sd * track.lx[i], -sd * track.lz[i]);
  const ring = new THREE.CylinderGeometry(r + 0.25, r + 0.25, 0.2, 20); ring.rotateX(Math.PI / 2); ring.rotateY(yaw);
  ov.add('steel', ring, { p: c });
  kit.fans.push({ x: c[0] + Math.sin(yaw) * 0.14, y: c[1], z: c[2] + Math.cos(yaw) * 0.14, yaw, r });
}

/** Each hall's own set pieces. Each gets the hall's api and may return { update(dt, time) }. */
const HALL_EXTRAS = {
  /* The keynote arena: the start line runs down the red carpet of a product launch. Stands on the right, a rack
     canyon on the left, a stage screen, sweeping spotlights, and a curtain of plastic strips at the way in. */
  arena(api) {
    const { THREE, track, sc, bake, atlas, at, idx, n, hw, Wd, UPf, ov, ctxs } = api;
    // the stage screen, high on the left wall, cycling launch slides
    const iS = track.indexAtCp(27.55), sP = at(iS, Wd(iS, 1) - 0.3, 9.4);
    const screen = ledSign(THREE, ctxs.ctx.group, 1024, 320, sP, Math.atan2(-track.lx[iS], -track.lz[iS]), 30, 9.4);
    { const i0 = track.indexAtCp(27.2), i1 = track.indexAtCp(27.9); for (const i of [i0, i1]) ov.add('stage', new THREE.BoxGeometry(1.2, 11, 1.2), { p: at(i, Wd(i, 1) - 0.7, 9.2) }); }
    // murals: the old campus jokes, now on the arena walls
    { const i = track.indexAtCp(0.35), r = atlas.add(1600, 260, muralDraw('TRAINING ON YOUR DATA (THANKS)', '#ff3dbb')); atlas.place(r, at(i, Wd(i, 1) - 0.2, 11.6), Math.atan2(-track.lx[i], -track.lz[i]), 46, 7.4); }
    { const i = track.indexAtCp(27.6), r = atlas.add(1600, 300, muralDraw('4 JOBS CREATED', '#3dc8ff')); atlas.place(r, at(i, -(Wd(i, -1) - 0.2), 12.4), Math.atan2(track.lx[i], track.lz[i]), 34, 6.2); }
    // the wall at the far end carries the hall it leads to: the gallons counter and the name over the door
    const iE = idx[n - 1], ty = Math.atan2(-track.tx[iE], -track.tz[iE]), e = (lat, up, o) => { const p = at(iE, lat, up); return [p[0] - track.tx[iE] * o, p[1], p[2] - track.tz[iE] * o]; };
    ctxs.counterAt = { c: e(0, DOORH + 2.05, 0.5), yaw: ty };
    atlas.place(atlas.add(1280, 240, (g, w, h) => { g.fillStyle = '#ffffff'; g.fillRect(0, 0, w, h); g.fillStyle = '#1f6bff'; g.beginPath(); g.arc(h * 0.5, h * 0.5, h * 0.36, 0, 7); g.fill(); g.fillStyle = '#7fd0ff'; g.beginPath(); g.moveTo(h * 0.5, h * 0.22); g.quadraticCurveTo(h * 0.75, h * 0.55, h * 0.5, h * 0.75); g.quadraticCurveTo(h * 0.25, h * 0.55, h * 0.5, h * 0.22); g.fill(); fitText(g, 'DEEPTHIRST', w * 0.58, h * 0.4, w * 0.74, 150, SANS, '#1a1d29', { lines: 1 }); fitText(g, 'TRAINING HALL 9 →', w * 0.58, h * 0.8, w * 0.7, 52, SANS, '#1f6bff', { lines: 1 }); }), e(0, DOORH + 5.35, 0.5), ty, 14, 2.6);
    // a short vestibule between this end wall and Hall 9's door: roof and sides, so no sky shows between them
    {
      const x0 = at(iE, 0, 0)[0], q = new Quads(), y = DOORH + 0.2;
      q.quad([x0, y, 11.5], [HB.x0 + 0.1, y, 11.5], [HB.x0 + 0.1, y, -11.5], [x0, y, -11.5]);
      q.quad([x0, y + 0.3, -11.5], [HB.x0 + 0.1, y + 0.3, -11.5], [HB.x0 + 0.1, y + 0.3, 11.5], [x0, y + 0.3, 11.5]);
      for (const z of [-11.5, 11.5]) { q.quad([x0, -1, z], [HB.x0 + 0.1, -1, z], [HB.x0 + 0.1, y, z], [x0, y, z]); q.quad([HB.x0 + 0.1, -1, z], [x0, -1, z], [x0, y, z], [HB.x0 + 0.1, y, z]); }
      bake.geo(api.kit.dark, q.geometry(THREE), false);
    }
    // the plastic strip curtain at the way in from Hall 2: you burst through it into the light show
    {
      const i = idx[0], q = new Quads(), o = hw(i) + 0.4, yaw = Math.atan2(track.tx[i], track.tz[i]), off = 0.6;
      for (let l = -o + 0.2; l < o - 0.1; l += 0.62) { const A = at(i, l, 0.5), B = at(i, l + 0.48, 0.5), C = at(i, l + 0.48, DOORH), D = at(i, l, DOORH); const s = p => [p[0] + track.tx[i] * off, p[1], p[2] + track.tz[i] * off]; q.quad(s(A), s(B), s(C), s(D)); }
      bake.geo(new THREE.MeshStandardMaterial({ color: 0xcfe9ff, transparent: true, opacity: 0.28, roughness: 0.1, depthWrite: false, side: THREE.DoubleSide }), q.geometry(THREE), false);
      void yaw;
    }
    // spotlight beams sweeping from the ceiling, magenta and cyan
    const beamGeo = new THREE.ConeGeometry(2.8, 14, 20, 1, true); beamGeo.translate(0, -7, 0);
    const beamMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.075, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false, vertexColors: false });
    const beams = new THREE.InstancedMesh(beamGeo, beamMat, 8); beams.frustumCulled = false; ctxs.ctx.group.add(beams);
    const cols = [0xff3dbb, 0x3dc8ff], bPos = [];
    for (let k = 0; k < 8; k++) { const i = idx[Math.round((k + 0.5) / 8 * (n - 1))], p = at(i, (k % 2 ? -1 : 1) * 4, UPf(i) - 0.5); bPos.push(p); beams.setColorAt(k, new THREE.Color(cols[k % 2])); }
    beams.instanceColor.needsUpdate = true;
    const M = new THREE.Matrix4(), Qb = new THREE.Quaternion(), Eb = new THREE.Euler(), Sb = new THREE.Vector3(1, 1, 1), Pb = new THREE.Vector3();
    const SLIDES = [['ONE MORE THING...', '#ffffff'], ['IT IS YOUR LAKE', '#7fd0ff'], ['NOW 40% THIRSTIER', '#ff7ad6'], ['AVAILABLE: NEVER', '#ffd23c'], ['APPLAUSE, PLEASE', '#7dff9a']];
    let shown = -1;
    return {
      update(dt, time) {
        bPos.forEach((p, k) => { Eb.set(Math.sin(time * 0.7 + k * 1.3) * 0.5, 0, Math.cos(time * 0.55 + k) * 0.45); Qb.setFromEuler(Eb); M.compose(Pb.set(p[0], p[1], p[2]), Qb, Sb); beams.setMatrixAt(k, M); });
        beams.instanceMatrix.needsUpdate = true;
        const si = Math.floor(time / 2.2) % SLIDES.length;
        if (si !== shown) {
          shown = si; const [t, c] = SLIDES[si];
          screen.draw((g, w, h) => {
            const gr = g.createLinearGradient(0, 0, w, h); gr.addColorStop(0, '#1a0f2e'); gr.addColorStop(1, '#3a0f3a'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
            g.fillStyle = '#ff3dbb'; g.font = `bold 34px ${MONO}`; g.textAlign = 'left'; g.textBaseline = 'middle'; g.fillText('DEEPTHIRST DEVDAY · LIVE', 30, 36);
            fitText(g, t, w / 2, h * 0.58, w - 80, 130, FONT, c, { lines: 1 });
          });
        }
      },
    };
  },

  /* The chiller plant: fat coolant pipes running up both walls with the climb, gauges, and fans. */
  chiller(api) {
    const { THREE, track, atlas, at, idx, n, hw, Wd, ov } = api;
    for (const sd of [-1, 1]) for (const [up, r, key, lo] of [[1.6, 1.0, 'pipeA', 1.6], [4.3, 0.8, 'pipeB', 1.4], [6.6, 0.55, 'pipeA', 1.0]]) {
      const pts = idx.map(i => { const p = at(i, sd * (Wd(i, sd) - lo), up); return new THREE.Vector3(p[0], p[1], p[2]); });
      const curve = new THREE.CatmullRomCurve3(pts), len = curve.getLength();
      ov.add(key, new THREE.TubeGeometry(curve, Math.max(8, Math.round(len / 3)), r, 12, false));
      for (let s = 4; s < len - 2; s += 9) { const t = s / len, p = curve.getPointAt(t), tg = curve.getTangentAt(t), q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), tg), e = new THREE.Euler().setFromQuaternion(q); ov.add('flange', new THREE.TorusGeometry(r + 0.06, 0.13, 5, 16), { p: [p.x, p.y, p.z], r: [e.x, e.y, e.z] }); }
    }
    // gauges at driver height, and fans up high
    const gauges = [['COOLANT', 'A LOT'], ['LAKE LEFT', 'SOME'], ['PRESSURE', 'YES']];
    gauges.forEach(([a, b], k) => {
      const i = idx[Math.round((k + 1) / (gauges.length + 1) * (n - 1))], sd = k % 2 ? -1 : 1;
      const r = atlas.add(320, 320, (g, w, h) => { g.fillStyle = '#e8ecef'; g.beginPath(); g.arc(w / 2, h / 2, w * 0.47, 0, 7); g.fill(); g.lineWidth = 14; g.strokeStyle = '#3a414c'; g.stroke(); g.strokeStyle = '#e23b3b'; g.lineWidth = 22; g.beginPath(); g.arc(w / 2, h / 2, w * 0.36, -0.4, 0.5); g.stroke(); g.strokeStyle = '#1a1d29'; g.lineWidth = 9; g.beginPath(); g.moveTo(w / 2, h / 2); g.lineTo(w * 0.86, h * 0.56); g.stroke(); fitText(g, a, w / 2, h * 0.3, w * 0.6, 40, SANS, '#1a1d29', { lines: 1 }); fitText(g, b, w / 2, h * 0.72, w * 0.55, 44, SANS, '#e23b3b', { lines: 1 }); });
      atlas.place(r, at(i, sd * (Wd(i, sd) - 0.3), 3.0), Math.atan2(-sd * track.lx[i], -sd * track.lz[i]), 2.6, 2.6);
    });
    for (let k = 2; k < n - 2; k += 6) for (const sd of [-1, 1]) wallFan(api, idx[k], sd, 8.4, 1.4);
    void hw;
    return null;
  },

  /* The GPU hall: hot aisles glowing red, heat shimmer off every rack, and the fans roaring. */
  gpu(api) {
    const { THREE, track, at, idx, n, hw, view = api.ctxs.view, atlas, Wd } = api;
    for (let k = 3; k < n - 2; k += 5) for (const sd of [-1, 1]) wallFan(api, idx[k], sd, 8.0, 1.6);
    { const i = idx[Math.floor(n * 0.45)], p = at(i, -(Wd(i, -1) - 0.2), 8.7), r = atlas.add(1600, 260, muralDraw('WE BOUGHT ALL OF THEM', '#e23b3b')); atlas.place(r, p, Math.atan2(track.lx[i], track.lz[i]), 26, 4.2); }
    const hot = idx.filter((_, k) => k % 3 === 1).map(i => ({ i, sd: (i & 1) ? 1 : -1 }));
    void THREE;
    return {
      update(dt) {
        for (let k = 0, m = view.fx.count(14, dt); k < m; k++) {
          const h = hot[Math.floor(Math.random() * hot.length)], p = at(h.i, h.sd * (hw(h.i) + 2.3 + Math.random() * 4), 3.2 + Math.random() * 1.4);
          view.fx.add.emit({ x: p[0], y: p[1], z: p[2], vx: 0, vy: 1.1, vz: 0, color: [1, 0.42, 0.16], size: 0.7, life: 1.3, gravity: -0.4, alpha: 0.26 });
        }
      },
    };
  },

  /* Hall 2: immersion tanks that fill as the reservoir drains, the inference screen, and the name on the roof. */
  inference(api) {
    const { THREE, track, sc, atlas, at, hw, Wd, UPf, inSide, ov, ctxs, bake } = api;
    const view = ctxs.view, cfg = api.cfg, out = -inSide;
    const tankIdx = ctxs.samples(cfg.tanks[0] + 0.03, cfg.tanks[1] - 0.03, 5.2), tanks = [], glassQ = new Quads();
    for (const i of tankIdx) {
      const c = at(i, out * (hw(i) + 6.3), 0), yaw = Math.atan2(track.tx[i], track.tz[i]);
      tanks.push({ x: c[0], y: c[1], z: c[2], yaw });
      ov.add('tankrim', box(4.6, 0.3, 4.2, 0.08, 1), { p: [c[0], c[1] + 3.5, c[2]], r: [0, yaw, 0] });
      ov.add('tankbase', box(4.8, 0.5, 4.4, 0.08, 1), { p: [c[0], c[1] + 0.2, c[2]], r: [0, yaw, 0] });
      for (const dz of [-1.1, 0, 1.1]) ov.add('sunk', new THREE.BoxGeometry(0.55, 2.2, 3.6), { p: [c[0] + Math.cos(yaw) * dz, c[1] + 1.6, c[2] - Math.sin(yaw) * dz], r: [0, yaw, 0] });
      const cs = Math.cos(yaw), sn = Math.sin(yaw), corner = (u, v, y) => [c[0] + u * cs + v * sn, c[1] + y, c[2] - u * sn + v * cs], hx = 2.2, hz = 2.0;
      glassQ.quad(corner(-hx, -hz, 0.4), corner(hx, -hz, 0.4), corner(hx, -hz, 3.4), corner(-hx, -hz, 3.4));
      glassQ.quad(corner(hx, hz, 0.4), corner(-hx, hz, 0.4), corner(-hx, hz, 3.4), corner(hx, hz, 3.4));
      glassQ.quad(corner(hx, -hz, 0.4), corner(hx, hz, 0.4), corner(hx, hz, 3.4), corner(hx, -hz, 3.4));
      glassQ.quad(corner(-hx, hz, 0.4), corner(-hx, -hz, 0.4), corner(-hx, -hz, 3.4), corner(-hx, hz, 3.4));
    }
    bake.geo(new THREE.MeshStandardMaterial({ color: 0xbfe8ff, transparent: true, opacity: 0.22, roughness: 0.05, metalness: 0.1, depthWrite: false, side: THREE.DoubleSide }), glassQ.geometry(THREE), false);
    const coolant = new THREE.InstancedMesh(new THREE.BoxGeometry(4.3, 1, 3.9), new THREE.MeshStandardMaterial({ color: 0x2fa8ff, emissive: 0x1a7fe0, emissiveIntensity: 0.9, transparent: true, opacity: 0.72, roughness: 0.1, depthWrite: false }), tanks.length);
    coolant.frustumCulled = false; coolant.renderOrder = 2; ctxs.ctx.group.add(coolant);
    {
      const i = tankIdx[Math.floor(tankIdx.length / 2)], c = at(i, out * (hw(i) + 6.3), 6.4);
      const r = atlas.add(1024, 220, (g, w, h) => { g.fillStyle = '#0d1a2a'; g.fillRect(0, 0, w, h); g.strokeStyle = '#3dc8ff'; g.lineWidth = 8; g.strokeRect(4, 4, w - 8, h - 8); fitText(g, 'IMMERSION COOLING', w / 2, h * 0.34, w - 80, 96, SANS, '#7fd0ff', { lines: 1 }); fitText(g, 'NOW WITH 100% MORE LAKE', w / 2, h * 0.72, w - 80, 66, SANS, '#ffd23c', { lines: 1 }); });
      atlas.place(r, c, Math.atan2(-out * track.lx[i], -out * track.lz[i]), 15, 3.2, 0, true);
      for (const o of [-6, 6]) ov.add('rod', new THREE.BoxGeometry(0.05, UPf(i) - 8, 0.05), { p: [c[0] + track.tx[i] * o, c[1] + 1.6 + (UPf(i) - 8) / 2, c[2] + track.tz[i] * o] });
    }
    const iS = track.indexAtCp(24.05), sP = at(iS, out * (Wd(iS, out) - 0.25), 8.4);
    const screen = ledSign(THREE, ctxs.ctx.group, 1024, 384, sP, Math.atan2(-out * track.lx[iS], -out * track.lz[iS]), 19, 7.1);
    { const i = track.indexAtCp(25.0), p = at(i, inSide * (Wd(i, inSide) - 0.2), 9.4), r = atlas.add(1600, 300, muralDraw('THINKING REALLY HARD', '#3dc8ff')); atlas.place(r, p, Math.atan2(-inSide * track.lx[i], -inSide * track.lz[i]), 24, 4.5); }
    {
      const i = track.indexAtCp(23.9), p = at(i, 0, UPf(i) + 5.4), yaw = Math.atan2(-118 - p[0], -300 - p[2]);
      const r = atlas.add(1280, 240, (g, w, h) => { g.fillStyle = '#ffffff'; g.fillRect(0, 0, w, h); g.fillStyle = '#1f6bff'; g.beginPath(); g.arc(h * 0.5, h * 0.5, h * 0.34, 0, 7); g.fill(); g.fillStyle = '#7fd0ff'; g.beginPath(); g.arc(h * 0.5, h * 0.5, h * 0.15, 0, 7); g.fill(); fitText(g, 'DEEPTHIRST', w * 0.58, h * 0.4, w * 0.72, 150, SANS, '#1a1d29', { lines: 1 }); fitText(g, 'HALL 2 · INFERENCE', w * 0.58, h * 0.8, w * 0.7, 56, SANS, '#1f6bff', { lines: 1 }); });
      atlas.place(r, p, yaw, 32, 6, 0, true);
      for (const o of [-11, 0, 11]) ov.add('steel', box(0.6, 6.4, 0.6, 0.1, 1), { p: [p[0] + Math.cos(yaw) * o - Math.sin(yaw) * 0.4, p[1] - 3.0, p[2] - Math.sin(yaw) * o - Math.cos(yaw) * 0.4] });
    }
    void sc;
    const M4 = new THREE.Matrix4(), Q4 = new THREE.Quaternion(), S4 = new THREE.Vector3(), P4 = new THREE.Vector3(), Yx = new THREE.Vector3(0, 1, 0);
    const GUESS = [['IS THIS A ROAD?', 'YES', 97], ['IS THAT A KART?', 'A TOASTER', 64], ['IS THE LAKE OK?', 'YES', 12], ['WHO IS WINNING?', 'US', 100], ['IS THIS ETHICAL?', 'LOADING...', 0], ['WHAT IS GRASS?', 'NO DATA', 3]];
    let shown = -1, lev = 0.22;
    return {
      update(dt, time) {
        const lake = view.dcLake || { level: LAKE.full };
        const want = 0.22 + 0.78 * clamp((LAKE.full - lake.level) / (LAKE.full - LAKE.low), 0, 1);
        lev += (want - lev) * Math.min(1, dt * 1.5);
        const hgt = 0.2 + 2.95 * lev;
        tanks.forEach((t, k) => { const wob = 1 + 0.015 * Math.sin(time * 3 + k); Q4.setFromAxisAngle(Yx, t.yaw); M4.compose(P4.set(t.x, t.y + 0.45 + hgt * wob / 2, t.z), Q4, S4.set(1, hgt * wob, 1)); coolant.setMatrixAt(k, M4); });
        coolant.instanceMatrix.needsUpdate = true;
        for (let k = 0, m = view.fx.count(10 + 30 * lev, dt); k < m; k++) { const t = tanks[Math.floor(Math.random() * tanks.length)]; view.fx.add.emit({ x: t.x + (Math.random() - 0.5) * 3.4, y: t.y + 0.7, z: t.z + (Math.random() - 0.5) * 3.2, vx: 0, vy: 1.6 + Math.random(), vz: 0, color: [0.75, 0.95, 1], size: 0.22, life: Math.max(0.3, hgt / 2.2), gravity: -0.5, alpha: 0.8 }); }
        const gi = Math.floor(time / 2.4) % GUESS.length;
        if (gi !== shown) {
          shown = gi; const [q, a, pc] = GUESS[gi];
          screen.draw((g, w, h) => {
            g.fillStyle = '#04070b'; g.fillRect(0, 0, w, h);
            g.fillStyle = '#3dc8ff'; g.font = `bold 40px ${MONO}`; g.textAlign = 'left'; g.textBaseline = 'middle'; g.fillText('INFERENCE IN PROGRESS', 34, 46);
            fitText(g, q, w / 2, 150, w - 80, 92, SANS, '#ffffff', { lines: 1 });
            fitText(g, a, w / 2, 262, w - 80, 104, SANS, a === 'YES' || a === 'US' ? '#38ff74' : '#ffb020', { lines: 1 });
            g.fillStyle = '#5a6a78'; g.font = `bold 32px ${MONO}`; g.textAlign = 'right'; g.fillText(`CONFIDENCE ${pc}%`, w - 34, h - 30);
          });
        }
      },
    };
  },
};
const DOORH = 8.4;

/** Builds every road hall; returns { update, inside } for the whole campus (Hall 9's box is checked separately). */
function campusHalls(ctxs) {
  const kit = hallKit(ctxs.THREE), halls = HALL_DEFS.map(cfg => roadHall(ctxs, cfg, kit));
  const { THREE } = ctxs;
  // every hall's wall fans, spun in one draw
  let fanMesh = null;
  if (kit.fans.length) {
    const blade = new THREE.BufferGeometry(), pos = [];
    for (let b = 0; b < 7; b++) {
      const angle = b * Math.PI * 2 / 7;
      const vertex = (radius, twist) => [radius * Math.cos(angle + twist), radius * Math.sin(angle + twist), 0];
      const root = vertex(0.16, 0), tip = vertex(0.98, 0.26), edge = vertex(0.96, 0.73), heel = vertex(0.22, 0.48);
      pos.push(...root, ...tip, ...edge, ...root, ...edge, ...heel);
    }
    blade.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); blade.computeVertexNormals();
    fanMesh = new THREE.InstancedMesh(blade, new THREE.MeshStandardMaterial({ color: 0x9aa3ad, metalness: 0.6, roughness: 0.4, side: THREE.DoubleSide }), kit.fans.length);
    fanMesh.frustumCulled = false; ctxs.ctx.group.add(fanMesh);
  }
  const M = new THREE.Matrix4(), Q = new THREE.Quaternion(), E = new THREE.Euler(), S = new THREE.Vector3(), P = new THREE.Vector3();
  return {
    halls,
    inside: (x, z, m = 2) => halls.some(h => h.inside(x, z, m)),
    update(dt, time) {
      for (const h of halls) h.update(dt, time);
      if (fanMesh) { kit.fans.forEach((f, k) => { E.set(0, f.yaw, time * 9 + k, 'YXZ'); Q.setFromEuler(E); M.compose(P.set(f.x, f.y, f.z), Q, S.set(f.r, f.r, 1)); fanMesh.setMatrixAt(k, M); }); fanMesh.instanceMatrix.needsUpdate = true; }
    },
  };
}

/** An LED panel with its own canvas, redrawn on demand. Returns { draw(fn) }. */
function ledSign(THREE, group, w, h, c, yaw, mw, mh) {
  const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
  const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
  const q = new Quads(); q.panel(c, yaw, mw, mh, [0, 0, 1, 1]);
  const mesh = new THREE.Mesh(q.geometry(THREE), new THREE.MeshStandardMaterial({ color: 0x000000, map: tex, emissiveMap: tex, emissive: 0xffffff, emissiveIntensity: 1.5, roughness: 0.5 }));
  mesh.matrixAutoUpdate = false; group.add(mesh);
  const back = new Quads(); back.panel([c[0] - Math.sin(yaw) * 0.12, c[1], c[2] - Math.cos(yaw) * 0.12], yaw + Math.PI, mw + 0.4, mh + 0.4, [0, 0, 1, 1]);
  const bm = new THREE.Mesh(back.geometry(THREE), plastic(0x2c323c, 0.6)); bm.matrixAutoUpdate = false; group.add(bm);
  const g = cv.getContext('2d');
  return { draw(fn) { fn(g, w, h); tex.needsUpdate = true; }, mesh };
}

/* ---------- edge compute: container data centres on the benches round the reservoir ----------
   Each one wears the shared rack front (so it blinks with the halls) and a tinted shell. A hillside sign over the
   north end spells out where the lake is going. */
function edgePods({ THREE, sc, rng, rackSys, atlas }) {
  const pod = new THREE.Group();
  const shell = plastic(0xffffff, 0.55, 0.1); shell.userData.tintable = true;
  const add = (geo, mat, x, y, z) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); pod.add(m); return m; };
  add(box(12.2, 2.9, 2.6, 0.12, 1), shell, 0, 1.7, 0);
  add(new THREE.BoxGeometry(12.5, 0.3, 2.8), plastic(0x2c323c, 0.7), 0, 0.15, 0);
  const front = new THREE.PlaneGeometry(11.0, 2.2), uv = front.attributes.uv;
  for (let k = 0; k < uv.count; k++) uv.setXY(k, uv.getX(k) * 11.0 / RACK_TILE, 0.2 + 0.8 * uv.getY(k));
  add(front, rackSys.mat, 0, 1.75, 1.315);
  // Combine the three identical fan caps and the three fan wells. All bench
  // pods can then draw their rooftop detail in two instanced meshes.
  const fans = new ModelBuilder();
  for (const x of [-3.8, 0, 3.8]) {
    fans.add('rim', cyl(0.85, 0.85, 0.3, 14), { p: [x, 3.3, 0] });
    fans.add('well', cyl(0.55, 0.55, 0.32, 10), { p: [x, 3.32, 0] });
  }
  pod.add(fans.build({ rim: plastic(0x3a414c, 0.5, 0.4), well: plastic(0x14171c, 0.6) }));
  const parts = partsOf(pod), spots = [];
  for (let k = 0; k < BENCH.n; k++) {
    const e = BENCH.e0 + BENCH.de * (k + 0.36), y0 = LAKE.rim + 1.5 + BENCH.rise * k;
    // walk the bench contour: up the east side, round the north end, down the west side
    const pts = [];
    for (let z = LAKE.zDam - 12; z > LAKE.zN; z -= 1) pts.push([LAKE.cx + e * LAKE.RX, z]);
    for (let a = 0; a <= 400; a++) { const t = (a / 400) * Math.PI; pts.push([LAKE.cx + Math.cos(t) * e * LAKE.RX, LAKE.zN - Math.sin(t) * e * LAKE.RN]); }
    for (let z = LAKE.zN; z < LAKE.zDam - 12; z += 1) pts.push([LAKE.cx - e * LAKE.RX, z]);
    let last = null;
    for (let j = 1; j < pts.length - 1; j++) {
      const [x, z] = pts[j];
      if (last && Math.hypot(x - last[0], z - last[1]) < 17.4) continue;
      const tx = pts[j + 1][0] - pts[j - 1][0], tz = pts[j + 1][1] - pts[j - 1][1], tl = Math.hypot(tx, tz);
      const yaw = Math.atan2(tz / tl, -tx / tl);   // front (+z local) faces the water
      const cs = Math.cos(yaw), sn = Math.sin(yaw), ok = [[-7.6, -1.7], [7.6, -1.7], [-7.6, 1.7], [7.6, 1.7], [0, 0]].every(([u, v]) => Math.abs(sc.y(x + u * cs + v * sn, z - u * sn + v * cs) - y0) < 0.7);
      if (!ok) continue;
      if (rng() < 0.12) { last = [x, z]; continue; }   // the odd empty plot
      spots.push({ x, y: y0 - 0.05, z, yaw }); last = [x, z];
      if (rng() < 0.55) spots.push({ x: x - sn * 0.5, y: y0 - 0.05 + 3.55 * 1.25, z: z - cs * 0.5, yaw: yaw + (rng() - 0.5) * 0.06 });   // stacked two high
    }
  }
  sc.instances(parts, spots, { scale: 1.25, tints: [0xffffff, 0xf2f4f7, 0x1f6bff, 0xff6a00, 0x16a34a, 0x9aa3ad, 0xffd23c, 0xffffff], cast: true });
  // THE CLOUD, hillside letters over the north end, facing down the lake
  {
    const tex = canvasTexture(THREE, 2048, 320, (g, w, h) => { g.clearRect(0, 0, w, h); fitText(g, 'THE CLOUD', w / 2, h * 0.55, w * 0.96, 300, FONT, '#ffffff', { lines: 1, stroke: '#c9ced6', lw: 10 }); });
    const e = BENCH.e0 + BENCH.de * BENCH.n + 0.22, x = LAKE.cx, z = LAKE.zN - e * LAKE.RN, y = sc.y(x, z);
    const m = new THREE.Mesh(new THREE.PlaneGeometry(84, 13.1), new THREE.MeshStandardMaterial({ map: tex, alphaTest: 0.45, roughness: 0.7, emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: 0.25 }));
    m.position.set(x, y + 6.0, z); m.rotation.x = -0.18; sc.group.add(m);
    const legs = new ModelBuilder(); for (let k = -9; k <= 9; k++) legs.add('l', cyl(0.18, 0.18, 9, 5), { p: [x + k * 4.4, y + 1.5, z - 1.6] });
    sc.group.add(legs.build({ l: plastic(0x8a929e, 0.6, 0.4) }));
    void atlas;
  }
}

/* ---------- the dam and the reservoir ---------- */
const DAM = { x0: -86, x1: 54, zUp: -343, zDn: -333, top: 12.2, bottom: -9 };
/** A paper strip feeds out of the same slot at all lengths. Crop the printed roll
    to the exposed length so its headline and line items keep their physical size. */
function shorelineMeter({ THREE, sc, bake, group, palette, track }) {
  const p = sc.beside(10.32, 1, 8), exit = track.indexAtCp(9.15);
  const yaw = Math.atan2(track.px[exit] - p.x, track.pz[exit] - p.z);
  const { housing, needle, rotor, pawl } = D.demandMeter();
  sc.place(housing, p.x, p.z, { y: p.y, yaw });
  bake.add(housing, true);
  const mount = new THREE.Group();
  mount.position.set(p.x, p.y, p.z); mount.rotation.y = yaw;
  group.add(mount);
  function axle(parts, x, y, z) {
    const pivot = new THREE.Group(), batch = makeBaker(THREE, pivot, false, palette);
    batch.add(parts, false); batch.flush();
    pivot.position.set(x, y, z); mount.add(pivot);
    return pivot;
  }
  const hand = axle(needle, 0, 10.32, 1.38), wheel = axle(rotor, 0, 7.22, 0.98);
  const lever = axle(pawl, -2.0, 7.79, 0.84);
  const paperX = -5.1, paperZ = 0.68, slotY = 8.41, paperWidth = 4.05;
  const paperBed = track.terrainHeight(p.x + paperX * Math.cos(yaw) + paperZ * Math.sin(yaw),
    p.z - paperX * Math.sin(yaw) + paperZ * Math.cos(yaw));
  const paperLength = p.y + slotY - paperBed;
  const receipt = canvasTexture(THREE, 256, 512, (g, w, h) => {
    g.fillStyle = '#fff3d1'; g.fillRect(0, 0, w, h);
    for (let y = 8; y < h; y += 16) {
      g.fillStyle = '#a79d83'; g.fillRect(5, y, 5, 7); g.fillRect(w - 10, y, 5, 7);
    }
    fitText(g, 'ONE MORE', w / 2, 69, w - 34, 53, SANS, '#111925', { lines: 1, stroke: '#111925', lw: 2.3 });
    fitText(g, 'PROMPT', w / 2, 116, w - 34, 58, SANS, '#111925', { lines: 1, stroke: '#111925', lw: 2.3 });
    g.fillStyle = '#253548'; g.fillRect(20, 145, w - 40, 5);
    for (let i = 0; i < 9; i++) {
      const y = 166 + 25 * i;
      g.fillRect(26, y, 48 + (i * 19) % 51, 5); g.fillRect(w - 72, y, 44, 5);
    }
    g.fillRect(21, 409, w - 42, 5);
    for (let x = 40; x < w - 40;) {
      const width = 2 + x % 6; g.fillRect(x, 434, width, 40); x += width + 3;
    }
  });
  const stock = new THREE.PlaneGeometry(paperWidth, 1, 18, 12);
  stock.translate(0, -0.5, 0);
  const pos = stock.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const drop = -pos.getY(i);
    pos.setZ(i, 0.14 * Math.sin(drop * 9) + 0.44 * smoothstep(0.8, 1, drop));
    if (drop === 1 && i % 2) pos.setY(i, -0.985);
  }
  stock.computeVertexNormals();
  const paper = new THREE.Mesh(stock, new THREE.MeshStandardMaterial({ map: receipt, roughness: 0.88 }));
  paper.position.set(paperX, slotY, paperZ); mount.add(paper);
  hand.rotation.z = 1.28; paper.scale.y = 0.55;
  receipt.repeat.y = paper.scale.y / paperLength; receipt.offset.y = 1 - receipt.repeat.y;
  const speeds = [0.6, 1.3, 2.6], angles = [1.28, -0.09, -1.29], lengths = [0.55, 4.15, paperLength];
  return (dt, lap) => {
    const i = clamp(lap - 1, 0, 2), ease = 1 - Math.exp(-3 * dt);
    wheel.rotation.z = (wheel.rotation.z - dt * speeds[i]) % (Math.PI * 2);
    // Twelve teeth lift the pawl gradually, then release it at the tooth edge.
    const tooth = -wheel.rotation.z * 6 / Math.PI % 1;
    lever.rotation.z = tooth * 0.27;
    hand.rotation.z += (angles[i] + tooth * 0.025 - hand.rotation.z) * ease;
    paper.scale.y += (lengths[i] - paper.scale.y) * ease;
    receipt.repeat.y = paper.scale.y / paperLength;
    receipt.offset.y = 1 - receipt.repeat.y;
  };
}

function reservoir({ THREE, track, ctx, sc, rng, bake, atlas, palette, view }) {
  const group = ctx.group, bottom = DAM.bottom;

  /* the dam: a straight wall across the south end of the lake, a walkway on top, a sheer stained face toward the water */
  const ring = [], foot = DAM.zDn + (DAM.top - bottom) * 0.72;
  for (let x = DAM.x0; x <= DAM.x1 + 0.01; x += (DAM.x1 - DAM.x0) / 24) ring.push([[x, DAM.top, DAM.zUp], [x, bottom, DAM.zUp], [x, bottom, foot], [x, DAM.top - 2, DAM.zDn + 1.5], [x, DAM.top, DAM.zDn]]);
  const face = new Quads(), body = new Quads(), vy = y => (y - bottom) / 30;
  for (let r = 0; r < ring.length - 1; r++) {
    const A = ring[r], B = ring[r + 1];
    face.quad(B[1], A[1], A[0], B[0], [[B[1][0] / 10, vy(bottom)], [A[1][0] / 10, vy(bottom)], [A[0][0] / 10, vy(DAM.top)], [B[0][0] / 10, vy(DAM.top)]]);
    for (const k of [1, 2, 3]) body.quad(A[k + 1], B[k + 1], B[k], A[k]);
    body.quad(A[0], B[0], B[4], A[4]);
  }
  for (const [R, s] of [[ring[0], -1], [ring[ring.length - 1], 1]]) { const c = R.map(p => p); if (s > 0) { body.quad(c[1], c[2], c[3], c[0]); body.quad(c[0], c[3], c[4], c[4]); } else { body.quad(c[2], c[1], c[0], c[3]); body.quad(c[3], c[0], c[4], c[4]); } }
  const tubTex = canvasTexture(THREE, 256, 1024, (g, w, h) => {
    const Y = y => (1 - (y - bottom) / 30) * h, r = makeRng(9);
    g.fillStyle = '#c9c6bd'; g.fillRect(0, 0, w, h);
    for (let y = 0; y < h; y += 64) { g.fillStyle = 'rgba(0,0,0,0.06)'; g.fillRect(0, y, w, 2); }
    const gr = g.createLinearGradient(0, Y(LAKE.full), 0, Y(-1)); gr.addColorStop(0, '#8d8a6c'); gr.addColorStop(0.35, '#77715a'); gr.addColorStop(1, '#4e4535');
    g.fillStyle = gr; g.fillRect(0, Y(LAKE.full), w, h - Y(LAKE.full));
    for (let k = 0; k < 40; k++) { const x = r() * w, y0 = Y(LAKE.full + 0.2), len = 30 + r() * 220; g.fillStyle = `rgba(60,55,40,${0.15 + r() * 0.2})`; g.fillRect(x, y0, 2 + r() * 4, len); }
    g.fillStyle = '#f2ede0'; g.fillRect(0, Y(LAKE.full + 1.0), w, Y(LAKE.full - 0.2) - Y(LAKE.full + 1.0));
    g.fillStyle = '#5f6b3e'; g.fillRect(0, Y(LAKE.full - 0.2), w, 10);
    const mid = lakeLevel(2, 3);
    g.fillStyle = '#d9d2bf'; g.fillRect(0, Y(mid + 0.5), w, Y(mid) - Y(mid + 0.5));
    g.fillStyle = '#c8bfa8'; g.fillRect(0, Y(LAKE.low + 0.5), w, Y(LAKE.low) - Y(LAKE.low + 0.5));
  }, { repeat: true });
  tubTex.wrapT = THREE.ClampToEdgeWrapping;
  bake.geo(new THREE.MeshStandardMaterial({ map: tubTex, roughness: 0.92, side: THREE.DoubleSide }), face.geometry(THREE), false);
  bake.geo(new THREE.MeshStandardMaterial({ color: 0xb8b6ae, roughness: 0.92, side: THREE.DoubleSide }), body.geometry(THREE), true);
  {
    const ch = new ModelBuilder();
    for (let x = -40; x <= 10; x += 10) ch.add('c', new THREE.TubeGeometry(new THREE.CatmullRomCurve3([new THREE.Vector3(x, DAM.top - 2, DAM.zDn + 1.6), new THREE.Vector3(x, 0.4, DAM.zDn + 1.6 + (DAM.top - 2) * 0.72)]), 4, 0.9, 6));
    for (let x = DAM.x0 + 2; x < DAM.x1; x += 4) for (const z of [DAM.zUp + 0.3, DAM.zDn - 0.3]) ch.add('rail', cyl(0.06, 0.06, 1.1, 5), { p: [x, DAM.top + 0.55, z] });
    for (const z of [DAM.zUp + 0.3, DAM.zDn - 0.3]) ch.add('rail', box(DAM.x1 - DAM.x0, 0.1, 0.1, 0.02, 1), { p: [(DAM.x0 + DAM.x1) / 2, DAM.top + 1.1, z] });
    bake.builder(ch, { c: plastic(0x8f8c84, 0.9), rail: plastic(0xffc928, 0.5) }, false);
  }
  // karts on the lake bed stop at the dam face
  for (let x = DAM.x0; x <= DAM.x1; x += 2.5) track.addCollider(x, DAM.zUp - 1.4, 1.6);

  /* the water: its own surface, shaped to the basin, at the level the race says */
  const shape = new THREE.Shape(), pts = [], K = 0.985;
  for (let z = DAM.zUp + 4; z >= LAKE.zN; z -= 6) pts.push([LAKE.cx - K * LAKE.RX, z]);
  for (let a = 0; a <= 32; a++) { const t = Math.PI - (a / 32) * Math.PI; pts.push([LAKE.cx + Math.cos(t) * K * LAKE.RX, LAKE.zN - Math.sin(t) * K * LAKE.RN]); }
  for (let z = LAKE.zN; z <= DAM.zUp + 4; z += 6) pts.push([LAKE.cx + K * LAKE.RX, z]);
  pts.forEach(([x, z], k) => k ? shape.lineTo(x, -z) : shape.moveTo(x, -z));
  const wg = new THREE.ShapeGeometry(shape, 4); wg.rotateX(-Math.PI / 2);
  const waterMat = new THREE.MeshStandardMaterial({ color: 0x2f86c8, roughness: 0.12, metalness: 0.15, transparent: true, opacity: 0.9, envMapIntensity: 1.3, depthWrite: true });
  const water = new THREE.Mesh(wg, waterMat); water.position.y = LAKE.full; water.receiveShadow = true; water.renderOrder = 1; group.add(water);
  const cFull = new THREE.Color(0x2f86c8), cLow = new THREE.Color(0x6b6a48);

  /* the exposed bed: a crack pattern draped over the terrain; per-vertex alpha follows the live water level (see update below) */
  let crackMat, crackFade = null;
  {
    const gr = track.grid, q = new Quads(true);
    const ix0 = Math.max(0, Math.floor((LAKE.cx - LAKE.RX - 8 - gr.x0) / gr.cell)), ix1 = Math.min(gr.nx - 1, Math.ceil((LAKE.cx + LAKE.RX + 8 - gr.x0) / gr.cell));
    const iz0 = Math.max(0, Math.floor((LAKE.zN - LAKE.RN - 8 - gr.z0) / gr.cell)), iz1 = Math.min(gr.nz - 1, Math.ceil((LAKE.zDam - gr.z0) / gr.cell));
    const Hh = (ix, iz) => gr.H[iz * gr.nx + ix];
    const alpha = h => 1 - smoothstep(LAKE.full + 0.2, LAKE.full + 1.0, h);
    for (let iz = iz0; iz < iz1; iz++) for (let ix = ix0; ix < ix1; ix++) {
      const x = gr.x0 + ix * gr.cell, z = gr.z0 + iz * gr.cell;
      if (lakeE(x + gr.cell / 2, z + gr.cell / 2) > 1.02 || z + gr.cell > DAM.zUp) continue;
      const hs = [Hh(ix, iz + 1), Hh(ix + 1, iz + 1), Hh(ix + 1, iz), Hh(ix, iz)];
      if (Math.min(...hs) > LAKE.full + 1.0) continue;
      const c = hs.map(h => [1, 1, 1, clamp(alpha(h), 0, 1)]);
      q.quad([x, hs[0] + 0.05, z + gr.cell], [x + gr.cell, hs[1] + 0.05, z + gr.cell], [x + gr.cell, hs[2] + 0.05, z], [x, hs[3] + 0.05, z], [[x / 7, -(z + gr.cell) / 7], [(x + gr.cell) / 7, -(z + gr.cell) / 7], [(x + gr.cell) / 7, -z / 7], [x / 7, -z / 7]], c);
    }
    const crack = canvasTexture(THREE, 256, 256, (g, w, h) => {
      const r = makeRng(3), pts = []; for (let k = 0; k < 30; k++) pts.push([r() * w, r() * h]);
      const img = g.createImageData(w, h), d = img.data;
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        let a = 1e9, b = 1e9;
        for (const [px, py] of pts) for (const ox of [-w, 0, w]) for (const oy of [-h, 0, h]) { const dd = (x - px - ox) ** 2 + (y - py - oy) ** 2; if (dd < a) { b = a; a = dd; } else if (dd < b) b = dd; }
        const edge = Math.sqrt(b) - Math.sqrt(a), k = (y * w + x) * 4;
        const cr = edge < 1.8 ? 1 : edge < 3.4 ? 0.35 : 0;
        d[k] = cr ? 40 : 236; d[k + 1] = cr ? 30 : 214; d[k + 2] = cr ? 20 : 170; d[k + 3] = cr ? Math.round(235 * cr) : Math.round(70 * Math.min(1, Math.sqrt(a) / 30));
      }
      g.putImageData(img, 0, 0);
    }, { repeat: true });
    crackMat = new THREE.MeshStandardMaterial({ map: crack, vertexColors: true, transparent: true, depthWrite: false, roughness: 1, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -2, color: 0x8a8070 });
    const geo = q.geometry(THREE);
    const m = new THREE.Mesh(geo, crackMat); m.matrixAutoUpdate = false; m.renderOrder = 0; group.add(m);
    // per-vertex bed height and baked shoreline fade: update() scales the alpha by how far the
    // water has dropped below each point, so a submerged bed shows no cracks (water over mud)
    const nv = geo.attributes.position.count, vh = new Float32Array(nv), vb = new Float32Array(nv);
    for (let k = 0; k < nv; k++) { vh[k] = geo.attributes.position.getY(k) - 0.05; vb[k] = geo.attributes.color.getW(k); }
    crackFade = { color: geo.attributes.color, h: vh, base: vb, at: Infinity };
  }

  /* the pipes: three fat blue straws from intake towers in the lake, high over the bed on stilts, over the dam on a gantry, down to the pumps, across the campus into the halls */
  const pipeMat = plastic(0x2f6fc0, 0.42, 0.25), routes = [], TOWER = { z: -414, top: 12.6, r: 2.6 };
  const tail = [
    [[14, 3.3, -252], [16, 3.3, -247], [20, 3.3, -245], [27.5, 3.3, -245]],
    [[8, 3.3, -182], [10, 3.3, -177], [14, 3.3, -175], [28.5, 3.3, -175]],
    [[2, 3.3, -125], [4, 3.3, -120], [8, 3.3, -118], [90, 3.3, -118], [96, 5.5, -118], [101, 7.5, -118], [188, 7.5, -118]],
  ];
  PIPE_X.forEach((x, k) => {
    const head = [[x, TOWER.top, TOWER.z + 1], [x, 13.2, -398], [x, 14.2, -378], [x, 18.5, -358], [x, 25.5, -347.5], [x, 27.6, -340], [x, 27.6, -329], [x, 25.6, -322.5], [x, 16, -316], [x, 6.5, -307], [x, 3.5, -298], [x, 3.3, -285]];
    routes.push(new THREE.CatmullRomCurve3([...head, ...tail[2 - k]].map(a => new THREE.Vector3(a[0], a[1], a[2])), false, 'centripetal'));
  });
  const pb = new ModelBuilder(), sup = new ModelBuilder();
  routes.forEach(curve => {
    const len = curve.getLength();
    pb.add('pipe', new THREE.TubeGeometry(curve, Math.round(len / 2.2), 2.0, 14, false));
    for (let s = 6; s < len - 2; s += 12) {
      const t = s / len, p = curve.getPointAt(t), tg = curve.getTangentAt(t);
      const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), tg), e = new THREE.Euler().setFromQuaternion(q);
      pb.add('flange', new THREE.TorusGeometry(2.08, 0.22, 5, 18), { p: [p.x, p.y, p.z], r: [e.x, e.y, e.z] });
      const gy = sc.y(p.x, p.z);
      if (p.y - 2 - gy < 7 && p.y - 2 - gy > -0.5 && !inBox(p.x, p.z) && p.z > LAKE.zDam + 2) sup.add('s', box(3.4, p.y - 1.6 - gy + 0.5, 2.2, 0.15, 1), { p: [p.x, gy + (p.y - 1.6 - gy + 0.5) / 2 - 0.4, p.z], r: [0, Math.atan2(tg.x, tg.z), 0] });
    }
  });
  // intake towers standing in the lake, and stilts carrying the pipes over the bed (karts drive under, round the legs)
  for (const x of PIPE_X) {
    const gy = track.terrainHeight(x, TOWER.z);
    pb.add('tower', cyl(TOWER.r, TOWER.r + 0.4, TOWER.top - gy + 1, 18), { p: [x, (TOWER.top + gy - 1) / 2, TOWER.z] });
    pb.add('flange', cyl(TOWER.r + 0.5, TOWER.r + 0.5, 0.6, 18), { p: [x, TOWER.top - 0.6, TOWER.z] });
    for (let k = 0; k < 4; k++) pb.add('flange', new THREE.TorusGeometry(TOWER.r + 0.15, 0.18, 5, 18), { p: [x, gy + 2 + k * 2.6, TOWER.z], r: [Math.PI / 2, 0, 0] });
    track.addCollider(x, TOWER.z, TOWER.r + 0.6);
  }
  for (const z of [-400, -386, -372, -358]) {
    const py = routes[1].getPointAt(0).y, yy = z < -390 ? 13.2 : z < -375 ? 13.6 : z < -365 ? 15 : 17.6;
    for (const x of [-2.6, 18.6]) { const gy = track.terrainHeight(x, z); sup.add('leg', box(1.2, yy - 2 - gy + 1, 1.2, 0.15, 1), { p: [x, (yy - 2 + gy - 1) / 2, z] }); track.addCollider(x, z, 1.1); }
    sup.add('beam', box(22.6, 0.9, 1.4, 0.1, 1), { p: [8, yy - 2.4, z] });
    void py;
  }
  bake.builder(pb, { pipe: pipeMat, flange: plastic(0x24569a, 0.45, 0.3), tower: plastic(0xb9bdc2, 0.8) }, true);
  bake.builder(sup, { s: plastic(0xb4b8bc, 0.9), leg: plastic(0xd8dbe0, 0.5, 0.4), beam: plastic(0xffc928, 0.5) }, false);
  // the gantry over the dam: two portal frames, and the reservoir gauge on top, facing the lake
  const zc = (DAM.zUp + DAM.zDn) / 2;
  {
    const gb = new ModelBuilder();
    for (const z of [-347.4, -321.2]) {
      for (const x of [-3.5, 19.5]) { const gy = Math.min(sc.y(x, z), z < -340 ? track.terrainHeight(x, z) : 11); gb.add('leg', box(1.4, 26 - gy, 1.4, 0.15, 1), { p: [x, gy + (26 - gy) / 2 - 0.5, z] }); if (z < -340) track.addCollider(x, z, 1.2); }
      gb.add('beam', box(25, 1.4, 1.8, 0.15, 1), { p: [8, 25.1, z] });
    }
    for (const x of [-3.5, 19.5]) gb.add('beam', box(1.0, 1.0, 26.2, 0.1, 1), { p: [x, 25.6, -334.3] });
    for (const x of [-0.5, 16.5]) gb.add('leg', box(0.6, 6.4, 0.6, 0.1, 1), { p: [x, 32.2, zc - 6] });
    gb.add('beam', box(18, 0.6, 0.9, 0.1, 1), { p: [8, 29.3, zc - 6] });
    bake.builder(gb, { leg: plastic(0xd8dbe0, 0.5, 0.4), beam: plastic(0xffc928, 0.5) }, true);
  }
  const gauge = ledSign(THREE, group, 768, 384, [8, 32.6, zc - 6.4], Math.PI, 15, 7.5);
  {
    const s = atlas.add(768, 120, signDraw('H₂O → GPU', { bg: '#ffc928', fg: '#1a1d29', font: SANS, size: 80, lines: 1 }));
    atlas.place(s, [8, 25.1, -347.4 - 0.95], Math.PI, 11, 1.72);
  }

  /* pumps at the foot of the dam, gulping */
  const pumpParts = partsOf(D.pumpUnit()), pumpAt = PIPE_X.map((x, k) => ({ x, y: 0, z: -294 + k * 13 }));
  pumpAt.forEach(p => { p.y = sc.y(p.x, p.z) - 0.1; });
  const pumps = sc.instances(pumpParts, pumpAt.map(p => ({ ...p, yaw: 0 })), { cast: true });
  const bulge = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 16, 10), pipeMat, routes.length * 6); bulge.frustumCulled = false; group.add(bulge);
  const routeLen = routes.map(c => c.getLength());

  /* whirlpools round the intake towers, and a foam ring round each: they ride the surface down */
  const swirlTex = canvasTexture(THREE, 256, 256, (g, w, h) => {
    g.clearRect(0, 0, w, h); g.translate(w / 2, h / 2);
    const gr = g.createRadialGradient(0, 0, 0, 0, 0, w / 2); gr.addColorStop(0, 'rgba(8,30,60,0.95)'); gr.addColorStop(0.18, 'rgba(20,70,120,0.7)'); gr.addColorStop(0.6, 'rgba(60,140,200,0.25)'); gr.addColorStop(1, 'rgba(60,140,200,0)');
    g.fillStyle = gr; g.beginPath(); g.arc(0, 0, w / 2, 0, 7); g.fill();
    for (let arm = 0; arm < 5; arm++) { g.beginPath(); for (let t = 0; t <= 1; t += 0.02) { const r = 10 + t * (w / 2 - 14), a = arm * 1.2566 + t * 5.2; g.lineTo(Math.cos(a) * r, Math.sin(a) * r); } g.strokeStyle = 'rgba(240,250,255,0.85)'; g.lineWidth = 7; g.stroke(); }
  });
  const foamTex = canvasTexture(THREE, 256, 256, (g, w, h) => {
    g.clearRect(0, 0, w, h); const r = makeRng(5);
    for (let k = 0; k < 420; k++) { const a = r() * 6.283, rr = w * (0.36 + r() * 0.12); g.fillStyle = `rgba(255,255,255,${0.35 + r() * 0.5})`; g.beginPath(); g.arc(w / 2 + Math.cos(a) * rr, h / 2 + Math.sin(a) * rr, 3 + r() * 7, 0, 7); g.fill(); }
  });
  const disc = new THREE.CircleGeometry(1, 32); disc.rotateX(-Math.PI / 2);
  const swirlMat = new THREE.MeshBasicMaterial({ map: swirlTex, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
  const foamMat = new THREE.MeshBasicMaterial({ map: foamTex, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3 });
  const swirls = new THREE.InstancedMesh(disc, swirlMat, PIPE_X.length), foams = new THREE.InstancedMesh(disc, foamMat, PIPE_X.length);
  for (const m of [swirls, foams]) { m.frustumCulled = false; m.renderOrder = 3; group.add(m); }
  const intakes = PIPE_X.map(x => ({ x, z: TOWER.z, bed: track.terrainHeight(x, TOWER.z) }));

  /* the shore: a jetty off the bay that ends in mid-air, a lifeguard chair, boats that settle on the bed (karts bump them), signs */
  { const zs = LAKE.zN - LAKE.RN + 2; const d = D.dock(30, 18); sc.place(d, LAKE.cx, zs, { yaw: 0, y: LAKE.full + 0.9 }); bake.add(d, true); for (let z = zs + 2; z <= zs + 30; z += 3) track.addCollider(LAKE.cx, z, 1.8); }
  {
    const cx = LAKE.cx + 0.86 * LAKE.RX, cz = -415, c = D.lifeguardChair(); sc.place(c, cx, cz, { yaw: -Math.PI / 2 - 0.3 }); bake.add(c, true); track.addCollider(cx, cz, 1.4);
    const s = atlas.add(384, 192, signDraw('LIFEGUARD ON BREAK (FOREVER)', { bg: '#e23b3b', fg: '#ffffff', font: SANS, size: 60 }));
    atlas.place(s, [cx - 0.5, sc.y(cx, cz + 4.5) + 2.6, cz + 4.5], -Math.PI / 2, 3.6, 1.8, 0, true);
    const pb2 = new ModelBuilder(); pb2.add('p', cyl(0.08, 0.08, 2, 5), { p: [cx - 0.4, sc.y(cx, cz + 4.5) + 0.5, cz + 4.5] }); bake.builder(pb2, { p: plastic(0xd9c9a8, 0.8) }, false);
  }
  const updateMeter = shorelineMeter({ THREE, sc, bake, group, palette, track });
  const boatSpots = [[30, -366, 0.7], [-44, -388, -2.2], [-48, -438, 2.4], [30, -458, -0.4], [-20, -470, 1.1]];
  const boats = boatSpots.map(([x, z, yaw]) => ({ x, z, yaw, bed: track.terrainHeight(x, z), tilt: [rng.range(-0.25, 0.25), rng.range(-0.18, 0.18)] }));
  for (const b of boats) track.addCollider(b.x, b.z, 2.4);
  // each with its name on the hull (one shared canvas of names)
  const NAMES = [['LIQUIDITY', 0xffffff, 0x1f6bff], ['UNSINKABLE II', 0xffd23c, 0x1a1d29], ['SERIES B', 0xffffff, 0xe23b3b], ['EXIT STRATEGY', 0xe23b3b, 0xffffff], ['HODL', 0xffffff, 0x16a34a]];
  const nameTex = canvasTexture(THREE, 512, 512, (g, w) => { g.fillStyle = '#1a1d29'; g.fillRect(0, 0, w, w); NAMES.forEach(([n], k) => fitText(g, n, w / 2, k * 100 + 52, w - 30, 70, SANS, '#ffffff', { lines: 1 })); });
  const nameMat = new THREE.MeshStandardMaterial({ map: nameTex, roughness: 0.5 });
  boats.forEach((b, k) => {
    const [, hull, stripe] = NAMES[k % NAMES.length], v1 = 1 - (k * 100 + 8) / 512, v0 = 1 - (k * 100 + 92) / 512;
    b.obj = new THREE.Group();
    const boatBake = makeBaker(THREE, b.obj, sc.shadows, palette);
    boatBake.add(D.boat({ hull, stripe, nameMat, nameUV: [0.02, v0, 0.98, v1] }));
    boatBake.flush();
    b.obj.position.set(b.x, LAKE.full, b.z); b.obj.rotation.y = b.yaw; group.add(b.obj);
  });
  // NO SWIMMING on the land side of the east shore, facing the drivers coming up it
  {
    const i = track.indexAtCp(9.55), lat = -(track.hwR[i] + 3), p = { x: track.px[i] + track.lx[i] * lat, z: track.pz[i] + track.lz[i] * lat }, yaw = Math.atan2(-track.tx[i], -track.tz[i]) + 0.45, y = sc.y(p.x, p.z);
    const s = atlas.add(512, 320, (g, w, h) => { g.fillStyle = '#ffffff'; g.fillRect(0, 0, w, h); g.strokeStyle = '#e23b3b'; g.lineWidth = 16; g.strokeRect(8, 8, w - 16, h - 16); fitText(g, 'NO SWIMMING', w / 2, h * 0.36, w - 70, 92, SANS, '#e23b3b', { lines: 1 }); fitText(g, '(SOON: NO WATER)', w / 2, h * 0.7, w - 90, 56, SANS, '#1a1d29', { lines: 1 }); });
    atlas.place(s, [p.x, y + 4.4, p.z], yaw, 6.4, 4.0, 0, true);
    const pb3 = new ModelBuilder(); for (const o of [-1.6, 1.6]) pb3.add('p', cyl(0.12, 0.12, 4.6, 6), { p: [p.x + Math.cos(yaw) * o * 1.5, y + 2.0, p.z - Math.sin(yaw) * o * 1.5] }); bake.builder(pb3, { p: plastic(0x8a929e, 0.5, 0.5) }, false);
  }
  // the protest, on the land side of the east shore
  {
    const people = [], q = PROTEST.slice(), sticks = [];
    for (let k = 0; k < 9; k++) {
      const cp = 9.75 + k * 0.05, i = track.indexAtCp(cp), lat = -(track.hwR[i] + 3.6 + (k % 3) * 1.6 + rng() * 0.6), p = { x: track.px[i] + track.lx[i] * lat, z: track.pz[i] + track.lz[i] * lat };
      const yaw = Math.atan2(track.lx[i], track.lz[i]) + rng.range(-0.3, 0.3), y = sc.y(p.x, p.z);
      people.push({ x: p.x, y, z: p.z, yaw });
      sticks.push({ x: p.x + Math.cos(yaw) * 0.3 + Math.sin(yaw) * 0.3, y: y + 2.9, z: p.z - Math.sin(yaw) * 0.3 + Math.cos(yaw) * 0.3, yaw, text: q[k % q.length] });
    }
    sc.instances(partsOf(D.protester()), people, { tints: P.CROWD_TINTS, cast: false });
    sticks.forEach((s, k) => {
      const r = atlas.add(320, 200, signDraw(s.text, { bg: ['#ffffff', '#ffd23c', '#7fd0ff', '#ff9ab0'][k % 4], fg: '#1a1d29', size: 64, border: '#1a1d29' }));
      atlas.place(r, [s.x, s.y + 0.45, s.z], s.yaw, 2.4, 1.5, 0, true);
    });
  }

  // update: everything follows the race's lake level
  const st = { level: LAKE.full, lap: 1, pct: 100, shown: -1, t: 0, smog: 0 };
  const SMOG = { zenith: 0x6f5e48, horizon: 0xb5996c, ground: 0xa58d6c, sun: 0xffa860, cloud: 0xb7a58a, cloudShade: 0x74644f, cloudCover: 0.88, fog: 0xa88e68, fogNear: 70, fogFar: 560,
    sunLight: 0xffb070, sunIntensity: 2.1, hemiSky: 0xc9ad84, hemiGround: 0x6f6a4c, panoTint: [0.78, 0.62, 0.44] };
  view.dcLake = st;
  const Yax = new THREE.Vector3(0, 1, 0), Mx = new THREE.Matrix4(), Q = new THREE.Quaternion(), S = new THREE.Vector3(), Pp = new THREE.Vector3(), Z = new THREE.Vector3(0, 0, 1);
  const cWet = new THREE.Color(0x8a8070), cDry = new THREE.Color(0xffffff);
  function update(dt, time) {
    const race = view.race;
    const y = race?.lakeY;
    st.level = Number.isFinite(y) ? y : LAKE.full;
    st.lap = race?.lakeLap ? Math.min(race.lakeLap, race.laps) : 1;
    updateMeter(dt, st.lap);
    water.position.y = st.level;
    // the cracks fade in only as the water drops below each point of the bed
    if (crackFade && Math.abs(st.level - crackFade.at) > 0.02) {
      crackFade.at = st.level;
      const { color, h, base } = crackFade;
      for (let k = 0; k < h.length; k++) color.setW(k, base[k] * smoothstep(0, 0.9, h[k] - st.level));
      color.needsUpdate = true;
    }
    // the sky starts blue and is brown by the flag: the plants have had three laps to work on it
    st.smog += (Math.min(1, (view.showProgress || 0) * 1.2) - st.smog) * Math.min(1, dt * 0.6);
    ctx.gfx.shiftSky(SMOG, st.smog);
    const f = clamp((LAKE.full - st.level) / (LAKE.full - LAKE.low), 0, 1);
    waterMat.color.copy(cFull).lerp(cLow, f * 0.55);
    crackMat.color.copy(cWet).lerp(cDry, race && race.lakeLap >= race.laps ? 1 : 0);
    st.pct = lakePct(st.level);
    for (const b of boats) {
      const grounded = clamp((b.bed + 0.4 - st.level) / 1.2, 0, 1), by = Math.max(st.level, b.bed + 0.4) - 0.35;
      b.obj.position.y = by + (1 - grounded) * Math.sin(time * 1.3 + b.x) * 0.08;
      b.obj.rotation.set(b.tilt[0] * grounded, b.yaw, b.tilt[1] * grounded + (1 - grounded) * Math.sin(time + b.z) * 0.03);
    }
    const beat = 0.5 + 0.5 * Math.sin(time * 5.2);
    pumpAt.forEach((p, k) => { const s = 1 + 0.07 * Math.max(0, Math.sin(time * 5.2 - k * 0.9)); Mx.compose(Pp.set(p.x, p.y, p.z), Q.identity(), S.set(s, 1 + (s - 1) * 1.6, s)); for (const m of pumps) m.setMatrixAt(k, Mx); });
    for (const m of pumps) m.instanceMatrix.needsUpdate = true;
    let n = 0;
    routes.forEach((curve, k) => {
      for (let j = 0; j < 6; j++) {
        const t = ((((Math.abs(time) * (16 + st.lap * 6)) / routeLen[k] + j / 6 + k * 0.13) % 1) + 1) % 1, p = curve.getPointAt(t), tg = curve.getTangentAt(t);
        Q.setFromUnitVectors(Z, tg); const r = 2.45 + 0.25 * beat; Mx.compose(p, Q, S.set(r, r, 4.2)); bulge.setMatrixAt(n++, Mx);
      }
    });
    bulge.instanceMatrix.needsUpdate = true;
    intakes.forEach((w, k) => {
      const show = st.level > w.bed + 0.3 && st.level < TOWER.top ? 1 : 0.001, spin = time * (1.4 + st.lap * 0.6) + k;
      Mx.compose(Pp.set(w.x, st.level + 0.08, w.z), Q.setFromAxisAngle(Yax, -spin), S.set(10 * show, 1, 10 * show)); swirls.setMatrixAt(k, Mx);
      const fr = (12 + Math.sin(time * 3 + k * 2) * 1.2) * show;
      Mx.compose(Pp.set(w.x, st.level + 0.12, w.z), Q.setFromAxisAngle(Yax, spin * 0.3), S.set(fr, 1, fr)); foams.setMatrixAt(k, Mx);
    });
    swirls.instanceMatrix.needsUpdate = true; foams.instanceMatrix.needsUpdate = true;
    for (let k = 0, m = view.fx.count(10, dt); k < m; k++) {
      const x = PIPE_X[Math.floor(Math.random() * 3)] + (Math.random() - 0.5) * 3, z = -334 + (Math.random() < 0.5 ? -6 : 6) + (Math.random() - 0.5) * 2;
      view.fx.smoke.emit({ x, y: 29.4, z, vx: (Math.random() - 0.5) * 3, vy: 3 + Math.random() * 3, vz: (Math.random() - 0.5) * 3, color: [0.95, 0.97, 1], size: 1.6 + Math.random(), grow: 2.5, drag: 1.5, gravity: 3, life: 1.2, alpha: 0.85 });
    }
    st.t += dt;
    if (st.pct !== st.shown && st.t > 0.1) {
      st.t = 0; st.shown = st.pct;
      gauge.draw((g, w, h) => {
        g.fillStyle = '#07090c'; g.fillRect(0, 0, w, h);
        const col = st.pct > 60 ? '#38ff74' : st.pct > 25 ? '#ffb020' : '#ff3b30';
        g.fillStyle = '#7fd0ff'; g.font = `bold 46px ${MONO}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('RESERVOIR', w / 2, 46);
        g.fillStyle = col; g.font = `bold 150px ${MONO}`; g.fillText(st.pct + '%', w / 2, 158);
        g.strokeStyle = '#3a414c'; g.lineWidth = 6; g.strokeRect(60, 240, w - 120, 48);
        g.fillStyle = col; g.fillRect(66, 246, (w - 132) * st.pct / 100, 36);
        g.fillStyle = '#ffd23c'; g.font = `bold 34px ${MONO}`; g.fillText('THANK YOU FOR YOUR WATER', w / 2, 336, w - 40);
      });
    }
  }
  const tailSegs = [];
  PIPE_X.forEach((x, k) => { const p2 = [[x, -414], [x, -285], ...tail[2 - k].map(a => [a[0], a[2]])]; for (let j = 0; j < p2.length - 1; j++) tailSegs.push([p2[j][0], p2[j][1], p2[j + 1][0], p2[j + 1][1]]); });
  const nearPipe = (x, z, m) => {
    for (const c of tailSegs) { const [ax, az, bx, bz] = c, dx = bx - ax, dz = bz - az, t = clamp(((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz || 1), 0, 1); if (Math.hypot(x - ax - dx * t, z - az - dz * t) < m + 2) return true; }
    return false;
  };
  return { update, nearPipe };
}
const inBox = (x, z) => x > HB.x0 - 1 && x < HB.x1 + 1 && z > HB.z0 - 1 && z < HB.z1 + 1;
