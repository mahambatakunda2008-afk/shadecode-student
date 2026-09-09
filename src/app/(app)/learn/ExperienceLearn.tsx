"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { getAcademicExperience, normalizeStudyLevel, type AcademicExperience } from "@/lib/academic/experience";
import LearnPrefillGuard from "./LearnPrefillGuard";

function ExperienceLearnIntro({ experience }: { experience: AcademicExperience }) {
  const copy = experience.stage === "early-childhood"
    ? { kicker: "Stories & language", title: "Let's learn together", body: "Listen, notice, ask questions and build early language through short, playful learning moments." }
    : experience.family === "foundation"
      ? { kicker: "Discovery learning", title: "Learn by understanding", body: "Build the idea first, then practise it. Short explanations and activities help you keep what you discover." }
      : experience.family === "school"
        ? { kicker: "Focused study", title: "Turn difficult topics into clear ideas", body: "Learn from your syllabus context, practise deliberately and use what you understand in questions." }
        : { kicker: "Deep learning", title: "Build knowledge you can use", body: "Connect course concepts to assignments, projects and the practical work you are trying to accomplish." };

  return (
    <div className="mx-auto w-full max-w-6xl px-4 pt-5 sm:px-6 lg:px-8">
      <div className="rounded-2xl border border-[var(--card-border)] bg-[var(--card)] px-4 py-3 sm:px-5">
        <p className="text-[11px] font-extrabold uppercase tracking-[.08em] text-[var(--primary)]">{copy.kicker}</p>
        <h1 className="mt-1 text-lg font-extrabold tracking-tight text-[var(--foreground)] sm:text-xl">{copy.title}</h1>
        <p className="mt-1 max-w-3xl text-sm leading-5 text-[var(--muted-foreground)]">{copy.body}</p>
      </div>
    </div>
  );
}

export default function ExperienceLearn() {
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
      setExperience(getAcademicExperience(normalizeStudyLevel(profile?.study_level || profile?.education_stage)));
    };
    void load();
    return () => { cancelled = true; };
  }, [router]);

  if (!experience) {
    return <main className="min-h-[60vh] bg-[var(--background)] p-6" aria-busy="true" />;
  }

  return (
    <main className="min-h-screen bg-[var(--background)]">
      <ExperienceLearnIntro experience={experience} />
      <LearnPrefillGuard />
    </main>
  );
}
