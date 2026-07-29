"use client";

import { useEffect, useState, useCallback } from "react";
import { Globe, Plus, Trash2, Check, X, Pencil } from "lucide-react";

interface Board {
  id: string;
  name: string;
  is_global: boolean;
  countries: string[];
}

export default function ManageBoardsPage() {
  const [boards, setBoards] = useState<Board[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<{ name: string; is_global: boolean; countries: string }>({ name: "", is_global: false, countries: "" });

  const [showAdd, setShowAdd] = useState(false);
  const [newId, setNewId] = useState("");
  const [newName, setNewName] = useState("");
  const [newGlobal, setNewGlobal] = useState(false);
  const [newCountries, setNewCountries] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    fetch("/api/admin/exam-hub/boards")
      .then((res) => res.json())
      .then((data) => {
        if (data.error) throw new Error(data.error);
        setBoards(data.boards ?? []);
        setError(null);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  function startEdit(b: Board) {
    setEditingId(b.id);
    setDraft({ name: b.name, is_global: b.is_global, countries: b.countries.join(", ") });
  }

  async function saveEdit(id: string) {
    setSubmitting(true);
    try {
      const res = await fetch(`/api/admin/exam-hub/boards/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: draft.name,
          is_global: draft.is_global,
          countries: draft.countries.split(",").map((c) => c.trim()).filter(Boolean),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Update failed");
      setBoards((prev) => prev.map((b) => (b.id === id ? data.board : b)));
      setEditingId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Update failed");
    } finally {
      setSubmitting(false);
    }
  }

  async function addBoard(e: React.FormEvent) {
    e.preventDefault();
    if (!newId.trim() || !newName.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/exam-hub/boards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: newId,
          name: newName,
          is_global: newGlobal,
          countries: newCountries.split(",").map((c) => c.trim()).filter(Boolean),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to add board");
      setBoards((prev) => [...prev, data.board].sort((a, b) => a.id.localeCompare(b.id)));
      setNewId(""); setNewName(""); setNewGlobal(false); setNewCountries("");
      setShowAdd(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add board");
    } finally {
      setSubmitting(false);
    }
  }

  async function removeBoard(id: string) {
    if (!window.confirm(`Remove ${id}? Subjects under this board will stop appearing to students until it's re-added.`)) return;
    const prev = boards;
    setBoards(boards.filter((b) => b.id !== id));
    const res = await fetch(`/api/admin/exam-hub/boards/${id}`, { method: "DELETE" });
    if (!res.ok) { setBoards(prev); setError("Delete failed"); }
  }

  return (
    <div style={{ minHeight: "100vh", padding: 24 }}>
      <div style={{ maxWidth: 700, margin: "0 auto" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: "var(--foreground)", margin: 0 }}>
            Exam Boards
          </h1>
          <button
            onClick={() => setShowAdd(!showAdd)}
            style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", borderRadius: 10, background: "var(--primary)", color: "var(--primary-foreground)", border: "none", fontSize: 12, fontWeight: 600, cursor: "pointer" }}
          >
            <Plus size={14} /> Add board
          </button>
        </div>
        <p style={{ fontSize: 13, color: "var(--muted-foreground)", marginBottom: 20 }}>
          Controls which boards students see when browsing, based on their detected country. Global
          boards (like CAIE) show everywhere; others only show in the listed countries. Doesn&apos;t
          affect uploading or contributing — admins and contributors always see every board.
        </p>

        {error && (
          <div style={{ padding: 14, borderRadius: 12, background: "var(--danger-soft)", border: "1px solid color-mix(in srgb, var(--danger) 24%, transparent)", marginBottom: 16 }}>
            <p style={{ color: "var(--danger)", margin: 0, fontSize: 13 }}>{error}</p>
          </div>
        )}

        {showAdd && (
          <form onSubmit={addBoard} style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "flex-end", padding: 14, borderRadius: 12, background: "var(--surface-2)", border: "1px solid var(--card-border)", marginBottom: 16 }}>
            <MiniField label="Code (e.g. WAEC)"><input value={newId} onChange={(e) => setNewId(e.target.value)} style={{ ...miniInput, width: 100 }} /></MiniField>
            <MiniField label="Full name"><input value={newName} onChange={(e) => setNewName(e.target.value)} style={{ ...miniInput, width: 220 }} /></MiniField>
            <MiniField label="Countries (comma-separated ISO codes)">
              <input value={newCountries} onChange={(e) => setNewCountries(e.target.value)} placeholder="NG, GH" disabled={newGlobal} style={{ ...miniInput, width: 160, opacity: newGlobal ? 0.5 : 1 }} />
            </MiniField>
            <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--foreground)", height: 32 }}>
              <input type="checkbox" checked={newGlobal} onChange={(e) => setNewGlobal(e.target.checked)} /> Global
            </label>
            <button type="submit" disabled={submitting} style={iconBtn("var(--accent)")}><Check size={14} /></button>
          </form>
        )}

        {loading ? (
          <div style={{ height: 120, borderRadius: 14, background: "var(--surface-2)" }} />
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {boards.map((b) => {
              const isEditing = editingId === b.id;
              return (
                <div key={b.id} style={{ padding: 14, borderRadius: 12, background: "var(--surface-2)", border: "1px solid var(--card-border)" }}>
                  {isEditing ? (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "flex-end" }}>
                      <MiniField label="Name"><input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} style={{ ...miniInput, width: 220 }} /></MiniField>
                      <MiniField label="Countries">
                        <input value={draft.countries} onChange={(e) => setDraft({ ...draft, countries: e.target.value })} disabled={draft.is_global} style={{ ...miniInput, width: 160, opacity: draft.is_global ? 0.5 : 1 }} />
                      </MiniField>
                      <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--foreground)", height: 32 }}>
                        <input type="checkbox" checked={draft.is_global} onChange={(e) => setDraft({ ...draft, is_global: e.target.checked })} /> Global
                      </label>
                      <button onClick={() => saveEdit(b.id)} disabled={submitting} style={iconBtn("var(--accent)")}><Check size={14} /></button>
                      <button onClick={() => setEditingId(null)} style={iconBtn("var(--muted-foreground)")}><X size={14} /></button>
                    </div>
                  ) : (
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <div>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <span style={{ fontSize: 13, fontWeight: 700, color: "var(--foreground)" }}>{b.id}</span>
                          <span style={{ fontSize: 12, color: "var(--muted-foreground)" }}>{b.name}</span>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 4 }}>
                          <Globe size={12} color={b.is_global ? "var(--accent)" : "var(--muted-foreground)"} />
                          <span style={{ fontSize: 12, color: b.is_global ? "var(--accent)" : "var(--muted-foreground)" }}>
                            {b.is_global ? "Global — visible everywhere" : b.countries.length > 0 ? b.countries.join(", ") : "No countries set — hidden from browse"}
                          </span>
                        </div>
                      </div>
                      <div style={{ display: "flex", gap: 6 }}>
                        <button onClick={() => startEdit(b)} style={iconBtn("var(--primary)")}><Pencil size={14} /></button>
                        <button onClick={() => removeBoard(b.id)} style={iconBtn("var(--danger)")}><Trash2 size={14} /></button>
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
  color: "var(--foreground)", fontSize: 12, height: 32, boxSizing: "border-box", width: "100%",
};
