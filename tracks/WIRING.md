# Tracks Batch 2 — Wiring Spec (for the lead builder / integrator)

`tracks/bliss.js`, `tracks/tunnel.js`, `tracks/davos.js` are **self-contained classic
scripts**. Each one only pushes a track definition onto `window.BK_TRACKS` — the exact
pattern `portraits.js` already uses (`window.BK_PORTRAITS`). No game.js edits exist on
this branch; everything below is the complete, minimal integration. Line numbers are
from merged `main` @ `eb1cb38` (v1.2); anchors are quoted so they survive drift.

## The module contract (what the defs provide)

Built-in `TRACKS` entries use `{ name, sky, fog, ground, roadSeed, points }`.
Module defs use the same fields plus optional extensions, all consumed below:

| Field | Type | Used by |
|---|---|---|
| `shoulder` | hex colour | §3 shoulder colour override |
| `fogNear` / `fogFar` | numbers | §3 fog range (Tunnel: 40 / 330) |
| `billboards` | string[] | §4 replaces global `BILLBOARDS` for this track |
| `standColors` | hex[4] | §4 grandstand tier colours (Bliss = BSOD blues) |
| `noClouds` | bool | §4 skips the shared cloud block (Tunnel is indoors) |
| `banner` | string | §3 start-gantry banner text |
| `buildDressing(ctx)` | fn | §4 replaces the valley/mars scatter branch of `buildScenery` |
| `tick(dt, elapsed)` | fn | §5 per-frame animation (fans, beacons, snow, chase lights…) |
| `countdownView` | `{pos:[x,y,z], look:[x,y,z]}` | §6 Bliss start-grid hero framing |
| `chime` | `'xp'` | §7 Bliss-only race-start chime (optional but wanted) |

`ctx` passed to `buildDressing` is a plain object of game.js internals:
`{ THREE, scene, samples, normals, tangents, N, HALF_W, trackCenter, rand, clamp,
scatterPos, canvasTexture, billboardTexture, stripGeometry, headingOf }`.
`buildDressing` closes over its animated objects; `tick` animates the most recent
build (worlds are rebuilt on every race/menu selection, and each rebuild re-runs
`buildDressing`, so closure state is always fresh).

## §1 index.html — script tags

After line 173 (`<script src="portraits.js"></script>`) and **before** line 174
(`<script type="module" src="game.js"></script>`), insert:

```html
<script src="tracks/bliss.js"></script>
<script src="tracks/tunnel.js"></script>
<script src="tracks/davos.js"></script>
```

## §2 index.html — track picker cards

After the Mars card (line 91, `data-track="1"`), insert three cards. Indices must
match registration order: Bliss = 2, Tunnel = 3, Davos = 4.

```html
<button class="track-card" data-track="2"><span class="track-emoji">🟩</span><span class="track-name">Bliss GP</span><span class="track-desc">Rolling green hills. Clippy believes in you.</span></button>
<button class="track-card" data-track="3"><span class="track-emoji">🚇</span><span class="track-name">Boring Tunnel GP</span><span class="track-desc">Underground. Definitely not a flamethrower.</span></button>
<button class="track-card" data-track="4"><span class="track-emoji">🏔️</span><span class="track-name">Davos Circuit</span><span class="track-desc">Alpine luxury. Fondue $400. No questions.</span></button>
```

No JS change needed for the cards: the existing handler at game.js:1504 reads
`data-track` generically.

## §3 game.js — registration + buildWorld

**(a) Register the modules.** After the `TRACKS` array closes (line 60, `];`) and
before/after the `BILLBOARDS` const (line 61), add:

```js
if (window.BK_TRACKS) for (const t of window.BK_TRACKS) TRACKS.push(t);
```

**(b) Track the active def.** Near line 165 with the other world state, add
`let currentDef = null;` — and in `buildWorld`, right after `const tr = TRACKS[trackIdx];`
(line 368), add `currentDef = tr;`.

**(c) Fog range.** Replace (line ~371):

```js
scene.fog = new THREE.Fog(tr.fog, 210, 640);
```
with:
```js
scene.fog = new THREE.Fog(tr.fog, tr.fogNear ?? 210, tr.fogFar ?? 640);
```

**(d) Shoulder colour.** Replace (line 396):

```js
const shoulder = new THREE.Mesh(stripGeometry(HALF_W + 2.6, 0.0), new THREE.MeshLambertMaterial({ color: trackIdx === 1 ? 0x8a4023 : 0x9aa0a3 }));
```
with:
```js
const shoulder = new THREE.Mesh(stripGeometry(HALF_W + 2.6, 0.0), new THREE.MeshLambertMaterial({ color: tr.shoulder ?? (trackIdx === 1 ? 0x8a4023 : 0x9aa0a3) }));
```

**(e) Gantry banner text.** In the `bannerTex` draw callback (line ~409), replace
`g.fillText('🏁 BILLIONAIRE KART 🏁', w / 2, h / 2);` with
`g.fillText(tr.banner || '🏁 BILLIONAIRE KART 🏁', w / 2, h / 2);`

## §4 game.js — buildScenery dispatch

In `buildScenery(trackIdx)` (line 427), the function currently opens:

```js
const mars = trackIdx === 1;
// trees (valley) or rocks (mars) — instanced
const COUNT = 140;
if (!mars) {
```

Insert the dispatch so it reads:

```js
const mars = trackIdx === 1;
const tr = TRACKS[trackIdx];
if (tr.buildDressing) {
  tr.buildDressing({ THREE, scene, samples, normals, tangents, N, HALF_W, trackCenter, rand, clamp, scatterPos, canvasTexture, billboardTexture, stripGeometry, headingOf });
} else if (!mars) {
  ... existing valley branch unchanged (it begins with `const COUNT = 140;`) ...
} else {
  ... existing mars branch unchanged ...
}
```

i.e. move `const COUNT = 140;` inside the valley branch and change the existing
`if (!mars) {` to `} else if (!mars) {` after the new dispatch block. Nothing inside
either existing branch changes.

**Shared blocks below the branch** (billboards, grandstand, clouds) keep running for
module tracks, with three one-token swaps:

- Billboards: `BILLBOARDS.forEach((text, i) => {` → `const BB = tr.billboards || BILLBOARDS; BB.forEach((text, i) => {`
  and inside, `i / BILLBOARDS.length` → `i / BB.length`.
- Grandstand: `const seatCols = [0xd23b2e, 0xf2f2f2, 0x1877f2, 0xffd94a];` →
  `const seatCols = tr.standColors || [0xd23b2e, 0xf2f2f2, 0x1877f2, 0xffd94a];`
- Clouds: wrap the whole `// clouds` block (from `const cloudMat = ...` through the
  closing `}` of the `for` loop) in `if (!tr.noClouds) { ... }`.

## §5 game.js — animation hook

In `animate()`, immediately before `renderer.render(scene, camera);` add:

```js
if (currentDef && currentDef.tick) currentDef.tick(dt, elapsed);
```

This runs in menu, countdown and racing alike (scenery stays alive behind the menu
orbit cam, same as clouds already do).

## §6 game.js — Bliss countdown framing (countdownView)

In `updateCamera(dt)`, in the non-menu path, immediately **before**
`camHeading = lerpAngle(...)` insert:

```js
if (gameState === 'countdown' && currentDef && currentDef.countdownView) {
  const cv = currentDef.countdownView;
  camera.position.set(cv.pos[0], cv.pos[1], cv.pos[2]);
  camera.lookAt(cv.look[0], cv.look[1], cv.look[2]);
  setFov(55, dt);
  sunLight.position.set(trackCenter.x + 80, 130, trackCenter.z + 60);
  sunLight.target.position.copy(trackCenter);
  return;
}
```

Effect for Bliss: during the 3.6 s countdown the camera holds the wallpaper
composition — start straight in the foreground, hero hill centred on the sight line
at (60, −198), sky + cloud sprites above — then the normal chase cam takes over at
GO. The layout also frames the hill from the default chase cam, so this is a
tightening, not a rescue. Also note the grid view works in the menu: menu orbit
radius 275 passes the same sight line.

Boring Tunnel uses the same hook for a different reason: the default countdown
camera starts ~30 units above the player (world-axis offset in `startRace`) and
lerps down — outdoors that's a fine crane shot, indoors it starts above the roof
and clips through it. Its `countdownView` holds the camera behind the grid,
inside the bore, for the whole countdown.

## §7 game.js — Bliss XP chime (optional, wanted)

In `startRace()`, after `gameState = 'countdown'; ...` (line ~1409), add:

```js
if (currentDef && currentDef.chime === 'xp') [660, 523, 784, 880].forEach((f, i) => A.tone(f, 0.5, 'sine', 0.055, 0, i * 0.14));
```

`buildWorld` runs just above this in `startRace`, so `currentDef` is already the
race's track. Four-note gentle motif — this track only, per DESIGN.md.

## §8 sw.js — service worker shell

Bump `const CACHE = 'bk-v2';` → `'bk-v3'` and extend `SHELL`:

```js
const SHELL = ['./', './index.html', './style.css', './game.js', './portraits.js', './tracks/bliss.js', './tracks/tunnel.js', './tracks/davos.js', './manifest.webmanifest'];
```

## §9 Interface gaps found while building (heads-up, none blocking)

1. **No per-track fog range or shoulder colour existed** — both were hardcoded
   (fog 210–640; Mars-only shoulder check). §3c/§3d add optional def fields with
   identical defaults, so built-ins are untouched. Tunnel is the consumer
   (close dark fog); without §3c it still works but reads as a bright cave.
2. **No scenery extension point existed** — `buildScenery` branched on
   `trackIdx === 1`. §4's dispatch is the general fix; future track batches
   (Batch 3) should use the same `buildDressing(ctx)` contract instead of growing
   the if-chain.
3. **No per-frame hook for scenery** — only clouds/item-boxes animated. §5 adds
   the generic `tick`. (Cloud drift is menu-only in current code; `tick` runs in
   every state, which is what fans/beacons/snow want.)
4. **Countdown camera was chase-only.** §6 is Bliss-specific in effect but the
   `countdownView` field is generic — any future track can frame a hero shot.
5. **Disposal caveat (pre-existing):** `buildWorld` disposes all geometries and
   materials found by traversing the old scene. Module dressing lives entirely in
   the scene and uses per-build materials, so it disposes cleanly; do not cache
   module textures across builds.

## Proof

This branch's author wired §§1–8 locally (uncommitted), ran
`node tools/bot-test.mjs` (full pass — see the tracks-2 report) and shot one
countdown + one race frame per track into `tracks/proof/` with
`tracks/proof/shoot.mjs`. The game.js/index.html/sw.js edits were then reverted;
only `tracks/` is committed here.
