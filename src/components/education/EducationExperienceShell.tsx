"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { getLocalEducationExperience } from "@/lib/education/localExperience";
import type { ExperienceProfile } from "@/lib/education/experience";

const FALLBACK: ExperienceProfile = {
  stage: "senior_secondary",
  label: "Senior Secondary",
  ui: { density: "balanced", motion: "minimal", interaction: "mixed" },
  copy: { greeting: "Focus on the marks that matter.", correct: "Correct.", incorrect: "Incorrect. Identify the exact step where the method breaks.", retry: "Try the problem again.", empty: "No active target yet. Choose a topic to train." },
  learning: { explanation: "analytical", defaultQuestionCount: 10 },
  rewards: "mastery",
};

export default function EducationExperienceShell({ children }: { children: React.ReactNode }) {
  const [profile, setProfile] = useState<ExperienceProfile>(FALLBACK);

  useEffect(() => {
    let alive = true;
    void (async () => {
      try {
        const { data: { session } } = await createClient().auth.getSession();
        if (!session?.user?.id) return;
        const local = await getLocalEducationExperience(session.user.id);
        if (alive && local) setProfile(local);
      } catch { /* Core shell remains usable with the safe local fallback. */ }
    })();
    return () => { alive = false; };
  }, []);

  return (
    <div
      data-education-stage={profile.stage}
      data-education-density={profile.ui.density}
      data-education-motion={profile.ui.motion}
      data-education-interaction={profile.ui.interaction}
      data-education-rewards={profile.rewards}
      data-education-label={profile.label}
      className={`education-experience education-stage-${profile.stage}`}
    >
      {children}
    </div>
  );
}
