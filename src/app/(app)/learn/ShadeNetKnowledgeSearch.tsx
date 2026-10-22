"use client";

import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { BookOpen, Search, Wifi, WifiOff } from "lucide-react";
import { createHttpKnowledgeSource } from "@/lib/shadenet/source-adapters";
import { retrieveKnowledge, type KnowledgeRetrievalResult } from "@/lib/shadenet/retrieval";

const INDEX_URL = process.env.NEXT_PUBLIC_SHADENET_KNOWLEDGE_INDEX_URL?.trim();

function trustLabel(status?: string) {
  switch (status) {
    case "official": return "Official source";
    case "teacher-verified": return "Teacher verified";
    case "community": return "Community contribution";
    case "ai-generated": return "AI-generated";
    default: return "Unverified source";
  }
}

export default function ShadeNetKnowledgeSearch({ subjects }: { subjects: Array<{ id: string; name: string }> }) {
  const [query, setQuery] = useState("");
  const [subject, setSubject] = useState(subjects[0]?.name ?? "");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<KnowledgeRetrievalResult | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!subjects.some((item) => item.name === subject)) setSubject(subjects[0]?.name ?? "");
  }, [subjects, subject]);

  const onlineSource = useMemo(() => {
    if (!INDEX_URL) return undefined;
    try { return createHttpKnowledgeSource({ endpoint: INDEX_URL }); }
    catch { return undefined; }
  }, []);

  async function search(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!query.trim() || !subject || busy) return;
    setBusy(true);
    setError("");
    try {
      const response = await retrieveKnowledge(
        { query: query.trim(), subject: subject.trim() || undefined, limit: 8 },
        { ...(onlineSource ? { online: onlineSource } : {}), perSourceTimeoutMs: 4_000 },
      );
      setResult(response);
      if (!response.results.length) {
        setError(response.unavailable.length
          ? "Some sources did not respond. No matching verified resource was found in the sources that answered."
          : "No matching resource is saved on this device.");
      }
    } catch {
      setError("Search could not complete. Your saved lessons and notes have not been changed.");
    } finally {
      setBusy(false);
    }
  }

  if (subjects.length === 0) return null;

  return (
    <section className="rounded-3xl border border-[var(--card-border)] bg-[var(--surface)] p-5 sm:p-6" aria-labelledby="shadenet-search-title">
      <div className="flex items-start gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[var(--primary-glow)] text-[var(--primary)]">
          <BookOpen size={22} aria-hidden="true" />
        </div>
        <div className="min-w-0 flex-1">
          <h2 id="shadenet-search-title" className="text-lg font-semibold">Knowledge search</h2>
          <p className="mt-1 text-sm leading-5 text-[var(--muted-foreground)]">
            Search saved ShadeNet resources without using AI. When an approved online index is configured, search can also retrieve resources from it.
          </p>
        </div>
      </div>

      <form onSubmit={search} className="mt-5 grid gap-3 sm:grid-cols-[1fr_180px_auto]">
        <label className="sr-only" htmlFor="shadenet-query">Search learning resources</label>
        <input
          id="shadenet-query"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          maxLength={240}
          placeholder="Search a topic, definition, or question"
          className="min-h-11 min-w-0 rounded-xl border border-[var(--card-border)] bg-[var(--surface-2)] px-3 text-sm outline-none focus:ring-2 focus:ring-[var(--primary)]"
          required
        />
        <label className="sr-only" htmlFor="shadenet-subject">Filter by subject</label>
        <select
          id="shadenet-subject"
          value={subject}
          onChange={(event) => { setSubject(event.target.value); setResult(null); setError(""); }}
          className="min-h-11 min-w-0 rounded-xl border border-[var(--card-border)] bg-[var(--surface-2)] px-3 text-sm outline-none focus:ring-2 focus:ring-[var(--primary)]"
          required
        >
          {subjects.map((item) => <option key={item.id} value={item.name}>{item.name}</option>)}
        </select>
        <button
          type="submit"
          disabled={busy || !query.trim() || !subject || subjects.length === 0}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[var(--primary)] px-4 text-sm font-semibold text-[var(--primary-foreground)] disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Search size={16} aria-hidden="true" />
          {busy ? "Searching…" : "Search"}
        </button>
      </form>

      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-[var(--muted-foreground)]">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--surface-2)] px-2.5 py-1">
          <WifiOff size={14} aria-hidden="true" /> Local search, AI not required
        </span>
        {onlineSource ? (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--surface-2)] px-2.5 py-1">
            <Wifi size={14} aria-hidden="true" /> Approved online index configured
          </span>
        ) : (
          <span>Online index not configured</span>
        )}
      </div>

      {error && <p className="mt-4 rounded-xl border border-[var(--card-border)] p-3 text-sm" role="status">{error}</p>}

      {result && result.results.length > 0 && (
        <div className="mt-5 space-y-3" aria-live="polite">
          <p className="text-sm text-[var(--muted-foreground)]">
            {result.results.length} result{result.results.length === 1 ? "" : "s"} · Checked {result.attempted.join(", ")}
          </p>
          {result.results.map(({ resource, source }) => (
            <article key={resource.contentHash} className="rounded-2xl border border-[var(--card-border)] p-4">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="font-semibold">{resource.metadata.title}</h3>
                <span className="rounded-full bg-[var(--surface-2)] px-2 py-0.5 text-xs">{trustLabel(resource.metadata.verificationStatus)}</span>
              </div>
              <p className="mt-1 text-xs text-[var(--muted-foreground)]">
                {[resource.metadata.subject, resource.metadata.qualification, resource.metadata.syllabus, source === "local" ? "On this device" : source === "peer" ? "Shared by a peer" : "Online index"].filter(Boolean).join(" · ")}
              </p>
              <div className="mt-3 whitespace-pre-wrap break-words text-sm leading-6">
                {typeof resource.content === "string" ? resource.content.slice(0, 1800) : (JSON.stringify(resource.content, null, 2) ?? String(resource.content)).slice(0, 1800)}
              </div>
              {resource.metadata.source && (
                <p className="mt-3 break-all text-xs text-[var(--muted-foreground)]">Source: {resource.metadata.source}</p>
              )}
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
