import type { DeviceProfile } from "./modelPolicy";

export function detectDeviceProfile(): DeviceProfile {
  if (typeof window === "undefined") {
    return { platform: "unknown", webgpu: false, nativeRuntime: false };
  }

  const userAgent = navigator.userAgent.toLowerCase();
  const platform: DeviceProfile["platform"] = userAgent.includes("android")
    ? "android"
    : userAgent.includes("windows") || userAgent.includes("macintosh") || userAgent.includes("linux")
      ? "desktop"
      : "web";

  const webgpu = "gpu" in navigator;
  const nativeRuntime = platform === "android" || platform === "desktop";
  const memoryGB = "deviceMemory" in navigator ? Number((navigator as Navigator & { deviceMemory?: number }).deviceMemory) : undefined;

  return { platform, webgpu, nativeRuntime, memoryGB };
}
