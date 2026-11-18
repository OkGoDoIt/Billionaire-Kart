/* Online rank, shown as your company's valuation. The server sends a dollar figure
   (docs/online-protocol.md, "Rating"); the names and the lines for each range live here.
   `from` is the smallest valuation in the tier, in dollars. Keep them in rising order. */
export const TIERS = [
  { id: 'idea',        from: 0,                 name: 'Idea Guy',              line: 'It’s like a kart, but for the cloud.' },
  { id: 'family',      from: 400_000,           name: 'Friends and Family',    line: 'Your dentist is in for five grand.' },
  { id: 'prerevenue',  from: 1_000_000,         name: 'Pre-Revenue',           line: 'Revenue is a distraction.' },
  { id: 'seed',        from: 3_000_000,         name: 'Seed Stage',            line: 'Somebody believed the deck.' },
  { id: 'series-a',    from: 10_000_000,        name: 'Series A',              line: 'Now with a ping-pong table.' },
  { id: 'series-b',    from: 30_000_000,        name: 'Series B',              line: 'Burning other people’s money, professionally.' },
  { id: 'growth',      from: 100_000_000,       name: 'Growth at All Costs',   line: 'Profit is for companies that have run out of ideas.' },
  { id: 'soonicorn',   from: 300_000_000,       name: 'Soonicorn',             line: 'Any quarter now.' },
  { id: 'unicorn',     from: 1_000_000_000,     name: 'Unicorn',               line: 'A billion on paper. Paper is fine.' },
  { id: 'preipo',      from: 3_000_000_000,     name: 'Pre-IPO Darling',       line: 'The bankers have started returning your calls.' },
  { id: 'decacorn',    from: 10_000_000_000,    name: 'Decacorn',              line: 'Too rich to be told no.' },
  { id: 'capture',     from: 30_000_000_000,    name: 'Regulatory Capture',    line: 'You wrote the rules. Then you broke them.' },
  { id: 'tbtf',        from: 100_000_000_000,   name: 'Too Big to Fail',       line: 'Your mistakes are the taxpayer’s problem now.' },
  { id: 'townsquare',  from: 300_000_000_000,   name: 'Owns the Town Square',  line: 'Free speech, for a monthly fee.' },
  { id: 'trillion',    from: 1_000_000_000_000, name: 'Trillionaire',          line: 'A nation-state with a logo.' },
];

/** The tier a valuation falls in, with `next` (the tier above, or null) and `progress` 0..1 toward it. */
export function tierOf(valuation) {
  const v = Math.max(0, +valuation || 0);
  let i = 0; while (i + 1 < TIERS.length && v >= TIERS[i + 1].from) i++;
  const tier = TIERS[i], next = TIERS[i + 1] || null;
  // tiers are spaced by multiples, so progress reads better on a log scale
  const lo = Math.max(tier.from, 100_000), progress = next ? Math.min(1, Math.max(0, Math.log(Math.max(v, lo) / lo) / Math.log(next.from / lo))) : 1;
  return { ...tier, index: i, next, progress };
}

/** "$840K", "$1.2M", "$3.45B", "$1.02T": three significant figures, never a long string of digits. */
export function fmtMoney(dollars) {
  const v = Math.abs(+dollars || 0);
  const units = [[1e12, 'T'], [1e9, 'B'], [1e6, 'M'], [1e3, 'K']];
  for (const [size, suffix] of units) {
    if (v >= size) { const n = v / size; return `$${n >= 100 ? Math.round(n) : n >= 10 ? n.toFixed(1) : n.toFixed(2)}${suffix}`.replace(/\.0+(?=[KMBT])|(\.\d*[1-9])0+(?=[KMBT])/, '$1'); }
  }
  return `$${Math.round(v)}`;
}

/** "+$40M" or "−$12M" for the change after a race; "±$0" when it did not move. */
export function fmtMoneyChange(delta) {
  const d = Math.round(+delta || 0);
  return d === 0 ? '±$0' : (d > 0 ? '+' : '−') + fmtMoney(Math.abs(d));
}
