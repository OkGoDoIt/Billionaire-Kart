/* In-race HUD for one player. Lives in the four corners (item top-left, coins and
   lap bottom-left, rank bottom-right, minimap right) and keeps the centre clear.
   Sized in container units so it scales to split-screen panes. */
import { ITEMS } from '../race/items.js';
import { TUNE } from '../race/kart.js';
import { fmtTime, ordinalSuffix, clamp } from '../core/util.js';

/* kart.speed is metres per second (the class table in race/kart.js says so); the readout shows honest mph. */
const MPH_PER_MS = 2.23694;

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
      <div class="hud-bl"><div class="hud-pill hud-coins"><i class="ico-coin"></i><b>0</b><div class="hud-coin-pop"></div></div><div class="hud-pill hud-lap"><i class="ico-flag"></i><b>1</b><span>/${race.laps}</span></div></div>
      <div class="hud-rank"><b>1</b><span>st</span></div>
      <div class="hud-time"></div>
      <div class="hud-banner"></div>
      <div class="hud-warn"></div>
      <div class="hud-feed"></div>
      <div class="hud-talk"><img alt=""><div><b></b><span></span></div></div>
      <div class="hud-wrong">WRONG WAY</div>
      <div class="hud-ink"><i>EXCLUSIVE!</i><i>SOURCES SAY</i><i>SHOCKING!</i><i>SCANDAL</i><i>YOU WON’T BELIEVE</i></div>
      <div class="hud-speed"><b>0</b><span>mph</span></div>
      <div class="hud-draft"></div>`;
    parent.appendChild(root);
    const q = s => root.querySelector(s);
    this.$ = { item: q('.hud-item'), img: q('.hud-item-img'), coinFallback: q('.hud-item-coin'), count: q('.hud-item-count'), info: q('.hud-item-info'), itemName: q('.hud-item-info b'), itemDesc: q('.hud-item-info span'), coins: q('.hud-coins b'), coinsPill: q('.hud-coins'), lap: q('.hud-lap b'), lapPill: q('.hud-lap'),
      rank: q('.hud-rank'), rankN: q('.hud-rank b'), rankS: q('.hud-rank span'), time: q('.hud-time'), banner: q('.hud-banner'), warn: q('.hud-warn'), feed: q('.hud-feed'), talk: q('.hud-talk'), talkImg: q('.hud-talk img'), talkName: q('.hud-talk b'), talkLine: q('.hud-talk span'), wrong: q('.hud-wrong'), ink: q('.hud-ink'), speed: q('.hud-speed'), speedN: q('.hud-speed b'), coinPop: q('.hud-coin-pop'),
    };
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
    // faces for the map, loaded once; a kart whose portrait has not arrived yet keeps its colored dot
    this.mapFaces = new Map();
    for (const k of [...this.race.order, this.kart]) {
      const p = k?.racer?.portrait;
      if (p && !this.mapFaces.has(p)) { const img = new Image(); img.src = p; this.mapFaces.set(p, img); }
    }
  }
  /* A round portrait in the map: the dark ring every marker wears, an optional bright ring for the
     player, and the face clipped to the circle, framed on the top of the portrait where the face is. */
  _mapFace(g, img, x, y, r, ring) {
    g.save();
    g.beginPath(); g.arc(x, y, r + 3, 0, 7); g.fillStyle = '#12142b'; g.fill();
    if (ring) { g.beginPath(); g.arc(x, y, r + 1.5, 0, 7); g.fillStyle = ring; g.fill(); }
    g.beginPath(); g.arc(x, y, r, 0, 7); g.clip();
    // the portraits are square with the head in the top two-thirds: zoom in and center on it (35% down)
    const D = 2.8 * r;
    g.drawImage(img, x - D / 2, y - 0.35 * D, D, D);
    g.restore();
  }
  _drawMap() {
    const g = this.mapCtx; if (!g) return;
    g.clearRect(0, 0, this.map.width, this.map.height);
    g.drawImage(this.mapBg, 0, 0);
    const order = this.race.order;
    for (let i = order.length - 1; i >= 0; i--) {
      const k = order[i]; if (k === this.kart) continue;
      const [x, y] = this.mapXY(k.x, k.z);
      const face = this.mapFaces?.get(k.racer.portrait), hasFace = !!(face?.complete && face.naturalWidth);
      if (hasFace) this._mapFace(g, face, x, y, 15);
      else { g.fillStyle = '#12142b'; g.beginPath(); g.arc(x, y, 11, 0, 7); g.fill(); g.fillStyle = hex(k.racer.color); g.beginPath(); g.arc(x, y, 8, 0, 7); g.fill(); }
      // Total Awareness (Thiel's special): what each rival is holding, beside their marker
      if (this.kart.sp.seeItems && k.item) {
        const o = hasFace ? 19 : 15;   // the badge sits a little further out over a face than over a dot
        const icons = this._icons || (this._icons = {}), img = icons[k.item] || (icons[k.item] = Object.assign(new Image(), { src: itemIcon(k.item) }));
        if (img.complete && img.naturalWidth) { g.save(); g.beginPath(); g.arc(x + o, y - o, 13, 0, 7); g.fillStyle = '#12142b'; g.fill(); g.clip(); g.drawImage(img, x + o - 12, y - o - 12, 24, 24); g.restore(); }
      }
    }
    const k = this.kart, [x, y] = this.mapXY(k.x, k.z);
    const face = this.mapFaces?.get(k.racer.portrait);
    if (face?.complete && face.naturalWidth) {
      this._mapFace(g, face, x, y, 20, '#fff');
      // a small pointer on the ring keeps the heading the arrow used to give
      g.save(); g.translate(x, y); g.rotate(Math.PI - k.yaw);   // heading is measured from +z toward +x
      g.fillStyle = '#12142b'; g.beginPath(); g.moveTo(0, -32); g.lineTo(7, -21); g.lineTo(-7, -21); g.closePath(); g.fill();
      g.fillStyle = '#fff'; g.beginPath(); g.moveTo(0, -29.5); g.lineTo(4.5, -22); g.lineTo(-4.5, -22); g.closePath(); g.fill();
      g.restore();
    } else {
      g.save(); g.translate(x, y); g.rotate(Math.PI - k.yaw);   // the arrow is drawn pointing up; heading is measured from +z toward +x
      g.fillStyle = '#12142b'; g.beginPath(); g.moveTo(0, -20); g.lineTo(14, 13); g.lineTo(0, 7); g.lineTo(-14, 13); g.closePath(); g.fill();
      g.fillStyle = '#fff'; g.beginPath(); g.moveTo(0, -14); g.lineTo(9, 9); g.lineTo(0, 4); g.lineTo(-9, 9); g.closePath(); g.fill();
      g.restore();
    }
  }

  /* ---------- transient messages ---------- */
  /** The big centre callout. One at a time, so they rank: a lower-priority banner never covers a higher one that is
      still up (SLIPSTREAM! cannot wipe FINAL LAP!). queue: wait for the one on screen to finish instead of being dropped
      (ROCKET START! lands on the same frame as GO!, and follows it). Priorities: 1 small callouts, 2 laps, hits, and
      the rocket start, 3 the countdown and the final lap, 4 the finish. */
  banner(text, cls = '', ms = 1400, prio = 1, queue = false) {
    const now = performance.now();
    if (now < (this._bUntil || 0) && prio < (this._bPrio || 0)) { if (queue) this._bNext = { text, cls, ms, prio, at: now }; return; }
    const b = this.$.banner; b.className = 'hud-banner ' + cls; b.textContent = text;
    void b.offsetWidth; b.classList.add('show'); clearTimeout(this._bt);
    this._bPrio = prio; this._bUntil = now + ms;
    this._bt = setTimeout(() => {
      b.classList.remove('show'); b.classList.add('out'); this._bPrio = 0;
      const next = this._bNext; this._bNext = null;
      if (next && performance.now() - next.at < 2500) this._bt = setTimeout(() => this.banner(next.text, next.cls, next.ms, next.prio), 120);   // a queued line that waited too long is old news
    }, ms);
  }
  feed(html, ms = 2600) {
    const f = el('div', 'hud-feed-row', html); this.$.feed.prepend(f);
    while (this.$.feed.children.length > 2) this.$.feed.lastChild.remove();   // two lines at most: a third reaches down into the banners
    setTimeout(() => { f.classList.add('out'); setTimeout(() => f.remove(), 350); }, ms);
  }
  /** A rival has something to say: their face, their name, and the line in a speech bubble. Returns false if one is already up. */
  talk(racer, line, ms = 3000) {
    if (!line || this.quiet || this.kart.finished || this.t < (this._talkUntil || 0)) return false;   // nothing talks over the finish
    const $ = this.$; $.talkImg.src = racer.portrait; $.talkName.textContent = racer.name; $.talkLine.textContent = line;
    $.talk.style.setProperty('--rc', hex(racer.color)); $.talk.classList.remove('show'); void $.talk.offsetWidth; $.talk.classList.add('show');
    this._talkUntil = this.t + ms / 1000 + 0.6; clearTimeout(this._kt); this._kt = setTimeout(() => $.talk.classList.remove('show'), ms);
    return true;
  }
  warn(id) { const w = this.$.warn; w.innerHTML = `<img src="${itemIcon(id)}" alt="">`; w.classList.add('show'); clearTimeout(this._wt); this._wt = setTimeout(() => w.classList.remove('show'), 1800); }
  pop(node) { node.classList.remove('pop'); void node.offsetWidth; node.classList.add('pop'); }
  /** A one-line tick at the coin pill saying what the last coin change did to top speed:
      gold and bigger for the coin that maxes the bonus, red for coins a hit shook loose. */
  coinPop(text, cls, ms) {
    const p = this.$.coinPop; p.textContent = text; p.className = 'hud-coin-pop ' + cls;
    void p.offsetWidth; p.classList.add('show');
    clearTimeout(this._ct); this._ct = setTimeout(() => p.classList.remove('show'), ms);
  }

  /** Kart events the HUD reacts to. */
  onKartEvent(e) {
    switch (e.type) {
      case 'lap': if (e.data > 1 && e.data <= this.race.laps) { if (e.data === this.race.laps) this.banner('FINAL LAP!', 'final', 2200, 3); else this.banner(`LAP ${e.data}`, 'lap', 1300, 2); } break;
      case 'finish': this.banner(e.data === 1 ? 'WINNER!' : 'FINISH!', 'finish' + (e.data === 1 ? ' win' : ''), 3000, 4); this.$.talk.classList.remove('show'); this.$.rank.classList.remove('up', 'down'); this.$.rank.classList.add('done'); this.pop(this.$.rank); break;
      case 'incoming': this.warn(e.data.type); break;
      case 'itemReady': this.pop(this.$.item); break;
      case 'miniTurbo': break;
      case 'hit':
        if (e.data.kind === 'zap') this.banner(ITEMS.crash.hit, 'bad small', 1500, 2, true);
        break;
      case 'burnout': this.banner('ENGINE STALLED!', 'bad small', 1000, 2, true); break;
      case 'rocketStart': this.banner(e.data >= 1 ? 'ROCKET START!' : 'NICE START!', 'good', 1100, 2, true); break;
      case 'trickLand': this.banner('TRICK!', 'good small', 700); break;
      case 'draft': this.banner('SLIPSTREAM!', 'good small', 800); break;
      case 'absorbed': this.banner('COVERED!', 'good small', 1100); break;        // Bill's special took the hit
      case 'sputter': this.banner('POWER LOSS!', 'bad small', 900); break;       // Holmes's special
      case 'robbed': this.banner(ITEMS.insider.hit, 'bad small', 1300, 2); this.feed(`<b>${e.data.racer.name}</b> stole your item`); break;
      case 'itemUse': { const line = ITEMS[e.data]?.use; if (line) this.banner(line, 'good small', 1000); break; }
      case 'inked': this.banner(ITEMS.smear.hit, 'bad small', 1200, 2); break;
      case 'shieldBlock': this.banner('BLOCKED!', 'good small', 700); break;
    }
  }
  countdown(n) { this.banner(n === 0 ? 'GO!' : String(n), n === 0 ? 'go' : 'count', n === 0 ? 900 : 850, 3); }

  update(dt) {
    const k = this.kart, $ = this.$, race = this.race;
    this.t += dt;
    // rank
    if (k.rank !== this.lastRank) {
      const up = this.lastRank && k.rank < this.lastRank, down = this.lastRank && k.rank > this.lastRank;
      this.lastRank = k.rank; $.rankN.textContent = k.rank; $.rankS.textContent = ordinalSuffix(k.rank);
      $.rank.dataset.r = Math.min(k.rank, 4);
      // passing someone bounces the number up with a flash; being passed knocks it down and back
      $.rank.classList.remove('pop', 'up', 'down'); void $.rank.offsetWidth; $.rank.classList.add(up ? 'up' : down ? 'down' : 'pop');
    }
    if (k.coins !== this.lastCoins) {
      const prev = this.lastCoins;
      if (prev >= 0) {
        if (k.coins > prev) {
          this.pop($.coinsPill);
          $.coinsPill.classList.remove('glow'); void $.coinsPill.offsetWidth; $.coinsPill.classList.add('glow');
          if (k.coins >= TUNE.coinMax && prev < TUNE.coinMax) this.coinPop('+SPEED MAX', 'max', 1700);   // the coin that caps the bonus, taught in the moment it lands
        } else this.coinPop('-SPEED', 'down', 1100);   // a hit or a rescue just shook coins loose, and top speed with them
      }
      this.lastCoins = k.coins; $.coins.textContent = k.coins; $.coinsPill.classList.toggle('max', k.coins >= TUNE.coinMax);
    }
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
        // what you are holding: its name AND its full description, for as long as you hold it (issue #132).
        // Nothing may fold the description away while the item is held — no timer, no feed/banner state,
        // no HUD variant. There is deliberately no code path from here to a name-only card.
        if (k.item && def.id !== this._infoId) {
          this._infoId = def.id; $.itemName.textContent = def.name; $.itemDesc.textContent = def.desc || '';
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
    $.speedN.textContent = Math.round(k.speed * MPH_PER_MS);
    this.mapT -= dt; if (this.mapT <= 0) { this.mapT = 0.05; this._drawMap(); }
  }

  setVisible(v) { this.root.classList.toggle('hidden', !v); }
  dispose() { this.root.remove(); clearTimeout(this._bt); this._bNext = null; clearTimeout(this._wt); clearTimeout(this._kt); clearTimeout(this._ct); }
}
