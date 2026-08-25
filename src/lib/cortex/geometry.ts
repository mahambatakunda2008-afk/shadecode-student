/** Local, deterministic geometry helpers for the intelligent learning canvas. */

export interface Point { x: number; y: number }
export interface Stroke { points: Point[] }
export interface LineCandidate { start: Point; end: Point; length: number; angle: number; confidence: number }

const distance = (a: Point, b: Point) => Math.hypot(b.x - a.x, b.y - a.y);

export function pathLength(points: Point[]): number {
  let total = 0;
  for (let i = 1; i < points.length; i++) total += distance(points[i - 1], points[i]);
  return total;
}

export function endpointDistance(a: Stroke, b: Stroke): number {
  if (!a.points.length || !b.points.length) return Number.POSITIVE_INFINITY;
  const aa = a.points[a.points.length - 1];
  const ab = b.points[0];
  return distance(aa, ab);
}

export function lineFit(points: Point[]): LineCandidate | null {
  if (points.length < 2) return null;
  const start = points[0];
  const end = points[points.length - 1];
  const length = distance(start, end);
  if (length < 1) return null;

  const angle = Math.atan2(end.y - start.y, end.x - start.x);
  let error = 0;
  for (const p of points) {
    error += Math.abs((end.x - start.x) * (start.y - p.y) - (start.x - p.x) * (end.y - start.y)) / length;
  }
  const meanError = error / points.length;
  const confidence = Math.max(0, Math.min(1, 1 - meanError / Math.max(length * 0.08, 1)));
  return { start, end, length, angle, confidence };
}

export function snapAngle(angle: number, increment = Math.PI / 12): number {
  return Math.round(angle / increment) * increment;
}

export function straighten(points: Point[], angleIncrement = Math.PI / 12): Point[] {
  const fit = lineFit(points);
  if (!fit) return points.slice();
  const angle = snapAngle(fit.angle, angleIncrement);
  const ux = Math.cos(angle);
  const uy = Math.sin(angle);
  const projected = points.map((p) => (p.x - fit.start.x) * ux + (p.y - fit.start.y) * uy);
  const min = Math.min(...projected);
  const max = Math.max(...projected);
  return [
    { x: fit.start.x + ux * min, y: fit.start.y + uy * min },
    { x: fit.start.x + ux * max, y: fit.start.y + uy * max },
  ];
}

export function smooth(points: Point[], iterations = 2): Point[] {
  if (points.length < 3) return points.slice();
  let current = points.slice();
  for (let pass = 0; pass < iterations; pass++) {
    const next = [current[0]];
    for (let i = 1; i < current.length - 1; i++) {
      next.push({
        x: (current[i - 1].x + current[i].x * 2 + current[i + 1].x) / 4,
        y: (current[i - 1].y + current[i].y * 2 + current[i + 1].y) / 4,
      });
    }
    next.push(current[current.length - 1]);
    current = next;
  }
  return current;
}

export function joinStrokes(a: Stroke, b: Stroke, tolerance = 18): Stroke {
  if (!a.points.length) return { points: b.points.slice() };
  if (!b.points.length) return { points: a.points.slice() };
  const d = endpointDistance(a, b);
  if (d > tolerance) return { points: a.points.slice() };
  const last = a.points[a.points.length - 1];
  const first = b.points[0];
  const bridge: Point = { x: (last.x + first.x) / 2, y: (last.y + first.y) / 2 };
  return { points: [...a.points.slice(0, -1), bridge, ...b.points.slice(1)] };
}

export function snapPoint(point: Point, target: Point, tolerance = 18): Point {
  return distance(point, target) <= tolerance ? { ...target } : { ...point };
}
