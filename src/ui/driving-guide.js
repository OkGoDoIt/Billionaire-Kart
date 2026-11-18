import { describePadBind, padFamily } from '../core/input.js';
import { keyName } from '../core/keyboard.js';
import { loopDelta } from '../core/util.js';
import { handheldWord } from './touch.js';

// Each pane learns its own controls. Successful uses retire a lesson sooner;
// the exposure limit also gives players who choose not to drift some peace.
const USES_TO_LEARN = 3, MAX_SHOWS = 5, REST = 6;

export class DrivingGuide {
  constructor(hud, input, save, touch) {
    this.hud = hud; this.kart = hud.kart; this.input = input; this.save = save; this.touch = touch;
    this.card = document.createElement('div'); this.card.className = 'hint-card'; this.card.hidden = true;
    hud.root.append(this.card);
    this.shown = new Set(); this.active = ''; this.clock = 0; this.next = 0; this.restUntil = 0;
  }

  controls() {
    const i = this.input, assigned = i.assign[this.kart.playerIndex];
    let device = assigned === 'any' ? i.lastDevice : assigned;
    let family = '';
    if (device.startsWith('pad')) {
      const pad = navigator.getGamepads?.()[+device.slice(3)];
      if (pad?.connected) family = padFamily(pad.id);
      else if (assigned === 'any') device = 'kb';
      else return null;
    }
    if (this.touch && device === 'kb' && !i.kbUsed) device = 'touch';
    if (device === 'touch') return { profile: 'touch', touch: true, gas: 'Hold right', steer: i.tilt.enabled ? 'Tilt' : 'Slide left thumb', item: 'Flick up', drift: 'Steer sharply', trick: `Flick your ${handheldWord()}` };
    if (family) {
      const name = action => describePadBind(i.padBinds, action, family);
      return { profile: assigned === 'any' ? family : device + family, gas: name('accelerate'), steer: i.padSteer === 'dpad' ? 'D-pad' : 'Left stick', item: name('item'), drift: name('drift') };
    }
    const keys = i.keyBinds[device] || i.keyBinds.kb;
    const name = k => keyName(keys[k][0]);
    return { profile: device, gas: name('gas'), steer: name('left') + ' ' + name('right'), item: name('item'), drift: name('drift') };
  }

  lesson(skill, c) {
    const binding = skill === 'start' ? c.gas + ' ' + c.steer : skill === 'item' ? c.item : skill === 'trick' && c.trick ? c.trick : c.drift;
    const profile = this.save.data.drivingGuide[c.profile] ||= {};
    if (profile[skill]?.binding !== binding) profile[skill] = { binding, uses: 0, shows: 0 };
    return profile[skill];
  }

  learned(skill) {
    const c = this.controls();
    if (!c) return;
    const lesson = this.lesson(skill, c);
    if (lesson.uses < USES_TO_LEARN) { lesson.uses++; this.save.write(); }
    if (this.active === skill) this.hide();
  }

  hide() {
    if (!this.active) return;
    this.active = ''; this.card.hidden = true; this.restUntil = this.clock + REST;
  }

  update(dt, drive) {
    this.clock += dt;
    if (this.clock < this.next) return;
    this.next = this.clock + 0.12;
    const k = this.kart, race = k.race, c = this.controls();
    if (!c || k.finished || k.rescueT > 0 || k.hitT > 0 || k.bulletT > 0 || k.wrongWayT > 0.6 || this.hud.$.warn.classList.contains('show')) { this.hide(); return; }
    if (!this.launched && !race.frozen && drive?.throttle > 0.3 && k.speed > 5) {
      this.launched = true;
      if (!(c.touch && this.touch.autoGo && !this.touch.pedal)) this.learned('start');
    }
    const tr = race.track;
    const ahead = s => loopDelta(k.s, s, tr.length);
    const driving = k.grounded && k.fwd > k.baseTop * 0.52 && k.hit.onRoad;
    const ramp = driving && !k.autoTrick && tr.ramps.some(r => {
      const d = ahead(r.s0);
      return r.trick && Math.abs(k.hit.lat - r.lat) <= r.half && d >= -r.len && d <= k.speed * 1.5;
    });
    const corner = driving && !k.drifting && tr.corners.some(b => {
      const d = ahead(b.i0 * tr.ds);
      return b.len > 26 && d >= -4 && d <= k.speed * 1.3;
    });
    const candidates = [
      ['start', race.frozen || (!this.launched && race.time < 3)],
      ['release', k.drifting && k.driftTier > 0],
      ['trick', ramp], ['item', !!k.item && !k.rouletteT], ['drift', corner],
    ];
    if (this.active) {
      if (this.clock >= this.until || !candidates.some(([skill, yes]) => yes && skill === this.active)) this.hide();
      else this.draw(this.active, c);
      return;
    }
    for (const [skill, eligible] of candidates) {
      // The sparks are a short window. Teach release while this drift still has a boost.
      if (!eligible || (this.clock < this.restUntil && skill !== 'release')) continue;
      const lesson = this.lesson(skill, c);
      const key = c.profile + '/' + skill + '/' + lesson.binding;
      if (this.shown.has(key) || lesson.uses >= USES_TO_LEARN || lesson.shows >= MAX_SHOWS) continue;
      lesson.shows++; this.save.write(); this.shown.add(key);
      this.active = skill; this.until = this.clock + (skill === 'start' ? 7 : 3.4);
      this.draw(skill, c); break;
    }
  }

  draw(skill, c) {
    let parts;
    switch (skill) {
      case 'start':
        if (!c.touch) parts = [c.gas, ' Go  ·  ', c.steer, ' Steer'];
        else if (this.touch.autoGo) parts = [c.steer, ' to steer'];
        else parts = [c.gas, ' to go  ·  ', c.steer, ' to steer'];
        break;
      case 'item': parts = [c.item, c.touch ? ' on the pedal to use item' : ' Use item']; break;
      case 'drift': parts = [c.drift, c.touch ? ' to drift' : ' Hold while turning to drift']; break;
      case 'release': parts = c.touch ? ['Straighten up', ' to boost'] : [c.drift, ' Release to boost']; break;
      // on touch this only shows with flick to trick on and working: otherwise the kart tricks by itself (k.autoTrick)
      case 'trick': parts = c.touch ? [c.trick, ' at takeoff to trick'] : [c.drift, ' Tap at takeoff to trick']; break;
    }
    const text = parts.join('');
    if (this.text !== text) {
      this.text = text;
      this.card.replaceChildren(...parts.map((part, index) => {
        if (index % 2) return part;
        const key = document.createElement('kbd'); key.textContent = part; return key;
      }));
    }
    this.card.hidden = false;
  }
}
