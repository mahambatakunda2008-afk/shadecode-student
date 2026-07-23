"use client";

import Link from "next/link";
import { FileText, Gamepad2, Bookmark, BarChart3, Target, Sparkles, UploadCloud } from "lucide-react";

interface HubCard {
  href: string;
  icon: React.ElementType;
  title: string;
  description: string;
  accent: string;
  comingSoon?: boolean;
}

const CARDS: HubCard[] = [
  {
    href: "/exam-hub/papers",
    icon: FileText,
    title: "Past Papers",
    description: "Browse real past papers by board, subject, session, and year.",
    accent: "var(--primary)",
  },
  {
    href: "/exam-sim",
    icon: Gamepad2,
    title: "Generated Exams",
    description: "AI-generated practice exams, marked instantly.",
    accent: "var(--accent)",
  },
  {
    href: "/exam-hub/saved",
    icon: Bookmark,
    title: "Saved Papers & Questions",
    description: "Everything you've bookmarked, in one place.",
    accent: "var(--warning)",
  },
  {
    href: "/analytics",
    icon: BarChart3,
    title: "Performance",
    description: "Your scores, time spent, and progress over time.",
    accent: "var(--primary)",
  },
  {
    href: "/exam-hub/weak-topics",
    icon: Target,
    title: "Weak Topics",
    description: "Topics to focus on before your next exam.",
    accent: "var(--danger)",
    comingSoon: true,
  },
  {
    href: "/exam-hub/recommendations",
    icon: Sparkles,
    title: "AI Recommendations",
    description: "Papers picked for you based on your recent performance.",
    accent: "var(--accent)",
    comingSoon: true,
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
        },
      ]
    : CARDS;

  return (
    <div style={{ minHeight: "100vh", padding: 24 }}>
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: "var(--foreground)", marginBottom: 6 }}>
          Exam Hub
        </h1>
        <p style={{ fontSize: 14, color: "var(--muted-foreground)", marginBottom: 28 }}>
          Everything for exam prep, in one place.
        </p>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
            gap: 16,
          }}
        >
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
                  <Icon size={20} color={card.accent} />
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
              <Link key={card.href} href={card.href} style={{ textDecoration: "none" }}>
                {content}
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
