# Bahamas Crypto GP — Track Design

**Layout:** 1,698 m closed loop, 13 spline control points, 9 bends (7 right,
2 left). A Nassau beachfront loop with two climbs: a causeway and a courthouse
hill. The profile data lives in `TRACK.elev` / `TRACK.bank` in `tracks/bahamas.js`
as hand-authored keyframes `[u, value]` (u = lap fraction), interpolated by the
shared circular monotone cubic — shared machinery, authored numbers.

## Reference frames (viewed, per Roger's standing rule)

- **`mkw-water.jpg` (MK World river)** — the coastal grammar: a hard
  two-colour script (teal water against vermilion canopy — nothing in the
  frame is a third colour for long), a continuous stone embankment wall
  as the course edge, and lantern strings hung *over* the road on cables,
  so the air above the course is part of the set. Bahamas translates the
  script: teal sea against sand and whitewash, the causeway as the
  embankment, palms as the canopy.
- **`mk8-desert.jpg` (Bone-Dry Dunes)** — secondary, for the causeway
  itself: a raised sculpted road ribbon crossing open ground, with the
  hero set piece (there, a train; here, a yacht and a ruined HQ) staged
  beside the racing line at mid-frame height.
- **Staging observation:** the water frame's course is aimed at its set
  pieces — you drive *toward* the embankment bend and the lantern canopy,
  never past anonymous shore. Both Bahamas climbs are staged the same
  way, and both check out against the spline. The collapsed HQ is in the
  windscreen for the causeway climb's approach (u 0.34–0.39, down to 37°
  off-axis at 125 m) — you drive at the ruin, then pass it *below* the
  deck edge at the crest (u 0.46, inside, −53 m lateral). And the
  courthouse is dead ahead for the entire second climb: in the forward
  view continuously from u 0.62 to u 0.74, reaching 0° off-axis at
  85 m out — the law sits in the middle of your windscreen for twelve
  seconds of racing before you arrive at its steps. That is the
  embankment-bend trick, verbatim: the destination is the view.

## Elevation story

- **Sector 1 — Sea Level (u 0.00–0.36), 0 → +1.5 m.** The beachfront is flat
  because it is a beach: past the blank-nameplate HQ row (u 0.115–0.205) and
  through a three-bend esses (0.179 / 0.248 / 0.313) with only a token rise.
  The yacht EFFECTIVE ALTRUISM bobs offshore to the east, at the altitude
  yachts prefer.
- **Sector 2 — The Causeway (u 0.36–0.62), +1.5 → +8 → +3.5 m.** The road
  climbs onto a causeway over the marina inlet: +6.0 at the u 0.44 item row
  (a boost mid-climb is worth real time), cresting at **+8.0 m at u 0.50 —
  the lap's high point** — with the collapsed exchange HQ alongside at
  u 0.46, visibly *below* the road that outlived it. Sea on the left,
  ruins on the right. Then the causeway steps down (+6.5 at u 0.55) to the
  brass-plate banks row (u 0.60–0.684), which sits on its own little rise —
  even the doors to nowhere are elevated here.
- **Sector 3 — Courthouse Hill (u 0.62–1.00), +3 → +7.5 → 0 m.** A second,
  separate climb — because the law does not share a hill with the market.
  From the banks the road rises again (+5.0 at u 0.74), past the Subpoena
  left (u 0.782, taken at +7.1 m, still climbing), to the **courthouse at
  u 0.80, +7.5 m** — the building literally looks down on the whole lap.
  Immediately after it, the **Courthouse Hairpin (u 0.834, R 83°, 31 m —
  the tightest corner in this batch)** wraps the hilltop at +14° bank,
  and the lap falls home: +3.5 at u 0.88, sea level by u 0.93, past the
  Effective Altruism Conference Centre's single folding chair (u 0.955).

## Corner by corner

| # | Name | u (apex) | Dir / angle / min radius | Bank | Elev at apex | Intent |
|---|------|----------|--------------------------|------|--------------|--------|
| — | Beachfront Kink | 0.088 | R 8°, 154 m | +3° | 0 m | A lean on the flat beachfront |
| T1 | Alameda Right | 0.179 | R 55°, 56 m | +10° | +0.5 m | Esses entry, past the HQ row |
| T2 | Shell Company | 0.248 | L 44°, 61 m | −10° | +1.0 m | The esses flip — bank through the u 0.214 crossover |
| T3 | Effective Right | 0.313 | R 65°, 46 m | +12° | +1.5 m | Esses exit — the last flat corner before the causeway |
| T4 | Causeway Crest Kink | 0.476 | R 5°, 158 m | +2° | +7.5 m | A breath at the top — the view (sea, HQ ruins) is the event |
| T5 | Brass Plate | 0.623 | R 63°, 56 m | +10° | +3.5 m | The banks-row corner, on the causeway's tail |
| T6 | Vibes Kink | 0.708 | R 14°, 107 m | +5° | +3.6 m | A lean in the valley between the two climbs |
| T7 | Subpoena | 0.782 | L 40°, 63 m | −9° | +7.1 m | Taken *while climbing* Courthouse Hill — brake uphill, trust the bank |
| T8 | Courthouse Hairpin | 0.834 | R 83°, 31 m | +14° | +7.0 m | The batch's tightest corner gets its max bank, wrapped around the courthouse steps |

Start/finish guarantees: elevation is 0 and bank is 0 from u 0.93 through u 0.04 —
the grid and the EA Conference Centre (u 0.955) sit at sea level.

## Banking rationale

Per-corner constants from radius and entry speed. Reference check with
`bankDeg = clamp(atan(v²·κ/g) × 0.55, ±28°)`: the formula saturates at 28° on
the Courthouse Hairpin (31 m) and T3, and asks 12–18° through the esses;
authored values take that ordering into a 2–14° band, with the hairpin at the
band's top — a courthouse steps switchback earns its wall. Deliberate
deviations: **T4** (+2° — a 158 m crest kink on a bridge deck; causeways are
flat on top, that's what makes them causeways) and the Beachfront Kink (+3°).
Camera rolls at 0.7× the road roll; karts sit square on the surface.

## Set pieces on the racing line

- **The collapsed exchange HQ** at u 0.46 — the causeway crest looks *down* on
  it. Structurally unsound, both ways; now also topographically.
- **The courthouse** at u 0.80 crowns its hill — `UNITED STATES v. BANKMAN-FRIED`
  is the last thing you read before the hairpin.
- **The brass-plate banks** (u 0.60–0.684) ride the causeway's descent rise.
- **Item rows** at u 0.10 / 0.27 / 0.44 / 0.61 / 0.78 / 0.93 — u 0.44 is
  mid-causeway-climb, u 0.78 is at the foot of Courthouse Hill (a boost up
  to the law is a genuine decision).
- **Landmark:** the courthouse on its hill (second half) and the yacht
  EFFECTIVE ALTRUISM offshore (first half) — you navigate by whoever is
  currently winning, the market or the law.
- Dressing note: lap-anchored dressing grounds itself through `terrainHeightAt`
  (shared `atLap`/`anchorGroup` + scatter heights), so palms, umbrellas and
  the HQ row ride the causeway and the hill with the road. The sea stays at
  sea level — some things even a bull market can't lift.

## Design audit (Mario Kart research criteria)

- **Cadence:** 31 decision events (bends + elevation inflections + item rows +
  signs + set pieces). Worst gap 144 m ≈ **3.6 s at 40 m/s** (the run home) —
  inside the 3–5 s cadence, no gap over 6 s.
- **Undulation:** elevation range **8 m** (0 → +8), ≈12.5 m climbed and
  descended per lap across two separate climbs — inside the 8–15 m target.
- **Banking:** authored 2–14°, formula-checked above; 0° on the start straight.
- **Road width:** 22 units ≈ 7–8 kart widths — unchanged.
- **Landmark:** the courthouse on Courthouse Hill (above).
- **Shortcut verdict: NONE — deliberately.** The closest non-adjacent approach
  is 120 m (u 0.796 ↔ 0.884, across the courthouse infield), and karts are
  corridor-clamped to 16 m of the centreline. The one tempting line — cutting
  the hairpin's arm — is 120 m of courthouse lawn at the 0.55× deep-offroad
  factor. The court finds that line in contempt. Time here is won on the
  causeway climb and the hairpin, not a cut.
- **Slope physics:** grade feeds top speed at ±8% — two climbs per lap tax,
  the long descent home from the courthouse pays with interest.
