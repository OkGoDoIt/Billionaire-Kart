// Four original 16-bar arrangements for Offshore Cup. No soundfonts or sampled records.
// node tools/score-offshore.mjs [track-id]  (requires ffmpeg on PATH)
// Each A section quotes the track's original four-bar in-game melody. B sections,
// counterlines, voicings, kit, and fills are written for the individual courses.
import { spawnSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';

const songs = {
  'davos': {
    bpm: 123, root: 50, instrument: 'brass', chord: 'brass', swing: .05,
    // Council fanfare: horn section in close harmony, cowbell on the slalom turns.
    changes: [0, 7, 5, 7, 0, 9, 5, 7, 9, 5, 2, 7, 0, 7, 5, 7],
    hook: ['12 . 7 . 4 7 12 .', '16 . 12 . 9 . 7 .', '12 . 11 . 9 . 7 .', '9 . 7 . 4 . 2 .'],
    bridge: ['16 14 12 . 9 . . 7', '9 . 12 14 17 . . .', '14 . 9 11 12 . 9 .', '11 9 7 . 2 4 6 7'],
    bass: '0 . 7 . 12 . 7 .', kicks: [0, 2.5], chords: [0.5, 1.5, 2.5, 3.5], kit: 'march',
  },
  'international-waters': {
    bpm: 134, root: 48, instrument: 'reed', chord: 'pluck', swing: .17,
    // Offshore shanty: loping fiddle/fife, a concertina answering across the deck.
    changes: [0, 5, 7, 5, 0, 5, 7, 0, 9, 5, 2, 7, 0, 5, 7, 0],
    hook: ['7 12 11 12 16 . 14 .', '12 9 7 9 12 . 7 .', '7 12 11 12 19 . 16 .', '14 12 11 9 7 . . .'],
    bridge: ['12 . 16 19 21 . 19 16', '17 16 14 . 12 . 9 .', '14 . 17 21 19 17 14 .', '11 . 14 11 7 . 2 5'],
    bass: '0 . 7 12 0 . 7 .', kicks: [0, 1.75, 2.5], chords: [0.5, 1.5, 2.5, 3.5], kit: 'deck',
  },
  'wework-memorial': {
    bpm: 109, root: 50, instrument: 'tines', chord: 'tines', swing: .1,
    // An elevator bossa: Rhodes-style tines, nylon-string offbeats, rim clicks.
    changes: [0, 5, 7, 9, 0, 5, 7, 9, 2, 7, 4, 9, 0, 5, 7, 0],
    hook: ['12 . . 11 . . 9 .', '12 . . 14 . . 12 .', '9 . . 11 . . 12 .', '16 . . 14 . . 12 .'],
    bridge: ['17 . 16 14 . 9 . 12', '11 . . 14 17 16 . 14', '11 . 7 . 14 . 12 11', '9 . . 12 . 16 14 .'],
    bass: '0 . . 7 . 12 . 7', kicks: [0, 1.5, 2.75], chords: [0.75, 1.5, 2.75, 3.5], kit: 'office',
  },
  'boring-tunnel': {
    bpm: 138, root: 45, instrument: 'acid', chord: 'tines', swing: 0,
    // The cutter's two-note signal over a four-on-the-floor machine groove.
    changes: [0, 0, 3, 5, 0, 0, 3, 5, 8, 5, 3, 7, 0, 0, 3, 5],
    hook: ['12 . . . . . 12 .', '. . . . . . 15 .', '. . . . . . 12 .', '. . . . 10 . . .'],
    bridge: ['8 . 12 . . 15 12 .', '5 . 8 12 . 15 . 12', '3 . 7 . 10 . 15 .', '7 10 14 . 19 . 14 10'],
    bass: '0 0 12 0 0 0 12 0', kicks: [0, 1, 2, 3], chords: [.75, 2.75], kit: 'machine',
  },
};

const sr = 44100, twoPi = Math.PI * 2;
const sine = Math.sin, exp = Math.exp;
const parse = phrase => phrase.split(' ').map(n => n === '.' ? null : Number(n));

function render(id, score) {
  const beat = 60 / score.bpm, frames = Math.round(beat * 4 * 16 * sr);
  const mix = new Float32Array(frames * 2);
  let seed = 451;
  function noise() { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 2147483648 - 1; }
  // Fold tails across the downbeat, including the last snare fill and room reflections.
  function stamp(at, duration, gain, pan, sample) {
    const start = Math.round(at * sr), count = Math.round(duration * sr);
    const left = gain * Math.cos((pan + 1) * Math.PI / 4), right = gain * Math.sin((pan + 1) * Math.PI / 4);
    for (let i = 0; i < count; i++) {
      const v = sample(i / sr) * Math.min(1, (count - i) / 140);
      const j = 2 * ((start + i) % frames);
      mix[j] += left * v; mix[j + 1] += right * v;
    }
  }
  function note(kind, at, midi, beats, gain, pan) {
    const f = 440 * 2 ** ((midi - 69) / 12), gate = beats * beat;
    const tail = kind === 'tines' || kind === 'bell' ? .17 : .07;
    let previousNoise = 0;
    stamp(at, gate + tail * 3, gain, pan, t => {
      const p = twoPi * f * t, release = exp(-Math.max(0, t - gate) / tail);
      const touch = Math.min(1, t / (kind === 'brass' ? .028 : .004)) * release;
      switch (kind) {
        case 'brass': {
          const lip = p + .047 * sine(t * 33), bloom = 1 - exp(-t * 32);
          return touch * (.69 + .31 * exp(-t * 4)) * (sine(lip) + bloom * (.47 * sine(2 * lip) + .29 * sine(3 * lip) + .16 * sine(4 * lip) + .075 * sine(5 * lip)));
        }
        case 'reed': {
          const breath = noise(), air = breath - previousNoise; previousNoise = breath;
          const v = p + .12 * sine(t * 34) * Math.min(1, 4 * t);
          return touch * (sine(v) + .35 * sine(v * 2) + .19 * sine(v * 3) + .024 * air);
        }
        case 'pluck': return touch * exp(-t * 4.2) * (sine(p) + .46 * exp(-t * 8) * sine(2 * p) + .24 * exp(-t * 13) * sine(3 * p));
        case 'bass': return touch * exp(-t * 1.65) * (sine(p) + .5 * sine(2 * p) + .3 * exp(-t * 9) * sine(3 * p + .7 * exp(-t * 19) * sine(p)));
        case 'acid': return touch * (.68 + .32 * exp(-t * 9)) * (sine(p + 2.6 * exp(-t * 8) * sine(p)) + .25 * sine(2 * p + .4 * sine(3 * p)));
        case 'tines': return touch * exp(-t * 2) * (sine(p + 1.3 * exp(-t * 9) * sine(p)) + .28 * exp(-t * 6) * sine(3.01 * p));
        case 'bell': return touch * exp(-t * 5) * (.65 * sine(p) + .45 * exp(-t * 9) * sine(2.71 * p) + .25 * exp(-t * 14) * sine(4.07 * p));
      }
    });
  }
  function drum(kind, at, strength, pan = 0) {
    let last = 0, low = 0;
    const duration = { kick: .33, snare: .21, rim: .10, hat: .08, open: .19, tom: .20 }[kind];
    stamp(at, duration, strength, pan, t => {
      const n = noise(); const hi = n - last; last = n; low += .22 * (n - low);
      const attack = Math.min(1, t * 1200);
      switch (kind) {
        case 'kick': return attack * (sine(twoPi * (51 * t + 2.6 * (1 - exp(-t * 35)))) * exp(-t * 15) + .22 * hi * exp(-t * 165));
        case 'rim': return attack * (.72 * sine(1900 * t) * exp(-t * 60) + .45 * sine(4350 * t) * exp(-t * 82) + .35 * hi * exp(-t * 130));
        case 'snare': return attack * (.7 * (n - low) * exp(-t * 24) + .35 * sine(twoPi * (168 * t + .7 * (1 - exp(-t * 22)))) * exp(-t * 28));
        case 'tom': return attack * (.8 * sine(twoPi * (95 * t + 1.9 * (1 - exp(-t * 27)))) + .18 * n) * exp(-t * 22);
        default: return attack * hi * exp(-t * (kind === 'open' ? 22 : 78));
      }
    });
  }

  const machine = score.kit === 'machine', office = score.kit === 'office';
  for (let bar = 0; bar < 16; bar++) {
    const verse = bar % 4, bridge = bar >= 8 && bar < 12, last = verse === 3;
    const at = b => (bar * 4 + b) * beat;
    const chordRoot = score.root + score.changes[bar];
    const minor = machine ? [0, 5].includes(score.changes[bar]) : [2, 4, 9].includes(score.changes[bar]);
    const third = minor ? 3 : 4;
    for (const b of score.kicks) if (!(bar === 11 && b >= 2)) drum('kick', at(b), machine ? .67 : .58);
    for (const b of [1, 3]) drum(office || score.kit === 'deck' ? 'rim' : 'snare', at(b + .012), office ? .28 : .46, -.08);
    for (let e = 0; e < 8; e++) {
      const pos = e / 2 + (e % 2 ? score.swing / 2 : 0);
      drum(e === 7 && !last ? 'open' : 'hat', at(pos), e % 2 ? .087 : .12, .25);
    }
    if (last) for (const [j, b] of [3.25, 3.5, 3.75].entries()) drum(j === 2 ? 'tom' : 'snare', at(b), .17 + .07 * j, .25 - .2 * j);
    if (score.kit === 'march') for (const b of [1.5, 3.5]) note('bell', at(b), 69, .15, .08, .5);
    if (score.kit === 'deck') for (const b of [.75, 2.25, 3.75]) drum('tom', at(b), .16, -.35);
    if (machine && bar % 2) for (const b of [.75, 1.75, 3.25]) note('bell', at(b), chordRoot + 24, .14, .11, .55);

    const bass = parse(score.bass);
    for (let e = 0; e < 8; e++) if (bass[e] !== null) {
      let pitch = chordRoot - 12 + bass[e];
      if (last && e === 7) pitch = score.root - 13 + score.changes[(bar + 1) % 16];
      note(machine ? 'acid' : 'bass', at(e / 2 + (machine ? .065 : 0)), pitch, machine ? .32 : .45, machine ? .27 : .34, 0);
    }
    for (const b of score.chords) {
      const voicing = office ? [third, 7, minor || score.changes[bar] === 7 ? 10 : 11, 14] : [0, third, 7];
      voicing.forEach((v, j) => note(score.chord, at(b + j * .009), chordRoot + v, machine ? .15 : .21, office ? .089 : .072, -.38));
    }
    const melody = parse((bridge ? score.bridge : score.hook)[verse]);
    for (let e = 0; e < 8; e++) if (melody[e] !== null) {
      const pitch = score.root + 12 + melody[e], pos = e / 2 + (e % 2 ? score.swing / 2 : 0);
      const length = melody[e + 1] === null ? (machine ? .5 : .76) : .41;
      note(score.instrument, at(pos), pitch, length, machine ? .24 : .29, .03);
      if (bar >= 12 && !machine && e % 2 === 0) note(office ? 'pluck' : score.instrument, at(pos + .018), pitch - 12, length * .9, .105, .30);
    }
    // The second time through the hook, another desk/deck answers the lead.
    if (bar >= 4 && !bridge && bar % 2) {
      for (const [j, b] of [2.75, 3.25, 3.75].entries()) {
        note(office || machine ? 'bell' : 'pluck', at(b), chordRoot + [19, 16, 12][j] - (minor && j === 1 ? 1 : 0), .24, office ? .13 : .118, .47);
      }
    }
  }
  // Short stereo room reflections, including the wrap, keep the center free for the announcer.
  const dry = mix.slice();
  for (let f = 0; f < frames; f++) {
    const early = ((f - 1543 + frames) % frames) * 2, late = ((f - 2611 + frames) % frames) * 2;
    mix[2 * f] = Math.tanh(dry[2 * f] + .14 * dry[early + 1] + .07 * dry[late]);
    mix[2 * f + 1] = Math.tanh(dry[2 * f + 1] + .11 * dry[early] + .09 * dry[late + 1]);
  }
  return mix;
}

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const selected = process.argv[2];
if (selected && !songs[selected]) throw Error('Unknown course ' + selected);
const tmp = mkdtempSync(join(tmpdir(), 'kart-score-'));
try {
  for (const [id, song] of Object.entries(songs)) {
    if (selected && selected !== id) continue;
    const raw = join(tmp, 'score.f32'), audio = render(id, song);
    writeFileSync(raw, Buffer.from(audio.buffer));
    const input = ['-hide_banner', '-nostats', '-f', 'f32le', '-ar', String(sr), '-ac', '2', '-i', raw];
    const probe = spawnSync('ffmpeg', [...input, '-af', 'ebur128=peak=true', '-f', 'null', '-'], { encoding: 'utf8' });
    if (probe.status !== 0) throw Error(probe.stderr);
    const summary = probe.stderr.split('Summary:').pop();
    const lufs = Number(summary.match(/I:\s+(-?[\d.]+) LUFS/)[1]), peak = Number(summary.match(/Peak:\s+(-?[\d.]+) dBFS/)[1]);
    const trim = Math.min(-15.2 - lufs, -1.8 - peak);
    const output = join(root, 'assets/audio/music', id + '.mp3');
    const encode = spawnSync('ffmpeg', [...input, '-af', 'volume=' + trim.toFixed(2) + 'dB', '-c:a', 'libmp3lame', '-b:a', '128k', '-y', output], { encoding: 'utf8' });
    if (encode.status !== 0) throw Error(encode.stderr);
    console.log(id, Math.round(audio.length / 2 / sr) + 's', (lufs + trim).toFixed(1) + ' LUFS');
  }
} finally { rmSync(tmp, { recursive: true, force: true }); }
