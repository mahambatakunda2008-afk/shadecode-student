"use client";

import React, { useEffect, useRef, useState } from "react";
import { useCortexVerify } from "@/hooks/useCortexVerify";

export default function CortexVerifyPanel() {
  const [mode, setMode] = useState<"check" | "help">("check");
  const [helpLevel, setHelpLevel] = useState("hint");
  const [subject, setSubject] = useState("");
  const [question, setQuestion] = useState("");
  const [image, setImage] = useState<File | undefined>();
  const [preview, setPreview] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const { result, loading, error, check, help } = useCortexVerify();
  const [queueCount, setQueueCount] = useState<number | null>(null);
  const [health, setHealth] = useState<any>(null);

  useEffect(() => {
    let mounted = true;
    async function refresh() {
      try { const lib = await import("@/lib/offline/cortex-queue"); const items = await lib.getAll(); if (mounted) setQueueCount(items.length); } catch { if (mounted) setQueueCount(null); }
      if (typeof navigator !== "undefined" && !navigator.onLine) { if (mounted) setHealth(null); return; }
      try { const res = await fetch("/api/cortex/health", { cache: "no-store" }); const json = await res.json(); if (mounted) setHealth(json); } catch { if (mounted) setHealth(null); }
    }
    void refresh();
    const timer = window.setInterval(() => void refresh(), 30000);
    window.addEventListener("online", refresh);
    return () => { mounted = false; window.clearInterval(timer); window.removeEventListener("online", refresh); };
  }, []);

  const onFile = (file?: File) => {
    if (!file || !file.type.startsWith("image/")) return;
    setImage(file);
    const reader = new FileReader();
    reader.onload = (event) => setPreview(event.target?.result as string);
    reader.readAsDataURL(file);
  };

  const submit = async () => mode === "check"
    ? await check({ mode: "check", subject, question, image })
    : await help({ mode: "help", subject, question, level: helpLevel as any, image });

  return (
    <section className="flex flex-col gap-4">
      <div className="rounded-2xl border border-[var(--card-border)] bg-[var(--card)] p-4">
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => setMode("check")} className={`rounded-xl px-4 py-2 text-sm font-semibold ${mode === "check" ? "bg-[var(--primary)] text-white" : "bg-[var(--muted)]"}`}>Check my work</button>
          <button type="button" onClick={() => setMode("help")} className={`rounded-xl px-4 py-2 text-sm font-semibold ${mode === "help" ? "bg-[var(--primary)] text-white" : "bg-[var(--muted)]"}`}>Help me solve</button>
        </div>
        <div className="mt-3 flex flex-wrap gap-3 text-xs text-[var(--muted-foreground)]"><span>Queue: {queueCount ?? "n/a"}</span><span>Connectivity: {typeof navigator !== "undefined" && navigator.onLine ? "online" : "offline"}</span><span>Providers: {health?.providers ? Object.entries(health.providers).filter(([, value]) => value).map(([key]) => key).join(", ") || "none" : "unavailable"}</span></div>
      </div>
      <div className="rounded-2xl border border-[var(--card-border)] bg-[var(--card)] p-4">
        <input className="mb-3 w-full rounded-xl border border-[var(--card-border)] bg-[var(--muted)] p-3 text-sm" placeholder="Subject (e.g. Mathematics, Physics)" value={subject} onChange={(e) => setSubject(e.target.value)} />
        <input className="mb-3 w-full rounded-xl border border-[var(--card-border)] bg-[var(--muted)] p-3 text-sm" placeholder="Question (optional)" value={question} onChange={(e) => setQuestion(e.target.value)} />
        {mode === "help" && <label className="mb-3 flex items-center gap-3 text-sm">Help level<select className="rounded-lg border border-[var(--card-border)] bg-[var(--muted)] p-2" value={helpLevel} onChange={(e) => setHelpLevel(e.target.value)}><option value="hint">Hint</option><option value="method">Method</option><option value="solution">Full solution</option></select></label>}
        <input ref={fileRef} type="file" accept="image/*" onChange={(e) => onFile(e.target.files?.[0])} className="block w-full text-sm" />
        {preview && <img src={preview} alt="Selected working" className="mt-3 max-h-72 w-full rounded-xl object-contain bg-[var(--muted)]" />}
        <button type="button" onClick={() => void submit()} disabled={loading || (!question && !image)} className="mt-4 w-full rounded-xl bg-[var(--primary)] px-4 py-3 text-sm font-bold text-white disabled:opacity-50">{loading ? "Cortex is thinking…" : mode === "check" ? "Check my work" : "Get help"}</button>
      </div>
      {error && <div role="alert" className="rounded-2xl border border-[var(--card-border)] bg-[var(--card)] p-4 text-sm text-[var(--danger)]">{error}</div>}
      {result && <div className="rounded-2xl border border-[var(--card-border)] bg-[var(--card)] p-4"><h2 className="mb-2 font-bold">Cortex result</h2><pre className="whitespace-pre-wrap text-sm text-[var(--muted-foreground)]">{JSON.stringify(result, null, 2)}</pre></div>}
    </section>
  );
}
