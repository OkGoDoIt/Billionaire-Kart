/* Track registry and cups. */
import { Track } from '../track/track.js';
import siliconValley from '../tracks/silicon-valley.js';
import blissHills from '../tracks/bliss-hills.js';
import cryptoCove from '../tracks/crypto-cove.js';
import burningCircuit from '../tracks/burning-circuit.js';
import marsColony from '../tracks/mars-colony.js';
import datacenterDash from '../tracks/datacenter-dash.js';
import capitolHill from '../tracks/capitol-hill.js';
import lab from '../tracks/_lab.js';

export const TRACKS = [siliconValley, blissHills, cryptoCove, datacenterDash, capitolHill, burningCircuit, marsColony];
// menu thumbnails are captured from the game by tools/track-thumbs.mjs
for (const t of TRACKS) t.thumb = `assets/tracks/${t.id}.webp`;
export const TRACK_BY_ID = Object.fromEntries([...TRACKS, lab].map(t => [t.id, t]));   // the lab is reachable by id for testing, but not listed

const built = new Map();
/** Build (once) the sampled Track for a definition id. */
export function getTrack(id) {
  if (!built.has(id)) built.set(id, new Track(TRACK_BY_ID[id]));
  return built.get(id);
}

/** Make a track definition loadable by id (used by ?track=<file> during development). */
export function registerTrack(def) { TRACK_BY_ID[def.id] = def; return def; }
