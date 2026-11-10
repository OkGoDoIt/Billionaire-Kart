# POLISH.md — Billionaire Kart Nintendo-Polish Design Bible

Goal: stop feeling like a vibe-coded web app, start feeling like a shipped
Nintendo kart game. Every rule below is extracted from real reference
screenshots in `~/workspace/research_notes/bk-polish-refs/` (see SOURCES.md
there) and is implementable in vanilla CSS/JS + the existing Three.js scene.
No frameworks, no build step.

**The one-sentence summary of Nintendo's whole UI language:** everything is
*bright, chunky, outlined, and slightly tilted* — white or saturated panels
with thick dark outlines and hard offset shadows, a rounded display font with
a black outline on every headline, and no screen is ever static: something is
always bouncing, spinning, or sparkling.

---

## 1. DESIGN TOKENS

### 1.1 Fonts (Google Fonts)

Evaluated against the MK wordmark/HUD type [ref: mk8dx-title.jpg]
[ref: mkwii-hud.png]: Nintendo uses a custom rounded, extra-bold, slightly
condensed display face with a heavy black outline; HUD numerals are the same
face in italic.

| Candidate | Verdict |
|---|---|
| **Luckiest Guy** | ✅ **DISPLAY PICK.** Near-perfect match for the MK wordmark energy: ultra-bold, rounded, bouncy baseline, built-in cartoon weight. Perfect for logo, countdown numerals, position badge, CONGRATULATIONS-style banners. Weakness: all-caps only feel, no lowercase charm — headlines only. |
| **Fredoka** (600/700) | ✅ **UI PICK.** Rounded geometric sans, friendly at small sizes, has real weights (400–700) unlike Luckiest Guy. Use for buttons, names, body text, HUD labels. Closest free analogue to the rounded gothic Nintendo uses for menu text. |
| Bungee | Runner-up display. More "signage/arcade" than Nintendo; its inline shade layer is nice for the logo but too rigid/vertical for in-race numerals. Keep as fallback if Luckiest Guy feels too soft. |
| Baloo 2 | Too round/bubbly; reads "kids' educational app", not racing. Rejected. |
| Nunito | Great rounded UI font but too neutral — it's what a SaaS dashboard would pick. Exactly the web-app tell we're removing. Rejected for UI; Fredoka has more character at the same readability. |

Exact tags (put in `<head>`, `display=swap`, preconnect first):

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Fredoka:wght@400;500;600;700&family=Luckiest+Guy&display=swap" rel="stylesheet">
```

PWA note: these are menu/HUD-critical, so also self-host the two woff2 files
later if offline-first loading flashes; the service worker should cache the
Google Fonts CSS + woff2 on first load (stale-while-revalidate route).

```css
:root{
  --font-display:"Luckiest Guy","Fredoka",system-ui,sans-serif;
  --font-ui:"Fredoka","Avenir Next",system-ui,sans-serif;
}
```

### 1.2 Colour palette

Derived from MK8D's sky-cyan menus [ref: mk8dx-charselect.jpg], the red
results banner [ref: mk8-results.jpg], and the yellow selection cursor that
appears in *every* MK menu [ref: mk8dx-kartselect.jpg].

```css
:root{
  /* sky / menu field */
  --sky-1:#29b6f6;  --sky-2:#4fc3f7;  --sky-3:#0288d1;   /* menu gradient stops */
  --cloud:#ffffff;
  /* primaries */
  --red:#e60012;        /* Nintendo red — banners, danger, 1st-place energy */
  --red-dark:#a5000e;
  --yellow:#ffd900;     /* selection cursor, GO!, highlights */
  --yellow-soft:#ffe95c;
  --blue:#1565ff;       /* links/secondary buttons */
  --green:#00c853;      /* GO / confirm / boosts */
  /* ink + panels */
  --ink:#14213d;        /* THE outline colour — replaces pure black, softer */
  --ink-pure:#0a0a14;   /* text outlines on display type */
  --panel:#ffffff;      /* panels are WHITE, not dark glass */
  --panel-cream:#fff8e1;
  --chip-dark:rgba(10,14,30,.72); /* HUD chips over 3D only */
  /* metal (position badge / trophy) */
  --gold-1:#fff3b0; --gold-2:#ffd94a; --gold-3:#ff9d2e;
  --silver-1:#ffffff; --silver-2:#cfd8dc; --silver-3:#90a4ae;
  --bronze-1:#ffd9b0; --bronze-2:#e8a06a; --bronze-3:#b06a35;
  /* checker */
  --checker-a:#14181f; --checker-b:#ffffff;
}
```

Rules:
- **Menus live on a sky, not in a cave.** Menu background = vertical gradient
  `--sky-2 → --sky-1 → --sky-3` with the checkerboard strip (§1.5) along the
  bottom 48px and a faint repeating watermark pattern (our 💰/🚀 glyphs or
  "BK" monogram at 4% white, rotated −12°, like MK8D's logo-watermark field
  [ref: mk8dx-charselect.jpg]). Our current `#0b1026` navy void is banned
  from menus (it may survive *inside* the pause overlay only, at 60%).
- **Dark is reserved for contrast moments**: the bottom name bar, HUD chips,
  and the results table rows — always translucent-dark *over bright art*,
  never as the page field.

### 1.3 Text treatment recipe

Three named treatments; nothing else ships.

**A. `.txt-display` — headlines, logo, banners** (MK wordmark recipe
[ref: mk8dx-title.jpg]): white fill, thick ink outline, hard drop shadow,
slight −2° italic tilt on containers.

```css
.txt-display{
  font-family:var(--font-display);
  color:#fff; letter-spacing:.02em;
  -webkit-text-stroke:2px var(--ink-pure); paint-order:stroke fill;
  text-shadow:0 3px 0 var(--ink-pure), 0 6px 14px rgba(0,0,0,.35);
}
```
(`paint-order` needs the SVG/text-stroke support fallback: the stacked
`text-shadow` alone still reads correctly in Safari, keep both.)

**B. `.txt-hud` — numerals over the 3D scene** (position, timer, lap
[ref: mkwii-hud.png]): Fredoka 700 italic, white or yellow fill, outline via
4-direction shadow stack (text-stroke smears at small sizes; the shadow
stack is crisper):

```css
.txt-hud{
  font-family:var(--font-ui); font-weight:700; font-style:italic; color:#fff;
  text-shadow:-2px 0 0 var(--ink-pure),2px 0 0 var(--ink-pure),
              0 -2px 0 var(--ink-pure),0 2px 0 var(--ink-pure),
              0 4px 0 rgba(0,0,0,.45);
}
.txt-hud.yellow{ color:var(--yellow); }
```

**C. `.txt-body`** — Fredoka 500, `--ink` on white panels, NO outline, 15–17px
min on mobile. Body text never sits directly on the 3D scene; it gets a chip.

Letter-tilt trick for banners: wrap each letter of CONGRATS-style words in a
`<span>` and alternate `transform:rotate(-3deg)/(2deg) translateY(±2px)` —
MK's results banner letters visibly wobble out of line [ref: mk8-results.jpg].

### 1.4 Panel & button recipe

What MK actually uses [ref: mk8dx-charselect.jpg] [ref: mk8dx-kartselect.jpg]:
panels are **translucent white** with a 2px white/70 border over the sky,
selection is a **chunky yellow frame** (4–5px, with corner brackets in the
char grid), and the bottom action bar is a **dark translucent strip** with
the selected name centred in plain bold white. Buttons are rare in MK menus —
the *cursor* does the work. On touch, we need real buttons, so:

```css
.panel{
  background:linear-gradient(180deg,#ffffff 0%,#eaf6ff 100%);
  border:3px solid var(--ink); border-radius:20px;
  box-shadow:0 6px 0 rgba(20,33,61,.9), 0 14px 28px rgba(2,40,80,.35),
             inset 0 2px 0 #fff; /* glossy top highlight */
}
.btn{
  font-family:var(--font-ui); font-weight:700;
  border:3px solid var(--ink); border-radius:999px; /* pills, always */
  box-shadow:0 5px 0 var(--ink), inset 0 2px 0 rgba(255,255,255,.65);
  background:linear-gradient(180deg,#fff 0%,#ffe95c 45%,#ffd900 55%,#ffb300 100%);
  transition:transform .08s cubic-bezier(.34,1.56,.64,1), box-shadow .08s;
}
.btn:active{ transform:translateY(4px) scale(.98); box-shadow:0 1px 0 var(--ink); }
.btn.primary{ background:linear-gradient(180deg,#7dff8a,#00c853 55%,#00a844); color:#fff;
  text-shadow:0 2px 0 rgba(0,60,20,.55); }
.btn.danger { background:linear-gradient(180deg,#ff8a75,#e60012 55%,#b0000c); color:#fff; }
```

Invariants:
- **Radius**: panels 18–24px; buttons always pill (999px) or 16px for big
  rectangles; tiles 14–18px. Nothing ships with radius <10px except chips (8px).
- **Outlines**: 3px `--ink` on anything interactive; 4–5px `--yellow` for the
  *selected/focused* state (the MK cursor), never a soft glow alone.
- **Shadows are hard and offset** (`0 5px 0`), never the blurry 24px
  ambient shadow of web design. Press = the element physically moves down
  into its shadow.
- **Gloss**: every coloured button/panel gets the `inset 0 2px 0 white`
  top highlight + a lighter top half in its gradient (see `.btn` stops).

### 1.5 Motifs (CSS-only)

**Checkerboard strip** — finish-line tape; used under the menu header,
across the top of the results screen, and as the countdown screen's top
banner [ref: mk7-countdown.jpg shows it as a literal screen-frame strip]:

```css
.checker{ height:28px;
  background:repeating-conic-gradient(var(--checker-a) 0% 25%, var(--checker-b) 0% 50%) 0 0/28px 28px;
  border-block:3px solid var(--ink); }
.checker.thin{ height:14px; background-size:14px 14px; }
```

**Ribbon/banner** — section headers and the results title: a red bar with
notched tails, white display text, slight −1.5° rotation:

```css
.ribbon{ background:linear-gradient(180deg,#ff3b30,var(--red) 55%,var(--red-dark));
  color:#fff; border:3px solid var(--ink); border-radius:10px;
  box-shadow:0 5px 0 var(--ink); transform:rotate(-1.5deg); padding:.35em 1.2em; }
```
(Notches: two `clip-path` triangles on ::before/::after in `--red-dark`.)

**Watermark field** — menus only: absolutely-positioned repeating layer,
glyphs at 5% white, `transform:rotate(-12deg)`, `pointer-events:none`.
This single layer is 50% of why MK8D's plain blue menus don't look empty
[ref: mk8dx-charselect.jpg].

**Halftone dots** — results/celebration surfaces [ref: mk8-results.jpg top
banner]: `background-image:radial-gradient(rgba(0,0,0,.18) 2px, transparent 2.5px); background-size:14px 14px;` over the red.

---

## 2. SCREEN-BY-SCREEN SPECS

Global layout constants: safe padding 16px (mobile) / 28px (desktop);
menu max-width 1180px; all menu screens share the sky field + watermark +
bottom checker strip from §1. Every screen transition uses §2.8.

### 2.1 Title / menu hero

MK does [ref: mk8dx-title.jpg]: the logo *is* the screen — giant wordmark
(≈55% of screen width) over a blurred, slowly-panning attract-mode race,
one understated prompt line ("Press L R to start"), version text tiny in a
corner. No buttons, no cards, no feature list.

We do:
- Full-bleed hero: the generated key art (`assets/` key-art-menu) OR a live
  slow-orbit Three.js shot of the start grid (preferred long-term; the art
  ships first) with a 6px backdrop blur + sky-gradient scrim at the bottom.
- Logo lockup, centred, ~min(72vw, 640px) wide: "BILLIONAIRE" in
  `.txt-display` white; "KART" beneath in the rainbow-neon-outline treatment
  (per-letter colours from the MK "DELUXE" treatment: green→cyan→pink→
  yellow, `-webkit-text-stroke:2px var(--ink-pure)`, fill dark) and the tag
  ribbon "AI ARMS RACE" as a `.ribbon` overlapping the logo's bottom-right
  at −6°. Whole lockup gets the idle bob (§3).
- One prompt only: "TAP TO START" in `.txt-hud yellow`, pulsing scale
  1↔1.06 at 1.2s. Tapping anywhere advances to character select.
- Keep the existing 1-2-3 menu flow *after* the title tap — the title is a
  new front door, not a restructure. Version + "a parody" microcopy bottom
  corners, 11px, white 70%.

### 2.2 Character Select v2 (+ live 3D turntable)

MK does [ref: mk8dx-charselect.jpg]: left ≈58% = portrait grid inside one
translucent panel, icons are bare heads (no cards, no text, no stats);
selection cursor = **yellow corner brackets** that hug the cell, not a box;
right ≈42% = the actual 3D character in its kart on a **black circular
podium**, slowly rotating, soft blob shadow; bottom = full-width dark bar,
selected name centred in bold white, corner prompts. Kart select reuses the
identical stage with a 3-column parts panel [ref: mk8dx-kartselect.jpg].
Tour does the phone version [ref: mkt-charselect.png]: 4-col card grid,
full-bleed art per card, coloured rarity frame, level/points badge chunky
in the card's bottom corner — cards *are* the art, chrome is minimal.

We do (this supersedes the card design in the Character Select v2 phase):
- **Desktop / landscape (≥760px wide): MK two-zone layout.**
  - Left panel (`.panel`, translucent white 88%): tile grid — 4 cols
    desktop, 3 cols small landscape. Tiles keep Roger's requirements:
    portrait full-bleed top, name under it, radar chart + pips. Selected
    tile: 5px `--yellow` frame + yellow corner brackets via two pseudo
    elements (16×16 L-corners, 5px borders) + scale 1.04 (§3 cheer).
  - Right stage: **the live turntable (below)** on a podium disc, with the
    racer's name in `.txt-display` (28–40px) on a dark name bar under the
    podium, quote/bark in a white speech-bubble panel (tail pointing at
    the kart, radius 16px, 3px ink border) under the name.
  - Radar + bars move *here* (detail zone under the speech bubble) instead
    of on every tile when there's room — tiles become portrait+name only,
    exactly like MK. On narrow screens the radar stays on the tile (below).
- **Portrait phone (<760px): Tour layout.** 2-col grid of portrait tiles
  (portrait, name, radar, pips — as currently specced), detail panel sticky
  bottom (portrait thumb 56px, name, quote 1-line ellipsis, stat bars
  mini). No turntable (screen estate), but the selected tile does the
  cheer bounce + a ⭐ burst.
- **THE TURNTABLE — implementation spec.** Reuse the race scene, don't
  build a second renderer:
  1. Add a `#turntable` mode to the existing Three scene: on entering
     char-select (desktop layout only), spawn ONE kart via the existing
     `buildKart(rosterEntry)` factory at a fixed stage position in front
     of a dedicated menu camera (or a second small scene — a second
     `THREE.Scene` sharing the renderer is cleaner: `menuScene` with its
     own sky-gradient background colour `--sky-1`, one hemisphere +
     one directional light matching §gfx lighting).
  2. Stage: cylinder podium (r=2.2, h=0.35, dark charcoal `#23262b` with a
     `--yellow` emissive ring texture or a torus ring), contact shadow =
     radial-gradient dark disc texture on the podium top (cheap, no shadow
     map needed in menu).
  3. Animation: podium group rotates 0.35 rad/s; kart does a tiny idle
     bounce (y = sin(t*2.2)*0.03) and the driver head bobs; on selection
     change, kart pops in with scale 0.6→1 overshoot (§3 curve A) + a
     6-star ⭐ sprite burst. Canvas sized to its container (~420×380 CSS
     px, DPR-capped at 2), `powerPreference:'low-power'` acceptable.
  4. Lifecycle: render the menu scene only while char-select is visible
     (single rAF loop already exists — branch on `uiState`); pause it
     when a race starts. Fallback: if WebGL context fails, show the 2D
     portrait large in the same spot (the `<img>` is already in the DOM).
- START button: giant `.btn primary` pill bottom-right of the detail zone
  (or full-width under the sticky panel on mobile), label "START RACE! 🏁".

### 2.3 Track select

MK does: cup/course cards are *scene thumbnails with a bold name bar*, one
row per cup; the selected course gets the yellow frame. Speedstorm/MK
mobile peers use big art cards, name bottom-left in display type.

We do: horizontal snap-scroll row (mobile) / 3-col grid (desktop) of cards
at 16:10. Each card: track art (screenshot render or gradient+emoji scene
until art exists), bottom name bar = dark translucent strip with the track
name in `.txt-display` 20px white + a one-line gag subtitle in Fredoka 500
13px white 85% ("Now with 40% less gravity"). Selected: yellow 5px frame +
card lifts 4px + the subtitle bar turns `--red`. A "track ribbon" header
above ("2 · PICK YOUR TRACK") as `.ribbon` blue variant. Locked/future
tracks (Bliss etc. pre-launch) shown desaturated with a "SOON" diagonal
tape strip — Tour's greyed-card language [ref: mkt-charselect.png].

### 2.4 Countdown (3-2-1-GO)

MK does [ref: mk8-countdown.jpg] [ref: mk7-countdown.jpg]: the numeral is
*enormous* (≈30% of screen height), dead centre, filled with **yellow
checkerboard**, thick white outline + black offset shadow, tilted ≈−6°;
a character (Lakitu) holds the physical start lights in-world; timer sits
top-right in a chunky LCD panel; exhaust puffs while you rev. MK7 frames
the whole screen with a checker strip at the top edge.

We do:
- Overlay numeral: Luckiest Guy, font-size `min(34vh, 300px)`, fill =
  checkerboard via `background:repeating-conic-gradient(#ffd900 0 25%, #ffb300 0 50%)` + `-webkit-background-clip:text`, `-webkit-text-stroke:6px #fff` won't compose with clip — use the §1.3 shadow-stack outline in white+ink instead (crisper at this size), rotate −6°, animation per beat: scale 1.6→1 with curve A (§3) in 180ms, hold, shrink-fade out at 850ms. Numbers 3/2/1 in yellow-checker; **"GO!"** in `--green` fill, scale punch 2.2→1.15, plus a 12-point starburst (CSS conic-gradient star div) flashing behind it for 300ms.
- Top edge of the screen gets the `.checker` strip for the whole countdown
  + first 2s of the race (then it slides up away). Pure theatre, costs
  nothing, instantly reads "Nintendo".
- Timer chip top-right appears at GO (not during countdown): dark LCD
  chip, Fredoka 700 italic tabular numerals, tiny checker flag glyph.
- **Rocket-start tie-in**: during countdown the HUD shows a slim rev
  meter under the numeral (a 120×10px pill, fill sweeps with throttle
  input, "sweet spot" zone marked in green at 70–85%). Holding gas in the
  zone at GO = rocket start (existing mechanic); over-rev = the numeral
  shakes ±4px and the meter flashes red — feedback readable without text.

### 2.5 Race HUD

MK does [ref: mk8dx-hud.jpg] [ref: mk8dx-hud2.jpg] [ref: mkwii-hud.png]:
astonishingly little. **Four elements**: (1) item slot top-left — a
*circle* (MK8) or square (Wii) with a thick dark ring, icon big and
centred, a smaller satellite circle for the stored second item; (2)
position bottom-right — one giant beveled metallic numeral + small
ordinal, ~12% of screen height; (3) bottom-left chip cluster — coin icon
+ count and a flag glyph + "2/3" lap, white bold italic on translucent
dark rounded chips; (4) minimap right edge — just a **white stroke
outline of the track** with circular racer head icons riding the line.
No standings table (MK8 dropped it; MK7 kept standings only because it
had a whole second screen [ref: mk7-hud.jpg]). Tour adapts for phones
[ref: mkt-hud.png]: up to three circular item slots top-centre, position
top-left, timer top-right in yellow digital type. KartRider [ref:
kartrider-hud.png] shows mobile-native sizing: touch buttons are giant
translucent circles ≥88px with icons, position "#5" + "Laps 1/3" stacked
top-right, pause = chunky red rounded square.

We do (desktop + landscape):
- **Item slot**: 76px circle, bottom-left is *ours* (thumb reach, per
  Roger's direction) — thick 5px ring: dark ink ring + inner gold ring
  when an item is held; empty = ring dims to 40%. Item icon 44px centred.
  On pickup it runs the **ROULETTE** (§2.5.1). Slot is the item button:
  press = scale .92 + ring flash. Stored-item satellite: 30px circle at
  the slot's upper-right (Mushroom-Kingdom law: satellite at 45°).
- **Position badge**: bottom-right, Luckiest Guy numeral 84px with the
  metal gradient of your current medal zone (1st gold / 2nd silver / 3rd
  bronze / 4th–8th white) via background-clip:text + ink shadow stack;
  ordinal ("st/nd/rd/th") at 32px tucked lower-right of the numeral.
  On change: flip animation (§3). Add a tiny ▲green/▼red delta arrow that
  pops and fades in 900ms.
- **Lap + time chips**: top-centre-left cluster, `.txt-hud` on
  `--chip-dark` pills (radius 10px, padding 4px 12px): 🏁 `LAP 2/3` ·
  ⏱ `1:23.456`. Speed readout stays bottom-right *above* the touch
  cluster on mobile (per the landscape-overlap fix) — Fredoka 700 italic
  28px + "MPH" 14px.
- **Minimap**: top-right, ≤150px; track = white stroke 5px with ink
  casing (draw stroke twice: 9px ink under 5px white) on NO panel (MK
  floats it raw); racers = 18px circular portrait crops (we HAVE
  portraits.js — use them; player gets a 3px yellow ring + 22px size).
  This replaces coloured dots and is a huge identity win for ~zero cost.
- **Standings**: our 8-row table becomes a **collapsible chip rail** on
  the left edge (desktop only): 8 rows × 34px, each a dark chip with
  position numeral + portrait thumb 22px + name (Fredoka 600 12px);
  player's row yellow-framed. MK7 proves rows-with-heads read instantly
  [ref: mk7-hud.jpg]. Auto-collapse to just top-3 + player on <900px
  heights; hidden entirely in portrait phones (Tour ships without one).
- **Toasts** (item hits, position changes, "FINAL LAP!"): centre-top,
  `.txt-display` 34px white/yellow with ink outline, drop-in curve A,
  auto-out at 1.4s. "FINAL LAP!" gets the red ribbon treatment.

#### 2.5.1 Item roulette animation (on pickup)
MK's slot machine: icons cycle fast and *decelerate* into the result with
tick sounds; the anticipation is the fun. Spec: on item-box pickup, the
slot enters `.spinning` for **850ms**: JS swaps the icon every 50ms from
the item pool, interval easing out (50→70→95→130→190→280ms gaps, ~9
swaps), icon scales 1→0.7→1 per swap with a 6px motion-blur-ish
translateY jitter; ring pulses gold each swap; final icon lands with
curve-A pop (scale 1.5→1) + ⭐ burst + the "got item" jingle (§4).
Player input during roulette: using the item is ignored until it lands
(MK does exactly this — protects the drama).

### 2.6 Pause

MK does: instant freeze, dim, big "PAUSED" display text, chunky menu list,
no panels-with-borders-on-panels. We do: backdrop = sky gradient at 55%
dark + 4px blur; "PAUSED" `.txt-display` 54px white tilted −2°; menu =
vertical stack of `.btn` pills (Resume green / Restart yellow / Controls /
Quit to Menu red), each min-height 56px, staggered pop-in 40ms apart
(§3). Control-scheme switcher lives here as a segmented pill row (the
4 touch schemes as labelled pills, selected = yellow frame).

### 2.7 Results

MK does [ref: mk8-results.jpg]: red halftone banner across the top with
"CONGRATULATIONS!" in wobbly white display letters; standings as
translucent dark rows (pos + head icon + name left, points big right);
**1st-place row fully yellow with ink text**; a giant 3D trophy occupies
the right 40% with gold confetti raining; background = blurred live track
flyover, screen never goes static.

We do:
- Top: `.ribbon` red banner full-width (straightened to 0° here, it spans
  the screen) with per-letter-wobble "🏆 YOU WIN!" / "2ND PLACE!" /
  "SO CLOSE!" / "THE MARKET DECIDES" by finish; halftone overlay on.
- Table: rows slide in left→right staggered 60ms, each 44px: pos numeral
  (Luckiest Guy 22px), portrait 30px circle, name Fredoka 600, time/points
  right-aligned tabular. Player row = yellow background + ink text +
  slight scale 1.02; top-3 rows get 🥇🥈🥉 swapped in for numerals.
- Trophy moment: 1st–3rd → the 🏆 emoji is banned as final art; render the
  gold-trophy cell from the portrait sheet-4 assets as a 180px image with
  a slow rotateY sway + confetti (§3, DOM particles, 60 pieces, gold/red/
  white) for 2.5s. 4th–8th: no trophy, banner copy carries the comedy.
- Buttons row: "RACE AGAIN" `.btn primary`, "CHANGE MOGUL" `.btn`,
  "MENU" `.btn danger`-lite. Fanfare timing in §4.
- Background: keep the race scene rendering with a slow cinematic camera
  orbit of the finish line (the scene already exists — just move the
  camera), dimmed 25%. This is the single cheapest "real game" signal on
  this screen.

### 2.8 Screen transitions

MK does: checkerboard/star wipes and iris-outs between every screen; menus
never hard-cut. We do (all CSS/JS, no libs):
- **Checker wipe** (menu→countdown, results→menu): overlay of 8×8 CSS
  grid squares (or one div with the §1.5 checker gradient at 56px tiles),
  squares scale 0→1 in a diagonal wave (transition-delay by (x+y)*18ms),
  hold 120ms, swap screen underneath, wave out reversed. Total ≈550ms.
  Implementation: a `#wipe` fixed div with 64 child divs generated once.
- **Star wipe** (char select→track select, lighter): a ⭐-clip-path white
  shape scales 0→150vmax from the tapped button's centre (transform-origin
  at click point), screen swaps at full cover, shape scales away. 380ms.
- Rule: NO navigation in the app happens without one of these two. Hard
  cuts are the #1 web-app tell.

---

## 3. MOTION & JUICE SPEC

Nintendo UI is never at rest. The rules: **everything overshoots, nothing
takes longer than 400ms, and idle screens breathe.**

### 3.1 Easing library (the only curves allowed)

```css
:root{
  --curve-pop:   cubic-bezier(.34,1.56,.64,1);  /* A: overshoot — entrances, selections */
  --curve-snap:  cubic-bezier(.2,1.4,.3,1);     /* B: quick UI feedback */
  --curve-out:   cubic-bezier(.16,1,.3,1);      /* C: smooth exits/wipes */
  --curve-in:    cubic-bezier(.5,0,.9,.4);      /* D: things leaving under gravity */
}
```
Linear and ease-in-out are banned in UI. Durations: micro 80–120ms,
pop-ins 220–320ms, wipes 380–550ms, celebrations ≤2.5s.

### 3.2 Signature motions

- **Button hover/touch**: scale 1.05 + rotate(−1deg) on hover (curve B);
  press per §1.4 (translate into shadow). Desktop-only: a tiny ⭐ glint
  sweeps the gloss highlight.
- **Tile select cheer** (char select): portrait scales 1→1.12→1.04
  (curve A, 260ms), 4 mini-stars burst from the tile corners (absolutely
  positioned ⭐ spans animating outward + fading), name does a 2-frame
  squash (scaleY .9→1). Selected state *keeps* a gentle 1.6s breathing
  scale 1.04↔1.06 so the eye stays parked there.
- **Position change flip**: the badge numeral flips — rotateX 90° swap
  digit rotateX back (180ms each way, curve B) + colour flash to green
  (gained) / red (lost) for 400ms + the ▲▼ delta arrow.
- **Hit reactions**: player hit by an item = HUD vignette flash red 120ms
  + whole-canvas shake 6px/180ms (translate on the canvas wrapper, not
  the camera — cheaper) + position badge does a "dizzy" wobble
  (rotate ±5°, 3 oscillations). Item *you* land on someone = their name
  toast + a comic "POW!" star-burst at screen position of the victim
  (project 3D→2D, one div, 500ms).
- **Countdown numerals / GO**: §2.4.
- **Idle life**: title logo bob (translateY ±6px, 2.4s ease-in-out
  alternate — the only place ease-in-out survives); turntable rotation
  (§2.2); menu clouds (two blurred white blobs drifting across the sky
  field at 60s/90s loops); item slot icon gentle rock (±4°) while held.
- **Lap banner**: crossing start/finish = "LAP 2" display text sweeps
  across centre screen left→right on a ribbon, 900ms total.

### 3.3 The juice checklist (ranked by impact ÷ effort)

1. **Checker wipe on every screen change** (§2.8) — kills the web-app feel in one move. *Effort: S*
2. **Display font swap** (Luckiest Guy + Fredoka everywhere) — instantly un-web-apps every screen. *S*
3. **Sky field + watermark + bottom checker on menus** (§1.2/1.5) — replaces the navy void. *S*
4. **Hard offset shadows + ink outlines + press-down buttons** (§1.4) — tactile, toy-like. *S*
5. **Item roulette spin** (§2.5.1) — the single most "Mario Kart" interaction in the game. *M*
6. **Position badge metal numeral + flip on change** (§2.5/3.2). *S*
7. **Countdown giant checker numerals + checker top strip** (§2.4). *S*
8. **Turntable in char select** (§2.2) — the screenshot moment; Speedstorm does it too [ref: speedstorm-charselect.webp]. *L*
9. **Confetti + trophy + yellow player row on results** (§2.7). *M*
10. **Portrait minimap icons + portrait standings chips** (§2.5) — identity everywhere. *S*
11. **Tile cheer + star bursts on select** (§3.2). *S*
12. **Title screen with logo lockup + tap-to-start** (§2.1). *M*
13. **UI sound pass** (§4) — half of "game feel" is audio; currently silent UI reads as broken. *M*
14. **POW! bursts + hit vignette/shake** (§3.2). *M*
15. **Speech-bubble bark on the char-select stage** (§2.2) — comedy delivery in Nintendo framing. *S*

---

## 4. SOUND UI CUES (WebAudio synth)

All short, bright, major-key, slightly square-wave — the existing synth
just needs these as named one-shot functions. No samples, no files.

| Cue name | Moment | Character |
|---|---|---|
| `uiTick` | Hover/focus move between tiles & buttons | 1.2kHz sine blip, 30ms, quiet. The MK cursor tick. |
| `uiSelect` | Confirm any selection (tile, track, button) | Two-note up-chirp E5→A5, triangle, 90ms total. |
| `uiBack` | Back/cancel | Reverse chirp A4→E4, softer. |
| `uiError` | Invalid tap (e.g. item during roulette) | Dull 140Hz square buzz, 120ms. |
| `rouletteTick` | Each roulette icon swap | Woodblock-ish: 900Hz short noise+tone, 25ms; pitch rises slightly as it decelerates. |
| `itemLand` | Roulette lands | Bright "pop" + sparkle arpeggio C6-E6-G6, 150ms. |
| `countBeep` | 3 / 2 / 1 | 440Hz square, 180ms, identical each beat (MK discipline). |
| `countGo` | GO! | Same beep an octave up + major chord stab (C-E-G), 500ms tail. The pitch jump IS the signal. |
| `revSweet` | Throttle inside rocket-start zone | Rising shimmer loop while held in zone; cuts on over-rev with `uiError`-lite. |
| `lapJingle` | Lap advance | 3-note motif (G4-C5-E5), 250ms. |
| `finalLap` | Final lap banner | Same motif + octave-up repeat, slightly urgent tempo. |
| `positionUp` / `positionDown` | Badge flip | Up: quick major 2-note. Down: minor 2-note slide. Subtle, ±6dB under engine. |
| `fanfare` | Results, 1st–3rd | Trumpet-ish sawtooth arpeggio C-E-G-C' with two repeats + shimmer, ≈1.6s, starts 150ms after the banner lands, confetti synced to the final note. |
| `sadTrombone`-lite | Results 7th–8th | Two descending notes, comedic, quiet — comedy, not punishment. |
| `cheerPop` | Tile select cheer (§3.2) | Tiny star "twinkle": 2.4kHz sine ping, 60ms. |

Volume discipline: UI cues sit −12dB under race SFX; `uiTick` −20dB.
Mute toggle must cover UI cues too (one `sfxBus` gain node).

---

## 5. ANTI-PATTERNS — our current tells → their replacements

Verified against the current `style.css` (system font stack, `#0b1026`
field, translucent dark panels) and the shipped menu screenshot.

| # | Web-app tell (current) | Why it reads "web app" | Nintendo replacement |
|---|---|---|---|
| 1 | `font-family:"Avenir Next","Segoe UI",system-ui` | It is literally the OS font — the #1 vibe-code fingerprint | Luckiest Guy display + Fredoka UI (§1.1) |
| 2 | Dark navy void background `#0b1026` + purple gradient | SaaS landing-page / crypto dashboard energy | Sky gradient + watermark + checker strip (§1.2) |
| 3 | Translucent dark glass cards `rgba(10,16,40,.55)` | Glassmorphism = 2021 web design trend | White/cream panels, 3px ink border, hard shadow (§1.4) |
| 4 | Thin 1px borders, soft 24px blur shadows | Nothing in a Nintendo game is 1px or blurry | 3px ink outlines, `0 5px 0` hard offset shadows |
| 5 | Full-width stacked rows, one racer per screen of scroll | A settings list, not a roster | Dense tile grid + detail zone (§2.2), Tour card language |
| 6 | Emoji in a grey circle as the character avatar | Placeholder energy | Generated portraits full-bleed (done — portraits.js) + live 3D turntable |
| 7 | Stat bars (web form language) | Sliders belong in a preferences pane | Radar chart on tiles (specced) + bars only inside the detail zone |
| 8 | Static screens, hard cuts between them | Apps navigate; games *transition* | Checker/star wipes on every change (§2.8) |
| 9 | Silent UI | Real games blip on every cursor move | §4 cue sheet — tick/select/back minimum |
| 10 | HUD as data table (standings grid, speed digits block) | Telemetry, not theatre | MK's 4-element HUD (§2.5): badge, chips, slot, minimap; standings become portrait chips |
| 11 | Countdown = small text / plain numbers | Misses the biggest ritual in kart racing | Giant checker numerals + rev meter (§2.4) |
| 12 | Results = text list on dark panel | An invoice | Banner + confetti + trophy + live track backdrop (§2.7) |
| 13 | Buttons that only change colour on press | No physicality | Buttons that move into their shadow (§1.4) |
| 14 | Muted/desaturated palette overall | "Serious product" palette | Saturated primaries; saturation is the brand (§1.2) |
| 15 | Centred, symmetrical, motionless logo text | A web header | Tilted logo lockup with ribbon + idle bob (§2.1) |

**Acceptance test for any future UI work:** screenshot it next to
[ref: mk8dx-charselect.jpg]. If a stranger could mistake ours for a web
page, it fails; if they could mistake it for a Switch game, it ships.
