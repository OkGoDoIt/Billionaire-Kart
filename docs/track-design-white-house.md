# White House GP — Track Design

**Layout:** 1,383 m closed loop, 15 spline control points. A National Mall
rectangle with manners: the north straight runs the White House fence line,
the south straight fronts the Reflecting Pool, the west end wraps a hairpin
around the Washington Monument, and the east end passes the Ballroom
construction zone. The profile data lives in `tracks/whitehouse.js`
(`def.elev` / `def.bank`) as hand-authored keyframes `[u, value]`
(u = lap fraction), interpolated by the shared circular monotone cubic —
the machinery is shared system, the numbers below are the design.

## Elevation story

**Ceremonial flat, with two designed exceptions.** Most tracks earn their
interest from altitude; this one earns it from *restraint*. Both Mall
straights stay at exactly 0.00 m — not "nearly flat", flat — because the
set pieces that define the track (the iron fence line, the press-pool
cameras, the Reflecting Pool and its ducks, the Monument plaza) are
grade-level architecture, and a fence line on a slope stops being a line.
The lap's verticality is spent in exactly two places:

- **Exception 1 — The Monument Bowl (u 0.32–0.60), 0 → −3.5 → 0 m.** The
  west end of the course *sinks*. Out of the north straight the road falls
  through the NW Descent (−1.2 m), the Hairpin Approach (−2.4 m) and
  bottoms at the **Monument Hairpin apex, u 0.494, −3.5 m — the only
  below-grade tarmac in the batch** — then climbs back to Mall level by
  u 0.60. The Monument itself stays at grade on its plaza, 52 m inside
  the road: sinking the road is what makes a 34 m obelisk *tower*. You
  brake downhill into its shadow and climb out past the flag ring.
- **Exception 2 — The Ballroom Ramp (u 0.84–0.995), 0 → +4.5 → 0 m.** The
  east end does the opposite: a construction ramp climbs the east rise —
  +1.8 m at u 0.885, cresting at **+4.5 m inside the Ballroom Climb Bend
  (u 0.93)** beside the half-built ballroom (gold scaffolding, cranes,
  "EAST WING (DEMOLISHED) →") — then steps down past the zone (+2.0 m at
  u 0.96) and plunges back to a dead-level start/finish. It is the only
  place on the lap where you look *down* on a set piece: the whole
  construction site spreads below the crest.
- **Everything else is 0.00.** The south straight and the SE kink complex
  run at Mall level (u 0.60–0.84), and the start, grid, gantry and
  gold-rope VIP stand sit on the flat (u 0.995 through u 0.30).

Total range is −3.5 → +4.5 = **8 m** — the bottom of the 8–15 m target,
hit exactly, on purpose: this is the batch's calm ceremonial lap, and its
two exceptions read *because* the rest is flat.

## Corner by corner

| # | Name | u (apex) | Dir / angle / min radius | Bank | Elev at apex | Intent |
|---|------|----------|--------------------------|------|--------------|--------|
| T1 | Start Turn | 0.997 | L ~134°, 27 m | −5° | 0 m | The line sits inside the turn-in — bank kept to 5° by the start rule (see below), the tightest radius on the lap gets feel, not wall |
| T2 | NW Descent | 0.350 | L, 110 m | −6° | −0.9 m | The bowl's doorway: a broad left that is already falling |
| T3 | Hairpin Approach | 0.420 | L, 64 m | −9° | −2.4 m | Downhill braking, bank building — "HAIRPIN OF DEMOCRACY, BRAKE FOR FREEDOM" |
| T4 | Monument Hairpin | 0.494 | L, 49 m | −11° | −3.5 m | The bowl's bottom and the lap's signature corner: max bank, below grade, the Monument overhead |
| T5 | SE Kink Right | 0.784 | R, 30 m | +13° | 0 m | At Mall level: a sudden tight right out of the pool straight's calm |
| T6 | SE Kink Left | 0.820 | L, 35 m | −12° | 0 m | The S completes — crossover at u 0.802, the road rolls visibly between the two |
| T7 | East Rise | 0.880 | L, 68 m | −8° | +1.6 m | First corner of the ramp — bank and grade arrive together |
| T8 | Ballroom Climb Bend | 0.929 | L, 50 m | −10° | +4.4 m | The crest corner: apex at the lap's high point, the construction site below-right |

Start/finish guarantees: elevation is 0 from u 0.995 through u 0.30 (the
entire start sector *and* north straight) and banking is 0 from u 0.95
through u 0.30 except T1's authored −5° at u 0.998 — the grid rows behind
the line sit on the bank's shoulder, the same documented compromise as
Mars' T0 and Datacenter's T1. The NE kink at u 0.972 (122 m radius) is
deliberately authored 0 bank: it is a sweeper on the ramp's descent, and
banking it would fight the plunge.

## Banking rationale

Per-corner constants, smoothed over ±4 samples, with explicit crossovers
at u 0.802 (the SE S) and flat 0° keyframes pinning both straights.
Reference check with `bankDeg = clamp(atan(v²·κ/g) × 0.55, ±28°)`: the
formula saturates at 28° on T1 (27 m), T5 (30 m) and T6 (35 m); the
authored values (−5°, +13°, −12°) take the ordering into the usual visual
band, with T1 deliberately the flattest of the three — the start rule
beats the formula at the line, as on every track in this game. The bowl
corners stack bank *and* negative grade (T4: −11° at −3.5 m), which is
where the ±8% slope physics makes downhill braking honest.

## Reference frames

Studied in `~/workspace/research_notes/mk-reference/` before authoring:
**mk8-farm.jpg** and **mk8-rainbow.jpg** (both primary, for different
halves of the lap).

- In mk8-farm.jpg the wooden fence runs *unbroken and level* along both
  sides of the dirt road for the whole visible lap, and the hero cluster
  (barn, windmill, silo) is what the road aims at. White House's fence
  grammar is identical — the black iron fence along the north straight,
  the flag ring at the Monument, the gold-rope VIP line at the start —
  and fence lines are exactly what slopes break. That is the design
  argument for the ceremonial flat: both straights stay at 0.00 so every
  fence, pool rim and rope line reads as one unbroken drawn line, the
  way the farm frame's fences do. The elevation is spent where there is
  no fence to break: the open west bowl and the construction east.
- In mk8-rainbow.jpg the start is a *ceremony*: a hero arch spanning a
  dead-level straight, star-post rails continuous on both edges, the
  road itself painted. White House's start/finish is kept at grade for
  the same reason — the gantry banner and the gold-rope VIP stand read
  level — and the Ballroom Ramp is placed as the *approach* to that
  ceremony: you crest at the Ballroom Climb Bend, then plunge the last
  90 m down to the arch, arriving at the line downhill with the whole
  Mall straightening out in front of you. (Painted chevrons and an
  arch-scale hero sign are art-pass work; the elevation's job is to
  deliver the kart to the arch at speed, on the level.)
- The Monument reveal inverts the usual crest trick: instead of raising
  the road to reveal a set piece, the road *drops* 3.5 m so the piece
  (34 m of obelisk, already the biggest prop on the track) is revealed
  by towering — the farm frame's barn-cluster dominance, achieved with
  negative altitude.

## Set pieces on the racing line

- **The White House** inside the north straight (u ≈ 0.156) — met at
  grade, behind its fence, exactly as the press pool sees it.
- **The Washington Monument** inside the west hairpin — the lap's
  landmark; navigate by it: if the obelisk is on your right and
  *above* you, you are in the bowl.
- **The Reflecting Pool** inside the south straight (u ≈ 0.691) — Mall
  level, algae and all; the ducks are unbothered by racing.
- **The Ballroom construction zone** outside the NE curve (u ≈ 0.970) —
  the only set piece you look down on, from the ramp crest at u 0.93.
- **Item rows** at u 0.10 / 0.27 / 0.44 / 0.61 / 0.78 / 0.93 — u 0.44
  sits on the Hairpin Approach (a boost downhill into the bowl is a
  commitment), u 0.93 sits *on the ramp crest* (a boost there launches
  the plunge to the line).

## Design audit (Mario Kart research criteria)

- **Cadence:** 8 corners + 6 item rows, with the two elevation exceptions
  doubling as events (bowl bottom = T4's apex, ramp crest = T8's apex).
  Worst gap 241 m ≈ **5.9 s at 40 m/s** (item row u 0.61 → SE Kink Right)
  across the Reflecting Pool straight — inside the 6 s cap, and
  deliberately the calmest stretch in the batch: the pool straight is
  the breath before the kink and the ramp.
- **Undulation:** elevation range **8 m** (−3.5 → +4.5), ≈8.0 m climbed
  and descended per lap — the bottom of the 8–15 m target, by design
  (see Elevation story).
- **Banking:** authored 5–13°, formula-checked above; 0° on both
  straights.
- **Road width:** 22 units ≈ 7–8 kart widths — unchanged.
- **Landmark:** the Washington Monument (above).
- **Shortcut verdict: NONE — and the hairpin asked nicely.** The west
  hairpin begs for a cut across the Monument plaza, but the arms'
  closest non-adjacent approach is 135.4 m (u 0.407 ↔ 0.527), and karts
  are corridor-clamped to 16 m of the centreline. Cutting it would mean
  driving a presidential memorial lawn for 120 m — the Secret Service
  (and the 0.55× deep-offroad factor) decline. The lap's time is won on
  the bowl exit and the ramp plunge.
- **Slope physics:** grade feeds top speed at ±8% (factor 1.6 × grade,
  capped) — the bowl descent runs ≈2–3%, the ramp climb ≈3%, and the
  final plunge ≈5–6.5%: the fastest-feeling 90 m on the lap, aimed at
  the finish line.
- **Scenery siting:** the hairpin sign — the one dressing piece inside
  the bowl's slope — now stands on `terrainHeightAt`; everything on the
  straights was already at grade and is untouched by the profile, which
  is precisely why the straights were kept flat.
