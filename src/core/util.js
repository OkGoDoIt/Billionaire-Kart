/* Small math helpers shared by the sim and the renderer. No DOM, no three.js. */

export const TAU = Math.PI * 2;
export const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
export const clamp01 = v => (v < 0 ? 0 : v > 1 ? 1 : v);
export const lerp = (a, b, t) => a + (b - a) * t;
export const invLerp = (a, b, v) => (b === a ? 0 : (v - a) / (b - a));
export const remap = (v, a, b, c, d) => c + (d - c) * clamp01(invLerp(a, b, v));
export const smoothstep = (a, b, v) => { const t = clamp01(invLerp(a, b, v)); return t * t * (3 - 2 * t); };
export const smootherstep = (a, b, v) => { const t = clamp01(invLerp(a, b, v)); return t * t * t * (t * (t * 6 - 15) + 10); };
export const sign = v => (v < 0 ? -1 : v > 0 ? 1 : 0);

/** Frame-rate independent exponential approach: moves a toward b at rate lambda (1/s). */
export const damp = (a, b, lambda, dt) => a + (b - a) * (1 - Math.exp(-lambda * dt));
/** Move a toward b by at most step. */
export const approach = (a, b, step) => (a < b ? Math.min(a + step, b) : Math.max(a - step, b));

export const wrapAngle = a => { a = (a + Math.PI) % TAU; if (a < 0) a += TAU; return a - Math.PI; };
export const angleDiff = (from, to) => wrapAngle(to - from);
export const dampAngle = (a, b, lambda, dt) => a + angleDiff(a, b) * (1 - Math.exp(-lambda * dt));
export const mod = (n, m) => ((n % m) + m) % m;

/** Shortest signed distance from a to b on a loop of the given length. */
export const loopDelta = (a, b, length) => { let d = (b - a) % length; if (d > length / 2) d -= length; if (d < -length / 2) d += length; return d; };

export const easeOutCubic = t => 1 - Math.pow(1 - t, 3);
export const easeOutBack = t => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); };
export const easeInOutQuad = t => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
export const easeOutElastic = t => (t === 0 || t === 1 ? t : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * (TAU / 3)) + 1);

/** Deterministic PRNG (mulberry32). rng() -> [0,1). */
export function makeRng(seed = 1) {
  let a = seed >>> 0 || 1;
  const rng = () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  rng.range = (lo, hi) => lo + (hi - lo) * rng();
  rng.int = (lo, hi) => Math.floor(lo + (hi - lo + 1) * rng());
  rng.pick = arr => arr[Math.floor(rng() * arr.length)];
  rng.chance = p => rng() < p;
  rng.sign = () => (rng() < 0.5 ? -1 : 1);
  rng.shuffle = arr => { for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [arr[i], arr[j]] = [arr[j], arr[i]]; } return arr; };
  return rng;
}

export function hashString(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

/* ---- value noise (deterministic, tileable enough for terrain) ---- */
function hash2(ix, iz, seed) {
  let h = Math.imul(ix, 374761393) ^ Math.imul(iz, 668265263) ^ Math.imul(seed, 2147483647);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
/** Smooth 2D value noise in [0,1]. */
export function noise2(x, z, seed = 0) {
  const ix = Math.floor(x), iz = Math.floor(z);
  const fx = x - ix, fz = z - iz;
  const ux = fx * fx * (3 - 2 * fx), uz = fz * fz * (3 - 2 * fz);
  const a = hash2(ix, iz, seed), b = hash2(ix + 1, iz, seed), c = hash2(ix, iz + 1, seed), d = hash2(ix + 1, iz + 1, seed);
  return a + (b - a) * ux + (c - a) * uz + (a - b - c + d) * ux * uz;
}
/** Fractal noise in roughly [0,1]. */
export function fbm(x, z, octaves = 4, seed = 0, gain = 0.5, lacunarity = 2) {
  let amp = 0.5, sum = 0, norm = 0;
  for (let i = 0; i < octaves; i++) {
    sum += noise2(x, z, seed + i * 17) * amp;
    norm += amp; amp *= gain; x *= lacunarity; z *= lacunarity;
  }
  return sum / norm;
}
/** Ridged noise in [0,1], good for mountains and dunes. */
export function ridged(x, z, octaves = 4, seed = 0) {
  let amp = 0.5, sum = 0, norm = 0;
  for (let i = 0; i < octaves; i++) {
    const n = 1 - Math.abs(noise2(x, z, seed + i * 31) * 2 - 1);
    sum += n * n * amp; norm += amp; amp *= 0.5; x *= 2; z *= 2;
  }
  return sum / norm;
}

export const fmtTime = t => {
  if (t == null || !isFinite(t)) return '-:--.---';
  const m = Math.floor(t / 60), s = t - m * 60;
  return `${m}:${s.toFixed(3).padStart(6, '0')}`;
};
export const ordinal = n => { const s = ['th', 'st', 'nd', 'rd'], v = n % 100; return n + (s[(v - 20) % 10] || s[v] || s[0]); };
export const ordinalSuffix = n => { const s = ['th', 'st', 'nd', 'rd'], v = n % 100; return s[(v - 20) % 10] || s[v] || s[0]; };
