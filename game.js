/* BILLIONAIRE KART: AI ARMS RACE — a parody party kart racer.
   Zero-build: Three.js via CDN import map. All models procedural, all audio synthesized. */
import * as THREE from 'three';
import * as GTEX from './gfx/textures.js';
import * as GMAT from './gfx/materials.js';
import { setupRenderer, applySky, setupLights, sunFollow, applyFog, SKY_URLS } from './gfx/environment.js';
import { createPost } from './gfx/post.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { def as datacenterDef, dress as dressDatacenter } from './tracks/datacenter.js';
import { def as watersDef, dress as dressWaters } from './tracks/waters.js';
import { def as whitehouseDef, dress as dressWhitehouse } from './tracks/whitehouse.js';
import { TRACK as META_TRACK, build as buildMetaverse } from './tracks/metaverse.js';
import { TRACK as WEWORK_TRACK, build as buildWeWork } from './tracks/wework.js';
import { TRACK as BURNING_TRACK, build as buildBurningMan } from './tracks/burningman.js';
import { TRACK as BAHAMAS_TRACK, build as buildBahamas } from './tracks/bahamas.js';

/* Concatenate non-indexed geometries with identical attributes (the foliage
   blobs). Local helper — the bot vendors only specific three/addons modules,
   so BufferGeometryUtils is not available in the test harness. */
function mergeGeos(geos) {
  const names = Object.keys(geos[0].attributes);
  const total = geos.reduce((n, g) => n + g.attributes.position.count, 0);
  const out = new THREE.BufferGeometry();
  for (const name of names) {
    const itemSize = geos[0].attributes[name].itemSize;
    const arr = new Float32Array(total * itemSize);
    let off = 0;
    for (const g of geos) { arr.set(g.attributes[name].array, off); off += g.attributes[name].array.length; }
    out.setAttribute(name, new THREE.BufferAttribute(arr, itemSize));
  }
  return out;
}

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
  { name: 'Jensen', title: 'Leather Jacket',  emoji: '🏎️', color: 0x76b900, suit: 0x17181c, skin: 0xe8b98a, spd: 4, acc: 4, grip: 4, quote: '“The board is investigating. The FBI is investigating. My wife is investigating.”',
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

/* ================= SPECIALS (#51) =================
   Every racer has ONE special ability that matters to the person PLAYING them.
   Specials are racer traits: active for whoever drives the racer (player or
   AI), but the select-screen copy is written from the player's perspective.
   aiSkill stays hidden rival tuning only — it is never advertised here.
   Index-aligned with RACERS. Baselines: drift charge 1.15/s, tiers 0.7 (blue,
   0.75 s) / 1.4 (orange, 1.35 s); spin-out 1.15 s; rocket window rev 0.45–1.7
   → 1.15 s boost, over-rev >2.3 → 1.0 s sputter; shrink 4.8 s; ink 2.5 s;
   Antitrust blast r=11; Series F 5 s window / 0.7 s cd; Bailout 5.5 s ×1.30. */
const SPECIALS = [
  /* 0 Elon    */ { startLo: 0.30, startHi: 2.6, startSputter: 2.6, rocketBoost: 1.35, sputterPunish: 1.4, copy: '🚀 SPECIAL: a launch window you could land a rocket in — rev anywhere from a touch to a long hold for a longer blast-off. Blow way past it and the sputter is worse. High risk, high thrust.' },
  /* 1 Sam     */ { streakStep: 0.05, streakCap: 0.25, copy: '📈 SPECIAL: scaling laws — every drift boost you land charges the next one 5% faster (up to +25%). Get hit and the curve resets.' },
  /* 2 Zuck    */ { mass: 1.5, shellTarget: 1.2, copy: '🦎 SPECIAL: platform bulk — you shove rivals aside in collisions, but that harvested data profile makes you a bigger target for shells.' },
  /* 3 Bezos   */ { orangeAt: 1.15, orangeBoost: 1.2, copy: '📦 SPECIAL: Prime delivery — your orange drift boost arrives early (charges at 1.15, not 1.4), but the package is smaller: 1.2 s instead of 1.35.' },
  /* 4 Jensen  */ { orangeBoost: 1.7, copy: '🟢 SPECIAL: orange drift boosts last longer — the leather jacket stays on during questioning' },
  /* 5 Satya   */ { boostMul: 1.2, chargeMul: 0.9, copy: '☁️ SPECIAL: elastic cloud — all your boosts last 20% longer, but your drift charges 10% slower. Burst capacity is billed by the second.' },
  /* 6 Dario   */ { chargeAbs: 1.45, copy: '🦺 SPECIAL: charges drift boosts faster. Safety first, speed second.' },
  /* 7 Demis   */ { bailoutT: 6.6, bailoutMul: 1.34, bailoutEndRank: 4, copy: '♟️ SPECIAL: AlphaKart bailout — your Government Bailout runs longer and harder, but the autopilot hands you back the wheel at 4th. The last move is yours.' },
  /* 8 Trump   */ { boostCap: 1.45, chargeMul: 0.85, copy: '🦅 SPECIAL: HUGE boosts — your boost top speed beats everyone\'s, but your drift charges 15% slower. He doesn\'t do the technical corners, folks.' },
  /* 9 Cook    */ { goldenT: 6.5, goldenCd: 0.85, copy: '🍏 SPECIAL: operational excellence — your Series F window stays open 6.5 s, with re-boosts at a calm, margin-friendly 0.85 s pace.' },
  /* 10 L&S    */ { offroadKeep: 0.45, mass: 0.6, copy: '🔎 SPECIAL: two drivers, one index — the pair pre-mapped every shoulder, so offroad barely slows you. Two egos in one frame, though: traffic shoves you around.' },
  /* 11 Bill   */ { shield: true, copy: '🪟 SPECIAL: the Foundation covers your first spin-out of each race — one hit, fully absorbed. Even philanthropy has a cap.' },
  /* 12 Thiel  */ { revealItems: true, copy: '👁️ SPECIAL: total awareness — your minimap shows the item every rival is holding. What you do with that information is your business.' },
  /* 13 Holmes */ { tweetEvasion: 0.3, copy: '🧪 SPECIAL: vaporware drivetrain — random 1.2 s power losses. But homing Tweets aimed at her lose the thread 30% of the time. Unverified, like the product.' },
  /* 14 Ellison*/ { inkGiven: 1.4, inkSuffer: 1.4, copy: '🏝️ SPECIAL: he owns the media — your Smear Campaigns ink rivals for 3.5 s. Downside: you read your own press, so smears stick to you for 3.5 s too.' },
  /* 15 Murdoch*/ { spinMul: 0.52, sufferMul: 0.5, copy: '🗞️ SPECIAL: unflappable — spin-outs cost you half the usual recovery (0.6 s), and crashes and smears wear off twice as fast. Slow start, never rattled.' },
  /* 16 Soros  */ { potency: 1.25, blueRadius: 13.4, sufferMul: 1.25, spinMul: 1.25, copy: '💸 SPECIAL: reflexivity — your Market Crashes shrink rivals for 6 s and your Antitrust blast reaches further. It cuts both ways: effects on you last 25% longer too.' },
];
function spec(i) { return SPECIALS[i] || {}; }
function chargeRateOf(k) { // drift charge per second, incl. Dario's flat rate, Satya/Trump multipliers, Sam's streak
  const s = spec(k.racerIdx);
  let r = s.chargeAbs ?? 1.15 * (s.chargeMul ?? 1);
  if (s.streakStep) r *= 1 + Math.min((k.driftStreak || 0) * s.streakStep, s.streakCap);
  return r;
}
function boostMulOf(k) { return spec(k.racerIdx).boostMul ?? 1; }
function orangeAtOf(k) { return spec(k.racerIdx).orangeAt ?? 1.4; }
function driftBoostOf(k, tier) { const s = spec(k.racerIdx); return tier === 'orange' ? (s.orangeBoost ?? 1.35 * (s.boostMul ?? 1)) : 0.75 * (s.boostMul ?? 1); }
function sufferMulOf(k, kind) { const s = spec(k.racerIdx); return kind === 'ink' ? (s.inkSuffer ?? s.sufferMul ?? 1) : (s.sufferMul ?? 1); }

/* ================= TRACKS ================= */
const TRACKS = [
  { name: 'Silicon Valley GP', sky: 0x87c9eb, fog: 0xa8d4f0, ground: 0x57a047, roadSeed: 1, skyKey: 'valley', fogKey: 'valleyDay',
    points: [[0,-260],[150,-215],[235,-110],[205,10],[265,110],[170,205],[40,245],[-95,205],[-215,225],[-265,105],[-215,-15],[-255,-130],[-140,-215]],
    // HAND-AUTHORED profiles (docs/track-design-silicon-valley.md) — keyframes [u, value]:
    // elev = road height in metres; bank = cross-slope in degrees (+ banks a RIGHT turn).
    elev: [[0, 0], [0.10, 0.5], [0.20, 2.0], [0.30, 3.0], [0.36, 4.5], [0.44, 9.0], [0.50, 13.0], [0.56, 11.0], [0.615, 4.0], [0.66, 5.0], [0.70, 7.5], [0.76, 4.5], [0.83, 3.0], [0.90, 1.0], [0.96, 0]],
    bank: [[0, 0], [0.08, 3], [0.171, 11], [0.205, 0], [0.240, -11], [0.272, 0], [0.303, 14], [0.40, 0], [0.466, 7], [0.505, 0], [0.544, -8], [0.578, 0], [0.610, 13], [0.65, 0], [0.692, 9], [0.728, 0], [0.764, -10], [0.797, 0], [0.830, 13], [0.915, 0]] },
  { name: 'Mars GP', sky: 0xe8906a, fog: 0xe8a37c, ground: 0xa5502f, roadSeed: 2, skyKey: 'mars', fogKey: 'marsSunset',
    points: [[0,-240],[190,-190],[250,-40],[150,60],[230,170],[90,250],[-60,205],[-170,255],[-260,140],[-190,20],[-265,-90],[-170,-190],[-70,-160]],
    // HAND-AUTHORED profiles (docs/track-design-mars.md) — same conventions as above.
    elev: [[0, 0], [0.06, 0], [0.12, 0.8], [0.198, 3.0], [0.24, 4.5], [0.272, 6.0], [0.31, 8.5], [0.343, 11.0], [0.40, 12.0], [0.438, 10.0], [0.48, 6.0], [0.519, 2.0], [0.55, -3.0], [0.59, 1.0], [0.63, 3.5], [0.666, 6.0], [0.70, 8.0], [0.739, 5.0], [0.808, 6.5], [0.85, 5.0], [0.889, 3.5], [0.92, 1.2], [0.95, 0]],
    bank: [[0, 4], [0.02, 0], [0.106, 5], [0.15, 0], [0.198, 11], [0.235, 0], [0.272, -13], [0.307, 0], [0.343, 14], [0.39, 0], [0.438, 8], [0.478, 0], [0.519, -10], [0.55, 0], [0.580, 12], [0.623, 0], [0.666, 11], [0.702, 0], [0.739, -12], [0.773, 0], [0.808, 12], [0.848, 0], [0.889, 11], [0.915, 0], [0.942, -12], [0.975, 0], [0.985, 0]] },
  datacenterDef, watersDef, whitehouseDef,
  META_TRACK, WEWORK_TRACK, BURNING_TRACK, BAHAMAS_TRACK,
];
const TRACK_DRESSING = { 2: dressDatacenter, 3: dressWaters, 4: dressWhitehouse }; // Batch 1 dress(ctx) registry (#10)
const TRACK_MODULES = [null, null, null, null, null, buildMetaverse, buildWeWork, buildBurningMan, buildBahamas]; // Batch 3 build(ctx) registry, indices 5-8 (#12)
if (window.BK_TRACKS) for (const t of window.BK_TRACKS) TRACKS.push(t); // Batch 2 classic-script tracks (Bliss/Tunnel/Davos) register as indices 9-11 (#11)
let trackFx = null, lastPlayerLap = 1, trackAnimators = []; // trackFx: Batch 1 {update,onLap}; trackAnimators: Batch 3 per-frame hooks
let currentDef = null; // Batch 2: active track def (buildWorld sets it; drives tick / countdownView / chime)
function sceneryContext() { return { THREE, scene, samples, normals, tangents, N, HALF_W, trackCenter, rand, clamp, scatterPos, headingOf, clouds, canvasTexture, billboardTexture, stripGeometry, animators: trackAnimators, terrainHeightAt, rollNormals, roadYAtPos }; }
const BILLBOARDS = ['AGI COMING SOON™', 'GPU GO BRRR', 'THIS SIGN COST $4.20', 'NOW HIRING: PROMPT WHISPERERS', 'MARS OR BUST', 'YOUR DATA HERE', 'NOT FINANCIAL ADVICE', 'SYNERGY DOWNSHIFT AHEAD', 'PIVOT! PIVOT!', 'DISRUPTING TRAFFIC SINCE 2026'];

/* ================= ITEMS ================= */
/* Item data — the SINGLE source for iconography + wording (#50): the menu
   guide, the held-item slot, the roulette and the pickup toast all read the
   artwork (`img`, generated assets under assets/items/) and `desc` from here,
   so they can never drift apart. Descriptions are modelled on Nintendo's
   official Mario Kart 8 Deluxe item text (structure + brevity), re-themed
   only where the item differs, and every number is reconciled against the
   mechanics constants in useItem/updateKart — the code wins over old copy. */
const ITEMS = {
  boost:    { icon: '💰', img: 'assets/items/boost.webp', name: 'Series A Boost', desc: 'Gives your kart a short boost — about 1.6 s of extra pace.' },
  banana:   { icon: '💧', img: 'assets/items/banana.webp', name: 'Data Leak', desc: 'Drop a slick puddle behind you. Spins any kart that drives over it.' }, // internal id stays 'banana'; everything user-visible is Data Leak
  green:    { icon: '📜', img: 'assets/items/green.webp', name: 'Subpoena', desc: 'Travels in a straight line and spins out the first kart it hits.' },
  red:      { icon: '🐦', img: 'assets/items/red.webp', name: 'Viral Tweet', desc: 'Homes in on the kart in front of you and spins it out.' },
  blue:     { icon: '⚖️', img: 'assets/items/blue.webp', name: 'Antitrust Suit', desc: 'Homes in on the lead kart and explodes. Every kart caught in the blast spins out.' },
  star:     { icon: '⭐', img: 'assets/items/star.webp', name: 'Viral Moment', desc: 'Makes you invincible for 6 s. Your speed is also increased, and any kart you bump will spin out.' },
  lightning:{ icon: '📉', img: 'assets/items/lightning.webp', name: 'Market Crash', desc: 'Strikes every kart in front of you. Rivals shrink and slow down for about 5 s, and drop the item they were holding.' },
  horn:     { icon: '📣', img: 'assets/items/horn.webp', name: 'Spin Team', desc: 'Emits a large sonic blast that destroys nearby items and spins karts beside you. It can also swat an Antitrust Suit out of the air.' },
  bomb:     { icon: '💣', img: 'assets/items/bomb.webp', name: 'Pink Slip', desc: 'Dropped behind you. Explodes after 1.6 s or when a kart hits it — karts caught in the blast spin out.' },
  blooper:  { icon: '📰', img: 'assets/items/blooper.webp', name: 'Smear Campaign', desc: 'Shoots ink at all karts in front of you, obscuring their vision for 2.5 s — and slowing them slightly.' },
  boo:      { icon: '👻', img: 'assets/items/boo.webp', name: 'Insider Trading', desc: 'Your kart turns intangible for 3 s, passing through items and hazards — with a small boost. In addition, you’ll steal an item from a rival.' },
  golden:   { icon: '🏆', img: 'assets/items/golden.webp', name: 'Series F', desc: 'For 5 s, each press of the item button gives you another boost. Keep pressing until the window closes.' },
  bailout:  { icon: '🛟', img: 'assets/items/bailout.webp', name: 'Government Bailout', desc: 'You speed along the course automatically for up to 5.5 s, knocking aside any kart you hit. It ends early when you reach 3rd place.' },
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
let currentSunOffset = [70, 115, 45], currentScript = null; // ART PASS (#47): per-track sun + sky script, set in buildWorld
let curve, samples = [], tangents = [], normals = [], segLen = 1.8, trackCenter = new THREE.Vector3();
let elevArr = [], bankArr = [], rollNormals = []; // TRACK 3D: per-sample authored elevation (m), banking (rad), rolled road normals
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
/* Axis-constrained stick rendering (#49): a stick's drawn shape matches the
   axes it actually controls in the current scheme — a 1D stick renders as a
   track (horizontal pill for steering, vertical pill for throttle/brake) with
   its nub projected onto that axis; only a genuinely 2D stick (Thumbstick
   main: steer X + brake/flick Y) keeps the circle. Input semantics are
   untouched — taps/flicks still read the raw touch; only the drawing is
   constrained. Shapes apply at scheme switch and again at every touch. */
const STICK_AXES = { // [stick-a, stick-b] shape per scheme ('x' | 'y' | '2d' | null = unused)
  buttons: [null, null], stick1: ['2d', null], sticks2: ['x', 'y'], autog: ['x', null], dualstick: ['x', 'y'],
};
const ZONE_AXIS = { steer: 'x', dsteer: 'x', pedal: 'y', dpedal: 'y', main: '2d' };
function shapeStick(el, axis) {
  if (!el) return;
  el.classList.toggle('axis-x', axis === 'x');
  el.classList.toggle('axis-y', axis === 'y');
}
function setTouchScheme(s, silent) {
  if (!TOUCH_SCHEMES.includes(s)) return;
  touchScheme = s;
  try { localStorage.setItem('bk_touch_scheme', s); } catch (e) { }
  document.body.dataset.scheme = s;
  document.querySelectorAll('.scheme-btn').forEach(b => b.classList.toggle('selected', b.dataset.scheme === s));
  stickPointers.clear(); touchAnalog.steer = 0; touchAnalog.throttle = 0; touchAnalog.brake = 0;
  for (const id of ['stick-a', 'stick-b']) { const el = $(id); if (el) { el.style.display = 'none'; el.classList.remove('braking'); } }
  const axes = STICK_AXES[s] || [null, null]; // #49: re-shape the sticks for the new scheme immediately
  shapeStick($('stick-a'), axes[0]); shapeStick($('stick-b'), axes[1]);
  refreshTouchUI();
  updateSchemeHelp(s);
  if (!silent) showToast({ buttons: '🕹️ Touch: Buttons', stick1: '👍 Touch: Thumbstick — hold right side = gas', sticks2: '✌️ Touch: Pedal & Stick', autog: '🚗 Touch: Auto-Gas — just steer!', dualstick: '🕹️ Touch: Dual Stick — left steers, right drives' }[s]);
}
let touchUiSig = '';
function refreshTouchUI() {
  const inRace = gameState !== 'menu' && !$('hud').classList.contains('hidden');
  const touch = isTouchDevice();
  const sig = `${touchScheme}|${inRace}|${touch}|${gameState}`;
  if (sig === touchUiSig) return; touchUiSig = sig;
  // Input-aware HUD layout (Addendum 3): body.touch-ui is present exactly when
  // on-screen controls are rendered. It only gates which control surfaces show
  // now — the HUD layout itself (#48: item slot top-left corner, feed at the
  // top edge) is identical for touch and classic. Scheme switches re-run this,
  // so the controls follow mid-race changes immediately.
  document.body.classList.toggle('touch-ui', touch && inRace);
  $('touch-controls').classList.toggle('hidden', !(touch && inRace && touchScheme === 'buttons'));
  $('scheme-ui').classList.toggle('hidden', !(touch && inRace && touchScheme !== 'buttons'));
  $('stick-layer').style.display = (touch && inRace && touchScheme !== 'buttons') ? 'block' : 'none';
  $('autog-note').classList.toggle('hidden', !(touchScheme === 'autog' && inRace));
}
/* ================= MENU EXPLAINERS (#50) =================
   Difficulty + Control Lab help. Every claim below is read off the code:
   DIFF_MUL scales AI top speed only; the rubber-band in topSpeedOf and the
   position-based rollItem tables are identical in all three modes. Control
   diagrams follow the #49 rule — a stick is drawn with only the axes it
   actually controls (steering-only = horizontal track, throttle = vertical). */
const DIFF_DESCS = [
  'Chill — rival karts run at 90% pace. The item odds and the rubber-banding that keeps the pack close stay exactly the same: same race, gentler field.',
  'Spicy — rivals run at 95.5% pace: the intended fight. Items favour the losers and the pack rubber-bands to stay close, just like every other mode.',
  'Unhinged — rivals run at full 100% pace, with no handicap at all. Only the item table still loves the losers: last place draws the comeback kit, first place gets defence only.',
];
function updateDiffDesc() { const el = $('diff-desc'); if (el) el.textContent = DIFF_DESCS[difficulty]; }
const _st = (x, y, s, size = 12, anchor = 'middle', fill = '#ffffff') => `<text x="${x}" y="${y}" text-anchor="${anchor}" font-family="Fredoka, sans-serif" font-weight="700" font-size="${size}" fill="${fill}">${s}</text>`;
const _hTrack = (cx, cy) => `<rect x="${cx - 52}" y="${cy - 13}" width="104" height="26" rx="13" fill="rgba(255,255,255,.10)" stroke="rgba(255,255,255,.65)" stroke-width="2"/><path d="M ${cx - 44} ${cy} l 9 -6 v 12 z" fill="#ffd900"/><path d="M ${cx + 44} ${cy} l -9 -6 v 12 z" fill="#ffd900"/><circle cx="${cx + 16}" cy="${cy}" r="11" fill="rgba(255,255,255,.55)"/>`;
const _vTrack = (cx, cy) => `<rect x="${cx - 13}" y="${cy - 52}" width="26" height="104" rx="13" fill="rgba(255,255,255,.10)" stroke="rgba(255,255,255,.65)" stroke-width="2"/><path d="M ${cx} ${cy - 44} l 6 9 h -12 z" fill="#ffd900"/><path d="M ${cx} ${cy + 44} l 6 -9 h -12 z" fill="#ffd900"/><circle cx="${cx}" cy="${cy - 16}" r="11" fill="rgba(255,255,255,.55)"/>`;
const _stick2d = (cx, cy) => `<circle cx="${cx}" cy="${cy}" r="37" fill="rgba(255,255,255,.10)" stroke="rgba(255,255,255,.65)" stroke-width="2"/><path d="M ${cx - 26} ${cy} h 52 M ${cx} ${cy - 26} v 52" stroke="rgba(255,217,0,.55)" stroke-width="2" stroke-dasharray="4 4"/><circle cx="${cx + 8}" cy="${cy - 6}" r="13" fill="rgba(255,255,255,.55)"/>`;
const _cbtn = (cx, cy, r, label, fill, size = 10) => `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${fill}" stroke="rgba(255,255,255,.65)" stroke-width="2"/>${_st(cx, cy + size * 0.36, label, size)}`;
const _phone = inner => `<svg viewBox="0 0 340 200" class="scheme-svg" role="img" aria-label="Control layout diagram"><rect x="8" y="8" width="324" height="184" rx="20" fill="#10233f" stroke="#0a0a14" stroke-width="3"/>${inner}</svg>`;
const SCHEME_HELP = {
  buttons: {
    text: 'The classic layout — everything is a button, nothing to drag. Hold ◀ ▶ to steer, hold GAS to drive, BRAKE to slow down or reverse. Drift into corners with DRIFT, fire what you’re holding with ITEM.',
    svg: () => _phone(`${_cbtn(56, 96, 23, '◀', 'rgba(255,255,255,.16)', 15)}${_cbtn(110, 96, 23, '▶', 'rgba(255,255,255,.16)', 15)}${_st(83, 146, 'STEER', 11)}${_cbtn(284, 66, 26, 'GAS', 'rgba(46,160,67,.75)', 12)}${_cbtn(284, 138, 21, 'BRAKE', 'rgba(200,50,50,.65)', 9)}${_cbtn(224, 138, 16, 'DRIFT', 'rgba(255,255,255,.16)', 8)}${_cbtn(224, 66, 16, 'ITEM', 'rgba(255,255,255,.16)', 8)}${_st(170, 186, 'HOLD GAS to drive — everything is a button', 11, 'middle', '#ffd900')}`),
  },
  stick1: {
    text: 'One stick on the right side does it all: hold it for full gas, drag sideways to steer, pull it down to brake (it turns red and buzzes so you can’t brake by accident), and flick up then release to use your item. Tapping the left side of the screen uses the item too.',
    svg: () => _phone(`<rect x="24" y="28" width="102" height="144" rx="12" fill="none" stroke="rgba(255,255,255,.4)" stroke-width="2" stroke-dasharray="6 5"/>${_st(75, 94, 'TAP', 13)}${_st(75, 112, '= ITEM', 13)}${_st(240, 26, 'FLICK ↑ = ITEM', 11.5, 'middle', '#ffd900')}${_stick2d(240, 98)}${_st(240, 152, 'HOLD = GAS · DRAG ◀ ▶ = STEER', 10.5)}${_st(240, 182, 'PULL ↓ = BRAKE', 11.5, 'middle', '#ff8a75')}`),
  },
  sticks2: {
    text: 'Left stick steers, right side is the pedal. Touch down on the right for full gas and keep holding to drive, pull down to brake, flick up to fire your item the moment it crosses. A quick tap on the pedal starts a drift hop — turn the steering stick while it lasts to drift.',
    svg: () => _phone(`${_st(84, 56, 'STEER', 11)}${_hTrack(84, 100)}${_st(84, 148, 'DRAG ◀ ▶', 11)}${_vTrack(262, 100)}${_st(246, 56, 'FLICK ↑ = ITEM', 10.5, 'end', '#ffd900')}${_st(246, 104, 'HOLD = GAS', 10.5, 'end')}${_st(246, 152, 'PULL ↓ = BRAKE', 10.5, 'end', '#ff8a75')}${_st(170, 188, 'TAP the pedal = DRIFT HOP — then steer to drift', 10.5, 'middle', '#ffd900')}`),
  },
  dualstick: {
    text: 'Two sticks: the left one steers (a quick tap on it uses your item), the right one drives. Hold the right stick for gas, quick-tap it for a drift hop, flick up and release for your item, pull down to brake. Lift a thumb for a split second and nothing cuts out — gas and steering latch for a beat, lit gold.',
    svg: () => _phone(`${_st(84, 56, 'STEER', 11)}${_hTrack(84, 100)}${_st(84, 148, 'DRAG ◀ ▶ · TAP = ITEM', 10.5)}${_vTrack(262, 100)}${_st(246, 52, 'FLICK ↑ = ITEM', 10.5, 'end', '#ffd900')}${_st(246, 92, 'HOLD = GAS', 10.5, 'end')}${_st(246, 118, 'TAP = DRIFT HOP', 10.5, 'end')}${_st(246, 156, 'PULL ↓ = BRAKE', 10.5, 'end', '#ff8a75')}${_st(170, 188, 'Brief lift? Gas & steering latch for a beat', 10.5, 'middle', '#ffd900')}`),
  },
  autog: {
    text: 'The kart accelerates on its own — you just steer by dragging anywhere on screen, and tap to use your item (a second finger can tap while the first keeps steering). BRAKE and DRIFT buttons sit in the bottom corners. Smart Steering and Auto-Drift switch on automatically in this mode.',
    svg: () => _phone(`${_st(170, 40, 'GAS IS AUTOMATIC', 14, 'middle', '#7dff8a')}<path d="M 44 96 h 252" stroke="#ffd900" stroke-width="3"/><path d="M 44 96 l 14 -7 v 14 z" fill="#ffd900"/><path d="M 296 96 l -14 -7 v 14 z" fill="#ffd900"/>${_st(170, 80, 'DRAG ANYWHERE = STEER', 12)}${_st(170, 126, 'TAP = ITEM (a 2nd finger works too)', 11)}${_cbtn(120, 162, 16, 'DRIFT', 'rgba(255,255,255,.16)', 8)}${_cbtn(292, 162, 19, 'BRAKE', 'rgba(200,50,50,.65)', 9)}`),
  },
};
function updateSchemeHelp(s) {
  const d = $('scheme-diagram'), t = $('scheme-text');
  if (!d || !t || !SCHEME_HELP[s]) return;
  d.innerHTML = SCHEME_HELP[s].svg();
  t.textContent = SCHEME_HELP[s].text;
}
/* Sticky start panel (#50): racer + track + START, fixed to the bottom of the
   menu so a race can be launched from any scroll position. It lives inside
   #screen-menu, so it hides itself the moment the menu screen hides. */
function updateStickyBar() {
  if (!$('sticky-bar')) return;
  const r = RACERS[selectedRacer], t = TRACKS[selectedTrack];
  const p = portraitOf(selectedRacer), img = $('sb-portrait');
  if (p) { img.src = p; img.style.display = ''; } else img.style.display = 'none';
  $('sb-racer').textContent = r ? r.name : 'No racer picked';
  $('sb-track').textContent = t ? t.name : 'No track picked';
  const btn = $('sb-start'), missing = !r ? 'PICK A RACER' : !t ? 'PICK A TRACK' : null;
  btn.disabled = !!missing;
  btn.textContent = missing || '🏎️ START RACE';
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

/* ================= TRACK 3D: AUTHORED ELEVATION + BANKING =================
   The profiles in TRACKS[].elev / TRACKS[].bank are HAND-AUTHORED design data
   (see docs/track-design-*.md): keyframes [u, value] placed at designed
   corners and sectors for racing reasons. This machinery only interpolates
   them — circular monotone cubic (Fritsch–Carlson), so slopes are continuous
   and heights/banks never overshoot what the designer wrote. A track def
   without keyframes (the not-yet-wired module tracks) samples as flat 0
   until its own design pass authors a profile. */
function profileSampler(keyframes) {
  if (!keyframes || keyframes.length < 2) return () => 0;
  const kf = [...keyframes].sort((a, b) => a[0] - b[0]);
  const xs = [], ys = [];
  for (const [u, v] of kf) { xs.push(u - 1); ys.push(v); }
  for (const [u, v] of kf) { xs.push(u); ys.push(v); }
  for (const [u, v] of kf) { xs.push(u + 1); ys.push(v); }
  const n = xs.length, d = new Array(n - 1), m = new Array(n).fill(0);
  for (let i = 0; i < n - 1; i++) d[i] = (ys[i + 1] - ys[i]) / (xs[i + 1] - xs[i]);
  for (let i = 1; i < n - 1; i++) m[i] = (d[i - 1] + d[i]) / 2;
  for (let i = 0; i < n - 1; i++) { // Fritsch–Carlson limiter: no overshoot past keyframe values
    if (Math.abs(d[i]) < 1e-9) { m[i] = 0; m[i + 1] = 0; continue; }
    if (d[i] > 0) { if (m[i] < 0) m[i] = 0; if (m[i + 1] < 0) m[i + 1] = 0; }
    else { if (m[i] > 0) m[i] = 0; if (m[i + 1] > 0) m[i + 1] = 0; }
    const a = m[i] / d[i], b = m[i + 1] / d[i], s = a * a + b * b;
    if (s > 9) { const t = 3 / Math.sqrt(s); m[i] = t * a * d[i]; m[i + 1] = t * b * d[i]; }
  }
  return (u) => {
    const x = ((u % 1) + 1) % 1;
    let i = 0; while (i < n - 2 && xs[i + 1] <= x) i++;
    const h = xs[i + 1] - xs[i], t = (x - xs[i]) / h, t2 = t * t, t3 = t2 * t;
    return (2 * t3 - 3 * t2 + 1) * ys[i] + (t3 - 2 * t2 + t) * h * m[i] + (-2 * t3 + 3 * t2) * ys[i + 1] + (t3 - t2) * h * m[i + 1];
  };
}
function roadYAt(idx, lateral) { return samples[idx].y + rollNormals[idx].y * lateral; } // road surface height at a sample + lateral offset
function roadYAtPos(pos) { const idx = globalNearest(pos); return roadYAt(idx, lateralAt(pos, idx)); }
function gradeAt(idx) { return (elevArr[wrapIdx(idx + 4)] - elevArr[wrapIdx(idx - 4)]) / (8 * segLen); } // signed slope along travel (+ = uphill)
const _tv = new THREE.Vector3();
function ambientHeight(x, z) { // rolling far terrain: gentle noise that lifts into hills at the horizon
  const d = Math.hypot(x - trackCenter.x, z - trackCenter.z);
  const lift = clamp((d - 240) / 26, 0, 16);
  return Math.sin(x * 0.012 + 1.7) * Math.cos(z * 0.014 - 0.6) * 5 + Math.sin(x * 0.027 - 0.4) * Math.sin(z * 0.021 + 2.1) * 3 + lift;
}
function terrainHeightAt(x, z) { // ground height anywhere: banked road plane extended, blended out to ambient terrain
  _tv.set(x, 0, z);
  const idx = globalNearest(_tv), s = samples[idx], n = normals[idx];
  const d = (x - s.x) * n.x + (z - s.z) * n.z, ad = Math.abs(d);
  const edgeY = s.y + d * rollNormals[idx].y;
  if (ad <= HALF_W + 2.6) return edgeY - 0.12; // tucked just under the road/shoulder strips
  const t = clamp((ad - HALF_W - 2.6) / 34, 0, 1), ts = t * t * (3 - 2 * t);
  return lerp(edgeY - 0.1, ambientHeight(x, z), ts);
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

/* ================= ART PASS (#47) =================
   The "$60 Switch game" layer, built from the mk-reference frame grammar
   (~/workspace/research_notes/mk-reference/ANALYSIS.md): a hero arch you drive
   under every lap, UNBROKEN edge dressing on both sides, a graded sky + colour
   script per track (default midday blue is banned outdoors), oversized toy
   props, paint ON the road, and things in the air. All procedural canvas
   textures — zero external assets, zero build step. */

function artRand(seed) { let a = (seed >>> 0) || 1; return () => { a = (a * 16807) % 2147483647; return (a - 1) / 2147483646; }; }
function artTex(w, h, draw) { // canvas texture with repeat wrapping (game.js canvasTexture clamps)
  const t = canvasTexture(w, h, draw); t.wrapS = t.wrapT = THREE.RepeatWrapping; return t;
}

/* Per-track colour scripts. sun = [x,y,z] offset for the shadow rig (low y =
   long golden shadows); fog is matched to the sky horizon so distance melts
   into the grade; groundTex picks the terrain material story. */
const SKY_SCRIPTS = [
  { top: '#2f66b0', mid: '#79a8dd', horizon: '#ffc182', glow: '#ffe3ae', glowU: 0.74, fog: 0xf2c184, exposure: 1.07, sun: [95, 50, 30], sunCol: 0xffd7a4, sunI: 1.9, hemiSky: 0xa8c2e8, hemiI: 0.38, envI: 0.5, clouds: 'warm', cloudTint: 0xffdfba, groundTex: 'grass', groundBase: '#54863a' }, // 0 Silicon Valley — golden hour
  { top: '#6b4a86', mid: '#c97a4a', horizon: '#ffc37a', glow: '#ffdf9e', glowU: 0.30, fog: 0xe8a06a, exposure: 1.08, sun: [-80, 42, 60], sunCol: 0xffc98f, sunI: 1.8, hemiSky: 0xd9a37c, hemiI: 0.35, envI: 0.55, clouds: 'dust', cloudTint: 0xffc9a0, groundTex: 'sand', sandTint: 'mars' }, // 1 Mars — butterscotch
  { top: '#3d4468', mid: '#7d7391', horizon: '#e8a37c', glow: '#ffc98f', glowU: 0.68, fog: 0xa08aa0, exposure: 1.03, sun: [70, 38, -60], sunCol: 0xffbe8a, sunI: 1.6, hemiSky: 0x8d84a8, hemiI: 0.40, envI: 0.5, clouds: 'warm', cloudTint: 0xd9b8c8, groundTex: 'sand' }, // 2 Datacenter — dusk
  { top: '#2e6fb0', mid: '#7fc4dd', horizon: '#ffd9a0', glow: '#ffedb8', glowU: 0.80, fog: 0xf2d2a0, exposure: 1.10, sun: [85, 44, -40], sunCol: 0xffe0ae, sunI: 1.9, hemiSky: 0xa8d4e8, hemiI: 0.42, envI: 0.6, clouds: 'warm', cloudTint: 0xffe8c8, groundTex: 'sand' }, // 3 International Waters — golden
  { top: '#2e6fd0', mid: '#8fc3ee', horizon: '#ffedb8', glow: '#fff3cf', glowU: 0.22, fog: 0xdceef2, exposure: 1.04, sun: [60, 80, 50], sunCol: 0xfff0d0, sunI: 1.8, hemiSky: 0xbdd9ff, hemiI: 0.45, envI: 0.5, clouds: 'puffy', cloudTint: 0xffffff, groundTex: 'grass', groundBase: '#4c8a3c' }, // 4 White House — fresh morning
  { top: '#070418', mid: '#1c0f3d', horizon: '#57186e', glow: '#ff4fd8', glowU: 0.50, fog: 0x2a1544, exposure: 1.05, sun: [-40, 70, -30], sunCol: 0x9fb4ff, sunI: 0.9, hemiSky: 0x4a3a8a, hemiI: 0.50, envI: 0.6, clouds: 'night', cloudTint: 0x6a5acd, groundTex: 'concrete', groundTint: 0x8f9bb8 }, // 5 Metaverse — neon night
  { top: '#5a6d8c', mid: '#a8a49a', horizon: '#ffc98f', glow: '#ffdfae', glowU: 0.30, fog: 0xbdb2a4, exposure: 1.02, sun: [75, 40, 55], sunCol: 0xffd2a0, sunI: 1.6, hemiSky: 0xb8b4a4, hemiI: 0.42, envI: 0.5, clouds: 'warm', cloudTint: 0xf2ddc0, groundTex: 'grass', groundBase: '#77804e' }, // 6 WeWork — grey-gold dawn
  { top: '#2e1c4e', mid: '#7a3c5e', horizon: '#ff8a4a', glow: '#ffb066', glowU: 0.76, fog: 0x9a6a72, exposure: 1.06, sun: [-90, 30, 40], sunCol: 0xff9a5e, sunI: 1.7, hemiSky: 0x7a5a8a, hemiI: 0.38, envI: 0.5, clouds: 'dust', cloudTint: 0xe8a58a, groundTex: 'sand' }, // 7 Burning Man — dusk
  { top: '#1f7fd0', mid: '#6ec8e8', horizon: '#ffe9b0', glow: '#fff0c0', glowU: 0.18, fog: 0xcfe8dd, exposure: 1.08, sun: [55, 60, -70], sunCol: 0xffeec4, sunI: 1.9, hemiSky: 0xa8e0e8, hemiI: 0.45, envI: 0.55, clouds: 'puffy', cloudTint: 0xffffff, groundTex: 'sand' }, // 8 Bahamas — tropical afternoon
  { top: '#1c66d8', mid: '#5aa7ee', horizon: '#eaf7ff', glow: '#ffffff', glowU: 0.82, fog: 0xcfe4f7, exposure: 1.05, sun: [70, 85, 35], sunCol: 0xfff2d8, sunI: 1.8, hemiSky: 0xbdd9ff, hemiI: 0.45, envI: 0.5, clouds: 'puffy', cloudTint: 0xffffff, groundTex: 'grass', groundBase: '#57a83a' }, // 9 Bliss — richer painted wallpaper sky
  { top: '#05070a', mid: '#0a0d12', horizon: '#141a20', glow: '#000000', glowU: 0.5, fog: 0x0a0d12, fogNear: 40, fogFar: 330, exposure: 1.0, sun: [40, 90, 20], sunCol: 0xbfd0e0, sunI: 1.1, hemiSky: 0x3a4450, hemiI: 0.50, envI: 0.35, clouds: 'none', cloudTint: 0x223044, groundTex: 'concrete', groundTint: 0x2a2e35 }, // 10 Boring Tunnel — dark
  { top: '#2a5fae', mid: '#8ab6dd', horizon: '#ffe3b0', glow: '#ffedb8', glowU: 0.24, fog: 0xdfe9f2, exposure: 1.06, sun: [80, 55, -45], sunCol: 0xffe4b8, sunI: 1.85, hemiSky: 0xaecbea, hemiI: 0.42, envI: 0.5, clouds: 'warm', cloudTint: 0xfff0dd, groundTex: 'concrete', groundTint: 0xe8eef4 }, // 11 Davos — alpine morning (snow)
];

/* Painted equirect sky: vertical grade + sun glow + style clouds, PMREM'd for
   image-based light so the grade IS the lighting mood (replaces the photo
   panoramas and the flat module sky colours). Cached per track. */
const artSkyCache = new Map();
function applyArtSky(trackIdx, sc) {
  if (artSkyCache.has(trackIdx)) { const h = artSkyCache.get(trackIdx); scene.background = h.tex; scene.environment = h.env; if ('environmentIntensity' in scene) scene.environmentIntensity = sc.envI; return; }
  const rnd = artRand(9000 + trackIdx * 131);
  const tex = canvasTexture(1024, 512, (g, w, h) => {
    const grad = g.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, sc.top); grad.addColorStop(0.38, sc.mid); grad.addColorStop(0.5, sc.horizon);
    grad.addColorStop(0.56, sc.mid); grad.addColorStop(1, sc.top);
    g.fillStyle = grad; g.fillRect(0, 0, w, h);
    if (sc.glow !== '#000000') { // low sun / city glow sitting on the horizon
      const gx = sc.glowU * w, gy = h * 0.5;
      const rg = g.createRadialGradient(gx, gy, 0, gx, gy, 230);
      rg.addColorStop(0, sc.glow + 'e6'); rg.addColorStop(0.35, sc.glow + '66'); rg.addColorStop(1, sc.glow + '00');
      g.fillStyle = rg; g.fillRect(0, 0, w, h);
    }
    const blob = (x, y, rx, ry, col, a) => { g.fillStyle = col; g.globalAlpha = a; g.beginPath(); g.ellipse(x, y, rx, ry, 0, 0, 7); g.fill(); g.globalAlpha = 1; };
    if (sc.clouds === 'warm' || sc.clouds === 'dust') {
      const n = sc.clouds === 'warm' ? 34 : 22;
      for (let i = 0; i < n; i++) {
        const x = rnd() * w, y = h * (0.14 + rnd() * 0.33), rx = 40 + rnd() * 110, ry = (sc.clouds === 'warm' ? 9 : 5) + rnd() * 15;
        blob(x, y + ry * 0.5, rx, ry * 0.8, sc.glow, 0.20 + rnd() * 0.14); // lit underside
        blob(x, y, rx, ry, '#ffffff', 0.16 + rnd() * 0.22);
      }
    } else if (sc.clouds === 'puffy') { // cartoon clouds: circle clusters with flat shaded bases (Bliss wallpaper / farm sky)
      for (let i = 0; i < 13; i++) {
        const cx = rnd() * w, cy = h * (0.10 + rnd() * 0.30), s = 0.7 + rnd() * 0.9;
        for (let j = 0; j < 6; j++) blob(cx + (rnd() - 0.5) * 90 * s, cy + (rnd() - 0.5) * 16 * s, (20 + rnd() * 26) * s, (13 + rnd() * 10) * s, '#ffffff', 0.92);
        blob(cx, cy + 13 * s, 52 * s, 9 * s, '#cfe2f5', 0.85);
      }
    } else if (sc.clouds === 'night') {
      for (let i = 0; i < 260; i++) { g.fillStyle = '#ffffff'; g.globalAlpha = 0.25 + rnd() * 0.75; g.fillRect(rnd() * w, rnd() * h * 0.52, rnd() < 0.12 ? 2.4 : 1.3, 1.3); }
      g.globalAlpha = 1;
      for (let i = 0; i < 7; i++) blob(rnd() * w, h * (0.2 + rnd() * 0.28), 60 + rnd() * 90, 8 + rnd() * 10, i % 2 ? '#ff4fd8' : '#36f5ff', 0.07);
    }
  });
  tex.mapping = THREE.EquirectangularReflectionMapping; tex.colorSpace = THREE.SRGBColorSpace;
  const pmrem = new THREE.PMREMGenerator(renderer);
  const envRT = pmrem.fromEquirectangular(tex); pmrem.dispose();
  scene.background = tex; scene.environment = envRT.texture;
  if ('environmentIntensity' in scene) scene.environmentIntensity = sc.envI;
  scene.backgroundBlurriness = 0;
  artSkyCache.set(trackIdx, { tex, env: envRT.texture });
}

/* Grass with mow stripes: tonal patches + blade strokes + alternating mow
   bands. The bands are what the eye reads at chase-camera distance — flat
   noise alone melts to a single colour (the "boring" screenshot). */
function mowGrassTexture(base, seed) {
  return artTex(512, 512, (g, w, h) => {
    const rnd = artRand(seed * 977 + 41);
    g.fillStyle = base; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 30; i++) {
      const x = rnd() * w, y = rnd() * h, r = 30 + rnd() * 120;
      const gr = g.createRadialGradient(x, y, 0, x, y, r);
      const tone = rnd() > 0.5 ? '255,255,220' : '8,40,8';
      gr.addColorStop(0, `rgba(${tone},${0.06 + rnd() * 0.10})`); gr.addColorStop(1, `rgba(${tone},0)`);
      g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill();
    }
    for (let x = 0; x < w; x += 128) { // mow bands (4 per tile)
      g.fillStyle = ((x / 128) % 2) ? 'rgba(255,255,235,0.075)' : 'rgba(0,45,0,0.065)';
      g.fillRect(x, 0, 128, h);
    }
    g.lineWidth = 1.4;
    for (let i = 0; i < 2100; i++) {
      const x = rnd() * w, y = rnd() * h, l = 4 + rnd() * 6;
      g.strokeStyle = rnd() > 0.5 ? 'rgba(255,255,230,0.13)' : 'rgba(0,30,0,0.16)';
      g.beginPath(); g.moveTo(x, y); g.lineTo(x + (rnd() - 0.5) * 3, y - l); g.stroke();
    }
  });
}

/* ---- HERO ARCH (mk8-rainbow): the track name in HUGE letters on a themed
   gantry you drive under every lap. One parametric builder, per-track theme. */
const ARCH_THEMES = [
  { sign: '#14213d', fg: '#ffd94a', pillar: 0x3a4a5a, accent: 0xffd94a, style: 'steel', sub: 'PRESENTED BY GPU GO BRRR, INC.' },
  { sign: '#3a1f14', fg: '#ffb066', pillar: 0x8a4a2a, accent: 0xffcf7a, style: 'gantry', sub: 'OFFICIAL TRACK OF THE MOON BASE' },
  { sign: '#101318', fg: '#59f7ff', pillar: 0x23262c, accent: 0x59f7ff, style: 'rack', sub: 'WATER & POWER BY COOLANT CO.' },
  { sign: '#0d2b45', fg: '#ffe9b0', pillar: 0xe8e2d4, accent: 0xffd94a, style: 'mast', sub: 'NO ANTITRUST IMMUNITY BEYOND THIS POINT' },
  { sign: '#f4f1e8', fg: '#173a6b', pillar: 0xf4f1e8, accent: 0xc8a028, style: 'column', sub: 'PRIVATELY FUNDED (ALLEGEDLY)' },
  { sign: '#160b2e', fg: '#ff4fd8', pillar: 0x241448, accent: 0x36f5ff, style: 'neon', sub: '38 USERS ONLINE — A NEW RECORD' },
  { sign: '#2e2a24', fg: '#ffb03a', pillar: 0x5a5148, accent: 0xffb03a, style: 'timber', sub: 'VALUATION: $47B → $0' },
  { sign: '#241430', fg: '#ff9a3c', pillar: 0x4a3220, accent: 0xff6a3c, style: 'timber', sub: 'DUST • ART • ZERO SHAREHOLDERS' },
  { sign: '#07332e', fg: '#8afff2', pillar: 0x0d5a50, accent: 0xffd94a, style: 'mast', sub: '0% TAX • 100% VIBES' },
  { sign: '#2c5aa0', fg: '#ffffff', pillar: 0x7a4a21, accent: 0xffd94a, style: 'timber', sub: 'NOW WITH 100% MORE HILLS' },
  { sign: '#14161a', fg: '#ffb03a', pillar: 0x2c2f36, accent: 0xff7b1c, style: 'steel', sub: 'IT IS A TUNNEL. THAT IS THE JOKE.' },
  { sign: '#40260f', fg: '#ffe9b0', pillar: 0x6e4a2f, accent: 0xd23b2e, style: 'timber', sub: 'GREAT RESET GRAND PRIX' },
];
function rackFaceTexture() { // server-rack front: dark slots + a constellation of status LEDs
  return canvasTexture(128, 512, (g, w, h) => {
    g.fillStyle = '#14161c'; g.fillRect(0, 0, w, h);
    const rnd = artRand(517);
    for (let y = 8; y < h - 8; y += 22) {
      g.fillStyle = '#1e2129'; g.fillRect(6, y, w - 12, 17);
      for (let x = 12; x < w - 14; x += 11) { if (rnd() < 0.42) { g.fillStyle = ['#59f7ff', '#7dff8a', '#ffb03a'][Math.floor(rnd() * 3)]; g.fillRect(x, y + 6, 4, 4); } }
    }
  });
}
function buildHeroArch(group, tr, trackIdx) {
  const th = ARCH_THEMES[trackIdx] || ARCH_THEMES[0];
  const span = HALF_W * 2 + 7.4, px = HALF_W + 2.4;
  const pilMat = GMAT.flatProp(th.pillar);
  for (const sx of [-1, 1]) {
    const g = new THREE.Group(); g.position.set(sx * px, 0, 0); group.add(g);
    const addP = (geo, mat, x, y, z) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = true; g.add(m); return m; };
    if (th.style === 'column') {
      addP(new THREE.CylinderGeometry(1.45, 1.7, 11.5, 14), pilMat, 0, 5.75, 0);
      addP(new THREE.BoxGeometry(3.7, 0.8, 3.7), pilMat, 0, 11.3, 0);
      addP(new THREE.BoxGeometry(3.9, 0.7, 3.9), pilMat, 0, 0.35, 0);
    } else if (th.style === 'rack') {
      addP(new THREE.BoxGeometry(3.0, 11.5, 2.2), GMAT.flatProp(0x1b1e24), 0, 5.75, 0);
      const face = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 10.8), GMAT.emissiveScreen(0xffffff, { intensity: 0.9, map: rackFaceTexture() }));
      face.position.set(0, 5.75, 1.12); g.add(face);
      const face2 = face.clone(); face2.rotation.y = Math.PI; face2.position.z = -1.12; g.add(face2);
    } else if (th.style === 'mast') {
      addP(new THREE.CylinderGeometry(0.34, 0.46, 11.9, 8), pilMat, 0, 5.95, 0);
      addP(new THREE.BoxGeometry(0.18, 0.18, 3.4), pilMat, 0, 10.6, 0);
      const flagGeo = new THREE.BufferGeometry();
      flagGeo.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0, 2.3, -0.42, 0, 0, -0.85, 0], 3));
      flagGeo.setIndex([0, 1, 2]); flagGeo.computeVertexNormals();
      const flag = new THREE.Mesh(flagGeo, new THREE.MeshStandardMaterial({ color: th.accent, side: THREE.DoubleSide, roughness: 0.8 }));
      flag.position.set(0, 11.9, 0); if (sx < 0) flag.rotation.y = Math.PI; g.add(flag);
    } else if (th.style === 'timber') {
      addP(new THREE.BoxGeometry(2.2, 11.5, 2.2), pilMat, 0, 5.75, 0);
      const brace = addP(new THREE.BoxGeometry(0.5, 6.4, 0.5), pilMat, 0, 3.4, 1.0); brace.rotation.x = 0.5;
      const brace2 = addP(new THREE.BoxGeometry(0.5, 6.4, 0.5), pilMat, 0, 3.4, -1.0); brace2.rotation.x = -0.5;
    } else { // steel / gantry: trussed box pillar
      addP(new THREE.BoxGeometry(2.4, 11.5, 2.4), pilMat, 0, 5.75, 0);
      for (const fy of [2.6, 5.6, 8.6]) addP(new THREE.BoxGeometry(2.6, 0.42, 2.6), GMAT.flatProp(new THREE.Color(th.pillar).multiplyScalar(0.72).getHex()), 0, fy, 0);
      if (th.style === 'neon') { const strip = new THREE.Mesh(new THREE.BoxGeometry(0.4, 11.5, 0.4), GMAT.emissiveScreen(th.accent, { intensity: 1.8 })); strip.position.set(-sx * 1.25, 5.75, 0); g.add(strip); }
    }
  }
  const beam = new THREE.Mesh(new THREE.BoxGeometry(span, 1.0, 1.5), GMAT.flatProp(new THREE.Color(th.pillar).multiplyScalar(0.8).getHex()));
  beam.position.y = 11.35; beam.castShadow = true; group.add(beam);
  // the sign: name in HUGE letters, sponsor line under — emissive so it glows at dusk/night
  const signTex = canvasTexture(2048, 300, (g, w, h) => {
    g.fillStyle = th.sign; g.fillRect(0, 0, w, h);
    g.strokeStyle = th.fg === '#ffffff' ? '#ffd94a' : th.fg; g.lineWidth = 10; g.strokeRect(10, 10, w - 20, h - 20);
    g.lineWidth = 3; g.strokeRect(30, 30, w - 60, h - 60);
    g.textAlign = 'center'; g.textBaseline = 'middle';
    let fs = 178;
    const name = tr.name.toUpperCase();
    do { g.font = `900 ${fs}px "Luckiest Guy", system-ui, sans-serif`; fs -= 8; } while (g.measureText(name).width > w - 190 && fs > 60);
    g.fillStyle = 'rgba(0,0,0,0.4)'; g.fillText(name, w / 2, h / 2 - 22 + 7);
    g.fillStyle = th.fg; g.fillText(name, w / 2, h / 2 - 22);
    g.font = '700 47px system-ui, sans-serif'; g.globalAlpha = 0.88; g.fillText(th.sub, w / 2, h - 58); g.globalAlpha = 1;
  });
  const signSide = GMAT.flatProp(new THREE.Color(th.sign).getHex());
  const signFace = GMAT.emissiveScreen(0xffffff, { intensity: th.style === 'neon' ? 1.5 : 0.85, map: signTex });
  const sign = new THREE.Mesh(new THREE.BoxGeometry(span - 1.2, 3.3, 0.55), [signSide, signSide, signSide, signSide, signFace, signFace]);
  sign.position.y = 9.1; group.add(sign);
  // gold stars on the top corners (mk8-rainbow) — oversized toy accents
  const starMat = new THREE.MeshStandardMaterial({ color: 0xffd94a, emissive: 0xcc9900, emissiveIntensity: 1.15, roughness: 0.35, metalness: 0.4 });
  for (const sx of [-1, 1]) { const st = new THREE.Mesh(new THREE.OctahedronGeometry(1.3), starMat); st.scale.set(1, 1.35, 0.45); st.position.set(sx * (span / 2 - 2.2), 12.6, 0); group.add(st); }
  // pennant string under the beam
  const triGeo = new THREE.BufferGeometry();
  triGeo.setAttribute('position', new THREE.Float32BufferAttribute([-0.44, 0, 0, 0.44, 0, 0, 0, -0.68, 0], 3));
  triGeo.setAttribute('uv', new THREE.Float32BufferAttribute([0, 1, 1, 1, 0.5, 0], 2));
  triGeo.setIndex([0, 1, 2]); triGeo.computeVertexNormals();
  const flags = new THREE.InstancedMesh(triGeo, new THREE.MeshStandardMaterial({ roughness: 0.85, side: THREE.DoubleSide }), 13);
  const m4 = new THREE.Matrix4(), q0 = new THREE.Quaternion(), v1 = new THREE.Vector3(), s1 = new THREE.Vector3(1, 1, 1), cc = new THREE.Color();
  for (let i = 0; i < 13; i++) {
    const t = i / 12, x = -span / 2 + 1.6 + t * (span - 3.2);
    m4.compose(v1.set(x, 10.78 - Math.sin(t * Math.PI) * 0.5, 0), q0, s1); flags.setMatrixAt(i, m4);
    flags.setColorAt(i, cc.set(i % 2 ? 0xffffff : th.accent));
  }
  group.add(flags);
}

/* ---- CONTINUOUS EDGE DRESSING (mk8-farm fences / mkw-water embankment /
   mount-wario red markers): a "riverbank" guiding the eye on BOTH sides, the
   whole lap, no kerb-to-void. Ribbons follow samples + rollNormals, so they
   ride elevation and banking exactly like the road. */
function ribbonGeo(lat, y0, y1) {
  const pos = [], uv = [], idx = [];
  for (let i = 0; i <= N; i++) {
    const s = samples[i % N], rn = rollNormals[i % N];
    const bx = s.x + rn.x * lat, bz = s.z + rn.z * lat, by = s.y + rn.y * lat;
    pos.push(bx, by + y0, bz, bx, by + y1, bz);
    uv.push(i * 0.55, 0, i * 0.55, 1);
    if (i < N) { const a = i * 2; idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geo.setIndex(idx); geo.computeVertexNormals();
  return geo;
}
const EDGE_THEMES = [
  { type: 'glass' }, { type: 'pennant', accent: 0xffcf7a }, { type: 'barrier', col: 0x8f9296, accent: 0x59f7ff },
  { type: 'rail', col: 0xf2ede2 }, { type: 'rail', col: 0xefe9da }, { type: 'neon', accent: 0xff4fd8 },
  { type: 'barrier', col: 0x9a8a70, accent: 0x3a3f45 }, { type: 'pennant', accent: 0xff9a3c }, { type: 'rail', col: 0xdff5ef },
  { type: 'wood', col: 0x7a4a21 }, { type: 'none' }, { type: 'guardrail', col: 0xb9c0c8 },
];
function buildEdgeDressing(trackIdx) {
  const th = EDGE_THEMES[trackIdx] || EDGE_THEMES[0];
  if (th.type === 'none') return;
  const std = (opts) => new THREE.MeshStandardMaterial({ side: THREE.DoubleSide, ...opts });
  const ribbon = (lat, y0, y1, mat, order = 0) => { const m = new THREE.Mesh(ribbonGeo(lat, y0, y1), mat); m.renderOrder = order; scene.add(m); return m; };
  const postGeoH = { glass: 1.15, wood: 1.15, rail: 1.0, guardrail: 0.95, pennant: 1.3 }[th.type];
  for (const side of [-1, 1]) {
    const lat = side * (HALF_W + 1.35);
    if (th.type === 'glass') {
      ribbon(lat, 0.06, 1.02, std({ color: 0xa8d8e8, transparent: true, opacity: 0.30, roughness: 0.08, metalness: 0, envMapIntensity: 1.5, depthWrite: false }), 2);
      ribbon(lat, 1.02, 1.17, std({ color: 0x39434e, roughness: 0.35, metalness: 0.7, envMapIntensity: 1.1 }));
    } else if (th.type === 'wood') {
      ribbon(lat, 0.46, 0.62, std({ color: th.col, roughness: 0.95 }));
      ribbon(lat, 0.90, 1.06, std({ color: th.col, roughness: 0.95 }));
    } else if (th.type === 'rail') {
      ribbon(lat, 0.40, 0.53, std({ color: th.col, roughness: 0.4, metalness: 0.35, envMapIntensity: 0.9 }));
      ribbon(lat, 0.83, 0.97, std({ color: th.col, roughness: 0.4, metalness: 0.35, envMapIntensity: 0.9 }));
    } else if (th.type === 'guardrail') {
      ribbon(lat, 0.48, 0.92, std({ color: th.col, roughness: 0.35, metalness: 0.75, envMapIntensity: 1.1 }));
    } else if (th.type === 'barrier') {
      ribbon(lat, 0.02, 0.76, std({ color: th.col, roughness: 0.95 }));
      const cap = GMAT.emissiveScreen(th.accent, { intensity: trackIdx === 2 ? 1.25 : 0.25 }); cap.side = THREE.DoubleSide;
      ribbon(lat, 0.76, 0.87, cap);
    } else if (th.type === 'neon') {
      ribbon(lat, 0.02, 0.40, std({ color: 0x140b28, roughness: 0.6 }));
      const glow = GMAT.emissiveScreen(side < 0 ? 0xff4fd8 : 0x36f5ff, { intensity: 1.7 }); glow.side = THREE.DoubleSide;
      ribbon(lat, 0.40, 0.53, glow);
    } else if (th.type === 'pennant') {
      ribbon(lat, 0.99, 1.05, std({ color: 0x2e2018, roughness: 0.9 }));
    }
    // posts — instanced, one draw for both sides is handled per-side here (2 draws total)
    if (postGeoH) {
      const step = th.type === 'guardrail' ? 9 : 6;
      const cnt = Math.floor(N / step);
      const posts = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.09, 0.12, postGeoH, 5, 1, true), GMAT.flatProp(th.type === 'glass' ? 0x39434e : (th.col || 0x4a3826)), cnt);
      const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), one = new THREE.Vector3(1, 1, 1), pv = new THREE.Vector3();
      let w = 0;
      for (let i = 0; i < N; i += step) {
        const s = samples[i], rn = rollNormals[i];
        pv.set(s.x + rn.x * lat, s.y + rn.y * lat + postGeoH / 2 - 0.08, s.z + rn.z * lat);
        m4.compose(pv, q, one); posts.setMatrixAt(w++, m4);
      }
      posts.count = w; scene.add(posts);
      if (th.type === 'pennant') { // flags hanging from the rope line (desert pennants / farm bunting)
        const triGeo = new THREE.BufferGeometry();
        triGeo.setAttribute('position', new THREE.Float32BufferAttribute([-0.30, 0, 0, 0.30, 0, 0, 0, -0.52, 0], 3));
        triGeo.setAttribute('uv', new THREE.Float32BufferAttribute([0, 1, 1, 1, 0.5, 0], 2));
        triGeo.setIndex([0, 1, 2]); triGeo.computeVertexNormals();
        const fcnt = Math.floor(N / 12);
        const fl = new THREE.InstancedMesh(triGeo, new THREE.MeshStandardMaterial({ roughness: 0.85, side: THREE.DoubleSide }), fcnt);
        const e = new THREE.Euler(), cc = new THREE.Color();
        w = 0;
        for (let i = 0; i < N; i += 12) {
          const s = samples[i], rn = rollNormals[i];
          pv.set(s.x + rn.x * lat, s.y + rn.y * lat + 0.99, s.z + rn.z * lat);
          q.setFromEuler(e.set(0, headingOf(tangents[i]), 0));
          m4.compose(pv, q, one); fl.setMatrixAt(w, m4);
          fl.setColorAt(w, cc.set(w % 3 === 1 ? 0xffffff : th.accent)); w++;
        }
        fl.count = w; scene.add(fl);
      }
    }
  }
}

/* ---- NEAR-ROAD PROPS: the speed references. Cones / grass tufts / rocks /
   glow cubes / red markers at 0.5–7 m from the kerb — this density at the
   road edge is what makes 40 MPH FEEL fast (mk research P0-5). */
const PROP_KINDS = ['cones', 'rocks', 'cones', 'tufts', 'cones', 'glow', 'cones', 'rocks', 'tufts', 'tufts', null, 'markers'];
function bladeTexture() {
  return artTex(128, 128, (g, w, h) => {
    g.clearRect(0, 0, w, h);
    const rnd = artRand(7331);
    for (let i = 0; i < 13; i++) {
      const x0 = 14 + rnd() * (w - 28), bend = (rnd() - 0.5) * 34, hh = h * (0.55 + rnd() * 0.45);
      g.fillStyle = ['#3f7a28', '#548c33', '#6fae4c', '#2f5a21'][Math.floor(rnd() * 4)];
      g.beginPath();
      g.moveTo(x0 - 4.5, h); g.quadraticCurveTo(x0 + bend * 0.4, h - hh * 0.6, x0 + bend, h - hh);
      g.quadraticCurveTo(x0 + bend * 0.4 + 2, h - hh * 0.55, x0 + 4.5, h); g.fill();
    }
  });
}
function buildNearProps(trackIdx) {
  const kind = PROP_KINDS[trackIdx];
  if (!kind) return;
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), one = new THREE.Vector3(1, 1, 1), pv = new THREE.Vector3();
  const place = (inst, i, lat, yMode, s = 1) => {
    const sm = samples[i], rn = rollNormals[i];
    const x = sm.x + rn.x * lat, z = sm.z + rn.z * lat;
    const y = yMode === 'road' ? sm.y + rn.y * lat : terrainHeightAt(x, z);
    q.setFromEuler(e.set(0, Math.random() * Math.PI * 2, 0));
    pv.set(x, y, z); m4.compose(pv, q, new THREE.Vector3(s, s, s)); inst.setMatrixAt(inst.userData.w++, m4);
  };
  const makeInst = (geo, mat, cap) => { const im = new THREE.InstancedMesh(geo, mat, cap); im.userData.w = 0; scene.add(im); return im; };
  if (kind === 'cones') {
    const coneGeo = new THREE.ConeGeometry(0.42, 1.02, 10); coneGeo.translate(0, 0.51, 0);
    const bandGeo = new THREE.CylinderGeometry(0.295, 0.35, 0.26, 10); bandGeo.translate(0, 0.55, 0);
    const cones = makeInst(coneGeo, GMAT.mattePlastic(0xff6a1c, { roughness: 0.55 }), 130);
    const bands = makeInst(bandGeo, GMAT.mattePlastic(0xf5f2ea, { roughness: 0.5 }), 130);
    for (let i = 4; i < N; i += 7) {
      if (Math.random() < 0.32) continue;
      const lat = (i % 14 < 7 ? -1 : 1) * (HALF_W + rand(2.1, 3.6));
      place(cones, i, lat, 'terrain');
      const src = (cones.userData.w - 1) * 16; // band shares the cone's matrix (both geos carry their own y offset)
      bands.instanceMatrix.array.set(cones.instanceMatrix.array.subarray(src, src + 16), bands.userData.w * 16);
      bands.userData.w++;
    }
    cones.count = cones.userData.w; bands.count = bands.userData.w;
    cones.castShadow = true;
  } else if (kind === 'tufts') {
    const p1 = new THREE.PlaneGeometry(1.15, 0.85); p1.translate(0, 0.4, 0);
    const p2 = p1.clone(); p2.rotateY(Math.PI / 2);
    const tuftGeo = mergeGeos([p1.toNonIndexed(), p2.toNonIndexed()]);
    const cap = trackIdx === 9 ? 260 : 150;
    const tufts = makeInst(tuftGeo, new THREE.MeshStandardMaterial({ map: bladeTexture(), alphaTest: 0.38, side: THREE.DoubleSide, roughness: 1 }), cap);
    for (let i = 2; i < N && tufts.userData.w < cap; i += 4) {
      if (Math.random() < 0.3) continue;
      place(tufts, i, (Math.random() < 0.5 ? -1 : 1) * (HALF_W + rand(1.7, 6.5)), 'terrain', rand(0.8, 1.5));
    }
    tufts.count = tufts.userData.w;
  } else if (kind === 'rocks') {
    const rg = new THREE.IcosahedronGeometry(0.55, 0);
    { const rp = rg.attributes.position, v = new THREE.Vector3();
      for (let i = 0; i < rp.count; i++) { v.fromBufferAttribute(rp, i); const hs = Math.sin(v.x * 12.9898 + v.y * 78.233 + v.z * 37.719) * 43758.5453; v.multiplyScalar(1 + (hs - Math.floor(hs) - 0.5) * 0.5); rp.setXYZ(i, v.x, v.y, v.z); }
      rg.computeVertexNormals(); }
    const rocks = makeInst(rg, GMAT.flatProp(trackIdx === 1 ? 0x7e3b22 : 0x8a5a34), 110);
    for (let i = 3; i < N && rocks.userData.w < 110; i += 8) {
      if (Math.random() < 0.25) continue;
      place(rocks, i, (Math.random() < 0.5 ? -1 : 1) * (HALF_W + rand(2.0, 7.5)), 'terrain', rand(0.5, 1.7));
    }
    rocks.count = rocks.userData.w;
  } else if (kind === 'glow') { // metaverse light cubes lining the plaza kerb
    const geo = new THREE.BoxGeometry(0.46, 0.46, 0.46); geo.translate(0, 0.3, 0);
    const a = makeInst(geo, GMAT.emissiveScreen(0xff4fd8, { intensity: 1.6 }), 48);
    const b = makeInst(geo, GMAT.emissiveScreen(0x36f5ff, { intensity: 1.6 }), 48);
    for (let i = 0; i < N; i += 10) { place(i % 20 ? a : b, i, (i % 20 < 10 ? -1 : 1) * (HALF_W + 1.8), 'road'); }
    a.count = a.userData.w; b.count = b.userData.w;
  } else if (kind === 'markers') { // mount-wario red edge markers for the alpine descent
    const geo = new THREE.CylinderGeometry(0.07, 0.07, 1.15, 6); geo.translate(0, 0.55, 0);
    const mk = makeInst(geo, GMAT.mattePlastic(0xe8402a, { roughness: 0.5 }), 230);
    for (let i = 0; i < N && mk.userData.w < 230; i += 8) {
      place(mk, i, (i % 16 < 8 ? -1 : 1) * (HALF_W + 1.5), 'road');
    }
    mk.count = mk.userData.w;
  }
}

/* ---- ROAD PAINT (mk8-rainbow chevrons / desert ramp paint): the surface
   tells a story — track name painted on the start straight, chevrons poured
   into corner entries, sponsor decals on the straights. Built as short quad
   strips that hug the banked road exactly. */
function quadStripGeo(i0, count, halfW, yOff) {
  const pos = [], uv = [], idx = [];
  for (let j = 0; j <= count; j++) {
    const i = wrapIdx(i0 + j), s = samples[i], rn = rollNormals[i];
    pos.push(s.x + rn.x * halfW, s.y + rn.y * halfW + yOff, s.z + rn.z * halfW, s.x - rn.x * halfW, s.y - rn.y * halfW + yOff, s.z - rn.z * halfW);
    uv.push(1, j / count, 0, j / count); // v grows along travel; canvas top (v=1 under flipY) lands at the far end, so paint reads upright on approach
    if (j < count) { const a = j * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geo.setIndex(idx); geo.computeVertexNormals();
  return geo;
}
function paintTexture(w, h, draw, wear = 900) {
  const t = canvasTexture(w, h, (g) => {
    g.clearRect(0, 0, w, h); draw(g, w, h);
    if (wear) { g.globalCompositeOperation = 'destination-out'; for (let i = 0; i < wear; i++) { g.fillStyle = `rgba(0,0,0,${0.25 + Math.random() * 0.5})`; g.fillRect(Math.random() * w, Math.random() * h, 2 + Math.random() * 7, 1 + Math.random() * 3); } g.globalCompositeOperation = 'source-over'; }
  });
  return t;
}
const SPONSOR_PAINT = ['GPU GO BRRR', 'AGI SOON™', 'EXIT TO LIQUIDITY', 'CLOUD² KART FUEL', 'DISRUPT EVERYTHING', 'MOAT™ COLA', 'PIVOT! PIVOT!', 'NOT FINANCIAL ADVICE'];
function buildRoadPaint(trackIdx, tr) {
  const mat = (map, op) => new THREE.MeshStandardMaterial({ map, transparent: true, opacity: op, roughness: 0.9, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 });
  const add = (geo, material) => { const m = new THREE.Mesh(geo, material); m.renderOrder = 1; scene.add(m); };
  // painted track name across the start straight
  const nameTex = paintTexture(1024, 256, (g, w, h) => {
    g.textAlign = 'center'; g.textBaseline = 'middle';
    let fs = 150; const name = tr.name.toUpperCase();
    do { g.font = `900 ${fs}px "Luckiest Guy", system-ui, sans-serif`; fs -= 7; } while (g.measureText(name).width > w - 60 && fs > 50);
    g.fillStyle = 'rgba(255,255,255,0.92)'; g.fillText(name, w / 2, h / 2);
  });
  add(quadStripGeo(5, 8, 7.4, 0.055), mat(nameTex, 0.92));
  // corner chevrons at the strongest curvature apexes (from tangent swing, so
  // module tracks without authored banking get them too)
  const apexes = [];
  for (let i = 0; i < N; i += 2) {
    const k = Math.abs(angNorm(headingOf(tangents[wrapIdx(i + 6)]) - headingOf(tangents[wrapIdx(i - 6)])));
    if (k > 0.17 && (apexes.length === 0 || i - apexes[apexes.length - 1].i > 90)) apexes.push({ i, k });
    else if (k > 0.17 && apexes.length && i - apexes[apexes.length - 1].i <= 90 && k > apexes[apexes.length - 1].k) apexes[apexes.length - 1] = { i, k };
  }
  apexes.sort((a, b) => b.k - a.k);
  const chevTex = paintTexture(512, 256, (g, w, h) => {
    g.fillStyle = 'rgba(255,244,200,0.95)';
    for (const cx of [0.22, 0.5, 0.78]) for (const cy of [0.30, 0.74]) { // '^' chevrons pointing up-canvas = toward travel
      g.beginPath(); g.moveTo(w * cx - 40, h * cy + 26); g.lineTo(w * cx, h * cy - 26); g.lineTo(w * cx + 40, h * cy + 26); g.lineTo(w * cx, h * cy + 4); g.closePath(); g.fill();
    }
  }, 500);
  for (const a of apexes.slice(0, 5)) add(quadStripGeo(a.i - 9, 6, 8.8, 0.055), mat(chevTex, 0.85));
  // sponsor decals on two straights
  const brand = SPONSOR_PAINT[trackIdx % SPONSOR_PAINT.length];
  const sponTex = paintTexture(1024, 192, (g, w, h) => {
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.font = '900 118px system-ui, sans-serif'; g.fillStyle = 'rgba(255,217,74,0.9)';
    g.fillText(brand, w / 2, h / 2);
  });
  for (const f of [0.34, 0.71]) add(quadStripGeo(Math.floor(f * N), 6, 5.4, 0.055), mat(sponTex, 0.8));
}

/* ---- STUFF IN THE AIR (mkw-water lantern strings / mkw-peach streamers):
   bunting strung OVER the road at sector gates, a sponsor blimp circling
   outdoor tracks, drones over the Metaverse, confetti at the start arch. */
function buildBunting(trackIdx) {
  if (trackIdx === 10 || trackIdx === 2) return; // tunnel is a tube; datacenter strings would clip the hall
  const th = ARCH_THEMES[trackIdx] || ARCH_THEMES[0];
  const sc = SKY_SCRIPTS[trackIdx] || SKY_SCRIPTS[0];
  const poleGeos = [], flagGeos = [];
  const palette = [th.accent, 0xffffff, 0xff5252, new THREE.Color(sc.glow).getHex(), 0xffd94a];
  let ci = 0;
  for (const f of [0.15, 0.31, 0.47, 0.63, 0.79, 0.93]) {
    const idx = Math.floor(f * N), s = samples[idx], rn = rollNormals[idx];
    const tops = [];
    for (const side of [-1, 1]) {
      const lat = side * (HALF_W + 1.0);
      const bx = s.x + rn.x * lat, bz = s.z + rn.z * lat, by = s.y + rn.y * lat;
      const pg = new THREE.CylinderGeometry(0.09, 0.13, 7.3, 6); pg.translate(bx, by + 3.65, bz); poleGeos.push(pg.toNonIndexed()); // mergeGeos drops indices — feed it non-indexed geometry
      tops.push(new THREE.Vector3(bx, by + 7.3, bz));
    }
    const head = headingOf(tangents[idx]);
    for (let j = 0; j <= 10; j++) {
      const t = 0.06 + (j / 10) * 0.88;
      const p = tops[0].clone().lerp(tops[1], t); p.y -= Math.sin(t * Math.PI) * 1.5 + 0.34;
      const fg = new THREE.BufferGeometry(); // triangular pennant — rectangles read as blank signs, triangles read as bunting
      fg.setAttribute('position', new THREE.Float32BufferAttribute([-0.52, 0, 0, 0.52, 0, 0, 0, -0.78, 0], 3));
      fg.setAttribute('normal', new THREE.Float32BufferAttribute([0, 0, 1, 0, 0, 1, 0, 0, 1], 3));
      fg.setAttribute('uv', new THREE.Float32BufferAttribute([0, 1, 1, 1, 0.5, 0], 2));
      const rot = new THREE.Matrix4().makeRotationY(head);
      const col = new THREE.Color(palette[ci++ % palette.length]);
      const carr = new Float32Array(fg.attributes.position.count * 3);
      for (let v = 0; v < fg.attributes.position.count; v++) { carr[v * 3] = col.r; carr[v * 3 + 1] = col.g; carr[v * 3 + 2] = col.b; }
      fg.setAttribute('color', new THREE.BufferAttribute(carr, 3));
      fg.applyMatrix4(rot); fg.translate(p.x, p.y, p.z);
      flagGeos.push(fg.toNonIndexed());
    }
  }
  if (poleGeos.length) { const poles = new THREE.Mesh(mergeGeos(poleGeos), GMAT.flatProp(th.pillar)); scene.add(poles); }
  if (flagGeos.length) { const flags = new THREE.Mesh(mergeGeos(flagGeos), new THREE.MeshStandardMaterial({ vertexColors: true, side: THREE.DoubleSide, roughness: 0.85 })); scene.add(flags); }
}
function buildAirProps(trackIdx) {
  const sc = SKY_SCRIPTS[trackIdx] || SKY_SCRIPTS[0];
  if (trackIdx !== 10) { // confetti fountain at the hero arch (start line celebration, mkw-peach streamers)
    let confT = 0;
    const top = samples[0].clone(); top.y += 10.4;
    const cols = [0xffd94a, 0xff5252, 0x6cf, 0x76b900, 0xffffff, (ARCH_THEMES[trackIdx] || ARCH_THEMES[0]).accent];
    trackAnimators.push((dt) => {
      confT += dt; if (confT < 0.45) return; confT = 0;
      const pk = playerKart();
      if ((pk && pk.pos.distanceTo(samples[0]) < 175) || gameState === 'menu') spawnParticles(top, { count: 5, colors: cols, speed: 2.4, life: 1.6, up: 0.6, gravity: -2.2, spread: 1 });
    });
  }
  if (trackIdx === 10) return;
  if (trackIdx === 5) { // metaverse: patrol drones with neon eyes
    const drones = [];
    for (let i = 0; i < 3; i++) {
      const d = new THREE.Group();
      const body = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.3, 0.95), GMAT.darkMetal({})); d.add(body);
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 8), GMAT.emissiveScreen(i % 2 ? 0x36f5ff : 0xff4fd8, { intensity: 2 })); eye.position.set(0, -0.05, 0.5); d.add(eye);
      for (const [rx, rz] of [[-0.55, -0.55], [0.55, -0.55], [-0.55, 0.55], [0.55, 0.55]]) { const r = new THREE.Mesh(new THREE.CircleGeometry(0.3, 10), GMAT.flatProp(0x22242a)); r.rotation.x = -Math.PI / 2; r.position.set(rx, 0.22, rz); d.add(r); }
      scene.add(d); drones.push(d);
    }
    trackAnimators.push((dt, t) => {
      drones.forEach((d, i) => {
        const a = t * (0.14 + i * 0.045) + i * 2.1, R = 42 + i * 15;
        d.position.set(trackCenter.x + Math.sin(a) * R, 30 + i * 5 + Math.sin(t * 0.9 + i) * 1.6, trackCenter.z + Math.cos(a) * R);
        d.rotation.y = a + Math.PI / 2;
      });
    });
    return;
  }
  // sponsor blimp, circling slowly — the desert/farm frames always have
  // something big and slow in the sky to read distance against
  const blimp = new THREE.Group();
  const bodyGeo = new THREE.CapsuleGeometry(2.7, 7.5, 4, 12); bodyGeo.rotateX(Math.PI / 2);
  const body = new THREE.Mesh(bodyGeo, new THREE.MeshStandardMaterial({ color: trackIdx === 1 ? 0xd96f32 : 0xf2f0ea, roughness: 0.5, envMapIntensity: 0.7 }));
  blimp.add(body);
  const finMat = GMAT.flatProp((ARCH_THEMES[trackIdx] || ARCH_THEMES[0]).accent);
  const finV = new THREE.Mesh(new THREE.BoxGeometry(0.18, 2.6, 1.9), finMat); finV.position.set(0, 0.4, -5.6); blimp.add(finV);
  const finH = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.18, 1.9), finMat); finH.position.set(0, 0, -5.6); blimp.add(finH);
  const gond = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.8, 2.6), GMAT.flatProp(0x2c2f36)); gond.position.y = -2.6; blimp.add(gond);
  const banTex = canvasTexture(1024, 128, (g, w, h) => {
    g.fillStyle = '#14213d'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#ffd94a'; g.font = '900 84px system-ui'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText('AGI SOON™ AIRSHIPS', w / 2, h / 2);
  });
  for (const sx of [-1, 1]) { const bp = new THREE.Mesh(new THREE.PlaneGeometry(9.5, 1.7), GMAT.emissiveScreen(0xffffff, { intensity: 0.7, map: banTex })); bp.position.set(sx * 2.85, -0.4, 0); bp.rotation.y = sx * Math.PI / 2; blimp.add(bp); }
  scene.add(blimp);
  const R = 150 + trackIdx * 7, H = 62 + (trackIdx % 3) * 7, ph = trackIdx * 1.7;
  trackAnimators.push((dt, t) => {
    const a = t * 0.021 + ph;
    blimp.position.set(trackCenter.x + Math.sin(a) * R, H + Math.sin(t * 0.3) * 2.5, trackCenter.z + Math.cos(a) * R);
    const na = a + 0.05;
    blimp.lookAt(trackCenter.x + Math.sin(na) * R, blimp.position.y, trackCenter.z + Math.cos(na) * R);
  });
}

/* Crowd texture for the grandstand tiers: seat colour + a speckle of crowd
   dots — a stand that reads as PEOPLE from the start straight. */
function crowdTexture(base) {
  return canvasTexture(512, 64, (g, w, h) => {
    g.fillStyle = '#' + new THREE.Color(base).getHexString(); g.fillRect(0, 0, w, h);
    const rnd = artRand(base + 7);
    const cols = ['#ffd9a0', '#f2f2f2', '#d23b2e', '#1877f2', '#ffd94a', '#2b2d34', '#76b900', '#ff9ff3'];
    for (let i = 0; i < 650; i++) { g.fillStyle = cols[Math.floor(rnd() * cols.length)]; g.globalAlpha = 0.75 + rnd() * 0.25; g.beginPath(); g.arc(rnd() * w, 6 + rnd() * (h - 12), 1.8 + rnd() * 1.8, 0, 7); g.fill(); }
    g.globalAlpha = 1;
  });
}

let blobTexShared = null;
function blobShadowTexture() { // soft elliptical contact shadow (shared: teardown must not dispose it)
  if (blobTexShared) return blobTexShared;
  const t = canvasTexture(128, 128, (g, w, h) => {
    const gr = g.createRadialGradient(w / 2, h / 2, 4, w / 2, h / 2, w / 2);
    gr.addColorStop(0, 'rgba(0,0,0,0.85)'); gr.addColorStop(0.6, 'rgba(0,0,0,0.45)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
  });
  t.userData.shared = true; blobTexShared = t; return t;
}

/* ================= WORLD BUILDING ================= */
function stripGeometry(halfWidth, y) {
  const pos = [], uv = [], idx = [];
  for (let i = 0; i <= N; i++) {
    const s = samples[i % N], rn = rollNormals[i % N]; // rolled normal: the strip climbs the authored elevation and leans into the authored banking
    pos.push(s.x + rn.x * halfWidth, s.y + rn.y * halfWidth + y, s.z + rn.z * halfWidth, s.x - rn.x * halfWidth, s.y - rn.y * halfWidth + y, s.z - rn.z * halfWidth);
    uv.push(0, i * 0.55, 1, i * 0.55);
    if (i < N) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geo.setIndex(idx); geo.computeVertexNormals();
  return geo;
}

function buildBackdrop(trackIdx) {
  // Distant terrain silhouette: a jagged ridge ring so the horizon is never a
  // flat line, plus ONE signature landmark per live track to orient by
  // (named in docs/track-design-*.md). Pre-hazed colour + fog:false keeps the
  // silhouettes readable from every corner of the lap.
  const tr = TRACKS[trackIdx];
  const col = new THREE.Color(tr.ground).multiplyScalar(0.7).lerp(new THREE.Color(tr.fog), 0.45);
  const mat = new THREE.MeshBasicMaterial({ color: col, side: THREE.DoubleSide, fog: false });
  const SEG = 160, RAD = 655, heights = [], raw = [];
  let seed = (tr.roadSeed || 1) * 7919 + 13;
  const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  for (let i = 0; i < SEG; i++) raw.push(24 + rnd() * 34);
  for (let i = 0; i < SEG; i++) heights.push((raw[(i - 1 + SEG) % SEG] + raw[i] * 2 + raw[(i + 1) % SEG]) / 4);
  const pos = [], idx = [];
  for (let i = 0; i <= SEG; i++) {
    const a = i / SEG * Math.PI * 2, x = trackCenter.x + Math.sin(a) * RAD, z = trackCenter.z + Math.cos(a) * RAD;
    pos.push(x, -6, z, x, heights[i % SEG], z);
    if (i < SEG) { const k = i * 2; idx.push(k, k + 1, k + 2, k + 1, k + 3, k + 2); }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setIndex(idx);
  scene.add(new THREE.Mesh(geo, mat));
  if (trackIdx === 0) { // THE MOTHERSHIP — a vast ring-campus HQ on the NW horizon
    const g = new THREE.Group();
    const ringGeo = new THREE.TorusGeometry(58, 13, 10, 48); ringGeo.rotateX(Math.PI / 2);
    const disc = new THREE.Mesh(ringGeo, mat); disc.position.y = 12; g.add(disc);
    const lidGeo = new THREE.CircleGeometry(58, 40); lidGeo.rotateX(-Math.PI / 2);
    const lid = new THREE.Mesh(lidGeo, mat); lid.position.y = 16; g.add(lid);
    g.position.set(trackCenter.x - 400, ambientHeight(trackCenter.x - 400, trackCenter.z - 330) - 6, trackCenter.z - 330);
    scene.add(g);
  } else if (trackIdx === 1) { // OLYMPUS MONS — a shield volcano with a caldera, NE horizon
    const prof = [[0, 15], [26, 22], [38, 26], [70, 21], [130, 12], [190, 4], [215, 0]].map(p => new THREE.Vector2(p[0], p[1]));
    const m = new THREE.Mesh(new THREE.LatheGeometry(prof, 40), mat);
    m.position.set(trackCenter.x + 430, -3, trackCenter.z - 360);
    scene.add(m);
  }
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
  currentDef = tr;
  const preset = applyFog(scene, tr.fogKey || 'valleyDay'); // fog colour matched to the sky horizon
  if (!tr.fogKey && tr.fog !== undefined) { scene.fog.color.set(tr.fog); scene.fog.near = tr.fogNear ?? 210; scene.fog.far = tr.fogFar ?? 640; } // module tracks carry authored fog instead of a preset key
  // ART PASS (#47): per-track graded sky + colour script drives fog, exposure,
  // sun angle/colour and IBL — see SKY_SCRIPTS. Default midday blue is banned.
  const script = SKY_SCRIPTS[trackIdx] || SKY_SCRIPTS[0];
  currentScript = script; currentSunOffset = script.sun;
  scene.fog.color.set(script.fog);
  if (script.fogNear) { scene.fog.near = script.fogNear; scene.fog.far = script.fogFar; }
  renderer.toneMappingExposure = script.exposure ?? preset.exposure;
  const { sun, hemi } = setupLights(scene, { shadowMapSize: window.innerWidth < 700 ? 1024 : 2048, hemiGround: tr.ground, sunPosition: script.sun, sunColor: script.sunCol, sunIntensity: script.sunI, hemiSky: script.hemiSky, hemiIntensity: script.hemiI });
  sunLight = sun; hemiLight = hemi;
  applyArtSky(trackIdx, script);
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

  // TRACK 3D: bake the authored profiles into per-sample arrays. samples carry
  // the elevation; rollNormals are the road's cross-slope direction (the flat
  // normal rolled around the 3D tangent by the authored bank angle).
  const elevFn = profileSampler(tr.elev), bankFn = profileSampler(tr.bank);
  elevArr = []; bankArr = [];
  for (let i = 0; i < N; i++) { const y = elevFn(i / N); elevArr.push(y); samples[i].y = y; bankArr.push(bankFn(i / N) * Math.PI / 180); }
  for (let p = 0; p < 2; p++) { // gentle circular smoothing: authored peaks stay, transitions breathe
    const src = [...bankArr];
    for (let i = 0; i < N; i++) { let s = 0; for (let d = -4; d <= 4; d++) s += src[wrapIdx(i + d)]; bankArr[i] = s / 9; }
  }
  rollNormals = [];
  for (let i = 0; i < N; i++) {
    const t3 = samples[wrapIdx(i + 1)].clone().sub(samples[wrapIdx(i - 1)]).normalize();
    rollNormals.push(normals[i].clone().applyAxisAngle(t3, bankArr[i]));
  }

  const mars = trackIdx === 1;
  // ART PASS: terrain material story per track script — mow-striped grass,
  // sand, or tinted concrete (snow/plaza/tunnel floor)
  let gTex;
  if (script.groundTex === 'sand') { gTex = GTEX.sandTexture({ tint: script.sandTint || 'sand' }); gTex.repeat.set(52, 52); }
  else if (script.groundTex === 'concrete') { gTex = GTEX.concreteTexture(); gTex.repeat.set(52, 52); }
  else { gTex = mowGrassTexture(script.groundBase || '#4f8a38', (tr.roadSeed || 1) * 31 + trackIdx); gTex.repeat.set(56, 56); }
  const groundGeo = new THREE.PlaneGeometry(1520, 1520, 136, 136);
  groundGeo.rotateX(-Math.PI / 2);
  { const pa = groundGeo.attributes.position; for (let i = 0; i < pa.count; i++) pa.setY(i, terrainHeightAt(pa.getX(i), pa.getZ(i))); groundGeo.computeVertexNormals(); }
  const ground = new THREE.Mesh(groundGeo, new THREE.MeshStandardMaterial({ map: gTex, color: script.groundTint ?? 0xffffff, roughness: 1 }));
  ground.receiveShadow = true; scene.add(ground);
  buildBackdrop(trackIdx);

  const shTex = mars ? GTEX.sandTexture({}) : GTEX.concreteTexture();
  shTex.repeat.set(1, 60);
  const shoulder = new THREE.Mesh(stripGeometry(HALF_W + 2.6, 0.0), tr.shoulder !== undefined ? new THREE.MeshStandardMaterial({ color: tr.shoulder, roughness: 0.95 }) : new THREE.MeshStandardMaterial({ map: shTex, roughness: 0.95 }));
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
  buildHeroArch(startGroup, tr, trackIdx); // ART PASS: themed hero arch replaces the pole + banner gantry
  scene.add(startGroup);

  buildScenery(trackIdx);
  trackFx = null; lastPlayerLap = 1;
  if (TRACK_DRESSING[trackIdx]) trackFx = TRACK_DRESSING[trackIdx](sceneryContext()) || null;
  // ART PASS (#47): edge dressing, near-road props, road paint, bunting, air
  // props — run for EVERY track (module tracks included) after their own
  // dressing, so trackAnimators pushes land after any module reset.
  buildEdgeDressing(trackIdx);
  buildNearProps(trackIdx);
  buildRoadPaint(trackIdx, tr);
  buildBunting(trackIdx);
  buildAirProps(trackIdx);
  buildItemBoxes();
  currentField.forEach(ri => scene.add(makeKart(ri, ri === selectedRacer).mesh));
  initParticles();
  resetWFX();
  computeMinimapBounds();
  placeGrid();
}

function scatterPos(minLat, maxLat) {
  const i = Math.floor(Math.random() * N), s = samples[i], n = normals[i];
  const lat = (Math.random() < 0.5 ? -1 : 1) * rand(minLat, maxLat);
  const x = s.x + n.x * lat, z = s.z + n.z * lat;
  return new THREE.Vector3(x, terrainHeightAt(x, z), z); // props sit on the real terrain, never floating/sunk
}

/* Building facades: drawn window grids — a lit-window emissive layer over a
   glass/concrete base, two variants so towers don't read as one repeated box. */
function facadeMaterial(base, win, litRatio) {
  const cols = 8, rows = 12;
  const litGrid = Array.from({ length: cols * rows }, () => Math.random() < litRatio); // one pattern, both maps
  const draw = (litOnly) => (g, w, h) => {
    g.fillStyle = litOnly ? '#000000' : base; g.fillRect(0, 0, w, h);
    const cw = w / cols, ch = h / rows;
    for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
      const lit = litGrid[y * cols + x];
      if (litOnly) { if (lit) { g.fillStyle = '#ffc978'; g.fillRect(x * cw + 3, y * ch + 3, cw - 6, ch - 6); } }
      else { g.fillStyle = lit ? '#ffd9a0' : win; g.fillRect(x * cw + 3, y * ch + 3, cw - 6, ch - 6); }
    }
  };
  const map = canvasTexture(256, 384, draw(false));
  const emissiveMap = canvasTexture(256, 384, draw(true));
  return new THREE.MeshStandardMaterial({ map, emissiveMap, emissive: 0xffb765, emissiveIntensity: 0.55, roughness: 0.32, metalness: 0.25, envMapIntensity: 0.9 });
}
function buildScenery(trackIdx) {
  const modBuild = TRACK_MODULES[trackIdx];
  if (modBuild) { trackAnimators = []; modBuild(sceneryContext()); return; } // Batch 3: module ships its own full dressing (own signage/set piece/sky)
  const mars = trackIdx === 1;
  const tr = TRACKS[trackIdx];
  // trees (valley) or rocks (mars) — instanced; module tracks bring their own dressing, so the valley branch is track-0 only
  const COUNT = trackIdx === 0 ? 240 : 140; // ART PASS: denser, clustered planting on the valley (below)
  if (tr.buildDressing) {
    tr.buildDressing(sceneryContext()); // Batch 2 dressing; shared billboards/grandstand/clouds below still run
  } else if (trackIdx === 0) {
    // trees: tapered trunk + a 3-blob foliage cluster (merged icosahedra), per-instance green variation
    const trunkM = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.3, 0.52, 2.9, 7), GMAT.flatProp(0x7a4a21), COUNT);
    const b1 = new THREE.IcosahedronGeometry(1.95, 0); b1.translate(0, 4.9, 0);
    const b2 = new THREE.IcosahedronGeometry(1.4, 0); b2.translate(1.1, 3.8, 0.35);
    const b3 = new THREE.IcosahedronGeometry(1.25, 0); b3.translate(-1.05, 4.0, -0.4);
    const leafM = new THREE.InstancedMesh(mergeGeos([b1, b2, b3]), GMAT.flatProp(0xffffff), COUNT);
    const m = new THREE.Matrix4(), e = new THREE.Euler(), q = new THREE.Quaternion(), sc = new THREE.Vector3(), col = new THREE.Color();
    // ART PASS: groves, not confetti — cluster centres near the road (where the
    // camera looks), 2–5 sculpted canopy trees per grove, every 5th tree a
    // 1.45× hero (mk8-farm's oversized round tree). Guard keeps groves off the road.
    const spots = [];
    for (let c = 0; c < 46 && spots.length < COUNT; c++) {
      const ctr = c < 16 ? scatterPos(HALF_W + 3, HALF_W + 16) : scatterPos(HALF_W + 8, HALF_W + 60);
      const nIn = c < 16 ? 2 + Math.floor(Math.random() * 2) : 3 + Math.floor(Math.random() * 3);
      for (let j = 0; j < nIn && spots.length < COUNT; j++) {
        const v = new THREE.Vector3(ctr.x + rand(-6.5, 6.5), 0, ctr.z + rand(-6.5, 6.5));
        const ni = globalNearest(v), la = lateralAt(v, ni);
        if (Math.abs(la) < HALF_W + 3) v.addScaledVector(normals[ni], (HALF_W + 3 - Math.abs(la)) * Math.sign(la || 1));
        v.y = terrainHeightAt(v.x, v.z);
        spots.push(v);
      }
    }
    while (spots.length < COUNT) spots.push(scatterPos(HALF_W + 7, HALF_W + 62));
    for (let i = 0; i < COUNT; i++) {
      const p = spots[i], s = rand(0.8, 1.7) * (i % 5 === 0 ? 1.45 : 1);
      q.setFromEuler(e.set(rand(-0.05, 0.05), Math.random() * Math.PI * 2, rand(-0.05, 0.05)));
      sc.set(s, s * rand(0.9, 1.15), s);
      m.compose(new THREE.Vector3(p.x, p.y + 1.45 * s, p.z), q, sc); trunkM.setMatrixAt(i, m);
      m.compose(new THREE.Vector3(p.x, p.y, p.z), q, sc); leafM.setMatrixAt(i, m);
      leafM.setColorAt(i, col.setHSL(0.29 + Math.random() * 0.04, 0.5, 0.24 + Math.random() * 0.13));
    }
    trunkM.castShadow = leafM.castShadow = true; scene.add(trunkM, leafM);
    // office buildings — three facade variants + rooftop props (AC units, water towers, antennas)
    const towerMats = [GMAT.metalPanels({ repeat: 2 }), facadeMaterial('#2c3844', '#7fa3bd', 0.16), facadeMaterial('#9aa3ab', '#33506e', 0.08)];
    const acGeo = new THREE.BoxGeometry(2.6, 1.1, 2.0), acMat = GMAT.flatProp(0x8d949c);
    const tankGeo = new THREE.CylinderGeometry(1.5, 1.5, 3.2, 10), tankRoofGeo = new THREE.ConeGeometry(1.8, 1.2, 10), tankMat = GMAT.flatProp(0x6e4a2f);
    const antGeo = new THREE.CylinderGeometry(0.07, 0.12, 7, 5), antMat = GMAT.flatProp(0x33373d);
    for (let i = 0; i < 24; i++) {
      const p = scatterPos(HALF_W + 42, HALF_W + 95), hgt = rand(14, 46);
      const bw = rand(9, 18), bd = rand(9, 18);
      const b = new THREE.Mesh(new THREE.BoxGeometry(bw, hgt, bd), towerMats[i % 3]);
      b.position.set(p.x, p.y + hgt / 2 - 1.5, p.z); b.rotation.y = Math.random() * Math.PI; scene.add(b);
      const roof = new THREE.Group(); roof.position.set(p.x, p.y + hgt - 1.5, p.z); roof.rotation.y = b.rotation.y; scene.add(roof);
      if (i % 5 === 0) { const t = new THREE.Mesh(tankGeo, tankMat); t.position.set(bw * 0.22, 1.6, 0); roof.add(t); const tr = new THREE.Mesh(tankRoofGeo, tankMat); tr.position.set(bw * 0.22, 3.8, 0); roof.add(tr); }
      else if (i % 2 === 0) { const ac = new THREE.Mesh(acGeo, acMat); ac.position.set(-bw * 0.2, 0.55, bd * 0.15); ac.castShadow = true; roof.add(ac); }
      if (hgt > 30 && i % 3 === 0) { const an = new THREE.Mesh(antGeo, antMat); an.position.set(bw * 0.3, 3.5, -bd * 0.25); roof.add(an); }
    }
  } else if (mars) {
    // rocks: noise-displaced icosahedra (position-hash displacement — shared verts move together, no cracks)
    const rockGeo = new THREE.IcosahedronGeometry(1.7, 1);
    { const rp = rockGeo.attributes.position, v = new THREE.Vector3();
      for (let i = 0; i < rp.count; i++) { v.fromBufferAttribute(rp, i); const hsh = Math.sin(v.x * 12.9898 + v.y * 78.233 + v.z * 37.719) * 43758.5453; v.multiplyScalar(1 + (hsh - Math.floor(hsh) - 0.5) * 0.55); rp.setXYZ(i, v.x, v.y, v.z); }
      rockGeo.computeVertexNormals(); }
    const rockM = new THREE.InstancedMesh(rockGeo, GMAT.flatProp(0x7e3b22), COUNT);
    const m = new THREE.Matrix4(), e = new THREE.Euler(), q = new THREE.Quaternion(), sc = new THREE.Vector3();
    for (let i = 0; i < COUNT; i++) {
      const p = scatterPos(HALF_W + 6, HALF_W + 70), s = rand(0.5, 2.6);
      q.setFromEuler(e.set(Math.random() * 3, Math.random() * 3, Math.random() * 3)); sc.set(s, s * rand(0.6, 1), s);
      m.compose(new THREE.Vector3(p.x, p.y + 0.6 * s - 0.4, p.z), q, sc); rockM.setMatrixAt(i, m);
    }
    rockM.castShadow = true; scene.add(rockM);
    for (let i = 0; i < 7; i++) { // mesas — jittered slabs, not clean boxes
      const p = scatterPos(HALF_W + 70, HALF_W + 130), hgt = rand(10, 24);
      const mg = new THREE.BoxGeometry(rand(30, 60), hgt, rand(24, 44), 3, 1, 3);
      const mp = mg.attributes.position, v = new THREE.Vector3();
      for (let j = 0; j < mp.count; j++) { v.fromBufferAttribute(mp, j); const hsh = Math.sin(v.x * 5.13 + v.z * 9.71) * 24634.63; const n = (hsh - Math.floor(hsh) - 0.5) * 2.4; mp.setXYZ(j, v.x + n, v.y, v.z + n * 0.7); }
      mg.computeVertexNormals();
      const mesa = new THREE.Mesh(mg, GMAT.flatProp(0x93482a));
      mesa.position.set(p.x, p.y + hgt / 2 - 2, p.z); scene.add(mesa);
    }
    // ART PASS: near-road rock spires — the desert frame's layered silhouettes brought close to the racing line
    for (let i = 0; i < 9; i++) {
      const p = scatterPos(HALF_W + 6, HALF_W + 26), hgt = rand(6, 12);
      const sg = new THREE.ConeGeometry(rand(1.8, 3.0), hgt, 6);
      const sp2 = sg.attributes.position, v2 = new THREE.Vector3();
      for (let j = 0; j < sp2.count; j++) { v2.fromBufferAttribute(sp2, j); const hs = Math.sin(v2.x * 9.3 + v2.z * 14.7) * 24634.63; const nn = (hs - Math.floor(hs) - 0.5) * 0.8; sp2.setXYZ(j, v2.x + nn, v2.y, v2.z + nn * 0.6); }
      sg.computeVertexNormals();
      const spire = new THREE.Mesh(sg, GMAT.flatProp(0x8a4226));
      spire.position.set(p.x, p.y + hgt / 2 - 0.5, p.z); scene.add(spire);
    }
    // rocket prop near the start
    const rp = samples[0].clone().add(normals[0].clone().multiplyScalar(HALF_W + 22));
    rp.y = terrainHeightAt(rp.x, rp.z) - 0.3;
    const rocket = new THREE.Group();
    const body = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 2.2, 11, 14), GMAT.flatProp(0xf2f2f2)); body.position.y = 5.5; rocket.add(body);
    const tip = new THREE.Mesh(new THREE.ConeGeometry(2.2, 4, 14), GMAT.chrome({ color: 0xd23b2e, roughness: 0.3 })); tip.position.y = 13; rocket.add(tip);
    for (let a = 0; a < 3; a++) { const fin = new THREE.Mesh(new THREE.BoxGeometry(0.3, 3.4, 1.8), GMAT.flatProp(0xd23b2e)); const ang = a / 3 * Math.PI * 2; fin.position.set(Math.sin(ang) * 2.4, 1.6, Math.cos(ang) * 2.4); fin.rotation.y = ang; rocket.add(fin); }
    rocket.position.copy(rp); scene.add(rocket);
  }
  // joke billboards
  const BB = tr.billboards || BILLBOARDS;
  BB.forEach((text, i) => {
    const idx = Math.floor(i / BB.length * N + N * 0.06) % N;
    const side = i % 2 ? 1 : -1, s = samples[idx], n = normals[idx];
    const g = new THREE.Group();
    const bx = s.x + n.x * side * (HALF_W + 9), bz = s.z + n.z * side * (HALF_W + 9);
    g.position.set(bx, terrainHeightAt(bx, bz) - 0.3, bz);
    g.lookAt(s.x, s.y + 1.5, s.z);
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
  const gx = s.x + n.x * (HALF_W + 17), gz = s.z + n.z * (HALF_W + 17);
  stand.position.set(gx, terrainHeightAt(gx, gz) - 0.3, gz);
  stand.lookAt(s.x, s.y + 1, s.z);
  const seatCols = tr.standColors || [0xd23b2e, 0xf2f2f2, 0x1877f2, 0xffd94a];
  for (let r = 0; r < 4; r++) { // ART PASS: crowd-speckled tiers, 1.25× wider — a stand full of people, not coloured benches
    const tier = new THREE.Mesh(new THREE.BoxGeometry(42, 1.6, 3.4), new THREE.MeshStandardMaterial({ map: crowdTexture(seatCols[r % 4]), roughness: 0.92 }));
    tier.position.set(0, 1 + r * 1.7, -r * 3); stand.add(tier);
  }
  const roof = new THREE.Mesh(new THREE.BoxGeometry(44, 0.5, 15), GMAT.flatProp(0x22242a));
  roof.position.set(0, 9.6, -4.5); stand.add(roof);
  scene.add(stand);
  // clouds — soft billboard sprites (gfx cloud texture), drifting in animate()
  if (!tr.noClouds) {
    const cloudTex = GTEX.cloudSprite();
    for (let i = 0; i < 14; i++) {
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: cloudTex, transparent: true, opacity: 0.85, depthWrite: false, color: currentScript ? currentScript.cloudTint : 0xffffff })); // ART PASS: clouds take the sky script's grade
      sp.scale.set(rand(26, 40), rand(10, 15), 1);
      sp.position.set(rand(-520, 520), rand(75, 125), rand(-520, 520));
      clouds.push(sp); scene.add(sp);
    }
  }
}

function buildItemBoxes() {
  const tex = boxTexture();
  const shellGeo = new RoundedBoxGeometry(2.5, 2.5, 2.5, 3, 0.32);
  const coreGeo = new RoundedBoxGeometry(1.6, 1.6, 1.6, 2, 0.22);
  const shellMat = GMAT.glass({ color: 0xffc46b, opacity: 0.38, roughness: 0.12 }); // translucent amber shell…
  const coreMat = new THREE.MeshStandardMaterial({ map: tex, emissive: 0xcc8800, emissiveIntensity: 1.6, roughness: 0.4, transparent: true }); // …glowing "?" core inside (bloom bait); transparent so the ghost-in can fade it
  const fractions = [0.10, 0.27, 0.44, 0.61, 0.78, 0.93];
  for (const f of fractions) {
    const idx = Math.floor(f * N);
    for (const lat of [-7.5, -2.5, 2.5, 7.5]) {
      const s = samples[idx], n = normals[idx];
      const mesh = new THREE.Group();
      const shellM = shellMat.clone(), coreM = coreMat.clone(); // per-box clones — the respawn ghost-in fades ONE box, so its materials can't be shared
      mesh.add(new THREE.Mesh(shellGeo, shellM));
      mesh.add(new THREE.Mesh(coreGeo, coreM));
      const baseY = roadYAt(idx, lat) + 1.7; // boxes float over the road surface, banking and all
      mesh.position.set(s.x + n.x * lat, baseY, s.z + n.z * lat);
      scene.add(mesh);
      itemBoxes.push({ mesh, idx, baseY, active: true, respawnT: 0, phase: Math.random() * 6, setFade: o => { shellM.opacity = 0.38 * o; coreM.opacity = o; } }); // setFade: ghost-in/reset/pickup drive this instead of a single mesh.material (glass group has two materials)
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
/* Kart hull: an extruded plan-view outline (tapered nose, flared pods, rounded
   rear) with a bevelled edge — reads as a sculpted body, not stacked boxes. */
function hullGeometry() {
  const s = new THREE.Shape();
  s.moveTo(0, 2.42);
  s.bezierCurveTo(0.55, 2.42, 0.78, 2.18, 0.86, 1.72);
  s.bezierCurveTo(0.94, 1.2, 1.13, 0.75, 1.16, 0.1);
  s.bezierCurveTo(1.18, -0.6, 1.14, -1.25, 1.02, -1.66);
  s.bezierCurveTo(0.94, -1.9, 0.5, -1.98, 0, -1.98);
  s.bezierCurveTo(-0.5, -1.98, -0.94, -1.9, -1.02, -1.66);
  s.bezierCurveTo(-1.14, -1.25, -1.18, -0.6, -1.16, 0.1);
  s.bezierCurveTo(-1.13, 0.75, -0.94, 1.2, -0.86, 1.72);
  s.bezierCurveTo(-0.78, 2.18, -0.55, 2.42, 0, 2.42);
  const geo = new THREE.ExtrudeGeometry(s, { depth: 0.34, bevelEnabled: true, bevelThickness: 0.11, bevelSize: 0.09, bevelSegments: 2, curveSegments: 7, steps: 1 });
  geo.rotateX(Math.PI / 2); // shape +Y → world +Z (forward); extrusion → down, so translate up
  geo.translate(0, 0.75, 0);
  return geo; // occupies y 0.30..0.86 — ground clearance below, cockpit deck on top
}
/* Tyre: a lathed profile (rounded shoulders, sidewall step) — a real tyre
   silhouette instead of a plain cylinder. Rim face texture drawn once per kart. */
function tyreGeometry(radius, width) {
  const p = [[0.58, -0.5], [0.86, -0.48], [0.97, -0.33], [1.0, -0.12], [1.0, 0.12], [0.97, 0.33], [0.86, 0.48], [0.58, 0.5]]
    .map(([rr, yy]) => new THREE.Vector2(rr * radius, yy * width));
  const geo = new THREE.LatheGeometry(p, 18);
  geo.rotateZ(Math.PI / 2); // lathe axis Y → axle axis X
  return geo;
}
function rimFaceTexture() {
  return canvasTexture(128, 128, (g) => {
    g.fillStyle = '#26282e'; g.beginPath(); g.arc(64, 64, 62, 0, 7); g.fill();
    g.fillStyle = '#c8ccd4';
    for (let i = 0; i < 5; i++) { const a = i / 5 * Math.PI * 2; g.save(); g.translate(64, 64); g.rotate(a); g.fillRect(-7, -56, 14, 40); g.restore(); }
    g.fillStyle = '#3a3d44'; g.beginPath(); g.arc(64, 64, 17, 0, 7); g.fill();
    g.fillStyle = '#e8b400'; g.beginPath(); g.arc(64, 64, 8, 0, 7); g.fill();
  });
}
function makeKart(racerIdx, isPlayer) {
  const r = RACERS[racerIdx];
  const root = new THREE.Group();          // position + heading
  const tilt = new THREE.Group(); root.add(tilt); // body lean
  { // ART PASS (#47): strong contact shadow — a soft blob glued under every kart so it sits IN the world, not on it
    const blob = new THREE.Mesh(new THREE.PlaneGeometry(3.7, 4.9), new THREE.MeshBasicMaterial({ map: blobShadowTexture(), transparent: true, opacity: 0.42, depthWrite: false }));
    blob.rotation.x = -Math.PI / 2; blob.position.y = 0.06; blob.renderOrder = 1; root.add(blob);
  }
  const bodyMat = GMAT.kartPaint(r.color); // clearcoat paint — the single biggest visual jump (gfx/materials.js)
  const darkMat = GMAT.mattePlastic(new THREE.Color(r.color).multiplyScalar(0.55).getHex());
  const blackMat = GMAT.mattePlastic(0x191b20);
  const suitMat = racerIdx === 4 ? GMAT.mattePlastic(r.suit, { roughness: 0.42 }) : GMAT.mattePlastic(r.suit); // Jensen's leather gets a sheen
  const add = (geo, mat, x, y, z, parent = tilt) => { const ms = new THREE.Mesh(geo, mat); ms.position.set(x, y, z); ms.castShadow = true; parent.add(ms); return ms; };

  /* ---- kart body ---- */
  add(hullGeometry(), bodyMat, 0, 0, 0);                                                        // sculpted hull
  const cowl = add(new THREE.SphereGeometry(0.62, 18, 12), bodyMat, 0, 0.72, 1.62);              // nose cowl
  cowl.scale.set(1.0, 0.52, 1.5);
  add(new RoundedBoxGeometry(0.5, 0.07, 1.15, 2, 0.03), GMAT.mattePlastic(0xf2f2f2), 0, 1.04, 1.55); // nose stripe
  add(new RoundedBoxGeometry(2.34, 0.09, 0.52, 2, 0.04), blackMat, 0, 0.36, 2.18);               // front wing
  add(new RoundedBoxGeometry(0.07, 0.3, 0.5, 2, 0.03), blackMat, -1.14, 0.46, 2.18);              // wing endplates
  add(new RoundedBoxGeometry(0.07, 0.3, 0.5, 2, 0.03), blackMat, 1.14, 0.46, 2.18);
  for (const sx of [-1, 1]) {                                                                    // sidepods + intakes
    const pod = add(new THREE.CapsuleGeometry(0.3, 0.95, 3, 10), darkMat, sx * 1.06, 0.56, -0.25);
    pod.rotation.x = Math.PI / 2;
    add(new RoundedBoxGeometry(0.34, 0.16, 0.5, 2, 0.05), blackMat, sx * 1.08, 0.86, 0.18);
  }
  add(new RoundedBoxGeometry(1.34, 0.12, 1.6, 2, 0.05), blackMat, 0, 0.88, -0.5);                // cockpit tub
  const coaming = add(new THREE.TorusGeometry(0.68, 0.085, 8, 22), darkMat, 0, 0.94, -0.52);     // cockpit rim
  coaming.rotation.x = Math.PI / 2; coaming.scale.set(1, 1.28, 1);
  const seatBack = add(new RoundedBoxGeometry(1.12, 1.02, 0.3, 2, 0.1), blackMat, 0, 1.22, -1.08); // seat + headrest
  seatBack.rotation.x = -0.14;
  add(new RoundedBoxGeometry(0.6, 0.34, 0.2, 2, 0.07), blackMat, 0, 1.78, -1.18);
  add(new RoundedBoxGeometry(0.78, 0.46, 0.55, 2, 0.08), GMAT.darkMetal({}), 0, 1.02, -1.52);    // engine block
  add(new RoundedBoxGeometry(0.5, 0.2, 0.4, 2, 0.06), GMAT.carbonFibre({ repeat: 3 }), 0, 1.34, -1.52); // airbox
  for (const sx of [-1, 1]) { const py = add(new THREE.BoxGeometry(0.14, 0.52, 0.14), blackMat, sx * 0.82, 1.28, -1.88); py.rotation.x = 0.18; }
  const blade = add(new RoundedBoxGeometry(2.3, 0.09, 0.56, 2, 0.04), GMAT.carbonFibre({ repeat: 4 }), 0, 1.56, -1.98); // spoiler
  blade.rotation.x = 0.14;
  add(new RoundedBoxGeometry(0.07, 0.36, 0.6, 2, 0.03), blackMat, -1.12, 1.5, -1.98);
  add(new RoundedBoxGeometry(0.07, 0.36, 0.6, 2, 0.03), blackMat, 1.12, 1.5, -1.98);
  const pipeMat = GMAT.chrome();
  for (const sx of [-1, 1]) { // exhausts: pipe + flared tip, angled up
    const pipeGeo = new THREE.CylinderGeometry(0.085, 0.095, 0.6, 10); pipeGeo.rotateX(Math.PI / 2 - 0.18);
    add(pipeGeo, pipeMat, sx * 0.42, 0.62, -1.92);
    const tipGeo = new THREE.CylinderGeometry(0.13, 0.09, 0.22, 10); tipGeo.rotateX(Math.PI / 2 - 0.18);
    add(tipGeo, pipeMat, sx * 0.42, 0.68, -2.2);
  }
  // steering: angled column + wheel the driver's hands actually reach
  const column = add(new THREE.CylinderGeometry(0.05, 0.05, 0.62, 8), GMAT.darkMetal({}), 0, 1.08, 0.22);
  column.rotation.x = 0.85;
  const swheel = add(new THREE.TorusGeometry(0.3, 0.05, 8, 20), blackMat, 0, 1.26, 0.06);
  swheel.rotation.x = -0.72; // wheel plane square to the column, facing the driver
  add(new THREE.BoxGeometry(0.5, 0.07, 0.05), blackMat, 0, 1.26, 0.06).rotation.x = -0.72;
  add(new THREE.SphereGeometry(0.075, 10, 8), GMAT.darkMetal({}), 0, 1.26, 0.06);

  /* ---- wheels: lathed tyres, spoked rims, slight camber; rears bigger ---- */
  const tyreMat = GMAT.rubber({});
  const rimMat = GMAT.darkMetal({ roughness: 0.35 });
  const faceMatWheel = new THREE.MeshStandardMaterial({ map: rimFaceTexture(), roughness: 0.38, metalness: 0.65 });
  const lipGeo = new THREE.TorusGeometry(0.30, 0.035, 8, 20); lipGeo.rotateY(Math.PI / 2);
  const lipMat = GMAT.chrome({ roughness: 0.25 });
  const mkWheel = (parent, x, y, z, radius, width) => {
    const camber = new THREE.Group(); camber.position.set(x, y, z); camber.rotation.z = Math.sign(x) * 0.05; parent.add(camber);
    const spin = new THREE.Group(); camber.add(spin);
    const tyre = new THREE.Mesh(tyreGeometry(radius, width), tyreMat); tyre.castShadow = true; spin.add(tyre);
    const rimGeo = new THREE.CylinderGeometry(radius * 0.6, radius * 0.6, width * 0.86, 14); rimGeo.rotateZ(Math.PI / 2);
    spin.add(new THREE.Mesh(rimGeo, rimMat));
    for (const fx of [-1, 1]) {
      const face = new THREE.Mesh(new THREE.CircleGeometry(radius * 0.58, 14), faceMatWheel);
      face.position.x = fx * width * 0.44; face.rotation.y = fx > 0 ? Math.PI / 2 : -Math.PI / 2; spin.add(face);
      const lip = new THREE.Mesh(lipGeo, lipMat); lip.position.x = fx * width * 0.47; lip.scale.setScalar(radius / 0.5); spin.add(lip);
    }
    return spin; // game spins wheels[i].rotation.x — the spin group IS the hook
  };
  const pivotL = new THREE.Group(); pivotL.position.set(-1.18, 0.48, 1.18); tilt.add(pivotL);
  const pivotR = new THREE.Group(); pivotR.position.set(1.18, 0.48, 1.18); tilt.add(pivotR);
  const wFL = mkWheel(pivotL, 0, 0, 0, 0.48, 0.44), wFR = mkWheel(pivotR, 0, 0, 0, 0.48, 0.44);
  const wRL = mkWheel(tilt, -1.18, 0.54, -1.18, 0.54, 0.52), wRR = mkWheel(tilt, 1.18, 0.54, -1.18, 0.54, 0.52);

  /* ---- driver: articulated figure, bare head — the hair/hat IS the read ---- */
  const skinMat = GMAT.skinTone(r.skin);
  const faceMat = new THREE.MeshStandardMaterial({ map: faceTexture(r, racerIdx), roughness: 0.85 });
  // face drawn on a patch bent to hug the head sphere (was a flat floating plane)
  const facePatch = (rad) => {
    const g = new THREE.PlaneGeometry(rad * 1.32, rad * 1.32, 6, 6);
    const pos = g.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), y = pos.getY(i);
      const z = Math.sqrt(Math.max(0.004, rad * rad - x * x - y * y));
      pos.setXYZ(i, x * 1.03, y * 1.03, z * 1.03);
    }
    g.computeVertexNormals();
    return g;
  };
  // hair/hat silhouettes per racer: [colour, capDepth] — iconic reads at distance
  const HAIR = { 0: [0x4a3423, 0.58], 1: [0x5a4030, 0.6], 2: [0x3a2a1c, 0.55], 4: [0x14151a, 0.6], 5: [0x9aa0a3, 0.55], 6: [0x2a2019, 0.62], 7: [0x3b2d24, 0.58], 8: [0xe6c15c, 0.72], 9: [0xbdbdbd, 0.5], 11: [0x8a7a68, 0.58], 12: [0x2e2622, 0.5], 13: [0xa8895a, 0.66], 14: [0xdcdcdc, 0.55], 15: [0xe8e8e8, 0.5], 16: [0xd8d8d2, 0.66] };
  const buildFigure = (cx, s, hairSpec) => {
    const cy = (y) => 0.9 + (y - 0.9) * s, cz = (z) => -0.5 + (z + 0.5) * s; // scale about the seat base
    const torso = add(new THREE.CapsuleGeometry(0.34 * s, 0.5 * s, 4, 12), suitMat, cx, cy(1.48), cz(-0.55));
    torso.scale.set(1.18, 1, 0.82); torso.rotation.x = -0.07;
    for (const sx of [-1, 1]) { // arms: shoulder → steering-wheel grips, hands on the rim
      const arm = add(new THREE.CapsuleGeometry(0.105 * s, 0.52 * s, 3, 8), suitMat, cx + sx * 0.36 * s, cy(1.44), cz(-0.18));
      arm.rotation.x = 2.05; arm.rotation.z = sx * 0.22; // axis tipped forward-down: shoulder → wheel grip
      add(new THREE.SphereGeometry(0.105 * s, 10, 8), skinMat, cx + sx * 0.24 * s, cy(1.3), cz(0.1)); // hand
      const leg = add(new THREE.CapsuleGeometry(0.125 * s, 0.44 * s, 3, 8), GMAT.mattePlastic(new THREE.Color(r.suit).multiplyScalar(0.7).getHex()), cx + sx * 0.24 * s, cy(0.98), cz(-0.02));
      leg.rotation.x = Math.PI / 2 - 0.35;
    }
    add(new THREE.CylinderGeometry(0.13 * s, 0.15 * s, 0.22 * s, 10), skinMat, cx, cy(1.98), cz(-0.5)); // neck
    const headR = 0.5 * s, headY = cy(2.18), headZ = cz(-0.5);
    add(new THREE.SphereGeometry(headR, 20, 14), skinMat, cx, headY, headZ);           // head
    for (const sx of [-1, 1]) add(new THREE.SphereGeometry(0.09 * s, 8, 6), skinMat, cx + sx * headR * 0.98, headY, headZ); // ears
    const face = new THREE.Mesh(facePatch(headR), faceMat); face.position.set(cx, headY, headZ); tilt.add(face);
    if (hairSpec) {
      const [hCol, depth] = hairSpec;
      const hairMat = GMAT.mattePlastic(hCol, { roughness: 0.92 });
      // cap tipped back (−0.38 rad): the rim rises over the brow in front, falls to the neck behind
      const cap = add(new THREE.SphereGeometry(headR * 1.045, 18, 12, 0, Math.PI * 2, 0, Math.PI * Math.min(depth, 0.58)), hairMat, cx, headY + headR * 0.06, headZ - headR * 0.04);
      cap.scale.y = 0.94; cap.rotation.x = -0.38;
      if (racerIdx === 1) for (const [ox, oy, oz] of [[-0.2, 0.42, -0.05], [0.15, 0.46, -0.2], [0.02, 0.4, 0.18]]) add(new THREE.SphereGeometry(0.16 * s, 8, 6), hairMat, cx + ox * s, headY + oy * s, headZ + oz * s); // Sam: curls
      if (racerIdx === 8) { // Trump: the swoop — fringe slab swept over the forehead
        const fringe = add(new RoundedBoxGeometry(0.88 * s, 0.17 * s, 0.42 * s, 2, 0.06), hairMat, cx + 0.04 * s, headY + headR * 0.62, headZ + headR * 0.62);
        fringe.rotation.x = 0.35; fringe.rotation.z = -0.1;
      }
      if (racerIdx === 13) { // Holmes: long panels framing the face + back fall
        for (const sx of [-1, 1]) add(new RoundedBoxGeometry(0.17 * s, 0.92 * s, 0.34 * s, 2, 0.06), hairMat, cx + sx * headR * 0.92, headY - 0.42 * s, headZ + 0.02);
        add(new RoundedBoxGeometry(0.8 * s, 0.85 * s, 0.15 * s, 2, 0.06), hairMat, cx, headY - 0.38 * s, headZ - headR * 0.92);
      }
      if (racerIdx === 14) add(new RoundedBoxGeometry(0.46 * s, 0.26 * s, 0.14 * s, 2, 0.05), hairMat, cx, headY - headR * 0.52, headZ + headR * 0.82); // Ellison: white beard
    }
    return { headY, headZ, headR };
  };
  if (r.duo) { // Larry & Sergey: two figures, one wheel — Larry hair, Sergey in the Google cap
    buildFigure(-0.44, 0.8, [0x2e2622, 0.58]);
    const fig = buildFigure(0.44, 0.8, null);
    const capMat = GMAT.mattePlastic(0x4285f4, { roughness: 0.8 });
    const capTop = add(new THREE.SphereGeometry(fig.headR * 1.05, 16, 10, 0, Math.PI * 2, 0, Math.PI * 0.46), capMat, 0.44, fig.headY + fig.headR * 0.08, fig.headZ - fig.headR * 0.03);
    capTop.scale.y = 0.9; capTop.rotation.x = -0.15;
    const brim = add(new THREE.CylinderGeometry(fig.headR * 1.02, fig.headR * 1.02, 0.035, 14, 1, false, -0.7, 1.4), capMat, 0.44, fig.headY + fig.headR * 0.18, fig.headZ + fig.headR * 0.35);
    brim.scale.set(1, 1, 1.35);
    add(new THREE.SphereGeometry(0.06, 8, 6), capMat, 0.44, fig.headY + fig.headR * 1.02, fig.headZ);
  } else {
    buildFigure(0, 1, racerIdx === 3 ? null : (HAIR[racerIdx] || [0x333333, 0.58])); // Bezos: proudly bald
    if (racerIdx === 8) { // Trump's red tie over the navy suit
      add(new RoundedBoxGeometry(0.15, 0.5, 0.05, 1, 0.02), GMAT.mattePlastic(0xc0272d), 0, 1.52, -0.24).rotation.x = 0.1;
      add(new RoundedBoxGeometry(0.13, 0.13, 0.05, 1, 0.02), GMAT.mattePlastic(0xc0272d), 0, 1.8, -0.29);
    }
    if (racerIdx === 11) { // Bill's glasses (geometry, not paint)
      const gMat = GMAT.darkMetal({ roughness: 0.3 });
      for (const sx of [-1, 1]) { const ring = add(new THREE.TorusGeometry(0.14, 0.02, 6, 16), gMat, sx * 0.19, 2.24, 0.03); }
      add(new THREE.BoxGeometry(0.12, 0.03, 0.03), gMat, 0, 2.26, 0.03);
    }
  }

  // per-racer props
  if (racerIdx === 0) { const cone = add(new THREE.ConeGeometry(0.36, 1.15, 10), GMAT.flatProp(0xf2f2f2), 0, 1.78, -1.55); cone.rotation.x = 0.5; }
  if (racerIdx === 1) { const halo = add(new THREE.TorusGeometry(0.42, 0.07, 8, 20), new THREE.MeshStandardMaterial({ color: 0xffd94a, emissive: 0xaa8800, emissiveIntensity: 1.5 }), 0, 2.95, -0.5); halo.rotation.x = Math.PI / 2; }
  if (racerIdx === 2) { const chain = add(new THREE.TorusGeometry(0.36, 0.08, 8, 22), new THREE.MeshStandardMaterial({ color: 0xffd94a, emissive: 0x997700, emissiveIntensity: 0.55, metalness: 0.85, roughness: 0.25 }), 0, 1.82, -0.26); chain.rotation.x = 0.55; } // the Zuckaissance gold chain
  if (racerIdx === 3) { add(new THREE.BoxGeometry(0.8, 0.8, 0.8), GMAT.flatProp(0xb5823c), 0, 2.0, -1.98); } // Bezos: parcel strapped to the spoiler
  if (racerIdx === 4) { add(new THREE.BoxGeometry(1.5, 0.1, 0.5), new THREE.MeshStandardMaterial({ color: 0x76b900, emissive: 0x76b900, emissiveIntensity: 1.4 }), 0, 0.47, 2.18); } // Jensen: GPU light-bar on the front wing

  const nameSpr = nameSprite(r, isPlayer);
  root.add(nameSpr);
  const kart = {
    racerIdx, racer: r, isPlayer, mesh: root, nameSpr, tilt, paintMat: bodyMat, wheels: [wFL, wFR, wRL, wRR], pivots: [pivotL, pivotR],
    pos: new THREE.Vector3(), heading: 0, velHeading: 0, speed: 0, steerVis: 0, spinVis: 0,
    continuous: 0, sampleIdx: 0, lateral: 0, finished: false, finishTime: null, projected: false, autopilot: false,
    item: null, spinT: 0, shrinkT: 0, starT: 0, boostT: 0, driftCharge: 0, drifting: false, starTouchCd: 0, driftStreak: 0, shieldUsed: false, // #51: Sam's scaling streak + Bill's one-shot Foundation shield
    bailoutT: 0, ghostT: 0, hornT: 0, goldenT: 0, goldenCd: 0, inkT: 0,
    sputterT: 0, sputterClock: 0, nextSputter: rand(6, 14),
    lapStart: 0, lastLapTime: null, bestLap: null, lapsDone: 0, offroad: false, offroadDeep: false, offFactor: 1,
    ai: { lane: rand(-5, 5), laneT: rand(1, 3), itemT: rand(2, 6), skill: r.aiSkill ?? rand(0.97, 1.03), driftHeld: false },
  };
  attachKartFX(kart);
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
    k.pos.set(s.x + n.x * lat, roadYAt(idx, lat), s.z + n.z * lat);
    k.continuous = cont; k.sampleIdx = idx;
    k.heading = k.velHeading = headingOf(tangents[idx]);
    k.speed = 0; k.spinT = 0; k.shrinkT = 0; k.starT = 0; k.boostT = 0; k.driftCharge = 0; k.drifting = false; k.driftStreak = 0; k.shieldUsed = false; // #51: specials reset per race
    k.bailoutT = 0; k.ghostT = 0; k.hornT = 0; k.goldenT = 0; k.goldenCd = 0; k.inkT = 0;
    k.item = null; k.finished = false; k.finishTime = null; k.projected = false; k.autopilot = false;
    k.sputterT = 0; k.sputterClock = 0; k.nextSputter = rand(6, 14);
    k.lapsDone = Math.floor(k.continuous / N); k.lapStart = 0; k.lastLapTime = null; k.bestLap = null; k.spinVis = 0;
    k.mesh.position.copy(k.pos); k.mesh.rotation.y = k.heading;
    k.mesh.scale.setScalar(1);
  }
  bananas.forEach(b => scene.remove(b.mesh)); bananas = [];
  projectiles.forEach(p => killProjectile(p)); projectiles = [];
  bombs.forEach(b => scene.remove(b.mesh)); bombs = [];
  itemBoxes.forEach(b => { b.active = true; b.mesh.visible = true; b.respawnT = 0; b.setFade(1); b.mesh.scale.setScalar(1); });
  raceTime = 0; finishDelay = -1;
  prevPlayerCont = playerKart().continuous;
  updateItemSlot();
}

/* ================= PARTICLES (pooled) ================= */
const P_COUNT = 700;
let pGeo, pPoints, pVel, pLife, pMaxLife, pGrav, pFloor, pHead = 0;
function initParticles() {
  pGeo = new THREE.BufferGeometry();
  const posArr = new Float32Array(P_COUNT * 3), colArr = new Float32Array(P_COUNT * 3);
  for (let i = 0; i < P_COUNT; i++) posArr[i * 3 + 1] = -999;
  pGeo.setAttribute('position', new THREE.BufferAttribute(posArr, 3));
  pGeo.setAttribute('color', new THREE.BufferAttribute(colArr, 3));
  pVel = new Float32Array(P_COUNT * 3); pLife = new Float32Array(P_COUNT); pMaxLife = new Float32Array(P_COUNT); pGrav = new Float32Array(P_COUNT); pFloor = new Float32Array(P_COUNT);
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
    pLife[i] = pMaxLife[i] = life * rand(0.6, 1.15); pGrav[i] = gravity; pFloor[i] = origin.y - 0.3; // bounce on the local surface, not y=0 (hills!)
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
    if (posA[i * 3 + 1] < pFloor[i] + 0.1) { posA[i * 3 + 1] = pFloor[i] + 0.1; pVel[i * 3 + 1] *= -0.4; }
  }
  pGeo.attributes.position.needsUpdate = true;
}

/* ================= ITEM WORLD FX =================
   Physical, readable in-world effects for every item — visible from the chase
   camera at racing distance, not just particles + a caption. Discipline:
   shared singleton geometries/materials where possible, per-effect materials
   flagged userData.fxOwn and disposed when the effect ends, NO per-frame
   allocations in hot loops (preallocated buffers + module temp vectors).
   Anything added to `scene` is also swept by buildWorld's teardown traverse;
   wfx/kart-trail state arrays are reset in buildWorld via resetWFX(). */
const _fxV1 = new THREE.Vector3();
const FXGEO = {
  ring: new THREE.RingGeometry(0.78, 1, 48),
  disc: new THREE.CircleGeometry(1, 28),
  flame: new THREE.ConeGeometry(0.36, 1.5, 10, 1, true),
  streak: new THREE.PlaneGeometry(3.4, 0.09),
  orb: new THREE.SphereGeometry(0.42, 12, 10),
  debris: new THREE.BoxGeometry(0.34, 0.34, 0.34),
  beam: new THREE.CylinderGeometry(0.45, 0.95, 7, 12, 1, true),
};
FXGEO.ring.rotateX(-Math.PI / 2); FXGEO.disc.rotateX(-Math.PI / 2);
FXGEO.flame.rotateX(-Math.PI / 2); // apex -> -Z (kart forward is +Z; flames trail backward)
FXGEO.streak.rotateY(Math.PI / 2); // length -> Z axis
const FXMAT = {
  flame: new THREE.MeshBasicMaterial({ color: 0xff7a1a, transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }),
  flameCore: new THREE.MeshBasicMaterial({ color: 0x9fd8ff, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }),
  flameGold: new THREE.MeshBasicMaterial({ color: 0xffc93c, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }),
  streak: new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }),
  ink: new THREE.MeshBasicMaterial({ color: 0x14092b, transparent: true, opacity: 0.88, depthWrite: false }),
  beam: new THREE.MeshBasicMaterial({ color: 0xffd94a, transparent: true, opacity: 0.30, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }),
};
const FX_RAINBOW = [0xffe066, 0xff8ac2, 0x7be495, 0x6ec3ff, 0xffffff];
function fxBasic(params) { const m = new THREE.MeshBasicMaterial(Object.assign({ transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }, params)); m.userData.fxOwn = true; return m; }

/* ---- ribbon trails (projectiles + star/bailout karts) ---- */
function makeTrail(n, width, color) {
  const geo = new THREE.BufferGeometry();
  const pos = new Float32Array(n * 6), col = new Float32Array(n * 6), idx = [];
  for (let i = 0; i < n; i++) {
    const b = Math.pow(1 - i / (n - 1), 1.4);
    for (let s = 0; s < 2; s++) { const o = (i * 2 + s) * 3; col[o] = b; col[o + 1] = b; col[o + 2] = b; }
    if (i < n - 1) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
  }
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  geo.setIndex(idx);
  const mat = new THREE.MeshBasicMaterial({ color, vertexColors: true, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
  const mesh = new THREE.Mesh(geo, mat); mesh.frustumCulled = false; mesh.visible = false;
  return { mesh, geo, mat, n, width, hist: new Float32Array(n * 3), live: false };
}
function trailSeed(tr, p) { for (let i = 0; i < tr.n; i++) { tr.hist[i * 3] = p.x; tr.hist[i * 3 + 1] = p.y; tr.hist[i * 3 + 2] = p.z; } tr.live = true; tr.mesh.visible = true; }
function trailPush(tr, p, wScale = 1) {
  const h = tr.hist, n = tr.n, posA = tr.geo.attributes.position.array;
  h.copyWithin(3, 0, (n - 1) * 3);
  h[0] = p.x; h[1] = p.y; h[2] = p.z;
  for (let i = 0; i < n; i++) {
    const i0 = Math.max(i - 1, 0) * 3, i1 = Math.min(i + 1, n - 1) * 3;
    let dx = h[i0] - h[i1], dz = h[i0 + 2] - h[i1 + 2];
    const len = Math.hypot(dx, dz) || 1; dx /= len; dz /= len;
    const w = tr.width * wScale * (1 - i / n) * 0.5, cx = h[i * 3], cy = h[i * 3 + 1], cz = h[i * 3 + 2], o = i * 6;
    posA[o] = cx - dz * w; posA[o + 1] = cy; posA[o + 2] = cz + dx * w;
    posA[o + 3] = cx + dz * w; posA[o + 4] = cy; posA[o + 5] = cz - dx * w;
  }
  tr.geo.attributes.position.needsUpdate = true;
}
function trailOff(tr) { tr.live = false; tr.mesh.visible = false; }
function trailDispose(tr) { if (!tr) return; scene.remove(tr.mesh); tr.geo.dispose(); tr.mat.dispose(); }

/* ---- one-shot world effects ---- */
let wfx = [], flashA = 0;
function resetWFX() { wfx = []; flashA = 0; const el = $('flash-overlay'); if (el) el.style.opacity = 0; }
function wfxKill(f) {
  if (!f.mesh) return;
  scene.remove(f.mesh);
  f.mesh.traverse(o => {
    if (o.geometry && o.geometry.userData.fxOwn) o.geometry.dispose();
    if (o.material && o.material.userData && o.material.userData.fxOwn) o.material.dispose();
    if (o.material && o.material.isSpriteMaterial) o.material.dispose(); // effect sprites own their material (shared map texture is NOT disposed)
  });
}
function updateWFX(dt) {
  for (let i = wfx.length - 1; i >= 0; i--) {
    const f = wfx[i]; f.t += dt;
    if (f.step(f, dt) || f.t >= f.dur) { wfxKill(f); wfx.splice(i, 1); }
  }
  if (flashA > 0) { flashA = Math.max(0, flashA - dt * 2.4); const el = $('flash-overlay'); if (el) el.style.opacity = flashA.toFixed(2); }
}
function wfxRing(pos, { r1 = 12, dur = 0.5, color = 0xffd94a, y = 0.12, r0 = 0.6, op = 0.95 } = {}) {
  const mesh = new THREE.Mesh(FXGEO.ring, fxBasic({ color, opacity: op, side: THREE.DoubleSide }));
  mesh.position.set(pos.x, pos.y + y, pos.z); scene.add(mesh);
  wfx.push({ t: 0, dur, mesh, step(f) { const p = f.t / dur, e = 1 - (1 - p) * (1 - p); mesh.scale.setScalar(r0 + (r1 - r0) * e); mesh.material.opacity = op * (1 - p); return p >= 1; } });
}
function wfxFlashDisc(pos, { r = 6, dur = 0.28, color = 0xffe9a8 } = {}) {
  const mesh = new THREE.Mesh(FXGEO.disc, fxBasic({ color, opacity: 0.9 }));
  mesh.position.set(pos.x, pos.y + 0.16, pos.z); scene.add(mesh);
  wfx.push({ t: 0, dur, mesh, step(f) { const p = f.t / dur; mesh.scale.setScalar(0.5 + r * p); mesh.material.opacity = 0.9 * (1 - p); return p >= 1; } });
}
function wfxSplat(pos, { r = 2.6, dur = 1.1, color = 0x0a1420, op = 0.6 } = {}) {
  const mesh = new THREE.Mesh(FXGEO.disc, fxBasic({ color, opacity: op, blending: THREE.NormalBlending }));
  mesh.position.set(pos.x, pos.y + 0.14, pos.z); scene.add(mesh);
  wfx.push({ t: 0, dur, mesh, step(f) { const p = f.t / dur; mesh.scale.setScalar(r * Math.min(1, p * 3)); mesh.material.opacity = op * (1 - p * p); return p >= 1; } });
}
function wfxDebris(pos) {
  const grp = new THREE.Group(); grp.position.copy(pos);
  const mat = fxBasic({ color: 0x3a3a42, blending: THREE.NormalBlending, opacity: 1 });
  const parts = [];
  for (let i = 0; i < 8; i++) {
    const m = new THREE.Mesh(FXGEO.debris, mat); grp.add(m);
    parts.push({ m, vx: rand(-7, 7), vy: rand(6, 13), vz: rand(-7, 7), rx: rand(-9, 9), rz: rand(-9, 9) });
  }
  scene.add(grp);
  wfx.push({ t: 0, dur: 0.85, mesh: grp, step(f, dt) {
    for (const d of parts) { d.vy -= 24 * dt; d.m.position.x += d.vx * dt; d.m.position.y += d.vy * dt; d.m.position.z += d.vz * dt; if (d.m.position.y < 0.2) { d.m.position.y = 0.2; d.vy *= -0.35; } d.m.rotation.x += d.rx * dt; d.m.rotation.z += d.rz * dt; }
    mat.opacity = 1 - Math.max(0, (f.t - 0.5) / 0.35);
    return f.t >= f.dur;
  } });
}
/* Lightning: a jagged crossed-ribbon bolt. follow=false strikes a fixed point
   from the sky; follow=true wraps a kart in re-jittered electric arcs. */
function wfxBolt(target, { follow = false, dur = 0.22, h = 26, width = 0.38, color = 0xbfe9ff } = {}) {
  const SEG = 7, geo = new THREE.BufferGeometry(); geo.userData.fxOwn = true;
  const pos = new Float32Array((SEG + 1) * 4 * 3), idx = [];
  for (let i = 0; i < SEG; i++) { const a = i * 4; idx.push(a, a + 4, a + 1, a + 1, a + 4, a + 5, a + 2, a + 6, a + 3, a + 3, a + 6, a + 7); }
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setIndex(idx);
  const mesh = new THREE.Mesh(geo, fxBasic({ color, opacity: 0.95, side: THREE.DoubleSide }));
  mesh.frustumCulled = false; scene.add(mesh);
  const f = { t: 0, dur, mesh, kart: follow ? target : null, base: follow ? null : target.pos.clone(), jit: 0,
    step(fx, dt) {
      const b = fx.kart ? fx.kart.pos : fx.base;
      mesh.position.set(b.x, b.y, b.z);
      fx.jit -= dt;
      if (!follow || fx.jit <= 0) {
        fx.jit = 0.06;
        for (let i = 0; i <= SEG; i++) {
          const t = i / SEG, y = h * (1 - t) + 0.3 * t, sway = Math.sin(t * Math.PI) * (follow ? 0.9 : 2.6);
          const cx = rand(-1, 1) * sway, cz = rand(-1, 1) * sway, o = i * 12, w = width * (0.5 + t * 0.7);
          pos[o] = cx - w; pos[o + 1] = y; pos[o + 2] = cz; pos[o + 3] = cx + w; pos[o + 4] = y; pos[o + 5] = cz;
          pos[o + 6] = cx; pos[o + 7] = y; pos[o + 8] = cz - w; pos[o + 9] = cx; pos[o + 10] = y; pos[o + 11] = cz + w;
        }
        geo.attributes.position.needsUpdate = true;
      }
      mesh.material.opacity = 0.95 * (1 - Math.max(0, (fx.t - dur * 0.55) / (dur * 0.45)));
      return fx.t >= dur;
    } };
  wfx.push(f);
}
/* Insider Trading: the stolen item visibly flies from victim to thief. */
function wfxSteal(fromKart, toKart) {
  const grp = new THREE.Group();
  const orb = new THREE.Mesh(FXGEO.orb, fxBasic({ color: 0xcbb2ff, opacity: 0.95 })); grp.add(orb);
  const sm = new THREE.SpriteMaterial({ map: GTEX.particleSprite(), color: 0xcbb2ff, transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending, depthWrite: false });
  const glow = new THREE.Sprite(sm); glow.scale.setScalar(3.2); grp.add(glow);
  grp.position.copy(fromKart.pos); grp.position.y = fromKart.pos.y + 1.4; scene.add(grp);
  wfx.push({ t: 0, dur: 0.55, mesh: grp, step(f) {
    const p = Math.min(1, f.t / f.dur), e = p * p * (3 - 2 * p);
    grp.position.lerpVectors(fromKart.pos, toKart.pos, e);
    grp.position.y += 1.4 + Math.sin(p * Math.PI) * 3.4; // lerp already put us at the interpolated road height
    if (p >= 1) spawnParticles(toKart.pos, { count: 12, colors: [0xcbb2ff, 0xffffff], speed: 3.5, life: 0.45, up: 3, gravity: 0 });
    return p >= 1;
  } });
}

/* Held items are visible IN THE WORLD (Mario Kart readability rule): a mini
   version of whatever a kart holds orbits it, so rivals' threats can be read
   at racing distance. Also used for the Market Crash item-drop scatter. */
function miniItemMesh(id) {
  const g = new THREE.Group();
  const std = (color, extra = {}) => new THREE.MeshStandardMaterial(Object.assign({ color, roughness: 0.4 }, extra));
  const add = (geo, mat, x = 0, y = 0, z = 0) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); g.add(m); return m; };
  if (id === 'green' || id === 'red' || id === 'blue') { const p = projectileMesh(id); p.scale.setScalar(0.6); g.add(p); }
  else if (id === 'bomb') { const b = bombMesh(); b.scale.setScalar(0.55); g.add(b); }
  else if (id === 'banana') { const s = add(new THREE.SphereGeometry(0.34, 10, 8), std(0x2fb9ff, { emissive: 0x1177bb, emissiveIntensity: 1.1, roughness: 0.15 })); s.scale.y = 1.35; }
  else if (id === 'boost') { const bag = add(new THREE.SphereGeometry(0.42, 10, 8), std(0xd9a441, { metalness: 0.5, roughness: 0.3 })); bag.scale.y = 1.15; add(new THREE.CylinderGeometry(0.15, 0.2, 0.22, 8), std(0x8a6a24), 0, 0.5, 0); }
  else if (id === 'star') add(new THREE.OctahedronGeometry(0.52), std(0xffd94a, { emissive: 0xcc9900, emissiveIntensity: 1.2 }));
  else if (id === 'golden') { const gm = std(0xffc93c, { emissive: 0x997700, emissiveIntensity: 0.9, metalness: 0.6, roughness: 0.25 }); add(new THREE.CylinderGeometry(0.36, 0.2, 0.55, 10), gm); add(new THREE.CylinderGeometry(0.1, 0.17, 0.3, 8), gm, 0, -0.42, 0); }
  else if (id === 'lightning') { const b = add(new THREE.OctahedronGeometry(0.42), std(0xffe14d, { emissive: 0xccaa00, emissiveIntensity: 1.2 })); b.scale.set(0.7, 1.6, 0.7); }
  else if (id === 'horn') { const c = add(new THREE.ConeGeometry(0.42, 0.85, 10), std(0xf2f2f2)); c.rotation.x = Math.PI / 2; add(new THREE.CylinderGeometry(0.13, 0.13, 0.3, 8), std(0xd23b2e), 0, 0, -0.55); }
  else if (id === 'blooper') { add(new THREE.SphereGeometry(0.44, 10, 8), std(0x2a1650)); add(new THREE.SphereGeometry(0.2, 8, 6), std(0xf2f2f2), 0, 0.28, 0.16); }
  else if (id === 'boo') add(new THREE.SphereGeometry(0.46, 12, 10), std(0xffffff, { transparent: true, opacity: 0.85 }));
  else if (id === 'bailout') { add(new THREE.BoxGeometry(0.62, 0.62, 0.3), std(0xf5f5f5)); add(new THREE.BoxGeometry(0.46, 0.16, 0.32), std(0xd23b2e)); add(new THREE.BoxGeometry(0.16, 0.46, 0.32), std(0xd23b2e)); }
  return g;
}
/* Market Crash: the victim's held item is knocked loose and scatters. */
function wfxScatter(kart, id) {
  const m = miniItemMesh(id);
  m.position.copy(kart.pos); m.position.y = kart.pos.y + 1.4;
  m.traverse(o => { if (o.geometry && o.geometry !== FXGEO.ring) o.geometry.userData.fxOwn = true; });
  scene.add(m);
  const a = rand(0, Math.PI * 2);
  wfx.push({ t: 0, dur: 1.15, mesh: m, gy: kart.pos.y, vx: Math.cos(a) * rand(3, 6), vy: rand(6, 9), vz: Math.sin(a) * rand(3, 6), step(f, dt) {
    f.vy -= 22 * dt; m.position.x += f.vx * dt; m.position.y += f.vy * dt; m.position.z += f.vz * dt;
    if (m.position.y < f.gy + 0.45) { m.position.y = f.gy + 0.45; f.vy *= -0.4; f.vx *= 0.7; f.vz *= 0.7; }
    m.rotation.y += dt * 7; m.rotation.x += dt * 3;
    if (f.t > f.dur - 0.25) m.scale.setScalar(Math.max(0.01, (f.dur - f.t) / 0.25));
    return f.t >= f.dur;
  } });
}

/* ---- per-kart attachments: boost flames, streaks, auras, trails, beacons ---- */
function attachKartFX(k) {
  const g = new THREE.Group(); k.mesh.add(g);
  const mk = (geo, mat, x, y, z) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.visible = false; g.add(m); return m; };
  const fx = {};
  fx.flames = [mk(FXGEO.flame, FXMAT.flame, -0.45, 0.55, -2.05), mk(FXGEO.flame, FXMAT.flame, 0.45, 0.55, -2.05)];
  fx.cores = [mk(FXGEO.flame, FXMAT.flameCore, -0.45, 0.55, -1.95), mk(FXGEO.flame, FXMAT.flameCore, 0.45, 0.55, -1.95)];
  fx.glowDisc = mk(FXGEO.disc, new THREE.MeshBasicMaterial({ color: 0xff8a2a, transparent: true, opacity: 0.32, blending: THREE.AdditiveBlending, depthWrite: false }), 0, 0.07, 0);
  fx.glowDisc.scale.setScalar(2.1);
  fx.glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: GTEX.particleSprite(), color: 0xffd94a, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }));
  fx.glow.position.set(0, 1.3, 0); fx.glow.scale.setScalar(6); g.add(fx.glow);
  fx.streaks = [];
  for (let i = 0; i < 8; i++) { const s = mk(FXGEO.streak, FXMAT.streak, 0, 1, 0); s.userData.age = Math.random() * 0.3; s.userData.life = 0.3; s.userData.vz = 30; fx.streaks.push(s); }
  fx.splat = mk(FXGEO.disc, FXMAT.ink, 0, 2.05, 0.42); fx.splat.rotation.x = Math.PI / 2; fx.splat.scale.setScalar(0.85);
  fx.beaconDisc = mk(FXGEO.disc, FXMAT.beam, 0, 0.09, 13); fx.beaconDisc.scale.setScalar(2.6);
  fx.beaconBeam = mk(FXGEO.beam, FXMAT.beam, 0, 3.5, 13);
  fx.heldOrbit = new THREE.Group(); g.add(fx.heldOrbit); // held item, orbiting the kart (built lazily per item id)
  fx.held = {}; fx.heldCur = null;
  fx.bodyMat = k.paintMat || k.tilt.children[0].material; // kart paint (explicit handle from makeKart; child-order fallback) — flashed by Viral Moment
  fx.starLit = false;
  fx.trail = makeTrail(20, 1.1, 0xffd94a); scene.add(fx.trail.mesh);
  k.fx = fx;
}
function updateKartFX(k, dt) {
  const fx = k.fx; if (!fx) return;
  const gold = k.goldenT > 0, boosting = k.boostT > 0 && k.spinT <= 0;
  const flick = 0.85 + Math.sin(elapsed * 47 + k.racerIdx * 3.1) * 0.25 + Math.sin(elapsed * 31 + k.racerIdx) * 0.15;
  for (let i = 0; i < 2; i++) {
    fx.flames[i].visible = boosting; fx.cores[i].visible = boosting;
    if (boosting) { fx.flames[i].material = gold ? FXMAT.flameGold : FXMAT.flame; fx.flames[i].scale.set(1, 1, flick * (gold ? 1.3 : 1)); fx.cores[i].scale.set(0.55, 0.55, 0.6 * flick); }
  }
  fx.glowDisc.visible = boosting;
  if (boosting) { fx.glowDisc.material.color.setHex(gold ? 0xffc93c : 0xff8a2a); fx.glowDisc.scale.setScalar(2.1 + Math.sin(elapsed * 23 + k.racerIdx) * 0.15); }
  const streaking = boosting && k.speed > 16;
  for (const s of fx.streaks) {
    s.userData.age += dt;
    if (s.userData.age >= s.userData.life) {
      s.userData.age = 0; s.userData.life = rand(0.22, 0.4);
      const a = rand(0, Math.PI * 2), r = rand(1.3, 2.4);
      s.position.set(Math.cos(a) * r, rand(0.35, 1.7), rand(0.5, 2)); s.userData.vz = rand(26, 40);
    }
    s.visible = streaking;
    if (streaking) { s.position.z -= s.userData.vz * dt; if (s.position.z < -6) s.userData.age = s.userData.life; }
  }
  let glowO = 0;
  if (k.starT > 0) { glowO = 0.55 + Math.sin(elapsed * 9) * 0.15; fx.glow.material.color.setHex(0xffe066); fx.glow.scale.setScalar(6.4); }
  else if (k.bailoutT > 0) { glowO = 0.5; fx.glow.material.color.setHex(0xffd94a); fx.glow.scale.setScalar(7); }
  else if (gold) { glowO = 0.3; fx.glow.material.color.setHex(0xffc93c); fx.glow.scale.setScalar(5.4); }
  fx.glow.material.opacity = glowO;
  if ((k.starT > 0 || gold) && k.speed > 6 && Math.random() < 0.55) { // sparkle trail (rainbow for Viral Moment, gold for Series F)
    _fxV1.copy(k.pos); _fxV1.y += 0.9;
    spawnParticles(_fxV1, { count: 1, colors: [k.starT > 0 ? FX_RAINBOW[(Math.floor(elapsed * 7) + k.racerIdx) % FX_RAINBOW.length] : 0xffd94a], speed: 1.2, life: 0.5, up: 1.5, gravity: 0 });
  }
  if (k.ghostT > 0 && Math.random() < 0.5) { _fxV1.copy(k.pos); _fxV1.y += 1; spawnParticles(_fxV1, { count: 1, colors: [0xcbb2ff, 0xffffff], speed: 0.4, life: 0.9, up: 0.8, gravity: 0 }); } // ghost wisps
  fx.splat.visible = k.inkT > 0; // Smear Campaign ink rides the victim's visor
  // Viral Moment: the kart ITSELF flashes emissive gold, not just a trail
  if (k.starT > 0) { fx.bodyMat.emissive.setHex(0xffcf3f); fx.bodyMat.emissiveIntensity = 0.5 + Math.sin(elapsed * 10) * 0.3; fx.starLit = true; }
  else if (fx.starLit) { fx.bodyMat.emissiveIntensity = 0; fx.starLit = false; }
  // held item visible in the world, orbiting the kart so threats read at distance
  if (k.item !== fx.heldCur) {
    if (fx.heldCur && fx.held[fx.heldCur]) fx.held[fx.heldCur].visible = false;
    fx.heldCur = k.item;
    if (k.item) {
      if (!fx.held[k.item]) { const m = miniItemMesh(k.item); m.position.set(0, 1.35, -2.7); fx.heldOrbit.add(m); fx.held[k.item] = m; }
      fx.held[k.item].visible = true;
    }
  }
  if (fx.heldCur) fx.heldOrbit.rotation.y += dt * 2.4;
  fx.beaconDisc.visible = fx.beaconBeam.visible = k.bailoutT > 0; // Bailout guiding light, ahead of the kart
  const trailOn = k.starT > 0 || k.bailoutT > 0;
  if (trailOn) {
    _fxV1.copy(k.pos); _fxV1.y = k.pos.y + 0.55;
    if (!fx.trail.live) { trailSeed(fx.trail, _fxV1); fx.trail.mat.color.setHex(0xffd94a); }
    trailPush(fx.trail, _fxV1, k.bailoutT > 0 ? 1.35 : 1);
  } else if (fx.trail.live) trailOff(fx.trail);
}

/* ================= PHYSICS ================= */
const pick = arr => arr[Math.floor(Math.random() * arr.length)];
let simFairPlayer = false; // sim harness only: treat the autopilot "player" exactly like an AI kart
// Graduated offroad model (drive-feel pass): the old model bit at HALF_W-0.6 with a flat
// 0.72 cap + 0.38/s bleed, so the painted shoulder already crawled (Roger's 5 MPH screenshot).
// The factor is now a smooth function of lateral distance: road 1.0 → shoulder ~0.92
// (the rendered shoulder strip is HALF_W+2.6 wide) → eases to a 0.55 FLOOR by HALF_W+9
// and holds there — deep rough is slow but always driveable, so recovery is always possible.
// 0.55 matches the shortcut-gating factor: cutting deep still costs, it just never ends your race.
function offroadFactor(lat) {
  const a = Math.abs(lat);
  if (a <= HALF_W) return 1;
  if (a <= HALF_W + 1.5) return lerp(1, 0.92, (a - HALF_W) / 1.5);
  if (a <= HALF_W + 3.0) return 0.92;
  if (a >= HALF_W + 9.0) return 0.55;
  const t = (a - HALF_W - 3.0) / 6.0;
  return lerp(0.92, 0.55, t * t * (3 - 2 * t)); // smoothstep into the deep band — no step changes
}
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
  if (k.bailoutT > 0) base *= spec(k.racerIdx).bailoutMul ?? 1.30; // Demis (#51): his autopilot drives harder
  if (elevArr.length) base *= 1 - clamp(gradeAt(k.sampleIdx) * 1.6, -0.08, 0.08); // TRACK 3D: authored slopes — climbs cost speed, dives gift it (capped ±8%)
  base *= k.offFactor; // graduated offroad (see offroadFactor) — was: offroad ? (deep ? 0.55 : 0.72), plus a 0.38/s bleed
  return base;
}
function updateProgress(k) {
  const newIdx = nearestSample(k.pos, k.sampleIdx);
  let delta = newIdx - k.sampleIdx;
  if (delta > N / 2) delta -= N; if (delta < -N / 2) delta += N;
  k.continuous += delta; k.sampleIdx = newIdx;
  k.lateral = lateralAt(k.pos, newIdx);
  k.offFactor = offroadFactor(k.lateral);
  const offKeep = spec(k.racerIdx).offroadKeep; if (offKeep) k.offFactor = 1 - (1 - k.offFactor) * offKeep; // Larry & Sergey (#51): pre-mapped shoulders — most of the penalty is indexed away
  k.offroad = k.offFactor < 1;          // any penalty band (dust, cap settle rate)
  k.offroadDeep = k.offFactor <= 0.75;  // deep band (thick dust)
  if (Math.abs(k.lateral) > HALF_W + 14) { // distant safety net only (was HALF_W+5) — the graduated factor, not a wall, is what slows you out there
    k.pos.addScaledVector(normals[newIdx], -(Math.sign(k.lateral) * (Math.abs(k.lateral) - (HALF_W + 14))));
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
    if (rankOf(k) <= (spec(k.racerIdx).bailoutEndRank ?? 3)) k.bailoutT = 0; // delivered to the podium fight — the taxpayer's job is done (Demis #51: handed back at 4th)
  }

  if (k.spinT > 0) {
    k.speed = Math.max(0, k.speed - 42 * dt);
    k.spinVis += dt * 15;
    k.drifting = false; k.driftCharge = 0;
  } else {
    const top = topSpeedOf(k), cap = top * (k.boostT > 0 ? (spec(k.racerIdx).boostCap ?? 1.38) : 1); // Trump (#51): HUGE boost cap
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
    if (k.offFactor < 1) k.speed -= k.speed * (0.30 * (1 - k.offFactor) / 0.45) * dt; // sustained bleed scales with depth: ~0.05/s on the shoulder, 0.30/s at the deep floor (was a flat 0.38/s from HALF_W-0.6) — corner-cutting still bleeds, the shoulder doesn't
    if (k.speed > cap) k.speed = Math.max(cap, k.speed - (k.offroad ? 16 : 30) * dt); // gentle settle onto the grass cap instead of a wall of drag
    if (k.speed < -11) k.speed = -11;

    const wantDrift = input.drift && Math.abs(input.steer) > 0.25 && k.speed > 13;
    if (wantDrift) {
      if (!k.drifting) { k.drifting = true; k.driftCharge = 0; }
      k.driftCharge += dt * chargeRateOf(k); // #51: per-racer charge rates (Dario 1.45 flat; Satya ×0.9; Trump ×0.85; Sam's streak) — blue (0.7) in ~0.6 s, orange (std 1.4; Bezos 1.15) rewards the long ones
      if (Math.random() < 0.75) {
        const col = k.driftCharge >= orangeAtOf(k) ? [0xffa53a] : k.driftCharge >= 0.7 ? [0x66ccff] : [0xdddddd];
        spawnParticles(k.pos.clone().addScaledVector(forwardVec(k.heading), -1.4), { count: 2, colors: col, speed: 2.5, life: 0.4, up: 1.5, gravity: -2 });
      }
    } else if (k.drifting) {
      if (k.driftCharge >= orangeAtOf(k)) { k.boostT = Math.max(k.boostT, driftBoostOf(k, 'orange')); if (spec(k.racerIdx).streakStep) k.driftStreak = (k.driftStreak || 0) + 1; if (k.isPlayer) { A.driftBoost(); showFeed('🔥 ORANGE BOOST!'); } }
      else if (k.driftCharge >= 0.7) { k.boostT = Math.max(k.boostT, driftBoostOf(k, 'blue')); if (spec(k.racerIdx).streakStep) k.driftStreak = (k.driftStreak || 0) + 1; if (k.isPlayer) { A.driftBoost(); showFeed('💨 Drift boost!'); } }
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
    if (k.offFactor < 1 && k.speed > 6) { // offroad dust: a light haze on the shoulder, thick plumes in the deep band; tint per track/band
      const deep = k.offFactor <= 0.75;
      if (Math.random() < (deep ? 0.85 : 0.4)) {
        const cols = selectedTrack === 1 ? (deep ? [0xb5563c, 0x8f3b26] : [0xd98a63, 0xc47a52]) : (deep ? [0x8a7a4a, 0x6b8f3e] : [0x9a9a9a, 0x7d7d7d]);
        spawnParticles(k.pos.clone().addScaledVector(forwardVec(k.heading), -1.6), { count: deep ? 2 : 1, colors: cols, speed: 1.8, life: 0.55, up: 1.6, gravity: 0.8 });
      }
    }
  }
  const gripRate = k.drifting ? 2.4 : 9;
  k.velHeading = lerpAngle(k.velHeading, k.heading, clamp(gripRate * dt, 0, 1));
  k.pos.addScaledVector(forwardVec(k.velHeading), k.speed * dt);
  k.pos.y = roadYAt(k.sampleIdx, k.lateral); // ride the authored surface: elevation + banked cross-slope

  // mesh sync
  if (k.spinT <= 0) { const tgt = Math.round(k.spinVis / (Math.PI * 2)) * Math.PI * 2; k.spinVis = lerp(k.spinVis, tgt, clamp(10 * dt, 0, 1)); }
  const ghostOp = k.ghostT > 0 ? 0.42 : 1; // Insider Trading: intangible = translucent
  if (k.mesh.userData.op !== ghostOp) { k.mesh.userData.op = ghostOp; k.tilt.traverse(o => { if (o.material) { o.material.transparent = ghostOp < 1; o.material.opacity = ghostOp; } }); }
  k.mesh.position.copy(k.pos);
  k.mesh.rotation.y = k.heading + k.spinVis;
  k.steerVis = lerp(k.steerVis, input.steer || 0, clamp(10 * dt, 0, 1));
  // body roll = drift lean PLUS the road's authored bank (kart sits square on the banked surface);
  // body pitch = accel squat PLUS the slope it is actually climbing/diving, faded when off-line
  const slopeHere = gradeAt(k.sampleIdx) * Math.cos(angNorm(k.heading - headingOf(tangents[k.sampleIdx])));
  k.tilt.rotation.z = lerp(k.tilt.rotation.z, -k.steerVis * clamp(k.speed / 40, 0, 1) * 0.1 + bankArr[k.sampleIdx], clamp(8 * dt, 0, 1));
  k.tilt.rotation.x = lerp(k.tilt.rotation.x, clamp(-k.speed * 0.0012, -0.04, 0.02) - Math.atan(slopeHere), clamp(6 * dt, 0, 1));
  k.pivots.forEach(p => p.rotation.y = -k.steerVis * 0.38);
  k.wheels.forEach(w => w.rotation.x += k.speed * dt / 0.5);
  updateKartFX(k, dt);
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
  const s = spec(k.racerIdx);
  if (s.shield && !k.shieldUsed) { // Bill (#51): the Foundation absorbs the first spin-out hit of the race — no spin, shield spent
    k.shieldUsed = true;
    spawnParticles(k.pos, { count: 22, colors: [0xffd94a, 0x00adef, 0xffffff], speed: 5, life: 0.7, up: 5 });
    if (k.isPlayer) { A.pickup(); showFeed('🪟 THE FOUNDATION COVERED THAT HIT — shield spent'); }
    else if (k.pos.distanceTo(playerKart().pos) < 55) showFeed(`🪟 ${k.racer.name}'s Foundation absorbed a hit!`);
    return;
  }
  if (s.streakStep) k.driftStreak = 0; // Sam (#51): getting hit resets the scaling curve
  k.spinT = 1.15 * (s.spinMul ?? 1); k.speed *= 0.3; k.drifting = false; k.driftCharge = 0; // Murdoch 0.6 s / Soros 1.44 s via spinMul
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
    if (window.BKFX && BKFX.roulette(it, ITEMS, { tick: i => A.tone(840 + i * 45, 0.03, 'square', 0.016), land: () => { A.pickup(); showFeed(`<img class="feed-ic" src="${it.img}" alt=""> <b>${it.name}</b> — ${it.desc}`, 'desc'); } })) return;
    updateItemSlot(); A.pickup(); showFeed(`<img class="feed-ic" src="${it.img}" alt=""> <b>${it.name}</b> — ${it.desc}`, 'desc');
  }
}
const BOX_RESPAWN = 2.5, BOX_GHOST = 0.6; // was a flat 4s dead time, then an untelegraphed pop-in — following players couldn't time a box a rival had just taken
function updateItemBoxes(dt) {
  for (const b of itemBoxes) {
    b.mesh.rotation.y += dt * 1.9;
    b.mesh.position.y = b.baseY + Math.sin(elapsed * 2.2 + b.phase) * 0.25;
    if (!b.active) {
      b.respawnT -= dt;
      if (b.respawnT <= 0) { // live again: full opacity, full size, pickable
        b.active = true; b.mesh.visible = true;
        b.setFade(1); b.mesh.scale.setScalar(1);
      } else if (b.respawnT <= BOX_GHOST) { // ghost-in: the final 0.6s fades/scales the box back as a visible-but-not-yet-active telegraph
        const t = 1 - b.respawnT / BOX_GHOST;
        b.mesh.visible = true;
        b.setFade(0.25 + 0.55 * t);
        b.mesh.scale.setScalar(0.6 + 0.4 * t);
      }
      continue;
    }
    for (const k of karts) {
      if (k.item || k.finished) continue;
      if (k.pos.distanceToSquared(b.mesh.position) < 8.5) { b.active = false; b.mesh.visible = false; b.setFade(1); b.mesh.scale.setScalar(1); b.respawnT = BOX_RESPAWN; grantItem(k); break; }
    }
  }
}
function leakMesh() { // Data Leak: glossy dark puddle ON the road + glowing data-blue rim + droplets (internal item id: 'banana')
  const g = new THREE.Group();
  const gloss = new THREE.Mesh(new THREE.CircleGeometry(1.6, 24), new THREE.MeshStandardMaterial({ color: 0x0b1626, roughness: 0.06, metalness: 0.25, transparent: true, opacity: 0.96 }));
  gloss.rotation.x = -Math.PI / 2; gloss.position.y = 0.1; g.add(gloss);
  const sheen = new THREE.Mesh(new THREE.CircleGeometry(1.05, 20), new THREE.MeshBasicMaterial({ color: 0x9be7ff, transparent: true, opacity: 0.28 }));
  sheen.rotation.x = -Math.PI / 2; sheen.position.y = 0.12; g.add(sheen);
  const rim = new THREE.Mesh(FXGEO.ring, new THREE.MeshBasicMaterial({ color: 0x2fb9ff, transparent: true, opacity: 0.85, side: THREE.DoubleSide }));
  rim.position.y = 0.12; rim.scale.setScalar(1.6); g.add(rim); g.userData.rim = rim;
  const blob = new THREE.Mesh(new THREE.CircleGeometry(0.72, 16), new THREE.MeshBasicMaterial({ color: 0x2fb9ff, transparent: true, opacity: 0.7 })); // organic satellite blob (model pass)
  blob.rotation.x = -Math.PI / 2; blob.position.set(1.15, 0.1, 0.55); g.add(blob);
  const dropMat = new THREE.MeshStandardMaterial({ color: 0x2fb9ff, emissive: 0x1177bb, emissiveIntensity: 0.9, roughness: 0.2 });
  for (const [dx, dz, s] of [[-0.7, 0.4, 0.3], [0.55, -0.5, 0.24], [0.15, 0.75, 0.19]]) {
    const d = new THREE.Mesh(new THREE.SphereGeometry(s, 12, 10), dropMat);
    d.position.set(dx, 0.28, dz); d.scale.y = 1.35; g.add(d);
  }
  return g;
}
function projectileMesh(type) {
  const g = new THREE.Group();
  if (type === 'green') { // Subpoena: rolled scroll, sealed
    const geo = new THREE.CylinderGeometry(0.34, 0.34, 1.15, 14); geo.rotateZ(Math.PI / 2);
    const scroll = new THREE.Mesh(geo, GMAT.mattePlastic(0xf5efdd, { roughness: 0.6 })); g.add(scroll);
    for (const ex of [-1, 1]) { // rolled end-rings + end caps
      const ringGeo = new THREE.TorusGeometry(0.3, 0.055, 8, 16); ringGeo.rotateY(Math.PI / 2);
      const ring = new THREE.Mesh(ringGeo, GMAT.mattePlastic(0xe3d9c2, { roughness: 0.6 })); ring.position.x = ex * 0.55; g.add(ring);
      const capGeo = new THREE.CircleGeometry(0.3, 14); const cap = new THREE.Mesh(capGeo, GMAT.mattePlastic(0xe3d9c2, { roughness: 0.6 }));
      cap.position.x = ex * 0.58; cap.rotation.y = ex > 0 ? Math.PI / 2 : -Math.PI / 2; g.add(cap);
    }
    const ribbon = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.76, 0.2), GMAT.flatProp(0xd23b2e)); g.add(ribbon);
    const seal = new THREE.Mesh(new THREE.SphereGeometry(0.13, 10, 8), new THREE.MeshStandardMaterial({ color: 0xb01e24, roughness: 0.3, emissive: 0x550000, emissiveIntensity: 0.6 }));
    seal.position.set(0, -0.3, 0.26); seal.scale.z = 0.5; g.add(seal); // wax seal
  } else if (type === 'red') { // Viral Tweet: an actual bird — body, head, wings, tail
    const blue = GMAT.mattePlastic(0x1d9bf0, { roughness: 0.55 });
    const bodyB = new THREE.Mesh(new THREE.SphereGeometry(0.56, 16, 12), blue); bodyB.scale.set(1, 0.92, 1.18); g.add(bodyB);
    const belly = new THREE.Mesh(new THREE.SphereGeometry(0.44, 12, 10), GMAT.mattePlastic(0xeaf6fd, { roughness: 0.6 })); belly.position.set(0, -0.14, 0.16); belly.scale.set(0.85, 0.8, 0.95); g.add(belly);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.33, 14, 10), blue); head.position.set(0, 0.26, 0.42); g.add(head);
    const beakGeo = new THREE.ConeGeometry(0.19, 0.5, 10); beakGeo.rotateX(Math.PI / 2);
    const beak = new THREE.Mesh(beakGeo, GMAT.flatProp(0xffa53a)); beak.position.set(0, 0.22, 0.82); g.add(beak);
    for (const sx of [-1, 1]) {
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.055, 8, 6), GMAT.mattePlastic(0x101216)); eye.position.set(sx * 0.15, 0.36, 0.66); g.add(eye);
      const wing = new THREE.Mesh(new RoundedBoxGeometry(0.62, 0.07, 0.34, 1, 0.03), blue); wing.position.set(sx * 0.6, 0.18, -0.02); wing.rotation.z = sx * 0.5; g.add(wing);
    }
    const tail = new THREE.Mesh(new RoundedBoxGeometry(0.34, 0.06, 0.42, 1, 0.03), blue); tail.position.set(0, 0.12, -0.68); tail.rotation.x = -0.5; g.add(tail);
  } else if (type === 'blue') { // Antitrust Suit: lawyer's briefcase — rounded, handled, clasped
    const case_ = new THREE.Mesh(new RoundedBoxGeometry(1.05, 0.75, 0.5, 2, 0.09), GMAT.mattePlastic(0x7a4a21, { roughness: 0.5 })); g.add(case_);
    const trim = new THREE.Mesh(new THREE.BoxGeometry(1.09, 0.15, 0.54), new THREE.MeshStandardMaterial({ color: 0xffd94a, emissive: 0x997700, emissiveIntensity: 0.7, metalness: 0.7, roughness: 0.3 })); g.add(trim);
    const handleGeo = new THREE.TorusGeometry(0.21, 0.045, 8, 14, Math.PI); const handle = new THREE.Mesh(handleGeo, GMAT.darkMetal({})); handle.position.y = 0.4; g.add(handle);
    for (const cx of [-0.28, 0.28]) { const clasp = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.2, 0.05), GMAT.chrome({ roughness: 0.3 })); clasp.position.set(cx, 0.05, 0.26); g.add(clasp); }
  }
  g.traverse(o => o.castShadow = true);
  return g;
}
function bombMesh() { // Pink Slip: bomb + the dreaded paper slip + a real fuse cord
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.95, 22, 16), new THREE.MeshStandardMaterial({ color: 0x23242c, roughness: 0.32, metalness: 0.55, emissive: 0xff2222, emissiveIntensity: 0 }));
  body.castShadow = true; g.add(body);
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.26, 0.4, 10), GMAT.chrome({ roughness: 0.35 })); cap.position.y = 1.0; g.add(cap);
  const fuseCurve = new THREE.CatmullRomCurve3([new THREE.Vector3(0, 1.14, 0), new THREE.Vector3(0.16, 1.36, 0.05), new THREE.Vector3(0.34, 1.44, -0.08)]);
  const fuse = new THREE.Mesh(new THREE.TubeGeometry(fuseCurve, 8, 0.032, 6), GMAT.mattePlastic(0x8a6f4d)); g.add(fuse);
  const spark = new THREE.Mesh(new THREE.SphereGeometry(0.17, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffa53a })); spark.position.set(0.34, 1.44, -0.08); g.add(spark);
  const glowSm = new THREE.SpriteMaterial({ map: GTEX.particleSprite(), color: 0xffa53a, transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false });
  const glow = new THREE.Sprite(glowSm); glow.position.set(0.34, 1.44, -0.08); glow.scale.setScalar(0.9); g.add(glow); // blinking fuse light at the fuse tip, pulsed in updateBombs
  const slipTex = canvasTexture(128, 160, (g2) => {
    g2.fillStyle = '#ffd7e0'; g2.fillRect(0, 0, 128, 160);
    g2.fillStyle = '#b01e24'; g2.font = '900 25px system-ui'; g2.textAlign = 'center';
    g2.fillText('PINK', 64, 55); g2.fillText('SLIP', 64, 85);
    g2.fillStyle = '#7a4a52'; for (let y = 108; y < 150; y += 13) g2.fillRect(18, y, 92, 5);
  });
  const slip = new THREE.Mesh(new THREE.PlaneGeometry(0.52, 0.65), new THREE.MeshStandardMaterial({ map: slipTex, side: THREE.DoubleSide, roughness: 0.9 }));
  slip.position.set(0.3, 0.72, 0.78); slip.rotation.set(-0.25, 0.35, 0.1); g.add(slip);
  g.userData.body = body; g.userData.glow = glow;
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
    if (first) k.goldenT = spec(k.racerIdx).goldenT ?? 5; // Cook (#51): his funding window stays open longer
    k.goldenCd = spec(k.racerIdx).goldenCd ?? 0.7; // Cook (#51): calmer re-boost pace inside it
    k.boostT = Math.max(k.boostT, 0.95 * boostMulOf(k));
    if (k.isPlayer) { A.use(); A.boostSnd(); if (first) { [660, 880, 1108].forEach((f, i) => A.tone(f, 0.12, 'square', 0.055, 0, i * 0.07)); showFeed('🏆 SERIES F — keep hitting ITEM to re-boost!'); } }
    return;
  }
  k.item = null;
  if (k.isPlayer) { updateItemSlot(); A.use(); }
  const fwd = forwardVec(k.heading);
  if (id === 'boost') {
    k.boostT = Math.max(k.boostT, k.racerIdx === 4 ? 1.9 : 1.6 * boostMulOf(k)); // Jensen's 1.9 is his own long-standing tune; Satya (#51) stretches the standard boost ×1.2
    if (k.isPlayer) A.boostSnd();
  } else if (id === 'star') {
    k.starT = 6;
    spawnParticles(k.pos, { count: 22, colors: [0xffe066, 0xffffff], speed: 6, life: 0.7, up: 5, gravity: 0 });
  } else if (id === 'banana') { // Data Leak
    const mesh = leakMesh();
    const pos = k.pos.clone().addScaledVector(fwd, -3.4); pos.y = roadYAtPos(pos) + 0.06;
    mesh.position.copy(pos); scene.add(mesh);
    bananas.push({ mesh, pos, owner: k, age: 0, continuous: k.continuous - 2, lateral: lateralAt(pos, globalNearest(pos)) });
  } else if (id === 'green' || id === 'red') {
    let target = null;
    if (id === 'red') {
      let bestD = Infinity;
      for (const o of karts) { if (o === k) continue; const d = o.continuous - k.continuous; if (d > 0 && d < bestD) { bestD = d; target = o; } }
      if (target && spec(target.racerIdx).tweetEvasion && Math.random() < spec(target.racerIdx).tweetEvasion) target = null; // Holmes (#51): the Tweet loses the thread — flies straight instead
      if (!target) id === 'red' && (target = null);
    }
    const mesh = projectileMesh(id);
    mesh.position.copy(k.pos).addScaledVector(fwd, 3.2); mesh.position.y = k.pos.y + 0.9;
    scene.add(mesh);
    const pr = { type: id, mesh, owner: k, target, heading: k.heading, speed: id === 'red' ? 63 : 74, life: id === 'red' ? 6 : 3.2, age: 0 };
    if (id === 'red' && !target) { pr.type = 'green'; pr.speed = 74; }
    pr.trail = makeTrail(pr.type === 'red' ? 16 : 14, pr.type === 'red' ? 0.62 : 0.5, pr.type === 'red' ? 0xff5040 : 0x39ff6a);
    trailSeed(pr.trail, mesh.position); scene.add(pr.trail.mesh);
    if (pr.type === 'red' && target) { // lock-on ring tightening over the victim
      pr.lockRing = new THREE.Mesh(FXGEO.ring, fxBasic({ color: 0xff4040, opacity: 0.95, side: THREE.DoubleSide }));
      pr.lockRing.position.copy(target.pos); pr.lockRing.position.y = target.pos.y + 1.1; scene.add(pr.lockRing);
    }
    projectiles.push(pr);
  } else if (id === 'blue') {
    const leader = sortedKarts().find(o => o !== k) || null;
    if (!leader) return;
    const mesh = projectileMesh('blue');
    mesh.position.copy(k.pos); mesh.position.y = k.pos.y + 7; scene.add(mesh);
    const bp = { type: 'blue', mesh, owner: k, target: leader, u: k.continuous, speed: 118, life: 14, age: 0 };
    bp.trail = makeTrail(18, 0.85, 0x7fb2ff);
    trailSeed(bp.trail, mesh.position); scene.add(bp.trail.mesh);
    bp.warnRing = new THREE.Mesh(FXGEO.ring, fxBasic({ color: 0xff5252, opacity: 0.9, side: THREE.DoubleSide })); // target painted on the leader, tightening as the Suit closes in
    bp.warnRing.position.copy(leader.pos); bp.warnRing.position.y = leader.pos.y + 0.15; scene.add(bp.warnRing);
    projectiles.push(bp);
    showFeed('⚖️ ANTITRUST SUIT INBOUND — it\'s hunting the leader!');
    if (leader.isPlayer) A.zap();
  } else if (id === 'lightning') {
    let victims = karts.filter(o => o !== k && o.continuous > k.continuous && !o.finished);
    if (!victims.length) victims = karts.filter(o => o !== k && !o.finished);
    for (const v of victims) {
      if (v.starT > 0) continue;
      v.shrinkT = 4.8 * (spec(k.racerIdx).potency ?? 1) * sufferMulOf(v, 'shrink'); v.speed = Math.min(v.speed, 17); // ~0.6x for ~5 s, per the real games — Soros (#51) potency stretches it to 6 s; Murdoch/Soros sufferMul adjusts the victim's side
      if (v.item) { wfxScatter(v, v.item); if (v.item === 'golden') v.goldenT = 0; v.item = null; if (v.isPlayer) updateItemSlot(); } // victims DROP their held item, visibly
      spawnParticles(v.pos, { count: 12, colors: [0x9be7ff, 0xffffff], speed: 4, life: 0.5, up: 6, gravity: -4 });
      wfxBolt(v, { follow: false, dur: 0.22 }); // visible bolt strike from the sky
      wfxBolt(v, { follow: true, dur: 0.6, h: 3.2, width: 0.22, color: 0x9be7ff }); // electric arcs crackle over the victim
    }
    flashA = 0.55; // full-sky flash (decays in updateWFX)
    A.zap();
    if (k.isPlayer) showFeed('📉 You crashed the market!');
    else if (victims.includes(playerKart())) { showFeed('📉 MARKET CRASH — you\'ve been shrunk!'); shake = Math.max(shake, 0.4); }
  } else if (id === 'bailout') {
    k.bailoutT = spec(k.racerIdx).bailoutT ?? 5.5; // auto-drive: see bailoutInput/updateKart — ends early on reaching 3rd (Demis #51: 6.6 s, ends at 4th)
    spawnParticles(k.pos, { count: 26, colors: [0xffd94a, 0xffffff, 0x2fb9ff], speed: 6, life: 0.8, up: 5, gravity: 0 });
    if (k.isPlayer) { A.fanfare(); showFeed('🛟 GOVERNMENT BAILOUT! Too big to fail.'); }
    else showFeed(`🛟 ${k.racer.name} got a BAILOUT!`);
  } else if (id === 'horn') {
    k.hornT = 0.6; // active window — also swats an arriving Antitrust Suit out of the air (updateProjectiles)
    if (k.isPlayer) A.tone(170, 0.35, 'square', 0.16, -60);
    spawnParticles(k.pos, { count: 42, colors: [0xffd94a, 0xffffff], speed: 13, life: 0.45, up: 2.5, gravity: 0 });
    wfxRing(k.pos, { r1: 13, dur: 0.5, color: 0xffd94a }); // the Spin Team shockwave, readable in-world
    wfxRing(k.pos, { r1: 9, dur: 0.38, color: 0xffffff, r0: 2 });
    for (let i = projectiles.length - 1; i >= 0; i--) {
      if (projectiles[i].mesh.position.distanceToSquared(k.pos) < 210) { spawnParticles(projectiles[i].mesh.position, { count: 8, colors: [0xffd94a], speed: 4, life: 0.4, up: 2, gravity: 0 }); killProjectile(projectiles[i]); projectiles.splice(i, 1); }
    }
    for (let i = bananas.length - 1; i >= 0; i--) if (bananas[i].pos.distanceToSquared(k.pos) < 110) { scene.remove(bananas[i].mesh); bananas.splice(i, 1); }
    for (let i = bombs.length - 1; i >= 0; i--) if (bombs[i].pos.distanceToSquared(k.pos) < 110) { scene.remove(bombs[i].mesh); bombs.splice(i, 1); }
    for (const o of karts) if (o !== k && o.pos.distanceToSquared(k.pos) < 34) spinKart(o);
    if (k.isPlayer) { showFeed('📣 SPIN TEAM — DENIED!'); shake = Math.max(shake, 0.25); }
  } else if (id === 'boo') {
    k.ghostT = 3; k.boostT = Math.max(k.boostT, 0.7 * boostMulOf(k));
    const holders = karts.filter(o => o !== k && o.item);
    let stolen = 'boost'; // nobody holding anything? Insider trading still nets you a boost
    let victim = null;
    if (holders.length) { victim = pick(holders); stolen = victim.item; if (victim.item === 'golden') victim.goldenT = 0; victim.item = null; if (victim.isPlayer) updateItemSlot(); }
    k.item = stolen;
    if (victim) wfxSteal(victim, k); // the stolen item visibly flies across to the thief
    spawnParticles(k.pos, { count: 20, colors: [0xcbb2ff, 0xffffff], speed: 4, life: 0.7, up: 4, gravity: 0 });
    if (k.isPlayer) { A.tone(880, 0.35, 'sine', 0.09, -520); updateItemSlot(); showFeed(`👻 Insider Trading — stole ${ITEMS[stolen].name}!`); }
  } else if (id === 'blooper') {
    const victims = karts.filter(o => o !== k && o.continuous > k.continuous && !o.finished);
    for (const v of victims) {
      v.inkT = 2.5 * (spec(k.racerIdx).inkGiven ?? 1) * sufferMulOf(v, 'ink'); // Ellison (#51): his smears run 3.5 s — and stick to him just as long
      spawnParticles(v.pos, { count: 20, colors: [0x1a1030, 0x3a2060], speed: 5, life: 0.6, up: 4, gravity: -2 }); // in-world ink blob burst
      wfxSplat(v.pos, { color: 0x1a1030, r: 2.9, dur: 0.9, op: 0.55 });
      if (v.isPlayer) showInk();
    }
    if (k.isPlayer) { A.noise(0.3, 0.11, 480); showFeed(victims.length ? '📰 Smear Campaign launched!' : '📰 Smear Campaign — nobody ahead to smear'); }
    else if (victims.includes(playerKart())) showFeed('📰 You\'ve been SMEARED!');
  } else if (id === 'bomb') {
    const mesh = bombMesh();
    const pos = k.pos.clone().addScaledVector(fwd, -3.4); pos.y = roadYAtPos(pos) + 0.75;
    mesh.position.copy(pos); scene.add(mesh);
    bombs.push({ mesh, pos, owner: k, fuse: 1.6, beepT: 0 });
    if (k.isPlayer) showFeed('💣 Pink Slip armed…');
  }
}
function explodeBomb(b) {
  spawnParticles(b.pos, { count: 44, colors: [0xffa53a, 0xff5252, 0xffd94a, 0x555555], speed: 11, life: 0.9, up: 7 });
  wfxRing(b.pos, { r1: 9.5, dur: 0.5, color: 0xffa53a }); // shockwave ring + flash + debris: a real explosion, not a caption
  wfxFlashDisc(b.pos, { r: 5.5, dur: 0.3, color: 0xffd9a0 });
  _fxV1.copy(b.pos); _fxV1.y = b.pos.y + 0.1; wfxDebris(_fxV1);
  for (const o of karts) if (o.pos.distanceTo(b.pos) < 8.5) spinKart(o);
  const pd = playerKart().pos.distanceTo(b.pos);
  if (pd < 30) { shake = Math.max(shake, clamp(0.95 - pd / 30, 0.1, 0.85)); A.hit(); } // shake scaled by distance
  if (b.owner.isPlayer || pd < 42) showFeed('💣 PINK SLIP DELIVERED!');
}
function updateBombs(dt) {
  for (let i = bombs.length - 1; i >= 0; i--) {
    const b = bombs[i]; b.fuse -= dt;
    const body = b.mesh.userData.body; // telegraphed: flashing red fuse, faster as it runs out
    if (body) body.material.emissiveIntensity = Math.sin(elapsed * (b.fuse < 0.5 ? 42 : 13)) > 0 ? (b.fuse < 0.5 ? 1.5 : 0.55) : 0.04;
    const glow = b.mesh.userData.glow; // the fuse light itself blinks in sync, swelling as the fuse runs out
    if (glow) glow.scale.setScalar(Math.sin(elapsed * (b.fuse < 0.5 ? 42 : 13)) > 0 ? (b.fuse < 0.5 ? 1.5 : 1.05) : 0.5);
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
  const c = p.target.pos.clone(); c.y += 1;
  spawnParticles(c, { count: 46, colors: [0xffa53a, 0xff5252, 0xffd94a], speed: 11, life: 0.9, up: 7 });
  wfxRing(p.target.pos, { r1: 12.5, dur: 0.55, color: 0xffa53a }); // expanding shockwave ring + fireball flash + debris
  wfxFlashDisc(p.target.pos, { r: 7, dur: 0.3, color: 0xffd9a0 });
  wfxDebris(c);
  const blastR = spec(p.owner.racerIdx).blueRadius ?? 11; // Soros (#51): his Antitrust blast reaches further
  for (const o of karts) if (o.pos.distanceTo(p.target.pos) < blastR) spinKart(o);
  const pd = playerKart().pos.distanceTo(p.target.pos);
  if (pd < 34) shake = Math.max(shake, clamp(1.05 - pd / 34, 0.12, 0.9)); // camera shake scaled by distance
  if (pd < 30) A.hit();
  showFeed('⚖️ ANTITRUST HITS!');
}
function killProjectile(p) { // removes a projectile AND its world-fx attachments (trail ribbon, lock/warn rings)
  scene.remove(p.mesh);
  trailDispose(p.trail); p.trail = null;
  if (p.lockRing) { scene.remove(p.lockRing); p.lockRing.material.dispose(); p.lockRing = null; }
  if (p.warnRing) { scene.remove(p.warnRing); p.warnRing.material.dispose(); p.warnRing = null; }
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
        p.mesh.position.lerpVectors(a, b, fr); // a/b carry the track elevation — the Suit flies the hills too
        p.mesh.position.y += clamp(distSamples * 0.06, 1.1, 7.5);
        p.mesh.rotation.y += dt * 3;
        trailPush(p.trail, p.mesh.position); // smoke-ribbon wake
        spawnParticles(p.mesh.position, { count: 2, colors: [0x9fb6d8, 0xffffff], speed: 0.5, life: 0.45, up: 0.5, gravity: 1 });
        if (p.warnRing) { p.warnRing.position.set(target.pos.x, target.pos.y + 0.15, target.pos.z); p.warnRing.scale.setScalar(clamp(2 + distSamples * 0.05, 2.4, 10) * (1 + Math.sin(elapsed * 10) * 0.05)); }
        if (distSamples <= 3 || p.mesh.position.distanceTo(target.pos) < 6) { explodeBlue(p); dead = true; }
      }
    } else {
      if (p.type === 'red' && p.target) {
        const desired = Math.atan2(p.target.pos.x - p.mesh.position.x, p.target.pos.z - p.mesh.position.z);
        p.heading = lerpAngle(p.heading, desired, clamp(3.4 * dt, 0, 1));
        if (Math.random() < 0.6) spawnParticles(p.mesh.position, { count: 1, colors: [0x1d9bf0, 0xffffff], speed: 0.6, life: 0.3, up: 0.4, gravity: 0 });
        if (p.lockRing) { // ring rides the victim and tightens as the Tweet closes in
          p.lockRing.position.set(p.target.pos.x, p.target.pos.y + 1.1, p.target.pos.z);
          p.lockRing.scale.setScalar(clamp(p.mesh.position.distanceTo(p.target.pos) * 0.09, 1.6, 3.6));
          p.lockRing.material.opacity = 0.7 + Math.sin(elapsed * 14) * 0.3;
        }
      }
      p.mesh.position.addScaledVector(forwardVec(p.heading), p.speed * dt);
      const idx = globalNearest(p.mesh.position);
      p.mesh.position.y = roadYAt(idx, lateralAt(p.mesh.position, idx)) + 0.9;
      trailPush(p.trail, p.mesh.position, p.type === 'red' ? 1 + Math.sin(elapsed * 18) * 0.25 : 1); // red pulses, green is hard-edged
      p.mesh.rotation.y = p.heading; p.mesh.rotation.x += dt * 7;
      if (Math.abs(lateralAt(p.mesh.position, idx)) > HALF_W + 2.5) dead = true;
      if (!dead) for (const o of karts) {
        if (o === p.owner && p.age < 0.4) continue;
        if (o.ghostT > 0) continue; // Insider Trading ghost: projectiles pass straight through
        const dx = o.pos.x - p.mesh.position.x, dz = o.pos.z - p.mesh.position.z;
        if (dx * dx + dz * dz < 6.3 * (spec(o.racerIdx).shellTarget ?? 1) ** 2) { // Zuck (#51): +20% shell-hit RADIUS — the data profile is huge (radius factor, squared for the d² test)
          if (o.starT <= 0) spinKart(o);
          else spawnParticles(p.mesh.position, { count: 8, colors: [0xffe066], speed: 4, life: 0.4, up: 3, gravity: 0 });
          if (p.owner.isPlayer) hitstopT = Math.max(hitstopT, 0.045); // landing a hit should *thunk*
          dead = true; break;
        }
      }
    }
    if (dead) { killProjectile(p); projectiles.splice(i, 1); }
  }
}
function updateBananasAndCollisions(dt) {
  for (let i = bananas.length - 1; i >= 0; i--) {
    const b = bananas[i]; b.age += dt;
    const rim = b.mesh.userData.rim; // armed leak: rim slowly pulses + drips fall while it waits
    if (rim) rim.scale.setScalar(1.6 + Math.sin(elapsed * 3 + i * 1.7) * 0.07);
    if (Math.random() < dt * 1.4) spawnParticles(b.pos, { count: 1, colors: [0x2fb9ff, 0x9be7ff], speed: 0.2, life: 0.4, up: 0.2, gravity: -6 });
    for (const k of karts) {
      if (k === b.owner && b.age < 1.6) continue;
      if (k.ghostT > 0) continue; // ghost floats over the leak — no breach
      const dx = k.pos.x - b.pos.x, dz = k.pos.z - b.pos.z;
      if (dx * dx + dz * dz < 4.6) {
        if (k.starT > 0) { spawnParticles(b.pos, { count: 10, colors: [0x2fb9ff, 0x9be7ff], speed: 4, life: 0.5, up: 3 }); }
        else { if (k.isPlayer) showFeed('💧 DATA BREACH — you hit a leak!'); spawnParticles(b.pos, { count: 24, colors: [0x0e2233, 0x2fb9ff, 0x9be7ff], speed: 6, life: 0.6, up: 6 }); spinKart(k); }
        wfxSplat(b.pos, { color: 0x0a1a2c, r: 3.1, dur: 1.2, op: 0.6 }); // oil-slick splash: burst + a splat that lingers on the road
        wfxRing(b.pos, { r1: 3.4, dur: 0.35, color: 0x2fb9ff, op: 0.8 });
        scene.remove(b.mesh); bananas.splice(i, 1); break;
      }
    }
  }
  for (let a = 0; a < karts.length; a++) for (let c = a + 1; c < karts.length; c++) {
    const A1 = karts[a], B1 = karts[c];
    const dx = B1.pos.x - A1.pos.x, dz = B1.pos.z - A1.pos.z, d2 = dx * dx + dz * dz;
    if (d2 < 11.6 && d2 > 0.0001) {
      const d = Math.sqrt(d2), sep = 3.4 - d, nx = dx / d, nz = dz / d;
      const mA = spec(A1.racerIdx).mass ?? 1, mB = spec(B1.racerIdx).mass ?? 1; // #51: collision mass — Zuck (1.5) shoves, Larry & Sergey (0.75) get shoved; equal masses reproduce the old 50/50 split exactly
      A1.pos.x -= nx * sep * (mB / (mA + mB)); A1.pos.z -= nz * sep * (mB / (mA + mB));
      B1.pos.x += nx * sep * (mA / (mA + mB)); B1.pos.z += nz * sep * (mA / (mA + mB));
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
  const mmPk = playerKart(), revealItems = mmPk && spec(mmPk.racerIdx).revealItems; // Thiel (#51): the Seeing Stone reads every rival's hand
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
    if (revealItems && !k.isPlayer && k.item) { mmCtx.font = '11px serif'; mmCtx.textAlign = 'center'; mmCtx.fillText(ITEMS[k.item].icon, X + 11, Y - 7); } // rival's held item, pinned beside their face
  }
}
function showCenter(text, dur = 1.1) { $('center-msg').textContent = text; centerUntil = elapsed + dur; }
function showToast(text, dur = 2.1) { const t = $('toast'); t.textContent = text; t.style.opacity = 1; toastUntil = elapsed + dur; }
/* Race feed (#48): barks, item grants/effects and position changes live in a
   compact stack anchored to the TOP edge under the button row — max 2 entries,
   auto-fading. The middle of the screen belongs to the race in every layout,
   so nothing informational lives there (PR #38's centred column put this feed
   at 50-65% screen height on landscape phones). Center screen is reserved for
   countdown / GO! / lap banners / finish; the top toast keeps only settings
   confirmations and countdown rocket-start hints. Item pickup descriptions
   are feed entries with kind 'desc' (gold styling), not a separate toast. */
const feedEntries = [];
function showFeed(html, kind = '') {
  const box = $('race-feed'); if (!box) return;
  const el = document.createElement('div');
  el.className = 'feed-item' + (kind ? ' ' + kind : '');
  el.innerHTML = html;
  box.appendChild(el);
  feedEntries.push({ el, until: elapsed + 2.8, out: false });
  while (box.children.length > 2) { const old = box.firstChild; old.remove(); const i = feedEntries.findIndex(e => e.el === old); if (i >= 0) feedEntries.splice(i, 1); }
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
  if (p.item) { $('item-icon').innerHTML = `<img class="slot-ic" src="${ITEMS[p.item].img}" alt="${ITEMS[p.item].name}">`; $('item-name').textContent = ITEMS[p.item].name; slot.classList.add('has-item'); }
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
    const pSpec = spec(p.racerIdx); // #51: the meter's sweet/over zones mirror the PLAYER's actual start window (Elon's is far wider)
    rm.classList.toggle('sweet', revHeld >= (pSpec.startLo ?? 0.45) && revHeld <= (pSpec.startHi ?? 1.7));
    rm.classList.toggle('over', revHeld > (pSpec.startSputter ?? 2.3));
  } else if (!rm.classList.contains('hidden')) rm.classList.add('hidden');
  const rank = rankOf(p);
  $('pos-big').childNodes[0].nodeValue = rank;
  $('pos-suffix').textContent = SUFFIX[rank];
  $('lap-label').textContent = p.finished ? 'FINISHED 🏁' : `LAP ${clamp(Math.floor(Math.max(p.continuous, 0) / N) + 1, 1, LAPS)}/${LAPS}`;
  $('time-label').textContent = fmtTime(raceTime);
  $('best-lap-label').textContent = p.bestLap ? `BEST LAP ${fmtTime(p.bestLap)}` : (p.lastLapTime ? `LAST LAP ${fmtTime(p.lastLapTime)}` : '');
  $('speed-num').textContent = Math.round(Math.abs(p.speed) * 2.2);
  const fill = $('drift-fill');
  fill.style.width = `${clamp(p.driftCharge / orangeAtOf(p) * 100, 0, 100)}%`; // #51: the bar fills to the PLAYER's orange threshold (Bezos fills early)
  fill.style.background = p.driftCharge >= orangeAtOf(p) ? '#ffa53a' : p.driftCharge >= 0.7 ? '#6cf' : 'rgba(255,255,255,.35)';
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
  p.pos.copy(samples[p.sampleIdx]); // samples carry the road elevation now
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
  const moveNub = (rec, dx, dy) => { if (!rec.el) return; if (rec.axis === 'x') dy = 0; else if (rec.axis === 'y') dx = 0; /* #49: nub projected onto the stick's real axis */ const l = Math.hypot(dx, dy), m = l > 34 ? 34 / l : 1; rec.el.firstElementChild.style.transform = `translate(calc(-50% + ${(dx * m).toFixed(1)}px), calc(-50% + ${(dy * m).toFixed(1)}px))`; };
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
    const rec = { zone, ox: e.clientX, oy: e.clientY, t0: performance.now(), maxDrag: 0, el: stickEls[zone] || null, hist: null, flicked: false, flickArmed: false, axis: ZONE_AXIS[zone] || '2d' };
    stickPointers.set(e.pointerId, rec);
    if (zone === 'dpedal') dsLatch.gasToken++; // re-touch inside the grace window: gas was never cut
    if (zone === 'dsteer') dsLatch.steerToken++;
    if (rec.el) { shapeStick(rec.el, rec.axis); rec.el.style.display = 'block'; rec.el.classList.remove('latched'); rec.el.style.left = e.clientX + 'px'; rec.el.style.top = e.clientY + 'px'; moveNub(rec, 0, 0); }
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
  if (currentDef && currentDef.chime === 'xp') [660, 523, 784, 880].forEach((f, i) => A.tone(f, 0.5, 'sine', 0.055, 0, i * 0.14)); // Bliss-only XP start chime (#11)
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
const STAT_COLS = ['#e63946', '#fb8500', '#219ebc']; // FIXED per-stat colours (#18, Roger spec change): SPEED red, ACCELERATION orange, GRIP blue — identical on every racer for readability
function statCols(r) { // fixed stat palette for the pie slices + legend (no longer shades of the racer colour)
  return STAT_COLS;
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
function traitOf(r) { // #51: EVERY racer returns player-perspective special copy — every claim matches a real mechanic (see SPECIALS); AI skill is never mentioned on this screen
  return spec(RACERS.indexOf(r)).copy || '';
}
function updateDetail() {
  const r = RACERS[selectedRacer], p = portraitOf(selectedRacer);
  const bar = (label, v, col) => `<div class="stat-row"><span>${label}</span><div class="stat-track"><div class="stat-fill" style="width:${v / 5 * 100}%;background:${col}"></div></div></div>`;
  const trait = traitOf(r);
  $('detail-media').innerHTML = p ? `<img class="detail-portrait" src="${p}" alt="${r.name} portrait">` : `<div class="detail-portrait detail-emoji" style="background:#${r.color.toString(16).padStart(6, '0')}">${r.emoji}</div>`;
  $('detail-main').innerHTML = `
      <div class="detail-name" id="detail-name">${r.name}</div>
      <div class="racer-title">${r.title}</div>
      <div class="racer-quote">${r.quote}</div>
      ${bar('SPEED', r.spd, STAT_COLS[0])}${bar('ACCELERATION', r.acc, STAT_COLS[1])}${bar('GRIP', r.grip, STAT_COLS[2])}
      ${trait ? `<div class="detail-trait">${trait}</div>` : ''}`;
  if (window.BKTT) BKTT.setRacer(selectedRacer); // polish turntable (desktop detail panel), if active
}
function buildMenu() {
  // Item guide (menu section 6): rendered straight from ITEMS so the plain-
  // language descriptions can never drift from the in-game feed text.
  $('items-legend').innerHTML = Object.values(ITEMS).map(it => `
    <div class="item-row"><img class="item-ic" src="${it.img}" alt="${it.name}"><div><div class="item-name">${it.name}</div><div class="item-desc">${it.desc}</div></div></div>`).join('');
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
      updateStickyBar();
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
      buildWorld(selectedTrack); updateBestInfo(); updateStickyBar();
    });
  });
  document.querySelectorAll('.diff-btn').forEach(btn => {
    btn.addEventListener('mouseenter', hoverTick);
    btn.addEventListener('click', () => {
      A.uiTab();
      difficulty = parseInt(btn.dataset.diff);
      document.querySelectorAll('.diff-btn').forEach(b => b.classList.toggle('selected', parseInt(b.dataset.diff) === difficulty));
      updateDiffDesc();
    });
  });
  updateDiffDesc();
  $('btn-start').addEventListener('click', e => { A.uiSelect(); fxTransition('checker', startRace, { x: e.clientX, y: e.clientY }); });
  $('sb-start').addEventListener('click', e => { A.uiSelect(); fxTransition('checker', startRace, { x: e.clientX, y: e.clientY }); });
  updateStickyBar();
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
  for (const b of itemBoxes) { b.mesh.rotation.y += dt * 1.9; b.mesh.position.y = b.baseY + Math.sin(elapsed * 2.2 + b.phase) * 0.25; }
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
  if (gameState === 'countdown' && currentDef && currentDef.countdownView) {
    const cv = currentDef.countdownView;
    camera.position.set(cv.pos[0], cv.pos[1], cv.pos[2]);
    camera.lookAt(cv.look[0], cv.look[1], cv.look[2]);
    setFov(55, dt);
    sunFollow(sunLight, trackCenter, [80, 130, 60]);
    return;
  }
  camHeading = lerpAngle(camHeading, p.velHeading, clamp((gameState === 'countdown' ? 6 : 3.4) * dt, 0, 1));
  const fwd = forwardVec(camHeading);
  const desired = p.pos.clone().addScaledVector(fwd, -11.9); desired.y = p.pos.y + 4.9; // ART PASS: lower + closer chase (mk frames sit near the kart's shoulder); height rides the elevation
  const kf = clamp(1 - Math.exp(-7 * dt), 0, 1);
  camera.position.x = lerp(camera.position.x, desired.x, kf);
  camera.position.y = lerp(camera.position.y, desired.y, kf);
  camera.position.z = lerp(camera.position.z, desired.z, kf);
  if (shake > 0) { camera.position.x += rand(-1, 1) * shake * 0.8; camera.position.y += rand(-0.5, 0.5) * shake * 0.6; shake = Math.max(0, shake - dt * 1.7); }
  if (gameState === 'racing') { // ART PASS: micro-shake scaled with speed (tasteful — peaks at ~6 cm), boost buzzes a little harder
    const spdN = clamp((Math.abs(p.speed) - 34) / 26, 0, 1), sh = spdN * spdN * 0.05 * (p.boostT > 0 ? 1.7 : 1);
    if (sh > 0.003) { camera.position.x += rand(-1, 1) * sh; camera.position.y += rand(-0.6, 0.6) * sh; }
  }
  const look = p.pos.clone().addScaledVector(fwd, 10.5); look.y = p.pos.y + 1.7;
  camera.lookAt(look);
  // Camera roll: lean WITH the banked road at 0.7x its roll (Mario Kart research
  // reference) — enough to feel the banking in your stomach, not enough to churn it.
  const camBank = bankArr[p.sampleIdx] || 0;
  if (camBank) camera.rotateZ(-camBank * 0.7);
  setFov(62 + clamp(Math.abs(p.speed) / 55, 0, 1) * 8 + (p.boostT > 0 ? 5.5 + Math.sin(elapsed * 9) * 1.1 : 0), dt); // ART PASS: gentler speed curve; the FOV BREATHE lives on boost only
  sunFollow(sunLight, p.pos, currentSunOffset); // ART PASS: per-track sun angle (golden hour stays golden all lap)
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
        if (revHeld > (spec(playerKart().racerIdx).startSputter ?? 2.3) && !revOverWarned) { revOverWarned = true; showToast('🔥 Over-revving! Ease off or you\'ll sputter!', 1.6); } // #51: Elon's over-rev line sits past his wide window
      }
      if (countdownT <= 0) {
        gameState = 'racing'; raceTime = 0; karts.forEach(k => k.lapStart = 0);
        showCenter('GO!', 0.8); A.beep(true);
        const pk = playerKart();
        const pkSpec = spec(pk.racerIdx); // #51: per-racer start window (Elon: 0.30–2.6, rocket 1.35 s, sputter 1.4 s past it)
        if (revHeld >= (pkSpec.startLo ?? 0.45) && revHeld <= (pkSpec.startHi ?? 1.7)) { pk.boostT = pkSpec.rocketBoost ?? 1.15 * boostMulOf(pk); showToast('🚀 ROCKET START!'); A.boostSnd(); }
        else if (revHeld > (pkSpec.startSputter ?? 2.3)) { pk.sputterT = pkSpec.sputterPunish ?? 1.0; showToast('💨 Sputtered start — too much rev!'); A.hit(); }
        for (const k of karts) { if (k.isPlayer) continue; const r = Math.random(); if (spec(k.racerIdx).startHi) { if (r < 0.06) k.sputterT = 0.9; else if (r < 0.6) k.boostT = rand(0.9, 1.3); } else if (r < 0.14) k.sputterT = 0.9; else if (r < 0.5) k.boostT = rand(0.7, 1.05); } // AI gamble too (AI Elon gambles with his wider window)
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
      { // ART PASS: wind-rush particles at speed — still air streaming past the player sells velocity better than any HUD number
        const pk = playerKart();
        if (pk && Math.abs(pk.speed) > 36 && Math.random() < 0.8) {
          const h = pk.heading, sd = Math.random() < 0.5 ? -1 : 1, dd = rand(1.6, 3.4);
          const org = pk.pos.clone();
          org.x += Math.cos(h) * sd * dd; org.z += -Math.sin(h) * sd * dd; org.y += rand(0.3, 1.9);
          spawnParticles(org, { count: 1, colors: [0xffffff], speed: 0.3, life: 0.3, up: 0, gravity: 0, spread: 0.3 });
        }
      }
      if (finishDelay > 0) { finishDelay -= dt; if (finishDelay <= 0) { finishDelay = -1; showResults(); } }
      A.engine(clamp(Math.abs(playerKart().speed) / 55, 0, 1), true);
      A.music(dt, true);
    } else if (gameState === 'finished') {
      spinItemBoxesVisual(dt);
    }
    if (gameState === 'racing' || gameState === 'countdown') updateHUD(dt);
    updateParticles(dt);
    updateWFX(dt);
    for (const fn of trackAnimators) fn(dt, elapsed);
    updateCamera(dt);
    // ART PASS nameplates: near-constant screen size with a hard size cap,
    // distance fade BOTH ways (a rival on top of the camera fades OUT — the
    // giant dark bar in Roger's screenshot — and plates vanish past ~46 m),
    // plus screen-space declutter: stacked rivals stair-step upward.
    const plateList = [];
    for (const k of karts) {
      if (!k.nameSpr) continue;
      const d = camera.position.distanceTo(k.pos);
      const base = k.isPlayer ? 7.4 : 6.9;
      const s = clamp(d / 34, 0.30, 1);
      k.nameSpr.scale.set(base * s, base * 0.25 * s, 1);
      let op = 1;
      if (k.isPlayer) { op = d < 4 ? clamp((d - 2) / 2, 0.25, 1) : 1; k.nameSpr.position.y = 3.7; }
      else {
        if (d > 46) op = 0; else if (d > 36) op = (46 - d) / 10;
        if (d < 6.5) op = Math.min(op, clamp((d - 3) / 3.5, 0, 1));
        if (op > 0.01) plateList.push({ k, d });
      }
      k.nameSpr.material.opacity = op;
      k.nameSpr.visible = op > 0.01;
    }
    plateList.sort((a, b) => a.d - b.d);
    const claimed = [];
    for (const { k } of plateList) {
      const v = k.pos.clone(); v.y += 3.7; v.project(camera);
      let lvl = 0;
      for (const c of claimed) if (Math.abs(c.x - v.x) < 0.17 && Math.abs(c.y - v.y) < 0.12) lvl = Math.max(lvl, c.lvl + 1);
      claimed.push({ x: v.x, y: v.y, lvl });
      k.nameSpr.position.y = 3.7 + Math.min(lvl, 3) * 1.05;
    }
    if (trackFx) {
      const pk = playerKart();
      const lapNow = pk ? clamp(Math.floor(Math.max(pk.continuous, 0) / N) + 1, 1, LAPS) : 1;
      if (trackFx.onLap && lapNow !== lastPlayerLap) { const done = lapNow - 1; lastPlayerLap = lapNow; trackFx.onLap(done); }
      if (trackFx.update) trackFx.update(dt, elapsed);
    }
    refreshTouchUI();
    if (elapsed > centerUntil && $('center-msg').textContent) $('center-msg').textContent = '';
    if (elapsed > toastUntil) $('toast').style.opacity = 0;
    pruneFeed();
    if (elapsed > inkUntil) $('ink-overlay').classList.add('hidden');
  }
  if (!post && scene) { post = createPost(renderer, scene, camera); post.applyQuality(localStorage.getItem('bk-quality') || 'auto', { sun: sunLight }); } // lazy: scene is persistent, so the composer's RenderPass stays valid across rebuilds
  if (scene && currentDef && currentDef.tick) currentDef.tick(dt, elapsed);
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
      state: gameState, paused, raceTime, revHeld, countdownT, // #51: revHeld/countdownT exposed for the rocket-window measurement
      touch: { steer: touchAnalog.steer, throttle: touchAnalog.throttle, brake: touchAnalog.brake },
      player: p ? { pos: [p.pos.x, p.pos.y, p.pos.z], continuous: p.continuous, speed: p.speed, lap: clamp(Math.floor(Math.max(p.continuous, 0) / N) + 1, 1, LAPS), rank: rankOf(p), finished: p.finished, finishTime: p.finishTime, item: p.item, heading: p.heading, drifting: p.drifting, driftCharge: p.driftCharge, bailoutT: p.bailoutT, ghostT: p.ghostT, hornT: p.hornT, goldenT: p.goldenT, inkT: p.inkT, spinT: p.spinT, shrinkT: p.shrinkT, starT: p.starT, boostT: p.boostT, sputterT: p.sputterT, shieldUsed: p.shieldUsed, driftStreak: p.driftStreak, offFactor: p.offFactor } : null, // #51: special-trait timers/flags for the specials measurement pass
      karts: karts.map(k => ({ name: k.racer.name, continuous: k.continuous, speed: k.speed, finished: k.finished, pos: [k.pos.x, k.pos.z], item: k.item, spinT: k.spinT, shrinkT: k.shrinkT, inkT: k.inkT })),
    };
  },
  giveItem(id) { const p = playerKart(); if (p && ITEMS[id]) { p.item = id; updateItemSlot(); return true; } return false; },
  spin() { const p = playerKart(); if (p) { spinKart(p); return p.spinT; } return -1; }, // #51 measurement: force a spin-out hit on the player (shield/recovery checks)
  traits() { return RACERS.map(r => ({ name: r.name, trait: traitOf(r), quote: r.quote })); }, // #51 measurement: name + exact select-screen trait copy + quote for all 17
  specs() { return SPECIALS.map(s => ({ ...s })); }, // #51 measurement: the numeric slate as shipped
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
  track3d() { // TRACK 3D proof surface: the authored profiles as baked into the world
    return {
      elevAt: u => elevArr[wrapIdx(Math.round(u * N))],
      bankDegAt: u => bankArr[wrapIdx(Math.round(u * N))] * 180 / Math.PI,
      roadYAt: (u, lat) => roadYAt(wrapIdx(Math.round(u * N)), lat),
      segLen,
    };
  },
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
    R = { r, sc, cam, grp, hold, cv };
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
    const media = $('detail-media');
    if (R.cv.parentNode !== media) media.appendChild(R.cv); // renderDetail() rewrites #detail-media innerHTML per selection, detaching the stage canvas — re-attach, or the turntable goes blank after the first racer change
    const w = media.clientWidth, h = media.clientHeight;
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
updateSchemeHelp(touchScheme);
animate();
if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
  navigator.serviceWorker.register('sw.js').catch(() => { });
}
