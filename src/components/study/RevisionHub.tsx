"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Check, HelpCircle, Loader2, RotateCcw, X } from "lucide-react";
import type { RevisionCard, RevisionRating } from "@/lib/study/revisionDeck";
import type { SyllabusSummary } from "@/lib/study/subsectionMastery";

const SUBJECT_LABEL: Record<string, string> = { physics: "Physics", chemistry: "Chemistry", biology: "Biology", mathematics: "Mathematics" };
const LEVEL_LABEL: Record<string, string> = { as_level: "AS", a_level: "A Level" };

type Deck = { syllabusId: string; topicKey: string; topicTitle: string; cards: RevisionCard[] };
type Load = { status: "loading" } | { status: "error" } | { status: "ready"; syllabi: SyllabusSummary[] };

const card = "rounded-2xl border border-white/10 bg-[var(--card)] shadow-lg";
const primaryButton = "inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[var(--primary)] px-5 text-sm font-semibold text-[var(--primary-foreground)] transition-opacity hover:opacity-90 disabled:opacity-60";
const ghostButton = "inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-white/10 px-5 text-sm font-semibold text-[var(--foreground)] transition-colors hover:bg-white/5";

export default function RevisionHub() {
  const router = useRouter();
  const params = useSearchParams();
  const [load, setLoad] = useState<Load>({ status: "loading" });
  const [syllabusId, setSyllabusId] = useState<string | null>(params.get("syllabus"));
  const [deck, setDeck] = useState<Deck | null>(null);
  const [deckError, setDeckError] = useState<string | null>(null);
  const [opening, setOpening] = useState<string | null>(null);

  const loadTopics = useCallback(async () => {
    setLoad({ status: "loading" });
    try {
      const response = await fetch("/api/study/revision");
      const data = (await response.json()) as { syllabi?: SyllabusSummary[] };
      if (!response.ok || !data.syllabi?.length) throw new Error("load failed");
      setLoad({ status: "ready", syllabi: data.syllabi });
      setSyllabusId((current) => current ?? data.syllabi![0].syllabusId);
    } catch {
      setLoad({ status: "error" });
    }
  }, []);

  const openDeck = useCallback(async (syllabus: string, topic: string) => {
    setOpening(topic);
    setDeckError(null);
    try {
      const response = await fetch(`/api/study/revision?syllabus=${encodeURIComponent(syllabus)}&topic=${encodeURIComponent(topic)}`);
      const data = (await response.json()) as Deck & { error?: string };
      if (!response.ok || !data.cards?.length) throw new Error(data.error ?? "No cards");
      setDeck(data);
    } catch {
      setDeckError("Couldn't open that topic. Please try again.");
    } finally {
      setOpening(null);
    }
  }, []);

  useEffect(() => { void loadTopics(); }, [loadTopics]);

  // Deep link: /study/revise?syllabus=cambridge-9702&topic=2.1 jumps straight into the deck.
  const deepSyllabus = params.get("syllabus");
  const deepTopic = params.get("topic");
  useEffect(() => { if (deepSyllabus && deepTopic) void openDeck(deepSyllabus, deepTopic); }, [deepSyllabus, deepTopic, openDeck]);

  const exitDeck = () => {
    setDeck(null);
    if (deepTopic) router.replace("/study/revise");
    void loadTopics();
  };

  if (deck) return <DeckSession deck={deck} onExit={exitDeck} />;

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-8">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight text-[var(--foreground)]">Revise by syllabus</h1>
        <p className="mt-1 text-sm text-[var(--muted-foreground)]">Test yourself on the official learning outcomes, then rate how you did. Works offline from AI and never runs out of cards.</p>
      </header>

      {load.status === "loading" && <p role="status" className="flex items-center gap-2 text-sm text-[var(--muted-foreground)]"><Loader2 className="size-4 animate-spin" aria-hidden /> Loading your syllabus…</p>}

      {load.status === "error" && (
        <div role="alert" className={`${card} p-5`}>
          <p className="text-sm text-[var(--foreground)]">We couldn't load the syllabus just now.</p>
          <button type="button" onClick={() => void loadTopics()} className={`${primaryButton} mt-3`}>Try again</button>
        </div>
      )}

      {load.status === "ready" && (
        <>
          <div role="tablist" aria-label="Subject" className="mb-4 flex flex-wrap gap-2">
            {load.syllabi.map((syllabus) => (
              <button
                key={syllabus.syllabusId}
                role="tab"
                aria-selected={syllabus.syllabusId === syllabusId}
                onClick={() => setSyllabusId(syllabus.syllabusId)}
                className={`h-10 rounded-xl px-4 text-sm font-semibold transition-colors ${syllabus.syllabusId === syllabusId ? "bg-[var(--primary)] text-[var(--primary-foreground)]" : "border border-white/10 text-[var(--foreground)] hover:bg-white/5"}`}
              >
                {SUBJECT_LABEL[syllabus.subjectId] ?? syllabus.subjectId}
              </button>
            ))}
          </div>

          {deckError && <p role="alert" className="mb-3 text-sm text-[var(--danger)]">{deckError}</p>}

          <ul className="grid gap-2">
            {load.syllabi.find((syllabus) => syllabus.syllabusId === syllabusId)?.topics.map((topic) => (
              <li key={topic.topicKey}>
                <button
                  type="button"
                  disabled={opening !== null}
                  onClick={() => void openDeck(syllabusId!, topic.topicKey)}
                  className={`${card} flex w-full items-center gap-4 p-4 text-left transition-colors hover:bg-white/5 disabled:opacity-60`}
                >
                  <span className="w-10 shrink-0 text-xs font-semibold text-[var(--muted-foreground)]">{topic.topicKey}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-[var(--foreground)]">{topic.title}</span>
                    <span className="mt-0.5 block text-xs text-[var(--muted-foreground)]">
                      {topic.level ? `${LEVEL_LABEL[topic.level] ?? topic.level} · ` : ""}{topic.mastery === null ? "Not practised yet" : `${topic.mastery}% mastery`}
                    </span>
                  </span>
                  {opening === topic.topicKey ? <Loader2 className="size-4 animate-spin" aria-label="Opening" /> : (
                    <span aria-hidden className="h-1.5 w-16 shrink-0 overflow-hidden rounded-full bg-white/10">
                      <span className="block h-full rounded-full" style={{ width: `${topic.mastery ?? 0}%`, background: "var(--brand-gradient)" }} />
                    </span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </main>
  );
}

function DeckSession({ deck, onExit }: { deck: Deck; onExit: () => void }) {
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [counts, setCounts] = useState<Record<RevisionRating, number>>({ got_it: 0, unsure: 0, not_yet: 0 });
  const [saveFailed, setSaveFailed] = useState(false);
  const [round, setRound] = useState(0);
  const total = deck.cards.length;
  const current = deck.cards[index];
  const done = index >= total;

  const rate = useCallback(async (rating: RevisionRating) => {
    setCounts((previous) => ({ ...previous, [rating]: previous[rating] + 1 }));
    setRevealed(false);
    setIndex((value) => value + 1);
    try {
      const response = await fetch("/api/study/revision", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ syllabus_id: deck.syllabusId, topic_key: deck.topicKey, rating }),
      });
      if (!response.ok) throw new Error("save failed");
    } catch {
      setSaveFailed(true);
    }
  }, [deck.syllabusId, deck.topicKey]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (done || !revealed) return;
      if (event.key === "1") void rate("got_it");
      if (event.key === "2") void rate("unsure");
      if (event.key === "3") void rate("not_yet");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [done, revealed, rate]);

  const progress = useMemo(() => Math.round((Math.min(index, total) / total) * 100), [index, total]);

  return (
    <main className="mx-auto w-full max-w-xl px-4 py-8" key={round}>
      <button type="button" onClick={onExit} className="mb-4 inline-flex items-center gap-2 text-sm font-semibold text-[var(--muted-foreground)] hover:text-[var(--foreground)]">
        <ArrowLeft className="size-4" aria-hidden /> All topics
      </button>
      <h1 className="text-lg font-semibold text-[var(--foreground)]">{deck.topicKey} {deck.topicTitle}</h1>
      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress} aria-label="Deck progress">
        <div className="h-full rounded-full transition-[width] duration-300" style={{ width: `${progress}%`, background: "var(--brand-gradient)" }} />
      </div>

      {!done && current && (
        <section aria-live="polite" className={`${card} mt-6 p-6`}>
          <p className="text-xs font-semibold text-[var(--muted-foreground)]">Card {index + 1} of {total} · outcome {current.outcomeKey}</p>
          <p className="mt-4 text-lg font-semibold leading-snug text-[var(--foreground)]">{current.front}</p>

          {!revealed ? (
            <button type="button" onClick={() => setRevealed(true)} className={`${primaryButton} mt-6 w-full`} autoFocus>Show the outcome</button>
          ) : (
            <>
              <p className="mt-5 whitespace-pre-line rounded-xl bg-white/5 p-4 text-sm leading-relaxed text-[var(--muted-foreground)]">{current.back}</p>
              <p className="mt-5 text-sm font-semibold text-[var(--foreground)]">How well could you answer?</p>
              <div className="mt-2 grid grid-cols-3 gap-2">
                <button type="button" onClick={() => void rate("got_it")} className={ghostButton}><Check className="size-4" aria-hidden /> Got it <kbd className="text-xs opacity-60">1</kbd></button>
                <button type="button" onClick={() => void rate("unsure")} className={ghostButton}><HelpCircle className="size-4" aria-hidden /> Unsure <kbd className="text-xs opacity-60">2</kbd></button>
                <button type="button" onClick={() => void rate("not_yet")} className={ghostButton}><X className="size-4" aria-hidden /> Not yet <kbd className="text-xs opacity-60">3</kbd></button>
              </div>
            </>
          )}
        </section>
      )}

      {done && (
        <section role="status" className={`${card} mt-6 p-6`}>
          <p className="text-lg font-semibold text-[var(--foreground)]">Deck complete</p>
          <p className="mt-2 text-sm text-[var(--muted-foreground)]">{counts.got_it} got it · {counts.unsure} unsure · {counts.not_yet} not yet</p>
          {counts.unsure + counts.not_yet > 0 && <p className="mt-2 text-sm text-[var(--muted-foreground)]">The ones you weren't sure about are in your revision queue.</p>}
          {saveFailed && <p role="alert" className="mt-2 text-sm text-[var(--danger)]">Some ratings couldn't be saved. Check your connection and run the deck again.</p>}
          <div className="mt-5 flex gap-2">
            <button type="button" onClick={() => { setIndex(0); setRevealed(false); setCounts({ got_it: 0, unsure: 0, not_yet: 0 }); setSaveFailed(false); setRound((value) => value + 1); }} className={primaryButton}><RotateCcw className="size-4" aria-hidden /> Run again</button>
            <button type="button" onClick={onExit} className={ghostButton}>All topics</button>
          </div>
        </section>
      )}
    </main>
  );
}
