#!/usr/bin/env node
/* Top-down map and stats for a track definition, for authoring.
   Usage: node tools/track-map.mjs <track-id> [out.png] */
import { writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { Track, EDGE } from '../src/track/track.js';

const id = process.argv[2];
if (!id) { console.error('usage: track-map.mjs <track-id> [out.png]'); process.exit(2); }
const def = (await import(`../src/tracks/${id}.js`)).default;
const t0 = performance.now();
const tr = new Track(def);
const buildMs = performance.now() - t0;
const out = process.argv[3] || `/tmp/track-${id}.png`;

let minR = Infinity, minRi = 0, maxGrade = 0, minW = Infinity, maxW = 0;
for (let i = 0; i < tr.N; i++) {
  const r = 1 / Math.max(1e-6, Math.abs(tr.curv[i])); if (r < minR) { minR = r; minRi = i; }
  maxGrade = Math.max(maxGrade, Math.abs(tr.ty[i]));
  const w = tr.hwL[i] + tr.hwR[i]; minW = Math.min(minW, w); maxW = Math.max(maxW, w);
}
console.log(`${def.name}: length ${tr.length.toFixed(0)} m, ${tr.N} samples, built in ${buildMs.toFixed(0)} ms`);
console.log(`  elevation ${tr.bounds.minY.toFixed(1)}..${tr.bounds.maxY.toFixed(1)} m, max grade ${(maxGrade * 100).toFixed(0)}%, width ${minW.toFixed(1)}..${maxW.toFixed(1)} m`);
console.log(`  tightest radius ${minR.toFixed(1)} m at cp ${tr.cp[minRi].toFixed(2)} (inner edge radius ${(minR - (tr.curv[minRi] > 0 ? tr.hwL[minRi] : tr.hwR[minRi])).toFixed(1)} m)`);
console.log(`  corners: ${tr.corners.map(c => `${c.dir > 0 ? 'L' : 'R'}${c.len.toFixed(0)}m@cp${tr.cp[c.i0].toFixed(1)}`).join(' ')}`);
console.log(`  est. lap at 30 m/s: ${(tr.length / 30).toFixed(1)} s; ramps ${tr.ramps.length}, boosts ${tr.boosts.length}, item rows ${tr.itemRows.length}, coins ${tr.coinSpots.length}`);

const b = tr.bounds, pad = 60, W = 1400;
const sx = (W - 0) / (b.maxX - b.minX + pad * 2), H = Math.round((b.maxZ - b.minZ + pad * 2) * sx);
const X = x => ((x - b.minX + pad) * sx).toFixed(1), Y = z => ((z - b.minZ + pad) * sx).toFixed(1); // viewed from above: +x right, +z down
let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}"><rect width="100%" height="100%" fill="#3f7d3a"/>`;
// terrain shading
if (tr.grid) {
  const g = tr.grid, step = 4;
  for (let iz = 0; iz < g.nz; iz += step) for (let ix = 0; ix < g.nx; ix += step) {
    const h = g.H[iz * g.nx + ix], x = g.x0 + ix * g.cell, z = g.z0 + iz * g.cell;
    const water = tr.water != null && h < tr.water;
    const v = Math.max(0, Math.min(1, (h + 6) / 40));
    const c = water ? '#3b8fd9' : `rgb(${Math.round(60 + v * 120)},${Math.round(120 + v * 90)},${Math.round(55 + v * 60)})`;
    svg += `<rect x="${X(x)}" y="${Y(z)}" width="${(g.cell * step * sx + 0.6).toFixed(1)}" height="${(g.cell * step * sx + 0.6).toFixed(1)}" fill="${c}"/>`;
  }
}
const edgePt = (i, lat) => [tr.px[i] + tr.lx[i] * lat, tr.pz[i] + tr.lz[i] * lat];
// outer boundary and shoulders
for (const [side, arrO, arrS, hw] of [[1, tr.outerL, tr.shL, tr.hwL], [-1, tr.outerR, tr.shR, tr.hwR]]) {
  let d = '', d2 = '';
  for (let i = 0; i <= tr.N; i++) { const k = i % tr.N; const [x, z] = edgePt(k, side * (hw[k] + arrO[k])); d += `${i ? 'L' : 'M'}${X(x)},${Y(z)}`; const [x2, z2] = edgePt(k, side * (hw[k] + arrS[k])); d2 += `${i ? 'L' : 'M'}${X(x2)},${Y(z2)}`; }
  svg += `<path d="${d}" fill="none" stroke="#ffffff" stroke-opacity="0.5" stroke-width="1" stroke-dasharray="5 4"/><path d="${d2}" fill="none" stroke="#d8c48a" stroke-width="1"/>`;
}
// road quads coloured by elevation
for (let i = 0; i < tr.N; i++) {
  const j = (i + 1) % tr.N;
  const a = edgePt(i, tr.hwL[i]), c = edgePt(i, -tr.hwR[i]), e = edgePt(j, tr.hwL[j]), f = edgePt(j, -tr.hwR[j]);
  const v = (tr.py[i] - b.minY) / Math.max(1, b.maxY - b.minY);
  const col = tr.gap[i] ? '#000' : `rgb(${Math.round(70 + v * 150)},${Math.round(72 + v * 60)},${Math.round(90 - v * 30)})`;
  svg += `<polygon points="${X(a[0])},${Y(a[1])} ${X(e[0])},${Y(e[1])} ${X(f[0])},${Y(f[1])} ${X(c[0])},${Y(c[1])}" fill="${col}" stroke="${col}" stroke-width="0.6"/>`;
}
// walls / void edges
for (const [side, edge, hw] of [[1, tr.edgeL, tr.hwL], [-1, tr.edgeR, tr.hwR]]) for (let i = 0; i < tr.N; i++) {
  if (edge[i] === EDGE.OPEN) continue; const j = (i + 1) % tr.N; const a = edgePt(i, side * hw[i]), c = edgePt(j, side * hw[j]);
  svg += `<line x1="${X(a[0])}" y1="${Y(a[1])}" x2="${X(c[0])}" y2="${Y(c[1])}" stroke="${edge[i] === EDGE.WALL ? '#fff' : '#f0f'}" stroke-width="2.5"/>`;
}
// racing line
{ let d = ''; for (let i = 0; i <= tr.N; i++) { const k = i % tr.N; const [x, z] = edgePt(k, tr.lineLat[k]); d += `${i ? 'L' : 'M'}${X(x)},${Y(z)}`; } svg += `<path d="${d}" fill="none" stroke="#7cf" stroke-width="1.2" stroke-opacity="0.8"/>`; }
const P = { x: 0, y: 0, z: 0 };
const strip = (s0, s1, la, lb, fill) => { const pts = []; for (const [s, l] of [[s0, la], [s1, la], [s1, lb], [s0, lb]]) { tr.pointAt(s, l, P); pts.push(`${X(P.x)},${Y(P.z)}`); } svg += `<polygon points="${pts.join(' ')}" fill="${fill}"/>`; };
for (const r of tr.ramps) strip(r.s0, r.s1, r.full ? -tr.hwR[r.i0] : r.lat - r.half, r.full ? tr.hwL[r.i0] : r.lat + r.half, '#39f');
for (const p of tr.boosts) strip(p.s0, p.s1, p.lat - p.half, p.lat + p.half, '#fa0');
for (const row of tr.itemRows) for (const l of row.lats) { tr.pointAt(row.s, l, P); svg += `<rect x="${X(P.x) - 3}" y="${Y(P.z) - 3}" width="6" height="6" fill="#f6f" stroke="#fff"/>`; }
for (const c of tr.coinSpots) { tr.pointAt(c.s, c.lat, P); svg += `<circle cx="${X(P.x)}" cy="${Y(P.z)}" r="2.4" fill="#fd3"/>`; }
strip(-1.5, 1.5, -tr.hwR[0], tr.hwL[0], '#fff');
def.path.forEach((c, k) => { svg += `<circle cx="${X(c.p[0])}" cy="${Y(c.p[2])}" r="4" fill="#fff" stroke="#000"/><text x="${+X(c.p[0]) + 8}" y="${+Y(c.p[2]) - 8}" font-family="Arial" font-weight="bold" font-size="22" fill="#fff" stroke="#000" stroke-width="0.8">${k} <tspan font-size="14">y${c.p[1]}</tspan></text>`; });
svg += `<text x="16" y="34" font-family="Arial" font-weight="bold" font-size="26" fill="#fff">${def.name} — ${tr.length.toFixed(0)} m</text></svg>`;
const svgPath = out.replace(/\.png$/, '.svg');
await writeFile(svgPath, svg);
// rasterise with rsvg-convert when available (brew install librsvg); otherwise leave the SVG
try { execFileSync('rsvg-convert', ['-o', out, svgPath]); console.log('map:', out); }
catch (e) { console.log('svg:', svgPath, '(install librsvg for a PNG)'); }
