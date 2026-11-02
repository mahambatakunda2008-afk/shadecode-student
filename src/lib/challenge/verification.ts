/**
 * src/lib/challenge/verification.ts
 *
 * What we can honestly claim about a battle. "Verified" is only ever applied to
 * the friend's attempt on a server-marked paper (the server marked it against a
 * private key). The challenger's own advertised score is read from their saved
 * result and is NOT server-verified yet, so it never carries a Verified badge.
 */

export type MarkingMode = "server" | "client";

export function normaliseMarking(value: unknown): MarkingMode {
  return value === "server" ? "server" : "client";
}

export interface BattleTrust {
  attemptVerified: boolean;
  badge: string;
  note: string;
}

export function battleTrust(marking: MarkingMode): BattleTrust {
  return marking === "server"
    ? { attemptVerified: true, badge: "Verified marking", note: "Your answers are marked on our servers, so the result can’t be edited." }
    : { attemptVerified: false, badge: "Self-reported", note: "This paper is marked in your browser, so the result isn’t independently verified." };
}
