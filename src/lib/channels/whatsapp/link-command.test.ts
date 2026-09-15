import { describe, expect, it } from "vitest";

function parseLinkCommand(text: string): string | null {
  const match = text.trim().match(/^(?:LINK|CONNECT)\s+([A-Z0-9]{8})$/i);
  return match?.[1]?.toUpperCase() ?? null;
}

describe("WhatsApp link command", () => {
  it("accepts LINK and CONNECT commands case-insensitively", () => {
    expect(parseLinkCommand("LINK ab12cd34")).toBe("AB12CD34");
    expect(parseLinkCommand("connect 1234abcd")).toBe("1234ABCD");
  });

  it("rejects malformed commands", () => {
    expect(parseLinkCommand("LINK 123")).toBeNull();
    expect(parseLinkCommand("LINK 123456789")).toBeNull();
    expect(parseLinkCommand("hello LINK 12345678")).toBeNull();
  });
});
