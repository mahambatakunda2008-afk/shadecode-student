import { buildStudyCapabilities } from "./study";

/**
 * Protocol-neutral capability registry. UI, WebMCP, and future agent bridges
 * should consume domain actions from here rather than implementing their own
 * storage or workflow logic.
 */
export function buildCapabilityRegistry() {
  return {
    study: buildStudyCapabilities(),
  };
}

export type CapabilityRegistry = ReturnType<typeof buildCapabilityRegistry>;
