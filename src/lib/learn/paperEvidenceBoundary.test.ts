import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("paper-learning server-owned evidence boundary", () => {
  const migration = readFileSync(
    "supabase/migrations/20261125160000_server_owned_paper_learning_evidence.sql",
    "utf8",
  );

  it("restores the client action id contract and makes submissions idempotent", () => {
    expect(migration).toContain("add column if not exists client_action_id text");
    expect(migration).toContain("on public.paper_learning_attempts (session_id, user_id, client_action_id)");
    expect(migration).toContain("where client_action_id is not null");
  });

  it("removes browser insert and delete access to graded attempts", () => {
    expect(migration).toContain('drop policy if exists "paper learning attempts are insertable by owner"');
    expect(migration).toContain('drop policy if exists "paper_learning_attempts_insert_owner"');
    expect(migration).toContain('drop policy if exists "paper learning attempts are deletable by owner"');
  });

  it("prevents browser creation or mutation of server-generated paper sessions", () => {
    expect(migration).toContain('drop policy if exists "paper learning sessions are insertable by owner"');
    expect(migration).toContain('drop policy if exists "paper learning sessions are updateable by owner"');
  });
});
