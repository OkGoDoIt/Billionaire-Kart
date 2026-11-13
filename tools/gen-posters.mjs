#!/usr/bin/env node
/* Painted trackside posters for Mars Colony and Burning Circuit, generated with tools/gen-image.mjs and packed
   into one 2x2 atlas per track: assets/posters/<track>.webp (2048x1366, four 3:2 posters, read left to right,
   top to bottom). The prompts below are the record; rerun to regenerate.
   Usage: node tools/gen-posters.mjs <track> [index ...]   (indices regenerate only those panels, then repack)
   Panels are kept as PNGs in /tmp/bk-posters/<track>/ between runs. */
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { generateImage } from './gen-image.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const STYLE = 'A bold, bright, stylized poster used as trackside signage in a cartoon racing video game, in a clean painted 3D-animated-film style with chunky shapes, strong silhouettes, and a vivid limited palette. Fills the whole frame edge to edge as a flat printed poster (no frame, no wall, no border around it, no perspective). Any lettering is huge, thick, and spelled exactly as given, with no other text anywhere. No real brands, logos, or real people, and no characters, mascots, or vehicles that resemble any existing video game or film franchise.';
const POSTERS = {
  'mars-colony': [
    `${STYLE} A retro space-age travel poster: a gleaming silver rocket lifting off over rust-red dunes and layered mesas under a butterscotch sky, a tiny happy colonist family in white spacesuits waving. Big lettering at the top: "MARS: ONE WAY". Smaller lettering at the bottom: "RETURN TRIP SOLD OUT". Palette: rust red, cream, deep teal, butterscotch.`,
    `${STYLE} A nostalgic tourism poster seen from Mars: a small blue-and-green planet Earth glowing low in a dusty orange sky over a red desert horizon, a lone astronaut sitting on a rock gazing at it. Big lettering at the top: "VISIT EARTH". Smaller lettering at the bottom: "WHILE IT LASTS". Palette: cobalt blue, leaf green, rust orange, cream.`,
    `${STYLE} A cheerful colony recruitment poster: a confident cartoon colonist in a white spacesuit with a rust-orange stripe planting a flag on a red hill, a cluster of glass habitat domes behind. Big lettering at the top: "COLONISTS WANTED". Smaller lettering at the bottom: "BRING YOUR OWN AIR". Palette: rust red, cream, sky blue, gold.`,
    `${STYLE} A sunny terraforming promise poster: the left half is a lush green paradise of round trees, a blue lake, and flowers; it fades on the right into barren red Mars dust with one sad potted sapling. Big lettering at the top: "TERRAFORMING". Smaller lettering at the bottom: "2% COMPLETE". Palette: leaf green, lake blue, rust red, cream.`,
  ],
  'burning-circuit': [
    `${STYLE} A psychedelic desert festival gig poster at sunset: a glowing DJ booth on top of a giant neon art car shaped like a whale, crowds of tiny silhouettes, sun rays and swirls behind. Big lettering at the top: "SUNRISE SET". Smaller lettering at the bottom: "DJ SERIES B". Palette: hot pink, tangerine, violet, sunshine yellow.`,
    `${STYLE} A hand-painted sign on weathered reclaimed wooden planks with fairy lights strung across the top, painted desert flowers, a little smiling sun, and a tiny price tag dangling from one corner. No people, no animals, no vehicles. Big hand-lettered words: "PLAYA PROVIDES". Smaller hand-lettered words underneath: "FOR A FEE". Palette: warm wood, turquoise, coral pink, gold.`,
    `${STYLE} A glossy valet parking sign for a desert festival: a row of wild furry and neon art cars (a fish, a dragon, a giant cupcake) parked in a neat line on cracked white playa, a clean-shaven young valet in a teal vest and no hat holding up a ring of keys. Big lettering at the top: "ART CAR VALET". Smaller lettering at the bottom: "TIPS EXPECTED". Palette: cherry red, cream, teal, sunset orange.`,
    `${STYLE} A smug eco poster on a dusty desert playa at dusk: a sleek private jet parked on cracked white ground beside one tiny recycling bin, a single footprint in the dust. Big lettering at the top: "LEAVE NO TRACE". Smaller lettering at the bottom: "EXCEPT THE JET". Palette: forest green, cream, dusk violet, gold.`,
  ],
};

const id = process.argv[2], only = process.argv.slice(3).map(Number);
if (!POSTERS[id]) { console.error('usage: gen-posters.mjs <' + Object.keys(POSTERS).join('|') + '> [index ...]'); process.exit(2); }
const dir = `/tmp/bk-posters/${id}`; mkdirSync(dir, { recursive: true });
await Promise.all(POSTERS[id].map(async (prompt, k) => {
  const out = `${dir}/p${k}.png`;
  if (only.length ? !only.includes(k) : existsSync(out)) return;
  const r = await generateImage({ prompt, out, size: '1536x1024', quality: 'high' });
  console.log('panel', k, Math.round(r.ms / 1000) + 's');
}));
const outFile = resolve(ROOT, `assets/posters/${id}.webp`); mkdirSync(dirname(outFile), { recursive: true });
const P = k => `${dir}/p${k}.png`;
execFileSync('magick', ['(', P(0), P(1), '-resize', '1024x683!', '+append', ')', '(', P(2), P(3), '-resize', '1024x683!', '+append', ')', '-append', '-quality', '72', outFile]);
console.log('atlas', outFile);
