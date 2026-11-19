/* A friend's challenge. A shared link (/s/<id>, see ui/share.js) sends whoever opens it to /?c=<id>: the title screen
   shows what they are up against, the tap goes to racer select and then straight onto that track (or into that cup)
   at the sharer's engine class, and the results say how they did against it. Loaded on demand by the title screen. */
import { TRACK_BY_ID } from '../content/tracks.js';
import { RACER_BY_ID } from '../content/racers.js';
import { CUP_BY_ID, cupTracks } from '../content/cups.js';
import { fmtTime } from '../core/util.js';

const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;

/** Fetch a challenge from the race server. Null when it is gone, unknown, or names something this build lacks.
    A slow or failed answer is asked again a couple of times; the title shows the challenge whenever it arrives. */
export async function loadChallenge(id) {
  if (!/^[A-Za-z0-9]{10,16}$/.test(id || '')) return null;
  for (const wait of [0, 2000, 5000]) {
    if (wait) await new Promise(r => setTimeout(r, wait));
    let res;
    try { res = await fetch(`/api/shares/${id}`, { signal: AbortSignal.timeout(8000) }); } catch { continue; }
    if (res.status >= 500) continue;
    return res.ok ? readChallenge(res) : null;
  }
  return null;
}
async function readChallenge(res) {
  try {
    const c = await res.json(), racer = RACER_BY_ID[c.racer];
    if (!racer || ![50, 100, 150, 200].includes(c.cc)) return null;
    if (c.mode === 'cup') {
      const cup = CUP_BY_ID[c.cup];
      return cup && cupTracks(cup).length && Number.isInteger(c.points) ? { ...c, racer, cupDef: cup } : null;
    }
    const track = TRACK_BY_ID[c.track];
    if (!track || !['race', 'gp', 'trial'].includes(c.mode)) return null;
    return { ...c, racer, trackDef: track, time: Number.isInteger(c.timeMs) ? c.timeMs / 1000 : null };
  } catch { return null; }
}

/** What the title screen says: the target, then where. */
export function challengeLines(c) {
  if (c.mode === 'cup') return [`Beat ${plural(c.points, 'point', 'points')}`, `${c.cupDef.name} · ${c.cc}cc`];
  const where = [c.trackDef.name, c.mode === 'trial' && 'Time Trial', `${c.cc}cc`].filter(Boolean).join(' · ');
  return [c.time != null ? `Beat ${fmtTime(c.time)}` : 'Finish the race', where];
}

/** How a finished run did against the challenge: { beat, text }, or null when it was a different race. */
export function verdict(c, run) {
  if (!c || !run) return null;
  if (c.mode === 'cup') {
    if (run.cupId !== c.cup) return null;
    const d = run.points - c.points;
    return d > 0 ? { beat: true, text: `Challenge beaten by ${plural(d, 'point', 'points')}` }
      : d === 0 ? { beat: true, text: 'Tied with the challenge' }
      : { beat: false, text: `${plural(-d, 'point', 'points')} short of the challenge` };
  }
  if (run.trackId !== c.track || (run.mode === 'trial') !== (c.mode === 'trial')) return null;
  if (run.estimated) return { beat: false, text: 'The challenge still stands' };
  if (c.time == null) return { beat: true, text: 'Challenge beaten' };
  const ms = Math.round(run.time * 1000) - Math.round(c.time * 1000), gap = `${(Math.abs(ms) / 1000).toFixed(3)} s`;
  return ms < 0 ? { beat: true, text: `Challenge beaten by ${gap}` }
    : ms === 0 ? { beat: true, text: 'Dead heat with the challenge' }
    : { beat: false, text: `${gap} short of the challenge` };
}
