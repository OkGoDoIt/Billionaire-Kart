# Silicon Valley GP — Track Design

**Layout:** 1,766 m closed loop, 13 spline control points, 9 corners (6 right, 3 left).
Clockwise sweep around a campus valley: north start straight, eastern esses, a southern
ridge, and a western descent back home. The profile data lives in `TRACKS[0].elev` /
`TRACKS[0].bank` in `game.js` as hand-authored keyframes `[u, value]` (u = lap fraction),
interpolated by a circular monotone cubic — the machinery is shared system, the numbers
below are the design.

## Elevation story

Three sectors, one idea: **the lap climbs to the money, then falls off a cliff.**

- **Sector 1 — Sand Hill Flat (u 0.00–0.33), 0 → +3 m.** Deliberately near-flat. The
  opening sweeper and the Esses are about line and drift, not altitude; a gentle +2 m
  swell keeps them from feeling like a parking lot without unsettling the kart.
- **Sector 2 — The Climb & the Overlook (u 0.33–0.56), +3 → +13 m.** The long western
  run out of Due Diligence is the lap's climb: +9.5 m of steady grade (≈4–5%) past the
  office towers to the **Campus Overlook crest at u 0.50 (+13 m, the lap's high point)**.
  The Overlook Kink and the Boardroom Sweeper run along the ridge — from the crest the
  whole valley, the grandstand, and the Mothership landmark are visible. This is the
  track's postcard moment, earned by the climb.
- **Sector 3 — The Valuation Dive (u 0.56–1.00), +11 → 0 m.** The ridge falls away:
  −9 m of downhill braking into the Rock Bottom hairpin (bottoming *at* the apex,
  u 0.615, +4 m), then a rollercoaster — a +7.5 m **blind crest at u 0.70 that hides
  Churn's entry**, a dip through Churn, the low Exit Strategy hairpin (+3 m), and a
  settling descent that is dead level by u 0.96 so the start/finish and grid sit flat.

## Corner by corner

| # | Name | u (apex) | Dir / angle / min radius | Bank | Elev at apex | Intent |
|---|------|----------|--------------------------|------|--------------|--------|
| — | Sand Hill Straight + opening sweeper | 0.00–0.146 | gentle R | +3° | 0 m | Flat grid and gantry; the sweeper's light bank wakes the kart up before T1 |
| T1 | The Pivot | 0.171 | R 53°, 47 m | +11° | +1.6 m | Esses entry — bank catches the kart as the lap's first real load arrives |
| T2 | Counter-Pivot | 0.240 | L 59°, 43 m | −11° | +2.3 m | Esses exit — bank flips sign through a level crossover (u 0.205); drift hand-off corner |
| T3 | Due Diligence | 0.303 | R 82°, 29 m | +14° | +3.0 m | The hairpin. Max bank on the track: slow, tight, and the wall of the corner does the braking |
| T4 | Overlook Kink | 0.466 | R 19°, 90 m | +7° | +11.6 m | Fast kink on the ridge, taken nearly flat-out; light bank for feel, not load |
| T5 | Boardroom Sweeper | 0.544 | L 32°, 74 m | −8° | +12.3 m | Long left along the crest — the view corner; bank holds you on the ridge edge |
| T6 | Rock Bottom | 0.610 | R 80°, 31 m | +13° | +4.1 m | Downhill-braking hairpin at the bottom of the Dive; heavy bank because entry speed is dive-fed |
| T7 | (rise) | 0.692 | R 33°, 57 m | +9° | +6.4 m | Climbs out of Rock Bottom toward the blind crest |
| T8 | Churn | 0.764 | L 53°, 49 m | −10° | +4.5 m | Entry hidden by the u 0.70 crest — brake on faith, the dip catches you |
| T9 | Exit Strategy | 0.830 | R 79°, 32 m | +13° | +3.0 m | Final hairpin, low and slow; exit feeds the flat run home |

Start/finish guarantees: elevation is 0 and bank is 0 from u 0.96 through u 0.02 —
the grid, gantry, and grandstand (u 0.029) sit on the flat.

## Banking rationale

Per-corner constants, chosen from corner radius and entry speed, smoothed over
±4 samples so transitions breathe. Reference check with the standard feel formula
`bankDeg = clamp(atan(v²·κ/g) × 0.55, ±28°)`: at kart speeds (v = 30–44 m/s) the
formula **saturates at its 28° clamp on 8 of 9 corners** — every corner here wants
serious bank. The authored values take the formula's *ordering* into a 3–14° visual
band (real kart-game banking on normal tracks reads ≈10–15°; 28° everywhere would be
an anti-gravity wall and would break the flat start and the Esses crossover).
Two deliberate deviations: **T4** (formula 25–28°, authored 7° — a 90 m sweeper taken
near flat-out carries its load with speed, not slope) and the **opening sweeper**
(formula would still clamp at 28°, authored 3° — the start zone stays near-level by rule).
Camera rolls with the road at 0.7× the bank angle; karts sit square on the surface.

## Set pieces on the racing line

- **Grandstand** at u 0.029, outside the start straight — you pass it twice a lap in spirit.
- **Billboards** ring the lap every ~0.1 u; the climb (u 0.36–0.50) faces the office
  tower cluster so Sector 2 reads as driving *into* the campus.
- **Item rows** at u 0.10 / 0.27 / 0.44 / 0.61 / 0.78 / 0.93 — note u 0.61 sits at the
  bottom of the Dive (a reward for surviving it) and u 0.44 mid-climb (a boost there
  is worth real time uphill).
- **Landmark: The Mothership** — a vast ring-campus HQ silhouette on the NW horizon,
  visible from the start straight, the Overlook, and the whole western descent.
  If you're lost, the ring is north-west. Always.

## Design audit (Mario Kart research criteria)

- **Cadence:** 27 decision events (corners + elevation inflections + item rows).
  Worst gap 177 m ≈ **4.4 s at 40 m/s** (start → first item row) — inside the
  3–5 s cadence, no gap over 6 s.
- **Undulation:** elevation range **13 m** (0 → +13), ≈16.5 m climbed and descended
  per lap — inside the 8–15 m range target.
- **Banking:** authored 3–14°, formula-checked above; 0° on the start straight.
- **Road width:** 22 units ≈ 7–8 kart widths — unchanged (not widened; the width
  serves 8 karts, not 24).
- **Landmark:** The Mothership (above).
- **Shortcut verdict: NONE — deliberately.** The layout's arms never approach:
  the closest non-adjacent points on the whole loop are 126 m apart
  (u 0.264 ↔ 0.353), and karts are corridor-clamped to 16 m of the centreline.
  A cut would need ~120 m of new infield road — that's a different track, not a
  shortcut. Future layouts should design the shortcut *in* (a hairpin whose arms
  pass within ~30 m, gated by the 0.55× deep-offroad factor and a boost); this
  loop's honest answer is that its time is won on the Dive and the climb, not a cut.
- **Slope physics:** grade feeds top speed at ±8% (factor 1.6 × grade, capped) —
  the climb costs, the Dive pays, neither dominates driving skill.
