/* The app shell: owns the renderer, input, saved data, and menus, and moves
   between the title's attract race, the showroom, races, and results. */
import { Gfx, detectQuality } from '../render/gfx.js';
import { Input } from '../core/input.js';
import { Save } from '../core/save.js';
import { Menus } from '../ui/menus.js';
import { Showroom } from '../render/showroom.js';
import { RaceSession } from './session.js';
import { AudioEngine } from '../audio/audio.js';
import { TRACKS, TRACK_BY_ID } from '../content/tracks.js';
import { RACERS, RACER_BY_ID } from '../content/racers.js';
import { CUPS, cupTracks, GP_POINTS, cupStars } from '../content/cups.js';
import { makeRng } from '../core/util.js';

const el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };

export class App {
  constructor(canvas, ui, { quality = null } = {}) {
    this.ui = ui; this.save = new Save();
    const q = quality || (this.save.settings.quality === 'auto' ? detectQuality() : this.save.settings.quality);
    this.gfx = new Gfx(canvas, { quality: q });
    this.input = new Input();
    this.menus = new Menus(this);
    this.audio = new AudioEngine(this.save);
    this.session = null; this.showroom = null; this.attract = false; this.flow = {}; this.gp = null; this.inputs = [];
    this.curtain = el('div', 'curtain'); document.body.appendChild(this.curtain);
    document.body.appendChild(el('div', 'rotate-hint', 'Turn your phone sideways to race'));
    this.rng = makeRng(Date.now() & 0xffff);
    this.input.onMenu = (a, d) => this.onMenu(a, d);
    this.input.onAnyInput = () => this.audio?.unlock?.();
    addEventListener('pointerdown', () => this.audio?.unlock?.(), { passive: true });
    document.addEventListener('visibilitychange', () => { if (document.hidden && this.session && !this.attract && this.session.phase === 'racing' && !this.session.paused && !this.menus.visible) this.pause(); });
    this.applySettings(true);
  }

  /* ---------- loop ---------- */
  run() {
    let last = performance.now();
    const frame = now => {
      const dt = Math.min(0.1, (now - last) / 1000); last = now;
      this.inputs = this.input.poll(dt);
      if (this.session) this.session.frame(dt);
      else if (this.showroom) { this.showroom.update(dt); this.gfx.render(dt); }
      else this.gfx.render(dt);
      requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  }

  onMenu(action, device) {
    if (action === 'mute') { this.audio?.toggleMute?.(); return; }
    if (action === 'fullscreen') { this.fullscreen(!document.fullscreenElement); return; }
    if (this.menus.visible) { this.menus.handle(action, device); return; }
    const s = this.session; if (!s || this.attract) return;
    if (action === 'pause' || (action === 'back' && device.startsWith('kb'))) { if (s.phase !== 'intro' && s.race.state !== 'done') this.pause(); else s.skipIntro(); }
    else if (action === 'confirm' && s.phase === 'intro') s.skipIntro();
    else if (action === 'reset') { const k = s.race.players[0]; if (k && !k.finished && !s.race.frozen) k.startRescue(); }
  }

  applySettings(initial = false) {
    const S = this.save.settings;
    const want = S.quality === 'auto' ? detectQuality() : S.quality;
    if (!initial && want !== this.gfx.qualityName) this.gfx.applyQuality(want);
    this.input.touch.autoGas = S.autoGas;
    if (!S.tilt) this.input.disableTilt(); else if (!initial && !this.input.tilt.enabled) this.input.enableTilt().then(ok => { if (!ok) { S.tilt = false; this.save.write(); } });
    this.audio?.setVolumes?.(S.music, S.sfx);
    this.shake = S.shake;
  }

  /** Enter or leave full screen; on phones also ask for landscape. Must be called from a user gesture. */
  fullscreen(on) {
    try {
      if (on && !document.fullscreenElement) document.documentElement.requestFullscreen?.({ navigationUI: 'hide' })?.then(() => screen.orientation?.lock?.('landscape')?.catch(() => {})).catch(() => {});
      else if (!on && document.fullscreenElement) document.exitFullscreen?.();
    } catch { /* not supported here */ }
  }
  /** Keep the screen awake while racing (phones dim otherwise, especially with tilt steering). */
  async _wake(on) {
    try { if (on && !this.wakeLock && navigator.wakeLock) { this.wakeLock = await navigator.wakeLock.request('screen'); this.wakeLock.addEventListener('release', () => { this.wakeLock = null; }); } else if (!on && this.wakeLock) { await this.wakeLock.release(); this.wakeLock = null; } } catch { /* unsupported or denied */ }
  }

  /** Fade to dark, swap the scene, fade back. */
  async transition(fn) {
    this.curtain.classList.add('on');
    await new Promise(r => setTimeout(r, 300));
    try { await fn(); } finally { requestAnimationFrame(() => requestAnimationFrame(() => this.curtain.classList.remove('on'))); }
  }
  _clearScene() {
    this.session?.dispose(); this.session = null; this.attract = false;
    this.showroom?.dispose(); this.showroom = null;
    this.trackCard?.remove(); this.trackCard = null; this.hintCard?.remove(); this.hintCard = null;
  }

  /* ---------- title and attract race ---------- */
  toTitle() { this._attract(); this.menus.reset('title'); this.audio?.music?.('menu'); }
  _attract() {
    this._clearScene();
    const id = TRACKS[Math.floor(this.rng() * TRACKS.length)].id;
    this.session = new RaceSession(this, { trackId: id, cc: 150, level: 'hard', players: [], intro: false, seed: Math.floor(this.rng() * 1e5), laps: 3, quiet: true, countdown: 0.4, tv: true });
    this.attract = true;
  }
  onRaceDone(session, results) {
    if (this.attract) { setTimeout(() => { if (this.attract && this.session === session) this._attract(); }, 2500); return; }
    this._finishRace(session, results);
  }

  /* ---------- showroom ---------- */
  showRoomFor(racers, opts) {
    if (!this.showroom) { this.session?.dispose(); this.session = null; this.attract = false; this.showroom = new Showroom(this.gfx); }
    this.showroom.setRacers(racers, opts);
  }

  /* ---------- starting races ---------- */
  _players() {
    const f = this.flow;
    return f.racers.map((racerId, i) => ({ racerId, device: f.devices[i] || 'any', autoTrick: this.save.settings.autoTrick || this.input.touch.active }));
  }
  startSingle(trackId) {
    const f = this.flow; this.gp = null;
    this._race({ trackId, cc: f.cc || this.save.data.last.cc, level: f.level || 'normal', players: this._players(), mode: f.mode === 'timetrial' ? 'timetrial' : 'race' });
  }
  startCup(cup) {
    const f = this.flow, tracks = cupTracks(cup), humans = f.racers.map(id => RACER_BY_ID[id]);
    const rivals = this.rng.shuffle(RACERS.filter(r => !humans.includes(r))).slice(0, 8 - humans.length).map(r => r.id);
    this.gp = { cup, tracks, index: 0, grid: rivals, totals: Object.fromEntries([...rivals, ...f.racers].map(id => [id, 0])), order: null, cc: f.cc, level: f.level };
    this._gpRace();
  }
  _gpRace() {
    const g = this.gp;
    this._race({ trackId: g.tracks[g.index], cc: g.cc, level: g.level, players: this._players(), grid: g.grid, order: g.order, mode: 'race' }, `${g.cup.name} · Race ${g.index + 1} of ${g.tracks.length}`);
  }
  _race(config, cupLine = '') {
    this.lastConfig = config; this.lastCupLine = cupLine;
    this.menus.close(); this._wake(true);
    return this.transition(() => {
      this._clearScene();
      config.seed = Math.floor(this.rng() * 1e6);
      this.session = new RaceSession(this, config);
      const def = TRACK_BY_ID[config.trackId];
      const card = this.trackCard = el('div', 'track-card');
      card.innerHTML = `${cupLine ? `<div class="cup-line">${cupLine}</div>` : ''}<h1>${def.name}</h1><p>${def.tagline || ''}</p>`;
      this.ui.appendChild(card);
      if (this.session.phase !== 'intro') setTimeout(() => this.onCountdown(), 1400);
      if (!this.save.data.seenHowTo && config.players.length === 1 && !this.session.touch) this._hint();
      this.audio?.music?.(def.music || def.id);
      this.audio?.say?.('track_' + def.id, { force: true, delay: 0.7 });
    });
  }
  /** First race only: a short reminder of the two controls people miss. */
  _hint() {
    const pad = this.input.lastDevice.startsWith('pad');
    const card = el('div', 'hint-card', pad ? '<b>Right bumper</b> drift &nbsp;·&nbsp; <b>Left bumper</b> use item' : '<kbd>Space</kbd> drift &nbsp;·&nbsp; <kbd>E</kbd> use item &nbsp;·&nbsp; <kbd>Esc</kbd> pause');
    this.ui.appendChild(card); this.hintCard = card;
    setTimeout(() => { card.classList.add('out'); setTimeout(() => card.remove(), 500); }, 14000);
    this.save.data.seenHowTo = true; this.save.write();
  }

  /** Called by the session when the flyover ends. */
  onCountdown() { const c = this.trackCard; if (c) { c.classList.add('out'); setTimeout(() => c.remove(), 450); this.trackCard = null; } }

  restartRace() { this.menus.close(); this._race(this.lastConfig, this.lastCupLine); }
  backToTracks() { this.transition(() => { this._attract(); this.menus.reset('main'); this.menus.open('tracks'); }); }
  quitToMenu() { this.gp = null; this._wake(false); this.transition(() => { this._attract(); this.menus.reset('main'); this.audio?.music?.('menu'); }); }

  /* ---------- pause ---------- */
  pause() { if (!this.session || this.attract || this.session.paused) return; this.session.setPaused(true); this.session.touch?.setVisible(false); this.menus.reset('pause'); }
  resume() { this.menus.close(); this.session?.setPaused(false); this.session?.touch?.setVisible(true); }

  /* ---------- results ---------- */
  _finishRace(session, results) {
    const cfg = session.config, def = TRACK_BY_ID[cfg.trackId];
    const mine = results.filter(r => r.isPlayer).sort((a, b) => a.rank - b.rank)[0];
    let records = null;
    if (mine) {
      records = this.save.recordRace(cfg.trackId, cfg.mode === 'timetrial' ? 'tt' : cfg.cc, mine.time, mine.bestLap, mine.racer.id, mine.rank === 1);
      if (cfg.mode === 'timetrial' && session.rec && records.newBestRace) this.save.setGhost(cfg.trackId, { racer: session.rec.racer, step: session.rec.step, time: mine.time, d: session.rec.d });
      const st = this.save.data.stats; st.coins += mine.stats.coins; st.hitsGiven += mine.stats.hitsGiven; st.hitsTaken += mine.stats.hitsTaken; this.save.write();
    }
    let gp = null;
    if (this.gp) {
      const g = this.gp;
      for (const r of results) g.totals[r.racer.id] = (g.totals[r.racer.id] || 0) + (GP_POINTS[r.rank - 1] || 0);
      g.order = results.map(r => r.racer.id);
      gp = { totals: g.totals, index: g.index, count: g.tracks.length, last: g.index === g.tracks.length - 1 };
    }
    for (const h of session.huds) h.setVisible(false);
    session.touch?.setVisible(false);
    this.menus.reset('results', { results, gp, track: def, records });
    this.audio?.event?.('results', mine?.rank);
    this.audio?.music?.('results');
  }
  gpNext() {
    const g = this.gp; if (!g) return;
    if (g.index < g.tracks.length - 1) { g.index++; this._gpRace(); return; }
    // final standings and podium
    const humans = new Set(this.flow.racers);
    const standings = Object.entries(g.totals).map(([id, points]) => ({ racer: RACER_BY_ID[id], points, isPlayer: humans.has(id) })).sort((a, b) => b.points - a.points);
    const playerRanks = standings.map((s, i) => (s.isPlayer ? i + 1 : 99)).filter(r => r < 99);
    const best = Math.min(...playerRanks), bestPts = standings[best - 1].points, stars = cupStars(best, bestPts, g.tracks.length);
    this.save.recordCup(g.cup.id, g.cc, best, bestPts, stars);
    this.menus.close();
    this.transition(() => {
      this._clearScene();
      this.showroom = new Showroom(this.gfx); this.showroom.setPodium(standings.slice(0, 3).map(s => s.racer));
      this.menus.reset('cupResults', { cup: g.cup, standings, playerRanks, stars });
      this.audio?.event?.('podium', best);
    });
  }
}
export { CUPS };
