/* Billionaire Kart — gfx/environment.js
 * Sky, image-based lighting, sun + shadow rig, renderer defaults, fog presets.
 *
 * The current game sets `scene.background = new THREE.Color(...)` and lights
 * everything with Lambert materials: that combination is the "flat hobby
 * project" look. applySky() replaces it with a real equirect sky that ALSO
 * lights the scene (PMREM environment), so every Standard/Physical material
 * from gfx/materials.js picks up sky reflections and ambient colour for free.
 */
import * as THREE from 'three';
import { SKY_DATA } from './sky-data.js';

/**
 * Generated sky panoramas. Resolution order in applySky(): if SKY_DATA (the
 * base64-embedded copies in sky-data.js) has the sky, that data URI is used —
 * it always works, including when the game is served from a text-only push.
 * The file paths below are the local-dev fallback / canonical asset names.
 */
export const SKY_URLS = {
  valley: 'assets/sky-valley.webp', // bright blue midday, cumulus, hills
  mars: 'assets/sky-mars.webp',     // salmon sunset, mesa silhouettes
};

// path -> embedded copy, so callers can keep passing SKY_URLS values.
const SKY_BY_PATH = {
  [SKY_URLS.valley]: SKY_DATA.valley,
  [SKY_URLS.mars]: SKY_DATA.mars,
};

/** Resolve a sky key ('valley'), a SKY_URLS path, or a raw URL to a loadable source. */
export function resolveSkySource(urlOrKey) {
  if (!urlOrKey) return urlOrKey;
  if (SKY_DATA[urlOrKey]) return SKY_DATA[urlOrKey];
  return SKY_BY_PATH[urlOrKey] || urlOrKey;
}

/**
 * Renderer defaults that should be set ONCE at init (replaces the ad-hoc
 * settings in game.js init): ACES filmic tone mapping is the big one —
 * without it, lit colours clip to flat primaries.
 */
export function setupRenderer(renderer, { exposure = 1.0 } = {}) {
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = exposure;
  renderer.outputColorSpace = THREE.SRGBColorSpace; // already set in game.js; harmless to repeat
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  return renderer;
}

const skyCache = new Map(); // url -> { tex, envRT } (PMREM targets must not be disposed per-track)

/**
 * Load an equirect sky image, use it as the scene background AND generate a
 * PMREM environment map from it for image-based lighting.
 * @param {THREE.WebGLRenderer} renderer
 * @param {THREE.Scene} scene
 * @param {string} url  e.g. SKY_URLS.valley
 * @param {{envIntensity?: number, backgroundBlurriness?: number}} opts
 *   envIntensity: scene.environmentIntensity (r160 supports it) — 0.55–0.9
 *   keeps direct sun dominant; backgroundBlurriness 0 = sharp sky.
 * @returns {Promise<{sky: THREE.Texture, env: THREE.Texture}>}
 */
export async function applySky(renderer, scene, url, { envIntensity = 0.75, backgroundBlurriness = 0 } = {}) {
  url = resolveSkySource(url);
  if (skyCache.has(url)) {
    const hit = skyCache.get(url);
    scene.background = hit.tex;
    scene.environment = hit.envRT.texture;
    if ('environmentIntensity' in scene) scene.environmentIntensity = envIntensity;
    scene.backgroundBlurriness = backgroundBlurriness;
    return { sky: hit.tex, env: hit.envRT.texture };
  }
  const tex = await new THREE.TextureLoader().loadAsync(url);
  tex.mapping = THREE.EquirectangularReflectionMapping;
  tex.colorSpace = THREE.SRGBColorSpace;

  const pmrem = new THREE.PMREMGenerator(renderer);
  pmrem.compileEquirectangularShader();
  const envRT = pmrem.fromEquirectangular(tex);
  pmrem.dispose();

  scene.background = tex;
  scene.environment = envRT.texture;
  if ('environmentIntensity' in scene) scene.environmentIntensity = envIntensity;
  scene.backgroundBlurriness = backgroundBlurriness;
  skyCache.set(url, { tex, envRT });
  return { sky: tex, env: envRT.texture };
}

/**
 * Sun + hemisphere rig with the shadow camera FITTED to the play area.
 * game.js currently follows the player with a fixed ±80 box — keep that
 * behaviour by calling sunFollow(sun, targetPos) each frame (below); use
 * `radius` here for the initial fit / tracks small enough to cover whole.
 *
 * @param {{radius?: number, sunColor?: number, sunIntensity?: number,
 *          sunPosition?: [number,number,number], hemiSky?: number,
 *          hemiGround?: number, hemiIntensity?: number,
 *          shadowMapSize?: number}} opts
 * @returns {{sun: THREE.DirectionalLight, hemi: THREE.HemisphereLight}}
 */
export function setupLights(scene, {
  radius = 80,
  sunColor = 0xfff2d8, sunIntensity = 1.7,
  sunPosition = [70, 115, 45],
  hemiSky = 0xbfd9ff, hemiGround = 0x54604a, hemiIntensity = 0.4,
  shadowMapSize = 2048,
} = {}) {
  const hemi = new THREE.HemisphereLight(hemiSky, hemiGround, hemiIntensity);
  scene.add(hemi);

  const sun = new THREE.DirectionalLight(sunColor, sunIntensity);
  sun.castShadow = true;
  sun.shadow.mapSize.set(shadowMapSize, shadowMapSize);
  const c = sun.shadow.camera;
  c.left = -radius; c.right = radius; c.top = radius; c.bottom = -radius;
  c.near = 10; c.far = 420;
  c.updateProjectionMatrix();
  sun.shadow.bias = -0.0004;
  sun.shadow.normalBias = 0.6; // kills acne on curved kart bodies at this scale
  sun.position.set(...sunPosition);
  scene.add(sun); scene.add(sun.target);
  return { sun, hemi };
}

/** Per-frame: keep the tight shadow frustum centred on the action (player kart). */
export function sunFollow(sun, pos, offset = [70, 115, 45]) {
  sun.position.set(pos.x + offset[0], offset[1], pos.z + offset[2]);
  sun.target.position.copy(pos);
  sun.target.updateMatrixWorld();
}

/* ---------------------------------------------------------------- fog ---
 * Fog colour should match the sky's horizon colour so distant geometry melts
 * into the sky instead of into a mismatched flat colour (current bug: fog
 * colour != background in some lights). near/far tuned to the ~760-unit world.
 */
export const FOG_PRESETS = {
  valleyDay: { color: 0xcfe4f7, near: 240, far: 720, exposure: 1.0, envIntensity: 0.5 },
  marsSunset: { color: 0xe8a075, near: 200, far: 660, exposure: 1.08, envIntensity: 0.65 },
  datacenterDusk: { color: 0x8d7f95, near: 170, far: 560, exposure: 1.02, envIntensity: 0.55 },
  whiteHouseNoon: { color: 0xd8ecfa, near: 260, far: 760, exposure: 1.02, envIntensity: 0.55 },
  watersGolden: { color: 0xf2c894, near: 220, far: 700, exposure: 1.1, envIntensity: 0.7 },
};

/** Apply a FOG_PRESETS entry (fog only; exposure/envIntensity are returned for the caller). */
export function applyFog(scene, presetName) {
  const p = FOG_PRESETS[presetName];
  if (!p) throw new Error(`environment.js: unknown fog preset "${presetName}"`);
  scene.fog = new THREE.Fog(p.color, p.near, p.far);
  return p;
}

/**
 * Convenience: full per-track environment in one call.
 * @param opts {{sky: string (SKY_URLS key or URL), fog: string (FOG_PRESETS key),
 *               sun?: object (setupLights opts)}}
 * @returns {Promise<{sun, hemi, preset}>}
 */
export async function applyTrackEnvironment(renderer, scene, { sky, fog, sun = {} } = {}) {
  const preset = applyFog(scene, fog);
  renderer.toneMappingExposure = preset.exposure;
  const lights = setupLights(scene, sun);
  const url = SKY_URLS[sky] || sky;
  if (url) await applySky(renderer, scene, url, { envIntensity: preset.envIntensity });
  return { ...lights, preset };
}
