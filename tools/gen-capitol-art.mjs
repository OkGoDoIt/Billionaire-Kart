#!/usr/bin/env node
/* Generated textures for Capitol Hill Climb (assets/tracks/capitol-hill/). Reproducible: the prompts live here.
   Usage: node tools/gen-capitol-art.mjs [name ...]   (no names: all of them). Needs OPENAI_KEY in .env and ImageMagick. */
import { execFileSync } from 'node:child_process';
import { mkdir, rm } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';
import { generateImage } from './gen-image.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..'), OUT = resolve(ROOT, 'assets/tracks/capitol-hill');
const STYLE = 'Stylized, clean and bright, hand-painted look of a 3D-animated family film or a Nintendo kart racer: soft even lighting, no harsh shadows, no text, no logos, no people. Seamless tileable texture: the left edge continues the right edge and the top edge continues the bottom edge.';
const ART = {
  // the terrace walls of the Filibuster, the pool's retaining stone, and the monument's courses
  ashlar: { size: 512, prompt: `A flat, straight-on texture of dressed pale limestone ashlar masonry, warm cream and ivory blocks of slightly varied tone laid in four even horizontal courses with thin light-grey mortar joints, each course's joints offset by half a block. ${STYLE}` },
  // the Mall's paving along the pool run and the walks
  paving: { size: 512, prompt: `A flat, straight-on texture of pale granite paving flags seen from directly above, large rectangular warm-grey and cream slabs in a running bond with fine joints, a few faint speckles. ${STYLE}` },
};

const want = process.argv.slice(2).length ? process.argv.slice(2) : Object.keys(ART);
await mkdir(OUT, { recursive: true });
for (const name of want) {
  const a = ART[name]; if (!a) { console.error('unknown', name); continue; }
  const png = resolve(tmpdir(), `capitol-${name}.png`);
  const r = await generateImage({ prompt: a.prompt, out: png, size: '1024x1024', quality: 'medium' });
  execFileSync('magick', [png, '-resize', `${a.size}x${a.size}`, '-quality', '84', resolve(OUT, `${name}.webp`)]);
  await rm(png, { force: true });
  console.log(name, 'ok', r.ms, 'ms');
}
