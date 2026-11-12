/* A measured sky on a card: a grid of clear-sky colors and a grid of cloud cover,
   both given in the pixel coordinates of a reference picture, baked once into a
   texture and hung far away so that a camera at the reference viewpoint sees the
   same sky. The clouds are generated from the cover grid (soft noise breaks up
   its cells and shades the puffs); nothing of the picture itself is used. */
import * as THREE from 'three';
import { FullScreenQuad } from 'three/addons/postprocessing/Pass.js';

const NEUTRAL = /* glsl */`
  // the renderer's neutral tone curve, so its effect can be undone: what is baked is the color that comes out as the one wanted
  vec3 neutral(vec3 color) {
    float x = min(color.r, min(color.g, color.b)); float offset = x < 0.08 ? x - 6.25 * x * x : 0.04; color -= offset;
    float peak = max(color.r, max(color.g, color.b)); if (peak < 0.76) return color;
    float d = 0.24, newPeak = 1.0 - d * d / (peak + d - 0.76); color *= newPeak / peak;
    float g = 1.0 - 1.0 / (0.15 * (peak - newPeak) + 1.0); return mix(color, vec3(newPeak), g);
  }
  vec3 unNeutral(vec3 want) { vec3 c = want; for (int i = 0; i < 7; i++) c *= want / max(neutral(c), vec3(1e-4)); return c; }`;

/**
 * sky:   { cell: [w, h], colors: rows of sRGB hex strings } from the top of the frame.
 * cover: { cell, rows: strings of digits 0-9 } from the top of the frame.
 * fill:  [x, y, rx, ry] ellipses of cloud outside the frame.
 * rect:  [x0, y0, x1, y1], the part of the picture plane the card covers (it reaches past the frame).
 */
export function skyCard(renderer, { sky, cover, fill = [], rect, eye, fov = 40, frame = [1920, 1080], distance = 1500, exposure = 1, width = 4096, height = 1216, zenith = 0x0a55e0 }) {
  const [x0, y0, x1, y1] = rect, CS = cover.cell, cols = Math.ceil((x1 - x0) / CS), rows = Math.ceil((y1 - y0) / CS);
  // cloud cover over the whole card: measured inside the frame, feathered just past its edges, filled with ellipses beyond
  const cw = cover.rows[0].length, chh = cover.rows.length, data = new Uint8Array(cols * rows);
  const meas = (i, j) => Math.min(1, Math.max(0, (+cover.rows[Math.min(chh - 1, Math.max(0, j))][Math.min(cw - 1, Math.max(0, i))] - 1.2) / 7.6));
  for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
    const px = x0 + (i + 0.5) * CS, py = y0 + (j + 0.5) * CS, ci = Math.floor(px / CS), cj = Math.floor(py / CS);
    const out = Math.max(0, -px, px - frame[0], -py), below = py > chh * CS;
    let d = below ? 0 : meas(ci, cj) * Math.max(0, 1 - out / 110);
    if (out > 0) for (const [ex, ey, rx, ry] of fill) { const qx = (px - ex) / rx, qy = (py - ey) / ry, q = 1 - qx * qx - qy * qy; if (q > 0) d = Math.max(d, Math.min(1, q * 1.5) * Math.min(1, out / 60)); }
    data[j * cols + i] = Math.round(d * 255);
  }
  const coverTex = new THREE.DataTexture(data, cols, rows, THREE.RedFormat); coverTex.magFilter = coverTex.minFilter = THREE.LinearFilter; coverTex.needsUpdate = true;
  const sc = sky.colors[0].length, sr = sky.colors.length, sdata = new Uint8Array(sc * sr * 4);
  sky.colors.forEach((row, j) => row.forEach((hex, i) => { const n = parseInt(hex, 16), k = (j * sc + i) * 4; sdata[k] = n >> 16; sdata[k + 1] = (n >> 8) & 255; sdata[k + 2] = n & 255; sdata[k + 3] = 255; }));
  const skyTex = new THREE.DataTexture(sdata, sc, sr, THREE.RGBAFormat); skyTex.colorSpace = THREE.SRGBColorSpace; skyTex.magFilter = skyTex.minFilter = THREE.LinearFilter; skyTex.needsUpdate = true;

  const mat = new THREE.ShaderMaterial({
    depthTest: false, depthWrite: false,
    uniforms: { uCover: { value: coverTex }, uSky: { value: skyTex }, uRect: { value: new THREE.Vector4(x0, y0, x1, y1) }, uSkySize: { value: new THREE.Vector2(sc * sky.cell[0], sr * sky.cell[1]) }, uZenith: { value: new THREE.Color(zenith) } },
    vertexShader: /* glsl */`varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`,
    fragmentShader: /* glsl */`
      precision highp float;
      uniform sampler2D uCover, uSky; uniform vec4 uRect; uniform vec2 uSkySize; uniform vec3 uZenith; varying vec2 vUv;
      float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float noise(vec2 p) { vec2 i = floor(p), f = fract(p), u = f * f * (3.0 - 2.0 * f); return mix(mix(hash(i), hash(i + vec2(1, 0)), u.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), u.x), u.y); }
      float fbm(vec2 p) { float a = 0.5, s = 0.0; for (int i = 0; i < 5; i++) { s += a * noise(p); p = p * 2.03 + 11.7; a *= 0.5; } return s; }
      ${NEUTRAL}
      float coverAt(vec2 p) {
        vec2 w = vec2(fbm(p / 34.0), fbm(p / 34.0 + 7.3)) - 0.5;                      // a soft warp, so the grid's cells never show
        return texture2D(uCover, (p + w * 16.0 - uRect.xy) / (uRect.zw - uRect.xy)).r;
      }
      // the measured cover, billowed: big lobes push the edge in and out, smaller ones scallop it, fine ones fray it
      float dens(vec2 p) {
        float c = coverAt(p), e = smoothstep(0.02, 0.28, c) * (1.0 - 0.45 * smoothstep(0.55, 1.0, c));
        float lobes = abs(fbm(p / 58.0) - 0.5) * 2.0, scallop = abs(fbm(p / 23.0 + 3.1) - 0.5) * 2.0, fray = fbm(p / 8.0 + 9.7) - 0.5;
        return clamp(c + ((0.55 - lobes) * 0.5 + (0.5 - scallop) * 0.36 + fray * 0.2) * e, 0.0, 1.0);
      }
      void main() {
        vec2 p = vec2(mix(uRect.x, uRect.z, vUv.x), mix(uRect.w, uRect.y, vUv.y));
        vec3 blue = texture2D(uSky, vec2(p.x, max(p.y, 0.0)) / uSkySize).rgb;
        blue = mix(blue, uZenith, smoothstep(0.0, -520.0, p.y) * 0.55);                // deeper above the top of the frame
        float d = dens(p), soft = coverAt(p + vec2(fbm(p / 12.0) - 0.5, fbm(p / 12.0 + 4.0) - 0.5) * 22.0);
        float a = max(smoothstep(0.12, 0.5, d), 0.62 * smoothstep(0.02, 0.5, soft));   // a firm body inside a soft, frayed fringe
        // lit from the upper left, at two scales: the puffs, and the whole cloud
        float near = dens(p + vec2(6.0, 8.0)) - d, wide = dens(p + vec2(20.0, 28.0)) - d;
        float lit = 0.86 + near * 1.05 + wide * 0.95 + (fbm(p / 15.0 + 2.0) - 0.5) * 0.22 * smoothstep(0.4, 0.9, d);
        // the underside of a thick cloud falls into its own shade
        lit -= 0.26 * smoothstep(0.55, 1.0, coverAt(p)) * smoothstep(0.05, 0.5, coverAt(p) - coverAt(p + vec2(8.0, 40.0)));
        vec3 cloud = mix(vec3(0.62, 0.72, 0.92), vec3(0.95, 0.955, 0.96), smoothstep(0.2, 0.98, lit));
        cloud = mix(cloud, mix(blue, vec3(0.95), 0.8), (1.0 - smoothstep(0.1, 0.45, d)) * 0.7);    // thin edges and wisps take on the sky
        vec3 want = mix(blue, cloud, a);
        float edge = smoothstep(uRect.x, uRect.x + 320.0, p.x) * (1.0 - smoothstep(uRect.z - 320.0, uRect.z, p.x)) * smoothstep(uRect.y, uRect.y + 260.0, p.y) * (1.0 - smoothstep(uRect.w - 26.0, uRect.w, p.y));
        gl_FragColor = vec4(unNeutral(clamp(want, 0.0, 0.95)), edge);
      }`,
  });
  const rt = new THREE.WebGLRenderTarget(width, height, { depthBuffer: false, type: THREE.HalfFloatType, generateMipmaps: true, minFilter: THREE.LinearMipmapLinearFilter, magFilter: THREE.LinearFilter });
  const quad = new FullScreenQuad(mat), prev = renderer.getRenderTarget();
  renderer.setRenderTarget(rt); renderer.clear(); quad.render(renderer); renderer.setRenderTarget(prev);
  quad.dispose(); mat.dispose(); coverTex.dispose(); skyTex.dispose();
  rt.texture.anisotropy = 4;

  const mPerPx = 2 * distance * Math.tan(fov * Math.PI / 360) / frame[1], g = 1 / exposure;
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry((x1 - x0) * mPerPx, (y1 - y0) * mPerPx), new THREE.MeshBasicMaterial({ map: rt.texture, transparent: true, depthWrite: false, fog: false, color: new THREE.Color(g, g, g) }));
  mesh.rotation.y = -Math.PI / 2;      // face west, picture-right toward +z
  mesh.position.set(eye[0] + distance, eye[1] + (frame[1] / 2 - (y0 + y1) / 2) * mPerPx, eye[2] + ((x0 + x1) / 2 - frame[0] / 2) * mPerPx);
  mesh.renderOrder = -900; mesh.name = 'sky-card';
  mesh.userData.dispose = () => { rt.dispose(); mesh.geometry.dispose(); mesh.material.dispose(); };
  return mesh;
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
