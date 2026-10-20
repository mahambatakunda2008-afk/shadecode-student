import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

/** PNG IHDR: width at byte 16, height at 20, colour type at 25 (2 = RGB with no alpha channel). */
function pngInfo(rel: string) {
  const b = readFileSync(path.join(process.cwd(), "public", "icons", rel));
  expect(b.subarray(0, 8).toString("hex"), `${rel} is a PNG`).toBe("89504e470d0a1a0a");
  return { width: b.readUInt32BE(16), height: b.readUInt32BE(20), colorType: b[25] };
}

describe("iOS home-screen icons", () => {
  // iOS fills transparency with black and applies its own corner mask, so these must be opaque full-bleed squares.
  for (const [file, size] of [["apple-touch-icon.png", 180], ["shadecode-student-120.png", 120], ["shadecode-student-144.png", 144], ["shadecode-student-152.png", 152], ["shadecode-student-180.png", 180]] as const) {
    it(`${file} is an opaque ${size}px square`, () => {
      const info = pngInfo(file);
      expect(info.width).toBe(size);
      expect(info.height).toBe(size);
      expect(info.colorType).toBe(2);
    });
  }
  it("keeps the standard install icons at their declared sizes", () => {
    expect(pngInfo("shadecode-student-192.png")).toMatchObject({ width: 192, height: 192 });
    expect(pngInfo("shadecode-student-512.png")).toMatchObject({ width: 512, height: 512 });
    expect(pngInfo("shadecode-student-maskable-512.png")).toMatchObject({ width: 512, height: 512 });
  });
});
