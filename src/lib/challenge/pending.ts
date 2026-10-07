/**
 * src/lib/challenge/pending.ts
 *
 * Remembers which challenge a friend accepted, so the battle survives signup,
 * email verification and onboarding (all of which drop the original URL).
 * A cookie is used rather than sessionStorage because verification links often
 * open in a different tab or browser context.
 */

export const PENDING_CHALLENGE_COOKIE = "pending_challenge";
const ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_AGE_SECONDS = 7 * 24 * 60 * 60;

export interface ChallengeLinkInput {
  id: string;
  subject: string | null;
  difficulty: string | null;
  question_count: number | null;
  percentage: number | null;
  grade: string | null;
  challenger_name: string | null;
}

export function isChallengeId(value: unknown): value is string {
  return typeof value === "string" && ID_PATTERN.test(value);
}

/** Reads the pending id out of a `document.cookie`-style string. */
export function parsePendingChallenge(cookieString: string): string | null {
  for (const part of cookieString.split(";")) {
    const [name, ...rest] = part.trim().split("=");
    if (name === PENDING_CHALLENGE_COOKIE) {
      const value = decodeURIComponent(rest.join("="));
      return isChallengeId(value) ? value : null;
    }
  }
  return null;
}

export function pendingChallengeCookie(id: string): string | null {
  return isChallengeId(id) ? `${PENDING_CHALLENGE_COOKIE}=${id}; path=/; max-age=${MAX_AGE_SECONDS}; SameSite=Lax` : null;
}

export function clearPendingChallengeCookie(): string {
  return `${PENDING_CHALLENGE_COOKIE}=; path=/; max-age=0; SameSite=Lax`;
}

export function setPendingChallenge(id: string) {
  const cookie = pendingChallengeCookie(id);
  if (cookie && typeof document !== "undefined") document.cookie = cookie;
}

export function readPendingChallenge(): string | null {
  return typeof document === "undefined" ? null : parsePendingChallenge(document.cookie);
}

export function clearPendingChallenge() {
  if (typeof document !== "undefined") document.cookie = clearPendingChallengeCookie();
}

/** Single source for the accept URL used by the challenge page and the resume banner. */
export function challengeAcceptUrl(c: ChallengeLinkInput): string {
  const name = c.challenger_name ?? "A friend";
  return (
    `/exam-sim?cid=${c.id}&sub=${encodeURIComponent(c.subject ?? "")}&dif=${encodeURIComponent(c.difficulty ?? "")}` +
    `&cnt=${c.question_count ?? 10}&cpct=${c.percentage ?? 0}&cgrade=${encodeURIComponent(c.grade ?? "")}&cname=${encodeURIComponent(name)}`
  );
}
