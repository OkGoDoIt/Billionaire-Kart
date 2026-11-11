# Boring Tunnel GP — Track Design

**Layout:** 1,222 m closed loop, 11 spline control points, 5 corners (all right —
a clockwise bore). A rounded-rectangle loop entirely inside the arched shell: a
start portal straight, a west wall, a north wall, an east wall carrying the
loop-the-loop ring, and a south wall home. The profile data lives in the Tunnel
def's `elev` / `bank` in `tracks/tunnel.js` as hand-authored keyframes `[u, value]`
(u = lap fraction), interpolated by a circular monotone cubic — the machinery is
shared system, the numbers below are the design.

## Reference frames

**Primary: `mk8-desert.jpg` (MK8 Bone-Dry Dunes, golden hour)** — for the two
moments this track has an exterior at all: the portal mouths. The frame's mood
is a committed golden-hour grade with mesa silhouettes layered at three haze
depths and the road visibly *carved* into sculpted terrain (the bermed corner,
sand spilling over the edge). That is the grammar the start portal and the crown
sector (u 0.72, the shallowest cover, closest to daylight) should read in on the
art pass: a lit, warm mouth against the bore's dark. Inside, the same frame's
lesson runs inverted — the desert's road is never a naked strip in a void
(*ANALYSIS.md* patterns 1–2), and neither is the bore: shell, ribs, guide strips
and chasing light panels are the continuous edge dressing, which is why they all
had to be made to follow the profile (see the implementation note below).
Secondary: `mk8-mountwario.jpg` for descent staging — crest first, then the drop
reveals what is below, edges marked the whole way down.

**Staging observation (elevation):** Mount Wario stages a descent as
crest-then-reveal, the road falling away under you with markers on both edges.
The Portal Dive is staged the same way, inverted: the bore mouth is the crest,
the −4.8% pitch is the reveal, and what it reveals — dead ahead at the bottom
of the dive, lit by the converging light strips — is the landmark, the Boring
Machine chewing at −6 m. The dive's grade was authored to the machine for
exactly this: you don't pass the set piece, you *descend to* it.

## Elevation story

A real bored tunnel is not a rollercoaster: it **dives to running depth, runs
level, and climbs back out.** The profile is exactly that shape, and the grades
exist for tunnelling reasons, not thrills — which is why the long level deep
section is a feature here, documented rather than apologised for.

- **Sector 1 — The Portal Dive (u 0.00–0.16), 0 → −6 m.** Dead level across the
  grid and the countdown framing (the module's fixed camera looks down the bore
  from behind the grid), then the bore drops: −3.5 m by the Portal Bend's exit,
  bottoming at **−6 m running depth at u 0.164 — exactly at the Boring Machine**,
  which is chewing the wall at the deepest point of its own tunnel. The dive is
  the steepest grade on the track (≈4.8%) and the lap's one vertical event with
  real commitment: you brake downhill, in the dark, into T1.
- **Sector 2 — The Deep Run (u 0.16–0.45), −6 → −4.5 m.** ≈350 m at or near
  running depth along the west and north walls — the longest level sector in the
  game, and thematically the point: this is the part of the tunnel that is just
  *tunnel*. It breathes almost imperceptibly (−6 → −5.6 → −5.2) so the road
  never feels like a rail, and the climb is already quietly beginning under the
  north-wall ceiling fan (u 0.45).
- **Sector 3 — The Climb & The Ring (u 0.45–0.66), −4.5 → +1.8 m.** The bore
  climbs out: past the loop-the-loop ring at u 0.522 (you drive *through* the
  ring uphill at −1.9 m, the ring and its sign now riding the grade with the
  shell), cresting the wall between the NE bend and the east wall.
- **Sector 4 — The Crown & The Settle (u 0.66–1.00), +2.2 → 0 m.** The lap's
  high point is the **+2.2 m crown at u 0.72** over the east wall — the shallow
  cover above the bore, the closest this track gets to daylight. From there a
  long settling descent down the SE bend and the south wall brings the road dead
  level by u 0.97, so the portal, the grid and the countdown framing sit flat.

## Corner by corner

| # | Name | u (apex) | Dir / angle / min radius | Bank | Elev at apex | Intent |
|---|------|----------|--------------------------|------|--------------|--------|
| T1 | Portal Bend | 0.083 | R 47°, 100 m | +8° | −2.8 m | The bend at the bottom of the dive's first pitch — bank catches the kart as the grade steepens under it |
| T2 | Boring Bend | 0.273 | R 77°, 83 m | +11° | −5.7 m | The deep corner: tightest radius on the track at full running depth, NOT A FLAMETHROWER trackside; max bank |
| T3 | Ring Climb Bend | 0.546 | R ~90°, 114 m | +9° | −1.2 m | The NE bend taken mid-climb, ring just behind you — banking rises with the road |
| T4 | Crown Bend | 0.830 | R ~75°, 124 m | +9° | +1.6 m | The SE bend on the settle off the crown; the descent does the braking |
| T5 | Home Kink | 0.932 | R 25°, 163 m | +5° | +0.2 m | The gentle close back into the portal straight — level, lit, home |

Start/finish guarantees: elevation is 0 and bank is 0 from u 0.97 through
u 0.045 — the grid, the portal mouth and the countdown camera's fixed framing
(pos [−33.8, 6.5, 184.6] → look [−99, 2.5, 148]) sit on the flat.

## Banking rationale

Per-corner constants from radius and entry speed, smoothed over ±4 samples.
Reference check with `bankDeg = clamp(atan(v²·κ/g) × 0.55, ±28°)`: at kart speeds
the formula saturates at 28° on all five corners (the bore's radii, 83–163 m,
are all tight at 35–44 m/s), so the authored band (+5…+11°) again takes the
formula's *ordering* — tightest corner (T2, 83 m) hottest, the broad Home Kink
coolest — scaled to what reads as a banked tunnel floor rather than a velodrome.
T1's +8° is deliberately a step below T2's: it is taken on the dive's grade, and
bank + downgrade together already load the kart. Camera rolls at 0.7× road roll;
inside the shell the roll reads against the light strips, which is why this
track's banks sit mid-band — the walls make small angles obvious.

## The shell follows the road (implementation note)

Elevation is only real in a tunnel if the tunnel moves. The module's arch strip
now builds every ring vertex on the authored plane — `s.y + lat × rollNormal.y` —
so the shell, ribs and guide strips dive, run deep and climb exactly with the
road surface, and `at()` anchors every prop (light panels, ceiling fans, the
Boring Machine, the ring, all signage) to the same banked plane. On a flat
profile this reduces to the old coordinates, so the change is invisible until
the profile says otherwise. Without it the road would have sunk 6 m out of its
own tunnel at the Boring Machine.

## Set pieces on the racing line

- **The Boring Machine** at u 0.164, at the bottom of the dive — the grade was
  designed *to* it: you descend to the machine, not past it.
- **The loop-the-loop ring** at u 0.522, straddling the climb — still visual
  only, now honestly uphill.
- **Ceiling fans** at u 0.122 (on the dive), u 0.45 (climb start) and u 0.778
  (the crown settle) — each now hangs from the shell at its local height.
- **Item rows** at u 0.10 / 0.27 / 0.44 / 0.61 / 0.78 / 0.93 — u 0.10 sits on the
  dive (a boost downhill is a decision, not a reflex), u 0.27 is Boring Bend's
  doorstep at full depth, u 0.61 rewards the climb.
- **Landmark:** the ring — the only vertical exclamation in a horizontal world,
  visible down the north wall as the climb begins.

## Design audit (Mario Kart research criteria)

- **Cadence:** 16 decision events (5 corners + 5 elevation inflections + 6 item
  rows). Worst gap ≈155 m ≈ **3.9 s at 40 m/s** (Boring Bend → the climb's
  inflection under the north wall) — inside the 3–5 s cadence, no gap over 6 s.
  The deep run's calm is carried by the chasing light strips and the fan, not
  by decisions, which suits a tunnel.
- **Undulation:** elevation range **8.2 m** (−6 → +2.2) — the bottom of the
  8–15 m band, by design: a bore earns its depth once and holds it. Total
  climb+descent per lap ≈15.4 m (6 down, 7.7 up, 2.2 down), and the *grades*
  are honest tunnelling grades (dive ≈4.8%, climb ≈2–2.8%).
- **Banking:** authored +5…+11°, formula-checked above; 0° on the start straight.
- **Road width:** 22 units ≈ 7–8 kart widths — unchanged (the shell's clearance
  is unchanged: the arch rides the same plane as the road).
- **Landmark:** the loop-the-loop ring (above).
- **Shortcut verdict: NONE — there is one bore.** The closest non-adjacent
  approach of the centreline is 91.9 m (u 0.238 ↔ 0.316, across the NW corner's
  infield), and every metre of the lap is inside the same shell: a cut would
  need a second bore. Recorded with the obvious joke intact: **the shortcut is
  still being dug** — the Boring Machine at u 0.164 is working on it. If a
  future layout wants a gated cut here, the NW infield is where the second
  bore goes.
- **Slope physics:** grade feeds top speed at ±8% (factor 1.6 × grade, capped) —
  the dive pays ~7% into Portal Bend and the climb taxes the whole north wall:
  the tunnel's race is won by whoever brakes latest at the bottom and carries
  most speed up the Ring Climb.
