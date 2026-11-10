# GRAPHICS.md — Graphics Pipeline Integration Spec

For the main build agent. Everything lives in `gfx/` as **new ES modules**; no
changes to `game.js` / `index.html` / `style.css` were made by the gfx pass.
You integrate by (1) pasting one import-map line, (2) adding imports, (3)
swapping call sites listed in §3. All modules are dependency-light and
PWA-safe: procedural textures are generated on-device (zero downloads), the
only fetched assets are the two in-repo sky panoramas.

Demo: open `gfx/test.html?mode=full` (needs the §1 import map if served
standalone it has its own). Verification: `node gfx/gfx-test.mjs` renders
before/after panels → `gfx/demo-before-after.png`, zero console errors.

---

## 1. Import map (index.html) — REQUIRED, exact change

Current line 13 maps only `three`. Add the addons mapping so `gfx/post.js`
(and RoundedBoxGeometry below) can resolve `three/addons/...`:

```html
<script type="importmap">
{ "imports": {
  "three": "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js",
  "three/addons/": "https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/"
} }
</script>
```

sw.js: bump `CACHE` to `'bk-v2'` and add to `SHELL`:
`'./gfx/textures.js', './gfx/materials.js', './gfx/environment.js', './gfx/post.js', './gfx/sky-data.js'`
(runtime caching already covers them, the SHELL add just guarantees offline).
Note: the sky panoramas ship **embedded as base64** in `gfx/sky-data.js`
(~495 KB text) because the GitHub connector cannot push binary webps;
`environment.js` prefers the embedded copies and only falls back to
`assets/sky-*.webp` file paths in local dev. No SHELL entry needed for them.

## 2. Imports (top of game.js, after the three import)

```js
import * as GTEX from './gfx/textures.js';
import * as GMAT from './gfx/materials.js';
import { setupRenderer, applySky, setupLights, sunFollow, applyFog, FOG_PRESETS, SKY_URLS } from './gfx/environment.js';
import { createPost } from './gfx/post.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
```

## 3. Call sites

### 3a. Renderer init (~line 272, where pixelRatio/setSize happen)

```js
setupRenderer(renderer);            // ACESFilmic tone mapping + exposure 1.0, PCFSoft shadows, sRGB
post = createPost(renderer, scene, camera);   // after scene+camera exist; store in a module-level var
```
Then in the render loop, replace `renderer.render(scene, camera)` (~line 1572) with:
```js
if (post) post.render(); else renderer.render(scene, camera);
```
And in the resize handler add `if (post) post.setSize(innerWidth, innerHeight);`
Quality: `post.applyQuality(localStorage.getItem('bk-quality') || 'auto', { sun: sunLight })`
— call after each buildWorld (sun is rebuilt per track) and from a new
Graphics setting in the menu (Auto/High/Low → localStorage `bk-quality`).

> ⚠️ OutputPass performs tone mapping in the composer. When rendering through
> the composer, keep `renderer.toneMapping = ACESFilmic` (setupRenderer does)
> — OutputPass reads it. Do NOT also bake tone mapping elsewhere.

### 3b. buildWorld() environment block (~lines 370–380) — replace flat sky + lights

Replace:
```js
scene.background = new THREE.Color(tr.sky);
scene.fog = new THREE.Fog(tr.fog, 210, 640);
hemiLight = new THREE.HemisphereLight(0xffffff, tr.ground, 1.05); ...
sunLight = new THREE.DirectionalLight(0xfff2d8, 1.9); ... (manual shadow setup)
```
with:
```js
const { sun, hemi } = /* await */ applyTrackEnvironment(renderer, scene, {
  sky: trackIdx === 1 ? 'mars' : 'valley',
  fog: trackIdx === 1 ? 'marsSunset' : 'valleyDay',
  sun: { shadowMapSize: window.innerWidth < 700 ? 1024 : 2048 },
});
sunLight = sun; hemiLight = hemi;
```
Notes:
- `applyTrackEnvironment` is **async** (sky image load). buildWorld is sync
  today; either make buildWorld async (callers already fire-and-forget at race
  start) or call `applySky(...)` without await — background/environment pop in
  a frame or two later, acceptable during the countdown. Recommended: don't
  block race start on the sky; fire and forget.
- TRACKS entries gain optional `sky`/`fog` preset keys; default mapping above
  covers SV (valley/Day) and Mars (mars/Sunset). Datacenter → sky 'valley' +
  fog 'datacenterDusk' until a dusk sky is generated.
- Per-frame sun follow (~lines 1503–1504) becomes `sunFollow(sunLight, p.pos);`
  (same numbers as today: offset [70,115,45]).

### 3c. Ground / road / shoulder (~lines 393–398)

```js
const grass = GTEX.grassTexture(); grass.repeat.set(40, 40);
const ground = new THREE.Mesh(new THREE.CircleGeometry(760, 48),
  new THREE.MeshStandardMaterial({ map: grass, roughness: 1 }));
// Mars: GTEX.sandTexture({ tint: 'mars' }) repeat 40 — replaces the flat ground colour.
const a = GTEX.asphaltTextures();
a.map.repeat.set(1, 220); a.roughnessMap.repeat.set(1, 220); a.bumpMap.repeat.set(1, 220);
const road = new THREE.Mesh(stripGeometry(HALF_W, 0.03),
  new THREE.MeshStandardMaterial({ map: a.map, roughnessMap: a.roughnessMap, bumpMap: a.bumpMap, bumpScale: 0.8, roughness: 1 }));
```
(The strip UVs run 0..1 across and along; repeat.y ≈ track length / 10 keeps
the asphalt grain scale constant. Tune once visually.)
Keep `roadTexture()` for the curb/dash overlay strip if wanted — or bake curbs
into a thin second strip using `checkerTexture()` as today. Shoulder:
`MeshStandardMaterial({ map: GTEX.concreteTexture(), roughness: .95 })` (SV) /
sand tint mars (Mars), replacing flat Lambert.

### 3d. Kart build (buildKart, ~lines 530–556)

- Body paint: `const bodyMat = GMAT.kartPaint(r.color);` (replaces
  MeshStandardMaterial rough .45/metal .15 — clearcoat is the visible jump).
- Dark trim/seat: `GMAT.mattePlastic(0x191b20)`; suit: `GMAT.mattePlastic(r.suit)`.
- Skin: `GMAT.skinTone(r.skin)`; visor: keep Standard but `GMAT.glass({ color: 0x223044, opacity: .55 })` for Zuck.
- Exhaust pipes: `GMAT.chrome()` (replaces grey Lambert 0xb9c0c7).
- Wheels: `GMAT.rubber({})` (tread bump included) + a chrome hub disc:
  `new THREE.Mesh(new THREE.CylinderGeometry(0.2,0.2,0.44,14), GMAT.chrome({ roughness: .25 }))` rotated like the wheel.
- Every `new THREE.MeshLambertMaterial` in buildKart → the presets above.
  Global rule for the whole file: **Lambert is banned for hero objects**;
  props may use `GMAT.flatProp(color)` (flat-shaded Standard) which still
  receives env light.

### 3e. World props

- Trees/rocks/mesas/buildings/rocket/grandstand Lambert → `GMAT.flatProp(color)`
  or Standard equivalents; buildings on SV get `GMAT.metalPanels({ repeat: 2 })`
  on the tower boxes for a glass/steel read (cheap, one shared texture).
- Clouds (~line 497): replace Lambert spheres with sprites:
  `new THREE.Sprite(new THREE.SpriteMaterial({ map: GTEX.cloudSprite(), transparent: true, opacity: .85, depthWrite: false }))`, scale ~ (26, 11, 1).
- Item boxes (~line 517): already Standard+emissive — raise emissiveIntensity
  to 1.6 so they bloom; LED/billboard planes: `GMAT.emissiveScreen(color, { intensity: 1.8, map })`.
- Particles (drift smoke / boost / sparks): PointsMaterial/SpriteMaterial with
  `map: GTEX.particleSprite()`, `transparent: true, depthWrite: false`
  (additive for sparks/flames, normal blending for smoke).

### 3f. Water (Datacenter lake, White House pool, International Waters sea)

```js
const water = new THREE.Mesh(geo, GMAT.waterMaterial(0x1d5f7a, { repeat: 10 }));
// in the frame loop:
GMAT.animateWater(water.material, elapsedSec);
```
Datacenter draining-lake: animate `water.position.y` down per lap and swap the
exposed lakebed material to `GTEX.sandTexture({})`-mapped cracked dirt
(add crack strokes via asphalt-style canvas if wanted later).

## 4. Kart model upgrades (game.js geometry — concrete changes)

Current karts are raw BoxGeometry + Lambert: hard CG edges are half the
"hobby project" read. In buildKart:

1. **Rounded boxes everywhere.** Replace kart body/nose/seat boxes:
   `new RoundedBoxGeometry(1.9, 0.55, 3.2, 4, 0.14)` (body),
   `(1.3, 0.38, 1.0, 3, 0.1)` (nose), seat `(1.15, 0.8, 0.3, 3, 0.08)`.
   Segments 3–4, radius ~15–25% of the smallest dimension. Cost is trivial
   (a few hundred extra tris × 8 karts).
2. **Face textures for drivers.** One shared canvas-face painter, tinted per
   racer (skin bg = r.skin), drawn once per racer at build:
   ```js
   function faceTexture(r) {
     const c = document.createElement('canvas'); c.width = c.height = 128;
     const g = c.getContext('2d');
     g.fillStyle = '#' + r.skin.toString(16).padStart(6, '0'); g.fillRect(0, 0, 128, 128);
     g.fillStyle = '#20222a';
     g.beginPath(); g.arc(44, 56, 7, 0, 7); g.fill();
     g.beginPath(); g.arc(84, 56, 7, 0, 7); g.fill();
     g.strokeStyle = '#20222a'; g.lineWidth = 5; g.lineCap = 'round';
     g.beginPath(); g.arc(64, 76, 20, 0.35, Math.PI - 0.35); g.stroke(); // grin
     // per-racer extras: glasses for Zuck/Demis, moustache Trump, etc. — switch(r.id)
     const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
   }
   ```
   Apply as a slightly-offset plane on the head sphere's front
   (`PlaneGeometry(0.78, 0.78)` at head-local z +0.5) — proven in gfx/test.html.
   Keep heads big (bobblehead ≈ head radius 0.5 vs torso 0.4): cuteness reads
   as *intentional style*, not low effort, once materials/lighting are right.
3. **Wheels:** cylinder segments 14 → 22, add the chrome hub (3d) and let
   `GMAT.rubber` supply tread bump. Rotate wheels around their local X/Z axle
   as today.
4. **Per-racer silhouette props stay** (halo, chain, rocket cone…) but rebuild
   them with Standard/Physical materials — emissive ones (Jensen nameplate,
   halo) at intensity ≥1.4 so bloom picks them up.
5. **Shadows:** ensure every kart mesh `castShadow = true` (body/head/wheels)
   and ground/road `receiveShadow = true` (already set). With normalBias 0.6
   (setupLights) curved bodies won't acne.

## 5. Weakness → fix map

| Current weakness (v1.1) | Root cause | Fix |
|---|---|---|
| Flat, washed colours everywhere | No tone mapping (NoToneMapping default) | `setupRenderer` ACES + exposure (§3a) |
| Sky is a flat colour void | `scene.background = Color` | `applySky` equirect panorama + PMREM IBL |
| Karts look matte/plastic-toy in a bad way | Lambert body / low-gloss Standard | `kartPaint` clearcoat + env reflections |
| No reflections on metal (pipes, trophy) | Lambert has no env response | `chrome()` + scene.environment |
| Road is flat grey with painted curbs | Basic noise canvas, Lambert | `asphaltTextures` map+roughness+bump, Standard |
| Ground is a solid colour disc | Lambert flat colour | grass/sand procedural textures |
| Emissives don't glow | No post chain | UnrealBloom via `createPost` |
| Clouds are grey spheres | Lambert sphere blobs | `cloudSprite()` billboards |
| Water (new tracks) would be a blue disc | — | `waterMaterial` + `animateWater` |
| Hard CG box edges on karts | BoxGeometry | RoundedBoxGeometry (§4.1) |
| Drivers are blank mannequins | No faces | Canvas face textures (§4.2) |
| Distant track melts into wrong colour | Fog colour ≠ sky | FOG_PRESETS matched to sky horizon |

## 6. Integration risks & notes (found while scouting game.js)

1. **buildWorld teardown disposes material maps** (traverse at buildWorld
   start). gfx textures are module-cached and shared across rebuilds — if the
   teardown disposes them, the next track renders black. Mitigation: in the
   teardown, skip maps flagged shared:
   `if (m.map && !m.map.userData.shared) m.map.dispose();`
   All gfx/textures.js textures carry `userData.shared = true`. Materials
   themselves are NOT cached — dispose them as today.
2. **game.js is a module script** — imports in §2 are legal as-is; the only
   HTML change is the import-map line. The service worker caches gfx/*.js at
   runtime; add them to SHELL (§1) for guaranteed offline.
3. **Sun is recreated per buildWorld** — re-call `post.applyQuality(mode, { sun })`
   after each build (or shadow size stays from the previous track's light).
4. **PMREM cost:** `applySky` generates the env map once per sky URL (cached
   in environment.js) — ~10–20 ms on desktop, more on low phones; do it during
   menu/countdown, not mid-race. Skies are embedded base64 (~495 KB JS,
   parses fast, zero network) with the 135–230 KB webp files as local fallback.
5. **SwiftShader/headless** runs bloom slowly; the bot's 1280×800 screenshots
   still complete — expect gfx full-mode frames to take seconds in CI, not ms.
   Keep bot assertions on state, not frame timing.
6. **Lambert + environment:** Lambert ignores scene.environment, so any mesh
   left on Lambert after integration will look *flatter by contrast*. The
   §3d/§3e sweep matters — partial adoption reads as inconsistency.
7. `renderer.useLegacyLights` — r160 default is false (physical falloff);
   setupLights intensities (sun 1.7, hemi 0.4 + env ~0.5) are tuned for that.
   If the scene looks dark after integration, raise exposure before touching
   light intensities.

## 7. Performance budget (target: 60 fps mid-phone, 30 fps floor low-end)

- Textures: all canvas-generated, ≤512², total GPU ≈ 6–8 MB. No downloads.
- Bloom: half-res internally (UnrealBloomPass mips), OFF in low quality.
- Composer target: HalfFloat; MSAA ×4 samples high / 0 low (+FXAA on low).
- Shadows: 2048 high / 1024 low, ±80-unit frustum following the player (as today).
- Pixel ratio: keep the existing 1.75 cap; low quality → cap 1.25 (caller's choice).
- Draw calls unchanged (materials don't add passes except clearcoat's env
  sampling — negligible). Points/sprites replace some mesh props = fewer calls.
- Auto quality: `detectQuality()` (UA + cores + DPR) — menu override wins.

## 8. Verification

`node gfx/gfx-test.mjs` — serves the repo, loads gfx/test.html in `plain` and
`full` modes with all four modules imported, asserts zero console/page errors,
and writes the side-by-side `gfx/demo-before-after.png`. (Result of the gfx
pass run is reported in the handoff; re-run after integrating to compare
against in-game screenshots.)
