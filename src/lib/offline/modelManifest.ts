export type OfflineModelTier = "micro" | "compact" | "enhanced";

export type OfflineModelDescriptor = {
  id: string;
  tier: OfflineModelTier;
  modelFormat: "webgpu" | "wasm" | "native";
  sizeBytes: number;
  capabilities: string[];
  minimumMemoryGb: number;
};

/** Metadata only. Binary model weights must be supplied by the release packaging pipeline. */
export const OFFLINE_MODEL_MANIFEST: OfflineModelDescriptor[] = [
  { id: "shadecode-micro-1", tier: "micro", modelFormat: "wasm", sizeBytes: 0, capabilities: ["summarizer", "question-generator"], minimumMemoryGb: 2 },
  { id: "shadecode-compact-1", tier: "compact", modelFormat: "webgpu", sizeBytes: 0, capabilities: ["tutor", "project-coach", "study-planner", "question-generator", "summarizer"], minimumMemoryGb: 4 },
  { id: "shadecode-enhanced-native-1", tier: "enhanced", modelFormat: "native", sizeBytes: 0, capabilities: ["tutor", "project-coach", "study-planner", "question-generator", "summarizer"], minimumMemoryGb: 6 },
];

export function chooseOfflineModel(memoryGb?: number, native = false): OfflineModelDescriptor | null {
  if (native && (memoryGb ?? 0) >= 6) return OFFLINE_MODEL_MANIFEST[2];
  if ((memoryGb ?? 0) >= 4) return OFFLINE_MODEL_MANIFEST[1];
  if ((memoryGb ?? 0) >= 2) return OFFLINE_MODEL_MANIFEST[0];
  return null;
}
