export type DeviceProfile = {
  memoryGB?: number;
  webgpu: boolean;
  nativeRuntime: boolean;
  platform: "web" | "android" | "desktop" | "unknown";
};

export type OfflineModelTier = "micro" | "compact" | "enhanced";

export function selectOfflineModelTier(device: DeviceProfile): OfflineModelTier {
  if (device.nativeRuntime && (device.memoryGB ?? 0) >= 8) return "enhanced";
  if (device.webgpu && (device.memoryGB ?? 0) >= 4) return "compact";
  return "micro";
}

export function modelDownloadRequired(tier: OfflineModelTier, bundled: OfflineModelTier[]): boolean {
  return !bundled.includes(tier);
}
