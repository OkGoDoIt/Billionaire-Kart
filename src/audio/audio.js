/* Audio: synthesized engine, drift, and boost loops per local player; a small
   pool of rival engine voices and a positional crowd loop at the start/finish
   grandstands; one-shot effects (generated samples when present, synthesized
   otherwise); announcer lines; and looping music with crossfades and a
   final-lap lift. */
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
    this.playingId = null; this.musicGen = 0;
    this.baseMusicId = null; this.starOn = false;   // the track's own music, and whether the star theme has taken it over
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
    for (const name of ['ui_move', 'ui_select', 'coin', 'item_box', 'boost', 'hit', 'count', 'go', 'crowd']) this.load(name);
    if (ctx.state !== 'running') ctx.resume?.().catch(() => {});
    ctx.addEventListener?.('statechange', () => { if (ctx.state === 'running' && !this.kicked) this._kick(); });
    this._kick();
    if (this.pendingMusic) { const id = this.pendingMusic; this.pendingMusic = null; this._play(id); }
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
  setVolumes(music, sfx) {
    this.vol.music = music; this.vol.sfx = sfx;
    if (!this.ctx) return;
    this.sfx.gain.value = this.muted ? 0 : sfx;
    // Replace any recovery ramp left by a hit, including the last scheduled dip value.
    const t = this.t;
    this.mus.gain.cancelScheduledValues(t);
    this.mus.gain.setValueAtTime(this.muted ? 0 : music * 0.55, t);
  }
  toggleMute() { this.muted = !this.muted; this.setVolumes(this.vol.music, this.vol.sfx); }
  /** Pull the music down for a beat (a hit lands) and bring it back: the hit owns the moment. */
  duck(sec = 0.45) {
    if (!this.ctx || this.muted || this.pausedLoops) return;
    const g = this.mus.gain, t = this.t, full = this.vol.music * 0.55;
    g.cancelScheduledValues(t); g.setValueAtTime(g.value, t); g.linearRampToValueAtTime(full * 0.3, t + 0.03); g.setValueAtTime(full * 0.3, t + sec * 0.5); g.linearRampToValueAtTime(full, t + sec);
  }

  /* ---------- samples ---------- */
  load(name) {
    const url = SAMPLES[name] || VOICE[name]; if (!url || !this.ctx) return Promise.resolve(null);
    if (this.buffers.has(name)) return Promise.resolve(this.buffers.get(name));
    if (!this.loading.has(name)) {
      const p = fetch(url).then(r => { if (!r.ok) throw new Error('HTTP ' + r.status); return r.arrayBuffer(); }).then(b => this.ctx.decodeAudioData(b)).then(buf => { this.buffers.set(name, buf); return buf; }).catch(() => null);
      this.loading.set(name, p);
      /* Free the slot once the request settles. A success is served from buffers after this; a
         failure (an offline blip, a 503) must not poison the sound for the rest of the session,
         so the next load() asks again. Callers above still share the one in-flight request. */
      p.then(() => { if (this.loading.get(name) === p) this.loading.delete(name); });
    }
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
    const c = this.ctx, out = c.createGain(); out.gain.value = 0;
    // a stereo panner per loop: frame() parks each split-screen engine on its own side
    let panNode = null, tail = out;
    if (c.createStereoPanner) { panNode = c.createStereoPanner(); out.connect(panNode); tail = panNode; }
    tail.connect(this.sfx);
    // engine: two detuned saws and a sub, through a low-pass that opens with revs, chopped by a "putt" tremolo
    const o1 = c.createOscillator(), o2 = c.createOscillator(), sub = c.createOscillator(), lp = c.createBiquadFilter(), eg = c.createGain(), trem = c.createOscillator(), tg = c.createGain();
    o1.type = 'sawtooth'; o2.type = 'sawtooth'; sub.type = 'square'; lp.type = 'lowpass'; lp.Q.value = 2.5; eg.gain.value = 0.5;
    trem.type = 'sawtooth'; tg.gain.value = 0.28; trem.connect(tg); tg.connect(eg.gain);
    const sg = c.createGain(); sg.gain.value = 0.5;
    o1.connect(lp); o2.connect(lp); sub.connect(sg); sg.connect(lp); lp.connect(eg); eg.connect(out);
    // tyres: band-passed noise for drifting; low rumble off the road; wind at speed; jet for boosts
    const mkNoise = (type, f, q) => { const s = c.createBufferSource(); s.buffer = this.noiseBuf; s.loop = true; const fl = c.createBiquadFilter(); fl.type = type; fl.frequency.value = f; fl.Q.value = q; const g = c.createGain(); g.gain.value = 0; s.connect(fl); fl.connect(g); g.connect(this.sfx); s.start(0, Math.random()); return { s, fl, g }; };
    const L = { out, panNode, o1, o2, sub, lp, trem, drift: mkNoise('bandpass', 2400, 5), rumble: mkNoise('lowpass', 220, 0.7), wind: mkNoise('highpass', 2600, 0.5), jet: mkNoise('bandpass', 700, 0.8), rev: 0 };
    for (const o of [o1, o2, sub, trem]) o.start();
    return L;
  }
  _killLoops(keep = 0) { for (const L of this.loops.splice(keep)) { for (const o of [L.o1, L.o2, L.sub, L.trem]) { try { o.stop(); } catch { /* already stopped */ } } for (const n of [L.drift, L.rumble, L.wind, L.jet]) { try { n.s.stop(); } catch { /* already stopped */ } n.g.disconnect(); } L.out.disconnect(); L.panNode?.disconnect(); } }

  /** Per rendered frame during a race. */
  frame(dt, race, view) {
    if (!this.ctx) return;
    const players = race.players, quiet = race.state === 'done' || this.pausedLoops;
    while (this.loops.length < players.length) this.loops.push(this._makeLoop());
    if (this.loops.length > players.length) this._killLoops(players.length);
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
      const off = on && k.grounded && k.starT <= 0 && (k.surface.offroad || k.surface.rumble > 0.3);   // starred: off-road is silent, like the road
      L.rumble.g.gain.setTargetAtTime(off ? 0.22 * clamp(sp, 0, 1) * k1 : 0, t, 0.08);
      L.wind.g.gain.setTargetAtTime(on ? 0.03 * clamp(sp - 0.5, 0, 1) * k1 : 0, t, 0.1);
      L.jet.g.gain.setTargetAtTime(on && (k.boostT > 0 || k.bulletT > 0) ? 0.16 * k1 : 0, t, 0.05);
      L.jet.fl.frequency.setTargetAtTime(600 + sp * 500, t, 0.1);
      if (L.panNode) L.panNode.pan.setTargetAtTime(pan, t, 0.05);
    });
    // hype-cycle star: while any local player is starred, the music IS the star theme (Mario Kart rules);
    // when it expires the track's own music comes back. Checked every frame, swapped only on the edge.
    const anyStar = race.state !== 'done' && players.some(k => k.starT > 0 && !k.finished);
    this.setStarTheme(anyStar);
    // final-lap lift on the music (suspended while the star theme owns it; it lands when the star ends)
    const lead = players[0];
    const want = lead && !lead.finished && lead.lap >= race.laps && race.laps > 1 ? 1.1 : 1;
    if (!anyStar && want !== this.musicRate) this.setMusicRate(want);
    this._updateRivals(dt, race, quiet);
    this._crowdTick(dt, race);
    void view;
  }
  stopLoops() { if (this.ctx) { this._killLoops(); this._killRivals(); } }

  /* ---------- rival engines (#149) ----------
     A fixed pool of two light engine voices, lent to the nearest rival karts
     and driven from the primary player's kart, so an approach from behind is
     heard before it is seen. Distance sets the volume, the rival's own speed
     sets the pitch, and its bearing sets the stereo pan. */
  _makeRivalVoice() {
    const c = this.ctx, out = c.createGain(); out.gain.value = 0;
    let panNode = null, tail = out;
    if (c.createStereoPanner) { panNode = c.createStereoPanner(); out.connect(panNode); tail = panNode; }
    tail.connect(this.sfx);
    // the local engine recipe, minus the tyre, wind, and boost noise chains
    const o1 = c.createOscillator(), o2 = c.createOscillator(), sub = c.createOscillator(), lp = c.createBiquadFilter(), eg = c.createGain(), trem = c.createOscillator(), tg = c.createGain(), sg = c.createGain();
    o1.type = 'sawtooth'; o2.type = 'sawtooth'; sub.type = 'square'; lp.type = 'lowpass'; lp.Q.value = 2.5; eg.gain.value = 0.5;
    trem.type = 'sawtooth'; tg.gain.value = 0.28; trem.connect(tg); tg.connect(eg.gain);
    sg.gain.value = 0.5;
    o1.connect(lp); o2.connect(lp); sub.connect(sg); sg.connect(lp); lp.connect(eg); eg.connect(out);
    for (const o of [o1, o2, sub, trem]) o.start();
    return { out, panNode, o1, o2, sub, lp, trem, rev: 0, kart: null, arm: 0, coolUntil: 0 };
  }
  _killRivals() {
    if (!this.rivalPool) return;
    for (const V of this.rivalPool) { for (const o of [V.o1, V.o2, V.sub, V.trem]) { try { o.stop(); } catch { /* already stopped */ } } V.out.disconnect(); V.panNode?.disconnect(); }
    this.rivalPool = null;
  }
  _updateRivals(dt, race, quiet) {
    const me = race.players[0];
    if (!me) { if (this.rivalPool) for (const V of this.rivalPool) V.out.gain.setTargetAtTime(0, this.t, 0.1); return; }
    if (!this.rivalPool) this.rivalPool = [this._makeRivalVoice(), this._makeRivalVoice()];
    const t = this.t, sy = Math.sin(me.yaw), cy = Math.cos(me.yaw), near = [];
    for (const k of race.karts) {
      if (k.isPlayer || k.finished || k.rescueT > 0) continue;
      const dx = k.x - me.x, dz = k.z - me.z, d = Math.hypot(dx, dz);
      if (d > 46) continue;
      // fwd > 0: the rival is ahead of me; side > 0: on my right
      near.push({ k, d, fwd: dx * sy + dz * cy, side: dz * sy - dx * cy });
    }
    near.sort((a, b) => a.d - b.d);
    for (let i = 0; i < this.rivalPool.length; i++) {
      const V = this.rivalPool[i], C = near[i];
      if (!C || quiet) { V.out.gain.setTargetAtTime(0, t, 0.09); V.kart = null; V.arm = 0; continue; }
      const k = C.k;
      if (V.kart !== k) { V.kart = k; V.arm = 0; }
      const sp = clamp(k.speed / k.baseTop, 0, 1.6);
      const target = race.frozen ? 0.12 : clamp(sp * 0.85 + (k.grounded ? 0 : 0.18) + (k.boostT > 0 ? 0.2 : 0), 0.1, 1.5);
      V.rev += (target - V.rev) * Math.min(1, dt * 7);
      const f = (52 + V.rev * 150) * 0.94;   // a shade under the local pitch recipe, so a rival never phases as my own engine
      V.o1.frequency.setTargetAtTime(f, t, 0.03); V.o2.frequency.setTargetAtTime(f * 1.008 + 1, t, 0.03);
      V.sub.frequency.setTargetAtTime(f * 0.5, t, 0.03); V.trem.frequency.setTargetAtTime(f * 0.5, t, 0.03);
      V.lp.frequency.setTargetAtTime(380 + V.rev * 1900, t, 0.05);
      const att = Math.pow(clamp(1 - C.d / 42, 0, 1), 1.5);
      V.out.gain.setTargetAtTime(att * (0.045 + Math.min(V.rev, 1.2) * 0.07) * (k.shrinkT > 0 ? 0.6 : 1), t, 0.07);
      if (V.panNode) V.panNode.pan.setTargetAtTime(clamp(C.side / Math.max(10, C.d), -1, 1), t, 0.05);
      // a pass-by: the rival crosses from clearly behind to clearly ahead (or the reverse, as I pass them)
      if (V.arm === -1 && C.fwd > 2.5) { if (t >= V.coolUntil) { this._whoosh(C, 1); V.coolUntil = t + 1; } V.arm = 1; }
      else if (V.arm === 1 && C.fwd < -2.5) { if (t >= V.coolUntil) { this._whoosh(C, -1); V.coolUntil = t + 1; } V.arm = -1; }
      else if (V.arm === 0) V.arm = C.fwd < -2.5 ? -1 : C.fwd > 2.5 ? 1 : 0;
    }
  }
  /** The air a passing kart pushes past the listener: a band sweep, rising as
      they come through, falling as they drop behind. */
  _whoosh(C, dir) {
    this.noise({ dur: 0.38, vol: 0.22 * clamp(1 - C.d / 25, 0.3, 1), type: 'bandpass', f: dir > 0 ? 600 : 2400, f1: dir > 0 ? 2400 : 600, q: 1.1, pan: clamp(C.side / Math.max(8, C.d), -1, 1) });
  }

  /* ---------- crowd (#148) ----------
     One loop of the crowd sample under a low-pass, gain-driven. In a race it
     follows the local players' distance to the start/finish line (the
     grandstands live there), builds through the final lap, and jumps on line
     crossings and finishes; on the results and podium screens it settles to
     a low bed. It routes through the sfx bus, so the mute and the sfx volume
     apply as they do to every other effect. */
  _crowdBed() {
    const B = this.crowd || (this.crowd = { gain: null, excite: 0 });
    if (!this.ctx || B.gain) return B;
    const buf = this.buffers.get('crowd');
    if (!buf) { this.load('crowd'); return B; }
    const c = this.ctx, src = c.createBufferSource(); src.buffer = buf; src.loop = true;
    const fl = c.createBiquadFilter(); fl.type = 'lowpass'; fl.frequency.value = 850;
    const g = c.createGain(); g.gain.value = 0;
    src.connect(fl); fl.connect(g); g.connect(this.sfx);
    src.start(0, buf.duration > 0.2 ? Math.random() * (buf.duration - 0.1) : 0);
    B.gain = g;
    return B;
  }
  _crowdMode(mode) {
    this.crowdModeWanted = mode;
    this.crowdDuck = false;   // a pause in some earlier race must not mute this one
    if (!this.ctx) return;
    const B = this._crowdBed();
    if (!B.gain) { this.load('crowd').then(() => { if (this.crowd?.gain && this.crowdModeWanted === mode) this._crowdMode(mode); }); return; }
    if (mode === 'ambient') B.gain.gain.setTargetAtTime(0.15, this.t, 0.9);
    else if (mode === 'off') B.gain.gain.setTargetAtTime(0, this.t, 0.4);
    if (mode !== 'race') B.excite = 0;
  }
  _exciteCrowd(v) { const B = this.crowd || (this.crowd = { gain: null, excite: 0 }); B.excite = Math.min(1, B.excite + v); }
  _crowdTick(dt, race) {
    // A session built before the first unlock never delivered its start
    // event (event() drops everything pre-context), so if a live race is
    // running and no mode was ever set, engage the crowd from here.
    if (this.crowdModeWanted === undefined && race.state !== 'done' && race.players?.length) this._crowdMode('race');
    const B = this._crowdBed(); if (!B.gain) return;
    if (this.crowdDuck) { B.gain.gain.setTargetAtTime(0, this.t, 0.12); return; }
    if ((this.crowdModeWanted || 'off') !== 'race') return;   // ambient and off levels are held by _crowdMode
    B.excite = Math.max(0, B.excite - dt * 0.3);
    const L = race.track.length; let prox = 0, runIn = 0;
    for (const p of race.players) {
      const d = Math.min(p.s, L - p.s);
      prox = Math.max(prox, clamp(1 - d / 48, 0, 1));
      if (!p.finished && race.laps > 1 && p.lap >= race.laps) runIn = Math.max(runIn, 0.1 + 0.2 * clamp(p.s / L, 0, 1));
    }
    const t = this.t, wander = 0.92 + 0.08 * Math.sin(t * 0.6) * Math.sin(t * 0.23 + 1.7);
    let target = clamp((0.36 * prox * prox + runIn + B.excite * 0.45) * wander, 0, 0.8);
    if (race.frozen) target *= 0.55;   // on the grid and in the flyover the crowd is there, not yet loud
    B.gain.gain.setTargetAtTime(target, t, 0.3);
  }

  /* ---------- events from the game ---------- */
  kartEvent(e, kart, local) {
    if (!this.ctx) return;
    const v = local ? 1 : this._nearness(kart); if (v <= 0.02) return;
    switch (e.type) {
      case 'coin': if (local) this.play('coin', { rate: 1 + Math.min(kart.coins, 10) * 0.02 }); break;
      case 'hop': if (local) this.play('hop', { vol: 0.6 }); break;
      case 'land': if (local && e.data > 5) { this.play('land', { vol: clamp(e.data / 18, 0.3, 1) }); if (e.data > 12) this.play('thud', { vol: clamp((e.data - 10) / 10, 0.3, 0.8) }); } break;
      case 'driftTier': if (local && e.data > 0) this.play('tier' + e.data); break;
      case 'miniTurbo': this.play('miniturbo', { vol: v, rate: 0.9 + e.data * 0.1 }); if (local) this.play('mt_pop' + clamp(e.data, 1, 3)); break;
      case 'boost': if (e.data !== 'mini') this.play('boost', { vol: v * 0.9 }); break;
      case 'trick': if (local) this.play('trick'); break;
      case 'rocketStart': if (local) { this.play('boost'); this.say(e.data >= 1 ? 'rocket_start' : 'nice_start'); } break;
      case 'burnout': if (local) this.play('burnout'); break;
      case 'hit': this.play(e.data.kind === 'tumble' ? 'hit_big' : e.data.kind === 'zap' ? 'zap' : 'hit', { vol: v }); if (local) { this.play('spin', { vol: 0.7 }); this.play('thud', { vol: e.data.kind === 'tumble' ? 1 : 0.7 }); this.duck(e.data.kind === 'tumble' ? 0.7 : 0.45); } break;
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
      case 'lap': if (local) { if (e.data === kart.race.laps && kart.race.laps > 1) { this._exciteCrowd(0.55); this.play('crowd', { vol: 0.55, gap: 0.6 }); } else if (e.data > 1) this._exciteCrowd(0.3); if (e.data > 1 && e.data <= kart.race.laps) { if (e.data === kart.race.laps) { this.play('final_sting'); this.say('final_lap', { force: true, delay: 0.35 }); } else this.play('lap'); } } break;
      case 'finish': if (local) { this.play('line'); this.play(e.data <= 3 ? 'finish_good' : 'finish'); this.say(e.data === 1 ? 'winner' : 'finish', { force: true, delay: 0.4 }); this._exciteCrowd(1); this.play('crowd', { vol: e.data <= 3 ? 0.85 : 0.6, gap: 0.6 }); } break;
      case 'rankUp': if (local && kart.race.time > 4) { this.play(e.data === 1 ? 'rank_first' : 'rank_up', { vol: e.data === 1 ? 0.8 : 0.5 }); if (e.data === 1) this.say('first_place'); } break;
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
      case 'kartHit': // the item's owner hears the connection land — before this, a hit was silent for the player who caused it
        if (e.data.by?.isPlayer && !e.data.victim?.isPlayer) this.play('hitmark', { vol: 0.9, gap: 0.1 });
        else if (e.data.by?.isPlayer && e.data.victim?.isPlayer) this.play('hitmark', { vol: 0.5, gap: 0.1 });
        break;
      case 'blueHit': this.play('explosion', { vol: this._nearPoint(race, e.data.x, e.data.z, 90) }); break;
      case 'explosion': this.play('explosion', { vol: this._nearPoint(race, e.data.x, e.data.z, 90) }); break;
      case 'lightning': this.play('lightning'); break;
      case 'shock': this.play('shock', { vol: this._nearPoint(race, e.data.x, e.data.z, 70) }); break;
      case 'ink': this.play('ink', { vol: 0.6 }); break;
      case 'blueArrive': if (e.data.target.isPlayer) this.play('warning', { rate: 1.3, gap: 0.5 }); break;
      case 'blueStrike': if (e.data.target.isPlayer) this.play('warning', { rate: 1.7, gap: 0.25 }); break;
      case 'finish': this._exciteCrowd(0.15); break;   // every kart home stirs the grandstand a little
      case 'shotBounce': this.play('bounce', { vol: this._nearPoint(race, e.data.x, e.data.z, 40) * 0.6 }); break;
    }
  }
  event(name, data) {
    if (!this.ctx) return;
    if (name === 'pause') { this.pausedLoops = true; this.crowdDuck = true; if (this.crowd?.gain) this.crowd.gain.gain.setTargetAtTime(0, this.t, 0.12); this.play('ui_back'); this.mus.gain.cancelScheduledValues(this.t); this.mus.gain.setTargetAtTime(this.muted ? 0 : this.vol.music * 0.2, this.t, 0.1); }
    else if (name === 'resume') { this.pausedLoops = false; this.crowdDuck = false; this.mus.gain.cancelScheduledValues(this.t); this.mus.gain.setTargetAtTime(this.muted ? 0 : this.vol.music * 0.55, this.t, 0.1); }
    else if (name === 'results') { this.stopLoops(); this.setMusicRate(1); if (data === 1) this.say('you_win', { delay: 0.3 }); this._crowdMode('ambient'); }
    else if (name === 'podium') { this.play('finish_good'); this.say(data === 1 ? 'champion' : 'cup_over', { force: true, delay: 0.5 }); this._crowdMode('ambient'); }
    else if (name === 'introStart') { this.stopLoops(); this.pausedLoops = false; this._crowdMode('race'); }
    else if (name === 'countdownStart') { this.pausedLoops = false; this._crowdMode('race'); }
  }
  racerPicked(r) { this.play('ui_select'); void r; }
  _nearness(kart) { const race = kart.race; return this._nearPoint(race, kart.x, kart.z, 45); }
  _nearPoint(race, x, z, range) { let best = 1e9; for (const p of race.players) best = Math.min(best, Math.hypot(p.x - x, p.z - z)); if (!race.players.length) return 0; return clamp(1 - best / range, 0, 1); }

  /* ---------- music ---------- */
  /** The star theme takes the music over while a local player is starred, and hands it back after.
      Called every frame from frame(); converges from any state, so a race that ends mid-star (the
      game calls music('results') itself) or a pause can never leave the wrong theme playing. (#134) */
  setStarTheme(on) {
    this.starOn = on;
    if (!this.ctx) return;
    const want = on ? 'star' : this.baseMusicId;
    if (want && want !== this.musicId) this.music(want);
  }
  /** Ask for a theme (a track id, 'menu', 'results', or 'star' via setStarTheme).
      The request is remembered even before the audio context exists. */
  music(id) {
    if (id === 'menu') this._crowdMode('off');   // back in the menus, the grandstand goes home (#163)
    if (id && id !== 'star') this.baseMusicId = id;   // the music the race/menu asked for; the star theme borrows the slot, it does not replace this (#134)
    this.musicId = id;
    if (!this.ctx) { this.pendingMusic = id; return; }
    this._play(id);
  }
  _play(id) {
    if (id === this.playingId && (this.seq || this.musicNodes.length)) return;   // already on its way or playing: do not stack a second copy
    this.playingId = id; this.musicRate = 1;
    const gen = ++this.musicGen;   // completions from an older request must never start music
    if (this.ctx.state === 'suspended') this.ctx.resume?.().catch(() => {});
    const old = this.musicNodes, t = this.t;
    for (const n of old) { n.g.gain.cancelScheduledValues(t); n.g.gain.setTargetAtTime(0, t, 0.25); setTimeout(() => { try { n.s.stop(); } catch { /* done */ } }, 1500); }
    this.musicNodes = []; this.seq?.stop(); this.seq = null; clearTimeout(this.loopTimer); clearTimeout(this.musicWatchdog);
    if (!id) return;
    const url = MUSIC[id];
    if (!url) { this.seq = id === 'star' ? new StarSequencer(this) : new Sequencer(this, id); this.seq.start(); return; }
    const key = 'music:' + id;
    let bufStarted = false, seqStarted = false;
    const startSeq = () => { if (bufStarted || seqStarted || gen !== this.musicGen) return; seqStarted = true; this.seq = new Sequencer(this, id); this.seq.start(); };
    const startBuf = buf => { if (bufStarted || gen !== this.musicGen) return; bufStarted = true; clearTimeout(this.musicWatchdog); if (seqStarted) { this.seq?.stop(); this.seq = null; } this._loopMusic(buf, id); };
    // If the theme file hangs — stalled network, a service worker that never
    // answers — the race must not stay silent: after a few seconds the
    // sequencer covers for it, and the real theme takes over if it ever lands.
    this.musicWatchdog = setTimeout(startSeq, 6000);
    if (this.buffers.has(key)) { clearTimeout(this.musicWatchdog); startBuf(this.buffers.get(key)); }
    else fetch(url).then(r => r.arrayBuffer()).then(b => this.ctx.decodeAudioData(b)).then(buf => { this.buffers.set(key, buf); for (const k of [...this.buffers.keys()]) if (k.startsWith('music:') && k !== key && k !== 'music:menu') this.buffers.delete(k); startBuf(buf); }).catch(() => { clearTimeout(this.musicWatchdog); startSeq(); });
  }
  /** Loop a buffer with a short crossfade at the seam, so any piece of music loops cleanly. */
  _loopMusic(buf, id) {
    const XF = 1.2, c = this.ctx;
    const playOnce = when => {
      if (this.playingId !== id) return;
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
    if (cur && this.playingId && this.buffers.has('music:' + this.playingId)) {
      clearTimeout(this.loopTimer);
      const played = (this.t - cur.when) * 1, remain = Math.max(0.5, (cur.s.buffer.duration - played) / r), id = this.playingId, buf = cur.s.buffer;
      cur.g.gain.cancelScheduledValues(this.t); cur.g.gain.setValueAtTime(1, this.t); cur.g.gain.setValueAtTime(1, this.t + remain - 1.2); cur.g.gain.linearRampToValueAtTime(0, this.t + remain);
      this.loopTimer = setTimeout(() => { if (this.playingId === id) this._loopMusic(buf, id); }, Math.max(50, (remain - 1.2 - 0.3) * 1000));
    }
  }
}

const USE_SOUND = { boost: 'boost', boost3: 'boost', golden: 'boost', leak: 'leak', pinkslip: 'lob', subpoena: 'serve', subpoena3: 'serve', tweet: 'tweet', antitrust: 'siren', star: 'star', crash: 'lightning', pr: 'shock', smear: 'ink', insider: 'ghost', bailout: 'rocket', dividend: 'coin' };

/* Synthesized versions of every effect, used until a generated sample exists (and as a fallback offline). */
const SYNTH = {
  ui_move: a => a.tone({ type: 'triangle', f: 660, f1: 880, dur: 0.06, vol: 0.12 }),
  ui_select: a => { a.tone({ type: 'triangle', f: 660, dur: 0.08, vol: 0.16 }); a.tone({ type: 'triangle', f: 990, dur: 0.14, vol: 0.16, delay: 0.07 }); },
  // checker wipe: a rising rush as the tiles flip in, a softer falling one as they flip away
  wipe_cover: a => { a.noise({ dur: 0.32, vol: 0.13, type: 'bandpass', f: 500, f1: 3200, q: 1.2, attack: 0.05 }); a.tone({ type: 'triangle', f: 220, f1: 520, dur: 0.28, vol: 0.05, attack: 0.04 }); },
  wipe_reveal: a => a.noise({ dur: 0.36, vol: 0.09, type: 'bandpass', f: 3000, f1: 700, q: 1, attack: 0.03 }),
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
  leak: (a, v) => { a.noise({ dur: 0.22, vol: 0.3 * v, type: 'lowpass', f: 900, f1: 240, q: 2 }); a.tone({ type: 'sine', f: 300, f1: 90, dur: 0.18, vol: 0.2 * v }); a.noise({ dur: 0.12, vol: 0.14 * v, type: 'bandpass', f: 2400, f1: 3600, q: 3, delay: 0.05 }); },
  serve: (a, v) => { a.noise({ dur: 0.28, vol: 0.26 * v, type: 'bandpass', f: 900, f1: 3800, q: 2 }); a.tone({ type: 'square', f: 190, f1: 70, dur: 0.09, vol: 0.16 * v, delay: 0.16 }); },
  lob: (a, v) => { a.tone({ type: 'sine', f: 500, f1: 1250, dur: 0.3, vol: 0.13 * v }); a.noise({ dur: 0.2, vol: 0.12 * v, type: 'bandpass', f: 700, f1: 2400, q: 2.5 }); },
  hitmark: (a, v) => { a.tone({ type: 'square', f: 1560, dur: 0.06, vol: 0.13 * v }); a.tone({ type: 'square', f: 2090, dur: 0.1, vol: 0.11 * v, delay: 0.05 }); },
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
  // into the lead: the overtake blip, then a bright fifth on top
  rank_first: a => { a.tone({ type: 'triangle', f: 700, f1: 1100, dur: 0.1, vol: 0.14 }); a.tone({ type: 'square', f: NOTE(88), dur: 0.16, vol: 0.07, delay: 0.08 }); a.tone({ type: 'square', f: NOTE(95), dur: 0.24, vol: 0.06, delay: 0.15 }); },
  // mini-turbo release, layered over the sample: each tier hits harder. Blue is a tight thump; orange adds a rising
  // saw; purple adds a bright crack and a sparkle on top, so a held drift pays out a sound worth waiting for.
  mt_pop1: a => { a.tone({ type: 'sine', f: 180, f1: 70, dur: 0.12, vol: 0.22 }); a.noise({ dur: 0.08, vol: 0.12, type: 'highpass', f: 2600 }); },
  mt_pop2: a => { a.tone({ type: 'sine', f: 160, f1: 55, dur: 0.18, vol: 0.28 }); a.tone({ type: 'sawtooth', f: 260, f1: 1040, dur: 0.22, vol: 0.06 }); a.noise({ dur: 0.12, vol: 0.16, type: 'highpass', f: 2200 }); },
  mt_pop3: a => { a.tone({ type: 'sine', f: 150, f1: 45, dur: 0.24, vol: 0.32 }); a.tone({ type: 'sawtooth', f: 300, f1: 1500, dur: 0.26, vol: 0.07 }); a.noise({ dur: 0.16, vol: 0.22, type: 'bandpass', f: 5200, q: 0.8 }); a.arp([96, 100, 103], { type: 'square', step: 0.045, dur: 0.1, vol: 0.05, delay: 0.06 }); },
  // weight under a hit or a heavy landing: a low body thump and a mid knock that small speakers can still carry
  thud: (a, v) => { a.tone({ type: 'sine', f: 110, f1: 38, dur: 0.28, vol: 0.45 * v }); a.tone({ type: 'triangle', f: 240, f1: 120, dur: 0.09, vol: 0.18 * v }); },
  // the final lap: a rising brass-like sting, louder and longer than a lap tick
  final_sting: a => { a.arp([67, 72, 76], { type: 'sawtooth', step: 0.09, dur: 0.14, vol: 0.07 }); a.tone({ type: 'sawtooth', f: NOTE(79), dur: 0.55, vol: 0.08, delay: 0.27 }); a.tone({ type: 'square', f: NOTE(84), dur: 0.55, vol: 0.05, delay: 0.27 }); a.noise({ dur: 0.5, vol: 0.06, type: 'highpass', f: 6000, delay: 0.27 }); },
  // crossing the line: a cymbal splash over a boom
  line: a => { a.noise({ dur: 0.9, vol: 0.16, type: 'highpass', f: 5000, attack: 0.003 }); a.tone({ type: 'sine', f: 90, f1: 40, dur: 0.5, vol: 0.35 }); },
  rank_down: a => a.tone({ type: 'triangle', f: 600, f1: 380, dur: 0.12, vol: 0.12 }),
};

/* Authored sequencer themes. Tracks without a generated MP3 (the whole third
   cup, for now) used to get the same hash-seeded house band with a different
   random tune — same instruments, same shape, nothing to recognise a track
   by. These give each one its own hook, tempo, and band. lead/bass entries
   are semitone offsets from the root (null = rest); lead spans 4 bars of
   eighth notes (32 steps), bass one bar (8). A generated MP3, when one is
   made for the track, still wins — this is the floor, not the ceiling. */
const THEMES = {
  /* Davos: mock-heroic alpine fanfare — brass-ish saw lead, oom-pah bass. */
  'davos': {
    bpm: 118, root: 50, prog: [0, 7, 5, 4], minor: false,
    leadWave: 'sawtooth', leadCut: 1800, leadVol: 0.07, padVol: 0.045,
    lead: [12, null, 7, null, 4, 7, 12, null, 16, null, 12, null, 9, null, 7, null, 12, null, 11, null, 9, null, 7, null, 9, null, 7, null, 4, null, 2, null],
    bass: [0, null, 7, null, 0, null, 7, null],
  },
  /* Boring Tunnel: subterranean techno — four-on-the-floor, driving octave
     bass, a sparse two-note drone for a lead, no pad. The tunnel is bare. */
  'boring-tunnel': {
    bpm: 134, root: 45, prog: [0, 0, 3, 5], minor: true,
    leadWave: 'square', leadCut: 1400, leadVol: 0.05, bassCut: 500, padVol: 0,
    kick: [0, 2, 4, 6], kickVol: 0.55, snareVol: 0.18, hatEven: 0.03, hatOdd: 0.09,
    lead: [12, null, null, null, null, null, 12, null, null, null, null, null, null, null, 15, null, null, null, null, null, null, null, 12, null, null, null, null, null, 10, null, null, null],
    bass: [0, 0, 12, 0, 0, 0, 12, 0],
  },
  /* International Waters: a rolling sea-shanty — fife-like triangle lead that
     never sits still, bom-bom bass, everything bouncing. */
  'international-waters': {
    bpm: 138, root: 48, prog: [0, 5, 7, 5], minor: false,
    leadWave: 'triangle', leadCut: 3200, leadVol: 0.075, snareVol: 0.16, padVol: 0.04,
    lead: [7, 12, 11, 12, 16, null, 14, null, 12, 9, 7, 9, 12, null, 7, null, 7, 12, 11, 12, 19, null, 16, null, 14, 12, 11, 9, 7, null, null, null],
    bass: [0, null, 7, null, 0, null, 7, null],
  },
  /* WeWork Memorial: elevator bossa-funk for a dead office — soft triangle
     everything, syncopated bass, no snare, the kick turned down. Smooth. */
  'wework-memorial': {
    bpm: 102, root: 50, prog: [0, 5, 7, 9], minor: false,
    leadWave: 'triangle', leadCut: 1600, leadVol: 0.06, bassWave: 'triangle', bassVol: 0.16,
    kickVol: 0.3, snare: [], hatEven: 0.02, hatOdd: 0.035, padVol: 0.05,
    lead: [12, null, null, 11, null, null, 9, null, 12, null, null, 14, null, null, 12, null, 9, null, null, 11, null, null, 12, null, 16, null, null, 14, null, null, 12, null],
    bass: [0, null, 7, null, null, 10, null, 7],
  },
  /* No 'star' entry here: the invincibility-star theme is the dedicated
     StarSequencer below (#134), reached via music('star'). */
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
    // an authored theme replaces the dice: its own hook, tempo, and band
    const theme = THEMES[id];
    if (theme) {
      this.bpm = theme.bpm; this.root = theme.root; this.prog = theme.prog; this.minor = !!theme.minor;
      this.lead = theme.lead; this.bassPat = theme.bass;
    }
    this.leadWave = theme?.leadWave || 'square'; this.leadVol = theme?.leadVol ?? 0.055; this.leadCut = theme?.leadCut ?? 2600;
    this.bassWave = theme?.bassWave || 'sawtooth'; this.bassVol = theme?.bassVol ?? 0.2; this.bassCut = theme?.bassCut ?? 700;
    this.padWave = theme?.padWave || 'triangle'; this.padVol = theme?.padVol ?? 0.05; this.padCut = theme?.padCut ?? 2400;
    this.kickPat = theme?.kick || [0, 4]; this.kickVol = theme?.kickVol ?? 0.5;
    this.snarePat = theme?.snare || [2, 6]; this.snareVol = theme?.snareVol ?? 0.22;
    this.hatEven = theme?.hatEven ?? 0.04; this.hatOdd = theme?.hatOdd ?? 0.07;
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
      const b = this.bassPat[beat]; if (b != null) voice(this.bassWave, NOTE(root - 12 + b), spb * 0.9, this.bassVol, this.bassCut);
      if (this.kickPat.includes(beat)) { const o = c.createOscillator(), g = c.createGain(); o.frequency.setValueAtTime(140, t); o.frequency.exponentialRampToValueAtTime(42, t + 0.12); g.gain.setValueAtTime(this.kickVol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.16); o.connect(g); g.connect(a.mus); o.start(t); o.stop(t + 0.2); }
      if (this.snarePat.includes(beat)) nz(0.12, this.snareVol, 'bandpass', 1900);
      nz(0.03, beat % 2 ? this.hatOdd : this.hatEven, 'highpass', 7000);
      if (beat === 0 && this.padVol > 0) for (const iv of this.minor ? [0, 3, 7] : [0, 4, 7]) voice(this.padWave, NOTE(root + 12 + iv), spb * 7, this.padVol, this.padCut);
      const l = this.lead[s % 32]; if (l != null) voice(this.leadWave, NOTE(this.root + 24 + l), spb * 0.85, this.leadVol, this.leadCut);
      this.next += spb; this.step++;
    }
    this.timer = setTimeout(() => this.tick(), 60);
  }
}

/** The hype-cycle star theme: a relentless two-bar arpeggio loop that takes the music over while a
    local player is starred, Mario Kart style. Fixed tempo (the final-lap rate lift does not apply),
    seamless by construction, and it stops the moment it is swapped out — notes already scheduled are
    sixteenths, so the handover rings out in under a tenth of a second. */
class StarSequencer {
  constructor(audio) {
    this.a = audio; this.rate = 1; this.step = 0; this.timer = null; this.next = 0;
    this.bpm = 172;
    // I–V–vi–IV in C, as MIDI roots; the arpeggio walks each chord up two octaves and back down
    this.chords = [[60, 64, 67], [55, 59, 62], [57, 60, 64], [53, 57, 60]];
    this.arp = [0, 1, 2, 3, 2, 1];   // chord tones + the octave, indexed into an extended tone list
  }
  start() { this.next = this.a.t + 0.06; this.tick(); }
  stop() { clearTimeout(this.timer); this.stopped = true; }
  tick() {
    if (this.stopped) return;
    const a = this.a, c = a.ctx, s16 = 60 / this.bpm / 4;   // sixteenth notes
    while (this.next < c.currentTime + 0.25) {
      const s = this.step, bar = Math.floor(s / 16) % 4, six = s % 16, t = this.next;
      const voice = (type, f, dur, vol, cut) => { const o = c.createOscillator(), g = c.createGain(), fl = c.createBiquadFilter(); o.type = type; o.frequency.value = f; fl.type = 'lowpass'; fl.frequency.value = cut; g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + 0.008); g.gain.exponentialRampToValueAtTime(0.0001, t + dur); o.connect(fl); fl.connect(g); g.connect(a.mus); o.start(t); o.stop(t + dur + 0.02); };
      const nz = (dur, vol, type, f) => { const src = c.createBufferSource(), fl = c.createBiquadFilter(), g = c.createGain(); src.buffer = a.noiseBuf; fl.type = type; fl.frequency.value = f; g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur); src.connect(fl); fl.connect(g); g.connect(a.mus); src.start(t, Math.random() * 0.5); src.stop(t + dur + 0.02); };
      const chord = this.chords[bar], tones = [chord[0], chord[1], chord[2], chord[0] + 12];
      voice('square', NOTE(tones[this.arp[six % 6]] + 12), s16 * 0.95, 0.075, 3200);
      if (six % 2 === 0) voice('sawtooth', NOTE(chord[0] - 12), s16 * 1.7, 0.16, 800);            // bass, eighth notes
      if (six % 8 === 4) nz(0.1, 0.16, 'bandpass', 1900);                                       // backbeat
      nz(0.03, six % 2 ? 0.05 : 0.028, 'highpass', 7500);                                       // hats
      if (six === 0) voice('triangle', NOTE(chord[2] + 24), s16 * 3, 0.05, 4000);                // bar sparkle
      this.next += s16; this.step++;
    }
    this.timer = setTimeout(() => this.tick(), 60);
  }
}
