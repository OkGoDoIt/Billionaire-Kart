/* After the line, online: who this screen is watching (a card at the bottom, with arrows to switch) and every
   human's race on a board at the top left (place, face, name, and how far through the race they are, or their
   time once they are home), with the wait for the results under it. Lives in one player's HUD. */
import { fmtTime, ordinalSuffix } from '../core/util.js';

const el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const place = r => `${r}<small>${ordinalSuffix(r)}</small>`;

export class WatchPanel {
  /** onStep(dir): the arrows (-1, 1). onPick(kart): a row on the board. */
  constructor(hud, { onStep, onPick }) {
    this.hud = hud;
    const card = this.card = el('div', 'wa-card');
    card.innerHTML = `
      <button class="wa-step" data-d="-1" aria-label="Watch the racer ahead">◀</button>
      <img class="wa-face" alt="">
      <div class="wa-who"><small>Watching</small><b></b><span></span></div>
      <button class="wa-step" data-d="1" aria-label="Watch the racer behind">▶</button>`;
    for (const b of card.querySelectorAll('.wa-step')) b.addEventListener('click', e => { e.stopPropagation(); onStep(+b.dataset.d); });
    this.board = el('div', 'wa-board');
    this.list = el('ol', 'wa-list'); this.until = el('p', 'wa-until');
    this.board.append(this.list, this.until);
    this.list.addEventListener('click', e => { const li = e.target.closest('.wa-row'); const row = li && this.rows?.[+li.dataset.i]; if (row) onPick(row.kart); });
    hud.root.append(this.board, this.card);
    this.$ = { face: card.querySelector('.wa-face'), label: card.querySelector('.wa-who small'), name: card.querySelector('.wa-who b'), line: card.querySelector('.wa-who span') };
    this.key = '';
  }

  /**
   * state: { target: row, rows: [{ kart, name, color, me, finished, rank, lap, laps, prog, time }], until: seconds|null,
   *          switchable: bool, board: bool (one board per screen) }
   */
  render(state) {
    const { target, rows } = state, $ = this.$;
    this.rows = rows;
    // the card: who is on screen, and where they stand
    this.card.classList.toggle('show', !!target);
    this.card.classList.toggle('solo', !state.switchable);
    if (target) {
      const line = target.finished ? (target.time ? `${place(target.rank)} · ${fmtTime(target.time)}` : `Finished ${place(target.rank)}`) : `${place(target.rank)} · Lap ${target.lap}/${target.laps}`;
      const key = `${target.kart.slot}|${target.name}|${line}`;
      if (key !== this.cardKey) {
        this.cardKey = key;
        if ($.face.dataset.src !== target.kart.racer.portrait) { $.face.src = $.face.dataset.src = target.kart.racer.portrait; }
        this.card.style.setProperty('--wc', target.color);
        $.label.textContent = target.me ? 'Your kart' : 'Watching';
        $.name.textContent = target.me ? 'You' : target.name;
        $.line.innerHTML = line;
      }
    }
    // the board: everyone with a person behind the wheel, in race order
    this.board.classList.toggle('show', !!state.board && rows.length > 0);
    this.hud.root.classList.toggle('hud-board', !!state.board && rows.length > 0);
    if (state.board) {
      const shape = rows.map(r => `${r.kart.slot}${r.finished ? 'f' : ''}${r === target ? 'w' : ''}`).join(',');
      if (shape !== this.shape) {
        this.shape = shape;
        this.list.replaceChildren(...rows.map((r, i) => {
          const li = el('li', 'wa-row' + (r.finished ? ' done' : '') + (r === target ? ' on' : '') + (r.me ? ' me' : ''));
          li.dataset.i = i; li.style.setProperty('--wc', r.color); li.style.setProperty('--laps', r.laps);
          li.innerHTML = `<i class="wa-rank"></i><img alt="" src="${esc(r.kart.racer.portrait)}"><b>${esc(r.me ? 'You' : r.name)}</b>`
            + (r.finished ? `<span class="wa-time"></span>` : `<span class="wa-bar"><i></i><em></em></span>`);
          return li;
        }));
      }
      // the moving parts, every frame: place, progress, lap, time
      rows.forEach((r, i) => {
        const li = this.list.children[i]; if (!li) return;
        const rk = li.firstChild; if (rk.dataset.r !== String(r.rank)) { rk.dataset.r = r.rank; rk.textContent = r.rank; }
        if (r.finished) { const t = li.querySelector('.wa-time'), s = r.time ? fmtTime(r.time) : 'Home'; if (t && t.textContent !== s) t.textContent = s; }
        else {
          const bar = li.querySelector('.wa-bar i'), lap = li.querySelector('.wa-bar em');
          if (bar) bar.style.width = (Math.max(0.03, r.prog) * 100).toFixed(1) + '%';
          const s = `${r.lap}/${r.laps}`; if (lap && lap.textContent !== s) lap.textContent = s;
        }
      });
      const u = state.until == null ? '' : `Results in ${Math.floor(state.until / 60)}:${String(Math.floor(state.until % 60)).padStart(2, '0')}`;
      if (this.until.textContent !== u) this.until.textContent = u;
    }
  }

  dispose() { this.card.remove(); this.board.remove(); }
}
