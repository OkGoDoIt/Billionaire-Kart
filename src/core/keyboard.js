/* Physical keys for solo and for the two halves of a shared keyboard. A key
   can appear in solo and shared play, but only once within either game. */
export const KEY_LAYOUTS = { kb: 'Solo', kb1: 'Player 1', kb2: 'Player 2' };
export const KEY_ACTIONS = { left: 'Steer left', right: 'Steer right', gas: 'Accelerate', brake: 'Brake and reverse', drift: 'Drift and hop', item: 'Use item', rear: 'Look behind' };
const defaults = {
  kb: { left: ['ArrowLeft', 'KeyA'], right: ['ArrowRight', 'KeyD'], gas: ['ArrowUp', 'KeyW'], brake: ['ArrowDown', 'KeyS'], drift: ['ShiftLeft', 'ShiftRight', 'KeyZ'], item: ['Space', 'KeyE', 'Enter', 'KeyX'], rear: ['KeyQ', 'KeyC'] },
  kb1: { left: ['KeyA'], right: ['KeyD'], gas: ['KeyW'], brake: ['KeyS'], drift: ['ShiftLeft'], item: ['Space', 'KeyE'], rear: ['KeyQ'] },
  kb2: { left: ['ArrowLeft'], right: ['ArrowRight'], gas: ['ArrowUp'], brake: ['ArrowDown'], drift: ['ShiftRight', 'Slash'], item: ['Period', 'Enter'], rear: ['Comma'] },
};
const labels = { Space: 'Space', Enter: 'Enter', ArrowLeft: '←', ArrowRight: '→', ArrowUp: '↑', ArrowDown: '↓', ShiftLeft: 'Left Shift', ShiftRight: 'Right Shift', ControlLeft: 'Left Ctrl', ControlRight: 'Right Ctrl', Comma: ',', Period: '.', Slash: '/', Backslash: '\\', BracketLeft: '[', BracketRight: ']', Semicolon: ';', Quote: "'", Minus: '−', Equal: '=', Backquote: '`', IntlBackslash: 'Intl \\', IntlRo: 'Intl Ro', IntlYen: '¥', CapsLock: 'Caps Lock', Home: 'Home', End: 'End', PageUp: 'Page Up', PageDown: 'Page Down', Insert: 'Insert' };
export function keyName(code) {
  if (Object.hasOwn(labels, code)) return labels[code];
  if (/^(Key[A-Z]|Digit[0-9])$/.test(code)) return code.slice(-1);
  if (/^Numpad(\d|Add|Subtract|Multiply|Divide|Decimal|Enter|Equal|Comma)$/.test(code)) return 'Num ' + code.slice(6);
  return null;
}
// Escape, P, R, and M retain their pause, rescue, and mute shortcuts.
const allowed = code => !!keyName(code) && !['KeyP', 'KeyR', 'KeyM'].includes(code);
const peers = layout => layout === 'kb' ? ['kb'] : ['kb1', 'kb2'];
function owner(bindings, layout, code) {
  for (const id of peers(layout)) for (const action of Object.keys(KEY_ACTIONS)) {
    const slot = bindings[id][action].indexOf(code);
    if (slot >= 0) return { id, action, slot };
  }
  return null;
}
const name = (id, action) => KEY_LAYOUTS[id] + ' · ' + KEY_ACTIONS[action];
export function bindKey(bindings, layout, action, slot, code) {
  if (!allowed(code)) return { ok: false, message: 'That key is reserved. Press another key.' };
  const keys = bindings[layout][action], old = keys[slot], used = owner(bindings, layout, code);
  if (old === code) return { ok: true, message: name(layout, action) + ' uses ' + keyName(code) + '.' };
  let message = '';
  if (used) {
    const other = bindings[used.id][used.action];
    if (old) { other[used.slot] = old; message = ` ${name(used.id, used.action)} now uses ${keyName(old)}.`; }
    else if (used.id === layout && used.action === action) return { ok: false, message: 'This action already uses that key.' };
    else if (other.length > 1) { other.splice(used.slot, 1); message = ` Moved from ${name(used.id, used.action)}.`; }
    else return { ok: false, message: `${name(used.id, used.action)} needs this key. Replace an existing key to swap.` };
  }
  keys[slot] = code;
  return { ok: true, message: `${name(layout, action)} uses ${keyName(code)}.${message}` };
}
export function keyboardBindings(raw) {
  const result = structuredClone(defaults);
  // Only adopt a complete compatible map for the group. A malformed shared
  // save cannot hand the same key to both players or leave an action empty.
  for (const group of [['kb'], ['kb1', 'kb2']]) {
    const taken = new Set();
    const valid = group.every(id => Object.keys(KEY_ACTIONS).every(a => {
      const keys = raw?.[id]?.[a];
      return Array.isArray(keys) && keys.length > 0 && keys.length <= Math.max(4, defaults[id][a].length) && keys.every(code => {
        if (typeof code !== 'string' || !allowed(code) || taken.has(code)) return false;
        taken.add(code); return true;
      });
    }));
    if (valid) for (const id of group) for (const action of Object.keys(KEY_ACTIONS)) result[id][action] = [...raw[id][action]];
  }
  return result;
}
export function resetKeys(bindings, layout) {
  const previous = Object.values(bindings[layout]).flat();
  bindings[layout] = structuredClone(defaults[layout]);
  if (layout === 'kb') return '';
  const peer = layout === 'kb1' ? 'kb2' : 'kb1', occupied = new Set(Object.values(bindings[layout]).flat()), changes = [];
  for (const [action, keys] of Object.entries(bindings[peer])) {
    const kept = keys.filter(code => !occupied.has(code));
    if (kept.length !== keys.length) { bindings[peer][action] = kept; changes.push(action); }
  }
  for (const action of changes) {
    if (bindings[peer][action].length) continue;
    // The other player may have remapped the normal fallback as well.
    const pool = [...defaults[peer][action], ...previous, ...Object.keys(labels), ...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').map(k => 'Key' + k), ...'0123456789'.split('').map(k => 'Digit' + k)];
    const free = pool.find(code => allowed(code) && !owner(bindings, peer, code));
    bindings[peer][action].push(free);
  }
  return changes.map(a => name(peer, a) + ' now uses ' + bindings[peer][a].map(keyName).join(' / ') + '.').join(' ');
}
