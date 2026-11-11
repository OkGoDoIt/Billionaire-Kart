# Mario Kart visual study: what the recent games look like on screen

Art-direction reference for our own original kart racer. Nothing here is to be
copied: no characters, logos, items, course layouts, or UI art. The point is to
extract measurable principles (framing, density, contrast, HUD budget) and apply
them to our own theme and assets.

## Method and limits

- 40 screenshots were collected and every one was viewed: 24 from Mario Kart 8
  Deluxe (MK8D) or its Wii U base game (MK8, same renderer and near-identical
  HUD), 14 from Mario Kart World (MKW, Switch 2, 2025), and one each from
  Mario Kart Wii and Mario Kart 64 for contrast. The manifest is at the end.
- The images are copyrighted reference material. They were saved outside this
  repository in a session scratch folder and are not committed. Re-fetch from
  the source URLs if needed.
- Measurements were read off a 10% grid overlaid on a 1024 px copy of each
  frame. Treat every number as plus or minus 2 percentage points. "y" is
  measured from the top of the screen, "x" from the left. Frame numbers in
  brackets, like [01], refer to the manifest.
- Sources that could be reached: Super Mario Wiki file pages, Nintendo's
  official store page (screened, none kept in the final set), and
  TheSixthAxis's review captures. MobyGames, Nintendo Life, VGC, and Eurogamer
  refused automated access, so they were not used.
- Gaps, stated plainly: no still of a "final lap" text banner was found (the
  lap board held by the race marshal is captured in [20] and [34]); no still of
  the item roulette mid-spin; no 3D podium scene (the trophy and standings
  screens are captured instead); no MKW vehicle-select screen with stats (the
  MK8D one is captured). Four of the effect shots are official promo stills
  with a cinematic camera and depth of field, which the in-race camera does not
  use. Those are marked "promo" and were used for materials and effects only,
  never for camera measurements.
- Track names are left out where they were identified only by eye.

## 1. Camera and composition

### Measured frames (standard chase camera, flat ground unless noted)

| Frame | Game, context | Horizon y | Driver top y | Wheel bottom y | Kart+driver height | Kart width |
|---|---|---|---|---|---|---|
| [01] | MK8D, grass circuit | 37% | 54% | 86% | 32% | 16% |
| [02] | MK8D, city start grid | 36% | 54% | 86% | 32% | 16% |
| [03] | MK8D, beach boardwalk | 37% | 52% | 87% | 35% (tall driver) | 16.5% |
| [04] | MK8, desert, heading downhill | about 18% | 58% | 87% | 29% | 15% |
| [06] | MK8D, neon night start | 39% | 52% | 85% | 33% | 16% |
| [07] | MK8D, rainbow road, mid-drift | 42 to 48%, tilted | 54% | 82% | 28% | 17% (kart yawed) |
| [09] | MK8, castle hall | 39% | 50% | 87% | 37% (big driver, big tires) | 18% |
| [18] | MK8D, rocket start | 40% | 51% | 86% | 35% | 15% |
| [11] | MKW, stadium straight, boosting | 40% | 47% | 75% | 28% | 13% |
| [12] | MKW, river, descending | about 20% | 47% | 75% | 28% | 10 to 11% |
| [13] | MKW, ice plaza, cruising | 37% | 50% (large bow) | 88% | 38% (body alone 26%) | 14% |
| [32] | MK8D, 2-player split (per viewport) | 43% | 56% | 86% | 30% | 27% of viewport |
| [33] | MK8D, 4-player split (per viewport) | about 44% | n/a | n/a | about 34% | about 19% of viewport |
| [39] | Mario Kart Wii | about 30% | 53% | 85% | 32% | 9% (bike) |
| [40] | Mario Kart 64 (4:3) | about 33% | 53% | 76% | 23% | 14% |

### What the numbers say

- **Horizon:** 36 to 40% from the top on flat ground. That gives the ground
  plane about 60 to 63% of the frame. On descents and vistas the horizon climbs
  to 15 to 20% and the frame becomes nearly all track and landscape ([04],
  [05], [12]). It never sits at the middle of the screen.
- **Player kart:** in MK8D the kart plus driver is 30 to 35% of screen height
  and 15 to 17% of screen width, horizontally centered at 50% plus or minus 1
  point on straights. The wheels touch down at 85 to 87%, leaving a clean 13%
  strip of road under the kart. The driver's head tops out at 50 to 55%, just
  below screen center, so the head never covers the vanishing point.
- **MKW pulls back slightly:** the kart is 10 to 14% wide and sits higher (wheel
  bottom at 75% in two of three frames). Tracks are wider and fields are 24
  racers, so the game shows more ground around the player. While boosting the
  kart reads smaller again [11] than while cruising [13], consistent with a
  field-of-view kick.
- **Frame budget on a typical daytime straight** ([01], [02], [03]): drivable
  road 45 to 55% of the frame, roadside ground 5 to 15%, things standing above
  the horizon (buildings, trees, stands, arches) 20 to 28%, open sky 10 to 20%.
  Indoors and at night the sky share drops to zero and is replaced by lit
  structure ([06], [08], [09]).
- **Road width:** in [04] a row of five item boxes spans the lane. Scaling by
  perspective, that row is about 6.5 kart widths, with each box about 0.9 kart
  width and 1.6 kart widths between centers. Ordinary sections therefore read
  as roughly 6 to 8 kart widths. Start straights and plazas open far wider: 15
  to 25 kart widths in [02], [09], and [11]. An MKW two-lane road with shoulders
  [14] estimates at 12 to 15 kart widths. These are perspective estimates, not
  game data.
- **Camera height and pitch (derived, not known):** you see the top of the rear
  bodywork, the driver's back, and the crown of the head, never the hood. If
  vertical field of view is about 50 degrees, the screen positions above are
  consistent with a camera about 3.5 to 3.8 kart widths behind the kart, about
  1.6 kart widths above the ground, pitched 6 to 8 degrees down. Use this as a
  starting point and tune until the screen-space targets in the table are hit;
  the targets matter, the derivation does not.
- **Sight distance:** on straights the road is visible all the way to the
  vanishing point. Rivals four times farther away than the player's own kart
  are still individually readable [13]. Bends are announced by chevron boards
  before the apex is visible ([14], [16]).
- **Drift framing:** the kart yaws 20 to 30 degrees while the camera keeps
  looking along the direction of travel, so you see the kart's rear quarter
  and the horizon tilts a few degrees [07].
- **Split-screen keeps the composition per viewport.** Two players split
  vertically (side by side), four players in a 2x2 grid. The kart keeps about
  the same height fraction inside its viewport; in the narrow 2-player viewport
  it simply takes more of the width (27%).
- **Contrast with the older games:** the 64 kart is small (23% tall) with the
  horizon at a third; Wii already uses the modern 32% framing. The framing has
  been stable for 15 years. What changed is everything around it.

## 2. Road and track surface

- **Base surfaces are textured, mid-value, and low in saturation.** Asphalt is
  a mid-grey with fine grain and visible wear ([02], [14], [21]); sand is one
  warm hue with soft tire ruts [04]; wood planks carry strong directional
  lines [03]; ice is tiled and reflective [13]; neon tracks are dark glossy
  panels that mirror the lights [06]. The road is always quieter in color than
  the karts driving on it.
- **Markings do speed work.** Lane dashes, start-grid brackets, checker bands,
  plank seams, and tile joints all run toward the vanishing point or cross it
  at regular intervals, so motion is readable even on an empty road. The start
  line is a two-row checker band about 8% of screen height at kart distance
  ([02], [06], [18]), tinted to match the track's palette (red and white in
  the city, purple and white under neon, orange on the volcano).
- **Edges are always a continuous, contrasting band:** green and white kerb
  stripes [14], an orange steel border around the grating [01], a yellow and
  white kerb [37], red and white barrier boards [15], a raised curb with a
  two-tone stripe [03], a gold zigzag carpet border [09], small red marker
  poles on snow [05], glowing strips on dark tracks ([06], [20]). There is no
  frame where the edge of the drivable surface is ambiguous.
- **Barriers:** low sponsor-banner walls about one kart height tall along
  start straights [02], colored tire-block walls (blue, yellow, green, red)
  [14], steel guard rails on posts ([01], [15]), mesh fence panels in painted
  frames [16], rope and timber fences on dirt [17].
- **Where the edge meets scenery:** road, then kerb or rail, then a strip of
  grass, sand, or water one to three kart widths deep, then props. That buffer
  strip keeps props from visually touching the racing surface.
- **Boost pads and ramps:** boost surfaces are bright chevron strips that glow
  against the ground: an orange and yellow chevron panel on a dark deck [22],
  and a glide ramp in saturated blue with white chevrons, about 10% of screen
  height at approach distance [19]. Both use a color that appears nowhere
  else on that track.
- **Alternate surfaces are announced by material,** not by signs: steel
  grating over grass for a shortcut [01], red carpet next to stone [09], dark
  grates beside tile [11].
- **Shadows fall across the road.** Long cast shadows from roadside objects
  stripe the surface ([02], [03], [07]) and double as a speed cue.

## 3. Environment

### Layering

Every outdoor frame has three depth layers plus sky:

1. **Near (within about two kart widths of the edge):** rails, lamp posts,
   banners, spectators, cones, tire stacks, palm trunks. These pass quickly
   and sell speed. Expect something every three to five kart lengths.
2. **Mid (the band standing above the horizon, 20 to 28% of the frame):**
   buildings, grandstands, arches, big trees, rock walls. This is where the
   theme lives.
3. **Far:** one or two large simple silhouettes: a ferris wheel [03], pyramids
   and a sphinx [04], a ringed planet [07], a mountain range fading into sky
   color [05]. One hero landmark is visible from most of the lap.

The start and finish line always gets a gantry or arch spanning the road, 30
to 40% of screen width when approached ([01], [11], [13]).

### Per theme

| Theme | Frames | Palette script | Props and set pieces | Animated or living elements |
|---|---|---|---|---|
| Grass circuit | [01] | Green and sky blue, orange and red accents | Giant mushrooms, inflatable arch, guard rails, tire stacks | Marshal on a cloud with flag, spectator group behind rail, parade balloon |
| City and harbor | [02] | Pastel buildings, grey road, cyan sky | Continuous sponsor banners, palms, lamp posts, shopfronts, covered arcade | Spectators at the barrier, marshal with start lights |
| Beach | [03] | Warm wood, blue sea and sky | Umbrellas, deck chairs, juice bar with a big sign, ferris wheel, railings | Spectators, a sailboat on the horizon |
| Desert | [04] | One sand hue, green and blue oasis accent | Pyramids, sphinx, palms, pond | Water splash, item-box row |
| Snow | [05] | White with pale blue shadow | Mountain vista, ridge track, marker poles | A line of pickups along the ridge |
| Night and neon | [06] | Black, magenta, and violet with white light | Speaker stacks, LED equalizer walls, light trusses | Spotlight beams, confetti |
| Rainbow and space | [07], [20] | Deep blue-black with emissive color | Planet, starfield, glowing rings, sci-fi architecture | Floating obstacles, ring gates |
| Indoor factory | [08] | Brown wood and brass, warm lamps | Giant gears, timber beams, balconies | Machinery built to turn, spectators on the balcony |
| Castle | [09] | Dark stone, red carpet, gold trim | Statues, banners, lanterns, pillars | Laser beam from a statue |
| Jungle | [10] | Grey concrete, deep green, rust | Lab gateway with signage, giant conifers, red rails | Rainbow trail under a trick |
| Stadium (MKW) | [11] | Pink, cream, and teal | Grand arch sign, grandstands, broadcast trucks, flags | Crowd, checkpoint gate |
| Canal and river (MKW) | [12], [34] | Teal water against vermilion foliage and brick | Stone embankments, lantern strings, bunting, brick blocks | Foam wakes, floating coins, item boxes on water |
| Ice (MKW) | [13] | Turquoise and white | Columns, holographic checkpoint arc | Confetti, rival name tags |

### Density, crowds, signage, sky

- **Density is front-loaded at the start straight** and at set pieces, then
  relaxes on connecting road. Desert and snow are deliberately sparse and rely
  on big landforms.
- **Crowds** appear as small groups of three to six at the barrier [01], as
  balcony rows [08], and as full grandstands at stadium starts [11]. They are
  simple, repeated characters with raised arms, not a detailed crowd.
- **Signage** is in-world branding: fictional sponsor banners in a continuous
  strip along barriers [02], tall feather flags [14], shop signs [03], a 3D
  logo sign on the hero building [37], and direction chevrons (three arrows in
  a row, high-contrast pairs such as pink and white or yellow on black) at
  every notable bend ([14], [16]).
- **Sky, day:** a saturated cyan-to-blue gradient with chunky cumulus clouds
  covering 30 to 40% of the visible sky and soft bloom around the brightest
  cloud edges ([02], [03], [37]). **Night:** no gradient, light comes from the
  set [06]. **Space:** stars plus one enormous body [07]. **MKW:** more haze
  and painterly cloud, and weather (rain streaks and heavy fog in [23]).
- **The world map** [36] shows the same idea at the largest scale: each biome
  is one flat dominant hue (yellow desert, red canyon, green plain, white
  snow, black volcano), so regions read as color patches.

## 4. Color, lighting, and materials

- **Palette:** each track runs on two or three hues. Full saturation is
  reserved for karts, drivers, items, coins, and boost pads. Environments sit
  one step lower in saturation and contrast, and MKW pushes distant scenery
  toward the sky color with atmospheric haze ([12], [23], [36]).
- **Key light:** one strong directional light with soft-edged but clearly
  shaped shadows. Daytime shadows are cool and never black ([02], [03]).
  Interiors use pools of warm lamp light against dark walls ([08], [09]).
- **Contact shadows:** every kart, item, and prop has a dark soft shadow
  directly beneath it ([21], [14]). This grounds objects and marks the
  player's exact position on the road.
- **Rim and specular:** characters and karts carry a light edge from behind
  and above, plus one clean highlight on glossy paint ([15], [17], [21]).
  In dark scenes the kart carries its own emissive accents so it never sinks
  into the background ([09], [20]).
- **Bloom** is restrained: on the sun and clouds, neon, sparks, flames, and
  headlights. It is not a full-screen haze. Compare Mario Kart Wii [39],
  where a general bloom washes the whole frame and flattens it.
- **Material separation is the biggest upgrade over the old games.** In one
  MK8D frame you can tell clear-coated paint, chrome, rubber with tread,
  cloth, matte skin, rough asphalt, and painted steel apart ([15], [17],
  [21]). In the 64 and Wii frames everything is the same matte surface.
- **Texture contrast keeps heroes readable:** the ground is high-frequency
  (grain, planks, grating), characters and items are smooth with broad clean
  shapes. The eye goes to the smooth, saturated thing.
- **Depth of field and motion blur** appear only in promo and replay cameras
  ([16], [30]) and as a radial edge blur under boost ([32], [33]). The
  standard race view is sharp to the horizon.
- **MK8D versus MKW:** MK8D is glossier, cleaner, and more saturated, almost
  toy-like. MKW is softer and more painterly, with rougher natural materials,
  more haze, and chunkier cartoon effects.

## 5. Karts and characters

- **Proportions from behind** ([01], [02]): the driver's head or helmet is
  about 13% of screen height and the kart body with wheels about 19%, so the
  head is roughly 40% of the total silhouette height and 45 to 50% of the
  kart's width. From the front three-quarter view [21] the head is about a
  third of the total height. Heads are large, hands are large, torsos are
  small.
- **Wheels:** rear tires are about half the kart body's height and each is
  roughly a fifth of the kart's width, so the two rear tires make up 40 to
  45% of the rear silhouette. Tires are fat, with visible tread, sidewall
  lettering, and colored hubs ([15], [16]). MKW pushes this further with
  monster-truck tires and exposed springs [16].
- **Silhouette from behind is a stack of three shapes:** head shape, seat and
  body block, and wide wheelbase. Characters are told apart at a glance by
  the head silhouette (cap, crown, bow, mushroom dome, spiked shell) and by
  one or two signature color blocks. The kart rear adds an emblem, an exhaust
  layout, and a color accent ([01], [03], [09], [13]).
- **Size classes are visible:** small drivers leave air above the seat [04],
  heavy ones fill and overhang the kart ([09], [17]). The camera does not
  rescale, so a heavy driver simply takes more of the frame (37% versus 29%).
- **Pose and animation cues that survive in a still:** arms and legs thrown
  wide in a trick ([05], [20]), body leaning into a drift with the kart yawed
  [07], an item held out at arm's length [15], the head turned toward a rival
  [17], a wave and a wink at the camera on the results screen [30], a full
  tumble with wheels in the air after a hit [14]. Vehicles deform too: wheels
  fold out for hover sections, a propeller and glider deploy [19], and karts
  become watercraft with a foam wake in MKW ([12], [34]).

## 6. Effects

- **Drift sparks:** both rear wheels emit. Tier one is electric blue with
  white-hot cores in jagged bursts, each cluster about half a kart width
  ([07], [08]). The top tier is magenta and pink with star-shaped particles
  and streaks, filling the space behind the wheel to hub height [15]. The
  middle tier is orange (seen in a screening image that was not kept). MKW
  restyles the charge as a curved cyan blade of light hugging the tire [16]
  and small blue star flares at the wheels [13]. Hue and volume escalate
  together.
- **Boost:** flames from the exhausts plus a line of fire along the ground
  behind the kart ([17], [18], [32]). MKW uses twin jets with blue-white
  cores that turn into yellow and orange cartoon flames, about 0.8 kart width
  wide [11]. A trick boost adds a burst of large translucent stars [17].
- **Speed lines:** thin pale streaks radiating from the vanishing point at a
  rocket start [18], a radial blur on scenery at the frame edges ([32],
  [33]), and in MKW broad colored streaks covering the outer 15 to 20% of the
  frame: rainbow on a strong boost [11], green and teal at speed [13]. The
  center of the frame stays clean.
- **Countdown and start:** numerals 18% of screen height at center [06], then
  "GO!" at 25% of screen width, tilted, with an outline and drop [18].
- **Item states:** star power makes the whole kart and driver glow and cycle
  color with sparkles [20]. Lightning dims the entire scene to roughly a
  third of its brightness with a blue tint, strikes with a yellow bolt, and
  throws five yellow stars outward from the victim [22].
- **Hit reactions** are exaggerated and unmistakable: a full tumble [14], an
  explosion with orange flame and the victim's items scattering [23], and in
  MKW a red speech-bubble warning icon at bottom center when an item is
  incoming [14].
- **Ground interaction:** dust on dirt [17], chunky white foam on water
  ([12], [34]), tire marks on sand ([04], [16]).
- **Celebration:** confetti at start and finish ([06], [13], [31]) and
  fireworks on the title screen [24].

## 7. Items and item boxes

- **Shape language:** every item is one primitive silhouette: a dome shell, a
  star, a sphere with a fuse, a crescent, a mushroom cap, a disc coin [21].
  Each has one dominant saturated hue plus white, a single glossy highlight,
  and usually a pair of simple eyes.
- **Color coding carries meaning:** the same shell shape in green, red, and
  blue reads as three different threats. Gold marks coins and premium
  variants. Yellow is shared by the star and the banana but their silhouettes
  cannot be confused.
- **Scale:** items are large, 0.4 to 0.7 kart widths, so they read at
  distance and on a phone-sized viewport [21]. A trailing item sits directly
  behind the kart at wheel height where the chase camera sees it [08].
- **Item boxes:** a floating translucent cube with rounded edges and a blocky
  question mark on each face, iridescent blue through green and violet with a
  bright rim [38]. They are laid in an evenly spaced row across the lane
  [04], each roughly one kart wide, hovering at about kart height.
- **The same icon appears in the HUD slot,** unchanged, at about 80% of the
  slot's size ([08], [12]), so the world object and the HUD icon teach each
  other.
- **No text is needed during a race.** The in-game item reference (seen in a
  screening image that was not kept) is a plain icon grid with one line of
  description per item; on track the shape and color do all the work.

## 8. HUD

### MK8D, single player (1280x720 basis)

| Element | Corner | Position (x, y) | Size | Look |
|---|---|---|---|---|
| Item slot, main | Top left | x 8 to 18%, y 7 to 26% | 10% of width, 18% of height | Glossy black disc in a gunmetal ring, icon centered [08] |
| Item slot, reserve | Top left, overlapping the main slot's upper left | x 3.5 to 9.5%, y 4 to 15% | 6% of width | Same style, smaller [08], [20] |
| Coins and lap | Bottom left | x 3.5 to 21.5%, y 90 to 97% | 18% by 6.5% | Two dark translucent slanted plates; coin icon and count, flag icon and lap as "3/3" [01] |
| Position | Bottom right | x 85.5 to 94.5%, y 80 to 94.5% | Numeral 14% of screen height, suffix about 40% of that | Extruded italic numeral, dark outline [01] |
| Minimap | Right edge, middle | x 75 to 96%, y 37 to 75% | About 20% by 38% | No panel: a white ribbon with a dark outline, racer head icons, the player's ringed [07] |
| Timer (time trial only) | Top right | x 81 to 99%, y 5 to 12% | | Italic digits on a dark plate [19] |

- Insets are about 3.5% from the sides, 4% from the top, and 3% from the
  bottom.
- **Position color:** first is metallic gold ([01], [08]), second is silver
  white ([04], [07]), fourth and lower are orange [05]. Third was not
  captured.
- **Coin count** turns orange at the cap of ten [01].
- **Typography:** an italic, slightly stencil-like digit face for counters,
  white or orange on dark plates; an extruded display numeral for position.
- **Diegetic UI:** a marshal character hovers with the start lights ([02],
  [06], [18]), holds a dot-matrix board reading "3/3" at the lap change
  ([20], [34]), and waves the checkered flag [01].
- **Timing:** before the countdown there is no HUD at all [02]; it is in
  place by the count of one [06].
- **Not shown:** no speedometer, no boost or drift meter, no rear-view
  mirror, no race timer in Grand Prix, no opponent names offline, no health.
  Five elements in four corners. Opaque HUD ink is about 5 to 6% of the
  screen and the central 60% is untouched.

### MKW, single player

| Element | Corner | Position (x, y) | Look |
|---|---|---|---|
| Item slot, main | Top left | x 9 to 19%, y 4 to 22% | Rounded square of dark glass with a thick, faintly iridescent rim [12] |
| Item slot, reserve | Top left, to the left of the main slot | x 2.5 to 8%, y 4.5 to 14% | Same, smaller [12] |
| Coins and lap | Bottom left | x 2.5 to 20%, y 90 to 96% | Two dark rounded pills; white bold rounded digits, denominator smaller [12] |
| Position | Bottom right | x 84 to 96%, y 82 to 96% | Chunky hand-cut numeral, yellow-to-orange gradient, dark maroon outline, offset shadow, tilted about 8 degrees [12] |
| Minimap | Right edge | x 88 to 99%, y 18 to 72% | A thin white route line with the player's icon; a long strip rather than a loop [11], [12] |
| Elimination tracker (Knockout Tour) | Top right | x 78 to 99%, y 4 to 12% | Rows of circular racer portraits and empty slots, leader crowned [11], [13] |
| Goal pill (Knockout Tour) | Under the position | | "Be 8th or better!" on a dark pill [11] |
| Incoming-item warning | Bottom center | x 31 to 38%, y 82 to 96% | Red speech bubble with the item icon [14] |

- Online, rivals carry a small avatar bubble and name above the kart [13].
- A free-roam style frame swaps the strip map for a circular terrain minimap
  at bottom right and drops position and lap [23].
- The change from MK8D is one of tone: circles and metal became soft rounded
  glass, and thin italic digits became fat, friendly, outlined lettering.

### Split-screen

- **MK8D 2-player** [32]: side-by-side viewports, each with its own coin and
  lap plate at its bottom left. **4-player** [33]: 2x2, each viewport's plate
  pushed to its outer bottom corner. Plates shrink to about 60 to 70% of
  their single-player size, less than the viewport shrinks, so they take more
  of each viewport. Both frames are from the start, before items or position
  appear.
- **MKW 2- and 4-player** ([34], [35]): item slots in each viewport's outer
  top corner, position and counters in the outer bottom corner, and **one
  shared minimap at the exact center of the screen** overlapping the
  dividers. Position numerals take the player's color (orange, blue, red,
  green) instead of the rank color.
- Dividers are thin dark lines. Nothing is duplicated that can be shared.

### Older games, for contrast

Mario Kart 64 [40] spreads six elements around the screen in pixel fonts,
including a column of four rank portraits. Mario Kart Wii [39] puts a very
large position numeral at bottom left and time and lap at top right. The
modern HUD is smaller, shows fewer things, and leaves the center alone.

## 9. Menus

- **Title** [24]: full-bleed key art with the hero large on the right two
  thirds, the logo at lower left (x 4 to 52%, y 68 to 92%), and a single
  prompt line above it. One action, no menu list.
- **Character select, MK8D** [25]: a translucent panel on the left 52% holds
  a 7 by 6 grid of 3D-rendered heads with no frames around them (cells about
  7.5% by 13%). The right 45% shows the selected driver on a vehicle on a
  dark turntable. The cursor is a set of yellow corner brackets. A bottom bar
  holds Back on the left, the selected name in the center, and OK on the
  right. The background is a blue field with the brand mark tiled faintly on
  a diagonal.
- **Character select, MKW** [26]: a 4 by 3 paged grid of rounded glass cells
  holding full-body renders, with dark question-mark silhouettes for locked
  entries, page dots, and shoulder-button arrows. The large preview floats at
  right over a live, blurred 3D scene, with the name in yellow italic
  lettering on a rough brushed band. A sort action sits at bottom right.
- **Vehicle select with stats, MK8D** [27]: three vertical reels (body,
  tires, glider) on the left, the selected row centered with a yellow frame
  and up and down arrows. A dark stats panel on the right (x 61 to 92%,
  y 15 to 58%) lists Speed, Acceleration, Weight, Handling, and Grip as
  yellow bars on dark tracks with six tick segments, labels in white italic
  above each bar, each bar about 28% of screen width. The driver and vehicle
  stay visible behind the panel. The bottom bar names the highlighted part.
- **Cup select, MK8D** [28]: rows of six circular medallion emblems (about
  12% of screen width each), with a panel beneath showing the four courses of
  the highlighted cup as landscape thumbnails with names. The bottom bar
  shows the trophy earned, star rank, and cup name.
- **Cup select, MKW** [29]: the cup name in yellow italic at top left, a 2 by
  2 block of rounded course thumbnails beneath, an illustrated map on the
  right half with little 3D course dioramas joined by a road line, and a row
  of seven shield-shaped cup badges along the bottom, the selected one
  enlarged.
- **Standings, MK8D** [30]: a replay of the winner plays full-screen inside
  film-strip borders, and a slanted red banner on the right third lists the
  cup emblem, cup name, and a placing per course in gold numerals.
- **Trophy and results, MKW** [31]: a headline at top left in a yellow-to-
  orange gradient with a red outline, a two-column, 24-row standings table of
  dark pills (rank, head icon, name, points; each row about 5.8% of screen
  height) with the winner's row highlighted, and a huge gold trophy on the
  right 35% under falling confetti.
- **Shared patterns:** selection on the left, a live 3D payoff on the right;
  one persistent bottom bar; one highlight color (yellow) for cursor, values,
  and emphasis; a real 3D object in every menu; backgrounds that are either
  the brand pattern or a blurred live scene, never flat. Motion cues implied
  by the layouts: reels that scroll, a turntable that spins, a cursor that
  pulses, pages that slide, confetti that falls.

## 10. What makes it look expensive: 15 rules we can apply

1. **Frame the kart to a number.** Player kart plus driver is 30 to 35% of
   screen height and 15 to 17% of screen width, centered, with the wheels at
   85 to 87% from the top.
2. **Fix the horizon at 36 to 40% from the top** on flat ground. Let it rise
   to 15 to 25% on descents and vistas. Never let it sit at mid-screen.
3. **Give the road half the frame.** Drivable surface at least 45% of the
   frame on a straight, with the 13% strip below the kart kept clear of props
   and effects.
4. **Make the track 6 to 8 kart widths wide,** opening to 15 or more at the
   start straight. Item rows are five boxes, 1.6 kart widths apart.
5. **Outline every edge.** A continuous kerb, rail, wall, or glowing strip
   that contrasts with the road, plus a one-to-three kart width buffer strip
   before any prop. Chevron boards at every bend.
6. **Write a two-or-three-hue color script per track,** and reserve full
   saturation for karts, drivers, items, coins, and boost surfaces.
7. **Always show three depth layers:** a near prop every three to five kart
   lengths, a themed mid band filling 20 to 28% of the frame above the
   horizon, and one far landmark silhouette visible for most of the lap.
8. **Span the start line with a gantry** 30 to 40% of screen width, and put
   the crowd, banners, and densest set dressing there.
9. **Textured ground, smooth heroes.** Fine grain and directional lines on
   the road; broad clean shapes on karts, drivers, and items; a dark contact
   shadow under every one of them.
10. **One strong key light with shaped shadows across the road,** cool
    shadow color, bloom only on emissives and sky. On dark tracks, karts and
    track edges carry their own light.
11. **Separate materials.** At least five clearly different surface
    responses in any frame: glossy paint, metal, rubber, matte skin or cloth,
    and rough ground.
12. **Stack speed feedback in tiers:** exhaust flame, then a ground flame
    trail, then radial streaks confined to the outer 15 to 20% of the frame,
    then a slight field-of-view widening. Drift sparks escalate in hue and
    volume together, from both rear wheels, with white-hot cores.
13. **Items are primitives:** one silhouette, one hue plus white, 0.4 to 0.7
    kart widths, and the identical icon in the HUD slot. Hit reactions are
    oversized (a full tumble, a scene-wide dim for a global effect).
14. **Budget the HUD:** five elements in four corners, inset 3 to 4%, under
    6% of the screen in opaque ink, the central 60% empty. The position
    numeral is the largest element at 14% of screen height and is color-coded
    by rank. Every glyph sits on a dark plate or carries a dark outline. In
    split-screen, push elements to outer corners and share one center map.
15. **Menus are a split stage:** choices on the left 50 to 55%, a live 3D
    preview on the right, one bottom bar (back, name, confirm), one highlight
    color, stats as five segmented bars, and one bold italic display face
    with outline and offset shadow for headlines.

## Manifest

All files were saved to the session scratch folder `mk-shots/` outside this
repository. Sizes are the saved pixel dimensions.

| File | Game | What it shows | Size | Source URL |
|---|---|---|---|---|
| 01_mk8d_toad-circuit_finish-1st.jpg | MK8D | Grass circuit finish line, chase camera, coin, lap, and position HUD, marshal with flag | 1280x720 | https://mario.wiki.gallery/images/1/15/Toad_Circuit_MK8Deluxe_Race_Finish.jpg |
| 02_mk8d_toad-harbor_city-start.jpg | MK8D | City and harbor start grid before the countdown, no HUD | 1280x720 | https://mario.wiki.gallery/images/8/80/ToadHarborMK8DeluxeRaceStart.jpg |
| 03_mk8d_la-laps_beach-boardwalk.jpg | MK8D | Beach boardwalk at the finish, 1st place | 1280x720 | https://mario.wiki.gallery/images/9/9a/LosAngelesLapsRaceWinRosalinaMK8D.jpg |
| 04_mk8_dry-dry-desert.jpg | MK8 (Wii U) | Desert descent toward an oasis, item-box row, 2nd place | 1280x720 | https://mario.wiki.gallery/images/f/f4/Toad_dry_dry_desert.jpg |
| 05_mk8_mount-wario_snow-jump.jpg | MK8 (Wii U) | Snow ridge, mid-air trick pose, minimap, 4th place | 1280x720 | https://mario.wiki.gallery/images/3/3b/MountWarioJump.jpg |
| 06_mk8d_electrodrome_neon-countdown.jpg | MK8D | Night neon start line, countdown numeral "1" | 1280x720 | https://mario.wiki.gallery/images/4/4b/MK8DeluxeElectrodromeRaceStart.jpg |
| 07_mk8d_rainbow-road_drift-sparks.jpg | MK8D | Space track, drifting with blue sparks, minimap, 2nd place | 2160x1207 | https://mario.wiki.gallery/images/b/b0/MK8D_3DS_Rainbow_Road_gameplay.jpg |
| 08_mk8d_tick-tock-clock_indoor-item.jpg | MK8D | Indoor clockwork track, double item slot, banana trailing behind the kart, minimap, 1st place | 1280x720 | https://mario.wiki.gallery/images/d/d0/MK8D_Smart_Steering_Race.jpg |
| 09_mk8_bowsers-castle_entrance.png | MK8 (Wii U) | Castle hall, single item slot, laser hazard, 1st place | 1280x720 | https://mario.wiki.gallery/images/5/5c/BowsersCastle8EntranceLasers.png |
| 10_mkworld_dino-jungle_gameplay.png | MKW | Jungle lab gateway, wall-ride trick with rainbow trail, item slots, 6th place | 1114x647 | https://mario.wiki.gallery/images/0/0e/MKWD_DDJ_Gameplay.png |
| 11_mkworld_knockout_circuit-boost.jpg | MKW | Stadium straight while boosting, Knockout Tour HUD, 11th place | 3840x2160 | https://mario.wiki.gallery/images/3/30/MKW_Knockout_Tour_screenshot_2.jpg |
| 12_mkworld_waterway_gameplay.jpg | MKW | River section in water mode, item slots, strip minimap, 15th place | 3840x2160 | https://mario.wiki.gallery/images/e/e3/MKW_waterway_screenshot.jpg |
| 13_mkworld_knockout_ice-track.jpg | MKW | Ice plaza, checkpoint gate, rival name tag, 8th place | 960x540 | https://www.thesixthaxis.com/wp-content/uploads/2025/06/MarioKartWorld-KnockoutTour.jpg |
| 14_mkworld_bullet-bill_road.jpg | MKW | Road circuit, kart tumbling after a hit, incoming-item warning, 9th place | 960x540 | https://www.thesixthaxis.com/wp-content/uploads/2025/06/MarioKartWorld-BulletBill.jpg |
| 15_mk8d_drift_pink-sparks.png | MK8D | Promo: drift with pink sparks, item held in hand, coins | 1920x1080 | https://mario.wiki.gallery/images/5/5c/Inkling_Girl_drifts_MK8_Deluxe.png |
| 16_mkworld_drift_blue-arc.jpg | MKW | Promo: drift with blue arc, chevron sign, mesh barrier | 1239x694 | https://mario.wiki.gallery/images/6/66/MKWorldBJDrifting.jpg |
| 17_mk8d_boost_exhaust-flames.png | MK8D | Promo: trick boost with star burst and ground flame trail | 1920x1080 | https://mario.wiki.gallery/images/5/59/MK8D_Choco_Mountain_Boost.png |
| 18_mk8d_rocket-start_go.jpg | MK8D | "GO!" banner, rocket-start flames, speed lines | 1280x720 | https://mario.wiki.gallery/images/8/8e/Rocket_Start_MK8_Deluxe.jpg |
| 19_mk8d_water-park_glide-ramp.jpg | MK8D | Blue glide ramp, time-trial HUD with timer | 1280x720 | https://mario.wiki.gallery/images/b/b8/MK8D_Water_Park_Glide_Ramp.jpg |
| 20_mk8d_big-blue_jump-trick.jpg | MK8D | Trick pose with star power active, marshal's "3/3" lap board, 1st place | 1280x720 | https://mario.wiki.gallery/images/5/57/LinkJumpActionBigBlueSection3MK8D.jpg |
| 21_mk8_crazy-eight_items-orbit.png | MK8 (Wii U) | Promo: eight items orbiting a kart at kart scale | 1280x720 | https://mario.wiki.gallery/images/c/c3/Crazy_Eight_MK8_Mario.png |
| 22_mk8d_lightning_hit.jpg | MK8D | Lightning strike: dimmed scene, bolt, star burst | 1280x720 | https://mario.wiki.gallery/images/e/e2/MK8D_Shy_Guy_Lightning_Shock.jpg |
| 23_mkworld_item-hit_water.png | MKW | Explosion on water, items scattering, rain and haze, circular minimap | 2880x1620 | https://mario.wiki.gallery/images/1/10/MKW_Item_Rain.png |
| 24_mk8d_title-screen.png | MK8D | Title screen | 1920x1080 | https://mario.wiki.gallery/images/e/e5/NM_MK8D_Mario_Kart_8_Title_Screen.png |
| 25_mk8d_character-select.jpg | MK8D | Character select | 1280x720 | https://mario.wiki.gallery/images/6/6b/MK8D_CSS.jpg |
| 26_mkworld_character-select.jpg | MKW | Character select | 960x540 | https://www.thesixthaxis.com/wp-content/uploads/2025/06/MarioKartWorld-CharacterSelect.jpg |
| 27_mk8d_vehicle-select_stats.jpg | MK8D | Vehicle customization with stat bars | 1920x1080 | https://mario.wiki.gallery/images/5/53/MK8D_Vehicle_Customization_Screen_Stats.jpg |
| 28_mk8d_cup-select.png | MK8D | Cup and course select | 1920x1080 | https://mario.wiki.gallery/images/2/21/MK8Dv3-0-0_cup_select_Golden_Dash.png |
| 29_mkworld_cup-select_map.jpg | MKW | Grand Prix cup select with illustrated map | 3840x2160 | https://mario.wiki.gallery/images/8/83/MKW_Mushroom_Cup_screenshot.jpg |
| 30_mk8d_standings.png | MK8D | Post-cup standings banner over a replay | 1920x1080 | https://mario.wiki.gallery/images/7/70/NM_MK8D_Current_Standings.png |
| 31_mkworld_trophy_results.png | MKW | Trophy presentation with 24-racer standings | 1920x1080 | https://mario.wiki.gallery/images/5/56/NM_MKWorld_Trophy_Theme.png |
| 32_mk8d_split-2p.png | MK8D | 2-player split-screen at the start | 1280x720 | https://mario.wiki.gallery/images/8/8f/MK8D_Play_Style02.png |
| 33_mk8d_split-4p.png | MK8D | 4-player split-screen at the start | 1280x720 | https://mario.wiki.gallery/images/4/4b/MK8D_4-Player_Gameplay_Screenshot.png |
| 34_mkworld_split-2p.jpg | MKW | 2-player split-screen on water, shared minimap, lap board | 3840x2160 | https://mario.wiki.gallery/images/8/88/MKW_waterway_splitscreen_screenshot.jpg |
| 35_mkworld_split-4p.jpg | MKW | 4-player split-screen, shared center minimap, player-colored positions | 3840x2160 | https://mario.wiki.gallery/images/d/df/MKW_Whistlestop_Summit_splitscreen_screenshot.jpg |
| 36_mkworld_world-map.png | MKW | World overview map with color-blocked biomes | 3840x2160 | https://mario.wiki.gallery/images/e/e1/MK_World_map.png |
| 37_mk8_course-art_coconut-mall.jpg | MK8D | Official course art: mall facade, palms, kerb, spectators | 5760x3240 | https://mario.wiki.gallery/images/0/02/MK8-Course-Wii_CoconutMall.jpg |
| 38_mkworld_item-box_render.png | MKW | Item box render | 1554x1738 | https://mario.wiki.gallery/images/2/2f/MKW_Item_Box.png |
| 39_mkwii_coconut-mall_contrast.png | Mario Kart Wii | Contrast: indoor mall gameplay, 12th place, older HUD | 1920x1048 | https://mario.wiki.gallery/images/4/4b/MKW_Coconut_Mall_screenshot.png |
| 40_mk64_luigi-raceway_contrast.png | Mario Kart 64 | Contrast: circuit gameplay, 1st place, pixel-font HUD | 640x479 | https://mario.wiki.gallery/images/6/6e/MK64luigiraceway1.png |
