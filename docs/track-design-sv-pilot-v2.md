# Silicon Valley pilot v2 — real geography, not a parking garage

**Status: DESIGN ONLY, for Roger's approval before any build** (the WeWork
pattern: doc first, approval, then a build PR held to the checklist in §10).
Part of #135. This reworks the Silicon Valley pilot from
`docs/track-design-levels-v3.md` after Roger's rejection of its centrepiece.

> Roger (Nov 13, 2026, on #135): *"I don't like the parking garage idea,
> let's try to figure out how we could actually drive on the Golden Gate
> Bridge or incorporate some part of the Stanford campus or Sandhill Road
> or something like that. We can do better."*

## 0. What happened to the v3 pilot — read this first

**Removed, permanently:** the parking-garage helix crossover (centre
(−128, 30), r 24, rising 3.0 → 12.5 m over its own entry lane). It is not
kept as an option, a fallback, or a phase 2. The pilot's signature moment
now comes from real geography: the Golden Gate deck crossing (#168), a
Stanford campus precinct, and/or Sand Hill Road.

**Retained, exactly as specced** (Roger did not reject these): the
Founder's Fountain island split on the home straight and the two existing
grass cuts formalized as boost-gated `shortcuts[]` entries. Their full
spec is restated in §2, because of the next point.

**A documentation problem the fleet should know about:** the merged v3
doc on main is *truncated*. `docs/track-design-levels-v3.md` ends mid-
sentence at "## 2. The v3 track standard (principles) — 1. **Two to
four" followed by a literal `[truncated 9113 chars]` marker baked into
the file. The audit (§1 of that doc, through §1.5) is intact, but §2's
remaining principles, the per-track table, and **§5 — the pilot spec
itself — never landed on main**; they survive only as the summary in
issue #135's body. Nothing in this doc quotes §5, because there is no §5
to quote: the retained elements are restated here in full from the issue
summary and the intact audit sections (§1.1 island-split pattern, §1.5
balance method), so the pilot spec is whole again in this document.

**Re-anchoring:** the v3 pilot was specced against the pre-#168 spline.
The #168 reroute inserts the bridge excursion after cp 1, so every
control-point reference after cp 1 shifts by +1. **All cp numbers in
this doc are POST-#168 numbering** (15 control points, cp 0–14; the
campus options add one more, cp 0–15). §8 lists every cp-anchored gag
the reroute and this pilot touch.

**Governing standard (unchanged):** 2–4 route decisions per lap; split
sides within ~0.3 s of each other; cuts lose ≥ ~0.5 s unboosted and gain
~0.5–1.5 s boosted (v3 §1.5 balance method); sim no FAIL, rescues
< 2/race, spread < 20 s, mini-turbos > 0.

## 1. The lap as it stands after #168 (the ground truth this composes with)

Post-#168 spline, measured with a Catmull-Rom estimator validated
against the v3 audit's probe (estimator 1,120 m vs probe 1,119 m on the
current main spline — estimates below are ±~1%):

| # | Sector | cp span | ~m | y profile | What's there |
|---|--------|---------|-----|-----------|--------------|
| S1 | Home straight & grid | 14→1 | 166 | 0 | Start gantry "START-UP LINE", grandstands both sides, pivot tower (125, 72) facing the straight, NOW HIRING sign infield at (92, 46) |
| S2 | **The Golden Gate** (#168) | 1→3 | 170 | 0 → 4.5 → 8 | Deck cp 1.45–3.12 (`bridges`), towers at cp 2.08 / 2.72, toll gantry "BRIDGE TOLL: YOUR EQUITY" at cp 1.52, guardrails 0.85, boost pad mid-deck cp 2.45, robotaxi ring at the exit (cp 2.95) |
| S3 | East shore climb | 3→5 | 224 | 8 → 5 → 10 | Container micro-lofts (cp 4.05), **Hoover Tower beside cp 4.0**, open meadow side cp 3.3–4.6 (cut 2 corridor) |
| S4 | The Highlands | 5→8 | 243 | 10 → 13.5 → 15.5 → 15 | Unicorn HQ + valuation board (cp 5.9), esses, crest |
| S5 | The Downhill | 8→10 | 179 | 15 → 8.5 → 3 | Ramp jump cp 8.25, scooter graveyard (cp 8.8), grass cut corridor cp 9.2–10.6 (cut 1) |
| S6 | Chicane & the garage | 10→13 | 206 | 3 → 0.5 → 0 | 15-min standup (cp 10.85), startup garage outside the chicane (cp 11.55) |
| S7 | Final corner & run home | 13→14 | 83 | 0 | Flip-sign HQ "WE'RE HIRING! / LAYOFFS" (cp 13.05) |

**Post-#168 lap: ≈ 1,271 m, ≈ 40 s/lap** at the current field pace
(35.1 s over 1,119 m today). The bay itself: a strait on the **east**
side, axis (186, −140) → (200, −45) → (212, 20), floor −5.5, water
−1.4 — it runs from a basin south of the loop up to the infield's east
edge. So the map's geography is: **bay end = south-east** (home
straight → deck → far shore), **highlands = north**, **the west side
(downhill, chicane) faces the Ring/pond infield** — the Ring HQ at
(−40, 102) around its pond, ring band outer edge ≈ x −120 on the west.

Schematic (not to scale; the tables are authoritative — x east →, z north ↑):

```
 z
 214 ┤            ╭─ CREST 15.5 ─╮
 168 ┤      ╭─────╯  HIGHLANDS   ╰──╮  unicorn HQ
 106 ┤ RING◯ ╭╯   esses            ╰─╮ SAND HILL climb (S3)
 102 ┤ (-40,102) pond        PIVOT   │  HOOVER TOWER beside cp4
  72 ┤        infield      (125,72)  │
   0 ┼─S/F════════ home straight ════╪═╗ deck entry cp1.45
 -26 ┤  final corner        NOW      ║ ║ GOLDEN GATE DECK y8
 -52 ┤   ╰── chicane/garage ──╯      ║ ║ over the BAY (axis x≈200)
-140 ┤   (west = campus in A/C)      ║ ╚═ bay basin
     └──┬────┬────┬────┬────┬────┬───┬──→ x
      -196 -140  -70    0   95  162  246
```

The lap already reads as a tour — SF bay in the south-east, VC country
up the east shore, highlands north, campus-flavoured infield west. The
pilot's job is to make the **west** and the **east climb** live up to
the bridge: real places you drive *through*, not boards you drive past.

## 2. The retained elements (full spec, post-#168 anchors)

### 2.1 Founder's Fountain island split — home straight (S1)

Per the v3 audit §1.1 pattern 1 (island split: widen the ribbon, solid
island in the middle, both sides full-speed road — no engine change):

- **Where:** cp 14.6 → 0.9 on the home straight, centred ≈ (15, −2).
  Widen asymmetrically toward the infield (`wl` +7, `wr` +2; total
  ≈ 26 m) so the grandstand side barely moves.
- **The island:** the Founder's Fountain — a solid monument island
  ≈ 55 m long, ≈ 7 m wide: a tiered fountain with a statue of The
  Founder (hoodie, one finger up — "number one"), water running, a
  plaque: **"THE FOUNDER (HE FUNDED THIS)"**. Solid collision, like
  any obstacle; a kart cannot cross it.
- **Inside line** (infield/north side — the shorter way round):
  **coins**, no item row. **Outside line** (grandstand/south side):
  **item row + boost pad** at the island's exit end. Faster side
  carries the risk (narrower, no items), slower side carries the
  reward — per v3 §1.5.
- **Balance:** lone-rival timing per §1.5 (two throwaway def variants
  with the island shifted to force each side): **sides within 0.3 s**
  over the stretch.

### 2.2 The two grass cuts, formalized

Both cuts exist today as geometry (open `sides[]` entries) but have no
`shortcuts[]` entry, so the AI never takes them (v3 §1.1's inventory:
SV has none). Formalizing = `shortcuts[]` entries with `boost: true`,
polylines ridden on the terrain under them, `hoarding: false` and
overlapping drivable areas per the authoring guide:

- **Cut 1 — the downhill cut** (post-#168 `sides` cp 9.2–10.6, side L,
  outer 30): across the grass on the way down, past the scooter
  graveyard. Path ≈ 60% of the road distance it skips.
- **Cut 2 — the meadow cut** (post-#168 `sides` cp 3.3–4.6, side L,
  outer 26): across the open meadow on the east shore climb. In
  Options B/C this meadow *is* the Sand Hill VC campus lawn — the cut
  runs across the firms' front lawns, which is the joke and the route
  in one.
- **Balance (both):** unboosted ≥ 0.5 s *slower* than the road;
  boosted 0.5–1.5 s *faster*; AI takes them only with a boost in hand
  (the `boost: true` gate), counted in `k.stats.shortcuts`.

## 3. Option A — "The Farm" (Stanford campus loop replaces the chicane)

**One-sentence version:** the west sector (S6) stops being a chicane
past a garage and becomes a campus you drive through — down Palm Drive,
around the Oval, through the Main Quad's colonnade — while the east
side stays exactly as #168 leaves it.

### 3.1 Routing (replaces post-#168 cp 11–13; lap becomes 16 cps)

| cp | Position | y | Role |
|----|----------|---|------|
| 10 | (−192, 104) | 3 | Downhill sweeper exit — unchanged |
| 11 | (−158, 92) | 1.5 | **Palm Drive gate** — the lap swings infield (east); the standup gag relocates to the gate ("OFFICE HOURS: MINUTE 15 OF 15") |
| 12 | (−150, 22) | 0 | **Palm Drive south end** — cp 11→12 is ≈ 71 m of dead-straight avenue, palms both sides every ~10 m, bunting strung over the road |
| 13 | (−172, −28) | 0 | **The Oval** — the road arcs west around the fountain green (green centre ≈ (−124, −16), an oval lawn with its own smaller founder fountain; the startup garage stays at its current spot, now outside the Oval's west arc) |
| 14 | (−104, −50) | 0 | **The Quad run** — east along the campus's south edge; the colonnade pinch (§3.2) sits on this segment |
| 15 | (−70, −8) | 0 | Final-corner exit — unchanged (post-#168 cp 14) |

Clearances, checked against the real map: the avenue at x ≈ −150
runs ≈ 22 m west of the Ring band's outer edge (x ≈ −120) — no clash,
and the terrain fn's ring/pond shaping has zero influence out there
(avenue points sit > 45 m beyond the ring blend radius). The scatter
campus blocks and oaks must be excluded from the precinct footprint
via `taken[]` entries (checklist §10.1).

### 3.2 The Quad pinch — the sector's technical moment

On cp 13→14, for ≈ 40 m the road narrows to **14 m** (from 17) between
two sandstone arcade facades — the Main Quad: repeating arches on both
sides, a Memorial-Church-style facade dead ahead as you enter (the
hero in the frame), red tile roofs, students scattering. The arches
pass *overhead* at the pinch's entry and exit (two full arch spans
across the road). This replaces the chicane as the lap's slow,
technical, walls-do-the-braking moment — but where the chicane was
anonymous, the pinch is a postcard.

### 3.3 Sector table (Option A lap)

| # | Sector | cp | ~m | Change |
|---|--------|-----|-----|--------|
| S1 | Home straight + **Fountain split** (§2.1) | 15→1 | 166 | Split added |
| S2 | Golden Gate (#168) | 1→3 | 170 | Untouched |
| S3 | East shore climb | 3→5 | 224 | Untouched (cut 2 formalized in its meadow) |
| S4 | Highlands | 5→8 | 243 | Untouched |
| S5 | Downhill | 8→10 | 179 | Cut 1 formalized |
| S6a | Palm Drive | 10→12 | 112 | **NEW** |
| S6b | The Oval | 12→13 | 57 | **NEW** |
| S6c | The Quad + run home | 13→15→0 | 200 | **NEW** (pinch + final corner) |

**Lap: ≈ 1,278 m (+7 m vs post-#168 — the precinct is length-neutral),
≈ 40 s/lap.**

### 3.4 Elevation

The precinct is flat (y 3 → 0): real Palm Drive is flat, and the lap's
height story stays bridge (8) → climb (10) → crest (15.5) → dive.
The precinct's verticality is architectural — palm canopy, bunting,
arches overhead, the church facade — not terrain. Disclosed plainly:
Option A adds **no new elevation moment**; it spends its budget on
place and on one new driving texture (avenue straight → fast oval arc
→ narrow pinch).

### 3.5 Route decisions (Option A)

1. Fountain split (S1) — formal.
2. Cut 1, downhill (S5) — formal, boost-gated.
3. Cut 2, meadow (S3) — formal, boost-gated.

Plus a *soft* line choice at the Oval: coins on the inside arc, a
boost pad on the outside arc — line, not a split; not counted.
**Total formal decisions: 3** (band 2–4 ✓).

### 3.6 Budget & risks

- **Draw calls:** palms reuse the existing instanced palm meshes
  (+0–2); colonnade arches instanced (+2); Quad facades + church baked
  into the existing bake buckets (+4–6); Oval green + fountain (+4);
  fountain-split island (§2.1, all options) (+5). **Est. +15–20 over
  the post-#168 count** — the cheapest geometry option.
- **Risks:** (a) spline surgery re-anchors every west gag — §8's table
  is the mitigation, and the build is held to it; (b) removing the
  chicane removes a slow sector — the Quad pinch (14 m, walled) is the
  replacement technical moment, and the checklist requires mini-turbos
  > 0 and no AI wedging at the pinch across the sim field; (c) the
  avenue is a long straight — it earns its place as a drafting/
  slipstream + item-use straight with the Oval as its payoff, and at
  ≈ 71 m it is shorter than the home straight; (d) Hoover Tower stays
  on the east climb in this option (see §5.3 for the relocation
  question).

## 4. Option B — "Sand Hill Road" (the VC row is the climb)

**One-sentence version:** no spline surgery at all — the east shore
climb (S3) becomes Sand Hill Road: a dip, a real climb to a summit
crest, and the VC row lining both sides, with Hoover Tower as the
thing you drive toward.

### 4.1 Elevation re-profile (the lap's new elevation moment)

Only `y` changes, at two control points:

| cp | Position | y now (post-#168) | y in Option B | Note |
|----|----------|-------------------|----------------|------|
| 3 | (246, −26) | 8 | 8 | Far-shore deck exit — unchanged |
| 4 | (214, 106) | 5 | **3** | **The Dip** — the road falls away off the shore; "SAND HILL ROAD" street sign at the low point |
| 5 | (158, 168) | 10 | **13** | **Partner Summit** — a genuine crest: +10 m over ≈ 150 m of spline, peak pitch ≈ 11–12% (shipped norms allow far worse — Davos runs 26%); from the crest you see the highlands ahead and the bay/bridge behind |
| 6 | (84, 150) | 13.5 | 13.5 | Esses — unchanged; the summit flows into them |

The climb now costs time going up and pays it back off the crest —
the v1 SV design doc's Sector-2 idea ("the lap climbs to the money")
finally true on this spline. The lap's y-span is unchanged (0–15.5);
what changes is that the east side *uses* its span as a climb instead
of a ramp onto a shelf.

### 4.2 The VC row (dressing, hero scale — not board spam)

- **Firm boards**, both sides, cp 3.3–4.9, sized to the lead's track
  bar (readable at climb speed, hero scale): **SEQUOIA — TERM SHEETS
  THIS WAY →**, **A16Z — SOFTWARE IS EATING THE WORLD (AGAIN)**,
  **BENCHMARK — FOUNDER FRIENDLY\* (\*TERMS APPLY)**,
  **KHOSLA — WILLING TO BE WRONG IN PUBLIC**.
- **Three low office-park HQ slabs** on the outside (east) of the
  climb, set back 25–35 m: glass, low, landscaped — the Sand Hill
  look — each with a small firm sign at its drive.
- **Partner-meeting gag at the summit overlook** (beside cp 5.0): a
  glass conference pod on the crest edge, spectators inside around a
  whiteboard — **"PARTNER MEETING — DO NOT DISTURB (THE VIEW)"** —
  placed so the summit frame is: pod, tower, bay behind.
- **Hoover Tower stays beside cp 4.0** and becomes the climb's aim
  point: you crest the dip and the tower is what you're driving at
  (its "THE FARM · PARKING $47" sign already ties it to Stanford).
- **Cut 2 becomes the lawn cut:** its corridor crosses the firms'
  front lawns — sprinklers on, a groundskeeper shaking his fist.
  The cut, the joke, and the place are the same thing.

### 4.3 Sector table (Option B lap)

Identical to the post-#168 table in §1 except S3: **S3 Sand Hill Road,
cp 3→5, 224 m, y 8 → 3 → 13**, VC row both sides, summit crest at
cp 5. Plus the retained §2 elements (split on S1, both cuts).
**Lap: ≈ 1,271 m (unchanged), ≈ 40 s/lap** (the climb may cost
~0.3 s uphill, repaid off the crest — a sim-measured number the build
PR must report, not an estimate to trust).

### 4.4 Route decisions (Option B)

The same 3 formal decisions as Option A (split + two cuts) — this
option adds **no new decision**; it adds an elevation moment and a
place. That is its strength (cost, risk) and its weakness (the west
sector stays the lap's thinnest driving).

### 4.5 Budget & risks

- **Draw calls:** boards ride the existing sign atlas (+1–2); HQ
  slabs baked (+3–4); conference pod (+3). **Est. +7–10** — the
  cheapest option overall, and zero spline risk.
- **Risks:** (a) it is the closest of the three to "dressing on a
  climb" — the re-profile is what saves it from the charge Roger
  levelled at the drive-under bridge, and if the summit doesn't
  *feel* like a crest in the contact sheet, this option has failed
  on its own terms (checklist §10.6 names the summit frame); (b) the
  steeper climb shifts braking zones into cp 5–6 — sim must show no
  new rescue spots; (c) board readability at climb speed is a hard
  gate (text-check + contact sheet), not a hope.

## 5. Option C — "The Full Tour" (A + B, staged) — RECOMMENDED

**One-sentence version:** build both — the campus precinct in the
west and Sand Hill Road in the east — in two separately-gated phases,
so the lap becomes a literal tour of the Valley: **bay → VC row →
highlands → campus → home**, with the bridge as its first signature
and the Quad pinch as its last.

### 5.1 What ships, in what order

- **Phase 1 — The Farm (Option A complete):** campus precinct spline
  surgery + Quad pinch + Oval + Palm Drive, the §2 retained elements
  (fountain split, both cuts formalized), §8 re-anchoring. Phase 1
  alone is a complete, approvable pilot: signature sector, 3 route
  decisions, sim green.
- **Phase 2 — Sand Hill Road (Option B complete):** the two-point
  y re-profile, VC row, summit pod, lawn-cut theming. Profile +
  dressing on a spline Phase 1 doesn't touch east of cp 3, so the
  phases cannot collide; Phase 2 gates on its own sim + summit frame.

### 5.2 Combined numbers

| | Post-#168 | Option A | Option B | **Option C** |
|--|-----------|----------|----------|--------------|
| Lap length | ≈ 1,271 m | ≈ 1,278 m | ≈ 1,271 m | **≈ 1,278 m** |
| Lap time (est.) | ≈ 40 s | ≈ 40 s | ≈ 40 s | **≈ 40 s** |
| Formal route decisions | 0 | 3 | 3 | **3** |
| New elevation moment | bridge deck | — | Sand Hill crest | **Sand Hill crest** |
| New driving sector | bridge | campus precinct | — | **campus precinct** |
| Draw calls (est. over post-#168) | — | +15–20 | +7–10 | **+22–30** |
| Spline surgery | (#168's) | west only | none | **west only** |

Draw-call budget for the build (whichever option): **≤ post-#168
lap-1 count + 70, and ≤ 300 absolute at 1280×720** (post-#164 the
track ran 208–211; there is headroom, and the cap keeps anyone from
spending it silently). Tris delta reported in the build PR.

### 5.3 The Hoover Tower question (decided here so it can't drift)

The tower is Stanford's landmark, and it currently stands beside the
east climb (PR #164 placed it there; #168 keeps it at cp 4.0). Three
treatments were considered: move it to overlook the Quad (truest to
the real campus — the tower really does stand by the Quad), keep it
on the climb, or duplicate it (rejected — one tower, one landmark).
**In Options A and C it stays on the climb**: it is already placed,
it is the Sand Hill climb's aim point, and the Quad's hero is its
arcade and church facade. Moving it is a one-line follow-up if Roger
wants purity over continuity — flagged here as his call, not buried.

### 5.4 Why C, and why staged

- **Fun first:** the pilot exists because the lap's *driving* was
  thin. Only A/C add a new driving sector, and they add it where the
  lap is thinnest (the anonymous chicane) — a straight that rewards
  drafting, a fast arc, and a narrow pinch are three new textures,
  none of which the lap has today.
- **Readability:** every new sector is a real place a player can name
  from the kart — Palm Drive's palms, the Quad's arches, Sand Hill's
  firm boards under the tower. That is the exact quality Roger asked
  for ("figure out how we could actually drive on…") and the quality
  the lead's track bar measures (a readable joke every ~5 s; §10.6
  holds the build to it sector by sector).
- **Build cost & risk:** one spline surgery (west), one two-point
  profile change (east), everything else on proven machinery —
  island split and `shortcuts[]` are existing patterns (v3 §1.1),
  palms/arches/boards are existing prop systems. Staging means a
  Phase-2 slip can never sink Phase 1.
- **Why not A alone:** it leaves the east climb as the lap's last
  under-achiever — a 224 m sector whose y-profile does nothing —
  when the fix is two numbers and a row of boards.
- **Why not B alone:** cheapest, but no new driving; on its own it
  is the option most exposed to Roger's "we can do better."

## 6. How the recommended option composes (the whole lap, one story)

Reading the Option C lap as a player lives it: grid under the pivot
tower → **the Fountain split** (first decision, 10 s in) → swing
south and **onto the Golden Gate deck** (#168: towers, cables, water
both sides, a boost mid-span) → off the far shore, past the frozen
robotaxis, **down the Sand Hill dip and up the VC row** (tower ahead,
firm boards both sides, the lawn cut tempting on your left) → Partner
Summit crest → highlands esses and the unicorn → the crest jump →
the dive down the west side (grass cut across the graveyard slope) →
**Palm Drive** (palms, bunting, slipstream) → **the Oval** (coins
inside, boost outside) → **the Quad pinch** (arches overhead, church
ahead, walls close) → final corner under the flip-sign HQ → home.

- **Route decisions: 3 formal** (split, cut 1, cut 2) + the Oval's
  soft line choice — inside the v3 band of 2–4, spread across the
  lap (S1, S3, S5) rather than stacked in one sector.
- **Signature moments: 3** (deck crossing, Sand Hill crest, Quad
  pinch) + the retained crest jump — one per ~30% of the lap.
- **#121 lap-by-lap show: untouched.** The pivot billboard, valuation
  board, unicorn slump, layoff sign + cones and final-lap crowd
  thinning all sit on sectors this pilot either doesn't touch or
  re-anchors per §8; checklist §10.10 makes the build prove it.
- **What this pilot deliberately does NOT do:** no crossover (the
  bridge is the lap's vertical event; a second one is garnish), no
  branch ribbons (engine feature, v3 §6 — not needed: every decision
  here is an island split or an earned cut), no change to the deck
  span #168 built (bridges cp 1.45–3.12, rails, towers all as merged).

## 7. Mario Kart reference citations

Frames viewed in `~/workspace/research_notes/mk-reference/` with
`ANALYSIS.md`; the conversions below name the pattern and the frame
it comes from.

- **Palm Drive (avenue read)** — ANALYSIS pattern 2, *continuous edge
  dressing* ("the eye always has a riverbank guiding it forward"):
  the MK World river frame's unbroken stone embankment and the Moo
  Moo Meadows frame's unbroken fences become, here, unbroken palm
  rows at ~10 m spacing on both sides for the avenue's full 71 m —
  no gaps, no scatter. Pattern 7, *the air above the road is used*
  (the river frame's lantern strings hung over the road): bunting
  strung across Palm Drive, and the Quad's arches passing overhead —
  vertical space as part of the course, not just beside it.
- **The Quad pinch (hero read)** — pattern 3, *one hero set piece
  dominates every frame* (the Rainbow Road frame's MARIOKART arch;
  the city frame's neon sign building): the Memorial-Church facade
  sits dead ahead on the pinch's entry sightline, so the whole
  sector is driven *toward* one big themed thing, and the arch spans
  rhyme with #168's toll gantry at the deck entry — two arches a
  lap, both earned. Pattern 4, *oversized toy-like scale*: the
  Founder statue and the summit conference pod are specced at hero
  scale, not architectural scale.
- **Sand Hill climb (hill-climb read)** — pattern 3 again, applied
  vertically: the climb is aimed at a landmark the whole way up
  (Hoover Tower over the dip, the conference pod on the crest), the
  way the farm frame aims its road at the barn/windmill cluster;
  pattern 1, *the road is never naked*: firm boards and HQ drives
  give the climb's surface a story at kart height, not just at the
  roadside. The profile itself follows the v3 audit §1.3 (authored
  y is cheap; spend the span on a climb *and* a crest, not a shelf)
  and this track's own design lineage (the v1 SV doc's Sector 2:
  "the lap climbs to the money, then falls off a cliff").
- **The Fountain split** — the v3 audit §1.1's citation stands: MK
  World's wide river surface, the field spreading around rocks on
  one surface, is the island split's grammar.

## 8. Re-anchoring table (cp-anchored dressing the build must move)

Post-#168 anchors are what #168's merge leaves; Option A/C renumber
the west (cp 11+ becomes the precinct). Every entry below must be
re-anchored or explicitly confirmed unmoved in the build PR — this
table is how the #121 show survives the surgery.

| Dressing | Post-#168 anchor | In Option A/C |
|----------|------------------|----------------|
| 15-min standup gag | beside cp 10.85 | Palm Drive gate, beside new cp 11.1 — gag kept, sign gains "OFFICE HOURS" kicker |
| Startup garage | beside cp 11.55 | **Coordinates unchanged** — it now sits outside the Oval's west arc; board kept verbatim: "IT STARTED IN A GARAGE / NOW VALUED AT $3B" |
| Flip-sign HQ (HIRING/LAYOFFS) | beside cp 13.05 | Beside the Quad run, new cp ≈ 13.6, south side — still faces karts exiting the sector toward the final corner |
| Boards at cp 10.95 / 11.7 / 12.4 / 13.5 | west + final corner | Re-anchor along the precinct (avenue exit, Oval, Quad exit, final corner) — same strings |
| Palm rows cp 11.0–13.6 | final-corner palms | Subsumed by Palm Drive's rows; any surplus rows move to the Oval arc |
| Item row cp 12.5 (n: 3) | chicane exit | Quad exit, new cp ≈ 14.6 |
| Coins cp 13.1–13.6 | run home | Unchanged in spirit — re-anchor to new cp 14.1–14.6 |
| Boost pad cp 13.9 | before the line | Unchanged (new numbering ≈ 14.9) |
| Cypress rows cp 5.1–7.4, 9.2–10.9 | climb + downhill | Unchanged |
| NOW HIRING / layoff sign (92, 46), pivot tower (125, 72), Ring, pond, rocket (286, 96) | fixed coordinates | **Untouched** — coordinate-placed, not cp-placed |

Phase 2 (Sand Hill) re-anchors nothing: its boards and slabs are new
placements, and Hoover Tower / container lofts keep their post-#168
anchors (cp 4.0 / 4.05).

## 9. Prop & model deliverables (named here so they can't drift)

Build phase, per option — all from existing prop systems unless noted:

- **Founder's Fountain island** (all options): tiered fountain,
  Founder statue, plaque sign, coin arc inside / item row + boost
  outside (§2.1).
- **Palm Drive** (A/C): instanced palms both sides (existing
  `P.palm` variants), bunting strings over the road, avenue entry
  sign — **PALM DRIVE** with kicker "THE FARM".
- **The Oval** (A/C): oval lawn island (terrain-flat green, low
  hedge edge), a second smaller fountain at its centre, coin arc
  inside / boost pad outside.
- **Main Quad pinch** (A/C): sandstone arcade facade builder (one
  arch module, instanced), two full arch spans over the road,
  Memorial-Church-style facade, red tile roofline, **THE QUAD**
  sign with kicker "GO CARDINAL (THE COLOR. AND THE BIRD. IT'S
  COMPLICATED.)" — sign strings in the build must match this doc or
  be changed here first.
- **Sand Hill row** (B/C): four firm boards (§4.2 strings verbatim),
  three office-park HQ slabs with firm drive signs, "SAND HILL
  ROAD" street sign at the dip, summit conference pod + whiteboard
  ("PARTNER MEETING — DO NOT DISTURB (THE VIEW)"), lawn sprinklers
  on cut 2's corridor.
- **Hoover Tower:** unmoved (§5.3).

## 10. Verification checklist — the build PR must pass ALL of these

*In the WeWork style: if any line fails, the build is not "nearly
the pilot" — it goes back. Phase 1 and Phase 2 each pass the lines
that apply to them; the pilot is complete only when all lines pass.*

0. **Anchors.** Built on the merged #168 tree. Every cp reference in
   §§1–9 re-verified against the merged `silicon-valley.js`; if
   #168's merged spline differs from §1's table, the build PR opens
   with a corrected anchor table, not silent drift.
1. **Layout.** `tools/track-map.mjs` shows: the deck crossing, no
   chicane, the campus precinct (Options A/C); lap length
   1,240–1,320 m; no ribbon self-intersection; the precinct stays
   ≥ 15 m clear of the Ring band; Palm Drive's avenue within ±3 m
   of the §3.1 centreline (x ≈ −150, z 22–92).
2. **Height profile.** y at every control point within ±0.3 m of the
   chosen option's table (§3.1 / §4.1); no grade anywhere > 12%
   except the existing crest-ramp zone; the #168 deck span
   byte-identical in the track data (`bridges` 1.45–3.12, rails
   0.85, tower cps 2.08 / 2.72).
3. **The split.** Island solid (a kart cannot cross or mount it);
   island ≥ 45 m long; lone-rival timings per v3 §1.5: **two sides
   within 0.3 s**; coins on the inside line only, item row + boost
   pad on the outside line only.
4. **The cuts.** `shortcuts[]` entries exist for both cuts with
   `boost: true`; lone-rival timings: **unboosted ≥ 0.5 s slower
   than the road, boosted 0.5–1.5 s faster**; sim shows shortcut
   count > 0 at normal difficulty.
5. **Sim.** `node tools/sim.mjs --quick` (and `--track
   silicon-valley`): no FAIL; rescues < 2/race (target ≤ 1);
   spread < 20 s; mini-turbos > 0; lap avg 38–43 s; no new rescue
   cluster at the Quad pinch or the Sand Hill crest.
6. **Contact sheet.** 10 frames (`auto=1&intro=0&seed=4`, ~5 s
   apart): a readable joke in ≥ 7 frames; mandatory frames — the
   deck mid-span (from #168's set, still true), Palm Drive with
   palms both sides + bunting overhead, the Oval with its fountain,
   the Quad pinch with arches in the frame's upper third, the Sand
   Hill summit with Hoover Tower + one firm board readable (B/C).
7. **Phone.** 844×390 frames on Palm Drive and in the Quad pinch:
   the sector reads at phone size (palms + bunting; arches +
   church), no HUD-critical occlusion.
8. **Text.** `tools/text-check.mjs` clean for the track; every new
   sign string matches §9 / §4.2 verbatim.
9. **Performance.** Draw calls ≤ post-#168 lap-1 count + 70 and
   ≤ 300 at 1280×720; tris delta vs post-#168 reported in the PR.
10. **The #121 show intact.** With `&laps=1`: pivot billboard runs
    JUICE → AI → KARTS with the final footer, valuation board
    $1B → $2B → $0, unicorn slumps, NOW HIRING → LAYOFFS AT 3PM with
    the cone cordon, grandstand crowd thins on the final lap — all
    still trigger after the surgery.
11. **Gates.** `node tools/bot.mjs` "bot: ok"; full sim --quick
    pass across all tracks (no cross-track regression from any
    shared-code change — this pilot should need none).
12. **Screenshots in the PR + in chat**, per Roger's standing rules,
    including a before/after pair for the west sector (chicane →
    campus) and for the climb (shelf → Sand Hill crest, B/C).

## Appendix — measurement method

Lap lengths are Catmull-Rom spline integrals over the control-point
tables quoted in §§1–4 (estimator validated: 1,120 m computed vs
1,119 m probe-measured for the current main spline, v3 audit §1.1).
Sector lengths are per-segment integrals of the same spline. Lap
times scale the current field pace (35.1 s / 1,119 m, sim average
post-#155) by length; the build's sim numbers supersede every
estimate in this doc. Post-#168 anchors were read from the #168
build's working tree against PR #164's merged file; checklist line 0
exists because #168 had not merged when this doc was written.
