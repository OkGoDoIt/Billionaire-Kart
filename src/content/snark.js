/* Headlines for the share card: the race result as a business-news headline. Each finish draws one line at
   random from its bucket. {name} is the racer, {track} the course, {place} an ordinal like "4th", {n} the field
   size, {cup} the cup, {delta} a Time Trial gap. Jokes are about startup and boardroom tropes, never claims about
   the real people. Keep each line under about 70 characters so it fits three lines on the card. */
import { ordinal } from '../core/util.js';

export const HEADLINES = {
  win: [
    '{name} takes {track}. Investors pretend they saw it coming.',
    '{name} wins {track}, announces the victory lap as a subscription',
    '{name} wins. Rivals acquired, then shut down.',
    '{name} wins {track} and calls it a humble first step',
    '{name} crosses first, immediately raises at a higher valuation',
    'Markets react to {name} winning {track}: up 400%',
    '{name} wins. Everyone else pivots to AI.',
    '{name} disrupts {track}. {track} did not ask to be disrupted.',
    '{name} wins {track}, thanks the team (the kart)',
    'Unicorn alert: {name} takes {track}',
    '{name} wins {track}. The trophy is now a platform.',
    '{name} first at {track}. Second place files a complaint.',
    'Breaking: {name} wins, posts about it for six hours',
    '{name} wins {track} without reading the terms of service',
    '{name} wins and rings the opening bell from the podium',
    '{name} wins {track}. Keynote announcing the win to follow.',
  ],
  podium: [
    '{name} finishes {place}. Calls it first among the losers.',
    '{name} takes {place} at {track}, demands a recount',
    '{name} on the podium, already blaming the algorithm',
    '{name} finishes {place}, insists it was the plan all along',
    '{name} misses the win, wins the press release',
    '{name} {place} at {track}. "Basically first," says {name}.',
    'Podium for {name}. Trophy smaller than expected.',
    '{name} settles for {place}. Terms of the settlement undisclosed.',
    '{name} finishes {place} and schedules an all-hands about it',
    '{name} {place} at {track}. Analysts call it a strong quarter.',
    '{name} takes {place}, announces plans to buy first place',
    '{name} {place}. The board is "monitoring the situation."',
  ],
  mid: [
    '{name} finishes {place}. Calls it a learning experience.',
    '{name} {place} at {track}, pivoting to Time Trial',
    '{name} finishes {place}, says the market was not ready',
    'Sources say {name} "was never really trying" at {track}',
    '{name} finishes {place}. Will ship a fix next week.',
    '{name} places {place} at {track}, plans a rebrand',
    '{name} finishes {place} and blames remote work',
    '{name} {place} at {track}. Officially "pre-revenue."',
    '{name} finishes {place} in a race rigged by Big Kart',
    '{name} comes {place} at {track}, launches a podcast about it',
    '{name} finishes {place}. Down round incoming.',
    '{name} {place} at {track}. Calls it "a rounding error."',
    '{name} finishes {place}, cites "macro headwinds"',
    '{name} finishes {place} and unveils a five-year plan',
  ],
  last: [
    '{name} finishes last. Calls it stealth mode.',
    '{name} last at {track}, raising a bridge round',
    '{name} brings up the rear and calls it long-term thinking',
    'Last place for {name}. The board is "fully supportive."',
    '{name} finishes {place} of {n}. Burn rate: impressive.',
    '{name} last at {track}, announces a strategic review',
    '{name} finishes last, insists it is a marathon, not a sprint',
    '{name} comes dead last. Layoffs announced (for the kart).',
    '{name} last at {track}. Pit crew "restructured."',
    '{name} finishes last at {track}, blames the previous CEO',
    '{name} last again. Says the kart is "a long-term bet."',
  ],
  dnf: [
    '{name} did not finish at {track}. Exit strategy unclear.',
    '{name} fails to finish, calls it "an early exit"',
    '{name} DNF at {track}. The kart has been "sunset."',
  ],
  trialBest: [
    '{name} sets a personal best at {track}. Nobody else was there.',
    'New record for {name} at {track}. The ghost is furious.',
    '{name} beats the previous record holder: {name}',
    '{name} sets a record at {track}, demands a parade',
    '{name} goes faster than ever at {track}. Competition remains theoretical.',
  ],
  trialFirst: [
    '{name} posts a time at {track}. It is a start.',
    '{name} opens the books at {track}. Now beat it.',
    '{name} sets the bar at {track}. The bar is a ghost now.',
  ],
  trialMatched: [
    '{name} ties a personal best at {track} to the millisecond. The ghost demands a recount.',
    '{name} matches own record at {track}. Flat quarter, says the board.',
    '{name} exactly repeats a personal best. Analysts call it "consistent."',
  ],
  trialSlower: [
    '{name} finishes {delta} off a personal best. The ghost sends regards.',
    '{name} chases own ghost at {track}, loses',
    '{name} {delta} slower than last time. Blames the ghost.',
    '{name} misses a personal best by {delta}, requests a do-over',
  ],
  cupWin: [
    '{name} wins the {cup}. Victory lap to be announced at a keynote.',
    '{name} takes the {cup} and rings the opening bell',
    '{name} wins the {cup}. Rivals reportedly "exploring options."',
    '{name} sweeps the {cup}. Antitrust regulators take notice.',
    '{name} wins the {cup}, announces a trophy cabinet as a service',
  ],
  cupPodium: [
    '{name} finishes {place} in the {cup}. A strong silver-adjacent showing.',
    '{name} {place} in the {cup}. Lawyers reviewing the points.',
    '{name} takes {place} in the {cup}, calls the scoring "legacy"',
  ],
  cupLoss: [
    '{name} finishes {place} in the {cup}. Restructuring begins Monday.',
    '{name} {place} in the {cup}. Calls it a pivot year.',
    '{name} ends the {cup} {place}, files a strongly worded memo',
  ],
};

/** Pick a headline. bucket is a key of HEADLINES; vars fills the placeholders. rng is a 0..1 function. */
export function headline(bucket, vars, rng = Math.random) {
  const list = HEADLINES[bucket] || HEADLINES.mid;
  const line = list[Math.floor(rng() * list.length) % list.length];
  return line.replace(/\{(\w+)\}/g, (_, k) => k === 'place' ? ordinal(vars.place) : String(vars[k] ?? ''));
}

/** Which bucket a finish belongs to. */
export function bucketFor({ mode, rank, fieldSize, estimated, trial }) {
  if (mode === 'trial') return trial === 'best' ? 'trialBest' : trial === 'first' ? 'trialFirst' : trial === 'matched' ? 'trialMatched' : 'trialSlower';
  if (mode === 'cup') return rank === 1 ? 'cupWin' : rank <= 3 ? 'cupPodium' : 'cupLoss';
  if (estimated) return 'dnf';
  if (rank === 1) return 'win';
  if (rank <= 3) return 'podium';
  if (rank >= fieldSize && fieldSize > 3) return 'last';
  return 'mid';
}

