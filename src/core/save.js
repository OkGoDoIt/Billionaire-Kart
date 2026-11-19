/* Saved data: settings, unlocks, trophies, best times. One localStorage key. */
const KEY = 'billionaire-kart-v2';
const DEFAULTS = {
  settings: { music: 0.7, sfx: 0.9, quality: 'auto', shake: true, autoGo: false, tilt: false, autoTrick: false, flickTrick: true, motionAsked: false, smartSteer: false, hudMap: true, padBinds: null, padSteer: 'both', pausePortrait: true },   // padBinds null = the shipped controller mapping (src/core/input.js); flickTrick is touch only, motionAsked = the iOS flick card has been answered
  last: { racer: ['elon', 'sam', 'zuck', 'bezos'], cc: 100, trialCc: 100, level: 'normal', cup: 'seed', track: 'silicon-valley' },
  trophies: {},      // `${cupId}:${cc}` -> { rank, points, stars }
  best: {},          // `${trackId}:${cc}` -> { race, lap, racer }
  stats: { races: 0, wins: 0, coins: 0, hitsGiven: 0, hitsTaken: 0 },
  drivingGuide: {},    // per-device successes and exposures for each control lesson
};
const clone = o => JSON.parse(JSON.stringify(o));

/* The stored save is read through these checks, section by section and field by field, so a damaged, old, or
   hand-made save (bit rot, an old version, a #moved= import from the old address) can never hand the game a shape
   it would trip on: anything that does not fit is replaced by its default, the rest is kept. Keyboard and
   controller bindings are checked in full where they are read (keyboardBindings, sanitizePadBindings). */
const CCS = [50, 100, 150, 200];                          // the engine classes (CLASSES in src/race/kart.js)
const LEVEL_IDS = ['easy', 'normal', 'hard'], QUALITIES = ['auto', 'low', 'medium', 'high', 'ultra'], PAD_STEERS = ['both', 'stick', 'dpad'];
const MAX_ID = 120, MAX_ENTRIES = 2000, MAX_TEXT = 200;
const isObj = v => v !== null && typeof v === 'object' && !Array.isArray(v);
const count = v => (Number.isFinite(v) && v > 0 ? Math.floor(v) : 0);
const time = v => (Number.isFinite(v) && v > 0 ? v : undefined);
const text = (v, max = MAX_ID) => (typeof v === 'string' && v.length <= max ? v : undefined);
const oneOf = (list, v, fallback) => (list.includes(v) ? v : fallback);
/** A stored map with short keys: each value goes through `fix`, which returns undefined to drop it. */
function table(raw, fix) {
  const out = {};
  if (!isObj(raw)) return out;
  let n = 0;
  for (const k of Object.keys(raw)) {
    if (n >= MAX_ENTRIES || k.length > MAX_ID || k === '__proto__') continue;
    const v = fix(raw[k]);
    if (v !== undefined) { out[k] = v; n++; }
  }
  return out;
}
function cleanSettings(raw) {
  const d = DEFAULTS.settings, out = clone(d), r = isObj(raw) ? raw : {};
  for (const k of Object.keys(d)) if (typeof d[k] === 'boolean' && typeof r[k] === 'boolean') out[k] = r[k];
  for (const k of ['music', 'sfx']) if (Number.isFinite(r[k])) out[k] = Math.min(1, Math.max(0, r[k]));
  out.quality = oneOf(QUALITIES, r.quality, d.quality);
  out.padSteer = oneOf(PAD_STEERS, r.padSteer, d.padSteer);
  if (isObj(r.padBinds)) out.padBinds = r.padBinds;
  if (isObj(r.keyBinds)) out.keyBinds = r.keyBinds;
  return out;
}
function cleanLast(raw) {
  const d = DEFAULTS.last, r = isObj(raw) ? raw : {}, racers = Array.isArray(r.racer) ? r.racer : [];
  return {
    racer: d.racer.map((id, i) => text(racers[i]) ?? id),
    cc: oneOf(CCS, r.cc, d.cc), trialCc: oneOf(CCS, r.trialCc, d.trialCc), level: oneOf(LEVEL_IDS, r.level, d.level),
    cup: text(r.cup) ?? d.cup, track: text(r.track) ?? d.track,
  };
}
const cleanBest = b => {
  if (!isObj(b)) return undefined;
  const out = {};
  if (time(b.race)) { out.race = b.race; if (text(b.racer)) out.racer = b.racer; }
  if (time(b.lap)) out.lap = b.lap;
  return out;
};
const cleanTrophy = t => (isObj(t) && Number.isInteger(t.rank) && t.rank >= 1 && t.rank <= 99 ? { rank: t.rank, points: count(t.points), stars: Math.min(3, count(t.stars)) } : undefined);
const cleanLesson = l => (isObj(l) && text(l.binding, MAX_TEXT) !== undefined ? { binding: l.binding, uses: count(l.uses), shows: count(l.shows) } : undefined);
/** A whole save as the game may use it, from whatever was stored (anything at all, or nothing). */
export function cleanSave(raw) {
  const r = isObj(raw) ? raw : {};
  const data = {
    settings: cleanSettings(r.settings),
    last: cleanLast(r.last),
    trophies: table(r.trophies, cleanTrophy),
    best: table(r.best, cleanBest),
    stats: Object.fromEntries(Object.keys(DEFAULTS.stats).map(k => [k, count(isObj(r.stats) ? r.stats[k] : 0)])),
    drivingGuide: table(r.drivingGuide, p => (isObj(p) ? table(p, cleanLesson) : undefined)),
  };
  const name = isObj(r.online) ? text(r.online.name, 40) : undefined;
  if (name !== undefined) data.online = { name };
  return data;
}

// Older time trials used the single 'tt' key and did not record the engine class.
export const trialKey = cc => `tt:${cc}`;

export class Save {
  constructor() {
    let raw = null;
    try { const stored = localStorage.getItem(KEY); if (stored) raw = JSON.parse(stored); } catch { /* private mode or bad data: start fresh */ }
    this.data = cleanSave(raw);
  }
  write() { try { localStorage.setItem(KEY, JSON.stringify(this.data)); } catch { /* storage unavailable */ } }
  get settings() { return this.data.settings; }
  set(key, value) { this.data.settings[key] = value; this.write(); }
  /** Record a finished race; returns { newBestRace, newBestLap }. */
  recordRace(trackId, cc, time, lap, racerId, won) {
    const k = `${trackId}:${cc}`, b = this.data.best[k] || (this.data.best[k] = {});
    const out = { newBestRace: false, newBestLap: false };
    if (isFinite(time) && (!b.race || time < b.race)) { b.race = time; b.racer = racerId; out.newBestRace = true; }
    if (isFinite(lap) && (!b.lap || lap < b.lap)) { b.lap = lap; out.newBestLap = true; }
    this.data.stats.races++; if (won) this.data.stats.wins++;
    this.write(); return out;
  }
  bestFor(trackId, cc) { return this.data.best[`${trackId}:${cc}`] || null; }
  recordCup(cupId, cc, rank, points, stars) {
    const k = `${cupId}:${cc}`, t = this.data.trophies[k];
    if (!t || rank < t.rank || (rank === t.rank && points > t.points)) this.data.trophies[k] = { rank, points, stars };
    this.write();
  }
  trophy(cupId, cc) { return this.data.trophies[`${cupId}:${cc}`] || null; }
  /* Time-trial ghosts are stored one per track and engine class under their own keys, so a full storage quota cannot break the main save. */
  ghost(trackId, cc) { try { const raw = localStorage.getItem(`${KEY}:ghost:${trackId}:${cc}`); return raw ? JSON.parse(raw) : null; } catch { return null; } }
  setGhost(trackId, cc, ghost) { try { localStorage.setItem(`${KEY}:ghost:${trackId}:${cc}`, JSON.stringify(ghost)); } catch { /* out of space: keep the old one */ } }
}
