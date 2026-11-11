/* Hair for the bobblehead drivers. Each style is a lumpy shell with a broken
   hairline (it tucks into the scalp at its edge, so it never reads as a cap)
   plus a few tapered locks, curls, or tufts for silhouette. Everything lands in
   the head's single 'hair' bucket, so a style costs one draw call. */
import * as THREE from 'three';
import { sphere } from './build.js';
import { makeRng, hashString } from '../core/util.js';

const PI = Math.PI;
const sstep = x => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));
/* How far down the back of the head hair grows (polar angle from the crown). Karts are seen from behind
   for most of a race, so the nape has to be covered or the hair reads as a cap. */
const NAPE = PI * 0.74;

/* Scalp coordinates: a = yaw around the head (0 = the face, +π/2 = the head's +x side, π = the back),
   t = polar angle from the crown, k = radius as a multiple of the skull. */
function makeScalp(R, cy) {
  const P = (a, t, k = 1) => new THREE.Vector3(Math.sin(a) * Math.sin(t) * R * k, cy + Math.cos(t) * R * k * 1.07, Math.cos(a) * Math.sin(t) * R * k * 1.02);
  // straight down from a point on the head, for hair that hangs
  const drop = (a, k, y) => new THREE.Vector3(Math.sin(a) * R * k, y, Math.cos(a) * R * k * 1.02);
  return { P, drop, C: new THREE.Vector3(0, cy, 0) };
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

/** The shell: rows run from top(a) down to edge(a); k(a, t) is the thickness. */
function shellGeo(S, { a0 = -PI, a1 = PI, top = () => 0, edge, k, rows = 13, cols = 48, tuck = 0.32, tuckTop = 0, endTaper = 0 }) {
  const pos = [], idx = [];
  for (let i = 0; i <= rows; i++) for (let j = 0; j <= cols; j++) {
    const a = a0 + (a1 - a0) * j / cols, f = i / rows, u = j / cols;
    const t0 = top(a), t1 = edge(a), t = t0 + (t1 - t0) * f;
    let kk = k(a, t);
    let m = sstep((f - (1 - tuck)) / tuck);
    if (tuckTop) m = Math.max(m, sstep((tuckTop - f) / tuckTop));
    if (endTaper) m = Math.max(m, sstep((endTaper - u) / endTaper), sstep((u - (1 - endTaper)) / endTaper));
    kk += (1.012 - kk) * m;
    const p = S.P(a, t, kk); pos.push(p.x, p.y, p.z);
  }
  for (let i = 0; i < rows; i++) for (let j = 0; j < cols; j++) {
    const a = i * (cols + 1) + j, b = a + 1, c = a + cols + 1, d = c + 1;
    idx.push(a, c, b, b, c, d);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx); g.computeVertexNormals();
  return g;
}

/** A tapered lock through points; flat across (w), thin through (h), lying along the scalp. */
function lockGeo(S, pts, { w0 = 0.08, w1 = 0.015, h0 = 0.035, h1 = 0.012, seg = 14, rad = 7 } = {}) {
  const curve = new THREE.CatmullRomCurve3(pts, false, 'catmullrom', 0.5);
  const pos = [], idx = [], N = new THREE.Vector3(), B = new THREE.Vector3();
  for (let i = 0; i <= seg; i++) {
    const u = i / seg, P = curve.getPoint(u), T = curve.getTangent(u);
    N.subVectors(P, S.C).normalize(); N.addScaledVector(T, -N.dot(T)).normalize();
    B.crossVectors(T, N).normalize();
    const w = (w0 + (w1 - w0) * u) * Math.min(1, 0.35 + u * 4), h = h0 + (h1 - h0) * u;
    for (let j = 0; j <= rad; j++) {
      const th = (j / rad) * PI * 2, c = Math.cos(th), s = Math.sin(th);
      pos.push(P.x + B.x * w * c + N.x * h * s, P.y + B.y * w * c + N.y * h * s, P.z + B.z * w * c + N.z * h * s);
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

/**
 * Add a hair style to a head's ModelBuilder (bucket 'hair').
 * hat: 'cap' | 'cowboy' | undefined — hair is kept below the hat line.
 */
export function addHair(b, look, faceId, R, cy) {
  const style = look.hair || 'short';
  if (style === 'bald') return;
  const S = makeScalp(R, cy), P = S.P;
  const rng = makeRng(hashString(faceId + ':hair') + 3);
  const add = g => b.add('hair', g);
  const lock = (pts, o) => add(lockGeo(S, pts.map(p => (p.isVector3 ? p : P(p[0], p[1], p[2]))), o));
  // where a hat lets hair start
  const hatTop = look.hat === 'cap' ? a => PI * 0.44 - 0.12 * Math.cos(a) - 0.05 : look.hat === 'cowboy' ? () => PI * 0.27 : null;
  const top = hatTop ?? (() => 0);
  const capped = !!hatTop;
  const sideburns = (len = 0.09, w = 0.06) => { for (const sx of [1, -1]) lock([[sx * 1.36, PI * 0.37, 1.0], [sx * 1.37, PI * (0.43 + len * 0.5), 1.025], [sx * 1.39, PI * (0.46 + len), 1.0]], { w0: w, w1: w * 0.75, h0: 0.022, h1: 0.012, seg: 6, rad: 5 }); };

  switch (style) {
    case 'short': {
      const n = lumps(rng, 0.03, 7);
      const edge = a => hairline(PI * 0.3, PI * 0.41, NAPE, PI * 0.06)(a) + tufts(7, PI * 0.035, 1.0)(a) + soft(17, PI * 0.02)(a);
      add(shellGeo(S, { top, edge, tuckTop: capped ? 0.25 : 0, k: (a, t) => 1.06 + 0.05 * Math.cos(t) ** 2 + 0.03 * Math.max(0, Math.cos(a)) * Math.sin(t * 2) + n(a, t) }));
      // a little lift at the front
      if (!capped) for (const x of [-0.35, 0, 0.32]) lock([[x * 0.6, PI * 0.08, 1.06], [x, PI * 0.2, 1.11], [x * 1.1, PI * 0.3, 1.07]], { w0: 0.1, w1: 0.04, h0: 0.035, h1: 0.02, seg: 8 });
      sideburns(0.07);
      break;
    }
    case 'sidepart': {
      const n = lumps(rng, 0.018, 5), part = -0.6;
      const edge = a => hairline(PI * 0.29, PI * 0.41, NAPE, PI * 0.04)(a) + soft(15, PI * 0.022)(a);
      add(shellGeo(S, { top, edge, k: (a, t) => 1.065 + 0.05 * Math.cos(t) ** 2 + n(a, t) - 0.035 * Math.exp(-(((a - part) / 0.09) ** 2)) * (1 - sstep((t - PI * 0.12) / (PI * 0.25))) + 0.03 * Math.max(0, Math.sin(a - part)) * Math.sin(t) }));
      // combed over from the part: a fringe swept to one side and layers above it
      lock([[part + 0.1, PI * 0.27, 1.04], [0.0, PI * 0.25, 1.14], [0.55, PI * 0.28, 1.14], [1.0, PI * 0.34, 1.05]], { w0: 0.12, w1: 0.03, h0: 0.055, h1: 0.02 });
      lock([[part + 0.05, PI * 0.18, 1.05], [0.1, PI * 0.16, 1.14], [0.8, PI * 0.22, 1.13], [1.35, PI * 0.33, 1.05]], { w0: 0.12, w1: 0.03, h0: 0.045, h1: 0.02 });
      lock([[part - 0.2, PI * 0.1, 1.06], [0.4, PI * 0.09, 1.13], [1.4, PI * 0.2, 1.11], [1.9, PI * 0.33, 1.05]], { w0: 0.12, w1: 0.03, h0: 0.04, h1: 0.02 });
      lock([[part - 0.1, PI * 0.25, 1.04], [part - 0.4, PI * 0.3, 1.09], [part - 0.8, PI * 0.36, 1.05]], { w0: 0.08, w1: 0.03, h0: 0.035, h1: 0.02, seg: 8 });
      sideburns(0.06);
      break;
    }
    case 'swept': {
      const n = lumps(rng, 0.014, 5);
      add(shellGeo(S, { top, edge: a => hairline(PI * 0.28, PI * 0.4, NAPE)(a) + soft(15, PI * 0.02)(a), k: (a, t) => 1.06 + 0.07 * Math.max(0, Math.cos(a)) ** 2 * (1 - sstep(t / (PI * 0.5))) + 0.014 * Math.sin(12 * a) * Math.sin(t) + n(a, t) }));
      // locks combed straight back from a lifted front
      const arc = (x0, s, k) => { const d = new THREE.Vector3(x0, Math.sin(s), Math.cos(s)).normalize(); return new THREE.Vector3(d.x * R * k, cy + d.y * R * k * 1.07, d.z * R * k * 1.02); };
      for (const x0 of [-0.42, -0.2, 0.02, 0.24, 0.44]) lock([arc(x0, PI * 0.2, 1.06), arc(x0 * 1.05, PI * 0.3, 1.16), arc(x0 * 1.1, PI * 0.55, 1.13), arc(x0 * 1.15, PI * 0.8, 1.06)], { w0: 0.08, w1: 0.03, h0: 0.04, h1: 0.02 });
      sideburns(0.07);
      break;
    }
    case 'tousled': {
      const n = lumps(rng, 0.04, 8);
      const edge = a => hairline(PI * 0.3, PI * 0.41, NAPE)(a) + tufts(9, PI * 0.04, 1.3)(a) + soft(13, PI * 0.03)(a);
      add(shellGeo(S, { top, edge, k: (a, t) => 1.07 + 0.05 * Math.cos(t) ** 2 + n(a, t) }));
      // messy spikes over the top
      for (let i = 0; i < 9; i++) {
        const a = (rng() * 2 - 1) * PI, t = PI * (0.04 + rng() * 0.26), da = (rng() - 0.3) * 0.5, dt = PI * (0.05 + rng() * 0.06);
        lock([[a, t, 1.0], [a + da * 0.5, t + dt * 0.5, 1.12], [a + da, t + dt, 1.2 + rng() * 0.06]], { w0: 0.09, w1: 0.008, h0: 0.05, h1: 0.01, seg: 8, rad: 6 });
      }
      // a fringe falling onto the forehead
      for (const a of [-0.55, -0.2, 0.15, 0.5]) lock([[a * 0.7, PI * 0.16, 1.06], [a, PI * 0.26, 1.12], [a + 0.12, PI * 0.335, 1.07]], { w0: 0.1, w1: 0.01, h0: 0.04, h1: 0.012, seg: 8 });
      sideburns(0.07);
      break;
    }
    case 'curly': case 'curlybig': {
      const big = style === 'curlybig';
      const n = lumps(rng, big ? 0.04 : 0.03, 10, 8);
      const base = big ? 1.12 : 1.05;
      const edge = big ? a => hairline(PI * 0.27, PI * 0.46, NAPE + PI * 0.02)(a) + tufts(10, PI * 0.03)(a) : a => hairline(PI * 0.29, PI * 0.41, NAPE)(a) + tufts(12, PI * 0.025)(a);
      add(shellGeo(S, { top, edge, tuckTop: capped ? 0.25 : 0, k: (a, t) => base + (big ? 0.1 : 0.03) * Math.cos(t) ** 2 + n(a, t) }));
      // curls: scattered over the scalp, and a row along the hairline to break it up
      const count = big ? 46 : 34, rr = big ? 0.1 : 0.072;
      const curl = (a, t, s) => { const p = P(a, t, base + (big ? 0.12 : 0.03) * Math.cos(t) ** 2 + 0.02); b.add('hair', sphere(rr * s, 7, 5), { p: [p.x, p.y, p.z] }); };
      for (let i = 0; i < count; i++) {
        const a = (rng() * 2 - 1) * PI, t = top(a) + 0.04 + rng() * (edge(a) - top(a) - 0.12);
        if (Math.cos(a) > 0.55 && t > PI * 0.26) continue;
        curl(a, t, 0.75 + rng() * 0.5);
      }
      for (let i = 0; i < (big ? 22 : 18); i++) { const a = -PI + (i + rng() * 0.4) / (big ? 22 : 18) * PI * 2, t = edge(a) - 0.06; if (t > top(a) + 0.05) curl(a, t, 0.7 + rng() * 0.3); }
      break;
    }
    case 'baldsides': {
      const n = lumps(rng, 0.025, 7);
      const a0 = PI * 0.4, a1 = PI * 1.6;
      add(shellGeo(S, { a0, a1, cols: 40, rows: 9, top: a => PI * 0.42 - PI * 0.05 * Math.max(0, -Math.cos(a)) - PI * 0.03 * Math.pow(0.5 + 0.5 * Math.cos(a * 11), 1.4), edge: a => PI * 0.5 + (NAPE - PI * 0.5) * Math.max(0, -Math.cos(a)) + PI * 0.025 * Math.pow(0.5 + 0.5 * Math.cos(a * 15), 1.4), tuck: 0.4, tuckTop: 0.45, endTaper: 0.14, k: (a, t) => 1.055 + n(a, t) }));
      // fluffy bits over the ears
      for (const sx of [1, -1]) lock([[sx * 1.25, PI * 0.42, 1.03], [sx * 1.45, PI * 0.4, 1.1], [sx * 1.7, PI * 0.43, 1.1]], { w0: 0.08, w1: 0.02, h0: 0.04, h1: 0.02, seg: 7 });
      break;
    }
    case 'swoop': {
      const n = lumps(rng, 0.018, 5);
      add(shellGeo(S, { top, edge: a => hairline(PI * 0.31, PI * 0.41, NAPE - PI * 0.02)(a) + soft(13, PI * 0.02)(a), k: (a, t) => 1.07 + 0.03 * Math.cos(t) ** 2 + 0.05 * Math.sin(a) ** 2 * Math.exp(-(((t - PI * 0.34) / 0.3) ** 2)) + n(a, t) }));
      // the wave: layered locks from the back of one side, up over the crown, forward and across
      lock([[-2.5, PI * 0.44, 1.02], [-1.7, PI * 0.24, 1.12], [-0.8, PI * 0.13, 1.2], [0.25, PI * 0.18, 1.24], [0.75, PI * 0.27, 1.25], [1.0, PI * 0.33, 1.18]], { w0: 0.2, w1: 0.06, h0: 0.08, h1: 0.04, seg: 20, rad: 8 });
      lock([[-2.7, PI * 0.36, 1.04], [-1.9, PI * 0.17, 1.17], [-0.9, PI * 0.08, 1.27], [0.1, PI * 0.13, 1.32], [0.6, PI * 0.21, 1.34], [0.9, PI * 0.28, 1.3]], { w0: 0.17, w1: 0.05, h0: 0.07, h1: 0.035, seg: 20, rad: 8 });
      lock([[-0.6, PI * 0.19, 1.12], [-0.1, PI * 0.22, 1.24], [0.35, PI * 0.25, 1.32], [0.75, PI * 0.3, 1.32], [0.95, PI * 0.36, 1.2]], { w0: 0.13, w1: 0.04, h0: 0.06, h1: 0.03, seg: 16, rad: 8 });
      // swept-back wings over the ears
      for (const sx of [1, -1]) lock([[sx * 1.0, PI * 0.32, 1.05], [sx * 1.5, PI * 0.36, 1.14], [sx * 2.1, PI * 0.4, 1.12], [sx * 2.5, PI * 0.45, 1.04]], { w0: 0.12, w1: 0.04, h0: 0.05, h1: 0.025, seg: 10 });
      break;
    }
    case 'long': {
      const n = lumps(rng, 0.012, 4);
      add(shellGeo(S, { top, edge: a => hairline(PI * 0.28, PI * 0.43, PI * 0.56)(a), k: (a, t) => 1.065 + 0.03 * Math.cos(t) ** 2 + n(a, t) - 0.03 * Math.exp(-((a / 0.1) ** 2)) * (1 - sstep((t - PI * 0.1) / (PI * 0.2))) }));
      // curtains framing the face, falling to the shoulders
      for (const sx of [1, -1]) for (const [da, w] of [[0, 0.13], [0.25, 0.12]]) {
        const a = sx * (1.36 + da);
        lock([P(sx * 0.7, PI * 0.18, 1.07), P(a, PI * 0.38, 1.12), P(a, PI * 0.55, 1.13), S.drop(a, 1.14, cy - R * 0.85), S.drop(a, 1.12, cy - R * 1.38)], { w0: w, w1: w * 0.75, h0: 0.05, h1: 0.04, seg: 16, rad: 7 });
      }
      // the back
      for (const da of [-1.05, -0.52, 0, 0.52, 1.05]) {
        const a = PI + da;
        lock([P(a, PI * 0.12, 1.06), P(a, PI * 0.4, 1.12), P(a, PI * 0.6, 1.12), S.drop(a, 1.12, cy - R * 0.85), S.drop(a, 1.1, cy - R * 1.42)], { w0: 0.15, w1: 0.12, h0: 0.05, h1: 0.04, seg: 16, rad: 7 });
      }
      break;
    }
    default: {
      const n = lumps(rng, 0.02, 6);
      add(shellGeo(S, { top, edge: hairline(PI * 0.3, PI * 0.4, NAPE), k: (a, t) => 1.06 + n(a, t) }));
    }
  }
}
