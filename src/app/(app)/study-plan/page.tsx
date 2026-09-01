"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Route, Loader2, AlertCircle, RefreshCw, WifiOff } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { fetchWithTimeout, FetchTimeoutError } from "@/lib/async/fetchWithTimeout";
import StudyPlanDisplay from "@/components/StudyPlanDisplay";
import StudyGoalInput from "@/components/StudyGoalInput";
import type { StudyPlan, StudyGoals } from "@/lib/studyPlan/types";
import { getLocalStudyGoals, getLocalStudyPlan, saveLocalStudyGoals, saveLocalStudyPlan } from "@/lib/local-first/study-plan";

export default function StudyPlanPage() {
  const router = useRouter();
  const [supabase] = useState(() => createClient());
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [plan, setPlan] = useState<StudyPlan | null>(null);
  const [prefillSubjects, setPrefillSubjects] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [offline, setOffline] = useState(false);

  const load = async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/auth/login"); return; }

      const localGoals = await getLocalStudyGoals(user.id).catch(() => null);
      const localPlan = await getLocalStudyPlan(user.id).catch(() => null);
      if (localGoals?.subjects?.length) setPrefillSubjects(localGoals.subjects);
      if (localPlan) setPlan(localPlan);
      setOffline(typeof navigator !== "undefined" && !navigator.onLine);

      if (typeof navigator !== "undefined" && !navigator.onLine) {
        if (localPlan) return;
        throw new Error("You're offline and no saved study plan is available on this device yet.");
      }

      const { data: profile } = await supabase.from("profiles").select("subjects").eq("id", user.id).maybeSingle();
      setPrefillSubjects((profile?.subjects as string[] | null) ?? localGoals?.subjects ?? []);

      const res = await fetchWithTimeout("/api/study-plan", {}, 20000);
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "Failed to load study plan");
      }
      const body = await res.json();
      if (body.plan) {
        setPlan(body.plan);
        await saveLocalStudyPlan(user.id, body.plan).catch(() => undefined);
      }
    } catch (err) {
      if (err instanceof TypeError && typeof navigator !== "undefined" && !navigator.onLine) {
        setOffline(true);
        setLoadError(plan ? null : "You're offline. Connect once to create your first study plan.");
      } else {
        setLoadError(err instanceof FetchTimeoutError ? "This is taking longer than expected. Please try again." : err instanceof Error ? err.message : "Something went wrong");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  const handleGenerate = async (goals: StudyGoals) => {
    setSubmitError(null);
    setSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/auth/login"); return; }
      await saveLocalStudyGoals(user.id, goals);

      if (typeof navigator !== "undefined" && !navigator.onLine) {
        setOffline(true);
        setSubmitError("You're offline. Your goals are saved on this device. Connect to generate the AI plan.");
        return;
      }

      const res = await fetchWithTimeout("/api/study-plan", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(goals) }, 30000);
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Failed to generate study plan");
      setPlan(body.plan);
      await saveLocalStudyPlan(user.id, body.plan).catch(() => undefined);
      setOffline(false);
    } catch (err) {
      setSubmitError(err instanceof FetchTimeoutError ? "This is taking longer than expected. Please try again." : err instanceof Error ? err.message : "Something went wrong");
    } finally { setSubmitting(false); }
  };

  return (
    <div style={{ maxWidth: 720, margin: "0 auto", padding: "32px 20px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
        <div style={{ width: 36, height: 36, borderRadius: 12, background: "var(--primary-glow)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><Route size={18} color="var(--primary)" /></div>
        <div style={{ flex: 1 }}><h1 style={{ fontSize: 20, fontWeight: 800, margin: 0 }}>Study Plan</h1><p style={{ fontSize: 12, color: "var(--muted-foreground)", margin: 0 }}>A weighted weekly schedule built around your exam date and real weak topics</p></div>
        {offline && <WifiOff size={16} aria-label="Offline" color="var(--muted-foreground)" />}
      </div>

      {loading && <div style={{ display: "flex", justifyContent: "center", padding: "60px 0" }}><Loader2 size={22} className="animate-spin" color="var(--muted-foreground)" /></div>}

      {loadError && !loading && <div style={{ display: "flex", alignItems: "flex-start", gap: 12, padding: 16, borderRadius: 16, background: "rgba(239, 68, 68, 0.08)", border: "1px solid rgba(239, 68, 68, 0.2)" }}><AlertCircle size={16} color="#ef4444" style={{ flexShrink: 0, marginTop: 2 }} /><div style={{ flex: 1 }}><p style={{ fontSize: 13, color: "#ef4444", fontWeight: 600, margin: 0 }}>Failed to load study plan</p><p style={{ fontSize: 12, color: "#ef444499", margin: "2px 0 0" }}>{loadError}</p></div><button onClick={load} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "#ef4444", background: "none", border: "none", cursor: "pointer" }}><RefreshCw size={14} /> Retry</button></div>}

      {!loading && !loadError && plan && <><StudyPlanDisplay plan={plan} /><div style={{ marginTop: 20, textAlign: "center" }}><button onClick={() => setPlan(null)} style={{ fontSize: 12, color: "var(--muted-foreground)", background: "none", border: "1px solid var(--card-border)", borderRadius: 10, padding: "8px 14px", cursor: "pointer" }}>Generate a new plan</button></div></>}

      {!loading && !loadError && !plan && <><p style={{ fontSize: 12, color: "var(--muted-foreground)", margin: "0 0 12px" }}>{offline ? "Goals saved on this device. Connect when you're ready and we'll build the AI plan." : "Tell us what you're aiming for and we'll build the route."}</p>{submitError && <p style={{ fontSize: 12, color: "#ef4444", margin: "0 0 12px" }}>{submitError}</p>}<div style={{ opacity: submitting ? 0.6 : 1, pointerEvents: submitting ? "none" : "auto" }}><StudyGoalInput onSubmit={handleGenerate} initialGoals={{ subjects: prefillSubjects }} /></div>{submitting && <p style={{ fontSize: 12, color: "var(--muted-foreground)", textAlign: "center", marginTop: 12 }}>Building your plan…</p>}</>}
    </div>
  );
}
