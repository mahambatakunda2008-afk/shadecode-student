/**
 * Generates every Shadecode Student brand asset (SVG + PNG) from ONE source:
 * src/lib/brand/markGeometry.json (the layered mark). Runs on predev/prebuild.
 * Do not hand-edit the generated files; edit the JSON and re-run `npm run generate:brand`.
 */
import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const geo = JSON.parse(readFileSync(join(root, "src/lib/brand/markGeometry.json"), "utf8"));
const iconsDir = join(root, "public", "icons");
const brandDir = join(root, "public", "brand");
const { glyphCenter: C } = geo;

const write = (file, text) => {
  mkdirSync(dirname(file), { recursive: true });
  const current = existsSync(file) ? readFileSync(file, "utf8") : null;
  if (current !== text) writeFileSync(file, text); // keep git diffs clean when nothing changed
};

const f = (n) => String(Math.round(n * 100) / 100);

function defs(prefix) {
  const grads = geo.gradients.map((g) => {
    const stops = g.stops.map(([o, c]) => `<stop offset="${o}" stop-color="${c}"/>`).join("");
    return `<linearGradient id="${prefix}-${g.id}" x1="${g.x1}" y1="${g.y1}" x2="${g.x2}" y2="${g.y2}" gradientUnits="userSpaceOnUse">${stops}</linearGradient>`;
  });
  return `<defs>${grads.join("")}</defs>`;
}

/** Layered glyph shapes. `flat` renders all three layers in one colour, without depth effects. */
function shapes(prefix, flat) {
  const dp = geo.depth;
  const [top, middle, bottom] = geo.layers;
  const layer = (l) =>
    flat
      ? `<path d="${l.d}" fill="${flat}"/>`
      : `<path d="${l.d}" fill="url(#${prefix}-${geo.gradients[0].id})" stroke="${dp.edgeColor}" stroke-opacity="${dp.edgeOpacity}" stroke-width="${dp.edgeWidth}" stroke-linejoin="round"/>`;
  const shadow = (l) => (flat ? "" : `<path d="${l.d}" fill="${dp.shadowColor}" fill-opacity="${dp.shadowOpacity}" transform="translate(0 ${dp.shadowDy})"/>`);
  // Back to front: each upper layer casts a soft shadow onto the layers beneath it.
  return layer(bottom) + shadow(middle) + layer(middle) + shadow(top) + layer(top);
}

/** Centre the glyph on (cx, cy) of the 1024 canvas at the given scale. */
const place = (scale, cx = 512, cy = 512) =>
  `<g transform="translate(${f(cx)} ${f(cy)}) scale(${scale}) translate(${-C.x} ${-C.y})">`;

const TITLE = "Shadecode Student";
const svgOpen = (viewBox, extra = "") =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}" role="img" aria-labelledby="title"${extra}><title id="title">${TITLE}</title>`;

function tileSvg({ theme = "dark", rounded = true, scale = 1.12 }) {
  const t = geo.tile[theme];
  const rx = rounded ? 224 : 0;
  const bg = `<rect width="1024" height="1024" rx="${rx}" fill="${t.bg}"/>`;
  const border = rounded ? `<rect x="5" y="5" width="1014" height="1014" rx="220" fill="none" stroke="${t.border}" stroke-width="5"/>` : "";
  return `${svgOpen("0 0 1024 1024")}${defs("sc")}${bg}${border}${place(scale)}${shapes("sc")}</g></svg>\n`;
}

const markSvg = (flat) => `${svgOpen(geo.inlineViewBox)}${flat ? "" : defs("sc")}${shapes("sc", flat)}</svg>\n`;
const masterSvg = () => `${svgOpen("0 0 1024 1024")}${defs("sc")}${place(1.1)}${shapes("sc")}</g></svg>\n`;

function logoSvg() {
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 900 240" role="img" aria-labelledby="title desc"><title id="title">${TITLE}</title><desc id="desc">Shadecode Student folded-S mark with wordmark.</desc>` +
    `${defs("sc")}<g transform="translate(110 120) scale(.33) translate(${-C.x} ${-C.y})">${shapes("sc")}</g>` +
    `<text x="245" y="113" font-family="Arial,Helvetica,sans-serif" font-size="64" font-weight="650" letter-spacing="1" fill="#F8FAFC">SHADECODE</text>` +
    `<text x="249" y="166" font-family="Arial,Helvetica,sans-serif" font-size="26" font-weight="500" letter-spacing="9" fill="#CBD5E1">STUDENT</text></svg>\n`
  );
}

// ---- SVG outputs -----------------------------------------------------------------
const darkTile = tileSvg({ theme: "dark" });
const outputs = {
  [join(brandDir, "shadecode-app-icon.svg")]: darkTile,
  [join(brandDir, "shadecode-app-icon-dark.svg")]: darkTile,
  [join(brandDir, "shadecode-app-icon-light.svg")]: tileSvg({ theme: "light" }),
  [join(brandDir, "shadecode-app-icon-fullbleed.svg")]: tileSvg({ theme: "dark", rounded: false }),
  [join(brandDir, "shadecode-app-icon-maskable.svg")]: tileSvg({ theme: "dark", rounded: false, scale: 1.0 }),
  [join(brandDir, "shadecode-icon-master.svg")]: masterSvg(),
  [join(brandDir, "shadecode-mark.svg")]: markSvg(),
  [join(brandDir, "shadecode-mark-white.svg")]: markSvg("#FFFFFF"),
  [join(brandDir, "shadecode-mark-reversed.svg")]: markSvg(geo.tile.dark.bg),
  [join(brandDir, "shadecode-student-logo.svg")]: logoSvg(),
  [join(iconsDir, "shadecode-student.svg")]: darkTile,
  [join(root, "public", "favicon.svg")]: darkTile,
  [join(root, "src", "app", "icon.svg")]: darkTile,
};
for (const [file, text] of Object.entries(outputs)) write(file, text);

// ---- PNG outputs -----------------------------------------------------------------
const fullBleed = tileSvg({ theme: "dark", rounded: false });
const maskable = tileSvg({ theme: "dark", rounded: false, scale: 1.0 });
const light = tileSvg({ theme: "light" });
// Tiny favicons need a larger glyph to stay legible.
const small = tileSvg({ theme: "dark", scale: 1.38 });

async function png(svg, size, name, background) {
  const dest = join(iconsDir, name);
  mkdirSync(dirname(dest), { recursive: true });
  // Home-screen icons must be opaque; flatten any transparent corners onto the tile colour.
  await sharp(Buffer.from(svg)).resize(size, size).flatten({ background }).png({ palette: false }).toFile(dest);
}

const dark = geo.tile.dark.rasterBg;
(async () => {
  for (const s of [16, 32, 48]) await png(small, s, `shadecode-student-${s}.png`, dark);
  for (const s of [72, 96, 192, 256, 384, 512, 1024]) await png(darkTile, s, `shadecode-student-${s}.png`, dark);
  // iOS applies its own corner mask: these must be full-bleed opaque squares.
  for (const s of [120, 144, 152, 180]) await png(fullBleed, s, `shadecode-student-${s}.png`, dark);
  for (const s of [192, 512]) await png(darkTile, s, `shadecode-student-dark-${s}.png`, dark);
  for (const s of [180, 512]) await png(light, s, `shadecode-student-light-${s}.png`, geo.tile.light.rasterBg);
  for (const s of [192, 512, 1024]) await png(maskable, s, `shadecode-student-maskable-${s}.png`, dark);
  await png(small, 32, "favicon.png", dark);
  await png(fullBleed, 180, "apple-touch-icon.png", dark);
  console.log("Generated Shadecode Student brand SVG + PNG assets from markGeometry.json");
})();
