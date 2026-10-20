import type { GenerationJobStatus } from "@/lib/cortex/generationJob";

/** Honest, state-based copy for the persistent generation indicator. */
export function getGenerationStatusText(status: GenerationJobStatus): string {
  switch (status) {
    case "queued":
      return "Queued safely on this device";
    case "warming":
      return "Preparing recovery options";
    case "generating":
      return "Generating and checking content";
    case "partial":
      return "Checkpoint saved. Continuing from the last completed section.";
    case "complete":
      return "Ready";
    case "failed":
      return "Generation stopped";
    case "cancelled":
      return "Cancelled";
  }
}
