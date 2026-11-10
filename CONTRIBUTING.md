# Contributing — Billionaire Kart (agent workflow)

This repo is built by a team of AI agents coordinated from Roger's chat. These rules are standing orders from Roger.

## Branches & pushes
- Work on your own `wip/<area>` branch in your own clone. Commit early and often.
- ALL GitHub writes go through the PAT helper: `python3 ~/workspace/custom-connectors/custom.github-pat/bin/gh.py push <repo_dir> <branch> [msg]` (Git Data API; binary files OK). Do NOT use the old GitHub connector push tools (they raise an approval card per call) and do NOT use SSH (the VM egress proxy blocks it).
- The integration pass (every ~15 min) mirrors WIP branches, merges to `main` in order gameplay → graphics → tracks/polish, and only pushes `main` when `tools/bot-test.mjs` passes on the merged tree.

## Issues
- The GitHub Issues list is the backlog. Reference issue numbers in commit messages (`#7`) when a commit addresses one.
- New work that is not on the list gets an issue first (create via `gh.py api POST /repos/OkGoDoIt/Billionaire-Kart/issues`).

## Pull requests — SCREENSHOTS REQUIRED (Roger's rule, Nov 10 2026)
- Every pull request MUST include screenshots showcasing what changed or what the new feature looks like. No exceptions for visual/gameplay work; for pure-infrastructure PRs, include the most relevant visual evidence available (test output image, before/after, or the affected screen).
- How: capture screenshots (desktop 1280x800 and, for anything touching HUD/controls/menus, mobile landscape 932x430), save them in the repo under `screenshots/pr-<pr-or-branch-slug>/` on your branch, and embed them in the PR body with raw URLs, e.g. `![Menu](https://raw.githubusercontent.com/OkGoDoIt/Billionaire-Kart/<branch>/screenshots/pr-xyz/menu.png)`.
- A PR without screenshots is incomplete and will be sent back.
- Also include in the PR body: what changed, the bot-test result, and `Closes #<issue>` lines for the issues it completes.

## Definition of done
- `tools/bot-test.mjs` passes with zero console/page errors.
- Screenshots taken and attached per the PR rule.
- Commit messages say what changed and reference issues.
