import { describe, expect, it } from "vitest";
import { canWarmLesson, lessonWarmRoute } from "./warmLesson";

describe("lessonWarmRoute", () => {
  it("maps plain lesson ids to their page", () => {
    expect(lessonWarmRoute("3f9c2a1e-aaaa-bbbb-cccc-1234567890ab")).toBe("/learn/3f9c2a1e-aaaa-bbbb-cccc-1234567890ab");
  });
  it("rejects namespaced, short, unsafe and non-string ids", () => {
    for (const bad of ["teacher-tutorial:abc123", "abc", "../admin", "a/b/cdefgh", "x y z w v u", "", null, undefined, 42]) {
      expect(lessonWarmRoute(bad)).toBeNull();
    }
  });
});

describe("canWarmLesson", () => {
  it("warms only when online with a worker and a healthy connection", () => {
    expect(canWarmLesson({ online: true, hasServiceWorker: true, effectiveType: "4g" })).toBe(true);
    expect(canWarmLesson({ online: false, hasServiceWorker: true })).toBe(false);
    expect(canWarmLesson({ online: true, hasServiceWorker: false })).toBe(false);
    expect(canWarmLesson({ online: true, hasServiceWorker: true, saveData: true })).toBe(false);
    expect(canWarmLesson({ online: true, hasServiceWorker: true, effectiveType: "2g" })).toBe(false);
  });
});
