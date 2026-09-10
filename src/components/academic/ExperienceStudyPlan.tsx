"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, Loader2, RefreshCw, Route } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { fetchWithTimeout, FetchTimeoutError } from "@/lib/async/fetchWithTimeout";
import StudyPlanDisplay from "@/components/StudyPlanDisplay";
import StudyGoalInput from "@/components/StudyGoalInput";
import type { StudyPlan, StudyGoals } from "@/lib/studyPlan/types";
import { getAcademicExperience, normalizeStudyLevel } from "@/lib/academic/experience";
import { useUser } from "@/contexts/UserContext";

const COPY = {
  foundation: { title: "Your learning routine", subtitle: "Choose a few things to practise and build into your day. Keep it realistic.", button: "Build my routine", loading: "Putting your routine together..." },
  school: { title: "Study plan", subtitle: "Turn your subjects, weak topics and goals into a focused revision routine.", button: "Build my study plan", loading: "Building your study plan..." },
  "beyond-school": { title: "Learning plan", subtitle: "Organise courses, skills, assignments and practical goals around the time you have.", button: "Build my learning plan", loading: "Building your learning plan..." },
} as const;

export default function ExperienceStudyPlan() {
  const router = useRouter();
  const { profile, loading: profileLoading } = useUser();
  const experience = getAcademicExperience(normalizeStudyLevel(profile?.study_level));
  const copy = COPY[experience.family];
  const [supabase] = useState(() => createClient());
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [plan, setPlan] = useState<StudyPlan | null>(null);
  const [prefillSubjects, setPrefillSubjects] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true); setLoadError(null);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/auth/login"); return; }
      const { data: profileRow } = await supabase.from("profiles").select("subjects").eq("id", user.id).maybeSingle();
      setPrefillSubjects((profileRow?.subjects as string[] | null) ?? []);
      const res = await fetchWithTimeout("/api/study-plan", {}, 20000);
      if (!res.ok) { const body = await res.json().catch(() => ({})); throw new Error(body.error ?? "Failed to load learning plan"); }
      const body = await res.json(); setPlan(body.plan ?? null);
    } catch (err) {
      setLoadError(err instanceof FetchTimeoutError ? "This is taking longer than expected. Please try again." : err instanceof Error ? err.message : "Something went wrong");
    } finally { setLoading(false); }
  };

  useEffect(() => { if (!profileLoading) void load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [profileLoading]);

  const handleGenerate = async (goals: StudyGoals) => {
    setSubmitError(null); setSubmitting(true);
    try {
      const res = await fetchWithTimeout("/api/study-plan", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(goals) }, 30000);
      const body = await res.json(); if (!res.ok) throw new Error(body.error ?? "Failed to generate learning plan"); setPlan(body.plan);
    } catch (err) {
      setSubmitError(err instanceof FetchTimeoutError ? "This is taking longer than expected. Please try again." : err instanceof Error ? err.message : "Something went wrong");
    } finally { setSubmitting(false); }
  };

  if (profileLoading || loading) return <main className="mx-auto max-w-3xl p-6"><div className="flex items-center gap-3"><Loader2 size={20} className="animate-spin text-[var(--muted-foreground)]" /><span className="text-sm text-[var(--muted-foreground)]">{copy.loading}</span></div></main>;

  return <main className="mx-auto max-w-3xl p-5 sm:p-6">
    <header className="mb-7 flex items-start gap-3"><div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[var(--primary-glow)] text-[var(--primary)]"><Route size={19} /></div><div><h1 className="text-2xl font-extrabold tracking-tight text-[var(--foreground)]">{copy.title}</h1><p className="mt-1 text-sm text-[var(--muted-foreground)]">{copy.subtitle}</p></div></header>
    {loadError && <div className="mb-5 flex items-start gap-3 rounded-2xl border border-red-500/20 bg-red-500/10 p-4"><AlertCircle size={16} className="mt-0.5 shrink-0 text-red-400" /><div className="flex-1"><p className="text-sm font-semibold text-red-300">Could not load your plan</p><p className="mt-1 text-xs text-red-300/80">{loadError}</p></div><button onClick={() => void load()} className="inline-flex items-center gap-1 text-xs font-semibold text-red-300"><RefreshCw size={13} /> Retry</button></div>}
    {!loadError && plan && <><StudyPlanDisplay plan={plan} /><div className="mt-5 text-center"><button onClick={() => setPlan(null)} className="rounded-lg border border-[var(--card-border)] px-3 py-2 text-xs font-semibold text-[var(--muted-foreground)]">Build a new plan</button></div></>}
    {!loadError && !plan && <><div className={submitting ? "pointer-events-none opacity-60" : ""}><StudyGoalInput onSubmit={handleGenerate} initialGoals={{ subjects: prefillSubjects }} /></div>{submitError && <p className="mt-3 text-xs text-red-400">{submitError}</p>}{submitting && <p className="mt-3 text-center text-xs text-[var(--muted-foreground)]">{copy.loading}</p>}</>}
  </main>;
}
