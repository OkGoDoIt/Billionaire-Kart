/* Renderer: WebGL setup, quality tiers, split-screen viewports, post-processing
   (bloom, colour grade, speed blur, tone mapping), lights, sky, and shadows. */
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { Pass, FullScreenQuad } from 'three/addons/postprocessing/Pass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { Sky, SKY_PRESETS } from './sky.js';
import { clamp } from '../core/util.js';

export const QUALITY = {
  low:    { label: 'Low',    maxPixelRatio: 1,    msaa: 0, bloom: false, shadow: 0,    shadowRange: 0,  particles: 0.5, aniso: 2 },
  medium: { label: 'Medium', maxPixelRatio: 1.25, msaa: 2, bloom: true,  shadow: 1024, shadowRange: 42, particles: 0.8, aniso: 4 },
  high:   { label: 'High',   maxPixelRatio: 1.5,  msaa: 4, bloom: true,  shadow: 2048, shadowRange: 55, particles: 1,   aniso: 8 },
  ultra:  { label: 'Ultra',  maxPixelRatio: 2,    msaa: 4, bloom: true,  shadow: 4096, shadowRange: 75, particles: 1,   aniso: 16 },
};

export function detectQuality() {
  const coarse = matchMedia('(pointer: coarse)').matches;
  const small = Math.min(screen.width, screen.height) < 820;
  const cores = navigator.hardwareConcurrency || 4;
  if (coarse || small) return cores >= 6 ? 'medium' : 'low';
  return cores >= 8 ? 'high' : 'medium';
}

/** Renders every view (one per local player) into the composer's buffer using scissored viewports. */
class ViewsPass extends Pass {
  constructor(gfx) { super(); this.gfx = gfx; this.needsSwap = false; this.clear = true; }
  render(renderer, writeBuffer, readBuffer) {
    const gfx = this.gfx, rt = this.renderToScreen ? null : readBuffer;
    const W = rt ? rt.width : renderer.domElement.width, H = rt ? rt.height : renderer.domElement.height;
    const oldAuto = renderer.autoClear; renderer.autoClear = false;
    if (rt) { rt.scissorTest = false; rt.viewport.set(0, 0, W, H); rt.scissor.set(0, 0, W, H); }
    renderer.setRenderTarget(rt);
    renderer.setClearColor(0x000000, 1);
    renderer.clear(true, true, true);
    for (const view of gfx.views) {
      const [x, y, w, h] = view.rect;
      const vx = Math.round(x * W), vy = Math.round(y * H), vw = Math.round(w * W), vh = Math.round(h * H);
      if (rt) { rt.viewport.set(vx, vy, vw, vh); rt.scissor.set(vx, vy, vw, vh); rt.scissorTest = true; renderer.setRenderTarget(rt); }
      else { const pr = renderer.getPixelRatio(); renderer.setViewport(vx / pr, vy / pr, vw / pr, vh / pr); renderer.setScissor(vx / pr, vy / pr, vw / pr, vh / pr); renderer.setScissorTest(true); }
      const cam = view.camera, aspect = vw / vh;
      if (cam.aspect !== aspect) { cam.aspect = aspect; cam.updateProjectionMatrix(); }
      if (view.focus) gfx.focusShadow(view.focus);
      if (view.onBeforeRender) view.onBeforeRender(view);
      renderer.render(gfx.scene, cam);
      if (view.onAfterRender) view.onAfterRender(view);
    }
    if (rt) { rt.scissorTest = false; rt.viewport.set(0, 0, W, H); rt.scissor.set(0, 0, W, H); }
    else { renderer.setScissorTest(false); }
    renderer.autoClear = oldAuto;
  }
}

const GradeShader = {
  uniforms: {
    tDiffuse: { value: null }, uVignette: { value: 0.26 }, uSat: { value: 1.18 }, uContrast: { value: 1.08 },
    uBlur: { value: 0 }, uCenter: { value: new THREE.Vector2(0.5, 0.45) }, uFlash: { value: 0 }, uFlashColor: { value: new THREE.Color(1, 1, 1) },
    uLift: { value: new THREE.Color(0, 0, 0) }, uGain: { value: new THREE.Color(1, 1, 1) }, uSingle: { value: 1 },
  },
  vertexShader: /* glsl */`varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`,
  fragmentShader: /* glsl */`
    precision highp float;
    uniform sampler2D tDiffuse; uniform float uVignette, uSat, uContrast, uBlur, uFlash, uSingle;
    uniform vec2 uCenter; uniform vec3 uFlashColor, uLift, uGain; varying vec2 vUv;
    void main() {
      vec3 c;
      if (uBlur > 0.002) {
        vec2 dir = vUv - uCenter; float amt = uBlur * smoothstep(0.12, 0.75, length(dir));
        c = vec3(0.0);
        for (int i = 0; i < 8; i++) { float t = float(i) / 7.0; c += texture2D(tDiffuse, vUv - dir * amt * t).rgb; }
        c /= 8.0;
      } else c = texture2D(tDiffuse, vUv).rgb;
      float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
      c = mix(vec3(l), c, uSat);
      c = max((c - 0.18) * uContrast + 0.18, 0.0);
      c = c * uGain + uLift;
      float v = smoothstep(1.05, 0.3, length((vUv - 0.5) * vec2(1.0, 0.86)) * 1.25);
      c *= mix(1.0, mix(1.0 - uVignette, 1.0, v), uSingle);
      c = mix(c, uFlashColor, uFlash);
      gl_FragColor = vec4(c, 1.0);
    }`,
};

class GradePass extends Pass {
  constructor() {
    super();
    this.uniforms = THREE.UniformsUtils.clone(GradeShader.uniforms);
    this.material = new THREE.ShaderMaterial({ uniforms: this.uniforms, vertexShader: GradeShader.vertexShader, fragmentShader: GradeShader.fragmentShader, depthTest: false, depthWrite: false });
    this.quad = new FullScreenQuad(this.material);
  }
  render(renderer, writeBuffer, readBuffer) {
    this.uniforms.tDiffuse.value = readBuffer.texture;
    renderer.setRenderTarget(this.renderToScreen ? null : writeBuffer);
    this.quad.render(renderer);
  }
  dispose() { this.material.dispose(); this.quad.dispose(); }
}

export class Gfx {
  constructor(canvas, { quality = detectQuality() } = {}) {
    this.canvas = canvas;
    this.qualityName = quality; this.q = QUALITY[quality];
    const renderer = this.renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: false, powerPreference: 'high-performance', stencil: false });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.NeutralToneMapping;
    renderer.toneMappingExposure = 1;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.info.autoReset = false;
    this.maxAniso = renderer.capabilities.getMaxAnisotropy();
    this.scene = new THREE.Scene();
    this.views = [];
    this.time = 0; this.scale = 1; this._ft = 16; this._scaleCooldown = 2;
    this.post = { blur: 0, flash: 0, flashColor: new THREE.Color(1, 1, 1), vignette: 0.26, sat: 1.18, contrast: 1.08 };

    // lights (configured by setSky)
    this.sun = new THREE.DirectionalLight(0xffffff, 3); this.sun.name = 'sun';
    this.sunTarget = new THREE.Object3D(); this.sun.target = this.sunTarget;
    this.hemi = new THREE.HemisphereLight(0xffffff, 0x888888, 1);
    this.scene.add(this.sun, this.sunTarget, this.hemi);
    this._sunOffset = new THREE.Vector3(1, 1, 1);

    this._buildComposer();
    this.applyQuality(quality);
    this.resize();
    addEventListener('resize', () => this.resize());
    if (window.visualViewport) visualViewport.addEventListener('resize', () => this.resize());
    if (window.ResizeObserver) new ResizeObserver(() => this.resize()).observe(canvas.parentElement || document.body);
  }

  _buildComposer() {
    const r = this.renderer, q = this.q;
    if (this.composer) { this.composer.dispose(); this.bloom?.dispose(); }
    const size = r.getDrawingBufferSize(new THREE.Vector2());
    const rt = new THREE.WebGLRenderTarget(Math.max(2, size.x), Math.max(2, size.y), { type: THREE.HalfFloatType, samples: q.msaa, depthBuffer: true });
    const composer = this.composer = new EffectComposer(r, rt);
    this.viewsPass = new ViewsPass(this); composer.addPass(this.viewsPass);
    this.bloom = new UnrealBloomPass(new THREE.Vector2(size.x, size.y), 0.32, 0.6, 1.25);
    this.bloom.enabled = q.bloom; composer.addPass(this.bloom);
    this.grade = new GradePass(); composer.addPass(this.grade);
    this.output = new OutputPass(); composer.addPass(this.output);
  }

  applyQuality(name) {
    this.qualityName = name; this.q = QUALITY[name];
    const q = this.q, r = this.renderer;
    r.shadowMap.enabled = q.shadow > 0;
    this.sun.castShadow = q.shadow > 0;
    if (q.shadow) {
      this.sun.shadow.mapSize.set(q.shadow, q.shadow);
      if (this.sun.shadow.map) { this.sun.shadow.map.dispose(); this.sun.shadow.map = null; }
      const c = this.sun.shadow.camera, R = q.shadowRange;
      c.left = -R; c.right = R; c.top = R; c.bottom = -R; c.near = 10; c.far = 420; c.updateProjectionMatrix();
      this.sun.shadow.bias = -0.0005; this.sun.shadow.normalBias = 0.06; this.sun.shadow.radius = 2.2;
    }
    this._buildComposer();
    this.width = 0; this.resize();
    this.scene.traverse(o => { if (o.material) { const ms = Array.isArray(o.material) ? o.material : [o.material]; for (const m of ms) m.needsUpdate = true; } });
  }

  resize() {
    const el = this.canvas.parentElement || document.body;
    const w = Math.max(2, el.clientWidth), h = Math.max(2, el.clientHeight);
    const pr = Math.min(window.devicePixelRatio || 1, this.q.maxPixelRatio) * this.scale;
    if (w === this.width && h === this.height && pr === this.pixelRatio) return;
    this.width = w; this.height = h; this.pixelRatio = pr;
    this.renderer.setPixelRatio(pr);
    this.renderer.setSize(w, h, false);
    this.composer.setPixelRatio(pr);
    this.composer.setSize(w, h);
  }

  /** Configure sky, lights, fog, and environment for a track. Returns the Sky. */
  setSky(preset = 'day', overrides = {}) {
    if (this.sky) this.scene.remove(this.sky.mesh);
    const sky = this.sky = new Sky(preset, overrides), p = sky.p;
    sky.mesh.scale.setScalar(1);
    this.scene.add(sky.mesh);
    // Scene-referred light levels are kept low so sunlit white stays under the bloom
    // threshold (only emissives and sparks glow); exposure brings the image back up.
    const L = this.lightScale = 0.6;
    sky.uniforms.uGain.value = L;
    this.sun.color.set(p.sunLight); this.sun.intensity = p.sunIntensity * L;
    this._sunOffset.copy(sky.sunDir).multiplyScalar(200);
    this.hemi.color.set(p.hemiSky); this.hemi.groundColor.set(p.hemiGround); this.hemi.intensity = p.hemiIntensity * L;
    this.scene.fog = new THREE.Fog(new THREE.Color(p.fog).multiplyScalar(L), p.fogNear, p.fogFar);
    this.renderer.toneMappingExposure = p.exposure / L;
    if (this.envTex) this.envTex.dispose();
    this.envTex = sky.bakeEnvironment(this.renderer);
    this.scene.environment = this.envTex;
    this.scene.environmentIntensity = p.envIntensity ?? 0.9;
    return sky;
  }

  /** Centre the shadow frustum on a world position (snapped to texels so shadows do not shimmer). */
  focusShadow(pos) {
    if (!this.q.shadow) return;
    const R = this.q.shadowRange, texel = (2 * R) / this.q.shadow;
    _t.copy(pos);
    // snap in light space
    _m.lookAt(_z.set(0, 0, 0), _n.copy(this._sunOffset).negate(), _up); _mi.copy(_m).invert();
    _t.applyMatrix4(_mi); _t.x = Math.round(_t.x / texel) * texel; _t.y = Math.round(_t.y / texel) * texel; _t.applyMatrix4(_m);
    this.sunTarget.position.copy(_t); this.sunTarget.updateMatrixWorld();
    this.sun.position.copy(_t).add(this._sunOffset); this.sun.updateMatrixWorld();
  }

  setViews(views) { this.views = views; this.grade.uniforms.uSingle.value = views.length === 1 ? 1 : 0; }

  render(dt) {
    this.time += dt;
    if (this.sky) this.sky.update(this.time);
    const u = this.grade.uniforms, p = this.post;
    u.uBlur.value = this.views.length === 1 ? p.blur : 0; u.uFlash.value = p.flash; u.uFlashColor.value.copy(p.flashColor);
    u.uVignette.value = p.vignette; u.uSat.value = p.sat; u.uContrast.value = p.contrast;
    this.renderer.info.reset();
    this.composer.render(dt);
    this._autoScale(dt);
  }

  /** Dynamic resolution: trade pixels for frame rate when the GPU is struggling. */
  _autoScale(dt) {
    if (this.fixedScale) return;
    this._ft += (dt * 1000 - this._ft) * 0.05;
    this._scaleCooldown -= dt;
    if (this._scaleCooldown > 0) return;
    if (this._ft > 21 && this.scale > 0.55) { this.scale = clamp(this.scale - 0.12, 0.55, 1); this._scaleCooldown = 2.5; this.resize(); }
    else if (this._ft < 14.5 && this.scale < 1) { this.scale = clamp(this.scale + 0.08, 0.55, 1); this._scaleCooldown = 4; this.resize(); }
  }
}

const _t = new THREE.Vector3(), _z = new THREE.Vector3(), _n = new THREE.Vector3(), _up = new THREE.Vector3(0, 1, 0);
const _m = new THREE.Matrix4(), _mi = new THREE.Matrix4();
export { SKY_PRESETS };
