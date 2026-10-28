import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { MARK_COLORS, MARK_FLAT_PATHS, MARK_PATHS } from "./markGeometry";

const root = process.cwd();
const read = (rel: string) => readFileSync(path.join(root, rel), "utf8");

/** Every SVG that carries the full-colour mark must contain all canonical strokes. */
const fullMarkSvgs = [
  "public/favicon.svg",
  "src/app/icon.svg",
  "public/icons/shadecode-student.svg",
  "public/brand/shadecode-mark.svg",
  "public/brand/shadecode-icon-master.svg",
  "public/brand/shadecode-app-icon.svg",
  "public/brand/shadecode-app-icon-dark.svg",
  "public/brand/shadecode-app-icon-light.svg",
  "public/brand/shadecode-app-icon-fullbleed.svg",
  "public/brand/shadecode-app-icon-maskable.svg",
  "public/brand/shadecode-student-logo.svg",
];
const flatMarkSvgs = ["public/brand/shadecode-mark-white.svg", "public/brand/shadecode-mark-reversed.svg"];

/** Retired variants that must never ship: the curvy "folded S" ribbon, and the unrounded sharp-corner polygon. */
const RETIRED_MARK_PATHS = ["M680 340 C620 285", "M72.5 146.5 275.5 24.5"];

describe("brand mark has a single canonical geometry", () => {
  for (const file of fullMarkSvgs) {
    it(`${file} uses every canonical stroke and colour`, () => {
      const text = read(file);
      for (const d of MARK_PATHS) expect(text).toContain(d);
      for (const color of MARK_COLORS) expect(text.toLowerCase()).toContain(color.toLowerCase());
    });
  }
  for (const file of flatMarkSvgs) {
    it(`${file} uses the canonical flat silhouette`, () => {
      const text = read(file);
      for (const d of MARK_FLAT_PATHS) expect(text).toContain(d);
    });
  }
  it("React brand mark renders from the shared geometry, not private paths", () => {
    const text = read("src/components/brand/BrandMark.tsx");
    expect(text).toContain("@/lib/brand/markGeometry");
    expect(text).not.toContain('d="M');
  });
  it("no source or public asset ships a retired mark variant", () => {
    const dirs = ["src", "public/brand", "public/icons"];
    const walk = (dir: string): string[] =>
      readdirSync(path.join(root, dir), { withFileTypes: true }).flatMap((e) => {
        const rel = path.posix.join(dir, e.name);
        return e.isDirectory() ? walk(rel) : /\.(svg|tsx?|css)$/.test(e.name) ? [rel] : [];
      });
    const offenders = [...dirs.flatMap(walk), "public/favicon.svg"].filter((f) => RETIRED_MARK_PATHS.some((r) => read(f).includes(r)) && !f.endsWith("markGeometry.test.ts"));
    expect(offenders).toEqual([]);
  });
});

describe("icon declarations agree with the manifest and files on disk", () => {
  const manifest = JSON.parse(read("public/manifest.json")) as { icons: { src: string }[]; shortcuts: { icons: { src: string }[] }[] };
  const srcs = [...manifest.icons.map((i) => i.src), ...manifest.shortcuts.flatMap((s) => s.icons.map((i) => i.src))];
  it("every manifest icon exists", () => {
    for (const src of srcs) expect(existsSync(path.join(root, "public", src)), src).toBe(true);
  });
  it("layout metadata points only at files that exist, and declares icons once", () => {
    const layout = read("src/app/layout.tsx");
    const refs = [...layout.matchAll(/["'](\/(?:icons|brand)\/[^"']+)["']/g)].map((m) => m[1]);
    expect(refs.length).toBeGreaterThan(0);
    for (const ref of new Set(refs)) expect(existsSync(path.join(root, "public", ref)), ref).toBe(true);
    expect(layout).not.toMatch(/<link\s+rel="(?:icon|apple-touch-icon|manifest)"/);
  });
  it("the unsupported app/apple-icon.svg convention file is gone", () => {
    expect(existsSync(path.join(root, "src/app/apple-icon.svg"))).toBe(false);
  });
});

describe("Android launcher icon uses the canonical mark", () => {
  const res = "android/app/src/main/res";
  const hasAndroid = existsSync(path.join(root, res));
  const adaptiveFiles = ["mipmap/ic_launcher.xml", "mipmap-anydpi/ic_launcher.xml", "mipmap-anydpi-v26/ic_launcher.xml"];
  // Legacy artwork that used to live in the Android project (old sharp three-band mark, old circle logo, old gradient).
  const LEGACY_ANDROID = ["M29.64,36.84", "M29.64,42.48", "M54,12A42,42", "#C135FF", "#00E5FF"];

  it.skipIf(!hasAndroid)("foreground contains every canonical layer path and gradient colour", () => {
    const text = read(`${res}/drawable/ic_launcher_foreground.xml`);
    for (const d of MARK_PATHS) expect(text).toContain(d);
    for (const color of MARK_COLORS) expect(text.toLowerCase()).toContain(color.toLowerCase());
  });
  it.skipIf(!hasAndroid)("monochrome (themed icon) layer uses the canonical silhouette", () => {
    const text = read(`${res}/drawable/ic_launcher_monochrome.xml`);
    for (const d of MARK_FLAT_PATHS) expect(text).toContain(d);
  });
  it.skipIf(!hasAndroid)("every ic_launcher variant is the same adaptive icon, with a monochrome layer", () => {
    const [first, ...rest] = adaptiveFiles.map((f) => read(`${res}/${f}`));
    expect(first).toContain("<adaptive-icon");
    expect(first).toContain("ic_launcher_monochrome");
    for (const other of rest) expect(other).toBe(first);
  });
  it.skipIf(!hasAndroid)("no legacy Android artwork remains", () => {
    const files = [...adaptiveFiles, "drawable/ic_launcher_foreground.xml", "drawable/ic_launcher_background.xml", "drawable/ic_launcher_monochrome.xml"];
    for (const f of files) for (const legacy of LEGACY_ANDROID) expect(read(`${res}/${f}`), `${f} contains ${legacy}`).not.toContain(legacy);
  });
});

