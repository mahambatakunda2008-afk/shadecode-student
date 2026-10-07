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
    accent: "var(--warning)",
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
    accent: "var(--danger)",
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
    accent: "var(--warning)",
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
    <main className="ssc-page" data-page="exam-hub">
      <div className="mx-auto max-w-6xl">
        <div className="mb-4 flex items-center gap-3"><ShadecodeFeatureIcon feature="past-papers" size="sm" /><div><p className="ssc-kicker ssc-brand-gradient">Exam preparation</p><h1 className="text-2xl font-bold text-[var(--foreground)]">
          Exam Hub
        </h1></div></div>
        <p className="mb-7 text-sm text-[var(--muted-foreground)]">
          Everything for exam prep, in one place.
        </p>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {cards.map((card) => {
            const Icon = card.icon;
            const content = (
              <div
                className="ssc-card-interactive group h-full p-5"
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
                {!card.comingSoon && <ArrowRight size={15} className="mt-4 text-[var(--text-tertiary)] transition-transform duration-150 group-hover:text-[var(--primary)]" aria-hidden="true" />}
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
