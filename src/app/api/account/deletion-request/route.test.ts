import { beforeEach, describe, expect, it, vi } from "vitest";

const { getUserMock, rpcMock, currentUser, rpcResult } = vi.hoisted(() => ({
  getUserMock: vi.fn(),
  rpcMock: vi.fn(),
  currentUser: { value: null as { id: string } | null },
  rpcResult: { value: { data: "request-123", error: null as null | { code?: string; message: string } } },
}));

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: async () => ({
    auth: { getUser: getUserMock },
    rpc: rpcMock,
  }),
}));

import { POST } from "./route";

beforeEach(() => {
  currentUser.value = null;
  rpcResult.value = { data: "request-123", error: null };
  getUserMock.mockReset().mockImplementation(async () => ({ data: { user: currentUser.value }, error: null }));
  rpcMock.mockReset().mockImplementation(async () => rpcResult.value);
});

describe("POST /api/account/deletion-request", () => {
  it("requires an authenticated user", async () => {
    const response = await POST();
    expect(response.status).toBe(401);
    expect(rpcMock).not.toHaveBeenCalled();
  });

  it("creates a durable request through the identity-bound RPC", async () => {
    currentUser.value = { id: "user-1" };
    const response = await POST();
    expect(response.status).toBe(202);
    expect(await response.json()).toMatchObject({
      accepted: true,
      requestId: "request-123",
      status: "pending",
      automaticDeletion: false,
    });
    expect(rpcMock).toHaveBeenCalledWith("request_account_deletion");
  });

  it("requires recent re-authentication", async () => {
    currentUser.value = { id: "user-1" };
    rpcResult.value = { data: null, error: { code: "28000", message: "Recent re-authentication required" } };
    const response = await POST();
    expect(response.status).toBe(403);
    expect((await response.json()).error).toMatch(/sign out and sign back in/i);
  });

  it("does not leak database error details", async () => {
    currentUser.value = { id: "user-1" };
    rpcResult.value = { data: null, error: { code: "XX000", message: "sensitive database detail" } };
    const response = await POST();
    expect(response.status).toBe(503);
    expect(await response.text()).not.toContain("sensitive database detail");
  });

  it("fails closed if the RPC does not return a request identifier", async () => {
    currentUser.value = { id: "user-1" };
    rpcResult.value = { data: null, error: null };
    const response = await POST();
    expect(response.status).toBe(503);
  });
});
