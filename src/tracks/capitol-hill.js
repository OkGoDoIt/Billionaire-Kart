/* Capitol Hill Climb: the opener of the second cup. A marble government
   district at golden hour: a stone avenue, a run beside the reflecting pool,
   a bend round the obelisk, a climb through the cherry trees, a red-carpet
   run straight through the domed capitol, and the Filibuster: three linked
   hairpins down the hill. Between the Avenue and the Climb, a giant revolving
   door spins suits between a tower marked REGULATOR and one marked INDUSTRY. */
import { fbm, smoothstep } from '../core/util.js';

import { Scenery, partsOf } from '../render/scenery.js';
import * as P from '../models/props.js';
import * as C from '../models/props-capitol-hill.js';
import { canvasTex } from '../render/textures.js';
import { ModelBuilder, cyl, box, plastic, paint } from '../models/build.js';

export const CAPITOL = { x: -85, z: 147, y: 19.5, ax: 66, az: 34 };   // plateau (half-axes) the capitol stands on
export const POOL = { x0: 171, x1: 203, z0: 64, z1: 214, depth: -1.4 }; // the reflecting pool, east of the pool run
export const OBELISK = { x: 113, z: 236 };                             // centre of the bend round the obelisk

const segDist = (x, z, ax, az, bx, bz) => {
  const dx = bx - ax, dz = bz - az, t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz)));
  return Math.hypot(x - ax - dx * t, z - az - dz * t);
};

export default {
  id: 'capitol-hill',
  name: 'Capitol Hill Climb',
  tagline: 'Three laps: the only term limit in town.',
  lapNotes: ['<b>Debt ceiling raised.</b> Nobody is surprised.', '<b>Debt ceiling raised again.</b> Final lap, probably.'],   // shown as laps two and three begin
  // the opening shot: the revolving door between REGULATOR and INDUSTRY, suits going round
  intro: [{ pos: [-22, 30, -30], pos1: [-6, 33, -16], look: [62, 32, 52], look1: [62, 30, 54], fov: 54, dur: 3.2 }],
  laps: 3,
  width: 17,
  sky: 'golden',
  backdrop: { img: 'assets/backdrops/capitol-hill.webp', top: 27, bottom: -9, rot: 0.2 },
  offroad: 'grass',
  defaults: { edge: 'open', shoulder: 3.5, outer: 11 },
  path: [
    { p: [0, 0, 0] },                            // 0 start/finish on the Avenue, heading +x
    { p: [68, 0, 0] },                           // 1
    { p: [106, 0.2, 0], w: 18 },                   // 2 turn one, right
    { p: [134.3, 0.6, 11.7], w: 18 },              // 3
    { p: [148, 0.7, 40], w: 18 },                  // 4
    { p: [156, 0.6, 100] },                        // 5 the Reflecting Pool, pool on the left
    { p: [154, 0.6, 168] },                        // 6
    { p: [146, 0.9, 235], w: 18 },               // 7 round the obelisk, right
    { p: [129.5, 1.3, 263.6], w: 18 },           // 8
    { p: [96.5, 1.8, 263.6], w: 18 },            // 9
    { p: [80, 2.7, 235], w: 18 },                // 10
    { p: [80, 5, 182] },                         // 11 the Mall leg, climbing north
    { p: [80, 8.5, 130] },                       // 12 the Climb: left
    { p: [71.2, 10.3, 108.8] },                  // 13
    { p: [50, 12, 100] },                        // 14
    { p: [25, 13, 100] },                        // 15 left again, through the cherry trees
    { p: [6.2, 14.4, 106.6] },                   // 16
    { p: [-4.3, 15.8, 123.5] },                  // 17 right, up to the Rotunda
    { p: [-14.8, 17.4, 140.4] },                 // 18
    { p: [-33.6, 18.8, 147] },                   // 19
    { p: [-45, 19.5, 147] },                     // 20 the Rotunda: red carpet under the dome
    { p: [-85, 19.5, 147] },                     // 21
    { p: [-125, 19.5, 147] },                    // 22 out the far side, the district below
    { p: [-165, 19, 147], w: 18 },               // 23 the Filibuster: hairpin one, right
    { p: [-177.2, 18.5, 143.7], w: 18, bank: -4 }, // 24
    { p: [-186.2, 18, 134.8], w: 18, bank: -7 },  // 25
    { p: [-189.5, 17.5, 122.5], w: 18, bank: -8 }, // 26
    { p: [-186.2, 17, 110.2], w: 18, bank: -7 },  // 27
    { p: [-177.2, 16.5, 101.3], w: 18, bank: -4 }, // 28
    { p: [-165, 16, 98], w: 18 },                // 29
    { p: [-90, 13.4, 98], w: 18 },               // 30 hairpin two, left
    { p: [-77.8, 12.9, 94.7], w: 18, bank: 4 },  // 31
    { p: [-68.8, 12.3, 85.8], w: 18, bank: 7 },  // 32
    { p: [-65.5, 11.8, 73.5], w: 18, bank: 8 },  // 33
    { p: [-68.8, 11.3, 61.2], w: 18, bank: 7 },  // 34
    { p: [-77.8, 10.7, 52.3], w: 18, bank: 4 },  // 35
    { p: [-90, 10.2, 49], w: 18 },               // 36
    { p: [-145, 7, 49], w: 18 },                 // 37 hairpin three, right
    { p: [-157.2, 6.4, 45.7], w: 18, bank: -4 },  // 38
    { p: [-166.2, 5.9, 36.8], w: 18, bank: -7 },  // 39
    { p: [-169.5, 5.3, 24.5], w: 18, bank: -8 },  // 40
    { p: [-166.2, 4.7, 12.2], w: 18, bank: -7 },  // 41
    { p: [-157.2, 4.2, 3.3], w: 18, bank: -4 },   // 42
    { p: [-145, 3.6, 0], w: 18 },                // 43
    { p: [-75, 1, 0] },                          // 44 onto the Avenue
  ],
  sides: [
    { from: 43.6, to: 1.7, side: 'R', edge: 'wall' },                          // grandstand wall along the Avenue
    { from: 4.4, to: 7.1, side: 'L', outer: 33, hoarding: false },             // the Reflecting Pool: run wide into the shallows
    { from: 5.7, to: 7.0, side: 'R', outer: 32, shoulder: 4, hoarding: false }, // the Mall: open lawn between the pool run...
    { from: 10.15, to: 11.6, side: 'R', outer: 32, shoulder: 4, hoarding: false }, // ...and the Mall leg (cut it with a boost)
    { from: 19.3, to: 20.0, edge: 'wall' },                                     // forecourt walls either side of the capitol
    { from: 22.0, to: 22.35, edge: 'wall' },
  ],
  tunnels: [{ from: 20.0, to: 22.0, through: false }],
  zones: [
    { from: 43.5, to: 2.2, skin: 'stone' },
    { from: 11.0, to: 20.0, skin: 'cobble' },
    { from: 20.0, to: 22.0, skin: 'carpet' },
  ],
  boosts: [
    { at: 0.45, lat: 0, w: 5 },                    // down the Avenue
    { at: 11.2, lat: -3, w: 4.5 },                 // up the Mall leg
    { at: 20.9, lat: 0, w: 5 },                    // on the red carpet under the dome
    { at: 29.35, lat: 3, w: 4.5 },                  // between hairpins one and two: only if you dare
    { at: 43.35, lat: 0, w: 5 },                    // out of the Filibuster, onto the Avenue
  ],
  itemRows: [{ at: 4.6 }, { at: 13.6 }, { at: 21.5 }, { at: 36.5 }, { at: 44.4, n: 3 }],
  coins: [
    { from: 0.15, to: 0.6, n: 4, lat: 4 },
    { from: 5.2, to: 6.4, n: 5, lat: [6.5, 7] },            // along the pool edge: one slip and you are in the water
    { from: 8.1, to: 9.3, n: 4, lat: -5.5 },                // inside the obelisk bend
    { from: 15.6, to: 18.6, n: 4, lat: [5, -5] },           // through the cherry-tree esses
    { from: 25.0, to: 27.0, n: 3, lat: -6 },                // the inside of each hairpin
    { from: 32.0, to: 34.0, n: 3, lat: 6 },
    { from: 39.0, to: 41.0, n: 3, lat: -6 },
  ],
  obstacles: [
    // the motorcade crawls across the road
    { kind: 'patrol', model: 'motorcade', at: 1.35, lats: [-9, -5], speed: 3.5, effect: 'spin', radius: 2.0 },
    { kind: 'patrol', model: 'motorcade', at: 5.7, lats: [9, 5], speed: 3, effect: 'spin', radius: 2.0 },
    // lobbyist drones circling the Climb
    { kind: 'orbit', model: 'drone', at: 14.4, lat: -5, orbit: 3, speed: 5, effect: 'spin', lift: 0.6 },
    { kind: 'orbit', model: 'drone', at: 18.7, lat: 5.5, orbit: 2.5, speed: 4.5, effect: 'spin', lift: 0.6 },
    // red tape at the hairpins
    { kind: 'static', model: 'redtape', at: 26.0, lat: -7.2, effect: 'bump', radius: 1.4 },
    { kind: 'static', model: 'redtape', at: 35.6, lat: -6.4, effect: 'bump', radius: 1.4 },
    { kind: 'static', model: 'redtape', at: 40.0, lat: -7.2, effect: 'bump', radius: 1.4 },
  ],
  terrain: {
    cell: 3, margin: 240, blend: 16, water: -0.95,
    fn(x, z) {
      // the district: flat formal lawns
      let h = 0.4 + (fbm(x * 0.02, z * 0.02, 2, 5) - 0.5) * 0.4;
      // Capitol Hill: a broad north face for the Filibuster, and a spur east for the Climb
      const north = (z < 140 ? smoothstep(-12, 140, z) : 1 - 0.35 * smoothstep(170, 320, z)) * (1 - smoothstep(-40, 30, x)) * smoothstep(-330, -200, x);
      const spur = Math.exp(-((segDist(x, z, -60, 135, 22, 126) / 62) ** 2));
      h += CAPITOL.y * Math.max(north, spur);
      // gentle rises elsewhere, and higher wooded ground beyond 230 m
      const dc = Math.hypot(x, z - 120);
      h += (fbm(x * 0.007, z * 0.007, 3, 13) - 0.35) * 9 * smoothstep(150, 260, dc);
      h += smoothstep(230, 420, dc) * 30;
      h = Math.max(h, 0.2);
      // a flat top for the capitol
      const cd = Math.hypot((x - CAPITOL.x) / CAPITOL.ax, (z - CAPITOL.z) / CAPITOL.az);
      const top = 1 - smoothstep(0.9, 1.35, cd);
      h = h * (1 - top) + CAPITOL.y * top;
      // the reflecting pool: a crisp rectangle dipped below the water
      const pk = smoothstep(POOL.x0 - 2, POOL.x0 + 1, x) * (1 - smoothstep(POOL.x1 - 1, POOL.x1 + 2, x)) * smoothstep(POOL.z0 - 2, POOL.z0 + 1, z) * (1 - smoothstep(POOL.z1 - 1, POOL.z1 + 2, z));
      h = h * (1 - pk) + POOL.depth * pk;
      return h;
    },
  },
  look: {
    road: { base: 0x5d6373, line: 0xffffff, center: 0xffd23c },
    kerb: [0xb3122a, 0xf2efe6],
    groundTexture: 'meadow', groundScale: 0.35,                                           // one mown lawn everywhere (the blotchy default read as gravel up close)
    shoulder: 0x6aae4e,                                                                   // the verge is lawn too: one green from the kerb to the woods
    terrain: { low: 0x5aa64a, high: 0x7fc25a, dry: 0x8cbf5a, rock: 0xb8b0a4, sand: 0x66aa4c, dirt: 0x62a84b },   // "sand" is what the low ground near the pool level gets: lawn here too
    water: 0x5fb7d8,
    wall: 0xf2efe6, wallStripe: 0xd4af37,
    tunnelLight: 0xffc860, portal: 0xe9e3d3,
    ads: ['THOUGHTS AND PRAYERS', 'PORK BARREL BBQ', 'SUPER PAC SNACKS', 'BIPARTISAN NAP TIME', 'THE SWAMP WATER CO', 'I YIELD TO MY DONORS', 'EARMARK ERASERS', 'REVOLVING DOOR CO', 'RED TAPE DISPENSARY', 'I DO NOT RECALL', 'TERM LIMITS: IN COMMITTEE', 'INSIDER TRADING: MEMBERS ONLY'],
  },
  models: { motorcade: () => C.motorcade(), redtape: () => C.redTape(), drone: () => C.lobbyistDrone() },

  /** Dress the course. ctx: { THREE, track, group, gfx, anim, view } */
  decorate(ctx) {
    const { THREE, track, anim, view } = ctx, sc = new Scenery(ctx), rng = sc.rng;
    const taken = [[COMPLEX.x, COMPLEX.z, 40], [STATUE.x, STATUE.z, 15], [LECTERN.x, LECTERN.z, 12], [MAZE.x, MAZE.z, 26], [CANNON.x, CANNON.z, 9]];   // footprints of landmarks: [x, z, r]
    const free = (x, z, pad = 0) => !taken.some(([tx, tz, r]) => (tx - x) ** 2 + (tz - z) ** 2 < (r + pad) ** 2);
    const inPool = (x, z, m = 0) => x > POOL.x0 - m && x < POOL.x1 + m && z > POOL.z0 - m && z < POOL.z1 + m;
    const onPlateau = (x, z, k = 1.1) => Math.hypot((x - CAPITOL.x) / CAPITOL.ax, (z - CAPITOL.z) / CAPITOL.az) < k;
    const inMall = (x, z) => x > 88 && x < 146 && z > 135 && z < 240;
    // can a kart get here? (on the road, or inside the drivable ground beside it)
    const reach = (x, z, pad = 1.5) => {
      const h = track.ground(x, z, -1, sc.hit);
      if (h.onRoad) return true;
      const i = h.i, edge = h.side > 0 ? track.edgeL[i] : track.edgeR[i];
      if (edge !== 0) return h.outside < 0.8;
      return h.outside < (h.side > 0 ? track.outerL[i] : track.outerR[i]) + pad;
    };
    const ok = (x, z, pad) => !reach(x, z, pad) && free(x, z) && !inPool(x, z, 2);

    // start/finish gantry
    const g0 = sc.beside(0, 1, -track.hwL[0]);
    const gantry = P.gantry(track.hwL[0] + track.hwR[0] + 1.5, 'CAPITOL HILL CLIMB', { color: 0xf2efe6, color2: 0xd4af37 });
    sc.place(gantry, g0.x, g0.z, { yaw: g0.along, y: g0.roadY });
    view.startLights = gantry.userData.lights;

    // the capitol: its central hall straddles the red-carpet tunnel
    {
      const i0 = track.indexAtCp(20), i1 = track.indexAtCp(22);
      const cx = (track.px[i0] + track.px[i1]) / 2, cz = (track.pz[i0] + track.pz[i1]) / 2;
      const len = Math.hypot(track.px[i1] - track.px[i0], track.pz[i1] - track.pz[i0]);
      const cap = C.capitol({ len: len + 0.4, half: 20 });
      sc.place(cap, cx, cz, { yaw: Math.atan2(track.px[i1] - track.px[i0], track.pz[i1] - track.pz[i0]), y: track.py[i0] });
      taken.push([cx, cz, 30], [cx + (track.px[i1] - cx) * 0.7, cz, 26], [cx - (track.px[i1] - cx) * 0.7, cz, 26]);
    }

    // the obelisk in the middle of the bend; a ring of flags on its plinth
    const obeliskRing = [];
    {
      const y = sc.y(OBELISK.x, OBELISK.z);
      sc.place(C.obelisk(), OBELISK.x, OBELISK.z, { y: y - 0.3, solid: 7 });
      const ring = [];
      for (let k = 0; k < 12; k++) { const a = (k / 12) * Math.PI * 2; ring.push({ x: OBELISK.x + Math.cos(a) * 5.4, y: y + 1.9, z: OBELISK.z + Math.sin(a) * 5.4, yaw: -a }); }
      obeliskRing.push(...ring);
      taken.push([OBELISK.x, OBELISK.z, 12]);
    }

    // memorial halls round the district, and the fountain on the lawn
    const halls = [[114, 306, Math.PI], [-20, -72, 0]].map(([x, z, yaw]) => ({ x, z, yaw, y: sc.y(x, z) - 0.3 }));
    sc.instances(partsOf(C.memorialHall({ w: 34, d: 22, h: 9 })), halls, {});
    halls.forEach(p => taken.push([p.x, p.z, 23]));
    const temples = [[22, 205], [-95, 225]].map(([x, z]) => ({ x, z, yaw: 0, y: sc.y(x, z) - 0.4 }));
    sc.instances(partsOf(C.roundTemple({ r: 7.5, h: 8 })), temples, {});
    temples.forEach(p => taken.push([p.x, p.z, 14]));
    const fnt = C.fountain({ r: 7 }), FX = -8, FZ = 50;
    sc.place(fnt, FX, FZ, { y: sc.y(FX, FZ) - 0.2 }); taken.push([FX, FZ, 11]);
    const jet = fnt.userData.jet.clone().add(fnt.position);
    anim.push((dt, time) => {
      C.FLAG_TIME.value = time;
      for (let i = 0; i < view.fx.count(70, dt); i++) {
        const a = rng() * 6.283, s = 1.2 + rng() * 1.6;
        view.fx.spark(jet.x, jet.y - 0.5, jet.z, Math.cos(a) * s, 8 + rng() * 3, Math.sin(a) * s, [0.75, 0.88, 1], 0.32, 1.3);
      }
    });

    // grandstands with crowds along the Avenue
    const stand = P.grandstand({ w: 30, rows: 6, color: 0xb3122a }), stand2 = P.grandstand({ w: 30, rows: 6, color: 0x1f3f8a });
    const seats = [], standsA = [], standsB = [];
    const M = new THREE.Matrix4(), V = new THREE.Vector3(), Q = new THREE.Quaternion(), UP = new THREE.Vector3(0, 1, 0), ONE = new THREE.Vector3(1, 1, 1);
    const putStand = (list, proto, p) => {
      list.push(p); M.compose(V.set(p.x, p.y, p.z), Q.setFromAxisAngle(UP, p.yaw), ONE);
      for (const st of proto.seats) if (rng() < 0.82) { const w = new THREE.Vector3(st[0], st[1], st[2]).applyMatrix4(M); seats.push({ x: w.x, y: w.y, z: w.z, yaw: p.yaw + rng.range(-0.4, 0.4) }); }
      taken.push([p.x, p.z, 20]);
    };
    sc.along({ from: 44.15, to: 1.0, side: -1, offset: 6.5, spacing: 34 }).forEach((p, i) => putStand(i % 2 ? standsB : standsA, i % 2 ? stand2 : stand, p));
    sc.along({ from: 44.3, to: 0.75, side: 1, offset: 18, spacing: 36, phase: 10 }).forEach((p, i) => putStand(i % 2 ? standsA : standsB, i % 2 ? stand : stand2, p));
    sc.instances(partsOf(stand.group), standsA, {});
    sc.instances(partsOf(stand2.group), standsB, {});
    sc.instances(partsOf(C.crowdPerson()), seats, { scale: [0.95, 1.2], tints: P.CROWD_TINTS, cast: false });

    // flagpoles and lamps lining the Avenue
    const flagA = partsOf(C.flagpole({ a: 0xb3122a, b: 0xd4af37 })), flagB = partsOf(C.flagpole({ a: 0x1f3f8a, b: 0xf2efe6 })), flagC = partsOf(C.flagpole({ a: 0xd4af37, b: 0x1f3f8a }));
    const avFlags = sc.along({ from: 43.5, to: 2.0, side: 1, offset: 13.2, spacing: 12 });
    sc.instances(flagA, avFlags.filter((_, i) => i % 3 === 0), {});
    sc.instances(flagB, avFlags.filter((_, i) => i % 3 === 1), {});
    sc.instances(flagC, avFlags.filter((_, i) => i % 3 === 2), {});
    sc.instances(flagA, obeliskRing.filter((_, k) => k % 2 === 0), { scale: 0.7 });
    sc.instances(flagB, obeliskRing.filter((_, k) => k % 2 === 1), { scale: 0.7 });
    const southFlags = sc.along({ from: 43.7, to: 1.6, side: -1, offset: 1.4, spacing: 34, phase: 32 });
    sc.instances(flagA, southFlags, {});
    const lamp = partsOf(C.streetLamp());
    const lamps = [
      ...sc.along({ from: 43.5, to: 2.0, side: 1, offset: 13.2, spacing: 12, phase: 6 }),
      ...sc.along({ from: 11.7, to: 19.2, side: 1, offset: 4.8, spacing: 22 }), ...sc.along({ from: 11.7, to: 19.2, side: -1, offset: 4.8, spacing: 22, phase: 11 }),
      ...sc.along({ from: 22.5, to: 43.2, side: 1, offset: 12.8, spacing: 26 }),
    ].filter(p => !reach(p.x, p.z, 0.6) && free(p.x, p.z));
    for (let z = POOL.z0; z <= POOL.z1; z += 15) lamps.push({ x: POOL.x1 + 3.5, z, y: sc.y(POOL.x1 + 3.5, z), yaw: 0 });
    sc.instances(lamp, lamps, { cast: false });

    // the reflecting pool: a stone balustrade along its far side and ends
    const bal = partsOf(C.balustrade(4)), balSpots = [];
    for (let z = POOL.z0 + 2; z < POOL.z1 - 1; z += 4) balSpots.push({ x: POOL.x1 + 1.6, z, y: sc.y(POOL.x1 + 1.6, z), yaw: Math.PI / 2 });
    for (const zz of [POOL.z0 - 1.6, POOL.z1 + 1.6]) for (let x = POOL.x1 - 2; x > POOL.x0 + 2; x -= 4) if (!reach(x, zz, 0.5)) balSpots.push({ x, z: zz, y: sc.y(x, zz), yaw: 0 });
    sc.instances(bal, balSpots, { sink: 0.05, cast: false });

    // the Mall: protest signs and clipped topiary to thread between on the shortcut (solid)
    const mallSpots = [[118, 160], [104, 176], [130, 182], [114, 198], [100, 212], [134, 208], [120, 222], [108, 154], [138, 160], [126, 236]];
    const signSpots = [], topiSpots = [];
    mallSpots.forEach(([x, z], k) => { const spot = { x, z, y: sc.y(x, z), yaw: rng() * 6.28 }; (k % 3 === 2 ? topiSpots : signSpots).push(spot); });
    const signA = partsOf(C.signCluster(3)), signB = partsOf(C.signCluster(8));
    sc.instances(signA, signSpots.filter((_, k) => k % 2 === 0), { scale: 1.5, solid: 2.6 });
    sc.instances(signB, signSpots.filter((_, k) => k % 2 === 1), { scale: 1.5, solid: 2.6 });
    sc.instances(partsOf(P.bush(9, { color: 0x3f8a3a })), topiSpots, { scale: [2.0, 2.4], solid: 2.2 });
    // a few more signs where the crowds gather
    const crowdSigns = [[0.7, 1, 4], [43.9, 1, 3], [13.4, -1, 15], [36.0, -1, 14], [9.6, 1, 6]].map(([at, side, off]) => sc.beside(at, side, off + (side > 0 ? track.outerL[track.indexAtCp(at)] : track.outerR[track.indexAtCp(at)]))).filter(p => free(p.x, p.z));
    sc.instances(signB, crowdSigns, { scale: 1.4 }); crowdSigns.forEach(p => taken.push([p.x, p.z, 4]));

    // cherry trees: the Climb, the pool, the Mall and the capitol grounds
    const cherrySpots = [
      ...sc.along({ from: 11.6, to: 19.3, side: 1, offset: 13.5, spacing: 7, jitter: 1.5 }), ...sc.along({ from: 11.6, to: 19.3, side: -1, offset: 13.5, spacing: 7, jitter: 1.5 }),
      ...sc.along({ from: 11.6, to: 19.3, side: 1, offset: 21, spacing: 9, jitter: 2.5 }), ...sc.along({ from: 11.6, to: 19.3, side: -1, offset: 21, spacing: 9, jitter: 2.5 }),
      ...sc.along({ from: 10.2, to: 11.6, side: 1, offset: 13.5, spacing: 8, jitter: 1 }),
    ];
    for (let z = POOL.z0 - 6; z <= POOL.z1 + 6; z += 9) for (const dx of [10, 17]) cherrySpots.push({ x: POOL.x1 + dx + rng.range(-1.5, 1.5), z: z + rng.range(-2, 2), y: 0 });
    cherrySpots.push(...sc.scatter({ count: 60, min: 14, max: 70, maxSlope: 0.5, minGap: 7, where: (x, z) => (onPlateau(x, z, 1.6) && !onPlateau(x, z, 1.02)) || (x > -60 && x < 100 && z > 20 && z < 95) }));
    const cherries = cherrySpots.filter(p => ok(p.x, p.z, 1.5)).map(p => ({ ...p, y: sc.y(p.x, p.z) }));
    const chA = partsOf(C.cherryTree(1, { h: 6.5 })), chB = partsOf(C.cherryTree(4, { h: 7.2, pinkA: 0xf9c7da, pinkB: 0xf2a2c2 })), chC = partsOf(C.cherryTree(7, { h: 5.8, pinkA: 0xf4a6c4, pinkB: 0xe57aa6 }));
    sc.instances(chA, cherries.filter((_, i) => i % 3 === 0), { scale: [0.85, 1.25], yaw: 'random', tilt: 0.04 });
    sc.instances(chB, cherries.filter((_, i) => i % 3 === 1), { scale: [0.85, 1.25], yaw: 'random', tilt: 0.04 });
    sc.instances(chC, cherries.filter((_, i) => i % 3 === 2), { scale: [0.85, 1.25], yaw: 'random', tilt: 0.04 });

    // hedges and flower beds: formal gardens on the lawns and round the capitol
    const hedgeSpots = [];
    for (const [x0, z0, x1, z1] of [[-40, 30, 20, 30], [-40, 72, 20, 72], [60, 30, 100, 30], [60, 74, 100, 74], [-120, 175, -50, 175], [-120, 120, -50, 120]]) {
      const n = Math.round(Math.hypot(x1 - x0, z1 - z0) / 6.2);
      for (let k = 0; k <= n; k++) { const x = x0 + (x1 - x0) * k / n, z = z0 + (z1 - z0) * k / n; hedgeSpots.push({ x, z, y: 0, yaw: Math.atan2(z1 - z0, x1 - x0) * -1 }); }
    }
    const hedges = hedgeSpots.filter(p => ok(p.x, p.z, 1)).map(p => ({ ...p, y: sc.y(p.x, p.z) }));
    sc.instances(partsOf(C.hedge(6)), hedges, { sink: 0.05 });
    const beds = [[FX + 14, FZ], [FX - 14, FZ], [FX, FZ + 14], [FX, FZ - 14], [70, 52], [10, 52], [-40, 200], [-130, 200], [-85, 192], [205, 40], [205, 238], [80, 300], [150, 300]]
      .map(([x, z]) => ({ x, z, y: sc.y(x, z), yaw: 0 })).filter(p => ok(p.x, p.z, 1));
    sc.instances(partsOf(C.flowerBed(2)), beds.filter((_, i) => i % 2 === 0), { scale: [0.9, 1.3] });
    sc.instances(partsOf(C.flowerBed(5, { colors: [0xffffff, 0xf7b8d0, 0xd4af37] })), beds.filter((_, i) => i % 2 === 1), { scale: [0.9, 1.3] });

    // woods everywhere outside the formal gardens, oaks dotted over the lawns
    const formal = (x, z) => (Math.abs(z) < 48 && x > -150 && x < 175) || (x > -45 && x < 140 && z > 20 && z < 95) || inMall(x, z) || (x > 148 && x < 232 && z > 30 && z < 250) || onPlateau(x, z, 1.2);
    const woods = sc.scatter({ count: 440, min: 13, max: 230, maxSlope: 0.8, minGap: 5.5, where: (x, z) => !formal(x, z) && ok(x, z, 1.5) });
    const oakA = partsOf(P.roundTree(1, { h: 8, leafA: 0x4f9e3f, leafB: 0x6fbf4a })), oakB = partsOf(P.roundTree(2, { h: 9.5, leafA: 0x3f8f3a, leafB: 0x5cae45 })), oakC = partsOf(P.roundTree(3, { h: 7, leafA: 0x6bb84a, leafB: 0x8fcc5a }));
    for (const near of [true, false]) {                                  // distant trees skip the shadow pass
      const set = woods.filter(p => (p.dist < 60) === near), o = { yaw: 'random', tilt: 0.04, cast: near };
      sc.instances(oakA, set.filter((_, i) => i % 3 === 0), { ...o, scale: [0.85, 1.5] });
      sc.instances(oakB, set.filter((_, i) => i % 3 === 1), { ...o, scale: [0.85, 1.6] });
      sc.instances(oakC, set.filter((_, i) => i % 3 === 2), { ...o, scale: [0.85, 1.4] });
    }
    const lawnOaks = sc.scatter({ count: 45, min: 14, max: 140, maxSlope: 0.4, minGap: 16, where: (x, z) => formal(x, z) && !inMall(x, z) && !onPlateau(x, z, 1.2) && ok(x, z, 1.5) });
    sc.instances(oakB, lawnOaks, { scale: [1.0, 1.5], yaw: 'random', tilt: 0.03 });
    // the strips between the Filibuster's legs: a row of cherries and lamps
    const strip = [];
    for (let x = -150; x <= -95; x += 7) strip.push({ x, z: 73.5 + rng.range(-1, 1) }, { x: x + 3.5, z: 122.5 + rng.range(-1, 1) });
    const stripOk = strip.filter(p => ok(p.x, p.z, 0.8)).map(p => ({ ...p, y: sc.y(p.x, p.z) }));
    sc.instances(partsOf(C.cherryTree(9, { h: 6 })), stripOk, { scale: [0.8, 1.1], yaw: 'random' });
    const low = sc.scatter({ count: 170, min: 12.5, max: 60, maxSlope: 0.7, minGap: 2.6, where: (x, z) => ok(x, z, 0.8) && !inMall(x, z) });
    sc.instances(partsOf(P.bush(1, { color: 0x4f9e3f })), low.filter((_, i) => i % 3 === 0), { scale: [0.8, 1.6], yaw: 'random', cast: false });
    sc.instances(partsOf(P.bush(2, { color: 0x5fae45, flower: 0xf7b8d0 })), low.filter((_, i) => i % 3 === 1), { scale: [0.8, 1.5], yaw: 'random', cast: false });
    sc.instances(partsOf(P.bush(3, { color: 0x478f3d, flower: 0xffffff })), low.filter((_, i) => i % 3 === 2), { scale: [0.8, 1.5], yaw: 'random', cast: false });

    // arrow boards on the outside of every real corner
    const chevR = [], chevL = [];
    for (const c of track.corners) {
      const side = c.dir > 0 ? -1 : 1, n = Math.max(2, Math.min(5, Math.round(c.len / 15)));
      for (let k = 0; k < n; k++) {
        const i = (c.i0 + Math.round(((k + 0.6) / n) * (c.len / track.ds))) % track.N;
        if (track.tunnel[i]) continue;
        const p = sc.beside(track.cp[i], side, (side > 0 ? track.outerL[i] : track.outerR[i]) + 1.2);
        (c.dir > 0 ? chevL : chevR).push({ x: p.x, z: p.z, y: p.y + 0.9, yaw: p.yaw });
      }
    }
    const chevMirror = P.chevronBoard(0xb3122a); chevMirror.scale.x = -1;    // mirrored once, then instanced
    sc.instances(partsOf(P.chevronBoard(0xb3122a)), chevR, {});
    const mirrored = partsOf(chevMirror);
    for (const part of mirrored) {                                        // a mirror flips the winding: put it back
      const g = part.geometry;
      if (g.index) { const ix = g.index.array; for (let k = 0; k < ix.length; k += 3) { const t = ix[k + 1]; ix[k + 1] = ix[k + 2]; ix[k + 2] = t; } g.index.needsUpdate = true; }
      else for (const name of Object.keys(g.attributes)) { const at = g.attributes[name], n = at.itemSize; for (let v = 0; v < at.count; v += 3) for (let c = 0; c < n; c++) { const t = at.array[(v + 1) * n + c]; at.array[(v + 1) * n + c] = at.array[(v + 2) * n + c]; at.array[(v + 2) * n + c] = t; } at.needsUpdate = true; }
    }
    sc.instances(mirrored, chevL, {});

    jokes(ctx, sc, { seats, stands: [...standsA, ...standsB], gantryAt: g0, reach });

    // hot-air balloons over the district
    const cols = [[0xb3122a, 0xf2efe6], [0x1f3f8a, 0xf2efe6], [0xd4af37, 0xf2efe6], [0xf7b8d0, 0xffffff], [0xb3122a, 0x1f3f8a]];
    const balloons = cols.map((c, i) => { const b = P.balloon(c); const a = (i / cols.length) * Math.PI * 2 + 0.5, r = 220 + (i % 2) * 80; b.position.set(Math.cos(a) * r, 62 + i * 8, 120 + Math.sin(a) * r); b.scale.setScalar(1.4 + (i % 3) * 0.3); ctx.group.add(b); return b; });
    anim.push((dt, time) => { balloons.forEach((b, i) => { b.position.y += Math.sin(time * 0.4 + i * 1.7) * dt * 0.8; b.rotation.y += dt * 0.05; }); });
  },
};

/* ---------- the joke pass ---------- */
// the revolving door complex sits on the lawn between the Avenue and the Climb, its axis running NW (REGULATOR) to SE (INDUSTRY)
const COMPLEX = { x: 62, z: 52, yaw: Math.PI / 4, off: 19 };
const STATUE = { x: 200, z: 262 };        // at the head of the reflecting pool, looking down it
const CANNON = { x: 121, z: 114 };        // beside the Climb, aimed at the dome
const LECTERN = { x: -238, z: 124 };      // beyond hairpin one
const MAZE = { x: -222, z: 18 };          // beyond hairpin three
const BOARDS = [
  [1.3, 1, 24, 'THOUGHTS AND PRAYERS (AND NOTHING ELSE)', '#1f3f8a', '#ffffff'], [3.4, 1, 22, 'YOUR CALL IS IMPORTANT TO OUR DONORS', '#ffffff', '#b3122a'],
  [4.2, -1, 18, 'TERM LIMITS: STILL IN COMMITTEE', '#d4af37', '#12142b'], [8.6, 1, 20, 'BIPARTISAN AGREEMENT: NAP TIME', '#b3122a', '#ffffff'],
  [9.8, 1, 24, 'DOES TIKTOK USE WIFI?', '#12142b', '#ffd23c'], [12.9, -1, 22, 'THE INTERNET IS A SERIES OF TUBES', '#ffffff', '#1f3f8a'],
  [14.6, 1, 18, 'THIS HEARING BROUGHT TO YOU BY THE WITNESS', '#f2efe6', '#12142b'], [16.8, -1, 18, 'I YIELD MY TIME TO MY DONORS', '#1f3f8a', '#ffd23c'],
  [24.0, 1, 22, 'INSIDER TRADING: MEMBERS ONLY', '#16a34a', '#ffffff'], [28.0, 1, 16, 'BILL: 4,000 PAGES. READ: 0', '#ffffff', '#12142b'],
  [31.5, -1, 20, 'PASS IT. READ IT LATER.', '#b3122a', '#ffffff'], [35.0, 1, 16, 'SHUTDOWN SEASON TICKETS ON SALE', '#ffd23c', '#12142b'],
  [37.5, -1, 22, 'NEW TARIFF? CHECK YOUR NOTIFICATIONS', '#12142b', '#ffffff'], [42.0, 1, 18, 'CAMPAIGN PROMISES RECYCLED HERE', '#16a34a', '#ffffff'],
  [44.3, 1, 26, 'LOBBYISTS: USE SIDE ENTRANCE', '#d4af37', '#12142b'],
];
const CROWD = ['OBJECTION!', 'I YIELD', 'NO COMMENT', 'PAY TO PLAY', 'SO MOVED', 'RECESS!', 'FILIBUSTER!', 'SPEAK UP, SENATOR', 'HONK FOR GRIDLOCK', 'MORE HEARINGS'];
const MONO = '"Courier New", Courier, monospace';

function jokes(ctx, sc, { seats, stands, gantryAt, reach }) {
  const { THREE, track, anim, view } = ctx, rng = sc.rng, group = ctx.group;
  const bake = C.makeBaker(group, sc.shadows), atlas = C.makeAtlas(group), F = C.SIGN_FONT, SANS = C.SANS, signDraw = C.signDraw, fitText = C.fitText;
  const yawTo = (from, to) => Math.atan2(to.x - from.x, to.z - from.z);
  const roadPt = cp => { const i = track.indexAtCp(cp); return { x: track.px[i], y: track.py[i], z: track.pz[i], i }; };
  const toWorld = (o, l) => { const c = Math.cos(o.yaw), s = Math.sin(o.yaw), k = o.scale ?? 1; return [o.x + (l[0] * c + l[2] * s) * k, o.y + l[1] * k, o.z + (-l[0] * s + l[2] * c) * k]; };
  const posts = new ModelBuilder();
  const pole = (x, z, y0, y1, r = 0.22) => posts.add('pole', cyl(r, r, Math.max(0.1, y1 - y0), 8), { p: [x, (y0 + y1) / 2, z] });
  const leaderLap = () => { const race = view.race; let lap = 1; if (race?.karts) for (const k of race.karts) if (Number.isFinite(k.lap)) lap = Math.max(lap, Math.min(k.lap, (race.laps ?? 3) + 1)); return lap; };

  /* ---- 1. the centerpiece: a giant revolving door between REGULATOR and INDUSTRY ---- */
  const cx = C.revolvingDoorComplex({ off: COMPLEX.off }), cy = sc.y(COMPLEX.x, COMPLEX.z) - 0.4;
  sc.place(cx, COMPLEX.x, COMPLEX.z, { yaw: COMPLEX.yaw, y: cy });
  const door = cx.userData.door; door.removeFromParent();
  const co = { x: COMPLEX.x, y: cy, z: COMPLEX.z, yaw: COMPLEX.yaw };
  door.position.set(COMPLEX.x, cy, COMPLEX.z); door.rotation.y = COMPLEX.yaw; group.add(door);
  bake.add(cx);
  const sg = cx.userData.signs;
  const sReg = atlas.add(1024, 240, (g, w, h) => { g.fillStyle = '#f2efe6'; g.fillRect(0, 0, w, h); g.strokeStyle = '#d4af37'; g.lineWidth = 14; g.strokeRect(10, 10, w - 20, h - 20); fitText(g, 'REGULATOR', w / 2, h * 0.55, w * 0.88, 180, F, '#1f3f8a', { lines: 1 }); });
  const sInd = atlas.add(1024, 240, (g, w, h) => { g.fillStyle = '#12142b'; g.fillRect(0, 0, w, h); g.strokeStyle = '#38ff74'; g.lineWidth = 14; g.strokeRect(10, 10, w - 20, h - 20); fitText(g, 'INDUSTRY', w / 2, h * 0.55, w * 0.88, 180, F, '#38ff74', { lines: 1 }); });
  atlas.place2(sReg, toWorld(co, sg.reg), COMPLEX.yaw, 22, 5.15);
  atlas.place2(sInd, toWorld(co, sg.ind), COMPLEX.yaw, 22, 5.15);
  const sDoor = atlas.add(1024, 330, (g, w, h) => {
    g.fillStyle = '#d4af37'; g.fillRect(0, 0, w, h); g.fillStyle = '#12142b'; g.fillRect(12, 12, w - 24, h - 24);
    fitText(g, 'REVOLVING DOOR', w / 2, h * 0.38, w * 0.84, 150, F, '#ffd23c', { lines: 1 });
    fitText(g, 'SAME PEOPLE, NEW BUSINESS CARDS', w / 2, h * 0.76, w * 0.84, 62, SANS, '#ffffff', { lines: 1 });
    for (const [x0, dir] of [[w * 0.06, 1], [w * 0.94, -1]]) { g.strokeStyle = '#ffd23c'; g.lineWidth = 12; g.beginPath(); g.arc(x0, h * 0.4, 30, dir > 0 ? 0.3 : 3.4, dir > 0 ? 5.5 : 8.6); g.stroke(); }
  });
  atlas.place2(sDoor, toWorld(co, sg.door), COMPLEX.yaw, 30, 9.7);
  for (const k of ['reg', 'ind']) for (const d of [-7, 7]) { const p = toWorld(co, [sg[k][0] + d, 0, 0]); pole(p[0], p[2], cy + sg[k][1] - 7, cy + sg[k][1] - 2.4, 0.3); }
  { const p = toWorld(co, [0, 0, 0]); for (const d of [-9, 9]) { const q = toWorld(co, [d, 0, 0]); pole(q[0], q[2], cy + 26, cy + sg.door[1] - 4.6, 0.35); } void p; }
  // the suits inside, going round with the door
  const SUITS = [0, 1, 2, 3].flatMap(k => [[4.4, k * Math.PI / 2 - 0.16], [7.0, k * Math.PI / 2 + 0.14]]);   // two per quarter of the door
  const suits = sc.instances(partsOf(C.suit()), SUITS.map(() => ({ x: COMPLEX.x, y: cy, z: COMPLEX.z, yaw: 0 })), { tints: C.SUIT_TINTS, cast: false });
  for (const m of suits) m.frustumCulled = false;
  const Ms = new THREE.Matrix4(), Qs = new THREE.Quaternion(), Ps = new THREE.Vector3(), Ss = new THREE.Vector3(3.3, 3.3, 3.3), Ys = new THREE.Vector3(0, 1, 0);

  /* ---- 2. the Avenue: the congressional portfolio, on a stock ticker you cannot miss ---- */
  const tickAt = sc.beside(2.0, 1, 40), tickYaw = yawTo(tickAt, { x: -20, z: 0 }), tickY = tickAt.y + 16;
  const ticker = C.ledPanel(group, 1024, 300, [{ c: [tickAt.x, tickY, tickAt.z], yaw: tickYaw }], 36, 10.5);
  for (const d of [-12, 12]) pole(tickAt.x + Math.cos(tickYaw) * d - Math.sin(tickYaw) * 0.4, tickAt.z - Math.sin(tickYaw) * d - Math.cos(tickYaw) * 0.4, tickAt.y - 0.5, tickY - 4, 0.45);
  const TAPE = 'BOUGHT DEFENSE STOCK ▲ DAY BEFORE THE VOTE ▲ SOLD EVERYTHING ▲ DAY BEFORE THE CRASH ▲ STOCK ACT? NEVER HEARD OF IT ▲ DISCLOSURE FILED 2 YEARS LATE ▲ ';
  let tapeW = 0;
  const drawTicker = time => ticker.draw((g, w, h) => {
    g.fillStyle = '#07090c'; g.fillRect(0, 0, w, h);
    g.font = `bold 50px ${MONO}`; g.textBaseline = 'middle'; g.textAlign = 'left'; g.fillStyle = '#ffb020'; g.fillText('CONGRESSIONAL PORTFOLIO', 30, 46);
    g.textAlign = 'right'; g.fillStyle = '#38ff74'; g.fillText('▲', w - 30, 46);
    g.textAlign = 'center'; g.font = `bold 150px ${MONO}`; g.fillStyle = '#38ff74'; g.fillText('UP 400%', w * 0.5, 148);
    g.font = `bold 34px ${MONO}`; g.fillStyle = '#ff5a4a'; g.fillText('YOUR 401(K): UP 3%', w * 0.5, 222);
    g.fillStyle = '#12161d'; g.fillRect(0, 248, w, 52);
    g.font = `bold 38px ${MONO}`; g.textAlign = 'left'; g.fillStyle = '#ffd23c'; if (!tapeW) tapeW = g.measureText(TAPE).width;
    const x = -((time * 140) % tapeW); g.fillText(TAPE, x, 275); g.fillText(TAPE, x + tapeW, 275);
  });

  /* ---- 3. at the head of the reflecting pool: a senator, on a flip phone ---- */
  {
    const yaw = yawTo(STATUE, { x: 155, z: 140 }), y = sc.y(STATUE.x, STATUE.z) - 0.3, st = C.phoneStatue(), S = 1.6;
    sc.place(st, STATUE.x, STATUE.z, { yaw, y, scale: S }); bake.add(st);
    const o = { x: STATUE.x, y, z: STATUE.z, yaw, scale: S };
    const s = atlas.add(1024, 300, (g, w, h) => { g.fillStyle = '#e8e1d0'; g.fillRect(0, 0, w, h); g.strokeStyle = '#8a7f6a'; g.lineWidth = 8; g.strokeRect(16, 16, w - 32, h - 32); fitText(g, 'HOW DO I EMAIL A PDF?', w / 2, h * 0.53, w * 0.86, 150, F, '#3a3328'); });
    atlas.place(s, toWorld(o, [0, 2.9, 4.03]), yaw, 9.4 * S, 2.75 * S);
    // a speech bubble beside his head (cut out of its own canvas so the corners stay clear)
    const bub = canvasTex(512, 300, (g, w, h) => {
      g.clearRect(0, 0, w, h); g.fillStyle = '#ffffff'; g.strokeStyle = '#12142b'; g.lineWidth = 10;
      g.beginPath(); g.ellipse(w * 0.52, h * 0.42, w * 0.44, h * 0.36, 0, 0, 7); g.moveTo(w * 0.24, h * 0.62); g.lineTo(w * 0.1, h * 0.95); g.lineTo(w * 0.38, h * 0.7); g.fill(); g.stroke();
      fitText(g, 'HELLO? IS THIS THE INTERNET?', w * 0.52, h * 0.42, w * 0.7, 64, F, '#12142b', { maxH: h * 0.55 });
    }, { repeat: false });
    const bq = new C.Quads(), bc = toWorld(o, [-7.0, 18.5, 1.2]);
    bq.panel(bc, yaw, 11 * S, 6.4 * S, [0, 0, 1, 1]); bq.panel([bc[0] - Math.sin(yaw) * 0.05, bc[1], bc[2] - Math.cos(yaw) * 0.05], yaw + Math.PI, 11 * S, 6.4 * S, [0, 0, 1, 1]);   // the back reads the right way round too
    const bm = new THREE.Mesh(bq.geometry(), new THREE.MeshStandardMaterial({ map: bub, alphaTest: 0.5, roughness: 0.6, emissive: 0xffffff, emissiveMap: bub, emissiveIntensity: 0.2 }));
    bm.matrixAutoUpdate = false; group.add(bm);
  }

  /* ---- 4. the obelisk: the debt ceiling, raised every lap ---- */
  const ob = { y: sc.y(OBELISK.x, OBELISK.z) - 0.3 };
  const collar = new THREE.Group(), cb = new ModelBuilder();
  for (const [x, z, w, d] of [[0, 1, 2.3, 0.3], [0, -1, 2.3, 0.3], [1, 0, 0.3, 2.3], [-1, 0, 0.3, 2.3]]) cb.add('g', new THREE.BoxGeometry(w, 1.4, d), { p: [x, 0, z] });
  collar.add(cb.build({ g: paint(0xd4af37, { rough: 0.3, metal: 0.7, clear: 0.4 }) }, { cast: false })); group.add(collar);
  const ceilTex = canvasTex(512, 128, (g, w, h) => { g.fillStyle = '#b3122a'; g.fillRect(0, 0, w, h); g.strokeStyle = '#ffd23c'; g.lineWidth = 8; g.strokeRect(6, 6, w - 12, h - 12); fitText(g, 'DEBT CEILING', w / 2, h * 0.55, w - 50, 96, F, '#ffffff', { lines: 1 }); }, { repeat: false });
  const ceilMat = new THREE.MeshStandardMaterial({ map: ceilTex, roughness: 0.6, emissive: 0xffffff, emissiveMap: ceilTex, emissiveIntensity: 0.2 });
  { const q = new C.Quads(); for (let k = 0; k < 4; k++) { const a = k * Math.PI / 2; q.panel([Math.sin(a) * 1.08, -1.8, Math.cos(a) * 1.08], a, 3.1, 1.9, [0, 0, 1, 1]); } collar.add(new THREE.Mesh(q.geometry(), ceilMat)); }   // four faces, one mesh, scaled with the collar
  const halfSide = y => (3.55 + (2.35 - 3.55) * Math.min(1, Math.max(0, (y - 3.1) / 26))) / Math.SQRT2;
  const ceil = { y: 6 };

  /* ---- 5. beside the Climb: the K Street cash cannon, firing at the dome ---- */
  const capTop = (() => { const i0 = track.indexAtCp(20), i1 = track.indexAtCp(22); return new THREE.Vector3((track.px[i0] + track.px[i1]) / 2, track.py[i0] + 40, (track.pz[i0] + track.pz[i1]) / 2); })();
  const can = C.cashCannon(), canYaw = yawTo(CANNON, { x: capTop.x, z: capTop.z }), canY = sc.y(CANNON.x, CANNON.z) - 0.2;
  sc.place(can, CANNON.x, CANNON.z, { yaw: canYaw, y: canY, scale: 1.3 });
  const muzzle = new THREE.Vector3(...toWorld({ x: CANNON.x, y: canY, z: CANNON.z, yaw: canYaw, scale: 1.3 }, can.userData.muzzle));
  bake.add(can);
  {
    const at = toWorld({ x: CANNON.x, y: canY, z: CANNON.z, yaw: canYaw }, [0, 0, -9]), y0 = sc.y(at[0], at[2]);
    const s = atlas.add(1024, 300, (g, w, h) => { g.fillStyle = '#12142b'; g.fillRect(0, 0, w, h); g.fillStyle = '#d4af37'; g.fillRect(0, h * 0.84, w, h * 0.16); fitText(g, 'K STREET CASH CANNON', w / 2, h * 0.36, w * 0.9, 120, F, '#ffd23c', { lines: 1 }); fitText(g, "IT'S NOT A BRIBE, IT'S SPEECH", w / 2, h * 0.68, w * 0.84, 60, SANS, '#ffffff', { lines: 1 }); });
    const fy = yawTo({ x: at[0], z: at[2] }, roadPt(11.2));
    atlas.place2(s, [at[0], y0 + 7, at[2]], fy, 15, 4.4);
    for (const d of [-5.5, 5.5]) pole(at[0] + Math.cos(fy) * d, at[2] - Math.sin(fy) * d, y0 - 0.5, y0 + 4.9, 0.25);
  }
  const BILLS = 44, bills = new THREE.InstancedMesh(C.billGeometry(), C.billMaterial(), BILLS); bills.frustumCulled = false; group.add(bills);
  const billT = Array.from({ length: BILLS }, (_, k) => k / BILLS * 5.2), billSeed = Array.from({ length: BILLS }, () => [rng.range(-6, 6), rng.range(-4, 4), rng() * 6.28, rng.range(2, 5)]);
  const Mb = new THREE.Matrix4(), Qb = new THREE.Quaternion(), Eb = new THREE.Euler(), Pb = new THREE.Vector3(), Sb = new THREE.Vector3(1, 1, 1);

  /* ---- 6. the capitol: tonight's hearing on the marquee, and a price tag on the dome ---- */
  {
    const i0 = track.indexAtCp(20), i1 = track.indexAtCp(22), x0 = (track.px[i0] + track.px[i1]) / 2, z0 = (track.pz[i0] + track.pz[i1]) / 2;
    const len = Math.hypot(track.px[i1] - track.px[i0], track.pz[i1] - track.pz[i0]), L = (len + 0.4) / 2, yaw = Math.atan2(track.px[i1] - track.px[i0], track.pz[i1] - track.pz[i0]);
    const o = { x: x0, y: track.py[i0], z: z0, yaw };
    const mq = new ModelBuilder(), mc = toWorld(o, [0, 13.3, -(L + 2.2)]);
    mq.add('box', box(26, 4.6, 2.4, 0.3, 2), { p: mc, r: [0, yaw, 0] });
    bake.builder(mq, { box: plastic(0x12142b, 0.5, 0.3) }, false);
    const s = atlas.add(1024, 200, (g, w, h) => {
      g.fillStyle = '#12142b'; g.fillRect(0, 0, w, h); g.fillStyle = '#fff1b8';
      for (let x = 14; x < w; x += 30) { g.beginPath(); g.arc(x, 12, 6, 0, 7); g.fill(); g.beginPath(); g.arc(x, h - 12, 6, 0, 7); g.fill(); }
      g.fillStyle = '#ffffff'; g.fillRect(30, 30, w - 60, h - 60);
      fitText(g, 'NOW IN SESSION', w / 2, h * 0.33, w * 0.6, 40, SANS, '#b3122a', { lines: 1 });
      fitText(g, '"SENATOR, WE RUN ADS"', w / 2, h * 0.62, w * 0.86, 90, F, '#12142b', { lines: 1 });
    });
    atlas.place(s, [mc[0] + Math.sin(yaw + Math.PI) * 1.22, mc[1], mc[2] + Math.cos(yaw + Math.PI) * 1.22], yaw + Math.PI, 25.4, 4.96);
    // the price tag, hung from the lantern down the south-east face of the dome
    const tagYaw = 3 * Math.PI / 4, dirX = Math.sin(tagYaw), dirZ = Math.cos(tagYaw), tc = [x0 + dirX * 13.2, track.py[i0] + 37.5, z0 + dirZ * 13.2];
    const t = atlas.add(560, 360, (g, w, h) => {
      g.fillStyle = '#fff6d8'; g.beginPath(); g.moveTo(w * 0.16, 0); g.lineTo(w, 0); g.lineTo(w, h); g.lineTo(w * 0.16, h); g.lineTo(0, h / 2); g.closePath(); g.fill();
      g.fillStyle = '#7a6a4a'; g.beginPath(); g.arc(w * 0.12, h / 2, 14, 0, 7); g.fill();
      fitText(g, 'SOLD', w * 0.58, h * 0.4, w * 0.74, 190, F, '#b3122a', { lines: 1 });
      fitText(g, 'TO THE HIGHEST BIDDER', w * 0.58, h * 0.78, w * 0.74, 44, SANS, '#12142b', { lines: 1 });
    });
    atlas.place2(t, tc, tagYaw, 13, 8.4);
    const str = new ModelBuilder(), top = new THREE.Vector3(x0 + dirX * 2.6, track.py[i0] + 47.5, z0 + dirZ * 2.6), hole = new THREE.Vector3(tc[0] - Math.cos(tagYaw) * 5.7, tc[1], tc[2] + Math.sin(tagYaw) * 5.7);
    str.add('s', new THREE.TubeGeometry(new THREE.CatmullRomCurve3([top, top.clone().lerp(hole, 0.5).add(new THREE.Vector3(dirX * 1.5, 0, dirZ * 1.5)), hole]), 12, 0.12, 5));
    bake.builder(str, { s: plastic(0x7a6a4a, 0.8) }, false);
  }

  /* ---- 6b. inside the capitol: the tunnel is a hearing-room corridor, with its own brighter atlas so it reads in the tunnel light ---- */
  {
    const inside = C.makeAtlas(group, 2048, { emissive: 0.5 }), TH = track.def.tunnelHeight ?? 7.5;
    const dark = inside.add(32, 32, g => { g.fillStyle = '#1a1d29'; g.fillRect(0, 0, 32, 32); });
    const at = (i, lat, up) => [track.px[i] + track.lx[i] * lat + track.ux[i] * up, track.py[i] + track.ly[i] * lat + track.uy[i] * up, track.pz[i] + track.lz[i] * lat + track.uz[i] * up];
    // banners across the ceiling, facing the karts coming in
    ['THIS TUNNEL BROUGHT TO YOU BY BIG KART', 'HEARING IN PROGRESS: PLEASE HONK', 'THIS TUNNEL BROUGHT TO YOU BY A SUPER PAC', 'NO QUESTIONS PAST THIS POINT', 'EXIT VIA THE REVOLVING DOOR'].forEach((t, k) => {
      const i = track.indexAtCp(20.15 + k * 0.4), yaw = Math.atan2(-track.tx[i], -track.tz[i]), c = at(i, 0, 5.6);
      const r = inside.add(1024, 256, signDraw(t, { bg: ['#b3122a', '#12142b', '#1f3f8a', '#d4af37', '#12142b'][k], fg: ['#ffffff', '#ffd23c', '#ffffff', '#12142b', '#ffffff'][k], size: 120, lines: 2, border: '#d4af37' }));
      inside.place(r, c, yaw, 7.6, 1.9);
      inside.place(dark, [c[0] - Math.sin(yaw) * 0.04, c[1], c[2] - Math.cos(yaw) * 0.04], yaw + Math.PI, 7.6, 1.9);
    });
    // framed panels down both walls: hearing-room notices and lobbyist cutouts, leaning with the arch
    const NOTES = ['HEARING ROOM B', 'QUIET: SENATOR NAPPING', 'MEMBERS-ONLY STOCK TIPS', 'NO PHONES (FLIP PHONES OK)', 'COMMITTEE ON COMMITTEES', 'TAKE A NUMBER (AND A CHECK)', 'RECESS THIS WAY', 'SPEAK SLOWLY: SENATORS PRESENT'];
    const CUTS = ['BIG OIL SAYS HI', 'BIG TECH SAYS HI', 'BIG PHARMA SAYS HI', 'BIG KART SAYS HI', 'YOUR LOBBYIST', 'HAPPY TO HELP'];
    const cutout = cap => (g, w, h) => {
      g.fillStyle = '#f6efdc'; g.fillRect(0, 0, w, h); g.strokeStyle = '#d4af37'; g.lineWidth = 12; g.strokeRect(6, 6, w - 12, h - 12);
      const cx = w * 0.3, top = h * 0.14;
      g.fillStyle = '#23262e'; g.beginPath(); g.moveTo(cx - 70, h * 0.82); g.lineTo(cx - 52, top + 110); g.lineTo(cx + 52, top + 110); g.lineTo(cx + 70, h * 0.82); g.fill();   // the suit
      g.fillStyle = '#ffffff'; g.beginPath(); g.moveTo(cx - 16, top + 110); g.lineTo(cx + 16, top + 110); g.lineTo(cx, top + 170); g.fill();
      g.fillStyle = '#b3122a'; g.fillRect(cx - 6, top + 112, 12, 60);
      g.fillStyle = '#e6b98f'; g.beginPath(); g.arc(cx, top + 62, 44, 0, 7); g.fill();
      g.fillStyle = '#c9ccd2'; g.beginPath(); g.arc(cx, top + 52, 46, Math.PI, 0); g.fill();
      g.fillStyle = '#23262e'; g.beginPath(); g.arc(cx - 15, top + 64, 5, 0, 7); g.arc(cx + 15, top + 64, 5, 0, 7); g.fill();
      g.strokeStyle = '#23262e'; g.lineWidth = 5; g.beginPath(); g.arc(cx, top + 76, 20, 0.2, Math.PI - 0.2); g.stroke();   // the grin
      for (let k = 0; k < 5; k++) { g.save(); g.translate(cx + 80, top + 150); g.rotate(-0.6 + k * 0.25); g.fillStyle = '#9fd6a0'; g.fillRect(0, -14, 70, 28); g.strokeStyle = '#2f6b3a'; g.lineWidth = 3; g.strokeRect(0, -14, 70, 28); g.restore(); }
      fitText(g, cap, w * 0.72, h * 0.5, w * 0.48, 80, F, '#12142b', { maxH: h * 0.7 });
    };
    let n = 0;
    for (let cp = 20.08; cp < 21.95; cp += 0.17) for (const s of [1, -1]) {
      const i = track.indexAtCp(cp), half = (track.hwL[i] + track.hwR[i]) / 2 + 0.7, up = 2.7, lat = s * (half * Math.sqrt(1 - (up / TH) ** 2) - 0.12);
      const yaw = Math.atan2(-s * track.lx[i], -s * track.lz[i]), k = n++;
      const r = k % 3 === 1 ? inside.add(512, 300, cutout(CUTS[Math.floor(k / 3) % CUTS.length])) : inside.add(512, 300, signDraw(NOTES[k % NOTES.length], { bg: k % 2 ? '#12142b' : '#f2efe6', fg: k % 2 ? '#ffd23c' : '#1f3f8a', size: 90, border: '#d4af37' }));
      inside.place(r, at(i, lat, up), yaw, 4.4, 2.58, -0.4);
    }
    inside.flush();
  }

  /* ---- 7. beyond hairpin one: the filibuster, live ---- */
  const LS = 2.1, lec = C.filibusterLectern(), lecYaw = yawTo(LECTERN, roadPt(22.6)), lecY = sc.y(LECTERN.x, LECTERN.z) - 0.4;
  sc.place(lec, LECTERN.x, LECTERN.z, { yaw: lecYaw, y: lecY, scale: LS });
  const page = lec.userData.page; lec.updateMatrixWorld(true);
  { const holder = new THREE.Group(); holder.applyMatrix4(lec.matrixWorld); page.removeFromParent(); holder.add(page); group.add(holder); }
  const lo = { x: LECTERN.x, y: lecY, z: LECTERN.z, yaw: lecYaw, scale: LS }, lf = lec.userData.face;
  bake.add(lec);
  const fili = C.ledPanel(group, 640, 500, [{ c: toWorld(lo, [lf.c[0], lf.c[1], lf.c[2] + 0.1]), yaw: lecYaw }], lf.w * LS, lf.h * LS, { intensity: 1.1, back: false });
  const pageBase = page.rotation.x;
  let filiShown = -1;

  /* ---- 8. beyond hairpin three: a gerrymandered hedge maze ---- */
  {
    // the district boundary: a lobster-shaped outline, then a few walls inside it
    const outline = [[-30, -6], [-18, -20], [-8, -8], [4, -22], [14, -10], [26, -18], [30, 0], [20, 6], [28, 16], [12, 22], [4, 10], [-6, 24], [-16, 12], [-28, 18], [-22, 4]];
    const walls = [[[-18, -20], [-12, 6]], [[4, -22], [2, 4]], [[14, -10], [20, 6]], [[-6, 24], [-4, 4]]];
    const spots = [], add = (a, b) => { const len = Math.hypot(b[0] - a[0], b[1] - a[1]), n = Math.max(1, Math.round(len / 3.2)); for (let k = 0; k < n; k++) { const f = (k + 0.5) / n, x = MAZE.x + a[0] + (b[0] - a[0]) * f, z = MAZE.z + a[1] + (b[1] - a[1]) * f; if (!reach(x, z, 1.5)) spots.push({ x, z, y: sc.y(x, z), yaw: -Math.atan2(b[1] - a[1], b[0] - a[0]) }); } };
    outline.forEach((p, k) => add(p, outline[(k + 1) % outline.length]));
    walls.forEach(([a, b]) => add(a, b));
    sc.instances(partsOf(C.hedge(3.4, { h: 2.8, color: 0x2f7d34 })), spots, { sink: 0.1 });
    const signAt = { x: MAZE.x + 30, z: MAZE.z + 12 }, y0 = sc.y(signAt.x, signAt.z), fy = yawTo(signAt, roadPt(37.0));
    const s = atlas.add(1024, 300, (g, w, h) => { g.fillStyle = '#f2efe6'; g.fillRect(0, 0, w, h); g.fillStyle = '#1f3f8a'; g.fillRect(0, 0, w, h * 0.2); fitText(g, 'HEDGE MAZE', w / 2, h * 0.1, w * 0.5, 44, SANS, '#ffffff', { lines: 1 }); fitText(g, 'DISTRICT 7', w / 2, h * 0.47, w * 0.8, 130, F, '#12142b', { lines: 1 }); fitText(g, '(FINAL SHAPE, DRAWN BY THE WINNER)', w / 2, h * 0.8, w * 0.86, 48, SANS, '#b3122a', { lines: 1 }); });
    atlas.place2(s, [signAt.x, y0 + 8.4, signAt.z], fy, 22, 6.45);
    for (const d of [-8, 8]) pole(signAt.x + Math.cos(fy) * d, signAt.z - Math.sin(fy) * d, y0 - 0.5, y0 + 5.2, 0.3);
  }

  /* ---- 9. the super PAC blimp ---- */
  const pac = P.blimp('AMERICANS FOR AMERICA', { color: 0xf2efe6, accent: 0xb3122a }); pac.scale.setScalar(1.3); group.add(pac);
  {
    const tex = canvasTex(1024, 150, (g, w, h) => { g.fillStyle = '#1f3f8a'; g.fillRect(0, 0, w, h); fitText(g, '(FUNDED BY ONE GUY)', w / 2, h * 0.56, w - 60, 110, F, '#ffffff', { lines: 1 }); }, { repeat: false });
    const m = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.7 });
    { const q = new C.Quads(); for (const s of [1, -1]) q.panel([s * 0.05, -11.5, 0], s * Math.PI / 2, 26, 3.8, [0, 0, 1, 1]); pac.add(new THREE.Mesh(q.geometry(), m)); }
    const rb = new ModelBuilder(); for (const z of [-10, 10]) rb.add('r', cyl(0.05, 0.05, 3, 4), { p: [0, -8.6, z] }); pac.add(rb.build({ r: plastic(0x23262e, 0.6) }));
  }

  /* ---- 10. the boards ---- */
  const frame = P.billboard(null, { w: 15, h: 5, legs: 6, frame: 0x2a2d36 }); frame.remove(frame.children[frame.children.length - 1]);
  BOARDS.forEach(([cp, side, off, text, bg, fg]) => {
    const p = sc.beside(cp, side, off); if (reach(p.x, p.z, 1.5)) return;
    const i = p.i, fx = Math.sin(p.yaw) - 0.75 * track.tx[i], fz = Math.cos(p.yaw) - 0.75 * track.tz[i], yaw = Math.atan2(fx, fz);
    const f = frame.clone(); sc.place(f, p.x, p.z, { yaw }); bake.add(f);
    const r = atlas.add(768, 256, (g, w, h) => {
      g.fillStyle = bg; g.fillRect(0, 0, w, h);
      fitText(g, text, w / 2 + 3, h / 2 + 7, w - 56, 110, F, 'rgba(0,0,0,0.25)', { maxH: h * 0.9 }); fitText(g, text, w / 2, h / 2 + 4, w - 56, 110, F, fg, { maxH: h * 0.9 });
      g.strokeStyle = 'rgba(212,175,55,0.8)'; g.lineWidth = 8; g.strokeRect(8, 8, w - 16, h - 16);
    });
    atlas.place(r, [p.x + Math.sin(yaw) * 0.02, p.y + 8.5, p.z + Math.cos(yaw) * 0.02], yaw, 15, 5);
    atlas.place(r, [p.x - Math.sin(yaw) * 0.46, p.y + 8.5, p.z - Math.cos(yaw) * 0.46], yaw + Math.PI, 15, 5);   // the back reads too: these legs run both ways
  });

  /* ---- 11. the start: who paid for it, who is sitting where, and what the crowd thinks ---- */
  {
    const s = atlas.add(1024, 150, signDraw('PAID FOR BY CITIZENS FOR MORE KARTS', { bg: '#1f3f8a', fg: '#ffffff', size: 90, lines: 1 }));
    atlas.place2(s, [gantryAt.x, gantryAt.roadY + 11.4, gantryAt.z], gantryAt.along, 18, 2.64);
    const lines = ["LOBBYISTS' BOX", 'DONOR SEATING ONLY'].map((t, k) => atlas.add(1024, 80, signDraw(t, { bg: k ? '#d4af37' : '#f2efe6', fg: '#12142b', font: SANS, size: 60, lines: 1 })));
    stands.forEach((o, k) => atlas.place(lines[k % 2], toWorld(o, [0, 6.75, -8.28]), o.yaw, 28, 2.2));
    const crowd = CROWD.map((t, k) => atlas.add(256, 150, signDraw(t, { bg: ['#ffffff', '#ffd23c', '#f7b8d0', '#e9f4ff', '#f2efe6'][k % 5], fg: ['#b3122a', '#1f3f8a', '#12142b'][k % 3], size: 64, border: '#12142b' })));
    const sticks = new ModelBuilder();
    seats.forEach((st, k) => {
      if (rng() > 0.16) return;
      atlas.place(crowd[k % crowd.length], [st.x, st.y + 1.95, st.z], st.yaw + rng.range(-0.15, 0.15), 1.4, 0.82, rng.range(-0.1, 0.1));
      sticks.add('s', cyl(0.025, 0.025, 0.8, 4), { p: [st.x, st.y + 1.3, st.z] });
    });
    bake.builder(sticks, { s: plastic(0x8a5a36, 0.8) }, false);
  }

  bake.builder(posts, { pole: plastic(0x2a2d36, 0.5, 0.3) }, false);
  bake.flush(); atlas.flush();

  /* ---- motion ---- */
  const T = { tick: 0, ceilShown: -1 };
  anim.push((dt, time) => {
    // the door turns, and the suits go round with it
    door.rotation.y = COMPLEX.yaw + time * 0.32;
    SUITS.forEach(([r, a0], n) => {
      const a = a0 + time * 0.32;
      Ps.set(COMPLEX.x + Math.sin(a) * r, cy + 0.8, COMPLEX.z + Math.cos(a) * r); Qs.setFromAxisAngle(Ys, a + Math.PI / 2);
      Ms.compose(Ps, Qs, Ss); for (const m of suits) m.setMatrixAt(n, Ms);
    });
    for (const m of suits) m.instanceMatrix.needsUpdate = true;
    // the ticker
    T.tick += dt; if (T.tick > 0.08) { T.tick = 0; drawTicker(time); }
    // the debt ceiling goes up a notch every lap (and creeps between)
    const lap = leaderLap(), target = Math.min(28.5, 6 + (lap - 1) * 9 + Math.min(4, (time % 40) * 0.05));
    ceil.y += (target - ceil.y) * Math.min(1, dt * 0.8);
    const hs = halfSide(ceil.y) + 0.35, wy = ob.y + ceil.y;
    collar.position.set(OBELISK.x, wy, OBELISK.z); collar.scale.set(hs, 1, hs);
    // cash flying from the cannon to the dome
    for (let k = 0; k < BILLS; k++) {
      billT[k] += dt; if (billT[k] > 5.2) billT[k] -= 5.2;
      const f = billT[k] / 5.2, [ox, oz, ph, sp] = billSeed[k];
      Pb.lerpVectors(muzzle, capTop, f); Pb.x += ox * f; Pb.z += oz * f; Pb.y += Math.sin(f * Math.PI) * 48;
      Eb.set(time * sp + ph, time * 1.3 + ph, time * sp * 0.7); Qb.setFromEuler(Eb); Mb.compose(Pb, Qb, Sb.setScalar(f < 0.04 ? f * 25 : 1)); bills.setMatrixAt(k, Mb);
    }
    bills.instanceMatrix.needsUpdate = true;
    // the filibuster: the clock runs a minute a quarter-second, the page keeps turning
    const mins = Math.floor(time * 4), hr = 23 + Math.floor(mins / 60);
    if (mins !== filiShown) {
      filiShown = mins;
      fili.draw((g, w, h) => {
        g.fillStyle = '#07090c'; g.fillRect(0, 0, w, h); g.textAlign = 'center'; g.textBaseline = 'middle';
        g.fillStyle = '#ffb020'; g.font = `bold 54px ${MONO}`; g.fillText('FILIBUSTER', w / 2, 60);
        g.fillStyle = '#ff3b30'; g.font = `bold 40px ${MONO}`; g.fillText('● LIVE', w / 2, 118);
        g.fillStyle = '#38ff74'; g.font = `bold 120px ${MONO}`; g.fillText(`${hr}:${String(mins % 60).padStart(2, '0')}`, w / 2, 236);
        g.fillStyle = '#ffffff'; g.font = `bold 38px ${MONO}`; g.fillText('HOURS SPOKEN', w / 2, 330);
        g.fillStyle = '#ffd23c'; g.font = `bold 34px ${MONO}`; g.fillText('NOW READING:', w / 2, 400); g.fillText('THE PHONE BOOK', w / 2, 446);
      });
    }
    { const a = time * 0.028 + 1.2; pac.position.set(10 + Math.cos(a) * 190, 78 + Math.sin(time * 0.3) * 2, 120 + Math.sin(a) * 170); pac.rotation.y = -a; }
    page.rotation.set(pageBase, -Math.PI * Math.min(1, ((time * 0.5) % 1) * 1.25), 0);
  });
}
