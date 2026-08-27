export type CanvasPoint = { x: number; y: number };
export type CanvasStroke = { points: CanvasPoint[] };
export type CanvasBounds = { x: number; y: number; width: number; height: number; rotation: number };
export type CanvasObject = { id: string; bounds: CanvasBounds; strokeIndexes: number[] };
export type CanvasSnapshot = { strokes: CanvasStroke[]; objects: CanvasObject[] };

export function cloneCanvas(snapshot: CanvasSnapshot): CanvasSnapshot {
  return {
    strokes: snapshot.strokes.map(s => ({ points: s.points.map(p => ({ ...p })) })),
    objects: snapshot.objects.map(o => ({ ...o, bounds: { ...o.bounds }, strokeIndexes: [...o.strokeIndexes] })),
  };
}

export function deleteObjects(snapshot: CanvasSnapshot, selected: number[]): CanvasSnapshot {
  const remove = new Set(selected);
  const keptObjects = snapshot.objects.filter((_, i) => !remove.has(i));
  const used = new Set(keptObjects.flatMap(o => o.strokeIndexes));
  return { ...cloneCanvas(snapshot), objects: keptObjects, strokes: snapshot.strokes.filter((_, i) => used.has(i)) };
}

export function duplicateObjects(snapshot: CanvasSnapshot, selected: number[]): CanvasSnapshot {
  const next = cloneCanvas(snapshot);
  selected.forEach(i => {
    const object = snapshot.objects[i];
    if (!object) return;
    const indexes = object.strokeIndexes.map(index => {
      const stroke = snapshot.strokes[index];
      if (!stroke) return -1;
      next.strokes.push({ points: stroke.points.map(p => ({ x: p.x + 16, y: p.y + 16 })) });
      return next.strokes.length - 1;
    }).filter(index => index >= 0);
    next.objects.push({ ...object, id: crypto.randomUUID(), bounds: { ...object.bounds, x: object.bounds.x + 16, y: object.bounds.y + 16 }, strokeIndexes: indexes });
  });
  return next;
}
