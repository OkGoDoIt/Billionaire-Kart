/* Headless test of the gamepad bindings layer (issues #184, #194).
   Covers: shipped defaults == the indices that were hardcoded before the
   mapping layer existed; one friendly name per button (Xbox letters or
   PlayStation shapes by pad family, never a raw index); remap / swap /
   steal semantics; sanitize; the v1 -> v2 migration (a stored v1 map with
   confirm/back entries loads cleanly — menus DERIVE confirm/back from the
   Accelerate/Brake buttons now); a real Save persistence round-trip; and
   the real Input class driven by a fake gamepad (race polling + menu
   edges, before and after a remap).
   Run: node tools/pad-binds-test.mjs — exits non-zero on any failure. */

// localStorage stub must exist before save.js is imported.
const store = new Map();
globalThis.localStorage = { getItem: k => (store.has(k) ? store.get(k) : null), setItem: (k, v) => store.set(k, String(v)), removeItem: k => store.delete(k) };
globalThis.addEventListener = () => {};
const pads = [null, null, null, null];
Object.defineProperty(globalThis, 'navigator', { value: { getGamepads: () => pads }, configurable: true });

const { PAD_ACTIONS, PAD_DEFAULTS, PAD_STEER_SOURCES, buttonName, padFamily, defaultPadBindings, sanitizePadBindings, applyPadBind, describePadBind, Input } = await import('../src/core/input.js');
const { Save } = await import('../src/core/save.js');

let fails = 0;
const eq = (got, want, msg) => { const g = JSON.stringify(got), w = JSON.stringify(want); if (g !== w) { fails++; console.error(`FAIL ${msg}: got ${g}, want ${w}`); } else console.log(`ok   ${msg}`); };
const ok = (cond, msg) => { if (!cond) { fails++; console.error(`FAIL ${msg}`); } else console.log(`ok   ${msg}`); };

/* 1. The shipped defaults are the old hardcoded indices, read from the
      pre-#184 input.js: throttle b(0), brake b(1), drift b(5)||b(2),
      item b(4)||b(3), rear b(11)||b(13), pause b(9). Menus confirmed on
      b(0) and went back on b(1) — exactly the Accelerate/Brake buttons,
      which is why the v2 derivation is byte-identical behaviour. */
eq(PAD_DEFAULTS, { accelerate: [0], brake: [1], drift: [5, 2], item: [4, 3], rear: [11, 13], pause: [9] }, 'defaults match the previously hardcoded indices');
eq(PAD_ACTIONS.map(a => a.id), ['accelerate', 'brake', 'drift', 'item', 'rear', 'pause'], 'six actions: menus have no bindings of their own');

/* 2. One friendly name per button, per family — never a raw index (#194) */
eq(buttonName(0), 'A', 'xbox: button 0 is A'); eq(buttonName(0, 'ps'), 'Cross', 'playstation: button 0 is Cross');
eq(buttonName(5), 'RB', 'xbox: button 5 is RB'); eq(buttonName(5, 'ps'), 'R1', 'playstation: button 5 is R1');
eq(buttonName(9), 'Menu', 'xbox: button 9 is Menu'); eq(buttonName(9, 'ps'), 'Options', 'playstation: button 9 is Options');
eq(buttonName(14), 'D-pad left', 'button 14 named'); eq(buttonName(23), 'Button', 'unknown index: a plain word, never the number');
ok([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17].every(n => !buttonName(n).includes('·') && !buttonName(n, 'ps').includes('·') && !/^\d+$/.test(buttonName(n)) && !/^\d+$/.test(buttonName(n, 'ps'))), 'no name is a raw index or two naming systems at once');
ok([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17].every(n => !/\d/.test(buttonName(n))), 'xbox names carry no digits at all');
ok([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17].every(n => !/\d/.test(buttonName(n, 'ps')) || /^[LR][123]$/.test(buttonName(n, 'ps'))), 'playstation digits appear only in the real L1/R1-style names');
eq(padFamily('DualSense Wireless Controller (STANDARD GAMEPAD Vendor: 054c Product: 0ce6)'), 'ps', 'DualSense id -> playstation names');
eq(padFamily('Wireless Controller (STANDARD GAMEPAD Vendor: 054c Product: 05c4)'), 'ps', 'DualShock 4 id -> playstation names');
eq(padFamily('Xbox 360 Controller (STANDARD GAMEPAD Vendor: 045e Product: 028e)'), 'xb', 'Xbox id -> xbox names');
eq(padFamily('Xbox Wireless Controller'), 'xb', 'Xbox Wireless Controller keeps its printed letters');
eq(padFamily('Wireless Controller'), 'ps', 'plain Wireless Controller keeps PlayStation shapes');
eq(padFamily('Fake'), 'xb', 'unknown pad -> xbox names'); eq(padFamily(undefined), 'xb', 'no id -> xbox names');

/* 3. sanitize, including the v1 migration */
eq(sanitizePadBindings(null), PAD_DEFAULTS, 'sanitize(null) = defaults');
eq(sanitizePadBindings('junk'), PAD_DEFAULTS, 'sanitize(garbage) = defaults');
eq(sanitizePadBindings({ drift: [7] }).drift, [7], 'partial save keeps its drift, rest defaults');
eq(sanitizePadBindings({ drift: [7] }).item, [4, 3], 'partial save fills the rest from defaults');
eq(sanitizePadBindings({ item: [99, -1, 1.5, 'x', 3, 3] }).item, [3], 'invalid indices dropped, duplicates removed');
eq(sanitizePadBindings({ item: [] }).item, [4, 3], 'empty list falls back to default (never unbound)');
{ // a v1 save (#187) carried confirm/back entries: they are ignored, not errors
  const v1 = { accelerate: [0], brake: [1], drift: [5, 2], item: [4, 3], rear: [11, 13], pause: [9], confirm: [3], back: [2] };
  const migrated = sanitizePadBindings(v1);
  eq(Object.keys(migrated).sort(), ['accelerate', 'brake', 'drift', 'item', 'pause', 'rear'], 'v1 save migrates: menu entries dropped, six actions remain');
  eq(migrated.accelerate, [0], 'v1 migration keeps the racing bindings');
  const v1b = sanitizePadBindings({ confirm: [3], back: [7], drift: [6] });
  eq(v1b.drift, [6], 'v1 save with a real remap keeps it through migration');
  ok(!('confirm' in v1b) && !('back' in v1b), 'remapped v1 menu buttons do not come back as bindings');
}

/* 4. applyPadBind semantics */
let b = defaultPadBindings();
eq(applyPadBind(b, 'accelerate', 8), { changed: true, swapped: null, droppedFrom: null }, 'free button: plain bind');
eq(b.accelerate, [8], 'free button bound');
b = defaultPadBindings();
const swap = applyPadBind(b, 'drift', 4);
eq(swap.swapped, 'item', 'primary conflict reports the swap');
eq(b.drift, [4, 2], 'swap: drift takes the button, keeps its also');
eq(b.item, [5, 3], 'swap: item receives the freed primary');
b = defaultPadBindings();
const steal = applyPadBind(b, 'brake', 2);
eq(steal.droppedFrom, 'drift', 'binding an "also" button reports the steal');
eq(b.brake, [2], 'steal: brake bound'); eq(b.drift, [5], 'steal: drift loses the also, keeps its primary');
b = defaultPadBindings();
applyPadBind(b, 'item', 3);
eq(b.item, [3, 4], 'own "also" promotes to primary, old primary becomes the also');
b = defaultPadBindings();
applyPadBind(b, 'pause', 5);
eq(b.pause, [5], 'pause (its own group) may take RB');
eq(b.drift, [5, 2], 'pause group: drift is untouched — the button is shared across contexts');
b = defaultPadBindings();
applyPadBind(b, 'drift', 9);
eq(b.drift, [9, 2], 'drift may take the Menu button');
eq(b.pause, [9], 'pause keeps its button — groups never swap with each other');
eq(applyPadBind(b, 'pause', 9).changed, false, 'binding the current primary is a no-op');
{ // invariant fuzz: 300 random binds; primaries stay unique per group, lists never empty
  const bb = defaultPadBindings(); let seed = 42; const rnd = () => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
  for (let i = 0; i < 300; i++) applyPadBind(bb, PAD_ACTIONS[Math.floor(rnd() * PAD_ACTIONS.length)].id, Math.floor(rnd() * 18));
  for (const g of ['race', 'menu']) {
    const prim = PAD_ACTIONS.filter(a => a.group === g).map(a => bb[a.id][0]);
    ok(new Set(prim).size === prim.length, `fuzz: ${g} primaries unique`);
  }
  ok(PAD_ACTIONS.every(a => bb[a.id].length >= 1), 'fuzz: no action left unbound');
}
eq(describePadBind(PAD_DEFAULTS, 'drift'), 'RB', 'describe drift: primary only, the also stays unlisted');
eq(describePadBind(PAD_DEFAULTS, 'drift', 'ps'), 'R1', 'describe drift in playstation names');
eq(describePadBind(PAD_DEFAULTS, 'pause'), 'Menu', 'describe pause');

/* 5. Persistence through the real Save store */
{
  const s1 = new Save();
  eq(s1.settings.padBinds, null, 'fresh save: padBinds null (shipped mapping)');
  eq(s1.settings.padSteer, 'both', 'fresh save: steering source defaults to both');
  const custom = defaultPadBindings(); applyPadBind(custom, 'drift', 7); applyPadBind(custom, 'item', 5);
  s1.set('padBinds', custom); s1.set('padSteer', 'dpad');
  const s2 = new Save();
  eq(s2.settings.padBinds, custom, 'bindings survive a save round-trip');
  eq(s2.settings.padSteer, 'dpad', 'steering source survives a save round-trip');
  store.clear();
  const s3 = new Save(); s3.data.settings.padBinds = { item: [2] }; s3.write();
  const s4 = new Save();
  eq(sanitizePadBindings(s4.settings.padBinds).item, [2], 'a partial stored map loads and sanitizes');
  eq(sanitizePadBindings(s4.settings.padBinds).brake, [1], 'a partial stored map keeps other defaults');
  store.clear();
  const s5 = new Save(); s5.data.settings.padBinds = { accelerate: [0], brake: [1], drift: [5, 2], item: [4, 3], rear: [11, 13], pause: [9], confirm: [3], back: [2] }; s5.write();
  const s6 = new Save();
  eq(sanitizePadBindings(s6.settings.padBinds), PAD_DEFAULTS, 'a full v1 save in the store migrates to the six-action model');
}

/* 6. The real Input class against a fake gamepad */
const fakePad = pressed => ({ connected: true, id: 'Fake', axes: [0, 0], buttons: Array.from({ length: 18 }, (_, i) => ({ pressed: pressed.includes(i), value: pressed.includes(i) ? 1 : 0 })) });
{
  const input = new Input();
  const out = () => ({ steer: 0, throttle: 0, brake: 0, drift: false, item: false, itemBack: false, rear: false });
  pads[0] = fakePad([0]);
  let o = out(); eq(input._pad(0, o), true, '_pad reports a connected pad'); eq(o.throttle, 1, 'default: A accelerates');
  pads[0] = fakePad([5, 2]); o = out(); input._pad(0, o); ok(o.drift, 'default: RB and X both drift (the also still works)');
  pads[0] = fakePad([4]); o = out(); input._pad(0, o); ok(o.item, 'default: LB uses the item');
  pads[0] = fakePad([11]); o = out(); input._pad(0, o); ok(o.rear, 'default: right-stick click looks behind');
  pads[0] = fakePad([]); pads[0].axes = [0.9, 0]; o = out(); input._pad(0, o); ok(o.steer > 0.5, 'default (both): stick steers');
  pads[0] = fakePad([14]); o = out(); input._pad(0, o); eq(o.steer, -1, 'default (both): D-pad steers and wins');
  // remap: drift moves from RB to RT (7), a free button
  const custom = defaultPadBindings(); applyPadBind(custom, 'drift', 7);
  input.setPadBindings(custom, 'stick');
  pads[0] = fakePad([7]); o = out(); input._pad(0, o); ok(o.drift, 'remapped: RT now drifts');
  pads[0] = fakePad([5]); o = out(); input._pad(0, o); ok(!o.drift, 'remapped: RB no longer drifts');
  pads[0] = fakePad([15]); o = out(); input._pad(0, o); eq(o.steer, 0, 'steering source = stick: D-pad no longer steers');
  input.setPadBindings(custom, 'dpad');
  pads[0] = fakePad([]); pads[0].axes = [0.9, 0]; o = out(); input._pad(0, o); eq(o.steer, 0, 'steering source = dpad: stick no longer steers');
  const pedalSample = (lt, rt, buttons = []) => {
    pads[0] = fakePad(buttons);
    for (const [n, value] of [[6, lt], [7, rt]]) pads[0].buttons[n] = { value, pressed: value > 0.5 };
    return input.poll(1 / 60)[0];
  };
  input.setPadBindings(null, 'both');
  eq(pedalSample(0.01, 1).brake, 0, 'a resting brake cannot cancel full gas');
  eq(pedalSample(0.01, 1).throttle, 1, 'full analog travel reaches full gas');
  input.keys.add('ArrowUp');
  eq(pedalSample(0.02, 0).brake, 0, 'an idle attached pad does not brake the keyboard player');
  input.keys.clear();
  const pedals = defaultPadBindings();
  applyPadBind(pedals, 'drift', 6); input.setPadBindings(pedals, 'both');
  o = pedalSample(1, 1); ok(o.drift && o.throttle === 1 && !o.brake, 'a remapped drift trigger does not secretly brake');
  applyPadBind(pedals, 'accelerate', 6); applyPadBind(pedals, 'brake', 7);
  input.setPadBindings(pedals, 'both');
  o = pedalSample(0.6, 0);
  ok(o.throttle > 0.5 && o.throttle < 0.6 && !o.brake, 'swapped gas trigger remains proportional past the pressed threshold');
  o = pedalSample(0, 0.8);
  ok(!o.throttle && o.brake > 0.7 && o.brake < 0.8, 'swapped brake applies only proportional braking');
  // menu edges DERIVE from Accelerate/Brake — there is nothing else to remap
  const events = []; input.onMenu = a => events.push(a);
  input.setPadBindings(null, 'both');
  const tap = n => { pads[0] = fakePad([n]); input._padMenus(0.016); pads[0] = fakePad([]); input._padMenus(0.016); };
  tap(0); ok(events.includes('confirm'), 'menu: A confirms by default (it is the Accelerate button)');
  events.length = 0; tap(1); ok(events.includes('back'), 'menu: B goes back by default (it is the Brake button)');
  events.length = 0;
  const cm = defaultPadBindings(); applyPadBind(cm, 'accelerate', 3); applyPadBind(cm, 'brake', 2); input.setPadBindings(cm, 'both');
  tap(3); ok(events.includes('confirm'), 'menu: remapped Accelerate (Y) now confirms');
  events.length = 0; tap(2); ok(events.includes('back'), 'menu: remapped Brake (X) now goes back');
  events.length = 0; tap(0); tap(1);
  ok(!events.includes('confirm') && !events.includes('back'), 'menu: A and B are inert once Accelerate/Brake moved');
  // A and B stay predictable in the editor, including the full press used to record a binding.
  let listening = true;
  input.padEditor = { poll: () => listening, exclusive: () => listening };
  events.length = 0;
  tap(0); pads[0] = fakePad([1]); input._padMenus(0.016);
  listening = false; input._padMenus(0.016);
  eq(events, [], 'editor: a captured A or B never activates the menu, even when held');
  pads[0] = fakePad([]); input._padMenus(0.016);
  tap(1); tap(0);
  eq(events, ['back', 'confirm'], 'editor: released B and A navigate regardless of driving bindings');
  input.padEditor = null;
  // a stored v1 confirm entry is ignored end-to-end: menus still follow Accelerate
  input.setPadBindings({ ...defaultPadBindings(), confirm: [3], back: [3] }, 'both');
  ok(!('confirm' in input.padBinds), 'setPadBindings drops the v1 menu entries');
  events.length = 0; tap(3);
  ok(!events.includes('confirm'), 'menu: the ignored v1 confirm button does nothing');
  tap(0); ok(events.includes('confirm'), 'menu: Accelerate still confirms after a v1 save loads');
  input.setPadBindings(null, 'both');
  pads[0] = fakePad([12]); const before = events.length; input._padMenus(0.016);
  ok(events.slice(before).includes('up'), 'menu: D-pad up still navigates');
  ok(PAD_STEER_SOURCES.some(([id]) => id === 'both'), 'steer sources include the shipped behaviour');
}

console.log(fails ? `\n${fails} FAILURE(S)` : '\nALL PASS');
process.exit(fails ? 1 : 0);
