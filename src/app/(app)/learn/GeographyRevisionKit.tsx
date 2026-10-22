"use client";

import { useEffect, useMemo, useState } from "react";
import { BookOpenCheck, Check, ChevronLeft, ChevronRight, Download, Plus, RotateCcw, Save, Trash2 } from "lucide-react";

type CaseStudy = {
  id: string;
  title: string;
  topic: string;
  place: string;
  issue: string;
  causes: string;
  impacts: string;
  response: string;
  outcome: string;
  evidence: string;
  source: string;
  status: "not-started" | "checking" | "ready";
  updatedAt: string;
};

const STORAGE_KEY = "shadecode:geography:case-studies:v1";
const emptyCase = (): CaseStudy => ({
  id: `geo-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
  title: "", topic: "", place: "", issue: "", causes: "", impacts: "",
  response: "", outcome: "", evidence: "", source: "", status: "not-started",
  updatedAt: new Date().toISOString(),
});
const fields: Array<{ key: keyof Pick<CaseStudy, "topic" | "place" | "issue" | "causes" | "impacts" | "response" | "outcome" | "evidence" | "source">; label: string; hint: string }> = [
  { key: "topic", label: "Geography topic", hint: "e.g. drought, settlement, tourism" },
  { key: "place", label: "Named place and scale", hint: "Exact location, country/region, and local/national/global scale" },
  { key: "issue", label: "Issue or process", hint: "Explain the process in 1–3 direct sentences." },
  { key: "causes", label: "Causes and links", hint: "List each cause and explain how it contributes." },
  { key: "impacts", label: "Impacts and evidence", hint: "Social, economic, environmental impacts; who was affected?" },
  { key: "response", label: "Management or response", hint: "What was done, by whom, and why?" },
  { key: "outcome", label: "Outcome and limitations", hint: "What changed? What remains unresolved? Mark unknowns CHECK." },
  { key: "evidence", label: "Exam-ready evidence", hint: "2–3 precise, verified facts with dates, units, or figures where relevant." },
  { key: "source", label: "Source check", hint: "Book/page, official source, URL, or teacher notes used to verify the facts." },
];

function makeCards(item: CaseStudy) {
  const cards: Array<{ front: string; back: string }> = [];
  const add = (front: string, back: string) => { if (back.trim() && !/\bCHECK\b/i.test(back.trim())) cards.push({ front, back }); };
  add(`Where is ${item.title || "this case study"}?`, item.place);
  add("What is the main issue or process?", item.issue);
  add("What causes or factors contributed?", item.causes);
  add("What impacts occurred, and who was affected?", item.impacts);
  add("What response was taken, and by whom?", item.response);
  add("What was the outcome, and what limitations remained?", item.outcome);
  add("Give precise evidence and explain what it demonstrates.", item.evidence);
  add("Which source did you use to verify this case?", item.source);
  return cards;
}

function downloadCase(item: CaseStudy) {
  const text = [
    `# ${item.title || "Geography case study"}`,
    ...fields.map(({ key, label }) => `## ${label}\n${item[key] || "CHECK"}`),
    `## Revision status\n${item.status}`,
  ].join("\n\n");
  const url = URL.createObjectURL(new Blob([text], { type: "text/markdown;charset=utf-8" }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `${(item.title || "geography-case-study").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}.md`;
  anchor.click();
  URL.revokeObjectURL(url);
}

export default function GeographyRevisionKit() {
  const [cases, setCases] = useState<CaseStudy[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [view, setView] = useState<"card" | "flashcards">("card");
  const [cardIndex, setCardIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const parsed: unknown = raw ? JSON.parse(raw) : [];
      if (Array.isArray(parsed)) {
        const valid = parsed.filter((value): value is CaseStudy =>
          !!value && typeof value === "object" && typeof (value as CaseStudy).id === "string" &&
          typeof (value as CaseStudy).title === "string"
        );
        setCases(valid);
        setSelectedId(valid[0]?.id ?? "");
      }
    } catch {
      setNotice("Saved Geography data could not be read. Your browser storage may be unavailable.");
    } finally {
      setLoaded(true);
    }
  }, []);

  const selected = cases.find(item => item.id === selectedId) ?? null;
  const cards = useMemo(() => selected ? makeCards(selected) : [], [selected]);
  const activeCard = cards.length ? cards[cardIndex % cards.length] : null;

  function persist(next: CaseStudy[], selected = selectedId) {
    setCases(next);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      setNotice("Saved on this device. This does not sync to the cloud.");
    } catch {
      setNotice("Could not save in this browser. Export your case study as a backup.");
    }
    if (selected) setSelectedId(selected);
  }

  function update(key: keyof CaseStudy, value: string) {
    if (!selected) return;
    const next = { ...selected, [key]: value, updatedAt: new Date().toISOString() } as CaseStudy;
    persist(cases.map(item => item.id === selected.id ? next : item));
  }

  function addCase() {
    const next = emptyCase();
    persist([...cases, next], next.id);
    setView("card");
    setNotice("New blank case created. Add verified facts from your teacher or trusted sources.");
  }

  function deleteCase() {
    if (!selected || !window.confirm(`Delete "${selected.title || "this blank case"}" from this device?`)) return;
    const next = cases.filter(item => item.id !== selected.id);
    persist(next, next[0]?.id ?? "");
    setCardIndex(0);
    setRevealed(false);
  }

  function updateStatus(value: CaseStudy["status"]) {
    if (!selected) return;
    persist(cases.map(item => item.id === selected.id ? { ...item, status: value, updatedAt: new Date().toISOString() } : item));
  }

  function moveCard(direction: number) {
    if (!cards.length) return;
    setCardIndex(index => (index + direction + cards.length) % cards.length);
    setRevealed(false);
  }

  if (!loaded) return <section className="rounded-3xl border border-[var(--card-border)] p-5" aria-busy="true">Loading your device-saved Geography kit…</section>;

  return (
    <section className="rounded-3xl border border-[var(--card-border)] bg-[var(--surface)] p-5 sm:p-6" aria-labelledby="geography-kit-title">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-[var(--primary-glow)] text-[var(--primary)]"><BookOpenCheck size={22} /></span>
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--muted-foreground)]">AI-independent revision</p>
            <h2 id="geography-kit-title" className="mt-1 text-xl font-semibold">Geography case-study kit</h2>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-[var(--muted-foreground)]">Build concise case cards and test your recall. Works without AI or a network connection after the page is loaded. Add your teacher-assigned cases; no official list or facts are invented for you.</p>
          </div>
        </div>
        <button type="button" onClick={addCase} className="inline-flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-xl bg-[var(--primary)] px-4 text-sm font-semibold text-[var(--primary-foreground)]"><Plus size={16} /> Add case</button>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-2">
        <label className="sr-only" htmlFor="geography-case-select">Choose case study</label>
        <select id="geography-case-select" value={selectedId} onChange={event => { setSelectedId(event.target.value); setCardIndex(0); setRevealed(false); }} className="min-h-10 min-w-0 flex-1 rounded-xl border border-[var(--card-border)] bg-[var(--surface-2)] px-3 text-sm">
          <option value="">Choose a case study…</option>
          {cases.map(item => <option key={item.id} value={item.id}>{item.title || "Untitled case"}{item.status === "ready" ? " · Exam-ready" : ""}</option>)}
        </select>
        <div className="flex rounded-xl border border-[var(--card-border)] p-1">
          <button type="button" onClick={() => setView("card")} aria-pressed={view === "card"} className={`rounded-lg px-3 py-2 text-xs font-semibold ${view === "card" ? "bg-[var(--primary-glow)] text-[var(--primary)]" : "text-[var(--muted-foreground)]"}`}>Case card</button>
          <button type="button" onClick={() => { setView("flashcards"); setCardIndex(0); setRevealed(false); }} aria-pressed={view === "flashcards"} className={`rounded-lg px-3 py-2 text-xs font-semibold ${view === "flashcards" ? "bg-[var(--primary-glow)] text-[var(--primary)]" : "text-[var(--muted-foreground)]"}`}>Flashcards</button>
        </div>
      </div>

      {!selected ? (
        <div className="mt-4 rounded-2xl border border-dashed border-[var(--card-border)] p-7 text-center">
          <p className="font-semibold">Start with the exact cases your teacher assigned.</p>
          <p className="mt-2 text-sm leading-6 text-[var(--muted-foreground)]">Create a blank card, enter verified details, and your notes stay on this device. You can add as many cases as you need, not just 24.</p>
          <button type="button" onClick={addCase} className="mt-4 inline-flex min-h-10 items-center gap-2 rounded-xl border border-[var(--card-border)] px-4 text-sm font-semibold"><Plus size={16} /> Create first case</button>
        </div>
      ) : view === "card" ? (
        <div className="mt-4">
          <div className="grid gap-4 sm:grid-cols-[1fr_auto]">
            <div>
              <label htmlFor="geography-case-title" className="mb-1.5 block text-xs font-semibold text-[var(--muted-foreground)]">Case study title</label>
              <input id="geography-case-title" value={selected.title} onChange={event => update("title", event.target.value)} maxLength={140} placeholder="Use the name from your teacher's list" className="min-h-11 w-full rounded-xl border border-[var(--card-border)] bg-[var(--surface-2)] px-3 text-sm font-semibold" />
            </div>
            <div>
              <label htmlFor="geography-case-status" className="mb-1.5 block text-xs font-semibold text-[var(--muted-foreground)]">Revision status</label>
              <select id="geography-case-status" value={selected.status} onChange={event => updateStatus(event.target.value as CaseStudy["status"])} className="min-h-11 w-full rounded-xl border border-[var(--card-border)] bg-[var(--surface-2)] px-3 text-sm">
                <option value="not-started">Not started</option><option value="checking">Facts checking</option><option value="ready">Exam-ready (self-rated)</option>
              </select>
            </div>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {fields.map(({ key, label, hint }) => <div key={key}>
              <label htmlFor={`geo-${selected.id}-${key}`} className="mb-1.5 block text-sm font-semibold">{label}</label>
              <textarea id={`geo-${selected.id}-${key}`} value={selected[key]} onChange={event => update(key, event.target.value)} rows={key === "issue" || key === "place" ? 2 : 3} maxLength={5000} placeholder={hint} className="min-h-20 w-full resize-y rounded-xl border border-[var(--card-border)] bg-[var(--surface-2)] p-3 text-sm leading-5 outline-none focus:ring-2 focus:ring-[var(--primary)]" />
            </div>)}
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <button type="button" onClick={() => downloadCase(selected)} className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-[var(--card-border)] px-3 text-sm font-semibold"><Download size={16} /> Export Markdown</button>
            <button type="button" onClick={deleteCase} className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-rose-500/30 px-3 text-sm font-semibold text-rose-600"><Trash2 size={16} /> Delete case</button>
            <span className="inline-flex items-center gap-1.5 text-xs text-[var(--muted-foreground)]"><Save size={14} /> Auto-saved locally</span>
          </div>
        </div>
      ) : (
        <div className="mt-4">
          {activeCard ? (
            <div className="mx-auto max-w-2xl">
              <div className="flex items-center justify-between text-xs text-[var(--muted-foreground)]"><span>{selected.title || "Untitled case"}</span><span>Card {cardIndex + 1} of {cards.length}</span></div>
              <button type="button" onClick={() => setRevealed(value => !value)} className="mt-3 flex min-h-56 w-full flex-col items-center justify-center rounded-2xl border border-[var(--card-border)] bg-[var(--surface-2)] p-6 text-center transition hover:border-[var(--primary)]">
                <span className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--muted-foreground)]">{revealed ? "Answer" : "Recall prompt"}</span>
                <span className="mt-4 text-lg font-semibold leading-7">{revealed ? activeCard.back : activeCard.front}</span>
                <span className="mt-5 text-xs text-[var(--muted-foreground)]">{revealed ? "Try explaining the evidence in your own words." : "Think of your answer, then reveal it."}</span>
              </button>
              <div className="mt-3 flex items-center justify-between gap-2">
                <button type="button" onClick={() => moveCard(-1)} className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-[var(--card-border)] px-3 text-sm font-semibold"><ChevronLeft size={16} /> Previous</button>
                <button type="button" onClick={() => { setCardIndex(0); setRevealed(false); }} className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-[var(--card-border)] px-3 text-sm font-semibold"><RotateCcw size={16} /> Restart</button>
                <button type="button" onClick={() => moveCard(1)} className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-[var(--primary)] px-3 text-sm font-semibold text-[var(--primary-foreground)]">Next <ChevronRight size={16} /></button>
              </div>
              <p className="mt-3 text-xs leading-5 text-[var(--muted-foreground)]">Only populated fields with answers are turned into cards. Unknown facts are not generated. If you need to verify a fact, add CHECK in your notes and return to the case card.</p>
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-[var(--card-border)] p-6 text-center">
              <p className="font-semibold">No flashcards yet</p>
              <p className="mt-2 text-sm text-[var(--muted-foreground)]">Fill in some verified facts on the Case card tab first.</p>
              <button type="button" onClick={() => setView("card")} className="mt-3 inline-flex min-h-10 items-center gap-2 rounded-xl border border-[var(--card-border)] px-3 text-sm font-semibold">Edit case <ChevronLeft size={16} /></button>
            </div>
          )}
        </div>
      )}

      {notice && <p className="mt-4 flex items-start gap-2 text-xs leading-5 text-[var(--muted-foreground)]" role="status"><Check size={14} className="mt-0.5 shrink-0" />{notice}</p>}
      <p className="mt-3 border-t border-[var(--card-border)] pt-3 text-xs leading-5 text-[var(--muted-foreground)]">Privacy note: this kit saves to this browser on this device only. It is not cloud-synced or shared with peers. Export a Markdown backup if you need to move your notes to another device.</p>
    </section>
  );
}
