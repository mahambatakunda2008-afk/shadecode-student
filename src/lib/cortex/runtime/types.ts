export type CortexRuntimeKind = "local-web" | "local-native" | "cloud";

export interface CortexGenerationInput {
  prompt: string;
  system?: string;
  maxTokens?: number;
  temperature?: number;
  signal?: AbortSignal;
}

export interface CortexGenerationChunk {
  text: string;
  done: boolean;
}

export interface CortexCapabilities {
  textGeneration: boolean;
  streaming: boolean;
  offline: boolean;
  webgpu: boolean;
  wasm: boolean;
}

export interface CortexRuntime {
  readonly id: string;
  readonly kind: CortexRuntimeKind;
  capabilities(): Promise<CortexCapabilities>;
  isReady(): Promise<boolean>;
  warm(): Promise<void>;
  generate(input: CortexGenerationInput): Promise<string>;
  stream(
    input: CortexGenerationInput,
    onChunk: (chunk: CortexGenerationChunk) => void,
  ): Promise<void>;
  dispose?(): Promise<void>;
}
