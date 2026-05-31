"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import {
  ArrowLeft, BookOpen, Zap, Dna, Globe, FlaskConical,
  Calculator, Brain, Code2, TrendingUp, Languages, Music,
  Palette, Sparkles, ChevronRight, Plus,
} from "lucide-react";

type SubjectTheme = {
  hex: string; bg: string; border: string; text: string;
  icon: React.ComponentType<{ size?: number; color?: string }>;
};

const THEMES: Record<string, SubjectTheme> = {
  Mathematics:        { hex: "#8b5cf6", bg: "rgba(139,92,246,0.18)",  border: "rgba(139,92,246,0.3)",  text: "#c4b5fd", icon: Calculator   },
  Physics:            { hex: "#3b82f6", bg: "rgba(59,130,246,0.18)",  border: "rgba(59,130,246,0.3)",  text: "#93c5fd", icon: Zap          },
  Biology:            { hex: "#10b981", bg: "rgba(16,185,129,0.18)",  border: "rgba(16,185,129,0.3)",  text: "#6ee7b7", icon: Dna          },
  History:            { hex: "#f59e0b", bg: "rgba(245,158,11,0.18)",  border: "rgba(245,158,11,0.3)",  text: "#fcd34d", icon: Globe        },
  Chemistry:          { hex: "#06b6d4", bg: "rgba(6,182,212,0.18)",   border: "rgba(6,182,212,0.3)",   text: "#67e8f9", icon: FlaskConical },
  Geography:          { hex: "#14b8a6", bg: "rgba(20,184,166,0.18)",  border: "rgba(20,184,166,0.3)",  text: "#5eead4", icon: Globe        },
  "Computer Science": { hex: "#6366f1", bg: "rgba(99,102,241,0.18)",  border: "rgba(99,102,241,0.3)",  text: "#a5b4fc", icon: Code2        },
  Psychology:         { hex: "#ec4899", bg: "rgba(236,72,153,0.18)",  border: "rgba(236,72,153,0.3)",  text: "#f9a8d4", icon: Brain        },
  Economics:          { hex: "#22c55e", bg: "rgba(34,197,94,0.18)",   border: "rgba(34,197,94,0.3)",   text: "#86efac", icon: TrendingUp   },
  Languages:          { hex: "#f43f5e", bg: "rgba(244,63,94,0.18)",   border: "rgba(244,63,94,0.3)",   text: "#fda4af", icon: Languages    },
  Music:              { hex: "#a855f7", bg: "rgba(168,85,247,0.18)",  border: "rgba(168,85,247,0.3)",  text: "#d8b4fe", icon: Music        },
  Art:                { hex: "#f97316", bg: "rgba(249,115,22,0.18)",  border: "rgba(249,115,22,0.3)",  text: "#fdba74", icon: Palette      },
  default:            { hex: "#64748b", bg: "rgba(100,116,139,0.18)", border: "rgba(100,116,139,0.3)", text: "#94a3b8", icon: BookOpen     },
};

function theme(name: string): SubjectTheme {
  return THEMES[name] ?? THEMES.default;
}

interface Subject {
  id: string;
  name: string;
  lessonCount: number;
}

export default function SubjectsPage() {
  const router = useRouter();

  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const sb = createClient();
      const { data: { session } } = await sb.auth.getSession();
      if (!session) { router.push("/login"); return; }

      try {
        const r = await fetch("/api/learn", {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        if (!r.ok) throw new Error();
        const d = await r.json();
        setSubjects(d.subjects ?? []);
      } catch {
        setError("Couldn't load your subjects.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // ── Loading ─────────────────────────────────────────────────────────────────

  if (loading) return (
    <div style={{ minHeight: "100vh", background: "#09091a", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ position: "relative", width: 36, height: 36 }}>
        <div style={{ position: "absolute", inset: 0, borderRadius: "50%", border: "2px solid rgba(139,92,246,0.2)" }} />
        <div style={{ position: "absolute", inset: 0, borderRadius: "50%", border: "2px solid transparent", borderTopColor: "#8b5cf6", animation: "spin 0.8s linear infinite" }} />
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  // ── Page ────────────────────────────────────────────────────────────────────

  return (
    <div style={{ minHeight: "100vh", background: "#09091a", color: "#fff" }}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg) } }
        .subj-card:hover { transform: translateY(-3px) !important; border-color: rgba(255,255,255,0.14) !important; }
        .gen-btn:hover   { filter: brightness(1.12); }
      `}</style>

      {/* Ambient glow */}
      <div style={{ position: "fixed", inset: 0, pointerEvents: "none", overflow: "hidden" }} aria-hidden>
        <div style={{ position: "absolute", top: -100, left: "50%", transform: "translateX(-50%)", width: 700, height: 400, background: "radial-gradient(ellipse, rgba(109,40,217,0.12) 0%, transparent 65%)", borderRadius: "50%" }} />
      </div>

      <div style={{ position: "relative", maxWidth: 900, margin: "0 auto", padding: "32px 24px" }}>

        {/* ── Header ── */}
        <div style={{ marginBottom: 32 }}>
          <Link href="/learn"
            style={{ display: "inline-flex", alignItems: "center", gap: 8, color: "#475569", fontSize: 13, textDecoration: "none", marginBottom: 20 }}
            onMouseEnter={e => (e.currentTarget.style.color = "#94a3b8")}
            onMouseLeave={e => (e.currentTarget.style.color = "#475569")}
          >
            <ArrowLeft size={14} /> Back to Learn
          </Link>

          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div>
              <h1 style={{ fontSize: 22, fontWeight: 700, color: "#f1f5f9", margin: "0 0 4px" }}>Your Subjects</h1>
              <p style={{ fontSize: 13, color: "#475569", margin: 0 }}>
                {subjects.length} subject{subjects.length !== 1 ? "s" : ""} · click any to generate a lesson
              </p>
            </div>
          </div>
        </div>

        {/* ── Error ── */}
        {error && (
          <p style={{ color: "#f87171", fontSize: 14, textAlign: "center", padding: "60px 0" }}>{error}</p>
        )}

        {/* ── Empty state ── */}
        {!error && subjects.length === 0 && (
          <div style={{ textAlign: "center", padding: "72px 24px" }}>
            <div style={{ width: 56, height: 56, borderRadius: 18, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
              <BookOpen size={24} color="#334155" />
            </div>
            <p style={{ fontSize: 15, fontWeight: 600, color: "#475569", margin: "0 0 6px" }}>No subjects yet</p>
            <p style={{ fontSize: 13, color: "#334155", margin: "0 0 24px" }}>
              Add subjects during onboarding or from your profile settings.
            </p>
            <Link href="/learn" style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 13, fontWeight: 600, color: "#a78bfa", background: "rgba(139,92,246,0.1)", border: "1px solid rgba(139,92,246,0.25)", borderRadius: 10, padding: "10px 18px", textDecoration: "none" }}>
              Back to Learn
            </Link>
          </div>
        )}

        {/* ── Subject grid ── */}
        {!error && subjects.length > 0 && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 16 }}>
            {subjects.map(s => {
              const t    = theme(s.name);
              const Icon = t.icon;

              return (
                <div
                  key={s.id}
                  className="subj-card"
                  style={{ background: "linear-gradient(150deg, #131330 0%, #0f0f24 100%)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 20, padding: "24px", transition: "transform .2s, border-color .2s", display: "flex", flexDirection: "column", gap: 0 }}
                >
                  {/* Icon + name */}
                  <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 16 }}>
                    <div style={{ width: 48, height: 48, borderRadius: 14, background: t.bg, border: `1px solid ${t.border}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <Icon size={22} color={t.text} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 15, fontWeight: 700, color: "#f1f5f9", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.name}</p>
                      <p style={{ fontSize: 12, color: "#475569", margin: "3px 0 0" }}>
                        {s.lessonCount} lesson{s.lessonCount !== 1 ? "s" : ""}
                      </p>
                    </div>
                  </div>

                  {/* Divider */}
                  <div style={{ height: 1, background: "rgba(255,255,255,0.05)", marginBottom: 16 }} />

                  {/* Actions */}
                  <div style={{ display: "flex", gap: 8 }}>
                    {/* Generate lesson — pre-fills the Learn form */}
                    <Link
                      href={`/learn?subject=${encodeURIComponent(s.name)}`}
                      className="gen-btn"
                      style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "9px 0", borderRadius: 10, background: t.bg, border: `1px solid ${t.border}`, fontSize: 12, fontWeight: 600, color: t.text, textDecoration: "none", transition: "filter .15s", cursor: "pointer" }}
                    >
                      <Sparkles size={13} /> Generate lesson
                    </Link>

                    {/* View lessons for this subject */}
                    <Link
                      href={`/learn/history?subject=${encodeURIComponent(s.name)}`}
                      style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "9px 12px", borderRadius: 10, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", textDecoration: "none", transition: "filter .15s", cursor: "pointer" }}
                      onMouseEnter={e => (e.currentTarget.style.filter = "brightness(1.15)")}
                      onMouseLeave={e => (e.currentTarget.style.filter = "brightness(1)")}
                    >
                      <ChevronRight size={14} color="#64748b" />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
