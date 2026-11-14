/* A controller that keeps playing until reset models the reported stuck motor. */
import assert from 'node:assert/strict';
import { Input } from '../src/core/input.js';
import { RaceSession } from '../src/game/session.js';

const events = new EventTarget();
globalThis.addEventListener = events.addEventListener.bind(events);
const first = { active: false, playEffect(_, fx) { this.active = !!fx.strongMagnitude; }, reset() { this.active = false; } };
const second = { active: false, playEffect: first.playEffect };
Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { getGamepads: () => [first, second].map(vibrationActuator => ({ vibrationActuator })) } });
const input = new Input();
input.assign = ['pad0', 'pad1'];
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
input.rumble(0, 1, 1, 10);
input.rumble(0, 1, 1, 50);
input.rumble(1, 1, 1, 10);
await wait(22);
assert.equal(first.active, true);
assert.equal(second.active, false);
await wait(50);
assert.equal(first.active, false);
input.rumble(0);
input.rumble(1);
input.stopRumble(0);
assert.equal(first.active, false);
assert.equal(second.active, true);
events.dispatchEvent(new Event('blur'));
input.rumble(0); assert.equal(first.active, false); assert.equal(second.active, false);
events.dispatchEvent(new Event('focus'));
const session = { app: { input }, huds: [], view: { dispose() {} } };
for (const stop of [() => RaceSession.prototype.setPaused.call(session, true), () => RaceSession.prototype.dispose.call(session), () => events.dispatchEvent(new Event('pagehide')), () => events.dispatchEvent(Object.assign(new Event('gamepaddisconnected'), { gamepad: { index: 0 } }))]) {
  input.rumble(0); assert.equal(first.active, true); stop(); assert.equal(first.active, false);
}
console.log('rumble-check: ok');
