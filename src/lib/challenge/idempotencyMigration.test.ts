import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  "supabase/migrations/20261125173000_idempotent_challenge_mark_submissions.sql",
  "utf8",
);

describe("challenge marking idempotency migration contract", () => {
  it("uniquely identifies each learner submission", () => {
    expect(migration).toMatch(/unique\s*\(challenge_id,\s*user_id,\s*submission_id\)/i);
    expect(migration).toMatch(/on conflict\s*\(challenge_id,\s*user_id,\s*submission_id\) do nothing/i);
  });

  it("stores results, battle attempts and learning signals in one RPC transaction", () => {
    expect(migration).toMatch(/create or replace function public\.record_challenge_mark_submission/i);
    expect(migration).toMatch(/insert into public\.challenge_mark_submissions/i);
    expect(migration).toMatch(/insert into public\.challenge_attempts/i);
    expect(migration).toMatch(/insert into public\.learning_signals/i);
    expect(migration.indexOf("insert into public.learning_signals")).toBeLessThan(
      migration.indexOf("return query select true, p_result"),
    );
  });

  it("restricts execution to the service role and revokes browser roles", () => {
    expect(migration).toMatch(/revoke all on function public\.record_challenge_mark_submission\(uuid, uuid, uuid, jsonb, jsonb, jsonb\) from public, anon, authenticated/i);
    expect(migration).toMatch(/grant execute on function public\.record_challenge_mark_submission\(uuid, uuid, uuid, jsonb, jsonb, jsonb\) to service_role/i);
    expect(migration).toMatch(/alter table public\.challenge_mark_submissions enable row level security/i);
  });
});
