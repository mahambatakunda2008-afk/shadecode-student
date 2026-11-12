import { DIAGRAM_HEIGHT, DIAGRAM_WIDTH, getDiagramObjectBounds, translateDiagramObject, type DiagramBounds, type DiagramObject } from "./diagram-objects";

export type SelectionAlignment = "start" | "center" | "end";
export type SelectionAxis = "horizontal" | "vertical";

export function getSelectionBounds(objects: DiagramObject[]): DiagramBounds | null {
  if (!objects.length) return null;
  const bounds = objects.map(getDiagramObjectBounds);
  const left = Math.min(...bounds.map(item => item.x));
  const top = Math.min(...bounds.map(item => item.y));
  const right = Math.max(...bounds.map(item => item.x + item.width));
  const bottom = Math.max(...bounds.map(item => item.y + item.height));
  return { x: left, y: top, width: right - left, height: bottom - top };
}

export function translateSelectionWithinCanvas(objects: DiagramObject[], dx: number, dy: number): DiagramObject[] {
  const bounds = getSelectionBounds(objects);
  if (!bounds) return [];
  const safeX = Math.max(-bounds.x, Math.min(DIAGRAM_WIDTH - bounds.x - bounds.width, dx));
  const safeY = Math.max(-bounds.y, Math.min(DIAGRAM_HEIGHT - bounds.y - bounds.height, dy));
  return objects.map(object => translateDiagramObject(object, safeX, safeY));
}

export function alignSelection(objects: DiagramObject[], axis: SelectionAxis, alignment: SelectionAlignment): DiagramObject[] {
  if (objects.length < 2) return objects;
  const bounds = objects.map(getDiagramObjectBounds);
  const starts = bounds.map(item => axis === "horizontal" ? item.x : item.y);
  const ends = bounds.map(item => axis === "horizontal" ? item.x + item.width : item.y + item.height);
  const target = alignment === "start" ? Math.min(...starts) : alignment === "end" ? Math.max(...ends) : (Math.min(...starts) + Math.max(...ends)) / 2;
  return objects.map((object, index) => {
    const ownCenter = (starts[index] + ends[index]) / 2;
    const delta = alignment === "start" ? target - starts[index] : alignment === "end" ? target - ends[index] : target - ownCenter;
    return translateDiagramObject(object, axis === "horizontal" ? delta : 0, axis === "vertical" ? delta : 0);
  });
}

export function distributeSelection(objects: DiagramObject[], axis: SelectionAxis): DiagramObject[] {
  if (objects.length < 3) return objects;
  const indexed = objects.map((object, index) => ({ object, index, bounds: getDiagramObjectBounds(object) }));
  indexed.sort((a, b) => (axis === "horizontal" ? a.bounds.x - b.bounds.x : a.bounds.y - b.bounds.y));
  const start = axis === "horizontal" ? indexed[0].bounds.x : indexed[0].bounds.y;
  const last = indexed[indexed.length - 1].bounds;
  const end = axis === "horizontal" ? last.x + last.width : last.y + last.height;
  const totalSize = indexed.reduce((sum, item) => sum + (axis === "horizontal" ? item.bounds.width : item.bounds.height), 0);
  const gap = (end - start - totalSize) / (indexed.length - 1);
  let cursor = start;
  const result = [...objects];
  for (const item of indexed) {
    const ownStart = axis === "horizontal" ? item.bounds.x : item.bounds.y;
    const delta = cursor - ownStart;
    result[item.index] = translateDiagramObject(item.object, axis === "horizontal" ? delta : 0, axis === "vertical" ? delta : 0);
    cursor += (axis === "horizontal" ? item.bounds.width : item.bounds.height) + gap;
  }
  return result;
}

export function snapTranslationToGrid(dx: number, dy: number, grid = 10): { x: number; y: number } {
  const step = Number.isFinite(grid) && grid > 0 ? grid : 10;
  return { x: Math.round(dx / step) * step, y: Math.round(dy / step) * step };
}
