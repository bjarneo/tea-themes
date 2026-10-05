// Palette source for all tea themes. Each theme has a night variant and a day
// variant. The table below sets the character of each tea. The math under it
// turns that into 2 complete Omarchy palettes, and it raises or lowers the
// lightness of each color until it reaches its contrast target.

// Fields of each theme:
//   bg      night background as OKLCH [lightness, chroma, hue]
//   accent  signature color as [hue, chroma, night lightness]
//   second  second color for borders and drawings, same form as accent
//   chroma  chroma of the 6 ANSI hues
//   warm    0 to 1. Pulls the cool ANSI hues to the warm side and lowers their chroma.
//   deep    0 to 1. A darker tea gets a slightly darker cream in the day.
//   dayHue  hue of the day background, when it differs from the night hue
//   liquor  color of the tea in the cup, over white porcelain
//   leaf    dry tea: powder, twisted, spices or pearls. tools/photo.html has one shape for each value.
//   top     surface of the tea in the cup: foam, clear or milky
//   vessel  cup of the tea: chawan, teacup, kulhad or cup. tools/photo.html has one shape for each value.
//   swirl   the close-up of the tea: foam, milk that swirls in, or blossoms that float
//   table   table under the photos at night and in the day:
//           0 walnut, 1 slate, 2 marble, 3 linen, 4 oak, 5 dark rosewood
//   brew    water temperature in °C, time in seconds as [min, max], leaf in
//           grams, water in ml, milk in ml, and the number of infusions
//   steps   the brew steps for the brew guide
//   origin  country or region

const CATEGORIES = {
  green: 'Green tea',
  black: 'Black tea',
};

const TABLE = [
  ['Uji Matcha', 'green', 'Shade-grown green tea, ground to a fine powder and whisked with hot water into a light foam.', {
    origin: 'Uji, Japan', bg: [.17, .03, 150], accent: [132, .15, .78], second: [95, .09], chroma: .11, warm: .3, deep: .4,
    liquor: '#7d9a2e', leaf: 'powder', top: 'foam', vessel: 'chawan', swirl: 'foam', table: [1, 3],
    brew: { temp: 80, time: [15, 30], leaf: 2, water: 70, infusions: 1, verb: 'whisk' },
    steps: ['Sift 2 g of matcha into a warm bowl.', 'Add 70 ml of water at 80 °C.', 'Whisk in a fast zigzag until a fine foam forms.'],
  }],
  ['Jasmine', 'green', 'Green tea scented with fresh jasmine blossoms, which open at night. The leaves are rolled into pearls.', {
    origin: 'Fujian, China', bg: [.17, .035, 285], dayHue: 95, accent: [95, .05, .92], second: [140, .1], chroma: .11, warm: .15, deep: .2,
    liquor: '#d8c47c', leaf: 'pearls', top: 'clear', vessel: 'cup', swirl: 'blossoms', table: [5, 3],
    brew: { temp: 80, time: [120, 180], leaf: 3, water: 200, infusions: 3, verb: 'steep' },
    steps: ['Put 3 g of jasmine pearls in a warm cup.', 'Add 200 ml of water at 80 °C.', 'Steep for 2 to 3 minutes. The pearls open in the water.', 'Use the pearls again for 2 more infusions.'],
  }],
  ['Earl Grey', 'black', 'Black tea flavored with oil of bergamot, a citrus fruit. Many blends add blue cornflower petals.', {
    origin: 'England', bg: [.18, .018, 245], accent: [105, .14, .84], second: [268, .12], chroma: .11, warm: .2, deep: .7,
    liquor: '#a2521f', leaf: 'twisted', top: 'clear', vessel: 'teacup', swirl: 'milk', table: [0, 2],
    brew: { temp: 95, time: [180, 300], leaf: 2.5, water: 250, infusions: 1, verb: 'steep' },
    steps: ['Put 2.5 g of tea in a warm pot.', 'Add 250 ml of water at 95 °C.', 'Steep for 3 to 5 minutes, then remove the leaves.', 'Serve plain, with lemon or with milk.'],
  }],
  ['Masala Chai', 'black', 'Black tea simmered with milk, sugar and spices such as cardamom, ginger, cinnamon and clove.', {
    origin: 'India', bg: [.17, .045, 38], accent: [68, .15, .8], second: [130, .1], chroma: .12, warm: .6, deep: .85,
    liquor: '#bf8a58', leaf: 'spices', top: 'milky', vessel: 'kulhad', swirl: 'milk', table: [4, 4],
    brew: { temp: 100, time: [300, 420], leaf: 5, water: 150, milk: 150, infusions: 1, verb: 'simmer' },
    steps: ['Boil 150 ml of water with crushed cardamom, ginger, cinnamon and clove.', 'Add 5 g of black tea and sugar, and boil for 2 minutes.', 'Add 150 ml of milk and simmer for 3 minutes.', 'Strain the chai into a clay cup.'],
  }],
];

// Signature palettes. Like Osaka Jade or Miasma in Omarchy, these themes fill
// the 6 ANSI slots with the colors of the tea, so a slot can hold a color
// that is not its name: the red of Uji Matcha is azuki bean, and the blue of
// Masala Chai is the clay of the cup. Each slot is "hue chroma lightness" in
// OKLCH, in the order red, green, yellow, blue, magenta, cyan. The lightness
// is for night. The contrast check still raises or lowers every color.
const SIGNATURE = {
  'Uji Matcha': '25 .12 .68, 135 .15 .78, 100 .12 .86, 195 .07 .74, 355 .10 .78, 165 .09 .82',
  'Jasmine': '10 .11 .72, 140 .10 .80, 92 .10 .90, 270 .11 .74, 320 .10 .78, 215 .07 .84',
  'Earl Grey': '35 .12 .70, 125 .12 .80, 102 .14 .88, 268 .12 .72, 315 .09 .78, 225 .05 .84',
  'Masala Chai': '28 .15 .64, 130 .11 .78, 80 .14 .86, 45 .10 .72, 355 .10 .74, 75 .05 .90',
};

// ---------- color math ----------

function rng(seed) {
  return () => {
    seed |= 0; seed = seed + 0x6D2B79F5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

// OKLCH to linear sRGB.
function lin(L, C, h) {
  h *= Math.PI / 180;
  const a = C * Math.cos(h), b = C * Math.sin(h);
  const l = (L + .3963377774 * a + .2158037573 * b) ** 3;
  const m = (L - .1055613458 * a - .0638541728 * b) ** 3;
  const s = (L - .0894841775 * a - 1.291485548 * b) ** 3;
  return [
    4.0767416621 * l - 3.3077115913 * m + .2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - .3413193965 * s,
    -.0041960863 * l - .7034186147 * m + 1.707614701 * s,
  ];
}

// OKLCH to hex. Chroma drops until the color fits in sRGB.
export function oklchHex(L, C, h) {
  let c = C, r = lin(L, c, h);
  while (c > 0 && r.some(v => v < -.001 || v > 1.001)) { c -= .005; r = lin(L, c, h); }
  return '#' + r.map(v => {
    v = Math.min(1, Math.max(0, v));
    v = v <= .0031308 ? 12.92 * v : 1.055 * v ** (1 / 2.4) - .055;
    return Math.round(v * 255).toString(16).padStart(2, '0');
  }).join('');
}

// Hex to OKLCH.
export function hexOklch(hex) {
  const [r, g, b] = [1, 3, 5].map(i => {
    const v = parseInt(hex.slice(i, i + 2), 16) / 255;
    return v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4;
  });
  const l = Math.cbrt(.4122214708 * r + .5363325363 * g + .0514459929 * b);
  const m = Math.cbrt(.2119034982 * r + .6806995451 * g + .1073969566 * b);
  const s = Math.cbrt(.0883024619 * r + .2817188376 * g + .6299787005 * b);
  const L = .2104542553 * l + .7936177850 * m - .0040720468 * s;
  const A = 1.9779984951 * l - 2.4285922050 * m + .4505937099 * s;
  const B = .0259040371 * l + .7827717662 * m - .8086757660 * s;
  return { L, C: Math.hypot(A, B), h: (Math.atan2(B, A) * 180 / Math.PI + 360) % 360 };
}

// Linear sRGB mix, the same math that Omarchy uses for derived shades.
export function mix(a, b, t) {
  const pa = [1, 3, 5].map(i => parseInt(a.slice(i, i + 2), 16));
  const pb = [1, 3, 5].map(i => parseInt(b.slice(i, i + 2), 16));
  return '#' + pa.map((v, i) => Math.floor(v * (1 - t) + pb[i] * t + .5).toString(16).padStart(2, '0')).join('');
}

// WCAG contrast ratio of two hex colors.
export function contrast(a, b) {
  const lum = hex => {
    const [r, g, bl] = [1, 3, 5].map(i => {
      const v = parseInt(hex.slice(i, i + 2), 16) / 255;
      return v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4;
    });
    return .2126 * r + .7152 * g + .0722 * bl;
  };
  const x = lum(a), y = lum(b);
  return (Math.max(x, y) + .05) / (Math.min(x, y) + .05);
}

// The first color at or above lightness L that reaches the target contrast.
function lighten(L, C, h, bg, target) {
  let hex = oklchHex(L, C, h);
  while (contrast(hex, bg) < target && L < 1) { L = Math.min(1, L + .005); hex = oklchHex(L, C, h); }
  return hex;
}

// The first color at or below lightness L that reaches the target contrast.
function darken(L, C, h, bg, target) {
  let hex = oklchHex(L, C, h);
  while (contrast(hex, bg) < target && L > 0) { L = Math.max(0, L - .005); hex = oklchHex(L, C, h); }
  return hex;
}

// Converts names with accents, such as Café or Pharisäer, to folder names.
export function slugify(name) {
  return name.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[đĐ]/g, 'd')
    .toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

const hueDist = (a, b) => { const d = Math.abs(((a - b) % 360 + 540) % 360 - 180); return d; };
const hueDelta = (from, to) => ((to - from) % 360 + 540) % 360 - 180;

// Yaru icon themes that ship with Omarchy, keyed by OKLCH hue.
const YARU = [
  [15, 'Yaru-red'], [45, 'Yaru'], [85, 'Yaru-yellow'], [115, 'Yaru-olive'],
  [150, 'Yaru-sage'], [200, 'Yaru-prussiangreen'], [255, 'Yaru-blue'],
  [300, 'Yaru-purple'], [345, 'Yaru-magenta'], [375, 'Yaru-red'],
];

function iconTheme(hex) {
  const { h, C } = hexOklch(hex);
  if (C < .03) return 'Yaru';
  let best = YARU[0], dist = Infinity;
  for (const entry of YARU) {
    const d = Math.min(Math.abs(entry[0] - h), Math.abs(entry[0] - (h + 360)));
    if (d < dist) { dist = d; best = entry; }
  }
  return best[1];
}

// ---------- palette generator ----------

// ANSI order: red, green, yellow, blue, magenta, cyan.
const BASE_HUE = [27, 140, 88, 250, 340, 200];
// Night and day start lightness of each hue, before the contrast check.
const NIGHT_L = [.72, .76, .83, .74, .74, .78];
const DAY_L = [.52, .54, .6, .5, .52, .54];
// Contrast targets against the background.
const TARGET = { night: { normal: 5.5, bright: 7.5, muted: 3.8, accent: 6, second: 4.5, fg: 11 }, day: { normal: 4.5, bright: 6, muted: 3.8, accent: 4.5, second: 4, fg: 11 } };

// The 6 hues of a theme. Warm themes move blue, cyan, green and magenta to the
// warm side and lower their chroma. The slot nearest to the accent moves up to
// 20 degrees to the accent hue, so each palette carries its drink color.
// The second color moves another slot up to 12 degrees. Red moves 6 degrees at most.
function ansiHues(t, r) {
  const w = t.warm;
  const h = [24 + 4 * w, 140 - 22 * w, 88 - 8 * w, 250 - 18 * w, 340 + 8 * w, 200 - 14 * w];
  // The table chroma spreads out around .1, so lively drinks differ more from calm ones.
  const chroma = .1 + (t.chroma - .1) * 1.6;
  const c = [1, 1 - .25 * w, 1, 1 - .3 * w, 1 - .15 * w, 1 - .3 * w].map(x => x * chroma);
  // The accent pulls its nearest slot. Then the second color pulls the nearest
  // other slot by less.
  const taken = new Set();
  for (const [hue, C, max] of [[t.accent[0], t.accent[1], 20], [t.second[0], t.second[1], 12]]) {
    let best = -1, bd = 999;
    h.forEach((x, k) => { const d = hueDist(x, hue); if (!taken.has(k) && d < bd) { bd = d; best = k; } });
    if (best < 0 || bd >= 50 || C <= .06) continue;
    taken.add(best);
    // Red stays red, because it marks errors.
    const m = best === 0 ? 6 : max;
    h[best] += Math.max(-m, Math.min(m, hueDelta(h[best], hue) * .7));
    c[best] = Math.max(c[best], Math.min(C, chroma * 1.3));
  }
  return { h: h.map(x => (x + (r() - .5) * 6 + 360) % 360), c };
}

// The 6 slots of a theme as { h, c, night, day }, where night and day are the
// start lightness before the contrast check.
function slots(t, r) {
  if (t.sig) return t.sig.map(([h, c, L]) => ({ h, c, night: L, day: .5 + (L - .74) * .6 }));
  const { h, c } = ansiHues(t, r);
  return h.map((x, k) => ({ h: x, c: c[k], night: NIGHT_L[k], day: DAY_L[k] }));
}

function oklabDistance(a, b) {
  const p = hexOklch(a), q = hexOklch(b);
  const rad = Math.PI / 180;
  return Math.hypot(p.L - q.L, p.C * Math.cos(p.h * rad) - q.C * Math.cos(q.h * rad), p.C * Math.sin(p.h * rad) - q.C * Math.sin(q.h * rad));
}

// Two slots that look the same waste a color. When 2 slots are closer than
// MIN_DISTANCE in OKLab, the later one moves away in lightness: lighter at
// night and darker in the day, which also keeps its contrast.
const MIN_DISTANCE = .06;
function separate(colors, list, step, fit) {
  const out = [...colors];
  for (let j = 1; j < out.length; j++) {
    for (let n = 0; n < 8 && out.slice(0, j).some(x => oklabDistance(x, out[j]) < MIN_DISTANCE); n++) {
      const { L } = hexOklch(out[j]);
      out[j] = fit(Math.min(.96, Math.max(.2, L + step)), list[j].c, list[j].h);
    }
  }
  return out;
}

function nightPalette(t, r) {
  // The table chroma of the background is a little strong for large areas.
  const [bl, bc, bh] = [t.bg[0], t.bg[1] * .8, t.bg[2]];
  const bg = oklchHex(bl, bc, bh);
  const list = slots(t, r);
  const T = TARGET.night;
  const fit = (L, C, h) => lighten(L, C, h, bg, T.normal);
  const normal = separate(list.map(s => fit(s.night, s.c, s.h)), list, .03, fit);
  const bright = list.map((s, k) => lighten(Math.min(.95, hexOklch(normal[k]).L + .07), s.c * .82, s.h, bg, T.bright));
  const fg = lighten(.91, Math.min(bc * .6 + .008, .03), bh, bg, T.fg);
  const ansi = [
    oklchHex(bl + .065, bc * 1.1, bh), ...normal, oklchHex(.84, Math.min(bc * .6 + .01, .03), bh),
    lighten(.55, Math.min(bc + .01, .05), bh, bg, T.muted), ...bright, oklchHex(.975, .01, bh),
  ];
  const accent = lighten(t.accent[2] || .76, t.accent[1], t.accent[0], bg, T.accent);
  const second = lighten(t.second[2] || .72, t.second[1], t.second[0], bg, T.second);
  const orange = orangeFor(normal[0], normal[2], bg, l => lighten(l.L, l.C, l.h, bg, T.normal));
  return {
    ansi, accent, second,
    colors: {
      mode: 'dark', accent, selection: mix(bg, accent, .28), muted: ansi[8],
      background: bg, dark_background: mix(bg, '#000000', .25), darker_background: mix(bg, '#000000', .5), lighter_background: ansi[0],
      foreground: fg, dark_foreground: mix(fg, bg, .38), light_foreground: ansi[7], bright_foreground: ansi[15],
      red: normal[0], yellow: normal[2], orange, green: normal[1], cyan: normal[5], blue: normal[3], magenta: normal[4],
      brown: lighten(.5, .08, 55, bg, 3),
      bright_red: bright[0], bright_yellow: bright[2], bright_green: bright[1], bright_cyan: bright[5], bright_blue: bright[3], bright_magenta: bright[4],
    },
  };
}

// The day background is a cream tone. Warm hues move halfway to the hue of
// cream, so a brown night background does not turn pink in daylight. Cool
// hues stay. Darker teas get a slightly darker cream. dayHue replaces the
// hue when the night hue does not suit a light room.
function dayBackground(t) {
  const [, bc, bh] = t.bg;
  const h = t.dayHue ?? (bh < 130 || bh > 330 ? bh + hueDelta(bh, 85) * .5 : bh);
  return [.962 - (t.deep > .8 ? .012 : 0), Math.min(Math.max(bc * .7, .012), .026), (h + 360) % 360];
}

function dayPalette(t, r) {
  const [dl, dc, dh] = dayBackground(t);
  const bg = oklchHex(dl, dc, dh);
  const list = slots(t, r);
  const T = TARGET.day;
  const fit = (L, C, h) => darken(L, C * 1.08, h, bg, T.normal);
  const normal = separate(list.map(s => fit(s.day, s.c, s.h)), list, -.03, fit);
  const bright = list.map((s, k) => darken(hexOklch(normal[k]).L - .06, s.c * 1.12, s.h, bg, T.bright));
  const fg = darken(.3, Math.min(t.bg[1] * .8 + .01, .04), dh, bg, T.fg);
  const ansi = [
    oklchHex(dl - .055, dc * 1.4, dh), ...normal, oklchHex(.42, Math.min(t.bg[1] * .7 + .01, .035), dh),
    darken(.6, Math.min(t.bg[1] * .7 + .01, .035), dh, bg, T.muted), ...bright, oklchHex(.2, Math.min(t.bg[1] * .6 + .01, .03), dh),
  ];
  const accent = darken(Math.min(t.accent[2] || .55, .55), Math.max(t.accent[1] * 1.1, .06), t.accent[0], bg, T.accent);
  const second = darken(Math.min(t.second[2] || .55, .58), Math.max(t.second[1] * 1.1, .05), t.second[0], bg, T.second);
  const orange = orangeFor(normal[0], normal[2], bg, l => darken(l.L, l.C, l.h, bg, T.normal));
  return {
    ansi, accent, second,
    colors: {
      mode: 'light', accent, selection: mix(bg, accent, .22), muted: ansi[8],
      background: bg, dark_background: oklchHex(dl - .03, dc * 1.2, dh), darker_background: oklchHex(dl - .07, dc * 1.3, dh), lighter_background: ansi[0],
      foreground: fg, dark_foreground: darken(.5, Math.min(dc + .01, .03), dh, bg, 5), light_foreground: ansi[7], bright_foreground: ansi[15],
      red: normal[0], yellow: normal[2], orange, green: normal[1], cyan: normal[5], blue: normal[3], magenta: normal[4],
      brown: darken(.45, .08, 55, bg, 5),
      bright_red: bright[0], bright_yellow: bright[2], bright_green: bright[1], bright_cyan: bright[5], bright_blue: bright[3], bright_magenta: bright[4],
    },
  };
}

// Orange sits between the red and yellow hues of each palette.
function orangeFor(red, yellow, bg, fit) {
  const a = hexOklch(red), b = hexOklch(yellow);
  return fit({ L: (a.L + b.L) / 2, C: (a.C + b.C) / 2, h: a.h + hueDelta(a.h, b.h) / 2 });
}

// Variant order, labels, and the suffix of the installed theme name.
export const VARIANTS = [
  { key: 'night', label: 'Night', suffix: '-night', mode: 'dark' },
  { key: 'day', label: 'Day', suffix: '-day', mode: 'light' },
];

export { CATEGORIES };

export const themes = TABLE.map(([name, cat, desc, o], i) => {
  const slug = slugify(name);
  const t = { warm: .4, deep: .5, ...o };
  if (SIGNATURE[name]) t.sig = SIGNATURE[name].split(',').map(x => x.trim().split(/\s+/).map(Number));
  const make = (key, build) => {
    const v = VARIANTS.find(x => x.key === key);
    const p = build(t, rng(i * 7919 + 13));
    return { variant: key, label: v.label, install: `${slug}${v.suffix}`, name: `${name} ${v.label}`, ansi: p.ansi, second: p.second, icons: iconTheme(p.accent), colors: p.colors };
  };
  return {
    index: i + 1, name, slug, cat, category: CATEGORIES[cat], desc, origin: t.origin || '',
    liquor: t.liquor, leaf: t.leaf, top: t.top, vessel: t.vessel, swirl: t.swirl, table: t.table,
    brew: t.brew, steps: t.steps, deep: t.deep, signature: !!t.sig,
    variants: { night: make('night', nightPalette), day: make('day', dayPalette) },
  };
});

export function colorsToml(v) {
  const k = v.colors;
  return `mode = "${k.mode}"

accent = "${k.accent}"
selection = "${k.selection}"
muted = "${k.muted}"

background = "${k.background}"
dark_background = "${k.dark_background}"
darker_background = "${k.darker_background}"
lighter_background = "${k.lighter_background}"

foreground = "${k.foreground}"
dark_foreground = "${k.dark_foreground}"
light_foreground = "${k.light_foreground}"
bright_foreground = "${k.bright_foreground}"

hyprland_active_border = "rgba(${k.accent.slice(1)}ee) rgba(${v.second.slice(1)}ee) 45deg"
hyprland_inactive_border = "rgba(${k.muted.slice(1)}aa)"

red = "${k.red}"
yellow = "${k.yellow}"
orange = "${k.orange}"
green = "${k.green}"
cyan = "${k.cyan}"
blue = "${k.blue}"
magenta = "${k.magenta}"
brown = "${k.brown}"

bright_red = "${k.bright_red}"
bright_yellow = "${k.bright_yellow}"
bright_green = "${k.bright_green}"
bright_cyan = "${k.bright_cyan}"
bright_blue = "${k.bright_blue}"
bright_magenta = "${k.bright_magenta}"
`;
}
