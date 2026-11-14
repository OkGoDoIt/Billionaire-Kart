/* Burning Circuit: a billionaires' art festival on a dry lake bed at dusk.
   Esplanade start, a banked bowl around the Figure, a fire slalom into a jump
   through a ring of fire, a dune ridge, and a boardwalk over the camp. */
import * as THREE from 'three';
import { fbm, smoothstep } from '../core/util.js';
import { Scenery, partsOf } from '../render/scenery.js';
import { makeGroundHit, EDGE } from '../track/track.js';
import * as P from '../models/props.js';
import * as B from '../models/props-burning-circuit.js';
import { makeBaker } from '../models/props-international-waters.js';
import { ModelBuilder, cyl, box, plastic, glow } from '../models/build.js';

const FIGURE = { x: 170, z: -46 };
const JETS = { x0: 100, x1: 186, z0: -292, z1: -100 };   // the private jet park east of the fire slalom
const inJets = (x, z, m = 0) => x > JETS.x0 - m && x < JETS.x1 + m && z > JETS.z0 - m && z < JETS.z1 + m;
const CENTRE = { x: 0, z: -205 };
const TEMPLE = { x: -22, z: -168 };
/** A thin box from a to b (for nets and rigging). */
function strutGeo(a, b, w) {
  const dx = b[0] - a[0], dy = b[1] - a[1], dz = b[2] - a[2], len = Math.hypot(dx, dy, dz) || 1e-3;
  return new THREE.BoxGeometry(w, len, w).applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(dx / len, dy / len, dz / len))).translate((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2);
}
const SAIL_LINE = [[0, -338], [-14, -344], [-30, -345], [-46, -343], [-62, -338], [-76, -330], [-86, -322]];
const DUNE = { x: -38, z: -344, top: 15.5 };   // the big dune inside the dune loop: the boost cut goes up its face and off its lee

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
    { p: [70, 2.5, -310], w: 18 },            // 14 dunes: left, climbing
    { p: [38, 6, -323], w: 18 },              // 15
    { p: [9.5, 8.5, -330], w: 18 },           // 16 right
    { p: [-7, 11, -366], w: 18 },             // 17
    { p: [-28, 14, -391], w: 18 },            // 18 long left over the crest
    { p: [-60, 19, -391], w: 20, bank: 5 },          // 19 crest
    { p: [-80, 16, -366], w: 20, bank: 4 },            // 20
    { p: [-95, 14.5, -310] },                 // 21 the dune lip: off the plank, over the camp
    { p: [-108, 11, -250], w: 16 },           // 22 boardwalk over the camp
    { p: [-128, 8.5, -190], w: 16 },          // 23
    { p: [-132, 6, -130], w: 16 },            // 24
    { p: [-132, 2, -62] },                    // 25 camp corner
    { p: [-118.8, 0.3, -13.2] },              // 26
    { p: [-50, 0, 0] },                       // 27 Esplanade
  ],
  sides: [
    { from: 26.6, to: 1.4, side: 'R', edge: 'wall' },        // grandstand wall along the Esplanade
    { from: 2, to: 8, side: 'L', outer: 9 },                  // keep clear of the Figure's base
    { from: 12.4, to: 12.75, edge: 'wall' },                  // fenced at the ring of fire
    { from: 13.3, to: 21.0, outer: 30, shoulder: 5 },         // soft dunes either side
    { from: 15.8, to: 20.95, side: 'L', outer: 34, shoulder: 5, hoarding: false }, // the dune cut: over the big dune inside the loop
    { from: 21.0, to: 24.4, edge: 'wall' },                   // the plank and the boardwalk rails
    { from: 24.6, to: 26.6, side: 'L', outer: 40, shoulder: 5 }, // room to run wide through the camp corner
  ],
  shortcuts: [
    { name: 'dune cut', from: 15.95, to: 20.8, boost: true, path: SAIL_LINE },
  ],
  zones: [{ from: 13.25, to: 21.0, skin: 'sand' }, { from: 21.0, to: 24.4, skin: 'wood' }, { from: 24.4, to: 26.75, skin: 'dirt' }],
  bridges: [{ from: 21.0, to: 24.4 }],
  gaps: [{ from: 21.45, to: 21.68 }],
  ramps: [{ at: 12.55, len: 9, lift: 2.2 }, { at: 21.25, len: 9, lift: 1.8 },
    { at: 19.08, lat: -4.4, w: 5.8, len: 8.5, lift: 1.45 }],
  boosts: [
    { at: 0.55, lat: 0, w: 5 },
    { at: 12.9, lat: 0, w: 8, len: 10 },
    { at: 18.53, lat: -4, w: 5.4, len: 9 },
    { at: 21.03, lat: 0, w: 8, len: 9 },   // onto the plank: speed for the gap
    { at: 23.4, lat: -3, w: 4.5 },
  ],
  itemRows: [{ at: 1.3 }, { at: 10.8 }, { at: 15.6 }, { at: 22.6 }],
  coins: [
    { from: 0.15, to: 0.45, n: 4, lat: 4 },
    { from: 3.4, to: 6.4, n: 6, lat: 5 },
    { from: 11.5, to: 12.2, n: 5, lat: x => [-1.5, 0, 1.5, 0, -1.5][Math.round(x * 4)] },
    { from: 12.63, to: 12.78, n: 3, lat: 0, air: 3 },
    { from: 14.4, to: 15.2, n: 4, lat: [-4, 4] },
    { from: 18.1, to: 18.65, n: 3, lat: [0, -4] },
    { from: 19.44, to: 19.68, n: 3, lat: -4.3, air: 2.4 },
    ...[[16.62, 23, 0.4], [16.69, 32, 1.4], [16.72, 40, 2.4]].map(([at, lat, air]) => ({ from: at, to: at, n: 1, lat, air })),   // up the big dune on the cut
    ...[[21.52, 3.6], [21.62, 4.4], [21.72, 4.0]].map(([at, air]) => ({ from: at, to: at, n: 1, lat: 0, air })),   // over the gap
    { from: 22.8, to: 23.6, n: 4, lat: 3 },
    { from: 25.1, to: 25.8, n: 4, lat: 8 },
  ],
  obstacles: [
    // Fire jets alternate between the verges, leaving room to steer after an item hit.
    { kind: 'timed', model: 'flame', at: 11.5, lat: -5, period: 3, duty: 0.25, phase: 0, effect: 'spin', radius: 1.3 },
    { kind: 'timed', model: 'flame', at: 11.85, lat: 5, period: 3, duty: 0.25, phase: 1.5, effect: 'spin', radius: 1.3 },
    { kind: 'timed', model: 'flame', at: 12.2, lat: -5, period: 3, duty: 0.25, phase: 0, effect: 'spin', radius: 1.3 },
    // art cars crawling out across the Esplanade and the Bowl exit
    { kind: 'patrol', model: 'artcar', at: 1.75, lats: [-8, -3], speed: 3.5, effect: 'spin', radius: 2.0 },
    { kind: 'patrol', model: 'artcar', at: 8.6, lats: [7.5, 1], speed: 3, effect: 'spin', radius: 2.0 },
    // an LED bus crawling about on the left of the wide dune climb, in no hurry at all (the right is always clear)
    { kind: 'patrol', model: 'ledbus', at: 15.9, lats: [7.6, 3.4], speed: 1.8, effect: 'spin', radius: 2.1 },
    // dust devils waiting on the outside of the dune corners
    { kind: 'orbit', model: 'dustdevil', at: 14.05, lat: -6.5, orbit: 5, speed: 6, effect: 'spin', radius: 1.6 },
    { kind: 'orbit', model: 'dustdevil', at: 18.72, lat: -11.2, orbit: 2.4, speed: 6, effect: 'spin', radius: 1.6 },
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
      // The far slip faces curl back along the long line; keep the boat high on its bank.
      const lip = z + 420 + 6 * Math.sin(x * 0.055);
      h += 10 * Math.exp(-((lip / (lip > 0 ? 10 : 25)) ** 2)) * Math.exp(-(((x + 40) / 60) ** 4));
      // the big dune inside the loop: a long windward face from the east, a short steep lee to the west
      { const u = DUNE.x - x, v = z - DUNE.z, f = u < 0 ? smoothstep(-34, 0, u) : 1 - smoothstep(0, 13, u), g = 1 - smoothstep(16, 34, Math.abs(v));
        h = h * (1 - f * g) + DUNE.top * f * g; }
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
      // Wind streaks across the high sand and a packed amber trail through the cut.
      if (z < -298) {
        const ripple = (0.5 + 0.5 * Math.cos(z * 0.69 + x * 0.12 + 2 * Math.sin(x * 0.05))) * sand;
        out[0] *= 1 - ripple * 0.075; out[1] *= 1 - ripple * 0.17; out[2] *= 1 - ripple * 0.24;
        if (x < 6 && x > -92 && z > -357 && z < -314) {
          let distance = Infinity;
          for (let i = 1; i < SAIL_LINE.length; i++) {
            const [ax, az] = SAIL_LINE[i - 1], [bx, bz] = SAIL_LINE[i], dx = bx - ax, dz = bz - az;
            const t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz)));
            distance = Math.min(distance, Math.hypot(x - ax - dx * t, z - az - dz * t));
          }
          const packed = 1 - smoothstep(3.4, 7.4, distance);
          out[0] += (0.92 - out[0]) * packed; out[1] += (0.49 - out[1]) * packed; out[2] += (0.2 - out[2]) * packed;
        }
      }
      const cx = Math.abs(Math.sin(x * 0.21 + Math.sin(z * 0.13) * 1.7)), cz = Math.abs(Math.sin(z * 0.19 + Math.sin(x * 0.11) * 1.9));
      const crack = (1 - smoothstep(0.0, 0.07, Math.min(cx, cz))) * (1 - smoothstep(1.5, 3, h)) * smoothstep(3, 8, over);
      out[0] *= 1 - crack * 0.12; out[1] *= 1 - crack * 0.14; out[2] *= 1 - crack * 0.1;
    },
  },
  look: {
    road: { base: 0x6a6470, line: 0xffffff, center: false },
    kerb: [0xff6a2a, 0xfff0d0],
    shoulder: 0xdcc8a2, groundDetail: 0.055, groundMatte: true,
    terrain: { low: 0xe6d3b0, high: 0xf0e2c2, dry: 0xd9c29c, rock: 0x8a6f7a, sand: 0xf3e6c8, dirt: 0xd2b98e },
    deck: 0x8a5a36, wall: 0xe0b37a, wallStripe: 0x8a5a36, rail: 0xff6a2a,
    ads: ['RADICAL SELF-RELIANCE (CATERED)', 'LEAVE NO TRACE OF TAXES', 'DUST TO DUST', 'GIFTING ECONOMY: $40K', 'TURNKEY CAMP', 'ART CAR VALET', 'DEFAULT WORLD', 'PLAYA PROVIDES', 'HUG DEALER', 'CACHE YOUR WATER', 'BURN RATE', 'MOOP PATROL'],
  },
  models: { artcar: B.artcar, dustdevil: B.dustdevil, ledbus: B.ledBus },
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
    for (const [at, side, off, r] of [[5.6, -1, 26, 14], [4.9, -1, 15, 10], [14.6, -1, 35, 14], [18.1, -1, 34, 10], [20.45, -1, 46, 22], [19.75, -1, 33, 8], [22.85, -1, 13, 14], [23.6, -1, 18, 10], [25.45, -1, 15, 10], [25.15, -1, 15, 9], [26.15, -1, 16, 12], [25.75, -1, 26, 12], [2.3, -1, 19, 12], [7.2, -1, 20, 12], [10.7, -1, 19, 12], [21.2, 1, 37, 12], [24.6, -1, 19, 12], [14.35, -1, 39, 12], [19.85, -1, 38, 12], [21.0, -1, 36, 10]]) { const p = sc.beside(at, side, off); take(p.x, p.z, r); }

    // ---- the sign kit: lettering on a shared atlas, static props baked by material ----
    const bake = makeBaker(ctx.group, sc.shadows), atlas = B.makeAtlas(ctx.group, { glow: 0.4 });
    /** Small repeated props baked into the shared material buckets (no shadows): far fewer draw calls than instancing each kind. */
    const bakeAll = (proto, list, scale = 1) => { for (const p of list) bake.add(sc.place(proto.clone(), p.x, p.z, { yaw: p.yaw || 0, y: p.y, scale }), false); };
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
    // painted posters (generated art, tools/gen-posters.mjs): one 2x2 atlas image, one mesh for all of them
    const posters = (() => {
      const tex = new THREE.TextureLoader().load('assets/posters/burning-circuit.webp'); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
      const q = new B.Quads();
      return {
        place(k, c, yaw, w, h) { const u0 = (k % 2) / 2, v1 = 1 - Math.floor(k / 2) / 2; q.panel(c, yaw, w, h, [u0 + 0.002, v1 - 0.498, u0 + 0.498, v1 - 0.002]); },
        flush() { if (q.empty) return; const m = new THREE.Mesh(q.geometry(), new THREE.MeshStandardMaterial({ map: tex, emissiveMap: tex, emissive: 0xffffff, emissiveIntensity: 0.35, roughness: 0.6 })); m.matrixAutoUpdate = false; ctx.group.add(m); },
      };
    })();
    /** Poster k on a board at (x, z) facing yaw, with a lettered back. */
    const posterAt = (x, z, yaw, k, back, { w = 15, h = 10, up = 9, legs = 2 } = {}) => {
      const y0 = sc.y(x, z), f = B.signFrame(w, h, up, { color: 0x3a2c34, legs }); sc.place(f, x, z, { yaw, y: y0 }); bake.add(f); take(x, z, w * 0.55);
      posters.place(k, [x + Math.sin(yaw) * 0.03, y0 + up, z + Math.cos(yaw) * 0.03], yaw, w, h);
      const r = atlas.add(768, 512, B.board(back, { bg: '#1a1d29', fg: '#ffd23c', size: 120, stripe: '#ff6a2a' }));
      atlas.place(r, [x - Math.sin(yaw) * 0.39, y0 + up, z - Math.cos(yaw) * 0.39], yaw + Math.PI, w, h);
      // The payoff belongs under the poster art on its approach face. Both share the same frame.
      const bandH = Math.min(3.5, h * 0.26), bandY = y0 + up - (h + bandH) / 2;
      const rail = new ModelBuilder();
      rail.add('ink', new THREE.BoxGeometry(w, bandH, 0.35));
      bake.add(sc.place(rail.build({ ink: plastic(0x1a1d29, 0.5) }), x, z, { yaw, y: bandY }), false);
      const caption = atlas.add(1024, Math.round(1024 * bandH / w), B.board(back, { bg: '#17212c', fg: '#fff2c5', lines: 1, pad: 0.035, size: 110 }));
      atlas.place(caption, [x + Math.sin(yaw) * 0.19, bandY, z + Math.cos(yaw) * 0.19], yaw, w, bandH);
    };
    /** The same beside the road at control point `at`, if the spot is clear for its full width. */
    const poster = (at, side, off, k, back, opts = {}) => {
      const w = opts.w ?? 15, p = sc.beside(at, side, off), yaw = faceIn(p.i, side, opts.turn ?? 0.45), rx = Math.cos(yaw) * w / 2, rz = -Math.sin(yaw) * w / 2;
      if (!clear(p.x, p.z, 0.5) || !clear(p.x + rx, p.z + rz, 0.5) || !clear(p.x - rx, p.z - rz, 0.5)) return null;
      posterAt(p.x, p.z, yaw, k, back, opts); return p;
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
    const allPoles = [];
    for (const [side, off] of [[1, 13.5], [-1, 2.2]]) {
      const row = sc.along({ from: 26.3, to: 2.1, side, offset: off, spacing: 13 }).filter(p => !standSpots.some(s => near(p.x, p.z, s, side > 0 ? 17 : 19)));
      allPoles.push(...row);
      let run = [];
      const flush = () => { if (run.length > 1) bake.add(B.stringLights(run.map(p => ({ x: p.x, y: p.y + 6.4, z: p.z }))), false); run = []; };
      row.forEach((p, k) => { if (k && Math.hypot(p.x - row[k - 1].x, p.z - row[k - 1].z) > 20) flush(); run.push(p); }); flush();
    }
    bakeAll(B.lightPole(), allPoles);
    // a row of portable toilets behind the grandstands, as is tradition
    const loo = sc.beside(0.55, -1, 24), dx = Math.cos(loo.along), dz = -Math.sin(loo.along);
    void dx; void dz;
    const loos = []; for (let k = 0; k < 12; k++) { const t = (k - 5.5) * 1.75; loos.push({ x: loo.x + Math.sin(loo.along) * t, z: loo.z + Math.cos(loo.along) * t, y: 0, yaw: loo.yaw }); }
    loos.forEach(p => { p.y = sc.y(p.x, p.z); });
    sc.instances(partsOf(B.portaloo()), loos, { tints: [0x2f7be0, 0x2f7be0, 0x2fb36b, 0xff8a3c], cast: false });

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

    // ---- the burn you cannot miss: real flames climbing the Man, a smoke column, and a sky that catches ----
    {
      // Each tongue has a rounded foot and a wind-bent, tapering tip. A soft alpha
      // at the heel lets the timber and the orange body overlap without hard seams.
      const tex = new THREE.CanvasTexture(Object.assign(document.createElement('canvas'), { width: 8, height: 128 }));
      const g = tex.image.getContext('2d'), gr = g.createLinearGradient(0, 128, 0, 0);
      for (const [stop, color] of [[0, 'rgba(255,108,20,0)'], [0.12, '#ff7c12'], [0.32, '#ffcd54'], [0.58, '#ff8d25'], [0.84, '#f64e17'], [1, 'rgba(211,39,9,0.15)']]) gr.addColorStop(stop, color);
      g.fillStyle = gr; g.fillRect(0, 0, 8, 128); tex.colorSpace = THREE.SRGBColorSpace;
      const profile = [[0.05, 0], [0.7, 0.09], [1, 0.25], [0.84, 0.48], [0.53, 0.69], [0.27, 0.84], [0.025, 1]];
      const tongue = new THREE.LatheGeometry(profile.map(([r, y]) => new THREE.Vector2(r, y)), 12);
      const pos = tongue.attributes.position;
      for (let i = 0; i < pos.count; i++) {
        const y = pos.getY(i); pos.setX(i, pos.getX(i) + y * y * (1.2 - Math.sin(y * 5.6)));
      }
      tongue.computeVertexNormals();
      const mat = new THREE.MeshBasicMaterial({ map: tex, color: 0xffedc0, transparent: true, depthWrite: false, fog: false });
      // tongues of flame at burn points up the body, plus a crown over the head
      const pts = body.slice().sort((p, q) => p.lvl - q.lvl), N = 16, top = pts[pts.length - 1];
      const tongues = []; for (let k = 0; k < N; k++) { const p = pts[Math.floor((k + 0.5) / N * pts.length)]; tongues.push({ x: p.x, y: p.y - 1.5, z: p.z, lvl: p.lvl, r: 1.65 + rng() * 1.55, h: 8.5 + rng() * 7, ph: rng() * 6.28 }); }
      tongues.push({ x: top.x, y: top.y, z: top.z, lvl: 31, r: 4.2, h: 20, ph: 1.3 }, { x: top.x, y: top.y - 6, z: top.z, lvl: 28, r: 4.9, h: 16, ph: 4.1 });
      const flames = new THREE.InstancedMesh(tongue, mat, tongues.length); flames.frustumCulled = false; flames.renderOrder = 6; ctx.group.add(flames);
      const soot = new THREE.MeshLambertMaterial({ color: 0x40343d, transparent: true, opacity: 0, depthWrite: false, flatShading: true });
      const column = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 1), soot, 9);
      column.frustumCulled = false; column.renderOrder = 4; ctx.group.add(column);
      const FIRE = { zenith: 0x3a0e14, horizon: 0xff5a1c, ground: 0xb8401c, fog: 0xc8552a, fogNear: 110, fogFar: 700, hemiSky: 0xff9a5c, hemiGround: 0xc0603a, cloud: 0xff9a5a, cloudShade: 0x5a1c18 };
      const M = new THREE.Matrix4(), Q = new THREE.Quaternion(), V = new THREE.Vector3(), S = new THREE.Vector3();
      const axis = new THREE.Vector3(0, 1, 0);
      let reach = 2, heat = 0, t = 0, fell = false;
      anim.push(dt => {
        t += dt;
        const lap = view.showLap || 1, laps = view.race?.laps ?? 3, last = lap >= laps;
        reach += ((last ? 34 : lap >= laps - 1 ? 15 : 5) - reach) * Math.min(1, dt * 0.5);
        heat += ((last ? 1 : 0) - heat) * Math.min(1, dt * 0.35);
        tongues.forEach((f, k) => {
          const on = smoothstep(f.lvl - 2, f.lvl + 2, reach), fl = 0.78 + 0.22 * Math.sin(t * 9 + f.ph) + 0.12 * Math.sin(t * 23 + f.ph * 2);
          S.set(f.r * on * (0.9 + 0.1 * Math.sin(t * 13 + f.ph)), Math.max(0.001, f.h * on * fl * (1 + heat * 0.5)), f.r * on);
          M.compose(V.set(f.x + Math.sin(t * 3 + f.ph) * 0.5, f.y, f.z), Q.setFromAxisAngle(axis, t * 0.6 + f.ph), S); flames.setMatrixAt(k, M);
        });
        flames.instanceMatrix.needsUpdate = true;
        column.visible = reach > 8;
        if (column.visible) {
          soot.opacity = 0.09 * smoothstep(8, 16, reach) + 0.52 * heat;
          for (let i = 0; i < column.count; i++) {
            const phase = (i + t * 0.24) % column.count, size = (5 + 1.35 * phase) * smoothstep(0, 0.8, phase) * (1 - smoothstep(7.5, 9, phase));
            V.set(FIGURE.x + phase * 2.7 + Math.sin(i * 4 + t * 0.45) * 2, top.y + 9 + phase * 6.7, FIGURE.z - phase * 1.3);
            M.compose(V, Q.setFromAxisAngle(axis, i + t * 0.13), S.set(size * 1.2, size, size)); column.setMatrixAt(i, M);
          }
          column.instanceMatrix.needsUpdate = true;
        }
        ctx.gfx.shiftSky(FIRE, heat * (0.72 + 0.1 * Math.sin(t * 5.3) + 0.06 * Math.sin(t * 11.7)));
        if (heat > 0.3) {
          // embers on the wind, across the road around the Bowl
          for (let k = 0, n = view.fx.count(60 * heat, dt); k < n; k++) { const a = rng() * 6.28, d = 10 + rng() * 70; view.fx.spark(top.x + Math.cos(a) * d, top.y - 30 + rng() * 34, top.z + Math.sin(a) * d, 5 + rng() * 4, -1 + rng() * 3, rng.range(-3, 3), [1, 0.55, 0.15], 0.5 + rng() * 0.5, 1.6 + rng()); }
          if (smoke) for (let k = 0, n = view.fx.count(6 * heat, dt); k < n; k++) smoke.emit({ x: top.x + rng.range(-5, 5), y: top.y + rng() * 20, z: top.z + rng.range(-5, 5), vx: 2 + rng(), vy: 9 + rng() * 5, vz: rng.range(-1, 1), color: [0.1, 0.08, 0.08], color2: [0.3, 0.26, 0.25], size: 14 + rng() * 12, life: 5 + rng() * 3, grow: 2.2, alpha: 0.6 });
        }
        // the flag: he goes up in one last roar
        if (!fell && view.showProgress >= 1) { fell = true; view.fx.burst(top.x, top.y - 10, top.z, 220, [1, 0.6, 0.15], 34, 1.2, 2.6, 14); tongues.forEach(f => { f.h *= 1.5; f.r *= 1.25; }); }
      });
    }

    // ---- the temple, across the playa ----
    bake.add(sc.place(B.temple({ h: 16 }), TEMPLE.x, TEMPLE.z, { yaw: 0.35 }));
    const lanterns = []; for (let k = 0; k < 10; k++) { const a = (k / 10) * Math.PI * 2; lanterns.push({ x: TEMPLE.x + Math.cos(a) * 17, z: TEMPLE.z + Math.sin(a) * 17, yaw: a }); }
    lanterns.forEach(p => { p.y = sc.y(p.x, p.z); });
    bakeAll(B.glowCube(0xffb45a, { h: 3, size: 0.8 }), lanterns);
    // the temple circle: eight founders, sitting very still, manifesting
    for (let k = 0; k < 8; k++) {
      const a = (k / 8) * Math.PI * 2 + 0.4, x = TEMPLE.x + Math.cos(a) * 12.5, z = TEMPLE.z + Math.sin(a) * 12.5;
      const m = B.person({ seated: true, h: 1.6 }); m.traverse(o => { if (o.isMesh && o.material.userData.tintable) o.material.color.set(k % 2 ? 0xf4f4f0 : 0xd8d3c8); });
      sc.place(m, x, z, { yaw: Math.atan2(-Math.cos(a), -Math.sin(a)), y: sc.y(x, z) }); bake.add(m);
    }
    signAt(TEMPLE.x + 15, TEMPLE.z + 12, 0.65, B.board('THE TEMPLE', { bg: '#ffffff', fg: '#1a1d29', size: 170, sub: 'PLEASE BE QUIET — THE FOUNDERS ARE MEDITATING', subFg: '#7b5cff', subScale: 0.5, lines: 1 }), 15, 5, 6, { frame: 0x8a7a5a });

    // ---- the content round: the Orgy Dome, the art cars, the camp row, the gate ----
    {
      // THE ORGY DOME: the camp everyone pretends they only walked past. Door faces
      // west, up at the boardwalk; the queue is orderly, the signage is earnest.
      const OD = { x: -88, z: -214 };
      const od = B.dome(13, { door: 0xff4fa8 });
      sc.place(od, OD.x, OD.z, { yaw: -Math.PI / 2, y: sc.y(OD.x, OD.z) - 0.3 }); bake.add(od); take(OD.x, OD.z, 21);
      signAt(OD.x - 19, OD.z - 2, -Math.PI / 2, B.board('THE ORGY DOME', { bg: '#ff4fa8', fg: '#ffffff', size: 170, lines: 1, stripe: '#ffffff' }), 23, 7, 8.5, { frame: 0x1a1d29, legs: 3 });
      signAt(OD.x - 16.5, OD.z + 13, -Math.PI / 2 + 0.35, B.board('CONSENT IS SEXY', { bg: '#fff6e6', fg: '#c2410c', size: 130, sub: 'ASK FIRST. ALWAYS.', subFg: '#1a1d29', subScale: 0.7, lines: 1 }), 11, 4, 3.4, { frame: 0x1a1d29 });
      const ropePts = [];
      for (let k = 0; k < 5; k++) { const x = OD.x - 15 - k * 2.6, z = OD.z - 7 + k * 1.1; ropePts.push([x, sc.y(x, z), z]); }
      const rope = B.velvetRope(ropePts); ctx.group.add(rope); bake.add(rope, false);
      for (let k = 0; k < 3; k++) {   // the queue itself: founders, being very patient
        const x = OD.x - 16.2 - k * 2.6, z = OD.z - 6 + k * 1.1, p = B.person({ h: 1.7 + k * 0.06 });
        p.traverse(o => { if (o.isMesh && o.material.userData.tintable) o.material.color.set([0x35424e, 0x7a4a2d, 0x5b3a6e][k]); });
        sc.place(p, x, z, { yaw: Math.PI / 2 + (k - 1) * 0.15, y: sc.y(x, z) }); bake.add(p);
      }
      const chairs = [];
      for (let k = 0; k < 10; k++) { const th = Math.PI - 0.75 + (k % 5) * 0.375, r = 17.5 + Math.floor(k / 5) * 2.3, x = OD.x + Math.cos(th) * r, z = OD.z + Math.sin(th) * r; chairs.push({ x, z, y: sc.y(x, z), yaw: Math.atan2(-Math.cos(th), -Math.sin(th)) + (rng() - 0.5) * 0.3 }); }
      sc.instances(partsOf(B.foldingChair()), chairs, { tints: [0xff8a3c, 0xff4fa8, 0x46d6ff, 0xffd23c, 0x7dff6a], cast: false });
      const odRing = []; for (let k = 0; k < 6; k++) { const a = (k / 6) * Math.PI * 2 + 0.5, x = OD.x + Math.cos(a) * 16.5, z = OD.z + Math.sin(a) * 16.5; odRing.push({ x, z, y: sc.y(x, z), yaw: a }); }
      bakeAll(B.glowCube(0xff4fa8, { h: 2.6, size: 0.7 }), odRing);

      // EL PULPO MECÁNICO: breathes fire on the hour, insurance pending. Parked past
      // the landing so the ring jump aims you straight at it.
      const PU = { x: 50, z: -292 };
      const pu = B.pulpo(); sc.place(pu, PU.x, PU.z, { yaw: 0.85, y: sc.y(PU.x, PU.z), scale: 1.45 });
      pu.updateMatrixWorld(true);
      const nozzles = pu.userData.flames.map(p => {
        const tip = new THREE.Vector3(p[0], p[1], p[2]).applyMatrix4(pu.matrixWorld);
        const out = new THREE.Vector3(p[0] + p[3], p[1], p[2] + p[4]).applyMatrix4(pu.matrixWorld).sub(tip);
        return { x: tip.x, y: tip.y, z: tip.z, dx: out.x, dz: out.z };
      });
      bake.add(pu); take(PU.x, PU.z, 13);
      signAt(39, -288, 1.1, B.board('EL PULPO MECÁNICO', { bg: '#1a1d29', fg: '#ffb020', size: 130, sub: 'BREATHES FIRE. STAND BACK.', subFg: '#ff6a2a', subScale: 0.6, lines: 1 }), 15, 5.4, 6.5, { frame: 0x1a1d29 });
      anim.push((dt, time) => {
        const live = nozzles.filter((nz, k) => (time * 0.22 + k * 0.17) % 1 < 0.3);
        if (!live.length) return;
        let n = view.fx.count(90, dt);
        for (const nz of live) { const m = Math.ceil(n / live.length); for (let j = 0; j < m; j++) view.fx.flame(nz.x, nz.y, nz.z, nz.dx * (2.5 + rng() * 2), 6.5 + rng() * 3.5, nz.dz * (2.5 + rng() * 2), [1, 0.58, 0.16], 1.6 + rng() * 1.1, 0.5); }
      });

      // ROBOT HEART: a bus that plays one song at one tempo, all week
      const RB = { x: -66, z: -34 };
      if (clear(RB.x, RB.z, 6)) { const hb = B.heartBus(); sc.place(hb, RB.x, RB.z, { yaw: 0.35, y: sc.y(RB.x, RB.z) }); bake.add(hb); take(RB.x, RB.z, 11); }
      signAt(RB.x - 3, RB.z + 12, 0.35, B.board('ROBOT HEART', { bg: '#1a1d29', fg: '#ff3b5c', size: 150, sub: '128 BPM. NO REQUESTS.', subFg: '#ffd23c', subScale: 0.65, lines: 1 }), 13, 4.6, 5.5, { frame: 0x1a1d29 });

      // the LAND SHARK, valet-parked by the jets along the flame slalom
      const SH = { x: 104, z: -150 };
      if (clear(SH.x, SH.z, 5)) { bake.add(sc.place(B.sharkCar(), SH.x, SH.z, { yaw: -1.37, y: sc.y(SH.x, SH.z) })); take(SH.x, SH.z, 10); }
      signAt(SH.x - 7, SH.z + 12, -1.1, B.board('LAND SHARK', { bg: '#46d6ff', fg: '#1a1d29', size: 160, sub: 'MUTANT VEHICLE — DO NOT FEED', subFg: '#b0102c', subScale: 0.55, lines: 1 }), 12, 4.4, 5, { frame: 0x1a1d29 });

      // the camp row: named camps along the run home, and one out in the dunes
      sign(26.55, -1, 17, B.board('CAMP CRYPTO', { ...STYLE.ink, size: 130, sub: 'KEYS LOST. VIBES IMMUTABLE.', subFg: '#7dff6a', subScale: 0.55 }), 17, 5.8, 8.5, { turn: 0.5 });
      sign(26.85, -1, 17, B.board('OPULENT TEMPLE OF NOISE', { ...STYLE.hot, size: 120, sub: 'DECIBELS: ALL OF THEM', subScale: 0.55 }), 18, 5.8, 8.5, { turn: 0.5 });
      sign(27.15, -1, 18, B.board('CAMP QUESTIONMARK', { ...STYLE.sky, size: 130, sub: 'ASK US ANYTHING. NO ANSWERS.', subFg: '#b0102c', subScale: 0.55 }), 17, 5.8, 8.5, { turn: 0.5 });
      sign(16.8, -1, 34, B.board('CAMP BURNING FUNDS', { ...STYLE.fire, size: 130, sub: "S'MORES & DILUTION", subFg: '#ffd23c', subScale: 0.6 }), 17, 5.8, 9, { turn: 0.6 });

      // the Gate: an arch over the Esplanade just past the start line, and the
      // greeters who staff it. You are now entering Black Rock City.
      const gg = sc.beside(0.55, 1, 0), gspan = track.hwL[gg.i] + track.hwR[gg.i] + 1.5;
      {
        const cx = Math.cos(gg.along), cz = -Math.sin(gg.along), mb = new ModelBuilder();
        for (const sx of [-1, 1]) mb.add('m', cyl(0.24, 0.28, 10.6, 8), { p: [gg.x + cx * sx * (gspan / 2 + 1.2), gg.roadY + 5.1, gg.z + cz * sx * (gspan / 2 + 1.2)] });
        mb.add('m', box(gspan + 4, 4.2, 0.3, 0.05, 1), { p: [gg.x, gg.roadY + 9.8, gg.z], r: [0, gg.along, 0] });
        const g = mb.build({ m: plastic(0x3a2c34, 0.6) }); ctx.group.add(g); bake.add(g);
        const front = atlas.add(1536, 260, B.board('WELCOME TO BLACK ROCK CITY', { bg: '#fff6e6', fg: '#1a1d29', stripe: '#ff6a2a', size: 175, lines: 1, pad: 0.03 }));
        const back = atlas.add(1024, 260, B.board('DUST THOU ART', { bg: '#1a1d29', fg: '#ffd23c', size: 200, lines: 1, pad: 0.03 }));
        const yawF = gg.along + Math.PI;
        atlas.place(front, [gg.x + Math.sin(yawF) * 0.19, gg.roadY + 9.8, gg.z + Math.cos(yawF) * 0.19], yawF, gspan + 3.6, 3.9);
        atlas.place(back, [gg.x - Math.sin(yawF) * 0.19, gg.roadY + 9.8, gg.z - Math.cos(yawF) * 0.19], gg.along, gspan + 3.6, 3.9);
      }
      for (const side of [-1, 1]) {
        const bp = sc.beside(0.55, side, (side < 0 ? track.hwL[gg.i] : track.hwR[gg.i]) + (side < 0 ? 4.5 : 3.5));
        const booth = B.greeterBooth(); sc.place(booth, bp.x, bp.z, { yaw: bp.yaw, y: bp.y }); bake.add(booth);
      }
    }

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
    bakeAll(B.lightTower({ h: 14 }), towers);

    // ---- the luxury camp: big domes, silver trailers in rows, palms in planters ----
    const luxDomes = [[30, -128, 10], [34, -178, 8], [28, -226, 11.5], [48, -262, 7]];
    luxDomes.forEach(([x, z, r], k) => { if (clear(x, z, r + 1)) bake.add(sc.place(B.dome(r, { door: k % 2 ? 0x46d6ff : 0xffb45a }), x, z, { yaw: Math.PI / 2 + rng.range(-0.3, 0.3), y: sc.y(x, z) - 0.3 })); });
    const trailers = [];
    // the luxury yurts behind a velvet rope, each with its own air conditioner
    const luxYurts = [], acs = [];
    for (let k = 0; k < 10; k++) { const x = 46.5, z = -112 - k * 16.5; if (clear(x, z, 5) && !luxDomes.some(([dx2, dz2, r]) => near(x, z, { x: dx2, z: dz2 }, r + 5)) && Math.abs(z + 200) > 8) { luxYurts.push({ x, z, y: sc.y(x, z), yaw: Math.PI / 2 }); acs.push({ x: x + 5.1, z: z + 1.5, y: sc.y(x + 5.1, z + 1.5), yaw: Math.PI / 2 }); } }
    sc.instances(partsOf(B.yurt()), luxYurts, { scale: 1.7, tints: [0xffffff, 0xf6e7d0], sink: 0.05 });
    bakeAll(B.acUnit(), acs);
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
    bakeAll(B.planter(), palms);
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
      posterAt(142, -214, -0.4, 3, 'CARBON NEUTRAL (VIBES)', { w: 27, h: 18, up: 14, legs: 3 });
    }
    // fire jets in the slalom: product placement
    sign(11.4, 1, 14.5, B.board('NOT A FLAMETHROWER', { bg: '#1a1d29', fg: '#ff6a2a', size: 140, border: '#ff6a2a' }), 12, 4, 6.5, { turn: 0.25 });

    // ---- the Bowl's outside: a camp with principles ----
    {
      const p = sc.beside(5.6, -1, 26);
      if (clear(p.x, p.z, 8)) { bake.add(sc.place(B.dome(7, { door: 0x7dff6a }), p.x, p.z, { yaw: p.yaw, y: p.y - 0.2 })); take(p.x, p.z, 10); }
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
      sc.instances(partsOf(B.satDish()), dishes, { scale: [1.2, 1.6], cast: false });
      dishes.forEach(q => take(q.x, q.z, 5));
      const d = sc.beside(20.45, -1, 52); if (clear(d.x, d.z, 8)) bake.add(sc.place(B.dome(6, { door: 0x46d6ff }), d.x, d.z, { yaw: d.yaw, y: d.y - 0.3 }));
      sign(19.85, -1, 38, B.board('DIGITAL DETOX CAMP', { bg: '#ffffff', fg: '#7b5cff', size: 150, border: '#7b5cff' }), 20, 6.5, 11, { turn: 0.6 });
      sign(21.0, -1, 36, B.board('WIFI PASSWORD: NAMASTE123', { bg: '#7b5cff', fg: '#ffffff', size: 120 }), 16, 5.2, 8, { turn: 0.6 });
    }

    // Stranded marina: the sails trace the boost cut, the big hull marks the drift ridge.
    // Two staggered banks leave the cut and its wide re-entry open even after a spin.
    {
      const sail = B.landYacht();
      for (const [k, side, off, scale, yaw] of [[0, 1, 12, 1.02, 0.12], [1, -1, 12, 0.85, -0.34], [2, 1, 13, 1.05, 0.28], [3, -1, 14, 0.87, -0.36], [4, 1, 11, 0.95, 0.3], [5, -1, 13, 0.88, -0.3]]) {
        const [ax, az] = SAIL_LINE[k], [bx, bz] = SAIL_LINE[k + 1], len = Math.hypot(bx - ax, bz - az);
        const x = ax - (bz - az) * off * side / len, z = az + (bx - ax) * off * side / len;
        if (track.ground(x, z, -1, hit).outside < 2) continue;
        bake.add(sc.place(sail.clone(), x, z, { yaw, scale }), false);
      }
      const p = sc.beside(18.85, -1, 16);
      bake.add(sc.place(sail.clone(), p.x, p.z, { yaw: 0.72, scale: 1.24 }), false);
      const c = sc.beside(20.22, 1, 18);
      signAt(c.x, c.z, faceIn(c.i, 1, 2), B.board('TRESPASSERS WILL BE GIFTED', { bg: '#ffd23c', fg: '#1a1d29', size: 130, border: '#1a1d29' }), 12, 4.2, 4.6, { frame: 0x1a1d29 });
    }

    // ---- the plank: off the dune lip, over the camp, onto the boardwalk. Below the gap, the safety net (pending) ----
    {
      const gs0 = track.indexAtCp(21.42), gs1 = track.indexAtCp(21.72), gi = Math.round((gs0 + gs1) / 2);
      const hx = Math.hypot(track.lx[gi], track.lz[gi]) || 1, lxn = track.lx[gi] / hx, lzn = track.lz[gi] / hx;
      const tl = Math.hypot(track.tx[gi], track.tz[gi]) || 1, txn = track.tx[gi] / tl, tzn = track.tz[gi] / tl;
      const cx = track.px[gi], cz = track.pz[gi], gy = track.terrainHeight(cx, cz), half = (gs1 - gs0) * track.ds / 2 + 3, wide = track.hwL[gi] + 4;
      // the net: two poles each side, a sagging mesh with a kart-sized hole torn in the middle
      const nb = new ModelBuilder(), at = (u, v, y) => [cx + txn * u + lxn * v, y, cz + tzn * u + lzn * v];
      for (const u of [-half, half]) for (const v of [-wide, wide]) { const p = at(u, v, gy); nb.add('pole', cyl(0.18, 0.22, 6, 6), { p: [p[0], gy + 3, p[2]] }); }
      const sag = (u, v) => gy + 5.2 - 2.4 * (1 - (u / half) ** 2) * (1 - (v / wide) ** 2);
      const hole = (u, v) => Math.hypot(u * 1.2, v + 1.5) < 4.2;
      for (let k = -6; k <= 6; k++) {
        const u = k / 6 * half; let prev = null;
        for (let j = -10; j <= 10; j++) { const v = j / 10 * wide, p = at(u, v, sag(u, v)); if (prev && !hole(u, v)) nb.add('net', strutGeo(prev, p, 0.06)); prev = p; }
      }
      for (let j = -10; j <= 10; j++) {
        const v = j / 10 * wide; let prev = null;
        for (let k = -6; k <= 6; k++) { const u = k / 6 * half, p = at(u, v, sag(u, v)); if (prev && !hole(u, v)) nb.add('net', strutGeo(prev, p, 0.06)); prev = p; }
      }
      const g = nb.build({ pole: plastic(0x3a2c34, 0.6, 0.3), net: plastic(0xfff0d0, 0.7) }); ctx.group.add(g); bake.add(g, false);
      const sp = at(-half - 5, -wide - 6, 0);
      signAt(sp[0], sp[2], Math.atan2(-txn, -tzn) + 0.4, B.board('SAFETY NET', { bg: '#fff6e6', fg: '#c2410c', size: 150, sub: 'FUNDING ROUND: PENDING', subFg: '#1a1d29', subScale: 0.6, lines: 1 }), 12, 5, Math.max(6, track.py[gs0] - gy - 1), { frame: 0x3a2c34 });
      // the judges, on the far side of the gap: a scorecard on stilts, at eye level for the karts in the air
      const jp = at(half + 4, wide + 9, 0);
      signAt(jp[0], jp[2], Math.atan2(-txn, -tzn) + 0.40, B.board('JUDGES: 10/10', { bg: '#ffffff', fg: '#1a1d29', size: 150, sub: '(ALL INVESTORS)', subFg: '#1a1d29', subScale: 0.96, pad: 0.045, lines: 1, border: '#1a1d29' }), 20.5, 8.8, Math.max(8, track.py[gs1] - gy + 3), { frame: 0x3a2c34 });
      for (let k = 0; k < 3; k++) { const q = at(half + 1 + k * 1.6, wide + 4.5, 0), m = B.person({ seated: true }); sc.place(m, q[0], q[2], { yaw: Math.atan2(-lxn, -lzn), y: sc.y(q[0], q[2]) }); bake.add(m); }
      // over the landing, the boardwalk's welcome arch
      const li = track.indexAtCp(21.95), lw = track.hwL[li] + track.hwR[li] + 2.5, ly = track.py[li], la = Math.atan2(track.tx[li], track.tz[li]);
      const ab = new ModelBuilder(), lr = [Math.cos(la), -Math.sin(la)];
      for (const sx of [-1, 1]) ab.add('post', box(0.7, 9, 0.7, 0.1, 1), { p: [track.px[li] + lr[0] * sx * lw / 2, ly + 4.5, track.pz[li] + lr[1] * sx * lw / 2] });
      ab.add('post', box(lw + 1.6, 3.4, 0.35, 0.05, 1), { p: [track.px[li], ly + 9.6, track.pz[li]], r: [0, la, 0] });
      const ag = ab.build({ post: plastic(0x7c4f2e, 0.6, 0.3) }); ctx.group.add(ag); bake.add(ag);
      const ar = atlas.add(1280, 300, B.board('STUCK THE LANDING (SPIRITUALLY)', { bg: '#1a1d29', fg: '#ffd23c', size: 150, lines: 1, border: '#ff6a2a', pad: 0.04 }));
      const fy = la + Math.PI;
      atlas.both(ar, [track.px[li] + Math.sin(fy) * 0.19, ly + 9.6, track.pz[li] + Math.cos(fy) * 0.19], fy, lw + 1.2, 3.1, 0.38);
    }

    // ---- the boardwalk: festival lights on both rails, so it reads as a pier lit up over the camp ----
    {
      const i0 = track.indexAtCp(21.75), i1 = track.indexAtCp(24.35), step = Math.round(12 / track.ds), poles = [];
      for (const sd of [1, -1]) {
        const run = [];
        for (let i = i0; i <= i1; i += step) {
          const hx = Math.hypot(track.lx[i], track.lz[i]) || 1, off = (sd > 0 ? track.hwL[i] : track.hwR[i]) + 0.55;
          const p = { x: track.px[i] + track.lx[i] / hx * off * sd, y: track.py[i] + 0.9, z: track.pz[i] + track.lz[i] / hx * off * sd, yaw: track.yaw[i] };
          poles.push(p); run.push({ x: p.x, y: p.y + 5.2, z: p.z });
        }
        if (run.length > 1) bake.add(B.stringLights(run, { sag: 0.9 }), false);
      }
      bakeAll(B.lightPole({ h: 5.4 }), poles);
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
      sc.instances(partsOf(B.bicycle()), bikes, { tints: [0xff6a2a, 0x46d6ff, 0xffd23c, 0xff4fa8, 0x7dff6a], cast: false });
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
    cubeCols.forEach((c, k) => bakeAll(B.glowCube(c, { h: 4.5 + k * 0.6 }), cubeRows.filter((_, i) => i % 4 === k)));
    const farTowers = sc.scatter({ count: 14, min: 24, max: 120, minGap: 40, maxSlope: 0.2, where: (x, z) => flat(x, z) && !reserved(x, z) && clear(x, z, 3) });
    bakeAll(B.lightTower({ h: 18 }), farTowers);

    // ---- the dunes and the foothills ----
    const rocks = sc.scatter({ count: 110, min: 45, max: 260, maxSlope: 1.4, minGap: 12, where: (x, z, h) => h > 7 && Math.hypot((x - CENTRE.x) * 0.82, (z - CENTRE.z) * 0.92) > 250 });
    sc.instances(partsOf(P.rock(2, { r: 4 })), rocks, { scale: [1, 3], yaw: 'random', sink: 1.2, tints: [0xb08f9a, 0xa38290, 0xc09aa0, 0x9a7f8c] });
    const pebbles = sc.scatter({ count: 70, min: 34, max: 120, maxSlope: 0.8, minGap: 6, where: (x, z, h) => h > 4 && clear(x, z, 2) && z > -300 });
    sc.instances(partsOf(P.rock(5, { r: 1.4 })), pebbles, { scale: [0.6, 1.6], yaw: 'random', sink: 0.3, tints: [0xc4a898, 0xb89a8c, 0xd0b4a0], cast: false });

    // The same ink and metal frame appear on every corner. Use one texture and
    // bake the mirrored placements with their original lighting and cast shadows.
    const chevron = P.chevronBoard(0xff6a2a);
    for (const c of track.corners) {
      const side = c.dir > 0 ? -1 : 1, n = Math.max(2, Math.min(5, Math.round(c.len / 15)));
      for (let k = 0; k < n; k++) {
        const i = (c.i0 + Math.round(((k + 0.6) / n) * (c.len / track.ds))) % track.N;
        const p = sc.beside(track.cp[i], side, (side > 0 ? track.outerL[i] : track.outerR[i]) + 1.2);
        const b = sc.place(chevron.clone(), p.x, p.z, { yaw: p.yaw, lift: 0.9 });
        if (c.dir > 0) b.scale.x = -1;
        bake.add(b);
      }
    }

    // billboards where you are looking anyway
    const BOARDS = [
      [2.3, -1, 19, 'OUT OF OFFICE SINCE 1998', 'sun', '- LARRY & SERGEY'], [7.2, -1, 20, 'MY SHAMAN TAKES EQUITY', 'hot'],
      [10.7, -1, 19, 'BURNING MAN IS SILICON VALLEY', 'ink', '- ELON MUSK'],
      [21.2, 1, 37, 'NO SPECTATORS (EXCEPT INVESTORS)', 'red'],
      [23.6, -1, 20, 'FOUND MYSELF. RAISED A SERIES B.', 'sky'],
    ];
    for (const [at, side, off, text, st, sub] of BOARDS) sign(at, side, off, B.board(text, { ...STYLE[st], size: 130, sub, subFg: sub ? STYLE[st].fg : null, subScale: 0.55 }), 20, 6.6, 10, { turn: 0.45 });

    // the painted posters: the gig poster round the Bowl, the valet stand on the slalom, the playa's terms by the camp
    poster(6.3, -1, 22, 0, 'NO REQUESTS');
    poster(10.35, 1, 18, 2, 'KEYS LEFT IN IGNITION', { turn: 0.35 });
    poster(24.6, -1, 19, 1, 'RADICAL SELF-RELIANCE (CATERED)');
    posters.flush();
    bake.flush();
    atlas.flush();

    // balloons drifting over the playa
    const cols = [[0xff6a2a, 0xffd23c], [0x7b5cff, 0xff4fa8], [0x46d6ff, 0xffffff]];
    const balloons = cols.map((c, i) => { const b = P.balloon(c); const a = (i / cols.length) * Math.PI * 2 + 0.9, r = 260 + (i % 2) * 70; b.position.set(CENTRE.x + Math.cos(a) * r, 60 + i * 12, CENTRE.z + Math.sin(a) * r); b.scale.setScalar(1.5 + (i % 2) * 0.3); ctx.group.add(b); return b; });
    anim.push((dt, time) => { balloons.forEach((b, i) => { b.position.y += Math.sin(time * 0.4 + i * 1.7) * dt * 0.8; b.rotation.y += dt * 0.05; }); });
  },
};
