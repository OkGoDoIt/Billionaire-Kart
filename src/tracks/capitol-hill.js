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

export const CAPITOL = { x: -85, z: 147, y: 27, ax: 66, az: 34 };   // plateau (half-axes) the capitol stands on
// #140 round 3: THE Reflecting Pool. A long, narrow basin (27 x 176 m) whose west coping is the
// edge of the pool run, on one axis with the memorial at its head (north) and the monument at its foot (south)
export const POOL = { x0: 165.5, x1: 192.5, z0: 48, z1: 224, floor: -0.3, water: 0.6, coping: 164.2 };
export const AXIS = (POOL.x0 + POOL.x1) / 2;
export const OBELISK = { x: AXIS, z: 278, h: 65, w: 8.4 };              // the monument, hero scale, at the foot of the pool's axis
const MEMORIAL = { x: AXIS + 35, z: 12 };                                     // the memorial at the head of the pool, dead ahead down the Avenue

// The Filibuster's legs (z of the centreline, and the road's height at its two ends) and the terrace lines between
// them: the hillside steps down in stone-walled terraces, one per leg, so each hairpin drops you a storey.
const LEGS = [{ z: 147, xa: -165, ya: 26.5, xb: -125, yb: 27 }, { z: 98, xa: -165, ya: 23, xb: -90, yb: 17.2 }, { z: 49, xa: -145, ya: 9.4, xb: -90, yb: 13.6 }, { z: 0, xa: -145, ya: 5.8, xb: -75, yb: 1.2 }];
const legY = (k, x) => { const L = LEGS[k], t = Math.min(1, Math.max(0, (x - L.xa) / (L.xb - L.xa))); return L.ya + (L.yb - L.ya) * t; };
export const TERRACES = [{ z: 122.5, x0: -146, x1: -126 }, { z: 73.5, x0: -168, x1: -114 }, { z: 24.5, x0: -126, x1: -86 }];   // walls: upper leg to the north
const clotureWidths = new WeakMap(); // Track objects are reused when the same course restarts.
export const CLOTURE = { x0: -114, x1: -72 };   // hairpin two's infield and the gap in the middle wall: fenced until the final lap
const terraceY = (x, z) => {
  for (let k = 0; k < 3; k++) {
    const L = TERRACES[k].z;
    if (z >= L + 3.2) return legY(k, x) - 0.15;
    if (z >= L) { const t = (z - L) / 3.2; return legY(k + 1, x) - 0.15 + (legY(k, x) - legY(k + 1, x)) * t; }
  }
  return legY(3, x) - 0.15;
};
/** A generated texture from assets/tracks/capitol-hill (see tools/gen-capitol-art.mjs), tiled; browser only. */
const artCache = {};
const artTex = (THREE, name, key = name) => {
  if (artCache[key]) return artCache[key];
  const t = new THREE.TextureLoader().load(`assets/tracks/capitol-hill/${name}.webp`);
  t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8;
  return (artCache[key] = t);
};
/** The cloture steps open when the race leader starts the final lap (the same rule for rivals and for the barricade). */
export const clotureOpen = race => !!race?.karts?.some(k => k.lap >= (race.laps ?? 3));
const segDist = (x, z, ax, az, bx, bz) => {
  const dx = bx - ax, dz = bz - az, t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz)));
  return Math.hypot(x - ax - dx * t, z - az - dz * t);
};

export default {
  id: 'capitol-hill',
  name: 'Capitol Hill Climb',
  tagline: 'Three laps: the only term limit in town.',
  lapNotes: ['<b>Debt ceiling raised.</b> Nobody is surprised.', '<b>Cloture invoked.</b> The steps past hairpin two are open.'],   // shown as laps two and three begin
  intro: [
    { pos: [AXIS - 2, 5.8, POOL.z0 - 14], pos1: [AXIS, 4, POOL.z0 + 16],
      look: [AXIS, 12, POOL.z1 + 24], look1: [AXIS, 11, POOL.z1 + 24], fov: 52, dur: 2.25 },
    { pos: [96, 9, 214], pos1: [88, 11, 196], look: [80, 24, 150], look1: [80, 22, 146], fov: 54, dur: 2.2 },
  ],
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
    { p: [141, 0.6, 9], w: 18 },              // 3
    { p: [166.8, 0.7, 38], w: 18 },                  // 4
    { p: [156, 0.6, 94] },                        // 5 the Reflecting Pool, pool on the left
    { p: [155, 0.6, 168] },                        // 6
    { p: [151, 0.9, 233], w: 18 },               // 7 round the obelisk, right
    { p: [129.5, 1.3, 263.6], w: 18 },           // 8
    { p: [96.5, 1.8, 263.6], w: 18 },            // 9
    { p: [80, 3, 235], w: 18 },                // 10
    { p: [80, 6.8, 182] },                         // 11 the Mall leg, climbing north
    { p: [80, 11.6, 130] },                       // 12 the Climb: left
    { p: [71.2, 13.8, 108.8] },                  // 13
    { p: [50, 16, 100] },                        // 14
    { p: [25, 18.3, 100] },                        // 15 left again, through the cherry trees
    { p: [6.2, 20.3, 106.6] },                   // 16
    { p: [-4.3, 22.4, 123.5] },                  // 17 right, up to the Rotunda
    { p: [-14.8, 24.5, 140.4] },                 // 18
    { p: [-33.6, 26.3, 147] },                   // 19
    { p: [-45, 27, 147] },                     // 20 the Rotunda: red carpet under the dome
    { p: [-85, 27, 147] },                     // 21
    { p: [-125, 27, 147] },                    // 22 out the far side, the district below
    { p: [-165, 26.5, 147], w: 18 },               // 23 the Filibuster: hairpin one, right
    { p: [-177.2, 26.0, 143.7], w: 18, bank: -4 }, // 24
    { p: [-186.2, 25.4, 134.8], w: 18, bank: -7 },  // 25
    { p: [-189.5, 24.8, 122.5], w: 18, bank: -8 }, // 26
    { p: [-186.2, 24.2, 110.2], w: 18, bank: -7 },  // 27
    { p: [-177.2, 23.6, 101.3], w: 18, bank: -4 }, // 28
    { p: [-165, 23, 98], w: 18 },                // 29
    { p: [-90, 17.2, 98], w: 18 },               // 30 hairpin two, left
    { p: [-77.8, 16.6, 94.7], w: 18, bank: 4 },  // 31
    { p: [-68.8, 16.0, 85.8], w: 18, bank: 7 },  // 32
    { p: [-65.5, 15.4, 73.5], w: 18, bank: 8 },  // 33
    { p: [-68.8, 14.8, 61.2], w: 18, bank: 7 },  // 34
    { p: [-77.8, 14.2, 52.3], w: 18, bank: 4 },  // 35
    { p: [-90, 13.6, 49], w: 18 },               // 36
    { p: [-145, 9.4, 49], w: 18 },                 // 37 hairpin three, right
    { p: [-157.2, 8.8, 45.7], w: 18, bank: -4 },  // 38
    { p: [-166.2, 8.2, 36.8], w: 18, bank: -7 },  // 39
    { p: [-169.5, 7.6, 24.5], w: 18, bank: -8 },  // 40
    { p: [-166.2, 7.0, 12.2], w: 18, bank: -7 },  // 41
    { p: [-157.2, 6.4, 3.3], w: 18, bank: -4 },   // 42
    { p: [-145, 5.8, 0], w: 18 },                // 43
    { p: [-75, 1.2, 0] },                          // 44 onto the Avenue
  ],
  sides: [
    { from: 43.6, to: 1.7, side: 'R', edge: 'wall' },                          // grandstand wall along the Avenue
    { from: 4.3, to: 6.75, side: 'L', shoulder: 1.2, outer: 1.3, blend: 1.4, hoarding: false }, // the Reflecting Pool: the coping is the edge of the road
    { from: 6.75, to: 7.15, side: 'L', outer: 7, blend: 6, hoarding: false },             // the fountain plaza at its foot
    { from: 5.7, to: 7.0, side: 'R', outer: 32, shoulder: 4, hoarding: false }, // the Mall: open lawn between the pool run...
    { from: 10.15, to: 11.6, side: 'R', outer: 32, shoulder: 4, hoarding: false }, // ...and the Mall leg (cut it with a boost)
    { from: 19.3, to: 20.0, edge: 'wall' },                                     // forecourt walls either side of the capitol
    { from: 22.0, to: 22.35, edge: 'wall' },
    { from: 23.0, to: 29.0, side: 'R', outer: 2.2 },                            // hairpins one and three: the infields hold their set pieces
    { from: 37.0, to: 43.0, side: 'R', outer: 2.2 },
    { from: 29.6, to: 36.45, side: 'L', outer: 16.5, hoarding: false },         // hairpin two's infield and the cloture steps: open ground,
                                                                                 // fenced off (decorate) until the final lap
  ],
  ramps: [
    { at: 29.22, len: 9, lift: 2.1, lat: -3.5, w: 5.5 },   // off the top of each downhill leg: a trick line on one side, the dive is long
    { at: 36.56, len: 9, lift: 2.1, lat: 3.5, w: 5.5 },
  ],
  tunnels: [{ from: 20.0, to: 22.0, through: false }],
  zones: [
    { from: 43.5, to: 2.2, skin: 'stone' },
    { from: 11.0, to: 20.0, skin: 'cobble' },
    { from: 20.0, to: 22.0, skin: 'carpet' },
  ],
  boosts: [
    { at: 0.45, lat: 0, w: 5 },                    // down the Avenue
    { at: 5.28, lat: 5.8, w: 3.6 },                  // commit to the narrow stone coping to launch down the Mall
    { at: 11.2, lat: -3, w: 4.5 },                 // up the Mall leg
    { at: 20.9, lat: 0, w: 5 },                    // on the red carpet under the dome
    { at: 29.35, lat: -3.8, w: 4.5 },                  // between hairpins one and two: only if you dare
    { at: 43.35, lat: 0, w: 5 },                    // out of the Filibuster, onto the Avenue
  ],
  itemRows: [{ at: 6.85 }, { at: 13.6 }, { at: 21.5 }, { at: 36.85 }, { at: 44.4, n: 3 }],
  coins: [
    { from: 0.15, to: 0.6, n: 4, lat: 4 },
    { from: 5.2, to: 6.4, n: 5, lat: [6.5, 7] },            // along the pool edge: one slip and you are in the water
    { from: 8.1, to: 9.3, n: 4, lat: -5.5 },                // inside the obelisk bend
    { from: 15.6, to: 18.6, n: 4, lat: [5, -5] },           // through the cherry-tree esses
    { from: 25.0, to: 27.0, n: 3, lat: -6 },                // the inside of each hairpin
    { from: 32.0, to: 34.0, n: 3, lat: 6 },
    { from: 39.0, to: 41.0, n: 3, lat: -6 },
  ],
  // rivals cut the Mall too, on the lane between the topiary and the protest signs (see docs/track-authoring.md)
  shortcuts: [
    { name: 'the Mall', from: 5.9, to: 11.2, path: [[149, 178], [136, 188], [100, 191], [88, 182]] },
    // the final lap only: cloture is invoked, the barricade folds away, and the steps cut out hairpin two
    { name: 'cloture', from: 29.66, to: 36.4, path: [[-108, 86], [-100, 78], [-99.5, 73.5], [-102, 65], [-109, 59]], skill: 0.4, chance: 1.4, when: race => clotureOpen(race) },
  ],
  obstacles: [
    // the motorcade crawls across the road
    { kind: 'patrol', model: 'motorcade', at: 1.35, lats: [-9, -5], speed: 3.5, effect: 'spin', radius: 2.0 },
    { kind: 'patrol', model: 'motorcade', at: 6.15, lats: [-9, -5], speed: 3, effect: 'spin', radius: 2.0 },
    // lobbyist drones circling the Climb
    { kind: 'orbit', model: 'drone', at: 14.4, lat: -5, orbit: 3, speed: 5, effect: 'spin', lift: 0.6 },
    { kind: 'orbit', model: 'drone', at: 18.7, lat: 5.5, orbit: 2.5, speed: 4.5, effect: 'spin', lift: 0.6 },
    // red tape at the hairpins
    { kind: 'static', model: 'redtape', at: 26.0, lat: -1.0, effect: 'bump', radius: 1.4 },
    { kind: 'static', model: 'redtape', at: 35.6, lat: -6.4, effect: 'bump', radius: 1.4 },
    { kind: 'static', model: 'redtape', at: 40.0, lat: -1.0, effect: 'bump', radius: 1.4 },
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
      // the Filibuster's terraces, faded into the plain hill round the hairpins
      const tk = smoothstep(-178, -162, x) * (1 - smoothstep(-90, -76, x)) * smoothstep(-14, 0, z) * (1 - smoothstep(150, 166, z));
      if (tk > 0) {
        let ty = terraceY(x, z);
        // the cloture steps: a straight drop from the middle leg to the one below, through the gap in the wall
        if (x > CLOTURE.x0 - 4 && x < CLOTURE.x1 + 4 && z > 56 && z < 91) { const t = smoothstep(58, 89, z), cx = smoothstep(CLOTURE.x0 - 4, CLOTURE.x0, x) * (1 - smoothstep(CLOTURE.x1, CLOTURE.x1 + 4, x)); ty = ty * (1 - cx) + (legY(2, x) - 0.15 + (legY(1, x) - legY(2, x)) * t) * cx; }
        h = h * (1 - tk) + ty * tk;
      }
      // a flat top for the capitol
      const cd = Math.hypot((x - CAPITOL.x) / CAPITOL.ax, (z - CAPITOL.z) / CAPITOL.az);
      const top = 1 - smoothstep(0.9, 1.35, cd);
      h = h * (1 - top) + CAPITOL.y * top;
      // the reflecting pool: a crisp rectangle dipped to a shallow floor under its own water (decorate lays the surface)
      const pk = smoothstep(POOL.x0 - 0.6, POOL.x0 + 0.6, x) * (1 - smoothstep(POOL.x1 - 0.6, POOL.x1 + 0.6, x)) * smoothstep(POOL.z0 - 0.6, POOL.z0 + 0.6, z) * (1 - smoothstep(POOL.z1 - 0.6, POOL.z1 + 0.6, z));
      if (pk > 0) h = h * (1 - pk) + POOL.floor * pk;
      // the walks and the plaza round it stay level with the coping
      const wk = (x > POOL.x0 - 4 && x < POOL.x1 + 22 && z > POOL.z0 - 14 && z < POOL.z1 + 50) ? 1 : 0;
      if (wk && !pk) h = Math.min(h, 0.62);
      return h;
    },
  },
  look: {
    road: { base: 0x5d6373, line: 0xffffff, center: 0xffd23c },
    kerb: [0xb3122a, 0xf2efe6],
    groundTexture: 'meadow', groundScale: 0.35,                                           // one mown lawn everywhere (the blotchy default read as gravel up close)
    shoulder: 0x6aae4e,                                                                   // the verge is lawn too: one green from the kerb to the woods
    terrain: { low: 0x5aa64a, high: 0x7fc25a, dry: 0x8cbf5a, rock: 0xb8b0a4, sand: 0x66aa4c, dirt: 0x62a84b },   // "sand" is what the low ground near the pool level gets: lawn here too
    water: 0x527a2c,   // #140: the reflecting pool is GREEN with algae — murky swamp green, not the old swimming-pool blue Roger called out
    wall: 0xf2efe6, wallStripe: 0xd4af37,
    tunnelLight: 0xffc860, portal: 0xe9e3d3,
    ads: ['THOUGHTS AND PRAYERS', 'PORK BARREL BBQ', 'SUPER PAC SNACKS', 'BIPARTISAN NAP TIME', 'THE SWAMP WATER CO', 'I YIELD TO MY DONORS', 'EARMARK ERASERS', 'REVOLVING DOOR CO', 'RED TAPE DISPENSARY', 'I DO NOT RECALL', 'TERM LIMITS: IN COMMITTEE', 'INSIDER TRADING: MEMBERS ONLY'],
  },
  models: { motorcade: () => C.motorcade(), redtape: () => C.redTape(), drone: () => C.lobbyistDrone() },

  /** Dress the course. ctx: { THREE, track, group, gfx, anim, view } */
  decorate(ctx) {
    const { THREE, track, anim, view } = ctx, sc = new Scenery(ctx), rng = sc.rng;
    const ds = doorSite(track), dcx = Math.cos(ds.yaw), dsx = Math.sin(ds.yaw);
    const taken = [[ds.x - dcx * DOOR.span / 2, ds.z + dsx * DOOR.span / 2, 14], [ds.x + dcx * DOOR.span / 2, ds.z - dsx * DOOR.span / 2, 14], [ds.x, ds.z, 12], [STATUE.x, STATUE.z, 15], [LECTERN.x, LECTERN.z, 16], [PERMIT.x, PERMIT.z, 16], [MAZE.x, MAZE.z, 26], [CANNON.x, CANNON.z, 9]];   // footprints of landmarks: [x, z, r]
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

    // the ballroom construction zone (#113), ROUND 2 (#140): from the road, #113's demolished wing
    // hid behind the Avenue grandstands — only the board and the crane jib read — so round 2 takes
    // the destruction to skyline scale. The site grows 1.25x; a collapsed roof slab crashes across
    // the standing wing with a gold chandelier wrecked on it; gold BALLROOM letters fail along a
    // rooftop rail (one O slumped, one down, the M face-up on the ledge); the second site board
    // has fallen against the hoarding, corrected in spray paint; rubble spills across the slab;
    // and a 27 m wrecking-ball crane west of the site swings its ball over the ruins while
    // demolition dust drifts over the scene. Dressing only: nothing here touches the road.
    {
      const SX = -24, SZ = -40, SY = sc.y(SX, SZ) - 0.35;
      const site = C.ballroomSite();
      site.add(C.ballroomRoofLetters());
      site.add(C.collapsedRoof());
      const chand = C.crashedChandelier(); chand.position.set(2.6, 9.0, 1.9); chand.rotation.set(0.4, 0.5, 0.25); site.add(chand);
      const fb = C.fallenBoard(); fb.position.set(-3, 0.55, 10.1); site.add(fb);
      sc.place(site, SX, SZ, { yaw: -0.38, y: SY, scale: 1.25 });
      const masonry = C.makeBaker(ctx.group, sc.shadows);
      masonry.add(site, false); masonry.flush();
      taken.push([SX, SZ, 26]);
      // the wrecking crane, west of the site, its jib reaching over the demolished half
      const wc = C.wreckCrane(), swing = wc.userData.swing;
      sc.place(wc, -53, -35, { yaw: 0.14, y: sc.y(-53, -35) - 0.3 });
      taken.push([-53, -35, 10]);
      // rubble spill across the slab, in site world space (rotY -0.38, scale 1.25 about SX,SZ)
      const cyw = Math.cos(-0.38), syw = Math.sin(-0.38);
      const rubble = [];
      for (let k = 0; k < 26; k++) {
        const lx = k < 15 ? rng.range(-12.5, 12.5) : rng.range(-12.5, -0.5), lz = k < 15 ? rng.range(4.4, 6.9) : rng.range(-3, 3);
        rubble.push({ x: SX + 1.25 * (cyw * lx + syw * lz), z: SZ + 1.25 * (-syw * lx + cyw * lz), y: SY + 0.78, yaw: rng.range(0, 6.28) });
      }
      sc.instances(partsOf(C.rubbleChunk()), rubble, { scale: [0.7, 1.7] });
      // the swing, and dust: two tan puffs a frame, one at the ball, one over the ruins
      const dustA = [SX + 1.25 * (cyw * -6 + syw * 0), SY + 9, SZ + 1.25 * (-syw * -6 + cyw * 0)];
      anim.push((dt, time) => {
        swing.rotation.z = Math.sin(time * 0.55) * 0.32;
        swing.rotation.x = Math.sin(time * 0.37 + 1.0) * 0.09;
        if (view.fx) {
          let n = view.fx.count(22, dt);
          while (n-- > 0) {
            const at = n % 2 ? dustA : [-36.7, 11.5, -37.3];
            view.fx.spark(at[0] + rng.range(-3, 3), at[1] + rng.range(-1.5, 1.5), at[2] + rng.range(-3, 3),
              rng.range(-0.5, 0.5), rng.range(0.25, 0.8), rng.range(-0.5, 0.5), [0.84, 0.78, 0.64], rng.range(1.6, 2.8), 2.6);
          }
        }
      });
    }

    // the monument at the foot of the pool's axis (#140 round 3): hero scale, about 66 m to the tip, seen from most of the lap,
    // ringed by flags at its foot like the real one
    const obeliskRing = [], mon = C.obelisk({ h: OBELISK.h, w: OBELISK.w });
    {
      const y = sc.y(OBELISK.x, OBELISK.z);
      sc.place(mon, OBELISK.x, OBELISK.z, { y: y - 0.3, solid: OBELISK.w * 1.25 });
      for (let k = 0; k < 28; k++) { const a = (k / 28) * Math.PI * 2; const x = OBELISK.x + Math.cos(a) * 19, z = OBELISK.z + Math.sin(a) * 19; obeliskRing.push({ x, y: sc.y(x, z) - 0.1, z, yaw: -a }); }
      taken.push([OBELISK.x, OBELISK.z, 22]);
    }
    ctx.monument = mon;
    { const t = artTex(THREE, 'ashlar', 'monument'); t.repeat.set(3, OBELISK.h / 6); mon.traverse(o => { if (o.isMesh && o.material.color?.getHex() === 0xece6d6) { o.material = o.material.clone(); o.material.map = t; o.material.color.setHex(0xfaf6ee); o.material.flatShading = true; } }); }
    reflectingPool(ctx, sc, { taken, free, reach });
    filibuster(ctx, sc, { taken });

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
    sc.instances(partsOf(stand.group), standsA, { cast: false });
    sc.instances(partsOf(stand2.group), standsB, { cast: false });
    sc.instances(partsOf(C.crowdPerson()), seats, { scale: [0.95, 1.2], tints: P.CROWD_TINTS, cast: false });

    // flagpoles and lamps lining the Avenue
    const flagA = partsOf(C.flagpole({ a: 0xb3122a, b: 0xd4af37 })), flagB = partsOf(C.flagpole({ a: 0x1f3f8a, b: 0xf2efe6 })), flagC = partsOf(C.flagpole({ a: 0xd4af37, b: 0x1f3f8a }));
    const avFlags = sc.along({ from: 43.5, to: 2.0, side: 1, offset: 13.2, spacing: 12 });
    sc.instances(flagA, avFlags.filter((_, i) => i % 3 === 0), { cast: false });
    sc.instances(flagB, avFlags.filter((_, i) => i % 3 === 1), { cast: false });
    sc.instances(flagC, avFlags.filter((_, i) => i % 3 === 2), { cast: false });
    sc.instances(flagA, obeliskRing.filter((_, k) => k % 2 === 0), { cast: false });
    sc.instances(flagB, obeliskRing.filter((_, k) => k % 2 === 1), { cast: false });
    const southFlags = sc.along({ from: 43.7, to: 1.6, side: -1, offset: 1.4, spacing: 34, phase: 32 });
    sc.instances(flagA, southFlags, { cast: false });
    const lamp = partsOf(C.streetLamp());
    const lamps = [
      ...sc.along({ from: 43.5, to: 2.0, side: 1, offset: 13.2, spacing: 12, phase: 6 }),
      ...sc.along({ from: 11.7, to: 19.2, side: 1, offset: 4.8, spacing: 22 }), ...sc.along({ from: 11.7, to: 19.2, side: -1, offset: 4.8, spacing: 22, phase: 11 }),
      ...sc.along({ from: 22.5, to: 43.2, side: 1, offset: 12.8, spacing: 26 }),
    ].filter(p => !reach(p.x, p.z, 0.6) && free(p.x, p.z));
    sc.instances(lamp, lamps, { cast: false });

    // the Mall: protest signs and clipped topiary to thread between on the shortcut (solid)
    const mallSpots = [[104, 176], [130, 182], [114, 198], [100, 212], [134, 208], [138, 160]];
    const signSpots = [], topiSpots = [];
    mallSpots.forEach(([x, z], k) => { const spot = { x, z, y: sc.y(x, z), yaw: Math.atan2(150 - x, 178 - z) + rng.range(-0.22, 0.22) }; (k % 3 === 2 ? topiSpots : signSpots).push(spot); });
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
    cherrySpots.push(...sc.scatter({ count: 60, min: 14, max: 70, maxSlope: 0.5, minGap: 7, where: (x, z) => (onPlateau(x, z, 1.6) && !onPlateau(x, z, 1.02)) || (x > -60 && x < 100 && z > 20 && z < 95) }));
    const sightlines = BOARDS.map(([cp, side, offset]) => {
      const board = sc.beside(cp, side, offset), i = track.indexAtCp(cp);
      return [board.x, board.z, track.px[i] - track.tx[i] * 29, track.pz[i] - track.tz[i] * 29];
    });
    const blocksBoard = (x, z) => sightlines.some(([bx, bz, ax, az]) => segDist(x, z, ax, az, bx, bz) < 7.4);
    const cherries = cherrySpots.filter(p => ok(p.x, p.z, 1.5) && !blocksBoard(p.x, p.z)).map(p => ({ ...p, y: sc.y(p.x, p.z) }));
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
    const formal = (x, z) => (Math.abs(z) < 48 && x > -150 && x < 175) || (x > -45 && x < 140 && z > 20 && z < 95) || inMall(x, z) || (x > 150 && x < 245 && z > -20 && z < 312) || onPlateau(x, z, 1.2);
    const woods = sc.scatter({ count: 440, min: 13, max: 230, maxSlope: 0.8, minGap: 5.5, where: (x, z) => !formal(x, z) && !blocksBoard(x, z) && ok(x, z, 1.5) });
    const oakA = partsOf(P.roundTree(1, { h: 8, leafA: 0x4f9e3f, leafB: 0x6fbf4a })), oakB = partsOf(P.roundTree(2, { h: 9.5, leafA: 0x3f8f3a, leafB: 0x5cae45 })), oakC = partsOf(P.roundTree(3, { h: 7, leafA: 0x6bb84a, leafB: 0x8fcc5a }));
    for (const near of [true, false]) {                                  // distant trees skip the shadow pass
      const set = woods.filter(p => (p.dist < 60) === near), o = { yaw: 'random', tilt: 0.04, cast: near };
      sc.instances(oakA, set.filter((_, i) => i % 3 === 0), { ...o, scale: [0.85, 1.5] });
      sc.instances(oakB, set.filter((_, i) => i % 3 === 1), { ...o, scale: [0.85, 1.6] });
      sc.instances(oakC, set.filter((_, i) => i % 3 === 2), { ...o, scale: [0.85, 1.4] });
    }
    const lawnOaks = sc.scatter({ count: 45, min: 14, max: 140, maxSlope: 0.4, minGap: 16, where: (x, z) => formal(x, z) && !inMall(x, z) && !onPlateau(x, z, 1.2) && !blocksBoard(x, z) && ok(x, z, 1.5) });
    sc.instances(oakB, lawnOaks, { scale: [1.0, 1.5], yaw: 'random', tilt: 0.03 });
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

/* ---------- the Reflecting Pool (#140 round 3) ----------
   Built from the real one's defining features: a very long, narrow rectangular basin on one axis with a columned memorial
   at its head and the monument at its foot, pale granite coping all round, wide gravel walks along both long sides lined
   with a double row of tall elms, lamps along the walks. The pool run's left edge IS the west coping: karts race within
   a metre or two of the water for the whole 150 m. Then the twist, as the second read: the water is algae green, mats
   and scum float on it, the ducks have moved in, and the sign at the closest pass says so. */
function reflectingPool(ctx, sc, { taken, free, reach }) {
  const { THREE, track, anim, group } = ctx, rng = sc.rng;
  const Y = 0.62, WY = POOL.water, LEN = POOL.z1 - POOL.z0, ZM = (POOL.z0 + POOL.z1) / 2;
  // A cheap planar reflection. Reflect the eye ray about the surface and intersect the
  // silhouette of the actual monument on its axis. It stays anchored when the camera moves.
  {
    const g = new THREE.PlaneGeometry(POOL.x1 - POOL.x0 + 0.6, LEN + 0.6); g.rotateX(-Math.PI / 2);
    const waterTime = { value: 0 };
    const m = new THREE.MeshBasicMaterial({ color: 0xffffff });
    m.onBeforeCompile = shader => {
      shader.uniforms.waterTime = waterTime;
      shader.vertexShader = shader.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 poolPoint;')
        .replace('#include <project_vertex>', '#include <project_vertex>\npoolPoint = (modelMatrix * vec4(transformed, 1.0)).xyz;');
      shader.fragmentShader = shader.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 poolPoint; uniform float waterTime;')
        .replace('#include <color_fragment>', `#include <color_fragment>
          vec3 eyeRay = normalize(poolPoint - cameraPosition);
          float across = (poolPoint.x - ${POOL.x0}) / ${(POOL.x1 - POOL.x0).toFixed(1)};
          float swell = sin(poolPoint.z * 1.52 + poolPoint.x * .43 + waterTime * 1.12)
                      + .45 * sin(poolPoint.z * 3.55 - poolPoint.x * .75 - waterTime * 1.45);
          float banks = smoothstep(.25, .49, abs(across - .5));
          vec3 water = mix(vec3(.085, .34, .35), vec3(.065, .245, .175), banks * .65);
          float ripple = smoothstep(.99, 1.32, swell) * (.25 + .75 * pow(sin(poolPoint.x * .83 + poolPoint.z * .12), 2.0));
          water += ripple * vec3(.16, .17, .13);
          vec3 ray = vec3(eyeRay.x + .002 * swell, -eyeRay.y + .0024 * swell, eyeRay.z);
          float distanceToMonument = (${OBELISK.z.toFixed(1)} - poolPoint.z) / max(.001, ray.z);
          vec3 atMonument = poolPoint + distanceToMonument * ray;
          float height = (atMonument.y - ${sc.y(OBELISK.x, OBELISK.z).toFixed(2)}) / ${OBELISK.h.toFixed(1)};
          float halfWidth = ${(OBELISK.w / 2).toFixed(2)} * mix(1.0, .62, clamp(height, 0.0, 1.0))
                          * (1.0 - smoothstep(1.04, 1.15, height));
          float dx = atMonument.x - ${AXIS.toFixed(1)};
          float shaft = (1.0 - smoothstep(halfWidth - .35, halfWidth + .35, abs(dx)))
                      * step(0.0, height) * step(height, 1.15) * step(.01, ray.z);
          water = mix(water, mix(vec3(.51, .46, .30), vec3(.88, .79, .60), smoothstep(-.2, .2, dx)), shaft * .86);
          diffuseColor.rgb = water;
        `);
    };
    const w = new THREE.Mesh(g, m); w.position.set(AXIS, WY, ZM); group.add(w);
    anim.push((dt, time) => { waterTime.value = time; });
  }
  // granite coping round the rim (tall enough to wall the water in), and the gravel walk on the far side
  const cop = partsOf(C.coping(8)), copSpots = [];
  for (let z = POOL.z0 - 0.65 + 4; z < POOL.z1 + 0.65; z += 8) for (const x of [POOL.x0 - 0.65, POOL.x1 + 0.65]) copSpots.push({ x, z: Math.min(z, POOL.z1 + 0.65 - 4), y: Y - 0.65 + 0.32 - 0.33, yaw: Math.PI / 2 });
  // The racing line clips the north-west corner. Terminate the granite at the
  // causeway on both sides instead of drawing masonry across the asphalt.
  const endBlock = 2.6, endCount = Math.ceil((POOL.x1 - POOL.x0 + 2.6) / endBlock);
  const endLen = (POOL.x1 - POOL.x0 + 2.6) / endCount;
  const endSpots = [];
  for (let j = 0; j < endCount; j++) for (const z of [POOL.z0 - 0.65, POOL.z1 + 0.65]) {
    const x = POOL.x0 - 1.3 + endLen * (j + 0.5);
    if (!reach(x, z, 0.25)) endSpots.push({ x, z, y: Y - 0.18, yaw: 0 });
  }
  sc.instances(partsOf(C.coping(endLen)), endSpots, { cast: false });
  sc.instances(cop, copSpots.filter(p => !track.ground(p.x, p.z, -1, sc.hit).onRoad).map(p => ({ ...p, y: Y - 0.18 })), { cast: false });   // a low lip: anything taller hides the water from the karts
  {
    const b = new ModelBuilder(), walkW = 7;
    b.add('walk', box(walkW, 0.3, LEN + 30, 0.05, 1), { p: [POOL.x1 + 1.3 + walkW / 2, Y - 0.12, ZM] });
    const eastClipped = POOL.x0 + 14, eastEnd = POOL.x1 + 1.3 + walkW;
    b.add('walk', box(eastEnd - eastClipped, 0.3, 12, 0.05, 1), { p: [(eastClipped + eastEnd) / 2, Y - 0.12, POOL.z0 - 7.3] });   // across the head
    b.add('edge', box(0.3, 0.34, LEN + 30, 0.05, 1), { p: [POOL.x1 + 1.3 + walkW + 0.15, Y - 0.1, ZM] });
    group.add(b.build({ walk: plastic(0xdcd2bc, 0.95), edge: plastic(0xbfb6a2, 0.8) }));
  }
  // the near side: pale paving from the kerb to the coping at road height, so the road meets the pool in stone, not
  // lawn, and the water sits level with it: at kart height anything that stands up between the road and the water hides it
  {
    const i0 = track.indexAtCp(4.3), i1 = track.indexAtCp(6.75), pos = [], uv = [], idx = [];
    for (let i = i0, r = 0; i <= i1; i++, r++) {
      const latA = track.hwL[i] + 1.05, latB = Math.max(latA + 0.2, (POOL.coping + 0.1 - track.px[i]) / Math.max(0.3, track.lx[i]));
      const y = track.py[i] + track.ly[i] * (track.hwL[i] + 1.1) + 0.04;
      for (const lat of [latA, latB]) { const x = track.px[i] + track.lx[i] * lat, z = track.pz[i] + track.lz[i] * lat; pos.push(x, y, z); uv.push(lat / 5, z / 5); }
      if (i < i1) { const q = r * 2; idx.push(q, q + 1, q + 2, q + 1, q + 3, q + 2); }
    }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals();
    const tex = artTex(THREE, 'paving');
    const mesh = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ map: tex, roughness: 0.85, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 }));
    mesh.receiveShadow = true; group.add(mesh);
  }
  // the elms: a double row along the far walk the whole length, and along the inside of the run where the Mall is not open
  const elmSpots = [];
  for (let z = POOL.z0 - 8; z <= POOL.z1 + 10; z += 9.5) for (const x of [POOL.x1 + 11.5, POOL.x1 + 19.5]) elmSpots.push({ x: x + rng.range(-0.6, 0.6), z: z + rng.range(-1, 1) });
  for (let z = 52; z <= 230; z += 9.5) { if (z > 172 && z < 204) continue; for (const x of [134, 126]) elmSpots.push({ x: x + rng.range(-0.6, 0.6), z: z + rng.range(-1, 1) }); }
  const elms = elmSpots.filter(p => !(p.x < POOL.x0 && p.z < 92) && free(p.x, p.z) && !reach(p.x, p.z, 0.4)).map(p => ({ ...p, y: sc.y(p.x, p.z) - 0.1 }));
  sc.instances(partsOf(C.elm(3, { h: 15 })), elms.filter((_, i) => i % 2 === 0), { scale: [0.9, 1.15], yaw: 'random', tilt: 0.02, solid: 0.9, cast: false });
  sc.instances(partsOf(C.elm(8, { h: 16, leafA: 0x467f37, leafB: 0x58983f })), elms.filter((_, i) => i % 2 === 1), { scale: [0.9, 1.15], yaw: 'random', tilt: 0.02, solid: 0.9, cast: false });
  // lamps along the far walk
  const lamps = [];
  for (let z = POOL.z0 + 6; z < POOL.z1; z += 19) lamps.push({ x: POOL.x1 + 8.6, z, y: Y - 0.05, yaw: 0 });
  sc.instances(partsOf(C.streetLamp()), lamps, { cast: false });
  for (let z = POOL.z0 - 8; z <= POOL.z1 + 10; z += 9.5) taken.push([POOL.x1 + 15.5, z, 6]);
  taken.push([AXIS, ZM, LEN / 2 + 6]);

  // the twist: algae mats in three greens, scum along the coping, ducks in residence
  {
    const matSpots = [];
    for (let k = 0; k < 54; k++) matSpots.push({ x: k % 4 ? POOL.x1 - rng.range(1.2, 5.8) : POOL.x0 + rng.range(1.2, 3.6), z: rng.range(POOL.z0 + 2, POOL.z1 - 2), y: WY + 0.015, yaw: rng.range(0, 6.28) });
    sc.instances(partsOf(C.algaePatch(0x3e7a24)), matSpots.slice(0, 18), { scale: [1.0, 3.0], cast: false });
    sc.instances(partsOf(C.algaePatch(0x639c33)), matSpots.slice(18, 36), { scale: [0.9, 2.6], cast: false });
    sc.instances(partsOf(C.algaePatch(0x8aa832)), matSpots.slice(36), { scale: [0.8, 2.2], cast: false });
    const strips = [];
    for (let z = POOL.z0 + 5; z < POOL.z1 - 4; z += 9) { strips.push({ x: POOL.x0 + 0.62, z, y: WY + 0.01, yaw: Math.PI / 2 }); strips.push({ x: POOL.x1 - 0.62, z: z + 4.5, y: WY + 0.01, yaw: Math.PI / 2 }); }
    sc.instances(partsOf(C.algaeStrip()), strips, { scale: [0.7, 1.2], cast: false });
    const duckProto = C.duck(), ducks = [];
    for (const [dx, dz, dyaw] of [[POOL.x0 + 3.2, 96, 2.6], [POOL.x0 + 4.5, 101, 2.2], [AXIS + 3, 150, -0.7], [POOL.x0 + 2.6, 186, 1.4], [AXIS + 5, 124, 0.4]]) {
      const d = duckProto.clone(); sc.place(d, dx, dz, { yaw: dyaw, y: WY - 0.05, scale: 1.25 }); ducks.push(d);
    }
    anim.push((dt, time) => ducks.forEach((d, n) => { d.position.y = WY - 0.05 + Math.sin(time * 0.9 + n * 2.1) * 0.05; d.rotation.z = Math.sin(time * 0.7 + n * 1.7) * 0.05; d.position.x += Math.sin(time * 0.15 + n) * dt * 0.15; }));
    // at the closest pass, on the far walk, angled to the karts coming down the run
    sc.place(C.poolSign(), POOL.x1 + 5.8, 152, { yaw: -Math.PI / 2 - 0.55, y: Y - 0.1 });
    sc.place(C.poolSignSmall(), POOL.x1 + 2, 97, { yaw: -Math.PI * 0.75, y: Y });
  }

  // Two inward-curving ranks of wreath-bearing memorial piers frame the plaza and
  // obelisk. The raised pavilion on each flank leaves a clear central sky gap.
  {
    const wings = new ModelBuilder();
    for (const side of [-1, 1]) {
      for (let j = 0; j < 7; j++) {
        const a = 0.28 + j * 0.17;
        const x = AXIS + side * (13 + 18 * Math.sin(a)), z = POOL.z1 + 14 + 14 * Math.cos(a);
        if (reach(x, z, 2.1)) continue; // give the outside of the road and its runoff the missing bay
        const h = j === 6 ? 10.4 : 6.6;
        wings.add('limestone', new THREE.BoxGeometry(3.0, h, 1.7), { p: [x, Y + h / 2, z], r: [0, side * a, 0] });
        wings.add('limestone', new THREE.BoxGeometry(3.55, .54, 2.22), { p: [x, Y + h, z], r: [0, side * a, 0] });
        wings.add('bronze', new THREE.TorusGeometry(.62, .16, 5, 14), {
          p: [x - Math.sin(side * a) * .97, Y + h - 1.5, z - Math.cos(a) * .97], r: [0, side * a, 0]
        });
      }
      const x = AXIS + side * 19.2, z = POOL.z1 + 29;
      for (const dx of [-3.2, 3.2]) for (const dz of [-2.1, 2.1])
        wings.add('limestone', cyl(.87, 1.04, 10.8, 10), { p: [x + dx, Y + 5.4, z + dz] });
      wings.add('limestone', new THREE.BoxGeometry(9.6, 2.8, 7.4), { p: [x, Y + 11.9, z] });
      wings.add('bronze', new THREE.BoxGeometry(8.6, .4, 6.6), { p: [x, Y + 13.5, z] });
    }
    group.add(wings.build({ limestone: plastic(0xe2dcc5, .8), bronze: plastic(0x52786a, .58) }, { cast: false }));
  }

  // the fountain plaza at the foot of the pool, on the axis, between the water and the monument
  {
    const FX = AXIS, FZ = POOL.z1 + 24, fnt = C.fountain({ r: 9 });
    sc.place(fnt, FX, FZ, { y: Y - 0.25 }); taken.push([FX, FZ, 13]);
    const jet = fnt.userData.jet.clone().multiplyScalar(1).add(fnt.position);
    const ring = []; for (let k = 0; k < 8; k++) { const a = (k / 8) * Math.PI * 2; ring.push([FX + Math.cos(a) * 6.5, FZ + Math.sin(a) * 6.5]); }
    anim.push(dt => {
      if (!ctx.view.fx) return;
      for (let i = 0; i < ctx.view.fx.count(60, dt); i++) {
        const [x, z] = i % 3 ? ring[(i * 7) % ring.length] : [jet.x, jet.z], up = i % 3 ? 6 : 10;
        const a = rng() * 6.283, sp = 0.5 + rng() * 0.8;
        ctx.view.fx.spark(x, jet.y - 0.5, z, Math.cos(a) * sp, up + rng() * 2.5, Math.sin(a) * sp, [0.75, 0.88, 1], 0.3, 1.2);
      }
    });
  }

  // the memorial at the head of the pool, facing down the axis; its name on the attic
  {
    const mem = C.lincolnMemorial(), yaw = Math.atan2(AXIS - MEMORIAL.x, ZM - MEMORIAL.z);
    sc.place(mem, MEMORIAL.x, MEMORIAL.z, { yaw, y: sc.y(MEMORIAL.x, MEMORIAL.z) - 0.4, cast: false });
    taken.push([MEMORIAL.x, MEMORIAL.z, 30]);
    const tex = canvasTex(1024, 96, (g, w, h) => { g.fillStyle = '#ede7da'; g.fillRect(0, 0, w, h); C.fitText(g, 'THE LOBBYIST MEMORIAL', w / 2, h * 0.56, w * 0.92, 72, C.SIGN_FONT, '#6f6553', { lines: 1 }); }, { repeat: false });
    const q = new C.Quads(), a = mem.userData.attic, c = Math.cos(yaw), s = Math.sin(yaw), y0 = sc.y(MEMORIAL.x, MEMORIAL.z) - 0.4;
    q.panel([MEMORIAL.x + a[0] * c + (a[2] + 0.06) * s, y0 + a[1], MEMORIAL.z - a[0] * s + (a[2] + 0.06) * c], yaw, mem.userData.wide * 0.82, 2.6, [0, 0, 1, 1]);
    const m = new THREE.Mesh(q.geometry(), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.7 })); m.matrixAutoUpdate = false; group.add(m);
  }
}

/* ---------- the Filibuster's terraces and the cloture steps ----------
   The north face of the hill steps down in stone terraces, one per leg: each terrace wall stands between two legs
   with a balustrade along its top, flags and lamps on it, so from below it is a storey of dressed stone and from above
   a parapet with the next leg dropping away beneath. Hairpin two's infield and the gap in the middle wall are the
   cloture steps: fenced with barricades for two laps, open on the final one. */
function filibuster(ctx, sc, { taken }) {
  const { THREE, track, anim, group, view } = ctx;
  const stone = artTex(THREE, 'ashlar');
  const mat = new THREE.MeshStandardMaterial({ map: stone, color: 0xf4efe6, roughness: 0.85 }), capMat = new THREE.MeshStandardMaterial({ color: 0xd2c8b4, roughness: 0.7 });
  const pos = [], uv = [], idx = [], cpos = [], cidx = [];
  const quad = (P, U, a, b, c, d, ua, ub, uc, ud) => { const n = P.length / 3; P.push(...a, ...b, ...c, ...d); if (U) U.push(...ua, ...ub, ...uc, ...ud); return n; };
  const balSpots = [], flagSpots = [], lampSpots = [];
  TERRACES.forEach((T, k) => {
    const step = 2, n = Math.ceil((T.x1 - T.x0) / step);
    const up = x => legY(k, x) - 0.15 + 0.3, lo = x => legY(k + 1, x) - 0.15 - 0.8, z0 = T.z, z1 = T.z + 3.4;
    for (let j = 0; j < n; j++) {
      // the gap for the cloture steps in the middle wall
      const xa = T.x0 + j * step, xb = Math.min(T.x1, xa + step);
      const a = [xa, lo(xa), z0], b = [xb, lo(xb), z0], c = [xb, up(xb), z0], d = [xa, up(xa), z0];
      let q = quad(pos, uv, a, b, c, d, [xa / 4, a[1] / 3.2], [xb / 4, b[1] / 3.2], [xb / 4, c[1] / 3.2], [xa / 4, d[1] / 3.2]);
      idx.push(q, q + 2, q + 1, q, q + 3, q + 2);
      q = quad(cpos, null, [xa, up(xa), z0 - 0.25], [xb, up(xb), z0 - 0.25], [xb, up(xb), z1], [xa, up(xa), z1]);
      cidx.push(q, q + 2, q + 1, q, q + 3, q + 2);
      q = quad(cpos, null, [xa, up(xa) - 0.35, z0 - 0.25], [xb, up(xb) - 0.35, z0 - 0.25], [xb, up(xb), z0 - 0.25], [xa, up(xa), z0 - 0.25]);
      cidx.push(q, q + 2, q + 1, q, q + 3, q + 2);
    }
    // end caps, so the wall's thickness reads where it stops
    for (const [x, s] of [[T.x0, -1], [T.x1, 1]]) {
      const q = quad(pos, uv, [x, lo(x), z0], [x, lo(x), z1], [x, up(x), z1], [x, up(x), z0], [0, lo(x) / 3.2], [0.85, lo(x) / 3.2], [0.85, up(x) / 3.2], [0, up(x) / 3.2]);
      if (s > 0) idx.push(q, q + 2, q + 1, q, q + 3, q + 2); else idx.push(q, q + 1, q + 2, q, q + 2, q + 3);
    }
    for (let x = T.x0 + 2; x <= T.x1 - 2; x += 4) balSpots.push({ x, z: z0 + 0.45, y: up(x), yaw: 0 });
    for (let x = T.x0 + 6; x <= T.x1 - 4; x += 16) flagSpots.push({ x, z: z0 + 1.6, y: up(x), yaw: 0 });
    for (let x = T.x0 + 14; x <= T.x1 - 4; x += 16) lampSpots.push({ x, z: z0 + 1.6, y: up(x), yaw: 0 });
    taken.push(...Array.from({ length: Math.ceil((T.x1 - T.x0) / 8) + 1 }, (_, m) => [T.x0 + m * 8, z0 + 1.7, 5]));
  });
  const mk = (P, U, I, m) => {
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); if (U) g.setAttribute('uv', new THREE.Float32BufferAttribute(U, 2));
    g.setIndex(I); g.computeVertexNormals();
    const mesh = new THREE.Mesh(g, m); mesh.castShadow = sc.shadows; mesh.receiveShadow = true; group.add(mesh); return mesh;
  };
  mk(pos, uv, idx, mat); mk(cpos, null, cidx, capMat);
  sc.instances(partsOf(C.balustrade(4)), balSpots, { cast: false });
  sc.instances(partsOf(C.flagpole({ a: 0xb3122a, b: 0xf2efe6, h: 7 })), flagSpots, { cast: false });
  sc.instances(partsOf(C.streetLamp()), lampSpots, { cast: false });

  // the cloture fence: barricades just off the inside edge from the middle leg round hairpin two and back along the
  // leg below, with a sign over the steps. They are solid until the race leader starts the final lap, then fold away.
  const fence = sc.along({ from: 29.66, to: 36.42, side: 1, offset: 2.4, spacing: 1.1 }).map(p => ({ ...p, y: sc.y(p.x, p.z) - 0.05, yaw: p.yaw + Math.PI / 2 }));
  const fenceMeshes = sc.instances(partsOf(C.barricade()), fence, { cast: false, scale: 1.2 });
  // A zero-radius scenery collider still catches the kart's wheel envelope. Use the actual
  // drivable boundary at the barricades, then restore the authored infield width on opening.
  const first = track.indexAtCp(29.6), last = track.indexAtCp(36.45);
  let openWidths = clotureWidths.get(track);
  if (!openWidths) { openWidths = track.outerL.slice(first, last + 1); clotureWidths.set(track, openWidths); }
  const setGate = open => {
    if (open) track.outerL.set(openWidths, first);
    else for (let i = first; i <= last; i++) track.outerL[i] = Math.min(2.25, openWidths[i - first]);
  };
  setGate(false);
  for (const [x, z] of [[-110, 86], [-100, 74], [-110, 60]]) taken.push([x, z, 11]);
  // Follow the actual graded hillside. The flared stone treads bend from the top straight
  // through the opening and back onto the lower leg, so the exit is visible from the crest.
  const spine = new THREE.CatmullRomCurve3([
    [-122, 90], [-108, 86], [-101, 80], [-99.5, 73.5], [-102, 65], [-109, 59], [-120, 57],
  ].map(([x, z]) => new THREE.Vector3(x, 0, z)));
  const tread = [], treadUv = [], faces = [];
  for (let j = 0; j <= 72; j++) {
    const u = j / 72, center = spine.getPointAt(u), tangent = spine.getTangentAt(u);
    const half = 4.1 + 1.35 * Math.abs(2 * u - 1);
    for (const side of [-1, 0, 1]) {
      const x = center.x + tangent.z * half * side, z = center.z - tangent.x * half * side;
      tread.push(x, sc.y(x, z) + 0.08, z);
      treadUv.push((side + 1) / 2, u * 24);
    }
    if (j < 72) for (let k = 0; k < 2; k++) {
      const q = j * 3 + k;
      faces.push(q, q + 1, q + 3, q + 1, q + 4, q + 3);
    }
  }
  const treadGeo = new THREE.BufferGeometry();
  treadGeo.setAttribute('position', new THREE.Float32BufferAttribute(tread, 3));
  treadGeo.setAttribute('uv', new THREE.Float32BufferAttribute(treadUv, 2));
  treadGeo.setIndex(faces); treadGeo.computeVertexNormals();
  const paving = canvasTex(256, 96, (g, w, h) => {
    g.fillStyle = '#c8bb9e'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#e8dfc5'; g.fillRect(0, 3, w, 5);
    g.fillStyle = '#756f65'; g.fillRect(0, 0, w, 3); g.fillRect(w / 2, 0, 1, h);
    g.fillStyle = '#8f762f'; g.fillRect(6, 0, 3, h); g.fillRect(w - 9, 0, 3, h);
  });
  const landing = new THREE.Mesh(treadGeo, new THREE.MeshStandardMaterial({ map: paving, roughness: 0.92, side: THREE.DoubleSide }));
  landing.receiveShadow = true; group.add(landing);
  // the sign over the steps: FILIBUSTER IN PROGRESS for two laps, CLOTURE INVOKED on the last
  const SX = -99.5, SZ = 73.5, SY = legY(1, SX) + 0.2;
  const draw = open => (g, w, h) => {
    g.fillStyle = open ? '#16a34a' : '#b3122a'; g.fillRect(0, 0, w, h); g.strokeStyle = '#ffd23c'; g.lineWidth = 12; g.strokeRect(8, 8, w - 16, h - 16);
    C.fitText(g, open ? 'CLOTURE INVOKED' : 'FILIBUSTER IN PROGRESS', w / 2, h * 0.38, w * 0.86, 120, C.SIGN_FONT, '#ffffff', { lines: 1 });
    C.fitText(g, open ? 'DEBATE CUT SHORT: TAKE THE STEPS' : 'STEPS CLOSED UNTIL THE FINAL LAP', w / 2, h * 0.74, w * 0.86, 56, C.SANS, '#ffd23c', { lines: 1 });
  };
  const signTex = canvasTex(1024, 256, draw(false), { repeat: false });
  {
    const q = new C.Quads();
    for (const s of [1, -1]) q.panel([SX, SY + 7.2, SZ + s * 0.06], s > 0 ? 0 : Math.PI, 16, 4, [0, 0, 1, 1]);
    const m = new THREE.Mesh(q.geometry(), new THREE.MeshStandardMaterial({ map: signTex, roughness: 0.6, emissive: 0xffffff, emissiveMap: signTex, emissiveIntensity: 0.25 })); m.matrixAutoUpdate = false; group.add(m);
    const b = new ModelBuilder(); for (const d of [-7.4, 7.4]) { b.add("p", cyl(0.25, 0.25, 9.4, 8), { p: [SX + d, SY + 4.5, SZ] }); track.addCollider(SX + d, SZ, 0.6); }
    group.add(b.build({ p: plastic(0x2a2d36, 0.5, 0.3) }));
  }
  let shown = false, drop = 0;
  anim.push(dt => {
    const open = clotureOpen(view.race);
    if (open !== shown) { shown = open; const g = signTex.image.getContext('2d'); draw(open)(g, signTex.image.width, signTex.image.height); signTex.needsUpdate = true; setGate(open); }
    const target = open ? 1 : 0;
    if (drop !== target) { drop += Math.sign(target - drop) * Math.min(Math.abs(target - drop), dt * 1.4); for (const m of fenceMeshes) m.position.y = -2.4 * drop; }
  });
}

/* ---------- the joke pass ---------- */
// the revolving door spans the Mall leg on a skybridge between its two towers, where the climb gets steep
const DOOR = { cp: 11.72, span: 62, deckY: 10.2 };
const doorSite = track => { const i = track.indexAtCp(DOOR.cp); return { x: track.px[i], y: track.py[i], z: track.pz[i], yaw: track.yaw[i], i }; };
const STATUE = { x: 112, z: 236 };        // in the middle of the bend at the foot of the pool, looking back up the pool run
const CANNON = { x: 121, z: 114 };        // beside the Climb, aimed at the dome
const LECTERN = { x: -167, z: 122.5 };    // in the infield of hairpin one: you drive round him
const MAZE = { x: -222, z: 18 };
const PERMIT = { x: -146, z: 24.5 };      // in the infield of hairpin three: the red tape, at the scale it is really issued          // beyond hairpin three
const BOARDS = [
  [2.3, 1, 20, 'DEMOLITION VIEWING: NEXT LEFT', '#d4af37', '#12142b'],
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

  /* ---- 1. the centerpiece: the revolving door between REGULATOR and INDUSTRY, built over the Mall leg ----
     The two towers stand either side of the climb and a glass skybridge joins them with the revolving door on it:
     the karts drive under the door while the suits go round over their heads, from one tower to the other. */
  const co = doorSite(track), cy = co.y;
  const cx = C.revolvingDoorBridge({ span: DOOR.span, deckY: DOOR.deckY });
  sc.place(cx, co.x, co.z, { yaw: co.yaw, y: cy });
  const door = cx.userData.door, drum = toWorld(co, cx.userData.drum); door.removeFromParent();
  door.position.set(drum[0], drum[1], drum[2]); door.rotation.y = co.yaw; group.add(door);
  bake.add(cx);
  for (const s of [-1, 1]) { const t = toWorld(co, [s * DOOR.span / 2, 0, 0]); track.addCollider(t[0], t[2], 10.5); }
  const sg = cx.userData.signs;
  const sReg = atlas.add(1024, 240, (g, w, h) => { g.fillStyle = '#f2efe6'; g.fillRect(0, 0, w, h); g.strokeStyle = '#d4af37'; g.lineWidth = 14; g.strokeRect(10, 10, w - 20, h - 20); fitText(g, 'REGULATOR', w / 2, h * 0.55, w * 0.88, 180, F, '#1f3f8a', { lines: 1 }); });
  const sInd = atlas.add(1024, 240, (g, w, h) => { g.fillStyle = '#12142b'; g.fillRect(0, 0, w, h); g.strokeStyle = '#38ff74'; g.lineWidth = 14; g.strokeRect(10, 10, w - 20, h - 20); fitText(g, 'INDUSTRY', w / 2, h * 0.55, w * 0.88, 180, F, '#38ff74', { lines: 1 }); });
  atlas.place2(sReg, toWorld(co, sg.reg), co.yaw, 22, 5.15);
  atlas.place2(sInd, toWorld(co, sg.ind), co.yaw, 22, 5.15);
  const sDoor = atlas.add(1024, 330, (g, w, h) => {
    g.fillStyle = '#d4af37'; g.fillRect(0, 0, w, h); g.fillStyle = '#12142b'; g.fillRect(12, 12, w - 24, h - 24);
    fitText(g, 'REVOLVING DOOR', w / 2, h * 0.38, w * 0.84, 150, F, '#ffd23c', { lines: 1 });
    fitText(g, 'SAME PEOPLE, NEW BUSINESS CARDS', w / 2, h * 0.76, w * 0.84, 62, SANS, '#ffffff', { lines: 1 });
    for (const [x0, dir] of [[w * 0.06, 1], [w * 0.94, -1]]) { g.strokeStyle = '#ffd23c'; g.lineWidth = 12; g.beginPath(); g.arc(x0, h * 0.4, 30, dir > 0 ? 0.3 : 3.4, dir > 0 ? 5.5 : 8.6); g.stroke(); }
  });
  atlas.place2(sDoor, toWorld(co, sg.door), co.yaw, 21, 6.8);
  for (const k of ['reg', 'ind']) for (const d of [-7, 7]) { const p = toWorld(co, [sg[k][0] + d, 0, 0]); pole(p[0], p[2], cy + sg[k][1] - 7, cy + sg[k][1] - 2.4, 0.3); }
  for (const d of [-6, 6]) { const q = toWorld(co, [d, 0, 0]); pole(q[0], q[2], cy + DOOR.deckY + 11, cy + sg.door[1] - 3.2, 0.3); }
  // the suits, going round with the door
  const SUITS = [0, 1, 2, 3].flatMap(k => [[2.6, k * Math.PI / 2 - 0.3], [5.1, k * Math.PI / 2 + 0.35]]);   // two per quarter of the door
  const suits = sc.instances(partsOf(C.suit()), SUITS.map(() => ({ x: drum[0], y: drum[1], z: drum[2], yaw: 0 })), { tints: C.SUIT_TINTS, cast: false });
  for (const m of suits) m.frustumCulled = false;
  const Ms = new THREE.Matrix4(), Qs = new THREE.Quaternion(), Ps = new THREE.Vector3(), Ss = new THREE.Vector3(2.5, 2.5, 2.5), Ys = new THREE.Vector3(0, 1, 0);

  /* ---- 2. the Avenue: the congressional portfolio, on a stock ticker you cannot miss ---- */
  const tickAt = sc.beside(2.0, 1, 23), tickYaw = yawTo(tickAt, { x: 45, z: 0 }), tickY = tickAt.y + 13;
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
  const halfSide = y => ctx.monument.userData.half(y);
  const ceil = { y: OBELISK.h * 0.2 };

  /* ---- 5. beside the Climb: the K Street cash cannon, firing at the dome ---- */
  const capTop = (() => { const i0 = track.indexAtCp(20), i1 = track.indexAtCp(22); return new THREE.Vector3((track.px[i0] + track.px[i1]) / 2, track.py[i0] + 40, (track.pz[i0] + track.pz[i1]) / 2); })();
  const can = C.cashCannon(), canYaw = yawTo(CANNON, { x: capTop.x, z: capTop.z }), canY = sc.y(CANNON.x, CANNON.z) - 0.2;
  sc.place(can, CANNON.x, CANNON.z, { yaw: canYaw, y: canY, scale: 1.3 });
  const muzzle = new THREE.Vector3(...toWorld({ x: CANNON.x, y: canY, z: CANNON.z, yaw: canYaw, scale: 1.3 }, can.userData.muzzle));
  bake.add(can);
  {
    const roadside = sc.beside(12.14, -1, 13), at = [roadside.x, roadside.y, roadside.z], y0 = roadside.y;
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
  const LS = 1.0, lec = C.filibusterLectern(), lecYaw = yawTo(LECTERN, roadPt(22.4)), lecY = sc.y(LECTERN.x, LECTERN.z) - 0.4;
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

  /* ---- 8b. hairpin three's infield: the red tape dispenser, at the scale permits are really issued ---- */
  {
    const S = 4.6, yaw = yawTo(PERMIT, roadPt(36.9)), y = sc.y(PERMIT.x, PERMIT.z) - 0.3, rt = C.redTape();
    const px = PERMIT.x - Math.sin(yaw) * 4.5, pz = PERMIT.z - Math.cos(yaw) * 4.5;
    sc.place(rt, px, pz, { yaw, y, scale: S }); bake.add(rt);
    track.addCollider(px, pz, 4.5); track.addCollider(px + Math.sin(yaw) * 5, pz + Math.cos(yaw) * 5, 3);
    const at = toWorld({ x: px, y, z: pz, yaw }, [0, 0, -7]);
    const s = atlas.add(1024, 300, (g, w, h) => { g.fillStyle = '#ffffff'; g.fillRect(0, 0, w, h); g.fillStyle = '#d0142f'; g.fillRect(0, 0, w, h * 0.22); fitText(g, 'PERMIT OFFICE', w / 2, h * 0.11, w * 0.6, 50, SANS, '#ffffff', { lines: 1 }); fitText(g, 'NOW SERVING: 1997', w / 2, h * 0.5, w * 0.86, 120, F, '#12142b', { lines: 1 }); fitText(g, 'PLEASE ALLOW 6 TO 8 YEARS', w / 2, h * 0.8, w * 0.8, 52, SANS, '#d0142f', { lines: 1 }); });
    atlas.place2(s, [at[0], y + 15, at[2]], yaw, 16, 4.7);
    for (const d of [-6, 6]) pole(at[0] + Math.cos(yaw) * d, at[2] - Math.sin(yaw) * d, y - 0.5, y + 12.7, 0.3);
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
    door.rotation.y = co.yaw + time * 0.32;
    SUITS.forEach(([r, a0], n) => {
      const a = a0 + time * 0.32;
      Ps.set(drum[0] + Math.sin(a) * r, drum[1] + 0.05, drum[2] + Math.cos(a) * r); Qs.setFromAxisAngle(Ys, a + Math.PI / 2);
      Ms.compose(Ps, Qs, Ss); for (const m of suits) m.setMatrixAt(n, Ms);
    });
    for (const m of suits) m.instanceMatrix.needsUpdate = true;
    // the ticker
    T.tick += dt; if (T.tick > 0.08) { T.tick = 0; drawTicker(time); }
    // the debt ceiling goes up a notch every lap (and creeps between)
    const lap = leaderLap(), H = OBELISK.h, target = Math.min(H * 0.92, H * (0.2 + (lap - 1) * 0.3) + Math.min(H * 0.08, (time % 40) * 0.12));
    ceil.y += (target - ceil.y) * Math.min(1, dt * 0.8);
    const hs = halfSide(ceil.y) + 0.35, wy = ob.y + ceil.y;
    collar.position.set(OBELISK.x, wy, OBELISK.z); collar.scale.set(hs, hs / 2.5, hs);
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
