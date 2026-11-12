/* In-race HUD for one player. Lives in the four corners (item top-left, coins and
   lap bottom-left, rank bottom-right, minimap right) and keeps the centre clear.
   Sized in container units so it scales to split-screen panes. */
import { ITEMS } from '../race/items.js';
import { fmtTime, ordinalSuffix, clamp } from '../core/util.js';

const el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };
const hex = n => '#' + n.toString(16).padStart(6, '0');
export const itemIcon = id => { const d = ITEMS[id]; return d ? `assets/items/${d.img}.webp` : ''; };
const ROULETTE = ['boost', 'leak', 'subpoena', 'tweet', 'star', 'pr', 'pinkslip', 'golden', 'crash', 'insider', 'smear', 'antitrust'];

export class Hud {
  constructor(parent, race, kart, rect = [0, 0, 1, 1], { compact = false, showMap = true } = {}) {
    this.race = race; this.kart = kart; this.t = 0; this.mapT = 0; this.lastRank = 0; this.lastCoins = -1; this.lastLap = -1; this.lastItem = undefined; this.rouletteI = 0; this.rouletteT = 0;
    const root = this.root = el('div', 'hud' + (compact ? ' hud-compact' : ''));
    // rect is [x, y(from bottom), w, h] in screen fractions
    root.style.left = rect[0] * 100 + '%'; root.style.bottom = rect[1] * 100 + '%'; root.style.width = rect[2] * 100 + '%'; root.style.height = rect[3] * 100 + '%';
    root.innerHTML = `
      <div class="hud-item"><div class="hud-item-ring"></div><img class="hud-item-img" alt=""><div class="hud-item-coin">$</div><div class="hud-item-count"></div></div>
      <div class="hud-item-info"><b></b><span></span></div>
      <div class="hud-bl"><div class="hud-pill hud-coins"><i class="ico-coin"></i><b>0</b></div><div class="hud-pill hud-lap"><i class="ico-flag"></i><b>1</b><span>/${race.laps}</span></div></div>
      <div class="hud-rank"><b>1</b><span>st</span></div>
      <div class="hud-time"></div>
      <div class="hud-banner"></div>
      <div class="hud-warn"></div>
      <div class="hud-feed"></div>
      <div class="hud-wrong">WRONG WAY</div>
      <div class="hud-ink"></div>
      <div class="hud-speed"></div>
      <div class="hud-draft"></div>`;
    parent.appendChild(root);
    const q = s => root.querySelector(s);
    this.$ = { item: q('.hud-item'), img: q('.hud-item-img'), coinFallback: q('.hud-item-coin'), count: q('.hud-item-count'), info: q('.hud-item-info'), itemName: q('.hud-item-info b'), itemDesc: q('.hud-item-info span'), coins: q('.hud-coins b'), coinsPill: q('.hud-coins'), lap: q('.hud-lap b'), lapPill: q('.hud-lap'),
      rank: q('.hud-rank'), rankN: q('.hud-rank b'), rankS: q('.hud-rank span'), time: q('.hud-time'), banner: q('.hud-banner'), warn: q('.hud-warn'), feed: q('.hud-feed'), wrong: q('.hud-wrong'), ink: q('.hud-ink'), speed: q('.hud-speed') };
    if (showMap) this._buildMap();
    for (const id of ROULETTE) { const i = new Image(); i.src = itemIcon(id); }
    this.update(0);
  }

  /* ---------- minimap ---------- */
  _buildMap() {
    const tr = this.race.track, c = this.map = el('canvas', 'hud-map'); this.root.appendChild(c);
    const S = this.mapSize = 220; c.width = c.height = S * 2; // 2x for sharpness
    const b = tr.bounds, pad = 22, span = Math.max(b.maxX - b.minX, b.maxZ - b.minZ);
    const sc = (S * 2 - pad * 2) / span, ox = (S * 2 - (b.maxX - b.minX) * sc) / 2, oz = (S * 2 - (b.maxZ - b.minZ) * sc) / 2;
    // a true top-down view: +x to the right, +z down the screen
    this.mapXY = (x, z) => [(x - b.minX) * sc + ox, (z - b.minZ) * sc + oz];
    const bg = this.mapBg = document.createElement('canvas'); bg.width = bg.height = S * 2;
    const g = bg.getContext('2d');
    const path = new Path2D();
    for (let i = 0; i <= tr.N; i += 2) { const k = i % tr.N, [x, y] = this.mapXY(tr.px[k], tr.pz[k]); if (i) path.lineTo(x, y); else path.moveTo(x, y); }
    path.closePath();
    g.lineJoin = g.lineCap = 'round';
    g.strokeStyle = 'rgba(10,12,30,0.75)'; g.lineWidth = 22; g.stroke(path);
    g.strokeStyle = 'rgba(255,255,255,0.92)'; g.lineWidth = 12; g.stroke(path);
    // start line tick
    const [sx, sy] = this.mapXY(tr.px[0], tr.pz[0]); g.fillStyle = '#12142b'; g.beginPath(); g.arc(sx, sy, 7, 0, 7); g.fill(); g.fillStyle = '#ffd23c'; g.beginPath(); g.arc(sx, sy, 4, 0, 7); g.fill();
    this.mapCtx = c.getContext('2d');
  }
  _drawMap() {
    const g = this.mapCtx; if (!g) return;
    g.clearRect(0, 0, this.map.width, this.map.height);
    g.drawImage(this.mapBg, 0, 0);
    const order = this.race.order;
    for (let i = order.length - 1; i >= 0; i--) {
      const k = order[i]; if (k === this.kart) continue;
      const [x, y] = this.mapXY(k.x, k.z);
      g.fillStyle = '#12142b'; g.beginPath(); g.arc(x, y, 11, 0, 7); g.fill();
      g.fillStyle = hex(k.racer.color); g.beginPath(); g.arc(x, y, 8, 0, 7); g.fill();
    }
    const k = this.kart, [x, y] = this.mapXY(k.x, k.z);
    g.save(); g.translate(x, y); g.rotate(Math.PI - k.yaw);   // the arrow is drawn pointing up; heading is measured from +z toward +x
    g.fillStyle = '#12142b'; g.beginPath(); g.moveTo(0, -20); g.lineTo(14, 13); g.lineTo(0, 7); g.lineTo(-14, 13); g.closePath(); g.fill();
    g.fillStyle = '#fff'; g.beginPath(); g.moveTo(0, -14); g.lineTo(9, 9); g.lineTo(0, 4); g.lineTo(-9, 9); g.closePath(); g.fill();
    g.restore();
  }

  /* ---------- transient messages ---------- */
  banner(text, cls = '', ms = 1400) {
    const b = this.$.banner; b.className = 'hud-banner ' + cls; b.textContent = text;
    void b.offsetWidth; b.classList.add('show'); clearTimeout(this._bt); this._bt = setTimeout(() => b.classList.remove('show'), ms);
  }
  feed(html, ms = 2600) {
    const f = el('div', 'hud-feed-row', html); this.$.feed.prepend(f);
    while (this.$.feed.children.length > 3) this.$.feed.lastChild.remove();
    setTimeout(() => { f.classList.add('out'); setTimeout(() => f.remove(), 350); }, ms);
  }
  warn(id) { const w = this.$.warn; w.innerHTML = `<img src="${itemIcon(id)}" alt="">`; w.classList.add('show'); clearTimeout(this._wt); this._wt = setTimeout(() => w.classList.remove('show'), 1800); }
  pop(node) { node.classList.remove('pop'); void node.offsetWidth; node.classList.add('pop'); }

  /** Kart events the HUD reacts to. */
  onKartEvent(e) {
    switch (e.type) {
      case 'lap': if (e.data > 1 && e.data <= this.race.laps) { if (e.data === this.race.laps) this.banner('FINAL LAP!', 'final', 2200); else this.banner(`LAP ${e.data}`, '', 1300); } break;
      case 'finish': this.banner(e.data === 1 ? 'WINNER!' : 'FINISH!', 'finish', 3000); break;
      case 'incoming': this.warn(e.data.type); break;
      case 'itemReady': this.pop(this.$.item); break;
      case 'miniTurbo': break;
      case 'rocketStart': this.banner(e.data >= 1 ? 'ROCKET START!' : 'NICE START!', 'good', 1100); break;
      case 'trickLand': this.banner('TRICK!', 'good small', 700); break;
      case 'draft': this.banner('SLIPSTREAM!', 'good small', 800); break;
      case 'robbed': this.feed(`<b>${e.data.racer.name}</b> stole your item`); break;
      case 'shieldBlock': this.banner('BLOCKED!', 'good small', 700); break;
    }
  }
  countdown(n) { this.banner(n === 0 ? 'GO!' : String(n), n === 0 ? 'go' : 'count', n === 0 ? 900 : 850); }

  update(dt) {
    const k = this.kart, $ = this.$, race = this.race;
    this.t += dt;
    // rank
    if (k.rank !== this.lastRank) {
      this.lastRank = k.rank; $.rankN.textContent = k.rank; $.rankS.textContent = ordinalSuffix(k.rank);
      $.rank.dataset.r = Math.min(k.rank, 4); this.pop($.rank);
    }
    if (k.coins !== this.lastCoins) { if (this.lastCoins >= 0) this.pop($.coinsPill); this.lastCoins = k.coins; $.coins.textContent = k.coins; $.coinsPill.classList.toggle('max', k.coins >= 10); }
    const lap = clamp(k.lap, 1, race.laps);
    if (lap !== this.lastLap) { if (this.lastLap >= 0) this.pop($.lapPill); this.lastLap = lap; $.lap.textContent = lap; }
    // item slot
    let shown = k.item;
    if (!k.item && k.rouletteT > 0) {
      this.rouletteT -= dt;
      if (this.rouletteT <= 0) { this.rouletteT = 0.07; this.rouletteI = (this.rouletteI + 1 + Math.floor(Math.random() * 3)) % ROULETTE.length; }
      shown = ROULETTE[this.rouletteI];
    }
    const key = shown ? shown + ':' + (k.item ? k.itemUses : 'r') : '';
    if (key !== this.lastItem) {
      this.lastItem = key;
      $.item.classList.toggle('has', !!shown); $.item.classList.toggle('rolling', !k.item && !!shown);
      if (shown) {
        const def = ITEMS[shown], isCoin = false;
        $.img.style.display = isCoin ? 'none' : ''; $.coinFallback.style.display = isCoin ? '' : 'none';
        if (!isCoin) $.img.src = itemIcon(shown);
        $.count.textContent = k.item && k.itemUses > 1 ? '×' + k.itemUses : '';
        // what you are holding, by name, for as long as you hold it; what it does shows for the first few seconds
        if (k.item && def.id !== this._infoId) {
          this._infoId = def.id; $.itemName.textContent = def.name; $.itemDesc.textContent = def.desc || '';
          $.info.classList.remove('brief'); clearTimeout(this._nt); this._nt = setTimeout(() => $.info.classList.add('brief'), 6000);
        }
        if (!k.item) this._infoId = null;
        $.info.classList.toggle('show', !!k.item);
      } else { $.count.textContent = ''; $.info.classList.remove('show'); this._infoId = null; }
    }
    $.item.classList.toggle('golden', k.goldenActive === true && k.goldenT > 0);
    // timer
    if (Math.floor(race.time * 10) !== this._tt) { this._tt = Math.floor(race.time * 10); $.time.textContent = fmtTime(k.finished ? k.finishTime : race.time).slice(0, -2); }
    $.wrong.classList.toggle('show', k.wrongWayT > 1 && !k.finished);
    $.ink.classList.toggle('show', k.inkT > 0);
    $.speed.textContent = Math.round(k.speed * 3.4);
    this.mapT -= dt; if (this.mapT <= 0) { this.mapT = 0.05; this._drawMap(); }
  }

  setVisible(v) { this.root.classList.toggle('hidden', !v); }
  dispose() { this.root.remove(); clearTimeout(this._bt); clearTimeout(this._wt); clearTimeout(this._nt); }
}
