/* Time-trial ghosts: a run as x, y, z, and yaw sampled every `step` seconds of race time.
   Saved as { racer, step, time, d: [x, y, z, yaw, …] } (src/core/save.js keeps one per track and class).
   The recorder holds at most GHOST_SAMPLES samples. When it fills, it drops every other sample and doubles
   its interval, so a run of any length is kept whole, just more coarsely, and storage stays bounded. */
export const GHOST_STEP = 0.1;          // seconds between samples while the run is short
export const GHOST_SAMPLES = 4000;      // 400 s at the first interval; a longer run halves its resolution instead of being cut short

export class GhostRecorder {
  constructor(racer, { step = GHOST_STEP, cap = GHOST_SAMPLES } = {}) {
    this.racer = racer; this.step = step; this.cap = Math.max(2, cap & ~1); this.d = [];
  }
  /** Take a sample of the kart once the race clock has reached the next sample time. */
  sample(time, k) {
    if (time + 1e-9 < (this.d.length / 4) * this.step) return;   // sample i is due at i × step
    if (this.d.length >= this.cap * 4) this._halve();
    this.d.push(+k.x.toFixed(2), +k.y.toFixed(2), +k.z.toFixed(2), +k.yaw.toFixed(3));
  }
  /* Keep samples 0, 2, 4, …: they sit at the doubled interval, and the next sample is due exactly when it was. */
  _halve() {
    const d = this.d, out = [];
    for (let i = 0; i < d.length; i += 8) out.push(d[i], d[i + 1], d[i + 2], d[i + 3]);
    this.d = out; this.step *= 2;
  }
  /** The ghost to save for a run that finished in `time` seconds. */
  ghost(time) { return { racer: this.racer, step: this.step, time, d: this.d.slice() }; }
}

/** Where a saved ghost is `time` seconds into its run, interpolated between samples, or null once it has run out.
    Ghosts saved before the interval could change all used 0.1 s, so a missing or bad step reads as that. */
export function ghostAt(ghost, time) {
  const d = ghost?.d, n = d ? Math.floor(d.length / 4) : 0;
  if (n < 2) return null;
  const step = ghost.step > 0 ? ghost.step : GHOST_STEP, f = Math.max(0, time) / step;
  if (!(f < n - 1)) return null;
  const i = Math.floor(f), j = i + 1, t = f - i, a = i * 4, b = j * 4;
  const dy = d[b + 3] - d[a + 3];
  return {
    x: d[a] + (d[b] - d[a]) * t, y: d[a + 1] + (d[b + 1] - d[a + 1]) * t, z: d[a + 2] + (d[b + 2] - d[a + 2]) * t,
    yaw: d[a + 3] + Math.atan2(Math.sin(dy), Math.cos(dy)) * t,
  };
}
