import { beforeEach, describe, expect, it, vi } from "vitest";
import { loadLibrary, resetLibraryCache } from "./store";
import { search } from "./bm25";

const row = (id: string, title: string, text: string) => ({ id, title, topic: null, subject: "Physics", difficulty: "medium", blocks: [{ type: "text", title, content: text }], search_text: `${title} ${text}`, helpful_up: 0, helpful_down: 0 });

function client(result: { data: unknown[] | null; error: unknown }) {
  const select = vi.fn(async () => result);
  return { client: { from: () => ({ select }) }, select };
}

describe("loadLibrary", () => {
  beforeEach(() => resetLibraryCache());

  it("indexes the rows so they can be searched", async () => {
    const { client } = client2([row("a", "Kinematics", "velocity and acceleration"), row("b", "Waves", "frequency and wavelength")]);
    const library = await loadLibrary(client as never);
    expect(library.rows.size).toBe(2);
    expect(search(library.index, "wavelength")[0].id).toBe("b");
  });

  it("caches for a few minutes, then reloads", async () => {
    const { client, select } = client2([row("a", "Kinematics", "velocity")]);
    await loadLibrary(client as never, 1_000);
    await loadLibrary(client as never, 1_000 + 60_000);
    expect(select).toHaveBeenCalledTimes(1);
    await loadLibrary(client as never, 1_000 + 6 * 60_000);
    expect(select).toHaveBeenCalledTimes(2);
  });

  it("serves a stale library rather than failing when a reload errors", async () => {
    const good = client2([row("a", "Kinematics", "velocity")]);
    await loadLibrary(good.client as never, 0);
    const bad = client({ data: null, error: new Error("down") });
    const library = await loadLibrary(bad.client as never, 10 * 60_000);
    expect(library.rows.size).toBe(1);
  });

  it("throws when there is nothing to serve", async () => {
    await expect(loadLibrary(client({ data: null, error: new Error("down") }).client as never)).rejects.toThrow();
  });

  it("skips malformed rows", async () => {
    const { client } = client2([row("a", "Ok", "text here"), { id: "bad", blocks: "not an array" }, null]);
    expect((await loadLibrary(client as never)).rows.size).toBe(1);
  });
});

function client2(data: unknown[]) {
  return client({ data, error: null });
}
