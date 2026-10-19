import { describe, expect, it } from "vitest";
import { getGenerationStatusText } from "./generationStatusText";

describe("getGenerationStatusText", () => {
  it("describes active generation states without implying a precise completion percentage", () => {
    expect(getGenerationStatusText("queued")).toBe("Queued safely on this device");
    expect(getGenerationStatusText("warming")).toBe("Preparing recovery options");
    expect(getGenerationStatusText("generating")).toBe("Generating and checking content");
    expect(getGenerationStatusText("partial")).toBe("Checkpoint saved. Continuing from the last completed section.");
  });

  it("defines stable labels for terminal states too", () => {
    expect(getGenerationStatusText("complete")).toBe("Ready");
    expect(getGenerationStatusText("failed")).toBe("Generation stopped");
    expect(getGenerationStatusText("cancelled")).toBe("Cancelled");
  });
});
