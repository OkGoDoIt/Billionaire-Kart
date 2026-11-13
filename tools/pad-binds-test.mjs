/* Headless test of the gamepad bindings layer (issue #184).
   Covers: shipped defaults == the indices that were hardcoded before the
   mapping layer existed; remap / swap / steal semantics; sanitize; a real
   Save persistence round-trip; and the real Input class driven by a fake
   gamepad (race polling + menu edges, before and after a remap).
   Run: node tools/pad-binds-test.mjs — exits non-zero on any failure. */

// localStorage stub must exist before save.js is imported.
const store = new Map();
globalThis.localStorage = { getItem: k => (store.has(k) ? store.get(k) : null), setItem: (k, v) => store.set(k, String(v)), removeItem: k => store.delete(k) };
globalThis.addEventListener = () => {};
const pads = [null, null, null, null];
Object.defineProperty(globalThis, 'navigator', { value: { getGamepads: () => pads }, configurable: true });

const { PAD_ACTIONS, PAD_DEFAULTS, PAD_STEER_SOURCES, buttonName, defaultPadBindings, sanitizePadBindings, applyPadBind, describePadBind, Input } = await import('../src/core/input.js');
const { Save } = await import('../src/core/save.js');

let fails = 0;
const eq = (got, want, msg) => { const g = JSON.stringify(got), w = JSON.stringify(want); if (g !== w) { fails++; console.error(`FAIL ${msg}: got ${g}, want ${w}`); } else console.log(`ok   ${msg}`); };
const ok = (cond, msg) => { if (!cond) { fails++; console.error(`FAIL ${msg}`); } else console.log(`ok   ${msg}`); };

/* 1. The shipped defaults are the old hardcoded indices, read from the
      pre-#184 input.js: throttle b(0), brake b(1), drift b(5)||b(2),
      item b(4)||b(3), rear b(11)||b(13); menus: confirm b(0), back b(1), pause b(9). */
eq(PAD_DEFAULTS, { accelerate: [0], brake: [1], drift: [5, 2], item: [4, 3], rear: [11, 13], pause: [9], confirm: [0], back: [1] }, 'defaults match the previously hardcoded indices');
eq(PAD_ACTIONS.map(a => a.id), ['accelerate', 'brake', 'drift', 'item', 'rear', 'pause', 'confirm', 'back'], 'action list covers every pad-driven action');
eq(buttonName(0), 'A · Cross', 'button 0 named'); eq(buttonName(9), 'Start · Menu', 'button 9 named'); eq(buttonName(14), 'D-pad left', 'button 14 named'); eq(buttonName(23), 'Button 23', 'unknown index falls back');

/* 2. sanitize */
eq(sanitizePadBindings(null), PAD_DEFAULTS, 'sanitize(null) = defaults');
eq(sanitizePadBindings('junk'), PAD_DEFAULTS, 'sanitize(garbage) = defaults');
eq(sanitizePadBindings({ drift: [7] }).drift, [7], 'partial save keeps its drift, rest defaults');
eq(sanitizePadBindings({ drift: [7] }).item, [4, 3], 'partial save fills the rest from defaults');
eq(sanitizePadBindings({ item: [99, -1, 1.5, 'x', 3, 3] }).item, [3], 'invalid indices dropped, duplicates removed');
eq(sanitizePadBindings({ item: [] }).item, [4, 3], 'empty list falls back to default (never unbound)');

/* 3. applyPadBind semantics */
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
applyPadBind(b, 'confirm', 5);
eq(b.confirm, [5], 'cross-group: confirm may take RB');
eq(b.drift, [5, 2], 'cross-group: drift is untouched (menus and racing are separate contexts)');
eq(applyPadBind(b, 'pause', 9).changed, false, 'binding the current primary is a no-op');
{ // invariant fuzz: 300 random binds; primaries stay unique per group, lists never empty
  const bb = defaultPadBindings(); let seed = 42; const rnd = () => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
  for (let i = 0; i < 300; i++) applyPadBind(bb, PAD_ACTIONS[Math.floor(rnd() * 8)].id, Math.floor(rnd() * 18));
  for (const g of ['race', 'menu']) {
    const prim = PAD_ACTIONS.filter(a => a.group === g).map(a => bb[a.id][0]);
    ok(new Set(prim).size === prim.length, `fuzz: ${g} primaries unique`);
  }
  ok(PAD_ACTIONS.every(a => bb[a.id].length >= 1), 'fuzz: no action left unbound');
}
eq(describePadBind(PAD_DEFAULTS, 'drift'), 'RB (also X · Square)', 'describe drift');
eq(describePadBind(PAD_DEFAULTS, 'pause'), 'Start · Menu', 'describe pause');

/* 4. Persistence through the real Save store */
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
}

/* 5. The real Input class against a fake gamepad */
const fakePad = pressed => ({ connected: true, id: 'Fake', axes: [0, 0], buttons: Array.from({ length: 18 }, (_, i) => ({ pressed: pressed.includes(i), value: pressed.includes(i) ? 1 : 0 })) });
{
  const input = new Input();
  const out = () => ({ steer: 0, throttle: 0, brake: 0, drift: false, item: false, itemBack: false, rear: false });
  pads[0] = fakePad([0]);
  let o = out(); eq(input._pad(0, o), true, '_pad reports a connected pad'); eq(o.throttle, 1, 'default: A accelerates');
  pads[0] = fakePad([5, 2]); o = out(); input._pad(0, o); ok(o.drift, 'default: RB and X both drift');
  pads[0] = fakePad([4]); o = out(); input._pad(0, o); ok(o.item, 'default: LB uses the item');
  pads[0] = fakePad([11]); o = out(); input._pad(0, o); ok(o.rear, 'default: right-stick click looks behind');
  pads[0] = fakePad([]); pads[0].axes = [0.9, 0]; o = out(); input._pad(0, o); ok(o.steer > 0.5, 'default (both): stick steers');
  pads[0] = fakePad([14]); o = out(); input._pad(0, o); eq(o.steer, -1, 'default (both): D-pad steers and wins');
  // remap: drift moves from RB to RT (7); item takes RB by swap-free steal of nothing (7 was free)
  const custom = defaultPadBindings(); applyPadBind(custom, 'drift', 7);
  input.setPadBindings(custom, 'stick');
  pads[0] = fakePad([7]); o = out(); input._pad(0, o); ok(o.drift, 'remapped: RT now drifts');
  pads[0] = fakePad([5]); o = out(); input._pad(0, o); ok(!o.drift, 'remapped: RB no longer drifts');
  pads[0] = fakePad([15]); o = out(); input._pad(0, o); eq(o.steer, 0, 'steering source = stick: D-pad no longer steers');
  input.setPadBindings(custom, 'dpad');
  pads[0] = fakePad([]); pads[0].axes = [0.9, 0]; o = out(); input._pad(0, o); eq(o.steer, 0, 'steering source = dpad: stick no longer steers');
  // menu edges follow the bindings
  const events = []; input.onMenu = a => events.push(a);
  input.setPadBindings(null, 'both');
  pads[0] = fakePad([0]); input._padMenus(0.016); pads[0] = fakePad([]); input._padMenus(0.016);
  ok(events.includes('confirm'), 'menu: A confirms by default');
  events.length = 0;
  const cm = defaultPadBindings(); applyPadBind(cm, 'confirm', 3); input.setPadBindings(cm, 'both');
  pads[0] = fakePad([3]); input._padMenus(0.016); pads[0] = fakePad([]); input._padMenus(0.016);
  ok(events.includes('confirm'), 'menu: remapped confirm (Y) confirms');
  events.length = 0;
  pads[0] = fakePad([0]); input._padMenus(0.016); pads[0] = fakePad([]); input._padMenus(0.016);
  ok(!events.includes('confirm'), 'menu: A no longer confirms after the remap');
  pads[0] = fakePad([12]); const before = events.length; input._padMenus(0.016);
  ok(events.slice(before).includes('up'), 'menu: D-pad up still navigates');
  ok(PAD_STEER_SOURCES.some(([id]) => id === 'both'), 'steer sources include the shipped behaviour');
}

console.log(fails ? `\n${fails} FAILURE(S)` : '\nALL PASS');
process.exit(fails ? 1 : 0);
