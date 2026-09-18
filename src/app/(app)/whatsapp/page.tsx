"use client";

import Link from "next/link";
import { ArrowRight, Bell, BookOpen, BrainCircuit, CheckCircle2, ExternalLink, MessageCircle, ShieldCheck, Smartphone } from "lucide-react";
import { useEffect, useState } from "react";
import { useUser } from "@/contexts/UserContext";
import { getAcademicExperience, normalizeStudyLevel } from "@/lib/academic/experience";

const capabilities = [
  { icon: BrainCircuit, title: "Ask Cortex", text: "Get explanations, worked reasoning, and study help from the same learning intelligence." },
  { icon: BookOpen, title: "Keep learning", text: "Continue your study flow when opening the full app is inconvenient." },
  { icon: Bell, title: "Stay on track", text: "Receive useful study reminders and learning updates." },
];

const commands = ["HELP", "LEARN Biology: cell structure", "EXPLAIN Physics: momentum", "TEACH Mathematics: differentiation"];

type Status = { connected: boolean; status: "active" | "blocked" | "unlinked"; phone: string | null; whatsappNumber: string | null };

export default function WhatsAppPage() {
  const { profile } = useUser();
  const experience = getAcademicExperience(normalizeStudyLevel(profile?.study_level));
  const firstName = profile?.first_name ?? profile?.full_name?.split(" ")[0] ?? "Learner";
  const [status, setStatus] = useState<Status | null>(null);

  useEffect(() => {
    void fetch("/api/account/whatsapp/status", { cache: "no-store" }).then(async (response) => {
      if (response.ok) setStatus((await response.json()) as Status);
    }).catch(() => undefined);
  }, []);

  const waLink = status?.whatsappNumber ? `https://wa.me/${status.whatsappNumber.replace(/\D/g, "")}` : null;

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
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[var(--primary-glow)] text-[var(--primary)]"><MessageCircle size={28} /></div>
            <div><p className="text-sm font-semibold text-[var(--primary)]">Hi {firstName} 👋</p><h2 className="mt-1 text-2xl font-bold tracking-tight">Your Student account can travel with you.</h2><p className="mt-2 text-sm leading-6 text-[var(--muted-foreground)]">WhatsApp is another way into your Shadecode learning space, not a separate account or a stripped-down replacement for Student.</p></div>
          </div>
          <div className="grid gap-3">{capabilities.map(({ icon: Icon, title, text }) => <div key={title} className="flex gap-3 rounded-2xl border border-[var(--card-border)] bg-[var(--surface-2)] p-4"><Icon className="mt-0.5 shrink-0 text-[var(--primary)]" size={20} /><div><p className="font-semibold">{title}</p><p className="mt-1 text-sm leading-5 text-[var(--muted-foreground)]">{text}</p></div></div>)}</div>
          <div className="mt-6 rounded-2xl border border-[var(--card-border)] bg-[var(--surface-2)] p-4"><div className="flex items-center gap-2 text-sm font-semibold"><ShieldCheck size={18} className="text-[var(--accent)]" /> Same Shadecode identity</div><p className="mt-1 text-sm leading-5 text-[var(--muted-foreground)]">Your WhatsApp client connects to this Student account, so your learning context can remain coherent across clients.</p></div>
        </div>

        <div className="rounded-3xl border border-[var(--card-border)] bg-[var(--surface)] p-6 shadow-[var(--shadow-lg)] sm:p-8">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--surface-2)] text-[var(--primary)]"><Smartphone size={24} /></div>
          <div className="mt-5 flex items-center gap-2"><h2 className="text-xl font-bold">Connection</h2>{status?.connected && <span className="inline-flex items-center gap-1 rounded-full bg-[var(--success)]/10 px-2 py-1 text-xs font-semibold text-[var(--success)]"><CheckCircle2 size={13} /> Connected</span>}</div>
          <p className="mt-2 text-sm leading-6 text-[var(--muted-foreground)]">{status?.connected ? "This WhatsApp number is linked to your Student account. You can now use the same learning identity from WhatsApp." : "Link your Student account once, then use WhatsApp as another front door into Student."}</p>
          <Link href="/settings" className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--primary)] px-4 py-3 text-sm font-semibold text-[var(--primary-foreground)] hover:opacity-90">{status?.connected ? "Manage connection" : "Connect WhatsApp in Settings"} <ArrowRight size={16} /></Link>
          {waLink && <a href={waLink} target="_blank" rel="noreferrer" className="mt-3 flex items-center justify-center gap-2 text-sm font-semibold text-[var(--primary)] hover:underline">Open Shadecode on WhatsApp <ExternalLink size={15} /></a>}
          <div className="mt-6 border-t border-[var(--card-border)] pt-5"><p className="text-sm font-semibold">Things you can say</p><div className="mt-3 grid gap-2">{commands.map((command) => <code key={command} className="rounded-xl bg-[var(--surface-2)] px-3 py-2 text-xs text-[var(--foreground)]">{command}</code>)}</div></div>
          <p className="mt-5 text-xs leading-5 text-[var(--muted-foreground)]">Use a command prefix such as “teach me organic chemistry” or “explain momentum.” Shadecode uses your configured subjects rather than inventing a General subject.</p>
        </div>
      </section>
    </div>
  );
}
