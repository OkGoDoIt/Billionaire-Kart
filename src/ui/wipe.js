/* Screen wipe: a checkerboard of tiles in the start line's black and off-white
   that flip in to cover the screen, the scene swaps while it is covered, and
   the tiles flip away again. It replaces the old fade-to-dark curtain: same
   call sites, same job, more flag.
   Safety, in order: the tiles never take pointer events, so input is never
   trapped; a swap queued behind another still runs, so a scene change is
   never lost; a second wipe requested mid-flight folds into the running one
   instead of stacking; and a watchdog forces the board away if anything
   stalls, so the screen is never left covered. */

const REDUCED = matchMedia('(prefers-reduced-motion: reduce)');

export class Wipe {
  constructor(parent = document.body) {
    this.el = document.createElement('div');
    this.el.className = 'wipe'; this.el.setAttribute('aria-hidden', 'true');
    parent.appendChild(this.el);
    this.cells = []; this.cols = 0; this.rows = 0;
    this.anims = new Set();
    this.state = 'idle';           // idle | covering | covered | revealing
    this.gen = 0;                  // bumped whenever a cycle is superseded or cancelled
    this.pendingFn = null;         // the swap to run at full cover
    this.waiters = [];             // promise resolvers waiting for the reveal
    this.timers = new Set();
    this.onSound = null;           // (kind) => void, set by the app: 'cover' as the tiles flip in, 'reveal' as they flip away
    this.sound = null;
  }

  get active() { return this.state !== 'idle'; }

  _later(fn, ms) { const t = setTimeout(() => { this.timers.delete(t); fn(); }, ms); this.timers.add(t); return t; }
  _clearTimers() { for (const t of this.timers) clearTimeout(t); this.timers.clear(); }

  /* Tiles sized to the window (about 76 px each), rebuilt only when the count changes. */
  _build() {
    const cols = Math.max(10, Math.min(24, Math.round(innerWidth / 76)));
    const rows = Math.max(6, Math.min(16, Math.round(innerHeight / 76)));
    if (cols === this.cols && rows === this.rows && this.cells.length) return;
    this.cols = cols; this.rows = rows;
    this.el.replaceChildren(); this.cells = [];
    this.el.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;
    this.el.style.gridTemplateRows = `repeat(${rows}, 1fr)`;
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      const cell = document.createElement('div');
      cell.className = 'wipe-cell ' + ((r + c) % 2 ? 'b' : 'a');
      cell.dataset.d = r + c;
      this.el.appendChild(cell); this.cells.push(cell);
    }
  }

  _animate(cover, total) {
    const D = this.cols + this.rows - 1, dur = total * 0.5, step = (total - dur) / Math.max(1, D - 1);
    for (const cell of this.cells) {
      const d = +cell.dataset.d, delay = (cover ? d : D - 1 - d) * step;
      const a = cell.animate(
        cover ? [{ transform: 'rotateX(90deg)' }, { transform: 'rotateX(0deg)' }]
              : [{ transform: 'rotateX(0deg)' }, { transform: 'rotateX(-90deg)' }],
        { duration: dur, delay, easing: 'cubic-bezier(.3,.7,.3,1)', fill: 'forwards' });
      this.anims.add(a); a.finished.then(() => this.anims.delete(a), () => this.anims.delete(a));
    }
  }
  _cancelAnims() { for (const a of this.anims) a.cancel(); this.anims.clear(); }
  _snapCovered() { this._cancelAnims(); for (const cell of this.cells) cell.style.transform = 'rotateX(0deg)'; }
  _unsnap() { for (const cell of this.cells) cell.style.transform = ''; }
  _hide() { this._cancelAnims(); this._unsnap(); this.el.classList.remove('on'); }
  _settle() { const w = this.waiters; this.waiters = []; for (const r of w) r(); }

  /**
   * Cover the screen, run fn() at full cover, then reveal. Returns a promise
   * that resolves once the board is away. If a wipe is already running, fn
   * folds into it: queued swaps run in order at the same cover, and a wipe
   * requested while the board is flipping away snaps back to covered, swaps,
   * and flips away again. fn never runs twice and never gets dropped.
   */
  through(fn, { cover = 300, reveal = 340, sound = false } = {}) {
    if (REDUCED.matches) { try { fn?.(); } catch (e) { console.error(e); } return Promise.resolve(); }
    return new Promise(resolve => {
      this.waiters.push(resolve);
      if (this.state === 'covered') {           // re-entrant call from inside a swap: the board is up, swap now
        try { fn?.(); } catch (e) { console.error(e); }
        return;
      }
      if (this.state === 'covering') {          // fold into the running cover, in order
        const prev = this.pendingFn;
        this.pendingFn = () => { prev?.(); fn?.(); };
        return;
      }
      if (this.state === 'revealing') {         // snap back to covered and go again
        const gen = ++this.gen; this._clearTimers(); this._snapCovered();
        this.state = 'covered'; this.pendingFn = fn;
        this._swapAndReveal(reveal);
        this._later(() => { if (gen === this.gen && this.state !== 'idle') this.cancel(); }, reveal + 2500);
        return;
      }
      // idle: a fresh cycle
      const gen = ++this.gen;
      this.sound = sound ? this.onSound : null;   // scene changes get a whoosh; menu flourishes stay quiet
      this.sound?.('cover');
      this._build();
      this.el.classList.add('on');
      this.state = 'covering'; this.pendingFn = fn;
      this._animate(true, cover);
      this._later(() => { if (gen === this.gen && this.state === 'covering') { this.state = 'covered'; this._swapAndReveal(reveal); } }, cover + 30);
      // watchdog: whatever went wrong, the board comes down
      this._later(() => { if (gen === this.gen && this.state !== 'idle') this.cancel(); }, cover + reveal + 2500);
    });
  }

  _swapAndReveal(reveal) {
    const gen = this.gen, fn = this.pendingFn; this.pendingFn = null;
    try { fn?.(); } catch (e) { console.error(e); }   // a failed swap must not strand the board
    if (gen !== this.gen) return;                    // the swap itself started a new cycle
    this.state = 'revealing';
    this.sound?.('reveal');
    this._unsnap();
    this._animate(false, reveal);
    this._later(() => { if (gen === this.gen && this.state === 'revealing') { this._hide(); this.state = 'idle'; this._settle(); } }, reveal + 30);
  }

  /** Force the board away now. Any queued swap runs first, so nothing is lost. */
  cancel() {
    this.gen++; this._clearTimers();
    const fn = this.pendingFn; this.pendingFn = null;
    if (fn) try { fn(); } catch (e) { console.error(e); }
    this._hide(); this.state = 'idle'; this._settle();
  }
}
