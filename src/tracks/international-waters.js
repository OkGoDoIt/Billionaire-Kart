/* International Waters: an offshore tax-haven harbour, and a race across the
   yachts moored in it. The lap: the marina quay under the raked bows of three
   superyachts, the Sandbar Hairpin round a sand spit, a run east and a hard
   right down the channel between two yachts while karts fly over your head,
   across the seastead's deck, then up the quay ramp and the YACHT HOP: aboard
   SOVEREIGN IMMUNITY (through her salon, off her bow helipad), over the
   channel onto FAIR & BALANCED, onto HOSTILE TAKEOVER, and off her bow back
   to the causeway. Each yacht rides its own swell, so every jump is a little
   different. Then customs, which waves everyone through. On the final lap the
   tide goes out: the yachts sit lower and the sandbar inside the hairpin dries.
   Original brief: docs/track-design-waters.md.
   Painted horizon: assets/tracks/international-waters/prompts.md. */
import { fbm, smoothstep } from '../core/util.js';
import { Scenery, partsOf } from '../render/scenery.js';
import * as P from '../models/props.js';
import * as W from '../models/props-international-waters.js';
import { ModelBuilder, box, cyl, paint, MAT } from '../models/build.js';
import { roadSkin } from '../render/textures.js';
import { makeChevronMaterial } from '../track/trackmesh.js';

const ADS = ['NO JURISDICTION', 'TAX HAVEN AHEAD', 'FLAG OF CONVENIENCE', 'EXTRADITION FREE ZONE', 'DUTY FREE SPEED', 'NO LAWS JUST LAPS', 'OFFSHORE AND ON COURSE', 'TWELVE MILES OUT', 'SEASTEAD SUITES', 'SMUGGLERS WELCOME'];
const SEA = -1.1, LOW_TIDE = -2.35;           // the sea at high water, and on the final lap
const tideOf = race => (race && race.lakeY != null ? race.lakeY - SEA : 0);
/* The yachts the road runs across. from/to: the deck stretch in control
   params; x0/x1: stern and bow tip in world x (they lie along +x); road: deck
   height; swell: amplitude (m), period (s), phase. */
const YACHTS = [
  { name: 'SOVEREIGN IMMUNITY', from: 21.48, to: 25.97, x0: -128, x1: -6, z0: 0, z1: 0, road: 12, B: 13, boot: 0xd9a63a, amp: 0.35, period: 6.4, phase: 0.0,
    salon: [-40, 15], uppers: [[-34, 10, 3.2], [-26, 4, 3.0], [-16, -1, 2.4]], helipad: 38, header: 'OWNERS ONLY (AND KARTS)' },
  { name: 'FAIR & BALANCED', from: 27.96, to: 31.98, x0: 6.5, x1: 80.5, z0: 0, z1: 0, road: 9.5, B: 12, boot: 0x2456a6, amp: 0.85, period: 4.8, phase: 1.3,
    salon: [-20, 12], uppers: [[-16, 6, 3], [-10, 1, 2.4]], dishes: true, header: 'SOURCES SAY: FLOOR IT' },
  { name: 'HOSTILE TAKEOVER', from: 34.18, to: 38.0, x0: 85.5, x1: 155.5, z0: 0.45, z1: 3.5, road: 8, B: 12, boot: 0xc8323a, amp: 1.0, period: 5.4, phase: 3.0,
    salon: [-18, 10], uppers: [[-13, 4, 2.8]], header: 'BOARDROOM: TAKEOVERS ONLY' },
];
const SPIT = { x: -122, z: -76, rx: 17, rz: 12 };                    // the sandbar inside the hairpin
const spitE = (x, z) => Math.hypot((x - SPIT.x) / SPIT.rx, (z - SPIT.z) / SPIT.rz);
const WADE = { id: 'wade', speed: 0.42, grip: 0.7, dust: 0xbfe8ff, rumble: 0.3, offroad: true, splash: true };
const WET_SAND = { id: 'wetsand', speed: 0.8, grip: 0.85, dust: 0xd9c08a, rumble: 0.2 };
const DRY_SAND = { id: 'sand', speed: 0.52, grip: 0.75, dust: 0xe2c58f, rumble: 0.25, offroad: true };

export default {
  id: 'international-waters',
  name: 'International Waters',
  tagline: 'No jurisdiction. No speed limit.',
  laps: 3,
  width: 18,
  sky: 'day',
  skyOverrides: { zenith: 0x0d5bd6, horizon: 0x9fdcff, sunDir: [0.42, 0.6, 0.52], fogNear: 320, fogFar: 1500, sunIntensity: 3.5, cloudCover: 0.36 },
  backdrop: { img: 'assets/backdrops/international-waters.webp', top: 9.4, bottom: -0.35, rot: 0.08 },
  offroad: 'sand',
  defaults: { edge: 'void', shoulder: 0, outer: 11 },
  // a figure eight: the low road (cp ~9.5, +1.6 m) runs down the channel under
  // the jump from SOVEREIGN IMMUNITY to FAIR & BALANCED (cp ~27, +12 m)
  path: [
    { p: [40, 0.6, -110] },            // 0 start/finish: the marina quay, heading west under the bows
    { p: [-50, 0.6, -111] },           // 1
    { p: [-100, 0.4, -106] },          // 2 the Sandbar Hairpin: turn-in, onto the spit
    { p: [-140, 0.3, -97] },           // 3
    { p: [-148, 0.2, -76] },           // 4 apex, the sandbar inside
    { p: [-138, 0.3, -56] },           // 5
    { p: [-102, 0.6, -46] },           // 6 exit, heading east past the yacht chain
    { p: [-60, 1.0, -46] },            // 7
    { p: [-26, 1.4, -40] },            // 8 the Channel Turn
    { p: [-5, 1.6, -18], w: 14 },      // 9 the channel between two yachts: karts fly overhead
    { p: [-4, 1.7, 20], w: 14 },       // 10
    { p: [-16, 2.2, 52] },             // 11 turn west
    { p: [-60, 2.8, 74] },             // 12
    { p: [-120, 3.6, 80] },            // 13 across the seastead
    { p: [-180, 4.8, 66] },            // 14
    { p: [-210, 6.0, 30] },            // 15 the West Turn
    { p: [-196, 7.4, 4] },             // 16 heading east, the climb to the quay ramp
    { p: [-168, 11.6, 1] },            // 17
    { p: [-154, 13, 0], w: 14 },       // 18 the quay ramp
    { p: [-140, 13, 0], w: 14 },       // 19 its lip
    { p: [-138, 13, 0], w: 14 },       // 20 (over the water)
    { p: [-130, 12, 0], w: 14 },       // 21 (over the water)
    { p: [-127, 12, 0], w: 14 },       // 22 aboard SOVEREIGN IMMUNITY: her aft deck
    { p: [-98, 12, 0], w: 14 },        // 23 through her salon
    { p: [-68, 12, 0], w: 14 },        // 24
    { p: [-40, 12, 0], w: 14 },        // 25 the foredeck
    { p: [-14, 12, 0], w: 14 },        // 26 the bow helipad's lip
    { p: [-12, 12, 0], w: 14 },        // 27 (over the channel)
    { p: [5, 9.5, 0], w: 14 },         // 28 (over the channel)
    { p: [7, 9.5, 0], w: 14 },         // 29 aboard FAIR & BALANCED
    { p: [30, 9.5, 0], w: 14 },        // 30
    { p: [52, 9.5, 0], w: 14 },        // 31
    { p: [74, 9.5, 0], w: 14 },        // 32 her bow
    { p: [76, 9.5, 0], w: 14 },        // 33 (over the water)
    { p: [85, 8, 0.45], w: 14 },       // 34 (over the water)
    { p: [87, 8, 0.55], w: 14 },       // 35 aboard HOSTILE TAKEOVER
    { p: [108, 8, 1.5], w: 14 },       // 36
    { p: [129, 8, 2.4], w: 14 },       // 37
    { p: [150, 8, 3.3], w: 14 },       // 38 her bow
    { p: [152, 8, 3.4], w: 14 },       // 39 (over the water)
    { p: [178, 4.4, 5.5] },            // 40 back on the causeway: the landing barge
    { p: [214, 3.8, -6] },             // 41
    { p: [228, 3.0, -50] },            // 42 the East Turn
    { p: [206, 2.2, -95] },            // 43 customs
    { p: [150, 1.4, -113] },           // 44
    { p: [100, 0.8, -112] },           // 45
  ],
  // everything stands on piles over the sea except the sand spit at the hairpin
  bridges: [{ from: 6.3, to: 2.3 }],
  bridgePillars: false,                // the track drives its own piles (none through a yacht)
  // the yacht decks float: the road there rides each yacht's swell (and the tide)
  decks: YACHTS.map(y => ({ from: y.from, to: y.to, amp: y.amp, period: y.period, phase: y.phase })),
  deckY: (k, t, race) => { const y = YACHTS[k]; return y.amp * Math.sin(t * 2 * Math.PI / y.period + y.phase) + tideOf(race); },
  sides: [
    // the spit: a beach outside, the sandbar inside (open to drive at low tide)
    { from: 2.3, to: 6.3, side: 'R', edge: 'open', shoulder: 2, outer: 12 },
    { from: 2.3, to: 6.3, side: 'L', edge: 'open', shoulder: 1.5, outer: 30, hoarding: false, blend: 5 },
    // the seastead corridor and the customs lane
    { from: 12.75, to: 13.3, edge: 'wall' },
    { from: 42.8, to: 43.25, edge: 'wall' },
    { from: 39.53, to: 40.5, edge: 'wall' },     // the landing barge's rails
    // aboard: bulwarks and saloon walls either side of every deck
    ...YACHTS.map(y => ({ from: y.from, to: y.to, edge: 'wall' })),
  ],
  zones: [
    { from: 43.6, to: 2.3, skin: 'wood' },        // the boardwalk quay
    { from: 2.3, to: 6.3, skin: 'stone' },        // the causeway over the spit
    { from: 12.62, to: 13.4, skin: 'metal' },     // the seastead's deck plates
    { from: 17.4, to: 18.95, skin: 'wood' },      // the quay ramp
    { from: 39.53, to: 40.4, skin: 'metal' },     // the landing barge
  ],
  // the yacht hop: four jumps, each off a ramp at the end of a deck
  ramps: [
    { at: 18.25, len: 10, lift: 2.4 },            // the quay ramp, onto SOVEREIGN IMMUNITY
    { at: 25.5, len: 10, lift: 2.6 },             // off her bow helipad, over the channel
    { at: 31.47, len: 10, lift: 2.4 },            // off FAIR & BALANCED
    { at: 37.46, len: 10, lift: 2.4 },            // off HOSTILE TAKEOVER, home to the causeway
  ],
  gaps: [{ from: 18.96, to: 21.46 }, { from: 25.98, to: 27.95 }, { from: 31.99, to: 34.17 }, { from: 38.01, to: 39.53 }],
  boosts: [
    { at: 0.45, lat: 0, w: 5 },
    { at: 6.55, lat: 3, w: 5 },                // out of the hairpin, onto the run east
    { at: 9.75, lat: 0, w: 5 },                // out of the channel
    { at: 17.5, lat: 0, w: 6 },                // up the quay ramp
    { at: 24.75, lat: 0, w: 9 },               // SOVEREIGN IMMUNITY's foredeck: carry speed over the channel
    { at: 30.95, lat: 0, w: 8 },               // FAIR & BALANCED's foredeck
    { at: 39.75, lat: 0, w: 6 },               // the landing
  ],
  itemRows: [{ at: 1.3 }, { at: 7.3 }, { at: 12.2 }, { at: 16.4 }, { at: 41.4, n: 4 }],
  coins: [
    { from: 0.15, to: 0.55, n: 4, lat: -4 },
    { from: 3.2, to: 4.8, n: 6, lat: [5, 6] },        // the hairpin's inside line
    { from: 9.2, to: 9.7, n: 4, lat: 0 },             // down the channel
    { from: 13.9, to: 14.8, n: 5, lat: [4, -4] },
    { from: 19.3, to: 21.1, n: 4, lat: 0, air: 3.2 }, // over the water, every hop
    { from: 26.2, to: 27.7, n: 4, lat: 0, air: 3.8 },
    { from: 32.3, to: 33.9, n: 3, lat: 0, air: 3.0 },
    { from: 38.2, to: 39.4, n: 3, lat: 0, air: 2.8 },
    { from: 41.0, to: 41.7, n: 4, lat: [5, -2] },
  ],
  obstacles: [
    // moored mines that slipped their chains, each with a clear line past
    { kind: 'static', model: 'mine', at: 1.85, lat: -5.5, effect: 'spin', radius: 1.1 },
    { kind: 'static', model: 'mine', at: 11.6, lat: 5.5, effect: 'spin', radius: 1.1 },
    { kind: 'static', model: 'mine', at: 41.9, lat: -5.5, effect: 'spin', radius: 1.1 },
    // the seastead's security drone
    { kind: 'orbit', model: 'drone', at: 14.4, lat: 0, orbit: 4, speed: 6, effect: 'spin', radius: 1.1 },
  ],
  models: { mine: () => W.navMine() },
  /* On the final lap the tide goes out: the sea falls, the yachts with it,
     and the sandbar inside the hairpin dries out. Before that it is wading
     depth, too slow to be worth it without a boost. */
  lake: {
    inside: (x, z) => spitE(x, z) < 1.9,
    levelForLap: (lap, laps) => lap >= laps ? LOW_TIDE : SEA,
    rate: 0.3,
    surface: (depth, race) => depth > 0 ? WADE : race.lakeLap >= race.laps ? WET_SAND : DRY_SAND,
  },
  shortcuts: [
    { name: 'sandbar', from: 2.25, to: 6.35, path: [[-108, -94], [-122, -86], [-128, -76], [-122, -66], [-108, -58]], when: race => race.lakeLap >= race.laps },
  ],
  lapNotes: [
    `<b>Customs has been notified.</b> They sent a postcard.`,
    `<b>Final lap: low tide.</b> The sandbar is open.`,
  ],
  // the opening shot: the yacht chain from the water, names down the hulls
  intro: [{ pos: [64, 6, 62], look: [-30, 11, 0], pos1: [34, 7, 64], look1: [-56, 11, 0], fov: 50, dur: 3.6 }],
  terrain: {
    cell: 3, margin: 240, blend: 26, water: SEA,
    fn(x, z) {
      let h = -4.8 + (fbm(x * 0.02, z * 0.02, 3, 5) - 0.5) * 1.6;
      // the spit: a sandy island under the hairpin, the sandbar flat inside it
      const e = spitE(x, z);
      const isle = 0.25 - smoothstep(1.9, 3.6, e) * 5.2;
      const bar = -1.55 + (fbm(x * 0.08, z * 0.08, 2, 9) - 0.5) * 0.25;
      h = Math.max(h, e < 1.2 ? bar : e < 1.9 ? bar + (0.25 - bar) * smoothstep(1.2, 1.9, e) : isle);
      // two rocky islets out in the bay
      h += (1 - smoothstep(30, 90, Math.hypot(x - 460, z + 300))) * 14;
      h += (1 - smoothstep(30, 80, Math.hypot(x + 380, z - 330))) * 11;
      return h;
    },
  },
  look: {
    road: { base: 0x5d6373, line: 0xffffff, center: 0xffd23c },
    kerb: [0xe23b3b, 0xf7f7f2],
    shoulder: 0xe6d2a0,
    terrain: { low: 0x6f9e5a, high: 0x8fae6a, dry: 0xe2cf98, rock: 0x9a8f86, sand: 0xf0dfae, dirt: 0xd9c08a },
    wall: 0xf7f6f2, wallStripe: 0xe9b443,
    water: 0x17b3c8, deck: 0x6b5340, rail: 0x2fd8e0,
    ads: ADS,
  },

  /** Dress the course. ctx: { THREE, track, group, gfx, anim, view } */
  decorate(ctx) { decorate(ctx); },
};

function decorate(ctx) {
  const { THREE, track, anim, view } = ctx, sc = new Scenery(ctx), rng = sc.rng, group = ctx.group;
  const WL = track.water;
  const bake = W.makeBaker(group, sc.shadows), atlas = W.makeAtlas(group);
  // everything moored and afloat (barges, pontoons, sailboats) is merged into one group that rides the tide
  const floatGroup = new THREE.Group(); group.add(floatGroup);
  const fbake = W.makeBaker(floatGroup, sc.shadows);
  const DARK = MAT.dark;
  const at = (cp, lat = 0) => {
    const i = track.indexAtCp(cp), hl = Math.hypot(track.lx[i], track.lz[i]) || 1;
    return { x: track.px[i] + (track.lx[i] / hl) * lat, z: track.pz[i] + (track.lz[i] / hl) * lat, yaw: track.yaw[i], y: track.py[i], i, lx: track.lx[i] / hl, lz: track.lz[i] / hl };
  };
  const faceRoad = (p, side) => Math.atan2(-side * p.lx, -side * p.lz);
  const floaters = [];                         // things that ride the tide: { g, base, ph, amp, roll }
  const tide = () => tideOf(view.race);

  /* ----- the water: a living sea instead of a flat sheet ----- */
  const sea = new THREE.MeshStandardMaterial({ color: 0x17b3c8, roughness: 0.16, metalness: 0.1, transparent: true, opacity: 0.86, envMapIntensity: 1.4 });
  const uT = { value: 0 };
  sea.onBeforeCompile = sh => {
    sh.uniforms.uT = uT;
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vWp;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvWp = (modelMatrix * vec4(transformed, 1.0)).xyz;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vWp;\nuniform float uT;')
      .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
      {
        vec2 p = vWp.xz; float t = uT; vec2 g = vec2(0.0);
        vec2 d1 = vec2(0.82, 0.57), d2 = vec2(-0.45, 0.89), d3 = vec2(0.96, -0.28), d4 = vec2(-0.7, -0.71);
        g += d1 * cos(dot(p, d1) * 0.16 + t * 1.05) * 0.16 * 0.55;
        g += d2 * cos(dot(p, d2) * 0.27 + t * 1.45) * 0.27 * 0.32;
        g += d3 * cos(dot(p, d3) * 0.55 + t * 2.1) * 0.55 * 0.12;
        g += d4 * cos(dot(p, d4) * 1.1 + t * 2.9) * 1.1 * 0.045;
        g += vec2(0.6, 0.8) * cos(dot(p, vec2(0.6, 0.8)) * 2.3 + t * 4.1) * 2.3 * 0.012;
        float fade = clamp(1.0 - length(vWp - cameraPosition) / 900.0, 0.15, 1.0);
        vec3 nW = normalize(vec3(-g.x * fade, 1.0, -g.y * fade));
        normal = normalize((viewMatrix * vec4(nW, 0.0)).xyz);
      }`)
      .replace('#include <color_fragment>', `#include <color_fragment>
      {
        vec2 p = vWp.xz * 0.045;
        float n = sin(p.x * 1.7 + uT * 0.21) * sin(p.y * 1.3 - uT * 0.17) + 0.5 * sin((p.x + p.y) * 3.1 + uT * 0.3);
        diffuseColor.rgb = mix(diffuseColor.rgb * 0.82, diffuseColor.rgb * 1.12 + vec3(0.02, 0.05, 0.05), 0.5 + 0.35 * n);
      }`);
  };
  if (view.water) view.water.material = sea;
  anim.push((dt, time) => {
    uT.value = time;
    if (view.water && view.race?.lakeY != null) view.water.position.y = view.race.lakeY;
  });


  /* ----- start line: gantry ----- */
  const g0 = sc.beside(0, 1, -track.hwL[0]);
  const gantry = P.gantry(track.hwL[0] + track.hwR[0] + 1.5, 'INTERNATIONAL WATERS', { color: 0x1b7f8e, color2: 0xe8b64c });
  sc.place(gantry, g0.x, g0.z, { yaw: g0.along, y: g0.roadY });
  view.startLights = gantry.userData.lights;

  /* ----- THE YACHT HOP: three yachts, each riding its own swell, the road on their decks ----- */
  const deckGroups = [];
  const wood = roadSkin('wood'), carpet = roadSkin('carpet');
  const woodMat = new THREE.MeshStandardMaterial({ map: wood.map, roughness: 0.8 }), carpetMat = new THREE.MeshStandardMaterial({ map: carpet.map, roughness: 1 });
  const wallMat = paint(0xf7f6f2, { rough: 0.25, clear: 0.8 }), capMat = paint(0xe9b443, { rough: 0.25, metal: 0.75, clear: 0.6 });
  const rampMat = makeChevronMaterial({ a: 0x1f6bff, b: 0x7fe0ff, speed: 1.6, glow: 0.35, side: THREE.DoubleSide });
  const padMat = makeChevronMaterial({ a: 0xff6a00, b: 0xffe04a, speed: 3.2, glow: 0.9 });
  padMat.polygonOffset = true; padMat.polygonOffsetFactor = -2; padMat.polygonOffsetUnits = -2;
  const foamGeos = [], foamMat = W.foamMaterial();
  const range = (from, to) => { const a = track.indexAtCp(from), b = track.indexAtCp(to), out = []; for (let i = a; i !== b; i = (i + 1) % track.N) out.push(i); out.push(b); return out; };
  /** A strip of road surface over samples idx, lifted by `up`, in world space (at rest). */
  const strip = (idx, up, tile) => {
    const pos = [], uv = [], ix = [], K = 6;
    idx.forEach((i, r) => {
      for (let j = 0; j <= K; j++) {
        const lat = -track.hwR[i] + (track.hwL[i] + track.hwR[i]) * (j / K);
        pos.push(track.px[i] + track.lx[i] * lat, track.py[i] + track.ly[i] * lat + up, track.pz[i] + track.lz[i] * lat); uv.push(j / K, (r * track.ds) / tile);
      }
      if (r) for (let j = 0; j < K; j++) { const q = (r - 1) * (K + 1) + j; ix.push(q, q + K + 1, q + 1, q + 1, q + K + 1, q + K + 2); }
    });
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(ix); g.computeVertexNormals();
    return g;
  };
  /** Bulwarks along both road edges over samples idx: a white wall with a gold cap rail. */
  const bulwark = (idx, h = 1.05) => {
    const body = [], cap = [], bi = [], ci = [];
    for (const s of [1, -1]) {
      const b0 = body.length / 3, c0 = cap.length / 3;
      idx.forEach((i, r) => {
        const hw = (s > 0 ? track.hwL[i] : track.hwR[i]) * s, x = track.px[i] + track.lx[i] * hw, y = track.py[i] + track.ly[i] * hw, z = track.pz[i] + track.lz[i] * hw;
        const ox = track.lx[i] * s * 0.45, oz = track.lz[i] * s * 0.45;
        body.push(x, y - 0.4, z, x, y + h, z, x + ox, y + h, z + oz, x + ox, y - 0.4, z + oz);
        cap.push(x - ox * 0.2, y + h, z - oz * 0.2, x + ox * 1.2, y + h, z + oz * 1.2, x + ox * 1.2, y + h + 0.16, z + oz * 1.2, x - ox * 0.2, y + h + 0.16, z - oz * 0.2);
        if (r) {
          for (let k = 0; k < 3; k++) { const a = b0 + (r - 1) * 4 + k, c = a + 4; bi.push(a, c, a + 1, a + 1, c, c + 1); }
          for (let k = 0; k < 3; k++) { const a = c0 + (r - 1) * 4 + k, c = a + 4; ci.push(a, c, a + 1, a + 1, c, c + 1); }
        }
      });
    }
    const mk = (p, ix) => { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(p, 3)); g.setIndex(ix); g.computeVertexNormals(); return g; };
    return [mk(body, bi), mk(cap, ci)];
  };
  /** The ramp, drawn exactly as the physics shapes it (lift * (0.35 t + 0.65 t^2) over len), and a boost pad. */
  const P3 = new THREE.Vector3();
  const rampGeo = r => {
    const pos = [], uv = [], ix = [], steps = 10, hwA = track.hwR[r.i0], hwB = track.hwL[r.i0];
    for (let k = 0; k <= steps; k++) {
      const t = k / steps, s = r.s0 + r.len * t, h = r.lift * (0.35 * t + 0.65 * t * t) + 0.03;
      for (const [lat, u] of [[-hwA, 0], [hwB, 1]]) { track.pointAt(s, lat, P3, h); pos.push(P3.x, P3.y, P3.z); uv.push(u, t * 3); }
      if (k) { const q = (k - 1) * 2; ix.push(q, q + 1, q + 2, q + 1, q + 3, q + 2); }
    }
    const n = pos.length / 3;   // the lip face
    for (const [lat, u] of [[-hwA, 0], [hwB, 1]]) { track.pointAt(r.s0 + r.len, lat, P3, r.lift + 0.03); pos.push(P3.x, P3.y, P3.z); uv.push(u, 0); track.pointAt(r.s0 + r.len, lat, P3, -0.3); pos.push(P3.x, P3.y, P3.z); uv.push(u, 0.3); }
    ix.push(n, n + 2, n + 1, n + 1, n + 2, n + 3);
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(ix); g.computeVertexNormals();
    return g;
  };
  const padGeo = b => {
    const pos = [], uv = [], ix = [], steps = 6;
    for (let k = 0; k <= steps; k++) {
      const t = k / steps, s = b.s0 + b.len * t;
      for (const [lat, u] of [[b.lat - b.half, 0], [b.lat + b.half, 1]]) { track.pointAt(s, lat, P3, 0.05); pos.push(P3.x, P3.y, P3.z); uv.push(u, t * 2.2); }
      if (k) { const q = (k - 1) * 2; ix.push(q, q + 2, q + 1, q + 1, q + 2, q + 3); }
    }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(ix); g.computeVertexNormals();
    return g;
  };
  YACHTS.forEach((Y, k) => {
    const G = new THREE.Group(); G.name = 'deck-' + k; group.add(G);
    const L = Y.x1 - Y.x0, cx = (Y.x0 + Y.x1) / 2, cz = (Y.z0 + Y.z1) / 2, yaw = Math.atan2(Y.x1 - Y.x0, Y.z1 - Y.z0);
    const D = Y.road - WL - 0.14;
    const yacht = W.hopYacht({ L, B: Y.B, D, name: Y.name, boot: Y.boot, salon: Y.salon, uppers: Y.uppers, helipad: Y.helipad ?? null, header: Y.header });
    yacht.position.set(cx, WL, cz); yacht.rotation.y = yaw; G.add(yacht);
    yacht.traverse(o => { if (o.isMesh) o.castShadow = sc.shadows && !o.material.transparent; });
    if (Y.dishes) { const d = W.dishArray(); d.position.set(0, D + 5.8 + 5.4, -6); d.scale.setScalar(1.4); yacht.add(d); anim.push((dt, time) => { d.userData.spin.rotation.y = time * 0.45; }); }
    // the road over her deck: teak, red carpet through the salon
    const idx = range(Y.from, Y.to), salonX = [cx + Y.salon[0], cx + Y.salon[1]];
    const inSalon = i => track.px[i] > salonX[0] && track.px[i] < salonX[1];
    const segs = []; let cur = null;
    for (const i of idx) { const sal = inSalon(i); if (!cur || cur.sal !== sal) { if (cur) cur.idx.push(i); cur = { sal, idx: [i] }; segs.push(cur); } else cur.idx.push(i); }
    for (const sg of segs) if (sg.idx.length > 1) { const m = new THREE.Mesh(strip(sg.idx, 0.02, sg.sal ? carpet.tile : wood.tile), sg.sal ? carpetMat : woodMat); m.receiveShadow = true; G.add(m); }
    const [wb, wc] = bulwark(idx);
    const wm = new THREE.Mesh(wb, wallMat), cm = new THREE.Mesh(wc, capMat); wm.castShadow = sc.shadows; G.add(wm, cm);
    for (const r of track.ramps) if (track.deckK?.[r.i0] === k + 1) { const m = new THREE.Mesh(rampGeo(r), rampMat); m.castShadow = sc.shadows; G.add(m); }
    for (const b of track.boosts) if (track.deckK?.[b.i0] === k + 1) { const m = new THREE.Mesh(padGeo(b), padMat); m.renderOrder = 2; G.add(m); }
    // foam round her waterline: it stays with the sea while she rises and falls through it
    const fg = W.foamRing(yacht.userData.o, 2.2);
    fg.applyMatrix4(new THREE.Matrix4().makeRotationY(yaw).setPosition(cx, 0.06, cz));
    foamGeos.push(fg);
    deckGroups.push({ G, k, yacht, roll: 0.004 + k * 0.002, ph: k * 1.7 });
  });
  {
    const fm = new THREE.Mesh(foamGeos.length > 1 ? (() => { const all = foamGeos.map(g => g.toNonIndexed()); const merged = new THREE.BufferGeometry(); const n = all.reduce((a, g) => a + g.attributes.position.count, 0); const p = new Float32Array(n * 3), u = new Float32Array(n * 2); let o = 0; for (const g of all) { p.set(g.attributes.position.array, o * 3); u.set(g.attributes.uv.array, o * 2); o += g.attributes.position.count; } merged.setAttribute('position', new THREE.BufferAttribute(p, 3)); merged.setAttribute('uv', new THREE.BufferAttribute(u, 2)); merged.computeVertexNormals(); return merged; })() : foamGeos[0], foamMat);
    fm.renderOrder = 3; fm.position.y = WL; group.add(fm);
    floaters.push({ g: fm, base: WL, ph: 0, amp: 0, tideOnly: true });
  }
  anim.push((dt, time) => {
    for (const d of deckGroups) {
      d.G.position.y = track.deckY(d.k);
      // a little roll for the eye only: centred on the road, a few centimetres at the bulwarks
      d.yacht.rotation.z = Math.sin(time * 0.9 + d.ph) * d.roll;
    }
  });

  /* ----- the marina: three superyachts moored bow-on, raked bows over the quay ----- */
  const marina = new ModelBuilder();
  const bows = [
    { x: 74, name: 'TAX EXEMPT', boot: 'bootTeal', L: 88, tiers: 3 },
    { x: -4, name: 'EXTRADITION DENIED', boot: 'bootGold', L: 96, tiers: 3 },
    { x: -62, name: 'OFFSHORE ACCOUNT', boot: 'bootRed', L: 84, tiers: 2 },
  ];
  const bowNames = [];
  for (const m of bows) {
    const zc = -112 - 9 - m.L * 0.41;
    const o = W.marinaYacht(marina, { L: m.L, B: 9.5, D: 7.6, x: m.x, z: zc, yaw: 0, boot: m.boot, tiers: m.tiers });
    const st = o.station(m.L * 0.3);
    for (const s of [1, -1]) bowNames.push({ text: m.name, x: m.x + s * (st.w * 1.04 + 0.12), y: WL + st.top - 2.3, z: zc + m.L * 0.3, yaw: s * Math.PI / 2, len: m.L * 0.26 });
  }
  {
    const grp = marina.build(W.YACHT_MATS()); grp.position.y = WL; group.add(grp);
    grp.traverse(o => { if (o.isMesh) o.castShadow = sc.shadows; });
    floaters.push({ g: grp, base: WL, ph: 0.6, amp: 0, tideOnly: true });
    for (const n of bowNames) { const r = atlas.add(1024, 128, W.nameFace(n.text)); atlas.place(r, [n.x, n.y, n.z], n.yaw, n.len, n.len / 8); }
  }

  /* ----- the sand spit at the hairpin: palms, a beach bar, the tide board ----- */
  {
    const spots = sc.scatter({ count: 46, min: 3.5, max: 40, maxSlope: 0.5, minGap: 6, where: (x, z, h) => h > WL + 0.6 && spitE(x, z) > 1.85 && spitE(x, z) < 3.6 });
    sc.instances(partsOf(P.palm(3, { h: 10 })), spots.filter((_, i) => i % 2 === 0), { scale: [0.9, 1.25], yaw: 'random', tilt: 0.08 });
    sc.instances(partsOf(P.palm(7, { h: 8 })), spots.filter((_, i) => i % 2 === 1), { scale: [0.9, 1.3], yaw: 'random', tilt: 0.1 });
    const bp = at(4.0, -24);
    const bar = W.beachBar(); bar.position.set(bp.x, sc.y(bp.x, bp.z), bp.z); bar.rotation.y = faceRoad(bp, -1); group.add(bar); bake.add(bar);
    const tp = at(4.6, -12.5), tb = new ModelBuilder();
    tb.add('post', cyl(0.12, 0.14, 4.4, 8), { p: [tp.x, sc.y(tp.x, tp.z) + 2.2, tp.z] });
    bake.builder(tb, { post: DARK });
    const r = atlas.add(512, 256, W.signFace(['TIDE TABLE', 'LOW TIDE: FINAL LAP']));
    atlas.place2(r, [tp.x, sc.y(tp.x, tp.z) + 4.2, tp.z], faceRoad(tp, -1), 5.2, 2.6);
    const r2 = atlas.add(1024, 256, W.signFace(['OFFSHORE BAR', 'NO TABS. NO TAXES.'], { bg: '#e2603d', fg: '#fff6e0', accent: '#10222e' }));
    atlas.place2(r2, [bp.x, sc.y(bp.x, bp.z) + 6.6, bp.z], faceRoad(bp, -1), 8, 2);
  }

  /* ----- the seastead, astride the south leg: the road crosses its deck ----- */
  {
    const sp = at(13.02, 0);
    const stead = W.seastead();
    stead.position.set(sp.x, sp.y - 4.75, sp.z); stead.rotation.y = sp.yaw;
    group.add(stead); stead.updateMatrixWorld(true);
    const beacon = stead.getObjectByName('beacon');
    const bpos = beacon ? beacon.getWorldPosition(new THREE.Vector3()) : null;
    if (beacon) beacon.removeFromParent();
    bake.add(stead);
    if (beacon) { beacon.position.copy(bpos); group.add(beacon); anim.push((dt, time) => { beacon.material.emissiveIntensity = 1.6 + Math.sin(time * 2.4) * 1.4; }); }
  }

  /* ----- customs on the run home ----- */
  {
    const ci = track.indexAtCp(43.05), cg = sc.beside(43.05, 1, -track.hwL[ci]);
    const customs = P.gantry(track.hwL[ci] + track.hwR[ci] + 1.5, 'NOTHING TO DECLARE (EVER)', { color: 0x1d5c46, color2: 0xf3ead2 });
    sc.place(customs, cg.x, cg.z, { yaw: cg.along, y: cg.roadY });
    for (const side of [1, -1]) { const bp = sc.beside(43.05, side, 1.8); const booth = W.customsBooth(); sc.place(booth, bp.x, bp.z, { yaw: bp.yaw, y: bp.roadY }); bake.add(booth); }
  }

  /* ----- the landing barge at the end of the hop ----- */
  for (const cp of [39.8, 40.15]) {
    const p = at(cp, 0), bg = W.barge(22, 22);
    bg.position.set(p.x, WL - 0.1, p.z); bg.rotation.y = p.yaw; group.add(bg); fbake.add(bg);
  }

  /* ----- jokes at the road ----- */
  {
    const mw = at(7.15, 14);
    const wall = W.mailboxWall(); wall.position.set(mw.x, WL, mw.z); wall.rotation.y = faceRoad(mw, 1); group.add(wall); fbake.add(wall);
    const fs = at(14.9, 15);
    const shop = W.flagShop(); shop.position.set(fs.x, WL, fs.z); shop.rotation.y = faceRoad(fs, 1); group.add(shop); fbake.add(shop);
    const sb = W.signBuoy(), ss = at(0.25, 20);
    sb.position.set(ss.x, WL - 0.15, ss.z); sb.rotation.y = faceRoad(ss, 1); group.add(sb); fbake.add(sb);
    [[1.0, 1, 1], [11.9, -1, 2], [16.9, 1, 3], [41.5, -1, 4], [44.3, 1, 5]].forEach(([cp, side, n], k) => {
      const p = at(cp, side * 15);
      const board = W.adBoard(n); board.position.set(p.x, WL, p.z); board.rotation.y = faceRoad(p, side); group.add(board); fbake.add(board); void k;
    });
    // gantry signs over the road
    const signs = [
      [17.75, ['NOW BOARDING', 'SHOES OFF, TAXES OFF'], 15],
      [8.75, ['THE CHANNEL', 'WATCH FOR FALLING BILLIONAIRES'], 15],
    ];
    const posts = new ModelBuilder();
    for (const [cp, lines, w] of signs) {
      const p = at(cp, 0), half = track.hwL[p.i] + 0.8, y = p.y;
      for (const s of [1, -1]) posts.add('post', cyl(0.18, 0.22, 7.2, 8), { p: [p.x + p.lx * half * s, y + 3.6, p.z + p.lz * half * s] });
      posts.add('post', box(half * 2 + 0.6, 0.35, 0.35, 0.1, 1), { p: [p.x, y + 7.1, p.z], r: [0, Math.atan2(p.lx, p.lz) + Math.PI / 2, 0] });
      const r = atlas.add(1024, 256, W.signFace(lines));
      atlas.place2(r, [p.x, y + 5.7, p.z], p.yaw + Math.PI, w, w / 4);
    }
    bake.builder(posts, { post: DARK });
  }

  /* ----- lantern strings over the quay and the spit ----- */
  for (const cp of [0.75, 1.55, 6.9, 12.2, 43.7]) {
    const p = at(cp, 0), i = p.i;
    const str = W.lanternString(track.hwL[i] + track.hwR[i] + 4);
    str.position.set(p.x, p.y - 0.1, p.z); str.rotation.y = p.yaw; group.add(str); bake.add(str, false);
  }

  /* ----- piles under every pier (not under the yachts, not on the spit) ----- */
  {
    const piles = [], bands = [];
    for (let i = 0; i < track.N; i += Math.round(13 / track.ds)) {
      if (!track.bridge[i] || track.gap[i] || track.deckK?.[i]) continue;
      for (const s of [1, -1]) {
        const lat = s * ((s > 0 ? track.hwL[i] : track.hwR[i]) - 1.2), hl = Math.hypot(track.lx[i], track.lz[i]) || 1;
        const x = track.px[i] + track.lx[i] / hl * lat, z = track.pz[i] + track.lz[i] / hl * lat;
        const floor = Math.min(track.terrainHeight(x, z), WL - 2), top = track.py[i] - 0.6;
        if (top - floor < 1.5) continue;
        piles.push({ x, z, y: floor, sy: top - floor, yaw: 0 });
        bands.push({ x, z, y: LOW_TIDE - 0.5, yaw: rng() * 6 });
      }
    }
    sc.instances(partsOf(W.pile()), piles, { cast: true });
    sc.instances(partsOf(W.pileBand()), bands, { cast: false });
  }

  /* ----- the channel-buoy line, red outside and green in, along the open water ----- */
  {
    const stride = Math.max(1, Math.round(26 / track.ds)), red = [], green = [];
    const nearYacht = (x, z) => YACHTS.some(Y => x > Y.x0 - 6 && x < Y.x1 + 6 && Math.abs(z - Y.z0) < Y.B + 8);
    for (let i = 0; i < track.N; i += stride) {
      if (!track.bridge[i] || track.deckK?.[i] || track.gap[i]) continue;
      const hl = Math.hypot(track.lx[i], track.lz[i]) || 1, ux = track.lx[i] / hl, uz = track.lz[i] / hl;
      for (const [list, s, hw] of [[red, 1, track.hwL[i]], [green, -1, track.hwR[i]]]) {
        const x = track.px[i] + ux * s * (hw + 6), z = track.pz[i] + uz * s * (hw + 6);
        if (nearYacht(x, z) || track.roadDistance(x, z) < 4) continue;
        list.push({ x, z, y: WL - 0.3 });
      }
    }
    const rm = sc.instances(partsOf(W.channelBuoy(0xd9403a)), red, { yaw: 'random', cast: false });
    const gm = sc.instances(partsOf(W.channelBuoy(0x2e9e5b)), green, { yaw: 'random', cast: false });
    for (const m of [...rm, ...gm]) floaters.push({ g: m, base: 0, ph: 0, amp: 0.08 });
  }

  /* ----- life on the water: jet skis carving wakes, sailboats, gulls ----- */
  const ski = [
    { cx: -55, cz: -78, rx: 34, rz: 13, w: 0.32, ph: 0 }, { cx: 125, cz: -60, rx: 30, rz: 22, w: -0.28, ph: 2 },
    { cx: -100, cz: 40, rx: 48, rz: 13, w: 0.25, ph: 4 }, { cx: 50, cz: 42, rx: 30, rz: 11, w: -0.3, ph: 1 },
    { cx: -40, cz: 125, rx: 60, rz: 18, w: 0.2, ph: 3 },
  ];
  const skiParts = partsOf(W.jetSki(0xe2603d)), skiMeshes = skiParts.map(pt => { const m = new THREE.InstancedMesh(pt.geometry, pt.material, ski.length); m.frustumCulled = false; group.add(m); return m; });
  const TRAIL = 26, wakePos = new Float32Array(ski.length * TRAIL * 2 * 3), wakeCol = new Float32Array(ski.length * TRAIL * 2 * 4), wakeIdx = [];
  for (let s = 0; s < ski.length; s++) for (let k = 0; k < TRAIL - 1; k++) { const a = (s * TRAIL + k) * 2; wakeIdx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); }
  const wakeGeo = new THREE.BufferGeometry();
  wakeGeo.setAttribute('position', new THREE.BufferAttribute(wakePos, 3)); wakeGeo.setAttribute('color', new THREE.BufferAttribute(wakeCol, 4)); wakeGeo.setIndex(wakeIdx);
  const wake = new THREE.Mesh(wakeGeo, new THREE.MeshBasicMaterial({ color: 0xffffff, vertexColors: true, transparent: true, depthWrite: false, side: THREE.DoubleSide }));
  wake.frustumCulled = false; wake.renderOrder = 3; group.add(wake);
  const skiAt = (s, t, out) => { const k = ski[s], a = t * k.w + k.ph; out.x = k.cx + Math.cos(a) * k.rx; out.z = k.cz + Math.sin(a * (k.rz > 25 ? 2 : 1)) * k.rz; return out; };
  const M4 = new THREE.Matrix4(), Q = new THREE.Quaternion(), E = new THREE.Euler(), V1 = new THREE.Vector3(), S1 = new THREE.Vector3(1, 1, 1), pA = {}, pB = {};
  anim.push((dt, time) => {
    const y0 = (view.race?.lakeY ?? SEA);
    for (let s = 0; s < ski.length; s++) {
      skiAt(s, time, pA); skiAt(s, time + 0.05, pB);
      const yaw = Math.atan2(pB.x - pA.x, pB.z - pA.z);
      E.set(-0.08, yaw, Math.sin(time * 1.3 + s) * 0.12); Q.setFromEuler(E);
      M4.compose(V1.set(pA.x, y0 + 0.05 + Math.sin(time * 7 + s) * 0.06, pA.z), Q, S1.set(1.3, 1.3, 1.3));
      for (const m of skiMeshes) m.setMatrixAt(s, M4);
      for (let k = 0; k < TRAIL; k++) {
        skiAt(s, time - k * 0.09, pA); skiAt(s, time - k * 0.09 + 0.05, pB);
        const dx = pB.x - pA.x, dz = pB.z - pA.z, l = Math.hypot(dx, dz) || 1, w = 0.5 + k * 0.16;
        const o = (s * TRAIL + k) * 2;
        wakePos.set([pA.x - dz / l * w, y0 + 0.06, pA.z + dx / l * w, pA.x + dz / l * w, y0 + 0.06, pA.z - dx / l * w], o * 3);
        const a = (1 - k / TRAIL) * 0.75;
        wakeCol.set([1, 1, 1, a, 1, 1, 1, a], o * 4);
      }
    }
    for (const m of skiMeshes) m.instanceMatrix.needsUpdate = true;
    wakeGeo.attributes.position.needsUpdate = true; wakeGeo.attributes.color.needsUpdate = true;
  });
  // sailboats beating round the outside
  for (const [x, z, yaw, c] of [[-300, -40, 0.4, 0x2e7fc2], [260, 80, 2.2, 0xe2603d], [40, 220, 1.1, 0x3fae6a], [-200, 200, 2.8, 0x2e7fc2], [300, -200, 0.9, 0xe2603d], [-320, -220, 1.9, 0x3fae6a], [120, -260, 2.5, 0x2e7fc2]]) {
    if (track.roadDistance(x, z) < 30) continue;
    const bt = W.sailboat(c); bt.position.set(x, WL - 0.25, z); bt.rotation.y = yaw; bt.scale.setScalar(1.5); group.add(bt); fbake.add(bt, false);
  }
  {
    const gulls = [];
    [[-120, -76, 14], [0, -135, 24], [-40, 0, 30], [60, 4, 26], [-120, 80, 18]].forEach(([x, z, y], k) => { for (let j = 0; j < 4; j++) gulls.push({ x, z, y: y + j * 1.6, r: 10 + j * 5 + k, w: (j % 2 ? 0.5 : -0.42) * (1 + k * 0.05), ph: j * 1.7 + k }); });
    const meshes = partsOf(W.gull()).map(pt => { const m = new THREE.InstancedMesh(pt.geometry, pt.material, gulls.length); m.frustumCulled = false; m.castShadow = false; group.add(m); return m; });
    anim.push((dt, time) => {
      gulls.forEach((g, i) => {
        const a = time * g.w + g.ph, x = g.x + Math.cos(a) * g.r, z = g.z + Math.sin(a) * g.r, yaw = Math.atan2(-Math.sin(a) * g.w, Math.cos(a) * g.w);
        E.set(0, yaw, -Math.sign(g.w) * 0.35); Q.setFromEuler(E);
        S1.set(1.4, 1.4 * (0.4 + 0.9 * Math.abs(Math.sin(time * 5 + i))), 1.4);
        M4.compose(V1.set(x, g.y + Math.sin(time * 0.7 + i) * 1.2, z), Q, S1);
        for (const m of meshes) m.setMatrixAt(i, M4);
      });
      for (const m of meshes) m.instanceMatrix.needsUpdate = true;
    });
  }

  /* ----- the sky: balloons, and a blimp over the marina ----- */
  {
    const cols = [[0xff4d6d, 0xffd23c], [0x38b6ff, 0xffffff], [0x2ee6a6, 0xffd23c]];
    const balloons = cols.map((c, i) => { const b = P.balloon(c); const a = (i / cols.length) * Math.PI * 2 + 0.7, r = 330 + (i % 2) * 80; b.position.set(Math.cos(a) * r, 70 + i * 9, Math.sin(a) * r); b.scale.setScalar(1.6); group.add(b); return b; });
    const ship = P.blimp('NO JURISDICTION', { accent: 0x1fb6c9 }); ship.scale.setScalar(1.3); group.add(ship);
    anim.push((dt, time) => {
      balloons.forEach((b, i) => { b.position.y += Math.sin(time * 0.4 + i * 1.7) * dt * 0.8; b.rotation.y += dt * 0.05; });
      const a = time * 0.02; ship.position.set(-60 + Math.cos(a) * 70, 58 + Math.sin(time * 0.3) * 2, -60 + Math.sin(a) * 50); ship.rotation.y = -a;
    });
  }

  /* ----- everything afloat bobs, and rides the tide ----- */
  anim.push((dt, time) => {
    const td = tide();
    floatGroup.position.y = td + Math.sin(time * 0.8) * 0.07;
    for (const f of floaters) {
      f.g.position.y = f.base + td + (f.tideOnly ? 0 : Math.sin(time * 0.8 + f.ph) * f.amp);
      if (f.roll) f.g.rotation.z = Math.sin(time * 0.6 + f.ph) * f.roll;
    }
  });


  bake.flush();
  fbake.flush();
  atlas.flush();
}
