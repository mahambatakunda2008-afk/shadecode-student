"use client";

import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { BookOpen, Search, Wifi, WifiOff } from "lucide-react";
import { retrieveKnowledge, type KnowledgeRetrievalResult } from "@/lib/shadenet/retrieval";
import type { ShadeNetResource } from "@/lib/shadenet/content";

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
  const [readingUrl, setReadingUrl] = useState<string | null>(null);
  const [result, setResult] = useState<KnowledgeRetrievalResult | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!subjects.some((item) => item.name === subject)) setSubject(subjects[0]?.name ?? "");
  }, [subjects, subject]);

  async function search(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!query.trim() || !subject || busy) return;
    setBusy(true);
    setError("");
    try {
      const knowledgeQuery = { query: query.trim(), subject: subject.trim(), limit: 8 };
      const local = await retrieveKnowledge(knowledgeQuery, { perSourceTimeoutMs: 2_000 });
      const attempted = [...local.attempted];
      const unavailable = [...local.unavailable];
      const results = [...local.results];

      if (typeof navigator === "undefined" || navigator.onLine) {
        attempted.push("online");
        try {
          const response = await fetch("/api/shadenet/web-search", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify(knowledgeQuery),
            cache: "no-store",
          });
          const payload = await response.json().catch(() => ({})) as { resources?: ShadeNetResource[]; error?: string };
          if (!response.ok) {
            if (response.status !== 503 || !payload.error?.includes("not configured")) unavailable.push("online");
            if (!results.length) setError(payload.error ?? "Open web search is temporarily unavailable.");
          } else if (Array.isArray(payload.resources)) {
            const seen = new Set(results.map((item) => item.resource.contentHash));
            for (const resource of payload.resources) {
              if (resource?.contentHash && !seen.has(resource.contentHash)) {
                seen.add(resource.contentHash);
                results.push({ resource, source: "online" });
              }
            }
          }
        } catch {
          unavailable.push("online");
          if (!results.length) setError("Internet search could not connect. Your saved resources are still available offline.");
        }
      } else if (!results.length) {
        setError("You are offline. Search your downloaded and saved ShadeNet resources.");
      }

      setResult({ results: results.slice(0, 12), attempted, unavailable });
      if (!results.length && !error) setError("No matching resources were found in the available sources.");
    } catch {
      setError("Search could not complete. Your saved lessons and notes have not been changed.");
    } finally {
      setBusy(false);
    }
  }

  async function readSource(url: string) {
    if (!subject || readingUrl) return;
    setReadingUrl(url);
    setError("");
    try {
      const response = await fetch("/api/shadenet/read-document", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ url, subject }),
        cache: "no-store",
      });
      const payload = await response.json().catch(() => ({})) as { resource?: ShadeNetResource; error?: string };
      if (!response.ok || !payload.resource) throw new Error(payload.error ?? "Could not read this source.");
      setResult((current) => current ? {
        ...current,
        results: [
          { resource: payload.resource!, source: "online" },
          ...current.results.filter((item) => item.resource.metadata.source !== url),
        ].slice(0, 12),
      } : current);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not read this source.");
    } finally {
      setReadingUrl(null);
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
            Search saved learning resources and the open web. Results retain their source links and are not treated as verified curriculum material.
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
          disabled={busy || !query.trim() || !subject}
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
        <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--surface-2)] px-2.5 py-1">
          <Wifi size={14} aria-hidden="true" /> Open web search when configured
        </span>
      </div>

      {error && <p className="mt-4 rounded-xl border border-[var(--card-border)] p-3 text-sm" role="status">{error}</p>}

      {result && result.results.length > 0 && (
        <div className="mt-5 space-y-3" aria-live="polite">
          <p className="text-sm text-[var(--muted-foreground)]">
            {result.results.length} result{result.results.length === 1 ? "" : "s"} · Checked {result.attempted.join(", ")}
          </p>
          {result.results.map(({ resource, source }) => {
            const webContent = resource.content && typeof resource.content === "object"
              ? resource.content as { snippet?: unknown; pageText?: unknown; extraction?: unknown; text?: unknown; documentType?: unknown; pageCount?: unknown }
              : null;
            const excerpt = typeof webContent?.text === "string" && webContent.text.trim()
              ? webContent.text
              : typeof webContent?.pageText === "string" && webContent.pageText.trim()
                ? webContent.pageText
              : typeof webContent?.snippet === "string"
                ? webContent.snippet
              : typeof resource.content === "string"
                ? resource.content
                : JSON.stringify(resource.content, null, 2) ?? String(resource.content);
            return (
              <article key={resource.contentHash} className="rounded-2xl border border-[var(--card-border)] p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-semibold">{resource.metadata.title}</h3>
                  <span className="rounded-full bg-[var(--surface-2)] px-2 py-0.5 text-xs">{trustLabel(resource.metadata.verificationStatus)}</span>
                </div>
                <p className="mt-1 text-xs text-[var(--muted-foreground)]">
                  {[resource.metadata.subject, resource.metadata.qualification, resource.metadata.syllabus, source === "local" ? "On this device" : source === "peer" ? "Shared by a peer" : "Open web search result"].filter(Boolean).join(" · ")}
                </p>
                <div className="mt-3 whitespace-pre-wrap break-words text-sm leading-6">{excerpt.slice(0, 6000)}</div>
                {source === "online" && webContent?.extraction === "provider-extracted page text" && <p className="mt-2 text-xs text-[var(--muted-foreground)]">Page text retrieved by the search provider. Check the original page before relying on it.</p>}
                {webContent?.documentType === "pdf" && <p className="mt-2 text-xs text-[var(--muted-foreground)]">PDF · {String(webContent.pageCount ?? "Unknown")} pages in source. Text extraction is limited to the first 20 pages.</p>}
                {resource.metadata.source && /^https:\/\//i.test(resource.metadata.source) && webContent?.kind !== "web-document" && (
                  <button type="button" onClick={() => void readSource(resource.metadata.source!)} disabled={Boolean(readingUrl)} className="mt-3 mr-3 inline-flex min-h-9 items-center rounded-lg border border-[var(--card-border)] px-3 text-xs font-medium disabled:opacity-60">
                    {readingUrl === resource.metadata.source ? "Reading…" : "Read full page / PDF"}
                  </button>
                )}
                {resource.metadata.source && (
                  <a href={resource.metadata.source} target="_blank" rel="noopener noreferrer" className="mt-3 inline-block break-all text-xs text-[var(--primary)] underline underline-offset-2">
                    Open original source
                  </a>
                )}
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
