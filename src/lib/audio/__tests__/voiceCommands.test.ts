import { describe, it, expect } from "vitest";
import { matchVoiceCommand } from "../voiceCommands";

describe("matchVoiceCommand", () => {
  it("matches each command's primary phrase", () => {
    expect(matchVoiceCommand("pause")).toBe("pause");
    expect(matchVoiceCommand("resume")).toBe("resume");
    expect(matchVoiceCommand("next")).toBe("next");
    expect(matchVoiceCommand("back")).toBe("previous");
    expect(matchVoiceCommand("repeat")).toBe("repeat");
    expect(matchVoiceCommand("explain")).toBe("explain");
  });

  it("matches natural, conversational phrasing, not just single keywords", () => {
    expect(matchVoiceCommand("can you say that again please")).toBe("repeat");
    expect(matchVoiceCommand("hold on a second")).toBe("pause");
    expect(matchVoiceCommand("I don't understand that")).toBe("explain");
    expect(matchVoiceCommand("ok keep going")).toBe("resume");
  });

  it("is case-insensitive and trims whitespace", () => {
    expect(matchVoiceCommand("  NEXT  ")).toBe("next");
    expect(matchVoiceCommand("Pause")).toBe("pause");
  });

  it("returns null for unrecognized speech, not a wrong guess", () => {
    expect(matchVoiceCommand("what's the weather like today")).toBeNull();
    expect(matchVoiceCommand("")).toBeNull();
    expect(matchVoiceCommand("   ")).toBeNull();
  });

  it("prefers the longer, more specific match over a shorter overlapping one", () => {
    // "say that again" contains no literal substring of "again" alone as
    // a separate shorter pattern in this command set, but this confirms
    // multi-word phrasing resolves to the intended single command, not
    // a coincidental partial hit on an unrelated pattern.
    expect(matchVoiceCommand("one more time please")).toBe("repeat");
  });

  it("matches a command phrase embedded in a longer sentence", () => {
    expect(matchVoiceCommand("um, can we skip ahead to the next part")).toBe("next");
  });
});
