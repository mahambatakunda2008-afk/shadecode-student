/**
 * src/lib/cortex/startReview.ts
 *
 * Shared by every surface that launches a review (Revision Hub, dashboard
 * goals). The active-review marker is what lets later quiz/exam answers be
 * credited to this review session, so all entry points must write it the same way.
 */

export const ACTIVE_REVIEW_KEY = "shadecode:cortex:active-review:v1";

export function reviewHref(subjectKey: string, topicId: string): string {
  return `/learn?subject=${encodeURIComponent(subjectKey)}&topic=${encodeURIComponent(topicId)}`;
}

/** Records the active review in sessionStorage. Never throws (storage can be unavailable). */
export function beginReviewSession(target: { subjectKey: string; topicId: string }): string {
  const reviewSessionId =
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : `review-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  try {
    sessionStorage.setItem(
      ACTIVE_REVIEW_KEY,
      JSON.stringify({
        reviewSessionId,
        subjectKey: target.subjectKey,
        topicId: target.topicId,
        startedAt: new Date().toISOString(),
      }),
    );
  } catch {
    // Storage unavailable: the review still opens, it just cannot be credited.
  }
  return reviewSessionId;
}
