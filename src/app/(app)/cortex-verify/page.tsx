"use client";

import React, { useState, useRef, useEffect } from "react";
import { useCortexVerify } from "../../../hooks/useCortexVerify";

export default function CortexVerifyPage() {
  const [mode, setMode] = useState<"check" | "help">("check");
  const [helpLevel, setHelpLevel] = useState("hint");
  const [subject, setSubject] = useState("");
  const [question, setQuestion] = useState("");
  const [image, setImage] = useState<File | undefined>(undefined);
  const [preview, setPreview] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const { result, loading, error, check, help } = useCortexVerify();
  const [queueCount, setQueueCount] = useState<number | null>(null);
  const [health, setHealth] = useState<any>(null);

  // poll queue & health
  useEffect(() => {
    let mounted = true;
    async function refresh() {
      try {
        // dynamic import to avoid SSR issues
        const lib = await import("../../../lib/offline/cortex-queue");
        const items = await lib.getAll();
        if (!mounted) return;
        setQueueCount(items.length);
      } catch {
        if (!mounted) return;
        setQueueCount(null);
      }
      try {
        const res = await fetch('/api/cortex/health');
        const j = await res.json();
        if (!mounted) return;
        setHealth(j);
      } catch {
        if (!mounted) return;
        setHealth(null);
      }
    }
    refresh();
    const t = setInterval(refresh, 30000);
    window.addEventListener('online', refresh);
    return () => { mounted = false; clearInterval(t); window.removeEventListener('online', refresh); };
  }, []);


  const onFile = (f?: File) => {
    if (!f) return;
    setImage(f);
    const reader = new FileReader();
    reader.onload = (e) => setPreview(e.target?.result as string);
    reader.readAsDataURL(f);
  };

  const submit = async () => {
    if (mode === "check") {
      await check({ mode: "check", subject, question, image });
    } else {
      await help({ mode: "help", subject, question, level: helpLevel as any, image });
    }
  };

  return (
    <div style={{ padding: 24 }}>
      <h1 style={{ margin: 0 }}>Cortex Verify</h1>
      <p style={{ color: "#666" }}>Upload your work, then choose Check My Work or request teaching help.</p>

      <div style={{ display: "flex", gap: 12, marginTop: 16 }}>
        <button onClick={() => setMode("check")} style={{ padding: 8, background: mode === "check" ? "#6247FF" : "#eee", color: mode === "check" ? "white" : "#111" }}>Check my work</button>
        <button onClick={() => setMode("help")} style={{ padding: 8, background: mode === "help" ? "#6247FF" : "#eee", color: mode === "help" ? "white" : "#111" }}>Help me solve</button>
      </div>

      <div style={{ marginTop: 12 }}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 8 }}>
          <div style={{ fontSize: 13, color: '#333' }}>Queue: {queueCount === null ? 'n/a' : queueCount}</div>
          <div style={{ fontSize: 13, color: '#333' }}>Providers: {health ? (health.providers ? Object.entries(health.providers).filter(([,v])=>v).map(([k])=>k).join(', ') : 'none') : 'checking...'}</div>
          <div style={{ fontSize: 13, color: '#666' }}>Connectivity: {typeof navigator !== 'undefined' && navigator.onLine ? 'online' : 'offline'}</div>
        </div>
        <input placeholder="Subject (e.g. Mathematics, Physics)" value={subject} onChange={(e) => setSubject(e.target.value)} style={{ width: "100%", padding: 8, marginBottom: 8 }} />
        <input placeholder="Question (optional)" value={question} onChange={(e) => setQuestion(e.target.value)} style={{ width: "100%", padding: 8, marginBottom: 8 }} />

        {mode === "help" && (
          <div style={{ marginBottom: 8 }}>
            <label style={{ marginRight: 8 }}>Help level</label>
            <select value={helpLevel} onChange={(e) => setHelpLevel(e.target.value)}>
              <option value="hint">Hint</option>
              <option value="method">Method</option>
              <option value="solution">Full solution</option>
            </select>
          </div>
        )}

        <div style={{ marginBottom: 8 }}>
          <input ref={fileRef} type="file" accept="image/*" onChange={(e) => e.target.files && onFile(e.target.files[0])} />
        </div>

        <button onClick={submit} disabled={loading} style={{ padding: 12, background: "#6247FF", color: "white", border: "none", borderRadius: 8 }}>
          {loading ? "Processing…" : mode === "check" ? "Check my work" : "Get help"}
        </button>
      </div>

      {error && <div style={{ marginTop: 12, color: "#b91c1c" }}>{error}</div>}

      {result && (
        <div style={{ marginTop: 16, border: "1px solid #eee", padding: 12, borderRadius: 8 }}>
          <h3>Result</h3>
          <pre style={{ whiteSpace: "pre-wrap" }}>{JSON.stringify(result, null, 2)}</pre>
        </div>
      )}
    </div>
  );
}
