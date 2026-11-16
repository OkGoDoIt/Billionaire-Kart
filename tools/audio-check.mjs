// Exercise the sound graph using the same Web Audio implementation that runs the game.
// Covers colliding recording names, pause and mute while ducked, and music handovers.
import assert from 'node:assert/strict';
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { takeSlot } from './slot.mjs';

await takeSlot('audio-check');
const root = new URL('../', import.meta.url);
const server = http.createServer(async (req, res) => {
  try {
    if (req.url === '/') { res.end('<button>Start</button>'); return; }
    const asset = new URL('.' + req.url, root);
    if (!asset.href.startsWith(root.href)) throw Error('outside root');
    const bytes = await readFile(fileURLToPath(asset));
    res.writeHead(200, { 'Content-Type': asset.pathname.endsWith('.mp3') ? 'audio/mpeg' : 'text/javascript' }); res.end(bytes);
  } catch { res.writeHead(404); res.end(); }
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
let browser;
try {
  const local = process.platform === 'darwin' && !process.env.CI;
  browser = await chromium.launch(local ? { channel: 'chrome' } : {});
  const page = await browser.newPage(), errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto('http://127.0.0.1:' + server.address().port);
  await page.evaluate(async () => {
    const { AudioEngine } = await import('/src/audio/audio.js');
    window.engine = new AudioEngine({ settings: { music: .7, sfx: .9 } });
    document.querySelector('button').onclick = () => engine.unlock();
  });
  await page.click('button');
  await page.evaluate(async () => {
    const sleep = ms => new Promise(r => setTimeout(r, ms));
    const check = (condition, message) => { if (!condition) throw Error(message); };
    const audio = window.engine;
    const [horn, voice] = await Promise.all([audio.load('go'), audio.load('voice:go')]);
    check(horn && voice && Math.abs(horn.duration - voice.duration) > .3, 'GO should have a spoken line and a separate start horn');
    audio.raceEvent({ type: 'go' }, {});
    check(audio.voice?.source.buffer === voice, 'GO spoke the wrong recording');
    audio.event('pause');
    audio.setVolumes(.7, .9);
    await sleep(250);
    check(audio.motors.gain.value < .002 && audio.mus.gain.value < .25, 'pause or adjusting a slider left the engine or music at racing volume');
    audio.event('resume');
    audio.toggleMute();
    await sleep(160);
    check(audio.sfx.gain.value < .001 && audio.mus.gain.value < .001, 'mute recovered during a duck');
    audio.toggleMute();
    await sleep(100);
    check(audio.sfx.gain.value > .6 && audio.mus.gain.value > .6, 'unmute failed to restore both saved levels');
    audio.music('davos');
  });
  await page.waitForFunction(() => engine.musicNode?.id === 'davos');
  await page.evaluate(() => {
    const a = window.engine, original = a.musicNode.s;
    if (!original.loop || original.loopStart !== 0) throw Error('authored score missed its first bar on repeat');
    a.setMusicRate(1.1); a.setStarTheme(true); a.setStarTheme(false);
    if (a.musicNode?.s !== original) throw Error('star restarted the course music');
  });
  // A late failure from an abandoned request must not cancel the *current* fallback watchdog.
  let releaseOld;
  const hold = new Promise(r => { releaseOld = r; });
  let reportRequested;
  const requested = new Promise(r => { reportRequested = r; });
  await page.route('**/music/mars-colony.mp3', async route => { reportRequested(); await hold; await route.abort(); });
  let releaseNew;
  const newer = new Promise(r => { releaseNew = r; });
  await page.route('**/music/crypto-cove.mp3', async route => { await newer; await route.continue(); });
  await page.evaluate(() => engine.music('mars-colony'));
  await requested;
  await page.evaluate(() => engine.music('crypto-cove'));
  releaseOld();
  await page.waitForFunction(() => engine.seq && engine.musicId === 'crypto-cove', null, { timeout: 4500 });
  releaseNew();
  await page.waitForFunction(() => !engine.seq && engine.musicNode?.id === 'crypto-cove');
  await page.evaluate(async () => {
    engine.music(null); engine.stopLoops(); await engine.ctx.close();
  });
  assert.deepEqual(errors, []);
  console.log('audio-check: ok');
} finally {
  await browser?.close(); server.closeAllConnections(); server.close();
}
