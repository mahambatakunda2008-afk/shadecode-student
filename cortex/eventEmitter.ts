export type CortexEvent = {
  type: "feature_opportunity";
  signal: string;
  module: string;
  severity: "low" | "medium" | "high";
  hint?: string;
};

export function emitEvent(event: CortexEvent) {
  console.log("Cortex Event:", event);

  // Lazy require, not a static import, is intentional here: intentEngine.ts
  // imports CortexEvent from this same file, so a static import would be
  // circular. Deferring to call-time avoids that.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { processEvent } = require("../automation/intentEngine");
  processEvent(event);
}