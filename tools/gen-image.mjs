#!/usr/bin/env node
/* Generate an image with the OpenAI Images API and save it.
   Usage: node tools/gen-image.mjs --out path.png --prompt "..." [--model m] [--size 1024x1024]
          [--quality low|medium|high] [--background transparent|opaque] [--ref a.png --ref b.png]
   Reads the key from .env (OPENAI_API_KEY or OPENAI_KEY). Never prints it. */
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname, resolve, basename } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export const DEFAULT_MODEL = 'gpt-image-2.6-sunburst';

export async function loadKey() {
  if (process.env.OPENAI_API_KEY || process.env.OPENAI_KEY) return process.env.OPENAI_API_KEY || process.env.OPENAI_KEY;
  const env = await readFile(resolve(ROOT, '.env'), 'utf8').catch(() => '');
  for (const line of env.split('\n')) {
    const m = line.match(/^\s*(OPENAI_API_KEY|OPENAI_KEY)\s*=\s*(.+?)\s*$/);
    if (m) return m[2].replace(/^["']|["']$/g, '');
  }
  throw new Error('No OpenAI key: add OPENAI_KEY=... to .env');
}

export async function generateImage({ prompt, out, model = DEFAULT_MODEL, size = '1024x1024', quality = 'medium', background, refs = [], format }) {
  const key = await loadKey();
  const t0 = Date.now();
  let res;
  if (refs.length) {
    const form = new FormData();
    form.set('model', model); form.set('prompt', prompt); form.set('size', size); form.set('quality', quality);
    if (background) form.set('background', background);
    if (format) form.set('output_format', format);
    for (const r of refs) form.append('image[]', new Blob([await readFile(r)], { type: r.endsWith('.webp') ? 'image/webp' : r.endsWith('.jpg') ? 'image/jpeg' : 'image/png' }), basename(r));
    res = await fetch('https://api.openai.com/v1/images/edits', { method: 'POST', headers: { Authorization: `Bearer ${key}` }, body: form });
  } else {
    const body = { model, prompt, size, quality, n: 1 };
    if (background) body.background = background;
    if (format) body.output_format = format;
    res = await fetch('https://api.openai.com/v1/images/generations', { method: 'POST', headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  }
  const json = await res.json();
  if (!res.ok || json.error) throw new Error(`${model}: ${json.error?.message || res.status}`);
  const b64 = json.data?.[0]?.b64_json;
  if (!b64) throw new Error('No image in response: ' + JSON.stringify(json).slice(0, 300));
  await mkdir(dirname(resolve(out)), { recursive: true });
  await writeFile(resolve(out), Buffer.from(b64, 'base64'));
  return { out, ms: Date.now() - t0, usage: json.usage, size: json.size, quality: json.quality };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const a = process.argv.slice(2), opt = { refs: [] };
  for (let i = 0; i < a.length; i += 2) { const k = a[i].replace(/^--/, ''); if (k === 'ref') opt.refs.push(a[i + 1]); else opt[k] = a[i + 1]; }
  if (!opt.prompt || !opt.out) { console.error('need --prompt and --out'); process.exit(2); }
  generateImage(opt).then(r => console.log(JSON.stringify(r))).catch(e => { console.error('FAILED:', e.message); process.exit(1); });
}
