/* On-screen controls for phones and tablets: a floating steering pad under the
   left thumb; drift, item, and brake under the right. Writes into input.touch. */
import { clamp } from '../core/util.js';
import { itemIcon } from './hud.js';

const el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };

export class TouchControls {
  constructor(parent, input, kart, { onPause } = {}) {
    this.input = input; this.kart = kart; const t = this.t = input.touch;
    t.active = true; t.steer = 0; t.drift = false; t.item = false; t.brake = 0; t.throttle = 0;
    const root = this.root = el('div', 'tc');
    root.innerHTML = `
      <div class="tc-steer"><div class="tc-track"><div class="tc-knob"></div></div></div>
      <button class="tc-btn tc-drift" aria-label="Drift"><span>DRIFT</span></button>
      <button class="tc-btn tc-item" aria-label="Use item"><img alt=""><span>ITEM</span></button>
      <button class="tc-btn tc-brake" aria-label="Brake"><span>BRAKE</span></button>
      <button class="tc-btn tc-gas" aria-label="Accelerate"><span>GO</span></button>
      <button class="tc-pause" aria-label="Pause">II</button>`;
    parent.appendChild(root);
    const q = s => root.querySelector(s);
    this.$ = { steer: q('.tc-steer'), track: q('.tc-track'), knob: q('.tc-knob'), drift: q('.tc-drift'), item: q('.tc-item'), itemImg: q('.tc-item img'), brake: q('.tc-brake'), gas: q('.tc-gas'), pause: q('.tc-pause') };
    this.lastItem = undefined;

    // steering: touch anywhere in the zone; the pad appears under the thumb
    let sid = null, ox = 0; const R = () => Math.max(46, Math.min(innerWidth, innerHeight) * 0.15);
    const zone = this.$.steer;
    const place = (x, y) => { const r = zone.getBoundingClientRect(); this.$.track.style.left = clamp(x - r.left, R() + 8, r.width - R() - 8) + 'px'; this.$.track.style.top = clamp(y - r.top, 40, r.height - 30) + 'px'; };
    zone.addEventListener('pointerdown', e => { if (sid != null) return; sid = e.pointerId; ox = e.clientX; zone.setPointerCapture(sid); place(e.clientX, e.clientY); zone.classList.add('on'); e.preventDefault(); });
    zone.addEventListener('pointermove', e => {
      if (e.pointerId !== sid) return;
      let d = e.clientX - ox; const r = R();
      if (Math.abs(d) > r) { ox += d - Math.sign(d) * r; d = Math.sign(d) * r; place(ox, e.clientY); }   // pad follows a thumb that slides past the end
      const v = d / r; t.steer = Math.sign(v) * Math.pow(Math.abs(v), 1.15);
      this.$.knob.style.transform = `translate(${d}px, -50%)`;
    });
    const end = e => { if (e.pointerId !== sid) return; sid = null; t.steer = 0; this.$.knob.style.transform = 'translate(0, -50%)'; zone.classList.remove('on'); };
    zone.addEventListener('pointerup', end); zone.addEventListener('pointercancel', end);

    const hold = (node, on, off) => {
      node.addEventListener('pointerdown', e => { node.setPointerCapture(e.pointerId); node.classList.add('down'); on(); e.preventDefault(); if (navigator.vibrate) { try { navigator.vibrate(8); } catch { /* ignore */ } } });
      const up = () => { node.classList.remove('down'); off(); };
      node.addEventListener('pointerup', up); node.addEventListener('pointercancel', up);
    };
    hold(this.$.drift, () => { t.drift = true; }, () => { t.drift = false; });
    hold(this.$.item, () => { t.item = true; }, () => { t.item = false; });
    hold(this.$.brake, () => { t.brake = 1; }, () => { t.brake = 0; });
    hold(this.$.gas, () => { t.throttle = 1; }, () => { t.throttle = 0; });
    this.$.pause.addEventListener('click', () => onPause?.());
    root.addEventListener('contextmenu', e => e.preventDefault());
    this.sync();
  }
  /** Reflect settings and the held item. */
  sync() {
    const k = this.kart, t = this.t;
    this.root.classList.toggle('manual-gas', !t.autoGas);
    const id = k.item || (k.rouletteT > 0 ? '?' : '');
    if (id !== this.lastItem) {
      this.lastItem = id;
      this.$.item.classList.toggle('has', !!k.item); this.$.item.classList.toggle('rolling', id === '?');
      if (k.item) this.$.itemImg.src = itemIcon(k.item);
    }
    this.$.drift.dataset.tier = k.drifting ? k.driftTier : '';
  }
  setVisible(v) { this.root.classList.toggle('hidden', !v); if (!v) { this.t.steer = 0; this.t.drift = false; this.t.item = false; this.t.brake = 0; this.t.throttle = 0; } }
  dispose() { this.setVisible(false); this.root.remove(); }
}
export const isTouchDevice = () => matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;
