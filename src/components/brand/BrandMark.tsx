import type { SVGProps } from "react";

export type BrandMarkProps = SVGProps<SVGSVGElement> & {
  title?: string;
};

export function BrandMark({ title = "Shadecode Student", className, ...props }: BrandMarkProps) {
  return (
    <svg
      viewBox="0 0 600 600"
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
        <linearGradient id="shadecode-brand-gradient" x1="72" y1="30" x2="478" y2="556" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#00E5FF" />
          <stop offset=".28" stopColor="#00A8FF" />
          <stop offset=".58" stopColor="#245BFF" />
          <stop offset=".82" stopColor="#7A3CFF" />
          <stop offset="1" stopColor="#C135FF" />
        </linearGradient>
      </defs>
      <g fill="url(#shadecode-brand-gradient)" transform="translate(25.5 10.5)">
        <path d="M72.5 146.5 275.5 24.5 475.5 139.5 474.5 224.5 190.5 162.5 72.5 193.5Z" />
        <path d="M72.5 193.5 477.5 326.5 477.5 389.5 72.5 266.5Z" />
        <path d="M72.5 340.5 132.5 372.5 132.5 396.5 272.5 480.5 477.5 389.5 477.5 435.5 278.5 555.5 72.5 436.5Z" />
      </g>
    </svg>
  );
}
