#!/usr/bin/env node
/* Buried-sign check (#389): loads every track in a real (headless) browser and finds signs whose face is cut off
   by other geometry: a poster whose corner sinks into a tunnel wall, a board half inside a building, a panel
   standing in the ground. text-check reads what is painted onto the canvas; this reads where it ends up in the world.
   A sign is every face of a sign atlas (the merged sheets of signs that makeAtlas builds) and every flat plane
   that carries a canvas texture. For each one it samples a grid of points just inside the edges, and from each
   point looks a short way out of the face: if a surface that passes through the sign's plane lies between the point
   and that spot, the sign is buried in it there (walls, buildings, and the ground all count; a head or a post standing in
   front of a sign does not, since it does not cut into it). A sign is flagged when two or more points are
   buried (one alone is usually the post the sign stands on).
   For each flagged sign it saves a crop of the sign's own picture, so the report says which sign it is.
   Usage: node tools/sign-clip-check.mjs [--track id[,id]] [--out dir] [--depth 0.45] [--min 2] [--shots]      exits 1 if anything is flagged */
import http from 'node:http';
import { readFile, mkdir, readdir, writeFile } from 'node:fs/promises';
import { extname, join, normalize, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { takeSlot } from './slot.mjs';

await takeSlot('sign-clip-check');   // two heavy jobs at a time on this machine: see slot.mjs

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2), opt = {};
for (let i = 0; i < args.length; i++) if (args[i].startsWith('--')) { const k = args[i].slice(2); opt[k] = args[i + 1] && !args[i + 1].startsWith('--') ? args[++i] : true; }
const outdir = opt.out || '/tmp/bk-sign-clip-check'; await mkdir(outdir, { recursive: true });
const DEPTH = +(opt.depth || 0.45);
const MIN = +(opt.min || 2);         // buried points before a sign is flagged: one alone is the post a sign stands on   // how far out of the face to look, metres: deep enough for a wall that crosses a sign at a shallow angle
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.woff2': 'font/woff2', '.mp3': 'audio/mpeg' };
const server = http.createServer(async (req, res) => { try { let p = normalize(join(root, decodeURIComponent(new URL(req.url, 'http://x').pathname))); if (!p.startsWith(root)) { res.writeHead(403); return res.end(); } if (p.endsWith('/')) p = join(p, 'index.html'); const d = await readFile(p); res.writeHead(200, { 'Content-Type': MIME[extname(p)] || 'application/octet-stream', 'Cache-Control': 'no-store' }); res.end(d); } catch { res.writeHead(404); res.end('nf'); } });
await new Promise(r => server.listen(0, '127.0.0.1', r));
const base = `http://127.0.0.1:${server.address().port}/`;
let browser;
try { browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'] }); }
catch { browser = await chromium.launch({ headless: true, args: ['--enable-unsafe-swiftshader'] }); }

/* Runs in the page once the track is built. Returns the flagged signs. */
const scan = ([DEPTH, MIN]) => {
  const { THREE, gfx } = window.BK, tr = BK.race.track, scene = gfx.scene;
  scene.updateMatrixWorld(true);
  const V = (a, i) => [a.getX(i), a.getY(i), a.getZ(i)];
  const tf = (m, p) => { const v = new THREE.Vector3(p[0], p[1], p[2]).applyMatrix4(m); return [v.x, v.y, v.z]; };
  const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]], add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]], mul = (a, s) => [a[0] * s, a[1] * s, a[2] * s];
  const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]], dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const norm = a => { const l = Math.hypot(...a) || 1; return mul(a, 1 / l); };
  const isCanvas = m => m && m.map && m.map.image && m.map.image.getContext;
  const mats = o => Array.isArray(o.material) ? o.material : [o.material];

  /* 1. the signs: faces of every atlas sheet, and flat canvas-textured planes */
  const signs = [], signMeshes = new Set();
  scene.traverse(o => {
    if (!o.isMesh || o.isInstancedMesh || !o.visible) return;
    const m = mats(o)[0], g = o.geometry, pos = g.attributes.position;
    if (!isCanvas(m) || !pos) return;
    const img = m.map.image, wm = o.matrixWorld;
    if (!g.index && pos.count % 6 === 0 && img.width >= 1024 && img.width === img.height) {
      // an atlas: Quads writes each face as two triangles a,b,c + a,c,d
      const uv = g.attributes.uv; let n = 0;
      for (let q = 0; q < pos.count; q += 6) {
        const a = V(pos, q), b = V(pos, q + 1), c = V(pos, q + 2), d = V(pos, q + 5);
        if (Math.hypot(...sub(V(pos, q + 3), a)) > 1e-4) continue;
        signs.push({ mesh: o, corners: [a, b, c, d].map(p => tf(wm, p)), uv: [uv.getX(q), uv.getY(q), uv.getX(q + 2), uv.getY(q + 2)], img, kind: 'atlas' }); n++;
      }
      if (n) signMeshes.add(o);
    } else if (g.type === 'PlaneGeometry') {
      const { width: w, height: h } = g.parameters;
      signs.push({ mesh: o, corners: [[-w / 2, -h / 2, 0], [w / 2, -h / 2, 0], [w / 2, h / 2, 0], [-w / 2, h / 2, 0]].map(p => tf(wm, p)), uv: [0, 0, 1, 1], img, kind: 'plane' });
      signMeshes.add(o);
    }
  });

  /* 2. everything that could hide them, as world triangles in a 4 m grid */
  const CELL = 4, grid = new Map(), tris = [], names = [];
  const key = (x, y, z) => x + ',' + y + ',' + z;
  const addTri = (a, b, c, owner) => {
    const id = tris.length; tris.push(a, b, c, owner);
    const lo = [0, 1, 2].map(k => Math.floor(Math.min(a[k], b[k], c[k]) / CELL)), hi = [0, 1, 2].map(k => Math.floor(Math.max(a[k], b[k], c[k]) / CELL));
    if ((hi[0] - lo[0] + 1) * (hi[1] - lo[1] + 1) * (hi[2] - lo[2] + 1) > 4000) return;   // a sky dome or backdrop: nothing sits inside one
    for (let x = lo[0]; x <= hi[0]; x++) for (let y = lo[1]; y <= hi[1]; y++) for (let z = lo[2]; z <= hi[2]; z++) { const k = key(x, y, z); let l = grid.get(k); if (!l) grid.set(k, l = []); l.push(id); }
  };
  const karts = new Set(); (BK.race.players || []).forEach(p => { for (const v of Object.values(p)) if (v && v.isObject3D) v.traverse(c => karts.add(c)); });
  scene.traverse(o => {
    if (!o.isMesh || !o.visible || signMeshes.has(o) || karts.has(o) || o.isSkinnedMesh) return;
    if (mats(o).every(m => !m || m.visible === false || (m.transparent && m.opacity < 0.6) || m.colorWrite === false)) return;
    let vis = true; for (let p = o; p; p = p.parent) if (!p.visible) vis = false; if (!vis) return;
    const g = o.geometry, pos = g.attributes.position; if (!pos) return;
    const idx = g.index, n = idx ? idx.count : pos.count, m0 = mats(o)[0], owner = names.push(`${o.name || o.parent?.name || o.geometry.type} (${m0?.name || (m0?.color ? '#' + m0.color.getHexString() : '?')})`) - 1;
    const mats4 = o.isInstancedMesh ? Array.from({ length: o.count }, (_, k) => { const m = new THREE.Matrix4(); o.getMatrixAt(k, m); return m.premultiply(o.matrixWorld); }) : [o.matrixWorld];
    for (const wm of mats4) {
      const P = []; for (let i = 0; i < pos.count; i++) P.push(tf(wm, V(pos, i)));
      for (let t = 0; t + 2 < n; t += 3) { const i0 = idx ? idx.getX(t) : t, i1 = idx ? idx.getX(t + 1) : t + 1, i2 = idx ? idx.getX(t + 2) : t + 2; addTri(P[i0], P[i1], P[i2], owner); }
    }
  });
  // Moller-Trumbore, both sides: distance along dir to the triangle, or -1
  const hit = (o, d, a, b, c) => {
    const e1 = sub(b, a), e2 = sub(c, a), p = cross(d, e2), det = dot(e1, p); if (Math.abs(det) < 1e-9) return -1;
    const inv = 1 / det, s = sub(o, a), u = dot(s, p) * inv; if (u < 0 || u > 1) return -1;
    const q = cross(s, e1), v = dot(d, q) * inv; if (v < 0 || u + v > 1) return -1;
    return dot(e2, q) * inv;
  };

  /* 3. sample each sign and look out of its face */
  const cpOf = p => { let best = 0, bd = 1e18; for (let i = 0; i < tr.N; i++) { const dd = (tr.px[i] - p[0]) ** 2 + (tr.pz[i] - p[2]) ** 2; if (dd < bd) { bd = dd; best = i; } } return +tr.cp[best].toFixed(2); };
  const out = [], G = 5;
  for (const s of signs) {
    const [a, b, c, d] = s.corners, n = norm(cross(sub(b, a), sub(d, a)));
    const w = Math.hypot(...sub(b, a)), h = Math.hypot(...sub(d, a)); if (w < 0.3 || h < 0.3) continue;
    let hidden = 0, total = 0; const by = new Map(), where = [];
    const lo = [1e9, 1e9, 1e9], hi = [-1e9, -1e9, -1e9];
    for (const p of [a, b, c, d]) for (const e of [p, add(p, mul(n, DEPTH))]) for (let k = 0; k < 3; k++) { lo[k] = Math.min(lo[k], e[k]); hi[k] = Math.max(hi[k], e[k]); }
    const cand = new Set();
    for (let x = Math.floor(lo[0] / CELL); x <= Math.floor(hi[0] / CELL); x++) for (let y = Math.floor(lo[1] / CELL); y <= Math.floor(hi[1] / CELL); y++) for (let z = Math.floor(lo[2] / CELL); z <= Math.floor(hi[2] / CELL); z++) for (const id of grid.get(key(x, y, z)) || []) cand.add(id);
    for (let i = 0; i < G; i++) for (let j = 0; j < G; j++) {
      const u = 0.04 + 0.92 * i / (G - 1), v = 0.04 + 0.92 * j / (G - 1);
      const p = add(add(a, mul(sub(b, a), u)), mul(sub(d, a), v)); total++;
      let why = null;
      const o = add(p, mul(n, DEPTH)), dir = mul(n, -1);
      // only a surface that passes through the sign's plane buries it: a head or a post standing in front only hides it from one side
      for (const id of cand) { const t = hit(o, dir, tris[id], tris[id + 1], tris[id + 2]); if (t > 0 && t < DEPTH - 0.015 && [0, 1, 2].some(k => dot(sub(tris[id + k], p), n) < -0.01)) { why = names[tris[id + 3]]; break; } }
      if (why) { hidden++; by.set(why, (by.get(why) || 0) + 1); where.push((v > 0.66 ? 'top' : v < 0.34 ? 'bottom' : 'middle') + '-' + (u > 0.66 ? 'right' : u < 0.34 ? 'left' : 'centre')); }
    }
    if (hidden < MIN) continue;
    // a crop of the sign's own picture, so the report says which sign it is
    const W = s.img.width, H = s.img.height, sx = Math.min(s.uv[0], s.uv[2]) * W, sy = (1 - Math.max(s.uv[1], s.uv[3])) * H, sw = Math.abs(s.uv[2] - s.uv[0]) * W, sh = Math.abs(s.uv[3] - s.uv[1]) * H;
    const cv = document.createElement('canvas'); cv.width = Math.max(1, Math.round(Math.min(400, sw))); cv.height = Math.max(1, Math.round(cv.width * sh / Math.max(1, sw)));
    try { cv.getContext('2d').drawImage(s.img, sx, sy, sw, sh, 0, 0, cv.width, cv.height); } catch {}
    const mid = mul(add(a, c), 0.5);
    out.push({ n, kind: s.kind, mesh: s.mesh.name || s.mesh.parent?.name || '', cp: cpOf(mid), at: mid.map(x => +x.toFixed(1)), size: [+w.toFixed(1), +h.toFixed(1)], hidden, total, by: [...by].map(([k, v]) => `${k || '(unnamed)'} x${v}`).join(', '), where: [...new Set(where)].join(' '), crop: cv.toDataURL('image/png') });
  }
  return { signs: signs.length, tris: tris.length / 4, flagged: out };
};

const all = (await readdir(join(root, 'src/tracks'))).filter(f => f.endsWith('.js') && !f.startsWith('_')).map(f => f.slice(0, -3)).sort();
const tracks = opt.track ? String(opt.track).split(',') : all;
let total = 0;
const ctx = await browser.newContext({ viewport: { width: 640, height: 360 }, serviceWorkers: 'block' });
try {
  for (const id of tracks) {
    const page = await ctx.newPage(); const errs = []; page.on('pageerror', e => errs.push(e.message));
    await page.goto(base + `?track=${id}&r=larrysergey&intro=0&seed=3&q=high`, { waitUntil: 'load' });
    await page.waitForFunction('window.BK && BK.race', null, { timeout: 60000 }); await page.waitForTimeout(1500);
    const res = await page.evaluate(scan, [DEPTH, MIN]);
    console.log(`\n== ${id}: ${res.signs} signs against ${res.tris} triangles, ${res.flagged.length} flagged${errs.length ? ' ERR ' + errs[0] : ''}`);
    let k = 0;
    for (const f of res.flagged.sort((p, q) => p.cp - q.cp)) {
      const file = join(outdir, `${id}-${String(++k).padStart(2, '0')}.png`);
      await writeFile(file, Buffer.from(f.crop.split(',')[1], 'base64'));
      if (opt.shots) {   // --shots: a race-camera view of the sign from a few metres out, to see the clip as a player would
        const dist = Math.max(3, f.size[0] * 1.1), eye = f.at.map((v, j) => v + f.n[j] * dist + (j === 1 ? 0.4 : 0) - (j !== 1 ? f.n[j] * 0 : 0));
        await page.evaluate(([eye, at]) => { const app = BK.app; app.afterUpdate = s => { const cam = s.view.views[0].camera; for (const h of s.huds) h.setVisible(false); cam.position.set(...eye); cam.lookAt(...at); s.view.views[0].focus.set(...at); if (cam.fov !== 60) { cam.fov = 60; cam.updateProjectionMatrix(); } }; }, [eye, f.at]);
        await page.waitForTimeout(500);
        await page.screenshot({ path: file.replace(/\.png$/, '-view.jpg'), type: 'jpeg', quality: 80 });
      }
      console.log(`   cp ${f.cp} | ${f.kind} ${f.size[0]}x${f.size[1]} m at ${f.at.join(',')} | ${f.hidden}/${f.total} points hidden (${f.where}) by ${f.by} | ${file}`);
    }
    total += res.flagged.length;
    await page.close();
  }
} finally { await browser.close(); server.close(); }
console.log(`\ncrops in ${outdir}`);
console.log(total ? `sign-clip-check: ${total} flagged` : 'sign-clip-check: ok');
process.exit(total ? 1 : 0);
