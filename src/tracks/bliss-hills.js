/* Bliss Hills: the second, friendly track of the first cup. The world's most
   famous default wallpaper as a real place: a roller-coaster of green hills,
   three air-time crests on the way down, a banked bowl, and a meadow you can
   cut with a boost. */
import { fbm, smoothstep, clamp } from '../core/util.js';

import { Scenery, partsOf } from '../render/scenery.js';
import * as P from '../models/props.js';
import * as B from '../models/props-bliss-hills.js';
import * as S from '../models/props-silicon-valley.js';   // the sign kit: canvas atlas, baker, text fitting
import { bakeSkyDome, farHills } from '../render/cloudcard.js';
import { VIEW, HILL, SKY, CLOUD_COVER, FAR_HILLS, dipRadius, wallpaperHeight, wallpaperWeight, wallpaperPaint, toPicture } from '../content/bliss-wallpaper.js';

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

/* The joke pass. The centerpiece: Clippy, forty metres of paperclip in the infield, offering help to the start grid. */
const CLIPPY = { x: 55, z: 60, yaw: Math.atan2(-105, -50), H: 44 };
/* Billboards: [cp, side, metres beyond the road edge, text, background, ink]. */
const BOARDS = [
  [1.3, 1, 30, '640K OUGHT TO BE ENOUGH', '#1a1d29', '#37ff6a'],
  [4.9, -1, 24, 'ABORT, RETRY, FAIL?', '#0a4fd6', '#ffffff'],
  [7.6, -1, 20, 'INSERT DISK 2 OF 47', '#ffd23c', '#1a1d29'],
  [10.4, 1, 22, 'YOU HAVE (1) NEW VIRUS', '#e5352b', '#ffffff'],
  [13.4, -1, 20, 'BEST VIEWED AT 800X600', '#ffffff', '#0a4fd6'],
  [16.5, -1, 22, 'NOW DEFRAGMENTING YOUR LAP', '#7b5cff', '#ffffff'],
  [21.0, -1, 26, 'PRESS ANY KEY (NOT THAT ONE)', '#ece9d8', '#12142b'],
  [27.5, -1, 18, 'FREE SMILEY TOOLBAR! CLICK HERE', '#ff8ac4', '#12142b'],
  [29.9, 1, 24, 'YOUR TRIAL HAS EXPIRED', '#12142b', '#ffd23c'],
  [31.5, -1, 20, 'UNDER CONSTRUCTION SINCE 1998', '#ffd23c', '#12142b'],
  [33.6, -1, 22, 'TURN IT OFF AND ON AGAIN', '#3a8cff', '#ffffff'],
  [16.0, 1, 20, 'BUFFERING... (FOREVER)', '#ffffff', '#12142b'],
];
const STANDS = ['ADMINISTRATORS ONLY', 'GUEST ACCOUNT SEATING', 'SAFE MODE SECTION', 'DIAL-UP SECTION (PLEASE WAIT)'];
const PLACARDS = ['I MISS CLIPPY', 'A/S/L?', 'Y2K READY', "YOU'VE GOT MAIL", 'BRB', 'CTRL+ALT+DEL', 'LOL', 'MOM, GET OFF THE PHONE'];

export default {
  id: 'bliss-hills',
  name: 'Bliss Hills',
  tagline: 'It is now safe to turn off your kart.',
  lapNotes: ['<b>Lap 2.</b> Updates are ready. Restarting in 10 seconds.', '<b>Final lap.</b> Installing update 3 of 214. Do not turn off your kart.'],
  laps: 3,
  width: 18,
  sky: 'day',
  // a deep, clean blue with the sun behind the viewer; the procedural clouds keep out of the east, where the authored ones hang
  skyOverrides: { zenith: 0x1468ee, horizon: 0x8fbcf3, cloudCover: 0.5, sunDir: [-0.5, 0.74, -0.38], clearSky: [90, 50], fog: 0xa3c6f3, fogNear: 520, fogFar: 1900 },
  backdrop: { img: 'assets/backdrops/bliss-hills.webp', top: 27, bottom: -9, rot: 0.3, tint: [1.0, 0.86, 0.42] },   // the painted far hills, pulled toward the same greens
  // the opening shot is the wallpaper, shown without the game's color grade so the measured colors come out as measured
  intro: [{ pos: [VIEW.x, VIEW.eye, VIEW.z], look: [VIEW.x + 100, VIEW.eye, VIEW.z], fov: VIEW.fov, dur: 3.2, grade: { sat: 1, contrast: 1, vignette: 0 } },
    { pos: [-34, 30, 8], look: [CLIPPY.x, 26, CLIPPY.z], pos1: [-10, 30, 16], look1: [CLIPPY.x, 28, CLIPPY.z], fov: 45, dur: 3 }],   // then Clippy, offering to help
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
  // rivals cut the meadow too, between the mines; on the east half, where the meadow is widest (see docs/track-authoring.md)
  shortcuts: [{ name: 'meadow', from: 22.2, to: 27.9, path: [[-30, 166], [-16, 151], [-13, 132], [-19, 112]] }],
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
      const w = wallpaperWeight(x, z);
      // cloud shadows drift over every hill the way they lie over the famous one: broad, soft, and olive
      if (w < 1) { const sh = smoothstep(0.44, 0.62, fbm(x * 0.0052 + 3.1, z * 0.0052 + 1.7, 2, 91)) * 0.5 * (1 - w); out[0] *= 1 - sh * 0.62; out[1] *= 1 - sh * 0.5; out[2] *= 1 - sh * 0.35; }
      if (w <= 0) return;
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
    // the whole track wears the wallpaper's greens (the calibrated colors of its lit, middling, and brightest grass), so the famous hill is not a patch of different lawn
    terrain: { low: 0x6f9f24, high: 0x97cb1d, dry: 0xa3d61c, rock: 0x9c9388, sand: 0xe9d7a2, dirt: 0xbf9f6e },
    water: 0x2f9be6,
    ads: ['HAVE YOU TRIED REBOOTING', 'NOT RESPONDING', '640K IS ENOUGH', 'DEFRAG TODAY', 'PRESS ANY KEY', 'ABORT RETRY FAIL', 'INSERT DISK 2', 'DIAL-UP SPEEDS', 'CTRL ALT DELIGHT', 'SAFE MODE', 'SCREENSAVER INC', 'PLUG AND PRAY'],
  },
  LAKE,
  models: { dialog: () => B.errorDialog(), bale: () => B.mine() },   // the meadow's hay bales are Minesweeper mines now (same spots, same bump)

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

    // the wallpaper's sky, continued over the whole dome so it has no edge, and the far hills that show over the right shoulder
    {
      const small = (ctx.gfx.q?.pixels || 2e6) < 1.2e6 || matchMedia('(pointer: coarse)').matches, exposure = ctx.gfx.renderer.toneMappingExposure, eye = [VIEW.x, VIEW.eye, VIEW.z];
      const dome = bakeSkyDome(ctx.gfx.renderer, { sky: SKY, cover: CLOUD_COVER, fov: VIEW.fov, small });
      ctx.gfx.sky.setDome(dome);
      const keeper = new THREE.Object3D(); keeper.userData.dispose = dome.dispose; ctx.group.add(keeper);
      // The far hills and the cleared horizon belong to the opening shot only: they are composed for that one viewpoint.
      // Once the camera leaves it, the painted horizon runs all the way round like everywhere else.
      const far = farHills({ points: FAR_HILLS, eye, fov: VIEW.fov, exposure }); ctx.group.add(far);
      const clear = ctx.gfx.sky.uniforms.uClear.value, clearZ = clear.z;
      const opening = () => !!(view.intro && !view.intro.done && view.intro.t < view.intro.shots[0].dur);
      const apply = () => { const on = opening(); far.visible = on; clear.z = on ? clearZ : -2; };
      apply(); anim.push(apply);
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
    const gantry = P.gantry(track.hwL[0] + track.hwR[0] + 1.5, 'CLICK START TO SHUT DOWN', { color: 0x2f6bff, color2: 0xffd23c });
    const atlas = S.makeAtlas(ctx.group), bake = S.makeBaker(ctx.group, sc.shadows), signs = new Map();
    const board = (text, opts = {}, w = 768, h = 256) => { const k = text + JSON.stringify(opts) + w + 'x' + h; if (!signs.has(k)) signs.set(k, atlas.add(w, h, S.signDraw(text, opts))); return signs.get(k); };
    const local = (p, u, v, y) => [p.x + Math.cos(p.yaw) * u + Math.sin(p.yaw) * v, y, p.z - Math.sin(p.yaw) * u + Math.cos(p.yaw) * v];
    let nStand = 0;
    sc.place(gantry, g0.x, g0.z, { yaw: g0.along, y: g0.roadY });
    view.startLights = gantry.userData.lights;
    const stand = P.grandstand({ w: 30, rows: 6, color: 0x2f6bff }), stand2 = P.grandstand({ w: 30, rows: 6, color: 0x2fae4a });
    // one stand on the pit side is the blue screen of death itself (#113): every surface recoloured to the
    // error blue, an error-screen fascia front and back, and a crowd all in white
    const BSOD = 0x0a3fb0;
    const bsodProto = (() => {
      const pr = P.grandstand({ w: 30, rows: 6, color: BSOD });
      const recolor = { d9dde6: 0x6ea8f2, c6ccd8: 0x4a86e0, '8b93a6': 0x083a8f, f4f4f0: BSOD, ffd23c: 0xffffff };
      pr.group.traverse(o => { if (o.isMesh) { o.material = o.material.clone(); const k = o.material.color?.getHexString(); if (k && recolor[k] !== undefined) o.material.color.setHex(recolor[k]); else if (k && k !== '0a3fb0') o.material.color.setHex(0x0a2a5e); } });
      return pr;
    })();
    const drawBsod = (g, w, h) => {
      g.fillStyle = '#0a3fb0'; g.fillRect(0, 0, w, h);
      g.fillStyle = '#ffffff'; g.textAlign = 'left'; g.textBaseline = 'middle';
      g.font = `${Math.round(h * 0.66)}px "Trebuchet MS", Arial, sans-serif`;
      g.fillText(':(', w * 0.03, h * 0.55);
      S.fitText(g, 'YOUR SEAT RAN INTO A PROBLEM', w * 0.575, h * 0.35, w * 0.8, Math.round(h * 0.3), S.SANS, '#ffffff', { lines: 1 });
      S.fitText(g, "WE'RE COLLECTING SOME ERROR INFO, THEN THE RACE RESTARTS · 0% COMPLETE", w * 0.575, h * 0.72, w * 0.8, Math.round(h * 0.19), S.SANS, '#cfe1ff', { lines: 1 });
    };
    const bsodFront = atlas.add(1024, 132, drawBsod), bsodBack = atlas.add(1024, 176, drawBsod);
    const seats = [], whiteSeats = [];
    const M = new THREE.Matrix4(), V = new THREE.Vector3();
    const putStand = (proto, p, bsod = false) => {
      const g = proto.group.clone(); sc.place(g, p.x, p.z, { yaw: p.yaw, y: p.y });
      g.updateMatrixWorld(true); M.copy(g.matrixWorld);
      for (const s of proto.seats) if (rng() < 0.82) { V.set(s[0], s[1], s[2]).applyMatrix4(M); (bsod ? whiteSeats : seats).push({ x: V.x, y: V.y, z: V.z, yaw: p.yaw + rng.range(-0.4, 0.4) }); }
      taken.push([p.x, p.z, 22]);
      bake.add(g);
      // a banner under the roof, and the front row holding up placards
      const k = nStand++;
      if (bsod) {
        atlas.place(bsodFront, local(p, 0, 2.32, p.y + 6.9), p.yaw, 28, 3.0);
        atlas.place(bsodBack, local(p, 0, -8.95, p.y + 4.2), p.yaw + Math.PI, 26, 4.6);
      } else {
        atlas.place(board(STANDS[k % STANDS.length], { bg: k % 2 ? '#0a4fd6' : '#ece9d8', fg: k % 2 ? '#ffffff' : '#12142b', size: 120, lines: 1 }, 1024, 96), local(p, 0, 2.3, p.y + 7.9), p.yaw, 28, 2.6);
      }
      [-10, 0.5, 10.5].forEach((u, j) => atlas.place(board(PLACARDS[(k * 3 + j) % PLACARDS.length], { bg: ['#ffffff', '#ffffe1', '#7fd0ff', '#ff9ab0'][(k + j) % 4], fg: '#12142b', size: 110, border: '#12142b' }, 384, 224), local(p, u + rng.range(-1.5, 1.5), 0.4, p.y + 3.9), p.yaw + rng.range(-0.15, 0.15), 3.0, 1.75));
    };
    const rowA = sc.along({ from: 34.9, to: 0.9, side: 1, offset: 6.5, spacing: 34 });
    const gi = track.indexAtCp(0.45);
    let bi = 0; rowA.forEach((p, i) => { if ((p.x - track.px[gi]) ** 2 + (p.z - track.pz[gi]) ** 2 < (rowA[bi].x - track.px[gi]) ** 2 + (rowA[bi].z - track.pz[gi]) ** 2) bi = i; });
    rowA.forEach((p, i) => putStand(i === bi ? bsodProto : (i % 2 ? stand2 : stand), p, i === bi));
    sc.along({ from: 35.3, to: 0.5, side: -1, offset: 18, spacing: 36, phase: 14 }).forEach((p, i) => putStand(i % 2 ? stand : stand2, p));
    sc.instances(partsOf(P.spectator()), seats, { scale: [0.95, 1.2], tints: P.CROWD_TINTS, cast: false });
    sc.instances(partsOf(P.spectator()), whiteSeats, { scale: [0.95, 1.2], tints: [0xffffff], cast: false });

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

    gags({ THREE, track, group: ctx.group, sc, rng, atlas, bake, taken, free, local, board, anim });

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
    const oakA = partsOf(P.roundTree(1, { h: 8, leafA: 0x5f9e22, leafB: 0x86c02e })), oakB = partsOf(P.roundTree(2, { h: 9.5, leafA: 0x4f8a1e, leafB: 0x74ae2a })), oakC = partsOf(P.roundTree(3, { h: 6.5, leafA: 0x7fb62c, leafB: 0xa0cf3a }));
    sc.instances(oakA, treeSpots.filter((_, i) => i % 3 === 0), { scale: [0.85, 1.45], yaw: 'random', tilt: 0.04 });
    sc.instances(oakB, treeSpots.filter((_, i) => i % 3 === 1), { scale: [0.85, 1.5], yaw: 'random', tilt: 0.04 });
    sc.instances(oakC, treeSpots.filter((_, i) => i % 3 === 2), { scale: [0.85, 1.35], yaw: 'random', tilt: 0.04 });

    // flowering bushes everywhere close to the road, and wildflowers in the meadow
    const low = sc.scatter({ count: 250, min: 14.5, max: 60, maxSlope: 0.7, minGap: 2.6, where: (x, z) => free(x, z) && !nearLake(x, z) && !inMeadow(x, z) });
    sc.instances(partsOf(P.bush(1, { color: 0x5a9a22, flower: 0xffe04a })), low.filter((_, i) => i % 4 === 0), { scale: [0.8, 1.6], yaw: 'random' });
    sc.instances(partsOf(P.bush(2, { color: 0x70ae2a, flower: 0xffffff })), low.filter((_, i) => i % 4 === 1), { scale: [0.8, 1.5], yaw: 'random' });
    sc.instances(partsOf(P.bush(3, { color: 0x528f20, flower: 0xff8ac4 })), low.filter((_, i) => i % 4 === 2), { scale: [0.8, 1.5], yaw: 'random' });
    sc.instances(partsOf(P.bush(5, { color: 0x68a628, flower: 0xffe04a })), low.filter((_, i) => i % 4 === 3), { scale: [0.7, 1.3], yaw: 'random' });
    const meadowFlowers = sc.scatter({ count: 50, min: 8, max: 40, maxSlope: 0.5, minGap: 4, where: (x, z) => inMeadow(x, z) });
    sc.instances(partsOf(P.bush(7, { color: 0x86bc30, flower: 0xffffff })), meadowFlowers, { scale: [0.4, 0.7], yaw: 'random', cast: false });
    // reeds and rocks round the lake
    const shore = sc.scatter({ count: 40, min: 12, max: 90, maxSlope: 0.9, minGap: 3, where: (x, z, h) => h > track.water + 0.2 && h < track.water + 1.6 });
    sc.instances(partsOf(P.rock(2, { r: 1.1 })), shore.filter((_, i) => i % 3 === 0), { scale: [0.6, 1.6], yaw: 'random', sink: 0.2, tints: [0xb8b0a4, 0xa39c92, 0xc7bfb2] });
    sc.instances(partsOf(P.bush(6, { color: 0x4a8420 })), shore.filter((_, i) => i % 3 !== 0), { scale: [0.7, 1.2], yaw: 'random' });

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

    // big billboards where you are looking anyway
    const frame = P.billboard(null, { w: 15, h: 5, legs: 6 }); frame.remove(frame.children[frame.children.length - 1]);   // the frame, without its blank panel
    BOARDS.forEach(([at, side, off, text, bg, fg]) => {
      const p = sc.beside(at, side, off); if (!free(p.x, p.z) || p.x > 100) return;
      const yaw = p.yaw + rng.range(-0.12, 0.12), f = frame.clone(); sc.place(f, p.x, p.z, { yaw }); bake.add(f);
      atlas.place(board(text, { bg, fg, size: 118 }), [p.x + Math.sin(yaw) * 0.03, p.y + 8.5, p.z + Math.cos(yaw) * 0.03], yaw, 15, 5);
      atlas.place(board(text, { bg, fg, size: 118 }), [p.x - Math.sin(yaw) * 0.46, p.y + 8.5, p.z - Math.cos(yaw) * 0.46], yaw + Math.PI, 15, 5);   // and on the back
    });

    // hot-air balloons drifting over the hills
    const cols = [[0xff4d6d, 0xffd23c], [0x38b6ff, 0xffffff], [0x2ee6a6, 0xffd23c], [0x9b6bff, 0xff7eb6], [0xff8a3c, 0xffffff]];
    const balloons = cols.map((c, i) => { const b = P.balloon(c); const a = 1.5 + (i / (cols.length - 1)) * 3.3, r = 210 + (i % 2) * 80;   /* over the west and south, clear of the wallpaper */ b.position.set(-10 + Math.cos(a) * r, 60 + i * 8, 130 + Math.sin(a) * r); b.scale.setScalar(1.4 + (i % 3) * 0.3); ctx.group.add(b); return b; });
    anim.push((dt, time) => { balloons.forEach((b, i) => { b.position.y += Math.sin(time * 0.4 + i * 1.7) * dt * 0.8; b.position.x += Math.sin(time * 0.05 + i) * dt * 0.6; b.rotation.y += dt * 0.05; }); });
    bake.flush();
    atlas.flush();
  },
};

/* ---------- the gags ---------- */
function gags({ THREE, track, group, sc, rng, atlas, bake, taken, free, local, board, anim }) {
  const { FONT, SANS, fitText } = S;
  const facing = (p, x, z) => Math.atan2(x - p.x, z - p.z);
  const canvasTex = (w, h, draw) => { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; t.redraw = () => { draw(c.getContext('2d'), w, h); t.needsUpdate = true; }; if (document.fonts?.ready) document.fonts.ready.then(t.redraw); return t; };
  const legs = (p, w, top, color = 0x3a414c) => { for (const u of [-w * 0.32, w * 0.32]) { const q = S.post(top, 0.3, color); const [x, , z] = local(p, u, -0.4, 0); sc.place(q, x, z, { y: p.y - 0.3 }); bake.add(q, false); } };
  const spot = (cp, side, off) => { const p = sc.beside(cp, side, off); if (!free(p.x, p.z) || p.x > 100) console.warn('bliss-hills: gag spot not free', cp, side, off); return p; };
  const XP = '"Trebuchet MS", "Arial Black", Arial, sans-serif';
  /** An XP-style window: blue title bar, cream body; body(g, x, y, w, h) draws the content. */
  const xpWindow = (title, body) => (g, w, h) => {
    const tb = Math.round(h * 0.16);
    g.fillStyle = '#ece9d8'; g.fillRect(0, 0, w, h);
    const bar = g.createLinearGradient(0, 0, 0, tb); bar.addColorStop(0, '#3a8cff'); bar.addColorStop(0.5, '#0a5ee8'); bar.addColorStop(1, '#0a4fd6'); g.fillStyle = bar; g.fillRect(0, 0, w, tb);
    g.fillStyle = '#ffffff'; g.font = `bold ${Math.round(tb * 0.6)}px ${XP}`; g.textAlign = 'left'; g.textBaseline = 'middle'; g.fillText(title, tb * 0.4, tb * 0.52);
    g.fillStyle = '#e5352b'; g.fillRect(w - tb * 0.95, tb * 0.12, tb * 0.8, tb * 0.76); g.strokeStyle = '#ffffff'; g.lineWidth = tb * 0.1; g.beginPath(); g.moveTo(w - tb * 0.75, tb * 0.3); g.lineTo(w - tb * 0.35, tb * 0.7); g.moveTo(w - tb * 0.35, tb * 0.3); g.lineTo(w - tb * 0.75, tb * 0.7); g.stroke();
    g.strokeStyle = '#0a4fd6'; g.lineWidth = Math.max(6, h * 0.02); g.strokeRect(0, 0, w, h);
    body(g, 0, tb, w, h - tb);
  };
  const button = (g, x, y, w, h, text) => { g.fillStyle = '#ffffff'; g.fillRect(x, y, w, h); g.strokeStyle = '#12142b'; g.lineWidth = Math.max(3, h * 0.06); g.strokeRect(x, y, w, h); fitText(g, text, x + w / 2, y + h / 2, w * 0.85, h * 0.6, SANS, '#12142b', { lines: 1 }); };

  // ---- the centerpiece: Clippy, offering help to the whole grid ----
  {
    const p = { x: CLIPPY.x, z: CLIPPY.z, yaw: CLIPPY.yaw }; p.y = sc.y(p.x, p.z) - 0.3;
    const c = B.clippy({ H: CLIPPY.H }); sc.place(c, p.x, p.z, { yaw: p.yaw, y: p.y });
    taken.push([p.x, p.z, 26]);
    const r = atlas.add(1024, 600, (g, w, h) => {
      const pad = 18, bw = w - pad * 2, bh = h * 0.78;
      g.fillStyle = '#ffffe1'; g.strokeStyle = '#12142b'; g.lineWidth = 12;
      g.beginPath(); g.roundRect(pad, pad, bw, bh, 50); g.fill(); g.stroke();
      g.beginPath(); g.moveTo(w * 0.22, pad + bh - 6); g.lineTo(w * 0.1, h - 12); g.lineTo(w * 0.36, pad + bh - 6); g.closePath(); g.fill(); g.stroke();
      g.fillStyle = '#ffffe1'; g.fillRect(w * 0.22 + 6, pad + bh - 14, w * 0.14 - 12, 16);
      fitText(g, "IT LOOKS LIKE YOU'RE TRYING TO WIN.", w / 2, pad + bh * 0.22, bw * 0.9, 74, SANS, '#12142b', { lines: 2 });
      fitText(g, 'WOULD YOU LIKE HELP LOSING?', w / 2, pad + bh * 0.55, bw * 0.9, 70, SANS, '#0a4fd6', { lines: 1 });
      button(g, w * 0.16, pad + bh * 0.72, w * 0.3, bh * 0.2, 'YES'); button(g, w * 0.54, pad + bh * 0.72, w * 0.3, bh * 0.2, 'ALSO YES');
    });
    const bp = local(p, -21, 1, p.y + CLIPPY.H * 0.86), fx = Math.sin(p.yaw), fz = Math.cos(p.yaw);
    atlas.place(r, bp, p.yaw, 30, 17.6);
    atlas.place(r, [bp[0] - fx * 0.2, bp[1], bp[2] - fz * 0.2], p.yaw + Math.PI, 30, 17.6);
    const { brows, body } = c.userData;
    anim.push((dt, time) => { const t = time % 4; brows.position.y = t < 0.5 ? Math.sin(t / 0.5 * Math.PI) * 1.4 : t > 1 && t < 1.5 ? Math.sin((t - 1) / 0.5 * Math.PI) * 1.4 : 0; body.rotation.z = Math.sin(time * 0.9) * 0.05; body.rotation.x = Math.sin(time * 0.6) * 0.03; });
  }

  // ---- the bowl: a blue screen the size of a building ----
  {
    const p = spot(19, 1, 24), W = 34, H = 19, y = p.y + 4;
    legs(p, W, 4.5 + H * 0.4);
    const fr = new THREE.Mesh(new THREE.BoxGeometry(W + 1.4, H + 1.4, 0.8), new THREE.MeshStandardMaterial({ color: 0x1a1d29, roughness: 0.5 }));
    fr.position.set(...local(p, 0, -0.5, y + H / 2)); fr.rotation.y = p.yaw; group.add(fr); bake.add(fr);
    const r = atlas.add(1024, 572, (g, w, h) => {
      g.fillStyle = '#0a5fd6'; g.fillRect(0, 0, w, h);
      g.fillStyle = '#ffffff'; g.textAlign = 'left'; g.textBaseline = 'alphabetic';
      g.font = `200px ${XP}`; g.fillText(':(', 60, 210);
      const t = (s, y, size) => { g.font = `bold ${size}px ${XP}`; let k = size; while (g.measureText(s).width > w - 120 && k > 12) { k -= 2; g.font = `bold ${k}px ${XP}`; } g.fillText(s, 60, y); };
      t('YOUR KART RAN INTO A PROBLEM', 300, 64); t('AND NEEDS TO RESTART.', 370, 64);
      t('0% COMPLETE', 450, 46);
      t('STOP CODE: SKILL_ISSUE', 520, 40);
    });
    atlas.place(r, local(p, 0, -0.05, y + H / 2), p.yaw, W, H);
    taken.push([p.x, p.z, 22]);
  }

  // ---- the hairpin: the recycle bin, full of dead products ----
  {
    const p = spot(25, -1, 24), R = 7, H = 14; p.y -= 0.3;
    const bin = B.recycleBin({ R, H }); sc.place(bin, p.x, p.z, { yaw: p.yaw, y: p.y }); bake.add(bin);
    const dead = ['ZUNE', 'VISTA', 'CLIPPY', 'WINDOWS PHONE', 'INTERNET EXPLORER', 'GOOGLE+'];
    dead.forEach((name, k) => {
      const u = (k - 2.5) * 2.3, v = (k % 2 ? -1.5 : 1.5), top = H + 4 + (k % 3) * 2.2, q = { x: 0, z: 0, yaw: p.yaw }; const [x, , z] = local(p, u, v, 0); q.x = x; q.z = z; q.y = p.y + H - 2;
      const pole = S.post(top - H + 2, 0.15, 0x8a929e); sc.place(pole, q.x, q.z, { y: q.y }); bake.add(pole, false);
      atlas.place(board(name, { bg: ['#ffffff', '#ffd23c', '#7fd0ff', '#ff9ab0'][k % 4], fg: '#12142b', size: 110, border: '#12142b', font: SANS, lines: 2 }, 384, 200), local(q, 0, 0.2, p.y + top), p.yaw + rng.range(-0.25, 0.25), 4.8, 2.5);
    });
    atlas.place(board('RECYCLE BIN', { bg: '#ffffff', fg: '#0a4fd6', size: 120, border: '#0a4fd6', font: SANS, lines: 1 }, 768, 160), local(p, 0, R + 0.3, p.y + H * 0.55), p.yaw, 12, 2.5);
    const sp = { ...p, ...(([x, , z]) => ({ x, z }))(local(p, 0, -R - 4, 0)) };
    legs(sp, 22, H + 12);
    atlas.place(board('EMPTY RECYCLE BIN? [NO]', { bg: '#ece9d8', fg: '#12142b', size: 120, kicker: 'ARE YOU SURE?', kfg: '#0a4fd6', border: '#0a4fd6' }, 768, 300), local(sp, 0, 0, p.y + H + 12.5), p.yaw, 22, 8.6);
    taken.push([p.x, p.z, 18]);
  }

  // ---- the rolling hills: a dial-up modem the size of a barn ----
  {
    const p = spot(11.5, 1, 24); p.y = sc.y(p.x, p.z) - 0.4;
    const m = B.modem({ W: 26, D: 14, Hh: 6 }); sc.place(m, p.x, p.z, { yaw: p.yaw, y: p.y });
    const leds = m.userData.leds;
    anim.push((dt, time) => { leds.forEach((l, k) => { l.visible = Math.sin(time * (5 + k * 1.7) + k * 2.1) > -0.2; }); });
    atlas.place(board('56K', { bg: '#e6dcc0', fg: '#8f8a7c', size: 140, lines: 1, shadow: false }, 256, 128), local(p, 9.5, 7.08, p.y + 4.2), p.yaw, 3.6, 1.8);
    const sp = { ...p }; legs(sp, 24, 19, 0x8f8a7c);
    atlas.place(board("GET OFF THE PHONE, I'M ONLINE", { bg: '#12142b', fg: '#37ff6a', size: 120, kicker: 'CONNECTING AT 28.8K...', kfg: '#ffffff', font: SANS }, 768, 300), local(sp, 0, 0, p.y + 16), p.yaw, 22, 8.6);
    taken.push([p.x, p.z, 20]);
  }

  // ---- the back straight: an update progress bar the size of a building ----
  {
    const p = spot(22.9, -1, 26), W = 34, H = 15, y = p.y + 9;
    legs(p, W, 9 + H * 0.5);
    const st = { pct: 3 };
    const tex = canvasTex(1024, 452, xpWindow('INSTALLING UPDATES', (g, x0, y0, w, h) => {
      fitText(g, `UPDATE ${st.pct}%`, w / 2, y0 + h * 0.2, w * 0.9, 110, SANS, '#12142b', { lines: 1 });
      fitText(g, 'DO NOT TURN OFF YOUR KART', w / 2, y0 + h * 0.45, w * 0.9, 70, SANS, '#e5352b', { lines: 1 });
      const bx = w * 0.07, by = y0 + h * 0.62, bw = w * 0.86, bh = h * 0.2;
      g.fillStyle = '#ffffff'; g.fillRect(bx, by, bw, bh); g.strokeStyle = '#7a7a7a'; g.lineWidth = 6; g.strokeRect(bx, by, bw, bh);
      g.fillStyle = '#37c34a'; const n = Math.max(1, Math.round(st.pct / 3)); for (let k = 0; k < n; k++) g.fillRect(bx + 10 + k * 34, by + 10, 26, bh - 20);
      fitText(g, 'TIME REMAINING: 4 YEARS', w / 2, y0 + h * 0.92, w * 0.9, 40, SANS, '#12142b', { lines: 1 });
    }));
    const mat = new THREE.MeshStandardMaterial({ map: tex, emissiveMap: tex, emissive: 0xffffff, emissiveIntensity: 0.3, roughness: 0.6 });
    for (const s of [1, -1]) { const m = new THREE.Mesh(new THREE.PlaneGeometry(W, H), mat); m.position.set(...local(p, 0, s > 0 ? 0.05 : -0.35, y + H / 2)); m.rotation.y = p.yaw + (s > 0 ? 0 : Math.PI); group.add(m); }
    const seq = [1, 2, 3, 3, 2, 3, 1, 2, 3, 3]; let last = -1;
    anim.push((dt, time) => { const k = Math.floor(time / 2.5) % seq.length; if (k !== last) { last = k; st.pct = seq[k]; tex.redraw(); } });
    taken.push([p.x, p.z, 22]);
  }

  // ---- the meadow: the shortcut is a minefield ----
  {
    const p = spot(22.05, -1, 16); legs(p, 16, 9);
    atlas.place(board('SHORTCUT CONTAINS MINES (PROBABLY)', { bg: '#c0c0c0', fg: '#12142b', size: 120, kicker: 'MINESWEEPER', kfg: '#e5352b', border: '#7a7a7a', font: SANS }, 768, 300), local(p, 0, 0, p.y + 9.5), p.yaw, 16, 6.25);
    taken.push([p.x, p.z, 10]);
  }

  // ---- the finish: the solitaire win cascade, bouncing along the pit grandstands ----
  {
    const faces = [['A', '#e5352b', 'heart'], ['K', '#12142b', 'spade'], ['Q', '#e5352b', 'diamond'], ['J', '#12142b', 'club']];
    const suit = (g, kind, x, y, s, col) => {
      g.fillStyle = col; g.beginPath();
      if (kind === 'heart' || kind === 'spade') { const f = kind === 'spade' ? -1 : 1; g.moveTo(x, y + f * s * 0.9); g.bezierCurveTo(x - s * 1.4, y - f * s * 0.1, x - s * 0.6, y - f * s * 1.1, x, y - f * s * 0.35); g.bezierCurveTo(x + s * 0.6, y - f * s * 1.1, x + s * 1.4, y - f * s * 0.1, x, y + f * s * 0.9); g.fill(); if (f < 0) g.fillRect(x - s * 0.12, y + s * 0.2, s * 0.24, s * 0.9); }
      else if (kind === 'diamond') { g.moveTo(x, y - s); g.lineTo(x + s * 0.7, y); g.lineTo(x, y + s); g.lineTo(x - s * 0.7, y); g.fill(); }
      else { for (const [dx, dy] of [[0, -0.5], [-0.5, 0.2], [0.5, 0.2]]) { g.moveTo(x + dx * s + s * 0.45, y + dy * s); g.arc(x + dx * s, y + dy * s, s * 0.45, 0, 7); } g.fill(); g.fillRect(x - s * 0.12, y, s * 0.24, s * 0.95); }
    };
    const tex = canvasTex(1024, 360, (g, w, h) => {
      faces.forEach(([rank, col, kind], k) => {
        const x = k * 256 + 6, cw = 244, ch = h - 12;
        g.fillStyle = '#ffffff'; g.strokeStyle = '#12142b'; g.lineWidth = 6; g.beginPath(); g.roundRect(x, 6, cw, ch, 22); g.fill(); g.stroke();
        g.fillStyle = col; g.font = `bold 72px ${SANS}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(rank, x + 44, 56);
        suit(g, kind, x + cw / 2, h * 0.56, 66, col);
      });
    });
    const mat = new THREE.MeshStandardMaterial({ map: tex, emissiveMap: tex, emissive: 0xffffff, emissiveIntensity: 0.2, roughness: 0.5, side: THREE.DoubleSide });
    const TRAIL = 28, meshes = faces.map((_, k) => {
      const g = new THREE.PlaneGeometry(3.2, 4.5), uv = g.attributes.uv;
      for (let i = 0; i < uv.count; i++) uv.setX(i, (k + (uv.getX(i) ? 0.99 : 0.01)) / 4);
      const m = new THREE.InstancedMesh(g, mat, TRAIL * 2); m.frustumCulled = false; m.count = 0; group.add(m); return m;
    });
    // a bounce, worked out once: height above the roofline over 13 seconds
    const DT = 0.02, N = 650, Y = new Float32Array(N); { let y = 9, vy = 0; for (let i = 0; i < N; i++) { Y[i] = y; vy -= 22 * DT; y += vy * DT; if (y < 0) { y = -y * 0.5; vy = -vy * 0.78; } } }
    const g0 = sc.beside(0, 1, 0), z0 = g0.z - 4, x0 = g0.x + 2, y0 = track.py[g0.i] + 10.5;   // just behind the gantry, over the pit-side stands
    const Mx = new THREE.Matrix4(), Q = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, -0.5, 0)), Sv = new THREE.Vector3(1, 1, 1), Pv = new THREE.Vector3();
    anim.push((dt, time) => {
      for (const m of meshes) m.count = 0;
      for (let s = 0; s < 6; s++) {
        const age = ((time - s * 2.5) % 15 + 15) % 15; if (age > 12.6) continue;
        const m = meshes[s % 4];
        for (let k = 0; k < TRAIL; k++) {
          const a = age - k * 0.05; if (a < 0) break;
          const yy = Y[Math.min(N - 1, Math.floor(a / DT))];
          Pv.set(Math.min(95, x0 + a * 6.2), y0 + yy, z0 - a * 0.9 - s * 0.6); Mx.compose(Pv, Q, Sv); m.setMatrixAt(m.count++, Mx);
        }
      }
      for (const m of meshes) m.instanceMatrix.needsUpdate = true;
    });
  }
}
