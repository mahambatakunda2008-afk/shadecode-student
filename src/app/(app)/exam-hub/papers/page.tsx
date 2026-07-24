"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { ChevronRight, FileText, Bookmark, BookmarkCheck, CheckCircle2 } from "lucide-react";
import type { PastPaperWithState, Syllabus, PaperKind } from "@/lib/exam-hub/types";
import { PAPER_KIND_LABELS } from "@/lib/exam-hub/types";

interface Facets {
  levels: string[];
  sessions: string[];
  years: number[];
}

export default function PastPapersPage() {
  const [syllabi, setSyllabi] = useState<Syllabus[]>([]);
  const [loadingSyllabi, setLoadingSyllabi] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [board, setBoard] = useState<string | null>(null);
  const [level, setLevel] = useState<string | null>(null);
  const [syllabusId, setSyllabusId] = useState<string | null>(null);
  const [session, setSession] = useState<string | null>(null);
  const [year, setYear] = useState<number | null>(null);

  const [facets, setFacets] = useState<Facets | null>(null);
  const [loadingFacets, setLoadingFacets] = useState(false);

  const [papers, setPapers] = useState<PastPaperWithState[]>([]);
  const [loadingPapers, setLoadingPapers] = useState(false);

  useEffect(() => {
    fetch("/api/exam-hub/syllabi")
      .then((res) => res.json())
      .then((data) => setSyllabi(data.syllabi ?? []))
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load subjects"))
      .finally(() => setLoadingSyllabi(false));
  }, []);

  const loadFacets = useCallback((sId: string, lvl: string | null, sess: string | null) => {
    setLoadingFacets(true);
    setError(null);
    const params = new URLSearchParams({ syllabus: sId });
    if (lvl) params.set("level", lvl);
    if (sess) params.set("session", sess);

    fetch(`/api/exam-hub/papers?${params}`)
      .then((res) => res.json())
      .then((data) => setFacets(data.facets ?? null))
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load filters"))
      .finally(() => setLoadingFacets(false));
  }, []);

  const loadPapers = useCallback(
    (sId: string, lvl: string, sess: string, yr: number) => {
      setLoadingPapers(true);
      setError(null);
      const params = new URLSearchParams({
        syllabus: sId,
        level: lvl,
        session: sess,
        year: String(yr),
      });

      fetch(`/api/exam-hub/papers?${params}`)
        .then((res) => res.json())
        .then((data) => setPapers(data.papers ?? []))
        .catch((err) => setError(err instanceof Error ? err.message : "Failed to load papers"))
        .finally(() => setLoadingPapers(false));
    },
    []
  );

  function selectBoard(b: string) {
    setBoard(b);
    setLevel(null);
    setSyllabusId(null);
    setSession(null);
    setYear(null);
    setPapers([]);
  }

  function selectLevel(lvl: string) {
    setLevel(lvl);
    setSyllabusId(null);
    setSession(null);
    setYear(null);
    setPapers([]);
  }

  function selectSyllabus(id: string) {
    if (!level) return;
    setSyllabusId(id);
    setSession(null);
    setYear(null);
    setPapers([]);
    loadFacets(id, level, null);
  }

  function selectSession(sess: string) {
    if (!syllabusId || !level) return;
    setSession(sess);
    setYear(null);
    setPapers([]);
    loadFacets(syllabusId, level, sess);
  }

  function selectYear(yr: number) {
    if (!syllabusId || !level || !session) return;
    setYear(yr);
    loadPapers(syllabusId, level, session, yr);
  }

  function resetTo(crumbIndex: number) {
    // crumbs: [0]="Past Papers" -> board step, [1]=board -> level step,
    // [2]=level -> subject step, [3]=subject -> session step, [4]=session -> year step
    if (crumbIndex <= 0) {
      setBoard(null);
      setLevel(null);
      setSyllabusId(null);
      setSession(null);
      setYear(null);
      setPapers([]);
    } else if (crumbIndex === 1) {
      setLevel(null);
      setSyllabusId(null);
      setSession(null);
      setYear(null);
      setPapers([]);
    } else if (crumbIndex === 2) {
      setSyllabusId(null);
      setSession(null);
      setYear(null);
      setPapers([]);
    } else if (crumbIndex === 3) {
      setSession(null);
      setYear(null);
      setPapers([]);
      if (syllabusId && level) loadFacets(syllabusId, level, null);
    } else if (crumbIndex === 4) {
      setYear(null);
      setPapers([]);
    }
  }

  const boards = [...new Set(syllabi.map((s) => s.board))].sort();
  const levelsForBoard = board
    ? [...new Set(syllabi.filter((s) => s.board === board).flatMap((s) => s.levels))].sort()
    : [];
  const subjectsForLevel =
    board && level ? syllabi.filter((s) => s.board === board && s.levels.includes(level)) : [];
  const selectedSyllabus = syllabi.find((s) => s.id === syllabusId) ?? null;

  return (
    <div style={{ minHeight: "100vh", padding: 24 }}>
      <div style={{ maxWidth: 1000, margin: "0 auto" }}>
        <Breadcrumb
          board={board}
          level={level}
          subject={selectedSyllabus?.subject ?? null}
          session={session}
          year={year}
          onReset={resetTo}
        />

        {error && (
          <div
            style={{
              padding: 16,
              borderRadius: 14,
              background: "var(--danger-soft)",
              border: "1px solid color-mix(in srgb, var(--danger) 24%, transparent)",
              marginBottom: 20,
            }}
          >
            <p style={{ color: "var(--danger)", margin: 0, fontSize: 13 }}>{error}</p>
          </div>
        )}

        {/* Step 0: Exam board */}
        {!board && (
          <Step title="Choose an exam board" loading={loadingSyllabi}>
            {boards.length === 0 && !loadingSyllabi ? (
              <EmptyState message="No exam boards available yet. Check back soon." />
            ) : (
              <Grid>
                {boards.map((b) => (
                  <OptionCard key={b} label={b} onClick={() => selectBoard(b)} />
                ))}
              </Grid>
            )}
          </Step>
        )}

        {/* Step 1: Level */}
        {board && !level && (
          <Step title="Choose a level" loading={loadingSyllabi}>
            {levelsForBoard.length === 0 && !loadingSyllabi ? (
              <EmptyState message="No levels available yet for this board. Check back soon." />
            ) : (
              <Grid>
                {levelsForBoard.map((lvl) => (
                  <OptionCard key={lvl} label={lvl} onClick={() => selectLevel(lvl)} />
                ))}
              </Grid>
            )}
          </Step>
        )}

        {/* Step 2: Subject */}
        {board && level && !syllabusId && (
          <Step title="Choose a subject" loading={loadingSyllabi}>
            {subjectsForLevel.length === 0 && !loadingSyllabi ? (
              <EmptyState message="No subjects available yet for this level. Check back soon." />
            ) : (
              <Grid>
                {subjectsForLevel.map((s) => (
                  <OptionCard key={s.id} label={s.subject} onClick={() => selectSyllabus(s.id)} />
                ))}
              </Grid>
            )}
          </Step>
        )}

        {/* Step 3: Session */}
        {syllabusId && !session && (
          <Step title="Choose a session" loading={loadingFacets}>
            {facets && facets.sessions.length === 0 && !loadingFacets ? (
              <EmptyState message="No papers uploaded for this subject yet." />
            ) : (
              <Grid>
                {facets?.sessions.map((sess) => (
                  <OptionCard key={sess} label={sess} onClick={() => selectSession(sess)} />
                ))}
              </Grid>
            )}
          </Step>
        )}

        {/* Step 4: Year */}
        {syllabusId && session && !year && (
          <Step title="Choose a year" loading={loadingFacets}>
            <Grid>
              {facets?.years.map((yr) => (
                <OptionCard key={yr} label={String(yr)} onClick={() => selectYear(yr)} />
              ))}
            </Grid>
          </Step>
        )}

        {/* Step 5: Papers */}
        {syllabusId && session && year && (
          <Step title={`${session} ${year} papers`} loading={loadingPapers}>
            {papers.length === 0 && !loadingPapers ? (
              <EmptyState message="No papers uploaded for this session yet." />
            ) : (
              <PapersList papers={papers} />
            )}
          </Step>
        )}
      </div>
    </div>
  );
}

/* ── Sub-components ───────────────────────────────────────────────────── */

function Breadcrumb({
  board,
  level,
  subject,
  session,
  year,
  onReset,
}: {
  board: string | null;
  level: string | null;
  subject: string | null;
  session: string | null;
  year: number | null;
  onReset: (toIndex: number) => void;
}) {
  const crumbs = ["Past Papers", board, level, subject, session, year ? String(year) : null].filter(
    Boolean
  ) as string[];

  return (
    <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 6, marginBottom: 24 }}>
      {crumbs.map((crumb, i) => {
        const isLast = i === crumbs.length - 1;
        return (
          <span key={i} style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <button
              onClick={() => !isLast && onReset(i)}
              disabled={isLast}
              style={{
                background: "none",
                border: "none",
                padding: 0,
                cursor: isLast ? "default" : "pointer",
                fontSize: isLast ? 22 : 14,
                fontWeight: isLast ? 700 : 500,
                color: isLast ? "var(--foreground)" : "var(--muted-foreground)",
              }}
            >
              {crumb}
            </button>
            {!isLast && <ChevronRight size={14} color="var(--muted-foreground)" />}
          </span>
        );
      })}
    </div>
  );
}

function Step({
  title,
  loading,
  children,
}: {
  title: string;
  loading: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <h2 style={{ fontSize: 15, fontWeight: 600, color: "var(--foreground)", marginBottom: 14 }}>
        {title}
      </h2>
      {loading ? (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 12 }}>
          {[...Array(4)].map((_, i) => (
            <div key={i} style={{ height: 64, borderRadius: 14, background: "var(--surface-2)" }} />
          ))}
        </div>
      ) : (
        children
      )}
    </div>
  );
}

function Grid({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 12 }}>
      {children}
    </div>
  );
}

function OptionCard({ label, sub, onClick }: { label: string; sub?: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "16px 18px",
        borderRadius: 14,
        background: "var(--surface-2)",
        border: "1px solid var(--card-border)",
        textAlign: "left",
        cursor: "pointer",
        color: "var(--foreground)",
        fontSize: 14,
        fontWeight: 600,
      }}
    >
      {label}
      {sub && (
        <div style={{ fontSize: 12, fontWeight: 400, color: "var(--muted-foreground)", marginTop: 2 }}>
          {sub}
        </div>
      )}
    </button>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div
      style={{
        padding: 40,
        borderRadius: 18,
        background: "var(--surface-2)",
        border: "1px solid var(--card-border)",
        textAlign: "center",
      }}
    >
      <FileText size={32} color="var(--muted-foreground)" style={{ margin: "0 auto 12px" }} />
      <p style={{ fontSize: 14, color: "var(--muted-foreground)", margin: 0 }}>{message}</p>
    </div>
  );
}

function PapersList({ papers }: { papers: PastPaperWithState[] }) {
  // Group by paper_number + variant so qp/ms/in/gt for the same paper sit together
  const grouped = new Map<string, PastPaperWithState[]>();
  for (const p of papers) {
    const key = `${p.paper_number}-${p.variant}`;
    grouped.set(key, [...(grouped.get(key) ?? []), p]);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {[...grouped.entries()].map(([key, group]) => {
        const [paperNumber, variant] = key.split("-");
        const qp = group.find((g) => g.kind === "qp");
        return (
          <div
            key={key}
            style={{
              padding: 16,
              borderRadius: 14,
              background: "var(--surface-2)",
              border: "1px solid var(--card-border)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
              flexWrap: "wrap",
            }}
          >
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, color: "var(--foreground)" }}>
                Paper {paperNumber} / {variant}
              </div>
              <div style={{ fontSize: 12, color: "var(--muted-foreground)", marginTop: 2 }}>
                {qp?.state?.status === "completed" && "Completed"}
                {qp?.state?.status === "in_progress" && "In progress"}
                {(!qp?.state || qp.state.status === "not_started") && "Not started"}
              </div>
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {group.map((doc) => (
                <Link
                  key={doc.id}
                  href={`/exam-hub/papers/${doc.id}`}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "8px 12px",
                    borderRadius: 10,
                    background: "var(--surface)",
                    border: "1px solid var(--card-border)",
                    color: "var(--foreground)",
                    fontSize: 12,
                    fontWeight: 500,
                    textDecoration: "none",
                  }}
                >
                  {doc.state?.status === "completed" ? (
                    <CheckCircle2 size={13} color="var(--accent)" />
                  ) : doc.state?.bookmarked ? (
                    <BookmarkCheck size={13} color="var(--warning)" />
                  ) : (
                    <Bookmark size={13} color="var(--muted-foreground)" />
                  )}
                  {PAPER_KIND_LABELS[doc.kind as PaperKind]}
                </Link>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
