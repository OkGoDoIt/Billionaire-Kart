/* specials-minimap.mjs — Thiel Total Awareness minimap capture for #51.
   Races as Thiel (autopilot) until the field has spread and at least one
   RIVAL holds an item, then screenshots: the minimap draws that rival's item
   icon beside their face (only when playing Thiel). Detach-resilient: if the
   SwiftShader renderer drops the frame, the page is rebuilt and the race
   restarted (max 3 attempts). */
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

async function makePage() {
  const ctx = await browser.createBrowserContext();
  const page = await ctx.newPage();
  await page.evaluateOnNewDocument(() => { try { localStorage.setItem('bk-quality', 'low'); } catch (e) { } });
  await page.setViewport({ width: 1280, height: 800 });
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
  await page.goto(url, { waitUntil: 'load', timeout: 240000 });
  await page.waitForFunction(() => window.BK && document.querySelectorAll('.racer-tile').length === 17, { timeout: 240000, polling: 1000 });
  return { ctx, page };
}

let done = false;
for (let attempt = 1; attempt <= 3 && !done; attempt++) {
  let ctx, page;
  try {
    ({ ctx, page } = await makePage());
    await page.evaluate(() => { BK.start(12, 0); BK.skipCountdown(); BK.autopilot(true); BK.setTimescale(3); });
    await page.waitForFunction(() => BK.state().state === 'racing', { timeout: 300000, polling: 1000 });
    const deadline = Date.now() + 720000;
    let info = null;
    while (Date.now() < deadline) {
      info = await page.evaluate(() => {
        const st = BK.state();
        const pCont = st.player.continuous;
        const rivals = st.karts.filter(k => Math.abs(k.continuous - pCont) > 0.001 || k.item == null); // karts[] has no isPlayer flag; identify rivals by item+name below
        const holders = st.karts.filter(k => k.item && k.name !== 'Thiel').map(k => `${k.name}:${k.item}`);
        const conts = st.karts.map(k => k.continuous);
        return { rt: st.raceTime, holders, spread: Math.max(...conts) - Math.min(...conts) };
      });
      if (info.rt > 15 && info.holders.length && info.spread > 100) {
        const path = join(ROOT, 'screenshots/pr-specials/thiel-minimap-desktop.png');
        await page.screenshot({ path });
        console.log(`SHOT thiel-minimap -> ${path} | attempt=${attempt} raceTime=${info.rt.toFixed(1)} holders=${JSON.stringify(info.holders)} spread=${info.spread.toFixed(0)}`);
        done = true;
        break;
      }
      await new Promise(r => setTimeout(r, 1000));
    }
    if (!done) console.log(`attempt ${attempt}: condition not met within budget (last=${JSON.stringify(info)})`);
  } catch (e) {
    console.log(`attempt ${attempt} failed: ${e.message} — rebuilding page`);
  } finally {
    if (ctx) await ctx.close().catch(() => {});
  }
}
await browser.close();
server.close();
console.log(done ? 'DONE' : 'NOT CAPTURED');
process.exit(done ? 0 : 1);
