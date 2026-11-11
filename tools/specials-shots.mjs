/* specials-shots.mjs — PR screenshots for #51 (v2).
   Fixes vs v1: the menu opens on a title hero — v1 screenshotted the hero.
   v2 clicks #title-hero (scrolls to the menu), clicks the racer tile, then
   takes an ELEMENT screenshot of #racer-detail (the panel with the quote +
   SPECIAL line) at desktop 1280x800, for Bill/Thiel/Murdoch/Soros (the
   ex-AI-label four) + Elon/Trump (previously no special). It also recaptures
   the Thiel minimap shot later in a race, when the field has spread out and
   a rival is holding an item, so the revealed item icon can actually be seen
   beside a rival's minimap face. */
import http from 'http';
import { readFile } from 'fs/promises';
import { extname, join, normalize } from 'path';
import puppeteer from 'puppeteer';

const ROOT = join(process.cwd(), '..');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.webmanifest': 'application/webmanifest', '.png': 'image/png' };
const server = http.createServer(async (req, res) => {
  try {
    let p = normalize(join(ROOT, decodeURIComponent(new URL(req.url, 'http://x').pathname)));
    if (!p.startsWith(ROOT)) { res.writeHead(403); return res.end(); }
    if (p.endsWith('/')) p += 'index.html';
    const data = await readFile(p);
    res.writeHead(200, { 'Content-Type': MIME[extname(p)] || 'application/octet-stream' });
    res.end(data);
  } catch { res.writeHead(404); res.end('nf'); }
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const url = `http://127.0.0.1:${server.address().port}/index.html`;
const threeCode = await readFile(join(ROOT, 'tools/vendor/three.module.js'), 'utf-8');

const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox', '--disable-setuid-sandbox', '--enable-unsafe-swiftshader', '--use-angle=swiftshader', '--mute-audio', '--window-size=1280,800'] });

async function makePage(width, height) {
  const ctx = await browser.createBrowserContext();
  const page = await ctx.newPage();
  await page.evaluateOnNewDocument(() => { try { localStorage.setItem('bk-quality', 'low'); } catch (e) { } });
  await page.setViewport({ width, height });
  await page.setRequestInterception(true);
  page.on('request', async r => {
    const u = r.url(), marker = '/examples/jsm/';
    if (u.includes(marker)) {
      const rel = u.split(marker)[1].split('?')[0];
      try { const b = await readFile(join(ROOT, 'tools/vendor/addons', rel), 'utf-8'); r.respond({ status: 200, contentType: 'text/javascript; charset=utf-8', headers: { 'Access-Control-Allow-Origin': '*' }, body: b }); }
      catch { r.respond({ status: 404, body: 'addon not vendored: ' + rel }); }
    } else if (u.includes('cdn.jsdelivr.net/npm/three@')) {
      r.respond({ status: 200, contentType: 'text/javascript; charset=utf-8', headers: { 'Access-Control-Allow-Origin': '*' }, body: threeCode });
    } else r.continue();
  });
  page.on('pageerror', e => console.log('[pageerror]', e.message));
  await page.goto(url, { waitUntil: 'load', timeout: 240000 });
  await page.waitForFunction(() => window.BK && document.querySelectorAll('.racer-tile').length === 17, { timeout: 240000, polling: 1000 });
  return { ctx, page };
}

try {
  for (const [idx, slug] of [[11, 'bill'], [12, 'thiel'], [15, 'murdoch'], [16, 'soros'], [0, 'elon'], [8, 'trump']]) {
    const { ctx, page } = await makePage(1280, 800);
    await page.evaluate(() => { document.querySelector('#title-hero')?.click(); });
    await new Promise(r => setTimeout(r, 1000));
    await page.evaluate((i) => { document.querySelectorAll('.racer-tile')[i].click(); }, idx);
    await new Promise(r => setTimeout(r, 1500));
    const el = await page.$('#racer-detail');
    const path = join(ROOT, `screenshots/pr-specials/detail-${slug}-desktop.png`);
    await el.screenshot({ path });
    const trait = await page.evaluate(() => document.querySelector('#racer-detail')?.textContent.replace(/\s+/g, ' ').slice(0, 200) || '');
    console.log(`SHOT ${slug} (idx ${idx}) -> ${path} | ${trait}`);
    await ctx.close();
  }

  // Thiel minimap, mid-race: wait for spread field + a rival holding an item
  {
    const { ctx, page } = await makePage(1280, 800);
    await page.evaluate(() => { BK.start(12, 0); BK.skipCountdown(); BK.autopilot(true); BK.setTimescale(3); });
    await page.waitForFunction(() => BK.state().state === 'racing', { timeout: 300000, polling: 1000 });
    const deadline = Date.now() + 900000;
    let ok = false, info = null;
    while (Date.now() < deadline) {
      info = await page.evaluate(() => {
        const st = BK.state();
        const holders = st.karts.filter(k => !k.isPlayer && k.item).map(k => `${k.name}:${k.item}`);
        const conts = st.karts.map(k => k.continuous);
        const spread = Math.max(...conts) - Math.min(...conts);
        return { rt: st.raceTime, holders, spread };
      });
      if (info.rt > 20 && info.holders.length && info.spread > 120) { ok = true; break; }
      await new Promise(r => setTimeout(r, 1000));
    }
    const path = join(ROOT, 'screenshots/pr-specials/thiel-minimap-desktop.png');
    await page.screenshot({ path });
    console.log(`SHOT thiel-minimap -> ${path} | spreadField=${ok} raceTime=${info?.rt?.toFixed(1)} holders=${JSON.stringify(info?.holders)} spread=${info?.spread?.toFixed(0)}`);
    await ctx.close();
  }
} finally {
  await browser.close();
  server.close();
}
console.log('DONE');
