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
- Parody only: nothing presented as fact about a real person. Trackside signs, sponsors, and props use parody names, never a real company's logo or trademark. The one exception is the racer portraits, where each character wears their company's mark as a small pin or pendant, by the owner's decision.

## Before you open a pull request

```bash
node tools/sim.mjs --quick      # every track: no FAIL lines
node tools/bot.mjs              # menus to results in a real browser: prints "bot: ok"
node tools/bot.mjs --mobile     # the same at phone size with touch
```

All three must pass, and the screenshots must have been looked at by whoever made the change.
