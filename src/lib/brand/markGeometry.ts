import geometry from "./markGeometry.json";

/**
 * Canonical Shadecode mark: the ORIGINAL three-layer geometry with softened corners.
 * This JSON is the single source of truth. The React marks, share-card marks and every generated
 * SVG/PNG icon read from it (see scripts/generate-brand-assets.mjs). Never hand-edit generated icons.
 */
export type MarkLayer = { role: "top" | "middle" | "bottom"; d: string; flatD: string; source: string; tint: number };
export type MarkGradient = { id: string; x1: number; y1: number; x2: number; y2: number; stops: ReadonlyArray<readonly [number, string]> };
export type MarkDepth = { shadows: { dy: number; opacity: number }[]; shadowColor: string; tintColor: string; edgeColor: string; edgeOpacity: number; edgeWidth: number };

/** Square crop around the glyph (with room for the layer shadows) for inline use at any size. */
export const MARK_VIEWBOX = geometry.inlineViewBox;
export const MARK_GRADIENTS = geometry.gradients as unknown as MarkGradient[];
export const MARK_GRADIENT_ID = MARK_GRADIENTS[0].id;
export const MARK_LAYERS = geometry.layers as unknown as MarkLayer[]; // top, middle, bottom
/** Overlapping "sheet" shapes used by the full-colour mark. */
export const MARK_PATHS: string[] = MARK_LAYERS.map((l) => l.d);
/** Original gapped silhouette (corners softened), used where one flat colour is needed. */
export const MARK_FLAT_PATHS: string[] = MARK_LAYERS.map((l) => l.flatD);
export const MARK_DEPTH = geometry.depth as MarkDepth;
export const MARK_COLORS: string[] = [
  ...MARK_GRADIENTS.flatMap((g) => g.stops.map(([, color]) => color)),
  MARK_DEPTH.shadowColor,
  MARK_DEPTH.edgeColor,
];
export const MARK_TILES = geometry.tile;
export const MARK_CENTER = geometry.glyphCenter;

export type MarkDrawItem = { key: string; kind: "layer" | "shadow" | "tint"; d: string; dy?: number; opacity?: number };

/**
 * Back-to-front draw order. The three pieces are overlapping sheets: each upper sheet first casts soft
 * shadows onto the sheets beneath it, and lower sheets are tinted darker, so they read as a stack.
 */
export function markDrawOrder(): MarkDrawItem[] {
  const order = [...MARK_LAYERS].reverse(); // bottom, middle, top
  return order.flatMap((layer, i) => {
    const items: MarkDrawItem[] = [];
    if (i > 0) MARK_DEPTH.shadows.forEach((sh, n) => items.push({ key: `${layer.role}-shadow-${n}`, kind: "shadow", d: layer.d, dy: sh.dy, opacity: sh.opacity }));
    items.push({ key: layer.role, kind: "layer", d: layer.d });
    if (layer.tint > 0) items.push({ key: `${layer.role}-tint`, kind: "tint", d: layer.d, opacity: layer.tint });
    return items;
  });
}
