"use client";

import type { ExperienceProfile } from "@/lib/education/experience";
import type { LocalEducationProfile } from "@/lib/local-first/store";

function stageEmoji(stage: ExperienceProfile["stage"]): string {
  switch (stage) {
    case "early_primary": return "🌱";
    case "upper_primary": return "🚀";
    case "junior_secondary": return "⚡";
    case "senior_secondary": return "🎯";
    case "a_level": return "🧠";
    case "tertiary": return "🎓";
    case "adult": return "💼";
  }
}

export function EducationExperienceBadge({ profile, experience }: { profile: LocalEducationProfile | null; experience: ExperienceProfile }) {
  const grade = profile?.educationGrade;
  const detail = typeof grade === "number" && grade >= 1 && grade <= 7 ? `Grade ${grade}` : experience.label;
  return (
    <div
      className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-background/75 px-3 py-1.5 text-xs font-medium shadow-sm backdrop-blur"
      data-education-stage={experience.stage}
      data-ui-density={experience.ui.density}
      data-interaction={experience.ui.interaction}
      aria-label={`Learning experience: ${detail}`}
    >
      <span aria-hidden="true">{stageEmoji(experience.stage)}</span>
      <span>{detail}</span>
      <span className="text-muted-foreground">·</span>
      <span className="text-muted-foreground">{experience.rewards === "adventure" ? "Adventure" : experience.rewards === "collection" ? "Collection" : experience.rewards === "challenge" ? "Challenge" : experience.rewards === "professional" ? "Workspace" : "Mastery"}</span>
    </div>
  );
}
