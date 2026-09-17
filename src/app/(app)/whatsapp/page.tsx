"use client";

import Link from "next/link";
import { ArrowRight, Bell, BookOpen, BrainCircuit, CheckCircle2, MessageCircle, ShieldCheck, Smartphone } from "lucide-react";
import { useUser } from "@/contexts/UserContext";
import { getAcademicExperience, normalizeStudyLevel } from "@/lib/academic/experience";

const capabilities = [
  { icon: BrainCircuit, title: "Ask Cortex", text: "Get explanations, worked reasoning, and study help from the same learning intelligence." },
  { icon: BookOpen, title: "Keep learning", text: "Continue your study flow when opening the full app is inconvenient." },
  { icon: Bell, title: "Stay on track", text: "Receive useful study reminders and learning updates." },
];

export default function WhatsAppPage() {
  const { profile } = useUser();
  const experience = getAcademicExperience(normalizeStudyLevel(profile?.study_level));
  const firstName = profile?.first_name ?? profile?.full_name?.split(" ")[0] ?? "Learner";

  return (
    <div className="ssc-page" data-experience={experience.family}>
      <section className="ssc-page-header">
        <div>
          <p className="ssc-kicker">Your learning, wherever you are</p>
          <h1>Shadecode on WhatsApp</h1>
          <p className="ssc-subtitle">Use Shadecode Student through WhatsApp when you need a lighter, faster way to stay connected to your learning.</p>
        </div>
      </section>

      <section className="grid gap-5 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="overflow-hidden rounded-3xl border border-[var(--card-border)] bg-[var(--surface)] p-6 shadow-[var(--shadow-lg)] sm:p-8">
          <div className="mb-7 flex items-start gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[var(--primary-glow)] text-[var(--primary)]">
              <MessageCircle size={28} />
            </div>
            <div>
              <p className="text-sm font-semibold text-[var(--primary)]">Hi {firstName} 👋</p>
              <h2 className="mt-1 text-2xl font-bold tracking-tight">Your Student account can travel with you.</h2>
              <p className="mt-2 text-sm leading-6 text-[var(--muted-foreground)]">WhatsApp is another way into your Shadecode learning space, not a separate account or a stripped-down replacement for Student.</p>
            </div>
          </div>

          <div className="grid gap-3">
            {capabilities.map(({ icon: Icon, title, text }) => (
              <div key={title} className="flex gap-3 rounded-2xl border border-[var(--card-border)] bg-[var(--surface-2)] p-4">
                <Icon className="mt-0.5 shrink-0 text-[var(--primary)]" size={20} />
                <div><p className="font-semibold">{title}</p><p className="mt-1 text-sm leading-5 text-[var(--muted-foreground)]">{text}</p></div>
              </div>
            ))}
          </div>

          <div className="mt-6 rounded-2xl border border-[var(--card-border)] bg-[var(--surface-2)] p-4">
            <div className="flex items-center gap-2 text-sm font-semibold"><ShieldCheck size={18} className="text-[var(--accent)]" /> Same Shadecode identity</div>
            <p className="mt-1 text-sm leading-5 text-[var(--muted-foreground)]">Your WhatsApp client should connect to this Student account, so your learning context can remain coherent across clients.</p>
          </div>
        </div>

        <div className="rounded-3xl border border-[var(--card-border)] bg-[var(--surface)] p-6 shadow-[var(--shadow-lg)] sm:p-8">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--surface-2)] text-[var(--primary)]"><Smartphone size={24} /></div>
          <h2 className="mt-5 text-xl font-bold">Connect your WhatsApp</h2>
          <p className="mt-2 text-sm leading-6 text-[var(--muted-foreground)]">The connection flow is being prepared here. We will only mark you connected after the WhatsApp identity has actually been verified.</p>

          <div className="mt-6 space-y-3 text-sm">
            <div className="flex items-center gap-3"><CheckCircle2 size={18} className="text-[var(--muted-foreground)]" /><span>One Student account</span></div>
            <div className="flex items-center gap-3"><CheckCircle2 size={18} className="text-[var(--muted-foreground)]" /><span>WhatsApp as an additional client</span></div>
            <div className="flex items-center gap-3"><CheckCircle2 size={18} className="text-[var(--muted-foreground)]" /><span>No fake connection state</span></div>
          </div>

          <button type="button" disabled className="mt-7 flex w-full cursor-not-allowed items-center justify-center gap-2 rounded-xl bg-[var(--surface-3)] px-4 py-3 text-sm font-semibold text-[var(--muted-foreground)] opacity-90">
            WhatsApp connection coming next
          </button>

          <Link href="/dashboard" className="mt-3 flex items-center justify-center gap-2 text-sm font-semibold text-[var(--primary)] hover:underline">Back to Student <ArrowRight size={16} /></Link>
        </div>
      </section>
    </div>
  );
}
