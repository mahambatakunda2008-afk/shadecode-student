/** What a learner is told about a tutorial's verification. Pure so it can be tested and reused by the API and UI. */
export interface VerificationInfo {
  verifiedAt?: string | null;
  reviewCount?: number | null;
}

export function describeVerification({ verifiedAt, reviewCount }: VerificationInfo): string {
  const parts: string[] = [];
  const n = typeof reviewCount === "number" && reviewCount > 0 ? Math.floor(reviewCount) : 0;
  if (n > 0) parts.push(n === 1 ? "Reviewed by a teacher" : `Reviewed by ${n} teachers`);
  const when = verifiedAt ? new Date(verifiedAt) : null;
  if (when && !Number.isNaN(when.getTime())) {
    parts.push(when.toLocaleDateString("en-GB", { month: "short", year: "numeric" }));
  }
  return parts.join(" · ") || "Checked by a teacher before publishing";
}
