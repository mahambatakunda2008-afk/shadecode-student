import { MARK_DEPTH, MARK_GRADIENTS, MARK_LAYERS, MARK_VIEWBOX, markDrawOrder } from "@/lib/brand/markGeometry";

/**
 * Official Shadecode mark for generated share-card images (inline SVG, so no font or network needed).
 * Pass `color` for a flat single-colour mark; omit it for the full layered brand mark.
 */
export function OgBrandMark({ size, color }: { size: number; color?: string }) {
  const g = MARK_GRADIENTS[0];
  const gradientId = `shadecode-og-${g.id}`;
  return (
    <svg width={size} height={size} viewBox={MARK_VIEWBOX} xmlns="http://www.w3.org/2000/svg">
      {color ? (
        MARK_LAYERS.map((l) => <path key={l.role} d={l.d} fill={color} />)
      ) : (
        <>
          <defs>
            <linearGradient id={gradientId} x1={g.x1} y1={g.y1} x2={g.x2} y2={g.y2} gradientUnits="userSpaceOnUse">
              {g.stops.map(([offset, stopColor]) => (
                <stop key={offset} offset={offset} stopColor={stopColor} />
              ))}
            </linearGradient>
          </defs>
          {markDrawOrder().map((item) =>
            item.kind === "shadow" ? (
              <path key={item.key} d={item.d} fill={MARK_DEPTH.shadowColor} fillOpacity={MARK_DEPTH.shadowOpacity} transform={`translate(0 ${MARK_DEPTH.shadowDy})`} />
            ) : (
              <path key={item.key} d={item.d} fill={`url(#${gradientId})`} stroke={MARK_DEPTH.edgeColor} strokeOpacity={MARK_DEPTH.edgeOpacity} strokeWidth={MARK_DEPTH.edgeWidth} strokeLinejoin="round" />
            ),
          )}
        </>
      )}
    </svg>
  );
}
