// Renders a desktop preview of each theme variant with headless Chromium.
// tools/preview.html draws an Omarchy desktop with the theme colors and the
// teacup background. The script writes:
//
//   <theme>/<variant>/preview.png              1920x1200, for the Omarchy theme menu
//   site/assets/shots/<theme>/<variant>.webp   1440x900, for the site
//   .capture/<theme>/<variant>.png             the full preview
//
//   node tools/preview.mjs                     render all themes and variants
//   node tools/preview.mjs matcha earl-grey    render the named themes
//
// tools/capture.sh replaces these previews with real screenshots of this
// desktop. Run tools/photo.mjs first. Needs `chromium` and `magick` on PATH.

import { execFile } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { promisify } from 'node:util';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { themes, VARIANTS } from './palettes.mjs';
import { launch } from './cdp.mjs';
import { renderTheme } from './render.mjs';

const run = promisify(execFile);
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

const wanted = process.argv.slice(2);
const queue = [];
for (const t of wanted.length ? themes.filter(x => wanted.includes(x.slug)) : themes) {
  for (const { key } of VARIANTS) queue.push([t, key]);
}

// One tab: a screenshot of a background tab can wait forever in headless Chromium.
const browser = await launch();
const page = await browser.open(pathToFileURL(join(ROOT, 'tools/preview.html')).href);
await page.send('Emulation.setDeviceMetricsOverride', { width: 1920, height: 1200, deviceScaleFactor: 1, mobile: false });
const started = Date.now();
let done = 0;
for (const [t, key] of queue) {
  const v = t.variants[key];
  const wall = join(ROOT, t.slug, key, 'backgrounds', '1-teacup.jpg');
  const theme = { ...renderTheme(t, v), variant: key, icons: v.icons };
  await page.evaluate(`paint(${JSON.stringify(theme)}, ${JSON.stringify(existsSync(wall) ? pathToFileURL(wall).href : '')})`);
  await page.send('Page.bringToFront');
  const shot = await page.send('Page.captureScreenshot', { format: 'png' });
  const raw = join(ROOT, '.capture', t.slug, `${key}.png`);
  mkdirSync(dirname(raw), { recursive: true });
  mkdirSync(join(ROOT, 'site', 'assets', 'shots', t.slug), { recursive: true });
  writeFileSync(raw, Buffer.from(shot.result.data, 'base64'));
  await Promise.all([
    run('magick', [raw, '-dither', 'FloydSteinberg', '-colors', '256', `PNG8:${join(ROOT, t.slug, key, 'preview.png')}`]),
    run('magick', [raw, '-resize', '1440x', '-quality', '82', join(ROOT, 'site', 'assets', 'shots', t.slug, `${key}.webp`)]),
  ]);
  done++;
  process.stdout.write(`\r${done}/${queue.length} previews, ${((Date.now() - started) / 1000).toFixed(0)}s   `);
}
process.stdout.write('\n');
await browser.close();
