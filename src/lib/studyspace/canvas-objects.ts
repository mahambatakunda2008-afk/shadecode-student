export type CanvasObjectKind = "ink" | "text" | "equation" | "shape";

export type CanvasBounds = { x: number; y: number; width: number; height: number; rotation: number };

export type CanvasObject = {
  id: string;
  kind: CanvasObjectKind;
  bounds: CanvasBounds;
  content?: string;
  latex?: string;
  confidence?: number | null;
  strokeIndexes?: number[];
};

export function boundsForPoints(x: number[], y: number[]): CanvasBounds {
  if (!x.length || !y.length) return { x: 0, y: 0, width: 0, height: 0, rotation: 0 };
  const minX = Math.min(...x), maxX = Math.max(...x), minY = Math.min(...y), maxY = Math.max(...y);
  return { x: minX, y: minY, width: Math.max(1, maxX - minX), height: Math.max(1, maxY - minY), rotation: 0 };
}

export function translateBounds(bounds: CanvasBounds, dx: number, dy: number): CanvasBounds {
  return { ...bounds, x: bounds.x + dx, y: bounds.y + dy };
}

export function resizeBounds(bounds: CanvasBounds, width: number, height: number): CanvasBounds {
  return { ...bounds, width: Math.max(1, width), height: Math.max(1, height) };
}

export function nearestAlignment(value: number, guides: number[], tolerance = 10): number | null {
  let best: number | null = null;
  let distance = tolerance + 1;
  for (const guide of guides) {
    const current = Math.abs(value - guide);
    if (current <= tolerance && current < distance) { best = guide; distance = current; }
  }
  return best;
}
