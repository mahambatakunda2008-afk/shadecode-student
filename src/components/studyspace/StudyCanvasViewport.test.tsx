import { describe, expect, it } from "vitest";
import { DEFAULT_CANVAS_VIEW } from "@/lib/studyspace/canvas-view-state";

describe("StudyCanvasViewport", () => {
  it("starts at the default viewport", () => {
    expect(DEFAULT_CANVAS_VIEW).toEqual({ zoom: 1, offsetX: 0, offsetY: 0 });
  });
});
