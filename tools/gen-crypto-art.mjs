/* Mint medallion for the exchange gantry. Run from the repo root with OPENAI_KEY in .env. */
import { generateImage } from './gen-image.mjs';
import { execFileSync } from 'node:child_process';
import { mkdtemp, mkdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const tmp = await mkdtemp(join(tmpdir(), 'crypto-mint-'));
try {
  const png = join(tmp, 'mint.png');
  await generateImage({
    out: png, size: '1024x1024', quality: 'medium',
    prompt: 'Square game texture of one original fantasy gold coin. Exact straight-on orthographic view of the circular face, symmetrical, centered, its rim fills nearly all the square. Embossed gold cartoon crest inside depicts a huge curling ocean wave that rises like a price chart then crashes, chunky elegant shapes legible at icon scale, stamped brass with alternating broad angled rim facets. Deep navy in recessed areas. Soft painterly highlights like a collectible from a colorful tropical arcade kart racer. Solid dark navy outside the round coin. No words, numerals, letters, symbols of real cryptocurrency, or real logos.'
  });
  const dir = 'assets/tracks/crypto-cove';
  await mkdir(dir, { recursive: true });
  execFileSync('magick', [png, '-resize', '256x256', '-quality', '86', join(dir, 'mint.webp')]);
} finally {
  await rm(tmp, { recursive: true, force: true });
}
