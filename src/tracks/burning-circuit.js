/* Burning Circuit: a billionaires' art festival on a dry lake bed at dusk.
   Esplanade start, a banked bowl around the Figure, a fire slalom into a jump
   through a ring of fire, a dune ridge, and a boardwalk over the camp. */
import { fbm, smoothstep } from '../core/util.js';
import { Scenery, partsOf } from '../render/scenery.js';
import { makeGroundHit, EDGE } from '../track/track.js';
import * as P from '../models/props.js';
import * as B from '../models/props-burning-circuit.js';
import { ModelBuilder, cyl, box, plastic, glow } from '../models/build.js';

const FIGURE = { x: 170, z: -46 };
const JETS = { x0: 100, x1: 186, z0: -292, z1: -100 };   // the private jet park east of the fire slalom
const inJets = (x, z, m = 0) => x > JETS.x0 - m && x < JETS.x1 + m && z > JETS.z0 - m && z < JETS.z1 + m;
const CENTRE = { x: 0, z: -205 };
const TEMPLE = { x: -22, z: -168 };

export default {
  id: 'burning-circuit',
  name: 'Burning Circuit',
  tagline: 'Radical self-reliance. Private chef included.',
  lapNotes: ['Your concierge has restocked the ice. <b>$40.</b>', '<b>Final lap.</b> The Man is fully vested. Burn him.'],
  laps: 3,
  width: 17,
  sky: 'dusk',
  skyOverrides: { sunDir: [-0.55, 0.36, 0.5], hemiIntensity: 1.45, hemiGround: 0xb89082, exposure: 1.1, fogNear: 140, fogFar: 820 },
  backdrop: { img: 'assets/backdrops/burning-circuit.webp', top: 24, bottom: -6, rot: 0.08 },
  offroad: 'dust',
  defaults: { edge: 'open', shoulder: 3.5, outer: 11 },
  path: [
    { p: [0, 0, 0] },                         // 0 start/finish on the Esplanade, heading +x
    { p: [80, 0, 0] },                        // 1
    { p: [170, 1, -6], w: 18, bank: 4 },      // 2 into the Bowl, circling the Figure
    { p: [195.7, 1.8, -15.4], w: 18, bank: 8 },// 3
    { p: [209.4, 2.5, -39.1], w: 18, bank: 9 },// 4
    { p: [204.6, 3, -66], w: 18, bank: 9 },   // 5
    { p: [183.7, 3, -83.6], w: 18, bank: 9 }, // 6
    { p: [156.3, 2.5, -83.6], w: 18, bank: 6 },// 7
    { p: [135.4, 2, -66], w: 18, bank: 3 },   // 8 out of the Bowl
    { p: [119.7, 1.2, -52.8] },               // 9 right-hander onto the slalom
    { p: [92.2, 0.5, -56.4] },                // 10
    { p: [79.4, 0, -81] },                    // 11 fire slalom straight
    { p: [80, 0, -180] },                     // 12 ring of fire
    { p: [80, 0, -280] },                     // 13 landing
    { p: [70, 2.5, -310], w: 18 },            // 14 dunes: left
    { p: [38, 5.5, -323], w: 18 },            // 15
    { p: [9.5, 8, -330], w: 18 },           // 16 right
    { p: [-7, 10, -366], w: 18 },              // 17
    { p: [-28, 12.8, -391], w: 18 },          // 18 long left over the crest
    { p: [-60, 15.5, -391], w: 18 },            // 19 crest
    { p: [-80, 14, -366], w: 18 },            // 20
    { p: [-95, 10, -310] },                   // 21 down to the boardwalk
    { p: [-108, 7, -250], w: 16 },            // 22 boardwalk over the camp
    { p: [-128, 6.5, -190], w: 16 },          // 23
    { p: [-132, 5.5, -130], w: 16 },          // 24
    { p: [-132, 2, -62] },                    // 25 camp corner (shortcut on the inside)
    { p: [-118.8, 0.3, -13.2] },              // 26
    { p: [-50, 0, 0] },                       // 27 Esplanade
  ],
  sides: [
    { from: 26.6, to: 1.4, side: 'R', edge: 'wall' },        // grandstand wall along the Esplanade
    { from: 2, to: 8, side: 'L', outer: 9 },                  // keep clear of the Figure's base
    { from: 12.4, to: 12.75, edge: 'wall' },                  // fenced at the ring of fire
    { from: 13.3, to: 21.4, outer: 30, shoulder: 5 },         // soft dunes either side
    { from: 21.75, to: 24.4, edge: 'wall' },                  // boardwalk rails
    { from: 24.6, to: 26.6, side: 'L', outer: 40, shoulder: 5 }, // cut through the camp with a boost
  ],
  bridges: [{ from: 21.75, to: 24.4 }],
  ramps: [{ at: 12.55, len: 9, lift: 2.2 }],
  boosts: [
    { at: 0.55, lat: 0, w: 5 },
    { at: 12.9, lat: 0, w: 8, len: 10 },
    { at: 17.4, lat: 3, w: 4.5 },
    { at: 23.4, lat: -3, w: 4.5 },
  ],
  itemRows: [{ at: 1.3 }, { at: 10.8 }, { at: 15.6 }, { at: 22.6 }, { at: 26.5, n: 3 }],
  coins: [
    { from: 0.15, to: 0.45, n: 4, lat: 4 },
    { from: 3.4, to: 6.4, n: 6, lat: 5 },
    { from: 11.5, to: 12.2, n: 5, lat: x => [-1.5, 0, 1.5, 0, -1.5][Math.round(x * 4)] },
    { from: 12.63, to: 12.78, n: 3, lat: 0, air: 3 },
    { from: 14.4, to: 15.2, n: 4, lat: [-4, 4] },
    { from: 18.2, to: 19.4, n: 4, lat: [5, -3] },
    { from: 22.8, to: 23.6, n: 4, lat: 3 },
    { from: 25.1, to: 25.8, n: 4, lat: 8 },
  ],
  obstacles: [
    // fire slalom: three gates 7 m wide, phases alternating, the gap swapping sides
    { kind: 'timed', model: 'flame', at: 11.5, lat: -5, period: 3, duty: 0.45, phase: 0, effect: 'spin', radius: 1.3 },
    { kind: 'timed', model: 'flame', at: 11.5, lat: 2, period: 3, duty: 0.45, phase: 0, effect: 'spin', radius: 1.3 },
    { kind: 'timed', model: 'flame', at: 11.85, lat: -2, period: 3, duty: 0.45, phase: 1.5, effect: 'spin', radius: 1.3 },
    { kind: 'timed', model: 'flame', at: 11.85, lat: 5, period: 3, duty: 0.45, phase: 1.5, effect: 'spin', radius: 1.3 },
    { kind: 'timed', model: 'flame', at: 12.2, lat: -5, period: 3, duty: 0.45, phase: 0, effect: 'spin', radius: 1.3 },
    { kind: 'timed', model: 'flame', at: 12.2, lat: 2, period: 3, duty: 0.45, phase: 0, effect: 'spin', radius: 1.3 },
    // art cars crawling out across the Esplanade and the Bowl exit
    { kind: 'patrol', model: 'artcar', at: 1.75, lats: [-8, -3], speed: 3.5, effect: 'spin', radius: 2.0 },
    { kind: 'patrol', model: 'artcar', at: 8.6, lats: [7.5, 1], speed: 3, effect: 'spin', radius: 2.0 },
    // dust devils waiting on the outside of the dune corners
    { kind: 'orbit', model: 'dustdevil', at: 14.05, lat: -6.5, orbit: 5, speed: 6, effect: 'spin', radius: 1.6 },
    { kind: 'orbit', model: 'dustdevil', at: 19.4, lat: -6.5, orbit: 5, speed: 6, effect: 'spin', radius: 1.6 },
  ],
  terrain: {
    cell: 3, margin: 170, blend: 30, water: -50,
    fn(x, z) {
      // pale playa with the faintest swell
      let h = 0.4 + (fbm(x * 0.012, z * 0.012, 3, 11) - 0.5) * 1.2;
      // dune ridge along the north edge, rolling crests
      const ridge = smoothstep(-285, -345, z);
      const crest = 11 + Math.sin(x * 0.035 + z * 0.012) * 4 + (fbm(x * 0.02, z * 0.02, 3, 5) - 0.5) * 8;
      h += ridge * Math.max(0, crest);
      // rocky foothills rising beyond the playa
      const d = Math.hypot((x - CENTRE.x) * 0.82, (z - CENTRE.z) * 0.92);
      h += smoothstep(225, 380, d) * (34 + (fbm(x * 0.01, z * 0.01, 4, 2) - 0.5) * 30);
      // stepped mound under the Figure
      const fd = Math.hypot(x - FIGURE.x, z - FIGURE.z);
      h = h * smoothstep(14, 24, fd) + 1.2 * (1 - smoothstep(14, 24, fd));
      return h;
    },
    // pale cracked playa, warm sand on the dunes
    color(x, z, h, slope, over, out) {
      const sand = smoothstep(2.5, 8, h) * (1 - smoothstep(0.5, 0.9, slope)) * smoothstep(-260, -300, z);
      out[0] += (0.95 - out[0]) * sand * 0.7; out[1] += (0.86 - out[1]) * sand * 0.7; out[2] += (0.7 - out[2]) * sand * 0.7;
      const cx = Math.abs(Math.sin(x * 0.21 + Math.sin(z * 0.13) * 1.7)), cz = Math.abs(Math.sin(z * 0.19 + Math.sin(x * 0.11) * 1.9));
      const crack = (1 - smoothstep(0.0, 0.07, Math.min(cx, cz))) * (1 - smoothstep(1.5, 3, h)) * smoothstep(3, 8, over);
      out[0] *= 1 - crack * 0.12; out[1] *= 1 - crack * 0.14; out[2] *= 1 - crack * 0.1;
    },
  },
  look: {
    road: { base: 0x6a6470, line: 0xffffff, center: false },
    kerb: [0xff6a2a, 0xfff0d0],
    shoulder: 0xdcc8a2,
    terrain: { low: 0xe6d3b0, high: 0xf0e2c2, dry: 0xd9c29c, rock: 0x8a6f7a, sand: 0xf3e6c8, dirt: 0xd2b98e },
    deck: 0x8a5a36, wall: 0xe0b37a, wallStripe: 0x8a5a36, rail: 0xff6a2a,
    ads: ['RADICAL SELF-RELIANCE (CATERED)', 'LEAVE NO TRACE OF TAXES', 'DUST TO DUST', 'GIFTING ECONOMY: $40K', 'TURNKEY CAMP', 'ART CAR VALET', 'DEFAULT WORLD', 'PLAYA PROVIDES', 'HUG DEALER', 'CACHE YOUR WATER', 'BURN RATE', 'MOOP PATROL'],
  },
  models: { artcar: B.artcar, dustdevil: B.dustdevil },
  // the opening shot: the Man in his fleece vest, banner up, feet already on fire
  intro: [{ pos: [62, 9, 24], pos1: [100, 15, 8], look: [170, 26, -46], look1: [170, 31, -46], fov: 45, dur: 3.2 }],
  FIGURE,

  /** Dress the course. ctx: { THREE, track, group, gfx, anim, view } */
  decorate(ctx) {
    const { THREE, track, anim, view } = ctx, sc = new Scenery(ctx), rng = sc.rng;
    const hit = makeGroundHit(), V = new THREE.Vector3(), M = new THREE.Matrix4();
    const near = (x, z, p, r) => (x - p.x) ** 2 + (z - p.z) ** 2 < r * r;
    /** True when (x,z) is beyond where a kart can drive, by margin m. under: allow spots beneath the boardwalk. */
    const clear = (x, z, m = 1.5, under = false) => {
      const g = track.ground(x, z, -1, hit), i = g.i;
      if (track.bridge[i] && g.onRoad) return under && track.py[i] - 1.3 - track.terrainHeight(x, z) > 3.9;
      if (g.onRoad) return false;
      const edge = g.side > 0 ? g.edgeL : g.edgeR;
      if (edge !== EDGE.OPEN) return g.outside > m + 0.8;
      return g.outside > (g.side > 0 ? track.outerL[i] : track.outerR[i]) + m;
    };
    const flat = (x, z) => track.terrainHeight(x, z) < 2.6;
    const inLoop = (x, z) => x > -128 && x < 76 && z < -10 && z > -305;
    // the shortcut lane through the camp corner: keep a gap between two tent clusters
    const cutA = sc.beside(24.95, 1, 0), cutB = sc.beside(26.45, 1, 0);
    const cutMid = { x: (cutA.x + cutB.x) / 2, z: (cutA.z + cutB.z) / 2 };
    const reserved = (x, z) => near(x, z, FIGURE, 28) || near(x, z, TEMPLE, 30) || near(x, z, cutMid, 40) || (x > 8 && x < 60 && z < -100 && z > -285) || inJets(x, z, 6) || taken.some(t => near(x, z, t, t.r));
    const taken = [];                                    // footprints of the gags, so the camps keep off them
    const take = (x, z, r) => taken.push({ x, z, r });
    // spots the gags will stand on, kept clear of the camps up front
    for (const [at, side, off, r] of [[5.6, -1, 26, 14], [4.9, -1, 15, 10], [14.6, -1, 35, 14], [18.1, -1, 34, 10], [20.45, -1, 46, 22], [19.75, -1, 33, 8], [22.85, -1, 13, 14], [23.6, -1, 18, 10], [25.45, -1, 15, 10], [25.15, -1, 15, 9], [26.15, -1, 16, 12], [25.75, -1, 26, 12], [2.3, -1, 19, 12], [7.2, -1, 20, 12], [10.7, -1, 19, 12], [15.6, 1, 38, 12], [17.1, 1, 38, 12], [21.2, 1, 37, 12], [24.6, -1, 19, 12], [14.35, -1, 39, 12], [19.85, -1, 38, 12], [21.0, -1, 36, 10]]) { const p = sc.beside(at, side, off); take(p.x, p.z, r); }

    // ---- the sign kit: lettering on a shared atlas, static props baked by material ----
    const bake = B.makeBaker(ctx.group, sc.shadows), atlas = B.makeAtlas(ctx.group, { glow: 0.4 });
    /** Yaw that faces the road at sample i from `side`, turned toward oncoming karts by k. */
    const faceIn = (i, side, k = 0.5) => Math.atan2(-side * track.lx[i] - track.tx[i] * k, -side * track.lz[i] - track.tz[i] * k);
    /** A lettered board on legs at (x, z), facing yaw; up is the panel centre above the ground. */
    const signAt = (x, z, yaw, draw, w, h, up, { px = 1024, frame = 0x3a2c34, y = null, legs = 2 } = {}) => {
      const y0 = y ?? sc.y(x, z), f = B.signFrame(w, h, up, { color: frame, legs }); sc.place(f, x, z, { yaw, y: y0 }); bake.add(f);
      const r = atlas.add(px, Math.max(48, Math.round(px * h / w)), typeof draw === 'string' ? B.board(draw) : draw);
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
    const STYLE = {
      sun: { bg: '#ffd23c', fg: '#1a1d29' }, hot: { bg: '#ff4fa8', fg: '#ffffff' }, ink: { bg: '#1a1d29', fg: '#ffd23c' }, sky: { bg: '#46d6ff', fg: '#1a1d29' },
      paper: { bg: '#fff6e6', fg: '#c2410c' }, fire: { bg: '#ff6a2a', fg: '#ffffff' }, red: { bg: '#e23b3b', fg: '#ffffff' }, white: { bg: '#ffffff', fg: '#1a1d29' }, violet: { bg: '#7b5cff', fg: '#ffffff' },
    };

    // ---- start/finish: gantry, grandstands, crowds ----
    const g0 = sc.beside(0, 1, -track.hwL[0]);
    const gantry = P.gantry(track.hwL[0] + track.hwR[0] + 1.5, 'BURNING CIRCUIT', { color: 0xff6a2a, color2: 0xffd23c });
    sc.place(gantry, g0.x, g0.z, { yaw: g0.along, y: g0.roadY });
    view.startLights = gantry.userData.lights;
    {
      const span = track.hwL[0] + track.hwR[0] + 1.5, cx = Math.cos(g0.along), cz = -Math.sin(g0.along), mb = new ModelBuilder();
      for (const sx of [-1, 1]) { const x = sx * (span / 2 + 1.4); mb.add('m', cyl(0.25, 0.25, 5.2, 8), { p: [g0.x + cx * x, g0.roadY + 12.4, g0.z + cz * x] }); }
      mb.add('m', box(span + 4.6, 4.6, 0.3, 0.05, 1), { p: [g0.x, g0.roadY + 12.7, g0.z], r: [0, g0.along, 0] });
      const g = mb.build({ m: plastic(0x1d2030, 0.5) }); ctx.group.add(g); bake.add(g);
      const r = atlas.add(1536, 300, B.board('DECOMMODIFICATION, PRESENTED BY OUR SPONSORS', { bg: '#fff6e6', fg: '#1a1d29', stripe: '#ff6a2a', size: 150, lines: 1, pad: 0.04 }));
      const yaw = g0.along + Math.PI;
      atlas.both(r, [g0.x + Math.sin(yaw) * 0.18, g0.roadY + 12.7, g0.z + Math.cos(yaw) * 0.18], yaw, span + 4.2, 4.2, 0.36);
    }
    const stand = P.grandstand({ w: 30, rows: 6, color: 0xff6a2a }), stand2 = P.grandstand({ w: 30, rows: 6, color: 0x7b5cff });
    const seats = [], standSpots = [], placards = [];
    const putStand = (proto, p) => {
      const g = proto.group.clone(); sc.place(g, p.x, p.z, { yaw: p.yaw, y: p.y }); standSpots.push(p);
      g.updateMatrixWorld(true); M.copy(g.matrixWorld);
      proto.seats.forEach((s, k) => {
        if (rng() >= 0.82) return;
        V.set(s[0], s[1], s[2]).applyMatrix4(M); seats.push({ x: V.x, y: V.y, z: V.z, yaw: p.yaw + rng.range(-0.4, 0.4) });
        if (s[2] > -1 && k % 7 === 3) placards.push({ x: V.x, y: V.y, z: V.z, yaw: p.yaw });   // the front row holds up big signs
      });
      bake.add(g);
    };
    sc.along({ from: 26.9, to: 1.0, side: -1, offset: 6.5, spacing: 34 }).forEach((p, i) => putStand(i % 2 ? stand2 : stand, p));
    sc.along({ from: 27.3, to: 0.7, side: 1, offset: 17, spacing: 34, phase: 12 }).forEach((p, i) => putStand(i % 2 ? stand : stand2, p));
    sc.instances(partsOf(P.spectator()), seats, { scale: [0.95, 1.2], tints: P.CROWD_TINTS, cast: false });
    {
      const CROWD = ['HUG ME, I\'M A FOUNDER', 'DAD\'S JET IS HERE', 'BURN IT DOWN (TAX WRITE-OFF)', 'PAID $80K TO BE HERE', 'MY SHAMAN IS ON RETAINER', 'PLUR (PREFERRED STOCK)'];
      const cols = ['#ffd23c', '#ffffff', '#46d6ff', '#ff9ad0', '#7dff6a'];
      const regions = CROWD.map((t, k) => atlas.add(512, 318, B.board(t, { bg: cols[k % cols.length], fg: '#1a1d29', size: 120, border: '#1a1d29', pad: 0.05 })));
      const sticks = new ModelBuilder();
      placards.forEach((s, k) => {
        const y = s.y + 2.6 + (k % 2) * 0.3, fx = Math.sin(s.yaw), fz = Math.cos(s.yaw);
        for (const o of [-1.1, 1.1]) sticks.add('s', cyl(0.06, 0.06, 2.2, 5), { p: [s.x - fx * 0.05 + Math.cos(s.yaw) * o, s.y + 1.3, s.z - fz * 0.05 - Math.sin(s.yaw) * o] });
        atlas.place(regions[k % regions.length], [s.x + fx * 0.1, y, s.z + fz * 0.1], s.yaw, 4.2, 2.6);
      });
      const g = sticks.build({ s: plastic(0x8a5a36, 0.8) }); ctx.group.add(g); bake.add(g, false);
    }

    // string lights down both sides of the Esplanade
    const poleParts = partsOf(B.lightPole()), allPoles = [];
    for (const [side, off] of [[1, 13.5], [-1, 2.2]]) {
      const row = sc.along({ from: 26.3, to: 2.1, side, offset: off, spacing: 13 }).filter(p => !standSpots.some(s => near(p.x, p.z, s, side > 0 ? 17 : 19)));
      allPoles.push(...row);
      let run = [];
      const flush = () => { if (run.length > 1) ctx.group.add(B.stringLights(run.map(p => ({ x: p.x, y: p.y + 6.4, z: p.z })))); run = []; };
      row.forEach((p, k) => { if (k && Math.hypot(p.x - row[k - 1].x, p.z - row[k - 1].z) > 20) flush(); run.push(p); }); flush();
    }
    sc.instances(poleParts, allPoles, {});
    // a row of portable toilets behind the grandstands, as is tradition
    const loo = sc.beside(0.55, -1, 24), dx = Math.cos(loo.along), dz = -Math.sin(loo.along);
    void dx; void dz;
    const loos = []; for (let k = 0; k < 12; k++) { const t = (k - 5.5) * 1.75; loos.push({ x: loo.x + Math.sin(loo.along) * t, z: loo.z + Math.cos(loo.along) * t, y: 0, yaw: loo.yaw }); }
    loos.forEach(p => { p.y = sc.y(p.x, p.z); });
    sc.instances(partsOf(B.portaloo()), loos, { tints: [0x2f7be0, 0x2f7be0, 0x2fb36b, 0xff8a3c] });

    // ---- the Figure, in the middle of the Bowl ----
    const FIG_YAW = -1.2;                                   // faces the Esplanade
    const fig = B.figure({ h: 44 });
    sc.place(fig, FIGURE.x, FIGURE.z, { yaw: FIG_YAW, y: track.terrainHeight(FIGURE.x, FIGURE.z) - 0.1 });
    fig.updateMatrixWorld(true);
    const feet = fig.userData.feet.map(p => new THREE.Vector3(...p).applyMatrix4(fig.matrixWorld));
    const body = fig.userData.body.map(p => { const v = new THREE.Vector3(p[0], p[1], p[2]).applyMatrix4(fig.matrixWorld); v.lvl = p[3]; return v; });
    {
      const W = (x, y, z) => new THREE.Vector3(x, y, z).applyMatrix4(fig.matrixWorld), bn = fig.userData.banner, bd = fig.userData.badge, pt = fig.userData.patch;
      const banner = atlas.add(1600, 380, B.board('FULLY VESTED', { bg: '#fff6e6', fg: '#c2410c', size: 300, lines: 1, stripe: '#2c3d5e', pad: 0.04 }));
      const f = W(0, bn.y, bn.z), b2 = W(0, bn.y, -bn.z);
      atlas.place(banner, [f.x, f.y, f.z], FIG_YAW, bn.w, bn.h); atlas.place(banner, [b2.x, b2.y, b2.z], FIG_YAW + Math.PI, bn.w, bn.h);
      const badge = atlas.add(300, 380, (g, w, h) => { g.fillStyle = '#ffffff'; g.fillRect(0, 0, w, h); g.fillStyle = '#e23b3b'; g.fillRect(0, 0, w, h * 0.3); B.fitText(g, 'VIP', w / 2, h * 0.16, w * 0.8, 90, B.FONT, '#ffffff', { lines: 1 }); B.fitText(g, 'ALL ACCESS', w / 2, h * 0.5, w * 0.86, 70, B.FONT, '#1a1d29', { lines: 2, maxH: h * 0.34 }); B.fitText(g, 'THE MAN', w / 2, h * 0.84, w * 0.8, 50, B.SANS, '#e23b3b', { lines: 1 }); });
      const bw = W(0, bd.y, bd.z); atlas.place(badge, [bw.x, bw.y, bw.z], FIG_YAW, bd.w, bd.h);
      const patch = atlas.add(240, 116, B.board('FUND III', { bg: '#f4f4f0', fg: '#2c3d5e', font: B.SANS, size: 60, lines: 1 }));
      const pw = W(pt.x, pt.y, pt.z); atlas.place(patch, [pw.x, pw.y, pw.z], FIG_YAW, pt.w, pt.h);
      // a plinth sign in front of the base, facing the Esplanade
      const base = W(0, 0, 16.5);
      signAt(base.x, base.z, FIG_YAW, B.board('BURN RATE: 100%', { bg: '#1a1d29', fg: '#ffb020', size: 150, lines: 1, border: '#ff6a2a' }), 15, 3.2, 2.6, { frame: 0x1a1d29 });
    }

    bake.add(fig);

    // ---- the ring of fire, just past the ramp lip ----
    const ramp = track.ramps[0], sHoop = ramp.s1 + 5, hp = { x: 0, y: 0, z: 0 };
    track.pointAt(sHoop, 0, hp);
    const ii = Math.floor(sHoop / track.ds) % track.N;
    const hoop = B.fireHoop({ d: 14, hw: Math.max(track.hwL[ii], track.hwR[ii]), clear: 1.8 });
    sc.place(hoop, hp.x, hp.z, { yaw: track.yawAt(sHoop), y: hp.y });
    hoop.updateMatrixWorld(true);
    const rim = hoop.userData.rim.map(p => new THREE.Vector3(...p).applyMatrix4(hoop.matrixWorld));
    bake.add(hoop, false);
    {   // a sign over the hoop, for the karts lining up the jump
      const yaw = track.yawAt(sHoop) + Math.PI, top = hp.y + hoop.userData.cy + hoop.userData.R, fx = Math.sin(yaw), fz = Math.cos(yaw), rx = Math.cos(yaw), rz = -Math.sin(yaw);
      const mb = new ModelBuilder();
      for (const sx of [-4.5, 4.5]) mb.add('m', cyl(0.2, 0.2, 3.4, 6), { p: [hp.x + rx * sx, top + 1.3, hp.z + rz * sx] });
      mb.add('m', box(15, 3.6, 0.3, 0.05, 1), { p: [hp.x - fx * 0.2, top + 3.6, hp.z - fz * 0.2], r: [0, yaw, 0] });
      const g = mb.build({ m: plastic(0x3a3440, 0.45, 0.6) }); ctx.group.add(g); bake.add(g, false);
      const r = atlas.add(1280, 300, B.board('JUMP THROUGH HOOPS (SERIES A)', { bg: '#ff6a2a', fg: '#ffffff', size: 130, lines: 1, pad: 0.04 }));
      atlas.both(r, [hp.x + fx * 0.02, top + 3.6, hp.z + fz * 0.02], yaw, 14.4, 3.3, 0.44);
    }
    // the Man burns a little more every lap: feet on lap 1, legs on lap 2, all of him on the last
    const smoke = view.fx.smoke;
    anim.push((dt) => {
      for (let k = 0, n = view.fx.count(150, dt); k < n; k++) { const p = rim[Math.floor(rng() * rim.length)]; view.fx.flame(p.x + rng.range(-0.4, 0.4), p.y + rng.range(-0.3, 0.3), p.z + rng.range(-0.4, 0.4), rng.range(-0.6, 0.6), 2.5 + rng() * 2.5, rng.range(-0.6, 0.6), [1, 0.62, 0.2], 1.3 + rng() * 0.9, 0.35); }
      for (let k = 0, n = view.fx.count(45, dt); k < n; k++) { const p = feet[Math.floor(rng() * feet.length)]; view.fx.flame(p.x + rng.range(-0.3, 0.3), p.y, p.z + rng.range(-0.3, 0.3), 0, 2 + rng() * 2, 0, [1, 0.7, 0.25], 1.1 + rng() * 0.6, 0.4); }
      const race = view.race, laps = race?.laps ?? 3; let lap = 1;
      if (race?.karts) for (const kk of race.karts) if (Number.isFinite(kk.lap)) lap = Math.max(lap, Math.min(kk.lap, laps));
      const reach = lap >= laps ? 31 : lap >= 2 ? 13 : 4, pts = body.filter(p => p.lvl <= reach);
      for (let k = 0, n = view.fx.count(30 + reach * 3, dt); k < n && pts.length; k++) { const p = pts[Math.floor(rng() * pts.length)]; view.fx.flame(p.x + rng.range(-0.8, 0.8), p.y + rng.range(-0.5, 0.5), p.z + rng.range(-0.8, 0.8), rng.range(-0.4, 0.4), 3 + rng() * 3, rng.range(-0.4, 0.4), [1, 0.6, 0.2], 2.2 + rng() * 1.6, 0.55); }
      if (smoke) for (let k = 0, n = view.fx.count(1.5 + reach * 0.15, dt); k < n && pts.length; k++) { const p = pts[Math.floor(rng() * pts.length)]; smoke.emit({ x: p.x, y: p.y + 3, z: p.z, vx: rng.range(-0.8, 0.8), vy: 4 + rng() * 2, vz: rng.range(-0.8, 0.8), color: [0.14, 0.12, 0.12], color2: [0.42, 0.36, 0.36], size: 6 + rng() * 4, grow: 2.2, drag: 0.2, gravity: -0.3, life: 7 + rng() * 3, alpha: 0.6, fadeIn: 0.08, spin: rng.range(-0.3, 0.3), rot: rng() * 6.28 }); }
    });

    // ---- the temple, across the playa ----
    bake.add(sc.place(B.temple({ h: 16 }), TEMPLE.x, TEMPLE.z, { yaw: 0.35 }));
    const lanterns = []; for (let k = 0; k < 10; k++) { const a = (k / 10) * Math.PI * 2; lanterns.push({ x: TEMPLE.x + Math.cos(a) * 17, z: TEMPLE.z + Math.sin(a) * 17, yaw: a }); }
    lanterns.forEach(p => { p.y = sc.y(p.x, p.z); });
    sc.instances(partsOf(B.glowCube(0xffb45a, { h: 3, size: 0.8 })), lanterns, {});

    // ---- the camp: a grid of tents and yurts with streets, inside the loop ----
    const tentSpots = [], yurtSpots = [], domeSpots = [];
    for (let ix = 0; ix < 26; ix++) for (let iz = 0; iz < 36; iz++) {
      if (ix % 4 === 3 || iz % 4 === 3) continue;                       // streets
      const x = -126 + ix * 7.6 + rng.range(-0.8, 0.8), z = -14 - iz * 8 + rng.range(-0.8, 0.8);
      if (!inLoop(x, z) || reserved(x, z) || !flat(x, z)) continue;
      const under = !clear(x, z, 3.2) && clear(x, z, 0, true);
      if (!under && !clear(x, z, 3.2)) continue;
      const r = rng(), p = { x, z, y: track.terrainHeight(x, z), yaw: Math.round(rng() * 4) * Math.PI / 2 };
      if (under || r < 0.55) tentSpots.push(p); else if (r < 0.88) yurtSpots.push(p); else domeSpots.push(p);
    }
    // the shortcut: one cluster at the apex, one deeper in, with a lane between
    {
      const ia = track.indexAtCp(25.7), hx = Math.hypot(track.lx[ia], track.lz[ia]) || 1;
      for (const [d0, d1] of [[7, 9.5], [20, 26]]) for (let a = -10; a <= 10; a += 5) for (let d = d0; d <= d1; d += 3.2) {
        const j = (ia + Math.round(a / track.ds) + track.N) % track.N, lat = track.hwL[j] + d;
        const x = track.px[j] + (track.lx[j] / hx) * lat, z = track.pz[j] + (track.lz[j] / hx) * lat;
        tentSpots.push({ x, z, y: track.terrainHeight(x, z), yaw: rng() * 6.28 });
      }
    }
    const canvasTints = [0xf3ead8, 0xe9dcc4, 0xf6e7d0, 0xd9c6a8, 0xf0d9c8, 0xe8c7a8, 0xc7d9d2];

    // camps out on the open playa beyond the loop: clusters with a dome and a light tower each
    const clusterC = sc.scatter({ count: 16, min: 30, max: 150, minGap: 55, maxSlope: 0.15, where: (x, z) => !inLoop(x, z) && flat(x, z) && !near(x, z, FIGURE, 70) && z > -300 && !reserved(x, z) });
    const towers = [];
    for (const c of clusterC) {
      const yaw = rng() * Math.PI, ca = Math.cos(yaw), sa = Math.sin(yaw);
      for (let u = -2; u <= 2; u++) for (let v = -1; v <= 1; v++) {
        if (u === 0 && v === 0) continue;
        const x = c.x + (u * 8) * ca - (v * 8) * sa, z = c.z + (u * 8) * sa + (v * 8) * ca;
        if (!clear(x, z, 3) || !flat(x, z) || reserved(x, z)) continue;
        (rng() < 0.6 ? tentSpots : yurtSpots).push({ x, z, y: sc.y(x, z), yaw: yaw + (rng() < 0.5 ? 0 : Math.PI) });
      }
      if (clear(c.x, c.z, 8)) domeSpots.push({ x: c.x, z: c.z, y: c.y, yaw: rng() * 6.28, big: true });
      const tx = c.x + 14 * sa, tz = c.z - 14 * ca;
      if (clear(tx, tz, 3)) towers.push({ x: tx, z: tz, y: sc.y(tx, tz), yaw: rng() * 6.28 });
    }
    sc.instances(partsOf(B.bellTent()), tentSpots, { scale: [0.9, 1.15], tints: canvasTints, sink: 0.05 });
    sc.instances(partsOf(B.yurt()), yurtSpots, { scale: [0.9, 1.15], tints: canvasTints, sink: 0.05 });
    const domeS = domeSpots.filter(d => !d.big), domeL = domeSpots.filter(d => d.big);
    sc.instances(partsOf(B.dome(3.6)), domeS, { scale: [0.85, 1.2], sink: 0.1 });
    sc.instances(partsOf(B.dome(6.5, { door: 0xff7ad0 })), domeL, { scale: [0.9, 1.25], sink: 0.2 });
    sc.instances(partsOf(B.lightTower({ h: 14 })), towers, {});

    // ---- the luxury camp: big domes, silver trailers in rows, palms in planters ----
    const luxDomes = [[30, -128, 10], [34, -178, 8], [28, -226, 11.5], [48, -262, 7]];
    luxDomes.forEach(([x, z, r], k) => { if (clear(x, z, r + 1)) bake.add(sc.place(B.dome(r, { door: k % 2 ? 0x46d6ff : 0xffb45a }), x, z, { yaw: Math.PI / 2 + rng.range(-0.3, 0.3), y: sc.y(x, z) - 0.3 })); });
    const trailers = [];
    // the luxury yurts behind a velvet rope, each with its own air conditioner
    const luxYurts = [], acs = [];
    for (let k = 0; k < 10; k++) { const x = 46.5, z = -112 - k * 16.5; if (clear(x, z, 5) && !luxDomes.some(([dx2, dz2, r]) => near(x, z, { x: dx2, z: dz2 }, r + 5)) && Math.abs(z + 200) > 8) { luxYurts.push({ x, z, y: sc.y(x, z), yaw: Math.PI / 2 }); acs.push({ x: x + 5.1, z: z + 1.5, y: sc.y(x + 5.1, z + 1.5), yaw: Math.PI / 2 }); } }
    sc.instances(partsOf(B.yurt()), luxYurts, { scale: 1.7, tints: [0xffffff, 0xf6e7d0], sink: 0.05 });
    sc.instances(partsOf(B.acUnit()), acs, {});
    {
      const pts = []; for (let z = -106; z > -280; z -= 3.2) { if (Math.abs(z + 200) < 4.5) continue; const x = 55.5; if (clear(x, z, 0.3)) pts.push([x, sc.y(x, z), z]); }
      const runs = []; let run = []; pts.forEach((p, k) => { if (k && Math.abs(p[2] - pts[k - 1][2]) > 4) { runs.push(run); run = []; } run.push(p); }); runs.push(run);
      for (const r of runs) if (r.length > 1) { const g = B.velvetRope(r); ctx.group.add(g); bake.add(g, false); }
      // the way in: an arch, a bouncer, a clipboard
      const ax = 55.5, az = -200, yaw = Math.PI / 2 + 0.25, mb = new ModelBuilder();
      for (const dz of [-4.6, 4.6]) mb.add('m', box(0.7, 7.6, 0.7, 0.1, 1), { p: [ax, sc.y(ax, az + dz) + 3.8, az + dz] });
      mb.add('m', box(11, 3.4, 0.3, 0.05, 1), { p: [ax + 0.25, sc.y(ax, az) + 7.4, az], r: [0, yaw, 0] });
      const g = mb.build({ m: plastic(0x1a1d29, 0.5) }); ctx.group.add(g); bake.add(g);
      const r = atlas.add(1024, 300, B.board('EGO DEATH (VIP ENTRANCE)', { bg: '#1a1d29', fg: '#ffd23c', size: 120, border: '#d8b04a' }));
      atlas.both(r, [ax + 0.25 + Math.sin(yaw) * 0.17, sc.y(ax, az) + 7.4, az + Math.cos(yaw) * 0.17], yaw, 10.6, 3.1, 0.34);
      const guard = B.person({ h: 2.3 }); sc.place(guard, ax - 1.4, az - 6.4, { yaw: Math.PI / 2 }); guard.traverse(o => { if (o.isMesh && o.material.userData.tintable) { o.material = o.material.clone(); o.material.color.set(0x15161a); } }); bake.add(guard);
      signAt(37, -152, Math.PI / 2 + 0.45, B.board('RADICAL INCLUSION', { bg: '#b0102c', fg: '#ffffff', size: 150, sub: 'INVITE ONLY', subFg: '#ffd23c', subScale: 0.8, lines: 1 }), 20, 8, 10, { frame: 0x1a1d29 });
      signAt(37, -244, Math.PI / 2 + 0.45, B.board('YURTS WITH DUAL-ZONE AC', { bg: '#ffffff', fg: '#0e7490', size: 130, border: '#0e7490' }), 13, 4.6, 7, { frame: 0x1a1d29 });
    }
    for (let k = 0; k < 10; k++) { const x = -165 - (k % 2) * 12, z = -60 - k * 16; if (clear(x, z, 4) && flat(x, z)) trailers.push({ x, z, y: sc.y(x, z), yaw: 0.2 + rng.range(-0.2, 0.2) }); }
    sc.instances(partsOf(B.trailer()), trailers, { tints: [0xff8a3c, 0x46d6ff, 0xff4fa8, 0xffd23c] });
    const palms = [];
    for (let k = 0; k < 12; k++) { const x = 16 + (k % 2) * 22, z = -104 - Math.floor(k / 2) * 30; if (clear(x, z, 3) && !luxDomes.some(([dx2, dz2, r]) => near(x, z, { x: dx2, z: dz2 }, r + 3))) palms.push({ x, z, y: sc.y(x, z), yaw: 0 }); }
    sc.instances(partsOf(B.planter()), palms, {});
    sc.instances(partsOf(P.palm(3, { h: 7.5 })), palms.map(p => ({ ...p, y: p.y + 1.1 })), { scale: [0.9, 1.1], yaw: 'random' });

    // ---- the jet park beside the fire slalom: a runway, a row of private jets, and the sign ----
    {
      const jets = [], cols = [0x1f2a44, 0xb21e3a, 0x0e7490, 0x1a1d29, 0x7b5cff, 0xc2410c, 0x16a34a];
      for (let k = 0; k < 7; k++) { const x = 124, z = -136 - k * 23; if (clear(x - 8.5, z + 8.5, 2) && clear(x - 7, z - 7, 2)) jets.push({ x, z }); }
      jets.forEach(({ x, z }, k) => { const j = B.privateJet({ accent: cols[k % cols.length] }); sc.place(j, x, z, { yaw: -Math.PI / 4 + 0.08 * ((k % 3) - 1) }); bake.add(j); });
      // the runway behind them, with a centre line
      const rw = new ModelBuilder(), rx = 166;
      rw.add('tar', box(20, 0.12, 200, 0.03, 1), { p: [rx, sc.y(rx, -195) + 0.06, -195] });
      for (let z = -100; z > -290; z -= 12) rw.add('line', box(0.6, 0.06, 6, 0.02, 1), { p: [rx, sc.y(rx, z) + 0.15, z] });
      for (const sx of [-9, 9]) for (let z = -98; z > -292; z -= 8) rw.add('lamp', box(0.3, 0.3, 0.3, 0.05, 1), { p: [rx + sx, sc.y(rx + sx, z) + 0.2, z] });
      const g = rw.build({ tar: plastic(0x3a3540, 0.9), line: plastic(0xf4f4f0, 0.6), lamp: glow(0x46d6ff, 2.2) }, { cast: false }); ctx.group.add(g); bake.add(g, false);
      signAt(142, -214, -0.4, B.board('LEAVE NO TRACE', { bg: '#ffffff', fg: '#1a6b2a', size: 200, lines: 1, stripe: '#1a6b2a' }), 32, 7.5, 15, { frame: 0x1a1d29, legs: 3 });
      signAt(112, -262, -0.75, B.board('CARBON OFFSET BY VIBES', { bg: '#7dff6a', fg: '#1a1d29', size: 140 }), 14, 5, 7.5, { frame: 0x1a1d29 });
    }
    // fire jets in the slalom: product placement
    sign(11.4, 1, 14.5, B.board('NOT A FLAMETHROWER', { bg: '#1a1d29', fg: '#ff6a2a', size: 140, border: '#ff6a2a' }), 12, 4, 6.5, { turn: 0.25 });
    sign(12.2, -1, 17, B.board('NOT A FLAMETHROWER', { bg: '#1a1d29', fg: '#ff6a2a', size: 140, border: '#ff6a2a' }), 13, 4.4, 6.5, { turn: 0.6 });

    // ---- the Bowl's outside: a camp with principles ----
    {
      const p = sc.beside(5.6, -1, 26);
      if (clear(p.x, p.z, 8)) { sc.place(B.dome(7, { door: 0x7dff6a }), p.x, p.z, { yaw: p.yaw, y: p.y - 0.2 }); take(p.x, p.z, 10); }
      sign(4.9, -1, 17, B.board('CONSCIOUS CAPITALISM CAMP', { bg: '#16a34a', fg: '#ffffff', size: 130, sub: 'NO REFUNDS', subFg: '#ffd23c', subScale: 0.75 }), 18, 8, 9.5, { turn: 0.6 });
    }

    // ---- the dunes: a superyacht beached on the crest, ice at a price, and a camp that has given up the internet ----
    {
      const Y = { x: -50, z: -446.5, yaw: -Math.PI / 2 }, y0 = track.terrainHeight(Y.x, Y.z);
      const ends = [[Y.x - 37, Y.z], [Y.x + 37, Y.z], [Y.x, Y.z + 8], [Y.x - 32, Y.z + 7], [Y.x + 32, Y.z + 7]];
      if (ends.every(([x, z]) => clear(x, z, 2))) {
        const yacht = B.superyacht({ L: 58 }); yacht.rotation.order = 'YXZ';
        sc.place(yacht, Y.x, Y.z, { yaw: Y.yaw, y: Math.max(y0, track.terrainHeight(Y.x - 20, Y.z), track.terrainHeight(Y.x + 20, Y.z)) + 2.2, scale: 1.3 });
        yacht.rotation.z = 0.06; yacht.rotation.x = -0.09; yacht.updateMatrixWorld(true);
        const nm = yacht.userData.name, W = (x, y, z) => { const v = new THREE.Vector3(x, y, z).applyMatrix4(yacht.matrixWorld); return [v.x, v.y, v.z]; };
        const r = atlas.add(1600, 130, (g, w, h) => { g.fillStyle = '#f8f8f4'; g.fillRect(0, 0, w, h); B.fitText(g, 'M/Y LOW PROFILE', w / 2, h * 0.56, w * 0.96, 124, B.FONT, '#14213d', { lines: 1 }); });
        // the hull is rolled a little: letter each side along the hull's own frame
        for (const sx of [1, -1]) {
          const c = (dz, dy) => W(sx * nm.x, nm.y + dy, nm.z + dz), hw = nm.w / 2, hh = nm.h / 2;
          if (sx > 0) atlas.quad(r, c(hw, -hh), c(-hw, -hh), c(-hw, hh), c(hw, hh)); else atlas.quad(r, c(-hw, -hh), c(hw, -hh), c(hw, hh), c(-hw, hh));
        }
        bake.add(yacht); take(Y.x, Y.z, 40);
      }
      const p = sc.beside(14.75, -1, 36);
      if (clear(p.x, p.z, 4)) { const yaw = faceIn(p.i, -1, 0.6); bake.add(sc.place(B.iceShack(), p.x, p.z, { yaw })); take(p.x, p.z, 8); }
      sign(14.35, -1, 39, B.board('DUST IS FREE.', { bg: '#46d6ff', fg: '#1a1d29', size: 150, sub: 'ICE IS $40.', subFg: '#b0102c', subScale: 0.8, lines: 1 }), 18, 7, 9, { turn: 0.6 });
      const dishes = sc.along({ from: 20.0, to: 20.9, side: -1, offset: 38, spacing: 8 }).filter(q => clear(q.x, q.z, 3)).map(q => ({ ...q, yaw: q.yaw + Math.PI + rng.range(-0.3, 0.3) }));
      sc.instances(partsOf(B.satDish()), dishes, { scale: [1.2, 1.6] });
      dishes.forEach(q => take(q.x, q.z, 5));
      const d = sc.beside(20.45, -1, 52); if (clear(d.x, d.z, 8)) sc.place(B.dome(6, { door: 0x46d6ff }), d.x, d.z, { yaw: d.yaw, y: d.y - 0.3 });
      sign(19.85, -1, 38, B.board('DIGITAL DETOX CAMP', { bg: '#ffffff', fg: '#7b5cff', size: 150, border: '#7b5cff' }), 20, 6.5, 11, { turn: 0.6 });
      sign(21.0, -1, 36, B.board('WIFI PASSWORD: NAMASTE123', { bg: '#7b5cff', fg: '#ffffff', size: 120 }), 16, 5.2, 8, { turn: 0.6 });
    }

    // ---- under the boardwalk: a spiritual journey, with a term sheet ----
    {
      const p = sc.beside(22.85, -1, 13);
            if (clear(p.x, p.z, 6, true)) {
        const yaw = faceIn(p.i, -1, 0.3), fx = Math.sin(yaw), fz = Math.cos(yaw), rx = Math.cos(yaw), rz = -Math.sin(yaw);
        const t = B.canopyTent({ w: 11, d: 8, color: 0xf6e7d0 }); sc.place(t, p.x, p.z, { yaw }); bake.add(t); take(p.x, p.z, 9);
        const folk = [[-1.6, -0.85, true, 0x1c2740, Math.PI], [1.6, -0.85, true, 0x2c3d5e, Math.PI], [0, 1.1, false, 0xff8a3c, 0]];
        folk.forEach(([u, v, seated, tint, turn]) => { const m = B.person({ seated }); m.traverse(o => { if (o.isMesh && o.material.userData.tintable) o.material.color.set(tint); }); sc.place(m, p.x + rx * u - fx * v, p.z + rz * u - fz * v, { yaw: yaw + turn }); bake.add(m); });
        // the document itself, on an easel, and the sign over the tent
        const ex = p.x + fx * 4.6 + rx * 3.6, ez = p.z + fz * 4.6 + rz * 3.6;
        signAt(ex, ez, yaw, (g, w, h) => { g.fillStyle = '#fbfaf5'; g.fillRect(0, 0, w, h); B.fitText(g, 'TERM SHEET', w / 2, h * 0.12, w * 0.86, 90, B.SANS, '#1a1d29', { lines: 1 }); g.fillStyle = '#c9c4b8'; for (let y = h * 0.24; y < h * 0.78; y += h * 0.055) g.fillRect(w * 0.1, y, w * (0.55 + ((y * 7) % 30) / 100), h * 0.018); B.fitText(g, 'VIBE: $40M POST', w / 2, h * 0.86, w * 0.8, 46, B.SANS, '#c2410c', { lines: 1 }); g.strokeStyle = '#1a1d29'; g.lineWidth = 4; g.beginPath(); g.moveTo(w * 0.55, h * 0.95); g.bezierCurveTo(w * 0.65, h * 0.9, w * 0.72, h * 0.99, w * 0.88, h * 0.93); g.stroke(); }, 3.4, 4.6, 3.0, { px: 400, frame: 0x7c4f2e });
        signAt(p.x - fx * 2, p.z - fz * 2, yaw, B.board('SPIRITUAL JOURNEY', { bg: '#ff8a3c', fg: '#1a1d29', size: 140, sub: 'TERM SHEET SIGNING, 3 PM', subFg: '#ffffff', subScale: 0.6, lines: 1 }), 19, 7, 11.5, { frame: 0x7c4f2e });
      }
    }

    // ---- the camp corner: gifting (card only), bikes for hire, an art car that is a limo ----
    {
      const p = sc.beside(25.45, -1, 15);
      if (clear(p.x, p.z, 4)) {
        const yaw = faceIn(p.i, -1, 0.7), t = B.cardTerminal({ h: 8 }); sc.place(t, p.x, p.z, { yaw }); take(p.x, p.z, 7);
        const sc0 = t.userData.screen, fx = Math.sin(yaw), fz = Math.cos(yaw);
        const r = atlas.add(512, 420, (g, w, h) => { g.fillStyle = '#d8f5e0'; g.fillRect(0, 0, w, h); B.fitText(g, 'ADD A TIP?', w / 2, h * 0.2, w * 0.9, 96, B.SANS, '#1a1d29', { lines: 1 }); ['20%', '25%', '30%'].forEach((s2, k) => { const bx = w * (0.06 + k * 0.31); g.fillStyle = '#1a1d29'; g.fillRect(bx, h * 0.42, w * 0.26, h * 0.3); B.fitText(g, s2, bx + w * 0.13, h * 0.57, w * 0.22, 70, B.SANS, '#ffffff', { lines: 1 }); }); B.fitText(g, 'GIFT: $4,000', w / 2, h * 0.87, w * 0.8, 60, B.SANS, '#c2410c', { lines: 1 }); });
        atlas.place(r, [p.x + fx * sc0.z, p.y + sc0.y, p.z + fz * sc0.z], yaw, sc0.w, sc0.h);
        bake.add(t);
        sign(25.1, -1, 19, B.board('GIFT ECONOMY', { bg: '#ff4fa8', fg: '#ffffff', size: 150, sub: 'CARD ONLY', subFg: '#ffd23c', subScale: 0.8, lines: 1 }), 16, 6.4, 8.5, { turn: 0.5 });
      }
      const bikes = sc.along({ from: 25.95, to: 26.4, side: -1, offset: 14, spacing: 1.1 }).filter(q => clear(q.x, q.z, 1));
      sc.instances(partsOf(B.bicycle()), bikes, { tints: [0xff6a2a, 0x46d6ff, 0xffd23c, 0xff4fa8, 0x7dff6a] });
      bikes.forEach(q => take(q.x, q.z, 2));
      sign(26.15, -1, 19, B.board('BIKES', { bg: '#ffd23c', fg: '#1a1d29', size: 150, sub: '$900/DAY', subFg: '#b0102c', subScale: 0.95, lines: 1 }), 16, 8, 8.5, { turn: 0.5 });
      const l = sc.beside(25.75, -1, 26);
      if (clear(l.x, l.z, 6)) {
        bake.add(sc.place(B.limoArtCar({ len: 11 }), l.x, l.z, { yaw: l.along + Math.PI / 2 + 0.3 })); take(l.x, l.z, 8);
        signAt(l.x + 4, l.z - 5, faceIn(l.i, -1, 0.6), B.board('ART CAR', { bg: '#ff8ad0', fg: '#1a1d29', size: 160, sub: "(IT'S A LIMO WITH FUR ON IT)", lines: 1 }), 12, 5, 6, { frame: 0x1a1d29 });
      }
    }

    // ---- neon art ----
    const word = sc.beside(12.0, -1, 17); bake.add(sc.place(B.neonWord('DUSTY', { h: 5 }), word.x, word.z, { yaw: word.yaw }));
    const heart = sc.beside(13.9, 1, 34); bake.add(sc.place(B.neonHeart({ size: 9 }), heart.x, heart.z, { yaw: heart.yaw, y: heart.y - 0.3 }));
    const heart2 = sc.beside(3.6, -1, 26); bake.add(sc.place(B.neonHeart({ size: 7, color: 0xff3b5c }), heart2.x, heart2.z, { yaw: heart2.yaw }));
    const word2 = sc.beside(9.8, 1, 16); bake.add(sc.place(B.neonWord('DUSTY', { h: 3.2, colors: [0x46d6ff, 0xff4fa8] }), word2.x, word2.z, { yaw: word2.yaw }));
    const cubeCols = [0x46d6ff, 0xff4fa8, 0xffd23c, 0x7dff6a];
    const cubeRows = [
      ...sc.along({ from: 11.2, to: 12.3, side: -1, offset: 13.5, spacing: 16 }),
      ...sc.along({ from: 11.2, to: 12.3, side: 1, offset: 13.5, spacing: 16, phase: 8 }),
      ...sc.along({ from: 2.2, to: 7.8, side: -1, offset: 15, spacing: 20 }),
      ...sc.along({ from: 13.6, to: 20.6, side: 1, offset: 33, spacing: 22 }),
    ].filter(p => clear(p.x, p.z, 0.8) && !reserved(p.x, p.z));
    cubeCols.forEach((c, k) => sc.instances(partsOf(B.glowCube(c, { h: 4.5 + k * 0.6 })), cubeRows.filter((_, i) => i % 4 === k), {}));
    const farTowers = sc.scatter({ count: 14, min: 24, max: 120, minGap: 40, maxSlope: 0.2, where: (x, z) => flat(x, z) && !reserved(x, z) && clear(x, z, 3) });
    sc.instances(partsOf(B.lightTower({ h: 18 })), farTowers, {});

    // ---- the dunes and the foothills ----
    const rocks = sc.scatter({ count: 110, min: 45, max: 260, maxSlope: 1.4, minGap: 12, where: (x, z, h) => h > 7 && Math.hypot((x - CENTRE.x) * 0.82, (z - CENTRE.z) * 0.92) > 250 });
    sc.instances(partsOf(P.rock(2, { r: 4 })), rocks, { scale: [1, 3], yaw: 'random', sink: 1.2, tints: [0xb08f9a, 0xa38290, 0xc09aa0, 0x9a7f8c] });
    const pebbles = sc.scatter({ count: 70, min: 34, max: 120, maxSlope: 0.8, minGap: 6, where: (x, z, h) => h > 4 && clear(x, z, 2) && z > -300 });
    sc.instances(partsOf(P.rock(5, { r: 1.4 })), pebbles, { scale: [0.6, 1.6], yaw: 'random', sink: 0.3, tints: [0xc4a898, 0xb89a8c, 0xd0b4a0] });

    // arrow boards on the outside of every real corner
    for (const c of track.corners) {
      const side = c.dir > 0 ? -1 : 1, n = Math.max(2, Math.min(5, Math.round(c.len / 15)));
      for (let k = 0; k < n; k++) {
        const i = (c.i0 + Math.round(((k + 0.6) / n) * (c.len / track.ds))) % track.N;
        const p = sc.beside(track.cp[i], side, (side > 0 ? track.outerL[i] : track.outerR[i]) + 1.2);
        const b = P.chevronBoard(0xff6a2a); if (c.dir > 0) b.scale.x = -1;
        sc.place(b, p.x, p.z, { yaw: p.yaw, lift: 0.9 }); if (c.dir > 0) b.scale.x = -1;
      }
    }

    // billboards where you are looking anyway
    const BOARDS = [
      [2.3, -1, 19, 'OUT OF OFFICE SINCE 1998', 'sun', '- LARRY & SERGEY'], [7.2, -1, 20, 'MY SHAMAN TAKES EQUITY', 'hot'],
      [10.7, -1, 19, 'BURNING MAN IS SILICON VALLEY', 'ink', '- ELON MUSK'], [15.6, 1, 38, 'CHEF-LED VISION QUEST', 'paper'],
      [17.1, 1, 38, 'PLAYA NAME: CHIEF VIBES OFFICER', 'violet'], [21.2, 1, 37, 'NO SPECTATORS (EXCEPT INVESTORS)', 'red'],
      [23.6, -1, 20, 'FOUND MYSELF. RAISED A SERIES B.', 'sky'], [24.6, -1, 19, 'RADICAL SELF-RELIANCE (CATERED)', 'fire'],
    ];
    for (const [at, side, off, text, st, sub] of BOARDS) sign(at, side, off, B.board(text, { ...STYLE[st], size: 130, sub, subFg: sub ? STYLE[st].fg : null, subScale: 0.55 }), 20, 6.6, 10, { turn: 0.45 });

    bake.flush();
    atlas.flush();

    // balloons drifting over the playa
    const cols = [[0xff6a2a, 0xffd23c], [0x7b5cff, 0xff4fa8], [0x46d6ff, 0xffffff]];
    const balloons = cols.map((c, i) => { const b = P.balloon(c); const a = (i / cols.length) * Math.PI * 2 + 0.9, r = 260 + (i % 2) * 70; b.position.set(CENTRE.x + Math.cos(a) * r, 60 + i * 12, CENTRE.z + Math.sin(a) * r); b.scale.setScalar(1.5 + (i % 2) * 0.3); ctx.group.add(b); return b; });
    anim.push((dt, time) => { balloons.forEach((b, i) => { b.position.y += Math.sin(time * 0.4 + i * 1.7) * dt * 0.8; b.rotation.y += dt * 0.05; }); });
  },
};
