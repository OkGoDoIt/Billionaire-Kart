/* The share card: the race result as a poster (the track behind, a huge place number, the racer's portrait, the
   trophy) with a business-news headline from content/snark.js, then the phone's share sheet. Loaded on demand from
   the results screens; the online results reuse it.

   prepareShare(result) draws the card straight away, so a later tap can hand the finished file to the share sheet
   inside the tap itself (Safari refuses navigator.share() once a tap's moment has passed).
   result: { racer, rank, fieldSize, track: {id, name}, time, estimated, stats, cc, mode: 'race'|'gp'|'trial'|'cup',
             trial: 'best'|'first'|'slower', delta, cup } */
import { HEADLINES, headline, bucketFor, statLines } from '../content/snark.js';
import { fmtTime, ordinal } from '../core/util.js';

const W = 1200, H = 675;
const INK = '#12142b', GOLD = '#ffd23c', HOT = '#ff4d6d', SKY = '#38b6ff', MINT = '#2ee6a6';
const PLACE_COLOR = { 1: GOLD, 2: '#dfe6f2', 3: '#f0a865' };
const TROPHY = { 1: 'gold', 2: 'silver', 3: 'bronze' };
const hex = n => '#' + n.toString(16).padStart(6, '0');
const DISPLAY = '"Luckiest Guy", "Arial Black", Impact, sans-serif', BODY = '"Fredoka", "Trebuchet MS", sans-serif';

/** Where people go to play: the game's home (src/moved.js forwards the old GitHub address there). */
export const gameAddress = () => 'https://billionaire-kart.okgodoit.com/';
const shortAddress = () => gameAddress().replace(/^https?:\/\//, '').replace(/\/$/, '');

const loadImage = src => new Promise(res => { if (!src) return res(null); const im = new Image(); im.decoding = 'async'; im.onload = () => res(im); im.onerror = () => res(null); im.src = src; });

/** Word-wrap text into at most maxLines lines of maxW, shrinking from size down to min until it fits. */
function fitLines(ctx, text, font, maxW, maxLines, size, min) {
  for (let s = size; s >= min; s -= 2) {
    ctx.font = font(s);
    const words = text.split(' '), lines = [];
    let line = '';
    for (const w of words) {
      const next = line ? line + ' ' + w : w;
      if (ctx.measureText(next).width <= maxW || !line) line = next; else { lines.push(line); line = w; }
    }
    lines.push(line);
    if (lines.length <= maxLines && lines.every(l => ctx.measureText(l).width <= maxW)) return { size: s, lines };
  }
  ctx.font = font(min);
  return { size: min, lines: [text] };
}

function cover(ctx, img, x, y, w, h, fy = 0.5) {
  const s = Math.max(w / img.width, h / img.height), iw = img.width * s, ih = img.height * s;
  ctx.drawImage(img, x + (w - iw) / 2, y + (h - ih) * fy, iw, ih);
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
}

/** Outlined display text, the way the game's logo and banners draw it. */
function stroked(ctx, text, x, y, fill, stroke = INK, width = 0.14) {
  const px = parseFloat(ctx.font);
  ctx.lineJoin = 'round'; ctx.miterLimit = 2;
  ctx.lineWidth = px * width * 2; ctx.strokeStyle = stroke; ctx.strokeText(text, x, y);
  ctx.fillStyle = fill; ctx.fillText(text, x, y);
}

/** Choose the words for a result. Exported for the review sheet and tests. */
export function cardWords(r, rng = Math.random) {
  const vars = { name: r.racer.name, track: r.track?.name || '', place: r.rank, n: r.fieldSize, cup: r.cup?.name || '', delta: r.delta || '' };
  const bucket = bucketFor({ mode: r.mode, rank: r.rank, fieldSize: r.fieldSize, estimated: r.estimated, trial: r.trial });
  const head = headline(bucket, vars, rng);
  const quote = r.mode === 'trial' ? null : r.rank === 1 ? r.racer.barks?.win : r.racer.barks?.lose;
  const where = r.mode === 'cup' ? r.cup?.name : r.track?.name;
  const timeBit = r.mode === 'cup' ? `${r.points} points` : r.estimated ? 'Did not finish' : fmtTime(r.time);
  const facts = [r.racer.name, where, timeBit, r.cc ? `${r.cc}cc` : null].filter(Boolean).join('  ·  ');
  return { bucket, head, quote, facts, stats: statLines(r.stats).slice(0, 2) };
}

/** Draw the card. Returns a canvas of W x H. */
export async function drawCard(r, rng = Math.random) {
  await Promise.all([document.fonts.load(`80px ${DISPLAY}`), document.fonts.load(`600 30px ${BODY}`)]).catch(() => {});
  const words = cardWords(r, rng);
  const [bg, face, trophy] = await Promise.all([
    loadImage(r.track?.id ? `assets/tracks/${r.track.id}.webp` : null),
    loadImage(r.racer.portrait),
    loadImage(TROPHY[r.rank] && r.mode !== 'trial' ? `assets/ui/trophy-${TROPHY[r.rank]}.webp` : null),
  ]);
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  const ctx = cv.getContext('2d');

  // the track, darkened on the left and along the bottom so the words read
  ctx.fillStyle = '#1b2350'; ctx.fillRect(0, 0, W, H);
  if (bg) cover(ctx, bg, 0, 0, W, H);
  let g = ctx.createLinearGradient(0, 0, W, 0);
  g.addColorStop(0, 'rgba(18,20,43,0.94)'); g.addColorStop(0.5, 'rgba(18,20,43,0.62)'); g.addColorStop(0.78, 'rgba(18,20,43,0.05)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  g = ctx.createLinearGradient(0, H, 0, H * 0.55); g.addColorStop(0, 'rgba(18,20,43,0.9)'); g.addColorStop(1, 'rgba(18,20,43,0)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);

  // the portrait, standing on the bottom edge in the racer's color
  const pw = 400, ph = 450, px = W - pw - 56, py = H - ph;
  ctx.save(); roundRect(ctx, px, py, pw, ph + 40, 34); ctx.fillStyle = hex(r.racer.color); ctx.fill();
  ctx.clip(); if (face) cover(ctx, face, px, py, pw, ph, 0.18); ctx.restore();
  ctx.save(); roundRect(ctx, px, py, pw, ph + 40, 34); ctx.lineWidth = 8; ctx.strokeStyle = INK; ctx.stroke(); ctx.restore();

  // the racer's own line, in a speech bubble over the portrait
  if (words.quote) {
    ctx.font = `600 26px ${BODY}`;
    const fit = fitLines(ctx, `“${words.quote}”`, s => `600 ${s}px ${BODY}`, 330, 2, 26, 18);
    const bw = Math.max(...fit.lines.map(l => ctx.measureText(l).width)) + 40, bh = fit.lines.length * fit.size * 1.25 + 26;
    const bx = Math.min(W - bw - 24, px + pw - bw + 10), by = py - bh - 26;
    ctx.save(); roundRect(ctx, bx, by, bw, bh, 18); ctx.fillStyle = '#fffdf5'; ctx.fill(); ctx.lineWidth = 5; ctx.strokeStyle = INK; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(bx + bw * 0.62, by + bh - 2); ctx.lineTo(bx + bw * 0.62 + 30, by + bh + 26); ctx.lineTo(bx + bw * 0.62 + 34, by + bh - 2); ctx.closePath();
    ctx.fill(); ctx.stroke(); ctx.fillRect(bx + bw * 0.62 + 3, by + bh - 6, 28, 6); ctx.restore();
    ctx.fillStyle = INK; ctx.textBaseline = 'top'; ctx.font = `600 ${fit.size}px ${BODY}`;
    fit.lines.forEach((l, i) => ctx.fillText(l, bx + 20, by + 14 + i * fit.size * 1.25));
  }
  // the trophy stands in front of the portrait's corner, clear of the words on the left
  if (trophy) ctx.drawImage(trophy, px - 66, H - 160, 120, 120 * trophy.height / trophy.width);

  // the place, huge and tilted, like the podium headline
  const L = 60, colW = px - L - 40;
  ctx.save(); ctx.translate(L, 34); ctx.rotate(-0.06); ctx.textBaseline = 'top';
  if (r.mode === 'trial') {
    ctx.font = `150px ${DISPLAY}`; stroked(ctx, r.trial === 'best' ? 'RECORD' : 'TIME', 0, 0, r.trial === 'best' ? GOLD : '#fff', INK, 0.07);
  } else {
    const ord = r.estimated ? 'DNF' : String(r.rank);
    ctx.font = `210px ${DISPLAY}`; stroked(ctx, ord, 0, 0, PLACE_COLOR[r.rank] || '#fff', INK, 0.06);
    if (!r.estimated) { const w = ctx.measureText(ord).width; ctx.font = `92px ${DISPLAY}`; stroked(ctx, ordinal(r.rank).slice(String(r.rank).length).toUpperCase(), w + 8, 18, PLACE_COLOR[r.rank] || '#fff', INK, 0.08); }
  }
  ctx.restore();

  // the headline, then the facts and two numbers
  ctx.textBaseline = 'top';
  const hl = fitLines(ctx, words.head, s => `${s}px ${DISPLAY}`, colW, 3, 58, 34);
  let y = 248;
  ctx.font = `${hl.size}px ${DISPLAY}`;
  for (const l of hl.lines) { stroked(ctx, l, L, y, '#fff', INK, 0.12); y += hl.size * 1.08; }
  y += 14;
  ctx.font = `600 26px ${BODY}`; ctx.fillStyle = MINT;
  ctx.shadowColor = 'rgba(0,0,0,0.75)'; ctx.shadowBlur = 8;
  ctx.fillText(words.facts, L, y, colW); y += 40;
  ctx.fillStyle = '#fffdf5'; ctx.font = `600 24px ${BODY}`;
  for (const s of words.stats) { if (y > H - 120) break; ctx.fillStyle = GOLD; ctx.fillText('▸', L, y); ctx.fillStyle = '#fffdf5'; ctx.fillText(s, L + 26, y, colW - 26); y += 34; }
  ctx.shadowBlur = 0;

  // the game's mark and where to play
  const fy = H - 74;
  ctx.save(); ctx.translate(L, fy); ctx.rotate(-0.05);
  ctx.font = `22px ${DISPLAY}`; stroked(ctx, 'BILLIONAIRE', 0, 0, '#fff', INK, 0.16);
  ctx.font = `44px ${DISPLAY}`; let kx = -2;
  [['K', GOLD], ['A', HOT], ['R', SKY], ['T', MINT]].forEach(([c, col]) => { stroked(ctx, c, kx, 18, col, INK, 0.1); kx += ctx.measureText(c).width + 1; });
  ctx.restore();
  ctx.font = `600 22px ${BODY}`; ctx.fillStyle = 'rgba(255,253,245,0.88)'; ctx.textBaseline = 'middle';
  ctx.fillText(`Beat that at ${shortAddress()}`, L + 150, fy + 34);
  return { canvas: cv, words };
}

/** Draw the card and pack it for the share sheet. */
export async function prepareShare(r) {
  const { canvas, words } = await drawCard(r);
  const blob = await new Promise(res => canvas.toBlob(res, 'image/jpeg', 0.9));
  canvas.width = canvas.height = 1;                 // hand the pixels back now: Safari caps total canvas memory
  const name = `billionaire-kart-${(r.track?.id || r.cup?.id || 'race')}.jpg`;
  const file = new File([blob], name, { type: 'image/jpeg' });
  return { file, blob, text: words.head, url: gameAddress(), words };
}

/** Share a prepared card. Call it straight from the tap. Returns 'shared', 'cancelled', 'copied', or 'saved'. */
export async function sharePrepared(p) {
  const data = { files: [p.file], title: 'Billionaire Kart', text: `${p.text} Beat that: ${p.url}` };
  if (navigator.canShare?.(data)) {
    try { await navigator.share(data); return 'shared'; }
    catch (e) { if (e?.name === 'AbortError') return 'cancelled'; }
  }
  // a computer: save the picture and copy the words with the link
  const a = document.createElement('a');
  a.href = URL.createObjectURL(p.blob); a.download = p.file.name; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 10000);
  try { await navigator.clipboard.writeText(data.text); return 'copied'; } catch { return 'saved'; }
}

export { HEADLINES };
