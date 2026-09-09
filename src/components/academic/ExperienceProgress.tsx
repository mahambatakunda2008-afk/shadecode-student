"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AnalyticsContent from "@/components/academic/AnalyticsContent";
import { createClient } from "@/lib/supabase/client";
import { getAcademicExperience, normalizeStudyLevel, type AcademicExperience } from "@/lib/academic/experience";

function ProgressIntro({ experience }: { experience: AcademicExperience }) {
  const copy = experience.family === "school"
    ? {
        eyebrow: "Your study progress",
        title: "Know what to work on next",
        body: "Track practice, exam performance and weak topics so your next study session has a purpose.",
      }
    : {
        eyebrow: "Your learning progress",
        title: "See your work taking shape",
        body: "Use your study, tasks and practice history to see what is moving forward and where to focus next.",
      };

  return (
    <div style={{ marginBottom: 8, padding: "4px 24px 0" }}>
      <p style={{ fontSize: 11, color: "var(--primary)", fontWeight: 800, letterSpacing: ".08em", textTransform: "uppercase", margin: 0 }}>{copy.eyebrow}</p>
      <h1 style={{ fontSize: 25, lineHeight: 1.15, fontWeight: 800, margin: "5px 0 4px" }}>{copy.title}</h1>
      <p style={{ color: "var(--muted-foreground)", fontSize: 13, lineHeight: 1.5, maxWidth: 620, margin: 0 }}>{copy.body}</p>
    </div>
  );
}

export default function ExperienceProgress() {
  const router = useRouter();
  const [experience, setExperience] = useState<AcademicExperience | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const supabase = createClient();
      const { data } = await supabase.auth.getUser();
      if (!data.user) {
        router.replace("/auth/login");
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("study_level, education_stage")
        .eq("id", data.user.id)
        .maybeSingle();

      if (cancelled) return;
      const stage = profile?.study_level || profile?.education_stage;
      const resolved = getAcademicExperience(normalizeStudyLevel(stage));

      if (resolved.family === "foundation") {
        router.replace("/dashboard");
        return;
      }
      setExperience(resolved);
    };

    void load();
    return () => { cancelled = true; };
  }, [router]);

  if (!experience) {
    return <div style={{ minHeight: 240, display: "grid", placeItems: "center", color: "var(--muted-foreground)", fontSize: 13 }}>Loading your progress…</div>;
  }

  return (
    <div>
      <ProgressIntro experience={experience} />
      <AnalyticsContent />
    </div>
  );
}
