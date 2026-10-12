"use client";

import Link from "next/link";
import { FileText, Gamepad2, Bookmark, BarChart3, Target, Sparkles, UploadCloud, Users, ListChecks, ArrowRight } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { ShadecodeFeatureIcon, type ShadecodeFeatureName } from "@/components/brand/ShadecodeFeatureIcon";

interface HubCard {
  href: string;
  icon: LucideIcon;
  title: string;
  description: string;
  accent: string;
  comingSoon?: boolean;
  feature?: ShadecodeFeatureName;
}

const CARDS: HubCard[] = [
  {
    href: "/exam-hub/papers",
    icon: FileText,
    title: "Past Papers",
    description: "Browse real past papers by board, subject, session, and year.",
    accent: "var(--primary)",
    feature: "past-papers",
  },
  {
    href: "/exam-hub/questions",
    icon: ListChecks,
    title: "Question Bank",
    description: "Search extracted questions and practice from the paper library.",
    accent: "var(--primary)",
    feature: "exam-sim",
  },
  {
    href: "/exam-sim",
    icon: Gamepad2,
    title: "Generated Exams",
    description: "AI-generated practice exams, marked instantly.",
    accent: "var(--accent)",
    feature: "exam-sim",
  },
  {
    href: "/exam-hub/saved",
    icon: Bookmark,
    title: "Saved Papers & Questions",
    description: "Everything you've bookmarked, in one place.",
    accent: "var(--accent)",
    feature: "past-papers",
  },
  {
    href: "/analytics",
    icon: BarChart3,
    title: "Performance",
    description: "Your scores, time spent, and progress over time.",
    accent: "var(--primary)",
    feature: "leaderboard",
  },
  {
    href: "/exam-hub/weak-topics",
    icon: Target,
    title: "Weak Topics",
    description: "Topics to focus on based on your completed papers.",
    accent: "var(--accent)",
    feature: "focus",
  },
  {
    href: "/exam-hub/recommendations",
    icon: Sparkles,
    title: "AI Recommendations",
    description: "Papers picked for you based on your recent performance.",
    accent: "var(--accent)",
    feature: "insights",
    comingSoon: true,
  },
  {
    href: "/exam-hub/contribute",
    icon: Users,
    title: "Contribute a Paper",
    description: "Share a paper others are missing and earn XP once approved.",
    accent: "var(--primary)",
    feature: "profile",
  },
];

interface Props {
  isAdmin: boolean;
}

export default function HubContent({ isAdmin }: Props) {
  const cards: HubCard[] = isAdmin
    ? [
        ...CARDS,
        {
          href: "/admin/exam-hub/upload",
          icon: UploadCloud,
          title: "Upload Papers",
          description: "Admin only — add past papers to the catalog.",
          accent: "var(--warning)",
          feature: "settings",
        },
      ]
    : CARDS;

  return (
    <div className="ssc-page-full">
      <div className="mx-auto max-w-6xl">
        <header className="mb-7 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-3"><ShadecodeFeatureIcon feature="past-papers" size="sm" /><div><p className="ssc-kicker">Exam preparation</p><h1 className="text-2xl font-bold tracking-tight text-[var(--foreground)]">Exam Hub</h1></div></div>
            <p className="max-w-xl text-sm leading-6 text-[var(--muted-foreground)]">Find real papers, practise questions, and turn your results into a focused revision plan.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/exam-hub/papers" className="ssc-button"><FileText size={16} aria-hidden="true" /> Browse papers <ArrowRight size={15} aria-hidden="true" /></Link>
            <Link href="/exam-sim" className="ssc-button ssc-button-secondary"><Gamepad2 size={16} aria-hidden="true" /> Start practice</Link>
          </div>
        </header>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {cards.map((card) => {
            const Icon = card.icon;
            const content = (
              <div
                className="ssc-card-interactive group h-full rounded-2xl p-5"
                style={{ opacity: card.comingSoon ? 0.6 : 1, cursor: card.comingSoon ? "default" : "pointer" }}
              >
                <div
                  className="mb-4 grid size-10 place-items-center rounded-xl border"
                  style={{
                    background: `color-mix(in srgb, ${card.accent} 10%, transparent)`,
                    borderColor: `color-mix(in srgb, ${card.accent} 24%, transparent)`,
                  }}
                >
                  <ShadecodeFeatureIcon icon={Icon} feature={card.feature} size="md" />
                </div>
                <div className="mb-1 flex items-center gap-2">
                  <h2 style={{ fontSize: 15, fontWeight: 600, color: "var(--foreground)", margin: 0 }}>
                    {card.title}
                  </h2>
                  {card.comingSoon && (
                    <span
                      className="rounded-full border border-[var(--border-subtle)] bg-[var(--surface-sunken)] px-2 py-0.5 text-[10px] font-semibold text-[var(--text-tertiary)]"
                    >
                      Soon
                    </span>
                  )}
                </div>
                <p className="text-[13px] leading-6 text-[var(--text-secondary)]">
                  {card.description}
                </p>
                {!card.comingSoon && <ArrowRight size={15} className="mt-4 text-[var(--text-tertiary)] transition-transform duration-150 group-hover:translate-x-0.5 group-hover:text-[var(--primary)]" aria-hidden="true" />}
              </div>
            );

            return card.comingSoon ? (
              <div key={card.href}>{content}</div>
            ) : (
              <Link key={card.href} href={card.href} className="block">
                {content}
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
