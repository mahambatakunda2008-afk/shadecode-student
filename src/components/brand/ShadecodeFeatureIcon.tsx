import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type ShadecodeFeatureIconProps = {
  icon: LucideIcon;
  label?: string;
  active?: boolean;
  size?: "sm" | "md" | "lg";
  tile?: boolean;
  className?: string;
};

const sizeClasses = {
  sm: {
    tile: "h-9 w-9 rounded-xl",
    icon: "h-[18px] w-[18px]",
  },
  md: {
    tile: "h-12 w-12 rounded-[15px]",
    icon: "h-6 w-6",
  },
  lg: {
    tile: "h-16 w-16 rounded-[18px]",
    icon: "h-8 w-8",
  },
} as const;

export function ShadecodeFeatureIcon({
  icon: Icon,
  label,
  active = false,
  size = "md",
  tile = true,
  className,
}: ShadecodeFeatureIconProps) {
  const sizes = sizeClasses[size];

  if (!tile) {
    return (
      <Icon
        aria-label={label}
        aria-hidden={label ? undefined : true}
        className={cn("shadecode-feature-icon__glyph", sizes.icon, className)}
        stroke="url(#shadecode-icon-gradient)"
        strokeWidth={active ? 2.2 : 1.9}
      />
    );
  }

  return (
    <span
      aria-label={label}
      role={label ? "img" : undefined}
      className={cn(
        "shadecode-feature-icon relative inline-flex shrink-0 items-center justify-center overflow-hidden border",
        "border-[color-mix(in_srgb,var(--brand-blue)_58%,transparent)]",
        "bg-[var(--brand-ink)] shadow-[0_10px_28px_rgba(36,91,255,0.16)]",
        "transition-transform duration-200",
        active && "scale-[1.03] shadow-[0_12px_34px_rgba(122,60,255,0.20)]",
        sizes.tile,
        className,
      )}
    >
      <span
        className="absolute inset-0 opacity-[0.12]"
        style={{ background: "var(--brand-gradient)" }}
        aria-hidden="true"
      />
      <span
        className="absolute inset-[1px] rounded-[inherit] border border-white/[0.04]"
        aria-hidden="true"
      />
      <Icon
        aria-hidden="true"
        className={cn("relative z-[1] shadecode-feature-icon__glyph", sizes.icon)}
        stroke="url(#shadecode-icon-gradient)"
        strokeWidth={active ? 2.2 : 1.9}
      />
    </span>
  );
}

export function ShadecodeIconDefs() {
  return (
    <svg
      aria-hidden="true"
      width="0"
      height="0"
      className="pointer-events-none absolute h-0 w-0 overflow-hidden"
    >
      <defs>
        <linearGradient id="shadecode-icon-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#00E5FF" />
          <stop offset="28%" stopColor="#00A8FF" />
          <stop offset="58%" stopColor="#245BFF" />
          <stop offset="82%" stopColor="#7A3CFF" />
          <stop offset="100%" stopColor="#C135FF" />
        </linearGradient>
      </defs>
    </svg>
  );
}
