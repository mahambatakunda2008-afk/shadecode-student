import { describe, expect, it } from "vitest";
import { challengeAcceptUrl, clearPendingChallengeCookie, parsePendingChallenge, pendingChallengeCookie } from "./pending";

const ID = "3f2b8c1e-1234-4abc-9def-1234567890ab";

describe("pending challenge cookie", () => {
  it("round-trips a valid id", () => {
    const cookie = pendingChallengeCookie(ID)!;
    expect(cookie).toContain("max-age=604800");
    expect(parsePendingChallenge(`theme=dark; ${cookie.split(";")[0]}; other=1`)).toBe(ID);
  });
  it("rejects non-uuid values", () => {
    expect(pendingChallengeCookie("not-an-id")).toBeNull();
    expect(parsePendingChallenge("pending_challenge=../../etc")).toBeNull();
    expect(parsePendingChallenge("")).toBeNull();
  });
  it("clears by expiring the cookie", () => {
    expect(clearPendingChallengeCookie()).toContain("max-age=0");
  });
});

describe("challengeAcceptUrl", () => {
  it("encodes every field and defaults the name", () => {
    const url = challengeAcceptUrl({ id: ID, subject: "Computer Science", difficulty: "A-Level", question_count: 10, percentage: 72, grade: "A*", challenger_name: null });
    expect(url).toBe(`/exam-sim?cid=${ID}&sub=Computer%20Science&dif=A-Level&cnt=10&cpct=72&cgrade=A*&cname=A%20friend`);
  });
});
