import { beforeEach, describe, expect, it, vi } from "vitest";

const { currentUser, authError, roleAllowed, orderMock, selectMock, fromMock, createClientMock } = vi.hoisted(() => ({
  currentUser: { value: null as { id: string } | null },
  authError: { value: null as { message: string } | null },
  roleAllowed: { value: false },
  orderMock: vi.fn(),
  selectMock: vi.fn(),
  fromMock: vi.fn(),
  createClientMock: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: async () => ({
    auth: {
      getUser: async () => ({
        data: { user: currentUser.value },
        error: authError.value,
      }),
    },
  }),
}));

vi.mock("@/lib/auth/rbac", () => ({
  hasUserRole: vi.fn(async () => roleAllowed.value),
}));

vi.mock("@supabase/supabase-js", () => ({
  createClient: createClientMock,
}));

import { GET } from "./route";
import { hasUserRole } from "@/lib/auth/rbac";

const get = () => GET();

beforeEach(() => {
  currentUser.value = null;
  authError.value = null;
  roleAllowed.value = false;
  orderMock.mockReset().mockResolvedValue({ data: [], error: null });
  selectMock.mockReset().mockReturnValue({ order: orderMock });
  fromMock.mockReset().mockReturnValue({ select: selectMock });
  createClientMock.mockReset().mockReturnValue({ from: fromMock });
  vi.mocked(hasUserRole).mockClear();
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-role-key";
});

describe("GET /api/admin/feedback", () => {
  it("rejects an unauthenticated request before creating a service client", async () => {
    const response = await get();

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: "Unauthorized" });
    expect(hasUserRole).not.toHaveBeenCalled();
    expect(createClientMock).not.toHaveBeenCalled();
  });

  it("rejects an authentication error even if a user object is present", async () => {
    currentUser.value = { id: "user-1" };
    authError.value = { message: "session lookup failed" };

    const response = await get();

    expect(response.status).toBe(401);
    expect(createClientMock).not.toHaveBeenCalled();
  });

  it("rejects a signed-in non-admin before accessing feedback records", async () => {
    currentUser.value = { id: "student-1" };
    roleAllowed.value = false;

    const response = await get();

    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({ error: "Admin access required" });
    expect(hasUserRole).toHaveBeenCalledWith("student-1", "admin");
    expect(createClientMock).not.toHaveBeenCalled();
  });

  it("returns feedback only after server-side admin authorization", async () => {
    currentUser.value = { id: "admin-1" };
    roleAllowed.value = true;
    const feedback = [{ id: "feedback-1", type: "bug", message: "Lesson generation failed" }];
    orderMock.mockResolvedValueOnce({ data: feedback, error: null });

    const response = await get();

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ feedback });
    expect(hasUserRole).toHaveBeenCalledWith("admin-1", "admin");
    expect(createClientMock).toHaveBeenCalledWith(
      "https://example.supabase.co",
      "test-service-role-key",
      { auth: { autoRefreshToken: false, persistSession: false } },
    );
    expect(fromMock).toHaveBeenCalledWith("feedback");
    expect(selectMock).toHaveBeenCalledWith("*");
    expect(orderMock).toHaveBeenCalledWith("created_at", { ascending: false });
  });

  it("does not return records when the database query fails", async () => {
    currentUser.value = { id: "admin-1" };
    roleAllowed.value = true;
    orderMock.mockResolvedValueOnce({ data: null, error: { message: "database unavailable" } });

    const response = await get();

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ error: "database unavailable" });
  });
});
