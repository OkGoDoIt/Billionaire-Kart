/* Saved data survives anything stored (#351): the save is read field by field, so a damaged, old, or hand-made
   save loads with defaults where it does not fit, and every writer (recordRace, recordCup, the menus, the driving
   guide, the online name) works on it afterwards. The #moved= import from the old address (src/moved.js) is all or
   nothing: a damaged fragment writes nothing, and a good one merges records without trusting their shapes.
   Run: node tools/save-check.mjs (fast, no browser). Exits non-zero on any failure. */
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

const store = new Map();
globalThis.localStorage = { getItem: k => (store.has(k) ? store.get(k) : null), setItem: (k, v) => store.set(k, String(v)), removeItem: k => store.delete(k), key: i => [...store.keys()][i] ?? null, get length() { return store.size; } };
const { Save, cleanSave } = await import('../src/core/save.js');
const { CLASSES } = await import('../src/race/kart.js');
const KEY = 'billionaire-kart-v2';

let fails = 0;
const ok = (cond, msg) => { if (!cond) { fails++; console.error(`FAIL ${msg}`); } else console.log(`ok   ${msg}`); };
const isObj = v => v !== null && typeof v === 'object' && !Array.isArray(v);
const count = v => Number.isInteger(v) && v >= 0;

/** Everything the game later assumes about a loaded save. Returns the first broken assumption, or ''. */
function shapeProblem(d) {
  if (!isObj(d)) return 'not an object';
  const S = d.settings, L = d.last;
  if (!isObj(S)) return 'settings';
  for (const k of ['music', 'sfx']) if (!(Number.isFinite(S[k]) && S[k] >= 0 && S[k] <= 1)) return 'settings.' + k;
  for (const k of ['shake', 'autoGo', 'tilt', 'autoTrick', 'flickTrick', 'motionAsked', 'smartSteer', 'hudMap', 'pausePortrait']) if (typeof S[k] !== 'boolean') return 'settings.' + k;
  if (!['auto', 'low', 'medium', 'high', 'ultra'].includes(S.quality)) return 'settings.quality';
  if (!['both', 'stick', 'dpad'].includes(S.padSteer)) return 'settings.padSteer';
  if (S.padBinds !== null && !isObj(S.padBinds)) return 'settings.padBinds';
  if (!isObj(L) || !Array.isArray(L.racer) || L.racer.length !== 4 || !L.racer.every(r => typeof r === 'string')) return 'last.racer';
  if (!CLASSES[L.cc] || !CLASSES[L.trialCc]) return 'last.cc';
  if (!['easy', 'normal', 'hard'].includes(L.level)) return 'last.level';
  if (typeof L.cup !== 'string' || typeof L.track !== 'string') return 'last.cup/track';
  if (!isObj(d.stats) || !['races', 'wins', 'coins', 'hitsGiven', 'hitsTaken'].every(k => count(d.stats[k]))) return 'stats';
  if (!isObj(d.best) || !Object.values(d.best).every(b => isObj(b) && (b.race === undefined || (Number.isFinite(b.race) && b.race > 0)) && (b.lap === undefined || (Number.isFinite(b.lap) && b.lap > 0)))) return 'best';
  if (!isObj(d.trophies) || !Object.values(d.trophies).every(t => isObj(t) && Number.isInteger(t.rank) && t.rank >= 1 && count(t.points) && count(t.stars) && t.stars <= 3)) return 'trophies';
  if (!isObj(d.drivingGuide) || !Object.values(d.drivingGuide).every(p => isObj(p) && Object.values(p).every(l => isObj(l) && typeof l.binding === 'string' && count(l.uses) && count(l.shows)))) return 'drivingGuide';
  if (d.online !== undefined && !(isObj(d.online) && typeof d.online.name === 'string')) return 'online';
  return '';
}

/** Every writer the game has, as it calls them. Throws if any of them would. */
function writeAll(save) {
  save.recordRace('silicon-valley', 150, 83.2, 27.1, 'elon', true);
  save.recordRace('silicon-valley', 'tt:150', 81.9, 26.4, 'sam', false);
  save.recordRace('davos', 100, Infinity, NaN, 'zuck', false);                     // a race with no finish time
  save.recordCup('seed', 150, 1, 60, 3);
  save.set('music', 0.4);
  const d = save.data, S = save.settings;
  S.music = Math.round(Math.min(1, Math.max(0, S.music + 0.1)) * 100) / 100;         // the Options slider
  d.last.racer[0] = 'bezos'; d.last.cc = 200; d.last.level = 'hard'; d.last.cup = 'seed'; d.last.track = 'davos'; d.last.trialCc = 50;
  const st = d.stats; st.coins += 7; st.hitsGiven += 2; st.hitsTaken += 1;        // App#_finishRace
  const profile = d.drivingGuide.kb ||= {};                                        // DrivingGuide#lesson / #learned
  if (profile.drift?.binding !== 'Space') profile.drift = { binding: 'Space', uses: 0, shows: 0 };
  profile.drift.uses++; profile.drift.shows++;
  d.online = { ...(d.online || {}), name: 'Pat' };                                // Online#saveName
  save.write();
  return [save.bestFor('silicon-valley', 150), save.trophy('seed', 150)];
}

const huge = 'x'.repeat(200000);
const SHAPES = {
  'nothing stored': null,
  'not JSON': '{"settings": {',
  'null': 'null', 'a number': '42', 'a string': '"x"', 'an array': '[1,2,3]', 'true': 'true',
  'stats: null': { stats: null }, 'stats: "x"': { stats: 'x' }, 'stats: []': { stats: [] },
  'stats with bad numbers': { stats: { races: 'many', wins: -4, coins: 1e400, hitsGiven: null, hitsTaken: [3] } },
  'every section null': { settings: null, last: null, trophies: null, best: null, stats: null, drivingGuide: null, online: null },
  'every section a string': { settings: 'x', last: 'x', trophies: 'x', best: 'x', stats: 'x', drivingGuide: 'x', online: 'x' },
  'every section an array': { settings: [], last: [], trophies: [], best: [], stats: [], drivingGuide: [], online: [] },
  'settings of the wrong types': { settings: { music: 'loud', sfx: 7, quality: huge, shake: 'yes', tilt: 1, padSteer: 'feet', padBinds: 'A', keyBinds: [] } },
  'last of the wrong types': { last: { racer: 'elon', cc: 999, trialCc: '150', level: 'impossible', cup: 4, track: huge } },
  'last.racer too short and mixed': { last: { racer: ['sam', 7, null] } },
  'best entries of the wrong shapes': { best: { 'silicon-valley:150': 'fast', 'davos:100': { race: -3, lap: 'x', racer: 9 }, 'a:1': null, 'b:2': [1], [huge]: { race: 50 } } },
  'trophies of the wrong shapes': { trophies: { 'seed:150': { rank: 0 }, 'x:1': { rank: 'first' }, 'y:2': 'gold', 'z:3': { rank: 2, points: 'lots', stars: 99 } } },
  'drivingGuide of the wrong shapes': { drivingGuide: { kb: 5, pad0xbox: { drift: 'Space', item: { binding: 9 } }, kb1: [] } },
  'online.name too long': { online: { name: huge } },
  'extra keys everywhere': { zzz: 1, settings: { zzz: { deep: 1 } }, stats: { zzz: 5, races: 3 }, last: { zzz: [] } },
  'an old save (v1 shape, no new sections)': { settings: { music: 0.5 }, best: { 'silicon-valley:tt': { race: 90.5, lap: 30.1, racer: 'elon' } }, stats: { races: 12, wins: 3 } },
  'a prototype-polluting save': JSON.parse('{"__proto__": {"polluted": 1}, "best": {"__proto__": {"race": 1}}, "stats": {"__proto__": {"races": 1}}, "settings": {"__proto__": {"x": 1}}}'),
};

for (const [name, raw] of Object.entries(SHAPES)) {
  store.clear();
  if (raw !== null) store.set(KEY, typeof raw === 'string' ? raw : JSON.stringify(raw));
  let save, problem = '', results;
  try { save = new Save(); problem = shapeProblem(save.data); } catch (e) { problem = 'load threw ' + e.message; }
  ok(!problem, `${name}: loads to a usable save${problem ? ` (${problem})` : ''}`);
  if (!save) continue;
  try { results = writeAll(save); problem = shapeProblem(JSON.parse(store.get(KEY))); } catch (e) { problem = 'a writer threw ' + e.message; }
  ok(!problem, `${name}: every writer works and the result stays usable${problem ? ` (${problem})` : ''}`);
  ok(results?.[0]?.race === 83.2 && results?.[1]?.rank === 1, `${name}: records written and read back`);
  ok(({}).polluted === undefined && ({}).race === undefined && ({}).races === undefined && ({}).x === undefined, `${name}: nothing leaks onto every object`);
}

/* good data is kept as it was */
const good = { settings: { music: 0.3, sfx: 0, quality: 'low', shake: false, padSteer: 'dpad', padBinds: { accelerate: [7] }, keyBinds: { kb: { gas: ['KeyW'] } } }, last: { racer: ['sam', 'zuck', 'elon', 'bill'], cc: 200, trialCc: 50, level: 'hard', cup: 'big-tech', track: 'davos' },
  best: { 'davos:200': { race: 95.25, lap: 30.5, racer: 'sam' }, 'davos:tt:50': { race: 120.75, lap: 39.5, racer: 'sam' } }, trophies: { 'seed:100': { rank: 2, points: 44, stars: 0 } },
  stats: { races: 40, wins: 9, coins: 812, hitsGiven: 77, hitsTaken: 66 }, drivingGuide: { kb: { drift: { binding: 'Space', uses: 3, shows: 2 } } }, online: { name: 'Pat' } };
const canon = v => JSON.stringify(v, (k, x) => (isObj(x) ? Object.fromEntries(Object.entries(x).sort(([a], [b]) => (a < b ? -1 : 1))) : x));
ok(canon(cleanSave(good)) === canon({ ...good, settings: { ...cleanSave(null).settings, ...good.settings } }), 'a healthy save loads unchanged');

/* ---------- the #moved= import (src/moved.js) ---------- */
const MOVED = readFileSync(new URL('../src/moved.js', import.meta.url), 'utf8');
const pack = obj => Buffer.from(JSON.stringify(obj), 'utf8').toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
/** Opens the new address with this fragment over this storage; returns the storage afterwards. */
function arrive(fragment, existing = {}) {
  store.clear(); for (const [k, v] of Object.entries(existing)) store.set(k, v);
  const location = { hostname: 'billionaire-kart.okgodoit.com', hash: '#moved=' + fragment, search: '', pathname: '/' };
  let threw = null;
  try {
    runInNewContext(MOVED, { location, localStorage, history: { replaceState: () => { location.hash = ''; } }, atob: s => Buffer.from(s, 'base64').toString('binary'), btoa: s => Buffer.from(s, 'binary').toString('base64'),
      escape, unescape, fetch: () => Promise.reject(new Error('offline')), JSON, Object, Array, Error, isFinite, Math });
  } catch (e) { threw = e; }
  ok(!threw, `moved: ${fragment.slice(0, 24)}… runs without throwing${threw ? ` (${threw.message})` : ''}`);
  ok(location.hash === '', 'moved: the address bar is tidied');
  return Object.fromEntries(store);
}
const mainTheirs = JSON.stringify({ best: { 'davos:150': { race: 80, lap: 25, racer: 'elon' } }, trophies: { 'seed:150': { rank: 1, points: 60, stars: 3 } }, stats: { races: 50, wins: 20 } });
const ghost = JSON.stringify({ racer: 'elon', step: 0.1, time: 80, d: [1, 2, 3] });

let out = arrive(pack({ [KEY]: mainTheirs, [KEY + ':ghost:davos:150']: ghost }));
ok(out[KEY] === mainTheirs && out[KEY + ':ghost:davos:150'] === ghost, 'moved: a good save arrives whole on an empty address');

const before = { [KEY]: JSON.stringify({ settings: { music: 0.2 }, best: { 'davos:150': { race: 85 } }, stats: { races: 60, wins: 'x' } }) };
out = arrive(pack({ [KEY]: mainTheirs, [KEY + ':ghost:davos:150']: '{"cut off' }), before);
ok(JSON.stringify(out) === JSON.stringify(before), 'moved: one damaged entry writes nothing at all');

out = arrive(pack({ [KEY]: mainTheirs }), before);
const merged = JSON.parse(out[KEY]);
ok(merged.settings.music === 0.2 && merged.best['davos:150'].race === 80 && merged.stats.races === 60 && merged.stats.wins === 20 && merged.trophies['seed:150'].rank === 1, 'moved: progress on both addresses keeps these settings and the better of each record');

out = arrive(pack({ [KEY]: JSON.stringify({ best: 'x', trophies: [1], stats: null }) }), { [KEY]: '"not a save"' });
ok(isObj(JSON.parse(out[KEY])), 'moved: an unreadable save here is replaced by the one that came');
ok(!shapeProblem(new Save().data), 'moved: and the game loads it to a usable save');

out = arrive(pack({ [KEY]: '{"__proto__":{"race":1},"best":{"__proto__":{"race":1}},"stats":{"__proto__":5}}' }), before);
ok(({}).race === undefined, 'moved: a prototype-polluting save leaks onto nothing');

for (const junk of ['!!!not-base64', pack('just a string'), pack([1, 2]), pack(null), pack({ [KEY]: 5 }), pack({ [KEY]: '[]' })]) {
  out = arrive(junk, before);
  ok(JSON.stringify(out) === JSON.stringify(before), `moved: junk fragment ${junk.slice(0, 16)} writes nothing`);
}

console.log(fails ? `\nsave-check: ${fails} FAILED` : '\nsave-check: ok');
process.exit(fails ? 1 : 0);
