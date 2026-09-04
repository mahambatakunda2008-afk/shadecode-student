export interface CortexDeviceProfile {
  browser: boolean;
  webgpu: boolean;
  wasm: boolean;
  hardwareConcurrency: number;
  deviceMemoryGb: number | null;
  likelyMobile: boolean;
  suitableForLocalInference: boolean;
}

export function getCortexDeviceProfile(): CortexDeviceProfile {
  if (typeof window === "undefined") {
    return {
      browser: false,
      webgpu: false,
      wasm: typeof WebAssembly !== "undefined",
      hardwareConcurrency: 0,
      deviceMemoryGb: null,
      likelyMobile: false,
      suitableForLocalInference: false,
    };
  }

  const navigatorWithHints = navigator as Navigator & {
    deviceMemory?: number;
    gpu?: unknown;
  };
  const hardwareConcurrency = navigator.hardwareConcurrency || 2;
  const deviceMemoryGb = typeof navigatorWithHints.deviceMemory === "number"
    ? navigatorWithHints.deviceMemory
    : null;
  const likelyMobile = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
  const webgpu = Boolean(navigatorWithHints.gpu);
  const wasm = typeof WebAssembly !== "undefined";

  // This is a capability hint, not a guarantee. The model manager must still
  // probe the selected backend and handle allocation failures gracefully.
  const memoryEnough = deviceMemoryGb === null || deviceMemoryGb >= 2;
  const suitableForLocalInference = wasm && memoryEnough && hardwareConcurrency >= 2;

  return {
    browser: true,
    webgpu,
    wasm,
    hardwareConcurrency,
    deviceMemoryGb,
    likelyMobile,
    suitableForLocalInference,
  };
}

export function supportsWebGpu(): boolean {
  return getCortexDeviceProfile().webgpu;
}
