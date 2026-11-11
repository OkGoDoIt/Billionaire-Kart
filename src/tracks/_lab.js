/* Toolkit lab: not a shipping track. A short loop that exercises every track
   feature (tunnel through a hill, bridge with void edges over water, a gap jump,
   walls, zones, and each obstacle kind) so the simulator and screenshot tools
   catch regressions. Not listed in src/content/tracks.js. */
import { fbm, smoothstep } from '../core/util.js';

export default {
  id: '_lab', name: 'Toolkit Lab', laps: 2, width: 16, sky: 'golden', offroad: 'sand',
  path: [
    { p: [0, 0, 0] }, { p: [80, 0, 0] }, { p: [150, 1, 20] }, { p: [180, 3, 80] },
    { p: [150, 8, 140] }, { p: [70, 9, 160] }, { p: [-20, 9, 160] }, { p: [-90, 5, 140] },
    { p: [-120, 1, 80] }, { p: [-90, 0, 20] },
  ],
  tunnels: [{ from: 1.3, to: 2.6, through: true }],
  bridges: [{ from: 4.2, to: 6.8 }],
  gaps: [{ from: 5.42, to: 5.62 }],
  sides: [{ from: 4.2, to: 6.8, edge: 'void' }, { from: 7.2, to: 8.4, side: 'R', edge: 'wall' }],
  zones: [{ from: 8.6, to: 9.4, surface: 'dirt' }],
  ramps: [{ at: 5.3, len: 8, lift: 1.8 }],
  boosts: [{ at: 0.4 }, { at: 4.9, w: 6 }],
  itemRows: [{ at: 0.9 }, { at: 3.4 }, { at: 7.4 }],
  coins: [{ from: 3.0, to: 3.6, n: 5, lat: [-4, 4] }, { from: 5.45, to: 5.6, n: 3, air: 3 }],
  obstacles: [
    { kind: 'patrol', model: 'bot', at: 3.1, lats: [-6, 6], speed: 5, effect: 'spin' },
    { kind: 'orbit', model: 'drone', at: 7.6, lat: 0, orbit: 4.5, speed: 7, effect: 'spin' },
    { kind: 'timed', model: 'flame', at: 8.9, lat: -3, period: 3, duty: 0.45, effect: 'spin', radius: 1.3 },
    { kind: 'timed', model: 'flame', at: 8.95, lat: 3, period: 3, duty: 0.45, phase: 1.5, effect: 'spin', radius: 1.3 },
    { kind: 'static', model: 'barrel', at: 9.5, lat: 5, effect: 'bump' },
    { kind: 'static', model: 'crate', at: 9.55, lat: -5, effect: 'bump' },
  ],
  terrain: {
    water: -1, margin: 110,
    fn(x, z) {
      let h = 2 + (fbm(x * 0.01, z * 0.01, 3, 5) - 0.5) * 10;
      h += (1 - smoothstep(20, 60, Math.hypot(x - 160, z - 30))) * 22;      // hill the tunnel bores through
      h -= (1 - smoothstep(40, 95, Math.hypot(x - 30, z - 165))) * 14;      // bay under the bridge
      return h;
    },
  },
  look: { terrain: { low: 0xd9c489, high: 0xe9d7a2, dry: 0xcdb277, rock: 0xa58f78, sand: 0xf0e0b0, dirt: 0xb08d5e }, shoulder: 0xcbb07a, rail: 0xff5fd0 },
};
