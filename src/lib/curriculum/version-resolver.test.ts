import { describe, expect, it } from "vitest";
import {
  resolveCurriculumVersion,
  type CurriculumVersionCandidate,
} from "./version-resolver";

const older: CurriculumVersionCandidate = {
  id: "cambridge-9701-2025-2027",
  boardId: "cambridge",
  qualificationId: "cambridge-as-a-level",
  subjectId: "9701",
  examYearStart: 2025,
  examYearEnd: 2027,
  complete: true,
  verified: true,
};

const newer: CurriculumVersionCandidate = {
  ...older,
  id: "cambridge-9701-2028-2030",
  examYearStart: 2028,
  examYearEnd: 2030,
};

const request = (examYear: number) => ({
  boardId: "Cambridge",
  qualificationId: "cambridge-as-a-level",
  subjectId: "9701",
  examYear,
});

describe("resolveCurriculumVersion", () => {
  it("selects the version covering the requested exam year, not the newest version", () => {
    expect(resolveCurriculumVersion(request(2026), [older, newer])).toMatchObject({
      status: "resolved",
      version: { id: older.id },
    });
    expect(resolveCurriculumVersion(request(2029), [older, newer])).toMatchObject({
      status: "resolved",
      version: { id: newer.id },
    });
  });

  it("does not fall back to the newest or nearest version when no year matches", () => {
    expect(resolveCurriculumVersion(request(2031), [older, newer]).status).toBe("not_found");
  });

  it("fails closed when the matching version is incomplete or unverified", () => {
    expect(
      resolveCurriculumVersion(request(2026), [{ ...older, verified: false }]),
    ).toMatchObject({ status: "not_verified", candidateId: older.id });
    expect(
      resolveCurriculumVersion(request(2026), [{ ...older, complete: false }]),
    ).toMatchObject({ status: "not_verified", candidateId: older.id });
  });

  it("reports overlapping versions instead of silently choosing one", () => {
    const overlapping = { ...newer, examYearStart: 2027 };
    expect(resolveCurriculumVersion(request(2027), [older, overlapping])).toMatchObject({
      status: "ambiguous",
      candidateIds: [older.id, overlapping.id],
    });
  });

  it("requires an exact route match and does not fall back to route-less content", () => {
    const routeA = { ...older, id: "route-a", routeId: "route-a" };
    const routeB = { ...older, id: "route-b", routeId: "route-b" };
    expect(resolveCurriculumVersion({ ...request(2026), routeId: "route-a" }, [routeA, routeB]))
      .toMatchObject({ status: "resolved", version: { id: "route-a" } });
    expect(resolveCurriculumVersion(request(2026), [routeA, routeB]).status).toBe("not_found");
    expect(resolveCurriculumVersion({ ...request(2026), routeId: "missing" }, [older]).status)
      .toBe("not_found");
  });

  it("rejects incomplete identity and invalid exam years", () => {
    expect(resolveCurriculumVersion({ ...request(2026), subjectId: " " }, [older]).status)
      .toBe("invalid_request");
    expect(resolveCurriculumVersion(request(2026.5), [older]).status).toBe("invalid_request");
  });

  it("normalizes identity casing and whitespace without changing stored identifiers", () => {
    expect(
      resolveCurriculumVersion(
        { ...request(2026), boardId: " CAMBRIDGE " },
        [older],
      ),
    ).toMatchObject({ status: "resolved", version: { id: older.id } });
    expect(older.boardId).toBe("cambridge");
  });
});
