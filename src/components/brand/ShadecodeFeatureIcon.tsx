import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export type ShadecodeFeatureName =
  | "home" | "learn" | "exam-sim" | "math-checker" | "focus" | "timetable"
  | "leaderboard" | "code-lab" | "past-papers" | "insights" | "profile" | "settings"
  | "tasks" | "assessments" | "courses" | "study" | "study-plan" | "progress"
  | "achievements" | "share" | "whatsapp" | "virtual-lab" | "workmate" | "projects"
  | "studyspace";

type Props = {
  icon?: LucideIcon;
  feature?: ShadecodeFeatureName;
  label?: string;
  active?: boolean;
  size?: "sm" | "md" | "lg";
  tile?: boolean;
  className?: string;
};

const sizes = {
  sm: { tile: "h-9 w-9 rounded-xl", icon: "h-[18px] w-[18px]" },
  md: { tile: "h-12 w-12 rounded-[15px]", icon: "h-6 w-6" },
  lg: { tile: "h-16 w-16 rounded-[18px]", icon: "h-8 w-8" },
} as const;

function Glyph({ feature, Icon, active, className }: {
  feature?: ShadecodeFeatureName; Icon?: LucideIcon; active: boolean; className?: string;
}) {
  if (!feature && Icon) {
    return <Icon aria-hidden="true" className={cn("relative z-[1] shadecode-feature-icon__glyph", className)}
      stroke="currentColor" strokeWidth={active ? 2.35 : 2} />;
  }

  const sw = active ? 2.9 : 2.65;
  const p = { fill: "none", stroke: "url(#shadecode-feature-icon-gradient)", strokeWidth: sw,
    strokeLinecap: "round" as const, strokeLinejoin: "round" as const };

  const svg = (children: ReactNode) => (
    <svg viewBox="0 0 24 24" className={cn("relative z-[1] shadecode-feature-icon__glyph", className)} aria-hidden="true">
      <defs>
        <linearGradient id="shadecode-feature-icon-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#00E5FF" />
          <stop offset="28%" stopColor="#00A8FF" />
          <stop offset="58%" stopColor="#245BFF" />
          <stop offset="82%" stopColor="#7A3CFF" />
          <stop offset="100%" stopColor="#C135FF" />
        </linearGradient>
      </defs>
      {children}
    </svg>
  );

  switch (feature) {
    case "home": return svg(<><path {...p} d="M3.5 10.7 12 4l8.5 6.7" /><path {...p} d="M5.8 9.8v9.4h12.4V9.8" /><path {...p} d="M9.2 19.2v-5.3h5.6v5.3" /></>);
    case "learn": return svg(<><path {...p} d="M4 5.8c2.8-.9 5.5-.4 8 1.6v12.2c-2.5-2-5.2-2.5-8-1.6z" /><path {...p} d="M20 5.8c-2.8-.9-5.5-.4-8 1.6v12.2c2.5-2 5.2-2.5 8-1.6z" /><path {...p} d="M12 7.4v12.2" /></>);
    case "exam-sim": return svg(<><rect {...p} x="5" y="3.5" width="14" height="17" rx="2.2" /><path {...p} d="M8.5 8.2h7M8.5 12h2.2M13.2 12h2.3M8.5 15.8h2.2M13.2 15.8h2.3" /><path {...p} d="m9 12-.8.8-.8-.8M9 15.8l-.8.8-.8-.8" /></>);
    case "math-checker": return svg(<><rect {...p} x="4" y="3.5" width="16" height="17" rx="2.4" /><path {...p} d="M8 8h2M14 8h2M9 12l2 2m0-2-2 2M14 13h2M7.5 17.2h9" /></>);
    case "focus": return svg(<><circle {...p} cx="12" cy="12" r="7.5" /><circle {...p} cx="12" cy="12" r="2.4" /><path {...p} d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3" /></>);
    case "timetable": return svg(<><rect {...p} x="4" y="5.5" width="16" height="15" rx="2.2" /><path {...p} d="M8 3.5v4M16 3.5v4M4 9.5h16M8 13h.1M12 13h.1M16 13h.1M8 16.5h.1M12 16.5h.1M16 16.5h.1" /></>);
    case "leaderboard": return svg(<><path {...p} d="M7.2 6.5h9.6v5.3a4.8 4.8 0 0 1-9.6 0z" /><path {...p} d="M7.2 8H4.8v2.2a3.2 3.2 0 0 0 3.2 3.2M16.8 8h2.4v2.2a3.2 3.2 0 0 1-3.2 3.2M12 16.6v3.1M8.5 20h7" /><path {...p} d="m12 7.6.7 1.5 1.7.2-1.2 1.2.3 1.7-1.5-.8-1.5.8.3-1.7-1.2-1.2 1.7-.2z" /></>);
    case "code-lab": return svg(<><path {...p} d="m9 7-5 5 5 5M15 7l5 5-5 5M13.8 4.8 10.2 19.2" /></>);
    case "past-papers": return svg(<><path {...p} d="M7 4h11v14H7z" /><path {...p} d="M7 7H5v14h11v-3M10 8h5M10 11h5M10 14h3" /></>);
    case "insights": return svg(<><path {...p} d="M8.5 15.5c-1.5-1.1-2.4-2.9-2.4-4.8A5.9 5.9 0 0 1 12 4.8a5.9 5.9 0 0 1 5.9 5.9c0 1.9-.9 3.7-2.4 4.8-.9.7-1.4 1.4-1.5 2.3h-4c-.1-.9-.6-1.6-1.5-2.3z" /><path {...p} d="M9.8 20h4.4M10.3 17.8h3.4" /></>);
    case "profile": return svg(<><circle {...p} cx="12" cy="8" r="3.2" /><path {...p} d="M5.5 20c.8-3.5 3-5.2 6.5-5.2s5.7 1.7 6.5 5.2" /></>);
    case "settings": return svg(<><circle {...p} cx="12" cy="12" r="3.2" /><path {...p} d="m19.2 13.3 1.1 1-.9 1.6-1.5-.4a7 7 0 0 1-1.6 1.6l.4 1.5-1.6.9-1-1.1a7.5 7.5 0 0 1-2.1.3l-.6 1.4h-1.9l-.6-1.4a7.5 7.5 0 0 1-2.1-.3l-1 1.1-1.6-.9.4-1.5a7 7 0 0 1-1.6-1.6l-1.5.4-.9-1.6 1.1-1a7.4 7.4 0 0 1-.3-2.1l-1.4-.6V8.7l1.4-.6a7.4 7.4 0 0 1 .3-2.1l-1.1-1 .9-1.6 1.5.4a7 7 0 0 1 1.6-1.6l-.4-1.5 1.6-.9 1 1.1a7.5 7.5 0 0 1 2.1-.3L11.1.2H13l.6 1.4a7.5 7.5 0 0 1 2.1.3l1-1.1 1.6.9-.4 1.5a7 7 0 0 1 1.6 1.6l1.5-.4.9 1.6-1.1 1a7.4 7.4 0 0 1 .3 2.1l1.4.6v1.9l-1.4.6a7.4 7.4 0 0 1-.3 2.1z" transform="translate(-1.1 2.8) scale(.92)" /></>);
    default: return Icon ? <Icon aria-hidden="true" className={cn("relative z-[1] shadecode-feature-icon__glyph", className)} stroke="url(#shadecode-icon-gradient)" strokeWidth={active ? 2.35 : 2} /> : null;
  }
}

export function ShadecodeFeatureIcon({ icon: Icon, feature, label, active = false, size = "md", tile = true, className }: Props) {
  const s = sizes[size];
  if (!tile) return <Glyph feature={feature} Icon={Icon} active={active} className={cn(s.icon, className)} />;
  return (
    <span aria-label={label} role={label ? "img" : undefined}
      className={cn("shadecode-feature-icon relative inline-flex shrink-0 items-center justify-center overflow-hidden border",
        "border-[color-mix(in_srgb,var(--brand-blue)_58%,transparent)] bg-[var(--brand-ink)] shadow-[0_10px_28px_rgba(36,91,255,0.16)] transition-transform duration-200",
        active && "scale-[1.03] shadow-[0_12px_34px_rgba(122,60,255,0.20)]", s.tile, className)}>
      <span className="absolute inset-0 opacity-[0.12]" style={{ background: "var(--brand-gradient)" }} aria-hidden="true" />
      <span className="absolute inset-[1px] rounded-[inherit] border border-white/[0.04]" aria-hidden="true" />
      <Glyph feature={feature} Icon={Icon} active={active} />
    </span>
  );
}

export function ShadecodeIconDefs() {
  return (
    <svg aria-hidden="true" width="0" height="0" className="pointer-events-none absolute h-0 w-0 overflow-hidden">
      <defs>
        <linearGradient id="shadecode-icon-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#00E5FF" /><stop offset="28%" stopColor="#00A8FF" />
          <stop offset="58%" stopColor="#245BFF" /><stop offset="82%" stopColor="#7A3CFF" /><stop offset="100%" stopColor="#C135FF" />
        </linearGradient>
      </defs>
    </svg>
  );
}
