/* International Waters: an offshore tax-haven harbour, rebuilt as a figure
   eight around one colossal yacht. The lap: the marina quay under the raked
   bows of three superyachts, the Sandbar Hairpin round a sand spit, the run
   past the gigayacht's flank and a hard right THROUGH her beach club (the
   tender garage, open both sides), across the seastead's deck, the climb up
   the gangway and aboard, a full run down her teak deck beside four decks of
   superstructure, and off the bow helipad onto a barge. Then customs, which
   waves everyone through. On the final lap the tide goes out and the sandbar
   inside the hairpin is open to drive.
   Original brief: docs/track-design-waters.md. */
import { fbm, smoothstep } from '../core/util.js';
import { Scenery, partsOf } from '../render/scenery.js';
import * as P from '../models/props.js';
import * as W from '../models/props-international-waters.js';
import { ModelBuilder, box, cyl, plastic, paint, MAT } from '../models/build.js';

const ADS = ['NO JURISDICTION', 'TAX HAVEN AHEAD', 'FLAG OF CONVENIENCE', 'EXTRADITION FREE ZONE', 'DUTY FREE SPEED', 'NO LAWS JUST LAPS', 'OFFSHORE AND ON COURSE', 'TWELVE MILES OUT', 'SEASTEAD SUITES', 'SMUGGLERS WELCOME'];
const SEA = -1.1, LOW_TIDE = -2.35;           // the sea at high water, and on the final lap
const YACHT = { x: 0, z: 1, y: -1.0, D: 13, cut: [-35, -6, 9.7] };   // the gigayacht: centre, waterline, deck height, the beach-club cut (hull frame z = world x)
const SPIT = { x: -133, z: -79, rx: 22, rz: 15 };                    // the sandbar inside the hairpin
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
  offroad: 'sand',
  defaults: { edge: 'void', shoulder: 0, outer: 11 },
  // a figure eight: the low road passes through the yacht's beach club
  // (cp ~9.4, road at +1.6 m) right under the deck run (cp ~18.8, road at +12 m)
  path: [
    { p: [30, 0.6, -112] },            // 0 start/finish: the marina quay, heading west under the bows
    { p: [-60, 0.6, -113] },           // 1
    { p: [-110, 0.4, -108] },          // 2 the Sandbar Hairpin: turn-in, onto the spit
    { p: [-150, 0.3, -99] },           // 3
    { p: [-158, 0.2, -78] },           // 4 apex, the sandbar inside
    { p: [-148, 0.3, -58] },           // 5
    { p: [-112, 0.6, -48] },           // 6 exit, heading east past the yacht's flank
    { p: [-80, 1.0, -46] },            // 7
    { p: [-42, 1.5, -40] },            // 8 the Garage Turn
    { p: [-20.5, 1.6, -16] },          // 9 into the beach club, under the deck
    { p: [-20.5, 1.7, 22] },           // 10 out the starboard side
    { p: [-32, 2.2, 56] },             // 11 turn west
    { p: [-76, 2.9, 78] },             // 12
    { p: [-140, 3.8, 84] },            // 13 across the seastead
    { p: [-200, 5.0, 66] },            // 14
    { p: [-228, 6.2, 22] },            // 15 the West Turn
    { p: [-205, 7.6, -8] },            // 16 turn east, the gangway climb
    { p: [-140, 10.2, -8] },           // 17
    { p: [-80, 12, -5], w: 16 },       // 18 the stern: aboard
    { p: [-10, 12, -5], w: 16 },       // 19 the deck run
    { p: [40, 12, -3.5], w: 16 },      // 20
    { p: [60, 12, -0.5], w: 16 },      // 21 the helipad on the bow
    { p: [80, 12, 1.2], w: 16 },       // 22 the bow tip: the ramp's lip
    { p: [122, 8.2, 4.5] },            // 23 landing barge
    { p: [160, 6.0, -14] },            // 24
    { p: [182, 4.0, -60] },            // 25
    { p: [150, 2.0, -104] },           // 26 customs
    { p: [95, 1.0, -114] },            // 27
  ],
  // everything stands on piles over the sea except the sand spit at the hairpin
  bridges: [{ from: 6.3, to: 2.3 }],
  bridgePillars: false,                // the track drives its own piles (none through the yacht)
  sides: [
    // the spit: a beach outside, the sandbar inside (open to drive at low tide)
    { from: 2.3, to: 6.3, side: 'R', edge: 'open', shoulder: 2, outer: 12 },
    { from: 2.3, to: 6.3, side: 'L', edge: 'open', shoulder: 1.5, outer: 30, hoarding: false, blend: 5 },
    // the beach club: hull walls either side
    { from: 8.85, to: 9.95, edge: 'wall' },
    // the seastead corridor and the customs lane
    { from: 12.75, to: 13.3, edge: 'wall' },
    { from: 25.8, to: 26.25, edge: 'wall' },
    // aboard: the bulwark to port, the superstructure to starboard
    { from: 18.0, to: 21.45, edge: 'wall' },
  ],
  zones: [
    { from: 25.6, to: 2.3, skin: 'wood' },        // the boardwalk quay
    { from: 2.3, to: 6.3, skin: 'stone' },        // the causeway over the spit
    { from: 8.8, to: 9.95, skin: 'carpet' },      // the beach club: members only
    { from: 12.62, to: 13.4, skin: 'metal' },     // the seastead's deck plates
    { from: 18.0, to: 21.45, skin: 'wood' },      // her teak deck
    { from: 21.45, to: 21.95, skin: 'metal' },    // the helipad
    { from: 22.36, to: 22.95, skin: 'metal' },    // the landing barge
  ],
  // the signature moment: off the bow helipad, over open water, onto a barge
  ramps: [{ at: 21.5, len: 10, lift: 2.6 }],
  gaps: [{ from: 21.96, to: 22.36 }],
  boosts: [
    { at: 0.45, lat: 0, w: 5 },
    { at: 6.55, lat: 3, w: 5 },                // out of the hairpin, onto the flank run
    { at: 10.05, lat: 0, w: 5 },               // out of the beach club
    { at: 19.2, lat: -2, w: 5 },               // down the deck: line up for the jump
    { at: 22.5, lat: 0, w: 6 },                // the landing
  ],
  itemRows: [
    { at: 1.3 }, { at: 7.3 }, { at: 12.2 }, { at: 16.6 }, { at: 24.3, n: 4 },
  ],
  coins: [
    { from: 0.15, to: 0.55, n: 4, lat: -4 },
    { from: 3.2, to: 4.8, n: 6, lat: [5, 6] },        // the hairpin's inside line
    { from: 8.95, to: 9.85, n: 5, lat: 0 },           // through the beach club
    { from: 13.95, to: 14.8, n: 5, lat: [4, -4] },
    { from: 19.5, to: 20.6, n: 5, lat: [5, -3] },     // down the deck
    { from: 22.0, to: 22.32, n: 3, lat: 0, air: 3.4 },// over the gap
    { from: 25.1, to: 25.6, n: 4, lat: [5, -2] },
  ],
  obstacles: [
    // moored mines that slipped their chains, each with a clear line past
    { kind: 'static', model: 'mine', at: 1.85, lat: -5.5, effect: 'spin', radius: 1.1 },
    { kind: 'static', model: 'mine', at: 11.6, lat: 5.5, effect: 'spin', radius: 1.1 },
    { kind: 'static', model: 'mine', at: 24.9, lat: -5.5, effect: 'spin', radius: 1.1 },
    // a drink cart on the teak, crossing back and forth
    { kind: 'patrol', model: 'cart', at: 20.15, lats: [-6, -0.5], speed: 3.2, effect: 'spin', radius: 1.2 },
    // the seastead's security drone
    { kind: 'orbit', model: 'drone', at: 14.4, lat: 0, orbit: 4, speed: 6, effect: 'spin', radius: 1.1 },
  ],
  models: { mine: () => W.navMine(), cart: () => W.drinkCart() },
  /* On the final lap the tide goes out: the sea falls and the sandbar inside
     the hairpin dries out. Before that it is wading depth, too slow to be
     worth it without a boost. */
  lake: {
    inside: (x, z) => spitE(x, z) < 1.9,
    levelForLap: (lap, laps) => lap >= laps ? LOW_TIDE : SEA,
    rate: 0.3,
    surface: (depth, race) => depth > 0 ? WADE : race.lakeLap >= race.laps ? WET_SAND : DRY_SAND,
  },
  shortcuts: [
    { name: 'sandbar', from: 2.25, to: 6.35, path: [[-118, -98], [-132, -88], [-136, -76], [-130, -64], [-116, -57]], when: race => race.lakeLap >= race.laps },
  ],
  lapNotes: [
    `<b>Customs has been notified.</b> They sent a postcard.`,
    `<b>Final lap: low tide.</b> The sandbar is open.`,
  ],
  // the opening shot: the gigayacht from the water, her name down the bow,
  // the deck road and the helipad above, drifting toward the beach club
  intro: [{ pos: [58, 4, 74], look: [10, 13, 12], pos1: [24, 5, 70], look1: [-8, 12, 10], fov: 52, dur: 3.6 }],
  terrain: {
    cell: 3, margin: 240, blend: 26, water: SEA,
    fn(x, z) {
      let h = -4.8 + (fbm(x * 0.02, z * 0.02, 3, 5) - 0.5) * 1.6;
      // the spit: a sandy island under the hairpin, the sandbar flat inside it
      const e = spitE(x, z);
      const isle = 0.25 - smoothstep(1.9, 3.6, e) * 5.2;
      const bar = -1.55 + (fbm(x * 0.08, z * 0.08, 2, 9) - 0.5) * 0.25;
      h = Math.max(h, e < 1.2 ? bar : e < 1.9 ? bar + (0.25 - bar) * smoothstep(1.2, 1.9, e) : isle);
      // two rocky islets on the horizon
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
  const DARK = MAT.dark, CUSHION = plastic(0xf3ead2, 0.8), TUB = paint(0xf7f6f2, { rough: 0.3 });
  const POOL = new THREE.MeshStandardMaterial({ color: 0x0aa7c6, emissive: 0x29d9f0, emissiveIntensity: 0.8, roughness: 0.1 });
  const at = (cp, lat = 0) => {
    const i = track.indexAtCp(cp), hl = Math.hypot(track.lx[i], track.lz[i]) || 1;
    return { x: track.px[i] + (track.lx[i] / hl) * lat, z: track.pz[i] + (track.lz[i] / hl) * lat, yaw: track.yaw[i], y: track.py[i], i, lx: track.lx[i] / hl, lz: track.lz[i] / hl };
  };
  const faceRoad = (p, side) => Math.atan2(-side * p.lx, -side * p.lz);
  const floaters = [];                         // things that ride the tide: { g, base, ph, amp, roll }
  const tide = () => (view.race?.lakeY ?? SEA) - SEA;

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

  /* ----- THE GIGAYACHT: SOVEREIGN IMMUNITY ----- */
  const yacht = W.gigayacht({ D: YACHT.D, cut: YACHT.cut, name: 'SOVEREIGN IMMUNITY' });
  yacht.position.set(YACHT.x, YACHT.y, YACHT.z);
  group.add(yacht);
  yacht.traverse(o => { if (o.isMesh) o.castShadow = sc.shadows && !o.material.transparent; });
  const radar = yacht.userData.radar;
  anim.push((dt, time) => { radar.rotation.y = time * 1.6; });
  // deck furniture on the starboard side of the road: sun loungers and a hot tub
  {
    const b = new ModelBuilder();
    for (let k = 0; k < 7; k++) {
      const x = -72 + k * 5;
      b.add('cushion', box(1.7, 0.35, 0.9, 0.15, 2), { p: [x, 12.2, 4.4] });
      b.add('cushion', box(1.0, 0.35, 0.9, 0.15, 2), { p: [x - 1.0, 12.5, 4.4], r: [0, 0, 0.5] });
    }
    b.add('tub', cyl(2.6, 2.6, 0.8, 24), { p: [50, 12.3, 9.5] });
    b.add('pool', cyl(2.3, 2.3, 0.1, 24), { p: [50, 12.72, 9.5] });
    bake.builder(b, { cushion: CUSHION, tub: TUB, pool: POOL });
  }

  /* ----- the marina: three superyachts moored bow-on, raked bows over the quay ----- */
  const marina = new ModelBuilder();
  const bows = [
    { x: 74, name: 'TAX EXEMPT', boot: 'bootTeal', L: 88, tiers: 3 },
    { x: -4, name: 'EXTRADITION DENIED', boot: 'bootGold', L: 96, tiers: 3 },
    { x: -62, name: 'HOSTILE TAKEOVER', boot: 'bootRed', L: 84, tiers: 2 },
  ];
  const bowNames = [];
  for (const m of bows) {
    // the bow reaches over the north half of the quay; the stem meets the water well clear of the road
    const zc = -112 - 9 - m.L * 0.41;
    const o = W.marinaYacht(marina, { L: m.L, B: 9.5, D: 7.6, x: m.x, z: zc, yaw: 0, boot: m.boot, tiers: m.tiers });
    const st = o.station(m.L * 0.3);
    for (const s of [1, -1]) bowNames.push({ text: m.name, x: m.x + s * (st.w * 1.04 + 0.12), y: WL + st.top - 2.3, z: zc + m.L * 0.3, yaw: s * Math.PI / 2, len: m.L * 0.26 });
  }
  {
    const grp = marina.build(W.YACHT_MATS()); grp.position.y = WL; group.add(grp);
    grp.traverse(o => { if (o.isMesh) o.castShadow = sc.shadows; });
    floaters.push({ g: grp, base: WL, ph: 0.6, amp: 0, tideOnly: true });
    for (const n of bowNames) {
      const r = atlas.add(1024, 128, W.nameFace(n.text));
      atlas.place(r, [n.x, n.y, n.z], n.yaw, n.len, n.len / 8);
    }
  }

  /* ----- the sand spit at the hairpin: palms, a beach bar, the tide board ----- */
  {
    const spots = sc.scatter({ count: 46, min: 3.5, max: 40, maxSlope: 0.5, minGap: 6, where: (x, z, h) => h > WL + 0.6 && spitE(x, z) > 1.85 && spitE(x, z) < 3.4 });
    const palmA = partsOf(P.palm(3, { h: 10 })), palmB = partsOf(P.palm(7, { h: 8 }));
    sc.instances(palmA, spots.filter((_, i) => i % 2 === 0), { scale: [0.9, 1.25], yaw: 'random', tilt: 0.08 });
    sc.instances(palmB, spots.filter((_, i) => i % 2 === 1), { scale: [0.9, 1.3], yaw: 'random', tilt: 0.1 });
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
    const ci = track.indexAtCp(26.05), cg = sc.beside(26.05, 1, -track.hwL[ci]);
    const customs = P.gantry(track.hwL[ci] + track.hwR[ci] + 1.5, 'NOTHING TO DECLARE (EVER)', { color: 0x1d5c46, color2: 0xf3ead2 });
    sc.place(customs, cg.x, cg.z, { yaw: cg.along, y: cg.roadY });
    for (const side of [1, -1]) { const bp = sc.beside(26.05, side, 1.8); const booth = W.customsBooth(); sc.place(booth, bp.x, bp.z, { yaw: bp.yaw, y: bp.roadY }); bake.add(booth); }
  }

  /* ----- the landing barge under the bow jump ----- */
  for (const cp of [22.42, 22.8]) {
    const p = at(cp, 0), bg = W.barge(24, 22);
    bg.position.set(p.x, WL - 0.1, p.z); bg.rotation.y = p.yaw; group.add(bg);
    floaters.push({ g: bg, base: WL - 0.1, ph: cp * 3, amp: 0.05 });
  }

  /* ----- jokes at the road ----- */
  {
    const mw = at(7.15, 14);
    const wall = W.mailboxWall(); wall.position.set(mw.x, WL, mw.z); wall.rotation.y = faceRoad(mw, 1); group.add(wall);
    floaters.push({ g: wall, base: WL, ph: 1.3, amp: 0.05 });
    const fs = at(14.9, 15);
    const shop = W.flagShop(); shop.position.set(fs.x, WL, fs.z); shop.rotation.y = faceRoad(fs, 1); group.add(shop);
    floaters.push({ g: shop, base: WL, ph: 2.2, amp: 0.05 });
    const sb = W.signBuoy(), ss = at(0.25, 20);
    sb.position.set(ss.x, WL - 0.15, ss.z); sb.rotation.y = faceRoad(ss, 1); group.add(sb);
    floaters.push({ g: sb, base: WL - 0.15, ph: 0.4, amp: 0.1 });
    [[1.0, 1, 1], [11.9, -1, 2], [16.9, 1, 3], [24.6, -1, 4], [27.3, 1, 5]].forEach(([cp, side, n], k) => {
      const p = at(cp, side * 15);
      const board = W.adBoard(n); board.position.set(p.x, WL, p.z); board.rotation.y = faceRoad(p, side); group.add(board);
      floaters.push({ g: board, base: WL, ph: k * 1.9, amp: 0.06 });
    });
    // gantry signs over the road
    const signs = [
      [17.6, ['NOW BOARDING', 'SHOES OFF, TAXES OFF'], 15],
      [21.3, ['HELIPAD', 'NO CUSTOMS ABOVE 12 METRES'], 14],
      [8.5, ['BEACH CLUB', 'DRESS CODE: KART'], 15],
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
  for (const cp of [0.75, 1.55, 6.9, 12.2, 26.7]) {
    const p = at(cp, 0), i = p.i;
    const str = W.lanternString(track.hwL[i] + track.hwR[i] + 4);
    str.position.set(p.x, p.y - 0.1, p.z); str.rotation.y = p.yaw; group.add(str); bake.add(str, false);
  }

  /* ----- piles under every bridge (not through the yacht, not on the spit) ----- */
  {
    const piles = [], bands = [];
    const inYacht = (x, z) => Math.abs(x - YACHT.x) < 80 && Math.abs(z - YACHT.z) < 20;
    for (let i = 0; i < track.N; i += Math.round(13 / track.ds)) {
      if (!track.bridge[i] || track.gap[i]) continue;
      for (const s of [1, -1]) {
        const lat = s * ((s > 0 ? track.hwL[i] : track.hwR[i]) - 1.2), hl = Math.hypot(track.lx[i], track.lz[i]) || 1;
        const x = track.px[i] + track.lx[i] / hl * lat, z = track.pz[i] + track.lz[i] / hl * lat;
        if (inYacht(x, z)) continue;
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
    for (let i = 0; i < track.N; i += stride) {
      if (!track.bridge[i]) continue;
      const hl = Math.hypot(track.lx[i], track.lz[i]) || 1, ux = track.lx[i] / hl, uz = track.lz[i] / hl;
      for (const [list, s, hw] of [[red, 1, track.hwL[i]], [green, -1, track.hwR[i]]]) {
        const x = track.px[i] + ux * s * (hw + 6), z = track.pz[i] + uz * s * (hw + 6);
        if (Math.abs(x - YACHT.x) < 84 && Math.abs(z - YACHT.z) < 24) continue;
        if (track.roadDistance(x, z) < 4) continue;
        list.push({ x, z, y: WL - 0.3 });
      }
    }
    const rm = sc.instances(partsOf(W.channelBuoy(0xd9403a)), red, { yaw: 'random', cast: false });
    const gm = sc.instances(partsOf(W.channelBuoy(0x2e9e5b)), green, { yaw: 'random', cast: false });
    for (const m of [...rm, ...gm]) floaters.push({ g: m, base: 0, ph: 0, amp: 0.08 });
  }

  /* ----- life on the water: jet skis carving wakes, sailboats, gulls ----- */
  const ski = [
    { cx: -70, cz: -80, rx: 40, rz: 16, w: 0.32, ph: 0 }, { cx: 110, cz: -60, rx: 38, rz: 28, w: -0.28, ph: 2 },
    { cx: -110, cz: 30, rx: 50, rz: 24, w: 0.25, ph: 4 }, { cx: 40, cz: 60, rx: 60, rz: 22, w: -0.22, ph: 1 },
    { cx: 60, cz: -170, rx: 70, rz: 18, w: 0.2, ph: 3 },
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
    const bt = W.sailboat(c); bt.position.set(x, WL - 0.25, z); bt.rotation.y = yaw; bt.scale.setScalar(1.5); group.add(bt);
    floaters.push({ g: bt, base: WL - 0.25, ph: x * 0.01, amp: 0.12, roll: 0.05 });
  }
  {
    const gulls = [];
    [[-130, -80, 14], [0, -112, 22], [-20, 0, 34], [-140, 84, 18], [140, -40, 16]].forEach(([x, z, y], k) => { for (let j = 0; j < 4; j++) gulls.push({ x, z, y: y + j * 1.6, r: 10 + j * 5 + k, w: (j % 2 ? 0.5 : -0.42) * (1 + k * 0.05), ph: j * 1.7 + k }); });
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
    for (const f of floaters) {
      f.g.position.y = f.base + td + (f.tideOnly ? 0 : Math.sin(time * 0.8 + f.ph) * f.amp);
      if (f.roll) f.g.rotation.z = Math.sin(time * 0.6 + f.ph) * f.roll;
    }
  });

  bake.flush();
  atlas.flush();
}
