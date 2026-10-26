import geometry from "./markGeometry.json";

/**
 * Canonical Shadecode "folded S" mark. This JSON is the single source of truth:
 * the React marks, share-card marks and every generated SVG/PNG icon read from it
 * (see scripts/generate-brand-assets.mjs). Never hand-edit generated icon files.
 */
export type MarkStroke = {
  role: "ribbon" | "fold" | "underfold" | "sheen";
  width: number;
  d: string;
  gradient?: string;
  color?: string;
  opacity?: number;
};
export type MarkGradient = { id: string; x1: number; y1: number; x2: number; y2: number; stops: ReadonlyArray<readonly [number, string]> };

/** Square crop around the glyph (with breathing room) for inline use at any size. */
export const MARK_VIEWBOX = geometry.inlineViewBox;
export const MARK_GRADIENTS = geometry.gradients as unknown as MarkGradient[];
export const MARK_STROKES = geometry.strokes as unknown as MarkStroke[];
export const MARK_PATHS: string[] = MARK_STROKES.map((s) => s.d);
export const MARK_RIBBON = MARK_STROKES[0];
export const MARK_COLORS: string[] = [
  ...MARK_GRADIENTS.flatMap((g) => g.stops.map(([, color]) => color)),
  ...MARK_STROKES.flatMap((s) => (s.color ? [s.color] : [])),
];
export const MARK_TILES = geometry.tile;
export const MARK_CENTER = geometry.glyphCenter;
