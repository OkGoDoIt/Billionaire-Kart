/* One race from grid to results: owns the sim, the scene, the HUDs, and the
   fixed-step loop that keeps physics independent of frame rate. */
import { Race } from '../race/race.js';
import { AIDriver } from '../race/ai.js';
import { RaceView } from '../render/raceview.js';
import { DrivingGuide } from '../ui/driving-guide.js';
import { AfterFinish } from './afterfinish.js';
import { Hud, FieldBoard } from '../ui/hud.js';
import { TouchControls, isTouchDevice } from '../ui/touch.js';
import { ITEMS, HIT_LINES, isFundingBoost } from '../race/items.js';
import { getTrack, TRACK_BY_ID } from '../content/tracks.js';
import { RACERS, RACER_BY_ID, RIVAL_PASS, HIT_REPLY } from '../content/racers.js';
import { trialKey } from '../core/save.js';
import { makeRng } from '../core/util.js';

export const STEP = 1 / 60;
// Keep a slow foreground race in real time down to 4 fps. Bound catch-up after
// long interruptions, when replaying the last input for seconds would be unfair.
export const MAX_FRAME_TIME = 0.25;
const SLOW_MO = 1.1;   // seconds of real time the finish slow motion takes to ease back to full speed

export class RaceSession {
  /**
   * config: { trackId, cc, laps?, players: [{ racerId, device }], level, seed?, mode?, auto?, intro? , grid?: [racerId...] }
   * Online: config.net = { conn, room, me, NetRace } (NetRace is the class from src/net/netrace.js, which the
   * caller loads with import(), so the offline game never fetches it). Track, field, grid, laps, and seed then
   * come from room.race; the local players are the slots whose member is `me` (none: spectate on the TV camera).
   */
  constructor(app, config) {
    this.app = app; this.config = config;
    if (config.net) this._onlineConfig(config);
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
    if (config.net) {
      const { conn, room, me, NetRace } = config.net, ro = NetRace.raceOptions(room, me, RACER_BY_ID, getTrack);
      for (const e of ro.entries) if (e.player >= 0 && config.players[e.player] && room.race.slots.some(s => s.member === me && RACER_BY_ID[s.racer] === e.racer)) {
        const p = config.players[e.player]; e.autoTrick = p.autoTrick; e.assist = { steer: p.smartSteer ? 1 : 0 };
      }
      this.race = new Race(ro);
      this.net = new NetRace({ race: this.race, conn, room, me });   // also narrows race.players to this device's players
      conn.send({ t: 'loaded' });
    } else
    this.race = new Race({ track, cc: config.cc || 150, laps: config.laps, seed: (config.seed ?? 1) + 17, entries, mode: config.mode, countdown: config.countdown });
    this.trialBest = config.mode === 'timetrial' ? app.save?.bestFor(config.trackId, trialKey(config.cc || 150))?.race : null;
    this.view = new RaceView(app.gfx, this.race, def, { onEvent: (kind, e, k) => this._onEvent(kind, e, k), tv: !!config.tv, trialBest: this.trialBest });
    app.input.assign = config.players.length === 1 ? ['any'] : config.players.map(p => p.device);
    this.autopilots = config.auto ? this.race.players.map(k => new AIDriver(k, 'hard', makeRng(99))) : null;
    // HUD per player
    const n = this.race.players.length;
    this.huds = this.race.players.map((k, i) => new Hud(app.ui, this.race, k, this.view.views[i].rect, { compact: n > 2, showMap: true, trialBest: this.trialBest }));
    this.hudOf = new Map(this.race.players.map((k, i) => [k, this.huds[i]]));
    // three players on a two-by-two grid leave a cell empty: the whole field goes there
    this.board = n === 3 ? new FieldBoard(app.ui, this.race) : null;
    // the split follows the window's shape, so the HUDs and the board move whenever it is laid out again
    this.view.onLayout = view => {
      const board = !!(this.board && view.spare.length);
      this.board?.setRect(view.spare[0] || null);
      // with the board up, the panes' own minimaps repeat it; Thiel keeps his, where his special shows rivals' items
      this.huds.forEach((h, i) => { h.setRect(view.views[i].rect); h.root.classList.toggle('hud-nomap', board && !h.kart.sp?.seeItems); });
    };
    this.view.onLayout(this.view);
    // touch controls for a solo player on a touch screen
    this.touch = null;
    if (n === 1 && isTouchDevice() && !config.auto) {
      const S = app.save?.settings || {};
      // tricks are automatic on touch unless the phone is flicking them (flick to trick, src/game/app.js)
      this.touch = new TouchControls(app.ui, app.input, this.race.players[0], { onPause: () => app.pause?.(), autoGo: !!S.autoGo, flickReady: () => !!app.flickReady?.() });
      this.huds[0].root.classList.add('hud-touch'); this.race.players[0].autoTrick = !app.flickReady?.();
      // touch play gets the steering assist by default (issue #136); the Options toggle governs the other controls
      if (config.mode !== 'timetrial') this.race.players[0].assist = { steer: 1 };
      // a phone screen is small and the thumbs cover its corners: sit the camera further back so there is more road in view
      for (const c of this.view.cams) c.pullBack = 1.24;
    } else app.input.touch.active = false;
    this.guides = app.save && !config.auto ? this.huds.map(h => new DrivingGuide(h, app.input, app.save, this.touch)) : [];
    for (const c of this.view.cams) c.shakeScale = app.shake === false ? 0 : 1;
    // time trial: race your own best run, and record this one
    this.rec = null;
    if (config.mode === 'timetrial' && this.race.players.length === 1) {
      this.view.setGhost(app.save?.ghost(config.trackId, config.cc));
      this.rec = { racer: this.race.players[0].racer.id, step: 0.1, d: [], next: 0 };
    }
    this.after = new AfterFinish(this);
    this.acc = 0; this.phase = config.intro === false ? 'countdown' : 'intro'; this.paused = false; this.doneT = 0; this.reported = false;
    if (this.phase === 'intro') { this.view.startIntro(); for (const h of this.huds) h.setVisible(false); this.board?.setVisible(false); this.touch?.setVisible(false); app.audio?.event('introStart', def); }
    else app.audio?.event('countdownStart', def);
  }

  /** Online: the session's settings come from the room. */
  _onlineConfig(config) {
    const { room, me } = config.net, rr = room.race, S = this.app.save?.settings || {};
    const mine = rr.slots.filter(s => s.member === me).sort((a, b) => a.slot - b.slot);
    Object.assign(config, {
      trackId: rr.trackId, cc: room.rules?.cc || 150, laps: rr.laps, seed: rr.seed, level: room.rules?.level || 'normal', mode: 'race', intro: false,
      players: config.players?.length === mine.length ? config.players : mine.map(s => ({ racerId: s.racer, device: 'any', autoTrick: !!S.autoTrick || !!this.app.input?.touch?.active, smartSteer: !!S.smartSteer })),
      tv: !mine.length,
    });
  }

  /** Freeze the action briefly (one screen only: in split-screen a pause for one player would stall the others). Never online. */
  _hitStop(sec) { if (this.race.players.length === 1 && !this.net) this.hitStopT = Math.max(this.hitStopT || 0, sec); }
  /** Crossing the line: the race drops to a third of its speed for a beat and eases back (one screen only). Never online. */
  _slowMo() { if (this.race.players.length === 1 && !this.net) this.slowT = SLOW_MO; }

  skipIntro() { if (this.phase === 'intro') { this.view.intro.done = true; } }

  _rivalLine(hud, racer, special, lines, ms) {
    const heard = hud.heardLines || (hud.heardLines = new Set());
    if (special && !heard.has(special)) {
      if (hud.talk(racer, special, ms)) heard.add(special);
    } else hud.talk(racer, lines[Math.floor(Math.random() * lines.length)], ms);
  }

  /** Split screen, first count: each player hears from the rival nearest them on the grid, a different rival for each
      player where the field allows, so every pane gets its own line from someone actually beside them. */
  _gridLines() {
    const rivals = this.race.karts.filter(k => !k.isPlayer && !k.human), taken = new Set();   // online, other people's karts are not rivals with lines
    for (const [k, hud] of this.hudOf) {
      const near = rivals.filter(r => !taken.has(r)).sort((a, b) => Math.hypot(a.x - k.x, a.z - k.z) - Math.hypot(b.x - k.x, b.z - k.z))[0];
      if (!near) continue;
      taken.add(near); hud.talk(near.racer, near.racer.quote, 3200);
    }
  }

  _onEvent(kind, e, kart) {
    const app = this.app, pick = list => list[Math.floor(Math.random() * list.length)];
    if (kind === 'kart') {
      const hud = this.hudOf.get(kart);
      if (hud) {
        hud.onKartEvent(e);
        // a track can have something to say as each lap starts (the reservoir at Datacenter Dash, for one)
        // overtaken: the one who just went by has a word, now and then
        if (e.type === 'rankDown' && this.race.time > 6 && !kart.finished && Math.random() < 0.45) { const passer = this.race.order[kart.rank - 2]; if (passer && !passer.isPlayer && !passer.human) this._rivalLine(hud, passer.racer, RIVAL_PASS[passer.racer.id]?.[kart.racer.id], passer.racer.barks.pass, 2600); }
        if (e.type === 'lap' && e.data > 1 && e.data <= this.race.laps && this.def.lapNotes?.[e.data - 2]) hud.feed(this.def.lapNotes[e.data - 2], 4200);
        const p = kart.playerIndex;
        const guide = !this.autopilots && this.guides[p];
        if (guide) {
          if (e.type === 'itemUse') guide.learned('item');
          if (e.type === 'driftStart') guide.learned('drift');
          if (e.type === 'miniTurbo') guide.learned('release');
          if (e.type === 'trick' && !kart.autoTrick) guide.learned('trick');
        }
        if (e.type === 'finish') { app.input.stopRumble(p); this._slowMo(); }
        else if (!kart.finished) {
          if (e.type === 'hit') { const big = e.data.kind === 'tumble'; app.input.rumble(p, 1, big ? 1 : 0.8, big ? 520 : 380); this._hitStop(big ? 0.11 : e.data.kind === 'zap' ? 0.06 : 0.08); }
          else if (e.type === 'miniTurbo') app.input.rumble(p, 0.2 + e.data * 0.15, 0.5, 90 + e.data * 40);
          else if (e.type === 'wall') app.input.rumble(p, Math.min(1, e.data.v / 14), 0.3, 140);
          else if (e.type === 'land' && e.data > 9) app.input.rumble(p, 0.5, 0.2, 110);
          else if (e.type === 'boost') app.input.rumble(p, 0.25, 0.6, 180);
          else if (e.type === 'bump') app.input.rumble(p, 0.4, 0.3, 90);
          else if (e.type === 'driftTier' && e.data > 0) app.input.rumble(p, 0.1, 0.5, 70);
        }
      }
      app.audio?.kartEvent(e, kart, !!hud);
    } else {
      if (e.type === 'count') {
        for (const h of this.huds) h.countdown(e.data);
        // on the first count, whoever starts on pole says their piece
        if (!this._poleSpoke) { this._poleSpoke = true; const pole = this.race.order[0] || this.race.karts[0]; if (this.huds.length > 1) this._gridLines(); else if (pole && !pole.isPlayer && !pole.human) for (const h of this.huds) h.talk(pole.racer, pole.racer.quote, 3200); }
      }
      else if (e.type === 'go') for (const h of this.huds) h.countdown(0);
      else if (e.type === 'kartHit') {
        const { by, victim, with: w } = e.data, name = ITEMS[w]?.name || (w === 'star' ? 'Hype Cycle' : w === 'squash' ? 'a full-size kart' : w);
        const hv = this.hudOf.get(victim), hb = by && this.hudOf.get(by);
        // the one who got hit sees it shouted across the screen, then hears about it from whoever did it
        if (hv) { hv.banner(ITEMS[w]?.hit || HIT_LINES[w] || 'HIT!', 'bad small', 1300, 2); if (by && by !== victim) { hv.feed(`<b>${by.racer.name}</b> got you with ${name}`); if (!by.isPlayer && !by.human) hv.talk(by.racer, pick(by.racer.barks.taunt)); } }
        if (hb && by !== victim) { this._hitStop(0.05); hb.feed(`You got <b>${victim.racer.name}</b> with ${name}`); if (!victim.isPlayer && !victim.human) this._rivalLine(hb, victim.racer, HIT_REPLY[w]?.[victim.racer.id], victim.racer.barks.hit); }
      } else if (e.type === 'steal') { const h = this.hudOf.get(e.data.by); if (h) h.feed(`You stole ${ITEMS[e.data.id].name} from <b>${e.data.from.racer.name}</b>`); }
      // the suit has arrived over the leader: their feed says so, in terms — the hover is the warning window
      else if (e.type === 'blueArrive') {
        const target = e.data.target, h = this.hudOf.get(target);
        if (h) {
          const row = h.feed(isFundingBoost(target.item) ? '<b>ANTITRUST SUIT</b> · Boost as it dives.' : '<b>ANTITRUST SUIT</b> · Incoming!', 1600);
          h.suitNotice = { row, shot: e.data.shot };
        }
      }
      app.audio?.raceEvent(e, this.race);
    }
  }

  frame(dt) {
    if (this.net) return this._frameOnline(dt);
    const frameTime = dt;
    const { race, view, app } = this;
    if (this.paused) { this.carry = null; app.gfx.render(0); return; }
    if (this.phase === 'intro') {
      // in split screen the countdown waits for the screen to finish dividing, and the HUDs fade in as it lands
      if (view.intro.done && !view.splitting) { this.phase = 'countdown'; for (const c of view.cams) c.snap(); for (const h of this.huds) { h.setVisible(true); if (this.huds.length > 1) h.root.classList.add('hud-enter'); } this.board?.setVisible(true); this.board?.root.classList.add('hud-enter'); this.touch?.setVisible(true); app.onCountdown?.(); app.audio?.event('countdownStart', this.def); }
    } else {
      const inputs = this._withCarry(app.inputs && app.inputs.length ? app.inputs : app.input.poll(dt));
      let stepped = false;
      // hit pause: the world holds still for a few frames when a hit lands, so it feels heavy
      if (this.hitStopT > 0) { const hold = Math.min(this.hitStopT, dt); this.hitStopT -= hold; dt -= hold; }
      if (this.slowT > 0) { this.slowT -= dt; const f = 1 - Math.max(0, this.slowT) / SLOW_MO; dt *= 0.3 + 0.7 * f * f; }
      this.acc = Math.max(0, this.acc + Math.min(dt, MAX_FRAME_TIME));   // never in debt: a race that owes time would sit frozen until it had paid it back (#103)
      while (this.acc >= STEP) {
        view.snapshot();
        let inp = inputs;
        if (this.autopilots) inp = this.autopilots.map(a => a.think(STEP));
        race.step(STEP, inp);
        this.acc -= STEP; stepped = true;
        if (this.rec && !race.frozen && race.time >= this.rec.next && this.rec.d.length < 4 * 4000) { const k = race.players[0]; this.rec.next += this.rec.step; this.rec.d.push(+k.x.toFixed(2), +k.y.toFixed(2), +k.z.toFixed(2), +k.yaw.toFixed(3)); }
      }
      this._keepCarry(inputs, stepped);
      for (let i = 0; i < view.cams.length && i < race.players.length; i++) view.cams[i].rear = !!inputs[i]?.rear && !this.autopilots;
      if (this.phase === 'countdown' && !race.frozen) this.phase = 'racing';
      this.touch?.sync(dt);
      for (const [i, guide] of this.guides.entries()) {
        if (this.autopilots) guide.hide(); else guide.update(dt, inputs[i]);
      }
      this.board?.update(dt);
      for (const h of this.hudOf.values()) h.update(dt);
      this.after?.frame(dt);
      if (race.state === 'done') { this.doneT += dt; if (!this.reported && this.doneT > 1.2) { this.reported = true; app.onRaceDone?.(this, race.results()); } }
    }
    view.update(dt, this.acc / STEP);
    app.afterUpdate?.(this);
    app.audio?.frame(dt, race, view);
    app.gfx.render(dt, frameTime);
  }

  /** Buttons are read once a frame, but a frame can run no race step at all (a display faster than the
      simulation, or the frame after a stall). A press seen only in such a frame is held over to the next step,
      so every tap of item, drift, or a flick lands exactly as a press (#359). */
  _withCarry(inputs) {
    const c = this.carry; if (!c) return inputs;
    return inputs.map((s, i) => !s || !c[i] ? s : { ...s, item: s.item || c[i].item, itemBack: s.item ? s.itemBack : c[i].itemBack, drift: s.drift || c[i].drift, trick: s.trick || c[i].trick, trickDir: s.trick ? s.trickDir : c[i].trickDir });
  }
  _keepCarry(inputs, stepped) {
    this.carry = stepped ? null : inputs.map(s => s && (s.item || s.drift || s.trick) ? { item: s.item, itemBack: s.itemBack, drift: s.drift, trick: s.trick, trickDir: s.trickDir } : null);
  }

  /* Online: step to the shared clock (always catching up; fast-forward without drawing when more than 2 s
     behind), never pause or hit-stop, and take the results from the server when the room reaches results. */
  _frameOnline(dt) {
    const { race, view, app, net } = this;
    const polled = app.inputs && app.inputs.length ? app.inputs : app.input.poll(dt);
    const inputs = this.menuOpen ? [] : this._withCarry(polled);   // the pause menu may be open, but the race goes on
    const think = () => this.autopilots ? this.autopilots.map(a => a.kart.puppet ? undefined : a.think(STEP)) : inputs;
    let target = net.targetStep();
    if (target - net.n > 120) {
      net.wake();
      while (net.n < target) { race.step(STEP, []); for (const k of race.karts) k.events.length = 0; race.events.length = 0; }
      for (const c of view.cams) c.snap?.();
      target = net.targetStep();
    }
    const n0 = net.n;
    while (net.n < target) { view.snapshot(); race.step(STEP, think()); }
    this._keepCarry(inputs, net.n > n0);
    for (let i = 0; i < view.cams.length && i < race.players.length; i++) view.cams[i].rear = !!inputs[i]?.rear && !this.autopilots;
    if (this.phase === 'countdown' && !race.frozen) this.phase = 'racing';
    this.touch?.sync(dt);
    for (const [i, guide] of this.guides.entries()) { if (this.autopilots) guide.hide(); else guide.update(dt, inputs[i]); }
    this.board?.update(dt);
    for (const h of this.hudOf.values()) h.update(dt);
    this.after?.frame(dt);
    if (!this.reported && net.phase === 'results' && net.room.last) { this.reported = true; app.onRaceDone?.(this, this.onlineResults()); }
    view.update(dt, net.stepFraction());
    app.afterUpdate?.(this);
    app.audio?.frame(dt, race, view);
    app.gfx.render(dt, dt);
  }

  /** The server's results (room.last), shaped like race.results() plus slot, member, and the valuation before and after. */
  onlineResults() {
    const karts = this.race.karts;
    return this.net.room.last.results.slice().sort((a, b) => a.rank - b.rank).map(r => {
      const k = karts[r.slot];
      return { kart: k, racer: k.racer, rank: r.rank, time: r.time ?? k.finishTime, bestLap: k.bestLap, points: r.points ?? 0, isPlayer: k.isPlayer, playerIndex: k.playerIndex,
        estimated: !!r.estimated, stats: k.stats, slot: r.slot, member: r.member, before: r.before ?? null, after: r.after ?? null };
    });
  }

  setPaused(p) {
    if (this.net) { this.menuOpen = p; if (p) this.app.input.stopRumble(); return; }   // online the race never stops
    if (p) this.app.input.stopRumble(); for (const g of this.guides) g.card.hidden = p || !g.active; this.paused = p; this.app.audio?.event(p ? 'pause' : 'resume');
  }

  dispose() { this.after?.dispose(); this.net?.dispose(); this.app.input.stopRumble(); for (const h of this.huds) h.dispose(); this.board?.dispose(); this.touch?.dispose(); this.view.dispose(); }
}
