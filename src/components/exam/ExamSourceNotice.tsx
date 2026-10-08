/**
 * Shown when a built-in practice set replaces a live-generated paper, so the
 * student always knows what they are sitting (no silent downgrade).
 */
export default function ExamSourceNotice() {
  return (
    <p
      role="status"
      className="mx-auto mt-2 w-fit max-w-[92vw] rounded-2xl border border-white/10 bg-[var(--card)] px-4 py-2 text-center text-xs text-[var(--muted-foreground)]"
    >
      Live question generation is unavailable, so this is a built-in practice set for this topic.
    </p>
  );
}
