/* Bobblehead driver: a sculpted torso dressed in each racer's own outfit, a neck,
   arms that reach the wheel, mitten hands, and an oversized head with a generated
   face texture wrapped on the front, plus hair, hats, and one signature prop that
   reads from behind (the chase camera's view). Each outfit is a "kit" named by the
   racer's look; everything for one driver merges into a handful of draw calls. */
import * as THREE from 'three';
import { ModelBuilder, box, sphere, cyl, cone, torus, tube, lathe, plastic, glow, MAT } from './build.js';
import { shell } from './kart-geo.js';
import { FACES } from '../content/faces.js';
import { buildHair } from './hair.js';
import { canvasTex } from '../render/textures.js';

const PI = Math.PI;
const V3 = THREE.Vector3;
const texLoader = new THREE.TextureLoader();
const faceCache = new Map();
function faceTexture(url) {
  if (!faceCache.has(url)) {
    const t = texLoader.load(url);
    t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
    faceCache.set(url, t);
  }
  return faceCache.get(url);
}

export const HEAD_R = 0.43;
const NECK_Y = 0.84;           // head pivot above the hips

/* ---------- shape helpers ---------- */
const matCache = new Map();
const cached = (k, make) => { if (!matCache.has(k)) matCache.set(k, make()); return matCache.get(k); };
const doubleSided = (color, rough = 0.7, metal = 0) => cached(`2s:${color}:${rough}:${metal}`, () => new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: metal, envMapIntensity: 0.9, side: THREE.DoubleSide }));
const fluoro = color => cached(`fl:${color}`, () => new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.18, roughness: 0.6, envMapIntensity: 0.6 }));

/** Cylinder (or cone) from p0 to p1 with radii r0 and r1. */
function limb(p0, p1, r0, r1, rs = 10, open = false) {
  const a = new V3(...p0), c = new V3(...p1), d = new V3().subVectors(c, a), len = Math.max(1e-4, d.length());
  const g = new THREE.CylinderGeometry(r1, r0, len, rs, 1, open);
  g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new V3(0, 1, 0), d.normalize()));
  g.translate((a.x + c.x) / 2, (a.y + c.y) / 2, (a.z + c.z) / 2);
  return g;
}
/** A ring around an axis direction at p. */
function ringAround(p, dir, R, r, rs = 6, ts = 16) {
  const g = torus(R, r, rs, ts);
  g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new V3(0, 0, 1), new V3(...dir).normalize()));
  g.translate(p[0], p[1], p[2]);
  return g;
}
const mix3 = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const sub3 = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];

/** A flat strip (tie, strap, ribbon) through points; nrm(u) is the strip's face normal. */
function strip(pts, w0, w1, th, nrm, { seg = 24, point = false } = {}) {
  const curve = new THREE.CatmullRomCurve3(pts.map(p => new V3(...p)), false, 'catmullrom', 0.5);
  const pos = [], idx = [], rad = 8, Bv = new V3(), N = new V3();
  for (let i = 0; i <= seg; i++) {
    const u = i / seg, P = curve.getPoint(u), T = curve.getTangent(u);
    N.copy(nrm(u)); Bv.crossVectors(T, N); if (Bv.lengthSq() < 1e-8) Bv.set(1, 0, 0); Bv.normalize();
    N.crossVectors(Bv, T).normalize();
    let w = w0 + (w1 - w0) * u; if (point) w *= Math.min(1, (1 - u) * 6 + 0.04);
    for (let j = 0; j <= rad; j++) {
      const a = (j / rad) * PI * 2, c = Math.cos(a), s = Math.sin(a);
      const cc = Math.sign(c) * Math.pow(Math.abs(c), 0.4), ss = Math.sign(s) * Math.pow(Math.abs(s), 0.4);   // squarish section
      pos.push(P.x + Bv.x * w * cc + N.x * th * ss, P.y + Bv.y * w * cc + N.y * th * ss, P.z + Bv.z * w * cc + N.z * th * ss);
    }
  }
  for (let i = 0; i < seg; i++) for (let j = 0; j < rad; j++) { const a = i * (rad + 1) + j, b = a + 1, c = a + rad + 1, d = c + 1; idx.push(a, b, c, b, d, c); }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx); g.computeVertexNormals();
  return g;
}
const RX = new THREE.Matrix4().makeRotationX(-PI / 2);
/** A vertical body shell. Sections { y, w, f (front depth), k (back depth), z (forward offset), n };
    arc a0..a1 where 0 = the +x side, π/2 = the back, 3π/2 = the front. */
function vshell(secs, { ring = 22, steps = 3, a0 = 0, a1 = PI * 2, grow = 0 } = {}) {
  const g = shell(secs.map(s => ({ z: s.y, w: s.w + grow, ht: s.k + grow, hb: s.f + grow, y: -(s.z ?? 0), x: 0, n: s.n ?? 2.5 })), { ring, steps, a0, a1 });
  return g.applyMatrix4(RX);
}
/** Interpolate a section list at height y. */
function at(secs, y) {
  let i = 0; while (i < secs.length - 2 && secs[i + 1].y < y) i++;
  const a = secs[i], b = secs[i + 1], t = Math.min(1, Math.max(0, (y - a.y) / (b.y - a.y)));
  const o = {}; for (const k of ['w', 'f', 'k', 'z', 'n']) o[k] = a[k] + (b[k] - a[k]) * t;
  o.y = y; return o;
}
/** Push a shell's vertices out in vertical ribs (knitwear). */
function ribs(g, n, amp) {
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), z = p.getZ(i), a = Math.atan2(x, z), r = Math.hypot(x, z);
    if (r < 1e-4) continue;
    const d = amp * Math.cos(a * n), s = (r + d) / r;
    p.setX(i, x * s); p.setZ(i, z * s);
  }
  g.computeVertexNormals();
  return g;
}

let tagTex = null;
const priceTag = () => tagTex ??= canvasTex(128, 64, (g, w, h) => {
  g.fillStyle = '#fbfaf4'; g.fillRect(0, 0, w, h);
  g.fillStyle = '#bdb8a8'; g.beginPath(); g.arc(16, h / 2, 6, 0, PI * 2); g.fill();
  g.fillStyle = '#15161c'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.font = '40px "Luckiest Guy", "Arial Black", sans-serif'; g.fillText('$999', w / 2 + 9, h / 2 + 3, w - 30);
}, { repeat: false, aniso: 4 });

/* ---------- body ---------- */
const BUILD = { sw: 0.3, chest: 0.19, belly: 0, hunch: 0, arm: 0.075, buff: false };

function torsoSecs(P) {
  const L = y => -0.1 * y + P.hunch * Math.max(0, y - 0.25) ** 1.5 * 1.6;   // leaning back in the seat, or hunched over the wheel
  const rows = [
    [0.0, 0.21, 0.16, 0.15, 0],
    [0.12, 0.225 + P.belly * 0.3, 0.17 + P.belly * 0.6, 0.155, P.belly * 0.25],
    [0.27, 0.24 + P.belly * 0.4, 0.18 + P.belly, 0.16, P.belly * 0.45],
    [0.42, P.sw * 0.86, P.chest + P.belly * 0.3, 0.165, P.belly * 0.15],
    [0.55, P.sw * 0.98, P.chest - 0.015, 0.16, 0],
    [0.64, P.sw * 0.93, 0.145, 0.145, 0],
    [0.7, P.sw * 0.62, 0.12, 0.12, 0],
    [0.75, 0.14, 0.1, 0.1, 0],
  ];
  return { secs: rows.map(([y, w, f, k, z]) => ({ y, w, f, k, z: z + L(y), n: y > 0.38 ? 3.2 : 2.5 })), L };
}

/** Everything a kit needs to dress the body. */
function makeCtx(b, P) {
  const { secs, L } = torsoSecs(P);
  const F = y => { const s = at(secs, y); return s.z + s.f; };
  const Bk = y => { const s = at(secs, y); return s.z - s.k; };
  const W = y => at(secs, y).w;
  // the neck's axis in torso space: the head group sits at L(0.8)+0.03 (plus the
  // hunch shift) and the neck cylinder is offset -0.01 inside it. Collars must be
  // centred here, not on the torso sections' L(y), or the neck slices through
  // the collar ring off-centre and the intersection reads ragged.
  const neckZ = L(0.8) + 0.02 + P.hunch * 0.25;
  const joints = sx => {
    const sh = [sx * (P.sw - 0.045), 0.6, L(0.6)];
    const el = [sx * (P.sw + 0.085 + (P.buff ? 0.03 : 0)), 0.33, 0.12 + L(0.33) * 0.3];
    const wr = [sx * 0.21, 0.41, 0.43], hd = [sx * 0.15, 0.43, 0.5];
    return { sh, el, wr, hd };
  };
  const ctx = {
    b, P, secs, L, F, Bk, W, joints, neckZ,
    torso(mat = 'top', { grow = 0, ribbed = 0 } = {}) {
      let list = secs;
      if (ribbed) {   // quilted bands, for puffer coats
        list = [];
        for (let i = 0; i <= 12; i++) { const y = i * 0.055, s = at(secs, y), q = i % 2 ? 1 + ribbed : 1 - ribbed * 0.2; list.push({ ...s, w: s.w * q, f: s.f * q, k: s.k * q }); }
        list.push(secs[6], secs[7]);
      }
      b.add(mat, vshell(list, { grow, steps: ribbed ? 2 : 3 }));
    },
    /** A V of something worn underneath, showing at the front (shirt, tee, lapels). */
    vee(mat, yTop, yBot, wTop, out, { yEnd = null } = {}) {
      const list = [];
      for (let i = 0; i <= 6; i++) {
        const y = yBot + (yTop - yBot) * i / 6, s = at(secs, y);
        list.push({ y, w: Math.max(0.006, wTop * Math.pow(i / 6, 0.9)), f: s.f + out, k: 0.04, z: s.z, n: 2.2 });
      }
      if (yEnd) { const s = at(secs, yEnd); list.push({ y: yEnd, w: wTop * 0.8, f: s.f * 0.8 + out, k: 0.04, z: s.z, n: 2.2 }); }
      b.add(mat, vshell(list, { ring: 16, steps: 2 }));
    },
    /** Round collar ring at the neck. */
    crew(mat, y = 0.735, r = 0.135, t = 0.026) { b.add(mat, torus(r, t, 9, 24), { p: [0, y, neckZ], r: [PI / 2, 0, 0] }); },
    /** Shirt collar points either side of the throat. */
    points(mat, spread = 0.07, y = 0.725) {
      for (const sx of [1, -1]) b.add(mat, box(0.085, 0.07, 0.014, 0.006, 1), { p: [sx * spread, y, F(y) - 0.012], r: [-0.35, sx * 0.35, sx * 0.7] });
    },
    /** A stand-up collar (lathe ring) with an optional gap at the front. */
    stand(mat, prof, gap = 0) { b.add(mat, new THREE.LatheGeometry(prof.map(([r, y]) => new THREE.Vector2(r, y)), 20, gap / 2, PI * 2 - gap), { p: [0, 0, neckZ] }); },
    /** A line of buttons down the front. */
    buttons(mat, ys, r = 0.014, x = 0) { for (const y of ys) b.add(mat, sphere(r, 6, 4), { p: [x, y, F(y) + 0.008], s: [1, 1, 0.5] }); },
    /** A strip down the front centre (zip, placket, tie). */
    frontStrip(mat, y0, y1, w0, w1, out = 0.01, th = 0.006, o = {}) {
      const pts = []; for (let i = 0; i <= 6; i++) { const y = y0 + (y1 - y0) * i / 6; pts.push([0, y, F(y) + out]); }
      b.add(mat, strip(pts, w0, w1, th, () => new V3(0, 0, 1), { seg: 12, ...o }));
    },
    /** Straps over both shoulders down the back, for anything worn like a backpack. */
    straps(mat, yb = 0.42, x = 0.14) {
      for (const sx of [1, -1]) b.add(mat, strip([[sx * x, 0.4, F(0.4) + 0.006], [sx * (x + 0.02), 0.6, F(0.6) + 0.006], [sx * (x + 0.03), 0.715, L(0.7)], [sx * (x + 0.02), 0.6, Bk(0.6) - 0.006], [sx * x, yb, Bk(yb) - 0.006]], 0.028, 0.028, 0.008, u => (u < 0.5 ? new V3(0, 0.5 - u, 1) : new V3(0, u - 0.5, -1)).normalize(), { seg: 16 }));
    },
  };
  return ctx;
}

/** Arms from the shoulders to the wheel, with sleeves; hands are mittens gripping at ten and two. */
function arms(ctx, { mat = 'top', len = 'long', cuff = null, puff = false, glove = false } = {}) {
  const { b, P, joints } = ctx;
  const ra = P.arm, rf = P.arm * (P.buff ? 0.95 : 0.84);
  for (const sx of [1, -1]) {
    const { sh, el, wr, hd } = joints(sx);
    b.add(mat, sphere(ra * 1.45, 10, 8), { p: sh, s: [1, 1, 0.95] });
    const fore = len === 'long' ? mat : 'skin';
    if (len === 'short') {
      b.add(mat, limb(sh, mix3(sh, el, 0.55), ra * 1.3, ra * 1.25, 12));
      b.add(mat, ringAround(mix3(sh, el, 0.55), sub3(el, sh), ra * 1.22, 0.012, 5, 14));
      b.add('skin', limb(mix3(sh, el, 0.3), el, ra * 0.9, ra * 0.82));
    } else if (puff) {
      for (let i = 0; i < 3; i++) b.add(mat, sphere(ra * 1.18, 8, 6), { p: mix3(sh, el, 0.18 + i * 0.32) });
      b.add(mat, limb(sh, el, ra * 1.05, ra));
    } else b.add(mat, limb(sh, el, ra, ra * 0.92));
    if (P.buff) b.add(len === 'short' ? 'skin' : mat, sphere(ra * 1.3, 12, 9), { p: mix3(sh, el, 0.5), s: [1.1, 1.25, 1.1] });
    // elbow and forearm
    b.add(len === 'short' ? 'skin' : mat, sphere(ra * 0.95, 10, 8), { p: el });
    if (len === 'rolled') {
      b.add(mat, ringAround(mix3(el, wr, 0.08), sub3(wr, el), ra * 0.92, ra * 0.32, 6, 14));
      b.add('skin', limb(el, wr, rf * 1.02, rf * 0.8));
    } else if (puff) {
      for (let i = 0; i < 2; i++) b.add(fore, sphere(rf * 1.22, 8, 6), { p: mix3(el, wr, 0.25 + i * 0.4) });
      b.add(fore, limb(el, wr, rf, rf * 0.9));
    } else b.add(fore, limb(el, wr, rf, rf * 0.82));
    if (len === 'long') b.add(cuff ?? mat, limb(mix3(el, wr, 0.82), mix3(el, wr, 1.04), rf * 0.98, rf * 0.98, 10));
    // wrist and hand
    const hm = glove ? 'glove' : 'skin';
    b.add(hm, limb(wr, hd, rf * 0.62, rf * 0.6, 8));
    b.add(hm, sphere(0.07, 10, 8), { p: hd, s: [0.95, 0.8, 1.15] });
    b.add(hm, sphere(0.03, 8, 6), { p: [hd[0] - sx * 0.042, hd[1] + 0.036, hd[2] + 0.025], s: [1, 1, 1.3] });
    if (glove) b.add('glove2', ringAround(mix3(wr, hd, 0.1), sub3(hd, wr), rf * 0.72, 0.02, 5, 12));
  }
}

/* ---------- signature props, worn on the back where the chase camera sees them ---------- */
const PROPS = {
  /** the flamethrower that is legally not a flamethrower, slung across the back with the pilot light on */
  flamethrower(ctx) {
    const { b, Bk } = ctx, zb = Bk(0.62) - 0.19, ang = 0.92, d = [Math.sin(ang), Math.cos(ang)], n = [Math.cos(ang), -Math.sin(ang)];
    const o = [-0.28, 0.46], at = (t, u = 0) => [o[0] + d[0] * t + n[0] * u, o[1] + d[1] * t + n[1] * u, zb], r = [0, 0, -ang];
    b.add('white', box(0.13, 0.26, 0.085, 0.03, 1), { p: at(0.1, 0.02), r });          // stock
    b.add('white', box(0.115, 0.52, 0.095, 0.035, 1), { p: at(0.46), r });             // body
    b.add('black', box(0.05, 0.4, 0.1, 0.012, 1), { p: at(0.5, -0.02), r });           // the stripe down the side
    b.add('black', box(0.07, 0.15, 0.06, 0.02, 1), { p: at(0.3, 0.1), r: [0, 0, -ang + 0.35] });   // grip
    b.add('steel', cyl(0.06, 0.06, 0.24, 14), { p: at(0.56, 0.115), r });              // the gas bottle underneath
    b.add('saw', cyl(0.03, 0.045, 0.05, 12), { p: at(0.7, 0.115), r });
    b.add('black', cyl(0.042, 0.048, 0.5, 12), { p: at(0.95), r });                     // barrel
    b.add('saw', cyl(0.078, 0.058, 0.15, 14), { p: at(1.25), r });                      // nozzle
    b.add('flame', cyl(0.004, 0.1, 0.5, 14), { p: at(1.57), r });
    b.add('flame2', cyl(0.004, 0.05, 0.22, 10), { p: [at(1.44)[0], at(1.44)[1], zb - 0.07], r });
    b.add('flame', sphere(0.085, 12, 8), { p: at(1.34) });
    ctx.straps('black', 0.56);
  },
  /** a sack of money on the back: the seven-trillion ask. Slung low and well behind
      the neck so the knotted top stays out of the bobblehead's swing. */
  moneybag(ctx) {
    const { b, Bk } = ctx, c = [0, 0.67, Bk(0.62) - 0.34];
    const prof = [[0.001, -0.25], [0.15, -0.235], [0.24, -0.14], [0.265, -0.02], [0.24, 0.1], [0.15, 0.19], [0.07, 0.24], [0.065, 0.27], [0.09, 0.3], [0.095, 0.33], [0.05, 0.35], [0.001, 0.345]];
    b.add('sack', lathe(prof, 18), { p: c });
    b.add('twine', torus(0.07, 0.016, 6, 14), { p: [c[0], c[1] + 0.255, c[2]], r: [PI / 2, 0, 0] });
    const rAt = y => { for (let i = 0; i < prof.length - 1; i++) if (y >= prof[i][1] && y <= prof[i + 1][1]) { const t = (y - prof[i][1]) / (prof[i + 1][1] - prof[i][1]); return prof[i][0] + (prof[i + 1][0] - prof[i][0]) * t; } return 0.1; };
    const onSack = (x, y) => [c[0] + x, c[1] + y, c[2] - Math.sqrt(Math.max(0.0004, rAt(y) ** 2 - x * x)) - 0.012];
    // the dollar sign, mirrored so it reads from behind
    const S = [[-0.075, 0.095], [0, 0.12], [0.075, 0.085], [0.065, 0.025], [0, 0.0], [-0.065, -0.025], [-0.075, -0.085], [0, -0.12], [0.075, -0.095]];
    b.add('ink', tube(S.map(([x, y]) => onSack(x, y)), 0.022, 24, 6));
    b.add('ink', tube([onSack(0, 0.165), onSack(0, 0.0), onSack(0, -0.165)], 0.018, 6, 6));
    ctx.straps('twine', 0.5);
  },
  /** a little robot co-pilot riding on the shoulder, whether you asked for it or not.
      Sized and perched so it reads at race distance: outboard of the head's silhouette,
      not buried in it (at the old 1.6 scale its head sat inside the skull). */
  copilot(ctx) {
    let { b, P, L } = ctx, x = P.sw + 0.11, y = 0.83, z = L(0.74) - 0.05;
    const K = 1.95, o = b; b = { add: (m, g, t = {}) => o.add(m, g, { p: [x + (t.p[0] - x) * K, y + (t.p[1] - y) * K, z + (t.p[2] - z) * K], s: (typeof t.s === 'number' ? t.s : (t.s ?? [1, 1, 1]).map(v => v * K)), r: t.r }) };
    b.add('bot', sphere(0.09, 14, 10), { p: [x, y, z], s: [1, 0.9, 1] });
    b.add('bot', sphere(0.08, 14, 10), { p: [x, y + 0.13, z] });
    b.add('black', sphere(0.066, 14, 10), { p: [x, y + 0.135, z + 0.028], s: [1, 0.72, 0.75] });
    for (const sx of [1, -1]) b.add('eye', sphere(0.014, 8, 6), { p: [x + sx * 0.026, y + 0.14, z + 0.077] });
    b.add('bot', cyl(0.007, 0.007, 0.09, 5), { p: [x, y + 0.24, z] });
    b.add('eye', sphere(0.022, 8, 6), { p: [x, y + 0.29, z] });
    for (const sx of [1, -1]) b.add('bot', sphere(0.024, 8, 6), { p: [x + sx * 0.085, y + 0.13, z] });
  },
  /** the price tag nobody took off, flapping behind */
  pricetag(ctx) {
    const { b, Bk } = ctx, z0 = Bk(0.76);
    b.add('twine', tube([[0, 0.77, z0], [0.03, 0.86, z0 - 0.14], [0.12, 0.95, z0 - 0.36], [0.21, 0.96, z0 - 0.54]], 0.008, 10, 4));
    const tg = new THREE.BoxGeometry(0.5, 0.25, 0.014);
    b.add('tag', tg, { p: [0.32, 0.86, z0 - 0.62], r: [0.35, 0.2, -0.12] });
  },
};

/* ---------- outfits ---------- */
const KITS = {
  /** black puffer jacket over a black tee, collar up, a plain white pin */
  puffer: { P: { sw: 0.335, chest: 0.205, arm: 0.086 }, mats: { top: [0x16171b, 0.38, 0.05], under: [0x0a0a0c, 0.85] }, dress(c) {
    c.torso('top', { ribbed: 0.045 });
    c.vee('under', 0.73, 0.56, 0.075, 0.012);
    c.stand('collar', [[0.15, 0.69], [0.172, 0.74], [0.165, 0.82], [0.152, 0.84]], 0.9);
    c.frontStrip('steel', 0.04, 0.56, 0.008, 0.008, 0.016, 0.004);
    c.b.add('white', cyl(0.05, 0.05, 0.014, 18), { p: [0.14, 0.5, c.F(0.5) + 0.006], r: [PI / 2 - 0.15, 0, 0] });
    arms(c, { puff: true, cuff: 'under' });
  } },
  /** green henley, sleeves pushed up */
  henley: { P: { sw: 0.295, chest: 0.19 }, mats: { top: [0x5f9a78, 0.85], top2: [0x4c8165, 0.85] }, dress(c) {
    c.torso('top');
    c.crew('top2', 0.735, 0.135, 0.024);
    c.frontStrip('top2', 0.56, 0.735, 0.03, 0.03, 0.008, 0.006);
    c.buttons('white', [0.6, 0.65, 0.7], 0.013);
    arms(c, { len: 'rolled' });
  } },
  /** plain crew-neck tee */
  tee: { P: { sw: 0.3, chest: 0.19 }, mats: { top: [null, 0.85] }, dress(c) {
    c.torso('top');
    c.crew('top', 0.735, 0.135, 0.024);
    arms(c, { len: 'short' });
  } },
  /** denim shirt, puffer vest, and arms that have clearly been to the gym */
  vest: { P: { sw: 0.37, chest: 0.23, arm: 0.1, buff: true }, mats: { top: [0x4a72aa, 0.8], top2: [0x1c2533, 0.4, 0.05] }, dress(c) {
    c.torso('top');
    const vs = [];
    for (let i = 0; i <= 11; i++) { const y = 0.08 + i * 0.054, s = at(c.secs, y), q = i % 2 ? 1.03 : 1.0; vs.push({ ...s, w: s.w * q + 0.025, f: s.f * q + 0.025, k: s.k * q + 0.025 }); }
    c.b.add('top2', vshell(vs, { a0: -PI / 2 + 0.2, a1: PI * 1.5 - 0.2, steps: 2 }));
    c.points('top', 0.07);
    c.buttons('white', [0.3, 0.4, 0.5, 0.6], 0.012);
    arms(c, { len: 'rolled' });
  } },
  /** black leather jacket with a huge collar, black tee */
  leather: { P: { sw: 0.32, chest: 0.2 }, mats: { top: [0x121215, 0.28, 0.25], lapel: [0x1d1d22, 0.22, 0.3], under: [0x2a2b30, 0.9] }, dress(c) {
    c.torso('top');
    c.vee('lapel', 0.74, 0.32, 0.16, 0.012);
    c.vee('under', 0.74, 0.44, 0.085, 0.022);
    c.stand('collar', [[0.14, 0.68], [0.18, 0.77], [0.24, 0.87], [0.3, 0.94]], 1.5);
    c.b.add('steel', strip([[0.1, 0.62, c.F(0.62) + 0.02], [0.16, 0.48, c.F(0.48) + 0.012], [0.2, 0.3, c.F(0.3) + 0.004]], 0.006, 0.006, 0.004, () => new V3(0, 0, 1), { seg: 8 }));
    c.b.add('lapel', vshell([at(c.secs, 0.02), at(c.secs, 0.1)], { grow: 0.012 }));
    arms(c, { cuff: 'lapel' });
  } },
  /** navy suit, open-collar shirt, no tie */
  suit: { P: { sw: 0.31, chest: 0.19 }, mats: { top: [null, 0.6], lapel: [null, 0.42, 0, 1.18], under: [0xa8c4e4, 0.7] }, dress(c) {
    c.torso('top');
    c.vee('lapel', 0.74, 0.3, 0.15, 0.012);
    c.vee('under', 0.74, 0.42, 0.085, 0.02);
    c.points('under', 0.07);
    c.buttons('black', [0.24, 0.33], 0.016);
    arms(c, { cuff: 'under' });
  } },
  /** suit jacket over a black tee */
  suitTee: { P: { sw: 0.3, chest: 0.19 }, mats: { top: [null, 0.6], lapel: [null, 0.42, 0, 1.18], under: [0x15161a, 0.9] }, dress(c) {
    c.torso('top');
    c.vee('lapel', 0.74, 0.3, 0.15, 0.012);
    c.vee('under', 0.74, 0.4, 0.1, 0.02);
    c.crew('under', 0.73, 0.125, 0.02);
    arms(c, {});
  } },
  /** purple shirt under a hi-vis safety vest */
  hivis: { P: { sw: 0.3, chest: 0.2, belly: 0.02 }, mats: { top: [null, 0.8], band: [0xd9dde3, 0.25, 0.6] }, dress(c) {
    c.torso('top');
    c.points('top', 0.07);
    c.buttons('white', [0.6, 0.66], 0.011);
    const vs = []; for (let i = 0; i <= 6; i++) vs.push(at(c.secs, 0.1 + i * 0.09));
    c.b.add('vest', vshell(vs, { a0: -PI / 2 + 0.22, a1: PI * 1.5 - 0.22, grow: 0.022 }));
    for (const y of [0.24, 0.42]) c.b.add('band', vshell([at(c.secs, y), at(c.secs, y + 0.05)], { a0: -PI / 2 + 0.24, a1: PI * 1.5 - 0.24, grow: 0.03, steps: 1 }));
    for (const sx of [1, -1]) c.b.add('band', strip([[sx * 0.13, 0.5, c.F(0.5) + 0.03], [sx * 0.15, 0.66, c.F(0.66) + 0.02], [sx * 0.16, 0.725, c.L(0.7)], [sx * 0.15, 0.62, c.Bk(0.62) - 0.03], [sx * 0.13, 0.4, c.Bk(0.4) - 0.03], [sx * 0.12, 0.12, c.Bk(0.12) - 0.03]], 0.03, 0.03, 0.005, u => (u < 0.4 ? new V3(0, 0.4 - u, 1) : new V3(0, u * 0.2 - 0.08, -1)).normalize(), { seg: 20 }));
    arms(c, {});
  } },
  /** navy suit, white shirt, and a very long red tie streaming back over the shoulder */
  suitTie: { P: { sw: 0.37, chest: 0.23, belly: 0.08, arm: 0.084 }, mats: { top: [null, 0.6], lapel: [null, 0.42, 0, 1.18], under: [0xf6f6f2, 0.6] }, dress(c) {
    c.torso('top');
    c.vee('lapel', 0.74, 0.24, 0.17, 0.012);
    c.vee('under', 0.74, 0.32, 0.095, 0.022);
    c.points('under', 0.07);
    const kz = c.F(0.7) + 0.03;
    c.b.add('tie', box(0.075, 0.06, 0.05, 0.02, 1), { p: [0, 0.705, kz - 0.01], r: [-0.2, 0, 0] });
    // the narrow blade hangs into the lap, the wide one has blown up over his shoulder
    c.frontStrip('tie', 0.69, -0.02, 0.03, 0.045, 0.03, 0.008, { point: true });
    const Fb = c.Bk(0.72);
    c.b.add('tie', strip([[0, 0.69, kz], [-0.07, 0.76, kz - 0.02], [-0.13, 0.81, c.L(0.8)], [-0.13, 0.83, Fb - 0.06], [-0.06, 0.95, -0.45], [-0.22, 1.04, -0.75], [0.02, 1.1, -1.05], [-0.2, 1.15, -1.35], [-0.02, 1.2, -1.66]], 0.075, 0.1, 0.012,
      u => (u < 0.22 ? new V3(0, u * 3, 1) : new V3(Math.sin(u * 9) * 0.5, 1, 0.15)).normalize(), { seg: 40, point: true }));
    c.buttons('black', [0.2], 0.018);
    arms(c, { cuff: 'under' });
  } },
  /** black polo shirt, collar and placket */
  polo: { P: { sw: 0.3, chest: 0.19 }, mats: { top: [null, 0.75], top2: [0x2a2c31, 0.75] }, dress(c) {
    c.torso('top');
    c.stand('collarTop', [[0.135, 0.7], [0.15, 0.755], [0.168, 0.785]], 1.3);
    for (const sx of [1, -1]) c.b.add('top', box(0.11, 0.075, 0.016, 0.008, 1), { p: [sx * 0.07, 0.71, c.F(0.71) + 0.004], r: [-0.4, sx * 0.4, sx * 0.85] });
    c.frontStrip('top2', 0.58, 0.72, 0.028, 0.028, 0.008, 0.006);
    c.buttons('top2', [0.62, 0.68], 0.012);
    arms(c, { len: 'short' });
  } },
  /** grey knit sweater over a collared blue shirt */
  sweater: { P: { sw: 0.3, chest: 0.2, belly: 0.03 }, mats: { top: [null, 0.95], top2: [null, 0.95, 0, 0.88], under: [0x9db8d8, 0.7] }, dress(c) {
    c.b.add('top', ribs(vshell(c.secs, { ring: 48 }), 40, 0.004));
    c.b.add('top2', ribs(vshell([at(c.secs, 0.0), at(c.secs, 0.08)], { grow: 0.012, ring: 40, steps: 1 }), 48, 0.005));
    c.crew('top2', 0.73, 0.13, 0.03);
    c.points('under', 0.06, 0.745);
    arms(c, { cuff: 'top2' });
  } },
  /** dark suit and a crisp white shirt, collar open */
  trench: { P: { sw: 0.3, chest: 0.185 }, mats: { top: [null, 0.62], lapel: [null, 0.4, 0, 1.25], under: [0xf4f4f0, 0.6] }, dress(c) {
    c.torso('top');
    c.vee('lapel', 0.74, 0.34, 0.14, 0.012);
    c.vee('under', 0.74, 0.46, 0.08, 0.02);
    c.points('under', 0.065);
    c.buttons('black', [0.28], 0.016);
    arms(c, { cuff: 'under' });
  } },
  /** a black turtleneck, rolled right up to the chin */
  turtleneck: { P: { sw: 0.265, chest: 0.175, arm: 0.066 }, mats: { top: [null, 0.9] }, dress(c) {
    c.torso('top');
    for (const [y, r] of [[0.72, 0.15], [0.765, 0.145], [0.81, 0.14], [0.85, 0.137]]) c.b.add('top', torus(r, 0.04, 8, 22), { p: [0, y, c.neckZ], r: [PI / 2, 0, 0] });
    c.b.add('silver', torus(0.15, 0.007, 4, 28), { p: [0, 0.64, c.L(0.64) + 0.04], r: [PI / 2 - 0.75, 0, 0] });
    c.b.add('silver', box(0.09, 0.03, 0.01, 0.006, 1), { p: [0, 0.535, c.F(0.535) + 0.012] });
    arms(c, {});
  } },
  /** red-and-white racing suit, zipped, with gloves */
  racing: { P: { sw: 0.32, chest: 0.2 }, mats: { top: [null, 0.5], top2: [0xf4f1ea, 0.5] }, dress(c) {
    c.torso('top');
    c.b.add('top2', vshell([at(c.secs, 0.52), at(c.secs, 0.6), at(c.secs, 0.66), at(c.secs, 0.72)], { grow: 0.006 }));
    for (const a of [0, PI]) c.b.add('top2', vshell([at(c.secs, 0.04), at(c.secs, 0.27), at(c.secs, 0.5)], { a0: a - 0.2, a1: a + 0.2, grow: 0.005, ring: 6 }));
    c.stand('collarTop2', [[0.16, 0.7], [0.165, 0.76], [0.16, 0.8]], 0.25);
    c.frontStrip('steel', 0.1, 0.76, 0.008, 0.008, 0.012, 0.004);
    arms(c, { glove: true, cuff: 'top2' });
  } },
  /** the old-school mogul: dark suit over a black shirt */
  oldsuit: { P: { sw: 0.28, chest: 0.19, belly: 0.04, hunch: 0.12 }, mats: { top: [null, 0.62], lapel: [null, 0.45, 0, 1.2], under: [0x121215, 0.85] }, dress(c) {
    c.torso('top');
    c.vee('lapel', 0.74, 0.3, 0.15, 0.012);
    c.vee('under', 0.74, 0.42, 0.09, 0.02);
    c.crew('under', 0.73, 0.125, 0.022);
    c.buttons('black', [0.25, 0.34], 0.016);
    arms(c, { cuff: 'under' });
  } },
};
const DEFAULT_KIT = { suit: 'suit', jacket: 'leather', turtleneck: 'turtleneck', racing: 'racing', sweater: 'sweater', shirt: 'hivis', polo: 'polo' };

/** Build one head (group pivoted at the neck). */
function buildHead(look, faceId) {
  const head = new THREE.Group(); head.name = 'head';
  const face = FACES[faceId];
  const skin = new THREE.Color(face ? face.skin : look.skin);
  const skinMat = new THREE.MeshStandardMaterial({ color: skin, roughness: 0.62, metalness: 0, envMapIntensity: 0.6 });
  const R = HEAD_R, cy = R * 1.02;        // head centre above the neck pivot
  const b = new ModelBuilder();

  // skull, ears, and a neck long enough to see
  b.add('skin', sphere(R, 32, 24), { p: [0, cy, 0], s: [1, 1.07, 1.02] });
  for (const sx of [1, -1]) b.add('skin', sphere(0.1, 12, 10), { p: [sx * R * 0.98, cy - 0.03, -0.02], s: [0.5, 1, 0.8] });
  b.add('skin', cyl(0.128, 0.142, 0.26, 16), { p: [0, -0.04, -0.01] });
  b.add('skin', sphere(0.13, 14, 8), { p: [0, 0.08, -0.01], s: [1.05, 0.7, 1] });

  const top = cy + R * 1.07;
  if (look.hat === 'cowboy') {
    b.add('hat', lathe([[0, 0.34], [0.2, 0.33], [0.26, 0.24], [0.3, 0.06], [0.33, 0.0]], 24), { p: [0, top - 0.14, 0], s: [1.08, 1, 1.08] });
    const brim = torus(0.5, 0.045, 8, 32); b.add('hat', brim, { p: [0, top - 0.13, 0], r: [Math.PI / 2, 0, 0], s: [1.1, 1.1, 1.6] });
    b.add('hat', cyl(0.5, 0.5, 0.03, 28), { p: [0, top - 0.135, 0], s: [1.1, 1, 1.1] });
    b.add('hatband', cyl(0.34, 0.34, 0.06, 24, true), { p: [0, top - 0.08, 0], s: [1.06, 1, 1.06] });
  } else if (look.hat === 'cap') {
    const g = new THREE.SphereGeometry(R * 1.07, 24, 10, 0, Math.PI * 2, 0, Math.PI * 0.44);
    b.add('hat', g, { p: [0, cy + 0.02, 0], r: [-0.12, 0, 0], s: [1, 1.05, 1.02] });
    b.add('hat', box(0.44, 0.03, 0.3, 0.014, 2), { p: [0, cy + R * 0.42, R * 0.98], r: [0.14, 0, 0] });
    b.add('hatband', sphere(0.035, 8, 6), { p: [0, cy + R * 1.13, -0.02] });
  }
  if (look.prop === 'smartglass') {
    // a thin titanium band across the brow, with the little prism over one eye
    const ey = cy + 0.07, pts = [];
    for (let i = 0; i <= 10; i++) { const a = -1.45 + 2.9 * i / 10; pts.push([Math.sin(a) * R * 1.07, ey, Math.cos(a) * R * 1.1]); }
    b.add('silver', tube(pts, 0.011, 20, 5));
    b.add('prism', box(0.08, 0.05, 0.05, 0.012, 1), { p: [-0.16, ey - 0.02, R * 1.06], r: [0, -0.35, 0] });
  }

  const hatColor = look.hat === 'cowboy' ? 0x8a5a34 : (look.accent ?? 0x222222);
  const g = b.build({ skin: skinMat, hat: plastic(hatColor, 0.75), hatband: plastic(look.hat === 'cowboy' ? 0x3a2414 : 0xffffff, 0.6), silver: plastic(0xc9ced6, 0.25, 1), prism: plastic(0x9fd8ff, 0.08, 0.2), default: skinMat });
  head.add(g);
  const hair = buildHair(look, faceId, R, cy, skin.getHex());
  if (hair) head.add(hair);

  // the face: a patch of sphere just proud of the skull, carrying the generated texture
  if (face) {
    const span = Math.PI * 0.86, tStart = Math.PI * 0.2, tLen = Math.PI * 0.62;
    const fg = new THREE.SphereGeometry(R * 1.006, 28, 22, Math.PI / 2 - span / 2, span, tStart, tLen);
    const fm = new THREE.MeshStandardMaterial({ map: faceTexture(face.img), transparent: true, roughness: 0.62, metalness: 0, envMapIntensity: 0.6, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 });
    const fmesh = new THREE.Mesh(fg, fm);
    fmesh.position.set(0, cy, 0); fmesh.scale.set(1, 1.07, 1.02); fmesh.name = 'face'; fmesh.renderOrder = 1;
    head.add(fmesh);
    head.userData.face = fmesh;
  }
  head.userData.center = cy;
  return head;
}

/**
 * Build a driver. Returns a Group with userData: { head, torso } for animation.
 * Origin is the seat (hips); +Z is forward.
 */
export function buildDriver(racer, { scale = 1, faceId = racer.id, look = racer.look } = {}) {
  const g = new THREE.Group(); g.name = 'driver';
  const torso = new THREE.Group(); torso.name = 'torso'; g.add(torso);
  const kit = KITS[look.kit] ?? KITS[DEFAULT_KIT[look.outfit]] ?? KITS.tee;
  const P = { ...BUILD, ...kit.P };
  const b = new ModelBuilder();
  const face = FACES[faceId];
  const skinHex = new THREE.Color(face ? face.skin : look.skin).getHex();
  const top = look.top ?? 0x333333, accent = look.accent ?? 0xffffff;

  const c = makeCtx(b, P);
  kit.dress(c);
  if (look.chain) {
    b.add('gold', torus(0.155, 0.017, 6, 26), { p: [0, 0.68, c.L(0.68) + 0.035], r: [PI / 2 - 0.55, 0, 0] });
    b.add('pend', cyl(0.045, 0.045, 0.014, 16), { p: [0, 0.575, c.F(0.575) + 0.02], r: [PI / 2 - 0.2, 0, 0] });
  }
  if (look.prop === 'pendant') {
    b.add('silver', torus(0.15, 0.008, 4, 26), { p: [0, 0.66, c.L(0.66) + 0.045], r: [PI / 2 - 0.65, 0, 0] });
    b.add('pend', cyl(0.05, 0.05, 0.014, 18), { p: [0, 0.545, c.F(0.545) + 0.03], r: [PI / 2 - 0.2, 0, 0] });
    b.add('white', torus(0.03, 0.006, 4, 16, PI * 1.4), { p: [0, 0.545, c.F(0.545) + 0.04], r: [-0.2, 0, 0] });
  }
  PROPS[look.prop]?.(c);

  // materials: [colour (null = the racer's top), roughness, metalness, brightness]
  const km = kit.mats ?? {};
  const mk = (spec, fallback) => {
    if (!spec) return plastic(fallback, 0.75);
    const [col, rough = 0.75, metal = 0, lift = 1] = spec;
    const base = new THREE.Color(col ?? top);
    if (lift !== 1) base.multiplyScalar(lift);
    return plastic(base.getHex(), rough, metal);
  };
  const topMat = mk(km.top, top);
  const mats = {
    top: topMat, top2: mk(km.top2, top), lapel: mk(km.lapel, top), under: mk(km.under, 0xf4f4f0), band: mk(km.band, 0xdddddd),
    collar: doubleSided(topMat.color.getHex(), topMat.roughness, topMat.metalness),
    collarTop: doubleSided(topMat.color.getHex(), topMat.roughness), collarTop2: doubleSided(mk(km.top2, top).color.getHex(), 0.5),
    skin: plastic(skinHex, 0.62), glove: plastic(0xf4f1ea, 0.6), glove2: plastic(look.top ?? 0xc8222a, 0.5),
    tie: plastic(look.tie ?? 0xd8232a, 0.45), vest: fluoro(0xd8f23a),
    gold: plastic(0xffcf4a, 0.25, 1), silver: plastic(0xc9ced6, 0.25, 1), steel: MAT.chrome, white: MAT.white, black: MAT.black,
    pend: plastic(accent, 0.3, 0.3), saw: plastic(0xf06a1a, 0.45), flame: glow(0xff8a1e, 3.2), flame2: glow(0x9fd4ff, 3.4), sack: plastic(0xc49a5c, 0.95), twine: plastic(0x8a6a3a, 0.9), ink: plastic(0x1e7a3c, 0.55),
    bot: plastic(0xf2f4f7, 0.3), eye: glow(0x5ce1ff, 2.2),
    tag: cached('tagmat', () => new THREE.MeshStandardMaterial({ map: priceTag(), roughness: 0.7 })),
    default: MAT.dark,
  };
  torso.add(b.build(mats));

  const head = buildHead(look, faceId);
  head.position.set(0, NECK_Y - P.hunch * 0.08, c.L(0.8) + 0.03 + P.hunch * 0.25);
  torso.add(head);

  g.scale.setScalar(scale);
  g.userData = { head, torso };
  return g;
}

/** Preload every face texture (resolves when they are decoded). */
export function preloadFaces() {
  return Promise.all(Object.values(FACES).map(f => new Promise(res => { const t = texLoader.load(f.img, () => res(), undefined, () => res()); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; faceCache.set(f.img, t); })));
}
