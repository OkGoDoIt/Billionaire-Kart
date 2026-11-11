# Davos Circuit — Track Design

**Layout:** 1,141 m closed loop, 10 spline control points, 5 corners (all right —
a clockwise alpine loop). A resort-level start among the private jets, a climb up
the west wall past the chalets, a summit above the north-east bend, and a plunge
down the east wall past the panel stage and the security perimeter to the valley
floor. The profile data lives in the Davos def's `elev` / `bank` in
`tracks/davos.js` as hand-authored keyframes `[u, value]` (u = lap fraction),
interpolated by a circular monotone cubic — the machinery is shared system, the
numbers below are the design.

## Reference frames

**Primary: `mk8-mountwario.jpg` (MK8 Mount Wario descent) — Davos's staging
grammar.** What was taken from the frame: a descent is never just a slope. You
crest first and the road falls away under the kart (the shot is taken at the
airborne moment over the crest); the drop is edged with continuous small red
marker posts on both sides; a row of item boxes floats *on the racing line*
mid-descent; and the crest compresses the view so the drop opens into a layered
valley reveal — snow ridges at several depths, the road ribbon visible far
below. (*ANALYSIS.md* patterns 2, 6, 7.) Secondary: `mk8-desert.jpg` for the
backdrop — silhouettes layered at three haze depths is how the Alps ring should
read from the summit (art pass), and its low-sun long-shadow grade is the mood
the summit view borrows.

**Staging observation (elevation):** Davos copies Wario's crest-then-reveal
exactly at the summit. The bank peaks at the Summit Bend apex (u 0.411) but the
elevation crests *after* it (u 0.45), so the kart unloads over the top already
rolling into the plunge — and the reveal is the whole circuit below with the
panel stage at +10.6 m on the descent line, the way Wario's descent reveals the
road ribbon and stadium below. The u 0.44 item row sits at the crest, floating
on the line like the frame's mid-descent row. And Wario's red edge posts have
their Davos equivalent already in the module: the unbroken snow banks on both
edges — terrain-anchored in this pass so they mark the plunge continuously
instead of sinking into the hillside.

## Elevation story

Davos is the slate's alpine climb: **the biggest authored ascent of the module
tracks, structured like a mountain road — two pitches, a summit, and a plunge.**

- **Sector 1 — The Resort Floor (u 0.00–0.10), 0 → +1.0 m.** Dead level across
  the grid and the jet tarmac (three private jets parked at y 0 beside the
  start — the last flat, honest ground of the lap), then the road tilts: the
  first ramp begins under the "PRIVATE JETS ONLY" sign.
- **Sector 2 — The Climb (u 0.10–0.45), +1.0 → +11.5 m.** Two distinct pitches,
  because alpine roads climb in pitches. **Pitch one** (+1.0 → +6.0, ≈4% at its
  steepest) rises up the west wall past the fondue and chocolate chalets — both
  now standing on the hillside at +6–7 m — to the Chalet Sweeper. A breather
  along the upper traverse (+6.0 → +7.6), then **pitch two** (+7.6 → +11.0)
  attacks the north wall to the Summit Bend, cresting at **+11.5 m at u 0.45 —
  the high point of the lap and of any module track**: the Alps ring the
  horizon, the whole circuit is below you, and the panel stage is a toy on the
  descent.
- **Sector 3 — The Plunge (u 0.45–0.72), +11.5 → +3.4 m.** Off the summit the
  road falls the way alpine roads do: −3.7% past the GREAT RESET panel stage
  (u 0.476, at +10.6 m — the owners of everything hold their panel near the top,
  naturally), easing down the east wall inside the security fence, the
  watchtower's searchlight sweeping across the grade. The plunge is Davos'
  speed sector: gravity is a co-driver and the braking zone into Security Bend
  is the lap's skill test.
- **Sector 4 — The Valley Floor (u 0.72–1.00), +3.4 → 0 m.** The descent
  settles: +2.4 → +1.3 → +0.6 through Security Bend and the Valley Kink, dead
  level by u 0.955, so the start corner, the grid and the jets sit flat.

## Corner by corner

| # | Name | u (apex) | Dir / angle / min radius | Bank | Elev at apex | Intent |
|---|------|----------|--------------------------|------|--------------|--------|
| T1 | Jet Corner | 0.000 | R 50°, 56 m | +5° | 0 m | The start/finish corner — the tightest radius after the summit bends, taken at resort level. +5° is the Mars Gantry-Kink exception at the line itself; 0° from u 0.035 and behind the grid from u 0.98 |
| T2 | Chalet Sweeper | 0.213 | R 65°, 167 m | +7° | +6.0 m | The broad sweeper at the top of pitch one — the chalets corner; bank holds you on the hillside traverse |
| T3 | Summit Bend | 0.411 | R ~95°, 99 m | +11° | +11.0 m | The summit corner: max bank at max altitude, the crest 40 m past the apex — carry speed over it or pay on the plunge |
| T4 | Security Bend | 0.718 | R ~80°, 135 m | +9° | +3.4 m | The plunge's braking test, inside the fence under the searchlight; bank pins you while gravity argues |
| T5 | Valley Kink | 0.907 | R 17°, 172 m | +4° | +0.6 m | The gentle settle onto the valley floor — the lap exhales into Jet Corner |

Start/finish guarantees: elevation is 0 from u 0.955 through u 0.05 and bank is
0 from u 0.98 through u 0.035 (the +5° peaks *at* the line, Mars-T0 style; the
grid rows behind it see ≤2°) — the jets, their tarmac and their sign all sit in
the flat zone.

## Banking rationale

Per-corner constants from radius and entry speed, smoothed over ±4 samples.
Reference check with `bankDeg = clamp(atan(v²·κ/g) × 0.55, ±28°)`: at kart speeds
the formula saturates at 28° on T1, T3 and T4 and wants ≈20–28° on T2/T5 — Davos
is steep-kneed. The authored band (+4…+11°, plus the start exception) takes the
formula's ordering: the summit bend (99 m, at altitude, crest-fed) gets the max;
the broad Chalet Sweeper and the settling Valley Kink get the least. Two
deliberate features: **T3's bank and the crest stack** — bank peaks at the apex
(u 0.411) while elevation crests just after (u 0.45), so the kart unloads over
the summit already rolling into the plunge; and **T4 is banked for entry speed,
not radius** — at 135 m it would rate +7°, but plunge-fed entries arrive faster
than anywhere else on the lap, so it gets +9°. Camera rolls at 0.7× road roll;
on the climb the pines (terrain-anchored via `scatterPos`) make the grade
visible against the hillside.

## Set pieces on the racing line

- **The jets** at the grid (u 0.004) — the flat anchor of the lap; you leave
  them at sea level and return from altitude.
- **The chalets** at u 0.218 / 0.264 on pitch one — FONDUE — $400 at +6 m; the
  module's `at()` now anchors to `terrainHeightAt`, so both chalets stand on
  the hillside instead of in it.
- **The panel stage** at u 0.476 — GREAT RESET AHEAD, on the plunge at +10.6 m:
  the audience sits above the circuit it owns.
- **The security perimeter + searchlight tower**, u 0.62–0.78 — the fence now
  follows the descending grade post by post, and the tower stands on the
  hillside at Security Bend.
- **Snow banks** hug both edges the whole lap; anchored per-instance to the
  terrain, they ride the climb and the plunge as the soft barriers they are.
- **Item rows** at u 0.10 / 0.27 / 0.44 / 0.61 / 0.78 / 0.93 — u 0.44 is the
  summit row (a boost over the crest is the fastest decision on the lap),
  u 0.61 sits mid-plunge where a defensive drop is worth the most.
- **Landmark: the Alps** ring the horizon on all sides; the summit crest is
  where they stop being backdrop and become the view.

## Design audit (Mario Kart research criteria)

- **Cadence:** 17 decision events (5 corners + 6 elevation inflections + 6 item
  rows). Worst gap ≈145 m ≈ **3.6 s at 40 m/s** (u 0.78 item row → Valley Kink)
  — inside the 3–5 s cadence, no gap over 6 s. Davos is a short lap (1,141 m)
  and a dense one.
- **Undulation:** elevation range **11.5 m** (0 → +11.5), ≈23 m climbed and
  descended per lap — mid-band of the 8–15 m range target and the largest of
  the module tracks, as briefed. Grades are alpine-honest: pitch one ≈4%,
  pitch two ≈2.5%, the plunge ≈−3.7%.
- **Banking:** authored +4…+11° (+5° line exception), formula-checked above;
  0° across the grid.
- **Road width:** 22 units ≈ 7–8 kart widths — unchanged.
- **Landmark:** the Alps + the summit view (above).
- **Shortcut verdict: NONE — the mountain doesn't offer one.** The closest
  non-adjacent approach of the centreline is 83.7 m (the Jet Corner's own
  entry/exit arms), and every other arm is separated by a wall of the loop or
  the hillside itself. A cut would need a service road up the infield — a
  different circuit. Davos' time is won on the plunge braking and the summit
  crest, not on a cut. Layout lesson carried from Mars, now confirmed three
  times: author the arms within ~30 m of each other when a shortcut is wanted.
- **Slope physics:** grade feeds top speed at ±8% (factor 1.6 × grade, capped)
  — pitch one costs a real ≈6% at its steepest and the plunge pays it back with
  interest into Security Bend. On Davos the vertical *is* the racing.
