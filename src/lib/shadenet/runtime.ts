import { getDeviceId, type DeviceStorage } from "./device-identity";
import { DEFAULT_RESOURCE_POLICY, type ResourcePolicy } from "./resource-policy";

export interface ShadeNetRuntimeState {
  deviceId: string;
  enabled: boolean;
  policy: ResourcePolicy;
}

const ENABLED_KEY = "shadecode:shadenet:enabled";

export function getShadeNetRuntime(storage: DeviceStorage = localStorage): ShadeNetRuntimeState {
  return {
    deviceId: getDeviceId(storage),
    enabled: storage.getItem(ENABLED_KEY) === "true",
    policy: DEFAULT_RESOURCE_POLICY,
  };
}

export function setShadeNetEnabled(enabled: boolean, storage: Pick<DeviceStorage, "setItem"> = localStorage): void {
  storage.setItem(ENABLED_KEY, String(enabled));
}
