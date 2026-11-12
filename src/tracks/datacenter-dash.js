/* Datacenter Dash: the finale of the first cup. A hyperscale AI campus in a pine
   valley on a hazy afternoon. The main drag runs into Training Hall 9 and you
   drive through the data hall itself, between rows of blinking racks. Out the
   back, a jump over the coolant pond, a climb onto the dam crest under the fat
   blue pipes that are drinking the reservoir (a third of it per lap), and a
   switchback run back down past the transformer yard. Two gas plants belch
   smoke over the skyline so the whole thing can stay online. */
import { fbm, smoothstep, clamp, lerp, makeRng } from '../core/util.js';
import { Scenery, partsOf } from '../render/scenery.js';
import { makeGroundHit, EDGE } from '../track/track.js';
import { ModelBuilder, box, cyl, plastic, glow } from '../models/build.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import * as P from '../models/props.js';
import * as D from '../models/props-datacenter-dash.js';

const POND = { x: 182, z: -208, rx: 62, rz: 78 };
/* The reservoir: a basin north of the dam. v runs from the dam (0) to the far end (1);
   the basin is deepest against the dam. Water levels: full on lap 1, nearly a mud flat on the last. */
const LAKE = { cx: -22, zDam: -342, len: 215, bed: 0.2, rim: 15.9, full: 15.0, low: 1.2 };
const VALLEY = { x: 20, z: -140, rx: 255, rz: 215 };      // flat campus floor
const YARD = { x0: -112, x1: -22, z0: -224, z1: -180 };      // transformer yard between the switchback legs
/* Training Hall 9: the box the road drives through (axis aligned), its two doorways, and its floor level. */
const HB = { x0: 100.5, x1: 196, z0: -141.3, z1: 20, H: 13, ceil: 10.8, door: 8.6, fy: -0.15 };
const ENTRY = { z0: -11.5, z1: 11 }, EXIT = { x0: 160.5, x1: 183.5 };
/* Campus halls (centre, yaw, length, width, height, accent, company sign). The ground around each is paved. */
const HALLS = [
  { x: 30, z: -88, yaw: 0, L: 92, W: 26, H: 15, c: 0x1f6bff, name: 'OMNIMIND' },
  { x: 60, z: -175, yaw: 0, L: 64, W: 24, H: 14, c: 0x16a34a, name: 'THIRSTCOMPUTE' },
  { x: 55, z: -245, yaw: 0, L: 56, W: 24, H: 13, c: 0xff6a00, name: 'NEURAL ACRES' },
  { x: 255, z: -55, yaw: Math.PI / 2, L: 84, W: 26, H: 15, c: 0x7b5cff, name: 'HYPERSCALE HOLDINGS' },
  { x: 232, z: 70, yaw: 0, L: 64, W: 24, H: 13, c: 0x0ea5e9, name: 'CLOUDSINK' },
  { x: -225, z: 55, yaw: -0.5, L: 64, W: 24, H: 13, c: 0xdb2777, name: 'INFINITE TOKENS' },
];
/* Gas plants: centre, yaw (front faces the track), pad height, company name. */
const PLANTS = [
  { x: 338, z: 34, yaw: -Math.PI / 2, y: 5, name: 'GASLIGHT ENERGY', line: "IT'S NOT SMOKE, IT'S CLOUD COMPUTING", color: 0xd8442c, seed: 5 },
  { x: -318, z: -262, yaw: Math.PI / 2, y: 14, name: 'PEAKER PLANT 2', line: 'ALWAYS PEAKING', color: 0xf0a020, seed: 9 },
];
const WIND = [-1.2, 0, -3.4], PLANT_SCALE = 1.45;
/** Local (u along the hall, v across it) coordinates of a point relative to a hall. */
const hallUV = (h, x, z) => { const dx = x - h.x, dz = z - h.z, c = Math.cos(h.yaw), s = Math.sin(h.yaw); return [dx * c - dz * s, dx * s + dz * c]; };
const lakeRx = v => 72 + 88 * smoothstep(0.02, 0.5, v);
/** Basin coordinate: 0 at the deepest point, 1 at the rim. */
function lakeE(x, z) {
  const v = Math.max(0, (LAKE.zDam - z) / LAKE.len), u = (x - LAKE.cx) / lakeRx(v);
  return Math.hypot(u, Math.max(0, (v - 0.42) / 0.58));
}
const lakeBed = e => LAKE.bed + (LAKE.rim - LAKE.bed) * Math.pow(clamp((e - 0.1) / 0.9, 0, 1), 1.5);
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
    const hl = le < 1 ? lakeBed(le) + (fbm(x * 0.06, z * 0.06, 2, 31) - 0.5) * 0.9 * (1 - smoothstep(0.75, 1, le)) : lerp(LAKE.rim, Math.max(h, LAKE.rim), smoothstep(1, 1.6, le));
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
  lapNotes: ['<b>Reservoir at 52%.</b> Thank you for your water.', '<b>Reservoir at 4%.</b> Please enjoy the mud.'],   // shown as laps two and three begin
  laps: 3,
  width: 17,
  sky: 'day',
  skyOverrides: { zenith: 0x3f7fd0, horizon: 0xcfcbb8, ground: 0xc8c2ae, cloudCover: 0.36, fog: 0xc4c4b4, fogNear: 240, fogFar: 1250, sunIntensity: 3.2, hemiGround: 0x7d8a5c },
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
    { p: [152, 7, -294] },            // 7 climbing left toward the dam
    { p: [108, 11.5, -318] },         // 8
    { p: [40, 16, -332] },            // 9 the dam crest
    { p: [-45, 18.5, -334] },         // 10 high point
    { p: [-100, 17, -314] },          // 11 off the dam, left
    { p: [-132, 14.5, -275] },        // 12 heading south
    { p: [-112, 12, -239] },          // 13 leg A, heading east
    { p: [-68, 10.8, -238] },         // 14
    { p: [-26, 10.2, -233], w: 18 },  // 15 hairpin right
    { p: [-8, 9.5, -202], w: 18 },    // 16
    { p: [-26, 8.8, -171], w: 18 },   // 17
    { p: [-68, 8, -166] },            // 18 leg B, heading west
    { p: [-112, 6.5, -166] },         // 19
    { p: [-152, 5, -128] },           // 20 left, heading south
    { p: [-156, 2.5, -62] },          // 21
    { p: [-136, 0.5, -12] },          // 22 last corner onto the main drag
    { p: [-80, 0, 0] },               // 23
  ],
  sides: [
    { from: 22.7, to: 1.1, edge: 'wall' },                                     // the main drag between the halls
    { from: 6.0, to: 11.0, edge: 'wall' },                                     // climb and dam crest are fenced
    { from: 4.0, to: 6.0, edge: 'void' },                                      // the pond bridge: nothing but coolant below
    // the transformer yard between the two switchback legs: cut it with a boost
    { from: 14.5, to: 17.5, side: 'R', outer: 30, shoulder: 4, hoarding: false },
    // a low kerb on the lake side of the dam, so the chase camera sees the water (the edge is still a wall)
    { from: 8.3, to: 11.0, side: 'R', wallHeight: 0.4 },
  ],
  // the opening shot: the whole lake, the pipes drinking it, and a gas plant smoking behind
  intro: [{ pos: [168, 62, -292], pos1: [138, 52, -312], look: [-60, 14, -405], look1: [-80, 12, -395], fov: 50, dur: 3 }],
  tunnels: [{ from: 1.15, to: 4.0 }],
  bridges: [{ from: 4.0, to: 6.0 }, { from: 8.8, to: 10.9 }],
  zones: [
    { from: 1.15, to: 4.0, skin: 'hallfloor' },
    { from: 4.0, to: 6.0, skin: 'metal' },
    { from: 8.8, to: 10.9, skin: 'stone' },
  ],
  ramps: [{ at: 4.62, len: 9, lift: 2.1 }],
  boosts: [
    { at: 0.5, lat: 0, w: 5 },
    { at: 5.12, lat: 0, w: 6 },
    { at: 11.2, lat: 3, w: 4.5 },
    { at: 20.6, lat: -3, w: 4.5 },
  ],
  itemRows: [{ at: 1.25 }, { at: 6.4 }, { at: 12.4 }, { at: 21.4, n: 3 }],
  coins: [
    { from: 0.2, to: 0.45, n: 4, lat: -4 },
    { from: 2.2, to: 3.0, n: 5, lat: [5, 2] },
    { from: 4.75, to: 4.95, n: 3, lat: 0, air: 2.6 },
    { from: 9.3, to: 9.9, n: 4, lat: [-3, 3] },
    { from: 14.66, to: 14.66, n: 4, lat: [-13, -30] },
    { from: 18.6, to: 19.2, n: 4, lat: [4, -3] },
    { from: 21.6, to: 22.2, n: 4, lat: [-3, 4] },
  ],
  obstacles: [
    // security robots on the straights, each sweeping only part of the road
    { kind: 'patrol', model: 'bot', at: 3.45, lats: [-7, -2.8], speed: 3, effect: 'spin', radius: 1.2 },
    { kind: 'patrol', model: 'bot', at: 13.75, lats: [-7, -2.6], speed: 3.2, effect: 'spin', radius: 1.2 },
    { kind: 'patrol', model: 'bot', at: 20.95, lats: [-7, -2.8], speed: 3, effect: 'spin', radius: 1.2 },
    // steam vents on the dam crest, blowing in turn
    { kind: 'timed', model: 'vent', at: 9.45, lat: 4, period: 3, duty: 0.45, phase: 0, effect: 'spin', radius: 1.4 },
    { kind: 'timed', model: 'vent', at: 9.75, lat: -4, period: 3, duty: 0.45, phase: 1.5, effect: 'spin', radius: 1.4 },
  ],
  models: { vent: () => D.vent() },
  terrain: {
    cell: 3, margin: 230, blend: 30, water: -1.5, fn: height,
    color(x, z, h, slope, over, out) {
      const mix = (r, g, b, a) => { out[0] += (r - out[0]) * a; out[1] += (g - out[1]) * a; out[2] += (b - out[2]) * a; };
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
    road: { base: 0x575c66, line: 0xffffff, center: 0xffd23c },
    kerb: [0x1f6bff, 0xf4f6f8],
    shoulder: 0xa7aaa6,
    terrain: { low: 0x4f8a3a, high: 0x6a9f45, dry: 0x9aa65c, rock: 0x8c8a84, sand: 0xb7a984, dirt: 0x8f7a5a },
    wall: 0xe9ecf0, wallStripe: 0x1f6bff, water: 0x23c2b4, deck: 0x9aa3ad, rail: 0xffb020,
    tunnelLight: 0xffffff, portal: 0xdfe3e8,
    ads: ['NOW TRAINING ON YOU', 'GPU GO BRRR', 'COMPUTE IS THE NEW OIL', 'TOKENS PER SECOND', 'WE ARE OUT OF GPUS', 'HALLUCINATION FREE*', 'STOCHASTIC PARROT FEED', 'ATTENTION IS ALL YOU NEED', 'OVERFIT AND PROUD', 'LIQUID COOLED EGO', 'ROBOTS.TXT IGNORED', 'INFERENCE AT THE EDGE', 'SCALING LAWS APPLY', 'PROMPT RESPONSIBLY'],
  },
  POND, LAKE,

  /** Dress the course. ctx: { THREE, track, group, gfx, anim, view } */
  decorate(ctx) { decorate(ctx); },
};

const CREST = [8.8, 10.9];
const TOWERS = [{ x: 252, z: -168 }, { x: 106, z: -262 }];
const PIPE_X = [2, 8, 14];
const FONT = '"Luckiest Guy", "Arial Black", sans-serif', SANS = '"Arial Black", "Helvetica Neue", Arial, sans-serif', MONO = '"Courier New", Courier, monospace';
const BOARDS = [
  [6.6, -1, 16, 'YOUR LAKE, NOW IN THE CLOUD', '#1f6bff', '#ffffff'], [12.3, -1, 16, 'CARBON NEUTRAL BY 2099', '#16a34a', '#ffffff'],
  [16.0, 1, 16, 'POWERED BY GAS AND VIBES', '#ffd23c', '#1a1d29'], [19.6, 1, 15, 'ASK US ABOUT OUR LAKE', '#ffffff', '#1f6bff'],
  [21.2, 1, 15, 'NOW TRAINING ON YOU', '#db2777', '#ffffff'], [7.6, 1, 16, 'THIRSTY? SO ARE WE', '#0ea5e9', '#ffffff'],
  [1.0, 1, 30, 'GPU GO BRRR', '#1a1d29', '#ffd23c'], [13.2, 1, 16, 'CLEAN ENERGY (COMING SOON)', '#ff6a00', '#ffffff'],
  [18.9, -1, 16, 'WE ARE OUT OF GPUS', '#ffffff', '#e23b3b'], [22.2, -1, 16, 'SKY STILL MOSTLY BLUE', '#7b5cff', '#ffffff'],
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

/** Merges static props into one mesh per material (and per shadow casting), so the whole course costs a few draw calls. */
function makeBaker(THREE, group, shadows) {
  const buckets = new Map();
  const push = (mat, g, cast) => { let b = buckets.get(mat); if (!b) buckets.set(mat, b = [[], []]); b[cast && !mat.transparent ? 0 : 1].push(g); };
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
    const mat = new THREE.MeshStandardMaterial({ map: tex, emissiveMap: tex, emissive: 0xffffff, emissiveIntensity: 0.3, roughness: 0.6, side: THREE.DoubleSide });
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
    add(w, h, draw) { const r = alloc(w, h); r.draw = draw; r.p.items.push(r); return r; },
    place(r, c, yaw, w, h, tilt = 0) { const { p } = r; p.q.panel(c, yaw, w, h, [r.x / S, 1 - (r.y + r.h) / S, (r.x + r.w) / S, 1 - r.y / S], tilt); },
    paint() { for (const p of pages) { p.g.clearRect(0, 0, S, S); for (const r of p.items) { p.g.save(); p.g.translate(r.x, r.y); p.g.beginPath(); p.g.rect(0, 0, r.w, r.h); p.g.clip(); r.draw(p.g, r.w, r.h); p.g.restore(); } p.tex.needsUpdate = true; } },
    flush() {
      api.paint();
      for (const p of pages) if (!p.q.empty) { const m = new THREE.Mesh(p.q.geometry(THREE), p.mat); m.matrixAutoUpdate = false; group.add(m); }
      if (typeof document !== 'undefined' && document.fonts?.ready) document.fonts.ready.then(() => api.paint());
    },
  };
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

function canvasTexture(THREE, w, h, draw, { repeat = false } = {}) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

/* ---------- decorate ---------- */
function decorate(ctx) {
  const { THREE, track, anim, view } = ctx, sc = new Scenery(ctx), rng = sc.rng;
  const hit = makeGroundHit(), W = track.water;
  const bake = makeBaker(THREE, ctx.group, sc.shadows), atlas = makeAtlas(THREE, ctx.group);
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
  const ctxs = { THREE, track, ctx, sc, rng, bake, atlas, clear, at, samples, view, anim };

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
  sc.along({ from: 22.95, to: 0.85, side: -1, offset: 6.5, spacing: 33 }).forEach((p, i) => putStand(i % 2 ? stand2 : stand, p));
  sc.instances(partsOf(P.spectator()), seats, { scale: [0.95, 1.2], tints: P.CROWD_TINTS, cast: false });
  const hallAt = (h, opts = {}) => {
    const g = D.dataHall({ L: h.L, W: h.W, H: h.H, accent: h.c, ...opts }); sc.place(g, h.x, h.z, { yaw: h.yaw, y: h.y ?? sc.y(h.x, h.z) - 0.4 }); bake.add(g);
    if (h.name) {   // the company sign on the front face, top left
      const w = Math.min(h.L * 0.55, 34), hh = w / 5.2, c = Math.cos(h.yaw), s = Math.sin(h.yaw), u = -h.L / 2 + w / 2 + 3, v = h.W / 2 + 0.45, y = (h.y ?? sc.y(h.x, h.z) - 0.4) + h.H - 4.6;
      const col = '#' + new THREE.Color(h.c).getHexString();
      const r = atlas.add(780, 150, (g, W2, H2) => { g.fillStyle = '#ffffff'; g.fillRect(0, 0, W2, H2); g.fillStyle = col; g.beginPath(); g.arc(H2 * 0.5, H2 * 0.5, H2 * 0.34, 0, 7); g.fill(); g.fillStyle = '#ffffff'; g.beginPath(); g.arc(H2 * 0.5 + H2 * 0.1, H2 * 0.5 - H2 * 0.08, H2 * 0.16, 0, 7); g.fill(); fitText(g, h.name, W2 * 0.55, H2 * 0.54, W2 * 0.8, 96, SANS, col, { lines: 1 }); });
      atlas.place(r, [h.x + u * c + v * s, y, h.z - u * s + v * c], h.yaw, w, hh);
    }
  };
  {
    const n = sc.beside(23.75, 1, 17.5), s = sc.beside(23.85, -1, 37);
    hallAt({ x: n.x, z: n.z, yaw: n.yaw, L: 118, W: 26, H: 15, c: 0x1f6bff, name: 'COGNITRON', y: 0 });
    hallAt({ x: s.x, z: s.z, yaw: s.yaw, L: 128, W: 26, H: 16, c: 0x16a34a, name: 'SYNERGY SILO', y: 0 });
  }
  // light masts behind the stands and lamps along the walls of the main drag
  sc.instances(partsOf(D.floodMast({ h: 20 })), sc.along({ from: 22.8, to: 0.9, side: -1, offset: 21, spacing: 33, phase: 16 }), {});
  const lampParts = partsOf(D.streetLamp());
  const lamps = [
    ...sc.along({ from: 22.8, to: 1.0, side: 1, offset: 1.0, spacing: 18 }), ...sc.along({ from: 22.8, to: 1.0, side: -1, offset: 1.0, spacing: 18, phase: 9 }),
    ...sc.along({ from: 6.1, to: 8.8, side: 1, offset: 1.0, spacing: 20 }), ...sc.along({ from: 6.1, to: 8.2, side: -1, offset: 1.0, spacing: 20, phase: 10 }),
    ...sc.along({ from: 11.0, to: 22.6, side: 1, offset: 12.8, spacing: 22 }).filter(p => clear(p.x, p.z, 0.8)),
    ...sc.along({ from: 11.0, to: 22.6, side: -1, offset: 12.8, spacing: 22, phase: 11 }).filter(p => clear(p.x, p.z, 0.8)),
  ];
  for (const i of samples(CREST[0] + 0.05, CREST[1] - 0.05, 16)) for (const s of [1]) { const hw = s > 0 ? track.hwL[i] : track.hwR[i], p = at(i, s * (hw + 0.9)); lamps.push({ x: p.x, y: track.py[i] - 0.1, z: p.z, yaw: Math.atan2(-s * track.lx[i], -s * track.lz[i]) }); }
  sc.instances(lampParts, lamps.filter(p => !inHallBox(p.x, p.z, 2)), { cast: false });

  // ---- Training Hall 9: the road runs through a real data hall ----
  const hallFx = trainingHall(ctxs);

  // ---- the coolant pond and the cooling towers, both steaming ----
  const towers = TOWERS.map(t => { const tw = D.coolingTower({ H: 31 }); sc.place(tw, t.x, t.z, { y: Math.max(W - 0.4, sc.y(t.x, t.z)) - 0.3, yaw: rng() * 6 }); const o = { x: t.x, z: t.z, y: tw.position.y + tw.userData.top, r: tw.userData.rimR }; bake.add(tw, false); return o; });
  {
    const p = sc.beside(4.3, 1, 3.5), r = atlas.add(512, 200, signDraw('COOLANT POND · DO NOT DRINK', { bg: '#ffd23c', fg: '#1a1d29', border: '#1a1d29', size: 84 }));
    const post = new ModelBuilder(); post.add('p', cyl(0.12, 0.12, 4.2, 6), { p: [p.x, track.py[p.i] - 1.6, p.z] }); bake.builder(post, { p: plastic(0x8a929e, 0.5, 0.5) });
    atlas.place(r, [p.x, track.py[p.i] + 1.4, p.z], p.yaw + 0.5, 4, 1.56);
  }

  // ---- the dam, the draining lake, the pipes, and the people who object ----
  const lakeFx = reservoir(ctxs);

  // ---- campus: more halls, a security fence, generators, dishes ----
  HALLS.forEach(h => hallAt(h));
  const inHall = (x, z, m = 6) => HALLS.some(h => { const [u, v] = hallUV(h, x, z); return Math.abs(u) < h.L / 2 + m && Math.abs(v) < h.W / 2 + m; }) || inHallBox(x, z, m);
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

  // ---- pines over every slope, and a few on the campus edges ----
  const keep = (x, z) => !inHall(x, z) && !TOWERS.some(t => near(x, z, t, 22)) && !dishes.some(d => near(x, z, d, 16)) && !chains.flat().some(([px, pz]) => near(x, z, { x: px, z: pz }, 7))
    && !PLANTS.some(p => { const [u, v] = plantLocal(p, x, z); return Math.abs(u - 6) < 132 && Math.abs(v + 6) < 84; }) && !(z < LAKE.zDam + 30 && lakeE(x, z) < 1.45) && !lakeFx.nearPipe(x, z, 6);
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
  BOARDS.forEach(([cp, side, off, text, bg, fg], i) => {
    const p = sc.beside(cp, side, off); if (!clear(p.x, p.z, 0.5) || inHallBox(p.x, p.z, 3)) return;
    const yaw = p.yaw + rng.range(-0.12, 0.12), f = frame.clone(); sc.place(f, p.x, p.z, { yaw }); bake.add(f);
    const r = atlas.add(768, 256, (g, w, h) => {
      g.fillStyle = bg; g.fillRect(0, 0, w, h);
      const sh = g.createLinearGradient(0, 0, w, h); sh.addColorStop(0, 'rgba(255,255,255,0.16)'); sh.addColorStop(0.5, 'rgba(255,255,255,0)'); sh.addColorStop(1, 'rgba(0,0,0,0.14)'); g.fillStyle = sh; g.fillRect(0, 0, w, h);
      fitText(g, text, w / 2 + 3, h / 2 + 7, w - 60, 104, FONT, 'rgba(0,0,0,0.25)'); fitText(g, text, w / 2, h / 2 + 4, w - 60, 104, FONT, fg);
      g.strokeStyle = 'rgba(255,255,255,0.5)'; g.lineWidth = 6; g.strokeRect(8, 8, w - 16, h - 16);
    });
    const y = sc.y(p.x, p.z);
    atlas.place(r, [p.x + Math.sin(yaw) * 0.02, y + 6 + 2.5, p.z + Math.cos(yaw) * 0.02], yaw, 15, 5);
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
  };
  for (let k = 0; k < 80; k++) { tick(0.25, k * 0.25); smoke.update(0.25); }   // the plumes are already up when the race starts
  anim.push(tick);
  anim.push((dt, time) => { hallFx(dt, time); lakeFx.update(dt, time); });
}

/* ---------- Training Hall 9 ---------- */
function trainingHall({ THREE, track, ctx, sc, rng, bake, atlas, view }) {
  const FY = HB.fy, group = ctx.group;
  // distance from the road edge, over the samples inside and around the hall
  const iA = track.indexAtCp(0.9), iB = track.indexAtCp(4.2), idx = []; for (let i = iA; i <= iB; i++) idx.push(i);
  const edgeDist = (x, z) => { let best = 1e9; for (const i of idx) { const d = (x - track.px[i]) ** 2 + (z - track.pz[i]) ** 2; if (d < best) best = d; } return Math.sqrt(best) - track.hwL[iA]; };

  /* textures: raised floor tiles, the road version of them, wall panels, rack fronts and their blinking LEDs */
  const floorTex = canvasTexture(THREE, 512, 512, (g, w, h) => {
    const n = 8, t = w / n; g.fillStyle = '#aab1ba'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
      g.fillStyle = (i * 3 + j * 5) % 11 === 0 ? '#dfe3e8' : '#eef0f3'; g.fillRect(i * t + 2, j * t + 2, t - 4, t - 4);
      if ((i + j * 3) % 7 === 0) { g.fillStyle = '#9aa3ad'; for (let a = 6; a < t - 4; a += 6) for (let b = 6; b < t - 4; b += 6) g.fillRect(i * t + a, j * t + b, 2.5, 2.5); }
    }
  }, { repeat: true });
  floorTex.repeat.set(1, 1);
  const roadTex = canvasTexture(THREE, 1024, 1024, (g, w, h) => {
    g.fillStyle = '#a3aab3'; g.fillRect(0, 0, w, h);
    const tu = w / (17 / 0.6), tv = h / (18 / 0.6);
    for (let i = 0; i * tu < w; i++) for (let j = 0; j * tv < h; j++) {
      g.fillStyle = (i * 3 + j * 5) % 11 === 0 ? '#dce0e5' : '#ebedf0'; g.fillRect(i * tu + 2, j * tv + 2, tu - 4, tv - 4);
      if ((i * 7 + j * 3) % 9 === 0) { g.fillStyle = '#9ba3ad'; for (let a = 5; a < tu - 4; a += 5) for (let b = 5; b < tv - 4; b += 5) g.fillRect(i * tu + a, j * tv + b, 2, 2); }
    }
    for (let i = 0; i < 16; i++) { g.fillStyle = i % 2 ? '#ffc928' : '#1a1d26'; g.fillRect(0, i * h / 16, w * 0.035, h / 16); g.fillRect(w * 0.965, i * h / 16, w * 0.035, h / 16); }
    g.fillStyle = 'rgba(31,107,255,0.85)'; for (let j = 0; j < 4; j++) g.fillRect(w * 0.494, j * h / 4 + h * 0.05, w * 0.012, h * 0.14);
  }, { repeat: true });
  const roadMat = view.trackMesh?.userData?.mats?.road_hallfloor;
  if (roadMat) { roadMat.map = roadTex; roadMat.emissiveMap = roadTex; roadMat.emissive.set(0xffffff); roadMat.emissiveIntensity = 0.22; roadMat.roughness = 0.5; roadMat.needsUpdate = true; }
  const wallTex = canvasTexture(THREE, 256, 256, (g, w, h) => { g.fillStyle = '#eceef1'; g.fillRect(0, 0, w, h); g.fillStyle = '#cfd4da'; g.fillRect(0, 0, 3, h); g.fillRect(w / 2, 0, 3, h); g.fillStyle = '#dde1e6'; g.fillRect(0, h - 3, w, 3); }, { repeat: true });
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
  const ledFrames = [0, 1, 2, 3].map(f => canvasTexture(THREE, RW, RH, (g) => {
    const r = makeRng(101 + f * 13); g.fillStyle = '#000'; g.fillRect(0, 0, RW, RH);
    for (const [x, y, k] of LEDS) {
      if (k < 0) { if (r() < 0.8) { g.fillStyle = '#2f8bff'; g.fillRect(x, y, 26, 4); } continue; }
      if (r() < 0.32) continue;
      g.fillStyle = k < 0.55 ? '#38ff74' : k < 0.85 ? '#3dc8ff' : '#ffb020'; g.fillRect(x, y, 7, 6);
    }
  }, { repeat: true }));
  for (const t of ledFrames) t.wrapT = THREE.ClampToEdgeWrapping;
  const rackMat = new THREE.MeshStandardMaterial({ map: rackTex, emissiveMap: ledFrames[0], emissive: 0xffffff, emissiveIntensity: 2.6, roughness: 0.5, metalness: 0.3 });

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
  const racks = new Quads(), cont = new Quads(), ov = new ModelBuilder();
  const RD = 1.1, COLD = 1.4, PITCH = 5.6, HR = 2.25, CAB = 0.6, CLR = 3.2;
  const ruv = (f, a, b, c, d) => {
    if (f === 'pz' || f === 'nz') { const s = f === 'pz' ? 1 : -1; return [[s * a[0] / 2.4, 0.2 + 0.8 * (a[1] - FY) / HR], [s * b[0] / 2.4, 0.2 + 0.8 * (b[1] - FY) / HR], [s * c[0] / 2.4, 0.2 + 0.8 * (c[1] - FY) / HR], [s * d[0] / 2.4, 0.2 + 0.8 * (d[1] - FY) / HR]]; }
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
      const ok = [zA, zC, (zA + zC) / 2].every(zz => edgeDist(x, zz) > CLR && edgeDist(x + CAB, zz) > CLR);
      xs.push(ok ? x : null);
    }
    // runs of consecutive cabinets
    for (let a = 0; a < xs.length; a++) {
      if (xs[a] == null) continue;
      let b = a; while (b + 1 < xs.length && xs[b + 1] != null) b++;
      const x0 = xs[a], x1 = xs[b] + CAB; a = b;
      if (x1 - x0 < CAB * 3) continue;
      racks.box(x0, x1, FY, FY + HR, zA, zA + RD, ruv); racks.box(x0, x1, FY, FY + HR, zB, zC, ruv);
      // cold-aisle containment: a roof over the aisle and doors at both ends
      cont.quad([x0, FY + HR + 0.02, zB], [x1, FY + HR + 0.02, zB], [x1, FY + HR + 0.02, zA + RD], [x0, FY + HR + 0.02, zA + RD], [0, 0, (x1 - x0) / 1.2, 1]);
      for (const [xe, s] of [[x0, -1], [x1, 1]]) {
        const q = s > 0 ? [[xe, FY, zC - RD], [xe, FY, zA + RD], [xe, FY + HR, zA + RD], [xe, FY + HR, zC - RD]] : [[xe, FY, zA + RD], [xe, FY, zC - RD], [xe, FY + HR, zC - RD], [xe, FY + HR, zA + RD]];
        cont.quad(q[0], q[1], q[2], q[3], [0, 0, 1, 1]);
        if (edgeDist(xe + s * 2, (zA + zC) / 2) < CLR + 6) labels.push({ x: xe + s * 0.05, z: (zA + zC) / 2, yaw: s > 0 ? Math.PI / 2 : -Math.PI / 2, pair });
      }
      // yellow fiber trays over the rows, grey cable ladders over the hot aisles
      for (const zc of [zA + RD / 2, zB + RD / 2]) ov.add('tray', new THREE.BoxGeometry(x1 - x0, 0.14, 0.42), { p: [(x0 + x1) / 2, FY + 2.95, zc] });
      ov.add('ladder', new THREE.BoxGeometry(x1 - x0, 0.08, 0.5), { p: [(x0 + x1) / 2, FY + 3.5, zA - (PITCH - 2 * RD - COLD) / 2] });
    }
  }
  bake.geo(rackMat, racks.geometry(THREE), false);
  const contMat = new THREE.MeshStandardMaterial({ color: 0xbfe2ff, transparent: true, opacity: 0.32, roughness: 0.1, metalness: 0.2, depthWrite: false, side: THREE.DoubleSide });
  bake.geo(contMat, cont.geometry(THREE), false);
  const rowName = k => (k >= 26 ? String.fromCharCode(65 + Math.floor(k / 26) - 1) : '') + String.fromCharCode(65 + (k % 26));
  const labelIds = new Map();
  for (const l of labels) {
    if (!labelIds.has(l.pair)) labelIds.set(l.pair, atlas.add(256, 80, signDraw('ROW ' + rowName(l.pair), { bg: '#1f6bff', fg: '#ffffff', font: SANS, size: 54, lines: 1 })));
    atlas.place(labelIds.get(l.pair), [l.x, FY + HR + 0.42, l.z], l.yaw, 2.2, 0.68);
  }
  // overhead: ducts along Z, light strips along X, a pair of yellow fiber bridges over the road
  for (let x = HB.x0 + 10; x < HB.x1 - 4; x += 18) ov.add('duct', cyl(0.55, 0.55, HB.z1 - HB.z0 - 2, 14, true), { p: [x, 10.0, (HB.z0 + HB.z1) / 2], r: [Math.PI / 2, 0, 0] });
  for (let z = HB.z0 + 3; z < HB.z1 - 2; z += 4.2) ov.add('light', new THREE.BoxGeometry(HB.x1 - HB.x0 - 3, 0.07, 0.34), { p: [(HB.x0 + HB.x1) / 2, HB.ceil - 0.08, z] });
  for (let z = HB.z0 + 18; z < HB.z1 - 10; z += 24) ov.add('tray', new THREE.BoxGeometry(HB.x1 - HB.x0 - 4, 0.16, 0.5), { p: [(HB.x0 + HB.x1) / 2, 8.6, z] });
  bake.builder(ov, { tray: plastic(0xffc928, 0.5), ladder: plastic(0x8d96a6, 0.4, 0.6), duct: plastic(0xc9cfd6, 0.3, 0.7), light: glow(0xffffff, 1.5) }, false);

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
    atlas.place(hs, [150, FY + 1.75, zf], 0, 1.0, 0.28);
  }
  // a rack all of its own, labelled YOUR DATA, on the walkway beside the road
  {
    const i = roadAt(3.3), p = { x: track.px[i] - track.lx[i] * (track.hwR[i] + 2.4), z: track.pz[i] - track.lz[i] * (track.hwR[i] + 2.4) };
    const one = new Quads(); one.box(p.x - 0.55, p.x + 0.55, FY, FY + HR, p.z - 0.9, p.z + 0.9, (f, a, b, c, d) => f === 'nx' ? [[0, 0.2], [0.5, 0.2], [0.5, 1], [0, 1]] : [[0, 0.04], [0.2, 0.04], [0.2, 0.16], [0, 0.16]]);
    bake.geo(rackMat, one.geometry(THREE), false);
    const s = atlas.add(512, 160, signDraw('YOUR DATA', { bg: '#e23b3b', fg: '#ffffff', font: SANS, size: 92, lines: 1 }));
    atlas.place(s, [p.x - 0.6, FY + HR + 0.7, p.z], -Math.PI / 2, 2.6, 0.82);
    const s2 = atlas.add(320, 80, signDraw('(TRAINING IN PROGRESS)', { bg: '#ffffff', fg: '#e23b3b', font: SANS, size: 34, lines: 1 }));
    atlas.place(s2, [p.x - 0.57, FY + 1.6, p.z], -Math.PI / 2, 1.5, 0.38);
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
    atlas.place(s, [(cx0 + cx1) / 2, FY + 2.3, cz0 - 0.05], Math.PI, 3.2, 0.94);
  }
  // hanging signs over the road
  {
    const hang = new ModelBuilder();
    const s1 = atlas.add(1024, 160, signDraw('QUIET PLEASE · MODEL IS THINKING', { bg: '#1a1d29', fg: '#ffffff', font: SANS, size: 76, lines: 1, stripe: '#1f6bff' }));
    atlas.place(s1, [112, 7.4, -0.3], -Math.PI / 2, 13, 2.03);
    const s2 = atlas.add(1024, 160, signDraw('EXIT → LAKE (WHILE IT LASTS)', { bg: '#16a34a', fg: '#ffffff', font: SANS, size: 76, lines: 1 }));
    atlas.place(s2, [172, 7.4, -128], 0, 13, 2.03);
    for (const [x, z] of [[112, -5], [112, 4.4], [167, -128], [177, -128]]) hang.add('c', cyl(0.03, 0.03, HB.ceil - 8.4, 4), { p: [x, (HB.ceil + 8.4) / 2, z] });
    const s3 = atlas.add(640, 160, signDraw('HOT AISLE: SPICY', { bg: '#ff6a00', fg: '#ffffff', font: SANS, size: 80, lines: 1 }));
    atlas.place(s3, [HB.x1 - T - 0.05, 6.2, -40], -Math.PI / 2, 9, 2.25);
    bake.builder(hang, { c: plastic(0x2c323c, 0.5) }, false);
  }
  // signs outside: the company name on the roof over the entrance, the counter over the door
  {
    const fr = new ModelBuilder(), y0 = HB.H + 1;
    for (const z of [-14, 0, 14]) fr.add('f', box(0.6, 7.4, 0.6, 0.1, 1), { p: [HB.x0 + 1.5, y0 + 3.7, z] });
    fr.add('f', box(0.5, 7.6, 34, 0.1, 1), { p: [HB.x0 + 1.9, y0 + 3.9, 0] });
    bake.builder(fr, { f: plastic(0x6b7380, 0.5, 0.4) }, false);
    const s = atlas.add(1024, 220, (g, w, h) => { g.fillStyle = '#ffffff'; g.fillRect(0, 0, w, h); g.fillStyle = '#1f6bff'; g.beginPath(); g.arc(h * 0.5, h * 0.5, h * 0.36, 0, 7); g.fill(); g.fillStyle = '#7fd0ff'; g.beginPath(); g.moveTo(h * 0.5, h * 0.22); g.quadraticCurveTo(h * 0.75, h * 0.55, h * 0.5, h * 0.75); g.quadraticCurveTo(h * 0.25, h * 0.55, h * 0.5, h * 0.22); g.fill(); fitText(g, 'DEEPTHIRST', w * 0.58, h * 0.4, w * 0.74, 150, SANS, '#1a1d29', { lines: 1 }); fitText(g, 'TRAINING HALL 9', w * 0.58, h * 0.8, w * 0.7, 52, SANS, '#1f6bff', { lines: 1 }); });
    atlas.place(s, [HB.x0 + 1.55, y0 + 3.9, 0], -Math.PI / 2, 33, 7.1);
  }
  const counter = ledSign(THREE, group, 1024, 200, [HB.x0 - 0.45, HB.door + 2.4, -0.3], -Math.PI / 2, 20, 3.9);

  /* the leaking pipe inside, with a mop and bucket under the drip */
  const drip = { x: 161.6, y: 5.6, z: -118 };
  { const mb = D.mopBucket(); sc.place(mb, drip.x, drip.z, { y: FY, yaw: Math.PI / 2 }); bake.add(mb, false); }
  {
    const pud = new Quads(); pud.quad([drip.x - 1.2, FY + 0.02, drip.z + 1.0], [drip.x + 0.8, FY + 0.02, drip.z + 1.0], [drip.x + 0.8, FY + 0.02, drip.z - 1.4], [drip.x - 1.2, FY + 0.02, drip.z - 1.4]);
    bake.geo(new THREE.MeshStandardMaterial({ color: 0x9fb4c8, roughness: 0.05, metalness: 0.4, transparent: true, opacity: 0.55, depthWrite: false }), pud.geometry(THREE), false);
    const s = atlas.add(256, 80, signDraw('WET FLOOR', { bg: '#ffc928', fg: '#1a1d29', font: SANS, size: 50, lines: 1 }));
    atlas.place(s, [drip.x + 0.75, FY + 0.95, drip.z + 0.4], Math.PI / 2, 1.0, 0.31);
  }

  // the gallons counter ticks, the LEDs blink, the leak drips
  let gal = 1284553120, blink = 0, frame = 0, shownGal = -1, tick = 0;
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
    void time;
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

/* ---------- the dam and the reservoir ---------- */
function reservoir({ THREE, track, ctx, sc, rng, bake, atlas, at, samples, view }) {
  const group = ctx.group, crest = samples(CREST[0] - 0.15, CREST[1] + 0.15, 3), bottom = -9;
  const levels = lap => lerp(LAKE.full, LAKE.low, clamp((lap - 1) / Math.max(1, (view.race?.laps ?? 3) - 1), 0, 1));

  /* the dam: a sheer upstream face (stained in rings as the water drops) and a sloping downstream face */
  const ring = [];
  for (const i of crest) {
    const top = track.py[i] - 1.05, dn = track.hwL[i] + 0.6, upw = -(track.hwR[i] + 0.6), foot = dn + (top - bottom) * 0.72;
    ring.push([[upw, top], [upw, bottom], [foot, bottom], [dn + 1.5, top - 2], [dn, top]].map(([l, y]) => { const p = at(i, l); return [p.x, y, p.z]; }));
  }
  const face = new Quads(), body = new Quads();
  let run = 0;
  for (let r = 0; r < ring.length - 1; r++) {
    const A = ring[r], B = ring[r + 1], seg = Math.hypot(B[0][0] - A[0][0], B[0][2] - A[0][2]);
    const vy = y => (y - bottom) / 30;
    face.quad(A[1], B[1], B[0], A[0], [[run / 10, vy(A[1][1])], [(run + seg) / 10, vy(B[1][1])], [(run + seg) / 10, vy(B[0][1])], [run / 10, vy(A[0][1])]]);
    for (const k of [1, 2, 3]) body.quad(A[k + 1], B[k + 1], B[k], A[k]);
    run += seg;
  }
  const tubTex = canvasTexture(THREE, 256, 1024, (g, w, h) => {
    const Y = y => (1 - (y - bottom) / 30) * h, r = makeRng(9);
    g.fillStyle = '#c9c6bd'; g.fillRect(0, 0, w, h);
    for (let y = 0; y < h; y += 64) { g.fillStyle = 'rgba(0,0,0,0.06)'; g.fillRect(0, y, w, 2); }
    const gr = g.createLinearGradient(0, Y(LAKE.full), 0, Y(-1)); gr.addColorStop(0, '#8d8a6c'); gr.addColorStop(0.35, '#77715a'); gr.addColorStop(1, '#4e4535');
    g.fillStyle = gr; g.fillRect(0, Y(LAKE.full), w, h - Y(LAKE.full));
    for (let k = 0; k < 40; k++) { const x = r() * w, y0 = Y(LAKE.full + 0.2), len = 30 + r() * 220; g.fillStyle = `rgba(60,55,40,${0.15 + r() * 0.2})`; g.fillRect(x, y0, 2 + r() * 4, len); }
    g.fillStyle = '#f2ede0'; g.fillRect(0, Y(LAKE.full + 1.0), w, Y(LAKE.full - 0.2) - Y(LAKE.full + 1.0));
    g.fillStyle = '#5f6b3e'; g.fillRect(0, Y(LAKE.full - 0.2), w, 10);
    const mid = lerp(LAKE.full, LAKE.low, 0.5);
    g.fillStyle = '#d9d2bf'; g.fillRect(0, Y(mid + 0.5), w, Y(mid) - Y(mid + 0.5));
    g.fillStyle = '#c8bfa8'; g.fillRect(0, Y(LAKE.low + 0.5), w, Y(LAKE.low) - Y(LAKE.low + 0.5));
  }, { repeat: true });
  tubTex.wrapT = THREE.ClampToEdgeWrapping;
  bake.geo(new THREE.MeshStandardMaterial({ map: tubTex, roughness: 0.92, side: THREE.DoubleSide }), face.geometry(THREE), false);
  const bg = body.geometry(THREE); bake.geo(new THREE.MeshStandardMaterial({ color: 0xb8b6ae, roughness: 0.92, side: THREE.DoubleSide }), bg, true);
  // spillway chutes on the downstream face (dry, naturally)
  {
    const ch = new ModelBuilder(), n = crest.length;
    crest.forEach((i, r) => {
      if (!(r > n * 0.38 && r < n * 0.62 && r % 2 === 0)) return;
      const top = track.py[i] - 1.05, dn = track.hwL[i] + 0.6, p0 = at(i, dn + 1.6), p1 = at(i, dn + 1.6 + (top - 2) * 0.72);
      ch.add('c', new THREE.TubeGeometry(new THREE.CatmullRomCurve3([new THREE.Vector3(p0.x, top - 2, p0.z), new THREE.Vector3(p1.x, 0.4, p1.z)]), 4, 0.9, 6));
    });
    bake.builder(ch, { c: plastic(0x8f8c84, 0.9) }, false);
  }

  /* the water: its own surface, shaped to the basin, sinking a third per lap */
  const shape = new THREE.Shape(), pts = [];
  for (let v = -0.03; v <= 1.0001; v += 0.02) { const w = Math.max(0, (v - 0.42) / 0.58), um = Math.sqrt(Math.max(0, 0.985 ** 2 - w * w)); pts.push([LAKE.cx - um * lakeRx(Math.max(0, v)), LAKE.zDam - v * LAKE.len]); }
  for (let v = 1.0; v >= -0.0301; v -= 0.02) { const w = Math.max(0, (v - 0.42) / 0.58), um = Math.sqrt(Math.max(0, 0.985 ** 2 - w * w)); pts.push([LAKE.cx + um * lakeRx(Math.max(0, v)), LAKE.zDam - v * LAKE.len]); }
  pts.forEach(([x, z], k) => k ? shape.lineTo(x, -z) : shape.moveTo(x, -z));
  const wg = new THREE.ShapeGeometry(shape, 4); wg.rotateX(-Math.PI / 2);
  const waterMat = new THREE.MeshStandardMaterial({ color: 0x2f86c8, roughness: 0.12, metalness: 0.15, transparent: true, opacity: 0.9, envMapIntensity: 1.3, depthWrite: true });
  const water = new THREE.Mesh(wg, waterMat); water.position.y = LAKE.full; water.receiveShadow = true; water.renderOrder = 1; group.add(water);
  const cFull = new THREE.Color(0x2f86c8), cLow = new THREE.Color(0x6b6a48);

  /* the exposed bed: a crack pattern draped over the terrain, fading out above the old shoreline */
  {
    const gr = track.grid, q = new Quads(true), ix0 = Math.max(0, Math.floor((-200 - gr.x0) / gr.cell)), ix1 = Math.min(gr.nx - 1, Math.ceil((170 - gr.x0) / gr.cell));
    const iz0 = Math.max(0, Math.floor((-570 - gr.z0) / gr.cell)), iz1 = Math.min(gr.nz - 1, Math.ceil((LAKE.zDam - gr.z0) / gr.cell));
    const Hh = (ix, iz) => gr.H[iz * gr.nx + ix];
    const alpha = h => 1 - smoothstep(LAKE.full + 0.2, LAKE.full + 1.2, h);
    for (let iz = iz0; iz < iz1; iz++) for (let ix = ix0; ix < ix1; ix++) {
      const x = gr.x0 + ix * gr.cell, z = gr.z0 + iz * gr.cell;
      if (lakeE(x + gr.cell / 2, z + gr.cell / 2) > 1.02) continue;
      const hs = [Hh(ix, iz + 1), Hh(ix + 1, iz + 1), Hh(ix + 1, iz), Hh(ix, iz)];
      if (Math.min(...hs) > LAKE.full + 1.2) continue;
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
        d[k] = cr ? 40 : 230; d[k + 1] = cr ? 30 : 205; d[k + 2] = cr ? 20 : 160; d[k + 3] = cr ? Math.round(235 * cr) : Math.round(40 * Math.min(1, Math.sqrt(a) / 30));
      }
      g.putImageData(img, 0, 0);
    }, { repeat: true });
    const m = new THREE.Mesh(q.geometry(THREE), new THREE.MeshStandardMaterial({ map: crack, vertexColors: true, transparent: true, depthWrite: false, roughness: 1, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -2 }));
    m.matrixAutoUpdate = false; m.renderOrder = 0; group.add(m);
  }

  /* the pipes: three fat blue straws from the lake bed, over the crest on a gantry, down the dam, across the campus into the halls */
  const pipeMat = plastic(0x2f6fc0, 0.42, 0.25), routes = [];
  const tail = [
    [[14, 3.3, -252], [16, 3.3, -247], [20, 3.3, -245], [27.5, 3.3, -245]],
    [[8, 3.3, -182], [10, 3.3, -177], [14, 3.3, -175], [28.5, 3.3, -175]],
    [[2, 3.3, -125], [4, 3.3, -120], [8, 3.3, -118], [90, 3.3, -118], [96, 5.5, -118], [101, 7.5, -118], [188, 7.5, -118]],
  ];
  PIPE_X.forEach((x, k) => {
    const head = [[x, 1.7, -414], [x, 2.0, -398], [x, 6, -373], [x, 16, -353], [x, 25.5, -347], [x, 27.6, -340], [x, 27.6, -329], [x, 25.6, -322.5], [x, 16, -316], [x, 6.5, -307], [x, 3.5, -298], [x, 3.3, -285]];
    const p = [...head, ...tail[2 - k]].map(a => new THREE.Vector3(a[0], a[1], a[2]));
    routes.push(new THREE.CatmullRomCurve3(p, false, 'centripetal'));
  });
  const pb = new ModelBuilder(), sup = new ModelBuilder();
  routes.forEach((curve, k) => {
    const len = curve.getLength();
    pb.add('pipe', new THREE.TubeGeometry(curve, Math.round(len / 2.2), 2.0, 14, false));
    for (let s = 6; s < len - 2; s += 12) {
      const t = s / len, p = curve.getPointAt(t), tg = curve.getTangentAt(t);
      const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), tg), e = new THREE.Euler().setFromQuaternion(q);
      pb.add('flange', new THREE.TorusGeometry(2.08, 0.22, 5, 18), { p: [p.x, p.y, p.z], r: [e.x, e.y, e.z] });
      // concrete saddles where the pipe runs low over the ground
      const gy = sc.y(p.x, p.z);
      if (p.y - 2 - gy < 7 && p.y - 2 - gy > -0.5 && !inBox(p.x, p.z) && p.z > LAKE.zDam + 2) sup.add('s', box(3.4, p.y - 1.6 - gy + 0.5, 2.2, 0.15, 1), { p: [p.x, gy + (p.y - 1.6 - gy + 0.5) / 2 - 0.4, p.z], r: [0, Math.atan2(tg.x, tg.z), 0] });
    }
    const m = D.intake(2.0); m.position.copy(curve.getPointAt(0)); m.lookAt(curve.getPointAt(0).clone().sub(curve.getTangentAt(0))); group.add(m); bake.add(m, false);
    void k;
  });
  bake.builder(pb, { pipe: pipeMat, flange: plastic(0x24569a, 0.45, 0.3) }, true);
  bake.builder(sup, { s: plastic(0xb4b8bc, 0.9) }, false);
  // the gantry carrying them over the road: two portal frames, and the reservoir gauge on top
  const iG = (() => { let best = 0, bd = 1e9; for (const i of crest) { const d = Math.abs(track.px[i] - 8); if (d < bd) { bd = d; best = i; } } return best; })();
  {
    const gb = new ModelBuilder(), zc = track.pz[iG];
    for (const z of [-347.4, -321.2]) {
      for (const x of [-3.5, 19.5]) { const gy = Math.min(sc.y(x, z), z < -340 ? 4 : 11); gb.add('leg', box(1.4, 26 - gy, 1.4, 0.15, 1), { p: [x, gy + (26 - gy) / 2 - 0.5, z] }); }
      gb.add('beam', box(25, 1.4, 1.8, 0.15, 1), { p: [8, 25.1, z] });
    }
    for (const x of [-3.5, 19.5]) gb.add('beam', box(1.0, 1.0, 26.2, 0.1, 1), { p: [x, 25.6, -334.3] });
    for (const z of [zc - 8.3, zc + 8.3]) gb.add('leg', box(0.6, 6.4, 0.6, 0.1, 1), { p: [8, 32.2, z] });
    gb.add('beam', box(0.9, 0.6, 17.4, 0.1, 1), { p: [8, 29.3, zc] });
    bake.builder(gb, { leg: plastic(0xd8dbe0, 0.5, 0.4), beam: plastic(0xffc928, 0.5) }, true);
  }
  const yawE = Math.atan2(-track.tx[iG], -track.tz[iG]);   // faces drivers coming along the crest
  const gauge = ledSign(THREE, group, 768, 384, [8 + Math.sin(yawE) * 0.4, 32.6, track.pz[iG] + Math.cos(yawE) * 0.4], yawE, 15, 7.5);
  {
    const s = atlas.add(768, 120, signDraw('H₂O → GPU', { bg: '#ffc928', fg: '#1a1d29', font: SANS, size: 80, lines: 1 }));
    atlas.place(s, [16.5, 27.6, track.pz[iG]], yawE, 11, 1.72);
  }

  /* pumps at the foot of the dam, gulping */
  const pumpParts = partsOf(D.pumpUnit()), pumpAt = PIPE_X.map((x, k) => ({ x, y: 0, z: -294 + k * 13 }));
  pumpAt.forEach(p => { p.y = sc.y(p.x, p.z) - 0.1; });
  const pumps = sc.instances(pumpParts, pumpAt.map(p => ({ ...p, yaw: 0 })), { cast: true });
  // bulges travelling down each pipe: water on its way to the GPUs
  const bulge = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 16, 10), pipeMat, routes.length * 6); bulge.frustumCulled = false; group.add(bulge);
  const routeLen = routes.map(c => c.getLength());

  /* whirlpools over the intakes, and a foam ring round each: they ride the surface down */
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
  const swirls = new THREE.InstancedMesh(disc, swirlMat, routes.length), foams = new THREE.InstancedMesh(disc, foamMat, routes.length);
  for (const m of [swirls, foams]) { m.frustumCulled = false; m.renderOrder = 3; group.add(m); }
  const intakes = routes.map(c => { const p = c.getPointAt(0); return { x: p.x, z: p.z - 3, bed: track.terrainHeight(p.x, p.z - 3) }; });

  /* the shore: a dock that ends in mid-air, a lifeguard chair, boats that settle on the mud, signs */
  { const d = D.dock(32, 18); sc.place(d, 61, -371, { yaw: -Math.PI / 2, y: LAKE.full + 0.9 }); bake.add(d, true); }
  { const c = D.lifeguardChair(); sc.place(c, 92, -392, { yaw: -Math.PI / 2 - 0.3 }); bake.add(c, true); }
  {
    const s = atlas.add(384, 192, signDraw('LIFEGUARD ON BREAK (FOREVER)', { bg: '#e23b3b', fg: '#ffffff', font: SANS, size: 60 }));
    atlas.place(s, [91.5, sc.y(91.5, -387.5) + 2.2, -387.5], -Math.PI / 2, 2.4, 1.2);
    const pb2 = new ModelBuilder(); pb2.add('p', cyl(0.08, 0.08, 2, 5), { p: [91.6, sc.y(91.6, -387.5) + 0.5, -387.5] }); bake.builder(pb2, { p: plastic(0xd9c9a8, 0.8) }, false);
  }
  const boatSpots = [[-32, -382, 0.7], [22, -412, -2.2], [-62, -432, 2.4], [6, -366, -0.4], [-12, -455, 1.1]];
  const boats = boatSpots.map(([x, z, yaw]) => ({ x, z, yaw, bed: track.terrainHeight(x, z), tilt: [rng.range(-0.25, 0.25), rng.range(-0.18, 0.18)] }));
  const boatMeshes = sc.instances(partsOf(D.boat()), boats.map(b => ({ x: b.x, y: LAKE.full, z: b.z, yaw: b.yaw })), { tints: [0xffffff, 0xffd23c, 0xffffff, 0xe23b3b, 0xffffff], cast: false });
  for (const m of boatMeshes) m.frustumCulled = false;
  const E = new THREE.Euler();
  // NO SWIMMING on the lake side of the crest, facing the drivers
  {
    const i = track.indexAtCp(9.0), p = at(i, -(track.hwR[i] + 1.1)), yaw = Math.atan2(-track.tx[i], -track.tz[i]) - 0.35;
    const s = atlas.add(512, 320, (g, w, h) => { g.fillStyle = '#ffffff'; g.fillRect(0, 0, w, h); g.strokeStyle = '#e23b3b'; g.lineWidth = 16; g.strokeRect(8, 8, w - 16, h - 16); fitText(g, 'NO SWIMMING', w / 2, h * 0.36, w - 70, 92, SANS, '#e23b3b', { lines: 1 }); fitText(g, '(SOON: NO WATER)', w / 2, h * 0.7, w - 90, 56, SANS, '#1a1d29', { lines: 1 }); });
    atlas.place(s, [p.x, track.py[i] + 2.6, p.z], yaw, 4.2, 2.6);
    const pb3 = new ModelBuilder(); for (const o of [-1.6, 1.6]) pb3.add('p', cyl(0.1, 0.1, 2.4, 6), { p: [p.x + Math.cos(yaw) * o, track.py[i] + 0.6, p.z - Math.sin(yaw) * o] }); bake.builder(pb3, { p: plastic(0x8a929e, 0.5, 0.5) }, false);
  }
  // the protest, on the bank by the east end of the dam
  {
    const people = [], q = PROTEST.slice(), sticks = [];
    for (let k = 0; k < 9; k++) {
      const cp = 8.18 + k * 0.05, i = track.indexAtCp(cp), lat = -(track.hwR[i] + 3.2 + (k % 3) * 1.6 + rng() * 0.6), p = at(i, lat);
      const yaw = Math.atan2(track.lx[i], track.lz[i]) + rng.range(-0.3, 0.3), y = sc.y(p.x, p.z);
      people.push({ x: p.x, y, z: p.z, yaw });
      sticks.push({ x: p.x + Math.cos(yaw) * 0.3 + Math.sin(yaw) * 0.3, y: y + 2.9, z: p.z - Math.sin(yaw) * 0.3 + Math.cos(yaw) * 0.3, yaw, text: q[k % q.length] });
    }
    sc.instances(partsOf(D.protester()), people, { tints: P.CROWD_TINTS, cast: false });
    sticks.forEach((s, k) => {
      const r = atlas.add(320, 200, signDraw(s.text, { bg: ['#ffffff', '#ffd23c', '#7fd0ff', '#ff9ab0'][k % 4], fg: '#1a1d29', size: 64, border: '#1a1d29' }));
      atlas.place(r, [s.x, s.y + 0.1, s.z], s.yaw, 1.5, 0.94);
    });
  }

  // update: level from the leader's lap, eased; boats settle; the gauge and the bulges
  const st = { level: LAKE.full, lap: 1, pct: 100, shown: -1, t: 0 };
  view.dcLake = st;
  const Yax = new THREE.Vector3(0, 1, 0), Mx = new THREE.Matrix4(), Q = new THREE.Quaternion(), S = new THREE.Vector3(), Pp = new THREE.Vector3(), Z = new THREE.Vector3(0, 0, 1), C = new THREE.Color();
  function update(dt, time) {
    const race = view.race, laps = race?.laps ?? 3;
    let lap = 1; if (race?.karts) for (const k of race.karts) if (Number.isFinite(k.lap)) lap = Math.max(lap, Math.min(k.lap, laps + 1));
    st.lap = Math.min(lap, laps);
    const target = lap > laps ? LAKE.low - 0.6 : levels(lap);
    const d = target - st.level; st.level += clamp(d * (1 - Math.exp(-dt * 0.8)), -dt * 3, dt * 3);
    if (!(st.level > -5 && st.level < 30)) st.level = LAKE.full;
    water.position.y = st.level;
    const f = clamp((LAKE.full - st.level) / (LAKE.full - LAKE.low), 0, 1);
    waterMat.color.copy(cFull).lerp(cLow, f * 0.55);
    st.pct = Math.round(clamp((st.level - 0.6) / (LAKE.full - 0.6), 0, 1) * 100);
    boats.forEach((b, k) => {
      const grounded = clamp((b.bed + 0.4 - st.level) / 1.2, 0, 1), y = Math.max(st.level, b.bed + 0.4) - 0.35;
      E.set(b.tilt[0] * grounded, b.yaw, b.tilt[1] * grounded + (1 - grounded) * Math.sin(time + b.z) * 0.03); Q.setFromEuler(E);
      Mx.compose(Pp.set(b.x, y + (1 - grounded) * Math.sin(time * 1.3 + b.x) * 0.08, b.z), Q, S.set(1, 1, 1));
      for (const m of boatMeshes) m.setMatrixAt(k, Mx);
    });
    for (const m of boatMeshes) m.instanceMatrix.needsUpdate = true;
    // gulps: pumps throb, bulges travel faster as the lake runs out
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
    // whirlpools spin faster as the lake runs out; spray where the pipes cross the gantry
    intakes.forEach((w, k) => {
      const show = st.level > w.bed + 0.3 ? 1 : 0.001, spin = time * (1.4 + st.lap * 0.6) + k;
      Mx.compose(Pp.set(w.x, st.level + 0.08, w.z), Q.setFromAxisAngle(Yax, -spin), S.set(10 * show, 1, 10 * show)); swirls.setMatrixAt(k, Mx);
      const f = (12 + Math.sin(time * 3 + k * 2) * 1.2) * show;
      Mx.compose(Pp.set(w.x, st.level + 0.12, w.z), Q.setFromAxisAngle(Yax, spin * 0.3), S.set(f, 1, f)); foams.setMatrixAt(k, Mx);
    });
    swirls.instanceMatrix.needsUpdate = true; foams.instanceMatrix.needsUpdate = true;
    for (let k = 0, n = view.fx.count(10, dt); k < n; k++) {
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
  const nearPipe = (x, z, m) => {
    for (const c of tailSegs) { const [ax, az, bx, bz] = c, dx = bx - ax, dz = bz - az, t = clamp(((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz || 1), 0, 1); if (Math.hypot(x - ax - dx * t, z - az - dz * t) < m + 2) return true; }
    return false;
  };
  const tailSegs = [];
  PIPE_X.forEach((x, k) => { const pts = [[x, -414], [x, -285], ...tail[2 - k].map(a => [a[0], a[2]])]; for (let j = 0; j < pts.length - 1; j++) tailSegs.push([pts[j][0], pts[j][1], pts[j + 1][0], pts[j + 1][1]]); });
  void C;
  return { update, nearPipe };
}
const inBox = (x, z) => x > HB.x0 - 1 && x < HB.x1 + 1 && z > HB.z0 - 1 && z < HB.z1 + 1;
