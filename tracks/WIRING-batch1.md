# Tracks Batch 1 — Wiring Guide (issue #10)

Three self-contained track modules. **No game.js changes are committed on
`wip/tracks-1`** — this doc is the complete, minimal integration recipe
(+22/−5 lines across game.js / index.html / sw.js when prototyped; the
prototype was bot-tested and screenshot-verified, then reverted).

| File | Track | Index in `TRACKS` |
|---|---|---|
| `tracks/datacenter.js` | AI Datacenter GP | 2 |
| `tracks/waters.js` | International Waters GP | 3 |
| `tracks/whitehouse.js` | White House GP | 4 |

## Module contract

Each module exports exactly two things:

- `def` — a `TRACKS` entry in the precise shape game.js already consumes:
  `{ name, sky, fog, ground, roadSeed, points }` (`points` = closed
  Catmull-Rom control points, `[x, z]` pairs). Two defs also carry an
  optional `shoulder` colour (see wiring step 3 — one-line change, safe to
  skip: the default shoulder colour is used instead).
- `dress(ctx)` — the dressing builder. Called once per `buildWorld()`,
  after `buildScenery()`. It builds everything into `ctx.scene` and returns
  `{ update(dt, t), onLap(lapsCompleted) }` (either may be absent).

`ctx` is a plain object of game.js internals the existing builders already
use: `{ THREE, scene, samples, normals, tangents, N, HALF_W, rand, clamp,
billboardTexture, scatterPos, headingOf, clouds }`.

**Disposal rule (important):** `buildWorld()` disposes every geometry /
material / texture in the old scene on rebuild. The modules therefore create
ALL materials and canvas textures inside `dress()` and cache nothing
THREE-related at module level. Do not "optimise" this later without a
matching disposal exemption in buildWorld.

## Wiring steps

### 1. game.js — imports (top, after the THREE import)

```js
import { def as datacenterDef, dress as dressDatacenter } from './tracks/datacenter.js';
import { def as watersDef, dress as dressWaters } from './tracks/waters.js';
import { def as whitehouseDef, dress as dressWhitehouse } from './tracks/whitehouse.js';
```

### 2. game.js — registry (in the `TRACKS` literal + two lines after it)

Append the defs to the `TRACKS` array (after the Mars entry) and add:

```js
const TRACK_DRESSING = { 2: dressDatacenter, 3: dressWaters, 4: dressWhitehouse };
let trackFx = null, lastPlayerLap = 1;
```

### 3. game.js — buildWorld: shoulder colour + dressing dispatch

Shoulder line: replace the hardcoded colour expression with
`tr.shoulder ?? (trackIdx === 1 ? 0x8a4023 : 0x9aa0a3)`.

Immediately after `buildScenery(trackIdx);` insert:

```js
trackFx = null; lastPlayerLap = 1;
if (TRACK_DRESSING[trackIdx]) trackFx = TRACK_DRESSING[trackIdx]({ THREE, scene, samples, normals, tangents, N, HALF_W, rand, clamp, billboardTexture, scatterPos, headingOf, clouds }) || null;
```

### 4. game.js — buildScenery: stop the generic scenery leaking onto new tracks

The Valley dressing branch currently runs for every non-Mars track
(140 trees + 24 office towers). Guard it so new tracks get only their own
dressing plus the shared billboards / grandstand / clouds below it:

- `if (!mars) {` → `if (trackIdx === 0) {`
- the matching `} else {` before the Mars rocks → `} else if (mars) {`

### 5. game.js — animate: per-frame tick + per-lap hook

Insert immediately before `refreshTouchUI();` inside the
`if (!paused && scene)` block:

```js
if (trackFx) {
  const pk = playerKart();
  const lapNow = pk ? clamp(Math.floor(Math.max(pk.continuous, 0) / N) + 1, 1, LAPS) : 1;
  if (trackFx.onLap && lapNow !== lastPlayerLap) { const done = lapNow - 1; lastPlayerLap = lapNow; trackFx.onLap(done); }
  if (trackFx.update) trackFx.update(dt, elapsed);
}
```

`onLap` receives **completed** lap count (1 after the first crossing).
Datacenter GP uses it to drain its lake by a third per lap; the other two
tracks don't implement it. The tick runs in menu/countdown/racing alike
(same as the cloud drift) so animated dressing is alive behind the menu.

### 6. index.html — three track cards (after the Mars card, line ~91)

```html
<button class="track-card" data-track="2"><span class="track-emoji">🖥️</span><span class="track-name">AI Datacenter GP</span><span class="track-desc">Drive through the server hall. Mind the lake.</span></button>
<button class="track-card" data-track="3"><span class="track-emoji">🛥️</span><span class="track-name">International Waters GP</span><span class="track-desc">Golden hour, superyachts, zero jurisdiction.</span></button>
<button class="track-card" data-track="4"><span class="track-emoji">🏛️</span><span class="track-name">White House GP</span><span class="track-desc">The Mall, the pool, and a $300M ballroom zone.</span></button>
```

(The menu handler is generic over `.track-card[data-track]` — nothing else
to change. `BK.start(racer, 2|3|4)` works for the bot/QA automatically.)

### 7. sw.js — service worker shell

Add `'./tracks/datacenter.js', './tracks/waters.js', './tracks/whitehouse.js'`
to `SHELL` and bump `CACHE` (`bk-v2` → `bk-v3`) so installed PWAs pick the
new files up.

## Geometry validation (tracks/geom-check.mjs)

All three splines were vetted with the game's own math (centripetal
Catmull-Rom, 900 spaced samples, road half-width 11):

| Track | Length | Min turn radius | Min self-clearance |
|---|---|---|---|
| AI Datacenter GP | 1494 | 19.4 | 98.7 |
| International Waters GP | 1430 | 100.0 | 108.3 |
| White House GP | 1383 | 21.3 | 93.3 |
| Silicon Valley GP (reference) | 1766 | 24.9 | 112.4 |
| Mars GP (reference) | 1892 | 16.3 | 106.9 |

Re-run anytime: `node tracks/geom-check.mjs candidates`.

## Proof

`tracks/proof/proof.mjs` (QA-harness pattern: SW stubbed, Three.js
intercepted from `tools/vendor/`) races each new track under autopilot and
saves one screenshot per track — zero console/page errors required
(`ONLY=3,4 node tracks/proof/proof.mjs` re-shoots a subset).
`tracks/proof/unit-dress.mjs` covers the module logic deterministically in
Node (real Three.js, stubbed 2D canvas): dress() + 240 update ticks +
onLap(1..3) per module, asserting Datacenter's lake drains (y 0.72 → −0.75,
scale → 0.56). The full `tools/bot-test.mjs` also passes with this wiring
applied. Screenshots live in `tracks/proof/*.png` — per the repo's PR
screenshot rule, embed them in the PR for this branch.

## Interface gaps hit (for the integrator / lead)

1. **No per-lap callback existed** — laps are derived from
   `kart.continuous / N` inside `updateKart`. Step 5 derives the player's
   lap in `animate()` instead of touching `updateKart`; zero-risk, but if a
   future track needs AI-lap hooks, add a real event in `updateKart` where
   `k.lastLapTime` is set (~line 708).
2. **No track-module system existed** — `buildScenery(trackIdx)` hardcodes
   per-index dressing and the generic Valley branch leaks onto any new
   index (step 4). The `TRACK_DRESSING` registry in step 2 is the minimal
   extension; Batch 2/3 tracks should reuse it rather than growing
   `buildScenery`.
3. **Shoulder colour was index-hardcoded** (`trackIdx === 1 ? …`) — step 3
   moves it onto the track def as optional `shoulder`, same pattern as
   `sky`/`fog`/`ground`.
4. Track defs are consumed from two places (the `TRACKS` array and static
   HTML cards) — both are covered above; nothing else reads `TRACKS.length`
   except the menu/best-time code, which is generic.
