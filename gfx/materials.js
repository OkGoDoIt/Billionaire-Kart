/* Billionaire Kart — gfx/materials.js
 * Material presets. The single biggest visual upgrade over the current build:
 * game.js uses MeshLambertMaterial almost everywhere (flat, no specular, no
 * environment response). These presets are Standard/Physical materials that
 * react to the PMREM environment from gfx/environment.js — glossy paint,
 * real chrome, readable rubber — which is what makes the game look "lit".
 *
 * All factories take colour params and return fresh materials (materials are
 * cheap; textures are the cached/shared part — see textures.js).
 */
import * as THREE from 'three';
import { tireTreadTexture, waterNoiseTexture, metalPanelsTexture, carbonFibreTexture } from './textures.js';

/**
 * Glossy kart paint — the hero material.
 * MeshPhysicalMaterial with a clearcoat layer: coloured base + a sharp
 * clearcoat highlight from the sky/env. This is the "toy car / Mario Kart 8"
 * look. Pair with scene.environment set (environment.js) or it goes dull.
 */
export function kartPaint(color, { roughness = 0.36, clearcoat = 0.85, clearcoatRoughness = 0.35, metalness = 0.08, envMapIntensity = 0.65, specularIntensity = 0.7 } = {}) {
  return new THREE.MeshPhysicalMaterial({
    color, roughness, metalness,
    clearcoat, clearcoatRoughness,
    envMapIntensity, specularIntensity,
  });
}

/** Polished metal: exhausts, rims, trophy. Needs scene.environment to shine. */
export function chrome({ color = 0xffffff, roughness = 0.08, envMapIntensity = 1.5 } = {}) {
  return new THREE.MeshStandardMaterial({ color, metalness: 1.0, roughness, envMapIntensity });
}

/** Brushed/dark metal for chassis parts and poles. */
export function darkMetal({ color = 0x2a2d33, roughness = 0.45 } = {}) {
  return new THREE.MeshStandardMaterial({ color, metalness: 0.85, roughness, envMapIntensity: 1.0 });
}

/**
 * Tire rubber with procedural tread as bump. For a CylinderGeometry wheel,
 * the tread lands on the curved side (the cylinder's lateral UV wraps the
 * circumference) — rotate the wheel mesh so the cylinder axis is the axle.
 */
export function rubber({ color = 0x17181c, treadRepeat = [6, 1], bumpScale = 0.6 } = {}) {
  const tread = tireTreadTexture();
  tread.repeat.set(treadRepeat[0], treadRepeat[1]);
  return new THREE.MeshStandardMaterial({
    color, roughness: 0.94, metalness: 0.0,
    bumpMap: tread, bumpScale,
  });
}

/** Matte coloured plastic: cones, barriers, driver suits, props. */
export function mattePlastic(color, { roughness = 0.72 } = {}) {
  return new THREE.MeshStandardMaterial({ color, roughness, metalness: 0.0, envMapIntensity: 0.7 });
}

/** Skin-tone matte for driver heads/hands (slightly warmer response than plastic). */
export function skinTone(color) {
  return new THREE.MeshStandardMaterial({ color, roughness: 0.58, metalness: 0.0, envMapIntensity: 0.8 });
}

/**
 * Emissive screen / LED panel. With bloom enabled (post.js) anything with
 * emissiveIntensity > ~1.2 blooms — use for datacenter LED counters, item
 * boxes, boost pads, billboards at dusk. `map` optional (canvas sign art).
 */
export function emissiveScreen(color = 0x33ffcc, { intensity = 1.6, map = null, base = 0x0a0f14 } = {}) {
  const m = new THREE.MeshStandardMaterial({
    color: base, roughness: 0.4, metalness: 0.2,
    emissive: new THREE.Color(color), emissiveIntensity: intensity,
  });
  if (map) { m.map = map; m.emissiveMap = map; m.emissive.set(0xffffff); }
  return m;
}

/** Server-rack / building metal panels (procedural texture built in). */
export function metalPanels({ color = 0xffffff, repeat = 1, roughness = 0.5 } = {}) {
  const map = metalPanelsTexture();
  map.repeat.set(repeat, repeat);
  return new THREE.MeshStandardMaterial({ map, color, roughness, metalness: 0.72, envMapIntensity: 1.0 });
}

/** Carbon fibre (spoilers, dashboards, Thiel's whole personality). */
export function carbonFibre({ repeat = 6 } = {}) {
  const map = carbonFibreTexture();
  map.repeat.set(repeat, repeat);
  return new THREE.MeshPhysicalMaterial({
    map, roughness: 0.42, metalness: 0.25,
    clearcoat: 0.7, clearcoatRoughness: 0.3, envMapIntensity: 0.8,
  });
}

/**
 * Animated water. MeshPhysicalMaterial with high env reflection + a noise
 * bump that scrolls. Animate per frame with animateWater(mat, elapsedSec) —
 * cheap: two texture-offset writes, no shader recompile.
 * Used for: Datacenter cooling lake, White House reflecting pool, Waters GP sea.
 */
export function waterMaterial(color = 0x1d5f7a, { opacity = 0.86, repeat = 10 } = {}) {
  const noise = waterNoiseTexture();
  noise.repeat.set(repeat, repeat);
  const m = new THREE.MeshPhysicalMaterial({
    color, roughness: 0.07, metalness: 0.05,
    transparent: true, opacity,
    bumpMap: noise, bumpScale: 1.4,
    envMapIntensity: 1.2,
    clearcoat: 0.5, clearcoatRoughness: 0.12,
  });
  m.userData.waterNoise = noise;
  return m;
}

/** Scroll a waterMaterial's noise so the surface shimmers/flows. Call in the render loop. */
export function animateWater(mat, t, { speed = 0.014, swirl = 0.006 } = {}) {
  const n = mat.userData.waterNoise;
  if (!n) return;
  n.offset.set((t * speed) % 1, (t * swirl + Math.sin(t * 0.11) * 0.01) % 1);
}

/** Glass: canopies, office towers, Zuck's metaverse visor. */
export function glass({ color = 0xbfd9e8, opacity = 0.28, roughness = 0.05 } = {}) {
  return new THREE.MeshPhysicalMaterial({
    color, roughness, metalness: 0.0,
    transparent: true, opacity,
    envMapIntensity: 1.8,
    clearcoat: 1.0, clearcoatRoughness: 0.06,
    side: THREE.DoubleSide, depthWrite: false,
  });
}

/** Flat-shaded low-poly rock/foliage material (keeps the stylised look for terrain props). */
export function flatProp(color, { roughness = 0.9 } = {}) {
  return new THREE.MeshStandardMaterial({ color, roughness, metalness: 0.0, flatShading: true, envMapIntensity: 0.55 });
}
