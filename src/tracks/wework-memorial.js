/* WeWork Memorial: a grand prix through one floor plate of an abandoned
   coworking empire — lobby atrium, a mezzanine lounge deck reached by the
   lobby's bleacher feature ramp, a sea of cubicles, the community kitchen,
   up the green switchback stairwell to the executive floor, across the
   balcony over your own start line, and down the red fire stair to a
   reception desk that still wants you to check in. Fully enclosed: there
   is no sky in this track, not overhead, not through a window.
   Design: docs/track-design-wework.md (Roger-approved, PR #130, incl. the
   mezzanine amendment: the Floor 1 centreline crossing at (68, 32) is
   grade-separated — the east corridor rides a glass-sided mezzanine
   bridge over the atrium return lane, deck y 3.50, soffit y ~3.2). */
import { Scenery, partsOf } from '../render/scenery.js';
import * as P from '../models/props.js';
import * as W from '../models/props-wework-memorial.js';
import { canvasTex, fitText } from '../render/textures.js';

/* ---------- centreline, built row by row from the design doc's table ----------
   Plan geometry and corner radii are the doc's; heights follow its
   height-profile table (mezzanine climb 3.9%, descent 8.0%, stairs 10%). */
function buildPath() {
  const pts = [], AT = {};
  const push = (label, x, y, z, w) => { if (label) AT[label] = pts.length; pts.push({ p: [x, y, z], w }); };
  const last = () => pts[pts.length - 1].p;
  /** Straight from the last point to (x, z); y interpolated (constant grade). */
  function line(label, x, z, y, w, step = 15) {
    const [ax, ay, az] = last(), d = Math.hypot(x - ax, z - az), n = Math.max(1, Math.round(d / step));
    for (let k = 1; k < n; k++) pts.push({ p: [ax + (x - ax) * k / n, ay + (y - ay) * k / n, az + (z - az) * k / n], w });
    push(label, x, y, z, w);
  }
  /** Arc by centre + on-circle mid + exit; y linear in angle (constant grade). */
  function arc(label, cx, cz, mid, exit, y1, w) {
    const [ax, ay, az] = last();
    const a0 = Math.atan2(az - cz, ax - cx), am = Math.atan2(mid[1] - cz, mid[0] - cx), a1 = Math.atan2(exit[1] - cz, exit[0] - cx);
    const r = Math.hypot(ax - cx, az - cz);
    const sweep = (f, t) => { let d = t - f; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI; return d; };
    const total = sweep(a0, am) + sweep(am, a1), steps = Math.max(2, Math.round(Math.abs(total) / (Math.PI / 8)));
    for (let k = 1; k < steps; k++) { const f = k / steps, a = a0 + total * f; pts.push({ p: [cx + Math.cos(a) * r, ay + (y1 - ay) * f, cz + Math.sin(a) * r], w }); }
    push(label, exit[0], y1, exit[1], w);
  }
  push('L1 entry', -71, 0, 58, 19);
  line('L1 mid W', -41, 58, 0, 19, 30);
  line('START', -12, 58, 0, 19, 30);
  line('climb begins', -10, 58, 0, 19, 30);
  line('C1 entry', 46, 58, 2.16, 19, 14);                        // feature-ramp climb @ 3.9%
  arc('C1 exit', 46, 36, [61.56, 51.56], [68, 36], 3.50, 16);    // r22, climbing onto the deck
  line('C2 entry', 68, -8, 3.50, 16, 15);                        // L2: the mezzanine deck, dead level
  arc('C2 exit', 48, -8, [62.14, -22.14], [48, -28], 0.99, 22);  // r20, far feature ramp @ 8.0%
  line('touchdown', 35.7, -28, 0, 22, 7);
  line('L3 mid', 0, -28, 0, 22, 18);
  line('C3 entry', -40, -28, 0, 22, 20);
  arc('C3 exit', -40, -6, [-55.56, -21.56], [-62, -6], 0, 19);   // r22
  line('C4 entry', -62, 0, 0, 15, 6);
  arc('L5 entry', -44, 0, [-56.73, 12.73], [-44, 18], 0, 15);    // C4 r18
  line('L5 mid', -4, 18, 0, 15, 20);
  line('C5 entry', 36, 18, 0, 15, 20);
  arc('L6 entry', 36, 2, [47.31, 13.31], [52, 2], 0, 14);        // C5 r16
  line('C6 entry', 52, -14, 0, 14, 18);
  arc('L7 entry', 65, -14, [55.81, -23.19], [65, -27], 0, 13);   // C6 eased to r13 (design doc ladder step 1)
  line('L-A entry', 95, -27, 3, 12.5, 0.625);                    // Stair A flight 1: 30 m @ 10%
  arc('L8 entry', 95, -40, [108, -40], [95, -53], 3, 13);        // landing r13, flat y 3
  line('C7 entry', 63, -53, 6, 14, 0.625);                       // flight 2: 32 m, rise 3 (9.4%)
  arc('L9 entry', 63, -40, [53.81, -49.19], [50, -40], 6, 16);   // C7 r13
  line('C8 entry', 50, -27, 6, 16, 13);
  arc('L10 entry', 37, -27, [46.19, -17.81], [37, -14], 6, 16);  // C8 r13 R
  line('L10 mid', -21, -14, 6, 16, 29);
  line('C9 entry', -80, -14, 6, 17, 29);
  arc('L11 entry', -80, 4, [-92.73, -8.73], [-98, 4], 6, 17);    // C9 r18
  line('C10 entry', -98, 24, 6, 16, 11);
  arc('L12 entry', -84, 24, [-93.9, 33.9], [-84, 38], 6, 16);     // C10 eased to r14 (ladder step 2)
  line('L12 mid', -17, 38, 6, 16, 34);
  line('jog entry', 52, 38, 6, 14, 34);
  arc('jog join', 52, 48, [59.07, 40.93], [62, 48], 6, 13);      // B-jog R r10
  arc('L13 entry', 72, 48, [64.93, 55.07], [72, 58], 6, 13);     // B-jog L r10
  line('L14 entry', 92, 58, 6, 13, 20);
  line('L-B entry', 122, 58, 3, 12.5, 0.625);                    // Stair B flight 1 @ 10%
  arc('L15 entry', 122, 45, [135, 45], [122, 32], 3, 13);        // landing r13, flat y 3
  line('L16 entry', 92, 32, 0, 12.5, 0.625);                     // flight 2 @ 10%
  line('L17 entry', 72, 32, 0, 12, 20);
  line('L17 mid', 0, 32, 0, 12, 36);
  line('HP entry', -71, 32, 0, 13, 36);
  arc('wrap', -71, 45, [-84, 45], [-71, 58], 0, 19);             // reception hairpin r13
  // rotate so the start line is point 0 (drop the duplicated wrap entry)
  const si = AT['START'], path = [...pts.slice(si), ...pts.slice(1, si)];
  const at = {}; for (const k of Object.keys(AT)) at[k] = (AT[k] - si + pts.length - 1) % (pts.length - 1);
  return { path, at };
}
const { path: PATH, at: AT } = buildPath();
const NCP = PATH.length;
const between = (a, b, f) => AT[a] + (AT[b] - AT[a]) * f;

export default {
  id: 'wework-memorial',
  name: 'WeWork Memorial',
  tagline: 'A facilities tour of a dead coworking empire.',
  laps: 3,
  width: 19,
  sky: 'studio',                       // indoor backstop only — the building is the enclosure
  skyOverrides: { fog: 0x1a2260, fogNear: 60, fogFar: 380 },
  terrain: false,                      // no outside exists
  tunnelShell: false,                  // the interior is built by decorate(), not the arch shell
  defaults: { edge: 'wall', shoulder: 0, outer: 0 },
  // the opening shot: the lobby interior — gantry and start line centre-frame,
  // the valuation board on the south wall, the balcony crossing the upper frame
  intro: [{ pos: [-48, 2.2, 43], pos1: [-44, 2.4, 45], look: [30, 3.5, 57], look1: [30, 3.5, 57], fov: 58, dur: 3.4 }],
  lapNotes: [
    '<b>Lap 2.</b> The community manager has left the building.',
    '<b>Final lap.</b> Eviction complete. Thank you for being part of our journey.',
  ],
  path: PATH,
  // whole-lap tunnel marking (interior: kills terrain conform, walls both
  // edges); two entries because the engine's range helper misses the wrap
  // segment — together they cover every sample
  tunnels: [{ from: 0, to: NCP - 1, through: true }, { from: NCP - 1, to: 0, through: true }],
  zones: [
    { from: AT['C2 exit'], to: AT['C3 exit'], skin: 'carpet' },        // S3 cubicle field
    { from: AT['L6 entry'], to: AT['C7 entry'], skin: 'metal' },       // S5 service corridor + S6 stair hall
    { from: AT['C7 entry'], to: AT['jog entry'], skin: 'carpet' },     // S7 exec row, S8 gallery, S9 balcony
    { from: AT['jog entry'], to: AT['L16 entry'], skin: 'metal' },     // S10 fire stair
  ],
  boosts: [
    { at: between('HP entry', 'L1 entry', 1.35), lat: 0, w: 5 },       // hairpin exit, onto the start straight
    { at: AT['L3 mid'] + 0.1, lat: 0, w: 5 },                          // field mid
    { at: AT['L6 entry'] - 0.25, lat: 0, w: 5 },                       // kitchen exit
    { at: AT['L10 mid'], lat: 0, w: 5 },                               // exec row mid
    { at: AT['L12 mid'] + 0.55, lat: 0, w: 5 },                        // balcony late, before the B-jog
  ],
  itemRows: [
    { at: between('HP entry', 'L1 entry', 1.8) },                      // lobby mid-straight
    { at: AT['touchdown'] + 0.25 },                                    // field entry, after C2
    { at: AT['L5 mid'] },                                              // kitchen mid
    { at: between('L8 entry', 'C7 entry', 0.5) },                      // Stair A flight 2
    { at: AT['L12 mid'] },                                             // balcony mid
    { at: AT['L17 mid'] },                                             // return lane mid
  ],
  coins: [
    { from: AT['C2 entry'] + 0.2, to: AT['C2 exit'] + 0.3, n: 5, lat: [-4, 4] },   // the descent line
    { from: AT['touchdown'] + 0.3, to: AT['C3 entry'] - 0.2, n: 6, lat: 2 },       // across the field
    { from: AT['L-A entry'] + 0.1, to: AT['L8 entry'] - 0.1, n: 4, lat: 3 },       // Stair A landing, inside
    { from: AT['L-B entry'] + 0.1, to: AT['L15 entry'] - 0.1, n: 4, lat: 3 },      // Stair B landing, inside
    { from: AT['HP entry'] + 0.1, to: AT['HP entry'] + 2.9, n: 4, lat: 3 },        // hairpin inside
    { from: AT['L12 entry'] + 0.3, to: AT['jog entry'] - 0.3, n: 5, lat: -2 },     // the balcony
  ],
  obstacles: [
    // the phone-booth slalom, all on the flat mezzanine deck (z = 23, 15, 7, -1)
    { kind: 'static', model: 'booth', at: between('C1 exit', 'C2 entry', 0.295), lat: 4.6, effect: 'bump', radius: 0.95 },
    { kind: 'static', model: 'booth', at: between('C1 exit', 'C2 entry', 0.477), lat: -4.6, effect: 'bump', radius: 0.95 },
    { kind: 'static', model: 'booth', at: between('C1 exit', 'C2 entry', 0.659), lat: 4.6, effect: 'bump', radius: 0.95 },
    { kind: 'static', model: 'booth', at: between('C1 exit', 'C2 entry', 0.841), lat: -4.6, effect: 'bump', radius: 0.95 },
    { kind: 'static', model: 'neonO', at: AT['C3 exit'] - 0.35, lat: -6, effect: 'bump', radius: 1.9 },   // the fallen O
    { kind: 'static', model: 'papers', at: AT['C6 entry'] - 0.5, lat: -3.5, effect: 'squash', radius: 1.6 },  // IPO paperwork
    { kind: 'static', model: 'papers', at: between('L15 entry', 'L16 entry', 0.5), lat: 4, effect: 'squash', radius: 1.6 },  // repossession paperwork
    { kind: 'patrol', model: 'bot', at: between('HP entry', 'L1 entry', 1.8), lats: [-8.4, -6.0], speed: 1.6, effect: 'spin', radius: 1.2 },  // the cleaning bot
  ],
  models: { booth: () => W.phoneBooth(), neonO: () => W.neonO(), papers: () => W.paperStack(), bot: () => W.cleaningBot() },
  look: {
    road: { base: 0x9aa0a8, line: 0xffffff, center: false, skin: 'stone' },
    kerb: [0xe8e4da, 0xb9b2a4],
    shoulder: 0x777777,
    wall: 0xe9e6df, wallStripe: 0xc9a227,
    tunnelLight: 0xfff2d8, portal: 0xcfd5e2,
    ads: ['HUSTLE', 'COMMUNITY', 'DO WHAT YOU LOVE', 'ELEVATE', 'GROW TOGETHER', 'SPACE AS A SERVICE', 'HOT DESK, COLD COFFEE', 'SYNERGY'],
  },

  /** Dress the course. ctx: { THREE, track, group, gfx, anim, view } */
  decorate(ctx) { decorate(ctx); },
};

/* ================= interior construction =================
   The building is the enclosure: room boxes, floor slabs and ceiling slabs
   built here (the Datacenter Training Hall pattern). The engine's tunnel
   marking only supplies collision edges and kills the terrain. */
class Quads {
  constructor(T) { this.T = T; this.pos = []; this.nor = []; this.uv = []; this.idx = []; this.col = []; }
  quad(a, b, c, d, u = 1, v = 1, tint = 0xffffff) {
    const o = this.pos.length / 3, n = normalOf(a, b, c);
    const t = new this.T.Color(tint), rgba = [t.r, t.g, t.b, 1];
    for (const p of [a, b, c, d]) { this.pos.push(p[0], p[1], p[2]); this.nor.push(n[0], n[1], n[2]); this.col.push(...rgba); }
    this.uv.push(0, 0, u, 0, u, v, 0, v); this.idx.push(o, o + 1, o + 2, o, o + 2, o + 3);
  }
  /** Four sides + top of an axis-aligned box (no bottom). */
  box(x0, y0, z0, x1, y1, z1, t = 0xffffff) {
    this.quad([x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1], (x1 - x0) / 3, (y1 - y0) / 3, t);
    this.quad([x1, y0, z0], [x0, y0, z0], [x0, y1, z0], [x1, y1, z0], (x1 - x0) / 3, (y1 - y0) / 3, t);
    this.quad([x1, y0, z1], [x1, y0, z0], [x1, y1, z0], [x1, y1, z1], (z1 - z0) / 3, (y1 - y0) / 3, t);
    this.quad([x0, y0, z0], [x0, y0, z1], [x0, y1, z1], [x0, y1, z0], (z1 - z0) / 3, (y1 - y0) / 3, t);
    this.quad([x0, y1, z0], [x1, y1, z0], [x1, y1, z1], [x0, y1, z1], (x1 - x0) / 3, (z1 - z0) / 3, t);
  }
  mesh(material, shadow = false) {
    const T = this.T, g = new T.BufferGeometry();
    g.setAttribute('position', new T.Float32BufferAttribute(this.pos, 3));
    g.setAttribute('normal', new T.Float32BufferAttribute(this.nor, 3));
    g.setAttribute('uv', new T.Float32BufferAttribute(this.uv, 2));
    g.setAttribute('color', new T.Float32BufferAttribute(this.col, 4));
    g.setIndex(this.idx);
    const m = new T.Mesh(g, material);
    m.castShadow = shadow; m.receiveShadow = true;
    return m;
  }
}
function normalOf(a, b, c) {
  const u = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], v = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
  const n = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]], l = Math.hypot(...n) || 1;
  return [n[0] / l, n[1] / l, n[2] / l];
}

const FONT = "'Arial Black', Arial, sans-serif";
const DEG = Math.PI / 180;

function decorate(ctx) {
  const { THREE, track, group, view } = ctx, sc = new Scenery(ctx);
  const atPos = (at, lat = 0, lift = 0) => {
    const i = track.indexAtCp(at), hx = Math.hypot(track.lx[i], track.lz[i]) || 1;
    const lx = track.lx[i] / hx, lz = track.lz[i] / hx;
    return { x: track.px[i] + lx * lat, z: track.pz[i] + lz * lat, y: track.py[i] + lift, yaw: track.yaw[i], i, lx, lz };
  };
  const put = (obj, x, y, z, yawDeg = 0) => { obj.position.set(x, y, z); obj.rotation.y = yawDeg * DEG; group.add(obj); return obj; };

  // start gantry at point 0
  const g0 = atPos(0, 0);
  const gantry = P.gantry(track.hwL[0] + track.hwR[0] + 1.5, 'WEWORK MEMORIAL');
  sc.place(gantry, g0.x, g0.z, { yaw: g0.yaw, y: g0.y });
  view.startLights = gantry.userData.lights;

  /* ---- sign machinery: canvas texture + fitText (never squashed) ---- */
  function signMat(lines, { w = 1024, h = 256, bg = '#23262d', fg = '#f5efe0', size = 120, after = null } = {}) {
    const draw = (g) => {
      g.fillStyle = bg; g.fillRect(0, 0, w, h);
      const ls = lines.map(l => typeof l === 'string' ? { t: l } : l);
      ls.forEach((ln, i) => {
        const cy = h * (i + 1) / (ls.length + 1);
        fitText(g, ln.t, w / 2, cy, w * .94, h / ls.length * .78, ln.size || size, FONT, { fill: ln.fg || fg });
        if (ln.strike) { g.strokeStyle = ln.strike; g.lineWidth = h * .045; g.beginPath(); g.moveTo(w * .06, cy + h * .02); g.lineTo(w * .94, cy - h * .05); g.stroke(); }
      });
      if (after) after(g, w, h);
    };
    const tex = canvasTex(w, h, draw, { repeat: false });
    if (typeof document !== 'undefined' && document.fonts?.ready) document.fonts.ready.then(() => { draw(tex.image.getContext('2d')); tex.needsUpdate = true; });
    return new THREE.MeshBasicMaterial({ map: tex });
  }
  function sign(lines, wM, hM, opts = {}) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(wM, hM), signMat(lines, opts));
    return m;
  }
  const putSign = (lines, wM, hM, x, y, z, yawDeg = 0, opts = {}) => put(sign(lines, wM, hM, opts), x, y, z, yawDeg);

  /* ---- shared interior textures ---- */
  const wallTex = canvasTex(256, 256, (g) => {
    g.fillStyle = '#e9e4d8'; g.fillRect(0, 0, 256, 256);
    g.fillStyle = 'rgba(120,110,95,.25)'; g.fillRect(0, 84, 256, 3); g.fillRect(0, 170, 256, 3); g.fillRect(126, 0, 3, 256);
    g.fillStyle = 'rgba(90,80,60,.10)'; g.fillRect(0, 236, 256, 20);
  });
  const floorTex = canvasTex(256, 256, (g) => {
    g.fillStyle = '#b7b0a1'; g.fillRect(0, 0, 256, 256);
    g.fillStyle = 'rgba(70,64,54,.35)'; g.fillRect(0, 0, 256, 4); g.fillRect(0, 0, 4, 256);
    g.fillStyle = 'rgba(255,255,255,.06)'; g.fillRect(4, 4, 248, 248);
  });
  const ceilDraw = (dark) => (g) => {
    g.fillStyle = '#4a4a52'; g.fillRect(0, 0, 256, 256);
    const cells = [[14, 14], [140, 14], [14, 140], [140, 140]];
    cells.forEach(([x, y], i) => { g.fillStyle = (dark && i !== 1) ? '#3a3a42' : '#fff6dd'; g.fillRect(x, y, 102, 102); });
    g.fillStyle = '#33333c'; g.fillRect(0, 126, 256, 4); g.fillRect(126, 0, 4, 256);
  };
  const ceilTex = canvasTex(256, 256, ceilDraw(false));
  const ceilDarkTex = canvasTex(256, 256, ceilDraw(true));
  const carpetTex = canvasTex(256, 256, (g) => {
    g.fillStyle = '#5d6472'; g.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 2600; i++) { g.fillStyle = Math.random() < .5 ? 'rgba(255,255,255,.05)' : 'rgba(0,0,0,.09)'; g.fillRect(Math.random() * 256, Math.random() * 256, 2, 2); }
    g.fillStyle = 'rgba(30,32,40,.35)'; g.fillRect(0, 0, 256, 3); g.fillRect(0, 0, 3, 256);
  });
  const frostTex = canvasTex(256, 256, (g) => {
    const gr = g.createLinearGradient(0, 0, 0, 256); gr.addColorStop(0, '#cfdde6'); gr.addColorStop(1, '#aebfcc');
    g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
    g.fillStyle = 'rgba(255,255,255,.35)'; g.fillRect(0, 0, 256, 26);
    g.fillStyle = '#3c4149'; g.fillRect(124, 0, 8, 256); g.fillRect(0, 124, 256, 8);
  });
  const pigeonTex = canvasTex(512, 256, (g) => {
    g.fillStyle = '#7a6a4f'; g.fillRect(0, 0, 512, 256);
    for (let r = 0; r < 6; r++) for (let c = 0; c < 12; c++) {
      g.fillStyle = '#241d12'; g.fillRect(8 + c * 42, 8 + r * 41, 36, 34);
      if ((r * 7 + c * 3) % 4 === 0) { g.fillStyle = '#e8e2ce'; g.fillRect(12 + c * 42, 20 + r * 41, 28, 16); }
    }
  });
  const wallMat = new THREE.MeshStandardMaterial({ map: wallTex, vertexColors: true, roughness: .92 , side: THREE.DoubleSide});
  const frostMat = new THREE.MeshStandardMaterial({ map: frostTex, vertexColors: true, roughness: .35, metalness: .1 , side: THREE.DoubleSide});
  const floorMat = new THREE.MeshStandardMaterial({ map: floorTex, vertexColors: true, roughness: .85 , side: THREE.DoubleSide});
  const carpetMat = new THREE.MeshStandardMaterial({ map: carpetTex, vertexColors: true, roughness: .98 , side: THREE.DoubleSide});
  const ceilMat = new THREE.MeshBasicMaterial({ map: ceilTex, vertexColors: true , side: THREE.DoubleSide});
  const ceilDarkMat = new THREE.MeshBasicMaterial({ map: ceilDarkTex, vertexColors: true , side: THREE.DoubleSide});
  const metalMat = new THREE.MeshStandardMaterial({ color: 0x848b94, vertexColors: true, roughness: .45, metalness: .65 , side: THREE.DoubleSide});
  const darkMat = new THREE.MeshStandardMaterial({ color: 0x33363d, vertexColors: true, roughness: .7, metalness: .3 , side: THREE.DoubleSide});

  const WQ = new Quads(THREE), FQ = new Quads(THREE), CQ = new Quads(THREE), CDQ = new Quads(THREE), SQ = new Quads(THREE), KQ = new Quads(THREE), MQ = new Quads(THREE), DQ = new Quads(THREE);
  const wall = (x0, y0, z0, x1, y1, z1) => WQ.box(x0, y0, z0, x1, y1, z1);
  const slab = (x0, z0, x1, z1, yTop, mat) => { const q = mat === 'carpet' ? KQ : SQ; q.quad([x0, yTop, z0], [x1, yTop, z0], [x1, yTop, z1], [x0, yTop, z1], (x1 - x0) / 4, (z1 - z0) / 4); q.quad([x0, yTop - .26, z1], [x1, yTop - .26, z1], [x1, yTop, z1], [x0, yTop, z1], (x1 - x0) / 3, .1, 0x8f887a); q.quad([x1, yTop - .26, z0], [x0, yTop - .26, z0], [x0, yTop, z0], [x1, yTop, z0], (x1 - x0) / 3, .1, 0x8f887a); q.quad([x1, yTop - .26, z1], [x1, yTop - .26, z0], [x1, yTop, z0], [x1, yTop, z1], (z1 - z0) / 3, .1, 0x8f887a); q.quad([x0, yTop - .26, z0], [x0, yTop - .26, z1], [x0, yTop, z1], [x0, yTop, z0], (z1 - z0) / 3, .1, 0x8f887a); };
  const ceil = (x0, z0, x1, z1, y, dark = false) => { const q = dark ? CDQ : CQ; q.quad([x0, y, z1], [x1, y, z1], [x1, y, z0], [x0, y, z0], (x1 - x0) / 6, (z1 - z0) / 6); };

  /* ---- plate + perimeter + roof (no sky anywhere: the roof is one slab) ---- */
  SQ.quad([-116, -.06, -70], [148, -.06, -70], [148, -.06, 76], [-116, -.06, 76], 264 / 4, 146 / 4);
  wall(-116.3, -.4, -70.3, 148.3, 12.5, -69.7); wall(-116.3, -.4, 75.7, 148.3, 12.5, 76.3);
  wall(-116.3, -.4, -70.3, -115.7, 12.5, 76.3); wall(147.7, -.4, -70.3, 148.3, 12.5, 76.3);
  ceil(-116, -70, 148, 76, 12.5);
  ceil(-88, -52, 80, 2, 12.42, true);          // field void: a third of the panels are dead

  /* ---- atrium ---- */
  wall(-100, 0, 25.7, 59, 12.5, 26.3);                       // north wall (ELEVATE mural wall)
  wall(77, 0, 25.7, 80, 12.5, 26.3);
  wall(59, 8.9, 25.7, 77, 12.5, 26.3);                       // header above the mezzanine deck gap
  wall(79.7, 0, 38.5, 80.3, 12.5, 51.5);                     // east wall between the stair-B gaps
  wall(79.7, 4.2, 25.5, 80.3, 12.5, 38.5);                   // above the return-lane gap
  wall(79.7, 0, 51.5, 80.3, 4.8, 64.5);                      // below the Stair B throat gap
  wall(79.7, 10.5, 51.5, 80.3, 12.5, 64.5);
  wall(79.7, 0, 64.5, 80.3, 12.5, 70);
  wall(-100.3, 0, 26, -99.7, 12.5, 70);                      // atrium west wall

  /* ---- cubicle field ---- */
  wall(-88, 0, -52.3, 80, 12.5, -51.7);                      // north (DO WHAT YOU LOVE wall)
  wall(-88.3, 0, -52, -87.7, 12.5, 2);                       // west
  wall(79.7, 0, -52, 80.3, 12.5, -34);                       // east, north of flight 1
  wall(79.7, 0, -19, 80.3, 12.5, 2);                         // east, south of flight 1
  wall(-88, 0, 1.7, -69.5, 12.5, 2.3);                       // south wall segments (kitchen door gap x -69.5..-54.5)
  wall(-54.5, 0, 1.7, 44, 12.5, 2.3);
  wall(-69.5, 5.6, 1.7, -54.5, 12.5, 2.3);
  wall(61, 0, 1.7, 80, 12.5, 2.3);                           // corridor entry gap x 44..61 (header below)
  wall(44, 5.6, 1.7, 61, 12.5, 2.3);

  /* ---- kitchen ---- */
  wall(-70.3, 0, 2, -69.7, 5.6, 26);                         // west
  wall(43.7, 0, 2, 44.3, 5.6, 26);                           // east
  // (south side is the atrium north wall, shared with the return lane)
  ceil(-70, 2, 44, 26, 5.6);

  /* ---- service corridor ---- */
  wall(43.7, 0, -21, 44.3, 4.8, 2);
  wall(60.7, 0, -19, 61.3, 4.8, 11);
  ceil(44, -21, 61, 11, 4.8);
  wall(44, 4.8, -21.3, 54.5, 12.5, -20.7);                   // north fascia over the C6 corner
  MQ.quad([44, -.015, 11], [61, -.015, 11], [61, -.015, -21], [44, -.015, -21], 17 / 3, 32 / 3); // metal floor

  /* ---- Stairwell A shaft ---- */
  wall(56.7, 0, -59, 57.3, 4.6, -44); wall(56.7, 7.8, -59, 57.3, 12.5, -44);   // west, around the F2 exit opening
  wall(56.7, 0, -44, 57.3, 12.5, -30);
  wall(56.7, 5.0, -30, 57.3, 12.5, -19);                                     // header over the entry opening
  wall(111.7, 0, -59, 112.3, 12.5, -21);                                     // east
  wall(57, 0, -59.3, 112, 12.5, -58.7);                                      // north
  wall(65, 0, -21.3, 112, 12.5, -20.7);                                      // south (east of the corner zone)

  /* ---- Stairwell B tower ---- */
  wall(80, 0, 23.7, 148, 11, 24.3);                                          // north
  wall(80, 0, 65.7, 148, 11, 66.3);                                          // south
  ceil(80, 24, 148, 66, 11);

  /* ---- Floor 2 slabs ---- */
  slab(-84, -23, 57, -5.4, 5.94, 'carpet');                                  // executive row
  FQ.box(-84, 5.94, -23.2, 34, 12.5, -22.5);                                 // exec-row office fronts (frosted; stops west of the C8 swing)
  slab(30, -56, 66, -5.4, 5.95, 'carpet');                                   // gallery dog-leg (1 cm proud: no z-fight with the exec slab)
  slab(-116, 28, 56, 46.6, 5.94, 'carpet');                                  // south balcony
  slab(52, 36, 80, 64, 5.95, 'carpet');                                      // Stair B throat deck
  slab(-116, -16, -78, 28, 5.94, 'carpet');                                  // meeting gallery floor
  wall(-116, 6, -16.3, -78, 12.5, -15.7);                                    // chamber north wall (F2)

  /* ---- mezzanine deck + bridge ---- */
  slab(56, -13, 80, 38, 3.44, 'stone');
  FQ.box(79.4, 3.44, -13, 80, 8.9, 38);                                      // frosted office fronts, east
  ceil(56, -13, 80, 38, 8.92);
  ceil(59, 26, 77, 38, 3.18);                                                // bridge soffit light panels

  /* ---- floor overlays ---- */
  KQ.quad([-88, -.02, -52], [80, -.02, -52], [80, -.02, 2], [-88, -.02, 2], 168 / 4, 54 / 4);   // field carpet

  for (const [q, m] of [[WQ, wallMat], [FQ, frostMat], [CQ, ceilMat], [CDQ, ceilDarkMat], [SQ, floorMat], [KQ, carpetMat], [MQ, metalMat], [DQ, darkMat]]) if (q.pos.length) group.add(q.mesh(m));

  // mailroom pigeonhole wall under the bridge (its own textured box)
  const mail = new Quads(THREE); mail.box(58.5, 0, 25.7, 77.5, 3.05, 26.3);
  group.add(mail.mesh(new THREE.MeshStandardMaterial({ map: pigeonTex, vertexColors: true, roughness: .8, side: THREE.DoubleSide })));

  dressSectors(ctx, { sc, atPos, put, putSign, sign, track });
}

/* Spline-following soffit: a strip under the road between two control
   points (the feature ramp, the descent, the stair flights). */
function splineSlab(ctx, at0, at1, halfW, drop, mat) {
  const { track, group } = ctx;
  const q = new Quads(ctx.THREE);
  const i0 = track.indexAtCp(at0), i1 = track.indexAtCp(at1);
  const step = 3;
  for (let i = i0; i < i1; i += step) {
    const j = Math.min(i + step, i1);
    const A = pt(track, i, halfW, drop), B = pt(track, i, -halfW, drop), C = pt(track, j, -halfW, drop), D = pt(track, j, halfW, drop);
    q.quad(A, B, C, D, 1, (j - i) * track.ds / 3);
  }
  const m = q.mesh(mat); group.add(m); return m;
  function pt(tr, i, lat, d) { const h = Math.hypot(tr.lx[i], tr.lz[i]) || 1; return [tr.px[i] + tr.lx[i] / h * lat, tr.py[i] - d, tr.pz[i] + tr.lz[i] / h * lat]; }
}

/* ================= sector dressing ================= */
function dressSectors(ctx, H) {
  const { THREE, group, track } = ctx;
  const { sc, atPos, put, putSign, sign } = H;
  const soffitMat = new THREE.MeshStandardMaterial({ color: 0x8f959e, roughness: .8, metalness: .2, side: THREE.DoubleSide });
  const ATT = (name) => AT[name];

  /* ---- soffits under the elevated roads ---- */
  splineSlab(ctx, ATT('climb begins'), ATT('C1 exit'), 8.8, .3, soffitMat);       // feature ramp
  splineSlab(ctx, ATT('C2 entry'), ATT('touchdown'), 11.4, .3, soffitMat);        // descent
  splineSlab(ctx, ATT('L7 entry'), ATT('L-A entry'), 6.9, .28, soffitMat);        // Stair A flight 1
  splineSlab(ctx, ATT('L8 entry'), ATT('C7 entry'), 7.4, .28, soffitMat);         // flight 2
  splineSlab(ctx, ATT('L13 entry'), ATT('L14 entry'), 6.9, .28, soffitMat);       // Stair B throat
  splineSlab(ctx, ATT('L14 entry'), ATT('L-B entry'), 6.9, .28, soffitMat);       // Stair B flight 1
  splineSlab(ctx, ATT('L15 entry'), ATT('L16 entry'), 6.9, .28, soffitMat);       // flight 2
  for (const [cx, cz] of [[95, -40], [122, 45]]) {                                // landing discs
    const disc = new THREE.Mesh(new THREE.CylinderGeometry(13.6, 13.6, .3, 24), soffitMat);
    disc.position.set(cx, 2.79, cz); disc.receiveShadow = true; group.add(disc);
  }
  const island = new THREE.Mesh(new THREE.BoxGeometry(31, .26, 13), soffitMat);   // Stair A island apron
  island.position.set(79.5, 2.81, -40); island.receiveShadow = true; group.add(island);

  /* ---- balustrades: deck west edge, bridge glass, balcony + gallery overlooks ---- */
  const bal = W.balustrade(13);
  for (const z of [-6.5, 6.5, 19.5]) sc.place(bal, 59.9, z, { yaw: Math.PI / 2, y: 3.44 });
  sc.place(W.balustrade(12), 76.6, 32, { yaw: Math.PI / 2, y: 3.44 });
  const bal20 = W.balustrade(20);
  for (const x of [-60, -40, -20, 0, 20, 40]) sc.place(bal20, x, 46.3, { yaw: 0, y: 5.94 });
  for (const x of [-70, -50, -30, -10, 10]) sc.place(bal20, x, -5.7, { yaw: 0, y: 5.94 });

  /* ---- emergency light strips: green in Stair A, red in Stair B ---- */
  const strip = (x, y, z, len, color, yawDeg = 0) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(len, .14, .07), new THREE.MeshBasicMaterial({ color }));
    m.position.set(x, y, z); m.rotation.y = yawDeg * DEG; group.add(m);
  };
  strip(57.5, 5.4, -40, 34, 0x2eff8a, 90); strip(111.5, 5.4, -40, 34, 0x2eff8a, 90); strip(84, 5.4, -58.6, 50, 0x2eff8a);
  strip(100, 8.6, 24.55, 40, 0xff3b30); strip(100, 8.6, 65.45, 40, 0xff3b30); strip(147.4, 8.6, 45, 36, 0xff3b30, 90);

  /* ================= S1: lobby & start ================= */
  putSign([{ t: '$47,000,000,000', fg: '#ffd9d0', strike: '#ff3b30' }, { t: '$0 (COMMUNITY-ADJUSTED)', fg: '#7dffce' }], 17, 5, 16, 6.2, 75.55, 180, { bg: '#1c1410', size: 150, h: 512, w: 1400 });
  putSign(['THIS COMMUNITY OPENED 2019'], 5, .8, -24, 1.7, 75.6, 180, { bg: '#8a6d2f', fg: '#fff3c4', size: 90 });
  putSign(['PIVOT!'], 10, 2.4, -52, 4.5, 75.6, 180, { bg: '#274b63', fg: '#ffe9a8' });
  putSign(['THOUGHTS & PRAYERS CAPITAL'], 11, 2.4, 52, 4.5, 75.6, 180, { bg: '#3a2a4a', fg: '#e8d8ff' });
  putSign(['SPACE AS A SERVICE'], 10, 2.4, -99.6, 6, 48, 90, { bg: '#274b63', fg: '#ffe9a8' });
  putSign(['ELEVATE THE WORLD’S CONSCIOUSNESS'], 36, 4.4, 0, 8.8, 25.55, 0, { bg: '#2a2f3a', fg: '#ffe9b0', size: 110 });
  putSign(['MEZZANINE — COMMUNITY LOUNGE →'], 8, 1.1, 4, 1.9, 66.8, 180, { bg: '#23262d', fg: '#f5efe0', size: 90 });
  sc.place(W.bleacherStep(50), 18, 68.4, { yaw: Math.PI, y: 0 });
  sc.place(W.bleacherStep(50), 18, 70.3, { yaw: Math.PI, y: .42 });
  for (const x of [-52, -30, 30, 52]) sc.place(W.planter(3), x, 71.5, { yaw: 0, y: 0 });
  // glass entrance doors in the C1 braking zone, with the notice on them
  const doorMat = new THREE.MeshStandardMaterial({ color: 0xaad4e2, roughness: .15, transparent: true, opacity: .4 });
  for (const x of [33, 38.5]) { const d = new THREE.Mesh(new THREE.BoxGeometry(4.6, 3.3, .14), doorMat); d.position.set(x, 1.65, 49.3); group.add(d); }
  putSign(['NOTICE', 'TO VACATE'], .95, 1.25, 35.8, 1.7, 49.15, 180, { bg: '#f4f1e8', fg: '#22242a', size: 100 });
  // hanging banners over the atrium floor
  const bannerMat = (lines, opts) => sign(lines, .1, .1, opts).material;
  const hb1 = W.hangingBanner(2.6, 4.6, bannerMat(['HUSTLE'], { bg: '#7a1f3a', fg: '#ffe9a8', size: 130 }));
  put(hb1, -30, 12.3, 47, 0);
  const hb2 = W.hangingBanner(2.6, 4.6, bannerMat(['COMMUNITY'], { bg: '#274b63', fg: '#ffe9a8', size: 110 }));
  put(hb2, 8, 12.3, 47, 0);
  const hb3 = W.hangingBanner(2.6, 4.6, bannerMat(['DO WHAT', 'YOU LOVE'], { bg: '#2a4a2f', fg: '#ffe9a8', size: 110 }));
  put(hb3, 44, 12.3, 43, 20);

  /* ================= S11: atrium return + hairpin ================= */
  put(W.receptionDesk(), -71, 0, 45, 0);
  putSign(['RECEPTION — PLEASE CHECK IN WITH THE COMMUNITY MANAGER'], 3.6, .5, -71, .8, 43.25, 180, { bg: '#8a6d2f', fg: '#fff3c4', size: 70 });
  putSign(['WATCH FOR FALLING VALUATIONS'], 9.5, 1.15, 76.75, 2.75, 32, 90, { bg: '#7a1f1f', fg: '#ffe9a8', size: 95 });
  putSign(['MAIL — NO FORWARDING ADDRESS'], 8, .8, 68, 2.55, 25.5, 0, { bg: '#4a3a22', fg: '#ffe9a8', size: 90 });
  sc.place(W.paperStack(), 63, 28.6, { yaw: .4, y: 0 });
  sc.place(W.paperStack(), 73, 29, { yaw: 1.2, y: 0 });

  /* ================= S2: mezzanine / phone booth alley ================= */
  putSign(['CHIEF VIBES OFFICER'], 3.4, .55, 79.3, 5.6, 20, -90, { bg: '#3c4149', fg: '#f5efe0', size: 80 });
  putSign(['HEAD OF SYNERGY'], 3.4, .55, 79.3, 5.6, 6, -90, { bg: '#3c4149', fg: '#f5efe0', size: 80 });
  putSign(['REGIONAL MANAGER OF COMMUNITY'], 3.8, .55, 79.3, 5.6, -8, -90, { bg: '#3c4149', fg: '#f5efe0', size: 70 });
  putSign(['COFFEE — BACK IN 5 MIN (2019)'], 3.8, .55, 79.3, 4.4, 30, -90, { bg: '#4a3a22', fg: '#ffe9a8', size: 70 });
  sc.place(W.keg(), 77.6, 30.5, { yaw: -Math.PI / 2, y: 3.44 });
  sc.place(W.deskUnit(), 78.2, 14, { yaw: -Math.PI / 2, y: 3.44 });       // the lone lit office
  for (const z of [21, 3]) sc.place(W.planter(2.6), 58.6, z, { yaw: Math.PI / 2, y: 3.44 });
  { // DO NOT DISTURB on the second booth, facing the road
    const bp = atPos(between('C1 exit', 'C2 entry', 0.477), -3.6, 1.55);
    const s = sign(['DO NOT DISTURB — PERMANENTLY'], 1.7, .34, { bg: '#23262d', fg: '#ffb3ab', size: 70 });
    s.position.set(bp.x, bp.y, bp.z); s.rotation.y = bp.yaw + Math.PI; group.add(s);
  }

  /* ================= S3: cubicle field ================= */
  putSign(['DO WHAT YOU L  VE'], 30, 3.4, 0, 7.6, -51.55, 0, { bg: '#14060d', fg: '#ff7dbe', size: 150 });
  putSign(['GROWTH (HOCKEY STICK)'], 11, 2.4, 0, 6, 1.55, 180, { bg: '#274b63', fg: '#ffe9a8' });
  const cub = partsOf(W.cubicleCluster());
  const spots = [];
  for (const x of [-70, -49, -28, -7, 14, 35, 56]) spots.push({ x, y: 0, z: -46, yaw: 0 });
  for (const x of [-28, -7, 14]) spots.push({ x, y: 0, z: -9.5, yaw: Math.PI });
  spots.push({ x: -79, y: 0, z: -28, yaw: Math.PI / 2 });
  sc.instances(cub, spots, { cast: false });
  sc.place(W.deskUnit(), -52, -10.5, { yaw: Math.PI, y: 0 });
  sc.place(W.deskUnit(), 30, -10.5, { yaw: Math.PI, y: 0 });
  sc.place(W.paperStack(), 62, -45, { yaw: .7, y: 0 });
  sc.place(W.paperStack(), -72, -44, { yaw: 2.1, y: 0 });

  /* ================= S4: community kitchen ================= */
  putSign(['COMMUNITY'], 11, 2.8, -69.55, 2.9, 14, 90, {
    bg: '#274b63', fg: '#ffe9a8', size: 150,
    after: (g, w, h) => { g.fillStyle = '#1b2f40'; for (const [x, y] of [[.18, .12], [.55, .55], [.82, .1]]) g.fillRect(w * x, h * y, w * .09, h * .34); },
  });
  putSign(['KOMBUCHA ON TAP —', 'HELP YOURSELF, FOREVER'], 6.4, 1.6, -30, 3.6, 2.45, 0, { bg: '#2a4a2f', fg: '#ffe9a8', size: 95 });
  sc.place(W.keg(), -30, 6.5, { yaw: 0, y: 0 });
  sc.place(W.keg(), -32.2, 6.2, { yaw: .5, y: 0 });
  const counterMat = new THREE.MeshStandardMaterial({ color: 0xd8d2c2, roughness: .6 });
  for (let i = 0; i < 4; i++) { const c = new THREE.Mesh(new THREE.BoxGeometry(1.1, 1.05, 5.4), counterMat); c.position.set(-67.5, .53, 8 + i * 5.6); c.castShadow = true; group.add(c); }
  const tgim1 = W.hangingBanner(7, 1.7, bannerMat(["THANK GOD IT'S MONDAY"], { bg: '#7a1f3a', fg: '#ffe9a8', size: 100 }));
  put(tgim1, 44, 5.3, 12, 0);

  /* ================= S5: service corridor ================= */
  const atmScreen = sign(['OUT OF CASH', 'SEE THE COMMUNITY MANAGER'], .1, .1, { bg: '#0d2138', fg: '#9fd0ff', size: 64, w: 512, h: 320 }).material;
  put(W.atm(atmScreen), 60.2, 0, 4, -90);
  putSign(['STAIR A — MIND THE PAPERWORK'], 5.4, .8, 60.55, 2.6, -14, -90, { bg: '#23262d', fg: '#f5efe0', size: 80 });
  sc.place(W.paperStack(), 46.5, 8.5, { yaw: 1.9, y: 0 });

  /* ================= S6: Stairwell A ================= */
  put(W.piano(), 95, 2.94, -40, 90);
  put(W.stairFlight(5, 2.2), 93, 2.94, -36.5, 180);
  const exitWall = new THREE.Mesh(new THREE.BoxGeometry(3.4, 3.4, .25), new THREE.MeshStandardMaterial({ color: 0xe9e4d8, roughness: .9 }));
  exitWall.position.set(93, 4.6, -34.6); group.add(exitWall);
  putSign(['EXIT'], 1.6, .5, 93, 5.9, -34.4, 0, { bg: '#123d22', fg: '#7dffce', size: 110 });
  put(W.elevatorDoors(), 111.5, 0, -40, -90);
  putSign(['OUT OF ORDER SINCE 2019'], 3.2, .6, 111.35, 3.5, -40, -90, { bg: '#23262d', fg: '#ffb3ab', size: 80 });

  /* ================= S7: executive row ================= */
  for (const x of [-64, -48, -32, -16, 0, 32, 48]) sc.place(W.deskUnit(), x, -19.6, { yaw: 0, y: 5.94 });
  put(W.parachuteCase(), 20, 5.94, -8.5, 0);
  putSign(['IN CASE OF BANKRUPTCY'], 2.6, .5, 20, 6.6, -7.85, 0, { bg: '#8a6d2f', fg: '#fff3c4', size: 80 });
  {
    const m = sign(['COMMUNITY-ADJUSTED EBITDA'], 9.5, 2.7, {
      bg: '#20242c', fg: '#ffe9a8', size: 84,
      after: (g, w, h) => {
        g.strokeStyle = '#7dffce'; g.lineWidth = 7; g.beginPath();
        g.moveTo(w * .08, h * .88); g.lineTo(w * .3, h * .8); g.lineTo(w * .52, h * .84); g.lineTo(w * .74, h * .62); g.lineTo(w * .93, h * .52); g.stroke();
        g.strokeStyle = 'rgba(255,255,255,.25)'; g.lineWidth = 2; g.beginPath(); g.moveTo(w * .08, h * .45); g.lineTo(w * .08, h * .9); g.lineTo(w * .94, h * .9); g.stroke();
      },
    });
    put(m, -16, 8.9, -21.6, 0);
  }
  sc.place(W.paperStack(), 40, -19.5, { yaw: .3, y: 5.94 });

  /* ================= S8: meeting gallery ================= */
  put(W.meetingRoom(12, 8), -111.5, 6, 8, 90);
  putSign(['SYNERGY'], 3, .7, -107.2, 8.3, 8, 90, { bg: '#3c4149', fg: '#f5efe0', size: 90 });
  put(W.meetingRoom(9, 8), -111.5, 6, 32, 90);
  putSign(['DEEP DIVE'], 3, .7, -107.2, 8.3, 32, 90, { bg: '#3c4149', fg: '#f5efe0', size: 90 });
  put(W.meetingRoom(7, 11), -83.5, 6, 16, 180);
  putSign(['DISRUPTION'], 3.2, .7, -83.5, 8.3, 10.2, 180, { bg: '#3c4149', fg: '#f5efe0', size: 90 });
  putSign(['SYNERGY → ??? → PROFIT'], 3.4, 1.1, -83.5, 7.4, 11.2, 180, { bg: '#f4f1e8', fg: '#2a4a8f', size: 80 });
  putSign(['EXIT STRATEGY'], 10, 2.4, -97, 9.2, -15.5, 0, { bg: '#3a2a4a', fg: '#e8d8ff' });
  const tgim2 = W.hangingBanner(7.5, 1.9, bannerMat([{ t: "THANK GOD IT'S MONDAY", strike: '#ff3b30' }, { t: "THANK GOD IT'S OVER", fg: '#ff8a7a' }], { bg: '#23262d', fg: '#f5efe0', size: 92 }));
  put(tgim2, -90, 11.6, 34, 90);

  /* ================= S9: south balcony dressing ================= */
  for (const x of [-58, 24]) sc.place(W.planter(3), x, 43.8, { yaw: 0, y: 5.94 });
  { // the fallen banner, draped over the balcony railing
    const fb = W.hangingBanner(2.6, 4.2, bannerMat(['DO WHAT', 'YOU LOVE'], { bg: '#2a4a2f', fg: '#ffe9a8', size: 110 }));
    fb.position.set(-16, 7.3, 45.9); fb.rotation.x = -1.05; group.add(fb);
  }

  /* ================= S10: Stairwell B ================= */
  putSign(['FIRE EXIT'], 3.4, .8, 100, 9.2, 65.55, 180, { bg: '#123d22', fg: '#7dffce', size: 110 });
  { // the founder's portrait, tilted, at the landing
    const pm = sign([''], 2.2, 2.8, {
      bg: '#191410', w: 512, h: 640,
      after: (g, w, h) => {
        g.strokeStyle = '#c9a227'; g.lineWidth = 16; g.strokeRect(14, 14, w - 28, h - 28);
        g.fillStyle = '#0d0b08'; g.beginPath(); g.arc(w / 2, h * .38, w * .17, 0, 7); g.fill();
        g.beginPath(); g.ellipse(w / 2, h * .86, w * .3, h * .22, 0, 0, 7); g.fill();
        g.fillStyle = '#c9a227'; g.beginPath(); g.arc(w / 2, h * .38, w * .17, 0, 7); g.fill();
        g.fillStyle = '#191410'; g.beginPath(); g.ellipse(w / 2, h * .88, w * .3, h * .2, 0, 0, 7); g.fill();
      },
    });
    pm.position.set(124.7, 5.3, 45); pm.rotation.y = -90 * DEG; pm.rotation.z = .07; group.add(pm);
    putSign(['ADAM, FOUNDER (FORMER)'], 2.8, .5, 124.7, 3.55, 45, -90, { bg: '#8a6d2f', fg: '#fff3c4', size: 80 });
  }
  const pipe = new THREE.Mesh(new THREE.CylinderGeometry(.14, .14, 3.2, 8), new THREE.MeshStandardMaterial({ color: 0xb03024, roughness: .5 }));
  pipe.position.set(84, 1.6, 62); pipe.castShadow = true; group.add(pipe);
}
