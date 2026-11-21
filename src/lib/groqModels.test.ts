import { describe, expect, it } from "vitest";
import { groqModelChain } from "./ai";

describe("groqModelChain", () => {
  it("never includes the retired llama-3.3-70b-versatile by default", () => {
    expect(groqModelChain(undefined)).toEqual(["openai/gpt-oss-120b", "qwen/qwen3.6-27b"]);
  });
  it("puts an override first without duplicating it", () => {
    expect(groqModelChain("qwen/qwen3.6-27b")).toEqual(["qwen/qwen3.6-27b", "openai/gpt-oss-120b"]);
    expect(groqModelChain(" custom/model ")).toEqual(["custom/model", "openai/gpt-oss-120b", "qwen/qwen3.6-27b"]);
  });
});
