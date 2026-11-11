/* tools/itemfx-shots.mjs — PR screenshot harness for the item world-FX pass.
   Captures effects mid-action at desktop 1280x800 into screenshots/pr-item-fx/.
   Same serving + CDN-interception pattern as tools/bot-test.mjs. Fails on
   console errors. Slow timescale (0.25) stretches short effects so the
   screenshot lands inside the effect window. */
import http from 'http';
import { readFile, mkdir } from 'fs/promises';
import { extname, join, normalize } from 'path';
import { fileURLToPath } from 'url';
import puppeteer from 'puppeteer';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const OUT = join(ROOT, 'screenshots', 'pr-itemfx');
await mkdir(OUT, { recursive: true });
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.webmanifest': 'application/manifest+json', '.png': 'image/png', '.md': 'text/markdown', '.woff2': 'font/woff2' };
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
const threeCode = await readFile(join(ROOT, 'tools', 'vendor', 'three.module.js'), 'utf-8');
const sleep = ms => new Promise(r => setTimeout(r, ms));

const errors = [];
const browser = await puppeteer.launch({
  headless: 'new',
  args: ['--no-sandbox', '--disable-setuid-sandbox', '--enable-unsafe-swiftshader', '--use-angle=swiftshader', '--mute-audio', '--window-size=1280,800'],
});
const page = await browser.newPage();
await page.setViewport({ width: 1280, height: 800 });
await page.setRequestInterception(true);
const addonCache = new Map();
page.on('request', async r => {
  const u = r.url(), marker = '/examples/jsm/';
  if (u.includes(marker)) {
    const rel = u.split(marker)[1].split('?')[0];
    try {
      if (!addonCache.has(rel)) addonCache.set(rel, await readFile(join(ROOT, 'tools', 'vendor', 'addons', rel), 'utf-8'));
      r.respond({ status: 200, contentType: 'text/javascript; charset=utf-8', headers: { 'Access-Control-Allow-Origin': '*' }, body: addonCache.get(rel) });
    } catch { r.respond({ status: 404, body: 'addon not vendored: ' + rel }); }
  } else if (u.includes('cdn.jsdelivr.net/npm/three@')) {
    r.respond({ status: 200, contentType: 'text/javascript; charset=utf-8', headers: { 'Access-Control-Allow-Origin': '*' }, body: threeCode });
  } else r.continue();
});
page.on('console', m => { if (m.type() === 'error') errors.push(`[console] ${m.text()}`); });
page.on('pageerror', e => errors.push(`[pageerror] ${e.message}`));
page.on('requestfailed', r => { if (!r.url().includes('sw.js')) errors.push(`[requestfailed] ${r.url()}`); });
await page.evaluateOnNewDocument(() => { if (navigator.serviceWorker) navigator.serviceWorker.register = () => Promise.reject(new Error('shots: SW disabled')); });
await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 180000 });
await page.waitForFunction(() => window.BK && document.querySelectorAll('.racer-tile').length === 17, { timeout: 240000 });
await page.evaluate(() => document.fonts.ready);
await sleep(500);

const shot = async name => { await page.screenshot({ path: join(OUT, name) }); console.log('saved', name); };
const bk = fn => page.evaluate(fn);
const startRace = async (ts = 0.5) => {
  await bk(ts2 => { BK.start(0, 0); BK.skipCountdown(); BK.autopilot(true); BK.setTimescale(ts2); }, ts);
  // wait until the race is genuinely underway and the grid has spread out —
  // captures taken in the first second are all start-line scrum + GO banner
  for (let i = 0; i < 60; i++) { const rt = await bk(() => BK.state().raceTime); if (rt > 5) break; await sleep(500); }
};
const use = async id => { await bk(id2 => { BK.giveItem(id2); BK.useItem(); }, id); };

// 1. held item orbiting the kart (Viral Tweet, unused) + 2. boost flames on the same run
await startRace();
await bk(() => BK.giveItem('red'));
await sleep(900);
await shot('held-red-orbit.png');
await use('boost');
await sleep(700);
await shot('boost-flames.png');

// 3. star trail + emissive flash + gold aura
await use('star');
await sleep(900);
await shot('star-trail.png');

// 3b. Series F: gold sparkle trail + gold boost flames (tap ITEM to re-boost inside the window)
await bk(() => { BK.giveItem('golden'); BK.useItem(); });
await sleep(250);
await bk(() => BK.useItem());
await sleep(750);
await shot('seriesf-trail.png');

// 4. horn shockwave ring (slow timescale keeps the 0.5s ring catchable)
await use('horn');
await sleep(380);
await shot('horn-ring.png');

// 5. Data Leak puddle behind the kart
await use('banana');
await sleep(500);
await shot('leak-puddle.png');

// 6. lightning: sky flash + bolts + arcs (victims shrink + drop items)
await use('lightning');
await sleep(140);
await shot('lightning-strike.png');
await sleep(900);
await shot('lightning-shrunk.png');

// 7. bailout: gold aura + guiding beacon + trail
await use('bailout');
await sleep(1200);
await shot('bailout-beacon.png');

// 8. boo: ghost translucency + wisps
await use('boo');
await sleep(500);
await shot('boo-ghost.png');

// 9. bomb: armed fuse glow, then burst-capture the explosion
await use('bomb');
await sleep(700);
await shot('bomb-armed.png');
for (let i = 0; i < 6; i++) { await sleep(320); await shot(`bomb-burst-${i}.png`); }

// 10. blue shell: get the player to 1st so the Suit detonates just ahead of the camera
await startRace(3);
let rank = 99;
for (let i = 0; i < 40 && rank !== 1; i++) { await sleep(1000); rank = await bk(() => BK.state().player?.rank ?? 99); }
console.log('player rank for blue shot:', rank);
await use('blue');
for (let i = 0; i < 10; i++) { await sleep(180); await shot(`blue-explosion-${i}.png`); }

// 11. green shell trail (fire straight ahead, catch the ribbon)
await startRace(0.5);
await use('green');
await sleep(450);
await shot('green-trail.png');

// 12. Data Leak on ELEVATED terrain (Mars GP): proves FX ground anchors ride
// roadYAt — the puddle must hug the crest road, not float at y=0 or sink.
await bk(() => { BK.start(0, 1); BK.skipCountdown(); BK.autopilot(true); BK.setTimescale(3); });
let py = 0;
for (let i = 0; i < 120; i++) { const st = await bk(() => BK.state()); py = st.player?.pos[1] ?? 0; if (py > 6.5 && st.raceTime > 4) break; await sleep(700); }
console.log('Mars elevation at leak drop: player y =', py);
await bk(() => { BK.giveItem('banana'); BK.useItem(); });
await sleep(420);
await shot('leak-puddle-elevated.png');

// 13. mobile landscape 932x430: Bailout aura/beacon with the touch HUD up
await page.setViewport({ width: 932, height: 430 });
await startRace(1);
await use('bailout');
await sleep(1100);
await shot('bailout-mobile.png');

console.log('errors:', errors.length ? errors : 'none');
await browser.close();
server.close();
if (errors.length) { console.error(errors.join('\n')); process.exit(1); }
