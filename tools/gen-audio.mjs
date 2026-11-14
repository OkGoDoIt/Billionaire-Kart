#!/usr/bin/env node
/* Generate sound effects, announcer lines, and music with ElevenLabs, then
   write src/content/audio-manifest.js listing what exists. Skips files that are
   already there, and reports credits used.
   Usage: node tools/gen-audio.mjs [sfx|voice|music|manifest] [--only name,name] [--force] [--dry] [--voice <voice_id>] */
import { readFile, writeFile, mkdir, access, readdir, stat } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2), what = args.find(a => !a.startsWith('--')) || 'manifest', opt = {};
for (let i = 0; i < args.length; i++) if (args[i].startsWith('--')) { const k = args[i].slice(2); opt[k] = args[i + 1] && !args[i + 1].startsWith('--') ? args[++i] : true; }
const only = opt.only ? String(opt.only).split(',') : null;
const exists = p => access(p).then(() => true, () => false);

async function key() {
  if (process.env.ELEVENLABS_API_KEY) return process.env.ELEVENLABS_API_KEY;
  const env = await readFile(resolve(ROOT, '.env'), 'utf8').catch(() => '');
  const m = env.match(/^\s*ELEVENLABS_API_KEY\s*=\s*(.+?)\s*$/m);
  if (!m) throw new Error('No ElevenLabs key: add ELEVENLABS_API_KEY=... to .env');
  return m[1].replace(/^["']|["']$/g, '');
}
const K = what === 'manifest' || what === 'trim' || opt.dry ? null : await key();
const api = (path, init = {}) => fetch('https://api.elevenlabs.io' + path, { ...init, headers: { 'xi-api-key': K, 'Content-Type': 'application/json', ...(init.headers || {}) } });
const credits = async () => { const r = await api('/v1/user/subscription'); const j = await r.json(); return { used: j.character_count, limit: j.character_limit }; };

/* ---------- content ---------- */
// [name, seconds, prompt]
const SFX = [
  ['ui_move', 0.5, 'Soft, clean user-interface tick, single short blip, video game menu navigation'],
  ['ui_select', 0.6, 'Bright positive user-interface confirm chime, two quick rising notes, arcade video game menu'],
  ['ui_back', 0.5, 'Soft descending user-interface cancel blip, video game menu'],
  ['ui_start', 1.3, 'Sparkling ascending arcade jingle, game start confirm, bright and joyful, short'],
  ['coin', 0.6, 'Single bright coin pickup ding, classic arcade video game, crisp and short'],
  ['item_box', 1.0, 'Glass item box shattering with a magical sparkle chime, arcade kart racing game'],
  ['roulette', 1.3, 'Rapid slot-machine reel ticking, fast item roulette clicks, arcade game'],
  ['item_ready', 0.7, 'Bright two-note chime, item ready, arcade video game'],
  ['boost', 1.3, 'Cartoon racing kart turbo boost: a punchy rising whoosh with a jet burst and bright sparkle, arcade game'],
  ['miniturbo', 0.7, 'Short sharp electric zap and whoosh, drift boost release, arcade kart racing'],
  ['hop', 0.5, 'Tiny cartoon spring hop boing, very short and light'],
  ['land', 0.6, 'Small vehicle landing thud with a rubbery suspension bounce, cartoon'],
  ['trick', 0.8, 'Quick cartoon spin whoosh with a sparkle flourish, stunt trick in a kart racing game'],
  ['hit', 0.9, 'Cartoon bonk impact with a comedic wobble, kart racer gets hit by an item'],
  ['hit_big', 1.7, 'Big cartoon explosion impact with debris and a comedic slide-whistle fall, kart racing game'],
  ['spin', 1.0, 'Cartoon dizzy spinning whirl, tyres squealing in a spin-out, playful'],
  ['zap', 0.7, 'Electric shock zap and buzz, short, cartoon'],
  ['wall', 0.6, 'Go-kart bumping and scraping a plastic barrier, short thud and scrape'],
  ['bump', 0.5, 'Rubbery bumper-car bump thud, short'],
  ['throw', 0.6, 'Quick whoosh of a thrown object, cartoon'],
  ['drop', 0.6, 'Wet gloopy plop of a dropped blob, cartoon'],
  ['tweet', 0.8, 'Fast cartoon bird chirp and whistle, cheeky'],
  ['siren', 1.6, 'Ominous incoming warning siren wail, short, cartoon missile approaching'],
  ['star', 1.6, 'Sparkly magical power-up fanfare, invincibility activated, arcade game'],
  ['lightning', 1.7, 'Huge thunder crack with electric sizzle, dramatic lightning strike'],
  ['shock', 1.0, 'Deep bass shockwave pulse blast, punchy sonic boom, video game'],
  ['explosion', 1.6, 'Cartoon bomb explosion, big boom with scattering debris, comedic'],
  ['ink', 0.8, 'Wet ink splat hitting a window, cartoon splash'],
  ['ghost', 1.0, 'Playful spooky ghost whoosh, vanish into thin air, cartoon'],
  ['rocket', 2.2, 'Rocket engine ignition roaring up and blasting off, powerful, short'],
  ['steal', 0.7, 'Sneaky quick swipe and snatch with a cheeky pop, cartoon thief'],
  ['block', 0.6, 'Metallic shield deflect clang and ping, short'],
  ['warning', 0.9, 'Urgent three-beep alarm warning, arcade video game alert'],
  ['rescue', 1.6, 'Small drone propeller whirr rising as it lifts something, cartoon rescue hoist'],
  ['count', 0.5, 'Single low electronic countdown beep, racing start light'],
  ['go', 1.0, 'Bright high racing start horn, green light go signal, arcade'],
  ['lap', 1.0, 'Short triumphant three-note jingle, lap completed, arcade racing game'],
  ['finish', 2.2, 'Short race-finished jingle, friendly and conclusive, arcade racing game, no vocals'],
  ['finish_good', 3.2, 'Triumphant brass victory fanfare with a crowd cheer, arcade racing game win, no vocals'],
  ['burnout', 1.2, 'Tyre burnout screech with an engine sputter and stall, comedic failure'],
  ['crowd', 4.0, 'Stadium crowd cheering and applauding at a motor race, excited'],
];
// [name, text]
const VOICE_LINES = [
  ['count_3', 'Three!'], ['count_2', 'Two!'], ['count_1', 'One!'], ['go', 'Go!'],
  ['final_lap', 'Final lap!'], ['finish', 'Finish!'], ['winner', 'Winner!'], ['first_place', 'First place!'],
  ['you_win', 'You win!'], ['champion', 'Champion!'], ['cup_over', 'What a cup!'],
  ['rocket_start', 'Rocket start!'], ['nice_start', 'Nice start!'], ['title', 'Billionaire Kart!'],
  ['track_silicon-valley', 'Silicon Valley Circuit!'], ['track_bliss-hills', 'Bliss Hills!'], ['track_crypto-cove', 'Crypto Cove!'], ['track_datacenter-dash', 'Datacenter Dash!'],
  ['track_davos', 'Davos Circuit!'], ['track_international-waters', 'International Waters!'],
  ['track_wework-memorial', 'WeWork Memorial!'], ['track_boring-tunnel', 'Boring Tunnel GP!'],
  ['track_capitol-hill', 'Capitol Hill Climb!'], ['track_burning-circuit', 'Burning Circuit!'], ['track_mars-colony', 'Mars Colony!'], ['track_singularity-speedway', 'Singularity Speedway!'],
];
const LOOP = 'Instrumental only, no vocals. A seamless loop: it ends on the same groove and energy it starts with, with no intro build and no fade-out.';
// [name, seconds, prompt]
const MUSIC_TRACKS = [
  ['menu', 62, `Upbeat, playful big-band funk theme for a cartoon kart racing video game menu: punchy brass section, slap bass, bright electric piano, tight drums, hand claps, 118 BPM, in C major, confident and cheeky. ${LOOP}`],
  ['silicon-valley', 66, `Sunny, driving funk-rock racing theme for a cartoon kart game set on a California tech campus: clean rhythm guitar, bright synth lead, slap bass, live drums, brass stabs, 132 BPM, in E major, optimistic and fast. ${LOOP}`],
  ['bliss-hills', 66, `Breezy, joyful country-pop racing theme for a cartoon kart game on green rolling hills: acoustic guitar strums, fiddle hook, whistled melody, banjo rolls, bouncy bass, brushed drums, 126 BPM, in G major, carefree. ${LOOP}`],
  ['crypto-cove', 66, `Tropical steel-drum and funk racing theme for a cartoon kart game on a sunset beach: steel pans carrying the melody, nylon guitar, bouncy bass, congas and shakers, bright horns, 124 BPM, in F major, warm and festive. ${LOOP}`],
  ['datacenter-dash', 66, `Driving synthwave racing theme for a cartoon kart game in a neon server hall at night: pulsing arpeggiated bass, bright saw lead melody, gated snare, glittering arps, sidechained pads, 128 BPM, in A minor, cool and propulsive. ${LOOP}`],
  ['capitol-hill', 66, `Mock-heroic marching-band funk racing theme for a cartoon kart game in a marble capital city: pompous brass fanfare melody over a funky drumline groove, sousaphone bass, piccolo flourishes, snare rolls, 130 BPM, in B-flat major, grand and tongue-in-cheek. ${LOOP}`],
  ['burning-circuit', 66, `Desert festival racing theme for a cartoon kart game at dusk: driving tribal drums and hand percussion, fuzzy surf guitar riff, didgeridoo drone, four-on-the-floor kick, hypnotic synth arpeggio, 126 BPM, in D minor, dusty and euphoric. ${LOOP}`],
  ['mars-colony', 66, `Adventurous space-western racing theme for a cartoon kart game on Mars: twangy baritone guitar melody, soaring theremin-like synth, galloping drums, pulsing synth bass, French horn swells, 134 BPM, in E minor, heroic and slightly weightless. ${LOOP}`],
  ['singularity-speedway', 72, `Euphoric, sparkling electro-orchestral finale theme for the last track of a cartoon kart racing game, set on a rainbow road in space: glittering arpeggios, a soaring emotional lead melody, driving drum-and-bass style beat, lush string pads, choir-like synth swells, 140 BPM, in D major, triumphant and bittersweet. ${LOOP}`],
  ['results', 30, `Relaxed, satisfied lounge-funk results-screen music for a cartoon kart racing game: mellow electric piano chords, soft brass, walking bass, light drums, 100 BPM, in C major, warm. ${LOOP}`],
];

async function save(res, file) {
  if (!res.ok) throw new Error(`${res.status} ${(await res.text()).slice(0, 300)}`);
  const buf = Buffer.from(await res.arrayBuffer());
  await mkdir(dirname(file), { recursive: true }); await writeFile(file, buf);
  return { bytes: buf.length, cost: res.headers.get('character-cost') };
}
async function run(list, dir, make) {
  let made = 0;
  for (const item of list) {
    const name = item[0], file = resolve(ROOT, 'assets/audio', dir, name + '.mp3');
    if (only && !only.includes(name)) continue;
    if (!opt.force && await exists(file)) continue;
    if (opt.dry) { console.log('would make', dir + '/' + name); continue; }
    try { const r = await make(item, file); made++; console.log(`${dir}/${name}  ${(r.bytes / 1024).toFixed(0)} KB  cost ${r.cost ?? '?'}`); }
    catch (e) { console.log(`${dir}/${name}  FAILED: ${e.message}`); }
  }
  return made;
}

const before = K ? await credits() : null;
if (what === 'sfx') await run(SFX, 'sfx', ([, seconds, text], file) => api('/v1/sound-generation?output_format=mp3_44100_128', { method: 'POST', body: JSON.stringify({ text, duration_seconds: seconds, prompt_influence: 0.55 }) }).then(r => save(r, file)));
if (what === 'voice') {
  const voice = opt.voice; if (!voice && !opt.dry) throw new Error('pass --voice <voice_id> (list voices with: node tools/gen-audio.mjs voices)');
  await run(VOICE_LINES, 'voice', ([, text], file) => api(`/v1/text-to-speech/${voice}?output_format=mp3_44100_128`, { method: 'POST', body: JSON.stringify({ text, model_id: opt.model || 'eleven_multilingual_v2', voice_settings: { stability: 0.3, similarity_boost: 0.8, style: 0.75, use_speaker_boost: true } }) }).then(r => save(r, file)));
}
if (what === 'voices') { const r = await api('/v1/voices'); const j = await r.json(); for (const v of j.voices || []) console.log(v.voice_id, '|', v.name, '|', v.category, '|', Object.values(v.labels || {}).join(', '), '|', (v.description || '').slice(0, 80)); }
if (what === 'music') await run(MUSIC_TRACKS, 'music', ([, seconds, prompt], file) => api('/v1/music?output_format=mp3_44100_128', { method: 'POST', body: JSON.stringify({ prompt, music_length_ms: seconds * 1000, model_id: opt.model || 'music_v2_5', force_instrumental: true }) }).then(r => save(r, file)));
if (before) { const after = await credits(); console.log(`credits used this run: ${after.used - before.used}  (total ${after.used} of ${after.limit})`); }

// tidy up effects and voice lines: cut leading and trailing silence (so they fire instantly) and bring peaks to -1 dB
if (what === 'trim') {
  const doneFile = resolve(ROOT, 'assets/audio/.trimmed.json');
  const done = new Set(JSON.parse(await readFile(doneFile, 'utf8').catch(() => '[]')));
  for (const dir of ['sfx', 'voice']) for (const f of (await readdir(resolve(ROOT, 'assets/audio', dir)).catch(() => [])).filter(x => x.endsWith('.mp3'))) {
    const id = dir + '/' + f, file = resolve(ROOT, 'assets/audio', dir, f), tmp = file + '.tmp.mp3';
    if (done.has(id) && !opt.force) continue;
    const cut = 'silenceremove=start_periods=1:start_threshold=-48dB:start_silence=0.005,areverse,silenceremove=start_periods=1:start_threshold=-52dB:start_silence=0.03,areverse';
    execFileSync('ffmpeg', ['-v', 'error', '-y', '-i', file, '-af', cut, '-c:a', 'libmp3lame', '-b:a', '128k', tmp]);
    const info = execFileSync('ffmpeg', ['-v', 'info', '-i', tmp, '-af', 'volumedetect', '-f', 'null', '-'], { stdio: ['ignore', 'pipe', 'pipe'], encoding: 'utf8' }).toString();
    void info;
    let max = 0; try { execFileSync('ffmpeg', ['-i', tmp, '-af', 'volumedetect', '-f', 'null', '-'], { stdio: ['ignore', 'ignore', 'pipe'] }); } catch (e) { void e; }
    const err = (() => { try { return execFileSync('sh', ['-c', `ffmpeg -i "${tmp}" -af volumedetect -f null - 2>&1 | grep max_volume`], { encoding: 'utf8' }); } catch { return ''; } })();
    const m = err.match(/max_volume: (-?[\d.]+) dB/); if (m) max = +m[1];
    const gain = Math.min(12, -1 - max);
    execFileSync('ffmpeg', ['-v', 'error', '-y', '-i', tmp, '-af', `volume=${gain.toFixed(1)}dB,afade=t=in:d=0.004`, '-c:a', 'libmp3lame', '-b:a', '128k', file]);
    execFileSync('rm', ['-f', tmp]);
    done.add(id); console.log(`${id}: peak ${max.toFixed(1)} dB, gain ${gain.toFixed(1)} dB`);
  }
  await writeFile(doneFile, JSON.stringify([...done].sort(), null, 1));
}

// manifest of whatever exists
const list = async dir => (await readdir(resolve(ROOT, 'assets/audio', dir)).catch(() => [])).filter(f => f.endsWith('.mp3')).sort();
const obj = async dir => Object.fromEntries((await list(dir)).map(f => [f.replace('.mp3', ''), `assets/audio/${dir}/${f}`]));
const out = `/* Generated by tools/gen-audio.mjs: which audio files exist. Anything missing
   falls back to a synthesized sound, so the game works without this content. */
export const SAMPLES = ${JSON.stringify(await obj('sfx'), null, 2)};
export const VOICE = ${JSON.stringify(await obj('voice'), null, 2)};
export const MUSIC = ${JSON.stringify(await obj('music'), null, 2)};
`;
await writeFile(resolve(ROOT, 'src/content/audio-manifest.js'), out);
let total = 0; for (const d of ['sfx', 'voice', 'music']) for (const f of await list(d)) total += (await stat(resolve(ROOT, 'assets/audio', d, f))).size;
console.log(`manifest written: ${(await list('sfx')).length} effects, ${(await list('voice')).length} voice lines, ${(await list('music')).length} music tracks, ${(total / 1048576).toFixed(1)} MB`);
