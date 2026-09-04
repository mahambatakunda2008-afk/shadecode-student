export type LocalModelQuantization = "q4" | "q4f16" | "int8" | "fp16";

export interface LocalModelDefinition {
  id: string;
  name: string;
  task: "text-generation";
  source: "hugging-face";
  license: string;
  quantizations: Partial<Record<LocalModelQuantization, { approximateSizeMb: number }>>;
  recommendedQuantization: LocalModelQuantization;
  multilingual: boolean;
  status: "candidate" | "installed";
}

/**
 * Models are deliberately metadata-only here. Nothing is downloaded by the
 * registry. A model becomes "installed" only after the local model manager
 * verifies that its files are available on-device.
 */
export const LOCAL_CORTEX_MODELS: readonly LocalModelDefinition[] = [
  {
    id: "onnx-community/Qwen2.5-0.5B-Instruct",
    name: "Qwen 2.5 0.5B Instruct",
    task: "text-generation",
    source: "hugging-face",
    license: "Apache-2.0",
    quantizations: {
      q4: { approximateSizeMb: 786 },
      q4f16: { approximateSizeMb: 483 },
      int8: { approximateSizeMb: 512 },
      fp16: { approximateSizeMb: 997 },
    },
    recommendedQuantization: "q4f16",
    multilingual: true,
    status: "candidate",
  },
];

export const DEFAULT_LOCAL_CORTEX_MODEL = LOCAL_CORTEX_MODELS[0];
