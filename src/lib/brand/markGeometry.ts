import geometry from "./markGeometry.json";

/**
 * Canonical Shadecode mark: the ORIGINAL three-layer geometry with softened corners.
 * This JSON is the single source of truth. The React marks, share-card marks and every generated
 * SVG/PNG icon read from it (see scripts/generate-brand-assets.mjs). Never hand-edit generated icons.
 */
export type MarkLayer = { role: "top" | "middle" | "bottom"; d: string; source: string };
export type MarkGradient = { id: string; x1: number; y1: number; x2: number; y2: number; stops: ReadonlyArray<readonly [number, string]> };
export type MarkDepth = { shadowDy: number; shadowColor: string; shadowOpacity: number; edgeColor: string; edgeOpacity: number; edgeWidth: number };

/** Square crop around the glyph (with room for the layer shadows) for inline use at any size. */
export const MARK_VIEWBOX = geometry.inlineViewBox;
export const MARK_GRADIENTS = geometry.gradients as unknown as MarkGradient[];
export const MARK_GRADIENT_ID = MARK_GRADIENTS[0].id;
export const MARK_LAYERS = geometry.layers as unknown as MarkLayer[]; // top, middle, bottom
export const MARK_PATHS: string[] = MARK_LAYERS.map((l) => l.d);
export const MARK_DEPTH = geometry.depth as MarkDepth;
export const MARK_COLORS: string[] = [
  ...MARK_GRADIENTS.flatMap((g) => g.stops.map(([, color]) => color)),
  MARK_DEPTH.shadowColor,
  MARK_DEPTH.edgeColor,
];
export const MARK_TILES = geometry.tile;
export const MARK_CENTER = geometry.glyphCenter;

export type MarkDrawItem = { key: string; kind: "layer" | "shadow"; d: string };

/**
 * Back-to-front draw order. Each upper layer first casts a soft shadow onto the layers beneath it,
 * so the three pieces read as stacked sheets rather than flat shapes.
 */
export function markDrawOrder(): MarkDrawItem[] {
  const [top, middle, bottom] = MARK_LAYERS;
  return [
    { key: "bottom", kind: "layer", d: bottom.d },
    { key: "middle-shadow", kind: "shadow", d: middle.d },
    { key: "middle", kind: "layer", d: middle.d },
    { key: "top-shadow", kind: "shadow", d: top.d },
    { key: "top", kind: "layer", d: top.d },
  ];
}
