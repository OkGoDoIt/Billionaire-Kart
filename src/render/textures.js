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
      for (const ox of [-w, 0, w]) for (const oy of [-h, 0, h]) g.fillRect(x - r + ox, y - r + oy, r * 2, r * 2);
    }
    speckle(g, w, h, rng, 2400, ['#ffffff', '#9a9a9a'], 1, 2, contrast * 1.2);
  }, { aniso: 4 });
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

/** Sponsor hoarding strip: a row of satirical ad boards. Returns a texture 8:1. */
export function bannerTexture(ads, seed = 1) {
  const pal = [['#ffd23c', '#1a1d29'], ['#ff4d6d', '#ffffff'], ['#22c1c3', '#0b2239'], ['#ffffff', '#e23b3b'], ['#7b5cff', '#ffffff'], ['#16a34a', '#ffffff'], ['#1a1d29', '#ffd23c'], ['#ff8a00', '#1a1d29']];
  return canvasTex(2048, 128, (g, w, h) => {
    const rng = makeRng(seed), n = 4, bw = w / n;
    for (let i = 0; i < n; i++) {
      const [bg, fg] = pal[Math.floor(rng() * pal.length)];
      g.fillStyle = bg; g.fillRect(i * bw, 0, bw, h);
      g.fillStyle = 'rgba(0,0,0,0.12)'; g.fillRect(i * bw, h - 10, bw, 10);
      g.fillStyle = 'rgba(255,255,255,0.14)'; g.fillRect(i * bw, 0, bw, 6);
      g.fillStyle = fg; g.textAlign = 'center'; g.textBaseline = 'middle';
      const text = ads[Math.floor(rng() * ads.length)];
      let size = 74; g.font = `${size}px "Luckiest Guy", "Arial Black", sans-serif`;
      while (g.measureText(text).width > bw - 40 && size > 20) { size -= 4; g.font = `${size}px "Luckiest Guy", "Arial Black", sans-serif`; }
      g.fillText(text, i * bw + bw / 2, h / 2 + 4);
      g.fillStyle = 'rgba(0,0,0,0.25)'; g.fillRect(i * bw + bw - 3, 0, 3, h);
    }
  }, { aniso: 8 });
}

export const DEFAULT_ADS = [
  'AGI™ SOON', 'GPU GO BRRR', 'PIVOT!', 'SERIES Z', 'NOT FINANCIAL ADVICE', 'MOVE FAST', 'DISRUPT', 'SYNERGY',
  'YOUR DATA HERE', 'MARS OR BUST', '10X EVERYTHING', 'BURN RATE', 'STEALTH MODE', 'WE ARE HIRING', 'TOKENS!', 'UNICORN FUEL',
  'ZERO TO ONE', 'DAY ONE', 'THOUGHT LEADER', 'HYPERSCALE', 'RUNWAY: 3 LAPS', 'DOWN ROUND', 'TOO BIG TO FAIL', 'INNOVATE',
];
