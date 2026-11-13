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
/* The centerpiece: the PIVOT TO AI tower in the infield beyond the grandstands, facing the start straight. */
const PIVOT = { x: 125, z: 72, yaw: -2.03, w: 36, h: 36, legs: 16 };

/* Billboards: [cp, side, metres beyond the road edge, text, background, ink]. */
const BOARDS = [
  [1.28, -1, 22, 'EVERY RIDE LOSES MONEY. VOLUME!', '#1a1d29', '#ffd23c'],
  [4.4, -1, 32, 'HIRING: 10X ENGINEER, 0.1X SALARY', '#ffffff', '#1f6bff'],
  [5.3, -1, 18, 'AI WILL REPLACE YOU. APPLY NOW.', '#e23b3b', '#ffffff'],
  [6.4, 1, 18, 'UNLIMITED PTO (DO NOT TAKE IT)', '#2ee6a6', '#1a1d29'],
  [7.2, 1, 20, 'A BETTER WORLD (FOR SHAREHOLDERS)', '#7b5cff', '#ffffff'],
  [8.0, -1, 16, 'RETURN TO OFFICE. OR ELSE.', '#ffd23c', '#1a1d29'],
  [9.5, -1, 26, 'FREE KOMBUCHA. NO RAISES.', '#ff8a3c', '#1a1d29'],
  [10.95, -1, 18, 'MOVE FAST. BREAK LAWS.', '#1a1d29', '#ffffff'],
  [11.7, -1, 18, 'YOU ARE THE PRODUCT', '#ffffff', '#e23b3b'],
  [12.4, 1, 18, 'PRE-REVENUE. POST-SHAME.', '#0ea5e9', '#ffffff'],
  [13.5, -1, 22, 'DISRUPTING THINGS THAT WORKED', '#db2777', '#ffffff'],
  [3.55, 1, 30, 'SERIES Z: PLEASE, ANYONE?', '#16a34a', '#ffffff'],
];
const STANDS = ['SEATS PAID IN EQUITY', 'INTERN SECTION (UNPAID)', "VC BOX: LET'S CIRCLE BACK", 'LAID OFF? FREE SEATS!'];
const PLACARDS = ['SHIP IT!', 'IS IT AGI YET?', "MOM, I'M A UNICORN", 'WHERE IS MY EQUITY', 'PIVOT!', '996 OR BUST', 'NO REVENUE, NO PROBLEM', 'I FUNDED THIS'];

export default {
  id: 'silicon-valley',
  name: 'Silicon Valley Circuit',
  tagline: 'Move fast. Break things. Pivot to AI.',
  lapNotes: ['<b>Lap 2.</b> Pivot complete. You are now an AI company.', '<b>Final lap.</b> Market correction: layoffs, a down round, and one last pivot — to KARTS.'],
  // the opening shot: rising past the grandstands toward the pivot tower
  intro: [{ pos: [-6, 21, -10], look: [PIVOT.x, 30, PIVOT.z], pos1: [38, 23, 2], look1: [PIVOT.x, 32, PIVOT.z], fov: 45, dur: 3 }],
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
    { p: [214, 5, 106] },        // 4 climbing the shore
    { p: [158, 10, 168] },       // 5
    { p: [84, 13.5, 150], w: 15 },// 6 esses at the top
    { p: [22, 15.5, 196], w: 15 },// 7
    { p: [-62, 15, 214] },       // 8 crest
    { p: [-142, 8.5, 176], w: 19 },// 9 downhill sweeper
    { p: [-192, 3, 104] },       // 10
    { p: [-168, 0.5, 36], w: 15 },// 11 chicane in
    { p: [-196, 0, -22], w: 15 },// 12 chicane out
    { p: [-140, 0, -52], w: 18 },// 13 final corner
    { p: [-70, 0, -8] },         // 14 back onto the straight
  ],
  sides: [
    { from: 13.3, to: 1.6, side: 'L', edge: 'wall' },   // pit wall along the grandstand side
    { from: 7.6, to: 8.9, edge: 'wall' },                // crest and jump are fenced in
    { from: 3.3, to: 4.6, side: 'L', outer: 26, shoulder: 6 }, // open meadow on the outside of the shore climb
    { from: 9.2, to: 10.6, side: 'L', outer: 30, shoulder: 5 }, // cut across the grass on the way down (needs a boost)
    { from: 1.45, to: 3.12, edge: 'wall', wallHeight: 0.85 }, // the bridge guardrails: low enough to see the bay over
  ],
  bridges: [
    { from: 1.45, to: 3.12 },                            // the Golden Gate span: terrain/water stay below the deck
  ],
  ramps: [
    { at: 8.25, len: 9, lift: 2.1 },
  ],
  boosts: [
    { at: 0.55, lat: 0, w: 5 },
    { at: 2.45, lat: 0, w: 5 },
    { at: 4.2, lat: -4, w: 4.5 },
    { at: 9.9, lat: 3.5, w: 4.5 },
    { at: 13.9, lat: 0, w: 5 },
  ],
  itemRows: [{ at: 1.5 }, { at: 5.6 }, { at: 9.4 }, { at: 12.5, n: 3 }],
  coins: [
    { from: 0.2, to: 0.5, n: 4, lat: 4.5 }, { from: 2.15, to: 2.85, n: 5, lat: 0 },
    { from: 3.4, to: 3.9, n: 5, lat: [6, -5] },
    { from: 6.2, to: 6.9, n: 5, lat: [-4, 4] }, { from: 8.34, to: 8.5, n: 3, lat: 0, air: 2.6 },
    { from: 10.3, to: 10.8, n: 4, lat: -5 }, { from: 13.1, to: 13.6, n: 5, lat: [-5, 2] },
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
    /** Two legs for a free-standing sign w wide whose top is `top` metres up. */
    const legs = (p, w, top, color = 0x3a414c) => { for (const u of [-w * 0.32, w * 0.32]) { const q = S.post(top, 0.3, color); const [x, , z] = local(p, u, -0.4, 0); sc.place(q, x, z, { y: p.y - 0.3 }); bake.add(q, false); } };

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
      const g = proto.group.clone(); sc.place(g, p.x, p.z, { yaw: p.yaw, y: p.y });
      g.updateMatrixWorld(true); M.copy(g.matrixWorld);
      for (const s of proto.seats) if (rng() < 0.82) { V.set(s[0], s[1], s[2]).applyMatrix4(M); seats.push({ x: V.x, y: V.y, z: V.z, yaw: p.yaw + rng.range(-0.4, 0.4) }); }
      bake.add(g);
      // a banner under the roof, and the front row holding up placards
      const k = nStand++;
      atlas.place(board(STANDS[k % STANDS.length], { bg: k % 2 ? '#ffd23c' : '#ffffff', fg: '#1a1d29', size: 120, lines: 1 }, 1024, 96), local(p, 0, 2.3, p.y + 7.9), p.yaw, 28, 2.6);
      [-10, 0.5, 10.5].forEach((u, j) => {
        const text = PLACARDS[(k * 3 + j) % PLACARDS.length];
        atlas.place(board(text, { bg: ['#ffffff', '#ff4d6d', '#38b6ff', '#2ee6a6'][(k + j) % 4], fg: '#1a1d29', size: 110, border: '#1a1d29' }, 384, 224), local(p, u + rng.range(-1.5, 1.5), 0.4, p.y + 3.9), p.yaw + rng.range(-0.15, 0.15), 3.0, 1.75);
      });
    };
    sc.along({ from: 13.75, to: 1.3, side: 1, offset: 6.5, spacing: 34 }).forEach((p, i) => putStand(i % 2 ? stand2 : stand, p));
    sc.along({ from: 14.3, to: 0.9, side: -1, offset: 17, spacing: 34, phase: 12 }).forEach((p, i) => putStand(i % 2 ? stand : stand2, p));
    const crowd = sc.instances(partsOf(P.spectator()), seats, { scale: [0.95, 1.2], tints: P.CROWD_TINTS, cast: false });
    const crowdFull = crowd.map(m => m.count);
    // the correction (#121): on the final lap the layoffs land and the grandstands empty out
    let crowdFill = 1, crowdShown = -1;
    anim.push(dt => {
      crowdFill += ((view.finalLap ? 0.3 : 1) - crowdFill) * Math.min(1, dt * 0.7);
      const n = Math.round(crowdFill * 200);
      if (n !== crowdShown) { crowdShown = n; crowd.forEach((m, k) => { m.count = Math.floor(crowdFull[k] * crowdFill); }); }
    });

    gags({ THREE, track, group: ctx.group, sc, rng, atlas, bake, taken, local, sign, board, legs, anim, view });

    // The Ring: glass doughnut HQ around the pond, the landmark you can see from most of the lap
    const ring = P.ringHQ({ R: RING.r, band: RING.band, H: 13 });
    sc.place(ring, RING.x, RING.z, { y: 2.1, cast: true });
    // garden inside the ring
    const inner = sc.scatter({ count: 46, min: 60, max: 400, where: (x, z) => { const d = Math.hypot(x - RING.x, z - RING.z); return d > POND.r * 1.15 && d < RING.r - RING.band - 3; } });
    sc.instances(partsOf(P.roundTree(11, { h: 6.5, leafA: 0x57b548, leafB: 0x8fd25a })), inner.slice(0, 26), { scale: [0.8, 1.3], yaw: 'random' });
    sc.instances(partsOf(P.bush(4, { color: 0x6cc24f, flower: 0xff7eb6 })), inner.slice(26), { scale: [1, 1.8], yaw: 'random' });

    // rocket on the hill beyond turn one; it launches every so often
    const pad = P.rocketPad({ h: 36 });
    sc.place(pad, ROCKET.x, ROCKET.z, { yaw: -0.6, y: 13 });
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
    const blocks = sc.scatter({ count: 16, min: 34, max: 120, maxSlope: 0.22, minGap: 46, where: (x, z) => Math.hypot(x - RING.x, z - RING.z) > RING.r + 20 && Math.hypot(x - ROCKET.x, z - ROCKET.z) > 40 && free(x, z) && free(x + 14, z) && free(x - 14, z) && free(x, z + 14) && free(x, z - 14) });
    const accents = [0x38b6ff, 0xff4d6d, 0xffd23c, 0x2ee6a6, 0x9b6bff, 0xff8a3c];
    blocks.forEach((p, i) => { const g = sc.place(P.campusBlock(i, { w: rng.range(18, 30), d: rng.range(12, 18), floors: 2 + (i % 3), accent: accents[i % accents.length] }), p.x, p.z, { yaw: Math.round(p.yaw / (Math.PI / 4)) * (Math.PI / 4), y: p.y - 0.4 }); bake.add(g); });
    const clearOfBuildings = (x, z) => free(x, z) && !blocks.some(b => (b.x - x) ** 2 + (b.z - z) ** 2 < 20 * 20) && Math.abs(Math.hypot(x - RING.x, z - RING.z) - RING.r + RING.band / 2) > RING.band && Math.hypot(x - ROCKET.x, z - ROCKET.z) > 22;

    // trees: oaks over the hills, cypress avenues, palms on the fast corners
    const oakSpots = sc.scatter({ count: 300, min: 15, max: 190, maxSlope: 0.6, minGap: 5, where: clearOfBuildings });
    const oakA = partsOf(P.roundTree(1, { h: 7.5 })), oakB = partsOf(P.roundTree(2, { h: 9, leafA: 0x3f9e3a, leafB: 0x5dbb45 })), oakC = partsOf(P.roundTree(3, { h: 6, leafA: 0x6fc94a, leafB: 0x9ad65a }));
    sc.instances(oakA, oakSpots.filter((_, i) => i % 3 === 0), { scale: [0.8, 1.5], yaw: 'random', tilt: 0.04 });
    sc.instances(oakB, oakSpots.filter((_, i) => i % 3 === 1), { scale: [0.8, 1.6], yaw: 'random', tilt: 0.04 });
    sc.instances(oakC, oakSpots.filter((_, i) => i % 3 === 2), { scale: [0.8, 1.4], yaw: 'random', tilt: 0.04 });
    const cyp = partsOf(P.cypress(1, { h: 12 }));
    sc.instances(cyp, [...sc.along({ from: 9.2, to: 10.9, side: -1, offset: 14.5, spacing: 9 }), ...sc.along({ from: 5.1, to: 7.4, side: 1, offset: 14.5, spacing: 9 }), ...sc.along({ from: 5.1, to: 7.4, side: -1, offset: 14.5, spacing: 9 })], { scale: [0.85, 1.2] });
    const palmA = partsOf(P.palm(1, { h: 10 })), palmB = partsOf(P.palm(5, { h: 8.5 }));
    // palms line the shores and the climb; sc.along skips bridge samples, so none land on the deck
    const palmSpots = [...sc.along({ from: 1.35, to: 4.9, side: -1, offset: 14, spacing: 12 }), ...sc.along({ from: 3.15, to: 3.6, side: 1, offset: 14, spacing: 12 }), ...sc.along({ from: 11.0, to: 13.6, side: 1, offset: 14, spacing: 11 }), ...sc.along({ from: 11.0, to: 13.2, side: -1, offset: 14, spacing: 11 })];
    sc.instances(palmA, palmSpots.filter((_, i) => i % 2 === 0), { scale: [0.9, 1.25], yaw: 'random' });
    sc.instances(palmB, palmSpots.filter((_, i) => i % 2 === 1), { scale: [0.9, 1.25], yaw: 'random' });
    // shrubs and rocks close to the action
    const low = sc.scatter({ count: 240, min: 12.5, max: 46, maxSlope: 0.7, minGap: 2.5, where: clearOfBuildings });
    sc.instances(partsOf(P.bush(1, { color: 0x58b548 })), low.filter((_, i) => i % 3 === 0), { scale: [0.8, 1.7], yaw: 'random' });
    sc.instances(partsOf(P.bush(2, { color: 0x79c94f, flower: 0xffd23c })), low.filter((_, i) => i % 3 === 1), { scale: [0.8, 1.5], yaw: 'random' });
    sc.instances(partsOf(P.bush(3, { color: 0x4aa544, flower: 0xff7eb6 })), low.filter((_, i) => i % 6 === 2), { scale: [0.8, 1.5], yaw: 'random' });
    sc.instances(partsOf(P.rock(1, { r: 1.3 })), low.filter((_, i) => i % 6 === 5), { scale: [0.6, 2], yaw: 'random', sink: 0.2, tints: [0xa8a096, 0x8f8880, 0xb7ada0] });

    // arrow boards on the outside of every real corner
    const chev = P.chevronBoard();
    for (const c of track.corners) {
      const side = c.dir > 0 ? -1 : 1, n = Math.max(2, Math.min(5, Math.round(c.len / 15)));
      for (let k = 0; k < n; k++) {
        const i = (c.i0 + Math.round(((k + 0.6) / n) * (c.len / track.ds))) % track.N;
        const p = sc.beside(track.cp[i], side, (side > 0 ? track.outerL[i] : track.outerR[i]) + 1.2);
        const b = chev.clone(); sc.place(b, p.x, p.z, { yaw: p.yaw, lift: 0.9 }); if (c.dir > 0) b.scale.x = -1;
        bake.add(b, false);
      }
    }

    // big billboards where you are looking anyway, all one atlas
    const frame = P.billboard(null, { w: 15, h: 5, legs: 6 }); frame.remove(frame.children[frame.children.length - 1]);   // the frame, without its blank panel
    BOARDS.forEach(([at, side, off, text, bg, fg]) => {
      const p = sc.beside(at, side, off), yaw = p.yaw + rng.range(-0.12, 0.12), f = frame.clone();
      sc.place(f, p.x, p.z, { yaw }); bake.add(f);
      atlas.place(board(text, { bg, fg, size: 118 }), [p.x + Math.sin(yaw) * 0.03, p.y + 8.5, p.z + Math.cos(yaw) * 0.03], yaw, 15, 5);
      atlas.place(board(text, { bg, fg, size: 118 }), [p.x - Math.sin(yaw) * 0.46, p.y + 8.5, p.z - Math.cos(yaw) * 0.46], yaw + Math.PI, 15, 5);   // and on the back
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
    const { w: W, h: H } = PIVOT, p = { x: PIVOT.x, z: PIVOT.z, yaw: PIVOT.yaw, y: sc.y(PIVOT.x, PIVOT.z) - 0.5 };
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
    for (let k = 0; k < 10; k++) { const a = (k / 10) * Math.PI * 2, x = c.x + Math.cos(a) * R, z = c.z + Math.sin(a) * R; cars.push({ x, z, y: sc.y(x, z), yaw: Math.atan2(c.x - x, c.z - z) + rng.range(-0.12, 0.12) }); }
    sc.instances(partsOf(S.robotaxi()), cars, { scale: 1.35 });
    const cone = P.cone3d(); sc.place(cone, c.x, c.z, { scale: 2.2 }); bake.add(cone);
    const sp = { x: c.x + l[0] * 15, z: c.z + l[1] * 15 }; sp.y = sc.y(sp.x, sp.z); sp.yaw = facing(sp, 40, -2);
    legs(sp, 16, 9.5);
    atlas.place(board('ALL RIDES DELAYED: 1 CONE', { bg: '#ffffff', fg: '#1a1d29', kicker: 'ROBOTAXI DEPOT', kfg: '#e23b3b', border: '#1a1d29', size: 120 }, 768, 300), local(sp, 0, 0, sp.y + 12.5), sp.yaw, 17, 6.6);
    taken.push([c.x, c.z, 24], [sp.x, sp.z, 12]);
  }

  // ---- the climb: shipping containers sold as luxury micro-lofts ----
  {
    const p = sc.beside(4.05, 1, 23); p.yaw += 0.08;
    const st = S.containerStack(); sc.place(st, p.x, p.z, { yaw: p.yaw, y: p.y - 0.2 }); bake.add(st);
    legs({ ...p, ...xz(local(p, 0, -1.2, 0)) }, 26, 13);
    atlas.place(board('LUXURY MICRO-LOFTS $4,200/MO', { bg: '#1a1d29', fg: '#ffd23c', kicker: 'NOW LEASING', kfg: '#ffffff', size: 120 }, 1024, 300), local(p, 0, -1.0, p.y + 10.6), p.yaw, 26, 7.6);
    [['PET FRIENDLY (NO PETS)', -12.4], ['ROOMMATES INCLUDED (9)', 0], ['40 SQ FT OF VIBES', 12.4]].forEach(([t, u]) => atlas.place(board(t, { bg: '#ffffff', fg: '#1a1d29', size: 100, border: '#1a1d29' }, 640, 160), local(p, u, 1.5, p.y + 1.25), p.yaw, 6.2, 1.55));
    taken.push([p.x, p.z, 26]);
  }

  // ---- the esses: the unicorn balloon over its HQ, slowly deflating ----
  {
    const p = sc.beside(5.9, 1, 32), hq = P.campusBlock(7, { w: 30, d: 16, floors: 3, accent: 0xff7eb6 });
    sc.place(hq, p.x, p.z, { yaw: p.yaw, y: p.y - 0.4 }); bake.add(hq);
    const roof = p.y - 0.4 + 3 * 3.4 + 0.6;
    legs({ ...p, y: roof }, 20, 6, 0xff7eb6);
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
    const p = sc.beside(8.8, 1, 28), H = 11, R = 13, ic = track.indexAtCp(8.25);
    const mound = new THREE.Mesh(new THREE.ConeGeometry(R, H, 18, 1, true), new THREE.MeshStandardMaterial({ color: 0x7c6a52, roughness: 0.95 }));
    mound.position.set(p.x, p.y + H / 2 - 0.6, p.z); group.add(mound); bake.add(mound);
    const cols = [0x22c55e, 0xff4d6d, 0x111827, 0xffd23c, 0x38b6ff], parts = cols.map(c => partsOf(S.scooter(c))), mats = cols.map(() => []);
    const E = new THREE.Euler(), Q = new THREE.Quaternion(), Sx = new THREE.Vector3(2.4, 2.4, 2.4);
    for (let k = 0; k < 110; k++) {
      const hh = Math.pow(rng(), 0.8) * (H - 0.5), rr = (R * (1 - hh / H)) * (0.75 + rng() * 0.3), a = rng() * Math.PI * 2;
      E.set(rng() * 6.28, rng() * 6.28, rng() * 6.28); Q.setFromEuler(E);
      mats[k % cols.length].push(new THREE.Matrix4().compose(new THREE.Vector3(p.x + Math.cos(a) * rr, p.y - 0.6 + hh + 0.4, p.z + Math.sin(a) * rr), Q, Sx));
    }
    parts.forEach((pt, k) => bake.copies(pt, mats[k], false));
    const sp = { ...p, yaw: facing(p, track.px[ic], track.pz[ic]) };   // the sign stands on top of the heap, facing the karts coming over the crest
    legs(sp, 18, H + 7);
    atlas.place(board('UNLOCK $1. ABANDON FREE.', { bg: '#22c55e', fg: '#ffffff', kicker: 'SCOOTER SHARE', kfg: '#1a1d29', size: 120 }, 768, 300), local(sp, 0, 0, sp.y + H + 7.5), sp.yaw, 18, 7);
    taken.push([p.x, p.z, R + 6]);
  }

  // ---- the downhill: the fifteen-minute standup, now in its ninth hour ----
  {
    const p = sc.beside(10.85, 1, 24), people = [], sleepers = [];
    for (let k = 0; k < 9; k++) {
      const a = (k / 9) * Math.PI * 2, x = p.x + Math.cos(a) * 4.5, z = p.z + Math.sin(a) * 4.5;
      (k === 2 || k === 6 ? sleepers : people).push({ x, z, y: sc.y(x, z), yaw: Math.atan2(p.x - x, p.z - z) });
    }
    sc.instances(partsOf(P.spectator()), people, { scale: 2.1, tints: P.CROWD_TINTS, cast: false });
    sc.instances(partsOf(P.spectator()), sleepers.map(s => ({ ...s, y: s.y + 0.55 })), { scale: 2.1, tints: P.CROWD_TINTS, cast: false, tilt: 0 }).forEach(m => { for (let k = 0; k < m.count; k++) { m.getMatrixAt(k, M4); M4.multiply(new THREE.Matrix4().makeRotationX(Math.PI / 2)); m.setMatrixAt(k, M4); } m.instanceMatrix.needsUpdate = true; });
    // the whiteboard
    const wb = { ...p, ...xz(local(p, 0, -1.5, 0)) };
    legs(wb, 7, 4.5, 0x9aa3ad);
    atlas.place(board('BLOCKERS: THIS MEETING', { bg: '#ffffff', fg: '#1f6bff', border: '#9aa3ad', size: 110, font: SANS }, 640, 300), local(wb, 0, 0, wb.y + 3.2), wb.yaw, 6.4, 3);
    // the clock on a mast, hands spinning, and the banner under it
    const cp = { ...p, ...xz(local(p, 0, -9, 0)) }; cp.y = sc.y(cp.x, cp.z);
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
    const p = sc.beside(13.05, 1, 30), hq = P.campusBlock(2, { w: 36, d: 18, floors: 4, accent: 0x1f6bff });
    sc.place(hq, p.x, p.z, { yaw: p.yaw, y: p.y - 0.4 }); bake.add(hq);
    const roof = p.y - 0.4 + 4 * 3.4 + 0.6, mast = S.post(4, 0.5); sc.place(mast, p.x, p.z, { y: roof }); bake.add(mast);
    const ia = track.indexAtCp(12.1), fyaw = facing(p, track.px[ia], track.pz[ia]);   // it faces the karts coming out of the chicane
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
    const sp = { x: 92, z: 46 }; sp.y = sc.y(sp.x, sp.z); sp.yaw = facing(sp, 30, -6);
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
    for (let k = 0; k < 9; k++) { const [x, , z] = local(sp, -9 + k * 2.25, 3.4, 0); coneSpots.push({ x, z, y: sc.y(x, z), yaw: rng.range(-0.4, 0.4) }); }
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
    const tp = sc.beside(4.0, 1, 34);
    const tw = S.hooverTower({}); sc.place(tw, tp.x, tp.z, { yaw: tp.yaw }); bake.add(tw);
    const sp = sc.beside(4.0, 1, 21);
    legs(sp, 15, 8);
    atlas.place(board('HOOVER TOWER', { bg: '#d9c096', fg: '#7a2d1e', kicker: 'THE FARM · PARKING $47', kfg: '#1a1d29', size: 118 }, 768, 300), local(sp, 0, 0, sp.y + 10.5), sp.yaw, 16, 6);
    taken.push([tp.x, tp.z, 15], [sp.x, sp.z, 10]);
  }

  // ---- the landmarks: the garage where it all started, outside the chicane ----
  {
    const p = sc.beside(11.55, 1, 25);
    const gr = S.garage(); sc.place(gr, p.x, p.z, { yaw: p.yaw }); bake.add(gr);
    atlas.place(board('IT STARTED IN A GARAGE', { bg: '#ffffff', fg: '#1a1d29', kicker: 'NOW VALUED AT $3B', kfg: '#e23b3b', size: 110 }, 1024, 200), local(p, 0, 3.62, p.y + 3.6), p.yaw, 9.6, 1.9);
    taken.push([p.x, p.z, 12]);
  }

  // ---- extras: the rocket's schedule, and the Ring's rooftop ----
  {
    const p = { x: ROCKET.x - 26, z: ROCKET.z - 14 }; p.y = sc.y(p.x, p.z); p.yaw = facing(p, 196, 100);
    legs(p, 18, 9);
    const r = sign('mars', 768, 300, (g, w, h) => {
      g.fillStyle = '#1a1d29'; g.fillRect(0, 0, w, h);
      fitText(g, 'NEXT STOP: MARS', w / 2, h * 0.3, w * 0.9, 120, FONT, '#ff6a3c', { lines: 1 });
      ['2018', '2020', '2022', '2024'].forEach((y, k) => { const x = w * (0.14 + k * 0.2); const s = fitText(g, y, x, h * 0.72, w * 0.17, 80, SANS, '#ffffff', { lines: 1 }); strike(g, x - w * 0.08, x + w * 0.08, h * 0.72, s); });
      fitText(g, '2026?', w * 0.91, h * 0.72, w * 0.16, 70, SANS, '#ffd23c', { lines: 1 });
    });
    atlas.place(r, local(p, 0, 0, p.y + 9.5), p.yaw, 18, 7);
    const q = { x: RING.x, z: RING.z - RING.r + RING.band / 2, yaw: Math.PI, y: 2.1 + 13 };
    legs(q, 30, 3.4, 0xdfe3ea);
    atlas.place(board('DONGLE SOLD SEPARATELY', { bg: '#ffffff', fg: '#1a1d29', size: 130, font: SANS, lines: 1 }, 1024, 200), local(q, 0, 0, q.y + 5.6), q.yaw, 30, 5.9);
  }
}
const xz = a => ({ x: a[0], z: a[2] });
const xzArgs = a => [a[0], a[2]];
