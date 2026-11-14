/* Menus: every screen outside the race. DOM over the 3D canvas, fully usable
   with keyboard, controller, mouse, or touch through one spatial focus system. */
import { RACERS, RACER_BY_ID } from '../content/racers.js';
import { TRACKS, TRACK_BY_ID } from '../content/tracks.js';
import { CUPS, cupTracks } from '../content/cups.js';
import { CLASSES } from '../race/kart.js';
import { DEVICE_LABEL, PAD_ACTIONS, buttonName, describePadBind, defaultPadBindings, applyPadBind, padFamily } from '../core/input.js';
import { ITEMS } from '../race/items.js';
import { itemIcon } from './hud.js';
import { installCard, installButton, installPanel, onInstallChange } from './install.js';
import { trialKey } from '../core/save.js';
import { fmtTime, ordinalSuffix } from '../core/util.js';

const h = (tag, attrs = {}, ...kids) => {
  const e = document.createElement(tag);
  for (const k in attrs) { const v = attrs[k]; if (v == null || v === false) continue; if (k === 'class') e.className = v; else if (k === 'html') e.innerHTML = v; else if (k.startsWith('on')) e.addEventListener(k.slice(2), v); else if (k === 'style') e.style.cssText = v; else e.setAttribute(k, v === true ? '' : v); }
  for (const kid of kids.flat(Infinity)) if (kid != null && kid !== false) e.append(kid.nodeType ? kid : document.createTextNode(kid));
  return e;
};
const hex = n => '#' + n.toString(16).padStart(6, '0');

/* The Controller panel's pad picture (issue #194): one generic gamepad, drawn
   once. Every physical button is a [data-btn] group in standard-mapping order;
   pressing it adds .lit. Face buttons carry an Xbox letter (.tx) and a
   PlayStation shape (.sh); CSS shows one set per naming family (.fam-ps). */
const PAD_SVG = `<svg class="pad-svg" viewBox="0 0 360 216" role="img" aria-label="Controller diagram">
  <g class="pb" data-btn="6"><rect x="56" y="12" width="58" height="18" rx="9"/><text data-txt="6" x="85" y="25.5">LT</text></g>
  <g class="pb" data-btn="7"><rect x="246" y="12" width="58" height="18" rx="9"/><text data-txt="7" x="275" y="25.5">RT</text></g>
  <g class="pb" data-btn="4"><rect x="56" y="34" width="58" height="17" rx="8.5"/><text data-txt="4" x="85" y="46.5">LB</text></g>
  <g class="pb" data-btn="5"><rect x="246" y="34" width="58" height="17" rx="8.5"/><text data-txt="5" x="275" y="46.5">RB</text></g>
  <path class="pad-body" d="M104 54h152c30 0 46 16 54 44l12 50c5 21-5 38-24 42-15 3-28-4-37-19l-13-22H112l-13 22c-9 15-22 22-37 19-19-4-29-21-24-42l12-50c8-28 24-44 54-44z"/>
  <g class="pb" data-btn="10"><circle cx="106" cy="100" r="18"/><circle class="inner" cx="106" cy="100" r="8"/></g>
  <g class="pb" data-btn="8"><circle cx="150" cy="74" r="8"/></g>
  <g class="pb" data-btn="9"><circle cx="210" cy="74" r="8"/></g>
  <g class="pb" data-btn="16"><circle cx="180" cy="100" r="10"/></g>
  <g class="pb" data-btn="3"><circle cx="264" cy="76" r="15"/><text class="tx" x="264" y="80.5">Y</text><g class="sh"><path d="M264 69.5 270.5 80.5 257.5 80.5Z"/></g></g>
  <g class="pb" data-btn="2"><circle cx="236" cy="104" r="15"/><text class="tx" x="236" y="108.5">X</text><g class="sh"><rect x="230" y="98" width="12" height="12"/></g></g>
  <g class="pb" data-btn="1"><circle cx="292" cy="104" r="15"/><text class="tx" x="292" y="108.5">B</text><g class="sh"><circle cx="292" cy="104" r="6"/></g></g>
  <g class="pb" data-btn="0"><circle cx="264" cy="132" r="15"/><text class="tx" x="264" y="136.5">A</text><g class="sh"><path d="M258.5 126.5 269.5 137.5M269.5 126.5 258.5 137.5"/></g></g>
  <g class="pb" data-btn="11"><circle cx="214" cy="148" r="16"/><circle class="inner" cx="214" cy="148" r="7"/></g>
  <rect class="pad-deco" x="142" y="139" width="15" height="15"/>
  <g class="pb" data-btn="12"><rect x="142" y="122" width="15" height="17" rx="2"/></g>
  <g class="pb" data-btn="13"><rect x="142" y="154" width="15" height="17" rx="2"/></g>
  <g class="pb" data-btn="14"><rect x="125" y="139" width="17" height="15" rx="2"/></g>
  <g class="pb" data-btn="15"><rect x="157" y="139" width="17" height="15" rx="2"/></g>
</svg>`;
const DIAGRAM_TEXT = { xb: { 4: 'LB', 5: 'RB', 6: 'LT', 7: 'RT' }, ps: { 4: 'L1', 5: 'R1', 6: 'L2', 7: 'R2' } };
const STEER_CHOICES = [['stick', 'Left stick'], ['both', 'Stick + D-pad'], ['dpad', 'D-pad']];
/* Cup art: a gold, silver, or bronze trophy for a podium finish, and a three-star rating. */
const trophyImg = rank => rank >= 1 && rank <= 3 ? h('img', { class: 'trophy', src: `assets/ui/trophy-${['gold', 'silver', 'bronze'][rank - 1]}.webp`, alt: '' }) : null;
const starRow = n => h('span', { class: 'star-row', role: 'img', 'aria-label': `${n} of 3 stars` }, [0, 1, 2].map(i => h('img', { class: i < n ? '' : 'off', src: 'assets/ui/star.webp', alt: '' })));
/* The larger of the two areas a panel leaves free: beside it (landscape) or above it (portrait). The 3D scene is framed there. */
const freeRect = panel => { const r = panel.getBoundingClientRect(), W = innerWidth, H = innerHeight; return r.left * H >= W * r.top ? { left: 0, top: 0, width: r.left, height: H } : { left: 0, top: 0, width: W, height: r.top }; };
const PLAYER_COLORS = ['#ff4d6d', '#38b6ff', '#ffd23c', '#2ee6a6'];
const LEVELS = [['easy', 'Relaxed', 'Rivals top out at 93% speed, hold a loose line, and sit on their items. They never take a shortcut.'], ['normal', 'Competitive', 'Rivals run at nearly full speed, hold a tidy line, and use their items in good time. Now and then, one takes a shortcut.'], ['hard', 'Ruthless', 'Rivals run at full speed, hold the tightest line, take shortcuts, and fire items the moment they land.']];
const CC_LIST = [50, 100, 150, 200];
const STAT_LABELS = [['speed', 'Speed'], ['accel', 'Acceleration'], ['handling', 'Handling'], ['weight', 'Weight']];

export class Menus {
  constructor(app) {
    this.app = app; this.layer = h('div', { class: 'menu-layer' }); app.ui.appendChild(this.layer);
    this.stack = []; this.screen = null; this.focusEl = null;
    this.layer.addEventListener('focusin', e => {
      const target = e.target.closest('[data-f], button');
      if (target && this.screen?.el.contains(target)) this.focus(target, false);
    });
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
    // Screen changes in menu-land wear the checker wipe (#92) as a flourish over the
    // change: the checkerboard sweeps in and out while the mount itself stays
    // synchronous — input and anything sampling screen state never wait on an
    // animation. Scene changes are the ones that swap under full cover, via
    // App.transition. Screens over a live race (pause, results) get no wipe.
    const A = this.app;
    if (A.wipe && this.screen && this.screen.spec.name !== spec.name && (!A.session || A.attract)) A.wipe.through(null, { cover: 200, reveal: 240 });
    this._doMount(spec);
  }
  _doMount(spec) {
    if (this.screen) { this.screen.el.remove(); this.screen.onClose?.(); }
    const def = this['s_' + spec.name](spec.params || {});
    def.spec = spec; def.el.classList.add('menu-screen', 'screen-' + spec.name);
    this.layer.appendChild(def.el); this.screen = def; this.focusEl = null;
    this._scrollHint(def);
    const first = def.el.querySelector('[data-f][data-default]') || def.el.querySelector('[data-f]:not(.back):not(:disabled)') || def.el.querySelector('.back');
    if (first) this.focus(first, false);
    def.onOpen?.(); def.onLayout?.();
    this.app.showroom?.setShown(!!def.stage);   // the turntable karts appear only on screens that place them
    if (def.onLayout) requestAnimationFrame(() => { if (this.screen === def) def.onLayout(); });   // again once fonts and images have settled the layout
  }
  /* One scroll check for every screen, run where screens mount: while more content sits below the fold,
     the screen wears a fade at its bottom edge; at the end of the scroll, the fade is gone. */
  _scrollHint(def) {
    const sc = def.el;
    sc.appendChild(h('div', { class: 'scroll-fade', 'aria-hidden': 'true' }));
    const check = () => sc.classList.toggle('more-below', sc.scrollHeight - sc.scrollTop - sc.clientHeight > 4);
    check(); requestAnimationFrame(check);
    sc.addEventListener('scroll', check, { passive: true });
    addEventListener('resize', check);
    const prevClose = def.onClose;
    def.onClose = () => { removeEventListener('resize', check); prevClose?.(); };
  }
  focus(el, sound = true) {
    if (this.focusEl === el) return;
    this.focusEl?.classList.remove('focus'); this.focusEl = el;
    if (el) { el.focus({ preventScroll: true }); el.classList.add('focus'); el.scrollIntoView?.({ block: 'nearest', inline: 'nearest' }); el.dispatchEvent(new CustomEvent('menufocus')); if (sound) this.app.audio?.ui('move'); }
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
    if ((dir === 'left' || dir === 'right') && this.focusEl.hasAttribute('data-adjust') && getComputedStyle(this.focusEl.parentElement).display !== 'grid') { this.focusEl.dispatchEvent(new CustomEvent('adjust', { detail: dir === 'right' ? 1 : -1 })); return; }
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
  header(title, sub) { return h('header', { class: 'menu-head' }, h('button', { class: 'back', 'data-f': true, 'aria-label': 'Back', onclick: () => this.back(), html: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 4.5 7.5 12l7.5 7.5" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/></svg>' }), h('div', {}, h('h1', {}, title), sub && h('p', {}, sub))); }

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
    const row = h('div', { class: 'row' }, this.btn('How to play', () => this.open('howto'), { cls: 'small' }), this.btn('Options', () => this.open('options'), { cls: 'small' }), this.btn('Records', () => this.open('records'), { cls: 'small' }));
    /* install guidance (src/ui/install.js): a persistent button in the row and a one-time
       hint card under the nav, each present only where installing is actually possible;
       both redraw if the browser hands us its install prompt while the menu is up */
    const slot = h('div', { class: 'install-slot' });
    let installBtnEl = null;
    /* short landscape (a phone on its side) has no spare width in the button row or height
       in the column: there the hint card floats over the scene instead (install.css) and
       carries the action on its own — Options keeps its Install row at every size */
    const shortLandscape = matchMedia('(max-height: 500px) and (orientation: landscape)').matches;
    const drawInstall = () => {
      const spec = shortLandscape ? null : installButton();
      if (spec && !installBtnEl) { installBtnEl = this.btn(spec.label, () => spec.act(), { cls: 'small' }); row.appendChild(installBtnEl); row.classList.add('has-install'); }
      if (!spec && installBtnEl) { installBtnEl.remove(); installBtnEl = null; row.classList.remove('has-install'); }
      const card = installCard();
      slot.replaceChildren(...(card ? [card] : []));
    };
    const el = h('div', {},
      h('div', { class: 'logo small' }, h('div', { class: 'logo-top' }, 'BILLIONAIRE'), h('div', { class: 'logo-main' }, ...'KART'.split('').map((c, i) => h('span', { style: `--i:${i}` }, c)))),
      h('nav', { class: 'main-nav' },
        this.btn('Grand Prix', () => start('gp'), { cls: 'big c1', def: true, sub: 'Four races, one trophy' }),
        this.btn('Quick Race', () => start('vs'), { cls: 'big c2', sub: 'Any track, your rules' }),
        this.btn('Time Trial', () => { A.flow = { mode: 'timetrial', players: 1, devices: ['any'] }; this.open('racers', { player: 0 }); }, { cls: 'big c3', sub: 'Just you and the clock' }),
        row),
      slot);
    drawInstall();
    const offInstall = onInstallChange(drawInstall);
    return { el, onClose: offInstall, onBack: () => { this.reset('title'); return false; } };
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
    const name = h('h2', {}), title = h('div', { class: 'r-title' }), quote = h('p', { class: 'r-quote' }), bio = h('p', { class: 'r-bio' }), special = h('p', { class: 'r-special' }), stats = h('div', { class: 'r-stats' }), big = h('img', { class: 'r-portrait', alt: '', draggable: 'false' });
    const tiles = new Map();
    const choose = r => {
      flow.racers[player] = r.id; A.save.data.last.racer[player] = r.id; A.save.write();
      A.audio?.racerPicked?.(r);
      if (player + 1 < n) this.open('racers', { player: player + 1 }); else this.open('setup');
    };
    // Looking and choosing are separate: a tile shows the racer, the button under the card picks them.
    const go = this.btn('', () => choose(current), { cls: 'go r-go' }), goLabel = go.querySelector('.btn-label');
    const show = r => {
      current = r; big.src = r.portrait; big.style.setProperty('--rc', hex(r.color)); name.textContent = r.name; title.textContent = r.title; quote.textContent = `“${r.quote}”`; bio.textContent = r.bio;
      special.replaceChildren(...(r.special ? [h('b', {}, r.special.name), ' ', r.special.text] : [])); special.hidden = !r.special;
      stats.replaceChildren(...STAT_LABELS.map(([k, label]) => h('div', { class: 'stat stat-' + k, role: 'img', 'aria-label': `${label}: ${r.stats[k]} of 5` }, h('span', {}, label), h('i', {}, ...Array.from({ length: 5 }, (_, i) => h('b', { class: i < r.stats[k] ? 'on' : '' }))))));
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
      h('div', { class: 'racer-layout' }, h('div', { class: 'racer-grid-box' }, grid), stage, h('aside', { class: 'racer-card', style: n > 1 ? `--pc:${PLAYER_COLORS[player]}` : '' }, h('div', { class: 'r-top' }, big, h('div', { class: 'r-id' }, h('div', { class: 'r-head' }, name, title), quote)), bio, stats, special, go)));
    return {
      el, onOpen: () => { A.showRoomFor(flow.racers.slice(0, player).map(id => RACER_BY_ID[id]).concat([current])); show(current); },
      // on a short upright screen the portraits and the card take the height; the turntable steps aside rather than show as a sliver
      stage: true, onLayout: () => { const r = stage.getBoundingClientRect(), room = r.height >= 90 && r.width >= 90; A.showroom?.setShown(room); if (room) A.showroom?.setStage(r); },
      onBack: () => { flow.racers.length = player; },
    };
  }

  /* ---------- engine class and rivals ---------- */
  s_setup() {
    const A = this.app, flow = A.flow, last = A.save.data.last;
    const trial = flow.mode === 'timetrial';
    flow.cc = flow.cc || (trial ? last.trialCc : last.cc); flow.level = flow.level || last.level;
    const ccBtns = CC_LIST.map(cc => { const b = h('button', { class: 'card cc', 'data-f': true, 'data-default': cc === flow.cc, onclick: () => {
      flow.cc = cc;
      if (trial) { last.trialCc = cc; A.save.write(); this.open('tracks'); }
      else { mark(); this.focus(next); }
    } }, h('div', { class: 'cc-n' }, CLASSES[cc].label), h('div', { class: 'cc-l' }, CLASSES[cc].name), h('div', { class: 'cc-d' }, cc === 50 ? 'Gentle pace' : cc === 100 ? 'The standard' : cc === 150 ? 'Fast and frantic' : 'Growth at all costs')); b.dataset.cc = cc; return b; });
    if (trial) return { el: h('div', {}, this.header('Time Trial', 'Choose an engine class.'), h('div', { class: 'cards four trial-classes' }, ccBtns)) };
    const lvBtns = LEVELS.map(([id, label]) => { const b = h('button', { class: 'chip', 'data-f': true, onclick: () => { flow.level = id; mark(); } }, label); b.dataset.lv = id; return b; });
    const lvDesc = h('p', { class: 'lv-desc' });
    const mark = () => { for (const b of ccBtns) b.classList.toggle('sel', +b.dataset.cc === flow.cc); for (const b of lvBtns) b.classList.toggle('sel', b.dataset.lv === flow.level); lvDesc.textContent = LEVELS.find(l => l[0] === flow.level)[2]; };
    const next = this.btn('Next', () => { last.cc = flow.cc; last.level = flow.level; A.save.write(); this.open(flow.mode === 'gp' ? 'cups' : 'tracks'); }, { cls: 'go' });
    mark();
    const el = h('div', {}, this.header('Engine class'), h('div', { class: 'cards four' }, ccBtns), h('h3', { class: 'sub-h' }, 'Rivals'), h('div', { class: 'chips' }, lvBtns), lvDesc, h('div', { class: 'foot' }, next));
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
    return { el: h('div', {}, this.header('Choose a cup', `${CLASSES[flow.cc].label} · ${LEVELS.find(l => l[0] === flow.level)[1]} rivals`), h('div', { class: 'cards cups' }, cards)) };
  }

  /* ---------- single track ---------- */
  s_tracks() {
    const A = this.app, flow = A.flow, cc = flow.cc || A.save.data.last.cc;
    // one screenful: at eight tracks or fewer the grid below is the plain two
    // rows of four; past eight it takes the 'many' layout (styles/menu.css),
    // which fits a growing roster on the same screen instead of growing a
    // third row off the bottom; the line under the title describes the track in focus
    const head = this.header(flow.mode === 'timetrial' ? `Time Trial · ${CLASSES[cc].label}` : 'Choose a track', '\u00a0'), sub = head.querySelector('p');
    const cards = TRACKS.map(t => {
      const best = A.save.bestFor(t.id, flow.mode === 'timetrial' ? trialKey(cc) : cc);
      const card = h('button', { class: 'card track', 'data-f': true, 'data-default': t.id === A.save.data.last.track, onclick: () => { A.save.data.last.track = t.id; A.save.write(); A.startSingle(t.id); } },
        h('div', { class: 'track-thumb', style: t.thumb ? `background-image:url(${t.thumb})` : '' }, !t.thumb && h('span', {}, t.name[0]), best?.race && h('em', { class: 'track-best' }, `Best ${fmtTime(best.race)}`)), h('h2', {}, t.name));
      const say = () => { sub.textContent = t.tagline || '\u00a0'; };
      card.addEventListener('menufocus', say); card.addEventListener('pointerenter', say);
      return card;
    });
    return { el: h('div', {}, head, h('div', { class: 'cards tracks' + (TRACKS.length > 8 ? ' many' : '') }, cards)) };
  }

  /* ---------- pause ---------- */
  s_pause() {
    const A = this.app, turn = A.mustTurn();
    // a phone held upright races best sideways: say so, but Resume stays on the panel — a player who can
    // only hold the device upright (a controller cradle, say) races on, and the prompt stays away for the race
    const el = h('div', {}, h('div', { class: 'panel narrow' + (turn ? ' turn' : '') },
      turn ? [h('div', { class: 'turn-phone', 'aria-hidden': 'true' }), h('h1', {}, 'Turn your phone sideways'), h('p', { class: 'turn-sub' }, 'The race is paused.'), this.btn('Resume anyway', () => A.resume(), { def: true })] : [h('h1', {}, 'Paused'), this.btn('Resume', () => A.resume(), { def: true })],
      this.btn('Restart race', () => A.restartRace()), this.btn('How to play', () => this.open('howto')), this.btn('Options', () => this.open('options')), this.btn('Quit to menu', () => A.quitToMenu(), { cls: 'danger' })));
    return { el, onBack: () => { A.resume(); return false; }, onAction: a => { if (a === 'pause') { A.resume(); return true; } } };
  }

  /* ---------- results ---------- */
  s_results({ results, gp, track, records, best, trialCc }) {
    const A = this.app;
    // One final screen (#243): a single race's finish wears the podium framing — the place
    // headline and trophy — over this same full table, instead of a separate podium step
    // with the table behind a button. GP races and time trials keep the plain header.
    const head = best == null ? null : best === 1 ? 'You win!' : best === 2 ? 'Second place' : best === 3 ? 'Third place' : `${best}${ordinalSuffix(best)} place`;
    const rows = results.map((r, i) => {
      const total = gp ? gp.totals[r.racer.id] : null;
      // A kart classified on an estimate never crossed the line: the cell says DNF and labels the
      // estimate as one, instead of dressing a guess up as a finish time (#144). A finisher's cell
      // carries their best lap under the total (#143).
      const lapsDone = r.kart.lapTimes.length;
      const time = r.estimated
        ? h('span', { class: 'res-time dnf' }, h('b', {}, 'DNF'), h('small', { class: 'res-best' }, `${lapsDone ? `${lapsDone} lap${lapsDone > 1 ? 's' : ''} done` : 'on lap 1'} · est. ${fmtTime(r.time)}`))
        : h('span', { class: 'res-time' }, fmtTime(r.time), isFinite(r.bestLap) && h('small', { class: 'res-best' }, `Best lap ${fmtTime(r.bestLap).slice(0, -2)}`));
      return h('div', { class: 'res-row' + (r.isPlayer ? ' me' : '') + (r.estimated ? ' dnf' : ''), style: `--d:${i * 70}ms;--rc:${hex(r.racer.color)}` + (r.isPlayer ? `;--pc:${PLAYER_COLORS[r.playerIndex]}` : '') },
        h('b', { class: 'res-rank' }, String(r.rank)), h('img', { src: r.racer.portrait, alt: '' }), h('span', { class: 'res-name' }, r.racer.name, r.isPlayer && h('em', {}, results.filter(x => x.isPlayer).length > 1 ? `P${r.playerIndex + 1}` : 'You')),
        time, gp && h('span', { class: 'res-pts' }, `+${r.points}`), gp && h('span', { class: 'res-total' }, String(total)));
    });
    // The payoff strip: each human's race in numbers, from the stats the race already kept (#143).
    // Top speed in honest mph: kart speed is m/s; 2.23694 is MPH_PER_MS in ui/hud.js (PR #160), so the strip matches the speedometer.
    const humans = results.filter(r => r.isPlayer);
    const strips = humans.map(r => {
      const s = r.stats || {}, parts = [];
      if (s.hitsGiven) parts.push(`Hostile takeovers: ${s.hitsGiven} served`);
      if (s.hitsTaken) parts.push(`Lawsuits weathered: ${s.hitsTaken}`);
      parts.push(`Drifts: ${s.drifts || 0}`, `Boosts: ${s.boosts || 0}`);
      if (s.overtakes) parts.push(`Overtakes: ${s.overtakes}`);
      parts.push(`Top speed: ${Math.round((s.topSpeed || 0) * 2.23694)} mph`, `Coins banked: ${s.coins || 0}`);
      return h('div', { class: 'res-strip', style: humans.length > 1 ? `--pc:${PLAYER_COLORS[r.playerIndex]}` : '' },
        h('b', {}, humans.length > 1 ? `${r.racer.name} in numbers` : 'Your race in numbers'), h('span', {}, parts.join(' · ')));
    });
    const buttons = gp
      ? [this.btn(gp.last ? 'See final standings' : 'Next race', () => A.gpNext(), { cls: 'go', def: true })]
      : [this.btn('Race again', () => A.restartRace(), { cls: 'go', def: true }), this.btn('Choose another track', () => A.backToTracks()), this.btn('Quit to menu', () => A.quitToMenu())];
    const el = h('div', {}, h('div', { class: 'panel results' + (head ? ' podium' : '') },
      head
        ? h('div', { class: 'cupres-head' }, trophyImg(best), h('div', {}, h('h1', {}, head), h('p', { class: 'res-sub' }, track.name)))
        : h('h1', {}, track.name),
      trialCc && h('p', { class: 'res-sub' }, `Time Trial · ${CLASSES[trialCc].label}`),
      gp && h('p', { class: 'res-sub' }, `Race ${gp.index + 1} of ${gp.count}`),
      records?.newBestRace && h('div', { class: 'badge' }, 'New best time'), records?.newBestLap && !records.newBestRace && h('div', { class: 'badge' }, 'New best lap'),
      h('div', { class: 'res-table' + (gp ? ' gp' : '') }, rows),
      strips.length && h('div', { class: 'res-strips' }, strips),
      // the winner's line and the last finisher's: each stays in one piece, side by side when both fit
      h('p', { class: 'res-quote' }, h('span', {}, h('b', {}, results[0].racer.name + ': '), `“${results[0].racer.barks.win}”`),
        results.length > 2 && h('span', {}, h('b', {}, results[results.length - 1].racer.name + ': '), `“${results[results.length - 1].racer.barks.lose}”`)),
      h('div', { class: 'foot' }, buttons)));
    // With the podium framing, the showroom's three-kart podium stands behind this screen,
    // framed in whatever space the panel leaves — the deleted podium screen's arrangement.
    return head
      ? { el, onBack: () => false, stage: true, onLayout: () => A.showroom?.setStage(freeRect(el.firstElementChild)) }
      : { el, onBack: () => false };
  }

  s_cupResults({ cup, standings, playerRanks, stars }) {
    const A = this.app, best = Math.min(...playerRanks);
    const head = best === 1 ? 'Champion!' : best === 2 ? 'Second place' : best === 3 ? 'Third place' : `${best}${ordinalSuffix(best)} place`;
    const el = h('div', {}, h('div', { class: 'panel cupres' },
      h('div', { class: 'cupres-head' }, trophyImg(best), h('div', {}, h('h1', {}, head), h('p', { class: 'res-sub' }, cup.name), best === 1 && starRow(stars))),
      h('div', { class: 'res-table final' }, standings.map((s, i) => h('div', { class: 'res-row' + (s.isPlayer ? ' me' : ''), style: `--d:${i * 60}ms;--rc:${hex(s.racer.color)}` }, h('b', { class: 'res-rank' }, String(i + 1)), h('img', { src: s.racer.portrait, alt: '' }), h('span', { class: 'res-name' }, s.racer.name), h('span', { class: 'res-total' }, String(s.points))))),
      h('div', { class: 'foot' }, this.btn('Race this cup again', () => A.restartCup(), { cls: 'go', def: true }), this.btn('Change racer', () => A.backToRacers()), this.btn('Continue', () => A.quitToMenu()))));
    return { el, onBack: () => false, stage: true, onLayout: () => A.showroom?.setStage(freeRect(el.firstElementChild)) };
  }

  /* ---------- options ---------- */
  s_options() {
    const A = this.app, S = A.save.settings;
    const stepper = (label, key, fmt, step = 0.1, min = 0, max = 1) => {
      const val = h('b', {}, fmt(S[key]));
      const set = d => { S[key] = Math.round(Math.min(max, Math.max(min, S[key] + d * step)) * 100) / 100; val.textContent = fmt(S[key]); A.save.write(); A.applySettings(); A.audio?.ui('move'); };
      const change = (d, symbol) => h('button', { 'data-f': true, 'aria-label': `${d < 0 ? 'Decrease' : 'Increase'} ${label.toLowerCase()}`, onclick: () => set(d) }, symbol);
      return h('div', { class: 'opt volume' }, h('span', {}, label), h('div', { class: 'opt-ctl' }, change(-1, '−'), val, change(1, '+')));
    };
    const cycle = (label, key, options) => {
      const val = h('b', {}, options.find(o => o[0] === S[key])?.[1] || '');
      const set = d => { const i = options.findIndex(o => o[0] === S[key]); const n = options[(i + d + options.length) % options.length]; S[key] = n[0]; val.textContent = n[1]; A.save.write(); A.applySettings(); A.audio?.ui('move'); };
      const row = h('button', { class: 'opt', 'data-f': true, 'data-adjust': true, onclick: () => set(1) }, h('span', {}, label), h('div', { class: 'opt-ctl' }, val));
      row.addEventListener('adjust', e => set(e.detail)); return row;
    };
    const onoff = [[true, 'On'], [false, 'Off']], touch = matchMedia('(pointer: coarse)').matches;   // touch settings only where there is a touch screen
    const pct = v => Math.round(v * 100) + '%';
    // full screen is a row like the others; it follows the browser's own state, since Esc and F11 change it too
    let fsOff = null;
    const fullScreenRow = () => {
      const val = h('b', {}, document.fullscreenElement ? 'On' : 'Off');
      const set = () => { A.fullscreen(!document.fullscreenElement); A.audio?.ui('move'); };
      const row = h('button', { class: 'opt', 'data-f': true, onclick: set }, h('span', {}, 'Full screen'), h('div', { class: 'opt-ctl' }, val));
      const sync = () => { val.textContent = document.fullscreenElement ? 'On' : 'Off'; };
      document.addEventListener('fullscreenchange', sync); fsOff = () => document.removeEventListener('fullscreenchange', sync);
      return row;
    };
    // the controller mapping lives on its own screen (below); this row is the door
    const padRow = () => h('button', { class: 'opt', 'data-f': true, onclick: () => this.open('pad') }, h('span', {}, 'Controller'), h('div', { class: 'opt-ctl' }, h('b', {}, 'Buttons…')));
    // installing is a row too, wherever the browser allows it; the label says what tapping does here
    const installRow = () => {
      const spec = installButton(); if (!spec) return null;
      const row = h('button', { class: 'opt', 'data-f': true, onclick: () => { spec.act(); A.audio?.ui('move'); } }, h('span', {}, 'Install app'), h('div', { class: 'opt-ctl' }, h('b', {}, spec.label === 'Install app' ? 'Install' : 'Guide')));
      return row;
    };
    const el = h('div', {}, this.header('Options'), h('div', { class: 'panel options' },
      stepper('Music', 'music', pct), stepper('Sound effects', 'sfx', pct),
      cycle('Graphics', 'quality', [['auto', 'Automatic'], ['low', 'Low'], ['medium', 'Medium'], ['high', 'High'], ['ultra', 'Ultra']]),
      document.fullscreenEnabled && fullScreenRow(),
      installRow(),
      padRow(),
      cycle('Camera shake', 'shake', onoff), cycle('Automatic tricks', 'autoTrick', onoff), cycle('Steering assist', 'smartSteer', onoff), cycle('Pause in portrait', 'pausePortrait', onoff),
      touch && cycle('Automatic accelerate', 'autoGo', onoff), touch && cycle('Tilt to steer', 'tilt', onoff)));
    return { el, onClose: () => fsOff?.() };
  }

  /* ---------- controller buttons ----------
     One diagram, six rows, one name per button (issue #194). Pressing a
     physical button lights it on the diagram and names it in the readout;
     tapping a row (or focusing it and pressing confirm) makes the row itself
     listen for the next press — there are no per-row Remap links. Menus
     derive confirm/back from the Accelerate/Brake buttons, so they are not
     rows of their own. The "also" buttons keep working but are never shown. */
  s_pad() {
    const A = this.app, S = A.save.settings, input = A.input;
    const persist = () => { S.padBinds = JSON.parse(JSON.stringify(input.padBinds)); S.padSteer = input.padSteer; A.save.write(); A.applySettings(); };
    let fam = 'xb';   // naming family of the connected pad; Xbox-style until a PlayStation pad shows up
    const readout = h('div', { class: 'pad-readout' }, 'Press any button on your controller — it lights up here.');
    const diagram = h('div', { class: 'pad-diagram-wrap', html: PAD_SVG });
    const btnEls = new Map(), txtEls = new Map();
    diagram.querySelectorAll('[data-btn]').forEach(el => btnEls.set(+el.dataset.btn, el));
    diagram.querySelectorAll('[data-txt]').forEach(el => txtEls.set(+el.dataset.txt, el));
    let capturing = null, sawRelease = false, prev = new Set(), raf = 0, flashN = -1, flashUntil = 0;
    const rows = new Map();
    const labelOf = id => PAD_ACTIONS.find(a => a.id === id).label;
    const drawRow = a => {
      const r = rows.get(a.id); if (!r) return;
      r.el.classList.toggle('capturing', capturing === a.id);
      r.name.textContent = capturing === a.id ? 'Press a button…' : buttonName(input.padBinds[a.id][0], fam);
      r.name.classList.toggle('listening', capturing === a.id);
    };
    const drawAll = () => { for (const a of PAD_ACTIONS) drawRow(a); };
    const setFamily = f => {
      if (f === fam && diagram.classList.contains('fam-set')) return;
      fam = f; diagram.classList.add('fam-set'); diagram.classList.toggle('fam-ps', fam === 'ps');
      for (const [n, el] of txtEls) el.textContent = DIAGRAM_TEXT[fam][n] || el.textContent;
      drawAll();
    };
    const startCapture = id => { capturing = id; sawRelease = prev.size === 0; readout.textContent = `Press the button for ${labelOf(id)} — or tap the row again to cancel.`; drawAll(); };
    const endCapture = msg => { capturing = null; if (msg) readout.textContent = msg; drawAll(); };
    const doBind = (id, n) => {
      const res = applyPadBind(input.padBinds, id, n);
      let msg = `${labelOf(id)} is now the ${buttonName(n, fam)} button.`;
      if (res.swapped) msg += ` It swapped with ${labelOf(res.swapped)}.`;
      persist(); A.audio?.ui('select'); endCapture(msg);
    };
    const showPress = n => {
      const acts = PAD_ACTIONS.filter(a => input.padBinds[a.id].includes(n)).map(a => a.label);
      readout.textContent = `${buttonName(n, fam)} — ${acts.length ? acts.join(' · ') : 'not used'}`;
      flashN = n; flashUntil = performance.now() + 650;
    };
    /* Tapping a button on the diagram does what pressing it does — and while a
       row is listening, tapping the diagram is a way to bind without a pad. */
    for (const [n, el] of btnEls) el.addEventListener('click', () => { if (capturing) doBind(capturing, n); else showPress(n); });
    /* While the panel is open it polls the pads itself: menu navigation only
       reports the mapped actions, but discovery needs every raw button. */
    const tick = () => {
      raf = requestAnimationFrame(tick);
      const gps = navigator.getGamepads ? navigator.getGamepads() : [];
      let pad = null; const pressed = new Set();
      for (const gp of gps) { if (!gp || !gp.connected) continue; pad = pad || gp; gp.buttons.forEach((btn, i) => { if (btn.pressed || btn.value > 0.5) pressed.add(i); }); }
      if (pad) setFamily(padFamily(pad.id));
      const fresh = [...pressed].filter(i => !prev.has(i));
      if (capturing) {
        if (!pressed.size) sawRelease = true;               // the press that opened capture must clear first
        else if (sawRelease && fresh.length) doBind(capturing, fresh[0]);
      } else if (fresh.length) showPress(fresh[fresh.length - 1]);
      /* the diagram and the rows light up live, for exactly as long as the press lasts */
      const lit = capturing ? new Set() : new Set([...pressed, ...(performance.now() < flashUntil ? [flashN] : [])]);
      for (const [n, el] of btnEls) el.classList.toggle('lit', lit.has(n));
      for (const a of PAD_ACTIONS) rows.get(a.id)?.el.classList.toggle('hit', !capturing && [...pressed].some(n => input.padBinds[a.id].includes(n)));
      prev = pressed;
    };
    const list = h('div', { class: 'pad-rows' }, PAD_ACTIONS.map(a => {
      const name = h('span', { class: 'bind-name' });
      const el = h('button', { class: 'pad-row', 'data-f': true, onclick: () => { if (capturing === a.id) endCapture('Tap an action, then press the button for it.'); else if (!capturing) startCapture(a.id); } },
        h('span', { class: 'pad-label' }, a.label), name);
      rows.set(a.id, { el, name });
      return el;
    }));
    // steering: three plain choices, the current one filled in
    const segBtns = new Map();
    const drawSteer = () => { for (const [id, b] of segBtns) b.classList.toggle('sel', input.padSteer === id); };
    const steerRow = h('div', { class: 'pad-steer' }, h('span', { class: 'pad-label' }, 'Steering'),
      h('div', { class: 'seg' }, STEER_CHOICES.map(([id, label]) => { const b = h('button', { class: 'seg-btn', 'data-f': true, onclick: () => { input.padSteer = id; persist(); drawSteer(); A.audio?.ui('move'); } }, label); segBtns.set(id, b); return b; })));
    const el = h('div', {}, this.header('Controller', 'Tap an action, then press the button for it.'),
      h('div', { class: 'panel pad' }, diagram, readout, list, steerRow,
        h('p', { class: 'pad-note' }, 'The triggers always work as the gas and brake pedals too.'),
        h('div', { class: 'foot' }, this.btn('Reset to defaults', () => { input.padBinds = defaultPadBindings(); input.padSteer = 'both'; drawSteer(); persist(); endCapture('Back to the standard layout.'); A.audio?.ui('back'); }), this.btn('Done', () => this.back(), { cls: 'go' }))));
    drawAll(); drawSteer();
    return {
      /* no data-default button on this screen: initial focus lands on the first
         row, so the mount-time scrollIntoView keeps the diagram in view */
      el, onOpen: () => { raf = requestAnimationFrame(tick); }, onClose: () => { cancelAnimationFrame(raf); },
      /* while capturing, pad presses belong to the capture (the poll above), not to menu navigation;
         a keyboard Esc still cancels */
      onAction: (a, dev) => { if (!capturing) return false; if (a === 'back' && !String(dev).startsWith('pad')) endCapture('Remap cancelled.'); return true; },
    };
  }

  /* ---------- how to play ---------- */
  s_howto() {
    const touch = matchMedia('(pointer: coarse)').matches;
    const key = (...k) => h('span', { class: 'keys' }, k.map(x => h('kbd', {}, x)));
    // each action, and how to do it on each kind of control; the screen shows one kind at a time
    // the controller column is read from the live bindings, so it stays true after a remap
    const B = this.app.input.padBinds, gp0 = (navigator.getGamepads ? [...navigator.getGamepads()] : []).find(g => g && g.connected), D = a => describePadBind(B, a, padFamily(gp0?.id)), withTrig = (a, idx, word) => B[a].includes(idx) ? D(a) : `${D(a)} or ${word}`;
    const padRows = [['Steer', this.app.input.padSteer === 'dpad' ? 'D-pad' : this.app.input.padSteer === 'stick' ? 'Left stick' : 'Left stick or D-pad'],
      ['Accelerate', withTrig('accelerate', 7, 'right trigger')], ['Drift and hop', D('drift')], ['Use item', D('item')],
      ['Brake and reverse', withTrig('brake', 6, 'left trigger')], ['Look behind', D('rear')], ['Pause', D('pause')]];
    const HOW = {
      kb: [['Steer', [key('A', 'D'), 'or', key('←', '→')]], ['Accelerate', [key('W'), 'or', key('↑')]], ['Drift and hop', key('Space')], ['Use item', [key('E'), 'or', key('Enter')]], ['Brake and reverse', [key('S'), 'or', key('↓')]], ['Look behind', key('Q')], ['Pause', key('Esc')]],
      pad: padRows,
    };
    const tips = touch ? [
      ['Drift for speed', 'Steer hard through a turn and the kart hops into a drift. Sparks go blue, orange, then purple. Straighten up to boost.'],
      ['Collect coins', 'Each coin makes you faster, up to ten.'],
      ['Follow closely', 'Tuck in behind a kart to slingshot past.'],
      ['Throw it backward', 'Use an item while braking to send it behind you.'],
    ] : [
      ['Drift for speed', 'Hold drift through a turn. Sparks go blue, orange, then purple. Let go to boost.'],
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
      h('div', { class: 'panel' }, h('h3', {}, 'Go faster'), h('ul', { class: 'tips' }, tips.map(t => h('li', {}, h('b', {}, t[0]), h('span', {}, t[1]))))),
      installPanel()),
      h('div', { class: 'foot' }, this.btn('Got it', () => this.back(), { cls: 'go', def: true }), this.btn('Controller buttons', () => this.open('pad')), this.btn('See the items', () => this.open('items'))));
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
    const legacy = TRACKS.some(t => A.save.bestFor(t.id, 'tt')?.race);
    const heading = h('tr'), body = h('tbody');
    const draw = trial => {
      const columns = CC_LIST.map(cc => [CLASSES[cc].label, trial ? trialKey(cc) : cc]);
      if (trial && legacy) columns.push(['Class unknown', 'tt']);
      heading.replaceChildren(h('th', { scope: 'col' }, 'Track'), ...columns.map(([title]) => h('th', { scope: 'col' }, title)));
      body.replaceChildren(...TRACKS.map(t => h('tr', {}, h('th', { scope: 'row' }, t.name),
        columns.map(([, id]) => { const time = A.save.bestFor(t.id, id)?.race; return h('td', {}, time ? fmtTime(time) : '–'); }))));
      for (const [value, b] of choices) { b.classList.toggle('sel', value === trial); b.setAttribute('aria-pressed', String(value === trial)); }
    };
    const choices = [[false, 'Races'], [true, 'Time Trial']].map(([trial, label]) => [trial, this.btn(label, () => draw(trial), { cls: 'chip' })]);
    draw(false);
    const el = h('div', {}, this.header('Records', `${st.races} races · ${st.wins} wins · ${st.coins} coins banked · ${st.hitsGiven} hostile takeovers`),
      h('div', { class: 'chips record-modes' }, choices.map(([, b]) => b)),
      h('div', { class: 'panel records' }, h('table', {}, h('thead', {}, heading), body)));
    return { el };
  }
}
export { PLAYER_COLORS };
