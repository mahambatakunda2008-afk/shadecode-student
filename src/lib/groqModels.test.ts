import { describe, expect, it } from "vitest";
import { groqModelChain } from "./ai";

describe("groqModelChain", () => {
  it("never includes the retired llama-3.3-70b-versatile by default", () => {
    expect(groqModelChain(undefined)).toEqual(["openai/gpt-oss-120b", "openai/gpt-oss-20b"]);
  });
  it("puts an override first without duplicating it", () => {
    expect(groqModelChain("openai/gpt-oss-20b")).toEqual(["openai/gpt-oss-20b", "openai/gpt-oss-120b"]);
    expect(groqModelChain(" custom/model ")).toEqual(["custom/model", "openai/gpt-oss-120b", "openai/gpt-oss-20b"]);
  });
});
