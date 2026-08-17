import { enqueueOfflineEvent } from "./store";

export async function queueLearningEvent(type: string, payload: unknown): Promise<string> {
  return enqueueOfflineEvent(type, payload);
}

export function shouldUseOfflineQueue(): boolean {
  return typeof navigator !== "undefined" && !navigator.onLine;
}
