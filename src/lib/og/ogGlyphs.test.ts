import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { BrandMark } from "./BrandMark";

const require = createRequire(import.meta.url);
// Same renderer Next uses for opengraph-image routes.
const { ImageResponse } = require("next/dist/compiled/@vercel/og/index.node.js") as {
  ImageResponse: new (el: unknown, o: { width: number; height: number }) => Response;
};

const frame = (child: unknown) => ({
  type: "div",
  props: { style: { display: "flex", width: "100%", height: "100%", background: "#08080c", alignItems: "center", justifyContent: "center", color: "#6366f1", fontSize: 120 }, children: child },
});
const render = async (child: unknown) => Buffer.from(await new ImageResponse(frame(child), { width: 200, height: 200 }).arrayBuffer());

const cardFiles = ["src/app/challenge/[id]/opengraph-image.tsx", "src/app/results/[id]/opengraph-image.tsx"];

describe("share-card images", () => {
  it("draws the brand mark (it is not blank and not a missing glyph)", async () => {
    const mark = await render(createElement(BrandMark, { size: 120, color: "#6366f1" }));
    const blank = await render(null);
    const missing = await render("\u{10FFFF}");
    expect(mark.equals(blank)).toBe(false);
    expect(mark.equals(missing)).toBe(false);
  });

  it("only uses special characters the renderer can actually draw", async () => {
    const missing = await render("\u{10FFFF}");
    const chars = new Set<string>();
    for (const f of cardFiles) {
      for (const ch of readFileSync(path.join(process.cwd(), f), "utf8")) {
        const cp = ch.codePointAt(0)!;
        if (cp > 0xff && cp < 0x1f000) chars.add(ch); // emoji are fetched separately by the renderer
      }
    }
    for (const ch of chars) {
      const out = await render(ch);
      expect(out.equals(missing), `U+${ch.codePointAt(0)!.toString(16).toUpperCase()} (${ch}) renders as a missing glyph`).toBe(false);
    }
  });
});
