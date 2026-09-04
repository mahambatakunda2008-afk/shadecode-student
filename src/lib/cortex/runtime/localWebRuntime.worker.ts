type TransformerModule = {
  env: { allowRemoteModels: boolean; allowLocalModels: boolean; useBrowserCache: boolean };
  pipeline: (task: string, model: string, options?: Record<string, unknown>) => Promise<any>;
  TextStreamer: new (tokenizer: any, options?: Record<string, unknown>) => any;
};

type GenerateMessage = {
  type: "generate";
  requestId: string;
  prompt: string;
  system?: string;
  maxTokens?: number;
  temperature?: number;
  model: string;
  dtype: "q4" | "q8";
  device: "wasm" | "webgpu";
};

type WarmMessage = {
  type: "warm";
  requestId: string;
  model: string;
  dtype: "q4" | "q8";
  device: "wasm" | "webgpu";
};

type IncomingMessage = GenerateMessage | WarmMessage;

let transformerPromise: Promise<TransformerModule> | null = null;
let generatorKey = "";
let generator: any = null;

async function loadTransformers(): Promise<TransformerModule> {
  if (!transformerPromise) {
    transformerPromise = import(
      /* webpackIgnore: true */
      "https://cdn.jsdelivr.net/npm/@huggingface/transformers@4.0.1"
    ) as Promise<TransformerModule>;
  }
  return transformerPromise;
}

function post(type: string, requestId: string, payload: Record<string, unknown> = {}) {
  self.postMessage({ type, requestId, ...payload });
}

function progressFromTransformersEvent(event: any): number | null {
  const value = Number(event?.progress);
  if (!Number.isFinite(value)) return null;
  return Math.max(0, Math.min(100, Math.round(value)));
}

async function createGenerator(
  transformers: TransformerModule,
  model: string,
  dtype: "q4" | "q8",
  device: "wasm" | "webgpu",
  requestId: string,
) {
  return transformers.pipeline("text-generation", model, {
    dtype,
    device,
    progress_callback: (event: any) => {
      const progress = progressFromTransformersEvent(event);
      if (progress !== null) post("status", requestId, { status: "loading", progress });
    },
  });
}

async function getGenerator(
  model: string,
  dtype: "q4" | "q8",
  requestedDevice: "wasm" | "webgpu",
  requestId: string,
) {
  const transformers = await loadTransformers();
  transformers.env.allowRemoteModels = true;
  transformers.env.allowLocalModels = true;
  transformers.env.useBrowserCache = true;

  const key = `${model}:${dtype}:${requestedDevice}`;
  if (generator && generatorKey === key) return { transformers, generator, device: requestedDevice };

  const devices: Array<"webgpu" | "wasm"> = requestedDevice === "webgpu" ? ["webgpu", "wasm"] : ["wasm"];
  let lastError: unknown = null;

  for (const device of devices) {
    try {
      const candidate = await createGenerator(transformers, model, dtype, device, requestId);
      generator = candidate;
      generatorKey = `${model}:${dtype}:${device}`;
      if (device !== requestedDevice) {
        post("status", requestId, { status: "loading", progress: 100, deviceFallback: true });
      }
      return { transformers, generator: candidate, device };
    } catch (error) {
      lastError = error;
      generator = null;
      generatorKey = "";
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error("Local Cortex could not initialize an inference backend.");
}

function extractGeneratedText(generated: unknown): string {
  if (typeof generated === "string") return generated;
  if (Array.isArray(generated)) {
    const last = generated.at(-1) as any;
    if (typeof last === "string") return last;
    if (last && typeof last.content === "string") return last.content;
  }
  return "";
}

async function runGeneration(message: GenerateMessage) {
  const { transformers, generator: pipe } = await getGenerator(
    message.model,
    message.dtype,
    message.device,
    message.requestId,
  );

  const messages = [
    ...(message.system ? [{ role: "system", content: message.system }] : []),
    { role: "user", content: message.prompt },
  ];

  const streamer = new transformers.TextStreamer(pipe.tokenizer, {
    skip_prompt: true,
    skip_special_tokens: true,
    callback_function: (text: string) => {
      if (text) post("chunk", message.requestId, { text });
    },
  });

  post("status", message.requestId, { status: "generating", progress: 20 });
  const result = await pipe(messages, {
    max_new_tokens: Math.min(Math.max(message.maxTokens ?? 768, 64), 1536),
    temperature: message.temperature ?? 0.35,
    do_sample: (message.temperature ?? 0.35) > 0,
    streamer,
  });

  const text = extractGeneratedText(result?.[0]?.generated_text);
  if (!text.trim()) {
    throw new Error("Local Cortex returned no usable lesson text.");
  }

  post("complete", message.requestId, { text, progress: 100 });
}

self.onmessage = async (event: MessageEvent<IncomingMessage>) => {
  const message = event.data;
  try {
    if (message.type === "warm") {
      post("status", message.requestId, { status: "loading", progress: 1 });
      await getGenerator(message.model, message.dtype, message.device, message.requestId);
      post("status", message.requestId, { status: "ready", progress: 100 });
      return;
    }

    post("status", message.requestId, { status: "loading", progress: 1 });
    await runGeneration(message);
  } catch (error) {
    generator = null;
    generatorKey = "";
    post("error", message.requestId, {
      message: error instanceof Error ? error.message : "Local Cortex inference failed.",
    });
  }
};
