import { describe, expect, it } from "vitest";
import { createCanvasHistory, pushCanvasHistory, redoCanvasHistory, undoCanvasHistory } from "./canvas-history";

describe("canvas history", () => {
  it("undoes and redoes immutable snapshots", () => {
    let history = createCanvasHistory(["a"]);
    history = pushCanvasHistory(history, ["a", "b"]);
    history = pushCanvasHistory(history, ["a", "b", "c"]);
    history = undoCanvasHistory(history);
    expect(history.present).toEqual(["a", "b"]);
    history = redoCanvasHistory(history);
    expect(history.present).toEqual(["a", "b", "c"]);
  });

  it("clears redo history after a new edit", () => {
    let history = createCanvasHistory(0);
    history = pushCanvasHistory(history, 1);
    history = undoCanvasHistory(history);
    history = pushCanvasHistory(history, 2);
    expect(history.future).toEqual([]);
  });
});
