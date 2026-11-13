/* At most two heavy jobs at a time on one machine (Roger's rule, 12 Nov 2026: too many builds and browser tests at once
   crashed his computer). Every tool that starts a browser or runs races calls takeSlot() first and waits while two
   others are running, whichever terminal, session, or agent started them. The slot frees itself when the tool exits,
   and a slot left by a tool that crashed or was killed is reclaimed.
   BK_MAX_JOBS=1 lowers the limit. Do not raise it. */
import { mkdirSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const DIR = join(tmpdir(), 'billionaire-kart-slots');
const MAX = Math.max(1, Math.min(2, +(process.env.BK_MAX_JOBS || 2) || 2));
const alive = pid => { try { process.kill(pid, 0); return true; } catch (e) { return e.code === 'EPERM'; } };

export async function takeSlot(label = 'job') {
  if (process.env.CI) return;   // a CI runner is a fresh machine of its own: nothing to share, never wait
  mkdirSync(DIR, { recursive: true });
  for (let tries = 0; ; tries++) {
    for (let i = 0; i < MAX; i++) {
      const file = join(DIR, `slot-${i}`);
      let holder = 0; try { holder = +readFileSync(file, 'utf8').split(' ')[0]; } catch { /* free */ }
      if (holder && alive(holder)) continue;
      try {
        if (holder) rmSync(file, { force: true });                      // its owner is gone
        writeFileSync(file, `${process.pid} ${label} ${new Date().toISOString()}`, { flag: 'wx' });
      } catch { continue; }                                             // someone else took it first
      await new Promise(r => setTimeout(r, 60));
      try { if (+readFileSync(file, 'utf8').split(' ')[0] !== process.pid) continue; } catch { continue; }
      const free = () => { try { if (+readFileSync(file, 'utf8').split(' ')[0] === process.pid) rmSync(file, { force: true }); } catch { /* already gone */ } };
      process.on('exit', free);
      for (const sig of ['SIGINT', 'SIGTERM', 'SIGHUP']) process.on(sig, () => { free(); process.exit(130); });
      if (tries) console.error(`${label}: started`);
      return;
    }
    if (tries === 0) console.error(`${label}: waiting, ${MAX} heavy jobs are already running on this machine`);
    await new Promise(r => setTimeout(r, 1500));
  }
}
