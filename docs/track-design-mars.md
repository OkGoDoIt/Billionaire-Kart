# Mars GP — Track Design

**Layout:** 1,892 m closed loop, 13 spline control points, 13 corners (9 right, 4 left).
A canyon floor, a switchback climb up a ridge, a dive into a crater bowl, and broken
highlands home. The profile data lives in `TRACKS[1].elev` / `TRACKS[1].bank` in
`game.js` as hand-authored keyframes `[u, value]` (u = lap fraction), interpolated
by a circular monotone cubic — shared machinery, authored numbers.

## Elevation story

Mars is the vertical track: **15 m of range, from the canyon floor to the crater's
far lip — and below the start line in between.**

- **Sector 1 — The Canyon Floor (u 0.00–0.24), 0 → +4.5 m.** Dead flat past the
  rocket and the gantry so the grid and the opening kink stay honest, then a first
  gentle rise as the canyon walls close in toward Canyon Mouth.
- **Sector 2 — The Switchback Climb (u 0.24–0.44), +4.5 → +12 m.** The heart of the
  track: **two stacked hairpins** — Switchback One (L, 23 m radius) at +6 m and
  Switchback Two (R, 20 m radius, the tightest corner in the game) at +11 m —
  zig-zagging up the ridge face like a mountain road. Every exit is higher than
  every entry; you feel the altitude in the kart (±8% slope physics) and in the
  view: the canyon floor falls away below the edge. Crest at the **Tharsis Ridge,
  u 0.40, +12 m — the lap's high point** — then Ridge Runner sweeps the crest.
- **Sector 3 — The Crater (u 0.44–0.62), +10 → −3 → +3.5 m.** Off the ridge the
  road *dives*: −13 m down the crater wall, across the **Crater Rim sweeper
  (u 0.519, +2 m)**, and onto the **bowl floor at u 0.55, −3 m — the only
  below-start tarmac in the game**. Bowl Exit (u 0.580) climbs the far wall
  immediately; there is no flat in the crater, only down and up.
- **Sector 4 — The Highlands (u 0.62–1.00), +3.5 → 0 m.** Broken rollers across
  the plateau: a +8 m crest at u 0.70 **hiding Dust Devil's entry**, a dip, a
  second rise into Regolith, then the long descent — Regolith +6.5 m → Descent
  +3.5 m → canyon floor 0 by u 0.95, so the final hairpin and the grid sit flat.

## Corner by corner

| # | Name | u (apex) | Dir / angle / min radius | Bank | Elev at apex | Intent |
|---|------|----------|--------------------------|------|--------------|--------|
| T0 | Gantry Kink | 0.000 | R 21°, 45 m | +4° | 0 m | A kink *on* the start line — just enough bank to feel alive, grid behind it stays level (0° from u 0.975) |
| T1 | Sol 1 | 0.106 | R 19°, 112 m | +5° | +0.6 m | Fast canyon-floor kink; the warm-up |
| T2 | Canyon Mouth | 0.198 | R 64°, 37 m | +11° | +3.0 m | The gate to the climb — first heavy bank as the walls close |
| T3 | Switchback One | 0.272 | L 95°, 23 m | −13° | +6.0 m | Hairpin 1 of the climb: slow, steep, banked hard against the slope |
| T4 | Switchback Two | 0.343 | R 97°, 20 m | +14° | +11.0 m | Hairpin 2: the tightest corner in the game gets the track's max bank |
| T5 | Ridge Runner | 0.438 | R 31°, 68 m | +8° | +10.0 m | Relief sweeper along the crest — breathe, take the view (Olympus Mons, NE) |
| T6 | Crater Rim | 0.519 | L 52°, 53 m | −10° | +2.0 m | The dive made steerable: a banked left along the rim as the floor drops out |
| T7 | Bowl Exit | 0.580 | R 76°, 30 m | +12° | ≈0 m | Climbs the crater wall from the bowl floor; bank pins you to the wall |
| T8 | Highland | 0.666 | R 65°, 36 m | +11° | +6.0 m | Plateau cornering, fed by the crater climb |
| T9 | Dust Devil | 0.739 | L 79°, 32 m | −12° | +5.0 m | Entry hidden by the u 0.70 crest — Mars' blind corner |
| T10 | Regolith | 0.808 | R 80°, 28 m | +12° | +6.5 m | Second-rise hairpin-ish right; starts the run home |
| T11 | Descent | 0.889 | R 60°, 34 m | +11° | +3.5 m | Banked right on the way down — gravity is helping now |
| T12 | Canyon Hairpin | 0.942 | L 85°, 25 m | −12° | +0.3 m | Last corner on the flat canyon floor, under the gantry's shadow — the lap ends where it began |

Start/finish guarantees: elevation is 0 from u 0.95 through u 0.06, banking 0 from
u 0.975 through u 0.02 (the +4° at T0 lives between u 0.985's approach and the line
itself, peaking *at* the line at just 4° — the grid rows behind it see ≤2°).

## Banking rationale

Per-corner constants from radius and entry speed, smoothed over ±4 samples.
Reference check with `bankDeg = clamp(atan(v²·κ/g) × 0.55, ±28°)`: at kart speeds
(v = 30–44 m/s) the formula **saturates at 28° on 12 of 13 corners** — Mars is
steeper-kneed than Silicon Valley (five corners under 32 m radius vs three), which
is why its authored band runs hotter: **4–14°**, with both switchbacks and every
sub-32 m corner at 11–14°. Deliberate deviations: **T0** (formula 28°, authored 4° —
the start/finish rule wins) and **T1** (formula 22–28°, authored 5° — a 112 m kink at
canyon-floor speed is a lean, not a wall). Camera rolls at 0.7× the road roll; karts
sit square on the surface; the switchbacks stack bank *and* grade, which is exactly
where the ±8% slope physics earns its keep — Switchback Two uphill is the slowest
honest corner in the game.

## Set pieces on the racing line

- **The Rocket** stands beside the start (u 0.0, outside) — the canyon-floor
  landmark you launch past every lap.
- **Mesas** ring the western and southern horizon; rocks thicken on the climb so
  Sector 2 reads as a mountain road, not a ramp.
- **Item rows** at u 0.10 / 0.27 / 0.44 / 0.61 / 0.78 / 0.93 — u 0.27 sits *between
  the switchbacks* (a boost up Switchback Two is a genuine decision), u 0.61 is the
  crater-exit reward.
- **Landmark: Olympus Mons** — a shield-volcano silhouette with a caldera on the NE
  horizon, dead ahead as you crest the switchback climb. On Mars, you navigate by
  the volcano: if Mons is on your right shoulder, you're in the highlands.

## Design audit (Mario Kart research criteria)

- **Cadence:** 32 decision events (13 corners + elevation inflections + item rows).
  Worst gap 148 m ≈ **3.7 s at 40 m/s** (u 0.12 → Canyon Mouth) — comfortably inside
  the 3–5 s cadence, no gap over 6 s. Mars is the denser lap.
- **Undulation:** elevation range **15 m** (−3 → +12), ≈24.5 m climbed and descended
  per lap — top of the 8–15 m range target, by design: Mars is the mountain track.
- **Banking:** authored 4–14°, formula-checked above; ~0° across the grid.
- **Road width:** 22 units ≈ 7–8 kart widths — unchanged (not widened).
- **Landmark:** Olympus Mons (above), plus the Rocket as the start-line marker.
- **Shortcut verdict: NONE — deliberately, and it stings more here.** A switchback
  pair * begs* for a cut, but the arms don't cooperate: the closest non-adjacent
  approach on the lap is 119 m (u 0.303 ↔ 0.392 — mid-climb to ridge crest), and
  karts are corridor-clamped to 16 m of the centreline. Cutting the switchbacks
  would mean a ~120 m cliff-side chute — a redesign of Sector 2, not a shortcut.
  Recorded as a layout lesson: **author the arms within ~30 m of each other when a
  shortcut is wanted** (then gate it with the 0.55× deep-offroad factor + boost).
  Mars' time is won by carrying speed out of the crater, not by cutting it.
- **Slope physics:** grade feeds top speed at ±8% (factor 1.6 × grade, capped) —
  the climb taxes, the crater dive pays back with interest.
