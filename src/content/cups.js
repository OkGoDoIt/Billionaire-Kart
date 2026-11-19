/* Cups: four races each. Tracks that are not built yet are skipped at runtime. */
import { TRACK_BY_ID } from './tracks.js';

export const CUPS = [
  { id: 'seed', name: 'Seed Round Cup', blurb: 'Four friendly circuits. Burn somebody else’s money finding your feet.', color: 0x2ee6a6, emblem: 'assets/ui/cup-seed.webp', tracks: ['silicon-valley', 'bliss-hills', 'crypto-cove', 'datacenter-dash'] },
  { id: 'unicorn', name: 'Unicorn Cup', blurb: 'Faster, stranger, and valued at a billion dollars for no reason anyone can explain.', color: 0xff4d6d, emblem: 'assets/ui/cup-unicorn.webp', tracks: ['capitol-hill', 'burning-circuit', 'mars-colony', 'singularity-speedway'] },
  { id: 'offshore', name: 'Offshore Cup', blurb: 'Four races your accountant would rather not discuss.', color: 0xffc653, emblem: 'assets/ui/cup-globe.webp', tracks: ['davos', 'international-waters', 'wework-memorial', 'boring-tunnel'] },
];
export const CUP_BY_ID = Object.fromEntries(CUPS.map(c => [c.id, c]));
/** The tracks of a cup that exist in this build. */
export const cupTracks = cup => cup.tracks.filter(id => TRACK_BY_ID[id] && !id.startsWith('_'));
export const GP_POINTS = [15, 12, 10, 8, 6, 4, 2, 1];
/** A cup's standings, best first, as racer ids. Points decide; a tie goes on countback (more wins, then more
    2nds, and so on down the field), then to the better finish in the last race (then the one before it). None
    of it looks at who is human. A tie that survives all of that (racers who never raced) falls back to id order.
    totals: { id: points }; places: { id: [finish in race 1, race 2, …] }, where 0 or a gap means did not race. */
export function cupOrder(totals, places = {}) {
  const ids = Object.keys(totals), runs = id => places[id] || [];
  const tally = Object.fromEntries(ids.map(id => { const c = []; for (const p of runs(id)) if (p > 0) c[p] = (c[p] || 0) + 1; return [id, c]; }));
  const deepest = Math.max(0, ...ids.map(id => tally[id].length)), races = Math.max(0, ...ids.map(id => runs(id).length));
  return ids.sort((a, b) => {
    if (totals[a] !== totals[b]) return totals[b] - totals[a];
    for (let p = 1; p < deepest; p++) { const d = (tally[b][p] || 0) - (tally[a][p] || 0); if (d) return d; }
    for (let i = races - 1; i >= 0; i--) { const x = runs(a)[i] || Infinity, y = runs(b)[i] || Infinity; if (x !== y) return x < y ? -1 : 1; }
    return a < b ? -1 : a > b ? 1 : 0;
  });
}
/** Stars for a cup result: three for a near-perfect run. */
export function cupStars(rank, points, races) { const max = races * 15; return rank !== 1 ? 0 : points >= max ? 3 : points >= max - 6 ? 2 : 1; }
