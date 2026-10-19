import { describe, expect, it } from "vitest";
import { POST } from "./route";

describe("POST /api/feedback-email", () => {
  it("retires the separately callable email endpoint", async () => {
    const response = await POST();
    expect(response.status).toBe(410);
    expect(await response.json()).toMatchObject({
      success: false,
      error: "Submit feedback through /api/feedback instead.",
    });
  });
});
