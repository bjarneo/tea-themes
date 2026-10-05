// Renders the photographic backgrounds of each theme variant on the GPU:
//
//   0-omarchy-wordmark.jpg   the Omarchy wordmark spelled in the dry tea
//   1-teacup.jpg             the tea in its cup
//   3-tea-swirl.jpg          a close-up of the tea: foam, milk or blossoms
//   4-tea-leaves.jpg         the dry tea, from a low angle
//
// tools/photo.html ray-marches the scenes.
//
//   node tools/photo.mjs                     render all themes and variants
//   node tools/photo.mjs matcha earl-grey    render the named themes
//   VARIANTS=day node tools/photo.mjs        render only these variants
//   KINDS=leaves,swirl node tools/photo.mjs  render only these kinds
//   SAMPLES=24 node tools/photo.mjs          samples for each pixel (default 24)
//   PREVIEW=1 OUT=/tmp/x node tools/photo.mjs matcha
//                                            write small JPEGs to $OUT
//   SIZE=3840x2160 node tools/photo.mjs      render at another 16:9 size
//   RESUME=1 node tools/photo.mjs            skip images that this run already wrote
//
// The run lists each finished image in .capture/photo-done.txt, so RESUME=1
// continues a stopped run. Needs `chromium` with a GPU that Vulkan can use.

import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { themes, VARIANTS } from './palettes.mjs';
import { launch, logoPaths } from './cdp.mjs';
import { renderTheme } from './render.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
export const PHOTOS = [
  ['wordmark', '0-omarchy-wordmark'],
  ['cup', '1-teacup'],
  ['swirl', '3-tea-swirl'],
  ['leaves', '4-tea-leaves'],
];
const PREVIEW = !!process.env.PREVIEW;
const OUT = process.env.OUT || ROOT;
const SAMPLES = Number(process.env.SAMPLES || (PREVIEW ? 16 : 24));
const SIZE = (process.env.SIZE || (PREVIEW ? '960x540' : '6144x3456')).split('x').map(Number);
const ONLY = process.env.VARIANTS ? process.env.VARIANTS.split(',') : VARIANTS.map(v => v.key);
const KINDS = process.env.KINDS ? process.env.KINDS.split(',') : PHOTOS.map(([k]) => k);
const DONE = join(ROOT, '.capture', 'photo-done.txt');

// Opens tools/photo.html. tools/steam.mjs uses this too.
export async function openPhotoPages() {
  const logo = logoPaths(readFileSync(process.env.LOGO_SVG || '/usr/share/omarchy/logo.svg', 'utf8'));
  const browser = await launch({ gpu: true });
  const photo = await browser.open(pathToFileURL(join(ROOT, 'tools/photo.html')).href);
  await photo.evaluate(`setup(${JSON.stringify(logo)})`);
  // Draws one photo and returns the JPEG as a Buffer. The photo page must be
  // the front tab: Chromium skips the GPU work of a hidden tab.
  async function shoot(scene, theme, width, height, samples) {
    await photo.send('Page.bringToFront');
    const url = await photo.evaluate(`renderPhoto({ scene: '${scene}', width: ${width}, height: ${height}, samples: ${samples}, theme: ${JSON.stringify(theme)} })`);
    return Buffer.from(url.split(',')[1], 'base64');
  }
  return { shoot, close: () => browser.close() };
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const wanted = process.argv.slice(2);
  const done = new Set(process.env.RESUME && existsSync(DONE) ? readFileSync(DONE, 'utf8').split('\n') : []);
  if (!process.env.RESUME && !PREVIEW) { mkdirSync(dirname(DONE), { recursive: true }); writeFileSync(DONE, ''); }
  const jobs = [];
  for (const [kind, file] of PHOTOS.filter(([k]) => KINDS.includes(k))) {
    for (const t of wanted.length ? themes.filter(x => wanted.includes(x.slug)) : themes) {
      for (const { key } of VARIANTS.filter(v => ONLY.includes(v.key))) {
        const id = `${t.slug}/${key}/${file}`;
        if (done.has(id)) continue;
        const out = PREVIEW ? join(OUT, `${t.slug}-${key}-${file}.jpg`) : join(OUT, t.slug, key, 'backgrounds', `${file}.jpg`);
        jobs.push({ t, key, kind, out, id });
      }
    }
  }
  const pages = await openPhotoPages();
  const started = Date.now();
  let n = 0;
  for (const { t, key, kind, out, id } of jobs) {
    const jpeg = await pages.shoot(kind, renderTheme(t, t.variants[key]), SIZE[0], SIZE[1], SAMPLES);
    mkdirSync(dirname(out), { recursive: true });
    writeFileSync(out, jpeg);
    if (!PREVIEW) appendFileSync(DONE, id + '\n');
    n++;
    const left = (Date.now() - started) / n * (jobs.length - n) / 60000;
    process.stdout.write(`\r${n}/${jobs.length} photos, about ${left.toFixed(0)} min left   `);
  }
  process.stdout.write('\n');
  await pages.close();
}
