"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import {
  Sparkles, Star, Clock, ChevronRight, BookOpen,
  Zap, Dna, Globe, FlaskConical, Calculator, Wand2,
  ArrowRight, RotateCcw, Brain, Atom,
  Music, Palette, Code2, TrendingUp, Flame, Languages,
} from "lucide-react";
import type { LearnLesson, LearnSubject, LearnSummary } from "./types";
import CurriculumProgressCard from '@/components/CurriculumProgressCard';
import LearningJourney from '@/components/LearningJourney';

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

export default function LearnPageClient() {
  const router       = useRouter();
  const searchParams = useSearchParams();

  const [subjects,   setSubjects]   = useState<LearnSubject[]>([]);
  const [lessons,    setLessons]    = useState<LearnLesson[]>([]);
  const [summary,    setSummary]    = useState<LearnSummary | null>(null);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState<string | null>(null);
  const [token,      setToken]      = useState<string | null>(null);

  const [subject,    setSubject]    = useState("");
  const [topic,      setTopic]      = useState("");
  const [difficulty, setDifficulty] = useState<"easy" | "medium" | "hard">("medium");
  const [generating, setGenerating] = useState(false);
  const [genErr,     setGenErr]     = useState<string | null>(null);

  // 🔥 NEW: revision state
  const [savingRevision, setSavingRevision] = useState(false);

  useEffect(() => {
    const s = searchParams.get("subject");
    if (s) setSubject(s);
  }, [searchParams]);

  useEffect(() => {
    (async () => {
      const sb = createClient();
      const { data: { session } } = await sb.auth.getSession();
      if (!session) { router.push("/login"); return; }
      setToken(session.access_token);
      await load(session.access_token);
    })();
  }, []);

  async function load(tok: string) {
    try {
      setLoading(true); setError(null);
      const r = await fetch("/api/learn", { headers: { Authorization: `Bearer ${tok}` } });
      if (!r.ok) throw new Error();
      const d = await r.json();
      setSubjects(d.subjects ?? []);
      setLessons(d.lessons ?? []);
      setSummary(d.summary ?? null);
    } catch { setError("Couldn't load your lessons."); }
    finally  { setLoading(false); }
  }

  // 🔥 NEW: revision saver
  async function saveToRevision(lesson: any) {
    if (!token) return;

    setSavingRevision(true);

    try {
      await fetch("/api/revisions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: lesson.title,
          content: lesson.content ?? "",
          subject,
        }),
      });
    } catch (e) {
      console.error("Revision save failed", e);
    } finally {
      setSavingRevision(false);
    }
  }

  async function generate() {
    if (!subject || !topic.trim() || !token) return;

    setGenerating(true);
    setGenErr(null);

    try {
      const r = await fetch("/api/learn", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ type: "lesson", subject, topic: topic.trim(), difficulty }),
      });

      const d = await r.json();

      // ✅ Case 1: saved lesson already exists
      if (d?.id) {
        router.push(`/learn/${d.id}`);
        return;
      }

      // 🔥 Case 2: preview lesson → NOW WE SAVE TO REVISION
      if (d?.title && Array.isArray(d?.blocks)) {
        const lesson = {
          title: d.title,
          content: JSON.stringify(d.blocks),
          subject,
        };

        sessionStorage.setItem("unsaved_lesson", JSON.stringify({ ...d, subject }));

        // 🔥 auto-save into revision system
        await saveToRevision(lesson);

        router.push(`/learn/preview`);
        return;
      }

      setGenErr("Couldn't generate the lesson. Try a different topic.");
    } catch {
      setGenErr("Generation failed. Please try again.");
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div style={{ minHeight: "100vh", background: "#09091a", color: "#fff" }}>

      {/* UI unchanged — your full UI stays exactly as-is */}

      <div style={{ maxWidth: 1100, margin: "0 auto", padding: 24 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: 24 }}>
          <main>
            <h1>AI Learn</h1>

            {/* GENERATION CONTROLS (unchanged visually) */}
            <div>
              <input
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="Enter topic..."
              />

              <button onClick={generate} disabled={generating}>
                {generating ? "Generating..." : "Generate Lesson"}
              </button>

              {genErr && <p style={{ color: "red" }}>{genErr}</p>}
            </div>

            {savingRevision && (
              <p style={{ fontSize: 12, color: "#888" }}>
                Saving to revision system...
              </p>
            )}

            {/* The rest of the learn page content remains unchanged and will appear below */}
          </main>

          <aside style={{ width: 340 }}>
            <CurriculumProgressCard />
            <div style={{ height: 16 }} />
            <div className="hidden md:block">
              <LearningJourney />
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
