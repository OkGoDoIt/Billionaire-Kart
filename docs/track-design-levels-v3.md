# Level design v3 — splits, height, crossovers (proposal)

**Status: PROPOSAL for Roger + the lead to approve piece by piece. No geometry
in this document is built yet. The pilot in §5 is specified to buildable depth;
everything else is a menu.**

Roger's directive (Nov 12, 2026): *"We need to generally do a better job with
level design. These levels need to be more interesting — there needs to be
splits and alternate paths, and a lot more height variation and maybe loops
and crossing over paths in interesting ways. The actual racetracks feel pretty
boring the way they are."*

The repo's own research already prescribes exactly this
(`docs/research/mk-reception-and-design.md`): **"Put two to four real route
decisions in each lap. Include at least one shortcut that needs a boost item
or a precise line, and one split where the better choice depends on what you
hold"** (rec. 10), and **"Flat, wide, gently curving roads are exactly what
reviewers and players found dull"** (rec. 11). Measured against that standard,
the shipping game has **zero paved splits, route choices on 3 of 8 main
tracks, and no crossover except one** (§1). This doc audits what the engine
can actually do, then proposes the fixes in order of payoff per unit of risk.

---

## 1. The audit (all measurements on main `e7d249a4`, headless probes + sim)

### 1.1 Shortcuts: how they work, and whether one can be a ROUTE

Mechanism (`src/race/ai.js`): `def.shortcuts[]` entries are
`{from, to, path: [[x, z], …], skill?, chance?, boost?, when?, name?}` where
from/to are control-point indices (`trackShortcuts`, ai.js:19–29). The path is
an **XZ-only polyline** — it carries no height of its own; a kart on a cut is
grounded by the terrain/road surface under it. AI decides once per shortcut
per lap, only within 160 m before the entry (ai.js:94), gated by driver skill,
the difficulty level's `cuts` chance (easy: never), speed > 55% of top speed,
not hit/airborne, optionally a boost in hand (`boost: true`) or a race-state
predicate (`when`). Following is pure-pursuit along the polyline
(`_cutFollow`, ai.js:117–153) and **gives up if the kart strays > 25 m from
the path or after `3 + pathLength/9` seconds** (ai.js:134). Players take cuts
geometrically — the authoring guide's pattern: raise `outer` on both legs so
the drivable areas overlap, `hoarding: false`. Progress is safe by
construction: rank progress is `lap * L + s` with `s` the nearest spline
sample (race.js `_rank`, kart.js `_progress`), quarter-sector checkpoints
guard lap counting, and rescue respawns on the spline (`lastSafeI` only
updates on-road) — so a cut can never gain phantom progress, and bailing out
of one costs the respawn back to the main line. PR #127's "shortcut rivals"
are this same machinery: AI rivals with the skill/chance roll take the cut and
it is counted in `k.stats.shortcuts` (ai.js:109); the sim prints the count.

Measured inventory (probe over all 12 in-scope track defs):

| track | lap m | y-span m | max grade | AI shortcuts | closest strand approach |
|---|---|---|---|---|---|
| bliss-hills | 1,287 | 24.5 | 26% | meadow (16% of lap) | 67.8 m |
| burning-circuit | 1,334 | 15.9 | 10% | — | 50.7 m |
| capitol-hill | 1,362 | 19.7 | 8% | the Mall (18%) | 48.3 m |
| crypto-cove | 1,275 | 16.2 | 9% | — | 103.4 m |
| datacenter-dash | 1,613 | 14.7 | 10% | lake bed (21%, final lap only) | 67.9 m |
| mars-colony | 1,429 | 18.1 | 8% | — | 77.4 m |
| silicon-valley | 1,119 | 15.9 | 8% | — | 83.5 m |
| singularity-speedway | 1,521 | 31.6 | 16% | — | **0.7 m (Δy 20.1 m, bridge)** |
| davos (PR #131) | 1,102 | 31.9 | 26% | — | 109.5 m |
| boring-tunnel (PR #124) | 1,153 | 8.3 | 4% | — (deliberate) | 109.2 m |
| international-waters (PR #112) | 1,357 | 8.0 | 5% | — | 118.7 m |
| wework-memorial (design) | 1,359 | 2 floors + mezz | ≤10% | n/a | **plan crossing, 3.42 m clear** |

The three existing cuts are all single-file **offroad** corner/section cuts:
Bliss meadow 108 m path vs 210 m of road, Capitol Mall 98 vs 240 m,
Datacenter lake bed 186 vs 333 m (and `when`-gated to the final lap, when the
lake has drained). Offroad surface runs ~58% of road speed unboosted, so an
unboosted cut is roughly break-even and a boosted cut wins — the classic
earned cut, and the guide's timing method balances it. Burning, Crypto and
Singularity have geometry cuts mentioned in their own comments but **no
`shortcuts[]` entry, so the AI never uses them** and most players never find
them. **No track has a paved alternate route.**

**Can a shortcut be a full alternate ROUTE?** Partly — and the limit is
structural. A route that diverges from the spline has no ribbon of its own:
`ground()` resolves exactly one spline, so off-spline ground is terrain with
the track's single `offroad` surface. A long "route" built this way pays the
~42% offroad speed tax for its whole length, which no plausible distance
saving repays beyond ~a fifth of a lap; the AI's give-up clock
(`3 + len/9` s ≈ the path at 9 m/s) also assumes cut-length scales. What
works **today**, with zero engine change:

1. **Island split (on-ribbon).** Widen one section (widths are per-point,
   asymmetric `wl`/`wr` supported) and put a solid island in the middle —
   both sides are the same full-speed road; they differ in length, corners,
   items and hazards. This is a true route CHOICE, and it is how Mario Kart
   World's wide surfaces read (see the river frame in §6: the field spreads
   around rocks on one wide surface).
2. **Earned offroad cut (existing pattern).** Distance-for-speed, boost-gated,
   ≤ ~20% of the lap. Proven and balanced by the guide's method.
3. **The spline itself as one branch.** Where the spline goes over a bridge
   or through a tunnel, an offroad/shortcut line underneath/beside it is a
   grade-separated split (Datacenter's lake bed under the causeway is the
   shape of it).

A true **two-ribbon split** (two paved branches, each with its own width,
edges and surface) needs an engine feature — costed in §6 as *branch ribbons*.
Until then, patterns 1–3 cover every proposal in this doc.

### 1.2 Crossovers: proven twice, ready to be routine

The engine was built for this. `ground()`'s own contract says its height
argument is "used to pick the right level where the track crosses over
itself"; `nearest()` weights distance as XZ² + 4·Δy² with a ±14-sample hint
window (~21 m); bridge-marked samples are excluded from terrain conform
("bridges do not pull the terrain up"); `def.bridges [{from, to}]` marks the
upper section; kart–kart collisions ignore pairs with |Δy| > 1.4 m and
obstacles |Δy| > 2.2 m, so stacked levels are collision-isolated.

It already ships: **Singularity Speedway is a 720° descending spiral** —
control points 6–18 drop y 48 → 18 at −10° bank, the whole track is
bridge-marked (`bridges: [{from: 0, to: 51}]`), and the probe measures its
stacked strands at **0.7 m plan offset with 20.1 m of vertical separation**.
It sims clean (4 races: all finish, rescues 0.3/race, lap 44.7 s).

To test whether WeWork-scale clearance works, the audit re-ran Singularity
with its y-profile compressed so each spiral turn clears the next by only
**3.5 m** (the WeWork mezzanine assumes 3.42 m over the Atrium Return lane):
**4/4 races finish, rescues 0.8/race, lap 44.6 s — statistically the stock
track.** A centreline `ground()` walk agrees: at 3.5 m/turn the only
deviations are the track's designed gap and one crest region (≤ ~1.6 m),
i.e. no strand confusion. The condition that makes it safe is visible in the
machinery: the two strands at a crossing must be **far apart in arc length**
(the ±14-sample hint window must never span both) — in a spiral they are a
full turn (~140 samples) apart; at WeWork's perpendicular crossing ~600 m
apart. The dangerous case is two strands running close and *parallel* in plan
*and* near each other in arc length.

**Verdict:** crossovers are a routine design tool **now**. Rules: mark the
upper section in `bridges`; keep ≥ 9 m clearance outdoors (authoring guide
line 68 — it's a readability/camera rule, not an engine limit; the engine
evidence supports ~3.5 m indoors where the WeWork checklist will verify it in
the real build); keep crossing strands far apart in `s`; give the upper deck
walls so a kart can't fall onto the lower road (re-attach never targets
bridge samples anyway, kart.js:331).

### 1.3 Height variation: what's cheap, what's expensive

The y-profile is authored per control point on a 3D Catmull-Rom spline;
per-sample frames are built in `src/track/track.js` (`_sample`). Measured
reality vs the guide's "keep grades under about 10%": Davos ships 26%
pitches, Bliss 26%, Singularity 16% — the guideline is soft. Y-spans run
15–32 m but are spent on climbs; sustained drops, crests and air are rarer
than the spans suggest.

- **Cheap (authoring only):** big drops and climbs (just move y), crests that
  give air (Davos's crest, Bliss's three air crests, SV's ramp at cp 7.25),
  gap jumps (Waters' barge jump; `gaps` sets bridge=1 and void ground),
  ramps (`_rampHeight` lift at (s, lat), arms tricks), and **banked
  descents**: authored per-point `bank` is unbounded (only the *automatic*
  bank is capped by `def.maxBank`, default 13°). A bank sweep on a test
  circle shows the frame solve degrading smoothly — plane-solve determinant
  0.999 at 0°, 0.957 at 20°, 0.799 at 40°, **0.616 at 55°**, 0.391 at 70°,
  0.140 at 85° — so a steep-bank **wall-ride arc up to ~55° is buildable
  today** (Mario Kart World literally added Wall Ride as its verticality
  mechanic; `docs/research/mk-mechanics.md` §10).
- **Expensive:** anything that pitches the *frame* itself — see loops, §1.4.

### 1.4 Loops: the honest test — a true loop-the-loop FAILS

Prototype (scratch only, never shipped): an R=9 m vertical loop inserted in a
straight, width 14, walled, built exactly the way tracks are authored.
Evidence, three independent layers:

- **Build geometry.** The sampler builds the left vector **horizontal-only**
  (`Lx = Tz, Lz = −Tx`, track.js:123) and rotates it by bank. As the tangent
  approaches vertical the horizontal left vector degenerates: **min
  plane-solve |det| = 0.008** (a healthy track: ~1.0), **18 samples with a
  near-vertical tangent**, and **adjacent-sample yaw steps of 180°** (yaw and
  curvature are ground-plane quantities, track.js `_sample`). At R=14 m it is
  no better: |det| 0.016, 29 near-vertical samples, yaw still flips 180°.
- **Ground queries.** Walking the centreline with `ground()` (hint + height
  chained, as a kart queries): **35–40 bad samples** with errors up to
  **271 m** at lat 0 and **933 m** at lat +4 (the lateral solve divides by the
  degenerate determinant, so off-centre error explodes).
- **Full sim** (`tools/sim.mjs`, 2 races): races technically "finish" only
  because rescue keeps teleporting karts forward — **rescues 20.5/race**
  (guide budget: < 2), **wall hits 158/race**, **field spread 191.8 s**
  (budget < 20 s), lap avg 81.5 s on a 715 m lap whose best lap was 24.3 s.

The failure is in track *frame construction*, not kart physics. Enabling a
true loop means replacing the horizontal-reference frame with
parallel-transport frames, a full 3D ground solve, pitch-aware progress/AI
(yaw is meaningless upside-down), kart visual pitch beyond its ±0.6 rad clamp,
and a roll-following camera (the chase cam is yaw + world-up). That is an
engine project with regression risk to all 12 tracks — **not recommended
now**; it is listed in §6 for completeness. The nearest substitutes, all
buildable today: the **overpass spiral** (Singularity pattern), a **~55°
banked wall-ride arc**, the **Boring Tunnel pattern** (a loop as set dressing
you drift *through* — PR #124 already ships this), and **drop + gap-jump
sequences** for the vertical thrill.

### 1.5 Proving a split is balanced (method, applies to every proposal)

Per the authoring guide's shortcut method, extended to splits: time a lone
rival through the stretch on each route — for a cut: road vs cut vs
cut+boost; for a split: each side with a scripted line (two throwaway def
variants with the island shifted to force each side, or an s-gate timing
harness over AI races — the probe pattern used in this audit). Targets:

- **Split sides within ~0.3 s of each other** over the stretch; the faster
  side must carry the risk (narrower, a hazard, no item row), the slower side
  carries the reward (item row, coins, boost pad) — so the better choice
  depends on what you hold and where you run, per research rec. 10 and the
  Bone-Dry Dunes case study's four path decisions per lap
  (`mk-reception-and-design.md`, "Shortcuts with risk and reward").
- **Cuts:** lose ≥ ~0.5 s unboosted, gain ~0.5–1.5 s boosted (guide method).
- **Whole-track gates stay green:** sim no FAIL, rescues < 2/race, spread
  < 20 s, mini-turbos > 0, contact sheet shows the choice being taken.

---

## 2. The v3 track standard (principles)

1. **Two to four 
...[truncated 9113 chars]