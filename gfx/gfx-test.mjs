/* Billionaire Kart — gfx pipeline standalone check.
 * Same harness pattern as tools/bot-test.mjs: local static server + puppeteer
 * with CDN requests fulfilled from vendored files (sandbox proxy can't always
 * reach jsDelivr from Chromium). Loads gfx/test.html in both modes:
 *   ?mode=plain  — Lambert + flat sky colour, no post  (the "before")
 *   ?mode=full   — gfx/textures + materials + environment + post (the "after")
 * Composites both panels into gfx/demo-before-after.png.
 * Fails on ANY console error / page error in either mode.
 * Run:  node gfx/gfx-test.mjs        (from repo root; needs tools/node_modules)
 */
import http from 'http';
import { readFile, writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { extname, join, normalize, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const HERE = fileURLToPath(new URL('.', import.meta.url));
const ROOT = join(HERE, '..');
const require = createRequire(join(ROOT, 'tools', 'package.json'));
const puppeteer = require('puppeteer');

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.webp': 'image/webp', '.png': 'image/png', '.webmanifest': 'application/manifest+json' };
const server = http.createServer(async (req, res) => {
  try {
    let p = normalize(join(ROOT, decodeURIComponent(new URL(req.url, 'http://x').pathname)));
    if (!p.startsWith(ROOT)) { res.writeHead(403); return res.end(); }
    if (p.endsWith('/')) p += 'index.html';
    const data = await readFile(p);
    res.writeHead(200, { 'Content-Type': MIME[extname(p)] || 'application/octet-stream' });
    res.end(data);
  } catch { res.writeHead(404); res.end('nf'); }
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const base = `http://127.0.0.1:${server.address().port}`;

/* ---- vendor three + the addons the gfx modules import ---- */
const CDN = 'https://cdn.jsdelivr.net/npm/three@0.160.0';
const vendorDir = join(ROOT, 'tools', 'vendor');
const addonFiles = [
  'postprocessing/EffectComposer.js', 'postprocessing/RenderPass.js',
  'postprocessing/ShaderPass.js', 'postprocessing/Pass.js', 'postprocessing/MaskPass.js',
  'postprocessing/UnrealBloomPass.js', 'postprocessing/OutputPass.js',
  'shaders/CopyShader.js', 'shaders/LuminosityHighPassShader.js', 'shaders/FXAAShader.js',
  'shaders/OutputShader.js', // OutputPass imports this in r160
  'geometries/RoundedBoxGeometry.js',
];
const bodies = new Map();
async function vendor(urlPath, diskPath) {
  if (!existsSync(diskPath)) {
    await mkdir(dirname(diskPath), { recursive: true });
    const res = await fetch(CDN + urlPath);
    if (!res.ok) throw new Error(`vendor download failed ${urlPath}: HTTP ${res.status}`);
    await writeFile(diskPath, Buffer.from(await res.arrayBuffer()));
    console.log('Vendored', urlPath);
  }
  bodies.set(urlPath, await readFile(diskPath, 'utf-8'));
}
await vendor('/build/three.module.js', join(vendorDir, 'three.module.js'));
for (const f of addonFiles) await vendor('/examples/jsm/' + f, join(vendorDir, 'addons', f));

const errors = [];
const browser = await puppeteer.launch({
  headless: 'new',
  args: ['--no-sandbox', '--disable-setuid-sandbox', '--enable-unsafe-swiftshader', '--use-angle=swiftshader', '--mute-audio', '--window-size=980,640'],
});
const page = await browser.newPage();
await page.setViewport({ width: 980, height: 640 });
await page.setRequestInterception(true);
page.on('request', r => {
  const u = r.url();
  if (u.startsWith(CDN)) {
    const path = u.slice(CDN.length);
    if (bodies.has(path)) return r.respond({ status: 200, contentType: 'text/javascript; charset=utf-8', headers: { 'Access-Control-Allow-Origin': '*' }, body: bodies.get(path) });
    errors.push(`[unvendored-cdn] ${u}`);
    return r.respond({ status: 404, body: 'not vendored' });
  }
  r.continue();
});
page.on('console', m => { if (m.type() === 'error') errors.push(`[console] ${m.text()}`); });
page.on('pageerror', e => errors.push(`[pageerror] ${e.message}`));
page.on('requestfailed', r => errors.push(`[requestfailed] ${r.url()} ${r.failure()?.errorText}`));

const shots = {};
for (const mode of ['plain', 'full']) {
  await page.goto(`${base}/gfx/test.html?mode=${mode}`, { waitUntil: 'networkidle2', timeout: 90000 });
  await page.waitForFunction(() => window.__gfxReady, { timeout: 60000 });
  if (mode === 'full') await page.waitForFunction(() => window.__skyReady, { timeout: 30000 });
  await new Promise(r => setTimeout(r, 900));
  shots[mode] = await page.screenshot({ type: 'png' });
  console.log(`mode=${mode} screenshot ok (${shots[mode].length} bytes)`);
}

/* ---- composite side-by-side with labels (fresh page: no interception) ---- */
const b64 = m => shots[m].toString('base64');
const cpage = await browser.newPage();
await cpage.setViewport({ width: 1792, height: 700 });
await cpage.setContent(`<body style="margin:0;background:#0b1026;font-family:system-ui">
  <div style="display:flex;gap:6px;padding:6px">
    <div><img src="data:image/png;base64,${b64('plain')}" style="width:880px;display:block"><div style="color:#fff;padding:6px 2px;font-size:15px">BEFORE — Lambert materials, flat sky colour, no tone mapping, no post</div></div>
    <div><img src="data:image/png;base64,${b64('full')}" style="width:880px;display:block"><div style="color:#ffd94a;padding:6px 2px;font-size:15px">AFTER — gfx pipeline: PMREM sky, clearcoat paint, procedural textures, ACES + bloom</div></div>
  </div></body>`, { waitUntil: 'load', timeout: 60000 });
await new Promise(r => setTimeout(r, 400));
const out = join(HERE, 'demo-before-after.png');
const el = await cpage.$('body');
await el.screenshot({ path: out });
console.log('Composite written to', out);

await browser.close();
server.close();
if (errors.length) {
  console.error(`\nFAIL — ${errors.length} error(s):`);
  for (const e of errors) console.error(' ', e);
  process.exit(1);
}
console.log('\nPASS — gfx modules load standalone, zero console/page errors in both modes.');
