/* Capitol Hill Climb: the opener of the second cup. A marble government
   district at golden hour: a stone avenue, a run beside the reflecting pool,
   a bend round the obelisk, a climb through the cherry trees, a red-carpet
   run straight through the domed capitol, and the Filibuster: three linked
   hairpins down the hill. */
import { fbm, smoothstep } from '../core/util.js';

import { Scenery, partsOf } from '../render/scenery.js';
import * as P from '../models/props.js';
import * as C from '../models/props-capitol-hill.js';
import { bannerTexture } from '../render/textures.js';

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
  tagline: 'Where every lap is a hearing.',
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
    shoulder: 0xd8cdb4,
    terrain: { low: 0x5aa64a, high: 0x7fc25a, dry: 0xb8c46a, rock: 0xb8b0a4, sand: 0xe6dcc0, dirt: 0xc7b48e },
    water: 0x5fb7d8,
    wall: 0xf2efe6, wallStripe: 0xd4af37,
    tunnelLight: 0xffc860, portal: 0xe9e3d3,
    ads: ['FILIBUSTER FUEL', 'LOBBY HOBBY', 'PORK BARREL BBQ', 'SUPER PAC SNACKS', 'BIPARTISAN BRAKES', 'THE SWAMP WATER CO', 'COMMITTEE HEARING AIDS', 'EARMARK ERASERS', 'REVOLVING DOOR CO', 'RED TAPE DISPENSARY', 'I DO NOT RECALL', 'TERMS AND CONDITIONS APPLY'],
  },
  models: { motorcade: () => C.motorcade(), redtape: () => C.redTape() },

  /** Dress the course. ctx: { THREE, track, group, gfx, anim, view } */
  decorate(ctx) {
    const { THREE, track, anim, view } = ctx, sc = new Scenery(ctx), rng = sc.rng;
    const taken = [];                                                     // footprints of landmarks: [x, z, r]
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
    const halls = [[40, 52, 0], [114, 306, Math.PI], [-20, -72, 0]].map(([x, z, yaw]) => ({ x, z, yaw, y: sc.y(x, z) - 0.3 }));
    sc.instances(partsOf(C.memorialHall({ w: 34, d: 22, h: 9 })), halls, {});
    halls.forEach(p => taken.push([p.x, p.z, 23]));
    const temples = [[-232, 122], [22, 205], [-95, 225]].map(([x, z]) => ({ x, z, yaw: 0, y: sc.y(x, z) - 0.4 }));
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

    // big billboards where you are looking anyway
    const ads = ['FILIBUSTER FUEL', 'PORK BARREL BBQ', 'SUPER PAC SNACKS', 'I DO NOT RECALL', 'REVOLVING DOOR CO', 'BIPARTISAN BRAKES', 'EARMARK ERASERS'];
    [[2.7, 1, 20], [4.2, -1, 18], [8.6, 1, 20], [12.9, -1, 22], [24.0, 1, 22], [31.5, -1, 20], [44.3, 1, 26]].forEach(([at, side, off], i) => {
      const p = sc.beside(at, side, off), tex = bannerTexture([ads[i]], i + 5);
      tex.repeat.set(0.25, 1);
      sc.place(P.billboard(tex, { w: 15, h: 5, legs: 6, frame: 0x2a2d36 }), p.x, p.z, { yaw: p.yaw + rng.range(-0.12, 0.12) });
    });

    // hot-air balloons over the district
    const cols = [[0xb3122a, 0xf2efe6], [0x1f3f8a, 0xf2efe6], [0xd4af37, 0xf2efe6], [0xf7b8d0, 0xffffff], [0xb3122a, 0x1f3f8a]];
    const balloons = cols.map((c, i) => { const b = P.balloon(c); const a = (i / cols.length) * Math.PI * 2 + 0.5, r = 220 + (i % 2) * 80; b.position.set(Math.cos(a) * r, 62 + i * 8, 120 + Math.sin(a) * r); b.scale.setScalar(1.4 + (i % 3) * 0.3); ctx.group.add(b); return b; });
    anim.push((dt, time) => { balloons.forEach((b, i) => { b.position.y += Math.sin(time * 0.4 + i * 1.7) * dt * 0.8; b.rotation.y += dt * 0.05; }); });
  },
};
