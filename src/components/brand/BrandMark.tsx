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
      <g fill="currentColor" transform="translate(25.5 10.5)">
        <path d="M72.5 146.5 275.5 24.5 475.5 139.5 474.5 224.5 190.5 162.5 72.5 193.5Z" />
        <path d="M72.5 193.5 477.5 326.5 477.5 389.5 72.5 266.5Z" />
        <path d="M72.5 340.5 132.5 372.5 132.5 396.5 272.5 480.5 477.5 389.5 477.5 435.5 278.5 555.5 72.5 436.5Z" />
      </g>
    </svg>
  );
}
