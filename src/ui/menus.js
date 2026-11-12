/* Menus: every screen outside the race. DOM over the 3D canvas, fully usable
   with keyboard, controller, mouse, or touch through one spatial focus system. */
import { RACERS, RACER_BY_ID } from '../content/racers.js';
import { TRACKS, TRACK_BY_ID } from '../content/tracks.js';
import { CUPS, cupTracks } from '../content/cups.js';
import { CLASSES } from '../race/kart.js';
import { DEVICE_LABEL } from '../core/input.js';
import { ITEMS } from '../race/items.js';
import { itemIcon } from './hud.js';
import { fmtTime, ordinalSuffix } from '../core/util.js';

const h = (tag, attrs = {}, ...kids) => {
  const e = document.createElement(tag);
  for (const k in attrs) { const v = attrs[k]; if (v == null || v === false) continue; if (k === 'class') e.className = v; else if (k === 'html') e.innerHTML = v; else if (k.startsWith('on')) e.addEventListener(k.slice(2), v); else if (k === 'style') e.style.cssText = v; else e.setAttribute(k, v === true ? '' : v); }
  for (const kid of kids.flat(Infinity)) if (kid != null && kid !== false) e.append(kid.nodeType ? kid : document.createTextNode(kid));
  return e;
};
const hex = n => '#' + n.toString(16).padStart(6, '0');
/* Cup art: a gold, silver, or bronze trophy for a podium finish, and a three-star rating. */
const trophyImg = rank => rank >= 1 && rank <= 3 ? h('img', { class: 'trophy', src: `assets/ui/trophy-${['gold', 'silver', 'bronze'][rank - 1]}.webp`, alt: '' }) : null;
const starRow = n => h('span', { class: 'star-row', role: 'img', 'aria-label': `${n} of 3 stars` }, [0, 1, 2].map(i => h('img', { class: i < n ? '' : 'off', src: 'assets/ui/star.webp', alt: '' })));
/* The larger of the two areas a panel leaves free: beside it (landscape) or above it (portrait). The 3D scene is framed there. */
const freeRect = panel => { const r = panel.getBoundingClientRect(), W = innerWidth, H = innerHeight; return r.left * H >= W * r.top ? { left: 0, top: 0, width: r.left, height: H } : { left: 0, top: 0, width: W, height: r.top }; };
const PLAYER_COLORS = ['#ff4d6d', '#38b6ff', '#ffd23c', '#2ee6a6'];
const LEVELS = [['easy', 'Relaxed'], ['normal', 'Competitive'], ['hard', 'Ruthless']];
const CC_LIST = [50, 100, 150];
const STAT_LABELS = [['speed', 'Speed'], ['accel', 'Acceleration'], ['handling', 'Handling'], ['weight', 'Weight']];

export class Menus {
  constructor(app) {
    this.app = app; this.layer = h('div', { class: 'menu-layer' }); app.ui.appendChild(this.layer);
    this.stack = []; this.screen = null; this.focusEl = null;
    this.layer.addEventListener('pointermove', e => { const t = e.target.closest?.('[data-f]'); if (t && t !== this.focusEl && e.pointerType === 'mouse' && !t.hasAttribute('data-nohover')) this.focus(t, false); });
    // screens that frame the 3D scene (racer select, podium) re-measure when the layout changes
    const relayout = () => requestAnimationFrame(() => this.screen?.onLayout?.());
    addEventListener('resize', relayout); screen.orientation?.addEventListener?.('change', relayout);
  }

  get visible() { return !!this.screen; }

  /* ---------- screen plumbing ---------- */
  open(name, params = {}, { replace = false } = {}) {
    if (this.screen && !replace) this.stack.push(this.screen.spec);
    this._mount({ name, params });
  }
  back() {
    const cur = this.screen; if (!cur) return;
    if (cur.onBack) { if (cur.onBack() === false) return; }
    const prev = this.stack.pop();
    this.app.audio?.ui('back');
    if (prev) this._mount(prev); else this.close();
  }
  close() { if (this.screen) { this.screen.el.remove(); this.screen.onClose?.(); } this.screen = null; this.focusEl = null; this.stack.length = 0; }
  reset(name, params = {}) { this.stack.length = 0; this._mount({ name, params }); }
  _mount(spec) {
    if (this.screen) { this.screen.el.remove(); this.screen.onClose?.(); }
    const def = this['s_' + spec.name](spec.params || {});
    def.spec = spec; def.el.classList.add('menu-screen', 'screen-' + spec.name);
    this.layer.appendChild(def.el); this.screen = def; this.focusEl = null;
    const first = def.el.querySelector('[data-f][data-default]') || def.el.querySelector('[data-f]');
    if (first) this.focus(first, false);
    def.onOpen?.(); def.onLayout?.();
    if (def.onLayout) requestAnimationFrame(() => { if (this.screen === def) def.onLayout(); });   // again once fonts and images have settled the layout
  }
  focus(el, sound = true) {
    if (this.focusEl === el) return;
    this.focusEl?.classList.remove('focus'); this.focusEl = el;
    if (el) { el.classList.add('focus'); el.scrollIntoView?.({ block: 'nearest', inline: 'nearest' }); el.dispatchEvent(new CustomEvent('menufocus')); if (sound) this.app.audio?.ui('move'); }
  }
  /** Input from keyboard or controller. */
  handle(action, device) {
    const s = this.screen; if (!s) return false;
    if (s.onAction && s.onAction(action, device) === true) return true;
    if (action === 'back' || action === 'pause') { this.back(); return true; }
    if (action === 'confirm') { if (this.focusEl) { this.app.audio?.ui('select'); this.keyClick = true; try { this.focusEl.click(); } finally { this.keyClick = false; } } return true; }
    if (['up', 'down', 'left', 'right'].includes(action)) { this._move(action); return true; }
    return false;
  }
  _move(dir) {
    const all = [...this.screen.el.querySelectorAll('[data-f]')].filter(e => e.offsetParent !== null && !e.disabled);
    if (!all.length) return;
    if (!this.focusEl || !all.includes(this.focusEl)) return this.focus(all[0]);
    // value controls respond to left/right themselves
    if ((dir === 'left' || dir === 'right') && this.focusEl.dataset.adjust) { this.focusEl.dispatchEvent(new CustomEvent('adjust', { detail: dir === 'right' ? 1 : -1 })); return; }
    const r = this.focusEl.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    const dx = dir === 'left' ? -1 : dir === 'right' ? 1 : 0, dy = dir === 'up' ? -1 : dir === 'down' ? 1 : 0;
    let best = null, bs = Infinity;
    for (const e of all) {
      if (e === this.focusEl) continue;
      const q = e.getBoundingClientRect(), ex = q.left + q.width / 2 - cx, ey = q.top + q.height / 2 - cy;
      const along = ex * dx + ey * dy; if (along < 4) continue;
      const across = Math.abs(ex * dy) + Math.abs(ey * dx);
      const score = along + across * 2.4;
      if (score < bs) { bs = score; best = e; }
    }
    if (best) this.focus(best);
  }
  btn(label, onClick, { cls = '', def = false, sub = null, icon = null } = {}) {
    return h('button', { class: 'btn ' + cls, 'data-f': true, 'data-default': def, onclick: () => onClick() }, icon && h('span', { class: 'btn-ico' }, icon), h('span', { class: 'btn-label' }, label), sub && h('span', { class: 'btn-sub' }, sub));
  }
  header(title, sub) { return h('header', { class: 'menu-head' }, h('button', { class: 'back', 'aria-label': 'Back', onclick: () => this.back(), html: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 4.5 7.5 12l7.5 7.5" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/></svg>' }), h('div', {}, h('h1', {}, title), sub && h('p', {}, sub))); }

  /* ---------- title ---------- */
  s_title() {
    const go = () => { if (matchMedia('(pointer: coarse)').matches) this.app.fullscreen(true); this.app.audio?.unlock?.(); this.app.audio?.ui('start'); this.app.audio?.say?.('title', { force: true, delay: 0.25 }); this.reset('main'); };
    const el = h('div', { onclick: go },
      h('div', { class: 'logo' }, h('div', { class: 'logo-top' }, 'BILLIONAIRE'), h('div', { class: 'logo-main' }, ...'KART'.split('').map((c, i) => h('span', { style: `--i:${i}` }, c))), h('div', { class: 'logo-tag' }, 'Eight egos. One trophy.')),
      h('div', { class: 'press' }, matchMedia('(pointer: coarse)').matches ? 'Tap to start' : 'Press any button'),
      h('div', { class: 'fine' }, 'A parody. Not affiliated with, or endorsed by, anyone in it.'));
    return { el, onAction: a => { if (a !== 'mute') go(); return true; }, onBack: () => false };
  }

  /* ---------- main menu ---------- */
  s_main() {
    const A = this.app;
    const start = mode => { A.flow = { mode, players: 1 }; this.open('players'); };
    const el = h('div', {},
      h('div', { class: 'logo small' }, h('div', { class: 'logo-top' }, 'BILLIONAIRE'), h('div', { class: 'logo-main' }, ...'KART'.split('').map((c, i) => h('span', { style: `--i:${i}` }, c)))),
      h('nav', { class: 'main-nav' },
        this.btn('Grand Prix', () => start('gp'), { cls: 'big c1', def: true, sub: 'Four races, one trophy' }),
        this.btn('Quick Race', () => start('vs'), { cls: 'big c2', sub: 'Any track, your rules' }),
        this.btn('Time Trial', () => { A.flow = { mode: 'timetrial', players: 1, devices: ['any'] }; this.open('racers', { player: 0 }); }, { cls: 'big c3', sub: 'Just you and the clock' }),
        h('div', { class: 'row' }, this.btn('How to play', () => this.open('howto'), { cls: 'small' }), this.btn('Options', () => this.open('options'), { cls: 'small' }), this.btn('Records', () => this.open('records'), { cls: 'small' }))));
    return { el, onBack: () => { this.reset('title'); return false; } };
  }

  /* ---------- how many players, and who holds what ---------- */
  s_players() {
    const A = this.app, touchOnly = matchMedia('(pointer: coarse)').matches && !A.input.pads().length;
    const pick = n => {
      A.flow.players = n;
      if (n === 1) { A.flow.devices = ['any']; this.open('racers', { player: 0 }); } else this.open('join', { n });
    };
    const el = h('div', {}, this.header('How many players?', touchOnly ? 'Connect controllers to race together on one screen.' : 'Up to four on one screen.'),
      h('div', { class: 'cards four' }, [1, 2, 3, 4].map(n => h('button', { class: 'card pcount', 'data-f': true, 'data-default': n === 1, disabled: touchOnly && n > 1, onclick: () => pick(n) }, h('div', { class: 'pcount-n' }, String(n)), h('div', { class: 'pcount-l' }, n === 1 ? 'Player' : 'Players')))));
    return { el };
  }

  s_join({ n }) {
    const A = this.app, joined = [];
    const list = h('div', { class: 'join-list' });
    const draw = () => {
      const keys = d => d === 'kb1' ? 'W A S D steer · Space drift · E item' : d === 'kb2' ? 'Arrows steer · Right Shift drift · Enter item' : 'Stick steer · A go · Right bumper drift · Left bumper item';
      list.replaceChildren(...Array.from({ length: n }, (_, i) => h('div', { class: 'join-slot' + (joined[i] ? ' in' : ''), style: `--pc:${PLAYER_COLORS[i]}` }, h('b', {}, `P${i + 1}`), h('span', {}, joined[i] ? [DEVICE_LABEL[joined[i]] || joined[i], h('small', {}, keys(joined[i]))] : i === joined.length ? 'Press a button to join' : 'Waiting'))));
    };
    draw();
    const el = h('div', {}, this.header('Join the race', 'Each player presses a button on their own controller. Two can share a keyboard: W A S D with Space, and the arrow keys with Enter.'), list);
    return {
      el, onAction: (a, dev) => {
        if (a === 'back') return false;
        if (a !== 'confirm' && a !== 'pause') return true;
        const d = dev === 'kb' ? (joined.includes('kb1') ? 'kb2' : 'kb1') : dev;
        if (joined.includes(d)) { if (joined.length === n) { A.flow.devices = joined.slice(); this.open('racers', { player: 0 }); } return true; }
        joined.push(d); A.audio?.ui('select'); draw();
        if (joined.length === n) setTimeout(() => { if (this.screen?.spec.name === 'join') { A.flow.devices = joined.slice(); this.open('racers', { player: 0 }); } }, 500);
        return true;
      },
    };
  }

  /* ---------- racer select ---------- */
  s_racers({ player }) {
    const A = this.app, flow = A.flow, n = flow.players;
    flow.racers = flow.racers || [];
    const taken = flow.racers.slice(0, player);
    let current = RACER_BY_ID[A.save.data.last.racer[player]] || RACERS[player];
    if (taken.includes(current.id)) current = RACERS.find(r => !taken.includes(r.id));
    const name = h('h2', {}), title = h('div', { class: 'r-title' }), quote = h('p', { class: 'r-quote' }), bio = h('p', { class: 'r-bio' }), stats = h('div', { class: 'r-stats' }), big = h('img', { class: 'r-portrait', alt: '', draggable: 'false' });
    const tiles = new Map();
    const choose = r => {
      flow.racers[player] = r.id; A.save.data.last.racer[player] = r.id; A.save.write();
      A.audio?.racerPicked?.(r);
      if (player + 1 < n) this.open('racers', { player: player + 1 }); else this.open(flow.mode === 'timetrial' ? 'tracks' : 'setup');
    };
    // Looking and choosing are separate: a tile shows the racer, the button under the card picks them.
    const go = this.btn('', () => choose(current), { cls: 'go r-go' }), goLabel = go.querySelector('.btn-label');
    const show = r => {
      current = r; big.src = r.portrait; big.style.setProperty('--rc', hex(r.color)); name.textContent = r.name; title.textContent = r.title; quote.textContent = `“${r.quote}”`; bio.textContent = r.bio;
      stats.replaceChildren(...STAT_LABELS.map(([k, label]) => h('div', { class: 'stat', role: 'img', 'aria-label': `${label}: ${r.stats[k]} of 5` }, h('span', {}, label), h('i', {}, ...Array.from({ length: 5 }, (_, i) => h('b', { class: i < r.stats[k] ? 'on' : '' }))))));
      goLabel.textContent = `Choose ${r.name}`;
      for (const [id, t] of tiles) t.classList.toggle('sel', id === r.id);
      A.showroom?.setRacer(player, r);
    };
    const grid = h('div', { class: 'racer-grid' }, RACERS.map(r => {
      // a tap or click only looks; Enter or the controller's confirm button, pressed on a tile, picks straight away
      const t = h('button', { class: 'racer-tile' + (taken.includes(r.id) ? ' taken' : '') + (r.name.length > 9 ? ' long' : ''), 'data-f': true, 'data-nohover': true, 'data-default': r === current, disabled: taken.includes(r.id), style: `--rc:${hex(r.color)}`, onclick: () => { if (this.keyClick) choose(r); else { this.focus(t, false); A.audio?.ui('move'); } } },
        h('img', { src: r.portrait, alt: '', loading: 'lazy', draggable: 'false' }), h('span', {}, r.name), taken.includes(r.id) && h('em', { style: `background:${PLAYER_COLORS[taken.indexOf(r.id)]}` }, `P${taken.indexOf(r.id) + 1}`));
      t.addEventListener('menufocus', () => show(r)); tiles.set(r.id, t); return t;
    }));
    const stage = h('div', { class: 'r-stage' });
    const el = h('div', {}, this.header(n > 1 ? `Player ${player + 1}: pick your racer` : 'Pick your racer'),
      h('div', { class: 'racer-layout' }, grid, stage, h('aside', { class: 'racer-card', style: n > 1 ? `--pc:${PLAYER_COLORS[player]}` : '' }, h('div', { class: 'r-top' }, big, h('div', { class: 'r-id' }, h('div', { class: 'r-head' }, name, title), quote)), bio, stats, go)));
    return {
      el, onOpen: () => { A.showRoomFor(flow.racers.slice(0, player).map(id => RACER_BY_ID[id]).concat([current])); show(current); },
      onLayout: () => A.showroom?.setStage(stage.getBoundingClientRect()),
      onBack: () => { flow.racers.length = player; },
    };
  }

  /* ---------- engine class and rivals ---------- */
  s_setup() {
    const A = this.app, flow = A.flow, last = A.save.data.last;
    flow.cc = flow.cc || last.cc; flow.level = flow.level || last.level;
    const ccBtns = CC_LIST.map(cc => { const b = h('button', { class: 'card cc', 'data-f': true, 'data-default': cc === flow.cc, onclick: () => { flow.cc = cc; mark(); this.focus(next); } }, h('div', { class: 'cc-n' }, CLASSES[cc].label), h('div', { class: 'cc-l' }, CLASSES[cc].name), h('div', { class: 'cc-d' }, cc === 50 ? 'Gentle pace' : cc === 100 ? 'The standard' : 'Fast and frantic')); b.dataset.cc = cc; return b; });
    const lvBtns = LEVELS.map(([id, label]) => { const b = h('button', { class: 'chip', 'data-f': true, onclick: () => { flow.level = id; mark(); } }, label); b.dataset.lv = id; return b; });
    const mark = () => { for (const b of ccBtns) b.classList.toggle('sel', +b.dataset.cc === flow.cc); for (const b of lvBtns) b.classList.toggle('sel', b.dataset.lv === flow.level); };
    const next = this.btn('Next', () => { last.cc = flow.cc; last.level = flow.level; A.save.write(); this.open(flow.mode === 'gp' ? 'cups' : 'tracks'); }, { cls: 'go' });
    mark();
    const el = h('div', {}, this.header('Engine class'), h('div', { class: 'cards three' }, ccBtns), h('h3', { class: 'sub-h' }, 'Rivals'), h('div', { class: 'chips' }, lvBtns), h('div', { class: 'foot' }, next));
    return { el };
  }

  /* ---------- cups ---------- */
  s_cups() {
    const A = this.app, flow = A.flow;
    const cards = CUPS.map(cup => {
      const tracks = cupTracks(cup), t = A.save.trophy(cup.id, flow.cc);
      return h('button', { class: 'card cup', 'data-f': true, 'data-default': cup.id === A.save.data.last.cup, disabled: !tracks.length, style: `--cc:${hex(cup.color)}`, onclick: () => { A.save.data.last.cup = cup.id; A.save.write(); A.startCup(cup); } },
        h('img', { class: 'cup-emblem', src: cup.emblem, alt: '' }),
        h('h2', {}, cup.name), h('p', {}, cup.blurb),
        h('ol', {}, cup.tracks.map(id => h('li', { class: TRACK_BY_ID[id] ? '' : 'soon' }, TRACK_BY_ID[id]?.name || 'Coming soon'))),
        t && h('div', { class: 'cup-best' }, trophyImg(t.rank), h('span', {}, `${t.rank <= 3 ? '' : 'Best: '}${t.rank}${ordinalSuffix(t.rank)}, ${t.points} points`), t.rank === 1 && starRow(t.stars)));
    });
    return { el: h('div', {}, this.header('Choose a cup', `${CLASSES[flow.cc].label} · ${LEVELS.find(l => l[0] === flow.level)[1]} rivals`), h('div', { class: 'cards two' }, cards)) };
  }

  /* ---------- single track ---------- */
  s_tracks() {
    const A = this.app, flow = A.flow, cc = flow.cc || A.save.data.last.cc;
    // all eight on one screen, a cup per row; the line under the title describes the track in focus
    const head = this.header('Choose a track', '\u00a0'), sub = head.querySelector('p');
    const cards = TRACKS.map(t => {
      const best = A.save.bestFor(t.id, flow.mode === 'timetrial' ? 'tt' : cc);
      const card = h('button', { class: 'card track', 'data-f': true, 'data-default': t.id === A.save.data.last.track, onclick: () => { A.save.data.last.track = t.id; A.save.write(); A.startSingle(t.id); } },
        h('div', { class: 'track-thumb', style: t.thumb ? `background-image:url(${t.thumb})` : '' }, !t.thumb && h('span', {}, t.name[0]), best?.race && h('em', { class: 'track-best' }, `Best ${fmtTime(best.race)}`)), h('h2', {}, t.name));
      const say = () => { sub.textContent = t.tagline || '\u00a0'; };
      card.addEventListener('menufocus', say); card.addEventListener('pointerenter', say);
      return card;
    });
    return { el: h('div', {}, head, h('div', { class: 'cards tracks' }, cards)) };
  }

  /* ---------- pause ---------- */
  s_pause() {
    const A = this.app, turn = A.mustTurn();
    // a phone held upright cannot race: say so in place of Resume, and keep the rest of the menu
    const el = h('div', {}, h('div', { class: 'panel narrow' + (turn ? ' turn' : '') },
      turn ? [h('div', { class: 'turn-phone', 'aria-hidden': 'true' }), h('h1', {}, 'Turn your phone sideways'), h('p', { class: 'turn-sub' }, 'The race is paused.')] : [h('h1', {}, 'Paused'), this.btn('Resume', () => A.resume(), { def: true })],
      this.btn('Restart race', () => A.restartRace()), this.btn('How to play', () => this.open('howto')), this.btn('Options', () => this.open('options')), this.btn('Quit to menu', () => A.quitToMenu(), { cls: 'danger' })));
    return { el, onBack: () => { A.resume(); return false; }, onAction: a => { if (a === 'pause') { A.resume(); return true; } } };
  }

  /* ---------- results ---------- */
  s_results({ results, gp, track, records }) {
    const A = this.app;
    const rows = results.map((r, i) => {
      const total = gp ? gp.totals[r.racer.id] : null;
      return h('div', { class: 'res-row' + (r.isPlayer ? ' me' : ''), style: `--d:${i * 70}ms;--rc:${hex(r.racer.color)}` + (r.isPlayer ? `;--pc:${PLAYER_COLORS[r.playerIndex]}` : '') },
        h('b', { class: 'res-rank' }, String(r.rank)), h('img', { src: r.racer.portrait, alt: '' }), h('span', { class: 'res-name' }, r.racer.name, r.isPlayer && h('em', {}, results.filter(x => x.isPlayer).length > 1 ? `P${r.playerIndex + 1}` : 'You')),
        h('span', { class: 'res-time' }, fmtTime(r.time)), gp && h('span', { class: 'res-pts' }, `+${r.points}`), gp && h('span', { class: 'res-total' }, String(total)));
    });
    const buttons = gp
      ? [this.btn(gp.last ? 'See final standings' : 'Next race', () => A.gpNext(), { cls: 'go', def: true })]
      : [this.btn('Race again', () => A.restartRace(), { cls: 'go', def: true }), this.btn('Choose another track', () => A.backToTracks()), this.btn('Quit to menu', () => A.quitToMenu())];
    const el = h('div', {}, h('div', { class: 'panel results' },
      h('h1', {}, track.name), gp && h('p', { class: 'res-sub' }, `Race ${gp.index + 1} of ${gp.count}`),
      records?.newBestRace && h('div', { class: 'badge' }, 'New best time'), records?.newBestLap && !records.newBestRace && h('div', { class: 'badge' }, 'New best lap'),
      h('div', { class: 'res-table' + (gp ? ' gp' : '') }, rows),
      h('p', { class: 'res-quote' }, h('b', {}, results[0].racer.name + ': '), `“${results[0].racer.barks.win}”`,
        results.length > 2 && [h('b', {}, '   ' + results[results.length - 1].racer.name + ': '), `“${results[results.length - 1].racer.barks.lose}”`]),
      h('div', { class: 'foot' }, buttons)));
    return { el, onBack: () => false };
  }

  s_cupResults({ cup, standings, playerRanks, stars }) {
    const A = this.app, best = Math.min(...playerRanks);
    const head = best === 1 ? 'Champion!' : best === 2 ? 'Second place' : best === 3 ? 'Third place' : `${best}${ordinalSuffix(best)} place`;
    const el = h('div', {}, h('div', { class: 'panel cupres' },
      h('div', { class: 'cupres-head' }, trophyImg(best), h('div', {}, h('h1', {}, head), h('p', { class: 'res-sub' }, cup.name), best === 1 && starRow(stars))),
      h('div', { class: 'res-table final' }, standings.map((s, i) => h('div', { class: 'res-row' + (s.isPlayer ? ' me' : ''), style: `--d:${i * 60}ms;--rc:${hex(s.racer.color)}` }, h('b', { class: 'res-rank' }, String(i + 1)), h('img', { src: s.racer.portrait, alt: '' }), h('span', { class: 'res-name' }, s.racer.name), h('span', { class: 'res-total' }, String(s.points))))),
      h('div', { class: 'foot' }, this.btn('Continue', () => A.quitToMenu(), { cls: 'go', def: true }))));
    return { el, onBack: () => false, onLayout: () => A.showroom?.setStage(freeRect(el.firstElementChild)) };
  }

  /* ---------- options ---------- */
  s_options() {
    const A = this.app, S = A.save.settings;
    const stepper = (label, key, fmt, step = 0.1, min = 0, max = 1) => {
      const val = h('b', {}, fmt(S[key]));
      const set = d => { S[key] = Math.round(Math.min(max, Math.max(min, S[key] + d * step)) * 100) / 100; val.textContent = fmt(S[key]); A.save.write(); A.applySettings(); A.audio?.ui('move'); };
      const row = h('div', { class: 'opt', 'data-f': true, 'data-adjust': true }, h('span', {}, label), h('div', { class: 'opt-ctl' }, h('button', { onclick: () => set(-1), tabindex: -1 }, '−'), val, h('button', { onclick: () => set(1), tabindex: -1 }, '+')));
      row.addEventListener('adjust', e => set(e.detail)); row.onclick = e => { if (e.target === row) set(1); };
      return row;
    };
    const cycle = (label, key, options) => {
      const val = h('b', {}, options.find(o => o[0] === S[key])?.[1] || '');
      const set = d => { const i = options.findIndex(o => o[0] === S[key]); const n = options[(i + d + options.length) % options.length]; S[key] = n[0]; val.textContent = n[1]; A.save.write(); A.applySettings(); A.audio?.ui('move'); };
      const row = h('div', { class: 'opt', 'data-f': true, 'data-adjust': true, onclick: () => set(1) }, h('span', {}, label), h('div', { class: 'opt-ctl' }, val));
      row.addEventListener('adjust', e => set(e.detail)); return row;
    };
    const onoff = [[true, 'On'], [false, 'Off']], touch = matchMedia('(pointer: coarse)').matches;   // touch settings only where there is a touch screen
    const pct = v => Math.round(v * 100) + '%';
    const el = h('div', {}, this.header('Options'), h('div', { class: 'panel options' },
      stepper('Music', 'music', pct), stepper('Sound effects', 'sfx', pct),
      cycle('Graphics', 'quality', [['auto', 'Automatic'], ['low', 'Low'], ['medium', 'Medium'], ['high', 'High'], ['ultra', 'Ultra']]),
      !touch && document.fullscreenEnabled && this.btn(document.fullscreenElement ? 'Leave full screen' : 'Full screen', () => { A.fullscreen(!document.fullscreenElement); this.back(); }, { cls: 'small' }),
      cycle('Camera shake', 'shake', onoff), cycle('Automatic tricks', 'autoTrick', onoff), cycle('Steering assist', 'smartSteer', onoff),
      touch && cycle('Automatic accelerate', 'autoGo', onoff), touch && cycle('Tilt to steer', 'tilt', onoff)));
    return { el };
  }

  /* ---------- how to play ---------- */
  s_howto() {
    const touch = matchMedia('(pointer: coarse)').matches;
    const key = (...k) => h('span', { class: 'keys' }, k.map(x => h('kbd', {}, x)));
    // each action, and how to do it on each kind of control; the screen shows one kind at a time
    const HOW = {
      kb: [['Steer', [key('A', 'D'), 'or', key('←', '→')]], ['Accelerate', [key('W'), 'or', key('↑')]], ['Drift and hop', key('Space')], ['Use item', [key('E'), 'or', key('Enter')]], ['Brake and reverse', [key('S'), 'or', key('↓')]], ['Look behind', key('Q')], ['Pause', key('Esc')]],
      pad: [['Steer', 'Left stick'], ['Accelerate', 'A or right trigger'], ['Drift and hop', 'Right bumper or X'], ['Use item', 'Left bumper or Y'], ['Brake and reverse', 'B or left trigger'], ['Look behind', 'Press the right stick'], ['Pause', 'Start']],
    };
    const tips = touch ? [
      ['Drift for speed', 'Steer hard through a turn and the kart hops into a drift. Sparks go blue, orange, then purple. Straighten up to boost.'],
      ['Start with a rocket', 'Press the right side just after the 2 appears.'],
      ['Collect coins', 'Each coin makes you faster, up to ten.'],
      ['Follow closely', 'Tuck in behind a kart to slingshot past.'],
      ['Throw it backward', 'Use an item while braking to send it behind you.'],
    ] : [
      ['Drift for speed', 'Hold drift through a turn. Sparks go blue, orange, then purple. Let go to boost.'],
      ['Start with a rocket', 'Hold accelerate just after the 2 appears.'],
      ['Trick off ramps', 'Press drift as you leave a ramp for a boost.'],
      ['Collect coins', 'Each coin makes you faster, up to ten.'],
      ['Follow closely', 'Tuck in behind a kart to slingshot past.'],
    ];
    let controls;
    if (touch) {
      // a picture of the screen: what each thumb does, where it does it
      const half = (who, ...lines) => h('div', { class: 'pd-half' }, h('b', {}, who), lines.map(l => h('span', {}, l)));
      controls = h('div', { class: 'panel' }, h('div', { class: 'howto-head' }, h('h3', {}, 'Controls')),
        h('div', { class: 'pad-diagram' }, half('Left thumb', 'Slide to steer', 'Tap to use an item'), half('Right thumb', 'Hold to accelerate', 'Pull down to brake', 'Flick up to use an item')));
    } else {
      const body = h('tbody', {});
      let kind = this.app.input.lastDevice.startsWith('pad') ? 'pad' : 'kb';
      const chips = [['kb', 'Keyboard'], ['pad', 'Controller']].map(([id, label]) => { const b = h('button', { class: 'chip', 'data-f': true, onclick: () => { kind = id; show(); } }, label); b.dataset.kind = id; return b; });
      const show = () => { body.replaceChildren(...HOW[kind].map(c => h('tr', {}, h('th', {}, c[0]), h('td', {}, h('span', { class: 'ctl-how' }, c[1]))))); for (const b of chips) b.classList.toggle('sel', b.dataset.kind === kind); };
      show();
      controls = h('div', { class: 'panel' }, h('div', { class: 'howto-head' }, h('h3', {}, 'Controls'), h('div', { class: 'chips' }, chips)), h('table', { class: 'ctl' }, body));
    }
    const el = h('div', {}, this.header('How to play'), h('div', { class: 'howto' + (touch ? ' touch' : '') },
      controls,
      h('div', { class: 'panel' }, h('h3', {}, 'Go faster'), h('ul', { class: 'tips' }, tips.map(t => h('li', {}, h('b', {}, t[0]), h('span', {}, t[1])))))),
      h('div', { class: 'foot' }, this.btn('Got it', () => this.back(), { cls: 'go', def: true }), this.btn('See the items', () => this.open('items'))));
    return { el };
  }

  /* ---------- the items: what each one is called, and what it does ---------- */
  s_items() {
    const list = Object.values(ITEMS);
    const icon = h('img', { class: 'i-icon', alt: '' }), name = h('h2', {}), desc = h('p', { class: 'i-desc' });
    const tiles = new Map();
    const show = it => { icon.src = itemIcon(it.id); name.textContent = it.name; desc.textContent = it.desc; for (const [id, t] of tiles) t.classList.toggle('sel', id === it.id); };
    const grid = h('div', { class: 'item-grid' }, list.map((it, i) => {
      const t = h('button', { class: 'item-tile', 'data-f': true, 'data-nohover': true, 'data-default': i === 0, onclick: () => this.focus(t, false) }, h('img', { src: itemIcon(it.id), alt: '', draggable: 'false' }), (it.uses || 0) > 1 && h('em', {}, `×${it.uses}`), h('span', {}, it.name));
      t.addEventListener('menufocus', () => show(it)); tiles.set(it.id, t); return t;
    }));
    const el = h('div', {}, this.header('Items', 'Drive through a box to get one. The further back you are, the better your odds of something big.'),
      h('div', { class: 'item-layout' }, grid, h('aside', { class: 'item-card' }, icon, h('div', {}, name, desc))));
    return { el, onOpen: () => show(list[0]) };
  }

  /* ---------- records ---------- */
  s_records() {
    const A = this.app, st = A.save.data.stats;
    const rows = TRACKS.map(t => h('tr', {}, h('th', {}, t.name), ...CC_LIST.map(cc => h('td', {}, A.save.bestFor(t.id, cc)?.race ? fmtTime(A.save.bestFor(t.id, cc).race) : '–')), h('td', {}, A.save.bestFor(t.id, 'tt')?.race ? fmtTime(A.save.bestFor(t.id, 'tt').race) : '–')));
    const el = h('div', {}, this.header('Records', `${st.races} races · ${st.wins} wins`), h('div', { class: 'panel records' },
      h('table', {}, h('thead', {}, h('tr', {}, h('th', {}, 'Track'), ...CC_LIST.map(cc => h('th', {}, CLASSES[cc].label)), h('th', {}, 'Time trial'))), h('tbody', {}, rows))));
    return { el };
  }
}
export { PLAYER_COLORS };
