import { MARK_GRADIENTS, MARK_STROKES, MARK_VIEWBOX } from "@/lib/brand/markGeometry";

/**
 * Official Shadecode mark for generated share-card images (inline SVG, so no font or network needed).
 * Pass `color` for a flat single-colour mark (ribbon only); omit it for the full brand mark.
 */
export function OgBrandMark({ size, color }: { size: number; color?: string }) {
  const strokes = color ? MARK_STROKES.filter((s) => s.role === "ribbon") : MARK_STROKES;
  return (
    <svg width={size} height={size} viewBox={MARK_VIEWBOX} xmlns="http://www.w3.org/2000/svg">
      {color ? null : (
        <defs>
          {MARK_GRADIENTS.map((g) => (
            <linearGradient key={g.id} id={`shadecode-og-${g.id}`} x1={g.x1} y1={g.y1} x2={g.x2} y2={g.y2} gradientUnits="userSpaceOnUse">
              {g.stops.map(([offset, stopColor]) => (
                <stop key={offset} offset={offset} stopColor={stopColor} />
              ))}
            </linearGradient>
          ))}
        </defs>
      )}
      {strokes.map((s) => (
        <path
          key={s.d}
          d={s.d}
          fill="none"
          stroke={color ?? (s.gradient ? `url(#shadecode-og-${s.gradient})` : s.color)}
          strokeOpacity={color ? undefined : s.opacity}
          strokeWidth={s.width}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ))}
    </svg>
  );
}
