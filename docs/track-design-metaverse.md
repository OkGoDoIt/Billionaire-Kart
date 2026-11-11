# Metaverse Plaza GP — Track Design

**Layout:** 1,627 m closed loop, 13 spline control points, 8 bends (all right —
the plaza is one long clockwise sweep around the Founder's head). The profile data
lives in `TRACK.elev` / `TRACK.bank` in `tracks/metaverse.js` as hand-authored
keyframes `[u, value]` (u = lap fraction), interpolated by the shared circular
monotone cubic — the machinery is shared system, the numbers below are the design.

## Reference frames (viewed, per Roger's standing rule)

- **`mkw-peach.jpg` (MK World neon city)** — the giant curved MARIOKART sign
  *building*: neon at architectural scale, and the whole street aimed at it.
  This is the scale benchmark for the Founder head and the plaza signage —
  our billboards were sized to be read as scenery, Nintendo's are sized to
  be *destinations*.
- **`mk8-coconutmall.jpg` (Coconut Mall)** — plaza density: storefronts and
  awnings unbroken on both sides, a hanging banner, and the fountain set
  piece sitting *in the middle of the driving space*, not at its edge.
- **Staging observation:** the reference frames always put the hero piece in
  the driver's face — but geometry checked honestly: on a convex loop the
  centre is *never* in the windscreen (the Founder head's closest approach
  to the forward axis is 51°, in the Esses at u 0.20). So the deck's staging
  is vertical, not frontal. Through the whole climb the head rides the
  inside shoulder at frame's edge — and the loading ramp (u 0.36–0.52) is
  placed so that as you rise it *stops shrinking away*: at plaza level it
  towers 40 m over you; at the crest (u 0.52–0.58) its eyes are at your
  eye level, 240 m across the inside of the bend, while the plaza floor
  and the far side of the loop drop 10 m below the deck edge. The reveal
  is parity with the monument, and it only reads because the climb is on
  the centre-facing arc — the same ramp on the outer straights would crest
  facing empty sky.

## The design problem (and the joke)

The Metaverse is a *flat virtual grid* — that flatness is the track's whole gag,
and bulldozing it into a mountain would kill the joke. So the verticality here is
authored to fit the fiction: **the only things that stick up in a half-finished
virtual world are the parts that haven't finished loading.** The plaza floor
itself stays flat. The lap's one big vertical move rides up a *loading ramp* —
bare extruded geometry — onto the plaza's second floor, which rendered in as an
empty slab (the **Sky Deck**), races its edge, and comes back down a *buffering
ramp*. You are not driving over terrain; you are driving over a progress bar.

## Elevation story

- **Sector 1 — The Plaza Floor (u 0.00–0.36), 0 → +2.5 m.** The rendered grid:
  dead flat past the greeters and the gantry. The eastern Esses get only a
  **pop-in swell** (+1.5 → +2.5 → +2.0 m) — the floor is still deciding what
  height it is, which keeps the Esses about line and drift, not altitude.
- **Sector 2 — The Loading Ramp & the Sky Deck (u 0.36–0.66), +2 → +10.5 m.**
  Past the real-vs-rendered tree gag (u 0.36) the course turns onto unfinished
  geometry and climbs steadily (≈3%): +5.5 m at the mid-climb item row (a boost
  there is worth real time uphill), deck level +10 m at u 0.52, and the **Sky
  Deck plateau at +10.5 m (u 0.58–0.64)** — the lap's high point, where the
  giant floating avatar head, which towers over the plaza floor, is suddenly
  *at eye level*. The deck's edge corner (u 0.642) is the postcard: the whole
  empty plaza spread out below, all 38 users of it.
- **Sector 3 — The Buffering Descent (u 0.66–1.00), +10.5 → 0 m.** The slab
  ends and the geometry buffers back down in steps: +7.0 at u 0.70, +3.5 at the
  u 0.78 item row, +1.0 by u 0.86, dead level from u 0.93 so the grid, gantry
  and greeter statues sit flat. The descent is long and gentle on purpose —
  this world loads slowly.

## Corner by corner

| # | Name | u (apex) | Dir / angle / min radius | Bank | Elev at apex | Intent |
|---|------|----------|--------------------------|------|--------------|--------|
| — | Spawn Kink | 0.081 | R 8°, 144 m | +3° | 0 m | Barely a bend — a light bank wakes the kart up on the flat grid |
| T1 | Esse Entry | 0.176 | R 57°, 55 m | +11° | +1.5 m | First real load, on the pop-in swell |
| T2 | Counter-Esse | 0.246 | L 36°, 71 m | −8° | +2.5 m | The lap's only left — bank flips sign through a level crossover (u 0.211) |
| T3 | Esse Exit | 0.312 | R 53°, 56 m | +11° | +2.0 m | Exit feeds the long western run toward the ramp |
| T4 | Loading Kink | 0.483 | R 5°, 157 m | +3° | +8.2 m | A breath on the climb — the view (plaza falling away) is the event |
| T5 | Sky Deck Edge | 0.642 | R 54°, 68 m | +9° | +10.5 m | The deck corner: banked along the slab edge at the lap's high point |
| T6 | Buffering Bend | 0.903 | R 20°, 121 m | +5° | +0.2 m | Gentle right on the flat run home |
| — | Grid Kink | 0.981 | R 6°, 160 m | 0° | 0 m | On the start line — unbanked by rule |

Start/finish guarantees: elevation is 0 and bank is 0 from u 0.93 through u 0.03 —
the grid, gantry, and the two greeter statues (u 0.985) sit on the flat.

## Banking rationale

Per-corner constants from radius and entry speed. Reference check with
`bankDeg = clamp(atan(v²·κ/g) × 0.55, ±28°)`: at kart speeds the formula saturates
at 28° on both Esses corners and asks 10–16° on the Sky Deck edge; authored values
take that ordering into a 3–11° band — this is a glossy plaza, not an anti-gravity
wall. Deliberate deviations: T4 (+3° vs a formula ~9° — a 157 m kink taken nearly
flat-out on a climb carries itself) and the Grid Kink (0° — the start rule wins).
Camera rolls at 0.7× the road roll; karts sit square on the surface.

## Set pieces on the racing line

- **The Founder (Rendered)** — the giant avatar head at the plaza centre; from
  the Sky Deck (u 0.52–0.66) you race *level with it*, the track's signature view.
- **Item rows** at u 0.10 / 0.27 / 0.44 / 0.61 / 0.78 / 0.93 — u 0.44 is mid-climb
  (a boost uphill is a genuine decision), u 0.61 is on the deck itself.
- **Reality vs Rendered gag** at u 0.36 marks the exact point the finished world
  ends and the loading ramp begins.
- Dressing note: all lap-anchored dressing (signs, statues, the gag) now grounds
  itself through `terrainHeightAt` (shared `atLap`/`anchorGroup` + scatter
  heights), so props beside the ramp and deck sit on the blended terrain the
  ground mesh actually draws.

## Design audit (Mario Kart research criteria)

- **Cadence:** 23 decision events (bends + elevation inflections + item rows +
  signs + set pieces). Worst gap 130 m ≈ **3.3 s at 40 m/s** (start straight) —
  inside the 3–5 s cadence, no gap over 6 s.
- **Undulation:** elevation range **10.5 m** (0 → +10.5), ≈11 m climbed and
  descended per lap — inside the 8–15 m target.
- **Banking:** authored 3–11°, formula-checked above; 0° on the start straight.
- **Road width:** 22 units ≈ 7–8 kart widths — unchanged.
- **Landmark:** the Founder head — visible from everywhere, and the Sky Deck
  sector is designed around reaching its eye level.
- **Shortcut verdict: NONE — deliberately.** The closest non-adjacent approach
  on the loop is 131 m (u 0.122 ↔ 0.211, across the Esses infield), and karts
  are corridor-clamped to 16 m of the centreline. A cut would need ~120 m of
  new causeway across the plaza — a different track. This lap's time is won on
  the climb and the deck, not a cut.
- **Slope physics:** grade feeds top speed at ±8% (factor 1.6 × grade, capped) —
  the loading ramp costs, the buffering descent pays, neither dominates.
