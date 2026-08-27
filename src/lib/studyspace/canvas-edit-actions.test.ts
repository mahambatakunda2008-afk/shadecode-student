import { describe, expect, it } from "vitest";
import { deleteSelectedObjects, duplicateObject, selectedIndexesAfterDelete } from "./canvas-edit-actions";

describe("canvas edit actions", () => {
  const object = { id: "a", bounds: { x: 10, y: 20, width: 30, height: 40, rotation: 0 }, strokeIndexes: [0] };
  it("duplicates with a new id and offset", () => expect(duplicateObject(object, "b")).toMatchObject({ id: "b", bounds: { x: 26, y: 36 } }));
  it("deletes selected objects", () => expect(deleteSelectedObjects([object, { ...object, id: "b" }], [0])).toHaveLength(1));
  it("filters invalid selection indexes", () => expect(selectedIndexesAfterDelete([-1, 0, 4], 2)).toEqual([0]));
});
