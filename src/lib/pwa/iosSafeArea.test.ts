import { describe, expect, it } from "vitest";
import { applyIosStandaloneSafeArea, IOS_STANDALONE_CLASS, isIosStandalone } from "./iosSafeArea";

function fakeDoc(content: string | null) {
  const classes = new Set<string>();
  let metaContent = content;
  const meta = content === null ? null : { getAttribute: () => metaContent, setAttribute: (_: string, v: string) => { metaContent = v; } };
  return { classes, get content() { return metaContent; }, doc: { documentElement: { classList: { add: (t: string) => classes.add(t) } }, querySelector: () => meta } };
}

describe("iOS standalone safe-area mode", () => {
  it("only activates for an installed iOS PWA", () => {
    expect(isIosStandalone({ standalone: true })).toBe(true);
    expect(isIosStandalone({ standalone: false })).toBe(false);
    expect(isIosStandalone({})).toBe(false);
    expect(isIosStandalone(undefined)).toBe(false);
  });
  it("leaves browsers, Android and desktop untouched", () => {
    const f = fakeDoc("width=device-width, initial-scale=1");
    expect(applyIosStandaloneSafeArea(f.doc, {})).toBe(false);
    expect(f.classes.size).toBe(0);
    expect(f.content).toBe("width=device-width, initial-scale=1");
  });
  it("tags <html> and adds viewport-fit=cover for installed iOS", () => {
    const f = fakeDoc("width=device-width, initial-scale=1");
    expect(applyIosStandaloneSafeArea(f.doc, { standalone: true })).toBe(true);
    expect(f.classes.has(IOS_STANDALONE_CLASS)).toBe(true);
    expect(f.content).toBe("width=device-width, initial-scale=1, viewport-fit=cover");
  });
  it("is idempotent and never overrides an explicit viewport-fit", () => {
    const f = fakeDoc("width=device-width, viewport-fit=contain");
    applyIosStandaloneSafeArea(f.doc, { standalone: true });
    applyIosStandaloneSafeArea(f.doc, { standalone: true });
    expect(f.content).toBe("width=device-width, viewport-fit=contain");
  });
  it("tolerates a missing viewport meta tag", () => {
    const f = fakeDoc(null);
    expect(applyIosStandaloneSafeArea(f.doc, { standalone: true })).toBe(true);
    expect(f.classes.has(IOS_STANDALONE_CLASS)).toBe(true);
  });
});
