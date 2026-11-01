import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const read = (rel: string) => readFileSync(path.join(process.cwd(), rel), "utf8");

describe("link reset must not outrank Tailwind utilities", () => {
  const css = read("src/app/globals.css");

  it("the `a` reset lives in the base layer", () => {
    // Unlayered CSS beats layered CSS, so an unlayered `a { color: inherit }` silently disabled every text-* colour and
    // underline utility on links (e.g. dark text on the cyan download buttons rendered white, 1.44:1).
    expect(css).toMatch(/@layer base\s*\{\s*a\s*\{[^}]*color:\s*inherit/);
    expect(css).not.toMatch(/^a\s*\{[^}]*color:\s*inherit/m);
  });
});

describe("dark marketing pages scope the dark token set", () => {
  it("the landing page is a dark design, so it must apply the .dark tokens (light-mode visitors otherwise get dark text on dark)", () => {
    expect(read("src/app/(public)/page.tsx")).toMatch(/<main className="dark /);
  });

  it("no weak slate-500 text on the dark landing page", () => {
    expect(read("src/app/(public)/page.tsx")).not.toContain("text-slate-500");
  });
});
