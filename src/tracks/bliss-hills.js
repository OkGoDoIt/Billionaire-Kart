/* Bliss Hills: the second, friendly track of the first cup. The world's most
   famous default wallpaper as a real place: a roller-coaster of green hills,
   three air-time crests on the way down, a banked bowl, and a meadow you can
   cut with a boost. */
import { fbm, smoothstep } from '../core/util.js';

import { Scenery, partsOf } from '../render/scenery.js';
import * as P from '../models/props.js';
import * as B from '../models/props-bliss-hills.js';
import { bannerTexture } from '../render/textures.js';

const LAKE = { x: -62, z: 42, r: 34 };
const MEADOW = { x: -20, z: 136, r: 40 };
const SWALE = { z: 136, x0: -95, x1: 12, depth: 2.4 };
const FARM = { x: 40, z: -78, r: 34, y: 4 };
const RIDGE = { z: 345, x0: -190, x1: 170 };   // wind turbines along the skyline south of the hill

export default {
  id: 'bliss-hills',
  name: 'Bliss Hills',
  tagline: 'Have you tried turning it off and on again?',
  laps: 3,
  width: 18,
  sky: 'day',
  skyOverrides: { cloudCover: 0.56 },
  backdrop: { img: 'assets/backdrops/bliss-hills.webp', top: 27, bottom: -9, rot: 0.3 },
  offroad: 'grass',
  defaults: { edge: 'open', shoulder: 3.5, outer: 13 },
  path: [
    { p: [-10, 1.5, 0] },              // 0 start/finish, heading +x
    { p: [68, 1.5, 0] },               // 1
    { p: [100, 2.5, 13], w: 19 },      // 2 turn one: right, starting the climb
    { p: [113, 5, 44] },               // 3
    { p: [116, 10, 100] },             // 4 the climb
    { p: [114, 15.5, 158] },           // 5
    { p: [108, 20.5, 210], w: 19 },    // 6 hilltop corner, right
    { p: [94, 24, 240], w: 19 },       // 7
    { p: [70, 25.5, 252] },            // 8 top of the hill
    { p: [46, 25.4, 256] },            // 9 lip of crest one
    { p: [32, 22.4, 258] },            // 10
    { p: [2, 21.0, 259] },             // 11
    { p: [-12, 20.9, 259] },           // 12 lip of crest two
    { p: [-27, 18.0, 259] },           // 13
    { p: [-55, 16.8, 258] },           // 14
    { p: [-69, 16.6, 257] },           // 15 lip of crest three
    { p: [-84, 13.7, 255] },           // 16
    { p: [-110, 11.8, 250] },          // 17 into the bowl
    { p: [-142, 10.8, 237], w: 19, bank: 6 },  // 18 the bowl: wide banked 180, right
    { p: [-152, 10.3, 212], w: 19, bank: 8 },  // 19
    { p: [-142, 10, 187], w: 19, bank: 6 },    // 20
    { p: [-110, 9.5, 175] },           // 21 back east, across the valley from the hill
    { p: [-60, 9, 176] },              // 22 ramp
    { p: [-12, 8.5, 176] },            // 23
    { p: [26, 8, 166], w: 19 },        // 24 left hairpin
    { p: [44, 7.5, 136], w: 19 },      // 25
    { p: [26, 7, 106], w: 19 },        // 26
    { p: [-6, 6.5, 96] },              // 27 west along the meadow
    { p: [-34, 5.5, 92] },             // 28 S-bend by the lake
    { p: [-58, 4, 70] },               // 29
    { p: [-88, 3, 70] },               // 30
    { p: [-114, 2.5, 84] },            // 31 last corner, right
    { p: [-150, 2, 72], w: 19 },       // 32
    { p: [-156, 1.5, 30], w: 19 },     // 33
    { p: [-118, 1.5, 2] },             // 34
    { p: [-70, 1.5, 0] },              // 35 onto the straight
  ],
  sides: [
    { from: 34.4, to: 1.5, side: 'L', edge: 'wall' },              // pit wall along the grandstand side
    // the meadow between the two legs: cut it with a boost (the hairpin's inside is capped by its radius)
    { from: 21.2, to: 21.6, side: 'L', outer: 22, shoulder: 5, hoarding: false },
    { from: 21.6, to: 27.4, side: 'L', outer: 44, shoulder: 5, hoarding: false },   // the meadow: open ground between the two legs
    { from: 27.4, to: 27.8, side: 'L', outer: 22, shoulder: 5, hoarding: false },
    { from: 17.6, to: 20.4, side: 'L', outer: 16 },                 // room to run wide in the bowl
  ],
  ramps: [
    { at: 21.6, len: 9, lift: 2.1, lat: -4.5, w: 7 },             // the choice: right-hand ramp onto a boost
  ],
  boosts: [
    { at: 8.35, lat: 0, w: 5 },                                    // one before each crest
    { at: 11.1, lat: 0, w: 5 },
    { at: 14.2, lat: 0, w: 5 },
    { at: 22.15, lat: -4.5, w: 5 },                                // ramp landing
  ],
  itemRows: [{ at: 1.6 }, { at: 7.4 }, { at: 23.0 }, { at: 27.3, n: 3 }],
  coins: [
    { from: 0.25, to: 0.6, n: 4, lat: -3 },
    { from: 3.6, to: 4.6, n: 4, lat: [5, -5] },
    { from: 9.15, to: 9.75, n: 3, lat: 0, air: 2.0 },              // a line floating over each crest
    { from: 12.15, to: 12.75, n: 3, lat: 0, air: 2.0 },
    { from: 15.15, to: 15.75, n: 3, lat: 0, air: 2.0 },
    { from: 18.2, to: 19.8, n: 5, lat: [-5, -6] },
    { from: 21.75, to: 22.0, n: 2, lat: -4.5, air: 3 },
    { from: 28.2, to: 30.2, n: 5, lat: [-4, 4] },
    { from: 32.2, to: 33.6, n: 4, lat: -4 },
  ],
  obstacles: [
    // error dialogs drifting across the road
    { kind: 'patrol', model: 'dialog', at: 4.3, lats: [1.5, 6.5], speed: 4, effect: 'spin', radius: 1.7 },
    { kind: 'patrol', model: 'dialog', at: 22.7, lats: [-1.5, -6.5], speed: 4.5, effect: 'spin', radius: 1.7 },
    { kind: 'patrol', model: 'dialog', at: 27.0, lats: [1.5, 6.5], speed: 5, effect: 'spin', radius: 1.7 },
    // hay bales scattered over the meadow shortcut
    { kind: 'static', model: 'bale', at: 22.2, lat: 18, effect: 'bump', radius: 1.6 },
    { kind: 'static', model: 'bale', at: 22.75, lat: 25, effect: 'bump', radius: 1.6 },
    { kind: 'static', model: 'bale', at: 23.1, lat: 21, effect: 'bump', radius: 1.6 },
    { kind: 'static', model: 'bale', at: 26.3, lat: 24, effect: 'bump', radius: 1.6 },
    { kind: 'static', model: 'bale', at: 26.75, lat: 15, effect: 'bump', radius: 1.6 },
  ],
  terrain: {
    cell: 3, margin: 160, blend: 22, water: -1.4,
    fn(x, z) {
      // big, round, impossibly green hills; a gentle bowl around the lake
      let h = (fbm(x * 0.0055, z * 0.0055, 3, 11) - 0.4) * 34;
      h += (fbm(x * 0.016, z * 0.016, 2, 23) - 0.5) * 4;
      h += smoothstep(260, 460, Math.hypot(x, z - 130)) * 30;
      h = Math.max(h, 1.6 + (fbm(x * 0.03, z * 0.03, 2, 5) - 0.5) * 1.2);   // above the water table everywhere...
      const ld = Math.hypot((x - LAKE.x) / 1.35, z - LAKE.z);
      const lake = 1 - smoothstep(LAKE.r * 0.35, LAKE.r, ld);
      h = h * (1 - lake) + -5 * lake;                                         // ...except the lake
      // the meadow between the two eastbound and westbound legs: flat, at road level
      const md = Math.hypot((x - MEADOW.x) / 1.6, z - MEADOW.z);
      const mk = 1 - smoothstep(MEADOW.r * 0.6, MEADOW.r * 1.2, md);
      h = h * (1 - mk) + (6.9 + (z - 96) / 80 * 1.9) * mk;
      // a shallow grassy swale down the middle of the meadow
      h -= SWALE.depth * (1 - smoothstep(4, 13, Math.abs(z - SWALE.z))) * smoothstep(SWALE.x0 - 18, SWALE.x0, x) * (1 - smoothstep(SWALE.x1, SWALE.x1 + 12, x));
      // a long grassy ridge for the wind turbines, and a flat yard for the farm
      h += 26 * Math.exp(-(((z - RIDGE.z) / 48) ** 2)) * smoothstep(RIDGE.x0 - 120, RIDGE.x0, x) * (1 - smoothstep(RIDGE.x1, RIDGE.x1 + 120, x));
      const fk = 1 - smoothstep(FARM.r * 0.7, FARM.r * 1.4, Math.hypot(x - FARM.x, z - FARM.z));
      h = h * (1 - fk) + FARM.y * fk;
      return h;
    },
  },
  look: {
    road: { base: 0x5d6373, line: 0xffffff, center: 0xffd23c },
    kerb: [0xe23b3b, 0xf7f7f2],
    shoulder: 0xd9c78f,
    terrain: { low: 0x4fb83a, high: 0x7ed957, dry: 0xa8e06a, rock: 0x9c9388, sand: 0xe9d7a2, dirt: 0xbf9f6e },
    water: 0x2f9be6,
    ads: ['HAVE YOU TRIED REBOOTING', 'NOT RESPONDING', '640K IS ENOUGH', 'DEFRAG TODAY', 'PRESS ANY KEY', 'ABORT RETRY FAIL', 'INSERT DISK 2', 'DIAL-UP SPEEDS', 'CTRL ALT DELIGHT', 'SAFE MODE', 'SCREENSAVER INC', 'PLUG AND PRAY'],
  },
  LAKE,
  models: { dialog: () => B.errorDialog(), bale: () => B.hayBale() },

  /** Dress the course. ctx: { THREE, track, group, gfx, anim, view } */
  decorate(ctx) {
    const { THREE, track, anim, view } = ctx, sc = new Scenery(ctx), rng = sc.rng;
    const inMeadow = (x, z) => Math.hypot((x - MEADOW.x) / 1.6, z - MEADOW.z) < MEADOW.r * 1.15;
    const nearLake = (x, z) => Math.hypot((x - LAKE.x) / 1.35, z - LAKE.z) < LAKE.r * 1.05;
    const nearFarm = (x, z) => Math.hypot(x - FARM.x, z - FARM.z) < FARM.r * 1.1;
    const onRidge = (x, z) => Math.abs(z - RIDGE.z) < 22 && x > RIDGE.x0 - 20 && x < RIDGE.x1 + 20;
    const taken = [];                                                   // footprints of landmarks: [x, z, r]
    const free = (x, z) => !taken.some(([tx, tz, r]) => (tx - x) ** 2 + (tz - z) ** 2 < r * r);

    // start/finish gantry and grandstands along the main straight
    const g0 = sc.beside(0, 1, -track.hwL[0]);
    const gantry = P.gantry(track.hwL[0] + track.hwR[0] + 1.5, 'BLISS HILLS', { color: 0x2f6bff, color2: 0xffd23c });
    sc.place(gantry, g0.x, g0.z, { yaw: g0.along, y: g0.roadY });
    view.startLights = gantry.userData.lights;
    const stand = P.grandstand({ w: 30, rows: 6, color: 0x2f6bff }), stand2 = P.grandstand({ w: 30, rows: 6, color: 0x2fae4a });
    const seats = [];
    const M = new THREE.Matrix4(), V = new THREE.Vector3();
    const putStand = (proto, p) => {
      const g = proto.group.clone(); sc.place(g, p.x, p.z, { yaw: p.yaw, y: p.y });
      g.updateMatrixWorld(true); M.copy(g.matrixWorld);
      for (const s of proto.seats) if (rng() < 0.82) { V.set(s[0], s[1], s[2]).applyMatrix4(M); seats.push({ x: V.x, y: V.y, z: V.z, yaw: p.yaw + rng.range(-0.4, 0.4) }); }
      taken.push([p.x, p.z, 22]);
    };
    sc.along({ from: 34.9, to: 0.9, side: 1, offset: 6.5, spacing: 34 }).forEach((p, i) => putStand(i % 2 ? stand2 : stand, p));
    sc.along({ from: 35.3, to: 0.5, side: -1, offset: 18, spacing: 36, phase: 14 }).forEach((p, i) => putStand(i % 2 ? stand : stand2, p));
    sc.instances(partsOf(P.spectator()), seats, { scale: [0.95, 1.2], tints: P.CROWD_TINTS, cast: false });

    // the paperclip arch over the top of the hill, at the start of the Rolling Hills
    {
      const i = track.indexAtCp(8.05), p = sc.beside(8.05, 1, -track.hwL[i]);
      sc.place(B.paperclipArch({ span: track.hwL[i] + track.hwR[i] + 12, h: 12 }), p.x, p.z, { yaw: p.along, y: p.roadY - 0.2 });
    }

    // wind turbines along the southern ridge, turning slowly
    const rotors = [];
    for (let k = 0; k < 8; k++) {
      const x = RIDGE.x0 + (k + 0.5) * ((RIDGE.x1 - RIDGE.x0) / 8) + rng.range(-8, 8), z = RIDGE.z + rng.range(-8, 8);
      const t = B.windTurbine({ h: 32 + rng.range(-3, 4) });
      sc.place(t, x, z, { yaw: Math.PI + rng.range(-0.25, 0.25), y: sc.y(x, z) - 0.3 });
      t.userData.rotor.rotation.z = rng() * 6.28; rotors.push([t.userData.rotor, 0.55 + rng() * 0.3]);
      taken.push([x, z, 10]);
    }
    anim.push(dt => { for (const [r, w] of rotors) r.rotation.z += dt * w; });

    // the farm: red-roofed house and barn on a flat yard beyond the pit straight
    const fh = B.farmhouse(), bn = B.barn();
    sc.place(fh, FARM.x - 14, FARM.z + 4, { yaw: 0.3, y: FARM.y - 0.1 });
    sc.place(bn, FARM.x + 14, FARM.z - 6, { yaw: -0.2 + Math.PI * 0.08, y: FARM.y - 0.1 });
    taken.push([FARM.x, FARM.z, FARM.r]);
    // a second, smaller homestead on the far side of the lake
    const fh2 = B.farmhouse(); fh2.scale.setScalar(0.85);
    {
      const x = -150, z = 150; sc.place(fh2, x, z, { yaw: 1.2, scale: 0.85, y: sc.y(x, z) - 0.2 }); taken.push([x, z, 16]);
    }

    // oversized beige computers as roadside boulders, in clusters
    const mons = [], towers = [];
    for (const [at, side, off] of [[2.4, 1, 24], [6.7, 1, 22], [19.1, 1, 30], [24.9, -1, 21], [29.4, -1, 20], [32.7, 1, 24], [12.2, -1, 22]]) {
      const p = sc.beside(at, side, off), i = track.indexAtCp(at);
      const tx = track.tx[i], tz = track.tz[i];
      mons.push({ x: p.x, z: p.z, y: sc.y(p.x, p.z), yaw: p.yaw + rng.range(-0.35, 0.35) });
      for (const d of [-5.5, 5.8]) { if (rng() < 0.25) continue; const x = p.x + tx * d + rng.range(-1.5, 1.5), z = p.z + tz * d + rng.range(-1.5, 1.5); towers.push({ x, z, y: sc.y(x, z), yaw: p.yaw + rng.range(-0.6, 0.6) }); }
      taken.push([p.x, p.z, 12]);
    }
    sc.instances(partsOf(B.crtMonitor({ h: 4.2 })), mons, { scale: [0.95, 1.25], sink: 0.1 });
    sc.instances(partsOf(B.desktopTower({ h: 4 })), towers, { scale: [0.9, 1.15], sink: 0.1, tilt: 0.06 });

    // white picket fences along the straights
    const fence = partsOf(B.picketFence(6));
    const fspots = [
      ...sc.along({ from: 3.2, to: 5.7, side: 1, offset: 15.5, spacing: 6 }), ...sc.along({ from: 3.2, to: 5.7, side: -1, offset: 15.5, spacing: 6 }),
      ...sc.along({ from: 21.2, to: 23.1, side: -1, offset: 15.5, spacing: 6 }), ...sc.along({ from: 26.1, to: 27.9, side: -1, offset: 15.5, spacing: 6 }),
      ...sc.along({ from: 0.6, to: 1.6, side: -1, offset: 15.5, spacing: 6 }), ...sc.along({ from: 9.8, to: 15.0, side: -1, offset: 15.5, spacing: 6 }),
    ].filter(p => free(p.x, p.z));
    sc.instances(fence, fspots, { sink: 0.05 });

    // sheep grazing in loose flocks on the hills, away from the road
    const flockCentres = sc.scatter({ count: 14, min: 34, max: 170, maxSlope: 0.4, minGap: 45, where: (x, z) => !inMeadow(x, z) && !nearLake(x, z) && free(x, z) });
    const sheepSpots = [];
    for (const c of flockCentres) {
      const n = 4 + Math.floor(rng() * 5);
      for (let k = 0; k < n; k++) {
        const x = c.x + rng.range(-12, 12), z = c.z + rng.range(-12, 12);
        if (track.roadDistance(x, z) < 22 || !free(x, z) || nearLake(x, z)) continue;
        const h = track.terrainHeight(x, z); if (h < track.water + 0.4) continue;
        sheepSpots.push({ x, y: h, z, yaw: rng() * 6.28 });
      }
    }
    sc.instances(partsOf(B.sheep(1)), sheepSpots.filter((_, i) => i % 2 === 0), { scale: [1.2, 1.55], yaw: 'random', tilt: 0.05 });
    sc.instances(partsOf(B.sheep(4)), sheepSpots.filter((_, i) => i % 2 === 1), { scale: [1.2, 1.55], yaw: 'random', tilt: 0.05 });

    // trees in small round clumps: lighter, sunnier greens than Silicon Valley
    const clear = (x, z) => free(x, z) && !inMeadow(x, z) && !nearLake(x, z) && !onRidge(x, z);
    const clumps = sc.scatter({ count: 26, min: 18, max: 210, maxSlope: 0.55, minGap: 30, where: clear });
    const treeSpots = [];
    for (const c of clumps) { const n = 2 + Math.floor(rng() * 5); for (let k = 0; k < n; k++) { const x = c.x + rng.range(-9, 9), z = c.z + rng.range(-9, 9); if (track.roadDistance(x, z) > 17 && clear(x, z)) treeSpots.push({ x, y: track.terrainHeight(x, z), z, yaw: 0 }); } }
    for (const [cx, cz] of [[-90, 146], [-98, 136], [-30, 118], [-40, 124]]) for (let k = 0; k < 4; k++) treeSpots.push({ x: cx + rng.range(-5, 5), z: cz + rng.range(-5, 5), y: 0, yaw: 0 });
    treeSpots.forEach(t => { t.y = track.terrainHeight(t.x, t.z); });
    treeSpots.push(...sc.scatter({ count: 42, min: 40, max: 230, maxSlope: 0.55, minGap: 12, where: clear }));
    const oakA = partsOf(P.roundTree(1, { h: 8, leafA: 0x6fcf4a, leafB: 0x92de5c })), oakB = partsOf(P.roundTree(2, { h: 9.5, leafA: 0x5cc243, leafB: 0x7fd456 })), oakC = partsOf(P.roundTree(3, { h: 6.5, leafA: 0x86d957, leafB: 0xa6e46a }));
    sc.instances(oakA, treeSpots.filter((_, i) => i % 3 === 0), { scale: [0.85, 1.45], yaw: 'random', tilt: 0.04 });
    sc.instances(oakB, treeSpots.filter((_, i) => i % 3 === 1), { scale: [0.85, 1.5], yaw: 'random', tilt: 0.04 });
    sc.instances(oakC, treeSpots.filter((_, i) => i % 3 === 2), { scale: [0.85, 1.35], yaw: 'random', tilt: 0.04 });

    // flowering bushes everywhere close to the road, and wildflowers in the meadow
    const low = sc.scatter({ count: 250, min: 14.5, max: 60, maxSlope: 0.7, minGap: 2.6, where: (x, z) => free(x, z) && !nearLake(x, z) && !inMeadow(x, z) });
    sc.instances(partsOf(P.bush(1, { color: 0x5fc24a, flower: 0xffe04a })), low.filter((_, i) => i % 4 === 0), { scale: [0.8, 1.6], yaw: 'random' });
    sc.instances(partsOf(P.bush(2, { color: 0x72cf52, flower: 0xffffff })), low.filter((_, i) => i % 4 === 1), { scale: [0.8, 1.5], yaw: 'random' });
    sc.instances(partsOf(P.bush(3, { color: 0x58b948, flower: 0xff8ac4 })), low.filter((_, i) => i % 4 === 2), { scale: [0.8, 1.5], yaw: 'random' });
    sc.instances(partsOf(P.bush(5, { color: 0x6ac94e, flower: 0xffe04a })), low.filter((_, i) => i % 4 === 3), { scale: [0.7, 1.3], yaw: 'random' });
    const meadowFlowers = sc.scatter({ count: 50, min: 8, max: 40, maxSlope: 0.5, minGap: 4, where: (x, z) => inMeadow(x, z) });
    sc.instances(partsOf(P.bush(7, { color: 0x7fd456, flower: 0xffffff })), meadowFlowers, { scale: [0.4, 0.7], yaw: 'random', cast: false });
    // reeds and rocks round the lake
    const shore = sc.scatter({ count: 40, min: 12, max: 90, maxSlope: 0.9, minGap: 3, where: (x, z, h) => h > track.water + 0.2 && h < track.water + 1.6 });
    sc.instances(partsOf(P.rock(2, { r: 1.1 })), shore.filter((_, i) => i % 3 === 0), { scale: [0.6, 1.6], yaw: 'random', sink: 0.2, tints: [0xb8b0a4, 0xa39c92, 0xc7bfb2] });
    sc.instances(partsOf(P.bush(6, { color: 0x4fa83e })), shore.filter((_, i) => i % 3 !== 0), { scale: [0.7, 1.2], yaw: 'random' });

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
    const ads = ['HAVE YOU TRIED REBOOTING', 'PRESS ANY KEY', 'CTRL ALT DELIGHT', '640K IS ENOUGH', 'DEFRAG TODAY', 'INSERT DISK 2', 'SCREENSAVER INC'];
    [[1.3, 1, 30], [4.9, -1, 24], [10.4, 1, 22], [16.5, -1, 22], [21.0, -1, 26], [29.9, 1, 24], [33.6, -1, 22]].forEach(([at, side, off], i) => {
      const p = sc.beside(at, side, off), tex = bannerTexture([ads[i]], i + 3);
      tex.repeat.set(0.25, 1);
      sc.place(P.billboard(tex, { w: 15, h: 5, legs: 6 }), p.x, p.z, { yaw: p.yaw + rng.range(-0.15, 0.15) });
    });

    // hot-air balloons drifting over the hills
    const cols = [[0xff4d6d, 0xffd23c], [0x38b6ff, 0xffffff], [0x2ee6a6, 0xffd23c], [0x9b6bff, 0xff7eb6], [0xff8a3c, 0xffffff]];
    const balloons = cols.map((c, i) => { const b = P.balloon(c); const a = (i / cols.length) * Math.PI * 2 + 0.9, r = 210 + (i % 2) * 80; b.position.set(-10 + Math.cos(a) * r, 60 + i * 8, 130 + Math.sin(a) * r); b.scale.setScalar(1.4 + (i % 3) * 0.3); ctx.group.add(b); return b; });
    anim.push((dt, time) => { balloons.forEach((b, i) => { b.position.y += Math.sin(time * 0.4 + i * 1.7) * dt * 0.8; b.position.x += Math.sin(time * 0.05 + i) * dt * 0.6; b.rotation.y += dt * 0.05; }); });
  },
};
