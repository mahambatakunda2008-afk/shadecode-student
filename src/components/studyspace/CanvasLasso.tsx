"use client";

import { useRef, useState, type PointerEvent } from "react";
import type { CanvasObject } from "@/lib/studyspace/canvas-objects";

type Props = { objects: CanvasObject[]; onSelect?: (ids: string[]) => void };

function inside(point: { x: number; y: number }, polygon: { x: number; y: number }[]) {
  let hit = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const a = polygon[i], b = polygon[j];
    if ((a.y > point.y) !== (b.y > point.y) && point.x < ((b.x - a.x) * (point.y - a.y)) / (b.y - a.y) + a.x) hit = !hit;
  }
  return hit;
}

export default function CanvasLasso({ objects, onSelect }: Props) {
  const pointsRef = useRef<{ x: number; y: number }[]>([]);
  const [active, setActive] = useState(false);
  const [points, setPoints] = useState<{ x: number; y: number }[]>([]);
  const point = (event: PointerEvent<HTMLDivElement>) => { const r = event.currentTarget.getBoundingClientRect(); return { x: event.clientX - r.left, y: event.clientY - r.top }; };
  const down = (event: PointerEvent<HTMLDivElement>) => { event.currentTarget.setPointerCapture(event.pointerId); const p = point(event); pointsRef.current = [p]; setPoints([p]); setActive(true); };
  const move = (event: PointerEvent<HTMLDivElement>) => { if (!active) return; const p = point(event); pointsRef.current = [...pointsRef.current, p]; setPoints(pointsRef.current); };
  const up = () => { if (!active) return; const polygon = pointsRef.current; if (polygon.length >= 3) onSelect?.(objects.filter((object) => inside({ x: object.bounds.x + object.bounds.width / 2, y: object.bounds.y + object.bounds.height / 2 }, polygon)).map((object) => object.id)); pointsRef.current = []; setPoints([]); setActive(false); };
  return <div className="pointer-events-auto absolute inset-0 z-10 touch-none" onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up} aria-label="Canvas lasso selection">
    {active && <svg className="pointer-events-none absolute inset-0 h-full w-full overflow-visible"><polyline points={points.map((p) => `${p.x},${p.y}`).join(" ")} fill="none" stroke="currentColor" strokeWidth="2" strokeDasharray="6 4" /></svg>}
  </div>;
}
