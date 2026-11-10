# WIRING.md — Batch 3 track modules → game.js

The four Batch 3 tracks ship as self-contained ES modules. They contain **zero**
game.js edits on this branch. This doc is the complete, minimal integration:
5 small edits in `game.js`, 4 buttons in `index.html`, 1 edit in `sw.js`.
Everything is anchored by function/variable name, not line number.

Module contract (`tracks/metaverse.js`, `wework.js`, `burningman.js`, `bahamas.js`):

- `TRACK` — plain definition in exactly the shape `TRACKS[]` already consumes
  (`{ name, sky, fog, ground, shoulder, roadSeed, points }`).
- `CARD` — `{ emoji, desc }` for the menu track-card.
- `build(ctx)` — builds all dressing into `ctx.scene`, registers animation via
  `ctx.animators.push((dt, elapsed) => { … })`.
- `tracks/shared.js` — the modules' shared toolkit; the modules import it, game.js
  never touches it directly.

Hard rule the modules already obey: everything is created fresh inside `build()`
(no module-scope meshes/materials/textures), because `buildWorld`'s teardown
disposes the whole scene on rebuild.

---

## Edit 1 — game.js: imports + registry (top of file, after `import * as THREE`)

```js
import { TRACK as META_TRACK, build as buildMetaverse } from './tracks/metaverse.js';
import { TRACK as WEWORK_TRACK, build as buildWeWork } from './tracks/wework.js';
import { TRACK as BURNING_TRACK, build as buildBurningMan } from './tracks/burningman.js';
import { TRACK as BAHAMAS_TRACK, build as buildBahamas } from './tracks/bahamas.js';
/* Batch 3 track modules by registry index (TRACKS order). null = built-in scenery. */
const TRACK_MODULES = [null, null, buildMetaverse, buildWeWork, buildBurningMan, buildBahamas];
```

## Edit 2 — game.js: extend the `TRACKS` array literal

Append the four imported definitions after the Mars GP entry (order = menu order
= indices 2–5, matching `TRACK_MODULES` above):

```js
  META_TRACK, WEWORK_TRACK, BURNING_TRACK, BAHAMAS_TRACK,
```

## Edit 3 — game.js: animator registry + scenery context

Next to the core-state declarations (beside `let karts = [], … clouds = []`):

```js
let trackAnimators = []; // per-frame hooks registered by the current track module
```

Anywhere before `buildScenery` (right after `scatterPos` reads naturally):

```js
function sceneryContext() {
  return { THREE, scene, samples, normals, tangents, N, HALF_W, trackCenter,
           rand, scatterPos, canvasTexture, billboardTexture, animators: trackAnimators };
}
```

## Edit 4 — game.js: dispatch at the top of `buildScenery(trackIdx)`

Insert as the function's first statements, before `const mars = …`:

```js
  const modBuild = TRACK_MODULES[trackIdx];
  if (modBuild) { trackAnimators = []; modBuild(sceneryContext()); return; }
```

Note: module tracks intentionally skip the built-in generic billboards /
grandstand / clouds — each module ships its own equivalents (its own signage
pack, set piece, and sky dressing), per the equal-effort rule.

## Edit 5 — game.js: run the animators in `animate()`

Inside `animate()`, immediately after the `updateParticles(dt);` call:

```js
    for (const fn of trackAnimators) fn(dt, elapsed);
```

## Edit 6 — game.js: per-track shoulder colour in `buildWorld`

The shoulder strip colour is hardcoded (`trackIdx === 1 ? mars : grey`). The new
definitions carry a `shoulder` field; use it with the old behaviour as fallback:

```js
  const shoulder = new THREE.Mesh(stripGeometry(HALF_W + 2.6, 0.0),
    new THREE.MeshLambertMaterial({ color: tr.shoulder ?? (trackIdx === 1 ? 0x8a4023 : 0x9aa0a3) }));
```

(This is the only place a module-track property reaches into existing rendering;
without it the new tracks still work, just with the default grey shoulder.)

## Edit 7 — index.html: four track cards in `#track-row`

After the Mars GP button, in order (indices must match `TRACKS`):

```html
      <button class="track-card" data-track="2"><span class="track-emoji">🥽</span><span class="track-name">Metaverse Plaza GP</span><span class="track-desc">A glossy empty plaza. Population: you + bots.</span></button>
      <button class="track-card" data-track="3"><span class="track-emoji">🏢</span><span class="track-name">WeWork Memorial GP</span><span class="track-desc">A ruined coworking cathedral. The kombucha is gone.</span></button>
      <button class="track-card" data-track="4"><span class="track-emoji">🔥</span><span class="track-name">Burning Man GP</span><span class="track-desc">Dusk on the playa. Radical self-reliance, valet available.</span></button>
      <button class="track-card" data-track="5"><span class="track-emoji">🏝️</span><span class="track-name">Bahamas Crypto GP</span><span class="track-desc">Beachfront past the FTX ruins. 0% tax, 100% vibes.</span></button>
```

No JS change needed for the cards: the existing `.track-card` click handler is
generic (`data-track` → `selectedTrack` → `buildWorld`). Best-time storage is
already keyed per track index.

## Edit 8 — sw.js: shell list + cache bump

Add the five module files to `SHELL` and bump the cache so installed PWAs pick
up the new files:

```js
const CACHE = 'bk-v3';
const SHELL = ['./', './index.html', './style.css', './game.js', './portraits.js', './manifest.webmanifest',
  './tracks/shared.js', './tracks/metaverse.js', './tracks/wework.js', './tracks/burningman.js', './tracks/bahamas.js'];
```

---

## Verification (already run on this branch with exactly these edits applied)

- `node tools/bot-test.mjs` — full pass, zero console/page errors (existing
  suite: menu, Character Select v2, race on track 0, all Control Lab schemes).
- `node tracks/proof-tracks.mjs` — loads each module track via `BK.start(0, idx)`,
  autopilots, asserts the player kart's `continuous` advances > 85 samples over
  race t=4s→11s (threshold calibrated against track 0's known-good rate of
  ~17 samples/race-second from a standing start) and that no console/page
  errors occur, and writes one 1280×800 screenshot per track to `tracks/proof/`.
- Screenshots: `tracks/proof/metaverse.png`, `wework.png`, `burningman.png`,
  `bahamas.png`.

## Known interface gaps (found while building; none block integration)

1. **No per-track animation hook exists** in the engine — Edit 5 adds the
   smallest possible one (`trackAnimators`). Without it, module tracks still
   build and race; they just don't move.
2. **Shoulder colour is a hardcoded ternary** on `trackIdx === 1` — Edit 6
   generalises it via the (already-plumbed) track definition object.
3. **`buildScenery` is a valley/Mars binary** — Edit 4's early-return dispatch
   is the seam Batch 1/2 module conversions should reuse; consider migrating
   Silicon Valley / Mars into modules behind the same registry later.
4. **Generic clouds/billboards/grandstand are skipped for module tracks** by
   design (each module ships its own). If a future module wants the generic
   pack, expose it via `sceneryContext()` rather than reaching into globals.
5. `roadSeed` in track definitions is currently unused by the engine (both
   built-in tracks define it; the modules define it too, for shape parity).
