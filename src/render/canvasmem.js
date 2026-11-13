/* Canvas memory. Safari on iPhone and iPad caps the TOTAL backing-store memory of every canvas on the page
   ("Total canvas memory use exceeds the maximum limit") and paints any canvas made past the cap blank. Tracks draw
   their signs and surfaces onto canvases, and several props keep those textures in module caches, so without help
   every track visited in a session stays alive: a four-race cup passes the cap and later textures come up blank.

   releaseCanvases(root) runs when a race is torn down. Each large canvas texture under `root` gets a bitmap copy,
   its GPU copy is freed, and the canvas shrinks to 1x1. A bitmap is not canvas memory. If anything reads the
   texture's image again (a cached texture reused by a later race, or the renderer re-uploading after a lost
   context) the canvas grows back and the bitmap is drawn onto it first, so nothing is ever blank. */
const KEYS = ['map', 'emissiveMap', 'alphaMap', 'bumpMap', 'normalMap', 'roughnessMap', 'metalnessMap', 'aoMap', 'lightMap', 'displacementMap', 'specularMap', 'gradientMap'];
const states = new WeakMap();   // Source -> { canvas, w, h, bmp, released }

function textures(root) {
  const out = new Set();
  const add = t => { if (t && t.isTexture) out.add(t); };
  root.traverse(o => {
    for (const m of [].concat(o.material || [])) {
      for (const k of KEYS) add(m[k]);
      if (m.uniforms) for (const u of Object.values(m.uniforms)) add(u?.value);
    }
  });
  return out;
}

function restore(st) {
  const { canvas, w, h, bmp } = st;
  st.released = false;
  canvas.width = w; canvas.height = h;
  const g = canvas.getContext('2d');
  if (bmp && g) g.drawImage(bmp, 0, 0);
}

function install(src, st) {
  Object.defineProperty(src, 'data', {
    configurable: true, enumerable: true,
    get() { if (st.released) restore(st); return st.canvas; },
    set(v) { Object.defineProperty(src, 'data', { value: v, writable: true, configurable: true, enumerable: true }); states.delete(src); st.bmp?.close?.(); },
  });
}

function release(tex, minPx) {
  const src = tex.source, c = src.data;
  const known = states.get(src);
  if (known?.released) return;
  if (!known && (typeof HTMLCanvasElement === 'undefined' || !(c instanceof HTMLCanvasElement) || c.width * c.height < minPx)) return;
  const st = known || { canvas: c, w: c.width, h: c.height, bmp: null, released: false };
  if (known) { st.w = c.width; st.h = c.height; }
  createImageBitmap(c).then(bmp => {
    if (st.released || (states.get(src) && states.get(src) !== st)) { bmp.close?.(); return; }
    st.bmp?.close?.(); st.bmp = bmp;
    tex.dispose();                       // free the GPU copy first, so nothing reads the image while it shrinks
    st.canvas.width = 1; st.canvas.height = 1;
    st.released = true;
    if (!known) { states.set(src, st); install(src, st); }
  }).catch(() => { /* leave the canvas as it was */ });
}

/** Free the canvas memory behind every large canvas texture under `root`; they come back on demand. */
export function releaseCanvases(root, minPx = 32768) {
  try { for (const t of textures(root)) release(t, minPx); } catch { /* memory housekeeping must never break a race */ }
}
