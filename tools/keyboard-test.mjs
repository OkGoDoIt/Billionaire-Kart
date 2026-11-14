/* Keyboard profile invariants: persisted layouts remain playable after swapping
   keys across two players, adding aliases, or restoring just one layout. */
import assert from 'node:assert/strict';
import { bindKey, keyboardBindings, resetKeys } from '../src/core/keyboard.js';
const maps = keyboardBindings();
assert.equal(maps.kb.item[0], 'Space');
assert(maps.kb.drift.includes('ShiftRight'));
assert(bindKey(maps, 'kb', 'item', 0, 'KeyI').ok);
assert(bindKey(maps, 'kb1', 'item', 0, 'Period').ok);
assert.deepEqual(maps.kb1.item, ['Period', 'KeyE']);
assert.deepEqual(maps.kb2.item, ['Space', 'Enter']);
assert.equal(maps.kb.item[0], 'KeyI');

const conflict = bindKey(maps, 'kb1', 'brake', 1, 'ArrowLeft');
assert(!conflict.ok);
assert.deepEqual(maps.kb2.left, ['ArrowLeft']);
assert.deepEqual(maps.kb1.brake, ['KeyS']);
assert(bindKey(maps, 'kb1', 'gas', 1, 'Enter').ok);
assert.deepEqual(maps.kb2.item, ['Space']);
assert(!bindKey(maps, 'kb', 'gas', 0, 'Escape').ok);

resetKeys(maps, 'kb1');
assert.deepEqual(maps.kb1, keyboardBindings().kb1);
assert.equal(maps.kb.item[0], 'KeyI');
assert(maps.kb2.item.length);
assert(!maps.kb2.item.includes('Space'));
assert.deepEqual(keyboardBindings(JSON.parse(JSON.stringify(maps))), maps);

const bad = structuredClone(maps);
bad.kb2.item = ['Space']; // corrupt shared save gave this key to both players
const repaired = keyboardBindings(bad);
assert.deepEqual(repaired.kb1, keyboardBindings().kb1);
assert.deepEqual(repaired.kb2, keyboardBindings().kb2);
assert.deepEqual(repaired.kb, maps.kb);
console.log('keyboard-test: ok');
