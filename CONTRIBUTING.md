# Contributing

This repo is built by Roger and a team of AI agents. These are the working rules.

## Where things go

- The game is a static site with no build step. `README.md` has the folder map.
- A track is one file in `src/tracks/`, plus optional props in `src/models/props-<id>.js`. Follow [docs/track-authoring.md](docs/track-authoring.md) exactly; it is the contract.
- Art and audio live under `assets/`. Generated assets must be reproducible: add the prompt to the matching script in `tools/`.
- Do not hand-edit generated files (`src/content/faces.js`, `src/content/audio-manifest.js`).

## Branches, issues, pull requests

- Work on your own branch and land through a pull request. Reference the issue number in commit messages.
- New work that is not on the issue list gets an issue first.
- **Every pull request includes screenshots** of what changed (Roger's rule). Save them under `screenshots/` on your branch and embed them with raw URLs. `node tools/shot.mjs` and `node tools/track-shots.mjs` take them without a visible browser.
- Parody only. Brands in track art, sponsor boards, and karts are invented, never real logos or trademarks. The racer portraits are the one exception: each racer wears their own company's logo as a pin, patch, or pendant, which Roger asked for. Do not add real logos anywhere else, and present nothing as fact about a real person.

## Two heavy jobs at a time

On a shared machine, never run more than two builds, browser tests, or simulation runs at once, counting everyone's. Too many at once crashed Roger's computer. The tools below take a slot before they start (`tools/slot.mjs`) and wait when two are already running, so run them as they are, one after another, and never in parallel with `&`. A script that opens a browser must close it, including when it fails.

## Before you open a pull request

```bash
node tools/sim.mjs --quick      # every track: no FAIL lines
node tools/bot.mjs              # menus to results in a real browser: prints "bot: ok"
node tools/bot.mjs --mobile     # the same at phone size with touch
```

All three must pass, and the screenshots must have been looked at by whoever made the change.

If you touched the HUD or the touch controls, or any text painted onto a sign, also run:

```bash
node tools/hud-check.mjs        # the HUD at fourteen screen shapes with the longest text it can show: prints "hud-check: ok"
node tools/text-check.mjs       # sign text on every track: nothing squashed or cut off
```

If you added scenery, props, or a whole track, also run the draw-call check:

```bash
node tools/budget.mjs                       # every track
node tools/budget.mjs --track crypto-cove   # one track
```

### Draw-call budget

Phones are the slowest screens we ship to, and the renderer's cost is mostly draw calls, not triangles. `tools/budget.mjs` loads each track at Medium quality (what a phone gets), parks the player's kart at the start line and at 20, 40, 60, and 80 percent of the lap, lets the race camera settle, and reads one whole frame (shadow pass included). A track is flagged, and the tool exits 1, when any of those five views goes over:

- **800 draw calls** per frame, and
- **1.5 million triangles** per frame.

The numbers are tunable (`--calls`, `--tris`), not walls: if a track needs more to look right, say so in the PR and raise it deliberately. The usual fix is merging static props into one mesh or using instancing. Counts depend on what the camera sees, so the start line (grid, gate, and crowd all in view) and the busiest set piece matter most. Add the table the tool prints to any PR that adds scenery.

Sign text goes through `fitText` in `src/render/textures.js`, not `fillText` with a `maxWidth`, which squashes the letters.
