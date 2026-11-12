/* Track: turns a track definition (a closed 3D spline plus features) into the
   sampled data the sim needs: frames, widths, edges, ramps, boost pads, a terrain
   height grid, and fast ground queries. No rendering here, so this runs in Node
   for headless races. Rendering lives in trackmesh.js and reads the same data. */
import { CatmullRomCurve3, Vector3 } from 'three';
import { clamp, lerp, smoothstep, fbm, mod, wrapAngle } from '../core/util.js';

export const EDGE = { OPEN: 0, WALL: 1, VOID: 2 };
const EDGE_BY_NAME = { open: EDGE.OPEN, wall: EDGE.WALL, void: EDGE.VOID };

/** Surface table. speed = top-speed multiplier, grip = lateral grip multiplier. */
export const SURFACES = {
  road:     { id: 'road',     speed: 1.0,  grip: 1.0,  dust: null,      rumble: 0 },
  kerb:     { id: 'kerb',     speed: 1.0,  grip: 1.0,  dust: null,      rumble: 0.5 },
  shoulder: { id: 'shoulder', speed: 0.9,  grip: 0.95, dust: 0xb8a37a,  rumble: 0.15 },
  grass:    { id: 'grass',    speed: 0.58, grip: 0.8,  dust: 0x6aa84f,  rumble: 0.3, offroad: true },
  sand:     { id: 'sand',     speed: 0.52, grip: 0.75, dust: 0xe2c58f,  rumble: 0.25, offroad: true },
  dirt:     { id: 'dirt',     speed: 0.88, grip: 0.82, dust: 0xa9825a,  rumble: 0.2 },
  dust:     { id: 'dust',     speed: 0.6,  grip: 0.78, dust: 0xd9a66b,  rumble: 0.3, offroad: true },
  snow:     { id: 'snow',     speed: 0.6,  grip: 0.7,  dust: 0xf2f6fb,  rumble: 0.2, offroad: true },
  ice:      { id: 'ice',      speed: 1.0,  grip: 0.42, dust: 0xd8f0ff,  rumble: 0 },
  metal:    { id: 'metal',    speed: 1.0,  grip: 1.0,  dust: null,      rumble: 0.1 },
  glass:    { id: 'glass',    speed: 1.0,  grip: 1.0,  dust: null,      rumble: 0 },
  water:    { id: 'water',    speed: 0.7,  grip: 0.85, dust: 0xbfe8ff,  rumble: 0.2, offroad: true, splash: true },
  void:     { id: 'void',     speed: 1.0,  grip: 1.0,  dust: null,      rumble: 0 },
};

const _v = new Vector3();

/** Reusable result object for ground queries. */
export function makeGroundHit() {
  return {
    i: 0, s: 0, lat: 0, y: 0, planeY: 0, surface: SURFACES.road,
    hwL: 0, hwR: 0, edgeL: 0, edgeR: 0, outside: 0, side: 0,
    boost: false, ramp: null, onRoad: true, nx: 0, nz: 0, // nx/nz: horizontal unit "left" at this sample
    tx: 0, tz: 0, upx: 0, upy: 1, upz: 0, dist2: 0,
  };
}

export class Track {
  constructor(def) {
    this.def = def;
    this.id = def.id;
    this.name = def.name;
    this.laps = def.laps || 3;
    this.gravity = def.gravity || 1;
    this.offroad = SURFACES[def.offroad || 'grass'];
    this.roadSurface = SURFACES[def.surface || 'road'];
    this._sample();
    this._applySides();
    this._features();
    this._terrain();
    this._racingLine();
  }

  /* ---------- sampling ---------- */
  _sample() {
    const def = this.def, cps = def.path, n = cps.length;
    const pts = cps.map(c => new Vector3(c.p[0], c.p[1] || 0, c.p[2]));
    const curve = new CatmullRomCurve3(pts, true, def.curveType || 'centripetal', 0.5);
    curve.arcLengthDivisions = n * 80;
    const length = curve.getLength();
    const N = Math.max(32, Math.round(length / (def.ds || 1.5)));
    const ds = length / N;
    this.curve = curve; this.length = length; this.N = N; this.ds = ds; this.ncp = n;

    const F = () => new Float32Array(N);
    const px = F(), py = F(), pz = F(), tx = F(), ty = F(), tz = F();
    const lx = F(), ly = F(), lz = F(), ux = F(), uy = F(), uz = F();
    const hwL = F(), hwR = F(), curv = F(), bank = F(), cp = F(), yaw = F();

    const defW = def.width || 16;
    const sm = f => f * f * (3 - 2 * f);
    for (let i = 0; i < N; i++) {
      const u = i / N;
      curve.getPointAt(u, _v);
      px[i] = _v.x; py[i] = _v.y; pz[i] = _v.z;
      const t = curve.getUtoTmapping(u);
      const c = t * n; cp[i] = c;
      const k = Math.floor(c) % n, k2 = (k + 1) % n, f = sm(c - Math.floor(c));
      const w = lerp(cps[k].w ?? defW, cps[k2].w ?? defW, f);
      // optional asymmetric widths: wl / wr override per control point
      hwL[i] = lerp(cps[k].wl ?? (cps[k].w ?? defW) / 2, cps[k2].wl ?? (cps[k2].w ?? defW) / 2, f);
      hwR[i] = lerp(cps[k].wr ?? (cps[k].w ?? defW) / 2, cps[k2].wr ?? (cps[k2].w ?? defW) / 2, f);
      if (!(cps[k].wl != null || cps[k2].wl != null)) hwL[i] = w / 2;
      if (!(cps[k].wr != null || cps[k2].wr != null)) hwR[i] = w / 2;
      bank[i] = lerp(cps[k].bank ?? 0, cps[k2].bank ?? 0, f) * Math.PI / 180;
    }
    // tangents (central difference)
    for (let i = 0; i < N; i++) {
      const a = mod(i - 1, N), b = (i + 1) % N;
      let dx = px[b] - px[a], dy = py[b] - py[a], dz = pz[b] - pz[a];
      const l = Math.hypot(dx, dy, dz) || 1;
      tx[i] = dx / l; ty[i] = dy / l; tz[i] = dz / l;
      yaw[i] = Math.atan2(tx[i], tz[i]);
    }
    // signed curvature in the ground plane (+ = turning left), smoothed
    const raw = F();
    for (let i = 0; i < N; i++) {
      const a = mod(i - 1, N), b = (i + 1) % N;
      raw[i] = wrapAngle(yaw[b] - yaw[a]) / (2 * ds);
    }
    const blur = (src, r, passes = 2) => {
      let cur = src;
      for (let p = 0; p < passes; p++) {
        const out = F();
        for (let i = 0; i < N; i++) { let s = 0; for (let j = -r; j <= r; j++) s += cur[mod(i + j, N)]; out[i] = s / (2 * r + 1); }
        cur = out;
      }
      return cur;
    };
    const cs = blur(raw, 3, 2);
    for (let i = 0; i < N; i++) curv[i] = cs[i];
    // banking: manual (per control point) plus automatic from curvature
    const gain = def.autoBank ?? 3.2, maxBank = (def.maxBank ?? 13) * Math.PI / 180;
    const autoB = F();
    for (let i = 0; i < N; i++) autoB[i] = clamp(curv[i] * gain, -maxBank, maxBank);
    const ab = blur(autoB, 8, 2);
    for (let i = 0; i < N; i++) bank[i] += ab[i];
    // frames: left is +lateral. Positive bank raises the right side (banks a left turn).
    for (let i = 0; i < N; i++) {
      const Tx = tx[i], Ty = ty[i], Tz = tz[i];
      let Lx = Tz, Lz = -Tx; const ll = Math.hypot(Lx, Lz) || 1; Lx /= ll; Lz /= ll; // up x T, horizontal
      // U0 = T x L0
      const Ux = Ty * Lz - Tz * 0, Uy = Tz * Lx - Tx * Lz, Uz = Tx * 0 - Ty * Lx;
      const cb = Math.cos(bank[i]), sb = Math.sin(bank[i]);
      lx[i] = Lx * cb - Ux * sb; ly[i] = -Uy * sb; lz[i] = Lz * cb - Uz * sb;
      ux[i] = Ux * cb + Lx * sb; uy[i] = Uy * cb; uz[i] = Uz * cb + Lz * sb;
    }
    Object.assign(this, { px, py, pz, tx, ty, tz, lx, ly, lz, ux, uy, uz, hwL, hwR, curv, bank, cp, yaw });

    // bounds
    let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity, minY = Infinity, maxY = -Infinity;
    for (let i = 0; i < N; i++) {
      minX = Math.min(minX, px[i]); maxX = Math.max(maxX, px[i]);
      minZ = Math.min(minZ, pz[i]); maxZ = Math.max(maxZ, pz[i]);
      minY = Math.min(minY, py[i]); maxY = Math.max(maxY, py[i]);
    }
    this.bounds = { minX, maxX, minZ, maxZ, minY, maxY, cx: (minX + maxX) / 2, cz: (minZ + maxZ) / 2 };
  }

  /** Sample index for a control-point parameter (e.g. 4.5 = halfway between points 4 and 5). */
  indexAtCp(c) {
    c = mod(c, this.ncp);
    let lo = 0, hi = this.N - 1;
    while (lo < hi) { const m = (lo + hi) >> 1; if (this.cp[m] < c) lo = m + 1; else hi = m; }
    return lo;
  }
  sAtCp(c) { return this.indexAtCp(c) * this.ds; }
  /** Iterate sample indices from control param a to b, wrapping. */
  _range(a, b) {
    const i0 = this.indexAtCp(a), i1 = this.indexAtCp(b);
    const out = []; let i = i0;
    const count = mod(i1 - i0, this.N) || this.N;
    for (let k = 0; k <= count && k < this.N; k++) { out.push(i); i = (i + 1) % this.N; }
    return out;
  }

  /* ---------- edges, shoulders, surfaces ---------- */
  _applySides() {
    const N = this.N, def = this.def, d = def.defaults || {};
    this.edgeL = new Uint8Array(N); this.edgeR = new Uint8Array(N);
    this.shL = new Float32Array(N); this.shR = new Float32Array(N);
    this.outerL = new Float32Array(N); this.outerR = new Float32Array(N);
    this.bridge = new Uint8Array(N); this.gap = new Uint8Array(N); this.tunnel = new Uint8Array(N);
    this.surf = new Array(N).fill(this.roadSurface);
    this.wallStyle = new Array(N).fill(null);
    this.hoardL = new Uint8Array(N).fill(1); this.hoardR = new Uint8Array(N).fill(1);   // draw the sponsor wall at the outer limit?
    const dEdge = EDGE_BY_NAME[d.edge || 'open'], dSh = d.shoulder ?? 3.5, dOut = d.outer ?? 11;
    this.edgeL.fill(dEdge); this.edgeR.fill(dEdge); this.shL.fill(dSh); this.shR.fill(dSh); this.outerL.fill(dOut); this.outerR.fill(dOut);
    for (const r of def.sides || []) {
      for (const i of this._range(r.from, r.to)) {
        const L = r.side !== 'R', R = r.side !== 'L';
        if (r.edge != null) { if (L) this.edgeL[i] = EDGE_BY_NAME[r.edge]; if (R) this.edgeR[i] = EDGE_BY_NAME[r.edge]; }
        if (r.shoulder != null) { if (L) this.shL[i] = r.shoulder; if (R) this.shR[i] = r.shoulder; }
        if (r.outer != null) { if (L) this.outerL[i] = r.outer; if (R) this.outerR[i] = r.outer; }
        if (r.style != null) this.wallStyle[i] = r.style;
        if (r.hoarding != null) { if (L) this.hoardL[i] = r.hoarding ? 1 : 0; if (R) this.hoardR[i] = r.hoarding ? 1 : 0; }
      }
    }
    for (const r of def.bridges || []) for (const i of this._range(r.from, r.to)) this.bridge[i] = 1;
    for (const r of def.tunnels || []) for (const i of this._range(r.from, r.to)) { this.tunnel[i] = 1; this.edgeL[i] = EDGE.WALL; this.edgeR[i] = EDGE.WALL; if (r.through) this.bridge[i] = 1; }
    for (const r of def.gaps || []) for (const i of this._range(r.from, r.to)) { this.gap[i] = 1; this.bridge[i] = 1; }
    this.skin = new Array(N).fill(def.look?.road?.skin || 'asphalt');
    for (const r of def.zones || []) for (const i of this._range(r.from, r.to)) { if (r.surface) this.surf[i] = SURFACES[r.surface]; if (r.skin) this.skin[i] = r.skin; }
    // walls and void edges have no shoulder; inner-corner shoulders are limited by the corner radius
    for (let i = 0; i < N; i++) {
      if (this.edgeL[i] !== EDGE.OPEN) this.shL[i] = 0;
      if (this.edgeR[i] !== EDGE.OPEN) this.shR[i] = 0;
      const k = this.curv[i];
      if (k > 1e-4) { const R = 1 / k; this.shL[i] = Math.max(0, Math.min(this.shL[i], R - 2.5 - this.hwL[i])); this.outerL[i] = Math.max(0, Math.min(this.outerL[i], R - 1 - this.hwL[i])); }
      if (k < -1e-4) { const R = -1 / k; this.shR[i] = Math.max(0, Math.min(this.shR[i], R - 2.5 - this.hwR[i])); this.outerR[i] = Math.max(0, Math.min(this.outerR[i], R - 1 - this.hwR[i])); }
    }
  }

  /* ---------- ramps, boost pads, item rows, coins ---------- */
  _features() {
    const def = this.def, L = this.length;
    const latOf = (f, i) => (f.lat ?? 0);
    this.ramps = (def.ramps || []).map(r => {
      const i0 = this.indexAtCp(r.at), s0 = i0 * this.ds, len = r.len ?? 7;
      const full = r.w == null;
      const half = full ? 1e3 : r.w / 2;
      return { s0, s1: s0 + len, len, lift: r.lift ?? 1.5, lat: latOf(r), half, full, trick: r.trick !== false, i0, kick: r.kick ?? 0 };
    });
    this.boosts = (def.boosts || []).map(b => {
      const i0 = this.indexAtCp(b.at), s0 = i0 * this.ds, len = b.len ?? 8;
      return { s0, s1: s0 + len, len, lat: latOf(b), half: (b.w ?? 4.5) / 2, i0 };
    });
    this.itemRows = (def.itemRows || []).map(r => {
      const i = this.indexAtCp(r.at);
      const n = r.n ?? 4, hw = Math.min(this.hwL[i], this.hwR[i]) - 2.2;
      const lats = r.lats || Array.from({ length: n }, (_, k) => (n === 1 ? 0 : lerp(-hw, hw, k / (n - 1))) + (r.lat ?? 0));
      return { i, s: i * this.ds, lats };
    });
    this.obstacleDefs = (def.obstacles || []).map((o, k) => ({ id: k, kind: o.kind || 'patrol', model: o.model || 'barrel', radius: o.radius ?? 1.4, effect: o.effect || 'spin', speed: o.speed ?? 6, period: o.period ?? 4, duty: o.duty ?? 0.5, phase: o.phase ?? 0, orbit: o.orbit ?? 4, a: { s: this.sAtCp(o.at ?? o.from), lat: o.lat ?? (o.lats ? o.lats[0] : 0) }, b: { s: this.sAtCp(o.to ?? o.at ?? o.from), lat: o.lats ? o.lats[1] : (o.lat2 ?? o.lat ?? 0) }, lift: o.lift ?? 0 }));
    this.coinSpots = [];
    for (const c of def.coins || []) {
      const i0 = this.indexAtCp(c.from), i1 = this.indexAtCp(c.to ?? c.from);
      const span = mod(i1 - i0, this.N), n = c.n ?? 5;
      for (let k = 0; k < n; k++) {
        const f = n === 1 ? 0 : k / (n - 1);
        const i = mod(Math.round(i0 + span * f), this.N);
        const lat = Array.isArray(c.lat) ? lerp(c.lat[0], c.lat[1], f) : typeof c.lat === 'function' ? c.lat(f) : (c.lat ?? 0);
        this.coinSpots.push({ i, s: i * this.ds, lat, air: c.air ?? 0 });
      }
    }
    // Rescue points: never put a kart back so close to a gap that it cannot build speed to clear it.
    const N = this.N, runup = Math.round(70 / this.ds);
    this.respawn = new Int32Array(N); for (let i = 0; i < N; i++) this.respawn[i] = i;
    for (let i = 0; i < N; i++) {
      if (this.gap[i] && !this.gap[mod(i - 1, N)]) {                 // first sample of a gap
        let first = i; for (const r of this.ramps) { const d = mod(i - r.i0, N); if (d < Math.round(30 / this.ds)) first = r.i0; }
        const safe = mod(first - runup, N);
        let j = safe; while (j !== i) { this.respawn[j] = safe; j = (j + 1) % N; }
        j = i; while (this.gap[j]) { this.respawn[j] = safe; j = (j + 1) % N; }
      }
    }
    void L;
  }

  /** Extra height from ramps at track coordinates (s, lat). Sets hit.ramp. */
  _rampHeight(s, lat, hit) {
    const L = this.length;
    for (let k = 0; k < this.ramps.length; k++) {
      const r = this.ramps[k];
      let d = s - r.s0; if (d < -L / 2) d += L; else if (d > L / 2) d -= L;
      if (d >= 0 && d <= r.len && Math.abs(lat - r.lat) <= r.half) {
        const t = d / r.len;
        if (hit) hit.ramp = r;
        return r.lift * (0.35 * t + 0.65 * t * t);
      }
    }
    return 0;
  }
  _onBoost(s, lat) {
    const L = this.length;
    for (let k = 0; k < this.boosts.length; k++) {
      const b = this.boosts[k];
      let d = s - b.s0; if (d < -L / 2) d += L; else if (d > L / 2) d -= L;
      if (d >= 0 && d <= b.len && Math.abs(lat - b.lat) <= b.half) return true;
    }
    return false;
  }

  /* ---------- locating a point on the track ---------- */
  /** Nearest sample index to (x,z). With a hint, searches a window around it; otherwise all samples. */
  nearest(x, z, hint = -1, y = null, window = 14) {
    const { px, py, pz, N } = this;
    let best = -1, bd = Infinity;
    if (hint >= 0) {
      for (let k = -window; k <= window; k++) {
        const i = mod(hint + k, N);
        const dx = x - px[i], dz = z - pz[i];
        let d = dx * dx + dz * dz;
        if (y != null) { const dy = y - py[i]; d += dy * dy * 4; }
        if (d < bd) { bd = d; best = i; }
      }
      // if we ended at the window edge the hint was stale: fall through to a full search
      if (bd < 60 * 60 && mod(best - hint + window, N) !== 0 && mod(hint + window - best, N) !== 0) return best;
    }
    for (let i = 0; i < N; i++) {
      const dx = x - px[i], dz = z - pz[i];
      let d = dx * dx + dz * dz;
      if (y != null) { const dy = y - py[i]; d += dy * dy * 4; }
      if (d < bd) { bd = d; best = i; }
    }
    return best;
  }

  /** Solve (x,z) = C + a*T.xz + l*L.xz for the road-plane coordinates at sample i. Returns [a, l, planeY] via out array. */
  _plane(i, x, z, out) {
    const dx = x - this.px[i], dz = z - this.pz[i];
    const Tx = this.tx[i], Tz = this.tz[i], Lx = this.lx[i], Lz = this.lz[i];
    const det = Tx * Lz - Tz * Lx;
    const a = (dx * Lz - dz * Lx) / det;
    const l = (Tx * dz - Tz * dx) / det;
    out[0] = a; out[1] = l; out[2] = this.py[i] + a * this.ty[i] + l * this.ly[i];
    return out;
  }

  /**
   * Ground query. Fills `hit` with the surface under (x,z).
   * hint: previous sample index for this object (or -1). y: current height, used to
   * pick the right level where the track crosses over itself.
   */
  ground(x, z, hint, hit, y = null) {
    const N = this.N, ds = this.ds;
    let i = this.nearest(x, z, hint, y);
    const pa = this._pa || (this._pa = [0, 0, 0]), pb = this._pb || (this._pb = [0, 0, 0]);
    this._plane(i, x, z, pa);
    // step so that the along-coordinate lies in [0, ds)
    for (let guard = 0; guard < 3; guard++) {
      if (pa[0] < 0) { i = mod(i - 1, N); this._plane(i, x, z, pa); }
      else if (pa[0] >= ds * 1.02) { i = (i + 1) % N; this._plane(i, x, z, pa); }
      else break;
    }
    const j = (i + 1) % N;
    this._plane(j, x, z, pb);
    const f = clamp(pa[0] / ds, 0, 1);
    const lat = lerp(pa[1], pb[1], f);
    const planeY = lerp(pa[2], pb[2], f);
    const hwL = lerp(this.hwL[i], this.hwL[j], f), hwR = lerp(this.hwR[i], this.hwR[j], f);
    const s = i * ds + f * ds;

    hit.i = i; hit.s = s; hit.lat = lat; hit.planeY = planeY; hit.hwL = hwL; hit.hwR = hwR;
    hit.edgeL = this.edgeL[i]; hit.edgeR = this.edgeR[i];
    hit.boost = false; hit.ramp = null; hit.outside = 0; hit.side = 0;
    const nl = Math.hypot(this.lx[i], this.lz[i]) || 1;
    hit.nx = this.lx[i] / nl; hit.nz = this.lz[i] / nl;
    const tl = Math.hypot(this.tx[i], this.tz[i]) || 1;
    hit.tx = this.tx[i] / tl; hit.tz = this.tz[i] / tl;
    hit.upx = this.ux[i]; hit.upy = this.uy[i]; hit.upz = this.uz[i];

    if (lat <= hwL && lat >= -hwR) {
      hit.onRoad = true;
      if (this.gap[i]) { hit.surface = SURFACES.void; hit.y = this._below(x, z); return hit; }
      hit.surface = this.surf[i];
      hit.y = planeY + (this.ramps.length ? this._rampHeight(s, lat, hit) : 0);
      if (this.boosts.length) hit.boost = this._onBoost(s, lat);
      return hit;
    }
    hit.onRoad = false;
    const left = lat > 0;
    hit.side = left ? 1 : -1;
    const hw = left ? hwL : hwR, edge = left ? hit.edgeL : hit.edgeR;
    const sh = left ? lerp(this.shL[i], this.shL[j], f) : lerp(this.shR[i], this.shR[j], f);
    const over = Math.abs(lat) - hw;
    hit.outside = over;
    if (edge === EDGE.VOID || this.gap[i]) { hit.surface = SURFACES.void; hit.y = this._below(x, z); return hit; }
    if (edge === EDGE.WALL) { hit.surface = this.surf[i]; hit.y = planeY; return hit; }
    // open edge: kerb, then shoulder on the extended road plane, then terrain
    if (over <= KERB_W) { hit.surface = SURFACES.kerb; hit.y = planeY + KERB_H * (over / KERB_W); return hit; }
    // height of the road plane at the clamped lateral (the shoulder does not keep climbing forever)
    const latC = clamp(lat, -(hwR + sh + 1), hwL + sh + 1);
    const shoulderY = planeY + (latC - lat) * lerp(this.ly[i], this.ly[j], f);
    if (over <= sh) { hit.surface = SURFACES.shoulder; hit.y = shoulderY; return hit; }
    const ty = this.terrainHeight(x, z);
    const w = smoothstep(sh, sh + 2.5, over);
    hit.y = lerp(shoulderY, ty, w);
    hit.surface = this.water != null && hit.y < this.water - 0.25 ? SURFACES.water : this.offroad;
    return hit;
  }

  /** Height of whatever lies below the road here (terrain, or far below if there is none). */
  _below(x, z) { return this.hasTerrain ? this.terrainHeight(x, z) : -1e4; }

  /** World position on the road surface at distance s and lateral offset lat. */
  pointAt(s, lat, out, lift = 0) {
    const N = this.N, ds = this.ds;
    s = mod(s, this.length);
    const fi = s / ds, i = Math.floor(fi) % N, j = (i + 1) % N, f = fi - Math.floor(fi);
    const ax = this.px[i] + this.lx[i] * lat + this.ux[i] * lift, ay = this.py[i] + this.ly[i] * lat + this.uy[i] * lift, az = this.pz[i] + this.lz[i] * lat + this.uz[i] * lift;
    const bx = this.px[j] + this.lx[j] * lat + this.ux[j] * lift, by = this.py[j] + this.ly[j] * lat + this.uy[j] * lift, bz = this.pz[j] + this.lz[j] * lat + this.uz[j] * lift;
    out.x = lerp(ax, bx, f); out.y = lerp(ay, by, f); out.z = lerp(az, bz, f);
    return out;
  }
  yawAt(s) {
    const fi = mod(s, this.length) / this.ds, i = Math.floor(fi) % this.N, j = (i + 1) % this.N, f = fi - Math.floor(fi);
    return this.yaw[i] + wrapAngle(this.yaw[j] - this.yaw[i]) * f;
  }
  /** Start grid slot k (0 = pole). Returns {x,y,z,yaw}. */
  gridSlot(k, out = {}) {
    const row = Math.floor(k / 2), col = k % 2;
    const s = this.length - 7 - row * 5.2 - col * 2.6;
    const lat = (col === 0 ? 1 : -1) * Math.min(3.2, this.hwL[0] - 2.5);
    this.pointAt(s, lat, out);
    out.yaw = this.yawAt(s); out.s = s; out.lat = lat;
    return out;
  }

  /* ---------- solid scenery ---------- */
  /** Register a solid round obstacle (a tree trunk, a tent, a pillar). Karts bounce off it. */
  addCollider(x, z, r) {
    const g = this._cg || (this._cg = new Map()), c = 10, key = (Math.floor(x / c) << 16) ^ (Math.floor(z / c) & 0xffff);
    for (let ix = -1; ix <= 1; ix++) for (let iz = -1; iz <= 1; iz++) {
      const k = ((Math.floor(x / c) + ix) << 16) ^ ((Math.floor(z / c) + iz) & 0xffff);
      if (ix === 0 && iz === 0) { if (!g.has(k)) g.set(k, []); g.get(k).push({ x, z, r }); }
      void k;
    }
    void key; this.colliderCount = (this.colliderCount || 0) + 1;
  }
  clearColliders() { this._cg = new Map(); this.colliderCount = 0; }
  /** Calls fn(collider) for solids near (x,z). */
  eachCollider(x, z, fn) {
    const g = this._cg; if (!g || !this.colliderCount) return;
    const c = 10, cx = Math.floor(x / c), cz = Math.floor(z / c);
    for (let ix = -1; ix <= 1; ix++) for (let iz = -1; iz <= 1; iz++) { const list = g.get(((cx + ix) << 16) ^ ((cz + iz) & 0xffff)); if (list) for (let i = 0; i < list.length; i++) fn(list[i]); }
  }

  /* ---------- terrain ---------- */
  _terrain() {
    const def = this.def, t = def.terrain;
    this.water = t?.water ?? null;
    if (t === false || t?.none) { this.hasTerrain = false; return; }
    this.hasTerrain = true;
    const cell = t?.cell ?? 3, margin = t?.margin ?? 120, blend = t?.blend ?? 32;
    const fn = t?.fn || ((x, z) => (fbm(x * 0.006, z * 0.006, 4, 7) - 0.45) * 26);
    const b = this.bounds;
    // marginX / marginZ: [low side, high side], for a track whose scenery reaches further one way than the others
    const mX = t?.marginX || [margin, margin], mZ = t?.marginZ || [margin, margin];
    const x0 = Math.floor((b.minX - mX[0]) / cell) * cell, z0 = Math.floor((b.minZ - mZ[0]) / cell) * cell;
    const nx = Math.ceil((b.maxX + mX[1] - x0) / cell) + 1, nz = Math.ceil((b.maxZ + mZ[1] - z0) / cell) + 1;
    const H = new Float32Array(nx * nz), D = new Float32Array(nx * nz), S = new Float32Array(nx * nz), NI = new Int32Array(nx * nz);
    const { px, pz, N } = this;
    const stride = 2, pl = [0, 0, 0];
    // ground-level samples only (bridges do not pull the terrain up)
    const cand = []; for (let i = 0; i < N; i += stride) if (!this.bridge[i]) cand.push(i);
    const base = t?.base ?? 0; // offset so the road sits slightly proud of the land
    for (let iz = 0; iz < nz; iz++) {
      const z = z0 + iz * cell;
      for (let ix = 0; ix < nx; ix++) {
        const x = x0 + ix * cell;
        let best = cand[0] ?? 0, bd = Infinity;
        for (let c = 0; c < cand.length; c++) { const i = cand[c]; const dx = x - px[i], dz = z - pz[i]; const d = dx * dx + dz * dz; if (d < bd) { bd = d; best = i; } }
        // refine among neighbours
        for (let k = -stride; k <= stride; k++) { const i = mod(best + k, N); if (this.bridge[i]) continue; const dx = x - px[i], dz = z - pz[i]; const d = dx * dx + dz * dz; if (d < bd) { bd = d; best = i; } }
        const idx = iz * nx + ix;
        const far = fn(x, z);
        if (!cand.length) { H[idx] = far; D[idx] = 1e3; S[idx] = 1e3; NI[idx] = 0; continue; }
        this._plane(best, x, z, pl);
        const lat = pl[1], left = lat > 0;
        const hw = left ? this.hwL[best] : this.hwR[best];
        const sh = left ? this.shL[best] : this.shR[best];
        // distance beyond the road edge; near sample ends use the true distance so corners stay round
        const along = Math.abs(pl[0]);
        const over = along > this.ds * 1.5 ? Math.sqrt(bd) - hw : Math.abs(lat) - hw;
        const latC = clamp(lat, -(this.hwR[best] + this.shR[best] + 1), this.hwL[best] + this.shL[best] + 1);
        const planeY = this.py[best] + clamp(pl[0], -this.ds, this.ds) * this.ty[best] + latC * this.ly[best];
        const w = smoothstep(sh, sh + blend, over);
        H[idx] = lerp(planeY - base, far, w);
        D[idx] = over; S[idx] = over - sh; NI[idx] = best;
      }
    }
    this.grid = { x0, z0, nx, nz, cell, H, D, S, NI, blend };
  }
  terrainHeight(x, z) {
    const g = this.grid; if (!g) return -1e4;
    const fx = clamp((x - g.x0) / g.cell, 0, g.nx - 1.001), fz = clamp((z - g.z0) / g.cell, 0, g.nz - 1.001);
    const ix = Math.floor(fx), iz = Math.floor(fz), tx = fx - ix, tz = fz - iz;
    const i = iz * g.nx + ix, H = g.H;
    return lerp(lerp(H[i], H[i + 1], tx), lerp(H[i + g.nx], H[i + g.nx + 1], tx), tz);
  }
  /** Distance from (x,z) to the nearest road edge (negative on the road). Coarse; for scenery placement. */
  roadDistance(x, z) {
    const g = this.grid; if (!g) return 1e3;
    const fx = clamp((x - g.x0) / g.cell, 0, g.nx - 1.001), fz = clamp((z - g.z0) / g.cell, 0, g.nz - 1.001);
    const ix = Math.floor(fx), iz = Math.floor(fz), tx = fx - ix, tz = fz - iz;
    const i = iz * g.nx + ix, D = g.D;
    return lerp(lerp(D[i], D[i + 1], tx), lerp(D[i + g.nx], D[i + g.nx + 1], tx), tz);
  }

  /* ---------- AI racing line ---------- */
  _racingLine() {
    const N = this.N, line = new Float32Array(N), tmp = new Float32Array(N);
    const r = Math.round(22 / this.ds);
    for (let i = 0; i < N; i++) { let s = 0; for (let k = -r; k <= r; k++) s += this.curv[mod(i + k, N)]; tmp[i] = s / (2 * r + 1); }
    for (let i = 0; i < N; i++) {
      const usable = Math.max(0, Math.min(this.hwL[i], this.hwR[i]) - 2.4);
      line[i] = clamp(tmp[i] * 48, -1, 1) * usable * 0.8; // inside of the corner: left turn -> left side
    }
    // smooth so the line has no kinks
    const out = new Float32Array(N), r2 = Math.round(9 / this.ds);
    for (let i = 0; i < N; i++) { let s = 0; for (let k = -r2; k <= r2; k++) s += line[mod(i + k, N)]; out[i] = s / (2 * r2 + 1); }
    this.lineLat = out;
    // corner list for AI drift planning: contiguous runs of strong curvature
    this.corners = [];
    let start = -1, dir = 0;
    const TH = 1 / 60;
    for (let k = 0; k < N * 2; k++) {
      const i = k % N, c = tmp[i];
      const strong = Math.abs(c) > TH;
      if (strong && start < 0) { start = k; dir = Math.sign(c); }
      else if ((!strong || Math.sign(c) !== dir) && start >= 0) {
        const len = (k - start) * this.ds;
        if (start < N && len > 16) this.corners.push({ i0: start % N, i1: i, len, dir });
        start = strong ? k : -1; dir = strong ? Math.sign(c) : 0;
      }
      if (k >= N && start < 0) break;
    }
  }
}

export const KERB_W = 1.1;
export const KERB_H = 0.09;
