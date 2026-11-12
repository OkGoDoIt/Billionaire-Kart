/* Audio: synthesized engine, drift, and boost loops per local player; one-shot
   effects (generated samples when present, synthesized otherwise); announcer
   lines; and looping music with crossfades and a final-lap lift. */
import { SAMPLES, MUSIC, VOICE } from '../content/audio-manifest.js';
import { clamp, makeRng, hashString } from '../core/util.js';

const NOTE = n => 440 * Math.pow(2, (n - 69) / 12);
/* A tenth of a second of silence as a WAV file, for the iPhone playback-category workaround. */
const SILENT_WAV = (() => {
  const n = 800, b = new Uint8Array(44 + n), v = new DataView(b.buffer), str = (o, t) => { for (let i = 0; i < t.length; i++) b[o + i] = t.charCodeAt(i); };
  str(0, 'RIFF'); v.setUint32(4, 36 + n, true); str(8, 'WAVEfmt '); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
  v.setUint32(24, 8000, true); v.setUint32(28, 8000, true); v.setUint16(32, 1, true); v.setUint16(34, 8, true); str(36, 'data'); v.setUint32(40, n, true); b.fill(128, 44);
  let bin = ''; for (const x of b) bin += String.fromCharCode(x);
  return 'data:audio/wav;base64,' + (typeof btoa === 'function' ? btoa(bin) : '');
})();

export class AudioEngine {
  constructor(save) {
    this.save = save; this.ctx = null; this.muted = false; this.buffers = new Map(); this.loading = new Map();
    this.vol = { music: save.settings.music, sfx: save.settings.sfx };
    this.loops = []; this.musicId = null; this.musicNodes = []; this.musicRate = 1; this.seq = null; this.lastVoiceT = 0; this.cool = new Map();
  }

  /** Create or resume the context. Browsers only allow this after a user gesture, and iPhones only
      count the end of a touch (touchend, pointerup, click), so this is called from all of them. */
  unlock() {
    this._playbackSession();
    if (this.ctx) {
      // 'interrupted' is what an iPhone reports after a call, Siri, or a trip to another app
      if (this.ctx.state !== 'running') this.ctx.resume?.().catch(() => {});
      if (!this.kicked && this.ctx.state === 'running') this._kick();
      return;
    }
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
    const ctx = this.ctx = new AC({ latencyHint: 'interactive' });
    this.master = ctx.createGain(); this.comp = ctx.createDynamicsCompressor();
    this.comp.threshold.value = -14; this.comp.ratio.value = 5; this.comp.attack.value = 0.004; this.comp.release.value = 0.18;
    this.master.connect(this.comp); this.comp.connect(ctx.destination);
    this.sfx = ctx.createGain(); this.mus = ctx.createGain(); this.sfx.connect(this.master); this.mus.connect(this.master);
    // one second of white noise shared by every noise-based sound
    const nb = this.noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate), d = nb.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    this.setVolumes(this.vol.music, this.vol.sfx);
    for (const name of ['ui_move', 'ui_select', 'coin', 'item_box', 'boost', 'hit', 'count', 'go']) this.load(name);
    if (ctx.state !== 'running') ctx.resume?.().catch(() => {});
    ctx.addEventListener?.('statechange', () => { if (ctx.state === 'running' && !this.kicked) this._kick(); });
    this._kick();
    if (this.pendingMusic) { const id = this.pendingMusic; this.pendingMusic = null; this.music(id); }
  }
  /** An iPhone plays web audio as "ambient" sound, which the ring/silent switch mutes. A game the player
      started on purpose should be heard, so ask for the playback category: through the audio session
      where the browser has one, and by keeping a silent media element playing where it does not. */
  _playbackSession() {
    if (this.sessionSet) return;
    try {
      if (navigator.audioSession) { navigator.audioSession.type = 'playback'; this.sessionSet = true; return; }
      const apple = /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
      if (!apple) { this.sessionSet = true; return; }
      const a = this.silent || (this.silent = Object.assign(document.createElement('audio'), { loop: true, preload: 'auto', src: SILENT_WAV }));
      a.setAttribute('playsinline', ''); a.setAttribute('x-webkit-airplay', 'deny');
      a.play().then(() => { this.sessionSet = true; }).catch(() => {});   // refused outside a gesture: the next one tries again
    } catch { /* not supported here */ }
  }
  /** One silent sample, started inside the gesture: older iPhones only start the clock once something has played. */
  _kick() {
    try { const s = this.ctx.createBufferSource(); s.buffer = this.ctx.createBuffer(1, 1, 22050); s.connect(this.ctx.destination); s.start(0); this.kicked = this.ctx.state === 'running'; } catch { /* nothing to do */ }
  }
  /** Coming back to the tab: pick the sound back up if the browser lets us without a new gesture. */
  resumeIfAllowed() { if (this.ctx && this.ctx.state !== 'running') this.ctx.resume?.().catch(() => {}); this.silent?.play?.().catch(() => {}); }
  /** The tab went to the background: stop making sound until it is back. */
  suspend() { if (this.ctx?.state === 'running') this.ctx.suspend?.().catch(() => {}); this.silent?.pause?.(); }
  get t() { return this.ctx.currentTime; }
  setVolumes(music, sfx) { this.vol.music = music; this.vol.sfx = sfx; if (!this.ctx) return; this.sfx.gain.value = this.muted ? 0 : sfx; this.mus.gain.value = this.muted ? 0 : music * 0.55; }
  toggleMute() { this.muted = !this.muted; this.setVolumes(this.vol.music, this.vol.sfx); }

  /* ---------- samples ---------- */
  load(name) {
    const url = SAMPLES[name] || VOICE[name]; if (!url || !this.ctx) return Promise.resolve(null);
    if (this.buffers.has(name)) return Promise.resolve(this.buffers.get(name));
    if (!this.loading.has(name)) this.loading.set(name, fetch(url).then(r => r.arrayBuffer()).then(b => this.ctx.decodeAudioData(b)).then(buf => { this.buffers.set(name, buf); return buf; }).catch(() => null));
    return this.loading.get(name);
  }
  preload(names) { for (const n of names) this.load(n); }
  /** Play a sample if it is loaded. Returns true if it played. */
  sample(name, { vol = 1, rate = 1, pan = 0, delay = 0, bus = null } = {}) {
    if (!this.ctx) return false;
    const buf = this.buffers.get(name); if (!buf) { this.load(name); return false; }
    const s = this.ctx.createBufferSource(); s.buffer = buf; s.playbackRate.value = rate;
    const g = this.ctx.createGain(); g.gain.value = vol;
    let node = g;
    if (pan && this.ctx.createStereoPanner) { const p = this.ctx.createStereoPanner(); p.pan.value = clamp(pan, -1, 1); g.connect(p); node = p; }
    s.connect(g); node.connect(bus || this.sfx); s.start(this.t + delay);
    return true;
  }

  /* ---------- synthesis helpers ---------- */
  tone({ type = 'sine', f = 440, f1 = null, dur = 0.15, vol = 0.2, attack = 0.005, delay = 0, pan = 0, curve = 'exp' }) {
    const c = this.ctx, t0 = this.t + delay, o = c.createOscillator(), g = c.createGain();
    o.type = type; o.frequency.setValueAtTime(f, t0);
    if (f1 != null) { if (curve === 'exp') o.frequency.exponentialRampToValueAtTime(Math.max(1, f1), t0 + dur); else o.frequency.linearRampToValueAtTime(f1, t0 + dur); }
    g.gain.setValueAtTime(0.0001, t0); g.gain.linearRampToValueAtTime(vol, t0 + attack); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    let node = g; if (pan && c.createStereoPanner) { const p = c.createStereoPanner(); p.pan.value = clamp(pan, -1, 1); g.connect(p); node = p; }
    o.connect(g); node.connect(this.sfx); o.start(t0); o.stop(t0 + dur + 0.02);
  }
  noise({ dur = 0.2, vol = 0.2, type = 'bandpass', f = 1000, f1 = null, q = 1, attack = 0.004, delay = 0, pan = 0 }) {
    const c = this.ctx, t0 = this.t + delay, s = c.createBufferSource(), fl = c.createBiquadFilter(), g = c.createGain();
    s.buffer = this.noiseBuf; s.loop = true; fl.type = type; fl.Q.value = q; fl.frequency.setValueAtTime(f, t0);
    if (f1 != null) fl.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t0 + dur);
    g.gain.setValueAtTime(0.0001, t0); g.gain.linearRampToValueAtTime(vol, t0 + attack); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    let node = g; if (pan && c.createStereoPanner) { const p = c.createStereoPanner(); p.pan.value = clamp(pan, -1, 1); g.connect(p); node = p; }
    s.connect(fl); fl.connect(g); node.connect(this.sfx); s.start(t0, Math.random() * 0.5); s.stop(t0 + dur + 0.03);
  }
  arp(notes, { type = 'triangle', step = 0.07, dur = 0.14, vol = 0.16, delay = 0, pan = 0 } = {}) { notes.forEach((n, i) => this.tone({ type, f: NOTE(n), dur, vol, delay: delay + i * step, pan })); }

  /** Play a named effect: the generated sample if there is one, otherwise the synthesized version. */
  play(name, o = {}) {
    if (!this.ctx || this.muted) return;
    // per-sound cooldown so eight karts cannot stack the same effect in one frame
    const now = this.t, last = this.cool.get(name) || 0, gap = o.gap ?? 0.04;
    if (now - last < gap) return; this.cool.set(name, now);
    const vol = o.vol ?? 1, pan = o.pan ?? 0;
    if (this.sample(name, { vol: vol * (o.sampleVol ?? 0.9), rate: o.rate ?? 1, pan })) return;
    const S = SYNTH[name]; if (S) S(this, vol, pan, o);
  }
  ui(kind) { this.play('ui_' + kind, { vol: 0.8 }); }

  /* ---------- announcer ---------- */
  say(line, { delay = 0, force = false } = {}) {
    if (!this.ctx || this.muted || !VOICE[line]) return;
    if (!force && this.t - this.lastVoiceT < 1.2) return;
    this.lastVoiceT = this.t + delay;
    if (!this.sample(line, { vol: 1.15, delay })) this.load(line).then(b => { if (b && this.t - this.lastVoiceT < 0.6) this.sample(line, { vol: 1.15 }); });
  }

  /* ---------- continuous kart loops ---------- */
  _makeLoop() {
    const c = this.ctx, out = c.createGain(); out.gain.value = 0; out.connect(this.sfx);
    // engine: two detuned saws and a sub, through a low-pass that opens with revs, chopped by a "putt" tremolo
    const o1 = c.createOscillator(), o2 = c.createOscillator(), sub = c.createOscillator(), lp = c.createBiquadFilter(), eg = c.createGain(), trem = c.createOscillator(), tg = c.createGain();
    o1.type = 'sawtooth'; o2.type = 'sawtooth'; sub.type = 'square'; lp.type = 'lowpass'; lp.Q.value = 2.5; eg.gain.value = 0.5;
    trem.type = 'sawtooth'; tg.gain.value = 0.28; trem.connect(tg); tg.connect(eg.gain);
    const sg = c.createGain(); sg.gain.value = 0.5;
    o1.connect(lp); o2.connect(lp); sub.connect(sg); sg.connect(lp); lp.connect(eg); eg.connect(out);
    // tyres: band-passed noise for drifting; low rumble off the road; wind at speed; jet for boosts
    const mkNoise = (type, f, q) => { const s = c.createBufferSource(); s.buffer = this.noiseBuf; s.loop = true; const fl = c.createBiquadFilter(); fl.type = type; fl.frequency.value = f; fl.Q.value = q; const g = c.createGain(); g.gain.value = 0; s.connect(fl); fl.connect(g); g.connect(this.sfx); s.start(0, Math.random()); return { s, fl, g }; };
    const L = { out, o1, o2, sub, lp, trem, drift: mkNoise('bandpass', 2400, 5), rumble: mkNoise('lowpass', 220, 0.7), wind: mkNoise('highpass', 2600, 0.5), jet: mkNoise('bandpass', 700, 0.8), rev: 0 };
    for (const o of [o1, o2, sub, trem]) o.start();
    return L;
  }
  _killLoops() { for (const L of this.loops) { for (const o of [L.o1, L.o2, L.sub, L.trem]) { try { o.stop(); } catch { /* already stopped */ } } for (const n of [L.drift, L.rumble, L.wind, L.jet]) { try { n.s.stop(); } catch { /* already stopped */ } n.g.disconnect(); } L.out.disconnect(); } this.loops = []; }

  /** Per rendered frame during a race. */
  frame(dt, race, view) {
    if (!this.ctx) return;
    const players = race.players, quiet = race.state === 'done' || this.pausedLoops;
    while (this.loops.length < players.length) this.loops.push(this._makeLoop());
    while (this.loops.length > players.length) { const L = this.loops.pop(); this.loops.push(L); this._killLoops(); }
    const t = this.t, n = Math.max(1, players.length), k1 = 1 / Math.sqrt(n);
    players.forEach((k, i) => {
      const L = this.loops[i], pan = n === 1 ? 0 : (i % 2 ? 0.35 : -0.35);
      const sp = clamp(k.speed / k.baseTop, 0, 1.6), on = !quiet && k.rescueT <= 0;
      // revs chase speed, with a blip when revving on the grid and a lift in the air
      const target = race.frozen ? (k.revving ? 0.75 + Math.sin(t * 22) * 0.08 : 0.12) : clamp(sp * 0.85 + (k.grounded ? 0 : 0.18) + (k.boostT > 0 ? 0.2 : 0), 0.1, 1.5);
      L.rev += (target - L.rev) * Math.min(1, dt * 7);
      const f = 52 + L.rev * 150;
      L.o1.frequency.setTargetAtTime(f, t, 0.03); L.o2.frequency.setTargetAtTime(f * 1.008 + 1, t, 0.03); L.sub.frequency.setTargetAtTime(f * 0.5, t, 0.03);
      L.trem.frequency.setTargetAtTime(f * 0.5, t, 0.03);
      L.lp.frequency.setTargetAtTime(380 + L.rev * 1900, t, 0.05);
      L.out.gain.setTargetAtTime(on ? (0.085 + L.rev * 0.05) * k1 * (k.shrinkT > 0 ? 0.6 : 1) : 0, t, 0.06);
      if (k.shrinkT > 0) { L.o1.frequency.setTargetAtTime(f * 1.6, t, 0.03); L.o2.frequency.setTargetAtTime(f * 1.61, t, 0.03); }
      const drifting = on && k.drifting && k.grounded;
      L.drift.g.gain.setTargetAtTime(drifting ? (0.06 + k.driftTier * 0.02) * k1 : 0, t, 0.05);
      L.drift.fl.frequency.setTargetAtTime(2000 + k.driftTier * 700 + Math.sin(t * 30) * 150, t, 0.05);
      const off = on && k.grounded && (k.surface.offroad || k.surface.rumble > 0.3);
      L.rumble.g.gain.setTargetAtTime(off ? 0.22 * clamp(sp, 0, 1) * k1 : 0, t, 0.08);
      L.wind.g.gain.setTargetAtTime(on ? 0.03 * clamp(sp - 0.5, 0, 1) * k1 : 0, t, 0.1);
      L.jet.g.gain.setTargetAtTime(on && (k.boostT > 0 || k.bulletT > 0) ? 0.16 * k1 : 0, t, 0.05);
      L.jet.fl.frequency.setTargetAtTime(600 + sp * 500, t, 0.1);
      void pan;
    });
    // final-lap lift and hype-cycle shimmer on the music
    const lead = players[0];
    const want = lead && !lead.finished && lead.lap >= race.laps && race.laps > 1 ? 1.1 : 1;
    if (want !== this.musicRate) this.setMusicRate(want);
    void view;
  }
  stopLoops() { if (this.ctx) this._killLoops(); }

  /* ---------- events from the game ---------- */
  kartEvent(e, kart, local) {
    if (!this.ctx) return;
    const v = local ? 1 : this._nearness(kart); if (v <= 0.02) return;
    switch (e.type) {
      case 'coin': if (local) this.play('coin', { rate: 1 + Math.min(kart.coins, 10) * 0.02 }); break;
      case 'hop': if (local) this.play('hop', { vol: 0.6 }); break;
      case 'land': if (local && e.data > 5) this.play('land', { vol: clamp(e.data / 18, 0.3, 1) }); break;
      case 'driftTier': if (local && e.data > 0) this.play('tier' + e.data); break;
      case 'miniTurbo': this.play('miniturbo', { vol: v, rate: 0.9 + e.data * 0.1 }); break;
      case 'boost': if (e.data !== 'mini') this.play('boost', { vol: v * 0.9 }); break;
      case 'trick': if (local) this.play('trick'); break;
      case 'rocketStart': if (local) { this.play('boost'); this.say(e.data >= 1 ? 'rocket_start' : 'nice_start'); } break;
      case 'burnout': if (local) this.play('burnout'); break;
      case 'hit': this.play(e.data.kind === 'tumble' ? 'hit_big' : e.data.kind === 'zap' ? 'zap' : 'hit', { vol: v }); if (local) this.play('spin', { vol: 0.7 }); break;
      case 'wall': this.play('wall', { vol: v * clamp(e.data.v / 14, 0.3, 1) }); break;
      case 'bump': this.play('bump', { vol: v * clamp(e.data.v / 10, 0.3, 1) }); break;
      case 'roulette': if (local) this.play('roulette'); break;
      case 'itemReady': if (local) this.play('item_ready'); break;
      case 'itemUse': this.play(USE_SOUND[e.data] || 'item_use', { vol: v }); break;
      case 'shieldBlock': this.play('block', { vol: v }); break;
      case 'incoming': if (local) this.play('warning', { gap: 0.8 }); break;
      case 'rescue': if (local) this.play('rescue'); break;
      case 'inked': if (local) this.play('ink'); break;
      case 'robbed': if (local) this.play('steal'); break;
      case 'lap': if (local && e.data > 1 && e.data <= kart.race.laps) { this.play('lap'); if (e.data === kart.race.laps) this.say('final_lap', { force: true }); } break;
      case 'finish': if (local) { this.play(e.data <= 3 ? 'finish_good' : 'finish'); this.say(e.data === 1 ? 'winner' : 'finish', { force: true, delay: 0.4 }); } break;
      case 'rankUp': if (local && kart.race.time > 4) { this.play('rank_up', { vol: 0.5 }); if (e.data === 1) this.say('first_place'); } break;
      case 'rankDown': if (local && kart.race.time > 4) this.play('rank_down', { vol: 0.4 }); break;
      case 'draft': if (local) this.play('boost', { vol: 0.6, rate: 1.2 }); break;
    }
  }
  raceEvent(e, race) {
    if (!this.ctx) return;
    switch (e.type) {
      case 'count': this.play('count', { gap: 0.3 }); this.say('count_' + e.data, { force: true }); break;
      case 'go': this.play('go'); this.say('go', { force: true }); this.play('crowd', { vol: 0.5 }); break;
      case 'boxBreak': this.play('item_box', { vol: e.data.kart.isPlayer ? 1 : this._nearness(e.data.kart) * 0.7 }); break;
      case 'explosion': this.play('explosion', { vol: this._nearPoint(race, e.data.x, e.data.z, 90) }); break;
      case 'lightning': this.play('lightning'); break;
      case 'shock': this.play('shock', { vol: this._nearPoint(race, e.data.x, e.data.z, 70) }); break;
      case 'ink': this.play('ink', { vol: 0.6 }); break;
      case 'blueArrive': if (e.data.target.isPlayer) this.play('warning', { rate: 1.3, gap: 0.5 }); break;
      case 'shotBounce': this.play('bounce', { vol: this._nearPoint(race, e.data.x, e.data.z, 40) * 0.6 }); break;
    }
  }
  event(name, data) {
    if (!this.ctx) return;
    if (name === 'pause') { this.pausedLoops = true; this.play('ui_back'); this.mus.gain.setTargetAtTime(this.muted ? 0 : this.vol.music * 0.2, this.t, 0.1); }
    else if (name === 'resume') { this.pausedLoops = false; this.mus.gain.setTargetAtTime(this.muted ? 0 : this.vol.music * 0.55, this.t, 0.1); }
    else if (name === 'results') { this.stopLoops(); this.setMusicRate(1); if (data === 1) this.say('you_win', { delay: 0.3 }); }
    else if (name === 'podium') { this.play('finish_good'); this.say(data === 1 ? 'champion' : 'cup_over', { force: true, delay: 0.5 }); }
    else if (name === 'introStart') { this.stopLoops(); this.pausedLoops = false; }
    else if (name === 'countdownStart') { this.pausedLoops = false; }
  }
  racerPicked(r) { this.play('ui_select'); void r; }
  _nearness(kart) { const race = kart.race; return this._nearPoint(race, kart.x, kart.z, 45); }
  _nearPoint(race, x, z, range) { let best = 1e9; for (const p of race.players) best = Math.min(best, Math.hypot(p.x - x, p.z - z)); if (!race.players.length) return 0; return clamp(1 - best / range, 0, 1); }

  /* ---------- music ---------- */
  music(id) {
    if (!this.ctx) { this.pendingMusic = id; return; }
    if (id === this.musicId) return;
    this.musicId = id; this.musicRate = 1;
    const old = this.musicNodes, t = this.t;
    for (const n of old) { n.g.gain.cancelScheduledValues(t); n.g.gain.setTargetAtTime(0, t, 0.25); setTimeout(() => { try { n.s.stop(); } catch { /* done */ } }, 1500); }
    this.musicNodes = []; this.seq?.stop(); this.seq = null; clearTimeout(this.loopTimer);
    if (!id) return;
    const url = MUSIC[id] || (MUSIC.default && !MUSIC[id] ? null : null);
    if (!url) { this.seq = new Sequencer(this, id); this.seq.start(); return; }
    const key = 'music:' + id;
    const start = buf => { if (this.musicId !== id || !buf) { if (!buf && this.musicId === id) { this.seq = new Sequencer(this, id); this.seq.start(); } return; } this._loopMusic(buf, id); };
    if (this.buffers.has(key)) start(this.buffers.get(key));
    else fetch(url).then(r => r.arrayBuffer()).then(b => this.ctx.decodeAudioData(b)).then(buf => { this.buffers.set(key, buf); for (const k of [...this.buffers.keys()]) if (k.startsWith('music:') && k !== key && k !== 'music:menu') this.buffers.delete(k); start(buf); }).catch(() => start(null));
  }
  /** Loop a buffer with a short crossfade at the seam, so any piece of music loops cleanly. */
  _loopMusic(buf, id) {
    const XF = 1.2, c = this.ctx;
    const playOnce = when => {
      if (this.musicId !== id) return;
      const s = c.createBufferSource(), g = c.createGain(); s.buffer = buf; s.playbackRate.value = this.musicRate;
      const len = buf.duration / this.musicRate;
      g.gain.setValueAtTime(0, when); g.gain.linearRampToValueAtTime(1, when + XF * 0.6);
      g.gain.setValueAtTime(1, when + len - XF); g.gain.linearRampToValueAtTime(0, when + len);
      s.connect(g); g.connect(this.mus); s.start(when);
      const node = { s, g, when, len }; this.musicNodes.push(node); if (this.musicNodes.length > 3) this.musicNodes.shift();
      this.loopTimer = setTimeout(() => playOnce(when + len - XF), Math.max(50, (when + len - XF - c.currentTime - 0.6) * 1000));
    };
    playOnce(this.t + 0.05);
  }
  setMusicRate(r) {
    this.musicRate = r; if (!this.ctx) return;
    for (const n of this.musicNodes) n.s.playbackRate.setTargetAtTime(r, this.t, 0.3);
    if (this.seq) this.seq.rate = r;
    // re-time the next loop: simplest is to restart the scheduling from the current node
    const cur = this.musicNodes[this.musicNodes.length - 1];
    if (cur && this.musicId && this.buffers.has('music:' + this.musicId)) {
      clearTimeout(this.loopTimer);
      const played = (this.t - cur.when) * 1, remain = Math.max(0.5, (cur.s.buffer.duration - played) / r), id = this.musicId, buf = cur.s.buffer;
      cur.g.gain.cancelScheduledValues(this.t); cur.g.gain.setValueAtTime(1, this.t); cur.g.gain.setValueAtTime(1, this.t + remain - 1.2); cur.g.gain.linearRampToValueAtTime(0, this.t + remain);
      this.loopTimer = setTimeout(() => { if (this.musicId === id) this._loopMusic(buf, id); }, Math.max(50, (remain - 1.2 - 0.3) * 1000));
    }
  }
}

const USE_SOUND = { boost: 'boost', boost3: 'boost', golden: 'boost', leak: 'drop', pinkslip: 'throw', subpoena: 'throw', subpoena3: 'throw', tweet: 'tweet', antitrust: 'siren', star: 'star', crash: 'lightning', pr: 'shock', smear: 'ink', insider: 'ghost', bailout: 'rocket', dividend: 'coin' };

/* Synthesized versions of every effect, used until a generated sample exists (and as a fallback offline). */
const SYNTH = {
  ui_move: a => a.tone({ type: 'triangle', f: 660, f1: 880, dur: 0.06, vol: 0.12 }),
  ui_select: a => { a.tone({ type: 'triangle', f: 660, dur: 0.08, vol: 0.16 }); a.tone({ type: 'triangle', f: 990, dur: 0.14, vol: 0.16, delay: 0.07 }); },
  ui_back: a => a.tone({ type: 'triangle', f: 520, f1: 330, dur: 0.12, vol: 0.14 }),
  ui_start: a => a.arp([72, 76, 79, 84], { step: 0.06, dur: 0.2, vol: 0.18 }),
  coin: (a, v, p, o) => { const r = o.rate || 1; a.tone({ type: 'square', f: 988 * r, dur: 0.07, vol: 0.1 * v }); a.tone({ type: 'square', f: 1319 * r, dur: 0.22, vol: 0.1 * v, delay: 0.07 }); },
  hop: (a, v) => a.tone({ type: 'sine', f: 300, f1: 620, dur: 0.1, vol: 0.14 * v }),
  land: (a, v) => { a.tone({ type: 'sine', f: 150, f1: 50, dur: 0.16, vol: 0.4 * v }); a.noise({ dur: 0.1, vol: 0.15 * v, type: 'lowpass', f: 900, f1: 200 }); },
  tier1: a => a.tone({ type: 'square', f: 880, f1: 1320, dur: 0.1, vol: 0.09 }),
  tier2: a => a.tone({ type: 'square', f: 1100, f1: 1760, dur: 0.11, vol: 0.1 }),
  tier3: a => { a.tone({ type: 'square', f: 1320, f1: 2200, dur: 0.12, vol: 0.11 }); a.tone({ type: 'square', f: 1760, f1: 2640, dur: 0.12, vol: 0.08, delay: 0.05 }); },
  miniturbo: (a, v) => { a.noise({ dur: 0.35, vol: 0.2 * v, type: 'bandpass', f: 500, f1: 3500, q: 1.5 }); a.tone({ type: 'sawtooth', f: 220, f1: 880, dur: 0.25, vol: 0.1 * v }); },
  boost: (a, v) => { a.noise({ dur: 0.7, vol: 0.3 * v, type: 'bandpass', f: 300, f1: 4200, q: 1.2 }); a.tone({ type: 'sawtooth', f: 160, f1: 720, dur: 0.45, vol: 0.14 * v }); },
  trick: a => a.arp([76, 81, 88], { type: 'square', step: 0.05, dur: 0.1, vol: 0.09 }),
  burnout: a => a.noise({ dur: 0.8, vol: 0.25, type: 'bandpass', f: 1400, f1: 500, q: 3 }),
  hit: (a, v) => { a.tone({ type: 'square', f: 420, f1: 90, dur: 0.3, vol: 0.2 * v }); a.noise({ dur: 0.2, vol: 0.3 * v, type: 'lowpass', f: 2400, f1: 300 }); },
  hit_big: (a, v) => { a.tone({ type: 'sawtooth', f: 300, f1: 40, dur: 0.6, vol: 0.25 * v }); a.noise({ dur: 0.5, vol: 0.4 * v, type: 'lowpass', f: 3000, f1: 150 }); },
  spin: a => { for (let i = 0; i < 4; i++) a.tone({ type: 'triangle', f: 900 - i * 120, f1: 500 - i * 60, dur: 0.16, vol: 0.08, delay: i * 0.17 }); },
  zap: (a, v) => a.noise({ dur: 0.25, vol: 0.3 * v, type: 'highpass', f: 3000, q: 4 }),
  wall: (a, v) => { a.noise({ dur: 0.14, vol: 0.35 * v, type: 'bandpass', f: 900, q: 2 }); a.tone({ type: 'square', f: 130, f1: 60, dur: 0.12, vol: 0.2 * v }); },
  bump: (a, v) => a.tone({ type: 'sine', f: 240, f1: 90, dur: 0.12, vol: 0.3 * v }),
  roulette: a => { for (let i = 0; i < 12; i++) a.tone({ type: 'square', f: 700 + (i % 4) * 160, dur: 0.05, vol: 0.06, delay: i * 0.09 }); },
  item_box: (a, v) => { a.noise({ dur: 0.18, vol: 0.2 * v, type: 'highpass', f: 4000 }); a.arp([84, 88, 91, 96], { step: 0.035, dur: 0.12, vol: 0.1 * v }); },
  item_ready: a => a.arp([79, 84, 91], { type: 'square', step: 0.06, dur: 0.16, vol: 0.11 }),
  item_use: (a, v) => a.noise({ dur: 0.25, vol: 0.2 * v, type: 'bandpass', f: 800, f1: 2600, q: 2 }),
  drop: (a, v) => a.tone({ type: 'sine', f: 520, f1: 180, dur: 0.2, vol: 0.2 * v }),
  throw: (a, v) => a.noise({ dur: 0.3, vol: 0.25 * v, type: 'bandpass', f: 600, f1: 3000, q: 2.5 }),
  tweet: (a, v) => { for (let i = 0; i < 3; i++) a.tone({ type: 'sine', f: 2200 + i * 300, f1: 3000 + i * 300, dur: 0.07, vol: 0.12 * v, delay: i * 0.08 }); },
  siren: (a, v) => { for (let i = 0; i < 4; i++) a.tone({ type: 'sawtooth', f: i % 2 ? 620 : 880, dur: 0.16, vol: 0.12 * v, delay: i * 0.16 }); },
  star: a => a.arp([72, 76, 79, 84, 88, 91, 96], { type: 'square', step: 0.05, dur: 0.12, vol: 0.1 }),
  lightning: a => { a.noise({ dur: 0.7, vol: 0.5, type: 'lowpass', f: 6000, f1: 200 }); a.tone({ type: 'sawtooth', f: 90, f1: 30, dur: 0.8, vol: 0.3 }); },
  shock: (a, v) => { a.tone({ type: 'sawtooth', f: 180, f1: 700, dur: 0.3, vol: 0.25 * v }); a.noise({ dur: 0.35, vol: 0.25 * v, type: 'bandpass', f: 1200, f1: 300, q: 1 }); },
  explosion: (a, v) => { a.noise({ dur: 0.9, vol: 0.6 * v, type: 'lowpass', f: 2600, f1: 80 }); a.tone({ type: 'sine', f: 110, f1: 30, dur: 0.7, vol: 0.5 * v }); },
  ink: (a, v) => a.noise({ dur: 0.3, vol: 0.3 * v, type: 'lowpass', f: 1200, f1: 200, q: 3 }),
  ghost: a => a.tone({ type: 'sine', f: 400, f1: 900, dur: 0.5, vol: 0.15, curve: 'lin' }),
  rocket: a => { a.noise({ dur: 1.2, vol: 0.35, type: 'bandpass', f: 200, f1: 2600, q: 0.8 }); a.tone({ type: 'sawtooth', f: 80, f1: 400, dur: 1.0, vol: 0.2 }); },
  steal: a => a.arp([84, 79, 76, 72], { step: 0.06, dur: 0.12, vol: 0.12 }),
  block: (a, v) => a.tone({ type: 'square', f: 1400, f1: 700, dur: 0.12, vol: 0.14 * v }),
  bounce: (a, v) => a.tone({ type: 'sine', f: 500, f1: 800, dur: 0.07, vol: 0.14 * v }),
  warning: (a, v, p, o) => { const r = o.rate || 1; for (let i = 0; i < 3; i++) a.tone({ type: 'square', f: 1250 * r, dur: 0.08, vol: 0.12, delay: i * 0.16 }); },
  rescue: a => a.tone({ type: 'triangle', f: 700, f1: 200, dur: 0.6, vol: 0.16, curve: 'lin' }),
  count: a => a.tone({ type: 'square', f: 440, dur: 0.22, vol: 0.2 }),
  go: a => { a.tone({ type: 'square', f: 880, dur: 0.6, vol: 0.22 }); a.tone({ type: 'square', f: 1320, dur: 0.6, vol: 0.12 }); },
  lap: a => a.arp([79, 84, 88], { type: 'square', step: 0.08, dur: 0.18, vol: 0.12 }),
  finish: a => a.arp([72, 76, 79, 84], { type: 'square', step: 0.11, dur: 0.3, vol: 0.14 }),
  finish_good: a => a.arp([72, 76, 79, 84, 88, 91, 96], { type: 'square', step: 0.09, dur: 0.34, vol: 0.14 }),
  rank_up: a => a.tone({ type: 'triangle', f: 700, f1: 1100, dur: 0.1, vol: 0.14 }),
  rank_down: a => a.tone({ type: 'triangle', f: 600, f1: 380, dur: 0.12, vol: 0.12 }),
};

/** Tiny procedural band, used for any track or menu without generated music (and when offline). */
class Sequencer {
  constructor(audio, id) {
    this.a = audio; this.rate = 1; this.step = 0; this.timer = null; this.next = 0;
    const rng = makeRng(hashString(id || 'menu') + 3);
    this.bpm = id === 'menu' ? 112 : 126 + Math.floor(rng() * 5) * 6;
    this.root = 45 + Math.floor(rng() * 7);                                  // bass root (MIDI)
    const progs = [[0, 5, 3, 7], [0, 3, 5, 7], [0, 7, 5, 3], [0, 5, 7, 5], [0, 8, 3, 10]];
    this.prog = progs[Math.floor(rng() * progs.length)];
    this.minor = rng() < 0.4;
    const scale = this.minor ? [0, 2, 3, 5, 7, 8, 10] : [0, 2, 4, 5, 7, 9, 11];
    this.lead = Array.from({ length: 32 }, (_, i) => (rng() < (i % 4 === 0 ? 0.9 : 0.5) ? scale[Math.floor(rng() * scale.length)] + (rng() < 0.3 ? 12 : 0) : null));
    this.bassPat = Array.from({ length: 8 }, (_, i) => (i % 2 === 0 || rng() < 0.5 ? (rng() < 0.25 ? 12 : rng() < 0.2 ? 7 : 0) : null));
  }
  start() { this.next = this.a.t + 0.1; this.tick(); }
  stop() { clearTimeout(this.timer); this.stopped = true; }
  tick() {
    if (this.stopped) return;
    const a = this.a, c = a.ctx, spb = 60 / (this.bpm * this.rate) / 2;   // eighth notes
    while (this.next < c.currentTime + 0.25) {
      const s = this.step, bar = Math.floor(s / 8) % 4, beat = s % 8, t = this.next, root = this.root + this.prog[bar];
      const voice = (type, f, dur, vol, cut) => { const o = c.createOscillator(), g = c.createGain(), fl = c.createBiquadFilter(); o.type = type; o.frequency.value = f; fl.type = 'lowpass'; fl.frequency.value = cut; g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + dur); o.connect(fl); fl.connect(g); g.connect(a.mus); o.start(t); o.stop(t + dur + 0.02); };
      const nz = (dur, vol, type, f) => { const src = c.createBufferSource(), fl = c.createBiquadFilter(), g = c.createGain(); src.buffer = a.noiseBuf; fl.type = type; fl.frequency.value = f; g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur); src.connect(fl); fl.connect(g); g.connect(a.mus); src.start(t, Math.random() * 0.5); src.stop(t + dur + 0.02); };
      const b = this.bassPat[beat]; if (b != null) voice('sawtooth', NOTE(root - 12 + b), spb * 0.9, 0.2, 700);
      if (beat % 4 === 0) { const o = c.createOscillator(), g = c.createGain(); o.frequency.setValueAtTime(140, t); o.frequency.exponentialRampToValueAtTime(42, t + 0.12); g.gain.setValueAtTime(0.5, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.16); o.connect(g); g.connect(a.mus); o.start(t); o.stop(t + 0.2); }
      if (beat % 4 === 2) nz(0.12, 0.22, 'bandpass', 1900);
      nz(0.03, beat % 2 ? 0.07 : 0.04, 'highpass', 7000);
      if (beat === 0) for (const iv of this.minor ? [0, 3, 7] : [0, 4, 7]) voice('triangle', NOTE(root + 12 + iv), spb * 7, 0.05, 2400);
      const l = this.lead[s % 32]; if (l != null) voice('square', NOTE(this.root + 24 + l), spb * 0.85, 0.055, 2600);
      this.next += spb; this.step++;
    }
    this.timer = setTimeout(() => this.tick(), 60);
  }
}
