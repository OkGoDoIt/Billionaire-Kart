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

Sign text goes through `fitText` in `src/render/textures.js`, not `fillText` with a `maxWidth`, which squashes the letters.
