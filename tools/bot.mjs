#!/usr/bin/env node
/* End-to-end check in a real (headless) browser: walks the menus with the
   keyboard, starts a race, pauses, lets an autopilot finish a one-lap race, and
   reads the results screen. Fails on any page error. Saves screenshots.
   Usage: node tools/bot.mjs [--out dir] [--mobile] [--keep-going] */
import http from 'node:http';
import { readFile, mkdir } from 'node:fs/promises';
import { extname, join, normalize, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2), opt = {};
for (let i = 0; i < args.length; i++) if (args[i].startsWith('--')) { const k = args[i].slice(2); opt[k] = args[i + 1] && !args[i + 1].startsWith('--') ? args[++i] : true; }
const out = opt.out || '/tmp/bk-bot'; await mkdir(out, { recursive: true });
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
const mobile = !!opt.mobile;
const ctx = await browser.newContext({ viewport: mobile ? { width: 844, height: 390 } : { width: 1280, height: 720 }, hasTouch: mobile, isMobile: mobile, deviceScaleFactor: mobile ? 2 : 1, serviceWorkers: 'block' });
const page = await ctx.newPage();
const errors = [], fails = [];
page.on('pageerror', e => errors.push('pageerror: ' + e.message));
page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
const shot = async name => { await page.screenshot({ path: join(out, name + '.jpg'), type: 'jpeg', quality: 85 }); };
const key = async (k, wait = 260) => { await page.keyboard.press(k); await page.waitForTimeout(wait); };
const screen = () => page.evaluate('BK.app.menus.screen?.spec.name || null');
const expect = async (name, what) => { const s = await screen(); if (s !== name) { fails.push(`${what}: expected screen "${name}", got "${s}"`); if (!opt['keep-going']) throw new Error(fails.at(-1)); } };
const tapOrKey = async (selector, k) => { if (mobile) { await page.locator(selector).first().tap(); await page.waitForTimeout(350); } else await key(k); };

try {
  await page.goto(base, { waitUntil: 'load' });
  await page.waitForFunction('window.BK && BK.app && BK.app.menus.screen', null, { timeout: 30000 });
  await page.waitForTimeout(1800); await expect('title', 'boot'); await shot('01-title');
  if (mobile) await page.locator('.screen-title').tap(); else await key('Enter');
  await page.waitForTimeout(500); await expect('main', 'after title'); await shot('02-main');
  // Quick Race
  if (mobile) await page.locator('.main-nav .btn.c2').tap(); else { await key('ArrowDown'); await key('Enter'); }
  await page.waitForTimeout(400); await expect('players', 'quick race'); await shot('03-players');
  await tapOrKey('.pcount', 'Enter');
  await page.waitForTimeout(900); await expect('racers', 'one player'); await shot('04-racers');
  if (!mobile) { await key('ArrowRight'); await key('ArrowDown'); await page.waitForTimeout(700); await shot('05-racers-moved'); }
  await tapOrKey('.racer-tile.focus, .racer-tile', 'Enter');
  await page.waitForTimeout(500); await expect('setup', 'racer chosen'); await shot('06-setup');
  if (mobile) await page.locator('.foot .btn.go').tap(); else { await key('Enter'); await key('Enter'); }
  await page.waitForTimeout(500); await expect('tracks', 'setup done'); await shot('07-tracks');
  await tapOrKey('.card.track', 'Enter');
  await page.waitForFunction('BK.race && !BK.app.attract', null, { timeout: 20000 });
  await page.waitForTimeout(1500); await shot('08-intro');
  // skip the flyover, hand the kart to the autopilot, shorten to one lap
  await page.evaluate('BK.session.skipIntro()');
  await page.waitForFunction('BK.session.phase !== "intro"', null, { timeout: 10000 });
  await page.waitForTimeout(1200); await shot('09-countdown');
  await page.waitForFunction('!BK.race.frozen', null, { timeout: 15000 });
  if (!mobile) { await page.keyboard.down('KeyW'); await page.waitForTimeout(2500); await shot('10-driving'); await page.keyboard.down('KeyD'); await page.keyboard.down('Space'); await page.waitForTimeout(1300); await shot('11-drifting'); await page.keyboard.up('Space'); await page.keyboard.up('KeyD'); await page.keyboard.up('KeyW'); }
  else { await page.waitForTimeout(3000); await shot('10-driving'); }
  const moved = await page.evaluate('BK.race.players[0].speed');
  if (!(moved > 3)) fails.push(`player kart is not moving (speed ${moved})`);
  // pause and resume
  if (mobile) await page.locator('.tc-pause').tap(); else await key('Escape');
  await page.waitForTimeout(400); await expect('pause', 'pause'); await shot('12-pause');
  await tapOrKey('.panel.narrow .btn', 'Enter'); await page.waitForTimeout(300);
  if (await screen()) fails.push('pause menu did not close on Resume');
  // let an AI driver finish a shortened race for us
  await page.evaluate(`(async () => { const { AIDriver } = await import('./src/race/ai.js'); const { makeRng } = await import('./src/core/util.js'); const s = BK.session; s.race.laps = 1; s.autopilots = s.race.players.map(k => new AIDriver(k, 'hard', makeRng(5))); })()`);
  await page.waitForFunction('BK.app.menus.screen?.spec.name === "results"', null, { timeout: 120000 });
  await page.waitForTimeout(1200); await shot('13-results');
  const res = await page.evaluate('BK.race.results().map(r => r.racer.id + ":" + r.time.toFixed(1)).join(" ")');
  console.log('results:', res);

  if (opt.gp) {
    // a whole Grand Prix on autopilot with one-lap races, through to the podium
    const autopilot = `(async () => { const { AIDriver } = await import('./src/race/ai.js'); const { makeRng } = await import('./src/core/util.js'); const s = BK.session; s.skipIntro(); s.race.laps = 1; s.autopilots = s.race.players.map(k => new AIDriver(k, 'hard', makeRng(5))); })()`;
    await page.evaluate(`BK.app.quitToMenu()`); await page.waitForFunction('BK.app.menus.screen?.spec.name === "main"', null, { timeout: 15000 }); await page.waitForTimeout(600);
    await page.evaluate(`(() => { const a = BK.app; a.flow = { mode: 'gp', players: 1, devices: ['any'], racers: ['jensen'], cc: 150, level: 'easy' }; a.menus.open('cups'); })()`);
    await page.waitForTimeout(700); await expect('cups', 'grand prix cups'); await shot('20-cups');
    await page.evaluate(`document.querySelector('.card.cup:not([disabled])').click()`);
    const races = await page.evaluate('BK.app.gp ? BK.app.gp.tracks.length : 0');
    for (let r = 0; r < races; r++) {
      await page.waitForFunction(`BK.race && !BK.app.attract && BK.app.gp && BK.app.gp.index === ${r} && BK.session.phase`, null, { timeout: 30000 });
      await page.waitForTimeout(500); await page.evaluate(autopilot);
      await page.waitForFunction('BK.app.menus.screen?.spec.name === "results"', null, { timeout: 150000 });
      await page.waitForTimeout(900); await shot(`21-gp-results-${r + 1}`);
      await key('Enter', 600);
    }
    await page.waitForFunction('BK.app.menus.screen?.spec.name === "cupResults"', null, { timeout: 30000 }).catch(() => fails.push('no cup results screen after the last race'));
    await page.waitForTimeout(2500); await shot('22-podium');
    console.log('cup totals:', await page.evaluate('JSON.stringify(BK.app.gp.totals)'));
    await key('Enter', 1200); await expect('main', 'after the podium');
  }
} catch (e) { fails.push('aborted: ' + e.message); await shot('99-failure').catch(() => {}); }
await browser.close(); server.close();
const realErrors = [...new Set(errors)].filter(e => !/favicon/.test(e));
console.log(`screenshots in ${out}`);
if (realErrors.length) console.log('PAGE ERRORS:\n' + realErrors.slice(0, 12).join('\n'));
if (fails.length) console.log('FAILED:\n' + fails.join('\n'));
if (!realErrors.length && !fails.length) console.log('bot: ok');
process.exit(realErrors.length || fails.length ? 1 : 0);
