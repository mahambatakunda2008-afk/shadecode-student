"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Copy, MessageCircle, Share2, Sparkles } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import ShareCard from "@/components/growth/ShareCard";
import { trackEvent } from "@/lib/traction/client";

export default function SharePage() {
  const router = useRouter();
  const [name, setName] = useState("Student");
  const [progress, setProgress] = useState<number | null>(null);
  const [streak, setStreak] = useState<number | null>(null);

  useEffect(() => {
    const client = createClient();
    void client.auth.getUser().then(async ({ data }) => {
      if (!data.user) { router.replace("/auth/login"); return; }
      setName(data.user.user_metadata?.full_name?.split(" ")[0] || data.user.email?.split("@")[0] || "Student");
      const { data: profile } = await client.from("student_progress").select("overall_completion").eq("user_id", data.user.id).maybeSingle();
      const { data: activity } = await client.from("student_activity").select("current_streak").eq("user_id", data.user.id).maybeSingle();
      if (typeof profile?.overall_completion === "number") setProgress(Math.round(profile.overall_completion));
      if (typeof activity?.current_streak === "number") setStreak(activity.current_streak);
      void trackEvent("share_hub_opened");
    });
  }, [router]);

  const headline = progress !== null ? `${name} has reached ${progress}% overall study progress on Shadecode Student.` : `${name} is building a study streak with Shadecode Student.`;
  const streakLine = streak !== null && streak > 0 ? ` Current streak: ${streak} day${streak === 1 ? "" : "s"}.` : "";

  return <main className="mx-auto w-full max-w-3xl px-4 py-6 sm:px-6">
    <button type="button" onClick={() => router.back()} className="mb-6 inline-flex items-center gap-2 text-sm text-[var(--muted-foreground)]"><ArrowLeft size={16} /> Back</button>
    <div className="mb-6 rounded-3xl border border-[var(--card-border)] bg-[var(--surface-2)] p-6 sm:p-8">
      <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-[var(--primary)]"><Sparkles size={16} /> Growth hub</div>
      <h1 className="text-3xl font-black tracking-tight">Turn progress into momentum.</h1>
      <p className="mt-2 max-w-xl text-sm leading-6 text-[var(--muted-foreground)]">Share something real from your study journey. The goal is simple: help another student discover a useful study tool.</p>
    </div>
    <div className="grid gap-4">
      <ShareCard shareType="progress" title="Shadecode Student progress" text={`${headline}${streakLine}`} />
      <ShareCard shareType="study_invite" title="Study with Shadecode Student" text="I'm using Shadecode Student to organise learning, practise and track progress. Try it with me." />
    </div>
    <div className="mt-4 grid gap-3 sm:grid-cols-3">
      <QuickAction icon={<Share2 size={17} />} label="Share" onClick={() => navigator.share ? void navigator.share({ title: "Shadecode Student", text: "Study smarter with Shadecode Student.", url: window.location.origin }) : undefined} />
      <QuickAction icon={<MessageCircle size={17} />} label="WhatsApp" onClick={() => window.open(`https://wa.me/?text=${encodeURIComponent("Study smarter with Shadecode Student: " + window.location.origin)}`, "_blank", "noopener,noreferrer")} />
      <QuickAction icon={<Copy size={17} />} label="Copy link" onClick={() => void navigator.clipboard?.writeText(window.location.origin)} />
    </div>
  </main>;
}

function QuickAction({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick?: () => void }) {
  return <button type="button" onClick={onClick} className="flex items-center justify-center gap-2 rounded-2xl border border-[var(--card-border)] bg-[var(--card)] p-3 text-sm font-semibold disabled:opacity-50" disabled={!onClick}>{icon}{label}</button>;
}
