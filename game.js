/* BILLIONAIRE KART: AI ARMS RACE — a parody party kart racer.
   Zero-build: Three.js via CDN import map. All models procedural, all audio synthesized. */
import * as THREE from 'three';
import * as GTEX from './gfx/textures.js';
import * as GMAT from './gfx/materials.js';
import { setupRenderer, applySky, setupLights, sunFollow, applyFog, SKY_URLS } from './gfx/environment.js';
import { createPost } from './gfx/post.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

const $ = id => document.getElementById(id);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const rand = (a, b) => a + Math.random() * (b - a);
const angNorm = a => { while (a > Math.PI) a -= Math.PI * 2; while (a < -Math.PI) a += Math.PI * 2; return a; };
const lerpAngle = (a, b, t) => a + angNorm(b - a) * t;
const fmtTime = t => { if (t == null || !isFinite(t)) return '--:--.-'; const m = Math.floor(t / 60), s = t - m * 60; return `${m}:${s.toFixed(1).padStart(4, '0')}`; };
const SUFFIX = ['th', 'st', 'nd', 'rd', 'th', 'th', 'th', 'th', 'th', 'th', 'th', 'th', 'th'];

/* ================= RACERS ================= */
const RACERS = [
  { name: 'Elon',  title: 'Rocket Man',        emoji: '🚀', color: 0xd23b2e, suit: 0x22242a, skin: 0xf2c79b, spd: 5, acc: 3, grip: 3, quote: '“Funding secured. Also, this is a rocket now.”',
    barks: { hit: ['My other car is on Mars!', 'That dent costs $44 billion!'], boost: ['To Mars!', 'Full self-driving (supervised)'], win: 'Mars GP is mine. Obviously.' } },
  { name: 'Sam',   title: 'The Optimist',      emoji: '🤖', color: 0x10a37f, suit: 0xe8e4da, skin: 0xeec39a, spd: 3, acc: 5, grip: 4, quote: '“AGI by Tuesday. Podium by Friday.”',
    barks: { hit: ['That was not aligned!', 'I feel the AGI… leaving'], boost: ['Scaling laws say I win', 'Exponential!', 'Ram Altman mode'], win: 'The board has approved this victory.' } },
  { name: 'Zuck',  title: 'The Lizard (allegedly)', emoji: '🦎', color: 0x1877f2, suit: 0x2b4c9b, skin: 0xf5cfa8, spd: 4, acc: 3, grip: 5, quote: '“I was human once. The grip proves nothing.”',
    barks: { hit: ['Reptilian reflexes… failed', 'Metaverse, render my revenge!'], boost: ['Legs update installed', 'Smoking these meats!', 'Zuckaissance, baby'], win: 'Sweet Baby Ray’s for everyone.' } },
  { name: 'Bezos', title: 'Prime Mover',       emoji: '📦', color: 0xff9900, suit: 0x232f3e, skin: 0xf0bd8d, spd: 5, acc: 2, grip: 3, quote: '“Your overtake arrives tomorrow. Mine is today.”',
    barks: { hit: ['That package was fragile!', 'Customer obsession, my foot', 'One-third of my pit crew is gone'], boost: ['Same-day shipping!', 'Day 1! Still Day 1!'], win: 'Delivered. On time. You’re welcome.' } },
  { name: 'Jensen', title: 'Leather Jacket',  emoji: '🏎️', color: 0x76b900, suit: 0x17181c, skin: 0xe8b98a, spd: 4, acc: 4, grip: 4, quote: '“The more you race, the more you save.”',
    barks: { hit: ['Jensen down! Leather scuffed!', 'That was not CUDA-accelerated'], boost: ['GPU GO BRRR', 'Tensor cores engaged'], win: 'Jacket #34 of 40, if you\'re counting' } },
  { name: 'Satya', title: 'Cloud Boss',        emoji: '☁️', color: 0x00a4ef, suit: 0x35424e, skin: 0xc98d5f, spd: 4, acc: 4, grip: 3, quote: '“Hit refresh. On the whole leaderboard.”',
    barks: { hit: ['Unexpected downtime!', 'Growth mindset… growth mindset…'], boost: ['Azure skies ahead', 'Empower every racer? No. Just me.'], win: 'A cloud-first, mobile-first victory.' } },
  { name: 'Dario', title: 'The Safety Officer', emoji: '🦺', color: 0x9e2a2b, suit: 0xf3ead8, skin: 0xf2c79b, spd: 3, acc: 4, grip: 5, quote: '“I have read the risk assessment. I AM the risk.”',
    barks: { hit: ['That was NOT in the evals!', 'Constitutional karting violated!'], boost: ['Carefully… quickly!', 'Red-teamed this corner'], win: 'A safe and responsible win.' } },
  { name: 'Demis', title: 'The Games Master',  emoji: '♟️', color: 0x7b4fd0, suit: 0x2e2440, skin: 0xd9a06f, spd: 4, acc: 4, grip: 4, quote: '“I solved Go. This is a roundabout.”',
    barks: { hit: ['Recalculating… recalculating…', 'A blunder. Noted.'], boost: ['AlphaGo mode', 'Monte Carlo says GO'], win: 'Solved. Like protein folding.' } },
  { name: 'Trump', title: 'The Dealmaker',     emoji: '🦅', color: 0xf2b01e, suit: 0x1c2a4a, skin: 0xeeb287, spd: 5, acc: 2, grip: 2, quote: '“Nobody races better than me, everybody says so.”',
    barks: { hit: ['Fake news!', 'That corner was rigged!'], boost: ['Tremendous speed, folks', 'HUGE boost'], win: 'We won, by a lot. Everybody knows it.' } },
  { name: 'Cook',  title: 'The Operator (Ret.)', emoji: '🍏', color: 0xc0c6ce, suit: 0x3a3f45, skin: 0xeec39a, spd: 3, acc: 4, grip: 5, quote: '“I handed over the keys. Kept the kart.”',
    barks: { hit: ['That dents the margins!', 'Supply chain disrupted!'], boost: ['Good morning — to the lead', 'Operational excellence'], win: 'Cooked to perfection.' } },
  { name: 'Larry & Sergey', title: 'The Founders', emoji: '🔎', color: 0x4285f4, suit: 0x3c4043, skin: 0xeec39a, spd: 4, acc: 4, grip: 4, duo: true, quote: '“Don\'t be evil. Do be first.”',
    barks: { hit: ['That result has been deprecated', 'OK Google, revenge', 'We spent $100M to not pay for that!'], boost: ['Moonshot mode', 'PageRank: P1', 'Nevada looks lovely this time of year'], win: 'Organized the world\'s information. And this race.' } },
  { name: 'Bill',  title: 'The Philanthropist', emoji: '🪟', color: 0x00adef, suit: 0x4a4238, skin: 0xf2c79b, spd: 3, acc: 3, grip: 4, aiSkill: 1.05, quote: '“640K of horsepower ought to be enough for anybody.”',
    barks: { hit: ['Clippy warned me about this', 'Ctrl+Alt+Defeat!'], boost: ['Where do you want to go today?', 'Rebooting… faster'], win: 'I will now give away this trophy. Slowly.' } },
  { name: 'Thiel', title: 'The Seeing Stone',  emoji: '👁️', color: 0x30323a, suit: 0x101014, skin: 0xf2c79b, spd: 4, acc: 3, grip: 4, aiSkill: 1.04, quote: '“We see your racing line before you drive it.”',
    barks: { hit: ['That interaction was logged', 'Deleting that footage…'], boost: ['Total track awareness', 'The stone sees the podium', 'Lecturing the Antichrist at 9, racing at 10'], win: 'We knew. We always know.' } },
  { name: 'Holmes', title: 'The Vaporware',    emoji: '🧪', color: 0xf2f2f0, suit: 0x0a0a0a, skin: 0xf5d7b0, spd: 5, acc: 4, grip: 2, sputter: true, quote: '“This kart runs on one drop of fuel. Allegedly.”',
    barks: { hit: ['The prototype is fine!', 'That was a calibration issue'], boost: ['It works! (This time)', 'Revolutionary! (Unverified)'], win: 'Now a major motion picture' } },
  { name: 'Ellison', title: 'The Media Mogul', emoji: '🏝️', color: 0xb01e24, suit: 0x57261f, skin: 0xd9905f, spd: 4, acc: 3, grip: 3, quote: '“I own the island, the database, and now the news.”',
    barks: { hit: ['My lawyers will hear about this', 'That segment has been pulled', 'I was the richest man alive for a WEEK'], boost: ['Hostile takeover (of P1)', 'Synergy!'], win: 'As reported first by my own networks.' } },
  { name: 'Murdoch', title: 'The Succession',  emoji: '🗞️', color: 0x6e1423, suit: 0x2a2d34, skin: 0xf0c8a0, spd: 3, acc: 1, grip: 5, aiSkill: 1.06, consistent: true, quote: '“I\'ve outlived every rival. And every heir\'s lawyer.”',
    barks: { hit: ['That story will not run', 'My editors will bury this'], boost: ['Extra! Extra! Overtake all about it', 'Tabloid turbo'], win: 'Lachlan inherits this trophy in 2050' } },
  { name: 'Soros', title: 'The Final Boss',    emoji: '💸', color: 0x1f4d2e, suit: 0x232323, skin: 0xf2d3ac, spd: 4, acc: 4, grip: 4, aiSkill: 1.06, quote: '“I am not the final boss. I merely fund him.”',
    barks: { hit: ['A conspiracy against me, surely', 'Shorting my position? Bold'], boost: ['Reflexivity, baby', 'The market moves with me'], win: 'Blamed for this result in 14 countries.' } },
];

/* ================= TRACKS ================= */
const TRACKS = [
  { name: 'Silicon Valley GP', sky: 0x87c9eb, fog: 0xa8d4f0, ground: 0x57a047, roadSeed: 1, skyKey: 'valley', fogKey: 'valleyDay',
    points: [[0,-260],[150,-215],[235,-110],[205,10],[265,110],[170,205],[40,245],[-95,205],[-215,225],[-265,105],[-215,-15],[-255,-130],[-140,-215]] },
  { name: 'Mars GP', sky: 0xe8906a, fog: 0xe8a37c, ground: 0xa5502f, roadSeed: 2, skyKey: 'mars', fogKey: 'marsSunset',
    points: [[0,-240],[190,-190],[250,-40],[150,60],[230,170],[90,250],[-60,205],[-170,255],[-260,140],[-190,20],[-265,-90],[-170,-190],[-70,-160]] },
];
const BILLBOARDS = ['AGI COMING SOON™', 'GPU GO BRRR', 'THIS SIGN COST $4.20', 'NOW HIRING: PROMPT WHISPERERS', 'MARS OR BUST', 'YOUR DATA HERE', 'NOT FINANCIAL ADVICE', 'SYNERGY DOWNSHIFT AHEAD', 'PIVOT! PIVOT!', 'DISRUPTING TRAFFIC SINCE 2026'];

/* ================= ITEMS ================= */
const ITEMS = {
  boost:    { icon: '💰', name: 'Series A Boost', desc: 'Instant speed boost — about 1.5 s of extra pace' },
  banana:   { icon: '💧', name: 'Data Leak', desc: 'Drop a slick data puddle behind you — rivals who hit it spin out' }, // internal id stays 'banana'; everything user-visible is Data Leak
  green:    { icon: '📜', name: 'Subpoena', desc: 'Fires straight ahead — spins out the first kart it hits' },
  red:      { icon: '🐦', name: 'Viral Tweet', desc: 'Homes in on the kart ahead of you and spins them out' },
  blue:     { icon: '⚖️', name: 'Antitrust Suit', desc: 'Flies to the race leader and explodes — spins everyone caught in the blast' },
  star:     { icon: '⭐', name: 'Viral Moment', desc: 'Invincible for 6 s — shrug off hits and spin rivals just by bumping them' },
  lightning:{ icon: '📉', name: 'Market Crash', desc: 'Shrinks every kart ahead of you for ~3.5 s — shrunk karts crawl' },
  horn:     { icon: '📣', name: 'Spin Team', desc: 'Shockwave: destroys nearby items, spins adjacent karts — and swats an Antitrust Suit out of the air' },
  bomb:     { icon: '💣', name: 'Pink Slip', desc: 'Drops a bomb behind you — blows on a 1.6 s fuse or on contact, spinning karts in the blast' },
  blooper:  { icon: '📰', name: 'Smear Campaign', desc: 'Splats ink over the screen of every kart ahead of you for ~2.5 s' },
  boo:      { icon: '👻', name: 'Insider Trading', desc: 'Turn intangible for 3 s with a small boost — and steal a random rival’s item' },
  golden:   { icon: '🏆', name: 'Series F', desc: 'A 5 s funding window — keep tapping ITEM to re-boost until it closes' },
  bailout:  { icon: '🛟', name: 'Government Bailout', desc: 'Auto-drives you back into the fight for up to 5.5 s — ends early when you reach 3rd' },
};
function rollItem(pos) { // pos 1..8 — position-weighted, the Mario Kart secret sauce
  // Fairness rules from the MK audit: 1st gets DEFENCE ONLY (leak/green/horn/boost/bomb —
  // no red/star/blue/lightning/boo/golden/bailout, and no coin-style dud). Bailout is a
  // last-place lifeline: 7th/8th only, small weight in 6th. No self-harm items, ever.
  const t = [
    null,
    [['banana', 30], ['green', 24], ['horn', 22], ['boost', 14], ['bomb', 10]],                                       // 1st: defence + the horn counter
    [['banana', 22], ['green', 22], ['horn', 20], ['red', 16], ['boost', 14], ['bomb', 6]],                           // 2nd
    [['green', 20], ['red', 20], ['horn', 14], ['boost', 18], ['banana', 12], ['star', 8], ['blooper', 5], ['bomb', 3]], // 3rd
    [['red', 18], ['boost', 18], ['green', 12], ['star', 12], ['boo', 10], ['golden', 8], ['blue', 8], ['lightning', 6], ['blooper', 5], ['bomb', 3]], // 4th
    [['boost', 20], ['red', 16], ['star', 14], ['blue', 12], ['boo', 10], ['golden', 10], ['lightning', 8], ['blooper', 5], ['bomb', 3], ['green', 2]], // 5th
    [['boost', 20], ['star', 16], ['blue', 14], ['golden', 12], ['boo', 10], ['lightning', 10], ['red', 10], ['bailout', 4], ['blooper', 2], ['bomb', 2]], // 6th
    [['star', 20], ['blue', 16], ['bailout', 14], ['golden', 14], ['boost', 14], ['lightning', 12], ['boo', 6], ['bomb', 4]],  // 7th
    [['star', 22], ['blue', 18], ['bailout', 17], ['lightning', 15], ['golden', 14], ['boost', 10], ['boo', 4]],              // 8th: the full comeback kit
  ][clamp(pos, 1, 8)];
  let sum = 0; for (const [, w] of t) sum += w;
  let r = Math.random() * sum;
  for (const [id, w] of t) { r -= w; if (r <= 0) return id; }
  return 'boost';
}

/* ================= AUDIO (all synthesized) ================= */
const A = {
  ctx: null, muted: false, eng: null, engGain: null, musicTimer: 0, nextNote: 0, step: 0,
  init() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    try {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      const g = this.ctx.createGain(); g.gain.value = 0; g.connect(this.ctx.destination);
      const o1 = this.ctx.createOscillator(); o1.type = 'sawtooth'; o1.frequency.value = 60;
      const o2 = this.ctx.createOscillator(); o2.type = 'square'; o2.frequency.value = 30;
      const f = this.ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 500;
      o1.connect(f); o2.connect(f); f.connect(g); o1.start(); o2.start();
      this.eng = { o1, o2, f }; this.engGain = g;
    } catch (e) { /* no audio, no problem */ }
  },
  engine(ratio, racing) {
    if (!this.ctx || !this.eng) return;
    const t = this.ctx.currentTime;
    const fq = 55 + ratio * 165 + (Math.random() * 4);
    this.eng.o1.frequency.setTargetAtTime(fq, t, 0.05);
    this.eng.o2.frequency.setTargetAtTime(fq * 0.5, t, 0.05);
    this.eng.f.frequency.setTargetAtTime(320 + ratio * 900, t, 0.08);
    this.engGain.gain.setTargetAtTime(this.muted || !racing ? 0 : 0.045 + ratio * 0.03, t, 0.1);
  },
  tone(freq, dur, type = 'sine', vol = 0.12, slide = 0, delay = 0) {
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime + delay, o = this.ctx.createOscillator(), g = this.ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq + slide), t + dur);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g); g.connect(this.ctx.destination); o.start(t); o.stop(t + dur + 0.02);
  },
  noise(dur = 0.2, vol = 0.15, freq = 1000) {
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime, len = Math.floor(this.ctx.sampleRate * dur);
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = this.ctx.createBufferSource(); src.buffer = buf;
    const f = this.ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = freq;
    const g = this.ctx.createGain(); g.gain.value = vol;
    src.connect(f); f.connect(g); g.connect(this.ctx.destination); src.start(t);
  },
  beep(final) { this.tone(final ? 880 : 440, final ? 0.5 : 0.22, 'square', 0.1); },
  pickup() { this.tone(660, 0.09, 'sine', 0.1); this.tone(990, 0.14, 'sine', 0.1, 0, 0.07); },
  use() { this.noise(0.25, 0.12, 1600); this.tone(300, 0.25, 'sawtooth', 0.07, 500); },
  hit() { this.tone(160, 0.35, 'sawtooth', 0.14, -110); this.noise(0.25, 0.16, 500); },
  boostSnd() { this.noise(0.5, 0.1, 2400); this.tone(200, 0.5, 'sine', 0.06, 700); },
  zap() { this.tone(1200, 0.4, 'sawtooth', 0.12, -1150); this.noise(0.35, 0.14, 3000); },
  driftBoost() { this.tone(520, 0.3, 'square', 0.08, 500); },
  fanfare(delay = 0) { // POLISH.md §4: trumpet-ish sawtooth arpeggio C-E-G-C', two passes + shimmer, ≈1.6 s
    [523, 659, 784, 1047].forEach((f, i) => this.tone(f, 0.26, 'sawtooth', 0.05, 0, delay + i * 0.11));
    [523, 659, 784, 1047].forEach((f, i) => this.tone(f, 0.26, 'sawtooth', 0.05, 0, delay + 0.48 + i * 0.11));
    this.tone(1319, 0.65, 'sawtooth', 0.055, 0, delay + 0.96);
    this.tone(1568, 0.65, 'triangle', 0.04, 0, delay + 0.96);
    this.tone(2093, 0.5, 'sine', 0.02, 0, delay + 1.1);
  },
  /* ---- UI cue sheet (POLISH.md §4): short, bright, major-key, well under race SFX.
     tone() already hard-respects the mute toggle (this.muted), so every cue below
     is covered by the one mute switch. ---- */
  uiTick() { this.tone(1200, 0.03, 'sine', 0.018); },                                    // hover/focus move — the MK cursor tick
  uiSelect() { this.tone(659, 0.05, 'triangle', 0.05); this.tone(880, 0.06, 'triangle', 0.05, 0, 0.045); }, // confirm: E5→A5 up-chirp
  uiTab() { this.tone(880, 0.04, 'triangle', 0.032); this.tone(1108, 0.05, 'triangle', 0.032, 0, 0.035); }, // tab/option switch
  uiBack() { this.tone(440, 0.05, 'triangle', 0.04); this.tone(330, 0.07, 'triangle', 0.04, 0, 0.05); },     // back/cancel: A4→E4
  uiError() { const n = performance.now(); if (n - (this._errT || 0) < 250) return; this._errT = n; this.tone(140, 0.12, 'square', 0.055); }, // invalid tap buzz (self-throttled)
  cheerPop() { this.tone(2400, 0.06, 'sine', 0.028); },                                  // tile-select star twinkle
  sadTrombone() { this.tone(233, 0.22, 'sawtooth', 0.042, -12); this.tone(220, 0.36, 'sawtooth', 0.042, -20, 0.2); }, // 7th–8th, comedy not punishment
  resultsSting(rank) { // §4 fanfare timing: lands 150 ms after the results banner
    if (rank <= 3) this.fanfare(0.15);
    else if (rank <= 6) [392, 523, 659].forEach((f, i) => this.tone(f, 0.16, 'triangle', 0.045, 0, 0.15 + i * 0.09));
    else { this.tone(233, 0.22, 'sawtooth', 0.042, -12, 0.15); this.tone(220, 0.36, 'sawtooth', 0.042, -20, 0.35); }
  },
  music(dt, racing) { // tiny bass+arp sequencer
    if (!this.ctx || this.muted || !racing) return;
    this.nextNote -= dt; if (this.nextNote > 0) return;
    this.nextNote = 0.21; const s = this.step++;
    const bass = [55, 55, 65.4, 49][Math.floor(s / 8) % 4];
    if (s % 2 === 0) this.tone(bass * 2, 0.18, 'triangle', 0.055);
    if (s % 4 === 2) this.tone(bass * 4, 0.12, 'square', 0.02);
    if (s % 8 === 6) this.noise(0.05, 0.02, 6000);
    const arp = [220, 261.6, 329.6, 392, 329.6, 261.6];
    if (s % 2 === 1) this.tone(arp[s % 6] * 2, 0.1, 'sine', 0.018);
  },
};

/* ================= CORE STATE ================= */
const N = 900, HALF_W = 11;
let LAPS = 3; // mutable so the sim harness can run shorter races (BK.setLaps)
let renderer, scene, camera, sunLight, hemiLight, post = null;
let curve, samples = [], tangents = [], normals = [], segLen = 1.8, trackCenter = new THREE.Vector3();
let karts = [], bananas = [], projectiles = [], itemBoxes = [], clouds = [], bombs = [];
let gameState = 'menu'; // menu | countdown | racing | finished
let paused = false, raceTime = 0, countdownT = 0, lastCount = 99, finishDelay = -1, playerFinishedAt = 0;
let selectedRacer = 0, selectedTrack = 0, difficulty = 1;
const DIFF_MUL = [0.90, 0.955, 1.0];
let camHeading = 0, camFov = 62, shake = 0, menuAngle = 0.6, hudTimer = 0, progRate = 0, prevPlayerCont = 0;
let centerUntil = 0, toastUntil = 0, inkUntil = 0;
let hitstopT = 0, revHeld = 0, revOverWarned = false, lastRank = 0; // fun-pass: hitstop, rocket-start, position toasts
const keys = {};
const touchFlags = { left: false, right: false, gas: false, brake: false, drift: false };
/* CONTROL LAB: five switchable touch schemes, persisted. Analog stick values funnel into playerInput. */
const TOUCH_SCHEMES = ['buttons', 'stick1', 'sticks2', 'autog', 'dualstick'];
let touchScheme = 'buttons';
try { const s = localStorage.getItem('bk_touch_scheme'); if (TOUCH_SCHEMES.includes(s)) touchScheme = s; } catch (e) { }
const touchAnalog = { steer: 0, throttle: 0, brake: 0 };
const stickPointers = new Map(); // pointerId -> { zone, ox, oy }
const driftTap = { active: false, started: false, expires: 0 }; // Pedal & Stick tap-to-drift-hop latch
let smartMode = 'auto'; // 'auto' = ON for Auto-Gas only; explicit user choice persists across schemes
try { const m = localStorage.getItem('bk_smart_steer'); if (['auto', 'on', 'off'].includes(m)) smartMode = m; } catch (e) { }
function smartSteerOn() { return smartMode === 'on' || (smartMode === 'auto' && touchScheme === 'autog'); }
let autoDriftMode = 'auto'; // Auto-Drift assist: hold steer >85% for >0.25s = drift (Mario Kart Tour Simple style). 'auto' = ON for Auto-Gas only
try { const m = localStorage.getItem('bk_auto_drift'); if (['auto', 'on', 'off'].includes(m)) autoDriftMode = m; } catch (e) { }
function autoDriftOn() { return autoDriftMode === 'on' || (autoDriftMode === 'auto' && touchScheme === 'autog'); }
function setAutoDriftMode(m) {
  autoDriftMode = m;
  try { localStorage.setItem('bk_auto_drift', m); } catch (e) { }
  document.querySelectorAll('.adrift-btn').forEach(b => b.textContent = `🌀 Auto-drift: ${m === 'auto' ? 'Auto (Auto-Gas only)' : m.toUpperCase()}`);
}
let steerFullSince = 0;
function popItemSlot() { const ic = $('item-icon'); ic.style.transform = 'scale(1.45)'; setTimeout(() => { ic.style.transform = ''; }, 130); }
function fxTransition(kind, fn, origin) { if (window.BKFX && BKFX.transition) BKFX.transition(kind, fn, origin); else fn(); } // polish wipes (POLISH.md §2.8) — no hard cuts between screens
function fireItem() { // every touch item gesture routes through here: haptic pulse + slot pop + use
  if (gameState !== 'racing' || paused) return;
  if (navigator.vibrate) { try { navigator.vibrate(12); } catch (e) { } }
  popItemSlot();
  useItem(playerKart());
}
function setSmartMode(m) {
  smartMode = m;
  try { localStorage.setItem('bk_smart_steer', m); } catch (e) { }
  document.querySelectorAll('.smart-btn').forEach(b => b.textContent = `🧭 Smart steering: ${m === 'auto' ? 'Auto (Auto-Gas only)' : m.toUpperCase()}`);
}
function setTouchScheme(s, silent) {
  if (!TOUCH_SCHEMES.includes(s)) return;
  touchScheme = s;
  try { localStorage.setItem('bk_touch_scheme', s); } catch (e) { }
  document.body.dataset.scheme = s;
  document.querySelectorAll('.scheme-btn').forEach(b => b.classList.toggle('selected', b.dataset.scheme === s));
  stickPointers.clear(); touchAnalog.steer = 0; touchAnalog.throttle = 0; touchAnalog.brake = 0;
  for (const id of ['stick-a', 'stick-b']) { const el = $(id); if (el) { el.style.display = 'none'; el.classList.remove('braking'); } }
  refreshTouchUI();
  if (!silent) showToast({ buttons: '🕹️ Touch: Buttons', stick1: '👍 Touch: Thumbstick — hold right side = gas', sticks2: '✌️ Touch: Pedal & Stick', autog: '🚗 Touch: Auto-Gas — just steer!', dualstick: '🕹️ Touch: Dual Stick — left steers, right drives' }[s]);
}
let touchUiSig = '';
function refreshTouchUI() {
  const inRace = gameState !== 'menu' && !$('hud').classList.contains('hidden');
  const touch = isTouchDevice();
  const sig = `${touchScheme}|${inRace}|${touch}|${gameState}`;
  if (sig === touchUiSig) return; touchUiSig = sig;
  // Input-aware HUD layout (Addendum 3): body.touch-ui is present exactly when
  // on-screen controls are rendered. CSS then moves the item slot + race feed
  // to the top-centre stack (thumbs own the bottom); without it they use the
  // classic lower-left corner. Scheme switches re-run this, so the layout
  // follows mid-race changes immediately.
  document.body.classList.toggle('touch-ui', touch && inRace);
  $('touch-controls').classList.toggle('hidden', !(touch && inRace && touchScheme === 'buttons'));
  $('scheme-ui').classList.toggle('hidden', !(touch && inRace && touchScheme !== 'buttons'));
  $('stick-layer').style.display = (touch && inRace && touchScheme !== 'buttons') ? 'block' : 'none';
  $('autog-note').classList.toggle('hidden', !(touchScheme === 'autog' && inRace));
}
const mouse = { down: false, x: 0.5, lastMove: -99 };
const gyro = { enabled: false, steer: 0, baseGamma: null, baseBeta: null };
let debugInput = { throttle: null, steer: null, brake: null, drift: null };
let padItemPrev = false, padStartPrev = false, elapsed = 0, timeScale = 1;

const playerKart = () => karts.find(k => k.isPlayer);
let currentField = []; // racer indices in the current race: player's pick + 7 sampled opponents (field of 8 from the pool)
function shuffled(arr) { const a = [...arr]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
function previewField() { const rest = RACERS.map((_, i) => i).filter(i => i !== selectedRacer); return [selectedRacer, ...rest.slice(0, 7)]; }
function sampleField() { const rest = RACERS.map((_, i) => i).filter(i => i !== selectedRacer); return [selectedRacer, ...shuffled(rest).slice(0, 7)]; }
const sortedKarts = () => [...karts].sort((a, b) => b.continuous - a.continuous);
const rankOf = k => sortedKarts().indexOf(k) + 1;
const wrapIdx = i => ((i % N) + N) % N;
function sampleAt(cont) { return samples[wrapIdx(Math.round(cont))]; }
function tangentAt(cont) { return tangents[wrapIdx(Math.round(cont))]; }
function headingOf(dir) { return Math.atan2(dir.x, dir.z); }
function forwardVec(h) { return new THREE.Vector3(Math.sin(h), 0, Math.cos(h)); }

function nearestSample(pos, lastIdx, back = 50, fwd = 90) {
  let best = lastIdx, bestD = Infinity;
  for (let d = -back; d <= fwd; d++) {
    const i = wrapIdx(lastIdx + d), s = samples[i];
    const dx = pos.x - s.x, dz = pos.z - s.z, dd = dx * dx + dz * dz;
    if (dd < bestD) { bestD = dd; best = i; }
  }
  return best;
}
function globalNearest(pos) { // coarse, for projectiles
  let best = 0, bestD = Infinity;
  for (let i = 0; i < N; i += 6) {
    const s = samples[i], dx = pos.x - s.x, dz = pos.z - s.z, dd = dx * dx + dz * dz;
    if (dd < bestD) { bestD = dd; best = i; }
  }
  return nearestSample(pos, best, 8, 8);
}
function lateralAt(pos, idx) {
  const s = samples[idx], n = normals[idx];
  return (pos.x - s.x) * n.x + (pos.z - s.z) * n.z;
}

/* ================= RENDERER ================= */
function initRenderer() {
  renderer = new THREE.WebGLRenderer({ canvas: $('game-canvas'), antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
  renderer.setSize(window.innerWidth, window.innerHeight);
  setupRenderer(renderer); // ACES tone mapping + PCFSoft shadows + sRGB (gfx/environment.js)
  camera = new THREE.PerspectiveCamera(62, window.innerWidth / window.innerHeight, 0.5, 1600);
  camera.position.set(0, 90, 260);
  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    if (post) post.setSize(window.innerWidth, window.innerHeight);
  });
}

/* ================= TEXTURES (canvas) ================= */
function canvasTexture(w, h, draw) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
function curbTexture() { // transparent strip texture: red/white blocks only at both edges (drawn over the gfx asphalt)
  const t = canvasTexture(256, 128, (g, w, h) => {
    g.clearRect(0, 0, w, h);
    for (let y = 0; y < h; y += 64) { g.fillStyle = (y / 64) % 2 ? '#f2f2f2' : '#d23b2e'; g.fillRect(0, y, 14, 64); g.fillRect(w - 14, y, 14, 64); }
  });
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}
function roadTexture() {
  const t = canvasTexture(256, 512, (g, w, h) => {
    g.fillStyle = '#34373d'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 2600; i++) { g.fillStyle = `rgba(${Math.random() > .5 ? '255,255,255' : '0,0,0'},${Math.random() * 0.09})`; g.fillRect(Math.random() * w, Math.random() * h, 2, 2); }
    // curbs: left/right, alternating red/white along length (v)
    for (const x of [0, w - 20]) {
      g.fillStyle = '#d23b2e'; g.fillRect(x, 0, 20, h / 2);
      g.fillStyle = '#f2f2f2'; g.fillRect(x, h / 2, 20, h / 2);
    }
    g.fillStyle = 'rgba(255,255,255,.85)'; g.fillRect(24, 0, 4, h); g.fillRect(w - 28, 0, 4, h);
    g.fillStyle = 'rgba(255,217,74,.75)'; g.fillRect(w / 2 - 3, 40, 6, 150); // centre dash segment per tile
  });
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 4;
  return t;
}
function checkerTexture() {
  return canvasTexture(256, 128, (g, w, h) => {
    const cols = 12, rows = 2, cw = w / cols, ch = h / rows;
    for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) { g.fillStyle = (x + y) % 2 ? '#111' : '#fff'; g.fillRect(x * cw, y * ch, cw, ch); }
  });
}
function boxTexture() {
  return canvasTexture(128, 128, (g, w, h) => {
    const grad = g.createLinearGradient(0, 0, 0, h); grad.addColorStop(0, '#ffe066'); grad.addColorStop(1, '#ff9f1c');
    g.fillStyle = grad; g.fillRect(0, 0, w, h);
    g.strokeStyle = '#d23b2e'; g.lineWidth = 10; g.strokeRect(5, 5, w - 10, h - 10);
    g.fillStyle = '#d23b2e'; g.font = '900 84px system-ui'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText('?', w / 2, h / 2 + 4);
  });
}
function billboardTexture(text, hue) {
  return canvasTexture(512, 196, (g, w, h) => {
    g.fillStyle = '#101736'; g.fillRect(0, 0, w, h);
    g.strokeStyle = `hsl(${hue},90%,60%)`; g.lineWidth = 12; g.strokeRect(8, 8, w - 16, h - 16);
    g.fillStyle = '#fff'; g.font = '900 44px system-ui'; g.textAlign = 'center'; g.textBaseline = 'middle';
    const words = text.split(' '); const lines = []; let line = '';
    for (const word of words) { if ((line + ' ' + word).trim().length > 17) { lines.push(line.trim()); line = word; } else line += ' ' + word; }
    lines.push(line.trim());
    lines.forEach((l, i) => g.fillText(l, w / 2, h / 2 + (i - (lines.length - 1) / 2) * 52));
  });
}
function nameSprite(racer, isPlayer) {
  const tex = canvasTexture(320, 80, (g, w, h) => {
    g.fillStyle = 'rgba(4,8,22,.62)';
    g.beginPath(); g.roundRect(4, 10, w - 8, h - 20, 18); g.fill();
    if (isPlayer) { g.strokeStyle = '#ffd94a'; g.lineWidth = 5; g.beginPath(); g.roundRect(6, 12, w - 12, h - 24, 16); g.stroke(); }
    const label = isPlayer ? `▼ YOU · ${racer.name}` : racer.name;
    g.fillStyle = isPlayer ? '#ffd94a' : '#fff'; g.font = `800 ${label.length > 19 ? 21 : label.length > 12 ? 27 : 34}px system-ui`; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(label, w / 2, h / 2 + 1);
  });
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true }));
  sp.scale.set(8.4, 2.1, 1); sp.position.y = 3.7;
  return sp;
}

/* ================= WORLD BUILDING ================= */
function stripGeometry(halfWidth, y) {
  const pos = [], uv = [], idx = [];
  for (let i = 0; i <= N; i++) {
    const s = samples[i % N], n = normals[i % N];
    pos.push(s.x + n.x * halfWidth, y, s.z + n.z * halfWidth, s.x - n.x * halfWidth, y, s.z - n.z * halfWidth);
    uv.push(0, i * 0.55, 1, i * 0.55);
    if (i < N) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geo.setIndex(idx); geo.computeVertexNormals();
  return geo;
}

function buildWorld(trackIdx, field) {
  currentField = (field && field.length === 8) ? field : previewField();
  // the old sun is discarded with the scene, but three only frees a light's
  // shadow-map render target via shadow.map.dispose() — without this, every
  // rebuild leaks one FBO + depth renderbuffer + texture (the same idiom
  // gfx/post.js setShadowSize uses when resizing a shadow map)
  if (sunLight && sunLight.shadow && sunLight.shadow.map) { sunLight.shadow.map.dispose(); sunLight.shadow.map = null; }
  // teardown: dispose the old world's geometry/materials — but NEVER the gfx textures,
  // which are module-cached and shared across rebuilds (flagged userData.shared)
  if (scene) scene.traverse(o => { if (o.geometry) o.geometry.dispose(); if (o.material) { (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => { if (m.map && !m.map.userData.shared) m.map.dispose(); m.dispose(); }); } });
  if (!scene) scene = new THREE.Scene(); else scene.clear(); // one persistent scene — the post composer holds a RenderPass to it
  const tr = TRACKS[trackIdx];
  const preset = applyFog(scene, tr.fogKey); // fog colour matched to the sky horizon
  renderer.toneMappingExposure = preset.exposure;
  const { sun, hemi } = setupLights(scene, { shadowMapSize: window.innerWidth < 700 ? 1024 : 2048, hemiGround: tr.ground });
  sunLight = sun; hemiLight = hemi;
  applySky(renderer, scene, SKY_URLS[tr.skyKey], { envIntensity: preset.envIntensity }).catch(() => { }); // fire-and-forget: panorama + IBL pop in a frame or two, never blocks race start
  if (post) post.applyQuality(localStorage.getItem('bk-quality') || 'auto', { sun: sunLight }); // sun is rebuilt per track — re-apply the shadow hint
  karts = []; bananas = []; projectiles = []; itemBoxes = []; clouds = []; bombs = [];

  curve = new THREE.CatmullRomCurve3(tr.points.map(p => new THREE.Vector3(p[0], 0, p[1])), true, 'centripetal');
  const spaced = curve.getSpacedPoints(N);
  samples = spaced.slice(0, N);
  segLen = curve.getLength() / N;
  tangents = []; normals = [];
  trackCenter.set(0, 0, 0); samples.forEach(s => trackCenter.add(s)); trackCenter.divideScalar(N);
  for (let i = 0; i < N; i++) {
    const t = samples[wrapIdx(i + 1)].clone().sub(samples[wrapIdx(i - 1)]).setY(0).normalize();
    tangents.push(t); normals.push(new THREE.Vector3(t.z, 0, -t.x));
  }

  const mars = trackIdx === 1;
  const gTex = mars ? GTEX.sandTexture({ tint: 'mars' }) : GTEX.grassTexture();
  gTex.repeat.set(40, 40);
  const ground = new THREE.Mesh(new THREE.CircleGeometry(760, 48), new THREE.MeshStandardMaterial({ map: gTex, roughness: 1 }));
  ground.rotation.x = -Math.PI / 2; ground.position.y = -0.08; ground.receiveShadow = true; scene.add(ground);

  const shTex = mars ? GTEX.sandTexture({}) : GTEX.concreteTexture();
  shTex.repeat.set(1, 60);
  const shoulder = new THREE.Mesh(stripGeometry(HALF_W + 2.6, 0.0), new THREE.MeshStandardMaterial({ map: shTex, roughness: 0.95 }));
  shoulder.receiveShadow = true; scene.add(shoulder);
  const aTex = GTEX.asphaltTextures(); // strip UVs: v spans ~495 over a lap, so repeat.y ~0.45 ≈ 220 tiles
  aTex.map.repeat.set(1, 0.45); aTex.roughnessMap.repeat.set(1, 0.45); aTex.bumpMap.repeat.set(1, 0.45);
  const road = new THREE.Mesh(stripGeometry(HALF_W, 0.03), new THREE.MeshStandardMaterial({ map: aTex.map, roughnessMap: aTex.roughnessMap, bumpMap: aTex.bumpMap, bumpScale: 0.8, roughness: 1 }));
  road.receiveShadow = true; scene.add(road);
  const curbs = new THREE.Mesh(stripGeometry(HALF_W + 0.9, 0.045), new THREE.MeshStandardMaterial({ map: curbTexture(), transparent: true, roughness: 0.9, depthWrite: false }));
  curbs.receiveShadow = true; scene.add(curbs);

  // start line + gantry
  const startGroup = new THREE.Group();
  startGroup.position.copy(samples[0]); startGroup.rotation.y = headingOf(tangents[0]);
  const line = new THREE.Mesh(new THREE.PlaneGeometry(HALF_W * 2, 5), new THREE.MeshStandardMaterial({ map: checkerTexture(), roughness: 0.9 }));
  line.rotation.x = -Math.PI / 2; line.position.y = 0.06; startGroup.add(line);
  const poleMat = GMAT.flatProp(0x22242a);
  for (const sx of [-1, 1]) { const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 9, 8), poleMat); pole.position.set(sx * (HALF_W + 1.2), 4.5, 0); startGroup.add(pole); }
  const bannerTex = canvasTexture(1024, 128, (g, w, h) => { g.fillStyle = '#14213d'; g.fillRect(0, 0, w, h); g.fillStyle = '#ffd94a'; g.font = '900 74px system-ui'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('🏁 BILLIONAIRE KART 🏁', w / 2, h / 2); });
  const banner = new THREE.Mesh(new THREE.BoxGeometry(HALF_W * 2 + 3, 3.2, 0.4), GMAT.emissiveScreen(0xffffff, { intensity: 1.1, map: bannerTex }));
  banner.position.y = 8.6; startGroup.add(banner);
  scene.add(startGroup);

  buildScenery(trackIdx);
  buildItemBoxes();
  currentField.forEach(ri => scene.add(makeKart(ri, ri === selectedRacer).mesh));
  initParticles();
  computeMinimapBounds();
  placeGrid();
}

function scatterPos(minLat, maxLat) {
  const i = Math.floor(Math.random() * N), s = samples[i], n = normals[i];
  const lat = (Math.random() < 0.5 ? -1 : 1) * rand(minLat, maxLat);
  return new THREE.Vector3(s.x + n.x * lat, 0, s.z + n.z * lat);
}

function buildScenery(trackIdx) {
  const mars = trackIdx === 1;
  // trees (valley) or rocks (mars) — instanced
  const COUNT = 140;
  if (!mars) {
    const trunkM = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.32, 0.5, 2.6, 6), GMAT.flatProp(0x7a4a21), COUNT);
    const leafM = new THREE.InstancedMesh(new THREE.ConeGeometry(2.3, 5.6, 8), GMAT.flatProp(0x2e7d32), COUNT);
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), sc = new THREE.Vector3();
    for (let i = 0; i < COUNT; i++) {
      const p = scatterPos(HALF_W + 7, HALF_W + 62), s = rand(0.8, 1.7);
      sc.set(s, s, s); m.compose(new THREE.Vector3(p.x, 1.3 * s, p.z), q, sc); trunkM.setMatrixAt(i, m);
      m.compose(new THREE.Vector3(p.x, (2.6 + 2.6) * s, p.z), q, sc); leafM.setMatrixAt(i, m);
    }
    trunkM.castShadow = leafM.castShadow = true; scene.add(trunkM, leafM);
    // office buildings — one shared glass/steel panel material
    const towerMat = GMAT.metalPanels({ repeat: 2 });
    for (let i = 0; i < 24; i++) {
      const p = scatterPos(HALF_W + 42, HALF_W + 95), hgt = rand(14, 46);
      const b = new THREE.Mesh(new THREE.BoxGeometry(rand(9, 18), hgt, rand(9, 18)), towerMat);
      b.position.set(p.x, hgt / 2, p.z); b.rotation.y = Math.random() * Math.PI; scene.add(b);
    }
  } else {
    const rockM = new THREE.InstancedMesh(new THREE.DodecahedronGeometry(1.6), GMAT.flatProp(0x7e3b22), COUNT);
    const m = new THREE.Matrix4(), e = new THREE.Euler(), q = new THREE.Quaternion(), sc = new THREE.Vector3();
    for (let i = 0; i < COUNT; i++) {
      const p = scatterPos(HALF_W + 6, HALF_W + 70), s = rand(0.5, 2.6);
      q.setFromEuler(e.set(Math.random() * 3, Math.random() * 3, Math.random() * 3)); sc.set(s, s * rand(0.6, 1), s);
      m.compose(new THREE.Vector3(p.x, 0.6 * s, p.z), q, sc); rockM.setMatrixAt(i, m);
    }
    rockM.castShadow = true; scene.add(rockM);
    for (let i = 0; i < 7; i++) { // mesas
      const p = scatterPos(HALF_W + 70, HALF_W + 130), hgt = rand(10, 24);
      const mesa = new THREE.Mesh(new THREE.BoxGeometry(rand(30, 60), hgt, rand(24, 44)), GMAT.flatProp(0x93482a));
      mesa.position.set(p.x, hgt / 2, p.z); scene.add(mesa);
    }
    // rocket prop near the start
    const rp = samples[0].clone().add(normals[0].clone().multiplyScalar(HALF_W + 22));
    const rocket = new THREE.Group();
    const body = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 2.2, 11, 14), GMAT.flatProp(0xf2f2f2)); body.position.y = 5.5; rocket.add(body);
    const tip = new THREE.Mesh(new THREE.ConeGeometry(2.2, 4, 14), GMAT.chrome({ color: 0xd23b2e, roughness: 0.3 })); tip.position.y = 13; rocket.add(tip);
    for (let a = 0; a < 3; a++) { const fin = new THREE.Mesh(new THREE.BoxGeometry(0.3, 3.4, 1.8), GMAT.flatProp(0xd23b2e)); const ang = a / 3 * Math.PI * 2; fin.position.set(Math.sin(ang) * 2.4, 1.6, Math.cos(ang) * 2.4); fin.rotation.y = ang; rocket.add(fin); }
    rocket.position.copy(rp); scene.add(rocket);
  }
  // joke billboards
  BILLBOARDS.forEach((text, i) => {
    const idx = Math.floor(i / BILLBOARDS.length * N + N * 0.06) % N;
    const side = i % 2 ? 1 : -1, s = samples[idx], n = normals[idx];
    const g = new THREE.Group();
    g.position.set(s.x + n.x * side * (HALF_W + 9), 0, s.z + n.z * side * (HALF_W + 9));
    g.lookAt(s.x, 0, s.z);
    const board = new THREE.Mesh(new THREE.PlaneGeometry(18, 6.9), GMAT.emissiveScreen(0xffffff, { intensity: 1.15, map: billboardTexture(text, i * 47 % 360) }));
    board.material.side = THREE.DoubleSide;
    board.position.y = 6.4; g.add(board);
    const postM = GMAT.flatProp(0x444a52);
    for (const px of [-6, 6]) { const post = new THREE.Mesh(new THREE.BoxGeometry(0.5, 4, 0.5), postM); post.position.set(px, 2, 0); g.add(post); }
    scene.add(g);
  });
  // grandstand near start
  const gsIdx = 26, s = samples[gsIdx], n = normals[gsIdx];
  const stand = new THREE.Group();
  stand.position.set(s.x + n.x * (HALF_W + 17), 0, s.z + n.z * (HALF_W + 17));
  stand.lookAt(s.x, 0, s.z);
  const seatCols = [0xd23b2e, 0xf2f2f2, 0x1877f2, 0xffd94a];
  for (let r = 0; r < 4; r++) {
    const tier = new THREE.Mesh(new THREE.BoxGeometry(34, 1.6, 3.4), GMAT.flatProp(seatCols[r % 4]));
    tier.position.set(0, 1 + r * 1.7, -r * 3); stand.add(tier);
  }
  const roof = new THREE.Mesh(new THREE.BoxGeometry(36, 0.5, 15), GMAT.flatProp(0x22242a));
  roof.position.set(0, 9.6, -4.5); stand.add(roof);
  scene.add(stand);
  // clouds — soft billboard sprites (gfx cloud texture), drifting in animate()
  const cloudTex = GTEX.cloudSprite();
  for (let i = 0; i < 14; i++) {
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: cloudTex, transparent: true, opacity: 0.85, depthWrite: false }));
    sp.scale.set(rand(26, 40), rand(10, 15), 1);
    sp.position.set(rand(-520, 520), rand(75, 125), rand(-520, 520));
    clouds.push(sp); scene.add(sp);
  }
}

function buildItemBoxes() {
  const tex = boxTexture();
  const geo = new THREE.BoxGeometry(2.5, 2.5, 2.5);
  const fractions = [0.10, 0.27, 0.44, 0.61, 0.78, 0.93];
  for (const f of fractions) {
    const idx = Math.floor(f * N);
    for (const lat of [-7.5, -2.5, 2.5, 7.5]) {
      const s = samples[idx], n = normals[idx];
      const mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ map: tex, emissive: 0xcc8800, emissiveIntensity: 1.6, roughness: 0.4 })); // hot emissive so bloom picks the boxes up
      mesh.position.set(s.x + n.x * lat, 1.7, s.z + n.z * lat);
      scene.add(mesh);
      itemBoxes.push({ mesh, idx, active: true, respawnT: 0, phase: Math.random() * 6 });
    }
  }
}

/* ================= KART FACTORY ================= */
function faceTexture(r, racerIdx) { // one shared canvas-face painter, per-racer extras (GRAPHICS.md §4.2)
  return canvasTexture(128, 128, (g) => {
    g.fillStyle = '#' + r.skin.toString(16).padStart(6, '0'); g.fillRect(0, 0, 128, 128);
    g.fillStyle = '#20222a';
    g.beginPath(); g.arc(44, 56, 7, 0, 7); g.fill();
    g.beginPath(); g.arc(84, 56, 7, 0, 7); g.fill();
    g.strokeStyle = '#20222a'; g.lineWidth = 5; g.lineCap = 'round';
    g.beginPath(); g.arc(64, 74, 20, 0.35, Math.PI - 0.35); g.stroke(); // grin
    if (racerIdx === 2 || racerIdx === 7) { // Zuck / Demis: glasses
      g.lineWidth = 4; g.strokeRect(28, 40, 32, 30); g.strokeRect(68, 40, 32, 30);
      g.beginPath(); g.moveTo(60, 52); g.lineTo(68, 52); g.stroke();
    }
    if (racerIdx === 1) { // Sam: shades
      g.fillStyle = '#14161c'; g.fillRect(26, 42, 34, 22); g.fillRect(68, 42, 34, 22); g.fillRect(58, 50, 12, 5);
    }
    if (racerIdx === 8) { // Trump: moustache + squint
      g.lineWidth = 7; g.beginPath(); g.arc(52, 84, 10, 0.15 * Math.PI, 0.95 * Math.PI); g.stroke();
      g.beginPath(); g.arc(76, 84, 10, 0.05 * Math.PI, 0.85 * Math.PI); g.stroke();
    }
    if (racerIdx === 13) { g.fillStyle = '#20222a'; g.beginPath(); g.arc(96, 84, 3.5, 0, 7); g.fill(); } // Holmes: beauty mark
  });
}
function makeKart(racerIdx, isPlayer) {
  const r = RACERS[racerIdx];
  const root = new THREE.Group();          // position + heading
  const tilt = new THREE.Group(); root.add(tilt); // body lean
  const bodyMat = GMAT.kartPaint(r.color); // clearcoat paint — the single biggest visual jump (gfx/materials.js)
  const darkMat = GMAT.mattePlastic(new THREE.Color(r.color).multiplyScalar(0.6).getHex());
  const suitMat = GMAT.mattePlastic(r.suit);
  const add = (geo, mat, x, y, z, parent = tilt) => { const ms = new THREE.Mesh(geo, mat); ms.position.set(x, y, z); ms.castShadow = true; parent.add(ms); return ms; };

  add(new RoundedBoxGeometry(2.3, 0.55, 3.4, 3, 0.13), bodyMat, 0, 0.62, 0);           // body
  add(new RoundedBoxGeometry(1.7, 0.38, 1.0, 2, 0.09), darkMat, 0, 0.52, 1.95);        // nose
  add(new RoundedBoxGeometry(2.5, 0.4, 1.1, 2, 0.1), bodyMat, 0, 0.5, -0.9);           // sidepods
  add(new RoundedBoxGeometry(1.35, 0.85, 0.35, 2, 0.08), GMAT.mattePlastic(0x191b20), 0, 1.05, -1.1); // seat
  add(new THREE.BoxGeometry(2.2, 0.13, 0.55), darkMat, 0, 1.32, -1.85);               // spoiler
  add(new THREE.BoxGeometry(0.18, 0.5, 0.18), darkMat, -0.8, 1.0, -1.8);
  add(new THREE.BoxGeometry(0.18, 0.5, 0.18), darkMat, 0.8, 1.0, -1.8);
  const pipeGeo = new THREE.CylinderGeometry(0.1, 0.1, 0.55, 8); pipeGeo.rotateX(Math.PI / 2);
  const pipeMat = GMAT.chrome();
  add(pipeGeo, pipeMat, -0.45, 0.55, -1.95); add(pipeGeo, pipeMat, 0.45, 0.55, -1.95);

  // wheels — front on steer pivots; rubber with tread bump + chrome hub that spins with the wheel
  const wheelGeo = new THREE.CylinderGeometry(0.5, 0.5, 0.46, 22); wheelGeo.rotateZ(Math.PI / 2);
  const wheelMat = GMAT.rubber({});
  const hubGeo = new THREE.CylinderGeometry(0.21, 0.21, 0.5, 14); hubGeo.rotateZ(Math.PI / 2);
  const hubMat = GMAT.chrome({ roughness: 0.25 });
  const mkWheel = (parent, x, y, z) => { const w = new THREE.Mesh(wheelGeo, wheelMat); w.position.set(x, y, z); w.castShadow = true; w.add(new THREE.Mesh(hubGeo, hubMat)); parent.add(w); return w; };
  const pivotL = new THREE.Group(); pivotL.position.set(-1.18, 0.5, 1.18); tilt.add(pivotL);
  const pivotR = new THREE.Group(); pivotR.position.set(1.18, 0.5, 1.18); tilt.add(pivotR);
  const wFL = mkWheel(pivotL, 0, 0, 0), wFR = mkWheel(pivotR, 0, 0, 0);
  const wRL = mkWheel(tilt, -1.18, 0.5, -1.18), wRR = mkWheel(tilt, 1.18, 0.5, -1.18);

  // driver — duos (Larry & Sergey) get TWO smaller figures side by side, that's the joke
  const skinMat = GMAT.skinTone(r.skin);
  const visorMat = racerIdx === 2 ? GMAT.glass({ color: 0x223044, opacity: 0.55 }) : new THREE.MeshStandardMaterial({ color: 0x0c0e14, roughness: 0.15, metalness: 0.6 });
  const faceMat = new THREE.MeshStandardMaterial({ map: faceTexture(r, racerIdx), roughness: 0.85 });
  if (r.duo) {
    for (const sx of [-0.42, 0.42]) {
      add(new RoundedBoxGeometry(0.74, 0.88, 0.56, 2, 0.1), suitMat, sx, 1.36, -0.55); // torso
      add(new THREE.SphereGeometry(0.37, 14, 10), skinMat, sx, 2.08, -0.5);          // head
      const face = new THREE.Mesh(new THREE.PlaneGeometry(0.56, 0.56), faceMat); face.position.set(sx, 2.08, -0.14); tilt.add(face);
      const h = add(new THREE.SphereGeometry(0.43, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.58), bodyMat, sx, 2.19, -0.5);
      h.scale.y = 0.82;                                                              // helmet
      add(new THREE.BoxGeometry(0.52, 0.15, 0.08), visorMat, sx, 2.1, -0.1);         // visor
      const arm = add(new THREE.BoxGeometry(0.16, 0.16, 0.8), suitMat, sx * 1.55, 1.45, 0.02); arm.rotation.x = -0.55;
    }
  } else {
    add(new RoundedBoxGeometry(1.05, 0.95, 0.62, 2, 0.12), suitMat, 0, 1.38, -0.55);  // torso
    const armGeo = new THREE.BoxGeometry(0.22, 0.22, 0.95);
    const armL = add(armGeo, suitMat, -0.64, 1.5, 0.02); armL.rotation.x = -0.55;
    const armR = add(armGeo, suitMat, 0.64, 1.5, 0.02); armR.rotation.x = -0.55;
    add(new THREE.SphereGeometry(0.5, 16, 12), skinMat, 0, 2.18, -0.5);              // head
    const face = new THREE.Mesh(new THREE.PlaneGeometry(0.78, 0.78), faceMat); face.position.set(0, 2.18, -0.02); tilt.add(face);
    const helm = add(new THREE.SphereGeometry(0.58, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.58), bodyMat, 0, 2.3, -0.5); // helmet cap
    helm.scale.y = 0.82;
    add(new THREE.BoxGeometry(0.74, 0.2, 0.1), visorMat, 0, 2.2, -0.02);             // visor
  }

  // per-racer props
  if (racerIdx === 0) { const cone = add(new THREE.ConeGeometry(0.36, 1.15, 10), GMAT.flatProp(0xf2f2f2), 0, 1.55, -1.7); cone.rotation.x = 0.5; }
  if (racerIdx === 1) { const halo = add(new THREE.TorusGeometry(0.42, 0.07, 8, 20), new THREE.MeshStandardMaterial({ color: 0xffd94a, emissive: 0xaa8800, emissiveIntensity: 1.5 }), 0, 2.95, -0.5); halo.rotation.x = Math.PI / 2; }
  if (racerIdx === 2) { const chain = add(new THREE.TorusGeometry(0.36, 0.08, 8, 22), new THREE.MeshStandardMaterial({ color: 0xffd94a, emissive: 0x997700, emissiveIntensity: 0.55, metalness: 0.85, roughness: 0.25 }), 0, 1.82, -0.26); chain.rotation.x = 0.55; } // the Zuckaissance gold chain
  if (racerIdx === 3) { add(new THREE.BoxGeometry(1.15, 1.15, 1.15), GMAT.flatProp(0xb5823c), 0, 1.6, -1.6); }
  if (racerIdx === 4) { add(new THREE.BoxGeometry(1.5, 0.1, 0.5), new THREE.MeshStandardMaterial({ color: 0x76b900, emissive: 0x76b900, emissiveIntensity: 1.4 }), 0, 0.78, 2.35); }

  const nameSpr = nameSprite(r, isPlayer);
  root.add(nameSpr);
  const kart = {
    racerIdx, racer: r, isPlayer, mesh: root, nameSpr, tilt, wheels: [wFL, wFR, wRL, wRR], pivots: [pivotL, pivotR],
    pos: new THREE.Vector3(), heading: 0, velHeading: 0, speed: 0, steerVis: 0, spinVis: 0,
    continuous: 0, sampleIdx: 0, lateral: 0, finished: false, finishTime: null, projected: false, autopilot: false,
    item: null, spinT: 0, shrinkT: 0, starT: 0, boostT: 0, driftCharge: 0, drifting: false, starTouchCd: 0,
    bailoutT: 0, ghostT: 0, hornT: 0, goldenT: 0, goldenCd: 0, inkT: 0,
    sputterT: 0, sputterClock: 0, nextSputter: rand(6, 14),
    lapStart: 0, lastLapTime: null, bestLap: null, lapsDone: 0, offroad: false, offroadDeep: false,
    ai: { lane: rand(-5, 5), laneT: rand(1, 3), itemT: rand(2, 6), skill: r.aiSkill ?? rand(0.97, 1.03), driftHeld: false },
  };
  karts.push(kart);
  return kart;
}

function placeGrid() {
  // grid slots: player starts 4th — close enough to fight, far enough to earn it (rows of 2)
  const pk = playerKart();
  const othersK = karts.filter(k => k !== pk);
  const gridOrder = [...othersK.slice(0, 3), pk, ...othersK.slice(3)];
  const slotOf = new Map(gridOrder.map((k, slot) => [k, slot]));
  for (const k of karts) {
    const slot = slotOf.get(k);
    const row = Math.floor(slot / 2), col = slot % 2;
    const cont = -(16 + row * 10) / segLen;
    const idx = wrapIdx(Math.round(cont));
    const s = samples[idx], n = normals[idx], lat = col === 0 ? -4.6 : 4.6;
    k.pos.set(s.x + n.x * lat, 0, s.z + n.z * lat);
    k.continuous = cont; k.sampleIdx = idx;
    k.heading = k.velHeading = headingOf(tangents[idx]);
    k.speed = 0; k.spinT = 0; k.shrinkT = 0; k.starT = 0; k.boostT = 0; k.driftCharge = 0; k.drifting = false;
    k.bailoutT = 0; k.ghostT = 0; k.hornT = 0; k.goldenT = 0; k.goldenCd = 0; k.inkT = 0;
    k.item = null; k.finished = false; k.finishTime = null; k.projected = false; k.autopilot = false;
    k.sputterT = 0; k.sputterClock = 0; k.nextSputter = rand(6, 14);
    k.lapsDone = Math.floor(k.continuous / N); k.lapStart = 0; k.lastLapTime = null; k.bestLap = null; k.spinVis = 0;
    k.mesh.position.copy(k.pos); k.mesh.rotation.y = k.heading;
    k.mesh.scale.setScalar(1);
  }
  bananas.forEach(b => scene.remove(b.mesh)); bananas = [];
  projectiles.forEach(p => scene.remove(p.mesh)); projectiles = [];
  bombs.forEach(b => scene.remove(b.mesh)); bombs = [];
  itemBoxes.forEach(b => { b.active = true; b.mesh.visible = true; b.respawnT = 0; });
  raceTime = 0; finishDelay = -1;
  prevPlayerCont = playerKart().continuous;
  updateItemSlot();
}

/* ================= PARTICLES (pooled) ================= */
const P_COUNT = 700;
let pGeo, pPoints, pVel, pLife, pMaxLife, pGrav, pHead = 0;
function initParticles() {
  pGeo = new THREE.BufferGeometry();
  const posArr = new Float32Array(P_COUNT * 3), colArr = new Float32Array(P_COUNT * 3);
  for (let i = 0; i < P_COUNT; i++) posArr[i * 3 + 1] = -999;
  pGeo.setAttribute('position', new THREE.BufferAttribute(posArr, 3));
  pGeo.setAttribute('color', new THREE.BufferAttribute(colArr, 3));
  pVel = new Float32Array(P_COUNT * 3); pLife = new Float32Array(P_COUNT); pMaxLife = new Float32Array(P_COUNT); pGrav = new Float32Array(P_COUNT);
  pPoints = new THREE.Points(pGeo, new THREE.PointsMaterial({ size: 1.5, map: GTEX.particleSprite(), vertexColors: true, transparent: true, opacity: 0.95, depthWrite: false }));
  pPoints.frustumCulled = false;
  scene.add(pPoints);
}
function spawnParticles(origin, { count = 12, colors = [0xffd94a], speed = 9, life = 0.7, up = 4, gravity = -9, spread = 1 } = {}) {
  if (!pGeo) return;
  const posA = pGeo.attributes.position.array, colA = pGeo.attributes.color.array;
  const col = new THREE.Color();
  for (let n = 0; n < count; n++) {
    const i = pHead; pHead = (pHead + 1) % P_COUNT;
    posA[i * 3] = origin.x; posA[i * 3 + 1] = origin.y + 0.6; posA[i * 3 + 2] = origin.z;
    pVel[i * 3] = rand(-1, 1) * speed * spread; pVel[i * 3 + 1] = rand(0.2, 1) * up; pVel[i * 3 + 2] = rand(-1, 1) * speed * spread;
    pLife[i] = pMaxLife[i] = life * rand(0.6, 1.15); pGrav[i] = gravity;
    col.set(colors[Math.floor(Math.random() * colors.length)]);
    colA[i * 3] = col.r; colA[i * 3 + 1] = col.g; colA[i * 3 + 2] = col.b;
  }
  pGeo.attributes.color.needsUpdate = true;
}
function updateParticles(dt) {
  if (!pGeo) return;
  const posA = pGeo.attributes.position.array;
  for (let i = 0; i < P_COUNT; i++) {
    if (pLife[i] <= 0) continue;
    pLife[i] -= dt;
    if (pLife[i] <= 0) { posA[i * 3 + 1] = -999; continue; }
    pVel[i * 3 + 1] += pGrav[i] * dt;
    posA[i * 3] += pVel[i * 3] * dt; posA[i * 3 + 1] += pVel[i * 3 + 1] * dt; posA[i * 3 + 2] += pVel[i * 3 + 2] * dt;
    if (posA[i * 3 + 1] < 0.1) { posA[i * 3 + 1] = 0.1; pVel[i * 3 + 1] *= -0.4; }
  }
  pGeo.attributes.position.needsUpdate = true;
}

/* ================= PHYSICS ================= */
const pick = arr => arr[Math.floor(Math.random() * arr.length)];
let simFairPlayer = false; // sim harness only: treat the autopilot "player" exactly like an AI kart
function topSpeedOf(k) {
  let base = 40 + (k.racer.spd - 3) * 1.8;
  if (!k.isPlayer || simFairPlayer) {
    base *= DIFF_MUL[difficulty] * k.ai.skill;
    const p = playerKart();
    if (p && gameState === 'racing') base *= 1 + clamp(clamp((p.continuous - k.continuous) / N, -1, 1) * 0.16, -0.055, 0.095); // rubber-band
  }
  if (k.shrinkT > 0) base *= 0.55;
  if (k.starT > 0) base *= 1.10;
  if (k.ghostT > 0) base *= 1.07;
  if (k.inkT > 0) base *= 0.88;
  if (k.bailoutT > 0) base *= 1.30;
  if (k.offroad) base *= k.offroadDeep ? 0.55 : 0.72; // playtest retune: grass hurts, deep rough hurts more — neither kills you
  return base;
}
function updateProgress(k) {
  const newIdx = nearestSample(k.pos, k.sampleIdx);
  let delta = newIdx - k.sampleIdx;
  if (delta > N / 2) delta -= N; if (delta < -N / 2) delta += N;
  k.continuous += delta; k.sampleIdx = newIdx;
  k.lateral = lateralAt(k.pos, newIdx);
  k.offroad = Math.abs(k.lateral) > HALF_W - 0.6;
  k.offroadDeep = Math.abs(k.lateral) > HALF_W + 2.4;
  if (Math.abs(k.lateral) > HALF_W + 5) { // wall clamp
    k.pos.addScaledVector(normals[newIdx], -(Math.sign(k.lateral) * (Math.abs(k.lateral) - (HALF_W + 5))));
    k.speed *= 0.86;
  }
  const completed = Math.floor(k.continuous / N);
  if (completed > k.lapsDone) {
    if (completed >= 1 && k.lapsDone >= 0) {
      k.lastLapTime = raceTime - k.lapStart;
      if (!k.bestLap || k.lastLapTime < k.bestLap) k.bestLap = k.lastLapTime;
      if (k.isPlayer) {
        if (completed === LAPS - 1) showCenter('🏁 FINAL LAP!', 1.3);
        else if (completed < LAPS) showCenter(`LAP ${completed + 1}`, 1.1);
        showFeed(`⏱️ Lap ${completed} — ${fmtTime(k.lastLapTime)}`);
      }
    }
    k.lapStart = raceTime; k.lapsDone = completed;
    if (completed >= LAPS && !k.finished) finishKart(k);
  }
}
function finishKart(k) {
  k.finished = true; k.finishTime = raceTime;
  if (k.isPlayer) {
    k.autopilot = true; playerFinishedAt = raceTime; finishDelay = 3.4;
    A.fanfare(); showCenter('🏁 FINISH!', 1.8);
    spawnParticles(k.pos, { count: 130, colors: [0xffd94a, 0xff5252, 0x6cf, 0x76b900, 0xffffff], speed: 13, life: 2.4, up: 13, gravity: -7 });
    showBark(`${k.racer.name}: “${k.racer.barks.win}”`);
  }
}
function bailoutInput(k) { // Government Bailout: the state drives. Fast, centred, relentless — but only to mid-pack
  const targetIdx = wrapIdx(k.sampleIdx + 26);
  const tp = samples[targetIdx];
  const desired = Math.atan2(tp.x - k.pos.x, tp.z - k.pos.z);
  const diff = angNorm(desired - k.heading);
  return { steer: clamp(-diff * 1.9, -1, 1), throttle: 1, brake: false, drift: false };
}
function updateKart(k, input, dt) {
  k.spinT = Math.max(0, k.spinT - dt); k.shrinkT = Math.max(0, k.shrinkT - dt);
  k.starT = Math.max(0, k.starT - dt); k.boostT = Math.max(0, k.boostT - dt);
  k.starTouchCd = Math.max(0, k.starTouchCd - dt);
  k.ghostT = Math.max(0, k.ghostT - dt); k.hornT = Math.max(0, k.hornT - dt); k.inkT = Math.max(0, k.inkT - dt);
  k.goldenCd = Math.max(0, k.goldenCd - dt);
  k.sputterT = Math.max(0, k.sputterT - dt); // generic: rocket-start sputter + Holmes (her trigger logic is below)
  if (k.goldenT > 0) { // Series F window expiry releases the item slot
    k.goldenT -= dt;
    if (k.goldenT <= 0 && k.item === 'golden') { k.item = null; if (k.isPlayer) updateItemSlot(); }
  }
  if (k.bailoutT > 0 && gameState === 'racing' && k.spinT <= 0) {
    input = bailoutInput(k);
    if (Math.random() < 0.7) spawnParticles(k.pos.clone().addScaledVector(forwardVec(k.heading), -2), { count: 2, colors: [0xffd94a, 0x2fb9ff], speed: 1.5, life: 0.4, up: 1, gravity: 0 });
  }
  // Holmes sputter: every 6–14 s a 15% chance check → 1.2 s power loss (high stats, high risk)
  if (k.racer.sputter) {
    if (k.sputterT <= 0 && gameState === 'racing' && !k.finished) {
      k.sputterClock += dt;
      if (k.sputterClock >= k.nextSputter) {
        k.sputterClock = 0; k.nextSputter = rand(6, 14);
        if (Math.random() < 0.15) {
          k.sputterT = 1.2;
          if (k.isPlayer) showFeed('🧪 ENGINE FAILURE?? (prototype)');
          spawnParticles(k.pos, { count: 10, colors: [0x888888, 0x555555], speed: 2, life: 0.8, up: 3, gravity: 1 });
        }
      }
    }
  }
  const targetScale = k.shrinkT > 0 ? 0.62 : 1;
  k.mesh.scale.setScalar(lerp(k.mesh.scale.x, targetScale, clamp(8 * dt, 0, 1)));
  updateProgress(k);
  if (k.bailoutT > 0) { // bailout clock runs after progress so the rank check is fresh
    k.bailoutT -= dt;
    if (rankOf(k) <= 3) k.bailoutT = 0; // delivered to the podium fight — the taxpayer's job is done
  }

  if (k.spinT > 0) {
    k.speed = Math.max(0, k.speed - 42 * dt);
    k.spinVis += dt * 15;
    k.drifting = false; k.driftCharge = 0;
  } else {
    const top = topSpeedOf(k), cap = top * (k.boostT > 0 ? 1.38 : 1);
    const sputtering = k.sputterT > 0;
    if (sputtering) { // engine cut: no drive, speed bleeds, smoke puffs
      k.speed = Math.max(0, k.speed - 17 * dt);
      if (Math.random() < 0.55) spawnParticles(k.pos.clone().addScaledVector(forwardVec(k.heading), -2), { count: 2, colors: [0x999999, 0x555555], speed: 1.5, life: 0.7, up: 2.4, gravity: 1 });
    }
    else if (input.throttle > 0) k.speed += (21 + (k.racer.acc - 3) * 2.4) * input.throttle * dt * (k.speed < 0 ? 2.2 : 1);
    else if (k.speed > 0) k.speed = Math.max(0, k.speed - 10 * dt);
    const brakeVal = input.brake === true ? 1 : (input.brake || 0); // analog brake (touch sticks) or digital
    if (brakeVal > 0.05) { if (k.speed > 1) k.speed -= 34 * brakeVal * dt; else k.speed = Math.max(-11, k.speed - 14 * brakeVal * dt); }
    k.speed -= k.speed * 0.22 * dt;
    if (k.offroad) k.speed -= k.speed * 0.38 * dt; // sustained grass bleeds speed — brief clips are cheap, corner-cutting is not (balance guard)
    if (k.speed > cap) k.speed = Math.max(cap, k.speed - (k.offroad ? 16 : 30) * dt); // gentle settle onto the grass cap instead of a wall of drag
    if (k.speed < -11) k.speed = -11;

    const wantDrift = input.drift && Math.abs(input.steer) > 0.25 && k.speed > 13;
    if (wantDrift) {
      if (!k.drifting) { k.drifting = true; k.driftCharge = 0; }
      k.driftCharge += dt * (k.racerIdx === 6 ? 1.45 : 1.15); // fun pass: blue (0.7) in ~0.6 s — earnable on real corners; orange (1.4) rewards the long ones
      if (Math.random() < 0.75) {
        const col = k.driftCharge >= 1.4 ? [0xffa53a] : k.driftCharge >= 0.7 ? [0x66ccff] : [0xdddddd];
        spawnParticles(k.pos.clone().addScaledVector(forwardVec(k.heading), -1.4), { count: 2, colors: col, speed: 2.5, life: 0.4, up: 1.5, gravity: -2 });
      }
    } else if (k.drifting) {
      if (k.driftCharge >= 1.4) { k.boostT = Math.max(k.boostT, k.racerIdx === 4 ? 1.7 : 1.35); if (k.isPlayer) { A.driftBoost(); showFeed('🔥 ORANGE BOOST!'); } }
      else if (k.driftCharge >= 0.7) { k.boostT = Math.max(k.boostT, 0.75); if (k.isPlayer) { A.driftBoost(); showFeed('💨 Drift boost!'); } }
      k.drifting = false; k.driftCharge = 0;
    }
    const turnRate = (1.75 + (k.racer.grip - 3) * 0.14) * (k.drifting ? 1.5 : 1);
    k.heading -= input.steer * turnRate * clamp(k.speed / 16, -1, 1) * dt;
    if (k.inkT > 0 && !k.isPlayer) k.heading += Math.sin(elapsed * 11 + k.racerIdx * 2.3) * 0.85 * dt; // Smear Campaign: inked AI weaves blind
    if (k.boostT > 0 && k.speed > 8) {
      if (Math.random() < 0.9) spawnParticles(k.pos.clone().addScaledVector(forwardVec(k.heading), -2.2), { count: 3, colors: [0xffa53a, 0xffd94a, 0x66ccff], speed: 1.5, life: 0.35, up: 0.8, gravity: 0 });
      if (k.isPlayer && Math.random() < 0.06) showBark(`${k.racer.name}: “${pick(k.racer.barks.boost)}”`);
    }
    if (k.starT > 0 && Math.random() < 0.5) spawnParticles(k.pos, { count: 2, colors: [0xffe066, 0xffffff], speed: 3, life: 0.5, up: 3, gravity: 0 });
  }
  const gripRate = k.drifting ? 2.4 : 9;
  k.velHeading = lerpAngle(k.velHeading, k.heading, clamp(gripRate * dt, 0, 1));
  k.pos.addScaledVector(forwardVec(k.velHeading), k.speed * dt);
  k.pos.y = 0;

  // mesh sync
  if (k.spinT <= 0) { const tgt = Math.round(k.spinVis / (Math.PI * 2)) * Math.PI * 2; k.spinVis = lerp(k.spinVis, tgt, clamp(10 * dt, 0, 1)); }
  const ghostOp = k.ghostT > 0 ? 0.42 : 1; // Insider Trading: intangible = translucent
  if (k.mesh.userData.op !== ghostOp) { k.mesh.userData.op = ghostOp; k.tilt.traverse(o => { if (o.material) { o.material.transparent = ghostOp < 1; o.material.opacity = ghostOp; } }); }
  k.mesh.position.copy(k.pos);
  k.mesh.rotation.y = k.heading + k.spinVis;
  k.steerVis = lerp(k.steerVis, input.steer || 0, clamp(10 * dt, 0, 1));
  k.tilt.rotation.z = lerp(k.tilt.rotation.z, -k.steerVis * clamp(k.speed / 40, 0, 1) * 0.1, clamp(8 * dt, 0, 1));
  k.tilt.rotation.x = lerp(k.tilt.rotation.x, clamp(-k.speed * 0.0012, -0.04, 0.02), clamp(6 * dt, 0, 1));
  k.pivots.forEach(p => p.rotation.y = -k.steerVis * 0.38);
  k.wheels.forEach(w => w.rotation.x += k.speed * dt / 0.5);
  // AI stuck recovery
  if (!k.isPlayer) {
    if (Math.abs(k.speed) < 2 && gameState === 'racing' && raceTime > 3) { k.ai.stuckT = (k.ai.stuckT || 0) + dt; } else k.ai.stuckT = 0;
    if (k.ai.stuckT > 2.5) {
      const s = sampleAt(k.continuous + 12);
      k.pos.copy(s); k.heading = k.velHeading = headingOf(tangentAt(k.continuous + 12)); k.speed = 10; k.ai.stuckT = 0;
    }
  }
}
function spinKart(k) {
  if (k.starT > 0 || k.spinT > 0 || k.ghostT > 0) return; // Viral Moment & Insider-Trading ghost shrug off spins
  k.spinT = 1.15; k.speed *= 0.3; k.drifting = false; k.driftCharge = 0;
  spawnParticles(k.pos, { count: 14, colors: [0xcccccc, 0xffd94a], speed: 5, life: 0.6, up: 4 });
  if (k.isPlayer) { A.hit(); shake = Math.max(shake, 0.55); hitstopT = Math.max(hitstopT, 0.06); showBark(`${k.racer.name}: “${pick(k.racer.barks.hit)}”`); }
  else if (k.pos.distanceTo(playerKart().pos) < 55 && Math.random() < 0.45) showBark(`${k.racer.name}: “${pick(k.racer.barks.hit)}”`);
  // POW! comic burst at the victim's screen position (POLISH.md §3.2) — display hook only
  if (window.BKFX && BKFX.pow && (k.isPlayer || k.pos.distanceTo(playerKart().pos) < 55)) {
    const sp = screenPos(k.pos); if (sp) BKFX.pow(sp.x, sp.y);
  }
}
const _projV = new THREE.Vector3();
function screenPos(pos) { // world position -> CSS pixels for DOM fx overlays
  _projV.copy(pos); _projV.y += 2.4; _projV.project(camera);
  if (_projV.z > 1) return null; // behind the camera
  return { x: (_projV.x * 0.5 + 0.5) * window.innerWidth, y: (-_projV.y * 0.5 + 0.5) * window.innerHeight };
}

/* ================= AI ================= */
function aiInput(k, dt) {
  const ai = k.ai;
  ai.laneT -= dt;
  if (ai.laneT <= 0) { ai.lane = rand(-6.2, 6.2) * (k.racer.consistent ? 0.35 : 1); ai.laneT = k.racer.consistent ? rand(4, 6) : rand(2, 5); } // Murdoch: the tortoise who never errs — tight line, rare changes
  // banana avoidance
  for (const b of bananas) {
    const ahead = b.continuous - k.continuous;
    if (ahead > 0 && ahead < 26 && Math.abs(b.lateral - k.lateral) < 3.5) ai.lane = clamp(b.lateral + (b.lateral > 0 ? -6 : 6), -7, 7);
  }
  const targetIdx = wrapIdx(k.sampleIdx + 24);
  const tp = samples[targetIdx].clone().addScaledVector(normals[targetIdx], ai.lane);
  const desired = Math.atan2(tp.x - k.pos.x, tp.z - k.pos.z);
  const diff = angNorm(desired - k.heading);
  const steer = clamp(-diff * 1.9, -1, 1);
  const curveAhead = Math.abs(angNorm(headingOf(tangents[wrapIdx(k.sampleIdx + 38)]) - headingOf(tangents[k.sampleIdx])));
  let throttle = 1;
  if (curveAhead > 0.55 && k.speed > topSpeedOf(k) * 0.82) throttle = 0.55;
  const drift = curveAhead > 0.34 && k.speed > 19 && Math.abs(steer) > 0.35;
  // item usage
  ai.itemT -= dt;
  if (k.item && ai.itemT <= 0 && k.spinT <= 0) {
    const id = k.item; let use = false;
    const someoneAhead = karts.some(o => o !== k && o.continuous > k.continuous && o.continuous - k.continuous < 90);
    if (id === 'boost') use = curveAhead < 0.4;
    else if (id === 'banana' || id === 'bomb' || id === 'bailout' || id === 'boo' || id === 'blooper') use = true;
    else if (id === 'green' || id === 'red') use = someoneAhead;
    else if (id === 'horn') use = projectiles.some(p => p.target === k || (p.type !== 'blue' && p.mesh.position.distanceToSquared(k.pos) < 1600)) || karts.some(o => o !== k && Math.abs(o.continuous - k.continuous) < 14);
    else if (id === 'golden') use = k.goldenT > 0 ? true : curveAhead < 0.5;
    else use = true; // star, blue, lightning
    if (use) useItem(k);
    ai.itemT = (id === 'golden' && k.goldenT > 0) ? 0.8 : rand(2, 6); // Series F: AI milks the window 3–4 times
  }
  return { steer, throttle, brake: false, drift };
}


/* ================= ITEMS ================= */
function grantItem(k) {
  if (k.item) return;
  k.item = rollItem(rankOf(k));
  if (k.isPlayer) {
    const it = ITEMS[k.item];
    // Item roulette (POLISH.md §2.5.1): the slot spins for 850 ms and lands on the
    // real item; useItem is blocked while BKFX.spinning. Falls back to instant reveal.
    if (window.BKFX && BKFX.roulette(it, ITEMS, { tick: i => A.tone(840 + i * 45, 0.03, 'square', 0.016), land: () => { A.pickup(); showFeed(`${it.icon} <b>${it.name}</b> — ${it.desc}`); } })) return;
    updateItemSlot(); A.pickup(); showFeed(`${it.icon} <b>${it.name}</b> — ${it.desc}`);
  }
}
function updateItemBoxes(dt) {
  for (const b of itemBoxes) {
    b.mesh.rotation.y += dt * 1.9;
    b.mesh.position.y = 1.7 + Math.sin(elapsed * 2.2 + b.phase) * 0.25;
    if (!b.active) { b.respawnT -= dt; if (b.respawnT <= 0) { b.active = true; b.mesh.visible = true; } continue; }
    for (const k of karts) {
      if (k.item || k.finished) continue;
      if (k.pos.distanceToSquared(b.mesh.position) < 8.5) { b.active = false; b.mesh.visible = false; b.respawnT = 4; grantItem(k); break; }
    }
  }
}
function leakMesh() { // Data Leak: flat glowing puddle + droplets (internal item id: 'banana')
  const g = new THREE.Group();
  const puddle = new THREE.Mesh(new THREE.CircleGeometry(1.55, 22), new THREE.MeshBasicMaterial({ color: 0x2fb9ff, transparent: true, opacity: 0.82 }));
  puddle.rotation.x = -Math.PI / 2; puddle.position.y = 0.1; g.add(puddle);
  const inner = new THREE.Mesh(new THREE.CircleGeometry(0.95, 18), new THREE.MeshBasicMaterial({ color: 0x9be7ff, transparent: true, opacity: 0.9 }));
  inner.rotation.x = -Math.PI / 2; inner.position.y = 0.12; g.add(inner);
  const dropMat = new THREE.MeshStandardMaterial({ color: 0x2fb9ff, emissive: 0x1177bb, emissiveIntensity: 0.9, roughness: 0.2 });
  for (const [dx, dz, s] of [[-0.7, 0.4, 0.3], [0.55, -0.5, 0.24], [0.15, 0.75, 0.19]]) {
    const d = new THREE.Mesh(new THREE.SphereGeometry(s, 10, 8), dropMat);
    d.position.set(dx, 0.28, dz); d.scale.y = 1.35; g.add(d);
  }
  return g;
}
function projectileMesh(type) {
  const g = new THREE.Group();
  if (type === 'green') {
    const geo = new THREE.CylinderGeometry(0.34, 0.34, 1.15, 10); geo.rotateZ(Math.PI / 2);
    const scroll = new THREE.Mesh(geo, GMAT.flatProp(0xf5efdd)); g.add(scroll);
    const ribbon = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.75, 0.2), GMAT.flatProp(0xd23b2e)); g.add(ribbon);
  } else if (type === 'red') {
    const bird = new THREE.Mesh(new THREE.SphereGeometry(0.58, 12, 10), GMAT.flatProp(0x1d9bf0)); g.add(bird);
    const beakGeo = new THREE.ConeGeometry(0.22, 0.55, 8); beakGeo.rotateX(Math.PI / 2);
    const beak = new THREE.Mesh(beakGeo, GMAT.flatProp(0xffa53a)); beak.position.z = 0.65; g.add(beak);
  } else if (type === 'blue') {
    const case_ = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.7, 0.45), GMAT.flatProp(0x7a4a21)); g.add(case_);
    const trim = new THREE.Mesh(new THREE.BoxGeometry(1.04, 0.16, 0.49), new THREE.MeshStandardMaterial({ color: 0xffd94a, emissive: 0x997700, emissiveIntensity: 0.7 })); g.add(trim);
  }
  g.traverse(o => o.castShadow = true);
  return g;
}
function bombMesh() {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.95, 14, 12), new THREE.MeshStandardMaterial({ color: 0x23242c, roughness: 0.35, metalness: 0.5, emissive: 0xff2222, emissiveIntensity: 0 }));
  body.castShadow = true; g.add(body);
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.4, 8), GMAT.chrome({ roughness: 0.35 })); cap.position.y = 1.0; g.add(cap);
  const spark = new THREE.Mesh(new THREE.SphereGeometry(0.17, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffa53a })); spark.position.set(0.14, 1.32, 0); g.add(spark);
  g.userData.body = body;
  return g;
}
function useItem(k) {
  if (k.isPlayer && window.BKFX && BKFX.spinning) { A.uiError(); return; } // roulette drama is protected (POLISH.md §2.5.1) — invalid tap buzzes (§4)
  if (!k.item || k.spinT > 0 || gameState !== 'racing') { if (k.isPlayer && gameState === 'racing') A.uiError(); return; }
  const id = k.item;
  // Series F (golden): first press opens a 5 s window and boosts; presses inside the
  // window re-boost for free on a 0.7 s cooldown. The item is only consumed by expiry.
  if (id === 'golden') {
    if (k.goldenT > 0 && k.goldenCd > 0) return;
    const first = k.goldenT <= 0;
    if (first) k.goldenT = 5;
    k.goldenCd = 0.7;
    k.boostT = Math.max(k.boostT, 0.95);
    if (k.isPlayer) { A.use(); A.boostSnd(); if (first) { [660, 880, 1108].forEach((f, i) => A.tone(f, 0.12, 'square', 0.055, 0, i * 0.07)); showFeed('🏆 SERIES F — keep hitting ITEM to re-boost!'); } }
    return;
  }
  k.item = null;
  if (k.isPlayer) { updateItemSlot(); A.use(); }
  const fwd = forwardVec(k.heading);
  if (id === 'boost') {
    k.boostT = Math.max(k.boostT, k.racerIdx === 4 ? 1.9 : 1.6);
    if (k.isPlayer) A.boostSnd();
  } else if (id === 'star') {
    k.starT = 6;
    spawnParticles(k.pos, { count: 22, colors: [0xffe066, 0xffffff], speed: 6, life: 0.7, up: 5, gravity: 0 });
  } else if (id === 'banana') { // Data Leak
    const mesh = leakMesh();
    const pos = k.pos.clone().addScaledVector(fwd, -3.4); pos.y = 0.06;
    mesh.position.copy(pos); scene.add(mesh);
    bananas.push({ mesh, pos, owner: k, age: 0, continuous: k.continuous - 2, lateral: lateralAt(pos, globalNearest(pos)) });
  } else if (id === 'green' || id === 'red') {
    let target = null;
    if (id === 'red') {
      let bestD = Infinity;
      for (const o of karts) { if (o === k) continue; const d = o.continuous - k.continuous; if (d > 0 && d < bestD) { bestD = d; target = o; } }
      if (!target) id === 'red' && (target = null);
    }
    const mesh = projectileMesh(id);
    mesh.position.copy(k.pos).addScaledVector(fwd, 3.2); mesh.position.y = 0.9;
    scene.add(mesh);
    projectiles.push({ type: id, mesh, owner: k, target, heading: k.heading, speed: id === 'red' ? 63 : 74, life: id === 'red' ? 6 : 3.2, age: 0 });
    if (id === 'red' && !target) projectiles[projectiles.length - 1].type = 'green', projectiles[projectiles.length - 1].speed = 74;
  } else if (id === 'blue') {
    const leader = sortedKarts().find(o => o !== k) || null;
    if (!leader) return;
    const mesh = projectileMesh('blue');
    mesh.position.copy(k.pos); mesh.position.y = 7; scene.add(mesh);
    projectiles.push({ type: 'blue', mesh, owner: k, target: leader, u: k.continuous, speed: 118, life: 14, age: 0 });
    showFeed('⚖️ ANTITRUST SUIT INBOUND — it\'s hunting the leader!');
    if (leader.isPlayer) A.zap();
  } else if (id === 'lightning') {
    let victims = karts.filter(o => o !== k && o.continuous > k.continuous && !o.finished);
    if (!victims.length) victims = karts.filter(o => o !== k && !o.finished);
    for (const v of victims) {
      if (v.starT > 0) continue;
      v.shrinkT = 3.5; v.speed = Math.min(v.speed, 17);
      spawnParticles(v.pos, { count: 12, colors: [0x9be7ff, 0xffffff], speed: 4, life: 0.5, up: 6, gravity: -4 });
    }
    A.zap();
    if (k.isPlayer) showFeed('📉 You crashed the market!');
    else if (victims.includes(playerKart())) { showFeed('📉 MARKET CRASH — you\'ve been shrunk!'); shake = Math.max(shake, 0.4); }
  } else if (id === 'bailout') {
    k.bailoutT = 5.5; // auto-drive: see bailoutInput/updateKart — ends early on reaching 3rd
    spawnParticles(k.pos, { count: 26, colors: [0xffd94a, 0xffffff, 0x2fb9ff], speed: 6, life: 0.8, up: 5, gravity: 0 });
    if (k.isPlayer) { A.fanfare(); showFeed('🛟 GOVERNMENT BAILOUT! Too big to fail.'); }
    else showFeed(`🛟 ${k.racer.name} got a BAILOUT!`);
  } else if (id === 'horn') {
    k.hornT = 0.6; // active window — also swats an arriving Antitrust Suit out of the air (updateProjectiles)
    if (k.isPlayer) A.tone(170, 0.35, 'square', 0.16, -60);
    spawnParticles(k.pos, { count: 42, colors: [0xffd94a, 0xffffff], speed: 13, life: 0.45, up: 2.5, gravity: 0 });
    for (let i = projectiles.length - 1; i >= 0; i--) {
      if (projectiles[i].mesh.position.distanceToSquared(k.pos) < 210) { spawnParticles(projectiles[i].mesh.position, { count: 8, colors: [0xffd94a], speed: 4, life: 0.4, up: 2, gravity: 0 }); scene.remove(projectiles[i].mesh); projectiles.splice(i, 1); }
    }
    for (let i = bananas.length - 1; i >= 0; i--) if (bananas[i].pos.distanceToSquared(k.pos) < 110) { scene.remove(bananas[i].mesh); bananas.splice(i, 1); }
    for (let i = bombs.length - 1; i >= 0; i--) if (bombs[i].pos.distanceToSquared(k.pos) < 110) { scene.remove(bombs[i].mesh); bombs.splice(i, 1); }
    for (const o of karts) if (o !== k && o.pos.distanceToSquared(k.pos) < 34) spinKart(o);
    if (k.isPlayer) { showFeed('📣 SPIN TEAM — DENIED!'); shake = Math.max(shake, 0.25); }
  } else if (id === 'boo') {
    k.ghostT = 3; k.boostT = Math.max(k.boostT, 0.7);
    const holders = karts.filter(o => o !== k && o.item);
    let stolen = 'boost'; // nobody holding anything? Insider trading still nets you a boost
    if (holders.length) { const v = pick(holders); stolen = v.item; if (v.item === 'golden') v.goldenT = 0; v.item = null; if (v.isPlayer) updateItemSlot(); }
    k.item = stolen;
    spawnParticles(k.pos, { count: 20, colors: [0xcbb2ff, 0xffffff], speed: 4, life: 0.7, up: 4, gravity: 0 });
    if (k.isPlayer) { A.tone(880, 0.35, 'sine', 0.09, -520); updateItemSlot(); showFeed(`👻 Insider Trading — stole ${ITEMS[stolen].name}!`); }
  } else if (id === 'blooper') {
    const victims = karts.filter(o => o !== k && o.continuous > k.continuous && !o.finished);
    for (const v of victims) {
      v.inkT = 2.5;
      spawnParticles(v.pos, { count: 14, colors: [0x1a1030, 0x3a2060], speed: 5, life: 0.6, up: 4, gravity: -2 });
      if (v.isPlayer) showInk();
    }
    if (k.isPlayer) { A.noise(0.3, 0.11, 480); showFeed(victims.length ? '📰 Smear Campaign launched!' : '📰 Smear Campaign — nobody ahead to smear'); }
    else if (victims.includes(playerKart())) showFeed('📰 You\'ve been SMEARED!');
  } else if (id === 'bomb') {
    const mesh = bombMesh();
    const pos = k.pos.clone().addScaledVector(fwd, -3.4); pos.y = 0.75;
    mesh.position.copy(pos); scene.add(mesh);
    bombs.push({ mesh, pos, owner: k, fuse: 1.6, beepT: 0 });
    if (k.isPlayer) showFeed('💣 Pink Slip armed…');
  }
}
function explodeBomb(b) {
  spawnParticles(b.pos, { count: 44, colors: [0xffa53a, 0xff5252, 0xffd94a, 0x555555], speed: 11, life: 0.9, up: 7 });
  for (const o of karts) if (o.pos.distanceTo(b.pos) < 8.5) spinKart(o);
  if (playerKart().pos.distanceTo(b.pos) < 26) { shake = Math.max(shake, 0.6); A.hit(); }
  if (b.owner.isPlayer || playerKart().pos.distanceTo(b.pos) < 42) showFeed('💣 PINK SLIP DELIVERED!');
}
function updateBombs(dt) {
  for (let i = bombs.length - 1; i >= 0; i--) {
    const b = bombs[i]; b.fuse -= dt;
    const body = b.mesh.userData.body; // telegraphed: flashing red fuse, faster as it runs out
    if (body) body.material.emissiveIntensity = Math.sin(elapsed * (b.fuse < 0.5 ? 42 : 13)) > 0 ? (b.fuse < 0.5 ? 1.5 : 0.55) : 0.04;
    b.beepT -= dt;
    if (b.beepT <= 0 && b.pos.distanceTo(playerKart().pos) < 60) { A.tone(b.fuse < 0.5 ? 1320 : 880, 0.06, 'square', 0.05); b.beepT = b.fuse < 0.5 ? 0.12 : 0.3; }
    let boom = b.fuse <= 0;
    if (!boom) for (const o of karts) { // contact detonation (owner gets a 0.8 s grace window)
      if (o === b.owner && b.fuse > 0.8) continue;
      const dx = o.pos.x - b.pos.x, dz = o.pos.z - b.pos.z;
      if (dx * dx + dz * dz < 5.3) { boom = true; break; }
    }
    if (boom) { explodeBomb(b); scene.remove(b.mesh); bombs.splice(i, 1); }
  }
}
function explodeBlue(p) {
  const c = p.target.pos.clone(); c.y = 1;
  spawnParticles(c, { count: 46, colors: [0xffa53a, 0xff5252, 0xffd94a], speed: 11, life: 0.9, up: 7 });
  for (const o of karts) if (o.pos.distanceTo(p.target.pos) < 11) spinKart(o);
  if (playerKart().pos.distanceTo(p.target.pos) < 30) { shake = Math.max(shake, 0.65); A.hit(); }
  showFeed('⚖️ ANTITRUST HITS!');
}
function updateProjectiles(dt) {
  for (let i = projectiles.length - 1; i >= 0; i--) {
    const p = projectiles[i]; p.age += dt; p.life -= dt;
    let dead = p.life <= 0;
    if (p.type === 'blue') {
      // Spin Team counterplay: an active horn (0.6 s window) swats the Suit out of the air
      if (!dead) for (const o of karts) if (o.hornT > 0 && p.mesh.position.distanceToSquared(o.pos) < 190) {
        spawnParticles(p.mesh.position, { count: 16, colors: [0xffd94a, 0xffffff], speed: 6, life: 0.5, up: 3, gravity: 0 });
        if (o.isPlayer) showFeed('📣 Antitrust Suit DENIED by the Spin Team!');
        dead = true; break;
      }
      if (!dead) {
        p.u += p.speed * dt;
        const target = p.target;
        const distSamples = target.continuous - p.u;
        const a = sampleAt(p.u), b = sampleAt(p.u + 1), fr = p.u - Math.floor(p.u);
        p.mesh.position.lerpVectors(a, b, fr);
        p.mesh.position.y = clamp(distSamples * 0.06, 1.1, 7.5);
        p.mesh.rotation.y += dt * 3;
        if (distSamples <= 3 || p.mesh.position.distanceTo(target.pos) < 6) { explodeBlue(p); dead = true; }
      }
    } else {
      if (p.type === 'red' && p.target) {
        const desired = Math.atan2(p.target.pos.x - p.mesh.position.x, p.target.pos.z - p.mesh.position.z);
        p.heading = lerpAngle(p.heading, desired, clamp(3.4 * dt, 0, 1));
        if (Math.random() < 0.6) spawnParticles(p.mesh.position, { count: 1, colors: [0x1d9bf0, 0xffffff], speed: 0.6, life: 0.3, up: 0.4, gravity: 0 });
      }
      p.mesh.position.addScaledVector(forwardVec(p.heading), p.speed * dt);
      p.mesh.position.y = 0.9;
      p.mesh.rotation.y = p.heading; p.mesh.rotation.x += dt * 7;
      const idx = globalNearest(p.mesh.position);
      if (Math.abs(lateralAt(p.mesh.position, idx)) > HALF_W + 2.5) dead = true;
      if (!dead) for (const o of karts) {
        if (o === p.owner && p.age < 0.4) continue;
        if (o.ghostT > 0) continue; // Insider Trading ghost: projectiles pass straight through
        const dx = o.pos.x - p.mesh.position.x, dz = o.pos.z - p.mesh.position.z;
        if (dx * dx + dz * dz < 6.3) {
          if (o.starT <= 0) spinKart(o);
          else spawnParticles(p.mesh.position, { count: 8, colors: [0xffe066], speed: 4, life: 0.4, up: 3, gravity: 0 });
          if (p.owner.isPlayer) hitstopT = Math.max(hitstopT, 0.045); // landing a hit should *thunk*
          dead = true; break;
        }
      }
    }
    if (dead) { scene.remove(p.mesh); projectiles.splice(i, 1); }
  }
}
function updateBananasAndCollisions(dt) {
  for (let i = bananas.length - 1; i >= 0; i--) {
    const b = bananas[i]; b.age += dt;
    for (const k of karts) {
      if (k === b.owner && b.age < 1.6) continue;
      if (k.ghostT > 0) continue; // ghost floats over the leak — no breach
      const dx = k.pos.x - b.pos.x, dz = k.pos.z - b.pos.z;
      if (dx * dx + dz * dz < 4.6) {
        if (k.starT > 0) { spawnParticles(b.pos, { count: 10, colors: [0x2fb9ff, 0x9be7ff], speed: 4, life: 0.5, up: 3 }); }
        else { if (k.isPlayer) showFeed('💧 DATA BREACH — you hit a leak!'); spawnParticles(b.pos, { count: 12, colors: [0x2fb9ff, 0x9be7ff], speed: 4, life: 0.5, up: 3 }); spinKart(k); }
        scene.remove(b.mesh); bananas.splice(i, 1); break;
      }
    }
  }
  for (let a = 0; a < karts.length; a++) for (let c = a + 1; c < karts.length; c++) {
    const A1 = karts[a], B1 = karts[c];
    const dx = B1.pos.x - A1.pos.x, dz = B1.pos.z - A1.pos.z, d2 = dx * dx + dz * dz;
    if (d2 < 11.6 && d2 > 0.0001) {
      const d = Math.sqrt(d2), push = (3.4 - d) / 2, nx = dx / d, nz = dz / d;
      A1.pos.x -= nx * push; A1.pos.z -= nz * push;
      B1.pos.x += nx * push; B1.pos.z += nz * push;
      if (A1.starT > 0 && B1.starT <= 0 && B1.starTouchCd <= 0) { spinKart(B1); B1.starTouchCd = 1; }
      if (B1.starT > 0 && A1.starT <= 0 && A1.starTouchCd <= 0) { spinKart(A1); A1.starTouchCd = 1; }
      if (A1.bailoutT > 0 && B1.bailoutT <= 0 && B1.starTouchCd <= 0) { spinKart(B1); B1.starTouchCd = 1; } // bailed-out karts bulldoze
      if (B1.bailoutT > 0 && A1.bailoutT <= 0 && A1.starTouchCd <= 0) { spinKart(A1); A1.starTouchCd = 1; }
    }
  }
}

/* ================= HUD ================= */
let firstFrame = true, mmBounds = null;
const mmCtx = $('minimap').getContext('2d');
function computeMinimapBounds() {
  let minX = 1e9, maxX = -1e9, minZ = 1e9, maxZ = -1e9;
  samples.forEach(s => { minX = Math.min(minX, s.x); maxX = Math.max(maxX, s.x); minZ = Math.min(minZ, s.z); maxZ = Math.max(maxZ, s.z); });
  mmBounds = { minX, maxX, minZ, maxZ };
}
/* Minimap portrait heads (POLISH.md §2.5): each racer's portrait is pre-rendered
   ONCE into a small circular canvas (mmFaces); drawMinimap then just blits those.
   Falls back to the plain colour dot until a portrait has loaded. */
const mmFaces = {};
function mmFace(idx) {
  const f = mmFaces[idx];
  if (f) return f.ready ? f.cv : null;
  const src = portraitOf(idx), nf = { ready: false, cv: null };
  mmFaces[idx] = nf;
  if (!src) return null;
  const img = new Image();
  img.onload = () => {
    const cv = document.createElement('canvas'); cv.width = cv.height = 26;
    const c = cv.getContext('2d');
    c.beginPath(); c.arc(13, 13, 12.5, 0, 7); c.clip();
    c.drawImage(img, 0, 0, 26, 26);
    nf.cv = cv; nf.ready = true;
  };
  img.src = src;
  return null;
}
function drawMinimap() {
  if (!mmBounds) return;
  const W = 176, H = 176, pad = 12;
  const sx = (W - pad * 2) / (mmBounds.maxX - mmBounds.minX), sz = (H - pad * 2) / (mmBounds.maxZ - mmBounds.minZ), sc = Math.min(sx, sz);
  const px = x => pad + (x - mmBounds.minX) * sc, pz = z => pad + (z - mmBounds.minZ) * sc;
  mmCtx.clearRect(0, 0, W, H);
  mmCtx.beginPath();
  samples.forEach((s, i) => { if (i % 6 && i !== 0) return; const X = px(s.x), Y = pz(s.z); i === 0 ? mmCtx.moveTo(X, Y) : mmCtx.lineTo(X, Y); });
  mmCtx.closePath(); mmCtx.strokeStyle = 'rgba(255,255,255,.85)'; mmCtx.lineWidth = 3; mmCtx.stroke();
  for (const k of karts) {
    const X = px(k.pos.x), Y = pz(k.pos.z), face = mmFace(k.racerIdx);
    if (face) { // portrait head riding the line (§2.5); player bigger + yellow ring
      const d = k.isPlayer ? 23 : 18;
      mmCtx.drawImage(face, X - d / 2, Y - d / 2, d, d);
      mmCtx.beginPath(); mmCtx.arc(X, Y, d / 2, 0, 7);
      mmCtx.strokeStyle = k.isPlayer ? '#ffd900' : '#' + k.racer.color.toString(16).padStart(6, '0');
      mmCtx.lineWidth = k.isPlayer ? 2.6 : 1.8; mmCtx.stroke();
    } else {
      mmCtx.beginPath(); mmCtx.arc(X, Y, k.isPlayer ? 5.5 : 3.6, 0, 7);
      mmCtx.fillStyle = '#' + k.racer.color.toString(16).padStart(6, '0'); mmCtx.fill();
      if (k.isPlayer) { mmCtx.strokeStyle = '#fff'; mmCtx.lineWidth = 2; mmCtx.stroke(); }
    }
  }
}
function showCenter(text, dur = 1.1) { $('center-msg').textContent = text; centerUntil = elapsed + dur; }
function showToast(text, dur = 2.1) { const t = $('toast'); t.textContent = text; t.style.opacity = 1; toastUntil = elapsed + dur; }
/* Race feed (HUD clarity pass): barks, item grants/effects and position changes
   live in a compact stack in the top-centre #top-stack, directly under the
   item slot — max 3 entries, auto-fading. The middle of the screen belongs to
   the race, and on touch layouts the bottom-left belongs to the player's thumb,
   so nothing informational lives in either place. Center screen is reserved
   for countdown / GO! / lap banners / finish; the top toast keeps only
   settings confirmations and countdown rocket-start hints. */
const feedEntries = [];
function showFeed(html, kind = '') {
  const box = $('race-feed'); if (!box) return;
  const el = document.createElement('div');
  el.className = 'feed-item' + (kind ? ' ' + kind : '');
  el.innerHTML = html;
  box.appendChild(el);
  feedEntries.push({ el, until: elapsed + 2.8, out: false });
  while (box.children.length > 3) { const old = box.firstChild; old.remove(); const i = feedEntries.findIndex(e => e.el === old); if (i >= 0) feedEntries.splice(i, 1); }
}
function pruneFeed() {
  for (let i = feedEntries.length - 1; i >= 0; i--) {
    const e = feedEntries[i];
    if (!e.out && elapsed > e.until) { e.out = true; e.el.classList.add('out'); }
    else if (e.out && elapsed > e.until + 0.35) { e.el.remove(); feedEntries.splice(i, 1); }
  }
}
function showBark(text) { showFeed(text, 'bark'); }
function showInk(dur = 3) { $('ink-overlay').classList.remove('hidden'); inkUntil = elapsed + dur; } // Smear Campaign splat on the player's screen
function updateItemSlot() {
  if (window.BKFX && BKFX.spinning) BKFX.cancel(); // authoritative refresh kills any stale roulette
  const p = playerKart(); if (!p) return;
  const slot = $('item-slot');
  if (p.item) { $('item-icon').textContent = ITEMS[p.item].icon; $('item-name').textContent = ITEMS[p.item].name; slot.classList.add('has-item'); }
  else { $('item-icon').textContent = '·'; $('item-name').textContent = ''; slot.classList.remove('has-item'); }
}
function updateHUD(dt) {
  const p = playerKart(); if (!p) return;
  // Rev meter (POLISH.md §2.4): display only — mirrors the rocket-start revHeld
  // sampling (sweet zone = the actual 0.45–1.7 s window, over-rev past 2.3 s).
  const rm = $('rev-meter');
  if (gameState === 'countdown') {
    rm.classList.remove('hidden');
    $('rev-fill').style.width = (clamp(revHeld / 2.3, 0, 1) * 100).toFixed(1) + '%';
    rm.classList.toggle('sweet', revHeld >= 0.45 && revHeld <= 1.7);
    rm.classList.toggle('over', revHeld > 2.3);
  } else if (!rm.classList.contains('hidden')) rm.classList.add('hidden');
  const rank = rankOf(p);
  $('pos-big').childNodes[0].nodeValue = rank;
  $('pos-suffix').textContent = SUFFIX[rank];
  $('lap-label').textContent = p.finished ? 'FINISHED 🏁' : `LAP ${clamp(Math.floor(Math.max(p.continuous, 0) / N) + 1, 1, LAPS)}/${LAPS}`;
  $('time-label').textContent = fmtTime(raceTime);
  $('best-lap-label').textContent = p.bestLap ? `BEST LAP ${fmtTime(p.bestLap)}` : (p.lastLapTime ? `LAST LAP ${fmtTime(p.lastLapTime)}` : '');
  $('speed-num').textContent = Math.round(Math.abs(p.speed) * 2.2);
  const fill = $('drift-fill');
  fill.style.width = `${clamp(p.driftCharge / 1.4 * 100, 0, 100)}%`;
  fill.style.background = p.driftCharge >= 1.4 ? '#ffa53a' : p.driftCharge >= 0.7 ? '#6cf' : 'rgba(255,255,255,.35)';
  const rate = dt > 0 ? (p.continuous - prevPlayerCont) / dt : 0;
  progRate = lerp(progRate, rate, 0.07); prevPlayerCont = p.continuous;
  $('wrong-way').classList.toggle('hidden', !(gameState === 'racing' && !p.finished && progRate < -3 && p.speed > 6));
  hudTimer -= dt;
  if (hudTimer <= 0) {
    hudTimer = 0.2;
    $('standings').innerHTML = sortedKarts().map((k, i) =>
      `<div class="${k.isPlayer ? 'me' : ''}"><span class="dot" style="background:#${k.racer.color.toString(16).padStart(6, '0')}"></span>${i + 1}. ${k.racer.name}${k.finished ? ' ✓' : ''}</div>`).join('');
    drawMinimap();
    if (gameState === 'racing' && !p.finished && raceTime > 2) { // position-change feedback, podium-relevant only (no spam)
      if (lastRank > 0 && rank !== lastRank) {
        if (rank <= 3 && rank < lastRank) showFeed(rank === 1 ? '🥇 P1 — YOU LEAD!' : `🏆 P${rank}!`);
        else if (lastRank === 1 && rank > 1) showFeed('⚠️ Lost the lead!');
      }
      lastRank = rank;
    }
  }
}

/* ================= INPUT ================= */
function toggleMute() { A.muted = !A.muted; $('btn-mute').textContent = A.muted ? '🔇' : '🔊'; if (A.muted) A.engine(0, false); }
function togglePause() {
  if (gameState !== 'racing' && gameState !== 'countdown') return;
  paused = !paused;
  if (paused) A.uiTab(); // §4 tab cue as the pause menu lands
  $('screen-pause').classList.toggle('hidden', !paused);
  if (paused) A.engine(0, false);
}
function resetPlayerToTrack() {
  const p = playerKart(); if (!p) return;
  p.pos.copy(samples[p.sampleIdx]); p.pos.y = 0;
  p.heading = p.velHeading = headingOf(tangents[p.sampleIdx]);
  p.speed = 0; p.spinT = 0; p.drifting = false; p.driftCharge = 0;
}
function playerInput() {
  let steer = 0, throttle = 0, brake = 0, drift = false;
  if (keys['ArrowLeft'] || keys['KeyA'] || touchFlags.left) steer -= 1;
  if (keys['ArrowRight'] || keys['KeyD'] || touchFlags.right) steer += 1;
  if (keys['ArrowUp'] || keys['KeyW'] || touchFlags.gas) throttle = 1;
  if (keys['ArrowDown'] || keys['KeyS'] || touchFlags.brake) brake = 1;
  if (keys['ShiftLeft'] || keys['ShiftRight'] || touchFlags.drift) drift = true;
  // analog touch sticks (Control Lab) — steering is proportional; throttle/brake from the gas sticks are binary (#17 v3)
  if (!keys['ArrowLeft'] && !keys['KeyA'] && !keys['ArrowRight'] && !keys['KeyD'] && !touchFlags.left && !touchFlags.right && Math.abs(touchAnalog.steer) > 0.02) steer = touchAnalog.steer;
  throttle = Math.max(throttle, touchAnalog.throttle);
  brake = Math.max(brake, touchAnalog.brake);
  if (touchScheme === 'autog' && gameState === 'racing') throttle = brake > 0.05 ? 0 : 1; // Auto-Gas: always on unless braking (countdown excluded — rev for your own rocket start)
  if (mouse.down) { throttle = 1; const ms = clamp((mouse.x - 0.5) * 2.8, -1, 1); if (Math.abs(ms) > 0.12) steer = ms; }
  if (gyro.enabled) steer = gyro.steer; // gyro on => stick X is ignored (gyro wins steering)
  // gamepad
  const pads = navigator.getGamepads ? navigator.getGamepads() : [];
  for (const gp of pads) {
    if (!gp) continue;
    const ax = gp.axes[0] || 0;
    if (Math.abs(ax) > 0.13) steer = ax;
    if (gp.buttons[14]?.pressed) steer = -1;
    if (gp.buttons[15]?.pressed) steer = 1;
    if ((gp.buttons[7]?.value || 0) > 0.25 || gp.buttons[0]?.pressed) throttle = 1;
    if ((gp.buttons[6]?.value || 0) > 0.25 || gp.buttons[1]?.pressed) brake = 1;
    if (gp.buttons[4]?.pressed || gp.buttons[5]?.pressed) drift = true;
    const itemNow = !!gp.buttons[2]?.pressed;
    if (itemNow && !padItemPrev && gameState === 'racing' && !paused) useItem(playerKart());
    padItemPrev = itemNow;
    const startNow = !!gp.buttons[9]?.pressed;
    if (startNow && !padStartPrev) togglePause();
    padStartPrev = startNow;
    break;
  }
  // Auto-Drift assist: full-lock steer held >0.25s initiates a drift by itself (sustains while held)
  if (autoDriftOn() && gameState === 'racing') {
    if (Math.abs(steer) > 0.85) { if (!steerFullSince) steerFullSince = elapsed; if (elapsed - steerFullSince > 0.25) drift = true; }
    else steerFullSince = 0;
  } else steerFullSince = 0;
  // Tap-to-drift-hop latch (Pedal & Stick pedal tap / Dual Stick right-stick tap): drift fires when the steer input deflects and releases (with boost) when it centres
  if (driftTap.active) {
    if (Math.abs(touchAnalog.steer) > 0.25) { drift = true; driftTap.started = true; }
    else if (driftTap.started) { driftTap.active = false; driftTap.started = false; }
    else if (elapsed > driftTap.expires) driftTap.active = false;
  }
  // Smart Steering (Real Racing 3 style): gentle nudge toward the racing line — authority capped at 25%, ~0 mid-drift so it never fights a drift line
  const pk = playerKart();
  if (smartSteerOn() && pk && gameState === 'racing' && pk.speed > 5 && !pk.autopilot) {
    const ti = wrapIdx(pk.sampleIdx + Math.round(clamp(pk.speed * 0.55, 10, 26)));
    const tp = samples[ti].clone().addScaledVector(normals[ti], -pk.lateral * 0.45);
    const dSteer = clamp(-angNorm(Math.atan2(tp.x - pk.pos.x, tp.z - pk.pos.z) - pk.heading) * 1.9, -1, 1);
    const w = pk.drifting ? 0.06 : 0.25;
    steer = steer * (1 - w) + dSteer * w;
  }
  if (debugInput.steer != null) steer = debugInput.steer;
  if (debugInput.throttle != null) throttle = debugInput.throttle;
  if (debugInput.brake != null) brake = debugInput.brake;
  if (debugInput.drift != null) drift = debugInput.drift;
  return { steer: clamp(steer, -1, 1), throttle, brake, drift };
}
function bindInputs() {
  window.addEventListener('keydown', e => {
    if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault();
    keys[e.code] = true;
    if (e.repeat) return;
    if (e.code === 'Space' && gameState === 'racing' && !paused) useItem(playerKart());
    if (e.code === 'KeyR' && gameState === 'racing' && !paused) resetPlayerToTrack();
    if ((e.code === 'KeyP' || e.code === 'Escape')) togglePause();
    if (e.code === 'KeyM') toggleMute();
  });
  window.addEventListener('keyup', e => keys[e.code] = false);
  const cv = $('game-canvas');
  cv.addEventListener('pointerdown', e => { if (e.pointerType === 'mouse') { mouse.down = true; mouse.x = e.clientX / window.innerWidth; } });
  window.addEventListener('pointerup', () => mouse.down = false);
  window.addEventListener('pointermove', e => { mouse.x = e.clientX / window.innerWidth; mouse.lastMove = elapsed; });
  cv.addEventListener('contextmenu', e => e.preventDefault());
  // #20: iOS gesture suppression — Safari must never steal a hold for selection,
  // the callout menu, or a pinch gesture (that theft arrives as pointercancel and
  // silently dropped the gas). Input is pointerId-tracked (stick layer below and
  // per-button handlers), and every pointercancel is handled per-pointer.
  document.addEventListener('contextmenu', e => e.preventDefault());
  document.addEventListener('gesturestart', e => e.preventDefault());
  document.addEventListener('gesturechange', e => e.preventDefault());
  document.addEventListener('selectstart', e => e.preventDefault());
  window.addEventListener('pointercancel', () => { mouse.down = false; });
  // touch buttons
  const bindHold = (id, prop) => {
    const el = $(id);
    const on = e => { e.preventDefault(); touchFlags[prop] = true; el.classList.add('active'); };
    const off = e => { e.preventDefault(); touchFlags[prop] = false; el.classList.remove('active'); };
    el.addEventListener('pointerdown', on); el.addEventListener('pointerup', off);
    el.addEventListener('pointercancel', off); el.addEventListener('pointerleave', off);
  };
  bindHold('btn-left', 'left'); bindHold('btn-right', 'right'); bindHold('btn-gas', 'gas');
  bindHold('btn-brake', 'brake'); bindHold('btn-drift', 'drift');
  $('btn-item').addEventListener('pointerdown', e => { e.preventDefault(); fireItem(); });
  $('item-slot').addEventListener('pointerdown', e => { e.preventDefault(); fireItem(); }); // the big slot itself is the button (human playtest fix) — pointerdown, haptic + pop via fireItem
  // ---- Control Lab: floating stick / pedal layer (Pointer Events, per-pointerId zones, multi-touch safe) ----
  bindHold('btn-drift2', 'drift'); bindHold('btn-brake2', 'brake');
  $('btn-item2').addEventListener('pointerdown', e => { e.preventDefault(); fireItem(); });
  document.querySelectorAll('.scheme-btn').forEach(b => b.addEventListener('click', () => { A.init(); A.uiTab(); setTouchScheme(b.dataset.scheme); }));
  document.querySelectorAll('.smart-btn').forEach(b => b.addEventListener('click', () => { A.uiTab(); const order = ['auto', 'on', 'off']; setSmartMode(order[(order.indexOf(smartMode) + 1) % 3]); }));
  document.querySelectorAll('.adrift-btn').forEach(b => b.addEventListener('click', () => { A.uiTab(); const order = ['auto', 'on', 'off']; setAutoDriftMode(order[(order.indexOf(autoDriftMode) + 1) % 3]); }));
  const layer = $('stick-layer');
  const stickEls = { steer: $('stick-a'), main: $('stick-a'), pedal: $('stick-b'), dsteer: $('stick-a'), dpedal: $('stick-b') };
  const axisVal = d => { const a = Math.abs(d); if (a < 10) return 0; const v = clamp((a - 10) / 50, 0, 1); return Math.sign(d) * v * (0.65 + 0.35 * v); }; // 10px deadzone, full deflection at 60px, mild curve
  const zoneTaken = z => { for (const r of stickPointers.values()) if (r.zone === z) return true; return false; };
  const moveNub = (rec, dx, dy) => { if (!rec.el) return; const l = Math.hypot(dx, dy), m = l > 34 ? 34 / l : 1; rec.el.firstElementChild.style.transform = `translate(calc(-50% + ${(dx * m).toFixed(1)}px), calc(-50% + ${(dy * m).toFixed(1)}px))`; };
  // Gas sticks (Thumbstick main / Pedal / Dual-Stick right) are BINARY (#17 v3): any
  // press = FULL gas; pull down past 24px = FULL brake/reverse while held. No
  // proportional throttle/brake anywhere. Brake engagement is impossible to miss:
  // a haptic pulse on the rising edge + the stick turns red with a BRAKE label.
  const applyGasStick = (rec, y, dy, flickOnRelease) => {
    const braking = dy > 24;
    touchAnalog.brake = braking ? 1 : 0;
    touchAnalog.throttle = braking ? 0 : 1;
    if (braking !== !!rec.braking) {
      rec.braking = braking;
      if (rec.el) rec.el.classList.toggle('braking', braking);
      if (braking && navigator.vibrate) { try { navigator.vibrate(35); } catch (e) { } } // unmistakable: you are braking now
    }
    const now = performance.now();
    rec.hist = (rec.hist || []).filter(s => now - s.t < 260); rec.hist.push({ t: now, y });
    if (rec.hist.length > 1 && rec.hist[0].y - y >= 48) { // quick 48px upward flick
      if (flickOnRelease) rec.flickArmed = true; // fires on release (see releaseStick)
      else if (!rec.flicked) { rec.flicked = true; fireItem(); } // pedal: fires the moment it crosses
    }
  };
  const applyStick = (rec, x, y) => {
    const dx = x - rec.ox, dy = y - rec.oy;
    rec.maxDrag = Math.max(rec.maxDrag || 0, Math.hypot(dx, dy));
    moveNub(rec, dx, dy);
    if (rec.zone === 'main') { // Thumbstick v3 (#17): HOLD = full gas; X = steer (proportional); pull DOWN + hold = full brake; flick UP + release = item
      touchAnalog.steer = axisVal(dx);
      applyGasStick(rec, y, dy, true);
    }
    else if (rec.zone === 'steer' || rec.zone === 'dsteer') touchAnalog.steer = axisVal(dx);
    else if (rec.zone === 'pedal') applyGasStick(rec, y, dy, false); // Pedal & Stick: hold = gas, flick UP fires at once, tap = drift hop
    else if (rec.zone === 'dpedal') applyGasStick(rec, y, dy, true); // Dual Stick right: same binary gas/brake, flick UP + release = item
  };
  // Dual Stick grace latch (#17 final): a quick thumb lift must not stall the kart —
  // throttle (and steering) HOLD for ~250ms after release, the stick stays on screen
  // lit gold, and a re-touch inside the window cancels the cut entirely.
  const dsLatch = { gasToken: 0, steerToken: 0 };
  const latchGas = el => {
    const tok = ++dsLatch.gasToken;
    if (el) { el.style.display = 'block'; el.classList.add('latched'); }
    setTimeout(() => {
      if (dsLatch.gasToken !== tok || zoneTaken('dpedal')) return;
      touchAnalog.throttle = 0; touchAnalog.brake = 0;
      if (el) { el.style.display = 'none'; el.classList.remove('latched'); }
    }, 250);
  };
  const latchSteer = el => {
    const tok = ++dsLatch.steerToken;
    if (el) { el.style.display = 'block'; el.classList.add('latched'); }
    setTimeout(() => {
      if (dsLatch.steerToken !== tok || zoneTaken('dsteer')) return;
      touchAnalog.steer = 0;
      if (el) { el.style.display = 'none'; el.classList.remove('latched'); }
    }, 250);
  };
  const releaseStick = rec => {
    if (rec.el) { rec.el.style.display = 'none'; rec.el.classList.remove('braking'); }
    rec.braking = false;
    if (rec.zone === 'steer') touchAnalog.steer = 0;
    if (rec.zone === 'dsteer') { // Dual Stick left (#17 final): drag = steer; quick tap = ITEM; a drag release LATCHES the steer value briefly
      if (performance.now() - rec.t0 < 220 && (rec.maxDrag || 0) < 12) { fireItem(); touchAnalog.steer = 0; }
      else latchSteer(rec.el);
    }
    if (rec.zone === 'main') { if (rec.flickArmed) fireItem(); touchAnalog.steer = 0; touchAnalog.throttle = 0; touchAnalog.brake = 0; } // flick-up + release fires the item; plain release = coast
    if (rec.zone === 'dpedal') { // Dual Stick right (#17 final): flick+release = item; quick tap = DRIFT HOP; plain release LATCHES the gas
      if (rec.flickArmed) fireItem();
      if (rec.braking) { touchAnalog.throttle = 0; touchAnalog.brake = 0; if (rec.el) rec.el.style.display = 'none'; }
      else {
        if (performance.now() - rec.t0 < 220 && (rec.maxDrag || 0) < 12) { driftTap.active = true; driftTap.started = false; driftTap.expires = elapsed + 1.2; } // tap = DRIFT HOP (fires when the left stick deflects)
        latchGas(rec.el);
      }
    }
    if (rec.zone === 'pedal') {
      if (performance.now() - rec.t0 < 220 && (rec.maxDrag || 0) < 12) { driftTap.active = true; driftTap.started = false; driftTap.expires = elapsed + 1.2; } // quick tap = DRIFT HOP (gas blip on touchdown is intended)
      touchAnalog.throttle = 0; touchAnalog.brake = 0;
    }
    if (rec.zone === 'itemzone' && performance.now() - rec.t0 < 300 && (rec.maxDrag || 0) < 14) fireItem(); // Thumbstick: left side is the no-aim item zone
    if (rec.zone === 'tap' && performance.now() - rec.t0 < 200 && (rec.maxDrag || 0) < 12) fireItem(); // Auto-Gas: second-finger tap = item
    if (rec.zone === 'steer' && touchScheme === 'autog' && performance.now() - rec.t0 < 200 && (rec.maxDrag || 0) < 12) fireItem(); // Auto-Gas: a tap when not steering = item
  };
  layer.addEventListener('pointerdown', e => {
    if (touchScheme === 'buttons' || paused) return;
    let zone = null;
    if (touchScheme === 'stick1') zone = e.clientX < window.innerWidth * 0.4 ? 'itemzone' : 'main'; // right ~60% drives; left ~40% is the tap-for-item zone
    else if (touchScheme === 'sticks2') zone = e.clientX < window.innerWidth / 2 ? 'steer' : 'pedal';
    else if (touchScheme === 'dualstick') zone = e.clientX < window.innerWidth / 2 ? 'dsteer' : 'dpedal'; // left = steer (+ tap = item), right = drive (+ tap = drift hop)
    else if (touchScheme === 'autog') zone = zoneTaken('steer') ? 'tap' : 'steer'; // second finger taps for item while the first keeps steering
    if (!zone || (zone !== 'tap' && zoneTaken(zone)) || stickPointers.has(e.pointerId)) return;
    try { layer.setPointerCapture(e.pointerId); } catch (err) { }
    const rec = { zone, ox: e.clientX, oy: e.clientY, t0: performance.now(), maxDrag: 0, el: stickEls[zone] || null, hist: null, flicked: false, flickArmed: false };
    stickPointers.set(e.pointerId, rec);
    if (zone === 'dpedal') dsLatch.gasToken++; // re-touch inside the grace window: gas was never cut
    if (zone === 'dsteer') dsLatch.steerToken++;
    if (rec.el) { rec.el.style.display = 'block'; rec.el.classList.remove('latched'); rec.el.style.left = e.clientX + 'px'; rec.el.style.top = e.clientY + 'px'; moveNub(rec, 0, 0); }
    if (zone === 'pedal' || zone === 'dpedal') touchAnalog.throttle = 1; // instant full gas on touchdown
    applyStick(rec, e.clientX, e.clientY);
    e.preventDefault();
  });
  layer.addEventListener('pointermove', e => { const rec = stickPointers.get(e.pointerId); if (rec) applyStick(rec, e.clientX, e.clientY); });
  const endPointer = e => { const rec = stickPointers.get(e.pointerId); if (rec) { releaseStick(rec); stickPointers.delete(e.pointerId); } };
  layer.addEventListener('pointerup', endPointer);
  layer.addEventListener('pointercancel', endPointer);
  // HUD buttons bind on pointerdown, NOT click (#16: click synthesis was unreliable on
  // touch devices inside the pointer-events:none HUD — pause/mute/gyro felt dead mid-race)
  $('btn-pause').addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); togglePause(); });
  $('btn-mute').addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); toggleMute(); });
  $('btn-gyro').addEventListener('pointerdown', async e => {
    e.preventDefault(); e.stopPropagation();
    if (!gyro.enabled && typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
      try { if (await DeviceOrientationEvent.requestPermission() !== 'granted') { showToast('🧭 Gyro permission denied'); return; } } catch (err) { /* continue */ }
    }
    gyro.enabled = !gyro.enabled; gyro.baseGamma = null; gyro.baseBeta = null;
    $('btn-gyro').style.background = gyro.enabled ? 'rgba(255,217,74,.8)' : '';
    showToast(gyro.enabled ? '🧭 Tilt steering ON — tilt to steer' : '🧭 Tilt steering OFF');
  });
  window.addEventListener('deviceorientation', e => {
    if (!gyro.enabled || e.gamma == null) return;
    if (gyro.baseGamma === null) { gyro.baseGamma = e.gamma; gyro.baseBeta = e.beta || 0; }
    const landscape = window.innerWidth > window.innerHeight;
    let raw;
    if (!landscape) raw = e.gamma - gyro.baseGamma;
    else raw = ((e.beta || 0) - gyro.baseBeta) * (screen.orientation && screen.orientation.angle === 270 ? 1 : -1);
    gyro.steer = clamp(raw / 16, -1, 1);
  });
  window.addEventListener('gamepadconnected', e => { $('pad-info').textContent = `🎮 Gamepad connected: ${e.gamepad.id.slice(0, 42)} — you're good to go.`; });
  window.addEventListener('gamepaddisconnected', () => { $('pad-info').textContent = '🎮 Gamepad disconnected.'; });
  $('btn-resume').addEventListener('click', () => { A.uiSelect(); togglePause(); });
  $('btn-restart').addEventListener('click', () => { A.uiSelect(); fxTransition('checker', () => { $('screen-pause').classList.add('hidden'); paused = false; startRace(); }); });
  $('btn-quit').addEventListener('click', () => { A.uiBack(); fxTransition('checker', quitToMenu); });
  $('btn-again').addEventListener('click', () => { A.uiSelect(); fxTransition('checker', () => { $('screen-results').classList.add('hidden'); startRace(); }); });
  $('btn-change').addEventListener('click', () => { A.uiBack(); fxTransition('checker', quitToMenu); });
}
const isTouchDevice = () => ('ontouchstart' in window) || navigator.maxTouchPoints > 0;

/* ================= FLOW ================= */
function startRace() {
  A.init();
  paused = false;
  $('screen-menu').classList.add('hidden');
  $('screen-results').classList.add('hidden');
  $('screen-pause').classList.add('hidden');
  $('hud').classList.remove('hidden');
  const hp = portraitOf(selectedRacer), hpEl = $('hud-portrait');
  if (hp) { hpEl.src = hp; hpEl.style.display = 'block'; } else hpEl.style.display = 'none';
  touchUiSig = ''; refreshTouchUI();
  if (isTouchDevice()) $('btn-gyro').classList.remove('hidden');
  buildWorld(selectedTrack, sampleField()); // fresh random 7 opponents from the pool every race
  camHeading = playerKart().heading;
  camera.position.copy(playerKart().pos).add(new THREE.Vector3(0, 30, -30));
  gameState = 'countdown'; countdownT = 3.6; lastCount = 99; raceTime = 0;
  revHeld = 0; revOverWarned = false; lastRank = 0; hitstopT = 0;
  showCenter('', 0); updateItemSlot(); drawMinimap();
}
function quitToMenu() {
  paused = false; gameState = 'menu';
  $('screen-pause').classList.add('hidden');
  $('screen-results').classList.add('hidden');
  $('hud').classList.add('hidden');
  $('touch-controls').classList.add('hidden');
  $('screen-menu').classList.remove('hidden');
  A.engine(0, false);
  placeGrid();
  updateBestInfo();
}
function storeBest(key, val) { try { const old = parseFloat(localStorage.getItem(key)); if (!old || val < old) localStorage.setItem(key, String(val)); } catch (e) { } }
function readBest(key) { try { const v = parseFloat(localStorage.getItem(key)); return isFinite(v) && v > 0 ? v : null; } catch (e) { return null; } }
function updateBestInfo() {
  const lap = readBest(`bk_best_lap_${selectedTrack}`), race = readBest(`bk_best_race_${selectedTrack}`);
  $('best-info').textContent = (lap || race) ? `🏆 ${TRACKS[selectedTrack].name} best — ${lap ? `lap ${fmtTime(lap)}` : ''}${lap && race ? ' · ' : ''}${race ? `race ${fmtTime(race)}` : ''}` : '';
}
function showResults() {
  gameState = 'finished';
  A.engine(0, false);
  $('touch-controls').classList.add('hidden');
  const p = playerKart();
  if (p.finishTime != null) storeBest(`bk_best_race_${selectedTrack}`, p.finishTime);
  if (p.bestLap) storeBest(`bk_best_lap_${selectedTrack}`, p.bestLap);
  const rows = karts.map(k => {
    if (k.finishTime != null) return { k, t: k.finishTime, proj: false };
    const remaining = Math.max(0, LAPS * N - k.continuous) * segLen;
    return { k, t: raceTime + remaining / Math.max(24, Math.abs(k.speed)), proj: true };
  }).sort((a, b) => a.t - b.t);
  const myRank = rows.findIndex(r => r.k.isPlayer) + 1;
  $('results-title').textContent = myRank === 1 ? '🏆 YOU WIN!' : `🏁 You finished ${myRank}${SUFFIX[myRank]}`;
  const winner = rows[0].k;
  $('results-sub').innerHTML = `${winner.racer.name}: “${winner.racer.barks.win}”<br>Your time: <b>${p.finishTime != null ? fmtTime(p.finishTime) : 'DNF'}</b>${p.bestLap ? ` · Best lap: <b>${fmtTime(p.bestLap)}</b>` : ''} · ${TRACKS[selectedTrack].name}`;
  $('results-table').innerHTML = '<tr><th>#</th><th>Racer</th><th>Time</th></tr>' + rows.map((r, i) => {
    const rp = portraitOf(r.k.racerIdx);
    return `<tr class="res-row ${r.k.isPlayer ? 'me' : ''}" style="animation-delay:${i * 60}ms"><td>${i + 1}</td><td>${rp ? `<img class="res-portrait" src="${rp}" alt="">` : r.k.racer.emoji + ' '}${r.k.racer.name}</td><td>${fmtTime(r.t)}${r.proj ? ' est.' : ''}</td></tr>`;
  }).join('');
  // Results ceremony (§2.7): trophy presentation for podium finishes + confetti rain.
  const podium = myRank <= 3;
  $('results-ceremony').classList.toggle('hidden', !podium);
  if (podium) $('ceremony-label').textContent = myRank === 1 ? 'CHAMPION' : myRank === 2 ? 'RUNNER-UP' : 'PODIUM FINISH';
  $('screen-results').classList.remove('hidden');
  A.resultsSting(myRank); // §4: fanfare (1st–3rd) / neutral sting / sad-trombone-lite (7th–8th), 150 ms after the banner
  if (window.BKFX && BKFX.burst) BKFX.burst(); // star burst over the swap (POLISH.md §2.8)
  if (podium && window.BKFX && BKFX.confetti) BKFX.confetti(); // gold/red/white rain, ~2.5 s (§2.7)
}

/* ================= MENU ================= */
/* ---- Character Select v2: portrait tiles + radar stats + detail panel ---- */
const PKEYS = ['elon', 'sam', 'zuck', 'bezos', 'jensen', 'satya', 'dario', 'demis', 'trump', 'cook', 'larrysergey', 'bill', 'thiel', 'holmes', 'ellison', 'murdoch', 'soros'];
function portraitOf(i) { const P = window.BK_PORTRAITS || {}; return P[PKEYS[i]] || null; }
function statCols(r) { // [light, base, dark] shades of the racer colour for the pie slices + legend
  const base = new THREE.Color(r.color);
  return ['#' + base.clone().lerp(new THREE.Color(0xffffff), 0.32).getHexString(), '#' + base.getHexString(), '#' + base.clone().multiplyScalar(0.5).getHexString()];
}
function pieSVG(r) { // Character Select v3 (#18): pie with three slices proportional to SPEED / ACCELERATION / GRIP
  const cols = statCols(r);
  const stats = [r.spd, r.acc, r.grip], tot = stats.reduce((a, b) => a + b, 0);
  const cx = 32, cy = 30, R = 23;
  let a0 = -Math.PI / 2, slices = '';
  stats.forEach((v, i) => {
    const a1 = a0 + (v / tot) * Math.PI * 2, large = (a1 - a0) > Math.PI ? 1 : 0;
    const x0 = cx + Math.cos(a0) * R, y0 = cy + Math.sin(a0) * R, x1 = cx + Math.cos(a1) * R, y1 = cy + Math.sin(a1) * R;
    const mid = (a0 + a1) / 2, lx = cx + Math.cos(mid) * 13.5, ly = cy + Math.sin(mid) * 13.5;
    slices += `<path d="M${cx},${cy} L${x0.toFixed(1)},${y0.toFixed(1)} A${R},${R} 0 ${large} 1 ${x1.toFixed(1)},${y1.toFixed(1)} Z" fill="${cols[i]}" stroke="rgba(10,14,30,.85)" stroke-width="1.6"/><text x="${lx.toFixed(1)}" y="${(ly + 3.5).toFixed(1)}" class="pie-num">${v}</text>`;
    a0 = a1;
  });
  return `<svg class="pie" viewBox="0 0 64 60" aria-hidden="true">${slices}</svg>`;
}
function traitOf(r) { // the special-trait line — every claim here matches a real mechanic in the physics/AI code
  if (r.sputter) return '⚠️ SPECIAL: her kart randomly loses power mid-race. Vaporware drivetrain.';
  if (r.duo) return '👥 SPECIAL: two drivers, one kart — they switch drivers instead of pit stops.';
  if (r.consistent) return '🐢 SPECIAL: mistake-proof AI. Never spins out, never panics. The tortoise strategy.';
  if ((r.aiSkill || 0) >= 1.06) return '👹 FINAL-BOSS CLASS: championship-grade AI when computer-controlled.';
  if ((r.aiSkill || 0) >= 1.04) return '🔥 ELITE AI: a cut above the field when computer-controlled.';
  if (r.name === 'Jensen') return '🟢 SPECIAL: orange drift boosts last longer — the more you race, the more you save.';
  if (r.name === 'Dario') return '🦺 SPECIAL: charges drift boosts faster. Safety first, speed second.';
  return '';
}
function updateDetail() {
  const r = RACERS[selectedRacer], p = portraitOf(selectedRacer);
  const bar = (label, v) => `<div class="stat-row"><span>${label}</span><div class="stat-track"><div class="stat-fill" style="width:${v / 5 * 100}%;background:#${r.color.toString(16).padStart(6, '0')}"></div></div></div>`;
  const trait = traitOf(r);
  $('detail-media').innerHTML = p ? `<img class="detail-portrait" src="${p}" alt="${r.name} portrait">` : `<div class="detail-portrait detail-emoji" style="background:#${r.color.toString(16).padStart(6, '0')}">${r.emoji}</div>`;
  $('detail-main').innerHTML = `
      <div class="detail-name" id="detail-name">${r.name}</div>
      <div class="racer-title">${r.title}</div>
      <div class="racer-quote">${r.quote}</div>
      ${bar('SPEED', r.spd)}${bar('ACCELERATION', r.acc)}${bar('GRIP', r.grip)}
      ${trait ? `<div class="detail-trait">${trait}</div>` : ''}`;
  if (window.BKTT) BKTT.setRacer(selectedRacer); // polish turntable (desktop detail panel), if active
}
function buildMenu() {
  // Item guide (menu section 6): rendered straight from ITEMS so the plain-
  // language descriptions can never drift from the in-game feed text.
  $('items-legend').innerHTML = Object.values(ITEMS).map(it => `
    <div class="item-row"><div class="item-ic">${it.icon}</div><div><div class="item-name">${it.name}</div><div class="item-desc">${it.desc}</div></div></div>`).join('');
  $('racer-grid').innerHTML = RACERS.map((r, i) => {
    const p = portraitOf(i), cols = statCols(r);
    return `<button class="racer-tile ${i === selectedRacer ? 'selected' : ''}" data-racer="${i}">
      ${p ? `<img class="tile-portrait" src="${p}" alt="" loading="lazy">` : `<div class="tile-portrait tile-emoji" style="background:#${r.color.toString(16).padStart(6, '0')}">${r.emoji}</div>`}
      <div class="tile-name">${r.name}</div><div class="tile-title">${r.title}</div>
      <div class="tile-viz">${pieSVG(r)}<div class="tile-legend">
        <div><i style="background:${cols[0]}"></i>SPEED<b>${r.spd}</b></div>
        <div><i style="background:${cols[1]}"></i>ACCELERATION<b>${r.acc}</b></div>
        <div><i style="background:${cols[2]}"></i>GRIP<b>${r.grip}</b></div>
      </div></div>
    </button>`;
  }).join('');
  let lastTickT = 0; // hover-tick throttle (§4: the cursor tick must never machine-gun)
  const hoverTick = () => { const n = performance.now(); if (n - lastTickT > 45) { lastTickT = n; A.uiTick(); } };
  document.querySelectorAll('.racer-tile').forEach(tile => {
    tile.addEventListener('mouseenter', hoverTick);
    tile.addEventListener('click', () => {
      A.uiSelect(); A.cheerPop(); // §4 confirm chirp + tile-cheer twinkle
      selectedRacer = parseInt(tile.dataset.racer);
      document.querySelectorAll('.racer-tile').forEach(c => c.classList.toggle('selected', parseInt(c.dataset.racer) === selectedRacer));
      updateDetail();
      buildWorld(selectedTrack);
    });
  });
  updateDetail();
  document.querySelectorAll('.track-card').forEach(card => {
    card.addEventListener('mouseenter', hoverTick);
    card.addEventListener('click', () => {
      A.uiSelect();
      selectedTrack = parseInt(card.dataset.track);
      document.querySelectorAll('.track-card').forEach(c => c.classList.toggle('selected', parseInt(c.dataset.track) === selectedTrack));
      buildWorld(selectedTrack); updateBestInfo();
    });
  });
  document.querySelectorAll('.diff-btn').forEach(btn => {
    btn.addEventListener('mouseenter', hoverTick);
    btn.addEventListener('click', () => {
      A.uiTab();
      difficulty = parseInt(btn.dataset.diff);
      document.querySelectorAll('.diff-btn').forEach(b => b.classList.toggle('selected', parseInt(b.dataset.diff) === difficulty));
    });
  });
  $('btn-start').addEventListener('click', e => { A.uiSelect(); fxTransition('checker', startRace, { x: e.clientX, y: e.clientY }); });
  // Title hero (§2.1): tap anywhere on the lockup advances to character select
  $('title-hero').addEventListener('click', () => {
    A.init(); A.uiSelect();
    const target = document.querySelector('#screen-menu .section-title');
    if (target) target.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
  });
  // Graphics quality (#8): persisted choice, applied live via the gfx post chain
  const savedQ = localStorage.getItem('bk-quality') || 'auto';
  document.querySelectorAll('.qual-btn').forEach(btn => {
    btn.classList.toggle('selected', btn.dataset.q === savedQ);
    btn.addEventListener('click', () => {
      try { localStorage.setItem('bk-quality', btn.dataset.q); } catch (e) { }
      document.querySelectorAll('.qual-btn').forEach(b => b.classList.toggle('selected', b === btn));
      if (post) post.applyQuality(btn.dataset.q, { sun: sunLight });
    });
  });
  updateBestInfo();
}

/* ================= CAMERA & LOOP ================= */
function setFov(f, dt) { camFov = lerp(camFov, f, clamp(5 * dt, 0, 1)); if (Math.abs(camera.fov - camFov) > 0.05) { camera.fov = camFov; camera.updateProjectionMatrix(); } }
function spinItemBoxesVisual(dt) {
  for (const b of itemBoxes) { b.mesh.rotation.y += dt * 1.9; b.mesh.position.y = 1.7 + Math.sin(elapsed * 2.2 + b.phase) * 0.25; }
}
function updateCamera(dt) {
  const p = playerKart(); if (!p) return;
  if (gameState === 'menu') {
    menuAngle += dt * 0.045;
    camera.position.set(trackCenter.x + Math.sin(menuAngle) * 275, 108, trackCenter.z + Math.cos(menuAngle) * 275);
    camera.lookAt(trackCenter.x, 0, trackCenter.z);
    setFov(55, dt);
    sunFollow(sunLight, trackCenter, [80, 130, 60]);
    return;
  }
  camHeading = lerpAngle(camHeading, p.velHeading, clamp((gameState === 'countdown' ? 6 : 3.4) * dt, 0, 1));
  const fwd = forwardVec(camHeading);
  const desired = p.pos.clone().addScaledVector(fwd, -14.5); desired.y = 6.2;
  const kf = clamp(1 - Math.exp(-7 * dt), 0, 1);
  camera.position.x = lerp(camera.position.x, desired.x, kf);
  camera.position.y = lerp(camera.position.y, desired.y, kf);
  camera.position.z = lerp(camera.position.z, desired.z, kf);
  if (shake > 0) { camera.position.x += rand(-1, 1) * shake * 0.8; camera.position.y += rand(-0.5, 0.5) * shake * 0.6; shake = Math.max(0, shake - dt * 1.7); }
  const look = p.pos.clone().addScaledVector(fwd, 11); look.y = 2;
  camera.lookAt(look);
  setFov(62 + clamp(Math.abs(p.speed) / 55, 0, 1) * 13 + (p.boostT > 0 ? 5 : 0), dt); // fun pass: wider speed FOV curve
  sunFollow(sunLight, p.pos);
}
const clock = new THREE.Clock();
function animate() {
  requestAnimationFrame(animate);
  const rawDt = Math.min(clock.getDelta(), 0.05);
  if (hitstopT > 0) hitstopT -= rawDt; // hitstop: ~60 ms world-freeze on player hits (uses real time)
  const dt = rawDt * timeScale * (hitstopT > 0 ? 0.12 : 1);
  elapsed += dt;
  if (!paused && scene) {
    if (gameState === 'menu') {
      spinItemBoxesVisual(dt);
      clouds.forEach((c, i) => { c.position.x += dt * (1 + (i % 3)); if (c.position.x > 580) c.position.x = -580; });
    } else if (gameState === 'countdown') {
      countdownT -= dt;
      const c = Math.min(3, Math.ceil(countdownT)); // countdownT starts at 3.6 (rocket-start sampling window) — never display "4" (#21)
      if (c !== lastCount && c >= 1) { lastCount = c; showCenter(String(c), 0.95); A.beep(false); if (c === 3) showToast('🏁 Hold GAS just before GO = ROCKET START', 1.9); }
      // ROCKET START: sample the player's throttle through the countdown
      const cinp = playerInput();
      if (cinp.throttle) {
        revHeld += dt;
        if (revHeld > 2.3 && !revOverWarned) { revOverWarned = true; showToast('🔥 Over-revving! Ease off or you\'ll sputter!', 1.6); }
      }
      if (countdownT <= 0) {
        gameState = 'racing'; raceTime = 0; karts.forEach(k => k.lapStart = 0);
        showCenter('GO!', 0.8); A.beep(true);
        const pk = playerKart();
        if (revHeld >= 0.45 && revHeld <= 1.7) { pk.boostT = 1.15; showToast('🚀 ROCKET START!'); A.boostSnd(); }
        else if (revHeld > 2.3) { pk.sputterT = 1.0; showToast('💨 Sputtered start — too much rev!'); A.hit(); }
        for (const k of karts) { if (k.isPlayer) continue; const r = Math.random(); if (r < 0.14) k.sputterT = 0.9; else if (r < 0.5) k.boostT = rand(0.7, 1.05); } // AI gamble too
        const opp = pick(karts.filter(k => !k.isPlayer));
        if (opp) setTimeout(() => { if (gameState === 'racing') showBark(`${opp.racer.name}: “${pick(opp.racer.barks.boost)}”`); }, 900);
      }
      spinItemBoxesVisual(dt);
      A.engine(clamp(0.15 + revHeld * 0.3, 0.15, 0.85), true);
    } else if (gameState === 'racing') {
      raceTime += dt;
      for (const k of karts) {
        const input = (k.isPlayer && !k.autopilot) ? playerInput() : aiInput(k, dt);
        updateKart(k, input, dt);
      }
      updateProjectiles(dt);
      updateBananasAndCollisions(dt);
      updateBombs(dt);
      updateItemBoxes(dt);
      if (finishDelay > 0) { finishDelay -= dt; if (finishDelay <= 0) { finishDelay = -1; showResults(); } }
      A.engine(clamp(Math.abs(playerKart().speed) / 55, 0, 1), true);
      A.music(dt, true);
    } else if (gameState === 'finished') {
      spinItemBoxesVisual(dt);
    }
    if (gameState === 'racing' || gameState === 'countdown') updateHUD(dt);
    updateParticles(dt);
    updateCamera(dt);
    // name labels: shrink + fade as a kart gets close — a label must never wallpaper the screen (playtest fix)
    for (const k of karts) {
      if (!k.nameSpr) continue;
      const d = camera.position.distanceTo(k.pos);
      const s = clamp(d / 30, k.isPlayer ? 0.5 : 0.38, 1);
      k.nameSpr.scale.set(8.4 * s, 2.1 * s, 1);
      k.nameSpr.material.opacity = d < 7 ? clamp((d - 2.5) / 4.5, 0.12, 1) : 1;
    }
    refreshTouchUI();
    if (elapsed > centerUntil && $('center-msg').textContent) $('center-msg').textContent = '';
    if (elapsed > toastUntil) $('toast').style.opacity = 0;
    pruneFeed();
    if (elapsed > inkUntil) $('ink-overlay').classList.add('hidden');
  }
  if (!post && scene) { post = createPost(renderer, scene, camera); post.applyQuality(localStorage.getItem('bk-quality') || 'auto', { sun: sunLight }); } // lazy: scene is persistent, so the composer's RenderPass stays valid across rebuilds
  if (post) post.render(); else renderer.render(scene, camera);
  if (firstFrame) { firstFrame = false; $('loading').style.display = 'none'; }
}

/* ================= DEBUG API (bot testing) ================= */
window.BK = {
  start(racer, track) {
    if (racer != null) selectedRacer = racer;
    if (track != null) selectedTrack = track;
    startRace();
    return true;
  },
  state() {
    const p = playerKart();
    return {
      state: gameState, paused, raceTime,
      touch: { steer: touchAnalog.steer, throttle: touchAnalog.throttle, brake: touchAnalog.brake },
      player: p ? { pos: [p.pos.x, p.pos.y, p.pos.z], continuous: p.continuous, speed: p.speed, lap: clamp(Math.floor(Math.max(p.continuous, 0) / N) + 1, 1, LAPS), rank: rankOf(p), finished: p.finished, finishTime: p.finishTime, item: p.item, heading: p.heading, drifting: p.drifting, driftCharge: p.driftCharge, bailoutT: p.bailoutT, ghostT: p.ghostT, hornT: p.hornT, goldenT: p.goldenT, inkT: p.inkT } : null,
      karts: karts.map(k => ({ name: k.racer.name, continuous: k.continuous, speed: k.speed, finished: k.finished, pos: [k.pos.x, k.pos.z] })),
    };
  },
  giveItem(id) { const p = playerKart(); if (p && ITEMS[id]) { p.item = id; updateItemSlot(); return true; } return false; },
  grant() { const p = playerKart(); if (p) { grantItem(p); return p.item; } return null; }, // real grant path: roulette -> race-feed entry with desc
  bark() { const o = karts.find(k => !k.isPlayer); if (o) { showBark(`${o.racer.name}: “${pick(o.racer.barks.boost)}”`); return o.racer.name; } return null; }, // demo bark for HUD screenshots
  useItem() { useItem(playerKart()); },
  setInput(o) { debugInput = { throttle: o.throttle ?? null, steer: o.steer ?? null, brake: o.brake ?? null, drift: o.drift ?? null }; },
  clearInput() { debugInput = { throttle: null, steer: null, brake: null, drift: null }; },
  skipCountdown() { if (gameState === 'countdown') countdownT = Math.min(countdownT, 0.05); },
  autopilot(on) { const p = playerKart(); if (p) { p.autopilot = !!on; return p.autopilot; } return false; },
  setTimescale(x) { timeScale = clamp(x || 1, 0.25, 12); return timeScale; },
  setDifficulty(d) { difficulty = clamp(Math.round(d ?? 1), 0, 2); return difficulty; },
  setFairPlayer(b) { simFairPlayer = !!b; return simFairPlayer; },
  setLaps(n) { LAPS = clamp(Math.round(n || 3), 1, 5); return LAPS; },
  trackLen() { return segLen * N; },
  player() { const p = playerKart(); return p ? { pos: p.pos, continuous: p.continuous, speed: p.speed, heading: p.heading, rank: rankOf(p) } : null; },
};

/* ================= TURNTABLE (POLISH.md §2.2) =================
   Live 3D kart on a podium inside the desktop character-select detail panel.
   Its own tiny renderer + scene — the race renderer/scene are never touched.
   Reuses makeKart() for the model; the stage kart is spliced straight back out
   of the race-state array in the same synchronous step. Desktop-only
   (>=1024px, where the detail panel is the side column); on any failure the
   2D portrait simply stays (window.BKTT nulled, panel never gets .tt-on). */
window.BKTT = (function () {
  let R = null, holder = null, cur = -1, alive = false, spin = 0, last = performance.now(), t0 = 0, lastW = 0, lastH = 0;
  const active = () => window.innerWidth >= 1024 && !$('screen-menu').classList.contains('hidden');
  function disposeGroup(g) { g.traverse(o => { if (o.geometry) o.geometry.dispose(); if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => { if (m.map) m.map.dispose(); m.dispose(); }); }); }
  function init() {
    const cv = document.createElement('canvas'); cv.id = 'stage-canvas';
    $('detail-media').appendChild(cv);
    const r = new THREE.WebGLRenderer({ canvas: cv, antialias: true, preserveDrawingBuffer: true }); // preserve: showcase canvas must hold its frame for screenshots/compositors
    r.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    const sc = new THREE.Scene();
    const c2 = document.createElement('canvas'); c2.width = 4; c2.height = 256;
    const g2 = c2.getContext('2d'); const gr = g2.createLinearGradient(0, 0, 0, 256);
    gr.addColorStop(0, '#4fc3f7'); gr.addColorStop(0.55, '#29b6f6'); gr.addColorStop(1, '#0288d1');
    g2.fillStyle = gr; g2.fillRect(0, 0, 4, 256);
    sc.background = new THREE.CanvasTexture(c2);
    const cam = new THREE.PerspectiveCamera(38, 1, 0.1, 60);
    cam.position.set(0, 2.7, 7.4); cam.lookAt(0, 1.15, 0);
    sc.add(new THREE.HemisphereLight(0xcfeaff, 0x2e4a22, 0.95));
    const sun = new THREE.DirectionalLight(0xffffff, 2.0); sun.position.set(4, 6, 3); sc.add(sun);
    const grp = new THREE.Group(); sc.add(grp);
    const podium = new THREE.Mesh(new THREE.CylinderGeometry(2.35, 2.5, 0.35, 36), new THREE.MeshStandardMaterial({ color: 0x23262b, roughness: 0.6, metalness: 0.3 }));
    podium.position.y = 0.175; grp.add(podium);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(2.36, 0.055, 10, 48), new THREE.MeshStandardMaterial({ color: 0xffd900, emissive: 0xcc9900, emissiveIntensity: 0.7, roughness: 0.35 }));
    ring.rotation.x = Math.PI / 2; ring.position.y = 0.36; grp.add(ring);
    const blob = new THREE.Mesh(new THREE.CircleGeometry(1.75, 28), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.28 }));
    blob.rotation.x = -Math.PI / 2; blob.position.y = 0.365; grp.add(blob);
    const hold = new THREE.Group(); hold.position.y = 0.35; grp.add(hold);
    R = { r, sc, cam, grp, hold };
  }
  function setRacer(i) {
    cur = i;
    if (!R) return;
    if (holder) { R.hold.remove(holder); disposeGroup(holder); holder = null; }
    const before = karts.length;
    const tk = makeKart(i, false);
    karts.length = before; // the stage kart never enters race state
    if (tk.nameSpr) { tk.mesh.remove(tk.nameSpr); if (tk.nameSpr.material) { if (tk.nameSpr.material.map) tk.nameSpr.material.map.dispose(); tk.nameSpr.material.dispose(); } }
    holder = tk.mesh;
    R.hold.add(holder);
    t0 = performance.now();
  }
  function frame() {
    requestAnimationFrame(frame);
    const now = performance.now();
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    if (!active()) { if (alive) { alive = false; $('racer-detail').classList.remove('tt-on'); } return; }
    if (!R) { try { init(); setRacer(cur >= 0 ? cur : selectedRacer); } catch (e) { window.BKTT = null; return; } }
    if (!alive) { alive = true; $('racer-detail').classList.add('tt-on'); }
    const media = $('detail-media'), w = media.clientWidth, h = media.clientHeight;
    if (w && (w !== lastW || h !== lastH)) { lastW = w; lastH = h; R.r.setSize(w, h, false); R.cam.aspect = w / h; R.cam.updateProjectionMatrix(); }
    spin += dt * 0.35; R.grp.rotation.y = spin;
    if (holder) {
      const pop = Math.min(1, (now - t0) / 380);
      const f = 1 + 2.70158 * Math.pow(pop - 1, 3) + 1.70158 * Math.pow(pop - 1, 2); // easeOutBack
      holder.scale.setScalar(0.6 + 0.4 * f);
      holder.position.y = Math.sin(now / 1000 * 2.2) * 0.03;
    }
    R.r.render(R.sc, R.cam);
  }
  requestAnimationFrame(frame);
  return { setRacer };
})();

/* ================= BOOT ================= */
initRenderer();
buildMenu();
buildWorld(selectedTrack);
bindInputs();
// Browsers gate AudioContext behind a user gesture: create/resume it on the
// first pointer/key interaction so the §4 UI cues sound in the menus too,
// not just after the first race starts.
window.addEventListener('pointerdown', () => A.init());
window.addEventListener('keydown', () => A.init());
document.body.dataset.scheme = touchScheme;
document.querySelectorAll('.scheme-btn').forEach(b => b.classList.toggle('selected', b.dataset.scheme === touchScheme));
setSmartMode(smartMode);
setAutoDriftMode(autoDriftMode);
animate();
if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
  navigator.serviceWorker.register('sw.js').catch(() => { });
}
