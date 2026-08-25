import type { DiagramPoint, StructuredDiagram } from './types';

const distance = (a: DiagramPoint, b: DiagramPoint) => Math.hypot(a.x - b.x, a.y - b.y);

export function straighten(points: DiagramPoint[]): DiagramPoint[] {
  if (points.length < 2) return points;
  const start = points[0];
  const end = points[points.length - 1];
  return points.map((_, index) => {
    const t = index / (points.length - 1);
    return { x: start.x + (end.x - start.x) * t, y: start.y + (end.y - start.y) * t };
  });
}

export function smooth(points: DiagramPoint[], passes = 1): DiagramPoint[] {
  if (points.length < 3) return points;
  let result = [...points];
  for (let pass = 0; pass < passes; pass++) {
    result = result.map((point, index, all) => {
      if (index === 0 || index === all.length - 1) return point;
      return { x: (all[index - 1].x + point.x * 2 + all[index + 1].x) / 4, y: (all[index - 1].y + point.y * 2 + all[index + 1].y) / 4 };
    });
  }
  return result;
}

export function snapEndpoint(point: DiagramPoint, candidates: DiagramPoint[], threshold = 14): DiagramPoint {
  let nearest = point;
  let best = threshold;
  for (const candidate of candidates) {
    const d = distance(point, candidate);
    if (d < best) { best = d; nearest = candidate; }
  }
  return nearest;
}

export function cleanDiagram(diagram: StructuredDiagram, threshold = 14): StructuredDiagram {
  const anchors = diagram.elements.flatMap(element => element.points);
  return {
    ...diagram,
    elements: diagram.elements.map(element => ({
      ...element,
      points: element.points.map(point => snapEndpoint(point, anchors.filter(candidate => candidate !== point), threshold)),
    })),
  };
}
