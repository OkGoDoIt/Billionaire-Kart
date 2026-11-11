# WeWork Memorial GP — Track Design

**Layout:** 1,703 m closed loop, 14 spline control points, 12 bends (8 right,
4 left). A ruined coworking cathedral with two floors — and the course uses both.
The profile data lives in `TRACK.elev` / `TRACK.bank` in `tracks/wework.js` as
hand-authored keyframes `[u, value]` (u = lap fraction), interpolated by the
shared circular monotone cubic — shared machinery, authored numbers.

## Reference frames (viewed, per Roger's standing rule)

- **`mk8-coconutmall.jpg` (Coconut Mall)** — the direct model for this track:
  a two-level interior where you race the ground floor *under* a railed
  balcony level, past unbroken storefronts, and the level change is sold by
  escalators you can see long before you reach them. Storefront density =
  our annex, hall, phone booths and desk rows; pillars as dressing = the
  annex columns and hall beams.
- **`mkw-peach.jpg` (MK World neon city)** — secondary: signage glow at
  building scale (the MARIOKART sign) is the benchmark for the fallen HUSTLE
  neon — a sign you read from a sector away, not a prop you notice at 10 m.
- **Staging observation:** in the Coconut Mall frame the upper floor is in
  view the whole time you race below it — the verticality is *advertised*
  before it is driven. WeWork stages the same trick twice, both verified
  against the spline: the ruined hall is in the windscreen across the
  infield during Floor 1's opening bends (u 0.18–0.24, 21° off-axis) —
  the destination shown a quarter-lap early — and the Mezzanine Ramp
  itself is aimed *straight at the fallen HUSTLE neon*: from u 0.453 the
  glowing sign is 0° off the forward axis, dead ahead for the entire
  climb, growing as you rise toward its floor. You don't just climb to
  Floor 2; you climb at the one lit sign in the building.

## Elevation story

An office building only has one honest vertical move: **stairs between floors.**
So this lap is two storeys of racing connected by exactly two ramps, plus one
piece of structural honesty in between.

- **Floor 1 — The Lobby Level (u 0.00–0.42), −2.5 → +1 m.** Dead flat past the
  bankruptcy-court annex (u 0.13) and through the opening bends — it's an office
  floor, it's flat, that's the point. The one event: at u 0.375 the floor has
  **collapsed** — a −2.5 m sag across the open-plan, bottoming out under the
  u 0.392 kink. The building is a ruin; the floor filed for Chapter 11 too.
  You feel it as a dip-and-recover on the lap's longest run, right before the ramp.
- **The Mezzanine Ramp (u 0.42–0.52), 0 → +6 m.** One storey, climbed at ≈3.5%
  past the ruined HQ hall (u 0.47). The u 0.44 item row sits mid-ramp — a boost
  there is worth real time. You arrive upstairs into a left (u 0.536).
- **Floor 2 — The Executive Level (u 0.52–0.78), +6 → +6.5 m.** A full second
  storey of racing: the HUSTLE corner (u 0.586, the fallen neon at its exit),
  the Corner Office (u 0.667, +6.5 m, the lap's high point), the Breakout left
  (u 0.736) with its kombucha bar. Same corners as downstairs would give you —
  but six metres up, looking down at the lobby you started on.
- **The Fire-Escape Descent (u 0.78–1.00), +5 → 0 m.** Down the back stairs:
  the u 0.800 right is taken on the way down (+4.0 m), the Lobby Return
  (u 0.886) at +1.0 m, dead level from u 0.92 so the grid sits flat.

## Corner by corner

| # | Name | u (apex) | Dir / angle / min radius | Bank | Elev at apex | Intent |
|---|------|----------|--------------------------|------|--------------|--------|
| T1 | Reception | 0.174 | R 48°, 64 m | +9° | +0.3 m | First load on the lobby floor |
| T2 | Hot Desk | 0.241 | L 28°, 85 m | −7° | +0.8 m | Gentle left; bank flips through u 0.208 |
| T3 | Open Plan | 0.307 | R 50°, 61 m | +10° | +1.0 m | The lobby's last real corner before the sag |
| T4 | The Sag | 0.392 | R 7°, 160 m | +2° | −1.9 m | A kink *inside* the collapsed floor — the elevation is the corner |
| T5 | Mezzanine Entry | 0.461 | R 14°, 109 m | +4° | +2.5 m | Halfway up the ramp, beside the ruined hall |
| T6 | Second Floor | 0.536 | L 36°, 67 m | −9° | +6.0 m | Arrival upstairs — the level change is the braking zone |
| T7 | HUSTLE Corner | 0.586 | R 67°, 41 m | +13° | +6.0 m | Tightest corner on the track gets the max bank; the fallen neon lies at its exit (u 0.60) |
| T8 | Corner Office | 0.667 | R 59°, 50 m | +11° | +6.5 m | The high point — the corner office has the best view, briefly |
| T9 | Breakout | 0.736 | L 43°, 63 m | −10° | +6.0 m | Last upstairs corner; kombucha bar on its outside |
| T10 | Fire Escape | 0.800 | R 43°, 63 m | +9° | +4.0 m | Taken mid-descent — gravity is helping now |
| T11 | Lobby Return | 0.886 | R 27°, 95 m | +6° | +1.0 m | Back on the ground floor, feeding the flat run home |
| — | Grid Kink | 0.992 | R 19°, 105 m | 0° | 0 m | On the start line — unbanked by rule |

Start/finish guarantees: elevation is 0 and bank is 0 from u 0.92 through u 0.04.

## Banking rationale

Per-corner constants from radius and entry speed, smoothed over ±4 samples.
Reference check with `bankDeg = clamp(atan(v²·κ/g) × 0.55, ±28°)`: the formula
saturates on T7 (41 m radius) and asks 12–20° across Floor 2; authored values
take that ordering into a 2–13° band. Two deliberate deviations: **T4** (+2° —
a 160 m kink whose challenge is the dip, not the load) and the **Grid Kink**
(0°, the start rule). Banking is identical in character on both floors — the
building's floors are the same product, after all. Camera rolls at 0.7×.

## Set pieces on the racing line

- **Bankruptcy Court annex** at u 0.13, on the flat lobby level it belongs on.
- **The ruined HQ hall** at u 0.47 stands beside the Mezzanine Ramp — you climb
  past the cathedral on your way to its floor.
- **The fallen HUSTLE neon** at u 0.60 lies at the exit of the track's hardest
  corner, upstairs. It fell from the second floor. Of course it did.
- **Item rows** at u 0.10 / 0.27 / 0.44 / 0.61 / 0.78 / 0.93 — u 0.44 is mid-ramp,
  u 0.78 is at the top of the fire escape (a boost down the stairs is brave).
- **Landmark: the Spiral Staircase to Nowhere** at the centre — the building's
  own vertical joke, visible from both floors.
- Dressing note: lap-anchored dressing grounds itself through `terrainHeightAt`
  (shared `atLap`/`anchorGroup` + scatter heights), so the phone booths, desk
  rows and rubble beside the ramps sit on the ground the mesh actually draws.

## Design audit (Mario Kart research criteria)

- **Cadence:** 32 decision events (bends + elevation inflections + item rows +
  signs + set pieces). Worst gap 187 m ≈ **4.7 s at 40 m/s** (the run home past
  the last item row) — inside the 3–5 s cadence, no gap over 6 s.
- **Undulation:** elevation range **9 m** (−2.5 → +6.5), ≈10 m climbed and
  descended per lap — inside the 8–15 m target. Storeys, not mountains.
- **Banking:** authored 2–13°, formula-checked above; 0° on the start straight.
- **Road width:** 22 units ≈ 7–8 kart widths — unchanged.
- **Landmark:** the Spiral Staircase to Nowhere (above).
- **Shortcut verdict: NONE — deliberately.** The closest non-adjacent approach
  is 131 m (u 0.551 ↔ 0.640, across the Floor-2 infield), and karts are
  corridor-clamped to 16 m of the centreline. Cutting between floors would
  need a hole in the mezzanine — the one renovation WeWork never finished.
  Time here is won on the ramp and the descent, not a cut.
- **Slope physics:** grade feeds top speed at ±8% — the Mezzanine Ramp is the
  slowest honest sector in the building; the fire escape pays it back.
