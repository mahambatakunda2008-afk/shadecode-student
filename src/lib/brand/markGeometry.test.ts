import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { MARK_COLORS, MARK_PATHS, MARK_RIBBON } from "./markGeometry";

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

/** First path of the retired angular three-band mark. It must never come back. */
const LEGACY_MARK_PATH = "M72.5 146.5 275.5 24.5";

describe("brand mark has a single canonical geometry", () => {
  for (const file of fullMarkSvgs) {
    it(`${file} uses every canonical stroke and colour`, () => {
      const text = read(file);
      for (const d of MARK_PATHS) expect(text).toContain(d);
      for (const color of MARK_COLORS) expect(text.toLowerCase()).toContain(color.toLowerCase());
    });
  }
  for (const file of flatMarkSvgs) {
    it(`${file} uses the canonical ribbon`, () => {
      expect(read(file)).toContain(MARK_RIBBON.d);
    });
  }
  it("React brand mark renders from the shared geometry, not private paths", () => {
    const text = read("src/components/brand/BrandMark.tsx");
    expect(text).toContain("@/lib/brand/markGeometry");
    expect(text).not.toContain('d="M');
  });
  it("no source, public asset or doc-linked file still ships the retired angular mark", () => {
    const dirs = ["src", "public/brand", "public/icons"];
    const walk = (dir: string): string[] =>
      readdirSync(path.join(root, dir), { withFileTypes: true }).flatMap((e) => {
        const rel = path.posix.join(dir, e.name);
        return e.isDirectory() ? walk(rel) : /\.(svg|tsx?|css)$/.test(e.name) ? [rel] : [];
      });
    const offenders = [...dirs.flatMap(walk), "public/favicon.svg"].filter((f) => read(f).includes(LEGACY_MARK_PATH) && !f.endsWith("markGeometry.test.ts"));
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
