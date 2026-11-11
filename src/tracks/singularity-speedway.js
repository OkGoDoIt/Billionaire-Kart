/* Singularity Speedway: the last track of the last cup. A rainbow road flung
   through open space around a newborn machine mind: a climb straight at the
   orb, a descending spiral wound around it, the neon chicane, a jump across
   the bulge, the Leap, a banked hairpin, and a boost chain home through the
   light rings. There is no ground: every edge is open to the void unless it
   is walled. */
import { Scenery, partsOf } from '../render/scenery.js';
import * as P from '../models/props.js';
import * as S from '../models/props-singularity-speedway.js';
import { bannerTexture } from '../render/textures.js';
import { EDGE } from '../track/track.js';

const GAP_FROM = 41.0, GAP_TO = 41.44, COIN_AIR = 4.5;   // the Leap: a 22 m gap off the crest
const ADS = ['THE LINE GOES UP', 'ALIGNMENT PENDING', 'PLEASE REMAIN ALIGNED', 'TAKEOFF: FAST', 'YOU ARE THE TRAINING DATA', 'HUMAN IN THE LOOP (FOR NOW)', 'PAPERCLIPS MAXIMIZED', 'EXIT LIQUIDITY EVENT HORIZON', 'COMPUTE OR DIE', 'POST-SCARCITY PARKING'];

export default {
  id: 'singularity-speedway',
  name: 'Singularity Speedway',
  tagline: 'The line goes up. Then it goes sideways.',
  laps: 3,
  width: 19,
  sky: 'space',
  skyOverrides: { exposure: 0.85 },
  gravity: 0.85,
  terrain: false,
  bridgePillars: false,
  defaults: { edge: 'void' },
  path: [
    { p: [195, 30, 150], w: 21 },               // 0 start/finish, mid-straight
    { p: [195, 33, 83], w: 21 },                // 1 turn one
    { p: [183.3, 35.5, 54.7] },                 // 2 turn one
    { p: [155, 38, 43] },                       // 3 turn one
    { p: [102.5, 43, 43] },                     // 4 the climb toward the orb
    { p: [50, 48, 43] },                        // 5 the climb toward the orb
    { p: [0, 48, 43], w: 21 },                  // 6 spiral entry, top level
    { p: [-29, 45.5, 31], bank: -10, w: 21 },   // 7 spiral, 45 deg
    { p: [-41, 43, 2], bank: -10, w: 21 },      // 8 spiral, 90 deg
    { p: [-29, 40.5, -27], bank: -10, w: 21 },  // 9 spiral, 135 deg
    { p: [0, 38, -39], bank: -10, w: 21 },      // 10 spiral, 180 deg
    { p: [29, 35.5, -27], bank: -10, w: 21 },   // 11 spiral, 225 deg
    { p: [41, 33, 2], bank: -10, w: 21 },       // 12 spiral, 270 deg
    { p: [29, 30.5, 31], bank: -10, w: 21 },    // 13 spiral, 315 deg
    { p: [0, 28, 43], bank: -10, w: 21 },       // 14 spiral, 360 deg
    { p: [-29, 25.5, 31], bank: -10, w: 21 },   // 15 spiral, 405 deg
    { p: [-41, 23, 2], bank: -10, w: 21 },      // 16 spiral, 450 deg
    { p: [-29, 20.5, -27], bank: -10, w: 21 },  // 17 spiral, 495 deg
    { p: [0, 18, -39], bank: -10 },             // 18 spiral, 540 deg: exit, bottom level
    { p: [60, 18, -39] },                       // 19 fast exit straight
    { p: [75, 18.3, -43] },                     // 20 neon chicane: left, right, left
    { p: [86, 18.5, -54] },                     // 21 neon chicane: left, right, left
    { p: [91, 18.5, -62.7] },                   // 22 neon chicane: left, right, left
    { p: [105.7, 18.5, -75] },                  // 23 neon chicane: left, right, left
    { p: [124.8, 18.5, -75] },                  // 24 neon chicane: left, right, left
    { p: [139.5, 18.5, -62.7] },                // 25 neon chicane: left, right, left
    { p: [144.5, 18.5, -54] },                  // 26 neon chicane: left, right, left
    { p: [155.5, 18.3, -43] },                  // 27 neon chicane: left, right, left
    { p: [170.5, 18, -39] },                    // 28 neon chicane: left, right, left
    { p: [247, 19, -39] },                      // 29 back straight
    { p: [269.6, 19.3, -29.6] },                // 30 turn three
    { p: [279, 19.5, -7] },                     // 31 turn three
    { p: [279, 20, 33] },                       // 32 shortcut ramp on the inside, into the bulge
    { p: [281, 20.3, 42.3] },                   // 33 the bulge
    { p: [286.8, 20.5, 49.9] },                 // 34 the bulge
    { p: [292.6, 20.5, 57.4] },                 // 35 the bulge
    { p: [294.7, 20.5, 66.7] },                 // 36 the bulge
    { p: [292.6, 20.5, 76] },                   // 37 the bulge
    { p: [286.8, 20.5, 83.6] },                 // 38 the bulge
    { p: [281, 20.5, 91.1] },                   // 39 the bulge
    { p: [279, 20.5, 100.4] },                  // 40 the bulge
    { p: [279, 23.5, 160.4] },                  // 41 crest: the Leap
    { p: [279, 17.5, 210.4] },                  // 42 landing, downhill
    { p: [279, 17.5, 262] },                    // 43 run to the hairpin
    { p: [273.3, 18.8, 283], bank: -6 },        // 44 banked hairpin
    { p: [258, 20.2, 298.4], bank: -6 },        // 45 banked hairpin
    { p: [237, 21.5, 304], bank: -6 },          // 46 banked hairpin
    { p: [216, 22.8, 298.4], bank: -6 },        // 47 banked hairpin
    { p: [200.6, 24.2, 283], bank: -6 },        // 48 banked hairpin
    { p: [195, 25.5, 262], bank: -6, w: 20 },   // 49 banked hairpin
    { p: [195, 27.7, 206], w: 21 },             // 50 light rings: boost chain to the line
  ],
  // the whole lap floats: a deck with sides, and no pillars
  bridges: [{ from: 0, to: 51 }],
  sides: [
    { from: 49.66, to: 1.25, edge: 'wall' },                 // start straight: walled for the grid
    { from: 1.0, to: 3.4, side: 'R', edge: 'wall' },          // turn one
    { from: 6.5, to: 18.3, side: 'L', edge: 'wall' },         // the spiral: outside wall all the way down
    { from: 19.6, to: 21.9, side: 'R', edge: 'wall' },        // neon chicane: left
    { from: 21.9, to: 26.1, side: 'L', edge: 'wall' },        //               right
    { from: 26.1, to: 28.5, side: 'R', edge: 'wall' },        //               left
    { from: 29.5, to: 31.7, side: 'L', edge: 'wall' },        // turn three
    { from: 34.3, to: 38.6, side: 'L', edge: 'wall' },        // the bulge: outside of the right-hander
    { from: 39.3, to: 40.5, side: 'L', edge: 'wall' },        //   and where the bulge jump lands
    { from: GAP_TO, to: GAP_TO + 1.15, edge: 'wall' },        // the Leap: walled where karts land
    { from: 43.3, to: 49.3, side: 'L', edge: 'wall' },        // the hairpin
  ],
  zones: [{ from: 19.5, to: 28.6, skin: 'neon' }],
  gaps: [{ from: GAP_FROM, to: GAP_TO }],
  ramps: [
    { at: GAP_FROM - 0.18, len: 9, lift: 2.2 },               // the Leap
    { at: 31.8, len: 8, lift: 2.2, lat: -6.5, w: 6 },          // the bulge jump, on the inside, next to the void
  ],
  boosts: [
    { at: 18.25, lat: 0, w: 5 },                              // spiral exit
    { at: 4.5, lat: -4, w: 4.5 },                             // the climb
    { at: GAP_FROM - 0.5, lat: 0, w: 6 },                      // run-up to the Leap
    { at: 49.12, lat: 0, w: 5.5 },                            // boost chain under the light rings
    { at: 49.73, lat: 0, w: 5.5 },
    { at: 50.34, lat: 0, w: 5.5 },
  ],
  itemRows: [{ at: 3.6 }, { at: 12.5 }, { at: 28.75 }, { at: 40.3, n: 3 }],
  coins: [
    { from: 4.0, to: 4.6, n: 5, lat: [4, -4] },
    { from: 9.0, to: 10.0, n: 5, lat: -6.5 },                 // spiral: on the inside, over the drop
    { from: 14.4, to: 15.4, n: 5, lat: [-3, -7] },
    { from: 22.6, to: 24.6, n: 5, lat: [-5, 5] },             // neon chicane
    { from: 28.85, to: 29.15, n: 4, lat: -3 },
    { from: GAP_FROM + 0.05, to: GAP_TO - 0.05, n: 4, lat: 0, air: COIN_AIR }, // in the air over the Leap
    { from: 49.3, to: 49.6, n: 4, lat: 4 },
  ],
  obstacles: [
    // sentinel drones circling over the wide straights
    { kind: 'orbit', model: 'drone', at: 5.3, lat: 5.5, orbit: 4, speed: 6, effect: 'spin' },
    { kind: 'orbit', model: 'drone', at: 18.5, lat: -5.5, orbit: 4, speed: 6.5, effect: 'spin' },
    { kind: 'orbit', model: 'drone', at: 28.4, lat: 5.5, orbit: 4, speed: 6, effect: 'spin' },
    // laser gates across the start straight, firing in turn
    { kind: 'timed', model: 'laser', at: 0.3, lat: 4.6, period: 3.2, duty: 0.45, phase: 0, effect: 'spin', radius: 2.4 },
    { kind: 'timed', model: 'laser', at: 0.6, lat: -4.6, period: 3.2, duty: 0.45, phase: 1.6, effect: 'spin', radius: 2.4 },
  ],
  models: { laser: () => S.laserGate() },
  look: {
    road: { skin: 'glass', glow: 0xff5cc8 },
    rail: 0xffffff,
    deck: 0x2a2350,
    wall: 0x1c1838, wallStripe: 0x7a6bff,
    ads: ADS,
  },

  /** Dress the course. ctx: { THREE, track, group, gfx, anim, view } */
  decorate(ctx) { decorate(ctx); },
};

function decorate(ctx) {
  const { THREE, track: tr, anim, view } = ctx, sc = new Scenery(ctx), rng = sc.rng, N = tr.N;
  const I = cp => tr.indexAtCp(cp);
  // a point in the road frame at sample i: lat metres to the left, up metres above the road plane
  const at = (i, lat = 0, up = 0) => new THREE.Vector3(tr.px[i] + tr.lx[i] * lat + tr.ux[i] * up, tr.py[i] + tr.ly[i] * lat + tr.uy[i] * up, tr.pz[i] + tr.lz[i] * lat + tr.uz[i] * up);
  const faceRoad = (i, side) => Math.atan2(-side * tr.lx[i], -side * tr.lz[i]);
  const edge = (i, side) => (side > 0 ? tr.hwL[i] : tr.hwR[i]);
  // 3D distance to the nearest road sample, for keeping scenery clear of the track
  const RX = [], RY = [], RZ = [];
  for (let i = 0; i < N; i += 3) { RX.push(tr.px[i]); RY.push(tr.py[i]); RZ.push(tr.pz[i]); }
  const roadDist = (x, y, z) => { let d = Infinity; for (let k = 0; k < RX.length; k++) { const dx = x - RX[k], dy = y - RY[k], dz = z - RZ[k], q = dx * dx + dy * dy + dz * dz; if (q < d) d = q; } return Math.sqrt(d); };
  const B = tr.bounds, CX = B.cx, CZ = B.cz;
  const fogless = o => o.traverse(m => { if (m.material) m.material.fog = false; });

  /* ----- the Singularity, at the heart of the spiral ----- */
  let ox = 0, oz = 0, n = 0;
  for (let i = I(6), e = I(14); i !== e; i = (i + 1) % N) { ox += tr.px[i]; oz += tr.pz[i]; n++; }   // exactly one turn of the spiral
  ox /= n; oz /= n;
  const oy = (tr.py[I(6)] + tr.py[I(18)]) / 2;
  const orb = S.singularity({ r: 21, ringIn: 23.5, ringOut: 28.5 });
  orb.position.set(ox, oy, oz); ctx.group.add(orb);
  const DISC_TILT = 0.14;                                   // raised on the north side: clear of the climb and the chicane
  const disc = S.accretionDisc({ inner: 60, outer: 112 });
  disc.position.set(ox, oy, oz); disc.rotation.x = -Math.PI / 2 + DISC_TILT; ctx.group.add(disc);
  const inDisc = (x, y, z, pad) => { const r = Math.hypot(x - ox, z - oz); return r > 40 && r < 130 && Math.abs(y - (oy - (z - oz) * Math.tan(DISC_TILT))) < pad; };
  anim.push((dt, time) => { orb.userData.update(time); disc.userData.update(time); });

  /* ----- start/finish gantry ----- */
  const i0 = I(0), g0 = at(i0);
  const gantry = P.gantry(tr.hwL[i0] + tr.hwR[i0] + 1.5, 'SINGULARITY SPEEDWAY', { color: 0x7a6bff, color2: 0xff5cc8 });
  sc.place(gantry, g0.x, g0.z, { yaw: tr.yaw[i0], y: g0.y });
  view.startLights = gantry.userData.lights;

  /* ----- floating viewing platforms beside the start straight ----- */
  const crowd = [];
  [[50.35, 1], [0.5, 1], [50.6, -1], [0.75, -1]].forEach(([cp, side], k) => {
    const i = I(cp), p = at(i, side * (edge(i, side) + 13), -0.8);
    const { group, seats } = S.platform({ r: 7, seed: k + 3 });
    sc.place(group, p.x, p.z, { y: p.y });
    for (const s of seats) crowd.push({ x: p.x + s[0], y: p.y + s[1], z: p.z + s[2], yaw: faceRoad(i, side) + rng.range(-0.5, 0.5) });
  });
  sc.instances(partsOf(P.spectator()), crowd, { scale: [0.95, 1.2], tints: P.CROWD_TINTS, cast: false });

  /* ----- light rings over the final straight, with a chase of light toward the line ----- */
  const gateCols = [0xff5cc8, 0x7a6bff, 0x35e0ff];
  const gates = [49.12, 49.42, 49.73, 50.03, 50.34, 50.64].map((cp, k) => {
    const i = I(cp), c = at(i, 0, 4);
    const g = S.lightRing(17, 1, { color: gateCols[k % 3], inner: 0xffd6f4, intensity: 1.6 });
    g.traverse(m => { if (m.isMesh) m.material = m.material.clone(); });
    g.position.copy(c); g.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), new THREE.Vector3(tr.tx[i], tr.ty[i], tr.tz[i]));
    ctx.group.add(g); return g;
  });
  anim.push((dt, time) => gates.forEach((g, k) => { const v = 1.2 + 1.8 * Math.max(0, Math.sin(time * 3.5 - k * 0.8)) ** 3; g.children.forEach(m => { m.material.emissiveIntensity = v; }); }));

  /* ----- server monoliths drifting in the dark ----- */
  const monos = [];
  for (let t = 0; monos.length < 24 && t < 6000; t++) {
    const x = rng.range(B.minX - 210, B.maxX + 210), z = rng.range(B.minZ - 210, B.maxZ + 210), y = rng.range(-60, 110);
    const d = roadDist(x, y, z);
    if (d < 70 || d > 200 || inDisc(x, y, z, 45)) continue;
    if (monos.some(m => Math.hypot(m.x - x, m.y - y, m.z - z) < 55)) continue;
    monos.push({ x, y, z, h: rng.range(30, 60) });
  }
  for (let k = 0; k < 5; k++) {                              // a few colossal ones, far out
    const a = (k / 5) * Math.PI * 2 + 0.4, r = rng.range(360, 480);
    monos.push({ x: CX + Math.cos(a) * r, y: rng.range(-40, 120), z: CZ + Math.sin(a) * r, h: rng.range(110, 160) });
  }
  const monoObjs = monos.map((m, k) => {
    const o = S.monolith(k % 3, { h: m.h, w: m.h * rng.range(0.18, 0.28), d: m.h * rng.range(0.07, 0.1) });
    o.position.set(m.x, m.y, m.z); o.rotation.set(rng.range(-0.25, 0.25), rng() * Math.PI * 2, rng.range(-0.25, 0.25));
    ctx.group.add(o);
    return { o, y: m.y, spin: rng.range(0.02, 0.07) * (rng() < 0.5 ? -1 : 1), ph: rng() * 6.28 };
  });
  anim.push((dt, time) => monoObjs.forEach(m => { m.o.rotation.y += m.spin * dt; m.o.position.y = m.y + Math.sin(time * 0.18 + m.ph) * 3; }));

  /* ----- giant chips tumbling slowly ----- */
  const chips = [];
  for (let t = 0; chips.length < 13 && t < 6000; t++) {
    const x = rng.range(B.minX - 170, B.maxX + 170), z = rng.range(B.minZ - 170, B.maxZ + 170), y = rng.range(-40, 90);
    const d = roadDist(x, y, z);
    if (d < 45 || d > 170 || inDisc(x, y, z, 30)) continue;
    if ([...chips, ...monos].some(m => Math.hypot(m.x - x, m.y - y, m.z - z) < 50)) continue;
    chips.push({ x, y, z });
  }
  const chipObjs = chips.map(c => {
    const o = S.chip({ size: rng.range(14, 30) }); o.position.set(c.x, c.y, c.z);
    o.rotation.set(rng.range(-1.1, 1.1), rng() * 6.28, rng.range(-1.1, 1.1)); ctx.group.add(o);
    return { o, ax: rng.range(-0.04, 0.04), ay: rng.range(-0.06, 0.06), y: c.y, ph: rng() * 6.28 };
  });
  anim.push((dt, time) => chipObjs.forEach(c => { c.o.rotation.x += c.ax * dt; c.o.rotation.y += c.ay * dt; c.o.position.y = c.y + Math.sin(time * 0.25 + c.ph) * 2; }));

  /* ----- colossal rings of light, far away at odd angles ----- */
  const bigRings = [[150, -0.9, 0.18, 820, 120], [230, 2.3, 0.3, 980, 260], [110, 0.9, 0.12, 700, -60], [300, -2.6, 0.24, 1150, 420]].map(([R, a, tube, dist, y], k) => {
    const g = S.lightRing(R, R * tube * 0.1, { color: gateCols[(k + 1) % 3], intensity: 2.2 });
    fogless(g); g.position.set(CX + Math.cos(a) * dist, y, CZ + Math.sin(a) * dist);
    g.rotation.set(rng.range(-1.2, 1.2), rng() * 6.28, rng.range(-1.2, 1.2)); ctx.group.add(g);
    return { g, s: rng.range(0.01, 0.03) };
  });
  anim.push(dt => bigRings.forEach(r => { r.g.rotation.z += r.s * dt; }));

  /* ----- the planet and its moons ----- */
  const world = S.planet({ r: 430 });
  world.position.set(CX - 1150, -140, CZ - 1450); world.rotation.set(0.35, 0, 0.2); ctx.group.add(world);
  const moonA = S.moon({ r: 75, seed: 3 }), moonB = S.moon({ r: 40, seed: 8, tint: 0xd8c8b4 });
  moonA.position.set(CX + 1300, 380, CZ - 900); moonB.position.set(CX + 900, 160, CZ + 1500);
  ctx.group.add(moonA, moonB);
  anim.push(dt => { world.rotation.y += dt * 0.006; });

  /* ----- asteroid belts ----- */
  const belt = new THREE.Group(); belt.position.set(CX, 0, CZ); ctx.group.add(belt);
  const rocks = [];
  for (let t = 0; rocks.length < 170 && t < 4000; t++) {
    const a = rng() * Math.PI * 2, r = rng.range(560, 760), x = Math.cos(a) * r, z = Math.sin(a) * r, y = rng.range(-90, 30) + Math.sin(a * 2) * 40;
    rocks.push({ x, y, z, yaw: rng() * 6.28 });
  }
  const near = [];                                           // a looser swarm closer in, around the far side of the spiral
  for (let t = 0; near.length < 60 && t < 4000; t++) {
    const a = rng() * Math.PI * 2, r = rng.range(190, 260), x = ox + Math.cos(a) * r, z = oz + Math.sin(a) * r, y = oy + rng.range(-70, -25);
    if (roadDist(x, y, z) < 55) continue;
    near.push({ x: x - CX, y, z: z - CZ, yaw: rng() * 6.28 });
  }
  sc.group = belt;
  const rockTints = [0x8a8098, 0x6f6578, 0x9a8f86, 0x5c5466];
  sc.instances(partsOf(P.rock(41, { r: 2.2 })), rocks.filter((_, k) => k % 3 === 0), { scale: [1.5, 9], tilt: 3, tints: rockTints, cast: false });
  sc.instances(partsOf(P.rock(42, { r: 2.0 })), rocks.filter((_, k) => k % 3 === 1), { scale: [1.5, 8], tilt: 3, tints: rockTints, cast: false });
  sc.instances(partsOf(P.rock(43, { r: 1.6 })), [...rocks.filter((_, k) => k % 3 === 2), ...near], { scale: [1.2, 6], tilt: 3, tints: rockTints, cast: false });
  sc.group = ctx.group;
  anim.push(dt => { belt.rotation.y += dt * 0.004; });

  /* ----- data streams: glowing cubes flowing along curves near the road ----- */
  const streams = [];
  const stream = (pts, count, speed, color) => {
    const M = pts.length, len = pts.reduce((s, p, k) => s + (k ? p.distanceTo(pts[k - 1]) : 0), 0);
    const hide = pts.map(p => roadDist(p.x, p.y, p.z) < 9);      // never let a stream cut through the road
    streams.push({ pts, M, count, speed: speed / len, color, hide });
  };
  // around the spiral, a wider helix of data falling with the road
  { const pts = []; for (let k = 0; k <= 400; k++) { const t = k / 400, a = Math.PI / 2 + t * Math.PI * 4.5; pts.push(new THREE.Vector3(ox + Math.cos(a) * 66, oy + 34 - t * 70, oz + Math.sin(a) * 66)); } stream(pts, 140, 22, 0); }
  // a corkscrew around the final straight, through the light rings
  { const pts = [], a0 = I(48.9), a1 = I(50.95), span = (a1 - a0 + N) % N; for (let k = 0; k <= 300; k++) { const i = (a0 + Math.round(span * k / 300)) % N, a = (k / 300) * Math.PI * 7; const c = at(i, Math.cos(a) * 21, 4 + Math.sin(a) * 21); pts.push(c); } stream(pts, 130, 30, 1); }
  // beside the climb to the spiral, both sides
  for (const side of [1, -1]) { const pts = [], a0 = I(2.8), a1 = I(6.2), span = (a1 - a0 + N) % N; for (let k = 0; k <= 160; k++) { const i = (a0 + Math.round(span * k / 160)) % N; pts.push(at(i, side * (edge(i, side) + 16), 3 + Math.sin(k * 0.09 + side) * 6)); } stream(pts, 50, 18, side > 0 ? 0 : 1); }
  // down the gap between the long straights
  { const pts = [], x = (tr.px[I(41)] + tr.px[I(50)]) / 2; for (let k = 0; k <= 200; k++) { const t = k / 200; pts.push(new THREE.Vector3(x + Math.sin(t * 9) * 6, 6 + Math.sin(t * 13) * 4, -20 + t * 300)); } stream(pts, 70, 20, 0); }
  // over the neon chicane, high on the north side
  { const pts = [], a0 = I(18.6), a1 = I(29.2), span = (a1 - a0 + N) % N; for (let k = 0; k <= 200; k++) { const i = (a0 + Math.round(span * k / 200)) % N; pts.push(at(i, edge(i, 1) + 22, 12 + Math.sin(k * 0.07) * 5)); } stream(pts, 60, 20, 1); }
  // under the hairpin
  { const pts = [], a0 = I(43), a1 = I(49.2), span = (a1 - a0 + N) % N; for (let k = 0; k <= 160; k++) { const i = (a0 + Math.round(span * k / 160)) % N; pts.push(at(i, -(edge(i, -1) + 6), -14 + Math.sin(k * 0.1) * 3)); } stream(pts, 50, 18, 0); }
  const cubeCols = [0x35e0ff, 0xff5cc8];
  const cubeMeshes = cubeCols.map((c, ci) => {
    const n = streams.filter(s => s.color === ci).reduce((a, s) => a + s.count, 0);
    const { geometry, material } = S.dataCube(c, 0.9);
    const im = new THREE.InstancedMesh(geometry, material, n); im.frustumCulled = false; ctx.group.add(im); return im;
  });
  const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _s = new THREE.Vector3(), _p = new THREE.Vector3();
  anim.push((dt, time) => {
    const idx = [0, 0];
    for (const s of streams) {
      const im = cubeMeshes[s.color];
      for (let k = 0; k < s.count; k++) {
        const u = ((((k / s.count) + time * s.speed) % 1) + 1) % 1, f = u * (s.M - 1), j = Math.floor(f), w = f - j;
        const a = s.pts[j], b = s.pts[Math.min(s.M - 1, j + 1)];
        _p.set(a.x + (b.x - a.x) * w, a.y + (b.y - a.y) * w, a.z + (b.z - a.z) * w);
        const sc0 = s.hide[j] ? 0 : 0.6 + 0.4 * Math.sin(k * 1.7 + time * 3);
        _e.set(time * 0.9 + k, time * 1.3 + k * 0.5, 0); _q.setFromEuler(_e); _s.setScalar(sc0);
        _m.compose(_p, _q, _s); im.setMatrixAt(idx[s.color]++, _m);
      }
    }
    cubeMeshes.forEach(im => { im.instanceMatrix.needsUpdate = true; });
  });

  /* ----- arrow boards on the outside of every real corner, floating at road height ----- */
  const chevL = [], chevR = [];
  for (const c of tr.corners) {
    const side = c.dir > 0 ? -1 : 1, n = Math.max(2, Math.min(5, Math.round(c.len / 15)));
    for (let k = 0; k < n; k++) {
      const i = (c.i0 + Math.round(((k + 0.6) / n) * (c.len / tr.ds))) % N;
      const e = side > 0 ? tr.edgeL[i] : tr.edgeR[i];
      if (tr.gap[i]) continue;
      const lat = side * (edge(i, side) + (e === EDGE.WALL ? 1.6 : 2.4)), p = at(i, lat, 0.3);
      (c.dir > 0 ? chevL : chevR).push({ x: p.x, y: p.y, z: p.z, yaw: faceRoad(i, side) });
    }
  }
  const chev = P.chevronBoard(0xff5cc8), chevFlip = P.chevronBoard(0xff5cc8); chevFlip.scale.x = -1;
  sc.instances(partsOf(chev), chevR, { cast: false });
  sc.instances(partsOf(chevFlip), chevL, { cast: false });

  /* ----- floating holo boards with the slogans ----- */
  [[3.9, -1, 7, 5], [4.9, 1, 7, 5], [18.6, 1, 8, 5], [28.6, -1, 8, 5], [40.3, -1, 8, 5], [42.7, 1, 8, 5], [49.5, 1, 14, 9], [1.0, -1, 9, 6], [12.0, 1, 7, 6], [46.6, 1, 8, 6]].forEach(([cp, side, off, up], k) => {
    const i = I(cp), p = at(i, side * (edge(i, side) + off), up);
    const tex = bannerTexture([ADS[k % ADS.length]], k + 21); tex.repeat.set(0.25, 1);
    const b = S.holoBoard(tex, { w: 16, h: 4, color: gateCols[k % 3] });
    sc.place(b, p.x, p.z, { y: p.y, yaw: faceRoad(i, side) + rng.range(-0.12, 0.12), cast: false });
  });
}
