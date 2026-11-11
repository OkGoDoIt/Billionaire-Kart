/* Silicon Valley Circuit: the opener. A sunny campus loop with a hill climb,
   a crest jump, and a fast run home past the grandstands. */
import { fbm, smoothstep } from '../core/util.js';

import { Scenery, partsOf } from '../render/scenery.js';
import * as P from '../models/props.js';
import { bannerTexture } from '../render/textures.js';

const POND = { x: -40, z: 102, r: 46 };
const RING = { x: -40, z: 102, r: 72, band: 15 };
const ROCKET = { x: 286, z: 96 };

export default {
  id: 'silicon-valley',
  name: 'Silicon Valley Circuit',
  tagline: 'Move fast. Brake nothing.',
  laps: 3,
  width: 17,
  sky: 'day',
  backdrop: { img: 'assets/backdrops/silicon-valley.webp', top: 27, bottom: -9, rot: 0.14 },
  offroad: 'grass',
  defaults: { edge: 'open', shoulder: 3.5, outer: 11 },
  path: [
    { p: [0, 0, 0] },            // 0 start/finish, heading +x
    { p: [95, 0, 0] },           // 1
    { p: [172, 1.5, 28], w: 19 },// 2 turn one, wide and banked
    { p: [196, 5, 104] },        // 3 climbing
    { p: [158, 10, 168] },       // 4
    { p: [84, 13.5, 150], w: 15 },// 5 esses at the top
    { p: [22, 15.5, 196], w: 15 },// 6
    { p: [-62, 15, 214] },       // 7 crest
    { p: [-142, 8.5, 176], w: 19 },// 8 downhill sweeper
    { p: [-192, 3, 104] },       // 9
    { p: [-168, 0.5, 36], w: 15 },// 10 chicane in
    { p: [-196, 0, -22], w: 15 },// 11 chicane out
    { p: [-140, 0, -52], w: 18 },// 12 final corner
    { p: [-70, 0, -8] },         // 13 back onto the straight
  ],
  sides: [
    { from: 12.3, to: 1.6, side: 'L', edge: 'wall' },   // pit wall along the grandstand side
    { from: 6.6, to: 7.9, edge: 'wall' },                // crest and jump are fenced in
    { from: 2.2, to: 3.6, side: 'R', outer: 26, shoulder: 6 }, // open meadow on the outside of the climb
    { from: 8.2, to: 9.6, side: 'L', outer: 30, shoulder: 5 }, // cut across the grass on the way down (needs a boost)
  ],
  ramps: [
    { at: 7.25, len: 9, lift: 2.1 },
  ],
  boosts: [
    { at: 0.55, lat: 0, w: 5 },
    { at: 3.2, lat: -4, w: 4.5 },
    { at: 8.9, lat: 3.5, w: 4.5 },
    { at: 12.9, lat: 0, w: 5 },
  ],
  itemRows: [{ at: 1.5 }, { at: 4.6 }, { at: 8.4 }, { at: 11.5, n: 3 }],
  coins: [
    { from: 0.2, to: 0.5, n: 4, lat: 4.5 }, { from: 2.4, to: 2.9, n: 5, lat: [6, -5] },
    { from: 5.2, to: 5.9, n: 5, lat: [-4, 4] }, { from: 7.34, to: 7.5, n: 3, lat: 0, air: 2.6 },
    { from: 9.3, to: 9.8, n: 4, lat: -5 }, { from: 12.1, to: 12.6, n: 5, lat: [-5, 2] },
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

    // start/finish gantry and grandstands along the main straight
    const g0 = sc.beside(0, 1, -track.hwL[0]);                         // centre of the road at the line
    const gantry = P.gantry(track.hwL[0] + track.hwR[0] + 1.5, 'SILICON VALLEY CIRCUIT');
    sc.place(gantry, g0.x, g0.z, { yaw: g0.along, y: g0.roadY });
    view.startLights = gantry.userData.lights;
    const stand = P.grandstand({ w: 30, rows: 6, color: 0x2f6bff }), stand2 = P.grandstand({ w: 30, rows: 6, color: 0xe23b3b });
    const seats = [];
    const M = new THREE.Matrix4(), V = new THREE.Vector3();
    const putStand = (proto, p) => {
      const g = proto.group.clone(); sc.place(g, p.x, p.z, { yaw: p.yaw, y: p.y });
      g.updateMatrixWorld(true); M.copy(g.matrixWorld);
      for (const s of proto.seats) if (rng() < 0.82) { V.set(s[0], s[1], s[2]).applyMatrix4(M); seats.push({ x: V.x, y: V.y, z: V.z, yaw: p.yaw + rng.range(-0.4, 0.4) }); }
    };
    sc.along({ from: 12.75, to: 1.3, side: 1, offset: 6.5, spacing: 34 }).forEach((p, i) => putStand(i % 2 ? stand2 : stand, p));
    sc.along({ from: 13.3, to: 0.9, side: -1, offset: 17, spacing: 34, phase: 12 }).forEach((p, i) => putStand(i % 2 ? stand : stand2, p));
    sc.instances(partsOf(P.spectator()), seats, { scale: [0.95, 1.2], tints: P.CROWD_TINTS, cast: false });

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
    const blocks = sc.scatter({ count: 16, min: 34, max: 120, maxSlope: 0.22, minGap: 46, where: (x, z) => Math.hypot(x - RING.x, z - RING.z) > RING.r + 20 && Math.hypot(x - ROCKET.x, z - ROCKET.z) > 40 });
    const accents = [0x38b6ff, 0xff4d6d, 0xffd23c, 0x2ee6a6, 0x9b6bff, 0xff8a3c];
    blocks.forEach((p, i) => sc.place(P.campusBlock(i, { w: rng.range(18, 30), d: rng.range(12, 18), floors: 2 + (i % 3), accent: accents[i % accents.length] }), p.x, p.z, { yaw: Math.round(p.yaw / (Math.PI / 4)) * (Math.PI / 4), y: p.y - 0.4 }));
    const clearOfBuildings = (x, z) => !blocks.some(b => (b.x - x) ** 2 + (b.z - z) ** 2 < 20 * 20) && Math.abs(Math.hypot(x - RING.x, z - RING.z) - RING.r + RING.band / 2) > RING.band && Math.hypot(x - ROCKET.x, z - ROCKET.z) > 22;

    // trees: oaks over the hills, cypress avenues, palms on the fast corners
    const oakSpots = sc.scatter({ count: 300, min: 15, max: 190, maxSlope: 0.6, minGap: 5, where: clearOfBuildings });
    const oakA = partsOf(P.roundTree(1, { h: 7.5 })), oakB = partsOf(P.roundTree(2, { h: 9, leafA: 0x3f9e3a, leafB: 0x5dbb45 })), oakC = partsOf(P.roundTree(3, { h: 6, leafA: 0x6fc94a, leafB: 0x9ad65a }));
    sc.instances(oakA, oakSpots.filter((_, i) => i % 3 === 0), { scale: [0.8, 1.5], yaw: 'random', tilt: 0.04 });
    sc.instances(oakB, oakSpots.filter((_, i) => i % 3 === 1), { scale: [0.8, 1.6], yaw: 'random', tilt: 0.04 });
    sc.instances(oakC, oakSpots.filter((_, i) => i % 3 === 2), { scale: [0.8, 1.4], yaw: 'random', tilt: 0.04 });
    const cyp = partsOf(P.cypress(1, { h: 12 }));
    sc.instances(cyp, [...sc.along({ from: 8.2, to: 9.9, side: -1, offset: 14.5, spacing: 9 }), ...sc.along({ from: 4.1, to: 6.4, side: 1, offset: 14.5, spacing: 9 }), ...sc.along({ from: 4.1, to: 6.4, side: -1, offset: 14.5, spacing: 9 })], { scale: [0.85, 1.2] });
    const palmA = partsOf(P.palm(1, { h: 10 })), palmB = partsOf(P.palm(5, { h: 8.5 }));
    const palmSpots = [...sc.along({ from: 1.35, to: 3.9, side: -1, offset: 14, spacing: 12 }), ...sc.along({ from: 1.6, to: 2.1, side: 1, offset: 14, spacing: 12 }), ...sc.along({ from: 10.0, to: 12.6, side: 1, offset: 14, spacing: 11 }), ...sc.along({ from: 10.0, to: 12.2, side: -1, offset: 14, spacing: 11 })];
    sc.instances(palmA, palmSpots.filter((_, i) => i % 2 === 0), { scale: [0.9, 1.25], yaw: 'random' });
    sc.instances(palmB, palmSpots.filter((_, i) => i % 2 === 1), { scale: [0.9, 1.25], yaw: 'random' });
    // shrubs and rocks close to the action
    const low = sc.scatter({ count: 240, min: 12.5, max: 46, maxSlope: 0.7, minGap: 2.5, where: clearOfBuildings });
    sc.instances(partsOf(P.bush(1, { color: 0x58b548 })), low.filter((_, i) => i % 3 === 0), { scale: [0.8, 1.7], yaw: 'random' });
    sc.instances(partsOf(P.bush(2, { color: 0x79c94f, flower: 0xffd23c })), low.filter((_, i) => i % 3 === 1), { scale: [0.8, 1.5], yaw: 'random' });
    sc.instances(partsOf(P.bush(3, { color: 0x4aa544, flower: 0xff7eb6 })), low.filter((_, i) => i % 6 === 2), { scale: [0.8, 1.5], yaw: 'random' });
    sc.instances(partsOf(P.rock(1, { r: 1.3 })), low.filter((_, i) => i % 6 === 5), { scale: [0.6, 2], yaw: 'random', sink: 0.2, tints: [0xa8a096, 0x8f8880, 0xb7ada0] });

    // arrow boards on the outside of every real corner
    for (const c of track.corners) {
      const side = c.dir > 0 ? -1 : 1, n = Math.max(2, Math.min(5, Math.round(c.len / 15)));
      for (let k = 0; k < n; k++) {
        const i = (c.i0 + Math.round(((k + 0.6) / n) * (c.len / track.ds))) % track.N;
        const p = sc.beside(track.cp[i], side, (side > 0 ? track.outerL[i] : track.outerR[i]) + 1.2);
        const b = P.chevronBoard(); if (c.dir > 0) b.scale.x = -1;
        sc.place(b, p.x, p.z, { yaw: p.yaw, lift: 0.9 }); if (c.dir > 0) b.scale.x = -1;
      }
    }

    // big billboards where you are looking anyway
    const ads = ['AGI\u2122 SOON', 'GPU GO BRRR', 'PIVOT!', 'UNICORN FUEL', 'BURN RATE', 'SERIES Z'];
    [[1.75, -1, 22], [3.4, -1, 24], [6.2, 1, 20], [8.5, -1, 26], [9.9, 1, 22], [12.5, -1, 22]].forEach(([at, side, off], i) => {
      const p = sc.beside(at, side, off), tex = bannerTexture([ads[i]], i + 3);
      tex.repeat.set(0.25, 1);
      sc.place(P.billboard(tex, { w: 15, h: 5, legs: 6 }), p.x, p.z, { yaw: p.yaw + rng.range(-0.15, 0.15) });
    });

    // life in the sky
    const cols = [[0xff4d6d, 0xffd23c], [0x38b6ff, 0xffffff], [0x2ee6a6, 0xffd23c], [0x9b6bff, 0xff7eb6], [0xff8a3c, 0xffffff]];
    const balloons = cols.map((c, i) => { const b = P.balloon(c); const a = (i / cols.length) * Math.PI * 2 + 0.4, r = 230 + (i % 2) * 90; b.position.set(Math.cos(a) * r, 55 + i * 9, 90 + Math.sin(a) * r); b.scale.setScalar(1.4 + (i % 3) * 0.3); ctx.group.add(b); return b; });
    const ship = P.blimp('BUY THE DIP'); ship.scale.setScalar(1.25); ctx.group.add(ship);
    anim.push((dt, time) => {
      balloons.forEach((b, i) => { b.position.y += Math.sin(time * 0.4 + i * 1.7) * dt * 0.8; b.rotation.y += dt * 0.05; });
      const a = time * 0.035; ship.position.set(RING.x + Math.cos(a) * 150, 78 + Math.sin(time * 0.3) * 2, RING.z + Math.sin(a) * 120); ship.rotation.y = -a;
    });
    void L;
  },
};
