import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { MARK_GRADIENT, MARK_PATHS } from "./markGeometry";

const read = (rel: string) => readFileSync(path.join(process.cwd(), rel), "utf8");

describe("brand mark geometry stays in sync", () => {
  const sources: Array<[string, string]> = [
    ["src/components/brand/BrandMark.tsx", "React component"],
    ["public/brand/shadecode-mark.svg", "gradient mark"],
    ["public/brand/shadecode-mark-white.svg", "white mark"],
  ];
  for (const [file, label] of sources) {
    it(`${label} (${file}) uses the canonical S paths`, () => {
      const text = read(file);
      for (const d of MARK_PATHS) expect(text).toContain(d);
    });
  }
  it("components and the gradient mark use the canonical gradient colours and stops", () => {
    for (const file of ["src/components/brand/BrandMark.tsx", "public/brand/shadecode-mark.svg"]) {
      const text = read(file).toLowerCase();
      for (const [, color] of MARK_GRADIENT.stops) expect(text).toContain(color.toLowerCase());
    }
  });
});
