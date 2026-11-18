/* Sharing a result. What a friend receives is one link, billionaire-kart.okgodoit.com/s/<id>, whose preview is the
   card: the race as a poster (the track behind, a huge place number, the racer's portrait, the trophy) with a
   business-news headline from content/snark.js. The preview's title is the challenge ("Beat my 1:57.650 on Silicon
   Valley Circuit"), and opening the link races that track against that time (src/ui/challenge.js). The server side
   is server/src/BillionaireKart.Server/Web/Shares.cs. Loaded on demand from the results screens.

   prepareShare(result) picks the words, makes the link's id, and draws the card straight away. The tap then shares
   the link at once (Safari refuses navigator.share() once a tap's moment has passed) and uploads the card beside it;
   the server holds a previewer's request until the upload lands. Without the race server (a plain file server, or
   offline) the tap shares the picture itself.
   result: { racer, rank, fieldSize, track: {id, name}, time, estimated, stats, cc, mode: 'race'|'gp'|'trial'|'cup',
             trial: 'best'|'first'|'slower'|'matched', delta, cup, points } */
import { HEADLINES, headline, bucketFor } from '../content/snark.js';
import { fmtTime, ordinal } from '../core/util.js';

const W = 1200, H = 630;                            // the link-preview shape every app shows uncropped
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

const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;

/** The preview's title: the challenge, in the sharer's voice. */
export function challengeTitle(r) {
  if (r.mode === 'cup') return `Beat my ${plural(r.points, 'point', 'points')} in the ${r.cup.name}`;
  if (r.estimated) return `Can you finish ${r.track.name}?`;
  return `Beat my ${fmtTime(r.time)} on ${r.track.name}`;
}

/** Choose the words for a result. Exported for the review sheet and tests. */
export function cardWords(r, rng = Math.random) {
  const vars = { name: r.racer.name, track: r.track?.name || '', place: r.rank, n: r.fieldSize, cup: r.cup?.name || '', delta: r.delta || '' };
  const bucket = bucketFor({ mode: r.mode, rank: r.rank, fieldSize: r.fieldSize, estimated: r.estimated, trial: r.trial });
  const head = headline(bucket, vars, rng);
  const quote = r.mode === 'trial' ? null : r.rank === 1 ? r.racer.barks?.win : r.racer.barks?.lose;
  const where = r.mode === 'cup' ? r.cup?.name : r.track?.name;
  const timeBit = r.mode === 'cup' ? plural(r.points, 'point', 'points') : r.estimated ? 'Did not finish' : fmtTime(r.time);
  const facts = [where, timeBit, r.cc ? `${r.cc}cc` : null].filter(Boolean).join('  ·  ');
  return { bucket, head, quote, facts, title: challengeTitle(r) };
}

/** Draw the card with the given words (cardWords). Returns a canvas of W x H. */
export async function drawCard(r, words = cardWords(r)) {
  await Promise.all([document.fonts.load(`80px ${DISPLAY}`), document.fonts.load(`600 30px ${BODY}`)]).catch(() => {});
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
  const hl = fitLines(ctx, words.head, s => `${s}px ${DISPLAY}`, colW, 3, 60, 36);
  let y = 250;
  ctx.font = `${hl.size}px ${DISPLAY}`;
  for (const l of hl.lines) { stroked(ctx, l, L, y, '#fff', INK, 0.12); y += hl.size * 1.08; }
  y += 14;
  ctx.font = `600 26px ${BODY}`; ctx.fillStyle = MINT;
  ctx.shadowColor = 'rgba(0,0,0,0.75)'; ctx.shadowBlur = 8;
  ctx.fillText(words.facts, L, y, colW);
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

/** A link id: twelve letters and digits, made here so the link exists before the upload does. */
function newId() {
  const abc = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789', bytes = crypto.getRandomValues(new Uint8Array(12));
  return Array.from(bytes, b => abc[b % abc.length]).join('');
}

/** Draw the card and pack it as a JPEG. Rejects rather than hand over an empty picture. */
async function pack(r, words) {
  const { canvas } = await drawCard(r, words);
  const blob = await new Promise(res => canvas.toBlob(res, 'image/jpeg', 0.84));
  canvas.width = canvas.height = 1;                 // hand the pixels back now: Safari caps total canvas memory
  if (!blob?.size) throw new Error('The card could not be drawn');
  const name = `billionaire-kart-${(r.track?.id || r.cup?.id || 'race')}.jpg`;
  return { blob, file: new File([blob], name, { type: 'image/jpeg' }) };
}

/** The card, drawn once; a failed drawing is tried again on the next ask. */
function card(p) {
  if (!p.card) {
    p.card = pack(p.result, p.words).then(c => (p.ready = c));
    p.card.catch(() => { p.card = null; });
  }
  return p.card;
}

/** Start sharing a result: the words, the link (when base, the race server's origin, is given), and the card.
    Call it when the results open, so the tap that shares has everything to hand. */
export function prepareShare(result, { base = null } = {}) {
  const words = cardWords(result), id = newId();
  const p = { result, words, id, url: base ? `${base.replace(/\/$/, '')}/s/${id}` : null, card: null, ready: null, upload: null };
  card(p).catch(() => {});
  return p;
}

/** Send the card and its words to the race server (once; a failure is tried again on the next tap). */
function upload(p) {
  if (!p.upload) {
    p.upload = (async () => {
      const { blob } = await card(p), r = p.result;
      await fetch('/api/session', { method: 'POST', credentials: 'same-origin' });   // the player cookie the upload is checked against
      const f = new FormData(), put = (k, v) => { if (v != null && v !== '') f.set(k, String(v)); };
      put('id', p.id); put('mode', r.mode); put('racer', r.racer.id); put('cc', r.cc);
      if (r.mode === 'cup') { put('cup', r.cup?.id); put('points', r.points); } else put('track', r.track?.id);
      put('rank', r.rank); put('fieldSize', r.fieldSize);
      if (r.mode !== 'cup' && !r.estimated && isFinite(r.time)) put('timeMs', Math.round(r.time * 1000));
      put('title', p.words.title); put('description', p.words.head);
      f.set('image', blob, 'card.jpg');
      const res = await fetch('/api/shares', { method: 'POST', body: f, credentials: 'same-origin' });
      if (!res.ok && res.status !== 409) throw new Error(`The share upload failed (${res.status})`);
    })();
    p.upload.catch(() => { p.upload = null; });
  }
  return p.upload;
}

/** Share a prepared result. Call it straight from the tap. Returns 'shared', 'cancelled', 'copied' (the link is on the
    clipboard), 'saved' (the picture was downloaded), 'preparing' (the picture is not drawn yet: tap again in a
    moment), 'again' (the browser wants a fresh tap), or 'failed'. */
export async function sharePrepared(p) {
  if (p.url) {
    upload(p).catch(() => {});
    if (navigator.share) {
      try { await navigator.share({ url: p.url }); return 'shared'; }
      catch (e) { if (e?.name === 'AbortError') return 'cancelled'; }
    }
    // a computer without a share sheet: the link goes on the clipboard, where a chat app will unfurl it
    try { await navigator.clipboard.writeText(p.url); return 'copied'; } catch { return 'failed'; }
  }
  // no race server to hold the link: the picture itself
  if (!p.ready) { card(p).catch(() => {}); return 'preparing'; }
  const data = { files: [p.ready.file] };
  if (navigator.canShare?.(data)) {
    try { await navigator.share(data); return 'shared'; }
    catch (e) { if (e?.name === 'AbortError') return 'cancelled'; if (e?.name === 'NotAllowedError') return 'again'; }
  }
  // no file sharing at all (a computer, or a phone browser without it): save the picture
  const a = document.createElement('a');
  a.href = URL.createObjectURL(p.ready.blob); a.download = p.ready.file.name; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 10000);
  return 'saved';
}

export { HEADLINES };
