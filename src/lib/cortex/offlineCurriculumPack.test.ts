import { afterEach, describe, expect, it, vi } from "vitest";
import { readOfflineCurriculumPack, writeOfflineCurriculumPack } from "./offlineCurriculumPack";

function storage() {
  const values = new Map<string, string>();
  return {
    get length() { return values.size; },
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
    key: (index: number) => [...values.keys()][index] ?? null,
    removeItem: (key: string) => values.delete(key),
  };
}

describe("offline curriculum pack scope", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("reads only the requested board and level when scope is supplied", () => {
    const localStorage = storage();
    vi.stubGlobal("window", { localStorage });
    const base = {
      subject: "Physics",
      objectives: [{ id: "o1", statement: "Wave motion" }],
      knowledge: [],
    };
    writeOfflineCurriculumPack({ ...base, board: "Cambridge", level: "AS" });
    writeOfflineCurriculumPack({ ...base, board: "ZIMSEC", level: "A Level" });

    expect(readOfflineCurriculumPack("Physics", "Cambridge", "AS")?.board).toBe("Cambridge");
    expect(readOfflineCurriculumPack("Physics", "ZIMSEC", "A Level")?.board).toBe("ZIMSEC");
    expect(readOfflineCurriculumPack("Physics", "Cambridge", "A Level")).toBeNull();
  });

  it("does not fall back to another board when an exact scoped pack is missing", () => {
    const localStorage = storage();
    vi.stubGlobal("window", { localStorage });
    writeOfflineCurriculumPack({
      subject: "Physics",
      board: "Cambridge",
      level: "AS",
      objectives: [{ id: "o1", statement: "Wave motion" }],
      knowledge: [],
    });

    expect(readOfflineCurriculumPack("Physics", "ZIMSEC", "A Level")).toBeNull();
  });
});
