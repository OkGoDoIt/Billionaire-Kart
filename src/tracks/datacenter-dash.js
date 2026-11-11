/* Datacenter Dash: the finale of the first cup. A hyperscale AI campus at night
   in a pine valley below a hydro dam. A neon main drag between two server halls,
   a long drift through the inside of a hall lined with racks, a jump over the
   glowing coolant pond, a climb onto the dam crest, and a switchback run back
   down past the transformer yard. */
import { fbm, smoothstep } from '../core/util.js';
import { Scenery, partsOf } from '../render/scenery.js';
import { makeGroundHit, EDGE } from '../track/track.js';
import { ModelBuilder, box, plastic, glow } from '../models/build.js';
import * as P from '../models/props.js';
import * as D from '../models/props-datacenter-dash.js';
import { bannerTexture, canvasTex } from '../render/textures.js';

const POND = { x: 182, z: -208, rx: 62, rz: 78 };
const LAKE = { x: -5, z: -430, rx: 200, rz: 190 };       // the reservoir behind the dam
const VALLEY = { x: 20, z: -140, rx: 255, rz: 215 };      // flat campus floor
const YARD = { x0: -112, x1: -22, z0: -224, z1: -180 };      // transformer yard between the switchback legs
/* Server halls on the campus (centre, yaw, length, width, height, accent, sign). The ground around each is paved. */
const HALLS = [
  { x: 30, z: -88, yaw: 0, L: 92, W: 26, H: 15, c: 0x35e0ff, label: 'CLUSTER C' },
  { x: 100, z: -150, yaw: Math.PI / 2, L: 70, W: 24, H: 13, c: 0xff3df0, label: null },
  { x: 36, z: -170, yaw: 0, L: 70, W: 24, H: 14, c: 0x35e0ff, label: 'CLUSTER D' },
  { x: 46, z: -252, yaw: 0, L: 70, W: 24, H: 13, c: 0xff3df0, label: 'CLUSTER E' },
  { x: 255, z: -55, yaw: Math.PI / 2, L: 84, W: 26, H: 15, c: 0xff3df0, label: 'CLUSTER F' },
  { x: 250, z: 70, yaw: 0.0, L: 70, W: 24, H: 13, c: 0x35e0ff, label: null },
  { x: -225, z: 55, yaw: -0.5, L: 64, W: 24, H: 13, c: 0x35e0ff, label: null },
];
/** Local (u along the hall, v across it) coordinates of a point relative to a hall. */
const hallUV = (h, x, z) => { const dx = x - h.x, dz = z - h.z, c = Math.cos(h.yaw), s = Math.sin(h.yaw); return [dx * c - dz * s, dx * s + dz * c]; };

function height(x, z) {
  // the valley floor, then pine slopes rising all round it
  const e = Math.hypot((x - VALLEY.x) / VALLEY.rx, (z - VALLEY.z) / VALLEY.rz);
  let h = 0.35 + (fbm(x * 0.03, z * 0.03, 2, 3) - 0.5) * 0.5;
  h += smoothstep(0.92, 1.55, e) * (34 + (fbm(x * 0.006, z * 0.006, 4, 17) - 0.4) * 40);
  h += smoothstep(1.4, 2.4, e) * (30 + fbm(x * 0.004, z * 0.004, 3, 5) * 30);
  h += (fbm(x * 0.02, z * 0.02, 3, 9) - 0.5) * 6 * smoothstep(0.95, 1.3, e);
  // the reservoir: a lake behind the dam at the same water level as the pond
  const lake = smoothstep(-344, -360, z) * (1 - smoothstep(LAKE.rx * 0.55, LAKE.rx, Math.abs(x - LAKE.x))) * (1 - smoothstep(LAKE.z - LAKE.rz * 0.6, LAKE.z - LAKE.rz, z));
  h = h * (1 - lake) + -7 * lake;
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
  laps: 3,
  width: 17,
  sky: 'night',
  skyOverrides: { hemiIntensity: 1.75, hemiSky: 0x5f8ad6, hemiGround: 0x2f5e4c, sunIntensity: 1.8, exposure: 1.2, fog: 0x1e2a5e, fogNear: 160, fogFar: 950 },
  backdrop: { img: 'assets/backdrops/datacenter-dash.webp', top: 22, bottom: -8, rot: 0.2 },
  offroad: 'grass',
  defaults: { edge: 'open', shoulder: 3.5, outer: 11 },
  tunnelHeight: 12,
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
  ],
  tunnels: [{ from: 1.15, to: 4.0 }],
  bridges: [{ from: 4.0, to: 6.0 }, { from: 8.8, to: 10.9 }],
  zones: [
    { from: 22.7, to: 4.0, skin: 'neon' },
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
    color(x, z, h, slope, over, out) {                       // gravel in the transformer yard
      const k = (1 - smoothstep(0, 8, Math.max(YARD.x0 - x, x - YARD.x1, 0))) * (1 - smoothstep(0, 8, Math.max(YARD.z0 - z, z - YARD.z1, 0)));
      out[0] += (0.052 - out[0]) * k; out[1] += (0.058 - out[1]) * k; out[2] += (0.07 - out[2]) * k;
      for (const hl of HALLS) {                              // paved aprons around the halls
        const [u, v] = hallUV(hl, x, z), d = Math.max(Math.abs(u) - hl.L / 2 - 12, Math.abs(v) - hl.W / 2 - 12);
        if (d < 3) { const a = 1 - smoothstep(0, 3, d); out[0] += (0.028 - out[0]) * a; out[1] += (0.032 - out[1]) * a; out[2] += (0.042 - out[2]) * a; }
      }
    },
  },
  look: {
    road: { base: 0x4a5160, line: 0xdfe8ff, center: 0x35e0ff, glow: 0x35e0ff },
    kerb: [0x35e0ff, 0x1a2140],
    shoulder: 0x4a5568,
    terrain: { low: 0x1f4a3a, high: 0x2c6048, dry: 0x35584a, rock: 0x4a5568, sand: 0x4a5568, dirt: 0x3a4654 },
    wall: 0x2a3348, wallStripe: 0x35e0ff, water: 0x18d6c8, deck: 0x4a5568, rail: 0x35e0ff,
    tunnelLight: 0x35e0ff, portal: 0x1b2233,
    ads: ['NOW TRAINING ON YOU', 'GPU GO BRRR', 'COMPUTE IS THE NEW OIL', 'TOKENS PER SECOND', 'WE ARE OUT OF GPUS', 'HALLUCINATION FREE*', 'STOCHASTIC PARROT FEED', 'ATTENTION IS ALL YOU NEED', 'OVERFIT AND PROUD', 'LIQUID COOLED EGO', 'ROBOTS.TXT IGNORED', 'INFERENCE AT THE EDGE', 'SCALING LAWS APPLY', 'PROMPT RESPONSIBLY'],
  },
  POND, LAKE,

  /** Dress the course. ctx: { THREE, track, group, gfx, anim, view } */
  decorate(ctx) { decorate(ctx); },
};

const TUNNEL = [1.05, 4.0], CREST = [8.8, 10.9];
const TOWERS = [{ x: 252, z: -168 }, { x: 106, z: -262 }];
const ADS = ['NOW TRAINING ON YOU', 'GPU GO BRRR', 'COMPUTE IS THE NEW OIL', 'WE ARE OUT OF GPUS', 'HALLUCINATION FREE*', 'LIQUID COOLED EGO', 'ROBOTS.TXT IGNORED', 'INFERENCE AT THE EDGE'];

function decorate(ctx) {
  const { THREE, track, anim, view } = ctx, sc = new Scenery(ctx), rng = sc.rng;
  const hit = makeGroundHit(), W = track.water;
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
  const M = new THREE.Matrix4(), V = new THREE.Vector3(), X = new THREE.Vector3(), Y = new THREE.Vector3(), Z = new THREE.Vector3();
  /** Instance parts with full matrices (for things that follow the road's banking). */
  const instM = (parts, mats) => { for (const part of parts) { const im = new THREE.InstancedMesh(part.geometry, part.material, mats.length); mats.forEach((m, k) => im.setMatrixAt(k, m)); im.instanceMatrix.needsUpdate = true; im.computeBoundingSphere(); ctx.group.add(im); } };

  // ---- start/finish: gantry, a hall either side of the main drag, grandstands on the south side ----
  const g0 = sc.beside(0, 1, -track.hwL[0]);
  const gantry = P.gantry(track.hwL[0] + track.hwR[0] + 1.5, 'DATACENTER DASH', { color: 0x2a3a8f, color2: 0x35e0ff });
  sc.place(gantry, g0.x, g0.z, { yaw: g0.along, y: g0.roadY });
  view.startLights = gantry.userData.lights;
  const stand = P.grandstand({ w: 30, rows: 6, color: 0x2a3a8f }), stand2 = P.grandstand({ w: 30, rows: 6, color: 0x7a2a8f });
  const seats = [];
  const putStand = (proto, p) => {
    const g = proto.group.clone(); sc.place(g, p.x, p.z, { yaw: p.yaw, y: track.py[p.i] - 0.2 });
    g.updateMatrixWorld(true); M.copy(g.matrixWorld);
    for (const s of proto.seats) if (rng() < 0.82) { V.set(s[0], s[1], s[2]).applyMatrix4(M); seats.push({ x: V.x, y: V.y, z: V.z, yaw: p.yaw + rng.range(-0.4, 0.4) }); }
  };
  sc.along({ from: 22.95, to: 0.85, side: -1, offset: 6.5, spacing: 33 }).forEach((p, i) => putStand(i % 2 ? stand2 : stand, p));
  sc.instances(partsOf(P.spectator()), seats, { scale: [0.95, 1.2], tints: P.CROWD_TINTS, cast: false });
  {
    const n = sc.beside(23.75, 1, 17.5);
    sc.place(D.serverHall({ L: 118, W: 26, H: 15, accent: 0x35e0ff, label: 'CLUSTER A' }), n.x, n.z, { yaw: n.yaw, y: 0 });
    const s = sc.beside(23.85, -1, 37);
    sc.place(D.serverHall({ L: 128, W: 26, H: 16, accent: 0xff3df0, label: 'CLUSTER B' }), s.x, s.z, { yaw: s.yaw, y: 0 });
  }
  // light masts behind the stands and lamps along the walls of the main drag
  sc.instances(partsOf(D.floodMast({ h: 20 })), sc.along({ from: 22.8, to: 0.9, side: -1, offset: 21, spacing: 33, phase: 16 }), {});
  const lampParts = partsOf(D.streetLamp());
  const lamps = [
    ...sc.along({ from: 22.8, to: 1.0, side: 1, offset: 1.0, spacing: 18 }), ...sc.along({ from: 22.8, to: 1.0, side: -1, offset: 1.0, spacing: 18, phase: 9 }),
    ...sc.along({ from: 6.1, to: 8.8, side: 1, offset: 1.0, spacing: 20 }), ...sc.along({ from: 6.1, to: 8.8, side: -1, offset: 1.0, spacing: 20, phase: 10 }),
    ...sc.along({ from: 11.0, to: 22.6, side: 1, offset: 12.8, spacing: 22 }).filter(p => clear(p.x, p.z, 0.8)),
    ...sc.along({ from: 11.0, to: 22.6, side: -1, offset: 12.8, spacing: 22, phase: 11 }).filter(p => clear(p.x, p.z, 0.8)),
  ];
  // and along the dam crest, on the parapets
  for (const i of samples(CREST[0] + 0.05, CREST[1] - 0.05, 16)) for (const s of [1, -1]) { const hw = s > 0 ? track.hwL[i] : track.hwR[i], p = at(i, s * (hw + 0.9)); lamps.push({ x: p.x, y: track.py[i] - 0.1, z: p.z, yaw: Math.atan2(-s * track.lx[i], -s * track.lz[i]) }); }
  sc.instances(lampParts, lamps, { cast: false });

  // ---- the server hall over the tunnel: a curved building, racks inside ----
  serverHallShell(ctx, sc, at, samples);
  {
    const parts = partsOf(D.serverRack()), mats = [];
    for (const i of samples(TUNNEL[0] + 0.06, TUNNEL[1] - 0.06, 3)) for (const s of [1, -1]) {
      const hw = s > 0 ? track.hwL[i] : track.hwR[i], p = at(i, s * (hw + 0.82));
      Y.set(track.ux[i], track.uy[i], track.uz[i]); Z.set(-s * track.lx[i], -s * track.ly[i], -s * track.lz[i]); X.crossVectors(Y, Z);
      M.makeBasis(X, Y, Z); M.setPosition(p.x, p.y - 0.05, p.z); mats.push(M.clone());
    }
    instM(parts, mats);
  }

  // ---- the coolant pond: a teal glow on the water, cooling towers puffing steam ----
  {
    const tex = canvasTex(256, 256, (g, w, h) => { const gr = g.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2); gr.addColorStop(0, 'rgba(60,255,230,0.14)'); gr.addColorStop(0.6, 'rgba(30,220,200,0.07)'); gr.addColorStop(1, 'rgba(20,180,170,0)'); g.fillStyle = gr; g.fillRect(0, 0, w, h); }, { repeat: false });
    const m = new THREE.Mesh(new THREE.CircleGeometry(1, 48), new THREE.MeshBasicMaterial({ map: tex, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
    m.rotation.x = -Math.PI / 2; m.scale.set(POND.rx * 1.0, POND.rz * 1.0, 1); m.position.set(POND.x, W + 0.06, POND.z); m.renderOrder = 2; ctx.group.add(m);
    // underwater lights in rows across the pond
    const lights = [];
    for (let gx = -2; gx <= 2; gx++) for (let gz = -3; gz <= 3; gz++) { const x = POND.x + gx * 22 + (gz % 2) * 11, z = POND.z + gz * 20; if (track.terrainHeight(x, z) < W - 1 && Math.abs(x - 174) > 14) lights.push({ x, z, y: W - 0.15, yaw: 0 }); }
    const lb = new ModelBuilder(); lb.add('l', box(1.4, 0.1, 1.4, 0.04, 1), {});
    sc.instances(partsOf(lb.build({ l: glow(0x7dfff0, 2.2) })), lights, { cast: false });
  }
  const towers = TOWERS.map(t => { const tw = D.coolingTower({ H: 31 }); sc.place(tw, t.x, t.z, { y: Math.max(W - 0.4, sc.y(t.x, t.z)) - 0.3, yaw: rng() * 6 }); return { x: t.x, z: t.z, y: tw.position.y + tw.userData.top, r: tw.userData.rimR }; });
  anim.push((dt) => {
    for (const t of towers) for (let k = 0, n = view.fx.count(6, dt); k < n; k++) {
      const a = rng() * 6.28, rr = rng() * t.r * 0.7;
      view.fx.dust(t.x + Math.cos(a) * rr, t.y + 0.5, t.z + Math.sin(a) * rr, 4 + rng() * 3, 7 + rng() * 4, -1 + rng() * 2, [0.27, 0.32, 0.42], 8 + rng() * 5, 6 + rng() * 2, 0.2);
    }
  });

  // ---- the dam: concrete body under the crest, spillway chutes, the reservoir behind ----
  damBody(ctx, at, samples);
  {
    const ph = sc.beside(9.85, 1, 26);
    sc.place(D.serverHall({ L: 54, W: 16, H: 10, accent: 0x18d6c8, label: 'TURBINE HALL' }), ph.x, ph.z, { yaw: ph.yaw, y: sc.y(ph.x, ph.z) - 0.4 });
  }

  // ---- campus: more halls, dishes, masts ----
  const halls = HALLS;
  halls.forEach(h => sc.place(D.serverHall({ L: h.L, W: h.W, H: h.H, accent: h.c, label: h.label }), h.x, h.z, { yaw: h.yaw, y: sc.y(h.x, h.z) - 0.4 }));
  const inHall = (x, z, m = 6) => halls.some(h => { const [u, v] = hallUV(h, x, z); return Math.abs(u) < h.L / 2 + m && Math.abs(v) < h.W / 2 + m; });
  // backup generators along the back of each hall, and lamps around the aprons
  const gens = [], aprons = [];
  const toWorld = (h, u, v) => { const c = Math.cos(h.yaw), s = Math.sin(h.yaw); return { x: h.x + u * c + v * s, z: h.z - u * s + v * c }; };
  for (const h of halls) {
    for (let u = -h.L / 2 + 6; u <= h.L / 2 - 6; u += 8.5) { const p = toWorld(h, u, -(h.W / 2 + 5.5)); if (clear(p.x, p.z, 2)) gens.push({ ...p, y: sc.y(p.x, p.z), yaw: h.yaw }); }
    for (const [fu, fv] of [[-1, -1], [1, -1], [-1, 1], [1, 1], [0, 1], [0, -1]]) { const p = toWorld(h, fu * (h.L / 2 + 10), fv * (h.W / 2 + 10)); if (clear(p.x, p.z, 1.5)) aprons.push({ ...p, y: sc.y(p.x, p.z), yaw: h.yaw + (fv > 0 ? Math.PI : 0) }); }
  }
  sc.instances(partsOf(D.generator()), gens, {});
  sc.instances(lampParts, aprons, { cast: false });
  const dishes = [{ x: -62, z: -104, yaw: 0.3 }, { x: 130, z: -230, yaw: 1.2 }];
  dishes.forEach(d => sc.place(D.dishCluster({ seed: Math.round(d.x) }), d.x, d.z, { yaw: d.yaw, y: sc.y(d.x, d.z) - 0.2 }));

  // ---- the transformer yard between the switchback legs ----
  const yard = [];
  for (const [x, z] of [[-45, -216], [-45, -188], [-30, -207.5], [-30, -196.5], [-53, -202], [-60, -213], [-60, -191]]) yard.push({ x, z, y: sc.y(x, z), yaw: 0 });
  for (let gx = -104; gx <= -70; gx += 11) for (const z of [-214, -202, -190]) yard.push({ x: gx, z, y: sc.y(gx, z), yaw: 0 });
  sc.instances(partsOf(D.transformer()), yard, { solid: 2.3 });
  sc.instances(partsOf(D.floodMast({ h: 14 })), [{ x: -87.5, z: -196, yaw: 0.4 }, { x: -98.5, z: -208, yaw: 2.6 }, { x: -76.5, z: -208, yaw: -1.2 }].map(p => ({ ...p, y: sc.y(p.x, p.z) })), { solid: 0.6 });
  // pylons carrying power from the dam to the yard and on out of the valley
  const pyl = D.pylon({ h: 30 }), pylParts = partsOf(pyl), arms = pyl.userData.arms;
  const chains = [
    [[-12, -292], [-88, -202], [-212, -196], [-238, -84], [-232, 40], [-176, 128]],
    [[-120, 96], [-2, 104], [120, 100], [236, 132]],
  ];
  const wireMat = plastic(0x0c0e14, 0.6);
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
    ctx.group.add(wb.build({ w: wireMat }, { cast: false }));
  }

  // ---- pines over every slope, and a few on the campus edges ----
  const keep = (x, z) => !inHall(x, z) && !TOWERS.some(t => near(x, z, t, 22)) && !dishes.some(d => near(x, z, d, 16)) && !chains.flat().some(([px, pz]) => near(x, z, { x: px, z: pz }, 7));
  const pines = sc.scatter({ count: 520, min: 15, max: 230, maxSlope: 1.0, minGap: 4.5, where: (x, z, h) => h > 2.2 && keep(x, z) && clear(x, z, 1) });
  const pA = partsOf(D.pine(1, { h: 12 })), pB = partsOf(D.pine(2, { h: 15, colorA: 0x143826, colorB: 0x1c4a33 })), pC = partsOf(D.pine(3, { h: 9.5, colorA: 0x1a4430, colorB: 0x24573d }));
  sc.instances(pA, pines.filter((_, i) => i % 3 === 0), { scale: [0.8, 1.4], yaw: 'random', tilt: 0.03 });
  sc.instances(pB, pines.filter((_, i) => i % 3 === 1), { scale: [0.8, 1.5], yaw: 'random', tilt: 0.03 });
  sc.instances(pC, pines.filter((_, i) => i % 3 === 2), { scale: [0.8, 1.3], yaw: 'random', tilt: 0.03 });
  const edgePines = sc.scatter({ count: 90, min: 13, max: 60, maxSlope: 0.6, minGap: 6, where: (x, z, h) => h > 0.2 && keep(x, z) && clear(x, z, 1.5) && !(x > -70 && x < 130 && z > -300 && z < -40) });
  sc.instances(pC, edgePines, { scale: [0.7, 1.1], yaw: 'random' });

  // ---- corner boards, billboards, holographic boards ----
  for (const c of track.corners) {
    const side = c.dir > 0 ? -1 : 1, n = Math.max(2, Math.min(5, Math.round(c.len / 15)));
    for (let k = 0; k < n; k++) {
      const i = (c.i0 + Math.round(((k + 0.6) / n) * (c.len / track.ds))) % track.N;
      if (track.tunnel[i] || track.bridge[i]) continue;
      const edge = side > 0 ? track.edgeL[i] : track.edgeR[i];
      const p = sc.beside(track.cp[i], side, edge === EDGE.OPEN ? (side > 0 ? track.outerL[i] : track.outerR[i]) + 1.2 : 1.2);
      const b = P.chevronBoard(0xff3df0); if (c.dir > 0) b.scale.x = -1;
      sc.place(b, p.x, p.z, { yaw: p.yaw, lift: edge === EDGE.OPEN ? 0.9 : 0.4 }); if (c.dir > 0) b.scale.x = -1;
    }
  }
  [[6.6, -1, 16, 'TOKENS PER SECOND', 0x35e0ff, 0xff3df0], [12.3, -1, 16, 'ATTENTION IS ALL YOU NEED', 0xff3df0, 0x35e0ff], [16.0, 1, 16, 'OVERFIT AND PROUD', 0x3dff7a, 0x35e0ff],
    [19.6, 1, 15, 'STOCHASTIC PARROT FEED', 0x35e0ff, 0xffb020], [21.2, 1, 15, 'NOW TRAINING ON YOU', 0xff3df0, 0x35e0ff], [7.6, 1, 16, 'WE ARE OUT OF GPUS', 0xffb020, 0xff3df0]].forEach(([cp, side, off, text, c1, c2]) => {
    const p = sc.beside(cp, side, off); if (!clear(p.x, p.z, 0.5)) return;
    sc.place(D.holoBoard(text, { w: 15, h: 5, color: c1, color2: c2 }), p.x, p.z, { yaw: p.yaw + rng.range(-0.12, 0.12) });
  });
  [[1.0, 1, 30], [13.2, 1, 16], [18.9, -1, 16], [22.2, -1, 16]].forEach(([cp, side, off], i) => {
    const p = sc.beside(cp, side, off); if (!clear(p.x, p.z, 0.5)) return;
    const tex = bannerTexture([ADS[(i * 3 + 1) % ADS.length]], i + 21); tex.repeat.set(0.25, 1);
    sc.place(P.billboard(tex, { w: 15, h: 5, legs: 6, frame: 0x10141e }), p.x, p.z, { yaw: p.yaw + rng.range(-0.12, 0.12) });
  });

  // ---- the sky: a blimp and blinking drones over the campus ----
  const ship = P.blimp('NOW TRAINING ON YOU', { color: 0x1a2140, accent: 0x35e0ff }); ship.scale.setScalar(1.2); ctx.group.add(ship);
  const cx = track.bounds.cx, cz = track.bounds.cz;
  anim.push((dt, time) => { const a = time * 0.03; ship.position.set(cx + Math.cos(a) * 170, 82 + Math.sin(time * 0.3) * 2, cz + Math.sin(a) * 150); ship.rotation.y = -a; });
}

/** The building around the tunnel: louvred side walls, a roof, and a front with an arched opening at each end. */
function serverHallShell(ctx, sc, at, samples) {
  const { THREE, track } = ctx, b = new ModelBuilder(), H = (track.def.tunnelHeight ?? 7.5);
  const list = samples(TUNNEL[0], TUNNEL[1], 6), wall = 3.2, top = H + 4.2, gap = 1.1;
  for (const i of list) {
    const yaw = track.yaw[i], len = 9.5, y0 = track.py[i];
    for (const s of [1, -1]) {
      const hw = (s > 0 ? track.hwL[i] : track.hwR[i]) + 0.7 + gap, p = at(i, s * (hw + wall / 2));
      b.add('wall', box(wall, top + 0.5, len, 0.1, 1), { p: [p.x, y0 + top / 2 - 0.2, p.z], r: [0, yaw, 0] });
      for (let k = 0; k < 6; k++) { const q = at(i, s * (hw + wall + 0.1)); b.add('louvre', box(0.5, 0.24, len - 0.6, 0.04, 1), { p: [q.x, y0 + 3 + k * 1.15, q.z], r: [s * 0.5, yaw, 0] }); }
      const g = at(i, s * (hw + wall + 0.25)); b.add('glow', box(0.3, 0.3, len, 0.05, 1), { p: [g.x, y0 + top - 0.7, g.z], r: [0, yaw, 0] });
      const d = at(i, s * (hw + wall + 0.3)); b.add('dim', box(0.12, 0.12, len, 0.03, 1), { p: [d.x, y0 + 1.6, d.z], r: [0, yaw, 0] });
    }
    const hw = Math.max(track.hwL[i], track.hwR[i]) + 0.7 + gap + wall, c = at(i, (track.hwL[i] - track.hwR[i]) / 2);
    b.add('roof', box(hw * 2 + 0.6, top - H - 0.4, len, 0.1, 1), { p: [c.x, y0 + (top + H + 0.4) / 2, c.z], r: [0, yaw, 0] });
    if (list.indexOf(i) % 2 === 1) for (const s of [1, -1]) {
      const u = at(i, s * 5.5 + (track.hwL[i] - track.hwR[i]) / 2);
      b.add('unit', box(4.4, 1.5, 5.2, 0.3, 2), { p: [u.x, y0 + top + 0.9, u.z], r: [0, yaw, 0] });
      b.add('fan', box(3.2, 0.2, 3.2, 0.1, 1), { p: [u.x, y0 + top + 1.7, u.z], r: [0, yaw, 0] });
    }
  }
  // the fronts: a wall with an arch cut out, at both ends, plus a sign over the entrance
  for (const [cp, dir] of [[TUNNEL[0], -1], [TUNNEL[1], 1]]) {
    const i = track.indexAtCp(cp), hwL = track.hwL[i] + 0.7, hwR = track.hwR[i] + 0.7, mid = (hwL - hwR) / 2, half = (hwL + hwR) / 2;
    const outer = Math.max(hwL, hwR) + gap + wall, e = 2.2;
    const shape = new THREE.Shape(); shape.moveTo(-outer, -3); shape.lineTo(outer, -3); shape.lineTo(outer, top + 0.3); shape.lineTo(-outer, top + 0.3); shape.closePath();
    const hole = new THREE.Path(); hole.moveTo(mid + half + e, -1); hole.absellipse(mid, 0, half + e, H + e, 0, Math.PI, false); hole.lineTo(mid - half - e, -1); hole.closePath();
    shape.holes.push(hole);
    const geo = new THREE.ExtrudeGeometry(shape, { depth: 1.4, bevelEnabled: false, curveSegments: 20 });
    geo.translate(0, 0, -0.7);
    const p = at(i, 0), yaw = track.yaw[i] + (dir > 0 ? 0 : Math.PI), fx = track.tx[i] * dir * 0.9, fz = track.tz[i] * dir * 0.9;
    const front = new THREE.Mesh(geo, plastic(0x1a2232, 0.6, 0.2)); front.position.set(p.x + fx, track.py[i], p.z + fz); front.rotation.y = yaw; if (dir < 0) front.scale.x = -1; ctx.group.add(front);
    const fb = new ModelBuilder();
    fb.add('glow', box(outer * 2 + 0.4, 0.35, 0.35, 0.05, 1), { p: [0, top - 0.7, 0.9] });
    fb.add('glow2', box(0.35, top, 0.35, 0.05, 1), { p: [outer, top / 2, 0.9] }); fb.add('glow2', box(0.35, top, 0.35, 0.05, 1), { p: [-outer, top / 2, 0.9] });
    const f2 = fb.build({ glow: glow(0x35e0ff, 2.4), glow2: glow(0xff3df0, 2.0) }); f2.position.copy(front.position); f2.rotation.y = yaw; ctx.group.add(f2);
    if (dir < 0) {
      const sign = D.holoBoard('TRAINING HALL 9', { w: 16, h: 2.6, legs: 0, color: 0x35e0ff, color2: 0xff3df0 });
      sign.position.set(front.position.x + Math.sin(yaw) * 0.9, track.py[i] + H + 2.2, front.position.z + Math.cos(yaw) * 0.9); sign.rotation.y = yaw; ctx.group.add(sign);
    }
  }
  const mesh = b.build({ wall: plastic(0x182030, 0.6, 0.2), louvre: plastic(0x3a465c, 0.45, 0.5), glow: glow(0x35e0ff, 2.4), dim: glow(0x35e0ff, 0.9), roof: plastic(0x1e2636, 0.6, 0.2), unit: plastic(0x3a4256, 0.6, 0.3), fan: plastic(0x0e1018, 0.5) });
  ctx.group.add(mesh);
  void sc;
}

/** Concrete gravity dam under the crest: a sheer upstream face, a sloping downstream face with light rows and spillway chutes. */
function damBody(ctx, at, samples) {
  const { THREE, track } = ctx, list = samples(CREST[0] - 0.15, CREST[1] + 0.15, 3), bottom = -9;
  const pos = [], idx = [], light = new ModelBuilder();
  const ring = [];
  for (const i of list) {
    const top = track.py[i] - 1.05, dn = track.hwL[i] + 0.6, upw = -(track.hwR[i] + 0.6), foot = dn + (top - bottom) * 0.72;
    const pts = [[upw, top], [upw, bottom], [foot, bottom], [dn + 1.5, top - 2], [dn, top]];
    ring.push(pts.map(([l, y]) => { const p = at(i, l); return [p.x, y, p.z]; }));
  }
  for (let r = 0; r < ring.length; r++) for (const v of ring[r]) pos.push(...v);
  const K = 5;
  for (let r = 0; r < ring.length - 1; r++) for (let k = 0; k < K - 1; k++) { const a = r * K + k, b = a + 1, c = a + K, d = c + 1; idx.push(a, c, b, b, c, d); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
  const dam = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ color: 0x6c7686, roughness: 0.9, emissive: 0x141a26, emissiveIntensity: 0.5, side: THREE.DoubleSide }));
  dam.receiveShadow = true; ctx.group.add(dam);
  // light rows across the downstream face, and glowing spillway chutes in the middle
  const n = list.length;
  list.forEach((i, r) => {
    const top = track.py[i] - 1.05, dn = track.hwL[i] + 0.6;
    for (const f of [0.25, 0.55, 0.85]) { const y = top - (top - bottom) * f * 0.8, l = dn + 1.5 + (top - 2 - y) * 0.72 + 0.2, p = at(i, l); if (y > 0.5) light.add(r % 2 ? 'a' : 'b', box(0.5, 0.25, 0.5, 0.05, 1), { p: [p.x, y, p.z] }); }
    if (r > n * 0.38 && r < n * 0.62 && r % 2 === 0) {
      const p0 = at(i, dn + 1.6), p1 = at(i, dn + 1.6 + (top - 2) * 0.72);
      light.add('chute', new THREE.TubeGeometry(new THREE.CatmullRomCurve3([new THREE.Vector3(p0.x, top - 2, p0.z), new THREE.Vector3(p1.x, 0.4, p1.z)]), 4, 0.9, 6), {});
    }
  });
  ctx.group.add(light.build({ a: glow(0xffe6a8, 2.2), b: glow(0x35e0ff, 2.2), chute: glow(0x7dfff0, 1.4) }, { cast: false }));
}
