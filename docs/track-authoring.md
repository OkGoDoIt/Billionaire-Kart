# Track authoring guide

A track is **one file**: `src/tracks/<id>.js`. It exports a plain object that describes a closed loop of road plus everything on and around it. The engine builds the road, kerbs, shoulders, barriers, tunnels, bridges, and terrain from that data, so you never model the road by hand.

Reference files to read before you start:

- `src/tracks/silicon-valley.js`: a complete, dressed, shipping track. Copy its structure.
- `src/tracks/_lab.js`: every toolkit feature in one short loop (tunnel, bridge, void edges, gap jump, each obstacle kind).
- `src/models/props.js` and `src/models/build.js`: the prop library and the modelling toolkit.
- `src/render/scenery.js`: the placement helpers used inside `decorate`.
- `docs/research/mk-reception-and-design.md`: what makes kart tracks fun or boring.

## Rules

1. Only add files: `src/tracks/<id>.js`, optionally `src/models/props-<id>.js` for track-specific props, and image assets under `assets/backdrops/` or `assets/tracks/<id>/`. **Do not edit engine files** (`src/track`, `src/race`, `src/render`, `src/models/build.js`, `src/models/props.js`, `src/content`). If the toolkit cannot do something you need, say so in your report instead of working around it in engine code.
2. No real company names, logos, or trademarks in scenery or signs. Parody names only. No real people in scenery.
3. The track file must import cleanly in Node (the simulator loads it). Only touch `document`, textures, or meshes inside `decorate` or inside functions it calls.
4. Do not run git commands. Do not use the shared Browser pane; use the command-line tools below.

## Coordinates and units

- Metres. `y` is up. A path point is `{ p: [x, y, z] }`.
- The path is driven in the order written. With the car heading along +x, **left is −z** and right is +z. Lateral offsets (`lat`) are positive to the **left** of the driving direction.
- Positions along the lap are given in **control-point units**: `at: 4.5` means halfway between path points 4 and 5. They wrap, so `from: 12.3, to: 1.6` crosses the start line.
- Point 0 is the start/finish line. Make it the middle of a straight at least 120 m long, and keep the 60 m before it straight too (the grid sits there).

## The definition

```js
export default {
  id: 'my-track',                 // same as the file name
  name: 'My Track',
  tagline: 'One short line.',
  laps: 3,
  width: 17,                      // default road width in metres (15–20 is the useful range)
  sky: 'day',                     // day | golden | dusk | night | mars | space  (see src/render/sky.js)
  skyOverrides: {},               // optional tweaks to that preset (same keys)
  backdrop: { img: 'assets/backdrops/my-track.webp', top: 27, bottom: -9, rot: 0.1 }, // optional painted horizon
  offroad: 'grass',               // surface beyond the shoulder: grass | sand | dust | snow | dirt | water
  surface: 'road',                // default road surface: road | dirt | ice | metal | glass
  gravity: 1,                     // 0.55 gives floaty low-gravity jumps
  defaults: { edge: 'open', shoulder: 3.5, outer: 11 },

  path: [ { p: [0, 0, 0] }, { p: [95, 0, 0] }, { p: [172, 1.5, 28], w: 19, bank: 0 }, … ],

  sides:   [ { from, to, side: 'L'|'R' (omit for both), edge: 'open'|'wall'|'void', shoulder, outer } ],
  zones:   [ { from, to, surface: 'dirt', skin: 'dirt' } ],   // surface = physics, skin = how the road looks
  tunnels: [ { from, to, through: true } ],            // arched shell; through:true lets a hill sit on top
  bridges: [ { from, to } ],                           // deck, pillars; terrain is not pulled up to it
  gaps:    [ { from, to } ],                           // missing road: must be jumped
  ramps:   [ { at, len: 9, lift: 2.1, lat: 0, w: 6 } ],   // omit w for full width; trick-enabled
  boosts:  [ { at, lat: 0, w: 5, len: 8 } ],
  itemRows:[ { at, n: 4 } ],
  coins:   [ { from, to, n: 5, lat: 3 | [from, to], air: 0 } ],
  obstacles: [ { kind, model, at, lat, … } ],          // see Obstacles
  terrain: { fn(x, z) { return height; }, water: -1.4, margin: 150, blend: 30, cell: 3 },
  look: { … },                                         // colours, see Look
  models: { name: () => Group },                       // optional custom obstacle models
  decorate(ctx) { … },                                 // scenery; browser only
};
```

### Path

- Smooth closed spline through the points. 10–18 points is typical. Space them 50–110 m apart; closer spacing makes tighter corners.
- Per point: `w` (road width there), `wl`/`wr` (half-widths if asymmetric), `bank` (extra banking in degrees; the engine already banks corners automatically).
- Height comes from the `y` values. Keep grades under about 10%. Crests that drop away quickly make karts catch air, which is good in moderation.
- The track may cross over itself only with a bridge (mark the upper section in `bridges`) and at least 9 m of clearance.

### Edges

Each side of the road is one of:

- `open` (default): kerb, a drivable shoulder of `shoulder` metres, then off-road ground out to `outer` metres from the road edge, where a low sponsor wall stops the kart. Raise `outer` (25–40) where you want an off-road shortcut or a meadow.
- `wall`: a solid barrier right at the road edge. Use for pit straights, bridges you should not fall from, tunnels (automatic), and city sections.
- `void`: nothing. Driving off means falling and being rescued. A glowing rail marks the edge. Use for sky roads, piers, and bridges that should be scary.

### Terrain

`terrain.fn(x, z)` returns the height of the land far from the road. Near the road the engine blends it to the road's own height over `blend` metres, so the road always sits on the ground. Shape hills, valleys, lakes (dip below `water`), and flat plateaus for buildings there. `terrain: false` removes the land entirely (space tracks).

Use `fbm(x * f, z * f, octaves, seed)` and `smoothstep(a, b, v)` from `src/core/util.js`. Keep the land above `water` except where you want water. A plateau: `h = h * (1 - k) + level * k` with `k = 1 - smoothstep(r0, r1, distance)`.

### Obstacles

Scripted, deterministic, and avoided by AI drivers.

| kind | moves | fields |
|---|---|---|
| `patrol` | back and forth between two points | `at`, `to` (optional), `lats: [a, b]`, `speed` |
| `orbit` | circles a point | `at`, `lat`, `orbit` (radius), `speed` |
| `timed` | switches on and off in place | `at`, `lat`, `period`, `duty`, `phase` |
| `static` | stays put | `at`, `lat` |

Common fields: `model` (`barrel`, `crate`, `drone`, `bot`, `flame`, or a name in your `models`), `radius`, `effect` (`spin`, `bump`, `squash`, `tumble`), `lift` (height above the road). Use 3–8 per track. Leave a clear line through every hazard so a good driver is never forced to get hit.

### Look

```js
look: {
  road: { base: 0x5d6373, line: 0xffffff, center: 0xffd23c },   // center: false removes the dashes
  kerb: [0xe23b3b, 0xf7f7f2], shoulder: 0xd2bb86,
  terrain: { low, high, dry, rock, sand, dirt, snow, snowLine },   // snow: colour above snowLine metres
  wall: 0xf1f1ee, wallStripe: 0xe23b3b, water: 0x2fa3e6, deck: 0xd9dde6, rail: 0x35e0ff,
  tunnelLight: 0xfff0c0, portal: 0xcfd5e2,
  ads: ['PARODY SLOGAN', …],   // text for the sponsor walls
}
```

Pick two or three dominant hues for the land and sky, and keep full saturation for the road furniture, karts, and items.

## Scenery: `decorate(ctx)`

`ctx` has `{ THREE, track, group, gfx, anim, view }`. Create a `Scenery` and place props:

```js
import { Scenery, partsOf } from '../render/scenery.js';
import * as P from '../models/props.js';

decorate(ctx) {
  const sc = new Scenery(ctx), rng = sc.rng;                       // seeded: same result every load
  const spots = sc.scatter({ count: 200, min: 15, max: 150, maxSlope: 0.6, minGap: 5, where: (x, z, h, dist) => true });
  sc.instances(partsOf(P.roundTree(1)), spots, { scale: [0.8, 1.5], yaw: 'random' });   // one draw call per material
  const row = sc.along({ from: 2, to: 4, side: -1, offset: 14, spacing: 12 });           // beside the road
  sc.instances(partsOf(P.palm(1)), row, { scale: [0.9, 1.2], yaw: 'random' });
  const p = sc.beside(6.2, 1, 20);                                  // one spot beside the road
  sc.place(P.billboard(texture), p.x, p.z, { yaw: p.yaw });         // a unique object
  ctx.anim.push((dt, time) => { /* per-frame animation */ });
}
```

- `min`/`max` in `scatter` are distances from the road edge. Nothing solid should be closer than `outer + 1.5` m on open edges, because karts can drive that far.
- Use `sc.instances` for anything repeated more than a few times. Use `sc.place` for landmarks.
- `ctx.view.fx` is the particle system (`flame`, `dust`, `burst`, `puff`) for animated set pieces.
- Start line: place `P.gantry(roadWidth + 1.5, 'TRACK NAME')` at point 0 and set `view.startLights = gantry.userData.lights` (copy from Silicon Valley).

Props available in `src/models/props.js`: `roundTree`, `cypress`, `palm`, `bush`, `rock`, `chevronBoard`, `tyreStack`, `cone3d`, `billboard`, `gantry`, `grandstand` + `spectator`, `campusBlock`, `ringHQ`, `rocketPad`, `balloon`, `blimp`. Build new ones in `src/models/props-<id>.js` with `ModelBuilder` from `build.js` (rounded boxes, spheres, lathes, tubes, lofts; merged per material). Keep shapes chunky and rounded; nothing should look like a bare box.

### Painted horizon

A wide transparent PNG wrapped around the sky gives the far depth layer. Generate one (about three cents):

```bash
node tools/gen-image.mjs --size 3072x1024 --quality high --background transparent --format png --out /tmp/backdrop.png --prompt "…"
magick /tmp/backdrop.png -quality 86 -define webp:alpha-quality=90 assets/backdrops/<id>.webp
```

Prompt pattern: *"A very wide horizon backdrop strip for a stylized kart racing video game, on a fully TRANSPARENT background. Only the distant landscape is painted: <what is on the horizon>. <time of day and palette>. Clean bold shapes, painterly 3D-animated-film look. The landscape occupies the lower 60 percent with an irregular natural silhouette along its top edge; everything above it is transparent (no sky, no clouds, no sun). The left and right edges are simple so the strip can be mirrored and tiled. No text, no people, no vehicles, no foreground objects."* Look at the result before using it.

## What makes a track good here

These come from the research notes; treat them as requirements.

- **One signature moment** a player would describe to a friend: a jump through something, a dive, a tunnel that opens onto a view.
- **Corners are for drifting.** Most corners should have a centre-line radius of 22–45 m and turn through 60° or more, so a drift can charge. Link some into S-bends. Avoid long straights with nothing on them: put coins, a boost pad, a jump, or a hazard choice every few seconds.
- **Elevation everywhere.** Climbs, drops, crests, banked sweepers. Flat is boring.
- **At least one earned shortcut:** an off-road cut that only pays with a boost item, or a narrow ramp line that is faster but riskier.
- **Landmarks, not arrows:** something big and specific at each end of the lap so players know where they are. Oversize it.
- **Three depth layers in every view:** trackside objects, mid-distance structures, and the horizon.
- **Fair hazards:** always a clean line; hazards telegraph themselves.
- Lap length 950–1,400 m (about 32–48 s at 150cc). Road width 15–20 m. Tightest inner-edge radius no less than 8 m.
- Item rows: 3–5 per lap, the first one 100–200 m after the start. Coins: 20–35, placed on the good racing line and on risky lines. Boost pads: 3–5.

## Checking your work

Run all of these and look at the pictures yourself. Do not report done until each passes.

```bash
node tools/track-map.mjs <id> /tmp/<id>-map.png     # top-down map and stats; open the PNG
node tools/sim.mjs --track <id> --races 6           # AI races: must finish, with few rescues
node tools/track-shots.mjs <id> /tmp/<id>-sheet.jpg # 8 views around the lap + aerial; open the JPG
node tools/shot.mjs --url "?track=<id>&auto=1&intro=0&q=high&seed=3" --at 6,14,22,30 --out /tmp/<id>-race.jpg   # in-race frames
```

Pass criteria:

- Map: the loop closes cleanly, no section passes within 25 m of another (except an intended bridge crossing), lap length and tightest radius are in range, and the listed corners show several real drift corners.
- Sim: no `FAIL` line, average rescues per race under 2, lap average under 50 s, field spread under 20 s.
- Sheet and race frames: no page errors; no scenery on the road or floating above the ground; the road is clearly readable in every frame; each of the eight views contains at least one mid-distance structure; draw calls under 800 and triangles under 1.8 million.

## Shortcuts across open ground

For a cut between two legs of the track, set `outer` on the facing side of **both** legs to a little more than half the distance between them, so the two drivable areas overlap, and add `hoarding: false` to those `sides` entries so no sponsor wall is drawn across the gap. A kart far off the road re-attaches to whichever stretch of track is nearest, so progress and lap counting keep working. Static obstacles placed off the road stand on the real ground.

### Shortcuts for computer rivals: `shortcuts`

Rivals follow the racing line unless the track tells them about a shortcut. Each entry is one cut:

```js
shortcuts: [
  { name: 'meadow',                 // shows in the sim's "shortcuts taken" line
    from: 22.2, to: 27.9,           // control-point units: where they leave the road, and where they are back on it
    path: [[-30, 166], [-16, 151], [-13, 132], [-19, 112]],   // [x, z] waypoints between the two, in driving order
    boost: false,                   // true: only take it holding a boost item (fired on the way in)
    skill: 0.6,                     // lowest driver skill that ever takes it (default 0.6)
    chance: 1,                      // scales the per-lap chance (default 1)
    when: (race, kart) => true },   // optional extra gate, e.g. the drained lake: race => race.lakeLap >= race.laps
],
```

- Each lap, a rival decides once, about 160 m before `from`, whether to take each shortcut. Relaxed rivals never do; Competitive ones about half the laps, Ruthless ones most laps (`cuts` in `AI_LEVELS`, `src/race/ai.js`). At the entry they check again: not spun out, up to speed, holding a boost item if `boost` is set, `when` passes, and, on a track with a `lake`, no water anywhere along the path. Any boost item in hand is saved for the cut and fired on it once the kart points down the path.
- On the cut they chase a point a little way along the path, steer round obstacles, karts, and solid scenery, and slow down if a bend in the path is too tight for their speed. They rejoin at `to` on the racing line.
- `boost`: decide it from measured time, not from the look of the ground. Grass, sand, dust, and snow cut top speed to 52 to 60% unless the kart is boosting. Time a lone rival through the stretch on the road, on the cut without a boost, and on the cut with one; set `boost: true` only if the cut loses without one, and drop the shortcut if the cut with a boost is no faster than using the boost on the road.
- Lay the path out for a kart arriving at 30 to 40 m/s (boost pads and mini-turbos at the entry): it turns on a radius of about 25 to 30 m, so put the first waypoint well beyond the road edge and keep each change of direction under about 35 degrees. Keep at least 6 m from obstacle and solid-scenery centres (8 m on the outside of a bend), every point inside the drivable area (`outer`), and every point nearer an open edge than a walled one: a kart whose nearest stretch of road is walled is put back on that road.
- Check it with `node tools/sim.mjs --track <id> --races 10 --level hard`: the "shortcuts taken" line counts how often rivals used each one (and how many of those on a boost). Rescues and unfinished races must not go up.

## Road skins

`skin` sets how a stretch of road looks; `surface` sets how it drives. They are independent. Set a default for the whole track with `look.road.skin`, and change it over a range with a `zones` entry.

Skins: `asphalt` (default, painted lines), `wood` (pier planks), `sand`, `dirt` (packed, tyre tracks), `metal` (riveted plates, hazard edges), `neon` (dark floor, glowing edge lines; pass `look.road.glow` for the colour), `glass` (rainbow road), `snow`, `ice`, `stone` (pale slabs), `cobble`, `carpet` (red, gold trim). `src/tracks/_lab.js` shows every one. Use at least two skins per track: a change of surface under the wheels is one of the cheapest ways to make a lap feel like a journey.

## Solid scenery

Pass `solid: <radius in metres>` to `sc.place` or `sc.instances` to make karts bounce off a prop (tree trunks, tents, pillars, statues). Use it for anything a kart can reach, especially along shortcuts, so the gap between two tents is a real gap.

## Lessons from the first tracks

- Keep obstacle hits fair. In `tools/sim.mjs` output, "hits per race" on a finished track should stay under about 32 (Silicon Valley Circuit is about 25). If patrolling obstacles push it higher, make them sweep less of the road or move them off the racing line.
- A lap needs contrast: bright open sections, an enclosed section, a high point with a view, a surface change.
- The aerial view should not look like a rectangle of land ending in fog: push `terrain.margin` to 200 or more, or surround the land with water.
- `tools/shot.mjs` and the other tools pick free ports, so several can run at once.

## Options added for Bliss Hills and Datacenter Dash

- `intro: [{ pos, look, pos1?, look1?, fov?, dur, grade? }]`: opening shots from fixed cameras, played before the usual flyover. `grade` (`{ sat, contrast, vignette }`) replaces the color grade for that shot.
- `terrain.marginX` / `terrain.marginZ`: `[low side, high side]`, for scenery that reaches further one way than the others.
- `look.groundTexture: 'meadow'` with `look.groundScale`: mown-grass ground map. `look.groundMatte: true`: ground with no shine, for saturated colors that must come out pure.
- `skyOverrides.clearSky: [bearing, halfWidth]` in degrees: a wedge of sky the procedural clouds keep out of, for a track that hangs its own (see `src/render/cloudcard.js`).
- `tunnelShell: false`: no arched shell over tunnel sections, for a track that builds its own interior.

Bliss Hills opens on a view matched to a reference photograph. The match is data in `src/content/bliss-wallpaper.js` (hill shape, ground colors, sky colors, cloud cover), measured from the photograph and calibrated against renders; the photograph itself is not part of the game.
