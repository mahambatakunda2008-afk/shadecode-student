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

async function getGenerator(
  model: string,
  dtype: "q4" | "q8",
  device: "wasm" | "webgpu",
  requestId: string,
) {
  const transformers = await loadTransformers();
  transformers.env.allowRemoteModels = true;
  transformers.env.allowLocalModels = true;
  transformers.env.useBrowserCache = true;

  const key = `${model}:${dtype}:${device}`;
  if (generator && generatorKey === key) return { transformers, generator };

  generator = await transformers.pipeline("text-generation", model, {
    dtype,
    device,
    progress_callback: (event: any) => {
      const progress = progressFromTransformersEvent(event);
      if (progress !== null) post("status", requestId, { status: "loading", progress });
    },
  });
  generatorKey = key;
  return { transformers, generator };
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

    const generated = result?.[0]?.generated_text;
    const text = typeof generated === "string"
      ? generated
      : Array.isArray(generated)
        ? generated.at(-1)?.content ?? ""
        : "";

    post("complete", message.requestId, { text, progress: 100 });
  } catch (error) {
    post("error", message.requestId, {
      message: error instanceof Error ? error.message : "Local Cortex inference failed.",
    });
  }
};
