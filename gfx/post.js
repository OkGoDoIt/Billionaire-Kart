/* Billionaire Kart — gfx/post.js
 * Post-processing: EffectComposer + UnrealBloom + OutputPass (+ optional FXAA).
 *
 * Bloom is the cheapest "this looks like a real game" effect there is: it makes
 * emissive things (LED counters, boost flames, item boxes, sun glints on
 * clearcoat) glow instead of sitting flat. Settings are deliberately gentle
 * (threshold 0.9, strength 0.32) so only genuinely bright/emissive pixels bloom
 * and the HUD-readable scene underneath stays crisp.
 *
 * REQUIRES three/addons in the import map — see GRAPHICS.md §1:
 *   "three/addons/": "https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/"
 *
 * Quality API: createPost(renderer, scene, camera) then .applyQuality('high' |
 * 'low' | 'auto'). 'auto' = detectQuality() from UA / pixelRatio / cores.
 *   high : MSAA×4 HalfFloat composer target, bloom ON,  shadow hint 2048
 *   low  : no MSAA, bloom OFF, FXAA ON (cheap AA instead), shadow hint 1024
 * The caller applies the shadow hint to its sun light (post can't own lights):
 *   post.applyQuality('auto', { sun }) — handled for you if you pass sun.
 */
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { FXAAShader } from 'three/addons/shaders/FXAAShader.js';

/** Heuristic device capability → 'high' | 'low'. Mobile UA or small cores → low. */
export function detectQuality() {
  const ua = navigator.userAgent || '';
  const mobile = /Android|iPhone|iPad|iPod|Mobile/i.test(ua);
  const cores = navigator.hardwareConcurrency || 4;
  const dpr = window.devicePixelRatio || 1;
  if (mobile && (cores <= 4 || dpr > 2.6)) return 'low';
  if (cores <= 2) return 'low';
  return 'high';
}

/**
 * @returns {{composer, renderPass, bloomPass, fxaaPass, outputPass,
 *            applyQuality(mode, opts?), setSize(w,h), render(), quality}}
 */
export function createPost(renderer, scene, camera) {
  const size = renderer.getDrawingBufferSize(new THREE.Vector2());

  // HalfFloat target: bloom + ACES need HDR range before OutputPass tonemaps.
  const rt = new THREE.WebGLRenderTarget(size.x, size.y, { type: THREE.HalfFloatType, samples: 4 });
  const composer = new EffectComposer(renderer, rt);

  const renderPass = new RenderPass(scene, camera);
  const bloomPass = new UnrealBloomPass(new THREE.Vector2(size.x / 2, size.y / 2), 0.32, 0.4, 0.9);
  const fxaaPass = new ShaderPass(FXAAShader);
  const outputPass = new OutputPass(); // applies tone mapping + sRGB (r160 pattern)

  composer.addPass(renderPass);
  composer.addPass(bloomPass);
  composer.addPass(fxaaPass);
  composer.addPass(outputPass); // must be LAST

  const api = {
    composer, renderPass, bloomPass, fxaaPass, outputPass,
    quality: 'high',

    /**
     * @param {'high'|'low'|'auto'} mode
     * @param {{sun?: THREE.DirectionalLight}} opts — if sun given, its shadow
     *   map size is set (2048 high / 1024 low) and disposed so it reallocates.
     */
    applyQuality(mode, { sun } = {}) {
      const q = mode === 'auto' ? detectQuality() : mode;
      api.quality = q;
      const s = renderer.getDrawingBufferSize(new THREE.Vector2());
      if (q === 'high') {
        bloomPass.enabled = true;
        fxaaPass.enabled = false; // MSAA target already smooths edges
        composer.renderTarget1.samples = 4; composer.renderTarget2.samples = 4;
        if (sun) setShadowSize(sun, 2048);
      } else {
        bloomPass.enabled = false;
        fxaaPass.enabled = true;
        composer.renderTarget1.samples = 0; composer.renderTarget2.samples = 0;
        fxaaPass.material.uniforms.resolution.value.set(1 / s.x, 1 / s.y);
        if (sun) setShadowSize(sun, 1024);
      }
      return q;
    },

    setSize(w, h) {
      composer.setSize(w, h);
      const s = renderer.getDrawingBufferSize(new THREE.Vector2());
      if (fxaaPass.enabled) fxaaPass.material.uniforms.resolution.value.set(1 / s.x, 1 / s.y);
    },

    /** Drop-in replacement for renderer.render(scene, camera) in the loop. */
    render() { composer.render(); },
  };

  function setShadowSize(sun, px) {
    if (sun.shadow.mapSize.x === px) return;
    sun.shadow.mapSize.set(px, px);
    if (sun.shadow.map) { sun.shadow.map.dispose(); sun.shadow.map = null; }
  }

  api.applyQuality('auto');
  return api;
}
