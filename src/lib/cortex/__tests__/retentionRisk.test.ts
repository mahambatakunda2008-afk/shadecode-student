import { describe, it, expect } from "vitest";
import { calculateRetentionRisk, rankByRetentionRisk, type TopicMasteryInput } from "../retentionRisk";

const NOW = new Date("2026-08-07T12:00:00Z");

function daysAgo(days: number): string {
  const d = new Date(NOW);
  d.setDate(d.getDate() - days);
  return d.toISOString();
}

describe("calculateRetentionRisk", () => {
  it("reviewed today has zero risk and a fresh-sounding reason", () => {
    const result = calculateRetentionRisk(
      { subject: "Math", topic: "Algebra", mastery_score: 80, last_attempted: NOW.toISOString(), trend: 0 },
      NOW
    );
    expect(result.daysSinceReview).toBe(0);
    expect(result.riskScore).toBe(0);
    expect(result.isAtRisk).toBe(false);
    expect(result.reason).toMatch(/today/i);
  });

  it("risk increases with days since review", () => {
    const recent = calculateRetentionRisk(
      { subject: "Math", topic: "Algebra", mastery_score: 70, last_attempted: daysAgo(3), trend: 0 },
      NOW
    );
    const stale = calculateRetentionRisk(
      { subject: "Math", topic: "Algebra", mastery_score: 70, last_attempted: daysAgo(20), trend: 0 },
      NOW
    );
    expect(stale.riskScore).toBeGreaterThan(recent.riskScore);
  });

  it("a weak topic decays faster than a strong topic at the same staleness", () => {
    const weak = calculateRetentionRisk(
      { subject: "Math", topic: "Algebra", mastery_score: 20, last_attempted: daysAgo(10), trend: 0 },
      NOW
    );
    const strong = calculateRetentionRisk(
      { subject: "Math", topic: "Algebra", mastery_score: 95, last_attempted: daysAgo(10), trend: 0 },
      NOW
    );
    expect(weak.riskScore).toBeGreaterThan(strong.riskScore);
  });

  it("even a fully-mastered topic still accrues some risk over a long enough gap", () => {
    const result = calculateRetentionRisk(
      { subject: "Math", topic: "Algebra", mastery_score: 100, last_attempted: daysAgo(90), trend: 0 },
      NOW
    );
    expect(result.riskScore).toBeGreaterThan(0);
  });

  it("a declining trend adds a bounded penalty on top of staleness", () => {
    const flat = calculateRetentionRisk(
      { subject: "Math", topic: "Algebra", mastery_score: 60, last_attempted: daysAgo(5), trend: 0 },
      NOW
    );
    const declining = calculateRetentionRisk(
      { subject: "Math", topic: "Algebra", mastery_score: 60, last_attempted: daysAgo(5), trend: -15 },
      NOW
    );
    expect(declining.riskScore).toBeGreaterThan(flat.riskScore);
    // penalty is capped at 20 regardless of how negative trend is
    const extremeDecline = calculateRetentionRisk(
      { subject: "Math", topic: "Algebra", mastery_score: 60, last_attempted: daysAgo(5), trend: -999 },
      NOW
    );
    expect(extremeDecline.riskScore - flat.riskScore).toBeLessThanOrEqual(20);
  });

  it("never exceeds 100 even with maximal staleness and weakness", () => {
    const result = calculateRetentionRisk(
      { subject: "Math", topic: "Algebra", mastery_score: 0, last_attempted: daysAgo(9999), trend: -9999 },
      NOW
    );
    expect(result.riskScore).toBeLessThanOrEqual(100);
  });

  it("isAtRisk flips true only once the threshold is crossed", () => {
    const belowThreshold = calculateRetentionRisk(
      { subject: "Math", topic: "Algebra", mastery_score: 90, last_attempted: daysAgo(1), trend: 0 },
      NOW
    );
    expect(belowThreshold.isAtRisk).toBe(false);

    const aboveThreshold = calculateRetentionRisk(
      { subject: "Math", topic: "Algebra", mastery_score: 10, last_attempted: daysAgo(60), trend: -20 },
      NOW
    );
    expect(aboveThreshold.isAtRisk).toBe(true);
  });
});

describe("rankByRetentionRisk", () => {
  it("sorts topics highest risk first", () => {
    const topics: TopicMasteryInput[] = [
      { subject: "Math", topic: "Fresh", mastery_score: 90, last_attempted: daysAgo(1), trend: 0 },
      { subject: "Math", topic: "Stale", mastery_score: 20, last_attempted: daysAgo(30), trend: -10 },
      { subject: "Math", topic: "Medium", mastery_score: 60, last_attempted: daysAgo(10), trend: 0 },
    ];
    const ranked = rankByRetentionRisk(topics, NOW);
    expect(ranked[0].topic).toBe("Stale");
    expect(ranked[ranked.length - 1].topic).toBe("Fresh");
    // confirm actual sort order, not just endpoints
    for (let i = 0; i < ranked.length - 1; i++) {
      expect(ranked[i].riskScore).toBeGreaterThanOrEqual(ranked[i + 1].riskScore);
    }
  });

  it("handles an empty topic list", () => {
    expect(rankByRetentionRisk([], NOW)).toEqual([]);
  });
});
