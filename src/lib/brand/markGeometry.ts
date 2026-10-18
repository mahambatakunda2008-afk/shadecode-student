/**
 * Canonical Shadecode "S" mark geometry (600x600 viewBox) and brand gradient.
 * Mirrors public/brand/*.svg and src/components/brand/BrandMark.tsx. Use this for any surface that
 * cannot import the React component (share-card images, emails). A test keeps them in sync.
 */
export const MARK_VIEWBOX = 600;
export const MARK_TRANSLATE = { x: 25.5, y: 10.5 } as const;
export const MARK_PATHS = [
  "M72.5 146.5 275.5 24.5 475.5 139.5 474.5 224.5 190.5 162.5 72.5 193.5Z",
  "M72.5 193.5 477.5 326.5 477.5 389.5 72.5 266.5Z",
  "M72.5 340.5 132.5 372.5 132.5 396.5 272.5 480.5 477.5 389.5 477.5 435.5 278.5 555.5 72.5 436.5Z",
] as const;
export const MARK_GRADIENT = {
  x1: 72, y1: 30, x2: 478, y2: 556,
  stops: [
    [0, "#00E5FF"],
    [0.28, "#00A8FF"],
    [0.58, "#245BFF"],
    [0.82, "#7A3CFF"],
    [1, "#C135FF"],
  ],
} as const;
