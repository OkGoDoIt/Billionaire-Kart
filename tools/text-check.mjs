#!/usr/bin/env node
/* Sign check: loads every track in a real (headless) browser and records every piece of text the game paints onto
   a canvas (gantries, billboards, blimps, boards, name plates). Reports text that was squashed sideways by a
   maxWidth, or that runs off the edge of its canvas, and saves a start-line screenshot of each track so the
   gantry name can be looked at. Text hidden behind other geometry cannot be detected here: look at the screenshots.
   Two things are let through on purpose: signs drawn one letter at a time, and tickers far wider than their canvas.
   Usage: node tools/text-check.mjs [--out dir] [--track id]      exits 1 if anything is flagged */
import http from 'node:http';
import { readFile, mkdir } from 'node:fs/promises';
import { extname, join, normalize, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2), opt = {};
for (let i = 0; i < args.length; i++) if (args[i].startsWith('--')) { const k = args[i].slice(2); opt[k] = args[i + 1] && !args[i + 1].startsWith('--') ? args[++i] : true; }
const outdir = opt.out || '/tmp/bk-text-check'; await mkdir(outdir, { recursive: true });
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.woff2': 'font/woff2', '.mp3': 'audio/mpeg' };
const server = http.createServer(async (req, res) => { try { let p = normalize(join(root, decodeURIComponent(new URL(req.url, 'http://x').pathname))); if (p.endsWith('/')) p = join(p, 'index.html'); const d = await readFile(p); res.writeHead(200, { 'Content-Type': MIME[extname(p)] || 'application/octet-stream', 'Cache-Control': 'no-store' }); res.end(d); } catch { res.writeHead(404); res.end('nf'); } });
await new Promise(r => server.listen(0, '127.0.0.1', r));
const base = `http://127.0.0.1:${server.address().port}/`;
let browser; try { browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'] }); } catch { browser = await chromium.launch({ headless: true }); }
const init = () => {
  window.__textLog = [];
  const P = CanvasRenderingContext2D.prototype, orig = P.fillText;
  P.fillText = function (text, x, y, maxWidth) {
    try {
      const m = this.measureText(text), w = m.width, c = this.canvas, t = this.getTransform();
      const al = this.textAlign, left = al === 'center' ? x - w / 2 : (al === 'right' || al === 'end') ? x - w : x;
      const eff = maxWidth != null && w > maxWidth ? maxWidth : w, l2 = al === 'center' ? x - eff / 2 : (al === 'right' || al === 'end') ? x - eff : x;
      const rot = Math.abs(t.b) > 0.01 || Math.abs(t.c) > 0.01;
      const X0 = t.a * l2 + t.e, X1 = t.a * (l2 + eff) + t.e, top = t.d * (y - m.actualBoundingBoxAscent) + t.f, bot = t.d * (y + m.actualBoundingBoxDescent) + t.f;
      const rec = { text: String(text).slice(0, 60), font: this.font, cw: c.width, ch: c.height, squash: maxWidth != null && w > maxWidth ? +(maxWidth / w).toFixed(2) : 1, off: rot ? 0 : Math.round(Math.max(0, -Math.min(X0, X1), Math.max(X0, X1) - c.width)), offY: rot ? 0 : Math.round(Math.max(0, -Math.min(top, bot), Math.max(top, bot) - c.height)), dom: !!c.isConnected, cls: c.className || '' };
      if (String(text).trim()) window.__textLog.push(rec);
    } catch {}
    return orig.apply(this, arguments);
  };
};
const all = ['silicon-valley', 'bliss-hills', 'crypto-cove', 'datacenter-dash', 'capitol-hill', 'burning-circuit', 'mars-colony', 'singularity-speedway'];
const tracks = opt.track ? [opt.track] : all;
let total = 0;
const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 }, serviceWorkers: 'block' }); await ctx.addInitScript(init);
for (const id of tracks) {
  const page = await ctx.newPage(); const errs = []; page.on('pageerror', e => errs.push(e.message));
  await page.goto(base + `?track=${id}&r=larrysergey&intro=0&seed=3&q=high`, { waitUntil: 'load' });
  await page.waitForFunction('window.BK && BK.race', null, { timeout: 40000 }); await page.waitForTimeout(2600);
  await page.screenshot({ path: join(outdir, `start-${id}.jpg`), type: 'jpeg', quality: 86 });
  const log = await page.evaluate(() => window.__textLog);
  const seen = new Set(), flagged = [];
  let scrolling = 0;
  for (const r of log) {
    if (r.text.trim().length === 1) r.squash = 1;                       // a sign laid out one letter at a time: a narrowed letter there is a choice of typeface
    if (r.off > r.cw * 0.6) { r.off = 0; scrolling++; }                   // far wider than its canvas: a ticker that scrolls past, not a sign that was cut
    if (r.squash >= 0.9 && r.off <= 3 && r.offY <= 3) continue;
    const k = r.text + r.cw; if (seen.has(k)) continue; seen.add(k); flagged.push(r);
  }
  console.log(`\n== ${id}: ${log.length} text draws, ${flagged.length} flagged${scrolling ? ` (${scrolling} scrolling, not checked)` : ''}${errs.length ? ' ERR ' + errs[0] : ''}`);
  total += flagged.length;
  for (const r of flagged) console.log(`   ${r.squash < 0.9 ? 'squashed to ' + Math.round(r.squash * 100) + '%' : ''}${r.off > 3 ? ' runs ' + r.off + 'px off the side' : ''}${r.offY > 3 ? ' runs ' + r.offY + 'px off top/bottom' : ''} | "${r.text}" | ${r.font.slice(0, 34)} | canvas ${r.cw}x${r.ch}${r.dom ? ' (HUD ' + r.cls + ')' : ''}`);
  await page.close();
}
await browser.close(); server.close();
console.log(`\nscreenshots in ${outdir}`);
console.log(total ? `text-check: ${total} flagged` : 'text-check: ok');
process.exit(total ? 1 : 0);
