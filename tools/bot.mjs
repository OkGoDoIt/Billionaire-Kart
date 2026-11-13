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
import { takeSlot } from './slot.mjs';

await takeSlot('bot');   // two heavy jobs at a time on this machine: see slot.mjs

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
/* Words split across two lines on the current menu screen. A name that wraps as "Subpo / ena" is a layout bug that
   no overflow check sees, because the text still fits its box. Hyphenated words may break at the hyphen. */
const brokenWords = () => page.evaluate(() => {
  const root = document.querySelector('.menu-screen'); if (!root) return [];
  const out = new Set(), walk = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  for (let n; (n = walk.nextNode());) {
    if (!n.parentElement?.offsetParent) continue;
    const re = /[^\s-]+-?/g;
    for (let m; (m = re.exec(n.textContent));) { const r = document.createRange(); r.setStart(n, m.index); r.setEnd(n, m.index + m[0].length); if (new Set([...r.getClientRects()].filter(q => q.width > 0.5).map(q => Math.round(q.top))).size > 1) out.add(m[0]); }
  }
  return [...out];
});
const expect = async (name, what) => {
  const s = await screen(); if (s !== name) { fails.push(`${what}: expected screen "${name}", got "${s}"`); if (!opt['keep-going']) throw new Error(fails.at(-1)); }
  // every screen: nothing unrendered in the text, and nothing pushed off the top or bottom
  const bad = await page.evaluate(() => { const e = document.querySelector('.menu-screen'); if (!e) return null; const over = e.scrollHeight - e.clientHeight; return (/\[object |undefined|NaN/.test(e.textContent) ? 'unrendered value in the text; ' : '') + (over > 6 ? `content is ${over}px taller than the screen` : ''); });
  if (bad && !(mobile && s === 'options' && !bad.includes('unrendered'))) fails.push(`${what}: screen "${s}": ${bad}`);   // on a phone the options list scrolls by touch, with rows big enough to tap
  const split = await brokenWords(); if (split.length) fails.push(`${what}: screen "${s}": words broken across lines: ${split.join(', ')}`);
  // the turntable karts belong only to screens that place them; anywhere else they end up half hidden behind the cards
  const stray = await page.evaluate(() => { const A = BK.app; return !!A.showroom && !A.menus.screen?.stage && A.showroom.slots.some(x => x.group.visible); });
  if (stray) fails.push(`${what}: screen "${s}": a turntable kart is showing behind a screen that has no place for it`);
};
/* Average brightness of the game canvas (0 to 1), read in the same frame it was drawn. A NaN anywhere in the
   scene turns the whole picture black after the bloom pass without raising an error, so this is the only way to see it. */
const luma = () => page.evaluate(() => new Promise(res => requestAnimationFrame(() => {
  const c = document.createElement('canvas'); c.width = 64; c.height = 36; const g = c.getContext('2d', { willReadFrequently: true });
  g.drawImage(BK.gfx.renderer.domElement, 0, 0, 64, 36); const d = g.getImageData(0, 0, 64, 36).data;
  let s = 0; for (let i = 0; i < d.length; i += 4) s += d[i] + d[i + 1] + d[i + 2]; res(s / (d.length * 0.75 * 255));
})));
const tapOrKey = async (selector, k) => { if (mobile) { await page.locator(selector).first().tap(); await page.waitForTimeout(350); } else await key(k); };

try {
  await page.goto(base, { waitUntil: 'load' });
  await page.waitForFunction('window.BK && BK.app && BK.app.menus.screen', null, { timeout: 30000 });
  await page.waitForTimeout(1800); await expect('title', 'boot'); await shot('01-title');
  if (mobile) await page.locator('.screen-title').tap(); else await key('Enter');
  await page.waitForTimeout(500); await expect('main', 'after title'); await shot('02-main');
  // the screens off the main menu that are not on the way to a race
  for (const name of ['howto', 'items', 'options', 'records']) {
    await page.evaluate(`BK.app.menus.open('${name}')`); await page.waitForTimeout(500); await expect(name, name); await shot('02-' + name);
    await page.evaluate('BK.app.menus.back()'); await page.waitForTimeout(350); await expect('main', 'back from ' + name);
  }
  // Quick Race
  if (mobile) await page.locator('.main-nav .btn.c2').tap(); else { await key('ArrowDown'); await key('Enter'); }
  await page.waitForTimeout(400); await expect('players', 'quick race'); await shot('03-players');
  await tapOrKey('.pcount', 'Enter');
  await page.waitForTimeout(900); await expect('racers', 'one player'); await shot('04-racers');
  if (!mobile) { await key('ArrowRight'); await key('ArrowDown'); await page.waitForTimeout(700); await shot('05-racers-moved'); }
  if (mobile) {
    // looking and choosing are separate: a tap on a tile shows that racer and stays put; the button under the card picks them
    await page.locator('.racer-tile').nth(6).tap(); await page.waitForTimeout(500); await expect('racers', 'tapped a racer tile');
    const card = await page.evaluate(() => ({ name: document.querySelector('.racer-card h2')?.textContent, quote: document.querySelector('.r-quote')?.textContent, bio: document.querySelector('.r-bio')?.textContent, go: document.querySelector('.r-go')?.textContent, quoteShown: !!document.querySelector('.r-quote')?.offsetHeight }));
    if (card.name !== 'Dario' || !card.quoteShown || !(card.bio || '').length || card.go !== 'Choose Dario') fails.push('racer card does not show the tapped racer with quote, description, and a Choose button: ' + JSON.stringify(card));
    await shot('05-racers-moved'); await page.locator('.r-go').tap(); await page.waitForTimeout(350);
  } else await key('Enter');
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
  if (!mobile) {
    // the first-race key hint must not sit on any corner of the HUD
    const clash = await page.evaluate(() => {
      const h = document.querySelector('.hint-card'); if (!h) return 'did not appear';
      const a = h.getBoundingClientRect();
      const hit = ['.hud-rank', '.hud-bl', '.hud-item', '.hud-map', '.hud-time'].filter(sel => { const e = document.querySelector(sel); if (!e) return false; const b = e.getBoundingClientRect(); return a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom; });
      return hit.length ? 'overlaps ' + hit.join(', ') : '';
    });
    if (clash) fails.push(`first-race hint ${clash}`);
  }
  await page.waitForFunction('!BK.race.frozen', null, { timeout: 15000 });
  if (!mobile) { await page.keyboard.down('KeyW'); await page.waitForTimeout(2500); await shot('10-driving'); await page.keyboard.down('KeyD'); await page.keyboard.down('Space'); await page.waitForTimeout(1300); await shot('11-drifting'); await page.keyboard.up('Space'); await page.keyboard.up('KeyD'); await page.keyboard.up('KeyW'); }
  else {
    // touch: the right half is the pedal and the left half steers; nothing moves until the pedal is held
    const touch = (sel, type, id, x, y) => page.dispatchEvent(sel, type, { pointerId: id, pointerType: 'touch', isPrimary: id === 1, clientX: x, clientY: y, bubbles: true, cancelable: true });
    const vw = page.viewportSize(), T = 'BK.app.input.touch';
    await page.waitForTimeout(700);
    if (await page.evaluate('BK.race.players[0].speed') > 1) fails.push('touch: the kart drove off without the pedal being held');
    await touch('.tc-right', 'pointerdown', 1, vw.width * 0.8, vw.height * 0.6); await page.waitForTimeout(2600); await shot('10-driving');
    if (await page.evaluate(`${T}.throttle`) !== 1) fails.push('touch: holding the right side does not accelerate');
    // hold produces speed, not just a throttle flag; poll, because a loaded machine advances the race slowly
    await page.waitForFunction('BK.race.players[0].speed > 3', null, { timeout: 8000 }).catch(() => fails.push('touch: holding the right side does not produce speed'));
    await touch('.tc-left', 'pointerdown', 2, vw.width * 0.2, vw.height * 0.7); await touch('.tc-left', 'pointermove', 2, vw.width * 0.2 + 40, vw.height * 0.7); await page.waitForTimeout(150);
    if (!(await page.evaluate(`${T}.steer`) > 0.3)) fails.push('touch: sliding the left thumb does not steer');
    await touch('.tc-left', 'pointerup', 2, vw.width * 0.2 + 40, vw.height * 0.7);
    await page.evaluate("BK.race.items.give(BK.race.players[0], 'boost')"); await page.waitForTimeout(200);
    await touch('.tc-left', 'pointerdown', 2, vw.width * 0.25, vw.height * 0.5); await page.waitForTimeout(60); await touch('.tc-left', 'pointerup', 2, vw.width * 0.25, vw.height * 0.5); await page.waitForTimeout(400);
    if (await page.evaluate('BK.race.players[0].item')) fails.push('touch: a tap on the left side did not use the item');
    await page.evaluate("BK.race.items.give(BK.race.players[0], 'leak')"); await page.waitForTimeout(200);
    await touch('.tc-right', 'pointermove', 1, vw.width * 0.8, vw.height * 0.6 + 60); await page.waitForTimeout(150);
    if (await page.evaluate(`${T}.brake`) !== 1) fails.push('touch: pulling the right thumb down does not brake');
    await touch('.tc-right', 'pointermove', 1, vw.width * 0.8, vw.height * 0.6); await page.waitForTimeout(900);
    if (await page.evaluate(`${T}.brake`) !== 0) fails.push('touch: sliding the right thumb back up does not release the brake');
    if (await page.evaluate(`${T}.throttle`) !== 1) fails.push('touch: the pedal does not take over again after braking');
    if (!(await page.evaluate('BK.race.players[0].item'))) fails.push('touch: letting off the brake used the item');
    // flick up on the pedal: a fast upward swipe fires the item; two moves, because the pedal judges the flick from recent motion
    await page.evaluate("BK.race.items.give(BK.race.players[0], 'boost')"); await page.waitForTimeout(200);
    await touch('.tc-right', 'pointermove', 1, vw.width * 0.8, vw.height * 0.6 - 10); await page.waitForTimeout(60);
    await touch('.tc-right', 'pointermove', 1, vw.width * 0.8, vw.height * 0.6 - 70); await page.waitForTimeout(400);
    if (await page.evaluate('BK.race.players[0].item')) fails.push('touch: a flick up on the right side did not use the item');
    // a second flick on the same touch works too (the kart is held on the pedal the whole race)
    await page.evaluate("BK.race.items.give(BK.race.players[0], 'leak')"); await page.waitForTimeout(100);
    await touch('.tc-right', 'pointermove', 1, vw.width * 0.8, vw.height * 0.6 - 80); await page.waitForTimeout(60);
    await touch('.tc-right', 'pointermove', 1, vw.width * 0.8, vw.height * 0.6 - 140); await page.waitForTimeout(250);
    if (await page.evaluate('BK.race.players[0].item')) fails.push('touch: a second flick up on the same touch did not use the item');
    // the grace latch: a quick lift of the pedal thumb must not cut the throttle, and re-gripping keeps it
    await touch('.tc-right', 'pointermove', 1, vw.width * 0.8, vw.height * 0.6 - 130); await page.waitForTimeout(100);
    await touch('.tc-right', 'pointerup', 1, vw.width * 0.8, vw.height * 0.6 - 130); await page.waitForTimeout(120);
    if (await page.evaluate(`${T}.throttle`) !== 1) fails.push('touch: a quick lift of the right thumb cuts the throttle (no grace latch)');
    await touch('.tc-right', 'pointerdown', 1, vw.width * 0.8, vw.height * 0.6); await page.waitForTimeout(150);
    if (await page.evaluate(`${T}.throttle`) !== 1) fails.push('touch: re-gripping the pedal does not keep the throttle');
    // an upright phone pauses the race and asks for a turn; back on its side, Resume returns
    await page.setViewportSize({ width: vw.height, height: vw.width }); await page.waitForTimeout(700); await expect('pause', 'phone turned upright mid-race');
    if (!(await page.evaluate("!!document.querySelector('.panel.turn')"))) fails.push('upright phone: the pause panel does not ask for a turn');
    await shot('10c-upright');
    await page.setViewportSize(vw); await page.waitForTimeout(700);
    if (await page.evaluate("!!document.querySelector('.panel.turn')")) fails.push('phone back on its side: the pause panel still asks for a turn');
    await page.locator('.panel.narrow .btn').first().tap(); await page.waitForTimeout(400);
    if (await screen()) fails.push('pause menu did not close on Resume after turning the phone back');
    await touch('.tc-right', 'pointerup', 1, vw.width * 0.8, vw.height * 0.6);
    await touch('.tc-right', 'pointerdown', 1, vw.width * 0.8, vw.height * 0.6); await page.waitForTimeout(1500);
  }
  const moved = await page.evaluate('BK.race.players[0].speed');
  if (!(moved > 3)) fails.push(`player kart is not moving (speed ${moved})`);
  // every kart boosts at once: flames, speed lines, and bloom all on screen, and the picture must still be there
  await page.evaluate("for (const k of BK.race.karts) k.boost('pad', 1.2, 1.3)"); await page.waitForTimeout(450);
  const bright = await luma(); await shot('10b-boost');
  if (!(bright > 0.05)) fails.push(`the picture went dark during a boost (brightness ${bright.toFixed(3)})`);
  // pause and resume
  if (mobile) await page.locator('.tc-pause').tap(); else await key('Escape');
  await page.waitForTimeout(400); await expect('pause', 'pause'); await shot('12-pause');
  await tapOrKey('.panel.narrow .btn', 'Enter'); await page.waitForTimeout(300);
  if (await screen()) fails.push('pause menu did not close on Resume');
  // let an AI driver finish a shortened race for us
  await page.evaluate(`(async () => { const { AIDriver } = await import('./src/race/ai.js'); const { makeRng } = await import('./src/core/util.js'); const s = BK.session; s.race.laps = 1; s.autopilots = s.race.players.map(k => new AIDriver(k, 'hard', makeRng(5))); })()`);
  // a Quick Race ends on the podium now (#92); the full table is one confirm past it
  await page.waitForFunction('BK.app.menus.screen?.spec.name === "racePodium"', null, { timeout: 120000 });
  await page.waitForTimeout(1500); await shot('13-podium');
  if (!(await page.evaluate("!!BK.app.showroom?.podium && BK.app.showroom.slots.length === 3"))) fails.push('quick race podium: the showroom is not showing a three-kart podium');
  await tapOrKey('.screen-racePodium .btn.go', 'Enter');
  await page.waitForFunction('BK.app.menus.screen?.spec.name === "results"', null, { timeout: 30000 });
  await page.waitForTimeout(1200); await shot('13-results');
  const res = await page.evaluate('[...document.querySelectorAll(".screen-results .res-row")].map(r => r.textContent.trim().replace(/\\s+/g, " ")).join(" | ")');
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
    // the podium screen offers a way back in, not just a way out (#146): the default button runs the same cup again from race 1
    const exits = await page.evaluate(`[...document.querySelectorAll('.screen-cupResults .foot .btn .btn-label')].map(e => e.textContent)`);
    if (JSON.stringify(exits) !== JSON.stringify(['Race this cup again', 'Change racer', 'Continue'])) fails.push(`cup results exits: ${exits.join(' / ')}`);
    await key('Enter', 1200);
    await page.waitForFunction('BK.app.gp && BK.app.gp.index === 0 && BK.session && !BK.app.menus.screen', null, { timeout: 30000 }).catch(() => fails.push('Race this cup again did not start a fresh cup'));
    const fresh = await page.evaluate('JSON.stringify(BK.app.gp.totals)');
    if (Object.values(JSON.parse(fresh)).some(v => v !== 0)) fails.push(`cup restart kept the old standings: ${fresh}`);
    console.log('cup restarted, totals:', fresh);
  }
  if (mobile && !opt.gp) {
    // every menu screen with the phone upright: nothing may spill off the sides, and nothing may be left unrendered
    await page.evaluate('BK.app.quitToMenu()'); await page.waitForFunction('BK.app.menus.screen?.spec.name === "main"', null, { timeout: 15000 });
    await page.setViewportSize({ width: 390, height: 844 }); await page.waitForTimeout(800);
    const flow = "BK.app.flow = { mode: 'vs', players: 1, devices: ['any'], racers: ['zuck'], cc: 100, level: 'normal' };";
    for (const [name, open] of [['main', "BK.app.menus.reset('main')"], ['players', "BK.app.menus.open('players')"], ['racers', "BK.app.flow.racers = []; BK.app.menus.open('racers', { player: 0 })"], ['setup', "BK.app.menus.open('setup')"], ['cups', "BK.app.menus.open('cups')"], ['tracks', "BK.app.menus.open('tracks')"], ['options', "BK.app.menus.open('options')"], ['howto', "BK.app.menus.open('howto')"], ['items', "BK.app.menus.open('items')"], ['records', "BK.app.menus.open('records')"]]) {
      await page.evaluate(`${flow} BK.app.menus.reset('main'); ${open}`); await page.waitForTimeout(600);
      const bad = await page.evaluate(() => { const e = document.querySelector('.menu-screen'), w = innerWidth; if (!e) return 'no screen'; const wide = [...e.querySelectorAll('*')].filter(n => n.offsetParent && (n.getBoundingClientRect().right > w + 2 || n.getBoundingClientRect().left < -2)).length; return (/\[object |undefined|NaN/.test(e.textContent) ? 'unrendered value in the text; ' : '') + (wide ? `${wide} elements reach past the sides; ` : '') + (e.scrollWidth > e.clientWidth + 2 ? 'scrolls sideways' : ''); });
      if (bad) fails.push(`upright phone, screen "${name}": ${bad}`);
      const split = await brokenWords(); if (split.length) fails.push(`upright phone, screen "${name}": words broken across lines: ${split.join(', ')}`);
      await shot('30-upright-' + name);
    }
  }
} catch (e) { fails.push('aborted: ' + e.message); await shot('99-failure').catch(() => {}); }
await browser.close(); server.close();
const realErrors = [...new Set(errors)].filter(e => !/favicon/.test(e));
console.log(`screenshots in ${out}`);
if (realErrors.length) console.log('PAGE ERRORS:\n' + realErrors.slice(0, 12).join('\n'));
if (fails.length) console.log('FAILED:\n' + fails.join('\n'));
if (!realErrors.length && !fails.length) console.log('bot: ok');
process.exit(realErrors.length || fails.length ? 1 : 0);
