import type { SVGProps } from "react";

export type BrandMarkProps = SVGProps<SVGSVGElement> & {
  title?: string;
};

export function BrandMark({ title = "Shadecode Student", className, ...props }: BrandMarkProps) {
  return (
    <svg
      viewBox="0 0 256 256"
      aria-hidden={title ? undefined : true}
      role={title ? "img" : undefined}
      aria-label={title || undefined}
      className={className}
      focusable="false"
      {...props}
    >
      {title ? <title>{title}</title> : null}
      <path
        fill="currentColor"
        d="M128 14 207 57v43l-79-43-39 21 118 64v43l-79 43-79-43v-43l79 43 39-21-118-64V57l79 43 39-21-39-21-39 21-40-22z"
      />
    </svg>
  );
}
