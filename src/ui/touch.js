/* Touch controls for phones and tablets, with nothing to aim at: the left half of
   the screen steers and the right half is the pedal.
     Left thumb:  slide to steer; a quick tap uses the item.
     Right thumb: hold to accelerate; pull down to brake and reverse; flick up to use the item.
     Drifting:    hold the steering hard over and the kart hops into a drift;
                  straighten up to release the boost.
   Writes into input.touch. */
import { clamp, lerp } from '../core/util.js';
import { itemIcon } from './hud.js';

const el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };
const buzz = ms => { if (navigator.vibrate) { try { navigator.vibrate(ms); } catch { /* not allowed here */ } } };

const TAP_MS = 230, TAP_MOVE = 12;      // a tap is shorter and stiller than this
const BRAKE_PULL = 26;                  // px the right thumb must drop to brake
const FLICK_UP = 44, FLICK_MS = 260;    // px upward within this long fires the item
const GAS_GRACE = 0.22;                 // seconds the throttle holds after the thumb lifts, so re-gripping does not stall the kart
const DRIFT_AT = 0.72, DRIFT_HOLD = 0.16, DRIFT_KEEP = 0.12;

export class TouchControls {
  constructor(parent, input, kart, { onPause, autoGo = false, coach = false } = {}) {
    this.input = input; this.kart = kart; this.autoGo = autoGo; const t = this.t = input.touch;
    t.active = true; t.steer = 0; t.drift = false; t.item = false; t.brake = 0; t.throttle = 0;
    this.raw = 0; this.pedal = false; this.braking = false; this.gasT = 0; this.itemT = 0;
    this.vd = 0; this.vdT = 0; this.hardT = 0; this.lowT = 0; this.needCentre = false;
    const root = this.root = el('div', 'tc');
    root.innerHTML = `
      <div class="tc-zone tc-left"><div class="tc-stick"><div class="tc-knob"></div><div class="tc-tap"><img alt=""><b>TAP</b></div></div></div>
      <div class="tc-zone tc-right"><div class="tc-pedal"><i class="tc-up"><img alt=""></i><div class="tc-foot"><span>GO</span></div><i class="tc-down">BRAKE</i></div></div>
      <div class="tc-coach"><div class="tc-coach-l"><h2>Steer</h2><p>Slide your thumb. Tap to use an item.</p></div><div class="tc-coach-r"><h2>Go</h2><p>Hold to accelerate. Pull down to brake. Flick up to use an item.</p></div></div>
      <div class="tc-tip"></div>
      <button class="tc-pause" aria-label="Pause">II</button>`;
    parent.appendChild(root);
    const q = s => root.querySelector(s);
    const $ = this.$ = { left: q('.tc-left'), right: q('.tc-right'), stick: q('.tc-stick'), knob: q('.tc-knob'), tap: q('.tc-tap'), tapImg: q('.tc-tap img'), pedal: q('.tc-pedal'), foot: q('.tc-foot'), footLabel: q('.tc-foot span'), up: q('.tc-up'), upImg: q('.tc-up img'), coach: q('.tc-coach'), tip: q('.tc-tip'), pause: q('.tc-pause') };
    this.lastItem = undefined;
    if (coach) { root.classList.add('coaching'); this.coachT = 0; }

    // ---- left thumb: steering, and tap for the item
    const R = () => Math.max(46, Math.min(innerWidth, innerHeight) * 0.15);
    let sid = null, ox = 0, sx = 0, sy = 0, st0 = 0, smax = 0;
    const placeStick = (x, y) => { const r = $.left.getBoundingClientRect(); $.stick.style.left = clamp(x - r.left, R() + 8, r.width - 8) + 'px'; $.stick.style.top = clamp(y - r.top, 40, r.height - 30) + 'px'; };
    $.left.addEventListener('pointerdown', e => {
      if (sid != null) return; sid = e.pointerId; ox = sx = e.clientX; sy = e.clientY; st0 = performance.now(); smax = 0;
      try { $.left.setPointerCapture(sid); } catch { /* pointer already gone */ }
      placeStick(e.clientX, e.clientY); $.left.classList.add('on'); e.preventDefault();
    });
    $.left.addEventListener('pointermove', e => {
      if (e.pointerId !== sid) return;
      smax = Math.max(smax, Math.hypot(e.clientX - sx, e.clientY - sy));
      let d = e.clientX - ox; const r = R();
      if (Math.abs(d) > r) { ox += d - Math.sign(d) * r; d = Math.sign(d) * r; placeStick(ox, e.clientY); }   // the stick follows a thumb that slides past its end
      const v = d / r, a = Math.abs(v);
      this.raw = a < 0.06 ? 0 : Math.sign(v) * Math.pow((a - 0.06) / 0.94, 1.15);
      $.knob.style.transform = `translate(calc(-50% + ${d}px), -50%)`;
    });
    const endSteer = e => {
      if (e.pointerId !== sid) return; sid = null; this.raw = 0;
      $.knob.style.transform = 'translate(-50%, -50%)'; $.left.classList.remove('on');
      if (e.type === 'pointerup' && performance.now() - st0 < TAP_MS && smax < TAP_MOVE) this.useItem();
    };
    $.left.addEventListener('pointerup', endSteer); $.left.addEventListener('pointercancel', endSteer);

    // ---- right thumb: the pedal
    let pid = null, py = 0, hist = [], flicked = false;
    const placePedal = (x, y) => { const r = $.right.getBoundingClientRect(); $.pedal.style.left = clamp(x - r.left, 50, r.width - 50) + 'px'; $.pedal.style.top = clamp(y - r.top, 60, r.height - 50) + 'px'; };
    const setBrake = on => { if (on === this.braking) return; this.braking = on; $.pedal.classList.toggle('braking', on); $.footLabel.textContent = on ? 'BRAKE' : 'GO'; if (on) buzz(30); };
    $.right.addEventListener('pointerdown', e => {
      if (pid != null) return; pid = e.pointerId; py = e.clientY; hist = [{ t: performance.now(), y: py }]; flicked = false;
      try { $.right.setPointerCapture(pid); } catch { /* pointer already gone */ }
      this.pedal = true; setBrake(false); placePedal(e.clientX, e.clientY); $.right.classList.add('on'); buzz(8); e.preventDefault();
    });
    $.right.addEventListener('pointermove', e => {
      if (e.pointerId !== pid) return;
      const dy = e.clientY - py, now = performance.now();
      setBrake(dy > BRAKE_PULL);
      $.foot.style.transform = `translate(-50%, calc(-50% + ${clamp(dy, -FLICK_UP, BRAKE_PULL * 1.6)}px))`;
      hist = hist.filter(s => now - s.t < FLICK_MS); hist.push({ t: now, y: e.clientY });
      if (!flicked && hist[0].y - e.clientY >= FLICK_UP) { flicked = true; this.useItem(); $.pedal.classList.add('flick'); setTimeout(() => $.pedal.classList.remove('flick'), 220); }
      if (dy < -FLICK_UP * 1.5) py = e.clientY + FLICK_UP * 1.5;   // the pedal follows a thumb that drifts up the screen, so braking stays one short pull away
    });
    const endPedal = e => {
      if (e.pointerId !== pid) return; pid = null; this.pedal = false; setBrake(false);
      $.foot.style.transform = 'translate(-50%, -50%)'; $.right.classList.remove('on');
    };
    $.right.addEventListener('pointerup', endPedal); $.right.addEventListener('pointercancel', endPedal);

    $.pause.addEventListener('click', () => onPause?.());
    root.addEventListener('contextmenu', e => e.preventDefault());
    this.sync(0);
  }

  useItem() { this.itemT = 0.09; if (this.kart.item) buzz(12); }
  tip(text, ms = 2600) { const n = this.$.tip; n.textContent = text; n.classList.add('show'); clearTimeout(this._tt); this._tt = setTimeout(() => n.classList.remove('show'), ms); }

  /** Once per frame: turn thumbs into driving input, and reflect the kart's state in the controls. */
  sync(dt = 0) {
    const k = this.kart, t = this.t, $ = this.$, race = k.race, tilt = this.input.tilt;
    // pedal
    if (this.pedal && !this.braking) this.gasT = GAS_GRACE; else this.gasT -= dt;
    t.brake = this.braking ? 1 : 0;
    t.throttle = this.braking ? 0 : (this.pedal || this.gasT > 0 || (this.autoGo && race && !race.frozen)) ? 1 : 0;
    // item: a short press, so the race sees one clean use per tap
    t.item = this.itemT > 0; this.itemT -= dt;

    // steering, with the drift folded in: hard over hops into a drift, back to the middle lets it go
    const raw = tilt.enabled && Math.abs(tilt.value) > Math.abs(this.raw) ? tilt.value : this.raw, mag = Math.abs(raw);
    if (mag < 0.5) this.needCentre = false;
    if (!this.vd) {
      const ready = mag >= DRIFT_AT && !this.needCentre && t.throttle > 0 && k.grounded && k.hitT <= 0 && !k.finished && race && !race.frozen && k.speed > k.baseTop * 0.52;
      this.hardT = ready ? this.hardT + dt : 0;
      if (this.hardT > DRIFT_HOLD) { this.vd = Math.sign(raw); this.vdT = 0; this.lowT = 0; this.hardT = 0; }
      t.steer = raw; t.drift = false;
    } else {
      this.vdT += dt;
      const dir = k.drifting ? k.driftDir : this.vd, same = raw * dir;
      this.lowT = same < DRIFT_KEEP ? this.lowT + dt : 0;
      const fizzled = this.vdT > 0.6 && !k.drifting;                 // the sim dropped it (too slow, off the road, hit)
      if (this.lowT > 0.07 || this.braking || fizzled) {
        this.vd = 0; this.needCentre = fizzled; t.drift = false; t.steer = raw;
      } else {
        t.drift = true;
        // inside a drift the thumb's whole travel on that side runs from a wide arc to a tight one
        t.steer = k.drifting ? dir * lerp(-0.6, 1, clamp((same - DRIFT_KEEP) / (0.92 - DRIFT_KEEP), 0, 1)) : raw;
        if (k.drifting && !this.toldDrift && this.vdT > 0.5) { this.toldDrift = true; if (this.coachT != null) this.tip('Drifting. Straighten up to boost.', 3000); }
      }
    }

    // the held item rides on the controls, so the gestures that use it are in view
    const id = k.item || '';
    if (id !== this.lastItem) {
      this.lastItem = id; this.root.classList.toggle('has-item', !!id);
      if (id) { $.tapImg.src = $.upImg.src = itemIcon(id); }
    }
    $.stick.dataset.tier = k.drifting ? k.driftTier : '';
    this.root.classList.toggle('drifting', !!k.drifting);
    // first races: name the two halves until the player has been driving for a few seconds
    if (this.coachT != null && race && !race.frozen) { this.coachT += dt; if (this.coachT > 5 && !this.coachOut) { this.coachOut = true; this.root.classList.remove('coaching'); } }
  }
  setVisible(v) { this.root.classList.toggle('hidden', !v); if (!v) { const t = this.t; this.raw = 0; this.pedal = false; this.braking = false; this.gasT = 0; this.vd = 0; t.steer = 0; t.drift = false; t.item = false; t.brake = 0; t.throttle = 0; } }
  dispose() { this.setVisible(false); clearTimeout(this._tt); this.root.remove(); }
}
export const isTouchDevice = () => matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;
