/* How the screen is shared between local players. Every grid that seats everyone (one row, one column, two by
   two, ...) is scored by how much screen each player gets and how close each pane is to a good chase-camera shape,
   and the best one wins. So two players sit side by side on a wide window and stacked on a squarer or upright one,
   three players get three columns on an ultrawide, three rows on an upright tablet and two by two elsewhere, and so on.
   Pure arithmetic: tools/split-layout-check.mjs pins the choices for the screen shapes that matter. */

/** The pane shape the chase camera frames best (width / height). Wider panes are letterboxed strips, narrower ones are slots. */
export const IDEAL_ASPECT = 1.5;
/** A layout already on screen stays until another one is this much better, so a window dragged across a threshold does not flicker. */
const STICKY = 1.1;
/** Dark gap between panes, in CSS pixels. */
export const SPLIT_GAP = 4;

/** Every column count that seats n players without leaving a whole row or column empty. */
function grids(n) {
  const out = [];
  for (let cols = 1; cols <= n; cols++) {
    const rows = Math.ceil(n / cols), empty = cols * rows - n;
    if (empty < cols && empty < rows) out.push({ cols, rows });
  }
  return out;
}

function score({ cols, rows }, W, H, gap) {
  const pw = (W - gap * (cols - 1)) / cols, ph = (H - gap * (rows - 1)) / rows;
  if (pw <= 0 || ph <= 0) return 0;
  const share = (pw * ph) / (W * H), off = Math.log(pw / ph / IDEAL_ASPECT);
  return share * Math.exp(-off * off);
}

/**
 * n players on a W x H (CSS pixel) screen. prev: the previous result, to keep it while it is nearly as good.
 * Returns { cols, rows, rects, spare }: rects[i] is player i's pane and spare lists cells nobody sits in, each as
 * [x, y, w, h] fractions of the screen with y measured from the bottom (the renderer's convention). Players read
 * left to right, top to bottom, so player one is always top left.
 */
export function splitLayout(n, W, H, { gap = SPLIT_GAP, prev = null } = {}) {
  W = Math.max(1, W); H = Math.max(1, H);
  if (n <= 1) return { cols: 1, rows: 1, rects: [[0, 0, 1, 1]], spare: [] };
  gap = Math.min(gap, W / (4 * n), H / (4 * n));   // a tiny window keeps its picture
  let best = null, bestScore = -1;
  for (const g of grids(n)) { const s = score(g, W, H, gap); if (s > bestScore) { best = g; bestScore = s; } }
  if (prev && prev.n === n && grids(n).some(g => g.cols === prev.cols && g.rows === prev.rows) && score(prev, W, H, gap) * STICKY >= bestScore) best = prev;
  const { cols, rows } = best;
  const pw = (W - gap * (cols - 1)) / cols, ph = (H - gap * (rows - 1)) / rows;
  const cell = i => { const c = i % cols, r = Math.floor(i / cols); return [c * (pw + gap) / W, (rows - 1 - r) * (ph + gap) / H, pw / W, ph / H]; };
  const rects = [], spare = [];
  for (let i = 0; i < cols * rows; i++) (i < n ? rects : spare).push(cell(i));
  return { n, cols, rows, rects, spare };
}
