"use client";

import { useState } from "react";
import { AlertCircle, BookOpen, ExternalLink, Loader2, Sparkles, WifiOff } from "lucide-react";

type ResearchStatus = "not_requested" | "not_configured" | "unavailable" | "available" | "ai_unavailable";
type Citation = {
  title: string;
  url: string;
  publisher: string;
  retrievedAt: string;
  verificationStatus: "unverified";
  extraction: "independently_fetched" | "search_excerpt_only";
  excerpt: string;
};
type CortexResponse = {
  response?: string;
  researchStatus?: ResearchStatus;
  sources?: Citation[];
  error?: string;
};

function statusMessage(status: ResearchStatus | "offline" | null) {
  switch (status) {
    case "not_requested": return "Research was not requested. Cortex used its local tutoring path.";
    case "not_configured": return "Online research is not configured on the server. Your tutoring answer is still available.";
    case "unavailable": return "Online search or source retrieval was unavailable. Your tutoring answer is still available.";
    case "ai_unavailable": return "Sources were retrieved, but AI synthesis was unavailable. The local tutoring answer is shown instead.";
    case "available": return "Research-assisted answer. Sources are unverified and should be checked before relying on them.";
    case "offline": return "You are offline. Cortex used its local tutoring path; online research was not attempted.";
    default: return "";
  }
}

export default function CortexResearchPanel({
  subject,
  topic,
  onTopicChange,
  token,
  userId,
  offline,
}: {
  subject: string;
  topic: string;
  onTopicChange: (value: string) => void;
  token: string | null;
  userId: string | null;
  offline: boolean;
}) {
  const [research, setResearch] = useState(false);
  const [busy, setBusy] = useState(false);
  const [answer, setAnswer] = useState("");
  const [status, setStatus] = useState<ResearchStatus | "offline" | null>(null);
  const [sources, setSources] = useState<Citation[]>([]);
  const [error, setError] = useState("");

  async function ask() {
    if (!token || !userId || !subject.trim() || !topic.trim() || busy) return;
    setBusy(true);
    setError("");
    setAnswer("");
    setSources([]);
    setStatus(research && offline ? "offline" : research ? null : "not_requested");
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 55_000);
    try {
      const response = await fetch("/api/cortex", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          userId,
          type: "learn",
          payload: {
            topic: topic.trim().slice(0, 500),
            // The server resolver matches this exact selected label against the
            // learner's saved curriculum subject identity/name. It never guesses
            // from the topic text or chooses among multiple subjects.
            subjectId: subject.trim(),
            subjectName: subject.trim(),
            research: research && !offline,
          },
        }),
        cache: "no-store",
        signal: controller.signal,
      });
      const data = await response.json().catch(() => ({})) as CortexResponse;
      if (!response.ok) throw new Error(data.error || `Cortex could not respond (${response.status}).`);
      if (typeof data.response !== "string" || !data.response.trim()) {
        throw new Error("Cortex returned no tutoring answer. Your topic has not been changed.");
      }
      setAnswer(data.response);
      setSources(Array.isArray(data.sources) ? data.sources.filter((item) =>
        item && typeof item.title === "string" && typeof item.url === "string" &&
        typeof item.excerpt === "string" && item.verificationStatus === "unverified"
      ) : []);
      setStatus(research && !offline ? data.researchStatus ?? "unavailable" : research ? "offline" : "not_requested");
    } catch (cause) {
      setError(cause instanceof Error && cause.name === "AbortError"
        ? "Cortex took too long to respond. Try again; your lesson and topic remain unchanged."
        : cause instanceof Error ? cause.message : "Cortex could not complete this request.");
    } finally {
      window.clearTimeout(timeout);
      setBusy(false);
    }
  }

  return (
    <section className="mt-6 rounded-2xl border border-[var(--card-border)] bg-[var(--surface)] p-5 shadow-sm sm:p-6" aria-labelledby="cortex-tutor-title">
      <div className="flex items-start gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[var(--primary-glow)] text-[var(--primary)]"><Sparkles size={19} aria-hidden="true" /></span>
        <div className="min-w-0 flex-1">
          <h2 id="cortex-tutor-title" className="text-lg font-semibold">Ask Cortex</h2>
          <p className="mt-1 text-sm leading-5 text-[var(--muted-foreground)]">Get a direct explanation for the selected subject. Online research is optional and off by default.</p>
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-3 rounded-xl border border-[var(--card-border)] bg-[var(--surface-2)] p-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="text-sm font-semibold">Research with the open web</p>
          <p className="mt-0.5 text-xs leading-5 text-[var(--muted-foreground)]">Searches use your selected subject's verified curriculum identity. Web sources are not teacher-verified or fact-checked.</p>
        </div>
        <label className="inline-flex min-h-11 shrink-0 items-center gap-3 text-sm font-semibold">
          <span>Off</span>
          <input type="checkbox" role="switch" aria-label="Enable online research for this Cortex question" checked={research} onChange={(event) => setResearch(event.target.checked)} className="h-5 w-5 accent-[var(--primary)]" />
          <span>On</span>
        </label>
      </div>
      {research && offline && <p className="mt-2 flex items-center gap-2 text-xs text-[var(--muted-foreground)]" role="status"><WifiOff size={14} /> Offline: Cortex will answer locally and skip web research.</p>}

      <div className="mt-4">
        <label htmlFor="cortex-question" className="mb-2 block text-sm font-semibold">Your question or topic</label>
        <textarea id="cortex-question" value={topic} onChange={(event) => onTopicChange(event.target.value)} maxLength={500} rows={3} placeholder="What do you want Cortex to explain?" className="w-full resize-y rounded-xl border border-[var(--card-border)] bg-[var(--surface-2)] px-3 py-3 text-sm outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20" />
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <span className="text-xs text-[var(--muted-foreground)]">Subject: {subject || "Choose a subject above"}</span>
          <button type="button" onClick={() => void ask()} disabled={!token || !userId || !subject || !topic.trim() || busy} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[var(--primary)] px-4 text-sm font-semibold text-[var(--primary-foreground)] disabled:cursor-not-allowed disabled:opacity-50">
            {busy ? <><Loader2 size={16} className="animate-spin" /> Cortex is working</> : <><BookOpen size={16} /> Explain this</>}
          </button>
        </div>
      </div>

      {error && <p className="mt-4 flex items-start gap-2 rounded-xl border border-amber-500/25 bg-amber-500/[0.06] p-3 text-sm" role="alert"><AlertCircle size={16} className="mt-0.5 shrink-0" />{error}</p>}
      {answer && <article className="mt-5 rounded-xl border border-[var(--card-border)] p-4" aria-labelledby="cortex-answer-title">
        <h3 id="cortex-answer-title" className="font-semibold">Cortex's explanation</h3>
        <div className="mt-3 whitespace-pre-wrap text-sm leading-7 text-[var(--foreground)]">{answer}</div>
        {status && <p className="mt-4 border-t border-[var(--card-border)] pt-3 text-xs leading-5 text-[var(--muted-foreground)]" role="status">{statusMessage(status)}</p>}
        {sources.length > 0 && <div className="mt-4 space-y-3" aria-label="Research sources">
          <h4 className="text-sm font-semibold">Sources to inspect</h4>
          {sources.map((source, index) => <article key={`${source.url}-${index}`} className="rounded-xl border border-[var(--card-border)] bg-[var(--surface-2)] p-3">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0"><h5 className="text-sm font-semibold">{source.title}</h5><p className="mt-1 text-xs text-[var(--muted-foreground)]">{source.publisher} · {source.retrievedAt ? new Date(source.retrievedAt).toLocaleString() : "Retrieval time unavailable"}</p></div>
              <a href={source.url} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-9 items-center gap-1 rounded-lg border border-[var(--card-border)] px-2 text-xs font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]">Open source <ExternalLink size={13} aria-hidden="true" /></a>
            </div>
            <p className="mt-2 text-xs leading-5 text-[var(--muted-foreground)]">{source.excerpt || "No text excerpt was available."}</p>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-[10px] font-semibold">
              <span className="rounded-full bg-amber-500/10 px-2 py-1 text-amber-700 dark:text-amber-300">Unverified web source</span>
              <span className="rounded-full bg-[var(--card)] px-2 py-1 text-[var(--muted-foreground)]">{source.extraction === "independently_fetched" ? "Page fetched" : "Search excerpt only"}</span>
            </div>
          </article>)}
        </div>}
        {status === "available" && sources.length === 0 && <p className="mt-3 text-xs text-[var(--muted-foreground)]">The research response did not include inspectable sources. Treat it as a normal tutoring explanation.</p>}
      </article>}
    </section>
  );
}
