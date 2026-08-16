import { describe, expect, it } from "vitest";
import { getShadeNetRuntime, setShadeNetEnabled } from "../runtime";

function storage() {
  const values = new Map<string, string>();
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => { values.set(key, value); },
  };
}

describe("ShadeNet runtime", () => {
  it("is disabled by default", () => {
    const s = storage();
    expect(getShadeNetRuntime(s).enabled).toBe(false);
  });

  it("supports explicit opt-in", () => {
    const s = storage();
    setShadeNetEnabled(true, s);
    expect(getShadeNetRuntime(s).enabled).toBe(true);
  });
});
