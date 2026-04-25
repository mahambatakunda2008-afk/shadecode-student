import { enqueueCortexEvent } from "@/lib/cortex/events/queue";
import { CortexEventInput } from "@/lib/cortex/types";

export function emitCortexEvent(input: CortexEventInput) {
  enqueueCortexEvent(input);
}
