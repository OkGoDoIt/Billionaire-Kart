Part of #140 — Capitol Hill Climb reflecting pool, **round 3**: make it unmistakably THE Washington DC Reflecting Pool.

Roger on round 2 (PR #129): the algae pool *"is not recognizable as the Washington DC reflecting pool… search online for actual photos of it and redesign this so that is clear what's going on. The carts should probably race right along the edge so they can see them better as well."*

## Research — the real pool

Photos and references studied (Wikipedia's Lincoln Memorial Reflecting Pool article and its photo set; the ihitthebutton.com photo essay; Alamy's National Mall photo descriptions):

- **2,028 ft (618 m) long × 167 ft (51 m) wide — a ~12:1 rectangle**, shallow (18–30 in), built 1922–23 to Henry Bacon's design.
- It sits **on the Mall axis**: the Lincoln Memorial anchors the west end, the **Washington Monument closes the vista at the east end** and mirrors in the water.
- **Granite coping/edging** and gravel walks run along **both long sides**, with **double rows of elm trees** behind them; squared, formal ends — a basin, not a pond.
- The water is a mirror first: what makes it read in every photo is the hard pale rectangle, the tree walls, and the monument on the axis.

Mario Kart reference: `mkw-water.jpg` (MK World river run) + the fleet's ANALYSIS.md pattern 2 — water works when the course runs right against a continuous hard edge (there, a stone embankment) that guides the eye forward.

## Why round 2 didn't read (diagnosis)

1. **Shape**: 32 × 150 m = 4.7:1 — a pond, not the 12:1 basin.
2. **Distance**: the water sat ~13 m from the asphalt behind a grass apron. Root cause found in the engine: the terrain conform (`src/track/track.js`) blends a track's terrain function toward the road plane over **16 m** past the shoulder, so no matter where `POOL` was drawn, the waterline emerged ~13–14 m out and the basin floor sloped like a beach.
3. **No rim, no rows**: no coping edge to outline the rectangle, pink cherries scattered on the far bank instead of elm rows, and the water (roughness 0.12, envMapIntensity 1.3) mirrors the peach sky at driver height, so against a lawn-green basin floor it read as a pale apron with green blobs.

## The redesign (2 files: `src/tracks/capitol-hill.js`, `src/models/props-capitol-hill.js`)

- **Basin**: `POOL` is now **172 × 24 m (7.2:1)**, `x 167–191, z 56–228`, squared ends, long axis parallel to the run with the obelisk bend closing the view down its length.
- **Right along the edge**: the pool run's left `sides[]` entry gains the engine's per-side **`blend: 2`** opt-in, so the conform releases 2 m past the shoulder instead of 16 m. Measured from the built track (probe over the heightfield): the waterline now runs at x ≈ 169–172 against an asphalt edge of x ≈ 160–165 — **the water starts a few metres past the shoulder for the whole 172 m run**, and the basin floor (−1.4 m) is reached by x ≈ 171–175. The spline itself is untouched.
- **Coping**: new `poolBasin()` prop — a pale granite **coping frame** (3.2 m wide, top 0.45 m above the water) ringing the waterline on all four sides, its centre lines offset to the *measured* waterlines (west rim ≈2 m inside the POOL rectangle, east rim ≈0.4 m outside it), plus a **dark basin liner** on the floor so the water reads murk green over near-black instead of over lawn.
- **Elm allées**: the far bank now carries **two rows of green elms** (the cherries moved off the pool; they remain all over the Climb), with a third, sparser row west of the road for the southern half of the run. Lamps and the balustrade re-line the far bank behind the coping, in promenade order: water → coping → lamps → balustrade → elms.
- **The gag stays** — as the second read on a recognisable pool: green water (round 2's `0x527a2c`), **64 algae mats** (two in five crowded to the driver's edge), scum strips just inside both copings, the three ducks (repositioned into the new basin), the big **“REFLECTING POOL — NOW WITH 100% MORE ALGAE”** board at the south end facing the approach, and the small “NO REFLECTING” sign now standing **in the west shallows at the closest pass** (z=150) instead of across the water.
- Untouched: everything else from PR #129 (ballroom crane/letters/hoarding, Bliss BSOD grandstand), the spline, width, boosts, coins, the Mall shortcut.

## Verification

- `node tools/sim.mjs --quick` — **exit 0, zero FAIL** (all tracks).
- Capitol targeted sim (6 races) is **digit-identical to the pristine-main baseline**: winner avg 126.2 s, lap avg 44.2 s, best 36.2 s, mini-turbos 58, rescues 0.3, wall hits 1, Mall cuts 49. The redesign changes no bot behaviour — the racing line, surfaces and shortcut are exactly as before; only the ground *beside* the road changed shape.
- Text-check (capitol): CLEANLINE
- Draw calls (full-track aerial, renderer.info): DRAWCALLS
- Captures below are race-height fly-camera frames (driver eye height on the racing line), before = current main, after = this branch, same positions.

## Screenshots

Before — the round-2 pond from the racing line (pale apron, no rim, water ~13 m away):
![before](https://raw.githubusercontent.com/OkGoDoIt/Billionaire-Kart/wip/capitol-pool3/screenshots/pr-capitol-pool3/pool-run-before.png)

After — the basin from the same spot: coping at the shoulder, elm rows on the far bank, obelisk closing the vista:
![after](https://raw.githubusercontent.com/OkGoDoIt/Billionaire-Kart/wip/capitol-pool3/screenshots/pr-capitol-pool3/pool-run-after.png)

The approach — the algae board at the basin's south end, rectangle running away to the obelisk bend:
![approach after](https://raw.githubusercontent.com/OkGoDoIt/Billionaire-Kart/wip/capitol-pool3/screenshots/pr-capitol-pool3/pool-approach-after.png)

Mid-run, closest pass — mats at the driver's edge, the small sign in the shallows:
![mid after](https://raw.githubusercontent.com/OkGoDoIt/Billionaire-Kart/wip/capitol-pool3/screenshots/pr-capitol-pool3/pool-mid-after.png)

Phone (844×390):
![phone after](https://raw.githubusercontent.com/OkGoDoIt/Billionaire-Kart/wip/capitol-pool3/screenshots/pr-capitol-pool3/pool-run-phone-after.png)

Aerial — the rectangle and its axis (before / after):
![aerial before](https://raw.githubusercontent.com/OkGoDoIt/Billionaire-Kart/wip/capitol-pool3/screenshots/pr-capitol-pool3/pool-aerial-before.png)
![aerial after](https://raw.githubusercontent.com/OkGoDoIt/Billionaire-Kart/wip/capitol-pool3/screenshots/pr-capitol-pool3/pool-aerial-after.png)

Base note: branched from main `dfb7325460` (the head when this work was dispatched). Main has since advanced (PRs #112/#131/#156/#157); none of those touch the Capitol files, and this PR's diff is exactly the two Capitol files plus screenshots, so it merges onto current main cleanly.
