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

*(Sections beyond this point were truncated in the original PR #137 file
and reconstructed from issue #135 on Nov 13, 2026.)*

1. **Two to four route decisions per lap.** Every lap offers the driver
   two to four real choices — an island split, an earned cut, a
   grade-separated line — spread across the lap rather than stacked in
   one sector. This is the repo research's own prescription (rec. 10,
   quoted in the introduction), and it is the standard the pilot in §5
   was specced against.
2. **One signature vertical moment per lap.** A drop, a crest with air,
   a wall-ride arc, an overpass — one moment per lap where the track
   leaves the flat and the driver feels it. §4 lists the machinery that
   delivers this today.
3. **A crossover where the plan allows.** Crossovers are proven and
   routine (§1.2): mark the upper section in `bridges`, keep ≥ 9 m
   clearance outdoors (a readability rule, not an engine limit), and
   keep the crossing strands far apart in arc length.
4. **Height spent on drops and air, not only climbs.** Current tracks
   spend their 15–32 m y-spans on climbs; sustained drops, crests and
   air are rarer than the spans suggest (§1.3). Authored y and bank are
   cheap — spend them on the way down as well as up.
5. **Every choice balanced by the §1.5 method before it ships.** Split
   sides within ~0.3 s of each other over the stretch, the faster side
   carrying the risk and the slower side the reward; cuts lose
   ≥ ~0.5 s unboosted and gain ~0.5–1.5 s boosted; whole-track gates
   stay green (sim no FAIL, rescues < 2/race, spread < 20 s,
   mini-turbos > 0).
6. **Nothing that pitches the frame.** Loops and other frame-pitching
   elements are excluded until the engine work in §6 is done — the
   §1.4 test fails decisively, and the substitutes in §4 deliver the
   same thrill today.

## 3. Per-track opportunities

The audit's menu, per track. Current state is §1.1's measured
inventory; the opportunity named for each track is the cheapest step
toward the §2 standard that the audit's evidence supports.

| track | today (measured, §1.1) | opportunity |
|---|---|---|
| silicon-valley | 1,119 m; no shortcuts, no crossover — zero route decisions | **The pilot (§5)** — the game's opener gets the full treatment first |
| burning-circuit | geometry cut exists but no `shortcuts[]` entry, so the AI never uses it | Formalize the existing cut as an earned `shortcuts[]` entry |
| crypto-cove | geometry cut exists but no `shortcuts[]` entry, so the AI never uses it | Formalize the existing cut as an earned `shortcuts[]` entry |
| wework-memorial | plan crossing at 3.42 m clearance, two floors + mezzanine | Already compliant with the standard — no work proposed |
| singularity-speedway | ships the 720° spiral stack (0.7 m plan offset, Δy 20.1 m, bridge-marked) | Left alone — it is already the crossover exemplar; the §1.2 evidence comes from it |
| boring-tunnel | no shortcuts, deliberately; ships the drift-through ring | Honestly left alone — the ring is its vertical moment (§1.4) |
| bliss-hills | meadow cut (16% of lap); 24.5 m y-span, 26% pitches, three air crests | Already carries an earned cut and spends its span vertically — no specific proposal in the audit |
| capitol-hill | the Mall cut (18% of lap) | Already carries an earned cut — no specific proposal in the audit |
| datacenter-dash | lake bed cut (21% of lap, final lap only, under the causeway) | Already carries an earned, grade-separated cut — no specific proposal in the audit |
| davos | 31.9 m y-span, 26% pitches, crest air | The vertical exemplar of §1.3 — no specific proposal in the audit |
| international-waters | barge gap jump (§1.3) | No specific proposal in the audit |
| mars-colony | 1,429 m; 18.1 m y-span; no shortcuts | No specific proposal in the audit |

## 4. Vertical machinery: what a track can use today

The proven devices, all authoring-only, drawn from the §1.2–§1.4
verdicts:

- **Overpass spiral** (Singularity pattern): a bridge-marked spiral
  whose strands sit far apart in arc length; clearances are proven
  from the shipped 20.1 m separation down to the audit's compressed
  3.5 m stress test (§1.2). Give the upper deck walls so a kart can't
  fall onto the lower road.
- **Wall-ride arc**: authored per-point `bank` is unbounded (only the
  automatic bank is capped), and the frame solve stays healthy —
  plane-solve determinant 0.616 — to ~55° of bank (§1.3).
- **Drift-through ring** (Boring Tunnel pattern, PR #124): a loop as
  set dressing the road drifts *through* — the vertical thrill
  without pitching the frame.
- **Drops, crests and gap jumps**: big authored drops and climbs,
  crests that give air (Davos's crest, Bliss's three), gap jumps
  (Waters' barge jump; `gaps` sets bridge=1 and void ground), and
  ramps (`_rampHeight` lift, which arms tricks) (§1.3).

## 5. The pilot: Silicon Valley Circuit (original spec)

> **Supersession note (Nov 13, 2026):** the parking-garage helix at
> the centre of this spec was **rejected by Roger**: *"I don't like
> the parking garage idea, let's try to figure out how we could
> actually drive on the Golden Gate Bridge or incorporate some part
> of the Stanford campus or Sandhill Road or something like that. We
> can do better."* The pilot is superseded by
> `docs/track-design-sv-pilot-v2.md` (PR #176), which rebuilds the
> signature moment around real geography — the Golden Gate deck
> crossing (#168), a Stanford campus section, and/or a Sand Hill Road
> section — and retains the Founder's Fountain island split and the
> two boost-gated grass cuts specified below. The original §5 is kept
> under this note as history. **Do not build from it.**

The pilot takes the game's opener from zero route decisions to four,
using proven machinery only:

1. **Garage-helix crossover.** A parking-garage helix (centre
   (−128, 30), r 24) rising 3.0 → 12.5 m and crossing 9.5 m over its
   own entry lane — the Singularity pattern (§1.2), the upper section
   marked in `bridges` and walled.
2. **Founder's Fountain island split** on the home straight — the
   §1.1 pattern: widen the ribbon, solid island in the middle, both
   sides full-speed road, differing in length, items and hazards.
3. **The two existing grass cuts formalized** as boost-gated
   `shortcuts[]` entries, so the AI takes them and they are balanced
   by the guide's method rather than found by accident.

Balance targets (§1.5): split sides ≤ 0.3 s apart over the stretch;
cuts lose ≥ ~0.5 s unboosted and gain ~0.5–1.5 s boosted; whole-track
gates stay green (sim no FAIL, rescues < 2/race, spread < 20 s,
mini-turbos > 0).

## 6. Engine work, costed and deferred

Two capabilities sit beyond authoring. Both are recorded here for
completeness; nothing in §§2–5 waits on either.

- **Branch ribbons** (a true two-ribbon split). Today `ground()`
  resolves exactly one spline, so anything off the spline is terrain
  with the track's single `offroad` surface (§1.1). Two paved
  branches, each with its own width, edges and surface, merging with
  correct progress, ground and AI behaviour across the split, is an
  engine feature. Deferred: the island split, the earned cut and the
  spline-as-branch patterns (§1.1) cover every proposal in this doc.
- **Loops.** Enabling a true loop means replacing the
  horizontal-reference frame with parallel-transport frames, a full
  3D ground solve, pitch-aware progress/AI (yaw is meaningless
  upside-down), kart visual pitch beyond its ±0.6 rad clamp, and a
  roll-following camera (§1.4) — an engine project with regression
  risk to all 12 tracks. Not recommended now; §4's substitutes
  deliver the vertical thrill without it.

The reference frame cited in §1.1 lives here as well: Mario Kart
World's wide river surface — the field spreading around rocks on one
wide surface — is the island split's grammar (restated in
`docs/track-design-sv-pilot-v2.md` §7).
