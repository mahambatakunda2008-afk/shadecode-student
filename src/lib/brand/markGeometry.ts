/** Canonical folded-S ribbon geometry and gradient for brand consistency tests. */
export const MARK_VIEWBOX = 1024;
export const MARK_TRANSLATE = { x: 0, y: 0 } as const;
export const MARK_PATHS = [
  "M680 340 C620 285 515 276 426 316 C338 355 310 428 350 485 C382 530 445 548 511 574 C581 602 625 642 614 694 C601 752 528 782 451 757 C413 744 383 720 361 689",
  "M674 333 C617 291 523 286 442 320 C368 351 341 408 359 455 C373 491 421 510 468 529",
  "M514 578 C575 603 608 641 599 687 C590 730 545 754 493 755",
] as const;
export const MARK_GRADIENT = {
  x1: 320, y1: 300, x2: 700, y2: 760,
  stops: [[0, "#54DDEB"], [0.38, "#2588E8"], [0.72, "#465BE5"], [1, "#7761D8"]],
} as const;
