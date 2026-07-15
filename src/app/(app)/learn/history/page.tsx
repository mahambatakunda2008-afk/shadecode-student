"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import {
  ArrowLeft, BookOpen, Zap, Dna, Globe, FlaskConical,
  Calculator, Brain, Code2, TrendingUp, Languages, Music,
  Palette, ChevronRight, Search, CheckCircle2, Filter,
} from "lucide-react";
import type { LearnLesson, LearnSubject } from "../types";

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
  default:            { hex: "var(--muted-foreground)", bg: "rgba(100,116,139,0.18)", border: "rgba(100,116,139,0.3)", text: "var(--muted-foreground)", icon: BookOpen     },
};

function theme(name: string): SubjectTheme {
  return THEMES[name] ?? THEMES.default;
}

const DIFF: Record<string, { label: string; bg: string; border: string; text: string }> = {
  easy:   { label: "Guided",    bg: "rgba(16,185,129,0.12)",  border: "rgba(16,185,129,0.3)",  text: "#6ee7b7" },
  medium: { label: "Standard",  bg: "rgba(59,130,246,0.12)",  border: "rgba(59,130,246,0.3)",  text: "#93c5fd" },
  hard:   { label: "Challenge", bg: "rgba(139,92,246,0.12)",  border: "rgba(139,92,246,0.3)",  text: "#c4b5fd" },
};

function ago(iso: string): string {
  if (!iso) return "Recently";
  const h = Math.floor((Date.now() - new Date(iso).getTime()) / 3_600_000);
  if (h < 1)  return "Just now";
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d === 1) return "Yesterday";
  if (d < 30)  return `${d} days ago`;
  const m = Math.floor(d / 30);
  return `${m} month${m > 1 ? "s" : ""} ago`;
}

export default function LearnHistoryPage() {
  const router = useRouter();

  const [lessons,  setLessons]  = useState<LearnLesson[]>([]);
  const [subjects, setSubjects] = useState<LearnSubject[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState<string | null>(null);

  const [search,          setSearch]          = useState("");
  const [activeSubject,   setActiveSubject]   = useState("all");
  const [activeDifficulty,setActiveDifficulty]= useState("all");
  const [showCompleted,   setShowCompleted]   = useState<"all" | "done" | "undone">("all");

  useEffect(() => {
    (async () => {
      const sb = createClient();
      const { data: { session } } = await sb.auth.getSession();
      if (!session) { router.push("/login"); return; }

      try {
        const r = await fetch("/api/learn", { headers: { Authorization: `Bearer ${session.access_token}` } });
        if (!r.ok) throw new Error();
        const d = await r.json();
        setLessons(d.lessons ?? []);
        setSubjects(d.subjects ?? []);
      } catch {
        setError("Couldn't load your lesson history.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Filter + sort
  const filtered = lessons
    .filter(l => {
      if (activeSubject !== "all" && l.subject !== activeSubject) return false;
      if (activeDifficulty !== "all" && l.difficulty !== activeDifficulty) return false;
      if (showCompleted === "done"   && !l.completed) return false;
      if (showCompleted === "undone" && l.completed)  return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        return l.title.toLowerCase().includes(q) || l.subject.toLowerCase().includes(q);
      }
      return true;
    })
    .sort((a, b) => ((b as any).updated_at ?? "").localeCompare((a as any).updated_at ?? ""));

  const completedCount = lessons.filter(l => l.completed).length;

  // ── Loading ─────────────────────────────────────────────────────────────────

  if (loading) return (
    <div style={{ minHeight: "100vh", background: "var(--background)", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ position: "relative", width: 36, height: 36 }}>
        <div style={{ position: "absolute", inset: 0, borderRadius: "50%", border: "2px solid rgba(139,92,246,0.2)" }} />
        <div style={{ position: "absolute", inset: 0, borderRadius: "50%", border: "2px solid transparent", borderTopColor: "#8b5cf6", animation: "spin 0.8s linear infinite" }} />
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  // ── Page ────────────────────────────────────────────────────────────────────

  return (
    <div style={{ minHeight: "100vh", background: "var(--background)", color: "var(--foreground)" }}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg) } }
        .hist-row:hover  { background: var(--card-border) !important; }
        .filter-btn:hover { border-color: var(--card-border) !important; color: #e2e8f0 !important; }
        .search-input:focus { border-color: rgba(139,92,246,0.5) !important; box-shadow: 0 0 0 3px rgba(139,92,246,0.1); }
      `}</style>

      <div style={{ maxWidth: 860, margin: "0 auto", padding: "32px 24px" }}>

        {/* ── Header ── */}
        <div style={{ marginBottom: 32 }}>
          <Link href="/learn"
            style={{ display: "inline-flex", alignItems: "center", gap: 8, color: "var(--muted-foreground)", fontSize: 13, textDecoration: "none", marginBottom: 20 }}
            onMouseEnter={e => (e.currentTarget.style.color = "var(--muted-foreground)")}
            onMouseLeave={e => (e.currentTarget.style.color = "var(--muted-foreground)")}
          >
            <ArrowLeft size={14} /> Back to Learn
          </Link>

          <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between" }}>
            <div>
              <h1 style={{ fontSize: 22, fontWeight: 700, color: "#f1f5f9", margin: "0 0 4px" }}>Lesson History</h1>
              <p style={{ fontSize: 13, color: "var(--muted-foreground)", margin: 0 }}>
                {lessons.length} lesson{lessons.length !== 1 ? "s" : ""} total · {completedCount} completed
              </p>
            </div>

            {/* Completion toggle */}
            <div style={{ display: "flex", gap: 6 }}>
              {(["all", "done", "undone"] as const).map(v => (
                <button key={v} onClick={() => setShowCompleted(v)}
                  style={{ fontSize: 11, fontWeight: 600, padding: "5px 12px", borderRadius: 8, border: "1px solid", cursor: "pointer", transition: "all .15s",
                    background: showCompleted === v ? "rgba(139,92,246,0.15)" : "var(--card-border)",
                    borderColor: showCompleted === v ? "rgba(139,92,246,0.4)" : "var(--card-border)",
                    color: showCompleted === v ? "#c4b5fd" : "var(--muted-foreground)",
                  }}>
                  {v === "all" ? "All" : v === "done" ? "✓ Completed" : "In Progress"}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ── Search ── */}
        <div style={{ position: "relative", marginBottom: 16 }}>
          <Search size={15} color="var(--muted-foreground)" style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }} />
          <input
            type="text"
            placeholder="Search lessons or subjects…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="search-input"
            style={{ width: "100%", background: "rgba(0,0,0,0.3)", border: "1px solid var(--card-border)", borderRadius: 12, padding: "11px 14px 11px 42px", fontSize: 14, color: "#fff", outline: "none", transition: "border-color .15s", boxSizing: "border-box" }}
          />
        </div>

        {/* ── Subject filter pills ── */}
        <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 4, marginBottom: 20, scrollbarWidth: "none" }}>
          {["all", ...subjects.map(s => s.name)].map(s => {
            const active = activeSubject === s;
            const t = s === "all" ? null : theme(s);
            return (
              <button key={s} onClick={() => setActiveSubject(s)}
                className="filter-btn"
                style={{ flexShrink: 0, fontSize: 12, fontWeight: 600, padding: "6px 14px", borderRadius: 999, border: "1px solid", cursor: "pointer", transition: "all .15s", whiteSpace: "nowrap",
                  background: active ? (t ? t.bg : "rgba(139,92,246,0.15)") : "var(--card-border)",
                  borderColor: active ? (t ? t.border : "rgba(139,92,246,0.4)") : "var(--card-border)",
                  color: active ? (t ? t.text : "#c4b5fd") : "var(--muted-foreground)",
                }}>
                {s === "all" ? "All subjects" : s}
              </button>
            );
          })}
        </div>

        {/* ── Difficulty filter ── */}
        <div style={{ display: "flex", gap: 8, marginBottom: 24 }}>
          {[
            { v: "all",    label: "All levels" },
            { v: "easy",   label: "Guided"     },
            { v: "medium", label: "Standard"   },
            { v: "hard",   label: "Challenge"  },
          ].map(({ v, label }) => {
            const active = activeDifficulty === v;
            const d = v !== "all" ? DIFF[v] : null;
            return (
              <button key={v} onClick={() => setActiveDifficulty(v)}
                className="filter-btn"
                style={{ fontSize: 12, fontWeight: 600, padding: "5px 12px", borderRadius: 8, border: "1px solid", cursor: "pointer", transition: "all .15s",
                  background: active ? (d ? d.bg : "var(--card-border)") : "var(--card-border)",
                  borderColor: active ? (d ? d.border : "var(--card-border)") : "var(--card-border)",
                  color: active ? (d ? d.text : "#e2e8f0") : "var(--muted-foreground)",
                }}>
                {label}
              </button>
            );
          })}
        </div>

        {/* ── Error ── */}
        {error && (
          <p style={{ color: "var(--danger)", fontSize: 13, textAlign: "center", padding: "40px 0" }}>{error}</p>
        )}

        {/* ── Lesson list ── */}
        {!error && (
          <div style={{ background: "linear-gradient(160deg, #12122a 0%, #0e0e20 100%)", border: "1px solid var(--card-border)", borderRadius: 20, overflow: "hidden" }}>
            {filtered.length === 0 ? (
              <div style={{ padding: "56px 24px", display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
                <div style={{ width: 48, height: 48, borderRadius: 14, background: "var(--card-border)", border: "1px solid var(--card-border)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Filter size={20} color="var(--muted-foreground)" />
                </div>
                <p style={{ fontSize: 14, color: "var(--muted-foreground)", margin: 0, fontWeight: 500 }}>
                  {lessons.length === 0 ? "No lessons yet" : "No lessons match your filters"}
                </p>
                <p style={{ fontSize: 12, color: "var(--muted-foreground)", margin: 0 }}>
                  {lessons.length === 0 ? "Generate your first one on the Learn page" : "Try adjusting your search or filters"}
                </p>
                {lessons.length === 0 && (
                  <Link href="/learn" style={{ marginTop: 8, fontSize: 13, fontWeight: 600, color: "#a78bfa", background: "rgba(139,92,246,0.1)", border: "1px solid rgba(139,92,246,0.25)", borderRadius: 10, padding: "8px 16px", textDecoration: "none" }}>
                    Go to Learn
                  </Link>
                )}
              </div>
            ) : (
              filtered.map((l, i) => {
                const t    = theme(l.subject);
                const Icon = t.icon;
                const d    = DIFF[l.difficulty] ?? DIFF.medium;
                const date = (l as any).updated_at ?? "";

                return (
                  <Link
                    key={l.id}
                    href={`/learn/${l.id}`}
                    className="hist-row"
                    style={{ position: "relative", display: "flex", alignItems: "center", gap: 16, padding: "16px 24px", textDecoration: "none", color: "#fff", borderBottom: i < filtered.length - 1 ? "1px solid var(--card-border)" : "none", transition: "background .15s" }}
                  >
                    {/* Left colour bar */}
                    <div style={{ position: "absolute", left: 0, top: 14, bottom: 14, width: 3, borderRadius: "0 3px 3px 0", background: t.hex, opacity: l.completed ? 1 : 0.5 }} />

                    {/* Subject icon */}
                    <div style={{ width: 40, height: 40, borderRadius: 12, background: t.bg, border: `1px solid ${t.border}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, position: "relative" }}>
                      <Icon size={17} color={t.text} />
                      {l.completed && (
                        <div style={{ position: "absolute", top: -4, right: -4, width: 14, height: 14, borderRadius: "50%", background: "#10b981", border: "2px solid var(--background)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                          <CheckCircle2 size={8} color="#fff" />
                        </div>
                      )}
                    </div>

                    {/* Title + meta */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 14, fontWeight: 600, color: l.completed ? "var(--muted-foreground)" : "#f1f5f9", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{l.title}</p>
                      <p style={{ fontSize: 12, color: "var(--muted-foreground)", margin: "3px 0 0" }}>{l.subject} · {ago(date)}</p>
                    </div>

                    {/* Progress */}
                    <div style={{ width: 60, flexShrink: 0 }}>
                      <div style={{ height: 4, background: "var(--card-border)", borderRadius: 999, overflow: "hidden" }}>
                        <div style={{ height: "100%", width: `${l.progress}%`, background: l.completed ? "#10b981" : t.hex, borderRadius: 999 }} />
                      </div>
                      <p style={{ fontSize: 10, color: "var(--muted-foreground)", margin: "4px 0 0", textAlign: "right" }}>{l.progress}%</p>
                    </div>

                    {/* Difficulty badge */}
                    <span style={{ fontSize: 11, fontWeight: 600, color: d.text, background: d.bg, border: `1px solid ${d.border}`, borderRadius: 999, padding: "3px 10px", flexShrink: 0 }}>
                      {d.label}
                    </span>

                    <ChevronRight size={15} color="var(--muted-foreground)" style={{ flexShrink: 0 }} />
                  </Link>
                );
              })
            )}
          </div>
        )}

        {/* Results count */}
        {filtered.length > 0 && (
          <p style={{ fontSize: 12, color: "var(--muted-foreground)", textAlign: "center", marginTop: 16 }}>
            Showing {filtered.length} of {lessons.length} lessons
          </p>
        )}
      </div>
    </div>
  );
}
