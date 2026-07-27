"use client";

import { useEffect, useState, useCallback } from "react";
import { Search, Trash2, Pencil, Check, X, FileText } from "lucide-react";

interface ManagedPaper {
  id: string;
  syllabus_id: string;
  level: string;
  session: string;
  year: number;
  paper_number: number;
  variant: number;
  kind: string;
  syllabi: { subject: string; board: string; levels: string[] } | null;
}

const KIND_LABELS: Record<string, string> = { qp: "QP", ms: "MS", in: "IN", gt: "GT" };

export default function ManagePapersPage() {
  const [search, setSearch] = useState("");
  const [papers, setPapers] = useState<ManagedPaper[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Partial<ManagedPaper>>({});
  const [saving, setSaving] = useState(false);

  const load = useCallback((q: string) => {
    setLoading(true);
    fetch(`/api/admin/exam-hub/papers?search=${encodeURIComponent(q)}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.error) throw new Error(data.error);
        setPapers(data.papers ?? []);
        setError(null);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(""); }, [load]);

  function startEdit(p: ManagedPaper) {
    setEditingId(p.id);
    setDraft({ level: p.level, session: p.session, year: p.year, paper_number: p.paper_number, variant: p.variant, kind: p.kind });
  }

  function cancelEdit() {
    setEditingId(null);
    setDraft({});
  }

  async function saveEdit(id: string) {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/exam-hub/papers/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Update failed");
      setPapers((prev) => prev.map((p) => (p.id === id ? { ...p, ...data.paper } : p)));
      setEditingId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Update failed");
    } finally {
      setSaving(false);
    }
  }

  async function removePaper(id: string) {
    if (!window.confirm("Delete this paper permanently? This removes the file too.")) return;
    const prev = papers;
    setPapers(papers.filter((p) => p.id !== id));
    const res = await fetch(`/api/admin/exam-hub/papers/${id}`, { method: "DELETE" });
    if (!res.ok) {
      setPapers(prev);
      setError("Delete failed");
    }
  }

  return (
    <div style={{ minHeight: "100vh", padding: 24 }}>
      <div style={{ maxWidth: 900, margin: "0 auto" }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, color: "var(--foreground)", marginBottom: 4 }}>
          Manage Papers
        </h1>
        <p style={{ fontSize: 13, color: "var(--muted-foreground)", marginBottom: 20 }}>
          Fix a wrongly-assigned level/session/year, or remove a bad entry entirely.
        </p>

        <div style={{ position: "relative", marginBottom: 20 }}>
          <Search size={16} color="var(--muted-foreground)" style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)" }} />
          <input
            value={search}
            onChange={(e) => { setSearch(e.target.value); load(e.target.value); }}
            placeholder="Search by syllabus code (e.g. 9702)"
            style={{ width: "100%", padding: "12px 40px", borderRadius: 12, background: "var(--surface-2)", border: "1px solid var(--card-border)", color: "var(--foreground)", fontSize: 14 }}
          />
        </div>

        {error && (
          <div style={{ padding: 14, borderRadius: 12, background: "var(--danger-soft)", border: "1px solid color-mix(in srgb, var(--danger) 24%, transparent)", marginBottom: 16 }}>
            <p style={{ color: "var(--danger)", margin: 0, fontSize: 13 }}>{error}</p>
          </div>
        )}

        {loading ? (
          <div style={{ height: 200, borderRadius: 14, background: "var(--surface-2)" }} />
        ) : papers.length === 0 ? (
          <div style={{ padding: 40, borderRadius: 18, background: "var(--surface-2)", border: "1px solid var(--card-border)", textAlign: "center" }}>
            <FileText size={28} color="var(--muted-foreground)" style={{ margin: "0 auto 10px" }} />
            <p style={{ fontSize: 13, color: "var(--muted-foreground)", margin: 0 }}>No papers found.</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {papers.map((p) => {
              const isEditing = editingId === p.id;
              return (
                <div key={p.id} style={{ padding: 14, borderRadius: 12, background: "var(--surface-2)", border: "1px solid var(--card-border)" }}>
                  <div style={{ fontSize: 12, color: "var(--muted-foreground)", marginBottom: 8 }}>
                    {p.syllabi?.subject ?? p.syllabus_id} ({p.syllabi?.board}) · {p.syllabus_id}
                  </div>

                  {isEditing ? (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "flex-end" }}>
                      <MiniField label="Level">
                        <input value={draft.level ?? ""} onChange={(e) => setDraft({ ...draft, level: e.target.value })} style={{ ...miniInput, width: 130 }} />
                      </MiniField>
                      <MiniField label="Session">
                        <input value={draft.session ?? ""} onChange={(e) => setDraft({ ...draft, session: e.target.value })} style={{ ...miniInput, width: 100 }} />
                      </MiniField>
                      <MiniField label="Year">
                        <input type="number" value={draft.year ?? ""} onChange={(e) => setDraft({ ...draft, year: Number(e.target.value) })} style={{ ...miniInput, width: 70 }} />
                      </MiniField>
                      <MiniField label="Paper #">
                        <input type="number" value={draft.paper_number ?? ""} onChange={(e) => setDraft({ ...draft, paper_number: Number(e.target.value) })} style={{ ...miniInput, width: 60 }} />
                      </MiniField>
                      <MiniField label="Variant">
                        <input type="number" value={draft.variant ?? ""} onChange={(e) => setDraft({ ...draft, variant: Number(e.target.value) })} style={{ ...miniInput, width: 60 }} />
                      </MiniField>
                      <MiniField label="Kind">
                        <select value={draft.kind ?? ""} onChange={(e) => setDraft({ ...draft, kind: e.target.value })} style={miniInput}>
                          {Object.entries(KIND_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                        </select>
                      </MiniField>
                      <button onClick={() => saveEdit(p.id)} disabled={saving} style={iconBtn("var(--accent)")}><Check size={14} /></button>
                      <button onClick={cancelEdit} style={iconBtn("var(--muted-foreground)")}><X size={14} /></button>
                    </div>
                  ) : (
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <div style={{ fontSize: 13, color: "var(--foreground)", fontWeight: 600 }}>
                        {p.level} · {p.session} {p.year} · Paper {p.paper_number}/{p.variant} · {KIND_LABELS[p.kind] ?? p.kind}
                      </div>
                      <div style={{ display: "flex", gap: 6 }}>
                        <button onClick={() => startEdit(p)} style={iconBtn("var(--primary)")}><Pencil size={14} /></button>
                        <button onClick={() => removePaper(p.id)} style={iconBtn("var(--danger)")}><Trash2 size={14} /></button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function MiniField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={{ display: "block", fontSize: 10, color: "var(--muted-foreground)", marginBottom: 3 }}>{label}</label>
      {children}
    </div>
  );
}

function iconBtn(color: string): React.CSSProperties {
  return {
    display: "flex", alignItems: "center", justifyContent: "center", width: 32, height: 32, borderRadius: 8,
    background: `color-mix(in srgb, ${color} 12%, transparent)`, border: `1px solid color-mix(in srgb, ${color} 28%, transparent)`,
    color, cursor: "pointer",
  };
}

const miniInput: React.CSSProperties = {
  padding: "7px 8px", borderRadius: 8, background: "var(--surface)", border: "1px solid var(--card-border)",
  color: "var(--foreground)", fontSize: 12, height: 32, boxSizing: "border-box",
};
