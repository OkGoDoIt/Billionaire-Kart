/* International Waters: a boardwalk causeway around a turquoise harbour,
   reworked after the lead's PR #112 review so the jokes live AT the road.
   The lap: a flat run down the north straight UNDER the dry-docked
   S.S. EXTRADITION DENIED (her name in 4.5 m letters on the hull), the tight
   Ellison Elbow and the climb past Ellison's yacht (hauled in close) to the
   Harbour Crest, a rolling descent past the flag shop to the sheltered basin,
   a ramp jump between two barges, the brass mailbox wall, the tight Murdoch
   Elbow past Murdoch's yacht, a run straight across the seastead's deck, an
   S-bend, a customs checkpoint that waves everyone through, and home.
   Design: docs/track-design-waters.md. */
import { fbm, smoothstep } from '../core/util.js';

import { Scenery, partsOf } from '../render/scenery.js';
import * as P from '../models/props.js';
import * as C from '../models/props-crypto-cove.js';
import * as W from '../models/props-international-waters.js';

const ADS = ['NO JURISDICTION', 'TAX HAVEN AHEAD', 'FLAG OF CONVENIENCE', 'EXTRADITION FREE ZONE', 'DUTY FREE SPEED', 'NO LAWS JUST LAPS', 'OFFSHORE AND ON COURSE', 'TWELVE MILES OUT', 'SEASTEAD SUITES', 'SMUGGLERS WELCOME'];

export default {
  id: 'international-waters',
  name: 'International Waters',
  tagline: 'No jurisdiction. No speed limit.',
  laps: 3,
  width: 19,
  sky: 'day',
  offroad: 'water',
  defaults: { edge: 'void', shoulder: 0, outer: 11 },
  // Hand-authored: elevations keep the sector story (0 at the grid, +7.9 at
  // the Harbour Crest, basin at +3.6, second rise to +4.8 at Murdoch), but the
  // two elbows are now real drift corners (centreline radius ~25 m) and the
  // west return has an S-bend and a genuine final corner.
  path: [
    { p: [-196, 0, -140], bank: 0 },          // 0 start/finish, north straight, heading +x
    { p: [-78, 1.0, -147], bank: -5 },        // 1 the rise begins, politely (dry dock overhead at ~1.6)
    { p: [76, 2.0, -138], bank: -6.5 },       // 2 North Sweep
    { p: [176, 2.8, -134], bank: -7 },        // 3 Ellison approach
    { p: [220, 3.8, -118], bank: -11, w: 20 },// 4 Ellison Elbow: the turn-in
    { p: [228, 5.4, -74], bank: -11 },        // 5 the apex, and the climb begins
    { p: [224, 7.9, -6], bank: -6 },          // 6 the Harbour Crest
    { p: [198, 6.4, 74], bank: -3 },          // 7 East Reach, flag shop outside
    { p: [92, 4.0, 132], bank: -4 },          // 8 the descent to the basin
    { p: [-24, 3.6, 154], bank: -5 },         // 9 the basin straight: mailbox wall, then the barge jump
    { p: [-96, 4.0, 152], bank: -6 },         // 10 basin exit
    { p: [-146, 4.3, 150], bank: -9 },        // 11 Murdoch approach
    { p: [-204, 4.8, 122], bank: -12, w: 20 },// 12 Murdoch Elbow apex
    { p: [-200, 4.6, 64], bank: -10 },        // 13 the exit leg: the seastead astride at ~13.4
    { p: [-186, 3.9, 0], bank: 7 },           // 14 the S-bend kink (the lap's one left)
    { p: [-230, 2.4, -64], bank: -6 },        // 15 the settle, customs at ~15.55
    { p: [-238, 1.0, -118], bank: -3 },       // 16 NW Return, settling to sea level
  ],
  // the whole lap is a deck on pillars over the sea: no terrain pull-up,
  // and driving off the edge means a swim and a rescue
  bridges: [{ from: 0, to: 8.5 }, { from: 8.5, to: 17 }],
  // striped barrier walls flank the seastead crossing and the customs lane
  sides: [
    { from: 13.02, to: 13.78, edge: 'wall' },
    { from: 15.32, to: 15.78, edge: 'wall' },
  ],
  zones: [
    { from: 16.55, to: 5.2, skin: 'wood' },   // boardwalk planks: grid, rise, north sweep, elbow and climb
  ],
  // the signature moment: a ramp hop between two barges on the basin straight
  ramps: [{ at: 9.42, len: 10, lift: 2.6 }],
  gaps: [{ from: 9.56, to: 9.76 }],
  boosts: [
    { at: 0.55, lat: 0, w: 5 },
    { at: 6.35, lat: 0, w: 5 },               // crest exit: the climb's reward
    { at: 9.92, lat: 0, w: 5 },               // the jump landing
    { at: 13.4, lat: 0, w: 5 },               // the seastead subsidises speed
    { at: 15.62, lat: 0, w: 5 },              // waved through customs
  ],
  itemRows: [
    { at: 1.2 }, { at: 4.4 },                 // the straight, and mid-elbow
    { at: 7.3 }, { at: 10.6 },                // East Reach, basin exit
    { at: 12.9 }, { at: 16.5 },               // Murdoch exit, the run home
  ],
  coins: [
    { from: 0.3, to: 0.8, n: 4, lat: 4 },
    { from: 3.85, to: 4.5, n: 5, lat: [-5, 3] },  // the Ellison Elbow line
    { from: 5.9, to: 6.4, n: 5, lat: 0 },         // over the crest
    { from: 7.9, to: 8.5, n: 5, lat: [4, -4] },   // the swell into the basin
    { from: 9.58, to: 9.74, n: 3, lat: 0, air: 2.8 }, // over the barge gap
    { from: 11.35, to: 11.95, n: 5, lat: [-3, 3] },   // the Murdoch Elbow line
    { from: 14.05, to: 14.65, n: 4, lat: [3, -3] },   // through the S-bend
    { from: 16.15, to: 16.7, n: 4, lat: -3 },     // the run home
  ],
  obstacles: [
    // moored mines that slipped their chains, each with a clear line past
    { kind: 'static', model: 'mine', at: 2.3, lat: 6.5, effect: 'spin', radius: 1.1 },
    { kind: 'static', model: 'mine', at: 7.7, lat: -6.5, effect: 'spin', radius: 1.1 },
    { kind: 'static', model: 'mine', at: 10.45, lat: 6.5, effect: 'spin', radius: 1.1 },
    // a harbour drone filming the crest for a stream nobody can tax
    { kind: 'orbit', model: 'drone', at: 6.55, lat: 0, orbit: 4.5, speed: 6, effect: 'spin', radius: 1.1 },
    // deck cargo by the start straight
    { kind: 'static', model: 'barrel', at: 0.95, lat: -7.2, effect: 'bump', radius: 1.1 },
    { kind: 'static', model: 'barrel', at: 16.55, lat: 7.2, effect: 'bump', radius: 1.1 },
  ],
  models: { mine: () => W.navMine() },
  // one line of feed colour as laps two and three begin
  lapNotes: [
    `<b>Customs has been notified.</b> They sent a postcard.`,
    `<b>Final lap.</b> Still no jurisdiction. Race accordingly.`,
  ],
  // the opening shot: west of the dry dock, square to the hull name board,
  // the road running under the ship. (Two earlier angles failed: a NW
  // shoulder shot sits inside the cp 0.45 grandstand barge, and an on-axis
  // shot from west of the grid leaves the ship 280 m away and tiny.)
  // The menu thumbnail is taken from this shot.
  intro: [{ pos: [-90, 10, -150], look: [20, 12, -140], pos1: [-52, 7.5, -147], look1: [30, 11, -141], fov: 55, dur: 3.5 }],
  terrain: {
    cell: 3, margin: 220, blend: 24, water: -1.1,
    fn(x, z) {
      // open sea: a soft seabed far below, two rocky islets on the horizon
      let h = -4.6 + (fbm(x * 0.02, z * 0.02, 3, 5) - 0.5) * 1.6;
      h += (1 - smoothstep(18, 60, Math.hypot(x - 430, z + 330))) * 8.5;   // north-east islet
      h += (1 - smoothstep(24, 80, Math.hypot(x - 40, z - 430))) * 7.5;    // southern islet
      return h;
    },
  },
  look: {
    road: { base: 0x5d6373, line: 0xffffff, center: 0xffd23c },
    kerb: [0xe23b3b, 0xf7f7f2],
    shoulder: 0xcfd5e2,
    terrain: { low: 0x3f7d6a, high: 0x9aa578, dry: 0xcdb277, rock: 0x8d8578, sand: 0xe9d7a2, dirt: 0xb08d5e },
    water: 0x1fb6c9, deck: 0x8a6a4a, rail: 0x2fd8e0,
    ads: ADS,
  },

  /** Dress the course. ctx: { THREE, track, group, gfx, anim, view } */
  decorate(ctx) { decorate(ctx); },
};

/** World spot on the water at a control param and lateral offset (lat: + = left). */
function decorate(ctx) {
  const { THREE, track, anim, view } = ctx, sc = new Scenery(ctx), rng = sc.rng;
  const WL = track.water;
  const at = (cp, lat) => {
    const i = track.indexAtCp(cp);
    const hx = track.lx[i], hz = track.lz[i], hl = Math.hypot(hx, hz) || 1;
    return { x: track.px[i] + (hx / hl) * lat, z: track.pz[i] + (hz / hl) * lat, yaw: track.yaw[i], roadY: track.py[i], i };
  };
  const bobbers = [];
  const addBobber = (g, base, ph, amp = 0.16) => { bobbers.push({ g, base, ph, amp }); };

  /* ----- start line: gantry, sign buoy, grandstand barges ----- */
  const g0 = sc.beside(0, 1, -track.hwL[0]);
  const gantry = P.gantry(track.hwL[0] + track.hwR[0] + 1.5, 'INTERNATIONAL WATERS', { color: 0x1b7f8e, color2: 0xe8b64c });
  sc.place(gantry, g0.x, g0.z, { yaw: g0.along, y: g0.roadY });
  view.startLights = gantry.userData.lights;

  const sign = W.signBuoy();
  const ss = at(0.22, 26);
  sign.position.set(ss.x, WL - 0.15, ss.z); sign.rotation.y = ss.yaw + Math.PI;
  ctx.group.add(sign); addBobber(sign, WL - 0.15, 0.4, 0.1);

  // two grandstand barges moored outside the start straight, clear of the dock
  const stand = P.grandstand({ w: 30, rows: 6, color: 0x1b7f8e }), stand2 = P.grandstand({ w: 30, rows: 6, color: 0xe2603d });
  const seats = [];
  const M = new THREE.Matrix4(), V = new THREE.Vector3();
  [0.45, 0.95].forEach((cp, k) => {
    const p = at(cp, 33), bg = W.barge(46, 16);
    bg.position.set(p.x, WL, p.z); bg.rotation.y = p.yaw; ctx.group.add(bg);
    const proto = k % 2 ? stand2 : stand, g = proto.group.clone();
    sc.place(g, p.x, p.z, { yaw: p.yaw, y: WL + 0.95 });
    g.updateMatrixWorld(true); M.copy(g.matrixWorld);
    for (const s of proto.seats) if (rng() < 0.8) { V.set(s[0], s[1], s[2]).applyMatrix4(M); seats.push({ x: V.x, y: V.y, z: V.z, yaw: p.yaw + rng.range(-0.4, 0.4) }); }
  });
  sc.instances(partsOf(P.spectator()), seats, { scale: [0.95, 1.2], tints: P.CROWD_TINTS, cast: false });

  /* ----- the channel-buoy ring: the continuous edge line, red outside, green in ----- */
  const stride = Math.max(1, Math.round(22 / track.ds));
  const red = [], green = [];
  for (let i = 0; i < track.N; i += stride) {
    const hx = track.lx[i], hz = track.lz[i], hl = Math.hypot(hx, hz) || 1, ux = hx / hl, uz = hz / hl;
    red.push({ x: track.px[i] + ux * (track.hwL[i] + 5.5), z: track.pz[i] + uz * (track.hwL[i] + 5.5), y: WL - 0.3 });
    green.push({ x: track.px[i] - ux * (track.hwR[i] + 5.5), z: track.pz[i] - uz * (track.hwR[i] + 5.5), y: WL - 0.3 });
  }
  sc.instances(partsOf(W.channelBuoy(0xd9403a)), red, { yaw: 'random', cast: false });
  sc.instances(partsOf(W.channelBuoy(0x2e9e5b)), green, { yaw: 'random', cast: false });

  /* ----- the dry dock: S.S. EXTRADITION DENIED straddling the north straight -----
     The hull lies across the road on two cradle towers, keel ~7.4 m over the
     deck: you drive under the bow, and her name is on the approach side in
     letters you can read from the grid. She does not bob. She is in dry dock. */
  const dp = at(1.62, 0);
  const dock = W.dryDock();
  sc.place(dock, dp.x, dp.z, { yaw: dp.yaw, y: WL });
  const gold = C.superyacht('EXTRADITION DENIED', { accent: 0xc9962e, L: 62 });
  gold.scale.setScalar(1.15);
  const hullSign = W.hullName('S.S. EXTRADITION DENIED');
  hullSign.position.set(-5.6, 6.2, 4); hullSign.rotation.y = -Math.PI / 2;
  gold.add(hullSign);
  gold.position.set(dp.x, dp.roadY + 7.35, dp.z); gold.rotation.y = dp.yaw - Math.PI / 2;
  gold.traverse(o => { if (o.isMesh) o.castShadow = sc.shadows; });
  ctx.group.add(gold);

  /* ----- the duelling yachts, hauled in to the road edge ----- */
  const yachts = [];
  const moor = (g, cp, lat, yawOff = 0) => {
    const p = at(cp, lat);
    g.position.set(p.x, WL - 0.7, p.z); g.rotation.y = p.yaw + yawOff;
    g.traverse(o => { if (o.isMesh) o.castShadow = sc.shadows; });
    ctx.group.add(g); yachts.push({ g, base: WL - 0.7, ph: yachts.length * 1.7 });
    return g;
  };
  moor(C.superyacht('HOSTILE TAKEOVER', { accent: 0x14213d, L: 52 }), 5.55, 19.5);          // Ellison, just outside the climb
  const murdoch = moor(C.superyacht('FAIR & BALANCED', { accent: 0x30509e, L: 44 }), 11.75, 21); // Murdoch, outside his elbow
  const dishes = W.dishArray();
  dishes.position.set(0, 9.6, -4.4); murdoch.add(dishes);                                  // his dishes track you all the way round
  anim.push((dt, time) => {
    for (const { g, base, ph } of yachts) {
      g.position.y = base + Math.sin(time * 0.7 + ph) * 0.17;
      g.rotation.z = Math.sin(time * 0.55 + ph) * 0.018;
      g.rotation.x = Math.sin(time * 0.43 + ph * 2) * 0.011;
    }
    dishes.userData.spin.rotation.y = time * 0.45;
  });

  /* ----- the seastead, astride the exit leg: the road crosses its deck ----- */
  const stead = W.seastead();
  const sp = at(13.4, 0);
  stead.position.set(sp.x, sp.roadY - 4.75, sp.z); stead.rotation.y = sp.yaw;
  stead.traverse(o => { if (o.isMesh) o.castShadow = sc.shadows; });
  ctx.group.add(stead);
  const beacon = stead.getObjectByName('beacon');
  anim.push((dt, time) => { if (beacon) beacon.material.emissiveIntensity = 1.6 + Math.sin(time * 2.4) * 1.4; });

  /* ----- the customs checkpoint on the west return ----- */
  const ci = track.indexAtCp(15.55);
  const cg = sc.beside(15.55, 1, -track.hwL[ci]);
  const customs = P.gantry(track.hwL[ci] + track.hwR[ci] + 1.5, 'NOTHING TO DECLARE (EVER)', { color: 0x1d5c46, color2: 0xf3ead2 });
  sc.place(customs, cg.x, cg.z, { yaw: cg.along, y: cg.roadY });
  for (const side of [1, -1]) {
    const bp = sc.beside(15.55, side, 1.8);
    sc.place(W.customsBooth(), bp.x, bp.z, { yaw: bp.yaw, y: bp.roadY });
  }

  /* ----- the barge jump: two barges moored under the gap ends ----- */
  for (const cp of [9.47, 9.85]) {
    const p = at(cp, 0), bg = W.barge(24, 13);
    bg.position.set(p.x, WL - 0.1, p.z); bg.rotation.y = p.yaw;
    ctx.group.add(bg); addBobber(bg, WL - 0.1, cp * 2.1, 0.05);
  }

  /* ----- jokes at the road edge: mailbox wall, flag shop, sponsor pontoons ----- */
  const wallP = sc.beside(9.28, -1, 5.2);
  const mailWall = W.mailboxWall();
  mailWall.position.set(wallP.x, WL, wallP.z); mailWall.rotation.y = wallP.yaw;
  mailWall.traverse(o => { if (o.isMesh) o.castShadow = sc.shadows; });
  ctx.group.add(mailWall); addBobber(mailWall, WL, 1.3, 0.05);

  const shopP = sc.beside(7.4, 1, 7.5);
  const shop = W.flagShop();
  shop.position.set(shopP.x, WL, shopP.z); shop.rotation.y = shopP.yaw;
  shop.traverse(o => { if (o.isMesh) o.castShadow = sc.shadows; });
  ctx.group.add(shop); addBobber(shop, WL, 2.2, 0.05);

  [[0.85, -1, 1], [2.7, 1, 2], [8.55, 1, 3], [15.95, -1, 4]].forEach(([cp, side, n], k) => {
    const p = sc.beside(cp, side, 4.5);
    const board = W.adBoard(n);
    board.position.set(p.x, WL, p.z); board.rotation.y = p.yaw;
    ctx.group.add(board); addBobber(board, WL, k * 1.9, 0.06);
  });

  /* ----- lantern strings over the boardwalk ----- */
  for (const cp of [0.55, 4.75, 5.6, 7.15, 10.9]) {
    const p = at(cp, 0), i = p.i;
    const str = W.lanternString(track.hwL[i] + track.hwR[i] + 8);
    sc.place(str, p.x, p.z, { yaw: p.yaw, y: p.roadY - 0.1, cast: false });
  }

  /* ----- harbour signs, bigger and closer than before ----- */
  const reg = W.flagSign(['REGISTERED IN'], { w: 14 });
  const rp = sc.beside(7.5, -1, 4);
  sc.place(reg, rp.x, rp.z, { yaw: rp.yaw, y: rp.roadY });
  const exit = W.flagSign(['EXIT:', 'JURISDICTION SHOPPING'], { w: 15 });
  const ep = sc.beside(16.45, 1, 4);
  sc.place(exit, ep.x, ep.z, { yaw: ep.yaw, y: ep.roadY });

  /* ----- chevron boards on the corners, posted at the deck edge ----- */
  for (const cp of [3.8, 4.05, 4.3, 11.85, 12.1, 12.35, 13.95, 14.2, 15.85, 16.1]) {
    const i = track.indexAtCp(cp);
    const p = sc.beside(cp, 1, track.outerL[i] + 1.2);
    sc.place(P.chevronBoard(0xe8b64c), p.x, p.z, { yaw: p.yaw, y: p.roadY, lift: 0.9 });
  }

  /* ----- ambient water traffic ----- */
  const boatSpots = [
    [-130, -30, 0.4], [-60, 80, 2.2], [40, -80, 1.1], [110, 50, 2.8], [150, -40, 0.9], [-160, 60, 1.9],
    [330, -60, 2.5], [-330, 40, 0.2], [80, 250, 1.6], [-90, -260, 2.9],
  ].filter(([x, z]) => track.terrainHeight(x, z) < WL - 1.5 && Math.hypot(x - 20, z + 140) > 90);
  const sailsA = partsOf(W.sailboat(0x2e7fc2)), sailsB = partsOf(W.sailboat(0xe2603d)), sailsC = partsOf(W.sailboat(0x3fae6a));
  const spots = boatSpots.map(([x, z, yaw]) => ({ x, z, y: WL - 0.25, yaw }));
  sc.instances(sailsA, spots.filter((_, i) => i % 3 === 0), { cast: false });
  sc.instances(sailsB, spots.filter((_, i) => i % 3 === 1), { cast: false });
  sc.instances(sailsC, spots.filter((_, i) => i % 3 === 2), { cast: false });

  const wb1 = W.workboat(), wbp = at(13.9, -34);
  wb1.position.set(wbp.x, WL - 0.3, wbp.z); wb1.rotation.y = wbp.yaw + 0.4; ctx.group.add(wb1);
  const wb2 = W.workboat(), wbp2 = at(6.9, -30);
  wb2.position.set(wbp2.x, WL - 0.3, wbp2.z); wb2.rotation.y = wbp2.yaw - 0.8; ctx.group.add(wb2);
  addBobber(wb1, WL - 0.3, 1.1, 0.09); addBobber(wb2, WL - 0.3, 3.9, 0.09);
  anim.push((dt, time) => { for (const { g, base, ph, amp } of bobbers) g.position.y = base + Math.sin(time * 0.8 + ph) * amp; });

  /* ----- life in the sky ----- */
  const cols = [[0xff4d6d, 0xffd23c], [0x38b6ff, 0xffffff], [0x2ee6a6, 0xffd23c], [0x9b6bff, 0xff7eb6]];
  const cx = track.bounds.cx, cz = track.bounds.cz;
  const balloons = cols.map((c, i) => { const b = P.balloon(c); const a = (i / cols.length) * Math.PI * 2 + 0.7, r = 300 + (i % 2) * 90; b.position.set(cx + Math.cos(a) * r, 62 + i * 9, cz + Math.sin(a) * r); b.scale.setScalar(1.4 + (i % 3) * 0.3); ctx.group.add(b); return b; });
  // the blimp: a small, slow orbit over the west harbour. Its phase runs on
  // the app clock, so a course-wide orbit left it anywhere at race start —
  // including half out of the grid frame, which is how the lead found it.
  // This orbit keeps the whole envelope in the grid's forward sky for good,
  // and it is still there to watch you come through customs.
  const ship = P.blimp('NO JURISDICTION', { accent: 0x1fb6c9 }); ship.scale.setScalar(1.3); ctx.group.add(ship);
  anim.push((dt, time) => {
    balloons.forEach((b, i) => { b.position.y += Math.sin(time * 0.4 + i * 1.7) * dt * 0.8; b.rotation.y += dt * 0.05; });
    const a = time * 0.021; ship.position.set(-40 + Math.cos(a) * 60, 54 + Math.sin(time * 0.3) * 2, -115 + Math.sin(a) * 42); ship.rotation.y = -a;
  });
}
