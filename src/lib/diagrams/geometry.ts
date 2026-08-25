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
      return {
        x: (all[index - 1].x + point.x * 2 + all[index + 1].x) / 4,
        y: (all[index - 1].y + point.y * 2 + all[index + 1].y) / 4,
      };
    });
  }
  return result;
}

export function snapEndpoint(point: DiagramPoint, candidates: DiagramPoint[], threshold = 14): DiagramPoint {
  let nearest = point;
  let best = threshold;
  for (const candidate of candidates) {
    const d = distance(point, candidate);
    if (d < best) {
      best = d;
      nearest = candidate;
    }
  }
  return nearest;
}

function endpointCandidates(diagram: StructuredDiagram): DiagramPoint[] {
  return diagram.elements.flatMap(element => {
    if (element.points.length === 0) return [];
    if (element.points.length === 1) return [element.points[0]];
    return [element.points[0], element.points[element.points.length - 1]];
  });
}

export function cleanDiagram(diagram: StructuredDiagram, threshold = 14): StructuredDiagram {
  const anchors = endpointCandidates(diagram);
  return {
    ...diagram,
    elements: diagram.elements.map(element => {
      if (element.points.length < 2) return element;
      const last = element.points.length - 1;
      return {
        ...element,
        points: element.points.map((point, index) => {
          if (index !== 0 && index !== last) return point;
          const candidates = anchors.filter(candidate => candidate !== point);
          return snapEndpoint(point, candidates, threshold);
        }),
      };
    }),
  };
}
