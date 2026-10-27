import { useId, type SVGProps } from "react";
import { MARK_DEPTH, MARK_GRADIENTS, MARK_VIEWBOX, markDrawOrder } from "@/lib/brand/markGeometry";

export type BrandMarkProps = SVGProps<SVGSVGElement> & { title?: string };

/** Shadecode layered mark. Geometry comes from `@/lib/brand/markGeometry` (single source of truth). */
export function BrandMark({ title = "Shadecode Student", className, ...props }: BrandMarkProps) {
  // Each instance needs its own SVG paint-server IDs: shared hard-coded IDs can resolve
  // to a different SVG instance on pages that render several marks.
  const base = `shadecode-mark-${useId().replace(/:/g, "")}`;
  return (
    <svg
      viewBox={MARK_VIEWBOX}
      aria-hidden={title ? undefined : true}
      role={title ? "img" : undefined}
      aria-label={title || undefined}
      className={className}
      focusable="false"
      preserveAspectRatio="xMidYMid meet"
      {...props}
    >
      {title ? <title>{title}</title> : null}
      <defs>
        {MARK_GRADIENTS.map((g) => (
          <linearGradient key={g.id} id={`${base}-${g.id}`} x1={g.x1} y1={g.y1} x2={g.x2} y2={g.y2} gradientUnits="userSpaceOnUse">
            {g.stops.map(([offset, color]) => (
              <stop key={offset} offset={offset} stopColor={color} />
            ))}
          </linearGradient>
        ))}
      </defs>
      {markDrawOrder().map((item) =>
        item.kind === "shadow" ? (
          <path key={item.key} d={item.d} fill={MARK_DEPTH.shadowColor} fillOpacity={item.opacity} transform={`translate(0 ${item.dy})`} />
        ) : item.kind === "tint" ? (
          <path key={item.key} d={item.d} fill={MARK_DEPTH.tintColor} fillOpacity={item.opacity} />
        ) : (
          <path
            key={item.key}
            d={item.d}
            fill={`url(#${base}-${MARK_GRADIENTS[0].id})`}
            stroke={MARK_DEPTH.edgeColor}
            strokeOpacity={MARK_DEPTH.edgeOpacity}
            strokeWidth={MARK_DEPTH.edgeWidth}
            strokeLinejoin="round"
          />
        ),
      )}
    </svg>
  );
}
