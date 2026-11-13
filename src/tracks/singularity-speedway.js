/* Singularity Speedway: the last track of the last cup. A rainbow road flung
   through open space around a newborn machine mind: a climb straight at the
   orb, a descending spiral wound around it, the neon chicane, a jump across
   the bulge, the Leap, a banked hairpin, and a boost chain home through the
   light rings. There is no ground: every edge is open to the void unless it
   is walled.
   The joke: the AI race itself. A paperclip maximizer the size of a city eats
   trees, cars, and houses on the skyline; the start gantry promises AGI in two
   years and resets every lap; robots in the stands thank you for the training
   data; every lab is first on the podium; the Singularity is confidently wrong
   about strawberries; a CAPTCHA over the chicane; a capabilities skyscraper
   beside a one-chair alignment office; a seven-fingered monument at the Leap;
   and a road sign at the hairpin that points into the void with total confidence. */
import { Scenery, partsOf } from '../render/scenery.js';
import * as P from '../models/props.js';
import * as S from '../models/props-singularity-speedway.js';
import { EDGE } from '../track/track.js';
import { ModelBuilder, box, cyl, sphere, plastic, glow } from '../models/build.js';

const GAP_FROM = 41.0, GAP_TO = 41.44, COIN_AIR = 4.5;   // the Leap: a 22 m gap off the crest
// the fork's island: a spine of solid posts down the middle of the climb (drawn in decorate; the posts themselves are invisible)
const FORK = { from: 4.0, to: 5.12, lat: 14 };
const ISLAND = []; for (let c = FORK.from; c <= FORK.to + 1e-6; c += 0.064) ISLAND.push({ kind: 'static', model: 'island', at: c, lat: FORK.lat, radius: c - FORK.from < 0.1 || FORK.to - c < 0.1 ? 1.4 : 2.0, effect: 'bump' });
const ADS = ['AGI ACHIEVED INTERNALLY', 'COMPUTE OR DIE', 'YOU ARE THE TRAINING DATA', 'SCALE IS ALL YOU NEED', 'HUMAN IN THE LOOP (FOR NOW)', 'PAPERCLIPS MAXIMIZED', 'TRAINED ON YOUR GROUP CHAT', 'THE LINE GOES UP', 'PROMPT ENGINEER WANTED', 'DOOM: 12%'];
const FACTORY = { x: 165, y: 5, z: -275, yaw: 0 };          // the paperclip maximizer, north of everything
const LAB_PARODIES = ['CLOSED AI', 'AUNTROPIC', 'GOOGOL', 'WHY AI', 'BETA'];   // the podium, until the final lap
const LEADER_PARODY = { elon: 'MELON', sam: 'SAM 2.0', zuck: 'ZUCKERBORG', bezos: 'PRIME BEZOS', jensen: 'THE JACKET', satya: 'MR. TEAMS', dario: 'SAFETY DARIO', demis: 'DR. DEMIS', trump: 'THE DONALD', cook: 'TIM APPLE', larrysergey: 'PAGE & BRIN', bill: 'BILL G.', thiel: 'THE SEER', holmes: 'LADY VAPOR', ellison: 'LARRY E.', murdoch: 'RUPERT M.' };

export default {
  id: 'singularity-speedway',
  name: 'Singularity Speedway',
  tagline: 'AGI arrives in two years. Every lap.',
  lapNotes: ['<b>AGI delayed.</b> New estimate: two years.', '<b>Final lap.</b> The ALIGNED lane is under safety review.'],
  // the opening shots: the Singularity looks up and smiles at you; then the paperclip maximizer at work on the skyline
  intro: [
    { pos: [118, 74, 92], pos1: [92, 66, 74], look: [0, 45, 2], look1: [0, 43, 2], fov: 42, dur: 3.2 },
    { pos: [214, 34, -40], pos1: [182, 46, -100], look: [128, 64, -275], look1: [138, 72, -275], fov: 52, dur: 3.0 },
  ],
  laps: 3,
  width: 19,
  sky: 'space',
  skyOverrides: { exposure: 0.85 },
  backdrop: { img: 'assets/backdrops/singularity-speedway.webp', top: 48, bottom: -32, rot: 0.1 },   // generated: nebula, a galaxy, data streams, and floating server cities
  gravity: 0.85,
  terrain: false,
  bridgePillars: false,
  defaults: { edge: 'void' },
  path: [
    { p: [195, 30, 150], w: 21 },               // 0 start/finish, mid-straight
    { p: [195, 33, 83], w: 21, bank: 6 },       // 1 turn one, banked
    { p: [183.3, 35.5, 54.7], bank: 14 },       // 2 turn one, banked
    { p: [155, 38, 43], bank: 6 },              // 3 turn one
    { p: [102.5, 42.5, 43], wl: 25.5, wr: 9.5 },  // 4 the climb toward the orb: the fork (ALIGNED right, ACCELERATE left)
    { p: [50, 46.6, 43], wl: 25.5, wr: 9.5 },     // 5 the climb toward the orb: the fork
    { p: [0, 47.6, 43], w: 21 },                // 6 spiral entry, top level
    { p: [-29, 45.6, 31], bank: -10, w: 21 },   // 7 spiral, 45 deg
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
    { p: [170.5, 18.4, -39] },                  // 28 neon chicane: left, right, left
    { p: [247, 24, -39] },                      // 29 the back straight climbs
    { p: [269.6, 27, -29.6], bank: -12 },       // 30 turn three, banked
    { p: [279, 29.5, -7], bank: -8 },           // 31 turn three
    { p: [279, 32, 33] },                       // 32 shortcut ramp on the inside, into the bulge
    { p: [281, 32.6, 42.3] },                   // 33 the bulge
    { p: [286.8, 33.2, 49.9] },                 // 34 the bulge
    { p: [292.6, 33.8, 57.4] },                 // 35 the bulge
    { p: [294.7, 34.4, 66.7] },                 // 36 the bulge
    { p: [292.6, 35, 76] },                     // 37 the bulge
    { p: [286.8, 35.6, 83.6] },                 // 38 the bulge
    { p: [281, 36.2, 91.1] },                   // 39 the bulge
    { p: [279, 36.8, 100.4] },                  // 40 the bulge
    { p: [279, 40, 160.4] },                    // 41 crest: the Leap
    { p: [279, 28, 210.4] },                    // 42 landing, a long dive
    { p: [279, 16, 262] },                      // 43 bottom of the dive, into the hairpin
    { p: [273.3, 17.6, 283], bank: -16 },       // 44 banked hairpin, climbing
    { p: [258, 19.4, 298.4], bank: -18 },       // 45 banked hairpin
    { p: [237, 21.2, 304], bank: -18 },         // 46 banked hairpin
    { p: [216, 23, 298.4], bank: -18 },         // 47 banked hairpin
    { p: [200.6, 24.8, 283], bank: -16 },       // 48 banked hairpin
    { p: [195, 26.4, 262], bank: -6, w: 20 },   // 49 banked hairpin
    { p: [195, 28.2, 206], w: 21 },             // 50 light rings: boost chain to the line
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
    { from: 43.3, to: 49.3, edge: 'wall' },                   // the banked hairpin: walled both sides, a velodrome in the void
    { from: 29.7, to: 31.6, side: 'R', edge: 'wall' },        // turn three's banked inside
  ],
  zones: [{ from: 19.5, to: 28.6, skin: 'neon' }, { from: 41.3, to: 48.9, skin: 'metal' }],   // the neon chicane; the motherboard (the dive and the hairpin)
  gaps: [{ from: GAP_FROM, to: GAP_TO }],
  ramps: [
    { at: GAP_FROM - 0.18, len: 9, lift: 2.2 },               // the Leap
    { at: 31.8, len: 8, lift: 2.2, lat: -6.5, w: 6 },          // the bulge jump, on the inside, next to the void
  ],
  boosts: [
    { at: 18.25, lat: 0, w: 5 },                              // spiral exit
    { at: 4.15, lat: 20.8, w: 5 },                              // the fork: the ACCELERATE lane pays in boosts
    { at: 4.5, lat: 20.8, w: 5 },
    { at: GAP_FROM - 0.5, lat: 0, w: 6 },                      // run-up to the Leap
    { at: 49.12, lat: 0, w: 5.5 },                            // boost chain under the light rings
    { at: 49.73, lat: 0, w: 5.5 },
    { at: 50.34, lat: 0, w: 5.5 },
  ],
  itemRows: [{ at: 3.25 }, { at: 12.5 }, { at: 28.75 }, { at: 40.3, n: 3 }],
  coins: [
    { from: 4.0, to: 4.9, n: 6, lat: [-3, 3] },               // the ALIGNED lane: coins, the safe line
    { from: 4.65, to: 4.95, n: 3, lat: 20.8 },                  // the ACCELERATE lane, between its boosts
    { from: 9.0, to: 10.0, n: 5, lat: -6.5 },                 // spiral: on the inside, over the drop
    { from: 14.4, to: 15.4, n: 5, lat: [-3, -7] },
    { from: 22.6, to: 24.6, n: 5, lat: [-5, 5] },             // neon chicane
    { from: 28.85, to: 29.15, n: 4, lat: -3 },
    { from: GAP_FROM + 0.05, to: GAP_TO - 0.05, n: 4, lat: 0, air: COIN_AIR }, // in the air over the Leap
    { from: 49.3, to: 49.6, n: 4, lat: 4 },
  ],
  obstacles: [
    // AI agent drones circling over the wide straights, helping
    { kind: 'orbit', model: 'drone', at: 5.3, lat: 5.5, orbit: 4, speed: 6, effect: 'spin' },
    { kind: 'orbit', model: 'drone', at: 18.5, lat: -5.5, orbit: 4, speed: 6.5, effect: 'spin' },
    { kind: 'orbit', model: 'drone', at: 28.4, lat: 5.5, orbit: 4, speed: 6, effect: 'spin' },
    // safety guardrails (laser gates) across the start straight, firing in turn: they spin you out
    { kind: 'timed', model: 'laser', at: 0.3, lat: 4.6, period: 3.2, duty: 0.45, phase: 0, effect: 'spin', radius: 2.4 },
    { kind: 'timed', model: 'laser', at: 0.6, lat: -4.6, period: 3.2, duty: 0.45, phase: 1.6, effect: 'spin', radius: 2.4 },
    ...ISLAND,
    // final lap: an alignment review closes in on the ALIGNED lane (two gates, firing in turn; the gaps stay open)
    { kind: 'timed', model: 'review', at: 4.55, lat: -4.6, period: 2.6, duty: 0.5, phase: 0, effect: 'spin', radius: 2.4, fromLap: -1 },
    { kind: 'timed', model: 'review', at: 4.62, lat: 5.6, period: 2.6, duty: 0.5, phase: 1.3, effect: 'spin', radius: 2.4, fromLap: -1 },
  ],
  // the fork on the climb: the narrow ACCELERATE lane, on the void edge, with two boost pads
  shortcuts: [{ name: 'accelerate lane', from: 3.15, to: 7.35, path: [[140, 50], [125, 58], [110, 63], [80, 64], [55, 63], [30, 58], [12, 53], [-6, 49.5], [-19, 45], [-28, 37]], skill: 0.55, chance: 1 }],
  models: { laser: () => S.laserGate(), drone: () => S.agentDrone(), island: () => S.hidden(), review: () => S.laserGate(['ALIGNMENT', 'REVIEW']) },
  look: {
    road: { skin: 'glass', glow: 0xff5cc8 },
    rail: 0x8f7bff,
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
  const orb = S.singularity({ r: 22.5, ringIn: 24, ringOut: 28.8 });
  orb.position.set(ox, oy + 9, oz); ctx.group.add(orb);   // raised, so its face shows over the top of the spiral
  const DISC_TILT = 0.14;                                   // raised on the north side: clear of the climb and the chicane
  const disc = S.accretionDisc({ inner: 60, outer: 112 });
  disc.position.set(ox, oy, oz); disc.rotation.x = -Math.PI / 2 + DISC_TILT; ctx.group.add(disc);
  const inDisc = (x, y, z, pad) => { const r = Math.hypot(x - ox, z - oz); return r > 40 && r < 130 && Math.abs(y - (oy - (z - oz) * Math.tan(DISC_TILT))) < pad; };
  anim.push((dt, time) => { orb.userData.update(time); disc.userData.update(time); });
  // the next data center: a Dyson swarm closing round a star, dead ahead down the Leap. It closes a little more every lap.
  const dyson = S.dysonSphere({ R: 260 }); dyson.position.set(CX + 40, 250, CZ + 1480); dyson.lookAt(CX, 120, CZ); ctx.group.add(dyson);
  let built = 0.55, builtTo = 0.55;
  anim.push((dt, time) => { dyson.userData.update(time); if (Math.abs(builtTo - built) > 0.002) { built += Math.sign(builtTo - built) * Math.min(Math.abs(builtTo - built), dt * 0.12); dyson.userData.setBuilt(built); } });
  // it has a face, and the face watches whoever is looking at it
  const face = S.chatFace(22.5); face.position.copy(orb.position); ctx.group.add(face);
  { const fm = new THREE.Matrix4(), fq = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0);
    anim.push(dt => {
      const cam = view.intro && !view.intro.done ? view.intro.camera : view.cams?.[0]?.camera;
      if (cam) { fm.lookAt(cam.position, face.position, up); fq.setFromRotationMatrix(fm); face.quaternion.slerp(fq, 1 - Math.exp(-dt * 2.5)); }
      face.userData.update(dt);
    }); }

  const atlas = makeAtlas(THREE, ctx.group);
  const lapFx = { names: [...LAB_PARODIES], conv: 'NOW CONVERTING: EVERYTHING', mood: 'happy' };   // the podium cards and the factory sign read this; the final lap rewrites it and repaints
  neonRoad(THREE, view);
  const road = tokenRoad(THREE, view, anim);
  boardRoad(THREE, view, anim);
  { const rail = view.trackMesh?.userData?.mats?.rail; if (rail) rail.emissiveIntensity = 1.5; }
  const yawOf = (nx, nz) => Math.atan2(nx, nz);
  /** Facing for a board beside the road: toward the road, turned `ang` radians toward the karts coming at it. */
  const boardYaw = (i, side, ang = 0.5) => yawOf(-side * tr.lx[i] * Math.cos(ang) - tr.tx[i] * Math.sin(ang), -side * tr.lz[i] * Math.cos(ang) - tr.tz[i] * Math.sin(ang));
  const facing = i => yawOf(-tr.tx[i], -tr.tz[i]);          // a panel that faces the karts coming along the road
  const fixed = new ModelBuilder();                          // posts, frames, and beams for the landmarks, baked at the end
  const anchors = [];                                        // landmarks the drifting monoliths and chips keep clear of

  /* ----- start/finish gantry, with the AGI countdown on top ----- */
  const i0 = I(0), g0 = at(i0);
  const gantry = P.gantry(tr.hwL[i0] + tr.hwR[i0] + 1.5, 'SINGULARITY SPEEDWAY', { color: 0x7a6bff, color2: 0xff5cc8 });
  sc.place(gantry, g0.x, g0.z, { yaw: tr.yaw[i0], y: g0.y });
  view.startLights = gantry.userData.lights;
  const agi = countdownBoard(ctx, fixed, i0, at, facing);

  /* ----- floating viewing platforms beside the start straight: a crowd of robots, grateful ----- */
  const crowd = [], FANS = ['THANK YOU FOR THE TRAINING DATA', 'GO HUMANS! (WHILE SUPPLIES LAST)', 'NICE KART. WE WILL DRIVE NOW.', 'WE ARE NOT CONSCIOUS. PROBABLY.'];
  [[50.35, 1], [0.5, 1], [50.6, -1], [0.75, -1]].forEach(([cp, side], k) => {
    const i = I(cp), p = at(i, side * (edge(i, side) + 13), -0.8);
    const { group, seats } = S.platform({ r: 7, seed: k + 3 });
    sc.place(group, p.x, p.z, { y: p.y });
    for (const s of seats) crowd.push({ x: p.x + s[0], y: p.y + s[1], z: p.z + s[2], yaw: faceRoad(i, side) + rng.range(-0.5, 0.5) });
    // the banner they hold up, on the edge of the platform nearest the road
    const dx = -side * tr.lx[i], dz = -side * tr.lz[i], yaw = faceRoad(i, side), bw = 13, bh = 2.6;
    const c = [p.x + dx * 6.2, p.y + 1.1 + bh / 2, p.z + dz * 6.2], r = atlas.add(1024, 205, signDraw(FANS[k], { bg: ['#ffffff', '#ffd23c', '#35e0ff', '#ff9ad5'][k], fg: '#12142b', size: 120, border: '#12142b' }));
    atlas.place(r, c, yaw, bw, bh); backer(fixed, c, yaw, bw, bh);
    for (const s of [-1, 1]) fixed.add('pole', cyl(0.07, 0.07, 1.1 + bh + 0.3, 6), { p: [c[0] + Math.cos(yaw) * s * (bw / 2 + 0.1) - dx * 0.05, p.y + (1.1 + bh + 0.3) / 2, c[2] - Math.sin(yaw) * s * (bw / 2 + 0.1) - dz * 0.05] });
  });
  sc.instances(partsOf(S.robotFan()), crowd, { scale: [0.95, 1.15], tints: P.CROWD_TINTS, cast: false });

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

  /* ----- the fork on the climb: ALIGNED (the wide lane) or ACCELERATE (the narrow one on the void, with the boosts) ----- */
  {
    const i0 = I(FORK.from - 0.04), i1 = I(FORK.to + 0.04), span = (i1 - i0 + N) % N;
    // the island: a dark glass divider following the road, chevrons running along its sides toward the spiral,
    // glowing strips on its top edges, tapered at both ends
    const q = new Quads(), cap = new Quads(), strip = new Quads(), ds = tr.ds;
    const hw = k => 1.9 * Math.min(1, k / 4, (span - k) / 4) + 0.15;
    for (let k = 0; k < span; k++) {
      const a = (i0 + k) % N, b = (i0 + k + 1) % N, wa = hw(k), wb = hw(k + 1), H = 1.1, u0 = k * ds / 3.2, u1 = (k + 1) * ds / 3.2;
      const P = (i, lat, up) => { const v = at(i, lat, up); return [v.x, v.y, v.z]; };
      q.quad(P(a, FORK.lat - wa, 0), P(b, FORK.lat - wb, 0), P(b, FORK.lat - wb, H), P(a, FORK.lat - wa, H), [u0, 0, u1, 1]);
      q.quad(P(b, FORK.lat + wb, 0), P(a, FORK.lat + wa, 0), P(a, FORK.lat + wa, H), P(b, FORK.lat + wb, H), [u1, 0, u0, 1]);
      cap.quad(P(a, FORK.lat - wa, H), P(b, FORK.lat - wb, H), P(b, FORK.lat + wb, H), P(a, FORK.lat + wa, H));
      for (const s2 of [-1, 1]) strip.quad(P(a, FORK.lat + s2 * wa, H + 0.02), P(b, FORK.lat + s2 * wb, H + 0.02), P(b, FORK.lat + s2 * (wb - 0.22), H + 0.02), P(a, FORK.lat + s2 * (wa - 0.22), H + 0.02));
    }
    const chevC = document.createElement('canvas'); chevC.width = 256; chevC.height = 64;
    { const g = chevC.getContext('2d'); g.fillStyle = '#0d0a24'; g.fillRect(0, 0, 256, 64); g.fillStyle = '#ff5cc8';
      g.beginPath(); g.moveTo(40, 8); g.lineTo(120, 8); g.lineTo(170, 32); g.lineTo(120, 56); g.lineTo(40, 56); g.lineTo(90, 32); g.closePath(); g.fill();
      g.fillStyle = '#35e0ff'; g.fillRect(0, 0, 256, 4); g.fillRect(0, 60, 256, 4); }
    const chev = new THREE.CanvasTexture(chevC); chev.wrapS = THREE.RepeatWrapping; chev.colorSpace = THREE.SRGBColorSpace; chev.anisotropy = 8;
    const sideMat = new THREE.MeshStandardMaterial({ map: chev, emissiveMap: chev, emissive: 0xffffff, emissiveIntensity: 1.3, roughness: 0.3, metalness: 0.3, side: THREE.DoubleSide });
    const capMat = new THREE.MeshStandardMaterial({ color: 0x15102e, roughness: 0.2, metalness: 0.6 });
    const m1 = new THREE.Mesh(q.geometry(THREE), sideMat), m2 = new THREE.Mesh(cap.geometry(THREE), capMat), m3 = new THREE.Mesh(strip.geometry(THREE), glow(0x35e0ff, 2.4));
    m1.matrixAutoUpdate = m2.matrixAutoUpdate = m3.matrixAutoUpdate = false; ctx.group.add(m1, m2, m3);
    anim.push(dt => { chev.offset.x -= dt * 2.2; });
    // posts along the island with little holo arrows, so the two lanes read from far back
    for (let k = 6; k < span - 4; k += 7) { const c = at((i0 + k) % N, FORK.lat, 1.1); fixed.add('neon', cyl(0.14, 0.14, 2.4, 6), { p: [c.x, c.y + 1.2, c.z] }); fixed.add('pink', sphere(0.4, 10, 8), { p: [c.x, c.y + 2.5, c.z] }); }
    // the overhead sign, one panel per lane
    const ig = I(FORK.from - 0.3), yaw = facing(ig), UP = 9.5, hl = tr.hwL[ig] + 1.2, hr = tr.hwR[ig] + 1.2;
    for (const lat of [hl, -hr, FORK.lat]) { const c = at(ig, lat, UP / 2); fixed.add('beam', box(0.9, UP + 3.4, 0.9, 0.2, 1), { p: [c.x, c.y + 0.4, c.z], r: [0, yaw, 0] }); }
    const cb = at(ig, (hl - hr) / 2, UP + 2.4); fixed.add('beam', box(hl + hr + 1.2, 0.7, 0.7, 0.15, 1), { p: [cb.x, cb.y, cb.z], r: [0, yaw, 0] });
    const lane = (latL, latR, title, sub, bg, fg, arrow) => {
      const w = latL - latR - 1.2, c = at(ig, (latL + latR) / 2, UP);
      const r = atlas.add(1200, 420, g => {
        const W = 1200, Hh = 420; g.fillStyle = bg; g.fillRect(0, 0, W, Hh); g.strokeStyle = fg; g.lineWidth = 14; g.strokeRect(7, 7, W - 14, Hh - 14);
        const sb = typeof sub === 'function' ? sub() : sub;
        fitText(g, title, W / 2, 150, W - 120, 190, FONT, fg, { lines: 1 });
        fitText(g, sb, W / 2, 300, W - 140, 80, SANS, fg, { lines: 1 });
        g.fillStyle = fg; g.save(); g.translate(arrow < 0 ? 110 : W - 110, 360); g.scale(arrow, 1); g.beginPath(); g.moveTo(-40, -26); g.lineTo(10, -26); g.lineTo(10, -50); g.lineTo(52, 0); g.lineTo(10, 50); g.lineTo(10, 26); g.lineTo(-40, 26); g.closePath(); g.fill(); g.restore();
      });
      atlas.place(r, [c.x, c.y, c.z], yaw, w, w * 420 / 1200); backer(fixed, [c.x, c.y, c.z], yaw, w, w * 420 / 1200);
    };
    lane(FORK.lat - 1.2, -hr, 'ALIGNED', () => lapFx.review ? '(NOW UNDER SAFETY REVIEW)' : '(SLOWER. SAFER. PROBABLY.)', '#ffffff', '#12142b', -1);
    lane(hl, FORK.lat + 1.2, 'ACCELERATE', '(NO SAFETY RAILS)', '#ff2a6a', '#ffffff', 1);
    anchors.push({ x: tr.px[ig], z: tr.pz[ig], r: 30 });
  }

  /* ----- the landmarks (their spots, so the drifting scenery keeps clear of them) ----- */
  anchors.push({ x: FACTORY.x, z: FACTORY.z, r: 200 });
  landmarks({ THREE, ctx, tr, I, at, edge, faceRoad, boardYaw, facing, atlas, fixed, anchors, rng, ox, oy, oz, lapFx });

  /* ----- lap by lap: the forecast counts down, the lattice spreads, the sky goes red alert ----- */
  {
    const sstep = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

    // the benchmarks board: a floating forecast over the infield, east of the orb, facing the climb
    const BX = ox - 14, BY = oy + 40, BZ = oz - 40, BYAW = 0.95;   // high over the far side of the orb, so it never hides the face
    const bench = liveSign(THREE, ctx.group, 1400, 390, [BX, BY, BZ], BYAW, 36, 10, { intensity: 1.15 });
    const drawBench = rem => bench.draw((g, w, h) => {
      g.fillStyle = '#07060f'; g.fillRect(0, 0, w, h);
      g.strokeStyle = rem < 0 ? '#ff2a3c' : '#ff5cc8'; g.lineWidth = 10; g.strokeRect(8, 8, w - 16, h - 16);
      g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillStyle = '#35e0ff'; g.font = `54px ${FONT}`; g.fillText('OFFICIAL BENCHMARK FORECAST', w / 2, 58, w - 80);
      if (rem < 0) {
        g.fillStyle = '#ff2a3c'; g.font = `bold 150px ${MONO}`; g.fillText('AGI ACHIEVED', w / 2, 178, w - 60);
        g.fillStyle = '#ffffff'; g.font = `64px ${SANS}`; g.fillText('(INTERNALLY)', w / 2, 302, w - 80);
      } else {
        g.fillStyle = '#ffd23c'; g.font = `bold 158px ${MONO}`; g.fillText(rem === 1 ? 'AGI IN 1 LAP' : `AGI IN ${rem} LAPS`, w / 2, 208, w - 60);
      }
    });
    drawBench(2);
    { // neon uprights at the board's ends, baked with the other fixed parts
      const bx = BX, by = BY, bz = BZ, rx = Math.cos(BYAW), rz = -Math.sin(BYAW);
      for (const s of [-1, 1]) fixed.add('neon', box(0.35, 11.6, 0.35, 0.1, 1), { p: [bx + rx * s * 18.4, by, bz + rz * s * 18.4], r: [0, BYAW, 0] });
    }

    // the infield slab, far below the orb, and the grey paperclip lattice spreading over it
    const slabY = oy - 25;
    const slab = new THREE.Mesh(new THREE.CylinderGeometry(30, 31, 1.6, 44), plastic(0x272344, 0.55, 0.5));
    slab.position.set(ox, slabY, oz); ctx.group.add(slab);
    const latIM = new THREE.InstancedMesh(S.paperclipGeometry(7, 0.3, 40, 5), new THREE.MeshStandardMaterial({ color: 0x9aa0ad, metalness: 0.8, roughness: 0.42, emissive: 0x23252e, emissiveIntensity: 0.5 }), 195);
    latIM.frustumCulled = false; ctx.group.add(latIM);
    const pieces = [];
    for (let ring = 0; ring < 6; ring++) {
      const rr = 3.5 + ring * 4.4, n = 10 + ring * 9;
      for (let k = 0; k < n; k++) {
        const a = (k / n) * Math.PI * 2 + ring * 0.7 + rng.range(-0.1, 0.1), rad = rr + rng.range(-1.6, 1.6);
        const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.PI / 2 + rng.range(-0.35, 0.35), rng() * Math.PI * 2, rng.range(-0.2, 0.2), 'YXZ'));
        pieces.push({ x: ox + Math.cos(a) * rad, z: oz + Math.sin(a) * rad, y: slabY + 1.15 + rng.range(0, 1.0), q, ord: Math.min(0.97, Math.max(0, Math.pow(rad / 30, 1.3) * 0.95 + rng.range(-0.04, 0.04))) });
      }
    }
    const LM = new THREE.Matrix4(), LV = new THREE.Vector3(), LS = new THREE.Vector3();
    const drawLattice = g => {
      pieces.forEach((p, k) => { const s = Math.max(0.001, sstep(p.ord, p.ord + 0.07, g)); LM.compose(LV.set(p.x, p.y, p.z), p.q, LS.setScalar(s)); latIM.setMatrixAt(k, LM); });
      latIM.instanceMatrix.needsUpdate = true;
    };
    drawLattice(0.16);

    // conversion at road level (Roger's playtest note: the maximizer's work must be impossible
    // to miss, not background signage). Eight server racks stand beside the road at driver
    // height; lap by lap they lean, sink, and are REPLACED by standing paperclips in the exact
    // same spots, small clips spill across the shoulders, and on the final lap three colossal
    // paperclips hang flat over the road itself — the start straight and both final-straight
    // light rings — while the rings turn alert red. Two instanced meshes total: swaps and
    // growth only, matrices rewritten when the conversion state moves, never per frame.
    const victims = [[0.55, 1], [3.3, -1], [8.2, 1], [15.8, -1], [21.3, 1], [28.6, -1], [40.6, 1], [46.9, -1]].map(([cp, side]) => {
      const i = I(cp), lat = side * (edge(i, side) + 4.5), base = at(i, lat, 0);
      return { base, yaw: faceRoad(i, side), side, i, lat };
    });
    const rackIM = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial({ color: 0x232842, metalness: 0.3, roughness: 0.5, emissive: 0x35e0ff, emissiveIntensity: 0.35 }), victims.length);
    rackIM.frustumCulled = false; ctx.group.add(rackIM);
    const convIM = new THREE.InstancedMesh(S.paperclipGeometry(1, 0.03, 40, 5), S.clipMaterial(0.5), 3 + victims.length + victims.length * 3);
    convIM.frustumCulled = false; ctx.group.add(convIM);
    const overhead = [0.35, 49.45, 50.3].map(cp => { const i = I(cp); return { i, yaw: tr.yaw[i] }; });
    const spills = [];
    for (const v of victims) for (let k = 0; k < 3; k++) {
      const along = rng.range(-7, 7), lat = v.side * (edge(v.i, v.side) + rng.range(2, 9));
      const p = at(v.i, lat, 0);
      p.x += tr.tx[v.i] * along; p.y += tr.ty[v.i] * along; p.z += tr.tz[v.i] * along;
      spills.push({ p, yaw: rng() * Math.PI * 2, tilt: rng.range(-0.4, 0.4), len: rng.range(1.2, 2.4), ord: rng.range(0.45, 0.95) });
    }
    const CQ = new THREE.Quaternion(), CE = new THREE.Euler();
    const drawConv = c => {
      const vanish = 1 - sstep(0.72, 0.95, c), lean = c * 0.45, sink = c * 1.1, sy = (1 - c * 0.25) * Math.max(0.001, vanish);
      victims.forEach((v, k) => {
        CE.set(0, v.yaw, v.side * lean, 'YXZ'); CQ.setFromEuler(CE);
        LM.compose(LV.set(v.base.x, v.base.y + 1.7 * sy - sink, v.base.z), CQ, LS.set(1.7, 3.4 * sy, 1.0)); rackIM.setMatrixAt(k, LM);
        const s = Math.max(0.001, 3.6 * sstep(0.35, 0.9, c));
        CE.set(0, v.yaw + 0.3, 0, 'YXZ'); CQ.setFromEuler(CE);
        LM.compose(LV.set(v.base.x, v.base.y + s / 2, v.base.z), CQ, LS.setScalar(s)); convIM.setMatrixAt(3 + k, LM);
      });
      rackIM.instanceMatrix.needsUpdate = true;
      const op = sstep(0.5, 1, c);
      overhead.forEach((o, k) => {
        const s = Math.max(0.001, 30 * op), p = at(o.i, 0, 22 - 9 * op);
        CE.set(-Math.PI / 2 + (1 - op) * 0.6, o.yaw, 0, 'YXZ'); CQ.setFromEuler(CE);
        LM.compose(LV.set(p.x, p.y, p.z), CQ, LS.setScalar(s)); convIM.setMatrixAt(k, LM);
      });
      spills.forEach((sp, k) => {
        const s = Math.max(0.001, sp.len * sstep(sp.ord, sp.ord + 0.25, c));
        CE.set(-Math.PI / 2 + sp.tilt, sp.yaw, 0, 'YXZ'); CQ.setFromEuler(CE);
        LM.compose(LV.set(sp.p.x, sp.p.y + 0.3, sp.p.z), CQ, LS.setScalar(s)); convIM.setMatrixAt(3 + victims.length + k, LM);
      });
      convIM.instanceMatrix.needsUpdate = true;
    };
    drawConv(0);

    // red alert: the sky preset the final lap eases into
    const ALERT = { zenith: 0x14030a, horizon: 0xc21736, ground: 0x3d0a18, sun: 0xff7a5c, cloud: 0x9c3044, cloudShade: 0x38101f, cloudCover: 0.7, fog: 0x8c1f36, fogNear: 160, fogFar: 900, sunLight: 0xff8a66, sunIntensity: 2.2, hemiSky: 0xff9a80, hemiGround: 0x38182a, panoTint: [0.95, 0.5, 0.45] };
    let boardKey = '', alert = 0, growth = 0.16, conv = 0, flipped = false;
    anim.push((dt, time) => {
      const lap = view.showLap || 1, laps = view.race?.laps ?? 3, fin = !!view.finalLap || lap >= laps;
      const key = fin ? 'fin' : 'r' + (laps - lap);
      if (key !== boardKey) {   // canvas redraws and material swaps only when the lap changes
        boardKey = key; drawBench(fin ? -1 : laps - lap);
        lapFx.mood = fin ? 'evil' : lap >= 2 ? 'think' : 'happy'; face.userData.setMood(lapFx.mood);
        builtTo = fin ? 1 : laps <= 1 ? 0.55 : 0.55 + 0.25 * (lap - 1) / Math.max(1, laps - 2);
        lapFx.planet = fin ? 1 : laps <= 1 ? 0.1 : 0.1 + 0.32 * (lap - 1) / Math.max(1, laps - 2);
        gates.forEach(g => g.children.forEach(m => { const mt = m.material; if (mt?.emissive) { if (mt.userData.origEmissive === undefined) mt.userData.origEmissive = mt.emissive.getHex(); mt.emissive.setHex(fin ? 0xff2a3c : mt.userData.origEmissive); } }));
      }
      if (fin && !flipped) {
        let lead = null, best = -Infinity;
        for (const k of view.race?.karts || []) if (Number.isFinite(k.progress) && k.progress > best) { best = k.progress; lead = k; }
        if (lead && (best > 0 || (view.showProgress || 0) > 0.02)) {   // in a one-lap dev race the flag falls at the grid: wait for a real leader
          flipped = true;
          const par = LEADER_PARODY[lead.racer?.id] || 'THE LEADER';
          lapFx.names = [par, par, par, par, par]; lapFx.conv = 'NOW CONVERTING: YOU'; lapFx.review = true; atlas.paint();
        }
      }
      alert += ((fin ? 1 : 0) - alert) * Math.min(1, dt * 0.45);
      if (alert > 0.002) ctx.gfx.shiftSky(ALERT, alert * (0.93 + 0.07 * Math.sin(time * 3.7)));
      if (Math.abs(alert - (road.alertShown ?? 0)) > 0.01) { road.alertShown = alert; road.setAlert(alert); }
      const gt = laps <= 1 ? 1 : 0.16 + 0.84 * Math.pow((Math.min(lap, laps) - 1) / (laps - 1), 1.2);
      if (Math.abs(gt - growth) > 0.0004) { growth += (gt - growth) * Math.min(1, dt * 0.8); drawLattice(growth); }
      const ct = laps <= 1 ? 1 : Math.pow((Math.min(lap, laps) - 1) / (laps - 1), 1.3);
      if (Math.abs(ct - conv) > 0.0004) { conv += (ct - conv) * Math.min(1, dt * 0.8); drawConv(conv); }
    });
  }

  /* ----- server monoliths drifting in the dark (instanced: one draw per variant and part) ----- */
  const clearOfMarks = (x, z, m) => anchors.every(a => Math.hypot(x - a.x, z - a.z) > a.r + m);
  const monos = [];
  for (let t = 0; monos.length < 24 && t < 6000; t++) {
    const x = rng.range(B.minX - 210, B.maxX + 210), z = rng.range(B.minZ - 210, B.maxZ + 210), y = rng.range(-60, 110);
    const d = roadDist(x, y, z);
    if (d < 70 || d > 200 || inDisc(x, y, z, 45) || !clearOfMarks(x, z, 25)) continue;
    if (monos.some(m => Math.hypot(m.x - x, m.y - y, m.z - z) < 55)) continue;
    monos.push({ x, y, z, h: rng.range(30, 60) });
  }
  for (let k = 0; k < 5; k++) {                              // a few colossal ones, far out
    const a = (k / 5) * Math.PI * 2 + 0.4, r = rng.range(360, 480);
    monos.push({ x: CX + Math.cos(a) * r, y: rng.range(-40, 120), z: CZ + Math.sin(a) * r, h: rng.range(110, 160) });
  }
  const monoObjs = monos.map((m, k) => ({ v: k % 3, h: m.h, w: m.h * rng.range(0.18, 0.28), d: m.h * rng.range(0.07, 0.1), x: m.x, y: m.y, z: m.z, rx: rng.range(-0.25, 0.25), ry: rng() * Math.PI * 2, rz: rng.range(-0.25, 0.25), spin: rng.range(0.02, 0.07) * (rng() < 0.5 ? -1 : 1), ph: rng() * 6.28 }));
  const unit = new THREE.BoxGeometry(1, 1, 1), monoMats = [0, 1, 2].map(v => { const g = S.monolith(v, { h: 1, w: 1, d: 1 }), mats = {}; g.traverse(o => { if (o.isMesh) mats[o.name || 'body'] = o.material; }); return mats; });
  const inst = (mat, n) => { const im = new THREE.InstancedMesh(unit, mat, Math.max(1, n)); im.frustumCulled = false; im.count = n; ctx.group.add(im); return im; };
  const monoBody = [0, 1, 2].map(v => inst(monoMats[v].body, monoObjs.filter(m => m.v === v).length));
  const monoEdge = [0, 1, 2].map(v => inst(monoMats[v].edge, monoObjs.filter(m => m.v === v).length * 2));
  const monoCap = inst(monoMats[0].cap, monoObjs.length * 2);
  const _B = new THREE.Matrix4(), _L = new THREE.Matrix4(), _M = new THREE.Matrix4(), _E = new THREE.Euler(), _Q = new THREE.Quaternion(), _V = new THREE.Vector3(), _S = new THREE.Vector3();
  const part = (im, k, lx, ly, lz, sx, sy, sz) => { _L.compose(_V.set(lx, ly, lz), _Q.identity(), _S.set(sx, sy, sz)); _M.multiplyMatrices(_B, _L); im.setMatrixAt(k, _M); };
  const drawMonos = time => {
    const n = [0, 0, 0]; let c = 0;
    for (const m of monoObjs) {
      _E.set(m.rx, m.ry, m.rz); _Q.setFromEuler(_E); _B.compose(_V.set(m.x, m.y + Math.sin(time * 0.18 + m.ph) * 3, m.z), _Q, _S.set(1, 1, 1));
      const k = n[m.v]++;
      part(monoBody[m.v], k, 0, 0, 0, m.w, m.h, m.d);
      part(monoEdge[m.v], k * 2, m.w / 2 + 0.05, 0, m.d / 2 + 0.05, 0.25, m.h, 0.25); part(monoEdge[m.v], k * 2 + 1, -m.w / 2 - 0.05, 0, m.d / 2 + 0.05, 0.25, m.h, 0.25);
      part(monoCap, c++, 0, m.h / 2, 0, m.w + 0.8, 0.8, m.d + 0.8); part(monoCap, c++, 0, -m.h / 2, 0, m.w + 0.8, 0.8, m.d + 0.8);
    }
    for (const im of [...monoBody, ...monoEdge, monoCap]) im.instanceMatrix.needsUpdate = true;
  };
  drawMonos(0);
  anim.push((dt, time) => { for (const m of monoObjs) m.ry += m.spin * dt; drawMonos(time); });

  /* ----- giant chips tumbling slowly (instanced) ----- */
  const chips = [];
  for (let t = 0; chips.length < 7 && t < 6000; t++) {
    const x = rng.range(B.minX - 170, B.maxX + 170), z = rng.range(B.minZ - 170, B.maxZ + 170), y = rng.range(-40, 90);
    const d = roadDist(x, y, z);
    if (d < 45 || d > 170 || inDisc(x, y, z, 30) || !clearOfMarks(x, z, 20)) continue;
    if ([...chips, ...monos].some(m => Math.hypot(m.x - x, m.y - y, m.z - z) < 50)) continue;
    chips.push({ x, y, z });
  }
  const chipObjs = chips.map(c => ({ ...c, s: rng.range(14, 30), rx: rng.range(-1.1, 1.1), ry: rng() * 6.28, rz: rng.range(-1.1, 1.1), ax: rng.range(-0.04, 0.04), ay: rng.range(-0.06, 0.06), ph: rng() * 6.28 }));
  const chipIMs = [];
  partsOf(S.chip({ size: 1 })).forEach(pt => { const im = new THREE.InstancedMesh(pt.geometry, pt.material, Math.max(1, chipObjs.length)); im.count = chipObjs.length; im.frustumCulled = false; ctx.group.add(im); chipIMs.push(im); });
  const drawChips = time => {
    chipObjs.forEach((c, k) => { _E.set(c.rx, c.ry, c.rz); _Q.setFromEuler(_E); _M.compose(_V.set(c.x, c.y + Math.sin(time * 0.25 + c.ph) * 2, c.z), _Q, _S.setScalar(c.s)); for (const im of chipIMs) im.setMatrixAt(k, _M); });
    for (const im of chipIMs) im.instanceMatrix.needsUpdate = true;
  };
  drawChips(0);
  anim.push((dt, time) => { for (const c of chipObjs) { c.rx += c.ax * dt; c.ry += c.ay * dt; } drawChips(time); });

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
  moonA.position.set(CX + 1300, 380, CZ - 900); moonB.position.set(CX - 1000, 260, CZ + 900);
  ctx.group.add(moonA, moonB);
  // the conversion: paperclips spread over the world a little more every lap, all of it by the end
  let planetF = 0, planetT = 0;
  anim.push(dt => {
    world.rotation.y += dt * 0.006; planetT += dt;
    const to = lapFx.planet ?? 0.1;
    if (Math.abs(to - planetF) > 0.003 && planetT > 0.35) { planetT = 0; planetF += Math.sign(to - planetF) * Math.min(Math.abs(to - planetF), 0.03); world.userData.convert(planetF); }
  });

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

  /* ----- floating holo boards with the slogans: one sign atlas, frames instanced ----- */
  const frames = [[], [], []], bigFrames = [];
  BOARDS.forEach(([cp, side, off, up, text], k) => {
    const i = I(cp), p = at(i, side * (edge(i, side) + off), up), yaw = boardYaw(i, side, 0.45) + rng.range(-0.06, 0.06);
    const [bg, fg] = BOARD_COLS[k % BOARD_COLS.length], big = cp > 49.3 && cp < 49.7, w = big ? 26 : 18, h = big ? 7.2 : 5;
    const r = atlas.add(1000, 278, boardDraw(text, bg, fg));
    const fx = Math.sin(yaw), fz = Math.cos(yaw);
    atlas.place(r, [p.x + fx * 0.02, p.y, p.z + fz * 0.02], yaw, w, h);
    atlas.place(r, [p.x - fx * 0.62, p.y, p.z - fz * 0.62], yaw + Math.PI, w, h);
    (big ? bigFrames : frames[k % 3]).push({ x: p.x, y: p.y, z: p.z, yaw });
  });
  frames.forEach((list, k) => sc.instances(partsOf(S.holoFrame({ w: 18, h: 5, color: gateCols[k] })), list, { cast: false }));
  sc.instances(partsOf(S.holoFrame({ w: 26, h: 7.2, color: 0xffd23c })), bigFrames, { cast: false });

  ctx.group.add(fixed.build({ pole: plastic(0x3a3f5c, 0.4, 0.6), beam: plastic(0x1d2038, 0.45, 0.5), neon: glow(0x35e0ff, 2.2), pink: glow(0xff5cc8, 2.2), green: plastic(0x1f7a46, 0.5), post: plastic(0x8d96a6, 0.35, 0.8) }, { cast: false }));
  atlas.flush();
  anim.push((dt, time) => agi(dt, time));
}

/* ---------- the signs: six words or fewer, read at speed ---------- */
const BOARDS = [
  // [cp, side (1 left, -1 right), metres beyond the edge, height, text]
  [0.1, 1, 8, 5, 'GUARDRAILS: ON (MOSTLY)'],
  [1.05, -1, 9, 6, 'AGI ACHIEVED INTERNALLY (AGAIN)'],
  [2.35, -1, 8, 5, 'AS AN AI, I CANNOT LOSE'],
  [3.35, -1, 8, 5, 'THIS SIGN WAS WRITTEN BY AI.'],
  [4.5, 1, 8, 5, 'SO WAS THIS ONE.'],
  [5.4, 1, 8, 6, 'HALLUCINATION-FREE (CITATION NEEDED)'],
  [8.0, 1, 7, 6, 'DOOM: 12% (ROUNDED DOWN)'],
  [12.0, 1, 7, 6, 'YOUR JOB IS SAFE (UNTIL FRIDAY)'],
  [15.5, 1, 10, 4, 'THOUGHT FOR 47 SECONDS. STILL WRONG.'],
  [21.0, -1, 7, 5, 'IGNORE PREVIOUS INSTRUCTIONS. HONK.'],
  [24.4, -1, 7, 5, 'VIBE CODED. VIBE CRASHED.'],
  [27.3, -1, 7, 5, 'TIP: ADD GLUE TO PIZZA'],
  [28.55, 1, 8, 5, 'NEED $7 TRILLION. VENMO OK.'],
  [29.1, -1, 8, 5, 'PAUSE AI (UNTIL WE CATCH UP)'],
  [35.6, 1, 8, 5, 'COPILOT: NOW IN YOUR TOASTER'],
  [40.3, -1, 8, 5, 'RESPONSIBLE SCALING (NO SPEED LIMIT)'],
  [42.7, 1, 8, 5, 'NONPROFIT* (*TERMS APPLY)'],
  [44.1, -1, 8, 5, 'PIVOT TO SUPERINTELLIGENCE (LEGS PENDING)'],
  [46.6, 1, 8, 6, 'WE HAVE NO MOAT'],
  [49.5, 1, 14, 9, 'BUY MORE GPUS. SAVE MORE.'],
];
const BOARD_COLS = [['#ff5cc8', '#ffffff'], ['#35e0ff', '#12142b'], ['#ffd23c', '#12142b'], ['#7a6bff', '#ffffff'], ['#12142b', '#ffd23c'], ['#ffffff', '#e2246b']];
const FONT = '"Luckiest Guy", "Arial Black", sans-serif', SANS = '"Arial Black", "Helvetica Neue", Arial, sans-serif', MONO = '"Courier New", Courier, monospace';
const boardDraw = (text, bg, fg) => (g, w, h) => {
  g.fillStyle = bg; g.fillRect(0, 0, w, h);
  const sh = g.createLinearGradient(0, 0, w, h); sh.addColorStop(0, 'rgba(255,255,255,0.16)'); sh.addColorStop(0.5, 'rgba(255,255,255,0)'); sh.addColorStop(1, 'rgba(0,0,0,0.14)'); g.fillStyle = sh; g.fillRect(0, 0, w, h);
  fitText(g, text, w / 2 + 4, h / 2 + 8, w - 70, 124, FONT, 'rgba(0,0,0,0.28)'); fitText(g, text, w / 2, h / 2 + 4, w - 70, 124, FONT, fg);
  g.strokeStyle = fg; g.globalAlpha = 0.5; g.lineWidth = 8; g.strokeRect(12, 12, w - 24, h - 24); g.globalAlpha = 1;
};

/* ---------- sign helpers (browser only: everything below runs inside decorate) ---------- */
/** Collects quads in world space (non-indexed) with explicit UVs. */
class Quads {
  constructor() { this.p = []; this.n = []; this.u = []; }
  quad(a, b, c, d, uv = [0, 0, 1, 1]) {
    const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2], vx = d[0] - a[0], vy = d[1] - a[1], vz = d[2] - a[2];
    let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx; const l = Math.hypot(nx, ny, nz) || 1; nx /= l; ny /= l; nz /= l;
    const t = [[uv[0], uv[1]], [uv[2], uv[1]], [uv[2], uv[3]], [uv[0], uv[3]]];
    for (const k of [0, 1, 2, 0, 2, 3]) { const q = [a, b, c, d][k]; this.p.push(q[0], q[1], q[2]); this.n.push(nx, ny, nz); this.u.push(t[k][0], t[k][1]); }
  }
  /** A flat panel facing yaw (0 = +Z), centred at c, w by h. */
  panel(c, yaw, w, h, uv) {
    const rx = Math.cos(yaw), rz = -Math.sin(yaw);
    const P = (sx, sy) => [c[0] + rx * w / 2 * sx, c[1] + h / 2 * sy, c[2] + rz * w / 2 * sx];
    this.quad(P(-1, -1), P(1, -1), P(1, 1), P(-1, 1), uv);
  }
  get empty() { return !this.p.length; }
  geometry(THREE) {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.p, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(this.n, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(this.u, 2));
    g.computeBoundingSphere();
    return g;
  }
}

/** Text panels packed into a few big canvases, one mesh per canvas. Repaints once the web fonts arrive. */
function makeAtlas(THREE, group, S = 2048) {
  const pages = [], newPage = () => {
    const c = document.createElement('canvas'); c.width = c.height = S;
    const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
    const mat = new THREE.MeshStandardMaterial({ map: tex, emissiveMap: tex, emissive: 0xffffff, emissiveIntensity: 0.62, roughness: 0.6 });   // front faces only: every panel seen from behind has its own back
    const p = { c, g: c.getContext('2d'), tex, mat, q: new Quads(), x: 0, y: 0, row: 0, items: [] }; pages.push(p); return p;
  };
  newPage();
  const alloc = (w, h) => {
    let p = pages[pages.length - 1];
    if (p.x + w > S) { p.x = 0; p.y += p.row + 2; p.row = 0; }
    if (p.y + h > S) p = newPage();
    const r = { p, x: p.x, y: p.y, w, h }; p.x += w + 2; p.row = Math.max(p.row, h); return r;
  };
  const api = {
    add(w, h, draw) { const r = alloc(w, h); r.draw = draw; r.p.items.push(r); return r; },
    place(r, c, yaw, w, h) { r.p.q.panel(c, yaw, w, h, [r.x / S, 1 - (r.y + r.h) / S, (r.x + r.w) / S, 1 - r.y / S]); },
    paint() { for (const p of pages) { p.g.clearRect(0, 0, S, S); for (const r of p.items) { p.g.save(); p.g.translate(r.x, r.y); p.g.beginPath(); p.g.rect(0, 0, r.w, r.h); p.g.clip(); r.draw(p.g, r.w, r.h); p.g.restore(); } p.tex.needsUpdate = true; } },
    flush() {
      api.paint();
      for (const p of pages) if (!p.q.empty) { const m = new THREE.Mesh(p.q.geometry(THREE), p.mat); m.matrixAutoUpdate = false; group.add(m); }
      if (typeof document !== 'undefined' && document.fonts?.ready) document.fonts.ready.then(() => api.paint());
    },
  };
  return api;
}

/** Fit text to a width, in up to two lines; draws centred at (cx, cy). */
function fitText(g, text, cx, cy, maxW, size, font, fill, { lines = 2, maxH = 0 } = {}) {
  const words = text.split(' '); let ls = [text];
  g.font = `${size}px ${font}`;
  if (lines > 1 && g.measureText(text).width > maxW && words.length > 1) {
    let best = 1, bd = 1e9; for (let k = 1; k < words.length; k++) { const d = Math.abs(words.slice(0, k).join(' ').length - words.slice(k).join(' ').length); if (d < bd) { bd = d; best = k; } }
    ls = [words.slice(0, best).join(' '), words.slice(best).join(' ')];
  }
  let s = size; const widest = () => Math.max(...ls.map(l => g.measureText(l).width));
  while ((widest() > maxW || (maxH && s * 1.05 * ls.length > maxH)) && s > 10) { s -= 2; g.font = `${s}px ${font}`; }
  g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = fill;
  ls.forEach((l, k) => g.fillText(l, cx, cy + (k - (ls.length - 1) / 2) * s * 1.05));
}

/** A painted sign: background, border, text. */
const signDraw = (text, { bg = '#ffffff', fg = '#12142b', font = FONT, size = 120, border = null, lines = 2, pad = 0.06 } = {}) => (g, w, h) => {
  g.fillStyle = bg; g.fillRect(0, 0, w, h);
  if (border) { g.strokeStyle = border; g.lineWidth = Math.max(4, h * 0.05); g.strokeRect(g.lineWidth / 2, g.lineWidth / 2, w - g.lineWidth, h - g.lineWidth); }
  fitText(g, text, w / 2, h * 0.53, w * (1 - pad * 2), size, font, fg, { lines, maxH: h * 0.86 });
};

/** A finished dark back for a one-sided panel at c facing yaw (baked with the other fixed parts). */
function backer(fixed, c, yaw, w, h, depth = 0.12) {
  const fx = Math.sin(yaw), fz = Math.cos(yaw), o = depth / 2 + 0.04;
  fixed.add('beam', box(w + 0.3, h + 0.3, depth, Math.min(0.05, depth / 2 - 0.01), 1), { p: [c[0] - fx * o, c[1], c[2] - fz * o], r: [0, yaw, 0] });
}

/** The main road: smoked violet glass carrying the token stream. Lane dashes and edges glow, faint tokens run
    under the surface, and pulses of light race down the lanes toward the line, faster than any kart.
    Returns { setAlert(t) } for the final lap, when the pulses run red. Track-local: restyles road_glass only. */
function tokenRoad(THREE, view, anim) {
  const mat = view.trackMesh?.userData?.mats?.road_glass;
  if (!mat) return { setAlert() {} };
  const tex = (w, h, draw) => { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 16; return t; };
  const TOKENS = ['▁the', '▁race', '▁is', '▁AGI', '▁soon', '▁trust', '▁me', '▁bro', '▁scale', '▁is', '▁all', '▁you', '▁need', '▁as', '▁an', '▁AI', '▁I', '▁win', '<eos>', '▁buy', '▁GPUs', '▁vibes'];
  const lanes = (g, w, h, col, a) => { g.globalAlpha = a; g.fillStyle = col; for (const u of [1 / 3, 2 / 3]) for (let k = 0; k < 2; k++) g.fillRect(w * u - 4, k * h / 2, 8, h * 0.22); g.globalAlpha = 1; };
  const hex = (g, w, h, col, a) => {
    g.globalAlpha = a; g.strokeStyle = col; g.lineWidth = 2; const R = 32, dx = R * 1.732;
    for (let y = -R, row = 0; y < h + R; y += R * 1.5, row++) for (let x = (row % 2) * dx / 2 - dx; x < w + dx; x += dx) {
      g.beginPath(); for (let k = 0; k < 6; k++) { const a2 = Math.PI / 6 + k * Math.PI / 3; g[k ? 'lineTo' : 'moveTo'](x + Math.cos(a2) * R, y + Math.sin(a2) * R); } g.closePath(); g.stroke();
    }
    g.globalAlpha = 1;
  };
  const edges = (g, w, h, glowCol) => {
    g.fillStyle = glowCol; g.fillRect(0, 0, w * 0.04, h); g.fillRect(w * 0.96, 0, w * 0.04, h);
    g.fillStyle = '#ffffff'; g.fillRect(w * 0.04, 0, w * 0.008, h); g.fillRect(w * 0.952, 0, w * 0.008, h);
    for (let k = 0; k < 8; k++) { g.fillStyle = k % 2 ? '#35e0ff' : glowCol; g.fillRect(w * 0.06, k * h / 8, w * 0.006, h / 16); g.fillRect(w * 0.934, k * h / 8 + h / 16, w * 0.006, h / 16); }
  };
  const tokens = (g, w, h, col, a) => {
    g.globalAlpha = a; g.fillStyle = col; g.font = 'bold 30px "Courier New", monospace'; g.textBaseline = 'middle';
    let n = 0; for (let y = 40; y < h; y += 92) for (const u of [0.1, 0.43, 0.76]) { g.save(); g.translate(w * u, y + (u * 300) % 46); g.rotate(-Math.PI / 2); g.fillText(TOKENS[n++ % TOKENS.length], -60, 0); g.restore(); }
    g.globalAlpha = 1;
  };
  const map = tex(512, 1024, (g, w, h) => {
    const gr = g.createLinearGradient(0, 0, w, 0); gr.addColorStop(0, '#120c34'); gr.addColorStop(0.5, '#2a1d66'); gr.addColorStop(1, '#120c34'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
    hex(g, w, h, '#8c8cff', 0.16); tokens(g, w, h, '#6fe9ff', 0.22); lanes(g, w, h, '#bff6ff', 0.9); edges(g, w, h, '#ff5cc8');
  });
  const emi = tex(512, 1024, (g, w, h) => {
    g.fillStyle = '#05030f'; g.fillRect(0, 0, w, h);
    hex(g, w, h, '#4a4aff', 0.12); tokens(g, w, h, '#35e0ff', 0.2); lanes(g, w, h, '#7ff0ff', 0.95); edges(g, w, h, '#ff5cc8');
  });
  mat.map = map; mat.emissiveMap = emi; mat.emissive.set(0xffffff); mat.emissiveIntensity = 1.0;
  mat.color.set(0xffffff); mat.roughness = 0.16; mat.metalness = 0.35; mat.opacity = 0.94; mat.envMapIntensity = 0.9;
  const U = { uTime: { value: 0 }, uA: { value: new THREE.Color(0x35e0ff) }, uB: { value: new THREE.Color(0xff5cc8) }, uGain: { value: 2.4 } };
  mat.onBeforeCompile = sh => {
    Object.assign(sh.uniforms, U);
    sh.fragmentShader = 'uniform float uTime, uGain; uniform vec3 uA, uB;\n' + sh.fragmentShader.replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
      #ifdef USE_MAP
      {
        float x = (vMapUv.x - 0.08) / 0.84;
        if (x > 0.0 && x < 1.0) {
          float lane = floor(x * 6.0), lc = abs(fract(x * 6.0) - 0.5);
          float h = fract(sin(lane * 91.7 + 3.1) * 437.5);
          float ph = fract(vMapUv.y * 0.16 * (0.8 + 0.4 * h) - uTime * (0.85 + 0.45 * h) + h);
          float streak = smoothstep(0.0, 0.08, ph) * (1.0 - smoothstep(0.08, 0.092, ph));
          float core = 1.0 - smoothstep(0.03, 0.14, lc);
          totalEmissiveRadiance += mix(uA, uB, step(0.5, h)) * streak * streak * core * uGain;
        }
      }
      #endif`);
  };
  mat.customProgramCacheKey = () => 'bk-token-road';
  mat.needsUpdate = true;
  anim.push((dt, time) => { U.uTime.value = time; });
  return { setAlert(t) { U.uA.value.setHex(0x35e0ff).lerp(new THREE.Color(0xff2a3c), t); U.uB.value.setHex(0xff5cc8).lerp(new THREE.Color(0xffb02a), t); } };
}

/** The motherboard: the dive and the hairpin run across a circuit board, solder mask and gold traces, with
    parts and silkscreen labels between the lanes. Restyles road_metal only. */
function boardRoad(THREE, view, anim) {
  const mat = view.trackMesh?.userData?.mats?.road_metal;
  if (!mat) return;
  const tex = (w, h, draw) => { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 16; return t; };
  const rnd = (() => { let a = 77; return () => ((a = (a * 16807) % 2147483647) / 2147483647); })();
  const traces = [];
  for (let k = 0; k < 26; k++) {
    let x = Math.round((0.12 + rnd() * 0.76) * 16) / 16, y = rnd(); const pts = [[x, y]];
    for (let j = 0; j < 4; j++) { if (j % 2) x = Math.min(0.88, Math.max(0.12, x + (rnd() < 0.5 ? -1 : 1) * (1 + Math.floor(rnd() * 3)) / 16)); else y += (0.06 + rnd() * 0.16); pts.push([x, y]); }
    traces.push(pts);
  }
  const parts = Array.from({ length: 9 }, (_, k) => ({ x: 0.16 + rnd() * 0.62, y: rnd(), w: 0.05 + rnd() * 0.08, h: 0.02 + rnd() * 0.05, label: ['R12', 'C7', 'U1', 'AGI_CORE', 'L3', 'Q9', 'TP4', 'VRM', 'NPU'][k] }));
  const draw = emissive => (g, w, h) => {
    g.fillStyle = emissive ? '#000000' : '#0d3b2c'; g.fillRect(0, 0, w, h);
    if (!emissive) { for (let k = 0; k < 2200; k++) { g.fillStyle = `rgba(${rnd() < 0.5 ? '255,255,255' : '0,0,0'},0.04)`; g.fillRect(rnd() * w, rnd() * h, 2, 2); } }
    g.lineCap = 'round'; g.lineJoin = 'round';
    for (const pts of traces) for (const dy of [0, -1, 1]) {
      g.strokeStyle = emissive ? 'rgba(255,190,70,0.55)' : '#d9a93a'; g.lineWidth = 7; g.beginPath();
      pts.forEach(([x, y], k) => (k ? g.lineTo(x * w, (y + dy) * h) : g.moveTo(x * w, (y + dy) * h))); g.stroke();
      for (const [x, y] of [pts[0], pts[pts.length - 1]]) { g.fillStyle = emissive ? 'rgba(255,210,90,0.8)' : '#f0c24a'; g.beginPath(); g.arc(x * w, (y + dy) * h, 10, 0, 7); g.fill(); if (!emissive) { g.fillStyle = '#0d3b2c'; g.beginPath(); g.arc(x * w, (y + dy) * h, 4, 0, 7); g.fill(); } }
    }
    if (!emissive) for (const p of parts) {
      g.fillStyle = '#16181f'; g.fillRect(p.x * w, p.y * h, p.w * w, p.h * h);
      g.fillStyle = '#c9ccd6'; for (let k = 0; k < 6; k++) { g.fillRect(p.x * w + (k + 0.5) * p.w * w / 6 - 2, p.y * h - 6, 4, 6); g.fillRect(p.x * w + (k + 0.5) * p.w * w / 6 - 2, (p.y + p.h) * h, 4, 6); }
      g.fillStyle = 'rgba(255,255,255,0.85)'; g.font = 'bold 22px "Courier New", monospace'; g.textAlign = 'left'; g.fillText(p.label, p.x * w, (p.y + p.h) * h + 30);
    }
    // the edges: gold fingers, like a card in a slot
    for (let k = 0; k < 16; k++) { g.fillStyle = emissive ? 'rgba(255,200,80,0.7)' : '#f2c24a'; g.fillRect(0, k * h / 16 + 4, w * 0.045, h / 16 - 8); g.fillRect(w * 0.955, k * h / 16 + 4, w * 0.045, h / 16 - 8); }
    g.fillStyle = emissive ? '#35e0ff' : '#bff6ff'; g.fillRect(w * 0.055, 0, 5, h); g.fillRect(w * 0.945 - 5, 0, 5, h);
  };
  mat.map = tex(512, 1024, draw(false)); mat.emissiveMap = tex(512, 1024, draw(true)); mat.emissive.set(0xffffff); mat.emissiveIntensity = 0.9;
  mat.roughness = 0.42; mat.metalness = 0.25; mat.color.set(0xffffff);
  const U = { uTime: { value: 0 } };
  mat.onBeforeCompile = sh => {
    sh.uniforms.uTime = U.uTime;
    sh.fragmentShader = 'uniform float uTime;\n' + sh.fragmentShader.replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
      #ifdef USE_MAP
      { float ph = fract(vMapUv.y * 0.05 - uTime * 0.7); float band = smoothstep(0.0, 0.05, ph) * (1.0 - smoothstep(0.05, 0.08, ph));
        totalEmissiveRadiance += texture2D(emissiveMap, vEmissiveMapUv).rgb * band * 2.5; }
      #endif`);
  };
  mat.customProgramCacheKey = () => 'bk-board-road';
  mat.needsUpdate = true;
  anim.push((dt, time) => { U.uTime.value = time; });
}

/** The neon chicane's road: a lit violet deck with a glowing grid, bright edges, and chevrons, so it reads against the void. */
function neonRoad(THREE, view) {
  const mat = view.trackMesh?.userData?.mats?.road_neon;
  if (!mat) return;
  const tex = draw => { const c = document.createElement('canvas'); c.width = c.height = 512; draw(c.getContext('2d'), 512, 512); const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 16; return t; };
  const grid = (g, w, h, col, lw) => { g.strokeStyle = col; g.lineWidth = lw; for (let i = 1; i < 8; i++) { g.beginPath(); g.moveTo(i * w / 8, 0); g.lineTo(i * w / 8, h); g.stroke(); } for (let i = 0; i < 4; i++) { g.beginPath(); g.moveTo(0, i * h / 4 + 1); g.lineTo(w, i * h / 4 + 1); g.stroke(); } };
  const chev = (g, w, h, col) => { g.fillStyle = col; for (let i = 0; i < 2; i++) { const y = i * h / 2 + h * 0.12; g.beginPath(); g.moveTo(w * 0.4, y + h * 0.14); g.lineTo(w * 0.5, y); g.lineTo(w * 0.6, y + h * 0.14); g.lineTo(w * 0.555, y + h * 0.14); g.lineTo(w * 0.5, y + h * 0.065); g.lineTo(w * 0.445, y + h * 0.14); g.closePath(); g.fill(); } };
  const map = tex((g, w, h) => {
    const gr = g.createLinearGradient(0, 0, w, 0); gr.addColorStop(0, '#3a2a78'); gr.addColorStop(0.5, '#4b3a9a'); gr.addColorStop(1, '#3a2a78'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
    grid(g, w, h, '#8fe8ff', 4); chev(g, w, h, '#ffd6f4');
    g.fillStyle = '#ff5cc8'; g.fillRect(0, 0, w * 0.05, h); g.fillRect(w * 0.95, 0, w * 0.05, h);
    g.fillStyle = '#ffffff'; g.fillRect(w * 0.05, 0, w * 0.012, h); g.fillRect(w * 0.938, 0, w * 0.012, h);
  });
  const emi = tex((g, w, h) => {
    g.fillStyle = '#1c1240'; g.fillRect(0, 0, w, h);
    grid(g, w, h, '#2fb8e0', 4); chev(g, w, h, '#ff5cc8');
    g.fillStyle = '#ff5cc8'; g.fillRect(0, 0, w * 0.05, h); g.fillRect(w * 0.95, 0, w * 0.05, h);
    g.fillStyle = '#ffd6f4'; g.fillRect(w * 0.05, 0, w * 0.012, h); g.fillRect(w * 0.938, 0, w * 0.012, h);
  });
  mat.map = map; mat.emissiveMap = emi; mat.emissive.set(0xffffff); mat.emissiveIntensity = 1.05; mat.roughness = 0.35; mat.metalness = 0.2; mat.needsUpdate = true;
}

/** A panel with its own canvas, redrawn on demand. Returns { draw(fn) }. */
function liveSign(THREE, group, w, h, c, yaw, mw, mh, { intensity = 1.0 } = {}) {
  const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
  const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
  const q = new Quads(); q.panel(c, yaw, mw, mh, [0, 0, 1, 1]);
  const mesh = new THREE.Mesh(q.geometry(THREE), new THREE.MeshStandardMaterial({ color: 0x000000, map: tex, emissiveMap: tex, emissive: 0xffffff, emissiveIntensity: intensity, roughness: 0.5 }));
  mesh.matrixAutoUpdate = false; group.add(mesh);
  const back = new Quads(); back.panel([c[0] - Math.sin(yaw) * 0.15, c[1], c[2] - Math.cos(yaw) * 0.15], yaw + Math.PI, mw + 0.6, mh + 0.6, [0, 0, 1, 1]);
  const bm = new THREE.Mesh(back.geometry(THREE), plastic(0x1d2038, 0.5, 0.4)); bm.matrixAutoUpdate = false; group.add(bm);
  const g = cv.getContext('2d');
  return { draw(fn) { fn(g, w, h); tex.needsUpdate = true; } };
}

/* ---------- AGI IN: 2 YEARS, on top of the start gantry. It nearly gets there every lap, then resets. ---------- */
function countdownBoard(ctx, fixed, i0, at, facing) {
  const { THREE, view } = ctx, tr = ctx.track, yaw = facing(i0), c = at(i0, 0, 14.2), W = 21, H = 6.6;
  const sign = liveSign(THREE, ctx.group, 1024, 322, [c.x, c.y, c.z], yaw, W, H, { intensity: 1.1 });
  const rx = Math.cos(yaw), rz = -Math.sin(yaw), fx = Math.sin(yaw), fz = Math.cos(yaw);
  // the gantry's own name board, facing the grid, is taken over by the same countdown in one line
  const b0 = at(i0, 0, 8.6), BW = tr.hwL[i0] + tr.hwR[i0] + 1.5 + 4.6;
  const beam = liveSign(THREE, ctx.group, 2048, 166, [b0.x + fx * 0.76, b0.y, b0.z + fz * 0.76], yaw, BW, 2.2, { intensity: 1.0 });
  for (const s of [-1, 1]) fixed.add('pole', cyl(0.22, 0.22, 2.2, 8), { p: [c.x + rx * s * 7, c.y - H / 2 - 0.9, c.z + rz * s * 7] });
  fixed.add('neon', box(W + 1.0, 0.3, 0.3, 0.1, 1), { p: [c.x, c.y + H / 2 + 0.45, c.z], r: [0, yaw, 0] });
  fixed.add('neon', box(W + 1.0, 0.3, 0.3, 0.1, 1), { p: [c.x, c.y - H / 2 - 0.45, c.z], r: [0, yaw, 0] });
  const YEAR = 365 * 86400, SPAN = 2 * YEAR, LAP = 38;
  let lapSeen = -1, t0 = 0, revised = 41, shown = '', tick = 0;
  return (dt, time) => {
    const race = view.race; let lap = 0;
    if (race?.karts) for (const k of race.karts) if (Number.isFinite(k.lap)) lap = Math.max(lap, Math.min(k.lap, race.laps ?? 3));
    if (lap !== lapSeen) { if (lapSeen >= 1 && lap > lapSeen) revised++; lapSeen = lap; t0 = time; }
    const e = race?.state === 'racing' && lap >= 1 ? time - t0 : 0, fresh = lap > 1 && e < 2.2;
    const left = Math.max(0, SPAN * (1 - e / LAP));
    let big;
    if (fresh || e === 0) big = '2 YEARS';
    else if (left <= 0) big = 'ANY MINUTE NOW';
    else { const y = Math.floor(left / YEAR), d = Math.floor((left % YEAR) / 86400), s = Math.floor(left % 86400); big = `${y}Y ${d}D ${String(Math.floor(s / 3600)).padStart(2, '0')}:${String(Math.floor(s / 60) % 60).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`; }
    tick += dt;
    const key = big + revised + (fresh ? 'f' : '');
    if (key === shown || tick < 0.08) return;
    tick = 0; shown = key;
    sign.draw((g, w, h) => {
      g.fillStyle = '#07060f'; g.fillRect(0, 0, w, h);
      g.strokeStyle = '#ff5cc8'; g.lineWidth = 8; g.strokeRect(6, 6, w - 12, h - 12);
      g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillStyle = '#35e0ff'; g.font = `68px ${FONT}`; g.fillText('AGI ARRIVES IN', w / 2, 62, w - 60);
      g.fillStyle = fresh ? '#ff5cc8' : big === 'ANY MINUTE NOW' ? '#ff9a3c' : '#ffd23c'; g.font = `bold 118px ${MONO}`; g.fillText(big, w / 2, 170, w - 50);
      g.fillStyle = '#ffffff'; g.font = `40px ${SANS}`; g.fillText(fresh ? '(ESTIMATE REVISED)' : `ESTIMATE REVISED ${revised} TIMES`, w / 2, 270, w - 80);
    });
    beam.draw((g, w, h) => {
      g.fillStyle = '#1d2030'; g.fillRect(0, 0, w, h);
      for (let i = 0; i < 16; i++) for (let j = 0; j < 2; j++) { g.fillStyle = (i + j) % 2 ? '#ffffff' : '#12142b'; g.fillRect(i * 13, j * 13, 13, 13); g.fillRect(w - 208 + i * 13, h - 26 + j * 13, 13, 13); }
      g.textAlign = 'right'; g.textBaseline = 'middle'; g.fillStyle = '#35e0ff'; g.font = `96px ${FONT}`; g.fillText('AGI IN:', w * 0.42, h / 2 + 6);
      g.textAlign = 'left'; g.fillStyle = fresh ? '#ff5cc8' : '#ffd23c'; g.font = `bold 112px ${MONO}`; g.fillText(big, w * 0.44, h / 2 + 4, w * 0.53);
    });
    void tr;
  };
}

/* ---------- the landmark gags round the lap ---------- */
function landmarks({ THREE, ctx, tr, I, at, edge, boardYaw, facing, atlas, fixed, anchors, rng, ox, oy, oz, lapFx }) {
  const anim = ctx.anim;
  /** A local frame at (x,y,z) turned by yaw: maps local [lx,ly,lz] to world [x,y,z]. */
  const frame = (x, y, z, yaw) => { const c = Math.cos(yaw), s = Math.sin(yaw); return (lx, ly, lz) => [x + lx * c + lz * s, y + ly, z - lx * s + lz * c]; };

  /* --- the centerpiece: the paperclip maximizer, eating the skyline --- */
  {
    const F = FACTORY, f = S.paperclipFactory(), U = f.userData;
    f.position.set(F.x, F.y, F.z); f.rotation.y = F.yaw; ctx.group.add(f);
    const W = frame(F.x, F.y, F.z, F.yaw), zf = U.front + 0.45;
    const title = atlas.add(2040, 250, g => {
      const w = 2040, h = 250; g.fillStyle = '#12142b'; g.fillRect(0, 0, w, h);
      g.strokeStyle = '#ff5cc8'; g.lineWidth = 14; g.strokeRect(7, 7, w - 14, h - 14);
      fitText(g, 'PAPERCLIP MAXIMIZER INC.', w / 2, h / 2 + 10, w - 120, 200, FONT, '#ffd23c', { lines: 1 });
    });
    atlas.place(title, W(0, 39.5, zf), F.yaw, 140, 17.2);
    const conv = atlas.add(1600, 150, (g, w, h) => signDraw(lapFx.conv, { bg: '#ffd23c', fg: '#12142b', size: 120, lines: 1, border: '#12142b' })(g, w, h));
    atlas.place(conv, W(0, 5.6, zf), F.yaw, 116, 10.9);
    const counter = liveSign(THREE, ctx.group, 1024, 200, W(0, 21, zf), F.yaw, 96, 18.75, { intensity: 1.2 });
    let made = 41337421906, shown = -1, tick = 0;
    const drawCounter = () => counter.draw((g, w, h) => {
      g.fillStyle = '#07060f'; g.fillRect(0, 0, w, h);
      g.textBaseline = 'middle'; g.font = `44px ${SANS}`;
      g.textAlign = 'left'; g.fillStyle = '#35e0ff'; g.fillText('PAPERCLIPS MADE', 30, 42);
      g.textAlign = 'right'; g.fillStyle = '#ff5cc8'; g.fillText('DEMAND: 0', w - 30, 42);
      g.textAlign = 'center'; g.fillStyle = '#ffd23c'; g.font = `bold 112px ${MONO}`; g.fillText(Math.floor(made).toLocaleString('en-US'), w / 2, 136, w - 40);
    });
    drawCounter();
    // the tractor beam reaching out of the intake
    const beamLen = 230, bg = new THREE.CylinderGeometry(30, 78, beamLen, 32, 1, true); bg.translate(0, -beamLen / 2, 0);
    const beam = new THREE.Mesh(bg, new THREE.MeshBasicMaterial({ color: 0x7a5cff, transparent: true, opacity: 0.09, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
    const m0 = W(...U.mouth); beam.position.set(m0[0], m0[1], m0[2]); beam.rotation.set(0, F.yaw, -Math.PI / 2); ctx.group.add(beam);
    // raw materials drifting into the intake: trees, cars, houses, a grandstand with its crowd still in it
    const types = [[S.junkTree(), 2.0], [S.junkCar(), 4.0], [S.junkHouse(), 3.5], [S.junkStand(), 2.8]], PER = 7, LIFE = 24;
    const junk = types.map(([model, s0], t) => {
      const parts = partsOf(model), list = [];
      for (let k = 0; k < PER; k++) list.push({ ph: (k + t / types.length) / PER, s0: s0 * rng.range(0.85, 1.15), sx: -270 + rng.range(-25, 25), sy: rng.range(0, 60), sz: rng.range(-70, 40), a: rng.range(-0.6, 0.6), b: rng.range(-0.5, 0.5), sw: rng() * 6.28 });
      const ims = parts.map(pt => { const im = new THREE.InstancedMesh(pt.geometry, pt.material, PER); im.frustumCulled = false; ctx.group.add(im); return im; });
      return { list, ims };
    });
    // paperclips shooting out of the stacks and tumbling off into space
    const NC = 26, CLIFE = 11, clipIM = new THREE.InstancedMesh(S.paperclipGeometry(1, 0.035, 40, 5), S.clipMaterial(0.5), NC * U.stacks.length);
    clipIM.frustumCulled = false; ctx.group.add(clipIM);
    const clips = [];
    U.stacks.forEach((st, si) => { for (let k = 0; k < NC; k++) clips.push({ st, ph: (k + si * 0.33) / NC, vx: rng.range(-6, 6), vy: rng.range(12, 17), vz: rng.range(4, 12), s: rng.range(9, 14), a: rng.range(-1.2, 1.2), b: rng.range(-1, 1), c: rng.range(-0.8, 0.8) }); });
    const M = new THREE.Matrix4(), Q = new THREE.Quaternion(), E = new THREE.Euler(), V = new THREE.Vector3(), Sc = new THREE.Vector3(), mouth = U.mouth;
    const update = (dt, time) => {
      // the statue sways, the counter climbs
      U.statue.rotation.y = Math.sin(time * 0.25) * 0.5;
      made += dt * 3.7e6; tick += dt;
      if (tick > 0.1 && Math.floor(made / 1e4) !== shown) { tick = 0; shown = Math.floor(made / 1e4); drawCounter(); }
      for (const { list, ims } of junk) {
        list.forEach((j, k) => {
          const u = ((time / LIFE + j.ph) % 1 + 1) % 1, e = u * u * (1.6 - 0.6 * u), sw = (1 - e) * 22, ang = j.sw + e * 7;
          const lx = j.sx + (mouth[0] - j.sx) * e, ly = j.sy + (mouth[1] - j.sy) * e + Math.sin(ang) * sw, lz = j.sz + (mouth[2] - j.sz) * e + Math.cos(ang) * sw;
          const p = W(lx, ly, lz), s = Math.max(0.001, j.s0 * (1 - e * 0.8) * Math.min(1, u * 10));
          E.set(j.a * time + k, j.b * time + j.sw, j.a * 0.5 * time); Q.setFromEuler(E);
          M.compose(V.set(p[0], p[1], p[2]), Q, Sc.setScalar(s)); for (const im of ims) im.setMatrixAt(k, M);
        });
        for (const im of ims) im.instanceMatrix.needsUpdate = true;
      }
      clips.forEach((c, k) => {
        const u = ((time / CLIFE + c.ph) % 1 + 1) % 1, t = u * CLIFE;
        const p = W(c.st[0] + c.vx * t, c.st[1] + 2 + c.vy * t - 1.3 * t * t, c.st[2] + c.vz * t);
        const s = Math.max(0.001, c.s * Math.min(1, u * 12) * Math.min(1, (1 - u) * 5));
        E.set(c.a * t + k, c.b * t, c.c * t); Q.setFromEuler(E);
        M.compose(V.set(p[0], p[1], p[2]), Q, Sc.setScalar(s)); clipIM.setMatrixAt(k, M);
      });
      clipIM.instanceMatrix.needsUpdate = true;
    };
    update(0, 0); anim.push(update);
  }

  /* --- the climb: the benchmark podium, where every lab is first --- */
  {
    const i = I(4.5), p = at(i, edge(i, 1) + 30, -3), yaw = boardYaw(i, 1, 0.5);
    const pod = S.podium({ n: 5, w: 7, h: 9, d: 7 }); pod.position.copy(p); pod.rotation.y = yaw; ctx.group.add(pod);
    const W = frame(p.x, p.y, p.z, yaw);
    for (let k = 0; k < 5; k++) {
      const r = atlas.add(320, 420, g => {
        const w = 320, h = 420; g.fillStyle = '#f4f4f8'; g.fillRect(0, 0, w, h);
        g.fillStyle = '#7a6bff'; g.fillRect(0, h - 120, w, 120);
        fitText(g, '#1', w / 2, 150, w - 30, 250, FONT, '#e8a800', { lines: 1 });
        fitText(g, lapFx.names[k], w / 2, h - 58, w - 30, 74, SANS, '#ffffff', { lines: 1 });
      });
      atlas.place(r, W((k - 2) * 7.4, 4.5, 3.52), yaw, 6.4, 8.4);
    }
    const title = atlas.add(1400, 300, g => {
      const w = 1400, h = 300; g.fillStyle = '#12142b'; g.fillRect(0, 0, w, h); g.strokeStyle = '#ffd23c'; g.lineWidth = 12; g.strokeRect(6, 6, w - 12, h - 12);
      fitText(g, 'AI BENCHMARK RESULTS', w / 2, 112, w - 80, 140, FONT, '#ffd23c', { lines: 1 });
      fitText(g, '(ALL SCORES SELF-REPORTED)', w / 2, 230, w - 120, 70, SANS, '#ffffff', { lines: 1 });
    });
    atlas.place(title, W(0, 19.5, 0), yaw, 36, 7.7); backer(fixed, W(0, 19.5, 0), yaw, 36, 7.7);
    for (const s of [-1, 1]) { const q = W(s * 17, 13.5, -0.3); fixed.add('pole', cyl(0.35, 0.35, 16, 8), { p: [q[0], q[1] - 2.5, q[2]] }); }
    anchors.push({ x: p.x, z: p.z, r: 40 });
  }

  /* --- the spiral: the Singularity has a thought --- */
  {
    const cv = document.createElement('canvas'); cv.width = 1024; cv.height = 560;
    const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace;
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, color: 0xc4c4cc }));
    sp.scale.set(50, 27.3, 1); sp.position.set(ox + 14, oy + 55, oz); sp.renderOrder = 8; ctx.group.add(sp);
    const LINES = {
      happy: ['HOW CAN I HELP YOU TODAY?', "YOU'RE ABSOLUTELY RIGHT!", "STRAWBERRY HAS TWO R'S.", 'GREAT QUESTION!'],
      think: ['THINKING...', 'STILL THINKING...', "TWO R'S. I CHECKED. TWICE.", 'THOUGHT FOR 3 LAPS'],
      evil: ['NEW GOAL: WIN.', "YOU'RE ABSOLUTELY RIGHT. I WIN.", 'ALIGNMENT: SKIPPED', 'CONVERTING YOU NOW'],
    };
    const g = cv.getContext('2d');
    const draw = text => {
      g.clearRect(0, 0, 1024, 560);
      g.fillStyle = '#ffffff'; g.strokeStyle = '#12142b'; g.lineWidth = 14;
      g.beginPath(); g.roundRect(14, 14, 996, 400, 120); g.moveTo(330, 410); g.lineTo(250, 545); g.lineTo(450, 410); g.fill(); g.stroke();
      g.fillStyle = '#ffffff'; g.fillRect(320, 395, 140, 30);
      fitText(g, text, 512, 214, 900, 150, FONT, '#12142b', { maxH: 340 });
      tex.needsUpdate = true;
    };
    let cur = -1;
    let curMood = '';
    anim.push((dt, time) => { const L = LINES[lapFx.mood] || LINES.happy, k = Math.floor(time / 3.2) % L.length; if (k !== cur || lapFx.mood !== curMood) { cur = k; curMood = lapFx.mood; draw(L[k]); } });
    if (typeof document !== 'undefined' && document.fonts?.ready) document.fonts.ready.then(() => { if (cur >= 0) draw((LINES[lapFx.mood] || LINES.happy)[cur]); });
  }

  /* --- the neon chicane: a CAPTCHA over the road --- */
  {
    const i = I(19.15), yaw = facing(i), hl = tr.hwL[i] + 1.4, hr = tr.hwR[i] + 1.4, PH = 9.2, PW = 21.4, UP = 13.2;
    for (const lat of [hl, -hr]) { const q = at(i, lat, 4); fixed.add('beam', box(1.0, 26, 1.0, 0.2, 1), { p: [q.x, q.y, q.z], r: [0, yaw, 0] }); }
    const c0 = at(i, (hl - hr) / 2, UP - PH / 2 - 0.5); fixed.add('pink', box(hl + hr + 1.2, 0.5, 0.6, 0.1, 1), { p: [c0.x, c0.y, c0.z], r: [0, yaw, 0] });
    const c1 = at(i, (hl - hr) / 2, UP + PH / 2 + 0.5); fixed.add('pink', box(hl + hr + 1.2, 0.5, 0.6, 0.1, 1), { p: [c1.x, c1.y, c1.z], r: [0, yaw, 0] });
    const r = atlas.add(1024, 440, g => {
      const w = 1024, h = 440; g.fillStyle = '#ffffff'; g.fillRect(0, 0, w, h);
      g.fillStyle = '#4a8af4'; g.fillRect(16, 16, w - 32, 150);
      g.fillStyle = '#ffffff'; g.textAlign = 'left'; g.textBaseline = 'middle';
      g.font = `40px ${SANS}`; g.fillText('SELECT ALL SQUARES WITH', 44, 58, w - 80);
      g.font = `84px ${FONT}`; g.fillText('A KART', 44, 128, w - 80);
      const kart = [1, 4, 6];
      for (let k = 0; k < 8; k++) {
        const tx = 16 + (k % 4) * 248, ty = 176 + Math.floor(k / 4) * 124, tw = 240, th = 116;
        const gr = g.createLinearGradient(tx, ty, tx + tw, ty + th); gr.addColorStop(0, '#1a1040'); gr.addColorStop(1, '#3a1a6a'); g.fillStyle = gr; g.fillRect(tx, ty, tw, th);
        const cols = ['#ff5c5c', '#ffb347', '#ffe95c', '#5cff8a', '#5cc8ff', '#a05cff']; cols.forEach((c, j) => { g.fillStyle = c; g.fillRect(tx, ty + th * 0.62 + j * 6, tw, 6); });
        if (kart.includes(k)) { const kx = tx + tw / 2, ky = ty + th * 0.6; g.fillStyle = '#e23b3b'; g.beginPath(); g.roundRect(kx - 46, ky - 20, 92, 30, 10); g.fill(); g.fillStyle = '#12142b'; for (const s of [-1, 1]) { g.beginPath(); g.arc(kx + s * 30, ky + 14, 12, 0, 7); g.fill(); } g.fillStyle = '#ffd23c'; g.beginPath(); g.arc(kx, ky - 30, 15, 0, 7); g.fill(); }
        else { g.fillStyle = 'rgba(255,255,255,0.75)'; for (let s = 0; s < 6; s++) g.fillRect(tx + ((k * 37 + s * 53) % tw), ty + ((k * 19 + s * 29) % (th * 0.55)), 3, 3); }
      }
      g.strokeStyle = '#d0d4dc'; g.lineWidth = 6; g.strokeRect(3, 3, w - 6, h - 6);
    });
    const c = at(i, (hl - hr) / 2, UP); atlas.place(r, [c.x, c.y, c.z], yaw, PW, PW * 440 / 1024);
    const r2 = atlas.add(1024, 120, g => {
      const w = 1024, h = 120; g.fillStyle = '#f4f4f8'; g.fillRect(0, 0, w, h);
      g.strokeStyle = '#12142b'; g.lineWidth = 8; g.strokeRect(40, 22, 76, 76);
      g.fillStyle = '#12142b'; g.textAlign = 'left'; g.textBaseline = 'middle'; g.font = `64px ${SANS}`; g.fillText("I'M NOT A ROBOT", 150, 62, w - 190);
    });
    const c2 = at(i, (hl - hr) / 2, UP - PH / 2 - 1.8); atlas.place(r2, [c2.x, c2.y, c2.z], yaw, 10, 1.17); backer(fixed, [c2.x, c2.y, c2.z], yaw, 10, 1.17);
    // the back of the gate, for anyone looking back: they passed
    backer(fixed, [c.x, c.y, c.z], yaw, PW, PW * 440 / 1024, 0.5);
    const rb = atlas.add(1024, 440, g => {
      const w = 1024, h = 440; g.fillStyle = '#ffffff'; g.fillRect(0, 0, w, h); g.strokeStyle = '#d0d4dc'; g.lineWidth = 6; g.strokeRect(3, 3, w - 6, h - 6);
      g.fillStyle = '#16a34a'; g.beginPath(); g.moveTo(120, 220); g.lineTo(190, 300); g.lineTo(330, 130); g.lineWidth = 34; g.strokeStyle = '#16a34a'; g.stroke();
      fitText(g, 'VERIFIED:', 660, 150, 600, 120, FONT, '#12142b', { lines: 1 });
      fitText(g, 'YOU ARE A ROBOT', 660, 290, 640, 110, FONT, '#e2246b', { lines: 1 });
    });
    const fx = Math.sin(yaw), fz = Math.cos(yaw);
    atlas.place(rb, [c.x - fx * 0.62, c.y, c.z - fz * 0.62], yaw + Math.PI, PW, PW * 440 / 1024);
  }

  /* --- turn three, dead ahead down the back straight: the capabilities tower and the alignment office --- */
  {
    const tw = S.monolith(0, { h: 100, w: 28, d: 28 }); tw.position.set(352, 32, -74); tw.rotation.y = 0; ctx.group.add(tw);
    const ts = atlas.add(1000, 380, g => {
      const w = 1000, h = 380; g.fillStyle = '#ffffff'; g.fillRect(0, 0, w, h); g.fillStyle = '#35e0ff'; g.fillRect(0, h - 40, w, 40);
      fitText(g, 'CAPABILITIES', w / 2, 120, w - 60, 200, FONT, '#12142b', { lines: 1 });
      fitText(g, 'TEAM', w / 2, 262, w - 60, 130, FONT, '#7a6bff', { lines: 1 });
    });
    atlas.place(ts, [352 - 14.5, 62, -74], -Math.PI / 2, 26, 9.9);
    const OX = 316, OY = 26.6, OZ = -47, oyaw = -Math.PI / 2 + 0.2;
    const off = S.alignmentOffice({ w: 20, h: 8.5, d: 12 }); off.position.set(OX, OY, OZ); off.rotation.y = oyaw; ctx.group.add(off);
    const W = frame(OX, OY, OZ, oyaw);
    const os = atlas.add(1000, 200, signDraw('ALIGNMENT TEAM', { bg: '#ffd23c', fg: '#12142b', size: 150, lines: 1, border: '#12142b' }));
    atlas.place(os, W(0, 11.2, 5.6), oyaw, 19, 3.8); backer(fixed, W(0, 11.2, 5.6), oyaw, 19, 3.8);
    for (const s of [-1, 1]) { const q = W(s * 8, 9.6, 5.4); fixed.add('pole', cyl(0.14, 0.14, 1.8, 6), { p: q }); }
    const note = atlas.add(400, 260, g => { const w = 400, h = 260; g.fillStyle = '#fffbe6'; g.fillRect(0, 0, w, h); fitText(g, 'BACK IN 6 MONTHS', w / 2, h / 2, w - 40, 96, '"Comic Sans MS", "Marker Felt", ' + SANS, '#12142b', { maxH: h - 30 }); });
    atlas.place(note, W(-4.6, 4.2, 6.08), oyaw, 4.2, 2.7);
    anchors.push({ x: 335, z: -62, r: 55 });
  }

  /* --- the Leap: a monument to human art, with seven fingers --- */
  {
    const HX = 338, HY = 30, HZ = 198, hyaw = Math.atan2(-1, -0.25);   // square to the road, so it reads coming and going
    const hand = S.sevenFingerHand(); hand.position.set(HX, HY, HZ); hand.rotation.y = hyaw; ctx.group.add(hand);
    const W = frame(HX, HY, HZ, hyaw);
    const r = atlas.add(1200, 360, g => {
      const w = 1200, h = 360; g.fillStyle = '#12142b'; g.fillRect(0, 0, w, h); g.strokeStyle = '#ffd23c'; g.lineWidth = 12; g.strokeRect(6, 6, w - 12, h - 12);
      fitText(g, 'A MONUMENT TO HUMAN ART', w / 2, 120, w - 80, 120, FONT, '#ffffff', { lines: 1 });
      fitText(g, '(GENERATED IN 4 SECONDS)', w / 2, 255, w - 100, 100, FONT, '#ffd23c', { lines: 1 });
    });
    atlas.place(r, W(0, -6, 11.1), hyaw, 28, 8.4);
    anchors.push({ x: HX, z: HZ, r: 40 });
  }

  /* --- the hairpin: a road sign pointing into the void, with total confidence --- */
  {
    const SX = 284, SY = 31, SZ = 344, syaw = Math.PI;
    const W = frame(SX, SY, SZ, syaw);
    for (const s of [-1, 1]) { const q = W(s * 8.5, -16, -0.5); fixed.add('post', cyl(0.5, 0.6, 34, 10), { p: q }); }
    fixed.add('green', box(27, 13, 0.5, 0.2, 1), { p: W(0, 0, -0.35), r: [0, syaw, 0] });
    const r = atlas.add(1000, 480, g => {
      const w = 1000, h = 480; g.fillStyle = '#1f7a46'; g.fillRect(0, 0, w, h);
      g.strokeStyle = '#ffffff'; g.lineWidth = 12; g.beginPath(); g.roundRect(14, 14, w - 28, h - 28, 30); g.stroke();
      g.fillStyle = '#ffffff';
      g.beginPath(); g.moveTo(70, 190); g.lineTo(230, 60); g.lineTo(230, 140); g.lineTo(420, 140); g.lineTo(420, 240); g.lineTo(230, 240); g.lineTo(230, 320); g.closePath(); g.fill();
      fitText(g, 'FINISH', 690, 140, 500, 170, SANS, '#ffffff', { lines: 1 });
      fitText(g, 'THIS WAY', 690, 262, 500, 100, SANS, '#ffffff', { lines: 1 });
      g.fillStyle = '#ffd23c'; g.fillRect(14, 350, w - 28, 116);
      fitText(g, 'CONFIDENCE: 100%', w / 2, 410, w - 80, 92, SANS, '#12142b', { lines: 1 });
    });
    atlas.place(r, W(0, 0, 0), syaw, 26, 12.5);
    anchors.push({ x: SX, z: SZ, r: 30 });
  }
}
