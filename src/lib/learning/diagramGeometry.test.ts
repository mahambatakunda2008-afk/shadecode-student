import { describe, expect, it } from 'vitest';
import { fitLine, joinEndpoint, snapAngle, snapLine, smooth, straighten } from './diagramGeometry';

describe('diagram geometry', () => {
  it('fits a straight line', () => {
    const fit = fitLine([{ x: 0, y: 0 }, { x: 5, y: 0 }]);
    expect(fit?.length).toBe(5);
    expect(fit?.error).toBe(0);
  });

  it('snaps angles', () => {
    expect(snapAngle(0.25, Math.PI / 12)).toBeCloseTo(Math.PI / 12);
  });

  it('straightens a low-error stroke', () => {
    const result = straighten([{ x: 0, y: 0 }, { x: 5, y: 0.02 }, { x: 10, y: -0.01 }], 0.1);
    expect(result).toHaveLength(2);
  });

  it('does not straighten a high-error stroke', () => {
    const points = [{ x: 0, y: 0 }, { x: 5, y: 5 }, { x: 10, y: 0 }];
    expect(straighten(points, 0.1)).toEqual(points);
  });

  it('snaps a line while preserving length', () => {
    const result = snapLine([{ x: 0, y: 0 }, { x: 10, y: 1 }], Math.PI / 2);
    expect(result[1].x).toBeCloseTo(10);
    expect(result[1].y).toBeCloseTo(0);
  });

  it('joins a nearby endpoint', () => {
    expect(joinEndpoint({ x: 9, y: 10 }, [{ x: 10, y: 10 }], 2)).toEqual({ x: 10, y: 10 });
  });

  it('smooths interior points without changing endpoints', () => {
    const result = smooth([{ x: 0, y: 0 }, { x: 5, y: 10 }, { x: 10, y: 0 }], 1);
    expect(result[0]).toEqual({ x: 0, y: 0 });
    expect(result[2]).toEqual({ x: 10, y: 0 });
    expect(result[1].y).toBeLessThan(10);
  });
});
