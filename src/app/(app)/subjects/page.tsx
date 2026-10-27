"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { SUBJECT_CATALOG, SUBJECT_CATEGORIES } from "@/lib/subjects/catalog";
import { CurriculumProfileEditor } from "@/components/subjects/CurriculumProfileEditor";
import {
  ArrowLeft, BookOpen, Zap, Dna, Globe, FlaskConical,
  Calculator, Brain, Code2, TrendingUp, Languages, Music,
  Palette, Sparkles, ChevronRight, Plus, Search, X,
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
  default:            { hex: "var(--muted-foreground)", bg: "rgba(100,116,139,0.18)", border: "rgba(100,116,139,0.3)", text: "var(--muted-foreground)", icon: BookOpen     },
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
  const [subjectQuery, setSubjectQuery] = useState("");
  const [addingSubject, setAddingSubject] = useState<string | null>(null);
  const [addError, setAddError] = useState<string | null>(null);
  const [addSuccess, setAddSuccess] = useState<string | null>(null);
  const [removingSubject, setRemovingSubject] = useState<string | null>(null);
  const [studyLevel, setStudyLevel] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const sb = createClient();
      const { data: { session } } = await sb.auth.getSession();
      if (!session) { router.push("/login"); return; }

      const { data: learnerProfile } = await sb.from("profiles").select("study_level").eq("id", session.user.id).maybeSingle();
      setStudyLevel(typeof learnerProfile?.study_level === "string" ? learnerProfile.study_level : null);

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


  const normalizeLabel = (value: string) => value.trim().toLocaleLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").replace(/\s+/g, " ");
  const existingKeys = new Set(subjects.map(subject => normalizeLabel(subject.name)));
  const matchingCatalogue = SUBJECT_CATEGORIES.map(group => ({
    group,
    items: SUBJECT_CATALOG
      .filter(entry => entry.category === group)
      .filter(entry => {
        const labels = [entry.name, ...(entry.aliases ?? [])].map(normalizeLabel);
        return labels.every(label => !existingKeys.has(label)) &&
          (entry.name.toLocaleLowerCase().includes(subjectQuery.trim().toLocaleLowerCase()) ||
           (entry.aliases ?? []).some(alias => alias.toLocaleLowerCase().includes(subjectQuery.trim().toLocaleLowerCase())));
      })
      .sort((a, b) => Number(b.pathways.includes(studyLevel ?? "")) - Number(a.pathways.includes(studyLevel ?? "")))
      .map(entry => entry.name),
  })).filter(group => group.items.length > 0);
  const addSubject = async (name: string) => {
    setAddingSubject(name); setAddError(null); setAddSuccess(null);
    try {
      const sb = createClient();
      const { data: { session } } = await sb.auth.getSession();
      if (!session) { router.push("/login"); return; }
      const response = await fetch("/api/subjects", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: "Bearer " + session.access_token },
        body: JSON.stringify({ subject: name }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error || "Could not add this subject.");
      // The write succeeded. Refresh the canonical lesson-facing list, but don't
      // report a failed add if this follow-up read alone is temporarily unavailable.
      const refreshed = await fetch("/api/learn", { headers: { Authorization: "Bearer " + session.access_token } });
      if (refreshed.ok) {
        const data = await refreshed.json();
        setSubjects(data.subjects ?? []);
        setAddSuccess(String(payload.subject) + " added to your study space.");
      } else {
        setAddSuccess(String(payload.subject) + " saved. The list may take a moment to refresh.");
      }
      setSubjectQuery("");
    } catch (e) {
      setAddError(e instanceof Error ? e.message : "Could not add this subject.");
    } finally { setAddingSubject(null); }
  };

  const removeSubject = async (subject: Subject) => {
    const confirmed = window.confirm(
      `Remove ${subject.name} from your active subjects? Existing lessons and progress will be preserved.`
    );
    if (!confirmed) return;
    setRemovingSubject(subject.id); setAddError(null); setAddSuccess(null);
    try {
      const sb = createClient();
      const { data: { session } } = await sb.auth.getSession();
      if (!session) { router.push("/login"); return; }
      const response = await fetch("/api/subjects", {
        method: "DELETE",
        headers: { "Content-Type": "application/json", Authorization: "Bearer " + session.access_token },
        body: JSON.stringify({ subjectId: subject.id }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error || "Could not remove this subject.");
      // Removing the profile selection is the successful mutation. A failed
      // follow-up read must not turn that success into a misleading failure state.
      const refreshed = await fetch("/api/learn", { headers: { Authorization: "Bearer " + session.access_token } });
      if (refreshed.ok) {
        const data = await refreshed.json();
        setSubjects(data.subjects ?? []);
        setAddSuccess(String(payload.removed ?? subject.name) + " removed from active subjects. Existing work is preserved.");
      } else {
        setSubjects(current => current.filter(item => item.id !== subject.id));
        setAddSuccess(String(payload.removed ?? subject.name) + " removed. Existing work is preserved; refresh the page to sync the list.");
      }
    } catch (e) {
      setAddError(e instanceof Error ? e.message : "Could not remove this subject.");
    } finally { setRemovingSubject(null); }
  };

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
    <div style={{ minHeight: "100vh", background: "var(--background)", color: "#fff" }}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg) } }
        .subj-card:hover { transform: translateY(-3px) !important; border-color: var(--card-border) !important; }
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
            style={{ display: "inline-flex", alignItems: "center", gap: 8, color: "var(--muted-foreground)", fontSize: 13, textDecoration: "none", marginBottom: 20 }}
            onMouseEnter={e => (e.currentTarget.style.color = "var(--muted-foreground)")}
            onMouseLeave={e => (e.currentTarget.style.color = "var(--muted-foreground)")}
          >
            <ArrowLeft size={14} /> Back to Learn
          </Link>

          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div>
              <h1 style={{ fontSize: 22, fontWeight: 700, color: "var(--foreground)", margin: "0 0 4px" }}>Your Subjects</h1>
              <p style={{ fontSize: 13, color: "var(--muted-foreground)", margin: 0 }}>
                {subjects.length} subject{subjects.length !== 1 ? "s" : ""} · click any to generate a lesson
              </p>
            </div>
          </div>
        </div>


        <section aria-labelledby="add-subject-heading" style={{ marginBottom: 28, padding: 20, borderRadius: 18, border: "1px solid var(--card-border)", background: "var(--surface)" }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, marginBottom: 14 }}>
            <div>
              <h2 id="add-subject-heading" style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "var(--foreground)" }}>Build your subject list</h2>
              <p style={{ margin: "5px 0 0", fontSize: 12, lineHeight: 1.5, color: "var(--muted-foreground)" }}>Add what you actually study. You can choose subjects across fields, then tailor your level and syllabus in your learning profile.</p>
            </div>
            <Plus size={20} color="var(--primary)" aria-hidden="true" />
          </div>
          <label style={{ display: "flex", alignItems: "center", gap: 9, border: "1px solid var(--card-border)", borderRadius: 11, padding: "0 12px", background: "var(--background)" }}>
            <Search size={18} color="var(--muted-foreground)" aria-hidden="true" />
            <input value={subjectQuery} onChange={event => { setSubjectQuery(event.target.value); setAddError(null); setAddSuccess(null); }} placeholder="Find a subject, e.g. Biology or Web Development" aria-label="Search subject catalogue" style={{ flex: 1, minWidth: 0, padding: "12px 0", border: 0, outline: "none", background: "transparent", color: "var(--foreground)", fontSize: 13 }} />
            {subjectQuery && <button type="button" onClick={() => setSubjectQuery("")} aria-label="Clear search" style={{ border: 0, background: "transparent", color: "var(--muted-foreground)", cursor: "pointer" }}><X size={16} /></button>}
          </label>
          {addError && <p role="alert" style={{ margin: "10px 0 0", fontSize: 12, color: "var(--danger)" }}>{addError}</p>}
          {addSuccess && <p role="status" style={{ margin: "10px 0 0", fontSize: 12, color: "var(--primary)" }}>{addSuccess}</p>}
          <div style={{ display: "grid", gap: 14, marginTop: 15 }}>
            {matchingCatalogue.map(group => <div key={group.group}>
              <h3 style={{ margin: "0 0 8px", fontSize: 11, fontWeight: 700, color: "var(--muted-foreground)", letterSpacing: ".04em" }}>{group.group}</h3>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
                {group.items.map(name => <button key={name} type="button" onClick={() => void addSubject(name)} disabled={Boolean(addingSubject)} style={{ display: "inline-flex", alignItems: "center", gap: 6, border: "1px solid var(--card-border)", borderRadius: 999, padding: "8px 11px", background: "var(--surface-2)", color: "var(--foreground)", fontSize: 12, cursor: addingSubject ? "wait" : "pointer", opacity: addingSubject && addingSubject !== name ? .55 : 1 }}>
                  <Plus size={14} aria-hidden="true" />{addingSubject === name ? "Adding…" : name}
                </button>)}
              </div>
            </div>)}
            {matchingCatalogue.length === 0 && <p style={{ margin: 0, fontSize: 12, color: "var(--muted-foreground)" }}>No unadded catalogue subjects match. You can still add a subject by its exact name below.</p>}
          </div>
          <form onSubmit={event => { event.preventDefault(); if (subjectQuery.trim()) void addSubject(subjectQuery.trim()); }} style={{ display: "flex", gap: 8, marginTop: 15 }}>
            <button type="submit" disabled={!subjectQuery.trim() || Boolean(addingSubject)} className="gen-btn" style={{ border: "1px solid var(--card-border)", borderRadius: 10, padding: "9px 13px", background: "var(--primary-glow)", color: "var(--foreground)", fontSize: 12, fontWeight: 650, cursor: "pointer" }}>Add custom subject</button>
          </form>
          <p style={{ margin: "10px 0 0", fontSize: 11, lineHeight: 1.5, color: "var(--muted-foreground)" }}>The catalogue is a starting point, not a guarantee that every syllabus or lesson is verified. Subjects commonly associated with your current level appear first, but you can still choose other subjects.</p>
        </section>

        {!error && subjects.length > 0 && <CurriculumProfileEditor subjects={subjects} studyLevel={studyLevel} />}

        {/* ── Error ── */}
        {error && (
          <p style={{ color: "var(--danger)", fontSize: 14, textAlign: "center", padding: "60px 0" }}>{error}</p>
        )}

        {/* ── Empty state ── */}
        {!error && subjects.length === 0 && (
          <div style={{ textAlign: "center", padding: "72px 24px" }}>
            <div style={{ width: 56, height: 56, borderRadius: 18, background: "var(--surface-2)", border: "1px solid var(--card-border)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
              <BookOpen size={24} color="var(--muted-foreground)" />
            </div>
            <p style={{ fontSize: 15, fontWeight: 600, color: "var(--muted-foreground)", margin: "0 0 6px" }}>No subjects yet</p>
            <p style={{ fontSize: 13, color: "var(--muted-foreground)", margin: "0 0 24px" }}>
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
                  style={{ background: "linear-gradient(150deg, #131330 0%, #0f0f24 100%)", border: "1px solid var(--card-border)", borderRadius: 20, padding: "24px", transition: "transform .2s, border-color .2s", display: "flex", flexDirection: "column", gap: 0 }}
                >
                  {/* Icon + name */}
                  <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 16 }}>
                    <div style={{ width: 48, height: 48, borderRadius: 14, background: t.bg, border: `1px solid ${t.border}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <Icon size={22} color={t.text} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 15, fontWeight: 700, color: "var(--foreground)", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.name}</p>
                      <p style={{ fontSize: 12, color: "var(--muted-foreground)", margin: "3px 0 0" }}>
                        {s.lessonCount} lesson{s.lessonCount !== 1 ? "s" : ""}
                      </p>
                    </div>
                  </div>

                  {/* Divider */}
                  <div style={{ height: 1, background: "var(--surface-2)", marginBottom: 16 }} />

                  {/* Actions */}
                  <div style={{ display: "flex", gap: 8 }}>
                    {/* Generate lesson — pre-fills the Learn form */}
                    <Link
                      href={`/learn?subject=${encodeURIComponent(s.name)}`}
                      className="gen-btn"
                      style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "9px 0", borderRadius: 10, background: t.bg, border: `1px solid ${t.border}`, fontSize: 12, fontWeight: 600, color: t.text, textDecoration: "none", transition: "filter .15s", cursor: "pointer" }}
                    >
                      <Sparkles size={14} /> Generate lesson
                    </Link>

                    {/* View lessons for this subject */}
                    <Link
                      href={`/learn/history?subject=${encodeURIComponent(s.name)}`}
                      style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "9px 12px", borderRadius: 10, background: "var(--surface-2)", border: "1px solid var(--card-border)", textDecoration: "none", transition: "filter .15s", cursor: "pointer" }}
                      onMouseEnter={e => (e.currentTarget.style.filter = "brightness(1.15)")}
                      onMouseLeave={e => (e.currentTarget.style.filter = "brightness(1)")}
                    >
                      <ChevronRight size={14} color="var(--muted-foreground)" />
                    </Link>
                    <button
                      type="button"
                      onClick={() => void removeSubject(s)}
                      disabled={Boolean(removingSubject) || Boolean(addingSubject)}
                      aria-label={`Remove ${s.name} from active subjects`}
                      title="Remove from active subjects (keeps existing work)"
                      style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "9px 10px", borderRadius: 10, background: "var(--surface-2)", border: "1px solid var(--card-border)", color: "var(--muted-foreground)", cursor: removingSubject || addingSubject ? "wait" : "pointer", opacity: removingSubject === s.id ? .55 : 1 }}
                    >
                      {removingSubject === s.id ? <span style={{ fontSize: 10 }}>…</span> : <X size={14} />}
                    </button>
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
