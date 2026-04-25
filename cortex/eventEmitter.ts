export type CortexEvent = {
  type: "feature_opportunity";
  signal: string;
  module: string;
  severity: "low" | "medium" | "high";
  hint?: string;
};

export function emitEvent(event: CortexEvent) {
  console.log("Cortex Event:", event);

  // For now, directly pass to intent engine
  const { processEvent } = require("../automation/intentEngine");
  processEvent(event);
}