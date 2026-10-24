/** Restored original Shadecode abstract mark geometry. */
export const MARK_VIEWBOX = 600;
export const MARK_TRANSLATE = { x: 25.5, y: 10.5 } as const;
export const MARK_PATHS = [
  "M72.5 146.5 275.5 24.5 475.5 139.5 474.5 224.5 190.5 162.5 72.5 193.5Z",
  "M72.5 193.5 477.5 326.5 477.5 389.5 72.5 266.5Z",
  "M72.5 340.5 132.5 372.5 132.5 396.5 272.5 480.5 477.5 389.5 477.5 435.5 278.5 555.5 72.5 436.5Z",
] as const;
export const MARK_GRADIENT = {
  x1: 70, y1: 50, x2: 480, y2: 540,
  stops: [[0, "#54DDEB"], [0.42, "#2588E8"], [0.76, "#465BE5"], [1, "#7761D8"]],
} as const;
