# International Waters GP — Track Design

**Layout:** 1,430 m closed loop, 12 spline control points, one continuous
right-hand harbour oval — no left turns anywhere. Broad sweepers (radii
114–390 m) around a turquoise sea, with three named elbows where the oval
tightens. The profile data lives in `tracks/waters.js` (`def.elev` /
`def.bank`) as hand-authored keyframes `[u, value]` (u = lap fraction),
interpolated by the shared circular monotone cubic — the machinery is shared
system, the numbers below are the design.

## Elevation story

A boardwalk causeway that leaves the water, climbs to a harbour deck, and
rolls home over swells: **sea level at the start, +8 m at the harbour crest.**

- **Sector 1 — Harbour Flat & Boardwalk Rise (u 0.00–0.24), 0 → +3 m.** The
  grid and the north sweep sit at sea level (flat from u 0.97 through
  u 0.04) beside the start-line buoy sign. The rise begins almost politely
  — +1 m by the first item row, +2 by the North Sweep — so the causeway
  reads as a boardwalk ramp, not a hill.
- **Sector 2 — The Harbour Climb (u 0.24–0.36), +3 → +8 m.** The lap's one
  real climb, up the east side past Ellison's S.S. HOSTILE TAKEOVER
  (anchored outside at u 0.30). It tops out at the **Harbour Crest,
  u 0.36, +8 m — the lap's high point** — where the whole oval, the
  seastead platform inside the west, and both duelling yachts fall into
  view below the road plane. The crest is placed on the *exit* of the
  Ellison Elbow so the reveal happens as the kart straightens up.
- **Sector 3 — The Swell Descent (u 0.36–0.585), +8 → +3.5 m.** Not a dive:
  a rolling descent over two authored swells — down to +5.2, back up over
  the **Flag Swell (u 0.52, +6 m**, under the REGISTERED IN flag sign),
  then down into the **Harbour Basin (u 0.585, +3.5 m)**, the sheltered
  low water of the lap. The swells exist for cadence as much as feel:
  without them the south side is one 400 m exhale.
- **Sector 4 — The Murdoch Rise & West Return (u 0.585–1.00), +3.5 → +5 →
  0 m.** A gentle second rise past Murdoch's slightly-shorter yacht
  (outside, u 0.68) cresting inside the Murdoch Elbow (u 0.692, +5 m),
  then the long settle home: West Elbow at +3.6, the EXIT: JURISDICTION
  SHOPPING sign at +2, and sea level by u 0.97 so the grid floats flat.

## Corner by corner

Waters has no hairpins; its corners are banked sweeper apexes. Bank is
positive everywhere (the oval turns right all the way around) and breathes
with the radii — tightest water gets the most lean.

| # | Name | u (apex) | Dir / min radius | Bank | Elev at apex | Intent |
|---|------|----------|------------------|------|--------------|--------|
| S1 | North Sweep | 0.10–0.20 | R, 125 m | +8° | +1.6 m | The rise's rhythm corner — bank arrives as the boardwalk leaves the water |
| S2 | Ellison Elbow | 0.283 | R, 114 m | +9° | +4.6 m | Tightest water on the lap, mid-climb; his yacht watches from outside |
| S3 | East Reach | 0.40 | R, ~250 m | +3° | +6.4 m | Nearly straight off the crest — a lean, not a corner; take the view |
| S4 | Flag Swell | 0.50 | R, ~390 m | +3° | +5.7 m | The broadest point of the oval, taken on the swell's back |
| S5 | Basin Bend | 0.60 | R, ~200 m | +4° | +3.7 m | Shelter water at the basin — the calm before the Murdoch Rise |
| S6 | Murdoch Elbow | 0.692 | R, 117 m | +8° | +5.0 m | Second elbow, on the rise's crest; his dishes track you all the way round |
| S7 | West Elbow | 0.778 | R, 118 m | +8° | +3.6 m | The last real corner — banked, descending, the seastead inside |
| S8 | NW Return | 0.90 | R, ~270 m | +2° | +1.0 m | The settle home; bank bleeds to 0 with the altitude |

Start/finish guarantees: elevation is 0 from u 0.97 through u 0.04 and
banking is 0 from u 0.96 through u 0.05 — the grid, the gantry and the
buoy sign all float on flat water.

## Banking rationale

Reference check with `bankDeg = clamp(atan(v²·κ/g) × 0.55, ±28°)`: Waters'
radii are so broad that the formula lands at 10–20° on the elbows
(R ≈ 115 m, v ≈ 35 m/s → ≈20°) and 5–10° on the reaches — the only track
in the batch where the formula does *not* saturate everywhere. The
authored band (2–9°) takes roughly half the formula at the elbows: a
boardwalk causeway leaning 20° would read as a velodrome wall and would
fight the bobbing-sea fiction; 8–9° is the lean you feel in your stomach
without leaving the harbour. Camera rolls at 0.7× road roll, as everywhere.

## Reference frames

Studied in `~/workspace/research_notes/mk-reference/` before authoring:
**mkw-water.jpg** (primary) and **mk8-farm.jpg** (supporting).

- In mkw-water.jpg the course is *contained*: a stone embankment wall runs
  unbroken along one side, lantern strings hang on cables over the road,
  and the far bank rises above the waterline course — the driver looks
  *along* a walled channel and *up* at the scenery bank. Waters' elevation
  serves the same geometry from the other side of the wall: the Harbour
  Climb lifts the causeway until the sea, the glitter field and both
  anchored yachts sit *below* the road plane, so from the u 0.36 crest
  the driver looks down the channel of the oval the way the river frame
  looks down its walled reach — and the seastead platform (inside west)
  becomes the "far bank" set piece, readable across the water.
- From mk8-farm.jpg: edge dressing is a *continuous line*, never isolated
  props. Waters' equivalent line is the channel-buoy ring — and buoys now
  ride `terrainHeightAt`, so the red/green line stays unbroken over the
  swells and the climb instead of sinking at every crest. (Bunting/rigging
  strung over the causeway, the water frame's other big move, is dressing
  work for the art pass — the elevation gives it consistent anchor heights
  to hang from on the climb.)

## Set pieces on the racing line

- **S.S. EXTRADITION DENIED** (98 m, mid-oval) — the landmark. From the
  Harbour Crest it sits dead ahead across the water; if the gold yacht is
  on your left, you are on the west return.
- **The duelling yachts**: Ellison's (outside the climb, u 0.30) is
  overtaken *from above* as the road crests; Murdoch's (outside, u 0.68)
  is met on the second rise. The climb is what makes the duel vertical.
- **The seastead platform** inside the west — met at West Elbow height
  (+3.6 m), close to level with its deck for the first time.
- **Item rows** at u 0.10 / 0.27 / 0.44 / 0.61 / 0.78 / 0.93 — u 0.27 sits
  mid-climb (a boost up to the crest is a genuine decision), u 0.61 is
  the basin reward.

## Design audit (Mario Kart research criteria)

- **Cadence:** decision events = 6 item rows + 4 bank apexes + 3 elevation
  inflections (crest u 0.36, Flag Swell u 0.52, basin u 0.585) + the buoy
  sign at u 0.015. Worst gap 217 m ≈ **5.4 s at 40 m/s** (West Elbow →
  item row u 0.93) — inside the 6 s cap. Waters is deliberately the
  calmest lap in the batch; its decisions are line and boost timing, not
  corner density.
- **Undulation:** elevation range **8 m** (0 → +8), ≈10.3 m climbed and
  descended per lap — inside the 8–15 m target.
- **Banking:** authored 2–9°, formula-checked above; 0° across the grid.
- **Road width:** 22 units ≈ 7–8 kart widths — unchanged.
- **Landmark:** S.S. EXTRADITION DENIED (above).
- **Shortcut verdict: NONE — and the water is the wall.** The closest
  non-adjacent approach on the oval is 162.5 m (u 0.200 ↔ 0.320) across
  open sea, and karts are corridor-clamped to 16 m of the centreline.
  A cut would be a swim, at 0.55× deep-offroad pace, in full view of two
  yachts' worth of lawyers. The lap's time is won on the climb and on
  carrying speed through the swells.
- **Slope physics:** grade feeds top speed at ±8% (factor 1.6 × grade,
  capped) — the Harbour Climb runs ≈3–4.7% (the gentlest climb in the
  game), so it taxes without ever walling a kart; the swell descent pays
  it back in instalments.
- **Scenery siting:** buoys, signs and both yachts now sit on
  `terrainHeightAt`/the sea surface under them; the bobbing animation
  takes its base from the placed height, so the whole harbour floats on
  the new profile instead of the old flat plane.
