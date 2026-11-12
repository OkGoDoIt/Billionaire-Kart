#!/usr/bin/env node
/* Difficulty check: put a stand-in "player" of a given ability into races against
   each rival level and report where they finish. The stand-in is an AI driver
   flagged as the human, so rubber-banding treats it exactly like a real player.
   Usage: node tools/balance.mjs [--races 6] [--track id] */
import { Track } from '../src/track/track.js';
import { Race } from '../src/race/race.js';
import { AIDriver, AI_LEVELS } from '../src/race/ai.js';
import { RACERS } from '../src/content/racers.js';
import { TRACKS } from '../src/content/tracks.js';
import { makeRng } from '../src/core/util.js';
import { takeSlot } from './slot.mjs';

await takeSlot('balance');   // two heavy jobs at a time on this machine: see slot.mjs

const args = process.argv.slice(2), opt = {};
for (let i = 0; i < args.length; i++) if (args[i].startsWith('--')) { const k = args[i].slice(2); opt[k] = args[i + 1] && !args[i + 1].startsWith('--') ? args[++i] : true; }
const races = +(opt.races || 6);
const defs = opt.track ? TRACKS.filter(t => t.id === opt.track) : TRACKS;
// stand-ins: a newcomer who never drifts and wanders, a regular, and an expert
const PLAYERS = {
  newcomer: { skill: 0.3, speed: 1, band: 0, driftChance: 0, startChance: 0, itemDelay: [2, 6], line: 0.3 },
  regular:  { skill: 0.65, speed: 1, band: 0, driftChance: 0.6, startChance: 0.4, itemDelay: [0.8, 3], line: 0.7 },
  expert:   { skill: 0.97, speed: 1, band: 0, driftChance: 1, startChance: 1, itemDelay: [0.3, 1.5], line: 1 },
};
const CASES = [[50, 'easy', 'newcomer'], [100, 'easy', 'newcomer'], [100, 'normal', 'regular'], [150, 'normal', 'regular'], [150, 'hard', 'regular'], [150, 'hard', 'expert']];
console.log(`average finishing position of the stand-in player over ${races} races per track (1 = always wins, 8 = always last)\n`);
console.log('track'.padEnd(24) + CASES.map(c => `${c[0]}cc ${c[1]}/${c[2]}`.padEnd(22)).join(''));
const totals = CASES.map(() => []);
for (const def of defs) {
  const track = new Track(def); let line = def.name.padEnd(24);
  CASES.forEach(([cc, level, who], ci) => {
    const pos = [];
    for (let r = 0; r < races; r++) {
      const rng = makeRng(900 + r * 13 + ci);
      const field = rng.shuffle(RACERS.slice()).slice(0, 8);
      const entries = field.map((racer, i) => ({ racer, player: i === 7 ? 0 : -1, level }));
      const race = new Race({ track, cc, seed: 77 + r, entries });
      const me = race.players[0];
      AI_LEVELS.__proxy = PLAYERS[who];
      const pilot = new AIDriver(me, '__proxy', makeRng(5 + r));
      let steps = 0;
      while (race.state !== 'done' && steps++ < 60 * 60 * 6) { race.step(1 / 60, [pilot.think(1 / 60)]); for (const k of race.karts) k.events.length = 0; race.events.length = 0; }
      pos.push(me.finishRank || 8);
    }
    const avg = pos.reduce((a, b) => a + b, 0) / pos.length; totals[ci].push(avg);
    line += `${avg.toFixed(1)}  (${pos.join('')})`.padEnd(22);
  });
  console.log(line);
}
console.log('\n' + 'all tracks'.padEnd(24) + totals.map(t => (t.reduce((a, b) => a + b, 0) / t.length).toFixed(1).padEnd(22)).join(''));
