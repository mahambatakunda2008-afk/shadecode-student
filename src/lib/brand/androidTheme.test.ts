import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const kotlinPath = "android/app/src/main/java/com/shadecode/student/MainActivity.kt";
const hasAndroid = existsSync(path.join(root, kotlinPath));
const read = (rel: string) => readFileSync(path.join(root, rel), "utf8");

/** Android constant -> web dark token it must mirror (src/app/brand-polish.css, `.dark`). */
const MAPPING: Record<string, string> = {
  ShadeBackground: "--background",
  ShadeForeground: "--foreground",
  ShadeSurface: "--surface",
  ShadeSurfaceVariant: "--surface-2",
  ShadeOutline: "--card-border",
  ShadeMuted: "--muted-foreground",
  ShadePrimary: "--primary",
  ShadeAccent: "--accent",
};

function darkTokens(): Record<string, string> {
  const css = read("src/app/brand-polish.css");
  const start = css.indexOf("\n.dark {");
  const body = css.slice(start, css.indexOf("\n}", start));
  const tokens: Record<string, string> = {};
  for (const m of body.matchAll(/(--[a-z0-9-]+):\s*(#[0-9a-fA-F]{6})\s*;/g)) tokens[m[1]] = m[2].toUpperCase();
  return tokens;
}

describe.skipIf(!hasAndroid)("Android theme mirrors the web dark theme", () => {
  const kotlin = hasAndroid ? read(kotlinPath) : "";
  const tokens = hasAndroid ? darkTokens() : {};

  for (const [constant, token] of Object.entries(MAPPING)) {
    it(`${constant} matches web ${token}`, () => {
      const match = kotlin.match(new RegExp(`private val ${constant} = Color\\(0xFF([0-9A-Fa-f]{6})\\)`));
      expect(match, `${constant} not found in ${kotlinPath}`).not.toBeNull();
      expect(tokens[token], `${token} not found in the web .dark block`).toBeDefined();
      expect(`#${match![1].toUpperCase()}`).toBe(tokens[token]);
    });
  }

  it("window/status-bar colour resource matches the web dark background", () => {
    const xml = read("android/app/src/main/res/values/colors.xml");
    expect(xml).toContain(`name="shadecode_background">${tokens["--background"]}<`);
  });

  it("the theme sets a complete colour scheme and no screen hard-codes the retired cyan palette", () => {
    expect(kotlin).toContain("colorScheme = ShadeColorScheme");
    for (const rel of ["MainActivity.kt", "NativeLessonReader.kt"]) {
      const text = read(`android/app/src/main/java/com/shadecode/student/${rel}`);
      for (const legacy of ["22D3EE", "0891B2", "FF06111C", "FF0B1E2D", "FF102B3C"]) expect(text, `${rel} has ${legacy}`).not.toContain(legacy);
    }
  });
});

describe.skipIf(!hasAndroid)("Android XML resources are well-formed", () => {
  const walk = (dir: string): string[] =>
    readdirSync(path.join(root, dir), { withFileTypes: true }).flatMap((e) => {
      const rel = path.posix.join(dir, e.name);
      return e.isDirectory() ? (e.name === "build" ? [] : walk(rel)) : e.name.endsWith(".xml") ? [rel] : [];
    });

  // The Android build fails (during resource processing, only visible in CI) if an XML comment contains "--"
  // or ends with "-". A comment mentioning a CSS token like --background caused exactly that.
  it("no XML comment contains a double hyphen or ends with a hyphen", () => {
    for (const file of walk("android/app/src/main")) {
      for (const m of read(file).matchAll(/<!--([\s\S]*?)-->/g)) {
        expect(m[1], `${file}: illegal "--" inside XML comment`).not.toContain("--");
        expect(m[1].endsWith("-"), `${file}: XML comment ends with "-"`).toBe(false);
      }
    }
  });
  it("every XML file starts with a declaration or root element and has balanced angle brackets", () => {
    for (const file of walk("android/app/src/main")) {
      const text = read(file).replace(/<!--[\s\S]*?-->/g, "");
      expect(text.trimStart().startsWith("<"), `${file} does not start with <`).toBe(true);
      expect((text.match(/</g) ?? []).length, `${file}: unbalanced < and >`).toBe((text.match(/>/g) ?? []).length);
    }
  });
});

