# Billionaire Kart: design notes

**The pitch.** A kart racer in the mould of the genre's best: easy to pick up, items that keep the pack together, real skill in the drifting. The hook is the cast: caricatured tech moguls racing through parodies of their own world.

**Pillars**

1. **Fun before spectacle.** The driving has to feel good with no items and no rivals: hop-drift with three mini-turbo tiers, tricks, slipstream, coins, rocket start. Numbers follow the research in `docs/research/mk-mechanics.md`.
2. **Nobody is out of the race.** Items are weighted by position and by the gap to the leader; rivals rubber-band gently. Leaders defend, chasers attack.
3. **Every track has a moment.** One thing you would describe to a friend, elevation everywhere, corners made for drifting, an earned shortcut, and a change of surface under the wheels. See `docs/track-authoring.md`.
4. **Readable at speed.** Kart about a third of the screen height, horizon near 38%, HUD in the corners, centre clear. Full saturation is reserved for karts, items, and boosts.
5. **Plays anywhere.** Keyboard, four controllers, touch, tilt; one to four players on one screen; quality tiers and dynamic resolution for phones.
6. **Satire, not slander.** Jokes are about public personas and industry tropes. Every brand on a track, a kart, or a sponsor board is an invented parody. The one place a real company logo appears is on a racer's portrait, worn as a pin, patch, or pendant, so you can tell at a glance who is who (sources in `assets/logos/SOURCES.md`). No claims of fact, nothing cruel.

**How the code is organised.** The simulation (`src/race`, `src/track`) has no rendering in it, so whole races run headless at hundreds of times real speed for testing and balance (`tools/sim.mjs`). Rendering mirrors the simulation and reacts to its events. Tracks are data; the engine generates road, kerbs, walls, tunnels, bridges, and terrain from a spline.

**Research.** `docs/research/` holds notes on how the reference games work mechanically, what players and reviewers praise and criticise, and a visual study of their composition, HUD, and track dressing.
