/* Hair for the bobblehead drivers. Each style is a smooth shell with a broken
   hairline (it tucks into the scalp at its edge, so it never reads as a cap),
   shaped by displacement so it stays soft and round, plus a few rounded locks,
   curls, or tufts for silhouette. The whole style bakes into one vertex-coloured
   mesh: dark at the roots, lighter on top, and fading into the skin tone where it
   meets the painted face, so the hairline blends instead of stopping dead. */
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { makeRng, hashString } from '../core/util.js';

const PI = Math.PI;
const clamp01 = x => (x > 0 ? (x < 1 ? x : 1) : 0);
const sstep = x => { x = clamp01(x); return x * x * (3 - 2 * x); };
/* How far down the back of the head hair grows (polar angle from the crown). Karts are seen from behind
   for most of a race, so the nape has to be covered or the hair reads as a cap. */
const NAPE = PI * 0.74;

/* Scalp coordinates: a = yaw around the head (0 = the face, +π/2 = the head's +x side, π = the back),
   t = polar angle from the crown, k = radius as a multiple of the skull. */
function makeScalp(R, cy) {
  const P = (a, t, k = 1) => new THREE.Vector3(Math.sin(a) * Math.sin(t) * R * k, cy + Math.cos(t) * R * k * 1.07, Math.cos(a) * Math.sin(t) * R * k * 1.02);
  // straight down from a point on the head, for hair that hangs
  const drop = (a, k, y) => new THREE.Vector3(Math.sin(a) * R * k, y, Math.cos(a) * R * k * 1.02);
  return { P, drop, C: new THREE.Vector3(0, cy, 0), R };
}

/** Smooth isotropic lumps on the sphere (no seam or pole artefacts). */
function lumps(rng, amp, freq = 5, n = 6) {
  const terms = [];
  for (let i = 0; i < n; i++) {
    const u = new THREE.Vector3(rng() * 2 - 1, rng() * 2 - 1, rng() * 2 - 1).normalize();
    terms.push([u, freq * (0.7 + rng() * 0.6), rng() * 6.283, amp * (0.6 + rng() * 0.4)]);
  }
  return (a, t) => {
    const x = Math.sin(a) * Math.sin(t), y = Math.cos(t), z = Math.cos(a) * Math.sin(t);
    let s = 0; for (const [u, f, ph, A] of terms) s += A * Math.sin(f * (u.x * x + u.y * y + u.z * z) + ph);
    return s / Math.sqrt(n) * 1.4;
  };
}

/** Hairline that blends front (F), side (S), and back (B) polar angles by yaw. */
const hairline = (F, S, B, temples = 0) => a => {
  const c = Math.cos(a), base = c >= 0 ? S + (F - S) * Math.pow(c, 1.4) : S + (B - S) * Math.pow(-c, 1.2);
  return base - temples * Math.exp(-(((Math.abs(a) - 0.72) / 0.22) ** 2));
};
/** Pointed tufts hanging below a hairline: n per turn, within |a| < range of the front (range ≥ π: all round). */
const tufts = (n, depth, range = PI, phase = 0) => a => {
  const w = range >= PI ? 1 : Math.max(0, Math.cos(Math.min(PI / 2, Math.abs(a) / range * PI / 2)));
  return depth * Math.pow(0.5 + 0.5 * Math.cos(a * n + phase), 3) * w;
};
/** Soft, rounded scallops for the nape and sides (fading out toward the face). */
const soft = (n, depth) => a => depth * Math.pow(0.5 + 0.5 * Math.cos(a * n), 1.4) * sstep((0.55 - Math.cos(a)) / 0.7);
/** Gaussian bump around (a0, t0) in scalp coordinates. */
const bump = (a, t, a0, t0, sa, st) => { let da = a - a0; da = Math.atan2(Math.sin(da), Math.cos(da)); return Math.exp(-((da / sa) ** 2) - (((t - t0) / st) ** 2)); };

/** Attach the per-vertex base colour and skin blend that the final pass shades. */
function tag(g, col, blend) {
  const n = g.attributes.position.count, c = new Float32Array(n * 3), w = new Float32Array(n);
  for (let i = 0; i < n; i++) { c[i * 3] = col.r; c[i * 3 + 1] = col.g; c[i * 3 + 2] = col.b; w[i] = typeof blend === 'function' ? blend(i) : blend; }
  g.setAttribute('color', new THREE.BufferAttribute(c, 3));
  g.setAttribute('blend', new THREE.BufferAttribute(w, 1));
  return g;
}

/** The shell: rows run from top(a) down to edge(a); k(a, t) is the thickness. Returns geometry and its tuck weights. */
function shellGeo(S, { a0 = -PI, a1 = PI, top = () => 0, edge, k, rows = 16, cols = 56, tuck = 0.3, tuckTop = 0, endTaper = 0 }) {
  const pos = [], idx = [], wts = [];
  for (let i = 0; i <= rows; i++) for (let j = 0; j <= cols; j++) {
    const a = a0 + (a1 - a0) * j / cols, f = i / rows, u = j / cols;
    const t0 = top(a), t1 = edge(a), t = t0 + (t1 - t0) * f;
    let kk = k(a, t);
    if (!Number.isFinite(kk)) kk = 1.05;
    let m = sstep((f - (1 - tuck)) / tuck);
    if (tuckTop) m = Math.max(m, sstep((tuckTop - f) / tuckTop));
    if (endTaper) m = Math.max(m, sstep((endTaper - u) / endTaper), sstep((u - (1 - endTaper)) / endTaper));
    kk += (1.012 - kk) * m;
    const p = S.P(a, t, kk); pos.push(p.x, p.y, p.z);
    // the face side of the hairline thins into skin; the nape and sides only a little
    wts.push(m * m * m * (0.25 + 0.45 * Math.max(0, Math.cos(a)) ** 2));
  }
  for (let i = 0; i < rows; i++) for (let j = 0; j < cols; j++) {
    const a = i * (cols + 1) + j, b = a + 1, c = a + cols + 1, d = c + 1;
    idx.push(a, c, b, b, c, d);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx); g.computeVertexNormals();
  g.userData.w = wts;
  return g;
}

/** A tapered lock through points: rounded in section (w across, h through), lying along the scalp. */
function lockGeo(S, pts, { w0 = 0.08, w1 = 0.015, h0, h1, seg = 14, rad = 8 } = {}) {
  h0 ??= w0 * 0.55; h1 ??= Math.max(0.008, w1 * 0.6);
  const curve = new THREE.CatmullRomCurve3(pts, false, 'catmullrom', 0.5);
  const pos = [], idx = [], N = new THREE.Vector3(), B = new THREE.Vector3();
  for (let i = 0; i <= seg; i++) {
    const u = i / seg, P = curve.getPoint(u), T = curve.getTangent(u);
    N.subVectors(P, S.C).normalize(); N.addScaledVector(T, -N.dot(T));
    if (N.lengthSq() < 1e-8) N.set(0, 1, 0); N.normalize();
    B.crossVectors(T, N); if (B.lengthSq() < 1e-8) B.set(1, 0, 0); B.normalize();
    const w = (w0 + (w1 - w0) * u) * Math.min(1, 0.35 + u * 4), h = (h0 + (h1 - h0) * u) * Math.min(1, 0.5 + u * 4);
    for (let j = 0; j <= rad; j++) {
      const th = (j / rad) * PI * 2, c = Math.cos(th), s = Math.sin(th);
      // sit the lock's underside on the surface: offset outward by half its thickness
      pos.push(P.x + B.x * w * c + N.x * h * (s + 0.4), P.y + B.y * w * c + N.y * h * (s + 0.4), P.z + B.z * w * c + N.z * h * (s + 0.4));
    }
  }
  for (let i = 0; i < seg; i++) for (let j = 0; j < rad; j++) {
    const a = i * (rad + 1) + j, b = a + 1, c = a + rad + 1, d = c + 1;
    idx.push(a, b, c, b, d, c);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx); g.computeVertexNormals();
  return g;
}

/** Bake every part into one mesh: root shadow, top light, and a fade into the skin at the hairline. */
function finish(geos, S, skin, look) {
  const list = geos.map(g => {
    if (g.attributes.uv) g.deleteAttribute('uv');
    const n = g.index ? g.toNonIndexed() : g;
    if (n !== g) g.dispose();
    return n;
  });
  const geo = mergeGeometries(list, false);
  for (const g of list) g.dispose();
  const p = geo.attributes.position, nrm = geo.attributes.normal, col = geo.attributes.color, bl = geo.attributes.blend;
  const R = S.R, cy = S.C.y, gloss = look.hairGloss ?? 0;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i) - cy, z = p.getZ(i);
    const d = Math.sqrt(x * x + (y / 1.07) ** 2 + (z / 1.02) ** 2) / R;
    const depth = Math.pow(clamp01((d - 1.0) / 0.2), 0.7);
    const up = nrm.getY(i);
    let shade = (0.58 + 0.5 * depth) * (0.86 + 0.24 * clamp01(up) + gloss * 0.25 * clamp01(up) ** 6);
    if (!Number.isFinite(shade)) shade = 1;
    const w = clamp01(bl.getX(i)) * 0.9;
    for (let c = 0; c < 3; c++) {
      const base = col.array[i * 3 + c] * shade, s = c === 0 ? skin.r : c === 1 ? skin.g : skin.b;
      const v = base + (s - base) * w;
      col.array[i * 3 + c] = Number.isFinite(v) ? Math.min(1, Math.max(0, v)) : 0.1;
    }
  }
  geo.deleteAttribute('blend');
  geo.computeBoundingSphere();
  return geo;
}

const hairMats = new Map();
function hairMaterial(look) {
  const k = `${look.hairGloss ?? 0}`;
  if (!hairMats.has(k)) hairMats.set(k, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.5 - (look.hairGloss ?? 0) * 0.15, metalness: 0, envMapIntensity: 0.7 }));
  return hairMats.get(k);
}

/** Older entry point: adds the style's geometry to a ModelBuilder's 'hair' bucket (no vertex colours). */
export function addHair(b, look, faceId, R, cy) {
  const m = buildHair(look, faceId, R, cy, look.skin ?? 0xe0b090);
  if (!m) return;
  m.geometry.deleteAttribute('color');
  b.add('hair', m.geometry);
}

/**
 * Build a hair style as one mesh in head space (null for bald).
 * hat: 'cap' | 'cowboy' | undefined — hair is kept below the hat line.
 */
export function buildHair(look, faceId, R, cy, skinColor) {
  const style = look.hair || 'short';
  if (style === 'bald') return null;
  const S = makeScalp(R, cy), P = S.P;
  const rng = makeRng(hashString(faceId + ':hair') + 3);
  const base = new THREE.Color(look.hairColor ?? 0x2a2420), skin = new THREE.Color(skinColor);
  const geos = [];
  const shellAdd = (o, col = base) => { const g = shellGeo(S, o); const w = g.userData.w; geos.push(tag(g, col, i => w[i])); };
  const lock = (pts, o, col = base, blend = 0) => geos.push(tag(lockGeo(S, pts.map(p => (p.isVector3 ? p : P(p[0], p[1], p[2]))), o), col, blend));
  const blob = (p, r, s = [1, 1, 1], col = base) => { const g = new THREE.IcosahedronGeometry(r, 1); g.scale(s[0], s[1], s[2]); g.translate(p.x, p.y, p.z); geos.push(tag(g, col, 0)); };
  // where a hat lets hair start
  const hatTop = look.hat === 'cap' ? a => PI * 0.44 - 0.12 * Math.cos(a) - 0.05 : look.hat === 'cowboy' ? () => PI * 0.27 : null;
  const top = hatTop ?? (() => 0);
  const capped = !!hatTop;
  // a smooth patch of scalp hair in front of each ear, tucked into the skin on every edge
  const sideburns = (len = 0.09, w = 0.06) => {
    const half = w / R * 0.8, t0 = PI * 0.33, t1 = PI * (0.445 + len * 0.7);
    for (const sx of [1, -1]) {
      const ac = sx * 1.32;
      // rounded at the bottom, and narrowing as it comes down the cheek
      shellAdd({ a0: ac - half, a1: ac + half, top: () => t0, edge: a => t1 - PI * 0.05 * ((a - ac) / half) ** 2, k: (a, t) => 1.03 - 0.012 * sstep((t - PI * 0.4) / (t1 - PI * 0.4)), rows: 10, cols: 8, tuck: 0.4, endTaper: 0.45 });
    }
  };

  switch (style) {
    case 'short': {
      const n = lumps(rng, 0.022, 7);
      const edge = a => hairline(PI * 0.3, PI * 0.41, NAPE, PI * 0.06)(a) + tufts(7, PI * 0.03, 1.0)(a) + soft(17, PI * 0.02)(a);
      // a combed-up quiff at the front, fuller on top
      shellAdd({ top, edge, tuckTop: capped ? 0.25 : 0, k: (a, t) => 1.06 + 0.05 * Math.cos(t) ** 2 + (capped ? 0 : 0.09 * bump(a, t, 0.15, PI * 0.2, 0.7, 0.16)) + n(a, t) });
      sideburns(0.07);
      break;
    }
    case 'sidepart': {
      const n = lumps(rng, 0.014, 5), part = -0.6;
      const edge = a => hairline(PI * 0.29, PI * 0.41, NAPE, PI * 0.04)(a) + soft(15, PI * 0.02)(a);
      // a parting groove, and volume combed over to the other side
      shellAdd({ top, edge, k: (a, t) => 1.065 + 0.05 * Math.cos(t) ** 2 + n(a, t) - 0.04 * Math.exp(-(((a - part) / 0.09) ** 2)) * (1 - sstep((t - PI * 0.12) / (PI * 0.25))) + 0.05 * Math.max(0, Math.sin(a - part)) * Math.sin(t) * (1 - sstep((t - PI * 0.35) / 0.3)) + 0.05 * bump(a, t, 0.4, PI * 0.24, 0.6, 0.12) });
      // the sweep of the fringe
      lock([[part + 0.1, PI * 0.25, 1.06], [0.0, PI * 0.24, 1.15], [0.55, PI * 0.27, 1.14], [1.05, PI * 0.33, 1.06]], { w0: 0.13, w1: 0.04 });
      lock([[part + 0.05, PI * 0.16, 1.07], [0.15, PI * 0.15, 1.14], [0.85, PI * 0.21, 1.13], [1.4, PI * 0.32, 1.06]], { w0: 0.13, w1: 0.04 });
      sideburns(0.06);
      break;
    }
    case 'swept': {
      const n = lumps(rng, 0.012, 5);
      // lifted at the front, combed straight back into a full nape
      shellAdd({ top, edge: a => hairline(PI * 0.27, PI * 0.4, NAPE + PI * 0.02)(a) + soft(13, PI * 0.025)(a), k: (a, t) => 1.07 + 0.11 * Math.max(0, Math.cos(a)) ** 2 * (1 - sstep(t / (PI * 0.5))) + 0.02 * Math.sin(10 * a) * Math.sin(t) * sstep((t - PI * 0.15) / 0.3) + 0.03 * Math.max(0, -Math.cos(a)) * sstep((t - PI * 0.5) / 0.4) + n(a, t) });
      const arc = (x0, s, k) => { const d = new THREE.Vector3(x0, Math.sin(s), Math.cos(s)).normalize(); return new THREE.Vector3(d.x * R * k, cy + d.y * R * k * 1.07, d.z * R * k * 1.02); };
      const streak = look.hairStreak != null ? new THREE.Color(look.hairStreak) : base;
      for (const x0 of [-0.42, -0.2, 0.02, 0.24, 0.44]) lock([arc(x0, PI * 0.2, 1.08), arc(x0 * 1.05, PI * 0.3, 1.19), arc(x0 * 1.1, PI * 0.55, 1.15), arc(x0 * 1.15, PI * 0.8, 1.07)], { w0: 0.1, w1: 0.04 }, x0 > 0.2 ? streak : base);
      sideburns(0.07);
      break;
    }
    case 'tousled': {
      const n = lumps(rng, 0.035, 8);
      const edge = a => hairline(PI * 0.3, PI * 0.41, NAPE)(a) + tufts(9, PI * 0.04, 1.3)(a) + soft(13, PI * 0.03)(a);
      shellAdd({ top, edge, k: (a, t) => 1.08 + 0.06 * Math.cos(t) ** 2 + n(a, t) });
      // soft clumps over the top, pushed forward
      for (let i = 0; i < 9; i++) {
        const a = (rng() * 2 - 1) * PI, t = PI * (0.04 + rng() * 0.26), da = (rng() - 0.3) * 0.5, dt = PI * (0.06 + rng() * 0.05);
        lock([[a, t, 1.04], [a + da * 0.5, t + dt * 0.5, 1.16], [a + da, t + dt, 1.2 + rng() * 0.05]], { w0: 0.11, w1: 0.02, seg: 8 });
      }
      for (const a of [-0.55, -0.2, 0.15, 0.5]) lock([[a * 0.7, PI * 0.16, 1.08], [a, PI * 0.26, 1.14], [a + 0.12, PI * 0.33, 1.07]], { w0: 0.11, w1: 0.02, seg: 8 });
      sideburns(0.07);
      break;
    }
    case 'curly': case 'curlybig': {
      const big = style === 'curlybig';
      const n = lumps(rng, big ? 0.04 : 0.03, 10, 8);
      const baseK = big ? 1.14 : 1.07;
      const edge = big ? a => hairline(PI * 0.27, PI * 0.46, NAPE + PI * 0.03)(a) + tufts(10, PI * 0.03)(a) : a => hairline(PI * 0.29, PI * 0.41, NAPE)(a) + tufts(12, PI * 0.025)(a);
      const kf = (a, t) => baseK + (big ? 0.12 : 0.04) * Math.cos(t) ** 2 + n(a, t);
      shellAdd({ top, edge, tuckTop: capped ? 0.25 : 0, k: kf, rows: 16, cols: 56 }, base.clone().multiplyScalar(0.8));
      // curls: round clumps over the scalp and a row along the hairline to break it up
      const count = big ? 44 : 40, rr = big ? 0.1 : 0.072;
      const curl = (a, t, s) => blob(P(a, t, kf(a, t) - (big ? 0.06 : 0.07)), rr * s);
      for (let i = 0; i < count; i++) {
        const a = (rng() * 2 - 1) * PI, t = top(a) + 0.06 + rng() * (edge(a) - top(a) - 0.14);
        if (Math.cos(a) > 0.55 && t > PI * 0.26) continue;
        curl(a, t, 0.75 + rng() * 0.5);
      }
      for (let i = 0; i < (big ? 20 : 16); i++) { const a = -PI + (i + rng() * 0.4) / (big ? 20 : 16) * PI * 2, t = edge(a) - 0.07; if (t > top(a) + 0.05) curl(a, t, 0.7 + rng() * 0.3); }
      break;
    }
    case 'baldsides': {
      const n = lumps(rng, 0.02, 7);
      const a0 = PI * 0.4, a1 = PI * 1.6;
      shellAdd({ a0, a1, cols: 44, rows: 10, top: a => PI * 0.42 - PI * 0.05 * Math.max(0, -Math.cos(a)) - PI * 0.03 * Math.pow(0.5 + 0.5 * Math.cos(a * 11), 1.4), edge: a => PI * 0.5 + (NAPE - PI * 0.5) * Math.max(0, -Math.cos(a)) + PI * 0.025 * Math.pow(0.5 + 0.5 * Math.cos(a * 15), 1.4), tuck: 0.4, tuckTop: 0.45, endTaper: 0.14, k: (a, t) => 1.05 + n(a, t) });
      if (look.hairTufts) {
        // the cartoon mogul: big white wings of fluff over each ear
        for (const sx of [1, -1]) for (const [da, dt, r, k] of [[1.5, 0.43, 0.085, 1.12], [1.75, 0.4, 0.095, 1.16], [2.0, 0.45, 0.085, 1.12], [1.62, 0.52, 0.07, 1.08], [1.88, 0.53, 0.07, 1.08], [2.25, 0.5, 0.06, 1.06], [1.38, 0.5, 0.055, 1.04]]) blob(P(sx * da, PI * dt, k), r, [1.25, 1, 1]);
      } else for (const sx of [1, -1]) lock([[sx * 1.25, PI * 0.42, 1.03], [sx * 1.45, PI * 0.4, 1.1], [sx * 1.7, PI * 0.43, 1.1]], { w0: 0.08, w1: 0.03, seg: 7 });
      break;
    }
    case 'swoop': {
      const n = lumps(rng, 0.014, 5);
      // one big golden volume: high at the front, swept back over the crown, fluffy over the ears and nape
      const k = (a, t) => 1.08 + 0.04 * Math.cos(t) ** 2
        + 0.2 * bump(a, t, 0.25, PI * 0.2, 0.75, 0.2)          // the front swoop
        + 0.06 * bump(a, t, -0.9, PI * 0.25, 0.9, 0.22)
        + 0.07 * Math.sin(a) ** 2 * Math.exp(-(((t - PI * 0.38) / 0.28) ** 2))   // wings over the ears
        + 0.05 * Math.max(0, -Math.cos(a)) * sstep((t - PI * 0.45) / 0.35) + n(a, t);
      shellAdd({ top, edge: a => hairline(PI * 0.3, PI * 0.42, NAPE)(a) + soft(13, PI * 0.025)(a), k, rows: 20, cols: 64 });
      // the comb-over: thick rounded locks from one side up and across, curling over the forehead
      lock([[-2.4, PI * 0.42, 1.06], [-1.6, PI * 0.24, 1.16], [-0.7, PI * 0.14, 1.26], [0.2, PI * 0.18, 1.3], [0.7, PI * 0.26, 1.27], [0.95, PI * 0.32, 1.16]], { w0: 0.2, w1: 0.07, h0: 0.09, h1: 0.04, seg: 20, rad: 10 });
      lock([[-0.6, PI * 0.2, 1.16], [-0.1, PI * 0.22, 1.28], [0.35, PI * 0.26, 1.32], [0.7, PI * 0.31, 1.25], [0.85, PI * 0.36, 1.12]], { w0: 0.15, w1: 0.05, h0: 0.08, h1: 0.03, seg: 16, rad: 10 });
      for (const sx of [1, -1]) lock([[sx * 1.0, PI * 0.33, 1.08], [sx * 1.5, PI * 0.37, 1.18], [sx * 2.1, PI * 0.41, 1.16], [sx * 2.55, PI * 0.47, 1.06]], { w0: 0.14, w1: 0.05, seg: 12 });
      break;
    }
    case 'long': {
      const n = lumps(rng, 0.01, 4);
      shellAdd({ top, edge: a => hairline(PI * 0.28, PI * 0.43, PI * 0.56)(a), k: (a, t) => 1.07 + 0.03 * Math.cos(t) ** 2 + n(a, t) - 0.03 * Math.exp(-((a / 0.1) ** 2)) * (1 - sstep((t - PI * 0.1) / (PI * 0.2))) });
      // curtains framing the face, falling past the shoulders
      for (const sx of [1, -1]) for (const [da, w] of [[0, 0.14], [0.28, 0.14]]) {
        const a = sx * (1.36 + da);
        lock([P(sx * 0.7, PI * 0.18, 1.08), P(a, PI * 0.38, 1.13), P(a, PI * 0.55, 1.14), S.drop(a, 1.15, cy - R * 0.85), S.drop(a, 1.16, cy - R * 1.55)], { w0: w, w1: w * 0.8, h0: 0.06, h1: 0.04, seg: 16, rad: 8 });
      }
      // a sheet down the back
      for (const da of [-1.05, -0.52, 0, 0.52, 1.05]) {
        const a = PI + da;
        lock([P(a, PI * 0.12, 1.07), P(a, PI * 0.4, 1.13), P(a, PI * 0.6, 1.13), S.drop(a, 1.13, cy - R * 0.85), S.drop(a, 1.12, cy - R * 1.65)], { w0: 0.17, w1: 0.14, h0: 0.06, h1: 0.045, seg: 16, rad: 8 });
      }
      break;
    }
    default: {
      const n = lumps(rng, 0.02, 6);
      shellAdd({ top, edge: hairline(PI * 0.3, PI * 0.4, NAPE), k: (a, t) => 1.06 + n(a, t) });
    }
  }
  const mesh = new THREE.Mesh(finish(geos, S, skin, look), hairMaterial(look));
  mesh.name = 'hair';
  return mesh;
}
