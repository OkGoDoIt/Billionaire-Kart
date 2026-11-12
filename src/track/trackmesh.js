/* Builds everything you see of a track from the Track data: road, kerbs, shoulders,
   boundary hoardings, walls, ramps, boost pads, start line, and terrain that is
   generated from the spline so the road edge always sits on the ground. */
import * as THREE from 'three';
import { EDGE, KERB_W, KERB_H } from './track.js';
import { clamp, lerp, smoothstep, mod, fbm, noise2 } from '../core/util.js';
import { roadSkin, kerbTexture, detailTexture, meadowTexture, checkerTexture, bannerTexture, DEFAULT_ADS } from '../render/textures.js';

/* ---------- tiny geometry builder ---------- */
export class Geo {
  constructor(color = false) { this.p = []; this.n = []; this.u = []; this.c = color ? [] : null; this.i = []; this.count = 0; }
  v(x, y, z, nx, ny, nz, u = 0, w = 0, r = 1, g = 1, b = 1) {
    this.p.push(x, y, z); this.n.push(nx, ny, nz); this.u.push(u, w);
    if (this.c) this.c.push(r, g, b);
    return this.count++;
  }
  /** Quad from four vertex indices given as (right-back, left-back, right-front, left-front); faces +normal. */
  quad(rb, lb, rf, lf) { this.i.push(rb, rf, lb, lb, rf, lf); }
  tri(a, b, c) { this.i.push(a, b, c); }
  build(computeNormals = false) {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.p, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(this.n, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(this.u, 2));
    if (this.c) g.setAttribute('color', new THREE.Float32BufferAttribute(this.c, 3));
    g.setIndex(this.count > 65535 ? new THREE.Uint32BufferAttribute(this.i, 1) : new THREE.Uint16BufferAttribute(this.i, 1));
    if (computeNormals) g.computeVertexNormals();
    g.computeBoundingSphere(); g.computeBoundingBox();
    return g;
  }
}

const col = new THREE.Color();
const rgb = (hex, out = [0, 0, 0]) => { col.set(hex); out[0] = col.r; out[1] = col.g; out[2] = col.b; return out; };
const mix3 = (a, b, t, out = [0, 0, 0]) => { out[0] = lerp(a[0], b[0], t); out[1] = lerp(a[1], b[1], t); out[2] = lerp(a[2], b[2], t); return out; };

export const DEFAULT_LOOK = {
  road: { base: 0x5b6170, line: 0xffffff, center: 0xffd23c },
  kerb: [0xe23b3b, 0xf7f7f2],
  shoulder: 0xc9b27e,
  terrain: { low: 0x62b24a, high: 0x8fcf5b, dry: 0xb7c765, rock: 0x9a8f86, sand: 0xe8d5a0, dirt: 0xb99a6b, snow: null, snowLine: 1e9 },
  wall: 0xf1f1ee, wallStripe: 0xe23b3b,
  ads: DEFAULT_ADS,
};

/** Shared uniforms animated by the renderer each frame. */
export const trackUniforms = { uTime: { value: 0 } };

export function buildTrackMesh(track, look = {}) {
  const L = { ...DEFAULT_LOOK, ...look, terrain: { ...DEFAULT_LOOK.terrain, ...(look.terrain || {}) }, road: { ...DEFAULT_LOOK.road, ...(look.road || {}) } };
  const group = new THREE.Group(); group.name = 'track';
  const mats = {};
  const add = (name, geo, mat, { receive = true, cast = false, order = 0 } = {}) => {
    const m = new THREE.Mesh(geo, mat); m.name = name; m.receiveShadow = receive; m.castShadow = cast; m.renderOrder = order;
    m.matrixAutoUpdate = false; group.add(m); return m;
  };
  const { N, ds, px, py, pz, lx, ly, lz, ux, uy, uz, hwL, hwR } = track;

  /* ----- road: one mesh per surface skin ----- */
  {
    const K = 8, skins = [...new Set(track.skin)];
    for (const skin of skins) {
      const g = new Geo(), sk = roadSkin(skin, L.road), tile = sk.tile ?? 18;
      for (let r = 0; r < N; r++) {
        if (track.gap[r] || track.skin[r] !== skin) continue;
        const first = g.count;
        for (const rr of [r, r + 1]) {
          const i = rr % N;
          for (let j = 0; j <= K; j++) {
            const lat = lerp(-hwR[i], hwL[i], j / K);
            g.v(px[i] + lx[i] * lat, py[i] + ly[i] * lat, pz[i] + lz[i] * lat, ux[i], uy[i], uz[i], j / K, (rr * ds) / tile);
          }
        }
        for (let j = 0; j < K; j++) g.quad(first + j, first + j + 1, first + K + 1 + j, first + K + 2 + j);
      }
      const mat = new THREE.MeshStandardMaterial({ map: sk.map, roughness: sk.roughness ?? 0.82, metalness: sk.metalness ?? 0, envMapIntensity: sk.envMapIntensity ?? 0.5 });
      if (sk.emissiveMap) { mat.emissiveMap = sk.emissiveMap; mat.emissive.set(sk.emissive ?? 0xffffff); mat.emissiveIntensity = sk.emissiveIntensity ?? 1; }
      if (sk.transparent) { mat.transparent = true; mat.opacity = sk.opacity ?? 0.9; }
      mats['road_' + skin] = mat; if (skin === 'asphalt') mats.road = mat;
      add('road_' + skin, g.build(), mat);
    }
  }

  /* ----- kerbs (open edges only) ----- */
  {
    const g = new Geo();
    for (const side of [1, -1]) {
      const hw = side > 0 ? hwL : hwR, edge = side > 0 ? track.edgeL : track.edgeR;
      let prev = -1;
      for (let r = 0; r <= N; r++) {
        const i = r % N;
        if (edge[i] !== EDGE.OPEN || track.gap[i]) { prev = -1; continue; }
        const a = hw[i] * side, b = (hw[i] + KERB_W) * side;
        const v0 = g.v(px[i] + lx[i] * a, py[i] + ly[i] * a + 0.012, pz[i] + lz[i] * a, ux[i], uy[i], uz[i], 0, (r * ds) / 5);
        g.v(px[i] + lx[i] * b + ux[i] * KERB_H, py[i] + ly[i] * b + uy[i] * KERB_H, pz[i] + lz[i] * b + uz[i] * KERB_H, ux[i], uy[i], uz[i], 1, (r * ds) / 5);
        if (prev >= 0) { if (side > 0) g.quad(prev, prev + 1, v0, v0 + 1); else g.quad(prev + 1, prev, v0 + 1, v0); }
        prev = v0;
      }
    }
    mats.kerb = new THREE.MeshStandardMaterial({ map: kerbTexture(L.kerb[0], L.kerb[1]), roughness: 0.6, metalness: 0, envMapIntensity: 0.6 });
    if (g.count) add('kerbs', g.build(), mats.kerb);
  }

  /* ----- terrain colour function (shared by shoulders and terrain so they meet seamlessly) ----- */
  const T = L.terrain;
  const cLow = rgb(T.low), cHigh = rgb(T.high), cDry = rgb(T.dry), cRock = rgb(T.rock), cSand = rgb(T.sand), cDirt = rgb(T.dirt), cShoulder = rgb(L.shoulder);
  const cSnow = T.snow != null ? rgb(T.snow) : null;
  const tmpA = [0, 0, 0], tmpB = [0, 0, 0];
  const customColor = track.def.terrain?.color;
  const terrainColor = (x, z, h, slope, over, out) => {
    const n = fbm(x * 0.035, z * 0.035, 3, 21), n2 = noise2(x * 0.18, z * 0.18, 5);
    mix3(cLow, cHigh, smoothstep(0.3, 0.72, n), out);
    mix3(out, cDry, smoothstep(0.55, 0.9, fbm(x * 0.012, z * 0.012, 2, 44)) * 0.6, out);
    out[0] *= 0.93 + n2 * 0.14; out[1] *= 0.93 + n2 * 0.14; out[2] *= 0.93 + n2 * 0.14;
    if (cSnow && h > T.snowLine - 6) mix3(out, cSnow, smoothstep(T.snowLine - 6, T.snowLine + 4, h + n * 8), out);
    if (slope > 0.5) mix3(out, cRock, smoothstep(0.5, 0.95, slope), out);
    if (track.water != null && h < track.water + 1.6) mix3(out, cSand, 1 - smoothstep(track.water + 0.5, track.water + 1.6, h), out);
    if (over < 2.5) mix3(out, cDirt, (1 - smoothstep(0, 2.5, over)) * 0.55, out);
    if (customColor) customColor(x, z, h, slope, over, out);
    return out;
  };

  /* ----- shoulders ----- */
  {
    const g = new Geo(true);
    for (const side of [1, -1]) {
      const hw = side > 0 ? hwL : hwR, edge = side > 0 ? track.edgeL : track.edgeR, shA = side > 0 ? track.shL : track.shR;
      let prev = -1;
      for (let r = 0; r <= N; r++) {
        const i = r % N;
        if (edge[i] !== EDGE.OPEN || track.gap[i] || track.bridge[i]) { prev = -1; continue; }
        const sh = shA[i];
        // rows: kerb outer edge, mid shoulder, shoulder end, then a skirt that dives under the terrain
        const rows = [KERB_W, Math.max(KERB_W + 0.3, sh * 0.55), Math.max(KERB_W + 0.6, sh), Math.max(KERB_W + 0.6, sh) + 3.2];
        const first = g.count;
        for (let k = 0; k < rows.length; k++) {
          const over = rows[k], lat = (hw[i] + over) * side;
          const latC = clamp(lat, -(hwR[i] + track.shR[i] + 1), hwL[i] + track.shL[i] + 1);
          let x = px[i] + lx[i] * lat, z = pz[i] + lz[i] * lat;
          let y = py[i] + ly[i] * latC + (k === 0 ? KERB_H * 0.4 : 0) - (k === rows.length - 1 ? 1.1 : 0);
          const c = terrainColor(x, z, y, 0, over, tmpA);
          const t = k === 0 ? 0.85 : k === 1 ? 0.6 : 0;
          mix3(c, cShoulder, t, tmpB);
          g.v(x, y, z, ux[i], uy[i], uz[i], x * 0.11, z * 0.11, tmpB[0], tmpB[1], tmpB[2]);
        }
        if (prev >= 0) for (let k = 0; k < rows.length - 1; k++) { if (side > 0) g.quad(prev + k, prev + k + 1, first + k, first + k + 1); else g.quad(prev + k + 1, prev + k, first + k + 1, first + k); }
        prev = first;
      }
    }
    // look.groundTexture 'meadow': mown grass; look.groundDetail: how blotchy the ordinary ground is; look.groundMatte: no shine at all
    // (a standard material always reflects a little white light, which lifts the weakest channel of a saturated color)
    const groundMap = L.groundTexture === 'meadow' ? meadowTexture(7, matchMedia('(pointer: coarse)').matches ? 512 : 1024) : detailTexture(3, L.groundDetail ?? 0.2);
    mats.ground = L.groundMatte ? new THREE.MeshLambertMaterial({ vertexColors: true, map: groundMap }) : new THREE.MeshStandardMaterial({ vertexColors: true, map: groundMap, roughness: 1, metalness: 0, envMapIntensity: 0.35 });
    if (L.groundScale) mats.ground.map.repeat.set(L.groundScale, L.groundScale);   // look.groundScale: a finer grain
    if (g.count) add('shoulders', g.build(), mats.ground);
  }

  /* ----- terrain ----- */
  if (track.hasTerrain) {
    const gr = track.grid, { nx, nz, cell, x0, z0, H, S, D } = gr;
    const pos = new Float32Array(nx * nz * 3), colr = new Float32Array(nx * nz * 3), uvs = new Float32Array(nx * nz * 2);
    const Y = new Float32Array(nx * nz);
    for (let k = 0; k < nx * nz; k++) Y[k] = H[k] - 1.6 * (1 - smoothstep(-1.2, 1.4, S[k]));
    const c = [0, 0, 0];
    for (let iz = 0; iz < nz; iz++) for (let ix = 0; ix < nx; ix++) {
      const k = iz * nx + ix, x = x0 + ix * cell, z = z0 + iz * cell;
      pos[k * 3] = x; pos[k * 3 + 1] = Y[k]; pos[k * 3 + 2] = z;
      const hxa = H[iz * nx + Math.max(0, ix - 1)], hxb = H[iz * nx + Math.min(nx - 1, ix + 1)];
      const hza = H[Math.max(0, iz - 1) * nx + ix], hzb = H[Math.min(nz - 1, iz + 1) * nx + ix];
      const slope = Math.hypot(hxb - hxa, hzb - hza) / (2 * cell);
      terrainColor(x, z, H[k], slope, D[k], c);
      colr[k * 3] = c[0]; colr[k * 3 + 1] = c[1]; colr[k * 3 + 2] = c[2];
      uvs[k * 2] = x * 0.11; uvs[k * 2 + 1] = z * 0.11;
    }
    const idx = new Uint32Array((nx - 1) * (nz - 1) * 6); let q = 0;
    for (let iz = 0; iz < nz - 1; iz++) for (let ix = 0; ix < nx - 1; ix++) {
      const a = iz * nx + ix, b = a + 1, d = a + nx, e = d + 1;
      idx[q++] = a; idx[q++] = d; idx[q++] = b; idx[q++] = b; idx[q++] = d; idx[q++] = e;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('color', new THREE.BufferAttribute(colr, 3));
    g.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
    g.setIndex(new THREE.BufferAttribute(idx, 1));
    g.computeVertexNormals(); g.computeBoundingSphere(); g.computeBoundingBox();
    add('terrain', g, mats.ground);
  }

  /* ----- boundary hoardings (open edges) and walls ----- */
  {
    const gB = new Geo(), gW = new Geo(true);
    const hit = { y: 0 };
    const cWall = rgb(L.wall), cStripe = rgb(L.wallStripe);
    const bannerTex = bannerTexture(L.ads, 7, { set: track.def.id });   // the track's own boards where it has a set
    const BH = 1.4, adLen = BH * 2 * bannerTex.userData.boards; // 2:1 boards, side by side in one texture tile
    // a `sides` entry may set wallHeight to draw that stretch of wall lower (collision is unchanged)
    const wallH = [null, null];
    for (const r of track.def.sides || []) if (r.wallHeight != null) for (const i of track._range(r.from, r.to)) for (const k of [0, 1]) if (r.side !== (k ? 'L' : 'R')) { wallH[k] ||= new Float32Array(N).fill(1.05); wallH[k][i] = r.wallHeight; }
    for (const side of [1, -1]) {
      const hw = side > 0 ? hwL : hwR, edge = side > 0 ? track.edgeL : track.edgeR, outA = side > 0 ? track.outerL : track.outerR;
      let prevB = -1, prevW = -1;
      for (let r = 0; r <= N; r++) {
        const i = r % N;
        if (track.gap[i]) { prevB = prevW = -1; continue; }
        if (edge[i] === EDGE.OPEN && !track.bridge[i] && track.def.hoardings !== false && (side > 0 ? track.hoardL[i] : track.hoardR[i])) {
          prevW = -1;
          const lat = (hw[i] + outA[i]) * side;
          const x = px[i] + lx[i] * lat, z = pz[i] + lz[i] * lat;
          const y = track.terrainHeight(x, z) - 0.15;
          const nxn = -lx[i] * side, nzn = -lz[i] * side; // faces the road
          const v0 = g2v(gB, x, y, z, nxn, nzn, (r * ds) / adLen * (side > 0 ? 1 : -1), BH);
          if (prevB >= 0) { if (side > 0) gB.quad(v0, prevB, v0 + 1, prevB + 1); else gB.quad(prevB, v0, prevB + 1, v0 + 1); }
          prevB = v0;
        } else if (edge[i] === EDGE.WALL) {
          prevB = -1;
          // solid barrier at the road edge: inner face, top, outer face
          const a = hw[i] * side, b = (hw[i] + 0.55) * side, h = wallH[side > 0 ? 0 : 1]?.[i] ?? 1.05;
          const ax = px[i] + lx[i] * a, ay = py[i] + ly[i] * a, az = pz[i] + lz[i] * a;
          const bx = px[i] + lx[i] * b, by = py[i] + ly[i] * b, bz = pz[i] + lz[i] * b;
          const stripe = Math.floor((r * ds) / 4) % 2 === 0;
          const cc = stripe ? cStripe : cWall;
          const first = gW.count, inx = -lx[i] * side, inz = -lz[i] * side;
          gW.v(ax, ay - 0.3, az, inx, 0, inz, 0, 0, cWall[0], cWall[1], cWall[2]);
          gW.v(ax, ay + h * 0.55, az, inx, 0, inz, 0, 0.55, cWall[0], cWall[1], cWall[2]);
          gW.v(ax, ay + h * 0.55, az, inx, 0, inz, 0, 0.55, cc[0], cc[1], cc[2]);
          gW.v(ax, ay + h, az, inx, 0.3, inz, 0, 1, cc[0], cc[1], cc[2]);
          gW.v(bx, by + h, bz, -inx, 0.3, -inz, 1, 1, cc[0], cc[1], cc[2]);
          gW.v(bx, by - 2.5, bz, -inx, 0, -inz, 1, 0, cWall[0] * 0.8, cWall[1] * 0.8, cWall[2] * 0.8);
          if (prevW >= 0) {
            for (const k of [0, 2, 3, 4]) { if (side > 0) gW.quad(first + k, prevW + k, first + k + 1, prevW + k + 1); else gW.quad(prevW + k, first + k, prevW + k + 1, first + k + 1); }
          }
          prevW = first;
        } else { prevB = prevW = -1; }
      }
    }
    if (gB.count) {
      mats.banner = new THREE.MeshStandardMaterial({ map: bannerTex, roughness: 0.7, metalness: 0, side: THREE.DoubleSide, envMapIntensity: 0.4 });
      add('hoardings', gB.build(), mats.banner, { cast: true });
    }
    if (gW.count) {
      mats.wall = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.55, metalness: 0, envMapIntensity: 0.6 });
      add('walls', gW.build(), mats.wall, { cast: true });
    }
    void hit;
  }

  /* ----- bridges: deck sides, underside, and pillars ----- */
  {
    const g = new Geo(), gp = new Geo(); let any = false;
    const T = 1.1; // deck thickness
    let prev = -1;
    for (let r = 0; r <= N; r++) {
      const i = r % N;
      if (!track.bridge[i] || track.gap[i] || track.tunnel[i] || track.def.bridgeDeck === false) { prev = -1; continue; }
      any = true;
      const a = hwL[i] + 0.25, b = -hwR[i] - 0.25, first = g.count;
      const L = [px[i] + lx[i] * a, py[i] + ly[i] * a, pz[i] + lz[i] * a], R = [px[i] + lx[i] * b, py[i] + ly[i] * b, pz[i] + lz[i] * b];
      g.v(L[0], L[1] + 0.02, L[2], lx[i], 0, lz[i], 0, (r * ds) / 6); g.v(L[0], L[1] - T, L[2], lx[i], 0, lz[i], 0.3, (r * ds) / 6);
      g.v(R[0], R[1] - T, R[2], -lx[i], 0, -lz[i], 0.7, (r * ds) / 6); g.v(R[0], R[1] + 0.02, R[2], -lx[i], 0, -lz[i], 1, (r * ds) / 6);
      if (prev >= 0) { g.quad(first, prev, first + 1, prev + 1); g.quad(prev + 1, first + 1, prev + 2, first + 2); g.quad(prev + 2, first + 2, prev + 3, first + 3); }
      prev = first;
      // a pillar every ~26 m, down to the land or water below
      if (Math.round((r * ds) / 26) !== Math.round(((r - 1) * ds) / 26) && track.def.bridgePillars !== false) {
        const below = track.hasTerrain ? Math.max(track.terrainHeight(px[i], pz[i]), track.water ?? -1e3) : py[i] - 40;
        const top = py[i] - T, hgt = top - below + 2;
        if (hgt > 1.5) {
          const w = Math.min(a, 5), c = gp.count, tx = track.tx[i], tz = track.tz[i], lxx = lx[i], lzz = lz[i];
          for (const [su, sv] of [[1, 1], [1, -1], [-1, -1], [-1, 1]]) for (const y of [top, below - 2]) gp.v(px[i] + lxx * w * su + tx * 1.2 * sv, y, pz[i] + lzz * w * su + tz * 1.2 * sv, lxx * su, 0, lzz * su, 0, 0);
          for (let k = 0; k < 4; k++) { const n0 = c + k * 2, n1 = c + ((k + 1) % 4) * 2; gp.tri(n0, n0 + 1, n1); gp.tri(n1, n0 + 1, n1 + 1); }
        }
      }
    }
    if (any) {
      mats.deck = new THREE.MeshStandardMaterial({ color: L.deck ?? 0xd9dde6, roughness: 0.7, metalness: 0.1, side: THREE.DoubleSide });
      add('deck', g.build(), mats.deck, { cast: true });
      if (gp.count) add('pillars', gp.build(true), mats.deck, { cast: true });
    }
  }

  /* ----- glowing rails along void edges, so the drop is always readable ----- */
  {
    const g = new Geo(); let any = false;
    for (const side of [1, -1]) {
      const hw = side > 0 ? hwL : hwR, edge = side > 0 ? track.edgeL : track.edgeR; let prev = -1;
      for (let r = 0; r <= N; r++) {
        const i = r % N;
        if (edge[i] !== EDGE.VOID || track.gap[i]) { prev = -1; continue; }
        any = true;
        const a = (hw[i] - 0.05) * side, b = (hw[i] + 0.3) * side;
        const v0 = g.v(px[i] + lx[i] * a + ux[i] * 0.05, py[i] + ly[i] * a + uy[i] * 0.05, pz[i] + lz[i] * a + uz[i] * 0.05, ux[i], uy[i], uz[i], 0, r * ds * 0.25);
        g.v(px[i] + lx[i] * b + ux[i] * 0.16, py[i] + ly[i] * b + uy[i] * 0.16, pz[i] + lz[i] * b + uz[i] * 0.16, ux[i], uy[i], uz[i], 1, r * ds * 0.25);
        if (prev >= 0) { if (side > 0) g.quad(prev, prev + 1, v0, v0 + 1); else g.quad(prev + 1, prev, v0 + 1, v0); }
        prev = v0;
      }
    }
    if (any) {
      mats.rail = new THREE.MeshStandardMaterial({ color: 0x111111, emissive: L.rail ?? 0x35e0ff, emissiveIntensity: 2.4, roughness: 0.4, side: THREE.DoubleSide });
      add('rails', g.build(), mats.rail);
    }
  }

  /* ----- tunnels: an arched shell over the road with light strips ----- */
  {
    const g = new Geo(), gPort = new Geo(); let prev = -1, any = false;
    const ARC = 10, H = track.def.tunnelHeight ?? 7.5;
    for (let r = 0; r <= N; r++) {
      const i = r % N;
      if (!track.tunnel[i] || track.def.tunnelShell === false) { prev = -1; continue; }   // a track can build its own tunnel interior
      any = true;
      const first = g.count, a = hwL[i] + 0.7, b = hwR[i] + 0.7, mid = (a - b) / 2, half = (a + b) / 2;
      for (let k = 0; k <= ARC; k++) {
        const t = k / ARC, ang = Math.PI * t, lat = mid + Math.cos(ang) * half, up = Math.sin(ang) * H;
        const x = px[i] + lx[i] * lat + ux[i] * up, y = py[i] + ly[i] * lat + uy[i] * up, z = pz[i] + lz[i] * lat + uz[i] * up;
        g.v(x, y, z, -(lx[i] * Math.cos(ang) + ux[i] * Math.sin(ang)), -(ly[i] * Math.cos(ang) + uy[i] * Math.sin(ang)), -(lz[i] * Math.cos(ang) + uz[i] * Math.sin(ang)), t * 4, (r * ds) / 8);
      }
      if (prev >= 0) for (let k = 0; k < ARC; k++) g.quad(prev + k + 1, prev + k, first + k + 1, first + k);
      // portal face at each end: a thick arch ring facing outward
      const isEnd = !track.tunnel[(i + 1) % N] || !track.tunnel[mod(i - 1, N)];
      if (isEnd) {
        const c = gPort.count, out = 2.2;
        for (let k = 0; k <= ARC; k++) {
          const ang = Math.PI * (k / ARC);
          for (const e of [0, out]) { const lat = mid + Math.cos(ang) * (half + e), up = Math.sin(ang) * (H + e); gPort.v(px[i] + lx[i] * lat + ux[i] * up, py[i] + ly[i] * lat + uy[i] * up, pz[i] + lz[i] * lat + uz[i] * up, track.tx[i], 0, track.tz[i], k / ARC, e ? 1 : 0); }
          if (k) { const q = c + (k - 1) * 2; gPort.tri(q, q + 1, q + 2); gPort.tri(q + 2, q + 1, q + 3); }
        }
      }
      prev = first;
    }
    if (any) {
      const tex = (() => { const c = document.createElement('canvas'); c.width = 256; c.height = 256; const x = c.getContext('2d'); x.fillStyle = '#2a2f3d'; x.fillRect(0, 0, 256, 256); x.fillStyle = '#353b4c'; for (let k = 0; k < 4; k++) x.fillRect(k * 64 + 3, 3, 58, 250); x.fillStyle = '#fff6d8'; x.fillRect(120, 96, 16, 64); const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; return t; })();
      mats.tunnel = new THREE.MeshStandardMaterial({ map: tex, emissiveMap: tex, emissive: L.tunnelLight ?? 0xfff0c0, emissiveIntensity: 0.55, roughness: 0.6, side: THREE.DoubleSide });
      add('tunnel', g.build(), mats.tunnel);
      mats.portal = new THREE.MeshStandardMaterial({ color: L.portal ?? 0xcfd5e2, roughness: 0.7, side: THREE.DoubleSide });
      if (gPort.count) add('portals', gPort.build(), mats.portal, { cast: true });
    }
  }

  /* ----- ramps ----- */
  if (track.ramps.length) {
    const g = new Geo();
    const P = new THREE.Vector3();
    for (const rmp of track.ramps) {
      const steps = Math.max(4, Math.round(rmp.len / 1.2)), i0 = rmp.i0;
      const latA = rmp.full ? -track.hwR[i0] : rmp.lat - rmp.half, latB = rmp.full ? track.hwL[i0] : rmp.lat + rmp.half;
      let prev = -1;
      const lift = t => rmp.lift * (0.35 * t + 0.65 * t * t);
      for (let k = 0; k <= steps; k++) {
        const t = k / steps, s = rmp.s0 + rmp.len * t, h = lift(t) + 0.02;
        const first = g.count;
        for (const [lat, u] of [[latA, 0], [latB, 1]]) { track.pointAt(s, lat, P, h); g.v(P.x, P.y, P.z, 0, 1, 0, u, t * 3); }
        if (prev >= 0) g.quad(prev, prev + 1, first, first + 1);
        prev = first;
      }
      // lip face and sides
      const sEnd = rmp.s0 + rmp.len;
      const a = g.count;
      for (const [lat, u] of [[latA, 0], [latB, 1]]) { track.pointAt(sEnd, lat, P, rmp.lift + 0.02); g.v(P.x, P.y, P.z, 0, 0, 1, u, 0); track.pointAt(sEnd, lat, P, -0.05); g.v(P.x, P.y, P.z, 0, 0, 1, u, 0.3); }
      g.tri(a, a + 1, a + 2); g.tri(a + 2, a + 1, a + 3);
      if (!rmp.full) for (const lat of [latA, latB]) {
        let pv = -1;
        for (let k = 0; k <= steps; k++) {
          const t = k / steps, s = rmp.s0 + rmp.len * t; const f = g.count;
          track.pointAt(s, lat, P, lift(t) + 0.02); g.v(P.x, P.y, P.z, 0, 1, 0, 0.5, 0);
          track.pointAt(s, lat, P, -0.05); g.v(P.x, P.y, P.z, 0, 1, 0, 0.5, 0.3);
          if (pv >= 0) { g.tri(pv, f, pv + 1); g.tri(pv + 1, f, f + 1); }
          pv = f;
        }
      }
    }
    mats.ramp = makeChevronMaterial({ a: 0x1f6bff, b: 0x7fe0ff, speed: 1.6, glow: 0.35, side: THREE.DoubleSide });
    add('ramps', g.build(true), mats.ramp, { cast: true });
  }

  /* ----- boost pads ----- */
  if (track.boosts.length) {
    const g = new Geo(); const P = new THREE.Vector3();
    for (const b of track.boosts) {
      const steps = Math.max(3, Math.round(b.len / 1.5)); let prev = -1;
      for (let k = 0; k <= steps; k++) {
        const t = k / steps, s = b.s0 + b.len * t; const first = g.count;
        for (const [lat, u] of [[b.lat - b.half, 0], [b.lat + b.half, 1]]) { track.pointAt(s, lat, P, 0.035); g.v(P.x, P.y, P.z, 0, 1, 0, u, t * 2.2); }
        if (prev >= 0) g.quad(prev, prev + 1, first, first + 1);
        prev = first;
      }
    }
    mats.boost = makeChevronMaterial({ a: 0xff6a00, b: 0xffe04a, speed: 3.2, glow: 0.9 });
    mats.boost.polygonOffset = true; mats.boost.polygonOffsetFactor = -2; mats.boost.polygonOffsetUnits = -2;
    add('boosts', g.build(), mats.boost, { order: 2 });
  }

  /* ----- start line ----- */
  {
    const g = new Geo(); const P = new THREE.Vector3();
    const hw = Math.min(hwL[0], hwR[0]);
    for (const [s, v] of [[-1.6, 0], [1.6, 0.25]]) for (const [lat, u] of [[-hw, 0], [hw, hw / 3.2]]) { track.pointAt(s, lat, P, 0.03); g.v(P.x, P.y, P.z, 0, 1, 0, u, v); }
    g.quad(0, 1, 2, 3);
    mats.checker = new THREE.MeshStandardMaterial({ map: checkerTexture(8), roughness: 0.6, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
    add('startline', g.build(), mats.checker, { order: 2 });
  }

  group.userData.mats = mats;
  group.userData.terrainColor = terrainColor;
  return group;
}

function g2v(g, x, y, z, nx, nz, u, h) {
  const a = g.v(x, y, z, nx, 0, nz, u, 0);
  g.v(x, y + h, z, nx, 0, nz, u, 1);
  return a;
}

/** Scrolling chevron material used for boost pads and ramps. Emits HDR colour so bloom picks it up. */
export function makeChevronMaterial({ a = 0xff7a00, b = 0xfff06a, speed = 3, glow = 1.4, side = THREE.FrontSide } = {}) {
  return new THREE.ShaderMaterial({
    uniforms: { ...THREE.UniformsUtils.clone(THREE.UniformsLib.fog), uTime: trackUniforms.uTime, uA: { value: new THREE.Color(a) }, uB: { value: new THREE.Color(b) }, uSpeed: { value: speed }, uGlow: { value: glow } },
    side,
    vertexShader: /* glsl */`
      varying vec2 vUv;
      #include <common>
      #include <fog_pars_vertex>
      void main() {
        vUv = uv;
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        gl_Position = projectionMatrix * mvPosition;
        #include <fog_vertex>
      }`,
    fragmentShader: /* glsl */`
      uniform float uTime, uSpeed, uGlow; uniform vec3 uA, uB; varying vec2 vUv;
      #include <common>
      #include <fog_pars_fragment>
      void main() {
        float x = abs(vUv.x - 0.5) * 2.0;
        float v = vUv.y * 1.0 - uTime * uSpeed * 0.5 - x * 0.55;
        float band = fract(v);
        float chev = smoothstep(0.0, 0.08, band) * smoothstep(0.62, 0.5, band);
        float pulse = 0.75 + 0.25 * sin(uTime * 9.0 - vUv.y * 4.0);
        vec3 c = mix(uA, uB, chev) * (0.55 + chev * (0.45 + uGlow * pulse));
        float edge = smoothstep(0.86, 1.0, x);
        c = mix(c, uB * (1.0 + uGlow), edge);
        gl_FragColor = vec4(c, 1.0);
        #include <fog_fragment>
      }`,
    fog: true,
  });
}
