# BILLIONAIRE KART: AI ARMS RACE — Design Doc

## The pitch
Mario Kart's formula — arcade kart racing where items favour the back of the pack so
races stay tight and funny — reskinned with the most recognisable rivalry on Earth
right now: the AI billionaire race. Seventeen parody tech moguls in the character pool, rocket karts, and items
that are literally the weapons of their world: funding rounds, viral tweets,
subpoenas, antitrust suits and market crashes.

**Tagline:** *Eight egos. One trophy. Zero antitrust immunity.*

It is a parody. Racers are original low-poly bobblehead caricatures (colours, outfits
and one-line barks), not realistic likenesses.

## What the reference articles taught us (applied here)

1. **Battle Drones (Simon Willison)** — a game that *looks* like a game isn't fun by
   default. Fun came from a dedicated pass: comeback mechanics, objectives that pull
   players together, juice (particles, sound, announcer-style feedback), and
   balance verified by **simulated playtests (1,200 AI-vs-AI matches)**.
   → Applied: position-weighted item table (the core Mario Kart comeback system),
   rubber-band AI, drift-boost as the skill mechanic, heavy juice, and a headless
   **bot playtest** (`tools/bot-test.mjs`) that drives the player kart, completes a
   race, and screenshots menu / race / finish for visual QA.
2. **"The Web Is More Than Enough" (HN, ftrain)** — the browser is the distribution:
   one URL, no install, works everywhere; Three.js vs raw WebGL is a trade-off.
   → Applied: zero-build static site, Three.js via CDN import-map, PWA service
   worker so it works offline after first load, GitHub Pages hosting.
3. **Fable 5.2 / Aiden's Revenge (Lex)** — controllers made it a party game
   (4× Bluetooth PS controllers just worked via the Gamepad API), unlockables and
   per-character specials created the emotional hooks, and the agent *playtested
   with a bot in a headless browser and checked screenshots*.
   → Applied: full Gamepad API support (any Bluetooth/USB pad), a 17-racer character pool with
   distinct stats + barks, touch + gyro + keyboard + mouse, bot playtest.

## Core loop
Pick your mogul from a 17-racer pool → 3 laps, 8 racers on track (you + 7 AI sampled at random each race) → item boxes → position-weighted items →
drift-boost skill layer → live standings → podium. ~3–4 minutes per race.

## Racers (stats: Speed / Accel / Grip, hidden weight)
| Racer | Persona | Strength |
|---|---|---|
| Elon | Rocket Man | Top speed |
| Sam | The Optimist | Acceleration |
| Zuck | The Lizard (allegedly) | Grip |
| Bezos | Prime Mover | Heavy, fast, slow launch |
| Trump | The Dealmaker | Fastest tier, grip of a wet soap bar |
| Cook | The Operator | Grip king, metronome-consistent |
| Larry & Sergey | The Founders | Two drivers, one kart — the duo |
| Thiel | The Seeing Stone | High-skill AI, sees your line |
| Holmes | The Vaporware | Fastest stats, but her engine randomly sputters (15% check every 6–14 s → 1.2 s power loss) |
| Ellison | The Media Mogul | Owns the island and the coverage |
| Murdoch | The Succession | Worst acceleration in the game, most consistent AI — never makes a mistake |
| Soros | The Final Boss | Joint-highest AI skill |
| Bill | The Philanthropist | Slow kart, smartest AI on the grid |
| Jensen | Leather Jacket | Handling + longer boosts |
| Satya | Cloud Boss | Balanced |
| Dario | The Safety Officer | Fast drift charge |
| Demis | The Games Master | All-rounder, smartest AI |

## Items (position-weighted — the Mario Kart secret sauce)
Weights shift hard by position: 1st mostly gets defence (Data Leak, Subpoena);
last place gets the comeback kit.

| Item | Mario Kart analogue | Effect |
|---|---|---|
| Series A Boost | Mushroom | 1.6 s speed burst |
| Data Leak | Banana | Dropped glowing puddle hazard, spins victims; “💧 DATA BREACH!” |
| Subpoena | Green Shell | Fast straight projectile |
| Viral Tweet | Red Shell | Homes in on the racer ahead |
| Antitrust Suit | Blue Shell | Flies to 1st place, AoE explosion |
| Viral Moment | Star | 6 s invincible, faster, knocks rivals |
| Market Crash | Lightning | Slows + shrinks everyone ahead |
| Spin Team | Super Horn | Shockwave: destroys projectiles/hazards nearby, spins adjacent karts; 0.6 s active window also kills an incoming Antitrust Suit — the hard counter blue-shell design requires. Weighted to positions 1–3 |
| Pink Slip | Bob-omb | Dropped bomb, 1.6 s flashing/beeping fuse (or contact), AoE spin ~8.5 |
| Smear Campaign | Blooper | Everyone ahead inked: AI wobble + slow 2.5 s; a human victim gets a 3 s screen splat |
| Insider Trading | Boo | Steals a random holder's item (boost if none held) + 3 s intangible ghost |
| Series F | Golden Mushroom | 5 s window; ITEM presses re-boost (0.7 s cd) |
| Government Bailout | Bullet Bill | 7th/8th only (trace in 6th): auto-drives at 130%, bulldozes contacts, ends early at 3rd — carries you to mid-pack, never to the win |

Balance rules baked into `rollItem`: 1st place draws defence only (Leak/Subpoena/Spin
Team/Series A/Pink Slip) — no attack power items and no coin-style dud. No self-harm
(Thundercloud-style) items exist. The Antitrust Suit is strong precisely because the
Spin Team exists as its counter.

## Controls
- **Keyboard:** WASD/arrows drive, Space item, Shift drift, R reset, P/Esc pause, M mute
- **Mouse:** hold left button = gas, mouse X steers
- **Gamepad:** left stick / D-pad steer, RT/A gas, LT/B brake, X/□ item, LB/RB drift, Start pause
- **Touch:** on-screen steer / gas / brake / drift / item buttons
- **Gyro (optional):** tilt-to-steer toggle on touch devices (DeviceOrientation, with iOS permission flow)
- **Phone-as-controller:** any phone can be the controller by opening the game on the
  phone and using gyro/touch while the race mirrors on desktop via screen-share —
  native WebRTC controller pairing is on the roadmap (see README).

## Tech
- Three.js (CDN, import map), no build step, no bundler, no assets to download —
  every model is procedural low-poly geometry, every sound is synthesized WebAudio.
- Track = closed Catmull-Rom spline; arcade physics sampled against the spline
  (nearest-sample progress, lateral offset for off-road/walls) — robust, no physics
  engine, 60 fps on phones.
- Two tracks: **Silicon Valley GP** (day, green) and **Mars GP** (sunset, red dust).
