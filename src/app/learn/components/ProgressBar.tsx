import { cn } from "@/lib/utils";

interface ProgressBarProps {
  value: number;
  className?: string;
  fillClassName?: string;
  label?: string;
}

function clampProgress(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(100, Math.max(0, Math.round(value)));
}

export default function ProgressBar({
  value,
  className,
  fillClassName,
  label = "Progress",
}: ProgressBarProps) {
  const safeValue = clampProgress(value);

  return (
    <div
      aria-label={label}
      aria-valuemax={100}
      aria-valuemin={0}
      aria-valuenow={safeValue}
      className={cn("h-2 overflow-hidden rounded-full bg-slate-100", className)}
      role="progressbar"
    >
      <div
        className={cn(
          "h-full rounded-full bg-gradient-to-r from-sky-400 via-cyan-400 to-emerald-400 transition-[width] duration-700 ease-out",
          fillClassName
        )}
        style={{ width: `${safeValue}%` }}
      />
    </div>
  );
}
