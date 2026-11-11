# Bliss GP — Track Design

**Layout:** 1,628 m closed loop, 12 spline control points, 9 corners (8 left, 1 right).
The teardrop: a start/finish line at the tip of a hairpin, a long northbound start
straight, one continuous left-hand sweep around the west and north, a southern edge
that crosses in front of the grid, an eastern rise, a tight north-east hairpin, and a
long diagonal return through the middle. The profile data lives in the Bliss def's
`elev` / `bank` in `tracks/bliss.js` as hand-authored keyframes `[u, value]`
(u = lap fraction), interpolated by a circular monotone cubic — the machinery is
shared system, the numbers below are the design.

**This is the calm track, on purpose.** Bliss is the breather between Mars and the
Datacenter — the XP wallpaper made drivable. Its elevation exists to make the
meadows breathe, not to throw the kart around, and its numbers deliberately bend
the usual guidance (documented in the audit below).

## Reference frames

**Primary: `mk8-farm.jpg` (MK8 Moo Moo Meadows, dusk) — Bliss's reference track.**
What was taken from the frame: the hero cluster (barn + windmill + silo) sits dead
ahead in the driving sightline with an item-box arc strung across the road in
front of it, unbroken fences run both edges into the distance, one sculpted round
tree stands oversized beside the cluster, and the whole composition is held in a
warm graded sky. Nothing in the frame is decoration at random — the road, the
edges and the hero are one composition. (*ANALYSIS.md* patterns 2, 3, 4.)
Secondary: `mk8-desert.jpg` for the layered-silhouette backdrop (mesas at three
haze depths) — the register Bliss's hill ring should sit in on the art pass.

**Staging observation (elevation):** Moo Moo puts its hero in the sightline and
its item arc right before it; Bliss stages the same reveal with height. Sector 1
stays dead level so the countdown frame reads like the farm frame — grid,
crossing road in the mid-ground, hero hill centred beyond — and the first item
row (u 0.10) sits on the first rise, arcing over the road against the hill
exactly where the farm's boxes arc against the barn. The lap's answering reveal
is the +5.0 m crest at u 0.68: like the farm's exit rise, it is the one place the
whole farm — here the whole teardrop — is visible at once before the descent.

## Elevation story

One idea: **the road rolls like the wallpaper hill — a series of long, low swells,
each one placed under a corner or a view, never under the start complex.**

- **Sector 1 — The Postcard (u 0.00–0.14), 0 → +1.5 m.** Dead level through the
  start/finish tip and the crossing arm's sightline (see the junction note below),
  then the gentlest of rises up the start straight past Clippy (+0.8 m by the first
  item row) into the North Kink. The countdown camera's composition — grid, crossing
  road in the mid-ground, hero hill centred beyond — is untouched: everything in
  its frame sits at 0–1.5 m.
- **Sector 2 — The Western Swells (u 0.14–0.45), +1.5 → +3.0 m.** The long left
  sweep is a roller in miniature: a +2.5 m shoulder under the Northwest Sweeper,
  a soft hollow (+1.3 m) mid-west-side, a second swell to +3.0 m cresting at the
  Southwest Sweep. No crest hides anything here — Bliss has no blind corners; every
  rise is a view, not a trap.
- **Sector 3 — The Crossing Dip (u 0.45–0.58), +3.0 → +0.2 → +1.3 m.** The southern
  edge settles as it approaches the start-line junction, bottoming at +0.2 m where
  it crosses the start/finish arm, so the junction reads as one meadow crossroads
  at one height — then lifts away again on the far side.
- **Sector 4 — The Bliss Hill (u 0.58–0.96), +1.3 → +5.0 → 0 m.** The lap's one
  real hill, saved for the east: a long rise through the Southeast Sweep to the
  **+5.0 m crest at u 0.68** — the highest point of the lap, placed so the whole
  teardrop, the hero hill and the BSOD grandstand are in frame at once — a dip to
  +3.4 m, a last shoulder (+3.8 m) carrying the Postage Hairpin, and a long,
  settling descent down the return diagonal that is dead level by u 0.96.

## The junction at the start (read before touching this profile)

The plan geometry nearly touches itself twice near u 0: the southern edge crosses
the start/finish arm at ≈(0, 191), about 4 m past the line, and the return diagonal
passes ≈25 m from the start straight at u 0.975/0.025. Both arms are therefore held
at **elevation 0 and bank 0** across u 0.96–0.06 and u 0.50–0.55 respectively. Any
future profile change must keep the two arms height-matched at the crossing or the
ribbons will step through each other.

## Corner by corner

| # | Name | u (apex) | Dir / angle / min radius | Bank | Elev at apex | Intent |
|---|------|----------|--------------------------|------|--------------|--------|
| T0 | The Tip | 0.000 | R 160°, 13 m | +5° | 0 m | The start/finish hairpin tip — the lap's only right and its tightest corner. The +5° is the Mars Gantry-Kink exception: a whisper of bank at the line itself, 0° from u 0.04 and behind the grid from u 0.955 |
| T1 | North Kink | 0.143 | L 36°, 101 m | −5° | +1.5 m | The wake-up bend off the straight; the first swell crests here |
| T2 | Northwest Sweeper | 0.206 | L 62°, 58 m | −10° | +2.5 m | The west arc's main load; banked against the shoulder swell |
| T3 | West Shoulder | 0.269 | L 51°, 74 m | −9° | +1.9 m | The arc continues over the hollow's far lip |
| T4 | Westside | 0.346 | L 42°, 98 m | −7° | +1.7 m | XP error dialog corner — gentle, sightseeing pace |
| T5 | Southwest Sweep | 0.423 | L 28°, 163 m | −5° | +3.0 m | Broad and serene over the second swell; the turn onto the southern edge |
| T6 | Southeast Sweep | 0.637 | L 26°, 182 m | −5° | +4.2 m | The Bliss Hill climb made steerable — a lean, not a wall |
| T7 | East Rise | 0.713 | L 40°, 93 m | −7° | +3.6 m | Kink on the hill's far side, "Automatic Updates" dialog trackside |
| T8 | Postage Hairpin | 0.791 | L 124°, 17 m | −13° | +3.8 m | The one serious corner: a stamp-sized hairpin on the shoulder, max bank on the track, entry in plain sight off the dip |
| — | Return Diagonal | 0.81–0.96 | near-straight | 0° | +2.3 → 0 m | The long exhale home past the BSOD screen; level before the junction |

Start/finish guarantees: elevation is 0 and bank is 0 from u 0.96 through u 0.04
(the tip's +5° peaks *at* the line, decaying both ways — the grid rows sit at ≤2°);
the crossing arm is at +0.2 m / 0° through u 0.50–0.55.

## Banking rationale

Per-corner constants, chosen from corner radius and entry speed, smoothed over
±4 samples so transitions breathe. Reference check with the standard feel formula
`bankDeg = clamp(atan(v²·κ/g) × 0.55, ±28°)`: at kart speeds the formula saturates
at 28° on T0, T2 and T8 and wants 15–25° on the mid corners. The authored band
(−13…−5°, plus the tip exception) takes the formula's *ordering* into the calm
track's register: Bliss banks to be felt in the camera roll (0.7×), not to pin the
kart to a wall. Tightest corner (T8, 17 m) gets the max, broad sweepers (T5/T6,
160–180 m) get the least — the ordering is the formula's, the magnitude is the
track's personality.

## Set pieces on the racing line

- **The hero hill** — the sculpted wallpaper hill dead ahead of the grid at
  (60, −198); the countdown camera (pos [0, 6, 248] → look [46, 16, −198]) frames
  it over the crossing road. Untouched by this pass and verified in the PR
  screenshot: the composition survives because Sector 1 stays at 0–1.5 m.
- **Clippy** at u 0.038 on the start straight, bobbing on the flat — its podium,
  bubble and the BSOD screen (u 0.969) all sit in the level start complex.
- **Item rows** at u 0.10 / 0.27 / 0.44 / 0.61 / 0.78 / 0.93 — u 0.44 sits on the
  Southwest swell (a boost cresting it is free speed), u 0.78 is the hairpin's
  doorstep.
- **Dressing follows terrain:** the module's `at()` helper now anchors props to
  `terrainHeightAt`, so the XP dialogs (u 0.333 at +1.7 m, u 0.687 at ≈+4.9 m)
  ride the swells instead of sinking into them.

## Design audit (Mario Kart research criteria)

- **Cadence:** 20 decision events (9 corners + 5 elevation inflections + 6 item
  rows). Worst gap ≈147 m ≈ **3.7 s at 40 m/s** (hairpin exit → last item row) —
  inside the 3–5 s cadence, no gap over 6 s.
- **Undulation — deliberate deviation:** elevation range **5.0 m** (0 → +5.0),
  below the 8–15 m guideline. This is the documented exception for the calm
  track: the wallpaper composition, the height-matched start junction, and the
  brief ("serene, not extreme") all cap the swells. What the lap gives up in
  range it keeps in motion: ≈19.8 m of total climb+descent per lap across nine
  swells and dips, max grade ≈2.9% — the road never sits still, it just never
  shouts. If a future pass wants more drama here, the Southeast Hill is the
  sector to grow — not the start complex.
- **Banking:** authored −13…+5°, formula-checked above; 0° across the grid.
- **Road width:** 22 units ≈ 7–8 kart widths — unchanged.
- **Landmark:** the hero hill (above).
- **Shortcut verdict: NONE — and the near-touch is a junction, not a cut.** The
  southern edge crosses the start arm ~4 m past the line: hopping arms there
  crosses the start/finish zone and skips ≈1,600 m, which lap validation voids —
  it is a crossroads, not a shortcut. The return diagonal's 25 m approach to the
  start straight (u 0.975 ↔ 0.025) is the tip hairpin's own entry/exit pair. This
  pass keeps both arms at matched 0 m height so no ramp or step exploit is
  introduced. Bliss' time is won by carrying speed over the Bliss Hill, not by
  cutting the meadow.
- **Slope physics:** grade feeds top speed at ±8% (factor 1.6 × grade, capped) —
  on Bliss the effect is a whisper (±4% at most): the swells are for the eyes
  and the camera, and the racing stays about line and items. By design.
