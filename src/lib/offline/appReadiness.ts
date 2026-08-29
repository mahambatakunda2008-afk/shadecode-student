export type OfflineReadiness = {
  appShell: boolean;
  localDatabase: boolean;
  curriculum: boolean;
  offlineAI: "available" | "limited" | "unavailable";
};

/** Minimum guarantee: the app can open and preserve local work without a network. */
export function canLaunchOffline(readiness: OfflineReadiness): boolean {
  return readiness.appShell && readiness.localDatabase;
}

/** Full offline learning requires local curriculum, but not an AI model. */
export function canLearnOffline(readiness: OfflineReadiness): boolean {
  return canLaunchOffline(readiness) && readiness.curriculum;
}

export function offlineReadinessLabel(readiness: OfflineReadiness): string {
  if (!canLaunchOffline(readiness)) return "Offline setup incomplete";
  if (!canLearnOffline(readiness)) return "Offline app ready; curriculum not installed";
  if (readiness.offlineAI === "available") return "Ready for offline learning + AI";
  if (readiness.offlineAI === "limited") return "Ready for offline learning + limited AI";
  return "Ready for offline learning";
}
