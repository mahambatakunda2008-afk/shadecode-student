import { describe, expect, it, vi } from "vitest";
import { getAuthorizedTask, UnauthorizedError } from "./auth_utils";
import type { SupabaseClient } from "@supabase/supabase-js";

function mockClient(opts: {
  user?: { id: string } | null;
  userError?: unknown;
  task?: unknown;
  dbError?: { code?: string; message?: string } | null;
}) {
  const single = vi.fn(async () => ({ data: opts.task ?? null, error: opts.dbError ?? null }));
  const eq = vi.fn(() => ({ single }));
  const select = vi.fn(() => ({ eq }));
  const from = vi.fn(() => ({ select }));
  const getUser = vi.fn(async () => ({ data: { user: opts.user ?? null }, error: opts.userError ?? null }));
  return { auth: { getUser }, from } as unknown as SupabaseClient;
}

describe("getAuthorizedTask", () => {
  it("throws UnauthorizedError when there is no authenticated user", async () => {
    const supabase = mockClient({ user: null });
    await expect(getAuthorizedTask(supabase, 1)).rejects.toThrow(UnauthorizedError);
  });

  it("throws UnauthorizedError when Supabase auth itself errors", async () => {
    const supabase = mockClient({ userError: { message: "network down" } });
    await expect(getAuthorizedTask(supabase, 1)).rejects.toThrow(UnauthorizedError);
  });

  it("throws UnauthorizedError when the task does not exist (PGRST116)", async () => {
    const supabase = mockClient({ user: { id: "user-1" }, task: null, dbError: { code: "PGRST116" } });
    await expect(getAuthorizedTask(supabase, 1)).rejects.toThrow(UnauthorizedError);
  });

  it("throws a plain Error for unrelated database failures", async () => {
    const supabase = mockClient({ user: { id: "user-1" }, dbError: { code: "500", message: "connection reset" } });
    await expect(getAuthorizedTask(supabase, 1)).rejects.toThrow("connection reset");
  });

  it("throws UnauthorizedError when the task belongs to a different user", async () => {
    const supabase = mockClient({ user: { id: "user-1" }, task: { id: 1, user_id: "user-2" } });
    await expect(getAuthorizedTask(supabase, 1)).rejects.toThrow(UnauthorizedError);
  });

  it("returns the task when the caller owns it", async () => {
    const supabase = mockClient({ user: { id: "user-1" }, task: { id: 1, user_id: "user-1", title: "Revise calculus" } });
    await expect(getAuthorizedTask(supabase, 1)).resolves.toEqual({ id: 1, user_id: "user-1", title: "Revise calculus" });
  });
});
