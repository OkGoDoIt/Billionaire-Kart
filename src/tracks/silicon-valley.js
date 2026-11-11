/* Silicon Valley Circuit: the opener. A sunny campus loop with a hill climb,
   a crest jump, and a fast run home past the grandstands. */
import { fbm, smoothstep } from '../core/util.js';

const POND = { x: -40, z: 102, r: 46 };

export default {
  id: 'silicon-valley',
  name: 'Silicon Valley Circuit',
  tagline: 'Move fast. Brake nothing.',
  laps: 3,
  width: 17,
  sky: 'day',
  offroad: 'grass',
  defaults: { edge: 'open', shoulder: 3.5, outer: 11 },
  path: [
    { p: [0, 0, 0] },            // 0 start/finish, heading +x
    { p: [95, 0, 0] },           // 1
    { p: [172, 1.5, 28], w: 19 },// 2 turn one, wide and banked
    { p: [196, 5, 104] },        // 3 climbing
    { p: [158, 10, 168] },       // 4
    { p: [84, 13.5, 150], w: 15 },// 5 esses at the top
    { p: [22, 15.5, 196], w: 15 },// 6
    { p: [-62, 15, 214] },       // 7 crest
    { p: [-142, 8.5, 176], w: 19 },// 8 downhill sweeper
    { p: [-192, 3, 104] },       // 9
    { p: [-168, 0.5, 36], w: 15 },// 10 chicane in
    { p: [-196, 0, -22], w: 15 },// 11 chicane out
    { p: [-140, 0, -52], w: 18 },// 12 final corner
    { p: [-70, 0, -8] },         // 13 back onto the straight
  ],
  sides: [
    { from: 12.3, to: 1.6, side: 'L', edge: 'wall' },   // pit wall along the grandstand side
    { from: 6.6, to: 7.9, edge: 'wall' },                // crest and jump are fenced in
    { from: 2.2, to: 3.6, side: 'R', outer: 26, shoulder: 6 }, // open meadow on the outside of the climb
    { from: 8.2, to: 9.6, side: 'L', outer: 30, shoulder: 5 }, // cut across the grass on the way down (needs a boost)
  ],
  ramps: [
    { at: 7.25, len: 9, lift: 2.1 },
  ],
  boosts: [
    { at: 0.55, lat: 0, w: 5 },
    { at: 3.2, lat: -4, w: 4.5 },
    { at: 8.9, lat: 3.5, w: 4.5 },
    { at: 12.9, lat: 0, w: 5 },
  ],
  itemRows: [{ at: 1.5 }, { at: 4.6 }, { at: 8.4 }, { at: 11.5, n: 3 }],
  coins: [
    { from: 0.2, to: 0.5, n: 4, lat: 4.5 }, { from: 2.4, to: 2.9, n: 5, lat: [6, -5] },
    { from: 5.2, to: 5.9, n: 5, lat: [-4, 4] }, { from: 7.34, to: 7.5, n: 3, lat: 0, air: 2.6 },
    { from: 9.3, to: 9.8, n: 4, lat: -5 }, { from: 12.1, to: 12.6, n: 5, lat: [-5, 2] },
  ],
  terrain: {
    cell: 3, margin: 150, blend: 30, water: -1.4,
    fn(x, z) {
      // rolling golden-state hills, a pond in the infield, and higher ground out at the rim
      let h = (fbm(x * 0.0065, z * 0.0065, 4, 7) - 0.42) * 30;
      h += (fbm(x * 0.021, z * 0.021, 3, 19) - 0.5) * 5;
      const d = Math.hypot(x - 0, z - 90);
      h += smoothstep(250, 430, d) * 34;
      const pd = Math.hypot(x - POND.x, z - POND.z);
      const pond = 1 - smoothstep(POND.r * 0.45, POND.r * 1.25, pd);
      h = Math.max(h, 1.2 + (fbm(x * 0.03, z * 0.03, 2, 3) - 0.5) * 1.5); // keep the land above the water table
      h = h * (1 - pond) + (-4.2) * pond;
      return h;
    },
  },
  look: {
    road: { base: 0x5d6373, line: 0xffffff, center: 0xffd23c },
    kerb: [0xe23b3b, 0xf7f7f2],
    shoulder: 0xd2bb86,
    terrain: { low: 0x58ad45, high: 0x8fd25a, dry: 0xc9c45e, rock: 0x9c9388, sand: 0xe9d7a2, dirt: 0xbf9f6e },
  },
  POND,
};
