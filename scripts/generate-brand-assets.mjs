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

/** Layered glyph. Full colour = overlapping sheets with shadows and tints; `flat` = original gapped silhouette in one colour. */
function shapes(prefix, flat) {
  const dp = geo.depth;
  const order = [...geo.layers].reverse(); // bottom, middle, top
  if (flat) return geo.layers.map((l) => `<path d="${l.flatD}" fill="${flat}"/>`).join("");
  return order
    .map((l, i) => {
      const shadows = i === 0 ? "" : dp.shadows.map((s) => `<path d="${l.d}" fill="${dp.shadowColor}" fill-opacity="${s.opacity}" transform="translate(0 ${s.dy})"/>`).join("");
      const face = `<path d="${l.d}" fill="url(#${prefix}-${geo.gradients[0].id})" stroke="${dp.edgeColor}" stroke-opacity="${dp.edgeOpacity}" stroke-width="${dp.edgeWidth}" stroke-linejoin="round"/>`;
      const tint = l.tint > 0 ? `<path d="${l.d}" fill="${dp.tintColor}" fill-opacity="${l.tint}"/>` : "";
      return shadows + face + tint;
    })
    .join("");
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
  // Dark tile gets a subtle vertical depth gradient (bg -> bg2); the light tile stays flat.
  const tileGrad = t.bg2 ? `<linearGradient id="sc-tile" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${t.bg}"/><stop offset="1" stop-color="${t.bg2}"/></linearGradient>` : "";
  const bg = `${tileGrad ? `<defs>${tileGrad}</defs>` : ""}<rect width="1024" height="1024" rx="${rx}" fill="${t.bg2 ? "url(#sc-tile)" : t.bg}"/>`;
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

// ---- Android launcher icon (VectorDrawable) -----------------------------------------
// Same canonical geometry as the web icons, so the installed app and the website always show the same mark.
// Skipped when the android/ project is absent (e.g. a web-only checkout).
const androidRes = join(root, "android", "app", "src", "main", "res");
if (existsSync(androidRes)) {
  const S = 0.115; // glyph ~61dp tall inside the 108dp adaptive canvas (66dp safe zone)
  const tx = f(54 - C.x * S);
  const ty = f(54 - C.y * S);
  const g = geo.gradients[0];
  const dp = geo.depth;
  const [top, middle, bottom] = geo.layers;
  const XML = '<?xml version="1.0" encoding="utf-8"?>\n';
  const vectorOpen = `<vector xmlns:android="http://schemas.android.com/apk/res/android"\n    xmlns:aapt="http://schemas.android.com/aapt"\n    android:width="108dp"\n    android:height="108dp"\n    android:viewportWidth="108"\n    android:viewportHeight="108">\n`;
  const groupOpen = `    <group\n        android:pivotX="0"\n        android:pivotY="0"\n        android:scaleX="${S}"\n        android:scaleY="${S}"\n        android:translateX="${tx}"\n        android:translateY="${ty}">\n`;
  const gradient = `            <aapt:attr name="android:fillColor">\n                <gradient\n                    android:startX="${g.x1}"\n                    android:startY="${g.y1}"\n                    android:endX="${g.x2}"\n                    android:endY="${g.y2}"\n                    android:type="linear">\n${g.stops.map(([o, c]) => `                    <item android:color="${c}" android:offset="${o}" />\n`).join("")}                </gradient>\n            </aapt:attr>\n`;
  const face = (l) => `        <path\n            android:pathData="${l.d}"\n            android:strokeColor="${dp.edgeColor}"\n            android:strokeAlpha="${dp.edgeOpacity}"\n            android:strokeWidth="${dp.edgeWidth}"\n            android:strokeLineJoin="round">\n${gradient}        </path>\n`;
  const shadows = (l) => dp.shadows.map((s) => `        <group android:translateY="${s.dy}">\n            <path\n                android:pathData="${l.d}"\n                android:fillColor="${dp.shadowColor}"\n                android:fillAlpha="${s.opacity}" />\n        </group>\n`).join("");
  const foreground = `${XML}${vectorOpen}${groupOpen}${face(bottom)}${shadows(middle)}${face(middle)}${shadows(top)}${face(top)}    </group>\n</vector>\n`;
  const monochrome = `${XML}${vectorOpen}${groupOpen}${geo.layers.map((l) => `        <path\n            android:pathData="${l.flatD}"\n            android:fillColor="#FF000000" />\n`).join("")}    </group>\n</vector>\n`;
  const t = geo.tile.dark;
  const background = `${XML}<shape xmlns:android="http://schemas.android.com/apk/res/android" android:shape="rectangle">\n    <gradient\n        android:angle="270"\n        android:startColor="${t.bg}"\n        android:endColor="${t.bg2 ?? t.bg}" />\n</shape>\n`;
  const adaptive = `${XML}<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">\n    <background android:drawable="@drawable/ic_launcher_background" />\n    <foreground android:drawable="@drawable/ic_launcher_foreground" />\n    <monochrome android:drawable="@drawable/ic_launcher_monochrome" />\n</adaptive-icon>\n`;
  write(join(androidRes, "drawable", "ic_launcher_foreground.xml"), foreground);
  write(join(androidRes, "drawable", "ic_launcher_monochrome.xml"), monochrome);
  write(join(androidRes, "drawable", "ic_launcher_background.xml"), background);
  // minSdk is 26, so adaptive icons are always available; keep every ic_launcher variant identical so no stale logo can resurface.
  for (const dir of ["mipmap", "mipmap-anydpi", "mipmap-anydpi-v26"]) write(join(androidRes, dir, "ic_launcher.xml"), adaptive);
}


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
