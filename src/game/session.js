/* One race from grid to results: owns the sim, the scene, the HUDs, and the
   fixed-step loop that keeps physics independent of frame rate. */
import { Race } from '../race/race.js';
import { AIDriver } from '../race/ai.js';
import { RaceView } from '../render/raceview.js';
import { Hud } from '../ui/hud.js';
import { TouchControls, isTouchDevice } from '../ui/touch.js';
import { ITEMS, HIT_LINES } from '../race/items.js';
import { getTrack, TRACK_BY_ID } from '../content/tracks.js';
import { RACERS, RACER_BY_ID } from '../content/racers.js';
import { makeRng } from '../core/util.js';

export const STEP = 1 / 60;
const SLOW_MO = 1.1;   // seconds of real time the finish slow motion takes to ease back to full speed

export class RaceSession {
  /**
   * config: { trackId, cc, laps?, players: [{ racerId, device }], level, seed?, mode?, auto?, intro? , grid?: [racerId...] }
   */
  constructor(app, config) {
    this.app = app; this.config = config;
    const def = this.def = TRACK_BY_ID[config.trackId], track = getTrack(config.trackId);
    const rng = makeRng(config.seed ?? (Date.now() & 0xffff));
    const humans = config.players.map(p => RACER_BY_ID[p.racerId]);
    const count = config.mode === 'timetrial' ? 0 : (config.fieldSize ?? 8) - humans.length;
    // rivals: an explicit grid (Grand Prix keeps the same field all cup) or a random draw
    const pool = config.grid ? config.grid.map(id => RACER_BY_ID[id]) : rng.shuffle(RACERS.filter(r => !humans.includes(r))).slice(0, count);
    // humans start at the back, like a first Grand Prix race
    // steering assist follows the saved option, except that time trials are never assisted
    // (as in Mario Kart, best times stay the player's own work)
    const entries = [...pool.map(racer => ({ racer, player: -1, level: config.level || 'normal' })), ...humans.map((racer, i) => ({ racer, player: i, autoTrick: config.players[i].autoTrick, assist: { steer: config.mode !== 'timetrial' && config.players[i].smartSteer ? 1 : 0 } }))];
    if (config.order) entries.sort((a, b) => config.order.indexOf(a.racer.id) - config.order.indexOf(b.racer.id));
    this.race = new Race({ track, cc: config.cc || 150, laps: config.laps, seed: (config.seed ?? 1) + 17, entries, mode: config.mode, countdown: config.countdown });
    this.view = new RaceView(app.gfx, this.race, def, { onEvent: (kind, e, k) => this._onEvent(kind, e, k), tv: !!config.tv });
    app.input.assign = config.players.length === 1 ? ['any'] : config.players.map(p => p.device);
    this.autopilots = config.auto ? this.race.players.map(k => new AIDriver(k, 'hard', makeRng(99))) : null;
    // HUD per player
    const n = this.race.players.length;
    this.huds = this.race.players.map((k, i) => new Hud(app.ui, this.race, k, this.view.views[i].rect, { compact: n > 2, showMap: true }));
    this.hudOf = new Map(this.race.players.map((k, i) => [k, this.huds[i]]));
    // touch controls for a solo player on a touch screen
    this.touch = null;
    if (n === 1 && isTouchDevice() && !config.auto) {
      const S = app.save?.settings || {}, seen = app.save?.data.touchRaces || 0;
      this.touch = new TouchControls(app.ui, app.input, this.race.players[0], { onPause: () => app.pause?.(), autoGo: !!S.autoGo, coach: seen < 3 });
      if (app.save) { app.save.data.touchRaces = seen + 1; app.save.write(); }
      this.huds[0].root.classList.add('hud-touch'); this.race.players[0].autoTrick = true;
      // touch play gets the steering assist by default (issue #136), the way automatic
      // tricks are forced here too; the Options toggle governs the other controls
      if (config.mode !== 'timetrial') this.race.players[0].assist = { steer: 1 };
      // a phone screen is small and the thumbs cover its corners: sit the camera further back so there is more road in view
      for (const c of this.view.cams) c.pullBack = 1.24;
    } else app.input.touch.active = false;
    for (const c of this.view.cams) c.shakeScale = app.shake === false ? 0 : 1;
    // time trial: race your own best run, and record this one
    this.rec = null;
    if (config.mode === 'timetrial' && this.race.players.length === 1) {
      this.view.setGhost(app.save?.ghost(config.trackId, config.cc));
      this.rec = { racer: this.race.players[0].racer.id, step: 0.1, d: [], next: 0 };
    }
    this.acc = 0; this.phase = config.intro === false ? 'countdown' : 'intro'; this.paused = false; this.doneT = 0; this.reported = false;
    if (this.phase === 'intro') { this.view.startIntro(); for (const h of this.huds) h.setVisible(false); this.touch?.setVisible(false); app.audio?.event('introStart', def); }
    else app.audio?.event('countdownStart', def);
  }

  /** Freeze the action briefly (one screen only: in split-screen a pause for one player would stall the others). */
  _hitStop(sec) { if (this.race.players.length === 1) this.hitStopT = Math.max(this.hitStopT || 0, sec); }
  /** Crossing the line: the race drops to a third of its speed for a beat and eases back (one screen only). */
  _slowMo() { if (this.race.players.length === 1) this.slowT = SLOW_MO; }

  skipIntro() { if (this.phase === 'intro') { this.view.intro.done = true; } }

  _onEvent(kind, e, kart) {
    const app = this.app, pick = list => list[Math.floor(Math.random() * list.length)];
    if (kind === 'kart') {
      const hud = this.hudOf.get(kart);
      if (hud) {
        hud.onKartEvent(e);
        // a track can have something to say as each lap starts (the reservoir at Datacenter Dash, for one)
        // overtaken: the one who just went by has a word, now and then
        if (e.type === 'rankDown' && this.race.time > 6 && !kart.finished && Math.random() < 0.45) { const passer = this.race.order[kart.rank - 2]; if (passer && !passer.isPlayer) hud.talk(passer.racer, pick(passer.racer.barks.pass), 2600); }
        if (e.type === 'lap' && e.data > 1 && e.data <= this.race.laps && this.def.lapNotes?.[e.data - 2]) hud.feed(this.def.lapNotes[e.data - 2], 4200);
        const p = kart.playerIndex;
        if (e.type === 'hit') { const big = e.data.kind === 'tumble'; app.input.rumble(p, 1, big ? 1 : 0.8, big ? 520 : 380); this._hitStop(big ? 0.11 : e.data.kind === 'zap' ? 0.06 : 0.08); }
        else if (e.type === 'finish') this._slowMo();
        else if (e.type === 'miniTurbo') app.input.rumble(p, 0.2 + e.data * 0.15, 0.5, 90 + e.data * 40);
        else if (e.type === 'wall') app.input.rumble(p, Math.min(1, e.data.v / 14), 0.3, 140);
        else if (e.type === 'land' && e.data > 9) app.input.rumble(p, 0.5, 0.2, 110);
        else if (e.type === 'boost') app.input.rumble(p, 0.25, 0.6, 180);
        else if (e.type === 'bump') app.input.rumble(p, 0.4, 0.3, 90);
        else if (e.type === 'driftTier' && e.data > 0) app.input.rumble(p, 0.1, 0.5, 70);
      }
      app.audio?.kartEvent(e, kart, !!hud);
    } else {
      if (e.type === 'count') {
        for (const h of this.huds) h.countdown(e.data);
        // on the first count, whoever starts on pole says their piece
        if (!this._poleSpoke) { this._poleSpoke = true; const pole = this.race.order[0] || this.race.karts[0]; if (pole && !pole.isPlayer) for (const h of this.huds) h.talk(pole.racer, pole.racer.quote, 3200); }
      }
      else if (e.type === 'go') for (const h of this.huds) h.countdown(0);
      else if (e.type === 'kartHit') {
        const { by, victim, with: w } = e.data, name = ITEMS[w]?.name || (w === 'star' ? 'Hype Cycle' : w === 'squash' ? 'a full-size kart' : w);
        const hv = this.hudOf.get(victim), hb = by && this.hudOf.get(by);
        // the one who got hit sees it shouted across the screen, then hears about it from whoever did it
        if (hv) { hv.banner(ITEMS[w]?.hit || HIT_LINES[w] || 'HIT!', 'bad small', 1300, 2); if (by && by !== victim) { hv.feed(`<b>${by.racer.name}</b> got you with ${name}`); if (!by.isPlayer) hv.talk(by.racer, pick(by.racer.barks.taunt)); } }
        if (hb && by !== victim) { this._hitStop(0.05); hb.feed(`You got <b>${victim.racer.name}</b> with ${name}`); if (!victim.isPlayer) hb.talk(victim.racer, pick(victim.racer.barks.hit)); }
      } else if (e.type === 'steal') { const h = this.hudOf.get(e.data.by); if (h) h.feed(`You stole ${ITEMS[e.data.id].name} from <b>${e.data.from.racer.name}</b>`); }
      // the suit has arrived over the leader: their feed says so, in terms — the hover is the warning window
      else if (e.type === 'blueArrive') { const h = this.hudOf.get(e.data.target); if (h) h.feed('<b>ANTITRUST SUIT</b> — INBOUND! It is circling you…', 3400); }
      app.audio?.raceEvent(e, this.race);
    }
  }

  frame(dt) {
    const { race, view, app } = this;
    if (this.paused) { app.gfx.render(0); return; }
    if (this.phase === 'intro') {
      if (view.intro.done) { this.phase = 'countdown'; for (const c of view.cams) c.snap(); for (const h of this.huds) h.setVisible(true); this.touch?.setVisible(true); app.onCountdown?.(); app.audio?.event('countdownStart', this.def); }
    } else {
      const inputs = app.inputs && app.inputs.length ? app.inputs : app.input.poll(dt);
      // hit pause: the world holds still for a few frames when a hit lands, so it feels heavy
      if (this.hitStopT > 0) { this.hitStopT -= dt; dt = 0; }
      if (this.slowT > 0) { this.slowT -= dt; const f = 1 - Math.max(0, this.slowT) / SLOW_MO; dt *= 0.3 + 0.7 * f * f; }
      this.acc = Math.max(0, Math.min(this.acc + dt, STEP * 5));   // never in debt: a race that owes time would sit frozen until it had paid it back (#103)
      while (this.acc >= STEP) {
        view.snapshot();
        let inp = inputs;
        if (this.autopilots) inp = this.autopilots.map(a => a.think(STEP));
        race.step(STEP, inp);
        this.acc -= STEP;
        if (this.rec && !race.frozen && race.time >= this.rec.next && this.rec.d.length < 4 * 4000) { const k = race.players[0]; this.rec.next += this.rec.step; this.rec.d.push(+k.x.toFixed(2), +k.y.toFixed(2), +k.z.toFixed(2), +k.yaw.toFixed(3)); }
      }
      for (let i = 0; i < view.cams.length && i < race.players.length; i++) view.cams[i].rear = !!inputs[i]?.rear && !this.autopilots;
      if (this.phase === 'countdown' && !race.frozen) this.phase = 'racing';
      this.touch?.sync(dt);
      if (this.touch) this.huds[0].quiet = this.touch.root.classList.contains('coaching');   // rivals hold their tongues while the controls are being explained
      for (const [k, h] of this.hudOf) { h.update(dt); if (k.finished) { const cam = view.cams.find(c => c.kart === k); if (cam && cam.mode !== 'orbit') { cam.mode = 'orbit'; cam.t = 0; } } }
      if (race.state === 'done') { this.doneT += dt; if (!this.reported && this.doneT > 1.2) { this.reported = true; app.onRaceDone?.(this, race.results()); } }
    }
    view.update(dt, this.acc / STEP);
    app.afterUpdate?.(this);
    app.audio?.frame(dt, race, view);
    app.gfx.render(dt);
  }

  setPaused(p) { this.paused = p; this.app.audio?.event(p ? 'pause' : 'resume'); }

  dispose() { for (const h of this.huds) h.dispose(); this.touch?.dispose(); this.view.dispose(); }
}
