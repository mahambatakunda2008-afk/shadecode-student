import { buildStudyCapabilities } from "./study";
import { createCortexPlan, createCortexTask } from "@/lib/cortex/orchestrator";

/**
 * Protocol-neutral capability registry. UI, WebMCP, and future agent bridges
 * should consume domain actions from here rather than implementing their own
 * storage or workflow logic.
 */
export function buildCapabilityRegistry() {
  return {
    study: buildStudyCapabilities(),
    cortex: {
      createTask: createCortexTask,
      createPlan: createCortexPlan,
    },
  };
}

export type CapabilityRegistry = ReturnType<typeof buildCapabilityRegistry>;
