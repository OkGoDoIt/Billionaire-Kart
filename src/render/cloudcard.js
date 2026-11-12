/* A measured sky for the whole dome. A grid of clear-sky colors and a grid of
   cloud cover, both taken from a reference picture, describe the part of the sky
   that picture shows; the same colors and the same kind of cloud are continued
   all the way round, so the sky has no edge. It is baked once into two textures:
   a sharp one for the picture's own part of the sky, and a panorama for the rest.
   The sky shader shows them by direction (see Sky.setDome), so from the
   reference viewpoint the sky lines up with the picture, and from anywhere else
   it is simply the sky. The clouds are generated from the cover grid and from
   noise; nothing of the picture itself is used. */
import * as THREE from 'three';
import { FullScreenQuad } from 'three/addons/postprocessing/Pass.js';

const SHADE = /* glsl */`
  precision highp float;
  uniform sampler2D uCover, uSky; uniform vec2 uTan, uCoverSize, uSkySize; uniform float uCoverRows;
  // the renderer's neutral tone curve, so its effect can be undone: what is baked is the color that comes out as the one wanted
  vec3 neutral(vec3 color) {
    float x = min(color.r, min(color.g, color.b)); float offset = x < 0.08 ? x - 6.25 * x * x : 0.04; color -= offset;
    float peak = max(color.r, max(color.g, color.b)); if (peak < 0.76) return color;
    float d = 0.24, newPeak = 1.0 - d * d / (peak + d - 0.76); color *= newPeak / peak;
    float g = 1.0 - 1.0 / (0.15 * (peak - newPeak) + 1.0); return mix(color, vec3(newPeak), g);
  }
  vec3 unNeutral(vec3 want) { vec3 c = want; for (int i = 0; i < 7; i++) c *= want / max(neutral(c), vec3(1e-4)); return c; }
  // noise on the direction itself, so it has no seam anywhere on the dome; K turns a direction into picture-pixel units
  const float K = 1484.0;
  float hash3(vec3 p) { p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
  float noise3(vec3 x) {
    vec3 i = floor(x), f = fract(x); f = f * f * (3.0 - 2.0 * f);
    return mix(mix(mix(hash3(i), hash3(i + vec3(1, 0, 0)), f.x), mix(hash3(i + vec3(0, 1, 0)), hash3(i + vec3(1, 1, 0)), f.x), f.y),
               mix(mix(hash3(i + vec3(0, 0, 1)), hash3(i + vec3(1, 0, 1)), f.x), mix(hash3(i + vec3(0, 1, 1)), hash3(i + vec3(1, 1, 1)), f.x), f.y), f.z);
  }
  float fbm3(vec3 p) { float a = 0.5, s = 0.0; for (int i = 0; i < 5; i++) { s += a * noise3(p); p = p * 2.03 + 11.7; a *= 0.5; } return s; }
  // where a direction falls in the reference picture (the viewer looks along +x; 1920 x 1080, y down)
  vec2 pic(vec3 d) { return vec2(960.0 + (d.z / d.x) / (2.0 * uTan.x) * 1920.0, 540.0 - (d.y / d.x) / (2.0 * uTan.y) * 1080.0); }
  // 1 inside the picture's own patch of sky, fading out just beyond its sides and top
  float inFrame(vec3 d) {
    if (d.x < 0.25) return 0.0;
    vec2 p = pic(d); float o = max(max(-p.x, p.x - 1920.0), -p.y);
    return (1.0 - smoothstep(0.0, 170.0, o)) * smoothstep(0.25, 0.45, d.x);
  }
  // cloud cover everywhere else: scattered cumulus on a plane overhead, plus a low band along the horizon, as in the picture
  float fillCover(vec3 d) {
    float up = max(d.y, 0.0);
    vec3 q = vec3(d.x, 0.0, d.z) / (up + 0.16);
    float puffs = smoothstep(0.50, 0.68, fbm3(q * 1.5 + 4.2)) * smoothstep(0.03, 0.14, up) * (1.0 - smoothstep(0.62, 0.92, up));
    float band = smoothstep(0.46, 0.62, fbm3(q * 0.55 + 9.1)) * (1.0 - smoothstep(0.02, 0.17, up)) * smoothstep(-0.02, 0.03, d.y);
    return clamp(max(puffs, band * 0.95), 0.0, 1.0);
  }
  float coverAt(vec3 d) {
    float w = inFrame(d), c = fillCover(d);
    if (w > 0.0) {
      vec3 P = d * K; vec2 p = pic(d) + (vec2(fbm3(P / 34.0), fbm3(P / 34.0 + 7.3)) - 0.5) * 16.0;   // a soft warp, so the grid's cells never show
      float m = p.y < uCoverRows ? texture2D(uCover, clamp(p / uCoverSize, 0.0, 1.0)).r : 0.0;
      c = mix(c, m, w);
    }
    return c;
  }
  // the cover, billowed: big lobes push the edge in and out, smaller ones scallop it, fine ones fray it
  float dens(vec3 d) {
    float c = coverAt(d), e = smoothstep(0.02, 0.28, c) * (1.0 - 0.45 * smoothstep(0.55, 1.0, c)); vec3 P = d * K;
    float lobes = abs(fbm3(P / 58.0) - 0.5) * 2.0, scallop = abs(fbm3(P / 23.0 + 3.1) - 0.5) * 2.0, fray = fbm3(P / 8.0 + 9.7) - 0.5;
    return clamp(c + ((0.55 - lobes) * 0.5 + (0.5 - scallop) * 0.36 + fray * 0.2) * e, 0.0, 1.0);
  }
  // the clear sky: the picture's own colors inside its frame; beyond it, the same color columns carried on round the horizon
  vec3 clearSky(vec3 d) {
    float az = atan(d.z, d.x), el = asin(clamp(d.y, -1.0, 1.0));
    float rowFlat = 540.0 - tan(clamp(el, -1.2, 1.2)) / (2.0 * uTan.y) * 1080.0, row = rowFlat, col;
    if (abs(az) < 0.84) { vec2 p = pic(d); col = clamp(p.x, 0.0, 1920.0); row = mix(p.y, rowFlat, smoothstep(0.60, 0.84, abs(az))); }   // the frame itself reaches 0.575
    else col = mix(1920.0, 0.0, smoothstep(2.62, 3.67, az < 0.0 ? az + 6.28318530718 : az));      // the deep side meets the hazy side behind the viewer
    vec3 c = texture2D(uSky, vec2(col, max(row, 0.0)) / uSkySize).rgb;
    return mix(c, c * vec3(0.5, 0.72, 0.96), smoothstep(0.37, 1.15, el));                          // deeper toward the zenith
  }
  vec3 shade(vec3 d) {
    vec3 blue = clearSky(d);
    vec3 right = normalize(vec3(-d.z, 0.0, d.x) + 1e-5), dn = right * 6.0 - vec3(0.0, 8.0, 0.0), dw = right * 20.0 - vec3(0.0, 28.0, 0.0);
    float c0 = coverAt(d), dd = dens(d), soft = coverAt(normalize(d + (right * (fbm3(d * K / 12.0) - 0.5) + vec3(0.0, fbm3(d * K / 12.0 + 4.0) - 0.5, 0.0)) * 22.0 / K));
    float a = max(smoothstep(0.12, 0.5, dd), 0.62 * smoothstep(0.02, 0.5, soft));                  // a firm body inside a soft, frayed fringe
    // lit from the upper left, at two scales: the puffs, and the whole cloud
    float near = dens(normalize(d + dn / K)) - dd, wide = dens(normalize(d + dw / K)) - dd;
    float lit = 0.86 + near * 1.05 + wide * 0.95 + (fbm3(d * K / 15.0 + 2.0) - 0.5) * 0.22 * smoothstep(0.4, 0.9, dd);
    lit -= 0.26 * smoothstep(0.55, 1.0, c0) * smoothstep(0.05, 0.5, c0 - coverAt(normalize(d + (right * 8.0 - vec3(0.0, 40.0, 0.0)) / K)));   // the underside of a thick cloud is in its own shade
    vec3 cloud = mix(vec3(0.62, 0.72, 0.92), vec3(0.95, 0.955, 0.96), smoothstep(0.2, 0.98, lit));
    cloud = mix(cloud, mix(blue, vec3(0.95), 0.8), (1.0 - smoothstep(0.1, 0.45, dd)) * 0.7);       // thin edges and wisps take on the sky
    return unNeutral(clamp(mix(blue, cloud, a), 0.0, 0.95));
  }`;

/**
 * sky:   { cell: [w, h], colors: rows of sRGB hex strings } from the top of the picture.
 * cover: { cell, rows: strings of digits 0-9 } from the top of the picture.
 * Returns what Sky.setDome takes: { frame, frameRect, pano, el, tan, dispose }.
 */
export function bakeSkyDome(renderer, { sky, cover, fov = 40, aspect = 16 / 9, small = false }) {
  const tanV = Math.tan(fov * Math.PI / 360), tanH = tanV * aspect;
  const cw = cover.rows[0].length, ch = cover.rows.length, cdata = new Uint8Array(cw * ch);
  for (let j = 0; j < ch; j++) for (let i = 0; i < cw; i++) cdata[j * cw + i] = Math.round(Math.min(1, Math.max(0, (+cover.rows[j][i] - 1.2) / 7.6)) * 255);
  const coverTex = new THREE.DataTexture(cdata, cw, ch, THREE.RedFormat); coverTex.magFilter = coverTex.minFilter = THREE.LinearFilter; coverTex.needsUpdate = true;
  const sc = sky.colors[0].length, sr = sky.colors.length, sdata = new Uint8Array(sc * sr * 4);
  sky.colors.forEach((row, j) => row.forEach((hex, i) => { const n = parseInt(hex, 16), k = (j * sc + i) * 4; sdata[k] = n >> 16; sdata[k + 1] = (n >> 8) & 255; sdata[k + 2] = n & 255; sdata[k + 3] = 255; }));
  const skyTex = new THREE.DataTexture(sdata, sc, sr, THREE.RGBAFormat); skyTex.colorSpace = THREE.SRGBColorSpace; skyTex.magFilter = skyTex.minFilter = THREE.LinearFilter; skyTex.needsUpdate = true;
  const uniforms = { uCover: { value: coverTex }, uSky: { value: skyTex }, uTan: { value: new THREE.Vector2(tanH, tanV) }, uCoverSize: { value: new THREE.Vector2(cw * cover.cell, ch * cover.cell) }, uCoverRows: { value: ch * cover.cell }, uSkySize: { value: new THREE.Vector2(sc * sky.cell[0], sr * sky.cell[1]) } };
  const vertexShader = /* glsl */`varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`;
  const bake = (w, h, extra, main, opts = {}) => {
    const mat = new THREE.ShaderMaterial({ depthTest: false, depthWrite: false, uniforms: { ...uniforms, ...extra }, vertexShader, fragmentShader: SHADE + main });
    const rt = new THREE.WebGLRenderTarget(w, h, { depthBuffer: false, type: THREE.HalfFloatType, magFilter: THREE.LinearFilter, minFilter: THREE.LinearFilter, generateMipmaps: false, ...opts });
    const quad = new FullScreenQuad(mat), prev = renderer.getRenderTarget();
    renderer.setRenderTarget(rt); renderer.clear(); quad.render(renderer); renderer.setRenderTarget(prev);
    quad.dispose(); mat.dispose();
    return rt;
  };
  // the picture's own patch of sky, sharp: a little wider and taller than the frame, in the picture's pixels
  const frameRect = [-180, -280, 2100, 560];
  const frame = bake(small ? 2048 : 4096, small ? 756 : 1512, { uRect: { value: new THREE.Vector4(...frameRect) } }, /* glsl */`
    uniform vec4 uRect; varying vec2 vUv;
    void main() { vec2 p = vec2(mix(uRect.x, uRect.z, vUv.x), mix(uRect.w, uRect.y, vUv.y));
      gl_FragColor = vec4(shade(normalize(vec3(1.0, (540.0 - p.y) / 1080.0 * 2.0 * uTan.y, (p.x - 960.0) / 1920.0 * 2.0 * uTan.x))), 1.0); }`);
  // everything else: all the way round, from just under the horizon to well up the sky
  const el = [-3 * Math.PI / 180, 56 * Math.PI / 180];
  const pano = bake(small ? 2048 : 4096, small ? 330 : 660, { uEl: { value: new THREE.Vector2(...el) } }, /* glsl */`
    uniform vec2 uEl; varying vec2 vUv;
    void main() { float az = (vUv.x - 0.5) * 6.28318530718, e = mix(uEl.x, uEl.y, vUv.y);
      gl_FragColor = vec4(shade(vec3(cos(e) * cos(az), sin(e), cos(e) * sin(az))), 1.0); }`, { wrapS: THREE.RepeatWrapping });
  coverTex.dispose(); skyTex.dispose();
  return { frame: frame.texture, frameRect, pano: pano.texture, el, tan: [tanH, tanV], dispose: () => { frame.dispose(); pano.dispose(); } };
}

/** A flat silhouette of far hills on the same picture plane: skyline points in picture pixels, colored top to bottom. */
export function farHills({ points, eye, fov = 40, frame = [1920, 1080], distance = 1470, exposure = 1, top = 0x22469c, bottom = 0x5d7dc4, base = 600 }) {
  const mPerPx = 2 * distance * Math.tan(fov * Math.PI / 360) / frame[1], pos = [], col = [], idx = [];
  const a = new THREE.Color(top), b = new THREE.Color(bottom), g = 1 / exposure, peak = Math.min(...points.map(p => p[1]));
  points.forEach(([px, py], i) => {
    for (const y of [py, base]) {
      pos.push(distance, (frame[1] / 2 - y) * mPerPx, (px - frame[0] / 2) * mPerPx);
      const k = Math.min(1, (y - peak) / 70), c = a.clone().lerp(b, k); col.push((c.r + 0.04) * g, (c.g + 0.04) * g, (c.b + 0.04) * g);   // +0.04: the tone curve's toe
    }
    if (i) { const o = (i - 1) * 2; idx.push(o, o + 1, o + 2, o + 2, o + 1, o + 3); }
  });
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); geo.setIndex(idx);
  const mesh = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ vertexColors: true, fog: false, side: THREE.DoubleSide }));
  mesh.position.set(eye[0], eye[1], eye[2]); mesh.name = 'far-hills';
  return mesh;
}
