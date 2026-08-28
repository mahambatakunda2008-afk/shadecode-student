export type OfflineReadiness = {
  appShell: boolean;
  localDatabase: boolean;
  curriculum: boolean;
  offlineAI: "available" | "limited" | "unavailable";
};

export function canLaunchOffline(readiness: OfflineReadiness): boolean {
  return readiness.appShell && readiness.localDatabase;
}

export function offlineReadinessLabel(readiness: OfflineReadiness): string {
  if (!canLaunchOffline(readiness)) return "Offline setup incomplete";
  if (readiness.offlineAI === "available") return "Ready for offline learning + AI";
  if (readiness.offlineAI === "limited") return "Ready for offline learning + limited AI";
  return "Ready for offline learning";
}
