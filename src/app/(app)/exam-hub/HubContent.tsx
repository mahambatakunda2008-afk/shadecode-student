"use client";

import Link from "next/link";
import { FileText, Gamepad2, Bookmark, BarChart3, Target, Sparkles, UploadCloud, Users, ListChecks } from "lucide-react";
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
    <div className="ssc-page-full">
      <div className="mx-auto max-w-6xl">
        <div className="mb-2 flex items-center gap-3"><ShadecodeFeatureIcon feature="past-papers" size="sm" /><div><p className="ssc-kicker ssc-brand-gradient">Exam preparation</p><h1 className="text-2xl font-bold text-[var(--foreground)]">
          Exam Hub
        </h1></div></div>
        <p className="mb-7 text-sm text-[var(--muted-foreground)]">
          Everything for exam prep, in one place.
        </p>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {cards.map((card) => {
            const Icon = card.icon;
            const content = (
              <div
                style={{
                  padding: 20,
                  borderRadius: 18,
                  background: "var(--surface-2)",
                  border: "1px solid var(--card-border)",
                  height: "100%",
                  opacity: card.comingSoon ? 0.6 : 1,
                  cursor: card.comingSoon ? "default" : "pointer",
                  transition: "border-color 150ms ease",
                }}
              >
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 12,
                    background: `color-mix(in srgb, ${card.accent} 14%, transparent)`,
                    border: `1px solid color-mix(in srgb, ${card.accent} 28%, transparent)`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    marginBottom: 14,
                  }}
                >
                  <ShadecodeFeatureIcon icon={Icon} feature={card.feature} size="md" />
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                  <h2 style={{ fontSize: 15, fontWeight: 600, color: "var(--foreground)", margin: 0 }}>
                    {card.title}
                  </h2>
                  {card.comingSoon && (
                    <span
                      style={{
                        fontSize: 10,
                        fontWeight: 600,
                        color: "var(--muted-foreground)",
                        background: "var(--surface)",
                        border: "1px solid var(--card-border)",
                        borderRadius: 999,
                        padding: "2px 8px",
                      }}
                    >
                      Soon
                    </span>
                  )}
                </div>
                <p style={{ fontSize: 13, color: "var(--muted-foreground)", margin: 0, lineHeight: 1.5 }}>
                  {card.description}
                </p>
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
