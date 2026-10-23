import { type SVGProps } from "react";

export type BrandMarkProps = SVGProps<SVGSVGElement> & {
  title?: string;
};

/** Canonical in-product folded-S mark. Keep aligned with public/icons/shadecode-student.svg. */
export function BrandMark({ title = "Shadecode Student", className, ...props }: BrandMarkProps) {
  return (
    <svg
      viewBox="0 0 1024 1024"
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
        <linearGradient id="shadecode-folded-s-ribbon" x1="320" y1="300" x2="700" y2="760" gradientUnits="userSpaceOnUse">
          <stop stopColor="#54DDEB" />
          <stop offset=".38" stopColor="#2588E8" />
          <stop offset=".72" stopColor="#465BE5" />
          <stop offset="1" stopColor="#7761D8" />
        </linearGradient>
        <linearGradient id="shadecode-folded-s-fold" x1="360" y1="330" x2="620" y2="560" gradientUnits="userSpaceOnUse">
          <stop stopColor="#B1F4F3" />
          <stop offset="1" stopColor="#4CA8F4" />
        </linearGradient>
        <linearGradient id="shadecode-folded-s-underfold" x1="600" y1="590" x2="450" y2="770" gradientUnits="userSpaceOnUse">
          <stop stopColor="#3152C4" />
          <stop offset="1" stopColor="#6C55C6" />
        </linearGradient>
      </defs>
      <rect width="1024" height="1024" rx="224" fill="#081827" />
      <rect x="5" y="5" width="1014" height="1014" rx="220" fill="none" stroke="#1B354A" strokeWidth="5" />
      <path d="M680 340 C620 285 515 276 426 316 C338 355 310 428 350 485 C382 530 445 548 511 574 C581 602 625 642 614 694 C601 752 528 782 451 757 C413 744 383 720 361 689"
        fill="none" stroke="url(#shadecode-folded-s-ribbon)" strokeWidth="116" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M674 333 C617 291 523 286 442 320 C368 351 341 408 359 455 C373 491 421 510 468 529"
        fill="none" stroke="url(#shadecode-folded-s-fold)" strokeWidth="30" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M514 578 C575 603 608 641 599 687 C590 730 545 754 493 755"
        fill="none" stroke="url(#shadecode-folded-s-underfold)" strokeWidth="32" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M363 478 C399 516 454 535 511 557"
        fill="none" stroke="#C4F6F4" strokeOpacity=".7" strokeWidth="7" strokeLinecap="round" />
      <path d="M392 704 C422 739 469 754 510 748"
        fill="none" stroke="#A7B7FF" strokeOpacity=".65" strokeWidth="7" strokeLinecap="round" />
    </svg>
  );
}
