/* Sky dome with gradient, sun, and drifting stylised clouds; also bakes the
   environment map that gives karts their glossy toy-plastic reflections. */
import * as THREE from 'three';

export const SKY_PRESETS = {
  day: {
    zenith: 0x1668e0, horizon: 0x8fd3ff, ground: 0xb9e4ff, sun: 0xfff3d6, sunDir: [0.5, 0.62, 0.38],
    cloud: 0xffffff, cloudShade: 0xa9c4ea, cloudCover: 0.44, cloudScale: 1.0, stars: 0,
    fog: 0xa6dcff, fogNear: 260, fogFar: 1300, sunLight: 0xfff0d2, sunIntensity: 3.3, hemiSky: 0xbfe0ff, hemiGround: 0x7d9a5c, hemiIntensity: 0.95, exposure: 1.0, envIntensity: 0.75,
  },
  golden: {
    zenith: 0x3b6fd6, horizon: 0xffc98f, ground: 0xffe0b8, sun: 0xffd9a0, sunDir: [0.62, 0.36, 0.5],
    cloud: 0xfff0dc, cloudShade: 0xe59a86, cloudCover: 0.5, cloudScale: 1.1, stars: 0,
    fog: 0xffd9b0, fogNear: 120, fogFar: 820, sunLight: 0xffd6a3, sunIntensity: 3.4, hemiSky: 0xbfd6ff, hemiGround: 0xa9825a, hemiIntensity: 1.1, exposure: 1.0,
  },
  dusk: {
    zenith: 0x1b1f5c, horizon: 0xff7e6b, ground: 0xffb199, sun: 0xffb37a, sunDir: [-0.6, 0.2, 0.5],
    cloud: 0xffc2b0, cloudShade: 0x6a4a8a, cloudCover: 0.42, cloudScale: 1.2, stars: 0.35,
    fog: 0xd9838a, fogNear: 100, fogFar: 760, sunLight: 0xffb58a, sunIntensity: 2.8, hemiSky: 0x8f8fe0, hemiGround: 0x7a5a6a, hemiIntensity: 1.1, exposure: 1.05,
  },
  night: {
    zenith: 0x05071c, horizon: 0x2a2f7a, ground: 0x1a1c44, sun: 0xcfd8ff, sunDir: [0.3, 0.6, -0.5],
    cloud: 0x3a3f8a, cloudShade: 0x14173a, cloudCover: 0.3, cloudScale: 1.3, stars: 1,
    fog: 0x1c1f55, fogNear: 90, fogFar: 700, sunLight: 0xaab8ff, sunIntensity: 1.5, hemiSky: 0x5a66d6, hemiGround: 0x2a2440, hemiIntensity: 1.3, exposure: 1.1,
  },
  mars: {
    zenith: 0x9a5a3c, horizon: 0xf2b98a, ground: 0xf7cfa3, sun: 0xfff0e0, sunDir: [0.5, 0.5, 0.4],
    cloud: 0xf7d2b0, cloudShade: 0xc98a66, cloudCover: 0.25, cloudScale: 1.6, stars: 0.1,
    fog: 0xeaa87c, fogNear: 110, fogFar: 780, sunLight: 0xffe2c4, sunIntensity: 3.0, hemiSky: 0xffc9a0, hemiGround: 0x9a5236, hemiIntensity: 1.2, exposure: 1.0,
  },
  space: {
    zenith: 0x02030c, horizon: 0x1a0f4a, ground: 0x0a0624, sun: 0xffffff, sunDir: [0.4, 0.55, 0.4],
    cloud: 0x4a2f9a, cloudShade: 0x1a0f4a, cloudCover: 0.22, cloudScale: 2.2, stars: 1,
    fog: 0x0c0830, fogNear: 200, fogFar: 1400, sunLight: 0xdfe6ff, sunIntensity: 2.2, hemiSky: 0x7a66ff, hemiGround: 0xff5cc8, hemiIntensity: 1.2, exposure: 1.1,
  },
};

const skyVert = /* glsl */`
  varying vec3 vDir;
  void main() {
    vDir = normalize(position);
    vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    gl_Position = p.xyww;
  }`;

const skyFrag = /* glsl */`
  precision highp float;
  varying vec3 vDir;
  uniform vec3 uZenith, uHorizon, uGround, uSun, uSunDir, uCloud, uCloudShade;
  uniform float uTime, uCover, uScale, uStars, uCloudsOn, uGain;
  uniform sampler2D uPano; uniform float uPanoOn, uPanoTop, uPanoBottom, uPanoRot;

  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float noise(vec2 p) {
    vec2 i = floor(p), f = fract(p); vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1, 0)), u.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), u.x), u.y);
  }
  float fbm(vec2 p) { float a = 0.5, s = 0.0; for (int i = 0; i < 5; i++) { s += a * noise(p); p = p * 2.03 + 11.7; a *= 0.5; } return s; }

  void main() {
    vec3 d = normalize(vDir);
    float h = d.y;
    // gradient: ground haze -> horizon -> zenith
    vec3 col = mix(uHorizon, uZenith, pow(smoothstep(0.0, 1.0, max(h, 0.0)), 0.55));
    col = mix(col, uGround, smoothstep(0.0, -0.25, h));
    // sun disc and glow
    float sd = max(dot(d, normalize(uSunDir)), 0.0);
    col += uSun * (pow(sd, 350.0) * 3.0 + pow(sd, 24.0) * 0.22 + pow(sd, 4.0) * 0.08);
    // stars
    if (uStars > 0.0 && h > 0.0) {
      vec2 sp = d.xz / (0.35 + h) * 90.0;
      float st = step(0.9965, hash(floor(sp))) * (0.5 + 0.5 * sin(uTime * 2.0 + hash(floor(sp) + 3.0) * 30.0));
      col += vec3(st) * uStars * smoothstep(0.02, 0.3, h);
    }
    // clouds: projected onto a plane above the viewer, puffy thresholded noise with a lit top
    if (uCloudsOn > 0.5 && h > 0.015) {
      vec2 cp = d.xz / (h + 0.12) * 1.15 * uScale + vec2(uTime * 0.006, uTime * 0.002);
      float n = fbm(cp);
      float n2 = fbm(cp + vec2(0.06, 0.04) * normalize(uSunDir.xz + 0.001));
      float edge = 1.0 - uCover;
      float m = smoothstep(edge, edge + 0.09, n);
      float lit = clamp((n - n2) * 9.0 + 0.62, 0.0, 1.0);
      vec3 cc = mix(uCloudShade, uCloud, lit);
      cc += uSun * pow(sd, 6.0) * 0.25;
      float fade = smoothstep(0.015, 0.16, h);
      col = mix(col, cc, m * fade * 0.96);
    }
    // optional painted panorama band around the horizon
    if (uPanoOn > 0.5) {
      float ang = atan(d.x, d.z) / 6.28318530718 + uPanoRot;
      float el = asin(clamp(h, -1.0, 1.0));
      float v = (el - uPanoBottom) / (uPanoTop - uPanoBottom);
      if (v > 0.0 && v < 1.0) {
        // mirror-tile horizontally so the seam never shows
        float u = fract(ang * 2.0); u = u > 0.5 ? (1.0 - u) * 2.0 : u * 2.0;
        vec4 p = texture2D(uPano, vec2(u, v));
        float a = smoothstep(1.0, 0.62, v) * smoothstep(0.0, 0.04, v);
        col = mix(col, p.rgb, a * p.a);
      }
    }
    gl_FragColor = vec4(col * uGain, 1.0);
  }`;

export class Sky {
  constructor(preset = 'day', overrides = {}) {
    this.p = { ...SKY_PRESETS[typeof preset === 'string' ? preset : 'day'], ...(typeof preset === 'object' ? preset : {}), ...overrides };
    const p = this.p;
    this.uniforms = {
      uZenith: { value: new THREE.Color(p.zenith) }, uHorizon: { value: new THREE.Color(p.horizon) }, uGround: { value: new THREE.Color(p.ground) },
      uSun: { value: new THREE.Color(p.sun) }, uSunDir: { value: new THREE.Vector3(...p.sunDir).normalize() },
      uCloud: { value: new THREE.Color(p.cloud) }, uCloudShade: { value: new THREE.Color(p.cloudShade) },
      uTime: { value: 0 }, uGain: { value: 1 }, uCover: { value: p.cloudCover }, uScale: { value: p.cloudScale }, uStars: { value: p.stars }, uCloudsOn: { value: 1 },
      uPano: { value: null }, uPanoOn: { value: 0 }, uPanoTop: { value: 0.6 }, uPanoBottom: { value: -0.12 }, uPanoRot: { value: 0 },
    };
    const mat = new THREE.ShaderMaterial({ uniforms: this.uniforms, vertexShader: skyVert, fragmentShader: skyFrag, side: THREE.BackSide, depthWrite: false, depthTest: true, fog: false, toneMapped: true });
    this.mesh = new THREE.Mesh(new THREE.SphereGeometry(1, 48, 24), mat);
    this.mesh.frustumCulled = false; this.mesh.renderOrder = -1000; this.mesh.name = 'sky';
    this.mesh.onBeforeRender = (r, s, cam) => { this.mesh.position.copy(cam.getWorldPosition(_v)); };
    this.sunDir = this.uniforms.uSunDir.value;
  }
  setPanorama(tex, { top = 0.55, bottom = -0.1, rot = 0 } = {}) {
    tex.colorSpace = THREE.SRGBColorSpace; tex.wrapS = THREE.RepeatWrapping; tex.wrapT = THREE.ClampToEdgeWrapping;
    this.uniforms.uPano.value = tex; this.uniforms.uPanoOn.value = 1; this.uniforms.uPanoTop.value = top; this.uniforms.uPanoBottom.value = bottom; this.uniforms.uPanoRot.value = rot;
  }
  update(time) { this.uniforms.uTime.value = time; }
  /** Bake a blurred environment map from this sky for image-based lighting. */
  bakeEnvironment(renderer) {
    const scene = new THREE.Scene();
    const m = new THREE.Mesh(this.mesh.geometry, this.mesh.material);
    m.scale.setScalar(50); scene.add(m);
    const pmrem = new THREE.PMREMGenerator(renderer);
    const rt = pmrem.fromScene(scene, 0.035, 0.1, 200);
    pmrem.dispose();
    return rt.texture;
  }
}
const _v = new THREE.Vector3();
