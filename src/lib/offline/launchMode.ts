export type LaunchMode = "online" | "offline" | "degraded";

export function resolveLaunchMode(input: { online: boolean; localDbReady: boolean; shellReady: boolean; offlineAI: "available" | "limited" | "unavailable" }): LaunchMode {
  if (!input.localDbReady || !input.shellReady) return "degraded";
  if (!input.online) return "offline";
  if (input.offlineAI === "unavailable") return "degraded";
  return "online";
}

export function shouldRequireNetworkForLaunch(): false {
  return false;
}
