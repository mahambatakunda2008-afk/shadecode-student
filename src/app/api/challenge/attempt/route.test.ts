import { beforeEach, describe, expect, it, vi } from "vitest";

let currentUser: { id: string } | null = { id: "player-1" };
let challengeExists = true;
let marking: "server" | "client" | null = "client";
const inserted = vi.fn();

vi.mock("@/lib/rate-limit/limiter", () => ({
  applyRateLimit: async () => null,
  generalApiLimiter: {},
}));
vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: async () => ({
    auth: { getUser: async () => ({ data: { user: currentUser }, error: null }) },
    from: (table: string) => {
      if (table === "challenges") {
        const builder: any = {
          select: () => builder,
          eq: () => builder,
          maybeSingle: async () => ({ data: challengeExists ? { id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa", challenger_id: "owner-1" } : null, error: null }),
        };
        return builder;
      }
      if (table === "challenge_questions") {
        const builder: any = {
          select: () => builder,
          eq: () => builder,
          maybeSingle: async () => ({ data: marking ? { marking } : null, error: null }),
        };
        return builder;
      }
      if (table === "profiles") {
        const builder: any = {
          select: () => builder,
          eq: () => builder,
          maybeSingle: async () => ({ data: { username: "player", display_name: "Player" }, error: null }),
        };
        return builder;
      }
      if (table === "challenge_attempts") return {
        insert: async (value: unknown) => { inserted(value); return { error: null }; },
      };
      throw new Error(`Unexpected table: ${table}`);
    },
  }),
}));

import { POST } from "./route";

const request = (body: unknown) => new Request("http://localhost/api/challenge/attempt", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body),
});

const validAttempt = {
  challenge_id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
  percentage: 100,
  total_score: 100,
  max_score: 100,
  time_taken: 60,
  grade: "A*",
};

beforeEach(() => {
  currentUser = { id: "player-1" };
  challengeExists = true;
  marking = "client";
  inserted.mockReset();
});

describe("POST /api/challenge/attempt score integrity", () => {
  it("requires authentication", async () => {
    currentUser = null;
    expect((await POST(request(validAttempt) as never)).status).toBe(401);
    expect(inserted).not.toHaveBeenCalled();
  });

  it("routes server-marked challenges through authoritative marking", async () => {
    marking = "server";
    const response = await POST(request(validAttempt) as never);
    expect(response.status).toBe(409);
    expect((await response.json()).code).toBe("SERVER_MARKING_REQUIRED");
    expect(inserted).not.toHaveBeenCalled();
  });

  it("never grants a win from a client-reported score", async () => {
    const response = await POST(request(validAttempt) as never);
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ won: false, verified: false });
    expect(inserted).toHaveBeenCalledWith(expect.objectContaining({
      percentage: 100,
      won: false,
      verified: false,
    }));
  });

  it("returns not found for unknown challenges", async () => {
    challengeExists = false;
    expect((await POST(request(validAttempt) as never)).status).toBe(404);
    expect(inserted).not.toHaveBeenCalled();
  });
});
