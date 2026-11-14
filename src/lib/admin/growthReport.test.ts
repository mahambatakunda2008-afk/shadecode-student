import { describe, expect, it } from "vitest";
import { buildGrowthReport, type EventRow } from "./growthReport";

const now = new Date("2026-11-14T12:00:00Z"); // a Saturday
const ev = (name: string, user: string | null, at: string, properties?: Record<string, unknown>): EventRow => ({ name, user_id: user, created_at: at, properties });

describe("headline metrics", () => {
  const signups = [
    { id: "a", created_at: "2026-11-13T08:00:00Z" },
    { id: "b", created_at: "2026-11-12T08:00:00Z" },
    { id: "c", created_at: "2026-11-05T08:00:00Z" }, // previous 7d window
    { id: "d", created_at: "2026-11-04T08:00:00Z" },
  ];
  it("counts unique students, not events, and compares signup weeks", () => {
    const r = buildGrowthReport({
      events: [
        ev("page_view", "a", "2026-11-14T09:00:00Z"), ev("page_view", "a", "2026-11-14T10:00:00Z"),
        ev("exam_started", "b", "2026-11-14T09:00:00Z"), ev("page_view", "c", "2026-11-10T09:00:00Z"),
        ev("page_view", null, "2026-11-14T09:00:00Z"),
      ],
      signups, now,
    });
    expect(r.headline.dau).toBe(2); // a, b — not 3, anonymous excluded
    expect(r.headline.wau).toBe(3); // a, b, c
    expect(r.headline.engagedWau).toBe(1); // only b started learning
    expect(r.headline.signups7d).toBe(2);
    expect(r.headline.signupsPrev7d).toBe(2);
    expect(r.headline.signupsGrowthPct).toBe(0);
  });
  it("never divides by zero", () => {
    const r = buildGrowthReport({ events: [], signups: [], now });
    expect(r.headline.signupsGrowthPct).toBeNull();
    expect(r.headline.stickinessPct).toBeNull();
    expect(r.funnel[0].users).toBe(0);
    expect(r.funnel[1].ofSignups).toBeNull();
    expect(r.health.anonymousPct).toBeNull();
  });
  it("builds a continuous daily series", () => {
    const r = buildGrowthReport({ events: [], signups: [], now, seriesDays: 14 });
    expect(r.series).toHaveLength(14);
    expect(r.series.at(-1)?.day).toBe("2026-11-14");
    expect(r.series[0].day).toBe("2026-11-01");
  });
});

describe("activation funnel", () => {
  const signups = ["u1", "u2", "u3", "u4"].map((id) => ({ id, created_at: "2026-11-10T08:00:00Z" }));
  const events = [
    ev("page_view", "u1", "2026-11-10T09:00:00Z"), ev("learning_action_started", "u1", "2026-11-10T09:05:00Z"),
    ev("learning_session_completed", "u1", "2026-11-10T09:30:00Z"), ev("page_view", "u1", "2026-11-12T09:00:00Z"),
    ev("result_shared", "u1", "2026-11-12T09:10:00Z"),
    ev("page_view", "u2", "2026-11-10T10:00:00Z"), ev("exam_started", "u2", "2026-11-10T10:05:00Z"),
    ev("page_view", "u3", "2026-11-10T11:00:00Z"),
    ev("learning_action_started", "u4", "2026-11-09T09:00:00Z"), // BEFORE signup: must not count
  ];
  const r = buildGrowthReport({ events, signups, now });
  const step = (k: string) => r.funnel.find((s) => s.key === k)!;
  it("counts only events after signup, each student once per step", () => {
    expect(step("signed_up").users).toBe(4);
    expect(step("opened").users).toBe(3);
    expect(step("started").users).toBe(2);
    expect(step("done").users).toBe(1);
    expect(step("returned").users).toBe(1);
    expect(step("shared").users).toBe(1);
  });
  it("computes conversion against signups and the previous step", () => {
    expect(step("started").ofSignups).toBe(50);
    expect(step("started").ofPrevious).toBe(67);
  });
  it("excludes signups older than the funnel window", () => {
    const old = buildGrowthReport({ events: [], signups: [{ id: "x", created_at: "2026-09-01T00:00:00Z" }], now });
    expect(old.funnel[0].users).toBe(0);
  });
});

describe("cohort retention", () => {
  it("uses rolling D1/D7 and only for students old enough", () => {
    const signups = [
      { id: "a", created_at: "2026-11-02T08:00:00Z" },
      { id: "b", created_at: "2026-11-02T09:00:00Z" },
      { id: "c", created_at: "2026-11-13T09:00:00Z" },
    ];
    const events = [
      ev("page_view", "a", "2026-11-03T08:00:00Z"), ev("page_view", "a", "2026-11-10T08:00:00Z"),
      ev("page_view", "b", "2026-11-02T10:00:00Z"),
    ];
    const r = buildGrowthReport({ events, signups, now });
    const old = r.cohorts.find((c) => c.weekStart === "2026-11-02")!;
    expect(old.size).toBe(2);
    expect(old.d1).toBe(50); // a returned the next day, b did not
    expect(old.d7).toBe(50); // a was active on day 8
    expect(old.d30).toBeNull(); // nobody is 30 days old yet
    const fresh = r.cohorts.find((c) => c.weekStart === "2026-11-09")!;
    expect(fresh.d1).toBe(0); // c is 1 day old and has not returned
    expect(fresh.d7).toBeNull();
  });
});

describe("adoption of shipped features", () => {
  it("splits first-step clicks by syllabus vs generic and groups sources", () => {
    const events = [
      ev("learning_action_started", "u1", "2026-11-14T08:00:00Z", { source: "dashboard_first_lesson", curriculum_step: true }),
      ev("learning_action_started", "u2", "2026-11-14T08:00:00Z", { source: "dashboard_first_lesson", curriculum_step: false }),
      ev("learning_action_started", "u3", "2026-11-14T08:00:00Z", { source: "dashboard_goal", kind: "review" }),
      ev("learning_action_started", "u3", "2026-11-14T09:00:00Z", { source: "dashboard_goal", kind: "exam_prep" }),
      ev("learning_action_started", "u4", "2026-11-14T09:00:00Z", { source: "learn_next_topic" }),
      ev("result_shared", "u1", "2026-11-14T09:00:00Z", { channel: "whatsapp", source: "lesson_quiz" }),
    ];
    const r = buildGrowthReport({ events, signups: [], now });
    expect(r.adoption.firstStep).toEqual({ syllabus: 1, generic: 1 });
    expect(r.adoption.actionSources.find((s) => s.label === "dashboard_goal")).toEqual({ label: "dashboard_goal", events: 2, users: 1 });
    expect(r.adoption.goalKinds.map((g) => g.label).sort()).toEqual(["exam_prep", "review"]);
    expect(r.adoption.shares[0]).toEqual({ label: "lesson_quiz · whatsapp", events: 1, users: 1 });
  });
  it("ignores rows with unparseable timestamps", () => {
    const r = buildGrowthReport({ events: [ev("page_view", "u1", "not-a-date")], signups: [], now });
    expect(r.health.eventsAnalysed).toBe(0);
  });
});
