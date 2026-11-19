#!/usr/bin/env node
/* Sign sight-line check (#396): loads every track in a real (headless) browser, drives the race camera round the
   racing line, and finds signs a racer never gets to read: a gag behind a gantry pillar, inside a hall, under a tree,
   behind another board, below a sponsor wall, or one that never faces the road. sign-clip-check finds signs cut INTO
   by geometry; this finds signs hidden BEHIND it, or never shown whole on screen.

   A sign is any flat face that carries painted lettering: a face of a sign atlas, a canvas-textured plane, or a quad of
   a canvas-textured quad mesh (an LED panel). Lettering is known from the canvas itself: every fillText and strokeText
   is recorded with its box (and followed through drawImage), so faces with no text (rack fronts, stripes, pictures) are
   left out, the box the lettering fills is known, and so is the height of its biggest line in metres.

   How it measures: every STEP metres round the racing line it puts the chase camera where it sits at racing speed
   (6.2 m behind and 2.35 m above the kart, looking ahead, 59 degree field of view, 16:9) and renders an ID buffer:
   each sign's lettering in its own colour, and everything that could hide it in black: buildings, trees, gantries,
   walls, sponsor boards, terrain, props, and the faces of other signs. Skipped as see-through: glass and other faint
   transparent materials, additive effects, particles, name tags, and the karts. Cut-out pictures keep their holes.
   Each sign's pixel count is compared with the area its lettering would cover on screen, so lettering half behind a
   pillar, half off the edge of the screen, or seen from too far round the side scores low. The start grid is sampled
   too (a camera behind every slot): the field sits there through the countdown, so a sign read from the grid is read.

   A sign READS at a camera point when all of these hold (thresholds tuned against signs that read well in race frames):
     FRAC     at least 85% of its lettering is on screen and not hidden
     PX       its biggest line of text stands at least 12 px tall on a 720 px tall screen
     COS      it faces the camera within about 72 degrees (cosine 0.3); from behind, mirrored text never reads
   It PASSES when it reads at consecutive camera points covering at least SUSTAIN metres of racing line (20 m: two
   thirds of a second at 150cc top speed, a full second through the corners), or from a grid slot. One camera point
   missing inside a run (a lamp post going by) does not break it. Faces with the same picture side by side (back to
   back, or round a box) are one sign, and any of them may read it.

   Only signs meant to be read from the road are checked:
     MINTEXT  biggest line of text at least 0.7 m tall (smaller is small print: rack labels, crowd placards, plaques)
     SCOPE    it faces the road, big enough and on screen, for at least 5 m somewhere (else it is scenery seen from
              elsewhere: a building's name on the far side, a sign for the intro flyover)
   ALLOW lists the deliberate exceptions, each with its reason. KNOWN lists signs found hidden that are not moved yet
   (#397): they do not fail the check, so it guards against new ones while those are fixed.

   Every track is checked at the high, medium, and low quality tiers: lower tiers plant fewer trees, so the rest of a
   track's scattered scenery lands somewhere else, and a tree that misses a board on one tier can stand in front of it on
   another.

   Usage: node tools/sign-sight-check.mjs [--track id[,id]] [--q high,medium,low] [--out dir] [--shots] [--all] [--only re] [--trace re]
     --shots  for each flagged sign: its picture, the race-camera view at its best moment, and the ID view beside it
              (that sign red, other signs blue, what hides them black, sky white)
     --all    prints every checked sign with its best run, not only the flagged ones
     --only   prints only signs whose text matches; --trace prints every camera point of the signs it matches
   exits 1 if anything is flagged */
import http from 'node:http';
import { readFile, mkdir, readdir, writeFile } from 'node:fs/promises';
import { extname, join, normalize, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { takeSlot } from './slot.mjs';

await takeSlot('sign-sight-check');   // two heavy jobs at a time on this machine: see slot.mjs

const T = { FRAC: 0.85, PX: 12, COS: 0.3, SUSTAIN: 20, MINTEXT: 0.7, SCOPE: 5, MAXD: 160 };
/* Deliberate exceptions: track id and the start of the sign's text (as the report prints it), with the reason. */
const STAND = 'a grandstand\'s section banner runs along the road with the stand it hangs on: read side-on in passing and from the intro flyover, like a real circuit\'s';
const ALLOW = [
  ...["LOBBYISTS' BOX", 'DONOR SEATING ONLY', 'PLEASE CLAP'].map(text => ({ track: 'capitol-hill', text, why: STAND })),
  ...['EXIT LIQUIDITY SECTION', 'BAGHOLDERS ONLY'].map(text => ({ track: 'crypto-cove', text, why: STAND })),
  ...['SEATS PAID IN EQUITY', "VC BOX: LET'S CIRCLE BACK", 'INTERN SECTION (UNPAID)'].map(text => ({ track: 'silicon-valley', text, why: STAND })),
  ...['SAFE MODE SECTION', ':( / YOUR SEAT RAN INTO A PROBLEM'].map(text => ({ track: 'bliss-hills', text, why: STAND })),
  ...['90 M', '120 M', 'K 140'].map(text => ({ track: 'davos', text, why: 'distance boards down the ski jump\'s landing hill, numbers on the slope rather than a joke' })),
  ...['OFFSHORE ACCOUNT', 'TAX EXEMPT'].map(text => ({ track: 'international-waters', text, why: 'a yacht\'s name runs round its bow in strips that follow the hull, and this check sees one strip at a time; the whole name reads along the quay' })),
  { track: 'bliss-hills', text: '56K', why: 'the badge on the giant modem\'s front, part of the prop; the board above it carries the joke' },
  { track: 'singularity-speedway', text: 'SINGULARITY SPEEDWAY', why: 'the start gantry\'s name board on its far side: on the grid side the AGI countdown has taken it over (the gag), so this face is only seen from the far straight' },
];
/* Signs this check found hidden that are not moved yet, listed for their tracks' owners in issue #397: [track, start of text].
   They print as "known" with --all and do not fail the check; once one reads, the check says to take it out of this list.
   Matched anywhere in the sign's text (a counter's digits change). */
const KNOWN = [
  ...["ZUNE"].map(text => ['bliss-hills', text]),
  ...["(VIP ENTRANCE)", "CARBON NEUTRAL (VIBES)", "EL PULPO MECÁNICO", "KEYS LEFT IN IGNITION", "NO REQUESTS", "OPULENT TEMPLE", "QUESTIONMARK"].map(text => ['burning-circuit', text]),
  ...["BUY THE DIP", "FINALLY GOT", "FUNDAMENTALS: ONE DOG", "LIQUIDITY", "NOW $4", "THIS IS GOOD", "YOUR KEYS,"].map(text => ['crypto-cove', text]),
  ...["4 JOBS CREATED", "TRAINING HALL 9", "HALL 2 · INFERENCE", "GASLIGHT ENERGY", "GPUs", "NEXT: THE LAKE (FOR NOW)", "OF GPUS", "OMNIMIND", "DEEPTHIRST DEVDAY", "PEAKER PLANT 2", "THINKING REALLY HARD", "WE BOUGHT ALL OF THEM", "IS THIS A ROAD?"].map(text => ['datacenter-dash', text]),
  ...["BACK TO MARS (SORRY)", "COMPANY STORE", "EARTH: HAD ITS CHANCE", "FULL SELF-LANDING:", "I MISS / TREES", "N/A", "NOW HIRING: EXTREMELY HARDCORE", "OXYGEN: $9.99/MO", "TREES: 31"].map(text => ['mars-colony', text]),
  ...["ALL HANDS", "DO WHAT YOU L  VE"].map(text => ['wework-memorial', text]),
].map(([track, text]) => ({ track, text }));

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2), opt = {};
for (let i = 0; i < args.length; i++) if (args[i].startsWith('--')) { const k = args[i].slice(2); opt[k] = args[i + 1] && !args[i + 1].startsWith('--') ? args[++i] : true; }
const outdir = opt.out || '/tmp/bk-sign-sight-check'; await mkdir(outdir, { recursive: true });
const STEP = +(opt.step || 2.5);
for (const k of ['FRAC', 'PX', 'COS', 'SUSTAIN', 'MINTEXT', 'SCOPE']) if (opt[k.toLowerCase()] != null) T[k] = +opt[k.toLowerCase()];   // for tuning only
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.woff2': 'font/woff2', '.mp3': 'audio/mpeg' };
const server = http.createServer(async (req, res) => { try { let p = normalize(join(root, decodeURIComponent(new URL(req.url, 'http://x').pathname))); if (!p.startsWith(root)) { res.writeHead(403); return res.end(); } if (p.endsWith('/')) p = join(p, 'index.html'); const d = await readFile(p); res.writeHead(200, { 'Content-Type': MIME[extname(p)] || 'application/octet-stream', 'Cache-Control': 'no-store' }); res.end(d); } catch { res.writeHead(404); res.end('nf'); } });
await new Promise(r => server.listen(0, '127.0.0.1', r));
const base = `http://127.0.0.1:${server.address().port}/`;
let browser;
try { browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'] }); }
catch { browser = await chromium.launch({ headless: true, args: ['--enable-unsafe-swiftshader'] }); }

/* Runs before the page: records where text is painted on every canvas, and follows it when one canvas is drawn onto
   another. A canvas cleared or filled edge to edge starts a fresh record. */
const recordText = () => {
  const log = window.__signText = new WeakMap();
  const P = CanvasRenderingContext2D.prototype, list = c => { let l = log.get(c); if (!l) log.set(c, l = []); return l; };
  const box = (g, text, x, y, maxWidth) => {
    if (!String(text).trim()) return;
    const m = g.measureText(text); let w = m.width; if (maxWidth != null && w > maxWidth) w = maxWidth;
    const al = g.textAlign, l = al === 'center' ? x - w / 2 : (al === 'right' || al === 'end') ? x - w : x;
    const top = y - m.actualBoundingBoxAscent, bot = y + m.actualBoundingBoxDescent, t = g.getTransform();
    const pts = [[l, top], [l + w, top], [l + w, bot], [l, bot]].map(([px, py]) => [t.a * px + t.c * py + t.e, t.b * px + t.d * py + t.f]);
    const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]), sc = Math.sqrt(Math.abs(t.a * t.d - t.b * t.c));
    const L = list(g.canvas); if (L.length < 4000) L.push({ x0: Math.min(...xs), y0: Math.min(...ys), x1: Math.max(...xs), y1: Math.max(...ys), h: (bot - top) * sc, text: String(text).slice(0, 40) });
  };
  for (const k of ['fillText', 'strokeText']) { const o = P[k]; P[k] = function (text, x, y, mw) { try { box(this, text, x, y, mw); } catch {} return o.apply(this, arguments); }; }
  const whole = (g, x, y, w, h) => { const t = g.getTransform(); return t.a === 1 && t.d === 1 && !t.b && !t.c && !t.e && !t.f && x <= 0 && y <= 0 && x + w >= g.canvas.width && y + h >= g.canvas.height; };
  const cr = P.clearRect; P.clearRect = function (x, y, w, h) { try { if (whole(this, x, y, w, h)) log.delete(this.canvas); } catch {} return cr.apply(this, arguments); };
  const fr = P.fillRect; P.fillRect = function (x, y, w, h) { try { if (whole(this, x, y, w, h)) log.delete(this.canvas); } catch {} return fr.apply(this, arguments); };
  const di = P.drawImage; P.drawImage = function (img, ...a) {
    try {
      const src = img && log.get(img);
      if (src && src.length) {
        const iw = img.width, ih = img.height;
        let [sx, sy, sw, sh, dx, dy, dw, dh] = a.length >= 8 ? a : a.length >= 4 ? [0, 0, iw, ih, a[0], a[1], a[2], a[3]] : [0, 0, iw, ih, a[0], a[1], iw, ih];
        const kx = dw / sw, ky = dh / sh, t = this.getTransform(), sc = Math.sqrt(Math.abs(t.a * t.d - t.b * t.c)), L = list(this.canvas);
        for (const b of src) {
          if (b.x1 < sx || b.x0 > sx + sw || b.y1 < sy || b.y0 > sy + sh) continue;
          const pts = [[b.x0, b.y0], [b.x1, b.y0], [b.x1, b.y1], [b.x0, b.y1]].map(([px, py]) => { const X = dx + (px - sx) * kx, Y = dy + (py - sy) * ky; return [t.a * X + t.c * Y + t.e, t.b * X + t.d * Y + t.f]; });
          const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]);
          if (L.length < 4000) L.push({ x0: Math.min(...xs), y0: Math.min(...ys), x1: Math.max(...xs), y1: Math.max(...ys), h: b.h * Math.min(kx, ky) * sc, text: b.text });
        }
      }
    } catch {}
    return di.call(this, img, ...a);
  };
};

/* Runs in the page once the track is built. Returns every checked sign with its best run. */
const scan = ([T, STEP, W, H, DEBUG, TRACE]) => {
  const { THREE, gfx } = window.BK, s0 = BK.session, tr = BK.race.track, scene = gfx.scene, renderer = gfx.renderer, log = window.__signText;
  scene.updateMatrixWorld(true);
  const V = (a, i) => new THREE.Vector3(a.getX(i), a.getY(i), a.getZ(i));
  const mats = o => Array.isArray(o.material) ? o.material : [o.material];
  const isCanvas = m => m && m.map && m.map.image && m.map.image.getContext;
  const cpOf = p => { let best = 0, bd = 1e18; for (let i = 0; i < tr.N; i++) { const dd = (tr.px[i] - p.x) ** 2 + (tr.pz[i] - p.z) ** 2; if (dd < bd) { bd = dd; best = i; } } return +tr.cp[best].toFixed(2); };

  /* 1. text faces */
  const faces = [], hideOrig = new Set();
  const textIn = (img, uv) => {
    const L = log && log.get(img); if (!L || !L.length) return null;
    const Wc = img.width, Hc = img.height, x0 = Math.min(uv[0], uv[2]) * Wc, x1 = Math.max(uv[0], uv[2]) * Wc, y0 = (1 - Math.max(uv[1], uv[3])) * Hc, y1 = (1 - Math.min(uv[1], uv[3])) * Hc;
    const inside = L.filter(b => { const cx = (b.x0 + b.x1) / 2, cy = (b.y0 + b.y1) / 2; return cx >= x0 && cx <= x1 && cy >= y0 && cy <= y1; });
    if (!inside.length) return null;
    const h = Math.max(...inside.map(b => Math.min(b.h, y1 - y0)));
    // the lettering's box: what has to be seen for the sign to be read (the board's frame and margins may be covered)
    const pad = 0.02 * Math.max(x1 - x0, y1 - y0);
    const box = [Math.max(x0, Math.min(...inside.map(b => b.x0)) - pad), Math.max(y0, Math.min(...inside.map(b => b.y0)) - pad), Math.min(x1, Math.max(...inside.map(b => b.x1)) + pad), Math.min(y1, Math.max(...inside.map(b => b.y1)) + pad)];
    // every line of text on it, biggest first, for the report
    const lines = [...new Set(inside.sort((a, b) => b.h - a.h).map(b => b.text))].slice(0, 3).join(' / ');
    return { frac: h / (y1 - y0), lines, rect: [x0, y0, x1 - x0, y1 - y0], box };
  };
  const opaque = (img, [x0, y0, x1, y1]) => {   // the share of the lettering's box that is not transparent (cut-out letters)
    try { const d = img.getContext('2d').getImageData(Math.floor(x0), Math.floor(y0), Math.max(1, Math.round(x1 - x0)), Math.max(1, Math.round(y1 - y0))).data; let n = 0, o = 0; for (let i = 3; i < d.length; i += 4 * 7) { n++; if (d[i] >= 128) o++; } return n ? o / n : 1; } catch { return 1; }
  };
  /* corners a, b, c, d: bottom-left, bottom-right, top-right, top-left seen from the front; uv: [u, v] at a, then at c */
  const addFace = (mesh, corners, uv, mat) => {
    const img = mat.map.image, t = textIn(img, uv);
    const [a, b, c, d] = corners, w = a.distanceTo(b), h = a.distanceTo(d);
    if (!t || w < 0.3 || h < 0.3) return null;
    const n = new THREE.Vector3().subVectors(b, a).cross(new THREE.Vector3().subVectors(d, a)).normalize();
    // the lettering's box on the face, in world space and in uv
    const Wc = img.width, Hc = img.height, ax = uv[0] * Wc, ay = (1 - uv[1]) * Hc, cx = uv[2] * Wc, cy = (1 - uv[3]) * Hc;
    const S = [(t.box[0] - ax) / (cx - ax), (t.box[2] - ax) / (cx - ax)].sort((p, q) => p - q), Tt = [(t.box[1] - ay) / (cy - ay), (t.box[3] - ay) / (cy - ay)].sort((p, q) => p - q);
    const at = (s, v) => a.clone().addScaledVector(new THREE.Vector3().subVectors(b, a), s).addScaledVector(new THREE.Vector3().subVectors(d, a), v);
    const tcorners = [at(S[0], Tt[0]), at(S[1], Tt[0]), at(S[1], Tt[1]), at(S[0], Tt[1])];
    const tuv = [uv[0] + (uv[2] - uv[0]) * S[0], uv[1] + (uv[3] - uv[1]) * Tt[0], uv[0] + (uv[2] - uv[0]) * S[1], uv[1] + (uv[3] - uv[1]) * Tt[1]];
    const f = { mesh, corners, uv, mat, img, n, w, h, textH: t.frac * h, text: t.lines, rect: t.rect, tcorners, tuv, center: new THREE.Vector3().addVectors(tcorners[0], tcorners[2]).multiplyScalar(0.5), opq: opaque(img, t.box) };
    faces.push(f); return f;
  };
  const quadMeshes = [];
  scene.traverse(o => {
    if (!o.isMesh || !o.visible || o.isInstancedMesh || o.isSkinnedMesh) return;   // instanced canvas planes are flying cards and banknotes, not signs: they still block (below)
    let vis = true; for (let p = o; p; p = p.parent) if (!p.visible) vis = false; if (!vis) return;
    const m = mats(o)[0], g = o.geometry, pos = g.attributes.position;
    if (Array.isArray(o.material) || !isCanvas(m) || !pos || !g.attributes.uv) return;
    const U = g.attributes.uv;
    if (g.type === 'PlaneGeometry') {
      let bent = 0; for (let i = 0; i < pos.count; i++) bent = Math.max(bent, Math.abs(pos.getZ(i))); if (bent > 0.01) return;   // bent on purpose (a curling receipt)
      const { width: w, height: h } = g.parameters, one = g.parameters.widthSegments === 1 && g.parameters.heightSegments === 1;
      // a plane may show only part of its canvas: vertices 2 and 1 are its bottom-left and top-right
      const uv = one ? [U.getX(2), U.getY(2), U.getX(1), U.getY(1)] : [0, 0, 1, 1];
      addFace(o, [[-w / 2, -h / 2], [w / 2, -h / 2], [w / 2, h / 2], [-w / 2, h / 2]].map(([x, y]) => new THREE.Vector3(x, y, 0).applyMatrix4(o.matrixWorld)), uv, m);
      return;
    }
    if (g.index || pos.count % 6) return;
    // a quad list (Quads writes each face as two triangles a,b,c + a,c,d)
    const list = [];
    for (let q = 0; q < pos.count; q += 6) {
      if (V(pos, q + 3).distanceTo(V(pos, q)) > 1e-4 || V(pos, q + 4).distanceTo(V(pos, q + 2)) > 1e-4) return;   // not a quad list after all
      list.push(q);
    }
    let any = false;
    for (const q of list) if (addFace(o, [q, q + 1, q + 2, q + 5].map(i => V(pos, i).applyMatrix4(o.matrixWorld)), [U.getX(q), U.getY(q), U.getX(q + 2), U.getY(q + 2)], m)) any = true;
    if (any) { quadMeshes.push({ o, list }); hideOrig.add(o); }
  });

  /* 2. signs: faces with the same picture side by side (back to back, or round a box) are one sign, and any face may read it */
  const signs = [];
  for (const f of faces) {
    if (f.textH < T.MINTEXT || f.text.replace(/[^A-Za-z0-9]/g, '').length < 3) { f.skip = true; continue; }   // small print, or a "$" on a banknote
    let s = signs.find(s => s.img === f.img && s.rect.every((v, k) => Math.abs(v - f.rect[k]) < 2) && s.faces[0].center.distanceTo(f.center) < Math.max(1.5, 0.75 * f.w));   // back to back, or round a box
    if (!s) signs.push(s = { img: f.img, rect: f.rect, faces: [], text: f.text, textH: f.textH, w: f.w, h: f.h });
    s.faces.push(f);
  }

  /* 3. the ID scene: every sign's lettering in its own colour, every blocker black (sign faces too), everything see-through hidden */
  const restore = [];
  const hide = o => { restore.push([o, 'visible', o.visible]); o.visible = false; };
  const setMat = (o, m) => { restore.push([o, 'material', o.material]); o.material = m; };
  const blackCache = new Map();
  const black = m => {
    const cut = m && (m.alphaTest > 0 || (m.transparent && m.map)) && m.map ? m.map : null, side = m ? m.side : THREE.FrontSide, k = side + ':' + (cut ? cut.uuid : '');
    let b = blackCache.get(k); if (!b) blackCache.set(k, b = new THREE.MeshBasicMaterial({ color: 0x000000, fog: false, toneMapped: false, side, map: cut, alphaTest: cut ? Math.max(0.3, m.alphaTest || 0) : 0 }));
    return b;
  };
  const alphaOnly = sh => { sh.fragmentShader = sh.fragmentShader.replace('#include <map_fragment>', '#ifdef USE_MAP\n diffuseColor.a *= texture2D( map, vMapUv ).a;\n#endif'); };
  const idMat = (f, id) => {
    const cut = f.opq < 0.98 || f.mat.alphaTest > 0;
    const m = new THREE.MeshBasicMaterial({ fog: false, toneMapped: false, side: THREE.FrontSide, map: cut ? f.mat.map : null, alphaTest: cut ? Math.max(0.3, f.mat.alphaTest || 0) : 0, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -8 });
    m.color.setRGB((id & 255) / 255, ((id >> 8) & 255) / 255, ((id >> 16) & 255) / 255, THREE.LinearSRGBColorSpace);
    if (cut) { m.onBeforeCompile = alphaOnly; m.customProgramCacheKey = () => 'alphaOnly'; }
    return m;
  };
  const seeThrough = m => !m || m.visible === false || m.colorWrite === false || (m.transparent && (m.opacity < 0.6 || m.blending !== THREE.NormalBlending || m.depthWrite === false && !m.map));
  const karts = new Set(); for (const kv of s0.view.karts || []) kv.rig?.root?.traverse(c => karts.add(c));
  const overlay = new THREE.Group(); overlay.name = 'sign-sight-overlay';
  const all = []; scene.traverse(o => all.push(o));
  for (const o of all) {
    if (karts.has(o) || o.isPoints || o.isSprite || o.isLine) { if (o.isMesh || o.isPoints || o.isSprite || o.isLine) hide(o); continue; }
    if (!o.isMesh) continue;
    if (hideOrig.has(o) || mats(o).every(seeThrough)) { hide(o); continue; }
    if (Array.isArray(o.material)) setMat(o, o.material.map(m => seeThrough(m) ? new THREE.MeshBasicMaterial({ visible: false }) : black(m)));
    else setMat(o, black(o.material));
  }
  const quadGeo = (corners, uv) => {
    const g = new THREE.BufferGeometry(), [a, b, c, d] = corners; g.setAttribute('position', new THREE.Float32BufferAttribute([a, b, c, a, c, d].flatMap(v => [v.x, v.y, v.z]), 3));
    if (uv) { const [u0, v0, u1, v1] = uv; g.setAttribute('uv', new THREE.Float32BufferAttribute([u0, v0, u1, v0, u1, v1, u0, v0, u1, v1, u0, v1], 2)); }
    return g;
  };
  // a quad mesh with signs on it is redrawn face by face: every face blocks, and each sign's lettering goes on top in its colour
  for (const { o, list } of quadMeshes) {
    const pos = o.geometry.attributes.position, U = o.geometry.attributes.uv;
    for (const q of list) overlay.add(new THREE.Mesh(quadGeo([q, q + 1, q + 2, q + 5].map(i => V(pos, i).applyMatrix4(o.matrixWorld)), [U.getX(q), U.getY(q), U.getX(q + 2), U.getY(q + 2)]), black(o.material)));
  }
  let id = 0;
  for (const s of signs) for (const f of s.faces) { f.id = ++id; overlay.add(new THREE.Mesh(quadGeo(f.tcorners, f.tuv), idMat(f, f.id))); }
  scene.add(overlay); overlay.updateMatrixWorld(true);
  const bg = scene.background; scene.background = null;

  /* 4. drive the camera round the racing line */
  const rt = new THREE.WebGLRenderTarget(W, H, { depthBuffer: true });
  const cam = new THREE.PerspectiveCamera(59, W / H, 0.25, 2600);
  const buf = new Uint8Array(W * H * 4), K = Math.ceil(tr.length / STEP), P = new THREE.Vector3(), A = new THREE.Vector3(), B = new THREE.Vector3(), tmp = new THREE.Vector3();
  const lat = s => { const fi = ((s % tr.length) + tr.length) % tr.length / tr.ds, i = Math.floor(fi) % tr.N, j = (i + 1) % tr.N, t = fi - Math.floor(fi); return tr.lineLat[i] * (1 - t) + tr.lineLat[j] * t; };
  const auto = renderer.shadowMap.autoUpdate; renderer.shadowMap.autoUpdate = false;
  const clear = new THREE.Color(); renderer.getClearColor(clear); const clearA = renderer.getClearAlpha();
  renderer.setClearColor(0x000000, 1);
  for (const s of signs) { s.ok = new Uint8Array(K); s.faced = new Uint8Array(K); s.best = { score: -1 }; }
  const tanHalf = Math.tan(cam.fov * Math.PI / 360);
  const camAt = s => {
    tr.pointAt(s, lat(s), P); tr.pointAt(s - 2, lat(s - 2), A); tr.pointAt(s + 2, lat(s + 2), B);
    const yaw = Math.atan2(B.x - A.x, B.z - A.z), fx = Math.sin(yaw), fz = Math.cos(yaw), i = Math.floor((((s % tr.length) + tr.length) % tr.length) / tr.ds) % tr.N;
    cam.position.set(P.x - fx * 6.2, P.y + 2.35, P.z - fz * 6.2);
    if (tr.hasTerrain && !tr.tunnel[i] && !tr.bridge[i]) cam.position.y = Math.max(cam.position.y, tr.terrainHeight(cam.position.x, cam.position.z) + 0.9);
    if (tr.cameraCeiling) { const eye = P.y + 1.15; let mh = Infinity; for (let k = 1; k <= 4; k++) { const t = k / 4, x = P.x + (cam.position.x - P.x) * t, z = P.z + (cam.position.z - P.z) * t; mh = Math.min(mh, eye + (tr.cameraCeiling(x, z, P.y) - 0.56 - eye) / t); } cam.position.y = Math.min(cam.position.y, mh); }
    cam.lookAt(P.x + fx * 4.2, P.y + 1.25, P.z + fz * 4.2); cam.updateMatrixWorld(true);
    return { pos: cam.position.toArray(), look: [P.x + fx * 4.2, P.y + 1.25, P.z + fz * 4.2] };
  };
  /* the start grid: each kart sits still there through the countdown, so a sign that reads from a grid slot is read */
  const gridAt = k => {
    const g = tr.gridSlot(k), fx = Math.sin(g.yaw), fz = Math.cos(g.yaw);
    cam.position.set(g.x - fx * 5.5, g.y + 2.35, g.z - fz * 5.5); cam.lookAt(g.x + fx * 4.2, g.y + 1.25, g.z + fz * 4.2); cam.updateMatrixWorld(true);
    return { pos: cam.position.toArray(), look: [g.x + fx * 4.2, g.y + 1.25, g.z + fz * 4.2] };
  };
  const slots = (BK.race.karts || []).length || 8;
  const t0 = performance.now(), cnt = new Uint32Array(id + 2);
  for (let k = 0; k < K + slots; k++) {
    const grid = k >= K, s = k * STEP; if (grid) gridAt(k - K); else camAt(s);
    // only render where some sign is in range and in front
    const near = signs.filter(sg => sg.faces.some(f => { tmp.subVectors(f.center, cam.position); return tmp.length() < T.MAXD + Math.max(f.w, f.h); }));
    if (!near.length) continue;
    renderer.setRenderTarget(rt); renderer.clear(); renderer.render(scene, cam); renderer.readRenderTargetPixels(rt, 0, 0, W, H, buf);
    cnt.fill(0); for (let p = 0; p < buf.length; p += 4) { const v = buf[p] | (buf[p + 1] << 8) | (buf[p + 2] << 16); if (v && v <= id) cnt[v]++; }
    for (const sg of near) for (const f of sg.faces) {
      tmp.subVectors(cam.position, f.center); const dist = tmp.length(), cos = tmp.dot(f.n) / dist;
      if (dist > T.MAXD + Math.max(f.w, f.h) || cos <= 0) continue;   // from behind, a two-sided face shows its text mirrored
      const facing = cos;
      // would it read here if nothing stood in front of it? (its middle on screen, facing us, big enough)
      const mid = f.center.clone().applyMatrix4(cam.matrixWorldInverse), ahead = mid.z < -0.3; mid.applyMatrix4(cam.projectionMatrix);
      if (!grid && ahead && Math.abs(mid.x) <= 1 && Math.abs(mid.y) <= 1 && facing >= T.COS && f.textH / (2 * dist * tanHalf) * 720 >= T.PX) sg.faced[k] = 1;
      const pts = f.tcorners.map(c => { const v = c.clone().applyMatrix4(cam.matrixWorldInverse); const behind = v.z > -0.3; v.applyMatrix4(cam.projectionMatrix); return { x: (v.x + 1) / 2 * W, y: (1 - v.y) / 2 * H, behind }; });
      if (pts.some(p => p.behind)) continue;
      let area = 0; for (let q = 0; q < 4; q++) { const a = pts[q], b = pts[(q + 1) % 4]; area += a.x * b.y - b.x * a.y; } area = Math.abs(area) / 2;
      const expect = area * f.opq; if (expect < 4) continue;
      const frac = Math.min(1, cnt[f.id] / expect);
      const boxH = (Math.hypot(pts[3].x - pts[0].x, pts[3].y - pts[0].y) + Math.hypot(pts[2].x - pts[1].x, pts[2].y - pts[1].y)) / 2;
      const px = boxH * (f.textH / f.tcorners[0].distanceTo(f.tcorners[3])) * 720 / H;
      const reads = frac >= T.FRAC && px >= T.PX && facing >= T.COS;
      if (TRACE && new RegExp(TRACE, "i").test(sg.text) && !grid) (sg.trace ||= []).push(`cp${tr.cp[Math.floor(s / tr.ds) % tr.N].toFixed(2)}:${Math.round(frac * 100)}%/${Math.round(px)}px/${cos.toFixed(2)}`);
      if (reads && grid) sg.grid = k - K;
      if (reads && !grid) sg.ok[k] = 1;
      if (grid) continue;
      const score = Math.min(frac / T.FRAC, 1) * 2 + Math.min(px / T.PX, 1) + Math.min(facing / T.COS, 1) + (reads ? 1 : 0);
      if (score > sg.best.score) sg.best = { score, frac: +frac.toFixed(2), px: Math.round(px), cos: +cos.toFixed(2), k, s };
    }
  }
  const ms = performance.now() - t0;
  // --shots: the ID view at each flagged sign's best moment (that sign red, other signs blue, blockers black, sky white)
  const idView = sg => {
    camAt(sg.best.s); renderer.setClearColor(0xffffff, 1); renderer.setRenderTarget(rt); renderer.clear(); renderer.render(scene, cam); renderer.readRenderTargetPixels(rt, 0, 0, W, H, buf); renderer.setClearColor(0x000000, 1);
    const cv = document.createElement('canvas'); cv.width = W; cv.height = H; const g = cv.getContext('2d'), im = g.createImageData(W, H), mine = new Set(sg.faces.map(f => f.id));
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const p = ((H - 1 - y) * W + x) * 4, q = (y * W + x) * 4, v = buf[p] | (buf[p + 1] << 8) | (buf[p + 2] << 16);
      const c = v === 0xffffff ? [235, 235, 235] : mine.has(v) ? [230, 30, 30] : v && v <= id ? [40, 90, 230] : [20, 20, 20];
      im.data[q] = c[0]; im.data[q + 1] = c[1]; im.data[q + 2] = c[2]; im.data[q + 3] = 255;
    }
    g.putImageData(im, 0, 0); return cv.toDataURL('image/png');
  };
  const longest = a => {   // longest run round the lap; a single camera point missing (a lamp post going by) does not break it
    const b = a.map((v, k) => v || (a[(k + K - 1) % K] && a[(k + 1) % K]) ? 1 : 0);
    let best = 0, run = 0, end = -1;
    for (let k = 0; k < 2 * K; k++) { if (b[k % K]) { run++; if (run > best) { best = run; end = k; } } else run = 0; if (run >= K) break; }
    return [Math.min(best, K) * STEP, end];
  };
  for (const sg of signs) { [sg.runM, sg.end] = longest(sg.ok); [sg.facedM] = longest(sg.faced); if (DEBUG && sg.best.s != null && sg.facedM >= T.SCOPE && sg.runM < T.SUSTAIN && sg.grid == null) sg.idView = idView(sg); }
  // put the scene back (so --shots can render it)
  for (let r = restore.length - 1; r >= 0; r--) { const [o, k, v] = restore[r]; o[k] = v; }
  scene.remove(overlay); scene.background = bg; renderer.setRenderTarget(null); renderer.setClearColor(clear, clearA); renderer.shadowMap.autoUpdate = auto;

  /* 5. longest run of reading camera points, round the lap */
  const out = [];
  for (const sg of signs) {
    const { runM, end, facedM } = sg, f = sg.faces[0], at = f.center;
    const cv = document.createElement('canvas'), [rx, ry, rw, rh] = sg.rect; cv.width = Math.max(1, Math.round(Math.min(400, rw))); cv.height = Math.max(1, Math.round(cv.width * rh / Math.max(1, rw)));
    try { cv.getContext('2d').drawImage(sg.img, rx, ry, rw, rh, 0, 0, cv.width, cv.height); } catch {}
    const view = sg.best.s != null ? camAt(sg.best.s) : null;
    out.push({ text: sg.text, cp: cpOf(at), at: at.toArray().map(x => +x.toFixed(1)), size: [+sg.w.toFixed(1), +sg.h.toFixed(1)], textH: +sg.textH.toFixed(2), runM, facedM, scope: facedM >= T.SCOPE, grid: sg.grid, pass: runM >= T.SUSTAIN || facedM < T.SCOPE || sg.grid != null, runEndCp: end >= 0 ? cpOf(tr.pointAt((end % K) * STEP, 0, new THREE.Vector3())) : null, best: sg.best, bestCp: sg.best.s != null ? cpOf(tr.pointAt(sg.best.s, 0, new THREE.Vector3())) : null, view, crop: cv.toDataURL("image/png"), idView: sg.idView, trace: sg.trace });
  }
  return { faces: faces.length, signs: signs.length, renders: K, ms: Math.round(ms), list: out };
};

const all = (await readdir(join(root, 'src/tracks'))).filter(f => f.endsWith('.js') && !f.startsWith('_')).map(f => f.slice(0, -3)).sort();
const tracks = opt.track ? String(opt.track).split(',') : all;
// every quality tier: lower tiers plant fewer trees, and the rest of a track's scattered scenery then lands elsewhere
const tiers = String(opt.q || 'high,medium,low').split(',');
let total = 0;
const ctx = await browser.newContext({ viewport: { width: 960, height: 540 }, serviceWorkers: 'block' });
await ctx.addInitScript(recordText);
const allowed = (id, text) => ALLOW.find(a => a.track === id && text.startsWith(a.text)) || KNOWN.find(a => a.track === id && text.includes(a.text)), used = new Set();
try {
  for (const id of tracks) for (const q of tiers) {
    const t0 = Date.now(), page = await ctx.newPage(); const errs = []; page.on('pageerror', e => errs.push(e.message));
    const name = tiers.length > 1 ? `${id} (${q})` : id;
    try {
      await page.goto(base + `?track=${id}&r=larrysergey&intro=0&seed=3&q=${q}`, { waitUntil: 'load' });
      await page.waitForFunction('window.BK && BK.race && BK.session && BK.session.view', null, { timeout: 120000 });
      await page.evaluate(() => document.fonts.ready); await page.waitForTimeout(1200);
    } catch (e) { console.log(`\n== ${name}: did not load (${e.message.split('\n')[0]})${errs.length ? ' ERR ' + errs[0] : ''}`); total++; await page.close(); continue; }
    const res = await page.evaluate(scan, [T, STEP, 480, 270, !!opt.shots, opt.trace || null]);
    const bad = res.list.filter(s => !s.pass && !allowed(id, s.text));
    for (const s of res.list) if (!s.pass && allowed(id, s.text)) used.add(allowed(id, s.text));
    console.log(`\n== ${name}: ${res.signs} signs checked (${res.faces} text faces), ${res.renders} camera points in ${(res.ms / 1000).toFixed(1)} s, ${bad.length} flagged${errs.length ? ' ERR ' + errs[0] : ''}  [${((Date.now() - t0) / 1000).toFixed(0)} s]`);
    let n = 0;
    for (const s of res.list.sort((p, q) => p.cp - q.cp)) {
      if (opt.only && !new RegExp(opt.only, 'i').test(s.text)) continue;
      const flagged = !s.pass && !allowed(id, s.text);
      if (!flagged && !opt.all && !opt.only) continue;
      const b = s.best, tag = !s.scope ? 'away' : s.pass ? 'ok  ' : allowed(id, s.text) ? (allowed(id, s.text).why ? 'allow' : 'known') : 'FLAG';
      let file = '';
      if (flagged || opt.only) {
        file = join(outdir, `${id}${tiers.length > 1 ? '-' + q : ''}-${String(++n).padStart(2, '0')}.png`);
        await writeFile(file, Buffer.from(s.crop.split(',')[1], 'base64'));
        if (opt.shots && s.view) {
          await page.evaluate(([pos, look]) => { BK.app.afterUpdate = st => { const cam = st.view.views[0].camera; for (const h of st.huds) h.setVisible(false); cam.position.set(...pos); cam.lookAt(...look); st.view.views[0].focus.set(...look); if (cam.fov !== 59) { cam.fov = 59; cam.updateProjectionMatrix(); } }; }, [s.view.pos, s.view.look]);
          await page.waitForTimeout(400);
          await page.screenshot({ path: file.replace(/\.png$/, '-view.jpg'), type: 'jpeg', quality: 80 });
          if (s.idView) await writeFile(file.replace(/\.png$/, '-id.png'), Buffer.from(s.idView.split(',')[1], 'base64'));
        }
      }
      console.log(`  ${tag} "${s.text}" cp ${s.cp} (${s.size.join('x')} m, text ${s.textH} m) faces the road for ${s.facedM} m, reads for ${s.runM} m${s.runM ? ' ending cp ' + s.runEndCp : ''}${s.grid != null ? ', and from grid slot ' + (s.grid + 1) : ''} | best at cp ${s.bestCp}: ${Math.round((b.frac ?? 0) * 100)}% visible, text ${b.px ?? 0} px, facing ${b.cos ?? "-"}${file ? ' | ' + file : ''}`);
      if (s.trace) console.log('    ' + s.trace.join(' '));
    }
    total += bad.length;
    if (q === tiers[tiers.length - 1]) for (const a of [...ALLOW, ...KNOWN]) if (a.track === id && !used.has(a)) console.log(`  note: the ${a.why ? 'ALLOW' : 'KNOWN'} entry "${a.text}" matches no flagged sign; take it out`);
    await page.close();
  }
} finally { await browser.close(); server.close(); }
console.log(`\nthresholds: ${Math.round(T.FRAC * 100)}% visible, text ${T.PX} px of 720, facing cos ${T.COS}, for ${T.SUSTAIN} m; text from ${T.MINTEXT} m. crops in ${outdir}`);
console.log(total ? `sign-sight-check: ${total} flagged` : 'sign-sight-check: ok');
process.exit(total ? 1 : 0);
