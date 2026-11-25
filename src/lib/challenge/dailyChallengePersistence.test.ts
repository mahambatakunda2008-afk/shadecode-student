import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("daily challenge persistence contract", () => {
  it("uses a per-user, per-Harare-day assignment instead of the global definition table", () => {
    const route = readFileSync("src/app/api/challenges/today/route.js", "utf8");
    expect(route).toContain('timeZone: "Africa/Harare"');
    expect(route).toContain('.from("daily_challenge_assignments")');
    expect(route).toContain('.eq("user_id", user.id)');
    expect(route).toContain('.eq("challenge_date", today)');
    expect(route).not.toContain('.from("daily_challenges")');
  });

  it("loads learning signals only for the authenticated learner", () => {
    const route = readFileSync("src/app/api/challenges/today/route.js", "utf8");
    expect(route).toContain('.from("subjects").select("name").eq("user_id", user.id)');
    expect(route).toContain('.from("tasks").select("title, completed").eq("user_id", user.id)');
    expect(route).toContain('.from("exams").select("subject, exam_date").eq("user_id", user.id)');
  });

  it("delegates completion and XP to the idempotent database function", () => {
    const route = readFileSync("src/app/api/challenges/today/complete/route.js", "utf8");
    expect(route).toContain('rpc("complete_daily_challenge"');
    expect(route).toContain("p_user_id: user.id");
    expect(route).not.toContain('.from("xp")');
    expect(route).not.toContain('.from("daily_challenges")');
  });

  it("locks an assignment and awards XP only on its first completion", () => {
    const migration = readFileSync(
      "supabase/migrations/20261125120000_daily_challenge_user_assignments.sql",
      "utf8"
    );
    expect(migration).toContain("UNIQUE (user_id, challenge_date)");
    expect(migration).toContain("FOR UPDATE");
    expect(migration).toContain("assignment_row.completed_at IS NOT NULL");
    expect(migration).toContain("PERFORM public.increment_xp(p_user_id, reward)");
    expect(migration).toContain("TO service_role");
  });
});
