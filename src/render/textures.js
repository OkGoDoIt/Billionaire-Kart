/* Procedural canvas textures. Browser only. */
import * as THREE from 'three';
import { makeRng } from '../core/util.js';

export function canvasTex(w, h, draw, { repeat = true, aniso = 8, srgb = true, mip = true } = {}) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const g = c.getContext('2d');
  draw(g, w, h);
  const t = new THREE.CanvasTexture(c);
  if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = aniso;
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.generateMipmaps = mip;
  t.minFilter = mip ? THREE.LinearMipmapLinearFilter : THREE.LinearFilter;
  return t;
}

const hex = n => '#' + n.toString(16).padStart(6, '0');

function speckle(g, w, h, rng, count, colors, min = 1, max = 2.5, alpha = 0.5) {
  for (let i = 0; i < count; i++) {
    g.globalAlpha = alpha * (0.4 + rng() * 0.6);
    g.fillStyle = colors[Math.floor(rng() * colors.length)];
    const s = min + rng() * (max - min);
    g.fillRect(rng() * w, rng() * h, s, s);
  }
  g.globalAlpha = 1;
}

/**
 * Road surface. U spans the road width, V runs along the track (one tile = `tileLen` metres).
 * style: { base, line, center, edgeLine, wear }
 */
export function roadTexture(style = {}) {
  const base = style.base ?? 0x5b6170, line = style.line ?? 0xffffff, center = style.center ?? 0xffd23c;
  return canvasTex(512, 1024, (g, w, h) => {
    const rng = makeRng(style.seed ?? 11);
    g.fillStyle = hex(base); g.fillRect(0, 0, w, h);
    // tonal variation: darker tyre-worn lanes, lighter crown
    const lane = g.createLinearGradient(0, 0, w, 0);
    lane.addColorStop(0, 'rgba(0,0,0,0.16)'); lane.addColorStop(0.2, 'rgba(0,0,0,0.02)');
    lane.addColorStop(0.32, 'rgba(0,0,0,0.12)'); lane.addColorStop(0.5, 'rgba(255,255,255,0.05)');
    lane.addColorStop(0.68, 'rgba(0,0,0,0.12)'); lane.addColorStop(0.8, 'rgba(0,0,0,0.02)'); lane.addColorStop(1, 'rgba(0,0,0,0.16)');
    g.fillStyle = lane; g.fillRect(0, 0, w, h);
    speckle(g, w, h, rng, 5200, ['#ffffff', '#cfd6e4', '#20232b', '#3a3f4b'], 1, 2.2, style.grain ?? 0.2);
    // soft patches
    for (let i = 0; i < 26; i++) {
      const x = rng() * w, y = rng() * h, r = 30 + rng() * 90;
      const gr = g.createRadialGradient(x, y, 0, x, y, r);
      const dark = rng() < 0.5;
      gr.addColorStop(0, dark ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.05)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2);
    }
    // wrap-safe: paint lines last
    if (style.edgeLine !== false) {
      g.fillStyle = hex(line); g.globalAlpha = 0.92;
      g.fillRect(w * 0.035, 0, w * 0.018, h); g.fillRect(w * (1 - 0.035 - 0.018), 0, w * 0.018, h);
    }
    if (style.center !== false) {
      g.fillStyle = hex(center); g.globalAlpha = 0.9;
      const dash = h / 4;
      for (let y = 0; y < h; y += dash) g.fillRect(w * 0.5 - w * 0.008, y + dash * 0.1, w * 0.016, dash * 0.5);
    }
    g.globalAlpha = 1;
  }, { aniso: 16 });
}

/** Red/white (or custom) kerb stripes. V runs along the track; one tile = one colour pair. */
export function kerbTexture(a = 0xe23b3b, b = 0xf7f7f2) {
  return canvasTex(64, 128, (g, w, h) => {
    g.fillStyle = hex(a); g.fillRect(0, 0, w, h / 2);
    g.fillStyle = hex(b); g.fillRect(0, h / 2, w, h / 2);
    const sh = g.createLinearGradient(0, 0, w, 0);
    sh.addColorStop(0, 'rgba(0,0,0,0.12)'); sh.addColorStop(0.5, 'rgba(255,255,255,0.06)'); sh.addColorStop(1, 'rgba(0,0,0,0.18)');
    g.fillStyle = sh; g.fillRect(0, 0, w, h);
  }, { aniso: 8 });
}

/** Tiling detail noise (grey, centred on white) multiplied over vertex-coloured terrain. */
export function detailTexture(seed = 3, contrast = 0.22) {
  return canvasTex(256, 256, (g, w, h) => {
    const rng = makeRng(seed);
    g.fillStyle = '#e9e9e9'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 900; i++) {
      const x = rng() * w, y = rng() * h, r = 4 + rng() * 16;
      const gr = g.createRadialGradient(x, y, 0, x, y, r);
      const d = rng() < 0.5;
      gr.addColorStop(0, d ? `rgba(0,0,0,${contrast})` : `rgba(255,255,255,${contrast * 1.4})`); gr.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = gr;
      // drawn nine times so the blobs wrap across the tile's edges (the gradient has to move with each copy, or the copies come out empty and the tile shows a seam)
      for (const ox of [-w, 0, w]) for (const oy of [-h, 0, h]) { g.save(); g.translate(ox, oy); g.fillRect(x - r, y - r, r * 2, r * 2); g.restore(); }
    }
    speckle(g, w, h, rng, 2400, ['#ffffff', '#9a9a9a'], 1, 2, contrast * 1.2);
  }, { aniso: 4 });
}

/** Mown meadow for the ground map: long soft bands running one way (the mower's rows), finer streaks along them, gentle
    mottling, and grain. Mid-grey on average, so it only modulates the ground's own color. One tile covers a lot of
    ground (set look.groundScale to match), which is what lets the bands read on a hill hundreds of meters away. */
export function meadowTexture(seed = 7, size = 1024) {
  return canvasTex(size, size, (g, w, h) => {
    const rng = makeRng(seed), k = size / 1024;
    g.fillStyle = '#e4e4e4'; g.fillRect(0, 0, w, h);
    // every mark is drawn nine times, shifted by a whole tile each way, so the tile wraps without a seam
    const wrapped = draw => { for (const ox of [-w, 0, w]) for (const oy of [-h, 0, h]) { g.save(); g.translate(ox, oy); draw(); g.restore(); } };
    const band = (x, y, bw, len, dark, a) => {
      const gr = g.createLinearGradient(x - bw / 2, 0, x + bw / 2, 0), c = dark ? '0,0,0' : '255,255,235';
      gr.addColorStop(0, `rgba(${c},0)`); gr.addColorStop(0.5, `rgba(${c},${a})`); gr.addColorStop(1, `rgba(${c},0)`);
      wrapped(() => { g.fillStyle = gr; g.beginPath(); g.ellipse(x, y, bw / 2, len / 2, 0, 0, 6.2832); g.fill(); });
    };
    const blob = (r0, r1, a0, a1) => {
      const x = rng() * w, y = rng() * h, r = (r0 + rng() * (r1 - r0)) * k, c = rng() < 0.5 ? '0,0,0' : '255,255,235', gr = g.createRadialGradient(x, y, 0, x, y, r);
      gr.addColorStop(0, `rgba(${c},${a0 + rng() * (a1 - a0)})`); gr.addColorStop(1, `rgba(${c},0)`);
      wrapped(() => { g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2); });
    };
    for (let i = 0; i < 70; i++) band(rng() * w, rng() * h, (26 + rng() * 54) * k, (200 + rng() * 500) * k, rng() < 0.5, 0.02 + rng() * 0.025);   // the rows, faint
    for (let i = 0; i < 500; i++) band(rng() * w, rng() * h, (3 + rng() * 6) * k, (30 + rng() * 100) * k, rng() < 0.55, 0.035 + rng() * 0.05);   // short streaks along them
    for (let i = 0; i < 180; i++) blob(40, 120, 0.025, 0.05);                                                                                    // broad, soft variation
    for (let i = 0; i < 3600; i++) blob(5, 20, 0.07, 0.16);                                                                                     // tufts: on a far hill these flatten into short dashes
    for (let i = 0; i < 26000 * k * k; i++) {                                                                                                   // grain: short flecks lying along the rows
      g.fillStyle = rng() < 0.5 ? `rgba(0,0,0,${0.08 + rng() * 0.14})` : `rgba(255,255,220,${0.1 + rng() * 0.16})`;
      g.fillRect(rng() * w, rng() * h, 1 + rng() * 1.2, 1.5 + rng() * 4.5);
    }
  }, { aniso: 16 });
}

export function checkerTexture(n = 8, a = '#111318', b = '#f5f5f0') {
  return canvasTex(256, 256, (g, w, h) => {
    const s = w / n;
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) { g.fillStyle = (x + y) % 2 ? a : b; g.fillRect(x * s, y * s, s, s); }
  }, { aniso: 8 });
}

/** Soft round sprite for particles. */
export function glowTexture(size = 64, hard = 0.0) {
  return canvasTex(size, size, (g, w) => {
    const gr = g.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2);
    gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(Math.max(0.01, hard), 'rgba(255,255,255,1)');
    gr.addColorStop(0.6 + hard * 0.3, 'rgba(255,255,255,0.35)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr; g.fillRect(0, 0, w, w);
  }, { repeat: false, srgb: true, mip: false });
}

export function puffTexture(size = 128, seed = 5) {
  return canvasTex(size, size, (g, w) => {
    const rng = makeRng(seed);
    for (let i = 0; i < 14; i++) {
      const a = rng() * Math.PI * 2, d = rng() * w * 0.2, r = w * (0.16 + rng() * 0.16);
      const x = w / 2 + Math.cos(a) * d, y = w / 2 + Math.sin(a) * d;
      const gr = g.createRadialGradient(x, y, 0, x, y, r);
      gr.addColorStop(0, 'rgba(255,255,255,0.55)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = gr; g.fillRect(0, 0, w, w);
    }
  }, { repeat: false, mip: false });
}

/** Number of illustrated sponsor boards in assets/ads (ad-01.webp ...). */
export const AD_IMAGES = 24;
const adImageCache = new Map();
/** Tracks with their own set of boards in assets/ads/<track id>/ (ad-1.webp ...), and how many each has. */
export const AD_SETS = { 'silicon-valley': 8, 'bliss-hills': 8, 'crypto-cove': 8, 'datacenter-dash': 8, 'capitol-hill': 8, 'burning-circuit': 8, 'mars-colony': 8, 'singularity-speedway': 8 };
function adImage(n, set = '') {
  const src = set ? `assets/ads/${set}/ad-${n}.webp` : `assets/ads/ad-${String(n).padStart(2, '0')}.webp`;
  if (!adImageCache.has(src)) adImageCache.set(src, new Promise(res => { const i = new Image(); i.onload = () => res(i); i.onerror = () => res(null); i.src = src; }));
  return adImageCache.get(src);
}

/**
 * Sponsor strip: four 2:1 boards side by side (so set repeat.x = 0.25 to show one).
 * Boards alternate between the track's own slogans, drawn as text, and the
 * illustrated sponsor boards in assets/ads, which load in a moment after.
 * A track with no slogans of its own gets illustrated boards only.
 * Pass { set: trackId } for a strip made of that track's own boards instead:
 * all of them, in a shuffled order (tex.userData.boards says how many).
 */
export function bannerTexture(ads, seed = 1, { set = '' } = {}) {
  const setN = AD_SETS[set] || 0;
  const pal = [['#ffd23c', '#1a1d29'], ['#ff4d6d', '#ffffff'], ['#22c1c3', '#0b2239'], ['#ffffff', '#e23b3b'], ['#7b5cff', '#ffffff'], ['#16a34a', '#ffffff'], ['#1a1d29', '#ffd23c'], ['#ff8a00', '#1a1d29'], ['#0ea5e9', '#ffffff'], ['#db2777', '#ffffff']];
  const n = setN || 4, own = ads && ads !== DEFAULT_ADS && ads.length > 0;
  const tex = canvasTex(512 * n, 256, (g, w, h) => {
    const rng = makeRng(seed), bw = w / n;
    for (let i = 0; i < n; i++) {
      const [bg, fg] = pal[Math.floor(rng() * pal.length)], x = i * bw;
      g.fillStyle = bg; g.fillRect(x, 0, bw, h);
      // a diagonal sheen and a darker foot, like a printed board
      const sh = g.createLinearGradient(x, 0, x + bw, h); sh.addColorStop(0, 'rgba(255,255,255,0.16)'); sh.addColorStop(0.5, 'rgba(255,255,255,0)'); sh.addColorStop(1, 'rgba(0,0,0,0.16)');
      g.fillStyle = sh; g.fillRect(x, 0, bw, h);
      g.textAlign = 'center'; g.textBaseline = 'middle';
      const text = (ads && ads.length ? ads : DEFAULT_ADS)[Math.floor(rng() * (ads && ads.length ? ads : DEFAULT_ADS).length)];
      // break long slogans over two lines
      const words = text.split(' '); let lines = [text];
      if (text.length > 13 && words.length > 1) { let best = 1, bd = 1e9; for (let k = 1; k < words.length; k++) { const d = Math.abs(words.slice(0, k).join(' ').length - words.slice(k).join(' ').length); if (d < bd) { bd = d; best = k; } } lines = [words.slice(0, best).join(' '), words.slice(best).join(' ')]; }
      let size = lines.length > 1 ? 96 : 120; const font = () => { g.font = `${size}px "Luckiest Guy", "Arial Black", sans-serif`; };
      font(); while (Math.max(...lines.map(l => g.measureText(l).width)) > bw - 56 && size > 24) { size -= 4; font(); }
      lines.forEach((l, k) => { const y = h / 2 + 8 + (k - (lines.length - 1) / 2) * size * 1.02; g.fillStyle = 'rgba(0,0,0,0.28)'; g.fillText(l, x + bw / 2 + 5, y + 6); g.fillStyle = fg; g.fillText(l, x + bw / 2, y); });
      g.strokeStyle = 'rgba(255,255,255,0.5)'; g.lineWidth = 6; g.strokeRect(x + 7, 7, bw - 14, h - 14);
      g.fillStyle = 'rgba(0,0,0,0.3)'; g.fillRect(x + bw - 3, 0, 3, h);
    }
  }, { aniso: 8 });
  tex.userData.boardAspect = 2; tex.userData.boards = n;
  if (typeof Image !== 'undefined') {
    const rng = makeRng(seed * 31 + 7), slots = setN ? [...Array(n).keys()] : own ? [1, 3] : [0, 1, 2, 3], used = new Set();
    const order = setN ? rng.shuffle([...Array(n).keys()].map(i => i + 1)) : null;
    // draw every board as it arrives, then upload the strip once
    Promise.all(slots.map(slot => {
      let pick; if (order) pick = order[slot]; else { do { pick = 1 + Math.floor(rng() * AD_IMAGES); } while (used.has(pick)); used.add(pick); }
      return adImage(pick, setN ? set : '').then(img => { if (!img) return; const c = tex.image, g = c.getContext('2d'), bw = c.width / n; g.drawImage(img, slot * bw, 0, bw, c.height); g.fillStyle = 'rgba(0,0,0,0.3)'; g.fillRect((slot + 1) * bw - 3, 0, 3, c.height); });
    })).then(() => { tex.needsUpdate = true; });
  }
  return tex;
}

export const DEFAULT_ADS = [
  'AGI™ SOON', 'GPU GO BRRR', 'PIVOT!', 'SERIES Z', 'NOT FINANCIAL ADVICE', 'MOVE FAST', 'DISRUPT', 'SYNERGY',
  'YOUR DATA HERE', 'MARS OR BUST', '10X EVERYTHING', 'BURN RATE', 'STEALTH MODE', 'WE ARE HIRING', 'TOKENS!', 'UNICORN FUEL',
  'ZERO TO ONE', 'DAY ONE', 'THOUGHT LEADER', 'HYPERSCALE', 'RUNWAY: 3 LAPS', 'DOWN ROUND', 'TOO BIG TO FAIL', 'INNOVATE',
];

/* ---------- road skins ---------- */
/** Material settings for a named road surface. U spans the width, V runs along the track. */
export function roadSkin(name, style = {}) {
  const rngOf = seed => makeRng(seed);
  const lines = (g, w, h, col = 'rgba(255,255,255,0.9)') => { g.fillStyle = col; g.fillRect(w * 0.035, 0, w * 0.018, h); g.fillRect(w * (1 - 0.053), 0, w * 0.018, h); };
  switch (name) {
    case 'wood': return { tile: 6, roughness: 0.85, map: canvasTex(512, 512, (g, w, h) => {
      const rng = rngOf(31), rows = 8, ph = h / rows;
      for (let r = 0; r < rows; r++) {
        const t = 0.55 + rng() * 0.35; g.fillStyle = `rgb(${Math.round(186 * t + 40)},${Math.round(128 * t + 24)},${Math.round(70 * t + 12)})`; g.fillRect(0, r * ph, w, ph);
        for (let i = 0; i < 40; i++) { g.fillStyle = `rgba(60,30,10,${0.05 + rng() * 0.08})`; g.fillRect(rng() * w, r * ph + rng() * ph, 30 + rng() * 120, 1.5); }
        g.fillStyle = 'rgba(40,20,8,0.55)'; g.fillRect(0, r * ph, w, 3);
        for (const x of [0.12, 0.5, 0.88]) { g.fillStyle = 'rgba(30,20,12,0.6)'; g.beginPath(); g.arc(w * x + (r % 2) * 14, r * ph + ph / 2, 3.2, 0, 7); g.fill(); }
      }
      g.fillStyle = 'rgba(255,220,150,0.5)'; g.fillRect(0, 0, w * 0.03, h); g.fillRect(w * 0.97, 0, w * 0.03, h);
    }, { aniso: 16 }) };
    case 'sand': case 'dirt': return { tile: 14, roughness: 1, map: canvasTex(512, 1024, (g, w, h) => {
      const rng = rngOf(name === 'sand' ? 41 : 43), base = name === 'sand' ? [226, 200, 150] : [168, 128, 88];
      g.fillStyle = `rgb(${base})`; g.fillRect(0, 0, w, h);
      for (let i = 0; i < 9000; i++) { const d = rng() < 0.5 ? -1 : 1, a = 0.05 + rng() * 0.1; g.fillStyle = d > 0 ? `rgba(255,255,255,${a})` : `rgba(70,45,20,${a})`; const sz = 1 + rng() * 2.5; g.fillRect(rng() * w, rng() * h, sz, sz); }
      for (const x of [0.3, 0.42, 0.58, 0.7]) { const gr = g.createLinearGradient(w * (x - 0.03), 0, w * (x + 0.03), 0); gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(0.5, 'rgba(60,35,15,0.22)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(w * (x - 0.03), 0, w * 0.06, h); }
    }, { aniso: 16 }) };
    case 'metal': return { tile: 10, roughness: 0.42, metalness: 0.75, map: canvasTex(512, 512, (g, w, h) => {
      const rng = rngOf(51); g.fillStyle = '#7a8496'; g.fillRect(0, 0, w, h);
      for (let y = 0; y < 2; y++) for (let x = 0; x < 4; x++) { const X = x * w / 4, Y = y * h / 2; g.fillStyle = `rgba(${rng() < 0.5 ? 255 : 0},${rng() < 0.5 ? 255 : 0},${rng() < 0.5 ? 255 : 0},0.05)`; g.fillRect(X, Y, w / 4, h / 2); g.strokeStyle = 'rgba(20,24,34,0.7)'; g.lineWidth = 3; g.strokeRect(X + 1.5, Y + 1.5, w / 4 - 3, h / 2 - 3); for (const [dx, dy] of [[10, 10], [w / 4 - 10, 10], [10, h / 2 - 10], [w / 4 - 10, h / 2 - 10]]) { g.fillStyle = 'rgba(230,236,246,0.7)'; g.beginPath(); g.arc(X + dx, Y + dy, 3, 0, 7); g.fill(); } }
      for (let i = 0; i < 16; i++) { g.fillStyle = i % 2 ? '#ffd23c' : '#1a1d26'; g.fillRect(0, i * h / 16, w * 0.04, h / 16); g.fillRect(w * 0.96, i * h / 16, w * 0.04, h / 16); }
    }, { aniso: 16 }) };
    case 'neon': return { tile: 12, roughness: 0.25, metalness: 0.5, emissive: 0xffffff, emissiveIntensity: 1.6, map: canvasTex(512, 512, (g, w, h) => {
      g.fillStyle = '#141826'; g.fillRect(0, 0, w, h);
      g.strokeStyle = 'rgba(80,110,170,0.35)'; g.lineWidth = 2; for (let i = 0; i <= 8; i++) { g.beginPath(); g.moveTo(i * w / 8, 0); g.lineTo(i * w / 8, h); g.stroke(); g.beginPath(); g.moveTo(0, i * h / 8); g.lineTo(w, i * h / 8); g.stroke(); }
    }, { aniso: 16 }), emissiveMap: canvasTex(512, 512, (g, w, h) => {
      g.fillStyle = '#000'; g.fillRect(0, 0, w, h);
      const c = '#' + (style.glow ?? 0x35e0ff).toString(16).padStart(6, '0');
      g.fillStyle = c; g.fillRect(w * 0.03, 0, w * 0.022, h); g.fillRect(w * 0.948, 0, w * 0.022, h);
      g.globalAlpha = 0.8; for (let i = 0; i < 2; i++) { const y = i * h / 2 + h * 0.1; g.beginPath(); g.moveTo(w * 0.44, y + h * 0.12); g.lineTo(w * 0.5, y); g.lineTo(w * 0.56, y + h * 0.12); g.lineTo(w * 0.53, y + h * 0.12); g.lineTo(w * 0.5, y + h * 0.05); g.lineTo(w * 0.47, y + h * 0.12); g.closePath(); g.fill(); }
    }, { aniso: 16 }) };
    case 'glass': { // the rainbow road: glowing bands under glass
      const map = canvasTex(512, 256, (g, w, h) => {
        const gr = g.createLinearGradient(0, 0, w, 0); const cols = ['#ff3d6e', '#ff9a3c', '#ffe14a', '#4be38a', '#3cc8ff', '#7a6bff', '#e05cff'];
        cols.forEach((c, i) => gr.addColorStop(i / (cols.length - 1), c)); g.fillStyle = gr; g.fillRect(0, 0, w, h);
        g.fillStyle = 'rgba(255,255,255,0.28)'; for (let i = 0; i < 4; i++) g.fillRect(0, i * h / 4, w, 3);
        g.fillStyle = 'rgba(255,255,255,0.9)'; g.fillRect(0, 0, w * 0.03, h); g.fillRect(w * 0.97, 0, w * 0.03, h);
        for (let i = 0; i < 50; i++) { g.fillStyle = `rgba(255,255,255,${0.2 + Math.random() * 0.5})`; g.fillRect(Math.random() * w, Math.random() * h, 3, 3); }
      }, { aniso: 16 });
      return { tile: 10, roughness: 0.1, metalness: 0.2, map, emissiveMap: map, emissive: 0xffffff, emissiveIntensity: 0.85, transparent: true, opacity: 0.9 };
    }
    case 'snow': case 'ice': return { tile: 16, roughness: name === 'ice' ? 0.06 : 0.9, metalness: name === 'ice' ? 0.3 : 0, envMapIntensity: name === 'ice' ? 1.6 : 0.5, map: canvasTex(512, 512, (g, w, h) => {
      const rng = rngOf(61); g.fillStyle = name === 'ice' ? '#bfe6f7' : '#f1f5fa'; g.fillRect(0, 0, w, h);
      for (let i = 0; i < 60; i++) { g.strokeStyle = `rgba(${name === 'ice' ? '255,255,255' : '150,170,200'},${0.15 + rng() * 0.25})`; g.lineWidth = 1 + rng() * 2; g.beginPath(); const x = rng() * w, y = rng() * h; g.moveTo(x, y); g.lineTo(x + (rng() - 0.5) * 160, y + (rng() - 0.5) * 160); g.stroke(); }
      lines(g, w, h, name === 'ice' ? 'rgba(40,120,200,0.8)' : 'rgba(230,60,60,0.85)');
    }, { aniso: 16 }) };
    case 'stone': case 'cobble': return { tile: 9, roughness: 0.8, map: canvasTex(512, 512, (g, w, h) => {
      const rng = rngOf(71), nx = name === 'cobble' ? 10 : 5, ny = name === 'cobble' ? 10 : 5; g.fillStyle = '#8f8a84'; g.fillRect(0, 0, w, h);
      for (let y = 0; y < ny; y++) for (let x = 0; x < nx; x++) { const t = 0.8 + rng() * 0.3, ox = (y % 2) * (w / nx / 2); g.fillStyle = name === 'cobble' ? `rgb(${Math.round(150 * t)},${Math.round(140 * t)},${Math.round(130 * t)})` : `rgb(${Math.round(226 * t)},${Math.round(220 * t)},${Math.round(208 * t)})`; g.beginPath(); g.roundRect(((x * w / nx + ox) % w) + 2, y * h / ny + 2, w / nx - 4, h / ny - 4, name === 'cobble' ? 9 : 3); g.fill(); }
    }, { aniso: 16 }) };
    case 'carpet': return { tile: 12, roughness: 1, map: canvasTex(256, 256, (g, w, h) => {
      const rng = rngOf(81); g.fillStyle = '#b3122a'; g.fillRect(0, 0, w, h);
      for (let i = 0; i < 4000; i++) { g.fillStyle = `rgba(${rng() < 0.5 ? '255,120,140' : '60,0,10'},0.12)`; g.fillRect(rng() * w, rng() * h, 2, 2); }
      g.fillStyle = '#f2c94c'; g.fillRect(w * 0.04, 0, w * 0.03, h); g.fillRect(w * 0.93, 0, w * 0.03, h);
    }, { aniso: 16 }) };
    default: return { tile: style.tile ?? 18, roughness: style.roughness ?? 0.82, map: roadTexture(style) };
  }
}
export const ROAD_SKINS = ['asphalt', 'wood', 'sand', 'dirt', 'metal', 'neon', 'glass', 'snow', 'ice', 'stone', 'cobble', 'carpet'];
