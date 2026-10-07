"use client";

import { useState } from "react";
import { Check, Copy, Loader2, Swords } from "lucide-react";

type Props = { resultId: string; subject: string; percentage: number };

type Status = "idle" | "creating" | "ready" | "error";

/**
 * Turns a just-saved exam result into a shareable battle. The server reads the
 * score and the questions from the saved result, so the browser only sends the id.
 */
export default function ChallengeFriend({ resultId, subject, percentage }: Props) {
  const [status, setStatus] = useState<Status>("idle");
  const [url, setUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const create = async () => {
    if (status === "creating") return;
    setStatus("creating");
    try {
      const response = await fetch("/api/challenge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ result_id: resultId }),
      });
      const data = (await response.json().catch(() => null)) as { challengeUrl?: string } | null;
      if (!response.ok || !data?.challengeUrl) throw new Error("create failed");
      setUrl(`${window.location.origin}${data.challengeUrl}`);
      setStatus("ready");
    } catch {
      setStatus("error");
    }
  };

  const message = url ? `I scored ${percentage}% on ${subject} on Shadecode Student. Same questions, can you beat me? ${url}` : "";

  const copy = async () => {
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  return (
    <aside
      aria-label="Challenge a friend"
      className="fixed inset-x-4 bottom-4 z-40 mx-auto max-w-md rounded-2xl border border-white/10 bg-[var(--card)] p-4 shadow-lg backdrop-blur"
    >
      {status !== "ready" ? (
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-[var(--foreground)]">Challenge a friend</p>
            <p className="text-xs text-[var(--muted-foreground)]">
              {status === "error" ? "Couldn't create the challenge. Try again." : "They sit the exact same questions."}
            </p>
          </div>
          <button
            type="button"
            onClick={() => void create()}
            disabled={status === "creating"}
            className="inline-flex h-10 shrink-0 items-center gap-2 rounded-xl bg-[var(--primary)] px-4 text-sm font-semibold text-[var(--primary-foreground)] transition-opacity hover:opacity-90 disabled:opacity-60"
          >
            {status === "creating" ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Swords className="size-4" aria-hidden />}
            {status === "error" ? "Retry" : "Challenge"}
          </button>
        </div>
      ) : (
        <div role="status" aria-live="polite" className="flex flex-col gap-3">
          <p className="text-sm font-semibold text-[var(--foreground)]">Challenge ready. Send it to a friend.</p>
          <div className="flex gap-2">
            <a
              href={`https://wa.me/?text=${encodeURIComponent(message)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-10 flex-1 items-center justify-center rounded-xl bg-[var(--primary)] px-4 text-sm font-semibold text-[var(--primary-foreground)] transition-opacity hover:opacity-90"
            >
              Share on WhatsApp
            </a>
            <button
              type="button"
              onClick={() => void copy()}
              className="inline-flex h-10 items-center gap-2 rounded-xl border border-white/10 px-4 text-sm font-semibold text-[var(--foreground)] transition-colors hover:bg-white/5"
            >
              {copied ? <Check className="size-4" aria-hidden /> : <Copy className="size-4" aria-hidden />}
              {copied ? "Copied" : "Copy link"}
            </button>
          </div>
        </div>
      )}
    </aside>
  );
}
