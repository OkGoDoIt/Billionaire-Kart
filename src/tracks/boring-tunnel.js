/* Boring Tunnel GP: a single bore under a desert massif, built from
   docs/track-design-tunnel.md, reworked to the lead's post-#112 bar.
   The lap dives from the portal to -6 m running depth through a chicane
   S-bend — dead ahead at the bottom of the dive is the Boring Machine,
   its 9 m cutter face chewing the wall at the road's edge under a dig
   gantry that straddles the road — runs deep and level, climbs the west wall to
   the Ring Hairpin, where you drift THROUGH the loop-the-loop ring,
   crests the crown at +2.2 m, catches air off the crown ramp, and
   settles home to the one stretch of daylight: the start cutting.
   One bore, and no shortcut: it is still being dug. */
import { fbm, smoothstep } from '../core/util.js';

import { Scenery, partsOf } from '../render/scenery.js';
import * as P from '../models/props.js';
import * as T from '../models/props-boring-tunnel.js';
import { canvasTex, fitText } from '../render/textures.js';

/** Where the bore tube's arc opens instead of closing over the road
 *  (#234 items 5+6). k runs 0..12 from the L wall base (lat +) over the crown
 *  to the R wall base (lat −): keeping [k0, k1] drops the arc outside it.
 *  Item 5's TBM chamber keeps k 5..12 (the L lower arc is the chamber
 *  mouth); item 6's shortcut junctions keep k 0..7 (R-side mouths). */
const TUBE_WINDOWS = [
  { from: 4.17, to: 4.43, k0: 5, k1: 12 },   // the Boring Machine's chamber mouth (item 5)
];

const SIGN_FONT = '"Luckiest Guy", "Arial Black", sans-serif';
/** A worksite sign texture: fitted text (never squashed, via fitText), drawn
    again once the display font arrives so it never stays on the fallback. */
function signTex(text, { w = 1024, h = 296, bg = '#1a1d29', fg = '#ffd23c', size = 180 } = {}) {
  const draw = (g) => {
    g.fillStyle = bg; g.fillRect(0, 0, w, h);
    g.strokeStyle = fg; g.lineWidth = Math.max(6, h * 0.035); const m = h * 0.05; g.strokeRect(m, m, w - 2 * m, h - 2 * m);
    fitText(g, text, w / 2, h / 2 + h * 0.02, w * 0.9, h * 0.7, size, SIGN_FONT, { lines: 2, fill: fg });
  };
  const tex = canvasTex(w, h, draw, { repeat: false });
  if (typeof document !== 'undefined' && document.fonts?.ready) document.fonts.ready.then(() => { draw(tex.image.getContext('2d')); tex.needsUpdate = true; });
  return tex;
}

const PATH = [
    { p: [20, 0, -108] },                        // 0 start/finish on the portal straight, flat and bank-free
    { p: [140, -0.6, -108] },                    // 1 the dive begins, dead level across the grid first
    { p: [198, -2.4, -96], bank: -6 },           // 2 Portal Bend: the dive's first pitch, bank catches the kart
    { p: [226, -4.2, -52], wr: 8.5, wl: 7.5 },   // 3 the chicane, right kink: first half of the S-bend (wr apron: the pursuit chord clips this inside wall — wall-map 9/race before)
    { p: [208, -5.2, -8], wl: 9 },               // 4 the chicane, left kink: the dive bottoms out at the Machine (wl apron, same reason)
    { p: [230, -5.9, 40], wr: 8 },               // 5 settle right at running depth (wr apron)
    { p: [190, -6, 84], bank: -7, wr: 7.5 },     // 6 Boring Bend: 90 degrees onto the north wall at full depth (wr apron tail: the settle's grind runs to cp ~5.5)
    { p: [118, -5.8, 105] },                     // 7 the deep run: the longest level sector in the game
    { p: [-60, -5.2, 110] },                     // 8 the deep run continues; the climb quietly begins
    { p: [-156, -3.8, 102], bank: -5 },          // 9 the climb, hairpin approach
    { p: [-198, -2.2, 56] },                     // 10 the west climb: the bore's high shoulder
    { p: [-206, -0.8, 8] },                      // 11 the west climb, deep in the hill
    { p: [-186, 0.4, -42], w: 16 },              // 12 the Ring Hairpin, entry: the corner tightens hard (w:16 — the ring sector stays wide so the loop ring fits)
    { p: [-168, 1.6, -84], bank: -5, w: 16 },    // 13 the Ring Hairpin, exit onto the crown (ring at the apex, cp ~12.6)
    { p: [-106, 2.2, -104], bank: -5 },          // 14 the crown: +2.2 m, shallowest cover, closest to daylight
    { p: [-30, 0.3, -108] },                     // 15 the settle: dead level again by the portal straight
  ];

export default {
  id: 'boring-tunnel',
  name: 'Boring Tunnel GP',
  tagline: 'One bore. No shortcut. Still digging.',
  laps: 3,
  width: 13,
  tunnelHeight: 7,                  // a single-lane bore (#234 item 2): the walls close in; the ring sector keeps w:16
  tunnelShell: false,               // #234 item 3: the bore builds its own tube (dark concrete + rainbow light strips) in decorate
  sky: 'golden',                    // the portal mouths get the golden hour (design doc: mk8-desert)
  offroad: 'sand',
  defaults: { edge: 'open', shoulder: 3, outer: 10 },
  // the opening shot: from the road at the chicane, looking down the dive's
  // last pitch into the Boring Machine's chamber — the lit bore converging
  // on the 11 m cutter face at the bottom (face centre ~(233, -0.4, -4.5);
  // re-aimed in #234 item 5: the old framing centred the road at cp 4.05
  // and the machine sat hidden behind the kink, out of frame)
  intro: [{
    pos: [216.8, -2.6, -33.2], look: [233.0, -0.4, -4.5],
    pos1: [212.9, -3.2, -24.9], look1: [233.0, -0.4, -4.5],
    fov: 55, dur: 3.4,
  }],
  lapNotes: [
    '<b>Lap 2.</b> The shortcut is still being dug. Estimated completion: soon.',
    '<b>Final lap.</b> Somewhere below you, a machine is chewing toward freedom.',
  ],
  path: PATH,
  // the whole lap is one bore except the start cutting (cp 15.5 -> 0.45),
  // where the road daylights between the berms
  tunnels: [{ from: 0.45, to: 6.4, through: true }, { from: 7.6, to: 15.5, through: true }],   // the gap is the Loop Station (#234 item 4): the bore opens under the city
  backdrop: { img: 'assets/backdrops/boring-tunnel.webp', top: 9, bottom: -0.3 },             // the boomtown skyline, painted (assets/tracks/boring-tunnel/prompts.md)
  sides: [
    { from: 15.5, to: 0.45, edge: 'wall' },   // retaining walls along the open-air cutting: the sponsor boards live here
  ],
  zones: [
    { from: 2.2, to: 8.8, skin: 'metal' },   // riveted plates from the dive's foot along the deep run
    { from: 12.1, to: 13.2, skin: 'neon' },  // the ring sector glows
  ],
  ramps: [
    { at: 13.9, len: 9, lift: 2.0, lat: 0, w: 7 },   // the crown jump: air off the high point, trick on the way down
  ],
  boosts: [
    { at: 1.0, lat: 0, w: 5 },               // on the dive: a boost downhill is a decision, not a reflex
    { at: 6.7, lat: 0, w: 5 },               // Boring Bend exit, onto the deep run
    { at: 9.3, lat: 0, w: 5 },               // mid-climb: rewards carrying speed out of the deep run
    { at: 12.7, lat: 0, w: 5 },              // hairpin exit, up the west wall
    { at: 15.7, lat: 0, w: 5 },              // the run home to the line
  ],
  // item rows: the dive, the Machine's doorstep, Boring Bend, the climb,
  // the hairpin, and the crown
  itemRows: [{ at: 1.4 }, { at: 4.3 }, { at: 6.5 }, { at: 8.6 }, { at: 10.7 }, { at: 14.2 }],
  coins: [
    { from: 0.7, to: 1.4, n: 5, lat: 0 },          // the dive line
    { from: 3.0, to: 3.9, n: 5, lat: [-3, 3] },    // slalom through the chicane
    { from: 4.6, to: 5.3, n: 5, lat: -4 },         // past the Machine, on the racing line
    { from: 7.3, to: 8.0, n: 5, lat: 3 },          // the deep run
    { from: 12.15, to: 13.05, n: 6, lat: -4 },     // the inside of the Ring Hairpin
    { from: 13.75, to: 14.2, n: 4, lat: 0, air: 2.2 },  // over the crown jump
  ],
  obstacles: [
    { kind: 'patrol', model: 'bot', at: 6.9, lats: [-4.5, -3.4], speed: 4, effect: 'spin' },   // maintenance bot working the deep run's left wall band (centre sweeps caused 6 hits/race at cp7)
    { kind: 'patrol', model: 'bot', at: 8.8, lats: [4.5, 3.4], speed: 3.5, effect: 'spin' },   // and one working the climb's right wall band
    { kind: 'orbit', model: 'drone', at: 15.6, lat: -4.6, orbit: 0.6, speed: 6, effect: 'spin' }, // survey drone worrying the home straight's left edge (mid-road orbit caused 13 hits/race at cp15.5)
    { kind: 'static', model: 'crate', at: 9.6, lat: -4.5, effect: 'bump' },                  // dig crates on the climb
    { kind: 'static', model: 'barrel', at: 5.6, lat: 4.5, effect: 'bump' },                  // a barrel at the chicane's settle
    { kind: 'static', model: 'crate', at: 12.9, lat: 4.5, effect: 'bump' },                    // crates on the crown approach
  ],
  terrain: {
    // water sits below the bore's -6 m floor: the road runs UNDER this level for
    // most of the lap, and the rescue check reads anything grounded below
    // water - 0.9 as drowned. The desert surface never gets near it.
    cell: 3, margin: 210, blend: 26, water: -9,
    fn(x, z) {
      // the massif the bore is dug through — with a graded dig apron
      // trenched along the bore's line. A `through` tunnel is excluded from
      // the terrain conform (track.js marks its samples as bridges), so
      // beside the bore the raw fn IS the ground: if it ever sat between
      // the road and the shell top, the mountain would plug the tube (the
      // conform's blend at the portal throats, and a low carve across the
      // dive, both did exactly that in review). The apron floor (-7.5 m)
      // stays below the deepest road (-6 m) everywhere along the line, and
      // the surface (city table, +14 m) stays above the highest shell top
      // (~9.2 m at the crown).
      let dp = 1e9;
      for (let k = 0; k < PATH.length; k++) {
        const a = PATH[k].p, b = PATH[(k + 1) % PATH.length].p;
        const abx = b[0] - a[0], abz = b[2] - a[2];
        const tt = Math.max(0, Math.min(1, ((x - a[0]) * abx + (z - a[2]) * abz) / (abx * abx + abz * abz || 1)));
        const dx = x - (a[0] + abx * tt), dz = z - (a[2] + abz * tt), dd = dx * dx + dz * dz;
        if (dd < dp) dp = dd;
      }
      const dLine = Math.sqrt(dp);
      // #234 item 4: a city stands on top of the bore now. The plateau is a
      // flat +14 m table (the block grid in decorate stands on it), grading
      // out to open desert and rim mesas at the horizon. The graded trench
      // along the line is unchanged: it is the start cutting, the Loop
      // Station slot, and the guarantee the ground never plugs the bore
      // (table 14 > highest shell top ~9.2 at the crown; slot floor -7.5
      // stays below the deepest road -6).
      let desert = 2.2 + (fbm(x * 0.004 + 9, z * 0.004, 3, 7) - 0.5) * 2.4;
      desert += smoothstep(240, 430, Math.hypot(x, z)) * 26;
      const table = 1 - smoothstep(105, 185, dLine);
      let h = desert * (1 - table) + 14 * table;
      const trench = 1 - smoothstep(34, 62, dLine);
      return h * (1 - trench) + -7.5 * trench;
    },
  },
  look: {
    road: { base: 0x4a4f5c, line: 0xffffff, center: 0xffd23c, glow: 0xffb347 },
    kerb: [0xe23b3b, 0xf7f7f2],
    shoulder: 0x8a7a5c,
    terrain: { low: 0xcf9a5b, high: 0xe8c88a, dry: 0xd9b878, rock: 0xa5714f, sand: 0xf0dcae, dirt: 0xb0824f },
    wall: 0xd8d2c4, wallStripe: 0xe23b3b,
    tunnelLight: 0xffd9a0, portal: 0xcfc4ae,
    ads: ['VERY BORING TUNNEL CO', 'DIGGY McDIGFACE', 'NOT A FLAMETHROWER', 'SHORTCUT COMING SOON', 'MIND THE DEPTH', 'BORED & CO', 'WE DIG IT', 'TUNNEL VISION', 'LIGHT AT THE END', 'DIG RESPONSIBLY', 'EST. 2016, DONE NEVER', 'HYPERLOOP SOON'],
  },

  /** Dress the course. ctx: { THREE, track, group, gfx, anim, view } */
  decorate(ctx) {
    const { track, anim, view } = ctx, sc = new Scenery(ctx), rng = sc.rng;
    const H = track.def.tunnelHeight ?? 7.5;

    // sample the road anywhere, tunnels included (sc.along skips those)
    const atPos = (at, lat = 0, lift = 0) => {
      const i = track.indexAtCp(at), hx = Math.hypot(track.lx[i], track.lz[i]) || 1;
      const lx = track.lx[i] / hx, lz = track.lz[i] / hx;
      return { x: track.px[i] + lx * lat, z: track.pz[i] + lz * lat, y: track.py[i] + lift, yaw: track.yaw[i], i, lx, lz };
    };
    const faceCentre = (p, side) => Math.atan2(-side * p.lx, -side * p.lz);

    /* ---- the daylight end: gantry, portal pylons, dig site ---- */
    const g0 = sc.beside(0, 1, -track.hwL[0]);
    const gantry = P.gantry(track.hwL[0] + track.hwR[0] + 1.5, 'BORING TUNNEL GP');
    sc.place(gantry, g0.x, g0.z, { yaw: g0.along, y: g0.roadY });
    view.startLights = gantry.userData.lights;

    for (const endAt of [0.45, 15.5]) {
      for (const side of [1, -1]) {
        const p = atPos(endAt, side * (track.hwL[track.indexAtCp(endAt)] + 2.8));
        const py = T.portalPylon({ h: 13 });
        sc.place(py, p.x, p.z, { y: sc.y(p.x, p.z) - 0.3, yaw: p.yaw });
      }
    }
    const signP = sc.beside(0.26, -1, 6.5);
    const pTex = signTex('THE BORING TUNNEL', { w: 1024, h: 348, size: 165 });
    sc.place(P.billboard(pTex, { w: 13, h: 4.4, legs: 5 }), signP.x, signP.z, { yaw: signP.yaw });

    // the dig site on the home straight: a spare cutter head in the dirt, cones, tyres
    const dig = sc.beside(15.3, -1, 5.5);
    sc.place(T.spareCutter(2.3), dig.x, dig.z, { yaw: dig.yaw + 0.7, y: sc.y(dig.x, dig.z) + 1.85 });
    sc.instances(partsOf(P.cone3d()), [
      { x: dig.x + 4.5, y: sc.y(dig.x + 4.5, dig.z + 2), z: dig.z + 2, yaw: 0.4 },
      { x: dig.x - 3.5, y: sc.y(dig.x - 3.5, dig.z + 3), z: dig.z + 3, yaw: 2.2 },
      { x: dig.x + 1, y: sc.y(dig.x + 1, dig.z - 4), z: dig.z - 4, yaw: 1.1 },
    ], {});
    sc.instances(partsOf(P.tyreStack(3)), [
      { x: dig.x - 5, y: sc.y(dig.x - 5, dig.z - 2), z: dig.z - 2, yaw: 0.9 },
      { x: dig.x + 6, y: sc.y(dig.x + 6, dig.z - 3), z: dig.z - 3, yaw: 2.8 },
    ], {});

    /* ---- the city on top + the Loop Station (#234 item 4) ---- */
    const TH = ctx.THREE;
    const winTex = canvasTex(256, 256, (g) => {
      g.fillStyle = '#bb905f'; g.fillRect(0, 0, 256, 256);
      for (let y = 0; y < 8; y++) for (let x = 0; x < 5; x++) {
        g.fillStyle = (x * 7 + y * 13) % 3 ? '#ffd98f' : '#77582f';
        g.fillRect(18 + x * 46, 16 + y * 30, 24, 16);
      }
    });
    const distToLine = (x, z) => {
      let dp = 1e9;
      for (let k = 0; k < PATH.length; k++) {
        const a = PATH[k].p, b = PATH[(k + 1) % PATH.length];
        const abx = b[0] - a[0], abz = b[2] - a[2];
        const tt = Math.max(0, Math.min(1, ((x - a[0]) * abx + (z - a[2]) * abz) / (abx * abx + abz * abz || 1)));
        const dx = x - (a[0] + abx * tt), dz = z - (a[2] + abz * tt), dd = dx * dx + dz * dz;
        if (dd < dp) dp = dd;
      }
      return Math.sqrt(dp);
    };
    // the block grid on the +14 table: jittered casino towers set back from
    // the trench apron, standing on the rendered terrain (sc.y), never floating
    for (let gx = -330; gx <= 330; gx += 44) for (let gz = -210; gz <= 250; gz += 44) {
      const x = gx + (rng() - 0.5) * 12, z = gz + (rng() - 0.5) * 12;
      const dl = distToLine(x, z);
      if (dl < 68 || dl > 145 || rng() < 0.32) continue;
      const y = sc.y(x, z);
      if (y < 12.5) continue;
      sc.place(T.cityTower(winTex, { w: 13 + rng() * 9, d: 13 + rng() * 9, h: 9 + rng() * 21 }), x, z,
        { yaw: (rng() < 0.5 ? 0 : Math.PI / 2) + (rng() - 0.5) * 0.1, y: y - 0.25 });
    }
    // heroes flanking the station: the pyramid hotel north of the slot, a
    // tall slab on the inside, a half-built tower with its crane to the NE
    sc.place(T.pyramidHotel(winTex, {}), 105, 188, { yaw: Math.PI, y: sc.y(105, 188) - 0.25 });
    sc.place(T.cityTower(winTex, { w: 17, d: 15, h: 27 }), 92, 16, { yaw: 0.2, y: sc.y(92, 16) - 0.25 });
    sc.place(T.constructionSite({}), 196, 182, { yaw: -0.5, y: sc.y(196, 182) - 0.25 });

    // the Loop Station: glass canopy over the bore gap, ribbed, on columns
    const glassMat = new TH.MeshStandardMaterial({ color: 0xa8d8ea, transparent: true, opacity: 0.22, roughness: 0.12, metalness: 0.05, side: TH.DoubleSide, depthWrite: false });
    const ribMat = new TH.MeshStandardMaterial({ color: 0x20505e, roughness: 0.5, metalness: 0.4, side: TH.DoubleSide });
    ctx.group.add(T.stationCanopy(track, 6.38, 7.62, glassMat, ribMat));
    for (const endAt of [6.45, 7.55]) for (const side of [1, -1]) {
      const ci = track.indexAtCp(endAt), lat = side * (track.hwL[ci] + 2.3);
      const p = atPos(endAt, lat), gy = sc.y(p.x, p.z) - 0.3, top = p.y + 2.9;
      sc.place(T.columnPost(Math.max(1.5, top - gy)), p.x, p.z, { yaw: p.yaw, y: gy });
    }
    // platforms along both edges of the station stretch
    for (const side of [1, -1]) for (let k = 0; k < 5; k++) {
      const at = 6.52 + k * 0.22, ci = track.indexAtCp(at);
      const p = atPos(at, side * (track.hwL[ci] + 1.35));
      sc.place(T.stationPlatform(27), p.x, p.z, { yaw: p.yaw + Math.PI / 2, y: p.y - 0.35 });
    }
    // a hanging LOOP STATION sign at the canopy's middle, readable both ways
    const stTex = signTex('LOOP STATION', { w: 1400, h: 260, size: 190, bg: '#101623', fg: '#39e6c3' });
    const stp = atPos(7.0, 0);
    sc.place(T.wallSign(stTex, { w: 11, h: 2.1 }), stp.x, stp.z, { yaw: stp.yaw, y: stp.y + 5.4 });
    sc.place(T.wallSign(stTex, { w: 11, h: 2.1 }), stp.x, stp.z, { yaw: stp.yaw + Math.PI, y: stp.y + 5.4 });

    /* ---- in the bore ---- */
    // the bore's own tube (#234 item 3): dark concrete + the rainbow light
    // strips, one merged geometry each; the colour wave runs on uTime.
    // TUBE_WINDOWS (module top) opens the arc where item 6 cuts the wall
    // away at the shortcut junctions.
    const uTime = { value: 0 };
    ctx.group.add(T.boreTube(track, uTime, TUBE_WINDOWS.map(w => ({ ...w, r0: track.indexAtCp(w.from), r1: track.indexAtCp(w.to) }))));
    anim.push((dt, time) => { uTime.value = time; });

    // THE BORING MACHINE at hero scale (#234 item 5): a dead-end side bore
    // off the chicane's bottom, its 11 m cutter face lit and spinning at the
    // end of the chamber, the road skimming the mouth (tube window k 5..12).
    // The old wall-chewing machine is gone — this replaces it.
    const mp = atPos(4.3, 9.2);
    const chamber = T.tbmChamber();
    sc.place(chamber, mp.x, mp.z, { yaw: faceCentre(mp, 1), y: mp.y });
    const faceP = atPos(4.3, 21.5, 5.0);
    const dustP = atPos(4.32, 12.5, 2.2);
    anim.push((dt) => {
      chamber.userData.spin.rotation.z -= dt * 1.1;
      const n = view.fx.count(26, dt);
      for (let k = 0; k < n; k++) {
        view.fx.dust(dustP.x + rng.range(-1.6, 1.6), dustP.y + rng.range(-1.4, 1.4), dustP.z + rng.range(-1.6, 1.6),
          rng.range(-1.2, 1.2), rng.range(0.4, 1.8), rng.range(-1.2, 1.2), [0.62, 0.55, 0.45], 2.4 + rng() * 2.4, 1.6, 0.5);
      }
      const s = view.fx.count(7, dt);
      for (let k = 0; k < s; k++) {
        view.fx.dust(faceP.x + rng.range(-3.4, 3.4), faceP.y + rng.range(-3.4, 3.4), faceP.z + rng.range(-1, 1),
          rng.range(-0.6, 0.6), rng.range(-2.4, -0.8), rng.range(-0.6, 0.6), [1.0, 0.62, 0.2], 0.55 + rng() * 0.5, 0.5, 0.9);
      }
    });

    // the dig gantry straddling the road just past the Machine (span/beam
    // shrunk for the 7 m bore: legs bed into the shell base, as they did at 24)
    const gp = atPos(4.75, 0);
    const gTex = signTex('MIND THE MACHINE', { w: 1600, h: 200, size: 150, bg: '#f7b500', fg: '#1a1d29' });
    sc.place(T.digGantry(gTex, { span: 14.5, beamY: 5.9 }), gp.x, gp.z, { yaw: gp.yaw + Math.PI, y: gp.y });

    // the loop-the-loop ring at the hairpin apex: visual only, drive through it mid-drift.
    // Sunk 2.5 m for the 7 m bore (#234 item 2): the 18.3 m ring keeps its size, its top
    // tucks under the shell apex (6.95 < 7) and its sides meet the road right at the
    // w:16 sector's edges, so the whole road threads the ring.
    const rp = atPos(12.6, 0);
    const ringTex = signTex('LOOP-THE-LOOP', { w: 1024, h: 240, size: 175 });
    sc.place(T.loopRing(ringTex), rp.x, rp.z, { yaw: rp.yaw, y: rp.y - 2.5 });

    // ceiling fans on the dive, on the deep run, and on the crown settle;
    // the deep-run fan is the big vent fan, half again as large
    const fans = [];
    for (const [at, s] of [[1.95, 1], [7.6, 1.9], [12.45, 1]]) {
      const p = atPos(at, 0, H - 0.1), fan = T.ceilingFan();
      fan.scale.setScalar(s);
      sc.place(fan, p.x, p.z, { y: p.y });
      fans.push(fan);
    }
    anim.push((dt) => { for (const f of fans) f.rotation.y += dt * 2.4; });

    // tripod work lights down both walls: the mid-distance structure in every tunnel view
    for (const [at, side] of [[2.2, 1], [3.7, -1], [5.3, 1], [7.3, -1], [9.4, 1], [11.3, -1], [12.9, 1], [13.9, -1]]) {
      const ci = track.indexAtCp(at), hw = (side > 0 ? track.hwL[ci] : track.hwR[ci]);
      const p = atPos(at, side * (hw - 0.3));
      sc.place(T.workLight(), p.x, p.z, { yaw: faceCentre(p, side), y: p.y });
    }

    // wall signs, big and just proud of the shell: a readable joke every few seconds
    const wallSignAt = (at, side, text, seed) => {
      const ci = track.indexAtCp(at);
      const p = atPos(at, side * ((side > 0 ? track.hwL[ci] : track.hwR[ci]) - 0.35));
      const tex = seed % 2 ? signTex(text, { size: 175 }) : signTex(text, { size: 175, bg: '#f7b500', fg: '#1a1d29' });
      sc.place(T.wallSign(tex, { w: 9, h: 2.6 }), p.x, p.z, { yaw: faceCentre(p, side), y: p.y + 3.1 });
    };
    wallSignAt(2.7, -1, 'NEXT EXIT: 40 MILES', 11);
    wallSignAt(3.9, 1, 'SHORTCUT STILL BEING DUG', 23);
    wallSignAt(6.4, -1, 'NOT A FLAMETHROWER', 37);
    wallSignAt(8.15, -1, 'EST. COMPLETION: SOON', 53);
    wallSignAt(9.7, 1, 'MIND THE HAIRPIN', 67);
    wallSignAt(13.4, -1, 'LIGHT AT THE END', 71);

    // chevron boards on the outside wall of every real corner, inside the bore
    for (const c of track.corners) {
      if (!c.dir || c.len < 14) continue;
      const side = c.dir > 0 ? -1 : 1, n = Math.max(2, Math.min(4, Math.round(c.len / 16)));
      for (let k = 0; k < n; k++) {
        const i = (c.i0 + Math.round(((k + 0.6) / n) * (c.len / track.ds))) % track.N;
        const hx = Math.hypot(track.lx[i], track.lz[i]) || 1, lx = track.lx[i] / hx, lz = track.lz[i] / hx;
        const lat = side * ((side > 0 ? track.hwL[i] : track.hwR[i]) - 1.15);
        const board = P.chevronBoard(); if (c.dir > 0) board.scale.x = -1;
        sc.place(board, track.px[i] + lx * lat, track.pz[i] + lz * lat, { yaw: Math.atan2(-side * lx, -side * lz), y: track.py[i], lift: 0.9 });
      }
    }

    /* ---- the desert above ---- */
    const rocks = sc.scatter({ count: 130, min: 14, max: 170, maxSlope: 0.85, minGap: 4 });
    sc.instances(partsOf(P.rock(1, { r: 1.5 })), rocks.filter((_, i) => i % 2 === 0), { scale: [0.7, 2.2], yaw: 'random', tints: [0xb0824f, 0x9a938a, 0xc19a6b] });
    sc.instances(partsOf(P.bush(2, { color: 0xa08b4f })), rocks.filter((_, i) => i % 2 === 1), { scale: [0.8, 1.6], yaw: 'random' });

    const cols = [[0xe23b3b, 0xf7b500], [0x38b6ff, 0xffffff]];
    const balloons = cols.map((c, i) => {
      const b = P.balloon(c), a = 0.8 + i * 2.4, r = 240 + i * 70;
      b.position.set(Math.cos(a) * r, 62 + i * 11, Math.sin(a) * r); b.scale.setScalar(1.5);
      ctx.group.add(b); return b;
    });
    const ship = P.blimp('VERY BORING'); ship.scale.setScalar(1.25); ctx.group.add(ship);
    anim.push((dt, time) => {
      balloons.forEach((b, i) => { b.position.y += Math.sin(time * 0.4 + i * 1.7) * dt * 0.8; b.rotation.y += dt * 0.05; });
      const a = time * 0.03;
      ship.position.set(Math.cos(a) * 265, 96 + Math.sin(time * 0.3) * 2, Math.sin(a) * 265);
      ship.rotation.y = -a;
    });
  },
};
