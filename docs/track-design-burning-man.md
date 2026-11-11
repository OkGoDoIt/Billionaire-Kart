# Burning Man GP — Track Design

**Layout:** 1,741 m closed loop, 13 spline control points, 9 bends (7 right,
2 left). A dusk loop on an open playa that is — honestly, geologically — flat.
The profile data lives in `TRACK.elev` / `TRACK.bank` in `tracks/burningman.js`
as hand-authored keyframes `[u, value]` (u = lap fraction), interpolated by the
shared circular monotone cubic — shared machinery, authored numbers.

## Reference frames (viewed, per Roger's standing rule)

- **`mk8-desert.jpg` (Bone-Dry Dunes)** — the governing frame: a total
  sunset grade (sky, mesas, dirt all one orange script), layered mesa
  *silhouettes* as the backdrop, and — the key detail — the road itself is
  a **sculpted raised berm of packed dirt with a carved lip**, so even a
  "flat" desert is never a plane with a stripe on it. The train crossing
  is its one hero set piece, placed mid-frame on the racing line.
- **Staging observation:** in the desert frame the road ribbon undulates
  gently the whole lap, the mesas are layered silhouettes *stacked at the
  frame's edge*, and the wooden ramp's chevrons mark the one big vertical
  event. Our Overlook Berm copies that staging honestly: the Man — this
  track's mesa, 34 units at the centre — is a shoulder landmark, not a
  windscreen one (his closest approach to the forward axis anywhere on
  the loop is 53°, at u 0.70). What the climb (u 0.40–0.55) actually buys
  is the *silhouette stack*: from the pan he is one flat shape among
  tents; from the crest (+8 m, 255 m out) he is the only object on the
  playa still above your eye line — head ~5° over the horizon, fire-heart
  lit — riding the inside shoulder while the whole northern loop spreads
  below the berm's lip. Burning Man's purple-dusk grade is the desert
  frame's one-committed-colour-script move, transposed; the berms'
  banked lips are the dirt berm's carved edge.

## Elevation story

The playa does not have hills, and this design refuses to invent any. What a
playa *does* have is **berms**: wind-piled dust banks and graded earthworks,
a few metres tall, exactly where a city of 70,000 would pile them. Three
authored berms, kept sparse on purpose — long flat pans between them are the
honest texture of the place.

- **The Pan (u 0.00–0.16), 0 m.** Dead flat off the line, past the first art
  cars. Radical self-reliance includes making your own fun on the flat.
- **Berm One (u 0.16–0.36), 0 → +3.5 → +1 m.** A wind-piled bank across the
  north-east arc: you crest it *through* the Berm Crest left (u 0.269, +3.5 m,
  the berm's top) and drop off its back into the lap's one real corner —
  **the Whiteout Hairpin (u 0.332, R 73°, 40 m)**, entered downhill, inside
  the drifting whiteout section (u 0.30). Brake on faith; the dust is a feature.
- **The Overlook Berm (u 0.36–0.67), +1.5 → +8 m.** The long southern arc is
  one slow climb up the graded earthwork ring: +4.0 at u 0.47, cresting at
  **+8.0 m at u 0.55 — the lap's high point**, where the dust devil wanders.
  From the crest the Man rides the inside shoulder as the playa's one
  above-eye-line silhouette (see the staging observation above) — the
  overlook the berm was built for. Overlook Exit (u 0.671) leaves at +5.0 m.
- **The Home Rollers (u 0.67–1.00), +5 → 0 m.** Two last dust swells — Deep
  Playa left (u 0.748, +3.5 m), a dip at the u 0.78 item row (+2.0 m), the
  Home Berm right (u 0.821, +3.0 m) — then the playa takes its flat back:
  dead level from u 0.93, grid on the pan where it started.

## Corner by corner

| # | Name | u (apex) | Dir / angle / min radius | Bank | Elev at apex | Intent |
|---|------|----------|--------------------------|------|--------------|--------|
| — | Esplanade Kink | 0.098 | R 10°, 147 m | +3° | 0 m | A lean on the flat pan, nothing more |
| T1 | First Berm Right | 0.198 | R 37°, 72 m | +8° | +2.0 m | Climbing the berm's face |
| T2 | Berm Crest | 0.269 | L 40°, 68 m | −9° | +3.5 m | The berm's top — the view opens, the hairpin hides below |
| T3 | Whiteout Hairpin | 0.332 | R 73°, 40 m | +13° | +1.0 m | The lap's corner: downhill entry, dust-blind, max bank (the berm's back is a banked wall of packed dust) |
| T4 | Overlook Exit | 0.671 | R 66°, 50 m | +11° | +5.0 m | Leaving the crest — still high, still facing the Man |
| T5 | Deep Playa | 0.748 | L 30°, 86 m | −7° | +3.5 m | A swell left on the way home |
| T6 | Home Berm | 0.821 | R 59°, 56 m | +10° | +3.0 m | Last banked right before the pan |
| — | Center Camp Kink | 0.911 | R 8°, 139 m | +3° | +0.2 m | Nearly home, nearly flat |
| — | Grid Kink | 0.992 | R 19°, 92 m | 0° | 0 m | On the start line — unbanked by rule |

Start/finish guarantees: elevation is 0 and bank is 0 from u 0.93 through u 0.03.

## Banking rationale

Per-corner constants from radius and entry speed. Reference check with
`bankDeg = clamp(atan(v²·κ/g) × 0.55, ±28°)`: the formula saturates on the
Whiteout Hairpin and asks 10–16° at Overlook Exit; authored values take that
ordering into a 3–13° band. Berms justify their banks physically — a packed
dust bank *is* a banked wall, so T3 keeps the full 13° the formula's ordering
suggests, the hottest bank on the track at its tightest corner. Deviations:
the two kinks (+3° — leans, not corners) and the Grid Kink (0°, start rule).
Camera rolls at 0.7× the road roll.

## Set pieces on the racing line

- **The Man** at the centre — the Overlook Berm (u 0.47–0.67) is the lap's
  one raised sightline to him: from its crest he clears the eye line while
  everything else on the playa falls below it.
- **The whiteout section** at u 0.30 swallows the hairpin's entry — with the
  downhill off Berm One, it is the lap's one genuine brake-on-faith moment.
- **The wandering dust devil** at u 0.55 sits on the Overlook crest.
- **Item rows** at u 0.10 / 0.27 / 0.44 / 0.61 / 0.78 / 0.93 — u 0.27 is on the
  berm crest (a boost off the back, into the whiteout, is a decision), u 0.61
  is on the Overlook descent.
- Dressing note: lap-anchored dressing grounds itself through `terrainHeightAt`
  (shared `atLap`/`anchorGroup` + scatter heights), so art cars, shade
  structures and the whiteout banks ride the berms with the road.

## Design audit (Mario Kart research criteria)

- **Cadence:** 27 decision events (bends + elevation inflections + item rows +
  signs + set pieces). Worst gap 174 m ≈ **4.4 s at 40 m/s** (the run home) —
  inside the 3–5 s cadence, no gap over 6 s. The long southern arc is carried
  by the climb itself: crest, dust devil, and two item rows break it up.
- **Undulation:** elevation range **8 m** (0 → +8), ≈11.5 m climbed and
  descended per lap — the bottom of the 8–15 m target, *by design*: this is
  the sparse track, and its honesty is the point. (Silicon Valley is 13 m,
  Mars 15 m; the playa is 8 m of berms and means it.)
- **Banking:** authored 3–13°, formula-checked above; 0° on the start straight.
- **Road width:** 22 units ≈ 7–8 kart widths — unchanged.
- **Landmark:** the Man — and the Overlook Berm is the authored sightline:
  the one place on the lap where he stands above the driver's eye line.
- **Shortcut verdict: NONE — deliberately.** The closest non-adjacent approach
  is 130 m (u 0.293 ↔ 0.382, across the north infield), and karts are
  corridor-clamped to 16 m of the centreline. On an open playa a cut is just
  driving across dust at the 0.55× deep-offroad factor — the corridor makes
  it a punishment, not a shortcut. Leave no trace; take no cut.
- **Slope physics:** grade feeds top speed at ±8% — the Overlook climb is the
  slowest honest sector on the playa; the rollers home pay it back in pieces.
