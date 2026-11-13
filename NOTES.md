# Capitol reflecting pool ROUND 3 (#140) — notes

## Task
Rebuild Capitol Hill Climb's reflecting pool so it is UNMISTAKABLY the Washington
DC Reflecting Pool. Roger on round 2 (PR #129): "not recognizable as the
Washington DC reflecting pool... search online for actual photos... The carts
should probably race right along the edge."

## Research — the real pool (web, Nov 13)
- Lincoln Memorial Reflecting Pool: 2,028 ft (618 m) long x 167 ft (51 m) wide
  -> ratio ~12:1. Shallow: 18 in edges / 30 in centre. Built 1922-23, Henry Bacon.
- On the Mall axis between Lincoln Memorial (west) and Washington Monument
  (east); the monument mirrors in the water looking east.
- Granite edging/coping + walkways both sides; lined by walking paths and
  double rows of elm trees on BOTH long sides; WWII Memorial at the east end.
- Sources: en.wikipedia.org/wiki/Lincoln_Memorial_Reflecting_Pool;
  ihitthebutton.com photo essay; Alamy photo descriptions.
- MK reference viewed: mkw-water.jpg (water right at the course edge, stone
  embankment wall = continuous "riverbank" guide, ANALYSIS.md pattern 2) +
  ANALYSIS.md (hero set piece dominates the frame; oversized toy scale).

## Why round 2 failed (from capitol2-pool.png + code)
- POOL {x0:171,x1:203,z0:64,z1:214}: 32 m wide x 150 m = 4.7:1 (real 12:1).
- West edge 7.5 m of grass apron from road edge (road edge x~163.5, pool 171).
- Water material: roughness .12 / envMapIntensity 1.3 -> at driver height it
  mirrors the peach sky and reads as a pale apron, not water; basin floor is
  lawn-green "sand" colour. Algae mats read as blobs on dry ground.
- Obelisk (113,236) far off the pool axis (pool centre x=187); no coping rim,
  no tree rows flanking the basin -> no formal-basin read.

## Base decision
- Task pins base dfb7325460. Main had advanced to 16b73fd1 (8 commits: PRs
  #112/#131/#156/#157) by start; compare shows NO overlap with the capitol
  files, so branching from dfb7325460 merges cleanly and matches the task's
  sim baseline. Disclose in PR body + report.

## Browser lock
- Held by "tooling-116 verify" since 15:29:19Z (chrome alive) — captures wait
  for the lock; sim/code work proceeds (headless Node).

## Plan
- New POOL: hug road's left edge (x0 ~167), width ~24, length ~172 (z 56..228)
  -> ~7.2:1. Pale stone COPING frame at waterline on all 4 edges (new prop),
  gravel walk strip far side, double ELM rows far side, balustrade kept behind
  walk. Keep algae gag: green water (deepen to murkier), more mats biased to
  west edge, scum strips, ducks repositioned inside new bounds, big sign at
  south end (approach), small sign mid-pool at closest pass.
- POOL is exported from capitol-hill.js and consumed by terrain fn + decorate;
  keep depth -1.4 and terrain.water -0.95 (sim behaviour unchanged in kind).

## Recon hiccup (resolved)
- First recon pass silently fetched a partial tree (646 of 836 blobs; per-blob
  SHA audit found 536 missing, 0 differing). Fill-in pass re-downloaded every
  missing/mismatched blob with per-blob SHA assert. Final audit = ground truth:
  all 836 blobs present, SHA-identical (git write-tree differed only because
  of my uncommitted local files; per-blob audit is the reliable check).

## Design (final, pending probe numbers)
- POOL = { x0: 167.5, x1: 191.5, z0: 56, z1: 228, depth: -1.4 } (24 x 172 m,
  7.2:1) IF probe shows max left-edge x on the run <= ~165. Probe:
  probe-pool.mjs prints centreline/left-edge/terrain cross-sections.
- NEW prop poolBasin() in props-capitol-hill.js: one ModelBuilder group =
  pale-stone COPING frame (4 boxes, 2.2 m wide, top y ~-0.52, i.e. 0.43 above
  water -0.95, base buried in basin slope) + end APRONS (pale slabs at both
  squared ends) + dark LINER slab just above basin floor (kills the
  lawn-green floor read under the 0.88-opacity water). 2 materials = 2 calls.
  Placed at pool centre via sc.place with explicit y=0 (geometry in world Y).
- Elms: replace the cherry rows east of the pool (was POOL.x1+10/+17) with
  TWO rows of green P.roundTree elms at x1+8 / x1+15, z z0-4..z1+4 step ~11,
  jitter; instanced via existing partsOf pattern, filtered by ok().
  Plus a sparse west-side row x~140, z 62..128 (before the Mall shortcut
  zone), filtered by ok() — the near row of the real Mall's elm allées.
- Algae mats 46 -> 64, ~40% biased within 6 m of the WEST edge (driver side).
- Ducks -> (174,96), (183,148), (176,202). Small sign -> in the west
  shallows (POOL.x0+5, 150) so it stands at the closest pass; big sign stays
  at the south end (auto-follows POOL centre/z0). Balustrade/lamps follow
  POOL.x1 automatically.
- look.water stays 0x527a2c (round-2 green; complaint was recognizability).
- Draw calls: basin +2, elms swap cherries 1:1, mats instanced (same calls).
  Expect ~817 vs 815 aerial baseline (cap +5% = 855).

## Implementation (done, pending captures)
- POOL final: { x0: 167, x1: 191, z0: 56, z1: 228, depth: -1.4 } (24 x 172, 7.2:1).
  Probe: max road left-edge x on the run = 164.90 (z~116).
- KEY MECHANISM: the terrain conform (track.js grid build) blends the track's
  terrain fn toward the road plane over `blend` m past the shoulder (default
  16) — that is why round 2's waterline sat ~13 m from the asphalt no matter
  where POOL was. Fix within track data: sides entry for the pool run gains
  `blend: 2` (per-side opt-in, blendSide). Probe after: waterline x ~169-172
  along the run (asphalt edge 160-165) — water now starts a few m past the
  shoulder for the whole run; basin floor -1.4 from x~171-175.
- poolBasin() prop: coping frame (cw 3.2, top -0.5) with asymmetric centre
  lines (west -w/2+1.9, east +w/2+0.4) matching the conform-shifted waterlines
  (measured: W waterline 169-172, E ~190.3; coping spans W 167.3-170.5,
  E 189.8-193.0 — water laps the stone on both sides) + dark liner at -1.33.
- Balustrade far side 204.6 -> POOL.x1+5.5 = 196.5 (bank past lamps at 194.5).
- Elms: far rows x1+8 / x1+15 step 11 (was cherries +10/+17); near row
  x=131.5, z 64..128. roundTree seeds 21/22, greens.
- Mats 46 -> 64 (26 biased to x0+3..x0+9.5); strips moved inside the copings
  (x0+4.2 / x1-2.4); ducks (177,96) (184,148) (175.5,202); small sign moved
  from far side to the west shallows (x0+5, 150) = closest pass.
- Diff: 2 files, +58/-17 (capitol-hill.js, props-capitol-hill.js). Nothing
  else touched: ballroom/BSOD/signs/water colour all as round 2 left them.

## Verification so far
- Baseline (pristine clone): capitol 6 races — winner 126.2, lap avg 44.2,
  best 36.2, MT 58, rescues 0.3, wall 1, Mall cuts 49.
- After edits: capitol 6 races DIGIT-IDENTICAL to baseline. sim --quick:
  exit 0, zero FAIL (all tracks).
- Captures + text-check WAITING on browser lock (tooling-116 since 15:29Z,
  chrome alive — not stale). BEFORE frames will come from the pristine
  worktree ~/workspace/bk-capitol-pool3-pristine.

## STAND-DOWN / HANDOVER (Nov 13, ~16:19Z) — READ THIS FIRST
The lead (back in session) ordered the support fleet to stand down on #140
(its comment on #140 at 16:04Z: track design now goes only to Opus owners,
one per track file). This work was therefore STOPPED before captures/PR.
State handed over:
- Code COMPLETE and sim-verified (see above), committed locally and pushed
  to branch `wip/capitol-pool3-handover` (parented on dfb7325460). NO PR was
  opened, per the stand-down.
- NOT done: before/after captures, text-check, draw-call count. Reason: the
  single-browser lock was held by the #116 tooling agent from 15:29Z onward
  (chrome alive throughout, never stale, so never taken). The capture script
  is banked in the clone (capture-pool3.mjs, uncommitted): run it against the
  handover tree for AFTER and against the pristine worktree
  ~/workspace/bk-capitol-pool3-pristine for BEFORE, lock permitting. It takes
  approach/run/mid race-height frames at 1280x800, run+approach at 844x390,
  and a full-track aerial that prints renderer.info draw calls (round-2
  baseline: 815; expect ~817, cap 855).
- A full PR body draft is banked as pr-body.md in the clone (research,
  diagnosis, numbers, screenshot slots) if the lead's owner wants it.
- THE key finding for whoever owns capitol-hill next: you cannot move this
  pool by editing POOL alone — the terrain conform in src/track/track.js
  blends the terrain fn toward the road plane over `blend` m past the
  shoulder (default 16), which pins the waterline ~13 m off the asphalt.
  The per-side `blend` opt-in in sides[] is the lever (used here: blend: 2).
  All waterline/coping numbers in this file were MEASURED off the built
  heightfield with probe-pool.mjs (banked in the clone), not guessed.
