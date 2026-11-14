/* Silicon Valley Circuit: the opener. A sunny campus loop with a hill climb,
   a crest jump, and a fast run home past the grandstands. */
import { fbm, smoothstep } from '../core/util.js';

import { Scenery, partsOf } from '../render/scenery.js';
import * as P from '../models/props.js';
import * as S from '../models/props-silicon-valley.js';

const POND = { x: -40, z: 102, r: 46 };
const RING = { x: -40, z: 102, r: 72, band: 15 };
const ROCKET = { x: 286, z: 96 };
/* The bay the Golden Gate crosses (#168): a strait running south from the infield to a
   basin outside the loop. The terrain fn floods everything within the strait's reach
   (the scatter water check keeps scenery out of it). Axis: a two-segment polyline. */
const BAY_AXIS = [[186, -140], [200, -45], [212, 20]];
const BAY_FLOOR = -5.5, BAY_R = 40, BAY_SLOPE = 30;
function bayDist(x, z) {
  let d = Infinity;
  for (let k = 0; k < BAY_AXIS.length - 1; k++) {
    const [ax, az] = BAY_AXIS[k], [bx, bz] = BAY_AXIS[k + 1];
    const dx = bx - ax, dz = bz - az, L2 = dx * dx + dz * dz;
    const t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / L2));
    d = Math.min(d, Math.hypot(x - (ax + dx * t), z - (az + dz * t)));
  }
  return d;
}
/* The two islands. The Founder's Fountain sits on the run to the line between x = -52 and -12; Sand Hill's median
   between z = 32 and 70 on the climb. Both sit on the left of the main lane at lat 11.4 (rivals on the racing line
   never touch them); posts: control-point params of their collision circles, every 2.5 m. */
const ISLAND_LAT = 11.4, ISLAND_R = 2.4;
const xToCp = x => x < -82 ? 19 + (x + 112) / 30 : x < -58 ? 20 + (x + 82) / 24 : x < -18 ? 21 + (x + 58) / 40 : 22 + (x + 18) / 18;
const zToCp = z => 4 + (z - 24) / 50;                 // Sand Hill: cp 4 is at z = 24, cp 5 at z = 74
const FOUNTAIN = { x0: -52, x1: -12, posts: [] }, MEDIAN = { z0: 32, z1: 70, posts: [] };
for (let x = FOUNTAIN.x0; x <= FOUNTAIN.x1 + 0.01; x += 2.5) FOUNTAIN.posts.push(xToCp(x));
for (let z = MEDIAN.z0; z <= MEDIAN.z1 + 0.01; z += 2.5) MEDIAN.posts.push(zToCp(z));
/** The race leader's lap (1 = the first lap): the LP lane opens when the leader starts lap 2. */
const leaderLap = race => race.karts.reduce((m, k) => Math.max(m, k.lap), 0);
/* The centerpiece: the PIVOT TO AI tower in the infield beyond the grandstands, facing the start straight. */
const PIVOT = { x: 125, z: 72, yaw: -2.03, w: 36, h: 36, legs: 16 };

/* Billboards: [cp, side, metres beyond the road edge, text, background, ink]. */
const BOARDS = [
  [1.28, -1, 22, 'EVERY RIDE LOSES MONEY. VOLUME!', '#1a1d29', '#ffd23c'],
  [6.6, -1, 30, 'HIRING: 10X ENGINEER, 0.1X SALARY', '#ffffff', '#1f6bff'],
  [8.4, 1, 18, 'UNLIMITED PTO (DO NOT TAKE IT)', '#2ee6a6', '#1a1d29'],
  [9.2, 1, 20, 'A BETTER WORLD (FOR SHAREHOLDERS)', '#7b5cff', '#ffffff'],
  [10.0, -1, 16, 'RETURN TO OFFICE. OR ELSE.', '#ffd23c', '#1a1d29'],
  [11.5, -1, 26, 'FREE KOMBUCHA. NO RAISES.', '#ff8a3c', '#1a1d29'],
  [17.3, 1, 22, 'MOVE FAST. BREAK LAWS.', '#1a1d29', '#ffffff'],
  [18.1, -1, 30, 'PRE-REVENUE. POST-SHAME.', '#0ea5e9', '#ffffff'],
];
const STANDS = ['SEATS PAID IN EQUITY', 'INTERN SECTION (UNPAID)', "VC BOX: LET'S CIRCLE BACK", 'LAID OFF? FREE SEATS!'];
const PLACARDS = ['SHIP IT!', 'IS IT AGI YET?', "MOM, I'M A UNICORN", 'WHERE IS MY EQUITY', 'PIVOT!', '996 OR BUST', 'NO REVENUE, NO PROBLEM', 'I FUNDED THIS'];

export default {
  id: 'silicon-valley',
  name: 'Silicon Valley Circuit',
  tagline: 'Move fast. Break things. Pivot to AI.',
  lapNotes: ['<b>Lap 2.</b> Pivot complete. You are now an AI company.', '<b>Final lap.</b> Market correction: layoffs, a down round, and one last pivot — to KARTS.'],
  // the opening shot: rising past the grandstands toward the pivot tower
  intro: [{ pos: [-74, 3.5, -27], look: [-32, 10, -11], pos1: [-58, 8, -33], look1: [-24, 12, -8], fov: 48, dur: 2.2 },   // the Founder, from behind his fountain
    { pos: [-6, 21, -10], look: [PIVOT.x, 30, PIVOT.z], pos1: [38, 23, 2], look1: [PIVOT.x, 32, PIVOT.z], fov: 45, dur: 3 }],
  laps: 3,
  width: 17,
  sky: 'day',
  backdrop: { img: 'assets/backdrops/silicon-valley.webp', top: 27, bottom: -9, rot: 0.14 },
  offroad: 'grass',
  defaults: { edge: 'open', shoulder: 3.5, outer: 11 },
  path: [
    { p: [0, 0, 0] },            // 0 start/finish, heading +x
    { p: [95, 0, 0] },           // 1
    { p: [162, 4.5, -40], w: 19 },// 2 the bridge approach: swings south off the shore, climbing onto the deck
    { p: [246, 8, -26], w: 19 }, // 3 far shore: the Golden Gate deck ends in a big sweeper (turn one now)
    { p: [245, 6.6, 24], wl: 22 },// 4 Sand Hill Road: the landscaped median splits it (the LP lane on the left)
    { p: [241, 5.2, 74], wl: 22 },// 5
    { p: [236, 4.5, 116] },      // 6 the dip at the foot of the climb
    { p: [168, 13, 178] },       // 7 Partner Summit: the climb's crest
    { p: [84, 12.5, 150], w: 15 },// 8 esses at the top
    { p: [22, 15.5, 196], w: 15 },// 9
    { p: [-62, 15, 214] },       // 10 crest
    { p: [-140, 8.5, 180], w: 19 },// 11 downhill sweeper
    { p: [-198, 2.5, 116] },     // 12 the foot of the hill, sweeping onto Palm Drive
    { p: [-208, 0.4, 56], w: 18 },// 13 Palm Drive
    { p: [-208, 0, -22], w: 18 },// 14 the end of Palm Drive: the chapel dead ahead
    { p: [-203, 0, -50] },       // 15 the Oval hairpin, round the lawn (moved out/up #215 item 1: AI ran wide onto the grass at the entry)
    { p: [-174, 0, -68] },       // 16
    { p: [-148, 0, -56] },       // 17
    { p: [-138, 0, -24] },       // 18 back north, and left into the Quad
    { p: [-112, 0, 0], w: 14 },  // 19 the Quad arcade: 14 m between the arches
    { p: [-82, 0, 0], w: 14 },   // 20
    { p: [-58, 0, 0], wl: 22 },  // 21 the Founder's Fountain splits the road (island on the left)
    { p: [-18, 0, 0], wl: 22 },  // 22
  ],
  sides: [
    { from: 19.8, to: 1.6, side: 'L', edge: 'wall' },   // pit wall along the grandstand side (the fountain's inside lane runs along it)
    { from: 18.95, to: 19.8, edge: 'wall', wallHeight: 1.1 }, // the Quad arcade: walls right under the arches
    { from: 9.6, to: 10.9, edge: 'wall' },               // crest and jump are fenced in
    { from: 12.45, to: 14.4, shoulder: 1.6, outer: 3.2 }, // Palm Drive: the palms stand close, behind a low wall
    { from: 1.45, to: 3.12, edge: 'wall', wallHeight: 0.85 }, // the bridge guardrails: low enough to see the bay over
  ],
  bridges: [
    { from: 1.45, to: 3.12 },                            // the Golden Gate span: terrain/water stay below the deck
  ],
  ramps: [
    { at: 10.25, len: 9, lift: 2.1 },
  ],
  boosts: [
    { at: 0.55, lat: 0, w: 5 },
    { at: 2.45, lat: 0, w: 5 },
    { at: 4.35, lat: 17.4, w: 4.5 }, { at: 4.95, lat: 17.4, w: 4.5 }, // Sand Hill: the LP lane's reward, two pads (second pad 4.8 -> 4.95, #215 item 4 re-time)
    { at: 6.2, lat: -4, w: 4.5 },
    { at: 16.3, lat: 3, w: 4.5 },                        // the Oval: a pad on the outside line round the hairpin (lat 5 -> 3, #215 item 1)
    { at: 21.55, lat: 17.4, w: 4.5 },                    // the fountain's inside lane: narrow, walled, and quick
  ],
  itemRows: [{ at: 1.5 }, { at: 7.6 }, { at: 11.6 }, { at: 13.35 }, { at: 21.25, n: 3 }],
  coins: [
    { from: 0.2, to: 0.5, n: 4, lat: 4.5 }, { from: 2.15, to: 2.85, n: 5, lat: 0 },
    { from: 4.15, to: 4.85, n: 5, lat: [-3, 3] },        // Sand Hill's main lane
    { from: 8.2, to: 8.9, n: 5, lat: [-4, 4] }, { from: 10.34, to: 10.5, n: 3, lat: 0, air: 2.6 },
    { from: 12.6, to: 13.1, n: 4, lat: -4 },
    { from: 15.3, to: 16.7, n: 6, lat: -5 },             // the Oval: coins on the inside line
    { from: 21.15, to: 22.05, n: 6, lat: 17.4 },         // the fountain's inside lane
  ],
  // Two islands split the road, each a row of round static obstacles off the main lane (lat 11.4, so rivals on the
  // racing line never touch them; the same collision in the browser and the simulator), drawn in decorate().
  // Rivals stay on the main lane unless a shortcut sends them round the other side.
  obstacles: [...FOUNTAIN.posts, ...MEDIAN.posts].map(at => ({ kind: 'static', model: 'hidden', at, lat: ISLAND_LAT, radius: ISLAND_R, effect: 'bump' })),
  models: { hidden: () => S.nothing() },
  shortcuts: [
    // the LP lane opens on lap 2 (#121): until then the gate across it is shut
    { name: 'the LP lane', from: 3.55, to: 5.6, path: [[250, 4], [258, 20], [261.5, 42], [258, 72]], skill: 0.3, when: race => leaderLap(race) >= 2 },
    { name: 'fountain', from: 19.8, to: 0.4, path: [[-76, -8], [-62, -16.5], [-12, -17.4]], skill: 0.3 },
  ],
  terrain: {
    cell: 3, margin: 150, blend: 30, water: -1.4,
    fn(x, z) {
      // rolling golden-state hills, a pond in the infield, and higher ground out at the rim
      let h = (fbm(x * 0.0065, z * 0.0065, 4, 7) - 0.42) * 30;
      h += (fbm(x * 0.021, z * 0.021, 3, 19) - 0.5) * 5;
      const d = Math.hypot(x - 0, z - 90);
      h += smoothstep(250, 430, d) * 34;
      const pd = Math.hypot(x - POND.x, z - POND.z);
      const pond = 1 - smoothstep(POND.r * 0.45, POND.r * 1.25, pd);
      h = Math.max(h, 1.2 + (fbm(x * 0.03, z * 0.03, 2, 3) - 0.5) * 1.5); // keep the land above the water table
      h = h * (1 - pond) + (-4.2) * pond;
      // The Farm (#135): level ground for Palm Drive, the Oval, the Quad, and the chapel, a little above the road
      // (#242: the plateau runs to z = -178 so it passes under the chapel's whole nave; at -150 the nave's back end sank into the rising hill)
      const cdx = Math.max(-250 - x, 0, x + 100), cdz = Math.max(-178 - z, 0, z - 60), campus = 1 - smoothstep(0, 34, Math.hypot(cdx, cdz));
      h = h * (1 - campus) + 0.45 * campus;
      const ring = 1 - smoothstep(10, 24, Math.abs(pd - RING.r + RING.band / 2));
      h = h * (1 - ring) + 2.2 * ring;
      const pad = 1 - smoothstep(16, 34, Math.hypot(x - ROCKET.x, z - ROCKET.z));
      h = h * (1 - pad) + 13 * pad;
      // the bay (#168): the strait the bridge crosses, flooded last so nothing refills it
      const bay = 1 - smoothstep(BAY_R, BAY_R + BAY_SLOPE, bayDist(x, z));
      h = h * (1 - bay) + BAY_FLOOR * bay;
      return h;
    },
  },
  look: {
    road: { base: 0x5d6373, line: 0xffffff, center: 0xffd23c },
    kerb: [0xe23b3b, 0xf7f7f2],
    shoulder: 0xd2bb86,
    terrain: { low: 0x58ad45, high: 0x8fd25a, dry: 0xc9c45e, rock: 0x9c9388, sand: 0xe9d7a2, dirt: 0xbf9f6e },
  },
  POND,

  /** Dress the course. ctx: { THREE, track, group, gfx, anim, view } */
  decorate(ctx) {
    const { THREE, track, anim, view } = ctx, sc = new Scenery(ctx), rng = sc.rng;
    const L = track.length;
    const atlas = S.makeAtlas(ctx.group), bake = S.makeBaker(ctx.group, sc.shadows);
    const taken = [];                                                   // footprints of the gags: [x, z, r]; trees and campus blocks keep out
    const free = (x, z) => !taken.some(([tx, tz, r]) => (tx - x) ** 2 + (tz - z) ** 2 < r * r);
    /** Local frame of a placement: u to its right, v forward (toward the road for things facing it), y up. */
    const local = (p, u, v, y) => [p.x + Math.cos(p.yaw) * u + Math.sin(p.yaw) * v, y, p.z - Math.sin(p.yaw) * u + Math.cos(p.yaw) * v];
    const signs = new Map();
    /** One atlas region per distinct sign, however many times it is placed. */
    const sign = (key, w, h, draw) => { if (!signs.has(key)) signs.set(key, atlas.add(w, h, draw)); return signs.get(key); };
    const board = (text, opts = {}, w = 768, h = 256) => sign(text + JSON.stringify(opts) + w, w, h, S.signDraw(text, opts));
    /** Two legs for a free-standing sign w wide whose top is `top` metres up. Each post is planted at its
        own (x, z) in the rendered terrain (#242: posts used to hang from the sign's centre height, so on a
        slope one post hovered and the other drowned). `base` (x, z) => y overrides the ground for signs
        that stand on something else: a roof, or the scooter heap. */
    const legs = (p, w, top, color = 0x3a414c, base = null) => { for (const u of [-w * 0.32, w * 0.32]) { const [x, , z] = local(p, u, -0.4, 0); const g = (base ? base(x, z) : track.terrainHeight(x, z)) - 0.35; const q = S.post(Math.max(0.6, p.y + top - 0.3 - g), 0.3, color); sc.place(q, x, z, { y: g }); bake.add(q, false); } };

    // start/finish gantry and grandstands along the main straight
    const g0 = sc.beside(0, 1, -track.hwL[0]);                         // centre of the road at the line
    const gantry = P.gantry(track.hwL[0] + track.hwR[0] + 1.5, 'START-UP LINE');
    sc.place(gantry, g0.x, g0.z, { yaw: g0.along, y: g0.roadY });
    view.startLights = gantry.userData.lights;
    const stand = P.grandstand({ w: 30, rows: 6, color: 0x2f6bff }), stand2 = P.grandstand({ w: 30, rows: 6, color: 0xe23b3b });
    const seats = [];
    const M = new THREE.Matrix4(), V = new THREE.Vector3();
    let nStand = 0;
    const putStand = (proto, p) => {
      // seat on the lowest corner of the base box in the rendered terrain: centre-seated stands
      // hovered a front corner over the infield slope (#242)
      const gy = Math.min(...[[-15.4, 1.3], [15.4, 1.3], [-15.4, -8.3], [15.4, -8.3]].map(([u, v]) => { const [x, , z] = local(p, u, v, 0); return track.terrainHeight(x, z); })) - 0.1;
      const g = proto.group.clone(); sc.place(g, p.x, p.z, { yaw: p.yaw, y: gy });
      g.updateMatrixWorld(true); M.copy(g.matrixWorld);
      for (const s of proto.seats) if (rng() < 0.82) { V.set(s[0], s[1], s[2]).applyMatrix4(M); seats.push({ x: V.x, y: V.y, z: V.z, yaw: p.yaw + rng.range(-0.4, 0.4) }); }
      bake.add(g);
      // a banner under the roof, and the front row holding up placards
      const k = nStand++;
      atlas.place(board(STANDS[k % STANDS.length], { bg: k % 2 ? '#ffd23c' : '#ffffff', fg: '#1a1d29', size: 120, lines: 1 }, 1024, 96), local(p, 0, 2.3, gy + 7.9), p.yaw, 28, 2.6);
      [-10, 0.5, 10.5].forEach((u, j) => {
        const text = PLACARDS[(k * 3 + j) % PLACARDS.length];
        atlas.place(board(text, { bg: ['#ffffff', '#ff4d6d', '#38b6ff', '#2ee6a6'][(k + j) % 4], fg: '#1a1d29', size: 110, border: '#1a1d29' }, 384, 224), local(p, u + rng.range(-1.5, 1.5), 0.4, gy + 3.9), p.yaw + rng.range(-0.15, 0.15), 3.0, 1.75);
      });
    };
    sc.along({ from: 20.25, to: 1.3, side: 1, offset: 6.5, spacing: 34 }).forEach((p, i) => putStand(i % 2 ? stand2 : stand, p));
    sc.along({ from: 20.4, to: 0.9, side: -1, offset: 17, spacing: 34, phase: 12 }).forEach((p, i) => putStand(i % 2 ? stand : stand2, p));
    const crowd = sc.instances(partsOf(P.spectator()), seats, { scale: [0.95, 1.2], tints: P.CROWD_TINTS, cast: false });
    const crowdFull = crowd.map(m => m.count);
    // the correction (#121): on the final lap the layoffs land and the grandstands empty out
    let crowdFill = 1, crowdShown = -1;
    anim.push(dt => {
      crowdFill += ((view.finalLap ? 0.3 : 1) - crowdFill) * Math.min(1, dt * 0.7);
      const n = Math.round(crowdFill * 200);
      if (n !== crowdShown) { crowdShown = n; crowd.forEach((m, k) => { m.count = Math.floor(crowdFull[k] * crowdFill); }); }
    });

    // campusBlock() makes a wall material per call; share one per window texture so the baker merges them
    const wallMats = new Map(), origAdd = bake.add;
    bake.add = (obj, cast = true) => { obj.traverse?.(o => { if (o.isMesh && o.material?.map && !o.material.userData.shared) { const k = o.material.map.uuid; if (!wallMats.has(k)) { o.material.userData.shared = true; wallMats.set(k, o.material); } o.material = wallMats.get(k); } }); origAdd(obj, cast); };
    const kit = { THREE, track, group: ctx.group, sc, rng, atlas, bake, taken, local, sign, board, legs, anim, view };
    gags(kit);
    campus(kit);
    sandHill(kit);

    // The Ring: glass doughnut HQ around the pond, the landmark you can see from most of the lap
    const ring = P.ringHQ({ R: RING.r, band: RING.band, H: 13 });
    sc.place(ring, RING.x, RING.z, { y: 2.1, cast: true });
    // a concrete foundation ring under the outer wall: toward the start straight the lawn falls
    // away and the glass hovered up to 0.7 m over it (#242)
    const skirt = new THREE.Mesh(new THREE.CylinderGeometry(RING.r + 0.5, RING.r + 1.1, 1.6, 96, 1, true), new THREE.MeshStandardMaterial({ color: 0x9aa0ab, roughness: 0.85, side: THREE.DoubleSide }));
    skirt.position.set(RING.x, 2.1 - 0.75, RING.z); ctx.group.add(skirt); bake.add(skirt);
    // garden inside the ring (seated on the rendered terrain, like every scatter planting: #242)
    const inner = sc.scatter({ count: 46, min: 60, max: 400, where: (x, z) => { const d = Math.hypot(x - RING.x, z - RING.z); return d > POND.r * 1.15 && d < RING.r - RING.band - 3; } }).map(p => ({ ...p, y: track.terrainHeight(p.x, p.z) }));
    sc.instances(partsOf(P.roundTree(11, { h: 6.5, leafA: 0x57b548, leafB: 0x8fd25a })), inner.slice(0, 26), { scale: [0.8, 1.3], yaw: 'random', sink: 0.25 });
    sc.instances(partsOf(P.bush(4, { color: 0x6cc24f, flower: 0xff7eb6 })), inner.slice(26), { scale: [1, 1.8], yaw: 'random', sink: 0.15 });

    // rocket on the hill beyond turn one; it launches every so often
    const pad = P.rocketPad({ h: 36 });
    sc.place(pad, ROCKET.x, ROCKET.z, { yaw: -0.6, y: 13 });
    // the pad stands on a concrete mesa: west of the pad the rendered hill falls to 8.3 m and the
    // pad (seated at 13) hovered nearly 5 m over it (#242)
    let mesaMin = Infinity; for (let a = 0; a < 360; a += 15) mesaMin = Math.min(mesaMin, track.terrainHeight(ROCKET.x + Math.cos(a * Math.PI / 180) * 13.5, ROCKET.z + Math.sin(a * Math.PI / 180) * 13.5));
    const mesa = new THREE.Mesh(new THREE.CylinderGeometry(13.4, 15, 13 - mesaMin + 1.2, 24), new THREE.MeshStandardMaterial({ color: 0xa8adb8, roughness: 0.9 }));
    mesa.position.set(ROCKET.x, (13 + mesaMin - 1.2) / 2, ROCKET.z); ctx.group.add(mesa); bake.add(mesa);
    const rk = pad.userData.rocket; let rt = 14;
    const wp = new THREE.Vector3();
    anim.push((dt, time) => {
      rt += dt; const cycle = 52, t = rt % cycle;
      if (t < 5) {                                                   // ignition and lift-off
        const up = t < 1.2 ? 0 : Math.pow(t - 1.2, 2.2) * 9;
        rk.position.y = pad.userData.rocketBase + up; rk.visible = true;
        rk.getWorldPosition(wp);
        for (let i = 0; i < view.fx.count(t < 1.2 ? 40 : 90, dt); i++) {
          view.fx.flame(wp.x + rng.range(-1.5, 1.5), wp.y - 1, wp.z + rng.range(-1.5, 1.5), rng.range(-4, 4), -14 - rng() * 10, rng.range(-4, 4), [1, 0.7, 0.25], 4 + rng() * 3, 0.5);
          if (i % 2 === 0) view.fx.dust(wp.x + rng.range(-3, 3), Math.max(15, wp.y - 6), wp.z + rng.range(-3, 3), rng.range(-9, 9), rng.range(-2, 5), rng.range(-9, 9), [0.95, 0.95, 0.97], 7 + rng() * 6, 3.5, 0.55);
        }
      } else if (t < 22) { rk.visible = false; }                    // away
      else { rk.visible = true; rk.position.y = pad.userData.rocketBase; } // rolled back out
      void time;
    });

    // campus buildings on the hills
    const blocks = sc.scatter({ count: 11, min: 34, max: 120, maxSlope: 0.22, minGap: 46, where: (x, z) => Math.hypot(x - RING.x, z - RING.z) > RING.r + 20 && Math.hypot(x - ROCKET.x, z - ROCKET.z) > 40 && free(x, z) && free(x + 14, z) && free(x - 14, z) && free(x, z + 14) && free(x, z - 14) });
    const accents = [0x38b6ff, 0xff4d6d, 0xffd23c, 0x2ee6a6, 0x9b6bff, 0xff8a3c];
    blocks.forEach((p, i) => {
      const w = rng.range(18, 30), d = rng.range(12, 18), yaw = Math.round(p.yaw / (Math.PI / 4)) * (Math.PI / 4), cs = Math.cos(yaw), sn = Math.sin(yaw);
      // seat on the lowest corner of the footprint in the rendered terrain, not the centre:
      // centre-seated blocks hovered a corner over the hillside (#242)
      const gy = Math.min(...[[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([a, b]) => track.terrainHeight(p.x + cs * a * (w / 2 + 0.65) + sn * b * (d / 2 + 0.65), p.z - sn * a * (w / 2 + 0.65) + cs * b * (d / 2 + 0.65)))) - 0.25;
      const g = sc.place(P.campusBlock(i, { w, d, floors: 2 + (i % 3), accent: accents[i % accents.length] }), p.x, p.z, { yaw, y: gy }); bake.add(g);
    });
    const clearOfBuildings = (x, z) => free(x, z) && !blocks.some(b => (b.x - x) ** 2 + (b.z - z) ** 2 < 20 * 20) && Math.abs(Math.hypot(x - RING.x, z - RING.z) - RING.r + RING.band / 2) > RING.band && Math.hypot(x - ROCKET.x, z - ROCKET.z) > 22;

    // trees: oaks over the hills, cypress avenues, palms on the fast corners
    // (scatter seatings are re-based on the rendered terrain: scatter seats by the kart ground(),
    // which parts company with the visible mesh on the conform slopes — #242)
    const oakSpots = sc.scatter({ count: 300, min: 15, max: 190, maxSlope: 0.6, minGap: 5, where: clearOfBuildings }).map(p => ({ ...p, y: track.terrainHeight(p.x, p.z) }));
    const oakA = partsOf(P.roundTree(1, { h: 7.5 })), oakB = partsOf(P.roundTree(2, { h: 9, leafA: 0x3f9e3a, leafB: 0x5dbb45 })), oakC = partsOf(P.roundTree(3, { h: 6, leafA: 0x6fc94a, leafB: 0x9ad65a }));
    sc.instances(oakA, oakSpots.filter((_, i) => i % 3 === 0), { scale: [0.8, 1.5], yaw: 'random', tilt: 0.04, sink: 0.25 });
    sc.instances(oakB, oakSpots.filter((_, i) => i % 3 === 1), { scale: [0.8, 1.6], yaw: 'random', tilt: 0.04, sink: 0.25 });
    sc.instances(oakC, oakSpots.filter((_, i) => i % 3 === 2), { scale: [0.8, 1.4], yaw: 'random', tilt: 0.04, sink: 0.25 });
    const cyp = partsOf(P.cypress(1, { h: 12 }));
    sc.instances(cyp, [...sc.along({ from: 11.2, to: 12.3, side: -1, offset: 14.5, spacing: 9 }), ...sc.along({ from: 7.3, to: 9.4, side: 1, offset: 14.5, spacing: 9 }), ...sc.along({ from: 7.3, to: 9.4, side: -1, offset: 14.5, spacing: 9 })], { scale: [0.85, 1.2] });
    const palmA = partsOf(P.palm(1, { h: 10 })), palmB = partsOf(P.palm(5, { h: 8.5 }));
    // palms line the shores and the climb; sc.along skips bridge samples, so none land on the deck
    const palmSpots = [...sc.along({ from: 1.35, to: 3.6, side: -1, offset: 14, spacing: 12 }), ...sc.along({ from: 5.6, to: 6.9, side: -1, offset: 14, spacing: 12 }), ...sc.along({ from: 3.15, to: 3.6, side: 1, offset: 14, spacing: 12 }),
      // Palm Drive: an unbroken avenue, close to the kerb on both sides
      ...sc.along({ from: 12.55, to: 14.35, side: 1, offset: 4.6, spacing: 9 }), ...sc.along({ from: 12.55, to: 14.35, side: -1, offset: 4.6, spacing: 9, phase: 4.5 })];
    sc.instances(palmA, palmSpots.filter((_, i) => i % 2 === 0), { scale: [0.9, 1.25], yaw: 'random' });
    sc.instances(palmB, palmSpots.filter((_, i) => i % 2 === 1), { scale: [0.9, 1.25], yaw: 'random' });
    // shrubs and rocks close to the action (rendered-terrain seating, as the oaks: #242)
    const low = sc.scatter({ count: 240, min: 12.5, max: 46, maxSlope: 0.7, minGap: 2.5, where: clearOfBuildings }).map(p => ({ ...p, y: track.terrainHeight(p.x, p.z) }));
    sc.instances(partsOf(P.bush(1, { color: 0x58b548 })), low.filter((_, i) => i % 3 === 0), { scale: [0.8, 1.7], yaw: 'random', sink: 0.15 });
    sc.instances(partsOf(P.bush(2, { color: 0x79c94f, flower: 0xffd23c })), low.filter((_, i) => i % 3 === 1), { scale: [0.8, 1.5], yaw: 'random', sink: 0.15 });
    sc.instances(partsOf(P.bush(3, { color: 0x4aa544, flower: 0xff7eb6 })), low.filter((_, i) => i % 6 === 2), { scale: [0.8, 1.5], yaw: 'random', sink: 0.15 });
    sc.instances(partsOf(P.rock(1, { r: 1.3 })), low.filter((_, i) => i % 6 === 5), { scale: [0.6, 2], yaw: 'random', sink: 0.35, tints: [0xa8a096, 0x8f8880, 0xb7ada0] });

    // arrow boards on the outside of every real corner
    const chev = P.chevronBoard();
    for (const c of track.corners) {
      const side = c.dir > 0 ? -1 : 1, n = Math.max(2, Math.min(5, Math.round(c.len / 15)));
      for (let k = 0; k < n; k++) {
        const i = (c.i0 + Math.round(((k + 0.6) / n) * (c.len / track.ds))) % track.N;
        const p = sc.beside(track.cp[i], side, (side > 0 ? track.outerL[i] : track.outerR[i]) + 1.2);
        const b = chev.clone(); sc.place(b, p.x, p.z, { yaw: p.yaw, lift: 0.05 }); if (c.dir > 0) b.scale.x = -1;   // the posts plant on the ground (#242: lift 0.9 left every board hovering)
        bake.add(b, false);
      }
    }

    // big billboards where you are looking anyway, all one atlas
    const frame = P.billboard(null, { w: 15, h: 5, legs: 6 }); frame.remove(frame.children[frame.children.length - 1]);   // the frame, without its blank panel
    BOARDS.forEach(([at, side, off, text, bg, fg]) => {
      const p = sc.beside(at, side, off), yaw = p.yaw + rng.range(-0.12, 0.12), f = frame.clone();
      // plant the frame on the lower of its two legs in the rendered terrain: centre-seated frames
      // hovered on slopes — the cp 10 board floated 7 m over the grass (#242)
      const gy = Math.min(...[-4.8, 4.8].map(u => { const [x, , z] = local({ ...p, yaw }, u, -0.3, 0); return track.terrainHeight(x, z); })) - 0.05;
      sc.place(f, p.x, p.z, { yaw, y: gy }); bake.add(f);
      atlas.place(board(text, { bg, fg, size: 118 }), [p.x + Math.sin(yaw) * 0.03, gy + 8.5, p.z + Math.cos(yaw) * 0.03], yaw, 15, 5);
      atlas.place(board(text, { bg, fg, size: 118 }), [p.x - Math.sin(yaw) * 0.46, gy + 8.5, p.z - Math.cos(yaw) * 0.46], yaw + Math.PI, 15, 5);   // and on the back
    });

    // life in the sky
    const cols = [[0xff4d6d, 0xffd23c], [0x38b6ff, 0xffffff], [0x2ee6a6, 0xffd23c], [0x9b6bff, 0xff7eb6], [0xff8a3c, 0xffffff]];
    const balloons = cols.map((c, i) => { const b = P.balloon(c); const a = (i / cols.length) * Math.PI * 2 + 0.4, r = 230 + (i % 2) * 90; b.position.set(Math.cos(a) * r, 55 + i * 9, 90 + Math.sin(a) * r); b.scale.setScalar(1.4 + (i % 3) * 0.3); ctx.group.add(b); return b; });
    const ship = P.blimp('LOSING MONEY AT SCALE'); ship.scale.setScalar(1.25); ctx.group.add(ship);
    anim.push((dt, time) => {
      balloons.forEach((b, i) => { b.position.y += Math.sin(time * 0.4 + i * 1.7) * dt * 0.8; b.rotation.y += dt * 0.05; });
      const a = time * 0.035; ship.position.set(RING.x + Math.cos(a) * 150, 78 + Math.sin(time * 0.3) * 2, RING.z + Math.sin(a) * 120); ship.rotation.y = -a;
    });
    bake.flush();
    atlas.flush();
    void L;
  },
};

/* ---------- the gags ---------- */
function gags({ THREE, track, group, sc, rng, atlas, bake, taken, local, sign, board, legs, anim, view }) {
  const { FONT, SANS, fitText, strike } = S;
  const M4 = new THREE.Matrix4(), plasticDark = new THREE.MeshStandardMaterial({ color: 0x3a414c, roughness: 0.5, metalness: 0.3 });
  const canvasTex = (w, h, draw) => { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; if (document.fonts?.ready) document.fonts.ready.then(() => { draw(c.getContext('2d'), w, h); t.needsUpdate = true; }); return t; };
  const facing = (p, x, z) => Math.atan2(x - p.x, z - p.z);

  // ---- lap-by-lap (#121): signs with a canvas of their own, redrawn only when the lap changes ----
  const lapFns = [];
  let lapDrawn = 0;
  anim.push(() => { const lap = view.showLap || 1; if (lap !== lapDrawn) { lapDrawn = lap; for (const f of lapFns) f(lap, view); } });
  /** A sign texture of its own (not packed into the atlas), so it can be redrawn mid-race. draw(g, w, h). */
  const dynSign = (cw, ch, draw) => {
    const c = document.createElement('canvas'); c.width = cw; c.height = ch;
    const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
    const mat = new THREE.MeshStandardMaterial({ map: tex, emissiveMap: tex, emissive: 0xffffff, emissiveIntensity: 0.3, roughness: 0.6, side: THREE.DoubleSide });
    const s = { mat, redraw() { draw(c.getContext('2d'), cw, ch); tex.needsUpdate = true; } };
    s.redraw();
    if (document.fonts?.ready) document.fonts.ready.then(() => s.redraw());
    return s;
  };
  /** A flat panel (w by h) in a dynSign's material, centred at [x, y, z], facing yaw. */
  const dynPanel = (s, w, h, c, yaw) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), s.mat); m.position.set(c[0], c[1], c[2]); m.rotation.y = yaw; group.add(m); return m; };

  // ---- the centerpiece: WE'RE PIVOTING TO ~~PETS~~ ~~SCOOTERS~~ ~~JUICE~~ ~~AI~~ KARTS ----
  {
    const { w: W, h: H } = PIVOT;
    // seat on the lower of the tower's two leg plinths in the rendered terrain: the infield
    // slopes under the tower, and centre-seating left one plinth hovering (#242)
    const plinthY = sx => { const [cx, , cz] = local({ x: PIVOT.x, z: PIVOT.z, yaw: PIVOT.yaw }, sx * W * 0.3, -2, 0); return Math.min(...[[-2.5, -2.5], [2.5, -2.5], [-2.5, 2.5], [2.5, 2.5], [0, 0]].map(([dx, dz]) => track.terrainHeight(cx + dx, cz + dz))); };
    const p = { x: PIVOT.x, z: PIVOT.z, yaw: PIVOT.yaw, y: Math.min(plinthY(-1), plinthY(1)) - 0.3 };
    const t = S.pivotTower({ w: W, h: H, legs: PIVOT.legs }); sc.place(t, p.x, p.z, { yaw: p.yaw, y: p.y }); const by = p.y + t.userData.boardY; bake.add(t);
    taken.push([p.x, p.z, 34]);
    // the list is alive (#121): one more fad is crossed out each lap, and the last one standing is KARTS
    const FADS = ['PETS', 'SCOOTERS', 'JUICE', 'AI', 'KARTS'];
    let fadLap = 1, fadFinal = false;
    const pivotSign = dynSign(1024, 1024, (g, w, h) => {
      const cur = fadFinal ? 4 : Math.min(1 + fadLap, 3);   // lap 1: JUICE, lap 2: AI, final lap: KARTS
      g.fillStyle = '#fffdf6'; g.fillRect(0, 0, w, h);
      g.strokeStyle = '#1a1d29'; g.lineWidth = 26; g.strokeRect(13, 13, w - 26, h - 26);
      fitText(g, "WE'RE PIVOTING TO", w / 2, h * 0.085, w * 0.86, 100, FONT, '#1a1d29', { lines: 1 });
      FADS.forEach((s, k) => {
        const y = h * (0.178 + k * 0.096);
        if (k === cur) { g.fillStyle = '#12142b'; g.fillRect(w * 0.07, y - h * 0.05, w * 0.86, h * 0.1); }
        const sz = fitText(g, s, w / 2, y, w * 0.8, k === cur ? 106 : 94, FONT, k < cur ? '#4d5463' : k === cur ? '#ffd23c' : '#b6bcc7', { lines: 1 });
        if (k < cur) { const tw = g.measureText(s).width; strike(g, w / 2 - tw / 2 - 26, w / 2 + tw / 2 + 26, y - sz * 0.06, sz); }
      });
      g.fillStyle = '#12142b'; g.fillRect(w * 0.1, h * 0.63, w * 0.8, h * 0.25);
      fitText(g, fadFinal ? '(ABSOLUTELY FINAL PIVOT)' : '(NEXT PIVOT: TBD)', w / 2, h * 0.935, w * 0.82, 56, SANS, '#e0202a', { lines: 1 });
    });
    lapFns.push((lap, vw) => { fadLap = lap; fadFinal = !!vw.finalLap; pivotSign.redraw(); });
    const fx = Math.sin(p.yaw), fz = Math.cos(p.yaw);
    dynPanel(pivotSign, W, H, [p.x + fx * 0.05, by, p.z + fz * 0.05], p.yaw);
    dynPanel(pivotSign, W, H, [p.x - fx * 1.55, by, p.z - fz * 1.55], p.yaw + Math.PI);
    // the AI is neon, and it is never quite stable
    const ai = canvasTex(512, 172, (g, w, h) => {
      g.fillStyle = '#12142b'; g.fillRect(0, 0, w, h);
      g.shadowColor = '#ff3fb4'; g.shadowBlur = 18;
      fitText(g, 'AI', w * 0.5, h * 0.56, w * 0.6, 170, FONT, '#ff5cc4', { lines: 1, stroke: '#ffd1ee', lw: 6 });
      g.shadowBlur = 0; g.fillStyle = '#ffd23c';
      for (const [x, y, s] of [[0.2, 0.3, 22], [0.82, 0.25, 16], [0.78, 0.75, 20], [0.16, 0.74, 14]]) { g.beginPath(); for (let k = 0; k < 8; k++) { const a = k * Math.PI / 4, rr = k % 2 ? s * 0.35 : s; g.lineTo(x * w + Math.cos(a) * rr, y * h + Math.sin(a) * rr); } g.fill(); }
    });
    const aiMat = new THREE.MeshStandardMaterial({ map: ai, emissiveMap: ai, emissive: 0xffffff, emissiveIntensity: 0.6, roughness: 0.5 });
    for (const s of [1, -1]) {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(W * 0.78, H * 0.26), aiMat);
      const off = s > 0 ? 0.12 : -1.62;
      m.position.set(p.x + fx * off, by - H * 0.245, p.z + fz * off); m.rotation.y = p.yaw + (s > 0 ? 0 : Math.PI); group.add(m);
    }
    // on the final lap the pivot moves on: the neon AI sign sputters, sparks, and dies
    let aiGlow = 1, aiDied = false;
    anim.push((dt, time) => {
      aiGlow += ((view.finalLap ? 0 : 1) - aiGlow) * Math.min(1, dt * 1.6);
      const flick = Math.sin(time * 23) > 0.93 ? 0.25 : 1;
      aiMat.emissiveIntensity = (0.45 + 0.3 * (0.5 + 0.5 * Math.sin(time * 3.1))) * flick * (0.03 + 0.97 * aiGlow);
      if (view.finalLap && !aiDied) {
        aiDied = true;
        for (let k = 0; k < 16; k++) view.fx.spark(p.x + fx * 1.2 + rng.range(-9, 9), by - H * 0.245 + rng.range(-3, 3), p.z + fz * 1.2 + rng.range(-9, 9), rng.range(-3, 3), rng.range(-4, 1), rng.range(-3, 3), [1, 0.36, 0.77], 0.5 + rng() * 0.5, 1.4 + rng());
      }
    });
  }

  // ---- the bridge exit: robotaxis frozen in a ring around one traffic cone ----
  {
    const i = track.indexAtCp(2.95), c = sc.beside(2.95, 1, 27), l = [track.lx[i], track.lz[i]], R = 9;
    const cars = [];
    // the depot seats on the rendered terrain: the kart ground() runs ~6 m under the mesh on this
    // shoulder, and ground-seated cars were buried in the hillside (#242)
    for (let k = 0; k < 10; k++) { const a = (k / 10) * Math.PI * 2, x = c.x + Math.cos(a) * R, z = c.z + Math.sin(a) * R; cars.push({ x, z, y: track.terrainHeight(x, z), yaw: Math.atan2(c.x - x, c.z - z) + rng.range(-0.12, 0.12) }); }
    sc.instances(partsOf(S.robotaxi()), cars, { scale: 1.35 });
    const cone = P.cone3d(); sc.place(cone, c.x, c.z, { scale: 2.2, y: track.terrainHeight(c.x, c.z) - 0.1 }); bake.add(cone);
    const sp = { x: c.x + l[0] * 15, z: c.z + l[1] * 15 }; sp.y = track.terrainHeight(sp.x, sp.z); sp.yaw = facing(sp, 40, -2);
    legs(sp, 16, 9.5);
    atlas.place(board('ALL RIDES DELAYED: 1 CONE', { bg: '#ffffff', fg: '#1a1d29', kicker: 'ROBOTAXI DEPOT', kfg: '#e23b3b', border: '#1a1d29', size: 120 }, 768, 300), local(sp, 0, 0, sp.y + 12.5), sp.yaw, 17, 6.6);
    taken.push([c.x, c.z, 24], [sp.x, sp.z, 12]);
  }

  // ---- the climb: shipping containers sold as luxury micro-lofts ----
  {
    const p = sc.beside(6.1, 1, 25); p.yaw += 0.08;
    // seat on the lower front corner in the rendered terrain: the stack backs into the bowl rim,
    // and centre-seating left the front hovering (#242)
    p.y = Math.min(...[[18.4, 1.225], [-18.4, 1.225]].map(([u, v]) => { const [x, , z] = local(p, u, v, 0); return track.terrainHeight(x, z); })) - 0.05;
    const st = S.containerStack(); sc.place(st, p.x, p.z, { yaw: p.yaw, y: p.y - 0.2 }); bake.add(st);
    legs({ ...p, ...xz(local(p, 0, -1.2, 0)) }, 26, 13);
    atlas.place(board('LUXURY MICRO-LOFTS $4,200/MO', { bg: '#1a1d29', fg: '#ffd23c', kicker: 'NOW LEASING', kfg: '#ffffff', size: 120 }, 1024, 300), local(p, 0, -1.0, p.y + 10.6), p.yaw, 26, 7.6);
    [['PET FRIENDLY (NO PETS)', -12.4], ['ROOMMATES INCLUDED (9)', 0], ['40 SQ FT OF VIBES', 12.4]].forEach(([t, u]) => atlas.place(board(t, { bg: '#ffffff', fg: '#1a1d29', size: 100, border: '#1a1d29' }, 640, 160), local(p, u, 1.5, p.y + 1.25), p.yaw, 6.2, 1.55));
    taken.push([p.x, p.z, 26]);
  }

  // ---- the esses: the unicorn balloon over its HQ, slowly deflating ----
  {
    // moved a little down the hill and planted on its lowest corner (#242): at cp 7.9 the bowl
    // rim ran 9 m up the block's front face; at cp 7.5 the same footprint varies by ~1.6 m
    const p = sc.beside(7.5, 1, 36), hq = P.campusBlock(7, { w: 30, d: 16, floors: 3, accent: 0xff7eb6 });
    p.y = Math.min(...[[-15.65, 8.65], [15.65, 8.65], [-15.65, -8.65], [15.65, -8.65]].map(([u, v]) => { const [x, , z] = local(p, u, v, 0); return track.terrainHeight(x, z); })) - 0.25 + 0.4;
    sc.place(hq, p.x, p.z, { yaw: p.yaw, y: p.y - 0.4 }); bake.add(hq);
    const roof = p.y - 0.4 + 3 * 3.4 + 0.6;
    legs({ ...p, y: roof }, 20, 6, 0xff7eb6, () => roof);
    // the valuation doubles every lap (#121) — until the final-lap correction takes it to zero
    let valLap = 1, valFinal = false;
    const valSign = dynSign(768, 300, (g, w, h) => {
      if (valFinal) S.signDraw('VALUATION: $0', { bg: '#e23b3b', fg: '#ffffff', kicker: 'DOWN ROUND', kfg: '#ffd23c', size: 118 })(g, w, h);
      else S.signDraw(`VALUATION: $${2 ** (valLap - 1)}B`, { bg: '#ff7eb6', fg: '#ffffff', kicker: 'UNICORNLY INC.', kfg: '#1a1d29', size: 118 })(g, w, h);
    });
    lapFns.push((lap, vw) => { valLap = lap; valFinal = !!vw.finalLap; valSign.redraw(); });
    dynPanel(valSign, 20, 7.8, local(p, 0, 0, roof + 4.5), p.yaw);
    const u = S.unicorn({ L: 32 }), uy = track.py[p.i] + 24, uyaw = facing(p, 196, 105) + Math.PI / 2;
    const ux = p.x, uz = p.z; u.position.set(ux, uy, uz); u.rotation.y = uyaw; group.add(u);
    // the tether, with a banner on it
    const teth = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 1, 6).translate(0, 0.5, 0), plasticDark); teth.position.set(ux, roof, uz); group.add(teth);
    const bp = { x: ux, z: uz, yaw: facing({ x: ux, z: uz }, 196, 105) };
    const ban = atlas.mesh(board('DOWN ROUND IN PROGRESS', { bg: '#ffffff', fg: '#e23b3b', border: '#e23b3b', size: 120 }, 768, 220), 15, 4.3);
    const banGrp = new THREE.Group(); ban.position.x = 7.8; banGrp.add(ban); banGrp.position.set(ux, roof + 9, uz); banGrp.rotation.y = bp.yaw; group.add(banGrp);
    taken.push([p.x, p.z, 26]);
    const head = u.userData.head;
    banGrp.visible = false;   // the DOWN ROUND banner only unfurls when it happens (#121)
    let slump = 0;
    anim.push((dt, time) => {
      // inflated and proud for two laps; on the final lap the down round lets the air out
      slump += ((view.finalLap ? 1 : 0) - slump) * Math.min(1, dt * 0.55);
      const k = slump * slump * (3 - 2 * slump);
      u.scale.set(1 - 0.18 * k, 1 - 0.42 * k, 1 - 0.1 * k); u.position.y = uy - 7 * k + Math.sin(time * 0.7) * 0.6 * (1 - k); u.rotation.z = 0.3 * k + 0.03 * Math.sin(time * 0.5) * (1 - k);
      head.rotation.x = 0.85 * k;
      teth.scale.y = Math.max(1, u.position.y - 4.5 * u.scale.y - roof);
      banGrp.visible = k > 0.25;
    });
  }

  // ---- after the crest: the rental scooter graveyard ----
  {
    // the heap moved down the hill (#242): at cp 10.8 it was seated by the kart ground() on a
    // conform spike ~8 m above the rendered slope, so the whole cone hovered over the grass.
    // Here the rendered rim varies by ~1.5 m, and the cone is planted below its lowest rim point.
    const p = sc.beside(11.5, 1, 30), H = 11, R = 13, ic = track.indexAtCp(10.25);
    let rimMin = Infinity; for (let a = 0; a < 360; a += 15) rimMin = Math.min(rimMin, track.terrainHeight(p.x + Math.cos(a * Math.PI / 180) * R, p.z + Math.sin(a * Math.PI / 180) * R));
    const base = rimMin - 1.0, surf = (x, z) => { const d = Math.hypot(x - p.x, z - p.z); return d >= R ? -Infinity : base + H * (1 - d / R); };
    const mound = new THREE.Mesh(new THREE.ConeGeometry(R, H, 18, 1, true), new THREE.MeshStandardMaterial({ color: 0x7c6a52, roughness: 0.95 }));
    mound.position.set(p.x, base + H / 2, p.z); group.add(mound); bake.add(mound);
    const cols = [0x22c55e, 0xff4d6d, 0x111827, 0xffd23c, 0x38b6ff], parts = cols.map(c => partsOf(S.scooter(c))), mats = cols.map(() => []);
    const E = new THREE.Euler(), Q = new THREE.Quaternion(), Sx = new THREE.Vector3(2.4, 2.4, 2.4);
    for (let k = 0; k < 110; k++) {
      const hh = Math.pow(rng(), 0.8) * (H - 0.5), rr = (R * (1 - hh / H)) * (0.8 + rng() * 0.2), a = rng() * Math.PI * 2;
      const sx = p.x + Math.cos(a) * rr, sz = p.z + Math.sin(a) * rr;
      E.set(rng() * 6.28, rng() * 6.28, rng() * 6.28); Q.setFromEuler(E);
      // each scooter rests on the cone's surface at its own radius — or on the dirt where the
      // real slope pokes through the cone's rim — never in the air beside the heap
      mats[k % cols.length].push(new THREE.Matrix4().compose(new THREE.Vector3(sx, Math.max(surf(sx, sz), track.terrainHeight(sx, sz)) + 0.15, sz), Q, Sx));
    }
    parts.forEach((pt, k) => bake.copies(pt, mats[k], false));
    const sp = { ...p, y: base, yaw: facing(p, track.px[ic], track.pz[ic]) };   // the sign stands on top of the heap, facing the karts coming over the crest
    legs(sp, 18, H + 7, 0x3a414c, (x, z) => Math.max(track.terrainHeight(x, z), surf(x, z)));
    atlas.place(board('UNLOCK $1. ABANDON FREE.', { bg: '#22c55e', fg: '#ffffff', kicker: 'SCOOTER SHARE', kfg: '#1a1d29', size: 120 }, 768, 300), local(sp, 0, 0, sp.y + H + 7.5), sp.yaw, 18, 7);
    taken.push([p.x, p.z, R + 6]);
  }

  // ---- the downhill: the fifteen-minute standup, now in its ninth hour ----
  {
    const p = sc.beside(12.85, 1, 26), people = [], sleepers = [];
    for (let k = 0; k < 9; k++) {
      const a = (k / 9) * Math.PI * 2, x = p.x + Math.cos(a) * 4.5, z = p.z + Math.sin(a) * 4.5;
      (k === 2 || k === 6 ? sleepers : people).push({ x, z, y: track.terrainHeight(x, z), yaw: Math.atan2(p.x - x, p.z - z) });
    }
    sc.instances(partsOf(P.spectator()), people, { scale: 2.1, tints: P.CROWD_TINTS, cast: false });
    sc.instances(partsOf(P.spectator()), sleepers.map(s => ({ ...s, y: s.y + 0.55 })), { scale: 2.1, tints: P.CROWD_TINTS, cast: false, tilt: 0 }).forEach(m => { for (let k = 0; k < m.count; k++) { m.getMatrixAt(k, M4); M4.multiply(new THREE.Matrix4().makeRotationX(Math.PI / 2)); m.setMatrixAt(k, M4); } m.instanceMatrix.needsUpdate = true; });
    // the whiteboard
    const wb = { ...p, ...xz(local(p, 0, -1.5, 0)) }; wb.y = track.terrainHeight(wb.x, wb.z);
    legs(wb, 7, 4.5, 0x9aa3ad);
    atlas.place(board('BLOCKERS: THIS MEETING', { bg: '#ffffff', fg: '#1f6bff', border: '#9aa3ad', size: 110, font: SANS }, 640, 300), local(wb, 0, 0, wb.y + 3.2), wb.yaw, 6.4, 3);
    // the clock on a mast, hands spinning, and the banner under it
    const cp = { ...p, ...xz(local(p, 0, -9, 0)) }; cp.y = track.terrainHeight(cp.x, cp.z);
    legs(cp, 16, 18);
    const cy = cp.y + 17, CR = 4.2;
    const face = sign('clock', 512, 512, (g, w, h) => {
      g.fillStyle = '#fffdf6'; g.beginPath(); g.arc(w / 2, h / 2, w / 2 - 4, 0, 7); g.fill();
      g.fillStyle = '#1a1d29'; g.font = `bold 84px ${SANS}`; g.textAlign = 'center'; g.textBaseline = 'middle';
      [['12', 0], ['3', 3], ['6', 6], ['9', 9]].forEach(([s, k]) => { const a = k / 12 * Math.PI * 2; g.fillText(s, w / 2 + Math.sin(a) * w * 0.36, h / 2 - Math.cos(a) * h * 0.36); });
      for (let k = 0; k < 12; k++) if (k % 3) { const a = k / 12 * Math.PI * 2; g.beginPath(); g.arc(w / 2 + Math.sin(a) * w * 0.38, h / 2 - Math.cos(a) * h * 0.38, 10, 0, 7); g.fill(); }
    });
    atlas.place(face, local(cp, 0, 0.1, cy), cp.yaw, CR * 2, CR * 2);
    const rim = S.clockRim(CR); sc.place(rim, ...xzArgs(local(cp, 0, 0.15, 0)), { y: cy, yaw: cp.yaw }); bake.add(rim);
    const handMat = new THREE.MeshStandardMaterial({ color: 0xe23b3b, roughness: 0.4 });
    const hands = [[0.22, CR * 0.85, 9], [0.32, CR * 0.55, 0.75]].map(([wd, len, sp]) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(wd, len, 0.12).translate(0, len / 2 - 0.3, 0), handMat), g = new THREE.Group();
      g.position.set(...local(cp, 0, 0.35, cy)); g.rotation.y = cp.yaw; g.add(m); group.add(g); return [m, sp];
    });
    anim.push((dt) => { for (const [m, sp] of hands) m.rotation.z -= dt * sp; });
    atlas.place(board('15-MIN STANDUP: HOUR 9', { bg: '#1f6bff', fg: '#ffffff', size: 120 }, 1024, 220), local(cp, 0, 0.1, cy - CR - 2.6), cp.yaw, 17, 3.65);
    taken.push([p.x, p.z, 16], [cp.x, cp.z, 12]);
  }

  // ---- the final corner: the HQ whose sign can't make up its mind ----
  {
    const p = sc.beside(18.35, -1, 26), hq = P.campusBlock(2, { w: 36, d: 18, floors: 4, accent: 0x1f6bff });
    sc.place(hq, p.x, p.z, { yaw: p.yaw, y: p.y - 0.4 }); bake.add(hq);
    const roof = p.y - 0.4 + 4 * 3.4 + 0.6, mast = S.post(4, 0.5); sc.place(mast, p.x, p.z, { y: roof }); bake.add(mast);
    const ia = track.indexAtCp(17.3), fyaw = facing(p, track.px[ia], track.pz[ia]);   // it faces the karts coming up out of the hairpin
    const flip = new THREE.Group(); flip.position.set(p.x, roof + 8.5, p.z); flip.rotation.y = fyaw; group.add(flip);
    const fr = atlas.mesh(board("WE'RE HIRING!", { bg: '#16a34a', fg: '#ffffff', size: 150, lines: 1 }, 768, 230), 26, 7.8);
    const bk = atlas.mesh(board("LAYOFFS (WE'RE A FAMILY)", { bg: '#e23b3b', fg: '#ffffff', size: 130 }, 768, 230), 26, 7.8);
    fr.position.z = 0.06; bk.position.z = -0.06; bk.rotation.y = Math.PI; flip.add(fr, bk);
    const backing = new THREE.Mesh(new THREE.BoxGeometry(26.6, 8.4, 0.1), plasticDark); flip.add(backing);
    anim.push((dt, time) => { const t = time % 8, a = t < 3.4 ? 0 : t < 4 ? (t - 3.4) / 0.6 : t < 7.4 ? 1 : 1 - (t - 7.4) / 0.6; flip.rotation.y = fyaw + Math.PI * (a * a * (3 - 2 * a)); });
    taken.push([p.x, p.z, 28]);
  }

  // ---- the infield: NOW HIRING until the correction — then the sign flips and the layoff cones come out ----
  {
    const sp = { x: 92, z: 46 }; sp.y = track.terrainHeight(sp.x, sp.z); sp.yaw = facing(sp, 30, -6);
    legs(sp, 16, 9.5);
    let layFinal = false;
    const laySign = dynSign(768, 300, (g, w, h) => {
      if (layFinal) S.signDraw('LAYOFFS AT 3PM', { bg: '#e23b3b', fg: '#ffffff', kicker: 'ALL HANDS', kfg: '#ffd23c', size: 118 })(g, w, h);
      else S.signDraw('NOW HIRING!', { bg: '#16a34a', fg: '#ffffff', kicker: 'ALL HANDS', kfg: '#1a1d29', size: 130, lines: 1 })(g, w, h);
    });
    lapFns.push((lap, vw) => { layFinal = !!vw.finalLap; laySign.redraw(); });
    dynPanel(laySign, 17, 6.6, local(sp, 0, 0, sp.y + 12.5), sp.yaw);
    // the cones come out with the pink slips: a cordon in front of the sign, hidden until the final lap
    const coneSpots = [];
    for (let k = 0; k < 9; k++) { const [x, , z] = local(sp, -9 + k * 2.25, 3.4, 0); coneSpots.push({ x, z, y: track.terrainHeight(x, z), yaw: rng.range(-0.4, 0.4) }); }
    const cones = sc.instances(partsOf(P.cone3d()), coneSpots, { scale: 1.5, cast: false });
    cones.forEach(m => { m.visible = false; });
    lapFns.push((lap, vw) => cones.forEach(m => { m.visible = !!vw.finalLap; }));
    taken.push([sp.x, sp.z, 13]);
  }

  // ---- the Golden Gate (#168): the lap itself crosses the bay on the deck ----
  {
    // The road IS the bridge here (bridges 1.45-3.12 in the track data: engine deck, pillars and
    // guardrails). This block adds what makes it the Golden Gate: two orange tower portals the
    // karts drive through, main cables with suspenders overhead, orange edge girders, concrete
    // anchor blocks on the shores, and the toll gantry at the deck entry. Everything is placed
    // from the track's own samples, so it follows the deck (and its banking) exactly.
    const ORANGE = new THREE.MeshStandardMaterial({ color: 0xc0362c, roughness: 0.42, metalness: 0.3 });
    const CONC = new THREE.MeshStandardMaterial({ color: 0x8b93a6, roughness: 0.8 });
    const gg = new THREE.Group(); group.add(gg);
    const put = (geo, mat, x, y, z, yaw = 0) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.rotation.y = yaw; gg.add(m); return m; };
    const PV = new THREE.Vector3();
    /** Road-frame point at a control-point param: {x,y,z} on the deck plane at lat, plus the road yaw. */
    const at = (cp, lat = 0) => { const s = track.sAtCp(cp); track.pointAt(s, lat, PV); return { x: PV.x, y: PV.y, z: PV.z, yaw: track.yawAt(s) }; };
    const LEG = 11.3, SUS = 10.6;   // tower legs / cable plane, and the suspender + girder line, just outside the guardrail

    // the two tower portals: legs from below the waterline to 30 m over the deck, four portal beams
    const towerAt = [2.08, 2.72];
    for (const tc of towerAt) {
      const c = at(tc), top = c.y + 30, bot = -4;
      for (const s of [-1, 1]) {
        const lp = at(tc, s * LEG);
        put(new THREE.BoxGeometry(1.7, top - bot, 1.7), ORANGE, lp.x, (top + bot) / 2, lp.z, c.yaw);
        put(new THREE.BoxGeometry(5, 3.4, 5), CONC, lp.x, -2.6, lp.z, c.yaw);            // the pier footing, awash
        put(new THREE.BoxGeometry(3.1, 1.1, 3.1), ORANGE, lp.x, top + 0.4, lp.z, c.yaw); // cap
      }
      for (const dy of [6.5, 14, 21.5, 28]) put(new THREE.BoxGeometry(LEG * 2 + 1.7, 1.15, 1.0), ORANGE, c.x, c.y + dy, c.z, c.yaw);
      taken.push([c.x, c.z, 13]);
    }
    // anchor blocks where the cables come down to the shores
    for (const ac of [1.47, 3.09]) for (const s of [-1, 1]) {
      const ap = at(ac, s * LEG), top = ap.y + 0.4;
      put(new THREE.BoxGeometry(6.5, top + 3.5, 5.5), CONC, ap.x, (top - 3.5) / 2, ap.z, ap.yaw);
      taken.push([ap.x, ap.z, 8]);
    }
    // the main cables: shore anchor, up over tower A, the long sag across the main span, tower B, down
    const cableY = (cp) => {
      const d = at(cp).y;
      if (cp < towerAt[0]) { const t = (cp - 1.5) / (towerAt[0] - 1.5); return d + 1.2 + (29.2 - 1.2) * t * t - Math.sin(t * Math.PI) * 1.1; }
      if (cp > towerAt[1]) { const t = (cp - towerAt[1]) / (3.05 - towerAt[1]); return d + 29.2 + (1.2 - 29.2) * t * t - Math.sin(t * Math.PI) * 1.1; }
      const t = (cp - towerAt[0]) / (towerAt[1] - towerAt[0]);
      return d + 2.4 + (29.2 - 2.4) * (2 * t - 1) ** 2;
    };
    for (const s of [-1, 1]) {
      const pts = [];
      for (let cp = 1.5; cp <= 3.051; cp += 0.045) { const p = at(cp, s * LEG); pts.push(new THREE.Vector3(p.x, cableY(cp), p.z)); }
      const tube = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 72, 0.34, 6), ORANGE);
      gg.add(tube);
      // suspenders: from the cable down to the girder line, every ~6 m of deck
      for (let cp = 1.56; cp <= 3.02; cp += 0.07) {
        const topP = at(cp, s * LEG), botP = at(cp, s * SUS), cy = cableY(cp), by = botP.y + 0.1;
        if (cy - by < 1.6) continue;
        put(new THREE.BoxGeometry(0.16, cy - by, 0.16), ORANGE, botP.x + (topP.x - botP.x) / 2, (cy + by) / 2, botP.z + (topP.z - botP.z) / 2, botP.yaw);
      }
    }
    // orange edge girders riding just under the deck edge, the whole span
    for (const s of [-1, 1]) {
      let prev = at(1.46, s * SUS);
      for (let cp = 1.5; cp <= 3.121; cp += 0.04) {
        const p = at(cp, s * SUS), mx = (prev.x + p.x) / 2, mz = (prev.z + p.z) / 2;
        const len = Math.hypot(p.x - prev.x, p.z - prev.z) + 0.5;
        put(new THREE.BoxGeometry(0.35, 1.3, len), ORANGE, mx, (prev.y + p.y) / 2 - 0.82, mz, Math.atan2(p.x - prev.x, p.z - prev.z));
        prev = p;
      }
    }
    bake.add(gg);
    // the toll gantry at the deck entry: two orange posts and the fascia sign, with a back-to-back
    // twin like every other board on the track so the text never mirrors from behind
    {
      const gi = track.indexAtCp(1.52), gp0 = at(1.52);
      for (const s of [-1, 1]) {
        const pp = at(1.52, s * 10.3), post = S.post(8.6, 0.35, 0xc0362c);
        sc.place(post, pp.x, pp.z, { y: pp.y - 0.2, yaw: gp0.yaw }); bake.add(post);
      }
      const toll = board('BRIDGE TOLL: YOUR EQUITY', { bg: '#c0362c', fg: '#ffffff', kicker: 'THE GOLDEN GATE', kfg: '#ffd23c', size: 118 }, 1024, 256);
      const gyaw = Math.atan2(-track.tx[gi], -track.tz[gi]);
      // upstream panel (the one drivers meet first) carries the driver-readable face; the
      // downstream twin faces the other way. (Swapped after the first capture round showed the
      // upstream face mirrored — the readable side had been on the occluded downstream panel.)
      atlas.place(toll, [gp0.x, gp0.y + 6.6, gp0.z], gyaw + Math.PI, 22, 4.4);
      atlas.place(toll, [gp0.x - track.tx[gi] * 0.55, gp0.y + 6.6, gp0.z - track.tz[gi] * 0.55], gyaw, 22, 4.4);
    }
  }

  // ---- the landmarks: a Hoover Tower on the climb meadow, watching the esses ----
  {
    const tp = sc.beside(6.25, 1, 36);
    // planted on the lowest corner of its slab in the rendered terrain: the meadow tilts
    // under the tower and one corner hovered (#242)
    const hy = Math.min(...[[-6.5, 6.5], [6.5, 6.5], [-6.5, -6.5], [6.5, -6.5]].map(([u, v]) => { const [x, , z] = local(tp, u, v, 0); return track.terrainHeight(x, z); })) - 0.2;
    const tw = S.hooverTower({}); sc.place(tw, tp.x, tp.z, { yaw: tp.yaw, y: hy }); bake.add(tw);
    const sp = sc.beside(6.25, 1, 22);
    legs(sp, 15, 8);
    atlas.place(board('HOOVER TOWER', { bg: '#d9c096', fg: '#7a2d1e', kicker: 'THE FARM · PARKING $47', kfg: '#1a1d29', size: 118 }, 768, 300), local(sp, 0, 0, sp.y + 10.5), sp.yaw, 16, 6);
    taken.push([tp.x, tp.z, 15], [sp.x, sp.z, 10]);
  }

  // ---- the landmarks: the garage where it all started, outside the chicane ----
  {
    const p = sc.beside(13.75, 1, 24);
    // seated on the lowest point of walls and driveway in the rendered terrain (#242)
    const gy = Math.min(...[[-4.75, 3.5], [4.75, 3.5], [-4.75, -3.5], [4.75, -3.5], [0, 11.85]].map(([u, v]) => { const [x, , z] = local(p, u, v, 0); return track.terrainHeight(x, z); })) - 0.05;
    const gr = S.garage(); sc.place(gr, p.x, p.z, { yaw: p.yaw, y: gy }); bake.add(gr);
    atlas.place(board('IT STARTED IN A GARAGE', { bg: '#ffffff', fg: '#1a1d29', kicker: 'NOW VALUED AT $3B', kfg: '#e23b3b', size: 110 }, 1024, 200), local(p, 0, 3.62, gy + 3.6), p.yaw, 9.6, 1.9);
    taken.push([p.x, p.z, 12]);
  }

  // ---- extras: the rocket's schedule, and the Ring's rooftop ----
  {
    const p = { x: ROCKET.x - 26, z: ROCKET.z - 14 }; p.y = track.terrainHeight(p.x, p.z); p.yaw = facing(p, 196, 100);
    legs(p, 18, 9);
    const r = sign('mars', 768, 300, (g, w, h) => {
      g.fillStyle = '#1a1d29'; g.fillRect(0, 0, w, h);
      fitText(g, 'NEXT STOP: MARS', w / 2, h * 0.3, w * 0.9, 120, FONT, '#ff6a3c', { lines: 1 });
      ['2018', '2020', '2022', '2024'].forEach((y, k) => { const x = w * (0.14 + k * 0.2); const s = fitText(g, y, x, h * 0.72, w * 0.17, 80, SANS, '#ffffff', { lines: 1 }); strike(g, x - w * 0.08, x + w * 0.08, h * 0.72, s); });
      fitText(g, '2026?', w * 0.91, h * 0.72, w * 0.16, 70, SANS, '#ffd23c', { lines: 1 });
    });
    atlas.place(r, local(p, 0, 0, p.y + 9.5), p.yaw, 18, 7);
    const q = { x: RING.x, z: RING.z - RING.r + RING.band / 2, yaw: Math.PI, y: 2.1 + 13 };
    legs(q, 30, 3.4, 0xdfe3ea, () => q.y);   // the posts stand on the Ring's roof, not the ground
    atlas.place(board('DONGLE SOLD SEPARATELY', { bg: '#ffffff', fg: '#1a1d29', size: 130, font: SANS, lines: 1 }, 1024, 200), local(q, 0, 0, q.y + 5.6), q.yaw, 30, 5.9);
  }
}
const xz = a => ({ x: a[0], z: a[2] });
const xzArgs = a => [a[0], a[2]];

/* ---------- The Farm: Palm Drive, the chapel, the Oval, the Quad, the Founder's Fountain ---------- */
function campus({ THREE, track, group, sc, rng, atlas, bake, taken, local, board, legs, anim, view }) {
  const PV = new THREE.Vector3();
  /** Road-frame point at a control-point param: {x, y, z} at lat, the travel yaw, and the yaw facing oncoming karts. */
  const at = (cp, lat = 0) => { const s = track.sAtCp(cp); track.pointAt(s, lat, PV); const yaw = track.yawAt(s); return { x: PV.x, y: PV.y, z: PV.z, yaw, back: yaw + Math.PI, i: track.indexAtCp(cp) }; };
  const fwd = (p, d) => [p.x + Math.sin(p.yaw) * d, p.z + Math.cos(p.yaw) * d];
  const RED = '#9d1c20', CREAM = '#fff6e2';

  // ---- Palm Drive: gate pillars, lamp banners, bunting over the road (the palms are planted with the others) ----
  {
    const g = at(12.62);
    for (const s of [-1, 1]) {
      const hw = s > 0 ? track.hwL[g.i] : track.hwR[g.i], p = at(12.62, s * (hw + 3.6));
      const pil = S.gatePillar(); sc.place(pil, p.x, p.z, { yaw: g.back, y: track.terrainHeight(p.x, p.z) - 0.2 }); bake.add(pil, false);   // no shadow caster (#215 item 7)
      const pn = pil.userData.panel;
      atlas.place(board('PALM DRIVE', { bg: RED, fg: CREAM, kicker: 'THE FARM', kfg: '#ffc928', size: 120, lines: 2 }, 256, 448), [p.x + Math.sin(g.back) * pn.z, track.terrainHeight(p.x, p.z) - 0.2 + pn.y, p.z + Math.cos(g.back) * pn.z], g.back, pn.w, pn.h);
      track.addCollider(p.x, p.z, 1.8);
      taken.push([p.x, p.z, 6]);
    }
    const BANNERS = ['DROP OUT', 'FOUND', 'RAISE', 'PIVOT', 'EXIT', 'DONATE A WING'];
    const lamp = S.lampBanner(), bn = lamp.userData.banner;
    let k = 0;
    const tops = [[], []];
    for (const [side, list] of [[1, tops[0]], [-1, tops[1]]]) {
      for (const p of sc.along({ from: 12.75, to: 14.3, side, offset: 4.4, spacing: 18, phase: side > 0 ? 0 : 9 })) {
        const L = lamp.clone(); sc.place(L, p.x, p.z, { yaw: p.yaw - Math.PI / 2 }); bake.add(L, false);
        const f = [Math.sin(p.yaw), Math.cos(p.yaw)], c = [p.x + f[0] * bn.x, p.y + bn.y, p.z + f[1] * bn.x];
        const text = BANNERS[k++ % BANNERS.length], b = board(text, { bg: RED, fg: CREAM, size: 120, lines: 2, border: '#ffc928' }, 256, 576);
        atlas.place(b, c, p.along + Math.PI, bn.w, bn.h); atlas.place(b, [c[0] + Math.sin(p.along) * 0.04, c[1], c[2] + Math.cos(p.along) * 0.04], p.along, bn.w, bn.h);
        list.push([p.x, p.y + 7.3, p.z]);
      }
    }
    // bunting from each lamp to the one across the avenue, and on to the next one down
    const lines = [];
    for (let j = 0; j < Math.min(tops[0].length, tops[1].length); j++) { lines.push([tops[0][j], tops[1][j]]); if (tops[0][j + 1]) lines.push([tops[1][j], tops[0][j + 1]]); }
    for (const [a, b] of lines) bake.add(S.bunting(a, b, 16), false);
  }

  // ---- the Founders' Chapel, dead ahead all the way down Palm Drive ----
  {
    const cx = -208, cz = -108, K = 1.45, ch = S.chapel(), cy = track.terrainHeight(cx, cz) - 0.3;   // hero scale: ~49 m wide, 40 m to the finial
    sc.place(ch, cx, cz, { yaw: 0, y: cy, scale: K }); bake.add(ch);
    const mo = ch.userData.mosaic, tex = new THREE.TextureLoader().load('assets/tracks/silicon-valley/chapel-mosaic.webp');
    tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
    const mosaic = new THREE.Mesh(new THREE.PlaneGeometry(mo.w * K, mo.h * K), new THREE.MeshStandardMaterial({ map: tex, emissiveMap: tex, emissive: 0xffffff, emissiveIntensity: 0.32, roughness: 0.35, metalness: 0.25 }));
    mosaic.position.set(cx, cy + mo.y * K, cz + 0.12 * K); group.add(mosaic);
    atlas.place(board("FOUNDERS' CHAPEL", { bg: '#e2cfa3', fg: '#7a2d1e', size: 120, lines: 1, shadow: false }, 1024, 160), [cx, cy + 22.0 * K, cz + 0.3], 0, 9.5 * K, 1.5 * K);
    taken.push([cx, cz - 20, 46]);
  }

  // ---- the Oval: a topiary "$" on the lawn inside the hairpin ----
  {
    const ox = -173, oz = -30, t = S.topiaryDollar(), oy = track.terrainHeight(ox, oz);
    sc.place(t, ox, oz, { yaw: Math.atan2(-208 - ox, 25 - oz), y: oy, scale: 1.25 }); bake.add(t);
    track.addCollider(ox, oz, 3.4);
    const beds = [];
    for (let k = 0; k < 26; k++) { const a = (k / 26) * Math.PI * 2, r = 9.5 + (k % 2) * 1.6, x = ox + Math.cos(a) * r, z = oz + Math.sin(a) * r * 0.8; beds.push({ x, z, y: track.terrainHeight(x, z), yaw: rng() * 6.28 }); }
    sc.instances(partsOf(P.bush(6, { color: 0x4fae3f, flower: 0xe8273a })), beds, { scale: [1.1, 1.5], cast: false, sink: 0.1 });
    const sp = at(14.55, -(track.hwR[track.indexAtCp(14.55)] + 6));
    const ss = { x: sp.x, z: sp.z, y: track.terrainHeight(sp.x, sp.z), yaw: sp.back };
    legs(ss, 12, 6.6, 0x7a2d1e);
    atlas.place(board('THE OVAL', { bg: '#1f7a3a', fg: '#ffffff', kicker: 'NO PITCHING ON THE LAWN', kfg: '#ffd23c', size: 120 }, 768, 300), local(ss, 0, 0, ss.y + 7.3), ss.yaw, 13, 5.1);
    taken.push([ox, oz, 24], [ss.x, ss.z, 8]);
  }

  // ---- the Quad: an arcade either side, and a great arch over each end ----
  {
    const bay = partsOf(S.arcadeBay()), mats = [];
    const s0 = track.sAtCp(18.72), s1 = track.sAtCp(20.12), P2 = new THREE.Vector3(), M = new THREE.Matrix4(), Q = new THREE.Quaternion(), Y = new THREE.Vector3(0, 1, 0), ONE = new THREE.Vector3(1, 1, 1);
    const students = [];
    for (let s = s0; s < s1; s += 4.05) {
      const i = Math.floor(s / track.ds) % track.N, yaw = track.yawAt(s);
      for (const side of [1, -1]) {
        const hw = side > 0 ? track.hwL[i] : track.hwR[i];
        track.pointAt(s, side * (hw + 0.75), P2);
        const fyaw = Math.atan2(-side * track.lx[i], -side * track.lz[i]);
        Q.setFromAxisAngle(Y, fyaw); M.compose(new THREE.Vector3(P2.x, track.py[i] - 0.05, P2.z), Q, ONE); mats.push(M.clone());
        if (rng() < 0.45) { const d = 1.6 + rng() * 1.6; students.push({ x: P2.x - Math.sin(fyaw) * d, z: P2.z - Math.cos(fyaw) * d, y: track.py[i] + 0.2, yaw: fyaw + rng.range(-0.6, 0.6) }); }
      }
      void yaw;
    }
    bake.copies(bay, mats);
    sc.instances(partsOf(P.spectator()), students, { scale: [1.9, 2.2], tints: [0x9d1c20, 0xffffff, 0x1f2a44, 0xffc928, 0x9d1c20], cast: false });
    const arches = [[18.95, 'THE QUAD', 'NOW ACCEPTING DROPOUTS'], [19.86, 'YOU ARE NOW LEAVING ACADEMIA', 'GOOD LUCK OUT THERE']];
    for (const [cp, text, kicker] of arches) {
      const c = at(cp), span = track.hwL[c.i] + track.hwR[c.i] + 0.6, arch = S.quadArch(span);
      // planted on the lower foot in the rendered terrain: the cambered road left one foot
      // of each arch hovering (#242)
      const gy = Math.min(...[-(span / 2 + 0.6), span / 2 + 0.6, -(span / 2 + 3.4), span / 2 + 3.4].map(u => { const [x, , z] = local(c, u, 0, 0); return track.terrainHeight(x, z); })) - 0.05;
      sc.place(arch, c.x, c.z, { yaw: c.yaw, y: gy }); bake.add(arch);
      const d = arch.userData.depth / 2 + 0.06, w = arch.userData.width - 3.2, b = board(text, { bg: '#e2cfa3', fg: '#7a2d1e', kicker, kfg: '#9d1c20', size: 120, shadow: false }, 1024, 160);
      for (const sgn of [-1, 1]) atlas.place(b, [c.x + Math.sin(c.yaw) * d * sgn, gy + 0.1 + arch.userData.signY, c.z + Math.cos(c.yaw) * d * sgn], sgn < 0 ? c.back : c.yaw, w, w * 160 / 1024);
      for (const s of [-1, 1]) { const q = at(cp, s * (span / 2 + 4)); track.addCollider(q.x, q.z, 2.2); }
    }
    taken.push([-96, 0, 30], [-126, -8, 26]);
  }

  // ---- the Founder's Fountain: the island on the run to the line, the statue on top, water running ----
  {
    const L = FOUNTAIN.x1 - FOUNTAIN.x0 + ISLAND_R * 2, c = at(xToCp((FOUNTAIN.x0 + FOUNTAIN.x1) / 2), ISLAND_LAT);
    const isl = S.fountainIsland(L, ISLAND_R * 2), iy = c.y - 0.08;
    sc.place(isl, c.x, c.z, { yaw: c.yaw, y: iy }); bake.add(isl);
    const st = S.founder(); sc.place(st, c.x, c.z, { yaw: c.back + 0.35, y: iy + isl.userData.statueY, scale: 1.75 }); bake.add(st);
    const n = at(xToCp(FOUNTAIN.x0 + 4.2), ISLAND_LAT), mon = S.monument(4.2), my = n.y + 0.55;
    sc.place(mon, n.x, n.z, { yaw: n.back, y: my }); bake.add(mon);
    const pn = mon.userData.panel;
    atlas.place(board('OUR FOUNDER', { bg: '#2c3038', fg: '#ffc928', kicker: 'STATUE FUNDED BY: OUR FOUNDER', kfg: '#ffffff', size: 120, shadow: false }, 768, 300), [n.x + Math.sin(n.back) * pn.z, my + pn.y, n.z + Math.cos(n.back) * pn.z], n.back, pn.w, pn.h);
    // the jets: arcs of spray from the tiers, a few hundred droplets a second at most
    const jets = isl.userData.basins.map(([z, y, r]) => ({ x: c.x + Math.sin(c.yaw) * z, z: c.z + Math.cos(c.yaw) * z, y: iy + y, r }));
    anim.push(dt => {
      const fx = view.fx; if (!fx?.bits) return;
      for (const j of jets) for (let k = 0, n2 = fx.count(j.r > 1.2 ? 60 : 30, dt); k < n2; k++) {
        const a = rng() * 6.283, sp = 1.0 + rng() * 0.8;
        fx.bits.emit({ x: j.x, y: j.y + (j.r > 1.2 ? 0.2 : 0.4), z: j.z, vx: Math.cos(a) * sp, vy: 4.2 + rng() * 1.4, vz: Math.sin(a) * sp, color: [0.78, 0.93, 1], size: 0.32, life: 0.95, gravity: 9.8, drag: 0.2, alpha: 0.85, floor: j.y - 0.6 });
      }
    });
    taken.push([c.x, c.z, 26]);
  }
}

/* ---------- Sand Hill Road: the median, the LP lane's gate, the firms, the summit pod ---------- */
function sandHill({ THREE, track, group, sc, rng, atlas, bake, taken, local, board, legs, anim, view }) {
  const PV = new THREE.Vector3();
  const at = (cp, lat = 0) => { const s = track.sAtCp(cp); track.pointAt(s, lat, PV); const yaw = track.yawAt(s); return { x: PV.x, y: PV.y, z: PV.z, yaw, back: yaw + Math.PI, i: track.indexAtCp(cp) }; };
  const FIRMS = [
    ['FOMO CAPITAL', 'TERM SHEETS THIS WAY', '#fff8e6', '#b8860b'],
    ['BIGGER FISH PARTNERS', "WE'LL BUY WHOEVER BUYS YOU", '#e9f6ff', '#12395c'],
    ['HOCKEY STICK VENTURES', 'UP AND TO THE RIGHT. EVENTUALLY.', '#effbea', '#1d6b2a'],
    ['BURN RATE CAPITAL', 'YOUR MONEY, ON FIRE', '#fff0e6', '#c2410c'],
  ];
  // the firms' emblems (generated art, assets/tracks/silicon-valley/prompts.md): a 2x2 sheet, drawn into the boards once it loads
  const emblems = new Image(); let emblemsReady = false;
  emblems.onload = () => { emblemsReady = true; atlas.paint(); };
  emblems.src = 'assets/tracks/silicon-valley/vc-emblems.webp';
  const firmDraw = (k, big) => (g, w, h) => {
    const [name, line, bg, ink] = FIRMS[k];
    g.fillStyle = bg; g.fillRect(0, 0, w, h);
    g.strokeStyle = ink; g.lineWidth = h * 0.05; g.strokeRect(g.lineWidth / 2, g.lineWidth / 2, w - g.lineWidth, h - g.lineWidth);
    const e = h * 0.78, ex = h * 0.11;
    if (emblemsReady) g.drawImage(emblems, (k % 2) * emblems.width / 2, Math.floor(k / 2) * emblems.height / 2, emblems.width / 2, emblems.height / 2, ex, (h - e) / 2, e, e);
    const x0 = ex * 2 + e, tw = w - x0 - ex;
    if (big) {
      S.fitText(g, name, x0 + tw / 2, h * 0.27, tw, h * 0.2, S.SANS, ink, { lines: 1 });
      S.fitText(g, line, x0 + tw / 2, h * 0.64, tw, h * 0.34, S.FONT, '#1a1d29', { lines: 2, maxH: h * 0.5 });
    } else S.fitText(g, name, x0 + tw / 2, h / 2, tw, h * 0.42, S.FONT, ink, { lines: 2, maxH: h * 0.8 });
  };
  const firmBoard = k => atlas.add(1024, 340, firmDraw(k, true)), firmPlate = k => atlas.add(768, 256, firmDraw(k, false));

  // ---- the median: lawn and hedges, two firms' monument signs, and the gate across the LP lane ----
  {
    const zm = (MEDIAN.z0 + MEDIAN.z1) / 2, L = MEDIAN.z1 - MEDIAN.z0 + ISLAND_R * 2, c = at(zToCp(zm), ISLAND_LAT);
    const md = S.medianIsland(L, ISLAND_R * 2); sc.place(md, c.x, c.z, { yaw: c.yaw, y: c.y - 0.08 });
    // pitch the island to the road's fall (#242): the road drops ~1.1 m along the median, and the
    // rigid island hovered half a metre over the tarmac at its downhill end
    const yA = at(zToCp(MEDIAN.z0), ISLAND_LAT).y, yB = at(zToCp(MEDIAN.z1), ISLAND_LAT).y;
    md.rotateX(Math.atan2(yA - yB, L)); bake.add(md);
    const surfBase = dz => (c.y - 0.08) + (yB - yA) * dz / L;   // the pitched island's base plane, at dz along it
    const trees = [-12, 0, 12].map(dz => ({ x: c.x + Math.sin(c.yaw) * dz, z: c.z + Math.cos(c.yaw) * dz, y: surfBase(dz) + 0.48, yaw: rng() * 6.28 }));
    sc.instances(partsOf(P.roundTree(21, { h: 6.5, leafA: 0x3f9e3a, leafB: 0x5dbb45 })), trees, { scale: [0.9, 1.1] });
    for (const [k, z] of [[0, MEDIAN.z0 + 4], [1, MEDIAN.z0 + 22]]) {
      const n = at(zToCp(z), ISLAND_LAT), mon = S.monument(4.2), my = n.y + 0.45; sc.place(mon, n.x, n.z, { yaw: n.back, y: my }); bake.add(mon, false);
      const pn = mon.userData.panel; atlas.place(firmPlate(k), [n.x + Math.sin(n.back) * pn.z, my + pn.y, n.z + Math.cos(n.back) * pn.z], n.back, pn.w, pn.h);
    }
    // the gate: shut on lap 1 (LIMITED PARTNERS ONLY), open from lap 2 (#121) — karts bounce off it until then
    const gz = MEDIAN.z0 - 3.5, gl = (ISLAND_LAT + ISLAND_R + 0.3 + track.hwL[at(zToCp(gz)).i]) / 2, gc = at(zToCp(gz), gl);
    const lane = track.hwL[gc.i] - (ISLAND_LAT + ISLAND_R) - 0.6, gate = S.lpGate(lane / 2);
    gate.position.set(gc.x, gc.y, gc.z); gate.rotation.y = gc.yaw + Math.PI / 2; group.add(gate);
    const posts = [];
    for (let l = -lane / 2 + 0.6; l <= lane / 2 - 0.6; l += 1.3) { const q = at(zToCp(gz), gl + l); track.addCollider(q.x, q.z, 0.75); track.eachCollider(q.x, q.z, o => { if (Math.abs(o.x - q.x) < 1e-6 && Math.abs(o.z - q.z) < 1e-6) posts.push(o); }); }
    const beamH = 6.2, bc = [gc.x, gc.y + beamH, gc.z];
    for (const s of [-1, 1]) { const q = at(zToCp(gz), gl + s * (lane / 2 + 0.9)), pst = S.post(beamH + 1.6, 0.28, 0x2b2f36); sc.place(pst, q.x, q.z, { y: q.y }); bake.add(pst, false); }   // no shadow casters: draw-call headroom (#215 item 7)
    const c2 = document.createElement('canvas'); c2.width = 768; c2.height = 220;
    const tex = new THREE.CanvasTexture(c2); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
    let open = false;
    const draw = () => { (open ? S.signDraw('PITCH DAY: COME ON IN', { bg: '#16a34a', fg: '#ffffff', kicker: 'THE LP LANE IS OPEN', kfg: '#ffd23c', size: 118 }) : S.signDraw('LIMITED PARTNERS ONLY', { bg: '#1a1d29', fg: '#ffc928', kicker: 'PRIVATE DRIVE · OPENS LAP 2', kfg: '#ffffff', size: 118 }))(c2.getContext('2d'), 768, 220); tex.needsUpdate = true; };
    draw(); if (document.fonts?.ready) document.fonts.ready.then(draw);
    const smat = new THREE.MeshStandardMaterial({ map: tex, emissiveMap: tex, emissive: 0xffffff, emissiveIntensity: 0.3, roughness: 0.6, side: THREE.DoubleSide });
    const sw = lane + 1.6, sm = new THREE.Mesh(new THREE.PlaneGeometry(sw, sw * 220 / 768), smat);
    sm.position.set(...bc); sm.rotation.y = gc.back; group.add(sm);
    let swing = 0;
    anim.push(dt => {
      const want = leaderLap(view.race) >= 2;
      if (want !== open) { open = want; draw(); if (open) for (const o of posts) { o.x += 1e5; } }
      swing += ((open ? 1 : 0) - swing) * Math.min(1, dt * 1.8);
      const [a, b] = gate.userData.leaves; a.rotation.y = -swing * 1.5; b.rotation.y = swing * 1.5;
    });
    taken.push([c.x, c.z, 28]);
  }

  // ---- the street sign at the dip, and the firms' boards up the climb ----
  {
    const p = at(5.78, -(track.hwR[track.indexAtCp(5.78)] + 7)), sp = { x: p.x, z: p.z, y: track.terrainHeight(p.x, p.z), yaw: p.back };
    legs(sp, 14, 7.5, 0x2b2f36);
    atlas.place(board('SAND HILL RD', { bg: '#0f6b3a', fg: '#ffffff', kicker: 'VENTURE CAPITAL · NEXT 2 MI', kfg: '#ffffff', border: '#ffffff', size: 124 }, 768, 260), local(sp, 0, 0, sp.y + 8.4), sp.yaw, 15, 5.1);
    taken.push([sp.x, sp.z, 10]);
    const frame = P.billboard(null, { w: 15, h: 5, legs: 6 }); frame.remove(frame.children[frame.children.length - 1]);
    [[6.2, 1, 17, 0], [6.55, -1, 15, 1], [6.95, -1, 14, 2], [7.45, 1, 16, 3]].forEach(([cp, side, off, k]) => {
      const q = sc.beside(cp, side, off), yaw = q.yaw + rng.range(-0.08, 0.08), f = frame.clone();
      // planted on the lower leg in the rendered terrain, like the big boards (#242)
      const gy = Math.min(...[-4.8, 4.8].map(u => { const [x, , z] = local({ ...q, yaw }, u, -0.3, 0); return track.terrainHeight(x, z); })) - 0.05;
      sc.place(f, q.x, q.z, { yaw, y: gy }); bake.add(f);
      const b = firmBoard(k);
      atlas.place(b, [q.x + Math.sin(yaw) * 0.03, gy + 8.5, q.z + Math.cos(yaw) * 0.03], yaw, 15, 5);
      atlas.place(b, [q.x - Math.sin(yaw) * 0.46, gy + 8.5, q.z - Math.cos(yaw) * 0.46], yaw + Math.PI, 15, 5);
      taken.push([q.x, q.z, 9]);
    });
  }

  // ---- the firms' offices: low glass slabs on the lawns east of the climb, sprinklers going ----
  {
    const sprays = [];
    [[5.25, 40, 3, 0x2ee6a6], [5.85, 44, 1, 0x38b6ff], [6.4, 36, 2, 0xffd23c]].forEach(([cp, off, k, accent], j) => {
      const p = sc.beside(cp, 1, off), hq = P.campusBlock(30 + j, { w: 30, d: 14, floors: 2, accent });
      // planted on the lowest corner of the footprint in the rendered terrain: on the bowl
      // slope the centre-seated slabs hovered a front corner (#242)
      p.y = Math.min(...[[-15.65, 7.65], [15.65, 7.65], [-15.65, -7.65], [15.65, -7.65]].map(([u, v]) => { const [x, , z] = local(p, u, v, 0); return track.terrainHeight(x, z); })) - 0.25 + 0.4;
      sc.place(hq, p.x, p.z, { yaw: p.yaw, y: p.y - 0.4 }); bake.add(hq);
      const m = sc.beside(cp, 1, off - 13), mon = S.monument(6.4);
      const my = Math.min(...[[-3.2, 0.5], [3.2, 0.5], [-3.2, -0.5], [3.2, -0.5]].map(([u, v]) => { const [x, , z] = local(m, u, v, 0); return track.terrainHeight(x, z); })) - 0.2;
      sc.place(mon, m.x, m.z, { yaw: m.yaw, y: my }); bake.add(mon, false);
      const pn = mon.userData.panel; atlas.place(firmPlate(k), [m.x + Math.sin(m.yaw) * pn.z, my + pn.y, m.z + Math.cos(m.yaw) * pn.z], m.yaw, pn.w, pn.h);
      for (const u of [-9, 9]) { const [x, , z] = local(m, u, -2, 0); sprays.push({ x, z, y: track.terrainHeight(x, z) + 0.3, ph: rng() * 6 }); }
      taken.push([p.x, p.z, 24], [m.x, m.z, 6]);
    });
    anim.push((dt, time) => {
      const fx = view.fx; if (!fx?.bits) return;
      for (const s of sprays) { const a = s.ph + Math.sin(time * 0.9 + s.ph) * 1.3; for (let k = 0, n = fx.count(22, dt); k < n; k++) fx.bits.emit({ x: s.x, y: s.y, z: s.z, vx: Math.cos(a) * 5 + rng.range(-0.4, 0.4), vy: 4 + rng() * 0.8, vz: Math.sin(a) * 5 + rng.range(-0.4, 0.4), color: [0.8, 0.94, 1], size: 0.28, life: 1.0, gravity: 9.8, drag: 0.3, alpha: 0.8, floor: s.y - 0.3 }); }
    });
  }

  // ---- Partner Summit: the glass meeting pod on the crest, partners inside, the view out the back ----
  {
    const p = sc.beside(7.05, 1, 15), pod = S.confPod(); sc.place(pod, p.x, p.z, { yaw: p.yaw, y: p.y }); bake.add(pod, false);
    // a plinth under the pod: it straddles the crest, and its back feet hovered ~1.9 m (#242)
    const pMin = Math.min(...[[-5, 2.6], [5, 2.6], [-5, -2.6], [5, -2.6]].map(([u, v]) => { const [x, , z] = local(p, u, v, 0); return track.terrainHeight(x, z); }));
    const plinth = new THREE.Mesh(new THREE.BoxGeometry(11.6, p.y - pMin + 0.47, 6.6), new THREE.MeshStandardMaterial({ color: 0xb9bcc4, roughness: 0.85 }));
    plinth.position.set(p.x, (p.y - 0.03 + pMin - 0.5) / 2, p.z); plinth.rotation.y = p.yaw; group.add(plinth); bake.add(plinth);
    const seats = [];
    for (const [u, v, f] of [[-2.6, 1.3, Math.PI], [0, 1.3, Math.PI], [2.6, 1.3, Math.PI], [-2.6, -1.3, 0], [2.6, -1.3, 0]]) { const [x, , z] = local(p, u, v, 0); seats.push({ x, z, y: p.y + 1.45, yaw: p.yaw + f }); }
    sc.instances(partsOf(P.spectator()), seats, { scale: 1.7, tints: [0x1f2a44, 0x3a414c, 0xf4f4f0, 0x1f2a44], cast: false });
    const wb = pod.userData.board;
    atlas.place(board('PIVOT TO KARTS?', { bg: '#ffffff', fg: '#1f6bff', size: 110, font: S.SANS }, 512, 240), local(p, 0, wb.z - 0.08, p.y + wb.y), p.yaw + Math.PI, wb.w, wb.h);
    const sp = { ...p, ...xz(local(p, 0, -5.5, 0)) }; sp.y = track.terrainHeight(sp.x, sp.z);
    legs(sp, 16, 10.5, 0xdfe3ea);
    atlas.place(board('PARTNER MEETING', { bg: '#1a1d29', fg: '#ffffff', kicker: 'DO NOT DISTURB (THE VIEW)', kfg: '#2ee6a6', size: 120 }, 768, 300), local(sp, 0, 0, sp.y + 11.4), sp.yaw, 16, 6.2);
    taken.push([p.x, p.z, 14]);
  }
}
