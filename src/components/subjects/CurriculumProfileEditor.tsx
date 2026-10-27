"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { SUBJECT_CATALOG } from "@/lib/subjects/catalog";

type CurriculumLevel =
  | "primary" | "lower_secondary" | "o_level" | "igcse"
  | "as_level" | "a_level" | "vocational" | "technical"
  | "university" | "polytechnic";

type CurriculumIdentity = {
  boardId: string;
  qualificationId: string;
  level: CurriculumLevel;
  syllabusId?: string;
  syllabusVersion?: string;
  subjectId: string;
  subjectName?: string;
  paperOrComponentId?: string;
  examSession?: string;
};

type SubjectOption = { id: string; name: string };

const BOARDS = [
  ["cambridge", "Cambridge International"],
  ["zimsec", "ZIMSEC"],
  ["pearson_edexcel", "Pearson Edexcel"],
  ["ib", "International Baccalaureate"],
  ["aqa", "AQA"],
  ["ocr", "OCR"],
  ["waec", "WAEC"],
  ["custom", "Other / not listed"],
] as const;

const LEVELS: Array<[CurriculumLevel, string]> = [
  ["primary", "Primary"],
  ["lower_secondary", "Lower secondary"],
  ["o_level", "O Level"],
  ["igcse", "IGCSE"],
  ["as_level", "AS Level"],
  ["a_level", "A Level"],
  ["vocational", "Vocational"],
  ["technical", "Technical / TVET"],
  ["university", "University"],
  ["polytechnic", "Polytechnic"],
];

const slug = (value: string) => value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const key = (value: string) => value.trim().toLowerCase().replace(/[^a-z0-9]+/g, " ").replace(/\s+/g, " ");

function subjectIdentity(subject: SubjectOption): string {
  const normalized = key(subject.name);
  return SUBJECT_CATALOG.find(item =>
    key(item.name) === normalized || (item.aliases ?? []).some(alias => key(alias) === normalized)
  )?.id ?? slug(subject.name);
}

const fieldClass = "w-full rounded-xl border border-[var(--card-border)] bg-[var(--background)] px-3 py-2.5 text-sm text-[var(--foreground)] outline-none focus:border-[var(--primary)]";

export function CurriculumProfileEditor({ subjects }: { subjects: SubjectOption[] }) {
  const [identities, setIdentities] = useState<CurriculumIdentity[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, { boardId: string; qualificationId: string; level: CurriculumLevel }>>({});
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const client = createClient();
        const { data: { session } } = await client.auth.getSession();
        if (!session) return;
        const response = await fetch("/api/curriculum/profile", {
          headers: { Authorization: "Bearer " + session.access_token },
        });
        const payload = await response.json();
        if (!response.ok) throw new Error(payload?.error || "Could not load curriculum settings.");
        if (!cancelled) setIdentities(Array.isArray(payload.curriculumSubjects) ? payload.curriculumSubjects : []);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Could not load curriculum settings.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => { cancelled = true; };
  }, []);

  const identityBySubject = useMemo(() => {
    const result = new Map<string, CurriculumIdentity>();
    for (const identity of identities) {
      const identityKey = key(identity.subjectName || identity.subjectId);
      if (identityKey) result.set(identityKey, identity);
    }
    return result;
  }, [identities]);

  const beginEdit = (subject: SubjectOption) => {
    const existing = identityBySubject.get(key(subject.name)) ??
      identities.find(item => key(item.subjectId) === key(subjectIdentity(subject)));
    setDrafts(current => ({
      ...current,
      [subject.id]: {
        boardId: existing?.boardId ?? "cambridge",
        qualificationId: existing?.qualificationId ?? "",
        level: existing?.level ?? "as_level",
      },
    }));
    setEditing(subject.id);
    setError("");
    setNotice("");
  };

  const save = async (subject: SubjectOption) => {
    const draft = drafts[subject.id];
    if (!draft?.boardId || !draft.qualificationId.trim()) {
      setError("Choose an exam board and enter the qualification for this subject.");
      return;
    }
    setSaving(subject.id);
    setError("");
    setNotice("");
    try {
      const client = createClient();
      const { data: { session } } = await client.auth.getSession();
      if (!session) throw new Error("Your session expired. Sign in again.");
      const subjectId = subjectIdentity(subject);
      const previous = identityBySubject.get(key(subject.name)) ??
        identities.find(item => key(item.subjectId) === key(subjectId));
      const nextIdentity: CurriculumIdentity = {
        ...(previous ?? {}),
        boardId: draft.boardId,
        qualificationId: draft.qualificationId.trim(),
        level: draft.level,
        subjectId,
        subjectName: subject.name,
      };
      const next = identities.filter(item =>
        key(item.subjectName || item.subjectId) !== key(subject.name) &&
        key(item.subjectId) !== key(subjectId)
      );
      next.push(nextIdentity);
      const response = await fetch("/api/curriculum/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: "Bearer " + session.access_token },
        body: JSON.stringify({ curriculumSubjects: next }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error || "Could not save curriculum settings.");
      setIdentities(Array.isArray(payload.curriculumSubjects) ? payload.curriculumSubjects : next);
      setEditing(null);
      setNotice(`Saved curriculum context for ${subject.name}. Shadecode will only apply syllabus-specific teaching when a matching verified curriculum exists.`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save curriculum settings.");
    } finally {
      setSaving(null);
    }
  };

  if (loading) return <section className="ssc-card p-5"><p className="text-sm text-[var(--muted-foreground)]">Loading curriculum settings…</p></section>;
  if (!subjects.length) return null;

  return (
    <section aria-labelledby="curriculum-profile-heading" className="ssc-card mb-7 p-5 sm:p-6">
      <div className="mb-4">
        <p className="ssc-kicker">Personalisation</p>
        <h2 id="curriculum-profile-heading" className="text-lg font-semibold">Curriculum for each subject</h2>
        <p className="mt-1 max-w-3xl text-sm leading-6 text-[var(--muted-foreground)]">
          A learner can use different boards and qualifications across subjects. Set the context per subject. This does not claim a syllabus is supported: Cortex uses it only when it can match verified curriculum data.
        </p>
      </div>

      {error && <p role="alert" className="mb-3 rounded-xl border border-[var(--danger)]/30 bg-[var(--danger)]/5 px-3 py-2 text-sm text-[var(--danger)]">{error}</p>}
      {notice && <p role="status" className="mb-3 rounded-xl border border-[var(--primary)]/25 bg-[var(--primary-glow)] px-3 py-2 text-sm text-[var(--foreground)]">{notice}</p>}

      <div className="grid gap-3">
        {subjects.map(subject => {
          const identity = identityBySubject.get(key(subject.name)) ??
            identities.find(item => key(item.subjectId) === key(subjectIdentity(subject)));
          const isEditing = editing === subject.id;
          const draft = drafts[subject.id];
          return (
            <article key={subject.id} className="rounded-xl border border-[var(--card-border)] bg-[var(--surface-2)] p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="font-semibold text-[var(--foreground)]">{subject.name}</h3>
                  <p className="mt-1 text-xs text-[var(--muted-foreground)]">
                    {identity ? `${BOARDS.find(([id]) => id === identity.boardId)?.[1] ?? identity.boardId} · ${identity.qualificationId} · ${LEVELS.find(([id]) => id === identity.level)?.[1] ?? identity.level}` : "Curriculum not configured"}
                  </p>
                </div>
                <button type="button" onClick={() => isEditing ? setEditing(null) : beginEdit(subject)} className="ssc-button-secondary text-sm">
                  {isEditing ? "Cancel" : identity ? "Edit curriculum" : "Set curriculum"}
                </button>
              </div>

              {isEditing && draft && (
                <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  <label className="grid gap-1.5 text-xs font-medium text-[var(--muted-foreground)]">
                    Exam board
                    <select className={fieldClass} value={draft.boardId} onChange={event => setDrafts(current => ({ ...current, [subject.id]: { ...draft, boardId: event.target.value } }))}>
                      {BOARDS.map(([id, label]) => <option key={id} value={id}>{label}</option>)}
                    </select>
                  </label>
                  <label className="grid gap-1.5 text-xs font-medium text-[var(--muted-foreground)]">
                    Qualification
                    <input className={fieldClass} value={draft.qualificationId} onChange={event => setDrafts(current => ({ ...current, [subject.id]: { ...draft, qualificationId: event.target.value } }))} placeholder="e.g. AS & A Level" maxLength={100} />
                  </label>
                  <label className="grid gap-1.5 text-xs font-medium text-[var(--muted-foreground)]">
                    Level
                    <select className={fieldClass} value={draft.level} onChange={event => setDrafts(current => ({ ...current, [subject.id]: { ...draft, level: event.target.value as CurriculumLevel } }))}>
                      {LEVELS.map(([id, label]) => <option key={id} value={id}>{label}</option>)}
                    </select>
                  </label>
                  <div className="sm:col-span-2 lg:col-span-3 flex flex-wrap items-center justify-between gap-3">
                    <p className="max-w-2xl text-xs leading-5 text-[var(--muted-foreground)]">Syllabus code and version are resolved from verified curriculum records where available. If this combination is not verified, the subject remains selectable but syllabus-specific generation may be unavailable.</p>
                    <button type="button" onClick={() => void save(subject)} disabled={saving === subject.id} className="ssc-button">
                      {saving === subject.id ? "Saving…" : "Save curriculum"}
                    </button>
                  </div>
                </div>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}
