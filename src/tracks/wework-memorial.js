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
import * as S from '../models/props-silicon-valley.js';   // the sign kit: canvas atlas + static baker (draw calls, #237 step 5)

/* ---------- centreline, built row by row from the design doc's table ----------
   Plan geometry and corner radii are the doc's; heights follow its
   height-profile table (mezzanine climb 3.9%, descent 8.0%, stairs 10%). */
function buildPath() {
  const pts = [], AT = {};
  const push = (label, x, y, z, w, wl = null, wr = null) => { if (label) AT[label] = pts.length; const pt = { p: [x, y, z], w }; if (wl != null) pt.wl = wl; if (wr != null) pt.wr = wr; pts.push(pt); };
  const last = () => pts[pts.length - 1].p;
  /** Straight from the last point to (x, z); y interpolated (constant grade). */
  function line(label, x, z, y, w, step = 15, wl = null, wr = null) {
    const [ax, ay, az] = last(), d = Math.hypot(x - ax, z - az), n = Math.max(1, Math.round(d / step));
    for (let k = 1; k < n; k++) { const pt = { p: [ax + (x - ax) * k / n, ay + (y - ay) * k / n, az + (z - az) * k / n], w }; if (wl != null) pt.wl = wl; if (wr != null) pt.wr = wr; pts.push(pt); }
    push(label, x, y, z, w, wl, wr);
  }
  /** Arc by centre + on-circle mid + exit; y linear in angle (constant grade). */
  function arc(label, cx, cz, mid, exit, y1, w, wl = null, wr = null) {
    const [ax, ay, az] = last();
    const a0 = Math.atan2(az - cz, ax - cx), am = Math.atan2(mid[1] - cz, mid[0] - cx), a1 = Math.atan2(exit[1] - cz, exit[0] - cx);
    const r = Math.hypot(ax - cx, az - cz);
    const sweep = (f, t) => { let d = t - f; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI; return d; };
    const total = sweep(a0, am) + sweep(am, a1), steps = Math.max(2, Math.round(Math.abs(total) / (Math.PI / 8)));
    for (let k = 1; k < steps; k++) { const f = k / steps, a = a0 + total * f; const pt = { p: [cx + Math.cos(a) * r, ay + (y1 - ay) * f, cz + Math.sin(a) * r], w }; if (wl != null) pt.wl = wl; if (wr != null) pt.wr = wr; pts.push(pt); }
    push(label, exit[0], y1, exit[1], w, wl, wr);
  }
  push('L1 entry', -71, 0, 58, 19);
  line('L1 mid W', -41, 58, 0, 19, 30);
  line('START', -12, 58, 0, 19, 30);
  line('climb begins', -10, 58, 0, 19, 30);
  line('C1 entry', 46, 58, 2.16, 19, 14, 12);                        // feature-ramp climb @ 3.9% + inside (L) approach apron wl 12 (#237 step 3)
  arc('C1 exit', 46, 36, [61.56, 51.56], [68, 36], 3.50, 19, 12);    // r22, climbing onto the deck (w 16→19 + inside (L) apron wl 12, #237 step 3)
  line('C2 entry', 68, -8, 3.50, 17, 15);                        // L2: the mezzanine deck, dead level (w 16→17, #237 step 3)
  arc('C2 exit', 48, -8, [62.14, -22.14], [48, -28], 0.99, 22, 13.5);  // r20, far feature ramp @ 8.0% + inside (L) apron wl 13.5 (#237 step 3)
  line('touchdown', 35.7, -28, 0, 22, 7);
  line('L3 mid', 0, -28, 0, 22, 18);
  line('C3 entry', -40, -28, 0, 23, 20, 13);
  arc('C3 exit', -40, -6, [-55.56, -21.56], [-62, -6], 0, 21, 13);   // r22
  line('C4 entry', -62, 0, 0, 15, 6);
  arc('L5 entry', -44, 0, [-56.73, 12.73], [-44, 18], 0, 15);    // C4 r18
  line('L5 mid', -4, 18, 0, 15, 20);
  // Through the kitchen under the lounge, then around the *outside* of the
  // mezzanine descent. These two lanes used to meet at the foot of the ramp.
  line('C5 entry', 77, 18, 0, 19, 18);
  arc('L6 entry', 77, -2, [91.14, 12.14], [97, -2], 0, 19, 11);
  line('C6 entry', 97, -10, 0, 18, 8);
  arc('L7 entry', 114, -10, [101.98, -22.02], [114, -27], 0, 18, null, 10);
  line('L-A entry', 146, -27, 3, 18, 12);
  arc('L8 entry', 146, -43, [162, -43], [146, -59], 3, 18, 11);
  line('C7 entry', 110, -59, 6, 18, 12);
  arc('L9 entry', 110, -43, [98.69, -54.31], [94, -43], 6, 18, 11);
  line('C8 entry', 94, -30, 6, 18, 13);
  arc('L10 entry', 78, -30, [89.31, -18.69], [78, -14], 6, 20, null, 11);
  line('L10 mid', -21, -14, 6, 16.5, 29);                           // executive row (w 16→16.5, #237 step 3)
  line('C9 entry', -80, -14, 6, 17, 29);
  arc('L11 entry', -80, 4, [-92.73, -8.73], [-98, 4], 6, 17);    // C9 r18
  line('C10 entry', -98, 24, 6, 16, 11, 11);                        // + inside (L) approach apron wl 11 (#237 step 3)
  arc('L12 entry', -84, 24, [-93.9, 33.9], [-84, 38], 6, 19, 12.5);     // C10 eased to r14 (ladder step 2) (w 16→19 + inside (L) apron wl 12.5, #237 step 3)
  line('L12 mid', -17, 38, 6, 16, 34);
  line('jog entry', 46, 38, 6, 19, 30);
  arc('jog join', 46, 58, [53.65, 39.52], [63.32, 48], 6, 19, null, 11);  // first half of the balcony S, radius 20
  arc('L13 entry', 80.64, 38, [72.99, 56.48], [80.64, 58], 6, 19, 11);  // second half of the balcony S, radius 20
  line('L14 entry', 92, 58, 6, 14, 20);                             // Stair B throat (w 13→14, #237 step 3)
  line('L-B entry', 122, 58, 3, 18, 10, 11);  // fire stair upper flight, 10%
  arc('L15 entry', 122, 45, [135, 45], [122, 32], 3, 18, 11);        // final fire-stair landing
  line('L16 entry', 92, 32, 0, 16.5, 10, 10.5);  // fire stair lower flight, 10%
  line('L17 entry', 72, 32, 0, 13, 20);                             // atrium return (w 12→13, #237 step 3)
  line('L17 mid', 0, 32, 0, 13, 36);
  line('HP entry', -71, 32, 0, 13, 36, 11);                         // + inside (L) approach apron wl 11 over the atrium floor (#237 step 3)
  arc('wrap', -71, 45, [-84, 45], [-71, 58], 0, 22, 12.5);             // reception hairpin r13 (w 19→22 + inside (L) apron wl 12.5, #237 step 3: the desk island is rotated so its long axis leaves this line clear)
  // Let the pack use the open floor on braking approaches. Taper each
  // apron through the apex so its inside edge stays outside the turn centre.
  function apron(first, last, side, halfWidth) {
    for (let i = AT[first]; i <= AT[last]; i++) pts[i][side] = halfWidth;
  }
  apron('C1 exit', 'C2 entry', 'wl', 13);
  apron('L7 entry', 'L-A entry', 'wl', 15);
  apron('L8 entry', 'C7 entry', 'wl', 18);
  apron('C7 entry', 'L9 entry', 'wl', 13.6);
  apron('L9 entry', 'C8 entry', 'wr', 17.5);
  apron('C8 entry', 'L10 entry', 'wr', 13.8);
  apron('L10 mid', 'C9 entry', 'wl', 18);
  apron('C9 entry', 'L11 entry', 'wl', 15.7);
  apron('L11 entry', 'C10 entry', 'wl', 13.5);
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
  autoBank: 0,                         // flat office floors meet the room slabs at every edge
  sky: 'studio',                       // indoor backstop only — the building is the enclosure
  skyOverrides: { fog: 0x8c7983, fogNear: 80, fogFar: 310, sunLight: 0xffeaca, sunIntensity: 2.0, hemiSky: 0xffe7cf, hemiGround: 0xc0c4bf, hemiIntensity: 1.8, envIntensity: .45 },
  terrain: false,                      // no outside exists
  tunnelShell: false,                  // the interior is built by decorate(), not the arch shell
  defaults: { edge: 'wall', shoulder: 0, outer: 0 },
  // the opening: three shots composed INSIDE the building (#193) — the generic
  // Shoot inside the rooms with the chase sightline clear of both floors.
  introOnly: true,
  intro: [
    // a) the lobby, low, along the start straight toward the gantry and the $47B → $0 board
    { pos: [-60, 2.5, 50], pos1: [-40, 3, 52], look: [30, 4, 60], look1: [30, 4, 60], fov: 58, dur: 3.0 },
    // b) look back from the return lane at the glass crossing and the lower mailroom
    { pos: [38, 2.1, 31], pos1: [55, 1.75, 31], look: [68, 3.0, 30], look1: [71, 2.5, 30], fov: 56, dur: 2.8 },
    // c) roll along the cubicle aisle, below the executive floor and clear of its fascia
    { pos: [21, 4.1, -31], pos1: [5, 3.7, -32], look: [-39, 2.2, -37], look1: [-49, 1.9, -38], fov: 56, dur: 3.0 },
  ],
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
    { from: AT['climb begins'], to: AT['C2 entry'], skin: 'wood' },
    { from: AT['C2 exit'], to: AT['C3 exit'], skin: 'carpet' },        // S3 cubicle field
    { from: AT['L6 entry'], to: AT['C7 entry'], skin: 'metal' },       // S5 service corridor + S6 stair hall
    { from: AT['C7 entry'], to: AT['jog entry'], skin: 'carpet' },     // S7 exec row, S8 gallery, S9 balcony
    { from: AT['jog entry'], to: AT['L16 entry'], skin: 'metal' },     // S10 fire stair
  ],
  shortcuts: [{ name: 'Hot Desk Express', from: AT['touchdown'], to: AT['C3 entry'] + .55, path: [[22, -32.8], [1, -33], [-13, -32.4], [-27, -30.8]], skill: .55, chance: .7 }],
  boosts: [
    { at: between('HP entry', 'L1 entry', 1.35), lat: 0, w: 5 },       // hairpin exit, onto the start straight
    { at: AT['L3 mid'] + 0.1, lat: -5, w: 3.8 },                          // field mid
    { at: AT['L6 entry'] - 0.25, lat: 0, w: 5 },                       // kitchen exit
    { at: AT['L10 mid'], lat: -4.8, w: 3.4 },                               // exec row mid
    { at: AT['L12 mid'] + 0.40, lat: 0, w: 5 },                        // balcony late, before the B-jog
  ],
  itemRows: [
    { at: between('HP entry', 'L1 entry', 1.8) },                      // lobby mid-straight
    { at: AT['L3 mid'], lats: [2.7, 6.6] },                                    // field entry, after C2
    { at: AT['L5 mid'], lats: [-4.2, 0, 4.2] },                                              // kitchen mid
    { at: between('L8 entry', 'C7 entry', 0.5) },                      // Stair A flight 2
    { at: AT['L10 mid'] + .1, lats: [2.5, 5.8] },                                             // balcony mid
    { at: AT['L17 mid'] },                                             // return lane mid
  ],
  coins: [
    { from: AT['C2 entry'] + 0.2, to: AT['C2 exit'] + 0.3, n: 5, lat: [-4, 4] },   // the descent line
    { from: AT['touchdown'] + 0.3, to: AT['C3 entry'] - 0.2, n: 5, lat: -5 },       // across the field
    { from: AT['L-A entry'] + 0.1, to: AT['L8 entry'] - 0.1, n: 4, lat: 3 },       // Stair A landing, inside
    { from: AT['L-B entry'] + 0.1, to: AT['L15 entry'] - 0.1, n: 4, lat: 3 },      // Stair B landing, inside
    { from: AT['HP entry'] + 0.1, to: AT['HP entry'] + 2.9, n: 4, lat: 3 },        // hairpin inside
    { from: AT['L12 entry'] + 0.3, to: AT['jog entry'] - 0.3, n: 5, lat: -2 },     // the balcony
  ],
  obstacles: [
    // On the final lap the movers leave their dolly on the express stripe.
    { kind: 'timed', model: 'dolly', at: AT['L3 mid'] + 0.87, lat: -5, period: 1, duty: 1, effect: 'bump', radius: 1.15, fromLap: -1 },
    // the phone-booth slalom, all on the flat mezzanine deck (z = 23, 15, 7, -1)
    { kind: 'static', model: 'booth', at: between('C1 exit', 'C2 entry', 0.295), lat: 6.45, effect: 'bump', radius: 0.95 },
    { kind: 'static', model: 'booth', at: between('C1 exit', 'C2 entry', 0.477), lat: -6.45, effect: 'bump', radius: 0.95 },
    { kind: 'static', model: 'booth', at: between('C1 exit', 'C2 entry', 0.659), lat: 6.45, effect: 'bump', radius: 0.95 },
    { kind: 'static', model: 'booth', at: between('C1 exit', 'C2 entry', 0.841), lat: -6.45, effect: 'bump', radius: 0.95 },
    { kind: 'static', model: 'neonO', at: AT['C3 exit'] - 0.35, lat: -6, effect: 'bump', radius: 1.9 },   // the fallen O
    { kind: 'static', model: 'papers', at: AT['C6 entry'] - 0.9, lat: -6.2, effect: 'squash', radius: 1.6 },  // IPO paperwork (at -0.5→-0.9, lat -3.5→-6.2, #237 step 4: was on the racing line into C6, 9-10 hits/race at cp 39.5)
    { kind: 'static', model: 'papers', at: between('L15 entry', 'L16 entry', 0.5), lat: 4, effect: 'squash', radius: 1.6 },  // repossession paperwork
    { kind: 'patrol', model: 'bot', at: between('HP entry', 'L1 entry', 1.8), lats: [-8.4, -6.0], speed: 1.6, effect: 'spin', radius: 1.2 },  // the cleaning bot
  ],
  models: { dolly: () => W.moversDolly(), booth: () => W.phoneBooth(), neonO: () => W.neonO(), papers: () => W.paperStack(), bot: () => W.cleaningBot() },
  look: {
    road: { base: 0x9aa0a8, line: 0xffffff, center: false, skin: 'stone' },
    kerb: [0xe8e4da, 0xb9b2a4],
    shoulder: 0x777777,
    wall: 0x364747, wallStripe: 0xe2bc70,
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

  /* ---- sign machinery: one shared canvas atlas for every flat sign (fitText, never squashed) ----
     Was: ~45 signs, each with its own canvas texture + MeshBasicMaterial + mesh (~45 draw calls and
     ~45 canvases against Safari's canvas-memory budget, PR #211). Now every putSign() packs its panel
     into the atlas (Davos pattern, PR #219) and the panels bake into one mesh per atlas page.
     signMat/sign survive only where a real material/mesh is needed: banner cloth, the ATM screen,
     the founder portrait. */
  const atlas = S.makeAtlas(group), bake = S.makeBaker(group, sc.shadows);
  function signDraw(lines, { w = 1024, h = 256, bg = '#23262d', fg = '#f5efe0', size = 120, after = null } = {}) {
    return (g) => {
      g.fillStyle = bg; g.fillRect(0, 0, w, h);
      const ls = lines.map(l => typeof l === 'string' ? { t: l } : l);
      ls.forEach((ln, i) => {
        const cy = h * (i + 1) / (ls.length + 1);
        fitText(g, ln.t, w / 2, cy, w * .94, h / ls.length * .78, ln.size || size, FONT, { fill: ln.fg || fg });
        if (ln.strike) { g.strokeStyle = ln.strike; g.lineWidth = h * .045; g.beginPath(); g.moveTo(w * .06, cy + h * .02); g.lineTo(w * .94, cy - h * .05); g.stroke(); }
      });
      if (after) after(g, w, h);
    };
  }
  function signMat(lines, opts = {}) {
    const draw = signDraw(lines, opts);
    const tex = canvasTex(opts.w || 1024, opts.h || 256, draw, { repeat: false });
    if (typeof document !== 'undefined' && document.fonts?.ready) document.fonts.ready.then(() => { draw(tex.image.getContext('2d')); tex.needsUpdate = true; });
    return new THREE.MeshBasicMaterial({ map: tex });
  }
  function sign(lines, wM, hM, opts = {}) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(wM, hM), signMat(lines, opts));
    return m;
  }
  const putSign = (lines, wM, hM, x, y, z, yawDeg = 0, opts = {}) => { atlas.place(atlas.add(opts.w || 1024, opts.h || 256, signDraw(lines, opts)), [x, y, z], yawDeg * DEG, wM, hM); };

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
    // Acoustic baffles with narrow recessed lamps, not a luminous checkerboard.
    g.fillStyle = dark ? '#45494b' : '#787977'; g.fillRect(0, 0, 256, 256);
    for (let y=0; y<256; y+=32) {
      g.fillStyle = dark ? '#34383b' : '#646966'; g.fillRect(0,y,256,2);
      g.fillStyle = dark ? '#51585a' : '#92918a'; g.fillRect(0,y+2,256,2);
    }
    for (const x of [22, 148]) {
      g.fillStyle = '#454842'; g.fillRect(x, 8, 16, 234);
      g.fillStyle = dark && x === 148 ? '#718185' : '#ead5ae'; g.fillRect(x+3, 11, 10, 228);
    }
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

  const WQ = new Quads(THREE), FQ = new Quads(THREE), CQ = new Quads(THREE), CDQ = new Quads(THREE), SQ = new Quads(THREE), KQ = new Quads(THREE);
  const wall = (x0, y0, z0, x1, y1, z1) => WQ.box(x0, y0, z0, x1, y1, z1);
  const slab = (x0, z0, x1, z1, yTop, mat) => { const q = mat === 'carpet' ? KQ : SQ; q.quad([x0, yTop, z0], [x1, yTop, z0], [x1, yTop, z1], [x0, yTop, z1], (x1 - x0) / 4, (z1 - z0) / 4); q.quad([x0, yTop - .26, z1], [x1, yTop - .26, z1], [x1, yTop, z1], [x0, yTop, z1], (x1 - x0) / 3, .1, 0x8f887a); q.quad([x1, yTop - .26, z0], [x0, yTop - .26, z0], [x0, yTop, z0], [x1, yTop, z0], (x1 - x0) / 3, .1, 0x8f887a); q.quad([x1, yTop - .26, z1], [x1, yTop - .26, z0], [x1, yTop, z0], [x1, yTop, z1], (z1 - z0) / 3, .1, 0x8f887a); q.quad([x0, yTop - .26, z0], [x0, yTop - .26, z1], [x0, yTop, z1], [x0, yTop, z0], (z1 - z0) / 3, .1, 0x8f887a); };
  const ceil = (x0, z0, x1, z1, y, dark = false) => { const q = dark ? CDQ : CQ; q.quad([x0, y, z1], [x1, y, z1], [x1, y, z0], [x0, y, z0], (x1 - x0) / 6, (z1 - z0) / 6); };

  /* ---- plate + perimeter + roof (no sky anywhere: the roof is one slab) ---- */
  SQ.quad([-124, -.09, -78], [182, -.09, -78], [182, -.09, 84], [-124, -.09, 84], 306 / 4, 162 / 4);
  wall(-124.3, -.4, -78.3, 182.3, 16, -77.7); wall(-124.3, -.4, 83.7, 182.3, 16, 84.3);
  wall(-124.3, -.4, -78.3, -123.7, 16, 84.3); wall(181.7, -.4, -78.3, 182.3, 16, 84.3);
  ceil(-124.3, -78.3, 182.3, 84.3, 16);
  ceil(-92, -58, 58, -5, 13.6, true);

  // An open kitchen with a back bar and a walk-through lift lobby. Confine
  // room partitions to actual islands between lanes, including camera room.
  wall(-48, 0, 2, 34, 5.8, 2.4);
  wall(-91, 0, -56, 46, 12.5, -55.6);
  wall(-92, 0, -56, -91.6, 4.8, -12);

  wall(176, 0, -73, 176.4, 13, -12);
  wall(109, 0, -73, 176, 13, -72.6);
  wall(102, 0, 73, 147, 13, 73.4);
  wall(151, 0, 20, 151.4, 13, 73);
  ceil(-45, 3, 42, 25, 8.7);
  ceil(103, 20, 152, 74, 13.3);
  /* ---- Floor 2 slabs ---- */
  slab(-84, -27, 57, -3.0, 5.94, 'carpet');                                  // executive row
  FQ.box(-77, 5.94, -27.4, 42, 12.5, -27.0);                                 // exec-row office fronts (frosted; stops west of the C8 swing)
  slab(57, -22, 78, -5.4, 5.94, 'carpet');                                   // seam with the upper stair exit
  slab(-116, 28, 56, 46.6, 5.94, 'carpet');                                  // south balcony
  // The curved throat rests on its own ribbon over the climbing lobby road.
  slab(-116, -16, -78, 28, 5.94, 'carpet');                                  // meeting gallery floor
  wall(-116, 6, -30.3, -78, 12.5, -29.7);                                    // chamber north wall (F2)

  /* ---- mezzanine deck + bridge ---- */
  slab(58, -8, 79, 36, 3.44, 'stone');
  FQ.box(82, 3.44, -8, 82.3, 8.9, 26);                                      // frosted office fronts, east
  ceil(59, 26, 77, 38, 3.18);                                                // bridge soffit light panels

  /* ---- floor overlays ---- */
  KQ.quad([-88, -.02, -52], [80, -.02, -52], [80, -.02, 2], [-88, -.02, 2], 168 / 4, 54 / 4);   // field carpet

  for (const [q, m] of [[WQ, wallMat], [FQ, frostMat], [CQ, ceilMat], [CDQ, ceilDarkMat], [SQ, floorMat], [KQ, carpetMat]]) if (q.pos.length) group.add(q.mesh(m));

  // mailroom pigeonhole wall under the bridge (its own textured box)
  const mail = new Quads(THREE); mail.box(58.5, 0, 25.7, 77.5, 3.05, 26.3);
  group.add(mail.mesh(new THREE.MeshStandardMaterial({ map: pigeonTex, vertexColors: true, roughness: .8, side: THREE.DoubleSide })));

  const kit = { sc, atPos, put, putSign, sign, track, atlas, bake };
  furnishOffice(ctx, kit);
  dressSectors(ctx, kit);
}

/* Spline-following soffit: a strip under the road between two control
   points (the feature ramp, the descent, the stair flights). */
function splineSlab(ctx, at0, at1, drop, mat) {
  const { track, group } = ctx;
  const q = new Quads(ctx.THREE);
  const i0 = track.indexAtCp(at0), i1 = track.indexAtCp(at1);
  const step = 1;
  for (let i = i0; i < i1; i += step) {
    const j = Math.min(i + step, i1);
    const A = pt(track, i, track.hwL[i], drop), B = pt(track, i, -track.hwR[i], drop), C = pt(track, j, -track.hwR[j], drop), D = pt(track, j, track.hwL[j], drop);
    q.quad(A, B, C, D, 1, (j - i) * track.ds / 3);
  }
  const m = q.mesh(mat); group.add(m); return m;
  function pt(tr, i, lat, d) { const h = Math.hypot(tr.lx[i], tr.lz[i]) || 1; return [tr.px[i] + tr.lx[i] / h * lat, tr.py[i] + tr.ly[i] * lat - d, tr.pz[i] + tr.lz[i] / h * lat]; }
}

/* ================= sector dressing ================= */
function dressSectors(ctx, H) {
  const { THREE, group, track, view, anim } = ctx;
  const { sc, atPos, put, putSign, sign, atlas, bake } = H;
  /* Place-and-bake: static props merge into one mesh per material at flush (draw calls, #237 step 5). */
  const bakePlace = (obj, x, z, o = {}) => { sc.place(obj, x, z, o); bake.add(obj, o.cast !== false); return obj; };
  const bakePut = (obj, x, y, z, yawDeg = 0) => { put(obj, x, y, z, yawDeg); bake.add(obj); return obj; };
  const soffitMat = new THREE.MeshStandardMaterial({ color: 0xc8b693, roughness: .8, metalness: .2, side: THREE.DoubleSide });
  const ATT = (name) => AT[name];

  /* ---- soffits under the elevated roads ---- */
  bake.add(splineSlab(ctx, ATT('climb begins'), ATT('C1 exit'), .3, soffitMat));       // feature ramp
  bake.add(splineSlab(ctx, ATT('C2 entry'), ATT('touchdown'), .3, soffitMat));        // descent
  bake.add(splineSlab(ctx, ATT('L7 entry'), ATT('L-A entry'), .28, soffitMat));        // Stair A flight 1
  bake.add(splineSlab(ctx, ATT('L8 entry'), ATT('C7 entry'), .28, soffitMat));         // flight 2
  bake.add(splineSlab(ctx, ATT('L13 entry'), ATT('L14 entry'), .28, soffitMat));       // Stair B throat
  bake.add(splineSlab(ctx, ATT('L14 entry'), ATT('L-B entry'), .28, soffitMat));       // Stair B flight 1
  bake.add(splineSlab(ctx, ATT('L15 entry'), ATT('L16 entry'), .28, soffitMat));       // flight 2
  for (const [a, b] of [['L-A entry', 'L8 entry'], ['C7 entry', 'L10 entry'], ['jog entry', 'L13 entry'], ['L-B entry', 'L15 entry']]) {
    bake.add(splineSlab(ctx, ATT(a), ATT(b), .30, soffitMat));
  }
  // Piano island sits in the stairwell void, out of both switchback lanes.
  const island = new THREE.Mesh(new THREE.BoxGeometry(28, .32, 9), soffitMat);
  island.position.set(137, 2.78, -43); group.add(island); bake.add(island);

  /* ---- balustrades: deck west edge, bridge glass, balcony + gallery overlooks ---- */
  const bal = W.balustrade(13);
  for (const z of [-6.5, 6.5, 19.5]) bakePlace(bal, 59.9, z, { yaw: Math.PI / 2, y: 3.44 });
  bakePlace(W.balustrade(12), 76.6, 32, { yaw: Math.PI / 2, y: 3.44 });
  const bal20 = W.balustrade(20);
  for (const x of [-60, -40, -20, 0, 20, 40]) bakePlace(bal20, x, 46.3, { yaw: 0, y: 5.94 });
  for (const x of [-70, -50, -30, -10, 10]) bakePlace(bal20, x, -5.7, { yaw: 0, y: 5.94 });

  /* ---- emergency light strips: green in Stair A, red in Stair B ---- */
  const stripMats = new Map();
  const strip = (x, y, z, len, color, yawDeg = 0) => {
    if (!stripMats.has(color)) stripMats.set(color, new THREE.MeshBasicMaterial({ color }));
    const m = new THREE.Mesh(new THREE.BoxGeometry(len, .14, .07), stripMats.get(color));
    m.position.set(x, y, z); m.rotation.y = yawDeg * DEG; group.add(m); bake.add(m);
  };
  strip(175.7, 5.4, -43, 49, 0x2eff8a, 90); strip(143, 8.4, -72.4, 63, 0x2eff8a);
  strip(128, 6.8, 72.6, 45, 0xff6850); strip(150.8, 6.8, 45, 42, 0xff6850, 90);

  /* ================= S1: lobby & start ================= */
  putSign([{ t: '$47,000,000,000', fg: '#ffd9d0', strike: '#ff3b30' }, { t: '$0 (COMMUNITY-ADJUSTED)', fg: '#7dffce' }], 17.4, 3.8, 40, 10.7, 58, -90, { bg: '#1c1410', size: 150, h: 512, w: 1400 });
  putSign(['THIS COMMUNITY OPENED 2019'], 5, .8, -24, 1.7, 75.6, 180, { bg: '#8a6d2f', fg: '#fff3c4', size: 90 });
  putSign(['PIVOT!'], 10, 2.4, -52, 4.5, 75.6, 180, { bg: '#274b63', fg: '#ffe9a8' });
  putSign(['THOUGHTS & PRAYERS CAPITAL'], 11, 2.4, 52, 4.5, 75.6, 180, { bg: '#3a2a4a', fg: '#e8d8ff' });
  putSign(['SPACE AS A SERVICE'], 10, 2.4, -99.6, 6, 48, 90, { bg: '#274b63', fg: '#ffe9a8' });
  putSign(['ELEVATE THE WORLD’S CONSCIOUSNESS'], 36, 4.4, 0, 8.8, 25.55, 0, { bg: '#2a2f3a', fg: '#ffe9b0', size: 110 });
  putSign(['ELEVATE THE WORLD’S CONSCIOUSNESS'], 36, 4.4, 0, 8.8, 25.51, 180, { bg: '#2a2f3a', fg: '#ffe9b0', size: 110 });
  putSign(['MEZZANINE — COMMUNITY LOUNGE →'], 8, 1.1, 4, 1.9, 66.8, 180, { bg: '#23262d', fg: '#f5efe0', size: 90 });
  bakePlace(W.bleacherStep(50), 18, 68.4, { yaw: Math.PI, y: 0 });
  bakePlace(W.bleacherStep(50), 18, 70.3, { yaw: Math.PI, y: .42 });
  for (const x of [-52, -30, 30, 52]) bakePlace(W.planter(3), x, 71.5, { yaw: 0, y: 0 });
  // glass entrance doors in the C1 braking zone, with the notice on them
  const doorMat = new THREE.MeshStandardMaterial({ color: 0xaad4e2, roughness: .15, transparent: true, opacity: .4 });
  for (const x of [33, 38.5]) { const d = new THREE.Mesh(new THREE.BoxGeometry(4.6, 3.3, .14), doorMat); d.position.set(x, 1.65, 49.3); group.add(d); bake.add(d); }
  putSign(['NOTICE', 'TO VACATE'], .95, 1.25, 35.8, 1.7, 49.15, 180, { bg: '#f4f1e8', fg: '#22242a', size: 100 });
  // hanging banners over the atrium floor
  const bannerMat = (lines, opts) => sign(lines, .1, .1, opts).material;
  const hb1 = W.hangingBanner(2.6, 4.6, bannerMat(['HUSTLE'], { bg: '#7a1f3a', fg: '#ffe9a8', size: 130 }));
  bakePut(hb1, -30, 12.3, 47, -72);
  const hb2 = W.hangingBanner(2.6, 4.6, bannerMat(['COMMUNITY'], { bg: '#274b63', fg: '#ffe9a8', size: 110 }));
  bakePut(hb2, 8, 12.3, 47, -70);
  const hb3 = W.hangingBanner(2.6, 4.6, bannerMat(['DO WHAT', 'YOU LOVE'], { bg: '#2a4a2f', fg: '#ffe9a8', size: 110 }));
  bakePut(hb3, 44, 15.8, 50.3, -66);
  { // warm pendant lights over the atrium, between the two lanes (baked: cord + shade + bulb)
    const cordMat = new THREE.MeshStandardMaterial({ color: 0x2a2c33, roughness: .6, metalness: .4 });
    const shadeMat = new THREE.MeshStandardMaterial({ color: 0x8a6d2f, roughness: .35, metalness: .7 });
    const bulbMat = new THREE.MeshBasicMaterial({ color: 0xffd9a0 });
    for (const x of [-44, -22, 0, 22, 44]) {
      const cord = new THREE.Mesh(new THREE.CylinderGeometry(.03, .03, 2.6, 6), cordMat); cord.position.set(x, 11.2, 45); group.add(cord); bake.add(cord);
      const shade = new THREE.Mesh(new THREE.CylinderGeometry(.28, .85, .55, 12, 1, true), shadeMat); shade.position.set(x, 9.75, 45); group.add(shade); bake.add(shade);
      const bulb = new THREE.Mesh(new THREE.SphereGeometry(.17, 10, 8), bulbMat); bulb.position.set(x, 9.55, 45); group.add(bulb); bake.add(bulb);
    }
  }
  { // the lobby's south lightboxes: a painted city at dusk — a backlit mural, not a window (no exterior exists)
    const skyline = (seed) => (g, w, h) => {
      let sd = seed * 7919 + 13; const rnd = () => (sd = (sd * 16807) % 2147483647) / 2147483647;
      const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#232c47'); gr.addColorStop(.62, '#5a4a6b'); gr.addColorStop(1, '#e8975a');
      g.fillStyle = gr; g.fillRect(0, 0, w, h);
      g.fillStyle = '#f7c873'; g.beginPath(); g.arc(w * .78, h * .68, h * .13, 0, 7); g.fill();
      let x = -20;
      while (x < w) {
        const bw = 40 + rnd() * 90, bh = h * (.34 + rnd() * .5), by = h - bh;
        g.fillStyle = '#171c2c'; g.fillRect(x, by, bw, bh);
        if (rnd() < .5) g.fillRect(x + bw * .3, by - 12, bw * .4, 12);
        g.fillStyle = '#ffd98a';
        for (let wy = by + 10; wy < h - 12; wy += 17) for (let wx = x + 7; wx < x + bw - 10; wx += 15) if (rnd() < .42) g.fillRect(wx, wy, 7, 9);
        x += bw + 6 + rnd() * 22;
      }
      g.fillStyle = 'rgba(10,12,20,.55)'; g.fillRect(0, h - 8, w, 8);
    };
    [-95, -78, -61].forEach((x, i) => { const r = atlas.add(1024, 288, skyline(i + 1)); atlas.place(r, [x, 6, 75.55], Math.PI, 15, 4.2); });
  }

  /* ================= S11: atrium return + hairpin ================= */
  bakePut(W.receptionDesk(), -71, 0, 45, 90);   // long axis on the hairpin's axis: the widened inside apron (wl 12.5) passes its short ends, not its lobes
  putSign(['RECEPTION'], 4.6, .8, -69.3, .84, 45, 90, { bg: '#8a6d2f', fg: '#fff3c4', size: 70 });
  putSign(['WATCH FOR FALLING VALUATIONS'], 9.5, .65, 78.95, 3.57, 32, 90, { bg: '#7a1f1f', fg: '#ffe9a8', size: 95 });
  putSign(['MAIL — NO FORWARDING ADDRESS'], 8, .8, 68, 2.55, 25.5, 0, { bg: '#4a3a22', fg: '#ffe9a8', size: 90 });
  bakePlace(W.paperStack(), 63, 28.6, { yaw: .4, y: 0 });
  bakePlace(W.paperStack(), 73, 29, { yaw: 1.2, y: 0 });

  /* ================= S2: mezzanine / phone booth alley ================= */
  putSign(['CHIEF VIBES OFFICER'], 5.2, 1.0, 81.2, 6.0, 21, -62, { bg: '#3c4149', fg: '#f5efe0', size: 80 });
  putSign(['HEAD OF SYNERGY'], 5.2, 1.0, 81.2, 6.0, 7, -62, { bg: '#3c4149', fg: '#f5efe0', size: 80 });
  putSign(['REGIONAL MANAGER OF COMMUNITY'], 6.8, 1.05, 81.2, 6.0, -6, -62, { bg: '#3c4149', fg: '#f5efe0', size: 70 });
  putSign(['COFFEE — BACK IN 5 MIN (2019)'], 6.1, 1.0, 81.2, 5.1, 30, -62, { bg: '#4a3a22', fg: '#ffe9a8', size: 70 });
  bakePlace(W.keg(), 77.6, 30.5, { yaw: -Math.PI / 2, y: 3.44 });
  bakePlace(W.deskUnit(), 78.2, 14, { yaw: -Math.PI / 2, y: 3.44 });       // the lone lit office
  for (const z of [21, 3]) bakePlace(W.planter(2.6), 58.6, z, { yaw: Math.PI / 2, y: 3.44 });
  { // DO NOT DISTURB on the second booth, facing the road (atlas panel)
    const bp = atPos(between('C1 exit', 'C2 entry', 0.477), -6.45, 1.95);
    putSign(['DO NOT DISTURB — PERMANENTLY'], 1.7, .34, bp.x, bp.y, bp.z, bp.yaw / DEG + 180, { bg: '#23262d', fg: '#ffb3ab', size: 70 });
  }

  /* ================= S3: cubicle field ================= */
  putSign(['DO WHAT YOU L  VE'], 26, 3.6, -88.5, 4.6, -28, 90, { bg: '#14060d', fg: '#ff7dbe', size: 150 });
  putSign(['GROWTH (HOCKEY STICK)'], 11, 2.4, 0, 6, 1.55, 180, { bg: '#274b63', fg: '#ffe9a8' });
  const cub = partsOf(W.cubicleCluster());
  const spots = [];
  for (const x of [-66, -53, -40, -27, -14, -1, 12, 25, 38, 51]) spots.push({ x, y: 0, z: -45, yaw: 0 });
  for (const x of [-31, -18, -5, 8, 21]) spots.push({ x, y: 0, z: -11.7, yaw: Math.PI });
  spots.push({ x: -79, y: 0, z: -28, yaw: Math.PI / 2 });
  sc.instances(cub, spots, { cast: false, scale: 1.23 });
  bakePlace(W.deskUnit(), -52, -10.5, { yaw: Math.PI, y: 0 });
  bakePlace(W.deskUnit(), 30, -10.5, { yaw: Math.PI, y: 0 });
  bakePlace(W.paperStack(), 62, -45, { yaw: .7, y: 0 });
  bakePlace(W.paperStack(), -72, -44, { yaw: 2.1, y: 0 });
  { // e-waste: a pile of dead monitors by the field exit — one screen still faintly alive
    const deadMat = new THREE.MeshStandardMaterial({ color: 0x14181f, roughness: .35, metalness: .3 });
    const shellMat = new THREE.MeshStandardMaterial({ color: 0x2c313a, roughness: .6 });
    const aliveMat = new THREE.MeshBasicMaterial({ color: 0x2e4a3a });
    const mon = (x, y, z, yaw, tilt, alive = false) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(1.15, .72, .07), shellMat); m.position.set(x, y, z); m.rotation.set(tilt, yaw, 0); group.add(m); bake.add(m);
      const sc2 = new THREE.Mesh(new THREE.PlaneGeometry(1.02, .6), alive ? aliveMat : deadMat); sc2.position.set(x, y, z); sc2.rotation.set(tilt, yaw, 0); sc2.translateZ(.045); group.add(sc2); bake.add(sc2);
    };
    mon(-74, .38, -14, .4, 0); mon(-72.8, .38, -13.2, -.3, 0); mon(-73.4, 1.1, -13.7, .9, 0); mon(-75.2, .35, -12.6, 1.8, .5); mon(-71.8, .3, -14.8, 2.6, 1.2, true);
    putSign(['E-WASTE — PLEASE TAKE ONE'], 4.4, .7, -87.55, 2.3, -13.5, 90, { bg: '#23262d', fg: '#ffb3ab', size: 85 });
  }

  /* ================= S4: community kitchen ================= */
  putSign(['COMMUNITY'], 11, 2.8, -69.55, 2.9, 14, 90, {
    bg: '#274b63', fg: '#ffe9a8', size: 150,
    after: (g, w, h) => { g.fillStyle = '#1b2f40'; for (const [x, y] of [[.18, .12], [.55, .55], [.82, .1]]) g.fillRect(w * x, h * y, w * .09, h * .34); },
  });
  putSign(['KOMBUCHA ON TAP —', 'HELP YOURSELF, FOREVER'], 12, 2.7, -31, 4.1, 3.0, 28, { bg: '#2a4a2f', fg: '#ffe9a8', size: 95 });
  putSign(['HUSTLE HARDER', '(RENT DUE)'], 3.6, 1.8, -69.55, 2.9, 22, 90, { bg: '#7a1f3a', fg: '#ffe9a8', size: 100 });
  bakePlace(W.keg(), -30, 6.5, { yaw: 0, y: 0 });
  bakePlace(W.keg(), -32.2, 6.2, { yaw: .5, y: 0 });
  const counterMat = new THREE.MeshStandardMaterial({ color: 0xd8d2c2, roughness: .6 });
  for (let i = 0; i < 4; i++) { const c = new THREE.Mesh(new THREE.BoxGeometry(1.1, 1.05, 5.4), counterMat); c.position.set(-67.5, .53, 8 + i * 5.6); c.castShadow = true; group.add(c); bake.add(c); }
  const tgim1 = W.hangingBanner(7, 1.7, bannerMat(["THANK GOD IT'S MONDAY"], { bg: '#7a1f3a', fg: '#ffe9a8', size: 100 }));
  bakePut(tgim1, 42, 7.6, 17, -90);

  /* ================= S5: service corridor ================= */
  const atmScreen = sign(['OUT OF CASH', 'SEE THE COMMUNITY MANAGER'], .1, .1, { bg: '#0d2138', fg: '#9fd0ff', size: 64, w: 512, h: 320 }).material;
  bakePut(W.atm(atmScreen), 85.8, 0, -2, -90);
  putSign(['STAIR A — MIND THE PAPERWORK'], 5.4, .8, 113, 4.6, -10, -90, { bg: '#23262d', fg: '#f5efe0', size: 80 });
  putSign(['PERKS INCLUDE:', 'EXPOSURE'], 3.2, 1.6, 86, 3.2, -2, 90, { bg: '#274b63', fg: '#ffe9a8', size: 95 });
  bakePlace(W.paperStack(), 46.5, 8.5, { yaw: 1.9, y: 0 });

  /* ================= S6: Stairwell A ================= */
  bakePlace(W.piano(), 143, -43, { y: 2.94, yaw: Math.PI / 2, scale: 2.4 });
  bakePut(W.stairFlight(5, 2.2), 138, 2.94, -41.5, 180);
  const exitWall = new THREE.Mesh(new THREE.BoxGeometry(3.4, 3.4, .25), new THREE.MeshStandardMaterial({ color: 0xe9e4d8, roughness: .9 }));
  exitWall.position.set(138, 4.6, -39.9); group.add(exitWall); bake.add(exitWall);
  putSign(['EXIT'], 1.6, .5, 138, 5.9, -39.7, 0, { bg: '#123d22', fg: '#7dffce', size: 110 });
  bakePut(W.elevatorDoors(), 175.6, 2.9, -43, -90);
  putSign(['OUT OF ORDER SINCE 2019'], 3.2, .6, 175.35, 6.4, -43, -90, { bg: '#23262d', fg: '#ffb3ab', size: 80 });

  /* ================= S7: executive row ================= */
  for (const x of [-64, -48, -32, -16, 0, 32, 48]) bakePlace(W.deskUnit(), x, -24.4, { yaw: .4, y: 5.94, scale: 1.5 });
  bakePlace(W.parachuteCase(), 20, -3.4, { y: 5.94, scale: 1.35 });
  putSign(['IN CASE OF BANKRUPTCY'], 2.6, .5, 20, 7.9, -3.95, 180, { bg: '#8a6d2f', fg: '#fff3c4', size: 80 });
  putSign(['DREAM BIG.', 'EXIT BIGGER.'], 4.2, 2.0, -40, 8.7, -22.35, 0, { bg: '#3a2a4a', fg: '#e8d8ff', size: 105 });
  putSign(['COMMUNITY-ADJUSTED EBITDA'], 9.5, 2.7, -16, 8.9, -21.6, 0, {
    bg: '#20242c', fg: '#ffe9a8', size: 84,
    after: (g, w, h) => {
      g.strokeStyle = '#7dffce'; g.lineWidth = 7; g.beginPath();
      g.moveTo(w * .08, h * .88); g.lineTo(w * .3, h * .8); g.lineTo(w * .52, h * .84); g.lineTo(w * .74, h * .62); g.lineTo(w * .93, h * .52); g.stroke();
      g.strokeStyle = 'rgba(255,255,255,.25)'; g.lineWidth = 2; g.beginPath(); g.moveTo(w * .08, h * .45); g.lineTo(w * .08, h * .9); g.lineTo(w * .94, h * .9); g.stroke();
    },
  });
  bakePlace(W.paperStack(), 40, -19.5, { yaw: .3, y: 5.94 });

  /* ================= S8: meeting gallery ================= */
  bakePut(W.meetingRoom(12, 8), -111.5, 6, 8, 90);
  putSign(['SYNERGY'], 5, 1.15, -108.5, 8.8, 8, 114, { bg: '#3c4149', fg: '#f5efe0', size: 90 });
  bakePut(W.meetingRoom(9, 8), -111.5, 6, 32, 90);
  putSign(['DEEP DIVE'], 5, 1.15, -108.5, 8.8, 32, 114, { bg: '#3c4149', fg: '#f5efe0', size: 90 });
  bakePut(W.meetingRoom(7, 11), -83.5, 6, 16, 180);
  putSign(['DISRUPTION'], 5.1, 1.2, -83.5, 8.9, 10.0, 213, { bg: '#3c4149', fg: '#f5efe0', size: 90 });
  putSign(['SYNERGY → ??? → PROFIT'], 3.4, 1.1, -83.5, 7.4, 11.2, 180, { bg: '#f4f1e8', fg: '#2a4a8f', size: 80 });
  putSign(['EXIT STRATEGY'], 10, 2.4, -97, 9.2, -15.5, 0, { bg: '#3a2a4a', fg: '#e8d8ff' });
  const tgim2 = W.hangingBanner(7.5, 1.9, bannerMat([{ t: "THANK GOD IT'S MONDAY", strike: '#ff3b30' }, { t: "THANK GOD IT'S OVER", fg: '#ff8a7a' }], { bg: '#23262d', fg: '#f5efe0', size: 92 }));
  bakePut(tgim2, -90, 11.6, 34, 90);

  /* ================= S9: south balcony dressing ================= */
  for (const x of [-58, 24]) bakePlace(W.planter(3), x, 43.8, { yaw: 0, y: 5.94 });
  { // the fallen banner, draped over the balcony railing
    const fb = W.hangingBanner(2.6, 4.2, bannerMat(['DO WHAT', 'YOU LOVE'], { bg: '#2a4a2f', fg: '#ffe9a8', size: 110 }));
    fb.position.set(-16, 7.3, 45.9); fb.rotation.x = -1.05; group.add(fb); bake.add(fb);
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
    pm.position.set(124.7, 5.3, 45); pm.rotation.y = -90 * DEG; pm.rotation.z = .07; group.add(pm); bake.add(pm);
    putSign(['OUR FOUNDER (FORMER)'], 4.5, .85, 124.5, 3.45, 45, -111, { bg: '#8a6d2f', fg: '#fff3c4', size: 80 });
  }
  const pipe = new THREE.Mesh(new THREE.CylinderGeometry(.14, .14, 3.2, 8), new THREE.MeshStandardMaterial({ color: 0xb03024, roughness: .5 }));
  pipe.position.set(84, 1.6, 62); pipe.castShadow = true; group.add(pipe); bake.add(pipe);

  { // dust motes drifting in the atrium light and over the cubicle field — the air of a closed office
    const rng = sc.rng;
    anim.push((dt) => {
      let n = view.fx.count(7, dt);
      while (n-- > 0) view.fx.dust(rng.range(-70, 60), rng.range(0.6, 10.5), rng.range(34, 62), rng.range(-.15, .15), rng.range(-.06, .02), rng.range(-.15, .15), [0.92, 0.88, 0.78], 0.55, 2.8, 0.35);
      n = view.fx.count(5, dt);
      while (n-- > 0) view.fx.dust(rng.range(-80, 70), rng.range(0.6, 11), rng.range(-48, -4), rng.range(-.15, .15), rng.range(-.06, .02), rng.range(-.15, .15), [0.88, 0.86, 0.8], 0.5, 2.8, 0.3);
    });
  }

  /* ---- one mesh per atlas page + one per prop material: the draw-call fix ---- */
  atlas.flush(); bake.flush();
}
/* Architectural fittings share one painted mesh. Box sizes are architectural
   metres. Workstations and the kitchen island read at 100 km/h from both ends. */
function furnishOffice(ctx, H) {
  const { THREE, group, view } = ctx, { putSign, atlas } = H;
  const q = new Quads(THREE);
  const box = (x, y, z, w, h, d, tint) => q.box(x-w/2, y, z-d/2, x+w/2, y+h, z+d/2, tint);
  const oak = 0xddac76, teal = 0x286d68, ink = 0x273b40, ivory = 0xffe8ba, coral = 0xce6456;
  const graphic = (text, x, y, z, yaw, width, height, bg, fg) =>
    putSign([text], width, height, x, y, z, yaw, { w: 768, h: 192, bg, fg, size: 158 });

  // Individual acoustic islands sit outside the lane. Monitor faces and chair
  // backs rise above the partitions so this reads as desks from a low camera.
  for (const x of [-52, -35, -18, -1, 16, 33]) {
    for (const z of [-42.5, -14.4]) {
      if (x === -52 && z > -20) continue; // leave the cubicle-field hairpin clear
      box(x, 0, z, 8.2, 1.46, 1.85, teal);
      box(x, 1.47, z, 8.7, .22, 2.5, oak);
      for (const dx of [-2.2, 2.15]) {
        box(x+dx, 1.69, z, .3, .68, .3, ink);
        box(x+dx, 2.11, z, .22, 1.28, 2.12, ink);
        box(x+dx+.12, 2.22, z, .035, 1.02, 1.87, dx > 0 ? 0xa8dac8 : 0xf5bf81);
        box(x+dx+.31, 1.7, z, .45, .055, 1.06, 0x444849);
      }
    }
  }
  // The giant tap wall is built from real tanks, tap handles, the tiled
  // back bar, a drip tray, shelves of cups, and a scalloped hanging canopy.
  box(-11, 0, 5, 51, 1.7, 3, teal);
  box(-11, 1.7, 5, 52, .24, 3.6, oak);
  box(-11, 1.95, 3.5, 51, 3.2, .22, 0xeee0b9);
  const cylinder = (x, y, z, radius, height, colour) => {
    const faces = 12, at = (i, dy) => [x + Math.cos(i*2*Math.PI/faces)*radius, y+dy, z+Math.sin(i*2*Math.PI/faces)*radius];
    for (let i=0; i<faces; i++) {
      q.quad(at(i+1,0),at(i,0),at(i,height),at(i+1,height),1,1,colour);
      q.quad([x,y+height,z],at(i+1,height),at(i,height),[x,y+height,z],1,1,colour);
    }
  };
  for (const [i,x] of [-28,-21,-14,-7,0,7].entries()) {
    const bright = [0xdb9175,0xa1bd88,0xe4b556][i%3];
    cylinder(x, 1.95, 5.1, 1.16, 2.6, bright);
    for (const y of [2,4.38]) cylinder(x, y, 5.1, 1.19, .18, ink);
    box(x, 2.45, 6.43, .25, .75, .45, ink);
    box(x, 3.12, 6.52, .68, .17, .24, ivory);
    for (const dx of [1.9,2.7]) cylinder(x+dx, 1.94, 5.95, .24, .42, ivory);
  }
  for (let x=-34; x<=12; x+=2.4) box(x, 6.1, 5.45, 2.4, .56, 4.6, (Math.round((x+34)/2.4)%2) ? ivory : teal);

  // The boardroom is an open executive suite, framed in walnut. A long
  // conference table and angled displays are visible across the racing line.
  for (const x of [-58,-39,-20,-1,18,37]) {
    box(x, 5.98, -25.5, 13, 2.0, .3, oak);
    box(x, 7.98, -25.5, 13.3, .16, 1.8, oak);
    box(x, 8.15, -25.5, .32, .4, .32, ink);
    box(x, 8.52, -25.45, 3.6, 1.75, .22, ink);
    box(x, 8.65, -25.30, 3.26, 1.46, .05, 0x8abec7);
    for (const dx of [-5.8,5.8]) {
      box(x+dx, 6.0, -25.6, .25, 6.1, .4, oak);
      box(x+dx, 12.0, -25.5, .36, .22, 5.4, oak);
    }
  }
  // Digit-sized landing stripes and repeated nosings make the two stair
  // flights read as switchbacks from below, without putting steps on the road.
  for (const [x0,x1,z0,base,rise,color] of [
    [114,146,-27,0,3,teal], [146,110,-59,3,3,teal],
    [92,122,58,6,-3,coral], [122,92,32,3,-3,coral],
  ]) {
    const inside = z0 === -27 || z0 === 58 ? -1 : 1;
    for (let i=0; i<14; i++) {
      const a=i/14, x=x0+(x1-x0)*a, z=z0+inside*(z0 === -27 || z0 === -59 ? 19.5 : 12.6), y=base+rise*a;
      box(x, y-.24, z, Math.abs(x1-x0)/14+.02, .36, 2.15, oak);
      box(x, y+.13, z, .12, .035, 2.15, color);
      if (i%3===0) box(x, y+.16, z, .12, 1.25, .12, ink);
    }
  }
  // The stairwells carry a wrap of colour around the return and up onto the
  // second floor. Repeated tall piers make the depth of the stair bay clear.
  for (let x=106; x<=174; x+=8) {
    box(x, 3.5, -72.1, 7.95, 4.1, .3, teal);
    box(x, 7.6, -72.0, 7.95, .18, .32, ivory);
    box(x-3.5, 0, -71.9, .42, 12.7, .6, oak);
  }
  for (let x=104; x<=144; x+=8) {
    box(x, 2.25, 72.6, 7.95, 5.4, .3, coral);
    box(x, 7.66, 72.5, 7.95, .18, .32, ivory);
  }
  for (let z=23; z<=67; z+=7.2) {
    box(150.64, 1.72, z, .34, 7.4, 7.16, coral);
    box(150.40, 1.74, z-3.35, .3, 8.7, .36, oak);
  }
  // The pods are forking posts along the lounge. Soft built-in banquettes
  // sit against the window between them and guide the approach into the mall.
  for (const z of [-5,4,13,22]) {
    box(80.5, 3.5, z, 2.1, .56, 6.8, oak);
    box(80.35, 4.06, z, 1.9, .38, 6.6, 0xd57c61);
    box(81.18, 4.41, z, .32, 1.15, 6.6, 0xa85950);
  }
  // Two turn markers use the building's fire-escape chevrons. The front
  // planes face the arriving kart, including the wall around the red landing.
  const turns = atlas.add(512,128,(g,w,h) => {
    g.fillStyle='#20423f'; g.fillRect(0,0,w,h);
    for (let i=0; i<4; i++) {
      const x=i*w/4+10;
      g.fillStyle='#ffe7a6'; g.beginPath();
      for (const [j,[dx,dy]] of [[0,0],[45,0],[95,48],[45,96],[0,96],[50,48]].entries()) {
        if (j===0) g.moveTo(x+dx,16+dy); else g.lineTo(x+dx,16+dy);
      } g.closePath(); g.fill();
    }
  });
  atlas.place(turns,[175.6,4.4,-43],-Math.PI/2,15.5,3);
  atlas.place(turns,[150.31,4.4,45],-Math.PI/2,14,2.8);
  // Suspended at the end of the lobby straight, well above the feature ramp.
  box(40.12, 8.68, 58, .16, 4.05, 17.7, ink);
  for (const z of [50.4,65.6]) box(40.12, 12.73, z, .10, 3.27, .10, ink);

  // Close the gallery wall with rooms instead of hanging signs against an
  // empty hall. Keep the lounge set behind the glass at the full drift width.
  for (const z of [-10, 3, 16, 29, 42, 55]) {
    box(-121, 6, z, 1.4, 6.6, 11.8, ink);
    box(-120.15, 7.1, z, .22, 3.4, 9.6, 0x8eadab);
    box(-120.0, 6.9, z, .4, .20, 10.3, oak);
    box(-119.97, 7.1, z, .28, 3.4, .20, ink);
    box(-119.95, 10.5, z, .32, .22, 10, oak);
  }
  for (const x of [-49,-20,9,38]) {
    box(x, .02, 45.2, 15, 1.0, 2.4, teal);
    box(x, 1.03, 45.1, 15.2, .32, 2.5, oak);
    box(x, 1.35, 45.8, 15.2, 1.1, .4, coral);
    box(x, 5.94, 48.3, 9.3, .6, 1.2, oak);
    box(x, 6.55, 48.4, 9.4, .38, 1.2, 0xa75652);
    box(x, 6.92, 48.85, 9.4, .85, .29, coral);
  }
  // Suspended destination boards mark both lines before the
  // cubicle bank: the narrow carpet stripe earns speed, the other yields items.
  graphic('EXPRESS  »', 21, 5.15, -33.5, 90, 8.6, 1.5, '#194d49', '#ffe3a1');
  graphic('HOT DESKS', 21, 5.15, -22.5, 90, 8.6, 1.5, '#783e4d', '#ffedcd');
  box(21, 5.78, -28, .23, .12, 20.5, ink);
  box(21, 5.90, -37.5, .10, 7.70, .10, ink);
  // The inner end hangs from the executive balcony above it.
  box(21, 5.72, -18.5, .10, .18, .10, ink);
  graphic('STAIR A  ↑', 175.65, 8.3, -43, -90, 18, 3.3, '#216057', '#ffe7a6');
  graphic('FIRE STAIR  ↓', 150.3, 8.3, 45, -90, 18, 3.3, '#87372c', '#fff0cb');
  graphic('PLEASE CHECK IN', -102, 5.0, 36, 90, 14, 2.5, '#473746', '#ffcf8d');
  for (const x of [-70,-48,-26,-4,18,40,62]) {
    box(x, .16, 79, 14, 7.5, .38, 0xc69c70);
    for (const dx of [-5.9,-3.9,-1.9,.1,2.1,4.1,6.1]) box(x+dx,.16,78.65,.16,7.5,.26,oak);
    box(x, 7.69, 78.96, 15.6, .15, .36, ivory);
  }
  // Stock road barriers have a 2.5 m deep outside face. At a crossover
  // this drops a solid curtain into the aisle below. Build low office plinths
  // to exactly the same collision perimeter, with a shallow lip on both sides.
  view.trackMesh.getObjectByName('walls').visible = false;
  const tr = ctx.track;
  for (const side of [-1,1]) {
    const hw = side > 0 ? tr.hwL : tr.hwR;
    const edge = (i, offset, lift) => {
      const lat = (hw[i] + offset) * side;
      return [tr.px[i]+tr.lx[i]*lat, tr.py[i]+tr.ly[i]*lat+lift, tr.pz[i]+tr.lz[i]*lat];
    };
    for(let i=0; i<tr.N; i++) {
      const j=(i+1)%tr.N, tone = Math.floor(i*tr.ds/7)%2 ? oak : ivory;
      const ai=edge(i,0,.22), bi=edge(j,0,.22), ao=edge(i,.28,.22), bo=edge(j,.28,.22);
      q.quad(ai,bi,bo,ao,1,1,tone);
      q.quad(edge(i,0,-.12),edge(j,0,-.12),bi,ai,1,1,ink);
      q.quad(ao,bo,edge(j,.28,-.15),edge(i,.28,-.15),1,1,teal);
    }
  }
  const fittings = q.mesh(new THREE.MeshStandardMaterial({ vertexColors:true, roughness:.72, side:THREE.DoubleSide }));
  group.add(fittings);
  // Use fresh office carpet tiles for the two carpeted floors. The road's UVs
  // run from zero to one across the full width, and repeat every 12 m along it.
  const runner = canvasTex(512,256,(g) => {
    for (let y=0; y<4; y++) for(let x=0; x<8; x++){
      g.fillStyle = ['#646574','#5a6067','#676c72','#656a70'][(x*7+y*5)%4]; g.fillRect(x*64,y*64,64,64);
      g.fillStyle = 'rgba(22,38,40,.10)';
      for(let j=2;j<64;j+=5) if ((x+y)%2) g.fillRect(x*64+j,y*64,1,63); else g.fillRect(x*64,y*64+j,63,1);
    }
    for (const x of [12,496]) { g.fillStyle='#d2af74'; g.fillRect(x,0,4,256); }
    g.fillStyle='#427e7b'; g.fillRect(96,0,83,256);
    g.fillStyle='#80b4a6'; g.fillRect(96,0,3,256); g.fillRect(176,0,3,256);
    g.fillStyle='#b6d2af'; g.beginPath(); g.moveTo(111,188);g.lineTo(137,166);g.lineTo(163,188);g.lineTo(163,195);g.lineTo(137,175);g.lineTo(111,195);g.fill();
  }, { aniso: 8 });
  const carpet = view.trackMesh.userData.mats.road_carpet;
  carpet.map.dispose();
  carpet.map = runner;
}
