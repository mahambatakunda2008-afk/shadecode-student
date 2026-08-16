import { describe, expect, it } from "vitest";
import { USER_SCOPED_MUTATION_STORES } from "../mutationQueue";

describe("offline mutation security boundary", () => {
  it("allows only stores with explicit user ownership", () => {
    expect(USER_SCOPED_MUTATION_STORES.has("tasks")).toBe(true);
    expect(USER_SCOPED_MUTATION_STORES.has("subjects")).toBe(true);
    expect(USER_SCOPED_MUTATION_STORES.has("learn_lessons")).toBe(true);
    expect(USER_SCOPED_MUTATION_STORES.has("profiles")).toBe(false);
    expect(USER_SCOPED_MUTATION_STORES.has("users")).toBe(false);
  });
});
