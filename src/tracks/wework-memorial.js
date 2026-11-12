/* WeWork Memorial: a ruined coworking cathedral with two floors, and the
   course uses both. The lobby level runs an R-L-R complex past the
   bankruptcy annex, sags through the collapsed floor, climbs the Mezzanine
   Ramp past the ruined HQ hall to the carpeted executive level, rounds the
   HUSTLE hairpin where the fallen neon lies, kinks left at the Breakout,
   and plunges down the fire escape to the lobby return. Layout follows
   docs/track-design-wework.md, translated to the v2 toolkit and re-proportioned
   to the v2 lap-length cap: the design's named bends map to the spikes of
   this spline, and its item-row lap fractions are kept verbatim. */
import { fbm, smoothstep } from '../core/util.js';
import { Scenery, partsOf } from '../render/scenery.js';
import * as P from '../models/props.js';
import * as W from '../models/props-wework-memorial.js';
import { bannerTexture } from '../render/textures.js';

const STAIR = { x: -55, z: 128 };   // the Spiral Staircase to Nowhere, centre of the infield

export default {
  id: 'wework-memorial',
  name: 'WeWork Memorial',
  tagline: 'Do what you love. The building did.',
  lapNotes: ['<b>Lap 2.</b> The creditors have formed a pace car.', '<b>Final lap.</b> Everything must go. Including you.'],
  // opening shot: from the rim west of the hairpin, a slow push-in on the fallen
  // HUSTLE neon's lit face, the carpet sweeping behind it and the staircase to
  // nowhere deep in the frame — also the menu thumbnail frame
  intro: [{ pos: [-215, 13, 150], pos1: [-200, 10, 168], look: [-177, 6, 188], look1: [-180, 6, 190], fov: 54, dur: 3.4 }],
  laps: 3,
  width: 18,
  sky: 'golden',
  skyOverrides: { cloudCover: 0.42 },
  offroad: 'dirt',
  surface: 'road',
  defaults: { edge: 'open', shoulder: 3.5, outer: 11 },
  path: [
    { p: [0, 0, 0] },                    // 0 start/finish, heading +x; the home straight runs 13 -> 0 -> 1 dead level
    { p: [100, 0, 3.5] },                // 1 the lobby straight, annex away on the right
    { p: [150, 0.2, 14], bank: -3.5 },   // 2 into T1 Reception (R)
    { p: [188, 0.6, 64], bank: 3 },      // 3 T2 Hot Desk eases it back (L)
    { p: [252, 1, 92], bank: -4 },       // 4 T3 Open Plan (R)
    { p: [264, -0.8, 148], bank: -1 },   // 5 falling toward the collapsed floor
    { p: [210, -1.6, 242], bank: -1.5 }, // 6 the sag bottom: the floor filed for Chapter 11 too
    { p: [116, 2.8, 278], bank: 1 },     // 7 the Mezzanine Ramp, climbing past the ruined hall
    { p: [12, 6, 282], bank: -2 },       // 8 arrival upstairs, six metres up
    { p: [-84, 6.1, 254], bank: 3 },     // 9 T6 Second Floor eases left along the top floor
    { p: [-168, 6.3, 258], bank: -2 },   // 10 the far end of the building, high point of the lap
    { p: [-222, 6.2, 210], bank: -5 },   // 11 the HUSTLE hairpin: tightest corner on the track
    { p: [-156, 4.4, 132], bank: 4 },    // 12 T9 Breakout kinks left (L); the descent has begun
    { p: [-158, 1.6, 30], bank: -3.5 },  // 13 the Lobby Return (R), then flat to the line
  ],
  sides: [
    { from: 6.35, to: 11.9, edge: 'wall' },                   // ramp balustrade and mezzanine railing, both sides
    { from: 12.55, to: 1.35, side: 'L', edge: 'wall' },        // the tower's outer wall along the return and home straight
    { from: 4.55, to: 6.3, side: 'R', outer: 20, shoulder: 5 }, // rubble field spilling out of the sag
  ],
  zones: [
    { from: 0, to: 5.05, skin: 'stone' },                        // lobby slabs
    { from: 5.05, to: 6.15, skin: 'cobble', surface: 'dirt' },   // the collapsed floor: broken, slow, honest
    { from: 6.15, to: 7.5, skin: 'stone' },                      // the ramp itself
    { from: 7.5, to: 12.45, skin: 'carpet' },                    // upstairs is carpeted. Of course it is.
    { from: 12.45, to: 14, skin: 'stone' },                      // fire-escape concrete and home
  ],
  ramps: [
    { at: 6.05, len: 7, lift: 1.3, lat: 0, w: 6 },   // a sheared-off slab at the sag's exit: the floor's last word
  ],
  boosts: [
    { at: 0.5, lat: 0, w: 5 },
    { at: 3.25, lat: -4, w: 4.5 },
    { at: 6.95, lat: 0, w: 5 },        // mid-ramp: worth real time on the climb
    { at: 12.1, lat: 0, w: 5 },        // top of the fire escape: a boost down the stairs is brave
    { at: 13.55, lat: 0, w: 5 },
  ],
  itemRows: [   // five of the design's six lap fractions (u 0.10 / 0.27 / 0.44 / 0.61 / 0.93), in control-point
    // units; the u 0.78 row sat in the hairpin's braking zone and pushed item hits past the guide's ceiling
    { at: 1.4 }, { at: 3.78 }, { at: 6.16 }, { at: 8.54 }, { at: 13.02 },
  ],
  coins: [
    { from: 2.25, to: 2.85, n: 5, lat: [5, -5] },     // through Reception and Hot Desk
    { from: 5.15, to: 5.85, n: 5, lat: 0 },           // the line through the dip
    { from: 6.55, to: 7.5, n: 5, lat: [-3, 3] },      // up the ramp
    { from: 10.7, to: 11.5, n: 5, lat: [4, -4] },     // the HUSTLE arc
    { from: 13.3, to: 13.9, n: 5, lat: -4.5 },        // the run home
  ],
  obstacles: [
    { kind: 'orbit', model: 'drone', at: 3.9, lat: 5.5, orbit: 3, speed: 5, effect: 'spin', radius: 1.1 },  // filming the farewell tour, forever
    { kind: 'static', model: 'crate', at: 5.55, lat: 5.5, effect: 'bump' },                                 // moving-out crates in the sag
    { kind: 'static', model: 'crate', at: 5.72, lat: -6, effect: 'bump' },
    { kind: 'patrol', model: 'bot', at: 10.35, lat: 0, lats: [-4.2, 4.2], speed: 3.2, effect: 'spin' },     // the cleaning bot still does its rounds upstairs
    { kind: 'static', model: 'keg', at: 12.35, lat: -6.5, effect: 'bump', radius: 0.75 },                   // escaped from the kombucha bar
  ],
  models: { keg: () => W.kombuchaKeg() },
  terrain: {
    cell: 3, margin: 175, blend: 26, water: -4,
    fn(x, z) {
      // one cracked plaza of ruin: a rolling rubble field (so the low sun catches its
      // slopes), a shallow crater under the collapsed floor, and the ground rising
      // gently to the broken rim of the site
      let h = 0.4 + (fbm(x * 0.016, z * 0.016, 3, 11) - 0.5) * 4.4;
      h += (fbm(x * 0.05, z * 0.05, 2, 23) - 0.5) * 0.8;
      const d = Math.hypot(x - 10, z - 130);
      h += smoothstep(210, 400, d) * 16;                                   // neighbouring ruins at the rim
      const sag = Math.hypot((x - 230) / 60, (z - 215) / 45);
      h -= (1 - smoothstep(0.4, 1.05, sag)) * 1.4;                          // the crater the floor fell into
      const plaza = 1 - smoothstep(24, 60, Math.hypot(x - STAIR.x, z - STAIR.z));
      h = h * (1 - plaza) + 0.2 * plaza;                                   // swept flat around the staircase
      return h;
    },
  },
  look: {
    road: { base: 0x6a6e78, line: 0xf2efe4, center: 0xd9a441, skin: 'stone' },
    kerb: [0xb03a5b, 0xf2efe4],
    shoulder: 0x8f8578,
    terrain: { low: 0x8a8172, high: 0xb2a78d, dry: 0xbfb091, rock: 0x99917e, sand: 0xcabf9e, dirt: 0xa89474 },
    wall: 0xd8d2c4, wallStripe: 0xb03a5b,
    ads: ['COMMUNITY, ADJUSTED', 'HUSTLE (ON PAUSE)', 'KOMBUCHA ON TAP', 'HOT DESKS, NOW COLDER', 'DO WHAT YOU LOVE*', '*TERMS APPLIED', 'MEETING ROOMS BY THE MINUTE', 'VALUATION: YES'],
  },

  /** Dress the course. ctx: { THREE, track, group, gfx, anim, view } */
  decorate(ctx) {
    const { track, anim, view } = ctx, sc = new Scenery(ctx), rng = sc.rng;

    // start/finish gantry over the lobby straight
    const g0 = sc.beside(0, 1, -track.hwL[0]);
    const gantry = P.gantry(track.hwL[0] + track.hwR[0] + 1.5, 'WEWORK MEMORIAL');
    sc.place(gantry, g0.x, g0.z, { yaw: g0.along, y: g0.roadY });
    view.startLights = gantry.userData.lights;

    // the creditors' meeting: one small stand of spectators on the infield, watching the asset
    const stand = P.grandstand({ w: 24, rows: 4, color: 0x5b4a68 });
    const sp = sc.beside(13.55, -1, 9);
    const sg = stand.group.clone(); sc.place(sg, sp.x, sp.z, { yaw: sp.yaw, y: sp.y });
    sg.updateMatrixWorld(true);
    const M = new ctx.THREE.Matrix4().copy(sg.matrixWorld), V = new ctx.THREE.Vector3(), seats = [];
    for (const s of stand.seats) if (rng() < 0.5) { V.set(s[0], s[1], s[2]).applyMatrix4(M); seats.push({ x: V.x, y: V.y, z: V.z, yaw: sp.yaw + rng.range(-0.4, 0.4) }); }
    sc.instances(partsOf(P.spectator()), seats, { scale: [0.95, 1.15], tints: P.CROWD_TINTS, cast: false });

    // the landmark: the Spiral Staircase to Nowhere, visible from both floors
    sc.place(W.spiralStaircase({ h: 13.5 }), STAIR.x, STAIR.z, { yaw: 0.7, scale: 1.15, solid: 3.4 });

    // bankruptcy-court annex on the inside of the opening complex, where the flat lobby belongs
    const ax = sc.beside(1.82, -1, 25);
    sc.place(W.annexBlock(), ax.x, ax.z, { yaw: ax.yaw, scale: 1.35, solid: 8 });

    // overhead gantries with the two biggest lies in the building: you drive
    // under both, so they fill the windscreen — COMMUNITY* at the top of the
    // ramp where floor 2 begins, and the way out over the fire escape
    for (const [at, text] of [[7.6, 'COMMUNITY*'], [12.15, 'EXIT VIA GIFT SHOP']]) {
      const i = Math.floor((at / 14) * track.N) % track.N, gp = sc.beside(at, 1, -track.hwL[i]);
      sc.place(P.gantry(track.hwL[i] + track.hwR[i] + 1.5, text), gp.x, gp.z, { yaw: gp.along, y: gp.roadY });
    }

    // the ruined HQ hall stands beside the Mezzanine Ramp; you climb past the cathedral
    const hf = sc.beside(6.55, -1, 27);
    sc.place(W.hallFrame(), hf.x, hf.z, { yaw: hf.yaw + Math.PI / 2, solid: 8 });

    // the fallen HUSTLE neon at the exit of the tightest corner, upstairs.
    // It fell from the second floor. Of course it did.
    const hn = sc.beside(11.45, -1, 10.5);
    const neon = W.hustleNeon();
    sc.place(neon, hn.x, hn.z, { yaw: hn.yaw, y: hn.roadY, scale: 1.5 });
    const neonMat = neon.userData.mat;
    anim.push((dt, time) => {   // one tube is dying, theatrically
      const s = Math.sin(time * 31.7) * Math.sin(time * 7.3 + 1.7);
      neonMat.emissiveIntensity = s > 0.86 ? 0.25 : 1.5 + Math.sin(time * 2.3) * 0.15;
      void dt;
    });

    // the kombucha bar on the outside of the Breakout kink, kegs and all
    const kb = sc.beside(12.3, -1, 14.5);
    sc.place(W.kombuchaBar(), kb.x, kb.z, { yaw: kb.yaw, y: kb.roadY, scale: 1.3, solid: 2.6 });
    const kg = sc.beside(12.62, -1, 12.5);
    sc.place(W.kombuchaKeg(), kg.x, kg.z, { yaw: kg.yaw, y: kg.roadY, solid: 0.8 });

    // desk rows downstairs: the open plan, both sides of the east run
    const desksA = sc.along({ from: 0.55, to: 2.3, side: -1, offset: 13.5, spacing: 15 }).map(p => ({ ...p, yaw: p.yaw + Math.PI / 2 }));
    const desksB = sc.along({ from: 2.7, to: 4.35, side: 1, offset: 13.5, spacing: 15 }).map(p => ({ ...p, yaw: p.yaw + Math.PI / 2 }));
    sc.instances(partsOf(W.deskRow({ len: 13 })), [...desksA, ...desksB], { solid: 2.5 });
    // and upstairs, where the desks had better light and the same ending
    const desksC = sc.along({ from: 9.6, to: 10.6, side: -1, offset: 13, spacing: 15 }).map(p => ({ ...p, yaw: p.yaw + Math.PI / 2 }));
    const desksD = sc.along({ from: 11.6, to: 12.4, side: -1, offset: 13, spacing: 15 }).map(p => ({ ...p, yaw: p.yaw + Math.PI / 2 }));
    sc.instances(partsOf(W.deskRow({ len: 12, accent: 0x8f4a6e })), [...desksC, ...desksD], { solid: 2.5 });

    // phone booths in a row along the east run, and a pair upstairs on the rim
    const booths = [...sc.along({ from: 2.25, to: 3.55, side: -1, offset: 12.5, spacing: 16 }), ...sc.along({ from: 9.9, to: 10.5, side: 1, offset: 12.5, spacing: 15 })];
    sc.instances(partsOf(W.phoneBooth({})), booths, { solid: 1 });

    // chairs: some still at their desks, some done with all of this
    for (const [at, side, off, tipped, col] of [[1.15, -1, 11, false, 0x3d6e8f], [3.95, 1, 11, true, 0xb03a5b], [5.5, -1, 12, true, 0xd9a441], [10.6, 1, 11, true, 0x3d6e8f], [11.85, -1, 11.5, false, 0x8f4a6e], [13.1, -1, 11, false, 0x5b4a68]]) {
      const cp = sc.beside(at, side, off);
      sc.place(W.officeChair({ color: col, tipped }), cp.x, cp.z, { yaw: cp.yaw + rng.range(-0.6, 0.6), y: cp.roadY, solid: 0.5 });
    }

    // rubble: piles near the sag, the neon and the descent, then the general ruin of the place
    for (const [at, side, off] of [[5.25, 1, 12], [5.8, -1, 13], [11.3, -1, 14], [12.6, 1, 13]]) {
      const rp = sc.beside(at, side, off);
      sc.place(W.rubblePile(3), rp.x, rp.z, { yaw: rng() * 3, y: rp.roadY, scale: rng.range(0.9, 1.5), solid: 1.6 });
    }
    const rubble = sc.scatter({ count: 46, min: 15, max: 95, maxSlope: 0.5, minGap: 7 });
    sc.instances(partsOf(W.rubblePile(1)), rubble.filter((_, i) => i % 2 === 0), { scale: [0.7, 1.8], yaw: 'random' });
    sc.instances(partsOf(W.rubblePile(2)), rubble.filter((_, i) => i % 2 === 1), { scale: [0.7, 1.6], yaw: 'random' });

    // lobby dressing: dead plants and water coolers, the flora and fauna of the place
    const plants = sc.scatter({ count: 26, min: 12.5, max: 34, maxSlope: 0.5, minGap: 4 });
    sc.instances(partsOf(W.deadPlant()), plants.filter((_, i) => i % 2 === 0), { scale: [0.9, 1.4], yaw: 'random', solid: 0.4 });
    sc.instances(partsOf(W.waterCooler()), plants.filter((_, i) => i % 2 === 1), { scale: [0.95, 1.1], yaw: 'random', solid: 0.4 });

    // brutal notices, placed where they will be read at speed — and big:
    // at roadside distance, sub-metre letters are just texture
    const n1 = sc.beside(0.72, 1, 12.5);
    sc.place(W.noticeBoard(['ALL HANDS', 'CANCELLED']), n1.x, n1.z, { yaw: n1.yaw, y: n1.roadY, scale: 1.9 });
    const n2 = sc.beside(10.55, 1, 12.5);
    sc.place(W.noticeBoard(['COMMUNITY*', '*ADJUSTED']), n2.x, n2.z, { yaw: n2.yaw, y: n2.roadY, scale: 1.9 });
    const n3 = sc.beside(13.1, -1, 12);
    sc.place(W.noticeBoard(['THE MEMORIAL', 'EST. 2019 — 2023']), n3.x, n3.z, { yaw: n3.yaw, y: n3.roadY, scale: 1.9 });

    // sponsor walls carry the slogans; three big boards where the lap looks anyway
    [[3.35, 1, 23, ['HUSTLE (ON PAUSE)', 'KOMBUCHA ON TAP']], [6.0, -1, 21, ['HUSTLE (ON PAUSE)', 'KOMBUCHA ON TAP']], [12.78, -1, 17, ['VALUATION: $47B*', '*UNAUDITED']]].forEach(([at, side, off, lines], i) => {
      const p = sc.beside(at, side, off), tex = bannerTexture(lines, i + 5);
      tex.repeat.set(0.25, 1);
      sc.place(P.billboard(tex, { w: 15, h: 5, legs: 6 }), p.x, p.z, { yaw: p.yaw + rng.range(-0.12, 0.12), y: p.roadY });
    });

    // arrow boards on the outside of every real corner, same as the shipping tracks
    for (const c of track.corners) {
      const side = c.dir > 0 ? -1 : 1, n = Math.max(2, Math.min(5, Math.round(c.len / 15)));
      for (let k = 0; k < n; k++) {
        const i = (c.i0 + Math.round(((k + 0.6) / n) * (c.len / track.ds))) % track.N;
        const p = sc.beside(track.cp[i], side, (side > 0 ? track.outerL[i] : track.outerR[i]) + 1.2);
        const b = P.chevronBoard(); if (c.dir > 0) b.scale.x = -1;
        sc.place(b, p.x, p.z, { yaw: p.yaw, lift: 0.9 }); if (c.dir > 0) b.scale.x = -1;
      }
    }
  },
};
