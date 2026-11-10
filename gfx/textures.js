/* Billionaire Kart — gfx/textures.js
 * Procedural canvas textures: zero downloads, PWA-offline-safe, tiny footprint.
 * Every factory returns THREE.CanvasTexture(s) with RepeatWrapping, sRGB colour
 * space on colour maps, and configurable repeat + anisotropy.
 *
 * Textures are CACHED by key at module level — calling a factory twice with the
 * same parameters returns the same texture instance. Cached textures are SHARED:
 * game.js's buildWorld() teardown disposes material maps, so integration must
 * skip textures flagged `tex.userData.shared === true` (see GRAPHICS.md §6).
 */
import * as THREE from 'three';

/* ------------------------------------------------------------------ utils */

// Deterministic PRNG so the art looks identical on every machine / test run.
function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const cache = new Map();

function makeCanvas(w, h, draw) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  return c;
}

function toTexture(canvas, { srgb = true, repeat = 1, aniso = 8 } = {}) {
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  if (srgb) tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = aniso;
  if (repeat !== 1) tex.repeat.set(repeat, repeat);
  tex.userData.shared = true;
  return tex;
}

/** Set a texture's repeat (returns the texture for chaining). */
export function setRepeat(tex, rx, ry = rx) {
  tex.repeat.set(rx, ry);
  tex.needsUpdate = true;
  return tex;
}

function cached(key, build) {
  if (!cache.has(key)) cache.set(key, build());
  return cache.get(key);
}

/** Fill a canvas with value-noise speckle. `alpha` range per speck. */
function speckle(g, w, h, rand, count, size, light, dark, aMax) {
  for (let i = 0; i < count; i++) {
    const v = rand() > 0.5 ? light : dark;
    g.fillStyle = `rgba(${v},${(rand() * aMax).toFixed(3)})`;
    g.fillRect(rand() * w, rand() * h, size * (0.5 + rand()), size * (0.5 + rand()));
  }
}

/* ---------------------------------------------------------------- asphalt */

/**
 * Road asphalt set: colour map + matching roughnessMap + bumpMap.
 * Dark base, aggregate speckle, two darker wheel-wear bands, hairline cracks,
 * faint tar seams. Tileable. Use repeat ~ (1, length/width) along a road strip.
 * @returns {{map: THREE.Texture, roughnessMap: THREE.Texture, bumpMap: THREE.Texture}}
 */
export function asphaltTextures({ size = 512, seed = 1337, repeat = 1, aniso = 8 } = {}) {
  return cached(`asphalt:${size}:${seed}`, () => {
    const rand = mulberry32(seed);
    // --- colour ---
    const mapC = makeCanvas(size, size, (g, w, h) => {
      g.fillStyle = '#33363d'; g.fillRect(0, 0, w, h);
      // large soft tonal patches (patched / aged tarmac)
      for (let i = 0; i < 26; i++) {
        const x = rand() * w, y = rand() * h, r = 40 + rand() * 130;
        const gr = g.createRadialGradient(x, y, 0, x, y, r);
        const tone = rand() > 0.5 ? '255,255,255' : '0,0,0';
        gr.addColorStop(0, `rgba(${tone},${0.05 + rand() * 0.05})`);
        gr.addColorStop(1, `rgba(${tone},0)`);
        g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill();
      }
      speckle(g, w, h, rand, 5200, 2, '235,238,245', '5,6,10', 0.13);
      // wheel-wear bands: darker polished strips where tyres run (v axis = travel)
      for (const fx of [0.28, 0.72]) {
        const x = fx * w;
        const gr = g.createLinearGradient(x - w * 0.11, 0, x + w * 0.11, 0);
        gr.addColorStop(0, 'rgba(0,0,0,0)');
        gr.addColorStop(0.5, 'rgba(0,0,0,0.20)');
        gr.addColorStop(1, 'rgba(0,0,0,0)');
        g.fillStyle = gr; g.fillRect(x - w * 0.11, 0, w * 0.22, h);
      }
      // tar seams (straight, tile-safe: drawn at fixed fractions)
      g.fillStyle = 'rgba(12,13,16,0.55)';
      g.fillRect(0, h * 0.5 - 2, w, 4);
      // hairline cracks: random walks
      g.strokeStyle = 'rgba(10,10,14,0.5)'; g.lineWidth = 1.2;
      for (let i = 0; i < 7; i++) {
        let x = rand() * w, y = rand() * h;
        g.beginPath(); g.moveTo(x, y);
        for (let s = 0; s < 9; s++) { x += (rand() - 0.5) * 46; y += rand() * 30; g.lineTo(x, y); }
        g.stroke();
      }
    });
    // --- roughness (derived from same seed: wear bands are smoother/shinier) ---
    const rghC = makeCanvas(size, size, (g, w, h) => {
      const r2 = mulberry32(seed);
      g.fillStyle = '#c8c8c8'; g.fillRect(0, 0, w, h); // rough overall
      speckle(g, w, h, r2, 2600, 2, '255,255,255', '90,90,90', 0.25);
      for (const fx of [0.28, 0.72]) { // polished wheel bands = lower roughness
        const x = fx * w;
        const gr = g.createLinearGradient(x - w * 0.11, 0, x + w * 0.11, 0);
        gr.addColorStop(0, 'rgba(70,70,70,0)');
        gr.addColorStop(0.5, 'rgba(70,70,70,0.75)');
        gr.addColorStop(1, 'rgba(70,70,70,0)');
        g.fillStyle = gr; g.fillRect(x - w * 0.11, 0, w * 0.22, h);
      }
    });
    // --- bump: reuse colour canvas luminance via a grayscale redraw ---
    const bmpC = makeCanvas(size, size, (g, w, h) => {
      g.fillStyle = '#808080'; g.fillRect(0, 0, w, h);
      g.globalAlpha = 0.85; g.drawImage(mapC, 0, 0);
      g.globalAlpha = 1;
    });
    const opts = { repeat, aniso };
    return {
      map: toTexture(mapC, opts),
      roughnessMap: toTexture(rghC, { ...opts, srgb: false }),
      bumpMap: toTexture(bmpC, { ...opts, srgb: false }),
    };
  });
}

/** Convenience: just the asphalt colour map. */
export function asphaltTexture(opts = {}) { return asphaltTextures(opts).map; }

/* ------------------------------------------------------------------ grass */

/** Grass: layered green noise + blade strokes + dry patches. Tileable. */
export function grassTexture({ size = 512, seed = 777, repeat = 1, aniso = 8, base = '#4a7d33' } = {}) {
  return cached(`grass:${size}:${seed}:${base}`, () => {
    const rand = mulberry32(seed);
    const c = makeCanvas(size, size, (g, w, h) => {
      g.fillStyle = base; g.fillRect(0, 0, w, h);
      for (let i = 0; i < 30; i++) { // tonal patches
        const x = rand() * w, y = rand() * h, r = 30 + rand() * 110;
        const gr = g.createRadialGradient(x, y, 0, x, y, r);
        const dry = rand() > 0.72;
        const tone = dry ? '196,178,110' : (rand() > 0.5 ? '30,80,25' : '110,160,70');
        gr.addColorStop(0, `rgba(${tone},${0.10 + rand() * 0.14})`);
        gr.addColorStop(1, `rgba(${tone},0)`);
        g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill();
      }
      // blade strokes
      g.lineWidth = 1.4;
      for (let i = 0; i < 2600; i++) {
        const x = rand() * w, y = rand() * h, l = 4 + rand() * 6;
        const tone = ['#5c9440', '#3c6b29', '#6fae4c', '#2f5a21'][Math.floor(rand() * 4)];
        g.strokeStyle = tone; g.globalAlpha = 0.5 + rand() * 0.5;
        g.beginPath(); g.moveTo(x, y); g.lineTo(x + (rand() - 0.5) * 3, y - l); g.stroke();
      }
      g.globalAlpha = 1;
    });
    return toTexture(c, { repeat, aniso });
  });
}

/* ------------------------------------------------------------- dirt / sand */

/**
 * Dirt / sand. `tint:'mars'` gives rusty regolith with darker basalt flecks
 * and wind streaks. Tileable.
 */
export function sandTexture({ size = 512, seed = 4242, repeat = 1, aniso = 8, tint = 'sand' } = {}) {
  return cached(`sand:${size}:${seed}:${tint}`, () => {
    const rand = mulberry32(seed);
    const mars = tint === 'mars';
    const c = makeCanvas(size, size, (g, w, h) => {
      g.fillStyle = mars ? '#9c4f2a' : '#c2a878'; g.fillRect(0, 0, w, h);
      for (let i = 0; i < 22; i++) {
        const x = rand() * w, y = rand() * h, r = 40 + rand() * 140;
        const gr = g.createRadialGradient(x, y, 0, x, y, r);
        const tone = mars ? (rand() > 0.5 ? '214,120,66' : '90,44,24') : (rand() > 0.5 ? '226,206,160' : '150,124,86');
        gr.addColorStop(0, `rgba(${tone},${0.10 + rand() * 0.12})`);
        gr.addColorStop(1, `rgba(${tone},0)`);
        g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill();
      }
      // wind streaks (horizontal smears)
      for (let i = 0; i < 60; i++) {
        const y = rand() * h, x = rand() * w, l = 30 + rand() * 90;
        g.fillStyle = `rgba(${mars ? '60,28,14' : '120,100,66'},${0.05 + rand() * 0.08})`;
        g.fillRect(x, y, l, 1.5 + rand() * 2);
      }
      speckle(g, w, h, rand, 3800, 2, mars ? '240,170,120' : '245,235,205', mars ? '40,18,10' : '90,74,48', 0.16);
      // pebbles
      for (let i = 0; i < 90; i++) {
        const x = rand() * w, y = rand() * h, r = 1.5 + rand() * 3.5;
        g.fillStyle = mars ? 'rgba(70,34,20,0.8)' : 'rgba(110,95,70,0.8)';
        g.beginPath(); g.arc(x, y, r, 0, 7); g.fill();
        g.fillStyle = 'rgba(255,255,255,0.18)';
        g.beginPath(); g.arc(x - r * 0.3, y - r * 0.3, r * 0.5, 0, 7); g.fill();
      }
    });
    return toTexture(c, { repeat, aniso });
  });
}

/** Alias matching the deliverable wording. */
export const dirtTexture = sandTexture;

/* ------------------------------------------------------------ metal panels */

/** Brushed metal panels with seams, rivets and light scuffing. Tileable 2×2 panels per tile. */
export function metalPanelsTexture({ size = 512, seed = 99, repeat = 1, aniso = 8, base = '#8d97a3' } = {}) {
  return cached(`metal:${size}:${seed}:${base}`, () => {
    const rand = mulberry32(seed);
    const c = makeCanvas(size, size, (g, w, h) => {
      g.fillStyle = base; g.fillRect(0, 0, w, h);
      // brushed streaks
      for (let i = 0; i < 900; i++) {
        const y = rand() * h;
        g.fillStyle = `rgba(${rand() > 0.5 ? '255,255,255' : '20,26,34'},${0.03 + rand() * 0.05})`;
        g.fillRect(0, y, w, 1);
      }
      speckle(g, w, h, rand, 500, 2, '230,238,245', '30,36,44', 0.10);
      // panel seams (2×2 grid, wraps cleanly)
      g.fillStyle = 'rgba(18,22,28,0.85)';
      g.fillRect(0, 0, w, 3); g.fillRect(0, h / 2, w, 3); g.fillRect(0, 0, 3, h); g.fillRect(w / 2, 0, 3, h);
      g.fillStyle = 'rgba(255,255,255,0.22)';
      g.fillRect(0, 3, w, 1); g.fillRect(0, h / 2 + 3, w, 1); g.fillRect(3, 0, 1, h); g.fillRect(w / 2 + 3, 0, 1, h);
      // rivets near seams
      g.fillStyle = '#5a636e';
      const off = 14, step = w / 4;
      for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) {
        for (const [rx, ry] of [[i * step + off, j * step + off], [i * step + step - off, j * step + off], [i * step + off, j * step + step - off], [i * step + step - off, j * step + step - off]]) {
          g.beginPath(); g.arc(rx % w, ry % h, 3, 0, 7); g.fill();
          g.fillStyle = 'rgba(255,255,255,0.35)'; g.beginPath(); g.arc(rx % w - 1, (ry % h) - 1, 1.2, 0, 7); g.fill();
          g.fillStyle = '#5a636e';
        }
      }
    });
    return toTexture(c, { repeat, aniso });
  });
}

/* ------------------------------------------------------------ carbon fibre */

/** 2×2 twill carbon-fibre weave. Very small tile — repeat it a lot. */
export function carbonFibreTexture({ size = 256, repeat = 6, aniso = 8 } = {}) {
  return cached(`carbon:${size}`, () => {
    const cell = size / 8;
    const c = makeCanvas(size, size, (g, w, h) => {
      g.fillStyle = '#0c0d10'; g.fillRect(0, 0, w, h);
      for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) {
        const horiz = (x + y) % 2 === 0;
        const gr = horiz
          ? g.createLinearGradient(x * cell, y * cell, x * cell, (y + 1) * cell)
          : g.createLinearGradient(x * cell, y * cell, (x + 1) * cell, y * cell);
        gr.addColorStop(0, '#17191d'); gr.addColorStop(0.5, '#3a3f47'); gr.addColorStop(1, '#101216');
        g.fillStyle = gr;
        g.fillRect(x * cell + 0.5, y * cell + 0.5, cell - 1, cell - 1);
      }
    });
    return toTexture(c, { repeat, aniso });
  });
}

/* ------------------------------------------------------- marble / concrete */

/** Polished marble: soft white-grey field with wandering veins. For White House GP / podiums. */
export function marbleTexture({ size = 512, seed = 31, repeat = 1, aniso = 8 } = {}) {
  return cached(`marble:${size}:${seed}`, () => {
    const rand = mulberry32(seed);
    const c = makeCanvas(size, size, (g, w, h) => {
      g.fillStyle = '#e8e6e1'; g.fillRect(0, 0, w, h);
      for (let i = 0; i < 18; i++) {
        const x = rand() * w, y = rand() * h, r = 60 + rand() * 160;
        const gr = g.createRadialGradient(x, y, 0, x, y, r);
        gr.addColorStop(0, `rgba(178,176,170,${0.08 + rand() * 0.10})`);
        gr.addColorStop(1, 'rgba(178,176,170,0)');
        g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill();
      }
      // veins: long jittery walks, two weights
      for (const [n, lw, col] of [[9, 1.6, 'rgba(105,108,118,0.55)'], [16, 0.7, 'rgba(140,143,152,0.4)']]) {
        g.strokeStyle = col; g.lineWidth = lw;
        for (let i = 0; i < n; i++) {
          let x = rand() * w, y = -10;
          g.beginPath(); g.moveTo(x, y);
          while (y < h + 10) { y += 14 + rand() * 26; x += (rand() - 0.5) * 30; g.lineTo(x, y); }
          g.stroke();
        }
      }
    });
    return toTexture(c, { repeat, aniso });
  });
}

/** Weathered concrete: grey noise, stains, form-work lines. */
export function concreteTexture({ size = 512, seed = 55, repeat = 1, aniso = 8 } = {}) {
  return cached(`concrete:${size}:${seed}`, () => {
    const rand = mulberry32(seed);
    const c = makeCanvas(size, size, (g, w, h) => {
      g.fillStyle = '#9a9a97'; g.fillRect(0, 0, w, h);
      speckle(g, w, h, rand, 6000, 2, '225,225,220', '52,52,50', 0.12);
      for (let i = 0; i < 12; i++) { // water stains dripping down
        const x = rand() * w, len = 60 + rand() * 180, wd = 6 + rand() * 22;
        const gr = g.createLinearGradient(0, 0, 0, len);
        gr.addColorStop(0, 'rgba(60,58,52,0.28)'); gr.addColorStop(1, 'rgba(60,58,52,0)');
        g.fillStyle = gr;
        g.save(); g.translate(x, rand() * h * 0.5); g.fillRect(-wd / 2, 0, wd, len); g.restore();
      }
      g.fillStyle = 'rgba(50,50,48,0.5)';
      g.fillRect(0, h / 2 - 1, w, 2); g.fillRect(w / 2 - 1, 0, 2, h); // form-work joints
    });
    return toTexture(c, { repeat, aniso });
  });
}

/* -------------------------------------------------------------- tire tread */

/** Chunky kart tire tread — use as bumpMap on the wheel cylinder side. */
export function tireTreadTexture({ size = 256, repeat = 1, aniso = 4 } = {}) {
  return cached(`tread:${size}`, () => {
    const c = makeCanvas(size, size, (g, w, h) => {
      g.fillStyle = '#17181c'; g.fillRect(0, 0, w, h);
      const rows = 8, rh = h / rows;
      for (let r = 0; r < rows; r++) {
        const y = r * rh, flip = r % 2 === 0;
        g.fillStyle = '#26282f';
        // chevron blocks
        g.save(); g.translate(w / 2, y + rh / 2); g.rotate(flip ? 0.5 : -0.5);
        g.fillRect(-w * 0.30, -rh * 0.26, w * 0.26, rh * 0.52);
        g.fillRect(w * 0.04, -rh * 0.26, w * 0.26, rh * 0.52);
        g.restore();
        g.fillStyle = 'rgba(0,0,0,0.6)'; g.fillRect(0, y, w, 2); // groove
      }
      const rand = mulberry32(7);
      speckle(g, w, h, rand, 500, 1.5, '200,200,205', '0,0,0', 0.10);
    });
    const tex = toTexture(c, { repeat, aniso, srgb: false });
    return tex;
  });
}

/* ---------------------------------------------------------------- sprites */

/** Soft round particle sprite (radial gradient) — boost flames, smoke, sparks, drift puffs. */
export function particleSprite({ size = 128 } = {}) {
  return cached(`particle:${size}`, () => {
    const c = makeCanvas(size, size, (g, w, h) => {
      const gr = g.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
      gr.addColorStop(0, 'rgba(255,255,255,1)');
      gr.addColorStop(0.35, 'rgba(255,255,255,0.75)');
      gr.addColorStop(0.7, 'rgba(255,255,255,0.22)');
      gr.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = gr; g.fillRect(0, 0, w, h);
    });
    const tex = toTexture(c, {});
    tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
    return tex;
  });
}

/** Puffy cloud sprite: cluster of soft blobs, alpha-feathered edges. */
export function cloudSprite({ size = 256, seed = 12 } = {}) {
  return cached(`cloud:${size}:${seed}`, () => {
    const rand = mulberry32(seed);
    const c = makeCanvas(size, size, (g, w, h) => {
      const blobs = 16;
      for (let i = 0; i < blobs; i++) {
        const x = w * (0.22 + rand() * 0.56), y = h * (0.38 + rand() * 0.26);
        const r = size * (0.10 + rand() * 0.15);
        const gr = g.createRadialGradient(x, y, 0, x, y, r);
        gr.addColorStop(0, 'rgba(255,255,255,0.55)');
        gr.addColorStop(1, 'rgba(255,255,255,0)');
        g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill();
      }
      // flatten the base a touch (clouds sit on an invisible shelf)
      const gr = g.createLinearGradient(0, h * 0.55, 0, h * 0.85);
      gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(0,0,0,0.18)');
      g.globalCompositeOperation = 'source-atop';
      g.fillStyle = gr; g.fillRect(0, 0, w, h);
      g.globalCompositeOperation = 'source-over';
    });
    const tex = toTexture(c, {});
    tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
    return tex;
  });
}

/* ------------------------------------------------------------------- water */

/** Tileable water noise (linear space) — used as the moving map/bump for waterMaterial(). */
export function waterNoiseTexture({ size = 256, seed = 2024, repeat = 1, aniso = 4 } = {}) {
  return cached(`water:${size}:${seed}`, () => {
    const rand = mulberry32(seed);
    const c = makeCanvas(size, size, (g, w, h) => {
      g.fillStyle = '#7f8c99'; g.fillRect(0, 0, w, h);
      for (let i = 0; i < 260; i++) { // overlapping soft ripples
        const x = rand() * w, y = rand() * h, r = 8 + rand() * 30;
        const gr = g.createRadialGradient(x, y, 0, x, y, r);
        const tone = rand() > 0.5 ? '235,242,248' : '52,64,78';
        gr.addColorStop(0, `rgba(${tone},${0.05 + rand() * 0.09})`);
        gr.addColorStop(1, `rgba(${tone},0)`);
        g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill();
      }
    });
    return toTexture(c, { repeat, aniso, srgb: false });
  });
}

/** Drop the whole texture cache (rarely needed; textures are small). */
export function disposeTextureCache() {
  for (const v of cache.values()) {
    if (v && v.isTexture) v.dispose();
    else if (v) for (const t of Object.values(v)) if (t && t.isTexture) t.dispose();
  }
  cache.clear();
}
