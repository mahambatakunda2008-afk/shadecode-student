import { cortexRuntimeManager } from "./manager";
import { localWebCortexRuntime } from "./localWebRuntime";

let registered = false;

export function registerLocalWebCortexRuntime(): void {
  if (typeof window === "undefined" || registered) return;
  if (typeof Worker === "undefined") return;
  registered = true;
  cortexRuntimeManager.register(localWebCortexRuntime);
}
