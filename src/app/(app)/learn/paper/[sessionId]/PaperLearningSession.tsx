"use client";

import { useEffect, useState } from "react";
import { ArrowLeft, BookOpen, CheckCircle2, FileText, Loader2, WifiOff } from "lucide-react";
import { useRouter } from "next/navigation";

type Block = { type: string; title?: string; content: string };
type Session = {
  id: string;
  source_name: string;
  page_count: number;
  selected_page_start: number;
  selected_page_end: number;
  status: "processing" | "processed" | "failed";
  learning_plan: { title?: string; overview?: string; blocks?: Block[] };
  pages: Array<{ pageNumber: number; text: string }>;
  updated_at: string;
};

function cacheKey(id: string) { return `shadecode:paper-session:${id}`; }

export default function PaperLearningSession({ sessionId }: { sessionId: string }) {
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);
  const [offline, setOffline] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    const cached = window.localStorage.getItem(cacheKey(sessionId));
    if (cached) {
      try { setSession(JSON.parse(cached) as Session); setOffline(true); } catch { /* ignore invalid cache */ }
    }
    fetch(`/api/learn/paper?id=${encodeURIComponent(sessionId)}`, { cache: "no-store" })
      .then(async response => {
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.error || "Couldn't load this paper session.");
        return data as Session;
      })
      .then(data => {
        if (!alive) return;
        setSession(data);
        setOffline(false);
        window.localStorage.setItem(cacheKey(sessionId), JSON.stringify(data));
      })
      .catch(e => { if (alive && !cached) setError(e instanceof Error ? e.message : "Couldn't load this session."); });
    const onOnline = () => setOffline(false);
    const onOffline = () => setOffline(true);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => { alive = false; window.removeEventListener("online", onOnline); window.removeEventListener("offline", onOffline); };
  }, [sessionId]);

  if (!session && !error) return <main className="min-h-screen bg-[var(--background)] p-6"><div className="mx-auto max-w-4xl py-16 text-center"><Loader2 className="mx-auto h-7 w-7 animate-spin text-[var(--primary)]" /><p className="mt-3 text-sm text-[var(--muted-foreground)]">Opening your learning session…</p></div></main>;
  if (!session) return <main className="min-h-screen bg-[var(--background)] p-6"><div className="mx-auto max-w-4xl py-16 text-center"><p className="font-semibold">{error}</p><button type="button" onClick={() => router.push("/learn")} className="mt-4 rounded-xl bg-[var(--primary)] px-4 py-2 text-sm font-bold text-[var(--primary-foreground)]">Back to Learn</button></div></main>;

  const blocks = session.learning_plan?.blocks ?? [];
  const checkpoints = blocks.filter(block => block.type === "checkpoint" || block.type === "mastery").length;

  return (
    <main className="min-h-screen bg-[var(--background)] px-4 py-6 text-[var(--foreground)] sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl space-y-5">
        <button type="button" onClick={() => router.push("/learn")} className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--muted-foreground)] hover:text-[var(--foreground)]"><ArrowLeft className="h-4 w-4" /> Back to Learn</button>

        {offline && <div className="flex items-center gap-2 rounded-2xl border border-[var(--card-border)] bg-[var(--card)] p-3 text-xs"><WifiOff className="h-4 w-4 text-[var(--primary)]" /> Offline copy loaded. Your processed lesson remains readable.</div>}

        <header className="rounded-3xl border border-[var(--card-border)] bg-[var(--card)] p-6 sm:p-8">
          <div className="flex flex-wrap items-center gap-2 text-xs font-bold uppercase tracking-wider text-[var(--primary)]"><FileText className="h-4 w-4" /> Paper study</div>
          <h1 className="mt-3 text-3xl font-black tracking-tight">{session.learning_plan?.title || "Learning from your paper"}</h1>
          <p className="mt-3 text-sm leading-6 text-[var(--muted-foreground)]">{session.learning_plan?.overview || "Cortex built this session from the selected source pages."}</p>
          <div className="mt-5 flex flex-wrap gap-2 text-xs font-semibold text-[var(--muted-foreground)]"><span className="rounded-lg bg-[var(--surface)] px-3 py-2">{session.source_name}</span><span className="rounded-lg bg-[var(--surface)] px-3 py-2">Pages {session.selected_page_start}–{session.selected_page_end}</span><span className="rounded-lg bg-[var(--surface)] px-3 py-2">{session.page_count} pages in source</span><span className="rounded-lg bg-[var(--surface)] px-3 py-2">{checkpoints} checks</span></div>
        </header>

        <section className="space-y-3" aria-label="Learning session">
          {blocks.map((block, index) => (
            <article key={`${block.type}-${index}`} className="rounded-2xl border border-[var(--card-border)] bg-[var(--card)] p-5 sm:p-6">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 rounded-lg bg-[var(--primary-glow)] p-2"><BookOpen className="h-4 w-4 text-[var(--primary)]" /></div>
                <div className="min-w-0 flex-1"><p className="text-[10px] font-black uppercase tracking-wider text-[var(--primary)]">{block.type.replace("-", " ")}</p>{block.title && <h2 className="mt-1 text-lg font-bold">{block.title}</h2>}<div className="mt-3 whitespace-pre-line text-sm leading-7 text-[var(--foreground)]">{block.content}</div></div>
              </div>
            </article>
          ))}
        </section>

        <section className="rounded-3xl border border-[var(--card-border)] bg-[var(--card)] p-6">
          <div className="flex items-start gap-3"><CheckCircle2 className="mt-0.5 h-5 w-5 text-[var(--primary)]" /><div><h2 className="font-bold">Next: make the knowledge yours</h2><p className="mt-1 text-sm leading-6 text-[var(--muted-foreground)]">The next layer is interactive checkpoints: Shadecode should pause, accept your attempt, diagnose the reasoning, and only then reveal the next step.</p></div></div>
        </section>
      </div>
    </main>
  );
}
