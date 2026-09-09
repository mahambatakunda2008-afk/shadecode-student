"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, GraduationCap, Loader2, Plus, Trash2 } from "lucide-react";

type CurriculumIdentity = {
  boardId: string;
  qualificationId: string;
  level: string;
  syllabusId: string;
  syllabusVersion: string;
  subjectId: string;
  paperOrComponentId?: string;
  examSession?: string;
};

const BOARDS = [
  { id: "zimsec", label: "ZIMSEC" },
  { id: "cambridge", label: "Cambridge International" },
  { id: "pearson-edexcel", label: "Pearson Edexcel" },
  { id: "ib", label: "IB" },
  { id: "other", label: "Other / not listed" },
];

const LEVELS = [
  ["primary", "Primary"],
  ["lower_secondary", "Lower Secondary"],
  ["o_level", "O Level"],
  ["igcse", "IGCSE"],
  ["as_level", "AS Level"],
  ["a_level", "A Level"],
  ["vocational", "Vocational"],
  ["technical", "Technical"],
  ["polytechnic", "Polytechnic"],
  ["university", "University"],
] as const;

const EMPTY: CurriculumIdentity = {
  boardId: "",
  qualificationId: "",
  level: "",
  syllabusId: "",
  syllabusVersion: "",
  subjectId: "",
};

function slug(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export function CurriculumProfileCard() {
  const [items, setItems] = useState<CurriculumIdentity[]>([]);
  const [draft, setDraft] = useState<CurriculumIdentity>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetch("/api/curriculum/profile", { cache: "no-store" })
      .then(async (r) => r.ok ? r.json() : Promise.reject(new Error("Unable to load curriculum profile")))
      .then((data) => setItems(Array.isArray(data.curriculumSubjects) ? data.curriculumSubjects : []))
      .catch(() => setMessage("We couldn't load your curriculum profile. Refresh and try again."))
      .finally(() => setLoading(false));
  }, []);

  const canAdd = useMemo(() => {
    return [draft.boardId, draft.qualificationId, draft.level, draft.syllabusId, draft.syllabusVersion, draft.subjectId].every(Boolean);
  }, [draft]);

  const update = (key: keyof CurriculumIdentity, value: string) => {
    setDraft((current) => ({ ...current, [key]: value }));
    setMessage("");
  };

  const add = () => {
    if (!canAdd) return;
    const normalized = {
      ...draft,
      boardId: slug(draft.boardId),
      qualificationId: slug(draft.qualificationId),
      syllabusId: slug(draft.syllabusId),
      subjectId: slug(draft.subjectId),
    };
    setItems((current) => current.some((item) => JSON.stringify(item) === JSON.stringify(normalized)) ? current : [...current, normalized]);
    setDraft(EMPTY);
  };

  const remove = (index: number) => setItems((current) => current.filter((_, i) => i !== index));

  const save = async () => {
    setSaving(true);
    setMessage("");
    try {
      const response = await fetch("/api/curriculum/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ curriculumSubjects: items }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to save curriculum profile");
      setItems(data.curriculumSubjects ?? items);
      setMessage("Curriculum profile saved.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Failed to save curriculum profile.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="ssc-card p-5">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--primary-glow)] text-[var(--primary)]">
            <GraduationCap size={22} />
          </div>
          <div>
            <h2>Curriculum & exam board</h2>
            <p className="text-sm text-[var(--muted-foreground)]">Tell Shadecode exactly what curriculum you study. We won't guess.</p>
          </div>
        </div>
        <span className="rounded-full bg-[var(--surface-2)] px-3 py-1 text-xs font-semibold text-[var(--muted-foreground)]">Used across Student</span>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 py-6 text-sm text-[var(--muted-foreground)]"><Loader2 size={16} className="animate-spin" /> Loading curriculum profile...</div>
      ) : (
        <>
          {items.length > 0 && (
            <div className="mb-4 grid gap-2">
              {items.map((item, index) => (
                <div key={`${item.boardId}-${item.syllabusId}-${item.subjectId}-${index}`} className="flex items-center justify-between gap-3 rounded-2xl border border-[var(--card-border)] bg-[var(--surface-2)] p-3">
                  <div className="min-w-0">
                    <p className="truncate font-semibold">{item.subjectId.replace(/-/g, " ")}</p>
                    <p className="text-xs text-[var(--muted-foreground)]">{item.boardId} · {item.qualificationId} · {item.syllabusId} · {item.syllabusVersion}</p>
                  </div>
                  <button type="button" onClick={() => remove(index)} aria-label="Remove curriculum" className="rounded-xl p-2 text-[var(--muted-foreground)] hover:text-[var(--danger)]"><Trash2 size={16} /></button>
                </div>
              ))}
            </div>
          )}

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <label className="grid gap-2"><span className="ssc-label">Exam board</span><select value={draft.boardId} onChange={(e) => update("boardId", e.target.value)} className="ssc-input"><option value="">Select board</option>{BOARDS.map((board) => <option key={board.id} value={board.id}>{board.label}</option>)}</select></label>
            <label className="grid gap-2"><span className="ssc-label">Qualification</span><input value={draft.qualificationId} onChange={(e) => update("qualificationId", e.target.value)} placeholder="e.g. ZIMSEC O Level" className="ssc-input" /></label>
            <label className="grid gap-2"><span className="ssc-label">Level</span><select value={draft.level} onChange={(e) => update("level", e.target.value)} className="ssc-input"><option value="">Select level</option>{LEVELS.map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select></label>
            <label className="grid gap-2"><span className="ssc-label">Syllabus / subject code</span><input value={draft.syllabusId} onChange={(e) => update("syllabusId", e.target.value)} placeholder="e.g. 4021" className="ssc-input" /></label>
            <label className="grid gap-2"><span className="ssc-label">Syllabus version</span><input value={draft.syllabusVersion} onChange={(e) => update("syllabusVersion", e.target.value)} placeholder="e.g. 2024-2030" className="ssc-input" /></label>
            <label className="grid gap-2"><span className="ssc-label">Subject</span><input value={draft.subjectId} onChange={(e) => update("subjectId", e.target.value)} placeholder="e.g. Computer Science" className="ssc-input" /></label>
            <label className="grid gap-2"><span className="ssc-label">Paper / component <span className="font-normal opacity-70">optional</span></span><input value={draft.paperOrComponentId ?? ""} onChange={(e) => update("paperOrComponentId", e.target.value)} placeholder="e.g. 01, 02, 03" className="ssc-input" /></label>
            <label className="grid gap-2"><span className="ssc-label">Exam session <span className="font-normal opacity-70">optional</span></span><input value={draft.examSession ?? ""} onChange={(e) => update("examSession", e.target.value)} placeholder="e.g. May/June 2027" className="ssc-input" /></label>
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <p className="max-w-2xl text-xs leading-5 text-[var(--muted-foreground)]">If your board or syllabus isn't listed, enter what your school or exam board gives you. Shadecode will keep it unverified until its official curriculum source has been checked.</p>
            <div className="flex gap-2">
              <button type="button" onClick={add} disabled={!canAdd} className="ssc-button"><Plus size={17} /> Add subject</button>
              <button type="button" onClick={save} disabled={saving} className="ssc-button">{saving ? <Loader2 size={17} className="animate-spin" /> : <Check size={17} />}{saving ? "Saving" : "Save curriculum"}</button>
            </div>
          </div>
          {message && <p className="mt-3 text-sm text-[var(--muted-foreground)]">{message}</p>}
        </>
      )}
    </section>
  );
}
