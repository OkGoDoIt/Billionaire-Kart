/* Props for Singularity Speedway: the Singularity (core, shells, accretion
   ring and disc, jets), server monoliths, floating chips, rings of light,
   viewing platforms, holo boards, the planet and its moons, data-stream cubes,
   and the laser gate obstacle.
   Each builder returns a THREE.Group (or Mesh). Nothing here touches the DOM at
   import time; canvas textures are only made when a builder runs. */
import * as THREE from 'three';
import { ModelBuilder, box, sphere, cyl, torus, cone, capsule, lathe, glow, plastic, MAT } from './build.js';
import { canvasTex } from '../render/textures.js';
import { makeRng, fbm } from '../core/util.js';

const hex = c => '#' + new THREE.Color(c).getHexString();

/** Generated art for this track (prompts in assets/tracks/singularity-speedway/prompts.md), loaded as image textures. */
const ART = 'assets/tracks/singularity-speedway/', rackTex = {};
function artTex(file, wrap) {
  const t = new THREE.TextureLoader().load(ART + file);
  t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = wrap; t.anisotropy = 8;
  return t;
}

/** Nothing to draw: for solid posts whose look is built elsewhere. */
export function hidden() { return new THREE.Group(); }

/* ---------- the Singularity ---------- */
const orbVert = /* glsl */`
  varying vec3 vN; varying vec3 vV; varying vec3 vP;
  void main() {
    vec4 wp = modelMatrix * vec4(position, 1.0);
    vN = normalize(mat3(modelMatrix) * normal); vV = normalize(cameraPosition - wp.xyz); vP = position;
    gl_Position = projectionMatrix * viewMatrix * wp;
  }`;

/** The core: a white-hot sphere with violet limbs and slowly churning bands. */
function coreMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uGain: { value: 2.4 }, uR: { value: 1 } },
    vertexShader: orbVert,
    fragmentShader: /* glsl */`
      uniform float uTime, uGain, uR; varying vec3 vN; varying vec3 vV; varying vec3 vP;
      void main() {
        float f = clamp(dot(normalize(vN), normalize(vV)), 0.0, 1.0);
        vec3 p = vP / uR;
        float a = atan(p.z, p.x);
        float bands = sin(p.y * 7.0 + sin(a * 3.0 + uTime * 0.5) * 1.6 + uTime * 0.9) * 0.5 + 0.5;
        float cells = sin(a * 9.0 - uTime * 0.7 + p.y * 4.0) * sin(p.y * 13.0 + uTime * 0.4) * 0.5 + 0.5;
        vec3 rim = vec3(1.0, 0.25, 0.72), mid = vec3(0.55, 0.42, 1.0), hot = vec3(1.0, 0.97, 1.0);
        vec3 c = mix(rim, mid, smoothstep(0.05, 0.55, f));
        c = mix(c, hot, smoothstep(0.62, 1.0, f));
        c *= 0.62 + 0.38 * bands + 0.18 * cells;
        gl_FragColor = vec4(c * uGain, 1.0);
      }`,
  });
}

/** A translucent shell that glows at its rim (additive, so it never hides what is behind it). */
function shellMaterial(color, power = 2.2, gain = 1.2) {
  return new THREE.ShaderMaterial({
    uniforms: { uColor: { value: new THREE.Color(color) }, uGain: { value: gain }, uPow: { value: power }, uTime: { value: 0 } },
    vertexShader: orbVert,
    fragmentShader: /* glsl */`
      uniform vec3 uColor; uniform float uGain, uPow, uTime; varying vec3 vN; varying vec3 vV; varying vec3 vP;
      void main() {
        float f = 1.0 - abs(dot(normalize(vN), normalize(vV)));
        float ripple = 0.85 + 0.15 * sin(vP.y * 0.25 + uTime * 1.3);
        float a = pow(f, uPow) * uGain * ripple;
        gl_FragColor = vec4(uColor * a, a);
      }`,
    transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.FrontSide,
  });
}

/** Flat annulus with a hot radial gradient and streaks that orbit (uTime). */
function discMaterial({ inner, outer, gain = 1.6, streaks = 22, hot = 0xfff4e0, mid = 0xff7a3c, cool = 0xff3db8, edge = 0x6a4cff, speed = 0.12 }) {
  return new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uIn: { value: inner }, uOut: { value: outer }, uGain: { value: gain }, uStreaks: { value: streaks }, uSpeed: { value: speed },
      uHot: { value: new THREE.Color(hot) }, uMid: { value: new THREE.Color(mid) }, uCool: { value: new THREE.Color(cool) }, uEdge: { value: new THREE.Color(edge) } },
    vertexShader: /* glsl */`varying vec2 vXY; void main() { vXY = position.xy; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: /* glsl */`
      uniform float uTime, uIn, uOut, uGain, uStreaks, uSpeed; uniform vec3 uHot, uMid, uCool, uEdge; varying vec2 vXY;
      float h(float n) { return fract(sin(n) * 43758.5453); }
      void main() {
        float r = length(vXY), t = clamp((r - uIn) / (uOut - uIn), 0.0, 1.0);
        float a = atan(vXY.y, vXY.x);
        // inner parts orbit faster, so the streaks wind into spirals
        float w = a + uTime * uSpeed * (1.6 - t) * 6.0 + t * 3.0;
        float s = sin(w * uStreaks) * 0.5 + 0.5, s2 = sin(w * uStreaks * 0.37 + 1.7) * 0.5 + 0.5;
        float ring = 0.65 + 0.35 * sin(t * 40.0 + h(floor(t * 12.0)) * 6.0);
        vec3 c = mix(uHot, uMid, smoothstep(0.0, 0.35, t));
        c = mix(c, uCool, smoothstep(0.3, 0.7, t));
        c = mix(c, uEdge, smoothstep(0.65, 1.0, t));
        float alpha = smoothstep(0.0, 0.06, t) * (1.0 - smoothstep(0.75, 1.0, t)) * (0.45 + 0.4 * s * s2 + 0.25 * ring);
        gl_FragColor = vec4(c * alpha * uGain, alpha);
      }`,
    transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide,
  });
}

/** The orb: core sphere, two shells, a tilted inner accretion ring, and two polar jets.
    userData.update(time) animates the pulse and the swirl. */
export function singularity({ r = 21, ringIn = 24.5, ringOut = 30, ringTilt = 0.32, jet = 260 } = {}) {
  const grp = new THREE.Group();
  const coreM = coreMaterial(); coreM.uniforms.uR.value = r;
  const core = new THREE.Mesh(new THREE.SphereGeometry(r, 64, 48), coreM); grp.add(core);
  const s1 = shellMaterial(0x8a5cff, 3.0, 0.42), s2 = shellMaterial(0xff4fb8, 4.5, 0.3);
  const sh1 = new THREE.Mesh(new THREE.SphereGeometry(r * 1.16, 48, 32), s1); sh1.renderOrder = 3; grp.add(sh1);
  const sh2 = new THREE.Mesh(new THREE.SphereGeometry(r * 1.34, 48, 32), s2); sh2.renderOrder = 4; grp.add(sh2);
  // a geodesic lattice of thought around the core, with glowing nodes
  const lattice = new THREE.Group();
  const latM = new THREE.LineBasicMaterial({ transparent: true, opacity: 0.6, blending: THREE.AdditiveBlending, depthWrite: false }); latM.color.setRGB(0.9, 1.6, 2.2);
  const lines = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.IcosahedronGeometry(r * 1.07, 2)), latM); lines.renderOrder = 2; lattice.add(lines);
  const ico = new THREE.IcosahedronGeometry(r * 1.07, 1).toNonIndexed(), pos = ico.attributes.position, seen = new Set(), nodes = [];
  for (let k = 0; k < pos.count; k++) { const key = [pos.getX(k), pos.getY(k), pos.getZ(k)].map(v => v.toFixed(2)).join(); if (!seen.has(key)) { seen.add(key); nodes.push([pos.getX(k), pos.getY(k), pos.getZ(k)]); } }
  const nodeMesh = new THREE.InstancedMesh(sphere(0.55, 10, 8), glow(0x9fe8ff, 4), nodes.length), _m4 = new THREE.Matrix4();
  nodes.forEach((n, k) => nodeMesh.setMatrixAt(k, _m4.makeTranslation(n[0], n[1], n[2])));
  lattice.add(nodeMesh); grp.add(lattice);
  // a wide soft halo, so the orb's light reaches into view even from right beside it
  const haloTex = canvasTex(256, 256, (g, w) => {
    const gr = g.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2);
    gr.addColorStop(0, 'rgba(255,240,255,1)'); gr.addColorStop(0.22, 'rgba(200,150,255,0.55)'); gr.addColorStop(0.5, 'rgba(150,80,255,0.18)'); gr.addColorStop(1, 'rgba(90,40,200,0)');
    g.fillStyle = gr; g.fillRect(0, 0, w, w);
  }, { repeat: false, mip: false });
  const haloM = new THREE.SpriteMaterial({ map: haloTex, transparent: true, opacity: 0.3, blending: THREE.AdditiveBlending, depthWrite: false, fog: false });
  const halo = new THREE.Sprite(haloM); halo.scale.setScalar(r * 5); halo.renderOrder = 7; grp.add(halo);
  // inner accretion ring
  const ringM = discMaterial({ inner: ringIn, outer: ringOut, gain: 2.2, streaks: 30, speed: 0.25 });
  const ring = new THREE.Mesh(new THREE.RingGeometry(ringIn, ringOut, 160, 4), ringM);
  const ringPivot = new THREE.Group(); ringPivot.rotation.set(-Math.PI / 2 + ringTilt, 0, 0.18); ringPivot.add(ring); ring.renderOrder = 5; grp.add(ringPivot);
  // relativistic jets out of the poles
  const jetM = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uColor: { value: new THREE.Color(0x9f8bff) } },
    vertexShader: /* glsl */`varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: /* glsl */`
      uniform float uTime; uniform vec3 uColor; varying vec2 vUv;
      void main() {
        float f = vUv.y;                                  // 1 at the orb, 0 at the far end
        float fade = f * f * smoothstep(1.0, 0.97, f);
        float knots = 0.6 + 0.4 * sin(f * 60.0 + uTime * 6.0);
        float a = fade * knots * 0.8;
        gl_FragColor = vec4(mix(uColor, vec3(1.0), 0.4 * f) * a * 1.8, a);
      }`,
    transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide,
  });
  const jets = [];
  for (const s of [1, -1]) {
    const g = new THREE.CylinderGeometry(r * 0.12, r * 0.42, jet, 20, 1, true); g.translate(0, -jet / 2, 0);   // narrow top (uv.y = 1) at the orb, wide end far out
    const m = new THREE.Mesh(g, jetM); m.rotation.x = s > 0 ? Math.PI : 0; m.position.y = s * r * 0.8; m.renderOrder = 6;
    const pivot = new THREE.Group(); pivot.add(m); pivot.rotation.z = 0.18; grp.add(pivot); jets.push(m);
  }
  grp.userData.update = (time) => {
    const pulse = 0.5 + 0.5 * Math.sin(time * 1.1);
    coreM.uniforms.uTime.value = time; coreM.uniforms.uGain.value = 1.55 + pulse * 0.45;
    core.scale.setScalar(1 + pulse * 0.025);
    s1.uniforms.uTime.value = time; s2.uniforms.uTime.value = time * 0.7;
    s1.uniforms.uGain.value = 0.34 + pulse * 0.2; sh2.scale.setScalar(1 + pulse * 0.04);
    ringM.uniforms.uTime.value = time; ring.rotation.z = time * 0.05;
    jetM.uniforms.uTime.value = time;
    haloM.opacity = 0.24 + 0.08 * pulse;
    lattice.rotation.y = time * 0.04; lattice.rotation.x = Math.sin(time * 0.05) * 0.2;
    latM.opacity = 0.45 + 0.25 * pulse;
  };
  return grp;
}

/** The Singularity's face: a curved glass visor with a different expression on each lap.
    Turn it with lookAt (its +Z is the middle of the face). userData.setMood('happy' | 'think' | 'evil'),
    userData.update(dt, time) blinks. Redraws its canvas only when the mood or the blink changes. */
export function chatFace(r = 21) {
  const W = 1024, H = 640, PHI = 2.25, THETA = 1.55;
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  const g = cv.getContext('2d'), tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
  const geo = new THREE.SphereGeometry(r * 1.045, 48, 32, Math.PI / 2 - PHI / 2, PHI, Math.PI / 2 - THETA / 2, THETA);
  const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, fog: false });
  const mesh = new THREE.Mesh(geo, mat); mesh.renderOrder = 9;
  const grp = new THREE.Group(); grp.add(mesh);
  // the cap spans PHI x THETA radians; draw in "face units" where the canvas middle is the middle of the face
  const X = u => W / 2 + u * W / 2, Y = v => H / 2 - v * H / 2;   // u, v in -1..1
  const pill = (cx, cy, w, h) => { g.beginPath(); g.roundRect(X(cx) - w / 2, Y(cy) - h / 2, w, h, Math.min(w, h) / 2); g.fill(); };
  let mood = 'happy', shut = false, key = '';
  const paint = () => {
    const k = mood + shut; if (k === key) return; key = k;
    g.clearRect(0, 0, W, H);
    // A dark glass visor silhouettes the expression against the hot core and its halo.
    const glass = g.createLinearGradient(0, 36, 0, H);
    glass.addColorStop(0, '#30285b'); glass.addColorStop(0.52, '#17142f'); glass.addColorStop(1, '#090d22');
    g.beginPath(); g.roundRect(18, 24, W - 36, H - 60, 172);
    g.fillStyle = glass; g.fill(); g.lineWidth = 16; g.strokeStyle = '#a4eeff'; g.stroke();
    const ink = mood === 'evil' ? '#ff8e96' : '#a7ffff';
    if (mood === 'evil') {
      // red eyes under angry brows, and a wide grin full of teeth
      for (const s of [-1, 1]) {
        g.fillStyle = ink; g.beginPath(); g.moveTo(X(s * 0.12), Y(0.36)); g.lineTo(X(s * 0.5), Y(0.5)); g.lineTo(X(s * 0.52), Y(0.4)); g.lineTo(X(s * 0.12), Y(0.27)); g.closePath(); g.fill();
        g.fillStyle = '#ff1a3a'; g.beginPath(); g.ellipse(X(s * 0.3), Y(0.16), 70, shut ? 10 : 58, 0, 0, 7); g.fill();
        g.fillStyle = '#ffe2e6'; g.beginPath(); g.ellipse(X(s * 0.3), Y(0.16), 22, shut ? 4 : 20, 0, 0, 7); g.fill();
      }
      g.fillStyle = ink; g.beginPath(); g.moveTo(X(-0.55), Y(-0.22)); g.quadraticCurveTo(X(0), Y(-0.62), X(0.55), Y(-0.22)); g.quadraticCurveTo(X(0), Y(-0.92), X(-0.55), Y(-0.22)); g.fill();
      g.fillStyle = '#ffffff'; for (let k = 0; k < 9; k++) { const u = -0.4 + k * 0.1, t = (u + 0.55) / 1.1, top = -0.22 - 0.8 * t * (1 - t) - 0.01; g.beginPath(); g.moveTo(X(u - 0.045), Y(top)); g.lineTo(X(u + 0.045), Y(top)); g.lineTo(X(u), Y(top - 0.09)); g.fill(); }
      return void (tex.needsUpdate = true);
    }
    g.fillStyle = '#f084ba'; for (const s of [-1, 1]) { g.beginPath(); g.ellipse(X(s * 0.6), Y(0.0), 80, 42, 0, 0, 7); g.fill(); }
    g.fillStyle = ink;
    const ey = mood === 'think' ? 0.38 : 0.3, ex = mood === 'think' ? 0.07 : 0;
    for (const s of [-1, 1]) {
      if (shut) { g.lineWidth = 30; g.strokeStyle = ink; g.lineCap = 'round'; g.beginPath(); g.arc(X(s * 0.39 + ex), Y(ey) + 30, 64, Math.PI * 1.15, Math.PI * 1.85); g.stroke(); }
      else { pill(s * 0.39 + ex, ey, 196, 205);
        g.fillStyle = '#1d2250'; pill(s * 0.39 + ex, ey - 0.005, 82, 114);
        g.fillStyle = '#ffffff'; g.beginPath(); g.arc(X(s * 0.39 + ex) - 22, Y(ey) - 43, 18, 0, 7); g.fill(); g.fillStyle = ink; }
    }
    g.lineWidth = 50; g.lineCap = 'round'; g.strokeStyle = ink; g.beginPath();
    if (mood === 'think') { g.moveTo(X(-0.16), Y(-0.3)); g.lineTo(X(0.2), Y(-0.26)); }
    else g.arc(X(0), Y(0.12), 250, Math.PI * 0.2, Math.PI * 0.8);
    g.stroke();
    tex.needsUpdate = true;
  };
  paint();
  let blinkT = 2.5;
  grp.userData.setMood = m => { mood = m; paint(); };
  grp.userData.update = dt => { blinkT -= dt; const s = blinkT < 0.14; if (s !== shut) { shut = s; paint(); } if (blinkT < 0) blinkT = 2.6 + Math.random() * 2.4; };
  return grp;
}

/** The hairpin's gravity well. A camera-facing accretion disk keeps the horizon and its bright ring legible from both sides of the turn. */
export function gravityWell() {
  const mat = new THREE.ShaderMaterial({
    uniforms: { time: { value: 0 } },
    transparent: true, depthWrite: false, fog: false,
    vertexShader: `varying vec2 vUv;
      void main() {
        vUv = uv;
        vec4 center = modelViewMatrix * vec4(0., 0., 0., 1.);
        center.xy += position.xy;
        gl_Position = projectionMatrix * center;
      }`,
    fragmentShader: `uniform float time; varying vec2 vUv;
      void main() {
        vec2 p = (vUv - .5) * 2.;
        p.y += p.x * .13;
        float r = length(p * vec2(2.25, 1.35));
        float disk = length(vec2(p.x, p.y * 4.8));
        float orbit = atan(p.y * 4.8, p.x);
        float streak = .72 + .28 * sin(orbit * 7. - time * 2. + disk * 25.);
        float lens = exp(-16. * abs(r - .67));
        float corona = exp(-5. * abs(r - .74));
        float belt = smoothstep(.25, .38, disk) * (1. - smoothstep(.66, .94, disk));
        belt *= streak * (.54 + .46 * cos(disk * 73. - time));
        float shadow = 1. - smoothstep(.56, .61, r);
        if (p.y > .0) belt *= 1. - shadow;
        vec3 rgb = vec3(.018, .012, .043) + corona * vec3(.42, .08, .19)
          + lens * vec3(1., .48, .12) + belt * vec3(1.7, .75, .26);
        float alpha = max(shadow, max(corona * .82, min(1., lens + belt * 2.)));
        gl_FragColor = vec4(rgb, alpha);
        #include <colorspace_fragment>
      }`,
  });
  const well = new THREE.Mesh(new THREE.PlaneGeometry(43, 27), mat);
  well.frustumCulled = false;
  well.userData.update = time => { mat.uniforms.time.value = time; };
  return well;
}

/** A Dyson swarm under construction around a small star: the AI's next data center. Not fogged.
    userData.setBuilt(f) closes the shell (0..1: the fraction of panels in place), userData.update(time) turns it. */
export function dysonSphere({ R = 240, panels = 460, fill = 0.62, text = 'MINIMUM VIABLE COMPUTE' } = {}) {
  const grp = new THREE.Group(), rng = makeRng(23);
  // the star
  const starM = new THREE.MeshBasicMaterial({ color: 0xfff1c8, fog: false });
  const star = new THREE.Mesh(new THREE.SphereGeometry(R * 0.62, 40, 28), starM); grp.add(star);
  const haloTex = canvasTex(256, 256, (g, w) => { const gr = g.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2); gr.addColorStop(0, 'rgba(255,240,200,1)'); gr.addColorStop(0.3, 'rgba(255,190,110,0.5)'); gr.addColorStop(0.65, 'rgba(255,110,90,0.12)'); gr.addColorStop(1, 'rgba(255,80,120,0)'); g.fillStyle = gr; g.fillRect(0, 0, w, w); }, { repeat: false, mip: false });
  const haloM = new THREE.SpriteMaterial({ map: haloTex, transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false, fog: false });
  const halo = new THREE.Sprite(haloM); halo.scale.setScalar(R * 4.2); halo.renderOrder = -1; grp.add(halo);
  // the panels: solar-and-server tiles on a Fibonacci sphere, each with a glowing frame
  const panelTex = artTex('panel.webp', THREE.ClampToEdgeWrapping);
  const pm = new THREE.MeshStandardMaterial({ map: panelTex, emissiveMap: panelTex, emissive: 0xffffff, emissiveIntensity: 1.1, roughness: 0.4, metalness: 0.5, side: THREE.DoubleSide }); pm.fog = false;
  const size = R * Math.sqrt(4 * Math.PI / panels) * fill;
  const im = new THREE.InstancedMesh(new THREE.CircleGeometry(size, 6), pm, panels); im.frustumCulled = false; grp.add(im);
  const list = [], up = new THREE.Vector3(0, 1, 0);
  for (let k = 0; k < panels; k++) {
    const yy = 1 - (k + 0.5) / panels * 2, rr = Math.sqrt(1 - yy * yy), a = k * 2.399963;
    const n = new THREE.Vector3(Math.cos(a) * rr, yy, Math.sin(a) * rr);
    const q = new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().lookAt(n, new THREE.Vector3(), up));
    // build order: bands from the equator out, with some scatter, so it closes like a construction site
    list.push({ p: n.clone().multiplyScalar(R), q, ord: Math.min(0.999, Math.abs(yy) * 0.75 + rng() * 0.3) });
  }
  const M = new THREE.Matrix4(), S = new THREE.Vector3();
  const setBuilt = f => {
    list.forEach((o, k) => { M.compose(o.p, o.q, S.setScalar(o.ord < f ? 1 : 0.0001)); im.setMatrixAt(k, M); });
    im.instanceMatrix.needsUpdate = true;
    const lit = Math.max(0.04, 1 - Math.max(0, f - 0.8) * 4.8);   // closed, the star is gone
    starM.color.setRGB(1, 0.945, 0.784).multiplyScalar(2.2 * lit); haloM.opacity = 0.85 * lit;
  };
  setBuilt(0.55);
  // construction rings and the name band round the equator
  const ringM = glow(0xff5cc8, 2.4); ringM.fog = false;
  const rings = [0.25, -0.5, 1.1].map((tilt, k) => { const m = new THREE.Mesh(new THREE.TorusGeometry(R * (1.18 + k * 0.08), R * 0.006, 6, 160), ringM); m.rotation.set(Math.PI / 2 + tilt, 0, k * 0.7); grp.add(m); return m; });
  const band = canvasTex(4096, 256, (g, w, h) => {
    g.fillStyle = '#12142b'; g.fillRect(0, 0, w, h); g.fillStyle = '#ffd23c'; g.fillRect(0, 10, w, 10); g.fillRect(0, h - 20, w, 10);
    let fs = 190; const font = () => { g.font = `${fs}px "Luckiest Guy", "Arial Black", sans-serif`; }; font();
    while (g.measureText(text).width > w * 0.42 && fs > 40) { fs -= 6; font(); }
    g.textAlign = 'center'; g.textBaseline = 'middle';
    for (let k = 0; k < 2; k++) { g.fillStyle = '#ffd23c'; g.fillText(text, w * (0.25 + k * 0.5), h / 2 + 8); g.fillStyle = '#ff5cc8'; g.beginPath(); g.arc(w * (0.5 + k * 0.5) - (k ? 30 : 0), h / 2, 22, 0, 7); g.fill(); }
  }, { repeat: true, aniso: 4 });
  const bm = new THREE.MeshBasicMaterial({ map: band, side: THREE.FrontSide, fog: false });
  const bandMesh = new THREE.Mesh(new THREE.CylinderGeometry(R * 1.06, R * 1.06, R * 0.24, 128, 1, true), bm); grp.add(bandMesh);
  grp.userData = { setBuilt, update: time => { im.rotation.y = time * 0.01; bandMesh.rotation.y = -time * 0.02; rings.forEach((r, k) => { r.rotation.z = time * 0.006 * (k + 1); }); } };
  return grp;
}

/** The great accretion disc: a vast thin annulus around the whole spiral. */
export function accretionDisc({ inner = 58, outer = 105 } = {}) {
  const m = discMaterial({ inner, outer, gain: 1.05, streaks: 14, speed: 0.06, hot: 0xffd2a0, mid: 0xff6a6a, cool: 0xc04cff, edge: 0x3a2aa0 });
  const mesh = new THREE.Mesh(new THREE.RingGeometry(inner, outer, 200, 6), m); mesh.renderOrder = 2;
  mesh.userData.update = time => { m.uniforms.uTime.value = time; };
  return mesh;
}

/* ---------- server monoliths ---------- */
/** A tall server slab, h metres tall: blade servers and status lights (generated art) on every face. */
export function monolith(v = 0, { h = 40, w = 10, d = 4 } = {}) {
  const rack = rackTex[v] || (rackTex[v] = (() => { const t = artTex('rack.webp', THREE.RepeatWrapping); t.repeat.set(1, 3); return t; })());
  const mat = new THREE.MeshStandardMaterial({ map: rack, emissiveMap: rack, emissive: [0xffffff, 0xffc4ec, 0xc4f6ff][v % 3], emissiveIntensity: 1.25, roughness: 0.35, metalness: 0.5 });
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  const grp = new THREE.Group(); grp.add(mesh);
  const b = new ModelBuilder();
  for (const y of [-h / 2, h / 2]) b.add('cap', box(w + 0.8, 0.8, d + 0.8, 0.2, 2), { p: [0, y, 0] });
  b.add('edge', box(0.25, h, 0.25, 0.05, 1), { p: [w / 2 + 0.05, 0, d / 2 + 0.05] });
  b.add('edge', box(0.25, h, 0.25, 0.05, 1), { p: [-w / 2 - 0.05, 0, d / 2 + 0.05] });
  grp.add(b.build({ cap: plastic(0x1a1d33, 0.4, 0.7), edge: glow([0x35e0ff, 0xff5cc8, 0x9dff7a][v % 3], 2.6) }, { cast: false }));
  return grp;
}

/* ---------- floating chips ---------- */
let chipTexCache = null;
function chipTextures() {
  if (chipTexCache) return chipTexCache;
  const rng = makeRng(77), traces = [];
  for (let i = 0; i < 70; i++) {
    let x = Math.round(rng() * 16) * 32, y = Math.round(rng() * 16) * 32; const pts = [[x, y]];
    for (let k = 0; k < 4; k++) { if (rng() < 0.5) x += (rng() < 0.5 ? -1 : 1) * 32 * (1 + Math.floor(rng() * 4)); else y += (rng() < 0.5 ? -1 : 1) * 32 * (1 + Math.floor(rng() * 4)); pts.push([x, y]); }
    traces.push({ pts, col: rng() < 0.6 ? '#35e0ff' : rng() < 0.5 ? '#ffd23c' : '#ff5cc8' });
  }
  const draw = emissive => (g, w, h) => {
    g.fillStyle = emissive ? '#000' : '#10161c'; g.fillRect(0, 0, w, h);
    g.lineCap = 'round'; g.lineJoin = 'round';
    for (const t of traces) {
      g.strokeStyle = emissive ? t.col : '#2d3a33'; g.lineWidth = emissive ? 4 : 7; g.beginPath();
      t.pts.forEach(([x, y], k) => (k ? g.lineTo(x, y) : g.moveTo(x, y))); g.stroke();
      const [ex, ey] = t.pts[t.pts.length - 1]; g.fillStyle = emissive ? t.col : '#c9a24a'; g.beginPath(); g.arc(ex, ey, 7, 0, 7); g.fill();
    }
    // the die in the middle
    g.fillStyle = emissive ? '#000' : '#1b1f2e'; g.fillRect(w * 0.3, h * 0.3, w * 0.4, h * 0.4);
    g.strokeStyle = emissive ? '#7a6bff' : '#3a4060'; g.lineWidth = 6; g.strokeRect(w * 0.3, h * 0.3, w * 0.4, h * 0.4);
    if (!emissive) { g.fillStyle = 'rgba(255,255,255,0.12)'; g.font = 'bold 34px "Arial Black", sans-serif'; g.textAlign = 'center'; g.fillText('Q-9000', w / 2, h / 2 + 12); }
  };
  chipTexCache = { map: canvasTex(512, 512, draw(false), { repeat: false, aniso: 8 }), emissive: canvasTex(512, 512, draw(true), { repeat: false, aniso: 8 }) };
  return chipTexCache;
}
/** A giant chip: a dark square board with glowing traces and gold pins on every side. */
export function chip({ size = 20 } = {}) {
  const t = chipTextures(), grp = new THREE.Group(), th = size * 0.07;
  const top = new THREE.MeshStandardMaterial({ map: t.map, emissiveMap: t.emissive, emissive: 0xffffff, emissiveIntensity: 2.4, roughness: 0.5, metalness: 0.3 });
  const side = plastic(0x161a24, 0.5, 0.4);
  const body = new THREE.Mesh(new THREE.BoxGeometry(size, th, size), [side, side, top, top, side, side]); grp.add(body);
  const b = new ModelBuilder(), n = 12, pitch = size / (n + 1);
  for (let s = 0; s < 4; s++) {
    const a = s * Math.PI / 2;
    for (let k = 1; k <= n; k++) {
      const u = -size / 2 + k * pitch, o = size / 2 + size * 0.04;
      b.add('pin', box(pitch * 0.42, th * 0.35, size * 0.1, 0.03, 1), { p: [Math.cos(a) * u - Math.sin(a) * o, -th * 0.1, Math.sin(a) * u + Math.cos(a) * o], r: [0, -a, 0] });
    }
  }
  grp.add(b.build({ pin: plastic(0xd9a93a, 0.25, 1) }, { cast: false }));
  return grp;
}

/* ---------- rings of light ---------- */
/** A glowing torus of radius R with a thinner bright inner band. Axis along +Z. */
export function lightRing(R = 17, tube = 1, { color = 0xff5cc8, inner = 0xffffff, intensity = 3 } = {}) {
  const b = new ModelBuilder();
  b.add('ring', torus(R, tube, 12, 96));
  b.add('band', torus(R - tube * 1.05, tube * 0.28, 6, 96));
  return b.build({ ring: glow(color, intensity), band: glow(inner, intensity) }, { cast: false });
}

/* ---------- viewing platforms ---------- */
/** A floating glowing disc for spectators. Returns { group, seats: [[x,y,z]...] } (seats on top). */
export function platform({ r = 7, seed = 1 } = {}) {
  const grp = new THREE.Group(), b = new ModelBuilder(), seats = [], rng = makeRng(seed);
  b.add('deck', cyl(r, r * 0.9, 0.7, 40), { p: [0, -0.35, 0] });
  b.add('under', cyl(r * 0.85, r * 0.3, 2.2, 32), { p: [0, -1.8, 0] });
  b.add('rim', torus(r + 0.05, 0.16, 6, 48), { p: [0, 0.02, 0], r: [Math.PI / 2, 0, 0] });
  b.add('rail', torus(r - 0.2, 0.07, 5, 48), { p: [0, 1.0, 0], r: [Math.PI / 2, 0, 0] });
  for (let k = 0; k < 16; k++) { const a = (k / 16) * Math.PI * 2; b.add('post', cyl(0.05, 0.05, 1.0, 5), { p: [Math.cos(a) * (r - 0.2), 0.5, Math.sin(a) * (r - 0.2)] }); }
  b.add('core', sphere(0.9, 14, 10), { p: [0, -3.1, 0] });
  grp.add(b.build({ deck: plastic(0x1d2038, 0.4, 0.5), under: plastic(0x2a2d4a, 0.5, 0.5), rim: glow(0x35e0ff, 3), rail: glow(0x7a6bff, 2), post: MAT.dark, core: glow(0xff5cc8, 3.5) }));
  for (let ring = 0; ring < 3; ring++) { const rr = r - 1.2 - ring * 1.5, n = Math.floor((2 * Math.PI * rr) / 1.05); for (let k = 0; k < n; k++) if (rng() < 0.85) { const a = (k / n) * Math.PI * 2 + ring * 0.3; seats.push([Math.cos(a) * rr, 0, Math.sin(a) * rr, -a + Math.PI / 2]); } }
  return { group: grp, seats };
}

/* ---------- holo boards ---------- */
/** A floating billboard: a slim frame with glowing edges, a bright panel, and a little thruster pod. */
export function holoBoard(map, { w = 16, h = 4, color = 0x7a6bff } = {}) {
  const grp = new THREE.Group(), b = new ModelBuilder();
  b.add('frame', box(w + 0.8, h + 0.8, 0.5, 0.15, 2), { p: [0, 0, -0.3] });
  for (const y of [h / 2 + 0.42, -h / 2 - 0.42]) b.add('edge', box(w + 0.9, 0.16, 0.6, 0.05, 1), { p: [0, y, -0.25] });
  b.add('pod', cyl(0.9, 0.5, 1.4, 16), { p: [0, -h / 2 - 1.2, -0.3] });
  b.add('jet', sphere(0.45, 12, 8), { p: [0, -h / 2 - 2.0, -0.3] });
  grp.add(b.build({ frame: plastic(0x14162a, 0.4, 0.5), edge: glow(color, 3), pod: MAT.dark, jet: glow(0x35e0ff, 4) }));
  const panel = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map, emissiveMap: map, emissive: 0xffffff, emissiveIntensity: 0.9, roughness: 0.5 }));
  panel.position.z = 0.0; grp.add(panel);
  const back = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map, emissiveMap: map, emissive: 0xffffff, emissiveIntensity: 0.9, roughness: 0.5 }));
  back.position.z = -0.6; back.rotation.y = Math.PI; grp.add(back);
  return grp;
}

/* ---------- planet and moons ---------- */
/** A distant blue-green world with clouds and a soft atmosphere. Not fogged. */
export function planet({ r = 380 } = {}) {
  const grp = new THREE.Group();
  const tex = canvasTex(1024, 512, (g, w, h) => {
    const img = g.createImageData(w, h), d = img.data;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const u = x / w, v = y / h, lon = u * Math.PI * 2, lat = (v - 0.5) * Math.PI;
      const px = Math.cos(lat) * Math.cos(lon), pz = Math.cos(lat) * Math.sin(lon), py = Math.sin(lat);
      const n = fbm(px * 2.2 + 5, pz * 2.2 + py * 1.7, 5, 3);
      const cl = fbm(px * 4 + py * 2 + 11, pz * 4 - py, 4, 9);
      let c;
      if (n > 0.52) { const k = Math.min(1, (n - 0.52) * 5); c = [40 + k * 90, 150 + k * 40, 90 - k * 30]; }   // land: green to ochre
      else { const k = n / 0.52; c = [20 + k * 30, 80 + k * 90, 140 + k * 70]; }                                 // ocean: deep blue to teal
      if (Math.abs(py) > 0.86) c = [235, 245, 250];                                                             // ice caps
      const cloud = Math.max(0, (cl - 0.6) * 2.6); c = c.map(q => q + (250 - q) * Math.min(1, cloud));
      const k = (y * w + x) * 4; d[k] = c[0]; d[k + 1] = c[1]; d[k + 2] = c[2]; d[k + 3] = 255;
    }
    g.putImageData(img, 0, 0);
  }, { repeat: false, aniso: 4 });
  const m = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.85, metalness: 0, emissive: 0x0a1830, emissiveIntensity: 0.35 }); m.fog = false;
  grp.add(new THREE.Mesh(new THREE.SphereGeometry(r, 72, 48), m));
  const atm = shellMaterial(0x5fd8ff, 3.0, 0.7); atm.fog = false;
  const a = new THREE.Mesh(new THREE.SphereGeometry(r * 1.04, 64, 40), atm); a.renderOrder = 1; grp.add(a);
  // the paperclip conversion: grey wire spreading over the world from one spot, with a hot front. convert(f), f in 0..1
  const cv = tex.image, g = cv.getContext('2d'), W = cv.width, H = cv.height, orig = g.getImageData(0, 0, W, H);
  const clip = document.createElement('canvas'); clip.width = W; clip.height = H;
  { const c = clip.getContext('2d'); c.fillStyle = '#8a8f9c'; c.fillRect(0, 0, W, H); c.strokeStyle = '#c9ced8'; c.lineWidth = 2.2; c.lineCap = 'round';
    const rr = makeRng(5);
    for (let k = 0; k < 900; k++) { c.save(); c.translate(rr() * W, rr() * H); c.rotate(rr() * Math.PI); const L = 9 + rr() * 6, w = 3.2;
      c.beginPath(); c.moveTo(-L, -w); c.lineTo(L, -w); c.arc(L, 0, w, -Math.PI / 2, Math.PI / 2); c.lineTo(-L + 2, w); c.arc(-L + 2, 0, w * 0.6, Math.PI / 2, -Math.PI / 2, false); c.lineTo(L - 3, -w * 0.2); c.stroke(); c.restore(); }
    c.fillStyle = 'rgba(40,44,56,0.25)'; for (let k = 0; k < 2400; k++) c.fillRect(rr() * W, rr() * H, 2, 2); }
  const clipData = clip.getContext('2d').getImageData(0, 0, W, H).data;
  const seed = [Math.cos(0.4) * Math.cos(2.2), Math.sin(0.4), Math.cos(0.4) * Math.sin(2.2)];   // where it starts
  let shown = -1;
  grp.userData.convert = f => {
    if (Math.abs(f - shown) < 0.004) return; shown = f;
    const img = g.createImageData(W, H), d = img.data, o = orig.data, cosR = Math.cos(f * Math.PI * 1.02), front = 0.05;
    for (let y = 0; y < H; y++) {
      const lat = (y / H - 0.5) * Math.PI, cl = Math.cos(lat), sl = Math.sin(lat);
      for (let x = 0; x < W; x++) {
        const lon = x / W * Math.PI * 2, dot = cl * Math.cos(lon) * seed[0] + sl * seed[1] + cl * Math.sin(lon) * seed[2], k = (y * W + x) * 4;
        if (f <= 0 || dot < cosR - front) { d[k] = o[k]; d[k + 1] = o[k + 1]; d[k + 2] = o[k + 2]; }
        else if (dot < cosR) { const t = (cosR - dot) / front; d[k] = 255; d[k + 1] = 120 + 100 * t; d[k + 2] = 60 + 60 * t; }   // the front, glowing
        else { d[k] = clipData[k]; d[k + 1] = clipData[k + 1]; d[k + 2] = clipData[k + 2]; }
        d[k + 3] = 255;
      }
    }
    g.putImageData(img, 0, 0); tex.needsUpdate = true;
  };
  return grp;
}
/** A grey cratered moon. Not fogged. */
export function moon({ r = 60, seed = 1, tint = 0xb8b4c8 } = {}) {
  const tex = canvasTex(512, 256, (g, w, h) => {
    const rng = makeRng(seed); g.fillStyle = hex(tint); g.fillRect(0, 0, w, h);
    for (let i = 0; i < 160; i++) { const x = rng() * w, y = h * 0.1 + rng() * h * 0.8, rr = 2 + rng() * rng() * 22; g.fillStyle = `rgba(40,36,60,${0.12 + rng() * 0.2})`; g.beginPath(); g.ellipse(x, y, rr, rr * 0.8, 0, 0, 7); g.fill(); g.strokeStyle = 'rgba(255,255,255,0.15)'; g.lineWidth = 1.5; g.stroke(); }
  }, { repeat: false, aniso: 4 });
  const m = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.95, emissive: 0x15121f, emissiveIntensity: 0.5 }); m.fog = false;
  return new THREE.Mesh(new THREE.SphereGeometry(r, 48, 32), m);
}

/* ---------- data streams ---------- */
/** Geometry and material for one data-stream cube (instance it). */
export function dataCube(color = 0x35e0ff, size = 0.9) {
  return { geometry: box(size, size, size, size * 0.15, 1), material: glow(color, 2.4) };
}

/* ---------- obstacle: laser gate ---------- */
/** A small two-sided label texture (cached by text), for the obstacles' name plates. */
const plateCache = {};
function plateTex(lines, bg, fg) {
  const key = lines.join('|') + bg;
  return plateCache[key] || (plateCache[key] = canvasTex(256, 96, (g, w, h) => {
    g.fillStyle = bg; g.fillRect(0, 0, w, h); g.strokeStyle = fg; g.lineWidth = 6; g.strokeRect(3, 3, w - 6, h - 6);
    g.fillStyle = fg; g.textAlign = 'center'; g.textBaseline = 'middle';
    lines.forEach((l, k) => {
      let s = k ? 26 : 44; g.font = `${s}px "Arial Black", sans-serif`;
      const wide = g.measureText(l).width; if (wide > w - 22) { s = Math.floor(s * (w - 22) / wide); g.font = `${s}px "Arial Black", sans-serif`; }   // shrink to fit, never squash
      g.fillText(l, w / 2, lines.length > 1 ? (k ? h * 0.74 : h * 0.36) : h / 2);
    });
  }, { repeat: false, aniso: 4 }));
}
function plate(tex, w, h) {
  const grp = new THREE.Group(), m = new THREE.MeshStandardMaterial({ map: tex, emissiveMap: tex, emissive: 0xffffff, emissiveIntensity: 0.55, roughness: 0.6 });
  for (const s of [1, -1]) { const p = new THREE.Mesh(new THREE.PlaneGeometry(w, h), m); p.rotation.y = s > 0 ? 0 : Math.PI; p.position.z = s * 0.02; grp.add(p); }
  return grp;
}

/** Two emitter posts about 5 m apart with a beam between them, each post wearing a GUARDRAIL plate; userData.setActive toggles the beam. */
export function laserGate(label = ['GUARDRAIL', '(BETA)']) {
  const grp = new THREE.Group(), b = new ModelBuilder(), half = 2.6;
  for (const sx of [-1, 1]) {
    b.add('post', cyl(0.22, 0.32, 1.5, 10), { p: [sx * half, 0.75, 0] });
    b.add('post', box(0.9, 0.25, 0.9, 0.08, 2), { p: [sx * half, 0.12, 0] });
    b.add('lens', sphere(0.26, 12, 10), { p: [sx * half, 1.15, 0] });
    b.add('ring', torus(0.32, 0.05, 6, 16), { p: [sx * half, 1.5, 0], r: [Math.PI / 2, 0, 0] });
    b.add('post', cyl(0.05, 0.05, 0.5, 6), { p: [sx * half, 1.75, 0] });
    const pl = plate(plateTex(label, '#ffd23c', '#1a1d29'), 1.7, 0.64); pl.position.set(sx * half, 2.3, 0); grp.add(pl);
  }
  grp.add(b.build({ post: MAT.dark, lens: glow(0xff2a6a, 3), ring: glow(0xff5cc8, 2.5) }));
  const beamMat = new THREE.MeshBasicMaterial({ color: 0xff3a7a, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false });
  const coreMat = new THREE.MeshBasicMaterial({ color: 0xffd6e6, transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending, depthWrite: false });
  const beam = new THREE.Group();
  for (const y of [0.55, 1.15]) {
    const glowM = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, half * 2, 10, 1, true), beamMat); glowM.rotation.z = Math.PI / 2; glowM.position.y = y;
    const core = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, half * 2, 6, 1, true), coreMat); core.rotation.z = Math.PI / 2; core.position.y = y;
    beam.add(glowM, core);
  }
  grp.add(beam);
  grp.userData.setActive = (on, warn, t) => {
    beam.visible = on || (warn && Math.sin(t * 30) > 0);
    beam.scale.set(1, on ? 1 + Math.sin(t * 47) * 0.15 : 0.4, on ? 1 + Math.sin(t * 47) * 0.15 : 0.4);
  };
  return grp;
}

/* ---------- obstacle: an AI agent drone ---------- */
/** The sentinel drone, now an AI agent: a white quad with a name plate on a mast that says it is helping. */
export function agentDrone() {
  const grp = new THREE.Group(), b = new ModelBuilder();
  b.add('body', sphere(0.6, 14, 10), { p: [0, 1.5, 0], s: [1, 0.5, 1.2] });
  b.add('eye', sphere(0.2, 10, 8), { p: [0, 1.45, 0.62] });
  for (const [x, z] of [[1, 1], [-1, 1], [1, -1], [-1, -1]]) { b.add('arm', cyl(0.06, 0.06, 1.2, 6), { p: [x * 0.55, 1.55, z * 0.55], r: [Math.PI / 2, 0, x * z > 0 ? -Math.PI / 4 : Math.PI / 4] }); b.add('rotor', cyl(0.5, 0.5, 0.04, 14), { p: [x * 0.95, 1.7, z * 0.95] }); }
  b.add('arm', cyl(0.04, 0.04, 0.9, 5), { p: [0, 2.15, 0] });
  grp.add(b.build({ body: plastic(0xf4f4f0, 0.35), eye: glow(0x35e0ff, 3), arm: MAT.dark, rotor: new THREE.MeshStandardMaterial({ color: 0x9aa4b8, transparent: true, opacity: 0.45, roughness: 0.4, depthWrite: false }) }));
  const pl = plate(plateTex(['AI AGENT', "(I'M HELPING)"], '#ffffff', '#7a6bff'), 1.9, 0.72); pl.position.set(0, 2.85, 0); grp.add(pl);
  return grp;
}

/* ---------- the paperclip ---------- */
/** The outline of a gem clip, centred, one unit tall, in the XY plane. */
export function paperclipPoints(arcSeg = 10) {
  const pts = [];
  const line = (x0, y0, x1, y1, n = 4) => { for (let k = 0; k < n; k++) { const t = k / n; pts.push([x0 + (x1 - x0) * t, y0 + (y1 - y0) * t]); } };
  const arc = (cx, cy, r, a0, a1) => { for (let k = 0; k < arcSeg; k++) { const a = a0 + (a1 - a0) * k / arcSeg; pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]); } };
  line(0.15, 2.0, 0.15, 0.6);
  arc(-0.075, 0.6, 0.225, 0, -Math.PI);
  line(-0.3, 0.6, -0.3, 2.6, 6);
  arc(0.075, 2.6, 0.375, Math.PI, 0);
  line(0.45, 2.6, 0.45, 0.45, 6);
  arc(0, 0.45, 0.45, 0, -Math.PI);
  line(-0.45, 0.45, -0.45, 2.1); pts.push([-0.45, 2.1]);
  const H = 2.975;
  return pts.map(([x, y]) => new THREE.Vector3(x / H, (y - H / 2) / H, 0));
}
/** A paperclip `len` metres tall made of wire `radius` thick. */
export function paperclipGeometry(len = 1, radius = 0.03, tubular = 60, radial = 6) {
  const curve = new THREE.CatmullRomCurve3(paperclipPoints().map(p => p.multiplyScalar(len)), false, 'centripetal');
  return new THREE.TubeGeometry(curve, tubular, radius, radial, false);
}
export function clipMaterial(glowAmt = 0.35) {
  return new THREE.MeshStandardMaterial({ color: 0xdfe5f2, metalness: 0.75, roughness: 0.28, emissive: 0x8f9bd0, emissiveIntensity: glowAmt });
}

/* ---------- the paperclip factory ---------- */
let factoryTex = null;
function factoryTextures() {
  if (factoryTex) return factoryTex;
  const rng = makeRng(61), lit = [];
  for (let r = 0; r < 4; r++) for (let c = 0; c < 8; c++) lit.push(rng() < 0.82 ? (rng() < 0.75 ? '#ffb347' : '#ff5cc8') : null);
  const draw = emissive => (g, w, h) => {
    g.fillStyle = emissive ? '#000' : '#2b2742'; g.fillRect(0, 0, w, h);
    const cw = w / 8, ch = h / 4;
    for (let r = 0; r < 4; r++) for (let c = 0; c < 8; c++) {
      const col = lit[r * 8 + c];
      g.fillStyle = emissive ? (col || '#000') : (col ? '#5a4a3a' : '#1a1830');
      g.fillRect(c * cw + cw * 0.18, r * ch + ch * 0.22, cw * 0.64, ch * 0.5);
    }
    if (!emissive) { g.fillStyle = '#3a3558'; for (let c = 0; c <= 8; c++) g.fillRect(c * cw - 3, 0, 6, h); }
  };
  factoryTex = { map: canvasTex(512, 256, draw(false), { aniso: 4 }), emissive: canvasTex(512, 256, draw(true), { aniso: 4 }) };
  return factoryTex;
}
/** A city-sized paperclip plant on a floating island: a lit hall with a sawtooth roof, three stacks that
    spew paperclips, an intake funnel on the left that eats everything, and a giant paperclip on the roof.
    Front faces +Z. userData: { stacks: [[x,y,z]], mouth: [x,y,z], statue, front, hallTop }. */
export function paperclipFactory() {
  const grp = new THREE.Group(), b = new ModelBuilder();
  const HW = 150, HH = 48, HD = 70, HZ = -5;
  b.add('rock', cyl(100, 14, 70, 9), { p: [0, -37, HZ], s: [1, 1, 0.55] });
  b.add('deck', box(205, 5, 115, 1, 2), { p: [0, -2.5, HZ] });
  for (const s of [-1, 1]) { b.add('neon', box(207, 0.9, 0.9, 0.3, 1), { p: [0, 0.2, HZ + s * 58.5] }); b.add('neon', box(0.9, 0.9, 117, 0.3, 1), { p: [s * 103.5, 0.2, HZ] }); }
  for (let k = 0; k < 7; k++) b.add('roof', cyl(9, 9, HD - 2, 3), { p: [-63 + k * 21, HH + 4.5, HZ], r: [-Math.PI / 2, 0, 0] });
  const stacks = [];
  for (const x of [-58, -34, 56]) {
    b.add('stack', cyl(5.5, 7, 66, 16), { p: [x, HH + 33, HZ - 24] });
    for (const y of [HH + 50, HH + 60]) b.add('band', cyl(5.75, 5.75, 3.2, 16, true), { p: [x, y, HZ - 24] });
    b.add('stack', torus(5.6, 0.8, 6, 18), { p: [x, HH + 66, HZ - 24], r: [Math.PI / 2, 0, 0] });
    stacks.push([x, HH + 66, HZ - 24]);
  }
  b.add('ped', box(30, 6, 18, 1, 2), { p: [0, HH + 3, HZ + HD / 2 - 12] });
  b.add('neon', box(HW + 1, 0.8, 0.8, 0.2, 1), { p: [0, HH - 0.6, HZ + HD / 2 + 0.3] });
  // the intake funnel on the left wall, and its glowing mouth
  b.add('funnel', lathe([[8, 0], [10, 8], [18, 22], [30, 36]], 24), { p: [-HW / 2, 26, HZ], r: [0, 0, Math.PI / 2] });
  b.add('mouth', torus(30, 1.4, 8, 48), { p: [-HW / 2 - 36, 26, HZ], r: [0, Math.PI / 2, 0] });
  // pipes and tanks along the right wall
  for (let k = 0; k < 3; k++) b.add('stack', cyl(7, 7, 30, 16), { p: [HW / 2 + 9, 15, HZ - 20 + k * 18] });
  grp.add(b.build({
    rock: plastic(0x3a3150, 0.9), deck: plastic(0x24203a, 0.6, 0.3), neon: glow(0xff5cc8, 2.2), roof: plastic(0x47415e, 0.6, 0.3),
    stack: plastic(0x6a6680, 0.5, 0.4), band: glow(0xff3a6a, 1.6), ped: plastic(0x1d1a30, 0.4, 0.5),
    funnel: new THREE.MeshStandardMaterial({ color: 0x55506e, roughness: 0.5, metalness: 0.5, side: THREE.DoubleSide }), mouth: glow(0xffa024, 2.4),
  }, { cast: false }));
  const t = factoryTextures();
  const hallMat = new THREE.MeshStandardMaterial({ map: t.map, emissiveMap: t.emissive, emissive: 0xffffff, emissiveIntensity: 1.3, roughness: 0.6, metalness: 0.2 });
  t.map.repeat.set(5, 2); t.emissive.repeat.set(5, 2);
  const hall = new THREE.Mesh(new THREE.BoxGeometry(HW, HH, HD), hallMat); hall.position.set(0, HH / 2, HZ); grp.add(hall);
  const statue = new THREE.Mesh(paperclipGeometry(80, 2.4, 240, 14), clipMaterial(0.55));
  statue.position.set(0, HH + 6 + 40, HZ + HD / 2 - 12); grp.add(statue);
  grp.userData = { stacks, mouth: [-HW / 2 - 36, 26, HZ], statue, front: HZ + HD / 2, hallTop: HH, width: HW };
  return grp;
}

/* ---------- raw materials for the factory: big, simple, readable at 400 m ---------- */
export function junkTree() {
  const b = new ModelBuilder();
  b.add('bark', cyl(0.5, 0.7, 4, 7), { p: [0, 2, 0] });
  b.add('leaf', cone(3.2, 6, 9), { p: [0, 6.5, 0] }); b.add('leaf', cone(2.4, 4.5, 9), { p: [0, 9.2, 0] });
  return b.build({ bark: plastic(0x8a5a3a, 0.9), leaf: new THREE.MeshStandardMaterial({ color: 0x3fae4f, roughness: 0.8, emissive: 0x0f3a18, emissiveIntensity: 0.6 }) }, { cast: false });
}
export function junkCar() {
  const b = new ModelBuilder();
  b.add('paint', box(4.4, 1.1, 2, 0.3, 1), { p: [0, 0.9, 0] }); b.add('paint', box(2.4, 0.9, 1.8, 0.3, 1), { p: [-0.2, 1.8, 0] });
  b.add('glass', box(2.2, 0.6, 1.86, 0.2, 1), { p: [-0.2, 1.85, 0] });
  for (const [x, z] of [[1.4, 1], [-1.4, 1], [1.4, -1], [-1.4, -1]]) b.add('tyre', cyl(0.45, 0.45, 0.35, 10), { p: [x, 0.45, z], r: [Math.PI / 2, 0, 0] });
  return b.build({ paint: new THREE.MeshStandardMaterial({ color: 0xe23b3b, roughness: 0.4, emissive: 0x501010, emissiveIntensity: 0.6 }), glass: plastic(0x9fd8ff, 0.2, 0.3), tyre: MAT.rubber }, { cast: false });
}
export function junkHouse() {
  const b = new ModelBuilder();
  b.add('wall', box(5, 3.4, 4, 0.1, 1), { p: [0, 1.7, 0] });
  b.add('roof', cyl(3.3, 3.3, 5.4, 3), { p: [0, 4.0, 0], r: [-Math.PI / 2, 0, Math.PI / 2], s: [1, 1, 0.6] });
  b.add('door', box(0.9, 1.8, 0.1, 0.05, 1), { p: [0, 0.9, 2.02] });
  for (const x of [-1.6, 1.6]) b.add('win', box(0.9, 0.9, 0.1, 0.05, 1), { p: [x, 2.0, 2.02] });
  return b.build({ wall: new THREE.MeshStandardMaterial({ color: 0xf4ead8, roughness: 0.8, emissive: 0x403828, emissiveIntensity: 0.5 }), roof: plastic(0xb5452f, 0.7), door: plastic(0x5a3a2a, 0.8), win: glow(0xffd27a, 1.2) }, { cast: false });
}
export function junkStand() {
  const b = new ModelBuilder();
  for (let r = 0; r < 4; r++) b.add(r % 2 ? 'a' : 'b', box(8, 0.6, 1.3, 0.05, 1), { p: [0, 0.4 + r * 0.6, -r * 1.2] });
  b.add('wall', box(8.2, 3.6, 0.3, 0.05, 1), { p: [0, 1.8, -4.4] });
  b.add('roof', box(8.6, 0.25, 5.4, 0.05, 1), { p: [0, 4.1, -2.0], r: [0.12, 0, 0] });
  for (let k = 0; k < 18; k++) b.add('fan', new THREE.BoxGeometry(0.4, 0.4, 0.4), { p: [-3.6 + (k % 6) * 1.4, 1.05 + Math.floor(k / 6) * 0.6, -Math.floor(k / 6) * 1.2] });
  return b.build({ a: plastic(0xd9dde6, 0.8), b: plastic(0xc6ccd8, 0.8), wall: new THREE.MeshStandardMaterial({ color: 0x2f6bff, roughness: 0.6, emissive: 0x10245a, emissiveIntensity: 0.7 }), roof: plastic(0xf4f4f0, 0.5), fan: glow(0xffd23c, 0.9) }, { cast: false });
}

/* ---------- the crowd: robots ---------- */
/** One robot fan, arms up. Instance it over the platform seats with tints. */
export function robotFan() {
  const b = new ModelBuilder();
  const body = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.55, metalness: 0.3 }); body.userData.tintable = true;
  const bx = (w, h, d) => new THREE.BoxGeometry(w, h, d);   // plain boxes: there are hundreds of these fans
  b.add('body', bx(0.5, 0.56, 0.34), { p: [0, 0.4, 0] });
  b.add('metal', bx(0.12, 0.14, 0.12), { p: [0, 0.74, 0] });
  b.add('head', bx(0.48, 0.34, 0.38), { p: [0, 0.96, 0] });
  b.add('eye', bx(0.36, 0.08, 0.04), { p: [0, 0.99, 0.19] });
  b.add('metal', bx(0.03, 0.24, 0.03), { p: [0.12, 1.24, 0] });
  b.add('eye', bx(0.09, 0.09, 0.09), { p: [0.12, 1.37, 0] });
  for (const s of [1, -1]) b.add('metal', bx(0.09, 0.55, 0.09), { p: [s * 0.36, 0.86, 0], r: [0, 0, s * 0.45] });
  return b.build({ body, head: plastic(0xc9cfdc, 0.35, 0.6), metal: MAT.dark, eye: glow(0x35e0ff, 2.4) }, { cast: false });
}

/* ---------- the benchmark podium: everybody is first ---------- */
/** n equal podium blocks, each w wide and h tall, with a trophy on top. Front faces +Z; centred on x. */
export function podium({ n = 5, w = 7, h = 9, d = 7 } = {}) {
  const b = new ModelBuilder(), cup = lathe([[0, 0], [1.2, 0], [1.2, 0.3], [0.3, 0.5], [0.3, 1.4], [1.6, 2.0], [1.9, 3.6], [1.75, 3.6], [1.45, 2.2], [0, 2.1]], 16);
  for (let k = 0; k < n; k++) {
    const x = (k - (n - 1) / 2) * (w + 0.4);
    b.add('block', box(w, h, d, 0.3, 2), { p: [x, h / 2, 0] });
    b.add('trim', box(w + 0.3, 0.5, d + 0.3, 0.1, 1), { p: [x, h, 0] });
    b.add('gold', cup, { p: [x, h + 0.25, 0] });
    for (const s of [1, -1]) b.add('gold', torus(0.8, 0.18, 6, 12, Math.PI), { p: [x + s * 1.8, h + 3.0, 0], r: [0, 0, s > 0 ? -Math.PI / 2 : Math.PI / 2] });
  }
  b.add('base', box(n * (w + 0.4) + 3, 1.2, d + 3, 0.3, 2), { p: [0, -0.6, 0] });
  b.add('trim', box(n * (w + 0.4) + 3.2, 0.4, d + 3.2, 0.1, 1), { p: [0, -1.3, 0] });
  return b.build({ block: plastic(0xf4f4f8, 0.5), trim: glow(0x7a6bff, 2.0), gold: new THREE.MeshStandardMaterial({ color: 0xffc83a, metalness: 0.9, roughness: 0.25, emissive: 0x6a4a08, emissiveIntensity: 0.8 }), base: plastic(0x1d2038, 0.5, 0.4) }, { cast: false });
}

/* ---------- the seven-fingered hand ---------- */
/** A marble monument of a human hand with seven fingers, palm facing +Z, wrist at y = 0, about 60 m tall. */
export function sevenFingerHand() {
  const b = new ModelBuilder();
  b.add('stone', box(21, 22, 7, 3, 3), { p: [0, 20, 0] });
  b.add('stone', cyl(7.5, 8.5, 12, 18), { p: [0, 5, 0], s: [1.15, 1, 0.75] });
  const n = 7;
  for (let k = 0; k < n; k++) {
    const t = k / (n - 1), a = (t - 0.5) * 0.9, len = 16 + Math.sin(t * Math.PI) * 7, bx = -8.4 + t * 16.8;
    const dx = Math.sin(a), dy = Math.cos(a);
    b.add('stone', capsule(1.55, len, 4, 10), { p: [bx + dx * (len / 2 + 0.5), 30 + dy * (len / 2 + 0.5), 0.3], r: [0, 0, -a] });
    b.add('nail', box(1.7, 1.9, 0.5, 0.25, 1), { p: [bx + dx * (len + 1.6), 30 + dy * (len + 1.6), 1.3], r: [0, 0, -a] });
  }
  b.add('stone', capsule(1.8, 13, 4, 10), { p: [-14.5, 18, 1], r: [0, 0, 0.95] });
  b.add('plinth', box(30, 10, 22, 0.6, 2), { p: [0, -6, 0] });
  b.add('trim', box(31, 0.8, 23, 0.2, 1), { p: [0, -0.6, 0] });
  return b.build({
    stone: new THREE.MeshStandardMaterial({ color: 0xf1ecf6, roughness: 0.45, emissive: 0x9a94a8, emissiveIntensity: 0.75 }), nail: plastic(0xffc6dc, 0.3),
    plinth: plastic(0x1d1a30, 0.5, 0.4), trim: glow(0xffd23c, 1.8),
  }, { cast: false });
}

/* ---------- capabilities tower and the alignment office ---------- */
/** The alignment team's office: a bright, empty glass room with one office chair. Front faces +Z; floor at y = 0. */
export function alignmentOffice({ w = 16, h = 7, d = 10 } = {}) {
  const grp = new THREE.Group(), b = new ModelBuilder();
  b.add('slab', box(w + 1, 0.8, d + 1, 0.2, 1), { p: [0, -0.4, 0] });
  b.add('slab', box(w + 1, 0.6, d + 1, 0.2, 1), { p: [0, h + 0.3, 0] });
  b.add('floor', box(w, 0.1, d, 0.02, 1), { p: [0, 0.05, 0] });
  b.add('back', box(w, h, 0.2, 0.02, 1), { p: [0, h / 2, -d / 2 + 0.1] });
  for (const x of [-w / 2, w / 2]) for (const z of [-d / 2, d / 2]) b.add('frame', box(0.35, h, 0.35, 0.05, 1), { p: [x, h / 2, z] });
  b.add('light', box(w * 0.6, 0.08, 0.5, 0.02, 1), { p: [0, h - 0.1, 0] });
  // the chair, a little larger than life so it reads
  const C = 2.3, cx = 1.5, cz = 0.8;
  b.add('chair', box(0.9 * C, 0.14 * C, 0.85 * C, 0.05, 1), { p: [cx, 0.62 * C, cz] });
  b.add('chair', box(0.85 * C, 0.95 * C, 0.12 * C, 0.05, 1), { p: [cx, 1.15 * C, cz - 0.42 * C], r: [-0.12, 0, 0] });
  b.add('leg', cyl(0.05 * C, 0.05 * C, 0.5 * C, 6), { p: [cx, 0.33 * C, cz] });
  for (let k = 0; k < 5; k++) { const a = k * 1.2566; b.add('leg', box(0.5 * C, 0.05 * C, 0.07 * C, 0.01, 1), { p: [cx + Math.cos(a) * 0.25 * C, 0.06 * C, cz + Math.sin(a) * 0.25 * C], r: [0, -a, 0] }); }
  grp.add(b.build({ slab: plastic(0x2a2d4a, 0.5, 0.4), floor: glow(0xd8dcf0, 0.55), back: new THREE.MeshStandardMaterial({ color: 0xe8ebf4, roughness: 0.8, emissive: 0xc8ccdc, emissiveIntensity: 0.45 }), frame: plastic(0x1a1d29, 0.4, 0.6), light: glow(0xffffff, 1.6), chair: plastic(0x16181f, 0.5), leg: plastic(0x5a6070, 0.4, 0.7) }, { cast: false }));
  const glass = new THREE.MeshStandardMaterial({ color: 0xa8d8ff, transparent: true, opacity: 0.16, roughness: 0.05, metalness: 0.3, depthWrite: false, side: THREE.DoubleSide });
  for (const [x, z, ry, len] of [[0, d / 2, 0, w], [-w / 2, 0, Math.PI / 2, d], [w / 2, 0, Math.PI / 2, d]]) { const p = new THREE.Mesh(new THREE.PlaneGeometry(len, h), glass); p.position.set(x, h / 2, z); p.rotation.y = ry; grp.add(p); }
  return grp;
}

/* ---------- holo board frame (the panel itself comes from the track's sign atlas) ---------- */
export function holoFrame({ w = 16, h = 4, color = 0x7a6bff } = {}) {
  const b = new ModelBuilder();
  b.add('frame', box(w + 0.8, h + 0.8, 0.5, 0.15, 2), { p: [0, 0, -0.3] });
  for (const y of [h / 2 + 0.42, -h / 2 - 0.42]) b.add('edge', box(w + 0.9, 0.16, 0.6, 0.05, 1), { p: [0, y, -0.25] });
  b.add('pod', cyl(0.9, 0.5, 1.4, 16), { p: [0, -h / 2 - 1.2, -0.3] });
  b.add('jet', sphere(0.45, 12, 8), { p: [0, -h / 2 - 2.0, -0.3] });
  return b.build({ frame: plastic(0x14162a, 0.4, 0.5), edge: glow(color, 3), pod: MAT.dark, jet: glow(0x35e0ff, 4) }, { cast: false });
}
