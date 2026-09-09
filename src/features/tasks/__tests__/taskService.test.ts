import { describe, expect, it, vi } from "vitest";
import { getTaskById, createTask, updateTask } from "../taskService";
import type { SupabaseClient } from "@supabase/supabase-js";

function mockSelectChain(result: { data: unknown; error: unknown }) {
  const single = vi.fn(async () => result);
  const eq = vi.fn(() => ({ single }));
  const select = vi.fn(() => ({ eq }));
  return { select, eq, single };
}

function mockInsertChain(result: { data: unknown; error: unknown }) {
  const single = vi.fn(async () => result);
  const select = vi.fn(() => ({ single }));
  const insert = vi.fn(() => ({ select }));
  return { insert, select, single };
}

function mockUpdateChain(result: { data: unknown; error: unknown }) {
  const single = vi.fn(async () => result);
  const select = vi.fn(() => ({ single }));
  const eq = vi.fn(() => ({ select }));
  const update = vi.fn(() => ({ eq }));
  return { update, eq, select, single };
}

describe("getTaskById", () => {
  it("throws when no userId is provided", async () => {
    const supabase = { from: vi.fn() } as unknown as SupabaseClient;
    await expect(getTaskById(supabase, "task-1", "")).rejects.toThrow("Authentication required");
  });

  it("throws a not-found error for a missing task", async () => {
    const chain = mockSelectChain({ data: null, error: { code: "PGRST116", message: "no rows" } });
    const supabase = { from: vi.fn(() => chain) } as unknown as SupabaseClient;
    await expect(getTaskById(supabase, "task-1", "user-1")).rejects.toThrow("Task not found.");
  });

  it("throws for an unrelated database error", async () => {
    const chain = mockSelectChain({ data: null, error: { code: "500", message: "connection reset" } });
    const supabase = { from: vi.fn(() => chain) } as unknown as SupabaseClient;
    await expect(getTaskById(supabase, "task-1", "user-1")).rejects.toThrow("connection reset");
  });

  it("rejects a task belonging to a different user", async () => {
    const chain = mockSelectChain({ data: { id: "task-1", user_id: "user-2" }, error: null });
    const supabase = { from: vi.fn(() => chain) } as unknown as SupabaseClient;
    await expect(getTaskById(supabase, "task-1", "user-1")).rejects.toThrow("Unauthorized access");
  });

  it("returns the task when the caller owns it", async () => {
    const task = { id: "task-1", user_id: "user-1", subject_id: null, title: "Revise", completed: false, created_at: "now" };
    const chain = mockSelectChain({ data: task, error: null });
    const supabase = { from: vi.fn(() => chain) } as unknown as SupabaseClient;
    await expect(getTaskById(supabase, "task-1", "user-1")).resolves.toEqual(task);
  });
});

describe("createTask", () => {
  it("inserts the task scoped to the given user", async () => {
    const created = { id: "task-2", user_id: "user-1", subject_id: null, title: "New", completed: false, created_at: "now" };
    const chain = mockInsertChain({ data: created, error: null });
    const supabase = { from: vi.fn(() => chain) } as unknown as SupabaseClient;

    const result = await createTask(supabase, { title: "New" }, "user-1");

    expect(result).toEqual(created);
    expect(chain.insert).toHaveBeenCalledWith({ title: "New", user_id: "user-1" });
  });

  it("throws on a database error", async () => {
    const chain = mockInsertChain({ data: null, error: { message: "constraint violation" } });
    const supabase = { from: vi.fn(() => chain) } as unknown as SupabaseClient;
    await expect(createTask(supabase, { title: "New" }, "user-1")).rejects.toThrow("constraint violation");
  });
});

describe("updateTask", () => {
  it("verifies ownership before updating", async () => {
    const selectChain = mockSelectChain({ data: { id: "task-1", user_id: "user-2" }, error: null });
    const supabase = { from: vi.fn(() => selectChain) } as unknown as SupabaseClient;
    await expect(updateTask(supabase, "task-1", "user-1", { completed: true })).rejects.toThrow("Unauthorized access");
  });

  it("updates the task once ownership is confirmed", async () => {
    const owned = { id: "task-1", user_id: "user-1", subject_id: null, title: "Revise", completed: false, created_at: "now" };
    const updated = { ...owned, completed: true };
    const selectChain = mockSelectChain({ data: owned, error: null });
    const updateChain = mockUpdateChain({ data: updated, error: null });
    const from = vi.fn().mockReturnValueOnce(selectChain).mockReturnValueOnce(updateChain);
    const supabase = { from } as unknown as SupabaseClient;

    const result = await updateTask(supabase, "task-1", "user-1", { completed: true });
    expect(result).toEqual(updated);
  });
});
