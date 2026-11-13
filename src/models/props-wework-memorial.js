/* WeWork Memorial prop builders: the furniture of a dead coworking empire.
   Every builder returns a THREE.Group facing +Z (the scenery convention).
   Textures are only created inside builder functions that receive them, so
   the module imports cleanly in Node. */
import * as THREE from 'three';
import { ModelBuilder, box, cyl, sphere, torus, cone, paint, plastic, glow, MAT } from './build.js';

const GLASS = new THREE.MeshStandardMaterial({ color: 0xaad4e2, roughness: .12, metalness: .1, transparent: true, opacity: .38 });
const GLASS_DARK = new THREE.MeshStandardMaterial({ color: 0x5a7080, roughness: .2, metalness: .2, transparent: true, opacity: .5 });

/** Phone-booth pod: a glass call booth. Also the track's slalom obstacle. */
export function phoneBooth() {
  const b = new ModelBuilder();
  const frame = paint(0x30343c, { rough: .5, metal: .4 });
  b.add('frame', box(.12, 2.3, .12, .03), { p: [-.62, 1.15, -.47] });
  b.add('frame', box(.12, 2.3, .12, .03), { p: [.62, 1.15, -.47] });
  b.add('frame', box(.12, 2.3, .12, .03), { p: [-.62, 1.15, .47] });
  b.add('frame', box(.12, 2.3, .12, .03), { p: [.62, 1.15, .47] });
  b.add('frame', box(1.4, .1, 1.1, .03), { p: [0, 2.34, 0] });
  b.add('light', box(1.1, .05, .8, .02), { p: [0, 2.28, 0] });
  b.add('back', box(1.15, 2.25, .05, .02), { p: [0, 1.13, -.5] });
  b.add('glass', box(.05, 2.25, .9, .02), { p: [-.64, 1.13, 0] });
  b.add('glass', box(.05, 2.25, .9, .02), { p: [.64, 1.13, 0] });
  b.add('glass', box(1.15, 2.25, .05, .02), { p: [0, 1.13, .5] });
  b.add('bench', box(1.0, .08, .3, .02), { p: [0, .55, -.32] });
  b.add('sign', box(1.16, .3, .02, .01), { p: [0, 1.95, .53] });
  return b.build({ frame, light: glow(0xfff2cf, 1.6), back: paint(0x8f9aa4, { rough: .6 }), glass: GLASS, bench: paint(0xc8b088, { rough: .7 }), sign: glow(0xffc46b, 1.1) });
}

/** The fallen O from DO WHAT YOU LOVE: a neon letter lying in the road. */
export function neonO() {
  const b = new ModelBuilder();
  b.add('ring', torus(1.35, .17, 10, 28), { p: [0, .2, 0], r: [Math.PI / 2, 0, 0] });
  b.add('ringIn', torus(.95, .07, 8, 24), { p: [0, .2, 0], r: [Math.PI / 2, 0, 0] });
  return b.build({ ring: glow(0xff5d8f, 1.5), ringIn: glow(0xffe3ee, 1.1) });
}

/** A drift of paperwork, slightly fanned, waiting to squish. */
export function paperStack() {
  const b = new ModelBuilder();
  for (let i = 0; i < 5; i++) {
    b.add('paper', box(2.4 - i * .18, .09, 1.7 - i * .12, .01),
      { p: [(i % 2 ? .12 : -.1), .06 + i * .09, (i % 3 ? .08 : -.06)], r: [0, i * .22, 0] });
  }
  b.add('top', box(2.0, .05, 1.4, .01), { p: [0, .55, 0], r: [.16, .5, .1] });
  return b.build({ paper: plastic(0xf4f1e8, .9), top: plastic(0xffe9a8, .85) });
}

/** The cleaning bot: a dome vacuum that never got the memo. */
export function cleaningBot() {
  const b = new ModelBuilder();
  b.add('body', cyl(.62, .7, .42, 14), { p: [0, .24, 0] });
  b.add('dome', sphere(.45, 12, 8), { p: [0, .48, 0], s: [1, .55, 1] });
  b.add('eye', box(.7, .09, .06, .02), { p: [0, .38, .6] });
  b.add('brush', cyl(.55, .55, .06, 14), { p: [0, .03, 0] });
  return b.build({ body: plastic(0xe8e4da, .4), dome: plastic(0x30343c, .3), eye: glow(0x7dffce, 1.6), brush: MAT.rubber });
}

/** A 2x2 cubicle pod: partitions, desks, monitors, chairs. ~7.2 x 4.6 m.
    Built to be instanced across the cubicle field. */
export function cubicleCluster() {
  const b = new ModelBuilder();
  const part = paint(0x9aa3ab, { rough: .8 }), deskM = paint(0xd8d2c2, { rough: .6 });
  // partitions: outer cross + spine
  b.add('part', box(7.2, 1.5, .09, .02), { p: [0, .75, -2.3] });
  b.add('part', box(7.2, 1.5, .09, .02), { p: [0, .75, 2.3] });
  b.add('part', box(.09, 1.5, 4.6, .02), { p: [-3.6, .75, 0] });
  b.add('part', box(.09, 1.5, 4.6, .02), { p: [3.6, .75, 0] });
  b.add('part', box(.09, 1.5, 4.6, .02), { p: [0, .75, 0] });
  b.add('part', box(7.2, 1.5, .09, .02), { p: [0, .75, 0] });
  for (const sx of [-1.8, 1.8]) for (const sz of [-1.15, 1.15]) {
    const f = sz > 0 ? 1 : -1;
    b.add('desk', box(3.2, .07, .9, .02), { p: [sx, .74, sz + f * .62] });
    b.add('screen', box(1.1, .65, .05, .02), { p: [sx, 1.15, sz + f * .78], r: [-.12, f > 0 ? 0 : Math.PI, 0] });
    b.add('chair', box(.55, .08, .55, .03), { p: [sx, .48, sz + f * .05] });
    b.add('chair', box(.55, .6, .08, .03), { p: [sx, .85, sz - f * .18] });
    b.add('chair', cyl(.05, .05, .45, 6), { p: [sx, .22, sz + f * .05] });
    b.add('mug', cyl(.06, .05, .12, 8), { p: [sx + .9, .84, sz + f * .55] });
  }
  return b.build({ part, desk: deskM, screen: glow(0xbfe0ff, .55), chair: plastic(0x3a3f47, .7), mug: plastic(0xd84f35, .5) });
}

/** One desk with a monitor and a chair (exec row, the lone lit office). */
export function deskUnit() {
  const b = new ModelBuilder();
  b.add('desk', box(2.6, .08, 1.0, .02), { p: [0, .74, 0] });
  b.add('desk', box(.08, .72, .9, .02), { p: [-1.2, .37, 0] });
  b.add('desk', box(.08, .72, .9, .02), { p: [1.2, .37, 0] });
  b.add('screen', box(1.2, .7, .05, .02), { p: [-.4, 1.2, -.25], r: [-.1, 0, 0] });
  b.add('lamp', cyl(.04, .04, .5, 6), { p: [.95, 1.0, -.2], r: [0, 0, -.3] });
  b.add('lamp', sphere(.11, 8, 6), { p: [1.1, 1.26, -.2] });
  b.add('chair', box(.55, .08, .55, .03), { p: [0, .48, .75] });
  b.add('chair', box(.55, .62, .08, .03), { p: [0, .85, .98] });
  b.add('paper', box(.8, .04, .55, .01), { p: [.45, .8, .1], r: [0, .3, 0] });
  return b.build({ desk: paint(0xe2dccb, { rough: .55 }), screen: glow(0xcfe6ff, .7), lamp: glow(0xffd9a0, 1.5), chair: plastic(0x3a3f47, .7), paper: plastic(0xf4f1e8, .9) });
}

/** Kombucha keg: stainless, with a tap and eternal optimism. */
export function keg() {
  const b = new ModelBuilder();
  b.add('body', cyl(.55, .55, 1.5, 14), { p: [0, .75, 0] });
  b.add('rim', cyl(.57, .57, .08, 14), { p: [0, 1.42, 0] });
  b.add('tap', box(.1, .3, .1, .02), { p: [0, 1.15, .55] });
  b.add('tap', box(.3, .07, .07, .02), { p: [0, 1.32, .6] });
  b.add('drip', box(.5, .04, .3, .01), { p: [0, .06, .62] });
  return b.build({ body: MAT.steel, rim: MAT.chrome, tap: MAT.dark, drip: plastic(0x6b4a2a, .8) });
}

/** The reception desk: an oval of pale stone that has checked in no one
    since 2019. */
export function receptionDesk() {
  const b = new ModelBuilder();
  b.add('base', cyl(2.6, 2.7, 1.06, 20), { p: [0, .53, 0], s: [1.35, 1, .62] });
  b.add('top', cyl(2.75, 2.75, .09, 20), { p: [0, 1.1, 0], s: [1.35, 1, .62] });
  b.add('screen', box(1.1, .62, .05, .02), { p: [-.8, 1.5, -.3], r: [-.12, .2, 0] });
  b.add('screen', box(1.1, .62, .05, .02), { p: [.9, 1.5, -.25], r: [-.12, -.15, 0] });
  b.add('plant', cyl(.22, .17, .3, 8), { p: [2.2, 1.3, .3] });
  b.add('plant', sphere(.3, 8, 6), { p: [2.2, 1.62, .3], s: [1, .8, 1] });
  return b.build({ base: paint(0xe6e0d0, { rough: .4 }), top: paint(0xf2ecdc, { rough: .3 }), screen: glow(0xcfe6ff, .5), plant: plastic(0x3f7a3a, .8) });
}

/** The SoftBank ATM: it believes in the fund. The fund is gone. */
export function atm(screenMat) {
  const b = new ModelBuilder();
  b.add('body', box(1.1, 2.2, .7, .04), { p: [0, 1.1, 0] });
  b.add('face', box(.8, .62, .03, .01), { p: [0, 1.5, .36] });
  b.add('slot', box(.5, .06, .03, .01), { p: [0, .95, .36] });
  b.add('slot', box(.34, .22, .03, .01), { p: [0, .62, .36] });
  const g = b.build({ body: paint(0x24408f, { rough: .45 }), face: screenMat || glow(0xbfe0ff, .9), slot: MAT.dark });
  return g;
}

/** A grand piano, lid up, nobody coming back to play it. */
export function piano() {
  const b = new ModelBuilder();
  const black = paint(0x0c0c0e, { rough: .22, clear: .9 });
  b.add('body', box(1.45, .28, 2.1, .05), { p: [0, .78, 0] });
  b.add('body', cyl(.72, .72, .28, 12, ), { p: [0, .78, -1.0] });
  b.add('lid', box(1.4, .05, 2.0, .02), { p: [.18, 1.32, -.1], r: [0, 0, -.5] });
  b.add('keys', box(1.25, .05, .3, .01), { p: [0, .86, 1.12] });
  b.add('leg', cyl(.06, .05, .78, 8), { p: [-.6, .39, .85] });
  b.add('leg', cyl(.06, .05, .78, 8), { p: [.6, .39, .85] });
  b.add('leg', cyl(.06, .05, .78, 8), { p: [0, .39, -.95] });
  b.add('bench', box(1.0, .09, .34, .02), { p: [0, .5, 1.75] });
  b.add('bench', cyl(.04, .04, .46, 6), { p: [-.42, .23, 1.75] });
  b.add('bench', cyl(.04, .04, .46, 6), { p: [.42, .23, 1.75] });
  return b.build({ body: black, lid: black, keys: MAT.white, leg: black, bench: black });
}

/** The golden parachute, in a glass case, in case of bankruptcy. */
export function parachuteCase() {
  const b = new ModelBuilder();
  b.add('stand', box(1.7, .95, 1.1, .03), { p: [0, .48, 0] });
  b.add('canopy', cone(0.95, .75, 14), { p: [0, 1.62, 0] });
  for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2 + .4; b.add('line', cyl(.012, .012, .62, 4), { p: [Math.cos(a) * .42, 1.18, Math.sin(a) * .42], r: [Math.sin(a) * .6, 0, -Math.cos(a) * .6] }); }
  b.add('pack', box(.44, .34, .2, .03), { p: [0, .93, 0] });
  b.add('case', box(1.9, 1.55, 1.3, .01), { p: [0, 1.62, 0] });
  return b.build({ stand: paint(0x2a2c33, { rough: .4 }), canopy: paint(0xd9a821, { rough: .35, metal: .65 }), line: MAT.dark, pack: paint(0xb8912a, { rough: .5, metal: .4 }), case: GLASS });
}

/** A hanging banner (rod + cloth). Decorate supplies the cloth texture. */
export function hangingBanner(w, h, clothMat) {
  const b = new ModelBuilder();
  b.add('rod', cyl(.045, .045, w + .3, 8), { p: [0, 0, 0], r: [0, 0, Math.PI / 2] });
  b.add('cloth', box(w, h, .04, .01), { p: [0, -h / 2 - .05, 0] });
  return b.build({ rod: MAT.steel, cloth: clothMat });
}

/** A glass meeting room shell: floor pad, glass walls with a door gap on
    the +Z side, a solid back wall, mullions. Name signs are decorate's. */
export function meetingRoom(w, d, h = 3.4) {
  const b = new ModelBuilder();
  b.add('floor', box(w, .07, d, .01), { p: [0, .035, 0] });
  b.add('back', box(w, h, .09, .02), { p: [0, h / 2, -d / 2] });
  b.add('side', box(.07, h, d, .02), { p: [-w / 2, h / 2, 0] });
  b.add('side', box(.07, h, d, .02), { p: [w / 2, h / 2, 0] });
  b.add('glass', box(w * .34, h, .05, .01), { p: [-w * .33, h / 2, d / 2] });
  b.add('glass', box(w * .34, h, .05, .01), { p: [w * .33, h / 2, d / 2] });
  b.add('mull', box(.09, h, .09, .01), { p: [-w / 2, h / 2, d / 2] });
  b.add('mull', box(.09, h, .09, .01), { p: [w / 2, h / 2, d / 2] });
  b.add('mull', box(.09, h, .09, .01), { p: [-w * .16, h / 2, d / 2] });
  b.add('mull', box(.09, h, .09, .01), { p: [w * .16, h / 2, d / 2] });
  b.add('top', box(w, .09, d, .01), { p: [0, h + .04, 0] });
  b.add('table', box(w * .55, .07, d * .34, .02), { p: [0, .76, 0] });
  b.add('table', box(.09, .72, .09, .01), { p: [-w * .22, .37, 0] });
  b.add('table', box(.09, .72, .09, .01), { p: [w * .22, .37, 0] });
  return b.build({ floor: paint(0xb9b2a2, { rough: .7 }), back: paint(0xe9e4d8, { rough: .8 }), side: GLASS, glass: GLASS, mull: MAT.dark, top: paint(0xd8d2c2, { rough: .8 }), table: paint(0x8a6f4d, { rough: .5 }) });
}

/** Glass balustrade run: panels + brass handrail. */
export function balustrade(len) {
  const b = new ModelBuilder();
  b.add('glass', box(len, 1.02, .05, .01), { p: [0, .55, 0] });
  b.add('rail', cyl(.05, .05, len, 8), { p: [0, 1.1, 0], r: [0, 0, Math.PI / 2] });
  const n = Math.max(2, Math.round(len / 3));
  for (let i = 0; i <= n; i++) b.add('post', box(.09, 1.06, .09, .01), { p: [-len / 2 + (len * i) / n, .53, 0] });
  return b.build({ glass: GLASS, rail: paint(0xc9a227, { rough: .3, metal: .8 }), post: MAT.dark });
}

/** A short stair flight to nowhere: five steps and a stop. */
export function stairFlight(steps = 5, w = 2.6) {
  const b = new ModelBuilder();
  for (let i = 0; i < steps; i++) b.add('step', box(w, .18, .34, .01), { p: [0, .09 + i * .18, -i * .34] });
  b.add('rail', cyl(.04, .04, steps * .42, 6), { p: [-w / 2 - .05, 1.0, -steps * .17], r: [1.08, 0, 0] });
  b.add('rail', cyl(.04, .04, steps * .42, 6), { p: [w / 2 + .05, 1.0, -steps * .17], r: [1.08, 0, 0] });
  return b.build({ step: paint(0xb9bec8, { rough: .5, metal: .3 }), rail: MAT.steel });
}

/** Elevator doors, permanently out of order. */
export function elevatorDoors() {
  const b = new ModelBuilder();
  b.add('frame', box(2.5, 3.1, .18, .02), { p: [0, 1.55, 0] });
  b.add('door', box(1.08, 2.85, .06, .01), { p: [-.56, 1.43, .1] });
  b.add('door', box(1.08, 2.85, .06, .01), { p: [.56, 1.43, .1] });
  b.add('lamp', box(.5, .12, .05, .01), { p: [0, 3.0, .12] });
  return b.build({ frame: MAT.dark, door: MAT.steel, lamp: glow(0xff4444, 1.2) });
}

/** A planter with something green and unkillable. */
export function planter(len = 2.4) {
  const b = new ModelBuilder();
  b.add('box', box(len, .55, .7, .03), { p: [0, .28, 0] });
  const n = Math.max(2, Math.round(len / .8));
  for (let i = 0; i < n; i++) b.add('leaf', sphere(.34, 7, 6), { p: [-len / 2 + .4 + (len - .8) * (i / Math.max(1, n - 1)), .72, 0], s: [1, .75, 1] });
  return b.build({ box: paint(0x4a4f57, { rough: .6 }), leaf: plastic(0x3f7a3a, .85) });
}

/** A bleacher step for the feature ramp's seating side. */
export function bleacherStep(len) {
  const b = new ModelBuilder();
  b.add('step', box(len, .42, .9, .02), { p: [0, .21, 0] });
  b.add('back', box(len, .42, .18, .02), { p: [0, .62, -.36] });
  return b.build({ step: paint(0xcac2ae, { rough: .7 }), back: paint(0xbdb49c, { rough: .7 }) });
}
