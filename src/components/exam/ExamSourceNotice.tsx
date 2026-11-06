type ExamPaperSource = "curated-bank" | "deterministic-engine" | "offline";

/** Makes the origin of a non-AI practice paper explicit to the learner. */
export default function ExamSourceNotice({ source }: { source: ExamPaperSource }) {
  const description = source === "curated-bank"
    ? "Curated question bank"
    : source === "deterministic-engine"
      ? "Deterministic question generator"
      : "On-device offline practice set";

  return (
    <p
      role="status"
      className="mx-auto mt-2 w-fit max-w-[92vw] rounded-2xl border border-white/10 bg-[var(--card)] px-4 py-2 text-center text-xs text-[var(--muted-foreground)]"
    >
      Practice paper source: {description}. This paper was generated without a live AI request.
    </p>
  );
}
