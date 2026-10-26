import { useId, type SVGProps } from "react";
import { MARK_GRADIENTS, MARK_STROKES, MARK_VIEWBOX } from "@/lib/brand/markGeometry";

export type BrandMarkProps = SVGProps<SVGSVGElement> & { title?: string };

/** Shadecode folded-S mark. Geometry comes from `@/lib/brand/markGeometry` (single source of truth). */
export function BrandMark({ title = "Shadecode Student", className, ...props }: BrandMarkProps) {
  // Each instance needs its own SVG paint-server IDs: shared hard-coded IDs can resolve
  // to a different SVG instance on pages that render several marks.
  const base = `shadecode-mark-${useId().replace(/:/g, "")}`;
  const ref = (id: string) => `url(#${base}-${id})`;
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
      {MARK_STROKES.map((s) => (
        <path
          key={s.d}
          d={s.d}
          fill="none"
          stroke={s.gradient ? ref(s.gradient) : s.color}
          strokeOpacity={s.opacity}
          strokeWidth={s.width}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ))}
    </svg>
  );
}
