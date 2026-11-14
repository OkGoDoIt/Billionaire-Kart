/* Race through the rainbow commuter bore, a working excavation, and a casino
   transit station. A straight pours through the chicane on the final lap. */
import { fbm, smoothstep } from '../core/util.js';

import { Scenery, partsOf } from '../render/scenery.js';
import * as P from '../models/props.js';
import * as T from '../models/props-boring-tunnel.js';
import { canvasTex, fitText } from '../render/textures.js';

// The maintenance road and its roof share the chicane cavern with the racing line.
const JUNCTION = { from: 2.95, to: 5.9 };
const BREAKTHROUGH = [[227, -49], [227, -36], [227, -23], [228, -9], [228, 5], [228, 17], [227, 27]];

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
  skyOverrides: { sunIntensity: 2.7, sunDir: [-0.52, 0.52, -0.68], hemiSky: 0xa2cce5, hemiGround: 0xc19474, exposure: 1.0 },
  offroad: 'sand',
  defaults: { edge: 'open', shoulder: 3, outer: 10 },
  // The camera follows the chicane toward the rotating cutter.
  intro: [{
    pos: [216, -2.0, -28], look: [198.5, 0.4, 5],
    pos1: [209, -1.9, -16], look1: [198.5, 0.4, 5],
    fov: 41, dur: 3.4,
  }],
  lapNotes: [
    '<b>Lap 2.</b> The shortcut is still being dug. Estimated completion: soon.',
    '<b>Final lap.</b> The cement has set. Take the green express lane at the dig.',
  ],
  path: PATH,
  // the whole lap is one bore except the start cutting (cp 15.5 -> 0.45),
  // where the road daylights between the berms
  tunnels: [{ from: 0.45, to: 2.95, through: true }, { from: 5.9, to: 6.4, through: true }, { from: 7.6, to: 15.5, through: true }],   // gaps: the Loop Station (#234 item 4) + the two shortcut junctions (item 6)
  backdrop: { img: 'assets/backdrops/boring-tunnel.webp', top: 9, bottom: -0.3 },             // the boomtown skyline, painted (assets/tracks/boring-tunnel/prompts.md)
  sides: [
    { from: 15.5, to: 0.45, edge: 'wall' },   // retaining walls along the open-air cutting: the sponsor boards live here
    // #234 item 6: the breakthrough cut's junctions. The cut crosses the
    // S-bend's inside (the L side at both ends); the facing side opens onto
    // the dug bench (outer 30, no hoardings to block the mouths), the far
    // side stays a wall. The bench surface itself is def.lake below.
    { from: 2.95, to: 5.9, side: 'L', edge: 'open', outer: 30, hoarding: false },
    { from: 2.95, to: 5.9, side: 'R', edge: 'wall' },
  ],
  // #234 item 6: the shortcut breaks through on the final lap. The lake
  // hook carries the joke: the side bore's floor is WET CEMENT (speed 0.2)
  // until the final lap, then sets hard and fast (0.92). levelForLap stays
  // deep below the bench, so it never reads as water — no drownings, and
  // the AI's dry-path check always passes; the shortcuts entry's `when`
  // is what actually gates it to the final lap.
  lake: {
    inside(x, z) {
      const seg = BREAKTHROUGH;
      for (let k = 0; k < seg.length - 1; k++) {
        const [ax, az] = seg[k], [bx, bz] = seg[k + 1];
        const abx = bx - ax, abz = bz - az;
        const tt = Math.max(0, Math.min(1, ((x - ax) * abx + (z - az) * abz) / (abx * abx + abz * abz || 1)));
        const dx = x - (ax + abx * tt), dz = z - (az + abz * tt);
        if (dx * dx + dz * dz < 6.2 * 6.2) return true;
      }
      return false;
    },
    levelForLap() { return -50; },
    surface(depth, race) {
      return race.lakeLap >= race.laps
        ? { id: 'cement', speed: 0.92, grip: 0.95, dust: 0xb9b3a4, rumble: 0.25, offroad: true }
        : { id: 'wet-cement', speed: 0.2, grip: 0.5, dust: 0x9d968b, rumble: 0.4, offroad: true };
    },
  },
  shortcuts: [{
    name: 'The Breakthrough',
    from: 2.8, to: 5.1,
    path: BREAKTHROUGH,
    skill: 0.55,
    when: (race) => race.lakeLap >= race.laps,
  }],
  zones: [
    { from: 2.2, to: 8.8, skin: 'metal' },   // riveted plates from the dive's foot along the deep run
    { from: 12.1, to: 13.2, skin: 'neon' },  // the ring sector glows
  ],
  ramps: [
    { at: 13.9, len: 9, lift: 2.0, lat: -2.1, w: 7 },   // the crown jump: air off the high point, trick on the way down
  ],
  boosts: [
    { at: 1.0, lat: 0, w: 5 },               // on the dive: a boost downhill is a decision, not a reflex
    { at: 7.14, lat: -3.0, w: 5 },               // Boring Bend exit, onto the deep run
    { at: 9.3, lat: 2.4, w: 5 },               // mid-climb: rewards carrying speed out of the deep run
    { at: 12.7, lat: 0, w: 5 },              // hairpin exit, up the west wall
    { at: 15.7, lat: 0, w: 5 },              // the run home to the line
  ],
  // Open an attack on the dive, collect again at the station, stock up for the climb, then race home.
  itemRows: [{ at: 1.4 }, { at: 6.65, n: 3 }, { at: 8.6 }, { at: 14.2 }],
  coins: [
    { from: 0.7, to: 1.4, n: 5, lat: 0 },          // the dive line
    { from: 3.0, to: 3.9, n: 5, lat: [-3, 3] },    // slalom through the chicane
    { from: 4.6, to: 5.3, n: 5, lat: -4 },         // past the Machine, on the racing line
    { from: 7.3, to: 8.0, n: 5, lat: 3 },          // the deep run
    { from: 12.15, to: 13.05, n: 6, lat: -4 },     // the inside of the Ring Hairpin
    { from: 13.75, to: 14.2, n: 4, lat: -2.1, air: 2.2 },  // over the crown jump
  ],
  models: { taxi: () => T.robotaxi(signTex('AUTOPILOT-ISH', { w: 900, h: 200, size: 118, bg: '#101623', fg: '#39e6c3' })) },
  obstacles: [
    { kind: 'patrol', model: 'taxi', at: 6.95, lats: [3.2, 5.6], speed: 1.9, effect: 'spin' },   // a robotaxi forever nosing halfway across the station lane, then thinking better of it (#234 item 7: a full-lane crossing cost +16 hits/race in sim A/B — a wall of spins at racing speed; the half-crossing reads the same from the kart and costs ~0)
    { kind: 'patrol', model: 'bot', at: 8.8, lats: [4.5, 3.4], speed: 3.5, effect: 'spin' },   // and one working the climb's right wall band
    { kind: 'orbit', model: 'drone', at: 15.74, lat: -5.1, orbit: 0.35, speed: 6, effect: 'spin' }, // survey drone worrying the home straight's left edge (mid-road orbit caused 13 hits/race at cp15.5)
    { kind: 'static', model: 'crate', at: 9.6, lat: -4.5, effect: 'bump' },                  // dig crates on the climb
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
    const steelDeck = view.trackMesh.getObjectByName('road_metal').material;
    steelDeck.roughness = 0.73; steelDeck.metalness = 0.28;

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
        const a = PATH[k].p, b = PATH[(k + 1) % PATH.length].p;
        const abx = b[0] - a[0], abz = b[2] - a[2];
        const tt = Math.max(0, Math.min(1, ((x - a[0]) * abx + (z - a[2]) * abz) / (abx * abx + abz * abz || 1)));
        const dx = x - (a[0] + abx * tt), dz = z - (a[2] + abz * tt), dd = dx * dx + dz * dz;
        if (dd < dp) dp = dd;
      }
      return Math.sqrt(dp);
    };
    // the block grid on the +14 table: jittered casino towers set back from
    // the trench apron, standing on the rendered terrain (sc.y), never floating
    // Share one set of windows, caps, and foundations per skyline silhouette.
    const towerBlocks = [[], [], []];
    for (let gx = -330; gx <= 330; gx += 44) for (let gz = -210; gz <= 250; gz += 44) {
      const x = gx + (rng() - 0.5) * 12, z = gz + (rng() - 0.5) * 12, d = distToLine(x, z);
      if (d < 68 || d > 145 || rng() < 0.32) continue;
      towerBlocks[Math.floor(rng() * 3)].push({ x, z, y: sc.y(x, z) - 0.25, yaw: rng() < 0.5 ? 0 : Math.PI / 2, sy: 0.85 + rng() * 0.4 });
    }
    towerBlocks.forEach((blocks, i) => sc.instances(partsOf(T.cityTower(winTex, { w: 15 + i * 2, d: 14, h: 15 + i * 8 })), blocks, { cast: false }));
    // heroes flanking the station: the pyramid hotel north of the slot, a
    // tall slab on the inside, a half-built tower with its crane to the NE
    sc.place(T.pyramidHotel(winTex, {}), 105, 188, { yaw: Math.PI, y: sc.y(105, 188) - 0.25 });
    sc.place(T.cityTower(winTex, { w: 17, d: 15, h: 27 }), 92, 16, { yaw: 0.2, y: sc.y(92, 16) - 0.25 });
    sc.place(T.constructionSite({}), 196, 182, { yaw: -0.5, y: sc.y(196, 182) - 0.25 });

    // the Loop Station: glass canopy over the bore gap, ribbed, on columns
    const glassMat = new TH.MeshStandardMaterial({ color: 0x6eb5c5, transparent: true, opacity: 0.36, roughness: 0.12, metalness: 0.05, side: TH.DoubleSide, depthWrite: false });
    const ribMat = new TH.MeshStandardMaterial({ color: 0x20505e, roughness: 0.5, metalness: 0.4, side: TH.DoubleSide });
    ctx.group.add(T.stationCanopy(track, 6.38, 7.62, glassMat, ribMat));
    const stationColumns = [];
    for (let d = track.sAtCp(6.38); d < track.sAtCp(7.62); d += 12) for (const side of [1, -1]) {
      const i = Math.round(d / track.ds), p = atPos(track.cp[i], side * ((side > 0 ? track.hwL[i] : track.hwR[i]) + 4.8));
      const y = sc.y(p.x, p.z) - 0.25;
      stationColumns.push({ x: p.x, z: p.z, y, yaw: p.yaw, sy: Math.max(1.5, p.y + 3.15 - y) / 4 });
    }
    sc.instances(partsOf(T.columnPost(4)), stationColumns);
    const clock = T.stationClock(), clockP = atPos(7.17, -10.9);
    sc.place(clock, clockP.x, clockP.z, { yaw: clockP.yaw + Math.PI - 0.30, y: clockP.y + 6.1 });
    anim.push((dt) => { clock.userData.hand.rotation.z += dt * 1.1; });
    // One continuous strip per side, including where the spline control points spread out.
    for (const side of [1, -1]) {
      const platforms = [];
      const begin = track.sAtCp(6.43), end = track.sAtCp(7.59), count = Math.ceil((end - begin) / 7), step = (end - begin) / count;
      for (let n = 0; n < count; n++) {
        const distance = begin + (n + 0.5) * step, i = Math.round(distance / track.ds);
        const p = atPos(track.cp[i], side * ((side > 0 ? track.hwL[i] : track.hwR[i]) + 1.7));
        platforms.push({ x: p.x, z: p.z, y: p.y - 0.38, yaw: p.yaw + side * Math.PI / 2 });
      }
      sc.instances(partsOf(T.stationPlatform(step + 0.3)), platforms, { cast: false });
    }
    const stationBoard = (at, title, detail) => {
      const p = atPos(at);
      sc.place(T.departuresBoard(signTex(title, { w: 1200, h: 215, bg: '#143f52', fg: '#91ffe5' }),
        signTex(detail, { w: 1200, h: 240, bg: '#111c2c', fg: '#ffcc5b' })), p.x, p.z, { yaw: p.yaw + Math.PI, y: p.y + 3.9 });
    };
    const stationProp = (obj, at, lat, scale = 1, turn = 0, lift = .53) => {
      const p = atPos(at, lat);
      return sc.place(obj, p.x, p.z, { y: p.y + lift, yaw: p.yaw + turn, scale, cast: false });
    };
    // The lime body, orange spiral, dark chassis and eye whites read from
    // across the carriageway. Run the exhibit when a human actually approaches.
    stationProp(T.timingLane(), 6.77, -9.55, 1, Math.PI / 2);
    const snail = stationProp(T.paceSnail(), 6.77, -8.65, 1.04, 2.45, .8);
    snail.scale.x *= -1; // Keep the shell toward the road and the head moving down the timing lane.
    stationProp(T.stalledPrototype(), 6.75, -11.45, 1.10, Math.PI / 2 - .32, .8);
    stationProp(T.trialOfficial(), 6.79, 8.55, 1.15, Math.PI + .22);
    const tape = atPos(6.77, -8.65), start = track.sAtCp(6.33), finish = track.sAtCp(6.76);
    const statusSigns = ['SNAIL LEADS', 'PHOTO FINISH', 'SNAIL WINS'].map(line =>
      signTex(line, { w: 1050, h: 220, bg: '#163d41', fg: '#c4ff97' }));
    const raceBoard = T.departuresBoard(signTex('SPEED TRIAL', { w: 1050, h: 220, bg: '#20313b', fg: '#ffce51' }), statusSigns[0]);
    stationProp(raceBoard, 6.89, 0, .88, Math.PI, 4.25);
    const resultFace = raceBoard.children.at(-1).material;
    anim.push((dt, time) => {
      const racer = view.race.players[0] || view.race.order[0];
      if (!racer) return;
      const t = Math.max(0, Math.min(1, (racer.s - start) / (finish - start)));
      const along = -3.8 + 8.2 * t;
      snail.position.x = tape.x + along * Math.sin(tape.yaw);
      snail.position.z = tape.z + along * Math.cos(tape.yaw);
      snail.userData.stalks.rotation.z = .032 * Math.sin(time * 2.2);
      resultFace.map = statusSigns[Math.max(0, Math.min(2, racer.lap - 1))];
    });
    stationBoard(7.27, 'MASS TRANSIT', 'NEXT FOUR, PLEASE');
    stationProp(T.boardingQueue(), 7.13, 9.55, 1.22, Math.PI / 2 + .19, .28);
    stationProp(T.fourSeatShuttle(), 7.30, 9.05, 1.42, Math.PI / 2);
    stationProp(T.boardingArrow(), 7.25, 8.15, 1.18, Math.PI - .18, 4.9);

    /* ---- in the bore ---- */
    // the bore's own tube (#234 item 3): dark concrete + the rainbow light
    // strips, one merged geometry each; the colour wave runs on uTime.
    // The dig hall shares a continuous roof with the bore.
    const uTime = { value: 0 };
    ctx.group.add(T.boreTube(track, uTime, JUNCTION));
    anim.push((dt, time) => { uTime.value = time; });

    // The road peels away from the cutter. Its working face points up the dive
    // while the express lane passes on the opposite side of the chamber.
    const chamber = T.tbmChamber(), faceX = 198.5, faceZ = 5, faceY = 0.1, yaw = 2.66;
    sc.place(chamber, faceX, faceZ, { yaw, y: faceY });
    const bricks = atPos(4.30, -12.7);
    sc.place(T.brickShowroom(), bricks.x, bricks.z, { y: bricks.y - .18, yaw: bricks.yaw + Math.PI - .28, scale: 1.58, cast: false });
    const showroomSign = T.departuresBoard(signTex('AFFORDABLE HOUSING', { w: 1180, h: 220, bg: '#633825', fg: '#ffdda2' }),
      signTex('SOME ASSEMBLY REQUIRED', { w: 1180, h: 220, bg: '#2d2829', fg: '#ffe9ca' }));
    const sale = atPos(4.20, -4.1);
    sc.place(showroomSign, sale.x, sale.z, { y: sale.y + 6.05, yaw: sale.yaw + Math.PI - .10, scale: .89, cast: false });
    const spare = atPos(4.19, -9.75);
    sc.place(T.wallSign(signTex('VACUUM SOLD SEPARATELY', { w: 960, h: 160, bg: '#4b332b', fg: '#f7e5c4' }), { w: 6.1, h: .88 }),
      spare.x, spare.z, { y: spare.y + 2.06, yaw: spare.yaw + Math.PI - .3, cast: false });
    const faceP = { x: faceX, y: faceY, z: faceZ };
    const dustP = { x: faceX + 3.9, y: faceY - 4.4, z: faceZ + 0.8 };
    anim.push((dt) => {
      chamber.userData.spin.rotation.z -= dt * 1.1;
      const n = view.fx.count(12, dt);
      for (let k = 0; k < n; k++) {
        view.fx.dust(dustP.x + rng.range(-1.6, 1.6), dustP.y + rng.range(-1.4, 1.4), dustP.z + rng.range(-1.6, 1.6),
          rng.range(-1.2, 1.2), rng.range(0.4, 1.8), rng.range(-1.2, 1.2), [0.42, 0.39, 0.35], 0.95 + rng() * 1.15, 1.15, 0.38);
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
    const gTex = signTex('MIND THE MACHINE', { w: 1150, h: 225, size: 150, bg: '#f7b500', fg: '#1a1d29' });
    sc.place(T.digGantry(gTex, { span: 16.4, beamY: 7.35 }), gp.x, gp.z, { yaw: gp.yaw + Math.PI, y: gp.y });

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
    for (const [at, s] of [[2.2, 1], [9.72, 1.4], [9.85, 1.4], [9.98, 1.4], [12.45, 1]]) {
      const p = atPos(at, 0, H - 0.1), fan = T.ceilingFan();
      fan.scale.setScalar(s);
      sc.place(fan, p.x, p.z, { y: p.y });
      fans.push(fan);
    }
    anim.push((dt) => { for (const f of fans) f.rotation.y += dt * 2.4; });

    // tripod work lights down both walls: the mid-distance structure in every tunnel view
    for (const [at, side] of [[2.2, 1], [5.3, 1], [9.4, 1], [11.3, -1], [12.9, 1], [13.9, -1]]) {
      const ci = track.indexAtCp(at), hw = (side > 0 ? track.hwL[ci] : track.hwR[ci]);
      const p = atPos(at, side * (hw - 0.3));
      sc.place(T.workLight(), p.x, p.z, { yaw: faceCentre(p, side), y: p.y });
    }

    const bannerAt = (at, text, amber = false) => {
      const p = atPos(at), colors = amber ? { bg: '#f4aa28', fg: '#18202a' } : {};
      const tex = signTex(text, { w: 1280, h: 225, size: 165, ...colors });
      sc.place(T.hangBanner(tex, { w: 11, h: 1.9 }), p.x, p.z, { yaw: p.yaw + Math.PI, y: p.y + 4.3 });
    };
    bannerAt(1.85, 'NEXT EXIT: 40 MILES');
    bannerAt(6.08, 'NOT A FLAMETHROWER', true);
    bannerAt(8.15, 'EST. COMPLETION: SOON');
    bannerAt(10.1, 'AIR SOLD SEPARATELY', true);
    bannerAt(13.4, 'LIGHT AT THE END');

    // A pair of pressure mains traces the shaft on the climb. The repeated
    // clamps make its curvature readable before the hairpin comes into view.
    const mains = new TH.Group(), conduitClamps = [];
    for (const [lift, color] of [[2.05, 0xef823b], [2.54, 0x69aab9]]) {
      const points = [];
      for (let i = track.indexAtCp(9.22); i <= track.indexAtCp(12.12); i += 2) {
        const p = new TH.Vector3(); track.pointAt(i * track.ds, -track.hwR[i] + 0.16, p, lift); points.push(p);
        if (i % 8 < 2) conduitClamps.push({ x: p.x, y: p.y, z: p.z, yaw: track.yaw[i] });
      }
      const pipe = new TH.Mesh(new TH.TubeGeometry(new TH.CatmullRomCurve3(points), points.length * 2, 0.18, 8),
        new TH.MeshStandardMaterial({ color, metalness: 0.28, roughness: 0.62 })); mains.add(pipe);
    }
    ctx.group.add(mains);
    const clampGeo = new TH.CylinderGeometry(0.22, 0.22, 0.18, 8); clampGeo.rotateX(Math.PI / 2);
    sc.instances([{ geometry: clampGeo, material: new TH.MeshStandardMaterial({ color: 0x333e4a }) }], conduitClamps, { cast: false });

    // chevron boards on the outside wall of every real corner, inside the bore
    for (const c of track.corners) {
      if (!c.dir || c.len < 14) continue;
      const side = c.dir > 0 ? -1 : 1, n = Math.max(2, Math.min(4, Math.round(c.len / 16)));
      for (let k = 0; k < n; k++) {
        const i = (c.i0 + Math.round(((k + 0.6) / n) * (c.len / track.ds))) % track.N;
        if (track.cp[i] > 3.5 && track.cp[i] < 4.28 && side < 0) continue; // keep the cutter's face clear
        const hx = Math.hypot(track.lx[i], track.lz[i]) || 1, lx = track.lx[i] / hx, lz = track.lz[i] / hx;
        const lat = side * ((side > 0 ? track.hwL[i] : track.hwR[i]) - 1.15);
        const board = P.chevronBoard();
        sc.place(board, track.px[i] + lx * lat, track.pz[i] + lz * lat, { yaw: Math.atan2(-side * lx, -side * lz), y: track.py[i], lift: 0.9 });
        if (c.dir > 0) board.scale.x = -1;
      }
    }

    /* ---- the breakthrough cut (#234 item 6): slab, barrier, rubble ---- */
    // a cement slab on the dug bench along the cut line: wet (dark, glossy)
    // until the final lap, then set (pale, matte) — the surface speed flips
    // with it via def.lake. y follows the rendered terrain, tucked under
    // the road edges at both ends.
    const cementMat = new TH.MeshStandardMaterial({ color: 0x74767a, roughness: 0.64, side: TH.DoubleSide });
    const edgeMat = new TH.MeshBasicMaterial({ color: 0xffad32, side: TH.DoubleSide });
    const cutRibbon = (low, high, material, lift) => {
      const points = [], indices = [];
      for (let k = 1; k < BREAKTHROUGH.length; k++) {
        const [ax, az] = BREAKTHROUGH[k - 1], [bx, bz] = BREAKTHROUGH[k], length = Math.hypot(bx - ax, bz - az), steps = Math.ceil(length / 1.5);
        for (let j = k === 1 ? 0 : 1; j <= steps; j++) {
          const f = j / steps, x = ax + (bx - ax) * f, z = az + (bz - az) * f;
          for (const offset of [low, high]) {
            const vx = x + (bz - az) / length * offset, vz = z - (bx - ax) / length * offset;
            // Fade the slab under the asphalt where both lanes share a mouth.
            const hit = track.ground(vx, vz, -1, sc.hit);
            points.push(vx, hit.y + (hit.onRoad ? -0.08 : lift), vz);
          }
          const i = points.length / 3 - 2;
          if (i) indices.push(i - 2, i, i - 1, i - 1, i, i + 1);
        }
      }
      const g = new TH.BufferGeometry(); g.setAttribute('position', new TH.Float32BufferAttribute(points, 3)); g.setIndex(indices); g.computeVertexNormals();
      ctx.group.add(new TH.Mesh(g, material));
    };
    cutRibbon(-4.9, 4.9, cementMat, 0.09);
    for (const side of [-1, 1]) cutRibbon(side * 4.6 - 0.13, side * 4.6 + 0.13, edgeMat, 0.14);
    const bp = { x: 228, z: -23 };
    const barrier = T.shortcutBarrier(signTex('WET CEMENT', { w: 840, h: 200, bg: '#c9631c', fg: '#ffffff' }));
    sc.place(barrier, bp.x, bp.z, { yaw: Math.PI, y: sc.y(bp.x, bp.z) - 0.1, scale: 1.45 });
    const fork = atPos(3.08, 2.5);
    const forkSign = (words, bg, fg) => sc.place(T.hangBanner(signTex(words, { w: 1180, h: 230, bg, fg }), { w: 10.4, h: 1.9 }),
      fork.x, fork.z, { yaw: Math.PI, y: fork.y + 4.8 });
    const closed = forkSign('SHORTCUT COMING SOON', '#21212b', '#ffc442');
    const opened = forkSign('EXPRESS OPEN  ↑', '#084442', '#91ffe0'); opened.visible = false;
    sc.instances(partsOf(P.rock(3, { r: 1.1 })), [
      { x: 233, y: sc.y(233, -38), z: -38, yaw: 0.7 }, { x: 235, y: sc.y(235, -27), z: -27, yaw: 2.4 },
      { x: 231, y: sc.y(231, 13), z: 13, yaw: 1.5 }, { x: 234, y: sc.y(234, 22), z: 22, yaw: 3.0 },
    ], { scale: [0.8, 1.7], tints: [0x8d8d94, 0x767680, 0x9a938a] });

    // the breakthrough: on the final lap the barrier tips flat in a burst
    // of dust and the cement sets
    let tip = 0, burstDone = false;
    const wet = new TH.Color(0x76746d), dry = new TH.Color(0xa8a296);
    anim.push((dt) => {
      if (view.race.lakeLap >= view.race.laps) {
        if (!burstDone) {
          opened.visible = true; closed.visible = false; edgeMat.color.setHex(0x44f7bd);
          burstDone = true;
          for (let k = 0; k < 22; k++) {
            view.fx.dust(bp.x + rng.range(-2.6, 2.6), sc.y(bp.x, bp.z) + rng.range(0.2, 2.2), bp.z + rng.range(-1, 1),
              rng.range(-1.6, 1.6), rng.range(0.6, 2.6), rng.range(-1.6, 1.6), [0.66, 0.6, 0.5], 1.8 + rng() * 2.2, 1.8, 0.55);
          }
        }
        if (tip < 1) {
          tip = Math.min(1, tip + dt * 1.7);
          const e = 1 - (1 - tip) * (1 - tip);
          barrier.userData.pivot.rotation.x = -Math.PI / 2 * e;
          barrier.visible = tip < 1;
          cementMat.color.lerpColors(wet, dry, e);
          cementMat.roughness = 0.3 + 0.6 * e;
        }
      }
    });

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
