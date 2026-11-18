#!/usr/bin/env node
/* Split-screen layout check: for one to four players on every screen shape from an upright phone to a 32:9
   ultrawide (and some silly ones), the panes must seat everyone, stay on screen, never overlap, read left to right
   and top to bottom, and leave no empty cell except the one three players on a two-by-two grid leave. Then it pins
   the choices that matter: side by side on a wide window, stacked on a squarer or upright one, columns on an
   ultrawide, rows on an upright tablet. And a layout already on screen holds while the window is dragged a little
   past a threshold. Pure arithmetic, no browser.   Usage: node tools/split-layout-check.mjs */
import { splitLayout } from '../src/render/splitlayout.js';

const faults = [];
const fail = m => faults.push(m);
const EPS = 1e-9;

// every shape, every player count: the geometry contract
const widths = [200, 320, 390, 667, 768, 820, 1024, 1180, 1280, 1440, 1920, 2000, 2560, 3440, 3840, 5120];
const heights = [120, 240, 390, 600, 720, 768, 800, 820, 900, 1080, 1180, 1440, 2160];
for (const n of [1, 2, 3, 4]) for (const W of widths) for (const H of heights) {
  const tag = `${n}p ${W}x${H}`, L = splitLayout(n, W, H);
  if (L.rects.length !== n) { fail(`${tag}: ${L.rects.length} panes for ${n} players`); continue; }
  if (L.cols * L.rows !== n + L.spare.length) fail(`${tag}: ${L.cols}x${L.rows} grid with ${L.spare.length} spare cells`);
  if (L.spare.length && !(n === 3 && L.cols === 2 && L.rows === 2)) fail(`${tag}: an empty cell in a ${L.cols}x${L.rows} grid`);
  const all = [...L.rects, ...L.spare];
  for (const [i, [x, y, w, h]] of all.entries()) {
    if (w <= 0 || h <= 0 || x < -EPS || y < -EPS || x + w > 1 + EPS || y + h > 1 + EPS) fail(`${tag}: cell ${i} off screen ${[x, y, w, h].map(v => v.toFixed(3))}`);
    for (const [j, [x2, y2, w2, h2]] of all.entries()) if (j > i && x < x2 + w2 - EPS && x2 < x + w - EPS && y < y2 + h2 - EPS && y2 < y + h - EPS) fail(`${tag}: cells ${i} and ${j} overlap`);
  }
  // equal panes, so nobody gets a bigger picture
  const a0 = L.rects[0][2] * L.rects[0][3];
  if (L.rects.some(r => Math.abs(r[2] * r[3] - a0) > 1e-6)) fail(`${tag}: panes are not the same size`);
  // reading order: player one top left, each next player to the right or on a lower row
  for (let i = 1; i < n; i++) {
    const [px, py] = L.rects[i - 1], [x, y] = L.rects[i];
    if (!(Math.abs(y - py) < EPS ? x > px : y < py)) fail(`${tag}: player ${i + 1} is not after player ${i} in reading order`);
  }
  if (n > 1) { // a gap between neighbours, and the screen used edge to edge
    const minX = Math.min(...all.map(r => r[0])), maxX = Math.max(...all.map(r => r[0] + r[2])), minY = Math.min(...all.map(r => r[1])), maxY = Math.max(...all.map(r => r[1] + r[3]));
    if (minX > EPS || minY > EPS || maxX < 1 - EPS || maxY < 1 - EPS) fail(`${tag}: the grid does not reach the screen edges`);
  }
}

// the choices that matter
const want = (n, W, H, grid, why) => { const L = splitLayout(n, W, H), got = `${L.cols}x${L.rows}`; if (got !== grid) fail(`${n}p ${W}x${H} (${why}): ${got}, wanted ${grid}`); };
want(2, 2000, 800, '2x1', 'a wide browser window, Roger\'s report: side by side, not two 5:1 strips');
want(2, 1920, 1080, '2x1', '16:9 monitor or TV');
want(2, 1440, 790, '2x1', 'laptop browser window');
want(2, 3840, 1080, '2x1', '32:9 ultrawide');
want(2, 1024, 768, '1x2', '4:3 window');
want(2, 1180, 820, '1x2', 'tablet held sideways');
want(2, 820, 1180, '1x2', 'tablet upright');
want(2, 390, 844, '1x2', 'phone upright');
want(3, 1280, 720, '2x2', '16:9: two by two, with the board in the spare cell');
want(3, 1024, 768, '2x2', '4:3');
want(3, 2000, 800, '3x1', 'wide window: three columns');
want(3, 3840, 1080, '3x1', '32:9 ultrawide');
want(3, 820, 1180, '1x3', 'tablet upright: three rows');
want(4, 1920, 1080, '2x2', '16:9');
want(4, 1024, 768, '2x2', '4:3');
want(4, 3840, 1080, '4x1', '32:9 ultrawide: four columns');
want(4, 820, 1180, '1x4', 'tablet upright: four rows');
want(1, 3840, 1080, '1x1', 'one player always has the whole screen');

// a window dragged a little past the 2-player threshold keeps its layout; dragged well past, it switches
{
  const a = splitLayout(2, 1180, 820);                       // stacked
  const b = splitLayout(2, 1250, 820, { prev: a });          // just over 1.5: still stacked
  const c = splitLayout(2, 1500, 820, { prev: b });          // well over: side by side
  const d = splitLayout(2, 1180, 820, { prev: c });          // and back: stacked again, both ways
  if (`${b.cols}x${b.rows}` !== '1x2') fail(`hysteresis: a small drag past the threshold flipped the layout to ${b.cols}x${b.rows}`);
  if (`${c.cols}x${c.rows}` !== '2x1') fail(`hysteresis: a wide window kept the stacked layout`);
  if (`${d.cols}x${d.rows}` !== '1x2') fail(`hysteresis: back at 1180x820 the layout stayed ${d.cols}x${d.rows}`);
  const e = splitLayout(3, 1280, 720, { prev: splitLayout(2, 2000, 800) });   // a previous layout for another player count is ignored
  if (e.rects.length !== 3) fail('a previous layout for a different player count was reused');
}

for (const f of faults.slice(0, 40)) console.log('FAIL ' + f);
console.log(faults.length ? `split-layout-check: ${faults.length} faults` : 'split-layout-check: ok');
process.exit(faults.length ? 1 : 0);
