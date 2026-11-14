/* Input: keyboard (one or two players), up to four gamepads with rumble, touch,
   and tilt. Produces one driving state per local player plus menu navigation. */
import { clamp } from './util.js';

const blank = () => ({ steer: 0, throttle: 0, brake: 0, drift: false, item: false, itemBack: false, rear: false });

/* Keyboard layouts. 'kb' is the solo layout (everything), kb1/kb2 share one keyboard. */
const KEYS = {
  kb: { left: ['ArrowLeft', 'KeyA'], right: ['ArrowRight', 'KeyD'], gas: ['ArrowUp', 'KeyW'], brake: ['ArrowDown', 'KeyS'], drift: ['Space', 'ShiftLeft', 'ShiftRight', 'KeyJ'], item: ['KeyE', 'Enter', 'KeyK', 'KeyF', 'ControlLeft'], rear: ['KeyQ', 'KeyC'] },
  kb1: { left: ['KeyA'], right: ['KeyD'], gas: ['KeyW'], brake: ['KeyS'], drift: ['ShiftLeft', 'Space'], item: ['KeyE', 'KeyF'], rear: ['KeyQ'] },
  kb2: { left: ['ArrowLeft'], right: ['ArrowRight'], gas: ['ArrowUp'], brake: ['ArrowDown'], drift: ['ShiftRight', 'Slash'], item: ['Enter', 'Period'], rear: ['Comma'] },
};
export const DEVICE_LABEL = { kb: 'Keyboard', kb1: 'Keyboard (WASD)', kb2: 'Keyboard (arrows)', touch: 'Touch', pad0: 'Controller 1', pad1: 'Controller 2', pad2: 'Controller 3', pad3: 'Controller 4' };

/* ---------- gamepad bindings ----------
   One mapping for every connected pad (per-player maps are out of scope).
   Each action owns a list of standard-mapping button indices: the first is
   the primary (the one the Controller panel shows and remaps), the rest are
   shipped "also" buttons — they keep working but are never shown in the UI
   (issue #194: the panel shows ONE friendly name per action). The defaults
   below are exactly the indices this file used when they were hardcoded.
   Remapping trades primaries within a group, so two actions in a group
   never share a primary.
   Menus have no bindings of their own: confirm is the Accelerate button and
   back is the Brake button — which is what the shipped defaults always did
   (A confirms, B goes back). Saves written by the v1 panel (#187) may carry
   confirm/back entries; sanitizePadBindings ignores them. */
const BUTTON_NAMES_XB = ['A', 'B', 'X', 'Y', 'LB', 'RB', 'LT', 'RT', 'View', 'Menu', 'Left stick click', 'Right stick click', 'D-pad up', 'D-pad down', 'D-pad left', 'D-pad right', 'Guide', 'Touchpad'];
const BUTTON_NAMES_PS = ['Cross', 'Circle', 'Square', 'Triangle', 'L1', 'R1', 'L2', 'R2', 'Share', 'Options', 'L3', 'R3', 'D-pad up', 'D-pad down', 'D-pad left', 'D-pad right', 'PS', 'Touchpad'];
/** Which naming family a pad uses, from its Gamepad id: PlayStation pads get
    the shapes, everything else gets Xbox-style letters (Switch Pro included). */
export const padFamily = id => /dual|playstation|sony|wireless controller/i.test(id || '') ? 'ps' : 'xb';
/** The one friendly name for a button — never a raw index, never two naming
    systems at once. */
export const buttonName = (n, family = 'xb') => (family === 'ps' ? BUTTON_NAMES_PS : BUTTON_NAMES_XB)[n] || 'Button';
export const PAD_ACTIONS = [
  { id: 'accelerate', label: 'Accelerate', group: 'race' },
  { id: 'brake', label: 'Brake / reverse', group: 'race' },
  { id: 'drift', label: 'Drift & hop', group: 'race' },
  { id: 'item', label: 'Use item', group: 'race' },
  { id: 'rear', label: 'Look behind', group: 'race' },
  { id: 'pause', label: 'Pause', group: 'menu' },
];
export const PAD_DEFAULTS = { accelerate: [0], brake: [1], drift: [5, 2], item: [4, 3], rear: [11, 13], pause: [9] };
export const PAD_STEER_SOURCES = [['both', 'Left stick + D-pad'], ['stick', 'Left stick'], ['dpad', 'D-pad']];
export const defaultPadBindings = () => Object.fromEntries(PAD_ACTIONS.map(a => [a.id, [...PAD_DEFAULTS[a.id]]]));
const padGroup = id => PAD_ACTIONS.find(a => a.id === id)?.group;
/** A complete, safe bindings object from anything found in a save: known
    actions only, integer indices 0–31, no duplicates, never empty. */
export function sanitizePadBindings(raw) {
  const out = defaultPadBindings();
  if (!raw || typeof raw !== 'object') return out;
  for (const a of PAD_ACTIONS) {
    const list = raw[a.id];
    if (!Array.isArray(list)) continue;
    const clean = [...new Set(list.filter(n => Number.isInteger(n) && n >= 0 && n <= 31))].slice(0, 3);
    if (clean.length) out[a.id] = clean;
  }
  return out;
}
/** Bind `index` as `action`'s primary button, in place. Within the action's
    group the button trades places with whatever held it: another action's
    primary swaps primaries with this one (its "also" buttons stay put); an
    "also" of another action simply leaves that action; one of this action's
    own "also" buttons swaps with its primary. The old primary is otherwise
    freed — it never lingers as an "also", or a remap would not stop the old
    button working. Buttons owned by the other group are left alone (Pause
    lives in its own group, so it never steals a racing button by swapping). */
export function applyPadBind(bindings, action, index) {
  const list = bindings[action];
  if (!list || list[0] === index) return { changed: false, swapped: null, droppedFrom: null };
  const tail = list.slice(1);
  if (tail.includes(index)) { bindings[action] = [index, list[0], ...tail.filter(n => n !== index)]; return { changed: true, swapped: null, droppedFrom: null }; }
  let swapped = null, droppedFrom = null;
  for (const a of PAD_ACTIONS) {
    if (a.id === action || a.group !== padGroup(action)) continue;
    const ol = bindings[a.id];
    if (ol[0] === index) { ol[0] = list[0]; swapped = a.id; break; }
    if (ol.includes(index)) { bindings[a.id] = ol.filter(n => n !== index); droppedFrom = a.id; }
  }
  bindings[action] = [index, ...tail].slice(0, 3);
  return { changed: true, swapped, droppedFrom };
}
/** The binding as one friendly name — the primary only. The "also" buttons
    keep working underneath, but no UI lists them (issue #194). */
export const describePadBind = (bindings, action, family = 'xb') => { const l = bindings[action] || []; return l.length ? buttonName(l[0], family) : '—'; };
const MENU_KEYS = { ArrowUp: 'up', KeyW: 'up', ArrowDown: 'down', KeyS: 'down', ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right', Enter: 'confirm', Space: 'confirm', Escape: 'back', Backspace: 'back', KeyP: 'pause' };

export class Input {
  constructor() {
    this.keys = new Set(); this.steerKb = { kb: 0, kb1: 0, kb2: 0 };
    this.assign = ['any'];                 // device per local player; 'any' merges everything (solo play)
    this.padBinds = defaultPadBindings();   // gamepad bindings; the app replaces these from the save
    this.padSteer = 'both';                 // steering source: 'both' | 'stick' | 'dpad'
    this.touch = { active: false, steer: 0, throttle: 0, brake: 0, drift: false, item: false, itemBack: false, rear: false };
    this.tilt = { enabled: false, value: 0, available: false };
    this.onMenu = null;                    // (action, device) => void
    this.onAnyInput = null;                // first interaction (to unlock audio)
    this.lastDevice = 'kb'; this.kbUsed = false; this.padPrev = [{}, {}, {}, {}]; this.padRepeat = [0, 0, 0, 0];
    this.states = [blank(), blank(), blank(), blank()];

    addEventListener('keydown', e => {
      if (e.repeat) { if (MENU_KEYS[e.code] && ['up', 'down', 'left', 'right'].includes(MENU_KEYS[e.code])) this._menu(MENU_KEYS[e.code], 'kb'); return; }
      this.keys.add(e.code); this.lastDevice = 'kb'; this.kbUsed = true; this.onAnyInput?.();
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code) && !(e.target instanceof HTMLInputElement)) e.preventDefault();
      if (MENU_KEYS[e.code] && this._menu(MENU_KEYS[e.code], this._kbDeviceFor(e.code))) e.preventDefault();
      if (e.code === 'KeyR') this._menu('reset', 'kb');
      if (e.code === 'KeyM') this._menu('mute', 'kb');
      if (e.code === 'KeyF' && e.altKey || e.code === 'F11') this._menu('fullscreen', 'kb');
    });
    addEventListener('keyup', e => this.keys.delete(e.code));
    addEventListener('blur', () => this.keys.clear());
    addEventListener('gamepadconnected', e => { this.lastDevice = 'pad' + e.gamepad.index; this.onPads?.(); });
    addEventListener('gamepaddisconnected', () => this.onPads?.());
  }

  /** Adopt bindings + steering source from the save (sanitized on the way in). */
  setPadBindings(raw, steer) { this.padBinds = sanitizePadBindings(raw); if (PAD_STEER_SOURCES.some(([id]) => id === steer)) this.padSteer = steer; }

  _kbDeviceFor(code) { for (const d of ['kb1', 'kb2']) for (const k in KEYS[d]) if (KEYS[d][k].includes(code)) return d; return 'kb'; }
  _menu(action, device) { return this.onMenu?.(action, device); }

  /** Connected gamepads as device ids. */
  pads() { const out = []; const gp = navigator.getGamepads ? navigator.getGamepads() : []; for (let i = 0; i < Math.min(4, gp.length); i++) if (gp[i] && gp[i].connected) out.push('pad' + i); return out; }
  devices() { return ['kb1', 'kb2', ...this.pads()]; }

  _kb(layout, dt, out) {
    const K = KEYS[layout], down = list => list.some(c => this.keys.has(c));
    const target = (down(K.right) ? 1 : 0) - (down(K.left) ? 1 : 0);
    // keys are digital: ease toward full lock so taps make small corrections
    const cur = this.steerKb[layout], rate = target === 0 ? 9 : Math.sign(target) !== Math.sign(cur) && cur !== 0 ? 14 : 5.5;
    this.steerKb[layout] = cur + clamp(target - cur, -rate * dt, rate * dt);
    if (Math.abs(this.steerKb[layout]) > Math.abs(out.steer)) out.steer = this.steerKb[layout];
    if (down(K.gas)) out.throttle = 1;
    if (down(K.brake)) out.brake = 1;
    if (down(K.drift)) out.drift = true;
    if (down(K.item)) { out.item = true; if (down(K.brake) && !down(K.gas)) out.itemBack = true; }
    if (down(K.rear)) out.rear = true;
  }

  _pad(i, out) {
    const gp = navigator.getGamepads?.()[i]; if (!gp || !gp.connected) return false;
    const b = n => !!gp.buttons[n] && (gp.buttons[n].pressed || gp.buttons[n].value > 0.5), v = n => gp.buttons[n]?.value || 0;
    const has = a => this.padBinds[a].some(n => b(n));
    let x = 0;
    if (this.padSteer !== 'dpad') {   // left stick, with the shipped deadzone and curve
      const raw = gp.axes[0] || 0, dead = 0.14;
      x = Math.abs(raw) < dead ? 0 : Math.sign(raw) * Math.pow((Math.abs(raw) - dead) / (1 - dead), 1.35);
    }
    if (this.padSteer !== 'stick') { if (b(14)) x = -1; if (b(15)) x = 1; }   // the D-pad overrides the stick, as shipped
    if (Math.abs(x) > Math.abs(out.steer)) out.steer = x;
    /* the triggers stay analogue pedals (RT gas, LT brake) whatever the buttons are bound to */
    out.throttle = Math.max(out.throttle, has('accelerate') ? 1 : 0, v(7));
    out.brake = Math.max(out.brake, has('brake') ? 1 : 0, v(6));
    if (has('drift')) out.drift = true;
    if (has('item')) { out.item = true; if ((gp.axes[1] || 0) > 0.6 || b(13)) out.itemBack = true; }
    if (has('rear')) out.rear = true;
    return true;
  }

  /** Read driving input for every local player. Call once per rendered frame. */
  poll(dt) {
    this._padMenus(dt);
    for (let p = 0; p < this.assign.length; p++) {
      const dev = this.assign[p], out = this.states[p];
      out.steer = 0; out.throttle = 0; out.brake = 0; out.drift = false; out.item = false; out.itemBack = false; out.rear = false;
      if (dev === 'any') {
        this._kb('kb', dt, out);
        for (let i = 0; i < 4; i++) this._pad(i, out);
        const t = this.touch;
        if (t.active) {
          if (Math.abs(t.steer) > Math.abs(out.steer)) out.steer = t.steer;
          out.throttle = Math.max(out.throttle, t.throttle); out.brake = Math.max(out.brake, t.brake);
          out.drift = out.drift || t.drift; out.item = out.item || t.item; out.itemBack = out.itemBack || t.itemBack; out.rear = out.rear || t.rear;
        }
        if (this.tilt.enabled && Math.abs(this.tilt.value) > Math.abs(out.steer)) out.steer = this.tilt.value;
      } else if (dev.startsWith('kb')) this._kb(dev, dt, out);
      else if (dev.startsWith('pad')) this._pad(+dev.slice(3), out);
      out.steer = clamp(out.steer, -1, 1);
    }
    return this.states;
  }

  /** Menu navigation from gamepads, with auto-repeat on directions. */
  _padMenus(dt) {
    const gps = navigator.getGamepads ? navigator.getGamepads() : [];
    for (let i = 0; i < Math.min(4, gps.length); i++) {
      const gp = gps[i]; if (!gp || !gp.connected) continue;
      const prev = this.padPrev[i], dev = 'pad' + i;
      const b = n => !!gp.buttons[n]?.pressed;
      const has = a => this.padBinds[a].some(n => b(n));
      /* directions are the D-pad and the left stick, as shipped; pause follows its binding;
         confirm and back DERIVE from the Accelerate and Brake buttons — menus have no
         bindings of their own, and the derivation is exactly the shipped behaviour
         (A confirms, B goes back). alt/alt2 stay on X/Y as before (nothing remaps them) */
      const now = { up: b(12) || gp.axes[1] < -0.6, down: b(13) || gp.axes[1] > 0.6, left: b(14) || gp.axes[0] < -0.6, right: b(15) || gp.axes[0] > 0.6, confirm: has('accelerate'), back: has('brake'), pause: has('pause'), alt: b(2), alt2: b(3) };
      let anyDir = false;
      for (const k in now) {
        if (now[k] && !prev[k]) { this.lastDevice = dev; this.onAnyInput?.(); this._menu(k, dev); if (['up', 'down', 'left', 'right'].includes(k)) this.padRepeat[i] = 0.38; }
        if (now[k] && ['up', 'down', 'left', 'right'].includes(k)) anyDir = k;
      }
      if (anyDir) { this.padRepeat[i] -= dt; if (this.padRepeat[i] <= 0) { this.padRepeat[i] = 0.12; this._menu(anyDir, dev); } }
      this.padPrev[i] = now;
    }
  }

  /** Controller rumble for a player (no-op where unsupported). */
  rumble(player, strong = 0.5, weak = 0.5, ms = 150) {
    const dev = this.assign[player];
    const ids = dev === 'any' ? [0, 1, 2, 3] : dev?.startsWith('pad') ? [+dev.slice(3)] : [];
    for (const i of ids) {
      const gp = navigator.getGamepads?.()[i];
      try { gp?.vibrationActuator?.playEffect?.('dual-rumble', { duration: ms, strongMagnitude: clamp(strong, 0, 1), weakMagnitude: clamp(weak, 0, 1) }); } catch { /* unsupported */ }
    }
    if (dev === 'any' && this.touch.active && navigator.vibrate && strong > 0.5) { try { navigator.vibrate(Math.min(60, ms / 3)); } catch { /* ignore */ } }
  }

  /** Tilt steering. Must be called from a user gesture on iOS. Resolves to true when granted. */
  async enableTilt() {
    try {
      if (typeof DeviceOrientationEvent === 'undefined') return false;
      if (typeof DeviceOrientationEvent.requestPermission === 'function') { const r = await DeviceOrientationEvent.requestPermission(); if (r !== 'granted') return false; }
      if (!this._tiltBound) {
        this._tiltBound = true;
        addEventListener('deviceorientation', e => {
          if (e.beta == null) return;
          this.tilt.available = true;
          // in landscape the roll axis is beta; sign depends on which way the phone is turned
          const angle = (screen.orientation?.angle ?? window.orientation ?? 0);
          let v = Math.abs(angle) === 90 ? (angle === 90 ? e.beta : -e.beta) : e.gamma;
          this.tilt.value = clamp((v || 0) / 28, -1, 1);
        });
      }
      this.tilt.enabled = true; return true;
    } catch { return false; }
  }
  disableTilt() { this.tilt.enabled = false; this.tilt.value = 0; }
}
