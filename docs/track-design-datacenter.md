# AI Datacenter GP — Track Design

**Layout:** 1,494 m closed loop, 18 spline control points, 15 corners (11 right, 4 left).
A desert ring around the facility: the north straight runs *through* the server hall,
the east side rolls past the cooling towers and the gas plant, the south straight
overlooks the draining lake, and the west side climbs home past the protest corner.
The profile data lives in `tracks/datacenter.js` (`def.elev` / `def.bank`) as
hand-authored keyframes `[u, value]` (u = lap fraction), interpolated by the shared
circular monotone cubic — the machinery is shared system, the numbers below are
the design.

## Elevation story

Three sectors, one idea: **the facility sits on a plinth, the lake sits in a bowl,
and the lap commutes between them.**

- **Sector 1 — The Plinth & the Hall (u 0.00–0.20), 0 → +4.5 m.** The grid sits at
  grade (0 m, flat from u 0.96 through u 0.02). Out of the NW Plinth Bend the road
  ramps up the facility plinth (+4 m over ~67 m, ≈6%) and runs **dead level at
  +4 m from u 0.065 to u 0.165** — this plateau is load-bearing design, not a
  concession: the drive-through server hall is a rigid structure straddling the
  north straight (hall centre u 0.114, floor pad ≈134 m long), and its floor,
  racks and patrol robot all sit on the road's height at the hall sample. A
  profile that moved inside the hall would pour the road through the floor pad.
  The climb instead serves the hall: you rise *into* the building and burst out
  of it onto a +4.5 m crest shoulder past the water counter (u 0.235).
- **Sector 2 — The East Descent (u 0.20–0.42), +4.5 → +0.5 m.** A rolling
  right-hand fall past the cooling towers and the dedicated gas plant: three
  banked rights (Tower Bend, Plant Swoop, East Kink) bleed altitude in steps
  until the road bottoms out at the **Compression Left (u 0.393, +0.5 m)** — a
  tight 34 m left taken at the bottom of the descent, where the grade flattens
  and the kart compresses before the lap's second climb.
- **Sector 3 — The Lake Bowl & the Overlook (u 0.42–0.70), +0.5 → +8 → +6.4 m.**
  Out of the Compression Left the road rises along the south shore: South Gate,
  Ridge Right, then the protest chicane (u 0.545–0.605 — the crowd's signs now
  stand on real terrain at the chicane's shoulder) while the grade builds to the
  lap's high point, the **Lake Overlook crest at u 0.645 (+8 m)**, taken inside
  the Overlook Left. The lake sits 52 m inside the road at grade (y≈0) and
  drains a third per lap; from the crest you look *down* into the bowl at the
  water you are supposedly not drinking. That sightline is why the crest is
  where it is.
- **Sector 4 — The West Return (u 0.70–1.00), +6.4 → 0 m.** A stepped descent:
  West Swoop, a swell over the West Hairpin (+2.6 m), one more rise at the Back
  Left (+3.2 m — the last place a trailing kart can send a Hail Mary), then a
  settling run through Northwest Rise and Final Right, dead level by u 0.96.

## Corner by corner

| # | Name | u (apex) | Dir / angle / min radius | Bank | Elev at apex | Intent |
|---|------|----------|--------------------------|------|--------------|--------|
| T1 | NW Plinth Bend | 0.002 | R 77°, 73 m | +3° | 0 m | The start corner: bank kept to 3° by the start-straight rule (see below); its exit feeds the plinth ramp |
| T2 | Tower Bend | 0.227 | R 80°, 69 m | +11° | +4.3 m | First corner on the plinth, past the cooling towers — bank arrives with the altitude |
| T3 | Plant Swoop | 0.293 | R 38°, 94 m | +9° | +2.4 m | Rolling right past the gas plant; the descent's rhythm corner |
| T4 | East Kink | 0.344 | R 29°, 78 m | +10° | +1.6 m | Short, sharp, still falling — sets up the Compression Left |
| T5 | Compression Left | 0.393 | L 109°, 34 m | −13° | +0.6 m | The bottom of the lap. Heavy bank, dive-fed entry, the slowest honest corner on the east side |
| T6 | South Gate | 0.433 | R ~90°, 28 m | +14° | +1.5 m | Tightest radius on the south shore gets max bank; exit starts the Overlook climb |
| T7 | Ridge Right | 0.497 | R, 47 m | +11° | +2.5 m | Climbing right — a boost spent here is worth real time uphill |
| T8 | Protest Left | 0.562 | L 85°, 42 m | −12° | +3.4 m | Chicane entry, in front of the crowd and their signs |
| T9 | Protest Chicane | 0.598 | R 129°, 27 m | +14° | +5.0 m | The tightest corner in the game so far gets max bank — and it is *uphill*, so it is slow twice |
| T10 | Lake Overlook | 0.642 | L 112°, 32 m | −13° | +7.9 m | The crest corner: apex at the lap's high point, the draining lake in view below-left |
| T11 | West Swoop | 0.681 | R 84°, 49 m | +10° | +6.4 m | First corner of the descent, still high — gravity starts paying here |
| T12 | West Hairpin | 0.793 | R 137°, 32 m | +13° | +2.7 m | Downhill-braking hairpin near the bottom of the west fall |
| T13 | Back Left | 0.846 | L 86°, 46 m | −12° | +3.2 m | Sits on a deliberate swell — the exit rises before it falls, a last roller on the way home |
| T14 | Northwest Rise | 0.891 | R 38°, 67 m | +9° | +1.7 m | Gentle right on the settle toward grade |
| T15 | Final Right | 0.939 | R 47°, 93 m | +7° | +0.8 m | Last corner; exit is flat by u 0.96 and the grid sits level |

Start/finish guarantees: elevation is 0 from u 0.96 through u 0.02, and 0 again
along the whole hall approach straight except the ramp (u 0.02–0.065). Banking is
0 across the hall straight (u 0.035–0.19) — the building does not lean, so
neither does the road inside it. The one exception is T1: the start corner's
apex sits *on* the line, so it carries an authored +3° (grid rows behind the
line read ≤ +2.6° after smoothing — the same compromise Mars made at its T0,
documented there, repeated here).

## Banking rationale

Per-corner constants from radius and entry speed, with explicit 0° crossovers at
every sign change (0.368, 0.415, 0.465, 0.53, 0.58, 0.62, 0.66, 0.82, 0.865) so
the road visibly rolls from one lean to the other through the chicanes.
Reference check with `bankDeg = clamp(atan(v²·κ/g) × 0.55, ±28°)`: at kart speeds
(v = 30–44 m/s) the formula saturates at 28° on every corner under ~55 m radius
— six corners here — which is why the authored band runs 9–14° on the tight
work and takes only the formula's *ordering* on the fast rights (7–11°).
Deliberate deviations: **T1** (formula 28°, authored 3° — the start rule wins)
and the **hall straight** (formula would still bank the gentle weave, authored
0° — the road is indoors there).

## Reference frames

Studied in `~/workspace/research_notes/mk-reference/` before authoring:
**mkw-peach.jpg** (primary) and **mk8-rainbow.jpg** (supporting).

- In mkw-peach.jpg the giant MARIO sign building sits exactly on the driving
  axis as the frame's vanishing point, and the dressing (neon flame
  sculptures) stands within metres of the kerb — nothing important is far
  away. Datacenter's axis piece is the server hall itself: a portal *on* the
  racing line. The elevation serves that framing directly — the plinth ramp
  (u 0.02–0.065) is graded so the hall mouth grows in the windscreen as you
  climb, you enter it level (the building does not lean), and the exit crest
  shoulder (+4.5 m at u 0.20) drops the WATER GULPED counter and the main
  slab into view on-axis ahead, Peach-style. The rack rows already sit at
  HALF_W + 3.4 — the closest dressing in the game — and the plateau is what
  keeps that closeness from clipping.
- From mk8-rainbow.jpg: the air above the road is part of the course
  (item-box arc at head height). The hall is this track's version of that —
  a roof, cable trays and hanging aisle signs *over* the road — and a level
  plateau is what lets overhead dressing hang at a constant height above
  the karts for the hall's full 134 m.

## Set pieces on the racing line

- **The server hall** straddles the north straight at u 0.114 — you drive
  between the rack rows, under the cable trays, past the security robot. Its
  floor is the plateau; the WATER GULPED counter just past the exit (u 0.235)
  is the first thing you see back in daylight, from +4 m up.
- **The draining lake** inside the south-west, overlooked from the u 0.645
  crest. It sinks a third per player lap; the cracked bed is the punchline.
- **The protest corner** (u 0.545–0.605) is the chicane itself — the crowd
  stands on the chicane's elevated shoulder, signs at road height.
- **Item rows** at u 0.10 / 0.27 / 0.44 / 0.61 / 0.78 / 0.93 — u 0.10 sits *on
  the plateau inside the hall sector* (a boost between the racks), u 0.61 is
  mid-climb to the Overlook (a boost there beats the hill), u 0.44 rewards
  surviving South Gate.

## Design audit (Mario Kart research criteria)

- **Cadence:** 24 decision events (15 corners + 6 item rows + 3 elevation
  inflections: plinth top u 0.065, east bottom u 0.40, Overlook crest u 0.645).
  Worst gap 190 m ≈ **4.7 s at 40 m/s** (item row u 0.10 → Tower Bend) — inside
  the 3–5 s cadence, no gap over 6 s.
- **Undulation:** elevation range **8 m** (0 → +8), ≈12.6 m climbed and
  descended per lap — inside the 8–15 m target.
- **Banking:** authored 3–14°, formula-checked above; 0° on the hall straight,
  ≤3° across the grid.
- **Road width:** 22 units ≈ 7–8 kart widths — unchanged.
- **Landmark:** the server hall itself (visible down the north straight from
  the grid), with the cooling towers marking the east descent.
- **Shortcut verdict: NONE — deliberately.** The closest non-adjacent approach
  on the loop is 129.8 m (u 0.403 ↔ 0.523, across the south shore), and karts
  are corridor-clamped to 16 m of the centreline. There is no arm pair to cut
  between; the lap's time is won on the plinth ramp, the Compression Left
  exit, and the Overlook climb.
- **Slope physics:** grade feeds top speed at ±8% (factor 1.6 × grade,
  capped) — the plinth ramp peaks at ≈6% average (≈9% local cubic peak for a
  few metres: a deliberate little wall at the hall door), the Overlook climb
  runs 3–4.5%, and both descents pay back gently. Nothing dominates skill.
- **Scenery siting:** dressing placed via `atFrac` now stands on
  `terrainHeightAt` (the same ground the terrain mesh renders), so the
  counter sign, protest crowd, power poles and billboards ride the new
  profile instead of sinking into it. The hall needed no change — it is
  parented to the road sample at its centre, and the plateau keeps that
  honest along its whole length (verified: plateau deviation from +4.0 m is
  under 3 mm across u 0.065–0.165).
