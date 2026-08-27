import type { CanvasBounds } from "./canvas-objects";

export type EditableCanvasObject<TStroke = unknown> = {
  id: string;
  bounds: CanvasBounds;
  strokeIndexes: number[];
  strokes?: TStroke[];
};

export function selectedIndexesAfterDelete(selected: number[], count: number): number[] {
  return selected.filter((index) => index >= 0 && index < count);
}

export function duplicateObject<T extends EditableCanvasObject>(object: T, id: string): T {
  return { ...object, id, bounds: { ...object.bounds, x: object.bounds.x + 16, y: object.bounds.y + 16 }, strokeIndexes: [...object.strokeIndexes] };
}

export function deleteSelectedObjects<T extends EditableCanvasObject>(objects: T[], selected: number[]): T[] {
  const remove = new Set(selected);
  return objects.filter((_, index) => !remove.has(index));
}
