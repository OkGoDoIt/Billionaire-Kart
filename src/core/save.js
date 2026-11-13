/* Saved data: settings, unlocks, trophies, best times. One localStorage key. */
const KEY = 'billionaire-kart-v2';
const DEFAULTS = {
  settings: { music: 0.7, sfx: 0.9, quality: 'auto', shake: true, autoGo: false, tilt: false, autoTrick: false, smartSteer: false, hudMap: true, padBinds: null, padSteer: 'both', pausePortrait: true },   // padBinds null = the shipped controller mapping (src/core/input.js)
  last: { racer: ['elon', 'sam', 'zuck', 'bezos'], cc: 100, level: 'normal', cup: 'seed', track: 'silicon-valley' },
  trophies: {},      // `${cupId}:${cc}` -> { rank, points, stars }
  best: {},          // `${trackId}:${cc}` -> { race, lap, racer }
  stats: { races: 0, wins: 0, coins: 0, hitsGiven: 0, hitsTaken: 0 },
  seenHowTo: false,
  touchRaces: 0,     // races started with touch controls: the first few name the two halves of the screen
};
const clone = o => JSON.parse(JSON.stringify(o));
function merge(base, over) { for (const k in over) { if (over[k] && typeof over[k] === 'object' && !Array.isArray(over[k]) && base[k] && typeof base[k] === 'object') merge(base[k], over[k]); else base[k] = over[k]; } return base; }

export class Save {
  constructor() {
    this.data = clone(DEFAULTS);
    try { const raw = localStorage.getItem(KEY); if (raw) merge(this.data, JSON.parse(raw)); } catch { /* private mode or bad data: start fresh */ }
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
  /* Time-trial ghosts are stored one per track under their own keys, so a full storage quota cannot break the main save. */
  ghost(trackId) { try { const raw = localStorage.getItem(`${KEY}:ghost:${trackId}`); return raw ? JSON.parse(raw) : null; } catch { return null; } }
  setGhost(trackId, ghost) { try { localStorage.setItem(`${KEY}:ghost:${trackId}`, JSON.stringify(ghost)); } catch { /* out of space: keep the old one */ } }
}
