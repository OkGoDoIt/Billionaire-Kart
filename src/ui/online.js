/* Online play's screens and the flow between them (docs/online-protocol.md). Loaded with import() the first time
   the player goes online (App.goOnline), so the offline game never fetches it; it in turn loads the connection
   and the race netcode the same way. Every screen is a Menus screen (s_<name>) added to the app's Menus, built
   from the menu's own pieces; styles/online.css only arranges them.

   The room is the truth: every {t:"room"} goes through route(), which shows the screen for the room's phase
   (lobby, track, race, results) and lets the screen already showing update itself in place. */
import * as THREE from 'three';
import { h, hex, PLAYER_COLORS, LEVELS, CC_LIST } from './menus.js';
import { RACERS, RACER_BY_ID } from '../content/racers.js';
import { TRACKS, TRACK_BY_ID } from '../content/tracks.js';
import { CUPS, CUP_BY_ID, cupOrder } from '../content/cups.js';
import { CLASSES } from '../race/kart.js';
import { RaceSession } from '../game/session.js';
import { fmtTime } from '../core/util.js';
import { HANDLE_TITLES, handleName } from '../content/handles.js';
import { tierOf, fmtMoney, fmtMoneyChange } from '../content/valuation.js';

/* eight members, eight colors: the four player colors, then four more in the same bright family */
const COLORS = [...PLAYER_COLORS, '#a66bff', '#ff9f43', '#ff8ad8', '#b4f05a'];
const CODE_LETTERS = 'BCDFGHJKLMNPQRSTVWXZ';
const LOCAL = ['localhost', '127.0.0.1', '[::1]'].includes(location.hostname);
const QS = new URLSearchParams(location.search);
const BACKSPACE_SVG = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 5h11v14H9l-6-7z" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linejoin="round"/><path d="m12 9 5 6m0-6-5 6" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/></svg>';
const CAMERA_SVG = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 8.5A2.5 2.5 0 0 1 5.5 6h2l1.6-2h5.8l1.6 2h2A2.5 2.5 0 0 1 21 8.5v9a2.5 2.5 0 0 1-2.5 2.5h-13A2.5 2.5 0 0 1 3 17.5z" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linejoin="round"/><circle cx="12" cy="13" r="3.6" fill="none" stroke="currentColor" stroke-width="2.4"/></svg>';
const KEYS_SVG = '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="2.5" y="6" width="19" height="12" rx="2.5" fill="none" stroke="currentColor" stroke-width="2.4"/><path d="M6.5 10h1M10.5 10h1M14.5 10h1M8 14h8" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg>';
const CLOSED = 'That room has closed.', UNREACHABLE = 'Can’t reach the race server.';
const NBSP = '\u00a0';
const UPDATING = 'The race server is updating. Back in a moment.', UPDATED = 'That room closed for an update.';
const JOIN_ERRORS = { no_room: 'No room has that code.', full: 'That room is full.' };

/** The room code in a scanned QR code or a pasted link ("https://…/?room=BCDF"), or a bare code; null if neither. */
function roomFromText(text) {
  let code = String(text || '').trim();
  try { code = new URL(code).searchParams.get('room') || ''; } catch { /* not a link: maybe the code itself */ }
  code = code.toUpperCase();
  return code.length === 4 && [...code].every(c => CODE_LETTERS.includes(c)) ? code : null;
}
/** A room's address: what Share sends and what the QR code holds. */
const roomUrl = code => location.origin + location.pathname + '?room=' + code;
/** The QR code for a room's address as SVG: dark modules on white, with the quiet zone the readers need. */
function qrSvg(encode, code) {
  const { data, size } = encode(roomUrl(code), { ecc: 'M', border: 2 });
  let d = '';
  data.forEach((row, y) => { for (let x = 0; x < size; x++) { if (!row[x]) continue; let w = 1; while (row[x + w]) w++; d += `M${x} ${y}h${w}v1h-${w}z`; x += w - 1; } });
  return `<svg viewBox="0 0 ${size} ${size}" shape-rendering="crispEdges" aria-hidden="true"><rect width="${size}" height="${size}" fill="#fff"/><path d="${d}" fill="#12142b"/></svg>`;
}

/** "0:14" from a server time. */
const clockText = ms => { const s = Math.max(0, Math.ceil(ms / 1000)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };
const levelName = id => (LEVELS.find(l => l[0] === id) || LEVELS[1])[1];
/** "Single races · 150cc · Competitive CPUs · Everyone picks the track" */
function rulesLine(rules) {
  const parts = [rules.mode === 'cup' ? (CUP_BY_ID[rules.cup]?.name || 'Cup') : 'Single races', CLASSES[rules.cc]?.label || `${rules.cc}cc`, rules.cpus ? `${levelName(rules.level)} CPUs` : 'No CPUs'];
  if (rules.mode !== 'cup') parts.push(rules.pick === 'host' ? 'Host picks the track' : 'Everyone picks the track');
  return parts.join(' · ');
}

export class Online {
  constructor(app) {
    this.app = app; this.menus = app.menus;
    this.conn = null; this.Conn = null; this.NetRace = null;
    this.me = null;            // { id, handle, rating: { valuation, races } } from /api/session
    this.room = null;          // the latest room, or null when not in one
    this.state = 'idle';       // idle | connecting | ready | failed
    this.notice = null;        // one line for the hub ("That room has closed.")
    this.names = new Map();    // member id -> { handle, name }, kept after they leave so results can still name them
    this.attempt = 0; this.leaving = false; this.joining = null; this.pendingRacer = null; this.askedRacer = null; this.startedN = null; this.standingsSeen = null;
    // development only (this machine): ?netauto=1 hands this device's kart to the autopilot, ?netlaps=1 shortens races (every device must use the same)
    this.auto = LOCAL && QS.get('netauto') === '1';
    this.laps = LOCAL ? +QS.get('netlaps') || 0 : 0;
    this.css = new Promise(resolve => {
      const link = h('link', { rel: 'stylesheet', href: new URL('../../styles/online.css', import.meta.url).href });
      link.addEventListener('load', resolve); link.addEventListener('error', resolve);
      document.head.appendChild(link);
    });
    for (const name of ['online', 'onlineName', 'onlineJoin', 'onlineRoom', 'onlinePublic', 'onlineRacers', 'onlineRules', 'onlineTrack', 'onlineResults', 'onlineBoard', 'onlinePause'])
      this.menus['s_' + name] = params => this['s_' + name](params || {});
    this.pill = null; this.banner = null;
    this.qr = import('../../vendor/uqr/uqr.js').then(m => m.encode).catch(() => null);   // the room card's QR code
    // scanning needs a camera: phones and tablets have one; a computer is asked which devices it has
    const canScan = !!(navigator.mediaDevices?.getUserMedia && window.isSecureContext);
    this.hasCamera = !canScan ? Promise.resolve(false) : matchMedia('(pointer: coarse)').matches ? Promise.resolve(true)
      : navigator.mediaDevices.enumerateDevices().then(d => d.some(x => x.kind === 'videoinput')).catch(() => false);
  }

  /* ---------- connection ---------- */

  get you() { return this.conn?.you || this.me?.id || null; }
  mine(room = this.room) { return room?.members.find(m => m.id === this.you) || null; }
  colorOf(id, room = this.room) { const i = room ? room.members.findIndex(m => m.id === id) : -1; return COLORS[(i < 0 ? 0 : i) % COLORS.length]; }
  /** What a member is called here: a typed name in a friends' room, otherwise (and always in a public room) the handle. */
  nameOf(id, room = this.room) { const n = this.names.get(id); return !n ? handleName(null) : !room?.public && n.name ? n.name : handleName(n.handle); }
  get savedName() { return this.app.save.data.online?.name || ''; }
  saveName(name) { this.app.save.data.online = { ...(this.app.save.data.online || {}), name }; this.app.save.write(); }
  now() { return this.conn ? this.conn.now() : performance.now(); }

  /** From the main menu (or a ?room= link): the hub, connecting first. */
  async enter({ room: code = null } = {}) {
    if (code) { const u = new URL(location.href); u.searchParams.delete('room'); history.replaceState(history.state, '', u); }
    await this.css;
    this.notice = null;
    this.pendingJoin = code ? String(code).toUpperCase().replace(/[^A-Z]/g, '').slice(0, 4) : null;
    this.show('online');
    if (!this.conn) this.connect();
    else if (this.conn.ready && this.pendingJoin) { this.join(this.pendingJoin); this.pendingJoin = null; }
  }

  async connect() {
    const attempt = ++this.attempt;
    this.state = 'connecting'; this.refreshHub();
    try {
      const res = await fetch('/api/session', { method: 'POST', credentials: 'same-origin' });
      if (!res.ok) throw new Error('session ' + res.status);
      const me = await res.json();
      if (!this.NetRace) {
        const [c, n] = await Promise.all([import('../net/conn.js'), import('../net/netrace.js')]);
        this.Conn = c.Conn; this.NetRace = n.NetRace;
      }
      if (attempt !== this.attempt) return;
      this.me = me;
    } catch {
      if (attempt === this.attempt) { this.state = 'failed'; this.refreshHub(); }
      return;
    }
    const conn = this.conn = this.Conn.open({ build: '' });
    conn.on('welcome', () => this._welcome(conn));
    conn.on('room', m => { if (conn === this.conn) this.route(m.room); });
    conn.on('err', m => { if (conn === this.conn) this._err(m.code); });
    // the server is restarting for an update (docs/online-protocol.md, "Server updates"): say so calmly and keep the
    // screen; the room's countdowns stop showing (this.bye), since nothing moves on until the server is back
    conn.on('bye', () => { if (conn === this.conn) { this.bye = true; this.setPill(UPDATING, true); } });
    conn.on('close', () => {
      if (conn !== this.conn) return;
      if (!this.bye) { this.setPill('Reconnecting…'); return; }
      this.byeClosed = true; this.setPill(UPDATING, true);
      // cut off mid-race: the race is over; lobbies, track picks, and results wait for the server to come back
      if (this.room?.phase === 'race' && this.inRace()) this.roomClosed(UPDATED);
    });
    conn.on('old', () => this._old());
    // the socket cannot be reached: Conn keeps retrying on its own, but the player is told after a few seconds
    clearTimeout(this.welcomeTimer);
    this.welcomeTimer = setTimeout(() => { if (conn === this.conn && !conn.ready && this.state === 'connecting') { conn.close(); this.conn = null; this.state = 'failed'; this.refreshHub(); } }, 8000);
  }

  _welcome(conn) {
    if (conn !== this.conn) return;
    clearTimeout(this.welcomeTimer);
    this.setPill(null);
    const first = this.state !== 'ready', updated = this.byeClosed;
    this.state = 'ready'; this.bye = this.byeClosed = false;
    if (first) this.refreshHub();
    // back after an update: the new server has no rooms, so ours has gone
    if (updated && this.room) this.roomClosed(UPDATED);
    else if (updated && this.menus.screen?.spec.name === 'online') this.refreshHub();
    if (this.pendingJoin) { this.join(this.pendingJoin); this.pendingJoin = null; }
    // back after a drop: the server sends our room straight away if we still have a seat; if none comes, it has gone
    else if (!first && this.room && !this.leaving) {
      clearTimeout(this.lostTimer);
      this.lostTimer = setTimeout(() => { if (this.room && this.conn === conn) this.roomClosed(); }, 2500);
    }
  }

  _err(code) {
    const s = this.menus.screen;
    if (this.joining && JOIN_ERRORS[code]) {
      const msg = JOIN_ERRORS[code], c = this.joining; this.joining = null;
      if (s?.spec.name === 'onlineJoin') s.onError(msg); else this.show('onlineJoin', { code: c, error: msg });
    } else if (code === 'no_room' && this.room) this.roomClosed();
    else if (code === 'full' && !this.room) { this.notice = 'Every room is taken right now. Try again soon.'; if (s?.spec.name === 'online') this.refreshHub(); }
  }

  _old() {
    this.setPill('Updating the game…');
    const reload = () => location.reload();
    Promise.resolve(navigator.serviceWorker?.getRegistration?.()).then(r => r?.update()).catch(() => {}).finally(() => setTimeout(reload, 900));
  }

  /** The small pill at the top of the screen ("Reconnecting…"); null hides it. A calm one is news, not trouble. */
  setPill(text, calm = false) {
    if (!text) { this.pill?.remove(); this.pill = null; return; }
    if (!this.pill) { this.pill = h('div', { class: 'ol-pill', role: 'status' }); this.app.ui.prepend(this.pill); }
    this.pill.classList.toggle('calm', calm);
    this.pill.textContent = text;
  }
  setBanner(text) {
    if (!text) { this.banner?.remove(); this.banner = null; return; }
    if (!this.banner) { this.banner = h('div', { class: 'ol-banner', role: 'status' }); this.app.ui.appendChild(this.banner); }
    this.banner.textContent = text;
  }

  /** Back to the main menu: leave any room and close the connection. */
  exit() {
    this.leaveRoom();
    this.attempt++; clearTimeout(this.welcomeTimer); clearTimeout(this.lostTimer); this.bye = this.byeClosed = false;
    this.conn?.close(); this.conn = null; this.state = 'idle';
    this.setPill(null); this.setBanner(null);
  }

  /* ---------- rooms ---------- */

  create() { this.leaving = false; this.joining = null; this.conn?.send({ t: 'create' }); }
  find() { this.leaving = false; this.joining = null; this.conn?.send({ t: 'find' }); }
  join(code) { this.leaving = false; this.joining = code; this.conn?.send({ t: 'join', code }); }
  leaveRoom() {
    if (this.room && this.conn) this.conn.send({ t: 'leave' });
    this.room = null; this.leaving = true; this.joining = null; this.nameSentFor = null; this.pendingRacer = null; this.askedRacer = null; this.startedN = null;
    clearTimeout(this.lostTimer);
  }
  /** The room went away under us: back to the hub with one line saying so. */
  roomClosed(notice = CLOSED) {
    this.leaveRoom(); this.notice = notice;
    if (this.inRace()) this.toScene(() => this.show('online')); else this.show('online');
  }

  /** An online race is on screen (racing, or finished with its results over it). */
  inRace() { const s = this.app.session; return !!(s?.net && !this.app.attract); }

  /** Shows an online screen with the hub (and the main menu) behind it, so Back walks out the way the player came in. */
  show(name, params = {}) {
    const M = this.menus;
    M.reset(name, params);
    M.stack.push({ name: 'main', params: {} });
    if (name !== 'online') M.stack.push({ name: 'online', params: {} });
  }
  refreshHub() { const s = this.menus.screen; if (s?.spec.name === 'online') s.refresh(); }

  /** Leave the race scene for the menus' attract race, under the checker wipe. */
  toScene(fn) {
    const A = this.app;
    this.clearRace(); A._wake(false); A._lockLandscape(false);
    A.menus.close();
    A.transition(() => { A._attract(); fn(); A.audio?.music?.('menu'); });
  }

  /** Every room message: follow the room to the screen for its phase. */
  route(room) {
    if (this.leaving || !room) return;   // a room sent before the server saw us leave
    const prev = this.room; this.room = room; this.joining = null;
    clearTimeout(this.lostTimer);
    for (const m of room.members) this.names.set(m.id, { handle: m.handle, name: room.public ? null : m.name || null });
    const me = this.mine(room);
    // a friends' room: the name this player typed last time goes with them, once per room
    if (me && !room.public && this.nameSentFor !== room.code) { this.nameSentFor = room.code; const n = this.savedName; if (n && me.name !== n) this.conn.send({ t: 'name', name: n }); }
    if (me && this.me) { this.me.handle = me.handle; if (me.valuation != null) this.me.rating.valuation = me.valuation; }
    const M = this.menus, s = M.screen, name = s?.spec.name;
    // the racer we asked for: ours now (go back to where the player came from), or someone else's (stay and choose again)
    if (this.pendingRacer && me) {
      const want = this.pendingRacer;
      if (me.racer === want) { this.pendingRacer = null; if (name === 'onlineRacers') { M.back(); return this.route(room); } }
      else if (room.members.some(m => m.id !== me.id && m.racer === want)) this.pendingRacer = null;
    }
    switch (room.phase) {
      case 'lobby': {
        const home = room.public ? 'onlinePublic' : 'onlineRoom';
        if (this.inRace()) { this.toScene(() => this.show(home)); break; }
        // looking for a friend's room from our own: stay on the join screen until someone joins ours
        if (name === 'onlineJoin' && prev?.code === room.code && room.members.length < 2) break;
        const here = room.public ? ['onlinePublic', 'onlineRacers'] : ['onlineRoom', 'onlineRacers', 'onlineRules'];
        if (here.includes(name) && prev?.code === room.code) { s.onRoom?.(room); break; }
        this.show(home);
        if (this.askedRacer !== room.code && me && !me.racer) {
          this.askedRacer = room.code;
          // a private room asks for a racer first; a public one quietly takes the last racer this player used
          if (room.public) { const last = this.app.save.data.last.racer[0]; if (RACER_BY_ID[last] && !room.members.some(m => m.racer === last)) this.conn.send({ t: 'racer', id: last }); }
          else this.openRacers();
        }
        break;
      }
      case 'track':
        if (this.inRace() || name === 'onlineResults') this.toScene(() => this.show('onlineTrack'));
        else if (name === 'onlineTrack') s.onRoom(room);
        else this.show('onlineTrack');
        break;
      case 'race': {
        const n = room.race?.n;
        if (n == null || this.startedN === n || this.app.session?.net?.raceN === n) break;
        this.startedN = n;
        if (name === 'onlineTrack' && prev?.phase === 'track' && s.roulette) s.roulette(room, () => this.startRace());
        else this.startRace();
        break;
      }
      case 'results':
        if (this.inRace() && !this.app.session.reported) break;   // the race calls raceDone itself on its next frame
        if (name === 'onlineResults') s.onRoom(room); else this.showResults();
        break;
    }
  }

  openRacers() { this.app.flow = { mode: 'online', players: 1, racers: [], devices: ['any'] }; this.menus.open('onlineRacers'); }
  chooseRacer(r) {
    if (this.mine()?.racer === r.id) { this.menus.back(); return; }
    this.pendingRacer = r.id; this.conn.send({ t: 'racer', id: r.id });
  }

  /* ---------- the race ---------- */

  startRace() {
    const A = this.app;
    A.menus.close(); A._turnOk = false; A._wake(true); A._lockLandscape(true);
    this.clearRace();
    return A.transition(() => {
      A._clearScene();
      const room = this.room;
      if (room?.phase !== 'race' || !room.race) { this.show('online'); return; }
      const session = A.session = new RaceSession(A, { net: { conn: this.conn, room, me: this.you, NetRace: this.NetRace }, auto: this.auto });
      if (this.laps) session.race.laps = this.laps;
      const def = TRACK_BY_ID[room.race.trackId], cs = room.cupState, cup = room.rules.mode === 'cup' && CUP_BY_ID[room.rules.cup];
      const cupLine = cup && cs ? `${cup.name} · Race ${cs.index + 1} of ${cs.tracks.length}` : '';
      const card = A.trackCard = h('div', { class: 'track-card' }, cupLine && h('div', { class: 'cup-line' }, cupLine), h('h1', {}, def.name), h('p', {}, def.tagline || ''));
      A.ui.appendChild(card);
      setTimeout(() => { if (A.trackCard === card) A.onCountdown(); }, 2600);
      A.audio?.music?.(def.music || def.id);
      A.audio?.say?.('track_' + def.id, { force: true, delay: 0.7 });
      A._onTurn();
      if (!session.race.players.length) this.setBanner('Race in progress. You are in the next one.');
      this.tagHumans(session, room);
    });
  }
  clearRace() { this.setBanner(null); }

  /** The other humans' karts wear their handle on the name tag over the kart, in place of the racer's name. */
  tagHumans(session, room) {
    // what the after-the-line board and card call each human: the same name and color as their tag
    session.names = new Map(room.race.slots.filter(s => s.member).map(s => [s.slot, { name: s.member === this.you ? 'You' : this.nameOf(s.member, room), color: this.colorOf(s.member, room) }]));
    for (const kv of session.view.karts) {
      const k = kv.kart, slot = room.race.slots.find(s => s.slot === k.slot);
      if (!k.human || k.isPlayer || !slot?.member || !kv.tag) continue;
      const text = this.nameOf(slot.member, room), color = this.colorOf(slot.member, room);
      const c = document.createElement('canvas'); c.width = 384; c.height = 72;
      const g = c.getContext('2d');
      g.font = '34px "Luckiest Guy", "Arial Black", sans-serif';
      const tw = Math.min(c.width - 36, g.measureText(text).width), bw = tw + 44, x = (c.width - bw) / 2;
      g.fillStyle = 'rgba(14,16,34,0.82)'; g.beginPath(); g.roundRect(x, 8, bw, 50, 25); g.fill();
      g.fillStyle = color; g.beginPath(); g.roundRect(x, 8, 12, 50, [25, 0, 0, 25]); g.fill();
      g.fillStyle = '#fff'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(text, c.width / 2 + 4, 35);
      const old = kv.tag.material.map, tex = new THREE.CanvasTexture(c);
      tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = old.anisotropy; tex.minFilter = old.minFilter; tex.generateMipmaps = old.generateMipmaps;
      kv.tag.material.map = tex; kv.tag.material.needsUpdate = true; old.dispose();
      kv.tag.scale.x *= c.width / 256; kv.tag.userData.wFrac = bw / c.width;
    }
  }

  /** Called by App.onRaceDone when the server has the results: the results over the finished race. */
  raceDone(session) {
    const A = this.app;
    if (session !== A.session) return;
    for (const hd of session.huds) hd.setVisible(false);
    session.touch?.setVisible(false); A._lockLandscape(false); A._wake(false); document.body.classList.remove('must-turn');
    this.clearRace();
    this.showResults();
    const mine = this.room?.last?.results.find(r => r.member === this.you);
    A.audio?.event?.('results', mine?.rank);
    A.audio?.music?.('results');
  }
  showResults() { if (this.room?.last) this.show('onlineResults'); }

  leaveRace() { this.leaveRoom(); this.toScene(() => this.show('online')); }

  /* ---------- screens ---------- */

  /** Hub: who you are, and the ways in. */
  s_online() {
    const M = this.menus, body = h('div', { class: 'ol-hub' });
    const draw = () => {
      if (this.state === 'failed') {
        body.replaceChildren(h('div', { class: 'ol-state' }, h('h2', {}, UNREACHABLE), h('div', { class: 'foot' }, M.btn('Try again', () => this.connect(), { cls: 'go', def: true }), M.btn('Back', () => M.back()))));
      } else if (this.state !== 'ready' || !this.me) {
        body.replaceChildren(h('div', { class: 'ol-state' }, h('h2', {}, 'Connecting…')));
      } else {
        const v = this.me.rating?.valuation ?? 0, t = tierOf(v);
        body.replaceChildren(...[
          h('div', { class: 'panel ol-id' },
            h('div', { class: 'ol-id-text' }, h('div', { class: 'ol-handle' }, handleName(this.me.handle)), h('div', { class: 'ol-tier' }, `${t.name} · ${fmtMoney(v)}`),
              h('span', { class: 'ol-bar', role: 'img', 'aria-label': t.next ? `Progress to ${t.next.name}` : 'Top tier' }, h('i', { style: `--p:${Math.round(t.progress * 100)}%` }))),
            M.btn('Change name', () => M.open('onlineName'), { cls: 'small' })),
          this.notice && h('p', { class: 'ol-line ol-notice' }, this.notice),
          h('div', { class: 'ol-modes' },
            M.btn('Race with Friends', () => this.create(), { cls: 'big c4', def: true, sub: 'A private room. Send them the link.' }),
            M.btn('Find a Race', () => this.find(), { cls: 'big c1', sub: 'Strangers, CPUs, and your valuation on the line.' })),
          h('div', { class: 'row' }, M.btn('Join with a code', () => M.open('onlineJoin'), { cls: 'small' }), M.btn('Rich List', () => M.open('onlineBoard'), { cls: 'small' }))].filter(Boolean));
      }
      const first = body.querySelector('[data-f][data-default]') || body.querySelector('[data-f]');
      if (M.screen?.el.contains(body) || !M.screen) M.focus(first || M.screen?.el.querySelector('.back'), false);
    };
    const el = h('div', {}, M.header('Online'), body);
    draw();
    return { el, refresh: draw, onBack: () => { this.exit(); } };
  }

  /** Change name: one of the 200 titles; the number never changes. */
  s_onlineName() {
    const M = this.menus, cur = this.me?.handle?.title;
    let busy = false;
    const pick = async i => {
      if (busy) return; busy = true;
      try {
        const res = await fetch('/api/handle', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title: i }) });
        if (res.ok) this.me = { ...this.me, ...(await res.json()) };
      } catch { /* unchanged */ }
      if (M.screen?.spec.name === 'onlineName') M.back();
    };
    const chips = HANDLE_TITLES.map((t, i) => h('button', { class: 'chip' + (i === cur ? ' sel' : ''), 'data-f': true, 'data-default': i === cur, onclick: () => pick(i) }, t));
    return { el: h('div', {}, M.header('Pick your title', 'Your number stays yours.'), h('div', { class: 'panel ol-names' }, chips)) };
  }

  /** Join with a code: four boxes, twenty letters, and a delete key; typing works too. Or the camera: point it at
      a friend's room card and the code fills itself in. ({ scan: true } opens on the camera.) */
  s_onlineJoin({ code = '', error = null, scan = false }) {
    const M = this.menus;
    let text = (code || '').slice(0, 4), stale = !!error, scanning = false, closed = false;
    const boxes = [0, 1, 2, 3].map(() => h('div', { class: 'ol-box' })), boxRow = h('div', { class: 'ol-boxes', 'aria-label': 'Room code' }, boxes);
    const err = h('p', { class: 'ol-err', role: 'status' }, error || NBSP);
    const say = (msg, bad = true) => { err.textContent = msg || NBSP; err.classList.toggle('ok', !bad); };
    const draw = () => boxes.forEach((b, i) => { b.textContent = text[i] || ''; b.classList.toggle('on', i === Math.min(text.length, 3) && !(stale && text.length === 4)); });
    const submit = c => {
      if (c === this.room?.code) { say('That’s your own room.'); stale = true; draw(); return; }
      this.join(c);
    };
    const add = c => {
      if (scanning) setScan(false);
      if (stale) { text = ''; stale = false; say(''); }
      if (text.length >= 4) return;
      text += c; draw(); this.app.audio?.ui('move');
      if (text.length === 4) submit(text);
    };
    const del = () => { if (stale) { stale = false; say(''); } text = text.slice(0, -1); draw(); this.app.audio?.ui('back'); };
    const keys = [...CODE_LETTERS].map((c, i) => h('button', { class: 'ol-key', 'data-f': true, 'data-default': i === 0, onclick: () => add(c) }, c));
    keys.push(h('button', { class: 'ol-key ol-del', 'data-f': true, 'aria-label': 'Delete a letter', onclick: del, html: BACKSPACE_SVG }));
    const keyGrid = h('div', { class: 'ol-keys' }, keys);

    /* the camera: a square viewfinder; every 150 ms its middle goes to the reader (qr-worker.js) until a room code turns up */
    const video = h('video', { muted: true, playsinline: true, autoplay: true, 'aria-hidden': 'true' });
    video.muted = true;
    const finder = h('div', { class: 'ol-scan', hidden: true }, video, h('span', { class: 'ol-finder' }));
    const canvas = document.createElement('canvas'), g = canvas.getContext('2d', { willReadFrequently: true });
    let stream = null, worker = null, timer = null, busy = false;
    const stopCam = () => {
      clearInterval(timer); timer = null; worker?.terminate(); worker = null; busy = false;
      stream?.getTracks().forEach(t => t.stop()); stream = null; video.srcObject = null;
    };
    const grab = () => {
      if (busy || !worker || video.readyState < 2 || !video.videoWidth) return;
      const vw = video.videoWidth, vh = video.videoHeight, side = Math.min(vw, vh), n = Math.min(side, 640);
      canvas.width = canvas.height = n;
      g.drawImage(video, (vw - side) / 2, (vh - side) / 2, side, side, 0, 0, n, n);
      const img = g.getImageData(0, 0, n, n);
      busy = true; worker.postMessage({ data: img.data.buffer, width: n, height: n }, [img.data.buffer]);
    };
    const read = found => {
      busy = false;
      if (!found || !scanning) return;
      const c = roomFromText(found);
      if (!c) { say('That isn’t a room code.'); return; }
      setScan(false); text = c; stale = false; draw(); this.app.audio?.ui('select');
      submit(c);
    };
    const startCam = async () => {
      let s;
      try { s = await navigator.mediaDevices.getUserMedia({ audio: false, video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } } }); }
      catch (e) { if (!closed && scanning) { setScan(false); say(e?.name === 'NotAllowedError' ? 'The camera is off for this game. Type the code instead.' : 'No camera found. Type the code instead.'); } return; }
      if (closed || !scanning) { s.getTracks().forEach(t => t.stop()); return; }
      stream = s; video.srcObject = s; video.play().catch(() => {});
      worker = new Worker(new URL('./qr-worker.js', import.meta.url));
      worker.onmessage = e => read(e.data);
      timer = setInterval(grab, 150);
    };
    const scanBtn = M.btn('Scan a QR code', () => setScan(!scanning), { cls: 'c1 ol-scan-btn', icon: h('span', { html: CAMERA_SVG }) });
    const scanLabel = scanBtn.querySelector('.btn-label'), scanIcon = scanBtn.querySelector('.btn-ico > span');
    scanBtn.hidden = true;
    const setScan = on => {
      if (on === scanning) return;
      scanning = on; finder.hidden = !on; keyGrid.hidden = on; boxRow.hidden = on;
      scanLabel.textContent = on ? 'Type the code' : 'Scan a QR code'; scanIcon.innerHTML = on ? KEYS_SVG : CAMERA_SVG;
      if (on) { text = ''; stale = false; say('Point your camera at your friend’s room code.', false); startCam(); M.focus(scanBtn, false); }
      else { stopCam(); say(''); if (!M.focusEl || M.focusEl === scanBtn || M.focusEl.offsetParent === null) M.focus(keys[0], false); }
      draw();
    };
    this.hasCamera.then(ok => { if (closed || !ok) return; scanBtn.hidden = false; if (scan) setScan(true); });

    // physical keys: letters type (D, M, P, R, S, and W would otherwise move, mute, or pause), Backspace deletes while there is something to delete
    const onKey = e => {
      if (e.ctrlKey || e.metaKey || e.altKey || e.repeat) return;
      const c = e.key.length === 1 ? e.key.toUpperCase() : '';
      if (c && CODE_LETTERS.includes(c)) { e.preventDefault(); e.stopImmediatePropagation(); add(c); }
      else if (e.key === 'Backspace' && text.length) { e.preventDefault(); e.stopImmediatePropagation(); del(); }
    };
    addEventListener('keydown', onKey, true);
    draw();
    const el = h('div', {}, M.header('Join a room'), h('div', { class: 'ol-join' }, boxRow, err, keyGrid, finder, scanBtn));
    return {
      el,
      onClose: () => { closed = true; stopCam(); removeEventListener('keydown', onKey, true); },
      onError: msg => { if (scanning) setScan(false); say(msg); stale = true; draw(); },
    };
  }

  /** "Who is here": one row per member (color, face, name, tags), kept by member so that the name field on your own
      row in a friends' room keeps its focus and its text while the room updates around it. With changeRacer, your
      own row is your whole card: your racer, your name, and the way to change racer. */
  memberList({ valuation = false, changeRacer = false } = {}) {
    const M = this.menus;
    const el = h('div', { class: 'join-list ol-members' }), rows = new Map();
    let field = null, debounce = null;
    const nameField = () => {
      if (field) return field;
      field = h('input', { class: 'ol-name-in', type: 'text', 'data-f': true, 'data-nohover': true, maxlength: 16, autocomplete: 'off', autocapitalize: 'words', enterkeyhint: 'done', spellcheck: 'false', 'aria-label': 'Your name' });
      field.value = this.savedName;
      const send = () => { clearTimeout(debounce); debounce = null; const v = field.value; if (v !== this.savedName) this.saveName(v); if (this.room && !this.room.public) this.conn?.send({ t: 'name', name: v }); };
      field.addEventListener('input', () => { clearTimeout(debounce); debounce = setTimeout(send, 400); });
      field.addEventListener('blur', send);
      // while the field has the keyboard, keys type into it rather than drive the menu; Enter and Escape hand it back, and up and down move on
      field.addEventListener('keydown', e => {
        if (e.key === 'Enter' || e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); field.blur(); return; }
        if (e.key === 'ArrowUp' || e.key === 'ArrowDown' || e.key === 'Tab') return;
        e.stopPropagation();
      });
      return field;
    };
    const update = room => {
      const order = room.members.map(m => m.id);
      for (const id of [...rows.keys()]) if (!order.includes(id)) rows.delete(id);
      for (const m of room.members) {
        let row = rows.get(m.id);
        if (!row) {
          row = { el: h('div', { class: 'join-slot in ol-member' }), face: h('span'), who: h('span', { class: 'ol-who' }), line: h('b'), sub: h('small'), tags: h('span', { style: 'display:contents' }) };
          row.who.append(row.line, row.sub); row.el.append(row.face, row.who, row.tags); rows.set(m.id, row);
        }
        const color = this.colorOf(m.id, room), racer = RACER_BY_ID[m.racer], me = m.id === this.you;
        row.el.style.setProperty('--pc', color); row.el.classList.toggle('away', !m.connected);
        const card = me && changeRacer;
        row.el.classList.toggle('mine', card);
        if (card && !row.btn) { row.btn = M.btn(racer ? 'Change racer' : 'Pick a racer', () => this.openRacers(), { cls: 'small ol-change' }); row.el.appendChild(row.btn); }
        if (row.btn) row.btn.querySelector('.btn-label').textContent = racer ? 'Change racer' : 'Pick a racer';
        const face = racer ? h('img', { class: 'ol-face', src: racer.portrait, alt: '', style: `--rc:${hex(racer.color)}` }) : h('span', { class: 'ol-face empty' });
        if (row.faceKey !== m.racer) { row.face.replaceWith(face); row.face = face; row.faceKey = m.racer; }
        if (me && !room.public) {
          const f = nameField();
          f.placeholder = handleName(m.handle);
          if (!row.line.contains(f)) row.line.replaceChildren(f);
        } else row.line.textContent = this.nameOf(m.id, room);
        row.sub.textContent = card ? (racer ? `${racer.name} · ${racer.title}` : 'No racer yet') : (racer ? racer.name : 'Choosing a racer') + (me ? ' (you)' : '') + (valuation && m.valuation != null ? ` · ${fmtMoney(m.valuation)}` : '');
        row.tags.replaceChildren(...[!room.public && room.host === m.id && h('span', { class: 'ol-tag' }, 'Host'),
          !m.connected && h('span', { class: 'ol-tag away' }, 'Reconnecting')].filter(Boolean));
      }
      const want = order.map(id => rows.get(id).el);
      if (want.length !== el.children.length || want.some((r, i) => el.children[i] !== r)) el.replaceChildren(...want);
    };
    return { el, update, flush: () => { if (debounce) field.dispatchEvent(new Event('blur')); } };
  }

  /** Room (private, lobby): the code to share, who is here, the rules, and Start for the host. */
  s_onlineRoom() {
    const M = this.menus, room = this.room;
    if (!room) return this.s_online();
    const code = room.code, url = roomUrl(code);
    const share = M.btn('Share link', async () => {
      if (navigator.share) { try { await navigator.share({ title: 'Billionaire Kart', text: `Join my Billionaire Kart room: ${code}`, url }); } catch { /* dismissed */ } return; }
      try { await navigator.clipboard.writeText(url); } catch {
        const ta = h('textarea', { style: 'position:fixed;opacity:0' }); ta.value = url; document.body.appendChild(ta); ta.select();
        try { document.execCommand('copy'); } catch { /* nothing more to try */ } ta.remove();
      }
      label.textContent = 'Link copied'; clearTimeout(share.t); share.t = setTimeout(() => { label.textContent = 'Share link'; }, 2000);
    }, { cls: 'small' }), label = share.querySelector('.btn-label');
    const list = this.memberList({ changeRacer: true }), members = list.el;
    /* the code as a QR code, for a friend in the same room to scan from the join screen (or their camera app);
       a tap shows it big, for scanning from across the table */
    const qr = h('button', { class: 'ol-qr', 'data-f': true, 'aria-label': 'Show the QR code bigger', onclick: () => setBig(true) });
    const big = h('button', { class: 'ol-qr-big', hidden: true, 'aria-label': 'Close', onclick: () => setBig(false) }, h('span', { class: 'ol-qr-img' }), h('span', { class: 'ol-code' }, code));
    const setBig = on => { big.hidden = !on; M.focus(on ? big : qr, false); };
    this.qr.then(encode => { if (!encode) { qr.hidden = true; return; } const svg = qrSvg(encode, code); qr.innerHTML = svg; big.firstChild.innerHTML = svg; });
    /* alone in the room: the way into a friend's instead, gone as soon as anyone joins */
    const scanInstead = M.btn('Scan their code', () => M.open('onlineJoin', { scan: true }), { cls: 'small', icon: h('span', { html: CAMERA_SVG }) });
    scanInstead.hidden = true;
    this.hasCamera.then(ok => { scanInstead.hidden = !ok; });
    const instead = h('div', { class: 'panel ol-instead' }, h('h3', {}, 'Joining a friend?'),
      h('div', { class: 'ol-instead-btns' }, scanInstead, M.btn('Type their code', () => M.open('onlineJoin'), { cls: 'small' })));
    // the grid: your code and, while you are alone, the way into a friend's room beside it; who is here below
    const grid = h('div', { class: 'ol-room' },
      h('div', { class: 'panel ol-code-card' }, qr, h('div', { class: 'ol-code-side' }, h('div', { class: 'ol-code', 'aria-label': `Room code ${code.split('').join(' ')}` }, code), share)),
      instead, members);
    const rules = h('span', { class: 'ol-line' });
    const rulesBtn = M.btn('Change rules', () => M.open('onlineRules'), { cls: 'small' });
    const foot = h('div', { class: 'foot ol-foot' });
    const start = M.btn('Start', () => this.conn.send({ t: 'start' }), { cls: 'go' }), startLabel = start.querySelector('.btn-label');
    const standings = h('div', { style: 'display:contents' });
    let hostShown = null;
    const update = r => {
      const amHost = r.host === this.you;
      list.update(r);
      instead.hidden = r.members.length > 1; grid.classList.toggle('alone', r.members.length < 2); members.classList.toggle('many', r.members.length > 4);
      rules.textContent = rulesLine(r.rules);
      rulesBtn.hidden = !amHost;
      const ready = r.members.every(m => !m.connected || m.racer);
      start.disabled = !ready; startLabel.textContent = ready ? 'Start' : 'Waiting for everyone to pick a racer';
      start.toggleAttribute('data-default', ready);
      if (hostShown !== amHost) {
        const had = M.focusEl && foot.contains(M.focusEl);
        foot.replaceChildren(amHost ? start : h('p', { class: 'ol-wait' }, 'Waiting for the host to start.'));
        hostShown = amHost; if (had || (amHost && ready && !M.focusEl)) M.focus(start, false);
      }
      if (M.focusEl?.disabled || (M.focusEl && (!M.focusEl.isConnected || M.focusEl.offsetParent === null) && M.focusEl !== big)) M.focus(M.screen?.el.querySelector('[data-f]:not(.back):not(:disabled)'), false);
      // a cup that just ended: its final standings over the room, until the player is done with them
      const cs = r.cupState, cup = CUP_BY_ID[r.rules.cup], key = cs && r.last && `${code}:${cs.tracks.join()}:${r.last.trackId}`;
      if (key && cup && cs.index >= cs.tracks.length - 1 && this.standingsSeen !== key) {
        if (!standings.firstChild) {
          const rows = cupOrder(cs.totals, cs.places).map(id => [id, cs.totals[id]]);   // ties on countback; a server without places sorts on points alone
          const humans = new Map(r.last.results.filter(x => x.member).map(x => [x.racer, x.member]));
          const done = M.btn('Done', () => { this.standingsSeen = key; standings.replaceChildren(); M.focus(M.screen.el.querySelector('[data-f]:not(.back):not(:disabled)'), false); }, { cls: 'small go', def: true });
          standings.replaceChildren(h('div', { class: 'panel ol-standings' }, h('h3', {}, `${cup.name} · Final standings`),
            h('div', { class: 'res-table final' }, rows.map(([id, pts], i) => { const racer = RACER_BY_ID[id], who = humans.get(id); return h('div', { class: 'res-row' + (who === this.you ? ' me' : ''), style: `--d:${i * 50}ms;--rc:${hex(racer?.color || 0xffffff)}` + (who ? `;--pc:${this.colorOf(who, r)}` : '') }, h('b', { class: 'res-rank' }, String(i + 1)), h('img', { src: racer?.portrait, alt: '' }), h('span', { class: 'res-name' }, racer?.name || id), h('span', { class: 'res-total' }, String(pts))); })),
            h('div', { class: 'foot' }, done)));
          M.focus(done, false);
        }
      } else standings.replaceChildren();
    };
    const el = h('div', {}, M.header('Race with Friends', 'Share the code. Up to eight can race.'),
      standings,
      grid,
      h('div', { class: 'ol-bottom' }, h('div', { class: 'ol-rules-line' }, rules, rulesBtn), foot), big);
    update(room);
    return { el, onRoom: update, onClose: list.flush, onBack: () => { if (!big.hidden) { setBig(false); return false; } this.leaveRoom(); } };
  }

  /** Public race, waiting in the lobby: who is here, with their valuations, and the countdown. */
  s_onlinePublic() {
    const M = this.menus, room = this.room;
    if (!room) return this.s_online();
    const head = M.header('Public race', ' '), sub = head.querySelector('p');
    const list = this.memberList({ valuation: true, changeRacer: true }), members = list.el;
    const update = r => list.update(r);
    const tick = () => { const r = this.room; sub.textContent = r?.until && !this.bye ? `Starts in ${clockText(r.until - this.now())}` : ' '; };
    update(room); tick();
    const timer = setInterval(tick, 250);
    const el = h('div', {}, head, h('div', { class: 'ol-lobby' }, members), h('p', { class: 'ol-line ol-foot' }, 'Empty seats go to CPUs.'));
    return { el, onRoom: update, onClose: () => clearInterval(timer), onBack: () => { this.leaveRoom(); } };
  }

  /** The racer select, reused: other members' racers wear their color and cannot be chosen. */
  s_onlineRacers() {
    const M = this.menus, room = this.room;
    const taken = r => { const t = {}; for (const m of r?.members || []) if (m.racer && m.id !== this.you) t[m.racer] = this.colorOf(m.id, r); return t; };
    const takenBy = taken(room), key = JSON.stringify(takenBy);
    if (!this.app.flow?.racers) this.app.flow = { mode: 'online', players: 1, racers: [], devices: ['any'] };
    const def = M.s_racers({ player: 0, takenBy, title: 'Pick your racer', current: this.mine(room)?.racer, onChoose: r => this.chooseRacer(r) });
    def.el.classList.add('screen-racers');
    def.onRoom = r => { if (JSON.stringify(taken(r)) !== key) M.open('onlineRacers', {}, { replace: true }); };
    return def;
  }

  /** Rules (host only): every change goes to the server at once. */
  s_onlineRules() {
    const M = this.menus;
    const R = () => this.room?.rules || {};
    const send = patch => {
      if (!this.room) return;
      const rules = { ...R(), ...patch };
      if (rules.mode === 'cup' && !rules.cup) rules.cup = CUPS[0].id;
      if (rules.mode !== 'cup') rules.cup = null;
      this.room.rules = rules; mark();
      this.conn.send({ t: 'rules', rules: { mode: rules.mode, cup: rules.cup, cc: rules.cc, level: rules.level, cpus: rules.cpus, pick: rules.pick } });
    };
    const chip = (label, on, sub = null) => h('button', { class: 'chip', 'data-f': true, onclick: on }, label, sub && h('small', {}, sub));
    const modeChips = [['single', 'Single races'], ['cup', 'Cup']].map(([id, label]) => [id, chip(label, () => send({ mode: id }))]);
    const cupCards = CUPS.map(cup => [cup.id, h('button', { class: 'card cup ol-cup', 'data-f': true, style: `--cc:${hex(cup.color)}`, onclick: () => send({ mode: 'cup', cup: cup.id }) }, h('img', { class: 'cup-emblem', src: cup.emblem, alt: '' }), h('div', {}, h('h2', {}, cup.name), h('p', {}, cup.tracks.map(id => TRACK_BY_ID[id]?.name).filter(Boolean).join(' · '))))]);
    const ccCards = CC_LIST.map(cc => [cc, h('button', { class: 'card cc', 'data-f': true, onclick: () => send({ cc }) }, h('div', { class: 'cc-n' }, CLASSES[cc].label), h('div', { class: 'cc-l' }, CLASSES[cc].name))]);
    const cpuChips = [[true, 'On'], [false, 'Off']].map(([v, label]) => [v, chip(label, () => send({ cpus: v }))]);
    const lvChips = LEVELS.map(([id, label]) => [id, chip(label, () => send({ level: id }))]);
    const pickChips = [['vote', 'Everyone picks', 'The roulette decides.'], ['host', 'Host picks', null]].map(([id, label, sub]) => [id, chip(label, () => send({ pick: id }), sub)]);
    const cupsBox = h('div', { class: 'ol-cups' }, cupCards.map(([, b]) => b));
    const lvBox = h('div', { class: 'chips lv' }, lvChips.map(([, b]) => b));
    const pickBox = h('div', {}, h('h3', { class: 'sub-h' }, 'Track choice'), h('div', { class: 'chips ol-pick' }, pickChips.map(([, b]) => b)));
    const mark = () => {
      const r = R();
      for (const [id, b] of modeChips) b.classList.toggle('sel', r.mode === id);
      for (const [id, b] of cupCards) b.classList.toggle('sel', r.cup === id);
      for (const [cc, b] of ccCards) b.classList.toggle('sel', r.cc === cc);
      for (const [v, b] of cpuChips) b.classList.toggle('sel', r.cpus === v);
      for (const [id, b] of lvChips) b.classList.toggle('sel', r.level === id);
      for (const [id, b] of pickChips) b.classList.toggle('sel', r.pick === id);
      cupsBox.hidden = r.mode !== 'cup'; pickBox.hidden = r.mode === 'cup'; lvBox.hidden = !r.cpus;
      if (M.focusEl && M.focusEl.offsetParent === null) M.focus(modeChips[r.mode === 'cup' ? 1 : 0][1], false);
    };
    const el = h('div', {}, M.header('Rules'),
      h('div', { class: 'ol-rules' },
        h('div', {}, h('h3', { class: 'sub-h' }, 'Format'), h('div', { class: 'chips' }, modeChips.map(([, b]) => b)), pickBox, cupsBox),
        h('div', {}, h('h3', { class: 'sub-h' }, 'Engine class'), h('div', { class: 'cards ol-cc' }, ccCards.map(([, b]) => b)),
          h('h3', { class: 'sub-h' }, 'CPU racers'), h('div', { class: 'chips' }, cpuChips.map(([, b]) => b), lvBox))));
    mark();
    modeChips[R().mode === 'cup' ? 1 : 0][1].dataset.default = '';
    return { el, onRoom: r => { if (r.host !== this.you) M.back(); else mark(); } };
  }

  /** Track pick: everyone's picks as color chips on the cards, a countdown, then the roulette. */
  s_onlineTrack() {
    const M = this.menus, room = this.room;
    if (!room) return this.s_online();
    const pub = room.public, hostPicks = !pub && room.rules.pick === 'host', locked = hostPicks && room.host !== this.you;
    const head = M.header(pub ? 'Vote for a track' : 'Pick a track', locked ? 'The host is choosing.' : hostPicks ? 'You choose the track.' : 'Everyone picks. The roulette decides.');
    const count = h('div', { class: 'ol-count', 'aria-live': 'off' });
    head.appendChild(count);
    const ids = pub ? (room.offer || []).filter(id => TRACK_BY_ID[id]) : TRACKS.map(t => t.id);
    const cards = new Map();
    let rolling = false;
    const pick = id => { if (rolling || locked) return; const me = this.mine(); if (me) me.track = id; mark(this.room); this.conn.send({ t: 'track', id }); };
    const card = (id, name, { kids, ...thumb }) => {
      const dots = h('span', { class: 'ol-dots' });
      const b = h('button', { class: 'card track', 'data-f': true, disabled: locked, onclick: () => pick(id) }, h('div', thumb, kids, dots), h('h2', {}, name));
      cards.set(id, { b, dots }); return b;
    };
    const list = ids.map(id => { const t = TRACK_BY_ID[id]; return card(id, t.name, { class: 'track-thumb', style: t.thumb ? `background-image:url(${t.thumb})` : '', kids: !t.thumb && h('span', {}, t.name[0]) }); });
    list.push(card('random', 'Random', { class: 'track-thumb ol-random', kids: [h('b', {}, '?'), h('small', {}, 'Let the market decide.')] }));
    const grid = h('div', { class: 'cards tracks ' + (pub ? 'ol-vote' : 'many ol-all') }, list);
    const mark = r => {
      const me = this.mine(r);
      for (const [id, { b, dots }] of cards) {
        dots.replaceChildren(...r.members.filter(m => m.track === id).map(m => h('i', { style: `--pc:${this.colorOf(m.id, r)}` })));
        b.classList.toggle('sel', me?.track === id);
      }
    };
    const tick = () => { const r = this.room; count.textContent = !rolling && !this.bye && r?.phase === 'track' && r.until ? clockText(r.until - this.now()) : ''; };
    mark(room); tick();
    const timer = setInterval(tick, 250);
    const mineNow = this.mine(room)?.track;
    if (mineNow && cards.has(mineNow)) cards.get(mineNow).b.dataset.default = '';
    let hopT = null;
    /* the roulette: a highlight hops between the picked cards, slowing, and lands on the track the server chose */
    const roulette = (r, done) => {
      rolling = true; tick(); grid.classList.add('ol-rolling');
      M.focusEl?.classList.remove('focus'); M.focusEl = null;
      const win = cards.get(r.race.trackId)?.b || cards.get('random').b;
      let pool = [...new Set(r.members.map(m => m.track).filter(Boolean))].map(id => cards.get(id)?.b).filter(Boolean);
      if (pool.length < 2) pool = [...cards.values()].map(c => c.b);
      if (!pool.includes(win)) pool.push(win);
      let i = Math.floor(Math.random() * pool.length), delay = 60, spent = 0;
      const hop = () => {
        for (const b of pool) b.classList.remove('ol-hop');
        if (spent >= 2100) { win.classList.add('ol-hop', 'ol-won'); this.app.audio?.ui('select'); hopT = setTimeout(done, 700); return; }
        let b = pool[i++ % pool.length]; if (pool.length > 1 && b.classList.contains('was')) b = pool[i++ % pool.length];
        for (const x of pool) x.classList.remove('was'); b.classList.add('ol-hop', 'was');
        this.app.audio?.ui('move');
        spent += delay; delay *= 1.14; hopT = setTimeout(hop, delay);
      };
      hop();
    };
    const el = h('div', {}, head, grid);
    return { el, onRoom: r => { if (!rolling) mark(r); }, roulette, onClose: () => { clearInterval(timer); clearTimeout(hopT); }, onBack: () => { if (rolling) return false; this.leaveRoom(); } };
  }

  /** Results: the server's finishing order; in a public room, everyone's valuation change and your own card. */
  s_onlineResults() {
    const M = this.menus, room = this.room, last = room?.last;
    if (!last) return this.s_online();
    const pub = room.public, cs = room.cupState, inCup = room.rules.mode === 'cup' && !!cs, track = TRACK_BY_ID[last.trackId];
    const results = last.results.slice().sort((a, b) => a.rank - b.rank);
    const rows = results.map((r, i) => {
      const racer = RACER_BY_ID[r.racer], me = r.member && r.member === this.you;
      const who = r.member ? this.nameOf(r.member, room) : 'CPU';
      const time = r.estimated || r.time == null ? h('span', { class: 'res-time dnf' }, h('b', {}, 'DNF')) : h('span', { class: 'res-time' }, fmtTime(r.time));
      const delta = pub && r.member && r.before != null && r.after != null ? r.after - r.before : null;
      return h('div', { class: 'res-row' + (me ? ' me' : '') + (r.estimated ? ' dnf' : ''), style: `--d:${i * 70}ms;--rc:${hex(racer?.color || 0xffffff)}` + (me ? `;--pc:${this.colorOf(r.member, room)}` : '') },
        h('b', { class: 'res-rank' }, String(r.rank)), h('img', { src: racer?.portrait, alt: '' }),
        h('span', { class: 'res-name' }, racer?.name || r.racer, h('small', {}, who + (me ? ' (you)' : ''))),
        time,
        inCup && h('span', { class: 'res-pts' }, `+${r.points}`), inCup && h('span', { class: 'res-total' }, String(cs.totals?.[r.racer] ?? r.points)),
        pub && h('span', { class: 'ol-delta' + (delta > 0 ? ' up' : delta < 0 ? ' down' : '') }, delta == null ? '' : fmtMoneyChange(delta)));
    });
    const mine = results.find(r => r.member === this.you);
    let card = null;
    if (pub && mine && mine.after != null) {
      const before = mine.before ?? mine.after, after = mine.after, t = tierOf(after), was = tierOf(before), d = after - before;
      card = h('div', { class: 'ol-val' },
        h('span', { class: 'trial-caption' }, 'Your valuation'),
        h('strong', {}, fmtMoney(after)),
        h('span', { class: 'ol-change' + (d > 0 ? ' up' : d < 0 ? ' down' : '') }, fmtMoneyChange(d)),
        t.index !== was.index && h('span', { class: 'ol-round' + (t.index < was.index ? ' down' : '') }, `${t.index > was.index ? 'New round' : 'Down round'}: ${t.name}`),
        h('span', { class: 'ol-tiername' }, t.name), h('span', { class: 'ol-tierline' }, t.line),
        h('span', { class: 'ol-bar', role: 'img', 'aria-label': t.next ? `Progress to ${t.next.name}` : 'Top tier' }, h('i', { style: `--p:${Math.round(t.progress * 100)}%` })));
    }
    const lastOfCup = inCup && cs.index >= cs.tracks.length - 1;
    const next = M.btn(lastOfCup ? 'See final standings' : 'Next race', () => { this.conn.send({ t: 'ready' }); const me = this.mine(); if (me) me.ready = true; update(this.room); }, { cls: 'go', def: true, sub: '0:00' });
    const nextLabel = next.querySelector('.btn-label'), nextSub = next.querySelector('.btn-sub');
    nextSub.hidden = true;
    const leave = M.btn('Leave', () => { this.leaveRoom(); this.toScene(() => this.show('online')); });
    const update = r => {
      const ready = !!this.mine(r)?.ready;
      if (ready && !next.disabled) { next.disabled = true; nextLabel.textContent = 'Waiting for the others'; nextSub.hidden = false; if (M.focusEl === next) M.focus(leave, false); }
      tick();
    };
    const tick = () => { const r = this.room; if (!nextSub.hidden) nextSub.textContent = !this.bye && r?.phase === 'results' && r.until ? clockText(r.until - this.now()) : ''; };
    const timer = setInterval(tick, 250);
    const el = h('div', { class: 'screen-results' }, h('div', { class: 'panel results ol-res' + (card ? ' with-card' : '') },
      h('h1', {}, track?.name || ''), inCup && h('p', { class: 'res-sub' }, `${CUP_BY_ID[room.rules.cup]?.name || 'Cup'} · Race ${cs.index + 1} of ${cs.tracks.length}`),
      h('div', { class: 'ol-res-body' }, card, h('div', { class: 'res-table ol-table' + (inCup ? ' cup' : '') + (pub ? ' pub' : '') }, rows)),
      h('div', { class: 'foot' }, next, leave)));
    update(room);
    return { el, onRoom: update, onClose: () => clearInterval(timer), onBack: () => false };
  }

  /** Rich List: everyone who has raced in public, by valuation, or by this week's gain. */
  s_onlineBoard() {
    const M = this.menus;
    let board = 'all', seq = 0;
    const list = h('div', { class: 'res-table' }), meSlot = h('div', { class: 'ol-board-me' });
    const row = (r, me) => {
      const t = tierOf(r.current ?? r.valuation);
      return h('div', { class: 'res-row ol-brow' + (me ? ' me' : '') }, h('b', { class: 'res-rank' }, r.rank != null ? String(r.rank) : '–'),
        h('span', { class: 'res-name' }, handleName(r.handle), h('small', {}, t.name)),
        h('span', { class: 'res-total' }, board === 'week' ? fmtMoneyChange(r.valuation) : fmtMoney(r.valuation)));
    };
    const load = async () => {
      const n = ++seq;
      for (const [id, b] of chips) { b.classList.toggle('sel', id === board); b.setAttribute('aria-pressed', String(id === board)); }
      let data;
      try { const res = await fetch(`/api/leaderboard?board=${board}&limit=50`, { credentials: 'same-origin' }); if (!res.ok) throw 0; data = await res.json(); }
      catch { if (n === seq) { list.replaceChildren(h('p', { class: 'ol-line' }, UNREACHABLE)); meSlot.replaceChildren(); } return; }
      if (n !== seq) return;
      list.replaceChildren(...(data.rows.length ? data.rows.map(r => row(r, r.me)) : [h('p', { class: 'ol-line' }, 'Nobody has raced yet. Somebody has to be first.')]));
      const listed = data.rows.some(r => r.me);
      meSlot.replaceChildren(...(!listed && data.me && this.me ? [row({ rank: data.me.rank, handle: this.me.handle, valuation: data.me.valuation, current: this.me.rating?.valuation }, true)] : []));
      M.screen?._scrollCheck?.();
    };
    const chips = [['all', 'All time'], ['week', 'This week']].map(([id, label]) => [id, h('button', { class: 'chip', 'data-f': true, 'data-default': id === 'all', onclick: () => { if (board !== id) { board = id; load(); } } }, label)]);
    load();
    const el = h('div', {}, M.header('Rich List'), h('div', { class: 'chips' }, chips.map(([, b]) => b)), h('div', { class: 'panel ol-board' }, list), meSlot);
    return { el };
  }

  /** The pause menu online: the race goes on, so it offers only Resume, Options, and Leave race. */
  s_onlinePause() {
    const M = this.menus, A = this.app, turn = A.mustTurn(), room = this.room;
    const def = TRACK_BY_ID[A.session?.config?.trackId];
    const leave = M.btn('Leave race', () => this.leaveRace(), { cls: 'danger', sub: room?.public ? 'Leaving counts as last place.' : null });
    const el = h('div', { class: 'screen-pause' }, h('div', { class: 'panel narrow' + (turn ? ' turn' : '') },
      turn ? [h('div', { class: 'turn-phone', 'aria-hidden': 'true' }), h('h1', {}, 'Turn your phone sideways'), M.btn('Resume anyway', () => A.resume(), { def: true })]
        : [h('h1', {}, def?.name || 'Online'), M.btn('Resume', () => A.resume(), { def: true })],
      M.btn('Options', () => M.open('options')), leave));
    return { el, onBack: () => { A.resume(); return false; }, onAction: a => { if (a === 'pause') { A.resume(); return true; } } };
  }
}
