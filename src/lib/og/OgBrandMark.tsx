import { MARK_GRADIENT, MARK_PATHS, MARK_TRANSLATE, MARK_VIEWBOX } from "@/lib/brand/markGeometry";

/**
 * Official Shadecode mark for generated share-card images (inline SVG, so no font or network needed).
 * Pass `color` for a flat single-colour mark; omit it for the brand gradient.
 */
export function OgBrandMark({ size, color }: { size: number; color?: string }) {
  const fill = color ?? "url(#shadecode-og-gradient)";
  return (
    <svg width={size} height={size} viewBox={`0 0 ${MARK_VIEWBOX} ${MARK_VIEWBOX}`} xmlns="http://www.w3.org/2000/svg">
      {color ? null : (
        <defs>
          <linearGradient id="shadecode-og-gradient" x1={MARK_GRADIENT.x1} y1={MARK_GRADIENT.y1} x2={MARK_GRADIENT.x2} y2={MARK_GRADIENT.y2} gradientUnits="userSpaceOnUse">
            {MARK_GRADIENT.stops.map(([offset, stopColor]) => (
              <stop key={offset} offset={offset} stopColor={stopColor} />
            ))}
          </linearGradient>
        </defs>
      )}
      <g fill={fill} transform={`translate(${MARK_TRANSLATE.x} ${MARK_TRANSLATE.y})`}>
        {MARK_PATHS.map((d) => (
          <path key={d} d={d} />
        ))}
      </g>
    </svg>
  );
}
