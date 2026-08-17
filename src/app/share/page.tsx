"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Copy, MessageCircle, Share2, Sparkles } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import ShareCard from "@/components/growth/ShareCard";
import { trackEvent } from "@/lib/traction/client";

export default function SharePage() {
  const router = useRouter(); const [name, setName] = useState("Student"); const [progress, setProgress] = useState<number | null>(null); const [streak, setStreak] = useState<number | null>(null); const [authenticated, setAuthenticated] = useState(false);
  useEffect(() => {
    const referral = new URLSearchParams(window.location.search).get("ref");
    if (referral) { const safeReferral = referral.slice(0, 80); try { sessionStorage.setItem("shadecode_referral", safeReferral); } catch {} void trackEvent("referral_landed", { referral: safeReferral }); }
    const client = createClient();
    void client.auth.getUser().then(async ({ data }) => {
      if (!data.user) { void trackEvent("share_landing_viewed", { hasReferral: Boolean(referral) }); return; }
      setAuthenticated(true); setName(data.user.user_metadata?.full_name?.split(" ")[0] || data.user.email?.split("@")[0] || "Student");
      const [{ data: profile }, { data: activity }] = await Promise.all([client.from("student_progress").select("overall_completion").eq("user_id", data.user.id).maybeSingle(), client.from("student_activity").select("current_streak").eq("user_id", data.user.id).maybeSingle()]);
      if (typeof profile?.overall_completion === "number") setProgress(Math.round(profile.overall_completion)); if (typeof activity?.current_streak === "number") setStreak(activity.current_streak); void trackEvent("share_hub_opened", { hasReferral: Boolean(referral) });
    });
  }, []);
  const shareBase = typeof window === "undefined" ? "https://shadecodestudent.vercel.app" : window.location.origin; const headline = progress !== null ? `${name} has reached ${progress}% overall study progress on Shadecode Student.` : authenticated ? `${name} is building a study streak with Shadecode Student.` : "Study, practise and track your progress with Shadecode Student."; const streakLine = streak !== null && streak > 0 ? ` Current streak: ${streak} day${streak === 1 ? "" : "s"}.` : "";
  const copyQuick = async () => { try { const value = `${shareBase}/share`; if (navigator.clipboard?.writeText) await navigator.clipboard.writeText(value); void trackEvent("share_completed", { shareType: "quick", method: "copy" }); } catch {} };
  return <main className="min-h-screen bg-[var(--background)] px-4 py-8 text-[var(--foreground)] sm:px-6"><div className="mx-auto w-full max-w-3xl"><div className="mb-6 rounded-3xl border border-[var(--card-border)] bg-[var(--surface-2)] p-6 sm:p-8"><div className="mb-3 flex items-center gap-2 text-sm font-semibold text-[var(--primary)]"><Sparkles size={16} /> Shadecode Student</div><h1 className="text-3xl font-black tracking-tight sm:text-4xl">Turn study progress into momentum.</h1><p className="mt-2 max-w-xl text-sm leading-6 text-[var(--muted-foreground)]">{authenticated ? "Share something real from your study journey and help another student discover a useful study tool." : "A student-first place to learn, practise, organise your work and see whether you're actually improving."}</p>{!authenticated && <button type="button" onClick={() => { void trackEvent("referral_cta_clicked", { destination: "signup" }); router.push("/auth/signup?next=/onboarding"); }} className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[var(--primary)] px-4 py-2.5 text-sm font-bold text-white">Start studying <ArrowRight size={16} /></button>}</div>{authenticated && <><div className="grid gap-4"><ShareCard shareType="progress" title="Shadecode Student progress" text={`${headline}${streakLine}`} /><ShareCard shareType="study_invite" title="Study with Shadecode Student" text="I'm using Shadecode Student to organise learning, practise and track progress. Try it with me." /></div><div className="mt-4 grid gap-3 sm:grid-cols-3"><QuickAction icon={<Share2 size={17} />} label="Share" onClick={() => navigator.share ? void navigator.share({ title: "Shadecode Student", text: "Study smarter with Shadecode Student.", url: `${shareBase}/share` }) : undefined} /><QuickAction icon={<MessageCircle size={17} />} label="WhatsApp" onClick={() => window.open(`https://wa.me/?text=${encodeURIComponent("Study smarter with Shadecode Student: " + shareBase + "/share")}`, "_blank", "noopener,noreferrer")} /><QuickAction icon={<Copy size={17} />} label="Copy link" onClick={() => void copyQuick()} /></div></>}</div></main>;
}
function QuickAction({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick?: () => void }) { return <button type="button" onClick={onClick} className="flex items-center justify-center gap-2 rounded-2xl border border-[var(--card-border)] bg-[var(--card)] p-3 text-sm font-semibold disabled:opacity-50" disabled={!onClick}>{icon}{label}</button>; }
