/**
 * Typed interaction intents shared by keyboard, touch, voice, camera and AI.
 * Natural language is converted into one of these intents before platform
 * actions are executed.
 */

export type PlatformIntentType =
  | "navigate"
  | "search"
  | "create"
  | "edit"
  | "dictate"
  | "capture"
  | "design"
  | "layout"
  | "annotate"
  | "explain"
  | "run"
  | "build"
  | "test"
  | "check"
  | "submit"
  | "undo"
  | "redo";

export type IntentTrustLevel = "read-only" | "draft" | "mutating" | "privileged";

export interface PlatformIntent {
  id: string;
  type: PlatformIntentType;
  source: "keyboard" | "touch" | "voice" | "camera" | "vision" | "ai" | "system";
  confidence: number;
  transcript?: string;
  artifactId?: string;
  target?: string;
  parameters: Record<string, unknown>;
  trustLevel: IntentTrustLevel;
  requiresConfirmation: boolean;
}

export function createIntent(input: Omit<PlatformIntent, "id"> & { id?: string }): PlatformIntent {
  return {
    ...input,
    id: input.id ?? `intent-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    confidence: Math.max(0, Math.min(1, input.confidence)),
  };
}

export function requiresIntentConfirmation(intent: PlatformIntent): boolean {
  if (intent.requiresConfirmation) return true;
  if (intent.trustLevel === "privileged") return true;
  return intent.trustLevel === "mutating" && ["create", "edit", "design", "layout", "capture", "submit"].includes(intent.type);
}
