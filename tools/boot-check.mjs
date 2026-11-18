#!/usr/bin/env node
/* The short, blocking browser check: the page boots to the title screen, a key press reaches the main menu,
   a race renders for a few seconds, and nothing errors or 404s on the way. CI runs it on every pull request and
   again on the exact folder it is about to publish, so a broken import or a file left out of the deploy can't go
   live. The full menus-to-results bot stays the local gate.
   Usage: node tools/boot-check.mjs [--root dir] */
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { takeSlot } from './slot.mjs';

await takeSlot('boot check');
const args = process.argv.slice(2);
const ROOT = resolve(args.includes('--root') ? args[args.indexOf('--root') + 1] : join(dirname(fileURLToPath(import.meta.url)), '..'));
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.woff2': 'font/woff2', '.mp3': 'audio/mpeg' };
const missing = new Set();
const server = http.createServer(async (req, res) => {
  const path = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  try {
    let p = normalize(join(ROOT, path)); if (!p.startsWith(ROOT)) throw 0;
    if (p.endsWith('/') || p === ROOT) p = join(p, 'index.html');
    const d = await readFile(p); res.writeHead(200, { 'Content-Type': MIME[extname(p)] || 'application/octet-stream', 'Cache-Control': 'no-store' }); res.end(d);
  } catch { missing.add(path); res.writeHead(404); res.end('not found'); }
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const base = `http://127.0.0.1:${server.address().port}/`;

const swiftshader = { headless: true, args: ['--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader', '--ignore-gpu-blocklist'] };
let browser;
if (process.env.CI || process.platform === 'linux') browser = await chromium.launch(swiftshader);
else try { browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'] }); }
catch { browser = await chromium.launch(swiftshader); }

const errors = [];
let failed = false;
try {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 }, serviceWorkers: 'block' });
  await ctx.addInitScript(() => Object.defineProperty(navigator, 'getGamepads', { configurable: true, value: () => [] }));
  const page = await ctx.newPage();
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
  const screen = () => page.evaluate(() => window.BK?.app?.menus?.screen?.spec.name || null);
  const t0 = Date.now();
  await page.goto(base, { waitUntil: 'load', timeout: 120000 });
  await page.waitForFunction(() => window.BK?.app?.menus?.screen?.spec.name === 'title', null, { timeout: 120000 });
  console.log(`boot-check: title screen after ${((Date.now() - t0) / 1000).toFixed(1)} s`);
  if (await page.$('#boot:not([hidden])')) throw new Error('the loading screen is still showing over the title');
  await page.waitForTimeout(800);
  await page.keyboard.press('Enter');
  await page.waitForFunction(() => window.BK?.app?.menus?.screen?.spec.name === 'main', null, { timeout: 20000 });
  console.log('boot-check: main menu');
  await page.goto(base + '?track=silicon-valley&r=elon&auto=1&intro=0&seed=4', { waitUntil: 'load', timeout: 120000 });
  await page.waitForFunction(() => window.BK?.app?.session?.race, null, { timeout: 120000 });
  await page.waitForTimeout(6000);
  const racing = await page.evaluate(() => window.BK.app.session.race.time > 0);
  if (!racing) throw new Error('the race never started');
  console.log('boot-check: race running');
  if (await screen() === null && !racing) throw new Error('nothing on screen');
} catch (e) { failed = true; console.error('boot-check: FAIL', e.message); }
await browser.close(); server.close();
// a favicon or an optional probe may 404 in a dev server; anything the game itself asked for may not
const real = [...missing].filter(p => !/favicon\.ico$/.test(p));
for (const p of real) console.error('boot-check: missing file', p);
for (const e of errors) console.error('boot-check:', e);
if (failed || real.length || errors.length) process.exit(1);
console.log('boot-check: ok');
