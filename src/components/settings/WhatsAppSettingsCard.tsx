"use client";

import { useState } from "react";
import { Check, Copy, MessageCircle, RefreshCw } from "lucide-react";

export function WhatsAppSettingsCard() {
  const [code, setCode] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateCode = async () => {
    setLoading(true);
    setError(null);
    setCopied(false);
    try {
      const response = await fetch("/api/account/whatsapp/link-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
      });
      const payload = (await response.json().catch(() => null)) as
        | { code?: string; expiresAt?: string; error?: string }
        | null;
      if (!response.ok || !payload?.code) {
        throw new Error(payload?.error || "Couldn’t generate a WhatsApp link code.");
      }
      setCode(payload.code);
      setExpiresAt(payload.expiresAt ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn’t generate a WhatsApp link code.");
    } finally {
      setLoading(false);
    }
  };

  const copyCode = async () => {
    if (!code) return;
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setError("Couldn’t copy the code. You can enter it manually in WhatsApp.");
    }
  };

  const expiryLabel = expiresAt
    ? new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" }).format(new Date(expiresAt))
    : null;

  return (
    <div className="ssc-card p-5">
      <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[var(--primary-glow)] text-[var(--primary)]">
            <MessageCircle size={22} />
          </div>
          <div>
            <h2 className="text-xl">Use Shadecode on WhatsApp</h2>
            <p className="mt-1 max-w-2xl text-sm text-[var(--muted-foreground)]">
              Link this account once, then use WhatsApp for low-data learning, quick questions, and study support.
            </p>
          </div>
        </div>
        <button type="button" onClick={generateCode} disabled={loading} className="ssc-button shrink-0">
          <RefreshCw size={17} className={loading ? "animate-spin" : ""} />
          {loading ? "Generating" : code ? "New code" : "Generate code"}
        </button>
      </div>

      {code && (
        <div className="mt-5 rounded-2xl border border-[var(--card-border)] bg-[var(--surface-2)] p-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="ssc-label">Your one-time link code</p>
              <p className="mt-1 text-3xl font-bold tracking-[0.22em] text-[var(--foreground)]">{code}</p>
              {expiryLabel && <p className="mt-1 text-xs text-[var(--muted-foreground)]">Expires at {expiryLabel}.</p>}
            </div>
            <button type="button" onClick={copyCode} className="ssc-button ssc-button-secondary">
              {copied ? <Check size={17} /> : <Copy size={17} />}
              {copied ? "Copied" : "Copy code"}
            </button>
          </div>
          <ol className="mt-4 grid gap-2 text-sm text-[var(--muted-foreground)] md:grid-cols-3">
            <li><span className="font-semibold text-[var(--foreground)]">1.</span> Open the official Shadecode WhatsApp chat.</li>
            <li><span className="font-semibold text-[var(--foreground)]">2.</span> Send <code className="rounded bg-[var(--surface)] px-1.5 py-0.5">LINK {code}</code>.</li>
            <li><span className="font-semibold text-[var(--foreground)]">3.</span> Start learning when Shadecode confirms the link.</li>
          </ol>
          <p className="mt-3 text-xs text-[var(--muted-foreground)]">Keep this code private. It can be used once and expires shortly.</p>
        </div>
      )}

      {error && <p className="mt-3 text-sm text-[var(--danger)]" role="alert">{error}</p>}
    </div>
  );
}
