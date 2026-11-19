#!/usr/bin/env node
/* HUD check: starts a race at a spread of screen shapes (desktop, phone, tablet, split-screen) and forces the
   longest text every part of the HUD can show, all at once: the longest item name and description, the longest
   line a rival can say, the longest feed entries, each kind of banner, the incoming-item warning. Then it measures.
   It fails if any text sits on other text, any HUD block overlaps another, or any text is cut off or leaves its pane.
   A real race shows two or three of these at a time, so a pass here means no combination can collide.
   With three or four players it also checks the shared field map and clock (issue #375): exactly one map and one clock
   on screen (the board in a spare cell, or the hub where the panes meet; Thiel's own minimap aside), and no pane's
   position, coins and lap, item, or speed under the hub, including after the window is resized live to another layout.
   Usage: node tools/hud-check.mjs [--out dir] [--only name] [--split: split-screen cases only]      exits 1 on any fault; saves two screenshots per case */
import http from 'node:http';
import { readFile, mkdir } from 'node:fs/promises';
import { extname, join, normalize, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { takeSlot } from './slot.mjs';

await takeSlot('hud-check');   // two heavy jobs at a time on this machine: see slot.mjs

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2), opt = {};
for (let i = 0; i < args.length; i++) if (args[i].startsWith('--')) { const k = args[i].slice(2); opt[k] = args[i + 1] && !args[i + 1].startsWith('--') ? args[++i] : true; }
const out = opt.out || '/tmp/bk-hud-check'; await mkdir(out, { recursive: true });

const CASES = [
  { name: 'desktop-16x9', w: 1280, h: 720 }, { name: 'desktop-1080p', w: 1920, h: 1080 }, { name: 'desktop-16x10', w: 1440, h: 900 },
  { name: 'desktop-4x3', w: 1024, h: 768 }, { name: 'desktop-5x4', w: 1280, h: 1024 },
  { name: 'phone', w: 844, h: 390, touch: true }, { name: 'phone-wide', w: 932, h: 430, touch: true }, { name: 'phone-16x9', w: 667, h: 375, touch: true },
  { name: 'tablet', w: 1180, h: 820, touch: true }, { name: 'tablet-4x3', w: 1024, h: 768, touch: true },
  // notched iPhones held sideways: headless Chrome reports no safe-area insets, so these set the real ones (top, right,
  // bottom, left in CSS px). Roger's card crushed to a word a line here on 18 Nov, and the plain phone cases never saw it.
  { name: 'iphone-notch', w: 852, h: 393, touch: true, safe: [0, 59, 21, 59] }, { name: 'iphone-max-notch', w: 932, h: 430, touch: true, safe: [0, 59, 21, 59] },
  { name: 'desktop-21x9', w: 2560, h: 1080 },
  { name: 'two-players', w: 1280, h: 720, racers: 2 }, { name: 'three-players', w: 1280, h: 720, racers: 3 }, { name: 'four-players', w: 1280, h: 720, racers: 4 },
  { name: 'four-players-4x3', w: 1024, h: 768, racers: 4 },
  // the split follows the screen's shape (src/render/splitlayout.js): side by side, columns, rows
  { name: 'two-players-wide', w: 2000, h: 800, racers: 2 }, { name: 'two-players-upright', w: 820, h: 1180, racers: 2 },
  { name: 'three-players-wide', w: 2000, h: 800, racers: 3 }, { name: 'three-players-upright', w: 820, h: 1180, racers: 3 },
  { name: 'three-players-4x3', w: 1024, h: 768, racers: 3 }, { name: 'four-players-32x9', w: 2560, h: 720, racers: 4 },
  { name: 'four-players-upright', w: 820, h: 1180, racers: 4 },
  { name: 'two-players-iphone', w: 852, h: 393, racers: 2, safe: [0, 59, 21, 59] }, { name: 'four-players-iphone', w: 852, h: 393, racers: 4, safe: [0, 59, 21, 59] },
  { name: 'ipad-upright-2p', w: 820, h: 1180, racers: 2, safe: [24, 0, 20, 0] },
  // the shared map and clock where the panes meet: four rows on a small upright window, three and four rows on a phone
  { name: 'four-players-500x900', w: 500, h: 900, racers: 4 }, { name: 'three-players-phone', w: 390, h: 844, racers: 3 },
  { name: 'four-players-phone', w: 390, h: 844, racers: 4 },
  // and live resizing through every layout: the board, rows, columns, the junction, and back
  { name: 'three-players-resize', w: 1280, h: 720, racers: 3, resize: [[820, 1180], [2000, 800], [500, 900], [1280, 720]] },
  { name: 'four-players-resize', w: 1280, h: 720, racers: 4, resize: [[500, 900], [2560, 720], [1024, 768], [852, 393], [1280, 720]] },
  // Thiel keeps his own minimap (his special draws rivals' items on it), and it makes way for the hub like the rest of his corner
  { name: 'four-players-thiel', w: 1280, h: 720, racers: 4, r: ['larrysergey', 'elon', 'thiel', 'zuck'] },
  { name: 'four-players-thiel-tall', w: 500, h: 900, racers: 4, r: ['larrysergey', 'elon', 'thiel', 'zuck'] },
].filter(c => (!opt.only || c.name === opt.only) && (!opt.split || c.racers > 1));

/* ---------- issue #132 guard: a held item's description must always show ----------
   Roger hit a name-only item card on his phone (Mars Colony, holding a Subpoena): the description had been
   folded away by a 6-second wall-clock timer, and the CSS also folded it whenever the feed or a banner was
   up, and hid it outright in compact (split-screen) panes. Three static checks fail fast, before any browser
   work: every item must carry a name and a description; no CSS rule may hide the description span; and the
   HUD must not regrow the fold timer. The behavioural half runs inside `stress` below: every item is loaded
   into a real HUD and its description measured, and on the phone and desktop cases the longest description
   must still be fully up after a 7-second hold with a feed row and a banner firing over it. */
const guardFaults = [];
{
  const { ITEMS: GUARD_ITEMS } = await import(new URL('../src/race/items.js', import.meta.url));
  for (const [id, d] of Object.entries(GUARD_ITEMS)) {
    if (!d.name || !d.name.trim()) guardFaults.push(`items.js: ${id} has no name`);
    if (!d.desc || !d.desc.trim()) guardFaults.push(`items.js: ${id} has no description`);
  }
  const css = (await readFile(join(ROOT, 'styles/hud.css'), 'utf8')).replace(/\/\*[\s\S]*?\*\//g, '');
  for (const chunk of css.split('}')) {
    const i = chunk.indexOf('{'); if (i < 0) continue;
    const sel = chunk.slice(0, i).trim(), body = chunk.slice(i + 1);
    if (!sel.includes('.hud-item-info')) continue;
    if (sel.includes('.brief')) guardFaults.push(`hud.css: the .brief description fold is back (${sel})`);
    if (sel.includes('span') && /\b(display\s*:\s*none|visibility\s*:\s*hidden|opacity\s*:\s*0|max-height\s*:\s*0|max-width\s*:\s*0|font-size\s*:\s*0)/.test(body))
      guardFaults.push(`hud.css: a rule hides the held item's description (${sel})`);
  }
  const hudJs = await readFile(join(ROOT, 'src/ui/hud.js'), 'utf8');
  if (/'brief'|"brief"|\.brief\b|_nt\b/.test(hudJs)) guardFaults.push('hud.js: the description fold timer (brief/_nt) is back');
}
if (guardFaults.length) { for (const f of guardFaults) console.log('FAIL  item-desc guard: ' + f); process.exit(1); }
console.log('ok    item-desc guard (every item has a name + description; nothing in hud.js/hud.css can hide it)');

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.woff2': 'font/woff2', '.mp3': 'audio/mpeg' };
const server = http.createServer(async (req, res) => {
  try { let p = normalize(join(ROOT, decodeURIComponent(new URL(req.url, 'http://x').pathname))); if (p.endsWith('/') || p === ROOT) p = join(p, 'index.html'); const d = await readFile(p); res.writeHead(200, { 'Content-Type': MIME[extname(p)] || 'application/octet-stream', 'Cache-Control': 'no-store' }); res.end(d); }
  catch { res.writeHead(404); res.end('nf'); }
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const base = `http://127.0.0.1:${server.address().port}/`;
let browser;
try { browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'] }); }
catch { browser = await chromium.launch({ headless: true, args: ['--enable-unsafe-swiftshader'] }); }

/* Runs in the page (injected as window.bkShared). Three or four players share one field map and one clock: count the
   ones on screen and check that the hub, if that is where they are, covers none of a pane's corner readouts. */
const shared = (faults, tag) => {
  const huds = BK.session.huds; if (huds.length < 3) return;
  const vis = e => { if (!e) return null; for (let a = e; a; a = a.parentElement) { const s = getComputedStyle(a); if (s.display === 'none' || s.visibility === 'hidden' || +s.opacity < 0.3) return null; } const r = e.getBoundingClientRect(); return r.width > 2 && r.height > 2 ? r : null; };
  const own = huds.filter(h => !h.kart.sp?.seeItems);   // Thiel keeps his minimap: his special draws rivals' items on it
  const maps = [...own.map(h => vis(h.root.querySelector('.hud-map'))), vis(document.querySelector('.board-map'))].filter(Boolean);
  const clocks = [...huds.map(h => vis(h.root.querySelector('.hud-time'))), vis(document.querySelector('.board-clock'))].filter(Boolean);
  if (maps.length !== 1) faults.add(`${tag}: ${maps.length} field maps on screen, wanted one`);
  if (clocks.length !== 1) faults.add(`${tag}: ${clocks.length} race clocks on screen, wanted one`);
  const hub = document.querySelector('.board-hub'); if (!vis(hub)) return;
  const parts = [vis(hub.querySelector('.board-mapwrap')), vis(hub.querySelector('.board-clock'))].filter(Boolean);
  const W = innerWidth, H = innerHeight;
  for (const p of parts) if (p.left < -1 || p.top < -1 || p.right > W + 1 || p.bottom > H + 1) faults.add(`${tag}: the shared map is off screen`);
  huds.forEach((h, i) => {
    for (const sel of ['.hud-rank', '.hud-bl', '.hud-item', '.hud-item-info', '.hud-speed', '.hud-map']) {
      const q = vis(h.root.querySelector(sel)); if (!q) continue;
      for (const p of parts) { const w = Math.min(p.right, q.right) - Math.max(p.left, q.left), hh = Math.min(p.bottom, q.bottom) - Math.max(p.top, q.top); if (w > 1 && hh > 1) faults.add(`${tag}, player ${i + 1}: the shared map covers ${sel} by ${Math.round(w)}x${Math.round(hh)}px`); }
    }
  });
};

/* Runs in the page. Returns the list of faults for the race that is on screen. */
const stress = async () => {
  const wait = ms => new Promise(r => setTimeout(r, ms));
  await new Promise(r => { const t = setInterval(() => { if (window.BK?.race && !BK.race.frozen) { clearInterval(t); r(); } }, 150); });
  await wait(900);
  const { RACERS } = await import('/src/content/racers.js'); const { ITEMS } = await import('/src/race/items.js'); const { TRACKS } = await import('/src/content/tracks.js');
  const longestBy = (list, f) => list.reduce((a, b) => (f(b).length > f(a).length ? b : a));
  const talker = longestBy(RACERS, r => r.name);
  let line = ''; for (const r of RACERS) for (const v of [r.quote, ...Object.values(r.barks || {}).flat()]) if (typeof v === 'string' && v.length > line.length) line = v;
  const items = Object.values(ITEMS), nameItem = longestBy(items, i => i.name), descItem = longestBy(items, i => i.desc || '');
  const hitLine = longestBy(items.filter(i => i.hit), i => i.hit).hit;
  let lapNote = ''; for (const t of TRACKS) for (const n of t.lapNotes || []) if (n.replace(/<[^>]+>/g, '').length > lapNote.replace(/<[^>]+>/g, '').length) lapNote = n;
  const feedRows = [`<b>${talker.name}</b> got you with ${nameItem.name}`, `You stole ${nameItem.name} from <b>${talker.name}</b>`, lapNote].filter(Boolean);

  const rectsOf = e => { const rs = []; for (const n of e.childNodes) if (n.nodeType === 3 && n.textContent.trim()) { const r = document.createRange(); r.selectNodeContents(n); for (const q of r.getClientRects()) if (q.width > 0.5 && q.height > 0.5) rs.push(q); } return rs; };
  const label = e => `"${e.textContent.trim().slice(0, 24)}" (${(typeof e.className === 'string' && e.className ? '.' + e.className.split(' ')[0] : e.tagName.toLowerCase())})`;
  const shown = (e, stop) => { for (let a = e; a && a !== stop; a = a.parentElement) { const s = getComputedStyle(a); if (+s.opacity < 0.3 || s.visibility === 'hidden' || s.display === 'none') return false; } return true; };
  const BLOCKS = ['.hud-item', '.hud-item-info', '.hud-bl', '.hud-rank', '.hud-time', '.hud-map', '.hud-talk', '.hud-feed', '.hud-banner', '.hud-wrong', '.hud-warn', '.hint-card'];
  const TOUCH = ['.tc-pause', '.tc-tap'];
  const scan = (root, tag, faults) => {
    const V = root.getBoundingClientRect(), els = new Set(), walk = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    for (let n; (n = walk.nextNode());) if (n.textContent.trim() && n.parentElement?.offsetParent) els.add(n.parentElement);
    const boxes = [...els].filter(e => shown(e, root.parentElement)).map(e => ({ e, rs: rectsOf(e) })).filter(b => b.rs.length);
    for (const { e, rs } of boxes) {
      const cs = getComputedStyle(e), own = e.getBoundingClientRect();
      if (cs.overflowX !== 'visible' && e.scrollWidth > e.clientWidth + 1) faults.add(`${tag}: cut off sideways: ${label(e)}`);
      if (cs.overflowY === 'hidden' && e.clientHeight > 4 && e.scrollHeight > e.clientHeight + 2) faults.add(`${tag}: cut off below: ${label(e)}`);
      for (const q of rs) {
        if (q.left < V.left - 1 || q.right > V.right + 1 || q.top < V.top - 1 || q.bottom > V.bottom + 1) { faults.add(`${tag}: outside its pane: ${label(e)}`); break; }
        if (q.left < own.left - 1.5 || q.right > own.right + 1.5) { faults.add(`${tag}: wider than its box: ${label(e)}`); break; }
      }
    }
    for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) {
      const a = boxes[i], b = boxes[j]; if (a.e.contains(b.e) || b.e.contains(a.e)) continue;
      // glyph boxes are taller than a tight line, so stacked lines of one panel graze each other: count an overlap only past a quarter of the shorter line
      let hit = false; for (const p of a.rs) for (const q of b.rs) if (Math.min(p.right, q.right) - Math.max(p.left, q.left) > 2 && Math.min(p.bottom, q.bottom) - Math.max(p.top, q.top) > Math.max(2, 0.25 * Math.min(p.height, q.height))) hit = true;
      if (hit) faults.add(`${tag}: text over text: ${label(a.e)} and ${label(b.e)}`);
    }
    const live = sel => { const e = (sel.startsWith('.tc') ? document : root).querySelector(sel); return e && e.offsetParent && shown(e, null) && e.getBoundingClientRect().width > 2 ? e : null; };
    const blocks = [...BLOCKS, ...(root.classList.contains('hud-touch') ? TOUCH : [])].map(s => [s, live(s)]).filter(b => b[1]);
    for (let i = 0; i < blocks.length; i++) for (let j = i + 1; j < blocks.length; j++) {
      const p = blocks[i][1].getBoundingClientRect(), q = blocks[j][1].getBoundingClientRect();
      const w = Math.min(p.right, q.right) - Math.max(p.left, q.left), h = Math.min(p.bottom, q.bottom) - Math.max(p.top, q.top);
      if (w > 2 && h > 2) faults.add(`${tag}: ${blocks[i][0]} overlaps ${blocks[j][0]} by ${Math.round(w)}x${Math.round(h)}px`);
    }
  };

  const faults = new Set(), huds = BK.session.huds;
  const load = (item, withFeed, banner) => huds.forEach((h, i) => {
    const k = BK.race.players[i]; k.item = item.id; k.itemUses = item.uses || 1; k.wrongWayT = 0;
    h._talkUntil = 0; h.quiet = false; h.talk(talker, line, 9000);
    if (withFeed) for (const row of feedRows.slice(-2)) h.feed(row, 9000);
    if (banner === 'finish') h.onKartEvent({ type: 'finish', data: 1 }); else if (banner) h.banner(banner[0], banner[1], 9000);
    h.warn(nameItem.id);
  });
  const settle = async tag => { await wait(650); huds.forEach((h, i) => scan(h.root, `${tag}, player ${i + 1}`, faults)); window.bkShared(faults, tag); };
  // what you hold, with its description showing, and nothing in the feed
  for (const item of [nameItem, descItem]) for (const b of [['SLIPSTREAM!', 'good small'], ['FINAL LAP!', 'final'], ['ROCKET START!', 'good']]) {
    huds.forEach(h => { h._infoId = null; h.lastItem = undefined; h.$.feed.replaceChildren(); }); load(item, false, b); await settle(`${item.name} + ${b[0]}`);
    if (item === descItem && b[1] === 'good small') await window.bkShot?.('item');   // and the item's description showing
  }
  // everything at once
  for (const b of [[hitLine, 'bad small'], ['FINAL LAP!', 'final'], ['LAP 2', ''], ['SLIPSTREAM!', 'good small']]) {
    huds.forEach(h => { h.$.feed.replaceChildren(); }); load(nameItem, true, b); await settle(`feed + ${b[0]}`);
    if (b[1] === 'bad small') await window.bkShot?.('busy');   // the picture worth keeping: a hit, with everything else up
  }
  // driving the wrong way (never shown once a kart has finished, so not together with the finish banner)
  huds.forEach(h => { h.$.feed.replaceChildren(); }); load(nameItem, true, ['FINAL LAP!', 'final']); huds.forEach((h, i) => { BK.race.players[i].wrongWayT = 3; }); await settle('wrong way');
  huds.forEach((h, i) => { BK.race.players[i].wrongWayT = 0; h.$.feed.replaceChildren(); }); load(nameItem, true, 'finish'); await settle('feed + WINNER!');
  // issue #132, behavioural half: every item, loaded for real into player 1's HUD, must show its name and its
  // FULL description — rendered, opaque, unclipped — and (on the flagged cases) the longest description must
  // survive a 7-second hold, outlasting the old 6-second fold, with a feed row and a wide banner over it.
  {
    const h = huds[0], k = BK.race.players[0];
    const checkDesc = (item, tag) => {
      k.item = item.id; k.itemUses = item.uses || 1; k.rouletteT = 0; h._infoId = null; h.lastItem = undefined; h.update(0);
      const span = h.$.itemDesc, cs = getComputedStyle(span);
      if (!h.$.info.classList.contains('show')) faults.add(`item-desc: ${tag}: info card not shown for ${item.id}`);
      if (h.$.itemName.textContent !== item.name) faults.add(`item-desc: ${tag}: name reads "${h.$.itemName.textContent}", not "${item.name}"`);
      if (span.textContent !== (item.desc || '')) faults.add(`item-desc: ${tag}: description text wrong for ${item.id}`);
      if (!(span.offsetHeight > 0) || cs.opacity !== '1' || cs.visibility !== 'visible' || cs.display === 'none') faults.add(`item-desc: ${tag}: description not rendered for ${item.id}`);
      if (span.scrollHeight > span.clientHeight + 1) faults.add(`item-desc: ${tag}: description clipped for ${item.id}`);
    };
    for (const item of items) checkDesc(item, 'held');
    // and readable: the longest description fills the card, which must be at least 7.5 of its own ems wide (about
    // fifteen characters a line), not a column of single words
    {
      checkDesc(descItem, 'width'); const span = h.$.itemDesc, em = span.clientWidth / parseFloat(getComputedStyle(span).fontSize);
      if (em < 7.5) faults.add(`item-desc: the item card is ${em.toFixed(1)} em wide, a word or two a line`);
    }
    if (window.__BK_DESC_HOLD__) {
      checkDesc(descItem, 'hold start');
      h.feed(feedRows[0], 9000); h.banner('FINAL LAP!', 'final', 9000);
      const wasFrozen = BK.race.frozen; BK.race.frozen = true;   // the sim waits; wall-clock timers (the old fold) do not
      await wait(7000);
      BK.race.frozen = wasFrozen;
      const span = h.$.itemDesc, cs = getComputedStyle(span);
      if (h.$.itemName.textContent !== descItem.name || span.textContent !== descItem.desc) faults.add('item-desc: hold: card text changed while the item was held');
      if (!(span.offsetHeight > 0) || cs.opacity !== '1' || span.scrollHeight > span.clientHeight + 1) faults.add('item-desc: hold: description folded or clipped during a 7 s hold');
      await window.bkShot?.('desc-hold');
    }
  }
  return { panes: huds.length, faults: [...faults] };
};

const RACERS4 = ['larrysergey', 'elon', 'sam', 'zuck'];
let total = 0;
for (const c of CASES) {
  const ctx = await browser.newContext({ viewport: { width: c.w, height: c.h }, hasTouch: !!c.touch, isMobile: !!c.touch, deviceScaleFactor: c.touch ? 2 : 1, serviceWorkers: 'block' });
  const page = await ctx.newPage(); const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto(`${base}?track=bliss-hills&intro=0&seed=3&r=${(c.r || RACERS4.slice(0, c.racers || 1)).join(',')}`, { waitUntil: 'load' });
  if (c.safe) { const [t, r, b, l] = c.safe; await page.addStyleTag({ content: `:root { --safe-t: ${t}px; --safe-r: ${r}px; --safe-b: ${b}px; --safe-l: ${l}px; }` }); }
  await page.waitForFunction('window.BK && BK.race', null, { timeout: 40000 });
  await page.exposeFunction('bkShot', tag => page.screenshot({ path: join(out, `${c.name}-${tag}.jpg`), type: 'jpeg', quality: 85 }).then(() => null));
  if (c.name === 'phone' || c.name === 'desktop-16x9') await page.evaluate(() => { window.__BK_DESC_HOLD__ = true; });   // issue #132: the 7 s hold test runs on Roger's shape + desktop
  await page.evaluate(`window.bkShared = ${shared.toString()}`);
  const res = await page.evaluate(`(${stress.toString()})()`).catch(e => ({ panes: 0, faults: ['could not run: ' + e.message] }));
  // resized live: the split lays itself out again, and the shared map and clock follow it
  for (const [w, h] of c.resize || []) {
    await page.setViewportSize({ width: w, height: h }); await page.waitForTimeout(900);
    const more = await page.evaluate(tag => { const f = new Set(); window.bkShared(f, tag); return [...f]; }, `resized to ${w}x${h}`).catch(e => ['could not check after resize: ' + e.message]);
    res.faults.push(...more);
    await page.screenshot({ path: join(out, `${c.name}-${w}x${h}.jpg`), type: 'jpeg', quality: 85 });
  }
  const faults = [...res.faults, ...errors.map(e => 'page error: ' + e)];
  // the same fault usually shows in every scenario and every pane: report each kind once, with how often it came up
  const kinds = new Map(); for (const f of faults) { const k = f.replace(/^.*?: /, ''); kinds.set(k, (kinds.get(k) || 0) + 1); }
  console.log(`${kinds.size ? 'FAIL' : 'ok  '}  ${c.name.padEnd(18)} ${c.w}x${c.h}${c.touch ? ' touch' : ''}, ${res.panes} pane${res.panes === 1 ? '' : 's'}`);
  for (const [k, n] of kinds) console.log(`        ${k}${n > 1 ? `  (x${n})` : ''}`);
  total += kinds.size;
  await ctx.close();
}
await browser.close(); server.close();
console.log(`screenshots in ${out}`);
console.log(total ? `hud-check: ${total} kinds of fault` : 'hud-check: ok');
process.exit(total ? 1 : 0);
