declare module "https://cdn.jsdelivr.net/npm/@huggingface/transformers@4.0.1" {
  const module: {
    env: {
      allowRemoteModels: boolean;
      allowLocalModels: boolean;
      useBrowserCache: boolean;
    };
    pipeline: (task: string, model: string, options?: Record<string, unknown>) => Promise<any>;
    TextStreamer: new (tokenizer: any, options?: Record<string, unknown>) => any;
  };
  export = module;
}
