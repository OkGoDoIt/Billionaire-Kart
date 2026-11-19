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

/** A pane's HUD unit in CSS px, as styles/hud.css defines --u: 1% of the pane's height, or of its width as if it were 16:9. */
export const paneUnit = (pw, ph) => Math.min(ph / 100, 0.5625 * pw / 100);

/** The smallest the shared field map gets, in CSS px (four players on a phone): any smaller and the track and its dots stop reading. */
export const HUB_MIN = 96;

/**
 * Three or four players with no spare cell for the board share one field map and one race clock, the way Mario Kart
 * puts a single map in the middle of a split screen instead of one in every pane. It sits where the panes meet: on a
 * two-by-two grid, on the centre junction; between rows, on the middle seam at its right-hand end; between columns, on
 * the middle seam at its foot. The ends of a seam are roadside, away from the road ahead, and the corner readouts there
 * make way for it (hubClearance). L is a splitLayout result for a W x H screen.
 * Returns null when there is a spare cell (the board goes there) or fewer than three players. Otherwise
 * { kind: 'junction' | 'rows' | 'columns', d: map size, clock: clock text size, pill: clock pill height, edge: margin,
 *   W, H, box: [left, top, right, bottom] }, all in CSS px from the screen's top left. A hub that touches a screen edge
 * sits inside that edge's safe-area inset (hud.js), as does every HUD block it is measured against.
 */
export function fieldHub(L, W, H) {
  if (!L || L.rects.length < 3 || L.spare.length) return null;
  const R = L.rects, pw = R[0][2] * W, ph = R[0][3] * H, u = paneUnit(pw, ph);
  const d = Math.round(Math.min(Math.max(HUB_MIN, u * 34), ph * 0.62, pw * 0.42));
  const clock = Math.round(Math.max(12, Math.min(d * 0.15, u * 4.4))), pill = Math.round(clock * 1.5);
  const edge = Math.max(u * 2.4, Math.min(10, u * 3));   // the HUD's own corner margin (--edge)
  const w = d, h = d + pill / 2;                         // the clock pill straddles the map's lower edge
  const top = i => H * (1 - R[i][1] - R[i][3]), bottom = i => H * (1 - R[i][1]), left = i => W * R[i][0], right = i => W * (R[i][0] + R[i][2]);
  let kind, cx, cy;
  if (L.cols === 2 && L.rows === 2) { kind = 'junction'; cx = (right(0) + left(1)) / 2; cy = (bottom(0) + top(2)) / 2; }
  else if (L.cols === 1) { const k = L.rows >> 1; kind = 'rows'; cx = W - edge - w / 2; cy = (bottom(k - 1) + top(k)) / 2; }
  else { const k = L.cols >> 1; kind = 'columns'; cx = (right(k - 1) + left(k)) / 2; cy = H - edge - h / 2; }
  return { kind, d, clock, pill, edge, W, H, box: [cx - w / 2, cy - h / 2, cx + w / 2, cy + h / 2] };
}

/**
 * How far each pane's corner readouts move along the seam to clear the hub: per pane { tl, tr, bl, br } in CSS px.
 * The item slot, coins and lap, position, and speed (with the timer) sit in a band along the top and bottom of the
 * pane; a hub reaching into a band pushes the readout in the nearer corner past it, with a margin. ty is how far the
 * hub reaches down into the top band, for a minimap that stays in its corner and drops below the hub instead.
 */
export function hubClearance(L, W, H, hub) {
  return L.rects.map(([x, y, w, h]) => {
    const c = { tl: 0, tr: 0, bl: 0, br: 0, ty: 0 };
    if (!hub) return c;
    const l = x * W, r = (x + w) * W, t = (1 - y - h) * H, b = (1 - y) * H, u = paneUnit(w * W, h * H), band = u * 32, m = u * 2;
    const [hl, ht, hr, hb] = hub.box;
    if (hr <= l || hl >= r || hb <= t || ht >= b) return c;
    const leftSide = (hl + hr) / 2 < (l + r) / 2, need = leftSide ? hr - l + m : r - hl + m;
    if (ht < t + band) { c[leftSide ? 'tl' : 'tr'] = need; c.ty = hb - t + m; }
    if (hb > b - band) c[leftSide ? 'bl' : 'br'] = need;
    return c;
  });
}
