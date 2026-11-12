/* Bliss Hills: the second, friendly track of the first cup. The world's most
   famous default wallpaper as a real place: a roller-coaster of green hills,
   three air-time crests on the way down, a banked bowl, and a meadow you can
   cut with a boost. */
import { fbm, smoothstep, clamp } from '../core/util.js';

import { Scenery, partsOf } from '../render/scenery.js';
import * as P from '../models/props.js';
import * as B from '../models/props-bliss-hills.js';
import { bannerTexture } from '../render/textures.js';
import { skyCard, farHills } from '../render/cloudcard.js';
import { VIEW, HILL, SKY, CLOUD_COVER, CLOUD_FILL, FAR_HILLS, dipRadius, wallpaperHeight, wallpaperWeight, wallpaperPaint, toPicture } from '../content/bliss-wallpaper.js';

const LAKE = { x: -62, z: 42, r: 34 };
const MEADOW = { x: -20, z: 136, r: 40 };
const SWALE = { z: 136, x0: -95, x1: 12, depth: 2.4 };
const FARM = { x: 40, z: -78, r: 34, y: 4 };
const RIDGE = { z: 345, x0: -190, x1: 170 };   // wind turbines along the skyline south of the hill

/* The wallpaper: east of turn one stands the hill everybody has stared at. Its shape, colors, sky, and clouds
   live in ../content/bliss-wallpaper.js; the race opens on the view they were measured for. */
const lin = hex => [(hex >> 16) / 255, ((hex >> 8) & 255) / 255, (hex & 255) / 255].map(c => (c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)));
const mixInto = (out, c, k) => { out[0] += (c[0] - out[0]) * k; out[1] += (c[1] - out[1]) * k; out[2] += (c[2] - out[2]) * k; };
const DEG = 180 / Math.PI;

export default {
  id: 'bliss-hills',
  name: 'Bliss Hills',
  tagline: 'Have you tried turning it off and on again?',
  laps: 3,
  width: 18,
  sky: 'day',
  // a deep, clean blue with the sun behind the viewer; the procedural clouds keep out of the east, where the authored ones hang
  skyOverrides: { zenith: 0x1468ee, horizon: 0x8fbcf3, cloudCover: 0.5, sunDir: [-0.5, 0.74, -0.38], clearSky: [90, 62], fog: 0xa3c6f3, fogNear: 520, fogFar: 1900 },
  backdrop: { img: 'assets/backdrops/bliss-hills.webp', top: 27, bottom: -9, rot: 0.3 },
  // the opening shot is the wallpaper, shown without the game's color grade so the measured colors come out as measured
  intro: [{ pos: [VIEW.x, VIEW.eye, VIEW.z], look: [VIEW.x + 100, VIEW.eye, VIEW.z], fov: VIEW.fov, dur: 3.2, grade: { sat: 1, contrast: 1, vignette: 0 } }],
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
    cell: 3, margin: 160, marginX: [160, 405], marginZ: [215, 160], blend: 22, water: -1.4,
    color(x, z, h, slope, over, out) {
      const w = wallpaperWeight(x, z); if (w <= 0) return;
      const c = [0, 0, 0], p = x - VIEW.x > 2 ? toPicture(x, h, z) : [960, 1070];
      wallpaperPaint(p[0], p[1], c); mixInto(out, c, w);
    },
    fn(x, z) {
      const ww = wallpaperWeight(x, z);
      if (ww >= 1) return wallpaperHeight(x - VIEW.x, z - VIEW.z);
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
      return ww > 0 ? h + (wallpaperHeight(x - VIEW.x, z - VIEW.z) - h) * ww : h;
    },
  },
  look: {
    groundTexture: 'meadow', groundScale: 0.142, groundMatte: true,                        // mown grass, one tile to 64 m, so the mower's rows read on the far hill                                                // smooth, mown grass: the hills here are the star
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
    // nothing is ever planted in the wallpaper view: it stays a hill, a field, and a sky
    const free = (x, z) => wallpaperWeight(x, z) <= 0 && !(x > 118 && z < 60 && z > -140) && !taken.some(([tx, tz, r]) => (tx - x) ** 2 + (tz - z) ** 2 < r * r);

    // the wallpaper's sky and clouds, hung far to the east, with the far hills that show over the right shoulder
    {
      const small = (ctx.gfx.q?.pixels || 2e6) < 1.2e6, exposure = ctx.gfx.renderer.toneMappingExposure, eye = [VIEW.x, VIEW.eye, VIEW.z];
      ctx.group.add(skyCard(ctx.gfx.renderer, { sky: SKY, cover: CLOUD_COVER, fill: CLOUD_FILL, rect: [-700, -430, 2620, 560], eye, fov: VIEW.fov, distance: 1500, exposure, width: small ? 2048 : 4096, height: small ? 608 : 1216 }));
      ctx.group.add(farHills({ points: FAR_HILLS, eye, fov: VIEW.fov, exposure }));
    }
    // the near field: a dark earth bank where the dip runs out of the picture on the left, dry stalks along it, and buttercups
    {
      const L = ctx.gfx.lightScale ?? 0.6, M4 = new THREE.Matrix4(), Q = new THREE.Quaternion(), E = new THREE.Euler(), V = new THREE.Vector3(), S = new THREE.Vector3();
      const at = (az, r) => { const t = az / DEG, x = VIEW.x + Math.cos(t) * r, z = VIEW.z + Math.sin(t) * r; return [x, track.terrainHeight(x, z), z]; };
      // the bank: a low wall of dark earth standing on the far lip of the field, tallest at the left and gone by the middle
      const pos = [], col = [], idx = [], dark = lin(0x1f1826), mid = lin(0x3b2a3c);
      let n = 0;
      for (let az = -66; az <= -9; az += 1.2) {
        const k = smoothstep(-9, -24, az), r = dipRadius(az) * 0.86, a = at(az, r), b = at(az, r + 0.5), hgt = (0.06 + 0.36 * k) * (0.8 + rng() * 0.4);
        pos.push(a[0], a[1] - 0.05, a[2], b[0], a[1] + hgt, b[2]);
        for (const c of [dark, mid]) { const v = 0.75 + rng() * 0.5; col.push(c[0] * v, c[1] * v, c[2] * v); }
        if (n) { const o = (n - 1) * 2; idx.push(o, o + 2, o + 1, o + 1, o + 2, o + 3); }
        n++;
      }
      const bg = new THREE.BufferGeometry(); bg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); bg.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); bg.setIndex(idx);
      ctx.group.add(new THREE.Mesh(bg, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.DoubleSide, color: new THREE.Color(L * 1.15, L * 1.15, L * 1.15) })));
      const stalks = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.006, 0.012, 1, 4).translate(0, 0.5, 0), new THREE.MeshBasicMaterial({ color: new THREE.Color(0x4e3f52).multiplyScalar(L) }), 320);
      for (let i = 0; i < 320; i++) { const az = rng.range(-64, -12), p = at(az, dipRadius(az) * 0.86 + rng.range(0, 0.7)); E.set(rng.range(-0.3, 0.3), 0, rng.range(-0.3, 0.3)); S.set(1, 0.2 + rng() * 0.42, 1); stalks.setMatrixAt(i, M4.compose(V.set(p[0], p[1] + 0.3, p[2]), Q.setFromEuler(E), S)); }
      ctx.group.add(stalks);
      const flowers = new THREE.InstancedMesh(new THREE.SphereGeometry(0.02, 5, 4), new THREE.MeshBasicMaterial({ color: new THREE.Color(0xf2e31c).multiplyScalar(L * 1.25) }), 190);
      for (let i = 0; i < 190; i++) { const az = rng.range(-50, 50), r = 4 + Math.pow(rng(), 0.45) * (dipRadius(az) - 6), p = at(az, r), k = (0.7 + rng() * 0.7) * Math.max(0.35, r / 20);   /* about the same few pixels each, near or far */ flowers.setMatrixAt(i, M4.makeScale(k, k, k).setPosition(p[0], p[1] + 0.13 + r * 0.006 + rng() * 0.05, p[2])); }
      ctx.group.add(flowers);
      // real grass at your feet: tens of thousands of thin blades, each tinted like the ground under it, thinning out with distance
      {
        const N = Math.round(70000 * (ctx.gfx.q?.scenery ?? 1)), bp = new Float32Array(N * 9), bc = new Float32Array(N * 9), c = [0, 0, 0];
        for (let i = 0; i < N; i++) {
          const az = rng.range(-58, 58), far = dipRadius(az) * 0.8, r = 3.2 + Math.pow(rng(), 1.7) * (far - 3.2), p = at(az, r);
          const hgt = (0.045 + rng() * 0.065) * (1 + r / 12), w = (0.003 + rng() * 0.003) * (1 + r / 6), t = rng() * 6.283, lx = rng.range(-0.05, 0.05), lz = rng.range(-0.05, 0.05);
          const pic = toPicture(p[0], p[1], p[2]); wallpaperPaint(pic[0], pic[1], c); const v = 0.78 + rng() * 0.5, y = rng() < 0.1 ? 1.2 : 1;   // the odd blade catches the light
          bp.set([p[0] - Math.cos(t) * w, p[1], p[2] - Math.sin(t) * w, p[0] + Math.cos(t) * w, p[1], p[2] + Math.sin(t) * w, p[0] + lx, p[1] + hgt, p[2] + lz], i * 9);
          for (let k = 0; k < 3; k++) { const m = v * (k === 2 ? 1.25 * y : 0.82); bc.set([c[0] * m * (k === 2 ? 1.08 : 1), c[1] * m, c[2] * m * 0.9], i * 9 + k * 3); }
        }
        const gg = new THREE.BufferGeometry(); gg.setAttribute('position', new THREE.BufferAttribute(bp, 3)); gg.setAttribute('color', new THREE.BufferAttribute(bc, 3));
        const nrm = new Float32Array(N * 9); for (let i = 1; i < N * 9; i += 3) nrm[i] = 1; gg.setAttribute('normal', new THREE.BufferAttribute(nrm, 3));
        const blades = new THREE.Mesh(gg, new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide })); blades.receiveShadow = true; blades.name = 'grass'; ctx.group.add(blades);
      }
      // the few sunlit bushes on the right shoulder of the hill, where it meets the far hills
      const shoulder = [];
      for (const px of [1606, 1650, 1688, 1702]) {
        const t = (px / VIEW.frame[0] - 0.5) * 2 * Math.tan(VIEW.fov * Math.PI / 360) * 16 / 9; let bu = 60, be = -9;
        for (let u = 60; u < 420; u += 2) { const e = (wallpaperHeight(u, u * t) - VIEW.eye) / u; if (e > be) { be = e; bu = u; } }
        shoulder.push({ x: VIEW.x + bu, z: VIEW.z + bu * t, y: wallpaperHeight(bu, bu * t) - 0.3, yaw: rng() * 6.28 });
      }
      sc.instances(partsOf(P.bush(3, { color: 0xa3a13c })), shoulder, { scale: [1.3, 2.0], cast: false });
    }
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
      if (!free(p.x, p.z)) continue;
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
      const p = sc.beside(at, side, off); if (!free(p.x, p.z)) return;
      const tex = bannerTexture([ads[i]], i + 3);
      tex.repeat.set(0.25, 1);
      sc.place(P.billboard(tex, { w: 15, h: 5, legs: 6 }), p.x, p.z, { yaw: p.yaw + rng.range(-0.15, 0.15) });
    });

    // hot-air balloons drifting over the hills
    const cols = [[0xff4d6d, 0xffd23c], [0x38b6ff, 0xffffff], [0x2ee6a6, 0xffd23c], [0x9b6bff, 0xff7eb6], [0xff8a3c, 0xffffff]];
    const balloons = cols.map((c, i) => { const b = P.balloon(c); const a = 1.5 + (i / (cols.length - 1)) * 3.3, r = 210 + (i % 2) * 80;   /* over the west and south, clear of the wallpaper */ b.position.set(-10 + Math.cos(a) * r, 60 + i * 8, 130 + Math.sin(a) * r); b.scale.setScalar(1.4 + (i % 3) * 0.3); ctx.group.add(b); return b; });
    anim.push((dt, time) => { balloons.forEach((b, i) => { b.position.y += Math.sin(time * 0.4 + i * 1.7) * dt * 0.8; b.position.x += Math.sin(time * 0.05 + i) * dt * 0.6; b.rotation.y += dt * 0.05; }); });
  },
};
