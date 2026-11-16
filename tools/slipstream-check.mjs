/* Hold a steady wheel-to-wheel formation while the player uses real race
   physics. One wake pays once; leaving, then earning the next one, pays again. */
import assert from 'node:assert/strict';
import { Track } from '../src/track/track.js';
import { Race } from '../src/race/race.js';
import { RACERS } from '../src/content/racers.js';
import { takeSlot } from './slot.mjs';

await takeSlot('slipstream');
const dt = 1 / 60;
const track = new Track({ width: 64, path: [[0, 0, 0], [0, 0, 900], [0, 0, 1800],
  [240, 0, 1800], [240, 0, -500], [0, 0, -500]].map(p => ({ p })) });
const race = new Race({ track, cc: 100, countdown: 0, items: false, coins: false,
  entries: RACERS.slice(0, 3).map((racer, player) => ({ racer, player })) });
const [player, a, b] = race.karts;
const s = track.sAtCp(1), pos = track.pointAt(s, 0, {});
player.place(pos.x, pos.y, pos.z, track.yawAt(s), Math.floor(s / track.ds));
player.fwd = player.speed = player.top; player.vz = Math.cos(player.yaw) * player.speed; player.vx = Math.sin(player.yaw) * player.speed;
let boosts = 0;
function follow(seconds, target, angle = 0) {
  for (let i = 0; i < Math.round(seconds / dt); i++) {
    for (const lead of [a, b]) {
      const offset = lead === target ? 0 : lead === a ? -10 : 10;
      const sy = Math.sin(player.yaw), cy = Math.cos(player.yaw);
      lead.place(player.x + sy * 10 + cy * offset, player.y, player.z + cy * 10 - sy * offset,
        player.yaw + angle, player.hint);
      lead.fwd = lead.speed = player.speed; lead.vx = Math.sin(lead.yaw) * lead.speed; lead.vz = Math.cos(lead.yaw) * lead.speed;
    }
    race.step(dt, [{ throttle: 1 }]);
    boosts += player.events.filter(e => e.type === 'draft').length;
    for (const k of race.karts) k.events.length = 0;
    race.events.length = 0;
  }
}
follow(1, a); assert.equal(boosts, 0);
follow(0.25, a); assert.equal(boosts, 1, 'an ordinary first draft still arrives on time');
follow(6, a); assert.equal(boosts, 1, 'one uninterrupted tow cannot keep retriggering');
follow(0.1, null); follow(2, a); assert.equal(boosts, 1, 'brief wheel wobble cannot reset a spent wake');
follow(0.6, null); follow(0.8, a); follow(0.7, b);
assert.equal(boosts, 1, 'switching bumpers cannot add partial charges');
follow(0.55, b); assert.equal(boosts, 2, 'a clean new wake pays a second time');
follow(0.6, null); follow(3, a, Math.PI); follow(3, a, Math.PI / 2);
assert.equal(boosts, 2, 'oncoming and crossing traffic provide no tow');
console.log('slipstream-check: ok');
