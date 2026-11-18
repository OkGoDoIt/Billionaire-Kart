/* After the line. A local player who has finished keeps their screen while the others race: their kart drives
   itself (Race._cruise) and the camera circles it for the finish. Online, with other people still out there, the
   screen then watches them: a chase camera on one of them, a card saying who it is, and a board of every human's
   race. Left and right (or the card's arrows, or a row on the board) switch who is on screen. Offline, the other
   players are already on screen in their own panes, so the camera stays on your kart. */
import { WatchPanel } from '../ui/watch.js';
import { ordinalSuffix } from '../core/util.js';

const CELEBRATE = 3.6;   // seconds on your own finish before the camera goes to watch the others
const THEIRS = 3.4;      // seconds on someone else's finish before moving on to whoever is still racing
const GRACE_SHOWN = 120; // the wait for the results shows once it is this short (seconds)

export class AfterFinish {
  constructor(session) {
    this.s = session;
    const race = session.race;
    this.online = !!session.net;
    this.remote = (race.humans || []).filter(k => !k.isPlayer);   // humans on other devices
    this.humans = race.humans || race.players;
    this.panes = race.players.map((k, i) => ({ k, i, t: 0, target: k, doneT: 0, manual: false, panel: null, seen: new Set() }));
  }

  nameOf(k) { return this.s.names?.get(k.slot)?.name || k.racer.name; }
  colorOf(k) { const c = this.s.names?.get(k.slot)?.color; return c || '#' + k.racer.color.toString(16).padStart(6, '0'); }

  /** The remote humans still racing, best placed first, leaving out anyone another pane already shows when there is a choice. */
  _pick(p) {
    const open = this.remote.filter(k => !k.finished).sort((a, b) => a.rank - b.rank);
    const free = open.filter(k => !this.panes.some(q => q !== p && q.target === k));
    return free[0] || open[0] || null;
  }

  _aim(p, kart, manual) {
    const cam = this.s.view.cams[p.i];
    p.manual = manual; if (p.target === kart) return;
    p.target = kart; p.doneT = 0;
    if (!cam) return;
    cam.kart = kart; cam.mode = kart.finished ? 'orbit' : 'chase'; cam.t = 0; cam.snap();
    const hud = this.s.huds[p.i]; if (hud) hud.mapWatch = kart === p.k ? null : kart;
  }

  /** Left or right from a player's controls or the card's arrows: the next person in race order, yourself included. */
  step(i, dir) {
    const p = this.panes[i]; if (!p?.k.finished || !this.remote.length) return false;
    const ring = [p.k, ...this.remote].sort((a, b) => a.rank - b.rank), at = ring.indexOf(p.target);
    this._aim(p, ring[(at + dir + ring.length) % ring.length], true);
    return true;
  }
  /** Which pane a device's left and right belong to. */
  paneFor(device) {
    const assign = this.s.app.input.assign || ['any'];
    const i = assign.findIndex(d => d === 'any' || d === device);
    return i >= 0 ? i : this.panes.findIndex(p => p.k.finished);
  }

  frame(dt) {
    const s = this.s;
    let boardShown = false;
    for (const p of this.panes) {
      const cam = s.view.cams[p.i], hud = s.huds[p.i];
      if (!p.k.finished || !cam) continue;
      p.t += dt;
      if (!p.after) { p.after = true; hud?.root.classList.add('hud-after'); if (p.i === 0) s.touch?.root.classList.add('done'); }
      const t = p.target;
      if (t !== p.k && t.finished) p.doneT += dt;
      // who to show: your own finish first; then whoever is still racing; someone who just finished gets their moment
      if (p.t > CELEBRATE) {
        if (t === p.k) { if (!p.manual) { const next = this._pick(p); if (next) this._aim(p, next, false); } }
        else if (t.finished && p.doneT > THEIRS) { const next = this._pick(p); if (next || !p.manual) this._aim(p, next || p.k, false); }
      }
      if (cam.kart.finished && cam.mode !== 'orbit') { cam.mode = 'orbit'; cam.t = 0; }
      // the others' news, in this player's feed: each person who gets home
      for (const k of this.remote) if (k.finished && !p.seen.has(k)) { p.seen.add(k); if (p.t > 0.5) hud?.feed(`<b>${esc(this.nameOf(k))}</b> finished ${k.finishRank || k.rank}${ordinalSuffix(k.finishRank || k.rank)}`, 3200); }
      if (!this.online || !hud) continue;
      if (!p.panel) p.panel = new WatchPanel(hud, { onStep: d => this.step(p.i, d), onPick: k => this._aim(p, k, true) });
      const board = !boardShown; boardShown = true;
      p.panel.render(this._state(p, board));
    }
  }

  _state(p, board) {
    const race = this.s.race, laps = race.laps, len = race.track.length || 1;
    const row = k => {
      const lap = Math.min(Math.max(k.lap, 1), laps);
      return { kart: k, name: this.nameOf(k), color: this.colorOf(k), me: race.players.includes(k), finished: k.finished, rank: k.finished ? (k.finishRank || k.rank) : k.rank,
        lap, laps, prog: k.finished ? 1 : Math.min(1, Math.max(0, (k.lap - 1 + Math.min(Math.max(k.s / len, 0), 1)) / laps)), time: k.finished && !k.dnfEstimate ? k.finishTime : 0 };
    };
    const rows = this.humans.map(row).sort((a, b) => a.rank - b.rank);
    const target = rows.find(r => r.kart === p.target) || row(p.target);
    const net = this.s.net, until = net?.room?.until, left = until ? (until - net.conn.now()) / 1000 : null;
    // the card names who is on screen: it waits through your own finish, and shows yourself only when you chose to look
    return { target: this.remote.length && (p.target !== p.k || p.manual) ? target : null, rows, board, switchable: this.remote.length > 0, until: left != null && left >= 0 && left < GRACE_SHOWN ? left : null };
  }

  dispose() { for (const p of this.panes) p.panel?.dispose(); }
}

const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
