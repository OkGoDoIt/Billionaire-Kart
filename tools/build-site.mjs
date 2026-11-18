#!/usr/bin/env node
/* Copy exactly what the live game needs into one folder for GitHub Pages: the page, the service worker and its
   startup list, the manifest, the code, the styles, three.js, and the art and audio. Docs, tools, and the PR
   screenshots (hundreds of megabytes) stay in the repository and off the site.
   Usage: node tools/build-site.mjs [out]   (default: _site) */
import { cp, rm, mkdir } from 'node:fs/promises';
import { join, resolve, dirname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = resolve(process.argv[2] || join(ROOT, '_site'));
const FILES = ['index.html', 'sw.js', 'offline-shell.js', 'manifest.webmanifest'];
const DIRS = ['src', 'styles', 'assets', 'vendor/three/build', 'vendor/three/addons'];
const skip = src => basename(src).endsWith('.md') || basename(src) === '.DS_Store';

await rm(OUT, { recursive: true, force: true });
await mkdir(OUT, { recursive: true });
for (const f of FILES) await cp(join(ROOT, f), join(OUT, f));
for (const d of DIRS) await cp(join(ROOT, d), join(OUT, d), { recursive: true, filter: src => !skip(src) });
console.log('build-site: wrote', OUT);
