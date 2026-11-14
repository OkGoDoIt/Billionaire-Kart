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
/** Stars for a cup result: three for a near-perfect run. */
export function cupStars(rank, points, races) { const max = races * 15; return rank !== 1 ? 0 : points >= max ? 3 : points >= max - 6 ? 2 : 1; }
