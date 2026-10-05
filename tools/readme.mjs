// Writes README.md from the theme data.
//
//   node tools/readme.mjs

import { writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { themes, VARIANTS, CATEGORIES, contrast } from './palettes.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const REPO = 'https://github.com/bjarneo/tea-themes';
const SITE = 'https://bjarneo.github.io/tea-themes';

// Lowest contrast of the 6 normal ANSI colors and the text, per variant.
function stats(key) {
  let normal = 99, text = 99;
  for (const t of themes) {
    const v = t.variants[key], bg = v.colors.background;
    v.ansi.slice(1, 7).forEach(h => normal = Math.min(normal, contrast(h, bg)));
    text = Math.min(text, contrast(v.colors.foreground, bg));
  }
  return { normal: normal.toFixed(1), text: text.toFixed(1) };
}

const anchor = s => s.toLowerCase().normalize('NFC').replace(/[^\p{L}\p{N}\- ]/gu, '').replace(/ /g, '-');
const pad = n => String(n).padStart(2, '0');
const sizeMb = Math.round(Number(execFileSync('du', ['-sm', '--exclude=.git', '--exclude=.capture', ROOT]).toString().split('\t')[0]) / 10) * 10;
const count = themes.length, total = count * VARIANTS.length;
const names = themes.map(t => t.name);
const list = `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;

const USE = {
  night: 'A dark background in the color of the tea. For the evening and dim rooms.',
  day: 'A light background with the same hues. For bright rooms and daylight.',
};

const variantTable = VARIANTS.map(v => {
  const s = stats(v.key);
  return `| ${v.label} | \`uji-matcha${v.suffix}\` | ${USE[v.key]} | ${s.normal}:1 | ${s.text}:1 |`;
}).join('\n');

const time = b => {
  const [a, z] = b.time, unit = z >= 60 ? 'min' : 's', f = s => z >= 60 ? +(s / 60).toFixed(1) : s;
  return a === z ? `${f(a)} ${unit}` : `${f(a)} to ${f(z)} ${unit}`;
};
const water = b => b.milk ? `${b.water} ml water and ${b.milk} ml milk` : `${b.water} ml`;
const CLOSE_UP = { foam: 'the whisked foam', milk: 'milk that swirls into the tea', blossoms: 'jasmine blossoms that float on the tea' };

const menu = Object.entries(CATEGORIES).map(([key, label]) => {
  const items = themes.filter(t => t.cat === key);
  return `| ${label} | ${items.map(t => `[${t.name}](#${anchor(t.name)})`).join(', ')} |`;
}).join('\n');

const sections = Object.entries(CATEGORIES).map(([key, label]) => {
  const items = themes.filter(t => t.cat === key);
  return `## ${label}

${items.map(t => {
    const b = t.brew;
    const rows = VARIANTS.map(v => {
      const tv = t.variants[v.key], c = tv.colors;
      return `| ${v.label} | [\`${tv.install}\`](${t.slug}/${v.key}/) | \`${c.background}\` | \`${c.foreground}\` | \`${c.accent}\` | \`${tv.icons}\` |`;
    }).join('\n');
    const colors = VARIANTS.map(v => {
      const a = t.variants[v.key].ansi;
      return `| ${v.label} | ${a.slice(0, 8).map(h => `\`${h}\``).join(' ')} | ${a.slice(8).map(h => `\`${h}\``).join(' ')} |`;
    }).join('\n');
    return `### ${t.name}

[![${t.name} at night and in the day](site/assets/shots/${t.slug}/pair.webp)](${SITE}/#${t.slug})

\`${pad(t.index)}\` · Signature palette · Origin: ${t.origin} · Folder: [\`${t.slug}/\`](${t.slug}/) · [Open on the site](${SITE}/#${t.slug})

${t.desc} The close-up background shows ${CLOSE_UP[t.swirl]}.

| Brew | Value |
| --- | --- |
| Tea | ${b.leaf} g |
| Water | ${water(b)} |
| Temperature | ${b.temp} °C |
| ${b.verb[0].toUpperCase() + b.verb.slice(1)} time | ${time(b)} |
| Infusions | ${b.infusions} |

| Variant | Theme name | \`background\` | \`foreground\` | \`accent\` | Icons |
| --- | --- | --- | --- | --- | --- |
${rows}

<details>
<summary>All 16 ANSI colors of each variant</summary>

| Variant | Normal, 0 to 7 | Bright, 8 to 15 |
| --- | --- | --- |
${colors}

</details>

\`\`\`bash
curl -fsSL ${SITE}/install.sh | bash -s -- ${t.slug} --set
\`\`\`
`;
  }).join('\n')}`;
}).join('\n');

const readme = `# Tea themes for Omarchy

[![All ${total} themes. Night is the top row, day is the bottom row.](site/assets/mosaic.jpg)](${SITE})

This repo has ${count} tea themes for [Omarchy](https://omarchy.org): ${list}. Each theme has a night variant and a day variant. That makes ${total} Omarchy themes. Each variant has a 16-color ANSI palette, 5 backgrounds at 6K and a steam video.

- Site: [${SITE.replace('https://', '')}](${SITE})
- Screenshots: real captures of an Omarchy desktop with each variant applied
- Backgrounds: ${total * 5} images at 6K, 6144×3456, and ${total} steam videos at 3840×2160

## Variants

| Variant | Theme name | What it is | Lowest ANSI contrast | Lowest text contrast |
| --- | --- | --- | --- | --- |
${variantTable}

The contrast columns show the lowest WCAG contrast ratio against the background, over all ${count} themes. The script raises or lowers the lightness of each color until it reaches its target. The 6 main ANSI colors reach at least 4.5:1, the WCAG AA level. The muted color for comments reaches at least 3.8:1. Each variant is a complete Omarchy theme with its own folder, so you can install any mix of them.

## Signature palettes

All ${count} teas use a signature palette. Like Osaka Jade and Miasma in Omarchy, they fill the 6 ANSI slots with the colors of the tea, so a slot can hold a color that is not its name. The red of Uji Matcha is azuki bean, the yellow of Earl Grey is bergamot, the blue of Jasmine is the night sky, and the blue of Masala Chai is the clay of the cup.

The contrast targets above apply to all slots. A check also keeps the 6 slots apart, so no 2 slots look the same.

## Backgrounds

Each variant has 6 backgrounds: 5 images and 1 video. Omarchy shows them in this order. To show the next one, run \`omarchy theme bg next\`.

| File | What it shows |
| --- | --- |
| \`0-omarchy-wordmark.jpg\` | The Omarchy wordmark spelled in the dry tea on a table: rolled leaves, jasmine pearls, whole chai spices, or matcha sifted through a stencil. |
| \`1-teacup.jpg\` | The tea in its cup on a table: matcha in a chawan, jasmine in a porcelain cup, Earl Grey in a teacup with a gold rim, and chai in a clay kulhad. |
| \`2-brew-guide.jpg\` | The brew guide: water temperature, brew time, tea, water and the steps. |
| \`3-tea-swirl.jpg\` | A close-up of the tea: whisked matcha foam, milk that swirls into Earl Grey or chai, or jasmine blossoms that float on the tea. |
| \`4-tea-leaves.jpg\` | The dry tea from a low angle with a shallow focus. |
| \`5-steam.mp4\` | A 12 second loop at 3840×2160. The cup seen from above, with the Omarchy wordmark in the matcha foam, in cinnamon on the chai, or on the bottom of the cup under clear tea. Steam drifts over the cup. |

The wordmark, the cup, the close-up, the leaves and the cup of the steam video are photographic renders. The GPU ray-marches each 3D scene with soft shadows, reflections and depth of field. Clear tea refracts the light, and the cup shows through it, darker with depth. The brew guide is a flat drawing.

## Install

\`install.sh\` copies themes into \`~/.config/omarchy/themes\`. Each theme variant becomes a normal Omarchy theme folder. The script installs the night and day variants of a theme unless you name one with \`--variant\`.

### Install one theme without a clone

The script downloads only the themes that you name:

\`\`\`bash
curl -fsSL ${SITE}/install.sh | bash -s -- uji-matcha --set
\`\`\`

To install one variant only, add \`--variant\`:

\`\`\`bash
curl -fsSL ${SITE}/install.sh | bash -s -- uji-matcha jasmine --variant day
\`\`\`

\`--set\` applies the first installed variant of the last theme.

### Install from a clone

\`\`\`bash
git clone --depth 1 ${REPO} ~/.local/share/tea-themes
cd ~/.local/share/tea-themes
./install.sh --all
omarchy theme set uji-matcha-night
\`\`\`

The full repo is about ${sizeMb} MB because it has ${total * 5} backgrounds at 6K. To download less, use the \`curl\` command above. It downloads only the folders that you name.

### Options

| Command | Result |
| --- | --- |
| \`install.sh uji-matcha jasmine\` | Installs the night and day variants of the named themes |
| \`install.sh uji-matcha --variant day\` | Installs only this variant |
| \`install.sh --all\` | Installs all ${total} themes |
| \`install.sh --list\` | Lists the ${count} theme names |
| \`install.sh uji-matcha --set\` | Installs the theme, then applies its night variant |
| \`install.sh --update\` | Installs again every theme variant that the script installed |
| \`install.sh --remove uji-matcha\` | Removes the variants of a theme that the script installed |
| \`install.sh --link uji-matcha\` | Links to the clone instead of copying. Run \`git pull\` in the clone to update. |
| \`install.sh --force uji-matcha\` | Replaces a theme with the same name that the script did not install |

The variant names are \`night\` and \`day\`. The script writes a \`.tea-themes\` marker file in each theme that it copies. \`--update\` and \`--remove\` use this file, so they never change a theme that you made.

### Apply with Aether

[Aether](https://github.com/omacom/aether) can apply a theme straight from the [site](${SITE}). Open a tea, pick a variant and a background, and select 1 of these buttons:

| Button | Result |
| --- | --- |
| Apply with Aether | Aether loads the palette and the background, then applies them at once through its own theme. |
| Install as Omarchy theme | Aether adds the variant to \`~/.config/omarchy/themes\` and activates it at once. This stops if a theme with the same name exists, for example after \`install.sh\`. |
| Open in editor | Aether opens the palette in its editor. Nothing changes until you select Apply. |

Aether stops a download after 60 seconds. On a slow connection, a 6K background can take longer, so the links download a 3840×2160 copy from \`site/assets/aether/\`. GitHub does not render \`aether://\` links, so use the site or build a link yourself:

\`\`\`text
aether://apply?colors=${SITE}/uji-matcha/night/colors.toml&wallpaper=${SITE}/assets/aether/uji-matcha/night/1-teacup.jpg&silent=true
\`\`\`

Add \`&as_omarchy_theme=uji-matcha-night\` to install the variant. Use \`&edit=true\` instead of \`&silent=true\` to open the editor.

### Name conflicts

All theme names end in \`-night\` or \`-day\`. They do not collide with the themes that ship with Omarchy, with [coffee-themes](https://github.com/bjarneo/coffee-themes) or with [100-themes](https://github.com/bjarneo/100-themes). The script does not replace a theme that it did not install. If \`~/.config/omarchy/themes/uji-matcha-night\` exists, the script skips it and tells you. Rename your theme, or use \`--force\` to replace it.

The matcha theme is called Uji Matcha, after the town where it grows. Its names are \`uji-matcha-night\` and \`uji-matcha-day\`, so they do not collide with \`matcha-day\` from 100-themes.

\`omarchy theme install <url>\` does not work with this repo. That command expects one theme at the root of a repo.

## Switch themes and backgrounds

\`\`\`bash
omarchy theme set uji-matcha-night   # apply a theme
omarchy theme set uji-matcha-day     # the same tea in daylight
omarchy theme bg next                # show the next background of the current theme
\`\`\`

## The teas

| Kind | Teas |
| --- | --- |
${menu}

${sections}

## How the themes are made

The scripts in [\`tools/\`](tools/) make every file in this repo. They need Node.js 22 or later, Chromium, ImageMagick and ffmpeg. \`tools/photo.mjs\` and \`tools/steam.mjs\` also need a GPU that Chromium can use through Vulkan. \`tools/capture.sh\` also needs Omarchy, Hyprland and grim.

| Script | Output |
| --- | --- |
| \`tools/palettes.mjs\` | The tea table and the color math. Every other script reads it. |
| \`tools/build.mjs\` | \`colors.toml\` and \`icons.theme\` of each variant, and \`site/assets/themes.js\` |
| \`tools/render.mjs\` | The brew guide of each variant at 6K. \`tools/render.html\` draws it on a canvas. |
| \`tools/photo.mjs\` | The 4 photographic backgrounds of each variant at 6K. \`tools/photo.html\` ray-marches the 3D scenes on the GPU. |
| \`tools/steam.mjs\` | The steam video of each variant. \`tools/steam.html\` draws the steam once, \`tools/photo.html\` renders the cup from above, and ffmpeg lays the steam over the cup. |
| \`tools/capture.sh\` | \`preview.png\` of each variant and the site screenshots. It applies each variant on this desktop and takes a screenshot of workspace 8. |
| \`tools/preview.mjs\` | Optional. Drawn desktop previews for a computer without Omarchy. \`tools/preview.html\` draws an Omarchy desktop with the theme applied. \`tools/capture.sh\` replaces them. |
| \`tools/assets.mjs\` | The site previews, the thumbnails, the Aether copies and the mosaic |
| \`tools/readme.mjs\` | This README |

To build everything again, run the scripts in this order:

\`\`\`bash
node tools/build.mjs
node tools/render.mjs
node tools/photo.mjs
node tools/steam.mjs
tools/capture.sh
node tools/assets.mjs
node tools/readme.mjs
\`\`\`

\`tools/photo.mjs\` takes about 25 minutes for all ${total * 4} photos on an Intel Arc GPU. It draws small tiles and waits for the GPU after every 8 tiles. Some GPU drivers reset the GPU when one job runs longer than 5 seconds.

\`tools/capture.sh\` takes about 2 minutes. It changes the theme of the desktop ${total} times and shows workspace 8 the whole time. Open the windows that you want in the screenshots on workspace 8 first. If you switch to another workspace, the script stops and restores your theme. Run it again to continue where it stopped.

To change a tea, edit its row in \`tools/palettes.mjs\`, then run the scripts with the theme name, for example \`node tools/photo.mjs uji-matcha\` and \`tools/capture.sh uji-matcha\`.

The site in [\`site/\`](site/) is a static page. The workflow in \`.github/workflows/pages.yml\` copies \`install.sh\` and every \`colors.toml\` into it and publishes it to GitHub Pages.
`;

writeFileSync(join(ROOT, 'README.md'), readme);
console.log(`wrote README.md (${themes.length} themes)`);
