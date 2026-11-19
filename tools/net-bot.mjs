#!/usr/bin/env node
/* Online play end to end: the real server (server/, on Postgres) and two real browsers, each its own player.
   Friends: A makes a room and picks a racer; B opens the link, is refused A's racer, picks another; A changes a rule
   and both see it; A starts; both pick tracks; the roulette; a race on autopilot on both; the same results on both;
   Next race on both, back to the track pick; the server restarts for an update while both sit there, and both show
   the update line and land on the hub saying the room closed. Public: A finds a race, the solo wait runs out, a race with
   CPUs runs, A's valuation card shows the change, and the Rich List shows A.
   Fails on any page error, console error, or failed request. Builds and starts the server itself and stops it.
   Public-room timers are shortened in the dev database for the run and put back afterwards.

   Usage: node tools/net-bot.mjs [--out dir] [--shots] [--touch] [--port 5211] [--db billionaire_kart_dev]
     --shots  every online screen at desktop, tablet, phone upright, and phone sideways, and a restart that cuts off a race
     --touch  both players on phones (844x390, touch), tapping through the friends flow */
import { spawn, execFileSync } from 'node:child_process';
import { mkdirSync, openSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { takeSlot } from './slot.mjs';

await takeSlot('net-bot');

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2), opt = {};
for (let i = 0; i < args.length; i++) if (args[i].startsWith('--')) { const k = args[i].slice(2); opt[k] = args[i + 1] && !args[i + 1].startsWith('--') ? args[++i] : true; }
const out = resolve(opt.out || '/tmp/bk-net-bot'); mkdirSync(out, { recursive: true });
const PORT = +(opt.port || 5211), DB = opt.db || 'billionaire_kart_dev', BASE = `http://127.0.0.1:${PORT}/`;
const touch = !!opt.touch, SHOTS = !!opt.shots;
const PROJECT = join(ROOT, 'server/src/BillionaireKart.Server');
const fails = [], log = (...a) => console.log('net-bot:', ...a);
const fail = msg => { fails.push(msg); console.log('net-bot: FAIL', msg); };

/* ---------- settings for the run ---------- */
const SETTINGS = { PublicSoloWaitSeconds: SHOTS ? 14 : 5, PublicWaitSeconds: 10, TrackPickSeconds: SHOTS ? 30 : 12, ResultsSeconds: SHOTS ? 40 : 20, FinishGraceSeconds: 25, ShutdownDrainSeconds: SHOTS ? 8 : 25 };
const psql = sql => execFileSync('psql', ['-d', DB, '-At', '-v', 'ON_ERROR_STOP=1', '-c', sql], { encoding: 'utf8' });
const saved = Object.fromEntries(psql(`select key, value from settings where key in (${Object.keys(SETTINGS).map(k => `'${k}'`).join(',')})`).trim().split('\n').filter(Boolean).map(l => l.split('|')));
for (const [k, v] of Object.entries(SETTINGS)) psql(`insert into settings (key, value, updated_at) values ('${k}', '${v}', now()) on conflict (key) do update set value = excluded.value, updated_at = now()`);
const restoreSettings = () => {
  for (const k of Object.keys(SETTINGS)) {
    if (k in saved) psql(`update settings set value = '${saved[k].replace(/'/g, "''")}', updated_at = now() where key = '${k}'`);
    else psql(`delete from settings where key = '${k}'`);
  }
};

/* ---------- the server ---------- */
let server = null, browser = null, restarting = false;
const stopServer = () => { if (server && server.exitCode == null) { server.kill('SIGTERM'); } };
const startServer = async () => {
  const logFd = openSync(join(out, 'server.log'), 'a');
  server = spawn('dotnet', [join(PROJECT, 'bin/Debug/net10.0/BillionaireKart.Server.dll'), '--urls', `http://127.0.0.1:${PORT}`], {
    cwd: PROJECT, stdio: ['ignore', logFd, logFd],
    env: { ...process.env, ASPNETCORE_ENVIRONMENT: 'Development', ConnectionStrings__Kart: `Host=localhost;Database=${DB}`, Kart__StaticRoot: ROOT, Kart__AdminToken: 'dev',
      // keys on disk, as in production, so the players' cookies survive the restart below
      Kart__KeyDirectory: join(out, 'keys') },
  });
  for (let i = 0; ; i++) {
    try { const r = await fetch(BASE + 'healthz'); if (r.ok) break; } catch { /* not yet */ }
    if (server.exitCode != null) throw new Error('the server exited; see ' + join(out, 'server.log'));
    if (i > 120) throw new Error('the server did not start');
    await new Promise(r => setTimeout(r, 250));
  }
};
/** SIGINT, as systemd stops it for a deploy; resolves with the seconds it took to exit. */
const interruptServer = () => new Promise((resolve, reject) => {
  const t0 = Date.now(), timer = setTimeout(() => reject(new Error('the server did not exit within 30 s of SIGINT')), 30000);
  server.once('exit', code => { clearTimeout(timer); if (code !== 0) fail(`the server exited with ${code} after SIGINT`); resolve((Date.now() - t0) / 1000); });
  server.kill('SIGINT');
});
process.on('exit', stopServer);
for (const sig of ['SIGINT', 'SIGTERM']) process.on(sig, () => { stopServer(); try { restoreSettings(); } catch { /* best effort */ } process.exit(130); });

try {
  log('building the server');
  execFileSync('dotnet', ['build', join(ROOT, 'server'), '-v', 'q', '-nologo'], { stdio: ['ignore', 'ignore', 'inherit'] });
  openSync(join(out, 'server.log'), 'w');
  await startServer();
  log('server up on', BASE);

  try { browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'] }); }
  catch { browser = await chromium.launch({ headless: true, args: ['--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader', '--ignore-gpu-blocklist'] }); }
  const VIEW = touch ? { width: 844, height: 390 } : { width: 1280, height: 720 };
  const player = async label => {
    const ctx = await browser.newContext({ viewport: VIEW, hasTouch: touch, isMobile: touch, deviceScaleFactor: 1, serviceWorkers: 'block' });
    await ctx.addInitScript(() => {
      Object.defineProperty(navigator, 'getGamepads', { configurable: true, value: () => [] });
      Object.defineProperty(navigator, 'share', { configurable: true, value: undefined });
    });
    const page = await ctx.newPage();
    page.label = label;
    page.on('pageerror', e => fail(`${label}: page error: ${e.message}`));
    // while the server restarts, the browser reports each refused reconnect, and (here only: in production nginx serves
    // the game's files) the menu scene's images; that is expected
    const down = text => restarting && /WebSocket connection .* failed|ERR_CONNECTION_REFUSED/.test(text);
    page.on('console', m => { if (m.type() === 'error' && !(page.allow && /status of 503/.test(m.text())) && !down(m.text())) fail(`${label}: console error: ${m.text()}`); });
    page.on('requestfailed', r => { if (!/\/favicon\.ico$/.test(r.url()) && !down(r.failure()?.errorText || '')) fail(`${label}: request failed: ${r.url()} ${r.failure()?.errorText}`); });
    page.on('response', r => { if (r.status() >= 400 && !page.allow?.(r)) fail(`${label}: ${r.status()} ${r.url()}`); });
    return page;
  };
  const screen = p => p.evaluate(() => window.BK?.app?.menus?.screen?.spec.name || null);
  const waitScreen = (p, name, timeout = 20000) => p.waitForFunction(n => window.BK?.app?.menus?.screen?.spec.name === n, name, { timeout }).catch(async () => { throw new Error(`${p.label}: expected screen ${name}, still on ${await screen(p)}`); });
  const press = async (p, selector, i = 0) => { const l = p.locator(selector).nth(i); if (touch) await l.tap(); else await l.click(); await p.waitForTimeout(250); };
  const text = (p, selector) => p.locator(selector).first().textContent();
  const SIZES = [['desktop', 1280, 720], ['tablet', 1024, 768], ['portrait', 390, 844], ['landscape', 844, 390]];
  const layout = async (p, name) => {
    const bad = await p.evaluate(() => {
      const e = document.querySelector('.menu-screen'); if (!e) return null;
      const over = e.scrollHeight - e.clientHeight, wide = e.scrollWidth - e.clientWidth;
      return (/\[object |undefined|NaN/.test(e.textContent) ? 'unrendered value; ' : '') + (over > 6 ? `scrolls ${over}px; ` : '') + (wide > 2 ? `${wide}px too wide; ` : '');
    });
    if (bad) fail(`${p.label}: ${name}: ${bad}`);
  };
  const shoot = async (p, name, { sizes = SHOTS, check = true } = {}) => {
    await p.waitForFunction(() => !document.querySelector('.wipe.on'), null, { timeout: 5000 }).catch(() => {}); await p.waitForTimeout(900);   // the checker wipe has gone, and rows have finished sliding in
    if (!sizes) { await p.screenshot({ path: join(out, `${name}.jpg`), type: 'jpeg', quality: 80 }); if (check) await layout(p, name); return; }
    for (const [tag, w, hh] of touch ? SIZES.filter(s => s[0] === 'landscape') : SIZES) {
      await p.setViewportSize({ width: w, height: hh }); await p.waitForTimeout(500);
      await p.screenshot({ path: join(out, `${name}-${tag}.jpg`), type: 'jpeg', quality: 80 });
      if (check) await layout(p, `${name} at ${tag}`);
    }
    await p.setViewportSize(VIEW); await p.waitForTimeout(250);
  };
  const toTitleAndOnline = async (p, url = '') => {
    await p.goto(BASE + '?netauto=1&netlaps=1' + url, { waitUntil: 'load' });
    await waitScreen(p, 'title', 60000); await p.waitForTimeout(600);
    if (touch) await p.locator('.screen-title').tap(); else await p.keyboard.press('Enter');
    await p.waitForTimeout(400);
  };

  /* ---------- friends ---------- */
  const A = await player('A'), B = await player('B');
  await toTitleAndOnline(A);
  await waitScreen(A, 'main');
  await shoot(A, '00-main-menu');
  await press(A, '.main-nav .btn.c4');
  await waitScreen(A, 'online');
  await A.waitForFunction(() => BK.app.online?.state === 'ready', null, { timeout: 15000 });
  await shoot(A, '01-hub');
  await press(A, 'button:has-text("Change name")'); await waitScreen(A, 'onlineName'); await shoot(A, '02-change-name');
  const before = await A.evaluate(() => BK.app.online.me.handle.title);
  await press(A, '.ol-names .chip', 7); await waitScreen(A, 'online');
  if (await A.evaluate(() => BK.app.online.me.handle.title) !== 7 || before === 7 && false) fail('A: choosing a title did not change the handle');
  await press(A, 'button:has-text("Join with a code")'); await waitScreen(A, 'onlineJoin');
  for (const k of ['Z', 'Z', 'Z', 'Z']) await A.keyboard.press(k);   // typing works, and no room has this code
  await A.waitForFunction(() => document.querySelector('.ol-err')?.textContent.includes('No room has that code.'), null, { timeout: 8000 }).catch(() => fail('A: a wrong code did not say "No room has that code."'));
  await shoot(A, '03-join-error');
  await press(A, '.back'); await waitScreen(A, 'online');
  await press(A, 'button:has-text("Rich List")'); await waitScreen(A, 'onlineBoard'); await A.waitForTimeout(600); await shoot(A, '04-rich-list-before');
  await press(A, '.back'); await waitScreen(A, 'online');

  await press(A, '.ol-modes .btn.c4');
  await waitScreen(A, 'onlineRacers');
  await shoot(A, '05-racers-host');
  await press(A, '.r-go');
  await waitScreen(A, 'onlineRoom');
  const code = await A.evaluate(() => BK.app.online.room.code), aRacer = await A.evaluate(() => BK.app.online.mine().racer);
  log('room', code, 'A races', aRacer);
  await shoot(A, '06-room-host-alone');

  await toTitleAndOnline(B, '&room=' + code);
  await waitScreen(B, 'onlineRacers', 20000);
  if (await B.evaluate(() => location.search.includes('room='))) fail('B: the room code is still in the address');
  const aTile = await B.evaluate(id => { const name = BK.RACERS.find(r => r.id === id).name; const t = [...document.querySelectorAll('.racer-tile')].find(x => x.querySelector('span').textContent === name); return t ? { disabled: t.disabled, chip: !!t.querySelector('em') } : null; }, aRacer);
  if (!aTile?.disabled || !aTile.chip) fail('B: A\'s racer is not shown as taken: ' + JSON.stringify(aTile));
  await shoot(B, '07-racers-taken');
  await B.evaluate(id => BK.app.online.conn.send({ t: 'racer', id }), aRacer);   // the server refuses it too
  await B.waitForTimeout(700);
  if (await B.evaluate(() => BK.app.online.mine().racer) === aRacer) fail('B: the server let B take A\'s racer');
  await press(B, '.r-go');
  await waitScreen(B, 'onlineRoom');
  const bRacer = await B.evaluate(() => BK.app.online.mine().racer);
  if (!bRacer || bRacer === aRacer) fail(`B: racer ${bRacer} (A has ${aRacer})`);
  await A.waitForFunction(() => BK.app.online.room.members.length === 2 && BK.app.online.room.members.every(m => m.racer), null, { timeout: 8000 });
  // A types a name on their own row (W, A, S, and D type rather than steer the menu; Enter hands the keyboard back); B sees it
  const NAME = 'Sad Wade';
  if (touch) await A.locator('.ol-name-in').tap(); else await A.locator('.ol-name-in').click();
  await A.keyboard.type(NAME, { delay: 40 });
  if (await screen(A) !== 'onlineRoom') fail('A: typing a name left the room screen');
  await A.keyboard.press('Enter'); await A.waitForTimeout(300);
  if (await A.evaluate(() => document.activeElement?.classList.contains('ol-name-in'))) fail('A: Enter did not leave the name field');
  if (await A.evaluate(() => document.querySelector('.ol-name-in').value) !== NAME) fail('A: the name field holds ' + await A.evaluate(() => document.querySelector('.ol-name-in').value));
  await B.waitForFunction(n => [...document.querySelectorAll('.ol-member .ol-who b')].some(b => b.textContent === n), NAME, { timeout: 8000 }).catch(() => fail('B does not see A\'s typed name in the room'));
  if (await A.evaluate(() => BK.app.save.data.online?.name) !== NAME) fail('A: the typed name was not remembered in the save');
  await shoot(A, '08-room-host');
  await shoot(B, '09-room-guest');
  // a dropped connection: the pill says so, and it comes back by itself
  await B.evaluate(() => BK.app.online.conn.t.close());
  await B.waitForFunction(() => document.querySelector('.ol-pill')?.textContent === 'Reconnecting…', null, { timeout: 4000 }).catch(() => fail('B: no Reconnecting pill after a drop'));
  await B.screenshot({ path: join(out, '09b-reconnecting.jpg'), type: 'jpeg', quality: 80 });
  await B.waitForFunction(() => !document.querySelector('.ol-pill') && BK.app.online.conn.ready, null, { timeout: 15000 }).catch(() => fail('B: did not reconnect'));
  if (await screen(B) !== 'onlineRoom') fail('B: left the room after reconnecting: ' + await screen(B));

  await press(A, 'button:has-text("Change rules")'); await waitScreen(A, 'onlineRules');
  await press(A, '.ol-rules .card.cc', 1);   // 100cc
  await shoot(A, '10-rules');
  await press(A, '.ol-rules .chip:text-is("Cup")'); await A.waitForTimeout(300); await shoot(A, '11-rules-cup');
  await press(A, '.ol-rules .chip:text-is("Single races")'); await A.waitForTimeout(300);
  await press(A, '.back'); await waitScreen(A, 'onlineRoom');
  await B.waitForFunction(() => /100cc/.test(document.querySelector('.ol-rules-line')?.textContent || '') && /Single races/.test(document.querySelector('.ol-rules-line')?.textContent || ''), null, { timeout: 8000 }).catch(() => fail('B did not see the rule change'));
  log('rules on B:', await text(B, '.ol-rules-line .ol-line'));

  await press(A, '.ol-foot .btn.go');
  await waitScreen(A, 'onlineTrack'); await waitScreen(B, 'onlineTrack');
  await shoot(A, '12-track-pick');
  await press(A, '.cards.tracks .card.track', 0);
  await B.waitForTimeout(400);
  await shoot(B, '13-track-pick-other-picked');
  await press(B, '.cards.tracks .card.track', 3);
  // the roulette: both see a card highlighted before the race
  const rouletteSeen = await Promise.all([A, B].map(p => p.waitForFunction(() => !!document.querySelector('.card.ol-hop'), null, { timeout: 15000 }).then(() => true, () => false)));
  if (!rouletteSeen.every(Boolean)) fail('the roulette did not play on both: ' + rouletteSeen);
  await A.waitForTimeout(900); await A.screenshot({ path: join(out, '14-roulette.jpg'), type: 'jpeg', quality: 80 });
  await Promise.all([A, B].map(p => p.waitForFunction(() => BK.app.session?.net && !BK.app.attract && BK.app.session.race, null, { timeout: 30000 })));
  const trackA = await A.evaluate(() => BK.app.session.config.trackId), trackB = await B.evaluate(() => BK.app.session.config.trackId);
  if (trackA !== trackB) fail(`different tracks: ${trackA} / ${trackB}`);
  log('racing on', trackA);
  if (!await A.evaluate(() => { const o = BK.app.session.view.karts.filter(v => v.kart.human && !v.kart.isPlayer); return o.length > 0 && o.every(v => v.tag.scale.x > 3); })) fail('A: the other human\'s kart does not wear their name');
  await A.waitForFunction(() => BK.app.session.race.time > 4, null, { timeout: 40000 });
  await A.screenshot({ path: join(out, '15-race-A.jpg'), type: 'jpeg', quality: 80 });
  await B.screenshot({ path: join(out, '15-race-B.jpg'), type: 'jpeg', quality: 80 });
  // A drives for real now (no test autopilot), so what moves A's kart under the menu is the stand-in
  await A.waitForFunction(() => !BK.app.session.race.frozen, null, { timeout: 20000 });
  await A.evaluate(() => { const s = BK.app.session; s._testAuto = s.autopilots; s.autopilots = null; });
  await A.keyboard.press('Escape'); await waitScreen(A, 'onlinePause');
  if (await A.evaluate(() => BK.app.session.paused)) fail('A: the online pause menu stopped the race');
  if (!(await A.locator('.screen-onlinePause').textContent()).includes('Your kart is on autopilot.')) fail('A: the online pause menu does not say the kart is on autopilot');
  const awayOnB = () => B.evaluate(() => BK.app.session.view.karts.filter(v => v.kart.human && !v.kart.isPlayer).map(v => !!v.tag.userData.away));
  await B.waitForFunction(() => BK.app.session.view.karts.some(v => v.kart.human && !v.kart.isPlayer && v.tag.userData.away), null, { timeout: 4000 }).catch(() => {});
  if (!(await awayOnB()).every(Boolean)) fail('B: A\'s name tag does not show A is away');
  const d0 = await A.evaluate(() => BK.app.session.race.players[0].raceDistance); await A.waitForTimeout(1500);
  const moved = await A.evaluate(d => BK.app.session.race.players[0].raceDistance - d, d0);
  if (!(moved > 15)) fail(`A: the stand-in did not drive A's kart under the menu (moved ${moved?.toFixed?.(1)} m in 1.5 s)`);
  await B.screenshot({ path: join(out, '16-away-B.jpg'), type: 'jpeg', quality: 85 });
  const pauseButtons = await A.locator('.screen-onlinePause .btn .btn-label').allTextContents();
  // after the countdown, so the rescue is on offer
  if (pauseButtons.join('|') !== 'Resume|Rescue kart|Options|Leave race') fail('A: pause menu offers ' + pauseButtons.join(', '));
  const t0 = await A.evaluate(() => BK.app.session.race.time); await A.waitForTimeout(600);
  if (await A.evaluate(() => BK.app.session.race.time) <= t0) fail('A: the race clock stood still under the pause menu');
  await shoot(A, '16-pause', { check: false });
  await A.keyboard.press('Escape'); await A.waitForTimeout(300);
  if (await screen(A)) fail('A: Escape did not close the online pause menu');
  await B.waitForFunction(() => BK.app.session.view.karts.every(v => !v.tag?.userData.away), null, { timeout: 4000 }).catch(() => fail('B: A still shows as away after resuming'));
  await A.evaluate(() => { const s = BK.app.session; s.autopilots = s._testAuto; });

  await Promise.all([A, B].map(p => waitScreen(p, 'onlineResults', 300000)));
  const order = p => p.evaluate(() => [...document.querySelectorAll('.ol-table .res-row')].map(r => r.querySelector('.res-name').firstChild.textContent));
  const [oA, oB] = await Promise.all([order(A), order(B)]);
  if (oA.join() !== oB.join() || oA.length < 2) fail(`results differ: A ${oA.join(', ')} / B ${oB.join(', ')}`);
  log('results:', oA.join(', '));
  if (!(await B.locator('.ol-table .res-name small').allTextContents()).includes(NAME)) fail('B: A\'s typed name is not in the results');
  await shoot(A, '17-results-private');
  await press(A, '.ol-res .foot .btn.go');
  await A.waitForTimeout(400);
  if (!(await text(A, '.ol-res .foot .btn.go .btn-label')).includes('Waiting for the others')) fail('A: Next race did not change to Waiting for the others');
  await shoot(A, '18-results-waiting', { sizes: false });
  await press(B, '.ol-res .foot .btn.go');
  await Promise.all([A, B].map(p => waitScreen(p, 'onlineTrack', 30000)));
  log('both back at the track pick');

  /* ---------- the server restarts for an update ---------- */
  const UPDATING = 'The race server is updating. Back in a moment.', UPDATED = 'That room closed for an update.';
  restarting = true;
  const exited = interruptServer();
  // nobody is racing, so it says goodbye and exits at once; both keep their screen and show the line
  const calm = p => p.waitForFunction(t => document.querySelector('.ol-pill.calm')?.textContent === t, UPDATING, { timeout: 8000 }).then(() => true, () => false);
  if (!(await Promise.all([A, B].map(calm))).every(Boolean)) fail('the update line did not show on both');
  log('server exited', (await exited).toFixed(1), 's after SIGINT');
  for (const p of [A, B]) {
    if (await screen(p) !== 'onlineTrack') fail(`${p.label}: left the track pick while the server was down: ${await screen(p)}`);
    else if (await p.locator('.ol-count').first().isVisible() && await text(p, '.ol-count')) fail(`${p.label}: the track countdown still shows while the server is down`);
  }
  await shoot(A, '19-server-updating', { check: false });
  await startServer();
  log('server back up');
  await Promise.all([A, B].map(p => waitScreen(p, 'online', 40000)));
  await Promise.all([A, B].map(p => p.waitForFunction(() => BK.app.online.conn?.ready && !document.querySelector('.ol-pill'), null, { timeout: 10000 }).catch(() => fail(`${p.label}: still not connected after the restart`))));
  restarting = false;
  for (const p of [A, B]) { const n = await p.locator('.ol-notice').first().textContent().catch(() => null); if (n !== UPDATED) fail(`${p.label}: the hub says ${JSON.stringify(n)} after the restart`); }
  await shoot(A, '19b-room-closed-for-update');
  log('both on the hub after the restart');
  await press(B, '.back'); await waitScreen(B, 'main');
  if (await B.evaluate(() => !!BK.app.online.conn)) fail('B: the connection stayed open after leaving to the main menu');
  log('friends: done');

  /* ---------- public ---------- */
  if (!touch) {
    await press(A, '.ol-modes .btn.c1');
    await waitScreen(A, 'onlinePublic', 10000);
    await shoot(A, '20-public-lobby');
    await waitScreen(A, 'onlineTrack', 30000);
    await shoot(A, '21-public-vote');
    await press(A, '.cards.tracks .card.track', 0);
    await A.waitForFunction(() => BK.app.session?.net && !BK.app.attract, null, { timeout: 40000 });
    log('public race on', await A.evaluate(() => BK.app.session.config.trackId));
    // B arrives mid-race: B watches, with the banner, and is in the next one
    await press(B, '.main-nav .btn.c4'); await B.waitForFunction(() => BK.app.online?.state === 'ready', null, { timeout: 15000 });
    await press(B, '.ol-modes .btn.c1');
    await B.waitForFunction(() => BK.app.session?.net && !BK.app.attract && !BK.app.session.race.players.length, null, { timeout: 30000 }).catch(() => fail('B did not spectate the race in progress'));
    await B.waitForFunction(() => document.querySelector('.ol-banner')?.textContent === 'Race in progress. You are in the next one.', null, { timeout: 8000 }).catch(() => fail('B: no spectator banner'));
    await B.waitForTimeout(2500); await B.screenshot({ path: join(out, '21b-spectating.jpg'), type: 'jpeg', quality: 80 });
    await waitScreen(A, 'onlineResults', 300000);
    const card = await A.evaluate(() => { const c = document.querySelector('.ol-val'); return c && { value: c.querySelector('strong')?.textContent, change: c.querySelector('.ol-change')?.textContent }; });
    if (!card?.value || !card.change) fail('A: no valuation card after a public race'); else log('valuation card:', card.value, card.change);
    await shoot(A, '22-results-public');
    await waitScreen(B, 'onlineResults', 60000);
    if ((await order(A)).join() !== (await order(B)).join()) fail('public results differ between A and B');
    await press(B, 'button:has-text("Leave")'); await waitScreen(B, 'online', 15000); await press(B, '.back'); await waitScreen(B, 'main');
    await press(A, 'button:has-text("Leave")'); await waitScreen(A, 'online', 15000);
    await press(A, 'button:has-text("Rich List")'); await waitScreen(A, 'onlineBoard');
    await A.waitForFunction(() => !!document.querySelector('.ol-board .res-row.me'), null, { timeout: 8000 }).catch(() => fail('A is not on the Rich List after a public race'));
    await shoot(A, '23-rich-list');
    await press(A, '.chip:has-text("This week")'); await A.waitForTimeout(700); await shoot(A, '24-rich-list-week');
    await press(A, '.back'); await press(A, '.back'); await waitScreen(A, 'main');
  }

  /* ---------- a restart that cuts off a race (screens only) ---------- */
  if (SHOTS && !touch) {
    await press(A, '.main-nav .btn.c4'); await waitScreen(A, 'online');
    await A.waitForFunction(() => BK.app.online?.state === 'ready', null, { timeout: 15000 });
    await press(A, '.ol-modes .btn.c4'); await waitScreen(A, 'onlineRacers'); await press(A, '.r-go'); await waitScreen(A, 'onlineRoom');
    const code2 = await A.evaluate(() => BK.app.online.room.code);
    await toTitleAndOnline(B, '&room=' + code2);
    await waitScreen(B, 'onlineRacers', 20000); await press(B, '.r-go'); await waitScreen(B, 'onlineRoom');
    await A.waitForFunction(() => BK.app.online.room.members.length === 2 && BK.app.online.room.members.every(m => m.racer), null, { timeout: 8000 });
    await press(A, '.ol-foot .btn.go');
    await Promise.all([A, B].map(p => waitScreen(p, 'onlineTrack')));
    await press(A, '.cards.tracks .card.track', 0); await press(B, '.cards.tracks .card.track', 0);
    await Promise.all([A, B].map(p => p.waitForFunction(() => BK.app.session?.net && !BK.app.attract && BK.app.session.race?.time > 5, null, { timeout: 40000 })));
    restarting = true;
    const exited = interruptServer();
    await A.waitForFunction(() => document.querySelector('.ol-pill.calm'), null, { timeout: 5000 }).catch(() => fail('A: no update line mid-race'));
    if (!await A.evaluate(() => BK.app.session?.net && !BK.app.attract)) fail('A: the race stopped as soon as the server said it was updating');
    await shoot(A, '25-race-server-updating', { check: false });
    // the drain runs out: the race ends on both and they wait on the hub
    await Promise.all([A, B].map(p => waitScreen(p, 'online', 20000)));
    log('race cut off; server exited', (await exited).toFixed(1), 's after SIGINT');
    await shoot(A, '26-race-cut-off');
    await startServer();
    await Promise.all([A, B].map(p => p.waitForFunction(() => BK.app.online.conn?.ready && !document.querySelector('.ol-pill'), null, { timeout: 40000 }).catch(() => fail(`${p.label}: still not connected after the restart`))));
    restarting = false;
    for (const p of [A, B]) { const n = await p.locator('.ol-notice').first().textContent().catch(() => null); if (n !== 'That room closed for an update.') fail(`${p.label}: the hub says ${JSON.stringify(n)} after the cut-off race`); }
    await shoot(A, '27-hub-after-update');
    for (const p of [A, B]) { await press(p, '.back'); await waitScreen(p, 'main'); }
  }

  /* ---------- connection trouble (screens only) ---------- */
  if (SHOTS && !touch) {
    const C = await player('C');
    C.allow = r => r.url().endsWith('/api/session');
    await C.route('**/api/session', route => route.fulfill({ status: 503, body: '' }));
    await toTitleAndOnline(C);
    await press(C, '.main-nav .btn.c4');
    await C.waitForFunction(() => BK.app.online?.state === 'failed', null, { timeout: 15000 });
    await shoot(C, '30-cannot-reach');
  }
} catch (e) {
  fail(e.message.split('\n')[0]);
} finally {
  await browser?.close().catch(() => {});
  stopServer();
  try { restoreSettings(); } catch (e) { console.log('net-bot: could not restore settings:', e.message); }
}
if (fails.length) { console.log(`net-bot: ${fails.length} failure(s); screenshots in ${out}`); process.exit(1); }
console.log('net-bot: ok');
