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
    const state = getShadeNetRuntime(s);
    expect(state.enabled).toBe(false);
    expect(state.deviceId).toBeTruthy();
  });

  it("keeps the same device identity and supports explicit opt-in", () => {
    const s = storage();
    const first = getShadeNetRuntime(s).deviceId;
    setShadeNetEnabled(true, s);
    const second = getShadeNetRuntime(s);
    expect(second.deviceId).toBe(first);
    expect(second.enabled).toBe(true);
  });
});
