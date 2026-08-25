export interface Point { x: number; y: number }

export interface LineFit {
  start: Point;
  end: Point;
  angle: number;
  length: number;
  error: number;
}

export function distance(a: Point, b: Point): number {
  return Math.hypot(b.x - a.x, b.y - a.y);
}

export function angle(a: Point, b: Point): number {
  return Math.atan2(b.y - a.y, b.x - a.x);
}

export function snapAngle(radians: number, increment = Math.PI / 12): number {
  return Math.round(radians / increment) * increment;
}

export function fitLine(points: Point[]): LineFit | null {
  if (points.length < 2) return null;
  const start = points[0];
  const end = points[points.length - 1];
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const length = Math.hypot(dx, dy);
  if (length === 0) return { start, end, angle: 0, length: 0, error: 0 };
  const nx = -dy / length;
  const ny = dx / length;
  const error = points.reduce((sum, p) => sum + Math.abs((p.x - start.x) * nx + (p.y - start.y) * ny), 0) / points.length;
  return { start, end, angle: Math.atan2(dy, dx), length, error };
}

export function straighten(points: Point[], maxError: number): Point[] {
  const fit = fitLine(points);
  if (!fit || fit.error > maxError) return points;
  return [fit.start, fit.end];
}

export function snapLine(points: Point[], angleIncrement = Math.PI / 12): Point[] {
  const fit = fitLine(points);
  if (!fit || fit.length === 0) return points;
  const a = snapAngle(fit.angle, angleIncrement);
  const dx = fit.end.x - fit.start.x;
  const dy = fit.end.y - fit.start.y;
  const projectedLength = dx * Math.cos(a) + dy * Math.sin(a);
  return [fit.start, { x: fit.start.x + Math.cos(a) * projectedLength, y: fit.start.y + Math.sin(a) * projectedLength }];
}

export function joinEndpoint(point: Point, endpoints: Point[], radius: number): Point {
  let best = point;
  let bestDistance = radius;
  for (const endpoint of endpoints) {
    const d = distance(point, endpoint);
    if (d <= bestDistance) { best = endpoint; bestDistance = d; }
  }
  return best;
}

export function smooth(points: Point[], passes = 2): Point[] {
  if (points.length < 3) return points;
  let current = [...points];
  for (let pass = 0; pass < passes; pass++) {
    const next = [current[0]];
    for (let i = 1; i < current.length - 1; i++) {
      next.push({
        x: (current[i - 1].x + 2 * current[i].x + current[i + 1].x) / 4,
        y: (current[i - 1].y + 2 * current[i].y + current[i + 1].y) / 4,
      });
    }
    next.push(current[current.length - 1]);
    current = next;
  }
  return current;
}
