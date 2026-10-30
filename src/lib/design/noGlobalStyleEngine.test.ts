import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const read = (rel: string) => readFileSync(path.join(root, rel), "utf8");

/**
 * MUI's ThemeProvider + CssBaseline were mounted in the root layout. Without Next's emotion SSR registry that caused a
 * React hydration error (#418) on every production page, and CssBaseline silently overrode the design-token body
 * background/colour/font-size at runtime. The design system (globals.css + brand-polish.css) owns page-level styles.
 */
describe("root layout owns no global style engine", () => {
  const layout = read("src/app/layout.tsx");

  it("does not mount MUI or emotion providers", () => {
    expect(layout).not.toMatch(/MuiThemeProvider|CssBaseline|@mui|@emotion/);
    expect(existsSync(path.join(root, "src/theme/MuiThemeProvider.tsx"))).toBe(false);
  });

  it("keeps the text anti-aliasing that CssBaseline used to provide, in plain CSS", () => {
    expect(read("src/app/globals.css")).toMatch(/html\s*\{[^}]*-webkit-font-smoothing:\s*antialiased/);
  });

  it("page-level colours come from the design tokens", () => {
    expect(read("src/app/globals.css")).toMatch(/body\s*\{[^}]*background:\s*var\(--background\)[^}]*color:\s*var\(--foreground\)/);
  });
});
