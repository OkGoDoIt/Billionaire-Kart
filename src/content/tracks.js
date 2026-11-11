/* Track registry and cups. */
import { Track } from '../track/track.js';
import siliconValley from '../tracks/silicon-valley.js';

export const TRACKS = [siliconValley];
export const TRACK_BY_ID = Object.fromEntries(TRACKS.map(t => [t.id, t]));

const built = new Map();
/** Build (once) the sampled Track for a definition id. */
export function getTrack(id) {
  if (!built.has(id)) built.set(id, new Track(TRACK_BY_ID[id]));
  return built.get(id);
}
