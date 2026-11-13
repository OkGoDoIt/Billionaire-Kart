/* Davos Circuit: the third cup's alpine summit. A resort-level start among
   the private jets, a two-pitch climb up the wall past the fondue chalets,
   a banked Summit Bend that crests just past its apex, and a plunge down
   the far wall — past the GREAT RESET panel stage and through the security
   perimeter — to the valley floor. The biggest climb in the game.
   Design: docs/track-design-davos.md. Staging grammar from the Mount Wario
   descent (mk-reference/mk8-mountwario.jpg): crest first, the road falls
   away, red marker posts edge the drop, snow ridges at several depths.
   Polish round (PR #131, Roger's call): dressing only — no spline, corner,
   grade or obstacle changes. What changed is everything the camera sees:
   a snow-first terrain palette with blue-shadowed drifts and sparse glints
   (Mount Wario's snow light), a crisper sky, roadside pine rows and pasture
   fences where the scatter left gaps, the crest ramp rebuilt as a ski jump,
   a gondola climbing beside the upper traverse, a resort hotel + bunting +
   flags at the start, a chapel and chalets in the valley, and a lit security
   checkpoint on the lower plunge. */
import { fbm, ridged, smoothstep } from '../core/util.js';
import { Scenery, partsOf } from '../render/scenery.js';
import { makeGroundHit, EDGE } from '../track/track.js';
import * as P from '../models/props.js';
import * as M from '../models/props-davos.js';
import { bannerTexture } from '../render/textures.js';

export default {
  id: 'davos',
  name: 'Davos Circuit',
  tagline: 'The biggest climb in the game — and the plunge that pays for it.',
  lapNotes: [`<b>The summit approves.</b> Your lap time has been added to the agenda.`, `<b>Final lap.</b> Everything below you is now a stakeholder.`],   // shown as laps two and three begin
  laps: 3,
  width: 18,
  sky: 'day',
  // crisp alpine air: deeper zenith, fewer clouds, a lower sun for longer shadows, snow-bounce
  // hemisphere light, and the fog pushed far out so the Alps read as altitude haze, not grey soup
  skyOverrides: { zenith: 0x0f5fd8, horizon: 0xbfe3ff, cloudCover: 0.3, cloudScale: 0.9, sunDir: [0.55, 0.52, 0.35], sunLight: 0xfff2dc, sunIntensity: 3.4, hemiSky: 0xcfe6ff, hemiGround: 0xd7e4f0, hemiIntensity: 1.0, fog: 0xa9d6f8, fogNear: 300, fogFar: 1450, exposure: 1.02 },
  // opening shot: above the summit, looking down the plunge across the valley
  intro: [{ pos: [-64, 46, 372], pos1: [-84, 42, 356], look: [-120, 14, 210], look1: [-140, 10, 190], fov: 55, dur: 3.4 }],
  thumb: { at: 7.9, lat: 14, h: 12, back: 4, look: 42 },
  offroad: 'snow',
  defaults: { edge: 'open', shoulder: 3.5, outer: 12 },
  path: [
    { p: [0, 0, 0], bank: 0 },              // 0 start/finish on the resort straight, heading +x
    { p: [95, 0, 2], bank: 0 },             // 1 the jets on the apron to the right
    { p: [138, 3.5, 10], bank: 4, w: 19 },  // 2 Jet Corner: a real vertex — the climb starts under the sign
    { p: [152, 9.5, 80], bank: 5 },         // 3 pitch one, past the chalets
    { p: [168, 17.5, 186], bank: 7 },       // 4 top of pitch one
    { p: [138, 20.5, 246], bank: 7 },       // 5 Chalet Sweeper onto the upper traverse (the breather)
    { p: [100, 25, 280], bank: 8 },         // 6 pitch two attacks the top wall
    { p: [36, 29.7, 326], bank: 11 },       // 7 Summit Bend: max bank at max altitude
    { p: [-38, 31.1, 296], bank: 6 },       // 8 THE CREST — highest point of any track
    { p: [-102, 25, 248], bank: 5 },        // 9 the plunge begins; the panel stage watches
    { p: [-104, 19, 222], bank: 2 },        // 10 mid-plunge S-bend: swings back across the fall line, inside the security fence
    { p: [-173, 12.5, 106], bank: 7 },      // 11 lower plunge
    { p: [-182, 9.2, 45], bank: 9 },        // 12 Security Bend: a true vertex — the braking test
    { p: [-113, 3.4, 8], bank: 4 },         // 13 Valley Kink: the lap exhales onto the straight
  ],
  sides: [
    { from: 13.5, to: 1.3, side: 'L', edge: 'wall' },                     // resort wall behind the grid
    { from: 13.3, to: 1.6, side: 'R', outer: 30, shoulder: 4 },           // the jet tarmac apron
    { from: 2.2, to: 5.2, side: 'L', outer: 18 },                         // chalet meadow above pitch one
    { from: 6.4, to: 8.6, side: 'L', edge: 'wall' },                      // summit parapet on the outside of the bend
    { from: 10.9, to: 12.3, side: 'L', edge: 'wall' },                    // Security Bend's outside wall
  ],
  zones: [
    { from: 13.35, to: 1.35, skin: 'stone' },                             // resort slabs at the start
    { from: 5.7, to: 11.4, skin: 'snow' },                                // the white world: summit, crest, plunge
  ],
  ramps: [{ at: 8.12, len: 9, lift: 2.0 }],                               // off the crest: the Wario air moment
  boosts: [
    { at: 0.55, lat: 0, w: 5 },
    { at: 7.7, lat: -2, w: 6 },
    { at: 9.9, lat: 0, w: 6 },
    { at: 12.7, lat: 0, w: 5 },
  ],
  itemRows: [{ at: 1.4 }, { at: 3.78 }, { at: 7.35 }, { at: 8.54 }, { at: 10.92 }, { at: 13.02 }],
  coins: [
    { from: 0.15, to: 0.8, n: 3, lat: 4 },
    { from: 2.5, to: 3.2, n: 5, lat: [5, -3] },
    { from: 4.3, to: 5.1, n: 4, lat: 4 },
    { from: 6.5, to: 7.5, n: 5, lat: -4 },
    ...[[8.05, 2.2], [8.18, 3.4], [8.31, 3.9], [8.44, 3.2], [8.57, 1.8]].map(([at, air]) => ({ from: at, to: at, n: 1, lat: 0, air })), // on the arc over the crest
    { from: 9.5, to: 10.4, n: 5, lat: -3 },
    { from: 11.5, to: 12.3, n: 4, lat: -5 },
    { from: 12.8, to: 13.5, n: 3, lat: 3 },
  ],
  obstacles: [
    { kind: 'patrol', model: 'plow', at: 3.55, lats: [5.5, 8], speed: 2.2, effect: 'bump', radius: 2.2 },
    { kind: 'orbit', model: 'drone', at: 7.35, lat: 10, orbit: 5, speed: 5, effect: 'spin', radius: 1.6 },
    { kind: 'patrol', model: 'bot', at: 10.45, lats: [-7.5, -2], speed: 2.8, effect: 'spin', radius: 1.4 },
    { kind: 'static', model: 'crate', at: 0.8, lat: 7.6, effect: 'bump' },
    { kind: 'static', model: 'crate', at: 1.05, lat: -7.6, effect: 'bump' },
  ],
  terrain: {
    cell: 3, margin: 240, blend: 26, water: -5.5,
    fn(x, z) {
      let h = 1.5 + (fbm(x * 0.008, z * 0.008, 4, 31) - 0.5) * 7;                       // rolling valley land
      const val = 1 - smoothstep(90, 190, Math.hypot(x - 10, z - 30));                  // the resort floor, kept flat for the jets
      h = h * (1 - val) + 0.6 * val;
      h += (fbm(x * 0.045 + 9, z * 0.045, 2, 91) - 0.5) * 1.25 * (1 - val);             // wind drifts: soft mounds, kept off the resort floor
      const dome = 1 - smoothstep(110, 250, Math.hypot(x - 0, z - 305));                // the summit's mountain shoulder
      h = h * (1 - dome * 0.92) + (23 + (fbm(x * 0.016, z * 0.016, 3, 8) - 0.5) * 3.6) * (dome * 0.92);   // smoother shoulder: sculpted snow, not rubble
      h += smoothstep(190, 330, x) * 12 * smoothstep(-40, 120, z);                      // east shoulder beyond the climb
      h += smoothstep(-260, -420, x) * 16;                                              // the west massif
      const ring = smoothstep(320, 560, Math.hypot(x - 0, z - 150));                    // the far Alps: ridged peaks all round
      h += ring * (24 + ridged(x * 0.009, z * 0.009, 4, 7) * 34);
      const pond = 1 - smoothstep(26, 48, Math.hypot(x - 255, z + 75));                 // a frozen pond south-east of the resort
      h = h * (1 - pond) + (-7) * pond;
      return h;
    },
    // snow light, per vertex: hollows fall blue (Mount Wario's shadow colour) and exposed
    // snow throws sparse glints. Gentle on purpose — this runs over shoulders too.
    color(x, z, h, slope, over, out) {
      if (h < 2.5 || slope >= 0.45) return;
      const d = fbm(x * 0.02 + 40, z * 0.02, 2, 63), sh = (0.5 - d) * 0.22;
      out[0] -= sh * 0.55; out[1] -= sh * 0.28; out[2] += sh * 0.35;
      const g = Math.sin(x * 127.1 + z * 311.7) * 43758.5453;
      if (g - Math.floor(g) > 0.972) { out[0] = Math.min(1, out[0] * 1.22 + 0.05); out[1] = Math.min(1, out[1] * 1.22 + 0.05); out[2] = Math.min(1, out[2] * 1.18 + 0.04); }
    },
  },
  look: {
    road: { base: 0x565d6b, line: 0xffffff, center: 0xffd23c },
    kerb: [0xe23b3b, 0xf7f7f2],
    shoulder: 0xe9eff6,
    groundDetail: 0.07, groundScale: 2,   // fine, faint grain: the old 0.2 blotch quilted every hillside
    terrain: { low: 0xa4b98e, high: 0xdfe9f2, dry: 0xb3ab90, rock: 0x6d7683, sand: 0xd9d3c0, dirt: 0x8a7a63, snow: 0xffffff, snowLine: 3 },
    wall: 0xf1f1ee, wallStripe: 0x1f2a44,
    water: 0x9fd4e8, rail: 0xe23b3b,
    ads: ['GREAT RESET ENERGY', 'AGENDA COLA', 'STAKEHOLDER BANK', 'SUMMIT NOW, PAY LATER', 'NET ZERO* (*ISH)', 'BUILD BACK BUTTER', 'FOURTH INDUSTRIAL BREAKFAST', 'GLOBAL SHAPERS GYM', 'CONSCIOUS COCOA', 'ELITES ONLY BEYOND THIS POINT', 'PANEL 4: THE SNOW', 'PUBLIC-PRIVATE POPSICLES'],
  },
  models: { plow: M.plow },

  /** Dress the course. ctx: { THREE, track, group, gfx, anim, view } */
  decorate(ctx) { dress(ctx); },
};

const BILLBOARDS = ['SUMMIT NOW, PAY LATER', 'NO PUBLIC MONEY BEYOND THIS POINT', 'CONSCIOUS COCOA', 'ELITES ONLY BEYOND THIS POINT', 'BUILD BACK BUTTER', 'AGENDA COLA', 'PANEL 4: THE SNOW'];
const SUITS = [0xf2efe6, 0xe9e4d8, 0xdfe3ea, 0x1f2a44, 0x8a2f2a, 0x2a4a6b, 0xf6f1e4, 0x3a3f47];

function dress(ctx) {
  const { track, anim, view } = ctx, sc = new Scenery(ctx), rng = sc.rng;
  const hit = makeGroundHit();
  const near = (x, z, p, r) => (x - p.x) ** 2 + (z - p.z) ** 2 < r * r;
  /** True when (x,z) is beyond where a kart can drive, by margin m. */
  const clear = (x, z, m = 1.5) => {
    const g = track.ground(x, z, -1, hit), i = g.i;
    if (g.onRoad) return false;
    if (track.bridge[i] && Math.abs(g.lat) < Math.max(track.hwL[i], track.hwR[i]) + 6) return false;
    const edge = g.side > 0 ? g.edgeL : g.edgeR;
    if (edge !== EDGE.OPEN) return g.outside > m + 0.8;
    return g.outside > (g.side > 0 ? track.outerL[i] : track.outerR[i]) + m;
  };
  const taken = [];
  const free = (x, z, r = 0) => !taken.some(t => near(x, z, t, t.r + r));
  const take = (x, z, r) => taken.push({ x, z, r });

  // ---- start/finish: gantry, grandstands behind the resort wall, the crowd in dark suits ----
  const g0 = sc.beside(0, 1, -track.hwL[0]);
  const gantry = P.gantry(track.hwL[0] + track.hwR[0] + 1.5, 'DAVOS CIRCUIT', { color: 0x1f2a44, color2: 0xc9a227 });
  sc.place(gantry, g0.x, g0.z, { yaw: g0.along, y: g0.roadY });
  view.startLights = gantry.userData.lights;
  const stand = P.grandstand({ w: 30, rows: 6, color: 0x1f2a44 }), stand2 = P.grandstand({ w: 30, rows: 6, color: 0x8a2f2a });
  const seats = [], Mx = new ctx.THREE.Matrix4(), V = new ctx.THREE.Vector3();
  const putStand = (proto, p) => {
    const g = proto.group.clone(); sc.place(g, p.x, p.z, { yaw: p.yaw, y: p.y }); take(p.x, p.z, 20);
    g.updateMatrixWorld(true); Mx.copy(g.matrixWorld);
    for (const s of proto.seats) if (rng() < 0.8) { V.set(s[0], s[1], s[2]).applyMatrix4(Mx); seats.push({ x: V.x, y: V.y, z: V.z, yaw: p.yaw + rng.range(-0.4, 0.4) }); }
  };
  sc.along({ from: 13.55, to: 1.25, side: 1, offset: 7, spacing: 34 }).forEach((p, i) => putStand(i % 2 ? stand2 : stand, p));
  sc.instances(partsOf(P.spectator()), seats, { scale: [0.95, 1.2], tints: SUITS, cast: false });

  /* -- polish: the start straight is the resort's front door, not an empty road --
     the grand hotel on the apron side, pennant rows down the verge, bunting over
     the gantry sector, and a lamp row that the valley lamps pick up later. */
  const hotel = sc.beside(0.42, 1, 41);
  if (clear(hotel.x, hotel.z, 16)) { sc.place(M.grandHotel(), hotel.x, hotel.z, { yaw: hotel.yaw, y: hotel.y + 0.1 }); take(hotel.x, hotel.z, 19); }
  const flagsN = [], flagsG = [];
  sc.along({ from: 0.14, to: 1.58, side: 1, offset: 4.2, spacing: 9 }).forEach((p, k) => (k % 2 ? flagsG : flagsN).push({ ...p, y: p.y - 0.1 }));
  sc.instances(partsOf(M.flagPole(7, { color: 0x1f2a44 })), flagsN, { cast: false });
  sc.instances(partsOf(M.flagPole(11, { color: 0xc9a227 })), flagsG, { cast: false });
  const bunt1 = sc.beside(0.82, 0, 0), bunt2 = sc.beside(1.22, 0, 0);
  sc.place(M.bunting(track.hwL[bunt1.i] + track.hwR[bunt1.i] + 3), bunt1.x, bunt1.z, { yaw: bunt1.along, y: bunt1.y + 7.4 });
  sc.place(M.bunting(track.hwL[bunt2.i] + track.hwR[bunt2.i] + 3, { sag: 1.4, flags: 11 }), bunt2.x, bunt2.z, { yaw: bunt2.along, y: bunt2.y + 7.2 });
  const lamps = [];   // along()'s yaw faces the road, so each lamp's arm reaches over the verge
  sc.along({ from: 13.6, to: 1.5, side: 1, offset: 3.1, spacing: 12 }).forEach(p => lamps.push({ ...p, y: p.y - 0.05 }));
  sc.along({ from: 13.6, to: 1.5, side: -1, offset: 3.1, spacing: 12, phase: 6 }).forEach(p => lamps.push({ ...p, y: p.y - 0.05 }));

  // ---- the jets: three of them parked on the tarmac apron, rotated like they own it ----
  const jetSpots = [[0.35, 25, 0.12], [0.95, 29, -0.06], [1.5, 24, 0.2]];
  jetSpots.forEach(([at, off, dyaw], i) => {
    const p = sc.beside(at, -1, off);
    sc.place(M.privateJet(3 + i * 5, { accent: [0xc9a227, 0x8a2f2a, 0x1f2a44][i] }), p.x, p.z, { yaw: p.along + dyaw, y: p.y, solid: 7 });
    take(p.x, p.z, 13);
  });
  const signP = sc.beside(1.78, -1, 13.5);
  sc.place(M.roadSign('PRIVATE JETS ONLY', { w: 10, h: 2.6 }), signP.x, signP.z, { yaw: signP.yaw, y: signP.y });
  const sign2 = sc.beside(2.35, 1, 14);
  sc.place(M.roadSign('THE CLIMB IS PRIVATE TOO', { w: 11, h: 2.6, bg: '#5d3d22' }), sign2.x, sign2.z, { yaw: sign2.yaw, y: sign2.y });

  // ---- the chalets on pitch one: fondue and chocolate, standing ON the hillside ----
  const ch1 = sc.beside(3.2, 1, 24);
  sc.place(M.chalet(4, { sign: 'FONDUE — $400' }), ch1.x, ch1.z, { yaw: ch1.yaw, y: ch1.y - 0.2 }); take(ch1.x, ch1.z, 10);
  const ch2 = sc.beside(4.15, 1, 28);
  sc.place(M.chalet(9, { sign: 'HOT CHOCOLATE — $300' }), ch2.x, ch2.z, { yaw: ch2.yaw, y: ch2.y - 0.2 }); take(ch2.x, ch2.z, 10);
  const ch3 = sc.beside(5.3, 1, 30);
  if (clear(ch3.x, ch3.z, 8)) { sc.place(M.chalet(14, {}), ch3.x, ch3.z, { yaw: ch3.yaw + 0.4, y: ch3.y - 0.2 }); take(ch3.x, ch3.z, 10); }

  /* -- polish: the village thickens — two more signed chalets, spare chalets instanced
     into the gaps, firewood against the walls, pasture fences along the meadow, and
     the valley chapel watching the home straight. */
  const ch4 = sc.beside(5.55, 1, 27);
  if (clear(ch4.x, ch4.z, 8)) { sc.place(M.chalet(21, { sign: 'GLÜHWEIN — $250' }), ch4.x, ch4.z, { yaw: ch4.yaw + 0.15, y: ch4.y - 0.2 }); take(ch4.x, ch4.z, 10); }
  const ch5 = sc.beside(12.95, -1, 26);
  if (clear(ch5.x, ch5.z, 8)) { sc.place(M.chalet(26, { sign: 'SKI VALET — $180' }), ch5.x, ch5.z, { yaw: ch5.yaw, y: ch5.y - 0.2 }); take(ch5.x, ch5.z, 10); }
  const spares = [];
  for (const [at, side, off] of [[6.05, 1, 32], [13.32, -1, 23]]) { const p = sc.beside(at, side, off); if (clear(p.x, p.z, 8) && free(p.x, p.z, 10)) { spares.push({ ...p, y: p.y - 0.2 }); take(p.x, p.z, 10); } }
  sc.instances(partsOf(M.chalet(33, {})), spares, {});
  const pile1 = sc.beside(3.35, 1, 18.5);
  if (clear(pile1.x, pile1.z, 2)) { sc.place(M.woodPile(), pile1.x, pile1.z, { yaw: pile1.yaw, y: pile1.y - 0.05 }); take(pile1.x, pile1.z, 2); }
  const pile2 = sc.beside(12.8, -1, 18.5);
  if (clear(pile2.x, pile2.z, 2)) { sc.place(M.woodPile(), pile2.x, pile2.z, { yaw: pile2.yaw, y: pile2.y - 0.05 }); take(pile2.x, pile2.z, 2); }
  const fences = [...sc.along({ from: 2.5, to: 4.9, side: 1, offset: 9.5, spacing: 4.6 }), ...sc.along({ from: 12.35, to: 12.95, side: 1, offset: 5.4, spacing: 4.6 })].filter(p => free(p.x, p.z, 1));
  sc.instances(partsOf(M.woodFence()), fences, { sink: 0.08 });
  const chapelP = sc.beside(13.16, -1, 36);
  if (clear(chapelP.x, chapelP.z, 9)) { sc.place(M.chapel(), chapelP.x, chapelP.z, { yaw: chapelP.yaw, y: chapelP.y - 0.1 }); take(chapelP.x, chapelP.z, 9); }

  // ---- the panel stage below the crest, looking down on everything it owns ----
  const stage = sc.beside(8.35, 1, 26);
  const stageG = M.panelStage();
  sc.place(stageG, stage.x, stage.z, { yaw: stage.yaw, y: stage.y - 0.15 }); take(stage.x, stage.z, 17);
  // polish: the panel finally has an audience — suited figures on the bench rows
  stageG.updateMatrixWorld(true);
  const audM = new ctx.THREE.Matrix4().copy(stageG.matrixWorld), audV = new ctx.THREE.Vector3(), aud = [];
  for (let rI = 0; rI < 3; rI++) for (let i = 0; i < 9; i++) if (rng() < 0.75) { audV.set((i - 4) * 2.6 + rng.range(-0.5, 0.5), 0.68, 8.5 + rI * 2.2 + rng.range(-0.3, 0.3)).applyMatrix4(audM); aud.push({ x: audV.x, y: audV.y, z: audV.z, yaw: stage.yaw + Math.PI + rng.range(-0.3, 0.3) }); }
  sc.instances(partsOf(P.spectator()), aud, { scale: [0.95, 1.2], tints: SUITS, cast: false });

  /* -- polish: a gondola climbs beside the upper traverse — pylons, two cable runs,
     five cabins — and its station is a chalet at the crest approach. */
  const gTop = [], liftP = sc.beside(8.28, 1, 15);
  for (const [at, off] of [[5.95, 20], [6.95, 22], [7.95, 18]]) {
    const p = sc.beside(at, 1, off);
    sc.place(M.gondolaPylon({ h: 13 }), p.x, p.z, { yaw: p.along, y: p.y - 0.2 }); take(p.x, p.z, 5);
    const li = track.indexAtCp(at), u = Math.hypot(track.lx[li], track.lz[li]) || 1;
    gTop.push([p.x, p.y + 12.85, p.z, track.lx[li] / u, track.lz[li] / u]);
  }
  if (clear(liftP.x, liftP.z, 8) && free(liftP.x, liftP.z, 10)) {
    sc.place(M.chalet(41, { sign: 'SUMMIT LIFT — $450' }), liftP.x, liftP.z, { yaw: liftP.yaw, y: liftP.y - 0.2 }); take(liftP.x, liftP.z, 10);
    const li = track.indexAtCp(8.28), u = Math.hypot(track.lx[li], track.lz[li]) || 1;
    gTop.push([liftP.x, liftP.y + 9.3, liftP.z, track.lx[li] / u, track.lz[li] / u]);
  }
  if (gTop.length >= 2) {
    const cablePts = off => gTop.map(t => [t[0] + t[3] * off, t[1], t[2] + t[4] * off]);
    for (const off of [-1.6, 1.6]) { const pts = cablePts(off); for (let k = 0; k + 1 < pts.length; k++) ctx.group.add(M.tubeBetween(pts[k], pts[k + 1], 0.045)); }
    const cabSpots = [[0, 0.3, -1.6, 0x8a2f2a], [0, 0.75, 1.6, 0x1f2a44], [1, 0.45, -1.6, 0xc9a227], [2, 0.35, 1.6, 0x8a2f2a], [2, 0.8, -1.6, 0x2a4a6b]];
    for (const acc of [0x8a2f2a, 0x1f2a44, 0xc9a227, 0x2a4a6b]) {
      const spots = [];
      for (const [seg, t, off, a] of cabSpots) {
        if (a !== acc || seg + 1 >= gTop.length) continue;
        const A = gTop[seg], B = gTop[seg + 1];
        const cx = A[0] + (B[0] - A[0]) * t + A[3] * off, cy = A[1] + (B[1] - A[1]) * t, cz = A[2] + (B[2] - A[2]) * t + A[4] * off;
        spots.push({ x: cx, y: cy - 3.45, z: cz, yaw: Math.atan2(B[0] - A[0], B[2] - A[2]) });
      }
      if (spots.length) sc.instances(partsOf(M.gondolaCabin(5, { accent: acc })), spots, { cast: false });
    }
  }

  // ---- the watchtower inside the plunge: its searchlight sweeps the braking zone ----
  const tw = sc.beside(10.5, -1, 19);
  const tower = M.watchtower({ h: 16 });
  sc.place(tower, tw.x, tw.z, { yaw: tw.yaw, y: tw.y - 0.2 }); take(tw.x, tw.z, 6);
  const beam = tower.userData.beam;
  anim.push((dt, time) => { beam.rotation.y = Math.sin(time * 0.32) * 1.0; beam.rotation.x = -0.12 + Math.sin(time * 0.83) * 0.06; });
  const sign3 = sc.beside(9.45, 1, 13);
  sc.place(M.roadSign('SECURITY PERIMETER — SMILE', { w: 11, h: 2.6, bg: '#8a2f2a' }), sign3.x, sign3.z, { yaw: sign3.yaw, y: sign3.y });

  /* -- polish: the perimeter gets a gate — a lit checkpoint spanning the road on the
     lower plunge, floodlights, a parked security van, and the fence mirrored on the
     inside. Booths stand beyond the road edge; the lane itself stays clear. */
  const chk = sc.beside(11.95, 0, 0);
  sc.place(M.checkpoint(track.hwL[chk.i] + track.hwR[chk.i] + 7), chk.x, chk.z, { yaw: chk.along, y: chk.roadY });
  const fl1 = sc.beside(11.55, 1, 10.5);
  sc.place(M.floodlight(), fl1.x, fl1.z, { yaw: fl1.yaw, y: fl1.y - 0.1 }); take(fl1.x, fl1.z, 3);
  const fl2 = sc.beside(12.35, -1, 10.5);
  sc.place(M.floodlight(), fl2.x, fl2.z, { yaw: fl2.yaw, y: fl2.y - 0.1 }); take(fl2.x, fl2.z, 3);
  const van = sc.beside(12.22, -1, 14.5);
  if (clear(van.x, van.z, 4)) { sc.place(M.securityVan(), van.x, van.z, { yaw: van.along + 0.12, y: van.y - 0.05 }); take(van.x, van.z, 4); }
  sc.along({ from: 11.85, to: 13.5, side: -1, offset: 3.3, spacing: 11 }).forEach(p => lamps.push({ ...p, y: p.y - 0.05 }));
  sc.along({ from: 12.3, to: 13.5, side: 1, offset: 3.3, spacing: 11, phase: 5 }).forEach(p => lamps.push({ ...p, y: p.y - 0.05 }));
  sc.instances(partsOf(M.lampPost()), lamps, { cast: false });

  // ---- the fence runs post by post down the plunge's outside ----
  const fence = sc.along({ from: 9.35, to: 12.25, side: 1, offset: 1.6, spacing: 4.4 });
  sc.instances(partsOf(M.fencePanel()), fence, {});
  const fenceR = sc.along({ from: 10.95, to: 12.3, side: -1, offset: 1.6, spacing: 4.4, phase: 2.2 });
  sc.instances(partsOf(M.fencePanel()), fenceR, {});

  // ---- snow banks hug both edges of the white world; red posts edge the plunge ----
  const bankA = partsOf(M.snowBank(2)), bankB = partsOf(M.snowBank(8));
  const bankSpots = (from, to, side) => sc.along({ from, to, side, offset: 4.3, spacing: 7.5, jitter: 1.2 });
  const banksL = [...bankSpots(1.55, 6.35, 1), ...bankSpots(8.65, 10.85, 1), ...bankSpots(12.35, 13.35, 1)];
  const banksR = [...bankSpots(1.7, 6.35, -1), ...bankSpots(8.65, 13.15, -1)];
  sc.instances(bankA, banksL.filter((_, i) => i % 2 === 0), { scale: [0.9, 1.3], sink: 0.25 });
  sc.instances(bankB, banksL.filter((_, i) => i % 2 === 1), { scale: [0.9, 1.3], sink: 0.25 });
  sc.instances(bankA, banksR.filter((_, i) => i % 2 === 1), { scale: [0.9, 1.3], sink: 0.25 });
  sc.instances(bankB, banksR.filter((_, i) => i % 2 === 0), { scale: [0.9, 1.3], sink: 0.25 });
  const posts = [...sc.along({ from: 8.05, to: 11.7, side: 1, offset: 0.7, spacing: 6.5 }), ...sc.along({ from: 8.05, to: 11.7, side: -1, offset: 0.7, spacing: 6.5, phase: 3 })];
  sc.instances(partsOf(M.redPost()), posts, {});

  /* -- polish: the crest ramp is a built ski jump now, not a floating slab. Navy skirts
     with gold trim hang from both edges, steel pillars carry it, and a tower arch at
     the lip carries THE CREST over the takeoff. The chevron surface itself is the
     engine's ramp material — this dresses everything around it. */
  {
    const r = track.ramps[0], EV = new ctx.THREE.Vector3();
    const liftAt = t => r.lift * (0.35 * t + 0.65 * t * t);
    const edgeAt = (t, side) => { const i = Math.min(track.N - 1, Math.floor((r.s0 + r.len * t) / track.ds)); track.pointAt(r.s0 + r.len * t, side * ((side > 0 ? track.hwL[i] : track.hwR[i]) + 0.12), EV, liftAt(t)); return [EV.x, EV.y, EV.z]; };
    const surfAt = (t, side) => { const i = Math.min(track.N - 1, Math.floor((r.s0 + r.len * t) / track.ds)); track.pointAt(r.s0 + r.len * t, side * ((side > 0 ? track.hwL[i] : track.hwR[i]) - 0.3), EV, 0); return EV.y; };
    const sidesE = { L: [0, 0.25, 0.5, 0.75, 1].map(t => edgeAt(t, 1)), R: [0, 0.25, 0.5, 0.75, 1].map(t => edgeAt(t, -1)) };
    const pillars = [];
    for (const side of [1, -1]) for (const t of [0.2, 0.55, 0.9]) { const e = edgeAt(t, side); pillars.push([e[0], e[2], e[1] - 0.25, surfAt(t, side) - 0.15]); }
    const towers = [1, -1].map(side => { const i = Math.min(track.N - 1, Math.floor((r.s0 + r.len + 0.5) / track.ds)); const hw = (side > 0 ? track.hwL[i] : track.hwR[i]) + 1.4; track.pointAt(r.s0 + r.len + 0.5, side * hw, EV, 0); return { x: EV.x, z: EV.z, y0: EV.y - 0.4, y1: EV.y + 6.2 }; });
    ctx.group.add(M.crestJump({ L: sidesE.L, R: sidesE.R, pillars, towers, travelYaw: track.yawAt(r.s0 + r.len) }));
  }

  // ---- pines on the hillsides, rocks where the mountain shows through ----
  const pineA = partsOf(M.snowPine(3)), pineB = partsOf(M.snowPine(11, { h: 11 }));
  const pineC = partsOf(M.snowPine(23, { h: 12.5 })), pineD = partsOf(M.snowPine(31, { h: 6.5 }));
  const pines = sc.scatter({ count: 330, min: 12, max: 175, maxSlope: 0.85, minGap: 6, where: (x, z) => clear(x, z, 1.5) && free(x, z, 3) });
  sc.instances(pineA, pines.filter((_, i) => i % 2 === 0), { scale: [0.85, 1.25], yaw: 'random', sink: 0.2 });
  sc.instances(pineB, pines.filter((_, i) => i % 2 === 1), { scale: [0.8, 1.15], yaw: 'random', sink: 0.2 });
  /* polish: roadside rows where the scatter left the camera's view bare — the climb,
     the plunge and the valley get a continuous treeline at the shoulder (Mount Wario's
     red-post rule: the edge reads as a designed line, not as gaps). */
  const rowSpots = [
    ...sc.along({ from: 2.55, to: 5.5, side: 1, offset: 6.2, spacing: 5.6, jitter: 1.6 }),
    ...sc.along({ from: 2.9, to: 6.1, side: -1, offset: 6.8, spacing: 6.4, jitter: 1.8 }),
    ...sc.along({ from: 8.75, to: 10.6, side: 1, offset: 6.2, spacing: 5.8, jitter: 1.6 }),
    ...sc.along({ from: 8.75, to: 12.15, side: -1, offset: 6.6, spacing: 6.2, jitter: 1.8 }),
    ...sc.along({ from: 12.3, to: 13.6, side: 1, offset: 6.4, spacing: 6.6, jitter: 1.6 }),
    ...sc.along({ from: 12.35, to: 13.15, side: -1, offset: 7.4, spacing: 7, jitter: 1.8 }),
  ].filter(p => free(p.x, p.z, 2));
  const rowSets = [pineA, pineB, pineC, pineD];
  rowSets.forEach((set, v) => sc.instances(set, rowSpots.filter((_, i) => i % 4 === v), { scale: [0.8, 1.3], yaw: 'random', sink: 0.2 }));
  const rocks = sc.scatter({ count: 80, min: 13, max: 150, maxSlope: 1.1, minGap: 9, where: (x, z) => clear(x, z, 1.5) && free(x, z, 3) });
  sc.instances(partsOf(P.rock(5, { color: 0x707a88 })), rocks, { scale: [0.7, 1.7], yaw: 'random', sink: 0.35 });
  const bigRocks = sc.along({ from: 9.9, to: 11.6, side: 1, offset: 7.5, spacing: 12, jitter: 2 }).filter(p => free(p.x, p.z, 3));
  sc.instances(partsOf(P.rock(9, { color: 0x707a88 })), bigRocks, { scale: [1.5, 2.5], yaw: 'random', sink: 0.45 });

  // ---- balloons over the valley: the other way to arrive ----
  const bal1 = P.balloon([0x1f2a44, 0xc9a227], 2), bal2 = P.balloon([0x8a2f2a, 0xf4f6f8], 6);
  sc.place(bal1, -80, 120, { y: 58 }); sc.place(bal2, 150, 60, { y: 66 });
  anim.push((dt, time) => { bal1.position.y = 58 + Math.sin(time * 0.24) * 2.2; bal2.position.y = 66 + Math.sin(time * 0.19 + 2) * 2.6; });

  // ---- arrow boards on the outside of every real corner ----
  for (const c of track.corners) {
    const side = c.dir > 0 ? -1 : 1, n = Math.max(2, Math.min(5, Math.round(c.len / 15)));
    for (let k = 0; k < n; k++) {
      const i = (c.i0 + Math.round(((k + 0.6) / n) * (c.len / track.ds))) % track.N;
      if (track.tunnel[i] || track.bridge[i]) continue;
      const p = sc.beside(track.cp[i], side, (side > 0 ? track.outerL[i] : track.outerR[i]) + 1.2);
      const b = P.chevronBoard(0xe23b3b); if (c.dir > 0) b.scale.x = -1;
      sc.place(b, p.x, p.z, { yaw: p.yaw, lift: 0.9 }); if (c.dir > 0) b.scale.x = -1;
    }
  }

  // ---- billboards where you are looking anyway ----
  [[1.9, -1, 17], [3.4, 1, 21], [5.2, -1, 19], [7.0, 1, 24], [9.6, -1, 19], [11.2, 1, 21], [12.9, -1, 17]].forEach(([at, side, off], i) => {
    const p = sc.beside(at, side, off), tex = bannerTexture([BILLBOARDS[i]], i + 21);
    tex.repeat.set(0.25, 1);
    sc.place(P.billboard(tex, { w: 15, h: 5, legs: 6, frame: 0x1f2a44 }), p.x, p.z, { yaw: p.yaw + rng.range(-0.12, 0.12) });
  });
}
