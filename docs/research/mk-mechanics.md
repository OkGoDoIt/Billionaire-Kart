# How recent Mario Kart games work mechanically

Research date: 2026-11-11. Scope: Mario Kart 8 Deluxe (MK8DX, Switch, 2017) and Mario Kart World (MKW, Switch 2, 2025), with Mario Kart Wii, 64, and Double Dash only where they explain a fundamental. This is reference material for an original kart racer; nothing here is meant to be copied as content, only understood as mechanics.

## How to read this document

- **Frames.** All frame counts assume 60 frames per second (1 frame = 16.7 ms). The Japanese analysis blog states the same basis for MK8DX. MK8 drops to 30 fps in 3- and 4-player split screen.
- **Units.** Speeds are in the game's internal "distance units per frame" (u/f). An MK8DX kart tops out at roughly 7.5 to 8.5 u/f at 150cc.
- **Confidence tags.**
  - `[datamined]` values read from game files by the community and published on Super Mario Wiki or the MKWii TAS wiki.
  - `[official]` Nintendo manuals, guides, patch notes, or developer interviews.
  - `[tested]` community measurement (frame counting, repeated trials).
  - `[wiki]` Super Mario Wiki prose (community-edited, usually citing manuals, guides, or datamining).
  - `[guide]` a strategy guide or press article; plausible but not measured.
  - `[analysis]` a design essay; an interpretation, not a statement from the developers.
  - `[unconfirmed]` I could not verify the number; do not build on it without testing.
  - `[derived]` my own arithmetic from a sourced formula or table.
- Terms in quotation marks are labels (community jargon or my own shorthand), not quotations. The document contains one direct quotation, in section 2.3.
- **Disagreements** between sources are called out where they occur.
- A list of everything I could not find is at the end, before the takeaways.

---

## 1. Drifting and mini-turbos

### 1.1 The hop and how a drift starts

- Pressing the drift button makes the kart hop. Holding it while steering starts a drift in the direction you were steering; the kart then follows an arc in that direction until the button is released. `[guide]`
- Steering left or right during the drift widens or tightens the arc; it does not change the drift's direction. Weight and Handling shape the arc. `[guide]`
- A hop is required before a drift in most games. Double Dash has no hop (holding the shoulder button starts the drift). `[wiki]`
- A hop by itself clears small gaps. In MK8 (Wii U), hopping left and right during a boost added speed ("fire hopping"); MK8DX removed that exploit. In MKW a bare hop is described as much less useful than in MK8DX, and holding the button after a hop without steering starts a Charge Jump instead (section 10). `[wiki]`
- **Speed gate.** `[datamined]` A drift (and an automatic drift) can only begin above 55% of top speed, and is held only while speed stays above 50% of top speed.
- Steering of any kind, including in the air, costs speed. Competitive technique is built around this: hop without steering before off-road ("neutral hop"), and start steering only after the wheels land ("delay drift"). `[tested, per VikeMK guide]`

### 1.2 The charge counter (the core of the system)

Since Mario Kart Wii the mini-turbo is a counter that fills every frame of a drift, not a stick-waggle count.

| Game | Fast rate | Slow rate | Fast-rate condition | Thresholds (counter units) |
|---|---|---|---|---|
| Mario Kart Wii | 5 / frame | 2 / frame | lateral stick input at least 0.5 toward the turn | 270 = Mini-Turbo, 570 = Super (blue sparks shown at 148, orange at 448) |
| MK8 (Wii U) | 5 / frame | 2 / frame | same 0.5 rule | 270 = Mini-Turbo, 570 = Super (half-charge sparks at 135) |
| MK8 (Wii U), auto-drift | 2 / frame | 0.8 / frame | same | same (auto-drift charges 2.5x slower) |
| MK8DX | 5 / frame max | 2 / frame | stick more than about 45 degrees from vertical toward the turn | depends on Mini-Turbo stat, see below |
| MKW | not published | not published | minimum angle appears to match MK8DX | identical for every character and vehicle |

`[datamined]` for Wii, MK8, and MK8DX rates and thresholds; the MK8DX stick angle is `[tested]` (VikeMK gives about 45.5 degrees, whoami's research estimates about 44.5 degrees and notes that 30 degrees is the figure commonly repeated, so sources differ).

Consequences worth understanding:

- **Soft drift.** Because any stick position past the threshold charges at the full rate, a player can hold the stick diagonally, take a wider arc, and still charge at 5 per frame. whoami measured the widest full-rate arc at about 1.22 to 1.23 times the radius of a full-lock drift (a full circle took about 267 frames at full lock versus 324 to 328 frames at the soft-drift boundary, 150cc). `[tested]`
- **Neutral or counter-steered drift** charges at 2 per frame, 2.5 times slower, but lets speed recover toward top speed. `[tested]`
- MK8DX's Mini-Turbo stat cannot go below level 6 of 20 in practice, so the bottom rows of the table are unreachable. `[datamined]`

### 1.3 MK8DX tiers: charge time and boost

Three tiers: Mini-Turbo (blue sparks), Super Mini-Turbo (orange), and Ultra Mini-Turbo (purple; called pink in British English). Ultra is unavailable with Smart Steering on. MKW keeps three tiers with rainbow sparks for the top one. `[official]`

`[datamined]` thresholds and boost parameters by Mini-Turbo stat level (in-game bar value in parentheses). Charge times are `[derived]` as threshold divided by 5 (best case) at 60 fps; whoami's published times match (0.933 / 1.967 / 3.000 s at level 1, 0.767 / 1.633 / 2.500 s at level 16).

| MT level | Thresholds (MT / Super / Ultra) | Best-case charge time (s) | Boost length in frames (MT / Super / Ultra) | Boost length (s) | Speed multiplier during boost |
|---|---|---|---|---|---|
| 1 (1.00), unreachable | 280 / 590 / 900 | 0.93 / 1.97 / 3.00 | 21 / 72 / 123 | 0.35 / 1.20 / 2.05 | 1.055 |
| 6 (2.25), lowest reachable | 269 / 568 / 867 | 0.90 / 1.89 / 2.89 | 26 / 82 / 138 | 0.43 / 1.37 / 2.30 | 1.08 |
| 10 (3.25) | 256 / 542 / 828 | 0.85 / 1.81 / 2.76 | 30 / 90 / 150 | 0.50 / 1.50 / 2.50 | 1.10 |
| 14 (4.25) | 240 / 510 / 780 | 0.80 / 1.70 / 2.60 | 34 / 98 / 162 | 0.57 / 1.63 / 2.70 | 1.12 |
| 16 (4.75) | 230 / 490 / 750 | 0.77 / 1.63 / 2.50 | 36 / 102 / 168 | 0.60 / 1.70 / 2.80 | 1.13 |
| 20 (5.75) | 200 / 430 / 660 | 0.67 / 1.43 / 2.20 | 40 / 110 / 180 | 0.67 / 1.83 / 3.00 | 1.15 |

Notes on the table:

- At the slow rate (2 per frame) every charge time is 2.5 times longer: level 1 needs 2.33 / 4.92 / 7.50 s; level 20 needs 1.67 / 3.58 / 5.50 s.
- The speed multiplier is the same for all three tiers at a given stat level. A higher tier buys **duration**, not a higher top speed.
- Mini-Turbo length rises 1 frame per level, Super 2 frames per level, and Ultra 3 frames per level (120 frames at level 0 to 180 at level 20).
- Boost acceleration is a separate parameter: 0.13 to 0.1395 for a Mini-Turbo and 0.12 to 0.1295 for Super and Ultra. Lower Mini-Turbo stat gets a marginally higher acceleration value.
- The same parameters drive the Piranha Plant's per-bite boosts.
- **Disagreement on durations.** Nintendo's own tutorial video gives 0.621 s, 1.674 s, and 2.633 s for the three tiers `[official]`, which is longer than the datamined lengths at the default level (30 / 90 / 150 frames = 0.50 / 1.50 / 2.50 s). A fan estimate reported by Kotaku gives 28 to 133 frames at the lowest stat and 48 to 188 frames at the highest `[unconfirmed, via search summary]`. The likely reconciliation is that the datamined "length" is the powered phase and the others include the fade-out, but no source states that.

### 1.4 Older games, for the fundamentals

| Game | How it charged | Boost |
|---|---|---|
| Super Mario Kart | hold a sharp drift about 3 seconds | Mini-Turbo |
| Mario Kart 64 | manual stick charging; smoke goes white to yellow to orange | 14 frames |
| Double Dash | manual charging, sparks yellow to orange to blue | 10 frames for large karts, 30 frames for small karts |
| Mario Kart Wii | time-based counter (above); standstill Mini-Turbo charges in 75 frames | Super lasts three times as long as a Mini-Turbo; the TAS wiki lists miniturbo boost duration as 15 to 141 frames, at +20% top speed |

### 1.5 Inward versus outward drift

- **Outward drift (default).** The kart slides to the outside before biting; all karts, ATVs, and standard bikes.
- **Inward drift.** Sport bikes lean to the inside and commit to the turn immediately. In MK8 they lose less speed while leaning but have a lower turning capability than outward-drift vehicles. MK8DX has five (Comet, Sport Bike, Jet Bike, Yoshi Bike, Master Cycle). `[wiki, guide]`
- MKW removed inward drift entirely; all bikes drift like everything else. `[wiki]`

### 1.6 Automatic drift and assists

- MK8 and MK8DX start an automatic drift after steering one way long enough (a Handling-driven charge, AutoDrift_ChargeRt 1.5 at the worst handling down to 0.6 at the best). Automatic drift charges mini-turbos at the reduced rates above. MKW removed automatic drift. `[datamined, wiki]`
- **Smart Steering** (MK8DX, MKW): steers the kart back onto the road automatically, shown as an antenna on the back of the vehicle whose tip lights and bends when it intervenes. Costs the player the top mini-turbo tier (Ultra in MK8DX; rainbow sparks in MKW for both drifts and Charge Jumps). `[official]`
- **Auto-Accelerate** (MK8DX, not in Battle): the kart accelerates without holding the button. `[official]`
- **Auto-Use Item** exists in MKW (patch notes for 1.8.0 mention it working with Custom Items). `[official]`
- In MK8DX the default CPU difficulty was also softened versus the Wii U game (section 7).

Sources: https://www.mariowiki.com/Mini-Turbo · https://www.mariowiki.com/Mario_Kart_8_Deluxe_in-game_statistics · https://vikemk.com/drifting-guide · https://v-whoami-v.github.io/ · https://www.mariowiki.com/Drift · https://www.mariowiki.com/Hop_(move) · https://www.highgroundgaming.com/mario-kart-8-tips-and-tricks/ · https://www.mariowiki.com/Smart_Steering · https://www.mariowiki.com/Mario_Kart_8 · https://www.mariowiki.com/Mario_Kart_World · https://wiki.mkwtas.com/wiki/Boost_information

---

## 2. Other boosts

### 2.1 Rocket start

**What the recent games say.** `[official, guide]`

- MK8 / MK8DX: begin holding accelerate when the "2" appears in the countdown (the second red light), right after its tone. Pressing as the tone sounds is too early and the kart stalls on the line. The closer the timing, the longer the boost; a slightly late press still gives a smaller boost. One guide says being off by more than a few frames backfires.
- Since Mario Kart DS, boost strength depends on how much rev was built before GO; the wiki puts the resulting boost at roughly 0.5 to 3 seconds. A too-early press backfires and stalls the kart for a few seconds.
- MKW: same instruction (hold when the countdown reaches 2). In races that begin on a route, including Knockout Tour, racers are already rolling before the countdown, and Rocket Starts still work.
- **No frame-exact window or boost length was found for MK8DX or MKW.** `[unconfirmed]`

**How it actually works in Mario Kart Wii** (the only game with published internals). `[datamined]`

- The countdown lasts 239 frames. A charge value between 0 and 1 updates every frame: while accelerate is held it becomes 0.02 + 0.982 x previous; while released it becomes 0.96 x previous.
- At GO the charge is read once:

| Charge at GO | Result | Continuous hold needed `[derived]` |
|---|---|---|
| below 0.85 | no boost | under 80 frames (1.33 s) |
| 0.85 to 0.88 | 10-frame boost | 80 to 86 frames |
| 0.88 to 0.905 | 20-frame boost | 87 to 92 frames |
| 0.905 to 0.925 | 30-frame boost | 93 to 98 frames |
| 0.925 to 0.94 | 45-frame boost | 99 to 102 frames |
| 0.94 to 0.95 | 70-frame boost (best) | about 103 to 106 frames (about 1.72 to 1.77 s before GO) |
| 0.95 and up | burnout: 120-frame hit-stun, no boost | 107 frames or more |

- The hold lengths assume the button is pressed once and held from a charge of zero; releasing bleeds the charge by 4% per frame, so feathering the button changes the numbers.
- The start boost is a mini-turbo-type boost: +20% top speed.
- Design reading: the whole rewarding range is about 27 frames (80 to 106 before GO), and the best 4 of them sit directly against the failure threshold. Greed is punished; caution still pays a little.

**Mario Kart 64 and Double Dash.** MK64: press as the light changes; too early spins the tires and the start is slower. Double Dash adds a co-op "Double Dash" start when both players time it together, shown with blue flames. `[official manuals]`

### 2.2 Jump (trick) boosts

- Triggered by pressing the hop/trick button (or shaking the controller) at the lip of a ramp or drop; the boost is paid on landing. Rule of thumb from guides: if the tires leave the ground, a trick is probably possible. `[official, guide]`
- MK8DX `[datamined]`: Jump Boost lasts 16 to 35 frames (0.27 to 0.58 s) depending on the Mini-Turbo stat, at a speed multiplier of 1.305 to 1.40, with a much higher acceleration value (0.20 to 0.219) than a mini-turbo. Default level: 25 frames at 1.35. It is short and strong: about a quarter of a Super Mini-Turbo's length at three and a half times the bonus.
- Mario Kart Wii `[datamined]`: trick boosts are +30% top speed. Stunt trick 45 frames (40 for karts), single flip 80 (70), double flip 95 (85), zipper trick 100.
- MKW: tricks can be repeated in the air, performed any time while gliding (left or right gives a roll), and done off other racers or obstacles by landing on them. Patch 1.2.0 made the landing boost fire immediately with higher acceleration. `[wiki, official]`

### 2.3 Slipstream (drafting)

- Present in every game since Mario Kart 64 except Super Circuit and Double Dash. Trail a racer for long enough and you get a boost the wiki compares to a Mini-Turbo. `[wiki]`
- Nintendo's MK8DX guide says the effect "begins when you are about two vehicle lengths away" and that holding position while the effect shows produces a temporary speed boost. It is easier on narrow roads and inside lines, and the car ahead can shake it by weaving. `[official]`
- Guides: stay directly behind for a few seconds; speed lines appear while it builds and concentric lines when it fires; the boost is moderate but lasts much longer than most boosts; it stops on going off-road. `[guide]`
- A fan wiki gives about three to five seconds to trigger and about three seconds of boost, ending early on hitting a wall, obstacle, racer, or item. `[unconfirmed, via search summary; page blocked]`
- **No frame data, speed multiplier, or exact build time was found for any game.** `[unconfirmed]`

### 2.4 Boost pads (Dash Panels) and ramps

- MK8DX: a set-duration boost on contact; no numbers found. `[unconfirmed]` Dash Panels count as a "boost" for collision weight (section 5).
- Mario Kart Wii `[datamined]`: boost panel 60 frames at +40% top speed with off-road immunity; zipper boost 50 frames.
- At 200cc MK8 changes 21 tracks, including the boost value of ramps with Dash Panels and local gravity on jumps and glider sections, so the faster class does not overshoot. `[wiki]`

### 2.5 Mushrooms and the Star

- Mario Kart Wii `[datamined]`: a Mushroom boost is 90 frames (1.5 s), +40% top speed (with a floor that guarantees a minimum boosted speed), the highest acceleration of any boost, and off-road immunity.
- MK8 / MK8DX: the Mushroom is described as slightly stronger than in other games, with no number given. Off-road shortcuts need a Mushroom or Star; trick, drift, and draft boosts die as soon as you leave the road. `[wiki, guide]` **Duration and multiplier not found.** `[unconfirmed]`
- Triple Mushrooms: three separate boosts; in MK8 onward they orbit the kart and a rival who drives into one gets the boost without consuming it. `[wiki]`
- Golden Mushroom: unlimited boosts for a limited time once first used. Fan sources disagree on the window: about 6 s, about 7.5 s (a Wii-era wiki), and 10 s (a Mario Kart fan wiki). `[unconfirmed]`
- Star: invincibility plus speed; at 150cc top speed barely changes and the benefit is acceleration and off-road immunity, while at 200cc it significantly raises both. Duration not found. `[wiki; duration unconfirmed]`
- MKW: Dash Food gives a boost whose strength depends on the food tier; unlike a Mushroom it cannot dodge a Spiny Shell. `[wiki]`

### 2.6 Spin boost

Anti-gravity only (MK8 / MK8DX). Two racers colliding both spin and both get a small boost; hitting a Spin Boost Pillar boosts only you. No duration or strength published. `[official; numbers unconfirmed]`

### 2.7 How boosts combine

Mario Kart Wii is the only game with documented rules. `[datamined]`

- Boosts do not stack. A second boost of the same type resets the timer rather than adding to it, so chaining boosts back-to-back wastes frames.
- Different types have a priority order: trick boosts override mushroom boosts, which override mini-turbo boosts, even though tricks give less speed than mushrooms. Overlapping a trick with a mushroom therefore loses speed.
- When a boost ends, top speed decays back to base at a fixed rate rather than snapping.
- Three boost families: mini-turbo type (+20%, low acceleration, no off-road immunity), trick type (+30%), and mushroom type (+40%, off-road immunity).

For MK8DX no equivalent rule set was found. `[unconfirmed]` What is known: every mini-turbo tier shares one speed multiplier, a Jump Boost has a much higher one, and a kart under a Mushroom, Dash Panel, or Mini-Turbo boost switches to a heavier "dash mass" for collisions.

Sources: https://www.mariowiki.com/Rocket_Start · https://wiki.mkwtas.com/wiki/Countdown · https://wiki.mkwtas.com/wiki/Boost_information · https://www.nintendo.com/jp/ichikara/aabpa/index_en.html · https://www.nintendo.com/jp/ichikara/aabpa/02_en.html · https://www.mariowiki.com/Slipstream · https://www.mariowiki.com/Jump_Boost · https://www.mariowiki.com/Spin_Boost · https://www.mariowiki.com/Mario_Kart_8_Deluxe_in-game_statistics · https://www.highgroundgaming.com/mario-kart-8-tips-and-tricks/ · https://mariowiki.com/Dash_Mushroom · https://www.mariowiki.com/Golden_Dash_Mushroom · https://www.mariowiki.com/Mario_Kart_World_update_history · https://www.mariowiki.com/Dash_Food

---

## 3. Coins

### 3.1 MK8 and MK8DX

| Property | Value | Tag |
|---|---|---|
| Effect per coin | +0.05 u/f of top speed on ground, water, and anti-gravity (not while gliding) | datamined |
| Cap | 10 coins, so +0.5 u/f | datamined, official |
| As a percentage | about +0.6% to +0.7% per coin; +6.25% (fastest build) to +6.64% (slowest) at 10 coins on the current speed table. A tech wiki quotes 6.29% to 6.69%, which matches the pre-4.0.0 table | derived / tested |
| Pickup | a small immediate boost on each coin, even when already at 10 | official, guide |
| Coin item | +2 coins and a micro-boost; no effect at 10 | wiki |
| Lost when hit by an item or hazard | 3, scattered on the track where others can take them | wiki, guide |
| Lost when falling off | 3 | wiki, guide |
| Fireball hits (Mario Kart 7 rule that MK8 inherits) | 1 | wiki |
| Respawn of collected track coins | after a few seconds (no exact figure) | wiki, guide |
| Dropped coins on track despawn | 10 s | tested (japan-mk) |
| Starting coins | not found | unconfirmed |

Two framing facts:

- The whole Speed stat spans 7.525 to 8.00 u/f (0.475 u/f). **Ten coins are worth slightly more than the gap between the slowest and fastest build in the game.** `[derived from datamined tables]`
- A Bullet Bill's speed also scales with coin count. `[tested]`
- Version 4.0.0 raised everyone's base speed by the equivalent of one coin. `[official patch note, per wiki]`
- Coins double as the unlock currency (section 8) and as a low-value item that fills the leader's item slot (section 6).

### 3.2 MKW

- Cap raised to 20. `[official]`
- A tester's per-coin data, reported by Nintendo Everything: 20 coins give about +5.1% in a straight line, but the curve is not linear. A slow build got +3.6% from its first 10 coins; a high-top-speed build got only +1.4% from its first 10; both reach 5.1% at 20. `[tested, second-hand]` The Japanese blog adds that lighter builds gain slightly more per coin at low counts, and that gliding speed also rises with coins. `[tested]`
- Most attacks knock out 3 coins; Lightning takes 2. `[wiki]`
- Coin Shell, the ? Block item, and course ? Blocks all pay coins while leaving more on the track for others. Every 100 coins collected unlocks a vehicle. `[wiki]`

### 3.3 Earlier games

Super Mario Kart: coins raise top speed up to 10; a hit or going out of bounds drops 1, 2, or 4; bumping a rival with zero coins makes you slide. Super Circuit: up to 5 starting coins depending on grid position. Mario Kart 7: same model MK8 uses (10 cap, small boost on pickup, 3 lost on hit or fall). `[wiki]`

Sources: https://www.mariowiki.com/Coin · https://www.mariowiki.com/Mario_Kart_8_Deluxe_in-game_statistics · https://mariokart-tech.pages.dev/wiki/items/coin · https://www.highgroundgaming.com/mario-kart-8-tips-and-tricks/ · https://nintendoeverything.com/mario-kart-world-how-coins-work/ · http://japan-mk.blog.jp/mkworld.st-a · http://japan-mk.blog.jp/mk8dx.info-7 · https://mariowiki.com/Mario_Kart_8_Deluxe_update_history · https://www.mariowiki.com/Lightning

---

## 4. Speed classes

| Class | Speed relative to 150cc | Notes |
|---|---|---|
| 50cc | 80% | recommended for beginners in Nintendo's guide |
| 100cc | 90% | |
| 150cc | 100% | all datamined speed tables are for this class |
| Mirror | 100% | 150cc with courses flipped |
| 200cc | 150% | added in MK8 v4.0; first in the series |

`[wiki, citing datamined values]` A 2025 fan timing test independently found 200cc at about 1.5 times 150cc and observed that 50/100/150 rise in even steps while 200cc jumps far beyond that pattern. `[tested, via press summary]`

What else changes at 200cc `[wiki]`:

- **Brake drifting.** Braking while drifting produces a special state: slower deceleration, tighter line, and the mini-turbo charge is kept. Braking is the core skill of the class.
- Acceleration responds to every step of the Acceleration stat.
- The Star raises top speed as well as acceleration.
- Red Shells and Spiny Shells slow down when locking on in MK8DX, so they can sometimes be outrun at 200cc.
- 21 courses carry 200cc-specific physics tweaks.

MKW ships 50cc, 100cc, 150cc, and unlockable Mirror; no 200cc. Battle is always 50cc. `[wiki]`

**CPU difficulty versus class.** No source gives numbers, and none I read states how Grand Prix CPU strength scales with class. What is documented: CPU strength has Easy, Normal, and Hard levels that VS lets the player set; MK8DX slightly reduced CPU speed on Easy and Normal, reworked CPU pathfinding and drifting at 200cc, and tuned Hard 200cc CPU speeds per course. `[wiki; magnitudes unconfirmed]`

Sources: https://www.mariowiki.com/Mario_Kart_8 · https://www.mariowiki.com/Mario_Kart_8_Deluxe · https://gigazine.net/gsc_news/en/20250603-mario-kart-cc · https://www.mariowiki.com/Mario_Kart_World · https://mariowiki.com/Mario_Kart_8_Deluxe_update_history

---

## 5. Stats

### 5.1 The model (MK8DX)

Each stat is a sum of points from driver + body + tires + glider, giving a Level from 0 to 20. The menu bar shows (Level + 3) / 4, so 0.75 to 5.75. A lookup table then converts the level to physics values. `[datamined]`

Five stats are shown: Speed, Acceleration, Weight, Handling, and Traction. Hidden ones: separate Speed and Handling for water, air, and anti-gravity; Mini-Turbo; and Invincibility (added in 2.2.0).

| Stat | What it controls | Range across levels 1 to 20 |
|---|---|---|
| Speed (ground / water / anti-gravity) | top speed | 7.525 to 8.00 u/f with 0 coins; 8.025 to 8.50 with 10 coins (0.025 per level) |
| Speed (air) | glide speed, unaffected by coins | 7.645 to 8.50 u/f |
| Acceleration | two parameters: a per-frame cap on speed gain, and a rate at which the fraction of top speed grows | cap 0.035 to 0.13 u/f per frame; rate 0.0055 to 0.016 per frame |
| Weight | collision mass (below) | 6 to 40 standing, 10 to 80 at top speed, 30 to 80 boosted |
| Handling | steering rate, how far a drift can be widened or tightened, and how fast automatic drift engages | steer 0.0065 to 0.014; drift 0.0145 to 0.022 |
| Traction | slip and speed loss on slippery surfaces only | see section 9 |
| Mini-Turbo | charge thresholds, boost length, boost speed, jump boost | see section 1.3 |
| Invincibility | multiplier on post-hit invincibility | 0.65x to 2.0x (section 6.8) |

The top-speed range is narrow: 6.3% between the slowest and fastest possible build. Acceleration and Mini-Turbo vary far more (the Mini-Turbo boost multiplier alone runs 1.08 to 1.15 and its charge time varies by about 25%).

### 5.2 Weight and collisions

`[datamined]`

- Heavier karts shove lighter ones. Effective mass is not constant: it interpolates between a standing mass and a top-speed mass according to current speed (at half speed, exactly the average).
- A kart under a boost (Mushroom, Dash Panel, or Mini-Turbo; other boost types untested) uses a third, larger "dash mass" instead. Dash mass only steps up every four levels, so each whole number on the Weight bar is a breakpoint.

| Weight level (bar) | Standing mass | Top-speed mass | Dash mass |
|---|---|---|---|
| 1 (1.00) | 6 | 10 | 30 |
| 5 (2.00) | 10 | 18 | 45 |
| 9 (3.00) | 14 | 26 | 60 |
| 13 (4.00) | 22 | 38 | 70 |
| 17 (5.00) | 34 | 68 | 80 |
| 20 (5.75) | 40 | 80 | 80 |

Readings: the heaviest kart at speed is 8 times the mass of the lightest; a boosting featherweight (30) still outweighs an unboosted middleweight at speed (26). Boosting is how light karts win bumps.

### 5.3 Light versus heavy

- Nintendo's summary: light characters accelerate quickly and turn easily; heavy characters have high top speed and resist being knocked around; medium is balanced. `[official]`
- In MK8DX the hidden trade is that lighter, slower parts carry more Mini-Turbo, and since 2.2.0 parts with lower Mini-Turbo and larger bodies get longer post-hit invincibility. Three balance patches (2.3.0, 2.4.0, 3.0.0) kept nudging Speed, Mini-Turbo, and Invincibility to widen the set of viable builds. `[official patch notes, tested]`

### 5.4 MKW

`[wiki, citing the Kadokawa Perfect Guide]`

- Four visible stats (Speed, Acceleration, Weight, Handling), 0 to 20 points each, 5 points per bar section. Traction is no longer shown.
- Speed and Handling are each split three ways: paved road, off-road (dirt and rough surfaces), and water. The bar shows the rounded average. Drivers set the baseline (0 to 15); the vehicle adds -6 to +6.
- There is a hidden Mini-Turbo stat, but drift charge thresholds are the same for everyone. The Japanese blog says Acceleration lengthens mini-turbo, charge-jump, rail, and wall boost durations; charge time, rail and wall speed, and jump-pad boost length are the same for all builds; water speed is 10% below ground speed (boost items ignore the penalty). `[tested]`
- A separate analysis describes a fixed stat budget in which Acceleration and Handling rise together and trade against Speed and Weight. `[guide, via search summary]`

Sources: https://www.mariowiki.com/Mario_Kart_8_Deluxe_in-game_statistics · https://www.mariowiki.com/Mario_Kart_8 · https://www.nintendo.com/jp/ichikara/aabpa/02_en.html · http://japan-mk.blog.jp/mk8dx.st-a · https://mariowiki.com/Mario_Kart_8_Deluxe_update_history · https://www.mariowiki.com/Mario_Kart_World · http://japan-mk.blog.jp/mkworld.st-a

---

## 6. Items

### 6.1 MK8DX item list

Effects are from the wiki and Nintendo's guide; numbers carry their own tags.

| Item | Effect | Known numbers |
|---|---|---|
| Coin | +2 coins and a micro-boost | cap 10 |
| Banana / Triple Bananas | dropped behind or thrown ahead; spins out whoever touches it; triples orbit the kart | stop 90 f (1.5 s) |
| Green Shell / Triple | travels straight, bounces, knocks over the first kart hit; triples orbit | stop 90 f |
| Red Shell / Triple | homes on the next kart ahead | stop 90 f; slower while locked on (MK8DX) |
| Spiny (blue) Shell | runs the road to first place hitting anyone in the way, then circles and dives on the leader | stop 90 f; see 6.5 |
| Bob-omb | thrown or dropped, explodes after a moment; knocks over or spins by distance | stop 90 f |
| Mushroom / Triple | one boost each; ignores off-road | section 2.5 |
| Golden Mushroom | unlimited boosts for a short window | window unconfirmed |
| Star | invincible, faster, ignores off-road; knocks over karts touched (victims keep their items) | victim stop 60 f |
| Bullet Bill | auto-piloted invincible rocket | section 6.6 |
| Lightning | everyone else spins, shrinks, slows, and loses held items | section 6.7 |
| Blooper | inks the screens of all racers ahead | hovers about 2 s before inking; inked karts lose a fixed 3% top speed and get worst-case traction; cleared by a Mushroom, Dash Panel, entering water, or invincibility |
| Fire Flower | throw fireballs for a short time; spins victims | 10 fireballs in MK8; stop 63 f; a fireball knocks out 1 coin |
| Boomerang Flower | up to three throws; hits going out and coming back | stop 65 f |
| Piranha Plant | bites forward at racers, items, and coins; each bite is a mini-turbo-strength boost | 7 bites over 4.5 s if the button is held; at least 36 f between bites; auto-bites every 95 f, lasting about 10 s if never pressed; stop 60 f |
| Super Horn | radial shockwave; hits nearby racers and destroys items including the Spiny Shell | stop 65 f |
| Crazy Eight | eight orbiting items: Coin, Bob-omb, Mushroom, Star, Blooper, Green Shell, Red Shell, Banana | |
| Boo (new in Deluxe) | steals a rival's item; user is intangible and invisible | off-road no longer slows the user since 4.0.0 |
| Feather | high jump; Battle mode only in MK8DX | |

Stop times are `[datamined]`; Piranha Plant and Blooper numbers are `[tested]` by the Mario Kart Tech wiki.

### 6.2 How the item is decided

**Two systems exist in the series.**

1. **Rank-based** (through Mario Kart Wii, and again in MKW): the table column is chosen by your position when you open the box.
2. **Distance-based** (Mario Kart 7 and MK8): the column is chosen by your distance behind the leader, in course units, at the moment the box is opened. This is why a second-place player far behind can pull a Bullet Bill.

**MK8DX is a hybrid.** Items depend on distance and placement, not distance alone. `[wiki list of changes from the Wii U game]` Community reconstruction `[tested]`:

- Distance behind first ("units") picks how strong the pool is. Curves, branches, and cannons after a box inflate the measured distance, which is why certain boxes are known for strong pulls.
- A rank filter is then applied in five groups (12-player room): 1st; 2nd; 3rd to 5th; 6th to 8th; 9th to 12th. First place pulls coins about 70% of the time. Second place pulls a single Red Shell 30% to 50% of the time. Upper ranks lean to attack items, middle ranks to attack items plus mushrooms, lower ranks to acceleration items, and only 9th to 12th can pull Lightning.
- Each item has a "head" and "tail": the distance at which it enters and leaves the pool.
- The full Deluxe tables have not been published on the wiki; the Japanese blog's calculator calls all of its probabilities estimates.

**Shape of the table: MK8 (Wii U, v4.1) Grand Prix, human players.** `[datamined]` Percent chance per box. Column headers are the distance at which the game switches to the next column.

| Item | to 400 | to 1000 | to 2000 | to 3300 | to 5500 | to 8000 | to 13000 | to 26000 | beyond |
|---|---|---|---|---|---|---|---|---|---|
| Coin | 35 | 7.5 | 2.5 | | | | | | |
| Banana | 32.5 | 10 | 5 | | | | | | |
| Green Shell | 25 | 12.5 | 10 | 7.5 | | | | | |
| Red Shell | 2.5 | 25 | 15 | 10 | 5 | | | | |
| Mushroom | 2.5 | 10 | 12.5 | 25 | 15 | 5 | | | |
| Super Horn | 2.5 | 2.5 | 2.5 | | | | | | |
| Bob-omb | | 5 | 7.5 | 2.5 | | | | | |
| Fire Flower | | 5 | 5 | 2.5 | | | | | |
| Piranha Plant | | 5 | 7.5 | 2.5 | | | | | |
| Boomerang Flower | | 2.5 | 5 | 5 | | | | | |
| Triple Bananas | | 7.5 | 5 | | | | | | |
| Triple Green Shells | | 5 | 5 | 5 | | | | | |
| Triple Red Shells | | 2.5 | 7.5 | 5 | | | | | |
| Triple Mushrooms | | | 7.5 | 30 | 42.5 | 32.5 | 17.5 | 5 | 15 |
| Crazy Eight | | | 2.5 | 2.5 | 2.5 | 2.5 | | | |
| Blooper | | | | 2.5 | 2.5 | | | | |
| Spiny Shell | | | | | 2.5 | 2.5 | 2.5 | | |
| Star | | | | | 12.5 | 20 | 17.5 | 15 | 20 |
| Golden Mushroom | | | | | 12.5 | 20 | 27.5 | 30 | 30 |
| Bullet Bill | | | | | 5 | 15 | 30 | 42.5 | 35 |
| Lightning | | | | | | 2.5 | 5 | 7.5 | |

How to read the shape:

- **Front (to 400 units):** 92.5% coin, banana, or green shell. The leader is fed defense and filler.
- **Just behind (400 to 2000):** the widest variety; red shells peak here. This is where racers fight each other.
- **Mid-pack (2000 to 5500):** mushrooms take over; attack items fade out.
- **Far back (5500 and beyond):** only catch-up items. Bullet Bill, Golden Mushroom, and Star dominate.
- **The scary items are rare everywhere:** Spiny Shell never exceeds 2.5% and Lightning never exceeds 7.5%.
- If the item-distance units are the same units as the speed table (not confirmed), a kart covers about 470 to 500 units per second, so 400 units is under a second behind, 2000 is about 4 seconds, and 5500 is about 11 seconds. `[derived, unconfirmed assumption]`
- The Spiny Shell article describes its range as 5,500 to 13,000 units, which does not line up exactly with either reading of the column edges; treat band edges as approximate.
- CPUs use a separate table in both MK8 and Mario Kart Wii.

**Shape of a rank-based table: Mario Kart Wii Grand Prix, human players, 12 racers.** `[datamined]` Percent chance.

| Item | 1st | 2nd | 4th | 6th | 8th | 10th | 12th |
|---|---|---|---|---|---|---|---|
| Banana | 37.5 | 17.5 | 5 | | | | |
| Green Shell | 25 | 17.5 | 5 | | | | |
| Fake Item Box | 17.5 | 10 | 2.5 | | | | |
| Triple Bananas | 12.5 | 12.5 | 2.5 | | | | |
| Red Shell | 7.5 | 25 | 15 | 7.5 | 2.5 | | |
| Mushroom | | 10 | 20 | 12.5 | 2.5 | | |
| Triple Green Shells | | 5 | 10 | | | | |
| Bob-omb | | 2.5 | 7.5 | 5 | | | |
| Triple Red Shells | | | 7.5 | 10 | 5 | | |
| Thunder Cloud | | | 7.5 | 5 | | | |
| Triple Mushrooms | | | 10 | 25 | 32.5 | 25 | 12.5 |
| Spiny Shell | | | 2.5 | 7.5 | 2.5 | | |
| Mega Mushroom | | | 2.5 | 10 | 5 | | |
| Blooper | | | 2.5 | 7.5 | 5 | | |
| POW Block | | | | 5 | 5 | | |
| Golden Mushroom | | | | 5 | 22.5 | 30 | 25 |
| Star | | | | | 12.5 | 22.5 | 15 |
| Bullet Bill | | | | | 5 | 15 | 25 |
| Lightning | | | | | | 7.5 | 22.5 |

The Wii CPU table is flatter and weaker: CPUs keep pulling green shells and bananas all the way down the field, never pull Triple Red Shells, and only see Lightning in 12th.

**MKW.** `[tested, second-hand]`

- Rank and distance both matter, with rank dominant (a competitive player's footage analysis calls it position-based like the pre-MK7 games).
- By placement, in a 24-racer room (v1.8.0): 1st gets a fixed set of 6 item types; 2nd gets those 6 plus 6 more; 3rd to 5th mostly attack items with some acceleration; 6th to 18th mostly acceleration with some attack; 19th to 24th acceleration items and Lightning.
- Distance adds exceptions: at a moderate gap, 2nd to 5th can pull items normally seen lower (for example Fire Flower or Triple Mushrooms in 3rd); at a long gap, top-tier items can appear high up (a Bullet Bill in 2nd).
- Items are stronger overall than in older games: a 5th-place pull is compared to a 10th-place pull in Mario Kart Wii; Triple Mushrooms have been seen in 4th and Golden Mushrooms in 10th. Hammer is common; Star, ? Block, and Ice Flower are rare.
- First place can no longer pull Bob-ombs or Triple Bananas on normal settings, and (since 1.2.0) can hold a ? Block and a Coin together, so the leader is no longer guaranteed a defensive item. `[wiki]`
- In Knockout Tour the pool changes as racers are eliminated; some items leave the pool once four to eight racers remain.
- Nintendo has retuned item odds in 1.2.0, 1.6.0, 1.7.0, and 1.8.0. `[official]`

### 6.3 Time gates, cooldowns, caps, and anti-farming

MK8DX `[tested, japan-mk and Mario Kart Tech; patch notes official]`:

| Rule | Items |
|---|---|
| Cannot appear before 0:20 | Super Horn, Boomerang Flower, Bob-omb, Fire Flower, Piranha Plant, Triple Red Shells |
| Cannot appear before 0:30 | Spiny Shell, Blooper, Golden Mushroom, Crazy Eight, Bullet Bill, Lightning |
| Cannot reappear until 30 s after the last one left an item slot | Spiny Shell, Blooper, Crazy Eight, Lightning |
| Room-wide caps (independent of room size) | some items limited to 1 at a time, some to 3; Bullet Bill is 3 including active ones; up to three racers can hold Lightning |
| Per-player limits | one Bullet Bill, one Piranha Plant |
| Position limits | Bullet Bill only from 3rd place down; Piranha Plant 2nd to 8th |

- Example odds from the tech wiki: Bullet Bill 1.9% to 45.5% in 9th or lower depending on distance; Piranha Plant 0.5% to 6.7% in 3rd to 5th; Lightning about 1.5% at its entry distance and about 3.5% beyond it.
- Patch 1.2.0 gave trailing players catch-up items more often online and capped simultaneous Piranha Plants.
- Patch 3.0.0 added anti-farming rules: braking or stopping before a box yields weak items; taking the same box repeatedly stops yielding strong items; and strong items are capped per box row.
- Mario Kart Wii precedents: Lightning unobtainable for the first 30 seconds with a 30-second wait between uses; one Spiny Shell active at a time; at most three Stars and two Golden Mushrooms in play. `[wiki, partly marked citation-needed there]`

MKW `[tested]`: the normal placement table applies from about 26 seconds into the race, with separate early tables before 21 s and from 21 to 26 s. Golden Mushroom from 30 s; Lightning from 40 s. A separate analysis says some items are excluded for the first 20 to 30 seconds.

### 6.4 Item boxes, the roulette, slots, and shields

- **Roulette** (MK8DX): 190 frames to settle (the source rounds this to 3.1 s); pressing the item button 60 frames (1 s) or later stops it early; with two items the front slot settles first. `[tested]`
- **Respawn time**: not published. It was shortened in MK8DX 2.0.0, 2.1.0 (described on the wiki as near-instant), and 3.0.0, and in MKW 1.3.0. `[official; exact time unconfirmed]`
- **Two slots** (MK8DX): hold two items, use one at a time; a second item is only taken if a slot is free. Double Item Boxes fill both, sit in fixed places, are usually off the fast line, and never appear in a course's first box set. Driving through two boxes in one row still gives one item. `[wiki, tested]`
- **Pair rules** (MK8DX) `[tested]`: only single Banana, Green Shell, Red Shell, Mushroom, and Bob-omb can be held in both slots at once; every other item at most once; two orbiting triples (or a triple and Crazy Eight) cannot be held together. Boo ignores the rules, which is how double Bullet Bills happen.
- **Shielding**: hold the item button to drag a Banana or Green Shell behind the kart and it blocks a Red Shell; orbiting triples protect all round. In MK8 (Wii U) a dragged item still occupied the only slot; Deluxe's second slot is what makes "hold one, keep one" possible. `[official, wiki]`
- **Leader's slot management**: holding a Coin in one slot guarantees the next pull is something else, usually defensive, and protects the real defensive item from Boo. `[tested, tech wiki]`
- **MKW**: items trail behind the kart automatically (some are hidden from rivals; 1.8.0 made nine more types visible); the right stick aims items through 360 degrees; items float on water; falling off the course costs your items. `[wiki, official]`
- Items lying on the track despawn (MK8DX): coins 10 s; single shells 20 s; Spiny Shell 30 s; Banana, Mushroom, and Star 60 s. `[tested]`

### 6.5 Spiny (blue) Shell

- MK8 / MK8DX: wingless; travels the center of the road knocking over anyone in its path; near the leader it locks on, rises, circles twice, winds up, and dives with a large blast. The target is fixed at lock-on. It has a maximum travel distance and vanishes beyond it. `[wiki, tested]`
- Hit effect: the target is stopped in place and flips once (weaker than Wii, which launched the victim); others in the blast spin but keep some momentum. `[wiki]`
- Odds: at most 2.5% per box in the MK8 table, mid-distance only; 30-second gate and cooldown in Deluxe.
- **Counters:** Super Horn (anyone in range can destroy it); a Mushroom boost timed in a 12-frame window as the shell rears back before striking (any mushroom type, including one borrowed by bumping a rival's Triple Mushrooms); invincibility (Star, Bullet Bill, Boo), existing invincibility frames, or being carried by Lakitu; outrunning it at 200cc. A Dash Panel or half-pipe boost does not dodge it: it is the timing, not the speed. `[tested]`
- Mario Kart Wii for contrast: winged, flies over the field, 4th to 8th place only (best odds 7.5% in 6th), throws the victim into the air. `[wiki]`
- MKW: wingless; launches the target upward again; a Mushroom dodges it and Dash Food does not; in single-player a Rewind as it hovers makes it hit where the rewind began. `[wiki]`
- Design intent: the series' original director has said he wanted every racer to remain in contention until the finish, and the Mario Kart 8 director said the game felt like something was missing when tested without the item. `[developer statements via press summaries]`

### 6.6 Bullet Bill

| Game | Who gets it | How long it lasts |
|---|---|---|
| Mario Kart DS | 6th or lower | timer of about 7 to 9 s; ends early after passing (players - 1) / 2 racers, rounded down; ends shortly after reaching first |
| Mario Kart Wii | 8th or lower (25% in 12th) | same model; pass limit 5 |
| MK8 / MK8DX | far enough behind; as high as 2nd per the wiki, 3rd or lower in Deluxe per the tech wiki | ends at the next safe exit point after 8 s, or after passing N/2 - 1 racers, or on reaching first; hard cap 12 s; 1 to 2 s if fired into a wall or after falling |
| MKW | not found | dynamic duration; slower than before; bumps racers aside and cancels their drift instead of crashing them; never ends mid-turn |

`[wiki for DS, Wii, MKW; tested for MK8DX]`. It steers itself with a little player nudge, and waits for a straight to drop the player, which is why it can stretch to 12 s on courses with long no-exit sections.

### 6.7 Lightning

- MK8 / MK8DX: everyone else spins out (stop 60 f), drops held items, shrinks, and drives slower; shrunken racers find tricks and drifts harder and are flattened if a normal-size kart drives over them. Stars, Bullet Bills, and Boos are immune. `[wiki]`
- Duration is staggered by position: shortest for the back, longest for the leader. In Mario Kart DS, which introduced the stagger, it wears off almost at once for last place and lasts up to 8 seconds for first. No MK8DX-specific seconds were found. `[wiki; MK8DX numbers unconfirmed]`
- MKW weakens it sharply: it hits only racers ahead of the user, shrinks for at most 3 seconds, uses a stun animation instead of a spin, costs 2 coins, and does nothing to Mega Mushroom users. The back half of the victims regrow together, then the front half in sequence. `[wiki]`

### 6.8 What a hit costs: stop time and invincibility

MK8DX `[datamined]`. "Stop" is the time the kart cannot move. Invincibility starts when the stop ends and is multiplied by the Invincibility stat.

| Hit by | Stop (frames / s) | Base invincibility (frames) | Total (frames / s) |
|---|---|---|---|
| Green Shell, Red Shell | 90 / 1.50 | 91 | 181 / 3.02 |
| Banana, Bob-omb, Spiny Shell | 90 / 1.50 | 90 | 180 / 3.00 |
| Lightning | 60 / 1.00 | 90 | 150 / 2.50 |
| Boomerang Flower | 65 / 1.08 | 57 | 122 / 2.03 |
| Super Horn | 65 / 1.08 | 56 | 121 / 2.02 |
| Fire Flower, Bullet Bill | 63 / 1.05 | 56 | 119 / 1.98 |
| Piranha Plant, Star | 60 / 1.00 | 60 | 120 / 2.00 |
| Track hazard | 60 / 1.00 | 60 | 120 / 2.00 |

- Invincibility multiplier by stat level (v3.0.0): 0.65x at level 1, about 1.2x at level 10, 1.42x at level 15, 2.0x at level 20. Worked example from the Japanese blog (older scaling): stat 1.75, hit by Lightning: 60-frame stun, then 90 x 0.74 rounded up to 67 frames. `[datamined, tested]`
- So there are two hit classes: **heavy** (shell, banana, bomb, blue shell: 1.5 s stopped) and **light** (everything else: about 1.0 to 1.1 s stopped). The true cost is larger because the kart then has to re-accelerate from zero and has lost 3 coins.
- History: invincibility was lengthened online in 1.1.0 and again in 1.3.0, made stat-dependent in 2.2.0, and increased for many parts in 3.0.0. `[official]`
- Spin versus tumble: the sources describe bananas and fireballs as spin-outs and shells and explosions as knock-overs, but the datamined stop times group banana with the heavy hits; no source gives separate animation lengths. `[unconfirmed]`
- MKW: invincibility after a spin or crash was a flat 2.5 s at launch, 3.0 s from 1.3.0, and from 1.6.0 varies by character and vehicle (heavier is longer). `[official, tested]`
- Mario Kart Wii: a failed rocket start is a 120-frame hit-stun, which gives a sense of scale. `[datamined]`

Sources: https://www.mariowiki.com/Mario_Kart_8 · https://www.mariowiki.com/Mario_Kart_8_Deluxe · https://www.mariowiki.com/Mario_Kart_8_item_probability_distributions · https://www.mariowiki.com/Mario_Kart_Wii_item_probability_distributions · http://japan-mk.blog.jp/mk8dx.note-3 · http://japan-mk.blog.jp/mk8dx.info-7 · http://japan-mk.blog.jp/mk8dx.info-5 · http://japan-mk.blog.jp/mk8dx.info-6 · http://japan-mk.blog.jp/mk8dx.info-1 · https://japan-mk.blog.jp/mkworld.item-1 · https://japan-mk.blog.jp/mkworld.item-2 · https://nintendosoup.com/?p=274466 · https://mariokart-tech.pages.dev/wiki/items/ · https://mariokart-tech.pages.dev/wiki/items/blue-shell/ · https://mariokart-tech.pages.dev/wiki/items/bullet-bill/ · https://mariokart-tech.pages.dev/wiki/items/piranha-plant/ · https://mariokart-tech.pages.dev/wiki/items/blooper/ · https://www.mariowiki.com/Item_Box · https://www.mariowiki.com/Spiny_Shell_(blue) · https://www.mariowiki.com/Bullet_Bill · https://www.mariowiki.com/Lightning · https://www.mariowiki.com/Super_Star · https://www.mariowiki.com/List_of_items_in_the_Mario_Kart_series · https://www.mariowiki.com/Mario_Kart_8_Deluxe_in-game_statistics · https://mariowiki.com/Mario_Kart_8_Deluxe_update_history · https://www.mariowiki.com/Mario_Kart_World · https://www.mariowiki.com/Mario_Kart_World_update_history · https://www.nintendo.com/jp/ichikara/aabpa/02_en.html · https://en.wikipedia.org/wiki/Blue_shell

---

## 7. CPU drivers

No source publishes CPU speed or rubber-band numbers for any recent game. What is documented:

**Rubber-banding.**

- The wiki's general description of series rivals: a few computer opponents get a large advantage so standings stay close, mainly a speed boost when they fall far behind (sometimes beyond their character's stats), and possibly faster hit recovery and better item odds. `[wiki]`
- MK8DX changed the Wii U behavior so that CPUs slow down when close to the player and charge Mini-Turbos and Super Mini-Turbos more slowly. `[wiki change list]`
- Community understanding of MK8DX is that CPUs do not rubber-band in driving speed and that catch-up comes through the item tables instead. `[unconfirmed, forum consensus via search summary]`
- CPUs have their own item tables (section 6.2). In MK8DX they can occasionally pull Triple Red Shells, mostly in Shells Only. `[datamined, wiki]`
- Press pieces report players feeling targeted by CPU items in MK8DX at higher classes; this is anecdotal. `[unconfirmed]`

**Rival systems by game.** `[wiki]`

| Game | Rival rule |
|---|---|
| Super Mario Kart | fixed speed roles (one very fast, one fast, one medium, one slow, three very slow), reassigned by points standings so a rival that falls behind recovers |
| Mario Kart 64 | one or two random opponents per Grand Prix drive much better and rubber-band hard |
| Double Dash | two random rivals fixed for the whole cup, chosen by weight and class (heavier rivals at higher classes) |
| Mario Kart 7 | each character has two fixed rivals |
| MK8 / MK8DX | fixed rivals per player character, Grand Prix only (for example Mario's is Bowser); VS and Battle use random CPUs. Each CPU character picks from four preset vehicle combinations |
| MKW | one rival per cup, tied to the character that cup unlocks, always on a specific vehicle (Donkey Kong in the Mushroom Cup); the Special Cup has none |

**MKW difficulty.** `[official for the patch; the rest unconfirmed]`

- At launch 150cc Grand Prix and Knockout Tour CPUs were widely reported as punishing, with strong items appearing in second place. Patch 1.2.0 states that COM was made weaker in everything other than Battle.
- A popular theory, loosely tested by one site, says CPUs get faster and pull better items the more the player drifts and tricks (dynamic difficulty). The site found three stars much easier without drifting but published no measurements. Treat as unproven.
- Patch 1.3.0 fixed CPUs dropping in rank after crossing the line.

Sources: https://mariowiki.com/Rival · https://www.mariowiki.com/Mario_Kart_8_Deluxe · https://www.mariowiki.com/Mario_Kart_World · https://www.mariowiki.com/Mario_Kart_World_update_history · https://nintendosoup.com/mario-kart-world-appears-to-have-a-dynamic-difficulty-system · https://www.mariowiki.com/Mario_Kart_Wii_item_probability_distributions

---

## 8. Race structure

### 8.1 MK8 / MK8DX

- 12 racers. A Grand Prix cup is four races in a fixed order; Time Trials are three laps alone with Triple Mushrooms. `[official, wiki]`
- Points `[wiki]`:

| 1st | 2nd | 3rd | 4th | 5th | 6th | 7th | 8th | 9th | 10th | 11th | 12th |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 15 | 12 | 10 | 9 | 8 | 7 | 6 | 5 | 4 | 3 | 2 | 1 |

- The gap structure is 3, 2, then 1 point per place; last still scores. Finishing 6th or better gets the "good result" presentation.
- **Stars.** Three stars need 60 points, meaning four wins. `[confirmed by several guides]` For lower ranks the official guide is reported as 57 for two stars and 54 to 55 for one star; the exact cut-offs are inconsistent between sources. `[unconfirmed]`
- 150cc results count for 100cc and 50cc; Mirror and 200cc are tracked separately. `[wiki]`
- **Unlocks (MK8DX).** A random vehicle part every 30 coins collected up to 450, then every 50 up to 1,500, then every 100; the last regular part comes at 3,100. Gold kart: at least one star in every Mirror cup. Gold tires: beat all 150cc staff ghosts. Gold glider: 5,000 coins. Gold Mario: win every cup at 200cc. `[wiki]`
- VS options: item set, CPU strength, race count (4 to 48), teams, course order. Local play up to 4 (8 on Switch 2); online and wireless up to 12. `[wiki]`

### 8.2 MKW

- 24 racers. The developers say they doubled the field early on because long routes in a big world would otherwise spread players out and weaken the sense of racing someone. `[official]`
- Grand Prix: four races per cup. The first is a normal three-lap race; each of the other three is a drive along a route from the previous course (two or more sections) ending in one lap of the destination course. `[wiki]`
- Points `[wiki]`:

| Place | 1 | 2 | 3 | 4-5 | 6-7 | 8-9 | 10-12 | 13-15 | 16-18 | 19-21 | 22-23 | 24 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Points | 15 | 12 | 10 | 9 | 8 | 7 | 6 | 5 | 4 | 3 | 2 | 1 |

- Stars: three stars need 60 points. Seven cups are open at the start; the Special Cup opens after clearing them. `[wiki]`
- Unlocks: 50 characters (32 at the start, 18 unlockable, mostly by finishing cups, plus some through the Kamek item); a vehicle every 100 coins; 103 outfits through Dash Food. Mirror Mode needs the first seven cups and first eight Knockout Tour rallies played at 150cc, 10 P Switch missions, 10 ? Panels, and 10 Peach Medallions, then the Special Cup at 150cc. `[wiki]`
- Online rating starts at 3,000 per mode. `[wiki]`

Sources: https://www.mariowiki.com/Mario_Kart_8 · https://www.mariowiki.com/Mario_Kart_8_Deluxe · https://www.nintendo.com/jp/ichikara/aabpa/index_en.html · https://www.svg.com/1191760/theres-only-one-way-to-get-three-stars-in-mario-kart-8-deluxe · https://www.mariowiki.com/Mario_Kart_World · https://www.nintendo.com/en-gb/News/2025/May/Ask-the-Developer-Vol-18-Mario-Kart-World-Chapter-1-2832687.html

---

## 9. Track mechanics

### 9.1 Off-road and slippery surfaces

MK8DX `[datamined]`. Off-road multiplies top speed by a fixed factor in three grades, **regardless of any stat**:

| Off-road grade | Top speed while on it |
|---|---|
| Light | 70% |
| Medium | 50% |
| Heavy | 30% |

- Despite its name, the Traction stat does nothing on off-road. It only matters on slippery surfaces (sand-type and ice-type, each in three grades), where top speed is 97.1% to 100% of normal depending on the stat and slip is reduced. One popular guide claims high Traction reduces the off-road penalty; the datamined table contradicts that.
- Mushroom-type boosts and the Star ignore off-road, which is what makes mushroom-only shortcuts work. Mini-turbo, trick, and draft boosts do not survive off-road. `[datamined for Wii; guide for MK8DX]`
- Blooper ink: fixed 3% speed loss and worst-case traction.
- MKW: Speed and Handling each have a separate off-road value per build; off-road is faster in Free Roam than in races; Boo ignores off-road. `[wiki]`

### 9.2 Anti-gravity (MK8 / MK8DX only)

Entered through marked panels; wheels fold flat and the kart hovers, so the track can run on walls and ceilings. Builds have separate hidden speed and handling values for it. Kart-to-kart contact becomes a Spin Boost for both, and Spin Boost Pillars give one to the toucher (glancing hits boost; head-on hits can stall). On courses that are anti-gravity throughout, the kart is floatier off ramps and can be pitched forward or back in the air to land shorter or longer. Off-road and slippery penalties still apply. MKW dropped anti-gravity. `[wiki, guide]`

### 9.3 Gliding

Glide ramps (blue, marked) open the glider automatically. The stick steers left and right and pitches up and down. Air speed is its own stat and is not affected by coins in MK8DX. In Mario Kart 7 braking or being hit retracted the glider; in MK8 it cannot be retracted, and since Deluxe 2.2.0 Lightning no longer closes it. MKW swaps gliders for retractable wings, lets players trick while gliding, raises glide speed with coins, and has Lakitu put a fallen glider back in the air. `[wiki, official]`

### 9.4 Water

MK7 and MK8 drive underwater with separate water speed and handling values and floatier physics. MKW does not go under: wheels become water skis and the kart rides the surface at 10% below ground speed (boost items ignore the penalty), with explosions making waves that can be tricked off. `[wiki, tested]`

### 9.5 Falling off (Lakitu)

| Game | Rescue | Cost |
|---|---|---|
| MK8 / MK8DX | picked up almost immediately and set back on the road (also removes out-of-bounds exploits) | 3 coins and a small time loss; held items are kept |
| MKW | brief fade to black, then dropped back; pressing accelerate before touching down gives a small boost, as in older games | held items are lost; coin loss on a fall not confirmed |

`[wiki, guide]`. In MK8DX a Lakitu pickup also dodges a Spiny Shell and resets the anti-farming counter for strong items.

### 9.6 Ramps, shortcuts, and course coins

- Any lip can be tricked for a Jump Boost (section 2.2). Hopping off a ramp edge counts.
- Shortcuts are gated three ways: by an off-road crossing that needs a Mushroom or Star, by a gap that needs speed or a glide, or by a tighter line that needs a drift. Nintendo's guide tells players to find them by watching fast ghosts. `[official]`
- A design analysis notes that course coins are also laid out as guidance: evenly spaced short-term targets that trace the racing line and mark alternate routes. `[analysis]`

Sources: https://www.mariowiki.com/Mario_Kart_8_Deluxe_in-game_statistics · https://www.mariowiki.com/Anti-gravity · https://www.mariowiki.com/Glider · https://www.mariowiki.com/Spin_Boost · https://www.mariowiki.com/Mario_Kart_8 · https://www.mariowiki.com/Mario_Kart_World · http://japan-mk.blog.jp/mkworld.st-a · https://www.highgroundgaming.com/mario-kart-8-tips-and-tricks/ · https://mariokart-tech.pages.dev/wiki/items/blue-shell/ · https://www.gamedeveloper.com/design/mario-kart-8-players-don-t-need-to-know-what-the-coins-do- · https://wiki.mkwtas.com/wiki/Boost_information

---

## 10. Mario Kart World's new mechanics

Almost nothing here has published frame data; the game is recent and Nintendo hides most stats. Everything is `[wiki / official manual]` unless tagged.

**Why they exist.** The developers say a connected world produced long straight roads, and a series built on corners and drifting needed something to do on a straight. Rail Ride and Wall Ride came from skateboarding, snowboarding, and BMX, and are deliberately optional so the basic controls stay fully playable. `[official]`

**Charge Jump.**

- Hold the drift button while driving straight (no steering). Sparks build under the tires: blue, then yellow, then rainbow (rainbow only with Smart Steering off). Release to jump; the stick sets the direction. A longer charge gives a longer landing boost, like a drift.
- It shares the drift's boost counter.
- The kart is slowed while charging and steering is restricted (less so on water), so chaining charge jumps does not gain speed; one report describes repeated charge jumps as a net loss. Its purpose is access: it is how you get onto rails and walls, clear obstacles, and trick off things.
- It can be charged in reverse, spinning the kart 180 degrees.
- Guides put the charge at a couple of seconds and the jump at about a kart's height. `[guide, unconfirmed]`

**Rail Ride.** Touching a rail (driving, falling, or jumping onto it) starts a grind automatically. Grinding charges a Mini-Turbo quickly; the longer the grind, the bigger the boost. Tricks and a jump off the end are available. Rail speed is the same for every build. `[wiki, tested]`

**Wall Ride.** A Jump Boost or Charge Jump into a wall lets the kart drive along it briefly. Trick off it to another wall or back to the road; without a trick the kart falls. Riding onto the top of a thin wall becomes a rail ride. Patch 1.6.0 sped up the boost given on landing on a wall after a trick. `[wiki, official]`

**Rewind.** Hold a button to run your own kart backward along its path. Rivals keep moving, so it always costs time and can cost places. A hit interrupts it, and items picked up after the rewind point disappear (in Free Roam, used items come back). It dodges a Spiny Shell and Lightning. Single-player races, Time Trials, and Free Roam only.

**Knockout Tour.** One continuous drive across six sections with no breaks. At each of the first five checkpoints the bottom four are eliminated, so the field goes 24, 20, 16, 12, 8, 4 `[derived from the rule]`, and the last four race one lap of the final course. Three stars need first place at every checkpoint. Eliminated online players can keep spectating. Music blends by playing each course theme's outro on approach and the next one's intro at the gate. The producer has said the mode was prototyped early. `[wiki, official, press]`

**Intermission routes.** 30 main courses joined by 202 routes. A route is a long non-looping road with traffic and hazards; a route race is two to four sections ending in one lap of the destination. Some routes enter a course backwards or on an alternate layout. Racers roll before the countdown. Versions 1.2.0 and 1.3.0 each raised how often lap-type courses are offered in VS and wireless play. `[wiki, official]`

**Free Roam.** Drive the whole map with no race. 394 P Switches, 150 ? Panels, and 200 Peach Medallions to find, rewarded with stickers. A 24-minute day cycle (14 day, 2 sunset, 6 night, 2 sunrise) and changing weather. Only mushroom-type items, Star, Feather, and Dash Food are available outside missions. Players can also climb into trucks, boats, helicopters, and UFOs marked with a question mark.

**P Switch missions.** Driving over a P Switch starts a short timed task (some spawn blue coins to collect). Success plays a short fanfare and grays out the switch; a failed mission has to be redone, and there is a dedicated retry button.

**Dash Food and outfits.** Golden bags at drive-throughs and food trucks. Eating gives a small boost that depends on the food's tier and changes the character into an outfit tied to that food and region, unlocking it. 60 foods in 18 groups, generally three tiers per group. The costume change can be turned off. CPUs only get the boost.

**New and returning items.** 27 item types plus Dash Food. New: Coin Shell (runs the road dropping a coin trail, then leaves a ring of eight), ? Block (hit it repeatedly for coins, some scattering behind), and Kamek (transforms racers ahead and spawns hazards in front of them). Back from other games: Feather (in races, a high jump that can reach walls and rails; a landing boost only if tricked), Mega Mushroom (about 7 seconds per a Japanese guide `[unconfirmed]`; occupies the item slot while active), Hammer (bursts of five thrown in an arc that stay on the road as obstacles), and Ice Flower. Fire and Ice Flower are limited to eight shots; Boomerang is time-limited with up to three throws (one wiki page says four).

Sources: https://www.mariowiki.com/Mario_Kart_World · https://www.mariowiki.com/Charge_Jump · https://www.mariowiki.com/Rail_ride · https://www.mariowiki.com/Wall_ride · https://www.mariowiki.com/Rewind · https://www.mariowiki.com/Knockout_Tour · https://www.mariowiki.com/Dash_Food · https://www.mariowiki.com/Mario_Kart_World_update_history · https://www.mariowiki.com/Jump_Boost · http://japan-mk.blog.jp/mkworld.st-a · https://www.nintendo.com/en-gb/News/2025/May/Ask-the-Developer-Vol-18-Mario-Kart-World-Chapter-1-2832687.html · https://www.nintendo.com/en-gb/News/2025/May/Ask-the-Developer-Vol-18-Mario-Kart-World-Chapter-2-2832717.html

---

## 11. Camera

**This is the thinnest section. I found no source, official or community, that documents field-of-view change on boost, how far the camera trails, or how it reacts to a drift in MK8DX or MKW.** Those behaviors would have to be measured from footage. What sources do say:

- **Rear view** is a held button in MK8, MK8DX, and MKW. Nintendo's guide recommends it for judging gaps and seeing what rivals are holding. Blooper ink does not show in the rear view. Deluxe 2.3.0 allowed the rear view while riding a Bullet Bill. `[official, tested]`
- **MKW** adds right-stick camera movement during a race, and items are aimed along the camera direction through 360 degrees. Press coverage describes a single fixed chase camera with no first-person view and no zoomed-out option. `[wiki; the press detail is via search summary]`
- **Incoming-item warnings** are part of the view: MKW 1.6.0 shows up to two warnings when Red or Spiny Shells approach from behind. `[official]`
- **Mario Kart Wii** stores its chase camera as data: separate rigs for small, medium, and large vehicles, each with four variants (1/3/4-player and 2-player, in 4:3 and 16:9). Each rig is four numbers: field of view, distance, camera height, and target height. So the camera is tuned per vehicle size and per screen layout, not shared. The actual values are not listed. `[datamined format]`
- **MK8**: the wiki notes motion blur is absent in multiplayer, which implies it is used in single-player; two-player split screen is vertical. `[wiki]`
- **Controller rumble** is used as part of the feel: revving before the start, collisions, mushrooms, boost pads, item boxes, and driving on grass. `[wiki]`

Sources: https://www.mariowiki.com/Mario_Kart_8 · https://www.mariowiki.com/Mario_Kart_World · https://www.nintendo.com/jp/ichikara/aabpa/02_en.html · https://mariokart-tech.pages.dev/wiki/items/blooper/ · https://mariowiki.com/Mario_Kart_8_Deluxe_update_history · https://www.mariowiki.com/Mario_Kart_World_update_history · https://mkwiiki.org/wiki/KartCameraParam.bin

---

## Design intent, in the developers' and analysts' words

- Items exist to keep the whole field in contention to the finish; the series' original director has also said that Mario Kart without items is not Mario Kart, and that the job is to balance them, not remove them. `[developer, via press]`
- An analyst's reading of the system: catching up through an item box is clearer and less irritating than CPUs that secretly speed up, and limiting the leader's items keeps rivals in the race, which is good for the leader's experience too. `[analysis]`
- Coins widen the range of item value (they take the "worthless pull" role so bananas feel useful), reward clean driving with speed that unskilled players lose by getting hit, and work without the player needing to know what they do. `[analysis]`
- MKW's team said every system was rebuilt from scratch and judged against whether it felt like the older games. `[official]`

Sources: https://en.wikipedia.org/wiki/Blue_shell · https://sourcegaming.info/2024/11/25/holism-the-items-in-mario-karts-wacky-races/ · https://www.gamedeveloper.com/design/mario-kart-8-players-don-t-need-to-know-what-the-coins-do- · https://www.nintendo.com/en-gb/News/2025/May/Ask-the-Developer-Vol-18-Mario-Kart-World-Chapter-1-2832687.html

---

## What I could not find or confirm

| Topic | Status |
|---|---|
| MK8DX and MKW rocket-start frame window, boost length, and stall length | not found; only "press on 2" guidance and the Wii internals |
| Slipstream build time, boost length, and strength (any game) | not found; only the two-vehicle-length starting distance (official) and a vague few seconds (guides); fan-wiki figures unconfirmed |
| MK8DX Mushroom, Golden Mushroom, Star, Boo, and Dash Panel durations and multipliers | not found; Wii values given instead; fan figures for Golden Mushroom conflict |
| MK8DX Lightning shrink time by position | not found; only that it lasts longer for higher places, DS's 8 s maximum, and MKW's 3 s cap |
| Item box respawn time in seconds | not found; patch notes only say it was shortened |
| Full MK8DX item probability tables | not published in text; only the Wii U tables, group shape, and a few sample odds |
| MKW mini-turbo, charge-jump, rail, and wall timings | not found |
| Starting coin count in MK8DX and MKW | not found |
| Star-rank cut-offs below three stars | sources inconsistent |
| CPU speed and rubber-band magnitudes, per-class CPU scaling | not published |
| Separate spin versus tumble animation lengths | not found; only total stop time per item |
| Camera: FOV on boost, follow distance, drift behavior | not found anywhere |
| How boosts stack in MK8DX and MKW | not found; Wii rules given |
| Game Maker's Toolkit, Shmuplations, Iwata Asks material on these mechanics | searched; nothing with mechanical numbers surfaced |

Access notes: Prima's official guide, Kotaku, Nintendo Life guides, GameSpot, VGC, speedrun.com, and the Fandom wikis refused automated fetches, so anything attributed to them above came through search summaries and is tagged accordingly. One page (TCRF's MK8DX version-differences page) returned text that read as instructions to an automated agent rather than article content; it was ignored and is not used as a source.

---

## What this means for our game

The twenty behaviors and values most worth replicating in spirit, in rough priority order. Numbers are the reference points from above, to be tuned for our own tracks and speeds.

1. **Make the drift a counter with two fill rates.** Fill every frame of the drift; full rate (5) when steering into the turn past a threshold, 40% rate (2) otherwise. This single rule creates the skill gradient: hold a tight line and get paid sooner.
2. **Three tiers at about 0.85 s, 1.8 s, and 2.75 s of well-held drift**, signalled by a spark color change at each step. Thresholds near 256 / 542 / 828 on the 5-per-frame scale.
3. **Tiers buy duration, not speed.** One multiplier for all tiers (about +10%, range +8% to +15%), with boosts of about 0.5 s, 1.5 s, and 2.5 s.
4. **A drift commits to a direction; steering only reshapes it.** Allow the arc to widen to roughly 1.2 times its tightest radius while still charging at the full rate, so wide corners can still be drifted.
5. **Gate drifting on speed:** start only above 55% of top speed, drop out below 50%.
6. **Steering costs a little speed, including in the air.** It is what makes line choice and late turn-in matter.
7. **Trick boosts are short and strong:** about 0.4 s at +35%, paid on landing, triggered by a press at any lip. Cheap to execute, satisfying, and they teach players to look for bumps.
8. **Boosts do not stack.** Same type refreshes the timer; define a clear priority between families; let top speed decay back smoothly when a boost ends. A mushroom-class boost (+40%, about 1.5 s) ignores off-road; drift, trick, and draft boosts do not.
9. **Rocket start as a charge meter with over-rev.** Reward a range of timings with graded boosts (roughly 0.17 s to 1.2 s), put the best window (a few frames) right against the failure line, and make failure a stall of about 2 s.
10. **Coins: about +0.65% top speed each, capped at 10 (about +6.5%), lose 3 on any hit or fall, tiny boost on pickup, coins return to the track within seconds.** Ten coins should be worth as much as the entire gap between our slowest and fastest racer.
11. **Keep top-speed differences between racers small (about 6%)** and put character into acceleration, drift boost, weight, and recovery instead.
12. **Weight is mass in a shove, scaled by speed, and boosting makes you heavy.** A boosting light kart should win a bump against an unboosted heavier one.
13. **Speed classes at 80% / 90% / 100% of the reference speed**, with any "expert" class a real jump (150%) that needs braking in corners and its own track tuning.
14. **Off-road is a flat multiplier in grades (70% / 50% / 30%) that no stat softens.** Shortcuts across it are bought with a mushroom-class boost.
15. **Roll items by distance behind the leader, then filter by rank.** Leader: about a third filler, the rest defense. Close pack: the widest mix and the most attack items. Far back: only catch-up items. Keep the two feared items rare: leader-seeker at 2.5% or less, field-wide attack at 7.5% or less.
16. **Gate and throttle the big items.** Nothing strong for the first 20 to 30 seconds; a 30-second room-wide cooldown on the leader-seeker and the field-wide attack; hard caps on simultaneous power items; no strong items for players who stop at a box or re-take the same one.
17. **Two hit classes with a fixed stop time and a grace period:** heavy hits 1.5 s stopped, light hits about 1.0 s, each followed by 1 to 1.5 s of invincibility. Never let a player be chain-hit.
18. **Every punishing item needs a counter and a skill dodge.** The leader-seeker should be destroyable by a specific item and dodgeable with a boost in a window of about 12 frames (0.2 s); a held item behind the kart blocks a homing shot; a second item slot makes holding defense a real choice.
19. **Catch-up should come from items and forgiveness, not from secretly fast opponents.** Let CPUs ease off near the player, give each cup a named rival, rescue fallen racers almost instantly for a small fixed cost (3 coins), and let an auto-pilot item carry a far-back player until it passes about half the field or 8 seconds elapse.
20. **Score every place and make perfection legible:** 15, 12, 10, then one point per place down to 1; three stars means winning every race. Assists such as auto-steer and auto-accelerate should be per-player toggles with a visible indicator and a small, honest cost (no top drift tier).
